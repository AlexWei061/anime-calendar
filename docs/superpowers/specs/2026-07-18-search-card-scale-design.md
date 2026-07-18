# 查询结果卡片放大 Design

## 目标

让“查询番剧”页的一行一部结果卡更醒目：竖版封面宽度翻倍，文字和进度信息同步略微放大，避免大封面旁留下过多空白。

## 范围

- 仅调整 `?page=search` 中 `.anime-search-results` 内的统计样式卡片。
- 不改变追番统计页、日历卡片、搜索逻辑、状态文案或任何数据/API 行为。

## 视觉方案

- 搜索结果卡的首列和封面宽度由 `3rem` 调整为 `6rem`；封面保持 `3 / 4` 比例，因此高度为 `8rem`。
- 搜索结果卡增加适度内边距和内容间距；标题为 `1.05rem`，辅助文字为 `0.82rem`，进度条高为 `0.4rem`。
- 状态标签继续靠右上角显示，单列列表和既有移动端布局保持不变。

## 实现与验证

- 在 `app/globals.css` 中新增只由 `.anime-search-results` 限定的覆盖规则，复用现有 `.statistics-anime-card` 组件样式。
- 在 `tests/rendered-html.test.mjs` 的全局搜索渲染测试中加入静态 CSS 断言，锁定搜索页专属的封面、文字和进度尺寸。
- 先运行该回归测试确认失败，再做最小 CSS 改动；随后运行 `npm run lint -- --ignore-pattern .worktrees` 与 `npm test`。
