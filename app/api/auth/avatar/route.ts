import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { avatarObjectKey, avatarUrl, readAvatarUpload } from "../../../../lib/avatar.js";
import { deleteAvatarBestEffort, readAvatar, replaceAvatar } from "../../../../lib/server/avatar-storage.js";
import { errorResponse, privateJson, requireSameOrigin } from "../../../../lib/server/http.js";
import { getSessionUser } from "../../../auth";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    const requestedVersion = new URL(request.url).searchParams.get("v");
    if (!user.avatarVersion || (requestedVersion !== null && requestedVersion !== user.avatarVersion)) {
      return privateJson({ error: "Avatar not found" }, { status: 404 });
    }
    const bytes = await readAvatar(await avatarObjectKey(user.email, user.avatarVersion));
    if (!bytes) return privateJson({ error: "Avatar not found" }, { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": requestedVersion ? "private, max-age=31536000, immutable" : "private, no-store",
        "Vary": "Cookie",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error, "Unable to load avatar");
  }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    let bytes: Uint8Array;
    try {
      bytes = await readAvatarUpload(request);
    } catch (error) {
      const message = error instanceof TypeError || error instanceof RangeError ? error.message : "头像格式不正确。";
      return privateJson({ error: message }, { status: error instanceof RangeError ? 413 : 400 });
    }
    const db = await getDb();
    const version = await replaceAvatar(user.email, bytes, (next: string) => db.transaction((tx) => {
      const previous = tx.select({ avatarVersion: users.avatarVersion }).from(users).where(eq(users.email, user.email)).get();
      if (!previous) throw new Error("Avatar account unavailable");
      tx.update(users).set({ avatarVersion: next }).where(eq(users.email, user.email)).run();
      return previous.avatarVersion;
    }));
    return privateJson({ avatarUrl: avatarUrl(version) });
  } catch (error) {
    return errorResponse(error, "Unable to save avatar");
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    const db = await getDb();
    const previous = db.transaction((tx) => {
      const row = tx.select({ avatarVersion: users.avatarVersion }).from(users).where(eq(users.email, user.email)).get();
      tx.update(users).set({ avatarVersion: null }).where(eq(users.email, user.email)).run();
      return row?.avatarVersion;
    });
    if (previous) await deleteAvatarBestEffort(await avatarObjectKey(user.email, previous));
    return privateJson({ avatarUrl: null });
  } catch (error) {
    return errorResponse(error, "Unable to delete avatar");
  }
}
