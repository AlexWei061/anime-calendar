import { april2026, january2026 } from "./yuc-history-2026.js";
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
  "updatedAt": "2026-07-16",
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "premiereDateBeijing": "2026-07-09",
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "titleZh": "骸骨骑士大人异世界冒险中 第2期",
    "titleJa": "骸骨騎士様、只今異世界へお出掛け中 第2期",
    "coverUrl": "/covers/yuc/skeleton-knight-2.webp",
    "coverAlt": "骸骨骑士大人异世界冒险中 第2期 主视觉",
    "premiereDateBeijing": "2026-07-04",
    "scheduleWeekday": "Sat",
    "beijingTime": "19:30",
    "station": "YUC 周表",
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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
    "episodeCount": 12,
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

const verifiedJulySchedules = new Map(syoboiHistory2026.entries.map((entry) => [entry.recordId, entry]));

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
  if (
    !record.regularBroadcastStartDateBeijing ||
    !record.beijingTime ||
    !lastSchedule ||
    lastSchedule.episodeEnd >= record.episodeCount
  ) {
    return episodeSchedules;
  }
  const weeklySchedule = episodeSchedules.find(
    ({ broadcastDateBeijing, beijingTime, intervalDays }) =>
      broadcastDateBeijing === record.regularBroadcastStartDateBeijing &&
      beijingTime === record.beijingTime &&
      intervalDays === 7,
  );
  if (!weeklySchedule) return episodeSchedules;

  const episodeStart = lastSchedule.episodeEnd + 1;
  return [
    ...episodeSchedules,
    {
      episodeStart,
      episodeEnd: record.episodeCount,
      broadcastDateBeijing: addDays(
        record.regularBroadcastStartDateBeijing,
        (episodeStart - weeklySchedule.episodeStart) * 7,
      ),
      beijingTime: record.beijingTime,
      intervalDays: 7,
    },
  ];
}

export const anime = yucAnime.map((record) => {
  const schedule = verifiedJulySchedules.get(record.id);
  if (!schedule?.episodeSchedules?.length) return record;

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
    scheduleWeekday: weeklySchedule ? weekdayForDate(weeklySchedule.broadcastDateBeijing) : null,
    beijingTime: weeklySchedule?.beijingTime ?? firstSchedule.beijingTime,
    timeStatus: "verified",
    station: schedule.channel,
    episodeSchedules,
    scheduleSourceName: "しょぼいカレンダー",
    scheduleSourceUrl: schedule.sourceUrl,
    scheduleChannel: schedule.channel,
  };
});

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
];

export const allAnime = seasons.flatMap(({ anime: records }) => records);
