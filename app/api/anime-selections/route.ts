import { eq } from "drizzle-orm";
import { allAnime } from "../../../data/anime.js";
import { getDb } from "../../../db";
import { animeSelections } from "../../../db/schema";
import { validateAnimeIds } from "../../../lib/anime-selections.js";
import { getChatGPTUser } from "../../chatgpt-auth";

const validAnimeIds = new Set(allAnime.map(({ id }) => id));

async function currentUser() {
  return getChatGPTUser();
}

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const rows = await (await getDb())
      .select({ animeId: animeSelections.animeId })
      .from(animeSelections)
      .where(eq(animeSelections.userEmail, user.email));
    return Response.json({ animeIds: rows.map(({ animeId }) => animeId) });
  } catch {
    return Response.json({ error: "Unable to load anime selections" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  let animeIds: string[];
  try {
    const payload = (await request.json()) as { animeIds?: unknown };
    animeIds = validateAnimeIds(payload.animeIds, validAnimeIds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid animeIds";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db.delete(animeSelections).where(eq(animeSelections.userEmail, user.email));
    if (animeIds.length) {
      await db.insert(animeSelections).values(
        animeIds.map((animeId) => ({ userEmail: user.email, animeId })),
      );
    }
    return Response.json({ animeIds });
  } catch {
    return Response.json({ error: "Unable to save anime selections" }, { status: 500 });
  }
}
