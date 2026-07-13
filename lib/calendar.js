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

export function timelineOffsetMinutes(time) {
  const minutes = timeToMinutes(time);
  if (minutes < TIMELINE_START_MINUTES || minutes > TIMELINE_END_MINUTES) {
    throw new RangeError("Schedule time falls outside the timeline: " + time);
  }
  return minutes - TIMELINE_START_MINUTES;
}

export function formatBroadcastTime(time) {
  const minutes = timeToMinutes(time);
  if (minutes < 24 * 60) return time;

  const nextDayMinutes = minutes - 24 * 60;
  return `次日 ${String(Math.floor(nextDayMinutes / 60)).padStart(2, "0")}:${String(
    nextDayMinutes % 60,
  ).padStart(2, "0")}`;
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
      const date = addDays(record.premiereDateBeijing, (episode - premiereEpisodeCount) * 7);
      if (!dates.has(date)) continue;
      events.push({
        ...record,
        date,
        episodeStart: episode === premiereEpisodeCount ? 1 : episode,
        episode,
        time: record.beijingTime,
      });
    }
  }

  return events.sort((left, right) =>
    left.time < right.time ? -1 : left.time > right.time ? 1 : left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
}
