import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("declares a D1 table and authenticated selection route", async () => {
  const [hosting, schema, route] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/anime-selections/route.ts", import.meta.url), "utf8"),
  ]);

  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.match(schema, /animeSelections/);
  assert.match(schema, /primaryKey/);
  assert.match(route, /getChatGPTUser/);
  assert.match(route, /status: 401/);
  assert.match(route, /validateAnimeIds/);
  assert.match(route, /import \{[^}]*filterKnownAnimeIds[^}]*\} from/);
  assert.match(route, /filterKnownAnimeIds\(rows\.map\(\(\{ animeId \}\) => animeId\), validAnimeIds\)/);
  assert.match(route, /filterKnownAnimeIds\(payload\.animeIds, validAnimeIds\)/);
});
