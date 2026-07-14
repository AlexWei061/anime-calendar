export function networkBroadcastLabel({ isHistoricalSeason, sourceName, premiereDateBeijing }) {
  if (!premiereDateBeijing) return "首播日期未列出";
  return `${isHistoricalSeason ? "AniList" : sourceName} 首播 · ${premiereDateBeijing}`;
}
