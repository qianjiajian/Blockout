// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  auditCompetitorMechanismCountContracts,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import { solveLevelForValidation } from "../src/core/levelSolver";
import {
  LEVELS_BEFORE_BOARD_TOPOLOGY_REPAIR as STRUCTURAL_LEVELS,
  LEVELS_BEFORE_MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR as BASE_LEVELS,
} from "../src/core/levels";
import {
  applyMechanismAttributeStructuralRepair,
  MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR_LEVEL_IDS,
  STRUCTURAL_AXIS_BLOCKED_LEVEL_IDS,
  STRUCTURAL_COLORED_GRID_BLOCKED_LEVEL_IDS,
  STRUCTURAL_LOCK_BLOCKED_LEVEL_IDS,
  STRUCTURAL_NUMERIC_ICE_BLOCKED_LEVEL_IDS,
} from "../src/core/mechanismAttributeStructuralRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const contracts = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
].flatMap((path) => extractCompetitorMechanismCountContracts(
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")),
));

const openingVisibleBlocks = (level: LevelSpec): BlockSpec[] => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? [])
    .filter((shutter) => shutter.count > 0)
    .map((shutter) => shutter.id));
  return level.blocks.filter((block) => !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId)));
};

const adjacencyViolations = (level: LevelSpec): string[] => {
  const blocks = openingVisibleBlocks(level);
  const occupied = new Map<string, BlockSpec[]>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const key = `${block.x + dx},${block.y + dy}`;
    occupied.set(key, [...(occupied.get(key) ?? []), block]);
  }
  const pairs = new Set<string>();
  for (const block of blocks) {
    const color = block.layers?.[0] ?? block.color;
    for (const [sx, sy] of block.shape) for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      for (const neighbour of occupied.get(`${block.x + sx + dx},${block.y + sy + dy}`) ?? []) {
        if (block.id === neighbour.id || (neighbour.layers?.[0] ?? neighbour.color) !== color) continue;
        pairs.add([block.id, neighbour.id].sort().join("|"));
      }
    }
  }
  return [...pairs];
};

const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const intervals = (level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0));
  const tick = intervals.length ? Math.max(...intervals) : 0;
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && tick) model.tick(tick);
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return false;
      const moved = Math.abs(before.x - x) + Math.abs(before.y - y) === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
    if (tick) model.tick(tick);
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

const sortedIssueLevelIds = (issues: ReturnType<typeof auditCompetitorMechanismCountContracts>[number]["issues"]): number[] => (
  [...new Set(issues.map((issue) => issue.levelId))].sort((left, right) => left - right)
);

describe("mechanism attribute structural safe subset", () => {
  const repaired = BASE_LEVELS.map(applyMechanismAttributeStructuralRepair);

  it("matches every declared safe quantity and leaves only proven blockers", () => {
    const issues = auditCompetitorMechanismCountContracts(repaired, contracts)
      .flatMap((record) => record.issues)
      .filter((issue) => issue.levelId !== 19 && issue.levelId !== 20);
    expect(sortedIssueLevelIds(issues.filter((issue) => (
      issue.field === "numericIceCount" || issue.field === "numericIceValues"
    )))).toEqual([...STRUCTURAL_NUMERIC_ICE_BLOCKED_LEVEL_IDS]);
    expect(sortedIssueLevelIds(issues.filter((issue) => issue.field === "axisBlockCount")))
      .toEqual([...STRUCTURAL_AXIS_BLOCKED_LEVEL_IDS]);
    expect(sortedIssueLevelIds(issues.filter((issue) => (
      issue.field === "lockCount" || issue.field === "lockRequirements"
    )))).toEqual([...STRUCTURAL_LOCK_BLOCKED_LEVEL_IDS]);
    expect(sortedIssueLevelIds(issues.filter((issue) => issue.field === "coloredGridCellCount")))
      .toEqual([...STRUCTURAL_COLORED_GRID_BLOCKED_LEVEL_IDS]);
  });

  it("preserves opening cohort, identities, exits, shutters, and generators", () => {
    for (const levelId of MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR_LEVEL_IDS) {
      const before = BASE_LEVELS.find((level) => level.id === levelId)!;
      const after = applyMechanismAttributeStructuralRepair(before);
      expect(after).toEqual(STRUCTURAL_LEVELS.find((level) => level.id === levelId));
      expect(after.blocks.map((block) => block.id), `Lv${levelId} block ids`)
        .toEqual(before.blocks.map((block) => block.id));
      expect(after.blocks).toHaveLength(before.blocks.length);
      expect(openingVisibleBlocks(after).map((block) => block.id), `Lv${levelId} opening cohort`)
        .toEqual(openingVisibleBlocks(before).map((block) => block.id));
      expect(after.gates).toEqual(before.gates);
      expect(after.flipDoors).toEqual(before.flipDoors);
      expect(after.shutters).toEqual(before.shutters);
      expect(after.generators).toEqual(before.generators);
      expect(() => validateLevel(after), `Lv${levelId}`).not.toThrow();
    }
  });

  it("keeps all 200 openings free of same-colour orthogonal contacts", () => {
    expect(repaired.flatMap((level) => adjacencyViolations(level).map((pair) => `Lv${level.id}:${pair}`))).toEqual([]);
  });

  it("solves and replays every repaired level within 20,000 states", () => {
    for (const levelId of MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR_LEVEL_IDS) {
      const level = repaired.find((candidate) => candidate.id === levelId)!;
      const result = solveLevelForValidation(level, 20_000);
      expect(result.staticUnsatReasons, `Lv${levelId}`).toEqual([]);
      expect(result.solved, `Lv${levelId} ${result.termination}/${result.exploredStates}`).toBe(true);
      expect(replay(level, result.drags), `Lv${levelId} replay`).toBe(true);
    }
  });

  it("restores the canonical Lv200 red grid without moving an opening block", () => {
    const level = repaired.find((candidate) => candidate.id === 200)!;
    expect(level.coloredGrids).toEqual([{
      id: "mechanism-attribute-grid-200",
      color: "red",
      cells: Array.from({ length: 12 }, (_, index) => [index % 6, 4 + Math.floor(index / 6)]),
    }]);
    expect(level.blocks.find((block) => block.id === "lv200-opening-b04"))
      .toEqual(expect.objectContaining({ x: 0, y: 6, shutterId: "solvability-minimal-stage-200-1" }));
  });
});
