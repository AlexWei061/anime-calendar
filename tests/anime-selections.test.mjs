import assert from "node:assert/strict";
import test from "node:test";

import { filterKnownAnimeIds, validateAnimeIds } from "../lib/anime-selections.js";

const validIds = new Set(["sayonara-lara", "mobius-dust"]);

test("accepts unique known anime IDs", () => {
  assert.deepEqual(
    validateAnimeIds(["sayonara-lara", "mobius-dust", "sayonara-lara"], validIds),
    ["sayonara-lara", "mobius-dust"],
  );
});

test("filters removed anime IDs from saved selections", () => {
  assert.deepEqual(
    filterKnownAnimeIds(["sayonara-lara", "removed-anime", "sayonara-lara"], validIds),
    ["sayonara-lara"],
  );
});

test("rejects invalid saved selection payloads", () => {
  assert.throws(() => filterKnownAnimeIds("sayonara-lara", validIds), /animeIds/);
  assert.throws(() => filterKnownAnimeIds(["sayonara-lara", 1], validIds), /animeIds/);
});

test("rejects invalid selection payloads", () => {
  assert.throws(() => validateAnimeIds("sayonara-lara", validIds), /animeIds/);
  assert.throws(() => validateAnimeIds(["unknown"], validIds), /unknown/);
});
