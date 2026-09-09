import { restoreBackup } from "./storage.mjs";

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error("Usage: npm run data:restore -- <backup-directory> <new-data-directory>");
console.log(await restoreBackup(source, destination));
