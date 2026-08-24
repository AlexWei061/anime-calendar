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
  assert.match(route, /isLegacyEpisodeViewForAnime/);
  assert.match(route, /episodeViewUnitsForRange/);
  assert.match(route, /db\.batch\(/);
  assert.match(route, /onConflictDoNothing\(\)/);
  assert.match(route, /and\(/);
  assert.ok(migrationContents.some((sql) => /CREATE TABLE `anime_episode_views`/.test(sql)));
});

test("saves a watched range through one request and one atomic database batch", async () => {
  const [route, page] = await Promise.all([
    readFile(new URL("../app/api/anime-episode-views/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const putRoute = route.slice(route.indexOf("export async function PUT"));
  const toggleStart = page.indexOf("const toggleEpisodeView");
  const toggleEnd = page.indexOf("const openAuthDialog", toggleStart);
  const toggleEpisodeView = page.slice(toggleStart, toggleEnd);

  assert.match(putRoute, /validateEpisodeViewBatch\(payload\.watchedEpisodes, animeById\)/);
  assert.match(putRoute, /db\.batch\(/);
  assert.match(putRoute, /watchedEpisodes\.map/);
  assert.match(putRoute, /values\(\s*watchedEpisodes\.map/);
  assert.match(putRoute, /return Response\.json\(\{ watchedEpisodes, watched \}\)/);

  assert.match(
    toggleEpisodeView,
    /JSON\.stringify\(\{ watchedEpisodes: episodeViews, watched: !isWatched \}\)/,
  );
  assert.equal((toggleEpisodeView.match(/fetch\("\/api\/anime-episode-views"/g) ?? []).length, 1);
  assert.doesNotMatch(toggleEpisodeView, /Promise\.all/);
});
