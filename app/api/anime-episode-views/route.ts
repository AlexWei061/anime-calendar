import { and, eq } from "drizzle-orm";
import { allAnime } from "../../../data/anime.js";
import { getDb } from "../../../db";
import { animeEpisodeViews } from "../../../db/schema";
import { episodeViewUnitsForRange, filterKnownEpisodeViews, isLegacyEpisodeViewForAnime, validateEpisodeViewBatch } from "../../../lib/anime-episode-views.js";
import { errorResponse, invalidRequest, privateJson, readJson, requireSameOrigin } from "../../../lib/server/http.js";
import { getSessionUser } from "../../auth";

type EpisodeView = { animeId: string; episodeStart: number; episode: number };
const animeById = new Map(allAnime.map((anime) => [anime.id, anime]));

function episodeViewCondition(email: string, row: EpisodeView) {
  return and(
    eq(animeEpisodeViews.userEmail, email),
    eq(animeEpisodeViews.animeId, row.animeId),
    eq(animeEpisodeViews.episodeStart, row.episodeStart),
    eq(animeEpisodeViews.episode, row.episode),
  );
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    const db = await getDb();
    const rows = db.transaction((tx) => {
      const stored = tx.select({ animeId: animeEpisodeViews.animeId, episodeStart: animeEpisodeViews.episodeStart, episode: animeEpisodeViews.episode })
        .from(animeEpisodeViews).where(eq(animeEpisodeViews.userEmail, user.email)).all();
      for (const row of stored) {
        const anime = animeById.get(row.animeId);
        if (!anime || !isLegacyEpisodeViewForAnime(row, anime)) continue;
        tx.delete(animeEpisodeViews).where(episodeViewCondition(user.email, row)).run();
        for (const unit of episodeViewUnitsForRange(row)) {
          tx.insert(animeEpisodeViews).values({ userEmail: user.email, animeId: row.animeId, ...unit }).onConflictDoNothing().run();
        }
      }
      return stored;
    });
    return privateJson({ watchedEpisodes: filterKnownEpisodeViews(rows, animeById) });
  } catch (error) {
    return errorResponse(error, "Unable to load watched episodes");
  }
}

export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getSessionUser();
    if (!user) return privateJson({ error: "Sign in required" }, { status: 401 });
    let watchedEpisodes: EpisodeView[];
    let watched: boolean;
    try {
      const payload = await readJson(request, 16 * 1024);
      watchedEpisodes = validateEpisodeViewBatch(payload.watchedEpisodes, animeById);
      if (typeof payload.watched !== "boolean") throw new TypeError("watched must be a boolean");
      watched = payload.watched;
    } catch (error) {
      return invalidRequest(error, "Invalid watched episode");
    }
    const db = await getDb();
    db.transaction((tx) => {
      if (watched) {
        tx.insert(animeEpisodeViews).values(watchedEpisodes.map((row) => ({ userEmail: user.email, ...row }))).onConflictDoNothing().run();
      } else {
        for (const row of watchedEpisodes) tx.delete(animeEpisodeViews).where(episodeViewCondition(user.email, row)).run();
      }
    });
    return privateJson({ watchedEpisodes, watched });
  } catch (error) {
    return errorResponse(error, "Unable to save watched episode");
  }
}
