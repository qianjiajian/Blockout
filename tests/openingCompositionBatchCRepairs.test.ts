// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LEVELS,
  LEVELS_BEFORE_OPENING_COMPOSITION_BATCH_C_REPAIR,
} from "../src/core/levels";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import {
  applyOpeningCompositionBatchCRepair,
  OPENING_COMPOSITION_BATCH_C_BLOCKERS,
  OPENING_COMPOSITION_BATCH_C_COORDINATE_ADJUSTMENTS,
  OPENING_COMPOSITION_BATCH_C_LEVEL_IDS,
  OPENING_COMPOSITION_BATCH_C_LV168_DIRECT_COHORT,
  OPENING_COMPOSITION_BATCH_C_LV168_SHA256,
  OPENING_COMPOSITION_BATCH_C_TARGETS,
  OPENING_COMPOSITION_BATCH_C_USES_STAGING_FALLBACK,
  OPENING_COMPOSITION_BATCH_C_VERSION,
} from "../src/core/openingCompositionBatchCRepairs";
import { auditCompetitorMechanismCountContracts, extractCompetitorMechanismCountContracts } from "../src/core/competitorMechanismCountContract";
import { finalGeneratorPlacementIssues, extractGeneratorTruthContracts, finalGeneratorTruthIssues } from "../src/core/finalGeneratorContracts";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { BlockSpec, LevelSpec } from "../src/core/types";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "../src/core/videoParityLevels101To200.generated";

const TRUTH = JSON.parse(readFileSync(
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  "utf8",
).replace(/^\uFEFF/, ""));
const truth168 = TRUTH.levels.find(({ level }: { level: number }) => Number(level) === 168)!;
const mechanism168 = extractCompetitorMechanismCountContracts(TRUTH).filter(({ levelId }) => levelId === 168);
const generator168 = extractGeneratorTruthContracts(TRUTH).filter(({ levelId }) => levelId === 168);
const source168 = VIDEO_PARITY_LEVELS_101_TO_200[168 - 101]!;
const preBatch168 = LEVELS_BEFORE_OPENING_COMPOSITION_BATCH_C_REPAIR[168 - 1]!;

const withoutPlacement = ({ x: _x, y: _y, ...block }: BlockSpec): object => block;
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

describe(`opening composition batch C ${OPENING_COMPOSITION_BATCH_C_VERSION}`, () => {
  it("publishes only the fully certified late level and records every blocker", () => {
    expect(OPENING_COMPOSITION_BATCH_C_TARGETS).toEqual({
      160: 18, 163: 28, 167: 14, 168: 16, 173: 28, 178: 23, 181: 16,
    });
    expect(OPENING_COMPOSITION_BATCH_C_LEVEL_IDS).toEqual([168]);
    expect(OPENING_COMPOSITION_BATCH_C_USES_STAGING_FALLBACK).toBe(false);
    expect(Object.keys(OPENING_COMPOSITION_BATCH_C_BLOCKERS).map(Number)).toEqual([160, 163, 167, 173, 178, 181]);
    expect(applyOpeningCompositionBatchCRepair(LEVELS[0]!)).toBe(LEVELS[0]);
    for (const reason of Object.values(OPENING_COMPOSITION_BATCH_C_BLOCKERS)) {
      expect(reason.length).toBeGreaterThan(180);
    }
  });

  it("restores Lv168 exact composition and its real source cover without substitutions", () => {
    const candidate = applyOpeningCompositionBatchCRepair(preBatch168);
    const openingIds = new Set(openingVisibleBlockIds(candidate));
    const opening = candidate.blocks.filter(({ id }) => openingIds.has(id));
    const sourceOpeningIds = new Set(openingVisibleBlockIds(source168));
    const sourceOpening = source168.blocks.filter(({ id }) => sourceOpeningIds.has(id));

    expect(() => validateLevel(candidate)).not.toThrow();
    expect(truth168.composition.opening_piece_count).toBe(16);
    expect(truth168.composition.source_full_piece_count).toBeNull();
    expect(opening).toHaveLength(OPENING_COMPOSITION_BATCH_C_TARGETS[168]);
    expect(candidate.blocks).toHaveLength(33);
    expect(new Set(opening.map(outer)).size).toBe(truth168.composition.opening_color_count);
    expect(openingIds).toEqual(sourceOpeningIds);
    expect(candidate.blocks.slice(0, source168.blocks.length).map(withoutPlacement))
      .toEqual(source168.blocks.map(withoutPlacement));
    expect(histogram(opening.map((block) => JSON.stringify(block.shape))))
      .toEqual(histogram(sourceOpening.map((block) => JSON.stringify(block.shape))));
    expect(histogram(candidate.blocks.slice(0, source168.blocks.length).map((block) => JSON.stringify(block.shape))))
      .toEqual(histogram(source168.blocks.map((block) => JSON.stringify(block.shape))));
    expect(histogram(opening.map(outer))).toEqual(histogram(sourceOpening.map(outer)));
    expect(histogram(candidate.blocks.slice(0, source168.blocks.length).map(outer)))
      .toEqual(histogram(source168.blocks.map(outer)));
    expect(candidate.playable).toEqual(source168.playable);
    expect(candidate.blocked).toEqual(source168.blocked);
    expect(candidate.shutters).toEqual([{
      id: "lv168-cover-01", x: 0, y: 5, width: 7, height: 4, count: 16, skin: "shutter",
    }]);
    expect(candidate.shutters?.some(({ skin }) => skin === "staging")).toBe(false);
    expect(candidate.gates.map((gate) => ({
      id: gate.id,
      side: gate.side,
      origin: gate.portals?.[0]?.origin,
      size: gate.size,
      color: gate.color,
      ...(gate.frozen ? { frozen: gate.frozen } : {}),
    }))).toEqual([
      { id: "oc168-top-red-2", side: "top", origin: [2, 0], size: 3, color: "red", frozen: 2 },
      { id: "oc168-top-green-5", side: "left", origin: [0, 1], size: 2, color: "green", frozen: 5 },
      { id: "oc168-top-yellow", side: "right", origin: [6, 1], size: 2, color: "yellow" },
      { id: "oc168-top-cyan", side: "bottom", origin: [5, 3], size: 2, color: "cyan" },
      { id: "oc168-lower-purple-21", side: "left", origin: [0, 5], size: 2, color: "purple", frozen: 21 },
      { id: "oc168-lower-red-20", side: "left", origin: [0, 7], size: 2, color: "red", frozen: 20 },
      { id: "oc168-lower-yellow", side: "right", origin: [6, 5], size: 2, color: "yellow" },
      { id: "oc168-lower-blue-19", side: "right", origin: [6, 7], size: 2, color: "blue", frozen: 19 },
      { id: "oc168-lower-green-25", side: "bottom", origin: [0, 8], size: 2, color: "green", frozen: 25 },
    ]);
    expect(candidate.gates.filter(({ frozen }) => !frozen).map(({ side }) => side).sort())
      .toEqual(["bottom", "right", "right"]);
    expect(candidate.gates.filter(({ frozen }) => frozen).map(({ side, frozen }) => `${side}:${frozen}`).sort())
      .toEqual(["bottom:25", "left:20", "left:21", "left:5", "right:19", "top:2"]);
    const direct = candidate.blocks.filter(({ shutterId }) => shutterId === "lv168-cover-01");
    expect(direct).toHaveLength(17);
    expect(direct).toEqual(OPENING_COMPOSITION_BATCH_C_LV168_DIRECT_COHORT);
    expect(histogram(direct.map((block) => JSON.stringify(block.shape)))).toEqual({
      "[[0,0],[0,1]]": 4,
      "[[0,0],[1,0],[2,0]]": 2,
      "[[0,0],[1,0]]": 2,
      "[[0,0]]": 9,
    });
    expect(histogram(direct.map(outer))).toEqual({ blue: 4, green: 2, purple: 4, red: 3, yellow: 4 });
    expect(candidate.blocks.slice(0, source168.blocks.length)
      .every((block) => block.shape.every(([, dy]) => block.y + dy < 5))).toBe(true);
    expect(direct.every((block) => block.shape.every(([dx, dy]) => (
      block.x + dx >= 0 && block.x + dx < 7 && block.y + dy >= 5 && block.y + dy < 9
    )))).toBe(true);
    const coveredCells = new Set(direct.flatMap((block) => block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`)));
    expect(coveredCells.size).toBe(27);
    expect(coveredCells.has("3,6")).toBe(false);
    expect(adjacencyIssues(candidate)).toEqual([]);
    expect(auditOrdinaryShutterCoverage(candidate)).toEqual([]);
    expect(adjacencyIssues({
      ...candidate,
      blocks: direct.map(({ shutterId: _shutterId, ...block }) => block),
      shutters: undefined,
    })).toEqual([]);

    const changes = candidate.blocks.slice(0, source168.blocks.length).flatMap((block) => {
      const before = source168.blocks.find(({ id }) => id === block.id)!;
      return before.x === block.x && before.y === block.y
        ? [] : [{ id: block.id, from: [before.x, before.y], to: [block.x, block.y] }];
    });
    expect(changes).toEqual(Object.entries(OPENING_COMPOSITION_BATCH_C_COORDINATE_ADJUSTMENTS[168])
      .map(([id, { from, to }]) => ({ id, from: [...from], to: [...to] })));

    expect(auditCompetitorMechanismCountContracts([candidate], mechanism168)[0]?.issues).toEqual([]);
    expect(finalGeneratorTruthIssues([candidate], generator168)).toEqual([]);
    expect(finalGeneratorPlacementIssues(candidate)).toEqual([]);
    expect(applyOpeningCompositionBatchCRepair(candidate)).toBe(candidate);
    expect(LEVELS[167]).toEqual(candidate);
    expect(createHash("sha256").update(JSON.stringify(candidate)).digest("hex").toUpperCase())
      .toBe(OPENING_COMPOSITION_BATCH_C_LV168_SHA256);
  });

  it("fresh-solves Lv168 within 30k and independently replays every drag", () => {
    const candidate = applyOpeningCompositionBatchCRepair(preBatch168);
    const solution = solveLevelForValidation(candidate, 30_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBe(369);
    expect(solution.drags).toHaveLength(56);
    expect(replay(candidate, solution.drags)).toBe(true);
  }, 120_000);
});
