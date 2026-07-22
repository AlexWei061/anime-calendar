import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("npm test runs every test file", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.match(packageJson.scripts.test, /tests\/\*\.test\.mjs/);
});

test("npm test includes strict typechecking", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.match(packageJson.scripts.typecheck, /^tsc --noEmit$/);
  assert.match(packageJson.scripts.test, /npm run typecheck/);
});

test("npm run dev exposes the development server on the local network", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.match(packageJson.scripts.dev, /vinext dev --hostname 0\.0\.0\.0/);
});
