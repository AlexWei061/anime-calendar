import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

const repoRoot = resolve(import.meta.dirname, "../..");
const teachRoot = join(repoRoot, "teach");

const pages = [
  "index.html",
  "map.html",
  "reference.html",
  "learn/01-language.html",
  "learn/02-web.html",
  "learn/03-react.html",
  "learn/04-architecture.html",
  "learn/05-calendar.html",
  "learn/06-backend.html",
  "learn/07-tooling.html",
  "learn/08-maintenance.html",
  "handbook/ui.html",
  "handbook/schedule.html",
  "handbook/data-pipeline.html",
  "handbook/personal-data.html",
  "handbook/auth.html",
  "handbook/database.html",
  "handbook/release.html",
  "lab/index.html",
  "lab/midnight.html",
  "lab/session.html",
  "lab/watched.html",
];

function read(relativePath) {
  return readFileSync(join(teachRoot, relativePath), "utf8");
}

function loadClassicScript(relativePath, seed = {}) {
  const context = vm.createContext({ ...seed });
  vm.runInContext(read(relativePath), context, { filename: relativePath });
  return context;
}

test("core teaching-site assets exist", () => {
  for (const path of ["index.html", "styles.css", "search-index.js", "app.js"]) {
    assert.equal(existsSync(join(teachRoot, path)), true, `${path} should exist`);
  }
});

test("the home page identifies both learning routes", () => {
  const html = read("index.html");
  assert.match(html, /系统学习/);
  assert.match(html, /立即做事/);
  assert.match(html, /data-project-pipeline/);
  assert.match(html, /fa0b83c/);
});

test("search normalizes case, spaces, hyphens, and slashes", () => {
  const context = loadClassicScript("app.js");
  const { normalizeSearch } = context.AnimeCalendarTeach;
  assert.equal(normalizeSearch(" App/API  Anime-Selections "), "app api anime selections");
});

test("search matches title, keywords, summary, and path", () => {
  const context = loadClassicScript("app.js");
  const { searchEntries } = context.AnimeCalendarTeach;
  const entries = [
    {
      title: "登录",
      path: "handbook/auth.html",
      section: "维护",
      keywords: ["cookie"],
      summary: "排查 401",
    },
    {
      title: "时间轴",
      path: "learn/05-calendar.html",
      section: "课程",
      keywords: ["凌晨"],
      summary: "日期布局",
    },
  ];
  assert.equal(searchEntries(entries, "COOKIE")[0].title, "登录");
  assert.equal(searchEntries(entries, "401")[0].title, "登录");
  assert.equal(searchEntries(entries, "calendar")[0].title, "时间轴");
});

test("storage helpers fail closed without throwing", () => {
  const context = loadClassicScript("app.js");
  const brokenStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(
    JSON.stringify(context.AnimeCalendarTeach.readJson(brokenStorage, "x", ["fallback"])),
    JSON.stringify(["fallback"]),
  );
  assert.equal(context.AnimeCalendarTeach.writeJson(brokenStorage, "x", []), false);
});

test("project map exposes all layers and three data flows", () => {
  const html = read("map.html");
  for (const layer of ["browser", "data", "lib", "react", "api", "auth", "d1", "build"]) {
    assert.match(html, new RegExp(`data-layer="${layer}"`));
  }
  for (const flow of ["calendar", "selection", "session"]) {
    assert.match(html, new RegExp(`data-flow-control="${flow}"`));
  }
});

const foundationalLearningMarkers = new Map([
  ["learn/01-language.html", ["const", "async", "TypeScript", "C++"]],
  ["learn/02-web.html", ["HTTP", "Cookie", "JSON", "401"]],
  ["learn/03-react.html", ["UI = f(state)", "useState", "useEffect", "app/page.tsx"]],
  ["learn/04-architecture.html", ["data/anime.js", "lib/calendar.js", "app/api", "D1"]],
]);

test("foundational modules connect concepts to this repository", () => {
  for (const [path, markers] of foundationalLearningMarkers) {
    const html = read(path);
    for (const marker of markers) {
      assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(html, /class="analogy"/);
    assert.match(html, /class="invariant"/);
    assert.match(html, /data-progress-id=/);
    assert.match(html, /data-quiz/);
  }
});

const depthLearningMarkers = new Map([
  [
    "learn/05-calendar.html",
    ["layoutBroadcast", "eventsForWeek", "dateOnlyEventsForWeek", "layoutTimelineEvents"],
  ],
  ["learn/06-backend.html", ["getSessionUser", "db.batch", "PBKDF2", "drizzle/"]],
  ["learn/07-tooling.html", ["typecheck", "vinext", "Cloudflare Worker", "node --test"]],
  ["learn/08-maintenance.html", ["复现", "回归测试", "最小修复", "git diff --check"]],
]);

test("project-depth modules explain current algorithms and operations", () => {
  for (const [path, markers] of depthLearningMarkers) {
    const html = read(path);
    for (const marker of markers) {
      assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(html, /class="analogy"/);
    assert.match(html, /class="invariant"/);
    assert.match(html, /data-progress-id=/);
    assert.match(html, /data-quiz/);
  }
});

const handbookPages = [
  "handbook/ui.html",
  "handbook/schedule.html",
  "handbook/data-pipeline.html",
  "handbook/personal-data.html",
  "handbook/auth.html",
  "handbook/database.html",
  "handbook/release.html",
];

test("every maintenance handbook has the same operational safety structure", () => {
  for (const path of handbookPages) {
    const html = read(path);
    for (const heading of [
      "成功标准",
      "先读这些文件",
      "最小修改顺序",
      "回归测试",
      "验证",
      "停止并确认",
    ]) {
      assert.match(html, new RegExp(heading));
    }
    assert.match(html, /data-progress-id=/);
    assert.match(html, /class="risk-level/);
  }
});

const debugScenarios = new Map([
  [
    "lab/midnight.html",
    ["layoutBroadcast", "04:59", "05:00", "lib/calendar.js"],
  ],
  [
    "lab/session.html",
    ["Set-Cookie", "/api/auth/me", "Secure", "HttpOnly"],
  ],
  [
    "lab/watched.html",
    ["episodeViewUnitsForAnime", "单集", "刷新", "getSessionUser"],
  ],
]);

test("debug lab teaches an evidence-first loop with gated decisions", () => {
  const indexHtml = read("lab/index.html");
  for (const path of debugScenarios.keys()) {
    assert.match(indexHtml, new RegExp(path.split("/").at(-1)));
  }

  for (const [path, markers] of debugScenarios) {
    const html = read(path);
    for (const heading of ["现象", "假设", "证据", "最小复现", "回归测试", "修复边界"]) {
      assert.match(html, new RegExp(heading));
    }
    for (const marker of markers) {
      assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }

    const stages = html.match(/<section[^>]+data-debug-stage[\s\S]*?<\/section>/g) ?? [];
    assert.ok(stages.length >= 2, `${path} should have at least two decision stages`);
    for (const stage of stages) {
      const choices = stage.match(/data-debug-choice/g) ?? [];
      const correctChoices = stage.match(/data-correct="true"/g) ?? [];
      assert.ok(choices.length >= 3, "each stage should offer at least three hypotheses");
      assert.equal(correctChoices.length, 1, "each stage should have exactly one best next step");
    }
    assert.match(html, /data-debug-reset/);
    assert.match(html, /data-progress-id=/);
  }
});

test("the shared script exposes the debug-lab enhancement", () => {
  const context = loadClassicScript("app.js");
  assert.equal(typeof context.AnimeCalendarTeach.initDebugLabs, "function");
});

test("the public page inventory is complete and searchable", () => {
  const indexContext = loadClassicScript("search-index.js");
  const entries = indexContext.ANIME_CALENDAR_TEACH_INDEX;
  assert.equal(pages.length, 22);
  assert.equal(entries.length, pages.length);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
  assert.deepEqual(
    [...entries.map((entry) => entry.path)].sort(),
    [...pages].sort(),
  );

  for (const path of pages) {
    assert.equal(existsSync(join(teachRoot, path)), true, `${path} should exist`);
    const html = read(path);
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<html lang="zh-CN"/);
    assert.match(html, /<meta\s+[^>]*name="description"/);
    assert.match(html, /<body data-page-id="[^"]+"/);
    assert.match(html, /styles\.css/);
    assert.match(html, /search-index\.js/);
    assert.match(html, /app\.js/);
  }
});

test("finished site stays local and every annotated project path resolves", () => {
  for (const path of pages) {
    const html = read(path);
    assert.doesNotMatch(html, /https?:\/\//);
    assert.doesNotMatch(html, /teach__\//);
    const projectPaths = [...html.matchAll(/data-project-path="([^"]+)"/g)].map(
      (match) => match[1],
    );
    for (const projectPath of projectPaths) {
      assert.equal(
        existsSync(join(repoRoot, projectPath)),
        true,
        `${path} references missing project path ${projectPath}`,
      );
    }
  }
  for (const path of ["app.js", "search-index.js", "styles.css"]) {
    const source = read(path);
    assert.doesNotMatch(source, /https?:\/\//);
    assert.doesNotMatch(source, /teach__\//);
  }
});

export { loadClassicScript, pages, read, repoRoot, teachRoot };
