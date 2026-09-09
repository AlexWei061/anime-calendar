import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import test from "node:test";
import { createBackup, restoreBackup, importD1, splitSqlStatements } from "../scripts/storage.mjs";
import { avatarObjectKey } from "../lib/avatar.js";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "anime-storage-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("SQL import parser preserves semicolons, escaped quotes and comments in strings", () => {
  assert.equal(splitSqlStatements("-- header\nINSERT INTO users VALUES ('a;''b'); /* ; */ COMMIT;").length, 2);
  assert.throws(() => splitSqlStatements("INSERT INTO users VALUES ('unfinished);"), /unterminated/i);
});

test("D1 import, consistent backup and restore preserve records and private avatars", async (t) => {
  const root = await fixture(t);
  const source = join(root, "export.sql");
  const objects = join(root, "objects");
  const version = "11111111-1111-4111-8111-111111111111";
  const email = "first@example.test";
  const key = await avatarObjectKey(email, version);
  const bytes = Buffer.from("RIFFxxxxWEBPtest");
  await mkdir(join(objects, key, ".."), { recursive: true });
  await writeFile(join(objects, key), bytes);
  await writeFile(source, `PRAGMA defer_foreign_keys=TRUE;
    BEGIN TRANSACTION;
    CREATE TABLE users(email TEXT PRIMARY KEY, password_hash TEXT, display_name TEXT, created_at INTEGER, avatar_version TEXT);
    INSERT INTO users VALUES('${email}', 'pbkdf2$100000$salt$hash', 'A;B''C', 123, '${version}');
    CREATE TABLE anime_selections(user_email TEXT, anime_id TEXT);
    INSERT INTO anime_selections VALUES('${email}', 'stable-anime-id');
    CREATE TABLE anime_episode_views(user_email TEXT, anime_id TEXT, episode_start INTEGER, episode INTEGER);
    INSERT INTO anime_episode_views VALUES('${email}', 'stable-anime-id', 1, 3);
    CREATE TABLE auth_sessions(token_hash TEXT, user_email TEXT, expires_at INTEGER);
    INSERT INTO auth_sessions VALUES('old-token-hash', '${email}', 9999999999999);
    COMMIT;`);

  const imported = join(root, "imported");
  await importD1(source, imported, objects);
  await assert.rejects(importD1(source, imported, objects), /exist/i);
  const db = new Database(join(imported, "anime-calendar.sqlite"));
  assert.equal(db.prepare("SELECT count(*) AS n FROM auth_sessions").get().n, 0);
  assert.equal(db.prepare("SELECT display_name FROM users").get().display_name, "A;B'C");
  assert.deepEqual(db.prepare("SELECT episode_start, episode FROM anime_episode_views").get(), { episode_start: 1, episode: 3 });
  db.prepare("INSERT INTO auth_sessions VALUES (?, ?, ?)").run("restore-must-clear", email, Date.now() + 60000);
  db.close();

  const backup = join(root, "backup");
  await createBackup(imported, backup);
  const restored = join(root, "restored");
  await restoreBackup(backup, restored);
  assert.deepEqual(await readFile(join(restored, key)), bytes);
  const restoredDb = new Database(join(restored, "anime-calendar.sqlite"));
  assert.equal(restoredDb.prepare("SELECT count(*) AS n FROM auth_sessions").get().n, 0);
  assert.equal(restoredDb.prepare("SELECT anime_id FROM anime_selections").get().anime_id, "stable-anime-id");
  restoredDb.close();

  await writeFile(join(backup, key), "corrupt");
  await assert.rejects(restoreBackup(backup, join(root, "corrupt-restore")), /checksum/i);
});

test("imports reject executable SQL outside the export tables and leave existing data alone", async (t) => {
  const root = await fixture(t);
  const sql = join(root, "bad.sql");
  await writeFile(sql, "ATTACH DATABASE '/tmp/not-an-export.sqlite' AS other;");
  await assert.rejects(importD1(sql, join(root, "result")), /unsupported/i);
  const target = join(root, "existing");
  await mkdir(target);
  await writeFile(join(target, "keep.txt"), "original");
  await assert.rejects(importD1(sql, target), /exist/i);
  assert.equal(await readFile(join(target, "keep.txt"), "utf8"), "original");
});
