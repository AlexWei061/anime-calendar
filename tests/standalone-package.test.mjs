import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import test from "node:test";

const standalone = new URL("../.next/standalone/", import.meta.url);
const packaged = await stat(standalone).then(
  () => true,
  () => false,
);

async function list(relativePath) {
  return readdir(new URL(relativePath, standalone));
}

test("standalone package includes cover sprites and static assets", { skip: !packaged }, async () => {
  const sprites = await list("public/covers/yuc/sprites/");
  assert.ok(
    sprites.some((name) => name.endsWith(".webp")),
    "expected at least one WebP sprite sheet in public/covers/yuc/sprites/",
  );

  const nextStatic = await list(".next/static/");
  assert.ok(nextStatic.length > 0, "expected .next/static/ to be packaged");
});

test("standalone package includes SQL migrations and meta journal", { skip: !packaged }, async () => {
  const drizzle = await list("drizzle/");
  assert.ok(
    drizzle.some((name) => name.endsWith(".sql")),
    "expected at least one SQL migration in drizzle/",
  );
  const meta = await list("drizzle/meta/");
  assert.ok(meta.includes("_journal.json"), "expected drizzle/meta/_journal.json to be packaged");
});

test("standalone package includes maintenance scripts", { skip: !packaged }, async () => {
  const scripts = await list("scripts/");
  for (const file of ["backup.mjs", "restore.mjs", "migrate-db.mjs", "import-d1.mjs", "storage.mjs"]) {
    assert.ok(scripts.includes(file), `expected scripts/${file} to be packaged`);
  }
});
