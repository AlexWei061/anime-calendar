import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { allAnime, anime, season, seasons } from "../data/anime.js";
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
  assert.ok(anime.every(({ coverUrl }) => coverUrl.startsWith("/covers/yuc/")));
  assert.ok(anime.every(({ sourceUrl }) => sourceUrl === season.sourceUrl));

  for (const record of anime) {
    assert.deepEqual(Object.keys(record).filter((key) => key !== "premiereEpisodeCount").sort(), [
      "beijingTime",
      "coverAlt",
      "coverUrl",
      "episodeCount",
      "id",
      "premiereDateBeijing",
      "scheduleWeekday",
      "sourceUrl",
      "station",
      "titleJa",
      "titleZh",
    ]);
  }

  const yumeMita = anime.find(({ id }) => id === "yume-mita");
  assert.deepEqual(
    {
      titleZh: yumeMita?.titleZh,
      coverUrl: yumeMita?.coverUrl,
      scheduleWeekday: yumeMita?.scheduleWeekday,
      beijingTime: yumeMita?.beijingTime,
      premiereEpisodeCount: yumeMita?.premiereEpisodeCount,
    },
    {
      titleZh: "BanG Dream! YUME∞MITA",
      coverUrl: "/covers/yuc/yume-mita.jpg",
      scheduleWeekday: "Thu",
      beijingTime: "22:00",
      premiereEpisodeCount: 3,
    },
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

test("keeps only YUC network releases without listed clock times in the pending group", () => {
  const { pending } = groupByBeijingWeekday(anime);
  const pendingIds = new Set(pending.map(({ id }) => id));

  assert.deepEqual([...pendingIds].sort(), ["baki-dou-2", "cyborg-009-nemesis"]);
  assert.equal(anime.filter(({ beijingTime }) => beijingTime !== null).length, 64);
});

test("uses YUC episode totals when available and defaults every other show to 12 episodes", () => {
  assert.equal(anime.every(({ episodeCount }) => Number.isInteger(episodeCount)), true);
  assert.equal(anime.every(({ episodeCount }) => episodeCount > 0), true);
  assert.equal(anime.find(({ id }) => id === "yume-mita")?.premiereEpisodeCount, 3);
  assert.equal(anime.find(({ id }) => id === "baki-dou-2")?.episodeCount, 12);
  assert.equal(anime.find(({ id }) => id === "cyborg-009-nemesis")?.episodeCount, 3);
  assert.equal(anime.find(({ id }) => id === "rezero-4-part-2")?.episodeCount, 8);
});

test("ships every YUC cover as a local static asset", async () => {
  await Promise.all(
    anime.map(({ coverUrl }) => access(new URL(`../public${coverUrl}`, import.meta.url))),
  );
});

test("ships static AniList trial catalogs for 2026 winter and spring", () => {
  assert.deepEqual(seasons.map(({ id }) => id), ["2026-winter", "2026-spring", "2026-summer"]);

  for (const id of ["2026-winter", "2026-spring"]) {
    const season = seasons.find((candidate) => candidate.id === id);
    assert.ok(season);
    assert.equal(season.sourceName, "AniList 历史放送记录（试点）");
    assert.ok(season.anime.length > 50);
    assert.ok(season.anime.every(({ id: animeId }) => animeId.startsWith("anilist-")));
    assert.ok(
      season.anime.every(
        ({ titleZh, titleJa, coverUrl, premiereDateBeijing, scheduleWeekday, beijingTime, episodeCount }) =>
          typeof titleZh === "string" &&
          titleZh.length > 0 &&
          typeof titleJa === "string" &&
          titleJa.length > 0 &&
          /^https:\/\//.test(coverUrl) &&
          /^\d{4}-\d{2}-\d{2}$/.test(premiereDateBeijing) &&
          ((/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(scheduleWeekday) &&
            /^\d{2}:\d{2}$/.test(beijingTime)) ||
            (scheduleWeekday === null && beijingTime === null)) &&
          Number.isInteger(episodeCount) &&
          episodeCount > 0,
      ),
    );
  }

  assert.ok(seasons[1].anime.some(({ beijingTime }) => beijingTime === null));
  assert.equal(seasons[0].timelineStartHour, 0);
  assert.deepEqual(
    (({ id, premiereDateBeijing, scheduleWeekday, beijingTime }) => ({
      id,
      premiereDateBeijing,
      scheduleWeekday,
      beijingTime,
    }))(seasons[0].anime.find(({ id }) => id === "anilist-189259")),
    {
      id: "anilist-189259",
      premiereDateBeijing: "2026-01-05",
      scheduleWeekday: "Mon",
      beijingTime: "00:00",
    },
  );
  assert.ok(
    seasons[0].anime.some(
      ({ episodeCount, episodeCountStatus }) => episodeCount === 12 && episodeCountStatus === "estimated",
    ),
  );
  assert.equal(new Set(allAnime.map(({ id }) => id)).size, allAnime.length);
});

test("keeps the historical pilot as generated local data", async () => {
  const generated = await readFile(new URL("../data/anilist-2026.js", import.meta.url), "utf8");
  assert.match(generated, /Generated by scripts\/generate-anilist-pilot\.mjs/);
  assert.match(generated, /export const winter2026/);
  assert.match(generated, /export const spring2026/);
});
