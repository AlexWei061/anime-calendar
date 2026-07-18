# 查询结果卡片放大 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让查询页的一行一部结果卡使用更醒目的竖版封面，并让文字和进度信息与封面比例协调。

**Architecture:** 只在 `.anime-search-results` 下覆盖共享的统计卡样式，保留现有组件、单列结果列表和所有其他页面样式。通过现有全局搜索渲染测试对 CSS 源码做静态断言，锁定该搜索页专属的尺寸。

**Tech Stack:** Next.js 16、React 19、全局 CSS、Node 内置测试运行器。

---

### Task 1: 为放大的查询结果卡写失败的 CSS 回归测试

**Files:**

- Modify: `tests/rendered-html.test.mjs:685-720`

- [ ] **Step 1: 在现有全局搜索测试中追加搜索页专属尺寸断言**

Inside `keeps global title search separate from calendar schedules`, after the existing `.anime-search-results` single-column assertion, add:

~~~js
assert.match(
  styles,
  /\.anime-search-results \.statistics-anime-card\s*\{[^}]*?grid-template-columns:\s*6rem minmax\(0, 1fr\) auto;[^}]*?gap:\s*0\.9rem;[^}]*?padding:\s*0\.7rem;/,
);
assert.match(
  styles,
  /\.anime-search-results \.statistics-anime-card-cover\s*\{[^}]*?width:\s*6rem;/,
);
assert.match(
  styles,
  /\.anime-search-results \.statistics-anime-card-content strong\s*\{[^}]*?font-size:\s*1\.05rem;/,
);
assert.match(
  styles,
  /\.anime-search-results \.statistics-anime-card-content small,\s*\.anime-search-results \.statistics-anime-card-content em\s*\{[^}]*?font-size:\s*0\.82rem;/,
);
assert.match(
  styles,
  /\.anime-search-results \.statistics-anime-card-progress\s*\{[^}]*?height:\s*0\.4rem;/,
);
~~~

- [ ] **Step 2: 运行定向测试并确认它因缺少搜索页样式覆盖而失败**

Run:

~~~bash
npm run build && node --test tests/rendered-html.test.mjs
~~~

Expected: `keeps global title search separate from calendar schedules` fails at the new `6rem` search-card assertion; no test syntax or unrelated failure occurs.

- [ ] **Step 3: 提交失败测试**

~~~bash
git add tests/rendered-html.test.mjs
git commit -m "test: define search card scale"
~~~

### Task 2: 仅放大查询页的封面、文字与进度条

**Files:**

- Modify: `app/globals.css:423-500`
- Test: `tests/rendered-html.test.mjs:685-720`

- [ ] **Step 1: 在搜索结果单列规则后追加局部覆盖样式**

Add immediately after `.statistics-anime-card-list.anime-search-results`:

~~~css
.anime-search-results .statistics-anime-card {
  grid-template-columns: 6rem minmax(0, 1fr) auto;
  gap: 0.9rem;
  padding: 0.7rem;
}

.anime-search-results .statistics-anime-card-cover {
  width: 6rem;
}

.anime-search-results .statistics-anime-card-content strong {
  font-size: 1.05rem;
}

.anime-search-results .statistics-anime-card-content small,
.anime-search-results .statistics-anime-card-content em {
  font-size: 0.82rem;
}

.anime-search-results .statistics-anime-card-progress {
  height: 0.4rem;
}
~~~

Do not change the shared `.statistics-anime-card`, cover, content, progress, or status selectors. The 3:4 cover ratio supplies the intended `8rem` cover height automatically; do not hard-code a separate height.

- [ ] **Step 2: 运行定向测试确认样式断言通过**

Run:

~~~bash
npm run build && node --test tests/rendered-html.test.mjs
~~~

Expected: all rendered HTML tests pass, including the global-search CSS assertions.

- [ ] **Step 3: 提交局部搜索样式**

~~~bash
git add app/globals.css
git commit -m "style: enlarge anime search cards"
~~~

### Task 3: 完整验证

**Files:**

- Verify: `app/globals.css`
- Verify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 检查实现范围与空白错误**

Run:

~~~bash
git status --short
PLAN_BASE=$(git log -1 --format=%H -- docs/superpowers/plans/2026-07-18-search-card-scale.md)
git diff --check "$PLAN_BASE"..HEAD
git diff --name-only "$PLAN_BASE"..HEAD
~~~

Expected: the feature commits only change `app/globals.css` and `tests/rendered-html.test.mjs`; no whitespace errors occur.

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

Expected: the Worker build succeeds and all `tests/*.test.mjs` tests pass with 0 failures.
