import { eq, lte } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "../db";
import { authSessions, users } from "../db/schema";
import { avatarUrl } from "../lib/avatar.js";
import { generateSessionToken, hashSessionToken, sessionCookieAttributes } from "../lib/auth.js";
import { appOrigin, RequestError } from "../lib/server/http.js";

export type SessionUser = {
  email: string;
  displayName: string;
  avatarVersion: string | null;
  avatarUrl: string | null;
};

export const SESSION_COOKIE = "ac_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = readSessionToken(await headers());
  if (!token) return null;
  const tokenHash = await hashSessionToken(token);
  const db = await getDb();
  const row = db
    .select({ email: users.email, displayName: users.displayName, avatarVersion: users.avatarVersion, expiresAt: authSessions.expiresAt })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userEmail, users.email))
    .where(eq(authSessions.tokenHash, tokenHash))
    .get();
  if (!row) return null;
  if (row.expiresAt <= Date.now()) {
    db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash)).run();
    return null;
  }
  return { email: row.email, displayName: row.displayName, avatarVersion: row.avatarVersion, avatarUrl: avatarUrl(row.avatarVersion) };
}

export async function prepareSession(userEmail: string, requestUrl: string) {
  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  return {
    record: { tokenHash, userEmail, expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 },
    cookie: `${SESSION_COOKIE}=${token}; ${sessionCookieAttributes(appOrigin(new URL(requestUrl).origin), SESSION_MAX_AGE_SECONDS)}`,
  };
}

export async function createSession(userEmail: string, requestUrl: string, expectedPasswordHash: string): Promise<string> {
  const session = await prepareSession(userEmail, requestUrl);
  const db = await getDb();
  db.transaction((tx) => {
    const user = tx.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.email, userEmail)).get();
    if (user?.passwordHash !== expectedPasswordHash) throw new RequestError("邮箱或密码不正确", 401);
    tx.delete(authSessions).where(lte(authSessions.expiresAt, Date.now())).run();
    tx.insert(authSessions).values(session.record).run();
  });
  return session.cookie;
}

export async function destroySession(requestUrl: string): Promise<string> {
  const expiredCookie = expiredSessionCookie(requestUrl);
  const token = readSessionToken(await headers());
  if (token) {
    const tokenHash = await hashSessionToken(token);
    (await getDb()).delete(authSessions).where(eq(authSessions.tokenHash, tokenHash)).run();
  }
  return expiredCookie;
}

export function expiredSessionCookie(requestUrl: string): string {
  return `${SESSION_COOKIE}=; ${sessionCookieAttributes(appOrigin(new URL(requestUrl).origin), 0)}`;
}

function readSessionToken(requestHeaders: Pick<Headers, "get">): string | null {
  const cookieHeader = requestHeaders.get("cookie");
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [name, ...rest] = pair.trim().split("=");
    if (name === SESSION_COOKIE) {
      const token = rest.join("=");
      return /^[0-9a-f]{64}$/.test(token) ? token : null;
    }
  }
  return null;
}
