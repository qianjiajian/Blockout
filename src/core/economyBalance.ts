import type { LevelSpec } from "./types";
import { FIRST_CLEAR_COIN_REWARD } from "./completionRewards";
import { JOURNEY_MILESTONE_REWARDS } from "./journeyProgress";
import { SUPPLY_ITEMS, SUPPLY_ORDER, type SupplyKind } from "./supply";

export const INITIAL_COINS = 0;
export const INITIAL_STOCK_PER_BOOSTER = 3;

export interface EconomyChapterSummary {
  chapter: number;
  /** Fixed baseline: one 20-coin first-clear reward per level in this chapter. */
  reward: number;
  journeyCoinReward: number;
  /** Free Journey booster units; these are inventory, never coin value. */
  journeyFreeStock: number;
  journeyFreeStockByKind: Record<SupplyKind, number>;
  journeyFreeLives: number;
  journeyUnlimitedLivesGrants: number;
  journeyUnlimitedLivesSeconds: number;
  cumulativeReward: number;
  cumulativeJourneyCoinReward: number;
  cumulativeJourneyFreeStock: number;
  cumulativeJourneyFreeLives: number;
  cumulativeJourneyUnlimitedLivesGrants: number;
  cumulativeJourneyUnlimitedLivesSeconds: number;
  cumulativeWallet: number;
  averagePricePurchases: number;
}

export interface EconomyBalanceSummary {
  levelCount: number;
  initialCoins: number;
  initialStockPerBooster: number;
  initialStockTotal: number;
  /** Fixed baseline: one 20-coin first-clear reward per campaign level. */
  campaignReward: number;
  /** Initial coins plus first-clear rewards; excludes Journey. Replays pay no coins. */
  firstClearWallet: number;
  journeyCoinReward: number;
  /** Free Journey booster units; these are inventory, never coin value. */
  journeyFreeStock: number;
  journeyFreeStockByKind: Record<SupplyKind, number>;
  /** One free retry/life per heart reward. */
  journeyFreeLives: number;
  /** Number and total duration of unlimited-lives grants. */
  journeyUnlimitedLivesGrants: number;
  journeyUnlimitedLivesSeconds: number;
  /** Initial coins, first-clear rewards, and fixed Journey coins. Replays pay no coins. */
  totalWallet: number;
  minPrice: number;
  averagePrice: number;
  maxPrice: number;
  averagePricePurchases: number;
  levelsPerAveragePurchase: number;
  /** Coin-funded purchases plus initial and Journey booster stock only. */
  theoreticalBoosterAssists: number;
  unlocks: Array<{ kind: SupplyKind; title: string; level: number; price: number }>;
  purchasesByKind: Record<SupplyKind, number>;
  chapters: EconomyChapterSummary[];
}

const rounded = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const emptySupplyStock = (): Record<SupplyKind, number> => Object.fromEntries(
  SUPPLY_ORDER.map((kind) => [kind, 0]),
) as Record<SupplyKind, number>;

const summarizeJourneyRewards = (levels: readonly LevelSpec[]) => {
  const levelIds = new Set(levels.map((level) => level.id));
  const rewards = JOURNEY_MILESTONE_REWARDS.filter((reward) => levelIds.has(reward.level));
  const journeyFreeStockByKind = emptySupplyStock();
  let journeyCoinReward = 0;
  let journeyFreeStock = 0;
  let journeyFreeLives = 0;
  let journeyUnlimitedLivesGrants = 0;
  let journeyUnlimitedLivesSeconds = 0;

  rewards.forEach((reward) => {
    switch (reward.kind) {
      case "coins":
        journeyCoinReward += reward.amount;
        break;
      case "time":
      case "rocket":
      case "pulse":
        journeyFreeStockByKind[reward.kind] += reward.amount;
        journeyFreeStock += reward.amount;
        break;
      case "heart":
        journeyFreeLives += reward.amount;
        break;
      case "unlimited_lives":
        journeyUnlimitedLivesGrants += 1;
        journeyUnlimitedLivesSeconds += reward.amount;
        break;
      default: {
        const unhandledKind: never = reward.kind;
        throw new Error(`Unhandled Journey reward kind: ${unhandledKind}`);
      }
    }
  });

  return {
    journeyCoinReward,
    journeyFreeStock,
    journeyFreeStockByKind,
    journeyFreeLives,
    journeyUnlimitedLivesGrants,
    journeyUnlimitedLivesSeconds,
  };
};

export const buildEconomyBalance = (levels: readonly LevelSpec[]): EconomyBalanceSummary => {
  const campaignReward = levels.length * FIRST_CLEAR_COIN_REWARD;
  const firstClearWallet = INITIAL_COINS + campaignReward;
  const journey = summarizeJourneyRewards(levels);
  const totalWallet = firstClearWallet + journey.journeyCoinReward;
  const prices = SUPPLY_ORDER.map((kind) => SUPPLY_ITEMS[kind].price);
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const averagePricePurchases = Math.floor(totalWallet / averagePrice);
  let cumulativeReward = 0;
  let cumulativeJourneyCoinReward = 0;
  let cumulativeJourneyFreeStock = 0;
  let cumulativeJourneyFreeLives = 0;
  let cumulativeJourneyUnlimitedLivesGrants = 0;
  let cumulativeJourneyUnlimitedLivesSeconds = 0;
  const chapters = Array.from({ length: Math.ceil(levels.length / 10) }, (_, chapterIndex) => {
    const chapterLevels = levels.slice(chapterIndex * 10, chapterIndex * 10 + 10);
    const reward = chapterLevels.length * FIRST_CLEAR_COIN_REWARD;
    const chapterJourney = summarizeJourneyRewards(chapterLevels);
    cumulativeReward += reward;
    cumulativeJourneyCoinReward += chapterJourney.journeyCoinReward;
    cumulativeJourneyFreeStock += chapterJourney.journeyFreeStock;
    cumulativeJourneyFreeLives += chapterJourney.journeyFreeLives;
    cumulativeJourneyUnlimitedLivesGrants += chapterJourney.journeyUnlimitedLivesGrants;
    cumulativeJourneyUnlimitedLivesSeconds += chapterJourney.journeyUnlimitedLivesSeconds;
    const cumulativeWallet = INITIAL_COINS + cumulativeReward + cumulativeJourneyCoinReward;
    return {
      chapter: chapterIndex + 1,
      reward,
      journeyCoinReward: chapterJourney.journeyCoinReward,
      journeyFreeStock: chapterJourney.journeyFreeStock,
      journeyFreeStockByKind: chapterJourney.journeyFreeStockByKind,
      journeyFreeLives: chapterJourney.journeyFreeLives,
      journeyUnlimitedLivesGrants: chapterJourney.journeyUnlimitedLivesGrants,
      journeyUnlimitedLivesSeconds: chapterJourney.journeyUnlimitedLivesSeconds,
      cumulativeReward,
      cumulativeJourneyCoinReward,
      cumulativeJourneyFreeStock,
      cumulativeJourneyFreeLives,
      cumulativeJourneyUnlimitedLivesGrants,
      cumulativeJourneyUnlimitedLivesSeconds,
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
    journeyCoinReward: journey.journeyCoinReward,
    journeyFreeStock: journey.journeyFreeStock,
    journeyFreeStockByKind: journey.journeyFreeStockByKind,
    journeyFreeLives: journey.journeyFreeLives,
    journeyUnlimitedLivesGrants: journey.journeyUnlimitedLivesGrants,
    journeyUnlimitedLivesSeconds: journey.journeyUnlimitedLivesSeconds,
    totalWallet,
    minPrice: Math.min(...prices),
    averagePrice,
    maxPrice: Math.max(...prices),
    averagePricePurchases,
    levelsPerAveragePurchase: rounded(levels.length / averagePricePurchases),
    theoreticalBoosterAssists: averagePricePurchases
      + INITIAL_STOCK_PER_BOOSTER * SUPPLY_ORDER.length
      + journey.journeyFreeStock,
    unlocks: SUPPLY_ORDER.map((kind) => ({
      kind,
      title: SUPPLY_ITEMS[kind].title,
      level: SUPPLY_ITEMS[kind].unlockLevel,
      price: SUPPLY_ITEMS[kind].price,
    })),
    purchasesByKind: Object.fromEntries(SUPPLY_ORDER.map((kind) => [
      kind,
      Math.floor(totalWallet / SUPPLY_ITEMS[kind].price),
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
    .map((chapter) => {
      const freeStock = SUPPLY_ORDER
        .filter((kind) => chapter.journeyFreeStockByKind[kind] > 0)
        .map((kind) => `${SUPPLY_ITEMS[kind].title} ×${chapter.journeyFreeStockByKind[kind]}`)
        .join("、") || "—";
      const freeLives = chapter.journeyFreeLives > 0 ? `${chapter.journeyFreeLives} 次` : "—";
      const unlimitedLives = chapter.journeyUnlimitedLivesGrants > 0
        ? `${chapter.journeyUnlimitedLivesSeconds / 60} 分钟（${chapter.journeyUnlimitedLivesGrants} 次）`
        : "—";
      return `| ${chapter.chapter} | ${chapter.reward} | ${chapter.journeyCoinReward} | ${freeStock} | ${freeLives} | ${unlimitedLives} | ${chapter.cumulativeWallet} | ${chapter.averagePricePurchases} |`;
    })
    .join("\n");
  const stockLimits = SUPPLY_ORDER
    .map((kind) => `${SUPPLY_ITEMS[kind].title} ${SUPPLY_ITEMS[kind].maxStock}`)
    .join("、");
  const tightestLevels = pointer
    ? (pointer.minimumRemainingLevels?.length ? pointer.minimumRemainingLevels : [pointer.minimumRemainingLevel])
      .map((level) => `Lv ${level}`)
      .join("、")
    : "";
  const pointerParagraph = pointer
    ? `最近一次全赛季现场回放为 ${pointer.levelsPassed}/${summary.levelCount} 关，使用 ${pointer.pointerGestures.toLocaleString("en-US")} 次 Pointer、${pointer.pointerGridSteps.toLocaleString("en-US")} 个网格步，且全程不使用道具；最紧关卡为 ${tightestLevels}，均余 ${pointer.minimumRemainingSeconds.toFixed(2)} 秒。该数据只证明关卡与时间预算在自动验证路线下可完成，不替代真实玩家失败率、付费率或留存数据。`
    : "尚未附加当前全赛季 Pointer 回放；经济结论只来自静态关卡与价格数据。";

  return `# ${summary.levelCount} 关经济、道具与体力节奏

> 本文由正式关卡数量、首通奖励政策、Journey 里程碑奖励与道具配置自动生成。每关仅首次通关发金币，重复通关不产出金币。修改奖励、价格、解锁关卡或全赛季报告后，运行 \`pnpm docs:economy\` 更新；\`pnpm docs:economy:verify\` 会拒绝漂移。

## 上线口径

- 前 3 关只训练拖拽、转向和让路，不开放捷径型道具。
- ${SUPPLY_ITEMS.time.title}在 Lv ${summary.unlocks[0].level}、火箭在 Lv ${summary.unlocks[1].level}、脉冲在 Lv ${summary.unlocks[2].level} 逐个开放；重玩低关时按账号最高进度保留已解锁道具。
- 新档自带 ${summary.initialCoins} 金币和每种 ${summary.initialStockPerBooster} 个道具，共 ${summary.initialStockTotal} 个；这是容错储备，不要求玩家首日购买。
- 每关首次通关固定发 ${FIRST_CLEAR_COIN_REWARD} 基础金币；重复通关（包括提高星级）不发金币，也不重复首通进度或 Journey 解锁。冻结地图中的历史 \`level.reward\` 不再作为发奖依据。
- ${summary.levelCount} 关各完成一次的基准金币共 ${summary.campaignReward.toLocaleString("en-US")}；加初始金币后，有限基准钱包为 ${summary.firstClearWallet.toLocaleString("en-US")}（尚未计 Journey）。重复通关金币为0。
- Journey 金币里程碑另发 ${summary.journeyCoinReward.toLocaleString("en-US")} 金币，计入后合计钱包为 ${summary.totalWallet.toLocaleString("en-US")}；Journey 还免费发放 ${summary.journeyFreeStock} 个道具（${SUPPLY_ORDER.map((kind) => `${SUPPLY_ITEMS[kind].title} ×${summary.journeyFreeStockByKind[kind]}`).join("、")}），免费道具不折算为金币或购买力。
- 三种道具均价 ${summary.averagePrice}，合计钱包可买约 ${summary.averagePricePurchases} 个均价道具，平均每 ${summary.levelsPerAveragePurchase} 关一购；连同初始库存和 Journey 免费道具，理论道具辅助容量为 ${summary.theoreticalBoosterAssists} 次。免费道具受库存上限（${stockLimits}）约束，只有及时使用、避免满仓时才能全部兑现。
- Journey 体力权益另计：${summary.journeyFreeLives} 次免费体力，以及 ${summary.journeyUnlimitedLivesGrants} 次无限体力（共 ${summary.journeyUnlimitedLivesSeconds.toLocaleString("en-US")} 秒 / ${summary.journeyUnlimitedLivesSeconds / 60} 分钟）；体力权益不折算金币、购买力或道具辅助次数，也不与 ${summary.theoreticalBoosterAssists} 次道具辅助相加。

## 道具价格与开放

| 道具 | 解锁 | 单价 | 合计钱包最多购买 |
|---|---:|---:|---:|
${unlockRows}

## 章节产出

| 章节 | 本章基准金币（每关一次） | 本章 Journey 金币 | 本章 Journey 免费道具 | 本章免费体力 | 本章无限体力 | 有限基准钱包（初始 + 每关一次 + Journey 金币） | 累计均价购买力 |
|---:|---:|---:|:---|---:|:---|---:|---:|
${chapterRows}

## 可解与时间证据

${pointerParagraph}

## 仍需线上验证

- 当前没有真实玩家失败率、道具使用率和关卡流失漏斗，因此不继续凭主观下调价格或提高奖励。
- 小规模灰度时按 Lv 1–10、11–30、31–60、61–100 分段观察失败率和道具消耗；只有连续两段出现明显资源枯竭，才增加奖励或降价。
- 火箭能直接移除活动方块，需重点观察首次开放后是否削弱第 7–10 关的策略学习；若使用率过高，优先推迟免费库存发放，而不是增加弹窗或强制教学。
`;
};
