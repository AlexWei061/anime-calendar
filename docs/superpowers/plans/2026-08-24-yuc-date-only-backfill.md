# YUC Date-Only Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely backfill YUC-explicit premiere dates and weekdays into clockless historical anime records, preserve raw source evidence, and publish an auditable `exact` / `verified` / `date-only` / `unknown` coverage report without inventing clock times.

**Architecture:** Extend the existing YUC parser with pure broadcast/date helpers used by normal future imports. Add a separate overlay command that reads the already-generated current catalogs, matches them by normalized title against the repository's historical official-YUC HTML snapshots, and changes schedule fields only; a small reviewed override table records 18 current-page labels whose titles changed after the snapshot. This prevents older HTML from reverting newer titles, covers, IDs, or catalog membership. Add a standalone read-only audit command and normalize the two current July network records to the same `date-only` contract.

**Tech Stack:** Node.js ESM, Node built-in test runner, JavaScript data modules, existing YUC generator, npm scripts.

---

## File map

- Modify `scripts/generate-yuc-history-pilot.mjs`: parse raw YUC broadcast labels, derive safe dates, normalize date-only records, and expose reusable pure helpers.
- Create `scripts/backfill-yuc-date-only.mjs`: apply an older raw YUC snapshot as a schedule-only overlay to current generated catalogs.
- Create `data/yuc-date-only-overrides.js`: retain 18 current official-YUC labels whose title text no longer matches the older snapshot.
- Create `scripts/audit-schedules.mjs`: classify full-catalog schedule coverage and report source/status violations.
- Modify `tests/anime-data.test.mjs`: parser, merge, overlay, current-July, audit, and final coverage regression tests.
- Modify `data/anime.js`: retain the two official July 2026 network labels and emit `date-only` instead of `unknown` when a YUC record has a date but no clock time.
- Modify `package.json`: expose `backfill:yuc-date-only` and `audit:schedules` commands.
- Regenerate `data/yuc-history-2020.js` through `data/yuc-history-2026.js`: schedule-only output changes produced by the overlay command.

The UI, calendar layout, authentication, database, covers, sprites, IDs, titles, and catalog membership remain outside this plan.

### Task 1: Parse and merge YUC date-only schedules

**Files:**
- Modify: `tests/anime-data.test.mjs:1-230,930-1095,1280-1360`
- Modify: `scripts/generate-yuc-history-pilot.mjs:290-550`

- [ ] **Step 1: Write failing parser and merge tests**

Add `applyYucDateOnly`, `normalizeDateOnlyRecord`, `parseYucBroadcast`, and `yucDateFromCard` to the existing generator import in `tests/anime-data.test.mjs`, then add these tests next to the current YUC parsing tests:

```js
test("parses explicit YUC date-only broadcast labels without inventing a clock time", () => {
  assert.deepEqual(parseYucBroadcast("1/8周三深夜 (全12话)"), {
    sourceSchedule: "1/8周三深夜 (全12话)",
    premiereMonth: 1,
    premiereDay: 8,
    scheduleWeekday: "Wed",
  });
});

test("recognizes dated YUC network labels without creating a weekly weekday", () => {
  assert.deepEqual(parseYucBroadcast("12/3网络配信 (CG动画)"), {
    sourceSchedule: "12/3网络配信 (CG动画)",
    premiereMonth: 12,
    premiereDay: 3,
    premiereKind: "network",
  });
  assert.deepEqual(parseYucBroadcast("3/26网络放送"), {
    sourceSchedule: "3/26网络放送",
    premiereMonth: 3,
    premiereDay: 26,
    premiereKind: "network",
  });
  assert.deepEqual(parseYucBroadcast("4/6一举放送"), {
    sourceSchedule: "4/6一举放送",
    premiereMonth: 4,
    premiereDay: 6,
  });
});

test("does not derive a premiere date from a weekday-only YUC label", () => {
  assert.deepEqual(parseYucBroadcast("周三（全12话）"), {
    sourceSchedule: "周三（全12话）",
  });
  assert.deepEqual(parseYucBroadcast(""), {});
});

test("derives cross-year YUC dates from the source quarter", () => {
  assert.equal(
    yucDateFromCard({ premiereMonth: 12, premiereDay: 31 }, "https://yuc.wiki/202001/"),
    "2019-12-31",
  );
  assert.equal(
    yucDateFromCard({ premiereMonth: 4, premiereDay: 31 }, "https://yuc.wiki/202004/"),
    null,
  );
});

test("fills an unmatched YUC record as date-only and preserves the raw label", () => {
  const record = {
    id: "yuc-202001-02",
    anilistId: null,
    premiereDateBeijing: null,
    scheduleWeekday: null,
    beijingTime: null,
    timeStatus: "unknown",
    station: "AniList 未匹配（试点）",
    stationSource: "estimated",
  };

  assert.deepEqual(
    applyYucDateOnly(
      record,
      {
        sourceSchedule: "1/8周三晚间",
        premiereMonth: 1,
        premiereDay: 8,
        scheduleWeekday: "Wed",
      },
      "https://yuc.wiki/202001/",
    ),
    {
      ...record,
      sourceSchedule: "1/8周三晚间",
      premiereDateBeijing: "2020-01-08",
      premiereDateSource: "YUC",
      scheduleWeekday: "Wed",
      scheduleWeekdaySource: "YUC",
      timeStatus: "date-only",
      station: "YUC 日期排期（时刻未定）",
      stationSource: "YUC",
    },
  );
});

test("keeps exact lower-source schedules when an ordinary YUC label is only date-only", () => {
  const exact = {
    premiereDateBeijing: "2020-01-09",
    premiereDateSource: "AniList",
    scheduleWeekday: "Thu",
    scheduleWeekdaySource: "AniList",
    beijingTime: "23:30",
    beijingTimeSource: "AniList",
    timeStatus: "exact",
  };

  assert.deepEqual(
    applyYucDateOnly(
      exact,
      {
        sourceSchedule: "1/8周三深夜",
        premiereMonth: 1,
        premiereDay: 8,
        scheduleWeekday: "Wed",
      },
      "https://yuc.wiki/202001/",
    ),
    exact,
  );
});

test("clears stale source markers when a YUC network premiere removes clock and weekday", () => {
  assert.deepEqual(
    applyYucDateOnly(
      {
        premiereDateBeijing: "2022-01-07",
        premiereDateSource: "AniList",
        scheduleWeekday: "Fri",
        scheduleWeekdaySource: "AniList",
        beijingTime: "23:30",
        beijingTimeSource: "AniList",
        timeStatus: "exact",
        station: "AniList 首集排期（试点）",
        stationSource: "AniList",
      },
      {
        sourceSchedule: "12/1网络配信",
        premiereMonth: 12,
        premiereDay: 1,
        premiereKind: "network",
      },
      "https://yuc.wiki/202201/",
    ),
    {
      premiereDateBeijing: "2021-12-01",
      premiereDateSource: "YUC",
      premiereKind: "network",
      scheduleWeekday: null,
      beijingTime: null,
      timeStatus: "date-only",
      station: "网络放送",
      stationSource: "YUC",
      sourceSchedule: "12/1网络配信",
    },
  );
});

test("normalizes an existing dated clockless record without retaining stale sources", () => {
  assert.deepEqual(
    normalizeDateOnlyRecord({
      premiereDateBeijing: "2020-01-08",
      scheduleWeekday: null,
      scheduleWeekdaySource: "AniList",
      beijingTime: null,
      beijingTimeSource: "AniList",
      timeStatus: "unknown",
    }),
    {
      premiereDateBeijing: "2020-01-08",
      scheduleWeekday: null,
      beijingTime: null,
      timeStatus: "date-only",
    },
  );
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="YUC date-only|explicit YUC|dated YUC|cross-year YUC|stale source|dated clockless|weekday-only YUC|exact lower-source" tests/anime-data.test.mjs
```

Expected: FAIL because the four new exports do not exist.

- [ ] **Step 3: Implement the pure parser/date/normalization helpers**

In `scripts/generate-yuc-history-pilot.mjs`, export `normalizeTitle` and add these helpers after it:

```js
export function normalizeTitle(value) {
  return decodeHtml(value).normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

const YUC_WEEKDAYS = Object.freeze({
  日: "Sun",
  天: "Sun",
  一: "Mon",
  二: "Tue",
  三: "Wed",
  四: "Thu",
  五: "Fri",
  六: "Sat",
});

export function parseYucBroadcast(value) {
  const sourceSchedule = decodeHtml(String(value ?? ""));
  if (!sourceSchedule) return {};

  const date = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(sourceSchedule);
  const weekday = date ? /周([日天一二三四五六])/.exec(sourceSchedule) : null;
  const network = /(?:网络(?:配信|放送)?|ネット配信|一举配信)/.test(sourceSchedule);

  return {
    sourceSchedule,
    ...(date ? { premiereMonth: Number(date[1]), premiereDay: Number(date[2]) } : {}),
    ...(weekday ? { scheduleWeekday: YUC_WEEKDAYS[weekday[1]] } : {}),
    ...(network ? { premiereKind: "network" } : {}),
  };
}

export function yucDateFromCard(card, sourceUrl) {
  if (!card?.premiereMonth || !card?.premiereDay) return null;
  const sourceSeason = /\/(\d{4})(\d{2})\/$/.exec(sourceUrl);
  if (!sourceSeason) return null;

  const [, sourceYear, sourceMonth] = sourceSeason;
  const year = Number(sourceYear) - (card.premiereMonth > Number(sourceMonth) ? 1 : 0);
  const date = `${year}-${String(card.premiereMonth).padStart(2, "0")}-${String(card.premiereDay).padStart(2, "0")}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

export function normalizeDateOnlyRecord(record) {
  const normalized = { ...record };
  if (!normalized.scheduleWeekday) delete normalized.scheduleWeekdaySource;
  if (!normalized.beijingTime) delete normalized.beijingTimeSource;
  if (normalized.premiereDateBeijing && !normalized.beijingTime) normalized.timeStatus = "date-only";
  return normalized;
}

export function applyYucDateOnly(record, card, sourceUrl) {
  const yucDate = yucDateFromCard(card, sourceUrl);

  if (card?.premiereKind === "network" && yucDate) {
    const network = {
      ...record,
      sourceSchedule: card.sourceSchedule,
      premiereDateBeijing: yucDate,
      premiereDateSource: "YUC",
      premiereKind: "network",
      scheduleWeekday: null,
      beijingTime: null,
      timeStatus: "date-only",
      station: "网络放送",
      stationSource: "YUC",
    };
    delete network.scheduleWeekdaySource;
    delete network.beijingTimeSource;
    return network;
  }

  if (record.beijingTime) return record;
  if (record.premiereDateBeijing) {
    return normalizeDateOnlyRecord(
      card?.sourceSchedule && !record.sourceSchedule ? { ...record, sourceSchedule: card.sourceSchedule } : record,
    );
  }
  if (!yucDate) return normalizeDateOnlyRecord(record);

  return normalizeDateOnlyRecord({
    ...record,
    sourceSchedule: card.sourceSchedule,
    premiereDateBeijing: yucDate,
    premiereDateSource: "YUC",
    scheduleWeekday: card.scheduleWeekday ?? null,
    ...(card.scheduleWeekday ? { scheduleWeekdaySource: "YUC" } : {}),
    beijingTime: null,
    timeStatus: "date-only",
    station: "YUC 日期排期（时刻未定）",
    stationSource: "YUC",
  });
}
```

- [ ] **Step 4: Split card extraction from catalog-drift validation and retain broadcast metadata**

Replace the current `parseCards` body with these two functions. The wrapper preserves all existing count and sentinel checks; the unvalidated extractor is needed for older snapshots whose catalog membership differs from the current generated files.

```js
export function parseYucCards(html) {
  const cards = new Map();
  const cardPattern = /<div style="float:left">([\s\S]*?)<div style="clear:both"><\/div(?:>|-->)/g;

  for (const [, card] of html.matchAll(cardPattern)) {
    const image = card.match(/<img\b(?=[^>]*\bwidth="180px")(?=[^>]*\bdata-src="([^"]+)")[^>]*>/i);
    const titleZh = card.match(/<p class="title_cn[_a-z\d]*">([\s\S]*?)<\/p>/i);
    const titleJa = card.match(/<p class="title_jp[_a-z\d]*">([\s\S]*?)<\/p>/i);
    if (!image || !titleZh || !titleJa) continue;

    const broadcast = card.match(/<p\b[^>]*\bclass="broadcast"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
    const episodeCount = /(?:全|共)\s*(\d+)\s*[话話集]/.exec(decodeHtml(broadcast));
    const coverUrl = image[1].trim().replace(/^http:/i, "https:");
    const normalizedTitle = normalizeTitle(titleJa[1]);
    if (!coverUrl.startsWith("https://") || !normalizedTitle || cards.has(normalizedTitle)) continue;

    cards.set(normalizedTitle, {
      titleZh: decodeHtml(titleZh[1]),
      titleJa: decodeHtml(titleJa[1]),
      coverUrl,
      ...parseYucBroadcast(broadcast),
      ...(episodeCount ? { episodeCount: Number(episodeCount[1]) } : {}),
    });
  }

  return [...cards.values()];
}

export function parseCards(html, { month, expectedCardCount, sentinelTitles }) {
  const candidates = [...html.matchAll(/<img\b(?=[^>]*\bwidth="180px")(?=[^>]*\bdata-src="[^"]+")[^>]*>/gi)];
  const parsedCards = parseYucCards(html);
  if (parsedCards.length !== candidates.length) {
    throw new Error(`YUC ${month} parsed ${parsedCards.length} of ${candidates.length} detailed cards`);
  }
  if (parsedCards.length !== expectedCardCount) {
    throw new Error(`YUC ${month} detailed-card count changed: expected ${expectedCardCount}, found ${parsedCards.length}`);
  }
  for (const title of sentinelTitles) {
    if (!parsedCards.some(({ titleZh }) => titleZh === title)) {
      throw new Error(`YUC ${month} is missing sentinel title: ${title}`);
    }
  }
  return parsedCards;
}
```

Update the existing parser expectations so every non-empty `<p class="broadcast">` includes `sourceSchedule` plus the parsed generic fields. Remove the old `networkPremiereMonth` and `networkPremiereDay` expectations.

- [ ] **Step 5: Route normal YUC enrichment through `applyYucDateOnly`**

In `enrichYucRecord`, keep the current matched/unmatched record construction but remove `networkPremiereDate()` and the spread-based `networkPremiere` object. Return the same base records through this common tail:

```js
  const withYucSchedule = applyYucDateOnly(record, card, sourceUrl);
  return applySyoboiSchedule(withYucSchedule, syoboiSchedule);
```

For the unmatched branch, assign the existing unknown base to `record` instead of returning immediately. This keeps title, cover, episode count, and ID behavior unchanged while allowing YUC to fill only the missing schedule fields.

- [ ] **Step 6: Run the focused and complete data tests**

Run:

```bash
node --test --test-name-pattern="YUC date-only|explicit YUC|dated YUC|cross-year YUC|stale source|dated clockless|weekday-only YUC|exact lower-source|YUC network premiere|YUC episode totals" tests/anime-data.test.mjs
node --test tests/anime-data.test.mjs
```

Expected: both commands PASS; no generated catalog has changed yet.

- [ ] **Step 7: Commit parser and merge behavior**

```bash
git add scripts/generate-yuc-history-pilot.mjs tests/anime-data.test.mjs
git commit -m "feat: parse YUC date-only schedules"
```

### Task 2: Add a safe schedule-only snapshot overlay

**Files:**
- Create: `scripts/backfill-yuc-date-only.mjs`
- Create: `data/yuc-date-only-overrides.js`
- Modify: `tests/anime-data.test.mjs`
- Modify: `package.json:6-20`

- [ ] **Step 1: Write failing overlay tests**

Import `backfillCatalog` and `snapshotFilename` from the new script, then add:

```js
test("maps YUC snapshot filenames by quarter", () => {
  assert.equal(snapshotFilename(2020, "1"), "2020-winter.html");
  assert.equal(snapshotFilename(2020, "4"), "2020-spring.html");
  assert.equal(snapshotFilename(2020, "7"), "2020-summer.html");
  assert.equal(snapshotFilename(2020, "10"), "2020-fall.html");
});

test("overlays only clockless records matched by a unique normalized title", () => {
  const catalog = {
    sourceUrl: "https://yuc.wiki/202001/",
    anime: [
      {
        id: "clockless",
        titleZh: "number24",
        titleJa: "ナンバー・トゥーフォー",
        premiereDateBeijing: null,
        scheduleWeekday: null,
        beijingTime: null,
        timeStatus: "unknown",
      },
      {
        id: "exact",
        titleZh: "精确番",
        titleJa: "Exact",
        premiereDateBeijing: "2020-01-09",
        scheduleWeekday: "Thu",
        beijingTime: "23:30",
        timeStatus: "exact",
      },
    ],
  };
  const cards = [
    {
      titleZh: "number24",
      titleJa: "ナンバー・トゥーフォー",
      sourceSchedule: "1/8周三晚间",
      premiereMonth: 1,
      premiereDay: 8,
      scheduleWeekday: "Wed",
    },
    {
      titleZh: "精确番",
      titleJa: "Exact",
      sourceSchedule: "1/8周三深夜",
      premiereMonth: 1,
      premiereDay: 8,
      scheduleWeekday: "Wed",
    },
  ];

  const result = backfillCatalog(catalog, cards);
  assert.equal(result.catalog.anime[0].premiereDateBeijing, "2020-01-08");
  assert.equal(result.catalog.anime[0].timeStatus, "date-only");
  assert.deepEqual(result.catalog.anime[1], catalog.anime[1]);
  assert.deepEqual(result.report, {
    filledDateAndWeekday: ["clockless"],
    filledDateOnly: [],
    normalizedExistingDateOnly: [],
    unmatchedTitle: [],
    missingMonthDay: [],
    emptySchedule: [],
    invalidDate: [],
  });
});

test("reports title misses and labels that lack a month and day", () => {
  const result = backfillCatalog(
    {
      sourceUrl: "https://yuc.wiki/202001/",
      anime: [
        { id: "missing-title", titleZh: "不存在", titleJa: "Missing", premiereDateBeijing: null, beijingTime: null },
        { id: "weekday-only", titleZh: "周番", titleJa: "Weekly", premiereDateBeijing: null, beijingTime: null },
        { id: "empty", titleZh: "空排期", titleJa: "Empty", premiereDateBeijing: null, beijingTime: null },
        { id: "invalid", titleZh: "无效日期", titleJa: "Invalid", premiereDateBeijing: null, beijingTime: null },
      ],
    },
    [
      { titleZh: "周番", titleJa: "Weekly", sourceSchedule: "周三（全12话）" },
      { titleZh: "空排期", titleJa: "Empty" },
      {
        titleZh: "无效日期",
        titleJa: "Invalid",
        sourceSchedule: "4/31周四晚间",
        premiereMonth: 4,
        premiereDay: 31,
        scheduleWeekday: "Thu",
      },
    ],
  );

  assert.deepEqual(result.report.unmatchedTitle, ["missing-title"]);
  assert.deepEqual(result.report.missingMonthDay, ["weekday-only"]);
  assert.deepEqual(result.report.emptySchedule, ["empty"]);
  assert.deepEqual(result.report.invalidDate, ["invalid"]);
});

test("uses an audited current-page override instead of guessing a title match", () => {
  const result = backfillCatalog(
    {
      sourceUrl: "https://yuc.wiki/202204/",
      anime: [
        {
          id: "yuc-202204-49",
          titleZh: "LoveLive！ 虹咲学园校园偶像同好会 第2期",
          titleJa: "ラブライブ！虹ヶ咲学園スクールアイドル同好会 2期",
          premiereDateBeijing: null,
          scheduleWeekday: null,
          beijingTime: null,
          timeStatus: "unknown",
        },
      ],
    },
    [],
    [
      {
        recordId: "yuc-202204-49",
        sourceUrl: "https://yuc.wiki/202204/",
        sourceSchedule: "4/2周六晚间",
      },
    ],
  );

  assert.equal(result.catalog.anime[0].premiereDateBeijing, "2022-04-02");
  assert.equal(result.catalog.anime[0].scheduleWeekday, "Sat");
  assert.equal(result.catalog.anime[0].sourceSchedule, "4/2周六晚间");
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="snapshot filenames|overlays only clockless|reports title misses|audited current-page override" tests/anime-data.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/backfill-yuc-date-only.mjs`.

- [ ] **Step 3: Create the audited current-page override table**

Create `data/yuc-date-only-overrides.js` with the 18 non-conflicting labels verified on the current official YUC pages:

```js
export const yucDateOnlyOverrides = Object.freeze([
  { recordId: "yuc-202204-49", sourceUrl: "https://yuc.wiki/202204/", sourceSchedule: "4/2周六晚间" },
  { recordId: "yuc-202301-10", sourceUrl: "https://yuc.wiki/202301/", sourceSchedule: "12/1网络配信" },
  { recordId: "yuc-202301-60", sourceUrl: "https://yuc.wiki/202301/", sourceSchedule: "1/8周日深夜 (连环画剧动画)" },
  { recordId: "yuc-202301-61", sourceUrl: "https://yuc.wiki/202301/", sourceSchedule: "12/4周日上午 (泡面番)" },
  { recordId: "yuc-202401-37", sourceUrl: "https://yuc.wiki/202401/", sourceSchedule: "1/7周日晚间 (全12话)" },
  { recordId: "yuc-202404-18", sourceUrl: "https://yuc.wiki/202404/", sourceSchedule: "4/4周四深夜 (全13话)" },
  { recordId: "yuc-202404-30", sourceUrl: "https://yuc.wiki/202404/", sourceSchedule: "4/10周三晚间 (全12话)" },
  { recordId: "yuc-202404-39", sourceUrl: "https://yuc.wiki/202404/", sourceSchedule: "4/12周五晚间" },
  { recordId: "yuc-202404-59", sourceUrl: "https://yuc.wiki/202404/", sourceSchedule: "4/3周三早间 (泡面番/年番)" },
  { recordId: "yuc-202404-62", sourceUrl: "https://yuc.wiki/202404/", sourceSchedule: "5/4周六下午 (全25话)" },
  { recordId: "yuc-202407-14", sourceUrl: "https://yuc.wiki/202407/", sourceSchedule: "7/6周六早间 (泡面番)" },
  { recordId: "yuc-202407-32", sourceUrl: "https://yuc.wiki/202407/", sourceSchedule: "7/6周六晚间 (全14话)" },
  { recordId: "yuc-202501-04", sourceUrl: "https://yuc.wiki/202501/", sourceSchedule: "1/3周五深夜 (全12话)" },
  { recordId: "yuc-202504-43", sourceUrl: "https://yuc.wiki/202504/", sourceSchedule: "4/5周六晚间 (全12话)" },
  { recordId: "yuc-202507-29", sourceUrl: "https://yuc.wiki/202507/", sourceSchedule: "7/6周日深夜 (全13话)" },
  { recordId: "yuc-202507-56", sourceUrl: "https://yuc.wiki/202507/", sourceSchedule: "7/5周六深夜 (全12话)" },
  { recordId: "yuc-202510-56", sourceUrl: "https://yuc.wiki/202510/", sourceSchedule: "10/29起网络 (S1=8话)" },
  { recordId: "yuc-202604-50", sourceUrl: "https://yuc.wiki/202604/", sourceSchedule: "4/4周六下午" },
]);
```

Do not add `yuc-202210-08` because YUC currently exposes conflicting `9/1` and `10/13` labels for 《例外》. Do not add `yuc-202407-53` because the current JOCHUM card still has no month/day.

- [ ] **Step 4: Create the overlay script**

Create `scripts/backfill-yuc-date-only.mjs` with this implementation:

```js
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { yucDateOnlyOverrides } from "../data/yuc-date-only-overrides.js";
import {
  applyYucDateOnly,
  normalizeDateOnlyRecord,
  normalizeTitle,
  parseYucBroadcast,
  parseYucCards,
  yucSeasonsForYear,
} from "./generate-yuc-history-pilot.mjs";

const SEASON_NAME_BY_MONTH = Object.freeze({ 1: "winter", 4: "spring", 7: "summer", 10: "fall" });

export function snapshotFilename(year, month) {
  const season = SEASON_NAME_BY_MONTH[Number(month)];
  if (!season) throw new RangeError(`Unsupported YUC season month: ${month}`);
  return `${year}-${season}.html`;
}

function indexSnapshotCards(cards) {
  const index = new Map();
  for (const card of cards) {
    for (const title of new Set([normalizeTitle(card.titleZh), normalizeTitle(card.titleJa)])) {
      if (!title) continue;
      index.set(title, index.has(title) ? null : card);
    }
  }
  return index;
}

function findSnapshotCard(record, index) {
  const matches = new Set(
    [normalizeTitle(record.titleZh), normalizeTitle(record.titleJa)]
      .map((title) => index.get(title))
      .filter(Boolean),
  );
  return matches.size === 1 ? [...matches][0] : null;
}

export function backfillCatalog(catalog, cards, overrides = []) {
  const index = indexSnapshotCards(cards);
  const overridesById = new Map(overrides.map((override) => [override.recordId, override]));
  const report = {
    filledDateAndWeekday: [],
    filledDateOnly: [],
    normalizedExistingDateOnly: [],
    unmatchedTitle: [],
    missingMonthDay: [],
    emptySchedule: [],
    invalidDate: [],
  };

  const anime = catalog.anime.map((original) => {
    if (original.beijingTime) return original;
    const normalized = normalizeDateOnlyRecord(original);
    const override = overridesById.get(normalized.id);
    const card = override
      ? { ...override, ...parseYucBroadcast(override.sourceSchedule) }
      : findSnapshotCard(normalized, index);
    if (!card) {
      if (!normalized.premiereDateBeijing) report.unmatchedTitle.push(normalized.id);
      return normalized;
    }

    const updated = applyYucDateOnly(normalized, card, catalog.sourceUrl);
    if (original.premiereDateBeijing && updated.timeStatus === "date-only") {
      report.normalizedExistingDateOnly.push(original.id);
    } else if (!original.premiereDateBeijing && updated.premiereDateBeijing) {
      if (updated.scheduleWeekday) report.filledDateAndWeekday.push(original.id);
      else report.filledDateOnly.push(original.id);
    } else if (!original.premiereDateBeijing) {
      if (!card.sourceSchedule) report.emptySchedule.push(original.id);
      else if (!card.premiereMonth || !card.premiereDay) report.missingMonthDay.push(original.id);
      else report.invalidDate.push(original.id);
    }
    return updated;
  });

  return { catalog: { ...catalog, anime }, report };
}

function parseArgs(argv) {
  const year = Number(argv[0]);
  const htmlDirIndex = argv.indexOf("--html-dir");
  const htmlDir = htmlDirIndex >= 0 ? argv[htmlDirIndex + 1] : null;
  if (!Number.isInteger(year)) throw new RangeError("Year must be an integer");
  if (!htmlDir) throw new TypeError("--html-dir is required");
  return { year, htmlDir };
}

async function main() {
  const { year, htmlDir } = parseArgs(process.argv.slice(2));
  const configs = yucSeasonsForYear(year);
  const moduleUrl = new URL(`../data/yuc-history-${year}.js`, import.meta.url);
  const current = await import(moduleUrl);
  const updatedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" })
    .format(new Date())
    .replaceAll("/", "-");
  const reports = [];
  const catalogs = [];

  for (const config of configs) {
    const snapshotPath = resolve(htmlDir, snapshotFilename(year, config.month));
    let html;
    try {
      html = await readFile(snapshotPath, "utf8");
    } catch (error) {
      throw new Error(`Missing YUC HTML snapshot for ${config.label}: ${snapshotPath}`, { cause: error });
    }

    const overrides = yucDateOnlyOverrides.filter(({ sourceUrl }) => sourceUrl === config.url);
    const result = backfillCatalog(current[config.exportName], parseYucCards(html), overrides);
    catalogs.push({ ...result.catalog, updatedAt });
    reports.push({ season: config.exportName, ...result.report });
  }

  const output = `// Generated by scripts/generate-yuc-history-pilot.mjs and updated by scripts/backfill-yuc-date-only.mjs. Do not edit by hand.\n\n${catalogs
    .map((catalog, index) => `export const ${configs[index].exportName} = ${JSON.stringify(catalog, null, 2)};`)
    .join("\n\n")}\n`;
  await writeFile(moduleUrl, output);
  console.log(JSON.stringify({ year, reports }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
```

- [ ] **Step 5: Add the npm entry point**

Add this script beside the other data generators in `package.json`:

```json
"backfill:yuc-date-only": "node scripts/backfill-yuc-date-only.mjs"
```

- [ ] **Step 6: Run the overlay tests and the full data test file**

Run:

```bash
node --test --test-name-pattern="snapshot filenames|overlays only clockless|reports title misses|audited current-page override" tests/anime-data.test.mjs
node --test tests/anime-data.test.mjs
```

Expected: both commands PASS, and no generated catalog changes because the overlay CLI has not been run.

- [ ] **Step 7: Commit the overlay tool**

```bash
git add data/yuc-date-only-overrides.js package.json scripts/backfill-yuc-date-only.mjs tests/anime-data.test.mjs
git commit -m "feat: add YUC schedule overlay"
```

### Task 3: Add coverage auditing and normalize July 2026 network records

**Files:**
- Create: `scripts/audit-schedules.mjs`
- Modify: `tests/anime-data.test.mjs`
- Modify: `data/anime.js:140-166,889-923`
- Modify: `package.json:6-21`

- [ ] **Step 1: Write the failing audit tests**

Import `auditScheduleCoverage` from the new audit script and add:

```js
test("audits exact, verified, date-only, and unknown schedule coverage", () => {
  assert.deepEqual(
    auditScheduleCoverage([
      { id: "exact", premiereDateBeijing: "2026-01-01", scheduleWeekday: "Thu", beijingTime: "20:00", beijingTimeSource: "YUC", timeStatus: "exact" },
      { id: "verified", premiereDateBeijing: "2026-01-02", scheduleWeekday: "Fri", beijingTime: "21:00", beijingTimeSource: "しょぼいカレンダー", timeStatus: "verified" },
      { id: "date-only", premiereDateBeijing: "2026-01-03", scheduleWeekday: null, beijingTime: null, timeStatus: "date-only", premiereDateSource: "YUC", sourceSchedule: "1/3网络放送" },
      { id: "unknown", premiereDateBeijing: null, scheduleWeekday: null, beijingTime: null, timeStatus: "unknown" },
    ]),
    {
      total: 4,
      counts: { exact: 1, verified: 1, "date-only": 1, unknown: 1 },
      statusMismatches: [],
      missingClockSources: [],
      missingDateOnlyEvidence: [],
      staleSourceMarkers: [],
      unknownIds: ["unknown"],
    },
  );
});

test("reports stale clock and weekday source markers", () => {
  const audit = auditScheduleCoverage([
    {
      id: "stale",
      premiereDateBeijing: "2026-01-03",
      scheduleWeekday: null,
      scheduleWeekdaySource: "AniList",
      beijingTime: null,
      beijingTimeSource: "AniList",
      timeStatus: "unknown",
    },
  ]);
  assert.deepEqual(audit.statusMismatches, ["stale"]);
  assert.deepEqual(audit.staleSourceMarkers, ["stale"]);
});
```

- [ ] **Step 2: Run the audit tests and verify they fail**

Run:

```bash
node --test --test-name-pattern="audits exact|reports stale clock" tests/anime-data.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/audit-schedules.mjs`.

- [ ] **Step 3: Create the audit script**

Create `scripts/audit-schedules.mjs`:

```js
import { pathToFileURL } from "node:url";

import { allAnime } from "../data/anime.js";

export function auditScheduleCoverage(records) {
  const result = {
    total: records.length,
    counts: { exact: 0, verified: 0, "date-only": 0, unknown: 0 },
    statusMismatches: [],
    missingClockSources: [],
    missingDateOnlyEvidence: [],
    staleSourceMarkers: [],
    unknownIds: [],
  };

  for (const record of records) {
    const expectedStatus = record.beijingTime
      ? record.timeStatus === "verified"
        ? "verified"
        : "exact"
      : record.premiereDateBeijing
        ? "date-only"
        : "unknown";
    result.counts[expectedStatus] += 1;
    if (record.timeStatus !== expectedStatus) result.statusMismatches.push(record.id);
    if (record.beijingTime && !record.beijingTimeSource) result.missingClockSources.push(record.id);
    if (
      expectedStatus === "date-only" &&
      record.premiereDateSource === "YUC" &&
      (typeof record.sourceSchedule !== "string" || !record.sourceSchedule)
    ) {
      result.missingDateOnlyEvidence.push(record.id);
    }
    if ((!record.beijingTime && record.beijingTimeSource) || (!record.scheduleWeekday && record.scheduleWeekdaySource)) {
      result.staleSourceMarkers.push(record.id);
    }
    if (expectedStatus === "unknown") result.unknownIds.push(record.id);
  }

  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(auditScheduleCoverage(allAnime), null, 2));
}
```

- [ ] **Step 4: Normalize the two current July YUC network records**

Add the official raw labels to the existing `yucAnime` objects in `data/anime.js`:

```js
// baki-dou-2
"sourceSchedule": "6/18网络放送",

// cyborg-009-nemesis
"sourceSchedule": "7/19网络放送 (全3话)",
```

Replace the clock-status branch in `withYucSources` with:

```js
    ...(record.beijingTime
      ? { beijingTimeSource: "YUC", timeStatus: "exact" }
      : record.premiereDateBeijing
        ? { timeStatus: "date-only" }
        : { timeStatus: "unknown" }),
```

These labels are directly supported by `https://yuc.wiki/202607/`; no clock value or weekly weekday is added.

- [ ] **Step 5: Add the npm audit command**

Add:

```json
"audit:schedules": "node scripts/audit-schedules.mjs"
```

- [ ] **Step 6: Run audit and current-July tests**

Run:

```bash
node --test --test-name-pattern="audits exact|reports stale clock|July 2026" tests/anime-data.test.mjs
npm run audit:schedules
```

Expected before historical overlay: tests PASS; audit reports 1248 `exact`, 66 `verified`, 33 `date-only`, 167 `unknown`, with no July status mismatch.

- [ ] **Step 7: Commit audit and current-quarter normalization**

```bash
git add data/anime.js package.json scripts/audit-schedules.mjs tests/anime-data.test.mjs
git commit -m "feat: audit schedule coverage"
```

### Task 4: Apply the historical YUC schedule overlay

**Files:**
- Modify: `data/yuc-history-2020.js`
- Modify: `data/yuc-history-2021.js`
- Modify: `data/yuc-history-2022.js`
- Modify: `data/yuc-history-2023.js`
- Modify: `data/yuc-history-2024.js`
- Modify: `data/yuc-history-2025.js`
- Modify: `data/yuc-history-2026.js`
- Modify: `tests/anime-data.test.mjs:720-780,1280-1340`

- [ ] **Step 1: Verify the official snapshot object still exists**

Run:

```bash
git cat-file -e b39b97b7a2ffd0bb4bfe7ec82efd1f9467995cf7:data/yuc/raw/2020-winter.html
git cat-file -e b39b97b7a2ffd0bb4bfe7ec82efd1f9467995cf7:data/yuc/raw/2026-spring.html
```

Expected: both commands exit 0 with no output. If either object is unavailable, stop this task; do not replace it with an insecure live fetch.

- [ ] **Step 2: Extract the immutable raw snapshots into a temporary directory**

Run in one shell session:

```bash
yuc_snapshot_dir="$(mktemp -d /private/tmp/anime-calendar-yuc-backfill.XXXXXX)"
git archive --format=tar --output="$yuc_snapshot_dir/yuc-raw.tar" b39b97b7a2ffd0bb4bfe7ec82efd1f9467995cf7 data/yuc/raw
tar -xf "$yuc_snapshot_dir/yuc-raw.tar" -C "$yuc_snapshot_dir"
test -f "$yuc_snapshot_dir/data/yuc/raw/2020-winter.html"
test -f "$yuc_snapshot_dir/data/yuc/raw/2026-spring.html"
```

Expected: all commands exit 0. Do not commit the temporary directory or tar file.

- [ ] **Step 3: Run the schedule-only overlay for every historical year**

In the same shell session, run:

```bash
for yuc_year in 2020 2021 2022 2023 2024 2025 2026; do
  npm run backfill:yuc-date-only -- "$yuc_year" --html-dir "$yuc_snapshot_dir/data/yuc/raw"
done
```

Expected consolidated report across all seven runs, including the 18 reviewed current-page overrides:

- `filledDateAndWeekday`: 65 records.
- `filledDateOnly`: 5 records.
- Existing dated/no-clock records are normalized to `date-only`.
- Title mismatches and month/day omissions remain explicitly listed; they are not matched by array position.

- [ ] **Step 4: Add the full-catalog coverage regression**

Add this test after `records the source for every populated historical catalog field`:

```js
test("publishes the audited schedule coverage after the YUC date-only backfill", async () => {
  const { auditScheduleCoverage } = await import("../scripts/audit-schedules.mjs");
  const audit = auditScheduleCoverage(allAnime);

  assert.deepEqual(audit.counts, {
    exact: 1248,
    verified: 66,
    "date-only": 103,
    unknown: 97,
  });
  assert.deepEqual(audit.statusMismatches, []);
  assert.deepEqual(audit.missingClockSources, []);
  assert.deepEqual(audit.missingDateOnlyEvidence, []);
  assert.deepEqual(audit.staleSourceMarkers, []);
  assert.ok(
    allAnime
      .filter(({ timeStatus, premiereDateSource }) => timeStatus === "date-only" && premiereDateSource === "YUC")
      .every(
        ({ premiereDateBeijing, beijingTime, sourceSchedule }) =>
          /^\d{4}-\d{2}-\d{2}$/.test(premiereDateBeijing) &&
          beijingTime === null &&
          typeof sourceSchedule === "string" &&
          sourceSchedule.length > 0,
      ),
  );
});
```

Update the existing unmatched-historical predicate so it accepts the new supported state:

```js
        (timeStatus === "date-only" &&
          /^\d{4}-\d{2}-\d{2}$/.test(premiereDateBeijing) &&
          beijingTime === null &&
          typeof premiereDateSource === "string") ||
```

Keep the current network-specific and Syoboi branches; do not weaken ID, episode, or source validation.

- [ ] **Step 5: Inspect the generated diff for forbidden changes**

Run:

```bash
git diff --stat -- data/yuc-history-2020.js data/yuc-history-2021.js data/yuc-history-2022.js data/yuc-history-2023.js data/yuc-history-2024.js data/yuc-history-2025.js data/yuc-history-2026.js
git diff --word-diff=porcelain -- data/yuc-history-2020.js | sed -n '1,220p'
```

Expected: changes are limited to `sourceSchedule`, date/weekday fields and sources, `timeStatus`, station/source normalization, stale-source removal, `updatedAt`, and the generated header. No ID, title, cover, episode count, catalog count, or existing clock time changes are allowed.

- [ ] **Step 6: Run data tests and the audit**

Run:

```bash
node --test tests/anime-data.test.mjs
npm run audit:schedules
```

Expected: tests PASS; audit reports exactly 1248 `exact`, 66 `verified`, 103 `date-only`, and 97 `unknown`, with empty status/source/evidence violation arrays.

- [ ] **Step 7: Commit generated data and coverage assertions**

```bash
git add data/yuc-history-2020.js data/yuc-history-2021.js data/yuc-history-2022.js data/yuc-history-2023.js data/yuc-history-2024.js data/yuc-history-2025.js data/yuc-history-2026.js tests/anime-data.test.mjs
git commit -m "data: backfill YUC date-only schedules"
```

### Task 5: Full verification and handoff

**Files:**
- Verify only; modify only a directly related file if a verification failure exposes an implementation defect.

- [ ] **Step 1: Run lint**

```bash
npm run lint -- --ignore-pattern .worktrees
```

Expected: exit 0 with no ESLint errors.

- [ ] **Step 2: Run the complete test pipeline**

```bash
npm test
```

Expected: typecheck, vinext/Worker build, and all `tests/*.test.mjs` pass.

- [ ] **Step 3: Re-run the final schedule audit**

```bash
npm run audit:schedules
```

Expected: 1514 total records; 1248 `exact`, 66 `verified`, 103 `date-only`, 97 `unknown`; `statusMismatches`, `missingClockSources`, `missingDateOnlyEvidence`, and `staleSourceMarkers` are empty.

- [ ] **Step 4: Check diff hygiene and repository state**

```bash
git diff --check
git status --short --branch
git log --oneline -8
```

Expected: `git diff --check` exits 0; the working tree is clean; the recent commits are the parser, overlay tool, audit, and generated-data commits on top of the approved design/plan history.

- [ ] **Step 5: Review the implementation against the approved design**

Confirm all of the following from the actual diff and audit output:

- No vague YUC daypart became an `HH:mm` value.
- Existing AniList/しょぼい exact schedules are unchanged.
- New date-only fields have YUC field-level sources and raw evidence.
- Title mismatches were not resolved by card position.
- Ordinary date-only entries were not added to the network-only UI section.
- No unrelated runtime, UI, auth, database, cover, or deployment files changed.

If a directly related verification fix is required, return to the task that owns that file, rerun its listed focused command, and amend that task before repeating the full verification sequence.
