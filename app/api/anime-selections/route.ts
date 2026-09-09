import { eq } from "drizzle-orm";
import { allAnime } from "../../../data/anime.js";
import { getDb } from "../../../db";
import { animeSelections } from "../../../db/schema";
import { filterKnownAnimeIds, selectionInsertBatches } from "../../../lib/anime-selections.js";
import { errorResponse, invalidRequest, privateJson, readJson, requireSameOrigin } from "../../../lib/server/http.js";
import { getSessionUser } from "../../auth";

const validAnimeIds = new Set(allAnime.map(({ id }) => id));

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    const rows = (await getDb()).select({ animeId: animeSelections.animeId }).from(animeSelections)
      .where(eq(animeSelections.userEmail, user.email)).all();
    return privateJson({ animeIds: filterKnownAnimeIds(rows.map(({ animeId }) => animeId), validAnimeIds) });
  } catch (error) {
    return errorResponse(error, "Unable to load anime selections");
  }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    let animeIds: string[];
    try {
      const payload = await readJson(request);
      animeIds = filterKnownAnimeIds(payload.animeIds, validAnimeIds);
    } catch (error) {
      return invalidRequest(error, "Invalid animeIds");
    }
    const db = await getDb();
    db.transaction((tx) => {
      tx.delete(animeSelections).where(eq(animeSelections.userEmail, user.email)).run();
      for (const batch of selectionInsertBatches(animeIds)) {
        tx.insert(animeSelections).values(batch.map((animeId: string) => ({ userEmail: user.email, animeId }))).run();
      }
    });
    return privateJson({ animeIds });
  } catch (error) {
    return errorResponse(error, "Unable to save anime selections");
  }
}
