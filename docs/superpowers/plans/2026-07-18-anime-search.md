# 番剧查询 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在播出表和我的番剧页面中，按规范化后的中文名或日文名实时筛选当前日历内容。

**Architecture:** 新增一个无副作用的标题匹配函数，页面保存查询字符串并在传入既有排期函数前过滤当前目录。搜索输入和空状态位于现有日历标题区域；不引入服务端状态、路由参数或数据迁移。

**Tech Stack:** Next.js 16、React 19、TypeScript、JavaScript ES modules、Node 内置测试运行器、CSS。

---

### Task 1: 标题匹配辅助函数

**Files:**

- Create: `lib/anime-search.js`
- Create: `tests/anime-search.test.mjs`

- [ ] **Step 1: 写入失败的标题匹配测试**

```js
import assert from "node:assert/strict";
import test from "node:test";

import { matchesAnimeTitle } from "../lib/anime-search.js";

const record = {
  titleZh: "BanG Dream! YUME∞MITA",
  titleJa: "バンドリ！ ゆめ∞みた",
};

test("matches Chinese, Japanese, and normalized Latin anime title queries", () => {
  assert.equal(matchesAnimeTitle(record, "YUME"), true);
  assert.equal(matchesAnimeTitle(record, "ゆめ∞みた"), true);
  assert.equal(matchesAnimeTitle(record, "  ｂａｎｇ　ｄｒｅａｍ  "), true);
  assert.equal(matchesAnimeTitle(record, "不存在的番剧"), false);
});

test("treats an empty title query as an unfiltered result", () => {
  assert.equal(matchesAnimeTitle(record, "   "), true);
});
```

- [ ] **Step 2: 运行测试并确认其因模块不存在失败**

Run: `node --test tests/anime-search.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/anime-search.js`.

- [ ] **Step 3: 实现最小标题匹配函数**

```js
function normalizedTitleText(value) {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

export function matchesAnimeTitle({ titleZh, titleJa }, query) {
  const normalizedQuery = normalizedTitleText(query);
  if (!normalizedQuery) return true;

  return [titleZh, titleJa].some((title) => normalizedTitleText(title).includes(normalizedQuery));
}
```

- [ ] **Step 4: 重新运行标题匹配测试**

Run: `node --test tests/anime-search.test.mjs`

Expected: PASS with 2 tests and 0 failures.

- [ ] **Step 5: 提交标题匹配功能**

```bash
git add lib/anime-search.js tests/anime-search.test.mjs
git commit -m "feat: add anime title matching"
```

### Task 2: 用查询结果驱动日历与网络放送

**Files:**

- Modify: `app/page.tsx:11-27` (导入标题匹配函数)
- Modify: `app/page.tsx:155-227` (查询状态和过滤后的目录)
- Modify: `app/page.tsx:629-652` (搜索输入)
- Modify: `app/page.tsx:857-1050` (无结果状态与过滤后的日历)
- Modify: `app/globals.css:115-144` (搜索输入样式)
- Modify: `app/globals.css:1149-1294` (移动端输入样式)
- Modify: `tests/rendered-html.test.mjs:312-629` (页面和样式回归断言)

- [ ] **Step 1: 添加失败的页面与样式回归测试**

Add the following test before `keeps accessible contrast tokens and generated build metadata out of the deliverable` in `tests/rendered-html.test.mjs`:

```js
test("keeps title search filtering shared by calendar and mobile schedule", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /import \{ matchesAnimeTitle \} from "\.\.\/lib\/anime-search\.js";/);
  assert.match(page, /const \[animeQuery, setAnimeQuery\] = useState\(""\);/);
  assert.match(
    page,
    /const matchingCalendarAnime = calendarAnime\.filter\(\(record\) => matchesAnimeTitle\(record, animeQuery\)\);/,
  );
  assert.match(page, /eventsForWeek\(matchingCalendarAnime, activeWeekStart\)/);
  assert.match(page, /dateOnlyEventsForWeek\(matchingCalendarAnime, activeWeekStart\)/);
  assert.match(page, /const matchingSeasonAnime = \(activePage === "mine" \? selectedSeasonAnime : activeSeason\.anime\)\.filter\(/);
  assert.match(page, /const networkOnly = matchingSeasonAnime\.filter\(/);
  assert.match(page, /<label className="anime-search">[\s\S]*?查找番剧[\s\S]*?type="search"[\s\S]*?placeholder="输入中文或日文名"/);
  assert.match(page, /className="anime-search-empty"[\s\S]*?aria-live="polite"/);
  assert.match(styles, /\.anime-search\s*\{[\s\S]*?display:\s*grid;/);
  assert.match(
    styles,
    /@media \(max-width: 860px\) \{[\s\S]*?\.anime-search input\s*\{[\s\S]*?width:\s*100%;/,
  );
});
```

- [ ] **Step 2: 运行回归测试并确认其因搜索代码缺失失败**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: FAIL in `keeps title search filtering shared by calendar and mobile schedule` because `anime-search.js` is not imported and search markup is absent.

- [ ] **Step 3: 以最小页面改动接入搜索**

In `app/page.tsx`, add the import and state:

```ts
import { matchesAnimeTitle } from "../lib/anime-search.js";

const [animeQuery, setAnimeQuery] = useState("");
```

Immediately after the existing `calendarAnime` declaration, add the filtered directory and use it for the existing calendar calculations:

```ts
const matchingCalendarAnime = calendarAnime.filter((record) => matchesAnimeTitle(record, animeQuery));
const hasAnimeQuery = animeQuery.trim().length > 0;
const noSearchMatches = hasAnimeQuery && calendarAnime.length > 0 && !matchingCalendarAnime.length;

const events = eventsForWeek(matchingCalendarAnime, activeWeekStart) as CalendarEvent[];
const dateOnlyEvents = dateOnlyEventsForWeek(
  matchingCalendarAnime,
  activeWeekStart,
) as DateOnlyEvent[];
```

Filter the existing active-season source before building `networkOnly`:

```ts
const matchingSeasonAnime = (activePage === "mine" ? selectedSeasonAnime : activeSeason.anime).filter(
  (record) => matchesAnimeTitle(record, animeQuery),
);
const networkOnly = matchingSeasonAnime.filter(
  ({ scheduleWeekday, beijingTime }) => !scheduleWeekday || !beijingTime,
);
```

Add the input before the existing `season-picker` in `calendar-header-controls`:

```tsx
<label className="anime-search">
  查找番剧
  <input
    type="search"
    value={animeQuery}
    onChange={(event) => setAnimeQuery(event.target.value)}
    placeholder="输入中文或日文名"
  />
</label>
```

Wrap the existing non-statistics calendar branch so that `noSearchMatches` first renders:

```tsx
<p className="anime-search-empty" aria-live="polite">
  未找到“{animeQuery.trim()}”相关的番剧。
</p>
```

Preserve the existing `my-schedule-empty` branch when the user has not selected any anime.

- [ ] **Step 4: 添加与现有控制区一致的样式**

Add these rules after `.calendar-header-controls` in `app/globals.css`:

```css
.anime-search {
  display: grid;
  gap: 0.35rem;
  color: var(--muted-ink);
  font-size: 0.82rem;
  font-weight: 700;
}

.anime-search input {
  width: 16rem;
  min-height: 2.4rem;
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  background: var(--card);
  color: var(--ink);
  font: inherit;
  padding: 0 0.7rem;
}

.anime-search-empty {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px dashed var(--line);
  border-radius: 0.75rem;
  color: var(--muted-ink);
  text-align: center;
}
```

Inside the existing `@media (max-width: 860px)` block, add:

```css
.calendar-header-controls {
  justify-items: stretch;
}

.anime-search input {
  width: 100%;
}
```

- [ ] **Step 5: 重新运行页面回归测试**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: PASS with 0 failures, including the new title-search regression test.

- [ ] **Step 6: 提交界面集成**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: add calendar anime search"
```

### Task 3: 全量验证

**Files:**

- Verify: `lib/anime-search.js`
- Verify: `tests/anime-search.test.mjs`
- Verify: `app/page.tsx`
- Verify: `app/globals.css`
- Verify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 检查改动范围和补丁空白错误**

Run: `git status --short && git diff --check e933cf8..HEAD && git diff --name-only e933cf8..HEAD`

Expected: the two feature commits contain only the search helper, its tests, page, stylesheet, and rendered-HTML test; no whitespace errors.

- [ ] **Step 2: 运行项目要求的 lint**

Run: `npm run lint -- --ignore-pattern .worktrees`

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: 运行完整测试套件**

Run: `npm test`

Expected: build succeeds and every `tests/*.test.mjs` test passes with 0 failures.
