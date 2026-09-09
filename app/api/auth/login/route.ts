import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { avatarUrl } from "../../../../lib/avatar.js";
import { validateEmail, verifyPassword } from "../../../../lib/auth.js";
import { errorResponse, limitAuth, privateJson, readJson, RequestError, requireSameOrigin } from "../../../../lib/server/http.js";
import { createSession } from "../../../auth";

const DUMMY_PASSWORD_HASH = "pbkdf2$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const limited = limitAuth(request);
    if (limited) return limited;
    let email: string;
    let password: string;
    try {
      const payload = await readJson(request, 4096);
      email = validateEmail(payload.email);
      if (typeof payload.password !== "string" || payload.password.length > 72) throw new TypeError("Invalid password");
      password = payload.password;
    } catch (error) {
      if (error instanceof RequestError) return errorResponse(error, "Unable to sign in");
      return privateJson({ error: "邮箱或密码不正确" }, { status: 401 });
    }
    const accountLimited = limitAuth(request, email);
    if (accountLimited) return accountLimited;
    const user = (await getDb())
      .select({ email: users.email, passwordHash: users.passwordHash, displayName: users.displayName, avatarVersion: users.avatarVersion })
      .from(users).where(eq(users.email, email)).get();
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches) {
      return privateJson({ error: "邮箱或密码不正确" }, { status: 401 });
    }
    const sessionCookie = await createSession(user.email, request.url, user.passwordHash);
    return privateJson(
      { email: user.email, displayName: user.displayName, avatarUrl: avatarUrl(user.avatarVersion) },
      { headers: { "Set-Cookie": sessionCookie } },
    );
  } catch (error) {
    return errorResponse(error, "Unable to sign in");
  }
}
