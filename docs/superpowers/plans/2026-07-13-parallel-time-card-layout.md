# 并列时间卡片周历 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 将周历改为按同一播出时间分组的并列封面卡片，并使用加宽的左侧时间栏。

**Architecture:** lib/calendar.js 增加纯函数，把同日事件按原始 YUC 时刻分组且不改变原始日期。app/page.tsx 使用这些组替代连续时间轴；每个组渲染一个加宽时间栏和并列节目卡。CSS 负责组内网格、封面和移动端两列换行。

**Tech Stack:** Next-compatible React、TypeScript、CSS、Node test、vinext / Sites。

---

## File structure

- lib/calendar.js：同日事件按原始时刻排序分组。
- tests/calendar.test.mjs：验证同一时刻归入同组、次日显示标签仍保持原始日期。
- app/page.tsx：渲染时间组、加宽时间栏和并列卡。
- app/globals.css：桌面时间组布局与移动端组内两列布局。
- tests/rendered-html.test.mjs：验证时间组、并列卡、本地封面和移除连续轴。

### Task 1: Group same-time events without changing source dates

**Files:**
- Modify: lib/calendar.js
- Modify: tests/calendar.test.mjs

- [ ] **Step 1: Write failing tests for exact-time groups**

    test("groups same-time events while keeping source dates and overnight labels", () => {
      const grouped = groupEventsByTime([
        { ...weeklyShow, id: "a", date: "2026-07-05", time: "25:00" },
        { ...weeklyShow, id: "b", date: "2026-07-05", time: "25:00" },
        { ...weeklyShow, id: "c", date: "2026-07-05", time: "25:30" },
      ]);

      assert.deepEqual(
        grouped.map(({ time, events }) => [formatBroadcastTime(time), events.map(({ id }) => id)]),
        [["次日 01:00", ["a", "b"]], ["次日 01:30", ["c"]]],
      );
    });

- [ ] **Step 2: Run the focused test and verify it fails**

Run: node --test tests/calendar.test.mjs

Expected: FAIL because groupEventsByTime is not exported.

- [ ] **Step 3: Add the minimal grouping helper**

    export function groupEventsByTime(events) {
      const groups = new Map();
      const sorted = [...events].sort(
        (left, right) => timeToMinutes(left.time) - timeToMinutes(right.time),
      );

      for (const event of sorted) {
        const group = groups.get(event.time) ?? { time: event.time, events: [] };
        group.events.push(event);
        groups.set(event.time, group);
      }

      return [...groups.values()];
    }

Do not change eventsForWeek, formatBroadcastTime, or the event date field.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: node --test tests/calendar.test.mjs

Expected: PASS for every calendar test.

- [ ] **Step 5: Commit the grouping helper**

    git add lib/calendar.js tests/calendar.test.mjs
    git commit -m "feat: group same-time broadcasts"

### Task 2: Render the approved wide-time parallel-card layout

**Files:**
- Modify: app/page.tsx
- Modify: app/globals.css
- Modify: tests/rendered-html.test.mjs

- [ ] **Step 1: Write failing rendered-page expectations**

    assert.match(html, /class="time-groups"/);
    assert.match(html, /class="time-group"/);
    assert.match(html, /class="time-group-label">20:30/);
    assert.match(html, /class="time-group-events"/);
    assert.match(html, /src="\/covers\/yuc\/transparent-night\.jpg"/);
    assert.doesNotMatch(html, /class="time-axis"|--timeline-hours|--event-start/);

- [ ] **Step 2: Run the rendered-page test and verify it fails**

Run: npm run build && node --test tests/rendered-html.test.mjs

Expected: FAIL because the current page still has a continuous time axis and absolutely positioned cards.

- [ ] **Step 3: Replace the continuous time axis with source-time groups**

In app/page.tsx, replace the timeline variables and timeline markup with:

    const dayEventGroups = dates.map((date) =>
      groupEventsByTime(events.filter((event) => event.date === date)),
    );

    <div className="time-groups">
      {dayEventGroups[index].map(({ time, events: groupedEvents }) => (
        <section className="time-group" key={time}>
          <time className="time-group-label">{formatBroadcastTime(time)}</time>
          <div
            className="time-group-events"
            style={{ "--same-time-count": groupedEvents.length } as CSSProperties}
          >
            {groupedEvents.map((event) => eventButton(event))}
          </div>
        </section>
      ))}
    </div>

Keep every event in the source date column. Keep the current cover image, formatted time in the event button aria-label, dialog behavior, weekly navigation, network cards, and mobile day picker.

In app/globals.css, delete the continuous axis, timeline height, and absolute event positioning rules. Add:

    .time-group { display: grid; grid-template-columns: 4.5rem minmax(0, 1fr); }
    .time-group-label { display: grid; place-items: center; min-height: 4.5rem; }
    .time-group-events {
      display: grid;
      grid-template-columns: repeat(var(--same-time-count), minmax(0, 1fr));
      gap: 0.35rem;
      padding: 0.35rem;
    }
    .calendar-event { position: static; grid-template-columns: 2.35rem minmax(0, 1fr); }

At the mobile breakpoint, retain one-day agenda and set the group event grid to repeat(2, minmax(0, 1fr)), so more than two same-time cards wrap to the next row.

- [ ] **Step 4: Run rendered-page verification**

Run: npm run build && node --test tests/rendered-html.test.mjs

Expected: PASS with time groups, wide time labels, parallel local-cover cards, dialog checks and no continuous-axis selectors.

- [ ] **Step 5: Commit the visual change**

    git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
    git commit -m "feat: show parallel time card groups"

### Task 3: Verify and publish the approved layout

**Files:**
- Verify: tests/*.test.mjs, dist/, .openai/hosting.json

- [ ] **Step 1: Run full validation**

Run: npm test && git diff --check && git status -sb

Expected: all tests pass, build completes, no whitespace errors, and main contains only intended commits.

- [ ] **Step 2: Push and publish the exact validated commit**

    git push origin main
    /Users/alex/.codex/plugins/cache/openai-bundled/sites/0.1.27/scripts/package-site.sh /Users/alex/Alex/anime-calendar /Users/alex/Alex/anime-calendar/.site-archives/parallel-time-cards.tar.gz

Obtain a fresh Sites source credential, push the same HEAD to the Sites source repository, save a version with the archive, confirm the custom one-user access policy, deploy privately, and poll until succeeded.

- [ ] **Step 3: Report result**

Report the private site URL, test result, and that same-time titles now appear in parallel beside a wider time label.
