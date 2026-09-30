import { useMemo, useSyncExternalStore, type CSSProperties } from "react";
import { TIMELINE_EVENT_DURATION_MINUTES, formatBroadcastTime, groupEventsByTime, layoutTimelineEvents, timelineBoundsForEvents, timelineMarkerForDateTime, weekDays } from "../../lib/calendar.js";
import { weekdays } from "../catalog";
import { shortDate, compactDate, weekLabel } from "../display";
import { useBeijingClock } from "../hooks/use-display";
import { CalendarEventCard, DateOnlyEventCard } from "./calendar-cards";
import type { CalendarEvent, DateOnlyEvent } from "../types";

type CalendarLayout = "both" | "desktop" | "mobile";

let mobileLayoutQuery: MediaQueryList | null = null;

function getMobileLayoutQuery() {
  if (typeof window === "undefined") return null;
  mobileLayoutQuery ??= window.matchMedia("(max-width: 860px)");
  return mobileLayoutQuery;
}

function subscribeCalendarLayout(onStoreChange: () => void) {
  const query = getMobileLayoutQuery();
  query?.addEventListener("change", onStoreChange);
  return () => query?.removeEventListener("change", onStoreChange);
}

function getCalendarLayoutSnapshot(): CalendarLayout {
  return getMobileLayoutQuery()?.matches ? "mobile" : "desktop";
}

// 服务端与首次客户端渲染（hydration）都返回 "both"，SSR HTML 保持桌面＋移动两套
// DOM 逐字节不变；挂载后 useSyncExternalStore 读到真实快照并收敛到匹配的一套，
// 挂载前的 CSS display:none 规则保证首屏视觉不变。
function getServerCalendarLayoutSnapshot(): CalendarLayout {
  return "both";
}

function useCalendarLayout() {
  return useSyncExternalStore(subscribeCalendarLayout, getCalendarLayoutSnapshot, getServerCalendarLayoutSnapshot);
}

export function CalendarSchedule({ events, dateOnlyEvents, activeWeekStart, activeMobileDate, setActiveMobileDate }: {
  events: CalendarEvent[];
  dateOnlyEvents: DateOnlyEvent[];
  activeWeekStart: string;
  activeMobileDate: string;
  setActiveMobileDate: (date: string) => void;
}) {
  const { currentCalendarDate, currentBeijingDate, currentBeijingTime } = useBeijingClock();
  const calendarLayout = useCalendarLayout();
  const dates = useMemo(() => weekDays(activeWeekStart), [activeWeekStart]);
  const defaultTimelineStartMinutes = 5 * 60;
  const defaultTimelineEndMinutes = 29 * 60;
  const { startMinutes: timelineStartMinutes, endMinutes: timelineEndMinutes } =
    timelineBoundsForEvents(events, defaultTimelineStartMinutes, defaultTimelineEndMinutes);
  const timelineHourCount = (timelineEndMinutes - timelineStartMinutes) / 60;
  const timelineEndHour = timelineEndMinutes / 60;
  const timelineHours = Array.from(
    { length: timelineHourCount + 1 },
    (_, index) => timelineStartMinutes / 60 + index,
  );
  const timelineStyle = {
    "--timeline-event-height": TIMELINE_EVENT_DURATION_MINUTES * 1.6 + "px",
    "--timeline-hour-count": String(timelineHourCount),
    "--timeline-height": timelineHourCount * 96 + TIMELINE_EVENT_DURATION_MINUTES * 1.6 + "px",
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

  const dayEventGroups = useMemo(() => dates.map((date) => groupEventsByTime(events.filter((event) => event.date === date))), [dates, events]);
  const dayDateOnlyEvents = useMemo(() => dates.map((date) => dateOnlyEvents.filter((event) => event.date === date)), [dates, dateOnlyEvents]);
  const positionedDayEvents = useMemo(() => dates.map((date) => layoutTimelineEvents(events.filter((event) => event.date === date))), [dates, events]);
  const activeMobileEventGroups = dayEventGroups[dates.indexOf(activeMobileDate)] ?? [];
  const activeMobileDateOnlyEvents = dayDateOnlyEvents[dates.indexOf(activeMobileDate)] ?? [];
  const eventButton = (event: CalendarEvent, layout?: { lane: number; laneCount: number; }) =>
    <CalendarEventCard key={event.id + "-" + event.episodeStart + "-" + event.episode} event={event} layout={layout} timelineStartMinutes={timelineStartMinutes} timelineEndMinutes={timelineEndMinutes} />;
  const dateOnlyEventButton = (event: DateOnlyEvent) => <DateOnlyEventCard key={event.id} event={event} />;
  return <>
    {calendarLayout !== "mobile" ? (
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
          const positionedEvents = positionedDayEvents[index];

          return (
            <section
              className={"timeline-day" + (isToday ? " is-today" : "")}
              key={date}
              aria-label={weekdays[index] + " " + date}
            >
              {currentTimelineMarker ? (
                <div className="timeline-current-time" style={currentTimelineMarkerStyle} aria-hidden="true" />
              ) : null}
              {positionedEvents.map((positioned) =>
                eventButton(positioned.event, positioned),
              )}
            </section>
          );
        })}
      </div>
    </div>
    ) : null}

    {calendarLayout !== "desktop" ? (
    <div className="mobile-calendar" aria-label="移动端日程">
      <div className="mobile-day-picker" role="group" aria-label="选择日期">
        {dates.map((date, index) => (
          <button
            className={
              (date === activeMobileDate ? "is-selected" : "") +
              (date === currentCalendarDate ? " is-today" : "")
            }
            key={date}
            type="button"
            aria-current={date === activeMobileDate ? "date" : undefined}
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
            <div className="time-group-events">
              {groupedEvents.map((event) => eventButton(event))}
            </div>
          </section>
        ))}
        {!activeMobileEventGroups.length && !activeMobileDateOnlyEvents.length ? (
          <p>当天没有排定放送。</p>
        ) : null}
      </div>
    </div>
    ) : null}
  </>;
}
