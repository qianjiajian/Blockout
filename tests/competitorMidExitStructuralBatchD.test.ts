// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorMidExitStructuralBatchD,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_BLOCKERS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_CERTIFIED_LEVEL_IDS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_REQUESTED_LEVEL_IDS,
  COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_USES_STAGING_FALLBACK,
} from "../src/core/competitorMidExitStructuralBatchD";
import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
} from "../src/core/competitorMechanismCountContract";
import { solveLevelForValidation, type SolverDrag } from "../src/core/levelSolver";
import {
  LEVELS,
  LEVELS_BEFORE_COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D,
} from "../src/core/levels";
import { openingVisibleBlockIds } from "../src/core/openingBlockCountRepairs";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { BlockSpec, GatePortalSpec, LevelSpec, Point } from "../src/core/types";

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  import.meta.url,
), "utf8")) as unknown;
const contract = extractCompetitorMechanismCountContracts(truth)
  .find(({ levelId }) => levelId === 72)!;

const source = (): LevelSpec => LEVELS_BEFORE_COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D[71]!;
const repaired = (): LevelSpec => applyCompetitorMidExitStructuralBatchD(source());
const pointKey = ([x, y]: Point): string => `${x},${y}`;
const outerColor = (block: BlockSpec): string => block.layers?.[0] ?? block.color;

const openingAdjacency = (level: LevelSpec): string[] => {
  const opening = new Set(openingVisibleBlockIds(level));
  const occupied = new Map<string, BlockSpec>();
  for (const block of level.blocks.filter(({ id }) => opening.has(id))) {
    for (const [dx, dy] of block.shape) occupied.set(`${block.x + dx},${block.y + dy}`, block);
  }
  const issues = new Set<string>();
  for (const [key, block] of occupied) {
    const [xValue, yValue] = key.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [0, 1]] as Point[]) {
      const other = occupied.get(`${xValue! + dx},${yValue! + dy}`);
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
    model.beginAction();
    for (const [x, y] of drag.path) {
      if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

const portalCells = (portal: GatePortalSpec): Point[] => Array.from({ length: portal.size }, (_, index) => (
  portal.side === "top" || portal.side === "bottom"
    ? [portal.origin[0] + index, portal.origin[1]]
    : [portal.origin[0], portal.origin[1] + index]
));

const outward = (portal: GatePortalSpec): Point => (
  portal.side === "top" ? [0, -1]
    : portal.side === "right" ? [1, 0]
      : portal.side === "bottom" ? [0, 1]
        : [-1, 0]
);

describe("competitor mid exit structural batch D", () => {
  it("publishes only Lv72 and keeps every unresolved source conflict explicit", () => {
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_REQUESTED_LEVEL_IDS)
      .toEqual([66, 67, 68, 69, 71, 72, 74]);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_CERTIFIED_LEVEL_IDS).toEqual([72]);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_USES_STAGING_FALLBACK).toBe(false);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([66, 67, 68, 69, 71, 74]);
    expect(COMPETITOR_MID_EXIT_STRUCTURAL_BATCH_D_BLOCKERS.every(({ evidence }) => evidence.length >= 3))
      .toBe(true);
  });

  it("is isolated, reference-idempotent and preserves the exact board, blocks and real cover", () => {
    expect(applyCompetitorMidExitStructuralBatchD(LEVELS[70]!)).toBe(LEVELS[70]);
    const before = source();
    const level = repaired();
    expect(applyCompetitorMidExitStructuralBatchD(level)).toBe(level);
    expect(LEVELS[71]).toEqual(level);
    expect(level).toMatchObject({ id: 72, width: 7, height: 13 });
    expect(level.playable).toEqual(before.playable);
    expect(level.blocks).toEqual(before.blocks);
    expect(level.shutters).toEqual(before.shutters);
    expect(level.generators).toEqual(before.generators);
    expect(level.shutters).toEqual([
      expect.objectContaining({
        id: "vp-072-cover-1", x: 4, y: 0, width: 3, height: 4, count: 7, skin: "shutter",
      }),
    ]);
    expect(level.shutters?.some(({ skin }) => skin === "staging")).toBe(false);
    expect(level.blocks.filter(({ shutterId }) => shutterId === "vp-072-cover-1").map(({ id }) => id))
      .toEqual(["cc-072-b2-01", "cc-072-b2-02", "cc-072-b2-03", "cc-072-b2-04", "cc-072-b2-05"]);
  });

  it("restores the eight video mouths and exact ordinary/frozen contract", () => {
    const level = repaired();
    expect(level.gates.map(({ color, side, portals, frozen }) => ({
      color, side, origin: portals?.[0]?.origin, size: portals?.[0]?.size, frozen: frozen ?? null,
    }))).toEqual([
      { color: "blue", side: "top", origin: [4, 0], size: 3, frozen: 8 },
      { color: "pink", side: "right", origin: [6, 1], size: 3, frozen: 10 },
      { color: "purple", side: "top", origin: [1, 5], size: 3, frozen: 1 },
      { color: "green", side: "left", origin: [0, 7], size: 3, frozen: 3 },
      { color: "orange", side: "right", origin: [6, 5], size: 3, frozen: null },
      { color: "cyan", side: "bottom", origin: [4, 7], size: 3, frozen: 2 },
      { color: "red", side: "right", origin: [6, 10], size: 3, frozen: null },
      { color: "yellow", side: "bottom", origin: [0, 12], size: 3, frozen: 4 },
    ]);
    expect(level.flipDoors ?? []).toEqual([]);

    const playable = new Set(level.playable?.map(pointKey));
    for (const gate of level.gates) {
      const portal = gate.portals?.[0];
      expect(portal, gate.id).toBeDefined();
      const delta = outward(portal!);
      for (const cell of portalCells(portal!)) {
        expect(playable.has(pointKey(cell)), `${gate.id} mouth ${pointKey(cell)}`).toBe(true);
        expect(playable.has(pointKey([cell[0] + delta[0], cell[1] + delta[1]])), `${gate.id} outward`)
          .toBe(false);
      }
    }

    expect(extractRuntimeMechanismCountFacts(level)).toMatchObject({
      ordinaryExitCount: 2,
      frozenExitCount: 6,
      frozenExitValues: [1, 2, 3, 4, 8, 10],
      shutterCount: 1,
      shutterCoverCounts: [7],
      shutterCoveredCohortCounts: [5],
    });
    expect(compareCompetitorMechanismCountContract(level, contract).issues).toEqual([]);
  });

  it("keeps opening adjacency clear, validates, fresh-solves and replays", () => {
    const level = repaired();
    expect(openingVisibleBlockIds(level)).toHaveLength(14);
    expect(openingAdjacency(level)).toEqual([]);
    expect(() => validateLevel(level)).not.toThrow();

    const solution = solveLevelForValidation(level, 30_000);
    expect(solution.staticUnsatReasons).toEqual([]);
    expect(solution.unsupportedReasons).toEqual([]);
    expect(solution.solved, `${solution.termination}/${solution.exploredStates}`).toBe(true);
    expect(solution.exploredStates).toBeLessThanOrEqual(30_000);
    expect(replay(level, solution.drags)).toBe(true);
  }, 120_000);
});
