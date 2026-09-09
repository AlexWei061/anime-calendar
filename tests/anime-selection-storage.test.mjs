import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("declares a SQLite table and authenticated selection route", async () => {
  const [database, schema, route] = await Promise.all([
    readFile(new URL("../db/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/anime-selections/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(database, /drizzle-orm\/better-sqlite3/);
  assert.match(schema, /animeSelections/);
  assert.match(schema, /primaryKey/);
  assert.match(route, /getSessionUser/);
  assert.match(route, /status: 401/);
  assert.doesNotMatch(route, /validateAnimeIds/);
  assert.match(route, /import \{[^}]*filterKnownAnimeIds[^}]*\} from/);
  assert.match(route, /filterKnownAnimeIds\(rows\.map\(\(\{ animeId \}\) => animeId\), validAnimeIds\)/);
  assert.match(route, /filterKnownAnimeIds\(payload\.animeIds, validAnimeIds\)/);
});

test("replaces selections in one synchronous SQLite transaction", async () => {
  const route = await readFile(new URL("../app/api/anime-selections/route.ts", import.meta.url), "utf8");

  assert.match(route, /for \(const batch of selectionInsertBatches\(animeIds\)\)/);
  assert.match(route, /db\.transaction\(\(tx\) =>/);
  assert.doesNotMatch(route, /transaction\(async/);
  assert.match(route, /tx\.delete[\s\S]*tx\.insert/);
});
