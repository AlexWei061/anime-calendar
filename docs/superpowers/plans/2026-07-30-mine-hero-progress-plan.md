# Mine Hero Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `?page=mine` hero metrics compact and add an accessible overall-watch progress bar without changing the calendar, data model, or statistics page.

**Architecture:** Reuse the existing `personalWatchedEpisodeCount`, `personalEpisodeCount`, `personalProgressLabel`, and `isPersonalProgressLoading` values in the Mine hero. Only the third metric gains a native `<progress>` element once real episode totals are available. Scoped CSS prevents the right-side grid from stretching to the height of the title column and styles the native progress element from existing theme tokens.

**Tech Stack:** React 19, TypeScript, CSS design tokens, Node built-in test runner.

---

## File map

| File | Responsibility |
| --- | --- |
| `tests/rendered-html.test.mjs` | Lock the Mine-only progress markup, loading/empty-record branch, compact alignment, token-styled bar, and existing mobile one-column contract. |
| `app/page.tsx` | Render the semantic overall-progress bar in the existing Mine hero only. |
| `app/globals.css` | Make Mine metrics content-height on desktop and style the progress display with existing tokens. |

### Task 1: Add the red Mine-progress contract

**Files:**

- Modify: `tests/rendered-html.test.mjs:606-817`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Write the failing source and CSS assertions**

  In the existing `keeps navigation, dialog wiring, and responsive calendar layout durable` test, retain every current personal-hero and mobile assertion. Add assertions that require:

  ```js
  assert.match(
    page,
    /<div className="personal-progress-metric">[\s\S]*?<dt>整体进度<\/dt>[\s\S]*?isPersonalProgressLoading \? "读取中" : personalEpisodeCount \? \([\s\S]*?<progress\b(?=[^>]*className="personal-progress-bar")(?=[^>]*aria-label="整体观看进度")(?=[^>]*value=\{personalWatchedEpisodeCount\})(?=[^>]*max=\{personalEpisodeCount\})[^>]*>[\s\S]*?personalProgressLabel[\s\S]*?<\/progress>[\s\S]*?\) : personalProgressLabel[\s\S]*?<\/div>/,
  );
  const minePersonalHeroMetricsStyles = cssBlock(
    styles,
    "\\.personal-hero-mine \\.personal-hero-metrics",
  );
  assert.match(minePersonalHeroMetricsStyles, /align-self:\s*start/);
  assert.match(styles, /\.personal-progress-metric dd\s*\{[\s\S]*?display:\s*grid/);
  assert.match(styles, /\.personal-progress-bar\s*\{[\s\S]*?width:\s*100%/);
  assert.match(styles, /\.personal-progress-bar::-webkit-progress-value\s*\{[\s\S]*?var\(--accent\)/);
  assert.match(styles, /\.personal-progress-bar::-moz-progress-bar\s*\{[\s\S]*?var\(--accent\)/);
  ```

  The nested ternary is intentional: it must preserve the existing loading text, only render a bar with a positive total, and retain `personalProgressLabel` as the empty-record result and progress fallback text.

- [ ] **Step 2: Run the focused test to verify the red state**

  Run:

  ```bash
  node --test --test-name-pattern "keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs
  ```

  Expected: FAIL because `personal-progress-metric`, `personal-progress-bar`, and their CSS rules do not exist yet.

- [ ] **Step 3: Commit only the test contract**

  ```bash
  git add tests/rendered-html.test.mjs
  git diff --cached --check
  git commit -m "test: cover compact mine progress metric"
  ```

### Task 2: Render the Mine-only semantic progress bar

**Files:**

- Modify: `app/page.tsx:1225-1238`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Replace only the existing third Mine metric**

  Leave the first two metrics and all Stats markup untouched. Replace the existing third anonymous metric `<div>` with:

  ```tsx
  <div className="personal-progress-metric">
    <dt>整体进度</dt>
    <dd>
      {isPersonalProgressLoading ? "读取中" : personalEpisodeCount ? (
        <>
          <span>{personalProgressLabel}</span>
          <progress
            className="personal-progress-bar"
            aria-label="整体观看进度"
            value={personalWatchedEpisodeCount}
            max={personalEpisodeCount}
          >
            {personalProgressLabel}
          </progress>
        </>
      ) : personalProgressLabel}
    </dd>
  </div>
  ```

  Do not add a new API request, effect, source of truth, or percentage calculation. The existing counts are already integers in the same unit the user sees.

- [ ] **Step 2: Run type checking and the focused contract**

  Run:

  ```bash
  npm run typecheck
  node --test --test-name-pattern "keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs
  ```

  Expected: TypeScript passes; the focused test still fails only on CSS assertions until Task 3.

- [ ] **Step 3: Commit the page markup**

  ```bash
  git add app/page.tsx
  git diff --cached --check
  git commit -m "feat: show mine viewing progress bar"
  ```

### Task 3: Compact the metrics and style the native bar

**Files:**

- Modify: `app/globals.css:404-440`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Stop only the Mine desktop metric grid from stretching**

  Add this distinct scoped block after the existing `.personal-hero-metrics` rule:

  ```css
  .personal-hero-mine .personal-hero-metrics {
    align-self: start;
  }
  ```

  This prevents only the Mine metric grid from matching the title column height. Do not alter the Stats hero alignment or the existing mobile one-column rule.

- [ ] **Step 2: Add scoped Mine progress styles below the existing metric `dd` block**

  Add exactly these rules, preserving the project’s token-only color requirement:

  ```css
  .personal-progress-metric dd {
    display: grid;
    gap: 0.45rem;
    font-size: clamp(1rem, 1.55vw, 1.25rem);
  }

  .personal-progress-bar {
    width: 100%;
    height: 0.4rem;
    overflow: hidden;
    border: 0;
    border-radius: 999px;
    appearance: none;
    background: color-mix(in srgb, var(--accent-soft) 58%, var(--line));
  }

  .personal-progress-bar::-webkit-progress-bar {
    background: color-mix(in srgb, var(--accent-soft) 58%, var(--line));
  }

  .personal-progress-bar::-webkit-progress-value {
    background: var(--accent);
    border-radius: inherit;
  }

  .personal-progress-bar::-moz-progress-bar {
    background: var(--accent);
    border-radius: inherit;
  }
  ```

  Do not add a transition or transform. Do not edit the first `@media (max-width: 860px)` block: the existing single metric column and `width: 100%` bar already satisfy mobile behavior.

- [ ] **Step 3: Run the focused contract green**

  Run:

  ```bash
  node --test --test-name-pattern "keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs
  ```

  Expected: PASS.

- [ ] **Step 4: Run complete verification and commit CSS**

  Run:

  ```bash
  npm run lint -- --ignore-pattern .worktrees
  npm test
  git diff --check
  ```

  Expected: lint exits 0; `npm test` reports all tests passing; `git diff --check` has no output.

  Then commit:

  ```bash
  git add app/globals.css
  git diff --cached --check
  git commit -m "style: compact mine progress metrics"
  ```

### Task 4: Manually verify visual behavior

**Files:**

- Modify: none

- [ ] **Step 1: Run the local app**

  ```bash
  npm run dev -- --port 3002
  ```

- [ ] **Step 2: Inspect the Mine page at the approved breakpoints and themes**

  Check `http://localhost:3002/?page=mine` at desktop width and 390px width, once in each theme:

  - the first two cards are intrinsically short rather than stretched to the title column;
  - loaded data shows an exact episode count plus a visible full-width bar in the third card;
  - loading still reads “读取中” with no zero-value bar;
  - the seasonal picker, source link, search row, weekly schedule and mobile agenda retain their prior placement;
  - there is no horizontal overflow at 390px.

- [ ] **Step 3: Stop the temporary server and record results**

  Stop the server with `Ctrl-C`. Do not alter user account data while checking the page.
