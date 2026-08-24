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
