import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { anime } from "../data/anime.js";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");
async function readStyles() {
  const entry = await readSource("../app/globals.css");
  const imports = [...entry.matchAll(/@import "(\.\/styles\/[^"\n]+)";/g)].map((match) => match[1]);
  assert.deepEqual(imports, [
    "./styles/tokens-base.css", "./styles/navigation-account.css", "./styles/page-shell.css",
    "./styles/statistics-search.css", "./styles/calendar.css", "./styles/dialogs.css", "./styles/responsive.css",
  ]);
  return (await Promise.all(imports.map((path) => readSource("../app/" + path)))).join("");
}
async function render() {
  assert.ok(process.env.TEST_BASE_URL, "Run npm test to start the production server before HTTP rendering tests");
  return fetch(new URL("/", process.env.TEST_BASE_URL), { headers: { accept: "text/html" } });
}
function withoutReactMarkers(markup) {
  return markup.replaceAll("<!-- -->", "");
}

test("server-renders a paged Beijing episode calendar", { skip: !process.env.TEST_BASE_URL }, async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const cleanHtml = withoutReactMarkers(html);
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>番时表｜新番日历<\/title>/);
  assert.match(
    html,
    /<meta name="description" content="按北京时间查看收录番剧的首播、集数与周播时间。"\s*\/>/,
  );
  assert.match(
    html,
    /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml"\s*\/>/,
  );
  assert.match(cleanHtml, /<h1\b[^>]*id="page-heading-title"[^>]*>播出表<\/h1>/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(cleanHtml, /共 66 部 · 北京时间/);
  assert.match(html, /class="page-sidebar"/);
  assert.match(html, /class="page-heading"/);
  assert.match(html, /class="page-heading-controls"/);
  assert.match(html, /class="today-jump"[^>]*>今天<\/button>/);
  assert.match(html, /class="page-search"/);
  assert.doesNotMatch(html, /seasonal-hero|personal-hero/);
  assert.match(html, /localStorage\.getItem\(&quot;ac-theme&quot;\)|localStorage\.getItem\("ac-theme"\)/);
  assert.match(html, /class="theme-toggle"/);
  assert.match(html, /深色模式/);
  assert.match(html, /播出表/);
  assert.match(html, /我的番剧/);
  assert.match(html, /<label class="season-picker"/);
  assert.match(html, /class="weekly-section"/);
  assert.match(html, /class="mobile-calendar"/);
  assert.match(html, /<option value="2022-january">2022 年 1 月番<\/option>/);
  assert.match(html, /<option value="2022-april">2022 年 4 月番<\/option>/);
  assert.match(html, /<option value="2022-july">2022 年 7 月番<\/option>/);
  assert.match(html, /<option value="2022-october">2022 年 10 月番<\/option>/);
  assert.match(html, /<option value="2023-january">2023 年 1 月番<\/option>/);
  assert.match(html, /<option value="2023-april">2023 年 4 月番<\/option>/);
  assert.match(html, /<option value="2023-july">2023 年 7 月番<\/option>/);
  assert.match(html, /<option value="2023-october">2023 年 10 月番<\/option>/);
  assert.match(html, /<option value="2024-january">2024 年 1 月番<\/option>/);
  assert.match(html, /<option value="2024-april">2024 年 4 月番<\/option>/);
  assert.match(html, /<option value="2024-july">2024 年 7 月番<\/option>/);
  assert.match(html, /<option value="2024-october">2024 年 10 月番<\/option>/);
  assert.match(html, /<option value="2025-january">2025 年 1 月番<\/option>/);
  assert.match(html, /<option value="2025-april">2025 年 4 月番<\/option>/);
  assert.match(html, /<option value="2025-july">2025 年 7 月番<\/option>/);
  assert.match(html, /<option value="2025-october">2025 年 10 月番<\/option>/);
  assert.match(html, /<option value="2026-january">2026 年 1 月番<\/option>/);
  assert.match(html, /<option value="2026-april">2026 年 4 月番<\/option>/);
  assert.match(html, /<option value="2026-july" selected="">2026 年 7 月番<\/option>/);
  assert.match(html, /北京时间/);
  assert.match(html, /上一周/);
  assert.match(html, /下一周/);
  assert.match(html, /回到本周/);
  assert.match(cleanHtml, /2026年7月6日 — 7月12日/);
  assert.match(html, /class="timeline-grid"/);
  assert.match(html, /class="timeline-axis"/);
  assert.match(html, /class="timeline-day"/);
  assert.match(html, /--timeline-hour-count:22;--timeline-height:2160px/);
  assert.match(html, /class="calendar-event timeline-event/);
  assert.match(html, /次日 01:00/);
  assert.match(html, /--event-top:1392px/);
  assert.match(html, /--event-width:50%/);
  assert.doesNotMatch(html, /class="time-grid"/);
  assert.match(cleanHtml, /<time class="time-group-label">21:30<\/time>/);
  assert.match(cleanHtml, /次日 01:00/);
  assert.match(cleanHtml, /次日 02:00/);
  assert.match(html, /class="calendar-event/);
  assert.match(html, /class="calendar-event-cover cover-sprite"/);
  assert.match(html, /background-image:url\(\/covers\/yuc\/sprites\/cover-sheet-\d+-thumb\.webp\)/);
  assert.match(cleanHtml, /第 1 集/);
  assert.match(html, /与奔跑在透明之夜的你 谈一场看不见的恋爱/);
  assert.match(html, /透明な夜に駆ける君と、目に見えない恋をした。/);
  assert.match(html, /欺诈游戏/);
  assert.match(html, /第 14 集/);
  assert.match(html, /YUC 2026年7月新番表.*首播/);
  assert.match(html, /网络放送／固定时刻未列出/);
  assert.doesNotMatch(html, /class="week-grid"|class="week-column"|class="anime-card"/);
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /Your site is taking shape/i);
  assert.doesNotMatch(html, /react-loading-skeleton/i);
  assert.doesNotMatch(cleanHtml, /25:00|27:08/);
  assert.doesNotMatch(cleanHtml, /次日 08:00/);
  assert.doesNotMatch(html, /class="time-column"/);
  assert.doesNotMatch(html, /--timeline-hours/);
  assert.doesNotMatch(html, /--event-start/);
});

test("renders one Monday-through-Sunday grid with timed and network-only program details", { skip: !process.env.TEST_BASE_URL }, async () => {
  const html = await (await render()).text();
  const cleanHtml = withoutReactMarkers(html);
  const weekdayHeadings = [...html.matchAll(/<h3>(周[一二三四五六日])<\/h3>/g)].map(
    ([, heading]) => heading,
  );
  assert.deepEqual(weekdayHeadings, ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]);

  const timedEvents = [
    ...html.matchAll(
      /<button\b(?=[^>]*class="[^"]*\bcalendar-event-detail\b[^"]*")[^>]*>[\s\S]*?<\/button>/g,
    ),
  ].map(([card]) => card);
  assert.ok(timedEvents.length > 20);
  assert.ok(timedEvents.every((tag) => /aria-haspopup="dialog"/.test(tag)));
  assert.ok(timedEvents.every((card) => /class="calendar-event-cover cover-sprite"/.test(card)));
  assert.ok(timedEvents.every((card) => /\bcover-sprite\b/.test(card)));

  const mobilePicker = cleanHtml.slice(
    cleanHtml.indexOf('<div class="mobile-day-picker"'),
    cleanHtml.indexOf('<div class="mobile-agenda"'),
  );
  assert.match(mobilePicker, /<b>7\/6<\/b>/);
  const mobileAgendaStart = html.indexOf('<div class="mobile-agenda"');
  assert.ok(mobileAgendaStart >= 0);
  const mobileAgenda = html.slice(
    mobileAgendaStart,
    html.indexOf('<section class="network-section"'),
  );
  assert.match(mobileAgenda, /\bcalendar-event\b/);
  assert.doesNotMatch(mobileAgenda, /\btimeline-event\b/);
  assert.doesNotMatch(mobileAgenda, /NaN/);

  const networkCards = [
    ...html.matchAll(/<button\b(?=[^>]*class="[^"]*\bnetwork-card\b[^"]*")[^>]*>[\s\S]*?<\/button>/g),
  ].map(([card]) => card);
  const networkOnlyCount = anime.filter(
    ({ scheduleWeekday, beijingTime }) => !scheduleWeekday || !beijingTime,
  ).length;
  assert.equal(networkCards.length, networkOnlyCount);
  assert.match(networkCards.join(""), /刃牙道 Part\.2/);
  assert.match(networkCards.join(""), /background-image:url\(\/covers\/yuc\/sprites\/cover-sheet-\d+-thumb\.webp\)/);
  assert.match(networkCards.join(""), /\bcover-sprite\b/);

  const sourceLinks = [
    ...html.matchAll(/<a\b(?=[^>]*href="https:\/\/yuc\.wiki\/202607\/")[^>]*>/g),
  ].map(([tag]) => tag);
  assert.ok(sourceLinks.length >= 1, "the compact page must retain its current-quarter source link");
  assert.ok(sourceLinks.every((tag) => /target="_blank"/.test(tag)));
  assert.ok(sourceLinks.every((tag) => /rel="noreferrer"/.test(tag)));
});

test("renders separate accessible watched controls without nesting calendar buttons", { skip: !process.env.TEST_BASE_URL }, async () => {
  const html = await (await render()).text();
  const cleanHtml = withoutReactMarkers(html);
  const watchedControls = [
    ...html.matchAll(
      /<button\b(?=[^>]*class="[^"]*\bepisode-watch-toggle\b[^"]*")(?=[^>]*aria-pressed="false")(?=[^>]*aria-label="标记《[^"]+")(?=[^>]*disabled="")[^>]*>/g,
    ),
  ];
  const detailButtons = [
    ...html.matchAll(
      /<button\b(?=[^>]*class="[^"]*\bcalendar-event-detail\b[^"]*")(?=[^>]*aria-haspopup="dialog")[^>]*>/g,
    ),
  ];

  assert.ok(watchedControls.length > 20);
  assert.equal(watchedControls.length, detailButtons.length);
  const calendarEventWrappers = [
    ...cleanHtml.matchAll(
      /<div\b(?=[^>]*class="[^"]*\bcalendar-event\b[^"]*")[^>]*>\s*<button\b(?=[^>]*class="[^"]*\bcalendar-event-detail\b[^"]*")[^>]*>[\s\S]*?<\/button>\s*<button\b(?=[^>]*class="[^"]*\bepisode-watch-toggle\b[^"]*")[^>]*>[\s\S]*?<\/button>\s*<\/div>/g,
    ),
  ];
  assert.ok(calendarEventWrappers.length > 20);
  const buttonClasses = [...html.matchAll(/<button\b[^>]*class="([^"]*)"[^>]*>/g)].map(
    ([, className]) => className.split(" "),
  );
  assert.ok(buttonClasses.every((classNames) => !classNames.includes("calendar-event")));
});

test("renders same-time events side by side on one timeline day", { skip: !process.env.TEST_BASE_URL }, async () => {
  const cleanHtml = withoutReactMarkers(await (await render()).text());
  const sameTimeEvents = [
    ...cleanHtml.matchAll(
      /<div\b(?=[^>]*class="[^"]*\btimeline-event\b[^"]*")(?=[^>]*style="([^"]*)")[^>]*>([\s\S]*?)<\/div>/g,
    ),
  ].filter(([, , card]) => /aria-label="[^"]*2026-07-06 21:30/.test(card));

  assert.equal(sameTimeEvents.length, 2);
  assert.equal(
    new Set(sameTimeEvents.map(([, style]) => style.match(/--event-top:([^;]+)/)?.[1])).size,
    1,
  );
  assert.equal(
    new Set(sameTimeEvents.map(([, style]) => style.match(/--event-width:([^;]+)/)?.[1])).size,
    1,
  );
  const laneOffsets = sameTimeEvents.map(
    ([, style]) => style.match(/--event-left:([^;]+)/)?.[1],
  );
  assert.equal(new Set(laneOffsets).size, 2);
  assert.ok(laneOffsets.includes("0%"));
  assert.ok(laneOffsets.includes("50%"));
  assert.ok(
    sameTimeEvents.every(([, , card]) => /class="(?=[^"]*\bcalendar-event-cover\b)(?=[^"]*\bcover-sprite\b)[^"]*"/.test(card)),
  );
  assert.ok(
    sameTimeEvents.every(([, , card]) => /class="[^"]*\bcalendar-event-episode\b[^"]*"/.test(card)),
  );
  assert.ok(
    sameTimeEvents.every(([, , card]) =>
      /<strong\b(?=[^>]*title="[^"]+")[^>]*>[^<]+<\/strong>/.test(card),
    ),
  );
  assert.match(sameTimeEvents.map(([, , card]) => card).join(""), /暴怒千金誓要复仇/);
  assert.match(sameTimeEvents.map(([, , card]) => card).join(""), /世界舞动/);
  assert.ok(
    sameTimeEvents.every(([markup]) =>
      /class="[^"]*\btimeline-event-compact\b[^"]*"/.test(markup),
    ),
  );

  const singleLaneEvents = [
    ...cleanHtml.matchAll(
      /<div\b(?=[^>]*class="[^"]*\btimeline-event\b[^"]*")(?=[^>]*style="([^"]*)")[^>]*>/g,
    ),
  ].filter(([, style]) => /--event-width:\s*100%/.test(style));
  assert.ok(singleLaneEvents.length > 0);
  assert.ok(
    singleLaneEvents.every(([markup]) => !/\btimeline-event-compact\b/.test(markup)),
  );
});

test("preserves desktop and mobile sizing, sticky regions, watched controls, and dialog styles", async () => {
  const styles = await readStyles();
  assert.match(
    styles,
    /\.detail-cover\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*auto;[\s\S]*?aspect-ratio:\s*3\s*\/\s*4;[\s\S]*?max-height:\s*none;[\s\S]*?background-repeat:\s*no-repeat;/,
  );
  function cssBlock(source, selector) {
    const match = source.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));
    assert.ok(match, `Missing CSS block: ${selector}`);
    return match[1];
  }
  function rootCssBlock(source, selector) {
    return new RegExp(`^${selector}\\s*\\{([^}]*)\\}`, "m").exec(source)?.[1] ?? "";
  }
  function cssMediaBlock(source, query) {
    const queryStart = source.indexOf(query);
    assert.notEqual(queryStart, -1, `Missing CSS media query: ${query}`);
    const openingBrace = source.indexOf("{", queryStart);
    let depth = 1;
    for (let index = openingBrace + 1; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
    assert.fail(`Unclosed CSS media query: ${query}`);
  }
  const pageSidebarStyles = cssBlock(styles, "\\.page-sidebar");
  const pageHeadingStyles = cssBlock(styles, "\\.page-heading");
  const pageMetricsStyles = cssBlock(styles, "\\.page-metrics");
  const statisticsOverviewSummaryStyles = cssBlock(styles, "\\.statistics-overview-summary");
  const statisticsOverviewSeasonStyles = cssBlock(styles, "\\.statistics-overview-season");
  const animeSelectionListStyles = rootCssBlock(styles, "\\.anime-selection-list");
  const animeSelectionStyles = rootCssBlock(styles, "\\.anime-selection");
  const mobileStyles = cssMediaBlock(styles, "@media (max-width: 860px)");
  const mobilePageHeadingStyles = cssBlock(mobileStyles, "\\.page-heading");
  const mobileCalendarStyles = cssBlock(mobileStyles, "\\.mobile-calendar");
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /\.page-sidebar button\.is-active/);
  assert.match(pageSidebarStyles, /position:\s*sticky;/);
  assert.match(pageSidebarStyles, /display:\s*flex;/);
  assert.match(
    statisticsOverviewSummaryStyles,
    /top:\s*calc\(var\(--site-nav-offset\) \+ 0\.75rem\);/,
  );
  assert.match(
    statisticsOverviewSeasonStyles,
    /scroll-margin-top:\s*calc\(var\(--site-nav-offset\) \+ 8rem\);/,
  );
  assert.doesNotMatch(styles, /grid-template-columns:\s*13rem minmax\(0, 1fr\)/);
  assert.match(pageHeadingStyles, /display:\s*grid;/);
  assert.match(rootCssBlock(styles, "\\.today-watch-list"), /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/);
  assert.match(pageMetricsStyles, /display:\s*flex;/);
  assert.match(pageMetricsStyles, /flex-wrap:\s*wrap;/);
  assert.match(
    styles,
    /\.personal-progress-metric dd\s*\{[\s\S]*?display:\s*grid;/,
  );
  assert.match(styles, /\.personal-progress-bar\s*\{[\s\S]*?width:\s*100%;/);
  assert.match(
    styles,
    /\.personal-progress-bar::-webkit-progress-value\s*\{[\s\S]*?background(?:-color)?:\s*var\(--accent\);/,
  );
  assert.match(
    styles,
    /\.personal-progress-bar::-moz-progress-bar\s*\{[\s\S]*?background(?:-color)?:\s*var\(--accent\);/,
  );
  assert.match(mobilePageHeadingStyles, /grid-template-columns:\s*minmax\(0, 1fr\);/);
  assert.match(mobileCalendarStyles, /display:\s*grid;/);
  assert.match(cssBlock(mobileStyles, "\\.today-watch-section"), /display:\s*none;/);
  assert.match(cssBlock(mobileStyles, "\\.weekly-section > \\.section-heading"), /display:\s*none;/);
  assert.match(mobileStyles, /\.mobile-agenda \.calendar-event \.calendar-event-detail\s*\{[^}]*grid-template-columns:\s*2\.875rem minmax\(0, 1fr\);/);
  assert.match(mobileStyles, /\.mobile-agenda \.episode-watch-toggle,\s*\.today-watch-list \.episode-watch-toggle\s*\{[^}]*width:\s*2\.75rem;[^}]*height:\s*2\.75rem;/);
  assert.match(styles, /\.season-picker\s*\{/);
  assert.match(animeSelectionListStyles, /\S/);
  assert.match(
    animeSelectionListStyles,
    /grid-template-columns:\s*repeat\(auto-fit, minmax\(15rem, 1fr\)\);/,
  );
  assert.match(animeSelectionStyles, /\S/);
  assert.match(
    animeSelectionStyles,
    /display:\s*grid;[\s\S]*?grid-template-columns:\s*1rem 3rem minmax\(0, 1fr\);/,
  );
  assert.match(styles, /\.anime-selection-summary\s*\{[\s\S]*?cursor:\s*pointer;/);
  assert.match(styles, /\.my-schedule-empty/);
  assert.match(
    styles,
    /@media \(max-width: 860px\) \{[\s\S]*?\.site-shell\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
  );
  assert.match(
    styles,
    /\.timeline-grid\s*\{[\s\S]*?grid-template-columns:\s*3\.5rem repeat\(7, minmax\(0, 1fr\)\);[\s\S]*?overflow:\s*(?:hidden|clip)/,
  );
  assert.match(
    styles,
    /\.week-pager\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*0;[\s\S]*?z-index:\s*3;/,
  );
  assert.match(
    styles,
    /\.timeline-corner,\s*\.timeline-day-header\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*var\(--week-pager-height\);[\s\S]*?z-index:\s*2;/,
  );
  assert.match(
    styles,
    /\.timeline-grid\s*\{[\s\S]*?overflow:\s*clip;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 860px\) \{[\s\S]*?\.week-pager\s*\{[\s\S]*?position:\s*static;/,
  );
  assert.match(
    styles,
    /\.timeline-axis\s*\{[^}]*?position:\s*relative;[^}]*?grid-template-rows:\s*repeat\(var\(--timeline-hour-count\), 96px\) var\(--timeline-event-height\);[^}]*?height:\s*var\(--timeline-height\);[^}]*?background-image:\s*var\(--timeline-lines\);/,
  );
  assert.match(
    styles,
    /--timeline-lines:\s*repeating-linear-gradient\([\s\S]*?transparent 1px 48px[\s\S]*?repeating-linear-gradient\([\s\S]*?transparent 1px 96px/,
  );
  assert.match(
    styles,
    /\.timeline-day\s*\{[\s\S]*?position:\s*relative;[\s\S]*?height:\s*var\(--timeline-height\);[\s\S]*?min-width:\s*0;[\s\S]*?background-image:\s*var\(--timeline-lines\);/,
  );
  assert.match(
    styles,
    /\.timeline-day\.is-today\s*\{[^}]*?background-color:\s*color-mix\([^;]*var\(--accent-soft\)[^;]*var\(--card\)\);[^}]*?background-image:\s*var\(--timeline-lines\);/,
  );
  assert.match(
    styles,
    /\.timeline-current-time\s*\{[^}]*?position:\s*absolute;[^}]*?z-index:\s*3;[^}]*?top:\s*var\(--timeline-current-time-top\);[^}]*?height:\s*2px;[^}]*?pointer-events:\s*none;/,
  );
  assert.match(
    styles,
    /\.timeline-current-time\s*\{[^}]*?background:\s*var\(--accent-2\);/,
  );
  assert.doesNotMatch(styles.match(/\.timeline-current-time\s*\{[^}]*\}/)?.[0] ?? "", /linear-gradient/);
  assert.match(
    styles,
    /\.timeline-current-time-axis time\s*\{[^}]*?border-radius:\s*999px;[^}]*?background:\s*var\(--accent-2\);[^}]*?color:\s*var\(--on-accent\);/,
  );
  assert.match(
    styles,
    /\.timeline-event\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*var\(--event-top\);[\s\S]*?left:\s*calc\(var\(--event-left\) \+ var\(--timeline-event-gutter\)\);[\s\S]*?width:\s*calc\(var\(--event-width\) - var\(--timeline-event-gutter\)\);[\s\S]*?height:\s*var\(--timeline-event-height\);/,
  );
  assert.match(
    styles,
    /\.timeline-event \.calendar-event-cover\s*\{[\s\S]*?aspect-ratio:\s*3\s*\/\s*4;/,
  );
  assert.match(
    styles,
    /\.timeline-event \.calendar-event-detail strong\s*\{[^}]*?overflow:\s*hidden;[^}]*?-webkit-line-clamp:\s*2;[^}]*?white-space:\s*normal;/,
  );
  assert.match(
    styles,
    /\.timeline-event \.calendar-event-episode\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
  );
  assert.match(
    styles,
    /\.timeline-event \.calendar-event-detail\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1\.5rem\) minmax\(0, 1fr\);/,
  );
  assert.match(
    styles,
    /\.timeline-event-compact \.calendar-event-detail\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/,
  );
  assert.match(
    styles,
    /\.timeline-event-compact \.calendar-event-cover\s*\{[^}]*display:\s*none;/,
  );
  assert.doesNotMatch(
    styles,
    /\.timeline-event-compact \.calendar-event-detail strong\s*\{[^}]*display:\s*none;/,
  );
  assert.doesNotMatch(
    styles,
    /\.timeline-event-compact \.calendar-event-episode\s*\{[^}]*display:\s*none;/,
  );
  assert.match(
    styles,
    /\.timeline-hour:first-child\s*\{[\s\S]*?transform:\s*translateY\(0/,
  );
  assert.doesNotMatch(styles, /\.time-grid-scroll/);
  assert.doesNotMatch(styles, /\.time-grid\s*\{/);
  assert.doesNotMatch(styles, /\.time-column\b/);
  assert.doesNotMatch(styles, /\.timeline-grid\s*\{[^}]*\bmin-width\s*:/);
  assert.doesNotMatch(styles, /overflow-x:\s*auto/);
  assert.match(styles, /\.time-groups/);
  assert.match(styles, /\.time-group/);
  assert.match(styles, /\.time-group-label/);
  assert.match(styles, /\.time-group-events/);
  assert.match(styles, /\.calendar-event/);
  assert.match(styles, /\.calendar-event-detail/);
  assert.match(styles, /\.episode-watch-toggle/);
  assert.match(
    styles,
    /\.episode-watch-toggle::before\s*\{[^}]*?width:\s*0\.75rem;[^}]*?height:\s*0\.75rem;/,
  );
  assert.match(
    styles,
    /\.timeline-event \.episode-watch-toggle\s*\{[^}]*?width:\s*1\.3rem;[^}]*?height:\s*1\.3rem;/,
  );
  assert.match(
    styles,
    /\.calendar-event-content\s*\{[\s\S]*?padding-right:\s*1\.85rem;/,
  );
  assert.match(
    styles,
    /\.timeline-event \.calendar-event-content\s*\{[\s\S]*?padding-right:\s*0\.8rem;/,
  );
  assert.match(
    styles,
    /\.calendar-event\.is-watched \.calendar-event-cover\s*\{[\s\S]*?opacity:\s*0\.85;/,
  );
  assert.doesNotMatch(
    styles,
    /\.calendar-event\.is-watched \.calendar-event-cover\s*\{[\s\S]*?filter:\s*grayscale/,
  );
  assert.match(styles, /\.calendar-event-cover/);
  assert.doesNotMatch(styles, /\.time-axis/);
  assert.doesNotMatch(styles, /--event-start/);
  assert.doesNotMatch(styles, /--timeline-hours/);
  assert.doesNotMatch(styles, /--event-lane|--event-lanes/);
  assert.match(styles, /\.mobile-calendar/);
  assert.match(
    styles,
    /@media \(max-width: 860px\) \{[\s\S]*?\.timeline-grid \{[\s\S]*?display: none/,
  );
  assert.match(
    styles,
    /\.mobile-day-picker\s*\{[\s\S]*?grid-template-columns:\s*repeat\(7, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    styles,
    /\.mobile-day-picker button\s*\{[^}]*?min-height:\s*3\.2rem;[^}]*?line-height:\s*1\.2;[^}]*?white-space:\s*nowrap;/,
  );
  assert.match(
    styles,
    /\.mobile-agenda \.time-group-events \{[\s\S]*?grid-template-columns:\s*(?:1fr|minmax\(0, 1fr\))/,
  );
  assert.match(styles, /\.detail-dialog::backdrop/);
  assert.match(styles, /\.network-card/);
  assert.doesNotMatch(styles, /\.week-column\.is-today/);
});

test("preserves statistics layout and season navigation styles", async () => {
  const styles = await readStyles();
  assert.match(styles, /\.statistics-overview-grid\s*\{/);
  assert.match(styles, /\.statistics-progress-content\s*\{/);
  assert.match(styles, /margin-top: 1rem;/);
  assert.match(styles, /\.statistics-anime-card\s*\{/);
  assert.match(styles, /\.statistics-section-heading-toggle\s*\{/);
  assert.match(styles, /\.statistics-section-chevron\s*\{/);
  assert.match(styles, /border-right: 2px solid currentColor;/);
  assert.match(styles, /transform 260ms cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
  assert.match(styles, /\.statistics-anime-card-progress\s*\{/);
  assert.match(styles, /\.statistics-anime-card-list\s*\{/);
  assert.match(styles, /\.statistics-overview-season \+ \.statistics-overview-season\s*\{/);
  assert.match(
    styles,
    /\.statistics-overview-summary\s*\{[\s\S]*?position: sticky;[\s\S]*?top:\s*calc\(var\(--site-nav-offset\) \+ 0\.75rem\);/,
  );
  assert.match(
    styles,
    /\.statistics-overview-season\s*\{[\s\S]*?scroll-margin-top:\s*calc\(var\(--site-nav-offset\) \+ 8rem\);/,
  );
  assert.match(styles, /@media \(max-width: 860px\) \{[\s\S]*?\.statistics-anime-card-list/);
});

test("preserves the larger single-column search results and progress bars", async () => {
  const styles = await readStyles();
  assert.match(styles, /\.statistics-anime-card-list\.anime-search-results\s*\{[^}]*?grid-template-columns:\s*(?:1fr|minmax\(0, 1fr\));/);
  assert.match(
    styles,
    /\.anime-search-results \.statistics-anime-card\s*\{[^}]*?grid-template-columns:\s*6rem minmax\(0, 1fr\) auto;[^}]*?gap:\s*0\.9rem;[^}]*?padding:\s*0\.7rem;/,
  );
  assert.match(
    styles,
    /\.anime-search-results \.statistics-anime-card-cover\s*\{[^}]*?width:\s*6rem;/,
  );
  assert.match(
    styles,
    /\.anime-search-results \.statistics-anime-card-content strong\s*\{[^}]*?font-size:\s*1\.05rem;/,
  );
  assert.match(
    styles,
    /\.anime-search-results \.statistics-anime-card-content small,\s*\.anime-search-results \.statistics-anime-card-content em\s*\{[^}]*?font-size:\s*0\.82rem;/,
  );
  assert.match(
    styles,
    /\.anime-search-results \.statistics-anime-card-progress\s*\{[^}]*?height:\s*0\.4rem;/,
  );
  assert.match(styles, /\.anime-search-results \.statistics-anime-card-content em\s*\{[^}]*?overflow:\s*visible;[^}]*?white-space:\s*normal;/);
  assert.match(styles, /\.anime-search-page\s*\{[^}]*?display:\s*grid;/);
  assert.match(styles, /\.anime-search-page\s*\{[^}]*?gap:\s*1rem;/);
  assert.match(
    styles,
    /\.anime-search\s*\{[^}]*?max-width:\s*32rem;[^}]*?display:\s*grid;/,
  );
  assert.match(styles, /\.anime-search input\s*\{[^}]*?width:\s*100%;/);
  assert.match(styles, /\.anime-search-empty\s*\{[^}]*?margin:\s*0;/);
  assert.match(
    styles,
    /@media \(max-width: 860px\) \{[\s\S]*?\.anime-search\s*\{[^}]*?max-width:\s*none;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 860px\) \{[\s\S]*?\.calendar-header-controls\s*\{[^}]*?justify-items:\s*stretch;/,
  );
});

test("supports light and dark themes with accessible accent colors", async () => {
  const [styles, page, layout, display] = await Promise.all([
    readStyles(),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readSource("../app/hooks/use-display.ts"),
  ]);

  assert.match(styles, /:root\s*\{[\s\S]*?color-scheme:\s*light;/);
  assert.doesNotMatch(styles, /--blue\b|--blue-soft|--mint\b|--mint-deep/);
  assert.match(
    layout,
    /<html\b(?=[^>]*\blang="zh-CN")(?=[^>]*\bsuppressHydrationWarning\b)[^>]*>/,
  );

  const lightBlock = styles.match(/:root\s*\{([\s\S]*?)\n\}/);
  assert.ok(lightBlock, "light theme must define its root tokens");
  const lightTokens = lightBlock[1];
  const tokenValue = (tokens, tokenName) => {
    const token = tokens.match(new RegExp(`--${tokenName}:\\s*([^;]+);`));
    assert.ok(token, `missing --${tokenName} token`);
    return token[1].trim();
  };
  const relativeLuminance = (hex) => {
    const normalizedHex = hex.length === 4
      ? `#${hex.slice(1).split("").map((channel) => channel + channel).join("")}`
      : hex;
    const channels = normalizedHex.slice(1).match(/\w\w/g).map((channel) => Number.parseInt(channel, 16) / 255);
    const linear = channels.map((channel) => (
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const contrastRatio = (left, right) => {
    const [lighter, darker] = [relativeLuminance(left), relativeLuminance(right)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
  };
  const darkBlock = styles.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
  assert.ok(darkBlock, "dark theme must override root tokens");
  const darkTokens = darkBlock[1];
  for (const [themeName, tokens] of [["light", lightTokens], ["dark", darkTokens]]) {
    for (const [foreground, background] of [
      ["on-accent", "accent"],
      ["on-accent", "accent-2"],
      ["on-accent", "accent-2-deep"],
      ["accent-ink", "accent-soft"],
      ["ink", "card"],
      ["muted-ink", "card"],
    ]) {
      const foregroundColor = tokenValue(tokens, foreground);
      const backgroundColor = tokenValue(tokens, background);
      for (const color of [foregroundColor, backgroundColor]) {
        assert.match(color, /^#[\da-f]{3}(?:[\da-f]{3})?$/i, "contrast checks require hex color tokens");
      }
      assert.ok(
        contrastRatio(foregroundColor, backgroundColor) >= 4.5,
        `${themeName}: --${foreground} must have at least 4.5:1 contrast against --${background}`,
      );
    }
  }
  assert.match(
    styles,
    /\.statistics-anime-card-status\s*\{[\s\S]*?color:\s*var\(--accent-ink\);/,
  );

  // 暗色 token 由 <html data-theme="dark"> 触发，手动切换与系统跟随共用一套规则。
  assert.doesNotMatch(styles, /@media \(prefers-color-scheme/);
  assert.match(darkTokens, /color-scheme:\s*dark;/);
  for (const name of ["paper", "card", "ink", "accent", "accent-2-deep", "accent-ink", "backdrop"]) {
    tokenValue(darkTokens, name);
  }

  // 首屏前的内联脚本：手动选择优先，否则跟随系统，避免主题闪屏。
  assert.match(layout, /localStorage\.getItem\("ac-theme"\)/);
  assert.match(layout, /matchMedia\("\(prefers-color-scheme: dark\)"\)/);
  assert.match(layout, /document\.documentElement\.dataset\.theme/);
  assert.match(layout, /dangerouslySetInnerHTML/);

  // 手动切换做成常驻浮动按钮，并把选择写回 localStorage 与 <html data-theme>。
  assert.match(page, /className="theme-toggle"/);
  assert.match(page, /aria-pressed=\{theme === "dark"\}/);
  assert.match(display, /localStorage\.setItem\("ac-theme", nextTheme\)/);
  assert.match(display, /document\.documentElement\.dataset\.theme = nextTheme;/);
  assert.match(
    styles,
    /\.theme-toggle\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*4;/,
  );

  // 硬编码颜色必须收口到 token，暗色主题才能整体换肤。
  assert.doesNotMatch(styles, /rgb\(31 41 51|#a33b2e/);
  assert.doesNotMatch(styles, /grayscale/);
  // 交互过渡必须纳入减少动态效果的关闭列表。
  const reducedMotion = styles.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/);
  assert.ok(reducedMotion);
  assert.match(reducedMotion[1], /\.calendar-event-detail/);
  assert.match(reducedMotion[1], /\.network-card/);
  assert.match(reducedMotion[1], /\.statistics-anime-card/);
  assert.match(reducedMotion[1], /\.theme-toggle/);
  assert.match(reducedMotion[1], /transition:\s*none;/);
});

test("keeps routing and cross-page view state in the small page composition", async () => {
  const [page, types, calendar, statistics] = await Promise.all([
    readSource("../app/page.tsx"), readSource("../app/types.ts"),
    readSource("../app/components/calendar-page.tsx"), readSource("../app/components/statistics-page.tsx"),
  ]);
  assert.match(types, /type Page = "all" \| "mine" \| "stats" \| "search";/);
  assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("page"\)/);
  assert.match(page, /setActivePage\(page === "mine" \|\| page === "stats" \|\| page === "search" \? page : "all"\)/);
  assert.match(page, /window\.addEventListener\("popstate", syncPageFromUrl\)/);
  assert.match(page, /window\.history\.pushState\(null, "", url\)/);
  assert.match(page, /page === "all"\) url\.searchParams\.delete\("page"\)/);
  assert.match(page, /url\.searchParams\.set\("page", page\)/);
  assert.match(page, /useState<CalendarLocation>/);
  assert.match(page, /useState<StatisticsView>/);
  assert.match(page, /<CalendarPage\b[^>]*location=\{calendarLocation\}[^>]*onLocationChange=\{setCalendarLocation\}/);
  assert.match(page, /<StatisticsPage\b[^>]*view=\{statisticsView\}[^>]*onViewChange=\{setStatisticsView\}/);
  assert.doesNotMatch(page, /fetch\(|progressForAnime\(|eventsForWeek\(/);
  assert.match(page, /<ViewerProvider><AccountProvider><AnimeDetailProvider>/);
  assert.match(calendar, /onLocationChange\(\{ weekStart: nextWeekStart, mobileDate: nextWeekStart \}\)/);
  assert.match(statistics, /const selectedOverallSeasonId = view\.seasonId/);
  assert.match(statistics, /const collapsedStatisticsSections = view\.collapsedSections/);
});

test("searches the full catalog and shows progress without filtering the calendar", async () => {
  const [page, search, calendar, heading, card] = await Promise.all([
    readSource("../app/page.tsx"), readSource("../app/components/search-page.tsx"),
    readSource("../app/components/calendar-page.tsx"), readSource("../app/components/page-heading.tsx"),
    readSource("../app/components/statistics-anime-card.tsx"),
  ]);
  assert.match(page, /setAnimeQuery\(query\);\s*changePage\("search"\)/);
  assert.match(page, /<SearchPage animeQuery=\{animeQuery\} setAnimeQuery=\{setAnimeQuery\}/);
  assert.match(heading, /new FormData\(event\.currentTarget\)\.get\("pageSearch"\)/);
  assert.match(heading, /if \(query\) onSearch\?\.\(query\)/);
  assert.match(heading, /<form className="page-search" role="search" aria-label="查询番剧" onSubmit=\{submitPageSearch\}/);
  assert.equal((heading.match(/<h1\b/g) ?? []).length, 1);
  assert.match(search, /allAnime\.filter\(\(record\) => matchesAnimeTitle\(record, animeQuery\)\)/);
  assert.match(search, /progressForAnime\(searchResults, watchedEpisodes \?\? \[\]\)/);
  assert.match(search, /const searchProgressError = selectionLoadError \?\? watchedEpisodeError/);
  assert.match(search, /const isSearchProgressLoading = \(selectedAnimeIds === null \|\| watchedEpisodes === null\) && !searchProgressError/);
  assert.match(search, /isTracked \? progressStatusLabel\(progress\.status\) : "未追番"/);
  assert.match(search, /已看 \$\{progress\.watchedEpisodeCount\} \/ \$\{record\.episodeCount\} 集/);
  assert.match(search, /if \(!progress \|\| selectedAnimeIds === null \|\| watchedEpisodes === null\)/);
  assert.match(search, /status="进度暂不可用"/);
  assert.match(search, /<StatisticsAnimeCard[^>]*watchedEpisodeCount=\{progress\.watchedEpisodeCount\}/);
  assert.match(search, /value=\{animeQuery\}\s*onChange=\{\(event\) => setAnimeQuery\(event\.target\.value\)\}/);
  assert.match(search, /输入中文或日文名开始查询/);
  assert.match(search, /className="anime-search-empty" aria-live="polite"/);
  assert.match(card, /onClick=\{\(clickEvent\) => openDetail\(record, clickEvent\.currentTarget, selection\)\}/);
  assert.match(card, /className="statistics-anime-card-progress"/);
  assert.match(calendar, /const calendarAnime = activePage === "mine" \? selectedAnime : allAnime/);
  assert.match(calendar, /eventsForWeek\(calendarAnime, activeWeekStart\)/);
  assert.match(calendar, /dateOnlyEventsForWeek\(calendarAnime, activeWeekStart\)/);
  assert.doesNotMatch(calendar, /animeQuery|searchResults|matchesAnimeTitle/);
});

test("preserves statistics collapse, natural-day releases, season grouping, and scroll selection", async () => {
  const statistics = await readSource("../app/components/statistics-page.tsx");
  assert.match(statistics, /progressForAnime\(selectedAnime, watchedEpisodes \?\? \[\]\), seasonIndexByAnimeId/);
  assert.match(statistics, /sortProgressBySeasonThenWatchedEpisodes/);
  assert.match(statistics, /broadcastsForDate\(selectedAnime, currentBeijingDate\)/);
  assert.doesNotMatch(statistics, /broadcastsForDate\(selectedAnime, currentCalendarDate\)/);
  assert.match(statistics, /const displayedOverallProgressBySeason = overallProgressBySeason/);
  assert.match(statistics, /progressTotals\(displayedOverallProgress\)/);
  for (const section of ["today", "overview"]) {
    assert.match(statistics, new RegExp(`aria-expanded=\\{!isStatisticsSectionCollapsed\\("${section}"\\)\\}`));
    assert.match(statistics, new RegExp(`aria-controls="statistics-${section}-content"`));
    assert.match(statistics, new RegExp(`id="statistics-${section}-content" hidden=\\{isStatisticsSectionCollapsed\\("${section}"\\)\\}`));
  }
  assert.match(statistics, /<option value="">All<\/option>/);
  assert.match(statistics, /getElementById\(`statistics-overview-season-\$\{seasonId\}`\)/);
  assert.match(statistics, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(statistics, /displayedOverallProgressBySeason\.map\(\(\{ season, progress \}\) =>/);
  for (const total of ["total", "inProgress", "completed", "notStarted"]) {
    assert.match(statistics, new RegExp(`displayedOverallProgressTotals\\.${total}`));
  }
  assert.match(statistics, /最后标记第 \$\{progress\.latestWatchedEpisode\} 集/);
  assert.match(statistics, /selectedDate: event\.broadcastDate/);
  assert.match(statistics, /selectedReleaseKind: event\.releaseKind === "network" \? "network" : undefined/);
});

test("keeps today's followed releases before the calendar and the selection panel after it", async () => {
  const [calendar, today, selection] = await Promise.all([
    readSource("../app/components/calendar-page.tsx"), readSource("../app/components/today-watch.tsx"),
    readSource("../app/components/selection-panel.tsx"),
  ]);
  const todayIndex = calendar.indexOf("<TodayWatch");
  const weeklyIndex = calendar.indexOf('className="weekly-section"');
  const selectionIndex = calendar.indexOf("<SelectionPanel");
  const footerIndex = calendar.indexOf('className="calendar-footer"');
  const emptyIndex = calendar.indexOf('className="my-schedule-empty"');
  assert.ok(todayIndex >= 0 && weeklyIndex > todayIndex && emptyIndex > weeklyIndex);
  assert.ok(selectionIndex > emptyIndex && footerIndex > selectionIndex);
  assert.match(calendar, /<progress\b[^>]*aria-label="整体观看进度"[^>]*value=\{personalWatchedEpisodeCount\}[^>]*max=\{personalEpisodeCount\}/);
  assert.match(today, /eventsForWeek\(selectedAnime, startOfWeek\(currentCalendarDate\)\)/);
  assert.match(today, /dateOnlyEventsForWeek\(selectedAnime, startOfWeek\(currentCalendarDate\)\)/);
  assert.equal((today.match(/\.filter\(\(event\) => event\.date === currentCalendarDate\)/g) ?? []).length, 2);
  assert.match(today, /episodeViewUnitsForRange\(event\)\.filter\(\(unit\) =>\s*!isEpisodeViewWatched\(watchedEpisodes \?\? \[\], \{ animeId: event\.id, \.\.\.unit \}\)/);
  assert.match(today, /currentCalendarDate=\{currentCalendarDate\} showTime/);
  assert.match(today, /<DateOnlyEventCard/);
  assert.match(today, /isPersonalProgressLoading \? \(/);
  assert.match(today, /selectionLoadError \|\| watchedEpisodeError \? <SignInPrompt \/> : null/);
  assert.match(today, /今天没有追番更新/);
  assert.match(selection, /<details className="anime-selection-details">/);
  assert.match(selection, /<summary className="anime-selection-summary">/);
  assert.match(selection, /activeSeason\.anime\.map\(\(record\) =>/);
  assert.match(selection, /<input\s+type="checkbox"[\s\S]*?disabled=\{isSavingSelection\}[\s\S]*?<CoverArt anime=\{record\} className="statistics-anime-card-cover" decorative \/>[\s\S]*?<strong title=\{record\.titleZh\}>\{record\.titleZh\}<\/strong>[\s\S]*?<small title=\{record\.titleJa\}>\{record\.titleJa\}<\/small>/);
});

test("uses broadcast-day boundaries for navigation, all highlights, and current-time lines", async () => {
  const [page, calendar, schedule, cards, clock] = await Promise.all([
    readSource("../app/page.tsx"), readSource("../app/components/calendar-page.tsx"),
    readSource("../app/components/calendar-schedule.tsx"), readSource("../app/components/calendar-cards.tsx"),
    readSource("../app/hooks/use-display.ts"),
  ]);
  assert.match(clock, /timeZone: "Asia\/Shanghai"/);
  assert.match(clock, /calendarDateForDateTime\(currentBeijingDate, currentBeijingTime\)/);
  assert.match(clock, /window\.setInterval\(onStoreChange, 60_000\)/);
  assert.match(page, /setCalendarLocation\(\{ weekStart: startOfWeek\(currentCalendarDate\), mobileDate: currentCalendarDate \}\)/);
  assert.match(calendar, /const date = !isHistoricalSeason \? currentCalendarDate \?\? initialWeekStart : firstFullWeekStart\(activeSeason\)/);
  assert.match(calendar, /const date = currentCalendarDate \?\? activeWeekStart/);
  assert.match(calendar, /onLocationChange\(\{ weekStart: startOfWeek\(date\), mobileDate: date \}\)/);
  assert.match(calendar, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.match(calendar, /weeklySectionRef\.current\?\.scrollIntoView\(\{ behavior, block: "start" \}\)/);
  assert.match(schedule, /timelineMarkerForDateTime\(\s*currentBeijingDate,\s*currentBeijingTime,\s*timelineStartMinutes,\s*timelineEndMinutes,\s*\)/);
  assert.match(schedule, /mappedCurrentTimelineMarker && dates\.includes\(mappedCurrentTimelineMarker\.date\)/);
  assert.equal((schedule.match(/const isToday = date === currentCalendarDate/g) ?? []).length, 2);
  assert.match(schedule, /className=\{"timeline-date-only" \+ \(date === currentCalendarDate \? " is-today" : ""\)\}/);
  assert.match(schedule, /className=\{"timeline-day-header" \+ \(isToday \? " is-today" : ""\)\}/);
  assert.match(schedule, /className=\{"timeline-day" \+ \(isToday \? " is-today" : ""\)\}/);
  assert.match(schedule, /className="timeline-current-time timeline-current-time-axis"/);
  assert.match(schedule, /className="timeline-current-time" style=\{currentTimelineMarkerStyle\} aria-hidden="true"/);
  assert.match(cards, /const isToday = event\.date === currentCalendarDate/);
  assert.doesNotMatch(schedule, /dates\.includes\(currentBeijingDate\)|date === currentBeijingDate/);
});

test("shares event duration and original broadcast details across desktop and mobile cards", async () => {
  const [schedule, cards, styles, calendar] = await Promise.all([
    readSource("../app/components/calendar-schedule.tsx"), readSource("../app/components/calendar-cards.tsx"),
    readStyles(), readSource("../lib/calendar.js"),
  ]);
  assert.match(calendar, /export const TIMELINE_EVENT_DURATION_MINUTES = 30/);
  assert.match(schedule, /"--timeline-event-height": TIMELINE_EVENT_DURATION_MINUTES \* 1\.6 \+ "px"/);
  assert.match(schedule, /"--timeline-height": timelineHourCount \* 96 \+ TIMELINE_EVENT_DURATION_MINUTES \* 1\.6 \+ "px"/);
  assert.match(styles, /\.timeline-event\s*\{[^}]*height:\s*var\(--timeline-event-height\);/);
  assert.match(styles, /\.timeline-axis\s*\{[^}]*grid-template-rows:\s*repeat\(var\(--timeline-hour-count\), 96px\) var\(--timeline-event-height\);/);
  assert.match(schedule, /layoutTimelineEvents\(events\.filter\(\(event\) => event\.date === date\)\)/);
  assert.match(schedule, /groupedEvents\.map\(\(event\) => eventButton\(event\)\)/);
  assert.doesNotMatch(schedule, /groupedEvents\.length\s*>=\s*3/);
  assert.match(cards, /timelineOffsetMinutes\(event\.time, timelineStartMinutes, timelineEndMinutes\)/);
  assert.match(cards, /selectedDate: event\.broadcastDate,\s*selectedTime: event\.broadcastTime/);
  assert.match(cards, /selectedReleaseKind: "network"/);
  assert.match(cards, /网络配信 · \{episodeLabel\} · 时刻未定/);
  assert.match(cards, /<strong title=\{event\.titleZh\}>\{event\.titleZh\}<\/strong>/);
  assert.match(cards, /aria-pressed=\{isWatched\}/);
  assert.match(cards, /episodeViewUnitsForRange\(watchedEpisode\)/);
  assert.match(cards, /disabled=\{watchedEpisodes === null \|\| isSavingWatch\}/);
  assert.match(cards, /showTime \? <><time className="calendar-event-time">\{displayTime\}<\/time>/);
});

test("keeps native detail-dialog focus restoration, source information, and independent episode buttons", async () => {
  const detail = await readSource("../app/components/anime-detail.tsx");
  assert.match(detail, /dialogRef\.current\.showModal\(\)/);
  assert.match(detail, /<dialog\b[^>]*aria-labelledby="anime-detail-title"/);
  assert.match(detail, /<h2 id="anime-detail-title">\{selected\.titleZh\}<\/h2>/);
  assert.match(detail, /<p className="detail-title-ja">\{selected\.titleJa\}<\/p>/);
  assert.match(detail, /<CoverArt anime=\{selected\} className="detail-cover" variant="detail" \/>/);
  assert.match(detail, /onClose=\{handleDialogClose\}/);
  assert.match(detail, /setSelected\(null\);\s*openerRef\.current\?\.focus\(\)/);
  assert.match(detail, /clickEvent\.clientX < rect\.left[\s\S]*?clickEvent\.clientX > rect\.right[\s\S]*?clickEvent\.clientY < rect\.top[\s\S]*?clickEvent\.clientY > rect\.bottom/);
  assert.match(detail, /episodeViewUnitsForAnime\(selected\)/);
  assert.match(detail, /selectedEpisodeUnits\.map\(\(unit\) =>/);
  assert.match(detail, /const unitWatchedEpisode = \{ animeId: selected\.id, \.\.\.unit \}/);
  assert.match(detail, /onClick=\{\(\) => void toggleEpisodeView\(unitWatchedEpisode\)\}/);
  assert.match(detail, /disabled=\{watchedEpisodes === null \|\| savingEpisodeKeys\.includes\(key\)\}/);
  assert.match(detail, /selected\.selectedReleaseKind === "network"/);
  assert.match(detail, /资料未列出，暂按 12 集/);
  assert.match(detail, /href=\{selected\.sourceUrl\}/);
});

test("keeps preview scaffolding and build metadata out of the deliverable", async () => {
  const [layout, gitignore, packageJson] = await Promise.all([
    readSource("../app/layout.tsx"), readSource("../.gitignore"), readSource("../package.json"),
  ]);
  assert.doesNotMatch(layout, /Starter Project|Geist|codex-preview|Your site is taking shape/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(gitignore, /^tsconfig\.tsbuildinfo$/m);
  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)), { code: "ENOENT" });
});
