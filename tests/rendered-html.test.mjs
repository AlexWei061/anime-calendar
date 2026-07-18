import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { anime, seasons } from "../data/anime.js";

const templateRoot = new URL("../", import.meta.url);
const previewRoot = new URL("../app/_sites-preview/", import.meta.url);
const tsBuildInfo = new URL("../tsconfig.tsbuildinfo", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", String(process.pid) + "-" + Date.now());
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function withoutReactMarkers(markup) {
  return markup.replaceAll("<!-- -->", "");
}

test("server-renders a paged Beijing episode calendar", async () => {
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
  assert.match(html, /2026 年 7 月番时间表/);
  assert.match(withoutReactMarkers(html), /66 部番剧/);
  assert.match(html, /class="page-sidebar"/);
  assert.match(html, /播出表/);
  assert.match(html, /我的番剧/);
  assert.match(html, /<label class="season-picker"/);
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
  assert.match(html, /从首播日起按周显示/);
  assert.match(html, /上一周/);
  assert.match(html, /下一周/);
  assert.match(html, /回到本周/);
  assert.match(cleanHtml, /2026年7月6日 — 7月12日/);
  assert.match(html, /class="timeline-grid"/);
  assert.match(html, /class="timeline-axis"/);
  assert.match(html, /class="timeline-day"/);
  assert.match(html, /--timeline-hour-count:22;--timeline-height:2152px/);
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
  assert.match(html, /background-image:url\(\/covers\/yuc\/sprites\/cover-sheet-\d+\.webp\)/);
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

test("renders one Monday-through-Sunday grid with timed and network-only program details", async () => {
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
  assert.match(networkCards.join(""), /background-image:url\(\/covers\/yuc\/sprites\/cover-sheet-\d+\.webp\)/);
  assert.match(networkCards.join(""), /\bcover-sprite\b/);

  const sourceLinks = [
    ...html.matchAll(/<a\b(?=[^>]*href="https:\/\/yuc\.wiki\/202607\/")[^>]*>/g),
  ].map(([tag]) => tag);
  assert.equal(sourceLinks.length, 2);
  assert.ok(sourceLinks.every((tag) => /target="_blank"/.test(tag)));
  assert.ok(sourceLinks.every((tag) => /rel="noreferrer"/.test(tag)));
});

test("renders separate accessible watched controls without nesting calendar buttons", async () => {
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

test("ships interactive, collapsible personal statistics cards with sticky season navigation", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type Page = "all" \| "mine" \| "stats";/);
  assert.match(page, /changePage\("stats"\)/);
  assert.match(page, /page === "mine" \|\| page === "stats"/);
  assert.match(page, /url\.searchParams\.set\("page", page\);/);
  assert.match(
    page,
    /import \{(?=[^}]*\bbroadcastsForDate\b)(?=[^}]*\bprogressForAnime\b)(?=[^}]*\bprogressTotals\b)(?=[^}]*\bsortProgressBySeasonThenWatchedEpisodes\b)[^}]*\} from "\.\.\/lib\/anime-statistics\.js";/,
  );
  assert.match(page, /const selectedAnime = allAnime\.filter\(\(record\) => selectedAnimeIds\?\.includes\(record\.id\)\);/);
  assert.match(page, /const allProgress = progressForAnime\(selectedAnime, watchedEpisodes \?\? \[\]\);/);
  assert.match(page, /const selectedOverallSeason = seasons\.find\(\(\{ id \}\) => id === selectedOverallSeasonId\);/);
  assert.match(page, /const displayedOverallProgressTotals = progressTotals\(displayedOverallProgress\);/);
  assert.match(page, /sortProgressBySeasonThenWatchedEpisodes/);
  assert.match(page, /const overallProgress = sortProgressBySeasonThenWatchedEpisodes\(allProgress, seasonIndexByAnimeId\);/);
  assert.match(page, /const overallProgressBySeason = seasons/);
  assert.match(page, /const displayedOverallProgressBySeason = overallProgressBySeason;/);
  assert.match(page, /\.reverse\(\);/);
  assert.match(page, /const todayBroadcasts = currentBeijingDate \? broadcastsForDate\(selectedAnime, currentBeijingDate\) : \[\];/);
  assert.match(page, /今日播出/);
  assert.match(page, /只显示你收藏的番剧/);
  assert.match(page, /type StatisticsSection = "today" \| "overview";/);
  assert.match(page, /const \[collapsedStatisticsSections, setCollapsedStatisticsSections\] = useState<StatisticsSection\[\]>\(\[\]\);/);
  assert.match(page, /const isStatisticsSectionCollapsed = \(section: StatisticsSection\) =>/);
  assert.match(page, /const toggleStatisticsSection = \(section: StatisticsSection\) =>/);
  assert.match(page, /className="statistics-section-heading-toggle"/);
  assert.match(page, /className="statistics-section-chevron" aria-hidden="true" \/>/);
  assert.match(page, /aria-expanded=\{!isStatisticsSectionCollapsed\("today"\)\}/);
  assert.match(page, /aria-controls="statistics-today-content"/);
  assert.match(page, /id="statistics-today-content" hidden=\{isStatisticsSectionCollapsed\("today"\)\}/);
  assert.match(page, /<div className="statistics-progress-content" id="statistics-overview-content" hidden=\{isStatisticsSectionCollapsed\("overview"\)\}>/);
  assert.doesNotMatch(page, /statistics-season-content/);
  assert.doesNotMatch(page, /className="statistics-season"/);
  assert.match(
    page,
    /<dl className="statistics-overview-grid">[\s\S]*?<div className="statistics-progress-content" id="statistics-overview-content" hidden=\{isStatisticsSectionCollapsed\("overview"\)\}>/,
  );
  assert.match(page, /className="statistics-overview-summary"/);
  assert.match(page, /selectedOverallSeason \? "本季追番" : "追番总数"/);
  assert.match(page, /displayedOverallProgressTotals\.total/);
  assert.match(page, /const statisticsAnimeCard = \(/);
  assert.match(page, /className="statistics-anime-card"/);
  assert.match(page, /aria-haspopup="dialog"/);
  assert.match(page, /onClick=\{\(clickEvent\) => openDetail\(record, clickEvent\.currentTarget, selection\)\}/);
  assert.match(page, /selectedDate: event\.broadcastDate/);
  assert.match(page, /selectedEpisode: event\.episode/);
  assert.match(page, /className="statistics-anime-card-list"/);
  assert.match(page, /className="statistics-anime-card-progress"/);
  assert.match(page, /width: `\$\{\(watchedEpisodeCount \/ record\.episodeCount\) \* 100\}%`/);
  assert.match(page, /displayedOverallProgressBySeason\.map\(\(\{ season, progress \}\) =>/);
  assert.match(page, /选择季度/);
  assert.match(
    page,
    /statistics-overview"[\s\S]*?className="statistics-section-controls"[\s\S]*?选择季度[\s\S]*?statistics-overview-grid/,
  );
  assert.doesNotMatch(page, /statistics-overview-locator/);
  assert.match(page, /statistics-overview-season-\$\{season\.id\}/);
  assert.match(page, /<option value="">All<\/option>/);
  assert.match(page, /getElementById\("statistics-overview"\)\?\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(page, /getElementById\(`statistics-overview-season-\$\{seasonId\}`\)\s*\?\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.doesNotMatch(page, /className="statistics-status-groups"/);
  assert.match(page, /在追/);
  assert.match(page, /已看完/);
  assert.match(page, /未开始/);
  assert.match(page, /<label className="statistics-season-picker">/);
  assert.match(page, /value=\{selectedOverallSeasonId\}/);
  assert.match(page, /已看 \$\{progress\.watchedEpisodeCount\} \/ \$\{progress\.record\.episodeCount\} 集/);
  assert.match(page, /最后标记第 \$\{progress\.latestWatchedEpisode\} 集/);
  assert.match(page, /<CoverArt anime=\{record\} className="statistics-anime-card-cover" decorative \/>/);
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
  assert.match(styles, /\.statistics-overview-summary\s*\{[\s\S]*?position: sticky;[\s\S]*?top: 0\.75rem;/);
  assert.match(styles, /@media \(max-width: 860px\) \{[\s\S]*?\.statistics-anime-card-list/);
});

test("renders same-time events side by side on one timeline day", async () => {
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
    sameTimeEvents.every(([, , card]) => /class="calendar-event-cover cover-sprite"/.test(card)),
  );
  assert.match(sameTimeEvents.map(([, , card]) => card).join(""), /暴怒千金誓要复仇/);
  assert.match(sameTimeEvents.map(([, , card]) => card).join(""), /世界舞动/);
});

test("keeps navigation, dialog wiring, and responsive calendar layout durable", async () => {
  const [page, layout, styles, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /useRef/);
  assert.match(page, /useSyncExternalStore<string \| null>/);
  assert.match(page, /const \[activePage, setActivePage\] = useState/);
  assert.match(page, /const activeSeason = seasonForWeek\(seasons, activeWeekStart\);/);
  assert.doesNotMatch(page, /const \[activeSeasonId, setActiveSeasonId\] = useState/);
  assert.match(page, /const initialSeasonId = "2026-july";/);
  assert.match(page, /activeSeason\.label/);
  assert.doesNotMatch(page, /冬番|春番|夏番/);
  assert.doesNotMatch(layout, /冬番|春番|夏番/);
  assert.match(page, /选择季度/);
  assert.match(
    page,
    /YUC 提供目录、名称、封面及网络首播日期；电视排期按 AniList 历史记录与しょぼいカレンダー核对。/,
  );
  assert.doesNotMatch(page, /AniList 原文与罗马音|AniList 历史放送记录/);
  assert.match(page, /const isHistoricalSeason = activeSeason\.id !== initialSeasonId;/);
  assert.match(page, /已收录作品，但暂未确认固定的每周播出时刻。/);
  assert.match(page, /dateOnlyEventsForWeek/);
  assert.match(page, /const episodeLabel = formatEpisodeLabel\(event\.episodeStart, event\.episode\);/);
  assert.match(page, /网络配信 · \{episodeLabel\} · 时刻未定/);
  assert.match(page, /"timeline-grid" \+ \(dateOnlyEvents\.length \? " has-date-only-events" : ""\)/);
  assert.match(page, /className=\{"timeline-date-only" \+/);
  assert.doesNotMatch(styles, /\.date-only-events\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(
    page,
    /const nextWeekStart = firstFullWeekStart\(nextSeason\);[\s\S]*?setActiveWeekStart\(nextWeekStart\);[\s\S]*?setActiveMobileDate\(nextWeekStart\);/,
  );
  assert.match(
    page,
    /import\s*\{[\s\S]*?\btimelineBoundsForEvents,[\s\S]*?\}\s*from "\.\.\/lib\/calendar\.js";/,
  );
  assert.match(page, /const defaultTimelineStartMinutes = 5 \* 60;/);
  assert.match(page, /const defaultTimelineEndMinutes = 29 \* 60;/);
  assert.match(
    page,
    /const calendarAnime =\s*activePage === "mine"\s*\?\s*allAnime\.filter\(\(record\) => selectedAnimeIds\?\.includes\(record\.id\)\)\s*:\s*allAnime;/,
  );
  assert.match(
    page,
    /const selectedSeasonAnime = activeSeason\.anime\.filter\(\(record\) => selectedAnimeIds\?\.includes\(record\.id\)\);/,
  );
  assert.match(page, /const networkOnly = matchingSeasonAnime\.filter\(/);
  assert.match(
    page,
    /timelineBoundsForEvents\(events, defaultTimelineStartMinutes, defaultTimelineEndMinutes\)/,
  );
  assert.match(
    page,
    /const timelineHourCount = \(timelineEndMinutes - timelineStartMinutes\) \/ 60;/,
  );
  assert.match(page, /"--timeline-hour-count": String\(timelineHourCount\)/);
  assert.doesNotMatch(
    page,
    /const timelineEndMinutes = activeSeason\.timelineStartHour < 15 \? 28 \* 60 \+ 59 : 28 \* 60;/,
  );
  assert.match(page, /timelineOffsetMinutes\(event\.time, timelineStartMinutes, timelineEndMinutes\)/);
  assert.match(page, /new URLSearchParams\(window\.location\.search\)\.get\("page"\)/);
  assert.match(page, /window\.history\.pushState\(null, "", url\);/);
  assert.match(page, /window\.addEventListener\("popstate", syncPageFromUrl\)/);
  assert.match(page, /<details className="anime-selection-details">/);
  assert.match(page, /<summary className="anime-selection-summary">/);
  assert.match(page, /本季度想追什么？/);
  assert.doesNotMatch(page, /本月番想追什么？/);
  assert.match(page, /<span title=\{record\.titleZh\}>\{record\.titleZh\}<\/span>/);
  assert.match(page, /const \[selectedAnimeIds, setSelectedAnimeIds\] = useState/);
  assert.match(page, /fetch\("\/api\/anime-selections"/);
  assert.match(page, /selectedAnimeIds\.includes\(record\.id\)/);
  assert.match(
    page,
    /import\s*\{(?=[^}]*\bepisodeViewKey\b)(?=[^}]*\bupdateEpisodeViews\b)[^}]*\}\s*from "\.\.\/lib\/anime-episode-views\.js";/,
  );
  assert.match(page, /const \[watchedEpisodes, setWatchedEpisodes\] = useState<WatchedEpisode\[\] \| null>\(null\);/);
  assert.match(page, /const \[watchedEpisodeError, setWatchedEpisodeError\] = useState<string \| null>\(null\);/);
  assert.match(page, /const \[savingEpisodeKeys, setSavingEpisodeKeys\] = useState<string\[\]>\(\[\]\);/);
  assert.match(page, /fetch\("\/api\/anime-episode-views"/);
  assert.match(page, /episodeViewKey\(watchedEpisode\)/);
  assert.match(page, /savingEpisodeKeys\.includes\(key\)/);
  assert.match(
    page,
    /const nextWatchedEpisodes = updateEpisodeViews\(watchedEpisodes, watchedEpisode, !isWatched\);/,
  );
  assert.match(
    page,
    /catch \{\s*setWatchedEpisodes\(\(current\) => \{\s*if \(current === null\) return null;\s*return updateEpisodeViews\(current, watchedEpisode, isWatched\);/,
  );
  assert.doesNotMatch(page, /setWatchedEpisodes\(previousWatchedEpisodes\);/);
  assert.match(page, /无法读取已看记录。请稍后重试。/);
  assert.match(page, /保存已看状态失败，请重试。/);
  assert.match(page, /eventsForWeek\(matchingCalendarAnime, activeWeekStart\)/);
  assert.doesNotMatch(page, /eventsForWeek\(displayedAnime, activeWeekStart\)/);
  assert.match(page, /function getServerBeijingDate\(\) \{\s*return null;/);
  assert.match(page, /function subscribeToBeijingDate\(onStoreChange: \(\) => void\)/);
  assert.match(page, /window\.setInterval\(onStoreChange, 60_000\)/);
  assert.match(page, /eventsForWeek\(matchingCalendarAnime, activeWeekStart\)/);
  assert.match(page, /formatBroadcastTime/);
  assert.match(page, /groupEventsByTime/);
  assert.match(page, /layoutTimelineEvents/);
  assert.match(page, /timelineOffsetMinutes/);
  assert.match(
    page,
    /function compactDate\(isoDate: string\) \{[\s\S]*?return Number\(month\) \+ "\/" \+ Number\(day\);/,
  );
  assert.match(page, /<b>\{compactDate\(date\)\}<\/b>/);
  assert.match(page, /groupedEvents\.map\(\(event\) => eventButton\(event\)\)/);
  assert.match(page, /<strong title=\{event\.titleZh\}>\{event\.titleZh\}<\/strong>/);
  assert.doesNotMatch(page, /stackEventsForDay|timeToMinutes/);
  assert.match(page, /const changeWeek = \(days: number\)/);
  assert.match(page, /changeWeek\(-7\)/);
  assert.match(page, /changeWeek\(7\)/);
  assert.match(page, /startOfWeek\(currentBeijingDate\)/);
  assert.match(page, /formatEpisodeLabel\(event\.episodeStart, event\.episode\)/);
  assert.match(page, /event\.episode/);
  assert.match(page, /selectedEpisodeStart/);
  assert.match(page, /selectedEpisode/);
  assert.match(
    page,
    /onClick=\{\(clickEvent\) =>\s*openDetail\(event, clickEvent\.currentTarget, \{\s*selectedDate: event\.broadcastDate,\s*selectedTime: event\.broadcastTime,/,
  );
  assert.match(page, /\{selected \? \(/);
  assert.match(page, /selected\.titleZh/);
  assert.match(page, /<CoverArt anime=\{selected\} className="detail-cover" \/>/);
  assert.match(page, /dialogRef\.current\.showModal\(\)/);
  assert.match(
    page,
    /<dialog[\s\S]*?ref=\{dialogRef\}[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/,
  );
  assert.match(page, /onClose=\{handleDialogClose\}/);
  assert.match(
    page,
    /onClick=\{\(clickEvent\) => \{[\s\S]*?const rect = clickEvent\.currentTarget\.getBoundingClientRect\(\);[\s\S]*?clickEvent\.clientX < rect\.left[\s\S]*?\|\|[\s\S]*?clickEvent\.clientX > rect\.right[\s\S]*?\|\|[\s\S]*?clickEvent\.clientY < rect\.top[\s\S]*?\|\|[\s\S]*?clickEvent\.clientY > rect\.bottom[\s\S]*?clickEvent\.currentTarget\.close\(\);/,
  );
  assert.match(
    page,
    /const handleDialogClose = \(\) => \{[\s\S]*?setSelected\(null\);[\s\S]*?openerRef\.current\?\.focus\(\);/,
  );
  assert.match(page, /aria-label="关闭详情"/);
  assert.match(page, /dialogRef\.current\?\.close\(\)/);
  assert.doesNotMatch(page, /codex-preview|Your site is taking shape|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|Geist|codex-preview|Your site is taking shape/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(previewRoot), { code: "ENOENT" });
  assert.equal(templateRoot.pathname.endsWith("/"), true);
  assert.deepEqual(
    seasons.map(({ id, label }) => ({ id, label })),
    [
      { id: "2020-january", label: "2020 年 1 月番" },
      { id: "2020-april", label: "2020 年 4 月番" },
      { id: "2020-july", label: "2020 年 7 月番" },
      { id: "2020-october", label: "2020 年 10 月番" },
      { id: "2021-january", label: "2021 年 1 月番" },
      { id: "2021-april", label: "2021 年 4 月番" },
      { id: "2021-july", label: "2021 年 7 月番" },
      { id: "2021-october", label: "2021 年 10 月番" },
      { id: "2022-january", label: "2022 年 1 月番" },
      { id: "2022-april", label: "2022 年 4 月番" },
      { id: "2022-july", label: "2022 年 7 月番" },
      { id: "2022-october", label: "2022 年 10 月番" },
      { id: "2023-january", label: "2023 年 1 月番" },
      { id: "2023-april", label: "2023 年 4 月番" },
      { id: "2023-july", label: "2023 年 7 月番" },
      { id: "2023-october", label: "2023 年 10 月番" },
      { id: "2024-january", label: "2024 年 1 月番" },
      { id: "2024-april", label: "2024 年 4 月番" },
      { id: "2024-july", label: "2024 年 7 月番" },
      { id: "2024-october", label: "2024 年 10 月番" },
      { id: "2025-january", label: "2025 年 1 月番" },
      { id: "2025-april", label: "2025 年 4 月番" },
      { id: "2025-july", label: "2025 年 7 月番" },
      { id: "2025-october", label: "2025 年 10 月番" },
      { id: "2026-january", label: "2026 年 1 月番" },
      { id: "2026-april", label: "2026 年 4 月番" },
      { id: "2026-july", label: "2026 年 7 月番" },
    ],
  );

  assert.match(
    styles,
    /\.detail-cover\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*auto;[\s\S]*?aspect-ratio:\s*3\s*\/\s*4;[\s\S]*?max-height:\s*none;[\s\S]*?background-repeat:\s*no-repeat;/,
  );
  assert.match(styles, /:focus-visible/);
  assert.match(
    styles,
    /\.site-shell\s*\{[\s\S]*?grid-template-columns:\s*13rem minmax\(0, 1fr\);/,
  );
  assert.match(styles, /\.page-sidebar button\.is-active/);
  assert.match(
    styles,
    /\.page-sidebar\s*\{[\s\S]*?align-self:\s*start;[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*0;/,
  );
  assert.match(styles, /\.season-picker\s*\{/);
  assert.match(styles, /\.anime-selection-list\s*\{[\s\S]*?grid-template-columns/);
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
    /\.timeline-axis\s*\{[\s\S]*?grid-template-rows:\s*repeat\(var\(--timeline-hour-count\), 96px\) 40px;[\s\S]*?height:\s*var\(--timeline-height\);[\s\S]*?background-image:\s*var\(--timeline-lines\);/,
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
    /\.timeline-day\.is-today\s*\{[\s\S]*?background-color:\s*color-mix\(/,
  );
  assert.match(
    styles,
    /\.timeline-event\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*var\(--event-top\);[\s\S]*?left:\s*calc\(var\(--event-left\) \+ var\(--timeline-event-gutter\)\);[\s\S]*?width:\s*calc\(var\(--event-width\) - var\(--timeline-event-gutter\)\);[\s\S]*?height:\s*40px;/,
  );
  assert.match(
    styles,
    /\.timeline-event \.calendar-event-cover\s*\{[\s\S]*?aspect-ratio:\s*3\s*\/\s*4;/,
  );
  assert.match(
    styles,
    /\.timeline-event \.calendar-event-detail strong\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
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
    /\.episode-watch-toggle\s*\{[\s\S]*?width:\s*0\.75rem;[\s\S]*?height:\s*0\.75rem;/,
  );
  assert.match(
    styles,
    /\.timeline-event \.episode-watch-toggle\s*\{[\s\S]*?width:\s*0\.75rem;[\s\S]*?height:\s*0\.75rem;/,
  );
  assert.match(
    styles,
    /\.calendar-event-content\s*\{[\s\S]*?padding-right:\s*1\.85rem;/,
  );
  assert.match(
    styles,
    /\.timeline-event \.calendar-event-content\s*\{[\s\S]*?padding-right:\s*1\.65rem;/,
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
    /\.mobile-day-picker button\s*\{[\s\S]*?padding:\s*0\.35rem 0\.1rem;[\s\S]*?font-size:\s*0\.68rem;[\s\S]*?line-height:\s*1\.2;[\s\S]*?white-space:\s*nowrap;/,
  );
  assert.match(
    styles,
    /\.mobile-agenda \.time-group-events \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
  );
  assert.match(styles, /\.detail-dialog::backdrop/);
  assert.match(styles, /\.network-card/);
  assert.doesNotMatch(styles, /\.week-column\.is-today/);
});

test("keeps title search filtering shared by calendar and mobile schedule", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /import \{ matchesAnimeTitle \} from "\.\.\/lib\/anime-search\.js";/);
  assert.match(page, /const \[animeQuery, setAnimeQuery\] = useState\(""\);/);
  assert.match(
    page,
    /const matchingCalendarAnime = calendarAnime\.filter\(\(record\) => matchesAnimeTitle\(record, animeQuery\)\);/,
  );
  assert.match(page, /eventsForWeek\(matchingCalendarAnime, activeWeekStart\)/);
  assert.match(page, /dateOnlyEventsForWeek\(\s*matchingCalendarAnime,\s*activeWeekStart,\s*\)/);
  assert.match(
    page,
    /const matchingSeasonAnime = \(activePage === "mine" \? selectedSeasonAnime : activeSeason\.anime\)\.filter\(/,
  );
  assert.match(page, /const networkOnly = matchingSeasonAnime\.filter\(/);
  assert.match(
    page,
    /<label className="anime-search">[\s\S]*?查找番剧[\s\S]*?type="search"[\s\S]*?placeholder="输入中文或日文名"/,
  );
  assert.match(page, /className="anime-search-empty"[\s\S]*?aria-live="polite"/);
  assert.match(styles, /\.anime-search\s*\{[\s\S]*?display:\s*grid;/);
  assert.match(
    styles,
    /@media \(max-width: 860px\) \{[\s\S]*?\.anime-search input\s*\{[\s\S]*?width:\s*100%;/,
  );
});

test("keeps accessible contrast tokens and generated build metadata out of the deliverable", async () => {
  const [styles, readme, gitignore] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /--muted-ink:\s*#5d6870;/);
  assert.match(styles, /--mint-deep:\s*#2f6d60;/);
  assert.match(
    readme,
    /- `npm test`：构建应用并验证日历数据、集数排期、封面图集映射和渲染后的时间表。/,
  );
  assert.doesNotMatch(readme, /npm test[^\n]*loading skeleton/i);
  assert.match(gitignore, /^tsconfig\.tsbuildinfo$/m);
  await assert.rejects(access(tsBuildInfo), { code: "ENOENT" });
});
