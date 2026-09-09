export type EpisodeSchedule = {
  episodeStart: number;
  episodeEnd: number;
  broadcastDateBeijing: string;
  beijingTime: string;
  intervalDays: number;
};
export type Anime = {
  id: string;
  titleZh: string;
  titleJa: string;
  coverUrl: string;
  coverAlt: string;
  episodeCount: number;
  premiereDateBeijing: string | null;
  scheduleWeekday: string | null;
  beijingTime: string | null;
  station?: string;
  sourceUrl: string;
  premiereKind?: "network";
  episodeCountStatus?: "estimated" | "exact";
  episodeSchedules?: EpisodeSchedule[];
  scheduleChannel?: string;
};
export type Season = {
  id: string;
  firstWeekStart: string;
  timelineStartHour: number;
  label: string;
  timeZoneLabel: string;
  updatedAt: string;
  catalogCount: number;
  sourceName: string;
  sourceUrl: string;
  anime: Anime[];
};
export type CalendarEvent = Anime & {
  date: string;
  broadcastDate: string;
  broadcastTime: string;
  episodeStart: number;
  episode: number;
  time: string;
};
export type DateOnlyEvent = Anime & { date: string; episodeStart: number; episode: number; };
export type SelectedAnime = Anime & {
  selectedDate?: string;
  selectedTime?: string;
  selectedEpisodeStart?: number;
  selectedEpisode?: number;
  selectedReleaseKind?: "network";
};
export type DetailSelection = Pick<
  SelectedAnime,
  "selectedDate" | "selectedTime" | "selectedEpisodeStart" | "selectedEpisode" | "selectedReleaseKind"
>;
export type WatchedEpisode = { animeId: string; episodeStart: number; episode: number; };
export type AnimeProgress = {
  record: Anime;
  watchedEpisodeCount: number;
  latestWatchedEpisode: number | null;
  status: "not-started" | "in-progress" | "completed";
};
export type ProgressTotals = {
  total: number;
  inProgress: number;
  completed: number;
  notStarted: number;
};
export type BroadcastEvent = Anime & {
  broadcastDate: string;
  broadcastTime: string;
  episodeStart: number;
  episode: number;
  releaseKind: "scheduled" | "network";
};
export type AuthUser = { email: string; displayName: string; avatarUrl: string | null; };
export type AuthDialogMode = "login" | "register" | "change-password";
export type Page = "all" | "mine" | "stats" | "search";
export type StatisticsSection = "today" | "overview";

export type CalendarLocation = { weekStart: string; mobileDate: string; };
export type StatisticsView = { seasonId: string; collapsedSections: StatisticsSection[]; };
