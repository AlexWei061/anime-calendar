import { useMemo } from "react";
import { broadcastsForDate, progressForAnime, progressTotals, sortProgressBySeasonThenWatchedEpisodes } from "../../lib/anime-statistics.js";
import { isEpisodeViewWatched } from "../../lib/anime-episode-views.js";
import { formatEpisodeLabel } from "../../lib/calendar.js";
import { allAnime, seasons, seasonIndexByAnimeId } from "../catalog";
import { shortDate, progressStatusLabel } from "../display";
import { useBeijingClock } from "../hooks/use-display";
import { useViewer } from "../hooks/use-viewer";
import { PageHeading } from "./page-heading";
import { SignInPrompt } from "./account";
import { StatisticsAnimeCard } from "./statistics-anime-card";
import type { AnimeProgress, BroadcastEvent, StatisticsSection, StatisticsView } from "../types";

export function StatisticsPage({ onSearch, view, onViewChange }: {
  onSearch: (query: string) => void;
  view: StatisticsView;
  onViewChange: (view: StatisticsView) => void;
}) {
  const { currentUser, selectedAnimeIds, selectionError, watchedEpisodes, watchedEpisodeError } = useViewer();
  const { currentBeijingDate } = useBeijingClock();
  const selectedOverallSeasonId = view.seasonId;
  const collapsedStatisticsSections = view.collapsedSections;
  const setSelectedOverallSeasonId = (seasonId: string) => onViewChange({ ...view, seasonId });
  const selectionLoadError = selectionError ?? (!currentUser ? "登录后可同步你的追番列表。" : null);
  const selectedAnime = useMemo(() => allAnime.filter((record) => selectedAnimeIds?.includes(record.id)), [selectedAnimeIds]);
  const overallProgress = useMemo(() => sortProgressBySeasonThenWatchedEpisodes(
    progressForAnime(selectedAnime, watchedEpisodes ?? []), seasonIndexByAnimeId,
  ) as AnimeProgress[], [selectedAnime, watchedEpisodes]);
  const overallProgressBySeason = useMemo(() => seasons.map((season, seasonIndex) => ({
    season,
    progress: overallProgress.filter((progress) => seasonIndexByAnimeId.get(progress.record.id) === seasonIndex),
  })).filter(({ progress }) => progress.length).reverse(), [overallProgress]);
  const selectedOverallSeason = seasons.find(({ id }) => id === selectedOverallSeasonId);
  const displayedOverallProgress = selectedOverallSeason
    ? overallProgressBySeason.find(({ season }) => season.id === selectedOverallSeason.id)?.progress ?? []
    : overallProgress;
  const displayedOverallProgressBySeason = overallProgressBySeason;
  const displayedOverallProgressTotals = progressTotals(displayedOverallProgress);
  const todayBroadcasts = useMemo(() => currentBeijingDate
    ? broadcastsForDate(selectedAnime, currentBeijingDate) as BroadcastEvent[]
    : [], [selectedAnime, currentBeijingDate]);
  const isStatisticsSectionCollapsed = (section: StatisticsSection) => collapsedStatisticsSections.includes(section);
  const toggleStatisticsSection = (section: StatisticsSection) => {
    onViewChange({
      ...view, collapsedSections: collapsedStatisticsSections.includes(section)
        ? collapsedStatisticsSections.filter((candidate) => candidate !== section)
        : [...collapsedStatisticsSections, section]
    });
  };

  return <>
    <PageHeading title="追番统计" summary="看过的、正在追的，都在这里。" onSearch={onSearch} />
    <section className="statistics-page" aria-label="我的追番统计">
      {selectedAnimeIds === null || watchedEpisodes === null ? (
        <p className="selection-status" aria-live="polite">
          {selectionLoadError ?? watchedEpisodeError ?? "正在读取你的追番和已看记录…"}
          {selectionLoadError || watchedEpisodeError ? <SignInPrompt /> : null}
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
                        <StatisticsAnimeCard record={event} description={`${event.releaseKind === "network" ? "网络配信 · 时刻未定" : event.broadcastTime} · ${formatEpisodeLabel(event.episodeStart, event.episode)}`} status={isWatched ? "已看" : "待看"} selection={{
                          selectedDate: event.broadcastDate,
                          selectedTime: event.broadcastTime,
                          selectedEpisodeStart: event.episodeStart,
                          selectedEpisode: event.episode,
                          selectedReleaseKind: event.releaseKind === "network" ? "network" : undefined,
                        }} />
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
                        <StatisticsAnimeCard record={progress.record} description={`已看 ${progress.watchedEpisodeCount} / ${progress.record.episodeCount} 集${progress.latestWatchedEpisode === null ? " · 尚未标记观看" : ` · 最后标记第 ${progress.latestWatchedEpisode} 集`}`} status={progressStatusLabel(progress.status)} watchedEpisodeCount={progress.watchedEpisodeCount} />
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
  </>;
}
