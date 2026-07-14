# 历史季度封面与追番保存修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 2026 年 1 月、4 月的 YUC 封面随站点发布到本地，并让个人追番页可兼容旧收藏、正常保存。

**Architecture:** 历史目录生成脚本继续从 YUC 读取名称、封面地址，再把每个封面下载到 `public/covers/yuc/`，并把生成数据中的 `coverUrl` 改为本地路径。收藏接口在读写数据库前统一剔除当前目录已不存在的旧 ID；页面仅修改标题文案。

**Tech Stack:** Next.js/Vinext、Node.js 原生 `fetch` 和文件系统、D1/Drizzle、Node test。

---

## File structure

- Modify: `scripts/generate-yuc-history-pilot.mjs` — 下载并命名历史封面，生成本地 URL。
- Modify: `data/yuc-history-2026.js` — 重新生成的 1 月、4 月目录，引用本地封面。
- Create: `public/covers/yuc/history-2026-01-*`、`public/covers/yuc/history-2026-04-*` — 130 个下载的 YUC 封面资源。
- Modify: `tests/anime-data.test.mjs` — 历史目录和资源均必须为本地封面。
- Modify: `lib/anime-selections.js` — 提供对旧的未知 ID 的过滤函数。
- Modify: `tests/anime-selections.test.mjs` — 覆盖有效收藏保留、过期收藏过滤。
- Modify: `app/api/anime-selections/route.ts` — 读取与保存均使用过滤后的收藏 ID。
- Modify: `tests/anime-selection-storage.test.mjs` — 固定接口使用兼容过滤的约束。
- Modify: `app/page.tsx` — 使用“本季度想追什么？”。
- Modify: `tests/rendered-html.test.mjs` — 固定个人追番页标题文案。

### Task 1: 历史封面生成测试

**Files:**
- Modify: `tests/anime-data.test.mjs:139-148, 189-221`

- [ ] **Step 1: 写入失败测试，要求历史目录使用本地封面且文件存在**

```js
assert.ok(historicalAnime.every(({ coverUrl }) => coverUrl.startsWith("/covers/yuc/history-2026-")));
await Promise.all(
  historicalAnime.map(({ coverUrl }) => access(new URL(`../public${coverUrl}`, import.meta.url))),
);
```

删除对 `https://` 封面和 `i.imgs.ovh` 外链的断言，因为这正是需要移除的行为。

- [ ] **Step 2: 运行测试，确认当前实现失败**

Run: `node --test tests/anime-data.test.mjs`

Expected: FAIL，历史 `coverUrl` 仍以 `https://` 开头。

### Task 2: 下载并生成本地历史封面

**Files:**
- Modify: `scripts/generate-yuc-history-pilot.mjs:1-3, 131-180`
- Modify: `data/yuc-history-2026.js`
- Create: `public/covers/yuc/history-2026-01-*`, `public/covers/yuc/history-2026-04-*`

- [ ] **Step 1: 为生成脚本加入最小的本地下载逻辑**

```js
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function coverExtension(response, sourceUrl) {
  const mime = response.headers.get("content-type")?.split(";")[0];
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/jpeg") return ".jpg";
  const extension = path.extname(new URL(sourceUrl).pathname);
  return extension || ".jpg";
}

async function downloadCover({ month }, index, sourceUrl) {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`YUC cover request failed: ${sourceUrl}`);
  const filename = `history-2026-${month}-${String(index + 1).padStart(2, "0")}${coverExtension(response, sourceUrl)}`;
  await mkdir(new URL("../public/covers/yuc/", import.meta.url), { recursive: true });
  await writeFile(new URL(`../public/covers/yuc/${filename}`, import.meta.url), Buffer.from(await response.arrayBuffer()));
  return `/covers/yuc/${filename}`;
}
```

在 `generateSeason` 中逐项调用 `downloadCover(config, index, record.coverUrl)`，并用返回值替换该记录的 `coverUrl`，随后输出数据文件。保留 `parseCards` 和 `enrichYucRecord` 的外链输入，避免混淆抓取来源和最终站点资源。

- [ ] **Step 2: 重新生成数据和静态封面**

Run: `npm run generate:yuc-history-pilot`

Expected: 输出 `1月 60 部…；4月 70 部…`，并新增 130 个 `history-2026-*` 文件；生成数据中的历史 `coverUrl` 全为 `/covers/yuc/history-2026-*`。

- [ ] **Step 3: 运行历史目录测试，确认通过**

Run: `node --test tests/anime-data.test.mjs`

Expected: PASS。

- [ ] **Step 4: 提交本地封面与生成脚本**

```bash
git add scripts/generate-yuc-history-pilot.mjs data/yuc-history-2026.js public/covers/yuc/history-2026-* tests/anime-data.test.mjs
git commit -m "fix: ship historical YUC covers locally"
```

### Task 3: 收藏兼容测试与接口修复

**Files:**
- Modify: `lib/anime-selections.js`
- Modify: `tests/anime-selections.test.mjs`
- Modify: `app/api/anime-selections/route.ts:5, 24-25, 37-41`
- Modify: `tests/anime-selection-storage.test.mjs`

- [ ] **Step 1: 写入失败测试，描述有效收藏和过期收藏的分离**

```js
import { filterKnownAnimeIds, validateAnimeIds } from "../lib/anime-selections.js";

test("filters stale stored IDs while preserving valid selections", () => {
  assert.deepEqual(
    filterKnownAnimeIds(["sayonara-lara", "removed-anime", "sayonara-lara"], validIds),
    ["sayonara-lara"],
  );
});
```

同时让接口源码测试要求 `filterKnownAnimeIds` 用于 GET 返回行和 PUT 请求体。

- [ ] **Step 2: 运行测试，确认当前实现失败**

Run: `node --test tests/anime-selections.test.mjs tests/anime-selection-storage.test.mjs`

Expected: FAIL，`filterKnownAnimeIds` 尚未导出，接口尚未调用它。

- [ ] **Step 3: 实现最小的过滤函数与接口接入**

```js
export function filterKnownAnimeIds(value, validAnimeIds) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) {
    throw new TypeError("animeIds must be an array of strings");
  }
  return [...new Set(value)].filter((id) => validAnimeIds.has(id));
}
```

在 GET 中返回 `filterKnownAnimeIds(rows.map(({ animeId }) => animeId), validAnimeIds)`；在 PUT 中先调用同一函数，再把结果传入现有 `validateAnimeIds`。这会保留当前目录中仍存在的收藏，静默移除已不可见的旧 ID，同时维持数组格式校验。

- [ ] **Step 4: 运行收藏测试，确认通过**

Run: `node --test tests/anime-selections.test.mjs tests/anime-selection-storage.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交收藏兼容修复**

```bash
git add lib/anime-selections.js tests/anime-selections.test.mjs app/api/anime-selections/route.ts tests/anime-selection-storage.test.mjs
git commit -m "fix: ignore stale anime selections"
```

### Task 4: 个人页标题与全量验证

**Files:**
- Modify: `app/page.tsx:381`
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 写入失败测试，固定季度标题**

```js
assert.match(page, /本季度想追什么？/);
assert.doesNotMatch(page, /本月番想追什么？/);
```

- [ ] **Step 2: 运行测试，确认当前实现失败**

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL，当前源码仍包含“本月番想追什么？”。

- [ ] **Step 3: 替换唯一的标题字符串**

```tsx
<span className="anime-selection-title" id="anime-selection-heading">
  本季度想追什么？
</span>
```

- [ ] **Step 4: 运行标题测试，确认通过**

Run: `node --test tests/rendered-html.test.mjs`

Expected: PASS。

- [ ] **Step 5: 执行全量验证**

Run: `npm test && npm run lint && npm run build`

Expected: 测试和构建通过；lint 只允许已存在的图片元素规则提示，不新增错误。

- [ ] **Step 6: 提交标题与测试**

```bash
git add app/page.tsx tests/rendered-html.test.mjs
git commit -m "fix: describe seasonal anime selections"
```
