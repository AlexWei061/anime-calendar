# Sticky Calendar Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the desktop week controls and weekday row visible while the week timeline scrolls beneath them.

**Architecture:** CSS native sticky positioning will pin `.week-pager` to the viewport top for the lifetime of `.weekly-section`. The existing grid header cells will pin directly beneath it, while the grid itself uses `overflow: clip` so it does not become the sticky scroll container. The React markup and all data/interactions stay unchanged.

**Tech Stack:** Next.js, React, CSS, Node built-in test runner, ESLint.

---

## File structure

- `app/globals.css`: desktop sticky geometry, stacking layers, opaque backgrounds, and the mobile reset.
- `tests/rendered-html.test.mjs`: source-level regression checks for the sticky desktop rules and mobile opt-out.

### Task 1: Define the sticky behavior in a failing regression test

**Files:**
- Modify: `tests/rendered-html.test.mjs:255-335`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Add a focused style assertion to the existing responsive-layout test**

Insert these assertions after the existing `.timeline-grid` assertion:

```js
  assert.match(
    styles,
    /\.week-pager\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*0;[\s\S]*?z-index:\s*3;/,
  );
  assert.match(
    styles,
    /\.timeline-corner,\s*\.timeline-day-header\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*var\(--week-pager-height\);[\s\S]*?z-index:\s*2;/,
  );
  assert.match(
    styles,
    /\.timeline-grid\s*\{[\s\S]*?overflow:\s*clip;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 860px\) \{[\s\S]*?\.week-pager\s*\{[\s\S]*?position:\s*static;/,
  );
```

- [ ] **Step 2: Run the regression test and verify it fails for missing sticky rules**

Run: `npm run build && node --test --test-name-pattern="keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs`

Expected: FAIL because `.week-pager` does not yet have `position: sticky` and the grid uses `overflow: hidden`.

### Task 2: Add the minimal desktop sticky CSS

**Files:**
- Modify: `app/globals.css:282-355`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Define the shared sticky offset and update the week pager rule**

Add the shared height to the existing `.weekly-section` rule so sibling grid headers can use it:

```css
.weekly-section {
  --week-pager-height: 3.25rem;
  padding: 2.25rem 0;
}
```

Then change `.week-pager` to preserve its flex layout and add the sticky geometry below:

```css
.week-pager {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0;
  min-height: var(--week-pager-height);
  padding: 0.5rem 0;
  background: var(--paper);
}
```

- [ ] **Step 2: Enable sticky grid headers without changing their appearance**

Replace `overflow: hidden` in `.timeline-grid` with `overflow: clip`. In the shared `.timeline-corner, .timeline-day-header` rule, add the following properties before `min-width`:

```css
  position: sticky;
  top: var(--week-pager-height);
  z-index: 2;
```

Remove the existing `position: relative` from `.timeline-day-header`; its `display`, padding, and today styles remain unchanged.

- [ ] **Step 3: Opt out on the mobile breakpoint**

At the beginning of the existing `@media (max-width: 860px)` block, add:

```css
  .week-pager {
    position: static;
    min-height: 0;
    margin-bottom: 1rem;
    padding: 0;
    background: transparent;
  }
```

The desktop time grid remains `display: none` at this breakpoint, so no header override is required.

- [ ] **Step 4: Run the focused regression test and verify it passes**

Run: `npm run build && node --test --test-name-pattern="keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs`

Expected: PASS with exactly one matching test and no assertion errors.

### Task 3: Verify the complete change

**Files:**
- Modify: none
- Test: `tests/*.test.mjs`

- [ ] **Step 1: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`

Expected: build completes and every `tests/*.test.mjs` test passes.

- [ ] **Step 3: Inspect the browser at desktop width**

Run: `npm run dev`

Open the local site at a desktop-width viewport. Scroll the timeline to its lower half, then verify the week buttons and all seven weekday headers stay visible, program cards pass behind them, and scrolling past the grid releases the sticky controls before the network section.

- [ ] **Step 4: Inspect the browser at mobile width**

With a viewport at or below `860px`, verify the desktop time grid is hidden and the existing single-day picker and agenda still scroll as before.

- [ ] **Step 5: Commit the implementation**

```bash
git add app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: keep calendar controls visible"
```
