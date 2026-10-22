/** Shared player-facing names for the main and league leaderboards. */
export const RANKING_PLAYER_NAMES = [
  "青禾", "安然", "予安", "星野", "林夕", "清宁", "昭昭", "望舒", "玖玖", "迟迟",
  "见山", "初晴", "亦然", "书宁", "乔木", "远洲", "岑溪", "南乔", "以南", "知夏",
  "晚棠", "听澜", "云舒", "简白", "言川", "晴川里", "风有信", "松间月", "云上眠", "桃花渡",
  "山茶序", "半山居", "清欢渡", "落日集", "橘灯晚", "听风者", "向光行", "小岛屿", "远方客", "月见草",
  "白日梦", "南风起", "北岸灯", "山海间", "云朵朵", "微光里", "晚风集", "晴天岛", "青柠巷", "桃子汽水",
  "春日信", "夏夜星", "秋水长", "冬日暖", "一川风", "两三事", "三分甜", "四季歌", "五点半", "六号线",
  "七月信箱", "八月微风", "九月晴天", "十里春风", "有风来过", "月亮慢慢", "山高水长", "小城故事", "日落之后", "花开半夏",
  "清风入怀", "星光作伴", "晚霞有约", "云淡天高", "雨后初晴", "溪边听歌", "树下乘凉", "海盐汽水", "桂花酿酒", "梅子青时",
  "一颗松子", "两袖清风", "三餐四季", "五湖四海", "六六大顺", "七分认真", "八面来风", "九月拾光", "十里桃花", "百事可乐",
  "认真发光", "自在生长", "慢慢变好", "好事发生", "心有微光", "不负热爱", "正在路上", "保持可爱", "每天开心", "明天见呀",
  "春风知我意", "山川皆可爱", "清晨有微光", "云边有小店", "江南烟雨色", "花开向暖阳", "月色落窗前", "星河入梦来", "把日子过好", "愿岁月静好",
  "慢慢有回响", "山海自有期", "风来花自开", "一半烟火气", "心中有清欢", "人间小浪漫", "日落看晚霞", "清风绕指尖", "听雨在窗边", "远山如黛色",
  "朝朝有欢喜", "事事皆顺意", "平凡也闪光", "温柔且坚定", "自在且欢喜",
] as const;

export type RankingPlayerName = (typeof RANKING_PLAYER_NAMES)[number];

/** Languages used by the deterministic opponent-name catalog.  This lives in
 * core so leaderboard data does not depend on the renderer's localization
 * module (and can therefore also be used by the league projection). */
export const RANKING_LANGUAGES = [
  "zh-CN", "zh-TW", "en", "ja", "ko", "es", "pt", "fr", "de", "ru",
] as const;
export type RankingLanguage = (typeof RANKING_LANGUAGES)[number];

const cartesianNames = (given: readonly string[], family: readonly string[]): readonly string[] => (
  Object.freeze(family.flatMap((last) => given.map((first) => `${first} ${last}`)))
);

// Keep each locale's catalog independent.  Names are generated from short
// native name parts rather than translated versions of the Chinese catalog, so
// every opponent is displayed in the script a player expects to see.
const RANKING_PLAYER_NAMES_ZH_TW = cartesianNames(
  ["承翰", "品妤", "昱辰", "語晴", "宥安", "子晴", "冠廷", "芷若", "柏翰", "心妍",
    "睿哲", "妍希", "家豪", "詠晴", "宇軒", "若彤", "奕辰", "欣怡", "俊傑", "沛珊"],
  ["林", "陳", "王", "黃", "李", "張", "吳", "劉", "蔡", "楊", "許", "鄭", "周", "謝", "洪", "郭", "曾", "葉", "彭", "蘇"],
);
const RANKING_PLAYER_NAMES_EN = cartesianNames(
  ["Avery", "Milo", "Nova", "Ivy", "Liam", "Maya", "Evan", "Nora", "Theo", "Zoe",
    "Leo", "Aria", "Owen", "Luna", "Eli", "Cora", "Finn", "Ruby", "Noah", "June"],
  ["Stone", "Reed", "Parker", "Brooks", "Hayes", "Morris", "Quinn", "Bennett", "Carter", "Wells",
    "Morgan", "Foster", "Bishop", "Hayden", "Sutton", "Ellis", "Miller", "Rowan", "Cooper", "Taylor"],
);
const RANKING_PLAYER_NAMES_JA = cartesianNames(
  ["さくら", "ゆうき", "あおい", "はる", "ひなた", "そら", "みお", "れん", "あかり", "なお",
    "つばさ", "かえで", "まい", "りん", "あきら", "ほのか", "たくみ", "すみれ", "あお", "こはる"],
  ["山", "川", "森", "空", "花", "月", "海", "星", "風", "田", "原", "野", "本", "谷", "井", "島", "坂", "村", "岡", "沢"],
);
const RANKING_PLAYER_NAMES_KO = cartesianNames(
  ["민준", "서연", "지후", "하은", "도윤", "수빈", "예준", "지민", "현우", "유나",
    "건우", "소율", "준서", "채원", "시우", "다은", "태윤", "나연", "우진", "서준"],
  ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "전", "홍"],
);
const RANKING_PLAYER_NAMES_ES = cartesianNames(
  ["Lucía", "Mateo", "Sofía", "Leo", "Valeria", "Hugo", "Martina", "Daniel", "Alma", "Pablo",
    "Emma", "Diego", "Clara", "Álex", "Julia", "Nico", "Vega", "Gael", "Irene", "Bruno"],
  ["García", "López", "Martín", "Sánchez", "Pérez", "Díaz", "Moreno", "Muñoz", "Romero", "Alonso",
    "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Ramírez", "Flores", "Cruz", "Molina", "Suárez"],
);
const RANKING_PLAYER_NAMES_PT = cartesianNames(
  ["Alice", "Miguel", "Lara", "Theo", "Beatriz", "João", "Manuela", "Davi", "Helena", "Lucas",
    "Clara", "Rafael", "Laura", "Enzo", "Sofia", "Caio", "Luísa", "Bruno", "Marina", "Nuno"],
  ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Ferreira", "Alves", "Ribeiro", "Carvalho",
    "Gomes", "Martins", "Lopes", "Vieira", "Rocha", "Dias", "Nunes", "Mendes", "Freitas", "Barbosa"],
);
const RANKING_PLAYER_NAMES_FR = cartesianNames(
  ["Léa", "Louis", "Chloé", "Hugo", "Emma", "Jules", "Zoé", "Noah", "Alice", "Léo",
    "Inès", "Paul", "Manon", "Tom", "Louise", "Lucas", "Camille", "Arthur", "Nina", "Gabriel"],
  ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau",
    "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier"],
);
const RANKING_PLAYER_NAMES_DE = cartesianNames(
  ["Mia", "Finn", "Emilia", "Leon", "Hanna", "Paul", "Lina", "Jonas", "Clara", "Felix",
    "Ella", "Noah", "Leni", "Ben", "Anna", "Luis", "Marie", "Max", "Nele", "Theo"],
  ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann",
    "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann"],
);
const RANKING_PLAYER_NAMES_RU = cartesianNames(
  ["Анна", "Иван", "София", "Михаил", "Мария", "Алексей", "Ева", "Данил", "Полина", "Илья",
    "Алиса", "Максим", "Вера", "Лев", "Ника", "Артём", "Кира", "Роман", "Ольга", "Тимур"],
  ["Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Михайлов", "Новиков",
    "Фёдоров", "Морозов", "Волков", "Алексеев", "Лебедев", "Семёнов", "Егоров", "Павлов", "Козлов", "Степанов"],
);

export const RANKING_PLAYER_NAMES_BY_LANGUAGE: Readonly<Record<RankingLanguage, readonly string[]>> = Object.freeze({
  "zh-CN": RANKING_PLAYER_NAMES,
  "zh-TW": RANKING_PLAYER_NAMES_ZH_TW,
  en: RANKING_PLAYER_NAMES_EN,
  ja: RANKING_PLAYER_NAMES_JA,
  ko: RANKING_PLAYER_NAMES_KO,
  es: RANKING_PLAYER_NAMES_ES,
  pt: RANKING_PLAYER_NAMES_PT,
  fr: RANKING_PLAYER_NAMES_FR,
  de: RANKING_PLAYER_NAMES_DE,
  ru: RANKING_PLAYER_NAMES_RU,
});

export const rankingLanguage = (value: unknown): RankingLanguage => (
  typeof value === "string" && (RANKING_LANGUAGES as readonly string[]).includes(value)
    ? value as RankingLanguage : "zh-CN"
);

/** Stable display name for a bot slot.  The numeric suffix is only reached
 * for the large per-province catalog and keeps every identity unique without
 * changing the language's script or the bot's score/rank. */
export const localizedRankingPlayerName = (language: unknown, oneBasedIndex: number): string => {
  const names = RANKING_PLAYER_NAMES_BY_LANGUAGE[rankingLanguage(language)];
  const position = Math.max(0, Math.floor(oneBasedIndex) - 1);
  const cycle = Math.floor(position / names.length);
  const base = names[position % names.length];
  return cycle === 0 ? base : `${base} ${cycle + 1}`;
};
