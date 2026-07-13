"use client";

import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { anime, season } from "../data/anime.js";
import {
  addDays,
  eventsForWeek,
  formatBroadcastTime,
  formatEpisodeLabel,
  groupEventsByTime,
  layoutTimelineEvents,
  startOfWeek,
  timelineOffsetMinutes,
  weekDays,
} from "../lib/calendar.js";

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const initialWeekStart = "2026-07-06";
const timelineHours = Array.from({ length: 14 }, (_, index) => 15 + index);

type Anime = (typeof anime)[number];
type CalendarEvent = Anime & {
  date: string;
  episodeStart: number;
  episode: number;
  time: string;
};
type SelectedAnime = Anime & {
  selectedDate?: string;
  selectedEpisodeStart?: number;
  selectedEpisode?: number;
};
type Page = "all" | "mine";

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

function compactDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return Number(month) + "/" + Number(day);
}

function weekLabel(dates: string[]) {
  return shortDate(dates[0]) + " — " + shortDate(dates[dates.length - 1]);
}

export default function Home() {
  const [activePage, setActivePage] = useState<Page>("all");
  const [selected, setSelected] = useState<SelectedAnime | null>(null);
  const [selectedAnimeIds, setSelectedAnimeIds] = useState<string[] | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
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
  const dates = weekDays(activeWeekStart);
  const displayedAnime =
    activePage === "mine" ? anime.filter((record) => selectedAnimeIds?.includes(record.id)) : anime;
  const events = eventsForWeek(displayedAnime, activeWeekStart) as CalendarEvent[];
  const dayEventGroups = dates.map((date) =>
    groupEventsByTime(events.filter((event) => event.date === date)),
  );
  const activeMobileEventGroups = dayEventGroups[dates.indexOf(activeMobileDate)] ?? [];
  const networkOnly = displayedAnime.filter(
    ({ scheduleWeekday, beijingTime }) => !scheduleWeekday || !beijingTime,
  );

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
    if (activePage !== "mine" || selectedAnimeIds !== null) return;

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

  const changeWeek = (days: number) => {
    const nextWeekStart = addDays(activeWeekStart, days);
    setActiveWeekStart(nextWeekStart);
    setActiveMobileDate(nextWeekStart);
  };

  const returnToCurrentWeek = () => {
    const date = currentBeijingDate ?? initialWeekStart;
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

  const openDetail = (
    record: Anime,
    opener: HTMLButtonElement,
    selectedDate?: string,
    selectedEpisodeStart?: number,
    selectedEpisode?: number,
  ) => {
    openerRef.current = opener;
    setSelected({ ...record, selectedDate, selectedEpisodeStart, selectedEpisode });
  };

  const handleDialogClose = () => {
    setSelected(null);
    openerRef.current?.focus();
  };

  const eventButton = (event: CalendarEvent, layout?: { lane: number; laneCount: number }) => {
    const isToday = event.date === currentBeijingDate;
    const displayTime = formatBroadcastTime(event.time);
    const episodeLabel = formatEpisodeLabel(event.episodeStart, event.episode);
    const eventStyle = layout
      ? ({
          "--event-top": timelineOffsetMinutes(event.time) * 1.6 + "px",
          "--event-left": (layout.lane / layout.laneCount) * 100 + "%",
          "--event-width": 100 / layout.laneCount + "%",
        } as CSSProperties)
      : undefined;

    return (
      <button
        className={
          "calendar-event" + (layout ? " timeline-event" : "") + (isToday ? " is-today" : "")
        }
        key={event.id + "-" + event.episode}
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
          openDetail(event, clickEvent.currentTarget, event.date, event.episodeStart, event.episode)
        }
        style={eventStyle}
      >
        <img className="calendar-event-cover" src={event.coverUrl} alt="" loading="lazy" />
        <span className="calendar-event-content">
          <strong>{event.titleZh}</strong>
          <span className="calendar-event-episode">{episodeLabel}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="site-shell">
      <nav className="page-sidebar" aria-label="页面导航">
        <p className="site-name">番时表</p>
        <button
          className={activePage === "all" ? "is-active" : ""}
          type="button"
          aria-current={activePage === "all" ? "page" : undefined}
          onClick={() => setActivePage("all")}
        >
          全部夏番
        </button>
        <button
          className={activePage === "mine" ? "is-active" : ""}
          type="button"
          aria-current={activePage === "mine" ? "page" : undefined}
          onClick={() => setActivePage("mine")}
        >
          我的番剧{selectedAnimeIds ? " · " + selectedAnimeIds.length + " 部" : ""}
        </button>
      </nav>
      <main className="calendar-page">
      <header className="calendar-header">
        <div>
          <p className="season-kicker">{activePage === "all" ? season.label : "我的番剧"}</p>
          <h1>{activePage === "all" ? "2026 夏番时间表" : "我的番剧时间表"}</h1>
          <p className="intro">
            {activePage === "all"
              ? "共 " +
                season.catalogCount +
                " 部夏番，从首播日起按周显示；未明确集数的作品暂按 12 集安排，时间均为北京时间。"
              : "勾选想追的番剧，只查看属于你的播出时间表。"}
          </p>
        </div>
        <a
          className="source-link"
          href={season.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {season.sourceName} <span aria-hidden="true">↗</span>
        </a>
      </header>

      {activePage === "mine" ? (
        <section className="anime-selection-panel" aria-labelledby="anime-selection-heading">
          <div className="section-heading">
            <div>
              <p className="section-kicker">选择番剧</p>
              <h2 id="anime-selection-heading">本季度想追什么？</h2>
            </div>
            <p>选择会自动保存，并在登录同一 ChatGPT 账号的设备间同步。</p>
          </div>
          {selectedAnimeIds ? (
            <div className="anime-selection-list">
              {anime.map((record) => (
                <label className="anime-selection" key={record.id}>
                  <input
                    type="checkbox"
                    checked={selectedAnimeIds.includes(record.id)}
                    disabled={isSavingSelection}
                    onChange={() => void toggleAnimeSelection(record.id)}
                  />
                  <span>{record.titleZh}</span>
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
        </section>
      ) : null}

      {activePage === "all" || displayedAnime.length ? (
        <>
      <section className="weekly-section" aria-labelledby="weekly-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">放送安排</p>
            <h2 id="weekly-heading">一周放送安排</h2>
          </div>
          <p>节目以首播日期起每周重复，播满对应集数后不再显示。</p>
        </div>

        <nav className="week-pager" aria-label="日历周导航">
          <button type="button" onClick={() => changeWeek(-7)} aria-label="上一周">
            上一周
          </button>
          <p aria-live="polite">{weekLabel(dates)}</p>
          <button type="button" onClick={returnToCurrentWeek}>
            回到本周
          </button>
          <button type="button" onClick={() => changeWeek(7)} aria-label="下一周">
            下一周
          </button>
        </nav>

        <div className="time-grid-scroll">
          <div className="timeline-grid" aria-label={weekLabel(dates) + " 放送安排"}>
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
            <div className="timeline-axis" aria-hidden="true">
              {timelineHours.map((hour) => (
                <time
                  className={"timeline-hour" + (hour === 28 ? " is-timeline-end" : "")}
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
            {!activeMobileEventGroups.length ? (
              <p>当天没有排定放送。</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="network-section" aria-labelledby="network-heading">
        <div>
          <p className="section-kicker">完整季表</p>
          <h2 id="network-heading">网络放送／固定时刻未列出</h2>
          <p>YUC 列有首播日期，但未给出固定周播时刻的作品。</p>
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
              <img src={record.coverUrl} alt={record.coverAlt} loading="lazy" />
              <span>
                <strong>{record.titleZh}</strong>
                <small>{record.titleJa}</small>
                <em>
                  {record.premiereDateBeijing
                    ? "YUC 首播 · " + record.premiereDateBeijing
                    : "YUC 未列出首播日期"}
                </em>
              </span>
            </button>
          ))}
        </div>
      </section>

      <footer className="calendar-footer">
        <p>
          数据来源：{" "}
          <a href={season.sourceUrl} target="_blank" rel="noreferrer">
            {season.sourceName}
          </a>
          ，更新于 {season.updatedAt}。
        </p>
        <p>周表时刻按 YUC 公开排期展示为 {season.timeZoneLabel}。</p>
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
          <img className="detail-cover" src={selected.coverUrl} alt={selected.coverAlt} />
          <p className="detail-title-zh">{selected.titleZh}</p>
          <h2 id="anime-detail-title">{selected.titleJa}</h2>
          <dl>
            <div>
              <dt>本次放送</dt>
              <dd>
                {selected.selectedDate
                  ? selected.selectedDate +
                    " " +
                    (selected.beijingTime
                      ? formatBroadcastTime(selected.beijingTime)
                      : "具体时刻未列出") +
                    (selected.selectedEpisode
                      ? " · " +
                        formatEpisodeLabel(
                          selected.selectedEpisodeStart ?? selected.selectedEpisode,
                          selected.selectedEpisode,
                        )
                      : "")
                  : "从 " +
                    (selected.premiereDateBeijing ?? "待确认") +
                    " 起每周放送"}
              </dd>
            </div>
            <div>
              <dt>YUC 首播排期</dt>
              <dd>
                {selected.premiereDateBeijing
                  ? selected.premiereDateBeijing +
                    " " +
                    (selected.beijingTime
                      ? formatBroadcastTime(selected.beijingTime)
                      : "具体时刻未列出")
                  : "待确认"}
              </dd>
            </div>
            <div>
              <dt>排期来源</dt>
              <dd>{selected.station ?? "待确认"}</dd>
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
