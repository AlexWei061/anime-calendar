# 当前时刻发光标线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前桌面周时间轴中以北京时间显示一条横跨全周、不会拦截节目卡点击的发光当前时刻标线。

**Architecture:** `lib/calendar.js` 负责将真实北京时间映射到已有的日历视觉日期和纵向偏移，确保凌晨时段与节目排期共用同一规则。`app/page.tsx` 每分钟订阅一个稳定的北京时间字符串；仅当前显示周包含该日期且偏移落在动态时间轴范围内时绘制各日栏的线段。CSS 使用现有 token 处理横线、光晕和时间胶囊，移动端不新增任何 UI。

**Tech Stack:** React 19、TypeScript、Node 内置测试运行器、CSS 设计 token、vinext。

---

## 文件结构

- 修改 `lib/calendar.js`：新增无副作用的 `timelineMarkerForDateTime()`，复用内部 `layoutBroadcast()` 与 `timeToMinutes()`。
- 修改 `tests/calendar.test.mjs`：验证普通时间、凌晨回退和边界外隐藏。
- 修改 `app/page.tsx`：按分钟获得 `Asia/Shanghai` 日期时间、调用纯函数、仅在当前周渲染标线。
- 修改 `tests/rendered-html.test.mjs`：锁定页面订阅、条件渲染和桌面标线样式约束。
- 修改 `app/globals.css`：实现 A 方案的全宽发光线及时间胶囊。

### Task 1: 时间轴标线映射

**Files:**
- Modify: `tests/calendar.test.mjs:9-21,378-386`
- Modify: `lib/calendar.js:86-96`

- [ ] **Step 1: 写入失败的纯函数测试**

在 `tests/calendar.test.mjs` 的 calendar 解构中加入 `timelineMarkerForDateTime`，并在现有 `timelineOffsetMinutes` 测试后加入：

```js
test("maps a current Beijing time onto the visible timeline", () => {
  assert.deepEqual(
    timelineMarkerForDateTime("2026-07-31", "14:43", 5 * 60, 29 * 60),
    { date: "2026-07-31", time: "14:43", offsetMinutes: 583 },
  );
  assert.deepEqual(
    timelineMarkerForDateTime("2026-08-01", "02:15", 5 * 60, 29 * 60),
    { date: "2026-07-31", time: "26:15", offsetMinutes: 1275 },
  );
  assert.equal(timelineMarkerForDateTime("2026-07-31", "14:43", 15 * 60, 29 * 60), null);
});
```

- [ ] **Step 2: 运行测试并确认它因缺少导出而失败**

Run: `node --test tests/calendar.test.mjs`

Expected: FAIL，报出 `timelineMarkerForDateTime is not a function`。

- [ ] **Step 3: 实现最小映射函数**

紧接 `timelineOffsetMinutes()` 后加入：

```js
export function timelineMarkerForDateTime(
  isoDate,
  time,
  timelineStartMinutes = TIMELINE_START_MINUTES,
  timelineEndMinutes = TIMELINE_END_MINUTES,
) {
  const layout = layoutBroadcast(isoDate, time);
  const minutes = timeToMinutes(layout.time);
  if (minutes < timelineStartMinutes || minutes > timelineEndMinutes) return null;

  return { date: layout.date, time: layout.time, offsetMinutes: minutes - timelineStartMinutes };
}
```

不要导出 `layoutBroadcast` 或 `timeToMinutes`，以保持现有排期辅助函数的内部边界。

- [ ] **Step 4: 重新运行纯函数测试**

Run: `node --test tests/calendar.test.mjs`

Expected: PASS，新增测试和既有 calendar 测试均通过。

- [ ] **Step 5: 提交映射层**

```bash
git add lib/calendar.js tests/calendar.test.mjs
git commit -m "feat: map current time onto timeline"
```

### Task 2: 当前北京时间状态与条件渲染

**Files:**
- Modify: `tests/rendered-html.test.mjs:519-531`
- Modify: `app/page.tsx:29-42,173-193,289-293,364-378,1407-1423`

- [ ] **Step 1: 写入失败的页面结构断言**

在 `tests/rendered-html.test.mjs` 现有北京时间断言后加入：

```js
assert.match(page, /timelineMarkerForDateTime/);
assert.match(page, /function getBeijingDateTime\(\) \{/);
assert.match(page, /function getServerBeijingDateTime\(\) \{\s*return null;/);
assert.match(page, /const currentBeijingDateTime = useSyncExternalStore<string \| null>\(/);
assert.match(page, /dates\.includes\(currentBeijingDate\)/);
assert.match(page, /className="timeline-current-time"/);
assert.match(page, /--timeline-current-time-top/);
```

- [ ] **Step 2: 运行断言并确认缺失特性导致失败**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL，报出 `timelineMarkerForDateTime` 或 `getBeijingDateTime` 未匹配；不要修改构建产物来使测试通过。

- [ ] **Step 3: 订阅单一的北京时间日期时间快照并计算标线**

将页面 import 中的 `timelineOffsetMinutes` 后加上 `timelineMarkerForDateTime`。用下列 formatter 和函数替换只含日期的 formatter/快照函数：

```ts
const beijingDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getBeijingDateTime() {
  const parts = Object.fromEntries(
    beijingDateTimeFormatter
      .formatToParts(new Date())
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function getServerBeijingDateTime() {
  return null;
}
```

把订阅改为：

```ts
const currentBeijingDateTime = useSyncExternalStore<string | null>(
  subscribeToBeijingDate,
  getBeijingDateTime,
  getServerBeijingDateTime,
);
const currentBeijingDate = currentBeijingDateTime?.slice(0, 10) ?? null;
const currentBeijingTime = currentBeijingDateTime?.slice(11) ?? null;
```

在 `timelineStyle` 后计算：

```ts
const currentTimelineMarker =
  currentBeijingDate && currentBeijingTime && dates.includes(currentBeijingDate)
    ? timelineMarkerForDateTime(
        currentBeijingDate,
        currentBeijingTime,
        timelineStartMinutes,
        timelineEndMinutes,
      )
    : null;
const currentTimelineMarkerStyle = currentTimelineMarker
  ? ({ "--timeline-current-time-top": currentTimelineMarker.offsetMinutes * 1.6 + "px" } as CSSProperties)
  : undefined;
```

在每个 `.timeline-day` 的 `positionedEvents.map(...)` 前加入：

```tsx
{currentTimelineMarker ? (
  <div className="timeline-current-time" style={currentTimelineMarkerStyle} aria-hidden="true">
    {index === 0 ? <time>{currentBeijingTime}</time> : null}
  </div>
) : null}
```

保留 `subscribeToBeijingDate()` 的 60 秒 interval；新的快照在每分钟改变，因此会触发实际重渲染。不要改变 `timelineBoundsForEvents()`，也不要将标线输出到 `.mobile-calendar`。

- [ ] **Step 4: 运行页面测试确认结构通过**

Run: `node --test tests/rendered-html.test.mjs`

Expected: PASS；服务端初始快照仍为 `null`，因此生成 HTML 不会伪造一个“当前时间”。

- [ ] **Step 5: 提交页面逻辑**

```bash
git add app/page.tsx tests/rendered-html.test.mjs
git commit -m "feat: render current time marker"
```

### Task 3: A 方案的发光样式

**Files:**
- Modify: `tests/rendered-html.test.mjs:739-747`
- Modify: `app/globals.css:1311-1324`

- [ ] **Step 1: 写入失败的样式断言**

在时间轴 CSS 断言后加入：

```js
assert.match(
  styles,
  /\.timeline-current-time\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*var\(--timeline-current-time-top\);[\s\S]*?height:\s*2px;[\s\S]*?pointer-events:\s*none;/,
);
assert.match(
  styles,
  /\.timeline-current-time\s*\{[\s\S]*?background:\s*linear-gradient\([\s\S]*?var\(--accent-2\)[\s\S]*?var\(--accent\)[\s\S]*?box-shadow:/,
);
assert.match(styles, /\.timeline-current-time time\s*\{[\s\S]*?border-radius:\s*999px;/);
```

- [ ] **Step 2: 运行测试并确认没有标线样式**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL，报出 `.timeline-current-time` 未匹配。

- [ ] **Step 3: 添加仅桌面使用的 token 化样式**

在 `.timeline-day.is-today` 规则后加入：

```css
.timeline-current-time {
  position: absolute;
  z-index: 3;
  top: var(--timeline-current-time-top);
  right: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-2), var(--accent));
  box-shadow:
    0 0 0.35rem color-mix(in srgb, var(--accent-2) 86%, transparent),
    0 0 1rem color-mix(in srgb, var(--accent) 62%, transparent);
  pointer-events: none;
}

.timeline-current-time time {
  position: absolute;
  top: 50%;
  left: 0.35rem;
  transform: translateY(-50%);
  padding: 0.12rem 0.38rem;
  border-radius: 999px;
  background: var(--accent-2);
  color: var(--on-accent);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.2;
  box-shadow: 0 0 0.7rem color-mix(in srgb, var(--accent-2) 74%, transparent);
}
```

不要添加硬编码色值或移动端覆盖。现有 `@media (max-width: 860px)` 已整体隐藏 `.timeline-grid`。

- [ ] **Step 4: 运行页面样式断言**

Run: `node --test tests/rendered-html.test.mjs`

Expected: PASS；既有移动端 `.timeline-grid { display: none; }` 断言仍通过。

- [ ] **Step 5: 提交视觉样式**

```bash
git add app/globals.css tests/rendered-html.test.mjs
git commit -m "style: glow current time line"
```

### Task 4: 全量验证与浏览器检查

**Files:**
- Verify only: `lib/calendar.js`, `app/page.tsx`, `app/globals.css`, `tests/calendar.test.mjs`, `tests/rendered-html.test.mjs`

- [ ] **Step 1: 运行静态检查**

Run: `npm run lint -- --ignore-pattern .worktrees`

Expected: exit 0。

- [ ] **Step 2: 运行完整测试套件**

Run: `npm test`

Expected: typecheck、Worker build 和全部 Node 测试通过。

- [ ] **Step 3: 检查改动卫生**

Run: `git diff main...HEAD --check && git status --short`

Expected: diff 检查无输出，状态只包含预期的未提交变更（若尚未执行各任务提交）。

- [ ] **Step 4: 浏览器验证 A 方案**

使用本地应用打开当前北京时间所在周，确认：

1. 周一至周日同一纵向位置出现 2px 青粉发光线，周一端为北京时间 `HH:MM`；
2. 点击横线下的节目卡仍打开原生详情弹窗；
3. 切换到上一周或下一周后标线消失；
4. 宽度不超过 860px 时只保留原有单日议程，标线不出现。

- [ ] **Step 5: 提交计划并确认最终状态**

```bash
git add docs/superpowers/plans/2026-07-31-current-time-line.md
git commit -m "docs: plan current time line"
git status --short
git log --oneline main..HEAD
```

Expected: 工作树干净，且包含 Task 1–3 的三个特性提交和本设计/计划提交。
