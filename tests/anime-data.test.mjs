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
  dedupeRecordId,
  enrichYucRecord,
  findMatch,
  historicalCoverUrls,
  indexAniList,
  parseCards,
  yucSeasonsForYear,
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

test("checks all supported local filenames before redownloading a historical cover", () => {
  assert.deepEqual(historicalCoverUrls(2023, "7", 6), [
    "/covers/yuc/history-2023-07-07.jpg",
    "/covers/yuc/history-2023-07-07.png",
    "/covers/yuc/history-2023-07-07.webp",
    "/covers/yuc/history-2023-07-07.gif",
  ]);
});

test("keeps split YUC continuations distinct when they share an AniList ID", () => {
  const usedIds = new Set();
  const first = dedupeRecordId({ id: "anilist-146323" }, "https://yuc.wiki/202301/", 12, usedIds);
  const continuation = dedupeRecordId({ id: "anilist-146323" }, "https://yuc.wiki/202307/", 7, usedIds);

  assert.deepEqual(first, { id: "anilist-146323" });
  assert.deepEqual(continuation, { id: "anilist-146323-202307-08" });
});

test("parses a YUC card whose clear-both separator is comment-suffixed", () => {
  const html = `
    <div style="float:left"><img width="180px" data-src="https://example.test/vigilante.jpg"></div>
    <div><p class="title_cn_r4">正义使者 我的英雄学院之非法英雄</p>
    <p class="title_jp_r2">ヴィジランテ -僕のヒーローアカデミア ILLEGALS-</p></div>
    <div style="clear:both"></div-->
  `;

  assert.deepEqual(
    parseCards(html, {
      month: "4",
      expectedCardCount: 1,
      sentinelTitles: ["正义使者 我的英雄学院之非法英雄"],
    }).map(({ titleZh }) => titleZh),
    ["正义使者 我的英雄学院之非法英雄"],
  );
});

test("parses a legacy YUC card without the modern title class suffix", () => {
  const html = `
    <div style="float:left"><img width="180px" data-src="https://example.test/tokyo24.jpg"></div>
    <div><p class="title_cn">东京24区</p>
    <p class="title_jp">東京24区</p></div>
    <div style="clear:both"></div>
  `;

  assert.deepEqual(
    parseCards(html, {
      month: "1",
      expectedCardCount: 1,
      sentinelTitles: ["东京24区"],
    }),
    [{ titleZh: "东京24区", titleJa: "東京24区", coverUrl: "https://example.test/tokyo24.jpg" }],
  );
});

test("parses a legacy YUC card with an underscore title class suffix", () => {
  const html = `
    <div style="float:left"><img width="180px" data-src="https://example.test/slow-loop.jpg"></div>
    <div><p class="title_cn__">女孩的钓鱼慢活</p>
    <p class="title_jp">スローループ</p></div>
    <div style="clear:both"></div>
  `;

  assert.deepEqual(
    parseCards(html, {
      month: "1",
      expectedCardCount: 1,
      sentinelTitles: ["女孩的钓鱼慢活"],
    }),
    [{ titleZh: "女孩的钓鱼慢活", titleJa: "スローループ", coverUrl: "https://example.test/slow-loop.jpg" }],
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
  assert.ok(anime.every(({ coverUrl }) => coverUrl.endsWith(".webp")));
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
      coverUrl: "/covers/yuc/yume-mita.webp",
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
  assert.equal(anime.find(({ id }) => id === "mushoku-3")?.premiereEpisodeCount, 2);
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
  assert.deepEqual(seasons.map(({ id }) => id), [
    "2022-january",
    "2022-april",
    "2022-july",
    "2022-october",
    "2023-january",
    "2023-april",
    "2023-july",
    "2023-october",
    "2024-january",
    "2024-april",
    "2024-july",
    "2024-october",
    "2025-january",
    "2025-april",
    "2025-july",
    "2025-october",
    "2026-january",
    "2026-april",
    "2026-july",
  ]);
  assert.deepEqual(
    seasons.map(({ label }) => label),
    [
      "2022 年 1 月番",
      "2022 年 4 月番",
      "2022 年 7 月番",
      "2022 年 10 月番",
      "2023 年 1 月番",
      "2023 年 4 月番",
      "2023 年 7 月番",
      "2023 年 10 月番",
      "2024 年 1 月番",
      "2024 年 4 月番",
      "2024 年 7 月番",
      "2024 年 10 月番",
      "2025 年 1 月番",
      "2025 年 4 月番",
      "2025 年 7 月番",
      "2025 年 10 月番",
      "2026 年 1 月番",
      "2026 年 4 月番",
      "2026 年 7 月番",
    ],
  );
  assert.deepEqual(
    seasons.slice(0, 18).map(({ timelineStartHour }) => timelineStartHour),
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  );
  assert.deepEqual(
    seasons.slice(0, 18).map(({ sourceName, sourceUrl }) => ({ sourceName, sourceUrl })),
    [
      { sourceName: "YUC 2022年1月新番表", sourceUrl: "https://yuc.wiki/202201/" },
      { sourceName: "YUC 2022年4月新番表", sourceUrl: "https://yuc.wiki/202204/" },
      { sourceName: "YUC 2022年7月新番表", sourceUrl: "https://yuc.wiki/202207/" },
      { sourceName: "YUC 2022年10月新番表", sourceUrl: "https://yuc.wiki/202210/" },
      { sourceName: "YUC 2023年1月新番表", sourceUrl: "https://yuc.wiki/202301/" },
      { sourceName: "YUC 2023年4月新番表", sourceUrl: "https://yuc.wiki/202304/" },
      { sourceName: "YUC 2023年7月新番表", sourceUrl: "https://yuc.wiki/202307/" },
      { sourceName: "YUC 2023年10月新番表", sourceUrl: "https://yuc.wiki/202310/" },
      { sourceName: "YUC 2024年1月新番表", sourceUrl: "https://yuc.wiki/202401/" },
      { sourceName: "YUC 2024年4月新番表", sourceUrl: "https://yuc.wiki/202404/" },
      { sourceName: "YUC 2024年7月新番表", sourceUrl: "https://yuc.wiki/202407/" },
      { sourceName: "YUC 2024年10月新番表", sourceUrl: "https://yuc.wiki/202410/" },
      { sourceName: "YUC 2025年1月新番表", sourceUrl: "https://yuc.wiki/202501/" },
      { sourceName: "YUC 2025年4月新番表", sourceUrl: "https://yuc.wiki/202504/" },
      { sourceName: "YUC 2025年7月新番表", sourceUrl: "https://yuc.wiki/202507/" },
      { sourceName: "YUC 2025年10月新番表", sourceUrl: "https://yuc.wiki/202510/" },
      { sourceName: "YUC 2026年1月新番表", sourceUrl: "https://yuc.wiki/202601/" },
      { sourceName: "YUC 2026年4月新番表", sourceUrl: "https://yuc.wiki/202604/" },
    ],
  );

  const historicalSeasons = seasons.filter(({ id }) => id !== "2026-july");
  const historicalAnime = historicalSeasons.flatMap(({ anime: records }) => records);
  assert.ok(historicalAnime.length > 0);
  assert.ok(historicalSeasons.every(({ catalogCount, anime: records }) => catalogCount === records.length));
  assert.ok(
    historicalAnime.every(
      ({ titleZh, coverUrl }) =>
        typeof titleZh === "string" &&
        titleZh.length > 0 &&
        typeof coverUrl === "string" &&
        /^\/covers\/yuc\/history-202[23456]-/.test(coverUrl),
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
  const [generated2022, generated2023, generated2024, generated2025, generated2026] = await Promise.all([
    readFile(new URL("../data/anilist-2022.js", import.meta.url), "utf8"),
    readFile(new URL("../data/anilist-2023.js", import.meta.url), "utf8"),
    readFile(new URL("../data/anilist-2024.js", import.meta.url), "utf8"),
    readFile(new URL("../data/anilist-2025.js", import.meta.url), "utf8"),
    readFile(new URL("../data/anilist-2026.js", import.meta.url), "utf8"),
  ]);
  assert.match(generated2022, /Generated by scripts\/generate-anilist-pilot\.mjs/);
  assert.match(generated2023, /Generated by scripts\/generate-anilist-pilot\.mjs/);
  assert.match(generated2024, /Generated by scripts\/generate-anilist-pilot\.mjs/);
  assert.match(generated2025, /Generated by scripts\/generate-anilist-pilot\.mjs/);
  assert.match(generated2026, /Generated by scripts\/generate-anilist-pilot\.mjs/);
  for (const [generated, seasonNames] of [
    [generated2022, ["winter2022", "spring2022", "summer2022", "fall2022"]],
    [generated2023, ["winter2023", "spring2023", "summer2023", "fall2023"]],
    [generated2024, ["winter2024", "spring2024", "summer2024", "fall2024"]],
    [generated2025, ["winter2025", "spring2025", "summer2025", "fall2025"]],
    [generated2026, ["winter2026", "spring2026"]],
  ]) {
    for (const seasonName of seasonNames) assert.match(generated, new RegExp(`export const ${seasonName}`));
  }
});

test("ships the four generated YUC 2022 catalogs with auditable source records", async () => {
  const generated = await readFile(new URL("../data/yuc-history-2022.js", import.meta.url), "utf8");
  assert.match(generated, /Generated by scripts\/generate-yuc-history-pilot\.mjs/);

  const { april2022, january2022, july2022, october2022 } = await import("../data/yuc-history-2022.js");
  for (const [catalog, sourceUrl, catalogCount, sentinelTitle] of [
    [january2022, "https://yuc.wiki/202201/", 42, "东京24区"],
    [april2022, "https://yuc.wiki/202204/", 57, "群青幻想曲"],
    [july2022, "https://yuc.wiki/202207/", 50, "契约之吻"],
    [october2022, "https://yuc.wiki/202210/", 57, "机动战士高达 水星的魔女"],
  ]) {
    assert.equal(catalog.catalogCount, catalogCount);
    assert.ok(catalog.anime.some(({ titleZh }) => titleZh === sentinelTitle));
    assert.ok(catalog.anime.every(({ sourceUrl: recordSourceUrl }) => recordSourceUrl === sourceUrl));
    assert.ok(catalog.anime.every(({ anilistId }) => typeof anilistId === "number" || anilistId === null));
  }
});

test("ships the four generated YUC 2023 catalogs with auditable source records", async () => {
  const generated = await readFile(new URL("../data/yuc-history-2023.js", import.meta.url), "utf8");
  assert.match(generated, /Generated by scripts\/generate-yuc-history-pilot\.mjs/);

  const { april2023, january2023, july2023, october2023 } = await import("../data/yuc-history-2023.js");
  for (const [catalog, sourceUrl, catalogCount, sentinelTitle] of [
    [january2023, "https://yuc.wiki/202301/", 62, "阿鲁斯的巨兽"],
    [april2023, "https://yuc.wiki/202304/", 53, "机动战士高达 水星的魔女 Part.2"],
    [july2023, "https://yuc.wiki/202307/", 53, "幻日的夜羽"],
    [october2023, "https://yuc.wiki/202310/", 76, "GOD.app 神明选拔"],
  ]) {
    assert.equal(catalog.catalogCount, catalogCount);
    assert.ok(catalog.anime.some(({ titleZh }) => titleZh === sentinelTitle));
    assert.ok(catalog.anime.every(({ sourceUrl: recordSourceUrl }) => recordSourceUrl === sourceUrl));
    assert.ok(catalog.anime.every(({ anilistId }) => typeof anilistId === "number" || anilistId === null));
  }
});

test("ships the four generated YUC 2024 catalogs with auditable source records", async () => {
  const generated = await readFile(new URL("../data/yuc-history-2024.js", import.meta.url), "utf8");
  assert.match(generated, /Generated by scripts\/generate-yuc-history-pilot\.mjs/);

  const { april2024, january2024, july2024, october2024 } = await import("../data/yuc-history-2024.js");
  for (const [catalog, sourceUrl, catalogCount, sentinelTitle] of [
    [january2024, "https://yuc.wiki/202401/", 52, "METALLIC ROUGE"],
    [april2024, "https://yuc.wiki/202404/", 62, "GIRLS BAND CRY"],
    [july2024, "https://yuc.wiki/202407/", 55, "菜一般 花一般"],
    [october2024, "https://yuc.wiki/202410/", 69, "没能成为魔法使的女孩子"],
  ]) {
    assert.equal(catalog.catalogCount, catalogCount);
    assert.ok(catalog.anime.some(({ titleZh }) => titleZh === sentinelTitle));
    assert.ok(catalog.anime.every(({ sourceUrl: recordSourceUrl }) => recordSourceUrl === sourceUrl));
    assert.ok(catalog.anime.every(({ anilistId }) => typeof anilistId === "number" || anilistId === null));
  }
});

test("ships the four generated YUC 2025 catalogs with auditable source records", async () => {
  const generated = await readFile(new URL("../data/yuc-history-2025.js", import.meta.url), "utf8");
  assert.match(generated, /Generated by scripts\/generate-yuc-history-pilot\.mjs/);

  const { april2025, january2025, july2025, october2025 } = await import("../data/yuc-history-2025.js");
  for (const [catalog, sourceUrl, catalogCount, sentinelTitle] of [
    [january2025, "https://yuc.wiki/202501/", 54, "BanG Dream! Ave Mujica"],
    [april2025, "https://yuc.wiki/202504/", 67, "机动战士高达GQuuuuuuX"],
    [july2025, "https://yuc.wiki/202507/", 67, "新 吊带袜天使"],
    [october2025, "https://yuc.wiki/202510/", 61, "永恒余晖"],
  ]) {
    assert.equal(catalog.catalogCount, catalogCount);
    assert.ok(catalog.anime.some(({ titleZh }) => titleZh === sentinelTitle));
    assert.ok(catalog.anime.every(({ sourceUrl: recordSourceUrl }) => recordSourceUrl === sourceUrl));
    assert.ok(catalog.anime.every(({ anilistId }) => typeof anilistId === "number" || anilistId === null));
  }
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
      coverUrl: "/covers/yuc/history-2026-04-69.webp",
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
  const january2022Events = eventsForWeek(allAnime, "2022-01-03");
  const april2022Events = eventsForWeek(allAnime, "2022-03-28");
  const july2022Events = eventsForWeek(allAnime, "2022-06-27");
  const october2022Events = eventsForWeek(allAnime, "2022-09-26");
  const january2023Events = eventsForWeek(allAnime, "2023-01-02");
  const april2023Events = eventsForWeek(allAnime, "2023-03-27");
  const july2023Events = eventsForWeek(allAnime, "2023-06-26");
  const october2023Events = eventsForWeek(allAnime, "2023-09-25");
  const january2024Events = eventsForWeek(allAnime, "2024-01-01");
  const april2024Events = eventsForWeek(allAnime, "2024-04-01");
  const july2024Events = eventsForWeek(allAnime, "2024-07-01");
  const october2024Events = eventsForWeek(allAnime, "2024-09-30");
  const decemberToJanuaryEvents = eventsForWeek(allAnime, "2024-12-30");
  const marchToApril2025Events = eventsForWeek(allAnime, "2025-03-31");
  const septemberToOctoberEvents = eventsForWeek(allAnime, "2025-09-29");
  const marchToAprilEvents = eventsForWeek(allAnime, "2026-03-30");
  const juneToJulyEvents = eventsForWeek(allAnime, "2026-06-29");

  assert.ok(january2022Events.some(({ id, episode }) => id === "anilist-118465" && episode === 1));
  assert.ok(april2022Events.some(({ id, episode }) => id === "anilist-137633" && episode === 1));
  assert.ok(july2022Events.some(({ id, episode }) => id === "anilist-151128" && episode === 1));
  assert.ok(october2022Events.some(({ id, episode }) => id === "anilist-155526" && episode === 1));
  assert.ok(january2023Events.some(({ id, episode }) => id === "anilist-146850" && episode === 1));
  assert.ok(april2023Events.some(({ id, episode }) => id === "anilist-162312" && episode === 1));
  assert.ok(july2023Events.some(({ id, episode }) => id === "anilist-163137" && episode === 1));
  assert.ok(october2023Events.some(({ id, episode }) => id === "anilist-158791" && episode === 1));
  assert.ok(january2024Events.some(({ id, episode }) => id === "anilist-143866" && episode === 1));
  assert.ok(april2024Events.some(({ id, episode }) => id === "anilist-155657" && episode === 1));
  assert.ok(july2024Events.some(({ id, episode }) => id === "anilist-165681" && episode === 1));
  assert.ok(october2024Events.some(({ id, episode }) => id === "anilist-178395" && episode === 1));
  assert.ok(decemberToJanuaryEvents.some(({ id, episode }) => id === "anilist-169295" && episode === 1));
  assert.ok(marchToApril2025Events.some(({ id, episode }) => id === "anilist-184279" && episode === 1));
  assert.ok(septemberToOctoberEvents.some(({ id, episode }) => id === "anilist-187663" && episode === 1));
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
    yucSeasonsForYear(2022).map(({ month, expectedCardCount, sentinelTitles }) => ({ month, expectedCardCount, sentinelTitles })),
    [
      { month: "1", expectedCardCount: 42, sentinelTitles: ["东京24区", "暗芝居 第10期"] },
      { month: "4", expectedCardCount: 57, sentinelTitles: ["群青幻想曲", "INSECTLAND"] },
      { month: "7", expectedCardCount: 50, sentinelTitles: ["契约之吻", "怪兽档案"] },
      { month: "10", expectedCardCount: 57, sentinelTitles: ["机动战士高达 水星的魔女", "噗尼轮轮"] },
    ],
  );
  assert.deepEqual(
    yucSeasonsForYear(2023).map(({ month, expectedCardCount, sentinelTitles }) => ({ month, expectedCardCount, sentinelTitles })),
    [
      { month: "1", expectedCardCount: 62, sentinelTitles: ["阿鲁斯的巨兽", "怪兽档案 第2期"] },
      { month: "4", expectedCardCount: 53, sentinelTitles: ["机动战士高达 水星的魔女 Part.2", "小哥斯拉的逆袭"] },
      { month: "7", expectedCardCount: 53, sentinelTitles: ["幻日的夜羽", "暗芝居 第11期"] },
      { month: "10", expectedCardCount: 76, sentinelTitles: ["GOD.app 神明选拔", "小鸡舞者 第3期"] },
    ],
  );
  assert.deepEqual(
    yucSeasonsForYear(2024).map(({ month, expectedCardCount, sentinelTitles }) => ({ month, expectedCardCount, sentinelTitles })),
    [
      { month: "1", expectedCardCount: 52, sentinelTitles: ["METALLIC ROUGE", "暗芝居 第12期"] },
      { month: "4", expectedCardCount: 62, sentinelTitles: ["GIRLS BAND CRY", "我的英雄学院 第7期"] },
      { month: "7", expectedCardCount: 55, sentinelTitles: ["菜一般 花一般", "暗芝居 第13期"] },
      { month: "10", expectedCardCount: 69, sentinelTitles: ["没能成为魔法使的女孩子", "噗尼轮轮 第2期"] },
    ],
  );
  assert.deepEqual(
    yucSeasonsForYear(2025).map(({ month, expectedCardCount, sentinelTitles }) => ({ month, expectedCardCount, sentinelTitles })),
    [
      { month: "1", expectedCardCount: 54, sentinelTitles: ["BanG Dream! Ave Mujica", "暗芝居 第14期"] },
      { month: "4", expectedCardCount: 67, sentinelTitles: ["机动战士高达GQuuuuuuX", "正义使者 我的英雄学院之非法英雄"] },
      { month: "7", expectedCardCount: 67, sentinelTitles: ["新 吊带袜天使", "噗尼轮轮 第3期"] },
      { month: "10", expectedCardCount: 61, sentinelTitles: ["永恒余晖", "我的英雄学院 第8期"] },
    ],
  );
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
