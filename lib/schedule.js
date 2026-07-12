const beijingFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function toBeijingAiring({ premiereDateJst, jstTime }) {
  if (jstTime === null || jstTime === undefined) return null;

  const match = /^(\d+):(\d{2})$/.exec(jstTime);
  if (!match) throw new RangeError(`Invalid JST time: ${jstTime}`);

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isSafeInteger(hour) || minute > 59) {
    throw new RangeError(`Invalid JST time: ${jstTime}`);
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(premiereDateJst);
  if (!dateMatch) throw new RangeError(`Invalid JST date: ${premiereDateJst}`);

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (month < 1 || month > 12) {
    throw new RangeError(`Invalid JST date: ${premiereDateJst}`);
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    throw new RangeError(`Invalid JST date: ${premiereDateJst}`);
  }

  const airingAt = new Date(`${premiereDateJst}T00:00:00+09:00`);
  if (Number.isNaN(airingAt.getTime())) {
    throw new RangeError(`Invalid JST date: ${premiereDateJst}`);
  }
  airingAt.setTime(airingAt.getTime() + (hour * 60 + minute) * 60_000);

  const parts = Object.fromEntries(
    beijingFormatter
      .formatToParts(airingAt)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function groupByBeijingWeekday(records) {
  const byWeekday = {
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  };
  const pending = [];

  for (const record of records) {
    const airing = toBeijingAiring(record);
    if (!airing) {
      pending.push(record);
      continue;
    }
    byWeekday[airing.weekday].push(record);
  }

  for (const bucket of Object.values(byWeekday)) {
    bucket.sort((left, right) =>
      toBeijingAiring(left).time.localeCompare(toBeijingAiring(right).time),
    );
  }

  return { byWeekday, pending };
}
