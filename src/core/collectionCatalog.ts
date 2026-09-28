import { LEVELS } from "./levels";
import type { Difficulty, LevelSpec } from "./types";

/**
 * Domain data for the standalone player Collection. This catalogue is kept
 * separate from the existing mechanic guide/records screen: it describes
 * level keepsakes and original gallery works only, and owns no UI or save
 * state.
 */
export const COLLECTION_PAGE_SIZE = 9 as const;

export type CollectionCatalogCategory = "level" | "masterpiece";
export type CollectionRarity = "common" | "rare" | "epic" | "legendary";

export type LevelCollectionVisualTheme =
  | "classic"
  | "labyrinth"
  | "frost"
  | "prism"
  | "curtain"
  | "workshop"
  | "clockwork"
  | "circuit"
  | "starlight";

interface CollectionCatalogItemBase {
  readonly id: string;
  readonly category: CollectionCatalogCategory;
  /** The level that must be durably completed before this entry is owned. */
  readonly unlockLevel: number;
  readonly rarity: CollectionRarity;
  readonly titleKey: string;
  readonly descriptionKey: string;
  /** Lightweight fallback colour; it is not an image or external asset URL. */
  readonly themeColor: `#${string}`;
}

export interface LevelCollectionCard extends CollectionCatalogItemBase {
  readonly category: "level";
  readonly levelId: number;
  readonly chapter: number;
  readonly difficulty: Difficulty;
  readonly visualTheme: LevelCollectionVisualTheme;
  readonly defaultTitleZh: string;
  readonly defaultDescriptionZh: string;
}

export interface MasterpieceCollectionCard extends CollectionCatalogItemBase {
  readonly category: "masterpiece";
  readonly catalogNumber: number;
  readonly chapter: number;
  readonly visualTheme: "gallery";
  readonly inspirationCost: number;
  readonly defaultTitleZh: string;
  readonly defaultArtistZh: string;
  readonly defaultEraZh: string;
  /** All works are original in-world metadata and require no external art. */
  readonly provenance: "original";
}

export type CollectionCatalogItem = LevelCollectionCard | MasterpieceCollectionCard;

const LEVEL_THEME_COLORS: Readonly<Record<LevelCollectionVisualTheme, `#${string}`>> = {
  classic: "#58BEE8",
  labyrinth: "#72B66B",
  frost: "#79DDF4",
  prism: "#C879ED",
  curtain: "#EC8268",
  workshop: "#E49B43",
  clockwork: "#F1C84B",
  circuit: "#59C7A5",
  starlight: "#756FE8",
};

const inferLevelVisualTheme = (level: LevelSpec): LevelCollectionVisualTheme => {
  if (level.blocks.some((block) => block.star) || level.gates.some((gate) => gate.star)) return "starlight";
  if (level.generators?.some((generator) => generator.trigger === "time")) return "clockwork";
  if (level.generators?.length) return "workshop";
  if (level.blocks.some((block) => block.keyId || block.lockedBy || block.movementAxis)
    || (level.coloredGrids?.length ?? 0) > 0) return "circuit";
  if (level.shutters?.some((shutter) => shutter.skin !== "staging")) return "curtain";
  if (level.blocks.some((block) => (block.layers?.length ?? 1) > 1)) return "prism";
  if (level.blocks.some((block) => (block.frozen ?? 0) > 0)
    || level.gates.some((gate) => (gate.frozen ?? 0) > 0)) return "frost";
  if ((level.playable?.length ?? level.width * level.height) < level.width * level.height
    || (level.blocked?.length ?? 0) > 0) return "labyrinth";
  return "classic";
};

const levelRarity = (level: Pick<LevelSpec, "id" | "difficulty">): CollectionRarity => {
  if (level.id % 50 === 0) return "legendary";
  if (level.id % 10 === 0 || level.difficulty === "super") return "epic";
  if (level.difficulty === "hard") return "rare";
  return "common";
};

const paddedLevelId = (levelId: number): string => String(levelId).padStart(3, "0");

/** Builds a stable, level-id-sorted catalogue without mutating source levels. */
export const buildLevelCollectionCatalog = (
  levels: readonly LevelSpec[] = LEVELS,
): readonly LevelCollectionCard[] => {
  const seenIds = new Set<number>();
  const orderedLevels = [...levels].sort((left, right) => left.id - right.id);
  const cards = orderedLevels.map((level): LevelCollectionCard => {
    if (!Number.isSafeInteger(level.id) || level.id < 1) {
      throw new RangeError(`Collection level id must be a positive safe integer; received ${level.id}`);
    }
    if (seenIds.has(level.id)) throw new RangeError(`Duplicate Collection level id ${level.id}`);
    seenIds.add(level.id);
    const stableLevelId = paddedLevelId(level.id);
    const visualTheme = inferLevelVisualTheme(level);
    return Object.freeze({
      id: `level-${stableLevelId}`,
      category: "level",
      levelId: level.id,
      chapter: Math.floor((level.id - 1) / 10) + 1,
      unlockLevel: level.id,
      difficulty: level.difficulty,
      rarity: levelRarity(level),
      visualTheme,
      themeColor: LEVEL_THEME_COLORS[visualTheme],
      titleKey: `collectionCatalog.level.${stableLevelId}.title`,
      descriptionKey: `collectionCatalog.level.${stableLevelId}.description`,
      defaultTitleZh: `第${level.id}关 · ${level.name}`,
      defaultDescriptionZh: `完成第${level.id}关“${level.name}”后收录。`,
    });
  });
  return Object.freeze(cards);
};

/**
 * Artwork titles are independent from level metadata. The level card keeps
 * the source name for data/reporting, while the album detail shows only the
 * picture title. Add authored overrides when a supplied image needs a name
 * that differs from the level's working title.
 */
/**
 * Chinese titles authored from the matching 5×5 artwork atlas cells. These
 * names are presentation metadata only; level names remain available for
 * records and diagnostics.
 */
const LEVEL_ARTWORK_TITLES_ZH = [
  "晨曦城堡", "玫瑰拱园", "冰晶宫", "齿轮工坊", "夕照水城",
  "月下观星台", "樱花小径", "山谷吊桥", "熔火山谷", "糖果小镇",
  "云上圣城", "深海宫殿", "月影钟楼", "秋色风车谷", "彩虹方城",
  "沙漠泉城", "雨林遗迹", "雪夜雪村", "灯火水乡", "海盗港湾",
  "荧光蘑境", "云岭古寺", "珊瑚水殿", "风车麦田", "晶蓝秘洞",
  "月光城堡", "樱花山城", "森林齿轮庭院", "云上风车岛", "雷雨灯塔",
  "萤光森林", "峡谷列车", "冰瀑宫殿", "夕阳树屋", "紫夜月泉",
  "云端龙宫", "沙漠集市", "灯笼水巷", "薰衣草城堡", "熔岩要塞",
  "月下凉亭", "海岸遗城", "朱红鸟居", "向日葵温室", "林间瀑屋",
  "彩晶圣堂", "贝壳海宫", "森林守望屋", "星光吊桥", "虹彩阶梯",
  "月湾白城", "莲花圣池", "云端飞艇厂", "群瀑水庭", "灯火乐园",
  "猫头鹰书塔", "沙海绿洲", "浮岛水车", "葡萄园古堡", "紫晶传送门",
  "糖果风车村", "雷霆孤堡", "水乡古镇", "南瓜灯谷", "蓝瀑宫苑",
  "火山列车桥", "雪夜木屋", "峡谷云城", "贝壳海湾", "金蜂花房",
  "流星观测台", "绿篱喷泉园", "花瀑城堡", "鎏金海宫", "海岸石阵",
  "鲸跃浮岛", "彩瀑悬城", "红枫镜湖", "月钟穹顶", "火烈鸟花园",
  "冰晶村落", "热气球港", "翠岭飞瀑", "玻璃花宫", "深海灯塔",
  "星环观象台", "彩岩城", "萤火树屋", "水晶花园", "暮影庄园",
  "浮岛花园", "月沙古迹", "贝壳瀑门", "白金风琴堂", "灯舟水巷",
  "恐龙海岛", "极夜晶堂", "雪地气球村", "鎏金瀑谷", "彩虹飞瀑",
  "齿轮城堡", "糖果城", "浮岛列车园", "积木王城", "云朵糖堡",
  "鸭趣风车湾", "西瓜水港", "秋色蘑菇塔", "雪钟小镇", "雨伞桥",
  "云岭瀑寺", "机器人花园", "雪熊木屋", "彩珠滑道", "红龙瀑城",
  "金色旋转木马", "风筝悬城", "云端气球集", "魔法沙漏", "骨牌之城",
  "灯笼林居", "月下帐篷", "虹彩积木城", "泡泡观景台", "海崖群岛",
  "星球环台", "水晶王座", "水轮城", "齿轮飞艇港", "魔法药坊",
  "熔火之门", "冰蓝三叉宫", "云旋天塔", "翡翠洞瀑", "雷霆高塔",
  "棱镜桥城", "浮岛起重机", "黄金沙漏泉", "铜管乐园", "彩虹螺旋城",
  "雨林玻璃宫", "太阳晶广场", "月影天文台", "黄铜水港", "彩幕飞瀑",
  "星芒玻璃厅", "蝶翼花房", "浮空水苑", "水晶峡谷", "黄金蒸汽机",
  "贝壳瀑宫", "莲池静园", "橙香山城", "气球云城", "蓝湾港都",
  "灯笼树屋", "虹冰宫殿", "浮灯水市", "白桥瀑谷", "彩带庆典",
  "日耀圣城", "月牙水都", "星际商队", "极光晶穹", "云上风城",
  "粉樱花园", "深海塔苑", "菠萝海岛", "蓝穹花庭", "彩窗水桥",
  "孔雀喷泉", "折纸禅院", "灯会长街", "云端茶杯", "虹瀑花园",
  "月轮游乐场", "水晶海城", "云轨车站", "花钟庭院", "龙脊飞瀑",
  "水晶沙洲", "树屋溪居", "灯影水巷", "玻璃穹园", "月下灯塔路",
  "积木海城", "峡谷铁桥", "乐章喷泉", "萤火秘林", "蔚蓝海堡",
  "鲸云天桥", "苹果树屋", "晶轨雪村", "雪夜温泉村", "蝶梦瀑园",
  "晶洞小镇", "云朵面包屋", "星辰喷泉", "雨林船港", "极光山城",
] as const;

export const LEVEL_COLLECTION_ARTWORK_TITLES_ZH: Readonly<Record<number, string>> = Object.freeze(
  Object.fromEntries(LEVEL_ARTWORK_TITLES_ZH.map((title, index) => [index + 1, title])) as Record<number, string>,
);

export const levelCollectionArtworkTitleZh = (
  card: Pick<LevelCollectionCard, "levelId" | "defaultTitleZh">,
): string => {
  const authoredTitle = LEVEL_COLLECTION_ARTWORK_TITLES_ZH[card.levelId];
  if (authoredTitle) return authoredTitle;
  const withoutLevel = card.defaultTitleZh.replace(/^第\d+关\s*[·•]\s*/u, "").trim();
  const firstSegment = withoutLevel.split(/\s*[·•]\s*/u)[0]?.trim() || withoutLevel;
  const chinesePrefix = firstSegment.match(/^[\u3400-\u9fff][\u3400-\u9fff·、，：！？（）-]*/u)?.[0]?.trim();
  return chinesePrefix || firstSegment || card.defaultTitleZh;
};

const MASTERPIECE_ARTWORK_TITLES_ZH = [
  "海岬灯塔", "瀑谷树屋", "雪岭列车", "星夜书阁", "玫瑰花园",
  "灯火港湾", "珊瑚海龟", "郁金香风车", "独角兽溪谷", "沙漠古城",
  "窗边猫影", "云瀑城堡", "月下樱桥", "云端热气球", "秋溪小镇",
  "暮色水城", "极光冰境", "湖畔营火", "云树溪桥", "南瓜灯镇",
  "荧光蘑林", "风帆海湾", "向日葵谷", "雪夜集市", "鹿影溪谷",
  "云端书城", "极光晶剧院", "蓝湾小镇", "云上风车港", "深海神殿",
  "沙海驼铃", "云羊牧场", "星球温室", "茶杯瀑园", "秋山溪谷",
  "灯影食坊", "水灯集市", "齿轮树谷", "星环观象台", "晶瀑秘境",
] as const;

export const MASTERPIECE_COLLECTION_ARTWORK_TITLES_ZH: Readonly<Record<number, string>> = Object.freeze(
  Object.fromEntries(MASTERPIECE_ARTWORK_TITLES_ZH.map((title, index) => [index + 1, title])) as Record<number, string>,
);

export const masterpieceCollectionArtworkTitleZh = (
  card: Pick<MasterpieceCollectionCard, "catalogNumber" | "defaultTitleZh">,
): string => MASTERPIECE_COLLECTION_ARTWORK_TITLES_ZH[card.catalogNumber] || card.defaultTitleZh;

export const LEVEL_COLLECTION_CATALOG = buildLevelCollectionCatalog();

interface MasterpieceSeed {
  readonly title: string;
  readonly artist: string;
  readonly era: string;
  readonly themeColor: `#${string}`;
}

/**
 * Forty original, deterministic in-world works. They deliberately contain no
 * image path: future UI may render their palette cards or attach owned art
 * packs without changing catalogue identity or unlock rules.
 */
const MASTERPIECE_SEEDS: readonly MasterpieceSeed[] = [
  { title: "晨雾花园", artist: "沈岚", era: "曙光纪·早期", themeColor: "#9ED7C5" },
  { title: "蓝桥月影", artist: "顾晴", era: "曙光纪·早期", themeColor: "#5277B7" },
  { title: "夏日果宴", artist: "苏禾", era: "曙光纪·早期", themeColor: "#F08B5D" },
  { title: "风筝与云", artist: "陆野", era: "曙光纪·早期", themeColor: "#87C9E8" },
  { title: "金色港湾", artist: "江澄", era: "曙光纪·盛期", themeColor: "#E7B64A" },
  { title: "森林茶会", artist: "叶弦", era: "曙光纪·盛期", themeColor: "#6CA66A" },
  { title: "雨后街灯", artist: "闻溪", era: "曙光纪·盛期", themeColor: "#69788F" },
  { title: "红帆归航", artist: "唐星", era: "曙光纪·盛期", themeColor: "#C9544D" },
  { title: "紫藤午后", artist: "沈岚", era: "花火纪·早期", themeColor: "#A47ABD" },
  { title: "雪原微光", artist: "顾晴", era: "花火纪·早期", themeColor: "#B9DCE9" },
  { title: "星河车站", artist: "苏禾", era: "花火纪·早期", themeColor: "#4F4F91" },
  { title: "琥珀麦田", artist: "陆野", era: "花火纪·早期", themeColor: "#D79C3F" },
  { title: "海风书页", artist: "江澄", era: "花火纪·盛期", themeColor: "#64AFC0" },
  { title: "山谷回声", artist: "叶弦", era: "花火纪·盛期", themeColor: "#748E62" },
  { title: "翡翠瀑布", artist: "闻溪", era: "花火纪·盛期", themeColor: "#39A88B" },
  { title: "午夜剧场", artist: "唐星", era: "花火纪·盛期", themeColor: "#5E477E" },
  { title: "晨曦钟楼", artist: "沈岚", era: "远航纪·早期", themeColor: "#D8A66D" },
  { title: "珊瑚梦境", artist: "顾晴", era: "远航纪·早期", themeColor: "#E97986" },
  { title: "枫林信使", artist: "苏禾", era: "远航纪·早期", themeColor: "#C56A42" },
  { title: "极光之城", artist: "陆野", era: "远航纪·早期", themeColor: "#55C4C9" },
  { title: "云上牧场", artist: "江澄", era: "远航纪·盛期", themeColor: "#A7CBE2" },
  { title: "月桂庭院", artist: "叶弦", era: "远航纪·盛期", themeColor: "#83A769" },
  { title: "玻璃花房", artist: "闻溪", era: "远航纪·盛期", themeColor: "#D49AC2" },
  { title: "潮汐灯塔", artist: "唐星", era: "远航纪·盛期", themeColor: "#3E7FA7" },
  { title: "沙丘长歌", artist: "沈岚", era: "星辉纪·早期", themeColor: "#D5A565" },
  { title: "雨林秘径", artist: "顾晴", era: "星辉纪·早期", themeColor: "#3F8A68" },
  { title: "橙花小镇", artist: "苏禾", era: "星辉纪·早期", themeColor: "#E69452" },
  { title: "银翼列车", artist: "陆野", era: "星辉纪·早期", themeColor: "#8795A8" },
  { title: "莲池清梦", artist: "江澄", era: "星辉纪·盛期", themeColor: "#82B8A7" },
  { title: "星尘舞会", artist: "叶弦", era: "星辉纪·盛期", themeColor: "#7868B5" },
  { title: "天空图书馆", artist: "闻溪", era: "星辉纪·盛期", themeColor: "#669BC7" },
  { title: "蓝鲸之歌", artist: "唐星", era: "星辉纪·盛期", themeColor: "#3977A5" },
  { title: "暮色风车", artist: "沈岚", era: "新辰纪·早期", themeColor: "#9A6F78" },
  { title: "春雪信笺", artist: "顾晴", era: "新辰纪·早期", themeColor: "#C9DCE4" },
  { title: "彩窗晨光", artist: "苏禾", era: "新辰纪·早期", themeColor: "#D66F78" },
  { title: "火树银花", artist: "陆野", era: "新辰纪·早期", themeColor: "#E36A45" },
  { title: "静谧天文台", artist: "江澄", era: "新辰纪·盛期", themeColor: "#454E78" },
  { title: "红叶长廊", artist: "叶弦", era: "新辰纪·盛期", themeColor: "#B94E3F" },
  { title: "银河花园", artist: "闻溪", era: "新辰纪·盛期", themeColor: "#6257A5" },
  { title: "黎明王冠", artist: "唐星", era: "新辰纪·盛期", themeColor: "#F0C452" },
] as const;

const masterpieceRarity = (catalogNumber: number): CollectionRarity => {
  if (catalogNumber % 10 === 0) return "legendary";
  const finalDigit = catalogNumber % 10;
  if (finalDigit === 5 || finalDigit === 8) return "epic";
  if (finalDigit === 2 || finalDigit === 4 || finalDigit === 6) return "rare";
  return "common";
};

const masterpieceInspirationCost = (catalogNumber: number, rarity: CollectionRarity): number => (
  catalogNumber === 1
    ? 0
    : ({ common: 8, rare: 14, epic: 22, legendary: 35 } as const)[rarity]
);

export const MASTERPIECE_COLLECTION_CATALOG: readonly MasterpieceCollectionCard[] = Object.freeze(
  MASTERPIECE_SEEDS.map((seed, index): MasterpieceCollectionCard => {
    const catalogNumber = index + 1;
    const stableNumber = String(catalogNumber).padStart(2, "0");
    const unlockLevel = catalogNumber * 5;
    const rarity = masterpieceRarity(catalogNumber);
    return Object.freeze({
      id: `masterpiece-${stableNumber}`,
      category: "masterpiece",
      catalogNumber,
      chapter: Math.floor((unlockLevel - 1) / 10) + 1,
      unlockLevel,
      rarity,
      visualTheme: "gallery",
      inspirationCost: masterpieceInspirationCost(catalogNumber, rarity),
      titleKey: `collectionCatalog.masterpiece.${stableNumber}.title`,
      descriptionKey: `collectionCatalog.masterpiece.${stableNumber}.description`,
      defaultTitleZh: seed.title,
      defaultArtistZh: seed.artist,
      defaultEraZh: seed.era,
      themeColor: seed.themeColor,
      provenance: "original",
    });
  }),
);

export const COLLECTION_CATALOG: readonly CollectionCatalogItem[] = Object.freeze([
  ...LEVEL_COLLECTION_CATALOG,
  ...MASTERPIECE_COLLECTION_CATALOG,
]);

export const collectionCatalogFor = (
  category: CollectionCatalogCategory,
): readonly CollectionCatalogItem[] => category === "level"
  ? LEVEL_COLLECTION_CATALOG
  : MASTERPIECE_COLLECTION_CATALOG;

export const findCollectionCatalogItem = (id: string): CollectionCatalogItem | undefined => (
  COLLECTION_CATALOG.find((item) => item.id === id)
);

export interface CollectionPage<T> {
  readonly page: number;
  readonly pageSize: typeof COLLECTION_PAGE_SIZE;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly startIndex: number;
  readonly endIndexExclusive: number;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  readonly items: readonly T[];
}

const normalizeRequestedPage = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(1, Math.floor(numeric)) : 1;
};

/** One-based, clamped pagination. Empty catalogues report page 0 of 0. */
export const paginateCollectionItems = <T>(
  items: readonly T[],
  requestedPage: unknown = 1,
): CollectionPage<T> => {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / COLLECTION_PAGE_SIZE);
  const page = totalPages === 0
    ? 0
    : Math.min(totalPages, normalizeRequestedPage(requestedPage));
  const startIndex = page === 0 ? 0 : (page - 1) * COLLECTION_PAGE_SIZE;
  const endIndexExclusive = Math.min(totalItems, startIndex + COLLECTION_PAGE_SIZE);
  return Object.freeze({
    page,
    pageSize: COLLECTION_PAGE_SIZE,
    totalItems,
    totalPages,
    startIndex,
    endIndexExclusive,
    hasPrevious: page > 1,
    hasNext: page > 0 && page < totalPages,
    items: Object.freeze(items.slice(startIndex, endIndexExclusive)),
  });
};

export const getCollectionCatalogPage = (
  category: CollectionCatalogCategory,
  requestedPage: unknown = 1,
): CollectionPage<CollectionCatalogItem> => paginateCollectionItems(
  collectionCatalogFor(category),
  requestedPage,
);

export interface CollectionProgressInput {
  /** Exact, durably completed level ids; no highest-level inference occurs. */
  readonly completedLevelIds: readonly number[];
  readonly viewedItemIds?: readonly string[];
}

export interface CollectionProgressSummary {
  readonly total: number;
  readonly collected: number;
  readonly locked: number;
  readonly viewed: number;
  readonly newCount: number;
  readonly completionRatio: number;
  readonly collectedIds: readonly string[];
  readonly newItemIds: readonly string[];
}

const completedLevelSet = (values: readonly number[]): ReadonlySet<number> => new Set(
  values.filter((value) => Number.isSafeInteger(value) && value >= 1),
);

export const collectionItemIsCollected = (
  item: Pick<CollectionCatalogItem, "unlockLevel">,
  completedLevelIds: readonly number[],
): boolean => completedLevelSet(completedLevelIds).has(item.unlockLevel);

/**
 * Computes category or combined progress without reading or writing save data.
 * A viewed id counts only after its item has actually been collected.
 */
export const summarizeCollectionProgress = (
  items: readonly CollectionCatalogItem[],
  progress: CollectionProgressInput,
): CollectionProgressSummary => {
  const completed = completedLevelSet(progress.completedLevelIds);
  const viewed = new Set((progress.viewedItemIds ?? []).filter((id) => typeof id === "string"));
  const collectedItems = items.filter((item) => completed.has(item.unlockLevel));
  const viewedItems = collectedItems.filter((item) => viewed.has(item.id));
  const newItems = collectedItems.filter((item) => !viewed.has(item.id));
  const collectedIds = Object.freeze(collectedItems.map((item) => item.id));
  const newItemIds = Object.freeze(newItems.map((item) => item.id));
  return Object.freeze({
    total: items.length,
    collected: collectedItems.length,
    locked: items.length - collectedItems.length,
    viewed: viewedItems.length,
    newCount: newItems.length,
    completionRatio: items.length === 0 ? 0 : collectedItems.length / items.length,
    collectedIds,
    newItemIds,
  });
};
