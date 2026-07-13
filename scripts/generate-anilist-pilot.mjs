import { writeFile } from "node:fs/promises";

const endpoint = "https://graphql.anilist.co";
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const query = `
  query ($page: Int!, $season: MediaSeason!) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      media(
        type: ANIME
        season: $season
        seasonYear: 2026
        format_in: [TV, TV_SHORT, ONA]
        sort: POPULARITY_DESC
      ) {
        id
        season
        seasonYear
        format
        title { native romaji }
        coverImage { large }
        startDate { year month day }
        episodes
        airingSchedule(notYetAired: false, page: 1, perPage: 100) {
          nodes { episode airingAt }
        }
      }
    }
  }
`;

function beijingDateTime(timestamp) {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(timestamp * 1000))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, time: `${parts.hour}:${parts.minute}` };
}

function normalizeMedia(media, season) {
  const airings = [...media.airingSchedule.nodes].sort(
    (left, right) => left.airingAt - right.airingAt || left.episode - right.episode,
  );
  const firstAiring = airings[0];
  const maximumEpisode = airings.length ? Math.max(...airings.map(({ episode }) => episode)) : null;
  const episodeCount = media.episodes ?? maximumEpisode ?? 12;
  const episodeCountStatus = media.episodes || maximumEpisode ? "exact" : "estimated";
  const hasSourceDate = media.startDate.year && media.startDate.month && media.startDate.day;

  if (
    media.season !== season ||
    media.seasonYear !== 2026 ||
    !["TV", "TV_SHORT", "ONA"].includes(media.format) ||
    !media.title.native ||
    !media.coverImage.large?.startsWith("https://") ||
    (!hasSourceDate && !firstAiring?.airingAt)
  ) {
    throw new Error(`AniList record ${media.id} is incomplete for the pilot`);
  }

  const schedule = firstAiring
    ? (() => {
        const { date, time } = beijingDateTime(firstAiring.airingAt);
        const premiereEpisodeCount = Math.max(
          ...airings.filter(({ airingAt }) => airingAt === firstAiring.airingAt).map(({ episode }) => episode),
        );
        return {
          date,
          time,
          weekday: weekdayNames[new Date(`${date}T00:00:00Z`).getUTCDay()],
          ...(premiereEpisodeCount > 1 ? { premiereEpisodeCount } : {}),
        };
      })()
    : {
        date: `${media.startDate.year}-${String(media.startDate.month).padStart(2, "0")}-${String(
          media.startDate.day,
        ).padStart(2, "0")}`,
        time: null,
        weekday: null,
      };

  return {
    id: `anilist-${media.id}`,
    episodeCount,
    episodeCountStatus,
    ...("premiereEpisodeCount" in schedule ? { premiereEpisodeCount: schedule.premiereEpisodeCount } : {}),
    titleZh: media.title.native,
    titleJa: media.title.romaji ?? media.title.native,
    coverUrl: media.coverImage.large,
    coverAlt: `${media.title.native} 封面`,
    premiereDateBeijing: schedule.date,
    scheduleWeekday: schedule.weekday,
    beijingTime: schedule.time,
    timeStatus: schedule.time ? "exact" : "unknown",
    station: schedule.time ? "AniList 首集排期（试点）" : "AniList 首播日期（试点）",
    sourceUrl: `https://anilist.co/anime/${media.id}`,
  };
}

async function fetchSeason(season) {
  const records = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { page, season } }),
    });
    const payload = await response.json();
    if (!response.ok || payload.errors) {
      throw new Error(`AniList ${season} page ${page} request failed`);
    }

    const result = payload.data.Page;
    records.push(
      ...result.media
        .filter(
          (media) =>
            media.season === season &&
            media.seasonYear === 2026 &&
            ["TV", "TV_SHORT", "ONA"].includes(media.format),
        )
        .map((media) => normalizeMedia(media, season)),
    );
    hasNextPage = result.pageInfo.hasNextPage;
    page += 1;
  }

  return records.sort((left, right) => left.id.localeCompare(right.id));
}

function seasonCatalog(season, anime) {
  const month = season === "WINTER" ? "01" : "04";
  return {
    timeZoneLabel: "北京时间（UTC+8）",
    updatedAt: dateFormatter.format(new Date()).replaceAll("/", "-"),
    catalogCount: anime.length,
    sourceName: "AniList 历史放送记录（试点）",
    sourceUrl: `https://anilist.co/search/anime?year=2026&season=${season}`,
    anime,
    seasonMonth: month,
  };
}

const [winterAnime, springAnime] = await Promise.all([fetchSeason("WINTER"), fetchSeason("SPRING")]);
const output = `// Generated by scripts/generate-anilist-pilot.mjs. Do not edit by hand.\n\nexport const winter2026 = ${JSON.stringify(seasonCatalog("WINTER", winterAnime), null, 2)};\n\nexport const spring2026 = ${JSON.stringify(seasonCatalog("SPRING", springAnime), null, 2)};\n`;

await writeFile(new URL("../data/anilist-2026.js", import.meta.url), output);
console.log(`Generated ${winterAnime.length} winter and ${springAnime.length} spring records.`);
