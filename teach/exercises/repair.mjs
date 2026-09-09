// 三个故意植入的教学故障。只编辑本文件；不要为练习修改真实 lib/。
export function calendarDay(date, time) {
  const [hour, minute] = time.split(":").map(Number);
  const day = new Date(date + "T00:00:00Z");
  // TODO 1：检查 05:00 这个右端点。
  if (hour * 60 + minute <= 300) day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

export function normalizeTitle(value) {
  // TODO 2：让全角英文和 ASCII 英文得到相同标准串。
  return value.toLowerCase().replace(/\s+/g, "");
}

export function episodeKey(animeId, episode) {
  // TODO 3：同一番不同集必须有不同键。episode 参数应该参与身份。
  void episode;
  return animeId;
}
