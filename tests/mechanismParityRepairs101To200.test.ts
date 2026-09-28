// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import {
  compareMechanismKindParity,
  type MechanismKindId,
} from "../src/core/mechanismKindParity";
import {
  applyMechanismParityRepair101To200,
  MECHANISM_PARITY_REPAIR_101_TO_200_VERSION,
} from "../src/core/mechanismParityRepairs101To200";
import type { LevelSpec } from "../src/core/types";

type TruthDocument = { levels: Array<{ level: number }> };

const truthDocument = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  import.meta.url,
), "utf8")) as TruthDocument;
const truthById = new Map(truthDocument.levels.map((level) => [level.level, level]));
const baseline = LEVELS.filter((level) => level.id >= 101 && level.id <= 200);
const repaired = baseline.map(applyMechanismParityRepair101To200);
const repairedById = new Map(repaired.map((level) => [level.id, level]));
const changedIds = baseline
  .filter((level, index) => JSON.stringify(level) !== JSON.stringify(repaired[index]))
  .map((level) => level.id);
const repairIds = Array.from({ length: 100 }, (_, index) => index + 101)
  .filter((id) => ![103, 105, 108, 112, 114, 115, 125, 150, 156, 190, 191].includes(id));

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

describe(`Lv101-200 mechanism parity repairs ${MECHANISM_PARITY_REPAIR_101_TO_200_VERSION}`, () => {
  it("restores every source-proven kind without inferring unknown mechanisms", () => {
    // The suite is valid immediately before levels.ts integration (89 changes)
    // and after integration (the repair is idempotent, so zero new changes).
    expect([0, 89]).toContain(changedIds.length);
    for (const level of repaired) {
      const record = compareMechanismKindParity(level.id, truthById.get(level.id), level);
      expect(record.missingKinds, `Lv${level.id} missing`).toEqual([]);
      expect(record.extraKinds, `Lv${level.id} extra`).toEqual([]);
      expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
    }
  });

  it("keeps partial/source-missing levels and ordinary exits conservative", () => {
    for (const levelId of [190, 191]) {
      const level = LEVELS[levelId - 1]!;
      expect(applyMechanismParityRepair101To200(level)).toBe(level);
    }
    for (const levelId of [102, 171, 181]) {
      const before = LEVELS[levelId - 1]!;
      const after = repairedById.get(levelId)!;
      expect(after.gates).toEqual(before.gates);
      expect(after.flipDoors).toEqual(before.flipDoors);
      expect(after.gates.length + (after.flipDoors?.length ?? 0), `Lv${levelId}`).toBeGreaterThan(0);
    }
    for (const level of repaired) {
      const before = LEVELS[level.id - 1]!;
      expect(level.generators, `Lv${level.id} unknown generator truth`).toEqual(before.generators);
    }
  });

  it("restores real player-facing carriers rather than counting internal staging", () => {
    const expected = new Map<MechanismKindId, number[]>([
      ["staged-frame", [110, 113, 123, 145, 163, 166]],
      ["flip-door", [151, 152, 155, 162, 163]],
      ["irregular-block", [174, 178, 181, 182, 185, 187, 188, 197, 199]],
      ["irregular-board", [176, 185]],
      ["colored-grid", [200]],
    ]);
    for (const [kind, ids] of expected) for (const levelId of ids) {
      expect(compareMechanismKindParity(levelId, truthById.get(levelId), repairedById.get(levelId)!).runtime[kind], `Lv${levelId}/${kind}`)
        .toBe(true);
    }
    for (const level of repaired) {
      const blockIds = new Set(level.blocks.map((block) => block.id));
      for (const shutter of level.shutters ?? []) {
        if (shutter.skin === "staging") continue;
        expect(shutter.width * shutter.height, `Lv${level.id}/${shutter.id}`).toBeGreaterThan(0);
        if (shutter.skin === "staged-frame") {
          expect(shutter.triggerBlockIds?.every((id) => blockIds.has(id)), `Lv${level.id}/${shutter.id}`).toBe(true);
          expect(level.blocks.some((block) => block.shutterId === shutter.id), `Lv${level.id}/${shutter.id}`).toBe(true);
        }
      }
    }
    const level101 = repairedById.get(101)!;
    expect(level101.blocks.some((block) => block.star)).toBe(true);
    expect(level101.gates.some((gate) => gate.star)).toBe(true);
  });

  it.each(repairIds)("keeps repaired Lv%i solver-complete and replayable", (levelId) => {
    const level = repairedById.get(levelId)!;
    const solution = solveLevelForValidation(level, 20_000);
    expect(
      solution.solved,
      `Lv${levelId}: ${solution.termination} ${JSON.stringify(solution.staticUnsatReasons)}`,
    ).toBe(true);
    replay(level, solution.drags);
  }, 60_000);
});
