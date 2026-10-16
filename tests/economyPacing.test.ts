import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import {
  buildEconomyBalance,
  renderEconomyBalanceMarkdown,
} from "../src/core/economyBalance";
import { JOURNEY_MILESTONE_REWARDS } from "../src/core/journeyProgress";
import { SUPPLY_ITEMS, SUPPLY_ORDER } from "../src/core/supply";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

describe("campaign economy pacing", () => {
  it("introduces one helper at a time after the core three-level lesson", () => {
    expect(SUPPLY_ORDER.map((kind) => SUPPLY_ITEMS[kind].unlockLevel)).toEqual([4, 7, 10]);
    expect(new Set(SUPPLY_ORDER.map((kind) => SUPPLY_ITEMS[kind].unlockLevel)).size).toBe(3);
  });

  it("awards a fixed 40 coins per first clear across Lv1-Lv100", () => {
    const summary = buildEconomyBalance(VIDEO_PARITY_LEVELS_1_TO_100);
    expect(summary.campaignReward).toBe(4_000);
    expect(summary.averagePricePurchases).toBe(11);
  });

  it("keeps chapter income fixed regardless of historical level reward metadata", () => {
    const summary = buildEconomyBalance(VIDEO_PARITY_LEVELS_1_TO_100);
    expect(summary.chapters.map((chapter) => chapter.reward)).toEqual(Array(10).fill(400));
    expect(buildEconomyBalance(LEVELS.map((level) => ({ ...level, reward: 9999 }))))
      .toEqual(buildEconomyBalance(LEVELS));
  });

  it("builds one reproducible first-clear-only 100-level economy contract", () => {
    const summary = buildEconomyBalance(VIDEO_PARITY_LEVELS_1_TO_100);
    expect(summary.campaignReward).toBe(4_000);
    expect(summary.firstClearWallet).toBe(4_000);
    expect(summary.journeyCoinReward).toBe(50);
    expect(summary.journeyFreeStock).toBe(8);
    expect(summary.journeyFreeStockByKind).toEqual({ time: 3, rocket: 2, pulse: 3 });
    expect(summary.journeyFreeLives).toBe(0);
    expect(summary.journeyUnlimitedLivesGrants).toBe(4);
    expect(summary.journeyUnlimitedLivesSeconds).toBe(10_800);
    expect(summary.totalWallet).toBe(4_050);
    expect(summary.averagePrice).toBe((300 + 400 + 400) / 3);
    expect(summary.averagePricePurchases).toBe(11);
    expect(summary.purchasesByKind).toEqual({ time: 13, rocket: 10, pulse: 10 });
    expect(summary.levelsPerAveragePurchase).toBe(9.09);
    expect(summary.theoreticalBoosterAssists).toBe(28);
    expect(summary.unlocks.map((item) => item.level)).toEqual([4, 7, 10]);
    expect(summary.chapters.map((chapter) => chapter.reward)).toEqual([
      400, 400, 400, 400, 400, 400, 400, 400, 400, 400,
    ]);
    expect(summary.chapters.map((chapter) => chapter.journeyCoinReward)).toEqual([
      50, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(summary.chapters.map((chapter) => chapter.journeyFreeStock)).toEqual([
      0, 0, 1, 1, 1, 1, 1, 2, 0, 1,
    ]);
    expect(summary.chapters.map((chapter) => chapter.journeyFreeLives)).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(summary.chapters.map((chapter) => chapter.journeyUnlimitedLivesSeconds)).toEqual([
      0, 1_800, 3_600, 0, 1_800, 0, 0, 0, 3_600, 0,
    ]);
    expect(summary.chapters.map((chapter) => chapter.cumulativeWallet)).toEqual([
      450, 850, 1_250, 1_650, 2_050, 2_450, 2_850, 3_250, 3_650, 4_050,
    ]);
    expect(summary.chapters.at(-1)?.cumulativeReward).toBe(summary.campaignReward);
    expect(summary.chapters.at(-1)?.cumulativeJourneyCoinReward).toBe(summary.journeyCoinReward);
    expect(summary.chapters.at(-1)?.cumulativeJourneyFreeStock).toBe(summary.journeyFreeStock);
    expect(summary.chapters.at(-1)?.cumulativeJourneyFreeLives).toBe(summary.journeyFreeLives);
    expect(summary.chapters.at(-1)?.cumulativeJourneyUnlimitedLivesGrants)
      .toBe(summary.journeyUnlimitedLivesGrants);
    expect(summary.chapters.at(-1)?.cumulativeJourneyUnlimitedLivesSeconds)
      .toBe(summary.journeyUnlimitedLivesSeconds);
  });

  it("derives booster, coin, heart, and unlimited-life totals from the formal reward plan", () => {
    const summary = buildEconomyBalance(LEVELS);
    const firstHundredKinds = [
      "coins", "unlimited_lives", "unlimited_lives", "pulse", "time", "rocket",
      "unlimited_lives", "pulse", "time", "rocket", "pulse", "unlimited_lives", "time",
    ];
    expect(JOURNEY_MILESTONE_REWARDS.map((reward) => reward.kind)).toEqual([
      ...firstHundredKinds,
      ...firstHundredKinds,
    ]);
    const eligibleRewards = JOURNEY_MILESTONE_REWARDS.filter((reward) => reward.level <= LEVELS.length);
    expect(summary.journeyCoinReward).toBe(eligibleRewards
      .filter((reward) => reward.kind === "coins")
      .reduce((sum, reward) => sum + reward.amount, 0));
    expect(summary.journeyFreeStock).toBe(eligibleRewards
      .filter((reward) => reward.kind === "time" || reward.kind === "rocket" || reward.kind === "pulse")
      .reduce((sum, reward) => sum + reward.amount, 0));
    expect(summary.journeyFreeLives).toBe(eligibleRewards
      .filter((reward) => reward.kind === "heart")
      .reduce((sum, reward) => sum + reward.amount, 0));
    const unlimitedLives = eligibleRewards
      .filter((reward) => reward.kind === "unlimited_lives");
    expect(summary.journeyUnlimitedLivesGrants).toBe(unlimitedLives.length);
    expect(summary.journeyUnlimitedLivesSeconds).toBe(unlimitedLives
      .reduce((sum, reward) => sum + reward.amount, 0));
  });

  it("includes all 200 production levels in the expanded campaign economy", () => {
    expect(LEVELS).toHaveLength(200);
    const summary = buildEconomyBalance(LEVELS);
    expect(summary.chapters).toHaveLength(20);
    expect(summary.campaignReward).toBe(8_000);
    expect(summary.firstClearWallet).toBe(8_000);
    expect(summary.totalWallet).toBe(8_100);
    expect(summary.chapters.at(-1)?.cumulativeReward).toBe(summary.campaignReward);
    expect(summary.chapters.at(-1)?.cumulativeJourneyCoinReward).toBe(summary.journeyCoinReward);
  });

  it("renders the review caveat and reproducible campaign totals", () => {
    const summary = buildEconomyBalance(VIDEO_PARITY_LEVELS_1_TO_100);
    const markdown = renderEconomyBalanceMarkdown(summary, {
      levelsPassed: 100,
      pointerGestures: 1_774,
      pointerGridSteps: 10_205,
      minimumRemainingSeconds: 71,
      minimumRemainingLevel: 68,
      minimumRemainingLevels: [68, 100],
    });
    expect(markdown).toContain("不替代真实玩家失败率");
    expect(markdown).toContain("Lv 4、火箭在 Lv 7、脉冲在 Lv 10");
    expect(markdown).toContain("100 关各完成一次的基准金币共 4,000");
    expect(markdown).toContain("每关首次通关固定发 40 基础金币");
    expect(markdown).toContain("重复通关（包括提高星级）不发金币");
    expect(markdown).toContain("Journey 金币里程碑另发 50 金币");
    expect(markdown).toContain("合计钱包为 4,050");
    expect(markdown).toContain("免费道具不折算为金币或购买力");
    expect(markdown).toContain("避免满仓时才能全部兑现");
    expect(markdown).toContain("0 次免费体力，以及 4 次无限体力（共 10,800 秒 / 180 分钟）");
    expect(markdown).toContain("也不与 28 次道具辅助相加");
    expect(markdown).toContain("| 2 | 400 | 0 | — | — | 30 分钟（1 次） | 850 | 2 |");
    expect(markdown).toContain("最紧关卡为 Lv 68、Lv 100，均余 71.00 秒");
  });
});
