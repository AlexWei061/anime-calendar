function parseIsoDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new RangeError(`Invalid ISO date: ${isoDate}`);

  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new RangeError(`Invalid ISO date: ${isoDate}`);
  }
  return date;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate, days) {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

export function firstFullWeekStart(season) {
  return season.firstWeekStart.endsWith("-01")
    ? season.firstWeekStart
    : addDays(season.firstWeekStart, 7);
}

export function seasonForWeek(seasons, weekStart) {
  let activeSeason = seasons[0];

  for (const season of seasons) {
    if (weekStart >= firstFullWeekStart(season)) activeSeason = season;
  }

  return activeSeason;
}

export function startOfWeek(isoDate) {
  const date = parseIsoDate(isoDate);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return addDays(isoDate, -mondayOffset);
}

export function weekDays(weekStart) {
  return Array.from({ length: 7 }, (_, offset) => addDays(weekStart, offset));
}

function timeToMinutes(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new RangeError("Invalid schedule time: " + time);

  const [, hour, minute] = match.map(Number);
  if (minute > 59) throw new RangeError("Invalid schedule time: " + time);
  return hour * 60 + minute;
}

export const TIMELINE_START_MINUTES = 15 * 60;
export const TIMELINE_END_MINUTES = 28 * 60;
export const TIMELINE_EVENT_DURATION_MINUTES = 25;

export function timelineBoundsForEvents(
  events,
  defaultStartMinutes,
  defaultEndMinutes,
  eventDurationMinutes = TIMELINE_EVENT_DURATION_MINUTES,
) {
  if (!events.length) return { startMinutes: defaultStartMinutes, endMinutes: defaultEndMinutes };

  const eventMinutes = events.map((event) => timeToMinutes(event.time));
  const visibleEndMinutes = Math.ceil(defaultEndMinutes / 60) * 60;
  const startMinutes = Math.max(
    defaultStartMinutes,
    Math.min(Math.floor(Math.min(...eventMinutes) / 60) * 60, visibleEndMinutes - 60),
  );
  const endMinutes = Math.max(
    startMinutes + 60,
    Math.min(
      Math.ceil((Math.max(...eventMinutes) + eventDurationMinutes) / 60) * 60,
      visibleEndMinutes,
    ),
  );

  return { startMinutes, endMinutes };
}

export function timelineOffsetMinutes(
  time,
  timelineStartMinutes = TIMELINE_START_MINUTES,
  timelineEndMinutes = TIMELINE_END_MINUTES,
) {
  const minutes = timeToMinutes(time);
  if (minutes < timelineStartMinutes || minutes > timelineEndMinutes) {
    throw new RangeError("Schedule time falls outside the timeline: " + time);
  }
  return minutes - timelineStartMinutes;
}

export function formatBroadcastTime(time) {
  const minutes = timeToMinutes(time);
  if (minutes < 24 * 60) return time;

  const nextDayMinutes = minutes - 24 * 60;
  return `次日 ${String(Math.floor(nextDayMinutes / 60)).padStart(2, "0")}:${String(
    nextDayMinutes % 60,
  ).padStart(2, "0")}`;
}

function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function layoutBroadcast(broadcastDate, broadcastTime) {
  const minutes = timeToMinutes(broadcastTime);

  if (minutes < 5 * 60) {
    return {
      date: addDays(broadcastDate, -1),
      time: formatTime(minutes + 24 * 60),
      broadcastDate,
      broadcastTime,
    };
  }

  return { date: broadcastDate, time: broadcastTime, broadcastDate, broadcastTime };
}

export function formatEpisodeLabel(episodeStart, episode) {
  return "第 " + (episodeStart === episode ? episode : episodeStart + "-" + episode) + " 集";
}

export function groupEventsByTime(events) {
  const groups = [];

  for (const event of [...events].sort((left, right) => timeToMinutes(left.time) - timeToMinutes(right.time))) {
    const group = groups[groups.length - 1];
    if (group?.time === event.time) group.events.push(event);
    else groups.push({ time: event.time, events: [event] });
  }

  return groups;
}

export function stackEventsForDay(events, blockDurationMinutes = 60) {
  let previousVisualEnd = -Infinity;

  return [...events]
    .sort((left, right) => timeToMinutes(left.time) - timeToMinutes(right.time))
    .map((event) => {
      const visualStartMinutes = Math.max(timeToMinutes(event.time), previousVisualEnd);
      previousVisualEnd = visualStartMinutes + blockDurationMinutes;
      return { event, visualStartMinutes };
    });
}

export function layoutEventsForDay(events) {
  return layoutTimelineEvents(events, 45).map(({ event, lane, laneCount }) => ({
    event,
    lane,
    laneCount,
  }));
}

export function layoutTimelineEvents(events, blockDurationMinutes = TIMELINE_EVENT_DURATION_MINUTES) {
  const sorted = [...events].sort(
    (left, right) => timeToMinutes(left.time) - timeToMinutes(right.time),
  );
  const clusters = [];
  let currentCluster = [];
  let currentClusterEnd = -Infinity;

  for (const event of sorted) {
    const start = timeToMinutes(event.time);
    if (currentCluster.length && start >= currentClusterEnd) {
      clusters.push(currentCluster);
      currentCluster = [];
      currentClusterEnd = -Infinity;
    }

    currentCluster.push(event);
    currentClusterEnd = Math.max(currentClusterEnd, start + blockDurationMinutes);
  }

  if (currentCluster.length) clusters.push(currentCluster);

  return clusters.flatMap((cluster) => {
    const laneEnds = [];
    const positioned = cluster.map((event) => {
      const start = timeToMinutes(event.time);
      let lane = laneEnds.findIndex((end) => end <= start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = start + blockDurationMinutes;
      return { event, lane };
    });

    return positioned.map(({ event, lane }) => ({
      event,
      startMinutes: timeToMinutes(event.time),
      lane,
      laneCount: laneEnds.length,
    }));
  });
}

export function eventsForWeek(records, weekStart) {
  const dates = new Set(weekDays(weekStart));
  const events = [];

  for (const record of records) {
    if (!record.scheduleWeekday || !record.beijingTime) continue;

    const premiereEpisodeCount = record.premiereEpisodeCount ?? 1;
    for (let episode = premiereEpisodeCount; episode <= record.episodeCount; episode += 1) {
      const broadcastDate = addDays(record.premiereDateBeijing, (episode - premiereEpisodeCount) * 7);
      const layout = layoutBroadcast(broadcastDate, record.beijingTime);
      if (!dates.has(layout.date)) continue;
      events.push({
        ...record,
        ...layout,
        episodeStart: episode === premiereEpisodeCount ? 1 : episode,
        episode,
      });
    }
  }

  return events.sort((left, right) =>
    left.time < right.time ? -1 : left.time > right.time ? 1 : left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
}
