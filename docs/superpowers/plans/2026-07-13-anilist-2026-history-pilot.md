# AniList 2026 Historical Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add switchable 2026 winter and spring broadcast calendars as a static AniList-backed pilot, while preserving the existing YUC summer calendar and saved-list behaviour.

**Architecture:** A small regeneration script queries the public AniList GraphQL API during development and writes a checked-in JavaScript snapshot. The app consumes a single season catalog: each season owns its static anime records, source label and first display week. The existing weekly calendar stays unchanged; AniList timestamps are normalized to Beijing first-airing date and time before they are written to the snapshot.

**Tech Stack:** Next 16 / React 19, Node 22 built-in `fetch`, Node built-in test runner, existing CSS and Cloudflare D1 selection route.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `scripts/generate-anilist-pilot.mjs` | Fetches AniList winter and spring 2026 TV/TV-short/ONA pages, converts their first airing to Beijing fields, and writes the static snapshot. |
| `data/anilist-2026.js` | Generated static pilot records for the two historical seasons; no browser-time API request. |
| `data/anime.js` | Keeps the existing July catalog and exports `seasons` plus `allAnime` for the app and API. |
| `app/page.tsx` | Adds the season selector and scopes the calendar and selection panel to the active season. |
| `app/api/anime-selections/route.ts` | Validates selections against every locally shipped season. |
| `app/globals.css` | Lays out the selector using the existing control style. |
| `tests/anime-data.test.mjs` | Verifies season catalog identity, static completeness and pilot field normalization. |
| `tests/rendered-html.test.mjs` | Verifies the server-rendered selector and explicit AniList pilot notice. |

## Task 1: Define the static season catalog and its contract

**Files:**
- Create: `data/anilist-2026.js`
- Modify: `data/anime.js`
- Modify: `tests/anime-data.test.mjs`

- [ ] **Step 1: Write the failing season-catalog test.**

```js
import { allAnime, seasons } from "../data/anime.js";

test("ships static AniList trial catalogs for 2026 winter and spring", () => {
  assert.deepEqual(seasons.map(({ id }) => id), ["2026-winter", "2026-spring", "2026-summer"]);
  for (const id of ["2026-winter", "2026-spring"]) {
    const season = seasons.find((candidate) => candidate.id === id);
    assert.ok(season);
    assert.equal(season.sourceName, "AniList 历史放送记录（试点）");
    assert.ok(season.anime.length > 50);
    assert.ok(season.anime.every(({ id: animeId }) => animeId.startsWith("anilist-")));
    assert.ok(season.anime.every(({ titleZh, titleJa, coverUrl, premiereDateBeijing, scheduleWeekday, beijingTime, episodeCount }) =>
      typeof titleZh === "string" && titleZh.length > 0 &&
      typeof titleJa === "string" && titleJa.length > 0 &&
      /^https:\/\//.test(coverUrl) &&
      /^\d{4}-\d{2}-\d{2}$/.test(premiereDateBeijing) &&
      /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(scheduleWeekday) &&
      /^\d{2}:\d{2}$/.test(beijingTime) &&
      Number.isInteger(episodeCount) && episodeCount > 0,
    ));
  }
  assert.equal(new Set(allAnime.map(({ id }) => id)).size, allAnime.length);
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the exports do not exist.**

Run: `node --test tests/anime-data.test.mjs`

Expected: FAIL with a missing `allAnime` or `seasons` export.

- [ ] **Step 3: Add the minimal catalog exports.**

Keep the existing `season` and `anime` exports untouched for July. Add exactly these catalog fields after them:

```js
export const seasons = [
  { id: "2026-winter", label: "2026 冬番", firstWeekStart: "2026-01-05", timelineStartHour: 4, ...winter2026 },
  { id: "2026-spring", label: "2026 春番", firstWeekStart: "2026-03-30", timelineStartHour: 4, ...spring2026 },
  { id: "2026-summer", firstWeekStart: "2026-06-29", timelineStartHour: 15, ...season, anime },
];

export const allAnime = seasons.flatMap(({ anime: records }) => records);
```

The static pilot records use `titleZh` for AniList `title.native` and `titleJa` for `title.romaji`; the UI copy must state that these two pilot catalogs use AniList original-name data. IDs are `anilist-<numeric id>`, covers use the exported AniList HTTPS cover URL, and the source URL is `https://anilist.co/anime/<id>`.

- [ ] **Step 4: Run the focused data test.**

Run: `node --test tests/anime-data.test.mjs`

Expected: PASS.

## Task 2: Make the AniList snapshot reproducible without runtime network access

**Files:**
- Create: `scripts/generate-anilist-pilot.mjs`
- Modify: `package.json`
- Modify: `tests/anime-data.test.mjs`

- [ ] **Step 1: Extend the failing contract with a recognizable generated-data marker.**

```js
test("keeps the historical pilot as generated local data", async () => {
  const generated = await readFile(new URL("../data/anilist-2026.js", import.meta.url), "utf8");
  assert.match(generated, /Generated by scripts\/generate-anilist-pilot\.mjs/);
  assert.match(generated, /export const winter2026/);
  assert.match(generated, /export const spring2026/);
});
```

- [ ] **Step 2: Run the test and confirm the missing-file failure.**

Run: `node --test tests/anime-data.test.mjs`

Expected: FAIL with `ENOENT` for `data/anilist-2026.js`.

- [ ] **Step 3: Implement the generator using Node built-ins only.**

The script sends a GraphQL `Page` query to `https://graphql.anilist.co` for `WINTER` and `SPRING`, follows pages until `hasNextPage` is false, and keeps only rows whose returned `season`, `seasonYear` and `format` are respectively the requested season, `2026`, and one of `TV`, `TV_SHORT`, or `ONA`. It converts the first `airingSchedule.nodes` UNIX timestamp with `Intl.DateTimeFormat` in `Asia/Shanghai`, derives `premiereEpisodeCount` from identical first timestamps, and uses `media.episodes ?? highest scheduled episode` for `episodeCount`. Rows without a native title, cover, complete start date, episode count or first airing timestamp must fail the script rather than silently generate invalid calendar data.

It writes `data/anilist-2026.js` through `writeFile`, beginning with the generated-data marker above. Add this package script:

```json
"generate:anilist-pilot": "node scripts/generate-anilist-pilot.mjs"
```

- [ ] **Step 4: Generate the snapshot and run the data tests.**

Run: `npm run generate:anilist-pilot && node --test tests/anime-data.test.mjs`

Expected: PASS with two non-empty, static pilot catalogs.

## Task 3: Add the smallest useful season switcher

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `lib/calendar.js`
- Modify: `tests/calendar.test.mjs`
- Modify: `app/api/anime-selections/route.ts`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Write the failing rendered-page assertions.**

Add these assertions to the first HTML rendering test:

```js
assert.match(html, /<label class="season-picker"/);
assert.match(html, /2026 冬番/);
assert.match(html, /2026 春番/);
assert.match(html, /AniList 历史放送记录（试点）/);
```

And add this source check to the durability test:

```js
assert.match(page, /const \[activeSeasonId, setActiveSeasonId\] = useState/);
assert.match(page, /setActiveWeekStart\(nextSeason\.firstWeekStart\)/);
assert.match(page, /anime: records/);
```

- [ ] **Step 2: Run the rendering test and verify the selector assertions fail.**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: FAIL because the page has no season selector.

- [ ] **Step 3: Implement the switcher without new dependencies.**

Import `allAnime` and `seasons`; keep July as the initial season. Derive `activeSeason` from `activeSeasonId`, use `activeSeason.anime` for the all-page catalog and the active-season subset for `?page=mine`, and on a `<select>` change set the active season, week and mobile date to `nextSeason.firstWeekStart`. The selector label is `季度`; its option text comes from `season.label`.

Replace hard-coded summer/YUC copy with the active season’s label, count, source name and time-zone label. For the two pilot seasons, show one explicit sentence: `试点名称采用 AniList 原文与罗马音；排期按首集播出时间在北京时间展示。` Keep the existing July wording and layout otherwise. Scope the selector checkbox list to the selected season.

Change the API route’s ID set to `new Set(allAnime.map(({ id }) => id))` so saved historical pilot records are accepted. Do not change the D1 schema.

The AniList samples include a small number of morning releases, so retain July’s 15:00 start but use `timelineStartHour: 4` for the two pilot seasons. Make `timelineOffsetMinutes(time, timelineStartMinutes)` accept an optional start-minute argument while preserving its existing 15:00 default. In the page, derive the hour labels, grid row count and timeline height from `activeSeason.timelineStartHour`; set those values as CSS custom properties on the grid, axis and day columns. CSS must use those properties instead of hard-coded 13 rows and 1288px. Add a calendar test proving `timelineOffsetMinutes("04:00", 4 * 60) === 0` and that an earlier value throws. This keeps all 165 pilot records visible without adding a second calendar implementation.

Add the smallest CSS rule that keeps the label and native `<select>` aligned with existing bordered controls:

```css
.season-picker { display: grid; gap: 0.35rem; color: var(--muted-ink); font-size: 0.82rem; font-weight: 700; }
.season-picker select { min-height: 2.4rem; border: 1px solid var(--line); border-radius: 0.6rem; background: var(--card); color: var(--ink); font: inherit; padding: 0 0.7rem; }
```

- [ ] **Step 4: Run the focused rendering test.**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: PASS.

## Task 4: Verify the complete pilot

**Files:**
- Verify only: all changed files

- [ ] **Step 1: Run lint.**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 2: Run the complete suite.**

Run: `npm test`

Expected: exit code 0 with all tests passing.

- [ ] **Step 3: Review the diff against this plan.**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only the planned data, generator, page, style, API and test files changed.
