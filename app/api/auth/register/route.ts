import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  hashPassword,
  normalizeDisplayName,
  validateEmail,
  validatePassword,
} from "../../../../lib/auth.js";
import { createSession } from "../../../auth";

export async function POST(request: Request) {
  let email: string;
  let password: string;
  let displayName: string;
  try {
    const payload = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      displayName?: unknown;
    };
    email = validateEmail(payload.email);
    password = validatePassword(payload.password);
    displayName = normalizeDisplayName(payload.displayName, email);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid registration";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const db = await getDb();
    const existing = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.email, email));
    if (existing.length > 0) {
      return Response.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    await db.insert(users).values({ email, passwordHash, displayName, createdAt: Date.now() });
    const sessionCookie = await createSession(email, request.url);
    return Response.json(
      { email, displayName },
      { status: 201, headers: { "Set-Cookie": sessionCookie } },
    );
  } catch {
    return Response.json({ error: "Unable to register" }, { status: 500 });
  }
}
