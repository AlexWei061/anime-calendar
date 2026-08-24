"use client";

import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AvatarEditor } from "./avatar-editor";
import { allAnime as catalogAnime, seasons as catalogSeasons } from "../data/anime.js";
import { coverSpriteFor } from "../data/cover-sprites.js";
import { networkBroadcastLabel } from "../lib/anime-labels.js";
import { matchesAnimeTitle } from "../lib/anime-search.js";
import {
  episodeViewKey,
  episodeViewUnitsForAnime,
  episodeViewUnitsForRange,
  isEpisodeViewWatched,
  updateEpisodeViews,
} from "../lib/anime-episode-views.js";
import {
  broadcastsForDate,
  progressForAnime,
  progressTotals,
  sortProgressBySeasonThenWatchedEpisodes,
} from "../lib/anime-statistics.js";
import {
  addDays,
  calendarDateForDateTime,
  dateOnlyEventsForWeek,
  eventsForWeek,
  firstFullWeekStart,
  formatBroadcastTime,
  formatEpisodeLabel,
  groupEventsByTime,
  layoutTimelineEvents,
  seasonForWeek,
  startOfWeek,
  timelineBoundsForEvents,
  timelineMarkerForDateTime,
  timelineOffsetMinutes,
  weekDays,
} from "../lib/calendar.js";

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const initialSeasonId = "2026-july";
const initialWeekStart = "2026-07-06";

type EpisodeSchedule = {
  episodeStart: number;
  episodeEnd: number;
  broadcastDateBeijing: string;
  beijingTime: string;
  intervalDays: number;
};
type Anime = {
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
type Season = {
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
const allAnime = catalogAnime as Anime[];
const seasons = catalogSeasons as Season[];
type CalendarEvent = Anime & {
  date: string;
  broadcastDate: string;
  broadcastTime: string;
  episodeStart: number;
  episode: number;
  time: string;
};
type DateOnlyEvent = Anime & { date: string; episodeStart: number; episode: number };
type SelectedAnime = Anime & {
  selectedDate?: string;
  selectedTime?: string;
  selectedEpisodeStart?: number;
  selectedEpisode?: number;
  selectedReleaseKind?: "network";
};
type DetailSelection = Pick<
  SelectedAnime,
  "selectedDate" | "selectedTime" | "selectedEpisodeStart" | "selectedEpisode" | "selectedReleaseKind"
>;
type WatchedEpisode = { animeId: string; episodeStart: number; episode: number };
type AnimeProgress = {
  record: Anime;
  watchedEpisodeCount: number;
  latestWatchedEpisode: number | null;
  status: "not-started" | "in-progress" | "completed";
};
type ProgressTotals = {
  total: number;
  inProgress: number;
  completed: number;
  notStarted: number;
};
type BroadcastEvent = Anime & {
  broadcastDate: string;
  broadcastTime: string;
  episodeStart: number;
  episode: number;
  releaseKind: "scheduled" | "network";
};
type AuthUser = { email: string; displayName: string; avatarUrl: string | null };
type AuthDialogMode = "login" | "register" | "change-password";
type Page = "all" | "mine" | "stats" | "search";
type StatisticsSection = "today" | "overview";

const seasonIndexByAnimeId = new Map(
  seasons.flatMap((season, seasonIndex) =>
    season.anime.map((record) => [record.id, seasonIndex] as const),
  ),
);
const seasonLabelByAnimeId = new Map(
  seasons.flatMap((season) =>
    season.anime.map((record) => [record.id, season.label] as const),
  ),
);

function CoverArt({
  anime,
  className,
  decorative = false,
  variant = "thumbnail",
}: {
  anime: Anime;
  className: string;
  decorative?: boolean;
  variant?: "thumbnail" | "detail";
}) {
  const sprite = coverSpriteFor(anime.coverUrl, variant);
  if (!sprite) return null;

  const style = {
    backgroundImage: `url(${sprite.url})`,
    backgroundSize: `${sprite.columns * 100}% ${sprite.rows * 100}%`,
    backgroundPosition: `${sprite.columns === 1 ? 0 : (sprite.x / (sprite.columns - 1)) * 100}% ${
      sprite.rows === 1 ? 0 : (sprite.y / (sprite.rows - 1)) * 100
    }%`,
  } as CSSProperties;

  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : anime.coverAlt}
      className={className + " cover-sprite"}
      role={decorative ? undefined : "img"}
      style={style}
    />
  );
}

const beijingDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getBeijingDateTime() {
  const parts = Object.fromEntries(
    beijingDateTimeFormatter
      .formatToParts(new Date())
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function getServerBeijingDateTime() {
  return null;
}

function subscribeToBeijingDate(onStoreChange: () => void) {
  const interval = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(interval);
}

// 主题保存在 <html data-theme>（由 layout 内联脚本在首屏前写入），这里用
// useSyncExternalStore 订阅它；applyTheme 是唯一写入口，负责持久化并通知订阅者。
type ThemeName = "light" | "dark";

const themeListeners = new Set<() => void>();

function getThemeSnapshot(): ThemeName {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerThemeSnapshot(): ThemeName {
  return "light";
}

function subscribeToTheme(onStoreChange: () => void) {
  themeListeners.add(onStoreChange);
  return () => {
    themeListeners.delete(onStoreChange);
  };
}

function applyTheme(nextTheme: ThemeName, persist: boolean) {
  if (persist) {
    try {
      localStorage.setItem("ac-theme", nextTheme);
    } catch {
      // 存储失败时仅本次会话生效。
    }
  }
  document.documentElement.dataset.theme = nextTheme;
  for (const listener of themeListeners) listener();
}

function shortDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return Number(month) + "月" + Number(day) + "日";
}

function longDate(isoDate: string) {
  const [year] = isoDate.split("-");
  return year + "年" + shortDate(isoDate);
}

function compactDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return Number(month) + "/" + Number(day);
}

function weekLabel(dates: string[]) {
  const [firstDate] = dates;
  const lastDate = dates[dates.length - 1];
  return (
    longDate(firstDate) +
    " — " +
    (firstDate.slice(0, 4) === lastDate.slice(0, 4) ? shortDate(lastDate) : longDate(lastDate))
  );
}

function progressStatusLabel(status: string) {
  if (status === "completed") return "已看完";
  if (status === "in-progress") return "在追";
  return "未开始";
}

export default function Home() {
  const [activePage, setActivePage] = useState<Page>("all");
  const [animeQuery, setAnimeQuery] = useState("");
  const [selected, setSelected] = useState<SelectedAnime | null>(null);
  const [selectedAnimeIds, setSelectedAnimeIds] = useState<string[] | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<WatchedEpisode[] | null>(null);
  const [watchedEpisodeError, setWatchedEpisodeError] = useState<string | null>(null);
  const [savingEpisodeKeys, setSavingEpisodeKeys] = useState<string[]>([]);
  const [selectedOverallSeasonId, setSelectedOverallSeasonId] = useState("");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState<AuthDialogMode | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [isAccountCardOpen, setIsAccountCardOpen] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [collapsedStatisticsSections, setCollapsedStatisticsSections] = useState<StatisticsSection[]>([]);
  const [activeWeekStart, setActiveWeekStart] = useState(initialWeekStart);
  const [activeMobileDate, setActiveMobileDate] = useState(initialWeekStart);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const authDialogRef = useRef<HTMLDialogElement>(null);
  const authOpenerRef = useRef<HTMLButtonElement | null>(null);
  const accountAreaRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const didSetInitialWeek = useRef(false);
  const weeklySectionRef = useRef<HTMLElement>(null);
  const currentBeijingDateTime = useSyncExternalStore<string | null>(
    subscribeToBeijingDate,
    getBeijingDateTime,
    getServerBeijingDateTime,
  );
  const currentBeijingDate = currentBeijingDateTime?.slice(0, 10) ?? null;
  const currentBeijingTime = currentBeijingDateTime?.slice(11) ?? null;
  const currentCalendarDate =
    currentBeijingDate && currentBeijingTime
      ? calendarDateForDateTime(currentBeijingDate, currentBeijingTime)
      : currentBeijingDate;
  const theme = useSyncExternalStore<ThemeName>(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const activeSeason = seasonForWeek(seasons, activeWeekStart) as Season;
  const seasonalHeroAnime = activeSeason.anime.slice(0, 4);
  const isHistoricalSeason = activeSeason.id !== initialSeasonId;
  const defaultTimelineStartMinutes = 5 * 60;
  const defaultTimelineEndMinutes = 29 * 60;
  const dates = weekDays(activeWeekStart);
  const calendarAnime =
    activePage === "mine"
      ? allAnime.filter((record) => selectedAnimeIds?.includes(record.id))
      : allAnime;
  const hasAnimeQuery = animeQuery.trim().length > 0;
  const searchResults = allAnime.filter((record) => matchesAnimeTitle(record, animeQuery));
  const searchProgress = progressForAnime(searchResults, watchedEpisodes ?? []) as AnimeProgress[];
  const searchProgressByAnimeId = new Map(
    searchProgress.map((progress) => [progress.record.id, progress]),
  );
  const selectionLoadError = selectionError ?? (
    !currentUser && activePage !== "all" ? "登录后可同步你的追番列表。" : null
  );
  const searchProgressError = selectionLoadError ?? watchedEpisodeError;
  const isSearchProgressLoading =
    (selectedAnimeIds === null || watchedEpisodes === null) && !searchProgressError;
  const selectedAnime = allAnime.filter((record) => selectedAnimeIds?.includes(record.id));
  const selectedSeasonAnime = activeSeason.anime.filter((record) => selectedAnimeIds?.includes(record.id));
  const allProgress = progressForAnime(selectedAnime, watchedEpisodes ?? []) as AnimeProgress[];
  const overallProgress = sortProgressBySeasonThenWatchedEpisodes(
    allProgress,
    seasonIndexByAnimeId,
  ) as AnimeProgress[];
  const isPersonalProgressLoading = selectedAnimeIds === null || watchedEpisodes === null;
  const personalWatchedEpisodeCount = overallProgress.reduce(
    (total, progress) => total + progress.watchedEpisodeCount,
    0,
  );
  const personalEpisodeCount = overallProgress.reduce(
    (total, progress) => total + progress.record.episodeCount,
    0,
  );
  const personalProgressLabel = personalEpisodeCount
    ? `已看 ${personalWatchedEpisodeCount} / ${personalEpisodeCount} 集`
    : "还没有追番记录";
  const overallProgressBySeason = seasons
    .map((season, seasonIndex) => ({
      season,
      progress: overallProgress.filter(
        (progress) => seasonIndexByAnimeId.get(progress.record.id) === seasonIndex,
      ),
    }))
    .filter(({ progress }) => progress.length)
    .reverse();
  const selectedOverallSeason = seasons.find(({ id }) => id === selectedOverallSeasonId);
  const displayedOverallProgress = selectedOverallSeason
    ? overallProgressBySeason.find(({ season }) => season.id === selectedOverallSeason.id)?.progress ?? []
    : overallProgress;
  const displayedOverallProgressBySeason = overallProgressBySeason;
  const displayedOverallProgressTotals = progressTotals(displayedOverallProgress) as ProgressTotals;
  const todayBroadcasts = (currentBeijingDate
    ? broadcastsForDate(selectedAnime, currentBeijingDate)
    : []) as BroadcastEvent[];
  const events = eventsForWeek(calendarAnime, activeWeekStart) as CalendarEvent[];
  const dateOnlyEvents = dateOnlyEventsForWeek(
    calendarAnime,
    activeWeekStart,
  ) as DateOnlyEvent[];
  const { startMinutes: timelineStartMinutes, endMinutes: timelineEndMinutes } =
    timelineBoundsForEvents(events, defaultTimelineStartMinutes, defaultTimelineEndMinutes);
  const timelineHourCount = (timelineEndMinutes - timelineStartMinutes) / 60;
  const timelineEndHour = timelineEndMinutes / 60;
  const timelineHours = Array.from(
    { length: timelineHourCount + 1 },
    (_, index) => timelineStartMinutes / 60 + index,
  );
  const timelineStyle = {
    "--timeline-hour-count": String(timelineHourCount),
    "--timeline-height": timelineHourCount * 96 + 40 + "px",
  } as CSSProperties;
  const mappedCurrentTimelineMarker =
    currentBeijingDate && currentBeijingTime
      ? timelineMarkerForDateTime(
          currentBeijingDate,
          currentBeijingTime,
          timelineStartMinutes,
          timelineEndMinutes,
        )
      : null;
  const currentTimelineMarker =
    mappedCurrentTimelineMarker && dates.includes(mappedCurrentTimelineMarker.date)
      ? mappedCurrentTimelineMarker
      : null;
  const currentTimelineMarkerStyle = currentTimelineMarker
    ? ({ "--timeline-current-time-top": currentTimelineMarker.offsetMinutes * 1.6 + "px" } as CSSProperties)
    : undefined;
  const dayEventGroups = dates.map((date) =>
    groupEventsByTime(events.filter((event) => event.date === date)),
  );
  const dayDateOnlyEvents = dates.map((date) => dateOnlyEvents.filter((event) => event.date === date));
  const activeMobileEventGroups = dayEventGroups[dates.indexOf(activeMobileDate)] ?? [];
  const activeMobileDateOnlyEvents = dayDateOnlyEvents[dates.indexOf(activeMobileDate)] ?? [];
  const networkOnly = (activePage === "mine" ? selectedSeasonAnime : activeSeason.anime).filter(
    ({ scheduleWeekday, beijingTime }) => !scheduleWeekday || !beijingTime,
  );
  const selectedBroadcastTime =
    selected?.selectedReleaseKind === "network"
      ? undefined
      : selected
        ? selected.selectedTime ?? selected.beijingTime
        : undefined;
  const selectedProgress = selected
    ? (progressForAnime([selected], watchedEpisodes ?? [])[0] as AnimeProgress | undefined)
    : null;
  const selectedEpisodeUnits = selected ? episodeViewUnitsForAnime(selected) : [];

  useEffect(() => {
    if (!currentCalendarDate || didSetInitialWeek.current) return;

    didSetInitialWeek.current = true;
    setActiveWeekStart(startOfWeek(currentCalendarDate));
    setActiveMobileDate(currentCalendarDate);
  }, [currentCalendarDate]);

  // 与 layout 内联脚本共同维护 <html data-theme>：脚本负责首屏前定主题，
  // 用户未手动选择时这里继续跟随系统主题变化。
  useEffect(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystemTheme = () => {
      try {
        if (localStorage.getItem("ac-theme")) return;
      } catch {
        // localStorage 不可用时按未手动选择处理。
      }
      applyTheme(systemTheme.matches ? "dark" : "light", false);
    };

    systemTheme.addEventListener("change", followSystemTheme);
    return () => systemTheme.removeEventListener("change", followSystemTheme);
  }, []);

  const toggleTheme = () => {
    applyTheme(theme === "dark" ? "light" : "dark", true);
  };

  useEffect(() => {
    if (selected && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [selected]);

  useEffect(() => {
    if (authDialogMode && authDialogRef.current && !authDialogRef.current.open) {
      authDialogRef.current.showModal();
    }
  }, [authDialogMode]);

  useEffect(() => {
    if (!isAccountCardOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountAreaRef.current?.contains(event.target as Node)) {
        setIsAccountCardOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.querySelector<HTMLDialogElement>(".avatar-crop-dialog")?.open) return;
        setIsAccountCardOpen(false);
        accountTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountCardOpen]);

  useEffect(() => {
    let cancelled = false;
    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;
        const payload = (await response.json()) as {
          email?: unknown;
          displayName?: unknown;
          avatarUrl?: unknown;
        };
        if (
          typeof payload.email === "string" &&
          typeof payload.displayName === "string" &&
          (typeof payload.avatarUrl === "string" || payload.avatarUrl === null) &&
          !cancelled
        ) {
          setCurrentUser({
            email: payload.email,
            displayName: payload.displayName,
            avatarUrl: payload.avatarUrl,
          });
        }
      } catch {
        // 未登录或网络错误都按未登录处理。
      } finally {
        if (!cancelled) setAuthLoaded(true);
      }
    }

    void loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncPageFromUrl = () => {
      const page = new URLSearchParams(window.location.search).get("page");
      setActivePage(page === "mine" || page === "stats" || page === "search" ? page : "all");
    };

    syncPageFromUrl();
    window.addEventListener("popstate", syncPageFromUrl);
    return () => window.removeEventListener("popstate", syncPageFromUrl);
  }, []);

  useEffect(() => {
    if (selectedAnimeIds !== null) return;
    if (!currentUser) {
      return;
    }

    let cancelled = false;
    async function loadAnimeSelections() {
      try {
        const response = await fetch("/api/anime-selections");
        if (response.status === 401) {
          if (!cancelled) setSelectionError("登录后可同步你的追番列表。");
          return;
        }
        if (!response.ok) throw new Error("Unable to load anime selections");

        const payload = (await response.json()) as { animeIds?: unknown };
        if (!Array.isArray(payload.animeIds) || payload.animeIds.some((id) => typeof id !== "string")) {
          throw new Error("Invalid anime selections");
        }
        if (!cancelled) setSelectedAnimeIds(payload.animeIds);
      } catch {
        if (!cancelled) setSelectionError("无法读取你的追番列表。请稍后重试。");
      }
    }

    void loadAnimeSelections();
    return () => {
      cancelled = true;
    };
  }, [activePage, selectedAnimeIds, currentUser]);

  useEffect(() => {
    let cancelled = false;
    async function loadWatchedEpisodes() {
      try {
        const response = await fetch("/api/anime-episode-views");
        if (response.status === 401) {
          if (!cancelled) setWatchedEpisodeError("登录后可同步你的已看记录。");
          return;
        }
        if (!response.ok) throw new Error("Unable to load watched episodes");

        const payload = (await response.json()) as { watchedEpisodes?: unknown };
        if (
          !Array.isArray(payload.watchedEpisodes) ||
          payload.watchedEpisodes.some(
            (watchedEpisode) =>
              !watchedEpisode ||
              typeof watchedEpisode !== "object" ||
              typeof watchedEpisode.animeId !== "string" ||
              !Number.isInteger(watchedEpisode.episodeStart) ||
              !Number.isInteger(watchedEpisode.episode),
          )
        ) {
          throw new Error("Invalid watched episodes");
        }
        if (!cancelled) setWatchedEpisodes(payload.watchedEpisodes as WatchedEpisode[]);
      } catch {
        if (!cancelled) setWatchedEpisodeError("无法读取已看记录。请稍后重试。");
      }
    }

    void loadWatchedEpisodes();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const changePage = (page: Page) => {
    if (page === activePage) return;

    const url = new URL(window.location.href);
    if (page === "mine" || page === "stats" || page === "search") {
      url.searchParams.set("page", page);
    } else {
      url.searchParams.delete("page");
    }
    window.history.pushState(null, "", url);
    setActivePage(page);
  };

  const submitPageSearch = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    const query = String(
      new FormData(submitEvent.currentTarget).get("pageSearch") ?? "",
    ).trim();
    if (!query) return;
    setAnimeQuery(query);
    changePage("search");
  };

  const changeWeek = (days: number) => {
    const nextWeekStart = addDays(activeWeekStart, days);
    setActiveWeekStart(nextWeekStart);
    setActiveMobileDate(nextWeekStart);
  };

  const changeSeason = (nextSeasonId: string) => {
    const nextSeason = seasons.find(({ id }) => id === nextSeasonId);
    if (!nextSeason) return;

    const nextWeekStart = firstFullWeekStart(nextSeason);
    setActiveWeekStart(nextWeekStart);
    setActiveMobileDate(nextWeekStart);
  };

  const returnToCurrentWeek = () => {
    const date = !isHistoricalSeason
      ? currentCalendarDate ?? initialWeekStart
      : firstFullWeekStart(activeSeason);
    setActiveWeekStart(startOfWeek(date));
    setActiveMobileDate(date);
  };

  const scrollToWeeklySchedule = () => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    weeklySectionRef.current?.scrollIntoView({ behavior, block: "start" });
  };

  const jumpToTodaySchedule = () => {
    const date = currentCalendarDate ?? activeWeekStart;
    setActiveWeekStart(startOfWeek(date));
    setActiveMobileDate(date);
    window.requestAnimationFrame(scrollToWeeklySchedule);
  };

  const toggleAnimeSelection = async (animeId: string) => {
    if (!selectedAnimeIds || isSavingSelection) return;

    const previousAnimeIds = selectedAnimeIds;
    const nextAnimeIds = selectedAnimeIds.includes(animeId)
      ? selectedAnimeIds.filter((id) => id !== animeId)
      : [...selectedAnimeIds, animeId];

    setSelectedAnimeIds(nextAnimeIds);
    setSelectionError(null);
    setIsSavingSelection(true);
    try {
      const response = await fetch("/api/anime-selections", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ animeIds: nextAnimeIds }),
      });
      if (!response.ok) throw new Error("Unable to save anime selections");
    } catch {
      setSelectedAnimeIds(previousAnimeIds);
      setSelectionError("保存失败，请重试。");
    } finally {
      setIsSavingSelection(false);
    }
  };

  const toggleEpisodeView = async (watchedEpisode: WatchedEpisode) => {
    if (watchedEpisodes === null) return;

    const episodeViews = episodeViewUnitsForRange(watchedEpisode).map((unit) => ({
      animeId: watchedEpisode.animeId,
      ...unit,
    }));
    const keys = episodeViews.map(episodeViewKey);
    if (keys.some((key) => savingEpisodeKeys.includes(key))) return;

    const isWatched = isEpisodeViewWatched(watchedEpisodes, watchedEpisode);
    const nextWatchedEpisodes = updateEpisodeViews(watchedEpisodes, watchedEpisode, !isWatched);

    setWatchedEpisodes(nextWatchedEpisodes);
    setWatchedEpisodeError(null);
    setSavingEpisodeKeys((currentKeys) => [...new Set([...currentKeys, ...keys])]);
    try {
      const response = await fetch("/api/anime-episode-views", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ watchedEpisodes: episodeViews, watched: !isWatched }),
      });
      if (!response.ok) throw new Error("Unable to save watched episode");
    } catch {
      setWatchedEpisodes((current) => {
        if (current === null) return null;
        return updateEpisodeViews(current, watchedEpisode, isWatched);
      });
      setWatchedEpisodeError("保存已看状态失败，请重试。");
    } finally {
      setSavingEpisodeKeys((currentKeys) => currentKeys.filter((key) => !keys.includes(key)));
    }
  };

  const openAuthDialog = (mode: AuthDialogMode, opener: HTMLButtonElement) => {
    authOpenerRef.current = opener;
    setAuthError(null);
    setAccountNotice(null);
    setAuthDialogMode(mode);
  };

  const handleAuthDialogClose = () => {
    setAuthDialogMode(null);
    setAuthError(null);
    if (authOpenerRef.current?.isConnected) authOpenerRef.current.focus();
  };

  const openPasswordChangeFromAccount = () => {
    if (!accountTriggerRef.current) return;
    setIsAccountCardOpen(false);
    openAuthDialog("change-password", accountTriggerRef.current);
  };

  const submitAuth = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (isSubmittingAuth || !authDialogMode || authDialogMode === "change-password") return;

    const form = new FormData(submitEvent.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "");

    setIsSubmittingAuth(true);
    setAuthError(null);
    try {
      const response = await fetch(`/api/auth/${authDialogMode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          authDialogMode === "register" ? { email, password, displayName } : { email, password },
        ),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        email?: unknown;
        displayName?: unknown;
        avatarUrl?: unknown;
        error?: unknown;
      };
      if (
        !response.ok ||
        typeof payload.email !== "string" ||
        typeof payload.displayName !== "string" ||
        (typeof payload.avatarUrl !== "string" && payload.avatarUrl !== null)
      ) {
        setAuthError(typeof payload.error === "string" ? payload.error : "操作失败，请重试。");
        return;
      }
      setCurrentUser({
        email: payload.email,
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
      });
      setSelectionError(null);
      setWatchedEpisodeError(null);
      setAccountError(null);
      setAccountNotice(null);
      authDialogRef.current?.close();
    } catch {
      setAuthError("网络错误，请重试。");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const submitPasswordChange = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    if (isSubmittingAuth || authDialogMode !== "change-password") return;

    const form = new FormData(submitEvent.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setAuthError("两次输入的新密码不一致。");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok) {
        setAuthError(typeof payload.error === "string" ? payload.error : "修改失败，请重试。");
        return;
      }

      authDialogRef.current?.close();
      setCurrentUser(null);
      setIsAccountCardOpen(false);
      setSelectedAnimeIds(null);
      setWatchedEpisodes(null);
      setSelectionError(null);
      setWatchedEpisodeError(null);
      setAccountError(null);
      setAccountNotice("密码已修改，请使用新密码重新登录。");
    } catch {
      setAuthError("网络错误，请重试。");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const signOut = async () => {
    setAccountError(null);
    setAccountNotice(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out");
    } catch {
      setAccountError("退出失败，请重试。");
      return;
    }
    setCurrentUser(null);
    setIsAccountCardOpen(false);
    setSelectedAnimeIds(null);
    setWatchedEpisodes(null);
    setSelectionError(null);
    setWatchedEpisodeError(null);
  };

  const deleteAvatar = async () => {
    if (!currentUser?.avatarUrl || !window.confirm("删除头像并恢复默认头像？")) return;
    setAccountError(null);
    try {
      const response = await fetch("/api/auth/avatar", { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete avatar");
      setCurrentUser({ ...currentUser, avatarUrl: null });
    } catch {
      setAccountError("删除头像失败，请重试。");
    }
  };

  const openDetail = (
    record: Anime,
    opener: HTMLButtonElement,
    selection: DetailSelection = {},
  ) => {
    openerRef.current = opener;
    setSelected({ ...record, ...selection });
  };

  const isStatisticsSectionCollapsed = (section: StatisticsSection) =>
    collapsedStatisticsSections.includes(section);
  const signInPromptButton =
    !currentUser && authLoaded ? (
      <button
        className="sign-in-prompt-button"
        type="button"
        aria-haspopup="dialog"
        onClick={(clickEvent) => openAuthDialog("login", clickEvent.currentTarget)}
      >
        登录 / 注册
      </button>
    ) : null;
  const toggleStatisticsSection = (section: StatisticsSection) => {
    setCollapsedStatisticsSections((sections) =>
      sections.includes(section)
        ? sections.filter((candidate) => candidate !== section)
        : [...sections, section],
    );
  };
  const statisticsAnimeCard = (
    record: Anime,
    description: string,
    status?: string,
    selection: DetailSelection = {},
    watchedEpisodeCount?: number,
  ) => (
    <button
      className="statistics-anime-card"
      type="button"
      aria-haspopup="dialog"
      aria-label={`查看《${record.titleZh}／${record.titleJa}》详情`}
      onClick={(clickEvent) => openDetail(record, clickEvent.currentTarget, selection)}
    >
      <CoverArt anime={record} className="statistics-anime-card-cover" decorative />
      <span className="statistics-anime-card-content">
        <strong>{record.titleZh}</strong>
        <small>{record.titleJa}</small>
        <em>{description}</em>
        {watchedEpisodeCount !== undefined ? (
          <span className="statistics-anime-card-progress" aria-hidden="true">
            <span style={{ width: `${(watchedEpisodeCount / record.episodeCount) * 100}%` }} />
          </span>
        ) : null}
      </span>
      {status ? <span className="statistics-anime-card-status">{status}</span> : null}
    </button>
  );

  const handleDialogClose = () => {
    setSelected(null);
    openerRef.current?.focus();
  };

  const eventButton = (event: CalendarEvent, layout?: { lane: number; laneCount: number }) => {
    const isToday = event.date === currentCalendarDate;
    const displayTime = formatBroadcastTime(event.time);
    const episodeLabel = formatEpisodeLabel(event.episodeStart, event.episode);
    const watchedEpisode = {
      animeId: event.id,
      episodeStart: event.episodeStart,
      episode: event.episode,
    };
    const watchedEpisodeKeys = episodeViewUnitsForRange(watchedEpisode).map((unit) =>
      episodeViewKey({ animeId: watchedEpisode.animeId, ...unit }),
    );
    const isWatched = watchedEpisodes ? isEpisodeViewWatched(watchedEpisodes, watchedEpisode) : false;
    const isSavingWatch = watchedEpisodeKeys.some((key) => savingEpisodeKeys.includes(key));
    const eventStyle = layout
      ? ({
          "--event-top": timelineOffsetMinutes(event.time, timelineStartMinutes, timelineEndMinutes) * 1.6 + "px",
          "--event-left": (layout.lane / layout.laneCount) * 100 + "%",
          "--event-width": 100 / layout.laneCount + "%",
        } as CSSProperties)
      : undefined;

    return (
      <div
        className={
          "calendar-event" +
          (layout ? " timeline-event" : "") +
          (layout && layout.laneCount > 1 ? " timeline-event-compact" : "") +
          (isToday ? " is-today" : "") +
          (isWatched ? " is-watched" : "")
        }
        key={event.id + "-" + event.episodeStart + "-" + event.episode}
        style={eventStyle}
      >
        <button
          className="calendar-event-detail"
          type="button"
          aria-haspopup="dialog"
          aria-label={
            "查看《" +
            event.titleZh +
            "／" +
            event.titleJa +
            "》" +
            episodeLabel +
            "详情：" +
            event.date +
            " " +
            displayTime
          }
          onClick={(clickEvent) =>
            openDetail(event, clickEvent.currentTarget, {
              selectedDate: event.broadcastDate,
              selectedTime: event.broadcastTime,
              selectedEpisodeStart: event.episodeStart,
              selectedEpisode: event.episode,
            })
          }
        >
          <CoverArt anime={event} className="calendar-event-cover" decorative />
          <span className="calendar-event-content">
            <strong title={event.titleZh}>{event.titleZh}</strong>
            <span className="calendar-event-episode">{episodeLabel}</span>
          </span>
        </button>
        <button
          className="episode-watch-toggle"
          type="button"
          aria-pressed={isWatched}
          aria-label={
            (isWatched ? "取消标记《" : "标记《") + event.titleZh + "》" + episodeLabel + "已看"
          }
          disabled={watchedEpisodes === null || isSavingWatch}
          onClick={() => void toggleEpisodeView(watchedEpisode)}
        >
          {isWatched ? "✓" : null}
        </button>
      </div>
    );
  };

  const dateOnlyEventButton = (event: DateOnlyEvent) => {
    const episodeLabel = formatEpisodeLabel(event.episodeStart, event.episode);

    return <button
      className="date-only-event"
      key={event.id}
      type="button"
      aria-haspopup="dialog"
      aria-label={`查看《${event.titleZh}／${event.titleJa}》网络配信首播 ${episodeLabel}：${event.date}`}
      onClick={(clickEvent) =>
        openDetail(event, clickEvent.currentTarget, {
          selectedDate: event.date,
          selectedEpisodeStart: event.episodeStart,
          selectedEpisode: event.episode,
          selectedReleaseKind: "network",
        })
      }
    >
      <strong>{event.titleZh}</strong>
      <span>网络配信 · {episodeLabel} · 时刻未定</span>
    </button>;
  };

  return (
    <div className="site-shell">
      <nav className="page-sidebar" aria-label="页面导航">
        <p className="site-name">番时表</p>
        <button
          className={activePage === "all" ? "is-active" : ""}
          type="button"
          aria-current={activePage === "all" ? "page" : undefined}
          onClick={() => changePage("all")}
        >
          播出表
        </button>
        <button
          className={activePage === "mine" ? "is-active" : ""}
          type="button"
          aria-current={activePage === "mine" ? "page" : undefined}
          onClick={() => changePage("mine")}
        >
          我的番剧{selectedAnimeIds ? " · " + selectedAnimeIds.length + " 部" : ""}
        </button>
        <button
          className={activePage === "stats" ? "is-active" : ""}
          type="button"
          aria-current={activePage === "stats" ? "page" : undefined}
          onClick={() => changePage("stats")}
        >
          追番统计
        </button>
        <div className="account-area" ref={accountAreaRef}>
          {currentUser ? (
            <>
              <button
                className="account-trigger"
                ref={accountTriggerRef}
                type="button"
                aria-expanded={isAccountCardOpen}
                aria-controls="account-card"
                onClick={() => setIsAccountCardOpen((isOpen) => !isOpen)}
              >
                <span>{currentUser.displayName}</span>
                <span className="account-trigger-chevron" aria-hidden="true">⌄</span>
              </button>
              {isAccountCardOpen ? (
                <div className="account-card" id="account-card" role="group" aria-label="账号操作">
                  <div className="account-profile">
                    <AvatarEditor
                      displayName={currentUser.displayName}
                      avatarUrl={currentUser.avatarUrl}
                      onAvatarChange={(avatarUrl) => {
                        setCurrentUser({ ...currentUser, avatarUrl });
                        setAccountError(null);
                      }}
                      onError={setAccountError}
                    />
                    <span className="account-identity">
                      <strong>{currentUser.displayName}</strong>
                      <span className="account-email" title={currentUser.email}>
                        {currentUser.email}
                      </span>
                    </span>
                  </div>
                  <span className="account-card-divider" aria-hidden="true" />
                  {currentUser.avatarUrl ? (
                    <button
                      className="account-card-action account-card-action-danger"
                      type="button"
                      onClick={() => void deleteAvatar()}
                    >
                      <span className="account-action-icon" aria-hidden="true">⌫</span>
                      <span>删除头像</span>
                    </button>
                  ) : null}
                  <button className="account-card-action" type="button" onClick={openPasswordChangeFromAccount}>
                    <span className="account-action-icon" aria-hidden="true">✎</span>
                    修改密码
                  </button>
                  <button
                    className="account-card-action account-card-action-danger"
                    type="button"
                    onClick={() => void signOut()}
                  >
                    <span className="account-action-icon" aria-hidden="true">↪</span>
                    退出登录
                  </button>
                  {accountError ? <span className="account-card-error" role="alert">{accountError}</span> : null}
                </div>
              ) : null}
            </>
          ) : authLoaded ? (
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={(clickEvent) => openAuthDialog("login", clickEvent.currentTarget)}
            >
              登录 / 注册
            </button>
          ) : null}
          {!currentUser && accountError ? <span role="alert">{accountError}</span> : null}
          {accountNotice ? <span className="account-notice" role="status">{accountNotice}</span> : null}
        </div>
      </nav>
      <main className="calendar-page">
      {activePage === "all" ? (
        <section className="seasonal-hero" aria-labelledby="seasonal-hero-heading">
          <div className="seasonal-hero-copy">
            <p className="season-kicker">{activeSeason.label}</p>
            <h1 id="seasonal-hero-heading">这季有什么值得追？</h1>
            <p className="intro">共 {activeSeason.catalogCount} 部番剧，按北京时间追踪每一集的播出时间。</p>
            <div className="seasonal-hero-actions">
              <button type="button" onClick={scrollToWeeklySchedule}>查看本周放送</button>
              <label className="season-picker">
                选择季度
                <select value={activeSeason.id} onChange={(event) => changeSeason(event.target.value)}>
                  {seasons.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <a className="source-link" href={activeSeason.sourceUrl} target="_blank" rel="noreferrer">
              {activeSeason.sourceName} <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="seasonal-hero-covers" aria-hidden="true">
            {seasonalHeroAnime.map((record) => (
              <CoverArt anime={record} className="seasonal-hero-cover" decorative key={record.id} />
            ))}
          </div>
          <div className="seasonal-hero-shortcuts">
            <button type="button" onClick={jumpToTodaySchedule}>
              <strong>今天看什么</strong><span>定位到今天的放送安排</span>
            </button>
            <button type="button" onClick={() => changePage("mine")}>
              <strong>我的追番</strong><span>登录后继续查看已收藏作品</span>
            </button>
            <form className="page-search" role="search" aria-label="查询番剧" onSubmit={submitPageSearch}>
              <label className="page-search-field">查询番剧<input name="pageSearch" type="search" placeholder="输入中文或日文名" /></label>
              <button type="submit">查询</button>
            </form>
          </div>
        </section>
      ) : activePage === "search" ? (
        <header className="calendar-header">
          <div>
            <p className="season-kicker">
              全部目录
            </p>
            <h1>
              查询番剧
            </h1>
            <p className="intro">
              搜索本应用已收录的全部番剧，支持中文和日文标题。
            </p>
          </div>
        </header>
      ) : null}

      {activePage === "stats" ? (
        <section className="personal-hero personal-hero-stats" aria-labelledby="stats-hero-heading">
          <div className="personal-hero-copy">
            <p className="season-kicker">追番档案</p>
            <h1 id="stats-hero-heading">这一路追到哪了？</h1>
            <p className="intro">把看过的、正在追的和还没开始的作品放进同一张档案里。</p>
          </div>
          <dl className="personal-hero-metrics" aria-label="追番档案概览">
            <div>
              <dt>正在追</dt>
              <dd>{isPersonalProgressLoading ? "读取中" : `${displayedOverallProgressTotals.inProgress} 部`}</dd>
            </div>
            <div>
              <dt>已补完</dt>
              <dd>{isPersonalProgressLoading ? "读取中" : `${displayedOverallProgressTotals.completed} 部`}</dd>
            </div>
            <div>
              <dt>还没开始</dt>
              <dd>{isPersonalProgressLoading ? "读取中" : `${displayedOverallProgressTotals.notStarted} 部`}</dd>
            </div>
          </dl>
          <form className="page-search" role="search" aria-label="查询番剧" onSubmit={submitPageSearch}>
            <label className="page-search-field">查询番剧<input name="pageSearch" type="search" placeholder="输入中文或日文名" /></label>
            <button type="submit">查询</button>
          </form>
        </section>
      ) : null}

      {activePage === "stats" ? (
        <section className="statistics-page" aria-label="我的追番统计">
          {selectedAnimeIds === null || watchedEpisodes === null ? (
            <p className="selection-status" aria-live="polite">
              {selectionLoadError ?? watchedEpisodeError ?? "正在读取你的追番和已看记录…"}
              {selectionLoadError || watchedEpisodeError ? signInPromptButton : null}
            </p>
          ) : (
            <>
              <section className="statistics-today" aria-labelledby="statistics-today-heading">
                <div className="statistics-section-heading">
                  <button
                    className="statistics-section-heading-toggle"
                    type="button"
                    aria-expanded={!isStatisticsSectionCollapsed("today")}
                    aria-controls="statistics-today-content"
                    onClick={() => toggleStatisticsSection("today")}
                  >
                    <span className="statistics-section-heading-copy">
                      <span className="section-kicker">今天{currentBeijingDate ? " · " + shortDate(currentBeijingDate) : ""}</span>
                      <span className="statistics-section-title" id="statistics-today-heading" role="heading" aria-level={2}>
                        今日播出
                      </span>
                    </span>
                    <span className="statistics-section-heading-note">只显示你收藏的番剧</span>
                    <span className="statistics-section-chevron" aria-hidden="true" />
                  </button>
                </div>
                <div id="statistics-today-content" hidden={isStatisticsSectionCollapsed("today")}>
                  {todayBroadcasts.length ? (
                    <div className="statistics-anime-card-list">
                      {todayBroadcasts.map((event) => {
                        const watchedEpisode = {
                          animeId: event.id,
                          episodeStart: event.episodeStart,
                          episode: event.episode,
                        };
                        const isWatched = isEpisodeViewWatched(watchedEpisodes, watchedEpisode);

                        return (
                          <span key={event.id + "-" + event.episodeStart + "-" + event.episode}>
                            {statisticsAnimeCard(
                              event,
                              `${event.releaseKind === "network" ? "网络配信 · 时刻未定" : event.broadcastTime} · ${formatEpisodeLabel(event.episodeStart, event.episode)}`,
                              isWatched ? "已看" : "待看",
                              {
                                selectedDate: event.broadcastDate,
                                selectedTime: event.broadcastTime,
                                selectedEpisodeStart: event.episodeStart,
                                selectedEpisode: event.episode,
                                selectedReleaseKind: event.releaseKind === "network" ? "network" : undefined,
                              },
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="statistics-empty">今天没有已收藏番剧安排播出。</p>
                  )}
                </div>
              </section>

              <section className="statistics-overview" id="statistics-overview" aria-labelledby="statistics-overview-heading">
                <div className="statistics-overview-summary">
                  <div className="statistics-section-heading">
                  <button
                    className="statistics-section-heading-toggle"
                    type="button"
                    aria-expanded={!isStatisticsSectionCollapsed("overview")}
                    aria-controls="statistics-overview-content"
                    onClick={() => toggleStatisticsSection("overview")}
                  >
                    <span className="statistics-section-heading-copy">
                      <span className="section-kicker">{selectedOverallSeason ? "季度追番" : "全部追番"}</span>
                      <span className="statistics-section-title" id="statistics-overview-heading" role="heading" aria-level={2}>
                        {selectedOverallSeason?.label ?? "总体进度"}
                      </span>
                    </span>
                    <span className="statistics-section-heading-note">按已标记的集数统计</span>
                    <span className="statistics-section-chevron" aria-hidden="true" />
                  </button>
                  <div className="statistics-section-controls">
                    <label className="statistics-season-picker">
                      选择季度
                      <select
                        value={selectedOverallSeasonId}
                        onChange={(event) => {
                          const seasonId = event.target.value;
                          setSelectedOverallSeasonId(seasonId);
                          window.requestAnimationFrame(() => {
                            if (!seasonId) {
                              document.getElementById("statistics-overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
                              return;
                            }
                            document
                              .getElementById(`statistics-overview-season-${seasonId}`)
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          });
                        }}
                      >
                        <option value="">All</option>
                        {overallProgressBySeason.map(({ season }) => (
                          <option key={season.id} value={season.id}>
                            {season.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  </div>
                  <dl className="statistics-overview-grid">
                    <div>
                      <dt>{selectedOverallSeason ? "本季追番" : "追番总数"}</dt>
                      <dd>{displayedOverallProgressTotals.total} 部</dd>
                    </div>
                    <div>
                      <dt>在追</dt>
                      <dd>{displayedOverallProgressTotals.inProgress} 部</dd>
                    </div>
                    <div>
                      <dt>已看完</dt>
                      <dd>{displayedOverallProgressTotals.completed} 部</dd>
                    </div>
                    <div>
                      <dt>未开始</dt>
                      <dd>{displayedOverallProgressTotals.notStarted} 部</dd>
                    </div>
                  </dl>
                </div>
                <div className="statistics-progress-content" id="statistics-overview-content" hidden={isStatisticsSectionCollapsed("overview")}>
                  {displayedOverallProgressBySeason.map(({ season, progress }) => (
                    <section
                      className="statistics-overview-season"
                      id={`statistics-overview-season-${season.id}`}
                      key={season.id}
                      aria-labelledby={`statistics-overview-season-heading-${season.id}`}
                    >
                      <h3 id={`statistics-overview-season-heading-${season.id}`}>{season.label}</h3>
                      <div className="statistics-anime-card-list">
                        {progress.map((progress) => (
                          <span key={progress.record.id}>
                            {statisticsAnimeCard(
                              progress.record,
                              `已看 ${progress.watchedEpisodeCount} / ${progress.record.episodeCount} 集${progress.latestWatchedEpisode === null ? " · 尚未标记观看" : ` · 最后标记第 ${progress.latestWatchedEpisode} 集`}`,
                              progressStatusLabel(progress.status),
                              {},
                              progress.watchedEpisodeCount,
                            )}
                          </span>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>

            </>
          )}
        </section>
      ) : null}

      {activePage === "mine" ? (
        <section className="personal-hero personal-hero-mine" aria-labelledby="mine-hero-heading">
          <div className="personal-hero-copy">
            <p className="season-kicker">我的番剧</p>
            <h1 id="mine-hero-heading">今天要追什么？</h1>
            <p className="intro">把这一周的追番安排在眼前，按自己的节奏慢慢补完。</p>
            <div className="personal-hero-controls">
              <label className="season-picker">
                选择季度
                <select value={activeSeason.id} onChange={(event) => changeSeason(event.target.value)}>
                  {seasons.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
                  ))}
                </select>
                {isHistoricalSeason ? (
                  <span>名称和封面来自 YUC；首播日期、北京时间与集数使用 AniList 历史记录。</span>
                ) : null}
              </label>
              <a className="source-link" href={activeSeason.sourceUrl} target="_blank" rel="noreferrer">
                {activeSeason.sourceName} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <dl className="personal-hero-metrics" aria-label="我的番剧概览">
            <div>
              <dt>本季在追</dt>
              <dd>{isPersonalProgressLoading ? "读取中" : `${selectedSeasonAnime.length} 部`}</dd>
            </div>
            <div>
              <dt>今天待看</dt>
              <dd>{isPersonalProgressLoading ? "读取中" : `${todayBroadcasts.length} 集`}</dd>
            </div>
            <div className="personal-progress-metric">
              <dt>整体进度</dt>
              <dd>
                {isPersonalProgressLoading ? "读取中" : personalEpisodeCount ? (
                  <>
                    <span>{personalProgressLabel}</span>
                    <progress
                      className="personal-progress-bar"
                      aria-label="整体观看进度"
                      value={personalWatchedEpisodeCount}
                      max={personalEpisodeCount}
                    >
                      {personalProgressLabel}
                    </progress>
                  </>
                ) : personalProgressLabel}
              </dd>
            </div>
          </dl>
          <form className="page-search" role="search" aria-label="查询番剧" onSubmit={submitPageSearch}>
            <label className="page-search-field">查询番剧<input name="pageSearch" type="search" placeholder="输入中文或日文名" /></label>
            <button type="submit">查询</button>
          </form>
        </section>
      ) : null}

      {activePage === "search" ? (
        <section className="anime-search-page" aria-labelledby="anime-search-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">全部目录</p>
              <h2 id="anime-search-heading">查询番剧</h2>
            </div>
            <p>输入中文或日文名，查询所有已收录作品。</p>
          </div>
          <label className="anime-search">
            查询番剧
            <input
              type="search"
              value={animeQuery}
              onChange={(event) => setAnimeQuery(event.target.value)}
              placeholder="输入中文或日文名"
            />
          </label>
          {!hasAnimeQuery ? (
            <p className="anime-search-empty">输入中文或日文名开始查询。</p>
          ) : searchResults.length ? (
            isSearchProgressLoading ? (
              <p className="selection-status" aria-live="polite">
                {searchProgressError ?? "正在读取追番进度…"}
              </p>
            ) : (
              <div className="statistics-anime-card-list anime-search-results">
                {searchResults.map((record) => {
                  const progress = searchProgressByAnimeId.get(record.id);
                  if (!progress || selectedAnimeIds === null || watchedEpisodes === null) {
                    return (
                      <span key={record.id}>
                        {statisticsAnimeCard(
                          record,
                          (seasonLabelByAnimeId.get(record.id) ?? "已收录番剧") +
                            " · 追番进度暂不可用",
                          "进度暂不可用",
                        )}
                      </span>
                    );
                  }

                  const isTracked = selectedAnimeIds.includes(record.id);
                  return (
                    <span key={record.id}>
                      {statisticsAnimeCard(
                        record,
                        (seasonLabelByAnimeId.get(record.id) ?? "已收录番剧") +
                          ` · 已看 ${progress.watchedEpisodeCount} / ${record.episodeCount} 集`,
                        isTracked ? progressStatusLabel(progress.status) : "未追番",
                        {},
                        progress.watchedEpisodeCount,
                      )}
                    </span>
                  );
                })}
              </div>
            )
          ) : (
            <p className="anime-search-empty" aria-live="polite">
              未找到“{animeQuery.trim()}”相关的番剧。
            </p>
          )}
        </section>
      ) : null}

      {activePage === "all" || activePage === "mine" ? (
        <>
        {activePage === "all" || calendarAnime.length ? (
        <>
      <section ref={weeklySectionRef} className="weekly-section" aria-labelledby="weekly-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">放送安排</p>
            <h2 id="weekly-heading">一周放送安排</h2>
          </div>
          <p>节目以首播日期起每周重复，播满对应集数后不再显示。</p>
        </div>
        {watchedEpisodeError ? (
          <p className="selection-status" aria-live="polite">
            {watchedEpisodeError}
            {signInPromptButton}
          </p>
        ) : null}

        <nav className="week-pager" aria-label="日历周导航">
          <button type="button" onClick={() => changeWeek(-7)} aria-label="上一周">
            上一周
          </button>
          <p aria-live="polite">{weekLabel(dates)}</p>
          <button type="button" onClick={returnToCurrentWeek}>
            {!isHistoricalSeason ? "回到本周" : "回到本月首周"}
          </button>
          <button type="button" onClick={() => changeWeek(7)} aria-label="下一周">
            下一周
          </button>
        </nav>

        <div className="time-grid-scroll">
          <div
            className={"timeline-grid" + (dateOnlyEvents.length ? " has-date-only-events" : "")}
            aria-label={weekLabel(dates) + " 放送安排"}
            style={timelineStyle}
          >
            <div className="timeline-corner" aria-hidden="true" />
            {dates.map((date, index) => {
              const isToday = date === currentCalendarDate;

              return (
                <header
                  className={"timeline-day-header" + (isToday ? " is-today" : "")}
                  key={date}
                  aria-label={weekdays[index] + " " + date}
                >
                  <h3>{weekdays[index]}</h3>
                  <span>{shortDate(date)}</span>
                  {isToday ? <b>今天</b> : null}
                </header>
              );
            })}
            {dateOnlyEvents.length ? (
              <>
                <div className="timeline-date-only-corner" aria-hidden="true" />
                {dates.map((date, index) => (
                  <div
                    className={"timeline-date-only" + (date === currentCalendarDate ? " is-today" : "")}
                    key={date}
                  >
                    {dayDateOnlyEvents[index].length ? (
                      <div className="timeline-date-only-events">
                        {dayDateOnlyEvents[index].map(dateOnlyEventButton)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </>
            ) : null}
            <div className="timeline-axis" aria-hidden="true">
              {currentTimelineMarker ? (
                <div className="timeline-current-time timeline-current-time-axis" style={currentTimelineMarkerStyle}>
                  <time>{currentBeijingTime}</time>
                </div>
              ) : null}
              {timelineHours.map((hour) => (
                <time
                  className={"timeline-hour" + (hour === timelineEndHour ? " is-timeline-end" : "")}
                  key={hour}
                >
                  {formatBroadcastTime(String(hour).padStart(2, "0") + ":00")}
                </time>
              ))}
            </div>
            {dates.map((date, index) => {
              const isToday = date === currentCalendarDate;
              const positionedEvents = layoutTimelineEvents(
                events.filter((event) => event.date === date),
              );

              return (
                <section
                  className={"timeline-day" + (isToday ? " is-today" : "")}
                  key={date}
                  aria-label={weekdays[index] + " " + date}
                >
                  {currentTimelineMarker ? (
                    <div className="timeline-current-time" style={currentTimelineMarkerStyle} aria-hidden="true" />
                  ) : null}
                  {positionedEvents.map(({ event, lane, laneCount }) =>
                    eventButton(event, { lane, laneCount }),
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <div className="mobile-calendar" aria-label="移动端日程">
          <div className="mobile-day-picker" role="tablist" aria-label="选择日期">
            {dates.map((date, index) => (
              <button
                className={date === activeMobileDate ? "is-selected" : ""}
                key={date}
                type="button"
                role="tab"
                aria-selected={date === activeMobileDate}
                onClick={() => setActiveMobileDate(date)}
              >
                <span>{weekdays[index]}</span>
                <b>{compactDate(date)}</b>
              </button>
            ))}
          </div>
          <div className="mobile-agenda">
            {activeMobileDateOnlyEvents.length ? (
              <div className="mobile-date-only-events">{activeMobileDateOnlyEvents.map(dateOnlyEventButton)}</div>
            ) : null}
            {activeMobileEventGroups.map(({ time, events: groupedEvents }) => (
              <section className="time-group" key={time}>
                <time className="time-group-label">{formatBroadcastTime(time)}</time>
                <div
                  className={
                    "time-group-events" + (groupedEvents.length >= 3 ? " is-crowded" : "")
                  }
                  style={{ "--same-time-count": groupedEvents.length } as CSSProperties}
                >
                  {groupedEvents.map((event) => eventButton(event))}
                </div>
              </section>
            ))}
            {!activeMobileEventGroups.length && !activeMobileDateOnlyEvents.length ? (
              <p>当天没有排定放送。</p>
            ) : null}
          </div>
        </div>
      </section>

      {networkOnly.length ? <section className="network-section" aria-labelledby="network-heading">
        <div>
          <p className="section-kicker">完整番表</p>
          <h2 id="network-heading">网络放送／固定时刻未列出</h2>
          <p>已收录作品，但暂未确认固定的每周播出时刻。</p>
        </div>
        <div className="network-list">
          {networkOnly.map((record) => (
            <button
              className="network-card"
              key={record.id}
              type="button"
              aria-haspopup="dialog"
              aria-label={"查看《" + record.titleZh + "／" + record.titleJa + "》详情"}
              onClick={(clickEvent) => openDetail(record, clickEvent.currentTarget)}
            >
              <CoverArt anime={record} className="network-card-cover" decorative />
              <span>
                <strong>{record.titleZh}</strong>
                <small>{record.titleJa}</small>
                <em>
                  {networkBroadcastLabel({
                    isHistoricalSeason,
                    sourceName: activeSeason.sourceName,
                    premiereDateBeijing: record.premiereDateBeijing,
                    premiereKind: record.premiereKind,
                  })}
                </em>
              </span>
            </button>
          ))}
        </div>
      </section>
      : null}

        </>
      ) : selectedAnimeIds ? (
        <p className="my-schedule-empty">
          请先在“选择番剧”中勾选想追的作品。
        </p>
      ) : null}

      {activePage === "mine" ? (
        <section className="anime-selection-panel" aria-labelledby="anime-selection-heading">
          <details className="anime-selection-details">
            <summary className="anime-selection-summary">
              <span className="section-kicker">选择番剧</span>
              <span className="anime-selection-title" id="anime-selection-heading">
                本季度想追什么？
              </span>
              <span className="anime-selection-summary-copy">
                选择会自动保存，并在登录同一账号的设备间同步。
              </span>
            </summary>
            {selectedAnimeIds ? (
              <div className="anime-selection-list">
                {activeSeason.anime.map((record) => (
                  <label className="anime-selection" key={record.id}>
                    <input
                      type="checkbox"
                      checked={selectedAnimeIds.includes(record.id)}
                      disabled={isSavingSelection}
                      onChange={() => void toggleAnimeSelection(record.id)}
                    />
                    <CoverArt anime={record} className="statistics-anime-card-cover" decorative />
                    <span className="statistics-anime-card-content">
                      <strong title={record.titleZh}>{record.titleZh}</strong>
                      <small title={record.titleJa}>{record.titleJa}</small>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="selection-status" aria-live="polite">
                {selectionLoadError ?? "正在读取你的追番列表…"}
                {selectionLoadError ? signInPromptButton : null}
              </p>
            )}
            {selectedAnimeIds && selectionLoadError ? (
              <p className="selection-status" aria-live="polite">
                {selectionLoadError}
              </p>
            ) : null}
          </details>
        </section>
      ) : null}

      <footer className="calendar-footer">
        <p>
          数据来源：{" "}
          <a href={activeSeason.sourceUrl} target="_blank" rel="noreferrer">
            {activeSeason.sourceName}
          </a>
          ，更新于 {activeSeason.updatedAt}。
        </p>
        {isHistoricalSeason ? (
          <p>YUC 提供目录、名称、封面及网络首播日期；电视排期按 AniList 历史记录与しょぼいカレンダー核对。</p>
        ) : (
          <p>周表时刻按资料来源公开排期展示为 {activeSeason.timeZoneLabel}。</p>
        )}
      </footer>
        </>
      ) : null}

      {authDialogMode ? (
        <dialog
          ref={authDialogRef}
          className="auth-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-dialog-title"
          onClose={handleAuthDialogClose}
          onClick={(clickEvent) => {
            const rect = clickEvent.currentTarget.getBoundingClientRect();
            if (
              clickEvent.clientX < rect.left ||
              clickEvent.clientX > rect.right ||
              clickEvent.clientY < rect.top ||
              clickEvent.clientY > rect.bottom
            ) {
              clickEvent.currentTarget.close();
            }
          }}
        >
          <div className="detail-dialog-heading">
            <p className="section-kicker">账号</p>
            <button
              className="dialog-close"
              type="button"
              aria-label="关闭账号窗口"
              onClick={() => authDialogRef.current?.close()}
              autoFocus
            >
              关闭
            </button>
          </div>
          <h2 id="auth-dialog-title">
            {authDialogMode === "login"
              ? "登录"
              : authDialogMode === "register"
                ? "注册"
                : "修改密码"}
          </h2>
          <form
            className="auth-form"
            onSubmit={(submitEvent) =>
              void (authDialogMode === "change-password"
                ? submitPasswordChange(submitEvent)
                : submitAuth(submitEvent))
            }
          >
            {authDialogMode === "change-password" ? (
              <>
                <label>
                  当前密码
                  <input
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label>
                  新密码
                  <input
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    placeholder="至少 8 位"
                  />
                </label>
                <label>
                  确认新密码
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  邮箱
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                  />
                </label>
                <label>
                  密码
                  <input
                    name="password"
                    type="password"
                    autoComplete={authDialogMode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={8}
                    maxLength={72}
                    placeholder="至少 8 位"
                  />
                </label>
              </>
            )}
            {authDialogMode === "register" ? (
              <label>
                昵称（可选）
                <input name="displayName" type="text" autoComplete="nickname" maxLength={40} />
              </label>
            ) : null}
            {authError ? (
              <p className="auth-error" role="alert">
                {authError}
              </p>
            ) : null}
            <button className="auth-submit" type="submit" disabled={isSubmittingAuth}>
              {isSubmittingAuth
                ? "正在提交…"
                : authDialogMode === "login"
                  ? "登录"
                  : authDialogMode === "register"
                    ? "注册并登录"
                    : "修改密码并退出"}
            </button>
          </form>
          {authDialogMode !== "change-password" ? (
            <p className="auth-switch">
              {authDialogMode === "login" ? "还没有账号？" : "已有账号？"}
              <button
                type="button"
                onClick={(clickEvent) =>
                  openAuthDialog(authDialogMode === "login" ? "register" : "login", clickEvent.currentTarget)
                }
              >
                {authDialogMode === "login" ? "立即注册" : "直接登录"}
              </button>
            </p>
          ) : null}
        </dialog>
      ) : null}

      {selected ? (
        <dialog
          ref={dialogRef}
          className="detail-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="anime-detail-title"
          onClose={handleDialogClose}
          onClick={(clickEvent) => {
            const rect = clickEvent.currentTarget.getBoundingClientRect();
            if (
              clickEvent.clientX < rect.left ||
              clickEvent.clientX > rect.right ||
              clickEvent.clientY < rect.top ||
              clickEvent.clientY > rect.bottom
            ) {
              clickEvent.currentTarget.close();
            }
          }}
        >
          <div className="detail-dialog-heading">
            <p className="section-kicker">节目详情</p>
            <button
              className="dialog-close"
              type="button"
              aria-label="关闭详情"
              onClick={() => dialogRef.current?.close()}
              autoFocus
            >
              关闭
            </button>
          </div>
          <CoverArt anime={selected} className="detail-cover" variant="detail" />
          <p className="detail-title-zh">{selected.titleZh}</p>
          <h2 id="anime-detail-title">{selected.titleJa}</h2>
          <div className="detail-actions">
            <button
              className={
                "detail-follow-button" +
                (selectedAnimeIds?.includes(selected.id) ? " is-followed" : "")
              }
              type="button"
              aria-pressed={selectedAnimeIds?.includes(selected.id) ?? false}
              aria-label={
                (selectedAnimeIds?.includes(selected.id) ? "取消追番《" : "追番《") +
                selected.titleZh +
                "》"
              }
              disabled={selectedAnimeIds === null || isSavingSelection}
              onClick={() => void toggleAnimeSelection(selected.id)}
            >
              {selectedAnimeIds?.includes(selected.id) ? "已追番 ✓" : "追番"}
            </button>
          </div>
          <dl>
            <div>
              <dt>本次放送</dt>
              <dd>
                {selected.selectedDate
                  ? selected.selectedDate +
                    (selected.selectedReleaseKind === "network"
                      ? " 网络配信 · 具体时刻未列出"
                      : " " +
                        (selectedBroadcastTime
                          ? formatBroadcastTime(selectedBroadcastTime)
                          : "具体时刻未列出")) +
                    (selected.selectedEpisode
                      ? " · " +
                        formatEpisodeLabel(
                          selected.selectedEpisodeStart ?? selected.selectedEpisode,
                          selected.selectedEpisode,
                        )
                      : "")
                  : "从 " +
                    (selected.premiereDateBeijing ?? "待确认") +
                    (selected.scheduleWeekday && selected.beijingTime
                      ? " 起每周放送"
                      : " 起，后续播出时间未列出")}
              </dd>
            </div>
            <div>
              <dt>首播排期</dt>
              <dd>
                {selected.premiereDateBeijing
                  ? selected.premiereDateBeijing +
                    ("premiereKind" in selected && selected.premiereKind === "network" ? " 网络配信" : "") +
                    " " +
                    (selectedBroadcastTime
                      ? formatBroadcastTime(selectedBroadcastTime)
                      : "具体时刻未列出")
                  : "待确认"}
              </dd>
            </div>
            <div>
              <dt>排期来源</dt>
              <dd>{selected.station ?? "待确认"}</dd>
            </div>
            {"premiereKind" in selected &&
            selected.premiereKind === "network" &&
            "episodeSchedules" in selected &&
            selected.episodeSchedules?.length ? (
              <div>
                <dt>电视播出</dt>
                <dd>
                  {selected.episodeSchedules[0].broadcastDateBeijing +
                    " " +
                    formatBroadcastTime(selected.episodeSchedules[0].beijingTime) +
                    " · " +
                    ("scheduleChannel" in selected ? selected.scheduleChannel : selected.station ?? "待确认")}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>集数</dt>
              <dd>
                {selected.episodeCount} 集
                {"episodeCountStatus" in selected && selected.episodeCountStatus === "estimated"
                  ? "（资料未列出，暂按 12 集）"
                  : ""}
              </dd>
            </div>
          </dl>
          <div className="detail-watch" aria-label="观看情况">
            <p className="detail-watch-summary">
              观看情况：
              {!currentUser
                ? "登录后可记录观看进度"
                : watchedEpisodes === null || !selectedProgress
                  ? "正在读取…"
                  : `已看 ${selectedProgress.watchedEpisodeCount} / ${selected.episodeCount} 集 · ${progressStatusLabel(selectedProgress.status)}`}
            </p>
            <span className="detail-watch-progress" aria-hidden="true">
              <span
                style={{
                  width: `${((selectedProgress?.watchedEpisodeCount ?? 0) / selected.episodeCount) * 100}%`,
                }}
              />
            </span>
          </div>
          {!currentUser && authLoaded ? (
            <p className="detail-auth-hint">
              登录后可追番并记录每集观看进度。
              {signInPromptButton}
            </p>
          ) : null}
          <div className="detail-episodes">
            <p className="detail-episodes-label">逐集已看</p>
            <div className="detail-episode-grid">
              {selectedEpisodeUnits.map((unit) => {
                const unitWatchedEpisode = { animeId: selected.id, ...unit };
                const key = episodeViewKey(unitWatchedEpisode);
                const isWatched = watchedEpisodes
                  ? isEpisodeViewWatched(watchedEpisodes, unitWatchedEpisode)
                  : false;
                const episodeLabel = formatEpisodeLabel(unit.episodeStart, unit.episode);
                return (
                  <button
                    key={key}
                    className={"detail-episode-button" + (isWatched ? " is-watched" : "")}
                    type="button"
                    aria-pressed={isWatched}
                    aria-label={
                      (isWatched ? "取消标记《" : "标记《") +
                      selected.titleZh +
                      "》" +
                      episodeLabel +
                      "已看"
                    }
                    disabled={watchedEpisodes === null || savingEpisodeKeys.includes(key)}
                    onClick={() => void toggleEpisodeView(unitWatchedEpisode)}
                  >
                    {unit.episodeStart === unit.episode
                      ? unit.episode
                      : `${unit.episodeStart}–${unit.episode}`}
                  </button>
                );
              })}
            </div>
          </div>
          <a
            className="detail-source-link"
            href={selected.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            查看资料来源 <span aria-hidden="true">↗</span>
          </a>
        </dialog>
      ) : null}
      </main>
      <button
        className="theme-toggle"
        type="button"
        aria-pressed={theme === "dark"}
        aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        onClick={toggleTheme}
      >
        {theme === "dark" ? "浅色模式" : "深色模式"}
      </button>
    </div>
  );
}
