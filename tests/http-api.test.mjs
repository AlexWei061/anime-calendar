import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import Database from "better-sqlite3";
import sharp from "sharp";
import test from "node:test";
import { allAnime } from "../data/anime.js";
import { episodeViewUnitsForAnime } from "../lib/anime-episode-views.js";

const origin = process.env.TEST_BASE_URL;

// Rate-limit regression tests need more auth requests than the shared 30/15min
// client bucket allows, so they run against a dedicated server with fresh buckets.
async function startIsolatedServer(t) {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const dataDirectory = await mkdtemp(join(tmpdir(), "anime-calendar-rate-limit-"));
  const isolatedOrigin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["scripts/start.mjs"], {
    env: {
      ...process.env,
      DATA_DIR: dataDirectory,
      APP_ORIGIN: isolatedOrigin,
      ALLOW_INSECURE_LOCALHOST: "1",
      TRUST_PROXY: "0",
      NEXT_TELEMETRY_DISABLED: "1",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  for (const stream of [server.stdout, server.stderr]) {
    stream.on("data", (chunk) => { serverOutput = (serverOutput + chunk.toString()).slice(-10_000); });
  }
  t.after(async () => {
    server.kill("SIGTERM");
    await Promise.race([once(server, "exit"), delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
    await rm(dataDirectory, { recursive: true, force: true });
  });
  const deadline = Date.now() + 60_000;
  while (true) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(`Isolated test server exited before becoming ready: ${serverOutput}`);
    }
    try {
      if ((await fetch(`${isolatedOrigin}/api/health`, { signal: AbortSignal.timeout(1000) })).ok) break;
    } catch { /* wait for the owned server to start */ }
    if (Date.now() > deadline) throw new Error("Isolated test server did not become healthy within 60 seconds");
    await delay(200);
  }
  return (path, { method = "GET", cookie, json } = {}) => fetch(isolatedOrigin + path, {
    method,
    headers: { ...(method !== "GET" ? { Origin: isolatedOrigin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(json !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
}

test("production HTTP APIs preserve accounts, atomic records, sessions and private avatars", { skip: !origin }, async (t) => {
  const db = new Database(join(process.env.TEST_DATA_DIR, "anime-calendar.sqlite"));
  t.after(() => db.close());
  const call = (path, { method = "GET", cookie, json, headers = {}, body } = {}) => fetch(origin + path, {
    method,
    headers: { ...(method !== "GET" ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : body,
  });
  const expect = async (response, status) => {
    assert.equal(response.status, status, await response.clone().text());
    return response;
  };
  const cookieOf = (response) => response.headers.get("set-cookie")?.split(";", 1)[0];
  const alice = { email: "alice-http@example.test", password: "a-valid-password", displayName: "Alice" };
  const bob = { email: "bob-http@example.test", password: "b-valid-password", displayName: "Bob" };

  assert.equal((await call("/api/health")).status, 200);
  await expect(await call("/api/auth/me"), 401);
  await expect(await call("/api/anime-selections", { method: "PUT", json: { animeIds: [] } }), 401);
  await expect(await call("/api/auth/register", { method: "POST", json: alice, headers: { Origin: "https://attacker.example" } }), 403);
  await expect(await call("/api/auth/register", { method: "POST", json: { ...alice, displayName: "x".repeat(5000) } }), 413);

  const registered = await expect(await call("/api/auth/register", { method: "POST", json: alice }), 201);
  const aliceCookie = cookieOf(registered);
  assert.ok(aliceCookie);
  assert.match(registered.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(registered.headers.get("set-cookie"), /SameSite=Lax/i);
  assert.match(registered.headers.get("cache-control"), /no-store/);
  const bobCookie = cookieOf(await expect(await call("/api/auth/register", { method: "POST", json: bob }), 201));
  await expect(await call("/api/auth/register", { method: "POST", json: alice }), 409);
  const storedUser = db.prepare("SELECT * FROM users WHERE email=?").get(alice.email);
  assert.match(storedUser.password_hash, /^pbkdf2\$/);
  assert.notEqual(storedUser.password_hash, alice.password);
  assert.equal(db.prepare("SELECT count(*) AS n FROM auth_sessions WHERE token_hash=?").get(aliceCookie.split("=")[1]).n, 0);

  const me = await expect(await call("/api/auth/me", { cookie: aliceCookie }), 200);
  assert.equal((await me.json()).email, alice.email);
  assert.match(me.headers.get("cache-control"), /no-store/);
  const ids = allAnime.slice(0, 151).map(({ id }) => id);
  await expect(await call("/api/anime-selections", { method: "PUT", cookie: aliceCookie, json: { animeIds: [...ids, ids[0], "unknown-id"], email: bob.email } }), 200);
  assert.deepEqual(new Set((await (await call("/api/anime-selections", { cookie: aliceCookie })).json()).animeIds), new Set(ids));
  assert.deepEqual((await (await call("/api/anime-selections", { cookie: bobCookie })).json()).animeIds, []);
  db.exec("CREATE TRIGGER test_selection_abort BEFORE INSERT ON anime_selections BEGIN SELECT RAISE(ABORT,'test rollback'); END");
  try {
    await expect(await call("/api/anime-selections", { method: "PUT", cookie: aliceCookie, json: { animeIds: [ids[1]] } }), 500);
    assert.equal(db.prepare("SELECT count(*) AS n FROM anime_selections WHERE user_email=?").get(alice.email).n, ids.length);
  } finally {
    db.exec("DROP TRIGGER test_selection_abort");
  }

  const preview = allAnime.find((record) => record.premiereEpisodeCount > 1 && record.premiereEpisodeCount <= 25);
  assert.ok(preview);
  db.prepare("INSERT INTO anime_episode_views VALUES(?,?,?,?)").run(alice.email, preview.id, 1, preview.premiereEpisodeCount);
  const migrated = (await (await call("/api/anime-episode-views", { cookie: aliceCookie })).json()).watchedEpisodes;
  for (let episode = 1; episode <= preview.premiereEpisodeCount; episode += 1) {
    assert.ok(migrated.some((view) => view.animeId === preview.id && view.episode === episode && view.episodeStart === episode));
  }
  assert.equal(db.prepare("SELECT count(*) AS n FROM anime_episode_views WHERE episode_start<>episode").get().n, 0);
  assert.deepEqual((await (await call("/api/anime-episode-views", { cookie: bobCookie })).json()).watchedEpisodes, []);
  const watchedEpisodes = episodeViewUnitsForAnime(preview).slice(0, 2).map((unit) => ({ animeId: preview.id, ...unit }));
  await expect(await call("/api/anime-episode-views", { method: "PUT", cookie: aliceCookie, json: { watchedEpisodes, watched: false } }), 200);
  await expect(await call("/api/anime-episode-views", { method: "PUT", cookie: aliceCookie, json: { watchedEpisodes: [{ animeId: preview.id, episodeStart: 1, episode: 9999 }], watched: true } }), 400);

  const avatar = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#cc3377" } }).webp().toBuffer();
  const uploaded = await expect(await call("/api/auth/avatar", { method: "PUT", cookie: aliceCookie, headers: { "Content-Type": "image/webp" }, body: avatar }), 200);
  const avatarUrl = (await uploaded.json()).avatarUrl;
  await expect(await call(avatarUrl), 401);
  await expect(await call(avatarUrl, { cookie: bobCookie }), 404);
  const fetchedAvatar = await expect(await call(avatarUrl, { cookie: aliceCookie }), 200);
  assert.match(fetchedAvatar.headers.get("cache-control"), /private/);
  assert.match(fetchedAvatar.headers.get("cache-control"), /immutable/);
  assert.deepEqual(Buffer.from(await fetchedAvatar.arrayBuffer()), avatar);
  await expect(await call("/api/auth/avatar?v=../../secret", { cookie: aliceCookie }), 404);
  db.exec("CREATE TRIGGER test_avatar_abort BEFORE UPDATE OF avatar_version ON users BEGIN SELECT RAISE(ABORT,'test rollback'); END");
  try {
    await expect(await call("/api/auth/avatar", { method: "PUT", cookie: aliceCookie, headers: { "Content-Type": "image/webp" }, body: avatar }), 500);
    assert.equal((await call(avatarUrl, { cookie: aliceCookie })).status, 200);
    assert.equal((await readdir(join(process.env.TEST_DATA_DIR, "avatars"), { recursive: true })).filter((file) => file.endsWith(".webp")).length, 1);
  } finally {
    db.exec("DROP TRIGGER test_avatar_abort");
  }
  await expect(await call("/api/auth/avatar", { method: "DELETE", cookie: aliceCookie }), 200);
  await expect(await call(avatarUrl, { cookie: aliceCookie }), 404);

  const secondSession = cookieOf(await expect(await call("/api/auth/login", { method: "POST", json: alice }), 200));
  db.exec("CREATE TRIGGER test_password_abort BEFORE DELETE ON auth_sessions BEGIN SELECT RAISE(ABORT,'test rollback'); END");
  try {
    await expect(await call("/api/auth/change-password", { method: "POST", cookie: aliceCookie, json: { currentPassword: alice.password, newPassword: "changed-password" } }), 500);
    assert.equal(db.prepare("SELECT password_hash FROM users WHERE email=?").get(alice.email).password_hash, storedUser.password_hash);
    await expect(await call("/api/auth/me", { cookie: secondSession }), 200);
  } finally {
    db.exec("DROP TRIGGER test_password_abort");
  }
  await expect(await call("/api/auth/change-password", { method: "POST", cookie: aliceCookie, json: { currentPassword: alice.password, newPassword: "changed-password" } }), 200);
  await expect(await call("/api/auth/me", { cookie: aliceCookie }), 401);
  await expect(await call("/api/auth/me", { cookie: secondSession }), 401);
  await expect(await call("/api/auth/login", { method: "POST", json: alice }), 401);
  await expect(await call("/api/auth/login", { method: "POST", json: { ...alice, password: "changed-password" } }), 200);
  await expect(await call("/api/auth/logout", { method: "POST", cookie: bobCookie }), 200);
  await expect(await call("/api/auth/me", { cookie: bobCookie }), 401);
  await expect(await call("/storage/anime-calendar.sqlite"), 404);
  await expect(await call("/backups/manifest.json"), 404);
});

test("account auth buckets count only verification failures and are isolated per route", { skip: !origin }, async (t) => {
  const call = await startIsolatedServer(t);
  const victim = { email: "rate-victim@example.test", password: "victim-password", displayName: "Victim" };
  assert.equal((await call("/api/auth/register", { method: "POST", json: victim })).status, 201);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal((await call("/api/auth/login", { method: "POST", json: { ...victim, password: "wrong-password" } })).status, 401);
  }
  assert.equal((await call("/api/auth/login", { method: "POST", json: victim })).status, 200, "correct password is never rejected by the account bucket");
  const deniedLogin = await call("/api/auth/login", { method: "POST", json: { ...victim, password: "wrong-password" } });
  assert.equal(deniedLogin.status, 429);
  assert.ok(deniedLogin.headers.get("retry-after"), "429 login responses keep Retry-After");

  for (let attempt = 0; attempt < 10; attempt += 1) {
    assert.equal((await call("/api/auth/register", { method: "POST", json: victim })).status, 409);
  }
  assert.equal((await call("/api/auth/login", { method: "POST", json: victim })).status, 200, "register failures must not consume the login budget");
});
