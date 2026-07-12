"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { anime, season } from "../data/anime.js";
import { groupByBeijingWeekday, toBeijingAiring } from "../lib/schedule.js";

const weekdays = [
  { key: "Mon", label: "周一" },
  { key: "Tue", label: "周二" },
  { key: "Wed", label: "周三" },
  { key: "Thu", label: "周四" },
  { key: "Fri", label: "周五" },
  { key: "Sat", label: "周六" },
  { key: "Sun", label: "周日" },
] as const;

type Anime = (typeof anime)[number];

const grouped = groupByBeijingWeekday(anime);
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
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function subscribeToBeijingDate(onStoreChange: () => void) {
  const interval = window.setInterval(onStoreChange, 60_000);
  return () => window.clearInterval(interval);
}

function getServerBeijingDate() {
  return null;
}

export default function Home() {
  const [selected, setSelected] = useState<Anime | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const currentBeijingDate = useSyncExternalStore<string | null>(
    subscribeToBeijingDate,
    getBeijingDate,
    getServerBeijingDate,
  );
  const selectedAiring = selected ? toBeijingAiring(selected) : null;

  const handleDialogClose = () => {
    setSelected(null);
    openerRef.current?.focus();
  };

  useEffect(() => {
    if (selected && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [selected]);

  const renderAnimeCard = (
    record: Anime,
    airing: ReturnType<typeof toBeijingAiring>,
    contextLabel: string,
  ) => {
    const isToday = airing?.date === currentBeijingDate;

    return (
      <button
        className={`anime-card${isToday ? " is-today" : ""}`}
        key={record.id}
        type="button"
        aria-haspopup="dialog"
        aria-label={`查看《${record.titleZh}／${record.titleJa}》详情：${contextLabel}`}
        onClick={(event) => {
          openerRef.current = event.currentTarget;
          setSelected(record);
        }}
      >
        <span className="cover-frame">
          <img src={record.coverUrl} alt={record.coverAlt} loading="lazy" />
        </span>
        {airing ? <span className="anime-card-date">{airing.date}</span> : null}
        {isToday ? <span className="today-marker">今天</span> : null}
        <strong>{record.titleZh}</strong>
        <span className="anime-card-ja">{record.titleJa}</span>
        <span className="anime-card-time">{contextLabel}</span>
      </button>
    );
  };

  return (
    <main className="calendar-page">
      <header className="calendar-header">
        <div>
          <p className="season-kicker">{season.label}</p>
          <h1>日本 TV 动画首播周历</h1>
          <p className="intro">
            共 {season.catalogCount} 部夏番；周历仅显示可可靠换算的 7 月日本 TV 首播。
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

      <section className="weekly-section" aria-labelledby="weekly-heading">
        <div className="section-heading">
          <div>
            <p className="section-kicker">周视图</p>
            <h2 id="weekly-heading">北京时间首播</h2>
          </div>
          <p>点击节目可查看封面、首播平台与官方资料页。</p>
        </div>

        <div className="week-grid">
          {weekdays.map((weekday) => {
            const records: Anime[] = grouped.byWeekday[weekday.key];

            return (
              <article className="week-column" key={weekday.key} aria-label={weekday.label}>
                <header className="weekday-header">
                  <h3>{weekday.label}</h3>
                  <span>{records.length} 部</span>
                </header>
                <div className="anime-list">
                  {records.map((record) => {
                    const airing = toBeijingAiring(record);
                    return airing
                      ? renderAnimeCard(record, airing, `北京时间 · ${weekday.label} ${airing.time}`)
                      : null;
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="catalog-section" aria-labelledby="catalog-heading">
        <div>
          <p className="section-kicker">完整季表</p>
          <h2 id="catalog-heading">本季收录／播出待确认</h2>
          <p>
            {season.catalogCount} 部夏番中，以下作品不具备可放入 7 月北京时间周历的完整首播信息。
          </p>
        </div>
        <div className="catalog-grid">
          {[...grouped.seasonal, ...grouped.pending].map((record) =>
            renderAnimeCard(
              record,
              null,
              record.premiereDateJst
                ? `日本首播 · ${record.premiereDateJst}${record.station ? ` · ${record.station}` : ""}`
                : record.station
                  ? `首播时间待确认 · ${record.station}`
                  : "首播时间待确认",
            ),
          )}
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
        <p>仅列出日本 TV 最早首播，时间已换算为 {season.timeZoneLabel}。</p>
      </footer>

      {selected ? (
        <dialog
          ref={dialogRef}
          className="detail-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="anime-detail-title"
          onClose={handleDialogClose}
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
              <dt>北京时间</dt>
              <dd>
                {selectedAiring
                  ? `${selectedAiring.weekday} · ${selectedAiring.date} ${selectedAiring.time}`
                  : "待确认"}
              </dd>
            </div>
            <div>
              <dt>原始日本时间</dt>
              <dd>
                {selected.premiereDateJst
                  ? `${selected.premiereDateJst} ${selected.jstTime ?? "时间待确认"}`
                  : "待确认"}
              </dd>
            </div>
            <div>
              <dt>首播平台</dt>
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
  );
}
