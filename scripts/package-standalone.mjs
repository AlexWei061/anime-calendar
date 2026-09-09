import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

// Next traces runtime imports; static assets, SQL migrations and maintenance
// commands are explicit deployment inputs, so include them in the same artifact.
const output = ".next/standalone";
for (const source of ["public", ".next/static", "drizzle", "db/sqlite.js", "lib/avatar.js"] ) {
  const target = join(output, source);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}
for (const file of ["storage.mjs", "backup.mjs", "restore.mjs", "import-d1.mjs", "migrate-db.mjs"]) {
  await mkdir(join(output, "scripts"), { recursive: true });
  await cp(join("scripts", file), join(output, "scripts", file));
}
