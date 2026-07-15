import { access, mkdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";

import { coverSpriteFor } from "../data/cover-sprites.js";

const seasonsByYear = Object.freeze({
  2020: Object.freeze([
    Object.freeze({
      month: "1",
      label: "2020 年 1 月番",
      url: "https://yuc.wiki/202001/",
      catalogName: "YUC 2020年1月新番表",
      exportName: "january2020",
      aniListExportName: "winter2020",
      expectedCardCount: 51,
      sentinelTitles: Object.freeze(["22/7", "猫狗宠物街 (拟人版)"]),
    }),
    Object.freeze({
      month: "4",
      label: "2020 年 4 月番",
      url: "https://yuc.wiki/202004/",
      catalogName: "YUC 2020年4月新番表",
      exportName: "april2020",
      aniListExportName: "spring2020",
      expectedCardCount: 51,
      sentinelTitles: Object.freeze(["天晴烂漫", "四月一日三姐妹 第2期"]),
    }),
    Object.freeze({
      month: "7",
      label: "2020 年 7 月番",
      url: "https://yuc.wiki/202007/",
      catalogName: "YUC 2020年7月新番表",
      exportName: "july2020",
      aniListExportName: "summer2020",
      expectedCardCount: 22,
      sentinelTitles: Object.freeze(["宝石幻想 光芒重现", "GETUP! GETLIVE!"]),
    }),
    Object.freeze({
      month: "10",
      label: "2020 年 10 月番",
      url: "https://yuc.wiki/202010/",
      catalogName: "YUC 2020年10月新番表",
      exportName: "october2020",
      aniListExportName: "fall2020",
      expectedCardCount: 45,
      sentinelTitles: Object.freeze(["成为神的那天/成神之日", "月歌 第2期"]),
    }),
  ]),
  2021: Object.freeze([
    Object.freeze({
      month: "1",
      label: "2021 年 1 月番",
      url: "https://yuc.wiki/202101/",
      catalogName: "YUC 2021年1月新番表",
      exportName: "january2021",
      aniListExportName: "winter2021",
      expectedCardCount: 55,
      sentinelTitles: Object.freeze(["赛马娘 第2期", "暗芝居 第8期"]),
    }),
    Object.freeze({
      month: "4",
      label: "2021 年 4 月番",
      url: "https://yuc.wiki/202104/",
      catalogName: "YUC 2021年4月新番表",
      exportName: "april2021",
      aniListExportName: "spring2021",
      expectedCardCount: 64,
      sentinelTitles: Object.freeze(["佐贺偶像是传奇 第2期", "训斥猫 / 坏嘴猫猫"]),
    }),
    Object.freeze({
      month: "7",
      label: "2021 年 7 月番",
      url: "https://yuc.wiki/202107/",
      catalogName: "YUC 2021年7月新番表",
      exportName: "july2021",
      aniListExportName: "summer2021",
      expectedCardCount: 40,
      sentinelTitles: Object.freeze(["白砂水族馆", "暗芝居 第9期"]),
    }),
    Object.freeze({
      month: "10",
      label: "2021 年 10 月番",
      url: "https://yuc.wiki/202110/",
      catalogName: "YUC 2021年10月新番表",
      exportName: "october2021",
      aniListExportName: "fall2021",
      expectedCardCount: 53,
      sentinelTitles: Object.freeze(["宿命回响 命运节拍", "群马酱"]),
    }),
  ]),
  2022: Object.freeze([
    Object.freeze({
      month: "1",
      label: "2022 年 1 月番",
      url: "https://yuc.wiki/202201/",
      catalogName: "YUC 2022年1月新番表",
      exportName: "january2022",
      aniListExportName: "winter2022",
      expectedCardCount: 42,
      sentinelTitles: Object.freeze(["东京24区", "暗芝居 第10期"]),
    }),
    Object.freeze({
      month: "4",
      label: "2022 年 4 月番",
      url: "https://yuc.wiki/202204/",
      catalogName: "YUC 2022年4月新番表",
      exportName: "april2022",
      aniListExportName: "spring2022",
      expectedCardCount: 57,
      sentinelTitles: Object.freeze(["群青幻想曲", "INSECTLAND"]),
    }),
    Object.freeze({
      month: "7",
      label: "2022 年 7 月番",
      url: "https://yuc.wiki/202207/",
      catalogName: "YUC 2022年7月新番表",
      exportName: "july2022",
      aniListExportName: "summer2022",
      expectedCardCount: 50,
      sentinelTitles: Object.freeze(["契约之吻", "怪兽档案"]),
    }),
    Object.freeze({
      month: "10",
      label: "2022 年 10 月番",
      url: "https://yuc.wiki/202210/",
      catalogName: "YUC 2022年10月新番表",
      exportName: "october2022",
      aniListExportName: "fall2022",
      expectedCardCount: 57,
      sentinelTitles: Object.freeze(["机动战士高达 水星的魔女", "噗尼轮轮"]),
    }),
  ]),
  2023: Object.freeze([
    Object.freeze({
      month: "1",
      label: "2023 年 1 月番",
      url: "https://yuc.wiki/202301/",
      catalogName: "YUC 2023年1月新番表",
      exportName: "january2023",
      aniListExportName: "winter2023",
      expectedCardCount: 62,
      sentinelTitles: Object.freeze(["阿鲁斯的巨兽", "怪兽档案 第2期"]),
    }),
    Object.freeze({
      month: "4",
      label: "2023 年 4 月番",
      url: "https://yuc.wiki/202304/",
      catalogName: "YUC 2023年4月新番表",
      exportName: "april2023",
      aniListExportName: "spring2023",
      expectedCardCount: 53,
      sentinelTitles: Object.freeze(["机动战士高达 水星的魔女 Part.2", "小哥斯拉的逆袭"]),
    }),
    Object.freeze({
      month: "7",
      label: "2023 年 7 月番",
      url: "https://yuc.wiki/202307/",
      catalogName: "YUC 2023年7月新番表",
      exportName: "july2023",
      aniListExportName: "summer2023",
      expectedCardCount: 53,
      sentinelTitles: Object.freeze(["幻日的夜羽", "暗芝居 第11期"]),
    }),
    Object.freeze({
      month: "10",
      label: "2023 年 10 月番",
      url: "https://yuc.wiki/202310/",
      catalogName: "YUC 2023年10月新番表",
      exportName: "october2023",
      aniListExportName: "fall2023",
      expectedCardCount: 76,
      sentinelTitles: Object.freeze(["GOD.app 神明选拔", "小鸡舞者 第3期"]),
    }),
  ]),
  2024: Object.freeze([
    Object.freeze({
      month: "1",
      label: "2024 年 1 月番",
      url: "https://yuc.wiki/202401/",
      catalogName: "YUC 2024年1月新番表",
      exportName: "january2024",
      aniListExportName: "winter2024",
      expectedCardCount: 52,
      sentinelTitles: Object.freeze(["METALLIC ROUGE", "暗芝居 第12期"]),
    }),
    Object.freeze({
      month: "4",
      label: "2024 年 4 月番",
      url: "https://yuc.wiki/202404/",
      catalogName: "YUC 2024年4月新番表",
      exportName: "april2024",
      aniListExportName: "spring2024",
      expectedCardCount: 62,
      sentinelTitles: Object.freeze(["GIRLS BAND CRY", "我的英雄学院 第7期"]),
    }),
    Object.freeze({
      month: "7",
      label: "2024 年 7 月番",
      url: "https://yuc.wiki/202407/",
      catalogName: "YUC 2024年7月新番表",
      exportName: "july2024",
      aniListExportName: "summer2024",
      expectedCardCount: 55,
      sentinelTitles: Object.freeze(["菜一般 花一般", "暗芝居 第13期"]),
    }),
    Object.freeze({
      month: "10",
      label: "2024 年 10 月番",
      url: "https://yuc.wiki/202410/",
      catalogName: "YUC 2024年10月新番表",
      exportName: "october2024",
      aniListExportName: "fall2024",
      expectedCardCount: 69,
      sentinelTitles: Object.freeze(["没能成为魔法使的女孩子", "噗尼轮轮 第2期"]),
    }),
  ]),
  2025: Object.freeze([
    Object.freeze({
      month: "1",
      label: "2025 年 1 月番",
      url: "https://yuc.wiki/202501/",
      catalogName: "YUC 2025年1月新番表",
      exportName: "january2025",
      aniListExportName: "winter2025",
      expectedCardCount: 54,
      sentinelTitles: Object.freeze(["BanG Dream! Ave Mujica", "暗芝居 第14期"]),
    }),
    Object.freeze({
      month: "4",
      label: "2025 年 4 月番",
      url: "https://yuc.wiki/202504/",
      catalogName: "YUC 2025年4月新番表",
      exportName: "april2025",
      aniListExportName: "spring2025",
      expectedCardCount: 67,
      sentinelTitles: Object.freeze(["机动战士高达GQuuuuuuX", "正义使者 我的英雄学院之非法英雄"]),
    }),
    Object.freeze({
      month: "7",
      label: "2025 年 7 月番",
      url: "https://yuc.wiki/202507/",
      catalogName: "YUC 2025年7月新番表",
      exportName: "july2025",
      aniListExportName: "summer2025",
      expectedCardCount: 67,
      sentinelTitles: Object.freeze(["新 吊带袜天使", "噗尼轮轮 第3期"]),
    }),
    Object.freeze({
      month: "10",
      label: "2025 年 10 月番",
      url: "https://yuc.wiki/202510/",
      catalogName: "YUC 2025年10月新番表",
      exportName: "october2025",
      aniListExportName: "fall2025",
      expectedCardCount: 61,
      sentinelTitles: Object.freeze(["永恒余晖", "我的英雄学院 第8期"]),
    }),
  ]),
  2026: Object.freeze([
  Object.freeze({
    month: "1",
    label: "2026 年 1 月番",
    url: "https://yuc.wiki/202601/",
    catalogName: "YUC 2026年1月新番表",
    exportName: "january2026",
    aniListExportName: "winter2026",
    expectedCardCount: 60,
    sentinelTitles: Object.freeze(["棱镜恋曲", "新 魔神坛斗士"]),
  }),
  Object.freeze({
    month: "4",
    label: "2026 年 4 月番",
    url: "https://yuc.wiki/202604/",
    catalogName: "YUC 2026年4月新番表",
    exportName: "april2026",
    aniListExportName: "spring2026",
    expectedCardCount: 70,
    sentinelTitles: Object.freeze(["幽灵音乐会 missing Songs", "魔法姐妹露露与莉莉"]),
  }),
  ]),
});

export function yucSeasonsForYear(year) {
  const seasons = seasonsByYear[year];
  if (!seasons) throw new RangeError("No YUC season configuration for " + year);
  return seasons;
}

export const YUC_SEASONS = yucSeasonsForYear(2026);

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
  const cardPattern = /<div style="float:left">([\s\S]*?)<div style="clear:both"><\/div(?:>|-->)/g;

  for (const [, card] of html.matchAll(cardPattern)) {
    const image = card.match(/<img\b(?=[^>]*\bwidth="180px")(?=[^>]*\bdata-src="([^"]+)")[^>]*>/i);
    const titleZh = card.match(/<p class="title_cn[_a-z\d]*">([\s\S]*?)<\/p>/i);
    const titleJa = card.match(/<p class="title_jp[_a-z\d]*">([\s\S]*?)<\/p>/i);
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

const EPISODE_COUNT_OVERRIDES = Object.freeze({ 189046: 11 });
const COVER_EXTENSIONS = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const LOCAL_COVER_EXTENSIONS = [".jpg", ".png", ".webp", ".gif"];

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

export function dedupeRecordId(record, sourceUrl, index, usedIds) {
  if (!usedIds.has(record.id)) {
    usedIds.add(record.id);
    return record;
  }

  const id = `${record.id}-${sourceUrl.slice(-7, -1)}-${String(index + 1).padStart(2, "0")}`;
  usedIds.add(id);
  return { ...record, id };
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

export function historicalCoverUrls(year, month, index) {
  const prefix = `/covers/yuc/history-${year}-${month.padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
  return LOCAL_COVER_EXTENSIONS.map((extension) => `${prefix}${extension}`);
}

async function downloadCover(coverUrl, year, month, index) {
  const spriteCoverUrl = historicalCoverUrls(year, month, index).find((localCoverUrl) =>
    localCoverUrl.endsWith(".webp"),
  );
  if (spriteCoverUrl && coverSpriteFor(spriteCoverUrl)) return spriteCoverUrl;

  for (const localCoverUrl of historicalCoverUrls(year, month, index)) {
    try {
      await access(new URL(`../public${localCoverUrl}`, import.meta.url));
      return localCoverUrl;
    } catch {}
  }

  const response = await fetch(coverUrl);
  if (!response.ok) {
    throw new Error(`YUC cover request failed (${response.status} ${response.statusText}): ${coverUrl}`);
  }

  const localCoverUrl = `${historicalCoverUrls(year, month, index)[0].slice(0, -4)}${coverExtension(response, coverUrl)}`;
  await writeFile(new URL(`../public${localCoverUrl}`, import.meta.url), new Uint8Array(await response.arrayBuffer()));
  return localCoverUrl;
}

async function generateSeason(config, aniListIndex, year, usedIds) {
  const cards = parseCards(await fetchHtml(config.url), config);
  const anime = [];
  for (const [index, card] of cards.entries()) {
    const record = dedupeRecordId(
      enrichYucRecord(card, index, config.url, findMatch(card, aniListIndex)),
      config.url,
      index,
      usedIds,
    );
    anime.push({ ...record, coverUrl: await downloadCover(card.coverUrl, year, config.month, index) });
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
  const year = Number(process.argv[2] ?? "2026");
  if (!Number.isInteger(year)) throw new RangeError("Year must be an integer");
  const yucSeasons = yucSeasonsForYear(year);
  const aniListCatalogs = await import(new URL(`../data/anilist-${year}.js`, import.meta.url));
  const aniListIndex = indexAniList(
    yucSeasons.flatMap(({ aniListExportName }) => aniListCatalogs[aniListExportName].anime),
  );

  await mkdir(new URL("../public/covers/yuc/", import.meta.url), { recursive: true });
  const usedIds = new Set();
  const catalogs = [];
  for (const config of yucSeasons) catalogs.push(await generateSeason(config, aniListIndex, year, usedIds));
  const output = `// Generated by scripts/generate-yuc-history-pilot.mjs. Do not edit by hand.\n\n${catalogs
    .map((catalog, index) => `export const ${yucSeasons[index].exportName} = ${JSON.stringify(catalog, null, 2)};`)
    .join("\n\n")}`;

  await writeFile(new URL(`../data/yuc-history-${year}.js`, import.meta.url), `${output}\n`);
  console.log(
    catalogs.map((catalog, index) => `${yucSeasons[index].month}月 ${catalog.anime.length} 部（AniList 匹配 ${catalog.anime.filter(({ anilistId }) => anilistId !== null).length} 部）`).join("；"),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
