# Sticky Sidebar Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the desktop “播出表” and “我的番剧” navigation visible while the calendar scrolls.

**Architecture:** The existing sidebar already uses CSS sticky positioning. A single `align-self: start` declaration prevents the grid layout from stretching the sidebar to the full calendar height, allowing the existing `top: 0` behavior to work. The mobile breakpoint retains its current static navigation.

**Tech Stack:** CSS, Node built-in test runner, ESLint.

---

## File structure

- `app/globals.css`: defines the desktop sidebar's grid alignment.
- `tests/rendered-html.test.mjs`: ensures the desktop sticky alignment and mobile static behavior remain present.

### Task 1: Add a failing regression assertion

**Files:**
- Modify: `tests/rendered-html.test.mjs:415-419`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Add the CSS assertion after the existing sidebar assertion**

```js
  assert.match(
    styles,
    /\.page-sidebar\s*\{[\s\S]*?align-self:\s*start;[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*0;/,
  );
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm run build && node --test --test-name-pattern="keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs`

Expected: FAIL because `.page-sidebar` does not yet specify `align-self: start`.

### Task 2: Make the sidebar an intrinsic-height grid item

**Files:**
- Modify: `app/globals.css:55-65`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Add the alignment declaration to the existing sidebar rule**

```css
.page-sidebar {
  align-self: start;
  position: sticky;
  top: 0;
  display: grid;
  align-content: start;
  gap: 0.35rem;
  min-height: 100vh;
  padding: 2rem 1rem;
  border-right: 1px solid var(--line);
  background: var(--paper-deep);
}
```

- [ ] **Step 2: Run the focused test and verify it passes**

Run: `npm run build && node --test --test-name-pattern="keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs`

Expected: PASS with one matching test and no assertion errors.

### Task 3: Verify and commit the user-visible behavior

**Files:**
- Modify: none
- Test: `tests/*.test.mjs`

- [ ] **Step 1: Verify desktop scrolling in the browser**

Run: `npm run dev`

At a width above `860px`, scroll through the timeline and verify the sidebar remains at viewport top with both navigation buttons visible and clickable.

- [ ] **Step 2: Verify the mobile breakpoint**

At `800px` width, verify the sidebar remains at the top of normal document flow and is not sticky.

- [ ] **Step 3: Run the project checks**

Run: `npm run lint -- --ignore-pattern .worktrees`

Expected: exit code 0 with no lint errors.

Run: `npm test`

Expected: build completes and all Node tests pass.

- [ ] **Step 4: Commit the implementation**

```bash
git add app/globals.css tests/rendered-html.test.mjs
git commit -m "fix: keep sidebar navigation visible"
```
