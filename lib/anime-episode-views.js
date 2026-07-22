export function episodeViewKey({ animeId, episodeStart, episode }) {
  return animeId + ":" + episodeStart + "-" + episode;
}

// 与 eventsForWeek / dateOnlyEventsForWeek 的展开规则保持一致的可标记单元：
// 先行或连播多集合并为一个范围键，其余每集一个键，排期未覆盖的集数按单集补齐。
export function episodeViewUnitsForAnime(record) {
  const units = [];

  if (record.episodeSchedules?.length) {
    for (const schedule of record.episodeSchedules) {
      if (schedule.intervalDays === 0) {
        units.push({ episodeStart: schedule.episodeStart, episode: schedule.episodeEnd });
      } else {
        for (let episode = schedule.episodeStart; episode <= schedule.episodeEnd; episode += 1) {
          units.push({ episodeStart: episode, episode });
        }
      }
    }
  } else {
    units.push({ episodeStart: 1, episode: record.premiereEpisodeCount ?? 1 });
  }

  const coveredEpisodes = new Set();
  for (const unit of units) {
    for (let episode = unit.episodeStart; episode <= unit.episode; episode += 1) {
      coveredEpisodes.add(episode);
    }
  }
  for (let episode = 1; episode <= record.episodeCount; episode += 1) {
    if (!coveredEpisodes.has(episode)) units.push({ episodeStart: episode, episode });
  }

  return units.sort(
    (left, right) => left.episodeStart - right.episodeStart || left.episode - right.episode,
  );
}

export function updateEpisodeViews(watchedEpisodes, watchedEpisode, watched) {
  const key = episodeViewKey(watchedEpisode);
  if (watched) {
    return watchedEpisodes.some((candidate) => episodeViewKey(candidate) === key)
      ? watchedEpisodes
      : [...watchedEpisodes, watchedEpisode];
  }
  return watchedEpisodes.filter((candidate) => episodeViewKey(candidate) !== key);
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
    episode > anime.episodeCount ||
    !episodeViewUnitsForAnime(anime).some(
      (unit) => unit.episodeStart === episodeStart && unit.episode === episode,
    )
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
