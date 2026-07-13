# Historical YUC Broadcast Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import every YUC seasonal “new anime” catalog from 2020 winter through the source’s latest season, then let the calendar and saved list browse and collect those historical seasons with clearly labelled estimates.

**Architecture:** A reproducible Node importer turns YUC seasonal pages into a generated lightweight schedule index and one complete-detail JSON file per season. The client loads the index for calendar and collection filtering, then fetches a season’s full details only after a dialog opens; status fields distinguish source values from estimates.

**Tech Stack:** Next 16 / React 19 / TypeScript, Node 22 scripts, Cheerio (development-only HTML parsing), Node built-in test runner, Cloudflare D1 with Drizzle, vinext/Vite.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `lib/yuc-archive.js` | Pure season/date helpers, schedule parsing, normalization and stable global IDs. |
| `scripts/import-yuc-archive.mjs` | Reads YUC archive/page HTML, extracts new-anime tables, writes generated data and reports coverage. |
| `data/yuc/archive-index.js` | Generated lightweight `seasons`, `anime`, `latestSeasonId` and old-ID alias map. |
| `public/yuc-seasons/<season-id>.json` | Generated complete source fields for one season; fetched only for details. |
| `data/anime.js` | Compatibility re-export that replaces the handwritten 2026-only catalog. |
| `lib/yuc-season-details.js` | Validates and looks up a downloaded season-detail document. |
| `app/page.tsx` | Year/season controls, historical calendar, saved-list filtering, pending-date list and detail loading. |
| `app/globals.css` | Controls, pending cards, data-status styles and noon timeline range. |
| `app/api/anime-selections/route.ts` | Global-ID validation and one-way migration of old saved July-2026 IDs. |
| `tests/fixtures/yuc/*.html` | Small 2020/current YUC structures used by parser tests without network access. |
| `tests/yuc-archive.test.mjs` | Parser, date/time/count estimation, global-ID and source-field coverage. |
| `tests/yuc-season-details.test.mjs` | Detail-document validation coverage. |

The D1 schema does not change: `anime_selections.anime_id` already stores strings. On `GET`, legacy IDs are mapped to their current global IDs; a later `PUT` rewrites them as global IDs.

### Task 1: Define and test the archive normalization boundary

**Files:**
- Create: `lib/yuc-archive.js`
- Create: `tests/yuc-archive.test.mjs`
- Create: `tests/fixtures/yuc/202001-new-anime.html`
- Create: `tests/fixtures/yuc/202607-new-anime.html`
- Modify: `tests/calendar.test.mjs`

- [ ] **Step 1: Write failing source-value and estimate tests.**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_BROADCAST_TIME,
  DEFAULT_EPISODE_COUNT,
  normalizeYucRecord,
  seasonForDate,
} from "../lib/yuc-archive.js";

test("keeps YUC raw schedule text and estimates only missing fields", () => {
  const record = normalizeYucRecord({
    season: { id: "2020-winter", year: 2020, startMonth: 1 },
    sourceUrl: "https://yuc.wiki/202001/",
    fields: [["中文名称", "示例作品"], ["日文名称", "サンプル"], ["放送日期", "1/11周六深夜（全6话）"]],
  });
  assert.deepEqual(
    {
      id: record.id,
      premiereDateBeijing: record.premiereDateBeijing,
      scheduleWeekday: record.scheduleWeekday,
      beijingTime: record.beijingTime,
      timeStatus: record.timeStatus,
      episodeCount: record.episodeCount,
      episodeCountStatus: record.episodeCountStatus,
      sourceSchedule: record.sourceSchedule,
    },
    {
      id: "2020-winter:sample",
      premiereDateBeijing: "2020-01-11",
      scheduleWeekday: "Sat",
      beijingTime: DEFAULT_BROADCAST_TIME,
      timeStatus: "estimated",
      episodeCount: 6,
      episodeCountStatus: "exact",
      sourceSchedule: "1/11周六深夜（全6话）",
    },
  );
});

test("keeps date-unknown shows collectible but out of weekly events", () => {
  const record = normalizeYucRecord({
    season: { id: "2020-winter", year: 2020, startMonth: 1 },
    sourceUrl: "https://yuc.wiki/202001/",
    fields: [["中文名称", "日期未定"], ["日文名称", "未定"], ["放送日期", "未定"]],
  });
  assert.equal(record.premiereDateBeijing, null);
  assert.equal(record.dateStatus, "unknown");
  assert.equal(record.beijingTime, null);
  assert.equal(record.episodeCount, DEFAULT_EPISODE_COUNT);
  assert.equal(seasonForDate("2020-07-02").id, "2020-summer");
});
```

- [ ] **Step 2: Run the focused test to prove the module is absent.**

Run: `node --test tests/yuc-archive.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/yuc-archive.js`.

- [ ] **Step 3: Implement the minimal, pure normalizer.**

```js
export const DEFAULT_BROADCAST_TIME = "12:00";
export const DEFAULT_EPISODE_COUNT = 12;

const weekdays = { 日: "Sun", 一: "Mon", 二: "Tue", 三: "Wed", 四: "Thu", 五: "Fri", 六: "Sat" };
const quarterNames = ["winter", "winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "fall", "fall", "fall"];

export function seasonForDate(isoDate) {
  const [, year, month] = /^(\d{4})-(\d{2})-\d{2}$/.exec(isoDate) ?? [];
  if (!year) throw new RangeError(`Invalid ISO date: ${isoDate}`);
  const name = quarterNames[Number(month) - 1];
  const startMonth = { winter: 1, spring: 4, summer: 7, fall: 10 }[name];
  return { id: `${year}-${name}`, year: Number(year), name, startMonth };
}
```

`normalizeYucRecord()` must: preserve ordered `fields`; extract a valid `M/D` date and `周[日一二三四五六]`; extract `全N话/話/集` when present; use 12:00 only when a date exists but an exact clock time does not; use 12 episodes only when no count exists; and use `exact`, `estimated`, or `unknown` for every date/time/count status. Build the ID as `<season-id>:<slug>` with a deterministic short hash when a title has no ASCII slug. Reject impossible dates.

The 2020 fixture must contain a New Anime heading, two source tables with the fields used above, and a following Movie heading/table named `不应导入的剧场版`. The 2026 fixture must contain the current heading/table variant with an image link and one blank row. Both fixtures must be minimal HTML, not downloaded whole pages.

- [ ] **Step 4: Add the noon-range regression test.**

```js
test("accepts the noon slot used for unknown YUC clock times", () => {
  assert.equal(timelineOffsetMinutes("12:00"), 0);
});
```

- [ ] **Step 5: Run focused tests.**

Run: `node --test tests/yuc-archive.test.mjs tests/calendar.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the parsing foundation.**

```bash
git add lib/yuc-archive.js tests/yuc-archive.test.mjs tests/fixtures/yuc/202001-new-anime.html tests/fixtures/yuc/202607-new-anime.html tests/calendar.test.mjs
git commit -m "feat: normalize YUC archive schedules"
```

### Task 2: Build a fixture-tested, reproducible importer

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/import-yuc-archive.mjs`
- Modify: `tests/yuc-archive.test.mjs`

- [ ] **Step 1: Write the failing HTML extraction test.**

```js
import { readFile } from "node:fs/promises";
import { parseYucSeasonPage } from "../scripts/import-yuc-archive.mjs";

test("imports only new-anime tables and keeps all source fields", async () => {
  const html = await readFile(new URL("./fixtures/yuc/202001-new-anime.html", import.meta.url), "utf8");
  const records = parseYucSeasonPage(html, {
    id: "2020-winter", year: 2020, startMonth: 1, sourceUrl: "https://yuc.wiki/202001/",
  });
  assert.equal(records.length, 2);
  assert.equal(records.some(({ titleZh }) => titleZh === "不应导入的剧场版"), false);
  assert.deepEqual(records[0].details, [
    { label: "中文名称", value: "示例作品" },
    { label: "制作公司", value: "示例动画" },
    { label: "播放平台", value: "示例平台" },
  ]);
});
```

- [ ] **Step 2: Run it and capture the missing-export failure.**

Run: `node --test tests/yuc-archive.test.mjs`

Expected: FAIL because `parseYucSeasonPage` is not exported.

- [ ] **Step 3: Install the parser and expose the command.**

Run: `npm install --save-dev cheerio`

Add this exact script to `package.json`:

```json
"import:yuc": "node scripts/import-yuc-archive.mjs"
```

- [ ] **Step 4: Implement extraction, archive discovery and output.**

Export four testable functions: `parseYucSeasonPage(html, season)`, `seasonListFromArchive(html)`, `buildArchive(seasons, pages)`, and `writeArchive(archive, rootDir)`. Their outputs are respectively normalized records, discovered season descriptors, the combined `{ index, detailsBySeason, report }` object, and generated static files.

Use Cheerio to find the New Anime heading and process only its following tables until the next peer section heading. Turn `th`/`td` rows into ordered label/value pairs, remove blank rows, and find each table’s nearest linked cover image. `seasonListFromArchive()` must keep seasonal `YYYY01`, `YYYY04`, `YYYY07`, and `YYYY10` links at or after `202001`; it must not return SP or movie links.

The CLI fetches `https://yuc.wiki/`, discovers seasons, fetches each page sequentially, fails on a non-OK response, writes `data/yuc/archive-index.js` and `public/yuc-seasons/<season-id>.json`, and prints one coverage line per season plus a final total. The index contains lightweight records only; detail arrays stay only in JSON. Add `--fixture <html-file> --season <id>` so parser tests never access the network.

- [ ] **Step 5: Run importer and package script tests.**

Run: `node --test tests/yuc-archive.test.mjs tests/package-scripts.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the importer.**

```bash
git add package.json package-lock.json scripts/import-yuc-archive.mjs tests/yuc-archive.test.mjs
git commit -m "feat: add reproducible YUC archive importer"
```

### Task 3: Generate and validate the historical static archive

**Files:**
- Create: `data/yuc/archive-index.js`
- Create: `public/yuc-seasons/2020-winter.json` through `public/yuc-seasons/<latest>.json`
- Modify: `data/anime.js`
- Modify: `tests/anime-data.test.mjs`

- [ ] **Step 1: Write the failing archive contract.**

```js
import { anime, latestSeasonId, seasons } from "../data/yuc/archive-index.js";

test("ships YUC new-anime seasons from 2020 winter through the latest archive entry", () => {
  assert.equal(seasons[0].id, "2020-winter");
  assert.equal(seasons.at(-1)?.id, latestSeasonId);
  assert.ok(seasons.length >= 27);
  assert.ok(anime.length > 1_000);
  assert.equal(new Set(anime.map(({ id }) => id)).size, anime.length);
  assert.ok(anime.every(({ id }) => /^20\d{2}-(winter|spring|summer|fall):/.test(id)));
  assert.ok(anime.every(({ category }) => category === "new"));
});
```

Also assert that every season has a `public/yuc-seasons/<id>.json` file with `access()`.

- [ ] **Step 2: Run it before data exists.**

Run: `node --test tests/anime-data.test.mjs`

Expected: FAIL with missing generated archive files.

- [ ] **Step 3: Run the importer and inspect its coverage report.**

Run: `npm run import:yuc`

Expected: one report line per 2020-or-later season, no SP/movie URLs, then a final total. Inspect two early and two recent entries plus one undated entry: all must have a global ID, source URL, raw schedule and date/time/count statuses.

- [ ] **Step 4: Convert the old data file into a compatibility export.**

```js
export { anime, latestSeasonId, seasons } from "./yuc/archive-index.js";
```

Delete the handwritten 66-record catalog and local-cover-only assumptions; retain the file name for existing import paths.

- [ ] **Step 5: Run generated-data tests.**

Run: `node --test tests/anime-data.test.mjs tests/yuc-archive.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit generated data separately.**

```bash
git add data/anime.js data/yuc/archive-index.js public/yuc-seasons tests/anime-data.test.mjs
git commit -m "feat: import YUC new anime archive since 2020"
```

### Task 4: Preserve saved selections and validate lazy detail documents

**Files:**
- Create: `lib/yuc-season-details.js`
- Modify: `lib/anime-selections.js`
- Modify: `app/api/anime-selections/route.ts`
- Modify: `tests/anime-selections.test.mjs`
- Create: `tests/yuc-season-details.test.mjs`

- [ ] **Step 1: Write failing migration and detail-validation tests.**

```js
test("maps selections saved by the July-2026-only release", () => {
  assert.deepEqual(
    resolveStoredAnimeIds(["sayonara-lara", "2020-winter:sample"], new Set(["2026-summer:sayonara-lara", "2020-winter:sample"]), {
      "sayonara-lara": "2026-summer:sayonara-lara",
    }),
    ["2026-summer:sayonara-lara", "2020-winter:sample"],
  );
});

test("rejects a malformed season detail document", () => {
  assert.throws(() => readSeasonDetails({ seasonId: "2020-winter", records: [{ id: 1 }] }), /id/);
});
```

- [ ] **Step 2: Run focused tests.**

Run: `node --test tests/anime-selections.test.mjs tests/yuc-season-details.test.mjs`

Expected: FAIL with missing helpers.

- [ ] **Step 3: Implement the narrow compatibility helpers.**

```js
export function resolveStoredAnimeIds(storedIds, validIds, legacyIds) {
  return [...new Set(storedIds.flatMap((id) => {
    if (validIds.has(id)) return [id];
    const migrated = legacyIds[id];
    return migrated && validIds.has(migrated) ? [migrated] : [];
  }))];
}
```

`readSeasonDetails()` must require a string season ID, string record IDs, and ordered `{ label: string, value: string }` entries. `detailsForAnime()` returns the matching valid record or `null`.

- [ ] **Step 4: Update API reads while keeping writes global-only.**

```ts
import { anime, legacyAnimeIds } from "../../../data/yuc/archive-index.js";

const validAnimeIds = new Set(anime.map(({ id }) => id));
// GET: return resolveStoredAnimeIds(storedIds, validAnimeIds, legacyAnimeIds).
// PUT: validateAnimeIds(payload.animeIds, validAnimeIds), then write those global IDs.
```

Do not change `db/schema.ts` or add a migration.

- [ ] **Step 5: Run focused storage tests.**

Run: `node --test tests/anime-selections.test.mjs tests/anime-selection-storage.test.mjs tests/yuc-season-details.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the data-access layer.**

```bash
git add lib/anime-selections.js lib/yuc-season-details.js app/api/anime-selections/route.ts tests/anime-selections.test.mjs tests/yuc-season-details.test.mjs
git commit -m "feat: support historical anime selections"
```

### Task 5: Expand the weekly calendar for historical estimates

**Files:**
- Modify: `lib/calendar.js`
- Modify: `tests/calendar.test.mjs`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Write failing noon and date-unknown event tests.**

```js
test("renders an estimated noon broadcast in the week of its source date", () => {
  const [event] = eventsForWeek([{ ...weeklyShow, beijingTime: "12:00", timeStatus: "estimated" }], "2026-06-29");
  assert.deepEqual({ date: event.date, time: event.time }, { date: "2026-07-01", time: "12:00" });
});

test("does not invent weekly events when the YUC premiere date is unknown", () => {
  assert.deepEqual(
    eventsForWeek([{ ...weeklyShow, premiereDateBeijing: null, scheduleWeekday: null, beijingTime: null }], "2026-06-29"),
    [],
  );
});
```

- [ ] **Step 2: Run the focused test to capture the current range failure.**

Run: `node --test tests/calendar.test.mjs`

Expected: FAIL because `timelineOffsetMinutes("12:00")` is below the current 15:00 boundary.

- [ ] **Step 3: Expand the visual range without changing episode rules.**

```js
export const TIMELINE_START_MINUTES = 12 * 60;
export const TIMELINE_END_MINUTES = 28 * 60;
```

Keep the existing rule that `eventsForWeek()` needs date, weekday, time and episode count. In `app/page.tsx`, render hour labels 12 through 28. In `app/globals.css`, change the time-axis and day height from 13 hourly rows / `1288px` to 16 hourly rows / `1576px`; update existing rendered-CSS assertions accordingly.

- [ ] **Step 4: Run calendar and rendered-contract tests.**

Run: `node --test tests/calendar.test.mjs tests/rendered-html.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the time-range change.**

```bash
git add lib/calendar.js tests/calendar.test.mjs app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: show estimated historical broadcast times"
```

### Task 6: Add year/season browsing and historical collection controls

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Add failing page-contract assertions.**

```js
assert.match(page, /import \{ anime, latestSeasonId, seasons \} from "\.\.\/data\/anime\.js"/);
assert.match(page, /const \[activeSeasonId, setActiveSeasonId\] = useState/);
assert.match(page, /<label[^>]*>年份/);
assert.match(page, /<label[^>]*>季度/);
assert.match(page, /这个季度想追什么？/);
assert.match(page, /record\.seasonId === activeSeason\.id/);
assert.match(page, /日期待定/);
assert.match(page, /changeWeek\(-7\)/);
assert.match(page, /changeWeek\(7\)/);
assert.doesNotMatch(page, /searchParams\.set\("season"/);
```

- [ ] **Step 2: Run the rendered test before UI changes.**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL on the new selectors and pending-list contracts.

- [ ] **Step 3: Implement shared active-season state.**

Import `anime`, `latestSeasonId`, and `seasons`; initialize `activeSeasonId` from `latestSeasonId`; derive `activeSeason`; and use this exact paging behavior:

```ts
const changeSeason = (seasonId: string) => {
  const nextSeason = seasons.find((season) => season.id === seasonId);
  if (!nextSeason) return;
  const nextWeekStart = startOfWeek(nextSeason.startDate);
  setActiveSeasonId(nextSeason.id);
  setActiveWeekStart(nextWeekStart);
  setActiveMobileDate(nextWeekStart);
};

const changeWeek = (days: number) => {
  const nextWeekStart = addDays(activeWeekStart, days);
  setActiveWeekStart(nextWeekStart);
  setActiveMobileDate(nextWeekStart);
  setActiveSeasonId(seasonForDate(addDays(nextWeekStart, 3)).id);
};
```

When the existing Beijing-date effect initializes the current week, also call `setActiveSeasonId(seasonForDate(currentBeijingDate).id)` so a future deployment does not keep a stale generated latest-season label.

Render separate `年份` and `季度` selects. The year select filters the quarter select to existing generated seasons for that year; choosing a year with no matching quarter selects its first listed quarter. The same controls appear on both Broadcast Table and My Anime.

- [ ] **Step 4: Apply all-history and historical-collection filtering.**

For the broadcast table, pass the complete lightweight `anime` index to `eventsForWeek()`, allowing a week to show any season’s active episodes. For My Anime, filter that same index by saved global IDs. In the folded selection list render only `anime.filter((record) => record.seasonId === activeSeason.id)`. Render current-season `dateStatus === "unknown"` records in a `日期待定` section; additionally filter that section by saved IDs on My Anime.

Do not add year, season or week to `window.location`, history, or URL query strings. Keep only the existing `?page=mine` refresh behavior.

- [ ] **Step 5: Update labels, metadata and responsive styles.**

Change the sidebar label to `播出表`, use `这个季度想追什么？`, and set metadata to `番时表｜新番播出表` with description `按 YUC 季度新番页浏览 2020 年起的播出排期、详情与个人追番。`. Add `.season-controls`, `.season-control`, `.pending-section`, `.pending-list` and `.pending-card` rules using current tokens; selectors wrap above the weekly grid on narrow screens.

- [ ] **Step 6: Run the UI contract test.**

Run: `node --test tests/rendered-html.test.mjs`

Expected: PASS, including the no-extra-URL-state assertion.

- [ ] **Step 7: Commit browsing and collection UI.**

```bash
git add app/page.tsx app/globals.css app/layout.tsx tests/rendered-html.test.mjs
git commit -m "feat: browse and collect historical seasons"
```

### Task 7: Load complete season details and label estimates in the dialog

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Add failing dialog-state contracts.**

```js
assert.match(page, /fetch\("\/yuc-seasons\/" \+ selected\.seasonId \+ "\.json"\)/);
assert.match(page, /具体播出时间未知，日历按 12:00 排列/);
assert.match(page, /集数未知，日历按 12 集生成/);
assert.match(page, /首播日期未知，暂无法排入周历/);
assert.match(page, /YUC 原始资料/);
assert.match(page, /完整资料暂未加载/);
assert.doesNotMatch(page, /calendar-event[\s\S]*数据状态/);
```

- [ ] **Step 2: Run the test to verify detail loading is absent.**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL on the new dialog contracts.

- [ ] **Step 3: Implement a validated and abortable dialog fetch.**

Keep the lightweight selected record as immediate dialog content. On `selected` change, fetch `/yuc-seasons/${selected.seasonId}.json`, validate with `readSeasonDetails()`, find the item with `detailsForAnime()`, and track `loading`, `ready`, and `error`. Abort the request in effect cleanup so closing or switching dialogs cannot update stale state.

Build notices only from non-exact values:

```tsx
const notices = [
  selected.dateStatus === "unknown" ? "首播日期未知，暂无法排入周历" : null,
  selected.timeStatus === "estimated" ? "具体播出时间未知，日历按 12:00 排列" : null,
  selected.episodeCountStatus === "estimated" ? "集数未知，日历按 12 集生成" : null,
].filter(Boolean);
```

Render notices only under dialog heading `数据状态`; render raw source text as `YUC 原始排期`; render ordered full fields as `YUC 原始资料`. While loading display `正在加载完整资料…`; after transport or validation failure display `完整资料暂未加载` and retain the source link. Do not put any status chip or wording into `.calendar-event` or `.network-card`.

- [ ] **Step 4: Add focused dialog styles.**

Add `.detail-status`, `.detail-status li`, `.detail-source-schedule`, and `.detail-fields` styles with existing paper, line, blue and mint tokens. Keep native dialog semantics, outside-click close, Escape close and opener focus restoration unchanged.

- [ ] **Step 5: Run detail tests.**

Run: `node --test tests/rendered-html.test.mjs tests/yuc-season-details.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit detail rendering.**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: explain estimated YUC data in details"
```

### Task 8: Document, test, and manually accept the complete archive

**Files:**
- Modify: `README.md`
- Modify: `tests/package-scripts.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Add failing documentation contracts.**

```js
assert.match(readme, /npm run import:yuc/);
assert.match(readme, /2020 年起/);
assert.match(readme, /仅收录.*新番/);
```

- [ ] **Step 2: Run the focused test.**

Run: `node --test tests/package-scripts.test.mjs tests/rendered-html.test.mjs`

Expected: FAIL until the import command and scope are documented.

- [ ] **Step 3: Document the static-data lifecycle.**

Add this README section:

```markdown
## 更新 YUC 历史资料

`npm run import:yuc` 会从 YUC 季度归档读取 2020 年起的“新番”页，生成轻量播出索引和季度详情文件；它不会导入 SP 或剧场版。命令输出每季导入数量和无法解析字段数。提交生成的数据后运行 `npm test`、`npm run lint` 和 `npm run build`。
```

- [ ] **Step 4: Run complete automated verification.**

Run: `npm test`

Expected: PASS for every `tests/*.test.mjs` after a production build.

Run: `npm run lint`

Expected: exit code 0; separately note pre-existing image optimization warnings if any remain.

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 5: Perform manual browser acceptance.**

Run: `npm run dev`

Verify in a browser:

1. Choose 2020 / winter and confirm the week jumps to its first week with imported records.
2. Page backward and forward across one quarter boundary and confirm selectors follow the calendar week.
3. Open one exact record, one 12:00 estimate, one 12-episode estimate and one date-unknown record. Each dialog must show only applicable notices and all fields after its seasonal JSON loads.
4. In My Anime choose an older season, expand `这个季度想追什么？`, save one work, switch seasons and return, then page to its historical broadcast week. The saved work must remain visible.
5. Reload `?page=mine` and confirm My Anime returns. Reload the normal URL and confirm Broadcast Table returns. Confirm year, season and week never appear in the URL.

- [ ] **Step 6: Commit documentation and final contracts.**

```bash
git add README.md tests/package-scripts.test.mjs tests/rendered-html.test.mjs
git commit -m "docs: explain YUC archive updates"
```
