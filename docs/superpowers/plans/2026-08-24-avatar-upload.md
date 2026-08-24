# Avatar Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated, cross-device avatar upload with manual crop/zoom, replacement, deletion, and letter-avatar fallback.

**Architecture:** Store versioned 512×512 WebP objects in a private `AVATARS` R2 bucket and store only the active random version in `users.avatar_version`. Serve and mutate avatars through one session-authenticated route. Keep image validation and key generation in `lib/avatar.js`, isolate crop behavior in `app/avatar-editor.tsx`, and make `app/page.tsx` only coordinate account state and deletion.

**Tech Stack:** Next.js 16, React 19, TypeScript, Canvas, Pointer Events, Cloudflare Worker/R2, D1/Drizzle, Node.js built-in test runner.

---

## File map

- Create `lib/avatar.js`: upload limits, source-file checks, bounded body reading, WebP signature validation, version URL, email hash, and R2 key generation.
- Create `app/api/auth/avatar/route.ts`: authenticated GET/PUT/DELETE against R2 and D1.
- Create `app/avatar-editor.tsx`: avatar button, hidden file input, native crop dialog, drag/keyboard/zoom logic, WebP encoding, upload, and focus restoration.
- Modify `cloudflare-workers.d.ts`: type the logical `AVATARS` binding used by application code.
- Modify `.openai/hosting.json`: declare the logical R2 binding.
- Modify `db/schema.ts`: add nullable `users.avatarVersion`.
- Generate `drizzle/0003_avatar_version.sql`, `drizzle/meta/0003_snapshot.json`, and update `drizzle/meta/_journal.json`.
- Modify `app/auth.ts`: carry avatar version and derived URL in `SessionUser`.
- Modify `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, and `app/api/auth/me/route.ts`: return `avatarUrl` consistently.
- Modify `app/page.tsx`: accept avatar state, render `AvatarEditor`, delete with confirmation, and update account state only after successful responses.
- Modify `app/globals.css`: account-avatar edit marker, crop dialog, desktop/mobile layout, and error/loading states using existing theme tokens.
- Create `tests/avatar.test.mjs`: pure avatar validation and key-generation tests.
- Modify `tests/auth.test.mjs`: schema, migration, binding, route, and response-contract tests.
- Modify `tests/auth-client-flow.test.mjs`: avatar entry, crop dialog, upload, delete, and fallback source contracts.

## Task 1: Specify avatar storage and validation contracts

**Files:**
- Create: `tests/avatar.test.mjs`
- Modify: `tests/auth.test.mjs`

- [ ] **Step 1: Write failing pure-helper tests**

Create `tests/avatar.test.mjs` with concrete WebP bytes and streamed bodies:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  AVATAR_OUTPUT_MAX_BYTES,
  avatarObjectKey,
  avatarUrl,
  readAvatarUpload,
  validateAvatarSource,
} from "../lib/avatar.js";

const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
]);

test("accepts supported source images within 10 MiB", () => {
  assert.doesNotThrow(() => validateAvatarSource("image/jpeg", 10 * 1024 * 1024));
  assert.doesNotThrow(() => validateAvatarSource("image/png", 1));
  assert.doesNotThrow(() => validateAvatarSource("image/webp", 1));
  assert.throws(() => validateAvatarSource("image/gif", 1), /JPG、PNG 或 WebP/);
  assert.throws(() => validateAvatarSource("image/png", 10 * 1024 * 1024 + 1), /10 MB/);
});

test("reads only a bounded WebP upload", async () => {
  const request = new Request("https://example.test/api/auth/avatar", {
    method: "PUT",
    headers: { "content-type": "image/webp" },
    body: webp,
  });
  assert.deepEqual(await readAvatarUpload(request), webp);

  const wrongType = new Request("https://example.test", {
    method: "PUT",
    headers: { "content-type": "image/png" },
    body: webp,
  });
  await assert.rejects(() => readAvatarUpload(wrongType), /WebP/);

  const oversized = new Request("https://example.test", {
    method: "PUT",
    headers: { "content-type": "image/webp" },
    body: new Uint8Array(AVATAR_OUTPUT_MAX_BYTES + 1),
  });
  await assert.rejects(() => readAvatarUpload(oversized), /1 MB/);
});

test("builds versioned keys without exposing email", async () => {
  const first = await avatarObjectKey("User@Example.com", "version-one");
  const second = await avatarObjectKey("user@example.com", "version-two");
  assert.match(first, /^avatars\/[0-9a-f]{64}\/version-one\.webp$/);
  assert.equal(first.split("/")[1], second.split("/")[1]);
  assert.doesNotMatch(first, /user|example/i);
  assert.equal(avatarUrl("abc"), "/api/auth/avatar?v=abc");
  assert.equal(avatarUrl(null), null);
});
```

- [ ] **Step 2: Add failing platform-contract tests**

Extend `tests/auth.test.mjs` to require `avatarVersion`, the generated migration, `AVATARS`, the new route, and `avatarUrl` in every current-user response:

```js
test("declares authenticated avatar storage and profile responses", async () => {
  const [schema, hosting, workerTypes, appAuth, login, register, me, avatarRoute] =
    await Promise.all([
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
      readFile(new URL("../cloudflare-workers.d.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/auth.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/auth/register/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/auth/me/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/auth/avatar/route.ts", import.meta.url), "utf8"),
    ]);
  assert.match(schema, /avatarVersion: text\("avatar_version"\)/);
  assert.equal(JSON.parse(hosting).r2, "AVATARS");
  assert.match(workerTypes, /AVATARS\?/);
  assert.match(appAuth, /avatarUrl/);
  assert.match(login + register + me, /avatarUrl/);
  assert.match(avatarRoute, /getSessionUser\(\)/);
  assert.doesNotMatch(avatarRoute, /payload\.email|searchParams\.get\("email"\)/);
});
```

- [ ] **Step 3: Run the tests and verify red**

Run:

```bash
node --test tests/avatar.test.mjs tests/auth.test.mjs
```

Expected: FAIL because `lib/avatar.js`, the avatar route, schema column, R2 binding, and response fields do not exist.

- [ ] **Step 4: Commit the failing specifications**

```bash
git add tests/avatar.test.mjs tests/auth.test.mjs
git commit -m "test: specify account avatar storage"
```

## Task 2: Implement storage helpers, bindings, and schema

**Files:**
- Create: `lib/avatar.js`
- Modify: `.openai/hosting.json`
- Modify: `cloudflare-workers.d.ts`
- Modify: `db/schema.ts`
- Create: `drizzle/0003_avatar_version.sql`
- Create: `drizzle/meta/0003_snapshot.json`
- Modify: `drizzle/meta/_journal.json`

- [ ] **Step 1: Implement the focused avatar helper**

Create `lib/avatar.js` with no framework dependency:

```js
export const AVATAR_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_OUTPUT_MAX_BYTES = 1024 * 1024;
const SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateAvatarSource(type, size) {
  if (!SOURCE_TYPES.has(type)) throw new TypeError("请选择 JPG、PNG 或 WebP 图片。");
  if (!Number.isSafeInteger(size) || size <= 0 || size > AVATAR_SOURCE_MAX_BYTES) {
    throw new RangeError("原图不能超过 10 MB。");
  }
}

export async function readAvatarUpload(request) {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "image/webp") {
    throw new TypeError("头像必须是 WebP 图片。");
  }
  if (!request.body) throw new TypeError("头像内容不能为空。");

  const chunks = [];
  let length = 0;
  const reader = request.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > AVATAR_OUTPUT_MAX_BYTES) {
      await reader.cancel();
      throw new RangeError("头像不能超过 1 MB。");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const riff = String.fromCharCode(...bytes.subarray(0, 4));
  const webp = String.fromCharCode(...bytes.subarray(8, 12));
  if (bytes.length < 12 || riff !== "RIFF" || webp !== "WEBP") {
    throw new TypeError("头像不是有效的 WebP 图片。");
  }
  return bytes;
}

export function avatarUrl(version) {
  return version ? `/api/auth/avatar?v=${encodeURIComponent(version)}` : null;
}

export async function avatarObjectKey(email, version) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(email.trim().toLowerCase()),
  );
  const accountHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `avatars/${accountHash}/${version}.webp`;
}
```

- [ ] **Step 2: Add the logical R2 binding and types**

Set `.openai/hosting.json` to retain `project_id` and `d1`, plus:

```json
"r2": "AVATARS"
```

Extend `cloudflare-workers.d.ts` inside the existing module declaration:

```ts
type AvatarObject = {
  body: ReadableStream<Uint8Array>;
  httpEtag?: string;
};
type AvatarBucket = {
  get(key: string): Promise<AvatarObject | null>;
  put(
    key: string,
    value: Uint8Array,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

export const env: { DB?: AnyD1Database; AVATARS?: AvatarBucket };
```

- [ ] **Step 3: Add the nullable avatar version and generate migration**

Modify the `users` definition in `db/schema.ts`:

```ts
avatarVersion: text("avatar_version"),
```

Run:

```bash
npm run db:generate -- --name avatar_version
```

Expected: Drizzle creates `drizzle/0003_avatar_version.sql`, a matching snapshot, and a journal entry. Inspect the SQL and require exactly the nullable column addition:

```sql
ALTER TABLE `users` ADD `avatar_version` text;
```

- [ ] **Step 4: Run helper tests**

```bash
node --test tests/avatar.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit storage foundations**

```bash
git add .openai/hosting.json cloudflare-workers.d.ts db/schema.ts drizzle lib/avatar.js tests/avatar.test.mjs tests/auth.test.mjs
git commit -m "feat: add avatar storage foundation"
```

## Task 3: Implement authenticated avatar API and profile responses

**Files:**
- Create: `app/api/auth/avatar/route.ts`
- Modify: `app/auth.ts`
- Modify: `app/api/auth/login/route.ts`
- Modify: `app/api/auth/register/route.ts`
- Modify: `app/api/auth/me/route.ts`
- Modify: `tests/auth.test.mjs`

- [ ] **Step 1: Make `SessionUser` carry the active avatar**

Import `avatarUrl` in `app/auth.ts`, select `users.avatarVersion`, and return:

```ts
export type SessionUser = {
  email: string;
  displayName: string;
  avatarVersion: string | null;
  avatarUrl: string | null;
};

return {
  email: row.email,
  displayName: row.displayName,
  avatarVersion: row.avatarVersion,
  avatarUrl: avatarUrl(row.avatarVersion),
};
```

- [ ] **Step 2: Return `avatarUrl` from every profile response**

In login, select `avatarVersion` and return `avatarUrl(user.avatarVersion)`. Registration returns `avatarUrl: null`. `/api/auth/me` returns `user.avatarUrl`:

```ts
return Response.json({
  email: user.email,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
});
```

- [ ] **Step 3: Implement the authenticated avatar route**

Create `app/api/auth/avatar/route.ts` around these helpers and operation order:

```ts
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  avatarObjectKey,
  avatarUrl,
  readAvatarUpload,
} from "../../../../lib/avatar.js";
import { getSessionUser } from "../../../auth";

function getAvatarBucket() {
  if (!env.AVATARS) throw new Error("Cloudflare R2 binding `AVATARS` is unavailable.");
  return env.AVATARS;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!user.avatarVersion) return Response.json({ error: "Avatar not found" }, { status: 404 });
  const object = await getAvatarBucket().get(
    await avatarObjectKey(user.email, user.avatarVersion),
  );
  if (!object) return Response.json({ error: "Avatar not found" }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ...(object.httpEtag ? { ETag: object.httpEtag } : {}),
    },
  });
}
```

`PUT` must generate `crypto.randomUUID()`, put the new object, update `users.avatarVersion`, delete the new object if D1 fails, and only then best-effort delete the old version. Map `TypeError` to 400 and `RangeError` to 413. Return `{ avatarUrl: avatarUrl(newVersion) }`.

`DELETE` must clear D1 first. If that fails, return 500 without deleting R2. After D1 succeeds, best-effort delete the old version and return `{ avatarUrl: null }`.

- [ ] **Step 4: Run auth tests and verify green**

```bash
node --test tests/avatar.test.mjs tests/auth.test.mjs
npm run typecheck
```

Expected: all focused tests and strict TypeScript pass.

- [ ] **Step 5: Commit the avatar API**

```bash
git add app/auth.ts app/api/auth/avatar app/api/auth/login/route.ts app/api/auth/register/route.ts app/api/auth/me/route.ts tests/auth.test.mjs
git commit -m "feat: add authenticated avatar API"
```

## Task 4: Specify the crop and account-card behavior

**Files:**
- Modify: `tests/auth-client-flow.test.mjs`

- [ ] **Step 1: Add failing client-flow contracts**

Append tests that require a focused editor component and parent state flow:

```js
test("uploads a manually cropped account avatar", async () => {
  const [page, editor] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/avatar-editor.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /avatarUrl: string \| null/);
  assert.match(page, /<AvatarEditor/);
  assert.match(editor, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(editor, /<dialog/);
  assert.match(editor, /type="range"/);
  assert.match(editor, /pointerdown/);
  assert.match(editor, /ArrowLeft/);
  assert.match(editor, /canvas\.toBlob/);
  assert.match(editor, /fetch\("\/api\/auth\/avatar"/);
  assert.match(editor, /method: "PUT"/);
});

test("deletes an avatar only after confirmation and server success", async () => {
  const [page, editor] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/avatar-editor.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /window\.confirm\("删除头像并恢复默认头像？"\)/);
  assert.match(page, /method: "DELETE"/);
  assert.match(page, /setCurrentUser\(\{ \.\.\.currentUser, avatarUrl: null \}\)/);
  assert.match(page, /currentUser\.avatarUrl \? \(/);
  assert.match(page, />删除头像</);
  assert.match(editor, /avatarUrl && !imageFailed/);
  assert.match(editor, /displayName\.trim\(\)\.slice\(0, 1\)/);
});
```

- [ ] **Step 2: Run the client test and verify red**

```bash
node --test tests/auth-client-flow.test.mjs
```

Expected: FAIL because `AvatarEditor`, avatar-aware state, and delete flow do not exist.

- [ ] **Step 3: Commit the failing UI specifications**

```bash
git add tests/auth-client-flow.test.mjs
git commit -m "test: specify avatar crop flow"
```

## Task 5: Implement the avatar editor and account-card integration

**Files:**
- Create: `app/avatar-editor.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/auth-client-flow.test.mjs`

- [ ] **Step 1: Build the isolated editor state and file validation**

Create `app/avatar-editor.tsx` with this public interface:

```tsx
type AvatarEditorProps = {
  displayName: string;
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  onError: (message: string | null) => void;
};

export function AvatarEditor({
  displayName,
  avatarUrl,
  onAvatarChange,
  onError,
}: AvatarEditorProps) {
  // Own file input, decoded bitmap, crop position, zoom, dialog and upload state.
}
```

The avatar button renders the image only while it loads successfully; otherwise it renders `displayName.trim().slice(0, 1).toLocaleUpperCase()`. Add an edit marker and an accessible label that changes between “上传头像” and “更换头像”. Validate source type/size before setting crop state.

- [ ] **Step 2: Implement native drag, keyboard, zoom, and preview**

Decode with `createImageBitmap(file)`. Use a 360×360 crop canvas and a 112×112 preview canvas. Compute:

```ts
const minimumScale = Math.max(360 / bitmap.width, 360 / bitmap.height);
const scale = minimumScale * zoom;
const maxOffsetX = Math.max(0, (bitmap.width * scale - 360) / 2);
const maxOffsetY = Math.max(0, (bitmap.height * scale - 360) / 2);
```

Clamp drag offsets to those maxima. Pointer movement maps CSS pixels back to the canvas coordinate system. Arrow keys move 4 canvas pixels and reuse the same clamp. Redraw the crop and preview whenever bitmap, offset, or zoom changes.

- [ ] **Step 3: Encode and upload only the final crop**

Use a Promise wrapper around `canvas.toBlob`:

```ts
function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("无法生成头像。")),
      "image/webp",
      quality,
    );
  });
}
```

Encode at 0.88, retry at 0.78 if the blob exceeds `AVATAR_OUTPUT_MAX_BYTES`, and reject if it still exceeds the limit. PUT the blob with `Content-Type: image/webp`. On success require a string `avatarUrl`, call `onAvatarChange`, close, revoke object URLs, close the bitmap, and restore focus. On failure preserve crop state and call `onError("上传头像失败，请重试。")`.

- [ ] **Step 4: Integrate avatar state and deletion in `app/page.tsx`**

Extend `AuthUser` and all auth payload guards:

```ts
type AuthUser = { email: string; displayName: string; avatarUrl: string | null };
```

Render `AvatarEditor` in `.account-profile` and update only the avatar field on save. Add `deleteAvatar`:

```ts
const deleteAvatar = async () => {
  if (!currentUser?.avatarUrl || !window.confirm("删除头像并恢复默认头像？")) return;
  setAccountError(null);
  try {
    const response = await fetch("/api/auth/avatar", { method: "DELETE" });
    if (!response.ok) throw new Error("Unable to delete avatar");
    setCurrentUser({ ...currentUser, avatarUrl: null });
  } catch {
    setAccountError("删除头像失败，请重试。");
  }
};
```

Render “删除头像” only when `currentUser.avatarUrl` is non-null. Keep password change and logout behavior unchanged.

- [ ] **Step 5: Add themed responsive styles**

Use only existing design tokens. Add styles for:

- `.account-avatar-button`, `.account-avatar-image`, and `.account-avatar-edit`;
- `.avatar-crop-dialog`, `.avatar-crop-layout`, `.avatar-crop-area`, `.avatar-crop-mask`, `.avatar-preview`, `.avatar-zoom`, and `.avatar-crop-actions`;
- disabled upload controls and `.avatar-crop-error`;
- `@media (max-width: 860px)` stacking preview below the editor without horizontal overflow.

Keep the account card at its current width unless the 390px preview proves the crop entry needs a focused adjustment.

- [ ] **Step 6: Run focused UI tests and typecheck**

```bash
node --test tests/auth-client-flow.test.mjs
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit the client implementation**

```bash
git add app/avatar-editor.tsx app/page.tsx app/globals.css tests/auth-client-flow.test.mjs
git commit -m "feat: add avatar crop interface"
```

## Task 6: Full verification and authenticated behavior QA

**Files:**
- Verify all task files; modify only avatar-related files if a regression is found.

- [ ] **Step 1: Run repository verification**

```bash
git diff --check
npm run lint -- --ignore-pattern .worktrees
npm test
```

Expected: all commands exit successfully and all tests pass.

- [ ] **Step 2: Verify the generated migration and binding**

Inspect the generated SQL, snapshot, journal, `.openai/hosting.json`, `vite.config.ts`, and `dist/.openai/` build output. Confirm the logical D1 binding remains `DB`, the new logical R2 binding is `AVATARS`, and no real resource IDs or credentials are committed.

- [ ] **Step 3: Test the authenticated flow locally**

Exercise the route and helper contracts with temporary test doubles for the authenticated user, D1, and R2 plus an in-memory JPG/PNG fixture. Verify:

- authenticated upload stores one WebP no larger than 1 MiB and updates D1 only after R2 succeeds;
- authenticated GET resolves the active version and returns private immutable image headers;
- replacement changes the versioned URL;
- failed upload or D1 update preserves the prior active avatar and cleans up the new object best-effort;
- deletion clears D1 before removing the prior object;
- unauthenticated GET/PUT/DELETE return 401.

Keep these tests isolated so they create no persistent local database rows or R2 objects.

- [ ] **Step 4: Check responsive and theme source contracts**

Assert that the editor uses the existing design tokens, that the `860px` media query stacks the crop layout, and that dialog close restores focus to the avatar button. Browser screenshots, DOM clicking, resizing, and visual QA remain a separate step only if the user explicitly requests browser testing.

- [ ] **Step 5: Inspect final scope**

```bash
git status --short --branch
git diff --check origin/main...HEAD
git log --oneline --decorate -8
```

Expected: only the approved design/plan, avatar storage/API/UI code, generated migration, and focused tests are present; no deploy, push, dependency upgrade, unrelated refactor, or credential file is included.
