import { useMemo } from "react";
import { dateOnlyEventsForWeek, eventsForWeek, startOfWeek } from "../../lib/calendar.js";
import { episodeViewUnitsForRange, isEpisodeViewWatched } from "../../lib/anime-episode-views.js";
import { shortDate } from "../display";
import { useViewer } from "../hooks/use-viewer";
import { SignInPrompt } from "./account";
import { CalendarEventCard, DateOnlyEventCard } from "./calendar-cards";
import type { Anime, CalendarEvent, DateOnlyEvent } from "../types";

export function TodayWatch({ selectedAnime, currentCalendarDate }: { selectedAnime: Anime[]; currentCalendarDate: string | null; }) {
  const { currentUser, selectedAnimeIds, selectionError, watchedEpisodes, watchedEpisodeError } = useViewer();
  const selectionLoadError = selectionError ?? (!currentUser ? "登录后可同步你的追番列表。" : null);
  const isPersonalProgressLoading = selectedAnimeIds === null || watchedEpisodes === null;
  const todayCalendarEvents = useMemo(() => currentCalendarDate
    ? (eventsForWeek(selectedAnime, startOfWeek(currentCalendarDate)) as CalendarEvent[]).filter((event) => event.date === currentCalendarDate)
    : [], [selectedAnime, currentCalendarDate]);
  const todayCalendarDateOnlyEvents = useMemo(() => currentCalendarDate
    ? (dateOnlyEventsForWeek(selectedAnime, startOfWeek(currentCalendarDate)) as DateOnlyEvent[]).filter((event) => event.date === currentCalendarDate)
    : [], [selectedAnime, currentCalendarDate]);
  const todayPendingEpisodeCount = useMemo(() => [...todayCalendarEvents, ...todayCalendarDateOnlyEvents]
    .reduce((total, event) => total + episodeViewUnitsForRange(event).filter((unit) =>
      !isEpisodeViewWatched(watchedEpisodes ?? [], { animeId: event.id, ...unit }),
    ).length, 0), [todayCalendarEvents, todayCalendarDateOnlyEvents, watchedEpisodes]);
  return (
    <section className="today-watch-section" aria-labelledby="today-watch-heading">
      <div className="section-heading">
        <div>
          <h2 id="today-watch-heading">今日播出</h2>
          {currentCalendarDate ? <p>{shortDate(currentCalendarDate)} · 凌晨节目计入前一天</p> : null}
        </div>
        {!isPersonalProgressLoading ? <p>待看 {todayPendingEpisodeCount} 集</p> : null}
      </div>
      {isPersonalProgressLoading ? (
        <p className="selection-status" aria-live="polite">
          {selectionLoadError ?? watchedEpisodeError ?? "正在读取你的追番和已看记录…"}
          {selectionLoadError || watchedEpisodeError ? <SignInPrompt /> : null}
        </p>
      ) : todayCalendarEvents.length || todayCalendarDateOnlyEvents.length ? (
        <div className="today-watch-list">
          {todayCalendarEvents.map((event) => <CalendarEventCard key={event.id + "-" + event.episodeStart + "-" + event.episode} event={event} showTime />)}
          {todayCalendarDateOnlyEvents.map((event) => <DateOnlyEventCard key={event.id} event={event} />)}
        </div>
      ) : (
        <p className="selection-status">今天没有追番更新，可以慢慢补完之前的故事。</p>
      )}
    </section>
  );
}
