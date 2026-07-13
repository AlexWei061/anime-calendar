# Personal Page URL and Selector Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the personal schedule open when its `?page=mine` URL is refreshed, and default the anime picker to collapsed.

**Architecture:** Keep the calendar as its existing client component. Derive the initial client-side page from `window.location.search`, write the selected page back to the URL through the History API, and resync on browser history navigation. Replace only the selection panel's always-visible header and body with a native `details` / `summary` disclosure.

**Tech Stack:** Next.js/Vinext, React 19, browser History API, CSS, Node built-in test runner.

---

## File structure

- Modify: `tests/rendered-html.test.mjs` — add source-level regressions for the URL page state and default-closed disclosure.
- Modify: `app/page.tsx` — synchronize the page navigation with `?page=mine` and make the picker a native disclosure.
- Modify: `app/globals.css` — style the disclosure summary while retaining the existing list and status styles.

### Task 1: Lock down the new navigation and disclosure contract

**Files:**
- Modify: `tests/rendered-html.test.mjs:180-250`

- [ ] **Step 1: Write the failing source-contract assertions**

Add the following checks in `keeps navigation, dialog wiring, and responsive calendar layout durable` after the existing `activePage` assertion:

```js
  assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("page"\)/);
  assert.match(page, /window\.history\.pushState\(null, "", url\);/);
  assert.match(page, /window\.addEventListener\("popstate", syncPageFromUrl\)/);
  assert.match(page, /<details className="anime-selection-details">/);
  assert.match(page, /<summary className="anime-selection-summary">/);
  assert.match(page, /本季度想追什么？/);
```

Add this CSS assertion after the existing `.anime-selection-list` assertion:

```js
  assert.match(styles, /\.anime-selection-summary\s*\{[\s\S]*?cursor:\s*pointer;/);
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: FAIL because `app/page.tsx` neither reads `page` from the URL nor contains the disclosure markup.

### Task 2: Synchronize selected page with the URL

**Files:**
- Modify: `app/page.tsx:77-146`
- Modify: `app/page.tsx:252-266`

- [ ] **Step 1: Add the URL parser next to the existing date helpers**

```tsx
function pageFromSearch(search: string): Page {
  return new URLSearchParams(search).get("page") === "mine" ? "mine" : "all";
}
```

- [ ] **Step 2: Synchronize the client page state with browser history**

Insert this effect before the existing selection-loading effect. It preserves the server-rendered `"all"` first render and switches to `"mine"` only after hydration when the URL requests it.

```tsx
  useEffect(() => {
    const syncPageFromUrl = () => setActivePage(pageFromSearch(window.location.search));

    syncPageFromUrl();
    window.addEventListener("popstate", syncPageFromUrl);
    return () => window.removeEventListener("popstate", syncPageFromUrl);
  }, []);
```

Add this callback before `changeWeek`:

```tsx
  const changePage = (page: Page) => {
    if (page === activePage) return;

    const url = new URL(window.location.href);
    if (page === "mine") {
      url.searchParams.set("page", "mine");
    } else {
      url.searchParams.delete("page");
    }
    window.history.pushState(null, "", url);
    setActivePage(page);
  };
```

Replace both navigation callbacks so they call `changePage`:

```tsx
onClick={() => changePage("all")}
```

```tsx
onClick={() => changePage("mine")}
```

- [ ] **Step 3: Run the focused test and confirm the URL assertions pass**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: The URL-state assertions pass; the test still fails only because the picker has not yet become a disclosure.

### Task 3: Collapse the anime picker by default

**Files:**
- Modify: `app/page.tsx:292-325`
- Modify: `app/globals.css:174-228`

- [ ] **Step 1: Replace the always-visible selection header with native disclosure markup**

Keep the selection list, loading status, saving error, checkbox bindings, and their conditionals unchanged inside the `details` element. Replace the outer panel with:

```tsx
      {activePage === "mine" ? (
        <section className="anime-selection-panel" aria-labelledby="anime-selection-heading">
          <details className="anime-selection-details">
            <summary className="anime-selection-summary">
              <span className="section-kicker">选择番剧</span>
              <span className="anime-selection-title" id="anime-selection-heading">
                本季度想追什么？
              </span>
              <span className="anime-selection-summary-copy">
                选择会自动保存，并在登录同一 ChatGPT 账号的设备间同步。
              </span>
            </summary>
            {selectedAnimeIds ? (
              <div className="anime-selection-list">
                {anime.map((record) => (
                  <label className="anime-selection" key={record.id}>
                    <input
                      type="checkbox"
                      checked={selectedAnimeIds.includes(record.id)}
                      disabled={isSavingSelection}
                      onChange={() => void toggleAnimeSelection(record.id)}
                    />
                    <span>{record.titleZh}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="selection-status" aria-live="polite">
                {selectionError ?? "正在读取你的追番列表…"}
              </p>
            )}
            {selectedAnimeIds && selectionError ? (
              <p className="selection-status" aria-live="polite">
                {selectionError}
              </p>
            ) : null}
          </details>
        </section>
      ) : null}
```

Do not add an `open` attribute: native `details` is closed by default.

- [ ] **Step 2: Add only the disclosure-specific styles**

Add this after `.anime-selection-panel`:

```css
.anime-selection-details {
  display: grid;
}

.anime-selection-summary {
  display: grid;
  gap: 0.35rem;
  cursor: pointer;
}

.anime-selection-title {
  font-family: Georgia, "Noto Serif SC", "Songti SC", serif;
  font-size: 1.5rem;
  font-weight: 700;
}

.anime-selection-summary-copy {
  color: var(--muted-ink);
}

.anime-selection-details[open] .anime-selection-list {
  margin-top: 1.25rem;
}
```

- [ ] **Step 3: Run the focused test and confirm it passes**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: PASS with all rendered-page and source-contract assertions green.

### Task 4: Run the complete quality gate

**Files:**
- Verify only; no additional files.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: PASS for every `tests/*.test.mjs` file.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: exit code 0 with no lint errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0 and `dist/server/index.js` generated.

- [ ] **Step 4: Inspect the final diff**

Run: `git diff --check && git diff -- app/page.tsx app/globals.css tests/rendered-html.test.mjs`

Expected: no whitespace errors; diff limited to URL navigation, collapsed picker markup and styles, and its regression test.

- [ ] **Step 5: Commit the implementation**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: preserve personal schedule page"
```
