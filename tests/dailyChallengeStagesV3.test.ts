import { describe, expect, it } from "vitest";
import { MECHANISM_GUIDE } from "../src/core/mechanismCatalog";
import { dailyChallengeStage } from "../src/core/dailyChallenge";
import {
  DAILY_CHALLENGE_BASIC_MECHANISMS_V3, DAILY_CHALLENGE_STAGES_V3, DAILY_CHALLENGE_V3_SLOTS,
  dailyChallengeStageV3, getDailyChallengeStageV3, mapLegacyDailyChallengeStageV3,
  validateDailyChallengeStageMechanismsV3,
} from "../src/core/dailyChallengeStagesV3";

describe("isolated daily300 stage profile", () => {
  it("defines 10 stages and exactly 10 unique slots per stage/difficulty", () => {
    expect(DAILY_CHALLENGE_STAGES_V3).toHaveLength(10);
    expect(DAILY_CHALLENGE_V3_SLOTS).toHaveLength(300);
    expect(new Set(DAILY_CHALLENGE_V3_SLOTS.map((s) => s.id)).size).toBe(300);
    for (const stage of DAILY_CHALLENGE_STAGES_V3) for (const difficulty of [1, 2, 3])
      expect(DAILY_CHALLENGE_V3_SLOTS.filter((s) => s.stageKey === stage.key && s.difficulty === difficulty)
        .map((s) => s.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it("allows the six base mechanisms early without requiring all six on each board", () => {
    const base = dailyChallengeStageV3(1);
    expect(base.key).toBe("basic-combined");
    expect(base.newestMechanism).toBeNull();
    expect(base.allowedMechanisms).toEqual(DAILY_CHALLENGE_BASIC_MECHANISMS_V3);
    for (const id of DAILY_CHALLENGE_BASIC_MECHANISMS_V3)
      expect(validateDailyChallengeStageMechanismsV3(base.key, ["color-exit", id]).ok).toBe(true);
    expect(validateDailyChallengeStageMechanismsV3(base.key, ["generator"]).ok).toBe(false);
    expect(validateDailyChallengeStageMechanismsV3(base.key, ["invented"]).ok).toBe(false);
  });
  it("retains all nine actual advanced boundaries, allows prior ones, and requires the latest", () => {
    expect(DAILY_CHALLENGE_STAGES_V3.slice(1).map((s) => s.unlockLevel)).toEqual([15, 35, 50, 59, 65, 100, 120, 150, 200]);
    DAILY_CHALLENGE_STAGES_V3.slice(1).forEach((stage, index) => {
      expect(dailyChallengeStageV3(stage.unlockLevel - 1)).toBe(DAILY_CHALLENGE_STAGES_V3[index]);
      expect(dailyChallengeStageV3(stage.unlockLevel)).toBe(stage);
      expect(stage.allowedMechanisms).toEqual([
        ...DAILY_CHALLENGE_BASIC_MECHANISMS_V3,
        ...DAILY_CHALLENGE_STAGES_V3.slice(1, index + 2).map((s) => s.newestMechanism),
      ]);
      expect(validateDailyChallengeStageMechanismsV3(stage.key, ["color-exit"]).missingNewest).toBe(true);
      expect(validateDailyChallengeStageMechanismsV3(stage.key, stage.allowedMechanisms).ok).toBe(true);
    });
    expect(dailyChallengeStageV3(20).newestMechanism).toBe("multilayer-shell");
  });
  it("maps only explicit legacy stages and fails closed on unknown keys", () => {
    for (const [id, unlock] of [["color-exit", 1], ["irregular-block", 5], ["frozen-exit", 6],
      ["irregular-board", 8], ["numeric-ice", 10], ["shutter", 20]])
      expect(mapLegacyDailyChallengeStageV3(`mechanisms-${id}-${unlock}`)?.key).toBe("basic-combined");
    expect(mapLegacyDailyChallengeStageV3("mechanisms-generator-35")?.newestMechanism).toBe("generator");
    expect(mapLegacyDailyChallengeStageV3("mechanisms-shutter-999")).toBeUndefined();
    expect(getDailyChallengeStageV3("mechanisms-shutter-20")).toBeUndefined();
    expect(validateDailyChallengeStageMechanismsV3("unknown", []).ok).toBe(false);
    for (const n of [NaN, Infinity, -1, 0]) expect(dailyChallengeStageV3(n).key).toBe("basic-combined");
  });
  it("uses the adopted ten-stage daily selector while keeping the mainline guide unchanged", () => {
    expect(MECHANISM_GUIDE).toHaveLength(15);
    expect(MECHANISM_GUIDE.find((m) => m.id === "shutter")?.unlockLevel).toBe(20);
    expect(dailyChallengeStage(20).key).toBe("mechanisms-multilayer-shell-15");
    expect(dailyChallengeStage(1).key).toBe("basic-combined");
    expect(dailyChallengeStage(1).mechanisms).toContain("shutter");
  });
});
