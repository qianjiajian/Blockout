import { describe, expect, it } from "vitest";

import { LEVELS_BEFORE_ALL_BLOCK_OPENING_SOLVABILITY_REPAIR as LEVELS } from "../src/core/levels";
import {
  ALL_BLOCK_OPENING_SOLVABILITY_REPAIR_LEVEL_IDS,
  applyAllBlockOpeningSolvabilityRepair,
} from "../src/core/allBlockOpeningSolvabilityRepairs";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";

const openingIds = (level: LevelSpec): string[] => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  return level.blocks.filter((block) => (
    !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId))
  )).map((block) => block.id);
};

const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): boolean => {
  const model = new PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe("final all-block opening solvability repairs", () => {
  it("moves only Lv93's two physical shutter panels to empty playable cells", () => {
    expect(ALL_BLOCK_OPENING_SOLVABILITY_REPAIR_LEVEL_IDS).toEqual([93]);
    const source = LEVELS.find((level) => level.id === 93)!;
    const repaired = applyAllBlockOpeningSolvabilityRepair(source);

    expect(repaired.gates).toEqual(source.gates);
    expect(repaired.flipDoors).toEqual(source.flipDoors);
    expect(repaired.blocks).toEqual(source.blocks);
    expect(openingIds(repaired)).toEqual(openingIds(source));
    expect(repaired.shutters).toHaveLength(source.shutters!.length);
    expect(repaired.shutters!.map(({ x: _x, y: _y, ...shutter }) => shutter)).toEqual(
      source.shutters!.map(({ x: _x, y: _y, ...shutter }) => shutter),
    );
    expect(repaired.shutters!.find((shutter) => shutter.id === "vp-093-cover-1")).toEqual(
      expect.objectContaining({ x: 1, y: 4, width: 1, height: 1, count: 18, skin: "shutter" }),
    );
    expect(repaired.shutters!.find((shutter) => shutter.id === "vp-093-cover-2")).toEqual(
      expect.objectContaining({ x: 2, y: 4, width: 1, height: 1, count: 14, skin: "shutter" }),
    );
    expect(() => validateLevel(repaired)).not.toThrow();
    expect(applyAllBlockOpeningSolvabilityRepair(repaired)).toEqual(repaired);
  });

  it.each([93, 124])("solves and replays the final opening-preserving Lv%i runtime", (levelId) => {
    const source = LEVELS.find((level) => level.id === levelId)!;
    const level = applyAllBlockOpeningSolvabilityRepair(source);
    const result = solveLevelForValidation(level, 20_000);
    expect(result.staticUnsatReasons).toEqual([]);
    expect(result.solved, `${result.termination}, ${result.exploredStates} states`).toBe(true);
    expect(replay(level, result.drags)).toBe(true);
  });
});
