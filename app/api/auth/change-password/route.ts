import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { authSessions, users } from "../../../../db/schema";
import { hashPassword, validatePassword, verifyPassword } from "../../../../lib/auth.js";
import { expiredSessionCookie, getSessionUser } from "../../../auth";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

  let currentPassword: string;
  let newPassword: string;
  try {
    const payload = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    if (typeof payload.currentPassword !== "string") {
      throw new TypeError("currentPassword must be a string");
    }
    currentPassword = payload.currentPassword;
    newPassword = validatePassword(payload.newPassword);
  } catch (error) {
    const message = error instanceof Error ? error.message : "密码格式不正确";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const db = await getDb();
    const rows = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, user.email));
    const storedPasswordHash = rows[0]?.passwordHash;
    if (!storedPasswordHash || !(await verifyPassword(currentPassword, storedPasswordHash))) {
      return Response.json({ error: "当前密码不正确" }, { status: 401 });
    }

    const passwordHash = await hashPassword(newPassword);
    await db.batch([
      db.update(users).set({ passwordHash }).where(eq(users.email, user.email)),
      db.delete(authSessions).where(eq(authSessions.userEmail, user.email)),
    ]);
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": expiredSessionCookie(request.url) } },
    );
  } catch {
    return Response.json({ error: "Unable to change password" }, { status: 500 });
  }
}
