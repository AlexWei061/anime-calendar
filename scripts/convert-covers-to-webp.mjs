import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const sourceExtension = /\.(?:jpe?g|png|gif)$/i;
const webpOptions = { lossless: true, effort: 4 };

export async function convertCoversToWebp(projectRoot) {
  const coverDirectory = join(projectRoot, "public", "covers", "yuc");
  const dataFiles = [
    "data/anime.js",
    ...(await readdir(join(projectRoot, "data")))
      .filter((file) => /^yuc-history-\d+\.js$/.test(file))
      .map((file) => `data/${file}`),
  ];

  const coverFiles = (await readdir(coverDirectory)).filter((file) => sourceExtension.test(file));

  for (let index = 0; index < coverFiles.length; index += 8) {
    await Promise.all(
      coverFiles.slice(index, index + 8).map(async (file) => {
        const source = join(coverDirectory, file);
        const target = join(coverDirectory, file.replace(sourceExtension, ".webp"));
        await sharp(source).webp(webpOptions).toFile(target);
      }),
    );
  }

  for (const dataFile of dataFiles) {
    const path = join(projectRoot, dataFile);
    const source = await readFile(path, "utf8");
    const updated = source.replaceAll(/("coverUrl"\s*:\s*"\/covers\/yuc\/[^"]+)\.(?:jpe?g|png|gif)"/gi, "$1.webp\"");

    if (updated !== source) {
      await writeFile(path, updated);
    }
  }

  await Promise.all(coverFiles.map((file) => rm(join(coverDirectory, file))));
  return coverFiles.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = await convertCoversToWebp(dirname(dirname(fileURLToPath(import.meta.url))));
  console.log(`Converted ${count} covers to lossless WebP.`);
}
