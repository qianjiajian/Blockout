// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorLevel75ShellRepair,
  COMPETITOR_LEVEL_75_SHELL_CONTRACTS,
  COMPETITOR_LEVEL_75_SHELL_REPAIR_LEVEL_IDS,
} from "../src/core/competitorLevel75ShellRepair";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
} from "../src/core/competitorMechanismCountContract";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LEVEL_75_SHELL_REPAIR,
} from "../src/core/levels";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const source = (): LevelSpec => LEVELS_BEFORE_COMPETITOR_LEVEL_75_SHELL_REPAIR[74]!;
const repaired = (): LevelSpec => applyCompetitorLevel75ShellRepair(source());
const outerColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const truth = JSON.parse(readFileSync(
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  "utf8",
).replace(/^\uFEFF/, ""));
const contract = extractCompetitorMechanismCountContracts(truth).find(({ levelId }) => levelId === 75)!;

const openingAdjacency = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [key, block] of occupied) {
    const [x, y] = key.split(",").map(Number) as [number, number];
    for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
      const other = occupied.get(`${x + dx},${y + dy}`);
      if (other && other.id !== block.id && outerColor(other) === outerColor(block)) {
        issues.add([block.id, other.id].sort().join("/"));
      }
    }
  }
  return [...issues].sort();
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const before = model.getBlock(drag.blockId);
      if (!before) return false;
      const distance = Math.abs(before.x - x) + Math.abs(before.y - y);
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      if (!moved) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe("competitor Lv75 nested-shell repair", () => {
  it("binds the two frame-proven opening carriers exactly", () => {
    expect(COMPETITOR_LEVEL_75_SHELL_REPAIR_LEVEL_IDS).toEqual([75]);
    const level = repaired();
    const opening = new Set(openingVisibleBlockIds(level));
    expect(COMPETITOR_LEVEL_75_SHELL_CONTRACTS).toEqual([
      {
        id: "cc-piece-s1-19",
        x: 0,
        y: 9,
        shape: [[0, 0], [0, 1], [1, 1]],
        layers: ["purple", "blue"],
      },
      {
        id: "cc-piece-s1-18",
        x: 5,
        y: 9,
        shape: [[0, 0], [1, 0], [0, 1], [1, 1]],
        layers: ["blue", "yellow"],
      },
    ]);
    for (const expected of COMPETITOR_LEVEL_75_SHELL_CONTRACTS) {
      const block = level.blocks.find(({ id }) => id === expected.id)!;
      expect(opening.has(block.id), block.id).toBe(true);
      expect({ x: block.x, y: block.y, shape: block.shape, layers: block.layers }, block.id)
        .toEqual({ x: expected.x, y: expected.y, shape: expected.shape, layers: expected.layers });
      expect(block.color, `${block.id} active outer colour`).toBe(expected.layers[0]);
    }
  });

  it("changes only the two source-backed layer carriers and is reference-idempotent", () => {
    expect(applyCompetitorLevel75ShellRepair(LEVELS[0]!)).toBe(LEVELS[0]);
    const before = source();
    const after = repaired();
    expect(LEVELS[74]).toEqual(after);
    expect(after).not.toBe(before);
    expect(applyCompetitorLevel75ShellRepair(after)).toBe(after);
    const affected = new Set(COMPETITOR_LEVEL_75_SHELL_CONTRACTS.map(({ id }) => id));
    for (const [index, block] of before.blocks.entries()) {
      if (!affected.has(block.id)) expect(after.blocks[index], block.id).toBe(block);
    }
    expect({ ...after, blocks: undefined }).toEqual({ ...before, blocks: undefined });
  });

  it("matches the exact shell count and keeps the opening adjacency clean", () => {
    const level = repaired();
    const facts = extractRuntimeMechanismCountFacts(level);
    expect(contract.facts.shellBlockCount).toBe(2);
    expect(facts.shellBlockCount).toBe(contract.facts.shellBlockCount);
    expect(compareCompetitorMechanismCountContract(level, contract).issues).toEqual([]);
    expect(level.blocks.filter((block) => (block.layers?.length ?? 1) > 1).map(({ id }) => id).sort())
      .toEqual(["cc-piece-s1-18", "cc-piece-s1-19"]);
    expect(openingAdjacency(level)).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it("fresh-solves and independently replays the repaired final runtime", () => {
    const level = repaired();
    const solution = solveLevelForValidation(level, 30_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBeLessThanOrEqual(30_000);
    expect(replay(level, solution.drags)).toBe(true);
  }, 180_000);
});
