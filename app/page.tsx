"use client";

import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { allAnime, seasons } from "../data/anime.js";
import { coverSpriteFor } from "../data/cover-sprites.js";
import { networkBroadcastLabel } from "../lib/anime-labels.js";
import { episodeViewKey, updateEpisodeViews } from "../lib/anime-episode-views.js";
import {
  broadcastsForDate,
  progressForAnime,
  progressTotals,
  sortProgressBySeasonThenWatchedEpisodes,
  sortProgressByWatchedEpisodes,
} from "../lib/anime-statistics.js";
import {
  addDays,
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
  timelineOffsetMinutes,
  weekDays,
} from "../lib/calendar.js";

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const initialSeasonId = "2026-july";
const initialWeekStart = "2026-07-06";

type Anime = (typeof allAnime)[number];
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
type WatchedEpisode = { animeId: string; episodeStart: number; episode: number };
type Page = "all" | "mine" | "stats";
type StatisticsSection = "today" | "overview" | "season";

const seasonIndexByAnimeId = new Map(
  seasons.flatMap((season, seasonIndex) =>
    season.anime.map((record) => [record.id, seasonIndex] as const),
  ),
);

function CoverArt({
  anime,
  className,
  decorative = false,
}: {
  anime: Anime;
  className: string;
  decorative?: boolean;
}) {
  const sprite = coverSpriteFor(anime.coverUrl);
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

const beijingDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getBeijingDate() {
  const parts = Object.fromEntries(
    beijingDateFormatter
      .formatToParts(new Date())
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return String(parts.year) + "-" + parts.month + "-" + parts.day;
}

function subscribeToBeijingDate(onStoreChange: () => void) {
  const interval = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(interval);
}

function getServerBeijingDate() {
  return null;
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
  const [selected, setSelected] = useState<SelectedAnime | null>(null);
  const [selectedAnimeIds, setSelectedAnimeIds] = useState<string[] | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<WatchedEpisode[] | null>(null);
  const [watchedEpisodeError, setWatchedEpisodeError] = useState<string | null>(null);
  const [savingEpisodeKeys, setSavingEpisodeKeys] = useState<string[]>([]);
  const [selectedStatisticsSeasonId, setSelectedStatisticsSeasonId] = useState<string | null>(null);
  const [collapsedStatisticsSections, setCollapsedStatisticsSections] = useState<StatisticsSection[]>([]);
  const [activeWeekStart, setActiveWeekStart] = useState(initialWeekStart);
  const [activeMobileDate, setActiveMobileDate] = useState(initialWeekStart);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const didSetInitialWeek = useRef(false);
  const currentBeijingDate = useSyncExternalStore<string | null>(
    subscribeToBeijingDate,
    getBeijingDate,
    getServerBeijingDate,
  );
  const activeSeason = seasonForWeek(seasons, activeWeekStart);
  const isHistoricalSeason = activeSeason.id !== initialSeasonId;
  const defaultTimelineStartMinutes = 5 * 60;
  const defaultTimelineEndMinutes = 29 * 60;
  const dates = weekDays(activeWeekStart);
  const calendarAnime =
    activePage === "mine"
      ? allAnime.filter((record) => selectedAnimeIds?.includes(record.id))
      : allAnime;
  const selectedAnime = allAnime.filter((record) => selectedAnimeIds?.includes(record.id));
  const selectedSeasonAnime = activeSeason.anime.filter((record) => selectedAnimeIds?.includes(record.id));
  const defaultStatisticsSeason =
    [...seasons]
      .reverse()
      .find((season) => season.anime.some((record) => selectedAnimeIds?.includes(record.id))) ??
    seasons[seasons.length - 1];
  const statisticsSeason =
    seasons.find(({ id }) => id === selectedStatisticsSeasonId) ?? defaultStatisticsSeason;
  const statisticsSeasonAnime = statisticsSeason.anime.filter((record) =>
    selectedAnimeIds?.includes(record.id),
  );
  const allProgress = progressForAnime(selectedAnime, watchedEpisodes ?? []);
  const overallProgressTotals = progressTotals(allProgress);
  const overallProgress = sortProgressBySeasonThenWatchedEpisodes(allProgress, seasonIndexByAnimeId);
  const statisticsSeasonProgress = sortProgressByWatchedEpisodes(progressForAnime(statisticsSeasonAnime, watchedEpisodes ?? []));
  const todayBroadcasts = currentBeijingDate ? broadcastsForDate(selectedAnime, currentBeijingDate) : [];
  const events = eventsForWeek(calendarAnime, activeWeekStart) as CalendarEvent[];
  const dateOnlyEvents = dateOnlyEventsForWeek(calendarAnime, activeWeekStart) as DateOnlyEvent[];
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

  useEffect(() => {
    if (!currentBeijingDate || didSetInitialWeek.current) return;

    didSetInitialWeek.current = true;
    setActiveWeekStart(startOfWeek(currentBeijingDate));
    setActiveMobileDate(currentBeijingDate);
  }, [currentBeijingDate]);

  useEffect(() => {
    if (selected && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [selected]);

  useEffect(() => {
    const syncPageFromUrl = () => {
      const page = new URLSearchParams(window.location.search).get("page");
      setActivePage(page === "mine" || page === "stats" ? page : "all");
    };

    syncPageFromUrl();
    window.addEventListener("popstate", syncPageFromUrl);
    return () => window.removeEventListener("popstate", syncPageFromUrl);
  }, []);

  useEffect(() => {
    if ((activePage !== "mine" && activePage !== "stats") || selectedAnimeIds !== null) return;

    let cancelled = false;
    async function loadAnimeSelections() {
      try {
        const response = await fetch("/api/anime-selections");
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
  }, [activePage, selectedAnimeIds]);

  useEffect(() => {
    let cancelled = false;
    async function loadWatchedEpisodes() {
      try {
        const response = await fetch("/api/anime-episode-views");
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
  }, []);

  const changePage = (page: Page) => {
    if (page === activePage) return;

    const url = new URL(window.location.href);
    if (page === "mine" || page === "stats") {
      url.searchParams.set("page", page);
    } else {
      url.searchParams.delete("page");
    }
    window.history.pushState(null, "", url);
    setActivePage(page);
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
      ? currentBeijingDate ?? initialWeekStart
      : firstFullWeekStart(activeSeason);
    setActiveWeekStart(startOfWeek(date));
    setActiveMobileDate(date);
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

    const key = episodeViewKey(watchedEpisode);
    if (savingEpisodeKeys.includes(key)) return;

    const isWatched = watchedEpisodes.some(
      (candidate) => episodeViewKey(candidate) === key,
    );
    const nextWatchedEpisodes = updateEpisodeViews(watchedEpisodes, watchedEpisode, !isWatched);

    setWatchedEpisodes(nextWatchedEpisodes);
    setWatchedEpisodeError(null);
    setSavingEpisodeKeys((keys) => [...keys, key]);
    try {
      const response = await fetch("/api/anime-episode-views", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...watchedEpisode, watched: !isWatched }),
      });
      if (!response.ok) throw new Error("Unable to save watched episode");
    } catch {
      setWatchedEpisodes((current) => {
        if (current === null) return null;
        return updateEpisodeViews(current, watchedEpisode, isWatched);
      });
      setWatchedEpisodeError("保存已看状态失败，请重试。");
    } finally {
      setSavingEpisodeKeys((keys) => keys.filter((candidate) => candidate !== key));
    }
  };

  const openDetail = (
    record: Anime,
    opener: HTMLButtonElement,
    selection: Pick<
      SelectedAnime,
      "selectedDate" | "selectedTime" | "selectedEpisodeStart" | "selectedEpisode"
    > = {},
  ) => {
    openerRef.current = opener;
    setSelected({ ...record, ...selection });
  };

  const isStatisticsSectionCollapsed = (section: StatisticsSection) =>
    collapsedStatisticsSections.includes(section);
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
    selection: Pick<
      SelectedAnime,
      "selectedDate" | "selectedTime" | "selectedEpisodeStart" | "selectedEpisode" | "selectedReleaseKind"
    > = {},
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
      </span>
      {status ? <span className="statistics-anime-card-status">{status}</span> : null}
    </button>
  );

  const handleDialogClose = () => {
    setSelected(null);
    openerRef.current?.focus();
  };

  const eventButton = (event: CalendarEvent, layout?: { lane: number; laneCount: number }) => {
    const isToday = event.date === currentBeijingDate;
    const displayTime = formatBroadcastTime(event.time);
    const episodeLabel = formatEpisodeLabel(event.episodeStart, event.episode);
    const watchedEpisode = {
      animeId: event.id,
      episodeStart: event.episodeStart,
      episode: event.episode,
    };
    const key = episodeViewKey(watchedEpisode);
    const isWatched = watchedEpisodes?.some((candidate) => episodeViewKey(candidate) === key) ?? false;
    const isSavingWatch = savingEpisodeKeys.includes(key);
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
      </nav>
      <main className="calendar-page">
      <header className="calendar-header">
        <div>
          <p className="season-kicker">
            {activePage === "all" ? activeSeason.label : activePage === "mine" ? "我的番剧" : "我的进度"}
          </p>
          <h1>
            {activePage === "all"
              ? activeSeason.label + "时间表"
              : activePage === "mine"
                ? "我的番剧时间表"
                : "追番统计"}
          </h1>
          <p className="intro">
            {activePage === "all"
              ? "共 " +
                activeSeason.catalogCount +
                " 部番剧" +
                "，从首播日起按周显示；未明确集数的作品暂按 12 集安排，时间均为北京时间。"
              : activePage === "mine"
                ? "勾选想追的番剧，只查看属于你的播出时间表。"
                : "查看今天要追的番剧、整体进度，以及每个季度的追番记录。"}
          </p>
          {activePage !== "stats" && isHistoricalSeason ? (
            <p className="pilot-note">
              名称和封面来自 YUC；首播日期、北京时间与集数使用 AniList 历史记录。
            </p>
          ) : null}
        </div>
        {activePage !== "stats" ? (
          <div className="calendar-header-controls">
            <label className="season-picker">
              选择季度
              <select value={activeSeason.id} onChange={(event) => changeSeason(event.target.value)}>
                {seasons.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.label}
                  </option>
                ))}
              </select>
              <span>1 月番和 4 月番：名称和封面来自 YUC；首播日期、北京时间与集数使用 AniList 历史记录。</span>
            </label>
            <a
              className="source-link"
              href={activeSeason.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {activeSeason.sourceName} <span aria-hidden="true">↗</span>
            </a>
          </div>
        ) : null}
      </header>

      {activePage === "stats" ? (
        <section className="statistics-page" aria-label="我的追番统计">
          {selectedAnimeIds === null || watchedEpisodes === null ? (
            <p className="selection-status" aria-live="polite">
              {selectionError ?? watchedEpisodeError ?? "正在读取你的追番和已看记录…"}
            </p>
          ) : (
            <>
              <section className="statistics-today" aria-labelledby="statistics-today-heading">
                <div className="statistics-section-heading">
                  <div>
                    <p className="section-kicker">今天{currentBeijingDate ? " · " + shortDate(currentBeijingDate) : ""}</p>
                    <h2 id="statistics-today-heading">今日播出</h2>
                  </div>
                  <div className="statistics-section-controls">
                    <p>只显示你收藏的番剧</p>
                    <button
                      className="statistics-section-toggle"
                      type="button"
                      aria-expanded={!isStatisticsSectionCollapsed("today")}
                      aria-controls="statistics-today-content"
                      onClick={() => toggleStatisticsSection("today")}
                    >
                      {isStatisticsSectionCollapsed("today") ? "展开" : "收起"}
                    </button>
                  </div>
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
                        const isWatched = watchedEpisodes.some(
                          (candidate) => episodeViewKey(candidate) === episodeViewKey(watchedEpisode),
                        );

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

              <section className="statistics-overview" aria-labelledby="statistics-overview-heading">
                <div className="statistics-section-heading">
                  <div>
                    <p className="section-kicker">全部追番</p>
                    <h2 id="statistics-overview-heading">总体进度</h2>
                  </div>
                  <div className="statistics-section-controls">
                    <p>按已标记的集数统计</p>
                    <button
                      className="statistics-section-toggle"
                      type="button"
                      aria-expanded={!isStatisticsSectionCollapsed("overview")}
                      aria-controls="statistics-overview-content"
                      onClick={() => toggleStatisticsSection("overview")}
                    >
                      {isStatisticsSectionCollapsed("overview") ? "展开" : "收起"}
                    </button>
                  </div>
                </div>
                <div id="statistics-overview-content" hidden={isStatisticsSectionCollapsed("overview")}>
                  <dl className="statistics-overview-grid">
                    <div>
                      <dt>追番总数</dt>
                      <dd>{overallProgressTotals.total} 部</dd>
                    </div>
                    <div>
                      <dt>在追</dt>
                      <dd>{overallProgressTotals.inProgress} 部</dd>
                    </div>
                    <div>
                      <dt>已看完</dt>
                      <dd>{overallProgressTotals.completed} 部</dd>
                    </div>
                    <div>
                      <dt>未开始</dt>
                      <dd>{overallProgressTotals.notStarted} 部</dd>
                    </div>
                  </dl>
                  <div className="statistics-anime-card-list">
                    {overallProgress.map((progress) => (
                      <span key={progress.record.id}>
                        {statisticsAnimeCard(
                          progress.record,
                          `已看 ${progress.watchedEpisodeCount} / ${progress.record.episodeCount} 集${progress.latestWatchedEpisode === null ? " · 尚未标记观看" : ` · 最后标记第 ${progress.latestWatchedEpisode} 集`}`,
                          progressStatusLabel(progress.status),
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              <section className="statistics-season" aria-labelledby="statistics-season-heading">
                <div className="statistics-section-heading">
                  <div>
                    <p className="section-kicker">季度明细</p>
                    <h2 id="statistics-season-heading">{statisticsSeason.label}</h2>
                  </div>
                  <div className="statistics-section-controls">
                    <label className="statistics-season-picker">
                      选择季度
                      <select
                        value={statisticsSeason.id}
                        onChange={(event) => setSelectedStatisticsSeasonId(event.target.value)}
                      >
                        {seasons.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="statistics-section-toggle"
                      type="button"
                      aria-expanded={!isStatisticsSectionCollapsed("season")}
                      aria-controls="statistics-season-content"
                      onClick={() => toggleStatisticsSection("season")}
                    >
                      {isStatisticsSectionCollapsed("season") ? "展开" : "收起"}
                    </button>
                  </div>
                </div>
                <div id="statistics-season-content" hidden={isStatisticsSectionCollapsed("season")}>
                  {statisticsSeasonProgress.length ? (
                    <div className="statistics-anime-card-list">
                      {statisticsSeasonProgress.map((progress) => (
                        <span key={progress.record.id}>
                          {statisticsAnimeCard(
                            progress.record,
                            `已看 ${progress.watchedEpisodeCount} / ${progress.record.episodeCount} 集${progress.latestWatchedEpisode === null ? " · 尚未标记观看" : ` · 最后标记第 ${progress.latestWatchedEpisode} 集`}`,
                            progressStatusLabel(progress.status),
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="statistics-empty">这个季度还没有收藏的番剧。</p>
                  )}
                </div>
              </section>
            </>
          )}
        </section>
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
                选择会自动保存，并在登录同一 ChatGPT 账号的设备间同步。
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
                    <span title={record.titleZh}>{record.titleZh}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="selection-status" aria-live="polite">
                {selectionError ?? "正在读取你的追番列表…"}
              </p>
            )}
            {selectedAnimeIds && selectionError ? (
              <p className="selection-status" aria-live="polite">
                {selectionError}
              </p>
            ) : null}
          </details>
        </section>
      ) : null}

      {activePage !== "stats" && (activePage === "all" || calendarAnime.length) ? (
        <>
      <section className="weekly-section" aria-labelledby="weekly-heading">
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
              const isToday = date === currentBeijingDate;

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
                    className={"timeline-date-only" + (date === currentBeijingDate ? " is-today" : "")}
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
              const isToday = date === currentBeijingDate;
              const positionedEvents = layoutTimelineEvents(
                events.filter((event) => event.date === date),
              );

              return (
                <section
                  className={"timeline-day" + (isToday ? " is-today" : "")}
                  key={date}
                  aria-label={weekdays[index] + " " + date}
                >
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
      ) : selectedAnimeIds ? (
        <p className="my-schedule-empty">
          勾选上方的番剧后，这里会显示你的专属时间表。
        </p>
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
          <CoverArt anime={selected} className="detail-cover" />
          <p className="detail-title-zh">{selected.titleZh}</p>
          <h2 id="anime-detail-title">{selected.titleJa}</h2>
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
    </div>
  );
}
