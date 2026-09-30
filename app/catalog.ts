import { allAnime, seasons } from "../data/catalog-client.js";

export const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
export const initialSeasonId = "2026-october";
export const initialWeekStart = "2026-10-05";
export { allAnime, seasons };
export const seasonIndexByAnimeId = new Map(
  seasons.flatMap((season, seasonIndex) =>
    season.anime.map((record) => [record.id, seasonIndex] as const),
  ),
);
export const seasonLabelByAnimeId = new Map(
  seasons.flatMap((season) =>
    season.anime.map((record) => [record.id, season.label] as const),
  ),
);
