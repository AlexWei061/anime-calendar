# 午夜后的当前放送日

## 目标

让周时间轴的日期高光、当前时间标线和日历导航采用同一套日界线：北京时间 `00:00` 至 `04:59` 仍属于前一放送日，`05:00` 起切换到自然日。跨过午夜后不再出现日期栏已经前进、光标仍位于“次日 HH:MM”区域的错位。

## 范围

- 新增一个无副作用的日历日期映射函数，复用现有 `layoutBroadcast()` 的凌晨规则。
- 页面保留 `currentBeijingDate` 作为真实自然日，另计算 `currentCalendarDate` 作为当前放送日。
- 桌面日期表头、无时刻区域、时间轴高光、节目卡“今天”状态、首次日历定位、“回到本周”“跳到今天”和移动端默认日期使用 `currentCalendarDate`。
- 当前时间标线只有在其映射后的视觉日期位于显示周时才绘制，保证周一凌晨归到前一周的周日。
- “今天播出”统计及其日期文案继续使用 `currentBeijingDate`，不改变自然日统计含义。
- 不修改时间轴裁切、番剧排期、CSS、主题、数据库或认证逻辑。

## 设计

`lib/calendar.js` 导出 `calendarDateForDateTime(isoDate, time)`。它调用现有的 `layoutBroadcast()` 并返回视觉日期，使页面不再复制 `00:00–04:59` 的阈值。

`app/page.tsx` 从同一个北京时间快照派生自然日、当前时间和放送日。日历专用的日期比较与导航改用放送日；统计继续使用自然日。时间标线先通过 `timelineMarkerForDateTime()` 完成日期和纵向偏移映射，再检查标线返回的 `date` 是否包含在当前显示周中。

移动端不增加新控件，只把首次选中的日期和日历跳转目标改为放送日，保持与桌面同一语义。

## 验证

先在 `tests/calendar.test.mjs` 写失败测试，覆盖 `00:00`、`04:59` 和 `05:00` 三个边界。再在 `tests/rendered-html.test.mjs` 写失败断言，锁定页面对自然日与放送日的职责分离、所有日历高光和导航使用放送日，以及标线按映射后的日期判断所在周。

实现最小修改后运行：

```bash
node --test tests/calendar.test.mjs
node --test tests/rendered-html.test.mjs
npm run lint -- --ignore-pattern .worktrees
npm test
git diff --check
```
