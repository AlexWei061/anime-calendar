import { importD1 } from "./storage.mjs";

const [source, destination, objects] = process.argv.slice(2);
if (!source || !destination) throw new Error("Usage: npm run data:import-d1 -- <export.sql> <new-data-directory> [r2-objects-directory]");
console.log(await importD1(source, destination, objects));
