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

export function layoutEventsForDay(events) {
  const blockDurationMinutes = 45;
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

    for (let index = 0; index < record.episodeCount; index += 1) {
      const date = addDays(record.premiereDateBeijing, index * 7);
      if (!dates.has(date)) continue;
      events.push({ ...record, date, episode: index + 1, time: record.beijingTime });
    }
  }

  return events.sort(
    (left, right) => left.time.localeCompare(right.time) || left.titleZh.localeCompare(right.titleZh),
  );
}
