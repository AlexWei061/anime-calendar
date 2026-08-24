import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import {
  avatarObjectKey,
  avatarUrl,
  readAvatarUpload,
} from "../../../../lib/avatar.js";
import { getSessionUser } from "../../../auth";

async function getAvatarBucket() {
  const { env } = await import("cloudflare:workers");
  if (!env.AVATARS) {
    throw new Error("Cloudflare R2 binding `AVATARS` is unavailable.");
  }
  return env.AVATARS;
}

async function deleteObjectBestEffort(key: string | Promise<string>) {
  try {
    await (await getAvatarBucket()).delete(await key);
  } catch {
    // The active D1 value remains authoritative; stale versions can be cleaned later.
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!user.avatarVersion) {
    return Response.json({ error: "Avatar not found" }, { status: 404 });
  }

  try {
    const object = await (await getAvatarBucket()).get(
      await avatarObjectKey(user.email, user.avatarVersion),
    );
    if (!object) return Response.json({ error: "Avatar not found" }, { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        ...(object.httpEtag ? { ETag: object.httpEtag } : {}),
      },
    });
  } catch {
    return Response.json({ error: "Unable to load avatar" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  let bytes: Uint8Array;
  try {
    bytes = await readAvatarUpload(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "头像格式不正确。";
    const status = error instanceof RangeError ? 413 : 400;
    return Response.json({ error: message }, { status });
  }

  try {
    const bucket = await getAvatarBucket();
    const version = crypto.randomUUID();
    const key = await avatarObjectKey(user.email, version);
    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType: "image/webp",
        cacheControl: "private, max-age=31536000, immutable",
      },
    });

    try {
      await (await getDb())
        .update(users)
        .set({ avatarVersion: version })
        .where(eq(users.email, user.email));
    } catch {
      await deleteObjectBestEffort(key);
      return Response.json({ error: "Unable to save avatar" }, { status: 500 });
    }

    if (user.avatarVersion) {
      await deleteObjectBestEffort(
        avatarObjectKey(user.email, user.avatarVersion),
      );
    }
    return Response.json({ avatarUrl: avatarUrl(version) });
  } catch {
    return Response.json({ error: "Unable to save avatar" }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!user.avatarVersion) return Response.json({ avatarUrl: null });

  try {
    await getAvatarBucket();
    await (await getDb())
      .update(users)
      .set({ avatarVersion: null })
      .where(eq(users.email, user.email));
  } catch {
    return Response.json({ error: "Unable to delete avatar" }, { status: 500 });
  }

  await deleteObjectBestEffort(
    avatarObjectKey(user.email, user.avatarVersion),
  );
  return Response.json({ avatarUrl: null });
}
