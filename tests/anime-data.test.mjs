import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

import { anime, season } from "../data/anime.js";
import { groupByBeijingWeekday } from "../lib/schedule.js";

test("ships an auditable July 2026 TV anime snapshot", () => {
  assert.deepEqual(season, {
    label: "2026 夏番",
    timeZoneLabel: "北京时间（UTC+8）",
    updatedAt: "2026-07-12",
    catalogCount: 63,
    sourceName: "ORICON 夏アニメ2026",
    sourceUrl: "https://www.oricon.co.jp/anime/2026_summer/",
  });
  assert.equal(season.timeZoneLabel, "北京时间（UTC+8）");
  assert.equal(season.catalogCount, 63);
  assert.equal(anime.length, 63);
  assert.equal(new Set(anime.map(({ id }) => id)).size, anime.length);
  assert.ok(anime.every(({ titleZh }) => typeof titleZh === "string" && titleZh.length > 0));
  assert.ok(anime.every(({ coverUrl }) => typeof coverUrl === "string" && coverUrl.length > 0));
  assert.ok(anime.every(({ coverAlt }) => typeof coverAlt === "string" && coverAlt.length > 0));
  assert.ok(
    anime.every(({ id, sourceUrl }) =>
      id === "yume-mita"
        ? sourceUrl === "https://bang-dream.com/yumemita/"
        : sourceUrl.startsWith("https://www.oricon.co.jp/anime/"),
    ),
  );
  assert.ok(anime.every(({ station }) => station !== "ABEMAプレミアム"));
  assert.ok(anime.every(({ station }) => !station?.includes("ABEMA")));

  for (const record of anime) {
    assert.deepEqual(Object.keys(record).sort(), [
      "coverAlt",
      "coverUrl",
      "id",
      "jstTime",
      "premiereDateJst",
      "sourceUrl",
      "station",
      "titleJa",
      "titleZh",
    ]);
  }

  const yumeMita = anime.find(({ id }) => id === "yume-mita");
  assert.deepEqual(
    { titleZh: yumeMita?.titleZh, coverUrl: yumeMita?.coverUrl },
    { titleZh: "梦限大 μ!", coverUrl: "/covers/yume-mita.png" },
  );
});

test("keeps records without confirmed times in the Beijing pending group", () => {
  const { pending } = groupByBeijingWeekday(anime);
  const pendingIds = new Set(pending.map(({ id }) => id));

  assert.ok(pendingIds.has("koko-ni-makase"));
  assert.ok(pendingIds.has("taiari-deshita"));
  assert.ok(pendingIds.has("yume-mita"));
});

test("ships the local Dream Mita cover", async () => {
  await access(new URL("../public/covers/yume-mita.png", import.meta.url));
});
