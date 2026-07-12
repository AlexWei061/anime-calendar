# 封面时间轴日历 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将周历改为带本地封面、使用“次日 HH:mm”延长记时的单列节目时间轴。

**Architecture:** `lib/calendar.js` 负责延长记时的格式化、时间轴边界和同日节目顺排；`app/page.tsx` 只消费这些布局数据并渲染封面节目条；CSS 负责共享时间网格和移动端单日议程。节目继续归属 YUC 标注的播出日期列，不跨列移动。

**Tech Stack:** Next-compatible React、TypeScript、CSS、Node test、vinext / Sites。

---

## File structure

- `lib/calendar.js`：格式化 24+ 点、计算时间轴范围、把同日节目按不重叠的顺排位置输出。
- `tests/calendar.test.mjs`：验证“次日”标签、原日列归属和密集节目顺排。
- `app/page.tsx`：渲染带封面的全宽节目条、动态时间刻度和详情里的展示时间。
- `app/globals.css`：桌面时间轴封面条及移动端封面议程样式。
- `tests/rendered-html.test.mjs`：验证服务端 HTML 包含封面、次日文案且没有旧的 25–27 点轴。

### Task 1: Normalize overnight labels and stack day events

**Files:**
- Modify: `lib/calendar.js`
- Modify: `tests/calendar.test.mjs`

- [ ] **Step 1: Write failing unit tests for source-day overnight display and full-width stacking**

```js
test("formats 25:00 as next-day time without changing its YUC date", () => {
  const [event] = eventsForWeek([{ ...weeklyShow, premiereDateBeijing: "2026-07-05", scheduleWeekday: "Sun", beijingTime: "25:00" }], "2026-06-29");
  assert.deepEqual({ date: event.date, label: formatBroadcastTime(event.time) }, { date: "2026-07-05", label: "次日 01:00" });
});

test("stacks dense events in one full-width stream", () => {
  const layout = stackEventsForDay([{ ...weeklyShow, id: "one", time: "20:30" }, { ...weeklyShow, id: "two", time: "20:40" }]);
  assert.deepEqual(layout.map(({ event, visualStartMinutes }) => [event.id, visualStartMinutes]), [["one", 1230], ["two", 1290]]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/calendar.test.mjs`

Expected: FAIL with missing `formatBroadcastTime` or `stackEventsForDay` export.

- [ ] **Step 3: Write the minimal pure implementation**

```js
export function formatBroadcastTime(time) {
  const totalMinutes = timeToMinutes(time);
  const hour = Math.floor((totalMinutes % 1440) / 60);
  const minute = totalMinutes % 60;
  return (totalMinutes >= 1440 ? "次日 " : "") + String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

export function stackEventsForDay(events, blockDurationMinutes = 60) {
  let nextStartMinutes = -Infinity;
  return [...events].sort((left, right) => timeToMinutes(left.time) - timeToMinutes(right.time)).map((event) => {
    const visualStartMinutes = Math.max(timeToMinutes(event.time), nextStartMinutes);
    nextStartMinutes = visualStartMinutes + blockDurationMinutes;
    return { event, visualStartMinutes };
  });
}
```

Replace lane-based output with `stackEventsForDay`; retain `eventsForWeek` dates and raw source times unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/calendar.test.mjs`

Expected: PASS for every calendar test.

- [ ] **Step 5: Commit the pure scheduling behavior**

```bash
git add lib/calendar.js tests/calendar.test.mjs
git commit -m "feat: format overnight broadcast times"
```

### Task 2: Render full-width cover cards in the extended source-day columns

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: Write failing rendered-page expectations**

```js
assert.match(html, /次日 01:00/);
assert.match(html, /class="calendar-event-cover"/);
assert.match(html, /src="\/covers\/yuc\/transparent-night\.jpg"/);
assert.doesNotMatch(withoutReactMarkers(html), /25:00|27:00/);
assert.doesNotMatch(styles, /--event-lane|--event-lanes/);
```

- [ ] **Step 2: Run the rendered-page test to verify it fails**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: FAIL because timed cards have no cover markup or next-day labels.

- [ ] **Step 3: Render the confirmed C layout**

In `app/page.tsx`:

```tsx
const dayEvents = stackEventsForDay(events.filter((event) => event.date === date));
<img className="calendar-event-cover" src={event.coverUrl} alt="" loading="lazy" />
<span className="calendar-event-content">
  <span className="calendar-event-time">{formatBroadcastTime(event.time)}</span>
  <strong>{event.titleZh}</strong>
  <span className="calendar-event-episode">第 {event.episode} 集</span>
</span>
```

Compute visible hours from the current week's events. Format 24+ hour labels as `次日 HH:00`, keep the date header and selected detail date in the original YUC column, and reuse the cover card in the mobile agenda.

In `app/globals.css`: make `.calendar-event` a one-column full-width `grid-template-columns: 2.6rem 1fr` card, set a 3:4 `.calendar-event-cover`, give it a minimum height matching the 60-minute stack duration, and remove lane width/left calculations. Keep desktop horizontal scrolling and the existing mobile breakpoint.

- [ ] **Step 4: Run rendered verification**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: PASS with cover markup, `次日` labels, dialogs, navigation and responsive layout checks.

- [ ] **Step 5: Commit the visual redesign**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: show covers in extended time calendar"
```

### Task 3: Verify and publish the confirmed layout

**Files:**
- Verify: `tests/*.test.mjs`, `dist/`, `.openai/hosting.json`

- [ ] **Step 1: Run the complete suite and inspect the worktree**

Run: `npm test && git diff --check && git status -sb`

Expected: all tests pass, build completes, no whitespace errors, and `main` contains only the intended commits.

- [ ] **Step 2: Push `main` and publish the exact validated commit**

```bash
git push origin main
/Users/alex/.codex/plugins/cache/openai-bundled/sites/0.1.27/scripts/package-site.sh /Users/alex/Alex/anime-calendar /Users/alex/Alex/anime-calendar/.site-archives/cover-calendar.tar.gz
```

Obtain a fresh Sites source credential, push the same `HEAD` to the Sites source repository, save a version with the archive, deploy privately after confirming the one-user custom access policy, and poll until succeeded.

- [ ] **Step 3: Report the production URL and validation result**

Report the private Sites URL, the verified test count, and that the new schedule keeps YUC broadcast-day columns while displaying normal next-day clock labels.
