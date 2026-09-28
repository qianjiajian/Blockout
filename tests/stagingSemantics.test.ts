import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { shutterHasPhysicalFootprint, type LevelSpec, type ShutterSpec } from "../src/core/types";
import { createContinuousCollisionValidator } from "../src/game/continuousDrag";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

const fullBoard = (width: number, height: number) => Array.from(
  { length: height },
  (_, y) => Array.from({ length: width }, (__, x) => [x, y] as const),
).flat();

const collisionFixture = (skin: ShutterSpec["skin"]): LevelSpec => ({
  id: 996,
  name: "staging collision fixture",
  difficulty: "normal",
  timeSeconds: 180,
  reward: 0,
  width: 4,
  height: 3,
  playable: [[0, 1], [1, 1], [2, 1], [3, 1]],
  gates: [{ id: "red-right", side: "right", offset: 1, size: 1, color: "red" }],
  shutters: [{ id: "cover", x: 1, y: 1, width: 1, height: 1, count: 2, skin }],
  blocks: [{ id: "red", x: 0, y: 1, shape: [[0, 0]], color: "red" }],
});

describe("internal staging semantics", () => {
  it("lets a block move through an internal staging footprint without changing its release count", () => {
    const model = new PuzzleModel(collisionFixture("staging"));
    const block = model.getBlock("red")!;
    expect(block).toMatchObject({ color: "red", x: 0, y: 1 });
    expect(model.snapshot().shutters).toMatchObject([{ id: "cover", skin: "staging", count: 2 }]);

    expect(model.canPlace(block, 1, 1)).toBe(true);
    expect(createContinuousCollisionValidator(model.snapshot(), block.id)(1, 1)).toBe(true);
    model.beginAction();
    expect(model.moveBlockStep(block.id, 1, 1)).toBe(true);
    expect(model.commitAction()).toBe(true);

    expect(model.getBlock(block.id)).toMatchObject({ x: 1, y: 1 });
    expect(model.snapshot().moves).toBe(1);
    expect(model.snapshot().shutters).toMatchObject([{ id: "cover", skin: "staging", count: 2 }]);
  });

  it.each([
    [undefined, false],
    ["shutter", false],
    ["generator", false],
    ["staging", true],
  ] as const)("keeps %s collision consistent between integer and continuous movement", (skin, expected) => {
    const model = new PuzzleModel(collisionFixture(skin));
    const block = model.getBlock("red")!;
    expect(model.canPlace(block, 1, 1)).toBe(expected);
    expect(createContinuousCollisionValidator(model.snapshot(), block.id)(1, 1)).toBe(expected);
  });

  it.each([
    [undefined, false],
    ["shutter", false],
    ["generator", false],
    ["staging", true],
  ] as const)("keeps %s collision consistent in the solver", (skin, expectedSolved) => {
    const level = collisionFixture(skin);
    const solution = solveLevelForValidation(level, 10_000);
    expect(solution.solved).toBe(expectedSolved);
    if (!solution.solved) return;

    const model = new PuzzleModel(level);
    for (const drag of solution.drags) {
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide)).toMatchObject({ ok: true });
      expect(model.commitAction()).toBe(true);
    }
    expect(model.snapshot().complete).toBe(true);
  });

  it("does not let Pulse or an outer-shell clear release a future staging batch early", () => {
    const fixture: LevelSpec = {
      id: 995,
      name: "staging release fixture",
      difficulty: "normal",
      timeSeconds: 180,
      reward: 0,
      width: 3,
      height: 3,
      playable: fullBoard(3, 3),
      gates: [
        { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
        { id: "blue-left", side: "left", offset: 0, size: 1, color: "blue" },
        { id: "green-bottom", side: "bottom", offset: 2, size: 1, color: "green" },
      ],
      shutters: [
        { id: "stage", x: 1, y: 1, width: 1, height: 1, count: 1, skin: "staging" },
        { id: "visible", x: 1, y: 2, width: 1, height: 1, count: 2, skin: "shutter" },
      ],
      blocks: [
        { id: "layered", x: 0, y: 0, shape: [[0, 0]], color: "red", layers: ["red", "blue"] },
        { id: "future", x: 2, y: 2, shape: [[0, 0]], color: "green", shutterId: "stage" },
      ],
    };
    const model = new PuzzleModel(fixture);

    expect(model.thawAll(2)).toBe(true);
    expect(model.snapshot().shutters.find((shutter) => shutter.id === "stage")?.count).toBe(1);
    expect(model.snapshot().shutters.find((shutter) => shutter.id === "visible")?.count).toBe(0);
    expect(model.isBlockActive(model.getBlock("future")!)).toBe(false);

    expect(model.tryExit("layered", "top")).toMatchObject({ ok: true, layerRemoved: true });
    expect(model.snapshot().shutters.find((shutter) => shutter.id === "stage")?.count).toBe(1);
    expect(model.isBlockActive(model.getBlock("future")!)).toBe(false);

    expect(model.tryExit("layered", "left")).toMatchObject({ ok: true, complete: false });
    expect(model.snapshot().shutters.find((shutter) => shutter.id === "stage")?.count).toBe(0);
    expect(model.isBlockActive(model.getBlock("future")!)).toBe(true);
  });

  it("keeps every opening integer placement in parity with continuous drag across the original 100 levels", () => {
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100) {
      const model = new PuzzleModel(level);
      const snapshot = model.snapshot();
      for (const block of snapshot.blocks) {
        if (!model.isBlockActive(model.getBlock(block.id)!)) continue;
        const continuous = createContinuousCollisionValidator(snapshot, block.id);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const x = block.x + dx;
          const y = block.y + dy;
          expect(
            continuous(x, y),
            `Lv${level.id} ${block.id} continuous pose at ${x},${y}`,
          ).toBe(model.canPlace(model.getBlock(block.id)!, x, y));
        }
      }
    }
  });

  it("locks the all-season staging release invariant", () => {
    const stagingIdsByLevel = new Map(VIDEO_PARITY_LEVELS_1_TO_100.map((level) => [
      level.id,
      new Set(level.blocks.map((block) => block.shutterId).filter((id): id is string => Boolean(id))),
    ]));
    const isActiveStaging = (level: LevelSpec, shutter: ShutterSpec): boolean => (
      shutter.skin === "staging" && stagingIdsByLevel.get(level.id)?.has(shutter.id) === true
    );
    const stagingLevels = VIDEO_PARITY_LEVELS_1_TO_100.filter((level) => (
      level.shutters?.some((shutter) => isActiveStaging(level, shutter))
    ));
    const stagingShutters = stagingLevels.flatMap((level) => (
      (level.shutters ?? []).filter((shutter) => isActiveStaging(level, shutter))
    ));
    const physicalShutters = VIDEO_PARITY_LEVELS_1_TO_100.flatMap((level) => (
      (level.shutters ?? []).filter(shutterHasPhysicalFootprint).map((shutter) => [level.id, shutter.id] as const)
    ));
    const generators = VIDEO_PARITY_LEVELS_1_TO_100.flatMap((level) => (
      (level.generators ?? []).map((generator) => [level.id, generator.id] as const)
    ));
    const footprintKeys = new Set<string>();

    expect(stagingLevels).toHaveLength(39);
    expect(stagingShutters).toHaveLength(513);
    expect(physicalShutters.map(([levelId]) => levelId)).toEqual([
      20, 21, 21, 21, 22, 23, 23, 24, 26, 27, 28, 28, 29, 30, 34, 37, 38, 39, 40,
      41, 41, 44, 44, 44, 44, 44, 46, 46, 46, 48, 49, 49, 49, 54, 54, 54, 54, 55,
      57, 57, 59, 61, 62, 64, 67, 68, 69, 69, 69, 69, 71, 72, 73, 74, 74, 74, 74,
      79, 79, 83, 84, 84, 84, 84, 89, 89, 91, 91, 92, 93, 93, 94, 94, 94, 94, 95,
      98, 98, 99, 99, 99,
    ]);
    expect(generators.map(([levelId]) => levelId)).toEqual([
      35, 35, 36, 36, 36, 37, 38, 39, 41, 41, 43, 43, 43, 43, 43, 43, 44, 46, 46,
      47, 47, 49, 49, 56, 57, 58, 62, 70, 71, 77, 87, 87, 88, 88, 89, 90, 90,
    ]);
    for (const level of stagingLevels) {
      const shutters = level.shutters ?? [];
      const countById = new Map(shutters.map((shutter) => [shutter.id, shutter.count]));
      for (const shutter of shutters.filter((candidate) => isActiveStaging(level, candidate))) {
        expect(shutterHasPhysicalFootprint(shutter), `Lv${level.id} ${shutter.id}`).toBe(false);
        const predecessors = level.blocks.filter((block) => (
          !block.shutterId || (countById.get(block.shutterId) ?? Number.POSITIVE_INFINITY) < shutter.count
        ));
        expect(
          predecessors.length,
          `Lv${level.id} ${shutter.id} reachable predecessor count`,
        ).toBeGreaterThanOrEqual(shutter.count);

        const ownStageCells = new Set<string>();
        for (const block of level.blocks.filter((candidate) => candidate.shutterId === shutter.id)) {
          for (const [dx, dy] of block.shape) {
            const key = `${block.x + dx},${block.y + dy}`;
            expect(ownStageCells.has(key), `Lv${level.id} ${shutter.id} overlapping spawn cell ${key}`).toBe(false);
            ownStageCells.add(key);
          }
        }
        for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
          for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) footprintKeys.add(`${level.id}:${x},${y}`);
        }
      }
    }
    expect(footprintKeys).toHaveLength(40);
  });
});
