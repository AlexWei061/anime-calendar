import test from "node:test";
import assert from "node:assert/strict";
const { calendarDay, normalizeTitle, episodeKey } = await import(
  process.env.TEACH_SOLUTION === "1" ? "./solution.mjs" : "./repair.mjs"
);

test("凌晨 04:59 属于前一放送日", () => {
  assert.equal(calendarDay("2026-08-01", "04:59"), "2026-07-31");
});

test("边界 05:00 属于当天", () => {
  assert.equal(calendarDay("2026-08-01", "05:00"), "2026-08-01");
});

test("搜索忽略 ASCII 大小写与空白", () => {
  assert.equal(normalizeTitle(" BanG Dream "), "bangdream");
});

test("搜索统一全角英文字符", () => {
  assert.equal(normalizeTitle(" ｂａｎｇ　ｄｒｅａｍ "), "bangdream");
});

test("不同番剧有不同单集键", () => {
  assert.notEqual(episodeKey("alpha", 1), episodeKey("beta", 1));
});

test("同一番不同集有不同单集键", () => {
  assert.notEqual(episodeKey("alpha", 1), episodeKey("alpha", 2));
});
