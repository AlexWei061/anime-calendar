# AGENTS.md

## 核心编码原则

### 1. 先思考，再编码

- 不要默默假设需求、架构或实现意图。
- 如果需求有多种理解，先列出可能解释。
- 如果不确定会影响实现方向，先向用户确认。
- 如果有更简单、更稳妥的方案，要主动指出。

### 2. 简洁优先

- 实现满足需求的最小方案。
- 不要添加未被要求的功能，也不要为未来可能需要的场景提前增加抽象、配置或框架。
- 保持代码短、清楚，并沿用现有项目的组织方式。

### 3. 外科手术式修改

- 只修改与当前任务直接相关的代码；不要顺带重构、格式化或清理无关文件。
- 发现无关问题可以说明，但不要擅自修改。
- 只能清理由本次改动造成的无用 import、变量或函数。

### 4. 目标驱动与验证

- 开始前说明本次任务的成功标准。
- 修 bug 时，优先添加能复现问题的测试，再做最小修复。
- 修改后运行相关测试、lint、typecheck 或 build；无法运行时说明原因和手动命令。

## 项目定位

这是一个展示 **2020 年至 2025 年四季及 2026 年 1 月、4 月与 7 月番** 的中文番剧日历。前端按北京时间显示周时间轴，
并允许连续跨季度前后翻周；移动端提供单日议程。登录同一 ChatGPT 账号的用户可以维护自己的追番列表，
并永久保存逐集“已看”标记。

技术栈：Next.js 16、React 19、TypeScript、vinext/Vite、Cloudflare Worker、Cloudflare D1、
Drizzle，以及 Node 内置测试运行器。Node.js 版本必须为 `>=22.13.0`。

## 模块地图

| 路径 | 职责 |
| --- | --- |
| `app/page.tsx` | 客户端日历界面、季度定位、周切换、桌面/移动视图、详情弹窗、个人追番与逐集已看交互。 |
| `app/globals.css` | 全站视觉样式、桌面时间轴与移动端断点（`860px`）。 |
| `app/layout.tsx` | 中文页面元数据和根布局。 |
| `app/chatgpt-auth.ts` | 读取 Sites 注入的 ChatGPT 身份，生成安全的登录/退出跳转地址。 |
| `app/api/anime-selections/route.ts` | 已登录用户的追番列表读取与整表保存 API。 |
| `app/api/anime-episode-views/route.ts` | 已登录用户的单集已看标记读取与单条更新 API。 |
| `data/anime.js` | 2020 年至 2025 年四季及 2026 年 1／4／7 月季度入口、7 月 YUC 目录（含人工核对的特殊先行排期）和统一的 `allAnime` 目录。 |
| `data/anilist-<year>.js` | 由 AniList 导入脚本生成的历史排期原始资料。 |
| `data/yuc-history-<year>.js` | 由 YUC 历史导入脚本生成的目录；不得手工编辑。 |
| `data/cover-sprites.js` | 由图集脚本生成的逻辑封面路径到本地 WebP 图集坐标的映射；不得手工编辑。 |
| `scripts/generate-anilist-pilot.mjs` | 拉取指定年份的 AniList 首播、时刻与集数资料。 |
| `scripts/generate-yuc-history-pilot.mjs` | 合并 YUC 中文名/封面与 AniList 排期，下载本地封面并生成历史目录。 |
| `scripts/convert-covers-to-webp.mjs` | 将下载的独立封面无损转换为 WebP，并同步目录中的逻辑封面路径。 |
| `scripts/generate-cover-sprites.mjs` | 将全部 WebP 封面打包为 4×10、quality 90 的网格图集，生成映射并移除已打包的独立文件。 |
| `lib/calendar.js` | ISO 日期计算、每周集数展开、凌晨时刻显示、时间轴裁切与布局。 |
| `lib/schedule.js` | JST 转北京时间和按星期归类的通用排期辅助函数。 |
| `lib/anime-selections.js` | API 提交的番剧 ID 去重与白名单校验。 |
| `lib/anime-episode-views.js` | 已看单集的稳定键、白名单校验与乐观更新辅助函数。 |
| `db/schema.ts`、`db/index.ts` | D1 表定义及数据库连接。 |
| `drizzle/` | 已生成的 D1 迁移；与 schema 共同构成数据库历史。 |
| `worker/index.ts` | vinext 的 Cloudflare Worker 入口和图片优化处理。 |
| `vite.config.ts`、`build/sites-vite-plugin.ts` | 本地 Cloudflare 绑定模拟，以及构建后打包 Sites 元数据和迁移。 |
| `.openai/hosting.json` | Sites 的逻辑资源声明；当前 D1 绑定名为 `DB`。 |
| `public/covers/yuc/sprites/` | 运行时使用的本地 WebP 封面图集；单格为 600×750，避免部署包包含大量独立封面文件。 |
| `tests/` | 数据、排期算法、存储校验和构建后 HTML 的回归测试。 |
| `docs/superpowers/` | 历史设计和实施计划，仅作决策背景，不是运行时代码。 |

## 番剧数据规则

- `data/anime.js` 是季度和 `allAnime` 的入口；每个 `id` 必须稳定且全局唯一，不能用标题作为身份标识。
- 历史目录由 `scripts/generate-yuc-history-pilot.mjs <year>` 写入 `data/yuc-history-<year>.js`；先运行
  `scripts/generate-anilist-pilot.mjs <year>` 更新 AniList 原始资料，再生成历史目录。不要手工编辑生成结果。
- 每个季度的 `catalogCount` 必须等于该季度 `anime.length`。每个条目都要有中日标题、集数、来源、封面路径和无障碍替代文本。
- 所有封面均在本地处理，页面运行时不依赖第三方图片链接。条目的 `coverUrl` 是稳定的逻辑封面键：7 月使用稳定 slug，历史目录使用 `history-<year>-*`；它不一定对应单独的静态文件。
- 运行时封面由 `data/cover-sprites.js` 映射到 `public/covers/yuc/sprites/` 中的 4×10 WebP 图集。中间封面使用无损 WebP，最终图集使用 quality 90；更新或新增封面后，依次运行 `npm run convert:covers-webp` 和 `npm run generate:cover-sprites`。不要手工编辑图集或映射文件，也不要恢复为每部番一个部署静态文件。
- 所有数据字段按来源逐项合并，优先级为 YUC → AniList → しょぼいカレンダー → 估算或 `null`；低优先级来源只能补空值，不能覆盖已有值。中文名和封面始终来自 YUC，并为已填入字段保留 `*Source` 审计标记。
- 2026 年 7 月番的 `premiereDateBeijing`、`scheduleWeekday` 和 `beijingTime` 直接来自 YUC 北京时间排期；YUC 未列总集数时用 AniList 补充。历史目录中的 YUC 网络首播日期优先于之后的电视台排期；AniList 缺少首播日期、周播日或分钟时刻时，才由しょぼい补齐。
- 修改 2026 年 7 月的 YUC 目录时，同时核对 YUC 周表和作品详情中的 `broadcast_r`。若详情写有“`M/D先行N话`”及之后的固定周播，必须写入 `premiereDateBeijing`、`premiereKind: "network"`、`premiereEpisodeCount` 和 `regularBroadcastStartDateBeijing`；先行段为第 1 至 N 集，固定周播从第 N+1 集开始。
- 没有明确时刻的网络首播必须保留 `null`，由页面放入日期专属的“网络配信 · 时刻未定”区域，不能虚构时间；即使之后有固定电视周播，也要将先行集数与后续周播集数分开排期，不能把先行集数塞入之后的电视时段。
- 凌晨 `00:00` 至 `04:59` 的节目在周历中显示在前一天栏目的“次日 HH:MM”时段；必须通过
  `formatBroadcastTime` 和现有日期布局逻辑处理，不要在页面中手工挪动日期。
- 未明确集数时按当前数据约定写入 `12`；首播包含多集时使用 `premiereEpisodeCount`。周历由
  `eventsForWeek` 与 `dateOnlyEventsForWeek` 根据首播日期、首播集数、后续固定周播起始日和总集数展开，不要在页面中重复这套计算。
- 改动目录、时间、集数或封面时，更新相应测试断言；封面改动还必须重新生成图集和映射。保留数据来源 URL 和 `season.updatedAt` 的审计价值。

## 前端与交互约定

- 当前产品是单页客户端日历。将排期和布局计算留在 `lib/`，`app/page.tsx` 负责状态与渲染；避免在 JSX 中复制日期、时区或分栏算法。
- 桌面时间轴以当周事件动态裁切：最早节目向下取整到整点，最晚节目加卡片高度后向上取整。空周回退为 05:00 至次日 05:00；不要改为堆叠或横向滚动，除非需求明确要求。
- “播出表”周历使用 `allAnime`；“我的番剧”周历使用其中已收藏的作品。右上角季度选择器只跳到所选季度的 `firstWeekStart`，不限制周历可显示的季度。网络放送列表仍只显示当前选择季度的内容。
- 小于等于 `860px` 时必须保持现有单日选择器和议程，不能只修改桌面网格。桌面端的周导航与表头吸顶规则也必须在移动端关闭。
- 节目详情使用原生 `<dialog>`。打开元素需要在关闭后恢复焦点，所有可点击节目卡应保留正确的按钮语义和 `aria` 标签。
- 每张节目卡右上角都有独立于详情按钮的 `0.75rem` 已看方框；状态按番剧 ID、首播集数和当前集数区分，必须保留 `aria-pressed` 和逐集 `aria-label`。
- 已看节目卡只可轻微淡化并保留封面彩色，不能使用灰度滤镜；桌面时间轴和移动议程必须保持一致。
- “播出表”和“我的番剧”通过 `?page=mine` 切换。修改路由状态时保留浏览器后退/前进支持，不要改成仅有 React 内部状态的页面切换。

## 个人追番与数据库边界

- 追番列表是服务器端、按 ChatGPT 邮箱隔离的数据；浏览器不能决定用户邮箱。API 必须先调用 `getChatGPTUser()`，未登录时返回 `401`。
- 写入前必须通过 `filterKnownAnimeIds` 去重并过滤掉不在 `allAnime` 中的 ID；保存采用“该用户整表替换”的现有语义。
- D1 单条语句最多绑定 100 个参数；每个追番写入会绑定邮箱和番剧 ID 两个参数，所以插入必须按最多 50 个 ID 分批。删除旧列表与所有插入批次必须放进同一次 `db.batch()`，保持原子替换；不要先删除再单独插入，否则大列表插入失败会清空用户原有追番。
- 已看标记同样按 ChatGPT 邮箱隔离并永久保存在 D1；单条记录由 `animeId`、`episodeStart` 和 `episode` 唯一标识。API 必须先认证，再通过 `validateEpisodeView` 校验，不能接受浏览器提供的用户身份。
- 认证辅助函数依赖 Sites 保留的登录路由。不要在应用内实现 `/signin-with-chatgpt`、`/signout-with-chatgpt` 或 `/callback`。
- 修改 D1 schema 时，同时更新 `db/schema.ts` 并运行 `npm run db:generate`，检查新迁移后将其提交。不要手写与 schema 不一致的 SQL。
- 保持 `.openai/hosting.json` 的逻辑 D1 声明和 `getDb()` 使用的 `DB` 绑定一致；不要把真实资源 ID、密钥或环境变量写入仓库。

## 构建与部署边界

- 项目使用 vinext 输出 Cloudflare Worker 兼容的 ESM；保留 `worker/index.ts`、`vite.config.ts` 和 `sites()` 插件的现有形状。
- `build/sites-vite-plugin.ts` 会将 `.openai/hosting.json` 和 `drizzle/` 复制到 `dist/.openai/`。不要手动编辑 `dist/`、`.next/` 或 `.wrangler/` 生成物。
- 部署前保留生成后的图集和 `data/cover-sprites.js`；不要将已打包的封面还原为大量独立静态资源，以免超过 Sites 的静态文件承载范围。
- 本地开发绑定由 `vite.config.ts` 模拟；应用级环境变量放在被忽略的 `.env*` 中。不提交凭据、真实数据库 ID 或 Wrangler/Miniflare 本地状态。
- 发布到 GitHub 和 Sites 时，先验证构建，再提交并推送同一个 `main` 提交；Sites 保存的版本必须引用该提交及其对应的构建产物。若 Sites 源仓库有并发更新，先合并并验证，绝不强制推送覆盖对方改动。
- Sites 默认保持私有访问；只有用户明确要求改变可见范围时才调整访问设置。发布完成后以部署状态为准，确认成功再交付站点 URL。

## 开发与验证

```bash
npm install
npm run dev                                      # 本地开发
npm run build                                    # vinext/Worker 构建
npm run lint -- --ignore-pattern .worktrees      # ESLint，忽略嵌套 worktree
npm test                                         # 先构建，再运行 tests/*.test.mjs
```

- 改 bug 先在对应的 `tests/*.test.mjs` 添加能失败的回归测试，再做最小修复。
- 涉及“先行多集 + 后续周播”的排期，回归测试必须同时断言：先行日显示正确的集数范围且没有虚构时刻，首个固定周播日从下一集开始。
- 数据、排期、UI、认证或数据库改动完成后，至少运行 `npm run lint -- --ignore-pattern .worktrees` 和 `npm test`。`npm test` 会导入构建后的 Worker 并检查服务端 HTML，因此不能用只跑 TypeScript 检查替代它。
- 只改动与需求直接相关的文件。不要顺带格式化大文件、升级依赖、重写模板配置或删除历史设计文档。
- 测试应验证用户可见行为和数据约束；不要为了让测试通过而削弱数据校验、认证或无障碍语义。
- 若本文件用于仓库级约定，内容定稿后必须纳入版本控制；未跟踪的 `AGENTS.md` 不会随克隆或新 worktree 提供给后续开发者。
