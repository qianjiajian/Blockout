import type { LevelSpec } from "./types";
import { SUPPLY_ITEMS, SUPPLY_ORDER, type SupplyKind } from "./supply";

export const INITIAL_COINS = 1_000;
export const INITIAL_STOCK_PER_BOOSTER = 3;
export const DAILY_BASE_REWARD = 60;
export const DAILY_THREE_STAR_REWARD = 80;

export interface EconomyChapterSummary {
  chapter: number;
  reward: number;
  cumulativeReward: number;
  cumulativeWallet: number;
  averagePricePurchases: number;
}

export interface EconomyBalanceSummary {
  levelCount: number;
  initialCoins: number;
  initialStockPerBooster: number;
  initialStockTotal: number;
  campaignReward: number;
  firstClearWallet: number;
  minPrice: number;
  averagePrice: number;
  maxPrice: number;
  averagePricePurchases: number;
  levelsPerAveragePurchase: number;
  allInAverageAssists: number;
  dailyBaseAveragePriceCoverage: number;
  dailyThreeStarAveragePriceCoverage: number;
  unlocks: Array<{ kind: SupplyKind; title: string; level: number; price: number }>;
  purchasesByKind: Record<SupplyKind, number>;
  chapters: EconomyChapterSummary[];
}

const rounded = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const buildEconomyBalance = (levels: readonly LevelSpec[]): EconomyBalanceSummary => {
  const campaignReward = levels.reduce((sum, level) => sum + level.reward, 0);
  const firstClearWallet = INITIAL_COINS + campaignReward;
  const prices = SUPPLY_ORDER.map((kind) => SUPPLY_ITEMS[kind].price);
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const averagePricePurchases = Math.floor(firstClearWallet / averagePrice);
  let cumulativeReward = 0;
  const chapters = Array.from({ length: Math.ceil(levels.length / 10) }, (_, chapterIndex) => {
    const reward = levels
      .slice(chapterIndex * 10, chapterIndex * 10 + 10)
      .reduce((sum, level) => sum + level.reward, 0);
    cumulativeReward += reward;
    const cumulativeWallet = INITIAL_COINS + cumulativeReward;
    return {
      chapter: chapterIndex + 1,
      reward,
      cumulativeReward,
      cumulativeWallet,
      averagePricePurchases: Math.floor(cumulativeWallet / averagePrice),
    };
  });

  return {
    levelCount: levels.length,
    initialCoins: INITIAL_COINS,
    initialStockPerBooster: INITIAL_STOCK_PER_BOOSTER,
    initialStockTotal: INITIAL_STOCK_PER_BOOSTER * SUPPLY_ORDER.length,
    campaignReward,
    firstClearWallet,
    minPrice: Math.min(...prices),
    averagePrice,
    maxPrice: Math.max(...prices),
    averagePricePurchases,
    levelsPerAveragePurchase: rounded(levels.length / averagePricePurchases),
    allInAverageAssists: averagePricePurchases + INITIAL_STOCK_PER_BOOSTER * SUPPLY_ORDER.length,
    dailyBaseAveragePriceCoverage: rounded(DAILY_BASE_REWARD / averagePrice),
    dailyThreeStarAveragePriceCoverage: rounded(DAILY_THREE_STAR_REWARD / averagePrice),
    unlocks: SUPPLY_ORDER.map((kind) => ({
      kind,
      title: SUPPLY_ITEMS[kind].title,
      level: SUPPLY_ITEMS[kind].unlockLevel,
      price: SUPPLY_ITEMS[kind].price,
    })),
    purchasesByKind: Object.fromEntries(SUPPLY_ORDER.map((kind) => [
      kind,
      Math.floor(firstClearWallet / SUPPLY_ITEMS[kind].price),
    ])) as Record<SupplyKind, number>,
    chapters,
  };
};

export interface EconomyPointerEvidence {
  levelsPassed: number;
  pointerGestures: number;
  pointerGridSteps: number;
  minimumRemainingSeconds: number;
  /** All tied levels at the minimum; singular field remains for older reports. */
  minimumRemainingLevels?: readonly number[];
  minimumRemainingLevel: number;
}

export const renderEconomyBalanceMarkdown = (
  summary: EconomyBalanceSummary,
  pointer?: EconomyPointerEvidence,
): string => {
  const unlockRows = summary.unlocks
    .map((item) => `| ${item.title} | Lv ${item.level} | ${item.price} | ${summary.purchasesByKind[item.kind]} |`)
    .join("\n");
  const chapterRows = summary.chapters
    .map((chapter) => `| ${chapter.chapter} | ${chapter.reward} | ${chapter.cumulativeWallet} | ${chapter.averagePricePurchases} |`)
    .join("\n");
  const tightestLevels = pointer
    ? (pointer.minimumRemainingLevels?.length ? pointer.minimumRemainingLevels : [pointer.minimumRemainingLevel])
      .map((level) => `Lv ${level}`)
      .join("、")
    : "";
  const pointerParagraph = pointer
    ? `最近一次全赛季现场回放为 ${pointer.levelsPassed}/${summary.levelCount} 关，使用 ${pointer.pointerGestures.toLocaleString("en-US")} 次 Pointer、${pointer.pointerGridSteps.toLocaleString("en-US")} 个网格步，且全程不使用道具；最紧关卡为 ${tightestLevels}，均余 ${pointer.minimumRemainingSeconds.toFixed(2)} 秒。该数据只证明关卡与时间预算在自动验证路线下可完成，不替代真实玩家失败率、付费率或留存数据。`
    : "尚未附加当前全赛季 Pointer 回放；经济结论只来自静态关卡与价格数据。";

  return `# 100 关经济与道具节奏

> 本文由正式关卡数据与道具配置自动生成。修改奖励、价格、解锁关卡或全赛季报告后，运行 \`pnpm docs:economy\` 更新；\`pnpm docs:economy:verify\` 会拒绝漂移。

## 上线口径

- 前 3 关只训练拖拽、转向和让路，不开放捷径型道具。
- 加时在 Lv ${summary.unlocks[0].level}、火箭在 Lv ${summary.unlocks[1].level}、脉冲在 Lv ${summary.unlocks[2].level} 逐个开放；重玩低关时按账号最高进度保留已解锁道具。
- 新档自带 ${summary.initialCoins} 金币和每种 ${summary.initialStockPerBooster} 个道具，共 ${summary.initialStockTotal} 个；这是容错储备，不要求玩家首日购买。
- ${summary.levelCount} 关首次通关奖励共 ${summary.campaignReward.toLocaleString("en-US")} 金币，加初始金币后为 ${summary.firstClearWallet.toLocaleString("en-US")}。
- 三种道具均价 ${summary.averagePrice}，整季金币可买约 ${summary.averagePricePurchases} 个均价道具，平均每 ${summary.levelsPerAveragePurchase} 关一购；连同初始库存，理论总容错为 ${summary.allInAverageAssists} 次，低于每关一次，不能靠道具无脑覆盖整季。
- 每日挑战奖励 ${DAILY_BASE_REWARD}–${DAILY_THREE_STAR_REWARD} 金币，分别覆盖均价道具的 ${(summary.dailyBaseAveragePriceCoverage * 100).toFixed(0)}%–${(summary.dailyThreeStarAveragePriceCoverage * 100).toFixed(0)}%；每日参与能补充容错，但不会直接形成无限道具。

## 道具价格与开放

| 道具 | 解锁 | 单价 | 全赛季钱包最多购买 |
|---|---:|---:|---:|
${unlockRows}

## 章节产出

| 章节 | 本章奖励 | 累计钱包（含初始） | 累计均价购买力 |
|---:|---:|---:|---:|
${chapterRows}

## 可解与时间证据

${pointerParagraph}

## 仍需线上验证

- 当前没有真实玩家失败率、道具使用率和关卡流失漏斗，因此不继续凭主观下调价格或提高奖励。
- 小规模灰度时按 Lv 1–10、11–30、31–60、61–100 分段观察失败率和道具消耗；只有连续两段出现明显资源枯竭，才增加奖励或降价。
- 火箭能直接移除活动方块，需重点观察首次开放后是否削弱第 7–10 关的策略学习；若使用率过高，优先推迟免费库存发放，而不是增加弹窗或强制教学。
`;
};
