import assert from "node:assert/strict";
import test from "node:test";

import {
  episodeViewKey,
  episodeViewUnitsForAnime,
  filterKnownEpisodeViews,
  updateEpisodeViews,
  validateEpisodeView,
  validateEpisodeViewBatch,
} from "../lib/anime-episode-views.js";

const animeById = new Map([
  ["regular", { id: "regular", episodeCount: 12 }],
  [
    "three-at-once",
    { id: "three-at-once", episodeCount: 12, premiereKind: "network", premiereEpisodeCount: 3 },
  ],
]);

test("accepts an individual episode from a formerly batched premiere", () => {
  const watchedEpisode = validateEpisodeView(
    { animeId: "three-at-once", episodeStart: 1, episode: 1 },
    animeById,
  );

  assert.deepEqual(watchedEpisode, {
    animeId: "three-at-once",
    episodeStart: 1,
    episode: 1,
  });
  assert.equal(episodeViewKey(watchedEpisode), "three-at-once:1-1");
  assert.throws(
    () => validateEpisodeView({ animeId: "three-at-once", episodeStart: 1, episode: 3 }, animeById),
    /Invalid episode range/,
  );
});

test("validates and deduplicates an atomic watched-episode batch", () => {
  const firstEpisode = { animeId: "regular", episodeStart: 1, episode: 1 };
  const secondEpisode = { animeId: "regular", episodeStart: 2, episode: 2 };

  assert.deepEqual(
    validateEpisodeViewBatch([firstEpisode, firstEpisode, secondEpisode], animeById),
    [firstEpisode, secondEpisode],
  );
});

test("rejects invalid or oversized watched-episode batches", () => {
  const validEpisode = { animeId: "regular", episodeStart: 1, episode: 1 };

  assert.throws(() => validateEpisodeViewBatch(null, animeById), /must be an array/);
  assert.throws(() => validateEpisodeViewBatch([], animeById), /must not be empty/);
  assert.throws(
    () => validateEpisodeViewBatch(Array.from({ length: 26 }, () => validEpisode), animeById),
    /at most 25/,
  );
  assert.throws(
    () => validateEpisodeViewBatch([{ animeId: "removed", episodeStart: 1, episode: 1 }], animeById),
    /Unknown anime ID/,
  );
  assert.throws(
    () => validateEpisodeViewBatch([{ animeId: "regular", episodeStart: 1, episode: 2 }], animeById),
    /Invalid episode range/,
  );
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
  assert.throws(
    () => validateEpisodeView({ animeId: "regular", episodeStart: 1, episode: 12 }, animeById),
    /Invalid episode range/,
  );
});

test("lists one unit per episode for a regular weekly anime", () => {
  assert.deepEqual(
    episodeViewUnitsForAnime({ id: "regular", episodeCount: 3, premiereEpisodeCount: 1 }),
    [
      { episodeStart: 1, episode: 1 },
      { episodeStart: 2, episode: 2 },
      { episodeStart: 3, episode: 3 },
    ],
  );
});

test("lists every episode from a network premiere batch separately", () => {
  assert.deepEqual(
    episodeViewUnitsForAnime({
      id: "three-at-once",
      episodeCount: 5,
      premiereKind: "network",
      premiereEpisodeCount: 3,
    }),
    [
      { episodeStart: 1, episode: 1 },
      { episodeStart: 2, episode: 2 },
      { episodeStart: 3, episode: 3 },
      { episodeStart: 4, episode: 4 },
      { episodeStart: 5, episode: 5 },
    ],
  );
});

test("lists each episode separately when a schedule contains a same-day batch", () => {
  assert.deepEqual(
    episodeViewUnitsForAnime({
      id: "regular",
      episodeCount: 5,
      episodeSchedules: [
        { episodeStart: 1, episodeEnd: 2, intervalDays: 0 },
        { episodeStart: 3, episodeEnd: 4, intervalDays: 7 },
      ],
    }),
    [
      { episodeStart: 1, episode: 1 },
      { episodeStart: 2, episode: 2 },
      { episodeStart: 3, episode: 3 },
      { episodeStart: 4, episode: 4 },
      { episodeStart: 5, episode: 5 },
    ],
  );
});

test("expands a valid saved legacy batch into individual watched episodes", () => {
  assert.deepEqual(
    filterKnownEpisodeViews(
      [{ animeId: "three-at-once", episodeStart: 1, episode: 3 }],
      animeById,
    ),
    [
      { animeId: "three-at-once", episodeStart: 1, episode: 1 },
      { animeId: "three-at-once", episodeStart: 2, episode: 2 },
      { animeId: "three-at-once", episodeStart: 3, episode: 3 },
    ],
  );
});

test("expands a batched calendar toggle into individual watched episodes", () => {
  assert.deepEqual(
    updateEpisodeViews([], { animeId: "three-at-once", episodeStart: 1, episode: 3 }, true),
    [
      { animeId: "three-at-once", episodeStart: 1, episode: 1 },
      { animeId: "three-at-once", episodeStart: 2, episode: 2 },
      { animeId: "three-at-once", episodeStart: 3, episode: 3 },
    ],
  );
});
