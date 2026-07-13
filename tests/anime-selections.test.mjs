import assert from "node:assert/strict";
import test from "node:test";

import { validateAnimeIds } from "../lib/anime-selections.js";

const validIds = new Set(["sayonara-lara", "mobius-dust"]);

test("accepts unique known anime IDs", () => {
  assert.deepEqual(
    validateAnimeIds(["sayonara-lara", "mobius-dust", "sayonara-lara"], validIds),
    ["sayonara-lara", "mobius-dust"],
  );
});

test("rejects invalid selection payloads", () => {
  assert.throws(() => validateAnimeIds("sayonara-lara", validIds), /animeIds/);
  assert.throws(() => validateAnimeIds(["unknown"], validIds), /unknown/);
});
