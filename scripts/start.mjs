import { resolve } from "node:path";

// Next's standalone entry changes cwd. Resolve storage first so rebuilding .next
// cannot erase data created through the documented npm start command.
process.env.DATA_DIR = resolve(process.env.DATA_DIR || "./storage");
await import("../.next/standalone/server.js");
