# 并排时间轴节目卡封面优先 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让桌面周时间轴中并排的紧凑节目卡优先显示固定比例封面，同时保留集数、详情按钮和已看方框。

**Architecture:** 不改动 `app/page.tsx` 已有的紧凑卡片判定或 `CoverArt` 标记。只替换 `app/globals.css` 中紧凑卡片的 CSS 覆盖规则，并由现有的源码契约测试锁定封面可见、标题隐藏与普通/移动卡片不受影响。

**Tech Stack:** Next.js 16、React 19、TypeScript、CSS、Node 内置测试运行器、ESLint。

---

## 文件结构

- `app/globals.css`：定义时间轴紧凑卡片的网格、封面和标题显示规则。
- `tests/rendered-html.test.mjs`：验证时间轴卡片的渲染标记和 CSS 源码契约。
- `app/page.tsx`：不改动；已根据 `layout.laneCount > 1` 产生 `.timeline-event-compact`，并已渲染封面、集数、详情无障碍标签和已看按钮。

### Task 1: 为封面优先紧凑卡片写失败的回归测试

**Files:**
- Modify: `tests/rendered-html.test.mjs:312-355, 720-739`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 让同一时段的渲染断言明确保留集数标记**

  在 `renders same-time events side by side on one timeline day` 中、现有封面断言之后加入：

  ```js
  assert.ok(
    sameTimeEvents.every(([, , card]) => /class="calendar-event-episode"/.test(card)),
  );
  ```

  这锁定紧凑卡片仍有可见集数的数据来源；详情按钮、封面精灵和 `.timeline-event-compact` 的既有断言保持原样。

- [ ] **Step 2: 将旧的紧凑卡片 CSS 断言替换为目标行为**

  在 `keeps navigation, dialog wiring, and responsive calendar layout durable` 中，删除要求单列网格和 `display: none` 的两段断言，改为：

  ```js
  assert.match(
    styles,
    /\.timeline-event-compact \.calendar-event-detail\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.85rem\) minmax\(0, 1fr\);/,
  );
  assert.match(
    styles,
    /\.timeline-event-compact \.calendar-event-cover\s*\{[\s\S]*?display:\s*block;/,
  );
  assert.match(
    styles,
    /\.timeline-event-compact \.calendar-event-detail strong\s*\{[\s\S]*?display:\s*none;/,
  );
  ```

- [ ] **Step 3: 运行定向测试，确认它在旧样式下失败**

  Run:

  ```bash
  npm run build && node --test --test-name-pattern "same-time events|keeps navigation" tests/rendered-html.test.mjs
  ```

  Expected: FAIL，失败信息指出紧凑卡片仍是单列网格、封面仍被 `display: none`，且未隐藏标题。

- [ ] **Step 4: 提交失败测试**

  ```bash
  git add tests/rendered-html.test.mjs
  git commit -m "test: require covers in compact timeline cards"
  ```

### Task 2: 以最小 CSS 改动实现封面优先布局

**Files:**
- Modify: `app/globals.css:1611-1617`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 恢复紧凑卡片的封面列并隐藏可见标题**

  用以下三条规则替换当前的 `.timeline-event-compact` 两条规则：

  ```css
  .timeline-event-compact .calendar-event-detail {
    grid-template-columns: minmax(0, 1.85rem) minmax(0, 1fr);
  }

  .timeline-event-compact .calendar-event-cover {
    display: block;
  }

  .timeline-event-compact .calendar-event-detail strong {
    display: none;
  }
  ```

  不改动普通 `.timeline-event` 的封面比例、`.calendar-event-content` 的右侧已看按钮预留、`.episode-watch-toggle`、`@media (max-width: 860px)` 或 `app/page.tsx`。

- [ ] **Step 2: 运行定向测试，确认通过**

  Run:

  ```bash
  npm run build && node --test --test-name-pattern "same-time events|keeps navigation" tests/rendered-html.test.mjs
  ```

  Expected: PASS；两个渲染测试均通过，证明同一时段卡片仍有封面与集数标记，CSS 已恢复封面列、显示封面并隐藏标题。

- [ ] **Step 3: 执行完整自动验证**

  Run:

  ```bash
  npm run lint -- --ignore-pattern .worktrees
  npm test
  git diff --check
  ```

  Expected: 三条命令均以退出码 `0` 结束；`npm test` 包含类型检查、vinext 构建和全部 Node 测试。

- [ ] **Step 4: 提交最小实现**

  ```bash
  git add app/globals.css
  git commit -m "style: prioritize covers in compact timeline cards"
  ```

### Task 3: 视觉与交互回归检查

**Files:**
- Modify: none
- Test: local browser preview

- [ ] **Step 1: 在本地启动预览并打开“播出表”的存在并排节目的周**

  Run:

  ```bash
  npm run dev
  ```

  在桌面宽度选择一个存在两张同一时段卡片的周（例如测试数据的 2026-07-06 21:30）。

- [ ] **Step 2: 验证桌面浅色与深色主题**

  在两种主题下确认：并排卡片左侧有彩色 3:4 封面、作品标题不显示、右侧仍显示“第 N 集”、右上角已看方框能独立切换；点击卡片仍打开详情弹窗并保留完整作品名。

- [ ] **Step 3: 验证范围没有扩张到移动端或单列卡片**

  将窗口调到 390px，确认单日选择器和移动议程仍显示原有封面、标题、集数与已看方框；回到桌面确认未并排的单列时间轴卡片仍显示标题。
