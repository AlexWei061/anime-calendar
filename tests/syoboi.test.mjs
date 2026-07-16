import assert from "node:assert/strict";
import test from "node:test";

import {
  choosePrimaryTelevisionSchedule,
  compressEpisodeSchedules,
  parseProgLookup,
  parseTitleLookup,
  syoboiJstToBeijing,
} from "../lib/syoboi.js";
import {
  buildYearSnapshot,
  requestWithRateLimitRetry,
  resolveSyoboiTitle,
} from "../scripts/generate-syoboi-history.mjs";

test("parses XML entities and the requested title fields", () => {
  assert.deepEqual(
    parseTitleLookup(
      '<TitleItem><TID>5518</TID><Title>ID:INVADED &amp; Test</Title><FirstYear>2020</FirstYear><FirstMonth>1</FirstMonth></TitleItem>',
    ),
    [{ tid: 5518, title: "ID:INVADED & Test", firstYear: 2020, firstMonth: 1 }],
  );
});

test("converts a JST midnight record to the preceding Beijing date", () => {
  assert.deepEqual(syoboiJstToBeijing("20200106_000000"), {
    broadcastDateBeijing: "2020-01-05",
    beijingTime: "23:00",
  });
});

test("rejects reruns and chooses the earliest Japanese television premiere", () => {
  const programs = parseProgLookup(`
    <ProgItem><PID>1</PID><StTime>20200105_230000</StTime><Count>1</Count><Flag>8</Flag><Deleted>0</Deleted><ChID>1</ChID></ProgItem>
    <ProgItem><PID>2</PID><StTime>20200106_000000</StTime><Count>1</Count><Flag>0</Flag><Deleted>0</Deleted><ChID>2</ChID></ProgItem>
    <ProgItem><PID>3</PID><StTime>20200105_220000</StTime><Count>1</Count><Flag>0</Flag><Deleted>0</Deleted><ChID>3</ChID></ProgItem>
  `);

  assert.deepEqual(
    choosePrimaryTelevisionSchedule(
      programs,
      new Map([
        [1, { kind: "television" }],
        [2, { kind: "television" }],
        [3, { kind: "internet" }],
      ]),
    ),
    { channelId: 2, firstProgramId: 2 },
  );
});

test("keeps a same-slot double premiere and compresses a later weekly run", () => {
  assert.deepEqual(
    compressEpisodeSchedules([
      { episodeStart: 1, episodeEnd: 2, broadcastDateBeijing: "2026-07-04", beijingTime: "23:00" },
      { episodeStart: 3, episodeEnd: 3, broadcastDateBeijing: "2026-07-12", beijingTime: "23:00" },
      { episodeStart: 4, episodeEnd: 4, broadcastDateBeijing: "2026-07-19", beijingTime: "23:00" },
    ]),
    [
      { episodeStart: 1, episodeEnd: 2, broadcastDateBeijing: "2026-07-04", beijingTime: "23:00", intervalDays: 0 },
      { episodeStart: 3, episodeEnd: 4, broadcastDateBeijing: "2026-07-12", beijingTime: "23:00", intervalDays: 7 },
    ],
  );
});

test("accepts only a one-to-one normalized title in its broadcast year", () => {
  assert.deepEqual(
    resolveSyoboiTitle(
      { id: "anilist-110350", titleJa: "ID:INVADED イド：インヴェイデッド", aniListTitleJa: "ID:INVADED" },
      [{ tid: 5518, title: "ID:INVADED イド：インヴェイデッド", firstYear: 2020, firstMonth: 1 }],
      2020,
    ),
    { status: "matched", tid: 5518 },
  );
});

test("writes ambiguous names to the report instead of selecting one", () => {
  const snapshot = buildYearSnapshot({
    year: 2020,
    catalog: [{ id: "same-name", titleJa: "同名作品", aniListTitleJa: "同名作品" }],
    titles: [
      { tid: 1, title: "同名作品", firstYear: 2020, firstMonth: 1 },
      { tid: 2, title: "同名作品", firstYear: 2020, firstMonth: 1 },
    ],
    channels: new Map(),
    programsByTid: new Map(),
  });

  assert.deepEqual(snapshot.entries, []);
  assert.deepEqual(snapshot.ambiguous, [{ recordId: "same-name", candidateTids: [1, 2] }]);
});

test("waits out one Syoboi rate-limit response before retrying the same request", async () => {
  let attempts = 0;
  const delays = [];
  const response = await requestWithRateLimitRetry(
    async () => new Response("", { status: ++attempts === 1 ? 429 : 200 }),
    async (milliseconds) => delays.push(milliseconds),
  );

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [10_000]);
});
