import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation, solveLevelOptimally } from "../src/core/levelSolver";
import { LEVELS, VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER } from "../src/core/levels";
import {
  applyMechanismParityRepair1To100,
  MECHANISM_PARITY_REPAIR_1_TO_100_LEVEL_IDS,
  MECHANISM_PARITY_REPAIR_1_TO_100_VERSION,
} from "../src/core/mechanismParityRepairs1To100";
import { VIDEO_PARITY_LEVELS } from "../src/core/videoParityLevels.generated";
import type { LevelSpec } from "../src/core/types";

const repaired = LEVELS.slice(0, 100).map(applyMechanismParityRepair1To100);
const FRESH_SOLVER_LEVEL_IDS = MECHANISM_PARITY_REPAIR_1_TO_100_LEVEL_IDS.filter((id) => id !== 20);
const RESTORED_SHUTTER_LEVEL_IDS = new Set([
  24, 26, 29, 30, 34, 38, 39, 59, 64, 67, 73, 83, 92, 93, 95,
]);
const FORMAL_TYPES = [
  "color-exit", "irregular-block", "frozen-exit", "irregular-board", "numeric-ice",
  "multilayer-shell", "shutter", "generator", "axis-block", "key-lock", "layered-lift",
  "timed-generator", "staged-frame", "star",
] as const;
const isIrregular = (shape: LevelSpec["blocks"][number]["shape"]): boolean => {
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  return shape.length < (Math.max(...xs) - Math.min(...xs) + 1)
    * (Math.max(...ys) - Math.min(...ys) + 1);
};

const mechanismTypes = (level: LevelSpec): string[] => FORMAL_TYPES.filter((type) => {
  switch (type) {
    case "color-exit": return level.gates.length > 0 || Boolean(level.flipDoors?.length);
    case "irregular-block": return level.blocks.some((block) => isIrregular(block.shape));
    case "frozen-exit": return level.gates.some((gate) => (gate.frozen ?? 0) > 0)
      || Boolean(level.flipDoors?.some((gate) => (gate.frozen ?? 0) > 0));
    case "irregular-board": return (level.playable?.length
      ?? level.width * level.height - (level.blocked?.length ?? 0)) < level.width * level.height;
    case "numeric-ice": return level.blocks.some((block) => (block.frozen ?? 0) > 0);
    case "multilayer-shell": return level.blocks.some((block) => (block.layers?.length ?? 1) > 1);
    case "shutter": return Boolean(level.shutters?.some((item) => item.skin === undefined || item.skin === "shutter"));
    case "generator": return Boolean(level.generators?.some((item) => (item.trigger ?? "move") !== "time"));
    case "axis-block": return level.blocks.some((block) => Boolean(block.movementAxis));
    case "key-lock": return level.blocks.some((block) => Boolean(block.keyId || block.lockedBy));
    case "layered-lift": return Boolean(level.shutters?.some((item) => item.skin === "lift"));
    case "timed-generator": return Boolean(level.generators?.some((item) => item.trigger === "time"));
    case "staged-frame": return Boolean(level.shutters?.some((item) => item.skin === "staged-frame"));
    case "star": return level.blocks.some((block) => Boolean(block.star))
      || level.gates.some((gate) => Boolean(gate.star));
  }
});

const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): void => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && timedInterval > 0) model.tick(timedInterval);
    model.beginAction();
    for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y), `Lv${level.id}/${drag.blockId}`).toBe(true);
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok, `Lv${level.id}/${drag.blockId}`).toBe(true);
    expect(model.commitAction(), `Lv${level.id}/${drag.blockId}`).toBe(true);
    if (timedInterval > 0) model.tick(timedInterval);
  }
  expect(model.snapshot(), `Lv${level.id}`).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
};

describe(`Lv1-100 mechanism parity repairs ${MECHANISM_PARITY_REPAIR_1_TO_100_VERSION}`, () => {
  it("restores the exact 14-category competitor mechanism set and validates every level", () => {
    for (const level of repaired) {
      const sourceId = VIDEO_PARITY_CAMPAIGN_SOURCE_ORDER[level.id - 1]!;
      const source = VIDEO_PARITY_LEVELS[sourceId - 1]!;
      expect(mechanismTypes(level), `Lv${level.id}`).toEqual(mechanismTypes(source));
      expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
    }
  });

  it("uses real cargo relationships for restored device categories", () => {
    for (const levelId of MECHANISM_PARITY_REPAIR_1_TO_100_LEVEL_IDS) {
      const level = repaired[levelId - 1]!;
      const blockIds = new Set(level.blocks.map((block) => block.id));
      for (const generator of level.generators ?? []) {
        expect(generator.queueBlockIds.length, `Lv${levelId}/${generator.id}`).toBeGreaterThan(0);
        expect(generator.queueBlockIds.every((id) => blockIds.has(id)), `Lv${levelId}/${generator.id}`).toBe(true);
      }
      for (const shutter of level.shutters ?? []) {
        if (shutter.skin === "staging") continue;
        const hidden = level.blocks.filter((block) => block.shutterId === shutter.id);
        if (shutter.skin === "shutter" || shutter.skin === undefined) {
          expect(shutter.count, `Lv${levelId}/${shutter.id}`).toBeGreaterThan(0);
          expect(shutter.width * shutter.height, `Lv${levelId}/${shutter.id}`).toBeGreaterThan(0);
        }
        if (shutter.skin === "lift" || shutter.skin === "staged-frame") {
          expect(hidden.length, `Lv${levelId}/${shutter.id}`).toBeGreaterThan(0);
          expect(shutter.triggerBlockIds?.length, `Lv${levelId}/${shutter.id}`).toBeGreaterThan(0);
        }
      }
      if (RESTORED_SHUTTER_LEVEL_IDS.has(levelId)) {
        const ordinaryIds = (level.shutters ?? [])
          .filter((shutter) => shutter.skin === undefined || shutter.skin === "shutter")
          .map((shutter) => shutter.id);
        const cargoIds = new Set(ordinaryIds.flatMap((id) => [id, `${id}-cargo-stage`]));
        expect(level.blocks.some((block) => block.shutterId && cargoIds.has(block.shutterId)), `Lv${levelId}`)
          .toBe(true);
      }
    }
  });

  it.each(FRESH_SOLVER_LEVEL_IDS)(
    "keeps repaired Lv%i solver-complete and replayable",
    (levelId) => {
      const level = repaired[levelId - 1]!;
      const solution = solveLevelForValidation(level, 20_000);
      expect(
        solution.solved,
        `Lv${levelId}: ${solution.termination} ${JSON.stringify(solution.staticUnsatReasons)}`,
      ).toBe(true);
      replay(level, solution.drags);
    },
    60_000,
  );

  it("keeps regenerated Lv19 at ten or more necessary parking drags", () => {
    const level = repaired[18]!;
    expect(level.blocks.every((block) => !isIrregular(block.shape))).toBe(true);
    const exact = solveLevelOptimally(level, 50_000);
    expect(exact.solved, `Lv19: ${exact.termination}`).toBe(true);
    expect(exact.repositionOverhead, "Lv19").toBeGreaterThanOrEqual(10);
    replay(level, exact.drags);
  }, 60_000);

  it("proves and replays the regenerated Lv20 ten-reposition optimum", () => {
    const level = repaired[19]!;
    expect(level.blocks.every((block) => !isIrregular(block.shape))).toBe(true);
    expect(mechanismTypes(level)).toContain("irregular-board");
    expect(level.designTargets?.minimumRepositionOverhead).toBe(10);
    const exact = solveLevelOptimally(level, 100_000);
    expect(exact.solved, exact.termination).toBe(true);
    expect(exact.exploredStates).toBe(3_052);
    expect(exact.minimumDrags).toBe(24);
    expect(exact.clearLoad).toBe(14);
    expect(exact.repositionOverhead).toBe(10);
    replay(level, exact.drags);
  }, 30_000);
});
