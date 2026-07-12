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
    catalogCount: 66,
    sourceName: "YUC 2026年7月新番表",
    sourceUrl: "https://yuc.wiki/202607/",
  });
  assert.equal(season.timeZoneLabel, "北京时间（UTC+8）");
  assert.equal(season.catalogCount, 66);
  assert.equal(anime.length, 66);
  assert.equal(new Set(anime.map(({ id }) => id)).size, anime.length);
  assert.ok(anime.every(({ titleZh }) => typeof titleZh === "string" && titleZh.length > 0));
  assert.ok(anime.every(({ coverUrl }) => typeof coverUrl === "string" && coverUrl.length > 0));
  assert.ok(anime.every(({ coverAlt }) => typeof coverAlt === "string" && coverAlt.length > 0));
  assert.ok(anime.every(({ sourceUrl }) => sourceUrl.startsWith("https://")));

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

  const ids = new Set(anime.map(({ id }) => id));
  for (const id of [
    "cyborg-009-nemesis",
    "baki-dou-2",
    "hanazakari-2",
    "100-girlfriends-3",
    "world-is-dancing",
    "kimi-shinu-koi",
    "rezero-4-part-2",
    "lv999-villager",
    "futsutsuka-akujo",
    "20th-century-electric-catalog",
  ]) {
    assert.ok(ids.has(id), `missing YUC catalog title: ${id}`);
  }
  for (const id of [
    "cold-prince",
    "kikkun",
    "tomb-raider-king",
    "pan-baby",
    "planosaurus",
    "someya-sexy-actress",
    "perfect-addiction",
  ]) {
    assert.equal(ids.has(id), false, `unexpected non-YUC title: ${id}`);
  }
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
