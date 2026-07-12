import assert from "node:assert/strict";
import test from "node:test";

import { groupByBeijingWeekday, toBeijingAiring } from "../lib/schedule.js";

test("converts a late JST airing to Beijing time", () => {
  assert.deepEqual(
    toBeijingAiring({ premiereDateJst: "2026-07-07", jstTime: "23:00" }),
    { date: "2026-07-07", weekday: "Tue", time: "22:00" },
  );
});

test("converts 24:00 JST to the prior Beijing hour", () => {
  assert.deepEqual(
    toBeijingAiring({ premiereDateJst: "2026-07-07", jstTime: "24:00" }),
    { date: "2026-07-07", weekday: "Tue", time: "23:00" },
  );
});

test("carries 25:35 JST into the next Beijing date", () => {
  assert.deepEqual(
    toBeijingAiring({ premiereDateJst: "2026-07-07", jstTime: "25:35" }),
    { date: "2026-07-08", weekday: "Wed", time: "00:35" },
  );
});

test("groups aired and pending records by Beijing weekday", () => {
  const grouped = groupByBeijingWeekday([
    { id: "late", premiereDateJst: "2026-07-07", jstTime: "24:00" },
    { id: "pending", premiereDateJst: "2026-07-07", jstTime: null },
  ]);

  assert.equal(grouped.byWeekday.Tue[0].id, "late");
  assert.equal(grouped.pending[0].id, "pending");
});

test("rejects an empty JST time", () => {
  assert.throws(
    () => toBeijingAiring({ premiereDateJst: "2026-07-07", jstTime: "" }),
    /Invalid JST time/,
  );
});

test("rejects an invalid JST calendar date", () => {
  assert.throws(
    () => toBeijingAiring({ premiereDateJst: "2026-02-29", jstTime: "00:00" }),
    (error) => error instanceof RangeError && /Invalid JST date/.test(error.message),
  );
});
