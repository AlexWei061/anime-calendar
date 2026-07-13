import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { anime } from "../data/anime.js";

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
  assert.match(html, /<title>番时表｜2026 夏番<\/title>/);
  assert.match(
    html,
    /<meta name="description" content="按 YUC 排期查看 2026 年夏季动画的首播、集数与周播时间。"\s*\/>/,
  );
  assert.match(html, /2026 夏番时间表/);
  assert.match(withoutReactMarkers(html), /66 部夏番/);
  assert.match(html, /北京时间/);
  assert.match(html, /从首播日起按周显示/);
  assert.match(html, /上一周/);
  assert.match(html, /下一周/);
  assert.match(html, /回到本周/);
  assert.match(html, /class="timeline-grid"/);
  assert.match(html, /class="timeline-axis"/);
  assert.match(html, /class="timeline-day"/);
  assert.match(html, /class="calendar-event timeline-event/);
  assert.match(html, /次日 01:00/);
  assert.match(html, /--event-top:528px/);
  assert.match(html, /--event-width:33\.333/);
  assert.doesNotMatch(html, /class="time-grid"/);
  assert.match(cleanHtml, /<time class="time-group-label">20:30<\/time>/);
  assert.match(cleanHtml, /次日 01:00/);
  assert.match(cleanHtml, /次日 04:00/);
  assert.match(cleanHtml, /次日 03:08/);
  assert.match(html, /class="calendar-event/);
  assert.match(html, /class="calendar-event-cover"/);
  assert.match(html, /src="\/covers\/yuc\/transparent-night\.jpg"/);
  assert.match(html, /第 <!-- -->1<!-- --> 集/);
  assert.match(html, /与奔跑在透明之夜的你 谈一场看不见的恋爱/);
  assert.match(html, /透明な夜に駆ける君と、目に見えない恋をした。/);
  assert.match(html, /YUC 首播/);
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
      /<button\b(?=[^>]*class="[^"]*\bcalendar-event\b[^"]*")[^>]*>[\s\S]*?<\/button>/g,
    ),
  ].map(([card]) => card);
  assert.ok(timedEvents.length > 20);
  assert.ok(timedEvents.every((tag) => /aria-haspopup="dialog"/.test(tag)));
  assert.ok(timedEvents.every((card) => /class="calendar-event-cover"/.test(card)));
  assert.ok(timedEvents.every((card) => /loading="lazy"/.test(card)));

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
  assert.match(networkCards.join(""), /src="\/covers\/yuc\/baki-dou-2\.jpg"/);
  assert.match(networkCards.join(""), /loading="lazy"/);

  const sourceLinks = [
    ...html.matchAll(/<a\b(?=[^>]*href="https:\/\/yuc\.wiki\/202607\/")[^>]*>/g),
  ].map(([tag]) => tag);
  assert.equal(sourceLinks.length, 2);
  assert.ok(sourceLinks.every((tag) => /target="_blank"/.test(tag)));
  assert.ok(sourceLinks.every((tag) => /rel="noreferrer"/.test(tag)));
});

test("renders three same-time events side by side on one timeline day", async () => {
  const cleanHtml = withoutReactMarkers(await (await render()).text());
  const sameTimeEvents = [
    ...cleanHtml.matchAll(
      /<button\b(?=[^>]*class="[^"]*\btimeline-event\b[^"]*")(?=[^>]*aria-label="[^"]*2026-07-10 次日 00:30")[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g,
    ),
  ];

  assert.equal(sameTimeEvents.length, 3);
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
  assert.equal(new Set(laneOffsets).size, 3);
  assert.ok(laneOffsets.includes("0%"));
  assert.ok(laneOffsets.some((offset) => /^33\.333/.test(offset ?? "")));
  assert.ok(laneOffsets.some((offset) => /^66\.666/.test(offset ?? "")));
  assert.ok(sameTimeEvents.every(([, , card]) => /class="calendar-event-cover"/.test(card)));
  assert.match(sameTimeEvents.map(([, , card]) => card).join(""), /正后方的神威/);
  assert.match(sameTimeEvents.map(([, , card]) => card).join(""), /我家的弟弟们真是让您费心了/);
  assert.match(sameTimeEvents.map(([, , card]) => card).join(""), /地狱模式/);
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
  assert.match(page, /function getServerBeijingDate\(\) \{\s*return null;/);
  assert.match(page, /function subscribeToBeijingDate\(onStoreChange: \(\) => void\)/);
  assert.match(page, /window\.setInterval\(onStoreChange, 60_000\)/);
  assert.match(page, /eventsForWeek\(anime, activeWeekStart\)/);
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
  assert.doesNotMatch(page, /stackEventsForDay|timeToMinutes|timelineStartMinutes|timelineEndMinutes/);
  assert.match(page, /const changeWeek = \(days: number\)/);
  assert.match(page, /changeWeek\(-7\)/);
  assert.match(page, /changeWeek\(7\)/);
  assert.match(page, /startOfWeek\(currentBeijingDate\)/);
  assert.match(page, /event\.episode/);
  assert.match(page, /selectedEpisode/);
  assert.match(
    page,
    /onClick=\{\(clickEvent\) =>\s*openDetail\(event, clickEvent\.currentTarget, event\.date, event\.episode\)/,
  );
  assert.match(page, /\{selected \? \(/);
  assert.match(page, /selected\.titleZh/);
  assert.match(page, /selected\.coverUrl/);
  assert.match(page, /dialogRef\.current\.showModal\(\)/);
  assert.match(
    page,
    /<dialog[\s\S]*?ref=\{dialogRef\}[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/,
  );
  assert.match(page, /onClose=\{handleDialogClose\}/);
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

  assert.match(styles, /:focus-visible/);
  assert.match(
    styles,
    /\.timeline-grid\s*\{[\s\S]*?grid-template-columns:\s*3\.5rem repeat\(7, minmax\(0, 1fr\)\);[\s\S]*?overflow:\s*(?:hidden|clip)/,
  );
  assert.match(
    styles,
    /\.timeline-axis\s*\{[\s\S]*?grid-template-rows:\s*repeat\(13, 96px\) 40px;[\s\S]*?height:\s*1288px;[\s\S]*?background-image:\s*var\(--timeline-lines\);/,
  );
  assert.match(
    styles,
    /--timeline-lines:\s*repeating-linear-gradient\([\s\S]*?transparent 1px 48px[\s\S]*?repeating-linear-gradient\([\s\S]*?transparent 1px 96px/,
  );
  assert.match(
    styles,
    /\.timeline-day\s*\{[\s\S]*?position:\s*relative;[\s\S]*?height:\s*1288px;[\s\S]*?min-width:\s*0;[\s\S]*?background-image:\s*var\(--timeline-lines\);/,
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
    /\.timeline-event \.calendar-event-cover\s*\{[\s\S]*?aspect-ratio:\s*3\s*\/\s*4;[\s\S]*?object-fit:\s*contain;/,
  );
  assert.match(
    styles,
    /\.timeline-event strong\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
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
    /- `npm test`: build the app and verify calendar data, episode scheduling, and the rendered paged time grid/,
  );
  assert.doesNotMatch(readme, /npm test[^\n]*loading skeleton/i);
  assert.match(gitignore, /^tsconfig\.tsbuildinfo$/m);
  await assert.rejects(access(tsBuildInfo), { code: "ENOENT" });
});
