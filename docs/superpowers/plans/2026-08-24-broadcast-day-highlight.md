# 午夜后的当前放送日 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让北京时间 `00:00–04:59` 的日历日期高光、导航、移动端默认日期和当前时间标线统一归到前一放送日，并在 `05:00` 切换到自然日。

**Architecture:** `lib/calendar.js` 提供一个复用现有 `layoutBroadcast()` 规则的纯日期映射函数。`app/page.tsx` 同时保留统计用自然日和日历用放送日，所有日历日期比较与导航使用后者，当前时间标线按其映射结果判断是否属于显示周。

**Tech Stack:** Next.js 16、React 19、TypeScript、Node 内置测试运行器、vinext/Vite。

---

## 文件结构

- 修改 `lib/calendar.js`：导出当前自然日期时间到视觉放送日的纯映射函数。
- 修改 `tests/calendar.test.mjs`：覆盖午夜、凌晨末端和 `05:00` 日界线。
- 修改 `app/page.tsx`：分离自然日与放送日，统一桌面、移动端、导航、事件状态和时间标线。
- 修改 `tests/rendered-html.test.mjs`：锁定页面职责分离和日历各入口使用放送日。

### Task 1: 当前放送日纯函数

**Files:**
- Modify: `tests/calendar.test.mjs:7-22,389-399`
- Modify: `lib/calendar.js:98-109`

- [ ] **Step 1: 写入失败的边界测试**

在 `tests/calendar.test.mjs` 的 calendar 解构中加入 `calendarDateForDateTime`：

```js
const {
  addDays,
  calendarDateForDateTime,
  dateOnlyEventsForWeek,
  eventsForWeek,
  formatBroadcastTime,
  groupEventsByTime,
  layoutEventsForDay,
  layoutTimelineEvents,
  seasonForWeek,
  stackEventsForDay,
  startOfWeek,
  timelineBoundsForEvents,
  timelineMarkerForDateTime,
  timelineOffsetMinutes,
  weekDays,
} = calendar;
```

在现有 `timelineMarkerForDateTime` 测试前加入：

```js
test("keeps the calendar on the previous broadcast day until 05:00", () => {
  assert.equal(calendarDateForDateTime("2026-08-01", "00:00"), "2026-07-31");
  assert.equal(calendarDateForDateTime("2026-08-01", "04:59"), "2026-07-31");
  assert.equal(calendarDateForDateTime("2026-08-01", "05:00"), "2026-08-01");
});
```

- [ ] **Step 2: 运行测试并确认因缺少导出而失败**

Run: `node --test tests/calendar.test.mjs`

Expected: FAIL，测试报告 `calendarDateForDateTime is not a function`；既有测试在该断言前保持正常。

- [ ] **Step 3: 实现最小日期映射函数**

在 `lib/calendar.js` 的 `timelineMarkerForDateTime()` 后加入：

```js
export function calendarDateForDateTime(isoDate, time) {
  return layoutBroadcast(isoDate, time).date;
}
```

该函数只返回现有午夜布局规则给出的日期，不导出 `layoutBroadcast()`，也不复制 `5 * 60` 阈值。

- [ ] **Step 4: 重新运行纯函数测试**

Run: `node --test tests/calendar.test.mjs`

Expected: PASS，26 项 calendar 测试全部通过。

- [ ] **Step 5: 提交纯函数与回归测试**

```bash
git add lib/calendar.js tests/calendar.test.mjs
git commit -m "fix: define the current broadcast day"
```

### Task 2: 页面统一使用当前放送日

**Files:**
- Modify: `tests/rendered-html.test.mjs:528-572`
- Modify: `app/page.tsx:28-43,299-305,367-398,419-425,628-648,898-900,1496-1556`

- [ ] **Step 1: 写入失败的页面职责断言**

在 `tests/rendered-html.test.mjs` 的当前时间标线断言区加入以下断言，并把原先要求 `dates.includes(currentBeijingDate)` 与 `startOfWeek(currentBeijingDate)` 的断言替换掉：

```js
assert.match(page, /calendarDateForDateTime/);
assert.match(
  page,
  /const currentCalendarDate =\s*currentBeijingDate && currentBeijingTime\s*\? calendarDateForDateTime\(currentBeijingDate, currentBeijingTime\)\s*:\s*currentBeijingDate;/,
);
assert.match(
  page,
  /const todayBroadcasts = \(currentBeijingDate\s*\? broadcastsForDate\(selectedAnime, currentBeijingDate\)\s*: \[\]\) as BroadcastEvent\[\];/,
);
assert.match(
  page,
  /const mappedCurrentTimelineMarker =\s*currentBeijingDate && currentBeijingTime\s*\? timelineMarkerForDateTime\([\s\S]*?\)\s*:\s*null;/,
);
assert.match(
  page,
  /const currentTimelineMarker =\s*mappedCurrentTimelineMarker && dates\.includes\(mappedCurrentTimelineMarker\.date\)\s*\? mappedCurrentTimelineMarker\s*:\s*null;/,
);
assert.match(
  page,
  /if \(!currentCalendarDate \|\| didSetInitialWeek\.current\) return;[\s\S]*?setActiveWeekStart\(startOfWeek\(currentCalendarDate\)\);[\s\S]*?setActiveMobileDate\(currentCalendarDate\);[\s\S]*?\}, \[currentCalendarDate\]\);/,
);
assert.match(page, /currentCalendarDate \?\? initialWeekStart/);
assert.match(page, /const date = currentCalendarDate \?\? activeWeekStart;/);
assert.match(page, /const isToday = event\.date === currentCalendarDate;/);
assert.match(page, /const isToday = date === currentCalendarDate;/);
assert.match(page, /date === currentCalendarDate \? " is-today" : ""/);
assert.doesNotMatch(page, /dates\.includes\(currentBeijingDate\)/);
assert.doesNotMatch(page, /startOfWeek\(currentBeijingDate\)/);
assert.doesNotMatch(page, /date === currentBeijingDate/);
```

- [ ] **Step 2: 运行页面测试并确认旧实现导致失败**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL，首个失败指出页面没有 `calendarDateForDateTime` 或 `currentCalendarDate`；不要修改测试来接受旧的自然日比较。

- [ ] **Step 3: 派生自然日与当前放送日**

在 `app/page.tsx` 的 calendar import 中加入 `calendarDateForDateTime`。在 `currentBeijingDate` 与 `currentBeijingTime` 后加入：

```ts
const currentCalendarDate =
  currentBeijingDate && currentBeijingTime
    ? calendarDateForDateTime(currentBeijingDate, currentBeijingTime)
    : currentBeijingDate;
```

保留以下自然日统计，不改为 `currentCalendarDate`：

```ts
const todayBroadcasts = (currentBeijingDate
  ? broadcastsForDate(selectedAnime, currentBeijingDate)
  : []) as BroadcastEvent[];
```

- [ ] **Step 4: 让时间标线按映射后的日期判断显示周**

把现有 `currentTimelineMarker` 计算替换为：

```ts
const mappedCurrentTimelineMarker =
  currentBeijingDate && currentBeijingTime
    ? timelineMarkerForDateTime(
        currentBeijingDate,
        currentBeijingTime,
        timelineStartMinutes,
        timelineEndMinutes,
      )
    : null;
const currentTimelineMarker =
  mappedCurrentTimelineMarker && dates.includes(mappedCurrentTimelineMarker.date)
    ? mappedCurrentTimelineMarker
    : null;
```

`currentTimelineMarkerStyle` 和标线 JSX 保持原样。

- [ ] **Step 5: 将日历日期比较与导航切换为放送日**

只在日历相关代码中作以下替换：

```ts
useEffect(() => {
  if (!currentCalendarDate || didSetInitialWeek.current) return;

  didSetInitialWeek.current = true;
  setActiveWeekStart(startOfWeek(currentCalendarDate));
  setActiveMobileDate(currentCalendarDate);
}, [currentCalendarDate]);

const returnToCurrentWeek = () => {
  const date = !isHistoricalSeason
    ? currentCalendarDate ?? initialWeekStart
    : firstFullWeekStart(activeSeason);
  setActiveWeekStart(startOfWeek(date));
  setActiveMobileDate(date);
};

const jumpToTodaySchedule = () => {
  const date = currentCalendarDate ?? activeWeekStart;
  setActiveWeekStart(startOfWeek(date));
  setActiveMobileDate(date);
  window.requestAnimationFrame(scrollToWeeklySchedule);
};
```

并将 `eventButton()`、桌面日期表头、`.timeline-date-only` 和 `.timeline-day` 中的日期比较从 `currentBeijingDate` 改为 `currentCalendarDate`：

```ts
const isToday = event.date === currentCalendarDate;
const isToday = date === currentCalendarDate;
className={"timeline-date-only" + (date === currentCalendarDate ? " is-today" : "")}
```

不要修改统计标题中的 `shortDate(currentBeijingDate)`，也不要改变移动端 JSX；移动端会通过 `activeMobileDate` 的初始化和跳转目标自然获得放送日。

- [ ] **Step 6: 运行页面回归测试**

Run: `node --test tests/rendered-html.test.mjs`

Expected: PASS，页面结构测试全部通过。

- [ ] **Step 7: 运行纯函数与页面两组测试**

Run: `node --test tests/calendar.test.mjs tests/rendered-html.test.mjs`

Expected: PASS，两组测试均无失败、取消或跳过。

- [ ] **Step 8: 提交页面修复**

```bash
git add app/page.tsx tests/rendered-html.test.mjs
git commit -m "fix: align calendar highlight after midnight"
```

### Task 3: 完整验证与差异审查

**Files:**
- Verify only: `lib/calendar.js`
- Verify only: `app/page.tsx`
- Verify only: `tests/calendar.test.mjs`
- Verify only: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 运行 lint**

Run: `npm run lint -- --ignore-pattern .worktrees`

Expected: PASS，退出码为 0，无 ESLint error。

- [ ] **Step 2: 运行完整测试**

Run: `npm test`

Expected: PASS；命令完成严格类型检查、vinext/Worker 构建及全部 `tests/*.test.mjs`，失败数为 0。

- [ ] **Step 3: 检查空白与改动范围**

Run: `git diff --check 729f74f..HEAD`

Expected: PASS，无输出。

Run: `git status --short`

Expected: 无输出；计划、运行时代码和测试均已提交，不出现无关文件。

Run: `git diff --stat 729f74f..HEAD`

Expected: 只包含本计划、`lib/calendar.js`、`app/page.tsx`、`tests/calendar.test.mjs` 和 `tests/rendered-html.test.mjs`。

- [ ] **Step 4: 审查最终日期职责**

Run: `rg -n "currentBeijingDate|currentCalendarDate|mappedCurrentTimelineMarker" app/page.tsx`

Expected: `currentBeijingDate` 只承担自然日派生、放送日映射输入、当前时间标线输入和“今天播出”统计；所有日历高光、日历导航和事件“今天”状态使用 `currentCalendarDate`；标线显示周检查使用 `mappedCurrentTimelineMarker.date`。
