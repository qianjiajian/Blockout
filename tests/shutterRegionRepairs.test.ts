// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { LEVELS, LEVELS_BEFORE_SHUTTER_REGION_REPAIR } from "../src/core/levels";
import {
  applyShutterRegionRepair,
  SHUTTER_REGION_REPAIR_LEVEL_IDS,
  SHUTTER_REGION_REPAIR_VERSION,
} from "../src/core/shutterRegionRepairs";
import { auditOrdinaryShutterCoverage, isOrdinaryShutter } from "../src/core/shutterCoverage";

const EXPECTED_IDS = [
  27, 28, 40, 41, 44, 46, 48, 49, 54, 55, 57, 61, 62,
  68, 69, 71, 72, 74, 79, 84, 89, 91, 94, 98, 99,
  107, 116, 117, 127, 130, 158,
];
const SOURCE_ORDER_SHA256 = "6C8DB0B0FD5DDD2A741C0950D094FB49BF9F34DC09B6AD68D5DC94B572E03A71";
const PANEL_GEOMETRY_SHA256 = "6C9341A81CA2B41A8D040CB3515160FC6898D52BC8A1931385D9207DC46C11D9";
const METADATA_DROP: Readonly<Record<string, number>> = {
  "41:cc-041-b1-02": 1, "41:cc-041-b2-02": 1,
  "55:strategy-guard-s1-05": 1, "55:strategy-guard-s1-14": 4,
  "61:strategy-guard-s1-07": 4,
  "72:cc-072-b1-04": 1, "72:cc-072-b1-07": 1,
  "84:cc-084-b1-05": 2, "89:cc-089-b1-01": 1,
  "91:cc-091-b2-01": 4, "94:cc-094-b1-08": 2, "99:cc-099-b1-09": 4,
  "107:lv107-opening-b02": 2, "107:lv107-opening-b03": 2, "107:lv107-opening-b04": 2,
  "130:lv130-opening-b02": 2,
};
const SHUTTER_REPAIRED_LEVELS = LEVELS_BEFORE_SHUTTER_REGION_REPAIR.map(applyShutterRegionRepair);
const getShutterRepairedLevel = (id: number) => SHUTTER_REPAIRED_LEVELS[id - 1]!;
const hash = (value: unknown): string => createHash("sha256")
  .update(JSON.stringify(value))
  .digest("hex")
  .toUpperCase();
const componentCount = (points: readonly (readonly [number, number])[]): number => {
  const remaining = new Set(points.map(([x, y]) => `${x},${y}`));
  let components = 0;
  while (remaining.size) {
    components += 1;
    const first = remaining.values().next().value as string;
    remaining.delete(first);
    const queue = [first];
    while (queue.length) {
      const [x, y] = queue.pop()!.split(",").map(Number);
      for (const key of [`${x - 1},${y}`, `${x + 1},${y}`, `${x},${y - 1}`, `${x},${y + 1}`]) {
        if (!remaining.delete(key)) continue;
        queue.push(key);
      }
    }
  }
  return components;
};

describe(`campaign shutter region repairs ${SHUTTER_REGION_REPAIR_VERSION}`, () => {
  it("keeps the audited repair scope explicit", () => {
    expect(SHUTTER_REGION_REPAIR_LEVEL_IDS).toEqual(EXPECTED_IDS);
  });

  it("binds packed coordinates to the audited source block and panel order", () => {
    const sourceOrder = EXPECTED_IDS.map((id) => {
      const level = LEVELS_BEFORE_SHUTTER_REGION_REPAIR[id - 1]!;
      return [
        id,
        level.blocks.map(({ id: blockId }) => blockId),
        (level.shutters ?? []).filter(isOrdinaryShutter).map(({ id: shutterId }) => shutterId),
      ];
    });
    expect(hash(sourceOrder)).toBe(SOURCE_ORDER_SHA256);
  });

  it("locks every source-observed panel rectangle and countdown", () => {
    const panels = EXPECTED_IDS.map((id) => [
      id,
      ...(getShutterRepairedLevel(id).shutters ?? []).filter(isOrdinaryShutter)
        .map(({ id: shutterId, x, y, width, height, count }) => (
          `${shutterId}:${x},${y},${width},${height},${count}`
        )),
    ]);
    expect(hash(panels)).toBe(PANEL_GEOMETRY_SHA256);
  });

  it("has no display/reservation mismatch in all 200 levels", () => {
    const issues = LEVELS.flatMap((level) => auditOrdinaryShutterCoverage(level)
      .filter(({ kind }) => kind !== "missing-hidden-cohort"));
    expect(issues).toEqual([]);
  });

  it.each(EXPECTED_IDS)("keeps Lv%i valid with a real multi-cell opening", (levelId) => {
    const level = getShutterRepairedLevel(levelId);
    expect(() => validateLevel(level)).not.toThrow();
    const closed = new Set((level.shutters ?? [])
      .filter(({ count }) => count > 0)
      .map(({ id }) => id));
    const queued = new Set((level.generators ?? []).flatMap(({ queueBlockIds }) => queueBlockIds));
    const visible = level.blocks.filter((block) => (
      !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId))
    ));
    expect(visible.length).toBeGreaterThanOrEqual(3);
    if (levelId === 71) {
      expect(visible.map(({ id }) => id).sort()).toEqual([
        "cc-piece-s1-02", "cc-piece-s1-10", "cc-piece-s3-04",
      ]);
    }
    expect((level.shutters ?? []).filter(isOrdinaryShutter)
      .every(({ width, height }) => width * height > 1)).toBe(true);
  });

  it("keeps every repaired level's authored generators on its verified queue policy", () => {
    const lv41QueueOrder = [
      ["cc-041-b2-02", "cc-041-b2-03", "cc-041-b2-01"],
      ["cc-041-b3-03", "cc-041-b3-01", "cc-041-b3-02"],
    ];
    const verifiedSpawns: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
      41: [[1, 4], [0, 5]], 46: [[2, 1], [3, 4]], 49: [[2, 3], [2, 3]],
      57: [[0, 2]], 71: [[2, 6]],
    };
    for (const levelId of [41, 44, 46, 49, 57, 62, 71, 89, 116, 127]) {
      const before = LEVELS_BEFORE_SHUTTER_REGION_REPAIR[levelId - 1]!;
      const after = getShutterRepairedLevel(levelId);
      expect(after.generators?.map(({ id }) => id)).toEqual(before.generators?.map(({ id }) => id));
      for (const [index, generator] of (after.generators ?? []).entries()) {
        const sourceGenerator = before.generators?.[index];
        const expectedQueue = levelId === 41
          ? lv41QueueOrder[index]
          : sourceGenerator?.queueBlockIds;
        expect(generator.queueBlockIds, `Lv${levelId} ${generator.id}`).toEqual(expectedQueue);
        expect(generator.spawn, `Lv${levelId} ${generator.id} spawn`).toEqual(
          verifiedSpawns[levelId]?.[index] ?? sourceGenerator?.spawn,
        );
        const { queueBlockIds: _sourceQueue, spawn: _sourceSpawn, ...sourceContract } = sourceGenerator!;
        const { queueBlockIds: _runtimeQueue, spawn: _runtimeSpawn, ...runtimeContract } = generator;
        expect(runtimeContract, `Lv${levelId} ${generator.id} non-cargo contract`).toEqual(sourceContract);
        expect(new Set(generator.queueBlockIds), `Lv${levelId} ${generator.id} cargo`).toEqual(
          new Set(sourceGenerator?.queueBlockIds),
        );
        for (const blockId of generator.queueBlockIds) {
          const block = after.blocks.find(({ id }) => id === blockId);
          expect(block, `Lv${levelId} ${generator.id} queue ${blockId}`).toBeDefined();
          expect(block?.shutterId, `Lv${levelId} ${generator.id} queue ${blockId}`).toBeUndefined();
        }
      }
    }
  });

  it("preserves every compatible source ice, lock and arrow-axis field", () => {
    for (const levelId of EXPECTED_IDS) {
      const before = LEVELS_BEFORE_SHUTTER_REGION_REPAIR[levelId - 1]!;
      const afterById = new Map(getShutterRepairedLevel(levelId).blocks.map((block) => [block.id, block]));
      for (const source of before.blocks) {
        const repaired = afterById.get(source.id)!;
        const drop = METADATA_DROP[`${levelId}:${source.id}`] ?? 0;
        expect(repaired.frozen, `Lv${levelId} ${source.id} frozen`).toBe(drop & 1 ? undefined : source.frozen);
        expect(repaired.lockedBy, `Lv${levelId} ${source.id} lockedBy`).toBe(drop & 2 ? undefined : source.lockedBy);
        expect(repaired.lockCount, `Lv${levelId} ${source.id} lockCount`).toBe(drop & 2 ? undefined : source.lockCount);
        expect(repaired.movementAxis, `Lv${levelId} ${source.id} movementAxis`).toBe(
          drop & 4 ? undefined : source.movementAxis,
        );
      }
    }
  });

  it("does not discard unrelated grid, door, lift or conveyor mechanisms", () => {
    for (const levelId of EXPECTED_IDS) {
      const before = LEVELS_BEFORE_SHUTTER_REGION_REPAIR[levelId - 1]!;
      const after = getShutterRepairedLevel(levelId);
      expect(after.coloredGrids, `Lv${levelId} coloredGrids`).toEqual(before.coloredGrids);
      expect(after.flipDoors, `Lv${levelId} flipDoors`).toEqual(before.flipDoors);
      expect(after.elevators, `Lv${levelId} elevators`).toEqual(before.elevators);
      expect(after.conveyors, `Lv${levelId} conveyors`).toEqual(before.conveyors);
    }
  });

  it("preserves the source irregular-board cells and expands only the Lv158 fallback to a rectangle", () => {
    for (const levelId of EXPECTED_IDS) {
      const before = LEVELS_BEFORE_SHUTTER_REGION_REPAIR[levelId - 1]!;
      const after = getShutterRepairedLevel(levelId);
      if (levelId === 158) {
        expect(after.playable).toBeUndefined();
        expect(componentCount(Array.from({ length: after.width * after.height }, (_, index) => (
          [index % after.width, Math.floor(index / after.width)] as const
        )))).toBe(1);
        continue;
      }
      const repairedCells = new Set(after.playable?.map(([x, y]) => `${x},${y}`));
      for (const [x, y] of before.playable ?? []) {
        expect(repairedCells.has(`${x},${y}`), `Lv${levelId} source cell ${x},${y}`).toBe(true);
      }
      expect(repairedCells.size).toBeLessThanOrEqual(after.width * after.height);
      expect(componentCount(after.playable ?? [])).toBe(
        levelId === 72 ? 2 : componentCount(before.playable ?? []),
      );
      if (levelId === 72) {
        const sourceCells = new Set(before.playable?.map(([x, y]) => `${x},${y}`));
        expect([...repairedCells].filter((key) => !sourceCells.has(key)).sort()).toEqual([
          "0,11", "0,12", "0,7", "1,11", "1,12", "1,7",
        ]);
      }
    }
  });

  it("locks Lv72's source-observed isolated pink chamber instead of silently bridging it", () => {
    const level = getShutterRepairedLevel(72);
    const playable = new Set(level.playable?.map(([x, y]) => `${x},${y}`));
    expect(playable.size).toBe(81);
    expect(componentCount(level.playable ?? [])).toBe(2);
    expect(["0,11", "1,11", "0,12", "1,12"].every((cell) => playable.has(cell))).toBe(true);
    expect(["2,11", "2,12", "3,12"].every((cell) => !playable.has(cell))).toBe(true);
    expect(level.blocks.find(({ id }) => id === "cc-072-b1-01")).toMatchObject({
      x: 0, y: 6, shape: [[0, 0], [1, 0], [0, 1], [1, 1]], shutterId: "sr-72-0",
    });
    expect(level.blocks.find(({ id }) => id === "cc-072-b1-14")).toMatchObject({
      x: 0, y: 11, shape: [[0, 0], [1, 0], [0, 1]], shutterId: "sr-72-13",
    });
    expect(level.shutters?.find(({ id }) => id === "sr-72-0")).toMatchObject({ count: 3, skin: "staging" });
    expect(level.shutters?.find(({ id }) => id === "sr-72-13")).toMatchObject({ count: 9, skin: "staging" });
    expect(level.gates.find(({ id }) => id === "sr-gate-72-red")).toMatchObject({
      side: "left", offset: 6, size: 2,
    });
    expect(level.gates.find(({ id }) => id === "sr-gate-72-pink")).toMatchObject({
      side: "bottom", offset: 0, size: 2,
    });
    expect(level.generators ?? []).toEqual([]);
  });

  it("keeps all 31 repaired levels solver-complete and replayable", () => {
    for (const levelId of EXPECTED_IDS) {
      const level = getShutterRepairedLevel(levelId);
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.solved, `Lv${levelId}: ${solution.termination}`).toBe(true);
      const model = new PuzzleModel(level);
      for (const drag of solution.drags) {
        model.beginAction();
        for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
        if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
        expect(model.commitAction()).toBe(true);
      }
      expect(model.snapshot(), `Lv${levelId}`).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
    }
  }, 180_000);
});
