# YUC Direct Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the 66 YUC 2026 Summer titles with YUC Chinese names, Japanese names, covers, first-airing dates, and weekly Beijing-time schedule entries.

**Architecture:** Keep the YUC snapshot static in `data/anime.js`. Add a direct Beijing schedule shape (`scheduleWeekday`, `premiereDateBeijing`, `beijingTime`) that the existing schedule helper returns without a JST conversion; retain its JST path for unit coverage. Render direct YUC schedule labels in the weekly calendar and place only time-less network releases in a separate section.

**Tech Stack:** Vinext/React, JavaScript ESM data modules, Node test runner, ESLint, Sites private deployment.

---

### Task 1: Add direct-YUC schedule behavior to the test contract

**Files:**
- Modify: `tests/schedule.test.mjs`
- Modify: `tests/anime-data.test.mjs`

- [ ] **Step 1: Write a failing direct-schedule test**

```js
test("keeps a direct YUC Beijing schedule in its listed weekday and clock time", () => {
  assert.deepEqual(
    toBeijingAiring({
      premiereDateBeijing: "2026-07-05",
      scheduleWeekday: "Sun",
      beijingTime: "24:45",
      premiereDateJst: null,
      jstTime: null,
    }),
    { date: "2026-07-05", weekday: "Sun", time: "24:45" },
  );
});
```

Add data assertions that all 66 records have YUC cover URLs, that `yume-mita`
uses `https://i0.hdslb.com/bfs/new_dyn/39ee0f846560cdf5f63c9ddfee8d21ac512995925.jpg`,
and that only `baki-dou-2` and `cyborg-009-nemesis` have no `beijingTime`.

- [ ] **Step 2: Run the targeted tests to verify RED**

Run: `node --test tests/schedule.test.mjs tests/anime-data.test.mjs`

Expected: the direct schedule assertion fails because `toBeijingAiring` currently only understands JST fields, and the data assertions fail against the pre-YUC cover/time snapshot.

### Task 2: Replace the static title snapshot with the full YUC record set

**Files:**
- Modify: `data/anime.js`

- [ ] **Step 1: Replace the current split base/detail mapping with one static 66-record array**

Each record uses this exact contract:

```js
{
  id: "yume-mita",
  titleZh: "BanG Dream! YUME∞MITA",
  titleJa: "バンドリ！ ゆめ∞みた",
  coverUrl: "https://i0.hdslb.com/bfs/new_dyn/39ee0f846560cdf5f63c9ddfee8d21ac512995925.jpg",
  coverAlt: "BanG Dream! YUME∞MITA 主视觉",
  premiereDateBeijing: "2026-07-02",
  scheduleWeekday: "Thu",
  beijingTime: "22:00",
  premiereDateJst: null,
  jstTime: null,
  station: "YUC 周表",
  sourceUrl: "https://yuc.wiki/202607/",
}
```

Populate all 66 entries from the YUC detailed-table title/cover pair and join
their scheduling values by the same cover URL from the page’s weekly table.
Keep network-only `baki-dou-2` and `cyborg-009-nemesis` with their listed
date and `beijingTime: null`. Set season metadata to `YUC 2026年7月新番表` and
the existing YUC URL.

- [ ] **Step 2: Run the data and schedule tests to verify GREEN**

Run: `node --test tests/schedule.test.mjs tests/anime-data.test.mjs`

Expected: all data and schedule tests pass.

### Task 3: Render the direct YUC schedule vocabulary

**Files:**
- Modify: `lib/schedule.js`
- Modify: `app/page.tsx`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Implement the direct schedule branch before the JST fallback**

```js
if (beijingTime !== null && beijingTime !== undefined) {
  if (!scheduleWeekday || !premiereDateBeijing) {
    throw new RangeError("Direct Beijing schedule needs a weekday and date");
  }
  return { date: premiereDateBeijing, weekday: scheduleWeekday, time: beijingTime };
}
```

The existing JST conversion remains unchanged after this branch.

- [ ] **Step 2: Update page wording and the rendered test**

The page must say `YUC 排期／北京时间` for direct schedule data, replace
`原始日本时间` with `YUC 首播排期`, and name the time-less section
`网络放送／具体时刻未列出`. The rendered test must assert YUC’s Dream Mita
cover, `周日 24:45` for 碧蓝航线微速前行第2期, and no longer expect a
JST-derived `透明之夜` time.

- [ ] **Step 3: Run the render tests to verify GREEN**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: all rendered HTML tests pass.

### Task 4: Verify, publish, and record the update

**Files:**
- Modify: `data/anime.js`, `lib/schedule.js`, `app/page.tsx`, and updated tests

- [ ] **Step 1: Run full verification**

Run: `npm test && npm run lint && git diff --check`

Expected: all tests pass; lint may retain the existing two `no-img-element`
warnings but has no errors; `git diff --check` emits no output.

- [ ] **Step 2: Commit and push the verified source**

Run: `git add data/anime.js lib/schedule.js app/page.tsx tests && git commit -m "feat: use YUC summer schedule and artwork" && git push origin main`

- [ ] **Step 3: Publish the exact validated commit privately**

Create a fresh Sites source credential, push the exact commit to the Sites
source repository with a per-command authorization header, package with
`package-site.sh`, save a version using the full commit SHA, deploy it with
`deploy_private_site_version`, and poll until it succeeds.
