import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

import { anime } from "../data/anime.js";
import { groupByBeijingWeekday } from "../lib/schedule.js";

const templateRoot = new URL("../", import.meta.url);
const previewRoot = new URL("../app/_sites-preview/", import.meta.url);
const tsBuildInfo = new URL("../tsconfig.tsbuildinfo", import.meta.url);
const { pending, seasonal } = groupByBeijingWeekday(anime);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
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

function sectionMarkup(html, className) {
  const start = html.indexOf(`<section class="${className}"`);
  const end = html.indexOf("</section>", start);
  assert.ok(start >= 0 && end > start, `missing ${className} section`);
  return html.slice(start, end + "</section>".length);
}

function withoutReactMarkers(markup) {
  return markup.replaceAll("<!-- -->", "");
}

test("server-renders the Beijing weekly anime calendar", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>番时表｜2026 夏番<\/title>/);
  assert.match(
    html,
    /<meta name="description" content="按 YUC 排期查看 2026 年 7 月动画的首播与周播时间。"\s*\/>/,
  );
  assert.match(html, /2026 夏番/);
  assert.match(html, /北京时间（UTC\+8）/);
  assert.match(withoutReactMarkers(html), /66 部夏番/);
  assert.match(html, /BanG Dream! YUME∞MITA/);
  assert.match(html, /バンドリ！ ゆめ∞みた/);
  assert.match(html, /src="\/covers\/yuc\/yume-mita\.jpg"/);
  assert.match(html, /alt="BanG Dream! YUME∞MITA 主视觉"/);
  assert.match(html, /二十世纪电气目录/);
  assert.match(html, /二十世紀電氣目録/);
  assert.match(html, /YUC 排期／北京时间/);
  assert.match(html, /网络放送／具体时刻未列出/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /透明な夜に駆ける君と、目に見えない恋をした。/);
  assert.doesNotMatch(html, /codex-preview/i);
  assert.doesNotMatch(html, /Your site is taking shape/i);
  assert.doesNotMatch(html, /react-loading-skeleton/i);
});

test("renders ordered weekday columns, dialog cards, and a separate pending section", async () => {
  const html = await (await render()).text();
  const weekdayHeadings = [...html.matchAll(/<h3>(周[一二三四五六日])<\/h3>/g)].map(
    ([, heading]) => heading,
  );
  assert.deepEqual(weekdayHeadings, ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]);

  const cardTags = [...html.matchAll(/<button\b(?=[^>]*class="[^"]*\banime-card\b[^"]*")[^>]*>/g)].map(
    ([tag]) => tag,
  );
  assert.equal(cardTags.length, anime.length);
  assert.ok(cardTags.every((tag) => /aria-haspopup="dialog"/.test(tag)));

  const cards = [...html.matchAll(/<button\b(?=[^>]*class="[^"]*\banime-card\b[^"]*")[^>]*>[\s\S]*?<\/button>/g)].map(
    ([card]) => card,
  );
  assert.doesNotMatch(html, /class="today-marker"/);
  const transparentNight = cards.find((card) =>
    card.includes("透明な夜に駆ける君と、目に見えない恋をした。"),
  );
  assert.ok(transparentNight, "missing known scheduled card");
  assert.match(transparentNight, /anime-card-date">2026-07-06<\/span>/);
  assert.match(withoutReactMarkers(transparentNight), /YUC 排期／北京时间 · 周一 20:30/);
  assert.match(
    withoutReactMarkers(transparentNight),
    /aria-label="查看《.+／透明な夜に駆ける君と、目に見えない恋をした。》详情：YUC 排期／北京时间 · 周一 20:30"/,
  );
  const bisoku = cards.find((card) => card.includes("碧蓝航线 微速前行 第2期"));
  assert.ok(bisoku, "missing YUC 24:45 card");
  assert.match(withoutReactMarkers(bisoku), /YUC 排期／北京时间 · 周日 24:45/);

  assert.doesNotMatch(html, /class="week-column is-today"/);

  const weeklySection = sectionMarkup(html, "weekly-section");
  const catalogSection = sectionMarkup(html, "catalog-section");
  for (const record of [...seasonal, ...pending]) {
    assert.match(catalogSection, new RegExp(record.titleJa));
    assert.doesNotMatch(weeklySection, new RegExp(record.titleJa));
  }

  const sourceLinks = [
    ...html.matchAll(/<a\b(?=[^>]*href="https:\/\/yuc\.wiki\/202607\/")[^>]*>/g),
  ].map(([tag]) => tag);
  assert.equal(sourceLinks.length, 2);
  assert.ok(sourceLinks.every((tag) => /target="_blank"/.test(tag)));
  assert.ok(sourceLinks.every((tag) => /rel="noreferrer"/.test(tag)));
});

test("keeps dialog wiring, responsive layout, and starter cleanup durable", async () => {
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
  assert.match(page, /const currentBeijingDate = useSyncExternalStore/);
  assert.match(page, /airing\?\.date === currentBeijingDate/);
  assert.doesNotMatch(page, /currentWeekday === weekday\.key/);
  assert.match(
    page,
    /onClick=\{\(event\) => \{[\s\S]*?openerRef\.current = event\.currentTarget;[\s\S]*?setSelected\(record\);/,
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
  assert.match(page, /YUC 排期／北京时间/);
  assert.match(page, /YUC 首播排期/);
  assert.match(page, /排期来源/);
  assert.doesNotMatch(page, /原始日本时间|首播平台/);
  assert.match(
    page,
    /className="detail-source-link"[\s\S]*?href=\{selected\.sourceUrl\}[\s\S]*?target="_blank"[\s\S]*?rel="noreferrer"/,
  );
  assert.doesNotMatch(page, /className="dialog-backdrop"/);

  assert.doesNotMatch(page, /codex-preview|Your site is taking shape|SkeletonPreview/);
  assert.doesNotMatch(layout, /Starter Project|Geist|codex-preview|Your site is taking shape/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(previewRoot), { code: "ENOENT" });
  assert.equal(templateRoot.pathname.endsWith("/"), true);

  assert.match(styles, /:focus-visible/);
  assert.doesNotMatch(styles, /\.dialog-backdrop/);
  assert.match(styles, /\.detail-dialog/);
  assert.match(styles, /\.detail-dialog::backdrop/);
  assert.match(styles, /\.cover-frame/);
  assert.match(styles, /\.catalog-grid/);
  assert.doesNotMatch(styles, /\.week-column\.is-today/);
  assert.match(styles, /grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(
    styles,
    /@media \(max-width: 860px\) \{[\s\S]*?\.week-grid \{[\s\S]*?grid-template-columns:\s*1fr/,
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
    /- `npm test`: build the app and verify calendar data, Beijing-time schedule conversion, and rendered weekly view/,
  );
  assert.doesNotMatch(readme, /npm test[^\n]*loading skeleton/i);
  assert.match(gitignore, /^tsconfig\.tsbuildinfo$/m);
  await assert.rejects(access(tsBuildInfo), { code: "ENOENT" });
});
