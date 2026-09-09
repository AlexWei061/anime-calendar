import { getDataDirectory } from "../db/sqlite.js";
import { createBackup } from "./storage.mjs";

const destination = process.argv[2];
if (!destination) throw new Error("Usage: npm run data:backup -- <new-backup-directory>");
console.log(await createBackup(getDataDirectory(), destination));
