// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { boardCellsSeparatedBySeam } from "../src/core/boardSeams";
import {
  BOARD_TOPOLOGY_REPAIR_LEVEL_IDS,
  applyBoardTopologyRepair,
} from "../src/core/boardTopologyRepairs";
import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { solveLevelForValidation } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR,
  LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR,
} from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const key = (x: number, y: number): string => `${x},${y}`;
const neighbours = (x: number, y: number): Point[] => [
  [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
];
const fullRectangle = (level: Pick<LevelSpec, "width" | "height">): Point[] => Array.from(
  { length: level.height },
  (_, y) => Array.from({ length: level.width }, (__, x) => [x, y] as const),
).flat();

const truthPaths = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
];
const expectedComponentCounts = new Map<number, number>(truthPaths.flatMap((path) => {
  const truth = JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
  return (truth.levels ?? []).map((record: { level: number; board?: { source_component_count?: number } }) => [
    Number(record.level),
    Number(record.board?.source_component_count) || 1,
  ] as const);
}));

const topologyIssues = (
  level: LevelSpec,
  expectedComponents = 1,
  enforceComponentCount = true,
): string[] => {
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => key(x, y)));
  const playable = new Set((level.playable ?? fullRectangle(level))
    .map(([x, y]) => key(x, y)).filter((cell) => !blocked.has(cell)));
  const remaining = new Set(playable);
  let playableComponents = 0;
  while (remaining.size) {
    playableComponents += 1;
    const queue = [remaining.values().next().value!];
    remaining.delete(queue[0]!);
    while (queue.length) {
      const [x, y] = queue.shift()!.split(",").map(Number);
      for (const [nx, ny] of neighbours(x!, y!)) {
        const next = key(nx, ny);
        if (boardCellsSeparatedBySeam(level, [x!, y!], [nx, ny])) continue;
        if (remaining.delete(next)) queue.push(next);
      }
    }
  }

  const exterior = new Set([key(-1, -1)]);
  const queue = [key(-1, -1)];
  while (queue.length) {
    const [x, y] = queue.shift()!.split(",").map(Number);
    for (const [nx, ny] of neighbours(x!, y!)) {
      if (nx < -1 || ny < -1 || nx > level.width || ny > level.height) continue;
      const next = key(nx, ny);
      const outside = nx < 0 || ny < 0 || nx >= level.width || ny >= level.height;
      if ((outside || !playable.has(next)) && !exterior.has(next)) {
        exterior.add(next);
        queue.push(next);
      }
    }
  }
  const enclosed = fullRectangle(level).filter(([x, y]) => (
    !playable.has(key(x, y)) && !exterior.has(key(x, y))
  ));
  return [
    ...(blocked.size ? [`${blocked.size} blocked cells`] : []),
    ...(enforceComponentCount && playableComponents !== expectedComponents
      ? [`${playableComponents} playable components`]
      : []),
    ...(enclosed.length ? [`${enclosed.length} enclosed void cells`] : []),
  ];
};

const outerColor = (block: BlockSpec): BlockSpec["color"] => block.layers?.[0] ?? block.color;
const openingAdjacency = (level: LevelSpec): string[] => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const blocks = level.blocks.filter((block) => !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId)));
  const occupants = new Map<string, BlockSpec[]>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const cell = key(block.x + dx, block.y + dy);
    occupants.set(cell, [...(occupants.get(cell) ?? []), block]);
  }
  const violations = new Set<string>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx;
    const y = block.y + dy;
    for (const [stepX, stepY] of [[1, 0], [0, 1]] as const) {
      for (const neighbour of occupants.get(key(x + stepX, y + stepY)) ?? []) {
        if (block.id !== neighbour.id && outerColor(block) === outerColor(neighbour)) {
          violations.add([block.id, neighbour.id].sort().join("|"));
        }
      }
    }
  }
  return [...violations];
};

const generatorGameplayContract = (level: LevelSpec): unknown => level.generators?.map(({
  side: _side,
  offset: _offset,
  rimSpan: _rimSpan,
  rimMount: _rimMount,
  rimAnchor: _rimAnchor,
  ...generator
}) => generator);

const generatorBoardContract = (level: LevelSpec): unknown => level.generators?.map(({
  spawn: _spawn,
  ...generator
}) => generator);

const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedIntervals = (level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0));
  const tickDuration = timedIntervals.length ? Math.max(...timedIntervals) : 0;
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && tickDuration > 0) model.tick(tickDuration);
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
    if (tickDuration > 0) model.tick(tickDuration);
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe("outline-only board topology repairs", () => {
  it("identifies the complete current topology-repair scope", () => {
    expect(BOARD_TOPOLOGY_REPAIR_LEVEL_IDS).toEqual([
      24, 25, 26, 27, 30, 33, 43, 46, 47, 48, 59, 61, 71, 72, 83, 84,
      114, 115, 130, 156, 176, 179, 195,
    ]);
    expect(LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR.filter((level) => topologyIssues(level).length).map((level) => level.id)).toEqual(
      BOARD_TOPOLOGY_REPAIR_LEVEL_IDS,
    );
    expect(LEVELS.flatMap((level) => topologyIssues(
      level,
      expectedComponentCounts.get(level.id) ?? 1,
      false,
    ))).toEqual([]);
  });

  it("removes every wall, enclosed void and split island without changing gameplay contracts", () => {
    const repairedCampaign = LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR.map(applyBoardTopologyRepair);
    expect(repairedCampaign.flatMap((level) => topologyIssues(level).map((issue) => `Lv${level.id}: ${issue}`))).toEqual([]);
    for (const levelId of BOARD_TOPOLOGY_REPAIR_LEVEL_IDS) {
      const source = LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR.find((level) => level.id === levelId)!;
      const repaired = applyBoardTopologyRepair(source);
      // Assert this layer at its immediate pipeline boundary. Later final
      // overlays intentionally refine outlines and generator mouths.
      const production = LEVELS_BEFORE_SHUTTER_GEOMETRY_COVERAGE_REPAIR.find((level) => level.id === levelId)!;
      expect({
        width: production.width,
        height: production.height,
        playable: production.playable,
        blocked: production.blocked,
        generators: generatorBoardContract(production),
      }, `Lv${levelId} production board integration`).toEqual({
        width: repaired.width,
        height: repaired.height,
        playable: repaired.playable,
        blocked: repaired.blocked,
        generators: generatorBoardContract(repaired),
      });
      expect(repaired.blocks, `Lv${levelId} blocks`).toEqual(source.blocks);
      expect(repaired.gates, `Lv${levelId} gates`).toEqual(source.gates);
      expect(repaired.flipDoors, `Lv${levelId} flip doors`).toEqual(source.flipDoors);
      expect(repaired.shutters, `Lv${levelId} shutters`).toEqual(source.shutters);
      expect(generatorGameplayContract(repaired), `Lv${levelId} generator queues/spawns`).toEqual(
        generatorGameplayContract(source),
      );
      expect(openingAdjacency(repaired), `Lv${levelId} opening adjacency`).toEqual([]);
      expect(finalGeneratorPlacementIssues(repaired), `Lv${levelId} generator rim`).toEqual([]);
      expect(() => validateLevel(repaired)).not.toThrow();
      expect(applyBoardTopologyRepair(repaired)).toEqual(repaired);
    }
  });

  it("fresh-solves and independently replays every changed level at the 20k bound", () => {
    for (const levelId of BOARD_TOPOLOGY_REPAIR_LEVEL_IDS) {
      // Later certified overlays refine several repaired boards. Exercise the
      // authoritative final runtime here while the preceding test checks this
      // layer exactly at its immediate pipeline boundary.
      const level = LEVELS[levelId - 1]!;
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons, `Lv${levelId} static`).toEqual([]);
      expect(solution.solved, `Lv${levelId} ${solution.termination} ${solution.exploredStates} states`).toBe(true);
      expect(replay(level, solution.drags), `Lv${levelId} PuzzleModel replay`).toBe(true);
    }
  }, 30_000);
});
