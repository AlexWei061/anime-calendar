# 番剧日历

一个按北京时间展示新番的中文播出日历；当前收录 2020 年至 2025 年四季，以及 2026 年 1 月、4 月、7 月番（共 27 个季度、1,514 部作品）。

## 功能

- 桌面端按周显示时间轴；手机端按天显示日程。
- 可用“上一周／下一周”连续跨季度查看仍在播出的作品；右上角季度选择器只负责跳到所选季度的首周。
- 0:00–4:59 的节目显示在前一天栏目的“次日”时段。
- 时间轴按当前周最早和最晚的定时节目自动裁去上下空白；没有定时节目时显示 05:00 至次日 05:00。
- YUC 标注“先行 N 话”的网络配信会单独显示第 1 至 N 集；之后的固定周播从下一集开始。未公布分钟时刻的网络放送不会被虚构成电视播出时间。
- 登录 ChatGPT 后可在“我的番剧”保存追番列表，并在周历中只查看已选择作品。
- 每集节目卡右上角有一个小方框；点按可标记本周更新的这一集“已看”。记录按当前 ChatGPT 账号永久保存，已看卡片只会轻微变淡，封面仍保留彩色。

## 线上访问

已部署到仅限当前 ChatGPT 账号访问的私有 Sites：

<https://bang-shibiao-2026-summer.aty-wei.chatgpt.site>

## 数据与封面

- 排期信息按字段核对：YUC 优先，其次 AniList，再由しょぼいカレンダー补齐仍为空的字段；低优先级来源不会覆盖已有信息。中文名和封面始终来自 YUC。
- 2026 年 7 月番直接使用 YUC 当前季排期；其余已收录季度的首播日期、每周播出时间和集数也按上述优先级逐项补齐，并保留字段来源用于审计。
- 网络先行配信的日期与集数范围优先保留 YUC 记录，后续电视台周播只补充尚未列出的字段，不能覆盖网络首播。
- 所有日历封面都在本地：每部作品保留稳定的逻辑封面路径，由 `data/cover-sprites.js` 映射到 `public/covers/yuc/sprites/` 下的 WebP 图集。页面运行时不依赖第三方图片链接。
- 图集按 4×10 网格生成，每格封面为 600×750。中间封面无损转换，最终图集使用 WebP quality 90；这样既保留单张封面清晰度，也降低部署时的静态文件数量。
- 季度与统一作品目录入口在 `data/anime.js`；历史目录使用 `data/yuc-history-<year>.js`，由 `scripts/generate-yuc-history-pilot.mjs` 更新。

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

## 验证与数据更新

```bash
npm run build
npm test
npm run lint -- --ignore-pattern .worktrees
node scripts/generate-anilist-pilot.mjs <year>
node scripts/generate-yuc-history-pilot.mjs <year>
npm run convert:covers-webp
npm run generate:cover-sprites
```

- `npm test`：构建应用并验证日历数据、集数排期、封面图集映射和渲染后的时间表。

`npm run generate:anilist-pilot -- 2026` 会更新 2026 年 1 月、4 月、7 月的 AniList 原始资料；`npm run generate:yuc-history-pilot -- 2026` 只更新 2026 年 1 月、4 月历史目录。7 月当前季目录位于 `data/anime.js`，更新时还要核对 YUC 作品详情的先行配信信息。带 `2020` 至 `2025` 参数的命令用于四季历史资料。

更新或新增历史季度的完整顺序是：先运行两个带年份参数的生成命令，再运行 `npm run convert:covers-webp` 与 `npm run generate:cover-sprites`，最后执行 `npm test` 和 lint。图集脚本会生成映射并删除已打包的独立封面文件，不要手工修改 `data/cover-sprites.js` 或恢复独立封面文件。
