# 2026 番剧日历

一个按北京时间展示 2026 年 1 月、4 月和 7 月新番的中文播出日历。

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

- 7 月番的中文名、封面与播出排期来自 YUC。
- 1 月、4 月番使用 YUC 的中文名和本地保存的封面；首播日期、每周播出时间和集数来自 AniList 的历史资料。
- 所有日历封面均保存在 `public/covers/yuc/`，页面运行时不依赖第三方图片链接。
- 季度与统一作品目录入口在 `data/anime.js`；1 月、4 月的生成结果在 `data/yuc-history-2026.js`，由 `scripts/generate-yuc-history-pilot.mjs` 更新。

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
npm run generate:anilist-pilot
npm run generate:yuc-history-pilot
```

- `npm test`：构建应用并验证日历数据、集数排期和渲染后的时间表。

最后两条命令用于重新生成 2026 年 1 月、4 月的历史资料；生成后应检查数据与封面变更，再运行测试。
