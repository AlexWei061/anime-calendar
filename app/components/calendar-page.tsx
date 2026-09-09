import { useMemo, useRef } from "react";
import { addDays, dateOnlyEventsForWeek, eventsForWeek, firstFullWeekStart, seasonForWeek, startOfWeek, weekDays } from "../../lib/calendar.js";
import { progressForAnime } from "../../lib/anime-statistics.js";
import { networkBroadcastLabel } from "../../lib/anime-labels.js";
import { allAnime, seasons, initialSeasonId, initialWeekStart } from "../catalog";
import { weekLabel } from "../display";
import { useBeijingClock } from "../hooks/use-display";
import { useViewer } from "../hooks/use-viewer";
import { useAnimeDetail } from "./anime-detail";
import { PageHeading } from "./page-heading";
import { SignInPrompt } from "./account";
import { CoverArt } from "./cover-art";
import { CalendarSchedule } from "./calendar-schedule";
import { TodayWatch } from "./today-watch";
import { SelectionPanel } from "./selection-panel";
import type { AnimeProgress, CalendarEvent, CalendarLocation, DateOnlyEvent, Season } from "../types";

export function CalendarPage({ activePage, location, onLocationChange, onSearch }: {
  activePage: "all" | "mine";
  location: CalendarLocation;
  onLocationChange: (location: CalendarLocation) => void;
  onSearch: (query: string) => void;
}) {
  const { selectedAnimeIds, watchedEpisodes, watchedEpisodeError } = useViewer();
  const { currentCalendarDate, currentBeijingDate, currentBeijingTime } = useBeijingClock();
  const { weekStart: activeWeekStart, mobileDate: activeMobileDate } = location;
  const openDetail = useAnimeDetail();
  const weeklySectionRef = useRef<HTMLElement>(null);
  const activeSeason = seasonForWeek(seasons, activeWeekStart) as Season;
  const isHistoricalSeason = activeSeason.id !== initialSeasonId;
  const dates = weekDays(activeWeekStart);
  const selectedAnime = useMemo(() => allAnime.filter((record) => selectedAnimeIds?.includes(record.id)), [selectedAnimeIds]);
  const selectedSeasonAnime = useMemo(() => activeSeason.anime.filter((record) => selectedAnimeIds?.includes(record.id)), [activeSeason, selectedAnimeIds]);
  const calendarAnime = activePage === "mine" ? selectedAnime : allAnime;
  const events = useMemo(() => eventsForWeek(calendarAnime, activeWeekStart) as CalendarEvent[], [calendarAnime, activeWeekStart]);
  const dateOnlyEvents = useMemo(() => dateOnlyEventsForWeek(calendarAnime, activeWeekStart) as DateOnlyEvent[], [calendarAnime, activeWeekStart]);
  const overallProgress = useMemo(() => activePage === "mine"
    ? progressForAnime(selectedAnime, watchedEpisodes ?? []) as AnimeProgress[] : [], [activePage, selectedAnime, watchedEpisodes]);
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
  const networkOnly = (activePage === "mine" ? selectedSeasonAnime : activeSeason.anime).filter(
    ({ scheduleWeekday, beijingTime }) => !scheduleWeekday || !beijingTime,
  );

  const changeWeek = (days: number) => {
    const nextWeekStart = addDays(activeWeekStart, days);
    onLocationChange({ weekStart: nextWeekStart, mobileDate: nextWeekStart });
  };
  const changeSeason = (seasonId: string) => {
    const nextSeason = seasons.find(({ id }) => id === seasonId);
    if (!nextSeason) return;
    const nextWeekStart = firstFullWeekStart(nextSeason);
    onLocationChange({ weekStart: nextWeekStart, mobileDate: nextWeekStart });
  };
  const returnToCurrentWeek = () => {
    const date = !isHistoricalSeason ? currentCalendarDate ?? initialWeekStart : firstFullWeekStart(activeSeason);
    onLocationChange({ weekStart: startOfWeek(date), mobileDate: date });
  };
  const scrollToWeeklySchedule = () => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    weeklySectionRef.current?.scrollIntoView({ behavior, block: "start" });
  };

  const jumpToTodaySchedule = () => {
    const date = currentCalendarDate ?? activeWeekStart;
    onLocationChange({ weekStart: startOfWeek(date), mobileDate: date });
    window.requestAnimationFrame(scrollToWeeklySchedule);
  };
  return <>
    <PageHeading title={activePage === "all" ? "播出表" : "我的番剧"}
      summary={activePage === "all" ? `${activeSeason.label} · 共 ${activeSeason.catalogCount} 部 · 北京时间` : `${activeSeason.label} · 按自己的节奏，追喜欢的故事。`}
      onSearch={onSearch}
      metrics={activePage === "mine" ? (
        <dl className="page-metrics" aria-label="我的番剧概览">
          <div>
            <dt>本季在追</dt>
            <dd>{isPersonalProgressLoading ? "读取中" : `${selectedSeasonAnime.length} 部`}</dd>
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
      ) : undefined}>
      <div className="week-tools">
        <label className="season-picker">
          选择季度
          <select value={activeSeason.id} onChange={(event) => changeSeason(event.target.value)}>
            {seasons.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
            ))}
          </select>
        </label>
        <button className="today-jump" type="button" onClick={jumpToTodaySchedule}>今天</button>
      </div>
    </PageHeading>
    {activePage === "mine" ? <TodayWatch selectedAnime={selectedAnime} currentCalendarDate={currentCalendarDate} /> : null}
    {activePage === "all" || calendarAnime.length ? <>
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
            <SignInPrompt />
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

        <CalendarSchedule events={events} dateOnlyEvents={dateOnlyEvents} activeWeekStart={activeWeekStart}
          activeMobileDate={activeMobileDate} setActiveMobileDate={(mobileDate) => onLocationChange({ ...location, mobileDate })}
          currentCalendarDate={currentCalendarDate} currentBeijingDate={currentBeijingDate} currentBeijingTime={currentBeijingTime} />
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
    </> : selectedAnimeIds ? <p className="my-schedule-empty">请先在“选择番剧”中勾选想追的作品。</p> : null}
    {activePage === "mine" ? <SelectionPanel activeSeason={activeSeason} /> : null}
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
  </>;
}
