# README 与开发约定同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 README 面向项目使用者、AGENTS 面向开发者，并使两者准确反映当前的 2026 年跨季度番剧日历。

**Architecture:** README 取代 vinext 默认模板，只保留本项目的功能、数据口径与常用命令。AGENTS 保留现有的编码原则和模块结构，只修正随功能演进失真的约定；不触碰运行时代码或数据。

**Tech Stack:** Markdown、npm scripts、Git diff 检查。

---

### Task 1: 用项目说明替换 README 默认模板

**Files:**
- Modify: `README.md`
- Modify: `tests/rendered-html.test.mjs`

- [x] **Step 1: 将 README 改为以下项目结构与内容**

```markdown
# 2026 番剧日历

一个按北京时间展示 2026 年 1 月、4 月和 7 月新番的中文播出日历。

## 功能

- 桌面端按周显示时间轴；手机端按天显示日程。
- 可用“上一周／下一周”连续跨季度查看仍在播出的作品；右上角季度选择器只负责跳到所选季度的首周。
- 0:00–4:59 的节目显示在前一天栏目的“次日”时段。
- 时间轴按当前周最早和最晚的定时节目自动裁去上下空白；没有定时节目时显示 05:00 至次日 05:00。
- 登录 ChatGPT 后可在“我的番剧”保存追番列表，并在周历中只查看已选择作品。

## 数据与封面

- 7 月番的中文名、封面与播出排期来自 YUC。
- 1 月、4 月番使用 YUC 的中文名和本地保存的封面；首播日期、每周播出时间和集数来自 AniList 的历史资料。
- 所有日历封面均保存在 `public/covers/yuc/`，页面运行时不依赖第三方图片链接。
- 季度与统一作品目录入口在 `data/anime.js`；1 月、4 月的生成结果在 `data/yuc-history-2026.js`，由 `scripts/generate-yuc-history-pilot.mjs` 更新。

## 本地运行

```bash
npm install
npm run dev
```

需要 Node.js `>=22.13.0`。

## 验证与数据更新

```bash
npm run build
npm test
npm run lint -- --ignore-pattern .worktrees
npm run generate:anilist-pilot
npm run generate:yuc-history-pilot
```

最后两条命令用于重新生成 2026 年 1 月、4 月的历史资料；生成后应检查数据与封面变更，再运行测试。
```

- [x] **Step 2: 检查 README 没有遗留默认模板内容**

Run: `rg -n "vinext-starter|Included Shape|Workspace Auth Headers|Optional Dispatch-Owned" README.md`

Expected: 无输出。

- [x] **Step 3: 检查 Markdown 差异没有空白错误**

Run: `git diff --check -- README.md`

Expected: 退出状态为 0，且无输出。

- [x] **Step 4: 同步 README 内容断言**

将 `tests/rendered-html.test.mjs` 中遗留的英文模板句子断言改为：
`- \`npm test\`：构建应用并验证日历数据、集数排期和渲染后的时间表。`。
先运行该命名测试，确认 README 缺少这句时失败；在 README 的“验证与数据更新”段落
补上同一句，再重新运行测试确认通过。

### Task 2: 同步 AGENTS 的项目事实与开发边界

**Files:**
- Modify: `AGENTS.md`

- [x] **Step 1: 更新项目定位与模块地图**

将“2026 夏番”改为“2026 年 1 月、4 月与 7 月番”；在模块地图中把
`data/anime.js` 描述为季度入口和统一作品目录，新增
`data/yuc-history-2026.js`、`data/anilist-2026.js`、
`scripts/generate-yuc-history-pilot.mjs` 与
`scripts/generate-anilist-pilot.mjs` 的职责说明。把封面目录说明改为
`public/covers/yuc/` 下的 7 月与 `history-2026-*` 本地封面。

- [x] **Step 2: 更新番剧数据规则**

保留稳定全局 ID、目录数量、首播连播集数与测试更新要求；将资料来源拆为：
7 月番直接使用 YUC 北京时间排期，1 月／4 月番使用 YUC 中文名和封面、AniList
历史首播日期／周播时间／集数。注明 `data/yuc-history-2026.js` 为生成结果，
不得手工编辑；封面路径可为 `history-2026-*` 文件名且扩展名以实际资源为准。

- [x] **Step 3: 更新前端交互约定**

将桌面时间轴改为“以当周事件动态裁切；最早节目向下取整到整点，最晚节目加卡片
高度后向上取整；空周显示 05:00 至次日 05:00”。说明播出表周历使用全部已收录
作品、我的番剧周历使用全部已收藏作品；季度选择器只跳转到季度首周，网络放送列表
仍按当前选择季度过滤。将“全部夏番”替换为“播出表”。

- [x] **Step 4: 修正验证命令与未追踪文件说明**

在命令块和验证规则中使用
`npm run lint -- --ignore-pattern .worktrees`，以免扫描嵌套 worktree 的生成文件。
补充：若本文件用于仓库级约定，必须在内容定稿后纳入版本控制，避免新 worktree
没有这些规则。

- [x] **Step 5: 检查过期术语已移除**

Run: `rg -n "2026 夏番|全部夏番|15:00 至次日 04:00|/covers/yuc/<id>\\.jpg" AGENTS.md`

Expected: 无输出。

### Task 3: 交叉核对并进行轻量验证

**Files:**
- Verify: `README.md`
- Verify: `AGENTS.md`

- [x] **Step 1: 核对资料来源、时间轴与跨季度规则在两份文档中一致**

Run: `rg -n "YUC|AniList|05:00|跨季度|.worktrees" README.md AGENTS.md`

Expected: README 与 AGENTS 都明确资料来源；AGENTS 明确 05:00 至次日 05:00
回退范围、跨季度周历和 `.worktrees` lint 忽略规则。

- [x] **Step 2: 检查文档差异格式**

Run: `git diff --check -- README.md && output=$(git diff --check --no-index /dev/null AGENTS.md 2>&1); exit_code=$?; [ -z "$output" ] && [ "$exit_code" -eq 1 ]`

Expected: README 的检查退出状态为 0；未跟踪 AGENTS 的检查没有输出，且因文件与 `/dev/null` 不同而返回状态 1。

- [x] **Step 3: 运行与文档命令相同的 lint 验证**

Run: `npm run lint -- --ignore-pattern .worktrees`

Expected: 退出状态为 0；现有的 `<img>` 建议警告可以保留，但不得有 lint error。
