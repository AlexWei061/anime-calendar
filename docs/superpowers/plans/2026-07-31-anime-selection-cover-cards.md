# 选择番剧封面卡 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“我的番剧”的选择列表以追番统计同款封面卡展示完整 3:4 封面、中文名和日文名，同时保持原有选择与保存行为。

**Architecture:** 选择项仍是唯一可操作的 `label` 加复选框；在复选框后复用现有 `CoverArt` 与追番统计卡已有的封面和文本 class。CSS 只将选择项改为三列网格并使列表列宽与统计卡一致，因此不会影响 API、状态、认证、详情弹窗或移动端单列断点。

**Tech Stack:** Next.js 16、React 19、TypeScript、CSS、Node 内置测试运行器、ESLint。

---

## 文件结构

- `app/page.tsx`：在选择项的原有复选框后输出本地封面以及中日标题。
- `app/globals.css`：将选择列表和单项布局改为统计卡式三列网格；复用已有统计卡封面与文本样式。
- `tests/rendered-html.test.mjs`：验证选择项的标记结构和响应式布局契约。

### Task 1: 写出封面选择项的失败回归测试

**Files:**
- Modify: `tests/rendered-html.test.mjs:461-468, 681-682`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 将旧的纯中文标题断言替换为封面卡结构断言**

  在 `keeps navigation, dialog wiring, and responsive calendar layout durable` 中，删除：

  ```js
  assert.match(page, /<span title=\{record\.titleZh\}>\{record\.titleZh\}<\/span>/);
  ```

  并加入：

  ```js
  assert.match(
    page,
    /<label className="anime-selection" key=\{record\.id\}>[\s\S]*?<input[\s\S]*?type="checkbox"[\s\S]*?<CoverArt anime=\{record\} className="statistics-anime-card-cover" decorative \/>[\s\S]*?<span className="statistics-anime-card-content">[\s\S]*?<strong title=\{record\.titleZh\}>\{record\.titleZh\}<\/strong>[\s\S]*?<small title=\{record\.titleJa\}>\{record\.titleJa\}<\/small>/,
  );
  assert.match(
    styles,
    /\.anime-selection-list\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit, minmax\(15rem, 1fr\)\);/,
  );
  assert.match(
    styles,
    /\.anime-selection\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*1rem 3rem minmax\(0, 1fr\);/,
  );
  ```

  该断言同时证明原有复选框仍在、`CoverArt` 是装饰性封面，并且中日标题都由现有数据字段渲染。

- [ ] **Step 2: 运行定向测试，确认它在旧实现下失败**

  Run:

  ```bash
  node --test --test-name-pattern "keeps navigation" tests/rendered-html.test.mjs
  ```

  Expected: FAIL；失败原因是选择项尚未输出 `CoverArt` 和统计卡标题结构，且 CSS 仍是 `14rem` 的 `flex` 布局，不是测试装载或语法错误。

- [ ] **Step 3: 提交失败测试**

  ```bash
  git add tests/rendered-html.test.mjs
  git commit -m "test: cover anime selection cards"
  ```

### Task 2: 以最小标记与样式复用实现封面卡

**Files:**
- Modify: `app/page.tsx:1525-1533`
- Modify: `app/globals.css:1071-1110`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 在原有复选框后输出统计卡同款封面与双标题**

  在 `app/page.tsx` 的每个 `label.anime-selection` 内，保留既有 `<input>`（包括 `checked`、`disabled` 和 `onChange`）原样，并把原有单一标题 `<span>` 替换为：

  ```tsx
  <CoverArt anime={record} className="statistics-anime-card-cover" decorative />
  <span className="statistics-anime-card-content">
    <strong title={record.titleZh}>{record.titleZh}</strong>
    <small title={record.titleJa}>{record.titleJa}</small>
  </span>
  ```

  不改变 `label`、`key`、`toggleAnimeSelection`、`selectedAnimeIds` 或保存 API 的代码。

- [ ] **Step 2: 仅把选择项改成与统计卡尺寸相符的三列网格**

  在 `app/globals.css` 修改既有规则为：

  ```css
  .anime-selection-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.5rem;
  }

  .anime-selection {
    display: grid;
    grid-template-columns: 1rem 3rem minmax(0, 1fr);
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    padding: 0.55rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-control);
    background: var(--card);
    cursor: pointer;
    transition: border-color var(--transition), background var(--transition);
  }
  ```

  保留 `.anime-selection:has(input:checked)`、`.anime-selection input`、文本省略规则及 `@media (max-width: 860px)` 中的单列网格；不要新增封面资源、颜色 token、状态或 API。

- [ ] **Step 3: 运行定向测试，确认通过**

  Run:

  ```bash
  node --test --test-name-pattern "keeps navigation" tests/rendered-html.test.mjs
  ```

  Expected: PASS；测试证明选择项保留复选框并输出本地封面与双标题，桌面列宽与卡片布局符合契约。

- [ ] **Step 4: 执行完整自动验证**

  Run:

  ```bash
  npm run lint -- --ignore-pattern .worktrees
  npm test
  git diff --check
  ```

  Expected: 三条命令均以退出码 `0` 结束；`npm test` 包含严格 TypeScript 检查、vinext 构建及全部 Node 测试。

- [ ] **Step 5: 提交最小实现**

  ```bash
  git add app/page.tsx app/globals.css
  git commit -m "feat: show covers in anime selection"
  ```

### Task 3: 视觉与交互回归检查

**Files:**
- Modify: none
- Test: local browser preview

- [ ] **Step 1: 打开“我的番剧”的选择面板**

  Run:

  ```bash
  npm run dev
  ```

  在 `http://127.0.0.1:3000/?page=mine` 展开“选择番剧”。

- [ ] **Step 2: 验证桌面与移动布局以及选择行为**

  在桌面确认每个选择项显示完整比例的彩色封面、中文名与日文名，复选框仍能选中／取消选中，并保留粉色选中边框。将视口缩至 `860px` 或以下，确认列表仍为单列、内容不横向溢出、复选框仍可操作。

- [ ] **Step 3: 验证浅色与深色主题均未退化**

  切换浅色和深色主题，确认封面、标题、未选中边框和选中背景都可辨认；不应出现硬编码颜色或封面灰度化。
