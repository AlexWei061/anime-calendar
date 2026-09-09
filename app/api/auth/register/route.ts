import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { authSessions, users } from "../../../../db/schema";
import { hashPassword, normalizeDisplayName, validateEmail, validatePassword } from "../../../../lib/auth.js";
import { errorResponse, invalidRequest, limitAuth, privateJson, readJson, requireSameOrigin } from "../../../../lib/server/http.js";
import { prepareSession } from "../../../auth";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const limited = limitAuth(request);
    if (limited) return limited;
    let email: string;
    let password: string;
    let displayName: string;
    try {
      const payload = await readJson(request, 4096);
      email = validateEmail(payload.email);
      password = validatePassword(payload.password);
      displayName = normalizeDisplayName(payload.displayName, email);
    } catch (error) {
      return invalidRequest(error, "Invalid registration");
    }
    const accountLimited = limitAuth(request, email);
    if (accountLimited) return accountLimited;
    const db = await getDb();
    if (db.select({ email: users.email }).from(users).where(eq(users.email, email)).get()) {
      return privateJson({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const session = await prepareSession(email, request.url);
    const created = db.transaction((tx) => {
      const inserted = tx.insert(users).values({ email, passwordHash, displayName, createdAt: Date.now() }).onConflictDoNothing().run();
      if (!inserted.changes) return false;
      tx.insert(authSessions).values(session.record).run();
      return true;
    });
    if (!created) return privateJson({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
    return privateJson({ email, displayName, avatarUrl: null }, { status: 201, headers: { "Set-Cookie": session.cookie } });
  } catch (error) {
    return errorResponse(error, "Unable to register");
  }
}
