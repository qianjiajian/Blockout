// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateFlipDoorStructuralBatch,
  COMPETITOR_LATE_FLIP_DOOR_LV152_DOORS,
  COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BATCH_VERSION,
  COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BLOCKED_LEVEL_IDS,
  COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BLOCKERS,
  COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_LEVEL_IDS,
} from "../src/core/competitorLateFlipDoorStructuralBatch";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BATCH,
} from "../src/core/levels";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  import.meta.url,
), "utf8"));
const contract = extractCompetitorMechanismCountContracts(truth)
  .find((candidate) => candidate.levelId === 152)!;

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId)) return false;
    model.beginAction();
    for (const [x, y] of drag.path) {
      const block = model.getBlock(drag.blockId);
      if (!block) return false;
      const moved = Math.abs(block.x - x) + Math.abs(block.y - y) === 1
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

const openingAdjacencyIssues = (level: LevelSpec): string[] => {
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks) for (const [dx, dy] of block.shape) {
    occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [key, block] of occupied) {
    const [x, y] = key.split(",").map(Number);
    for (const [ox, oy] of [[1, 0], [0, 1]] as const) {
      const other = occupied.get(`${x + ox},${y + oy}`);
      if (other && other.id !== block.id
        && (other.layers?.[0] ?? other.color) === (block.layers?.[0] ?? block.color)) {
        issues.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...issues];
};

const withoutColourPayload = ({ color: _color, layers: _layers, ...block }: BlockSpec) => block;

describe(`competitor late Flip Door structural batch ${COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BATCH_VERSION}`, () => {
  const source = LEVELS_BEFORE_COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BATCH[151]!;
  const repaired = applyCompetitorLateFlipDoorStructuralBatch(source);

  it("accepts only Lv152 and leaves unresolved source gaps explicit", () => {
    expect(COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_LEVEL_IDS).toEqual([152]);
    expect(COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BLOCKED_LEVEL_IDS).toEqual([60, 151, 163]);
    expect(Object.keys(COMPETITOR_LATE_FLIP_DOOR_STRUCTURAL_BLOCKERS).map(Number)).toEqual([60, 151, 163]);
    expect(applyCompetitorLateFlipDoorStructuralBatch(LEVELS[150]!)).toBe(LEVELS[150]);
    expect(applyCompetitorLateFlipDoorStructuralBatch(LEVELS[162]!)).toBe(LEVELS[162]);
  });

  it("projects the four frame-recorded rails/states and five exact shell pairs", () => {
    expect(repaired.gates).toEqual([]);
    expect(repaired.flipDoors).toEqual(COMPETITOR_LATE_FLIP_DOOR_LV152_DOORS);
    expect(repaired.blocks.filter((block) => (block.layers?.length ?? 1) > 1)
      .map((block) => [block.id, block.layers])).toEqual([
      ["lv152-opening-b01", ["blue", "yellow"]],
      ["lv152-opening-b02", ["blue", "green"]],
      ["lv152-opening-b03", ["red", "green"]],
      ["lv152-opening-b04", ["yellow", "red"]],
      ["lv152-opening-b05", ["yellow", "red"]],
    ]);
    expect(repaired.blocks.find((block) => block.id === "lv152-opening-b06"))
      .toMatchObject({ color: "blue", movementAxis: "vertical" });
    expect(compareCompetitorMechanismCountContract(repaired, contract).issues).toEqual([]);
  });

  it("preserves geometry and unrelated payloads, stays adjacency-clean, and is idempotent", () => {
    expect({ ...repaired, blocks: undefined, gates: undefined, flipDoors: undefined })
      .toEqual({ ...source, blocks: undefined, gates: undefined, flipDoors: undefined });
    expect(repaired.blocks.map(withoutColourPayload)).toEqual(source.blocks.map(withoutColourPayload));
    expect(openingAdjacencyIssues(repaired)).toEqual([]);
    expect(applyCompetitorLateFlipDoorStructuralBatch(repaired)).toEqual(repaired);
    expect(LEVELS[151]).toEqual(repaired);
    expect(() => validateLevel(repaired)).not.toThrow();
  });

  it("fresh-solves within 30k states and independently replays to completion", () => {
    const solution = solveLevelForValidation(repaired, 30_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBeLessThanOrEqual(30_000);
    expect(replay(repaired, solution.drags)).toBe(true);
  }, 60_000);
});
