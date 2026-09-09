import { allAnime as catalogAnime, seasons as catalogSeasons } from "../data/anime.js";
import type { Anime, Season } from "./types";

export const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
export const initialSeasonId = "2026-july";
export const initialWeekStart = "2026-07-06";
export const allAnime = catalogAnime as Anime[];
export const seasons = catalogSeasons as Season[];
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
