import assert from "node:assert/strict";
import test from "node:test";

import { matchesAnimeTitle } from "../lib/anime-search.js";

const record = {
  titleZh: "BanG Dream! YUME∞MITA",
  titleJa: "バンドリ！ ゆめ∞みた",
};

test("matches Chinese, Japanese, and normalized Latin anime title queries", () => {
  assert.equal(matchesAnimeTitle(record, "YUME"), true);
  assert.equal(matchesAnimeTitle(record, "ゆめ∞みた"), true);
  assert.equal(matchesAnimeTitle(record, "  ｂａｎｇ　ｄｒｅａｍ  "), true);
  assert.equal(matchesAnimeTitle(record, "不存在的番剧"), false);
});

test("treats an empty title query as an unfiltered result", () => {
  assert.equal(matchesAnimeTitle(record, "   "), true);
});
