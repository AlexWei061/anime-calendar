import { databasePath, openDatabase } from "../db/sqlite.js";

const db = openDatabase();
db.close();
console.log(`Database migrations applied: ${databasePath()}`);
