# 已看集数标记 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让登录同一 ChatGPT 账号的用户为每一次日历周更标记已看，并在桌面和移动视图中永久同步该状态。

**Architecture:** 用 `anime_episode_views` D1 表的一行表示一位用户已看的一次更新，键为邮箱、番剧 ID、起始集和结束集。一个共享 JavaScript 校验模块规范 API 读写数据；页面首次读取全部状态，并以单项 API 写入进行乐观更新与失败回滚。日历事件外层改为非交互容器，内部保留详情按钮，并新增独立的无障碍已看按钮。

**Tech Stack:** Next.js 16、React 19、TypeScript、Cloudflare D1、Drizzle ORM、Node 内置测试运行器、ESLint。

---

## 文件结构

- `lib/anime-episode-views.js`：规范已看更新对象、生成稳定状态键、校验写入和过滤过期的已存记录。
- `tests/anime-episode-views.test.mjs`：直接验证共享校验器的用户可见数据约束。
- `db/schema.ts`、`drizzle/`：声明并生成 `anime_episode_views` D1 表和迁移。
- `app/api/anime-episode-views/route.ts`：按 ChatGPT 账号读取状态，并只切换一条已看记录。
- `tests/anime-episode-views-storage.test.mjs`：锁定 D1 表、身份校验、路由数据流和生成迁移。
- `app/page.tsx`：读取、乐观保存和渲染独立的已看小方块。
- `app/globals.css`：让外层日历卡、详情按钮、小方块与灰态在时间轴和移动日程中正确布局。
- `tests/rendered-html.test.mjs`：适配卡片结构，并验证构建 HTML 中的独立、可访问已看控制。

### Task 1: 已看更新的数据校验器

**Files:**
- Create: `lib/anime-episode-views.js`
- Create: `tests/anime-episode-views.test.mjs`

- [ ] **Step 1: 写入失败的单元测试**

创建 `tests/anime-episode-views.test.mjs`，使用一部 12 集普通作品和一部首播三集作品组成映射。测试合法的首播范围会保留三项字段、重复记录会折叠，未知 ID、非整数、倒置范围和超过总集数都会被拒绝：

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  episodeViewKey,
  filterKnownEpisodeViews,
  validateEpisodeView,
} from "../lib/anime-episode-views.js";

const animeById = new Map([
  ["regular", { id: "regular", episodeCount: 12 }],
  ["three-at-once", { id: "three-at-once", episodeCount: 12 }],
]);

test("accepts one watched multi-episode update and gives it a stable key", () => {
  const watchedEpisode = validateEpisodeView(
    { animeId: "three-at-once", episodeStart: 1, episode: 3 },
    animeById,
  );

  assert.deepEqual(watchedEpisode, {
    animeId: "three-at-once",
    episodeStart: 1,
    episode: 3,
  });
  assert.equal(episodeViewKey(watchedEpisode), "three-at-once:1-3");
});

test("filters removed and duplicate saved watched updates", () => {
  assert.deepEqual(
    filterKnownEpisodeViews(
      [
        { animeId: "regular", episodeStart: 2, episode: 2 },
        { animeId: "removed", episodeStart: 1, episode: 1 },
        { animeId: "regular", episodeStart: 2, episode: 2 },
      ],
      animeById,
    ),
    [{ animeId: "regular", episodeStart: 2, episode: 2 }],
  );
});

test("rejects impossible watched updates from a browser request", () => {
  assert.throws(
    () => validateEpisodeView({ animeId: "removed", episodeStart: 1, episode: 1 }, animeById),
    /Unknown anime ID/,
  );
  assert.throws(
    () => validateEpisodeView({ animeId: "regular", episodeStart: 2, episode: 1 }, animeById),
    /Invalid episode range/,
  );
  assert.throws(
    () => validateEpisodeView({ animeId: "regular", episodeStart: 1, episode: 13 }, animeById),
    /Invalid episode range/,
  );
  assert.throws(
    () => validateEpisodeView({ animeId: "regular", episodeStart: 1.5, episode: 2 }, animeById),
    /Invalid episode range/,
  );
});
```

- [ ] **Step 2: 运行测试并确认它因模块不存在而失败**

Run: `node --test tests/anime-episode-views.test.mjs`

Expected: FAIL，错误指出无法找到 `lib/anime-episode-views.js`。

- [ ] **Step 3: 实现最小校验器**

创建 `lib/anime-episode-views.js`。只导出下面三个函数；不要增加客户端状态类或数据库逻辑：

```js
export function episodeViewKey({ animeId, episodeStart, episode }) {
  return animeId + ":" + episodeStart + "-" + episode;
}

export function validateEpisodeView(value, animeById) {
  if (!value || typeof value !== "object") {
    throw new TypeError("watched episode must be an object");
  }

  const { animeId, episodeStart, episode } = value;
  if (typeof animeId !== "string") {
    throw new TypeError("animeId must be a string");
  }

  const anime = animeById.get(animeId);
  if (!anime) {
    throw new RangeError("Unknown anime ID: " + animeId);
  }
  if (
    !Number.isInteger(episodeStart) ||
    !Number.isInteger(episode) ||
    episodeStart < 1 ||
    episode < episodeStart ||
    episode > anime.episodeCount
  ) {
    throw new RangeError("Invalid episode range");
  }

  return { animeId, episodeStart, episode };
}

export function filterKnownEpisodeViews(value, animeById) {
  if (!Array.isArray(value)) {
    throw new TypeError("watchedEpisodes must be an array");
  }

  const seen = new Set();
  const watchedEpisodes = [];
  for (const candidate of value) {
    try {
      const watchedEpisode = validateEpisodeView(candidate, animeById);
      const key = episodeViewKey(watchedEpisode);
      if (!seen.has(key)) {
        seen.add(key);
        watchedEpisodes.push(watchedEpisode);
      }
    } catch {
      // 已删除作品或损坏的旧记录不应重新出现在用户日历中。
    }
  }
  return watchedEpisodes;
}
```

- [ ] **Step 4: 运行测试并确认它通过**

Run: `node --test tests/anime-episode-views.test.mjs`

Expected: PASS，3 个测试全部通过。

- [ ] **Step 5: 提交校验器和测试**

```bash
git add lib/anime-episode-views.js tests/anime-episode-views.test.mjs
git commit -m "feat: validate watched episode updates"
```

### Task 2: D1 表与按用户切换的 API

**Files:**
- Modify: `db/schema.ts:1-10`
- Create: `app/api/anime-episode-views/route.ts`
- Create: `tests/anime-episode-views-storage.test.mjs`
- Modify: `drizzle/` 中由 `npm run db:generate` 生成的 SQL、snapshot 与 journal 文件

- [ ] **Step 1: 写入失败的路由和迁移契约测试**

创建 `tests/anime-episode-views-storage.test.mjs`。迁移由目录中任意包含建表 SQL 的 `.sql` 文件验证，以免把 Drizzle 自动生成的文件名硬编码到测试里：

```js
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("declares authenticated per-update watched storage and a generated migration", async () => {
  const [schema, route, migrationNames] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/anime-episode-views/route.ts", import.meta.url), "utf8"),
    readdir(new URL("../drizzle/", import.meta.url)),
  ]);
  const migrationContents = await Promise.all(
    migrationNames
      .filter((name) => name.endsWith(".sql"))
      .map((name) => readFile(new URL("../drizzle/" + name, import.meta.url), "utf8")),
  );

  assert.match(schema, /animeEpisodeViews/);
  assert.match(schema, /integer\("episode_start"\)/);
  assert.match(schema, /integer\("episode"\)/);
  assert.match(schema, /userEmail, table\.animeId, table\.episodeStart, table\.episode/);
  assert.match(route, /getChatGPTUser/);
  assert.match(route, /status: 401/);
  assert.match(route, /validateEpisodeView/);
  assert.match(route, /filterKnownEpisodeViews/);
  assert.match(route, /onConflictDoNothing\(\)/);
  assert.match(route, /and\(/);
  assert.ok(migrationContents.some((sql) => /CREATE TABLE `anime_episode_views`/.test(sql)));
});
```

- [ ] **Step 2: 运行测试并确认它因路由和表不存在而失败**

Run: `node --test tests/anime-episode-views-storage.test.mjs`

Expected: FAIL，错误指出无法读取 `app/api/anime-episode-views/route.ts`。

- [ ] **Step 3: 在 Drizzle schema 中声明复合主键表**

将 `db/schema.ts` 的导入改为 `integer, primaryKey, sqliteTable, text`，并保留 `animeSelections` 不变。在文件末尾追加：

```ts
export const animeEpisodeViews = sqliteTable(
  "anime_episode_views",
  {
    userEmail: text("user_email").notNull(),
    animeId: text("anime_id").notNull(),
    episodeStart: integer("episode_start").notNull(),
    episode: integer("episode").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userEmail, table.animeId, table.episodeStart, table.episode],
    }),
  ],
);
```

- [ ] **Step 4: 生成迁移，不手写 SQL 或 meta 文件**

Run: `npm run db:generate`

Expected: Drizzle 在 `drizzle/` 中增加一份 `0001_*.sql` 和匹配的 snapshot，并更新 `_journal.json`；SQL 创建 `anime_episode_views` 及四列复合主键。

- [ ] **Step 5: 实现单项读取与切换 API**

创建 `app/api/anime-episode-views/route.ts`。它只接收一项 `animeId`、`episodeStart`、`episode` 和布尔值 `watched`，不能接收邮箱或整个列表：

```ts
import { and, eq } from "drizzle-orm";
import { allAnime } from "../../../data/anime.js";
import { getDb } from "../../../db";
import { animeEpisodeViews } from "../../../db/schema";
import {
  filterKnownEpisodeViews,
  validateEpisodeView,
} from "../../../lib/anime-episode-views.js";
import { getChatGPTUser } from "../../chatgpt-auth";

const animeById = new Map(allAnime.map((anime) => [anime.id, anime]));

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  try {
    const rows = await (await getDb())
      .select({
        animeId: animeEpisodeViews.animeId,
        episodeStart: animeEpisodeViews.episodeStart,
        episode: animeEpisodeViews.episode,
      })
      .from(animeEpisodeViews)
      .where(eq(animeEpisodeViews.userEmail, user.email));
    return Response.json({ watchedEpisodes: filterKnownEpisodeViews(rows, animeById) });
  } catch {
    return Response.json({ error: "Unable to load watched episodes" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  let watchedEpisode: { animeId: string; episodeStart: number; episode: number };
  let watched: boolean;
  try {
    const payload = (await request.json()) as { watched?: unknown };
    watchedEpisode = validateEpisodeView(payload, animeById);
    if (typeof payload.watched !== "boolean") throw new TypeError("watched must be a boolean");
    watched = payload.watched;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid watched episode";
    return Response.json({ error: message }, { status: 400 });
  }

  const where = and(
    eq(animeEpisodeViews.userEmail, user.email),
    eq(animeEpisodeViews.animeId, watchedEpisode.animeId),
    eq(animeEpisodeViews.episodeStart, watchedEpisode.episodeStart),
    eq(animeEpisodeViews.episode, watchedEpisode.episode),
  );
  try {
    const db = await getDb();
    if (watched) {
      await db
        .insert(animeEpisodeViews)
        .values({ userEmail: user.email, ...watchedEpisode })
        .onConflictDoNothing();
    } else {
      await db.delete(animeEpisodeViews).where(where);
    }
    return Response.json({ watchedEpisode, watched });
  } catch {
    return Response.json({ error: "Unable to save watched episode" }, { status: 500 });
  }
}
```

- [ ] **Step 6: 运行路由和迁移契约测试并确认它通过**

Run: `node --test tests/anime-episode-views-storage.test.mjs`

Expected: PASS，表、身份检查、单项写入语义和生成迁移均被检测到。

- [ ] **Step 7: 提交存储层**

```bash
git add db/schema.ts app/api/anime-episode-views/route.ts tests/anime-episode-views-storage.test.mjs drizzle
git commit -m "feat: store watched episode updates"
```

### Task 3: 日历小方块、灰态和乐观同步

**Files:**
- Modify: `app/page.tsx:3-315`
- Modify: `app/globals.css:491-594, 840-865`
- Modify: `tests/rendered-html.test.mjs:67-166, 178-214, 240-410`

- [ ] **Step 1: 先扩展构建 HTML 测试，描述新卡片结构**

在 `tests/rendered-html.test.mjs` 中把旧的“所有 `.calendar-event` 都是对话框按钮”断言改为详情按钮断言；新增下面测试，并把同一时刻卡片的正则起始标签由 `<button` 改为 `<div`：

```js
test("renders separate accessible watched controls without nesting calendar buttons", async () => {
  const html = await (await render()).text();
  const watchedControls = [
    ...html.matchAll(
      /<button\b(?=[^>]*class="[^"]*\bepisode-watch-toggle\b[^"]*")(?=[^>]*aria-pressed="false")[^>]*>/g,
    ),
  ].map(([button]) => button);
  const detailButtons = [
    ...html.matchAll(
      /<button\b(?=[^>]*class="[^"]*\bcalendar-event-detail\b[^"]*")(?=[^>]*aria-haspopup="dialog")[^>]*>/g,
    ),
  ].map(([button]) => button);

  assert.ok(watchedControls.length > 20);
  assert.ok(watchedControls.every((button) => /aria-label="标记《/.test(button)));
  assert.ok(watchedControls.every((button) => /disabled=""/.test(button)));
  assert.equal(detailButtons.length, watchedControls.length);
  assert.doesNotMatch(html, /<button\b(?=[^>]*class="[^"]*\bcalendar-event\b)/);
});
```

还要把原来的 `timedEvents` 选择器改为 `.calendar-event-detail` 按钮，保留它们都带 `aria-haspopup="dialog"`、封面和懒加载的断言；把 `sameTimeEvents` 正则开头改为 `<div`，但继续检查三个 `style`、三个 lane 和卡片内容。

- [ ] **Step 2: 构建并运行 HTML 测试，确认新增断言失败**

Run: `npm run build`

Expected: PASS，构建仍可完成。

Run: `node --test tests/rendered-html.test.mjs`

Expected: FAIL，新测试找不到 `episode-watch-toggle`，旧测试仍在寻找旧卡片结构。

- [ ] **Step 3: 在页面中读取并乐观保存已看状态**

在 `app/page.tsx` 从 `../lib/anime-episode-views.js` 导入 `episodeViewKey`，并在类型区新增：

```ts
type WatchedEpisode = {
  animeId: string;
  episodeStart: number;
  episode: number;
};
```

在 `selectedAnimeIds` 状态之后新增：

```ts
const [watchedEpisodes, setWatchedEpisodes] = useState<WatchedEpisode[] | null>(null);
const [watchedEpisodeError, setWatchedEpisodeError] = useState<string | null>(null);
const [savingEpisodeKeys, setSavingEpisodeKeys] = useState<string[]>([]);
```

在追番读取 effect 前新增一次性读取 effect。成功时只接受每项都含字符串 ID 和整数集数的数组；失败时保持 `null`，这样小方块会维持禁用：

```ts
useEffect(() => {
  let cancelled = false;
  async function loadWatchedEpisodes() {
    try {
      const response = await fetch("/api/anime-episode-views");
      if (!response.ok) throw new Error("Unable to load watched episodes");
      const payload = (await response.json()) as { watchedEpisodes?: unknown };
      if (
        !Array.isArray(payload.watchedEpisodes) ||
        payload.watchedEpisodes.some(
          (episode) =>
            !episode ||
            typeof episode !== "object" ||
            typeof (episode as WatchedEpisode).animeId !== "string" ||
            !Number.isInteger((episode as WatchedEpisode).episodeStart) ||
            !Number.isInteger((episode as WatchedEpisode).episode),
        )
      ) {
        throw new Error("Invalid watched episodes");
      }
      if (!cancelled) setWatchedEpisodes(payload.watchedEpisodes as WatchedEpisode[]);
    } catch {
      if (!cancelled) setWatchedEpisodeError("无法读取已看记录。请稍后重试。");
    }
  }

  void loadWatchedEpisodes();
  return () => {
    cancelled = true;
  };
}, []);
```

在 `toggleAnimeSelection` 后新增单项切换函数。它只禁用正在保存的同一项，并在 API 失败时恢复完整的先前列表：

```ts
const toggleEpisodeView = async (watchedEpisode: WatchedEpisode) => {
  if (!watchedEpisodes) return;

  const key = episodeViewKey(watchedEpisode);
  if (savingEpisodeKeys.includes(key)) return;

  const previousWatchedEpisodes = watchedEpisodes;
  const isWatched = watchedEpisodes.some((candidate) => episodeViewKey(candidate) === key);
  const nextWatchedEpisodes = isWatched
    ? watchedEpisodes.filter((candidate) => episodeViewKey(candidate) !== key)
    : [...watchedEpisodes, watchedEpisode];

  setWatchedEpisodes(nextWatchedEpisodes);
  setWatchedEpisodeError(null);
  setSavingEpisodeKeys((keys) => [...keys, key]);
  try {
    const response = await fetch("/api/anime-episode-views", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...watchedEpisode, watched: !isWatched }),
    });
    if (!response.ok) throw new Error("Unable to save watched episode");
  } catch {
    setWatchedEpisodes(previousWatchedEpisodes);
    setWatchedEpisodeError("保存已看状态失败，请重试。");
  } finally {
    setSavingEpisodeKeys((keys) => keys.filter((candidate) => candidate !== key));
  }
};
```

在现有 `eventButton` 内为事件构造 `watchedEpisode`、`watchKey`、`isWatched` 和 `isSavingWatch`。把外层 `<button>` 换成下面的 `<div>` 结构，保留现有详情 `aria-label` 和 `openDetail` 传入的日期、时刻、集数：

```tsx
const watchedEpisode = {
  animeId: event.id,
  episodeStart: event.episodeStart,
  episode: event.episode,
};
const watchKey = episodeViewKey(watchedEpisode);
const isWatched = watchedEpisodes?.some((candidate) => episodeViewKey(candidate) === watchKey) ?? false;
const isSavingWatch = savingEpisodeKeys.includes(watchKey);

return (
  <div
    className={
      "calendar-event" +
      (layout ? " timeline-event" : "") +
      (isToday ? " is-today" : "") +
      (isWatched ? " is-watched" : "")
    }
    key={event.id + "-" + event.episodeStart + "-" + event.episode}
    style={eventStyle}
  >
    <button
      className="calendar-event-detail"
      type="button"
      aria-haspopup="dialog"
      aria-label={
        "查看《" +
        event.titleZh +
        "／" +
        event.titleJa +
        "》" +
        episodeLabel +
        "详情：" +
        event.date +
        " " +
        displayTime
      }
      onClick={(clickEvent) =>
        openDetail(event, clickEvent.currentTarget, {
          selectedDate: event.broadcastDate,
          selectedTime: event.broadcastTime,
          selectedEpisodeStart: event.episodeStart,
          selectedEpisode: event.episode,
        })
      }
    >
      <img className="calendar-event-cover" src={event.coverUrl} alt="" loading="lazy" />
      <span className="calendar-event-content">
        <strong>{event.titleZh}</strong>
        <span className="calendar-event-episode">{episodeLabel}</span>
      </span>
    </button>
    <button
      className="episode-watch-toggle"
      type="button"
      aria-pressed={isWatched}
      aria-label={(isWatched ? "取消标记《" : "标记《") + event.titleZh + "》" + episodeLabel + "已看"}
      disabled={watchedEpisodes === null || isSavingWatch}
      onClick={() => void toggleEpisodeView(watchedEpisode)}
    >
      {isWatched ? "✓" : null}
    </button>
  </div>
);
```

在周历 section 标题下方放置一个 `aria-live="polite"` 的 `watchedEpisodeError` 段落，仅在错误存在时渲染；不要改变追番列表的 `selectionError`。

- [ ] **Step 4: 用最小 CSS 迁移视觉样式与响应式覆盖**

将 `app/globals.css` 中旧 `.calendar-event` 的可见卡片样式移到 `.calendar-event-detail`，让外层只负责定位。关键规则如下；保留原有颜色变量、时间轴定位变量和断点：

```css
.calendar-event {
  position: relative;
  min-width: 0;
  min-height: 4.5rem;
}

.calendar-event-detail {
  display: grid;
  grid-template-columns: 2.6rem minmax(0, 1fr);
  width: 100%;
  min-height: 4.5rem;
  gap: 0.4rem;
  padding: 0.35rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--blue) 55%, var(--line));
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--blue-soft) 78%, var(--card));
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.timeline-event {
  position: absolute;
  top: var(--event-top);
  left: calc(var(--event-left) + var(--timeline-event-gutter));
  width: calc(var(--event-width) - var(--timeline-event-gutter));
  height: 40px;
  min-height: 0;
}

.timeline-event .calendar-event-detail {
  min-height: 100%;
  grid-template-columns: minmax(0, 1.85rem) minmax(0, 1fr);
  gap: 0.25rem;
  padding: 0.2rem;
}

.calendar-event-detail:hover {
  border-color: var(--blue);
  box-shadow: 0 0.35rem 0.8rem rgb(31 41 51 / 15%);
  transform: translateY(-1px);
}

.calendar-event.is-today .calendar-event-detail {
  border-color: var(--mint-deep);
  box-shadow: inset 0 0 0 1px var(--mint);
}

.episode-watch-toggle {
  position: absolute;
  z-index: 1;
  top: 0.35rem;
  right: 0.35rem;
  display: grid;
  width: 1.35rem;
  height: 1.35rem;
  place-items: center;
  padding: 0;
  border: 2px solid var(--muted-ink);
  border-radius: 0.24rem;
  background: var(--card);
  color: var(--card);
  cursor: pointer;
}

.episode-watch-toggle[aria-pressed="true"] {
  border-color: var(--muted-ink);
  background: var(--muted-ink);
  color: var(--card);
}

.calendar-event.is-watched .calendar-event-detail {
  border-color: color-mix(in srgb, var(--muted-ink) 45%, var(--line));
  background: color-mix(in srgb, var(--muted-ink) 12%, var(--card));
  color: var(--muted-ink);
}

.calendar-event.is-watched .calendar-event-cover {
  filter: grayscale(1);
  opacity: 0.7;
}
```

给 `.calendar-event-content` 增加右侧内边距，避免标题压到右上角。把现有的拥挤同刻规则、移动端封面宽度与移动端内容间距的 `.calendar-event` 选择器改为 `.calendar-event-detail`；在 `.timeline-event .episode-watch-toggle` 中把方块缩到 `1.05rem` 并将 `top`、`right` 都设为 `0.13rem`。在减少动态效果媒体查询中把 `.calendar-event-detail` 替代 `.calendar-event`。

- [ ] **Step 5: 重新构建并运行 HTML 测试，确认卡片语义和布局测试通过**

Run: `npm run build`

Expected: PASS，Worker 兼容构建完成。

Run: `node --test tests/rendered-html.test.mjs`

Expected: PASS，新的小方块测试、详情按钮测试、同刻三列和移动议程断言全部通过。

- [ ] **Step 6: 提交前端改动和渲染测试**

```bash
git add app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "feat: mark calendar episode updates watched"
```

### Task 4: 全量回归验证与交付检查

**Files:**
- Verify only: `lib/anime-episode-views.js`
- Verify only: `app/api/anime-episode-views/route.ts`
- Verify only: `db/schema.ts`
- Verify only: `drizzle/`
- Verify only: `app/page.tsx`
- Verify only: `app/globals.css`
- Verify only: `tests/`

- [ ] **Step 1: 运行 lint**

Run: `npm run lint -- --ignore-pattern .worktrees`

Expected: PASS，ESLint 不报告新增错误或警告。

- [ ] **Step 2: 运行完整生产构建与回归测试**

Run: `npm test`

Expected: PASS。该命令先构建 Worker，再执行 `tests/*.test.mjs`，包括新校验器、D1 路由/迁移契约和构建后的 HTML。

- [ ] **Step 3: 检查提交前差异**

Run: `git diff --check`

Expected: PASS，无空白错误。

Run: `git status --short`

Expected: 无输出，Task 3 的实现提交后工作树干净。

- [ ] **Step 4: 手动验收账号级交互**

在 Sites 预览中使用已登录 ChatGPT 账号完成以下检查：

1. 打开任意有固定时刻的时间轴卡片，点击右上角方块；它立即出现勾号，卡片和封面标灰，点击卡片主体仍打开详情。
2. 刷新页面并在另一台登录同一账号的设备打开同一集数；灰态仍存在。
3. 在移动宽度下选择该集数所在日期；方块状态与桌面一致，并能切换。
4. 点击首播“第 1—3 集”的方块后刷新；该范围保持一个已看状态，下一周的“第 4 集”仍未标灰。
5. 检查“网络放送／固定时刻未列出”区域没有小方块，且未登录请求收到 `401` 而不会写入任何用户数据。
