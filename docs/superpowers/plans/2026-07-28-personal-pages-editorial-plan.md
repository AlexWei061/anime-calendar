# Personal Editorial Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `?page=mine` as a personal scheduling page and `?page=stats` as a progress archive, while preserving their existing selection, calendar, search, statistics, authentication, and watched-episode behavior.

**Architecture:** Keep `app/page.tsx` as the page-state owner and derive only small presentation totals from the already-loaded selected anime and watched-episode arrays. Replace the shared mine/stats generic header and outside search form with route-specific `personal-hero` sections; leave the existing weekly calendar, `<details>` selector, statistics accordions, season filter, dialogs, APIs, and URL/history logic in place. Add the personal-page visual system solely in `app/globals.css`, consuming existing dual-theme tokens.

**Tech Stack:** React 19, Next.js 16 / vinext, TypeScript, CSS custom properties, Node built-in test runner.

---

## File structure and boundaries

| File | Responsibility |
| --- | --- |
| `app/page.tsx` | Derive loading-safe personal summary totals; render mine and stats route-specific heroes; relocate (not duplicate) their existing search form. |
| `app/globals.css` | Define compact personal-hero, metric-grid, responsive, dark-theme-token, and reduced-motion rules without altering the broadcast Hero or calendar layout. |
| `tests/rendered-html.test.mjs` | Lock source-level route structure, data provenance, single search-form policy, personal-hero CSS contracts, and mobile grid behavior. |

### Task 1: Add the personal-page contract tests

**Files:**
- Modify: `tests/rendered-html.test.mjs:350-650`
- Modify: `tests/rendered-html.test.mjs:830-865`

- [ ] **Step 1: Add failing source and CSS assertions**

  In `keeps navigation, dialog wiring, and responsive calendar layout durable`, add assertions that describe the new route-specific contract rather than the current generic-header shape:

  ```js
  assert.match(page, /const isPersonalProgressLoading = selectedAnimeIds === null \|\| watchedEpisodes === null;/);
  assert.match(page, /const personalWatchedEpisodeCount = overallProgress\.reduce\(/);
  assert.match(page, /const personalEpisodeCount = overallProgress\.reduce\(/);
  assert.match(page, /activePage === "mine" \? \([\s\S]*?className="personal-hero personal-hero-mine"/);
  assert.match(page, /今天要追什么？/);
  assert.match(page, /selectedSeasonAnime\.length/);
  assert.match(page, /todayBroadcasts\.length/);
  assert.match(page, /activePage === "stats" \? \([\s\S]*?className="personal-hero personal-hero-stats"/);
  assert.match(page, /这一路追到哪了？/);
  assert.match(page, /displayedOverallProgressTotals\.inProgress/);
  assert.match(page, /displayedOverallProgressTotals\.completed/);
  assert.match(page, /displayedOverallProgressTotals\.notStarted/);
  assert.match(styles, /\.personal-hero\s*\{[\s\S]*?display:\s*grid;/);
  assert.match(styles, /\.personal-hero-metrics\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/);
  ```

  Also extract the first `@media (max-width: 860px)` block with the existing brace-balanced helper and assert:

  ```js
  const mobilePersonalHeroStyles = cssBlock(mobileStyles, "\\.personal-hero");
  const mobilePersonalMetricsStyles = cssBlock(mobileStyles, "\\.personal-hero-metrics");
  assert.match(mobilePersonalHeroStyles, /grid-template-columns:\s*1fr;/);
  assert.match(mobilePersonalMetricsStyles, /grid-template-columns:\s*1fr;/);
  ```

  Keep the existing assertions that the mobile calendar is `display: grid`, its picker has seven columns, desktop timeline is hidden at this breakpoint, and no grayscale filter is introduced.

- [ ] **Step 2: Update the search-form contract to describe its new placement**

  In `offers a search box on calendar pages that jumps to the search page`, replace the old assertion that captures a standalone `activePage === "mine" || activePage === "stats"` form. Require the existing all-page seasonal hero plus both route-specific personal heroes to contain a semantic `page-search` form, and keep a source-count assertion of exactly three static `<form className="page-search">` occurrences (all, mine, stats):

  ```js
  const mineHero = page.match(/activePage === "mine" \? \([\s\S]*?<section className="personal-hero personal-hero-mine"[\s\S]*?<\/section>/);
  const statsHero = page.match(/activePage === "stats" \? \([\s\S]*?<section className="personal-hero personal-hero-stats"[\s\S]*?<\/section>/);
  assert.ok(mineHero);
  assert.ok(statsHero);
  for (const source of [allPageHero[1], mineHero[0], statsHero[0]]) {
    assert.match(source, /<form\b(?=[^>]*className="page-search")(?=[^>]*role="search")[^>]*>[\s\S]*?<input\b(?=[^>]*name="pageSearch")(?=[^>]*type="search")[^>]*>/);
  }
  assert.equal((page.match(/<form\b(?=[^>]*className="page-search")/g) ?? []).length, 3);
  ```

  Add `assert.doesNotMatch(page, /\{activePage === "mine" \|\| activePage === "stats" \? \(/);` so a detached generic form cannot return.

- [ ] **Step 3: Run the focused test and confirm it fails**

  Run:

  ```bash
  node --test --test-name-pattern "keeps navigation, dialog wiring, and responsive calendar layout durable|offers a search box on calendar pages that jumps to the search page" tests/rendered-html.test.mjs
  ```

  Expected: FAIL because `isPersonalProgressLoading` and the `personal-hero` CSS blocks do not exist and the old shared mine/stats search-form condition is still present.

- [ ] **Step 4: Commit the test contract only**

  ```bash
  git add tests/rendered-html.test.mjs
  git commit -m "test: define personal editorial page contracts"
  ```

### Task 2: Render loading-safe personal heroes and relocate search forms

**Files:**
- Modify: `app/page.tsx:320-350`
- Modify: `app/page.tsx:985-1036`

- [ ] **Step 1: Derive only presentation totals from existing state**

  Immediately after the existing `overallProgress` / `displayedOverallProgressTotals` calculations, add loading-safe totals. These calculations must not read from an API or write state:

  ```ts
  const isPersonalProgressLoading = selectedAnimeIds === null || watchedEpisodes === null;
  const personalWatchedEpisodeCount = overallProgress.reduce(
    (total, progress) => total + progress.watchedEpisodeCount,
    0,
  );
  const personalEpisodeCount = overallProgress.reduce(
    (total, progress) => total + progress.record.episodeCount,
    0,
  );
  const personalProgressLabel = personalEpisodeCount
    ? `已看 ${personalWatchedEpisodeCount} / ${personalEpisodeCount} 集`
    : "还没有追番记录";
  ```

  Continue to use the existing `todayBroadcasts`, `selectedSeasonAnime`, and `displayedOverallProgressTotals`; do not add a new data-fetching effect, a database field, or a new route.

- [ ] **Step 2: Replace the mine generic header with the scheduling hero**

  Change the generic non-all header conditional so search remains the only route using `.calendar-header`. For mine, render this semantic section before the existing weekly calendar and selector:

  ```tsx
  {activePage === "mine" ? (
    <section className="personal-hero personal-hero-mine" aria-labelledby="mine-hero-heading">
      <div className="personal-hero-copy">
        <p className="season-kicker">我的番剧</p>
        <h1 id="mine-hero-heading">今天要追什么？</h1>
        <p className="intro">把今天和这一周的个人放送安排放在一起。</p>
        <div className="personal-hero-controls">
          <label className="season-picker">
            选择季度
            <select value={activeSeason.id} onChange={(event) => changeSeason(event.target.value)}>
              {seasons.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
              ))}
            </select>
            {isHistoricalSeason ? (
              <span>名称和封面来自 YUC；首播日期、北京时间与集数使用 AniList 历史记录。</span>
            ) : null}
          </label>
          <a className="source-link" href={activeSeason.sourceUrl} target="_blank" rel="noreferrer">
            {activeSeason.sourceName} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
      <dl className="personal-hero-metrics" aria-label="我的追番摘要">
        <div><dt>本季在追</dt><dd>{isPersonalProgressLoading ? "读取中" : `${selectedSeasonAnime.length} 部`}</dd></div>
        <div><dt>今天待看</dt><dd>{isPersonalProgressLoading ? "读取中" : `${todayBroadcasts.length} 集`}</dd></div>
        <div><dt>整体进度</dt><dd>{isPersonalProgressLoading ? "读取中" : personalProgressLabel}</dd></div>
      </dl>
      <form className="page-search" role="search" aria-label="查询番剧" onSubmit={submitPageSearch}>
        <label className="page-search-field">
          查询番剧
          <input name="pageSearch" type="search" placeholder="输入中文或日文名" />
        </label>
        <button type="submit">查询</button>
      </form>
    </section>
  ) : null}
  ```

  Keep `isHistoricalSeason` text in the mine hero. Do not move the existing `<details className="anime-selection-details">`, weekly section, mobile agenda, or network section.

- [ ] **Step 3: Replace the stats generic header with the archive hero**

  Add a sibling stats-only hero, using the already-selected season filter totals. Preserve the existing `statistics-page` subtree unchanged below it:

  ```tsx
  {activePage === "stats" ? (
    <section className="personal-hero personal-hero-stats" aria-labelledby="stats-hero-heading">
      <div className="personal-hero-copy">
        <p className="season-kicker">追番档案</p>
        <h1 id="stats-hero-heading">这一路追到哪了？</h1>
        <p className="intro">按季度回顾收藏作品的观看进度。</p>
      </div>
      <dl className="personal-hero-metrics" aria-label="追番进度摘要">
        <div><dt>正在追</dt><dd>{isPersonalProgressLoading ? "读取中" : displayedOverallProgressTotals.inProgress}</dd></div>
        <div><dt>已看完</dt><dd>{isPersonalProgressLoading ? "读取中" : displayedOverallProgressTotals.completed}</dd></div>
        <div><dt>未开始</dt><dd>{isPersonalProgressLoading ? "读取中" : displayedOverallProgressTotals.notStarted}</dd></div>
      </dl>
      <form className="page-search" role="search" aria-label="查询番剧" onSubmit={submitPageSearch}>
        <label className="page-search-field">
          查询番剧
          <input name="pageSearch" type="search" placeholder="输入中文或日文名" />
        </label>
        <button type="submit">查询</button>
      </form>
    </section>
  ) : null}
  ```

  Reuse the current search-form label/input/button exact semantics in both personal heroes. Remove the former outside `{activePage === "mine" || activePage === "stats" ? (...) : null}` form so no runtime route has a duplicate query form.

- [ ] **Step 4: Run the focused route-contract tests and confirm page structure passes**

  Run:

  ```bash
  npm run typecheck
  npm run build
  node --test --test-name-pattern "server-renders a paged Beijing episode calendar|keeps navigation, dialog wiring, and responsive calendar layout durable|offers a search box on calendar pages that jumps to the search page" tests/rendered-html.test.mjs
  ```

  Expected: TypeScript and build pass; source/SSR tests pass except CSS-specific personal-hero assertions that Task 3 intentionally has not satisfied.

- [ ] **Step 5: Commit the page structure**

  ```bash
  git add app/page.tsx
  git commit -m "feat: add personal editorial page structure"
  ```

### Task 3: Style compact personal pages without disturbing broadcast pages

**Files:**
- Modify: `app/globals.css:210-360`
- Modify: `app/globals.css:1903-2137`
- Modify: `app/globals.css:2220-2250`

- [ ] **Step 1: Add the desktop personal-hero rules**

  Add rules adjacent to `.seasonal-hero`, not by changing that selector. The base shape must be compact, token-only, and not use the broadcast cover collage:

  ```css
  .personal-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(19rem, 0.9fr);
    grid-template-areas:
      "copy metrics"
      "search search";
    gap: 1rem clamp(1rem, 2.5vw, 2rem);
    padding: clamp(1.15rem, 2.5vw, 2rem);
    border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--line));
    border-radius: var(--radius-panel);
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent-soft) 38%, var(--card)), color-mix(in srgb, var(--accent-2) 18%, var(--card)));
    box-shadow: var(--shadow-raise);
  }

  .personal-hero-copy { grid-area: copy; min-width: 0; }
  .personal-hero-copy h1 { max-width: 15ch; font-size: clamp(1.85rem, 3.3vw, 2.8rem); }
  .personal-hero-metrics { grid-area: metrics; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.55rem; margin: 0; }
  .personal-hero-metrics div { min-width: 0; padding: 0.8rem; border-radius: var(--radius-card); background: color-mix(in srgb, var(--card) 76%, transparent); }
  .personal-hero-metrics dt { color: var(--muted-ink); font-size: 0.75rem; }
  .personal-hero-metrics dd { margin: 0.32rem 0 0; color: var(--accent-ink); font-family: var(--font-display); font-size: clamp(1rem, 1.8vw, 1.35rem); font-weight: 800; overflow-wrap: anywhere; }
  .personal-hero .page-search { grid-area: search; margin-top: 0; padding-top: 0.85rem; border-top: 1px solid color-mix(in srgb, var(--accent) 20%, var(--line)); }
  ```

  Add only narrow mine-specific control layout rules (for `.personal-hero-controls`) so the existing season picker/source link read as a compact horizontal group. Do not restyle `.calendar-header`, `.seasonal-hero`, `.weekly-section`, `.statistics-overview-summary`, or shared search-input rules.

- [ ] **Step 2: Add responsive and reduced-motion rules**

  In the first existing `@media (max-width: 860px)` block, add:

  ```css
  .personal-hero { grid-template-columns: 1fr; grid-template-areas: "copy" "metrics" "search"; padding: 1.15rem; }
  .personal-hero-metrics { grid-template-columns: 1fr; }
  .personal-hero-controls { align-items: stretch; flex-direction: column; }
  ```

  Keep the existing mobile `.page-sidebar`, `.week-pager`, `.timeline-grid`, `.mobile-calendar`, and `.mobile-day-picker` declarations untouched. If the new personal metric cards have a hover transform, append their selector to the existing `prefers-reduced-motion: reduce` reset and explicitly set `transform: none`; otherwise do not add a decorative movement.

- [ ] **Step 3: Run the focused tests and confirm all personal-page contracts pass**

  Run:

  ```bash
  node --test --test-name-pattern "keeps navigation, dialog wiring, and responsive calendar layout durable|offers a search box on calendar pages that jumps to the search page|supports light and neon-dark themes through one set of design tokens" tests/rendered-html.test.mjs
  ```

  Expected: PASS. The responsive test must still prove the seven-column mobile date picker, `display: grid` mobile agenda, top-navigation mobile override, no grayscale filter, and reduced-motion contract.

- [ ] **Step 4: Run the project verification suite**

  Run:

  ```bash
  npm run lint -- --ignore-pattern .worktrees
  npm test
  git diff --check
  ```

  Expected: lint exits 0; `npm test` runs strict typecheck, Worker build, and all Node tests with no failures; `git diff --check` prints no output. The existing vinext chunk-size warning is non-fatal.

- [ ] **Step 5: Commit the personal-page styling**

  ```bash
  git add app/globals.css
  git commit -m "feat: style personal editorial pages"
  ```

### Task 4: Manual browser verification and focused review

**Files:**
- Verify only: `app/page.tsx`, `app/globals.css`, `tests/rendered-html.test.mjs`

- [ ] **Step 1: Run the local app and inspect the two desktop routes**

  Run:

  ```bash
  npm run dev -- --port 3002
  ```

  Verify at desktop width:

  - `?page=mine` shows “今天要追什么？”, three personal metrics, source/season controls, exactly one page search form, then the existing weekly calendar and selection `<details>`.
  - `?page=stats` shows “这一路追到哪了？”, three status totals, exactly one page search form, then the existing today accordion and overall-progress season selector.
  - Top navigation, detail dialogs, selected-card buttons, season switching, and theme toggle remain usable.

- [ ] **Step 2: Inspect the mobile and theme states**

  At `390px` width, verify both personal heroes have one metric per row and no horizontal overflow; the pill navigation, seven-day picker, and single-day agenda are still visible. Toggle dark theme, reload once, and verify the selected theme remains legible and persisted.

- [ ] **Step 3: Stop the temporary development server**

  Stop only the process started in Step 1. Confirm the chosen port has no listener.

- [ ] **Step 4: Request a final code review**

  Review the final diff for URL/history, authentication, watched-episode controls, search-form duplication, token-only colors, accessibility semantics, responsive scope, and test weakness. Resolve any P0–P2 issue before integration.
