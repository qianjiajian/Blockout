// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_REPOSITION_FLOORS,
  campaignPacingForTarget,
  campaignRepositionFloor,
  campaignTargetD1,
} from "../src/core/campaignDifficultyTargets";

interface ContractLevel {
  level_id: string;
  our_design_target: {
    target_d1_difficulty: {
      formula_version: string;
      score_kind: string;
      calibrated_score: number;
      band: "tutorial" | "normal" | "hard" | "extreme";
      curve_role: "preserve_current" | "wave_entry" | "wave_reset" | "wave_ramp" | "five_level_peak";
    };
    recommended_minimum_reposition_overhead: number | null;
  };
}

interface DesignContract {
  levels: ContractLevel[];
}

const CONTRACT_PATH = new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-competitor-constrained-design-contract-v4.json",
  import.meta.url,
);
const CONTRACT = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as DesignContract;
const WAVE_OFFSETS = [0, 2, 4, 5.5, 7] as const;
const RUNTIME_SOURCE_ORDER = [1, 3, 2, ...Array.from({ length: 97 }, (_, index) => index + 4)] as const;
const RUNTIME_CONTRACT_LEVELS = RUNTIME_SOURCE_ORDER.map((sourceId) => CONTRACT.levels[sourceId - 1]);
const CERTIFIED_VIDEO_CHAPTER_FLOOR_AMENDMENTS = new Map<number, number>([
  [35, 8],
  [36, 5],
  [38, 5],
  [39, 5],
]);

const expectedTargetD1 = (levelId: number): number => {
  if (levelId === 1) return 35.29;
  if (levelId === 2) return 57.1;
  if (levelId === 3) return 50.54;
  if (levelId === 4) return 70;
  if (levelId === 5) return 76;
  return 70 + Math.floor((levelId - 6) / 5) + WAVE_OFFSETS[(levelId - 6) % 5];
};

const expectedCurveRole = (levelId: number): ContractLevel["our_design_target"]["target_d1_difficulty"]["curve_role"] => {
  if (levelId <= 3) return "preserve_current";
  if (levelId === 4) return "wave_entry";
  if (levelId === 5 || (levelId >= 10 && levelId % 5 === 0)) return "five_level_peak";
  if (levelId >= 6 && (levelId - 6) % 5 === 0) return "wave_reset";
  return "wave_ramp";
};

const expectedPacing = (band: ContractLevel["our_design_target"]["target_d1_difficulty"]["band"]) => (
  band === "tutorial" || band === "normal"
    ? { difficulty: "normal", timeSeconds: 180 }
    : band === "hard"
      ? { difficulty: "hard", timeSeconds: 150 }
      : { difficulty: "super", timeSeconds: 120 }
);

describe("formal campaign difficulty targets", () => {
  it("matches the v4 contract plus solver-certified exact-video amendments", () => {
    expect(CONTRACT.levels).toHaveLength(100);
    const contractFloors = RUNTIME_CONTRACT_LEVELS.map((level, index) => (
      CERTIFIED_VIDEO_CHAPTER_FLOOR_AMENDMENTS.get(index + 1)
      ?? level.our_design_target.recommended_minimum_reposition_overhead
    ));
    expect(CAMPAIGN_REPOSITION_FLOORS).toHaveLength(100);
    expect([...CAMPAIGN_REPOSITION_FLOORS]).toEqual(contractFloors);
    for (let levelId = 1; levelId <= 100; levelId += 1) {
      expect(campaignRepositionFloor(levelId), `Lv${levelId}`).toBe(contractFloors[levelId - 1]);
    }
  });

  it("matches the contract's D1 formula, ranges, roles, and pacing for every level", () => {
    const targets = RUNTIME_CONTRACT_LEVELS.map((entry, index) => {
      const levelId = index + 1;
      const sourceId = RUNTIME_SOURCE_ORDER[index];
      expect(entry.level_id).toBe(`Lv${String(sourceId).padStart(3, "0")}`);
      expect(entry.our_design_target.target_d1_difficulty).toMatchObject({
        formula_version: "blockout-d1",
        score_kind: "calibrated",
        calibrated_score: expectedTargetD1(levelId),
        curve_role: expectedCurveRole(levelId),
      });
      expect(campaignTargetD1(levelId), `Lv${levelId}`).toBe(expectedTargetD1(levelId));
      expect(
        campaignPacingForTarget(campaignTargetD1(levelId)),
        `Lv${levelId} pacing`,
      ).toEqual(expectedPacing(entry.our_design_target.target_d1_difficulty.band));
      return campaignTargetD1(levelId);
    });

    expect([Math.min(...targets), Math.max(...targets)]).toEqual([35.29, 95]);
    expect(targets.slice(3).every((target) => target >= 70 && target <= 95)).toBe(true);
    for (let start = 6; start <= 96; start += 5) {
      const wave = targets.slice(start - 1, start + 4);
      const base = wave[0];
      expect(wave.map((target) => target - base), `Lv${start}-${start + 4} wave`).toEqual(WAVE_OFFSETS);
      if (start > 6) expect(base - targets[start - 6]).toBe(1);
    }
  });

  it("keeps threshold behavior and invalid-level failures explicit", () => {
    expect(campaignPacingForTarget(69.99)).toEqual({ difficulty: "normal", timeSeconds: 180 });
    expect(campaignPacingForTarget(70)).toEqual({ difficulty: "hard", timeSeconds: 150 });
    expect(campaignPacingForTarget(79.99)).toEqual({ difficulty: "hard", timeSeconds: 150 });
    expect(campaignPacingForTarget(80)).toEqual({ difficulty: "super", timeSeconds: 120 });
    for (const invalid of [0, 101, 1.5, Number.NaN]) {
      expect(() => campaignTargetD1(invalid)).toThrow(RangeError);
      expect(() => campaignRepositionFloor(invalid)).toThrow(RangeError);
    }
  });
});
