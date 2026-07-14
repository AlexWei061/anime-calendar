import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const coverDirectory = join(projectRoot, "public", "covers", "yuc");
const dataFiles = [
  "data/anime.js",
  "data/yuc-history-2022.js",
  "data/yuc-history-2023.js",
  "data/yuc-history-2024.js",
  "data/yuc-history-2025.js",
  "data/yuc-history-2026.js",
];
const webpOptions = { quality: 75, effort: 4 };

const coverFiles = (await readdir(coverDirectory)).filter((file) => file.endsWith(".jpg"));

for (let index = 0; index < coverFiles.length; index += 8) {
  await Promise.all(
    coverFiles.slice(index, index + 8).map(async (file) => {
      const source = join(coverDirectory, file);
      const target = join(coverDirectory, file.replace(/\.jpg$/, ".webp"));
      await sharp(source).webp(webpOptions).toFile(target);
    }),
  );
}

for (const dataFile of dataFiles) {
  const path = join(projectRoot, dataFile);
  const source = await readFile(path, "utf8");
  const updated = source.replaceAll(/("coverUrl": "\/covers\/yuc\/[^"]+)\.jpg"/g, "$1.webp\"");

  if (source.includes("/covers/yuc/") && updated === source) {
    throw new Error(`No local JPEG cover paths were updated in ${dataFile}`);
  }

  await writeFile(path, updated);
}

await Promise.all(coverFiles.map((file) => rm(join(coverDirectory, file))));
console.log(`Converted ${coverFiles.length} covers to WebP at quality ${webpOptions.quality}.`);
