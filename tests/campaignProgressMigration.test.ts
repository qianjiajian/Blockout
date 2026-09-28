import { describe, expect, it } from "vitest";
import {
  LEGACY_CAMPAIGN_LEVEL_CAP,
  migrateLegacyCampaignCap,
} from "../src/core/campaignProgressMigration";

const completedLegacySave = () => ({
  schemaVersion: 1 as const,
  currentLevel: 100,
  highestLevel: 100,
  rewardedLevels: [1, 50, 100],
  bestStars: { "1": 3, "100": 2 },
  bestMoves: { "100": 27 },
  coins: 4321,
  boosters: { time: 2, rocket: 1, pulse: 3 },
});

describe("migrateLegacyCampaignCap", () => {
  it("unlocks and selects level 101 after a proven clear of the old level-100 cap", () => {
    const source = completedLegacySave();
    const migrated = migrateLegacyCampaignCap(source, 200);

    expect(migrated).not.toBe(source);
    expect(migrated.currentLevel).toBe(101);
    expect(migrated.highestLevel).toBe(101);
    expect(migrated.rewardedLevels).toBe(source.rewardedLevels);
    expect(migrated.bestStars).toBe(source.bestStars);
    expect(migrated.bestMoves).toBe(source.bestMoves);
    expect(migrated.boosters).toBe(source.boosters);
    expect(migrated.coins).toBe(4321);
  });

  it("keeps an earlier replay selection while unlocking level 101", () => {
    const source = { ...completedLegacySave(), currentLevel: 42 };
    const migrated = migrateLegacyCampaignCap(source, 200);

    expect(migrated.currentLevel).toBe(42);
    expect(migrated.highestLevel).toBe(101);
  });

  it("does not unlock level 101 merely because level 100 was reached", () => {
    const source = { ...completedLegacySave(), rewardedLevels: [1, 50, 99] };

    expect(migrateLegacyCampaignCap(source, 200)).toBe(source);
  });

  it("leaves saves below the old cap unchanged even if their reward ledger is malformed", () => {
    const source = {
      ...completedLegacySave(),
      currentLevel: 99,
      highestLevel: 99,
      rewardedLevels: [100],
    };

    expect(migrateLegacyCampaignCap(source, 200)).toBe(source);
  });

  it("does not migrate before the expanded campaign is installed", () => {
    const source = completedLegacySave();

    expect(migrateLegacyCampaignCap(source, LEGACY_CAMPAIGN_LEVEL_CAP)).toBe(source);
  });

  it("is idempotent and leaves native expanded-campaign saves unchanged", () => {
    const migrated = migrateLegacyCampaignCap(completedLegacySave(), 200);
    const loadedAgain = migrateLegacyCampaignCap(migrated, 200);
    const progressed = {
      ...completedLegacySave(),
      currentLevel: 138,
      highestLevel: 138,
      rewardedLevels: [...completedLegacySave().rewardedLevels, 101, 137],
    };

    expect(loadedAgain).toBe(migrated);
    expect(migrateLegacyCampaignCap(progressed, 200)).toBe(progressed);
  });

  it("requires a numeric level-100 reward entry as completion evidence", () => {
    const source = { ...completedLegacySave(), rewardedLevels: ["100"] };

    expect(migrateLegacyCampaignCap(source, 200)).toBe(source);
  });
});
