# 当季编辑页 UI 改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 将默认播出表改为带顶部主导航、当季封面编辑首屏和既有周表承接的二次元季番页面，同时保留全部现有路由、移动端议程和主题行为。

**Architecture:** 只改客户端呈现层。app/page.tsx 用现有 activeSeason、CoverArt、周状态和 changePage() 组成首屏与快捷动作；app/globals.css 将现有 .page-sidebar 从左侧栏改成顶部导航，并为首屏提供只用主题 token 的双主题响应式样式；回归测试继续以构建后 HTML 和源码/CSS 约束保护日历行为。

**Tech Stack:** Next.js 16、React 19、TypeScript、CSS、Node 内置测试运行器、vinext/Cloudflare Worker。

---

## 文件结构

| 文件 | 职责 |
| --- | --- |
| app/page.tsx | 保持 URL 页面切换、账号和周历计算不变；新增默认播出表的编辑首屏、顶部导航布局和两个仅定位/跳转的快捷动作。 |
| app/globals.css | 将桌面左栏改为顶部导航，并新增当季首屏、封面拼贴、快捷区及不大于 860px 的单列规则。 |
| app/layout.tsx | 纳入 Kimi 已实现的首屏主题初始化，确保与本次提交的主题切换测试和双主题 CSS 同步。 |
| tests/rendered-html.test.mjs | 更新过期的左栏断言；覆盖首屏、封面拼贴、快捷动作、主题 token、桌面导航及移动端不回归。 |

不创建组件、数据文件、图片、API 或迁移：首屏封面全部复用 CoverArt 和现有本地图集。

### Task 1: 为编辑首屏和顶部导航写出失败的结构回归测试

**Files:**
- Modify: tests/rendered-html.test.mjs:39-74
- Modify: tests/rendered-html.test.mjs:520-650

- [ ] **Step 1: 将默认渲染断言改成未来首屏 HTML**

在 server-renders a paged Beijing episode calendar 中，删除仅针对旧标题 2026 年 7 月番时间表 的断言，并在保留季度 select、搜索、周历和封面图集断言的同时加入：

~~~js
assert.match(cleanHtml, /这季有什么值得追？/);
assert.match(html, /class="page-sidebar"/);
assert.match(html, /class="seasonal-hero"/);
assert.match(html, /class="seasonal-hero-covers"/);
assert.match(html, /class="seasonal-hero-cover cover-sprite"/);
assert.match(html, /查看本周放送/);
assert.match(html, /今天看什么/);
assert.match(html, /我的追番/);
assert.match(html, /class="seasonal-hero-shortcuts"/);
assert.match(html, /<label class="season-picker"/);
assert.match(html, /class="weekly-section"/);
assert.match(html, /class="mobile-calendar"/);
~~~

- [ ] **Step 2: 替换过期的侧栏断言，并新增源码行为断言**

在 keeps navigation, dialog wiring, and responsive calendar layout durable 中，删除对 .site-shell 的 grid-template-columns: 13rem minmax(0, 1fr) 和纵向左栏形态的断言。加入：

~~~js
assert.match(page, /const seasonalHeroAnime = activeSeason\.anime\.slice\(0, 4\);/);
assert.match(page, /const weeklySectionRef = useRef<HTMLElement>\(null\);/);
assert.match(
  page,
  /const scrollToWeeklySchedule = \(\) => \{[\s\S]*?prefers-reduced-motion: reduce[\s\S]*?weeklySectionRef\.current\?\.scrollIntoView/,
);
assert.match(
  page,
  /const jumpToTodaySchedule = \(\) => \{[\s\S]*?setActiveWeekStart\(startOfWeek\(date\)\);[\s\S]*?setActiveMobileDate\(date\);/,
);
assert.match(page, /activePage === "all" \? \([\s\S]*?className="seasonal-hero"/);
assert.match(page, /seasonalHeroAnime\.map\(\(record\) => \([\s\S]*?<CoverArt[\s\S]*?decorative/);
assert.match(page, /onClick=\{\(\) => changePage\("mine"\)\}/);
assert.match(page, /ref=\{weeklySectionRef\}[\s\S]*?className="weekly-section"/);
assert.match(styles, /\.page-sidebar\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?display:\s*flex;/);
assert.doesNotMatch(styles, /grid-template-columns:\s*13rem minmax\(0, 1fr\)/);
assert.match(styles, /\.seasonal-hero\s*\{[\s\S]*?display:\s*grid;/);
assert.match(styles, /\.seasonal-hero-covers\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/);
assert.match(
  styles,
  /@media \(max-width: 860px\) \{[\s\S]*?\.seasonal-hero\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
);
assert.match(
  styles,
  /@media \(max-width: 860px\) \{[\s\S]*?\.mobile-calendar\s*\{[\s\S]*?display:\s*grid;/,
);
~~~

保留既有断言：移动端隐藏 .timeline-grid、七列单日选择器、以及已看封面不使用灰度。

- [ ] **Step 3: 运行新测试，确认当前实现失败**

Run:

~~~bash
node --test --test-name-pattern "server-renders a paged Beijing episode calendar|keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs
~~~

Expected: FAIL，因为当前 HTML 没有 seasonal-hero，CSS 仍包含 13rem 桌面侧栏。

### Task 2: 实现顶部主导航、当季首屏和可访问快捷动作

**Files:**
- Modify: app/page.tsx:290-365
- Modify: app/page.tsx:530-575
- Modify: app/page.tsx:880-1010
- Modify: app/page.tsx:1280-1295
- Test: tests/rendered-html.test.mjs

- [ ] **Step 1: 加入确定性的封面派生数据和周表引用**

在 activeSeason 之后加入固定四张封面来源，在其余 useRef 声明旁加入周表引用；不得请求新数据或构造推荐列表。

~~~tsx
const activeSeason = seasonForWeek(seasons, activeWeekStart) as Season;
const seasonalHeroAnime = activeSeason.anime.slice(0, 4);
const weeklySectionRef = useRef<HTMLElement>(null);
~~~

- [ ] **Step 2: 添加两个周历定位回调**

在 returnToCurrentWeek 后添加。第一个尊重系统减少动态效果；第二个把桌面周和移动端日期都切至北京时间当天，再在下一帧滚动到已有周表。

~~~tsx
const scrollToWeeklySchedule = () => {
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  weeklySectionRef.current?.scrollIntoView({ behavior, block: "start" });
};

const jumpToTodaySchedule = () => {
  const date = currentBeijingDate ?? activeWeekStart;
  setActiveWeekStart(startOfWeek(date));
  setActiveMobileDate(date);
  window.requestAnimationFrame(scrollToWeeklySchedule);
};
~~~

- [ ] **Step 3: 保留导航语义，把它重排为顶部主导航**

保留 nav.page-sidebar、三个 changePage() 按钮、aria-current、账号状态和登录弹窗调用；只将子元素排列为品牌、三个页面按钮、账号区。不要改成链接，也不要改动 changePage() 的 pushState 行为。

在 main.calendar-page 内，将默认页的当前 calendar-header 替换成下列条件。false branch 必须只覆盖 mine、stats、search，并使用随后给出的完整 JSX，以免默认页重复出现旧标题。

~~~tsx
{activePage === "all" ? (
  <section className="seasonal-hero" aria-labelledby="seasonal-hero-heading">
    <div className="seasonal-hero-copy">
      <p className="season-kicker">{activeSeason.label}</p>
      <h1 id="seasonal-hero-heading">这季有什么值得追？</h1>
      <p className="intro">
        共 {activeSeason.catalogCount} 部番剧，按北京时间追踪每一集的播出时间。
      </p>
      <div className="seasonal-hero-actions">
        <button type="button" onClick={scrollToWeeklySchedule}>查看本周放送</button>
        <label className="season-picker">
          选择季度
          <select value={activeSeason.id} onChange={(event) => changeSeason(event.target.value)}>
            {seasons.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
            ))}
          </select>
        </label>
      </div>
      <a className="source-link" href={activeSeason.sourceUrl} target="_blank" rel="noreferrer">
        {activeSeason.sourceName} <span aria-hidden="true">↗</span>
      </a>
    </div>
    <div className="seasonal-hero-covers" aria-hidden="true">
      {seasonalHeroAnime.map((record) => (
        <CoverArt anime={record} className="seasonal-hero-cover" decorative key={record.id} />
      ))}
    </div>
    <div className="seasonal-hero-shortcuts">
      <button type="button" onClick={jumpToTodaySchedule}>
        <strong>今天看什么</strong><span>定位到今天的放送安排</span>
      </button>
      <button type="button" onClick={() => changePage("mine")}>
        <strong>我的追番</strong><span>登录后继续查看已收藏作品</span>
      </button>
      <form className="page-search" role="search" aria-label="查询番剧" onSubmit={submitPageSearch}>
        <label className="page-search-field">查询番剧<input name="pageSearch" type="search" placeholder="输入中文或日文名" /></label>
        <button type="submit">查询</button>
      </form>
    </div>
  </section>
) : (
  <header className="calendar-header">
    <div>
      <p className="season-kicker">
        {activePage === "mine" ? "我的番剧" : activePage === "search" ? "全部目录" : "我的进度"}
      </p>
      <h1>
        {activePage === "mine" ? "我的番剧时间表" : activePage === "search" ? "查询番剧" : "追番统计"}
      </h1>
      <p className="intro">
        {activePage === "mine"
          ? "勾选想追的番剧，只查看属于你的播出时间表。"
          : activePage === "search"
            ? "搜索本应用已收录的全部番剧，支持中文和日文标题。"
            : "查看今天要追的番剧、整体进度，以及每个季度的追番记录。"}
      </p>
      {activePage === "mine" && isHistoricalSeason ? (
        <p className="pilot-note">名称和封面来自 YUC；首播日期、北京时间与集数使用 AniList 历史记录。</p>
      ) : null}
    </div>
    {activePage === "mine" ? (
      <div className="calendar-header-controls">
        <label className="season-picker">
          选择季度
          <select value={activeSeason.id} onChange={(event) => changeSeason(event.target.value)}>
            {seasons.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
            ))}
          </select>
          <span>1 月番和 4 月番：名称和封面来自 YUC；首播日期、北京时间与集数使用 AniList 历史记录。</span>
        </label>
        <a className="source-link" href={activeSeason.sourceUrl} target="_blank" rel="noreferrer">
          {activeSeason.sourceName} <span aria-hidden="true">↗</span>
        </a>
      </div>
    ) : null}
  </header>
)}
~~~

将当前 page-search 表单移入上述默认页快捷区；仅在 mine 和 stats 页于保留的简洁页头后渲染同一表单，绝不在搜索页再渲染一份。

- [ ] **Step 4: 给既有周表 section 提供滚动目标**

不改变 aria-labelledby、周导航、时间轴或移动议程，只将开头替换为：

~~~tsx
<section ref={weeklySectionRef} className="weekly-section" aria-labelledby="weekly-heading">
~~~

- [ ] **Step 5: 运行类型检查和结构测试**

Run:

~~~bash
npm run typecheck
npm run build
node --test --test-name-pattern "server-renders a paged Beijing episode calendar|keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs
~~~

Expected: TypeScript exits 0。新 JSX/源码断言通过；CSS 顶部导航和响应式首屏断言仍失败，直到 Task 3。

### Task 3: 用双主题 token 实现桌面编辑页与移动端承接

**Files:**
- Modify: app/globals.css:81-225
- Modify: app/globals.css:1748-1865
- Test: tests/rendered-html.test.mjs

- [ ] **Step 1: 在 CSS 耐久性测试中补充首屏样式断言**

在 Task 1 的测试旁加入：

~~~js
assert.match(styles, /\.seasonal-hero\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax\(16rem, 0\.8fr\);/);
assert.match(styles, /\.seasonal-hero-shortcuts\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/);
assert.match(styles, /\.seasonal-hero-cover\s*\{[\s\S]*?aspect-ratio:\s*3\s*\/\s*4;[\s\S]*?background-repeat:\s*no-repeat;/);
assert.match(styles, /\.page-sidebar button\.is-active\s*\{[\s\S]*?background:\s*var\(--accent-gradient\);/);
assert.match(
  styles,
  /@media \(max-width: 860px\) \{[\s\S]*?\.seasonal-hero-shortcuts\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
);
const seasonalHeroBlock = styles.match(/\.seasonal-hero\s*\{([\s\S]*?)\n\}/);
assert.ok(seasonalHeroBlock);
assert.doesNotMatch(seasonalHeroBlock[1], /#[0-9a-f]{3,8}\b/i);
~~~

- [ ] **Step 2: 运行样式测试，确认当前 CSS 失败**

Run:

~~~bash
node --test --test-name-pattern "keeps navigation, dialog wiring, and responsive calendar layout durable" tests/rendered-html.test.mjs
~~~

Expected: FAIL，因为 .page-sidebar 仍是左侧栏且没有 .seasonal-hero 样式。

- [ ] **Step 3: 替换桌面左栏规则，并新增首屏规则**

替换当前桌面 .site-shell、.page-sidebar、.site-name、.page-sidebar button、.account-area、.account-name 规则；保留现有 token 和 .theme-toggle：

~~~css
.site-shell {
  width: min(1920px, 100%);
  margin: 0 auto;
}

.page-sidebar {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 0;
  padding: 0.75rem clamp(1rem, 3vw, 3.5rem);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper-deep) 88%, transparent);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

.site-name { margin: 0 auto 0 0; padding: 0; border: 0; }

.page-sidebar button {
  padding: 0.48rem 0.7rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  text-align: center;
}

.page-sidebar button.is-active {
  border-color: color-mix(in srgb, var(--accent) 38%, var(--line));
  background: var(--accent-gradient);
  box-shadow: none;
  color: var(--on-accent);
}

.account-area {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0 0.35rem;
  padding: 0 0 0 0.35rem;
  border-top: 0;
  border-left: 1px solid var(--line);
}

.account-name { padding: 0 0.25rem; }
~~~

紧跟上述规则加入：

~~~css
.seasonal-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.8fr);
  gap: 1.4rem;
  align-items: center;
  padding: clamp(1.25rem, 3vw, 2.5rem);
  border: 1px solid var(--line);
  border-radius: var(--radius-panel);
  background:
    radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--accent-2) 45%, transparent) 0 0.25rem, transparent 0.3rem),
    linear-gradient(135deg, color-mix(in srgb, var(--accent-soft) 45%, var(--card)), var(--card));
  box-shadow: var(--shadow-raise);
}

.seasonal-hero-copy { min-width: 0; }
.seasonal-hero-copy h1 { max-width: 10ch; }

.seasonal-hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.65rem;
  margin-top: 1rem;
}

.seasonal-hero-actions > button {
  min-height: 2.4rem;
  padding: 0 1.1rem;
  border: 1px solid var(--accent);
  border-radius: var(--radius-control);
  background: var(--accent-gradient);
  color: var(--on-accent);
  cursor: pointer;
  font-weight: 800;
}

.seasonal-hero-covers {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
  align-items: center;
  transform: rotate(2deg);
}

.seasonal-hero-cover {
  aspect-ratio: 3 / 4;
  border: 1px solid color-mix(in srgb, var(--card) 70%, var(--line));
  border-radius: var(--radius-card);
  background-repeat: no-repeat;
  box-shadow: var(--shadow-raise);
}

.seasonal-hero-cover:nth-child(even) { transform: translateY(1rem); }

.seasonal-hero-shortcuts {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  padding-top: 0.2rem;
}

.seasonal-hero-shortcuts > button,
.seasonal-hero-shortcuts .page-search {
  min-width: 0;
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--card) 88%, transparent);
}

.seasonal-hero-shortcuts > button {
  display: grid;
  gap: 0.2rem;
  cursor: pointer;
  text-align: left;
}

.seasonal-hero-shortcuts > button strong { color: var(--accent); }
.seasonal-hero-shortcuts > button span { color: var(--muted-ink); font-size: 0.8rem; }
~~~

不要改动时间轴尺寸、节目卡尺寸、.mobile-calendar 基础规则或现有深色 token 块。

- [ ] **Step 4: 替换移动侧栏覆写，并加入单列首屏规则**

在已有 @media (max-width: 860px) 中替换旧的 .site-shell、.page-sidebar、.site-name、账号区覆写；保留 .timeline-grid { display: none; }、.mobile-calendar { display: grid; } 和七列日期选择器：

~~~css
.page-sidebar {
  position: static;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  background: var(--paper-deep);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.site-name { width: auto; margin-right: auto; font-size: 1.15rem; }

.page-sidebar button {
  padding: 0.4rem 0.75rem;
  border-color: var(--line);
}

.account-area {
  width: 100%;
  margin: 0;
  padding: 0;
  border-left: 0;
}

.seasonal-hero {
  grid-template-columns: 1fr;
  gap: 0.9rem;
  padding: 1rem;
}

.seasonal-hero-copy h1 { max-width: none; }
.seasonal-hero-covers { gap: 0.3rem; transform: none; }
.seasonal-hero-cover:nth-child(even) { transform: none; }

.seasonal-hero-shortcuts {
  grid-template-columns: 1fr;
  gap: 0.5rem;
}

.seasonal-hero-shortcuts .page-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}
~~~

- [ ] **Step 5: 运行完整自动验证**

Run:

~~~bash
npm run lint -- --ignore-pattern .worktrees
npm test
git diff --check
~~~

Expected: lint exits 0；npm test 完成严格 typecheck、vinext build 和全部 tests/*.test.mjs，0 failures；git diff --check 无输出。

- [ ] **Step 6: 提交完整的可验证 UI 切片**

先检查：

~~~bash
git status --short
git diff -- app/page.tsx app/globals.css app/layout.tsx tests/rendered-html.test.mjs
~~~

此 checkout 已有 Kimi 的相关未提交 UI 改动；仅因它们属于同一份用户批准的 UI 改版，才与本次代码一并纳入。必须包含 app/layout.tsx，否则被测试的首屏主题初始化不会随主题 CSS 一起进入提交。不要暂存无关的 AGENTS.md 改动。然后运行：

~~~bash
git add app/page.tsx app/globals.css app/layout.tsx tests/rendered-html.test.mjs
git diff --cached --check
git commit -m "feat: redesign seasonal calendar landing page"
~~~

Expected: commit 只含四个批准的运行时/测试文件，并已通过 Step 5。

### Task 4: 在真实浏览器中核对两种主题和移动端日程

**Files:**
- Verify only: app/page.tsx
- Verify only: app/globals.css

- [ ] **Step 1: 启动本地开发服务器**

Run:

~~~bash
npm run dev
~~~

Expected: vinext prints a local preview URL；若 3000 已占用，使用实际输出端口。

- [ ] **Step 2: 在桌面宽度验证默认播出表**

打开该本地 URL，依次确认：

1. 顶部是一行主导航，品牌、三个页面入口和账号区可见；不再有 13rem 左栏。
2. 默认页先出现当季标签、“这季有什么值得追？”，四张本地图集封面、季度选择和来源链接。
3. “查看本周放送”滚到周表；“今天看什么”切到当前北京时间所在周；“我的追番”变为 ?page=mine。
4. 搜索提交后仍进入 ?page=search，且从 allAnime 查询，不是当前周或当前季度子集。
5. 时间轴节目卡、详情按钮、已看方框和网络配信区域完整可用。

- [ ] **Step 3: 验证主题和移动断点**

用现有悬浮主题按钮在浅/深色间切换各一次，确认导航、编辑首屏、快捷区和周表均使用 token 切换而没有白底或低对比文字。

将 viewport 设为 860px 宽并 reload，确认：

1. 导航变为可换行胶囊按钮，账号区在下一行，页面没有横向滚动。
2. 首屏为单列，四张封面在一行且不溢出，查询和快捷区堆叠。
3. .timeline-grid 未显示，单日选择器和 .mobile-calendar 议程仍可操作。

- [ ] **Step 4: 停止临时开发服务器并记录验证结果**

停止 npm run dev。交付时写明 lint/test 的确切结果和桌面、860px、两种主题的人工结果；不要把 dist/、.wrangler/ 或浏览器临时文件加入版本控制。
