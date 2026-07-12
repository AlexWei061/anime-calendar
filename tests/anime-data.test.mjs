import assert from "node:assert/strict";
import test from "node:test";

import { anime, season } from "../data/anime.js";
import { groupByBeijingWeekday } from "../lib/schedule.js";

test("ships an auditable July 2026 TV anime snapshot", () => {
  assert.deepEqual(season, {
    label: "2026 夏番",
    timeZoneLabel: "北京时间（UTC+8）",
    updatedAt: "2026-07-11",
    sourceName: "ORICON 夏アニメ2026",
    sourceUrl: "https://www.oricon.co.jp/anime/2026_summer/",
  });
  assert.equal(season.timeZoneLabel, "北京时间（UTC+8）");
  assert.equal(anime.length, 44);
  assert.equal(new Set(anime.map(({ id }) => id)).size, anime.length);
  assert.ok(anime.every(({ premiereDateJst }) => premiereDateJst.startsWith("2026-07-")));
  assert.ok(anime.every(({ sourceUrl }) => sourceUrl.startsWith("https://www.oricon.co.jp/anime/")));
  assert.ok(anime.every(({ station }) => station !== "ABEMAプレミアム"));
  assert.ok(anime.every(({ station }) => !station?.includes("ABEMA")));

  for (const record of anime) {
    assert.deepEqual(Object.keys(record).sort(), [
      "id",
      "jstTime",
      "premiereDateJst",
      "sourceUrl",
      "station",
      "titleJa",
    ]);
  }
});

test("keeps unscheduled shows in the Beijing pending group", () => {
  const { pending } = groupByBeijingWeekday(anime);

  assert.deepEqual(
    pending.map(({ id }) => id).sort(),
    ["koko-ni-makase", "taiari-deshita"],
  );
});
