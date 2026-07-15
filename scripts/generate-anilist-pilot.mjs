import { writeFile } from "node:fs/promises";

const endpoint = "https://graphql.anilist.co";
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const seasonMonths = Object.freeze({ WINTER: "01", SPRING: "04", SUMMER: "07", FALL: "10" });
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
const SCHEDULE_OVERRIDES = new Map([
  [110350, { date: "2020-01-05", weekday: "Sun", time: "23:30" }],
  [110277, { date: "2020-12-06", weekday: "Sun", time: "23:10" }],
  [131681, { date: "2022-01-09", weekday: "Sun", time: "23:10" }],
]);

const query = `
  query ($page: Int!, $season: MediaSeason!, $year: Int!) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      media(
        type: ANIME
        season: $season
        seasonYear: $year
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

function normalizeMedia(media, season, year) {
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
    media.seasonYear !== year ||
    !["TV", "TV_SHORT", "ONA"].includes(media.format) ||
    !media.title.native ||
    !media.coverImage.large?.startsWith("https://") ||
    (!hasSourceDate && !firstAiring?.airingAt)
  ) {
    throw new Error(`AniList record ${media.id} is incomplete for the pilot`);
  }

  const defaultSchedule = firstAiring
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
  const schedule = SCHEDULE_OVERRIDES.get(media.id) ?? defaultSchedule;

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

async function fetchSeason(season, year) {
  const records = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { page, season, year } }),
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
            media.seasonYear === year &&
            ["TV", "TV_SHORT", "ONA"].includes(media.format),
        )
        .map((media) => normalizeMedia(media, season, year)),
    );
    hasNextPage = result.pageInfo.hasNextPage;
    page += 1;
  }

  return records.sort((left, right) => left.id.localeCompare(right.id));
}

function seasonCatalog(season, anime, year) {
  const month = seasonMonths[season];
  return {
    timeZoneLabel: "北京时间（UTC+8）",
    updatedAt: dateFormatter.format(new Date()).replaceAll("/", "-"),
    catalogCount: anime.length,
    sourceName: "AniList 历史放送记录（试点）",
    sourceUrl: `https://anilist.co/search/anime?year=${year}&season=${season}`,
    anime,
    seasonMonth: month,
  };
}

const year = Number(process.argv[2] ?? "2026");
if (!Number.isInteger(year) || year < 2020 || year > 2026) {
  throw new RangeError("Year must be an integer from 2020 through 2026");
}

const seasonNames = year === 2026 ? ["WINTER", "SPRING"] : ["WINTER", "SPRING", "SUMMER", "FALL"];
const catalogs = await Promise.all(
  seasonNames.map(async (season) => [season, await fetchSeason(season, year)]),
);
const output = `// Generated by scripts/generate-anilist-pilot.mjs. Do not edit by hand.\n\n${catalogs
  .map(([season, records]) => `export const ${season.toLowerCase()}${year} = ${JSON.stringify(seasonCatalog(season, records, year), null, 2)};`)
  .join("\n\n")}\n`;

await writeFile(new URL(`../data/anilist-${year}.js`, import.meta.url), output);
console.log(
  `Generated ${catalogs.map(([season, records]) => `${records.length} ${season.toLowerCase()}`).join(", ")} records for ${year}.`,
);
