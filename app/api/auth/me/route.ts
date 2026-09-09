import { errorResponse, privateJson } from "../../../../lib/server/http.js";
import { getSessionUser } from "../../../auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    return privateJson({ email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl });
  } catch (error) {
    return errorResponse(error, "Unable to load profile");
  }
}
