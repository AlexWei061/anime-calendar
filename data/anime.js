import { april2026, january2026 } from "./yuc-history-2026.js";
import { fall2026, summer2026 } from "./anilist-2026.js";
import { april2025, january2025, july2025, october2025 } from "./yuc-history-2025.js";
import { april2024, january2024, july2024, october2024 } from "./yuc-history-2024.js";
import { april2023, january2023, july2023, october2023 } from "./yuc-history-2023.js";
import { april2022, january2022, july2022, october2022 } from "./yuc-history-2022.js";
import { april2021, january2021, july2021, october2021 } from "./yuc-history-2021.js";
import { april2020, january2020, july2020, october2020 } from "./yuc-history-2020.js";
import { syoboiHistory2026 } from "./syoboi-history-2026.js";

export const season = {
  "label": "2026 年 7 月番",
  "timeZoneLabel": "北京时间（UTC+8）",
  "updatedAt": "2026-09-01",
  "catalogCount": 66,
  "sourceName": "YUC 2026年7月新番表",
  "sourceUrl": "https://yuc.wiki/202607/"
};

const yucAnime = [
  {
    "id": "sayonara-lara",
    "episodeCount": 12,
    "titleZh": "再见 拉拉",
    "titleJa": "さよならララ",
    "coverUrl": "/covers/yuc/sayonara-lara.webp",
    "coverAlt": "再见 拉拉 主视觉",
    "premiereDateBeijing": "2026-07-05",
    "scheduleWeekday": "Sun",
    "beijingTime": "23:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "mobius-dust",
    "episodeCount": 12,
    "titleZh": "梅比乌斯之尘",
    "titleJa": "メビウス・ダスト/Mevius Dust",
    "coverUrl": "/covers/yuc/mobius-dust.webp",
    "coverAlt": "梅比乌斯之尘 主视觉",
    "premiereDateBeijing": "2026-07-09",
    "scheduleWeekday": "Thu",
    "beijingTime": "22:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "grow-up-show",
    "episodeCount": 13,
    "titleZh": "GrowUpShow向日葵马戏团",
    "titleJa": "グロウアップショウ ～ひまわりのサーカス団～",
    "coverUrl": "/covers/yuc/grow-up-show.webp",
    "coverAlt": "GrowUpShow向日葵马戏团 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "24:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "yume-mita",
    "episodeCount": 13,
    "premiereEpisodeCount": 3,
    "titleZh": "BanG Dream! YUME∞MITA",
    "titleJa": "バンドリ！ ゆめ∞みた",
    "coverUrl": "/covers/yuc/yume-mita.webp",
    "coverAlt": "BanG Dream! YUME∞MITA 主视觉",
    "premiereDateBeijing": "2026-07-02",
    "scheduleWeekday": "Thu",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "nanoha-exceeds",
    "episodeCount": 12,
    "titleZh": "魔法少女奈叶 EXCEEDS Gun Blaze Vengeance",
    "titleJa": "魔法少女リリカルなのは EXCEEDS Gun Blaze Vengeance",
    "coverUrl": "/covers/yuc/nanoha-exceeds.webp",
    "coverAlt": "魔法少女奈叶 EXCEEDS Gun Blaze Vengeance 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "25:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "samurai-troopers-2",
    "episodeCount": 12,
    "titleZh": "新 魔神坛斗士 Part.2",
    "titleJa": "鎧真伝サムライトルーパー",
    "coverUrl": "/covers/yuc/samurai-troopers-2.webp",
    "coverAlt": "新 魔神坛斗士 Part.2 主视觉",
    "premiereDateBeijing": "2026-07-07",
    "scheduleWeekday": "Tue",
    "beijingTime": "22:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "ghost-in-the-shell",
    "episodeCount": 10,
    "titleZh": "新 攻壳机动队",
    "titleJa": "攻殻機動隊 THE GHOST IN THE SHELL",
    "coverUrl": "/covers/yuc/ghost-in-the-shell.webp",
    "coverAlt": "新 攻壳机动队 主视觉",
    "premiereDateBeijing": "2026-07-07",
    "scheduleWeekday": "Tue",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "cyborg-009-nemesis",
    "episodeCount": 3,
    "titleZh": "人造人009 涅墨西斯",
    "titleJa": "サイボーグ009 ネメシス",
    "coverUrl": "/covers/yuc/cyborg-009-nemesis.webp",
    "coverAlt": "人造人009 涅墨西斯 主视觉",
    "premiereDateBeijing": "2026-07-19",
    "premiereKind": "network",
    "scheduleWeekday": null,
    "beijingTime": null,
    "station": "网络放送",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "bleach-tybw-kashin",
    "episodeCount": 10,
    "titleZh": "死神 千年血战篇 Part.4 祸进谭",
    "titleJa": "BLEACH 千年血戦篇-禍進譚-",
    "coverUrl": "/covers/yuc/bleach-tybw-kashin.webp",
    "coverAlt": "死神 千年血战篇 Part.4 祸进谭 主视觉",
    "premiereDateBeijing": "2026-07-25",
    "scheduleWeekday": "Sat",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "grand-blue-3",
    "episodeCount": 12,
    "titleZh": "碧蓝之海 第3期",
    "titleJa": "ぐらんぶる Season 3",
    "coverUrl": "/covers/yuc/grand-blue-3.webp",
    "coverAlt": "碧蓝之海 第3期 主视觉",
    "premiereDateBeijing": "2026-07-06",
    "scheduleWeekday": "Mon",
    "beijingTime": "24:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "baki-dou-2",
    "episodeCount": 12,
    "titleZh": "刃牙道 Part.2",
    "titleJa": "刃牙道 第2クール",
    "coverUrl": "/covers/yuc/baki-dou-2.webp",
    "coverAlt": "刃牙道 Part.2 主视觉",
    "premiereDateBeijing": "2026-06-18",
    "premiereKind": "network",
    "scheduleWeekday": null,
    "beijingTime": null,
    "station": "网络放送",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "clevatess-2",
    "episodeCount": 13,
    "titleZh": "Clevatess 第2期 魔兽之王与虚假的勇者传承",
    "titleJa": "クレバテスⅡ-魔獣の王と偽りの勇者伝承-",
    "coverUrl": "/covers/yuc/clevatess-2.webp",
    "coverAlt": "Clevatess 第2期 魔兽之王与虚假的勇者传承 主视觉",
    "premiereDateBeijing": "2026-07-08",
    "scheduleWeekday": "Wed",
    "beijingTime": "20:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "nigejouzu-2",
    "episodeCount": 12,
    "titleZh": "擅长逃跑的殿下 第2期",
    "titleJa": "逃げ上手の若君 第二期",
    "coverUrl": "/covers/yuc/nigejouzu-2.webp",
    "coverAlt": "擅长逃跑的殿下 第2期 主视觉",
    "premiereDateBeijing": "2026-07-17",
    "scheduleWeekday": "Fri",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "magilumiere-2",
    "episodeCount": 12,
    "titleZh": "柔光魔女股份有限公司 第2期",
    "titleJa": "株式会社マジルミエ 第2期",
    "coverUrl": "/covers/yuc/magilumiere-2.webp",
    "coverAlt": "柔光魔女股份有限公司 第2期 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "23:55",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "hanazakari-2",
    "episodeCount": 13,
    "titleZh": "花样少年少女 第2期",
    "titleJa": "花ざかりの君たちへ 第2期",
    "coverUrl": "/covers/yuc/hanazakari-2.webp",
    "coverAlt": "花样少年少女 第2期 主视觉",
    "premiereDateBeijing": "2026-07-01",
    "scheduleWeekday": "Wed",
    "beijingTime": "25:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "seihantai-kimi-boku",
    "episodeCount": 13,
    "titleZh": "相反的你和我 第2期",
    "titleJa": "正反対な君と僕 第2期",
    "coverUrl": "/covers/yuc/seihantai-kimi-boku.webp",
    "coverAlt": "相反的你和我 第2期 主视觉",
    "premiereDateBeijing": "2026-07-05",
    "scheduleWeekday": "Sun",
    "beijingTime": "16:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "100-girlfriends-3",
    "episodeCount": 12,
    "titleZh": "超超超超喜欢你的 100个女孩子 第3期",
    "titleJa": "君のことが大大大大大好きな100人の彼女 第3期",
    "coverUrl": "/covers/yuc/100-girlfriends-3.webp",
    "coverAlt": "超超超超喜欢你的 100个女孩子 第3期 主视觉",
    "premiereDateBeijing": "2026-07-05",
    "scheduleWeekday": "Sun",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "azur-lane-bisoku-2",
    "episodeCount": 12,
    "titleZh": "碧蓝航线 微速前行 第2期",
    "titleJa": "アズールレーン びそくぜんしんっ！にっ！！",
    "coverUrl": "/covers/yuc/azur-lane-bisoku-2.webp",
    "coverAlt": "碧蓝航线 微速前行 第2期 主视觉",
    "premiereDateBeijing": "2026-07-05",
    "scheduleWeekday": "Sun",
    "beijingTime": "24:45",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "bungo-wan-2",
    "episodeCount": 12,
    "titleZh": "文豪野犬 汪 第2期",
    "titleJa": "文豪ストレイドッグス わん！2",
    "coverUrl": "/covers/yuc/bungo-wan-2.webp",
    "coverAlt": "文豪野犬 汪 第2期 主视觉",
    "premiereDateBeijing": "2026-07-02",
    "scheduleWeekday": "Thu",
    "beijingTime": "20:40",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "dodge-danko",
    "episodeCount": 12,
    "titleZh": "炎之斗球女 弹子",
    "titleJa": "炎の闘球女 ドッジ弾子",
    "coverUrl": "/covers/yuc/dodge-danko.webp",
    "coverAlt": "炎之斗球女 弹子 主视觉",
    "premiereDateBeijing": "2026-07-06",
    "scheduleWeekday": "Mon",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "thunder-3",
    "episodeCount": 12,
    "titleZh": "雷霆三人行",
    "titleJa": "サンダー3",
    "coverUrl": "/covers/yuc/thunder-3.webp",
    "coverAlt": "雷霆三人行 主视觉",
    "premiereDateBeijing": "2026-07-08",
    "scheduleWeekday": "Wed",
    "beijingTime": "23:45",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "temmaku-jardugar",
    "episodeCount": 12,
    "titleZh": "穹庐下的魔女",
    "titleJa": "天幕のジャードゥーガル",
    "coverUrl": "/covers/yuc/temmaku-jardugar.webp",
    "coverAlt": "穹庐下的魔女 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "24:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "red-river",
    "episodeCount": 12,
    "titleZh": "天是红河岸",
    "titleJa": "天は赤い河のほとり",
    "coverUrl": "/covers/yuc/red-river.webp",
    "coverAlt": "天是红河岸 主视觉",
    "premiereDateBeijing": "2026-07-07",
    "scheduleWeekday": "Tue",
    "beijingTime": "24:35",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "world-is-dancing",
    "episodeCount": 13,
    "titleZh": "世界舞动",
    "titleJa": "ワールド イズ ダンシング",
    "coverUrl": "/covers/yuc/world-is-dancing.webp",
    "coverAlt": "世界舞动 主视觉",
    "premiereDateBeijing": "2026-06-29",
    "scheduleWeekday": "Mon",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "tetsunabe-jan",
    "episodeCount": 12,
    "titleZh": "炒翻天",
    "titleJa": "鉄鍋のジャン！",
    "coverUrl": "/covers/yuc/tetsunabe-jan.webp",
    "coverAlt": "炒翻天 主视觉",
    "premiereDateBeijing": "2026-07-05",
    "scheduleWeekday": "Sun",
    "beijingTime": "16:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "lets-go-kaiki",
    "episodeCount": 12,
    "titleZh": "Let's Go 怪奇组",
    "titleJa": "レッツゴー怪奇組",
    "coverUrl": "/covers/yuc/lets-go-kaiki.webp",
    "coverAlt": "Let's Go 怪奇组 主视觉",
    "premiereDateBeijing": "2026-07-05",
    "scheduleWeekday": "Sun",
    "beijingTime": "15:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "iwamoto-senpai",
    "episodeCount": 12,
    "titleZh": "岩元前辈的推荐",
    "titleJa": "岩元先輩ノ推薦",
    "coverUrl": "/covers/yuc/iwamoto-senpai.webp",
    "coverAlt": "岩元前辈的推荐 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "reiwa-no-darasan",
    "episodeCount": 13,
    "titleZh": "令和的斑小姐",
    "titleJa": "令和のタラさん",
    "coverUrl": "/covers/yuc/reiwa-no-darasan.webp",
    "coverAlt": "令和的斑小姐 主视觉",
    "premiereDateBeijing": "2026-07-02",
    "scheduleWeekday": "Thu",
    "beijingTime": "20:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "kamui-san",
    "episodeCount": 12,
    "titleZh": "正后方的神威",
    "titleJa": "うしろの正面カムイさん",
    "coverUrl": "/covers/yuc/kamui-san.webp",
    "coverAlt": "正后方的神威 主视觉",
    "premiereDateBeijing": "2026-07-03",
    "scheduleWeekday": "Fri",
    "beijingTime": "24:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "black-torch",
    "episodeCount": 12,
    "titleZh": "暗黑灯火",
    "titleJa": "BLACK TORCH",
    "coverUrl": "/covers/yuc/black-torch.webp",
    "coverAlt": "暗黑灯火 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "haniori-san",
    "episodeCount": 12,
    "titleZh": "花织同学转生后还是想干架",
    "titleJa": "花織さんは転生しても喧嘩がしたい",
    "coverUrl": "/covers/yuc/haniori-san.webp",
    "coverAlt": "花织同学转生后还是想干架 主视觉",
    "premiereDateBeijing": "2026-07-11",
    "scheduleWeekday": "Sat",
    "beijingTime": "25:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "otome-kaiju-caramelize",
    "episodeCount": 12,
    "titleZh": "少女怪兽焦糖味",
    "titleJa": "乙女怪獣キャラメリゼ",
    "coverUrl": "/covers/yuc/otome-kaiju-caramelize.webp",
    "coverAlt": "少女怪兽焦糖味 主视觉",
    "premiereDateBeijing": "2026-07-02",
    "scheduleWeekday": "Thu",
    "beijingTime": "25:28",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "no-bullying-stepmother",
    "episodeCount": 12,
    "titleZh": "不虐待我的继母与继姐",
    "titleJa": "いびってこない義母と義姉",
    "coverUrl": "/covers/yuc/no-bullying-stepmother.webp",
    "coverAlt": "不虐待我的继母与继姐 主视觉",
    "premiereDateBeijing": "2026-07-08",
    "scheduleWeekday": "Wed",
    "beijingTime": "22:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "uchioto",
    "episodeCount": 24,
    "titleZh": "我家的弟弟们真是让您费心了",
    "titleJa": "うちの弟どもがすみません",
    "coverUrl": "/covers/yuc/uchioto.webp",
    "coverAlt": "我家的弟弟们真是让您费心了 主视觉",
    "premiereDateBeijing": "2026-07-03",
    "scheduleWeekday": "Fri",
    "beijingTime": "24:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "super-yani",
    "episodeCount": 12,
    "titleZh": "躲在超市后门抽烟的两人",
    "titleJa": "スーパーの裏でヤニ吸うふたり",
    "coverUrl": "/covers/yuc/super-yani.webp",
    "coverAlt": "躲在超市后门抽烟的两人 主视觉",
    "premiereDateBeijing": "2026-06-03",
    "premiereEpisodeCount": 6,
    "regularBroadcastStartDateBeijing": "2026-07-09",
    "premiereKind": "network",
    "scheduleWeekday": "Thu",
    "beijingTime": "22:56",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "yani-neko",
    "episodeCount": 12,
    "titleZh": "尼古喵喵",
    "titleJa": "ヤニねこ",
    "coverUrl": "/covers/yuc/yani-neko.webp",
    "coverAlt": "尼古喵喵 主视觉",
    "premiereDateBeijing": "2026-07-02",
    "scheduleWeekday": "Thu",
    "beijingTime": "24:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "taiari-deshita",
    "episodeCount": 12,
    "titleZh": "感谢对战 大小姐才不玩格斗游戏",
    "titleJa": "対ありでした。 〜お嬢さまは格闘ゲームなんてしない〜",
    "coverUrl": "/covers/yuc/taiari-deshita.webp",
    "coverAlt": "感谢对战 大小姐才不玩格斗游戏 主视觉",
    "premiereDateBeijing": "2026-07-07",
    "scheduleWeekday": "Tue",
    "beijingTime": "19:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "korekaite-shine",
    "episodeCount": 12,
    "titleZh": "画完这个再去死",
    "titleJa": "これ描いて死ね",
    "coverUrl": "/covers/yuc/korekaite-shine.webp",
    "coverAlt": "画完这个再去死 主视觉",
    "premiereDateBeijing": "2026-07-03",
    "scheduleWeekday": "Fri",
    "beijingTime": "23:35",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "kimi-shinu-koi",
    "episodeCount": 13,
    "titleZh": "与你相恋到生命尽头",
    "titleJa": "きみが死ぬまで恋をしたい",
    "coverUrl": "/covers/yuc/kimi-shinu-koi.webp",
    "coverAlt": "与你相恋到生命尽头 主视觉",
    "premiereDateBeijing": "2026-07-07",
    "scheduleWeekday": "Tue",
    "beijingTime": "20:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "jiki-koshaku",
    "episodeCount": 12,
    "titleZh": "声称不爱我的下任公爵为何会溺爱我",
    "titleJa": "「きみを愛する気はない」と言った次期公爵様がなぜか溺愛してきます",
    "coverUrl": "/covers/yuc/jiki-koshaku.webp",
    "coverAlt": "声称不爱我的下任公爵为何会溺爱我 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "24:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "rezero-4-part-2",
    "episodeCount": 8,
    "titleZh": "Re:从零开始的异世界生活 第4期 Part.2 夺还篇",
    "titleJa": "Re:ゼロから始める異世界生活 4th season",
    "coverUrl": "/covers/yuc/rezero-4-part-2.webp",
    "coverAlt": "Re:从零开始的异世界生活 第4期 Part.2 夺还篇 主视觉",
    "premiereDateBeijing": "2026-08-12",
    "scheduleWeekday": "Wed",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "mushoku-3",
    "episodeCount": 14,
    "premiereEpisodeCount": 2,
    "titleZh": "无职转生 第3期",
    "titleJa": "無職転生 ～異世界行ったら本気だす～ 第3期",
    "coverUrl": "/covers/yuc/mushoku-3.webp",
    "coverAlt": "无职转生 第3期 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "regularBroadcastStartDateBeijing": "2026-07-12",
    "scheduleWeekday": "Sun",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "mobuseka-2",
    "episodeCount": 12,
    "titleZh": "乙女游戏世界对路人角色 很不友好 第2期",
    "titleJa": "乙女ゲー世界はモブに厳しい世界です2",
    "coverUrl": "/covers/yuc/mobuseka-2.webp",
    "coverAlt": "乙女游戏世界对路人角色 很不友好 第2期 主视觉",
    "premiereDateBeijing": "2026-07-08",
    "scheduleWeekday": "Wed",
    "beijingTime": "23:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "youjo-senki-2",
    "episodeCount": 12,
    "titleZh": "幼女战记 第2期",
    "titleJa": "幼女戦記Ⅱ",
    "coverUrl": "/covers/yuc/youjo-senki-2.webp",
    "coverAlt": "幼女战记 第2期 主视觉",
    "premiereDateBeijing": "2026-07-08",
    "scheduleWeekday": "Wed",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "ossan-kensei-2",
    "episodeCount": 12,
    "titleZh": "乡下大叔成为剑圣 第2期",
    "titleJa": "片田舎のおっさん、剣聖になる",
    "coverUrl": "/covers/yuc/ossan-kensei-2.webp",
    "coverAlt": "乡下大叔成为剑圣 第2期 主视觉",
    "premiereDateBeijing": "2026-07-08",
    "scheduleWeekday": "Wed",
    "beijingTime": "22:45",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "skeleton-knight-2",
    "episodeCount": 12,
    "premiereEpisodeCount": 1,
    "regularBroadcastStartDateBeijing": "2026-07-06",
    "titleZh": "骸骨骑士大人异世界冒险中 第2期",
    "titleJa": "骸骨騎士様、只今異世界へお出掛け中 第2期",
    "coverUrl": "/covers/yuc/skeleton-knight-2.webp",
    "coverAlt": "骸骨骑士大人异世界冒险中 第2期 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Mon",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "episodeSchedules": [
      {
        "episodeStart": 1,
        "episodeEnd": 1,
        "broadcastDateBeijing": "2026-07-04",
        "beijingTime": "19:30",
        "intervalDays": 0
      },
      {
        "episodeStart": 2,
        "episodeEnd": 12,
        "broadcastDateBeijing": "2026-07-06",
        "beijingTime": "21:00",
        "intervalDays": 7
      }
    ],
    "episodeSchedulesSource": "YUC",
    "scheduleSourceName": "YUC 2026年7月新番表",
    "scheduleSourceUrl": "https://yuc.wiki/202607/",
    "scheduleChannel": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "hellmode-2",
    "episodeCount": 12,
    "titleZh": "地狱模式 喜欢速通游戏的玩家在废设定异世界无双 第2期",
    "titleJa": "ヘルモード ～やり込み好きのゲーマーは廃設定の異世界で無双する～",
    "coverUrl": "/covers/yuc/hellmode-2.webp",
    "coverAlt": "地狱模式 喜欢速通游戏的玩家在废设定异世界无双 第2期 主视觉",
    "premiereDateBeijing": "2026-07-03",
    "scheduleWeekday": "Fri",
    "beijingTime": "24:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "rakudai-kenja",
    "episodeCount": 12,
    "titleZh": "落第贤者的学院无双",
    "titleJa": "落第賢者の学院無双 ～二度目の転生、Sランクチート魔術師冒険録～",
    "coverUrl": "/covers/yuc/rakudai-kenja.webp",
    "coverAlt": "落第贤者的学院无双 主视觉",
    "premiereDateBeijing": "2026-06-25",
    "scheduleWeekday": "Thu",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "sekai-saikyo-kouei",
    "episodeCount": 12,
    "titleZh": "世界最强后卫 迷宫国的新人探索者",
    "titleJa": "世界最強の後衛 ～迷宮国の新人探索者～",
    "coverUrl": "/covers/yuc/sekai-saikyo-kouei.webp",
    "coverAlt": "世界最强后卫 迷宫国的新人探索者 主视觉",
    "premiereDateBeijing": "2026-07-05",
    "scheduleWeekday": "Sun",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "tsuiho-juki",
    "episodeCount": 26,
    "titleZh": "被追放的转生重骑士 用游戏知识开无双",
    "titleJa": "追放された転生重騎士はゲーム知識で無双する",
    "coverUrl": "/covers/yuc/tsuiho-juki.webp",
    "coverAlt": "被追放的转生重骑士 用游戏知识开无双 主视觉",
    "premiereDateBeijing": "2026-07-02",
    "scheduleWeekday": "Thu",
    "beijingTime": "23:56",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "henkyou-ryumin",
    "episodeCount": 12,
    "titleZh": "从0位居民开始的边境领主大人",
    "titleJa": "領民0人スタートの辺境領主様",
    "coverUrl": "/covers/yuc/henkyou-ryumin.webp",
    "coverAlt": "从0位居民开始的边境领主大人 主视觉",
    "premiereDateBeijing": "2026-07-03",
    "scheduleWeekday": "Fri",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "lv999-villager",
    "episodeCount": 12,
    "titleZh": "LV999的村民",
    "titleJa": "LV999の村人",
    "coverUrl": "/covers/yuc/lv999-villager.webp",
    "coverAlt": "LV999的村民 主视觉",
    "premiereDateBeijing": "2026-07-01",
    "scheduleWeekday": "Wed",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "koko-ni-makase",
    "episodeCount": 12,
    "titleZh": "说出你们先走我断后的十年后 我成为了传说",
    "titleJa": "ここは俺に任せて先に行けと言ってから10年がたったら 伝説になっていた。",
    "coverUrl": "/covers/yuc/koko-ni-makase.webp",
    "coverAlt": "说出你们先走我断后的十年后 我成为了传说 主视觉",
    "premiereDateBeijing": "2026-07-03",
    "scheduleWeekday": "Fri",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "saikyo-degare",
    "episodeCount": 12,
    "titleZh": "最强出涸皇子的暗跃帝位争夺",
    "titleJa": "最強出涸らし皇子の暗躍帝位争い",
    "coverUrl": "/covers/yuc/saikyo-degare.webp",
    "coverAlt": "最强出涸皇子的暗跃帝位争夺 主视觉",
    "premiereDateBeijing": "2026-07-06",
    "scheduleWeekday": "Mon",
    "beijingTime": "20:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "buchigire-reijo",
    "episodeCount": 12,
    "titleZh": "暴怒千金誓要复仇",
    "titleJa": "ブチ切れ令嬢は報復を誓いました。",
    "coverUrl": "/covers/yuc/buchigire-reijo.webp",
    "coverAlt": "暴怒千金誓要复仇 主视觉",
    "premiereDateBeijing": "2026-07-06",
    "scheduleWeekday": "Mon",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "futsutsuka-akujo",
    "episodeCount": 11,
    "titleZh": "虽然我是不完美恶女",
    "titleJa": "ふつつかな悪女ではございますが～雛宮蝶鼠とりかえ伝～",
    "coverUrl": "/covers/yuc/futsutsuka-akujo.webp",
    "coverAlt": "虽然我是不完美恶女 主视觉",
    "premiereDateBeijing": "2026-07-12",
    "scheduleWeekday": "Sun",
    "beijingTime": "22:45",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "all-works-maid",
    "episodeCount": 12,
    "titleZh": "女主角？圣女？ 不，我是杂役女仆（自豪）！",
    "titleJa": "ヒロイン？聖女？いいえ、オールワークスメイドです（誇）！",
    "coverUrl": "/covers/yuc/all-works-maid.webp",
    "coverAlt": "女主角？圣女？ 不，我是杂役女仆（自豪）！ 主视觉",
    "premiereDateBeijing": "2026-06-24",
    "scheduleWeekday": "Wed",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "suterare-seijo-camp",
    "episodeCount": 12,
    "titleZh": "被遗弃圣女的异世界美食之旅",
    "titleJa": "捨てられ聖女の異世界ごはん旅 隠れスキルでキャンピングカーを召喚しました",
    "coverUrl": "/covers/yuc/suterare-seijo-camp.webp",
    "coverAlt": "被遗弃圣女的异世界美食之旅 主视觉",
    "premiereDateBeijing": "2026-07-06",
    "scheduleWeekday": "Mon",
    "beijingTime": "22:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "unaware-saint",
    "episodeCount": 12,
    "titleZh": "无自觉圣女今天也无意识地释放力量",
    "titleJa": "無自覚聖女は今日も無意識に力を垂れ流す",
    "coverUrl": "/covers/yuc/unaware-saint.webp",
    "coverAlt": "无自觉圣女今天也无意识地释放力量 主视觉",
    "premiereDateBeijing": "2026-06-30",
    "scheduleWeekday": "Tue",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "oni-no-hanayome",
    "episodeCount": 12,
    "titleZh": "鬼的新娘",
    "titleJa": "鬼の花嫁",
    "coverUrl": "/covers/yuc/oni-no-hanayome.webp",
    "coverAlt": "鬼的新娘 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "25:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "neko-to-ryu",
    "episodeCount": 12,
    "titleZh": "猫与龙",
    "titleJa": "猫と竜",
    "coverUrl": "/covers/yuc/neko-to-ryu.webp",
    "coverAlt": "猫与龙 主视觉",
    "premiereDateBeijing": "2026-06-27",
    "scheduleWeekday": "Sat",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "victoria",
    "episodeCount": 9,
    "titleZh": "底牌很多的维多利亚",
    "titleJa": "手札が多めのビクトリア",
    "coverUrl": "/covers/yuc/victoria.webp",
    "coverAlt": "底牌很多的维多利亚 主视觉",
    "premiereDateBeijing": "2026-07-07",
    "scheduleWeekday": "Tue",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "saijo-no-osewa",
    "episodeCount": 12,
    "titleZh": "才女的侍从",
    "titleJa": "才女のお世話 高嶺の花だらけな名門校で、学院一のお嬢様 （生活能力皆無）を陰ながらお世話することになりました",
    "coverUrl": "/covers/yuc/saijo-no-osewa.webp",
    "coverAlt": "才女的侍从 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "27:08",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "tenko-saki-osananajimi",
    "episodeCount": 12,
    "titleZh": "转学后班上的清纯可爱美少女 竟是小时候玩在一起的哥们",
    "titleJa": "転校先の清楚可憐な美少女が、 昔男子と思って一緒に遊んだ幼馴染だった件",
    "coverUrl": "/covers/yuc/tenko-saki-osananajimi.webp",
    "coverAlt": "转学后班上的清纯可爱美少女 竟是小时候玩在一起的哥们 主视觉",
    "premiereDateBeijing": "2026-07-06",
    "scheduleWeekday": "Mon",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "transparent-night",
    "episodeCount": 12,
    "titleZh": "与奔跑在透明之夜的你 谈一场看不见的恋爱",
    "titleJa": "透明な夜に駆ける君と、目に見えない恋をした。",
    "coverUrl": "/covers/yuc/transparent-night.webp",
    "coverAlt": "与奔跑在透明之夜的你 谈一场看不见的恋爱 主视觉",
    "premiereDateBeijing": "2026-07-06",
    "scheduleWeekday": "Mon",
    "beijingTime": "20:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  },
  {
    "id": "20th-century-electric-catalog",
    "episodeCount": 13,
    "titleZh": "二十世纪电气目录",
    "titleJa": "二十世紀電氣目録 -ユーレカ・エヴリカ-",
    "coverUrl": "/covers/yuc/20th-century-electric-catalog.webp",
    "coverAlt": "二十世纪电气目录 主视觉",
    "premiereDateBeijing": "2026-07-05",
    "scheduleWeekday": "Sun",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202607/"
  }
];

function normalizeTitle(value) {
  return value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

const julyAniListByTitle = new Map();
for (const record of summer2026.anime) {
  const title = normalizeTitle(record.titleZh);
  julyAniListByTitle.set(title, julyAniListByTitle.has(title) ? null : record);
}

const yucUnconfirmedEpisodeCountIds = new Set(["100-girlfriends-3", "hellmode-2"]);
const verifiedSyoboiSchedules = new Map(syoboiHistory2026.entries.map((entry) => [entry.recordId, entry]));

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

function withYucSources(record) {
  return applyYucSources(
    record,
    julyAniListByTitle.get(normalizeTitle(record.titleJa)),
    !yucUnconfirmedEpisodeCountIds.has(record.id),
  );
}

function weekdayForDate(isoDate) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
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

function buildYucSeasonCatalog(entries, withSources) {
  return entries.map((entry) => {
    const record = withSources(entry);
    const schedule = verifiedSyoboiSchedules.get(record.id);
    if (record.premiereKind === "network") return record;
    if (record.premiereDateBeijing && record.scheduleWeekday && record.beijingTime) {
      return withVerifiedYucPremiereTime(record, schedule);
    }
    if (!schedule?.episodeSchedules?.length) return record;
    return applyVerifiedSyoboiSchedule(record, schedule);
  });
}

export const anime = buildYucSeasonCatalog(yucAnime, withYucSources);

export const octoberSeason = {
  "label": "2026 年 10 月番",
  "timeZoneLabel": "北京时间（UTC+8）",
  "updatedAt": "2026-09-30",
  "catalogCount": 69,
  "sourceName": "YUC 2026年10月新番表",
  "sourceUrl": "https://yuc.wiki/202610/"
};

const octoberYucAnime = [
  {
    "id": "vertex-force",
    "episodeCount": 12,
    "titleZh": "顶点武装",
    "titleJa": "VERTEX FORCE",
    "coverUrl": "/covers/yuc/vertex-force.webp",
    "coverAlt": "顶点武装 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "22:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "dandivine",
    "episodeCount": 12,
    "titleZh": "兽王武神丹帝拜恩",
    "titleJa": "獣王武神ダンデヴァイン",
    "coverUrl": "/covers/yuc/dandivine.webp",
    "coverAlt": "兽王武神丹帝拜恩 主视觉",
    "premiereDateBeijing": "2026-10-07",
    "scheduleWeekday": "Wed",
    "beijingTime": "23:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "dark-machine",
    "episodeCount": 12,
    "titleZh": "黑暗机器",
    "titleJa": "DARK MACHINE",
    "coverUrl": "/covers/yuc/dark-machine.webp",
    "coverAlt": "黑暗机器 主视觉",
    "premiereDateBeijing": "2026-10-13",
    "scheduleWeekday": "Tue",
    "beijingTime": "24:45",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tetsuryou",
    "episodeCount": 12,
    "titleZh": "铁旅 邂逅铁道少女",
    "titleJa": "てつりょー！meet with 鉄道むすめ",
    "coverUrl": "/covers/yuc/tetsuryou.webp",
    "coverAlt": "铁旅 邂逅铁道少女 主视觉",
    "premiereDateBeijing": "2026-10-08",
    "scheduleWeekday": "Thu",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "lulutto-lilly-2",
    "episodeCount": 12,
    "titleZh": "魔法姐妹露露与莉莉 Part.2",
    "titleJa": "魔法の姉妹ルルットリリィ 第2クール",
    "coverUrl": "/covers/yuc/lulutto-lilly-2.webp",
    "coverAlt": "魔法姐妹露露与莉莉 Part.2 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "battle-spirits-re",
    "episodeCount": 12,
    "titleZh": "战斗之魂 [Re] 绝界之空",
    "titleJa": "Battle Spirits [Re] 絶界の空",
    "coverUrl": "/covers/yuc/battle-spirits-re.webp",
    "coverAlt": "战斗之魂 [Re] 绝界之空 主视觉",
    "premiereDateBeijing": "2026-10-06",
    "scheduleWeekday": "Tue",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "aoki-denshou",
    "episodeCount": 12,
    "titleZh": "苍蓝传承",
    "titleJa": "蒼き伝承 ウェルシュ＆シェダー",
    "coverUrl": "/covers/yuc/aoki-denshou.webp",
    "coverAlt": "苍蓝传承 主视觉",
    "premiereDateBeijing": "2026-10-02",
    "scheduleWeekday": "Fri",
    "beijingTime": "20:25",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "shin-keroro",
    "episodeCount": 12,
    "titleZh": "新 Keroro军曹",
    "titleJa": "ケロロ軍曹☆",
    "coverUrl": "/covers/yuc/shin-keroro.webp",
    "coverAlt": "新 Keroro军曹 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "08:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "rayearth-2026",
    "episodeCount": 12,
    "titleZh": "新 魔法骑士Rayearth",
    "titleJa": "魔法騎士レイアース",
    "coverUrl": "/covers/yuc/rayearth-2026.webp",
    "coverAlt": "新 魔法骑士Rayearth 主视觉",
    "premiereDateBeijing": "2026-10-07",
    "scheduleWeekday": "Wed",
    "beijingTime": "22:45",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "ranma-3",
    "episodeCount": 12,
    "titleZh": "新 乱马1/2 第3期",
    "titleJa": "らんま1/2 第3期",
    "coverUrl": "/covers/yuc/ranma-3.webp",
    "coverAlt": "新 乱马1/2 第3期 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "23:55",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "dragon-ball-super-beerus",
    "episodeCount": 12,
    "titleZh": "龙珠超 比鲁斯",
    "titleJa": "ドラゴンボール超 ビルス",
    "coverUrl": "/covers/yuc/dragon-ball-super-beerus.webp",
    "coverAlt": "龙珠超 比鲁斯 主视觉",
    "premiereDateBeijing": "2026-10-11",
    "scheduleWeekday": "Sun",
    "beijingTime": "22:15",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "jojo-sbr-2nd-3rd",
    "episodeCount": 11,
    "titleZh": "JOJO奇妙冒险 飙马野郎 2nd&3rd STAGE",
    "titleJa": "スティール・ボール・ラン ジョジョの奇妙な冒険",
    "coverUrl": "/covers/yuc/jojo-sbr-2nd-3rd.webp",
    "coverAlt": "JOJO奇妙冒险 飙马野郎 2nd&3rd STAGE 主视觉",
    "premiereDateBeijing": "2026-09-25",
    "premiereKind": "network",
    "scheduleWeekday": null,
    "beijingTime": null,
    "station": "网络放送",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tenipuri-u17-kesshou",
    "episodeCount": 12,
    "titleZh": "新 网球王子 U-17世界杯决赛成员决定战",
    "titleJa": "新テニスの王子様 U-17 WORLD CUP 決勝メンバー決定戦",
    "coverUrl": "/covers/yuc/tenipuri-u17-kesshou.webp",
    "coverAlt": "新 网球王子 U-17世界杯决赛成员决定战 主视觉",
    "premiereDateBeijing": "2026-09-30",
    "scheduleWeekday": "Wed",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "diamond-ace-act2-2",
    "episodeCount": 12,
    "titleZh": "钻石王牌 第4期 Part.2 (actⅡ 第2期 Part.2)",
    "titleJa": "ダイヤのA actⅡ-SECOND SEASON- 第2クール",
    "coverUrl": "/covers/yuc/diamond-ace-act2-2.webp",
    "coverAlt": "钻石王牌 第4期 Part.2 (actⅡ 第2期 Part.2) 主视觉",
    "premiereDateBeijing": "2026-10-11",
    "scheduleWeekday": "Sun",
    "beijingTime": "16:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "aoashi-2",
    "episodeCount": 12,
    "titleZh": "青之芦苇 第2期",
    "titleJa": "アオアシ Season2",
    "coverUrl": "/covers/yuc/aoashi-2.webp",
    "coverAlt": "青之芦苇 第2期 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "16:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "ao-no-hako-2",
    "episodeCount": 12,
    "titleZh": "青春之箱 第2期",
    "titleJa": "アオのハコ Season2",
    "coverUrl": "/covers/yuc/ao-no-hako-2.webp",
    "coverAlt": "青春之箱 第2期 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "15:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tokyo-revengers-4",
    "episodeCount": 12,
    "titleZh": "东京复仇者 第4期 三天战争篇",
    "titleJa": "東京リベンジャーズ 三天戦争編",
    "coverUrl": "/covers/yuc/tokyo-revengers-4.webp",
    "coverAlt": "东京复仇者 第4期 三天战争篇 主视觉",
    "premiereDateBeijing": "2026-10-02",
    "scheduleWeekday": "Fri",
    "beijingTime": "24:23",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tougen-anki-2",
    "episodeCount": 12,
    "titleZh": "桃源暗鬼 第2期",
    "titleJa": "桃源暗鬼～日光・華厳の滝編～",
    "coverUrl": "/covers/yuc/tougen-anki-2.webp",
    "coverAlt": "桃源暗鬼 第2期 主视觉",
    "premiereDateBeijing": "2026-10-02",
    "scheduleWeekday": "Fri",
    "beijingTime": "23:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "black-clover-2",
    "episodeCount": 12,
    "titleZh": "黑色五叶草 第2期",
    "titleJa": "ブラッククローバー 2nd Season",
    "coverUrl": "/covers/yuc/black-clover-2.webp",
    "coverAlt": "黑色五叶草 第2期 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "kikansha-2",
    "episodeCount": 12,
    "titleZh": "归还者的魔法要特别 第2期",
    "titleJa": "帰還者の魔法は特別です 第2期",
    "coverUrl": "/covers/yuc/kikansha-2.webp",
    "coverAlt": "归还者的魔法要特别 第2期 主视觉",
    "premiereDateBeijing": "2026-10-07",
    "scheduleWeekday": "Wed",
    "beijingTime": "23:45",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "hotel-inhumans-2",
    "episodeCount": 12,
    "titleZh": "杀手旅店 第2期",
    "titleJa": "HOTEL INHUMANS 第2期",
    "coverUrl": "/covers/yuc/hotel-inhumans-2.webp",
    "coverAlt": "杀手旅店 第2期 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "22:45",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "yozakura-2-part-2",
    "episodeCount": 12,
    "titleZh": "夜樱家的大作战 第2期 Part.2",
    "titleJa": "夜桜さんちの大作戦 第2期 第2クール",
    "coverUrl": "/covers/yuc/yozakura-2-part-2.webp",
    "coverAlt": "夜樱家的大作战 第2期 Part.2 主视觉",
    "premiereDateBeijing": "2026-10-11",
    "scheduleWeekday": "Sun",
    "beijingTime": "16:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "koori-no-jouheki-2",
    "episodeCount": 12,
    "titleZh": "冰之城墙 第2期",
    "titleJa": "氷の城壁 第2期",
    "coverUrl": "/covers/yuc/koori-no-jouheki-2.webp",
    "coverAlt": "冰之城墙 第2期 主视觉",
    "premiereDateBeijing": "2026-10-01",
    "scheduleWeekday": "Thu",
    "beijingTime": "22:56",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "fx-senshi-kurumi",
    "episodeCount": 12,
    "titleZh": "FX战士久留美",
    "titleJa": "FX戦士くるみちゃん",
    "coverUrl": "/covers/yuc/fx-senshi-kurumi.webp",
    "coverAlt": "FX战士久留美 主视觉",
    "premiereDateBeijing": "2026-10-01",
    "scheduleWeekday": "Thu",
    "beijingTime": "20:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "ojisan-kawaii",
    "episodeCount": 12,
    "titleZh": "大叔喜欢可爱小玩意",
    "titleJa": "おじさんはカワイイものがお好き。",
    "coverUrl": "/covers/yuc/ojisan-kawaii.webp",
    "coverAlt": "大叔喜欢可爱小玩意 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "shuiro-no-kamen",
    "episodeCount": 12,
    "titleZh": "朱色假面",
    "titleJa": "朱色の仮面",
    "coverUrl": "/covers/yuc/shuiro-no-kamen.webp",
    "coverAlt": "朱色假面 主视觉",
    "premiereDateBeijing": "2026-10-10",
    "scheduleWeekday": "Sat",
    "beijingTime": "16:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "psyren",
    "episodeCount": 12,
    "titleZh": "PSYREN 决战游戏",
    "titleJa": "PSYREN -サイレン-",
    "coverUrl": "/covers/yuc/psyren.webp",
    "coverAlt": "PSYREN 决战游戏 主视觉",
    "premiereDateBeijing": "2026-10-05",
    "scheduleWeekday": "Mon",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "choujun",
    "episodeCount": 12,
    "titleZh": "超巡 超条前辈",
    "titleJa": "超巡！超条先輩",
    "coverUrl": "/covers/yuc/choujun.webp",
    "coverAlt": "超巡 超条前辈 主视觉",
    "premiereDateBeijing": "2026-10-06",
    "scheduleWeekday": "Tue",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "zombie-sagashitemasu",
    "episodeCount": 12,
    "titleZh": "僵尸搜寻中",
    "titleJa": "#ゾンビさがしてます",
    "coverUrl": "/covers/yuc/zombie-sagashitemasu.webp",
    "coverAlt": "僵尸搜寻中 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tank-chair",
    "episodeCount": 12,
    "titleZh": "战车椅子",
    "titleJa": "TANK CHAIR-戦車椅子-",
    "coverUrl": "/covers/yuc/tank-chair.webp",
    "coverAlt": "战车椅子 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "22:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "fool-night",
    "episodeCount": 12,
    "titleZh": "愚者之夜",
    "titleJa": "フールナイト",
    "coverUrl": "/covers/yuc/fool-night.webp",
    "coverAlt": "愚者之夜 主视觉",
    "premiereDateBeijing": "2026-11-26",
    "premiereKind": "network",
    "scheduleWeekday": null,
    "beijingTime": null,
    "station": "网络放送",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "temppal",
    "episodeCount": 12,
    "titleZh": "装备我最强",
    "titleJa": "テムパル～アイテムの力～",
    "coverUrl": "/covers/yuc/temppal.webp",
    "coverAlt": "装备我最强 主视觉",
    "premiereDateBeijing": "2026-10-02",
    "scheduleWeekday": "Fri",
    "beijingTime": "22:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "ribo-barai",
    "episodeCount": 12,
    "titleZh": "借出去的魔力 要用【分期还款】强制收回",
    "titleJa": "貸した魔力は【リボ払い】で強制徴収",
    "coverUrl": "/covers/yuc/ribo-barai.webp",
    "coverAlt": "借出去的魔力 要用【分期还款】强制收回 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "24:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tensei-goblin",
    "episodeCount": 12,
    "titleZh": "转生成哥布林有什么问题吗",
    "titleJa": "転生ゴブリンだけど質問ある？",
    "coverUrl": "/covers/yuc/tensei-goblin.webp",
    "coverAlt": "转生成哥布林有什么问题吗 主视觉",
    "premiereDateBeijing": "2026-10-05",
    "scheduleWeekday": "Mon",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "marronnier-7",
    "episodeCount": 12,
    "titleZh": "七叶树王国的七名骑士",
    "titleJa": "マロニエ王国の七人の騎士",
    "coverUrl": "/covers/yuc/marronnier-7.webp",
    "coverAlt": "七叶树王国的七名骑士 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "17:25",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "hotaru-no-yomeiri",
    "episodeCount": 12,
    "titleZh": "萤火虫的出嫁",
    "titleJa": "ホタルの嫁入り",
    "coverUrl": "/covers/yuc/hotaru-no-yomeiri.webp",
    "coverAlt": "萤火虫的出嫁 主视觉",
    "premiereDateBeijing": "2026-10-09",
    "scheduleWeekday": "Fri",
    "beijingTime": "22:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "kanata-kara",
    "episodeCount": 12,
    "titleZh": "来自远方",
    "titleJa": "彼方から",
    "coverUrl": "/covers/yuc/kanata-kara.webp",
    "coverAlt": "来自远方 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "seitokai-ana",
    "episodeCount": 12,
    "titleZh": "脑洞学生会",
    "titleJa": "生徒会にも穴はある！",
    "coverUrl": "/covers/yuc/seitokai-ana.webp",
    "coverAlt": "脑洞学生会 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "23:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "kanojo-no-tomodachi",
    "episodeCount": 12,
    "titleZh": "女友的朋友",
    "titleJa": "彼女の友達",
    "coverUrl": "/covers/yuc/kanojo-no-tomodachi.webp",
    "coverAlt": "女友的朋友 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "24:05",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "yukionna-noroi",
    "episodeCount": 12,
    "titleZh": "不擅交际的未亡人雪女与诅咒戒指",
    "titleJa": "人付き合いが苦手な未亡人の雪女さんと呪いの指輪",
    "coverUrl": "/covers/yuc/yukionna-noroi.webp",
    "coverAlt": "不擅交际的未亡人雪女与诅咒戒指 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": null,
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "dark-summoner",
    "episodeCount": 12,
    "titleZh": "黑暗召唤师在地下恋爱中",
    "titleJa": "ダークサモナーとデキている",
    "coverUrl": "/covers/yuc/dark-summoner.webp",
    "coverAlt": "黑暗召唤师在地下恋爱中 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "24:20",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "toaru-anbu-item",
    "episodeCount": 12,
    "titleZh": "某暗部的少女共栖",
    "titleJa": "とある暗部の少女共棲",
    "coverUrl": "/covers/yuc/toaru-anbu-item.webp",
    "coverAlt": "某暗部的少女共栖 主视觉",
    "premiereDateBeijing": "2026-10-09",
    "scheduleWeekday": "Fri",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "mahou-ikusei-restart",
    "episodeCount": 12,
    "titleZh": "魔法少女育成计画restart",
    "titleJa": "魔法少女育成計画restart",
    "coverUrl": "/covers/yuc/mahou-ikusei-restart.webp",
    "coverAlt": "魔法少女育成计画restart 主视觉",
    "premiereDateBeijing": "2026-10-05",
    "scheduleWeekday": "Mon",
    "beijingTime": "25:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "kusuriya-3",
    "episodeCount": 12,
    "titleZh": "药屋少女的呢喃 第3期",
    "titleJa": "薬屋のひとりごと 第3期",
    "coverUrl": "/covers/yuc/kusuriya-3.webp",
    "coverAlt": "药屋少女的呢喃 第3期 主视觉",
    "premiereDateBeijing": "2026-10-02",
    "scheduleWeekday": "Fri",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "yasei-lastboss-2",
    "episodeCount": 12,
    "titleZh": "野生的最终BOSS出现了 第2期",
    "titleJa": "野生のラスボスが現れた！第2期",
    "coverUrl": "/covers/yuc/yasei-lastboss-2.webp",
    "coverAlt": "野生的最终BOSS出现了 第2期 主视觉",
    "premiereDateBeijing": "2026-09-26",
    "scheduleWeekday": "Sat",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tensei-ken-2",
    "episodeCount": 12,
    "titleZh": "转生成为魔剑 第2期",
    "titleJa": "転生したら剣でしたⅡ",
    "coverUrl": "/covers/yuc/tensei-ken-2.webp",
    "coverAlt": "转生成为魔剑 第2期 主视觉",
    "premiereDateBeijing": "2026-10-07",
    "scheduleWeekday": "Wed",
    "beijingTime": "23:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "hyouken-2",
    "episodeCount": 12,
    "titleZh": "冰剑的魔术师将要统一世界 第2期",
    "titleJa": "冰剣の魔術師が世界を統べるⅡ",
    "coverUrl": "/covers/yuc/hyouken-2.webp",
    "coverAlt": "冰剑的魔术师将要统一世界 第2期 主视觉",
    "premiereDateBeijing": "2026-10-08",
    "scheduleWeekday": "Thu",
    "beijingTime": "24:28",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "kantei-skill-3",
    "episodeCount": 12,
    "titleZh": "转生贵族靠着鉴定技能 一飞冲天 第3期",
    "titleJa": "転生貴族、鑑定スキルで成り上がる 第3期",
    "coverUrl": "/covers/yuc/kantei-skill-3.webp",
    "coverAlt": "转生贵族靠着鉴定技能 一飞冲天 第3期 主视觉",
    "premiereDateBeijing": "2026-09-27",
    "scheduleWeekday": "Sun",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "sasaki-pii-2",
    "episodeCount": 12,
    "titleZh": "佐佐木与文鸟小哔 第2期",
    "titleJa": "佐々木とピーちゃん Season2",
    "coverUrl": "/covers/yuc/sasaki-pii-2.webp",
    "coverAlt": "佐佐木与文鸟小哔 第2期 主视觉",
    "premiereDateBeijing": "2026-10-07",
    "scheduleWeekday": "Wed",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tantei-wa-mou-2",
    "episodeCount": 12,
    "titleZh": "侦探已死 第2期",
    "titleJa": "探偵はもう、死んでいる。 Season2",
    "coverUrl": "/covers/yuc/tantei-wa-mou-2.webp",
    "coverAlt": "侦探已死 第2期 主视觉",
    "premiereDateBeijing": "2026-10-07",
    "scheduleWeekday": "Wed",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "chitose-kun-2",
    "episodeCount": 12,
    "titleZh": "弹珠汽水瓶里的千岁同学 Part.2",
    "titleJa": "千歳くんはラムネ瓶のなか 第2クール",
    "coverUrl": "/covers/yuc/chitose-kun-2.webp",
    "coverAlt": "弹珠汽水瓶里的千岁同学 Part.2 主视觉",
    "premiereDateBeijing": "2026-10-13",
    "scheduleWeekday": "Tue",
    "beijingTime": "22:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "shiotaiou-satou",
    "episodeCount": 12,
    "titleZh": "冷淡的佐藤同学只对我撒娇",
    "titleJa": "塩対応の佐藤さんが俺にだけ甘い",
    "coverUrl": "/covers/yuc/shiotaiou-satou.webp",
    "coverAlt": "冷淡的佐藤同学只对我撒娇 主视觉",
    "premiereDateBeijing": "2026-10-06",
    "scheduleWeekday": "Tue",
    "beijingTime": "21:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "horegusuri-majo",
    "episodeCount": 12,
    "titleZh": "你好 我是受心上人所托 来做恋爱药的魔女",
    "titleJa": "どうも、好きな人に惚れ薬を依頼された魔女です。",
    "coverUrl": "/covers/yuc/horegusuri-majo.webp",
    "coverAlt": "你好 我是受心上人所托 来做恋爱药的魔女 主视觉",
    "premiereDateBeijing": "2026-10-05",
    "scheduleWeekday": "Mon",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "yowaki-max-reijou",
    "episodeCount": 12,
    "titleZh": "弱气MAX的大小姐居然 接受了铁腕未婚夫的赌约",
    "titleJa": "弱気MAX令嬢なのに、辣腕婚約者様の賭けに乗ってしまった",
    "coverUrl": "/covers/yuc/yowaki-max-reijou.webp",
    "coverAlt": "弱气MAX的大小姐居然 接受了铁腕未婚夫的赌约 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "romeria-senki",
    "episodeCount": 12,
    "titleZh": "罗梅莉亚战记",
    "titleJa": "ロメリア戦記",
    "coverUrl": "/covers/yuc/romeria-senki.webp",
    "coverAlt": "罗梅莉亚战记 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "20:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "sekai-saikyou-majo",
    "episodeCount": 12,
    "titleZh": "开始成为世界最强的魔女",
    "titleJa": "世界最強の魔女、始めました",
    "coverUrl": "/covers/yuc/sekai-saikyou-majo.webp",
    "coverAlt": "开始成为世界最强的魔女 主视觉",
    "premiereDateBeijing": "2026-10-07",
    "scheduleWeekday": "Wed",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "nia-liston",
    "episodeCount": 12,
    "titleZh": "乱世千金 倪亚‧利斯顿 转生为娇弱千金的弑神武人华丽无双录",
    "titleJa": "凶乱令嬢ニア・リストン 病弱令嬢に転生した神殺しの武人の華麗なる無双録",
    "coverUrl": "/covers/yuc/nia-liston.webp",
    "coverAlt": "乱世千金 倪亚‧利斯顿 转生为娇弱千金的弑神武人华丽无双录 主视觉",
    "premiereDateBeijing": "2026-10-06",
    "scheduleWeekday": "Tue",
    "beijingTime": "20:25",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tensei-daiseijo",
    "episodeCount": 12,
    "titleZh": "转生了的大圣女 拼死隐瞒自己身为圣女",
    "titleJa": "転生した大聖女は、聖女であることをひた隠す",
    "coverUrl": "/covers/yuc/tensei-daiseijo.webp",
    "coverAlt": "转生了的大圣女 拼死隐瞒自己身为圣女 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "shinja-zero-megami",
    "episodeCount": 12,
    "titleZh": "和没有信徒的女神大人 一起攻略异世界",
    "titleJa": "信者ゼロの女神サマと始める異世界攻略",
    "coverUrl": "/covers/yuc/shinja-zero-megami.webp",
    "coverAlt": "和没有信徒的女神大人 一起攻略异世界 主视觉",
    "premiereDateBeijing": "2026-10-11",
    "scheduleWeekday": "Sun",
    "beijingTime": "22:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "magical-explorer",
    "episodeCount": 12,
    "titleZh": "魔法★探险家 转生为成人游戏万年男二又怎样 我要活用游戏知识自由生活",
    "titleJa": "マジカル★エクスプローラー エロゲの友人キャラに転生したけど、 ゲーム知識使って自由に生きる",
    "coverUrl": "/covers/yuc/magical-explorer.webp",
    "coverAlt": "魔法★探险家 转生为成人游戏万年男二又怎样 我要活用游戏知识自由生活 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "mezametara-saikyou",
    "episodeCount": 12,
    "titleZh": "一觉醒来坐拥神装和飞船 我决定以买一套独门独户的房子为目标作为佣兵自由地活下去",
    "titleJa": "目覚めたら最強装備と宇宙船持ちだったので、 一戸建て目指して傭兵として自由に生きたい",
    "coverUrl": "/covers/yuc/mezametara-saikyou.webp",
    "coverAlt": "一觉醒来坐拥神装和飞船 我决定以买一套独门独户的房子为目标作为佣兵自由地活下去 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "20:30",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "cheat-fuyo-majutsushi",
    "episodeCount": 12,
    "titleZh": "被流放的超能附魔师 讴歌随心所欲的第二人生",
    "titleJa": "追放されたチート付与魔術師は気ままなセカンドライフを謳歌する。",
    "coverUrl": "/covers/yuc/cheat-fuyo-majutsushi.webp",
    "coverAlt": "被流放的超能附魔师 讴歌随心所欲的第二人生 主视觉",
    "premiereDateBeijing": "2026-10-06",
    "scheduleWeekday": "Tue",
    "beijingTime": "23:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "demons-crest",
    "episodeCount": 12,
    "titleZh": "恶魔纹章",
    "titleJa": "デモンズ・クレスト",
    "coverUrl": "/covers/yuc/demons-crest.webp",
    "coverAlt": "恶魔纹章 主视觉",
    "premiereDateBeijing": "2026-11-06",
    "premiereKind": "network",
    "scheduleWeekday": null,
    "beijingTime": null,
    "station": "网络放送",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "kyoufu-collector",
    "episodeCount": 12,
    "titleZh": "恐怖收集者",
    "titleJa": "恐怖コレクター",
    "coverUrl": "/covers/yuc/kyoufu-collector.webp",
    "coverAlt": "恐怖收集者 主视觉",
    "premiereDateBeijing": "2026-10-10",
    "scheduleWeekday": "Sat",
    "beijingTime": "22:45",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "cyberpunk-edgerunners-2",
    "episodeCount": 10,
    "titleZh": "赛博朋克 边缘行者2",
    "titleJa": "Cyberpunk：Edgerunners 2",
    "coverUrl": "/covers/yuc/cyberpunk-edgerunners-2.webp",
    "coverAlt": "赛博朋克 边缘行者2 主视觉",
    "premiereDateBeijing": "2026-10-20",
    "premiereKind": "network",
    "scheduleWeekday": null,
    "beijingTime": null,
    "station": "网络放送",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "gensou-suikoden",
    "episodeCount": 12,
    "titleZh": "幻想水浒传",
    "titleJa": "幻想水滸伝",
    "coverUrl": "/covers/yuc/gensou-suikoden.webp",
    "coverAlt": "幻想水浒传 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "21:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "shirotan",
    "episodeCount": 12,
    "titleZh": "海豹小白",
    "titleJa": "しろたん",
    "coverUrl": "/covers/yuc/shirotan.webp",
    "coverAlt": "海豹小白 主视觉",
    "premiereDateBeijing": "2026-10-03",
    "scheduleWeekday": "Sat",
    "beijingTime": "15:29",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "tanuki-to-kitsune",
    "episodeCount": 12,
    "titleZh": "小狸猫与小狐狸",
    "titleJa": "タヌキとキツネ",
    "coverUrl": "/covers/yuc/tanuki-to-kitsune.webp",
    "coverAlt": "小狸猫与小狐狸 主视觉",
    "premiereDateBeijing": "2026-10-04",
    "scheduleWeekday": "Sun",
    "beijingTime": "06:00",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  },
  {
    "id": "pan-dorobou",
    "episodeCount": 12,
    "titleZh": "神秘面包小子",
    "titleJa": "パンどろぼう",
    "coverUrl": "/covers/yuc/pan-dorobou.webp",
    "coverAlt": "神秘面包小子 主视觉",
    "premiereDateBeijing": "2026-10-02",
    "scheduleWeekday": "Fri",
    "beijingTime": "17:40",
    "station": "YUC 周表",
    "sourceUrl": "https://yuc.wiki/202610/"
  }
];

const octoberAniListByTitle = new Map();
for (const record of fall2026.anime) {
  const title = normalizeTitle(record.titleZh);
  octoberAniListByTitle.set(title, octoberAniListByTitle.has(title) ? null : record);
}
const octoberAniListById = new Map(
  fall2026.anime.map((record) => [Number(record.id.slice("anilist-".length)), record]),
);

// YUC 日文标题与 AniList 条目不同时的显式对照（2026 年 10 月番）。
const octoberAniListIdOverrides = new Map([
  ["vertex-force", 209562],
  ["dark-machine", 179876],
  ["rayearth-2026", 178868],
  ["ranma-3", 209872],
  ["jojo-sbr-2nd-3rd", 210482],
  ["aoashi-2", 191788],
  ["black-clover-2", 195604],
  ["hotel-inhumans-2", 199426],
  ["tensei-ken-2", 159042],
  ["sasaki-pii-2", 176314],
  ["chitose-kun-2", 198727],
  ["romeria-senki", 180894],
  ["nia-liston", 206949],
  ["cheat-fuyo-majutsushi", 207329],
  ["cyberpunk-edgerunners-2", 195539],
]);

// YUC 页面标注了总集数的作品；其余作品的集数由 AniList 补充。
const octoberYucEpisodeCountIds = new Set(["jojo-sbr-2nd-3rd", "cyberpunk-edgerunners-2"]);

function withOctoberYucSources(record) {
  const overrideId = octoberAniListIdOverrides.get(record.id);
  const aniList =
    overrideId === undefined
      ? octoberAniListByTitle.get(normalizeTitle(record.titleJa))
      : octoberAniListById.get(overrideId) ?? null;
  return applyYucSources(record, aniList, octoberYucEpisodeCountIds.has(record.id));
}

export const octoberAnime = buildYucSeasonCatalog(octoberYucAnime, withOctoberYucSources);

export const seasons = [
  {
    id: "2020-january",
    firstWeekStart: "2019-12-30",
    timelineStartHour: 5,
    ...january2020,
  },
  {
    id: "2020-april",
    firstWeekStart: "2020-03-30",
    timelineStartHour: 5,
    ...april2020,
  },
  {
    id: "2020-july",
    firstWeekStart: "2020-06-29",
    timelineStartHour: 5,
    ...july2020,
  },
  {
    id: "2020-october",
    firstWeekStart: "2020-09-28",
    timelineStartHour: 5,
    ...october2020,
  },
  {
    id: "2021-january",
    firstWeekStart: "2021-01-04",
    timelineStartHour: 5,
    ...january2021,
  },
  {
    id: "2021-april",
    firstWeekStart: "2021-03-29",
    timelineStartHour: 5,
    ...april2021,
  },
  {
    id: "2021-july",
    firstWeekStart: "2021-06-28",
    timelineStartHour: 5,
    ...july2021,
  },
  {
    id: "2021-october",
    firstWeekStart: "2021-09-27",
    timelineStartHour: 5,
    ...october2021,
  },
  {
    id: "2022-january",
    firstWeekStart: "2022-01-03",
    timelineStartHour: 5,
    ...january2022,
  },
  {
    id: "2022-april",
    firstWeekStart: "2022-03-28",
    timelineStartHour: 5,
    ...april2022,
  },
  {
    id: "2022-july",
    firstWeekStart: "2022-06-27",
    timelineStartHour: 5,
    ...july2022,
  },
  {
    id: "2022-october",
    firstWeekStart: "2022-09-26",
    timelineStartHour: 5,
    ...october2022,
  },
  {
    id: "2023-january",
    firstWeekStart: "2023-01-02",
    timelineStartHour: 5,
    ...january2023,
  },
  {
    id: "2023-april",
    firstWeekStart: "2023-03-27",
    timelineStartHour: 5,
    ...april2023,
  },
  {
    id: "2023-july",
    firstWeekStart: "2023-06-26",
    timelineStartHour: 5,
    ...july2023,
  },
  {
    id: "2023-october",
    firstWeekStart: "2023-09-25",
    timelineStartHour: 5,
    ...october2023,
  },
  {
    id: "2024-january",
    firstWeekStart: "2024-01-01",
    timelineStartHour: 5,
    ...january2024,
  },
  {
    id: "2024-april",
    firstWeekStart: "2024-04-01",
    timelineStartHour: 5,
    ...april2024,
  },
  {
    id: "2024-july",
    firstWeekStart: "2024-07-01",
    timelineStartHour: 5,
    ...july2024,
  },
  {
    id: "2024-october",
    firstWeekStart: "2024-09-30",
    timelineStartHour: 5,
    ...october2024,
  },
  {
    id: "2025-january",
    firstWeekStart: "2024-12-30",
    timelineStartHour: 5,
    ...january2025,
  },
  {
    id: "2025-april",
    firstWeekStart: "2025-03-31",
    timelineStartHour: 5,
    ...april2025,
  },
  {
    id: "2025-july",
    firstWeekStart: "2025-06-30",
    timelineStartHour: 5,
    ...july2025,
  },
  {
    id: "2025-october",
    firstWeekStart: "2025-09-29",
    timelineStartHour: 5,
    ...october2025,
  },
  {
    id: "2026-january",
    firstWeekStart: "2026-01-05",
    timelineStartHour: 5,
    ...january2026,
  },
  {
    id: "2026-april",
    firstWeekStart: "2026-03-30",
    timelineStartHour: 5,
    ...april2026,
  },
  {
    id: "2026-july",
    firstWeekStart: "2026-06-29",
    timelineStartHour: 15,
    ...season,
    anime,
  },
  {
    id: "2026-october",
    firstWeekStart: "2026-09-28",
    timelineStartHour: 5,
    ...octoberSeason,
    anime: octoberAnime,
  },
];

export const allAnime = seasons.flatMap(({ anime: records }) => records);
