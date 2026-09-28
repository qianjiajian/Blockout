// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditCompetitorMechanismCountContracts,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import {
  extractGeneratorTruthContracts,
  finalGeneratorPlacementIssues,
  finalGeneratorTruthIssues,
} from "../src/core/finalGeneratorContracts";
import { generatorSpawnAlignmentIssues } from "../src/core/generatorSpawnAlignmentRepairs";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_OPENING_COMPOSITION_BATCH_B_REPAIR,
} from "../src/core/levels";
import {
  applyOpeningCompositionBatchBRepair,
  OPENING_COMPOSITION_BATCH_B_BLOCKERS,
  OPENING_COMPOSITION_BATCH_B_COORDINATE_ADJUSTMENTS,
  OPENING_COMPOSITION_BATCH_B_LEVEL_IDS,
  OPENING_COMPOSITION_BATCH_B_LV127_SHA256,
  OPENING_COMPOSITION_BATCH_B_TARGETS,
  OPENING_COMPOSITION_BATCH_B_VERSION,
} from "../src/core/openingCompositionBatchBRepairs";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "../src/core/videoParityLevels101To200.generated";

const TRUTH = JSON.parse(readFileSync(
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
  "utf8",
).replace(/^\uFEFF/, ""));
const truth127 = TRUTH.levels.find((row: { level: number }) => row.level === 127);
const mechanism127 = extractCompetitorMechanismCountContracts(TRUTH).filter(({ levelId }) => levelId === 127);
const generator127 = extractGeneratorTruthContracts(TRUTH).filter(({ levelId }) => levelId === 127);
const source127 = VIDEO_PARITY_LEVELS_101_TO_200[127 - 101]!;
const preBatch127 = LEVELS_BEFORE_OPENING_COMPOSITION_BATCH_B_REPAIR[127 - 1]!;
const normalizedShape = (shape: BlockSpec["shape"]): Array<readonly [number, number]> => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY] as const)
    .sort(([ax, ay], [bx, by]) => ay - by || ax - bx);
};
const withoutPlacement = ({ x: _x, y: _y, shape, ...block }: BlockSpec): object => ({
  ...block,
  shape: normalizedShape(shape),
});
const outer = (block: BlockSpec): string => block.layers?.[0] ?? block.color;
const histogram = (values: readonly string[]): Record<string, number> => Object.fromEntries(
  [...values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map<string, number>())]
    .sort(([left], [right]) => left.localeCompare(right)),
);

const adjacencyIssues = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupants = new Map<string, BlockSpec>();
  const issues = new Set<string>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) for (const [dx, dy] of block.shape) {
    occupants.set(`${block.x + dx},${block.y + dy}`, block);
  }
  for (const [cell, block] of occupants) {
    const [x, y] = cell.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      const other = occupants.get(`${x! + dx},${y! + dy}`);
      if (other && other.id !== block.id && outer(other) === outer(block)) {
        issues.add([block.id, other.id].sort().join("|"));
      }
    }
  }
  return [...issues];
};

const replay = (level: LevelSpec, drags: readonly SolverDrag[]): boolean => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter(({ trigger }) => trigger === "time")
    .map(({ initialDelaySeconds, intervalSeconds }) => Math.max(initialDelaySeconds ?? 0, intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && timedInterval > 0) model.tick(timedInterval);
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
    if (timedInterval > 0) model.tick(timedInterval);
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe(`opening composition batch B ${OPENING_COMPOSITION_BATCH_B_VERSION}`, () => {
  it("publishes only the completely certified level and records every blocker", () => {
    expect(OPENING_COMPOSITION_BATCH_B_TARGETS).toEqual({
      121: 23, 127: 14, 128: 23, 129: 13, 131: 16, 133: 18, 143: 18, 144: 16,
    });
    expect(OPENING_COMPOSITION_BATCH_B_LEVEL_IDS).toEqual([127]);
    expect(Object.keys(OPENING_COMPOSITION_BATCH_B_BLOCKERS).map(Number)).toEqual([121, 128, 129, 131, 133, 143, 144]);
    expect(applyOpeningCompositionBatchBRepair(LEVELS[0]!)).toBe(LEVELS[0]);
    for (const reason of Object.values(OPENING_COMPOSITION_BATCH_B_BLOCKERS)) expect(reason.length).toBeGreaterThan(120);
  });

  it("restores Lv127 from the authoritative source without inventory, colour, shape, or mechanism substitutions", () => {
    const candidate = applyOpeningCompositionBatchBRepair(preBatch127);
    const openingIds = new Set(openingVisibleBlockIds(candidate));
    const opening = candidate.blocks.filter(({ id }) => openingIds.has(id));
    const sourceOpeningIds = new Set(openingVisibleBlockIds(source127));
    const sourceOpening = source127.blocks.filter(({ id }) => sourceOpeningIds.has(id));

    expect(() => validateLevel(candidate)).not.toThrow();
    expect(opening).toHaveLength(OPENING_COMPOSITION_BATCH_B_TARGETS[127]);
    expect(candidate.blocks).toHaveLength(truth127.composition.source_full_piece_count);
    expect(new Set(opening.map(outer)).size).toBe(truth127.composition.opening_color_count);
    expect(new Set(candidate.blocks.map(outer)).size).toBe(truth127.composition.full_color_count);
    expect(openingIds).toEqual(sourceOpeningIds);
    expect(candidate.blocks.map(withoutPlacement)).toEqual(source127.blocks.map(withoutPlacement));
    expect(histogram(opening.map((block) => JSON.stringify(block.shape))))
      .toEqual(histogram(sourceOpening.map((block) => JSON.stringify(block.shape))));
    expect(histogram(candidate.blocks.map((block) => JSON.stringify(normalizedShape(block.shape)))))
      .toEqual(histogram(source127.blocks.map((block) => JSON.stringify(normalizedShape(block.shape)))));
    expect(histogram(opening.map(outer))).toEqual(histogram(sourceOpening.map(outer)));
    expect(histogram(candidate.blocks.map(outer))).toEqual(histogram(source127.blocks.map(outer)));
    expect(candidate.gates).toEqual(source127.gates);
    expect(candidate.flipDoors).toEqual(source127.flipDoors);
    expect(candidate.shutters).toEqual(source127.shutters);
    expect(candidate.generators?.map(({ spawn: _spawn, ...generator }) => generator))
      .toEqual(source127.generators?.map(({ spawn: _spawn, ...generator }) => generator));
    expect(candidate.playable).toEqual(source127.playable);
    expect(candidate.blocked).toEqual(source127.blocked);
    expect(candidate.shutters?.map(({ id, skin, count }) => ({ id, skin, count }))).toEqual([
      { id: "lv127-cover-01", skin: "shutter", count: 14 },
      { id: "lv127-cover-02", skin: "shutter", count: 12 },
    ]);
    expect(candidate.blocks.filter(({ shutterId }) => shutterId)).toEqual([]);
    for (const block of opening) for (const [dx, dy] of block.shape) {
      const x = block.x + dx, y = block.y + dy;
      expect(candidate.shutters?.some((panel) => panel.count > 0
        && x >= panel.x && x < panel.x + panel.width
        && y >= panel.y && y < panel.y + panel.height), `${block.id}@${x},${y}`).toBe(false);
    }
    expect(adjacencyIssues(candidate)).toEqual([]);

    const changes = candidate.blocks.flatMap((block) => {
      const before = source127.blocks.find(({ id }) => id === block.id)!;
      return before.x === block.x && before.y === block.y
        ? [] : [{ id: block.id, from: [before.x, before.y], to: [block.x, block.y] }];
    });
    expect(changes).toEqual(Object.entries(OPENING_COMPOSITION_BATCH_B_COORDINATE_ADJUSTMENTS[127])
      .map(([id, { from, to }]) => ({ id, from: [...from], to: [...to] })));

    expect(auditCompetitorMechanismCountContracts([candidate], mechanism127)[0]?.issues).toEqual([]);
    expect(finalGeneratorTruthIssues([candidate], generator127)).toEqual([]);
    expect(finalGeneratorPlacementIssues(candidate)).toEqual([]);
    expect(generatorSpawnAlignmentIssues(candidate)).toEqual([]);
    expect(applyOpeningCompositionBatchBRepair(candidate)).toBe(candidate);
    expect(LEVELS[126]).toEqual(candidate);
    expect(createHash("sha256").update(JSON.stringify(candidate)).digest("hex").toUpperCase())
      .toBe(OPENING_COMPOSITION_BATCH_B_LV127_SHA256);
  });

  it("fresh-solves Lv127 and independently replays the returned drags", () => {
    const candidate = applyOpeningCompositionBatchBRepair(preBatch127);
    const solution = solveLevelForValidation(candidate, 20_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBe(524);
    expect(solution.drags).toHaveLength(21);
    expect(replay(candidate, solution.drags)).toBe(true);
  }, 120_000);
});
