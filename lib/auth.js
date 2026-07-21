const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const SESSION_TOKEN_BYTES = 32;

export function validateEmail(value) {
  if (typeof value !== "string") throw new TypeError("email must be a string");
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RangeError("Invalid email address");
  }
  return email;
}

export function validatePassword(value) {
  if (typeof value !== "string") throw new TypeError("password must be a string");
  if (value.length < 8) throw new RangeError("Password must be at least 8 characters");
  if (value.length > 72) throw new RangeError("Password must be at most 72 characters");
  return value;
}

export function normalizeDisplayName(value, fallbackEmail) {
  if (value === undefined || value === null || value === "") return fallbackEmail;
  if (typeof value !== "string") throw new TypeError("displayName must be a string");
  const displayName = value.trim();
  if (displayName.length === 0) return fallbackEmail;
  if (displayName.length > 40) throw new RangeError("displayName must be at most 40 characters");
  return displayName;
}

export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))) {
  const key = await derivePasswordKey(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(key)}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  const salt = fromHex(parts[2]);
  const expected = fromHex(parts[3]);
  if (!salt || !expected || expected.length !== KEY_BYTES) return false;
  const actual = await derivePasswordKey(password, salt, iterations);
  return constantTimeEqual(actual, expected);
}

export function generateSessionToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(SESSION_TOKEN_BYTES)));
}

export async function hashSessionToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

export function sessionCookieAttributes(requestUrl, maxAge) {
  const secureAttribute = new URL(requestUrl).protocol === "https:" ? " Secure;" : "";
  return `HttpOnly;${secureAttribute} SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

async function derivePasswordKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }
  return diff === 0;
}

function toHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value) {
  if (typeof value !== "string" || value.length % 2 !== 0 || !/^[0-9a-f]*$/.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
