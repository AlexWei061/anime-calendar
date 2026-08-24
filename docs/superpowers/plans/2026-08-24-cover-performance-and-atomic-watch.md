# Cover Performance and Atomic Watch Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce cover-sheet transfer and decode cost without lowering detail-dialog quality, and make multi-episode watched changes succeed or fail as one database operation.

**Architecture:** Keep the existing 600×750-per-cell sprite sheets and mapping coordinates as the canonical detail assets. Generate matching 300×375 thumbnail sheets, let `CoverArt` choose a thumbnail by default and the detail dialog opt into the original sheet. Replace the per-episode PUT loop with one bounded batch payload, validate and deduplicate every item on the server, then execute all inserts or deletes in one D1 `db.batch()`.

**Tech Stack:** Next.js 16, React 19, TypeScript, JavaScript, Drizzle/D1, Sharp, Node.js built-in test runner.

---

## Task 1: Specify thumbnail sprite behavior with failing tests

**Files:**
- Modify: `tests/anime-data.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

**Step 1: Add tests for both sprite variants**

Extend the cover tests so the default resolver returns a `-thumb.webp` URL while `coverSpriteFor(coverUrl, "detail")` returns the existing high-resolution URL. For every mapping, assert that both files exist.

```js
const thumbnail = coverSpriteFor(coverUrl);
const detail = coverSpriteFor(coverUrl, "detail");
assert.match(thumbnail.url, /-thumb\.webp$/);
assert.match(detail.url, /cover-sheet-\d+\.webp$/);
await access(join(projectRoot, "public", thumbnail.url));
await access(join(projectRoot, "public", detail.url));
```

Add filesystem budget assertions: each thumbnail sheet is at most 2 MiB and all thumbnail sheets together are at most 60 MiB. Extend the generator-source test to require half-size resizing and WebP quality 82.

**Step 2: Update rendered/source expectations**

Require server-rendered visible covers to reference `/cover-sheet-NN-thumb.webp`, and require the detail cover call to pass `variant="detail"` explicitly.

**Step 3: Run tests and verify the intended red state**

Run:

```bash
node --test tests/anime-data.test.mjs tests/rendered-html.test.mjs
```

Expected: FAIL because the resolver has no variant behavior, thumbnail files do not exist, and the detail call has no explicit variant.

**Step 4: Commit the failing specifications**

```bash
git add tests/anime-data.test.mjs tests/rendered-html.test.mjs
git commit -m "test: specify thumbnail cover sprites"
```

## Task 2: Generate and select thumbnail sprite sheets

**Files:**
- Modify: `scripts/generate-cover-sprites.mjs`
- Modify: `data/cover-sprites.js`
- Modify: `app/page.tsx`
- Create: `public/covers/yuc/sprites/cover-sheet-01-thumb.webp` through the current final sheet

**Step 1: Teach the generator to write both variants**

After writing each existing quality-90 detail sheet, resize that composed sheet to half width and height and write the matching quality-82 thumbnail sheet.

```js
const thumbnailUrl = spriteUrl.replace(/\.webp$/, "-thumb.webp");
await sharp(join(projectRoot, "public", spriteUrl.slice(1)))
  .resize(columns * thumbnailCellWidth, spriteRows * thumbnailCellHeight)
  .webp({ quality: 82, effort: 4 })
  .toFile(join(projectRoot, "public", thumbnailUrl.slice(1)));
```

Generate a resolver that keeps the mapping immutable and derives only the requested URL:

```js
export function coverSpriteFor(coverUrl, variant = "thumbnail") {
  const sprite = coverSprites[coverUrl] ?? null;
  if (!sprite || variant === "detail") return sprite;
  return { ...sprite, url: sprite.url.replace(/\.webp$/, "-thumb.webp") };
}
```

**Step 2: Make `CoverArt` default to thumbnails**

Add a narrow `variant?: "thumbnail" | "detail"` prop, default it to `"thumbnail"`, pass it to `coverSpriteFor`, and set only the dialog call to `variant="detail"`. All calendar, search, statistics, and selection-card callers remain unchanged and therefore use thumbnails.

**Step 3: Build current thumbnail assets from committed detail sheets**

Because the individual source covers are intentionally removed after packing, use the installed Sharp runtime to resize each committed `cover-sheet-NN.webp` into the corresponding `cover-sheet-NN-thumb.webp`. Do not regenerate or alter the existing detail sheets.

**Step 4: Run the focused cover tests**

Run:

```bash
node --test tests/anime-data.test.mjs tests/rendered-html.test.mjs
```

Expected: PASS.

**Step 5: Commit the implementation and generated assets**

```bash
git add app/page.tsx data/cover-sprites.js scripts/generate-cover-sprites.mjs public/covers/yuc/sprites tests/anime-data.test.mjs tests/rendered-html.test.mjs
git commit -m "perf: serve thumbnail cover sprites"
```

## Task 3: Specify atomic watched-episode batches with failing tests

**Files:**
- Modify: `tests/anime-episode-views.test.mjs`
- Modify: `tests/anime-episode-views-storage.test.mjs`

**Step 1: Add validator behavior tests**

Import `validateEpisodeViewBatch` and test that it:

- accepts a non-empty array of valid single-episode records;
- preserves first-seen order while deduplicating by `episodeViewKey`;
- rejects non-arrays, empty arrays, arrays longer than 25, unknown anime IDs, and non-canonical ranges.

```js
assert.deepEqual(
  validateEpisodeViewBatch([episode1, episode1, episode2], animeById),
  [episode1, episode2],
);
```

**Step 2: Add source contract tests**

Require the API route to validate `payload.watchedEpisodes`, use `db.batch()` for both branches, and return the batch. Require `app/page.tsx` to send one JSON body shaped as:

```js
JSON.stringify({ watchedEpisodes: episodeViews, watched: !isWatched })
```

Also assert the watched toggle no longer wraps fetches in `Promise.all`.

**Step 3: Run tests and verify the intended red state**

Run:

```bash
node --test tests/anime-episode-views.test.mjs tests/anime-episode-views-storage.test.mjs
```

Expected: FAIL because the batch validator and batch protocol do not exist.

**Step 4: Commit the failing specifications**

```bash
git add tests/anime-episode-views.test.mjs tests/anime-episode-views-storage.test.mjs
git commit -m "test: specify atomic watched batches"
```

## Task 4: Implement one-request, one-batch watched updates

**Files:**
- Modify: `lib/anime-episode-views.js`
- Modify: `app/api/anime-episode-views/route.ts`
- Modify: `app/page.tsx`

**Step 1: Add the bounded batch validator**

Implement `validateEpisodeViewBatch(value, animeById, maxSize = 25)` next to `validateEpisodeView`. Reject invalid cardinality, call `validateEpisodeView` for every record, and deduplicate stable keys without weakening per-episode validation.

**Step 2: Make the route atomic**

Parse `{ watchedEpisodes, watched }`. For `watched: true`, create one insert statement for all validated values with `onConflictDoNothing()` and pass it as a one-statement `db.batch`. For `watched: false`, create one exact delete statement per validated episode and execute all deletes in a single `db.batch`. Keep the existing authenticated-user boundary and legacy GET migration unchanged.

```ts
await db.batch(
  watched
    ? [db.insert(animeEpisodeViews).values(values).onConflictDoNothing()]
    : watchedEpisodes.map((episode) => db.delete(animeEpisodeViews).where(exactWhere(episode))),
);
```

The maximum of 25 inserts binds at most 100 values (`userEmail`, `animeId`, `episodeStart`, `episode`) in one D1 statement.

**Step 3: Send one request from the client**

Keep the current optimistic update, saving-key lock, and rollback behavior, but replace the `Promise.all` loop with one fetch. Treat any non-2xx response as failure and roll the entire local range back.

**Step 4: Run the focused watched-state tests**

Run:

```bash
node --test tests/anime-episode-views.test.mjs tests/anime-episode-views-storage.test.mjs
```

Expected: PASS.

**Step 5: Commit the implementation**

```bash
git add lib/anime-episode-views.js app/api/anime-episode-views/route.ts app/page.tsx tests/anime-episode-views.test.mjs tests/anime-episode-views-storage.test.mjs
git commit -m "fix: save watched ranges atomically"
```

## Task 5: Full verification and visual regression check

**Files:**
- Verify only; modify task files only if a regression is found.

**Step 1: Run repository hygiene checks**

```bash
git diff --check
npm run lint -- --ignore-pattern .worktrees
npm test
```

Expected: all commands exit successfully.

**Step 2: Verify thumbnail budgets from disk**

Confirm the final tests report all thumbnail sheets below 2 MiB each and their aggregate below 60 MiB. Record actual aggregate sizes for the handoff.

**Step 3: Run local visual checks**

Start the app and inspect:

- desktop calendar, search, statistics, and anime-selection covers;
- a 390px mobile agenda;
- a detail dialog using the high-resolution sheet;
- a multi-episode card toggled watched and unwatched.

Confirm layout, crop coordinates, theme behavior, focus/ARIA behavior, optimistic saving, and rollback-visible error behavior are unchanged except for the intended network payload/assets.

**Step 4: Inspect final scope**

```bash
git status --short
git diff --stat HEAD~4..HEAD
```

Expected: only the plan/spec, focused code/tests, and generated thumbnail assets are changed; no deployment, push, dependency upgrade, or unrelated formatting.

**Step 5: Final verification commit if required**

If verification required a focused correction, commit only that correction:

```bash
git add <task-related-files>
git commit -m "test: verify cover and watched updates"
```
