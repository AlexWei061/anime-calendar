# 跨季度连续周历 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让季度选择器只跳转日历位置，周历可连续显示 2026 年所有已收录季度中仍在播出的作品。

**Architecture:** 保留 `activeSeason` 作为季度标题、来源、选择器和本季度收藏面板的上下文；新增独立的周历数据集合，播出表使用 `allAnime`，我的番剧使用全年已勾选作品。时间轴采用全年的安全边界（05:00–29:00），再交给现有动态裁切缩短。

**Tech Stack:** React、Node.js ESM、node:test、现有 calendar helpers。

---

## 文件结构

- `app/page.tsx`：分离季度上下文、全年周历数据和当前季度的网络放送列表。
- `tests/anime-data.test.mjs`：验证真实历史/当前目录能在季度交界周一起生成事件。
- `tests/rendered-html.test.mjs`：锁定周历的数据源和全年时间轴边界。

### Task 1: 写入并观察跨季度回归测试失败

**Files:**
- Modify: `tests/anime-data.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 添加真实目录的跨季度事件测试**

```js
test("keeps all recorded seasons available while navigating calendar weeks", () => {
  const marchToAprilEvents = eventsForWeek(allAnime, "2026-03-30");
  const juneToJulyEvents = eventsForWeek(allAnime, "2026-06-29");

  assert.ok(marchToAprilEvents.some(({ id, episode }) => id === "anilist-202957" && episode === 10));
  assert.ok(marchToAprilEvents.some(({ id, episode }) => id === "anilist-183231" && episode === 1));
  assert.ok(juneToJulyEvents.some(({ id, episode }) => id === "anilist-183231" && episode === 14));
  assert.ok(juneToJulyEvents.some(({ id, episode }) => id === "lets-go-kaiki" && episode === 1));
});
```

- [ ] **Step 2: 在页面源码契约测试中替换周历相关断言**

```js
assert.match(page, /const defaultTimelineStartMinutes = 5 \* 60;/);
assert.match(page, /const defaultTimelineEndMinutes = 29 \* 60;/);
assert.match(
  page,
  /const calendarAnime =\s*activePage === "mine"\s*\? allAnime\.filter\(\(record\) => selectedAnimeIds\?\.includes\(record\.id\)\)\s*: allAnime;/,
);
assert.match(page, /eventsForWeek\(calendarAnime, activeWeekStart\)/);
assert.doesNotMatch(page, /eventsForWeek\(displayedAnime, activeWeekStart\)/);
assert.match(page, /setActiveWeekStart\(nextSeason\.firstWeekStart\)/);
```

- [ ] **Step 3: 运行目标测试，确认当前页面契约失败**

Run: `node --test tests/anime-data.test.mjs tests/rendered-html.test.mjs`

Expected: FAIL，页面仍声明依赖 `activeSeason.timelineStartHour` 的时间轴边界，并把 `displayedAnime` 传给 `eventsForWeek`。

### Task 2: 解耦全年周历和季度上下文

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 用全年安全范围替换当前季度时间轴默认值**

```ts
const defaultTimelineStartMinutes = 5 * 60;
const defaultTimelineEndMinutes = 29 * 60;
```

- [ ] **Step 2: 定义全年周历数据和当前季度的辅助列表**

```ts
const calendarAnime =
  activePage === "mine"
    ? allAnime.filter((record) => selectedAnimeIds?.includes(record.id))
    : allAnime;
const selectedSeasonAnime = activeSeason.anime.filter((record) => selectedAnimeIds?.includes(record.id));
const events = eventsForWeek(calendarAnime, activeWeekStart) as CalendarEvent[];
const networkOnly = (activePage === "mine" ? selectedSeasonAnime : activeSeason.anime).filter(
  ({ scheduleWeekday, beijingTime }) => !scheduleWeekday || !beijingTime,
);
```

- [ ] **Step 3: 让周历空态判断使用 `calendarAnime`**

```tsx
{activePage === "all" || calendarAnime.length ? (
```

- [ ] **Step 4: 保留季度跳转行为**

```ts
const changeSeason = (nextSeasonId: string) => {
  const nextSeason = seasons.find(({ id }) => id === nextSeasonId);
  if (!nextSeason) return;

  setActiveSeasonId(nextSeason.id);
  setActiveWeekStart(nextSeason.firstWeekStart);
  setActiveMobileDate(nextSeason.firstWeekStart);
};
```

- [ ] **Step 5: 运行目标测试，确认转绿**

Run: `node --test tests/anime-data.test.mjs tests/rendered-html.test.mjs`

Expected: PASS，季度交界周有跨季度事件，页面周历使用全年数据且选择器仍跳至 `firstWeekStart`。

### Task 3: 完整验证并提交

**Files:**
- Modify: `app/page.tsx`
- Modify: `tests/anime-data.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 运行完整验证**

Run: `npm test && npm run lint -- --ignore-pattern .worktrees`

Expected: 构建成功、全部 node:test 通过；lint 为 0 errors（既有 `<img>` 优化警告可保留）。

- [ ] **Step 2: 检查变更范围**

Run: `git diff --check && git diff -- app/page.tsx tests/anime-data.test.mjs tests/rendered-html.test.mjs`

Expected: 只有全年周历数据源、全局时间轴范围和对应测试；不包含 `AGENTS.md`。

- [ ] **Step 3: 提交实现**

```bash
git add app/page.tsx tests/anime-data.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: navigate weekly calendar across seasons"
```
