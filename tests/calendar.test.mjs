import assert from "node:assert/strict";
import test from "node:test";

import {
  addDays,
  eventsForWeek,
  formatBroadcastTime,
  layoutEventsForDay,
  stackEventsForDay,
  startOfWeek,
  weekDays,
} from "../lib/calendar.js";

const weeklyShow = {
  id: "demo",
  titleZh: "示例动画",
  premiereDateBeijing: "2026-07-01",
  scheduleWeekday: "Wed",
  beijingTime: "21:00",
  episodeCount: 12,
};

test("builds Monday through Sunday dates for a calendar week", () => {
  assert.equal(startOfWeek("2026-07-12"), "2026-07-06");
  assert.deepEqual(weekDays("2026-07-06"), [
    "2026-07-06",
    "2026-07-07",
    "2026-07-08",
    "2026-07-09",
    "2026-07-10",
    "2026-07-11",
    "2026-07-12",
  ]);
  assert.equal(addDays("2026-07-31", 1), "2026-08-01");
});

test("puts each weekly episode in the requested Monday-based week", () => {
  const [event] = eventsForWeek([weeklyShow], "2026-07-06");

  assert.deepEqual(
    { id: event.id, episode: event.episode, date: event.date, time: event.time },
    { id: "demo", episode: 2, date: "2026-07-08", time: "21:00" },
  );
});

test("stops generating after the configured episode count", () => {
  const threeEpisodeShow = { ...weeklyShow, episodeCount: 3 };

  assert.deepEqual(eventsForWeek([threeEpisodeShow], "2026-07-13").map(({ episode }) => episode), [
    3,
  ]);
  assert.deepEqual(eventsForWeek([threeEpisodeShow], "2026-07-27"), []);
});

test("formats normal and overnight YUC broadcast times", () => {
  assert.equal(formatBroadcastTime("20:30"), "20:30");
  assert.equal(formatBroadcastTime("24:00"), "次日 00:00");
  assert.equal(formatBroadcastTime("27:08"), "次日 03:08");
});

test("keeps a 25:00 YUC label in its source Sunday column", () => {
  const [event] = eventsForWeek(
    [
      {
        ...weeklyShow,
        premiereDateBeijing: "2026-07-05",
        scheduleWeekday: "Sun",
        beijingTime: "25:00",
      },
    ],
    "2026-06-29",
  );

  assert.deepEqual(
    { date: event.date, weekday: event.scheduleWeekday, time: event.time, label: formatBroadcastTime(event.time) },
    { date: "2026-07-05", weekday: "Sun", time: "25:00", label: "次日 01:00" },
  );
});

test("skips records without a fixed YUC weekday and time", () => {
  assert.deepEqual(
    eventsForWeek([{ ...weeklyShow, scheduleWeekday: null, beijingTime: null }], "2026-06-29"),
    [],
  );
});

test("puts events with overlapping short time blocks into separate lanes", () => {
  const dayEvents = [
    { ...weeklyShow, id: "first", time: "20:30" },
    { ...weeklyShow, id: "second", time: "20:40" },
    { ...weeklyShow, id: "third", time: "21:20" },
  ];

  assert.deepEqual(
    layoutEventsForDay(dayEvents).map(({ event, lane, laneCount }) => ({
      id: event.id,
      lane,
      laneCount,
    })),
    [
      { id: "first", lane: 0, laneCount: 2 },
      { id: "second", lane: 1, laneCount: 2 },
      { id: "third", lane: 0, laneCount: 2 },
    ],
  );
});

test("stacks dense events after the previous visual block", () => {
  const dayEvents = [
    { ...weeklyShow, id: "second", time: "20:40" },
    { ...weeklyShow, id: "first", time: "20:30" },
  ];

  assert.deepEqual(
    stackEventsForDay(dayEvents).map(({ event, visualStartMinutes }) => ({
      id: event.id,
      visualStartMinutes,
    })),
    [
      { id: "first", visualStartMinutes: 1230 },
      { id: "second", visualStartMinutes: 1290 },
    ],
  );
});
