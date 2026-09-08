import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import {
  buildEconomyBalance,
  DAILY_BASE_REWARD,
  DAILY_THREE_STAR_REWARD,
  renderEconomyBalanceMarkdown,
} from "../src/core/economyBalance";
import { SUPPLY_ITEMS, SUPPLY_ORDER } from "../src/core/supply";

describe("campaign economy pacing", () => {
  it("introduces one helper at a time after the core three-level lesson", () => {
    expect(SUPPLY_ORDER.map((kind) => SUPPLY_ITEMS[kind].unlockLevel)).toEqual([4, 7, 10]);
    expect(new Set(SUPPLY_ORDER.map((kind) => SUPPLY_ITEMS[kind].unlockLevel)).size).toBe(3);
  });

  it("funds optional help without making one booster per level sustainable", () => {
    const initialCoins = 1000;
    const campaignRewards = LEVELS.reduce((sum, level) => sum + level.reward, 0);
    const averagePrice = SUPPLY_ORDER.reduce((sum, kind) => sum + SUPPLY_ITEMS[kind].price, 0) / SUPPLY_ORDER.length;
    const averagePurchases = Math.floor((initialCoins + campaignRewards) / averagePrice);
    expect(campaignRewards).toBe(13_505);
    expect(averagePurchases).toBeGreaterThanOrEqual(60);
    expect(averagePurchases).toBeLessThan(100);
  });

  it("raises chapter income as later puzzles become more demanding", () => {
    const chapterRewards = Array.from({ length: 10 }, (_, chapter) => LEVELS
      .slice(chapter * 10, chapter * 10 + 10)
      .reduce((sum, level) => sum + level.reward, 0));
    for (let chapter = 1; chapter < chapterRewards.length; chapter += 1) {
      expect(chapterRewards[chapter]).toBeGreaterThan(chapterRewards[chapter - 1]);
    }
  });

  it("builds one reproducible 100-level economy contract", () => {
    const summary = buildEconomyBalance(LEVELS);
    expect(summary.campaignReward).toBe(13_505);
    expect(summary.firstClearWallet).toBe(14_505);
    expect(summary.averagePrice).toBe(210);
    expect(summary.averagePricePurchases).toBe(69);
    expect(summary.levelsPerAveragePurchase).toBe(1.45);
    expect(summary.allInAverageAssists).toBe(78);
    expect(summary.unlocks.map((item) => item.level)).toEqual([4, 7, 10]);
    expect(summary.chapters.map((chapter) => chapter.reward)).toEqual([
      425, 625, 825, 1_025, 1_225, 1_425, 1_625, 1_825, 2_025, 2_480,
    ]);
    expect(summary.chapters.at(-1)?.cumulativeReward).toBe(summary.campaignReward);
  });

  it("keeps daily rewards supplemental and renders the review caveat", () => {
    const summary = buildEconomyBalance(LEVELS);
    expect(DAILY_BASE_REWARD).toBeLessThan(summary.minPrice);
    expect(DAILY_THREE_STAR_REWARD).toBeLessThan(summary.minPrice);
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
    expect(markdown).toContain("最紧关卡为 Lv 68、Lv 100，均余 71.00 秒");
  });
});
