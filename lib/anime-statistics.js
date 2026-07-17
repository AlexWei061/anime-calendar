import { addDays, dateOnlyEventsForWeek, eventsForWeek, startOfWeek } from "./calendar.js";

export function progressForAnime(records, watchedEpisodes) {
  return records.map((record) => {
    const watchedEpisodeNumbers = new Set();

    for (const watchedEpisode of watchedEpisodes) {
      if (watchedEpisode.animeId !== record.id) continue;

      for (
        let episode = Math.max(1, watchedEpisode.episodeStart);
        episode <= Math.min(record.episodeCount, watchedEpisode.episode);
        episode += 1
      ) {
        watchedEpisodeNumbers.add(episode);
      }
    }

    const watchedEpisodeCount = watchedEpisodeNumbers.size;
    const latestWatchedEpisode = watchedEpisodeCount ? Math.max(...watchedEpisodeNumbers) : null;
    const status =
      watchedEpisodeCount === 0
        ? "not-started"
        : watchedEpisodeCount === record.episodeCount
          ? "completed"
          : "in-progress";

    return { record, watchedEpisodeCount, latestWatchedEpisode, status };
  });
}

export function progressTotals(progress) {
  return progress.reduce(
    (totals, { status }) => {
      totals.total += 1;
      if (status === "in-progress") totals.inProgress += 1;
      if (status === "completed") totals.completed += 1;
      if (status === "not-started") totals.notStarted += 1;
      return totals;
    },
    { total: 0, inProgress: 0, completed: 0, notStarted: 0 },
  );
}

export function sortProgressByWatchedEpisodes(progress) {
  return [...progress].sort(compareProgressByWatchedEpisodes);
}

export function sortProgressBySeasonThenWatchedEpisodes(progress, seasonIndexByAnimeId) {
  return [...progress].sort(
    (left, right) =>
      (seasonIndexByAnimeId.get(left.record.id) ?? Number.MAX_SAFE_INTEGER) -
        (seasonIndexByAnimeId.get(right.record.id) ?? Number.MAX_SAFE_INTEGER) ||
      compareProgressByWatchedEpisodes(left, right),
  );
}

function compareProgressByWatchedEpisodes(left, right) {
  return (
    right.watchedEpisodeCount - left.watchedEpisodeCount ||
    (right.latestWatchedEpisode ?? 0) - (left.latestWatchedEpisode ?? 0) ||
    left.record.id.localeCompare(right.record.id)
  );
}

export function broadcastsForDate(records, date) {
  const weekStart = startOfWeek(date);
  const timedEvents = [
    ...eventsForWeek(records, addDays(weekStart, -7)),
    ...eventsForWeek(records, weekStart),
  ]
    .filter((event) => event.broadcastDate === date)
    .map((event) => ({ ...event, releaseKind: "scheduled" }));
  const dateOnlyEvents = dateOnlyEventsForWeek(records, weekStart)
    .filter((event) => event.date === date)
    .map((event) => ({ ...event, broadcastDate: event.date, releaseKind: "network" }));

  return [...timedEvents, ...dateOnlyEvents].sort((left, right) => {
    if (left.releaseKind !== right.releaseKind) return left.releaseKind === "scheduled" ? -1 : 1;
    if (left.releaseKind === "scheduled") return left.time.localeCompare(right.time);
    return left.id.localeCompare(right.id);
  });
}
