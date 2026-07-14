import { mkdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";

import { spring2026, winter2026 } from "../data/anilist-2026.js";

export const YUC_SEASONS = Object.freeze([
  Object.freeze({
    month: "1",
    label: "2026 年 1 月番",
    url: "https://yuc.wiki/202601/",
    catalogName: "YUC 2026年1月新番表",
    exportName: "january2026",
    expectedCardCount: 60,
    sentinelTitles: Object.freeze(["棱镜恋曲", "新 魔神坛斗士"]),
  }),
  Object.freeze({
    month: "4",
    label: "2026 年 4 月番",
    url: "https://yuc.wiki/202604/",
    catalogName: "YUC 2026年4月新番表",
    exportName: "april2026",
    expectedCardCount: 70,
    sentinelTitles: Object.freeze(["幽灵音乐会 missing Songs", "魔法姐妹露露与莉莉"]),
  }),
]);

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:#x([\da-f]+)|#(\d+)|amp|lt|gt|quot|apos);/gi, (entity, hex, decimal) => {
      if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
      if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
      return { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" }[entity.toLowerCase()];
    })
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value) {
  return decodeHtml(value).normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

export const TITLE_ALIASES = Object.freeze(
  [
    ["呪術廻戦 第3期", "呪術廻戦 死滅回游 前編"],
    ["MFゴースト Season 3", "MFゴースト 3rd Season"],
    ["炎炎ノ消防隊 参ノ章", "炎炎ノ消防隊 参ノ章 第2クール"],
    ["魔都精兵のスレイブ 第2期", "魔都精兵のスレイブ2"],
    ["青のミブロ 第二期 芹沢暗殺編", "青のミブロ 芹沢暗殺編"],
    ["どうせ、恋してしまうんだ。第2期", "どうせ、恋してしまうんだ。Season 2"],
    ["地獄先生ぬ～べ～ 第2クール", "地獄先生ぬ～べ～ (2025) 第2クール"],
    ["ハイスクール！奇面組", "ハイスクール！奇面組 (2026)"],
    ["秘密結社 鷹の爪XX", "秘密結社 鷹の爪XX（ダブルエックス）"],
    ["ヴィジランテ -僕のヒーローアカデミア ILLEGALS-", "ヴィジランテ -僕のヒーローアカデミア ILLEGALS- 第2期"],
    ["Dr.STONE SCIENCE FUTURE", "Dr.STONE SCIENCE FUTURE 3クール"],
    ["BEASTARS FINAL SEASON", "BEASTARS FINAL SEASON Part 2"],
    ["スティール・ボール・ラン ジョジョの奇妙な冒険", "ジョジョの奇妙な冒険 スティール・ボール・ラン 1st STAGE"],
    ["ドロヘドロ シーズン2", "ドロヘドロ Season 2"],
    ["杖と剣のウィストリア 第2期", "杖と剣のウィストリア Season2"],
    ["最強の王様、二度目の人生は何をする？Season2", "最強の王様、二度目の人生は 何をする? 第2期"],
    ["おでかけ子ザメ 第2期", "おでかけ子ザメ シーズン2"],
    ["悲劇の元凶となる最強外道ラスボス女王は民の為に尽くします。", "悲劇の元凶となる最強外道ラスボス女王は民の為に尽くします。Season2"],
    ["ようこそ実力至上主義の教室へ 4th Season", "ようこそ実力至上主義の教室へ 4th Season 2年生編1学期"],
  ].map(([yucTitle, aniListTitle]) => Object.freeze({ yucTitle, aniListTitle })),
);

const titleAliases = new Map(
  TITLE_ALIASES.map(({ yucTitle, aniListTitle }) => [normalizeTitle(yucTitle), normalizeTitle(aniListTitle)]),
);

export function parseCards(html, { month, expectedCardCount, sentinelTitles }) {
  const cards = new Map();
  const candidates = [...html.matchAll(/<img\b(?=[^>]*\bwidth="180px")(?=[^>]*\bdata-src="[^"]+")[^>]*>/gi)];
  const cardPattern = /<div style="float:left">([\s\S]*?)<div style="clear:both"><\/div>/g;

  for (const [, card] of html.matchAll(cardPattern)) {
    const image = card.match(/<img\b(?=[^>]*\bwidth="180px")(?=[^>]*\bdata-src="([^"]+)")[^>]*>/i);
    const titleZh = card.match(/<p class="title_cn_r\d*">([\s\S]*?)<\/p>/i);
    const titleJa = card.match(/<p class="title_jp_r\d*">([\s\S]*?)<\/p>/i);
    if (!image || !titleZh || !titleJa) continue;

    const coverUrl = image[1].trim().replace(/^http:/i, "https:");
    const normalizedTitle = normalizeTitle(titleJa[1]);
    if (!coverUrl.startsWith("https://") || !normalizedTitle || cards.has(normalizedTitle)) continue;

    cards.set(normalizedTitle, {
      titleZh: decodeHtml(titleZh[1]),
      titleJa: decodeHtml(titleJa[1]),
      coverUrl,
    });
  }

  const parsedCards = [...cards.values()];
  if (parsedCards.length !== candidates.length) {
    throw new Error(`YUC ${month} parsed ${parsedCards.length} of ${candidates.length} detailed cards`);
  }
  if (parsedCards.length !== expectedCardCount) {
    throw new Error(`YUC ${month} detailed-card count changed: expected ${expectedCardCount}, found ${parsedCards.length}`);
  }
  for (const title of sentinelTitles) {
    if (!parsedCards.some(({ titleZh }) => titleZh === title)) {
      throw new Error(`YUC ${month} is missing sentinel title: ${title}`);
    }
  }
  return parsedCards;
}

export function indexAniList(anime) {
  const index = new Map();
  for (const record of anime) {
    const normalizedTitle = normalizeTitle(record.titleZh);
    const records = index.get(normalizedTitle) ?? [];
    records.push(record);
    index.set(normalizedTitle, records);
  }
  return index;
}

const aniListIndex = indexAniList([...winter2026.anime, ...spring2026.anime]);
const EPISODE_COUNT_OVERRIDES = Object.freeze({ 189046: 11 });
const COVER_EXTENSIONS = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export function findMatch(card, aniListIndex) {
  const normalizedTitle = normalizeTitle(card.titleJa);
  const matchingTitle = titleAliases.get(normalizedTitle) ?? normalizedTitle;
  const matches = aniListIndex.get(matchingTitle) ?? [];
  if (matches.length !== 1) return null;
  return matches[0];
}

export function enrichYucRecord(card, index, sourceUrl, matched) {
  const shared = {
    titleZh: card.titleZh,
    titleJa: card.titleJa,
    coverUrl: card.coverUrl,
    coverAlt: `${card.titleZh} 封面`,
    sourceUrl,
  };

  if (!matched) {
    return {
      id: `yuc-${sourceUrl.slice(-7, -1)}-${String(index + 1).padStart(2, "0")}`,
      anilistId: null,
      episodeCount: 12,
      episodeCountStatus: "estimated",
      ...shared,
      premiereDateBeijing: null,
      scheduleWeekday: null,
      beijingTime: null,
      timeStatus: "unknown",
      station: "AniList 未匹配（试点）",
    };
  }

  const anilistId = Number(matched.id.replace("anilist-", ""));
  const episodeCount = EPISODE_COUNT_OVERRIDES[anilistId] ?? matched.episodeCount;
  return {
    id: matched.id,
    anilistId,
    episodeCount,
    episodeCountStatus: matched.episodeCountStatus,
    ...(matched.premiereEpisodeCount ? { premiereEpisodeCount: matched.premiereEpisodeCount } : {}),
    ...shared,
    premiereDateBeijing: matched.premiereDateBeijing,
    scheduleWeekday: matched.scheduleWeekday,
    beijingTime: matched.beijingTime,
    timeStatus: matched.timeStatus,
    station: matched.station,
  };
}

async function fetchHtml(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`YUC request failed: ${url}`);
  return response.text();
}

export function coverExtension(response, coverUrl) {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase();
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error(`YUC cover is not an image (${contentType}): ${coverUrl}`);
  }
  return COVER_EXTENSIONS.get(contentType) ?? (extname(new URL(coverUrl).pathname) || ".jpg");
}

async function downloadCover(coverUrl, month, index) {
  const response = await fetch(coverUrl);
  if (!response.ok) {
    throw new Error(`YUC cover request failed (${response.status} ${response.statusText}): ${coverUrl}`);
  }

  const localCoverUrl = `/covers/yuc/history-2026-${month.padStart(2, "0")}-${String(index + 1).padStart(2, "0")}${coverExtension(response, coverUrl)}`;
  await writeFile(new URL(`../public${localCoverUrl}`, import.meta.url), new Uint8Array(await response.arrayBuffer()));
  return localCoverUrl;
}

async function generateSeason(config) {
  const cards = parseCards(await fetchHtml(config.url), config);
  const anime = [];
  for (const [index, card] of cards.entries()) {
    const record = enrichYucRecord(card, index, config.url, findMatch(card, aniListIndex));
    anime.push({ ...record, coverUrl: await downloadCover(card.coverUrl, config.month, index) });
  }

  return {
    label: config.label,
    timeZoneLabel: "北京时间（UTC+8）",
    updatedAt: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("/", "-"),
    catalogCount: anime.length,
    sourceName: config.catalogName,
    sourceUrl: config.url,
    anime,
  };
}

async function main() {
  await mkdir(new URL("../public/covers/yuc/", import.meta.url), { recursive: true });
  const catalogs = await Promise.all(YUC_SEASONS.map(generateSeason));
  const output = `// Generated by scripts/generate-yuc-history-pilot.mjs. Do not edit by hand.\n\n${catalogs
    .map((catalog, index) => `export const ${YUC_SEASONS[index].exportName} = ${JSON.stringify(catalog, null, 2)};`)
    .join("\n\n")}`;

  await writeFile(new URL("../data/yuc-history-2026.js", import.meta.url), `${output}\n`);
  console.log(
    catalogs.map((catalog, index) => `${YUC_SEASONS[index].month}月 ${catalog.anime.length} 部（AniList 匹配 ${catalog.anime.filter(({ anilistId }) => anilistId !== null).length} 部）`).join("；"),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
