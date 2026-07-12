# Paged Summer Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static weekly list with an infinitely navigable seven-day time-grid that expands every anime into episode events through its configured run length.

**Architecture:** Store an episode count on every static YUC record, defaulting to 12 except where YUC explicitly states a count. Add a pure calendar helper that derives Monday-based weeks and episode events from existing Beijing schedule fields. The page owns the active-week and mobile-day state; it renders the helper output as a desktop time grid and a mobile single-day agenda.

**Tech Stack:** Vinext/React, JavaScript ESM data modules, Node test runner, CSS, Sites private deployment.

---

### Task 1: Encode YUC episode counts in the data snapshot

**Files:**
- Modify: `data/anime.js:8-803`
- Modify: `tests/anime-data.test.mjs:8-102`

- [ ] **Step 1: Write the failing episode-count data assertion**

```js
assert.equal(anime.every(({ episodeCount }) => Number.isInteger(episodeCount)), true);
assert.equal(anime.find(({ id }) => id === "baki-dou-2")?.episodeCount, 12);
assert.equal(anime.find(({ id }) => id === "cyborg-009-nemesis")?.episodeCount, 3);
assert.equal(anime.find(({ id }) => id === "rezero-4-part-2")?.episodeCount, 8);
```

Include `episodeCount` in the record-key contract.

- [ ] **Step 2: Run the data test to verify RED**

Run: `node --test tests/anime-data.test.mjs`

Expected: FAIL because no record has `episodeCount`.

- [ ] **Step 3: Add the minimal static data**

Add `episodeCount: 12` to each of the 66 records. Override only these YUC-declared
values: `baki-dou-2: 12`, `cyborg-009-nemesis: 3`, and
`rezero-4-part-2: 8`.

- [ ] **Step 4: Run the data test to verify GREEN**

Run: `node --test tests/anime-data.test.mjs`

Expected: PASS.

### Task 2: Build a pure recurring-event calendar helper

**Files:**
- Create: `lib/calendar.js`
- Create: `tests/calendar.test.mjs`

- [ ] **Step 1: Write failing recurrence tests**

```js
test("puts each weekly episode in the requested Monday-based week", () => {
  const [event] = eventsForWeek(
    [{
      id: "demo",
      titleZh: "示例",
      premiereDateBeijing: "2026-07-01",
      scheduleWeekday: "Wed",
      beijingTime: "21:00",
      episodeCount: 12,
    }],
    "2026-07-06",
  );

  assert.deepEqual(
    { id: event.id, episode: event.episode, date: event.date, time: event.time },
    { id: "demo", episode: 2, date: "2026-07-08", time: "21:00" },
  );
});

test("stops generating after the configured episode count", () => {
  assert.deepEqual(eventsForWeek([threeEpisodeShow], "2026-07-27"), []);
});
```

Also assert that an event at `24:45` stays in its source Sunday column, that
records without a weekday/time generate no event, and that `weekDays("2026-07-06")`
returns Monday through Sunday ISO dates.

- [ ] **Step 2: Run calendar tests to verify RED**

Run: `node --test tests/calendar.test.mjs`

Expected: FAIL because `lib/calendar.js` does not exist.

- [ ] **Step 3: Implement the helper**

```js
export function weekDays(weekStart) {
  return Array.from({ length: 7 }, (_, offset) => addDays(weekStart, offset));
}

export function eventsForWeek(records, weekStart) {
  const dates = new Set(weekDays(weekStart));
  return records.flatMap((record) => {
    if (!record.scheduleWeekday || !record.beijingTime) return [];
    return Array.from({ length: record.episodeCount }, (_, index) => {
      const date = addDays(record.premiereDateBeijing, index * 7);
      return dates.has(date) ? [{ ...record, date, episode: index + 1, time: record.beijingTime }] : [];
    }).flat();
  }).sort((left, right) => left.time.localeCompare(right.time) || left.titleZh.localeCompare(right.titleZh));
}
```

Implement `addDays` with UTC date arithmetic and a `startOfWeek` helper that
returns the Monday for an ISO date.

- [ ] **Step 4: Run calendar tests to verify GREEN**

Run: `node --test tests/calendar.test.mjs`

Expected: PASS.

### Task 3: Render the paged desktop grid and mobile daily agenda

**Files:**
- Modify: `app/page.tsx:1-245`
- Modify: `app/globals.css:1-360`
- Modify: `tests/rendered-html.test.mjs:45-191`

- [ ] **Step 1: Write failing rendered-view assertions**

Assert server-rendered markup includes navigation buttons named `上一周`, `下一周`,
and `回到本周`; the classes `time-grid`, `time-column`, and
`calendar-event`; a short title `BanG Dream! YUME∞MITA`; and no
`week-column` or `catalog-grid` layout.

- [ ] **Step 2: Run render tests to verify RED**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: FAIL because the current page still renders `week-grid` and cards.

- [ ] **Step 3: Implement week navigation and time-grid markup**

Use `activeWeekStart` state initialized from the current Beijing date through
`startOfWeek`. Wire buttons to `addDays(activeWeekStart, -7)`,
`addDays(activeWeekStart, 7)`, and `startOfWeek(currentBeijingDate)`.
Render `eventsForWeek(anime, activeWeekStart)` in seven date columns. Each
`calendar-event` is a button whose vertical position is based on parsed
`HH:mm` hours and whose text is a single-line Chinese title plus episode number.
Reuse the existing dialog state and detail dialog.

For narrow screens, keep the active week but show one selected date at a time
with compact date buttons and a single vertical agenda. Render empty time
columns for dates without events in both layouts.

- [ ] **Step 4: Run render tests to verify GREEN**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: PASS.

### Task 4: Verify and publish the calendar redesign

**Files:**
- Modify: `data/anime.js`, `lib/calendar.js`, `app/page.tsx`,
  `app/globals.css`, and the associated tests

- [ ] **Step 1: Run full verification**

Run: `npm test && npm run lint && git diff --check`

Expected: all tests pass; lint has no errors (the existing two image-element
warnings may remain); the diff check emits no output.

- [ ] **Step 2: Commit and push the validated redesign**

Run: `git add data/anime.js lib/calendar.js app/page.tsx app/globals.css tests && git commit -m "feat: add paged episode calendar" && git push origin main`

- [ ] **Step 3: Publish the exact commit privately**

Create a fresh Sites source credential, push the exact commit to the Sites
source repository with a per-command authorization header, package with
`package-site.sh`, save a version using the full commit SHA, deploy it with
`deploy_private_site_version`, and poll until it succeeds.
