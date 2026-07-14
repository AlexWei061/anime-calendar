# 每周时间轴裁剪 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 根据当前周的定时节目动态收紧桌面时间轴，去除节目范围之外的上下空白。

**Architecture:** 在 `lib/calendar.js` 增加独立的时间轴边界计算函数，使用已经转换为视觉日期和时间的周事件。`app/page.tsx` 使用该结果生成整点刻度、网格高度和节目垂直偏移；手机日程和未定时节目维持现有数据流。

**Tech Stack:** React/TypeScript、Node.js 原生测试、Vinext。

---

## File structure

- Modify: `lib/calendar.js` — 根据周事件计算开始与结束整点。
- Modify: `tests/calendar.test.mjs` — 覆盖普通、跨日、空周与边界节目。
- Modify: `app/page.tsx` — 将动态边界接入桌面时间轴的刻度、尺寸与偏移。
- Modify: `tests/rendered-html.test.mjs` — 验证页面使用动态边界并在首屏输出收紧后的时间轴。

### Task 1: 时间轴边界计算

**Files:**
- Modify: `lib/calendar.js:41-55`
- Modify: `tests/calendar.test.mjs:1-19, 270-285`

- [ ] **Step 1: 写入失败测试，描述按整点收紧的范围**

在日历测试的导入解构中加入 `timelineBoundsForEvents`，再新增以下测试：

```js
test("trims a weekly timeline to whole hours around its events", () => {
  assert.deepEqual(
    timelineBoundsForEvents([{ time: "16:00" }], 5 * 60, 29 * 60),
    { startMinutes: 16 * 60, endMinutes: 17 * 60 },
  );
  assert.deepEqual(
    timelineBoundsForEvents([{ time: "16:10" }, { time: "23:40" }], 5 * 60, 29 * 60),
    { startMinutes: 16 * 60, endMinutes: 25 * 60 },
  );
});

test("uses visual overnight times and safe fallback bounds", () => {
  assert.deepEqual(
    timelineBoundsForEvents([{ time: "25:00" }], 5 * 60, 29 * 60),
    { startMinutes: 25 * 60, endMinutes: 26 * 60 },
  );
  assert.deepEqual(
    timelineBoundsForEvents([], 5 * 60, 29 * 60),
    { startMinutes: 5 * 60, endMinutes: 29 * 60 },
  );
});

test("keeps a final-boundary event inside the timeline", () => {
  assert.deepEqual(
    timelineBoundsForEvents([{ time: "28:00" }], 15 * 60, 28 * 60),
    { startMinutes: 27 * 60, endMinutes: 28 * 60 },
  );
});
```

- [ ] **Step 2: 运行测试，确认当前实现失败**

Run: `node --test tests/calendar.test.mjs`

Expected: FAIL，`timelineBoundsForEvents` 尚未导出。

- [ ] **Step 3: 实现最小的纯计算函数**

在 `timelineOffsetMinutes` 后加入：

```js
export function timelineBoundsForEvents(
  events,
  defaultStartMinutes,
  defaultEndMinutes,
  eventDurationMinutes = TIMELINE_EVENT_DURATION_MINUTES,
) {
  if (!events.length) {
    return { startMinutes: defaultStartMinutes, endMinutes: defaultEndMinutes };
  }

  const eventMinutes = events.map(({ time }) => timeToMinutes(time));
  const firstEventMinutes = Math.min(...eventMinutes);
  const lastEventMinutes = Math.max(...eventMinutes);
  const startMinutes = Math.max(
    defaultStartMinutes,
    Math.min(Math.floor(firstEventMinutes / 60) * 60, defaultEndMinutes - 60),
  );
  const roundedEndMinutes = Math.ceil((lastEventMinutes + eventDurationMinutes) / 60) * 60;

  return {
    startMinutes,
    endMinutes: Math.max(startMinutes + 60, Math.min(defaultEndMinutes, roundedEndMinutes)),
  };
}
```

这保证最后一个节目在季度末端时也有一个完整的视觉小时承载其卡片；早于 05:00 的节目已经由 `eventsForWeek` 转为 24:00–28:59 视觉时间，因此无需额外改日期逻辑。

- [ ] **Step 4: 运行计算测试，确认通过**

Run: `node --test tests/calendar.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交边界计算**

```bash
git add lib/calendar.js tests/calendar.test.mjs
git commit -m "feat: trim weekly timeline bounds"
```

### Task 2: 将动态边界接入桌面周视图

**Files:**
- Modify: `app/page.tsx:12-22, 102-115, 260-268, 462-467`
- Modify: `tests/rendered-html.test.mjs:55-70, 190-206`

- [ ] **Step 1: 写入失败测试，要求页面输出收紧范围**

在服务器渲染测试中加入：

```js
assert.match(html, /--timeline-hour-count:13;--timeline-height:1288px/);
```

首屏固定为 2026 年 7 月 6 日这一周：最早节目为 15:30，最晚节目为 27:08；按 25 分钟卡片时长向上取整后边界为 15:00–28:00，因此有 13 个小时区间和 `13 * 96 + 40 = 1288px` 高度。

在页面源码断言中，用以下断言替换当前静态 `timelineEndMinutes` 断言：

```js
assert.match(page, /timelineBoundsForEvents\(events, defaultTimelineStartMinutes, defaultTimelineEndMinutes\)/);
assert.match(page, /const timelineHourCount = \(timelineEndMinutes - timelineStartMinutes\) \/ 60;/);
assert.match(page, /--timeline-hour-count": String\(timelineHourCount\)/);
assert.doesNotMatch(page, /const timelineEndMinutes = activeSeason\.timelineStartHour < 15/);
```

- [ ] **Step 2: 构建并运行渲染测试，确认当前实现失败**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: FAIL，当前页面仍输出 14 个小时区间和静态时间范围。

- [ ] **Step 3: 用周事件的边界替换静态时间轴范围**

在 `app/page.tsx` 的日历工具导入中加入 `timelineBoundsForEvents`。将 `events` 的创建移动到默认边界定义之后，并用以下结构取代原本静态的时间轴变量：

```tsx
const defaultTimelineStartMinutes = activeSeason.timelineStartHour * 60;
const defaultTimelineEndMinutes = (activeSeason.timelineStartHour < 15 ? 29 : 28) * 60;
const events = eventsForWeek(displayedAnime, activeWeekStart) as CalendarEvent[];
const { startMinutes: timelineStartMinutes, endMinutes: timelineEndMinutes } =
  timelineBoundsForEvents(events, defaultTimelineStartMinutes, defaultTimelineEndMinutes);
const timelineHourCount = (timelineEndMinutes - timelineStartMinutes) / 60;
const timelineEndHour = timelineEndMinutes / 60;
const timelineHours = Array.from(
  { length: timelineHourCount + 1 },
  (_, index) => timelineStartMinutes / 60 + index,
);
const timelineStyle = {
  "--timeline-hour-count": String(timelineHourCount),
  "--timeline-height": timelineHourCount * 96 + 40 + "px",
} as CSSProperties;
```

保留 `timelineOffsetMinutes(event.time, timelineStartMinutes, timelineEndMinutes)`，这样每张卡片相对于裁剪后的顶部定位；保留现有 CSS，因为其 `repeat(--timeline-hour-count, 96px) 40px` 正好使用小时区间数和终点标签行。不要修改手机日程、网络节目或详情弹窗。

- [ ] **Step 4: 构建并运行渲染测试，确认通过**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: PASS，首屏时间轴高度为 `1288px`，页面源码只使用动态边界。

- [ ] **Step 5: 提交页面接入**

```bash
git add app/page.tsx tests/rendered-html.test.mjs
git commit -m "feat: trim weekly calendar timeline"
```

### Task 3: 回归验证

**Files:**
- Verify only: existing tests and build output

- [ ] **Step 1: 运行完整验证**

Run: `npm test && npm run lint && npm run build`

Expected: 所有测试和生产构建通过；lint 不新增错误，现有 `<img>` 性能提示可保留。

- [ ] **Step 2: 检查提交范围**

Run: `git status --short && git diff --check main...HEAD`

Expected: 工作树干净，且没有与时间轴裁剪无关的未提交修改。
