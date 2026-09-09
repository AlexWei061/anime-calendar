import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, copyFile, lstat, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import Database from "better-sqlite3";
import { openDatabase } from "../db/sqlite.js";
import { avatarObjectKey } from "../lib/avatar.js";

const databaseName = "anime-calendar.sqlite";
const avatarPattern = /^avatars\/[0-9a-f]{64}\/[0-9a-f-]{36}\.webp$/;
const exportTables = new Set(["users", "auth_sessions", "anime_selections", "anime_episode_views"]);
const metadataTables = new Set(["d1_migrations", "_cf_METADATA", "__drizzle_migrations", "__app_migrations"]);

async function regularFile(root, relativePath) {
  if (relativePath !== databaseName && !avatarPattern.test(relativePath)) {
    throw new Error("Invalid storage path");
  }
  const directory = await realpath(root);
  const path = join(directory, relativePath);
  const resolved = await realpath(path);
  if (!resolved.startsWith(directory + sep) || !(await lstat(path)).isFile()) {
    throw new Error("Storage file escapes its directory or is not a regular file");
  }
  return path;
}

async function checksum(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function copyPrivateFile(sourceRoot, destinationRoot, relativePath) {
  const source = await regularFile(sourceRoot, relativePath);
  const target = join(destinationRoot, relativePath);
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await copyFile(source, target);
  await chmod(target, 0o600);
}

function verifyDatabase(db) {
  if (db.pragma("integrity_check", { simple: true }) !== "ok") throw new Error("Database integrity check failed");
  for (const table of exportTables) db.prepare(`SELECT count(*) FROM ${table}`).get();
}

async function avatarKeys(db) {
  const keys = [];
  for (const row of db.prepare("SELECT email, avatar_version FROM users WHERE avatar_version IS NOT NULL").all()) {
    const key = await avatarObjectKey(row.email, row.avatar_version);
    if (!avatarPattern.test(key)) throw new Error("Invalid stored avatar version");
    keys.push(key);
  }
  return keys;
}

// A destination must be new. Failed work removes only the directory this call created.
async function inNewDirectory(destination, operation) {
  const target = resolve(destination);
  await mkdir(dirname(target), { recursive: true });
  await mkdir(target, { mode: 0o700 });
  try {
    return await operation(target);
  } catch (error) {
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}

export async function createBackup(sourceDirectory, destination) {
  const source = await regularFile(sourceDirectory, databaseName);
  return inNewDirectory(destination, async (target) => {
    const live = new Database(source, { readonly: true, fileMustExist: true });
    try {
      await live.backup(join(target, databaseName));
    } finally {
      live.close();
    }
    await chmod(join(target, databaseName), 0o600);
    const snapshot = new Database(join(target, databaseName), { readonly: true });
    let keys;
    try {
      verifyDatabase(snapshot);
      keys = await avatarKeys(snapshot);
    } finally {
      snapshot.close();
    }
    // Use the snapshot's versions. A concurrent removal makes the backup fail,
    // rather than publishing a database whose avatar objects are missing.
    for (const key of keys) await copyPrivateFile(sourceDirectory, target, key);
    const files = [];
    for (const path of [databaseName, ...keys]) files.push({ path, sha256: await checksum(join(target, path)) });
    await writeFile(join(target, "manifest.json"), JSON.stringify({ version: 1, createdAt: new Date().toISOString(), files }, null, 2) + "\n", { mode: 0o600 });
    return { files: files.length };
  });
}

export async function restoreBackup(backupDirectory, destination) {
  return inNewDirectory(destination, async (target) => {
    const manifest = JSON.parse(await readFile(join(backupDirectory, "manifest.json"), "utf8"));
    if (manifest.version !== 1 || !Array.isArray(manifest.files)) throw new Error("Invalid backup manifest");
    const paths = new Set();
    for (const item of manifest.files) {
      if (typeof item.path !== "string" || paths.has(item.path)) throw new Error("Invalid or duplicate backup path");
      const source = await regularFile(backupDirectory, item.path);
      if (await checksum(source) !== item.sha256) throw new Error("Backup checksum mismatch");
      paths.add(item.path);
      await copyPrivateFile(backupDirectory, target, item.path);
    }
    if (!paths.has(databaseName)) throw new Error("Backup database is missing");
    const db = new Database(join(target, databaseName));
    try {
      verifyDatabase(db);
      for (const key of await avatarKeys(db)) {
        if (!paths.has(key)) throw new Error("Backup avatar is missing");
      }
      // Restoring a past snapshot must not resurrect previously revoked sessions.
      db.prepare("DELETE FROM auth_sessions").run();
      db.pragma("wal_checkpoint(TRUNCATE)");
    } finally {
      db.close();
    }
    return { files: paths.size };
  });
}

export function splitSqlStatements(source) {
  const statements = [];
  let statement = "";
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (quote) {
      statement += current;
      if (current === quote) {
        if (next === quote && quote !== "]") { statement += next; index += 1; }
        else quote = null;
      }
    } else if (current === "-" && next === "-") {
      const end = source.indexOf("\n", index + 2);
      index = end === -1 ? source.length : end;
      statement += " ";
    } else if (current === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      if (end === -1) throw new Error("Unterminated SQL comment");
      index = end + 1;
      statement += " ";
    } else if (["'", '"', "`", "["].includes(current)) {
      quote = current === "[" ? "]" : current;
      statement += current;
    } else if (current === ";") {
      if (statement.trim()) statements.push(statement.trim());
      statement = "";
    } else {
      statement += current;
    }
  }
  if (quote) throw new Error("Unterminated SQL string");
  if (statement.trim()) statements.push(statement.trim());
  return statements;
}

function readExport(sql) {
  const db = new Database(":memory:");
  try {
    for (const statement of splitSqlStatements(sql)) {
      if (/^(?:BEGIN(?: TRANSACTION)?|COMMIT|END TRANSACTION)$/i.test(statement) || /^PRAGMA\s+(?:defer_foreign_keys|foreign_keys)\s*=\s*(?:TRUE|FALSE|ON|OFF|0|1)$/i.test(statement)) continue;
      const match = /^(CREATE TABLE(?: IF NOT EXISTS)?|INSERT INTO)\s+["`\[]?([A-Za-z_][A-Za-z0-9_]*)["`\]]?\s*(?=\(|VALUES\b)/i.exec(statement);
      if (!match) throw new Error("Unsupported statement in D1 export");
      const table = match[2];
      if (metadataTables.has(table)) continue;
      if (!exportTables.has(table)) throw new Error("Unsupported table in D1 export");
      // Only known table DDL and INSERTs run in memory. ATTACH, extensions,
      // filesystem PRAGMAs, triggers and arbitrary export commands are rejected.
      db.exec(statement);
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export async function importD1(sqlPath, destination, objectsDirectory) {
  return inNewDirectory(destination, async (target) => {
    if ((await lstat(sqlPath)).size > 64 * 1024 * 1024) throw new Error("SQL export exceeds 64 MiB");
    const source = readExport(await readFile(sqlPath, "utf8"));
    let db;
    try {
      db = openDatabase(join(target, databaseName));
      const hasAvatar = source.pragma("table_info(users)").some(({ name }) => name === "avatar_version");
      const users = source.prepare(`SELECT email, password_hash, display_name, created_at, ${hasAvatar ? "avatar_version" : "NULL AS avatar_version"} FROM users`).all();
      const selections = source.prepare("SELECT user_email, anime_id FROM anime_selections").all();
      const views = source.prepare("SELECT user_email, anime_id, episode_start, episode FROM anime_episode_views").all();
      const accounts = new Set(users.map(({ email }) => email));
      if ([...selections, ...views].some(({ user_email }) => !accounts.has(user_email))) throw new Error("Export contains records without a matching account");
      db.transaction(() => {
        const insertUser = db.prepare("INSERT INTO users(email,password_hash,display_name,created_at,avatar_version) VALUES(?,?,?,?,?)");
        const insertSelection = db.prepare("INSERT INTO anime_selections VALUES(?,?)");
        const insertView = db.prepare("INSERT INTO anime_episode_views VALUES(?,?,?,?)");
        for (const row of users) insertUser.run(row.email, row.password_hash, row.display_name, row.created_at, row.avatar_version);
        for (const row of selections) insertSelection.run(row.user_email, row.anime_id);
        for (const row of views) insertView.run(row.user_email, row.anime_id, row.episode_start, row.episode);
      })();
      const keys = await avatarKeys(db);
      if (keys.length && !objectsDirectory) throw new Error("This export references avatars; provide the R2 objects directory");
      for (const key of keys) await copyPrivateFile(objectsDirectory, target, key);
      verifyDatabase(db);
      db.pragma("wal_checkpoint(TRUNCATE)");
      return { users: users.length, selections: selections.length, episodeViews: views.length, avatars: keys.length };
    } finally {
      source.close();
      db?.close();
    }
  });
}
