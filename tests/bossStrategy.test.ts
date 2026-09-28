// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { Point } from "../src/core/types";

interface Decision {
  level_id: string;
  target_reposition_overhead: number;
  route_reposition_overhead: number;
  witness_floor_met: boolean;
  strict_v5_floor_certified: boolean;
  strict_v5_certificates: Array<{ certified_lower_bound: number }>;
}

const REPORT = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json",
  import.meta.url,
), "utf8")) as { decisions: Decision[] };
const CURRENT_SOLUTION = JSON.parse(readFileSync(new URL(
  "../playtest-results/round54-100-level-solution-report.json",
  import.meta.url,
), "utf8")) as {
  levels: Array<{ levelId: number; solved: boolean; routeDrags: number; clearLoad: number; repositionOverhead: number }>;
};
const STAGING_AUDIT = JSON.parse(readFileSync(new URL(
  "../playtest-results/staging-collision/staging-collision-audit.json",
  import.meta.url,
), "utf8")) as {
  passed: boolean;
  affected_level_ids: number[];
  current_validation_routes_below_authored_reposition_target_level_ids: number[];
};
const CURRENT_SOLUTION_BY_ID = new Map(CURRENT_SOLUTION.levels.map((level) => [level.levelId, level]));
const STAGING_LEVEL_IDS = new Set(STAGING_AUDIT.affected_level_ids);
const BOSS_IDS = [60, 70, 80, 90, 100] as const;

const profile = (level: (typeof LEVELS)[number]): string => JSON.stringify({
  board: [level.width, level.height, level.playable],
  shapes: level.blocks.map((block) => block.shape),
  positions: level.blocks.map((block) => [block.x, block.y]),
  stages: level.shutters?.map((shutter) => [shutter.skin, shutter.count]) ?? [],
  elevators: level.elevators?.length ?? 0,
  conveyors: level.conveyors?.length ?? 0,
  stars: level.blocks.filter((block) => block.star).length,
});

describe("late campaign boss strategy", () => {
  it("uses five distinct solvable formal layouts and does not reuse invalidated cover certificates", () => {
    const profiles = new Set<string>();
    for (const levelId of BOSS_IDS) {
      const level = LEVELS[levelId - 1];
      const decision = REPORT.decisions[levelId - 1];
      const current = CURRENT_SOLUTION_BY_ID.get(levelId);
      expect(() => validateLevel(level)).not.toThrow();
      expect(STAGING_AUDIT.passed).toBe(true);
      expect(STAGING_LEVEL_IDS.has(levelId)).toBe(true);
      expect(current).toMatchObject({ solved: true });
      expect(current!.routeDrags).toBeGreaterThanOrEqual(current!.clearLoad);
      expect(decision.level_id).toBe(`Lv${String(levelId).padStart(3, "0")}`);
      // These flags describe the archived physical-cover search. All five
      // bosses use staging, so that lower-bound proof is provenance only under
      // the current non-spatial staging contract.
      expect(decision.witness_floor_met).toBe(true);
      expect(decision.strict_v5_floor_certified).toBe(true);
      expect(level.designTargets?.minimumRepositionOverhead).toBe(decision.target_reposition_overhead);
      profiles.add(profile(level));
    }
    expect(profiles).toHaveLength(BOSS_IDS.length);
  });

  it("keeps at least two legal opening actions on all five bosses", () => {
    for (const levelId of BOSS_IDS) {
      const level = LEVELS[levelId - 1];
      const legalOpeners = new Set<string>();
      for (const block of level.blocks) {
        const exitModel = new PuzzleModel(level);
        const liveBlock = exitModel.getBlock(block.id);
        for (const side of liveBlock ? exitModel.possibleExitSides(liveBlock) : []) {
          legalOpeners.add(`${block.id}:exit:${side}`);
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Point[]) {
          const model = new PuzzleModel(level);
          model.beginAction();
          if (model.moveBlock(block.id, block.x + dx, block.y + dy) && model.commitAction()) {
            legalOpeners.add(`${block.id}:${dx},${dy}`);
          }
        }
      }
      expect(legalOpeners.size, `Lv${levelId} legal opening choices`).toBeGreaterThanOrEqual(2);
    }
  });

  it("raises the formal clear workload through the five chapter finales", () => {
    const loads = BOSS_IDS.map((levelId) => LEVELS[levelId - 1].blocks
      .reduce((sum, block) => sum + (block.layers?.length ?? 1), 0));
    expect(loads).toEqual([35, 36, 38, 40, 42]);
  });
});
