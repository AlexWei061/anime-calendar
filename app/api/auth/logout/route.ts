import { errorResponse, privateJson, requireSameOrigin } from "../../../../lib/server/http.js";
import { destroySession } from "../../../auth";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const expiredCookie = await destroySession(request.url);
    return privateJson({ ok: true }, { headers: { "Set-Cookie": expiredCookie } });
  } catch (error) {
    return errorResponse(error, "Unable to sign out");
  }
}
