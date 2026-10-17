import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildRawEntries,
  generateSeasonData,
  mergeSeasonEntries,
  seasonConfigFor,
} from "../scripts/generate-yuc-current.mjs";

test("replays the October 2026 season from the committed YUC snapshot", async () => {
  const html = await readFile(new URL("../scripts/fixtures/yuc-202610.html", import.meta.url), "utf8");
  const generated = await generateSeasonData("202610", { inputHtml: html, dryRun: true });
  const committed = await import("../data/yuc-current-202610.js");

  assert.equal(generated.season.catalogCount, 69);
  assert.deepEqual(generated.rawEntries, committed.october2026RawEntries);
  assert.deepEqual(generated.season, committed.october2026);

  // 网络首播无明确时刻时必须保留 null，不能虚构时间。
  const networkPremieres = generated.season.anime.filter(({ premiereKind }) => premiereKind === "network");
  assert.deepEqual(
    networkPremieres.map(({ id }) => id).sort(),
    ["cyberpunk-edgerunners-2", "demons-crest", "fool-night", "jojo-sbr-2nd-3rd"],
  );
  assert.ok(networkPremieres.every(({ beijingTime, scheduleWeekday }) => beijingTime === null && scheduleWeekday === null));
});

test("remerges the archived July 2026 season from its preserved raw entries", async () => {
  const generated = await generateSeasonData("202607", { remerge: true });
  const committed = await import("../data/yuc-current-202607.js");

  assert.equal(generated.season.catalogCount, 66);
  assert.deepEqual(generated.rawEntries, committed.july2026RawEntries);
  assert.deepEqual(generated.season, committed.july2026);

  await assert.rejects(generateSeasonData("202607", { inputHtml: "<html></html>" }), /已归档/);
});

test("preserves episode-count certainty and YUC priority when merging AniList records", () => {
  const estimated = { id: "anilist-1", episodeCount: 12, episodeCountStatus: "estimated" };
  for (const { aniList, yucCount, expected } of [
    { aniList: estimated, yucCount: false, expected: { episodeCount: 12, episodeCountStatus: "estimated", episodeCountSource: "estimated" } },
    { aniList: { ...estimated, episodeCount: 24, episodeCountStatus: "exact" }, yucCount: false, expected: { episodeCount: 24, episodeCountStatus: "exact", episodeCountSource: "AniList" } },
    { aniList: estimated, yucCount: true, expected: { episodeCount: 13, episodeCountStatus: "exact", episodeCountSource: "YUC" } },
    { aniList: null, yucCount: false, expected: { episodeCount: 12, episodeCountStatus: "estimated", episodeCountSource: "estimated" } },
  ]) {
    const [record] = mergeSeasonEntries([{ id: "count-case", episodeCount: yucCount ? 13 : 12, premiereKind: "network" }], {
      matchAniList: () => aniList,
      hasYucEpisodeCount: () => yucCount,
      syoboiSchedules: new Map(),
    });
    assert.deepEqual({
      episodeCount: record.episodeCount,
      episodeCountStatus: record.episodeCountStatus,
      episodeCountSource: record.episodeCountSource,
    }, expected);
  }
});

test("keeps unconfirmed October episode totals marked as estimates in the generated catalog", async () => {
  const { october2026 } = await import("../data/yuc-current-202610.js");
  const estimatedIds = ["yozakura-2-part-2", "shuiro-no-kamen", "tank-chair", "tensei-goblin", "yukionna-noroi", "demons-crest", "shirotan"];
  for (const id of estimatedIds) {
    const record = october2026.anime.find((entry) => entry.id === id);
    assert.equal(record?.episodeCount, 12, id);
    assert.equal(record.episodeCountStatus, "estimated", id);
    assert.equal(record.episodeCountSource, "estimated", id);
    assert.ok(record.anilistId, id);
  }
});

test("parses the YUC advance-premiere rule into structured premiere fields", () => {
  const config = {
    sourceUrl: "https://yuc.wiki/202607/",
    expectedCount: 1,
    slugByTitle: { "测试作品": "advance-case" },
    yucEpisodeCounts: {},
  };
  // 与 202607 季「躲在超市后门抽烟的两人」详情文字同构：6/3先行6话 7/9周四深夜。
  const cards = [
    { cover: "https://images.test/a.jpg", titleZh: "测试作品", titleJa: "テスト作品", type: "漫画改编", broadcast: "6/3先行6话 7/9周四深夜", broadcastEx: "" },
  ];
  const weekly = [{ weekday: "周四", time: "22:56~", startDate: "7/9~", cover: "https://images.test/a.jpg", title: "测试作品" }];

  const [record] = buildRawEntries("202607", config, { weekly, network: [], cards });
  assert.deepEqual(record, {
    id: "advance-case",
    episodeCount: 12,
    titleZh: "测试作品",
    titleJa: "テスト作品",
    coverUrl: "/covers/yuc/advance-case.webp",
    coverAlt: "测试作品 主视觉",
    premiereDateBeijing: "2026-06-03",
    premiereKind: "network",
    premiereEpisodeCount: 6,
    regularBroadcastStartDateBeijing: "2026-07-09",
    scheduleWeekday: "Thu",
    beijingTime: "22:56",
    station: "YUC 周表",
    sourceUrl: "https://yuc.wiki/202607/",
  });
});

test("rejects unrecognized advance or multi-episode premiere notes for manual audit", () => {
  const config = {
    sourceUrl: "https://yuc.wiki/202607/",
    expectedCount: 1,
    slugByTitle: { "测试作品": "advance-case" },
    yucEpisodeCounts: {},
  };
  const baseCard = { cover: "https://images.test/a.jpg", titleZh: "测试作品", titleJa: "テスト作品", type: "漫画改编", broadcastEx: "" };
  const weekly = [{ weekday: "周四", time: "22:56~", startDate: "7/9~", cover: "https://images.test/a.jpg", title: "测试作品" }];

  assert.throws(
    () => buildRawEntries("202607", config, { weekly, network: [], cards: [{ ...baseCard, broadcast: "首周2话连播 #1~2=7/4晚间 #3~周四深夜" }] }),
    /未识别的先行\/连播排期/,
  );
  assert.throws(
    () => buildRawEntries("202607", config, { weekly: [], network: [], cards: [{ ...baseCard, broadcast: "6/3先行6话 7/9周四深夜" }] }),
    /只有先行排期但没有周表条目/,
  );
});

test("refuses seasons without configuration and keeps generated-file headers", async () => {
  assert.throws(() => seasonConfigFor("202801"), /未配置的季度/);
  for (const file of ["../data/yuc-current-202607.js", "../data/yuc-current-202610.js"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(source, /Generated by scripts\/generate-yuc-current\.mjs\. Do not edit by hand\./);
  }
});
