import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeDisplayName,
  validateEmail,
  validatePassword,
  verifyPassword,
} from "../lib/auth.js";

test("hashPassword/verifyPassword round-trip with per-password salts", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");

  assert.match(first, /^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("correct horse battery staple", second), true);
  assert.equal(await verifyPassword("wrong password", first), false);
  assert.equal(await verifyPassword("anything", "not-a-stored-hash"), false);
  assert.equal(await verifyPassword("anything", "pbkdf2$abc$zz$zz"), false);
});

test("validateEmail normalizes case and whitespace and rejects malformed input", () => {
  assert.equal(validateEmail("  User@Example.COM "), "user@example.com");
  assert.throws(() => validateEmail("no-at-sign"), RangeError);
  assert.throws(() => validateEmail("a@b"), RangeError);
  assert.throws(() => validateEmail(""), RangeError);
  assert.throws(() => validateEmail(42), TypeError);
});

test("validatePassword enforces length bounds", () => {
  assert.equal(validatePassword("12345678"), "12345678");
  assert.throws(() => validatePassword("short"), RangeError);
  assert.throws(() => validatePassword("x".repeat(73)), RangeError);
  assert.throws(() => validatePassword(null), TypeError);
});

test("normalizeDisplayName falls back to the email and trims", () => {
  assert.equal(normalizeDisplayName(undefined, "a@b.co"), "a@b.co");
  assert.equal(normalizeDisplayName("  小明  ", "a@b.co"), "小明");
  assert.equal(normalizeDisplayName("   ", "a@b.co"), "a@b.co");
  assert.throws(() => normalizeDisplayName("x".repeat(41), "a@b.co"), RangeError);
});

test("session tokens are random and only their SHA-256 hash is stored", async () => {
  const token = generateSessionToken();
  const other = generateSessionToken();
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.notEqual(token, other);

  const hash = await hashSessionToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(await hashSessionToken(token), hash);
});

test("auth routes exist and business routes use session auth", async () => {
  const [register, login, logout, me, selections, episodeViews, appAuth] = await Promise.all([
    readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/me/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/anime-selections/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/anime-episode-views/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth.ts", import.meta.url), "utf8"),
  ]);

  assert.match(register, /status: 409/);
  assert.match(register, /Set-Cookie/);
  assert.match(login, /status: 401/);
  assert.match(login, /verifyPassword/);
  assert.match(logout, /destroySession/);
  assert.match(me, /getSessionUser/);
  assert.match(me, /status: 401/);
  assert.match(selections, /getSessionUser/);
  assert.match(episodeViews, /getSessionUser/);
  assert.match(appAuth, /HttpOnly; Secure; SameSite=Lax/);
  assert.doesNotMatch(selections + episodeViews + appAuth, /getChatGPTUser|oai-authenticated-user/);
});

test("schema declares users and auth_sessions tables with a migration", async () => {
  const [schema, migrationNames] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readdir(new URL("../drizzle/", import.meta.url)),
  ]);
  const migrationContents = await Promise.all(
    migrationNames
      .filter((name) => name.endsWith(".sql"))
      .map((name) => readFile(new URL("../drizzle/" + name, import.meta.url), "utf8")),
  );

  assert.match(schema, /users/);
  assert.match(schema, /authSessions/);
  assert.ok(migrationContents.some((sql) => /CREATE TABLE `users`/.test(sql)));
  assert.ok(migrationContents.some((sql) => /CREATE TABLE `auth_sessions`/.test(sql)));
});
