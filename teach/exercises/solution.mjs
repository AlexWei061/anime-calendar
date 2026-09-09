// 参考答案。先完成 repair.mjs 的反例与修复，再来比较。
export function calendarDay(date, time) {
  const [hour, minute] = time.split(":").map(Number);
  const day = new Date(date + "T00:00:00Z");
  if (hour * 60 + minute < 300) day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

export function normalizeTitle(value) {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

export function episodeKey(animeId, episode) {
  return animeId + ":" + episode + "-" + episode;
}
