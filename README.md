# 番剧日历

一个按北京时间展示新番的中文播出日历；当前收录 2020 年至 2025 年四季，以及 2026 年 1 月、4 月、7 月番（共 27 个季度、1,514 部作品）。

## 功能

- 桌面端按周显示时间轴；手机端按天显示日程。
- 可用“上一周／下一周”连续跨季度查看仍在播出的作品；右上角季度选择器只负责跳到所选季度的首周。
- 0:00–4:59 的节目显示在前一天栏目的“次日”时段。
- 时间轴按当前周最早和最晚的定时节目自动裁去上下空白；没有定时节目时显示 05:00 至次日 05:00。
- 登录 ChatGPT 后可在“我的番剧”保存追番列表，并在周历中只查看已选择作品。
- 每集节目卡右上角有一个小方框；点按可标记本周更新的这一集“已看”。记录按当前 ChatGPT 账号永久保存，已看卡片只会轻微变淡，封面仍保留彩色。

## 线上访问

已部署到仅限当前 ChatGPT 账号访问的私有 Sites：

<https://bang-shibiao-2026-summer.aty-wei.chatgpt.site>

## 数据与封面

- 2026 年 7 月番的中文名、封面与播出排期来自 YUC。
- 2020 年至 2025 年四季及 2026 年 1 月、4 月番使用 YUC 的中文名和本地保存的封面；首播日期、每周播出时间和集数来自 AniList 的历史资料。
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

`npm run generate:anilist-pilot` 和 `npm run generate:yuc-history-pilot` 默认更新 2026 年 1 月、4 月资料；带 `2020` 至 `2025` 参数的命令用于四季历史资料。

更新或新增历史季度的完整顺序是：先运行两个带年份参数的生成命令，再运行 `npm run convert:covers-webp` 与 `npm run generate:cover-sprites`，最后执行 `npm test` 和 lint。图集脚本会生成映射并删除已打包的独立封面文件，不要手工修改 `data/cover-sprites.js` 或恢复独立封面文件。
