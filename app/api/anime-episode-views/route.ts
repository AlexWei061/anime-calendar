import { and, eq } from "drizzle-orm";
import { allAnime } from "../../../data/anime.js";
import { getDb } from "../../../db";
import { animeEpisodeViews } from "../../../db/schema";
import {
  episodeViewUnitsForRange,
  filterKnownEpisodeViews,
  isLegacyEpisodeViewForAnime,
  validateEpisodeView,
} from "../../../lib/anime-episode-views.js";
import { getSessionUser } from "../../auth";

const animeById = new Map(allAnime.map((anime) => [anime.id, anime]));

function episodeViewInsertBatches<T>(values: T[], size = 25) {
  const batches = [];
  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }
  return batches;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });

  try {
    const db = await getDb();
    const rows = await db
      .select({
        animeId: animeEpisodeViews.animeId,
        episodeStart: animeEpisodeViews.episodeStart,
        episode: animeEpisodeViews.episode,
      })
      .from(animeEpisodeViews)
      .where(eq(animeEpisodeViews.userEmail, user.email));
    const legacyRows = rows.filter((row) => {
      const anime = animeById.get(row.animeId);
      return anime && isLegacyEpisodeViewForAnime(row, anime);
    });
    if (legacyRows.length) {
      const [firstLegacyRow, ...remainingLegacyRows] = legacyRows;
      if (!firstLegacyRow) throw new Error("Missing legacy watched episode");
      const individualEpisodeViews = legacyRows.flatMap((row) =>
        episodeViewUnitsForRange(row).map((unit) => ({ animeId: row.animeId, ...unit })),
      );
      await db.batch([
        db.delete(animeEpisodeViews).where(
          and(
            eq(animeEpisodeViews.userEmail, user.email),
            eq(animeEpisodeViews.animeId, firstLegacyRow.animeId),
            eq(animeEpisodeViews.episodeStart, firstLegacyRow.episodeStart),
            eq(animeEpisodeViews.episode, firstLegacyRow.episode),
          ),
        ),
        ...remainingLegacyRows.map((row) =>
          db.delete(animeEpisodeViews).where(
            and(
              eq(animeEpisodeViews.userEmail, user.email),
              eq(animeEpisodeViews.animeId, row.animeId),
              eq(animeEpisodeViews.episodeStart, row.episodeStart),
              eq(animeEpisodeViews.episode, row.episode),
            ),
          ),
        ),
        ...episodeViewInsertBatches(individualEpisodeViews).map((batch) =>
          db
            .insert(animeEpisodeViews)
            .values(batch.map((watchedEpisode) => ({ userEmail: user.email, ...watchedEpisode })))
            .onConflictDoNothing(),
        ),
      ]);
    }
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
