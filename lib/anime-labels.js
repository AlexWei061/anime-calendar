export function networkBroadcastLabel({ isHistoricalSeason, sourceName, premiereDateBeijing, premiereKind }) {
  if (!premiereDateBeijing) return "首播日期未列出";
  if (premiereKind === "network") return `网络配信首播 · ${premiereDateBeijing}`;
  return `${isHistoricalSeason ? "AniList" : sourceName} 首播 · ${premiereDateBeijing}`;
}
