import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { authSessions, users } from "../../../../db/schema";
import { hashPassword, validatePassword, verifyPassword } from "../../../../lib/auth.js";
import { errorResponse, invalidRequest, limitAuth, privateJson, readJson, RequestError, requireSameOrigin } from "../../../../lib/server/http.js";
import { expiredSessionCookie, getSessionUser } from "../../../auth";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const limited = limitAuth(request);
    if (limited) return limited;
    const user = await getSessionUser();
    if (!user) return privateJson({ error: "请先登录" }, { status: 401 });
    const accountLimited = limitAuth(request, user.email);
    if (accountLimited) return accountLimited;
    let currentPassword: string;
    let newPassword: string;
    try {
      const payload = await readJson(request, 4096);
      if (typeof payload.currentPassword !== "string" || payload.currentPassword.length > 72) throw new TypeError("Invalid current password");
      currentPassword = payload.currentPassword;
      newPassword = validatePassword(payload.newPassword);
    } catch (error) {
      return invalidRequest(error, "密码格式不正确");
    }
    const db = await getDb();
    const storedPasswordHash = db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.email, user.email)).get()?.passwordHash;
    if (!storedPasswordHash || !(await verifyPassword(currentPassword, storedPasswordHash))) {
      return privateJson({ error: "当前密码不正确" }, { status: 401 });
    }
    const passwordHash = await hashPassword(newPassword);
    const cookie = expiredSessionCookie(request.url);
    db.transaction((tx) => {
      const updated = tx.update(users).set({ passwordHash }).where(and(eq(users.email, user.email), eq(users.passwordHash, storedPasswordHash))).run();
      if (!updated.changes) throw new RequestError("当前密码不正确", 401);
      tx.delete(authSessions).where(eq(authSessions.userEmail, user.email)).run();
    });
    return privateJson({ ok: true }, { headers: { "Set-Cookie": cookie } });
  } catch (error) {
    return errorResponse(error, "Unable to change password");
  }
}
