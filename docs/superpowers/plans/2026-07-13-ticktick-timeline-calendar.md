# 滴答清单式时间轴周历实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将夏番周表替换为无横向滚动的滴答清单式连续时间画布，节目按北京时间定位、每块 25 分钟、同刻节目横向分栏且左侧封面永不省略。

**Architecture:** `lib/calendar.js` 负责时间偏移与 25 分钟重叠分栏；`app/page.tsx` 渲染共享时间轴和七个绝对定位的日期画布；`app/globals.css` 用确定的像素位置、卡片宽度与响应式规则实现布局。移动端继续使用当前单日议程。

**Tech Stack:** React、TypeScript、CSS Grid、CSS 自定义属性、Node test、Vinext。

---

### Task 1: 时间轴定位与 25 分钟分栏辅助函数

**Files:**
- Modify: `lib/calendar.js:17-118`
- Test: `tests/calendar.test.mjs:1-133`

- [ ] **Step 1: 写失败的时间轴定位与同刻分栏测试**

  在 `tests/calendar.test.mjs` 的 import 中加入 `timelineOffsetMinutes` 和 `layoutTimelineEvents`，并追加：

  ```js
  test("maps YUC times onto the 15:00 timeline and keeps overnight source times", () => {
    assert.equal(timelineOffsetMinutes("15:00"), 0);
    assert.equal(timelineOffsetMinutes("20:30"), 330);
    assert.equal(timelineOffsetMinutes("25:00"), 600);
  });

  test("lays 25-minute overlaps in horizontal lanes without moving their start times", () => {
    const layout = layoutTimelineEvents([
      { ...weeklyShow, id: "first", time: "20:30" },
      { ...weeklyShow, id: "second", time: "20:30" },
      { ...weeklyShow, id: "third", time: "20:40" },
    ]);

    assert.deepEqual(layout.map(({ event, startMinutes, lane, laneCount }) => ({
      id: event.id, startMinutes, lane, laneCount,
    })), [
      { id: "first", startMinutes: 1230, lane: 0, laneCount: 3 },
      { id: "second", startMinutes: 1230, lane: 1, laneCount: 3 },
      { id: "third", startMinutes: 1240, lane: 2, laneCount: 3 },
    ]);
  });
  ```

- [ ] **Step 2: 运行测试并确认是缺少导出的失败**

  Run: `node --test tests/calendar.test.mjs`

  Expected: FAIL，提示 `timelineOffsetMinutes` 或 `layoutTimelineEvents` 未导出。

- [ ] **Step 3: 实现最小时间轴辅助函数**

  在 `timeToMinutes` 之后加入常量与偏移函数：

  ```js
  export const TIMELINE_START_MINUTES = 15 * 60;
  export const TIMELINE_END_MINUTES = 28 * 60;
  export const TIMELINE_EVENT_DURATION_MINUTES = 25;

  export function timelineOffsetMinutes(time) {
    const offset = timeToMinutes(time) - TIMELINE_START_MINUTES;
    if (offset < 0 || timeToMinutes(time) > TIMELINE_END_MINUTES) {
      throw new RangeError("Schedule time falls outside the timeline: " + time);
    }
    return offset;
  }
  ```

  新增 `layoutTimelineEvents(events, blockDurationMinutes = TIMELINE_EVENT_DURATION_MINUTES)`，复用现有按开始时间排序、重叠集群和 lane 分配逻辑；返回项必须包含 `event`、`startMinutes`、`lane`、`laneCount`，其中 `startMinutes` 是原始 `timeToMinutes(event.time)`，不可为避免重叠而向后移动。保留现有 `layoutEventsForDay` 的 45 分钟行为和旧测试，避免改变非时间轴调用方。

- [ ] **Step 4: 运行辅助函数测试并确认通过**

  Run: `node --test tests/calendar.test.mjs`

  Expected: PASS，包含新增的 15:00、25:00 与同刻三分栏断言。

- [ ] **Step 5: 提交辅助函数变更**

  ```bash
  git add lib/calendar.js tests/calendar.test.mjs
  git commit -m "feat: add timeline event layout helpers"
  ```

### Task 2: 渲染连续时间画布而非逐日节目组

**Files:**
- Modify: `app/page.tsx:9-249`
- Modify: `tests/rendered-html.test.mjs:25-224`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 写失败的服务端渲染测试**

  在第一个渲染测试中，用下面断言替换当前的 `.time-grid`、`.time-groups` 和 `.time-group` 断言：

  ```js
  assert.match(html, /class="timeline-grid"/);
  assert.match(html, /class="timeline-axis"/);
  assert.match(html, /class="timeline-day"/);
  assert.match(html, /class="timeline-event/);
  assert.match(cleanHtml, /次日 01:00/);
  assert.match(html, /--event-top:528px/);
  assert.match(html, /--event-width:33\.333/);
  assert.doesNotMatch(html, /class="time-grid"/);
  ```

  将“三张同刻卡片”测试改为查找同一 `timeline-day` 中有 `--event-width:33.333` 的三个 `timeline-event`，并断言三张卡片都含 `calendar-event-cover`。

- [ ] **Step 2: 运行渲染测试并确认旧标记导致失败**

  Run: `npm run build && node --test tests/rendered-html.test.mjs`

  Expected: FAIL，提示缺少 `timeline-grid` 与 `timeline-event`。

- [ ] **Step 3: 用时间画布替换桌面周视图 JSX**

  在 `app/page.tsx`：

  1. 用 `layoutTimelineEvents`、`timelineOffsetMinutes`、`TIMELINE_END_MINUTES` 和 `TIMELINE_START_MINUTES` 替换桌面周视图的 `groupEventsByTime` import；保留 `groupEventsByTime` 只给移动端议程使用。
  2. 添加 `const timelineMinutesPerPixel = 1.6;` 和从 15:00 到 28:00（每小时）生成 `timelineLabels` 的数组，标签用现有 `formatBroadcastTime`；将 28:00 的最终标签锚定在 1248px 位置，随后保留 40px（约 25 分钟）末端缓冲，使画布总高为 1288px，避免最后一张卡片被裁切。
  3. 用 `layoutTimelineEvents(events.filter((event) => event.date === date))` 生成 `dayTimelineEvents`；移动端仍由原有 `dayEventGroups` 驱动。
  4. 把 `.time-grid-scroll > .time-grid` 替换为 `.timeline-grid`：第一格是角落，接着渲染 7 个日期头；第二行先渲染 `.timeline-axis`，再渲染 7 个 `.timeline-day`。
  5. `eventButton` 接受可选的 `{ lane, laneCount }` 定位信息，桌面事件按钮使用 `timeline-event` 类和以下样式变量：

  ```tsx
  style={{
    "--event-top": `${timelineOffsetMinutes(event.time) * timelineMinutesPerPixel}px`,
    "--event-left": `${(lane / laneCount) * 100}%`,
    "--event-width": `${100 / laneCount}%`,
  } as CSSProperties}
  ```

  保留按钮的详情交互、完整 `aria-label`、`loading="lazy"`、本地图片 URL 和事件日期。

- [ ] **Step 4: 运行渲染测试并确认通过**

  Run: `npm run build && node --test tests/rendered-html.test.mjs`

  Expected: PASS，时间画布、次日标签、定位变量和同刻三分栏都出现。

- [ ] **Step 5: 提交桌面 JSX 与渲染测试**

  ```bash
  git add app/page.tsx tests/rendered-html.test.mjs
  git commit -m "feat: render ticktick timeline calendar"
  ```

### Task 3: 无横向滚动的 25 分钟卡片样式与完整回归

**Files:**
- Modify: `app/globals.css:205-340, 490-560`
- Modify: `tests/rendered-html.test.mjs:118-224`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 写失败的样式结构测试**

  在“keeps navigation...”测试中，替换旧的 `.time-grid` / `.time-groups` 样式断言：

  ```js
  assert.match(styles, /\.timeline-grid/);
  assert.match(styles, /grid-template-columns:\s*3\.5rem repeat\(7, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.timeline-axis/);
  assert.match(styles, /\.timeline-day/);
  assert.match(styles, /\.timeline-event/);
  assert.match(styles, /height:\s*40px/);
  assert.match(styles, /object-fit:\s*contain/);
  assert.match(styles, /text-overflow:\s*ellipsis/);
  assert.doesNotMatch(styles, /\.time-grid-scroll/);
  ```

- [ ] **Step 2: 运行样式测试并确认旧样式导致失败**

  Run: `npm run build && node --test tests/rendered-html.test.mjs`

  Expected: FAIL，提示缺少 `.timeline-grid` 或固定 40px 卡片样式。

- [ ] **Step 3: 实现桌面时间画布 CSS**

  删除桌面 `.time-grid-scroll`、`.time-grid`、`.time-column`、`.time-column-header` 和桌面 `.time-group*` 的旧逐日组样式。保留移动议程依赖的 `.time-groups` / `.time-group*` 及通用 `.calendar-event` 样式；新增的 `.timeline-event` 只覆盖桌面事件的位置和尺寸：

  ```css
  .timeline-grid {
    display: grid;
    grid-template-columns: 3.5rem repeat(7, minmax(0, 1fr));
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 0.9rem;
  }

  .timeline-day { position: relative; min-width: 0; height: 1288px; } /* 末端另留 40px（约 25 分钟）缓冲 */
  .timeline-event {
    position: absolute;
    top: var(--event-top);
    left: calc(var(--event-left) + 0.2rem);
    width: calc(var(--event-width) - 0.4rem);
    height: 40px;
    grid-template-columns: 1.85rem minmax(0, 1fr);
  }
  .timeline-event .calendar-event-cover {
    width: 1.85rem;
    height: 100%;
    aspect-ratio: 3 / 4;
    object-fit: contain;
  }
  .timeline-event strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  ```

  增加每小时和半小时的背景线、`.timeline-axis` 时刻标签、当前日期列颜色；保留移动议程所需的 `.time-groups` 规则，并在 `@media (max-width: 860px)` 中隐藏 `.timeline-grid`、显示既有 `.mobile-calendar`。不要给桌面周视图设置 `min-width` 或 `overflow-x: auto`。

- [ ] **Step 4: 运行完整回归与空白检查**

  Run: `npm test`

  Expected: PASS，所有数据、时间、渲染和样式测试通过。

  Run: `git diff --check`

  Expected: 无输出，退出码 0。

- [ ] **Step 5: 提交样式与最终测试**

  ```bash
  git add app/globals.css tests/rendered-html.test.mjs
  git commit -m "feat: style compact timeline event cards"
  ```
