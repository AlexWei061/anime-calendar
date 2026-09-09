import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openDatabase, migrateDatabase } from "../db/sqlite.js";
import { readAvatar, replaceAvatar } from "../lib/server/avatar-storage.js";
import { avatarObjectKey } from "../lib/avatar.js";

async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), "anime-calendar-db-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("SQLite migrations are repeatable, checksum checked, and preserve stored data", async (t) => {
  const directory = await temporaryDirectory(t);
  const db = openDatabase(join(directory, "calendar.sqlite"));
  t.after(() => db.close());
  db.prepare("INSERT INTO users (email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)")
    .run("one@example.com", "existing-password-hash", "One", 1);
  migrateDatabase(db);
  assert.equal(db.prepare("SELECT password_hash FROM users").get().password_hash, "existing-password-hash");
  assert.equal(db.prepare("SELECT count(*) AS count FROM __app_migrations").get().count, 4);
  assert.equal(db.pragma("journal_mode", { simple: true }), "wal");
  assert.equal(db.pragma("busy_timeout", { simple: true }), 5000);
  db.prepare("UPDATE __app_migrations SET checksum = 'changed' WHERE id = ?").run("0000_anime-selections");
  assert.throws(() => migrateDatabase(db), /checksum/i);
});

test("a failed transaction preserves selections, password, and sessions", async (t) => {
  const directory = await temporaryDirectory(t);
  const db = openDatabase(join(directory, "calendar.sqlite"));
  t.after(() => db.close());
  db.exec("INSERT INTO anime_selections VALUES ('one@example.com', 'old'); INSERT INTO users (email, password_hash, display_name, created_at) VALUES ('one@example.com', 'old-hash', 'One', 1); INSERT INTO auth_sessions VALUES ('token-hash', 'one@example.com', 100)");
  assert.throws(() => db.transaction(() => {
    db.prepare("DELETE FROM anime_selections WHERE user_email = ?").run("one@example.com");
    db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run("new-hash", "one@example.com");
    db.prepare("DELETE FROM auth_sessions WHERE user_email = ?").run("one@example.com");
    db.prepare("INSERT INTO anime_selections VALUES (?, ?)").run("one@example.com", null);
  })(), /NOT NULL/);
  assert.deepEqual(db.prepare("SELECT anime_id FROM anime_selections").all(), [{ anime_id: "old" }]);
  assert.equal(db.prepare("SELECT password_hash FROM users").get().password_hash, "old-hash");
  assert.equal(db.prepare("SELECT count(*) AS count FROM auth_sessions").get().count, 1);
});

test("avatar replacement keeps the previous file until the database commits and cleans failed writes", async (t) => {
  const directory = await temporaryDirectory(t);
  const email = "one@example.com";
  let version = null;
  const first = await replaceAvatar(email, Buffer.from("first"), (next) => { version = next; return null; }, directory);
  const firstKey = await avatarObjectKey(email, first);
  assert.equal((await readAvatar(firstKey, directory)).toString(), "first");
  await assert.rejects(replaceAvatar(email, Buffer.from("failed"), () => { throw new Error("Database unavailable"); }, directory), /Database unavailable/);
  assert.equal(version, first);
  const { readdir } = await import("node:fs/promises");
  assert.deepEqual(await readdir(join(directory, firstKey, "..")), [`${first}.webp`]);
  await replaceAvatar(email, Buffer.from("second"), (next) => { const previous = version; version = next; return previous; }, directory);
  assert.equal(await readAvatar(firstKey, directory), null);
  assert.equal((await readAvatar(await avatarObjectKey(email, version), directory)).toString(), "second");
});

test("avatar keys cannot escape the private directory or follow symlinks", async (t) => {
  const directory = await temporaryDirectory(t);
  const outside = await temporaryDirectory(t);
  const secret = join(outside, "secret.webp");
  await writeFile(secret, "private");
  for (const key of ["../secret.webp", "/tmp/secret.webp", "avatars/../secret.webp", "avatars/a/../../secret.webp"]) {
    await assert.rejects(readAvatar(key, directory), /Invalid avatar key/);
  }
  const key = await avatarObjectKey("one@example.com", "00000000-0000-4000-8000-000000000000");
  await mkdir(join(directory, key, ".."), { recursive: true });
  await symlink(secret, join(directory, key));
  await assert.rejects(readAvatar(key, directory));
  await rm(join(directory, "avatars"), { recursive: true });
  await symlink(outside, join(directory, "avatars"));
  await assert.rejects(replaceAvatar("one@example.com", Buffer.from("changed"), () => { throw new Error("Must not commit"); }, directory), /symbolic|directory/i);
  assert.equal(await readFile(secret, "utf8"), "private");
});

test("JSON requests are bounded without trusting Content-Length and errors hide submitted data", async () => {
  const { readJson, privateJson } = await import("../lib/server/http.js");
  const request = (body, headers = {}) => new Request("http://localhost/api/test", {
    method: "POST", body, headers: { "content-type": "application/json", ...headers },
  });
  assert.deepEqual(await readJson(request('{"ok":true}')), { ok: true });
  await assert.rejects(readJson(request('{"secret":"' + "x".repeat(100) + '"}', { "content-length": "1" }), 64), { status: 413 });
  await assert.rejects(readJson(request('submitted-secret-is-invalid-json')), { message: "Invalid JSON body", status: 400 });
  await assert.rejects(readJson(request('null')), { message: "Invalid JSON body", status: 400 });
  await assert.rejects(readJson(request('{}', { "content-type": "text/plain" })), { status: 415 });
  const response = privateJson({ ok: true }, { headers: { "Set-Cookie": "example" } });
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("vary"), "Cookie");
  assert.equal(response.headers.get("set-cookie"), "example");
});

test("production origin and cookie policy use configured HTTPS, with an explicit loopback exception", async (t) => {
  const { appOrigin, requireSameOrigin } = await import("../lib/server/http.js");
  const original = { NODE_ENV: process.env.NODE_ENV, APP_ORIGIN: process.env.APP_ORIGIN, ALLOW_INSECURE_LOCALHOST: process.env.ALLOW_INSECURE_LOCALHOST };
  t.after(() => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  process.env.NODE_ENV = "production";
  delete process.env.APP_ORIGIN;
  assert.throws(() => appOrigin("http://localhost"), /APP_ORIGIN is required/);
  process.env.APP_ORIGIN = "https://calendar.example.com";
  assert.equal(appOrigin("http://untrusted.example"), "https://calendar.example.com");
  const request = (origin, extra = {}) => new Request("http://node:3000/api/test", { method: "POST", headers: { ...(origin ? { origin } : {}), ...extra } });
  assert.doesNotThrow(() => requireSameOrigin(request("https://calendar.example.com")));
  assert.throws(() => requireSameOrigin(request("https://attacker.example", { "x-forwarded-host": "calendar.example.com" })), { status: 403 });
  assert.throws(() => requireSameOrigin(request(null)), { status: 403 });
  assert.throws(() => requireSameOrigin(request("https://calendar.example.com", { "sec-fetch-site": "cross-site" })), { status: 403 });
  process.env.APP_ORIGIN = "http://public.example.com";
  process.env.ALLOW_INSECURE_LOCALHOST = "1";
  assert.throws(() => appOrigin("http://localhost"), /HTTPS/);
  process.env.APP_ORIGIN = "http://127.0.0.1:3000";
  assert.equal(appOrigin("http://node:3000"), "http://127.0.0.1:3000");
});

test("auth limiting separates trusted clients, ignores untrusted forwarding, and expires with Retry-After", async (t) => {
  const { limitAuth } = await import("../lib/server/http.js");
  const original = process.env.TRUST_PROXY;
  t.after(() => { if (original === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY = original; });
  let now = 1_900_000_000_000;
  t.mock.method(Date, "now", () => now);
  const request = (ip) => new Request("http://localhost/api/auth/login", { headers: { "x-real-ip": ip } });
  process.env.TRUST_PROXY = "1";
  for (let index = 0; index < 30; index += 1) assert.equal(limitAuth(request("192.0.2.1")), null);
  const denied = limitAuth(request("192.0.2.1"));
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get("retry-after"), "900");
  assert.equal(limitAuth(request("192.0.2.2")), null);
  for (let index = 0; index < 10; index += 1) assert.equal(limitAuth(request("192.0.2.2"), "one@example.com"), null);
  assert.equal(limitAuth(request("192.0.2.3"), "one@example.com").status, 429);
  delete process.env.TRUST_PROXY;
  for (let index = 0; index < 30; index += 1) assert.equal(limitAuth(request(`192.0.2.${index + 1}`)), null);
  assert.equal(limitAuth(request("192.0.2.200")).status, 429);
  now += 15 * 60_000;
  assert.equal(limitAuth(request("192.0.2.200")), null);
  assert.equal(limitAuth(request("192.0.2.200"), "one@example.com"), null);
});

test("failed avatar filesystem writes never advance the stored version", async (t) => {
  const directory = await temporaryDirectory(t);
  await writeFile(join(directory, "avatars"), "not-a-directory");
  let committed = false;
  await assert.rejects(replaceAvatar("one@example.com", Buffer.from("upload"), () => { committed = true; return null; }, directory), /directory/i);
  assert.equal(committed, false);
});

test("a migration failure rolls back both schema changes and applied metadata", async (t) => {
  const directory = await temporaryDirectory(t);
  const migrations = join(directory, "drizzle");
  await mkdir(join(migrations, "meta"), { recursive: true });
  await writeFile(join(migrations, "meta", "_journal.json"), JSON.stringify({ entries: [{ tag: "test-first" }, { tag: "test-second" }] }));
  await writeFile(join(migrations, "test-first.sql"), "CREATE TABLE rollback_probe (id INTEGER)");
  await writeFile(join(migrations, "test-second.sql"), "INSERT INTO missing_table VALUES (1)");
  const db = openDatabase(join(directory, "calendar.sqlite"));
  t.after(() => db.close());
  assert.throws(() => migrateDatabase(db, migrations), /no such table/);
  assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name = 'rollback_probe'").get(), undefined);
  assert.equal(db.prepare("SELECT count(*) AS count FROM __app_migrations").get().count, 4);
});
