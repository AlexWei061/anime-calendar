# Personal Anime Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-page schedule UI where the owner can select anime and see that selection synced across devices under the existing ChatGPT identity.

**Architecture:** Keep the page as one client-side calendar surface so the existing week navigation, event layout, mobile agenda, and detail dialog are reused. Add a small authenticated API backed by D1; it owns identity and stores only each user's selected anime IDs. The browser reads the IDs on first entry to “我的番剧” and serializes writes while a save is in progress.

**Tech Stack:** Next.js/Vinext, React 19, Cloudflare D1, Drizzle ORM, Sites ChatGPT authenticated-user headers, Node built-in test runner.

---

## File structure

- Create `lib/anime-selections.js`: Validate a submitted array of current-season anime IDs without depending on the database or browser.
- Create `app/api/anime-selections/route.ts`: Authenticate the current ChatGPT user and read or replace that user's IDs in D1.
- Modify `db/schema.ts`: Define the D1 selection table and composite primary key.
- Create `drizzle/0000_anime-selections.sql` and modify `drizzle/meta/_journal.json`: Generated migration for the schema change.
- Modify `.openai/hosting.json`: Declare the logical D1 binding named `DB`.
- Modify `app/page.tsx`: Add page state, selection synchronization, the B-design navigation count, selector, and filtered calendar data.
- Modify `app/globals.css`: Add desktop sidebar, mobile page tabs, selection grid, status text, and empty state styling.
- Create `tests/anime-selections.test.mjs` and `tests/anime-selection-storage.test.mjs`: Exercise payload validation and source-level API/storage contracts.
- Modify `tests/rendered-html.test.mjs`: Preserve calendar regressions and require the new page-navigation markup and styles.

### Task 1: Validate selection payloads before storage

**Files:**
- Create: `lib/anime-selections.js`
- Create: `tests/anime-selections.test.mjs`

- [ ] **Step 1: Write the failing payload-validation tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { validateAnimeIds } from "../lib/anime-selections.js";

const validIds = new Set(["sayonara-lara", "mobius-dust"]);

test("accepts unique known anime IDs", () => {
  assert.deepEqual(
    validateAnimeIds(["sayonara-lara", "mobius-dust", "sayonara-lara"], validIds),
    ["sayonara-lara", "mobius-dust"],
  );
});

test("rejects invalid selection payloads", () => {
  assert.throws(() => validateAnimeIds("sayonara-lara", validIds), /animeIds/);
  assert.throws(() => validateAnimeIds(["unknown"], validIds), /unknown/);
});
```

- [ ] **Step 2: Run the test and confirm that it fails because the helper does not exist**

Run: `node --test tests/anime-selections.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/anime-selections.js`.

- [ ] **Step 3: Implement the smallest validation helper**

```js
export function validateAnimeIds(value, validAnimeIds) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) {
    throw new TypeError("animeIds must be an array of strings");
  }

  const animeIds = [...new Set(value)];
  const unknownId = animeIds.find((id) => !validAnimeIds.has(id));
  if (unknownId) {
    throw new RangeError("Unknown anime ID: " + unknownId);
  }

  return animeIds;
}
```

- [ ] **Step 4: Run the test and confirm that it passes**

Run: `node --test tests/anime-selections.test.mjs`

Expected: PASS with two passing tests.

- [ ] **Step 5: Commit the helper and its test**

```bash
git add lib/anime-selections.js tests/anime-selections.test.mjs
git commit -m "feat: validate anime selections"
```

### Task 2: Add D1-backed, user-owned selection storage

**Files:**
- Modify: `db/schema.ts`
- Create: `app/api/anime-selections/route.ts`
- Modify: `.openai/hosting.json`
- Create: `drizzle/0000_anime-selections.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `tests/anime-selection-storage.test.mjs`

- [ ] **Step 1: Write failing storage and route-contract tests**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("declares a D1 table and authenticated selection route", async () => {
  const [hosting, schema, route] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/anime-selections/route.ts", import.meta.url), "utf8"),
  ]);

  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.match(schema, /animeSelections/);
  assert.match(schema, /primaryKey/);
  assert.match(route, /getChatGPTUser/);
  assert.match(route, /status: 401/);
  assert.match(route, /validateAnimeIds/);
});
```

- [ ] **Step 2: Run the test and confirm that it fails because D1 storage is absent**

Run: `node --test tests/anime-selection-storage.test.mjs`

Expected: FAIL because `.openai/hosting.json` has `"d1": null` and the route file is missing.

- [ ] **Step 3: Define the D1 binding and composite-key table**

Replace the empty schema with:

```ts
import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const animeSelections = sqliteTable(
  "anime_selections",
  {
    userEmail: text("user_email").notNull(),
    animeId: text("anime_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userEmail, table.animeId] })],
);
```

Set the local logical binding without adding a real database identifier:

```json
{
  "project_id": "appgprj_6a527da9d5308191bf2d2d1d01b31568",
  "d1": "DB",
  "r2": null
}
```

- [ ] **Step 4: Add the authenticated GET and PUT route**

Implement `app/api/anime-selections/route.ts` with this behavior:

```ts
import { eq } from "drizzle-orm";
import { anime } from "../../../data/anime.js";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { animeSelections } from "../../../db/schema";
import { validateAnimeIds } from "../../../lib/anime-selections.js";

const validAnimeIds = new Set(anime.map(({ id }) => id));

async function currentUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  return user;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  const rows = await getDb()
    .select({ animeId: animeSelections.animeId })
    .from(animeSelections)
    .where(eq(animeSelections.userEmail, user.email));
  return Response.json({ animeIds: rows.map(({ animeId }) => animeId) });
}
```

Implement `PUT` with the same server-owned `currentUser()` check and this body:

```ts
export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  let animeIds: string[];
  try {
    const payload = (await request.json()) as { animeIds?: unknown };
    animeIds = validateAnimeIds(payload.animeIds, validAnimeIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid animeIds";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const db = getDb();
    await db.delete(animeSelections).where(eq(animeSelections.userEmail, user.email));
    if (animeIds.length) {
      await db.insert(animeSelections).values(
        animeIds.map((animeId) => ({ userEmail: user.email, animeId })),
      );
    }
    return Response.json({ animeIds });
  } catch {
    return Response.json({ error: "Unable to save anime selections" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Generate and inspect the migration**

Run: `npm run db:generate -- --name anime-selections`

Expected: `drizzle/0000_anime-selections.sql` creates `anime_selections` with `user_email`, `anime_id`, and a composite primary key; `drizzle/meta/_journal.json` gains one entry. Inspect the SQL before retaining it.

- [ ] **Step 6: Run focused tests and confirm that they pass**

Run: `node --test tests/anime-selections.test.mjs tests/anime-selection-storage.test.mjs`

Expected: PASS with the payload and storage-contract tests green.

- [ ] **Step 7: Commit storage and migration changes**

```bash
git add .openai/hosting.json app/api/anime-selections/route.ts db/schema.ts drizzle tests/anime-selection-storage.test.mjs
git commit -m "feat: store user anime selections"
```

### Task 3: Write regression tests for the two-page schedule shell

**Files:**
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Add failing source and SSR assertions**

Add these checks to the existing rendering and durability tests:

```js
assert.match(html, /class="page-sidebar"/);
assert.match(html, /全部夏番/);
assert.match(html, /我的番剧/);
assert.match(page, /const \[activePage, setActivePage\] = useState/);
assert.match(page, /const \[selectedAnimeIds, setSelectedAnimeIds\] = useState/);
assert.match(page, /fetch\("\/api\/anime-selections"/);
assert.match(page, /selectedAnimeIds\.includes\(record\.id\)/);
assert.match(page, /eventsForWeek\(displayedAnime, activeWeekStart\)/);
```

- [ ] **Step 2: Run the rendered-page test and confirm that it fails**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: FAIL because the page has no page sidebar, selection state, or personal schedule controls.

### Task 4: Add the B-design navigation and personal schedule behavior

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add client state and synchronized selection functions**

Use these states next to the existing calendar state:

```tsx
const [activePage, setActivePage] = useState<"all" | "mine">("all");
const [selectedAnimeIds, setSelectedAnimeIds] = useState<string[] | null>(null);
const [selectionError, setSelectionError] = useState<string | null>(null);
const [isSavingSelection, setIsSavingSelection] = useState(false);

const displayedAnime =
  activePage === "mine"
    ? anime.filter((record) => selectedAnimeIds?.includes(record.id))
    : anime;
```

Load `GET /api/anime-selections` once when `activePage` first becomes `"mine"`. Store its `animeIds`; if the response is not OK, set `selectionError` to `"无法读取你的追番列表。"` and do not render a misleading empty schedule.

For a checkbox change, compute the next ID list, immediately update state, set `isSavingSelection`, then `PUT` JSON `{ animeIds: nextIds }`. Disable all checkboxes while saving. On a non-OK response or fetch error, restore the previous list and set `selectionError` to `"保存失败，请重试。"`; always clear the saving flag.

- [ ] **Step 2: Make existing calendar computations use the active page data**

Replace the two global-data calculations with:

```tsx
const events = eventsForWeek(displayedAnime, activeWeekStart) as CalendarEvent[];
const networkOnly = displayedAnime.filter(
  ({ scheduleWeekday, beijingTime }) => !scheduleWeekday || !beijingTime,
);
```

Keep `anime` as the selector source so all 66 current-season shows can be chosen. Keep the existing event-card function, week pager, timeline lane layout, mobile agenda, network cards, and dialog unchanged.

- [ ] **Step 3: Wrap the calendar in page navigation and render the selection panel**

Before the existing `<main className="calendar-page">`, render a `<div className="site-shell">` with this navigation:

```tsx
<nav className="page-sidebar" aria-label="页面导航">
  <p className="site-name">番时表</p>
  <button
    className={activePage === "all" ? "is-active" : ""}
    type="button"
    aria-current={activePage === "all" ? "page" : undefined}
    onClick={() => setActivePage("all")}
  >
    全部夏番
  </button>
  <button
    className={activePage === "mine" ? "is-active" : ""}
    type="button"
    aria-current={activePage === "mine" ? "page" : undefined}
    onClick={() => setActivePage("mine")}
  >
    我的番剧 {selectedAnimeIds ? `· ${selectedAnimeIds.length} 部` : ""}
  </button>
</nav>
```

When `activePage === "mine"`, place a `<section className="anime-selection-panel">` before the calendar. Map `anime` to labelled checkboxes with `className="anime-selection"`, `checked={selectedAnimeIds.includes(record.id)}`, the existing Chinese title, and `disabled={isSavingSelection}`. Show `"正在读取你的追番列表…"` before the GET completes and `selectionError` as an `aria-live="polite"` status.

Only render the weekly section, network section, and footer for the personal page when `displayedAnime.length > 0`; otherwise render `<p className="my-schedule-empty">勾选上方的番剧后，这里会显示你的专属时间表。</p>`. The all-schedule page always renders its existing content.

- [ ] **Step 4: Run the rendered-page regression test and confirm that it passes**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: PASS; the existing full timeline and dialog assertions remain green, and the new page-shell assertions pass.

- [ ] **Step 5: Commit the component behavior**

```bash
git add app/page.tsx tests/rendered-html.test.mjs
git commit -m "feat: add personal anime schedule"
```

### Task 5: Style responsive navigation, selector, and personal empty state

**Files:**
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Add failing style-contract assertions**

Add these assertions to the existing durability test:

```js
assert.match(
  styles,
  /\.site-shell\s*\{[\s\S]*?grid-template-columns:\s*13rem minmax\(0, 1fr\);/,
);
assert.match(styles, /\.page-sidebar button\.is-active/);
assert.match(styles, /\.anime-selection-list\s*\{[\s\S]*?grid-template-columns/);
assert.match(styles, /\.my-schedule-empty/);
assert.match(
  styles,
  /@media \(max-width: 860px\) \{[\s\S]*?\.site-shell\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
);
```

- [ ] **Step 2: Run the rendered-page test and confirm that it fails**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: FAIL because no page-shell or selection styles exist.

- [ ] **Step 3: Add the minimal responsive CSS**

Add the following new rules without changing unrelated calendar measurements:

```css
.site-shell {
  display: grid;
  grid-template-columns: 13rem minmax(0, 1fr);
  width: min(1920px, 100%);
  margin: 0 auto;
}

.page-sidebar {
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

.page-sidebar button,
.anime-selection {
  border: 1px solid transparent;
  border-radius: 0.6rem;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.page-sidebar button { padding: 0.7rem; }
.page-sidebar button.is-active { background: var(--card); color: var(--blue); font-weight: 800; }
.anime-selection-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 0.5rem; }
.anime-selection { display: flex; gap: 0.55rem; align-items: center; padding: 0.55rem; background: var(--card); }
.my-schedule-empty { padding: 2rem; border: 1px dashed var(--line); border-radius: 0.75rem; color: var(--muted-ink); text-align: center; }

@media (max-width: 860px) {
  .site-shell { display: grid; grid-template-columns: 1fr; }
  .page-sidebar { position: static; grid-template-columns: 1fr 1fr; min-height: 0; padding: 0.75rem 1rem; border-right: 0; border-bottom: 1px solid var(--line); }
  .site-name { grid-column: 1 / -1; }
  .calendar-page { width: 100%; }
}
```

Include focus-visible styling through the existing global focus rule; do not add an icon library or a new CSS framework.

- [ ] **Step 4: Run the rendered-page test and confirm that it passes**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: PASS with the desktop sidebar, narrow-screen tabs, and existing calendar layout checks all green.

- [ ] **Step 5: Commit the styles and tests**

```bash
git add app/globals.css tests/rendered-html.test.mjs
git commit -m "style: add personal schedule navigation"
```

### Task 6: Run complete verification and package the D1 migration

**Files:**
- Verify: `dist/.openai/hosting.json`
- Verify: `dist/.openai/drizzle/`

- [ ] **Step 1: Run all automated checks**

Run: `npm test && npm run lint && git diff --check`

Expected: every Node test passes, ESLint exits 0, and `git diff --check` produces no output.

- [ ] **Step 2: Verify the deployable artifact contains storage metadata**

Run: `test -f dist/.openai/hosting.json && test -d dist/.openai/drizzle && rg -n '"d1": "DB"|anime_selections' dist/.openai`

Expected: exit 0; the copied hosting configuration declares `DB`, and the packaged migration contains `anime_selections`.

- [ ] **Step 3: Commit final verification-only adjustments if any exist**

```bash
git status --short
```

Expected: no uncommitted implementation changes. Do not create an empty commit.
