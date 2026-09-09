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
并允许连续跨季度前后翻周；移动端提供单日议程。注册登录账号的用户可以维护自己的追番列表，
并永久保存逐集“已看”标记。

技术栈：标准 Next.js 16 App Router、React 19、TypeScript、Node.js、SQLite、Drizzle 的
`better-sqlite3` 适配器，以及 Node 内置测试运行器。Node.js 版本必须为 `>=22.13.0`；
生产使用 Next.js standalone、单实例 Docker 和 Caddy HTTPS 反向代理。账号数据库与私有头像保存在服务器的 `DATA_DIR`。

## 模块地图

| 路径 | 职责 |
| --- | --- |
| `app/page.tsx` | 客户端入口和 Provider 组合；维护四页面 URL 状态、查询词、跨页面保留的周历位置与统计筛选状态。 |
| `app/catalog.ts`、`app/types.ts`、`app/display.ts` | 前端目录索引、共享类型与日期／进度显示文案。 |
| `app/components/calendar-page.tsx`、`app/components/calendar-schedule.tsx` | 季度与周导航、桌面时间轴、移动单日议程、网络放送列表。 |
| `app/components/calendar-cards.tsx`、`app/components/cover-art.tsx` | 日历节目卡、逐集已看入口与本地封面图集渲染。 |
| `app/components/today-watch.tsx`、`app/components/selection-panel.tsx` | 我的番剧今日播出与本季度追番选择。 |
| `app/components/statistics-page.tsx`、`app/components/search-page.tsx`、`app/components/statistics-anime-card.tsx` | 追番统计、全库查询及共享进度卡。 |
| `app/components/account.tsx`、`app/components/anime-detail.tsx`、`app/avatar-editor.tsx` | 账号菜单与认证弹窗、原生详情弹窗、头像裁剪与上传。 |
| `app/components/page-heading.tsx` | 页面标题、查询框与页面操作区。 |
| `app/hooks/use-viewer.tsx`、`app/hooks/library-state.js` | 账号及个人追番状态、API 请求、会话切换隔离、乐观更新与按单集回滚。 |
| `app/hooks/use-display.ts` | 北京时间／放送日时钟订阅，以及主题切换、持久化和系统主题跟随。 |
| `app/globals.css`、`app/styles/` | 按原顺序导入主题基础、导航账号、页面、统计查询、日历、弹窗和响应式样式；移动断点为 `860px`。 |
| `app/layout.tsx` | 中文页面元数据、根布局与首屏主题脚本。 |
| `app/auth.ts` | 基于 `ac_session` Cookie 和 SQLite 会话表的账号认证；会话签发、校验与销毁，Cookie 安全属性由配置的公开来源决定。 |
| `lib/auth.js`、`lib/avatar.js` | 账号格式与密码／令牌哈希；头像大小、WebP 格式、版本 URL 与账号哈希对象键。 |
| `lib/server/http.js` | 写请求来源校验、受限 JSON 读取、认证限流、私有响应和脱敏错误日志。 |
| `lib/server/avatar-storage.js` | `DATA_DIR` 内的私有头像读写、路径与符号链接校验、失败清理和旧版本删除。 |
| `app/api/auth/` | 注册、登录、退出、当前用户、改密与私有头像 API。 |
| `app/api/anime-selections/route.ts` | 已登录用户的追番列表读取与整表原子替换。 |
| `app/api/anime-episode-views/route.ts` | 已登录用户的逐集已看读取、批量原子更新与旧连播范围迁移。 |
| `app/api/health/route.ts` | 通过实际读取 SQLite 迁移表检查服务健康。 |
| `data/anime.js` | 2020 年至 2025 年四季及 2026 年 1／4／7 月季度入口、7 月 YUC 目录（含特殊先行排期）和统一的 `allAnime`。 |
| `data/anilist-<year>.js` | 由 AniList 导入脚本生成的历史排期原始资料。 |
| `data/yuc-history-<year>.js` | 由 YUC 历史导入脚本生成的目录；不得手工编辑。 |
| `data/syoboi-history-<year>.js` | 由しょぼい导入脚本生成的电视排期快照，供历史目录补空值；不得手工编辑。 |
| `data/cover-sprites.js` | 逻辑封面路径到本地图集坐标的生成映射，支持缩略图／详情变体；不得手工编辑。 |
| `scripts/generate-anilist-pilot.mjs` | 拉取指定年份的 AniList 首播、时刻与集数资料。 |
| `scripts/generate-yuc-history-pilot.mjs`、`lib/catalog-identity.js` | 合并 YUC、AniList 与已有しょぼい快照，保留旧 ID／封面键，下载封面并生成历史目录。 |
| `scripts/generate-syoboi-history.mjs` | 按当前历史目录匹配并抓取しょぼい电视排期，生成年度快照。 |
| `scripts/convert-covers-to-webp.mjs` | 无损转换新增独立封面并同步目录的逻辑封面扩展名。 |
| `scripts/generate-cover-sprites.mjs` | 从独立封面和已有图集重建详情／缩略图，完成后替换映射并清理旧产物。 |
| `lib/calendar.js`、`lib/schedule.js` | ISO 日期、逐周排期、凌晨显示、时间轴布局，以及 JST 转北京时间。 |
| `lib/anime-search.js`、`lib/anime-statistics.js`、`lib/anime-labels.js` | 全库标题匹配、观看进度／今日播出聚合、网络放送文案。 |
| `lib/anime-selections.js`、`lib/anime-episode-views.js` | ID 白名单、单集稳定键与范围校验、可标记单元展开及乐观更新辅助函数。 |
| `db/schema.ts`、`db/index.ts`、`db/sqlite.js` | SQLite schema、进程内连接、数据路径、WAL 设置及带校验和的迁移执行。 |
| `drizzle/`、`scripts/migrate-db.mjs` | 已生成 SQL 和迁移 journal，以及显式迁移命令；与 schema 共同构成数据库历史。 |
| `next.config.ts`、`scripts/package-standalone.mjs` | 标准 Next standalone 构建；补齐静态资源、SQL 迁移和运维脚本。 |
| `Dockerfile`、`compose.yaml`、`Caddyfile` | 非 root Node 容器、持久化目录、健康检查及域名 HTTPS 反向代理。 |
| `scripts/storage.mjs`、`scripts/backup.mjs`、`scripts/restore.mjs`、`scripts/import-d1.mjs` | 数据库与当前头像的一致性备份、校验恢复，以及旧 D1 SQL／R2 对象的显式离线导入。 |
| `public/covers/yuc/sprites/` | 运行时 WebP 图集；详情单格 600×750、缩略图单格 300×375，每页最多 4×10 格。 |
| `scripts/test.mjs`、`tests/` | 数据与客户端回归、SQLite／文件故障测试，以及启动真实 standalone 服务后的 HTTP 和服务端 HTML 测试。 |
| `docs/deployment.md` | 自有域名服务器部署、环境配置、备份恢复和旧数据导入操作说明。 |
| `docs/superpowers/` | 历史设计和实施计划，仅作决策背景，不是运行时代码。 |

## 番剧数据规则

- `data/anime.js` 是季度和 `allAnime` 的入口；每个 `id` 必须稳定且全局唯一，不能用标题或列表序号直接生成可变的身份标识。
- 历史目录重生成必须通过 `createCatalogIdentityResolver` 保留已有 `id` 与逻辑 `coverUrl`；来源重排、插入新作品或后续匹配到 AniList 都不能重编号旧作品。优先复用持久化的 YUC 来源标识／URL／封面来源；没有旧来源标识时，只允许同季度唯一的中日标题联合匹配。身份歧义、重复、单边改名未匹配或旧作品缺失时应停止发布并核对来源，不能静默丢弃旧 ID，否则账号追番与已看记录会失联。
- 历史目录由 `scripts/generate-yuc-history-pilot.mjs <year>` 写入 `data/yuc-history-<year>.js`，しょぼい快照由
  `scripts/generate-syoboi-history.mjs <year>` 写入 `data/syoboi-history-<year>.js`。只更新 AniList/YUC 目录时，先运行
  AniList 再生成历史目录；重新核对电视排期时，顺序必须是 AniList → YUC 目录 → しょぼい快照 → 再生成 YUC 目录，才能把新快照合并回最终目录。不要手工编辑生成结果。
- 每个季度的 `catalogCount` 必须等于该季度 `anime.length`。每个条目都要有中日标题、集数、来源、封面路径和无障碍替代文本。
- 所有封面均在本地处理，页面运行时不依赖第三方图片链接。条目的 `coverUrl` 是稳定的逻辑封面键：7 月使用稳定 slug，历史目录使用 `history-<year>-*`；它不一定对应单独的静态文件。
- 运行时封面由 `data/cover-sprites.js` 映射到 `public/covers/yuc/sprites/` 中每页最多 4×10 格的 WebP 图集。中间封面使用无损 WebP，详情图集使用 quality 90、缩略图集使用 quality 82；更新或新增封面后，依次运行 `npm run convert:covers-webp` 和 `npm run generate:cover-sprites`。不要手工编辑图集或映射文件，也不要恢复为每部番一个部署静态文件。
- 图集必须能在独立封面已删除的正常仓库中重建：复用旧映射裁切已有详情图集并合入新封面，未变化的页直接保留原字节，避免重复有损压缩。生成器先准备全部文件，再用内容标识的新文件名发布图集并原子替换映射，成功后才删除旧图和独立封面；缺少输入或发布失败时必须保持旧映射及其图片可用。
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

- 当前产品是单页客户端日历。将排期和布局计算留在 `lib/`；`app/page.tsx` 只组合页面与 Provider，并保留跨页面状态；界面分在 `app/components/`，个人状态与请求集中在 `app/hooks/use-viewer.tsx`。避免在 JSX 中复制日期、时区或分栏算法。
- 账号切换后不得把旧请求结果或旧乐观回滚写入新账号状态；已看请求失败时只恢复该请求涉及的单集，保留其他已完成更新及原有的部分已看状态。
- 全站是亮色（樱花粉彩）与暗色（霓虹夜色）双主题：颜色只能通过 `app/styles/tokens-base.css` `:root` 中的设计 token
  （`--accent`、`--accent-2`、`--paper` 等）消费，暗色由 `:root[data-theme="dark"]` 内同名 token 覆盖实现。
  主题由常驻右下角的“深色模式／浅色模式”浮动按钮手动切换，选择持久化在 localStorage `ac-theme`；`app/layout.tsx` 的
  内联脚本在首屏前按“手动选择优先、否则跟随系统”写入 `<html data-theme>`，未手动选择时继续跟随系统变化。
  新增或调整颜色时必须同时维护两套主题取值并使用 token，不要在组件规则里写硬编码色值；保持 `app/globals.css` 的样式导入顺序，响应式覆盖规则最后加载。
- 桌面时间轴以当周事件动态裁切：最早节目向下取整到整点，最晚节目加卡片高度后向上取整。空周回退为 05:00 至次日 05:00；不要改为堆叠或横向滚动，除非需求明确要求。
- “我的番剧”的“今日播出”按 `currentCalendarDate` 放送日聚合，凌晨节目计入前一天；“追番统计”的“今日播出”仍按北京时间自然日聚合，不能把两者混成同一种日期语义。
- “播出表”周历使用 `allAnime`；“我的番剧”周历使用其中已收藏的作品。右上角季度选择器只跳到所选季度的 `firstWeekStart`，不限制周历可显示的季度。网络放送列表仍只显示当前选择季度的内容。
- “查询番剧”的入口是“播出表”“我的番剧”“追番统计”页面上方的查询框，提交后跳转到 `?page=search` 结果页；侧边栏没有独立的查询导航。结果页始终从 `allAnime` 搜索全部已收录作品，不能改为只搜索当前周、当前季度或日历中可见的节目。查询须支持中文、日文标题的规范化匹配，并保留无结果提示与浏览器前进／后退支持。
- 查询结果一部番剧占一行，复用追番统计的封面、状态与已看集数信息；必须显示是否追番以及“已看 N / 总集数”，未收藏作品显示“未追番”。查询专用卡保持 `6rem` 宽封面、较大的文字与进度条，且不得改变追番统计或日历节目卡的尺寸。
- 小于等于 `860px` 时必须保持现有单日选择器和议程，不能只修改桌面网格。桌面端的周导航与表头吸顶规则也必须在移动端关闭。
- 节目详情使用原生 `<dialog>`。打开元素需要在关闭后恢复焦点，所有可点击节目卡应保留正确的按钮语义和 `aria` 标签。详情弹窗内含追番开关、观看进度和逐集已看按钮；逐集按钮的 `(episodeStart, episode)` 单元必须来自 `episodeViewUnitsForAnime`，且每集使用独立的单集键。周历中的先行／连播可合并为一张节目卡，但其已看方框必须覆盖其中全部单集，不要在 JSX 里复制这套展开逻辑。
- 每张节目卡右上角都有独立于详情按钮的 `0.75rem` 已看方框；状态按番剧 ID、首播集数和当前集数区分，必须保留 `aria-pressed` 和逐集 `aria-label`。
- 已看节目卡只可轻微淡化并保留封面彩色，不能使用灰度滤镜；桌面时间轴和移动议程必须保持一致。
- “播出表”“我的番剧”和“追番统计”分别通过默认页、`?page=mine`、`?page=stats` 切换，查询结果页为 `?page=search`。修改路由状态时保留浏览器后退/前进支持，不要改成仅有 React 内部状态的页面切换。

## 个人追番与数据库边界

- 追番列表是服务器端、按账号邮箱隔离的数据；浏览器不能决定用户邮箱。API 必须先调用 `getSessionUser()` 校验 `ac_session` 会话 Cookie，未登录时返回 `401`。
- 写入前必须通过 `filterKnownAnimeIds` 去重并过滤掉不在 `allAnime` 中的 ID；保存采用“该用户整表替换”的现有语义。
- SQLite 写入使用 Drizzle `db.transaction((tx) => { ... })` 的同步回调，语句必须显式 `.run()`／`.get()`／`.all()` 执行；不要在事务回调内 `await` 或保留 D1 的 `db.batch()`。密码哈希、上传及其他异步工作应在事务外完成。
- 追番插入继续复用 `selectionInsertBatches` 的 50 条分批；删除旧列表和全部插入必须放在同一事务中。已看批量更新、合法旧范围的逐集迁移、注册账号与首个会话写入、改密与全部会话撤销同样必须保持原子性。故障时不得留下半份数据。
- 已看标记同样按账号邮箱隔离并永久保存在 SQLite；单条记录由 `animeId`、`episodeStart` 和 `episode` 唯一标识。API 必须先认证，再通过 `validateEpisodeViewBatch` 校验；只接受 `episodeViewUnitsForAnime` 生成的规范单集，不能接受浏览器提供的用户身份或任意集数范围。旧版本遗留的合法连播范围记录应在读取时展开并迁移为单集记录。
- 账号体系是应用自有的邮箱+密码：密码只存 `lib/auth.js` 生成的 PBKDF2 哈希，会话只存令牌的 SHA-256 哈希；数据库中不得出现明文密码或明文会话令牌。会话 Cookie 保持 `HttpOnly`、`SameSite=Lax` 与 `Path=/`；`Secure` 由可信 `APP_ORIGIN` 的 HTTPS 配置决定，不能由浏览器可伪造的转发头决定，本地 HTTP 开发仍可使用。
- 数据库文件固定为 `DATA_DIR/anime-calendar.sqlite`，`DATA_DIR` 默认 `./storage`。每个 Node 进程复用一个连接，启用 WAL、外键检查和 5 秒 busy timeout；当前部署为单实例，不要直接扩成多容器共享本地 SQLite。
- 修改 schema 时，同时更新 `db/schema.ts` 并运行 `npm run db:generate`，检查新 SQL 与 journal 后一并提交。`npm run db:migrate` 与首次连接都会执行迁移；`__app_migrations` 保存文件校验和，已应用迁移不得改写，应新增迁移。迁移失败必须回滚 schema 与迁移记录。
- 头像只保存在 `DATA_DIR/avatars/<邮箱 SHA-256>/<UUID>.webp`，不能放进 `public/` 或公开静态目录。保留大小和 WebP 校验、对象键与符号链接防护；先写新文件，数据库版本更新成功后再删旧文件，失败则清理新文件。删除头像也应先更新数据库再清理旧文件。
- `/api/auth/avatar` 必须认证并按当前账号取文件；版本参数 `v` 必须对应返回数据。只有匹配的版本 URL 使用私有 immutable 缓存，并按 Cookie 区分；无版本头像与其他个人数据响应使用 `private, no-store`。
- 所有写接口必须经 `requireSameOrigin` 检查。生产必须配置不带路径的 HTTPS `APP_ORIGIN`，写请求 `Origin` 必须精确匹配；开发使用实际访问来源。`ALLOW_INSECURE_LOCALHOST=1` 仅允许隔离测试中的生产模式回环 HTTP，不可用于公开域名。
- 保留 `readJson` 的流式体积上限、头像上传上限及认证限流的有界内存、过期清理和 `Retry-After`。仅在受控代理覆盖 `X-Real-IP`、Node 端口不公开时设置 `TRUST_PROXY=1`；其他场景忽略转发 IP。错误日志只记录操作名和安全错误码，不能包含密码、令牌、请求体或 SQL 参数。
- 旧 D1 SQL 与 R2 对象只通过显式离线导入进入新数据目录；运行时不连接 Cloudflare。导入与恢复不得覆盖已有目标目录；导入不沿用旧会话，恢复会撤销快照会话，用户需要重新登录。不要把数据库、头像、导出、备份或凭据提交到仓库。

## 构建与部署边界

- 项目使用标准 Next.js Node runtime 和 `output: "standalone"`；`better-sqlite3` 保持为服务端外部依赖。构建由 `next build --webpack` 与 `scripts/package-standalone.mjs` 组成，产物是 `.next/standalone/`。
- standalone 必须同时包含 `public/`、`.next/static/`、`drizzle/`、SQLite 辅助模块与备份／恢复／导入脚本；不要手改 `.next/` 或历史 `dist/`、`.wrangler/` 生成物。部署包保留生成图集与映射。
- Docker 使用非 root Node 用户，只运行一个应用实例，持久化挂载 `storage/` 和 `backups/`。应用的 3000 端口只供 Compose 内部访问，由 Caddy 对外开放 80／443、签发 HTTPS 并覆盖可信客户端 IP；不要直接公开 Node 端口。
- `.env` 必须与访问域名及数据目录对应；只提交 `.env.example` 占位配置，不提交实际凭据、数据库或本地状态。健康检查以 `/api/health` 实际数据库读取结果为准，不能只以进程存在作为部署成功依据。
- 数据库备份使用 SQLite backup API，并复制该快照引用的头像及校验清单；禁止只复制运行中的 `.sqlite` 主文件而遗漏 WAL。头像并发删除导致备份缺文件时应让备份失败，不能交付不完整快照。恢复和 D1／R2 导入先落到新目录、验证后再按部署文档停机切换。
- 编码、构建与本地验证不等于授权真实部署。只有用户明确要求时才提交、推送、登录服务器、切换数据目录或发布；按请求范围执行，不擅自推送或部署。发布前核对远端祖先关系并验证准确的提交与构建，遇到并发更新先合并验证，禁止强推覆盖他人更新。
- 本次仓库迁移不会自动修改、迁移或停止已经发布的旧 Sites 站点，也不会改变其访问范围或删除其 D1／R2 数据；任何旧站点操作都需要单独的明确请求。
- 自有域名部署、首次目录权限、环境变量、备份恢复及旧数据导入的具体步骤以 `docs/deployment.md` 为准；确认实际部署与健康状态后再交付站点 URL。

## 开发与验证

```bash
npm ci
npm run dev                                     # 标准 Next 本地开发
npm run typecheck                               # TypeScript 严格类型检查
npm run build                                   # Next standalone 构建与资源打包
npm run start                                   # 运行已有 standalone 构建，读取 .env
npm run db:migrate                              # 对 DATA_DIR 执行 SQL 迁移
npm run lint -- --ignore-pattern .worktrees     # ESLint，忽略嵌套 worktree
npm test                                        # 类型检查、构建、真实 HTTP 服务及全部测试
npm run test:unit                               # 无服务快速测试；HTTP/HTML 测试会跳过
```

- 改 bug 先在对应的 `tests/*.test.mjs` 添加能失败的回归测试，再做最小修复。
- 涉及“先行多集 + 后续周播”的排期，回归测试必须同时断言：先行日显示正确的集数范围且没有虚构时刻，首个固定周播日从下一集开始。
- 数据、排期、UI、认证或数据库改动完成后，至少运行 `npm run lint -- --ignore-pattern .worktrees` 和 `npm test`。`npm test` 会先运行严格类型检查和构建，再由 `scripts/test.mjs` 在临时 `DATA_DIR`、回环端口启动真实 standalone 服务，执行 `tests/*.test.mjs`，结束后清理服务与数据；不能用只跑 TypeScript 或 `test:unit` 替代它。
- 认证／数据库／头像改动需要保留真实 HTTP 的注册登录、账号隔离、请求来源与大小限制、事务故障注入、旧范围迁移、头像失败清理、改密撤销会话及退出验证。数据生成改动需要保留稳定 ID、图集可重建与发布失败保留旧产物的测试；备份导入改动需要验证还原后的记录、头像和校验清单。
- 只改动与需求直接相关的文件。不要顺带格式化大文件、升级依赖、重写模板配置或删除历史设计文档。
- 测试应验证用户可见行为和数据约束；不要为了让测试通过而削弱数据校验、认证或无障碍语义。
- 若本文件用于仓库级约定，内容定稿后必须纳入版本控制；未跟踪的 `AGENTS.md` 不会随克隆或新 worktree 提供给后续开发者。
