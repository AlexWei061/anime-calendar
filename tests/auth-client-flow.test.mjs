import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("loads selections for every signed-in calendar page", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(
    page,
    /\(activePage !== "mine" && activePage !== "stats" && activePage !== "search"\) \|\|\s*selectedAnimeIds !== null/,
  );
  assert.match(
    page,
    /const selectionLoadError = selectionError \?\? \(\s*!currentUser && activePage !== "all" \? "登录后可同步你的追番列表。" : null\s*\);/,
  );
});

test("keeps local account state when logout revocation fails", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(
    page,
    /const response = await fetch\("\/api\/auth\/logout", \{ method: "POST" \}\);\s*if \(!response\.ok\) throw new Error\("Unable to sign out"\);/,
  );
  assert.match(page, /setAccountError\("退出失败，请重试。"\);\s*return;/);
});

test("uses a dummy PBKDF2 hash for unknown-email login attempts", async () => {
  const login = await readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");

  assert.match(login, /const DUMMY_PASSWORD_HASH = "pbkdf2\$100000\$0{32}\$0{64}";/);
  assert.match(
    login,
    /const passwordMatches = await verifyPassword\(password, user\?\.passwordHash \?\? DUMMY_PASSWORD_HASH\);/,
  );
  assert.match(login, /if \(!user \|\| !passwordMatches\) \{/);
});
