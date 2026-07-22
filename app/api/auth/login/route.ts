import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { validateEmail, verifyPassword } from "../../../../lib/auth.js";
import { createSession } from "../../../auth";

const DUMMY_PASSWORD_HASH = "pbkdf2$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";

export async function POST(request: Request) {
  let email: string;
  let password: string;
  try {
    const payload = (await request.json()) as { email?: unknown; password?: unknown };
    email = validateEmail(payload.email);
    if (typeof payload.password !== "string") throw new TypeError("password must be a string");
    password = payload.password;
  } catch {
    return Response.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  try {
    const rows = await (await getDb())
      .select({
        email: users.email,
        passwordHash: users.passwordHash,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.email, email));
    const user = rows[0];
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches) {
      return Response.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }

    const sessionCookie = await createSession(user.email, request.url);
    return Response.json(
      { email: user.email, displayName: user.displayName },
      { headers: { "Set-Cookie": sessionCookie } },
    );
  } catch {
    return Response.json({ error: "Unable to sign in" }, { status: 500 });
  }
}
