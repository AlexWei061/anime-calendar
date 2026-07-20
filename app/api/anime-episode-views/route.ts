import { and, eq } from "drizzle-orm";
import { allAnime } from "../../../data/anime.js";
import { getDb } from "../../../db";
import { animeEpisodeViews } from "../../../db/schema";
import {
  filterKnownEpisodeViews,
  validateEpisodeView,
} from "../../../lib/anime-episode-views.js";
import { getSessionUser } from "../../auth";

const animeById = new Map(allAnime.map((anime) => [anime.id, anime]));

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  try {
    const rows = await (await getDb())
      .select({
        animeId: animeEpisodeViews.animeId,
        episodeStart: animeEpisodeViews.episodeStart,
        episode: animeEpisodeViews.episode,
      })
      .from(animeEpisodeViews)
      .where(eq(animeEpisodeViews.userEmail, user.email));
    return Response.json({ watchedEpisodes: filterKnownEpisodeViews(rows, animeById) });
  } catch {
    return Response.json({ error: "Unable to load watched episodes" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  let watchedEpisode: { animeId: string; episodeStart: number; episode: number };
  let watched: boolean;
  try {
    const payload = (await request.json()) as { watched?: unknown };
    watchedEpisode = validateEpisodeView(payload, animeById);
    if (typeof payload.watched !== "boolean") throw new TypeError("watched must be a boolean");
    watched = payload.watched;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid watched episode";
    return Response.json({ error: message }, { status: 400 });
  }

  const where = and(
    eq(animeEpisodeViews.userEmail, user.email),
    eq(animeEpisodeViews.animeId, watchedEpisode.animeId),
    eq(animeEpisodeViews.episodeStart, watchedEpisode.episodeStart),
    eq(animeEpisodeViews.episode, watchedEpisode.episode),
  );
  try {
    const db = await getDb();
    if (watched) {
      await db
        .insert(animeEpisodeViews)
        .values({ userEmail: user.email, ...watchedEpisode })
        .onConflictDoNothing();
    } else {
      await db.delete(animeEpisodeViews).where(where);
    }
    return Response.json({ watchedEpisode, watched });
  } catch {
    return Response.json({ error: "Unable to save watched episode" }, { status: 500 });
  }
}
