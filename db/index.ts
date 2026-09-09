import { drizzle } from "drizzle-orm/better-sqlite3";
import { openDatabase } from "./sqlite.js";
import * as schema from "./schema";

const databaseGlobal = globalThis as typeof globalThis & {
  animeCalendarDb?: ReturnType<typeof createDatabase>;
};

function createDatabase() {
  return drizzle(openDatabase(), { schema });
}

export async function getDb() {
  databaseGlobal.animeCalendarDb ??= createDatabase();
  return databaseGlobal.animeCalendarDb;
}
