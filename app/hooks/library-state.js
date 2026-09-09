import { isEpisodeViewWatched, updateEpisodeViews } from "../../lib/anime-episode-views.js";

// Restore only this request's episodes, keeping other completed mutations intact.
export function restoreEpisodeViews(current, previous, episodeViews) {
  return episodeViews.reduce(
    (records, episodeView) => updateEpisodeViews(
      records,
      episodeView,
      isEpisodeViewWatched(previous, episodeView),
    ),
    current,
  );
}
