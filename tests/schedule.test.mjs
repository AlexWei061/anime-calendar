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

test("keeps a direct YUC Beijing schedule in its listed weekday and clock time", () => {
  assert.deepEqual(
    toBeijingAiring({
      premiereDateBeijing: "2026-07-05",
      scheduleWeekday: "Sun",
      beijingTime: "24:45",
      premiereDateJst: null,
      jstTime: null,
    }),
    { date: "2026-07-05", weekday: "Sun", time: "24:45" },
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

test("separates non-July and time-pending seasonal entries from the July calendar", () => {
  const grouped = groupByBeijingWeekday([
    { id: "july", titleJa: "July", premiereDateJst: "2026-07-06", jstTime: "22:00" },
    { id: "june", titleJa: "June", premiereDateJst: "2026-06-30", jstTime: "22:00" },
    { id: "july-jst", titleJa: "JST July", premiereDateJst: "2026-07-01", jstTime: "00:00" },
    { id: "unknown", titleJa: "Unknown", premiereDateJst: null, jstTime: null },
  ]);

  assert.deepEqual(grouped.byWeekday.Mon.map(({ id }) => id), ["july"]);
  assert.deepEqual(grouped.seasonal.map(({ id }) => id), ["june", "july-jst"]);
  assert.deepEqual(grouped.pending.map(({ id }) => id), ["unknown"]);
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
