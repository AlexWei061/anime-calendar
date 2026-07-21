import { destroySession } from "../../../auth";

export async function POST(request: Request) {
  const expiredCookie = await destroySession(request.url);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": expiredCookie } });
}
