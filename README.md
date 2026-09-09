# 番剧日历

一个按北京时间展示新番的中文播出日历；当前收录 2020 年至 2025 年四季，以及 2026 年 1 月、4 月、7 月番（共 27 个季度、1,514 部作品）。

## 功能

- 桌面端按周显示时间轴；手机端按天显示日程。
- 可用“上一周／下一周”连续跨季度查看仍在播出的作品；右上角季度选择器只负责跳到所选季度的首周。
- 0:00–4:59 的节目显示在前一天栏目的“次日”时段。
- 时间轴按当前周最早和最晚的定时节目自动裁去上下空白；没有定时节目时显示 05:00 至次日 05:00。
- YUC 标注“先行 N 话”的网络配信会单独显示第 1 至 N 集；之后的固定周播从下一集开始。未公布分钟时刻的网络放送不会被虚构成电视播出时间。
- 注册或登录站内邮箱账号后，可在“我的番剧”保存追番列表，并在周历中只查看已选择作品。
- 每集节目卡右上角有一个小方框；点按可标记本周更新的这一集“已看”。记录按站内邮箱账号永久保存，已看卡片只会轻微变淡，封面仍保留彩色。
- 可进入“查询番剧”搜索全部已收录作品，支持中文和日文标题，不受当前日历周或季度限制。
- 查询结果一部番剧一行，显示更清楚的封面，以及是否追番、已看集数和观看进度；未加入追番列表的作品会标为“未追番”。
- 追番统计提供总体／季度观看进度、今日播出与待看列表；详情内可逐集修改观看状态。
- 支持明暗主题、账号密码修改和裁剪上传私有头像；登录后跨设备同步个人数据。

## 自己的域名与服务器

当前版本使用 **Next.js + SQLite + 私有本地头像存储**，通过 **Docker Compose + Caddy** 运行在单台服务器上。准备域名和香港服务器后，按 [部署指南](docs/deployment.md) 配置 DNS、HTTPS、持久化目录与备份即可上线。代码不再依赖 Sites、Cloudflare Worker、D1 或 R2 服务。

已有旧站数据可通过 D1 SQL 与 R2 头像导出文件迁入；迁移保留密码哈希、追番和逐集已看，用户需要重新登录。本次代码重构不会自动迁移数据或修改旧站。

## 数据与封面

- 排期信息按字段核对：YUC 优先，其次 AniList，再由しょぼいカレンダー补齐仍为空的字段；低优先级来源不会覆盖已有信息。中文名和封面始终来自 YUC。
- 2026 年 7 月番直接使用 YUC 当前季排期；其余已收录季度的首播日期、每周播出时间和集数也按上述优先级逐项补齐，并保留字段来源用于审计。
- 网络先行配信的日期与集数范围优先保留 YUC 记录，后续电视台周播只补充尚未列出的字段，不能覆盖网络首播。
- 所有日历封面都在本地：每部作品保留稳定的逻辑封面路径，由 `data/cover-sprites.js` 映射到 `public/covers/yuc/sprites/` 下的 WebP 图集。页面运行时不依赖第三方图片链接。
- 图集按 4×10 网格生成，每格封面为 600×750。中间封面无损转换，最终图集使用 WebP quality 90；这样既保留单张封面清晰度，也降低部署时的静态文件数量。
- 季度与统一作品目录入口在 `data/anime.js`；历史目录使用 `data/yuc-history-<year>.js`，电视排期快照使用 `data/syoboi-history-<year>.js`。二者分别由 `scripts/generate-yuc-history-pilot.mjs` 和 `scripts/generate-syoboi-history.mjs` 生成。

## 本地运行

推荐 Node.js 24 LTS，最低 `>=22.13.0`。SQLite 驱动需要对应系统的原生模块；若无法下载预编译包，需安装 Python 与 C/C++ 编译工具。

```bash
npm ci
cp .env.example .env
npm run dev
```

打开 `http://localhost:3000`。首次请求数据库时自动应用 `drizzle/` 中的迁移；数据默认保存到被 Git 忽略的 `storage/`，重启服务不会清空。

局域网测试时，将 `.env` 的 `APP_ORIGIN` 改为手机实际访问的完整地址（如 `http://192.168.1.10:3000`），重启开发服务；写入请求会校验这个来源。

本地体验生产构建：

```bash
npm run build
APP_ORIGIN=http://localhost:3000 ALLOW_INSECURE_LOCALHOST=1 HOSTNAME=127.0.0.1 npm start
```

生产环境必须设置真实的 HTTPS `APP_ORIGIN`；上面的 HTTP 例外仅用于本机验证。环境变量、存储目录、升级与恢复命令见 [部署指南](docs/deployment.md)。

## 验证与数据更新

```bash
npm run typecheck
npm run build
npm test
npm run lint -- --ignore-pattern .worktrees
node scripts/generate-anilist-pilot.mjs <year>
node scripts/generate-yuc-history-pilot.mjs <year>
node scripts/generate-syoboi-history.mjs <year>
npm run convert:covers-webp
npm run generate:cover-sprites
```

- `npm run typecheck`：执行 TypeScript 严格类型检查。
- `npm test`：先进行严格类型检查和构建，再启动使用临时 SQLite 的生产服务，验证排期、图集、SSR、真实 HTTP 账号流程、事务回滚和备份恢复；结束后自动清理测试服务和临时数据。
- `npm run test:unit`：快速执行测试文件，但跳过需要生产服务的 HTTP／SSR 检查，不能替代完整测试。

`npm run generate:anilist-pilot -- 2026` 会更新 2026 年 1 月、4 月、7 月的 AniList 原始资料；`npm run generate:yuc-history-pilot -- 2026` 只更新 2026 年 1 月、4 月历史目录。7 月当前季目录位于 `data/anime.js`，更新时还要核对 YUC 作品详情的先行配信信息。带 `2020` 至 `2025` 参数的命令用于四季历史资料。

更新或新增历史季度的完整顺序是：先运行 AniList 导入与第一次 YUC 历史目录生成，再运行 しょぼい排期导入，随后第二次生成 YUC 历史目录以合并新快照；最后运行 `npm run convert:covers-webp`、`npm run generate:cover-sprites`、`npm test` 和 lint。图集脚本会生成映射并删除已打包的独立封面文件，不要手工修改 `data/cover-sprites.js` 或恢复独立封面文件。

历史目录更新会保留已收录作品的 ID 与逻辑封面路径；身份匹配有歧义时停止生成。图集生成支持从旧图集恢复输入、合并新封面，并在全部输出就绪后切换映射。改变旧图集布局时可能发生一次重新编码，应保留生成前的版本以便对比。

## 代码结构

- `app/page.tsx` 组织页面路由；`app/components/` 按账号、日历、搜索、统计和详情拆分界面。
- `app/hooks/` 管理账号／个人数据、请求状态、时间与主题；`app/styles/` 保持现有样式和断点。
- `lib/` 保留可独立测试的排期、观看状态和数据规则；`lib/server/` 处理请求边界与私有头像。
- `db/` 与 `drizzle/` 管理 SQLite 连接和版本迁移；`scripts/` 管理目录生成、构建产物、备份与导入。

`teach/` 是独立的历史教学材料，未随本次运行时迁移改写；其 Cloudflare 示例不能作为当前部署步骤。
