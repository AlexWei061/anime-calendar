# Re:Zero 第四期 P1 集数修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 2026 年 4 月番的 Re:Zero 第四期只生成 P1 的 11 集，并保持 Part.2 的 8 集独立排期。

**Architecture:** 历史目录生成器继续以 AniList 为首播日期、时间和默认集数来源；对 YUC 明确标注 P1 集数的已知条目，在生成器内按 AniList ID 覆盖集数。生成后的历史目录由脚本更新，日历继续仅从数据文件读取集数。

**Tech Stack:** Node.js ESM、node:test、现有 YUC 历史目录生成脚本。

---

## 文件结构

- `scripts/generate-yuc-history-pilot.mjs`：定义 P1 集数覆盖并在匹配到 AniList 记录后使用它。
- `tests/anime-data.test.mjs`：验证生成器覆盖以及已发布的 P1/Part.2 集数。
- `data/yuc-history-2026.js`：由生成器重新生成的 2026 年 1 月与 4 月历史目录。

### Task 1: 写入并观察回归测试失败

**Files:**
- Modify: `tests/anime-data.test.mjs`

- [ ] **Step 1: 在生成器测试旁添加 P1 覆盖测试**

```js
test("uses YUC's Re:Zero P1 episode count instead of the AniList total", () => {
  const card = {
    titleZh: "Re:从零开始的异世界生活 第4期",
    titleJa: "Re:ゼロから始める異世界生活 4th season",
    coverUrl: "https://example.test/rezero.jpg",
  };
  const matched = {
    id: "anilist-189046",
    episodeCount: 19,
    episodeCountStatus: "exact",
    premiereDateBeijing: "2026-04-08",
    scheduleWeekday: "Wed",
    beijingTime: "21:00",
    timeStatus: "exact",
    station: "AniList 首集排期（试点）",
  };

  assert.equal(enrichYucRecord(card, 48, "https://yuc.wiki/202604/", matched).episodeCount, 11);
});
```

- [ ] **Step 2: 添加已发布数据的 P1/Part.2 回归测试**

```js
test("keeps Re:Zero P1 and Part.2 as separate schedules", () => {
  const aprilReZero = seasons
    .find(({ id }) => id === "2026-april")
    ?.anime.find(({ id }) => id === "anilist-189046");
  const partTwo = anime.find(({ id }) => id === "rezero-4-part-2");

  assert.equal(aprilReZero?.episodeCount, 11);
  assert.equal(partTwo?.episodeCount, 8);
  assert.equal(partTwo?.premiereDateBeijing, "2026-08-12");
});
```

- [ ] **Step 3: 运行测试，确认因当前 19 集数据失败**

Run: `node --test tests/anime-data.test.mjs`

Expected: FAIL，第一条新测试的实际值为 `19` 而不是 `11`；已发布数据测试也报告 4 月记录为 `19`。

### Task 2: 在生成器中实现最小集数覆盖

**Files:**
- Modify: `scripts/generate-yuc-history-pilot.mjs`
- Modify: `data/yuc-history-2026.js` (generated)

- [ ] **Step 1: 在 `aniListIndex` 后定义不可变的覆盖表**

```js
const EPISODE_COUNT_OVERRIDES = Object.freeze({ 189046: 11 });
```

- [ ] **Step 2: 在 `enrichYucRecord` 的匹配分支中使用覆盖值**

```js
const anilistId = Number(matched.id.replace("anilist-", ""));
const episodeCount = EPISODE_COUNT_OVERRIDES[anilistId] ?? matched.episodeCount;
return {
  id: matched.id,
  anilistId,
  episodeCount,
  episodeCountStatus: matched.episodeCountStatus,
  // existing fields unchanged
};
```

- [ ] **Step 3: 重新生成历史目录**

Run: `npm run generate:yuc-history-pilot`

Expected: 命令成功并更新 `data/yuc-history-2026.js`；`anilist-189046` 的 `episodeCount` 为 `11`，其余条目和本地封面路径由现有生成器保持。

- [ ] **Step 4: 运行目标测试，确认转绿**

Run: `node --test tests/anime-data.test.mjs`

Expected: PASS，包含新的 P1 覆盖与 P1/Part.2 分离测试。

### Task 3: 完整验证并提交

**Files:**
- Modify: `scripts/generate-yuc-history-pilot.mjs`
- Modify: `tests/anime-data.test.mjs`
- Modify: `data/yuc-history-2026.js`

- [ ] **Step 1: 运行完整验证**

Run: `npm test && npm run lint -- --ignore-pattern .worktrees`

Expected: 构建成功，全部 node:test 通过；lint 为 0 errors（现有 `<img>` 优化警告可保留）。

- [ ] **Step 2: 检查变更范围**

Run: `git diff --check && git diff -- scripts/generate-yuc-history-pilot.mjs tests/anime-data.test.mjs data/yuc-history-2026.js`

Expected: 只有 P1 覆盖、两个回归断言及对应的重新生成数据；不包含 `AGENTS.md`。

- [ ] **Step 3: 提交实现**

```bash
git add scripts/generate-yuc-history-pilot.mjs tests/anime-data.test.mjs data/yuc-history-2026.js
git commit -m "fix: split Re:Zero fourth season episodes"
```
