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

export { loadClassicScript, pages, read, repoRoot, teachRoot };
