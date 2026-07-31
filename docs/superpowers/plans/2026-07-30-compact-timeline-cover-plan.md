# 并排时间轴节目卡封面与标题优先 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让桌面周时间轴中并排的紧凑节目卡显示固定比例封面和单行中文番名，隐藏集数，并恢复原生完整番名悬停提示。

**Architecture:** `app/page.tsx` 已在标题 `<strong>` 上提供 `title={event.titleZh}`，且紧凑 class 只用于多列时间轴卡。实现只把紧凑 CSS 从“隐藏标题”改为“隐藏集数”；标题自然继承普通 `.timeline-event` 的单行省略样式与原生 `title` 提示，不新增组件或状态。

**Tech Stack:** Next.js 16、React 19、TypeScript、CSS、Node 内置测试运行器、ESLint。

---

## 文件结构

- `app/globals.css`：定义紧凑时间轴卡是否显示标题或集数的 CSS 覆盖。
- `tests/rendered-html.test.mjs`：验证同一时段卡的标题/集数渲染标记与紧凑 CSS 契约。
- `app/page.tsx`：不改动；它已产生 `.timeline-event-compact`、输出封面、带标题属性的 `<strong>`、集数、详情无障碍标签和已看按钮。

### Task 1: 为标题优先行为写失败的回归测试

**Files:**
- Modify: `tests/rendered-html.test.mjs:312-355, 723-750`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 让同一时段卡断言标题元素仍带完整名称提示**

  在 `renders same-time events side by side on one timeline day` 中、现有封面与集数 class token 断言之后加入：

  ```js
  assert.ok(
    sameTimeEvents.every(([, , card]) =>
      /<strong\b(?=[^>]*title="[^"]+")[^>]*>[^<]+<\/strong>/.test(card),
    ),
  );
  ```

  这验证每张并排卡继续输出可见标题节点和完整中文名的原生提示属性；保留现有 episode class 断言，因为集数仍供详情无障碍标签和非紧凑卡使用。

- [ ] **Step 2: 把紧凑 CSS 契约改成“标题不隐藏、集数隐藏”**

  在 `keeps navigation, dialog wiring, and responsive calendar layout durable` 中，把当前紧凑标题 `display: none` 的断言替换为：

  ```js
  assert.doesNotMatch(
    styles,
    /\.timeline-event-compact \.calendar-event-detail strong\s*\{[^}]*display:\s*none;/,
  );
  assert.match(
    styles,
    /\.timeline-event-compact \.calendar-event-episode\s*\{[^}]*display:\s*none;/,
  );
  ```

  保留普通 `.timeline-event .calendar-event-detail strong` 的单行省略契约、普通 `.timeline-event .calendar-event-episode` 的省略契约，以及紧凑卡不覆盖封面/网格的断言。

- [ ] **Step 3: 运行定向测试，确认它在旧样式下失败**

  Run:

  ```bash
  npm run build && node --test --test-name-pattern "same-time events|keeps navigation" tests/rendered-html.test.mjs
  ```

  Expected: FAIL；失败原因是现有紧凑规则仍隐藏 `strong`，且还没有隐藏 `.calendar-event-episode`，不是测试语法或渲染错误。

- [ ] **Step 4: 提交失败测试**

  ```bash
  git add tests/rendered-html.test.mjs
  git commit -m "test: prioritize titles in compact timeline cards"
  ```

### Task 2: 以最小 CSS 调换紧凑卡的文字优先级

**Files:**
- Modify: `app/globals.css:1611-1613`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 删除标题隐藏规则并仅隐藏紧凑卡集数**

  用以下规则替换当前紧凑标题隐藏规则：

  ```css
  .timeline-event-compact .calendar-event-episode {
    display: none;
  }
  ```

  不修改 `.timeline-event .calendar-event-detail strong`、`<strong title={event.titleZh}>`、封面/网格规则、`.episode-watch-toggle`、`@media (max-width: 860px)` 或 `app/page.tsx`。

- [ ] **Step 2: 运行定向测试，确认通过**

  Run:

  ```bash
  npm run build && node --test --test-name-pattern "same-time events|keeps navigation" tests/rendered-html.test.mjs
  ```

  Expected: PASS；两条测试通过，证明并排卡仍有封面、标题和完整名称提示属性，CSS 不再隐藏标题且仅隐藏紧凑集数。

- [ ] **Step 3: 执行完整自动验证**

  Run:

  ```bash
  npm run lint -- --ignore-pattern .worktrees
  npm test
  git diff --check
  ```

  Expected: 三条命令均以退出码 `0` 结束；`npm test` 包含严格类型检查、vinext 构建和全部 Node 测试。

- [ ] **Step 4: 提交最小实现**

  ```bash
  git add app/globals.css
  git commit -m "style: show titles in compact timeline cards"
  ```

### Task 3: 视觉与交互回归检查

**Files:**
- Modify: none
- Test: local browser preview

- [ ] **Step 1: 在本地打开存在并排节目的桌面周**

  Run:

  ```bash
  npm run dev
  ```

  在桌面宽度选择存在两张同一时段节目卡的周；测试数据中的 2026-07-06 21:30 可作为稳定检查点。

- [ ] **Step 2: 验证浅色与深色的并排卡与详情**

  在两种主题下确认：每张并排卡有彩色 3:4 封面和一行中文番名，不显示“第 N 集”，右上角已看框可见；鼠标停留在截断番名上时出现浏览器原生的完整中文名提示。点击卡片仍打开详情弹窗并显示完整中日标题，关闭后焦点返回原卡。

- [ ] **Step 3: 验证单列和移动端没有受影响**

  在桌面确认未并排的单列时间轴卡仍同时显示标题与集数；在 390px 宽度确认移动日选择器与议程继续显示封面、标题、集数和已看方框，且无横向溢出。
