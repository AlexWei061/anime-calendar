# 全部番剧查询页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 提供独立查询页，按中日标题检索 allAnime 全部已收录番剧，以单列统计卡显示结果，且查询永不改变现有日历。

**Architecture:** 保留既有无副作用标题匹配函数，在 app/page.tsx 从 allAnime 单独派生 searchResults。新增 ?page=search URL 状态和导航；周历、移动议程与网络放送继续从原有播出表或我的番剧目录计算。搜索卡复用统计页已有详情按钮，并通过 ID 到季度标签的映射显示所属季度。

**Tech Stack:** Next.js 16、React 19、TypeScript、JavaScript ES modules、Node 内置测试运行器、CSS。

---

### Task 1: 为独立查询数据流写失败的回归测试

**Files:**

- Modify: tests/rendered-html.test.mjs:195-202
- Modify: tests/rendered-html.test.mjs:350-413
- Modify: tests/rendered-html.test.mjs:629-657

- [ ] **Step 1: 更新页面状态、URL 与日历数据源断言**

In the statistics-navigation test, replace the page-state assertions with:

~~~js
assert.match(page, /type Page = "all" \| "mine" \| "stats" \| "search";/);
assert.match(page, /changePage\("stats"\)/);
assert.match(page, /changePage\("search"\)/);
assert.match(page, /page === "mine" \|\| page === "stats" \|\| page === "search"/);
assert.match(page, /url\.searchParams\.set\("page", page\);/);
~~~

In the calendar-source test, replace both old matchingCalendarAnime schedule assertions with:

~~~js
assert.match(page, /eventsForWeek\(calendarAnime, activeWeekStart\)/);
assert.match(page, /dateOnlyEventsForWeek\(\s*calendarAnime,\s*activeWeekStart,\s*\)/);
assert.doesNotMatch(page, /eventsForWeek\(searchResults, activeWeekStart\)/);
assert.doesNotMatch(page, /dateOnlyEventsForWeek\(\s*searchResults,\s*activeWeekStart,\s*\)/);
~~~

- [ ] **Step 2: 用查询页测试替换旧的筛选日历测试**

Replace the complete keeps title search filtering shared by calendar and mobile schedule test with:

~~~js
test("keeps global title search separate from calendar schedules", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /const \[animeQuery, setAnimeQuery\] = useState\(""/);
  assert.match(page, /const searchResults = allAnime\.filter\(\(record\) => matchesAnimeTitle\(record, animeQuery\)\);/);
  assert.match(page, /<section className="anime-search-page" aria-labelledby="anime-search-heading">/);
  assert.match(page, /<label className="anime-search">[\s\S]*?查询番剧[\s\S]*?type="search"[\s\S]*?placeholder="输入中文或日文名"/);
  assert.match(page, /className="statistics-anime-card-list anime-search-results"/);
  assert.match(page, /seasonLabelByAnimeId\.get\(record\.id\) \?\? "已收录番剧"/);
  assert.match(page, /className="anime-search-empty"[\s\S]*?aria-live="polite"/);
  assert.match(page, /activePage === "all" \|\| activePage === "mine"/);
  assert.doesNotMatch(page, /const matchingCalendarAnime/);
  assert.doesNotMatch(page, /const matchingSeasonAnime/);
  assert.match(styles, /\.statistics-anime-card-list\.anime-search-results\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
});
~~~

- [ ] **Step 3: 运行测试确认其失败**

Run:

~~~bash
npm run build && node --test tests/rendered-html.test.mjs
~~~

Expected: FAIL because the source still has only three page states and passes matchingCalendarAnime to the weekly schedule.

- [ ] **Step 4: 提交失败测试**

~~~bash
git add tests/rendered-html.test.mjs
git commit -m "test: define global anime search behavior"
~~~

### Task 2: 实现 ?page=search 与隔离的全部目录查询

**Files:**

- Modify: app/page.tsx:44-55
- Modify: app/page.tsx:179-238
- Modify: app/page.tsx:261-340
- Modify: app/page.tsx:583-672
- Modify: app/page.tsx:837-1100

- [ ] **Step 1: 添加页面类型和季度显示标签映射**

Add the page state and map next to the existing seasonIndexByAnimeId map:

~~~ts
type Page = "all" | "mine" | "stats" | "search";

const seasonLabelByAnimeId = new Map(
  seasons.flatMap((season) =>
    season.anime.map((record) => [record.id, season.label] as const),
  ),
);
~~~

Keep seasonIndexByAnimeId unchanged because it is still used to sort statistics.

- [ ] **Step 2: 仅过滤完整目录，并恢复周历原数据源**

Replace the old matchingCalendarAnime, noSearchMatches, and matchingSeasonAnime declarations with:

~~~ts
const hasAnimeQuery = animeQuery.trim().length > 0;
const searchResults = allAnime.filter((record) => matchesAnimeTitle(record, animeQuery));
const events = eventsForWeek(calendarAnime, activeWeekStart) as CalendarEvent[];
const dateOnlyEvents = dateOnlyEventsForWeek(calendarAnime, activeWeekStart) as DateOnlyEvent[];
const networkOnly = (activePage === "mine" ? selectedSeasonAnime : activeSeason.anime).filter(
  ({ scheduleWeekday, beijingTime }) => !scheduleWeekday || !beijingTime,
);
~~~

Do not change calendarAnime: it remains allAnime for 播出表 and the user's selected IDs for 我的番剧.

- [ ] **Step 3: 使搜索页参与 URL 同步和侧栏导航**

Use these exact URL guards:

~~~ts
setActivePage(page === "mine" || page === "stats" || page === "search" ? page : "all");

if (page === "mine" || page === "stats" || page === "search") {
  url.searchParams.set("page", page);
} else {
  url.searchParams.delete("page");
}
~~~

Add this button after the existing 追番统计 button:

~~~tsx
<button
  className={activePage === "search" ? "is-active" : ""}
  type="button"
  aria-current={activePage === "search" ? "page" : undefined}
  onClick={() => changePage("search")}
>
  查询番剧
</button>
~~~

- [ ] **Step 4: 将输入与结果放在查询页，而不是日历标题区**

Extend header copy so the search page uses 全部目录、查询番剧 and 搜索本应用已收录的全部番剧，支持中文和日文标题。. Restrict the historical note and existing season/source controls to activePage === "all" || activePage === "mine", and remove the old search label from calendar-header-controls.

Before the current weekly-calendar conditional, render:

~~~tsx
{activePage === "search" ? (
  <section className="anime-search-page" aria-labelledby="anime-search-heading">
    <div className="section-heading">
      <div>
        <p className="section-kicker">全部目录</p>
        <h2 id="anime-search-heading">查询番剧</h2>
      </div>
      <p>输入中文或日文名，查询所有已收录作品。</p>
    </div>
    <label className="anime-search">
      查询番剧
      <input
        type="search"
        value={animeQuery}
        onChange={(event) => setAnimeQuery(event.target.value)}
        placeholder="输入中文或日文名"
      />
    </label>
    {!hasAnimeQuery ? (
      <p className="anime-search-empty">输入中文或日文名开始查询。</p>
    ) : searchResults.length ? (
      <div className="statistics-anime-card-list anime-search-results">
        {searchResults.map((record) => (
          <span key={record.id}>
            {statisticsAnimeCard(
              record,
              seasonLabelByAnimeId.get(record.id) ?? "已收录番剧",
            )}
          </span>
        ))}
      </div>
    ) : (
      <p className="anime-search-empty" aria-live="polite">
        未找到“{animeQuery.trim()}”相关的番剧。
      </p>
    )}
  </section>
) : null}
~~~

Change the outer condition around the existing weekly section, network section and calendar footer to activePage === "all" || activePage === "mine". Inside that guard, retain the existing activePage === "all" || calendarAnime.length branch and the unchanged my-schedule-empty fallback. This keeps the current weekly JSX in one place and prevents it rendering on the search page.

- [ ] **Step 5: 运行页面回归测试确认其通过**

Run:

~~~bash
npm run build && node --test tests/rendered-html.test.mjs
~~~

Expected: PASS with 0 failures, including the assertion that weekly schedule functions receive calendarAnime, not searchResults.

- [ ] **Step 6: 提交查询页行为**

~~~bash
git add app/page.tsx tests/rendered-html.test.mjs
git commit -m "feat: add global anime search page"
~~~

### Task 3: 固定搜索结果为单列并适配移动端

**Files:**

- Modify: app/globals.css:121-148
- Modify: app/globals.css:411-419
- Modify: app/globals.css:1214-1221
- Modify: tests/rendered-html.test.mjs:629-657

- [ ] **Step 1: 添加失败的单列样式断言**

Add the following lines to the new search-page test:

~~~js
assert.match(styles, /\.anime-search-page\s*\{[\s\S]*?display:\s*grid;/);
assert.match(
  styles,
  /\.anime-search\s*\{[\s\S]*?max-width:\s*32rem;[\s\S]*?display:\s*grid;/,
);
assert.match(
  styles,
  /@media \(max-width: 860px\) \{[\s\S]*?\.anime-search\s*\{[\s\S]*?max-width:\s*none;/,
);
~~~

- [ ] **Step 2: 运行测试确认 CSS 断言失败**

Run:

~~~bash
npm run build && node --test tests/rendered-html.test.mjs
~~~

Expected: FAIL because no anime-search-page or desktop one-column override exists.

- [ ] **Step 3: 添加查询页样式，删除旧的标题控件补丁**

Replace the existing search rules with:

~~~css
.anime-search-page {
  display: grid;
  gap: 1rem;
}

.anime-search {
  display: grid;
  max-width: 32rem;
  gap: 0.35rem;
  color: var(--muted-ink);
  font-size: 0.82rem;
  font-weight: 700;
}

.anime-search input {
  width: 100%;
  min-height: 2.4rem;
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  background: var(--card);
  color: var(--ink);
  font: inherit;
  padding: 0 0.7rem;
}

.anime-search-empty {
  margin: 0;
  padding: 1rem;
  border: 1px dashed var(--line);
  border-radius: 0.75rem;
  color: var(--muted-ink);
  text-align: center;
}
~~~

Add this after the base statistics-anime-card-list rule:

~~~css
.statistics-anime-card-list.anime-search-results {
  grid-template-columns: 1fr;
}
~~~

Delete the obsolete mobile-only calendar-header-controls and anime-search input rules. In their place, add:

~~~css
.anime-search {
  max-width: none;
}
~~~

inside the existing @media (max-width: 860px) block.

- [ ] **Step 4: 重新运行页面回归测试**

Run:

~~~bash
npm run build && node --test tests/rendered-html.test.mjs
~~~

Expected: PASS with 0 failures; result cards have one column at desktop and mobile widths.

- [ ] **Step 5: 提交样式与断言**

~~~bash
git add app/globals.css tests/rendered-html.test.mjs
git commit -m "style: make anime search results single column"
~~~

### Task 4: 完整验证

**Files:**

- Verify: lib/anime-search.js
- Verify: tests/anime-search.test.mjs
- Verify: app/page.tsx
- Verify: app/globals.css
- Verify: tests/rendered-html.test.mjs

- [ ] **Step 1: 检查改动范围与空白错误**

Run:

~~~bash
git status --short
git diff --check d83f28a..HEAD
git diff --name-only d83f28a..HEAD
~~~

Expected: after the design baseline, only app/page.tsx, app/globals.css, and tests/rendered-html.test.mjs are changed; the whitespace check emits no output.

- [ ] **Step 2: 运行项目要求的 lint**

Run:

~~~bash
npm run lint -- --ignore-pattern .worktrees
~~~

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: 运行完整测试套件**

Run:

~~~bash
npm test
~~~

Expected: the Worker build succeeds and every tests/*.test.mjs test passes with 0 failures.
