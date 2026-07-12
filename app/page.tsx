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

  return (
    <main className="calendar-page">
      <header className="calendar-header">
        <div>
          <p className="season-kicker">{season.label}</p>
          <h1>日本 TV 动画首播周历</h1>
          <p className="intro">按 {season.timeZoneLabel} 查看最早首播时段。</p>
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
          <p>点击节目可查看首播平台与官方资料页。</p>
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
                    if (!airing) return null;
                    const isToday =
                      currentBeijingDate !== null && airing.date === currentBeijingDate;

                    return (
                      <button
                        className={`anime-card${isToday ? " is-today" : ""}`}
                        key={record.id}
                        type="button"
                        aria-haspopup="dialog"
                        aria-label={`查看《${record.titleJa}》详情：北京时间 ${airing.date} ${airing.time}`}
                        onClick={(event) => {
                          openerRef.current = event.currentTarget;
                          setSelected(record);
                        }}
                      >
                        <span className="anime-card-date">{airing.date}</span>
                        {isToday ? <span className="today-marker">今天</span> : null}
                        <strong>{record.titleJa}</strong>
                        <span className="anime-card-time">
                          北京时间 · {weekday.label} {airing.time}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="pending-section" aria-labelledby="pending-heading">
        <div>
          <p className="section-kicker">待更新</p>
          <h2 id="pending-heading">时间待确认</h2>
        </div>
        <ul>
          {grouped.pending.map((record) => (
            <li key={record.id}>
              <strong>{record.titleJa}</strong>
              <span>{record.station ? `首播平台：${record.station}` : "首播平台待确认"}</span>
            </li>
          ))}
        </ul>
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

      {selected && selectedAiring ? (
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
          <h2 id="anime-detail-title">{selected.titleJa}</h2>
          <dl>
            <div>
              <dt>北京时间</dt>
              <dd>
                {selectedAiring.weekday} · {selectedAiring.date} {selectedAiring.time}
              </dd>
            </div>
            <div>
              <dt>原始日本时间</dt>
              <dd>
                {selected.premiereDateJst} {selected.jstTime}
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
            查看官方资料 <span aria-hidden="true">↗</span>
          </a>
        </dialog>
      ) : null}
    </main>
  );
}
