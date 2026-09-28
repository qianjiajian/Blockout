// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { solveLevelOptimally } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";

interface AssemblyEntry {
  level: { id: number; parMoves?: number };
  route: Array<{ blockId: string; path: Array<readonly [number, number]>; exitSide?: "top" | "right" | "bottom" | "left" }>;
  assembly: { route_metrics: { actions: number; reposition_overhead: number } };
}

interface AssemblyDecision {
  level_id: string;
  strict_v5_floor_certified: boolean;
  strict_v5_certificates: Array<{ certified_lower_bound: number }>;
}

const ASSEMBLY_PATH = new URL(
  "../playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json",
  import.meta.url,
);
const ASSEMBLY = JSON.parse(readFileSync(ASSEMBLY_PATH, "utf8")) as {
  levels: AssemblyEntry[];
  decisions: AssemblyDecision[];
};
const ASSEMBLY_BY_ID = new Map(ASSEMBLY.levels.map((entry) => [entry.level.id, entry]));
const DECISION_BY_ID = new Map(ASSEMBLY.decisions.map((entry) => [Number(entry.level_id.slice(2)), entry]));

export const registerCampaignChapter = (chapter: number): void => {
  const levels = LEVELS.slice((chapter - 1) * 10, chapter * 10);
  describe(`campaign chapter ${chapter}`, () => {
    for (const level of levels) {
      it(`keeps level ${level.id}: ${level.name} on an achievable clear budget`, () => {
        const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
        expect(level.parMoves).toBeTypeOf("number");
        expect(level.parMoves).toBeGreaterThanOrEqual(clearLoad);
      });
    }

    it(`proves one accepted planning floor in chapter ${chapter}`, () => {
      const level = levels[0];
      if (level.id > 10) {
        const evidence = ASSEMBLY_BY_ID.get(level.id);
        const decision = DECISION_BY_ID.get(level.id);
        if (!evidence || !decision) throw new Error(`Missing strict v5 chapter evidence for Lv${level.id}`);
        const floor = level.designTargets?.minimumRepositionOverhead ?? 0;
        expect(evidence.route).toHaveLength(evidence.assembly.route_metrics.actions);
        expect(evidence.level.parMoves).toBe(evidence.route.length);
        expect(evidence.assembly.route_metrics.reposition_overhead).toBeGreaterThanOrEqual(floor);
        expect(decision.strict_v5_floor_certified).toBe(true);
        expect(Math.max(...decision.strict_v5_certificates.map((certificate) => certificate.certified_lower_bound)))
          .toBeGreaterThanOrEqual(floor);
        return;
      }
      const result = solveLevelOptimally(level);
      expect(result.solved, `explored ${result.exploredStates} states`).toBe(true);
      expect(result.minimumDrags).toBeLessThanOrEqual(level.parMoves ?? Number.POSITIVE_INFINITY);

      const model = new PuzzleModel(level);
      for (const drag of result.drags) {
        model.beginAction();
        for (const [x, y] of drag.path) expect(model.moveBlock(drag.blockId, x, y)).toBe(true);
        if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
        expect(model.commitAction()).toBe(true);
      }
      expect(model.snapshot().complete).toBe(true);
      expect(model.snapshot().moves).toBe(result.minimumDrags);
    }, 60_000);
  });
};
