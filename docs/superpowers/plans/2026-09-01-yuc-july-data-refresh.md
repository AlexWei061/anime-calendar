# YUC July 2026 Data Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Refresh the July 2026 catalog with YUC's current episode totals and model Skeleton Knight season 2's timed premiere separately from its weekly Monday run, without publishing incomplete October candidates.

**Architecture:** Keep the current hand-audited July catalog in `data/anime.js`. Treat every current YUC episode total as exact except the two entries whose YUC labels still contain question marks, and represent Skeleton Knight's two-phase timed schedule with the existing `episodeSchedules` structure so `lib/calendar.js` remains unchanged.

**Tech Stack:** Node.js ESM, JavaScript data modules, Node built-in test runner, existing calendar helpers.

---

## File map

- Modify `tests/anime-data.test.mjs`: update the July snapshot, assert all changed YUC totals and source markers, preserve the incomplete-October boundary, and add Skeleton Knight schedule regressions.
- Modify `data/anime.js`: update the audit date, raw YUC totals, unconfirmed-count exceptions, and Skeleton Knight's explicit schedule segments.
- Create `docs/superpowers/plans/2026-09-01-yuc-july-data-refresh.md`: retain this implementation plan.

No UI, styles, historical generated catalogs, AniList snapshots, Syoboi snapshots, covers, sprites, authentication, or database files change.

### Task 1: Add failing July snapshot and episode-total tests

**Files:**
- Modify: `tests/anime-data.test.mjs:243-351,481-489`

- [x] **Step 1: Update the snapshot date and preserve the October boundary**

Change the expected July snapshot date and add the explicit no-formal-October assertion inside `ships an auditable July 2026 TV anime snapshot`:

```js
assert.deepEqual(season, {
  label: "2026 年 7 月番",
  timeZoneLabel: "北京时间（UTC+8）",
  updatedAt: "2026-09-01",
  catalogCount: 66,
  sourceName: "YUC 2026年7月新番表",
  sourceUrl: "https://yuc.wiki/202607/",
});
assert.equal(seasons.some(({ id }) => id === "2026-october"), false);
```

- [x] **Step 2: Replace the old partial episode-total test with the current YUC contract**

Replace `uses YUC episode totals when available and defaults every other show to 12 episodes` with:

```js
test("uses current YUC July episode totals as the highest-priority source", () => {
  const yucEpisodeCounts = {
    "grow-up-show": 13,
    "yume-mita": 13,
    "ghost-in-the-shell": 10,
    "bleach-tybw-kashin": 10,
    "clevatess-2": 13,
    "hanazakari-2": 13,
    "seihantai-kimi-boku": 13,
    "world-is-dancing": 13,
    "reiwa-no-darasan": 13,
    "uchioto": 24,
    "kimi-shinu-koi": 13,
    "futsutsuka-akujo": 11,
    "mushoku-3": 14,
    "victoria": 9,
    "tsuiho-juki": 26,
    "20th-century-electric-catalog": 13,
  };

  assert.equal(anime.every(({ episodeCount }) => Number.isInteger(episodeCount) && episodeCount > 0), true);
  for (const [id, episodeCount] of Object.entries(yucEpisodeCounts)) {
    const record = anime.find((candidate) => candidate.id === id);
    assert.deepEqual(
      {
        episodeCount: record?.episodeCount,
        episodeCountSource: record?.episodeCountSource,
        episodeCountStatus: record?.episodeCountStatus,
      },
      { episodeCount, episodeCountSource: "YUC", episodeCountStatus: "exact" },
      id,
    );
  }

  assert.equal(anime.filter(({ episodeCountSource }) => episodeCountSource === "YUC").length, 64);
  assert.deepEqual(
    ["100-girlfriends-3", "hellmode-2"].map((id) => {
      const record = anime.find((candidate) => candidate.id === id);
      return {
        id,
        episodeCount: record?.episodeCount,
        episodeCountSource: record?.episodeCountSource,
      };
    }),
    [
      { id: "100-girlfriends-3", episodeCount: 12, episodeCountSource: "AniList" },
      { id: "hellmode-2", episodeCount: 12, episodeCountSource: "estimated" },
    ],
  );
  assert.equal(anime.find(({ id }) => id === "yume-mita")?.premiereEpisodeCount, 3);
  assert.equal(anime.find(({ id }) => id === "mushoku-3")?.premiereEpisodeCount, 2);
  assert.equal(anime.find(({ id }) => id === "cyborg-009-nemesis")?.episodeCount, 3);
  assert.equal(anime.find(({ id }) => id === "rezero-4-part-2")?.episodeCount, 8);
});
```

- [x] **Step 3: Run the focused tests and verify RED**

Run:

```bash
node --test --test-name-pattern="auditable July 2026|current YUC July episode totals" tests/anime-data.test.mjs
```

Expected: FAIL because `season.updatedAt` is still `2026-07-16`, only two records currently use `episodeCountSource: "YUC"`, and six final totals still differ from the current YUC page.

### Task 2: Add a failing Skeleton Knight split-schedule test

**Files:**
- Modify: `tests/anime-data.test.mjs:491-522`

- [x] **Step 1: Add the schedule regression after the Mushoku Tensei test**

```js
test("schedules Skeleton Knight's timed premiere before its weekly Monday run", () => {
  const skeletonKnight = anime.find(({ id }) => id === "skeleton-knight-2");
  const compactEvents = (weekStart) =>
    eventsForWeek([skeletonKnight], weekStart).map(({ episodeStart, episode, broadcastDate, time }) => ({
      episodeStart,
      episode,
      broadcastDate,
      time,
    }));

  assert.equal(skeletonKnight?.scheduleSourceName, "YUC 2026年7月新番表");
  assert.deepEqual(compactEvents("2026-06-29"), [
    { episodeStart: 1, episode: 1, broadcastDate: "2026-07-04", time: "19:30" },
  ]);
  assert.deepEqual(compactEvents("2026-07-06"), [
    { episodeStart: 2, episode: 2, broadcastDate: "2026-07-06", time: "21:00" },
  ]);
  assert.deepEqual(compactEvents("2026-07-13"), [
    { episodeStart: 3, episode: 3, broadcastDate: "2026-07-13", time: "21:00" },
  ]);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --test-name-pattern="Skeleton Knight" tests/anime-data.test.mjs
```

Expected: FAIL because the current record has no `scheduleSourceName` and repeats at Saturday 19:30 instead of moving episode 2 onward to Monday 21:00.

### Task 3: Apply the minimal YUC data refresh

**Files:**
- Modify: `data/anime.js:11-18,20-888,899-906`

- [x] **Step 1: Update the audit date**

Set:

```js
"updatedAt": "2026-09-01",
```

- [x] **Step 2: Update the 16 raw YUC totals required by the current page**

Change the `episodeCount` in the matching `yucAnime` object for every entry in this exact checklist:

```js
const requiredRawEpisodeCounts = {
  "grow-up-show": 13,
  "yume-mita": 13,
  "ghost-in-the-shell": 10,
  "bleach-tybw-kashin": 10,
  "clevatess-2": 13,
  "hanazakari-2": 13,
  "seihantai-kimi-boku": 13,
  "world-is-dancing": 13,
  "reiwa-no-darasan": 13,
  "uchioto": 24,
  "kimi-shinu-koi": 13,
  "futsutsuka-akujo": 11,
  "mushoku-3": 14,
  "victoria": 9,
  "tsuiho-juki": 26,
  "20th-century-electric-catalog": 13,
};
```

The checklist is not a new runtime constant; edit the existing records in place.

- [x] **Step 3: Make the two question-mark records the only non-YUC totals**

Replace the two-ID exact set and its lookup with:

```js
const yucUnconfirmedEpisodeCountIds = new Set(["100-girlfriends-3", "hellmode-2"]);
const verifiedJulySchedules = new Map(syoboiHistory2026.entries.map((entry) => [entry.recordId, entry]));

function withYucSources(record) {
  const aniList = julyAniListByTitle.get(normalizeTitle(record.titleJa));
  const yucEpisodeCount = !yucUnconfirmedEpisodeCountIds.has(record.id);
  const episodeCount = yucEpisodeCount ? record.episodeCount : aniList?.episodeCount ?? record.episodeCount;
  const episodeCountSource = yucEpisodeCount ? "YUC" : aniList ? "AniList" : "estimated";
```

Leave the remainder of `withYucSources` unchanged.

- [x] **Step 4: Replace Skeleton Knight's single weekly slot with explicit segments**

Replace the current `skeleton-knight-2` object with:

```js
{
  "id": "skeleton-knight-2",
  "episodeCount": 12,
  "premiereEpisodeCount": 1,
  "regularBroadcastStartDateBeijing": "2026-07-06",
  "titleZh": "骸骨骑士大人异世界冒险中 第2期",
  "titleJa": "骸骨騎士様、只今異世界へお出掛け中 第2期",
  "coverUrl": "/covers/yuc/skeleton-knight-2.webp",
  "coverAlt": "骸骨骑士大人异世界冒险中 第2期 主视觉",
  "premiereDateBeijing": "2026-07-04",
  "scheduleWeekday": "Mon",
  "beijingTime": "21:00",
  "station": "YUC 周表",
  "episodeSchedules": [
    {
      "episodeStart": 1,
      "episodeEnd": 1,
      "broadcastDateBeijing": "2026-07-04",
      "beijingTime": "19:30",
      "intervalDays": 0
    },
    {
      "episodeStart": 2,
      "episodeEnd": 12,
      "broadcastDateBeijing": "2026-07-06",
      "beijingTime": "21:00",
      "intervalDays": 7
    }
  ],
  "episodeSchedulesSource": "YUC",
  "scheduleSourceName": "YUC 2026年7月新番表",
  "scheduleSourceUrl": "https://yuc.wiki/202607/",
  "scheduleChannel": "YUC 周表",
  "sourceUrl": "https://yuc.wiki/202607/"
},
```

Do not add `premiereKind`; both schedule segments have verified clock times.

- [x] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
node --test --test-name-pattern="auditable July 2026|current YUC July episode totals|Skeleton Knight" tests/anime-data.test.mjs
```

Expected: PASS for the refreshed snapshot, 64 exact YUC totals, the two question-mark exceptions, and all three Skeleton Knight event checks.

- [x] **Step 6: Run the complete data test file**

Run:

```bash
node --test tests/anime-data.test.mjs
```

Expected: PASS with no failures; existing YUC precedence, network premiere, Mushoku Tensei, Syoboi audit, and sprite assertions remain intact.

### Task 4: Validate and commit the scoped update

**Files:**
- Modify: `data/anime.js`
- Modify: `tests/anime-data.test.mjs`
- Create: `docs/superpowers/plans/2026-09-01-yuc-july-data-refresh.md`

- [x] **Step 1: Run lint**

Run:

```bash
npm run lint -- --ignore-pattern .worktrees
```

Expected: exit code 0 with no ESLint errors.

- [x] **Step 2: Run the full repository test command**

Run:

```bash
npm test
```

Expected: typecheck, production build, and all `tests/*.test.mjs` tests pass.

- [x] **Step 3: Verify diff scope and whitespace**

Run:

```bash
git diff --check
git status --short
git diff -- data/anime.js tests/anime-data.test.mjs docs/superpowers/plans/2026-09-01-yuc-july-data-refresh.md
```

Expected: no whitespace errors; only the two requested implementation files and this plan are changed. The pre-existing untracked `teach__/` remains untouched and uncommitted.

- [x] **Step 4: Commit only the scoped files**

```bash
git add data/anime.js tests/anime-data.test.mjs docs/superpowers/plans/2026-09-01-yuc-july-data-refresh.md
git commit -m "fix: refresh July 2026 YUC schedules"
```

- [x] **Step 5: Inspect the committed result without pushing**

Run:

```bash
git show --stat --oneline HEAD
git status --short
```

Expected: the implementation commit contains exactly the three scoped files; `teach__/` remains the only unrelated untracked path. Do not push or deploy unless the user explicitly requests it.
