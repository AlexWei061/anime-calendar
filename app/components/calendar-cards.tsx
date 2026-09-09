import type { CSSProperties } from "react";
import { formatBroadcastTime, formatEpisodeLabel, timelineOffsetMinutes } from "../../lib/calendar.js";
import { episodeViewKey, episodeViewUnitsForRange, isEpisodeViewWatched } from "../../lib/anime-episode-views.js";
import { useViewer } from "../hooks/use-viewer";
import { CoverArt } from "./cover-art";
import { useAnimeDetail } from "./anime-detail";
import type { CalendarEvent, DateOnlyEvent } from "../types";

export function CalendarEventCard({ event, layout, showTime = false, currentCalendarDate, timelineStartMinutes = 5 * 60, timelineEndMinutes = 29 * 60 }: {
  event: CalendarEvent;
  layout?: { lane: number; laneCount: number; };
  showTime?: boolean;
  currentCalendarDate: string | null;
  timelineStartMinutes?: number;
  timelineEndMinutes?: number;
}) {
  const { watchedEpisodes, savingEpisodeKeys, toggleEpisodeView } = useViewer();
  const openDetail = useAnimeDetail();
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
        title={layout && layout.laneCount > 1 ? `${event.titleZh} · ${episodeLabel}` : undefined}
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
          <span className="calendar-event-episode">
            {showTime ? <><time className="calendar-event-time">{displayTime}</time> · </> : null}
            {episodeLabel}
          </span>
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
        <span aria-hidden="true">{isWatched ? "✓" : null}</span>
      </button>
    </div>
  );
}

export function DateOnlyEventCard({ event }: { event: DateOnlyEvent; }) {
  const openDetail = useAnimeDetail();
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
}
