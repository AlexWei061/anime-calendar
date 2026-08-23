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

test("offers password change and returns to signed-out state after success", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /type AuthDialogMode = "login" \| "register" \| "change-password";/);
  assert.match(page, /openAuthDialog\("change-password"/);
  assert.match(page, /fetch\("\/api\/auth\/change-password"/);
  assert.match(page, /body: JSON\.stringify\(\{ currentPassword, newPassword \}\)/);
  assert.match(page, /if \(newPassword !== confirmPassword\)/);
  assert.match(page, /setCurrentUser\(null\);/);
  assert.match(page, /setSelectedAnimeIds\(null\);/);
  assert.match(page, /setWatchedEpisodes\(null\);/);
  assert.match(page, /密码已修改，请使用新密码重新登录。/);
  assert.match(page, /name="currentPassword"/);
  assert.match(page, /name="newPassword"/);
  assert.match(page, /name="confirmPassword"/);
});

test("moves signed-in account actions into a toggleable profile card", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /const \[isAccountCardOpen, setIsAccountCardOpen\] = useState\(false\);/);
  assert.match(page, /className="account-trigger"/);
  assert.match(page, /aria-expanded=\{isAccountCardOpen\}/);
  assert.match(page, /aria-controls="account-card"/);
  assert.match(page, /id="account-card"/);
  assert.match(page, /className="account-avatar"/);
  assert.match(page, /className="account-email"[^>]*>\s*\{currentUser\.email\}/);
  assert.match(page, /className="account-action-icon" aria-hidden="true">✎<\/span>\s*修改密码/);
  assert.match(page, /className="account-action-icon" aria-hidden="true">↪<\/span>\s*退出登录/);
  assert.doesNotMatch(page, /<span className="account-name"/);
});

test("closes the profile card with escape or an outside click", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /if \(event\.key === "Escape"\) \{\s*setIsAccountCardOpen\(false\);/);
  assert.match(page, /!accountAreaRef\.current\?\.contains\(event\.target as Node\)/);
  assert.match(page, /document\.addEventListener\("pointerdown", handlePointerDown\);/);
  assert.match(page, /document\.addEventListener\("keydown", handleKeyDown\);/);
});
