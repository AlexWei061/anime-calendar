import assert from "node:assert/strict";
import test from "node:test";

import * as animeSelections from "../lib/anime-selections.js";

const { filterKnownAnimeIds, validateAnimeIds } = animeSelections;

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

test("splits 51 selections into D1-safe insert batches", () => {
  const animeIds = Array.from({ length: 51 }, (_, index) => "anime-" + index);

  assert.equal(typeof animeSelections.selectionInsertBatches, "function");
  assert.deepEqual(animeSelections.selectionInsertBatches(animeIds), [
    animeIds.slice(0, 50),
    animeIds.slice(50),
  ]);
});
