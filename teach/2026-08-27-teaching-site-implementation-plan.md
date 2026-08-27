# Anime Calendar Teaching Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free, dual-track teaching website in `teach/` that lets the user systematically learn the anime-calendar codebase and use the same content as a long-term maintenance and debugging manual.

**Architecture:** Use semantic static HTML pages so core reading and navigation work from `file://` without JavaScript. Add one shared stylesheet, one progressively enhanced classic script, and one small search-index script for theme, search, progress, copying, project-map highlighting, quizzes, debug labs, and presentation mode. Keep all persistent keys under `anime-calendar-teach:` and leave the application plus `teach__/` untouched.

**Tech Stack:** HTML5, CSS custom properties, vanilla JavaScript, browser `localStorage`, Node.js built-in test runner, Node.js `vm` and filesystem APIs.

---

## File map

| File | Responsibility |
| --- | --- |
| `teach/index.html` | First meaningful viewport, two learning routes, project pipeline, progress summary, task shortcuts. |
| `teach/map.html` | Interactive layer map and the schedule, selection, and login data flows. |
| `teach/reference.html` | Terms, commands, status codes, file lookup, update order, and safety boundaries. |
| `teach/styles.css` | Design tokens, layouts, components, responsive behavior, print/presentation rules, reduced motion. |
| `teach/search-index.js` | Compact metadata for every public teaching page. |
| `teach/app.js` | Progressive enhancement and testable pure helpers; no content duplication. |
| `teach/learn/*.html` | Eight systematic learning modules. |
| `teach/handbook/*.html` | Seven task-oriented maintenance guides. |
| `teach/lab/*.html` | Debug lab index and three scenario exercises. |
| `teach/tests/site.test.mjs` | File/link/content contracts and unit tests for shared helpers. |

The existing `teach/design.md` remains the authoritative approved specification. Do not read from, link to, modify, stage, or delete `teach__/`.

## Shared page contract

Every HTML page must contain all of the following, in this order:

1. `<!doctype html>` and `<html lang="zh-CN">` with `data-root="."` on root pages or `data-root=".."` on nested pages.
2. UTF-8 charset, responsive viewport, a page-specific Chinese description, and a title ending in `｜番剧日历维护学院`.
3. The correct relative links to `styles.css`, `search-index.js`, and `app.js`.
4. A unique `body[data-page-id]`, a skip link to `#main`, and a visible site header.
5. A brand link back to `index.html` plus links to project map, system learning, immediate tasks, Debug lab, and reference.
6. An empty `[data-enhancement-actions]` container where JavaScript adds theme, search, and presentation buttons.
7. `<main id="main" class="page-shell">` containing a visible breadcrumb and one article with the page's complete content.
8. A `noscript` note stating that interactions require JavaScript while text and normal links remain available.

Root pages reference assets and destinations without `../`; nested pages use `../`. All pages must have unique Chinese titles, descriptions, `data-page-id` values, and progress IDs.

### Task 1: Establish the static-site contract tests

**Files:**
- Create: `teach/tests/site.test.mjs`
- Reference: `teach/design.md`

- [ ] **Step 1: Write the first failing structural tests**

Create `teach/tests/site.test.mjs` with Node built-ins only. Define the final page inventory up front, but split assertions into named tests so focused tests can be run while pages are added:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

const repoRoot = resolve(import.meta.dirname, "../..");
const teachRoot = join(repoRoot, "teach");

const pages = [
  "index.html",
  "map.html",
  "reference.html",
  "learn/01-language.html",
  "learn/02-web.html",
  "learn/03-react.html",
  "learn/04-architecture.html",
  "learn/05-calendar.html",
  "learn/06-backend.html",
  "learn/07-tooling.html",
  "learn/08-maintenance.html",
  "handbook/ui.html",
  "handbook/schedule.html",
  "handbook/data-pipeline.html",
  "handbook/personal-data.html",
  "handbook/auth.html",
  "handbook/database.html",
  "handbook/release.html",
  "lab/index.html",
  "lab/midnight.html",
  "lab/session.html",
  "lab/watched.html",
];

function read(relativePath) {
  return readFileSync(join(teachRoot, relativePath), "utf8");
}

function loadClassicScript(relativePath, seed = {}) {
  const context = vm.createContext({ ...seed });
  vm.runInContext(read(relativePath), context, { filename: relativePath });
  return context;
}

test("core teaching-site assets exist", () => {
  for (const path of ["index.html", "styles.css", "search-index.js", "app.js"]) {
    assert.equal(existsSync(join(teachRoot, path)), true, `${path} should exist`);
  }
});

test("the home page identifies both learning routes", () => {
  const html = read("index.html");
  assert.match(html, /系统学习/);
  assert.match(html, /立即做事/);
  assert.match(html, /data-project-pipeline/);
  assert.match(html, /fa0b83c/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test --test-name-pattern="core teaching-site assets|home page" teach/tests/site.test.mjs
```

Expected: FAIL because `teach/index.html`, `teach/styles.css`, `teach/search-index.js`, and `teach/app.js` do not exist.

- [ ] **Step 3: Commit only the failing test**

```bash
git add teach/tests/site.test.mjs
git commit -m "test: define teaching site shell contract"
```

### Task 2: Build the first meaningful homepage slice

**Files:**
- Create: `teach/index.html`
- Create: `teach/styles.css`
- Create: `teach/search-index.js`
- Create: `teach/app.js`
- Test: `teach/tests/site.test.mjs`

- [ ] **Step 1: Create the recognizable homepage**

Build `teach/index.html` with root-relative assets and these exact product sections:

1. Hero: “从会写算法，到能接管这座网站” and a sentence naming the user's math, C++/Python, and olympiad background.
2. Two route cards: “系统学习” linking to `learn/01-language.html` and “立即做事” linking to `handbook/ui.html`.
3. A visible five-node pipeline marked `data-project-pipeline`: `data/ 静态事实 → lib/ 纯计算 → app/page.tsx 状态与界面 → app/api/ 身份与写入 → D1 个人数据`.
4. A “今天可以从这里开始” area linking to the project map, midnight debug lab, and maintenance workflow.
5. A progress panel using `[data-progress-summary]`, with useful fallback copy before JavaScript runs.
6. A baseline badge containing `fa0b83c` and 2026-08-27.

Use real headings and paragraphs in HTML; do not generate the hero or pipeline from JavaScript.

- [ ] **Step 2: Create the minimum coherent visual system**

Create `teach/styles.css` with the approved tokens and a recognizable first viewport:

```css
:root {
  color-scheme: light;
  --paper: #f7f2e8;
  --paper-strong: #fffdf8;
  --ink: #17263d;
  --muted: #617087;
  --line: #d9d2c5;
  --accent: #d95079;
  --accent-soft: #f7dbe4;
  --safe: #167d74;
  --safe-soft: #d9f0ec;
  --warn: #a76608;
  --warn-soft: #f8ead0;
  --danger: #b43a45;
  --danger-soft: #f8dfe2;
  --code: #122033;
  --shadow: 0 18px 45px rgb(23 38 61 / 0.12);
  --radius: 18px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #0e1727;
  --paper-strong: #152136;
  --ink: #edf2fb;
  --muted: #a9b6ca;
  --line: #33425a;
  --accent: #ff7da3;
  --accent-soft: #4a2433;
  --safe: #58c7b9;
  --safe-soft: #173b38;
  --warn: #f2bd62;
  --warn-soft: #46361c;
  --danger: #ff8e98;
  --danger-soft: #48242a;
  --code: #09111f;
  --shadow: 0 20px 50px rgb(0 0 0 / 0.3);
}
```

Add the coordinate-paper background, header, hero, route-card pair, pipeline nodes and connectors, progress panel, strong focus styles, `max-width: 1180px`, and a `760px` mobile breakpoint. Do not add animations beyond subtle hover/focus transitions in this slice.

- [ ] **Step 3: Add non-blocking script placeholders**

Create `teach/search-index.js` as a valid classic script with the home entry only:

```js
(function (global) {
  global.ANIME_CALENDAR_TEACH_INDEX = [
    {
      id: "home",
      title: "学习与维护入口",
      path: "index.html",
      section: "首页",
      keywords: ["学习路线", "维护", "项目全景"],
      summary: "从系统课程或真实维护任务进入番剧日历项目。",
    },
  ];
})(typeof window === "undefined" ? globalThis : window);
```

Create `teach/app.js` with a safe no-op initializer so the static slice compiles before interactions are added:

```js
(function (global) {
  "use strict";
  const api = { init() {} };
  global.AnimeCalendarTeach = api;
  if (global.document) api.init();
})(typeof window === "undefined" ? globalThis : window);
```

- [ ] **Step 4: Run the slice tests**

Run:

```bash
node --check teach/app.js
node --check teach/search-index.js
node --test --test-name-pattern="core teaching-site assets|home page" teach/tests/site.test.mjs
```

Expected: both syntax checks succeed and 2 tests pass.

- [ ] **Step 5: Complete the first meaningful preview handoff**

Start a retained local server from the repository root:

```bash
python3 -m http.server 4173
```

Verify `http://127.0.0.1:4173/teach/` returns a non-error response, then open that exact URL once with `open_in_codex`. Do not inspect the DOM, take screenshots, or perform visual QA unless the user asks.

- [ ] **Step 6: Commit the first slice**

```bash
git add teach/index.html teach/styles.css teach/search-index.js teach/app.js
git commit -m "feat: add teaching site learning dashboard"
```

### Task 3: Implement shared progressive enhancement

**Files:**
- Modify: `teach/app.js`
- Modify: `teach/styles.css`
- Modify: `teach/tests/site.test.mjs`

- [ ] **Step 1: Add failing helper tests**

Append tests that load `app.js` through `vm` and assert:

```js
test("search normalizes case, spaces, hyphens, and slashes", () => {
  const context = loadClassicScript("app.js");
  const { normalizeSearch } = context.AnimeCalendarTeach;
  assert.equal(normalizeSearch(" App/API  Anime-Selections "), "app api anime selections");
});

test("search matches title, keywords, summary, and path", () => {
  const context = loadClassicScript("app.js");
  const { searchEntries } = context.AnimeCalendarTeach;
  const entries = [
    { title: "登录", path: "handbook/auth.html", section: "维护", keywords: ["cookie"], summary: "排查 401" },
    { title: "时间轴", path: "learn/05-calendar.html", section: "课程", keywords: ["凌晨"], summary: "日期布局" },
  ];
  assert.equal(searchEntries(entries, "COOKIE")[0].title, "登录");
  assert.equal(searchEntries(entries, "401")[0].title, "登录");
  assert.equal(searchEntries(entries, "calendar")[0].title, "时间轴");
});

test("storage helpers fail closed without throwing", () => {
  const context = loadClassicScript("app.js");
  const brokenStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.equal(
    JSON.stringify(context.AnimeCalendarTeach.readJson(brokenStorage, "x", ["fallback"])),
    JSON.stringify(["fallback"]),
  );
  assert.equal(context.AnimeCalendarTeach.writeJson(brokenStorage, "x", []), false);
});
```

- [ ] **Step 2: Run and verify the helper tests fail**

```bash
node --test --test-name-pattern="search normalizes|search matches|storage helpers" teach/tests/site.test.mjs
```

Expected: FAIL because the functions are not exported by `AnimeCalendarTeach`.

- [ ] **Step 3: Implement pure helpers and browser initialization**

Replace the placeholder API in `teach/app.js` with these pure functions and expose them on `AnimeCalendarTeach`:

```js
const STORAGE_PREFIX = "anime-calendar-teach:";

function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\\/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchEntries(entries, query) {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  if (!terms.length) return [];
  return entries.filter((entry) => {
    const haystack = normalizeSearch([
      entry.title,
      entry.path,
      entry.section,
      entry.summary,
      ...(entry.keywords ?? []),
    ].join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

function readJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem(STORAGE_PREFIX + key);
    return raw === null || raw === undefined ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage?.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
```

Implement browser-only initializers for:

- theme button using `anime-calendar-teach:theme`;
- search dialog with `role="dialog"`, focus return, Escape close, links prefixed by `document.documentElement.dataset.root`, and a no-result state linking to the project map and reference page;
- `[data-progress-id]` checkboxes and `[data-progress-summary]`;
- copy buttons for every `[data-copy]`, retaining selectable text on failure;
- `[data-quiz]` choice feedback using `data-correct="true"`;
- `[data-flow-control]` map highlighting using `aria-pressed`;
- `[data-presentation-toggle]`, treating direct child `[data-slide]` elements as slides;
- keyboard shortcuts: `/` opens search only when focus is not in a form field; Escape closes dialogs or presentation mode.

Keep `init()` guarded by `if (!global.document) return`. Do not call any API or use project-owned storage keys.

- [ ] **Step 4: Add the shared component styles**

Extend `teach/styles.css` for `.search-dialog`, `.search-result`, `.progress-check`, `.copy-button`, `.quiz-choice`, `.feedback`, `.flow-control`, `.is-flow-active`, `.presentation-toolbar`, and `body.is-presenting`. Add `@media (prefers-reduced-motion: reduce)` that disables transition and scroll animation.

- [ ] **Step 5: Run tests and syntax checks**

```bash
node --check teach/app.js
node --test --test-name-pattern="search normalizes|search matches|storage helpers" teach/tests/site.test.mjs
```

Expected: all helper tests pass.

- [ ] **Step 6: Commit shared behavior**

```bash
git add teach/app.js teach/styles.css teach/tests/site.test.mjs
git commit -m "feat: add teaching site interactions"
```

### Task 4: Build the interactive project map

**Files:**
- Create: `teach/map.html`
- Modify: `teach/styles.css`
- Modify: `teach/search-index.js`
- Modify: `teach/tests/site.test.mjs`

- [ ] **Step 1: Add a failing map contract test**

```js
test("project map exposes all layers and three data flows", () => {
  const html = read("map.html");
  for (const layer of ["browser", "data", "lib", "react", "api", "auth", "d1", "build"]) {
    assert.match(html, new RegExp(`data-layer="${layer}"`));
  }
  for (const flow of ["calendar", "selection", "session"]) {
    assert.match(html, new RegExp(`data-flow-control="${flow}"`));
  }
});
```

Run it and expect ENOENT for `teach/map.html`.

- [ ] **Step 2: Create the map page with real project facts**

Create eight expandable layer cards. Each card must state responsibility, input, output, dependencies, reading entry, and a likely failure. Use these exact anchors:

| Layer | Required files or symbols |
| --- | --- |
| browser | URL `?page=`, `localStorage ac-theme`, `ac_session` Cookie |
| data | `data/anime.js`, generated `data/yuc-history-<year>.js`, `data/cover-sprites.js` |
| lib | `eventsForWeek`, `dateOnlyEventsForWeek`, `layoutTimelineEvents`, `episodeViewUnitsForAnime` |
| react | `app/page.tsx`, `Home`, `useState`, `useEffect`, `fetch()` |
| api | `app/api/anime-selections/route.ts`, `app/api/anime-episode-views/route.ts` |
| auth | `app/auth.ts`, `lib/auth.js`, `getSessionUser`, `PBKDF2`, token SHA-256 |
| d1 | `db/schema.ts`, `db/index.ts`, `drizzle/` |
| build | `worker/index.ts`, `vite.config.ts`, `build/sites-vite-plugin.ts` |

Add three flow controls and mark participating nodes with `data-flows="calendar selection"`-style space-separated values:

- calendar: `data → lib → react → browser`;
- selection: `browser → react → api → auth → d1`;
- session: `browser → api → auth → d1 → browser`.

- [ ] **Step 3: Add map layout styles and index entry**

Use CSS Grid for the desktop layer chain and a vertical line for narrow screens. Highlight a selected flow with color plus a visible “路径中” label; do not rely on color alone. Add the `map.html` entry to `search-index.js` with keywords `架构`, `数据流`, `文件地图`, `依赖`.

- [ ] **Step 4: Run and commit**

```bash
node --test --test-name-pattern="project map" teach/tests/site.test.mjs
git add teach/map.html teach/styles.css teach/search-index.js teach/tests/site.test.mjs
git commit -m "feat: add interactive project map"
```

### Task 5: Add foundational learning modules 01–04

**Files:**
- Create: `teach/learn/01-language.html`
- Create: `teach/learn/02-web.html`
- Create: `teach/learn/03-react.html`
- Create: `teach/learn/04-architecture.html`
- Modify: `teach/search-index.js`
- Modify: `teach/tests/site.test.mjs`

- [ ] **Step 1: Add failing content-marker tests**

Assert each file exists and contains the listed markers:

```js
const learningMarkers = new Map([
  ["learn/01-language.html", ["const", "async", "TypeScript", "C++"]],
  ["learn/02-web.html", ["HTTP", "Cookie", "JSON", "401"]],
  ["learn/03-react.html", ["UI = f(state)", "useState", "useEffect", "app/page.tsx"]],
  ["learn/04-architecture.html", ["data/anime.js", "lib/calendar.js", "app/api", "D1"]],
]);

test("foundational modules connect concepts to this repository", () => {
  for (const [path, markers] of learningMarkers) {
    const html = read(path);
    for (const marker of markers) assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
```

Run the focused test and expect missing-file failures.

- [ ] **Step 2: Write module 01 — language migration**

Required sections:

1. “先别学完整门语言”：only syntax used in the repository.
2. Translation table for `struct/dict → object`, `vector/list → array`, `map/filter`, destructuring, spread, optional chaining, nullish coalescing.
3. `const` means non-rebindable name, not immutable object.
4. Module imports using the actual top of `app/page.tsx`.
5. `Promise` and `await` using `fetch("/api/auth/me")`.
6. TypeScript type aliases using `Anime`, `Page`, and `AuthUser` from `app/page.tsx`.
7. Exercise: predict three snippets and explain the answers.

- [ ] **Step 3: Write module 02 — Web runtime**

Required sections:

1. HTML/CSS/JS responsibilities.
2. Browser ↔ Worker ↔ D1 request path.
3. HTTP method table using project GET/PUT/POST routes.
4. JSON request/response examples from anime selections.
5. Cookie versus `localStorage`, explicitly distinguishing `ac_session` and `ac-theme` from tutorial keys.
6. Status codes 200/201/400/401/409/500 with project examples.
7. DevTools Network/Application/Console decision table.

- [ ] **Step 4: Write module 03 — React**

Required sections:

1. `UI = f(state)` with a pure mathematical-function analogy and the limit of that analogy.
2. Component and JSX translation.
3. `useState` inventory grouped as navigation, selection, watched state, auth, dialog, and responsive state.
4. `useEffect` as synchronization, not generic business logic.
5. The `fetch → response → setState → rerender` loop.
6. URL state and `popstate` for back/forward behavior.
7. A guided method for reading the 2111-line `Home` component without reading top-to-bottom.

- [ ] **Step 5: Write module 04 — architecture**

Required sections:

1. Static catalog versus per-user database data.
2. Directory responsibilities and generated-file warnings.
3. Imports as a dependency graph.
4. Three traces linked back to `map.html`.
5. “Where should this code live?” exercises covering JSX, pure date math, API validation, and generated snapshots.
6. Reading order for a first repository tour.

Every module must contain at least one `.analogy`, one `.invariant`, one `[data-progress-id]`, one quiz with visible answer explanation inside `details`, previous/next links, and project-file search commands using `rg`.

- [ ] **Step 6: Add four search-index entries and run tests**

Run:

```bash
node --test --test-name-pattern="foundational modules" teach/tests/site.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit modules 01–04**

```bash
git add teach/learn/01-language.html teach/learn/02-web.html teach/learn/03-react.html teach/learn/04-architecture.html teach/search-index.js teach/tests/site.test.mjs
git commit -m "docs: add foundational project lessons"
```

### Task 6: Add project-depth learning modules 05–08

**Files:**
- Create: `teach/learn/05-calendar.html`
- Create: `teach/learn/06-backend.html`
- Create: `teach/learn/07-tooling.html`
- Create: `teach/learn/08-maintenance.html`
- Modify: `teach/search-index.js`
- Modify: `teach/tests/site.test.mjs`

- [ ] **Step 1: Add failing content-marker tests**

Require:

- module 05: `layoutBroadcast`, `eventsForWeek`, `dateOnlyEventsForWeek`, `layoutTimelineEvents`;
- module 06: `getSessionUser`, `db.batch`, `PBKDF2`, `drizzle/`;
- module 07: `typecheck`, `vinext`, `Cloudflare Worker`, `node --test`;
- module 08: `复现`, `回归测试`, `最小修复`, `git diff --check`.

- [ ] **Step 2: Write module 05 — calendar algorithms**

Explain each algorithm as input, output, invariant, boundary cases, and complexity:

1. ISO date parsing and UTC-only arithmetic.
2. `startOfWeek` with `(day + 6) % 7`.
3. `layoutBroadcast`: 00:00–04:59 becomes the previous calendar column and 24:00–28:59 internal time.
4. `eventsForWeek`: ordinary weekly schedules, network preview N episodes, and regular broadcast starting at N+1.
5. `dateOnlyEventsForWeek`: no invented minute time.
6. `layoutTimelineEvents`: overlap clusters and greedy lane assignment.
7. Test cases at 04:59/05:00, preview range, and overlapping cards.

- [ ] **Step 3: Write module 06 — backend, database, and security**

Cover:

1. Route handler anatomy and authentication-first control flow.
2. Four D1 tables from `db/schema.ts` and their composite keys.
3. `filterKnownAnimeIds`, maximum 50 selection IDs per insert batch, and atomic delete+insert in one `db.batch()`.
4. Single-episode watched keys and migration from legal legacy ranges.
5. PBKDF2 password hash, SHA-256 session-token hash, `HttpOnly`, `SameSite=Lax`, `Path=/`, and HTTPS-only `Secure`.
6. Why the browser never supplies the account email.
7. Drizzle schema → `npm run db:generate` → migration review.

- [ ] **Step 4: Write module 07 — tooling and runtime**

Cover Node `>=22.13.0`, npm scripts, dev/build distinction, vinext/Vite, Worker ESM, D1/R2 bindings, `worker/index.ts`, `vite.config.ts`, `build/sites-vite-plugin.ts`, and the exact `npm test` chain. Include a “which command should I run?” decision table.

- [ ] **Step 5: Write module 08 — maintenance reasoning**

Teach the full loop:

`clarify success → locate layer → reproduce → add failing test → minimal fix → targeted test → lint/full test → diff review → commit → publish only when asked`.

Use a proof template:

```text
Claim: the bug is fixed.
Counterexample before: the new regression test fails for the reported case.
Construction: the smallest code or data change.
Evidence after: the regression test passes, existing tests pass, constraints remain true.
Scope proof: git diff contains only task-related files.
```

- [ ] **Step 6: Add index entries, run tests, and commit**

```bash
node --test --test-name-pattern="project-depth modules" teach/tests/site.test.mjs
git add teach/learn/05-calendar.html teach/learn/06-backend.html teach/learn/07-tooling.html teach/learn/08-maintenance.html teach/search-index.js teach/tests/site.test.mjs
git commit -m "docs: add project depth lessons"
```

### Task 7: Add the seven task-oriented maintenance handbooks

**Files:**
- Create: `teach/handbook/ui.html`
- Create: `teach/handbook/schedule.html`
- Create: `teach/handbook/data-pipeline.html`
- Create: `teach/handbook/personal-data.html`
- Create: `teach/handbook/auth.html`
- Create: `teach/handbook/database.html`
- Create: `teach/handbook/release.html`
- Modify: `teach/search-index.js`
- Modify: `teach/tests/site.test.mjs`

- [ ] **Step 1: Add a failing handbook-structure test**

For every handbook page assert the presence of these visible headings: `成功标准`, `先读这些文件`, `最小修改顺序`, `回归测试`, `验证`, `停止并确认`. Also require at least one `[data-progress-id]` and one `.risk-level`.

- [ ] **Step 2: Write the UI handbook**

Cover `app/page.tsx`, `app/globals.css`, theme tokens, desktop/mobile parity, dialog focus, button semantics, `aria-pressed`, URL page state, and rendered HTML tests. Include separate paths for text-only, CSS-only, and interaction changes.

- [ ] **Step 3: Write the schedule handbook**

Cover `data/anime.js`, generated history files, source priority, no guessed times, `premiereEpisodeCount`, `regularBroadcastStartDateBeijing`, 00:00–04:59 broadcast-day semantics, and the two mandatory preview assertions.

- [ ] **Step 4: Write the data-pipeline handbook**

Give the exact full order:

`AniList → first YUC generation → Syoboi snapshot → second YUC generation → convert:covers-webp → generate:cover-sprites → tests/lint`.

Mark generated catalogs, sprite files, `.next/`, `dist/`, and `.wrangler/` as not hand-edited. Explain how `*Source` audit fields prevent lower-priority overwrite.

- [ ] **Step 5: Write the personal-data handbook**

Trace selected anime and watched episodes from `app/page.tsx` through the API to D1. Cover optimistic updates, 401 behavior, ID whitelisting, single-episode units, legacy migration, and batch limits.

- [ ] **Step 6: Write the auth handbook**

Provide separate symptom trees for registration, login, session restoration, logout, password change, and avatar. Distinguish browser/session → API → database → R2. Include the LAN HTTP cookie rule: `Secure` only for HTTPS.

- [ ] **Step 7: Write the database handbook**

Cover schema-first edits, `npm run db:generate`, migration inspection, local binding availability, composite keys, atomic batches, and the rule that real resource IDs and secrets never enter the repository.

- [ ] **Step 8: Write the release handbook**

Cover fresh remote ancestry, lint, `npm test`, `git diff --check`, exact validated commit, no force-push, private Sites access, deploy-status confirmation, and the distinction between commit, push, and deploy. Label all external mutations as “only after an explicit request”.

- [ ] **Step 9: Add search entries, run tests, and commit**

```bash
node --test --test-name-pattern="handbook" teach/tests/site.test.mjs
git add teach/handbook teach/search-index.js teach/tests/site.test.mjs
git commit -m "docs: add anime calendar maintenance handbooks"
```

### Task 8: Add the Debug laboratory

**Files:**
- Create: `teach/lab/index.html`
- Create: `teach/lab/midnight.html`
- Create: `teach/lab/session.html`
- Create: `teach/lab/watched.html`
- Modify: `teach/app.js`
- Modify: `teach/styles.css`
- Modify: `teach/search-index.js`
- Modify: `teach/tests/site.test.mjs`

- [ ] **Step 1: Add failing lab contract tests**

Require each scenario page to contain these stages: `现象`, `假设`, `证据`, `最小复现`, `回归测试`, `修复边界`. Require at least three `[data-debug-choice]` buttons and exactly one choice marked `data-correct="true"` for each decision step.

- [ ] **Step 2: Implement the reusable lab interaction**

In `app.js`, initialize every `[data-debug-stage]` independently:

- a choice click sets `aria-pressed` on the selected button;
- reveals the matching `[data-debug-feedback="choice-id"]`;
- unlocks the next stage only for `data-correct="true"`;
- records only completed scenario IDs, not wrong answers;
- `[data-debug-reset]` resets DOM state and removes that scenario from progress.

Add styles for locked/unlocked stages, evidence cards, correct reasoning, incorrect reasoning, and reset controls. Ensure hidden content uses the native `hidden` attribute.

- [ ] **Step 3: Write the midnight scenario**

Scenario facts:

- symptom: a Thursday 01:30 broadcast appears under Thursday rather than Wednesday “次日 01:30”;
- correct first layer: `lib/calendar.js`, not CSS or D1;
- evidence: `layoutBroadcast`, `calendarDateForDateTime`, and 04:59/05:00 boundary tests;
- minimal regression: assert Thursday 04:59 maps to Wednesday while 05:00 stays Thursday;
- boundary: do not manually subtract dates in JSX.

- [ ] **Step 4: Write the session scenario**

Scenario facts:

- symptom: login POST succeeds but `/api/auth/me` is 401 on LAN HTTP;
- correct evidence order: Network Set-Cookie → Application Cookie → `/api/auth/me` request → server session lookup;
- likely layer: cookie attributes, particularly an incorrectly unconditional `Secure`;
- regression: HTTP omits `Secure`, HTTPS includes it;
- boundary: do not weaken `HttpOnly`, `SameSite=Lax`, or authentication.

- [ ] **Step 5: Write the watched scenario**

Scenario facts:

- symptom: a 1–3 premiere has one stored range or refresh loses individual state;
- distinguish merged calendar card UI from single-episode persistence;
- correct functions: `episodeViewUnitsForRange`, `episodeViewUnitsForAnime`, `validateEpisodeViewBatch`;
- regression: range expands to 1, 2, 3 single keys and invalid arbitrary ranges are rejected;
- boundary: API derives email from session and never trusts browser identity.

- [ ] **Step 6: Write the lab index, add search entries, test, and commit**

The lab index explains the proof-oriented debugging method, shows scenario completion, and links to `learn/08-maintenance.html`.

```bash
node --test --test-name-pattern="Debug|scenario|lab" teach/tests/site.test.mjs
git add teach/lab teach/app.js teach/styles.css teach/search-index.js teach/tests/site.test.mjs
git commit -m "feat: add project debugging laboratory"
```

### Task 9: Complete the reference page and full search index

**Files:**
- Create: `teach/reference.html`
- Modify: `teach/search-index.js`
- Modify: `teach/tests/site.test.mjs`

- [ ] **Step 1: Add failing full-inventory and search tests**

Add tests that:

1. every path in the final `pages` array exists;
2. every page has viewport metadata, description, stylesheet, both scripts, `<main>`, unique `data-page-id`, and a link back to `index.html`;
3. running `search-index.js` in `vm` produces one unique entry per public page;
4. every index path exists;
5. no HTML/JS/CSS file contains `http://`, `https://`, or `teach__/`;
6. every element carrying a `data-project-path` attribute refers to an existing repository path.

- [ ] **Step 2: Write the reference page**

Include complete, compact tables for:

- JS/TS/React/Web/Cloudflare/Drizzle terminology;
- HTTP methods and status codes used by this project;
- project npm commands and when to use them;
- filename → responsibility and symptom → first file mappings;
- data-source priority and full regeneration order;
- generated-file, database, authentication, Git, and deployment red lines;
- a reusable bug-report template containing expected behavior, actual behavior, steps, evidence, environment, and smallest reproduction.

- [ ] **Step 3: Complete `search-index.js`**

Add exactly one entry for every page in the final inventory. Each entry must contain `id`, `title`, `path`, `section`, at least three `keywords`, and a concrete one-sentence `summary`. Search terms must include important aliases such as `401`, `cookie`, `凌晨`, `排期`, `已看`, `连播`, `D1`, `migration`, `lint`, `build`, `deploy`, and the main file paths.

- [ ] **Step 4: Run full site tests and commit**

```bash
node --test teach/tests/site.test.mjs
git add teach/reference.html teach/search-index.js teach/tests/site.test.mjs
git commit -m "docs: add teaching site reference and search index"
```

### Task 10: Finish accessibility, presentation mode, and validation

**Files:**
- Modify: `teach/index.html`
- Modify: `teach/map.html`
- Modify: `teach/reference.html`
- Modify: `teach/learn/*.html`
- Modify: `teach/handbook/*.html`
- Modify: `teach/lab/*.html`
- Modify: `teach/app.js`
- Modify: `teach/styles.css`
- Modify: `teach/tests/site.test.mjs`

- [ ] **Step 1: Add failing accessibility and link tests**

Extend `site.test.mjs` to check:

- exactly one `<h1>` per page;
- a skip link targeting `#main`;
- every `target="_blank"` also has `rel="noreferrer"` if any are present;
- no empty `href`, duplicate `id`, or missing local target/anchor;
- every quiz and debug group has an accessible heading or `aria-labelledby`;
- `styles.css` contains `:focus-visible`, `prefers-reduced-motion`, and both `760px` and print/presentation rules.

Run the focused test and confirm it finds the remaining gaps.

- [ ] **Step 2: Complete presentation and print behavior**

Mark major article sections with `data-slide`. In presentation mode:

- show one slide at a time;
- expose previous/next buttons and “N / total” status;
- support ArrowLeft/ArrowRight and Escape;
- restore the previous scroll position on exit;
- never intercept arrows while focus is in an input, button, textarea, select, or contenteditable element.

Print CSS must remove interactive controls, expand `details`, use a white background, avoid splitting callouts and code blocks, and include page titles.

- [ ] **Step 3: Finish responsive and no-JavaScript fallbacks**

At 760px or below:

- header navigation wraps rather than scrolling horizontally;
- two-column comparisons become one column;
- project-map connectors become vertical;
- tables remain inside `.table-scroll` containers;
- buttons and choices have at least 44px height;
- no fixed-width code or diagram causes page-level horizontal overflow.

Confirm every page has visible previous/next or section navigation without JavaScript.

- [ ] **Step 4: Run site-local verification**

```bash
node --check teach/app.js
node --check teach/search-index.js
node --test teach/tests/site.test.mjs
git diff --check
```

Expected: syntax checks succeed, all teaching-site tests pass, and `git diff --check` prints nothing.

- [ ] **Step 5: Run repository verification**

```bash
npm run lint -- --ignore-pattern .worktrees
npm test
```

Expected: lint exits 0; `npm test` completes typecheck, vinext build, and all `tests/*.test.mjs` without failures.

- [ ] **Step 6: Verify edit boundaries**

```bash
git status --short
git diff --name-only HEAD -- teach__
git diff --stat
```

Expected: the second command prints nothing; implementation changes are confined to `teach/` plus the already approved design/plan history. Do not stage unrelated worktree changes.

- [ ] **Step 7: Commit the completed teaching site**

```bash
git add teach
git commit -m "feat: add anime calendar maintenance academy"
```

Before this commit, explicitly inspect `git diff --cached --name-only` and confirm it contains no `teach__/` path and no application runtime file.

- [ ] **Step 8: Present the result locally**

Reuse the existing preview tab and server. Open `http://127.0.0.1:4173/teach/` in Codex if it is not already visible. Keep the deliverable local: do not push or deploy.
