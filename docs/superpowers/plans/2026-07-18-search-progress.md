# 搜索结果追番进度 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 在全部番剧搜索结果中显示当前用户的追番状态、已看集数和进度条，同时保留未追番作品已有的历史已看记录。

**Architecture:** 搜索页复用既有 selections 与 watched-episodes API 状态；进入 search 页面时读取追番 ID。页面对 searchResults 调用 progressForAnime 并按 ID 查找进度，继续通过 statisticsAnimeCard 渲染状态、集数和进度条。读取失败时渲染作品卡但不伪造状态。

**Tech Stack:** Next.js 16、React 19、TypeScript、既有 anime-statistics 辅助函数、Node 内置测试运行器。

---

### Task 1: 为搜索进度行为写失败的页面回归测试

**Files:**

- Modify: tests/rendered-html.test.mjs:640-690

- [ ] **Step 1: 在现有全局搜索测试中追加进度数据流断言**

Inside the existing keeps global title search separate from calendar schedules test, add:

~~~js
assert.match(
  page,
  /if \(\s*\(activePage !== "mine" && activePage !== "stats" && activePage !== "search"\) \|\|\s*selectedAnimeIds !== null\s*\) \{\s*return;\s*\}/,
);
assert.match(page, /const searchProgress = progressForAnime\(searchResults, watchedEpisodes \?\? \[\]\);/);
assert.match(
  page,
  /const searchProgressByAnimeId = new Map\(\s*searchProgress\.map\(\(progress\) => \[progress\.record\.id, progress\]\),\s*\);/,
);
assert.match(page, /正在读取追番进度…/);
assert.match(page, /searchProgressError \?\? "正在读取追番进度…"/);
assert.match(page, /const isTracked = selectedAnimeIds\.includes\(record\.id\);/);
assert.match(
  page,
  /isTracked \? progressStatusLabel\(progress\.status\) : "未追番"/,
);
assert.match(
  page,
  /已看 \$\{progress\.watchedEpisodeCount\} \/ \$\{record\.episodeCount\} 集/,
);
assert.match(page, /"进度暂不可用"/);
assert.match(
  page,
  /statisticsAnimeCard\(\s*record,[\s\S]*?progress\.watchedEpisodeCount,/,
);
~~~

Also require that unavailable progress remains a card instead of hiding search results:

~~~js
assert.match(
  page,
  /if \(!progress \|\| selectedAnimeIds === null \|\| watchedEpisodes === null\) \{[\s\S]*?statisticsAnimeCard\([\s\S]*?"进度暂不可用"/,
);
~~~

- [ ] **Step 2: 运行测试并确认其因进度代码尚不存在失败**

Run:

~~~bash
npm run build && node --test tests/rendered-html.test.mjs
~~~

Expected: FAIL in keeps global title search separate from calendar schedules because search does not yet load selections, derive searchProgress, or render tracking status.

- [ ] **Step 3: 提交失败测试**

~~~bash
git add tests/rendered-html.test.mjs
git commit -m "test: define search progress behavior"
~~~

### Task 2: 将追番状态与已看进度接入搜索结果

**Files:**

- Modify: app/page.tsx:190-205
- Modify: app/page.tsx:272-295
- Modify: app/page.tsx:887-930
- Test: tests/rendered-html.test.mjs:640-690

- [ ] **Step 1: 从所有搜索结果派生稳定进度查找**

Immediately after searchResults, add:

~~~ts
const searchProgress = progressForAnime(searchResults, watchedEpisodes ?? []);
const searchProgressByAnimeId = new Map(
  searchProgress.map((progress) => [progress.record.id, progress]),
);
const searchProgressError = selectionError ?? watchedEpisodeError;
const isSearchProgressLoading =
  (selectedAnimeIds === null || watchedEpisodes === null) && !searchProgressError;
~~~

Do not change selectedAnime or allProgress: the statistics page must continue to calculate totals only for saved selections.

- [ ] **Step 2: 在搜索页加载同一用户的追番列表**

Replace the selection-loading guard with:

~~~ts
if (
  (activePage !== "mine" && activePage !== "stats" && activePage !== "search") ||
  selectedAnimeIds !== null
) {
  return;
}
~~~

Keep the existing API request, response validation, cancellation handling, and error message unchanged.

- [ ] **Step 3: 在读取期间、成功后与失败后渲染正确的搜索卡**

Inside the existing hasAnimeQuery and searchResults.length branch, first render this live loading state:

~~~tsx
{isSearchProgressLoading ? (
  <p className="selection-status" aria-live="polite">
    {searchProgressError ?? "正在读取追番进度…"}
  </p>
) : (
  <div className="statistics-anime-card-list anime-search-results">
    {searchResults.map((record) => {
      const progress = searchProgressByAnimeId.get(record.id);

      if (!progress || selectedAnimeIds === null || watchedEpisodes === null) {
        return (
          <span key={record.id}>
            {statisticsAnimeCard(
              record,
              (seasonLabelByAnimeId.get(record.id) ?? "已收录番剧") + " · 追番进度暂不可用",
              "进度暂不可用",
            )}
          </span>
        );
      }

      const isTracked = selectedAnimeIds.includes(record.id);
      return (
        <span key={record.id}>
          {statisticsAnimeCard(
            record,
            (seasonLabelByAnimeId.get(record.id) ?? "已收录番剧") +
              ` · 已看 ${progress.watchedEpisodeCount} / ${record.episodeCount} 集`,
            isTracked ? progressStatusLabel(progress.status) : "未追番",
            {},
            progress.watchedEpisodeCount,
          )}
        </span>
      );
    })}
  </div>
)}
~~~

When searchProgressError is present, isSearchProgressLoading is false, so the unavailable-progress cards remain visible. Do not add buttons that write selections or watched episodes.

- [ ] **Step 4: 运行页面回归测试确认其通过**

Run:

~~~bash
npm run build && node --test tests/rendered-html.test.mjs
~~~

Expected: PASS with 0 failures. The test must prove search still uses allAnime while now loading selections and passing existing progress data into statisticsAnimeCard.

- [ ] **Step 5: 提交搜索进度实现**

~~~bash
git add app/page.tsx tests/rendered-html.test.mjs
git commit -m "feat: show progress in anime search"
~~~

### Task 3: 完整验证

**Files:**

- Verify: app/page.tsx
- Verify: tests/rendered-html.test.mjs
- Verify: lib/anime-statistics.js

- [ ] **Step 1: 检查改动范围和空白错误**

Run:

~~~bash
git status --short
git diff --check f5d2dac..HEAD
git diff --name-only f5d2dac..HEAD
~~~

Expected: only app/page.tsx and tests/rendered-html.test.mjs change after the design baseline; no whitespace errors.

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
