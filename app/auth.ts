import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "../db";
import { authSessions, users } from "../db/schema";
import { generateSessionToken, hashSessionToken, sessionCookieAttributes } from "../lib/auth.js";

export type SessionUser = {
  email: string;
  displayName: string;
};

export const SESSION_COOKIE = "ac_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = readSessionToken(await headers());
  if (!token) return null;

  const tokenHash = await hashSessionToken(token);
  const db = await getDb();
  const rows = await db
    .select({
      email: users.email,
      displayName: users.displayName,
      expiresAt: authSessions.expiresAt,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userEmail, users.email))
    .where(eq(authSessions.tokenHash, tokenHash));
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt <= Date.now()) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
    return null;
  }
  return { email: row.email, displayName: row.displayName };
}

export async function createSession(userEmail: string, requestUrl: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  await (await getDb()).insert(authSessions).values({ tokenHash, userEmail, expiresAt });
  return `${SESSION_COOKIE}=${token}; ${sessionCookieAttributes(requestUrl, SESSION_MAX_AGE_SECONDS)}`;
}

export async function destroySession(requestUrl: string): Promise<string> {
  const token = readSessionToken(await headers());
  if (token) {
    const tokenHash = await hashSessionToken(token);
    await (await getDb()).delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
  }
  return `${SESSION_COOKIE}=; ${sessionCookieAttributes(requestUrl, 0)}`;
}

function readSessionToken(requestHeaders: Pick<Headers, "get">): string | null {
  const cookieHeader = requestHeaders.get("cookie");
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [name, ...rest] = pair.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}
