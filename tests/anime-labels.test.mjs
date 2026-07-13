import assert from "node:assert/strict";
import test from "node:test";

import { networkBroadcastLabel } from "../lib/anime-labels.js";

test("labels network broadcasts with the correct schedule source", () => {
  assert.equal(
    networkBroadcastLabel({
      isHistoricalSeason: true,
      sourceName: "YUC 2026年1月新番表",
      premiereDateBeijing: "2026-01-08",
    }),
    "AniList 首播 · 2026-01-08",
  );
  assert.equal(
    networkBroadcastLabel({
      isHistoricalSeason: false,
      sourceName: "YUC 2026年7月新番表",
      premiereDateBeijing: "2026-07-06",
    }),
    "YUC 2026年7月新番表 首播 · 2026-07-06",
  );
  assert.equal(
    networkBroadcastLabel({
      isHistoricalSeason: true,
      sourceName: "YUC 2026年1月新番表",
      premiereDateBeijing: null,
    }),
    "首播日期未列出",
  );
});
