import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { allAnime, anime, season, seasons } from "../data/anime.js";
import { addDays, eventsForWeek } from "../lib/calendar.js";
import { groupByBeijingWeekday } from "../lib/schedule.js";
import {
  TITLE_ALIASES,
  YUC_SEASONS,
  coverExtension,
  enrichYucRecord,
  findMatch,
  indexAniList,
  parseCards,
} from "../scripts/generate-yuc-history-pilot.mjs";

test("rejects successful non-image YUC cover responses before choosing an extension", () => {
  const coverUrl = "https://i0.hdslb.com/example.jpg";

  assert.throws(
    () => coverExtension(new Response("<html></html>", { headers: { "content-type": "text/html" } }), coverUrl),
    (error) => {
      assert.match(error.message, /YUC cover is not an image/);
      assert.match(error.message, new RegExp(coverUrl));
      return true;
    },
  );
});

test("falls back to the URL extension for unmapped YUC image MIME types", () => {
  assert.equal(
    coverExtension(new Response("", { headers: { "content-type": "image/gif" } }), "https://example.test/cover.gif"),
    ".gif",
  );
});

test("ships an auditable July 2026 TV anime snapshot", () => {
  assert.deepEqual(season, {
    label: "2026 年 7 月番",
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

test("ships YUC historical catalogs with Chinese titles, covers, and AniList broadcast details", async () => {
  assert.deepEqual(seasons.map(({ id }) => id), ["2026-january", "2026-april", "2026-july"]);
  assert.deepEqual(
    seasons.map(({ label }) => label),
    ["2026 年 1 月番", "2026 年 4 月番", "2026 年 7 月番"],
  );
  assert.deepEqual(
    seasons.slice(0, 2).map(({ timelineStartHour }) => timelineStartHour),
    [5, 5],
  );
  assert.deepEqual(
    seasons.slice(0, 2).map(({ sourceName, sourceUrl }) => ({ sourceName, sourceUrl })),
    [
      { sourceName: "YUC 2026年1月新番表", sourceUrl: "https://yuc.wiki/202601/" },
      { sourceName: "YUC 2026年4月新番表", sourceUrl: "https://yuc.wiki/202604/" },
    ],
  );

  const historicalAnime = seasons.slice(0, 2).flatMap(({ anime: records }) => records);
  assert.ok(historicalAnime.length > 0);
  assert.ok(
    historicalAnime.every(
      ({ titleZh, coverUrl }) =>
        typeof titleZh === "string" &&
        titleZh.length > 0 &&
        typeof coverUrl === "string" &&
        coverUrl.startsWith("/covers/yuc/history-2026-"),
    ),
  );
  await Promise.all(
    historicalAnime.map(({ coverUrl }) => access(new URL(`../public${coverUrl}`, import.meta.url))),
  );
  assert.ok(
    historicalAnime.every(
      ({ titleJa, premiereDateBeijing, scheduleWeekday, beijingTime, episodeCount }) =>
        typeof titleJa === "string" &&
        titleJa.length > 0 &&
        ((/^\d{4}-\d{2}-\d{2}$/.test(premiereDateBeijing) &&
          ((/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(scheduleWeekday) && /^\d{2}:\d{2}$/.test(beijingTime)) ||
            (scheduleWeekday === null && beijingTime === null))) ||
          (premiereDateBeijing === null && scheduleWeekday === null && beijingTime === null)) &&
        Number.isInteger(episodeCount) &&
        episodeCount > 0,
    ),
  );

  assert.ok(historicalAnime.some(({ timeStatus }) => timeStatus === "unknown"));
  assert.ok(historicalAnime.some(({ episodeCountStatus }) => episodeCountStatus === "estimated"));
  const unmatchedAnime = historicalAnime.filter(({ anilistId }) => anilistId === null);
  assert.ok(unmatchedAnime.length > 0);
  assert.ok(
    unmatchedAnime.every(
      ({ premiereDateBeijing, scheduleWeekday, beijingTime, timeStatus, episodeCount, episodeCountStatus }) =>
        premiereDateBeijing === null &&
        scheduleWeekday === null &&
        beijingTime === null &&
        timeStatus === "unknown" &&
        episodeCount === 12 &&
        episodeCountStatus === "estimated",
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

test("ships generated YUC historical catalogs with auditable source records", async () => {
  const generated = await readFile(new URL("../data/yuc-history-2026.js", import.meta.url), "utf8");
  assert.match(generated, /Generated by scripts\/generate-yuc-history-pilot\.mjs/);

  const { april2026, january2026 } = await import("../data/yuc-history-2026.js");
  for (const [catalog, sourceUrl] of [
    [january2026, "https://yuc.wiki/202601/"],
    [april2026, "https://yuc.wiki/202604/"],
  ]) {
    assert.ok(catalog.anime.every(({ sourceUrl: recordSourceUrl }) => recordSourceUrl === sourceUrl));
    assert.ok(catalog.anime.every(({ anilistId }) => typeof anilistId === "number" || anilistId === null));
  }
  assert.equal(january2026.catalogCount, 60);
  assert.equal(april2026.catalogCount, 70);
  assert.deepEqual(
    april2026.anime.find(({ id }) => id === "yuc-202604-69"),
    {
      id: "yuc-202604-69",
      anilistId: null,
      episodeCount: 12,
      episodeCountStatus: "estimated",
      titleZh: "一脸嫌弃表情的妹子给你看胖次R",
      titleJa: "嫌な顔されながらおパンツ見せてもらいたいR",
      coverUrl: "/covers/yuc/history-2026-04-69.jpg",
      coverAlt: "一脸嫌弃表情的妹子给你看胖次R 封面",
      sourceUrl: "https://yuc.wiki/202604/",
      premiereDateBeijing: null,
      scheduleWeekday: null,
      beijingTime: null,
      timeStatus: "unknown",
      station: "AniList 未匹配（试点）",
    },
  );
});

test("uses YUC's Re:Zero P1 episode count instead of the AniList total", () => {
  const card = {
    titleZh: "Re:从零开始的异世界生活 第4期",
    titleJa: "Re:ゼロから始める異世界生活 4th season",
    coverUrl: "https://example.test/rezero.jpg",
  };
  const matched = {
    id: "anilist-189046",
    episodeCount: 19,
    episodeCountStatus: "exact",
    premiereDateBeijing: "2026-04-08",
    scheduleWeekday: "Wed",
    beijingTime: "21:00",
    timeStatus: "exact",
    station: "AniList 首集排期（试点）",
  };

  assert.equal(enrichYucRecord(card, 48, "https://yuc.wiki/202604/", matched).episodeCount, 11);
});

test("keeps Re:Zero P1 and Part.2 as separate schedules", () => {
  const aprilReZero = seasons
    .find(({ id }) => id === "2026-april")
    ?.anime.find(({ id }) => id === "anilist-189046");
  const partTwo = anime.find(({ id }) => id === "rezero-4-part-2");

  assert.equal(aprilReZero?.episodeCount, 11);
  assert.equal(partTwo?.episodeCount, 8);
  assert.equal(partTwo?.premiereDateBeijing, "2026-08-12");

  const partOneEvents = Array.from({ length: 11 }, (_, index) =>
    eventsForWeek([aprilReZero], addDays("2026-04-06", index * 7))[0],
  );
  const partTwoEvents = Array.from({ length: 8 }, (_, index) =>
    eventsForWeek([partTwo], addDays("2026-08-10", index * 7))[0],
  );

  assert.deepEqual(partOneEvents.map(({ episode }) => episode), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(eventsForWeek([aprilReZero], "2026-06-22"), []);
  assert.equal(partTwoEvents[0].broadcastDate, "2026-08-12");
  assert.deepEqual(partTwoEvents.map(({ episode }) => episode), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(eventsForWeek([partTwo], "2026-10-05"), []);
});

test("keeps all recorded seasons available while navigating calendar weeks", () => {
  const marchToAprilEvents = eventsForWeek(allAnime, "2026-03-30");
  const juneToJulyEvents = eventsForWeek(allAnime, "2026-06-29");

  assert.ok(marchToAprilEvents.some(({ id, episode }) => id === "anilist-202957" && episode === 10));
  assert.ok(marchToAprilEvents.some(({ id, episode }) => id === "anilist-183231" && episode === 1));
  assert.ok(juneToJulyEvents.some(({ id, episode }) => id === "anilist-183231" && episode === 14));
  assert.ok(juneToJulyEvents.some(({ id, episode }) => id === "lets-go-kaiki" && episode === 1));
});

test("treats zero and ambiguous AniList title matches as YUC-only records", () => {
  const card = { titleJa: "Alpha", titleZh: "示例番", coverUrl: "https://i0.hdslb.com/example.jpg" };

  assert.equal(findMatch(card, new Map()), null);
  assert.equal(findMatch(card, new Map([["alpha", [{}, {}]]])), null);
});

test("keeps unmatched YUC cards without inferring AniList broadcast data", () => {
  const card = { titleJa: "Alpha", titleZh: "示例番", coverUrl: "https://i0.hdslb.com/example.jpg" };

  assert.deepEqual(enrichYucRecord(card, 0, "https://yuc.wiki/202601/", null), {
    id: "yuc-202601-01",
    anilistId: null,
    episodeCount: 12,
    episodeCountStatus: "estimated",
    titleZh: "示例番",
    titleJa: "Alpha",
    coverUrl: "https://i0.hdslb.com/example.jpg",
    coverAlt: "示例番 封面",
    sourceUrl: "https://yuc.wiki/202601/",
    premiereDateBeijing: null,
    scheduleWeekday: null,
    beijingTime: null,
    timeStatus: "unknown",
    station: "AniList 未匹配（试点）",
  });
});

test("guards detailed YUC cards against malformed markup and catalog drift", () => {
  const completeCard = `
    <div style="float:left"><img width="180px" data-src="http://i0.hdslb.com/example.jpg"></div>
    <div><p class="title_cn_r">示例番</p><p class="title_jp_r">Example</p></div>
    <div style="clear:both"></div>`;
  const baseline = { month: "示例月", expectedCardCount: 1, sentinelTitles: ["示例番"] };

  assert.deepEqual(parseCards(completeCard, baseline), [
    { titleZh: "示例番", titleJa: "Example", coverUrl: "https://i0.hdslb.com/example.jpg" },
  ]);
  assert.throws(
    () => parseCards('<img width="180px" data-src="http://i0.hdslb.com/example.jpg">', baseline),
    /YUC 示例月 parsed 0 of 1 detailed cards/,
  );
  assert.throws(
    () => parseCards(completeCard, { ...baseline, expectedCardCount: 2 }),
    /YUC 示例月 detailed-card count changed: expected 2, found 1/,
  );
  assert.throws(
    () => parseCards(completeCard, { ...baseline, sentinelTitles: ["缺少的哨兵"] }),
    /YUC 示例月 is missing sentinel title: 缺少的哨兵/,
  );
});

test("pins the YUC catalog baselines and sentinels", () => {
  assert.deepEqual(
    YUC_SEASONS.map(({ month, expectedCardCount, sentinelTitles }) => ({ month, expectedCardCount, sentinelTitles })),
    [
      { month: "1", expectedCardCount: 60, sentinelTitles: ["棱镜恋曲", "新 魔神坛斗士"] },
      { month: "4", expectedCardCount: 70, sentinelTitles: ["幽灵音乐会 missing Songs", "魔法姐妹露露与莉莉"] },
    ],
  );
});

test("resolves every audited title alias to its intended AniList record", () => {
  const anime = TITLE_ALIASES.map(({ aniListTitle }, index) => ({
    id: `anilist-${index + 1}`,
    titleZh: aniListTitle,
  }));
  const aniListIndex = indexAniList(anime);

  for (const [index, { yucTitle, aniListTitle }] of TITLE_ALIASES.entries()) {
    assert.deepEqual(findMatch({ titleJa: yucTitle }, aniListIndex), {
      id: `anilist-${index + 1}`,
      titleZh: aniListTitle,
    });
  }
});
