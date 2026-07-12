# 2026 夏番 63 部目录与封面卡片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将站点扩展为 ORICON 2026 夏番 63 部静态目录，所有条目显示简体中文名、日文原名与封面，同时只把可可靠换算的 7 月 TV 首播放入北京时间周历。

**Architecture:** `data/anime.js` 继续是唯一的静态数据源，但每条作品记录增加中文名与封面字段，并将 ORICON 当前 63 条目冻结为 2026-07-12 快照。`lib/schedule.js` 只负责把有精确时间且在 7 月的作品分到周历；其他季表条目进入独立区域。页面复用同一种封面卡片表达三类条目，并保持原有原生 `dialog` 的无障碍行为。

**Tech Stack:** Vinext、React 19、TypeScript、Node test、静态 ORICON 数据快照、站内 PNG 与外部官方/ORICON 主视觉 URL。

---

## 文件结构

- `data/anime.js`：63 条静态作品快照、季表元数据、中文名和封面 URL。
- `lib/schedule.js`：北京时间换算及“7 月周历 / 本季非 7 月首播 / 时间待确认”的分组。
- `public/covers/yume-mita.png`：用户提供的《梦限大 μ!》封面。
- `app/page.tsx`：中文名优先的封面卡片、三类条目区域及详情弹窗。
- `app/globals.css`：封面比例、卡片密度、图片回退与移动端样式。
- `tests/anime-data.test.mjs`：63 条快照及字段/本地封面约束。
- `tests/schedule.test.mjs`：7 月限定分组和非 7 月首播分组。
- `tests/rendered-html.test.mjs`：卡片图片、中文/日文名称、63 部总数和分区的服务端渲染约束。

### Task 1: 固化 63 部季表快照与中文/封面字段

**Files:**
- Modify: `data/anime.js`
- Modify: `tests/anime-data.test.mjs`
- Create: `public/covers/yume-mita.png`

- [ ] **Step 1: 写出失败的数据完整性测试**

将 `tests/anime-data.test.mjs` 改为以下数据合同；先保留现有 44 条数据使测试失败：

```js
assert.equal(season.catalogCount, 63);
assert.equal(anime.length, 63);
assert.ok(anime.every(({ titleZh }) => typeof titleZh === "string" && titleZh.length > 0));
assert.ok(anime.every(({ coverUrl }) => typeof coverUrl === "string" && coverUrl.length > 0));
assert.ok(anime.every(({ coverAlt }) => typeof coverAlt === "string" && coverAlt.length > 0));
assert.deepEqual(
  Object.keys(anime[0]).sort(),
  ["coverAlt", "coverUrl", "id", "jstTime", "premiereDateJst", "sourceUrl", "station", "titleJa", "titleZh"],
);

const yumeMita = anime.find(({ id }) => id === "yume-mita");
assert.deepEqual(
  { titleZh: yumeMita.titleZh, coverUrl: yumeMita.coverUrl },
  { titleZh: "梦限大 μ!", coverUrl: "/covers/yume-mita.png" },
);
```

- [ ] **Step 2: 运行数据测试，确认它因旧 44 条/旧字段失败**

Run: `node --test tests/anime-data.test.mjs`

Expected: FAIL，断言显示 `44 !== 63` 或缺少 `titleZh`、`coverUrl`、`coverAlt`。

- [ ] **Step 3: 用 ORICON 当前 63 条目替换静态数组**

从 `https://www.oricon.co.jp/anime/2026_summer/` 的“全63作品”列表逐条建立记录。每条记录都使用：

```js
{
  id: "stable-lowercase-slug",
  titleZh: "简体中文标题",
  titleJa: "ORICON 日文官方标题",
  premiereDateJst: "YYYY-MM-DD" | null,
  jstTime: "HH:MM" | null,
  station: "ORICON 列出的播出平台" | null,
  sourceUrl: "从 ORICON 当前列表逐条复制的精确作品详情 URL",
  coverUrl: "官方主视觉或 ORICON 主视觉的精确 https URL",
  coverAlt: `${titleZh} 主视觉`,
}
```

把 `season` 更新为：

```js
export const season = {
  label: "2026 夏番",
  timeZoneLabel: "北京时间（UTC+8）",
  updatedAt: "2026-07-12",
  catalogCount: 63,
  sourceName: "ORICON 夏アニメ2026",
  sourceUrl: "https://www.oricon.co.jp/anime/2026_summer/",
};
```

中文名优先使用已有官方简中译名；没有官方译名时使用忠实翻译。不可把没有精确时间的作品填入猜测时间。把用户给的 `/var/folders/_z/qqwj7bcd3n9fww4_5ktgm57m0000gn/T/codex-clipboard-81d35f87-be28-4208-9d91-fc4fb05a08c8.png` 复制为 `public/covers/yume-mita.png`，并将《夢限大みゅーたいぷ》记录的 ID 固定为 `yume-mita`。

- [ ] **Step 4: 验证快照和用户封面**

Run: `node --test tests/anime-data.test.mjs`

Expected: PASS，且输出 2 个通过的数据测试；`sips -g pixelWidth -g pixelHeight public/covers/yume-mita.png` 输出非零尺寸。

- [ ] **Step 5: 提交数据快照**

```bash
git add data/anime.js tests/anime-data.test.mjs public/covers/yume-mita.png
git commit -m "feat: add 63-title summer anime catalog"
```

### Task 2: 将周历分组限制为可靠的 7 月首播

**Files:**
- Modify: `lib/schedule.js`
- Modify: `tests/schedule.test.mjs`

- [ ] **Step 1: 写出失败的本季分组测试**

在 `tests/schedule.test.mjs` 新增：

```js
test("separates non-July and time-pending seasonal entries from the July calendar", () => {
  const grouped = groupByBeijingWeekday([
    { id: "july", premiereDateJst: "2026-07-06", jstTime: "22:00" },
    { id: "june", premiereDateJst: "2026-06-30", jstTime: "22:00" },
    { id: "unknown", premiereDateJst: null, jstTime: null },
  ]);

  assert.deepEqual(grouped.byWeekday.Mon.map(({ id }) => id), ["july"]);
  assert.deepEqual(grouped.seasonal.map(({ id }) => id), ["june"]);
  assert.deepEqual(grouped.pending.map(({ id }) => id), ["unknown"]);
});
```

- [ ] **Step 2: 运行测试，确认旧分组没有 `seasonal` 而失败**

Run: `node --test tests/schedule.test.mjs`

Expected: FAIL，错误说明 `grouped.seasonal` 未定义或六月作品错误地进入周历。

- [ ] **Step 3: 最小化扩展 `groupByBeijingWeekday`**

在 `lib/schedule.js` 中保留原有 `byWeekday` 与 `pending`，添加 `seasonal`。使用换算后的北京时间日期决定是否为 7 月周历项：

```js
const seasonal = [];

for (const record of records) {
  const airing = toBeijingAiring(record);
  if (!airing) {
    pending.push(record);
    continue;
  }
  if (!airing.date.startsWith("2026-07-")) {
    seasonal.push(record);
    continue;
  }
  byWeekday[airing.weekday].push(record);
}

seasonal.sort((left, right) =>
  `${left.premiereDateJst ?? "9999-99-99"}\u0000${left.titleJa}`.localeCompare(
    `${right.premiereDateJst ?? "9999-99-99"}\u0000${right.titleJa}`,
  ),
);
pending.sort((left, right) => left.titleJa.localeCompare(right.titleJa));

return { byWeekday, pending, seasonal };
```

排序 `seasonal` 时按已知 `premiereDateJst`、再按 `titleJa`；`pending` 按 `titleJa` 排序。`toBeijingAiring` 在 `jstTime` 为 `null` 时必须继续直接返回 `null`。

- [ ] **Step 4: 运行分组测试**

Run: `node --test tests/schedule.test.mjs`

Expected: PASS，原有跨日换算测试和新增三分区测试均通过。

- [ ] **Step 5: 提交分组行为**

```bash
git add lib/schedule.js tests/schedule.test.mjs
git commit -m "feat: separate seasonal catalog entries"
```

### Task 3: 先为封面卡片渲染写失败测试

**Files:**
- Modify: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 用 63 部目录的可见合同替换旧 44 部断言**

在服务端渲染测试中加入以下断言：

```js
assert.match(html, /63 部夏番/);
assert.match(html, /梦限大 μ!/);
assert.match(html, /夢限大みゅーたいぷ/);
assert.match(html, /src="\/covers\/yume-mita\.png"/);
assert.match(html, /alt="梦限大 μ! 主视觉"/);
assert.match(html, /本季收录／播出待确认/);
assert.match(html, /loading="lazy"/);
```

同时把每张日历卡片的可访问名称断言改为包含 `titleZh`、`titleJa`、北京时间日期与时间；不要再要求所有条目都在周历按钮内。

- [ ] **Step 2: 运行渲染测试，确认旧页面缺少中文名、封面和季表区而失败**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: FAIL，缺少 `63 部夏番`、封面 `img` 或《梦限大 μ!》文本。

### Task 4: 实现中文封面卡片与 63 部季表区

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 在页面内定义可复用的封面卡片渲染函数**

保留现有 `selected`、`dialogRef`、`openerRef` 和原生 `dialog`。在 `Home` 内新增接收 `record`、`airing` 与 `contextLabel` 的 `renderAnimeCard` 函数，使用以下结构：

```tsx
<button
  className={`anime-card${isToday ? " is-today" : ""}`}
  key={record.id}
  type="button"
  aria-haspopup="dialog"
  aria-label={`查看《${record.titleZh}／${record.titleJa}》详情：${contextLabel}`}
  onClick={(event) => {
    openerRef.current = event.currentTarget;
    setSelected(record);
  }}
>
  <span className="cover-frame">
    <img src={record.coverUrl} alt={record.coverAlt} loading="lazy" />
  </span>
  <strong>{record.titleZh}</strong>
  <span className="anime-card-ja">{record.titleJa}</span>
  <span className="anime-card-time">{contextLabel}</span>
</button>
```

`contextLabel` 对周历项目为 `北京时间 · 周一 21:00` 形式；本季/待确认项目为已知日期、平台或“首播时间待确认”。保留“今天”标记，但仅用于已确认的 7 月周历项目。

在函数开头使用 `const isToday = airing?.date === currentBeijingDate;`，使本季/待确认卡片永远不会错误显示“今天”。

- [ ] **Step 2: 渲染三个明确区域**

周历仍从 `grouped.byWeekday` 渲染。把旧 `pending-section` 替换为：

```tsx
<section className="catalog-section" aria-labelledby="catalog-heading">
  <div>
    <p className="section-kicker">完整季表</p>
    <h2 id="catalog-heading">本季收录／播出待确认</h2>
    <p>{season.catalogCount} 部夏番中，以下作品不具备可放入 7 月北京时间周历的完整首播信息。</p>
  </div>
  <div className="catalog-grid">
    {[...grouped.seasonal, ...grouped.pending].map((record) => renderAnimeCard(record, null, record.premiereDateJst ?? "首播时间待确认"))}
  </div>
</section>
```

页首补充 `{season.catalogCount} 部夏番`，说明周历仅显示可可靠换算的 7 月 TV 首播。

- [ ] **Step 3: 扩展详情弹窗**

在现有标题前加入封面和中文/日文双标题：

```tsx
<img className="detail-cover" src={selected.coverUrl} alt={selected.coverAlt} />
<p className="detail-title-zh">{selected.titleZh}</p>
<h2 id="anime-detail-title">{selected.titleJa}</h2>
```

把弹窗条件从 `{selected && selectedAiring ? (...) : null}` 改为 `{selected ? (...) : null}`。当 `selectedAiring` 为 `null` 时，详情的北京时间字段输出“待确认”，原始日本时间字段输出 `selected.premiereDateJst ?? "待确认"`；不要隐藏弹窗或把空值显示为 `null`。

- [ ] **Step 4: 添加最小样式而不改变整体视觉方向**

在 `app/globals.css` 中加入：

```css
.cover-frame { aspect-ratio: 3 / 4; overflow: hidden; border-radius: 0.45rem; background: var(--blue-soft); }
.cover-frame img, .detail-cover { width: 100%; height: 100%; object-fit: cover; }
.anime-card-ja { color: var(--muted-ink); font-size: 0.72rem; line-height: 1.35; }
.catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: 0.75rem; }
.detail-cover { aspect-ratio: 3 / 4; max-height: 18rem; border-radius: 0.75rem; }
.detail-title-zh { margin-bottom: 0.35rem; color: var(--blue); font-weight: 800; }
```

在既有 `@media (max-width: 860px)` 内把 `.catalog-grid` 改为 `grid-template-columns: 1fr 1fr`，并保证图片不突破容器宽度。

- [ ] **Step 5: 运行渲染测试，确认封面和三分区通过**

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: PASS，HTML 包含本地《梦限大 μ!》图片、中文名、日文名、63 部提示和季表区。

- [ ] **Step 6: 提交页面与样式**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: add translated anime cover cards"
```

### Task 5: 完整验证与私有更新发布

**Files:**
- Verify: `data/anime.js`, `lib/schedule.js`, `app/page.tsx`, `app/globals.css`, `tests/*.test.mjs`

- [ ] **Step 1: 运行完整测试、检查和构建**

Run: `npm test`

Expected: exit 0，所有数据、换算、渲染与包脚本测试通过。

Run: `npm run lint`

Expected: exit 0，无 ESLint 错误。

Run: `git diff --check`

Expected: exit 0，无空白错误。

- [ ] **Step 2: 确认任务提交覆盖全部改动**

Run: `git status --short`

Expected: 无输出；Task 1、Task 2 与 Task 4 的提交已覆盖数据、分组、图片、页面、样式和测试，不能创建空的重复提交。

- [ ] **Step 3: 更新私有 Sites 版本**

使用现有 `.openai/hosting.json` 的 `project_id`：获取短期源仓库凭据，推送当前 `main`，用 `scripts/package-site.sh` 打包 `dist/`，保存版本，再调用私有部署。轮询到 `succeeded` 后返回新的私有 URL。
