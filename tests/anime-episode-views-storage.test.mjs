import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("declares authenticated per-update watched storage and a generated migration", async () => {
  const [schema, route, migrationNames] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/anime-episode-views/route.ts", import.meta.url), "utf8"),
    readdir(new URL("../drizzle/", import.meta.url)),
  ]);
  const migrationContents = await Promise.all(
    migrationNames
      .filter((name) => name.endsWith(".sql"))
      .map((name) => readFile(new URL("../drizzle/" + name, import.meta.url), "utf8")),
  );

  assert.match(schema, /animeEpisodeViews/);
  assert.match(schema, /integer\("episode_start"\)/);
  assert.match(schema, /integer\("episode"\)/);
  assert.match(schema, /userEmail, table\.animeId, table\.episodeStart, table\.episode/);
  assert.match(route, /getSessionUser/);
  assert.match(route, /status: 401/);
  assert.match(route, /validateEpisodeView/);
  assert.match(route, /filterKnownEpisodeViews/);
  assert.match(route, /onConflictDoNothing\(\)/);
  assert.match(route, /and\(/);
  assert.ok(migrationContents.some((sql) => /CREATE TABLE `anime_episode_views`/.test(sql)));
});
