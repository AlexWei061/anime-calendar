import { destroySession } from "../../../auth";

export async function POST() {
  const expiredCookie = await destroySession();
  return Response.json({ ok: true }, { headers: { "Set-Cookie": expiredCookie } });
}
