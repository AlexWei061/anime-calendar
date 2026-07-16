# しょぼいカレンダー历史排期校正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以しょぼいカレンダー已发生的日本电视播出记录，校正全站 2020 至 2025 年作品和已播出的 2026 年作品的首播日、北京时间、首播连播、固定周播与实际改档；保持原有作品 ID、YUC 中文名、封面、集数和季度归属不变。

**Architecture:** 新的纯数据模块解析并校验しょぼい XML、筛选日本电视台的非重播记录、将 JST 转为北京时间，并把逐集记录压缩为连续排期段。一个可重复运行的年度导入脚本生成本地原始快照和未匹配报告；现有 YUC 历史生成器将已验证快照合入运行时目录。周历优先展开实际排期段，仍保持旧数据的「首播 + 固定周播」兼容路径。

**Tech Stack:** Node.js 22 内置 `fetch` 与 `node:test`、ESM、现有 Next.js 16 / React 19 / vinext。不得新增解析依赖；XML 只读取本项目需要的固定字段。

---

## 数据合同

### 原始快照

每年新增 `data/syoboi-history-<year>.js`，只存本项目已唯一匹配的条目和人工复核结果：

```js
export const syoboiHistory2020 = Object.freeze({
  generatedAt: "2026-07-16",
  sourceName: "しょぼいカレンダー",
  sourceUrl: "https://cal.syoboi.jp/",
  entries: Object.freeze([
    Object.freeze({
      recordId: "anilist-110350",
      tid: 5518,
      titleJa: "ID:INVADED イド：インヴェイデッド",
      channel: "TOKYO MX",
      sourceUrl: "https://cal.syoboi.jp/tid/5518",
      episodeSchedules: Object.freeze([
        Object.freeze({
          episodeStart: 1,
          episodeEnd: 1,
          broadcastDateBeijing: "2020-01-05",
          beijingTime: "23:00",
          intervalDays: 7,
        }),
      ]),
    }),
  ]),
  unmatched: Object.freeze([]),
  ambiguous: Object.freeze([]),
});
```

`episodeSchedules` 是压缩段：`intervalDays: 7` 表示从 `episodeStart` 至 `episodeEnd` 每周同一时刻，`intervalDays: 0` 表示同一时刻的首播连播范围；任何改档、停播后复播、换台或换时刻都成为独立段。导入器只写入已有实际记录，绝不由未来节目表推断未播集数。

### 运行时记录

合并后的历史记录保留现有字段，并可多出：

```js
{
  episodeSchedules,
  scheduleSourceName: "しょぼいカレンダー",
  scheduleSourceUrl: "https://cal.syoboi.jp/tid/5518",
  scheduleChannel: "TOKYO MX",
}
```

原有 `sourceUrl` 仍是对应的 YUC 季度目录。`premiereDateBeijing`、`scheduleWeekday`、`beijingTime`、`premiereEpisodeCount` 和可选 `regularBroadcastStartDateBeijing` 从压缩段生成，供网络放送分组、详情和没有逐集段的旧记录继续使用。

## Task 1: 建立可离线验证的しょぼい XML 与排期纯函数

**Files:**

- Create: `lib/syoboi.js`
- Create: `tests/syoboi.test.mjs`
- Modify: `tests/calendar.test.mjs`

- [ ] **Step 1: 先写失败的 XML、标题和时间转换测试。**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  choosePrimaryTelevisionSchedule,
  compressEpisodeSchedules,
  parseProgLookup,
  parseTitleLookup,
  syoboiJstToBeijing,
} from "../lib/syoboi.js";

test("parses XML entities and only the requested title fields", () => {
  assert.deepEqual(
    parseTitleLookup('<TitleItem><TID>5518</TID><Title>ID:INVADED &amp; Test</Title><FirstYear>2020</FirstYear><FirstMonth>1</FirstMonth></TitleItem>'),
    [{ tid: 5518, title: "ID:INVADED & Test", firstYear: 2020, firstMonth: 1 }],
  );
});

test("converts a JST midnight record to the preceding Beijing date", () => {
  assert.deepEqual(syoboiJstToBeijing("20200106_000000"), {
    broadcastDateBeijing: "2020-01-05",
    beijingTime: "23:00",
  });
});

test("rejects reruns and chooses the earliest Japanese television premiere", () => {
  const programs = parseProgLookup(`
    <ProgItem><PID>1</PID><StTime>20200105_230000</StTime><Count>1</Count><Flag>8</Flag><Deleted>0</Deleted><ChID>1</ChID></ProgItem>
    <ProgItem><PID>2</PID><StTime>20200106_000000</StTime><Count>1</Count><Flag>0</Flag><Deleted>0</Deleted><ChID>2</ChID></ProgItem>
  `);
  assert.deepEqual(
    choosePrimaryTelevisionSchedule(programs, new Map([[1, { kind: "television" }], [2, { kind: "television" }]])),
    { channelId: 2, firstProgramId: 2 },
  );
});

test("keeps a same-slot double premiere and separates a later weekly run", () => {
  assert.deepEqual(
    compressEpisodeSchedules([
      { episodeStart: 1, episodeEnd: 2, broadcastDateBeijing: "2026-07-04", beijingTime: "23:00" },
      { episodeStart: 3, episodeEnd: 3, broadcastDateBeijing: "2026-07-12", beijingTime: "23:00" },
      { episodeStart: 4, episodeEnd: 4, broadcastDateBeijing: "2026-07-19", beijingTime: "23:00" },
    ]),
    [
      { episodeStart: 1, episodeEnd: 2, broadcastDateBeijing: "2026-07-04", beijingTime: "23:00", intervalDays: 0 },
      { episodeStart: 3, episodeEnd: 4, broadcastDateBeijing: "2026-07-12", beijingTime: "23:00", intervalDays: 7 },
    ],
  );
});
```

Include fixture strings for a deleted row, a non-TV channel, `Count` omitted but subtitle `#1〜#2`, a changed time, and malformed XML field. Tests must assert that malformed / unnumbered entries are reported rather than coerced into an episode number.

- [ ] **Step 2: 运行聚焦测试，确认缺少模块而失败。**

Run: `node --test tests/syoboi.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/syoboi.js`.

- [ ] **Step 3: 实现最小且无依赖的解析与选择函数。**

`lib/syoboi.js` exports the following pure API:

```js
export function decodeXmlText(value) { /* decodes named and numeric XML entities */ }
export function parseTitleLookup(xml) { /* returns TID/title/year/month rows */ }
export function parseChannelLookup(xml) { /* returns ChID/name/classification rows */ }
export function parseProgLookup(xml) { /* returns PID/StTime/Count/SubTitle/Flag/Deleted/ChID rows */ }
export function episodeRange(program) { /* Count first, then #N/#N〜#M subtitle */ }
export function syoboiJstToBeijing(stTime) { /* validates YYYYMMDD_HHMMSS and subtracts one hour */ }
export function choosePrimaryTelevisionSchedule(programs, channels) { /* earliest non-rerun valid TV row */ }
export function compressEpisodeSchedules(episodes) { /* coalesces only exact 7-day consecutive runs */ }
```

Use an element-tag extractor that accepts arbitrary tag ordering but only recognizes `TitleItem`, `ChItem`, and `ProgItem`. Decode XML before interpreting numbers. A program is eligible only when `Deleted === 0`, `(Flag & 0x8) === 0`, it has a parseable `StTime`, a valid episode range, and its `ChID` resolves to a Japanese broadcast-TV channel. Keep channel classification deliberately conservative: unknown, internet, radio, repeat-only and non-Japanese channels are ineligible. `choosePrimaryTelevisionSchedule()` groups rows by eligible `ChID`, chooses the channel with the earliest valid episode 1 record, and returns only that channel’s actual episode rows.

Do not turn source timestamps into UI-style `25:00` values: output strict `00:00`–`23:59` Beijing wall-clock values. Existing `layoutBroadcast()` remains the sole place that presents Beijing 00:00–04:59 as the preceding day’s “次日” lane.

- [ ] **Step 4: 扩展周历测试，锁定压缩段行为。**

Add to `tests/calendar.test.mjs`:

```js
test("uses verified episode schedule segments without extrapolating the final segment", () => {
  const record = {
    id: "verified-2026", titleZh: "示例", titleJa: "例", episodeCount: 12,
    premiereDateBeijing: "2026-07-04", scheduleWeekday: "Sun", beijingTime: "23:00",
    episodeSchedules: [
      { episodeStart: 1, episodeEnd: 2, broadcastDateBeijing: "2026-07-04", beijingTime: "23:00", intervalDays: 0 },
      { episodeStart: 3, episodeEnd: 4, broadcastDateBeijing: "2026-07-12", beijingTime: "23:00", intervalDays: 7 },
    ],
  };
  assert.deepEqual(
    eventsForWeek([record], "2026-07-13").map(({ episodeStart, episode, broadcastDate, time }) => ({ episodeStart, episode, broadcastDate, time })),
    [{ episodeStart: 4, episode: 4, broadcastDate: "2026-07-19", time: "23:00" }],
  );
  assert.equal(eventsForWeek([record], "2026-08-03").length, 0);
});
```

- [ ] **Step 5: 完成 `lib/calendar.js` 的优先路径，再运行聚焦测试。**

Add a small internal `eventsFromEpisodeSchedules(record, dates)` helper. When `record.episodeSchedules` is a nonempty array, expand each segment exactly through `episodeEnd`, call existing `layoutBroadcast()`, preserve the range card for `intervalDays: 0`, and return no inferred events beyond the supplied segments. Otherwise retain the existing weekly loop unchanged.

Run: `node --test tests/syoboi.test.mjs tests/calendar.test.mjs`

Expected: PASS. Existing records without `episodeSchedules` must retain every prior assertion.

- [ ] **Step 6: Commit the testable scheduling foundation.**

```bash
git add lib/syoboi.js lib/calendar.js tests/syoboi.test.mjs tests/calendar.test.mjs
git commit -m "feat: support verified broadcast schedules"
```

## Task 2: 编写可重复运行的しょぼい年度快照生成器

**Files:**

- Create: `scripts/generate-syoboi-history.mjs`
- Modify: `package.json`
- Modify: `tests/syoboi.test.mjs`

- [ ] **Step 1: 写出快照构建和歧义拒绝的失败测试。**

```js
import {
  buildYearSnapshot,
  resolveSyoboiTitle,
} from "../scripts/generate-syoboi-history.mjs";

test("accepts only a one-to-one normalized title in its broadcast year", () => {
  const match = resolveSyoboiTitle(
    { id: "anilist-110350", titleJa: "ID:INVADED イド：インヴェイデッド", anilistTitleJa: "ID:INVADED" },
    [{ tid: 5518, title: "ID:INVADED イド：インヴェイデッド", firstYear: 2020, firstMonth: 1 }],
    2020,
  );
  assert.deepEqual(match, { status: "matched", tid: 5518 });
});

test("writes ambiguous names to the report instead of selecting one", () => {
  const snapshot = buildYearSnapshot({
    year: 2020,
    catalog: [{ id: "same-name", titleJa: "同名作品", anilistTitleJa: "同名作品" }],
    titles: [
      { tid: 1, title: "同名作品", firstYear: 2020, firstMonth: 1 },
      { tid: 2, title: "同名作品", firstYear: 2020, firstMonth: 1 },
    ],
    channels: new Map(),
    programsByTid: new Map(),
  });
  assert.deepEqual(snapshot.entries, []);
  assert.deepEqual(snapshot.ambiguous, [{ recordId: "same-name", candidateTids: [1, 2] }]);
});
```

- [ ] **Step 2: 确认测试因未导出函数失败。**

Run: `node --test tests/syoboi.test.mjs`

Expected: FAIL because `generate-syoboi-history.mjs` has no exports.

- [ ] **Step 3: 实现标题匹配、请求和快照写入。**

Add this script in `package.json`:

```json
"generate:syoboi-history": "node scripts/generate-syoboi-history.mjs"
```

`scripts/generate-syoboi-history.mjs` must export `normalizeSyoboiTitle`, `resolveSyoboiTitle`, `buildYearSnapshot`, and `writeYearSnapshot` for offline tests, then expose a CLI:

```bash
npm run generate:syoboi-history -- 2020
```

The CLI reads the existing year’s YUC and AniList source records without changing them. It makes requests sequentially with a distinctive `User-Agent: anime-calendar-schedule-audit/1.0 (+https://github.com/AlexWei061/anime-calendar)` and a 125 ms delay between calls:

1. Fetch `TitleLookup` once and `ChLookup` once from `https://cal.syoboi.jp/db.php`.
2. Build candidates from `titleJa`, AniList Japanese titles, and an explicit `SYOBOI_TITLE_ALIASES` map. Normalize Unicode width, whitespace, punctuation and known subtitle delimiters; do not use edit distance or substring guessing.
3. Constrain candidates to `FirstYear` in `[year - 1, year]` and the selected YUC season’s range. A title remains `unmatched` or `ambiguous` unless exactly one TID survives.
4. For every uniquely matched TID, fetch `ProgLookup` over `YYYY0101_000000-(YYYY+1)0101_000000`. If a source response reaches 5,000 rows, split that TID query into calendar-quarter ranges before proceeding.
5. Use the pure functions from Task 1 to select one valid Japanese TV channel and compress only verified episode records.
6. Write `data/syoboi-history-<year>.js` with its entries, `unmatched`, `ambiguous`, and `skipped` reasons. The generated module must be deterministic apart from its declared `generatedAt` date and sorted by `recordId` / `tid`.

Keep `SYOBOI_TITLE_ALIASES` separate from `TITLE_ALIASES`: it maps a stable local `record.id` to a specific Syoboi title/TID only after an ambiguity has been manually reviewed. Never hide a new unmatched item by adding an automatic fallback.

- [ ] **Step 4: 运行离线测试。**

Run: `node --test tests/syoboi.test.mjs tests/package-scripts.test.mjs`

Expected: PASS without network access and without adding a new dependency or lockfile change.

- [ ] **Step 5: Commit the importer.**

```bash
git add package.json scripts/generate-syoboi-history.mjs tests/syoboi.test.mjs
git commit -m "feat: import verified Syoboi broadcast history"
```

## Task 3: 让历史目录优先合并已验证快照

**Files:**

- Modify: `scripts/generate-yuc-history-pilot.mjs`
- Modify: `tests/anime-data.test.mjs`
- Modify: `tests/syoboi.test.mjs`

- [ ] **Step 1: 为合并规则写失败测试。**

```js
test("keeps YUC identity fields while replacing only verified schedule fields", () => {
  const record = enrichYucRecord(
    { titleZh: "异度侵入", titleJa: "ID:INVADED イド：インヴェイデッド", coverUrl: "https://example.test/id.webp" },
    { id: "anilist-110350", episodes: 13, startDate: { year: 2020, month: 1, day: 6 } },
    { sourceUrl: "https://yuc.wiki/202001/", coverUrl: "/covers/yuc/history-2020-01-01.webp" },
    {
      tid: 5518, channel: "TOKYO MX", sourceUrl: "https://cal.syoboi.jp/tid/5518",
      episodeSchedules: [{ episodeStart: 1, episodeEnd: 13, broadcastDateBeijing: "2020-01-05", beijingTime: "23:00", intervalDays: 7 }],
    },
  );
  assert.equal(record.titleZh, "异度侵入");
  assert.equal(record.coverUrl, "/covers/yuc/history-2020-01-01.webp");
  assert.equal(record.sourceUrl, "https://yuc.wiki/202001/");
  assert.equal(record.scheduleSourceName, "しょぼいカレンダー");
  assert.equal(record.scheduleChannel, "TOKYO MX");
  assert.equal(record.premiereDateBeijing, "2020-01-05");
  assert.equal(record.beijingTime, "23:00");
  assert.deepEqual(record.episodeSchedules, [{ episodeStart: 1, episodeEnd: 13, broadcastDateBeijing: "2020-01-05", beijingTime: "23:00", intervalDays: 7 }]);
});
```

Also assert that an unmatched snapshot leaves the existing AniList-derived schedule and its source fields exactly unchanged.

- [ ] **Step 2: 运行目标测试，确认当前函数签名和输出不支持快照。**

Run: `node --test tests/anime-data.test.mjs tests/syoboi.test.mjs`

Expected: FAIL because `enrichYucRecord()` does not accept a Syoboi entry or expose schedule provenance.

- [ ] **Step 3: 最小化扩展现有生成器。**

Load `data/syoboi-history-<year>.js` when present and index its `entries` by stable `recordId`. Pass the matching entry to `enrichYucRecord()` after the existing YUC/AniList identity matching completes. For a valid entry:

1. Copy `episodeSchedules`, `scheduleSourceName`, `scheduleSourceUrl`, `scheduleChannel`.
2. Derive the summary fields from the first segment: `premiereDateBeijing`, its weekday, `beijingTime`, and `premiereEpisodeCount` only when the first segment starts at 1 with `intervalDays: 0` and spans multiple episodes.
3. Use the first `intervalDays: 7` segment after the premiere to set `scheduleWeekday` and `regularBroadcastStartDateBeijing`; if there is no such segment, preserve `null` rather than inventing a fixed weekly slot.
4. Leave ID allocation, title fields, episode count, YUC `sourceUrl`, cover lookup, sprite mapping, and `season.updatedAt` behavior untouched.

If no snapshot exists (or no entry matches) retain the exact old AniList result. Do not download covers and do not regenerate sprites during this task.

- [ ] **Step 4: Add three public-data regressions.**

After the 2020 snapshot has been generated, assert the following against `allAnime` and `eventsForWeek`:

```js
const idInvaded = allAnime.find(({ anilistId }) => anilistId === 110350);
assert.equal(idInvaded?.premiereDateBeijing, "2020-01-05");
assert.equal(idInvaded?.beijingTime, "23:00");

const aotPartOne = allAnime.find(({ anilistId }) => anilistId === 110277);
assert.equal(aotPartOne?.premiereDateBeijing, "2020-12-06");
assert.equal(aotPartOne?.beijingTime, "23:10");

const aotPartTwo = allAnime.find(({ anilistId }) => anilistId === 131681);
assert.equal(aotPartTwo?.premiereDateBeijing, "2022-01-09");
assert.equal(aotPartTwo?.beijingTime, "23:10");
```

Use each season’s actual record IDs if generated IDs do not retain `anilistId`; the test must verify the user-visible dates, times, premiere episode range, and no extra future events.

- [ ] **Step 5: Run focused tests.**

Run: `node --test tests/anime-data.test.mjs tests/calendar.test.mjs tests/syoboi.test.mjs`

Expected: PASS with the old generated directories still valid before the first snapshot is imported.

- [ ] **Step 6: Commit the merge path.**

```bash
git add scripts/generate-yuc-history-pilot.mjs tests/anime-data.test.mjs tests/syoboi.test.mjs
git commit -m "feat: merge verified broadcast schedules"
```

## Task 4: 以 2020 年执行可审计试点

**Files:**

- Create: `data/syoboi-history-2020.js`
- Modify: `data/yuc-history-2020.js`
- Modify: `tests/anime-data.test.mjs`

- [ ] **Step 1: 获取并生成 2020 原始快照。**

Run: `npm run generate:syoboi-history -- 2020`

Expected: 打印 `matched`、`unmatched`、`ambiguous`、`skipped` 数量；在 `data/syoboi-history-2020.js` 中保留每条采用频道、TID、来源链接和逐集压缩段。请求失败必须停止且不改写半份快照。

- [ ] **Step 2: 逐项复核报告并只补充明确别名。**

Review: `data/syoboi-history-2020.js`

For each `ambiguous` item, inspect the candidate TIDs’ season、日文名 and first broadcast. Add a `SYOBOI_TITLE_ALIASES` entry only if exactly one candidate is demonstrably the local record. Rerun the same command until no automatically selectable record remains in `ambiguous`; `unmatched` and `skipped` remain visible and continue using existing data.

- [ ] **Step 3: 合并快照到运行时历史目录。**

Run: `npm run generate:yuc-history-pilot -- 2020`

Expected: only `data/yuc-history-2020.js` schedule/provenance fields change; card count, stable IDs, Chinese/Japanese titles and logical cover paths do not change.

- [ ] **Step 4: 把用户报告的 2020 / 2021 情况固定为数据回归。**

Add assertions for ID:INVADED’s 2020-01-05 23:00 weekly start and Attack on Titan Final Season Part 1’s 2020-12-06 23:10, 16 episode records (the latter will be populated in Task 5). Confirm that `eventsForWeek` shows episode 1 for each premiere week and does not put the completed 2020 records in the network-only group.

- [ ] **Step 5: 完整试点验证。**

Run: `npm run lint -- --ignore-pattern .worktrees && npm test && git diff --check`

Expected: lint has zero errors; the build-worker and all node tests pass; diff has no whitespace errors.

- [ ] **Step 6: Commit 2020’s generated evidence.**

```bash
git add data/syoboi-history-2020.js data/yuc-history-2020.js tests/anime-data.test.mjs
git commit -m "fix: audit 2020 broadcast schedules"
```

## Task 5: 按年完成 2021–2025 的已播历史校正

**Files:**

- Create: `data/syoboi-history-2021.js` through `data/syoboi-history-2025.js`
- Modify: `data/yuc-history-2021.js` through `data/yuc-history-2025.js`
- Modify: `tests/anime-data.test.mjs`

- [ ] **Step 1: 每年生成快照并先审报告，再合并目录。**

Run one year at a time, in this exact order:

```bash
npm run generate:syoboi-history -- 2021
npm run generate:yuc-history-pilot -- 2021
npm run generate:syoboi-history -- 2022
npm run generate:yuc-history-pilot -- 2022
npm run generate:syoboi-history -- 2023
npm run generate:yuc-history-pilot -- 2023
npm run generate:syoboi-history -- 2024
npm run generate:yuc-history-pilot -- 2024
npm run generate:syoboi-history -- 2025
npm run generate:yuc-history-pilot -- 2025
```

Before each `generate:yuc-history-pilot` command, examine that year’s `ambiguous` list and only add reviewed aliases. Do not use one broad mutation command or hand-edit a generated catalog.

- [ ] **Step 2: Add annual invariants and known-report regressions.**

For every `seasons` entry from 2020 through 2025, assert `catalogCount === anime.length`, all IDs remain globally unique, all cover URLs resolve through `coverSpriteFor`, and every record containing `scheduleSourceName` has a `scheduleSourceUrl`, `scheduleChannel`, and at least one valid schedule segment. Include the Attack on Titan Final Season Part 1 16-episode assertion and the Part 2 2022-01-09 23:10 / 12-episode assertion.

- [ ] **Step 3: Verify all historical years as one change.**

Run: `npm run lint -- --ignore-pattern .worktrees && npm test && git diff --check`

Expected: PASS. Check `git diff --stat` and one representative diff for every year; expected generated changes are only new snapshots plus schedule/provenance changes, never cover assets or IDs.

- [ ] **Step 4: Commit the completed historical batch.**

```bash
git add data/syoboi-history-2021.js data/syoboi-history-2022.js data/syoboi-history-2023.js data/syoboi-history-2024.js data/syoboi-history-2025.js data/yuc-history-2021.js data/yuc-history-2022.js data/yuc-history-2023.js data/yuc-history-2024.js data/yuc-history-2025.js tests/anime-data.test.mjs scripts/generate-syoboi-history.mjs
git commit -m "fix: audit historical broadcast schedules"
```

## Task 6: 补入 2026 已播集数而不外推未来节目

**Files:**

- Create: `data/syoboi-history-2026.js`
- Modify: `data/yuc-history-2026.js`
- Modify: `tests/anime-data.test.mjs`

- [ ] **Step 1: 导入截至运行日已经播出的 2026 记录。**

Run: `npm run generate:syoboi-history -- 2026`

The generator must set its final `ProgLookup` range endpoint to the current Beijing calendar date plus one day (rather than 2027-01-01), so it cannot incorporate a future schedule prediction. Its `episodeSchedules` must end at the latest actually listed program row.

- [ ] **Step 2: 先复核 2026 报告，再生成 YUC 目录。**

Run: `npm run generate:yuc-history-pilot -- 2026`

Expected: 2026 records with verified segments show only those episodes in the calendar; a record with a verified episode 1–3 segment must not create an episode 4 event merely because its existing `episodeCount` is 12. Existing future YUC-only records retain their current source schedule.

- [ ] **Step 3: 添加不外推和封面稳定性回归。**

Add a test over one imported 2026 record with partial source coverage and assert `eventsForWeek` has no event after its final `episodeSchedules` segment. Assert all current `coverUrl` values and `coverSpriteFor(coverUrl)` mappings remain identical before and after the schedule-only regeneration.

- [ ] **Step 4: 完整验证并提交。**

Run: `npm run lint -- --ignore-pattern .worktrees && npm test && git diff --check`

Expected: PASS and no changes below `public/covers/yuc/sprites/` or `data/cover-sprites.js`.

```bash
git add data/syoboi-history-2026.js data/yuc-history-2026.js tests/anime-data.test.mjs
git commit -m "fix: record aired 2026 broadcast schedules"
```

## Task 7: 发布同一已验证提交

**Files:**

- No source edits expected.

- [ ] **Step 1: 确认工作区和提交范围。**

Run: `git status -sb && git log --oneline origin/main..HEAD && git diff --check origin/main...HEAD`

Expected: only the commits from Tasks 1–6 and the already approved design/plan documents are ahead of `origin/main`; no untracked outputs, credentials, sprites or unrelated edits.

- [ ] **Step 2: 再跑发布前构建与测试。**

Run: `npm run build && npm run lint -- --ignore-pattern .worktrees && npm test`

Expected: all commands pass. `npm test` rebuilds and checks the Worker-rendered HTML, so it cannot be skipped after a separate build.

- [ ] **Step 3: 同步并推送 main。**

Run: `git pull --ff-only origin main && git push origin main`

Expected: no divergent remote history; push exactly the commit validated in Step 2. If the fast-forward pull fails because another source update exists, stop, inspect the remote changes, merge deliberately, re-run Step 2, and never force-push.

- [ ] **Step 4: 用 Sites 发布私有版本并验证。**

Publish the pushed commit through the existing Sites project, keep its current private access setting, and wait for a successful deployment state. Verify the deployed version references the pushed commit and opens the existing private site URL. Do not change the access policy or create another public URL.
