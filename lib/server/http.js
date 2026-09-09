import { createHash } from "node:crypto";
import { isIP } from "node:net";

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function appOrigin(requestUrl) {
  const configured = process.env.APP_ORIGIN;
  if (!configured && process.env.NODE_ENV === "production") throw new Error("APP_ORIGIN is required in production");
  const url = new URL(configured || requestUrl);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("APP_ORIGIN must be an HTTP(S) origin without a path");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !(loopback && process.env.ALLOW_INSECURE_LOCALHOST === "1")) {
    throw new Error("APP_ORIGIN must use HTTPS in production");
  }
  return url.origin;
}

export function requireSameOrigin(request) {
  const origin = request.headers.get("origin");
  const expected = appOrigin(new URL(request.url).origin);
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin ? origin !== expected : process.env.NODE_ENV === "production")) {
    throw new RequestError("Request origin is not allowed", 403);
  }
}

export async function readJson(request, maxBytes = 128 * 1024) {
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new RequestError("Content-Type must be application/json", 415);
  }
  if (Number(request.headers.get("content-length")) > maxBytes) throw new RequestError("Request body is too large", 413);
  if (!request.body) throw new RequestError("Invalid JSON body");
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new RequestError("Request body is too large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const payload = JSON.parse(Buffer.concat(chunks, length).toString("utf8"));
    if (!payload || Array.isArray(payload) || typeof payload !== "object") throw new Error("Not an object");
    return payload;
  } catch {
    throw new RequestError("Invalid JSON body");
  }
}

export function privateJson(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Cookie");
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(body, { ...init, headers });
}

export function logOperationError(operation, error) {
  const code = typeof error?.code === "string" && /^[A-Z0-9_]{1,60}$/.test(error.code) ? error.code : "FAILED";
  console.error(`[${operation}] ${code}`);
}

export function errorResponse(error, message) {
  if (error instanceof RequestError) return privateJson({ error: error.message }, { status: error.status });
  logOperationError(message, error);
  return privateJson({ error: message }, { status: 500 });
}

export function invalidRequest(error, fallback = "Invalid request") {
  if (error instanceof RequestError) return errorResponse(error, fallback);
  const message = error instanceof TypeError || error instanceof RangeError ? error.message : fallback;
  return privateJson({ error: message }, { status: 400 });
}

const rateLimits = globalThis[Symbol.for("anime-calendar.auth-rate-limits")] ??= new Map();

export function limitAuth(request, account) {
  const now = Date.now();
  for (const [key, bucket] of rateLimits) if (bucket.expiresAt <= now) rateLimits.delete(key);
  // ponytail: one process; move these counters to shared storage before adding replicas.
  const forwardedIp = request.headers.get("x-real-ip");
  const client = process.env.TRUST_PROXY === "1" && forwardedIp && isIP(forwardedIp) ? forwardedIp : "local";
  const entries = account
    ? [[`account:${createHash("sha256").update(account).digest("hex")}`, 10, 15 * 60_000]]
    : [["global", 1000, 60_000], [`client:${client}`, 30, 15 * 60_000]];
  for (const [key, limit, windowMs] of entries) {
    let bucket = rateLimits.get(key);
    if (!bucket) {
      if (rateLimits.size >= 10_000) return privateJson({ error: "Too many attempts. Try again later." }, { status: 429, headers: { "Retry-After": "60" } });
      bucket = { count: 0, expiresAt: now + windowMs };
      rateLimits.set(key, bucket);
    }
    if (bucket.count >= limit) return privateJson({ error: "Too many attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000))) } });
    bucket.count += 1;
  }
  return null;
}
