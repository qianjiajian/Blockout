// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import {
  applyMechanismParityShutterRegionRepair,
  MECHANISM_PARITY_SHUTTER_REGION_VERSION,
} from "../src/core/mechanismParityShutterRegions";
import {
  compareMechanismKindParity,
  competitorSourceLevelId,
} from "../src/core/mechanismKindParity";
import { auditOrdinaryShutterCoverage, isOrdinaryShutter } from "../src/core/shutterCoverage";
import type { LevelSpec } from "../src/core/types";

type JsonRecord = Record<string, any>;
const REPAIR_IDS = [29, 39, 59, 64, 73, 110, 119, 129, 134, 154, 179, 189, 193, 194] as const;
const REPAIR_ID_SET = new Set<number>(REPAIR_IDS);
const TRUTH_PATHS = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
] as const;
const truthById = new Map(TRUTH_PATHS.flatMap((path) => (
  (JSON.parse(readFileSync(path, "utf8")) as JsonRecord).levels as JsonRecord[]
)).map((level) => [Number(level.level ?? level.level_id), level]));

const repaired = LEVELS.map(applyMechanismParityShutterRegionRepair);
const repairedById = new Map(repaired.map((level) => [level.id, level]));
const changedIds = LEVELS.filter((level, index) => level !== repaired[index]).map(({ id }) => id);
const strictIssues = (level: LevelSpec) => auditOrdinaryShutterCoverage(level)
  .filter(({ kind }) => kind !== "missing-hidden-cohort");

const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): void => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && timedInterval > 0) model.tick(timedInterval);
    expect(model.getBlock(drag.blockId), `Lv${level.id}/${drag.blockId} must be active`).toBeDefined();
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId)!;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      expect(moved, `Lv${level.id}/${drag.blockId} -> ${x},${y}`).toBe(true);
    }
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok, `Lv${level.id}/${drag.blockId}`).toBe(true);
    expect(model.commitAction(), `Lv${level.id}/${drag.blockId}`).toBe(true);
    if (timedInterval > 0) model.tick(timedInterval);
  }
  expect(model.snapshot(), `Lv${level.id}`).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
};

describe(`mechanism-parity shutter regions ${MECHANISM_PARITY_SHUTTER_REGION_VERSION}`, () => {
  it("repairs exactly the strict-audit cohort and is idempotent", () => {
    expect([[], [...REPAIR_IDS]]).toContainEqual(changedIds);
    for (const level of repaired) {
      expect(strictIssues(level), `Lv${level.id}`).toEqual([]);
      expect(applyMechanismParityShutterRegionRepair(level), `Lv${level.id}`).toBe(level);
    }
  });

  it("keeps each ordinary panel identity/count and separates mismatched cargo", () => {
    for (const levelId of REPAIR_IDS) {
      const before = LEVELS[levelId - 1]!;
      const after = repairedById.get(levelId)!;
      const issueIds = new Set(strictIssues(before).map(({ shutterId }) => shutterId));
      for (const id of issueIds) {
        const oldPanel = (before.shutters ?? []).find((shutter) => shutter.id === id)!;
        const panel = (after.shutters ?? []).find((shutter) => shutter.id === id)!;
        expect(panel).toMatchObject({ id, count: oldPanel.count, width: 1, height: 1, skin: "shutter" });
        expect(isOrdinaryShutter(panel)).toBe(true);
        const oldCargo = before.blocks.filter((block) => block.shutterId === id);
        const newCargo = after.blocks.filter((block) => block.shutterId === `${id}-cargo-stage`);
        expect(newCargo.map(({ id: blockId }) => blockId), `Lv${levelId}/${id}`).toEqual(
          oldCargo.map(({ id: blockId }) => blockId),
        );
        if (oldCargo.length) {
          expect((after.shutters ?? []).find((shutter) => shutter.id === `${id}-cargo-stage`)).toMatchObject({
            count: oldPanel.count,
            skin: "staging",
          });
        }
      }
      expect(() => validateLevel(after), `Lv${levelId}`).not.toThrow();
    }
  });

  it("does not change the known 18-kind competitor parity result", () => {
    const mismatches = repaired.flatMap((level) => {
      const sourceId = competitorSourceLevelId(level.id);
      const record = compareMechanismKindParity(level.id, truthById.get(sourceId), level);
      return [
        ...record.missingKinds.map((kind) => `Lv${level.id} missing ${kind}`),
        ...record.extraKinds.map((kind) => `Lv${level.id} extra ${kind}`),
      ];
    });
    expect(mismatches).toEqual([]);
  });

  it.each(REPAIR_IDS)("keeps repaired Lv%i solver-complete and replayable", (levelId) => {
    expect(REPAIR_ID_SET.has(levelId)).toBe(true);
    const level = repairedById.get(levelId)!;
    const solution = solveLevelForValidation(level, 20_000);
    expect(
      solution.solved,
      `Lv${levelId}: ${solution.termination} ${JSON.stringify(solution.staticUnsatReasons)}`,
    ).toBe(true);
    replay(level, solution.drags);
  }, 60_000);
});
