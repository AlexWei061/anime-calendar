export function episodeViewKey({ animeId, episodeStart, episode }) {
  return animeId + ":" + episodeStart + "-" + episode;
}

export function validateEpisodeView(value, animeById) {
  if (!value || typeof value !== "object") {
    throw new TypeError("watched episode must be an object");
  }

  const { animeId, episodeStart, episode } = value;
  if (typeof animeId !== "string") {
    throw new TypeError("animeId must be a string");
  }

  const anime = animeById.get(animeId);
  if (!anime) {
    throw new RangeError("Unknown anime ID: " + animeId);
  }
  if (
    !Number.isInteger(episodeStart) ||
    !Number.isInteger(episode) ||
    episodeStart < 1 ||
    episode < episodeStart ||
    episode > anime.episodeCount
  ) {
    throw new RangeError("Invalid episode range");
  }

  return { animeId, episodeStart, episode };
}

export function filterKnownEpisodeViews(value, animeById) {
  if (!Array.isArray(value)) {
    throw new TypeError("watchedEpisodes must be an array");
  }

  const seen = new Set();
  const watchedEpisodes = [];
  for (const candidate of value) {
    try {
      const watchedEpisode = validateEpisodeView(candidate, animeById);
      const key = episodeViewKey(watchedEpisode);
      if (!seen.has(key)) {
        seen.add(key);
        watchedEpisodes.push(watchedEpisode);
      }
    } catch {
      // 已删除作品或损坏的旧记录不应重新出现在用户日历中。
    }
  }
  return watchedEpisodes;
}
