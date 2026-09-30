// 当季 YUC 目录生成器：解析 YUC 当季新番页（周表 + 网络放送区 + 详情卡），
// 与 AniList 资料、しょぼい快照按 YUC → AniList → しょぼい → 估算/null 的优先级合并，
// 产出 data/yuc-current-<yyyymm>.js（生成物，提交入库，不得手工编辑）。
//
// 用法：
//   node scripts/generate-yuc-current.mjs <yyyymm>                    # 抓取线上 YUC 页面并写入生成物
//   node scripts/generate-yuc-current.mjs <yyyymm> --input <html>     # 从本地快照解析（复现/重放）
//   node scripts/generate-yuc-current.mjs <yyyymm> --remerge          # 页面已归档：用生成物中保留的原始排期重新合并
//   node scripts/generate-yuc-current.mjs <yyyymm> --verify           # 只比对不写入；与已提交生成物不一致时退出码非零
//   --updated-at <YYYY-MM-DD>                                        # 覆盖 updatedAt（默认保留已提交生成物的取值）
//
// 新季度接入：在 SEASON_CONFIGS 增加季度配置（slug 表逐条登记，slug 即条目 id，全局唯一、
// 不得改名）；页面出现配置未登记的“先行/连播”排期或总集数标注时脚本会报错，核对 YUC 页面后
// 更新配置再运行。页面归档（周表转为完结列表）后该季度只能走 --remerge。
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";

import { coverSpriteFor } from "../data/cover-sprites.js";

// ---------- 季度配置（可维护输入区，注释即来源审计） ----------
// slugByTitle：YUC 详情卡中文标题 → 稳定 slug（即条目 id 与逻辑封面键 /covers/yuc/<slug>.webp）。
// yucEpisodeCounts：YUC 页面明确标注的总集数；其余作品由 AniList 补充，都无则按约定估算 12。
// anilistIdOverrides：YUC 日文标题与 AniList 条目不同时的显式对照（slug → AniList 数字 id）。
const SEASON_CONFIGS = Object.freeze({
  "202607": Object.freeze({
    label: "2026 年 7 月番",
    sourceName: "YUC 2026年7月新番表",
    sourceUrl: "https://yuc.wiki/202607/",
    exportName: "july2026",
    aniListExportName: "summer2026",
    expectedCount: 66,
    // YUC 页面已为全部作品标注总集数（页面周表标注“全N话”），不依赖 AniList 集数。
    allEpisodeCountsFromYuc: true,
    // YUC 202607 页面已归档为完结表（周表时刻/日期不再可用），本季只能 --remerge。
    archived: true,
  }),
  "202610": Object.freeze({
    label: "2026 年 10 月番",
    sourceName: "YUC 2026年10月新番表",
    sourceUrl: "https://yuc.wiki/202610/",
    exportName: "october2026",
    aniListExportName: "fall2026",
    expectedCount: 69,
    // slug 即条目 id；按 YUC 页面详情卡顺序登记，新增作品只能追加新 slug。
    slugByTitle: Object.freeze({
      "顶点武装": "vertex-force",
      "兽王武神丹帝拜恩": "dandivine",
      "黑暗机器": "dark-machine",
      "铁旅 邂逅铁道少女": "tetsuryou",
      "魔法姐妹露露与莉莉 Part.2": "lulutto-lilly-2",
      "战斗之魂 [Re] 绝界之空": "battle-spirits-re",
      "苍蓝传承": "aoki-denshou",
      "新 Keroro军曹": "shin-keroro",
      "新 魔法骑士Rayearth": "rayearth-2026",
      "新 乱马1/2 第3期": "ranma-3",
      "龙珠超 比鲁斯": "dragon-ball-super-beerus",
      "JOJO奇妙冒险 飙马野郎 2nd&3rd STAGE": "jojo-sbr-2nd-3rd",
      "新 网球王子 U-17世界杯决赛成员决定战": "tenipuri-u17-kesshou",
      "钻石王牌 第4期 Part.2 (actⅡ 第2期 Part.2)": "diamond-ace-act2-2",
      "青之芦苇 第2期": "aoashi-2",
      "青春之箱 第2期": "ao-no-hako-2",
      "东京复仇者 第4期 三天战争篇": "tokyo-revengers-4",
      "桃源暗鬼 第2期": "tougen-anki-2",
      "黑色五叶草 第2期": "black-clover-2",
      "归还者的魔法要特别 第2期": "kikansha-2",
      "杀手旅店 第2期": "hotel-inhumans-2",
      "夜樱家的大作战 第2期 Part.2": "yozakura-2-part-2",
      "冰之城墙 第2期": "koori-no-jouheki-2",
      "FX战士久留美": "fx-senshi-kurumi",
      "大叔喜欢可爱小玩意": "ojisan-kawaii",
      "朱色假面": "shuiro-no-kamen",
      "PSYREN 决战游戏": "psyren",
      "超巡 超条前辈": "choujun",
      "僵尸搜寻中": "zombie-sagashitemasu",
      "战车椅子": "tank-chair",
      "愚者之夜": "fool-night",
      "装备我最强": "temppal",
      "借出去的魔力 要用【分期还款】强制收回": "ribo-barai",
      "转生成哥布林有什么问题吗": "tensei-goblin",
      "七叶树王国的七名骑士": "marronnier-7",
      "萤火虫的出嫁": "hotaru-no-yomeiri",
      "来自远方": "kanata-kara",
      "脑洞学生会": "seitokai-ana",
      "女友的朋友": "kanojo-no-tomodachi",
      "不擅交际的未亡人雪女与诅咒戒指": "yukionna-noroi",
      "黑暗召唤师在地下恋爱中": "dark-summoner",
      "某暗部的少女共栖": "toaru-anbu-item",
      "魔法少女育成计画restart": "mahou-ikusei-restart",
      "药屋少女的呢喃 第3期": "kusuriya-3",
      "野生的最终BOSS出现了 第2期": "yasei-lastboss-2",
      "转生成为魔剑 第2期": "tensei-ken-2",
      "冰剑的魔术师将要统一世界 第2期": "hyouken-2",
      "转生贵族靠着鉴定技能 一飞冲天 第3期": "kantei-skill-3",
      "佐佐木与文鸟小哔 第2期": "sasaki-pii-2",
      "侦探已死 第2期": "tantei-wa-mou-2",
      "弹珠汽水瓶里的千岁同学 Part.2": "chitose-kun-2",
      "冷淡的佐藤同学只对我撒娇": "shiotaiou-satou",
      "你好 我是受心上人所托 来做恋爱药的魔女": "horegusuri-majo",
      "弱气MAX的大小姐居然 接受了铁腕未婚夫的赌约": "yowaki-max-reijou",
      "罗梅莉亚战记": "romeria-senki",
      "开始成为世界最强的魔女": "sekai-saikyou-majo",
      "乱世千金 倪亚‧利斯顿 转生为娇弱千金的弑神武人华丽无双录": "nia-liston",
      "转生了的大圣女 拼死隐瞒自己身为圣女": "tensei-daiseijo",
      "和没有信徒的女神大人 一起攻略异世界": "shinja-zero-megami",
      "魔法★探险家 转生为成人游戏万年男二又怎样 我要活用游戏知识自由生活": "magical-explorer",
      "一觉醒来坐拥神装和飞船 我决定以买一套独门独户的房子为目标作为佣兵自由地活下去": "mezametara-saikyou",
      "被流放的超能附魔师 讴歌随心所欲的第二人生": "cheat-fuyo-majutsushi",
      "恶魔纹章": "demons-crest",
      "恐怖收集者": "kyoufu-collector",
      "赛博朋克 边缘行者2": "cyberpunk-edgerunners-2",
      "幻想水浒传": "gensou-suikoden",
      "海豹小白": "shirotan",
      "小狸猫与小狐狸": "tanuki-to-kitsune",
      "神秘面包小子": "pan-dorobou",
    }),
    // YUC 202610 网络放送区标注“(全11话)”／“(全10话)”；其余作品集数由 AniList 补充。
    yucEpisodeCounts: Object.freeze({
      "jojo-sbr-2nd-3rd": 11,
      "cyberpunk-edgerunners-2": 10,
    }),
    // YUC 日文标题与 AniList 条目不同时的显式对照（2026 年 10 月番）。
    anilistIdOverrides: Object.freeze({
      "vertex-force": 209562,
      "dark-machine": 179876,
      "rayearth-2026": 178868,
      "ranma-3": 209872,
      "jojo-sbr-2nd-3rd": 210482,
      "aoashi-2": 191788,
      "black-clover-2": 195604,
      "hotel-inhumans-2": 199426,
      "tensei-ken-2": 159042,
      "sasaki-pii-2": 176314,
      "chitose-kun-2": 198727,
      "romeria-senki": 180894,
      "nia-liston": 206949,
      "cheat-fuyo-majutsushi": 207329,
      "cyberpunk-edgerunners-2": 195539,
    }),
  }),
});

export function seasonConfigFor(yyyymm) {
  const config = SEASON_CONFIGS[yyyymm];
  if (!config) {
    throw new RangeError(`未配置的季度 ${yyyymm}；已知季度: ${Object.keys(SEASON_CONFIGS).join(", ")}（新季度请先在 SEASON_CONFIGS 登记）`);
  }
  return config;
}

const weekdayByLabel = { 周一: "Mon", 周二: "Tue", 周三: "Wed", 周四: "Thu", 周五: "Fri", 周六: "Sat", 周日: "Sun" };

// ---------- YUC 页面解析 ----------
function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:#x([\da-f]+)|#(\d+)|amp|lt|gt|quot|apos);/gi, (entity, hex, decimal) => {
      if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
      if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
      return { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" }[entity.toLowerCase()];
    })
    .replace(/[ \t ]+/g, " ")
    .trim();
}

export function parseYucPage(html) {
  const markers = [];
  for (const label of Object.keys(weekdayByLabel)) {
    const marker = `<td class="date2">${label} (`;
    const index = html.indexOf(marker);
    if (index < 0) throw new Error(`YUC 页面缺少周表栏目 ${label}（页面可能已归档为完结表）`);
    markers.push({ weekday: label, index });
  }
  const networkIndex = html.indexOf('<td class="date2">网络放送 & 其他</td>');
  const detailStart = html.indexOf("<!--新番介绍部分-->");
  if (networkIndex < 0 || detailStart < 0) throw new Error("YUC 页面缺少网络放送区或新番介绍区");

  const weekly = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i + 1 < markers.length ? markers[i + 1].index : networkIndex;
    const section = html.slice(start, end);
    const entryPattern =
      /<p class="imgtext\d*">([\s\S]*?)<\/p><p class="imgep\d*">([\s\S]*?)<\/p><img width="120px" data-src="([^"]+)"[\s\S]*?<td colspan="3" class="date_title_+">([\s\S]*?)<\/td>/g;
    for (const match of section.matchAll(entryPattern)) {
      weekly.push({
        weekday: markers[i].weekday,
        time: decodeHtml(match[1]),
        startDate: decodeHtml(match[2]),
        cover: match[3],
        title: decodeHtml(match[4]),
      });
    }
  }

  const network = [];
  const networkPattern =
    /<div class="div_date_"><img width="120px" data-src="([^"]+)"[\s\S]*?<td colspan="2" class="date_title_+">([\s\S]*?)<\/td>[\s\S]*?<p class="pmfs\d*">([\s\S]*?)<\/p><p class="pmex[^"]*">([\s\S]*?)<\/p>/g;
  for (const match of html.slice(networkIndex, detailStart).matchAll(networkPattern)) {
    network.push({
      cover: match[1],
      title: decodeHtml(match[2]),
      dateText: decodeHtml(match[3]),
      extra: decodeHtml(match[4]),
    });
  }

  const cards = [];
  const cardPattern = /<div style="float:left"><img width="180px" data-src="([^"]+)"[\s\S]*?<p class="title_cn[_a-z\d]*">([\s\S]*?)<\/p>\s*<p class="title_jp[_a-z\d]*">([\s\S]*?)<\/p>[\s\S]*?<td class="type_[a-z]_r">([\s\S]*?)<\/td>[\s\S]*?<p class="broadcast_r">([\s\S]*?)<\/p>\s*<p class="broadcast_ex_r">([\s\S]*?)<\/p>/g;
  for (const match of html.slice(detailStart).matchAll(cardPattern)) {
    cards.push({
      cover: match[1],
      titleZh: decodeHtml(match[2]),
      titleJa: decodeHtml(match[3]),
      type: decodeHtml(match[4]),
      broadcast: decodeHtml(match[5]),
      broadcastEx: decodeHtml(match[6]),
    });
  }
  return { weekly, network, cards };
}

// ---------- 原始排期构建 ----------
function weekdayForDate(isoDate) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
}

function seasonIsoDate(yyyymm, monthDay) {
  const match = /^(\d{1,2})\/(\d{1,2})~?$/.exec(monthDay);
  if (!match) throw new Error(`无法解析日期文本: ${monthDay}`);
  const [, monthText, dayText] = match;
  const month = Number(monthText);
  const seasonYear = Number(yyyymm.slice(0, 4));
  const seasonMonth = Number(yyyymm.slice(4));
  // 开播窗口从季前一个月开始（如 10 月番允许 9 月先行首播）；1 月番的 12 月首播归前一年。
  const year =
    seasonMonth === 1 && month === 12
      ? seasonYear - 1
      : month >= seasonMonth - 1
        ? seasonYear
        : seasonYear + 1;
  return `${year}-${monthText.padStart(2, "0")}-${dayText.padStart(2, "0")}`;
}

// 先行规则（AGENTS.md 番剧数据规则）：详情写“M/D先行N话”及之后固定周播时，
// 先行段为第 1 至 N 集（网络首播），固定周播从第 N+1 集开始。
function parseBroadcastPremiere(yyyymm, card) {
  const advance = /(\d{1,2})\/(\d{1,2})先行(\d+)话/.exec(card.broadcast);
  if (!advance) {
    if (/先行|连播|#\d/.test(card.broadcast) || /先行|连播|#\d/.test(card.broadcastEx)) {
      throw new Error(`${card.titleZh}: 未识别的先行/连播排期「${card.broadcast} ${card.broadcastEx}」，请核对 YUC 页面后手工登记`);
    }
    return null;
  }
  const rest = card.broadcast.slice(advance.index + advance[0].length);
  const regular = /(\d{1,2})\/(\d{1,2})周[一二三四五六日]/.exec(rest);
  if (!regular) {
    throw new Error(`${card.titleZh}: 先行排期缺少后续固定周播日期「${card.broadcast}」，请核对 YUC 页面后手工登记`);
  }
  return {
    premiereDateBeijing: seasonIsoDate(yyyymm, `${advance[1]}/${advance[2]}`),
    premiereKind: "network",
    premiereEpisodeCount: Number(advance[3]),
    regularBroadcastStartDateBeijing: seasonIsoDate(yyyymm, `${regular[1]}/${regular[2]}`),
  };
}

export function buildRawEntries(yyyymm, config, { weekly, network, cards }) {
  const weeklyByCover = new Map(weekly.map((entry) => [entry.cover, entry]));
  const networkByCover = new Map(network.map((entry) => [entry.cover, entry]));

  const cardCovers = new Set(cards.map((card) => card.cover));
  const continuing = weekly.filter((entry) => !cardCovers.has(entry.cover));
  if (continuing.length > 0) {
    console.log(`周表中 ${continuing.length} 部非本季新番（连播/长篇）不收录: ${continuing.map((entry) => entry.title).join("、")}`);
  }

  const missingSlugs = cards.filter((card) => !config.slugByTitle?.[card.titleZh]).map((card) => card.titleZh);
  if (missingSlugs.length > 0) {
    throw new Error(`以下作品缺少 slug 登记，请在 SEASON_CONFIGS[${yyyymm}].slugByTitle 追加（slug 即条目 id，全局唯一、不得改名）:\n${missingSlugs.join("\n")}`);
  }

  const records = [];
  for (const card of cards) {
    const slug = config.slugByTitle[card.titleZh];
    const weeklyEntry = weeklyByCover.get(card.cover);
    const networkEntry = networkByCover.get(card.cover);
    const advancePremiere = parseBroadcastPremiere(yyyymm, card);

    const parsedExtraCount = /^[（(]全(\d+)[话話][)）]$/.exec(networkEntry?.extra ?? "")?.[1];
    const configuredCount = config.yucEpisodeCounts?.[slug];
    if (parsedExtraCount !== undefined && configuredCount !== Number(parsedExtraCount)) {
      throw new Error(
        `${card.titleZh}: YUC 页面标注总集数 ${parsedExtraCount}，与配置 ${configuredCount ?? "（未登记）"} 不一致；请核对后更新 yucEpisodeCounts`,
      );
    }

    const base = {
      id: slug,
      episodeCount: configuredCount ?? 12,
      titleZh: card.titleZh,
      titleJa: card.titleJa,
      coverUrl: `/covers/yuc/${slug}.webp`,
      coverAlt: `${card.titleZh} 主视觉`,
    };

    if (weeklyEntry) {
      const weeklyDate = seasonIsoDate(yyyymm, weeklyEntry.startDate);
      const weekday = weekdayByLabel[weeklyEntry.weekday];
      if (weekdayForDate(weeklyDate) !== weekday) {
        throw new Error(`${card.titleZh}: 周表 ${weeklyEntry.weekday} 与日期 ${weeklyDate} 不一致`);
      }
      const time = weeklyEntry.time.replace(/~$/, "");
      if (advancePremiere && advancePremiere.regularBroadcastStartDateBeijing !== weeklyDate) {
        throw new Error(
          `${card.titleZh}: 先行排期的固定周播日 ${advancePremiere.regularBroadcastStartDateBeijing} 与周表首播 ${weeklyDate} 不一致`,
        );
      }
      records.push({
        ...base,
        ...(advancePremiere ?? { premiereDateBeijing: weeklyDate }),
        scheduleWeekday: weekday,
        beijingTime: time || null,
        station: "YUC 周表",
        sourceUrl: config.sourceUrl,
      });
      continue;
    }

    if (advancePremiere) {
      throw new Error(`${card.titleZh}: 只有先行排期但没有周表条目，无法确定固定周播；请核对 YUC 页面后手工登记`);
    }

    if (networkEntry) {
      const dateText = /^(\d{1,2}\/\d{1,2})网络放送$/.exec(networkEntry.dateText);
      if (!dateText) throw new Error(`${card.titleZh}: 无法解析网络放送日期 ${networkEntry.dateText}`);
      records.push({
        ...base,
        premiereDateBeijing: seasonIsoDate(yyyymm, dateText[1]),
        premiereKind: "network",
        scheduleWeekday: null,
        beijingTime: null,
        station: "网络放送",
        sourceUrl: config.sourceUrl,
      });
      continue;
    }

    throw new Error(`${card.titleZh}: 没有周表或网络放送排期`);
  }

  if (records.length !== config.expectedCount) {
    throw new Error(`${config.sourceName} 条目数变化：预期 ${config.expectedCount}，解析得到 ${records.length}`);
  }
  const ids = new Set(records.map(({ id }) => id));
  if (ids.size !== records.length) throw new Error("slug 重复");
  for (const record of records) {
    if (record.beijingTime !== null && !/^\d{2}:\d{2}$/.test(record.beijingTime)) {
      throw new Error(`${record.id}: 时刻格式异常 ${record.beijingTime}`);
    }
  }
  return records;
}

// ---------- 合并（与 AniList / しょぼい 按优先级补空值；审计字段随生成物保留） ----------
function normalizeTitle(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function buildAniListMatcher(aniListAnime, config) {
  const byTitle = new Map();
  for (const record of aniListAnime) {
    const title = normalizeTitle(record.titleZh);
    byTitle.set(title, byTitle.has(title) ? null : record);
  }
  const byId = new Map(aniListAnime.map((record) => [Number(record.id.slice("anilist-".length)), record]));
  const overrides = new Map(Object.entries(config.anilistIdOverrides ?? {}));
  return (record) => {
    const overrideId = overrides.get(record.id);
    return overrideId === undefined ? byTitle.get(normalizeTitle(record.titleJa)) : byId.get(overrideId) ?? null;
  };
}

function applyYucSources(record, aniList, hasYucEpisodeCount) {
  const episodeCount = hasYucEpisodeCount ? record.episodeCount : aniList?.episodeCount ?? record.episodeCount;
  const episodeCountSource = hasYucEpisodeCount ? "YUC" : aniList ? "AniList" : "estimated";

  return {
    ...record,
    anilistId: aniList ? Number(aniList.id.slice("anilist-".length)) : null,
    episodeCount,
    episodeCountStatus: episodeCountSource === "estimated" ? "estimated" : "exact",
    episodeCountSource,
    titleSource: "YUC",
    coverSource: "YUC",
    ...(record.premiereDateBeijing ? { premiereDateSource: "YUC" } : {}),
    ...(record.scheduleWeekday ? { scheduleWeekdaySource: "YUC" } : {}),
    ...(record.beijingTime ? { beijingTimeSource: "YUC", timeStatus: "exact" } : { timeStatus: "unknown" }),
    stationSource: "YUC",
    ...(record.premiereEpisodeCount ? { premiereEpisodeCountSource: "YUC" } : {}),
    ...(record.regularBroadcastStartDateBeijing ? { regularBroadcastStartDateSource: "YUC" } : {}),
  };
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function appendKnownWeeklySchedule(record, episodeSchedules) {
  const lastSchedule = episodeSchedules.at(-1);
  const weeklySchedule = [...episodeSchedules].reverse().find(({ intervalDays }) => intervalDays === 7);
  if (!lastSchedule || !weeklySchedule || lastSchedule.episodeEnd >= record.episodeCount) return episodeSchedules;

  const episodeStart = lastSchedule.episodeEnd + 1;
  return [
    ...episodeSchedules,
    {
      episodeStart,
      episodeEnd: record.episodeCount,
      broadcastDateBeijing: addDays(
        weeklySchedule.broadcastDateBeijing,
        (episodeStart - weeklySchedule.episodeStart) * 7,
      ),
      beijingTime: weeklySchedule.beijingTime,
      intervalDays: 7,
    },
  ];
}

function withVerifiedYucPremiereTime(record, schedule) {
  const [firstSchedule] = schedule?.episodeSchedules ?? [];
  if (
    !record.premiereEpisodeCount ||
    !record.regularBroadcastStartDateBeijing ||
    !firstSchedule ||
    firstSchedule.intervalDays !== 0 ||
    firstSchedule.episodeStart !== 1 ||
    firstSchedule.episodeEnd !== record.premiereEpisodeCount ||
    firstSchedule.broadcastDateBeijing !== record.premiereDateBeijing
  ) {
    return record;
  }

  return {
    ...record,
    episodeSchedules: [
      firstSchedule,
      {
        episodeStart: record.premiereEpisodeCount + 1,
        episodeEnd: record.episodeCount,
        broadcastDateBeijing: record.regularBroadcastStartDateBeijing,
        beijingTime: record.beijingTime,
        intervalDays: 7,
      },
    ],
    timeStatus: "verified",
    scheduleSourceName: "YUC 周表 + しょぼい首播时刻",
    scheduleSourceUrl: schedule.sourceUrl,
    scheduleChannel: schedule.channel,
    episodeSchedulesSource: "YUC 周表 + しょぼい首播时刻",
  };
}

function applyVerifiedSyoboiSchedule(record, schedule) {
  const episodeSchedules = appendKnownWeeklySchedule(record, schedule.episodeSchedules);
  const [firstSchedule] = episodeSchedules;
  const weeklySchedule = episodeSchedules
    .filter(({ intervalDays }) => intervalDays === 7)
    .sort(
      (left, right) =>
        right.episodeEnd - right.episodeStart - (left.episodeEnd - left.episodeStart) ||
        left.episodeStart - right.episodeStart,
    )[0];
  return {
    ...record,
    ...(firstSchedule.intervalDays === 0 && firstSchedule.episodeEnd > firstSchedule.episodeStart
      ? { premiereEpisodeCount: firstSchedule.episodeEnd }
      : {}),
    ...(weeklySchedule && weeklySchedule.episodeStart > 1
      ? { regularBroadcastStartDateBeijing: weeklySchedule.broadcastDateBeijing }
      : {}),
    premiereDateBeijing: firstSchedule.broadcastDateBeijing,
    premiereDateSource: "しょぼいカレンダー",
    scheduleWeekday: weeklySchedule ? weekdayForDate(weeklySchedule.broadcastDateBeijing) : null,
    ...(weeklySchedule ? { scheduleWeekdaySource: "しょぼいカレンダー" } : {}),
    beijingTime: weeklySchedule?.beijingTime ?? firstSchedule.beijingTime,
    beijingTimeSource: "しょぼいカレンダー",
    timeStatus: "verified",
    station: schedule.channel,
    stationSource: "しょぼいカレンダー",
    episodeSchedules,
    episodeSchedulesSource: "しょぼいカレンダー",
    scheduleSourceName: "しょぼいカレンダー",
    scheduleSourceUrl: schedule.sourceUrl,
    scheduleChannel: schedule.channel,
  };
}

export function mergeSeasonEntries(rawEntries, { matchAniList, hasYucEpisodeCount, syoboiSchedules }) {
  return rawEntries.map((entry) => {
    const record = applyYucSources(entry, matchAniList(entry), hasYucEpisodeCount(entry));
    const schedule = syoboiSchedules.get(record.id);
    if (record.premiereKind === "network") return record;
    if (record.premiereDateBeijing && record.scheduleWeekday && record.beijingTime) {
      return withVerifiedYucPremiereTime(record, schedule);
    }
    if (!schedule?.episodeSchedules?.length) return record;
    return applyVerifiedSyoboiSchedule(record, schedule);
  });
}

// ---------- 生成物读写 ----------
function generatedFileUrl(yyyymm) {
  return new URL(`../data/yuc-current-${yyyymm}.js`, import.meta.url);
}

async function loadCommittedModule(yyyymm) {
  try {
    return await import(generatedFileUrl(yyyymm));
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND") return null;
    throw error;
  }
}

export function renderSeasonFile(config, rawEntries, season) {
  return `// Generated by scripts/generate-yuc-current.mjs. Do not edit by hand.
// ${config.exportName}RawEntries：YUC 页面（${config.sourceUrl}）的原始排期提取，页面归档后作为重新合并（--remerge）的输入保留。
// ${config.exportName}：原始排期与 AniList／しょぼい快照按 YUC → AniList → しょぼい → 估算/null 优先级合并后的最终目录，含 *Source 审计字段。

export const ${config.exportName}RawEntries = ${JSON.stringify(rawEntries, null, 2)};

export const ${config.exportName} = ${JSON.stringify(season, null, 2)};
`;
}

async function writeGeneratedFile(yyyymm, content) {
  const target = generatedFileUrl(yyyymm);
  const staged = new URL(`../data/.yuc-current-${randomUUID()}.tmp`, import.meta.url);
  try {
    await writeFile(staged, content);
    await rename(staged, target);
  } finally {
    await rm(staged, { force: true });
  }
}

export async function writeSeasonFile(yyyymm, config, rawEntries, season) {
  await writeGeneratedFile(yyyymm, renderSeasonFile(config, rawEntries, season));
}

// ---------- 封面（中间封面目录：public/covers/yuc/，之后接 convert:covers-webp → generate:cover-sprites） ----------
const coverExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const localCoverExtensions = [".jpg", ".png", ".webp", ".gif"];

async function downloadCover(remoteCoverUrl, slug) {
  const logicalCoverUrl = `/covers/yuc/${slug}.webp`;
  if (coverSpriteFor(logicalCoverUrl)) return logicalCoverUrl;

  for (const extension of localCoverExtensions) {
    const candidate = `/covers/yuc/${slug}${extension}`;
    try {
      await access(new URL(`../public${candidate}`, import.meta.url));
      return candidate;
    } catch {}
  }

  const response = await fetch(remoteCoverUrl);
  if (!response.ok) {
    throw new Error(`封面下载失败 (${response.status} ${response.statusText}): ${remoteCoverUrl}`);
  }
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase();
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error(`封面不是图片 (${contentType}): ${remoteCoverUrl}`);
  }
  const extension = coverExtensions.get(contentType) ?? (extname(new URL(remoteCoverUrl).pathname) || ".jpg");
  const localCoverUrl = `/covers/yuc/${slug}${extension}`;
  await writeFile(new URL(`../public${localCoverUrl}`, import.meta.url), new Uint8Array(await response.arrayBuffer()));
  return localCoverUrl;
}

async function applyCovers(cards, rawEntries) {
  await mkdir(new URL("../public/covers/yuc/", import.meta.url), { recursive: true });
  const remoteByTitle = new Map(cards.map((card) => [card.titleZh, card.cover]));
  for (const record of rawEntries) {
    record.coverUrl = await downloadCover(remoteByTitle.get(record.titleZh), record.id);
  }
}

function assertCoversMapped(rawEntries) {
  for (const record of rawEntries) {
    if (!coverSpriteFor(record.coverUrl)) {
      throw new Error(`缺少封面图集映射 ${record.coverUrl}；请先完成封面下载并运行 convert:covers-webp 与 generate:cover-sprites`);
    }
  }
}

// ---------- 主流程 ----------
function shanghaiToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("/", "-");
}

async function fetchHtml(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`YUC 请求失败 (${response.status}): ${url}`);
  return response.text();
}

async function importSeasonInputs(yyyymm, config) {
  const year = yyyymm.slice(0, 4);
  let aniListAnime = [];
  try {
    const aniListCatalogs = await import(`../data/anilist-${year}.js`);
    aniListAnime = aniListCatalogs[config.aniListExportName]?.anime ?? [];
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
    console.warn(`警告: data/anilist-${year}.js 不存在，集数无法由 AniList 补充（请先运行 generate:anilist-pilot）`);
  }
  let syoboiSchedules = new Map();
  try {
    const snapshot = await import(`../data/syoboi-history-${year}.js`);
    syoboiSchedules = new Map((snapshot[`syoboiHistory${year}`]?.entries ?? []).map((entry) => [entry.recordId, entry]));
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
  }
  return { aniListAnime, syoboiSchedules };
}

async function assembleSeason(yyyymm, config, rawEntries, updatedAt) {
  const { aniListAnime, syoboiSchedules } = await importSeasonInputs(yyyymm, config);
  const matchAniList = buildAniListMatcher(aniListAnime, config);
  const yucCountIds = new Set(Object.keys(config.yucEpisodeCounts ?? {}));
  const hasYucEpisodeCount = config.allEpisodeCountsFromYuc ? () => true : (record) => yucCountIds.has(record.id);
  const anime = mergeSeasonEntries(rawEntries, { matchAniList, hasYucEpisodeCount, syoboiSchedules });
  return {
    label: config.label,
    timeZoneLabel: "北京时间（UTC+8）",
    updatedAt: updatedAt ?? shanghaiToday(),
    catalogCount: anime.length,
    sourceName: config.sourceName,
    sourceUrl: config.sourceUrl,
    anime,
  };
}

// 用给定的原始排期重新合并一个季度（归档季度保留数据 / 一次性引导均走这里）。
export async function remergeFromRawEntries(yyyymm, rawEntries) {
  const config = seasonConfigFor(yyyymm);
  return { config, rawEntries, season: await assembleSeason(yyyymm, config, rawEntries, null) };
}

// 完整生成（或重新生成）一个季度的数据，不写文件。
// inputHtml：本地快照内容；为 null 且非 remerge 时抓取线上页面。
// remerge：从已提交生成物中读回原始排期重新合并（页面已归档季度的唯一途径）。
// dryRun：不下载封面，改为断言全部封面已有图集映射。
export async function generateSeasonData(yyyymm, { inputHtml = null, remerge = false, dryRun = false } = {}) {
  const config = seasonConfigFor(yyyymm);
  const committedModule = await loadCommittedModule(yyyymm);
  const committedSeason = committedModule?.[config.exportName] ?? null;

  let rawEntries;
  if (remerge) {
    if (!committedSeason) throw new Error(`--remerge 需要已提交的生成物 data/yuc-current-${yyyymm}.js`);
    rawEntries = committedModule[`${config.exportName}RawEntries`];
    if (!Array.isArray(rawEntries) || rawEntries.length !== committedSeason.catalogCount) {
      throw new Error(`data/yuc-current-${yyyymm}.js 中的原始排期与 catalogCount 不一致`);
    }
  } else {
    if (config.archived) {
      throw new Error(`${config.sourceName} 页面已归档为完结表，周表时刻不可再解析；请使用 --remerge 重新合并`);
    }
    const html = inputHtml ?? (await fetchHtml(config.sourceUrl));
    const parsed = parseYucPage(html);
    console.log(`解析 ${config.sourceName}: 周表 ${parsed.weekly.length} 条、网络放送 ${parsed.network.length} 条、详情卡 ${parsed.cards.length} 张`);
    rawEntries = buildRawEntries(yyyymm, config, parsed);
    if (dryRun) {
      assertCoversMapped(rawEntries);
    } else {
      await applyCovers(parsed.cards, rawEntries);
    }
  }

  // 条目 id 是账号追番数据的身份：重新生成不得丢失已提交条目，也不得与其他季度冲突。
  if (committedSeason) {
    for (const { id } of committedSeason.anime) {
      if (!rawEntries.some((record) => record.id === id)) {
        throw new Error(`已提交条目在新一轮生成中缺失: ${id}（不能静默丢弃条目 id）`);
      }
    }
  }

  return { config, rawEntries, season: await assembleSeason(yyyymm, config, rawEntries, committedSeason?.updatedAt ?? null) };
}

async function main() {
  const args = process.argv.slice(2);
  const yyyymm = args.find((arg) => !arg.startsWith("--"));
  if (!yyyymm || !/^\d{6}$/.test(yyyymm)) {
    throw new RangeError("用法: generate-yuc-current.mjs <yyyymm> [--input <html>] [--remerge] [--verify] [--updated-at <date>]");
  }
  const optionValue = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : null;
  };
  const input = optionValue("--input");
  const remerge = args.includes("--remerge");
  const verify = args.includes("--verify");
  const updatedAt = optionValue("--updated-at");
  if (input && remerge) throw new RangeError("--input 与 --remerge 互斥");

  const inputHtml = input ? await readFile(input, "utf8") : null;
  const generated = await generateSeasonData(yyyymm, { inputHtml, remerge, dryRun: verify });
  if (updatedAt) generated.season.updatedAt = updatedAt;

  if (verify) {
    const config = generated.config;
    const committedModule = await loadCommittedModule(yyyymm);
    if (!committedModule?.[config.exportName]) {
      throw new Error(`--verify 需要已提交的生成物 data/yuc-current-${yyyymm}.js`);
    }
    assert.deepEqual(committedModule[`${config.exportName}RawEntries`], generated.rawEntries);
    assert.deepEqual(committedModule[config.exportName], generated.season);
    console.log(`verify OK: data/yuc-current-${yyyymm}.js 与重新生成结果逐项一致（${generated.season.catalogCount} 部）`);
    return;
  }

  await writeSeasonFile(yyyymm, generated.config, generated.rawEntries, generated.season);
  console.log(`wrote data/yuc-current-${yyyymm}.js: ${generated.season.catalogCount} 部（updatedAt ${generated.season.updatedAt}）`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
