import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as calendar from "../lib/calendar.js";

const {
  addDays,
  dateOnlyEventsForWeek,
  eventsForWeek,
  formatBroadcastTime,
  groupEventsByTime,
  layoutEventsForDay,
  layoutTimelineEvents,
  seasonForWeek,
  stackEventsForDay,
  startOfWeek,
  timelineBoundsForEvents,
  timelineOffsetMinutes,
  weekDays,
} = calendar;

const seasons = [
  { id: "2024-april", firstWeekStart: "2024-04-01" },
  { id: "2025-january", firstWeekStart: "2024-12-30" },
  { id: "2025-april", firstWeekStart: "2025-03-31" },
  { id: "2025-october", firstWeekStart: "2025-09-29" },
  { id: "2026-january", firstWeekStart: "2025-12-29" },
  { id: "2026-april", firstWeekStart: "2026-03-30" },
];

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

test("keeps a cross-quarter week in its previous season until the next full week", () => {
  assert.equal(typeof seasonForWeek, "function");
  assert.equal(seasonForWeek(seasons, "2024-04-01").id, "2024-april");
  assert.equal(seasonForWeek(seasons, "2025-03-31").id, "2025-january");
  assert.equal(seasonForWeek(seasons, "2025-04-07").id, "2025-april");
  assert.equal(seasonForWeek(seasons, "2025-12-29").id, "2025-october");
  assert.equal(seasonForWeek(seasons, "2026-01-05").id, "2026-january");
  assert.equal(seasonForWeek(seasons, "2026-04-06").id, "2026-april");
});

test("puts each weekly episode in the requested Monday-based week", () => {
  const [event] = eventsForWeek([weeklyShow], "2026-07-06");

  assert.deepEqual(
    { id: event.id, episode: event.episode, date: event.date, time: event.time },
    { id: "demo", episode: 2, date: "2026-07-08", time: "21:00" },
  );
});

test("keeps the full episode range for a multi-episode premiere", () => {
  const multiEpisodePremiere = { ...weeklyShow, premiereEpisodeCount: 3 };

  assert.deepEqual(
    eventsForWeek([multiEpisodePremiere], "2026-06-29").map(({ episodeStart, episode, date }) => ({ episodeStart, episode, date })),
    [{ episodeStart: 1, episode: 3, date: "2026-07-01" }],
  );
  assert.deepEqual(
    eventsForWeek([multiEpisodePremiere], "2026-07-06").map(({ episodeStart, episode, date }) => ({ episodeStart, episode, date })),
    [{ episodeStart: 4, episode: 4, date: "2026-07-08" }],
  );
});

test("uses verified episode schedule segments without extrapolating the final segment", () => {
  const record = {
    ...weeklyShow,
    id: "verified-2026",
    episodeSchedules: [
      { episodeStart: 1, episodeEnd: 2, broadcastDateBeijing: "2026-07-04", beijingTime: "23:00", intervalDays: 0 },
      { episodeStart: 3, episodeEnd: 4, broadcastDateBeijing: "2026-07-12", beijingTime: "23:00", intervalDays: 7 },
    ],
  };

  assert.deepEqual(
    eventsForWeek([record], "2026-07-13").map(({ episodeStart, episode, broadcastDate, time }) => ({
      episodeStart,
      episode,
      broadcastDate,
      time,
    })),
    [{ episodeStart: 4, episode: 4, broadcastDate: "2026-07-19", time: "23:00" }],
  );
  assert.equal(eventsForWeek([record], "2026-08-03").length, 0);
});

test("formats single episodes and premiere episode ranges", () => {
  assert.equal(typeof calendar.formatEpisodeLabel, "function");
  assert.equal(calendar.formatEpisodeLabel(1, 3), "第 1-3 集");
  assert.equal(calendar.formatEpisodeLabel(4, 4), "第 4 集");
});

test("orders same-time events by immutable ID", () => {
  const events = eventsForWeek(
    [
      { ...weeklyShow, id: "z", titleZh: "A" },
      { ...weeklyShow, id: "a", titleZh: "Z" },
    ],
    "2026-07-06",
  );

  assert.deepEqual(events.map(({ id }) => id), ["a", "z"]);
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

test("trims weekly timeline bounds to the visual event range", () => {
  assert.deepEqual(timelineBoundsForEvents([{ time: "16:00" }], 5 * 60, 29 * 60), {
    startMinutes: 16 * 60,
    endMinutes: 17 * 60,
  });
  assert.deepEqual(
    timelineBoundsForEvents([{ time: "16:10" }, { time: "23:40" }], 5 * 60, 29 * 60),
    { startMinutes: 16 * 60, endMinutes: 25 * 60 },
  );
  assert.deepEqual(timelineBoundsForEvents([{ time: "25:00" }], 5 * 60, 29 * 60), {
    startMinutes: 25 * 60,
    endMinutes: 26 * 60,
  });
  assert.deepEqual(timelineBoundsForEvents([], 5 * 60, 29 * 60), {
    startMinutes: 5 * 60,
    endMinutes: 29 * 60,
  });
  assert.deepEqual(timelineBoundsForEvents([{ time: "28:00" }], 15 * 60, 28 * 60), {
    startMinutes: 27 * 60,
    endMinutes: 28 * 60,
  });
});

test("keeps historical timeline bounds aligned to whole hours", () => {
  assert.deepEqual(timelineBoundsForEvents([{ time: "28:30" }], 5 * 60, 28 * 60 + 59), {
    startMinutes: 28 * 60,
    endMinutes: 29 * 60,
  });
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
    {
      date: event.date,
      weekday: event.scheduleWeekday,
      time: event.time,
      broadcastTime: event.broadcastTime,
      label: formatBroadcastTime(event.time),
    },
    {
      date: "2026-07-05",
      weekday: "Sun",
      time: "25:00",
      broadcastTime: "25:00",
      label: "次日 01:00",
    },
  );
});

test("passes an event's original broadcast time to the detail dialog", () => {
  const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /selectedTime: event\.broadcastTime/);
  assert.match(pageSource, /selected\.selectedTime \?\? selected\.beijingTime/);
});

test("renders a midnight historical broadcast in the preceding visual day", () => {
  const [event] = eventsForWeek(
    [
      {
        ...weeklyShow,
        premiereDateBeijing: "2026-01-08",
        scheduleWeekday: "Thu",
        beijingTime: "00:00",
      },
    ],
    "2026-01-05",
  );

  assert.deepEqual(
    {
      date: event.date,
      broadcastDate: event.broadcastDate,
      time: event.time,
      broadcastTime: event.broadcastTime,
    },
    {
      date: "2026-01-07",
      broadcastDate: "2026-01-08",
      time: "24:00",
      broadcastTime: "00:00",
    },
  );
});

test("renders a 04:59 historical broadcast at the end of the preceding day", () => {
  const [event] = eventsForWeek(
    [
      {
        ...weeklyShow,
        premiereDateBeijing: "2026-01-08",
        scheduleWeekday: "Thu",
        beijingTime: "04:59",
      },
    ],
    "2026-01-05",
  );

  assert.deepEqual(
    { date: event.date, broadcastDate: event.broadcastDate, time: event.time, broadcastTime: event.broadcastTime },
    { date: "2026-01-07", broadcastDate: "2026-01-08", time: "28:59", broadcastTime: "04:59" },
  );
});

test("includes Monday midnight broadcasts in the preceding displayed week", () => {
  const [event] = eventsForWeek(
    [
      {
        ...weeklyShow,
        premiereDateBeijing: "2026-01-12",
        scheduleWeekday: "Mon",
        beijingTime: "00:00",
      },
    ],
    "2026-01-05",
  );

  assert.deepEqual(
    { date: event.date, broadcastDate: event.broadcastDate, time: event.time, broadcastTime: event.broadcastTime },
    { date: "2026-01-11", broadcastDate: "2026-01-12", time: "24:00", broadcastTime: "00:00" },
  );
});

test("groups same-time overnight broadcasts without changing their source date", () => {
  const groups = groupEventsByTime([
    { ...weeklyShow, id: "later", date: "2026-07-05", time: "25:30" },
    { ...weeklyShow, id: "second", date: "2026-07-05", time: "25:00" },
    { ...weeklyShow, id: "first", date: "2026-07-05", time: "25:00" },
  ]);

  assert.deepEqual(
    groups.map(({ time }) => formatBroadcastTime(time)),
    ["次日 01:00", "次日 01:30"],
  );
  assert.deepEqual(
    groups[0].events.map(({ id }) => id),
    ["second", "first"],
  );
  assert.deepEqual(
    groups.flatMap(({ events }) => events.map(({ date }) => date)),
    ["2026-07-05", "2026-07-05", "2026-07-05"],
  );
});

test("skips records without a fixed YUC weekday and time", () => {
  assert.deepEqual(
    eventsForWeek([{ ...weeklyShow, scheduleWeekday: null, beijingTime: null }], "2026-06-29"),
    [],
  );
});

test("puts network premieres without a clock time on their premiere date", () => {
  assert.deepEqual(
    dateOnlyEventsForWeek(
      [
        {
          ...weeklyShow,
          id: "network-release",
          premiereDateBeijing: "2026-07-19",
          premiereKind: "network",
          scheduleWeekday: null,
          beijingTime: null,
        },
      ],
      "2026-07-13",
    ).map(({ id, date, premiereDateBeijing, premiereKind }) => ({ id, date, premiereDateBeijing, premiereKind })),
    [
      {
        id: "network-release",
        date: "2026-07-19",
        premiereDateBeijing: "2026-07-19",
        premiereKind: "network",
      },
    ],
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

test("maps YUC times onto the 15:00 timeline and rejects out-of-range times", () => {
  assert.equal(timelineOffsetMinutes("15:00"), 0);
  assert.equal(timelineOffsetMinutes("20:30"), 330);
  assert.equal(timelineOffsetMinutes("25:00"), 600);
  assert.throws(() => timelineOffsetMinutes("14:59"), RangeError);
  assert.throws(() => timelineOffsetMinutes("29:00"), RangeError);
});

test("accepts 28:59 but rejects 29:00 on the historical timeline", () => {
  const historicalStartMinutes = 5 * 60;
  const historicalEndMinutes = 28 * 60 + 59;

  assert.equal(timelineOffsetMinutes("05:00", historicalStartMinutes, historicalEndMinutes), 0);
  assert.equal(timelineOffsetMinutes("06:00", historicalStartMinutes, historicalEndMinutes), 60);
  assert.equal(timelineOffsetMinutes("28:59", historicalStartMinutes, historicalEndMinutes), 1439);
  assert.throws(() => timelineOffsetMinutes("29:00", historicalStartMinutes, historicalEndMinutes), RangeError);
});

test("lays out same-time timeline events in parallel lanes without shifting their starts", () => {
  const dayEvents = [
    { ...weeklyShow, id: "third", time: "20:40" },
    { ...weeklyShow, id: "second", time: "20:30" },
    { ...weeklyShow, id: "first", time: "20:30" },
  ];

  assert.deepEqual(
    layoutTimelineEvents(dayEvents).map(({ event, startMinutes, lane, laneCount }) => ({
      id: event.id,
      startMinutes,
      lane,
      laneCount,
    })),
    [
      { id: "second", startMinutes: 1230, lane: 0, laneCount: 3 },
      { id: "first", startMinutes: 1230, lane: 1, laneCount: 3 },
      { id: "third", startMinutes: 1240, lane: 2, laneCount: 3 },
    ],
  );
});
