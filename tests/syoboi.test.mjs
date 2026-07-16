import assert from "node:assert/strict";
import test from "node:test";

import {
  choosePrimaryTelevisionSchedule,
  compressEpisodeSchedules,
  parseProgLookup,
  parseTitleLookup,
  syoboiJstToBeijing,
} from "../lib/syoboi.js";

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
