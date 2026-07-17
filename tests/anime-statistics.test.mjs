import assert from "node:assert/strict";
import test from "node:test";

import {
  broadcastsForDate,
  progressForAnime,
  progressTotals,
  sortProgressByWatchedEpisodes,
} from "../lib/anime-statistics.js";

const anime = [
  { id: "ongoing", episodeCount: 12 },
  { id: "finished", episodeCount: 2 },
  { id: "not-started", episodeCount: 13 },
];

test("summarizes watched ranges into per-anime progress and overall statuses", () => {
  const progress = progressForAnime(anime, [
    { animeId: "ongoing", episodeStart: 1, episode: 3 },
    { animeId: "ongoing", episodeStart: 3, episode: 4 },
    { animeId: "finished", episodeStart: 1, episode: 2 },
  ]);

  assert.deepEqual(
    progress.map(({ record, watchedEpisodeCount, latestWatchedEpisode, status }) => ({
      animeId: record.id,
      watchedEpisodeCount,
      latestWatchedEpisode,
      status,
    })),
    [
      {
        animeId: "ongoing",
        watchedEpisodeCount: 4,
        latestWatchedEpisode: 4,
        status: "in-progress",
      },
      {
        animeId: "finished",
        watchedEpisodeCount: 2,
        latestWatchedEpisode: 2,
        status: "completed",
      },
      {
        animeId: "not-started",
        watchedEpisodeCount: 0,
        latestWatchedEpisode: null,
        status: "not-started",
      },
    ],
  );
  assert.deepEqual(progressTotals(progress), {
    total: 3,
    inProgress: 1,
    completed: 1,
    notStarted: 1,
  });
});

test("sorts seasonal progress by watched episode count before unstarted shows", () => {
  const progress = progressForAnime(anime, [
    { animeId: "ongoing", episodeStart: 1, episode: 4 },
    { animeId: "finished", episodeStart: 1, episode: 2 },
  ]);

  assert.deepEqual(
    sortProgressByWatchedEpisodes(progress).map(({ record, watchedEpisodeCount }) => ({
      animeId: record.id,
      watchedEpisodeCount,
    })),
    [
      { animeId: "ongoing", watchedEpisodeCount: 4 },
      { animeId: "finished", watchedEpisodeCount: 2 },
      { animeId: "not-started", watchedEpisodeCount: 0 },
    ],
  );
});

test("keeps a Monday after-midnight broadcast in the actual date's today list", () => {
  const broadcasts = broadcastsForDate(
    [
      {
        id: "overnight",
        titleZh: "凌晨节目",
        premiereDateBeijing: "2026-07-06",
        scheduleWeekday: "Mon",
        beijingTime: "00:30",
        episodeCount: 12,
      },
      {
        id: "network",
        titleZh: "网络首播",
        premiereDateBeijing: "2026-07-06",
        premiereKind: "network",
        premiereEpisodeCount: 2,
        scheduleWeekday: null,
        beijingTime: null,
        episodeCount: 12,
      },
    ],
    "2026-07-06",
  );

  assert.deepEqual(
    broadcasts.map(({ id, broadcastDate, date, episodeStart, episode, releaseKind }) => ({
      id,
      broadcastDate,
      date,
      episodeStart,
      episode,
      releaseKind,
    })),
    [
      {
        id: "overnight",
        broadcastDate: "2026-07-06",
        date: "2026-07-05",
        episodeStart: 1,
        episode: 1,
        releaseKind: "scheduled",
      },
      {
        id: "network",
        broadcastDate: "2026-07-06",
        date: "2026-07-06",
        episodeStart: 1,
        episode: 2,
        releaseKind: "network",
      },
    ],
  );
});
