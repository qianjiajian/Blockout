// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { solveLevelForValidation, solveLevelOptimally } from "../src/core/levelSolver";
import { EXPANDED_DENSITY_LEVEL_CANDIDATES } from "../src/core/expandedDensityLevels.generated";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { normalizeRuntimeLevel, normalizeRuntimeReplayRoute } from "../src/core/runtimeLevelNormalization";
import type { LevelSpec } from "../src/core/types";
import { chapterFourProofRoute } from "./chapterFourProofEvidence";

const INTRO_EXACT_DRAGS = [3] as const;
const INTRO_EXACT_OVERHEAD = [0] as const;
type ValidationDrag = ReturnType<typeof solveLevelForValidation>["drags"][number];

interface AssemblyEntry {
  level: LevelSpec;
  route: ValidationDrag[];
  assembly: {
    route_metrics: { actions: number; clear_load: number; reposition_overhead: number };
  };
}

interface AssemblyDecision {
  level_id: string;
  witness_floor_met: boolean;
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
const CURRENT_SOLUTION = JSON.parse(readFileSync(new URL(
  "../playtest-results/round54-100-level-solution-report.json",
  import.meta.url,
), "utf8")) as {
  levelsPassed: number;
  levels: Array<{
    levelId: number;
    solved: boolean;
    routeDrags: number;
    clearLoad: number;
    repositionOverhead: number;
  }>;
};
const STAGING_AUDIT = JSON.parse(readFileSync(new URL(
  "../playtest-results/staging-collision/staging-collision-audit.json",
  import.meta.url,
), "utf8")) as {
  passed: boolean;
  affected_level_ids: number[];
};
const ASSEMBLY_BY_ID = new Map(ASSEMBLY.levels.map((entry) => [entry.level.id, entry]));
const DECISION_BY_ID = new Map(ASSEMBLY.decisions.map((entry) => [Number(entry.level_id.slice(2)), entry]));
const CURRENT_SOLUTION_BY_ID = new Map(CURRENT_SOLUTION.levels.map((entry) => [entry.levelId, entry]));
const STAGING_LEVEL_IDS = new Set(STAGING_AUDIT.affected_level_ids);
const CANDIDATE_BY_ID = new Map(EXPANDED_DENSITY_LEVEL_CANDIDATES.map((level) => [level.id, level]));
const sourceLevelIdForRuntime = (levelId: number): number => levelId === 2 ? 3 : levelId === 3 ? 2 : levelId;

export const registerCampaignValidationChapter = (chapter: number): void => {
  const levels = LEVELS.slice((chapter - 1) * 10, chapter * 10);
  describe(`campaign validation chapter ${chapter}`, () => {
    for (const level of levels) {
      it(`finds and replays a complete route for level ${level.id}: ${level.name}`, () => {
        const result = level.id === 1 ? solveLevelOptimally(level, 5_000_000) : undefined;
        const isChapterFour = level.id >= 31 && level.id <= 40;
        const sourceLevelId = sourceLevelIdForRuntime(level.id);
        const evidence = ASSEMBLY_BY_ID.get(sourceLevelId);
        const decision = DECISION_BY_ID.get(sourceLevelId);
        const current = CURRENT_SOLUTION_BY_ID.get(level.id);
        const replaySource = level.id === 1 || isChapterFour
          ? level
          : (CANDIDATE_BY_ID.get(sourceLevelId) ?? evidence?.level);
        if (!replaySource) throw new Error(`Missing replay level ${level.id}`);
        const replayLevel = normalizeRuntimeLevel(replaySource);
        const drags = isChapterFour
          ? chapterFourProofRoute(level.id)
          : result?.drags ?? (evidence ? normalizeRuntimeReplayRoute(replaySource, evidence.route) : undefined);
        if (!drags) throw new Error(`Missing route evidence for level ${level.id}`);
        if (level.id === 1) {
          expect(result?.solved, `searched ${result?.exploredStates} validation states`).toBe(true);
          expect(result!.minimumDrags).toBeGreaterThanOrEqual(result!.clearLoad);
          const expectedDrags = INTRO_EXACT_DRAGS[level.id - 1];
          expect(result!.minimumDrags, `level ${level.id} chapter-one route`).toBe(expectedDrags);
          expect(level.parMoves, `level ${level.id} chapter-one par`).toBe(expectedDrags);
          expect(result!.repositionOverhead, `level ${level.id} exact setup drags`)
            .toBe(INTRO_EXACT_OVERHEAD[level.id - 1]);
        } else if (isChapterFour) {
          const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
          const setupFloor = level.designTargets?.minimumRepositionOverhead ?? 0;
          expect(level.parMoves, `level ${level.id} certified route length`).toBe(drags.length);
          expect(drags.length - clearLoad, `level ${level.id} certified witness setup drags`)
            .toBeGreaterThanOrEqual(setupFloor);
        } else {
          if (!evidence || !decision || !current) throw new Error(`Missing historical or current evidence for level ${level.id}`);
          const setupFloor = level.designTargets?.minimumRepositionOverhead ?? 0;
          expect(CURRENT_SOLUTION.levelsPassed).toBe(100);
          expect(STAGING_AUDIT.passed).toBe(true);
          expect(current).toMatchObject({ solved: true });
          expect(current.routeDrags).toBeGreaterThanOrEqual(current.clearLoad);
          expect(current.routeDrags - current.clearLoad).toBe(current.repositionOverhead);
          expect(evidence.assembly.route_metrics.actions).toBe(evidence.route.length);
          expect(decision.witness_floor_met, `level ${level.id} witness floor`).toBe(true);
          expect(decision.strict_v5_floor_certified, `level ${level.id} strict floor certificate`).toBe(true);
          if (STAGING_LEVEL_IDS.has(level.id)) {
            expect(level.shutters?.some((shutter) => shutter.skin === "staging")).toBe(true);
          } else {
            expect(evidence.assembly.route_metrics.reposition_overhead, `level ${level.id} witness setup drags`)
              .toBeGreaterThanOrEqual(setupFloor);
            expect(Math.max(...decision.strict_v5_certificates.map((certificate) => certificate.certified_lower_bound)))
              .toBeGreaterThanOrEqual(setupFloor);
          }
          expect(level.parMoves, `level ${level.id} par no looser than accepted witness`)
            .toBeLessThanOrEqual(evidence.assembly.route_metrics.actions);
        }

        const model = new PuzzleModel(replayLevel);
        for (const drag of drags) {
          model.beginAction();
          for (const [stepIndex, [x, y]] of drag.path.entries()) {
            expect(model.moveBlock(drag.blockId, x, y), `${drag.blockId} -> ${x},${y}`).toBe(true);
            const movedBlock = model.getBlock(drag.blockId);
            const automaticSides = movedBlock ? model.possibleExitSides(movedBlock) : [];
            if (automaticSides.length > 0) {
              expect(stepIndex, `${drag.blockId} crosses an automatic exit before its drag ends`).toBe(drag.path.length - 1);
              expect(drag.exitSide, `${drag.blockId} parks on an automatic exit`).toBeDefined();
              expect(automaticSides, `${drag.blockId} exits through a different aligned gate`).toContain(drag.exitSide);
            }
          }
          if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok, `${drag.blockId} exits ${drag.exitSide}`).toBe(true);
          expect(model.commitAction()).toBe(true);
        }
        expect(model.snapshot().complete).toBe(true);
        expect(model.snapshot().moves).toBe(drags.length);
      }, level.id >= 5 && level.id <= 10 ? 240_000 : 60_000);
    }
  });
};
