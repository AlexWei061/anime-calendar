import assert from "node:assert/strict";
import test from "node:test";

import {
  episodeViewKey,
  filterKnownEpisodeViews,
  updateEpisodeViews,
  validateEpisodeView,
} from "../lib/anime-episode-views.js";

const animeById = new Map([
  ["regular", { id: "regular", episodeCount: 12 }],
  ["three-at-once", { id: "three-at-once", episodeCount: 12 }],
]);

test("accepts one watched multi-episode update and gives it a stable key", () => {
  const watchedEpisode = validateEpisodeView(
    { animeId: "three-at-once", episodeStart: 1, episode: 3 },
    animeById,
  );

  assert.deepEqual(watchedEpisode, {
    animeId: "three-at-once",
    episodeStart: 1,
    episode: 3,
  });
  assert.equal(episodeViewKey(watchedEpisode), "three-at-once:1-3");
});

test("filters removed and duplicate saved watched updates", () => {
  assert.deepEqual(
    filterKnownEpisodeViews(
      [
        { animeId: "regular", episodeStart: 2, episode: 2 },
        { animeId: "removed", episodeStart: 1, episode: 1 },
        { animeId: "regular", episodeStart: 2, episode: 2 },
      ],
      animeById,
    ),
    [{ animeId: "regular", episodeStart: 2, episode: 2 }],
  );
});

test("preserves independently updated episodes through failed optimistic mutations", () => {
  const firstEpisode = { animeId: "regular", episodeStart: 1, episode: 1 };
  const secondEpisode = { animeId: "regular", episodeStart: 2, episode: 2 };

  let watchedEpisodes = updateEpisodeViews([], firstEpisode, true);
  watchedEpisodes = updateEpisodeViews(watchedEpisodes, secondEpisode, true);
  watchedEpisodes = updateEpisodeViews(watchedEpisodes, firstEpisode, false);
  assert.deepEqual(watchedEpisodes.map(episodeViewKey), [episodeViewKey(secondEpisode)]);

  watchedEpisodes = updateEpisodeViews([firstEpisode], firstEpisode, false);
  watchedEpisodes = updateEpisodeViews(watchedEpisodes, secondEpisode, true);
  watchedEpisodes = updateEpisodeViews(watchedEpisodes, firstEpisode, true);
  assert.deepEqual(
    new Set(watchedEpisodes.map(episodeViewKey)),
    new Set([episodeViewKey(firstEpisode), episodeViewKey(secondEpisode)]),
  );
});

test("rejects impossible watched updates from a browser request", () => {
  assert.throws(
    () => validateEpisodeView({ animeId: "removed", episodeStart: 1, episode: 1 }, animeById),
    /Unknown anime ID/,
  );
  assert.throws(
    () => validateEpisodeView({ animeId: "regular", episodeStart: 2, episode: 1 }, animeById),
    /Invalid episode range/,
  );
  assert.throws(
    () => validateEpisodeView({ animeId: "regular", episodeStart: 1, episode: 13 }, animeById),
    /Invalid episode range/,
  );
  assert.throws(
    () => validateEpisodeView({ animeId: "regular", episodeStart: 1.5, episode: 2 }, animeById),
    /Invalid episode range/,
  );
});
