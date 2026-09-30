"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { episodeViewKey, episodeViewUnitsForAnime, isEpisodeViewWatched } from "../../lib/anime-episode-views.js";
import { progressForAnime } from "../../lib/anime-statistics.js";
import { formatBroadcastTime, formatEpisodeLabel } from "../../lib/calendar.js";
import { progressStatusLabel } from "../display";
import { useViewer } from "../hooks/use-viewer";
import { CoverArt, detailCoverSheetUrl } from "./cover-art";
import { SignInPrompt } from "./account";
import type { Anime, AnimeProgress, DetailSelection, SelectedAnime } from "../types";

type OpenDetail = (record: Anime, opener: HTMLButtonElement, selection?: DetailSelection) => void;
const AnimeDetailContext = createContext<OpenDetail | null>(null);
export function useAnimeDetail() {
  const open = useContext(AnimeDetailContext);
  if (!open) throw new Error("AnimeDetailProvider is missing");
  return open;
}

const loadedDetailCoverSheets = new Set<string>();

function preloadDetailCoverSheet(coverUrl: string) {
  const sheetUrl = detailCoverSheetUrl(coverUrl);
  if (!sheetUrl || loadedDetailCoverSheets.has(sheetUrl)) return sheetUrl;
  const image = new Image();
  image.onload = image.onerror = () => {
    loadedDetailCoverSheets.add(sheetUrl);
  };
  image.src = sheetUrl;
  return sheetUrl;
}
export function AnimeDetailProvider({ children }: { children: ReactNode; }) {
  const { currentUser, authLoaded, selectedAnimeIds, isSavingSelection, watchedEpisodes, savingEpisodeKeys, toggleAnimeSelection, toggleEpisodeView } = useViewer();
  const [selected, setSelected] = useState<SelectedAnime | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const selectedBroadcastTime =
    selected?.selectedReleaseKind === "network"
      ? undefined
      : selected
        ? selected.selectedTime ?? selected.beijingTime
        : undefined;

  const selectedProgress = useMemo(() => selected
    ? progressForAnime([selected], watchedEpisodes ?? [])[0] as AnimeProgress | undefined
    : null, [selected, watchedEpisodes]);
  const selectedEpisodeUnits = useMemo(() => selected ? episodeViewUnitsForAnime(selected) : [], [selected]);
  const selectedCoverSheetUrl = selected ? detailCoverSheetUrl(selected.coverUrl) : null;
  const [loadedCoverSheetUrl, setLoadedCoverSheetUrl] = useState<string | null>(null);
  const isDetailCoverLoaded = !selectedCoverSheetUrl ||
    loadedDetailCoverSheets.has(selectedCoverSheetUrl) || loadedCoverSheetUrl === selectedCoverSheetUrl;
  useEffect(() => {
    if (selected && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [selected]);
  useEffect(() => {
    if (!selectedCoverSheetUrl || loadedDetailCoverSheets.has(selectedCoverSheetUrl)) return;
    let isCurrent = true;
    const image = new Image();
    image.onload = image.onerror = () => {
      loadedDetailCoverSheets.add(selectedCoverSheetUrl);
      if (isCurrent) setLoadedCoverSheetUrl(selectedCoverSheetUrl);
    };
    image.src = selectedCoverSheetUrl;
    return () => {
      isCurrent = false;
    };
  }, [selectedCoverSheetUrl]);
  const openDetail = useCallback((
    record: Anime,
    opener: HTMLButtonElement,
    selection: DetailSelection = {},
  ) => {
    openerRef.current = opener;
    preloadDetailCoverSheet(record.coverUrl);
    setSelected({ ...record, ...selection });
  }, []);
  const handleDialogClose = () => {
    setSelected(null);
    openerRef.current?.focus();
  };

  return <AnimeDetailContext.Provider value={openDetail}>
    {children}
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
        <CoverArt anime={selected} className={"detail-cover" + (isDetailCoverLoaded ? "" : " is-loading")} variant="detail" />
        <h2 id="anime-detail-title">{selected.titleZh}</h2>
        <p className="detail-title-ja">{selected.titleJa}</p>
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
                (selected.premiereKind === "network" ? " 网络配信" : "") +
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
          {selected.premiereKind === "network" && selected.episodeSchedules?.length ? (
            <div>
              <dt>电视播出</dt>
              <dd>
                {selected.episodeSchedules[0].broadcastDateBeijing +
                  " " +
                  formatBroadcastTime(selected.episodeSchedules[0].beijingTime) +
                  " · " +
                  (selected.scheduleChannel ?? selected.station ?? "待确认")}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>集数</dt>
            <dd>
              {selected.episodeCount} 集
              {selected.episodeCountStatus === "estimated"
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
            <SignInPrompt />
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
  </AnimeDetailContext.Provider>;
}
