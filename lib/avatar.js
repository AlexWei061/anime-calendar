export const AVATAR_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_OUTPUT_MAX_BYTES = 1024 * 1024;

const SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateAvatarSource(type, size) {
  if (!SOURCE_TYPES.has(type)) {
    throw new TypeError("请选择 JPG、PNG 或 WebP 图片。");
  }
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
