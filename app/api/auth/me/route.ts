import { getSessionUser } from "../../../auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  return Response.json({ email: user.email, displayName: user.displayName });
}
