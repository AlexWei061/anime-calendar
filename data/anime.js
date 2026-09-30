import { april2026, january2026 } from "./yuc-history-2026.js";
import { april2025, january2025, july2025, october2025 } from "./yuc-history-2025.js";
import { april2024, january2024, july2024, october2024 } from "./yuc-history-2024.js";
import { april2023, january2023, july2023, october2023 } from "./yuc-history-2023.js";
import { april2022, january2022, july2022, october2022 } from "./yuc-history-2022.js";
import { april2021, january2021, july2021, october2021 } from "./yuc-history-2021.js";
import { april2020, january2020, july2020, october2020 } from "./yuc-history-2020.js";
import { july2026 } from "./yuc-current-202607.js";
import { october2026 } from "./yuc-current-202610.js";

// 2026 年 7 月番与 10 月番是 YUC 当前季目录，由 scripts/generate-yuc-current.mjs 生成
// （含与 AniList／しょぼい合并后的审计字段），本文件只做季度组装。
const { anime: julyAnime, ...julySeason } = july2026;
const { anime: octoberAnimeRecords, ...octoberSeasonMeta } = october2026;

export const season = julySeason;
export const anime = julyAnime;
export const octoberSeason = octoberSeasonMeta;
export const octoberAnime = octoberAnimeRecords;

export const seasons = [
  {
    id: "2020-january",
    firstWeekStart: "2019-12-30",
    timelineStartHour: 5,
    ...january2020,
  },
  {
    id: "2020-april",
    firstWeekStart: "2020-03-30",
    timelineStartHour: 5,
    ...april2020,
  },
  {
    id: "2020-july",
    firstWeekStart: "2020-06-29",
    timelineStartHour: 5,
    ...july2020,
  },
  {
    id: "2020-october",
    firstWeekStart: "2020-09-28",
    timelineStartHour: 5,
    ...october2020,
  },
  {
    id: "2021-january",
    firstWeekStart: "2021-01-04",
    timelineStartHour: 5,
    ...january2021,
  },
  {
    id: "2021-april",
    firstWeekStart: "2021-03-29",
    timelineStartHour: 5,
    ...april2021,
  },
  {
    id: "2021-july",
    firstWeekStart: "2021-06-28",
    timelineStartHour: 5,
    ...july2021,
  },
  {
    id: "2021-october",
    firstWeekStart: "2021-09-27",
    timelineStartHour: 5,
    ...october2021,
  },
  {
    id: "2022-january",
    firstWeekStart: "2022-01-03",
    timelineStartHour: 5,
    ...january2022,
  },
  {
    id: "2022-april",
    firstWeekStart: "2022-03-28",
    timelineStartHour: 5,
    ...april2022,
  },
  {
    id: "2022-july",
    firstWeekStart: "2022-06-27",
    timelineStartHour: 5,
    ...july2022,
  },
  {
    id: "2022-october",
    firstWeekStart: "2022-09-26",
    timelineStartHour: 5,
    ...october2022,
  },
  {
    id: "2023-january",
    firstWeekStart: "2023-01-02",
    timelineStartHour: 5,
    ...january2023,
  },
  {
    id: "2023-april",
    firstWeekStart: "2023-03-27",
    timelineStartHour: 5,
    ...april2023,
  },
  {
    id: "2023-july",
    firstWeekStart: "2023-06-26",
    timelineStartHour: 5,
    ...july2023,
  },
  {
    id: "2023-october",
    firstWeekStart: "2023-09-25",
    timelineStartHour: 5,
    ...october2023,
  },
  {
    id: "2024-january",
    firstWeekStart: "2024-01-01",
    timelineStartHour: 5,
    ...january2024,
  },
  {
    id: "2024-april",
    firstWeekStart: "2024-04-01",
    timelineStartHour: 5,
    ...april2024,
  },
  {
    id: "2024-july",
    firstWeekStart: "2024-07-01",
    timelineStartHour: 5,
    ...july2024,
  },
  {
    id: "2024-october",
    firstWeekStart: "2024-09-30",
    timelineStartHour: 5,
    ...october2024,
  },
  {
    id: "2025-january",
    firstWeekStart: "2024-12-30",
    timelineStartHour: 5,
    ...january2025,
  },
  {
    id: "2025-april",
    firstWeekStart: "2025-03-31",
    timelineStartHour: 5,
    ...april2025,
  },
  {
    id: "2025-july",
    firstWeekStart: "2025-06-30",
    timelineStartHour: 5,
    ...july2025,
  },
  {
    id: "2025-october",
    firstWeekStart: "2025-09-29",
    timelineStartHour: 5,
    ...october2025,
  },
  {
    id: "2026-january",
    firstWeekStart: "2026-01-05",
    timelineStartHour: 5,
    ...january2026,
  },
  {
    id: "2026-april",
    firstWeekStart: "2026-03-30",
    timelineStartHour: 5,
    ...april2026,
  },
  {
    id: "2026-july",
    firstWeekStart: "2026-06-29",
    timelineStartHour: 15,
    ...season,
    anime,
  },
  {
    id: "2026-october",
    firstWeekStart: "2026-09-28",
    timelineStartHour: 5,
    ...octoberSeason,
    anime: octoberAnime,
  },
];

export const allAnime = seasons.flatMap(({ anime: records }) => records);
