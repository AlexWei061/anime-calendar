import { sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { logOperationError } from "../../../lib/server/http.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    (await getDb()).get(sql`SELECT COUNT(*) FROM __app_migrations`);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logOperationError("health", error);
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
