import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function getDataDirectory() {
  return resolve(process.env.DATA_DIR || "./storage");
}

export function databasePath() {
  return join(getDataDirectory(), "anime-calendar.sqlite");
}

export function migrateDatabase(db, migrationsDirectory = resolve("drizzle")) {
  const journal = JSON.parse(readFileSync(join(migrationsDirectory, "meta/_journal.json"), "utf8"));
  const migrations = journal.entries.map(({ tag }) => {
    const sql = readFileSync(join(migrationsDirectory, `${tag}.sql`), "utf8");
    return { id: tag, sql, checksum: createHash("sha256").update(sql).digest("hex") };
  });
  db.transaction(() => {
    db.exec("CREATE TABLE IF NOT EXISTS __app_migrations (id TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at INTEGER NOT NULL)");
    const existing = db.prepare("SELECT checksum FROM __app_migrations WHERE id = ?");
    const record = db.prepare("INSERT INTO __app_migrations (id, checksum, applied_at) VALUES (?, ?, ?)");
    for (const migration of migrations) {
      const applied = existing.get(migration.id);
      if (applied) {
        if (applied.checksum !== migration.checksum) throw new Error(`Migration checksum mismatch: ${migration.id}`);
        continue;
      }
      db.exec(migration.sql);
      record.run(migration.id, migration.checksum, Date.now());
    }
  }).immediate();
}

export function openDatabase(filePath = databasePath()) {
  if (filePath !== ":memory:") mkdirSync(dirname(resolve(filePath)), { recursive: true, mode: 0o700 });
  const db = new Database(filePath);
  try {
    if (filePath !== ":memory:") chmodSync(filePath, 0o600);
    db.pragma("busy_timeout = 5000");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrateDatabase(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
