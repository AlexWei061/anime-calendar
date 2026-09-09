import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { restoreEpisodeViews } from "../app/hooks/library-state.js";
import { episodeViewKey, updateEpisodeViews } from "../lib/anime-episode-views.js";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

function findElement(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (predicate(node)) return node;
  return [node.props?.children].flat().map((child) => findElement(child, predicate)).find(Boolean);
}

async function accountDialogHarness(authenticate = async () => {}) {
  const [{ default: ts }, { runInNewContext }] = await Promise.all([import("typescript"), import("node:vm")]);
  const source = await readSource("../app/components/account.tsx");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const slots = [];
  let cursor = 0;
  let tree;
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useEffect: () => {},
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  runInNewContext(compiled, {
    exports, Error,
    FormData: class { constructor(form) { return new Map(Object.entries(form)); } },
    require: (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "../avatar-editor") return {};
      if (name === "../hooks/use-viewer") return { useViewer: () => ({ authenticate, isChangingSession: false }) };
      throw new Error(`Unexpected account dependency: ${name}`);
    },
  });
  const dialog = {
    open: false,
    getBoundingClientRect: () => ({ left: 100, right: 500, top: 100, bottom: 500 }),
    close: () => {
      dialog.open = false;
      findElement(tree, (node) => node.type === "dialog").props.onClose();
    },
  };
  const render = () => {
    cursor = 0;
    tree = exports.AccountProvider({ children: null });
    const element = findElement(tree, (node) => node.type === "dialog");
    if (element) element.props.ref.current = dialog;
    return tree;
  };
  render().props.value.openAuthDialog("login", { isConnected: false });
  render();
  dialog.open = true;
  return { dialog, render };
}

test("keeps keyboard login inside the dialog, shows a failed password, and allows a successful retry", async () => {
  let attempts = 0;
  const host = await accountDialogHarness(async () => {
    if (++attempts === 1) throw new Error("邮箱或密码不正确");
  });
  let tree = host.render();
  const button = findElement(tree, (node) => node.props?.className === "auth-submit");
  // Enter implicitly clicks the submit button with zero coordinates before submitting.
  findElement(tree, (node) => node.type === "dialog").props.onClick({
    target: button, currentTarget: host.dialog, clientX: 0, clientY: 0, detail: 0,
  });
  assert.equal(host.dialog.open, true, "keyboard activation must not dismiss the dialog as a backdrop click");
  const submit = async () => {
    findElement(host.render(), (node) => node.type === "form").props.onSubmit({
      preventDefault() {}, currentTarget: { email: "test@example.com", password: "test-password" },
    });
    await new Promise((resolve) => setImmediate(resolve));
    return host.render();
  };
  tree = await submit();
  assert.equal(host.dialog.open, true);
  assert.equal(findElement(tree, (node) => node.props?.role === "alert").props.children, "邮箱或密码不正确");
  assert.equal(findElement(tree, (node) => node.props?.className === "auth-submit").props.disabled, false);
  tree = await submit();
  assert.equal(attempts, 2);
  assert.equal(host.dialog.open, false);
  assert.equal(findElement(tree, (node) => node.type === "dialog"), undefined);
});

test("keeps account dialog padding clicks open and still closes on a real backdrop click", async () => {
  const host = await accountDialogHarness();
  const onClick = findElement(host.render(), (node) => node.type === "dialog").props.onClick;
  onClick({ target: host.dialog, currentTarget: host.dialog, clientX: 110, clientY: 110, detail: 1 });
  assert.equal(host.dialog.open, true);
  onClick({ target: host.dialog, currentTarget: host.dialog, clientX: 10, clientY: 10, detail: 1 });
  assert.equal(host.dialog.open, false);
});

test("loads personal records for every signed-in page and ignores replaced sessions", async () => {
  const viewer = await readSource("../app/hooks/use-viewer.tsx");
  assert.doesNotMatch(viewer, /activePage/);
  assert.match(viewer, /if \(!userEmail\) return;/);
  assert.match(viewer, /fetch\("\/api\/anime-selections", \{ signal: controller\.signal \}\)/);
  assert.match(viewer, /fetch\("\/api\/anime-episode-views", \{ signal: controller\.signal \}\)/);
  assert.match(viewer, /!controller\.signal\.aborted && sessionVersionRef\.current === version/);
  assert.match(viewer, /return \(\) => controller\.abort\(\);/);
  assert.match(viewer, /sessionVersionRef\.current \+= 1;/);
});

test("keeps local account state when logout revocation fails", async () => {
  const [viewer, account] = await Promise.all([
    readSource("../app/hooks/use-viewer.tsx"),
    readSource("../app/components/account.tsx"),
  ]);
  assert.match(viewer, /if \(!response\.ok\) throw new Error/);
  assert.match(viewer, /await accountRequest\("logout", "POST"\);\s*if \(sessionVersionRef\.current === version\) replaceSession\(null\);/);
  assert.match(account, /setAccountError\("退出失败，请重试。"\)/);
  assert.match(account, /disabled=\{isChangingSession\}\s*onClick=\{\(\) => void signOut\(\)\}/);
});

test("uses a dummy PBKDF2 hash for unknown-email login attempts", async () => {
  const login = await readSource("../app/api/auth/login/route.ts");
  assert.match(login, /const DUMMY_PASSWORD_HASH = "pbkdf2\$100000\$0{32}\$0{64}";/);
  assert.match(login, /const passwordMatches = await verifyPassword\(password, user\?\.passwordHash \?\? DUMMY_PASSWORD_HASH\);/);
  assert.match(login, /if \(!user \|\| !passwordMatches\) \{/);
});

test("offers password change and clears personal state only after server success", async () => {
  const [viewer, account, types] = await Promise.all([
    readSource("../app/hooks/use-viewer.tsx"),
    readSource("../app/components/account.tsx"),
    readSource("../app/types.ts"),
  ]);
  assert.match(types, /type AuthDialogMode = "login" \| "register" \| "change-password";/);
  assert.match(account, /openAuthDialog\("change-password"/);
  assert.match(account, /if \(newPassword !== confirmPassword\)/);
  assert.match(viewer, /await accountRequest\("change-password", "POST", \{ currentPassword, newPassword \}\);\s*if \(sessionVersionRef\.current === version\) replaceSession\(null\);/);
  assert.match(viewer, /setSelectedAnimeIds\(null\);/);
  assert.match(viewer, /watchedEpisodesRef\.current = null;\s*setWatchedEpisodes\(null\);/);
  assert.match(account, /密码已修改，请使用新密码重新登录。/);
  assert.match(account, /disabled=\{isChangingSession\} onClick=\{openPasswordChangeFromAccount\}/);
  assert.match(account, /className="auth-submit" type="submit" disabled=\{isSubmittingAuth \|\| isChangingSession\}/);
  for (const name of ["currentPassword", "newPassword", "confirmPassword"]) {
    assert.match(account, new RegExp(`name="${name}"`));
  }
});

test("keeps signed-in account actions in a toggleable profile card", async () => {
  const [account, editor] = await Promise.all([
    readSource("../app/components/account.tsx"),
    readSource("../app/avatar-editor.tsx"),
  ]);
  assert.match(account, /className="account-trigger"/);
  assert.match(account, /aria-expanded=\{isAccountCardOpen\}/);
  assert.match(account, /aria-controls="account-card"/);
  assert.match(account, /id="account-card"/);
  assert.match(editor, /className="account-avatar"/);
  assert.match(account, /className="account-email"[^>]*>\s*\{currentUser\.email\}/);
  assert.match(account, /className="account-action-icon" aria-hidden="true">✎<\/span>\s*修改密码/);
  assert.match(account, /className="account-action-icon" aria-hidden="true">↪<\/span>\s*退出登录/);
  assert.match(account, /<AccountMenu key=\{currentUser\?\.email \?\? "signed-out"\}/);
});

test("closes the profile card with escape or an outside click without dismissing avatar cropping", async () => {
  const account = await readSource("../app/components/account.tsx");
  assert.match(account, /if \(event\.key === "Escape"\) \{\s*if \(document\.querySelector<HTMLDialogElement>\("\.avatar-crop-dialog"\)\?\.open\) return;\s*setIsAccountCardOpen\(false\);/);
  assert.match(account, /!accountAreaRef\.current\?\.contains\(event\.target as Node\)/);
  assert.match(account, /document\.addEventListener\("pointerdown", handlePointerDown\);/);
  assert.match(account, /document\.addEventListener\("keydown", handleKeyDown\);/);
});

test("uploads a manually cropped account avatar and keeps errors in the editor", async () => {
  const [account, editor] = await Promise.all([
    readSource("../app/components/account.tsx"),
    readSource("../app/avatar-editor.tsx"),
  ]);
  assert.match(account, /<AvatarEditor/);
  assert.match(editor, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(editor, /<dialog/);
  assert.match(editor, /type="range"/);
  assert.match(editor, /onPointerDown/);
  assert.match(editor, /ArrowLeft/);
  assert.match(editor, /canvas\.toBlob/);
  assert.match(editor, /fetch\("\/api\/auth\/avatar"/);
  assert.match(editor, /method: "PUT"/);
  assert.match(editor, /setDialogError\(message\)/);
});

test("deletes an avatar only after confirmation and server success", async () => {
  const [viewer, account, editor] = await Promise.all([
    readSource("../app/hooks/use-viewer.tsx"),
    readSource("../app/components/account.tsx"),
    readSource("../app/avatar-editor.tsx"),
  ]);
  assert.match(account, /window\.confirm\("删除头像并恢复默认头像？"\)/);
  assert.match(viewer, /await accountRequest\("avatar", "DELETE"\);\s*if \(sessionVersionRef\.current === version\) updateAvatar\(null\);/);
  assert.match(account, /currentUser\.avatarUrl \? \(/);
  assert.match(account, />删除头像</);
  assert.match(editor, /avatarUrl && !imageFailed/);
  assert.match(editor, /displayName\.trim\(\)\.slice\(0, 1\)/);
});

test("restores a partially watched batch after failure while preserving another successful update", () => {
  const episode = (animeId, number) => ({ animeId, episodeStart: number, episode: number });
  const first = episode("premiere", 1);
  const second = episode("premiere", 2);
  const unrelated = episode("other", 3);
  const previous = [first];
  const optimistic = updateEpisodeViews(previous, { animeId: "premiere", episodeStart: 1, episode: 2 }, true);
  const withConcurrentSuccess = updateEpisodeViews(optimistic, unrelated, true);
  const restored = restoreEpisodeViews(withConcurrentSuccess, previous, [first, second]);
  assert.deepEqual(restored.map(episodeViewKey).sort(), [first, unrelated].map(episodeViewKey).sort());

  const previouslyComplete = [first, second];
  const optimisticUnwatch = updateEpisodeViews(previouslyComplete, { animeId: "premiere", episodeStart: 1, episode: 2 }, false);
  assert.deepEqual(
    restoreEpisodeViews(optimisticUnwatch, previouslyComplete, [first, second]).map(episodeViewKey).sort(),
    previouslyComplete.map(episodeViewKey).sort(),
  );
});

// Exercise the real request functions with controlled response order. The small hook
// host keeps state and refs across renders; effects are unrelated to these mutations.
async function viewerRequestHarness() {
  const [{ default: ts }, { runInNewContext }, episodeViews, libraryState] = await Promise.all([
    import("typescript"), import("node:vm"), import("../lib/anime-episode-views.js"),
    import("../app/hooks/library-state.js"),
  ]);
  const source = (await readSource("../app/hooks/use-viewer.tsx"))
    .replace("function useViewerState()", "export function useViewerState()");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const slots = [];
  const pending = [];
  let cursor = 0;
  let cookie = "";
  const react = {
    createContext: () => null,
    useEffect: () => {},
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    Set, Error, AbortController,
    require: (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return {};
      if (name.endsWith("anime-episode-views.js")) return episodeViews;
      if (name.endsWith("library-state.js")) return libraryState;
      throw new Error(`Unexpected viewer dependency: ${name}`);
    },
    fetch: (url) => new Promise((resolve, reject) => {
      pending.push({
        url,
        resolve: (payload, nextCookie, status = 200) => {
          // Browsers apply Set-Cookie even if React later ignores the response.
          if (nextCookie !== undefined) cookie = nextCookie;
          resolve(new Response(JSON.stringify(payload), { status }));
        },
        reject,
      });
    }),
  });
  return {
    pending,
    cookie: () => cookie,
    render: () => { cursor = 0; return exports.useViewerState(); },
  };
}

test("prevents overlapping login, register, logout, and password requests from changing a newer Cookie", async (t) => {
  const host = await viewerRequestHarness();
  t.after(() => host.pending.forEach((request) => request.resolve({ email: "cleanup@example.com", displayName: "cleanup", avatarUrl: null })));
  const alice = { email: "alice@example.com", displayName: "Alice", avatarUrl: null };
  const bob = { email: "bob@example.com", displayName: "Bob", avatarUrl: null };
  let viewer = host.render();
  const initialLogin = viewer.authenticate("login", { email: alice.email, password: "alice-password" });
  host.pending.at(-1).resolve(alice, "alice-cookie");
  await initialLogin;
  viewer = host.render();

  const logout = viewer.signOut();
  const firstLogout = host.pending.at(-1);
  const duplicateLogout = viewer.signOut().catch((error) => error);
  const loginDuringLogout = viewer.authenticate("login", { email: bob.email, password: "bob-password" }).catch((error) => error);
  const registerDuringLogout = viewer.authenticate("register", { email: bob.email, password: "bob-password" }).catch((error) => error);
  const passwordDuringLogout = viewer.changePassword("alice-password", "new-password").catch((error) => error);
  assert.equal(host.pending.filter(({ url }) => url.endsWith("/logout")).length, 1, "a duplicate logout must never reach fetch");
  assert.equal(host.pending.length, 2, "every Cookie-changing entry point must share the same synchronous lock");
  assert.equal(host.render().isChangingSession, true);
  for (const result of await Promise.all([duplicateLogout, loginDuringLogout, registerDuringLogout, passwordDuringLogout])) {
    assert.match(result.message, /正在进行/);
  }

  firstLogout.resolve({}, "");
  await logout;
  viewer = host.render();
  assert.equal(viewer.currentUser, null);
  assert.equal(viewer.isChangingSession, false);
  const loginBob = viewer.authenticate("login", { email: bob.email, password: "bob-password" });
  host.pending.at(-1).resolve(bob, "bob-cookie");
  await loginBob;
  assert.equal(host.render().currentUser.email, bob.email);
  assert.equal(host.cookie(), "bob-cookie");
});

test("releases the shared account lock after failure without discarding the signed-in account", async () => {
  const host = await viewerRequestHarness();
  const user = { email: "alice@example.com", displayName: "Alice", avatarUrl: null };
  let viewer = host.render();
  const login = viewer.authenticate("login", { email: user.email, password: "password" });
  host.pending.at(-1).resolve(user, "alice-cookie");
  await login;
  viewer = host.render();
  const logout = viewer.signOut();
  host.pending.at(-1).reject(new Error("Connection failed"));
  await assert.rejects(logout, /Connection failed/);
  viewer = host.render();
  assert.equal(viewer.currentUser.email, user.email);
  assert.equal(viewer.isChangingSession, false);

  const passwordChange = viewer.changePassword("password", "new-password");
  assert.equal(host.render().isChangingSession, true);
  host.pending.at(-1).resolve({}, "");
  await passwordChange;
  viewer = host.render();
  assert.equal(viewer.currentUser, null);
  assert.equal(viewer.isChangingSession, false);
});
