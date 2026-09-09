import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { allAnime } from "../data/anime.js";
import { createCatalogIdentityResolver } from "../lib/catalog-identity.js";
import { generateCoverSprites } from "../scripts/generate-cover-sprites.mjs";
import { convertCoversToWebp } from "../scripts/convert-covers-to-webp.mjs";

const sourceUrl = "https://yuc.wiki/202601/";
const oldRecords = ["Alpha", "Beta"].map((title, index) => ({
  id: `yuc-202601-0${index + 1}`,
  sourceUrl,
  titleZh: title,
  titleJa: `${title} JP`,
  coverUrl: `/covers/yuc/history-2026-01-0${index + 1}.webp`,
}));
const cardFor = (record) => ({ ...record, coverUrl: `https://images.test/${record.titleZh}.jpg` });

test("preserves old IDs and cover keys after insertion, reordering and a later AniList match", () => {
  const resolve = createCatalogIdentityResolver(oldRecords);
  const newcomer = resolve({ titleZh: "New", titleJa: "New JP", coverUrl: "https://images.test/new.jpg" }, sourceUrl, "yuc-202601-01");
  assert.ok(!oldRecords.some(({ id }) => id === newcomer.id));
  const beta = resolve(cardFor(oldRecords[1]), sourceUrl, "anilist-123");
  const alpha = resolve(cardFor(oldRecords[0]), sourceUrl, "yuc-202601-03");
  assert.equal(beta.id, oldRecords[1].id);
  assert.equal(alpha.id, oldRecords[0].id);
  assert.equal(beta.coverUrl, oldRecords[1].coverUrl);
  resolve.assertComplete([sourceUrl]);

  const next = createCatalogIdentityResolver([{ ...oldRecords[1], ...beta }]);
  assert.equal(next({ ...cardFor(oldRecords[1]), titleZh: "Renamed", titleJa: "Renamed JP" }, sourceUrl, "anilist-123").id, beta.id);
});

test("uses explicit source identity first and refuses ambiguous or missing existing identities", () => {
  const records = oldRecords.map((record) => ({ ...record, titleZh: "Same", titleJa: "Same JP" }));
  assert.throws(() => createCatalogIdentityResolver(records)(cardFor(records[0]), sourceUrl, "new"), /Ambiguous/);
  const resolver = createCatalogIdentityResolver(records.map((record, index) => ({ ...record, yucSourceId: String(index) })));
  assert.equal(resolver({ ...cardFor(records[0]), yucSourceId: "1" }, sourceUrl, "new").id, records[1].id);
  assert.throws(() => resolver.assertComplete([sourceUrl]), /Missing existing.*yuc-202601-01/);
});

test("freezes all current catalog IDs and logical covers when the source is reordered", () => {
  const resolver = createCatalogIdentityResolver(allAnime);
  for (const existing of [...allAnime].reverse()) {
    const identity = resolver(cardFor(existing), existing.sourceUrl, "anilist-999999999");
    assert.equal(identity.id, existing.id);
    assert.equal(identity.coverUrl, existing.coverUrl);
  }
  resolver.assertComplete(allAnime.map(({ sourceUrl: url }) => url));
});

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "anime-covers-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "public/covers/yuc"), { recursive: true });
  await mkdir(join(root, "data"));
  return root;
}

async function addCover(root, name, color) {
  const coverUrl = `/covers/yuc/${name}.webp`;
  await sharp({ create: { width: 60, height: 75, channels: 3, background: color } })
    .webp({ lossless: true }).toFile(join(root, "public", coverUrl));
  return { coverUrl };
}

async function pixel(root, sprite) {
  const { data } = await sharp(join(root, "public", sprite.url))
    .extract({ left: sprite.x * 600 + 300, top: sprite.y * 750 + 375, width: 1, height: 1 })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return [...data];
}

test("converts newly downloaded PNGs and discovers future catalog years without changing source URLs", async (t) => {
  const root = await fixture(t);
  const source = JSON.stringify({ coverUrl: "/covers/yuc/new.png", yucCoverUrl: "https://images.test/new.png" });
  await writeFile(join(root, "data/anime.js"), source);
  await writeFile(join(root, "data/yuc-history-2027.js"), source);
  await sharp({ create: { width: 4, height: 5, channels: 3, background: "red" } })
    .png().toFile(join(root, "public/covers/yuc/new.png"));
  assert.equal(await convertCoversToWebp(root), 1);
  for (const name of ["anime.js", "yuc-history-2027.js"]) {
    assert.deepEqual(JSON.parse(await readFile(join(root, "data", name), "utf8")), {
      coverUrl: "/covers/yuc/new.webp", yucCoverUrl: "https://images.test/new.png",
    });
  }
  assert.equal((await sharp(join(root, "public/covers/yuc/new.webp")).metadata()).format, "webp");
  assert.equal(await convertCoversToWebp(root), 0);
});

test("rebuilds sprites from packed inputs, merges new covers and preserves repeated output", async (t) => {
  const root = await fixture(t);
  const red = await addCover(root, "a-red", "red");
  const blue = await addCover(root, "c-blue", "blue");
  const first = await generateCoverSprites({ projectRoot: root, anime: [red, blue], previousSprites: {} });
  assert.deepEqual((await readdir(join(root, "public/covers/yuc"))).sort(), ["sprites"]);

  const green = await addCover(root, "b-green", "lime");
  const second = await generateCoverSprites({ projectRoot: root, anime: [red, green, blue], previousSprites: first });
  for (const [record, channel] of [[red, 0], [green, 1], [blue, 2]]) {
    const rgb = await pixel(root, second[record.coverUrl]);
    assert.ok(rgb[channel] > 240 && rgb.filter((_, index) => index !== channel).every((value) => value < 15), `unexpected pixel: ${rgb}`);
  }
  const detail = await sharp(join(root, "public", second[red.coverUrl].url)).metadata();
  const thumb = await sharp(join(root, "public", second[red.coverUrl].url.replace(/\.webp$/, "-thumb.webp"))).metadata();
  assert.equal(detail.width, 2400);
  assert.equal(detail.height, 750);
  assert.equal(thumb.width, 1200);
  assert.equal(thumb.height, 375);
  const third = await generateCoverSprites({ projectRoot: root, anime: [red, green, blue], previousSprites: second });
  assert.deepEqual(third, second);
  assert.equal((await readdir(join(root, "public/covers/yuc/sprites"))).length, 2);
});

test("packs the forty-first cover into a second sheet and preserves the full ten-row grid", async (t) => {
  const root = await fixture(t);
  const first = await addCover(root, "cover-00", "red");
  const covers = [first];
  for (let index = 1; index < 41; index += 1) {
    const coverUrl = `/covers/yuc/cover-${String(index).padStart(2, "0")}.webp`;
    await copyFile(join(root, "public", first.coverUrl), join(root, "public", coverUrl));
    covers.push({ coverUrl });
  }
  const sprites = await generateCoverSprites({ projectRoot: root, anime: covers, previousSprites: {} });
  const full = sprites[covers[39].coverUrl];
  const last = sprites[covers[40].coverUrl];
  assert.deepEqual([full.x, full.y, full.columns, full.rows], [3, 9, 4, 10]);
  assert.deepEqual([last.x, last.y, last.columns, last.rows], [0, 0, 4, 1]);
  assert.notEqual(full.url, last.url);
  assert.equal((await sharp(join(root, "public", full.url)).metadata()).height, 7500);
});

test("failed generation and failed mapping publication leave the previous catalog usable", async (t) => {
  const root = await fixture(t);
  const red = await addCover(root, "a-red", "red");
  const previous = await generateCoverSprites({ projectRoot: root, anime: [red], previousSprites: {} });
  const mappingPath = join(root, "data/cover-sprites.js");
  const mapping = await readFile(mappingPath, "utf8");
  const spriteBytes = await readFile(join(root, "public", previous[red.coverUrl].url));
  const broken = { coverUrl: "/covers/yuc/z-broken.webp" };
  await writeFile(join(root, "public", broken.coverUrl), "not an image");
  await assert.rejects(generateCoverSprites({ projectRoot: root, anime: [red, broken], previousSprites: previous }));
  assert.equal(await readFile(mappingPath, "utf8"), mapping);
  assert.deepEqual(await readFile(join(root, "public", previous[red.coverUrl].url)), spriteBytes);
  assert.equal((await readdir(join(root, "public/covers/yuc/sprites"))).length, 2);

  await rm(mappingPath);
  await mkdir(mappingPath);
  const green = await addCover(root, "b-green", "lime");
  await assert.rejects(generateCoverSprites({ projectRoot: root, anime: [red, green], previousSprites: previous }));
  assert.deepEqual(await readFile(join(root, "public", previous[red.coverUrl].url)), spriteBytes);
  assert.equal((await readdir(join(root, "public/covers/yuc/sprites"))).length, 2);
});
