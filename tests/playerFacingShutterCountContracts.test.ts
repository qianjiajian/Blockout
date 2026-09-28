// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  compareCompetitorMechanismCountContract,
  extractCompetitorMechanismCountContracts,
} from "../src/core/competitorMechanismCountContract";
import { solveLevelForValidation } from "../src/core/levelSolver";
import {
  LEVELS_BEFORE_MECHANISM_ATTRIBUTE_STRUCTURAL_REPAIR as PLAYER_FACING_LEVELS,
  LEVELS_BEFORE_PLAYER_FACING_SHUTTER_COUNT_CONTRACT as BASE_LEVELS,
} from "../src/core/levels";
import {
  applyPlayerFacingShutterCountContract,
  PLAYER_FACING_SHUTTER_COUNT_CONTRACT_LEVEL_IDS,
} from "../src/core/playerFacingShutterCountContracts";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { auditOrdinaryShutterCoverage } from "../src/core/shutterCoverage";
import type { LevelSpec } from "../src/core/types";

const SHUTTER_FIELDS = new Set([
  "shutterCount",
  "shutterCoverCounts",
  "shutterCoveredCohortCounts",
  "shutterCoveredCohortTotal",
  "shutterKnownCoveredCohorts",
]);
const TRUTH_PATHS = [
  new URL("../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json", import.meta.url),
  new URL("../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json", import.meta.url),
] as const;
const contracts = TRUTH_PATHS.flatMap((path) => extractCompetitorMechanismCountContracts(
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")),
));
const contractById = new Map(contracts.map((contract) => [contract.levelId, contract]));

const openingIds = (level: LevelSpec): string[] => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  return level.blocks.filter((block) => !queued.has(block.id)
    && !(block.shutterId && closed.has(block.shutterId))).map((block) => block.id);
};
const openingAdjacencyCount = (level: LevelSpec): number => {
  const opening = new Set(openingIds(level));
  const blocks = level.blocks.filter((block) => opening.has(block.id));
  const occupants = new Map<string, typeof blocks>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const key = `${block.x + dx},${block.y + dy}`;
    occupants.set(key, [...(occupants.get(key) ?? []), block]);
  }
  const pairs = new Set<string>();
  for (const block of blocks) for (const [dx, dy] of block.shape) {
    const x = block.x + dx;
    const y = block.y + dy;
    for (const [sx, sy] of [[1, 0], [0, 1]] as const) for (const neighbour of occupants.get(`${x + sx},${y + sy}`) ?? []) {
      const outer = block.layers?.[0] ?? block.color;
      const neighbourOuter = neighbour.layers?.[0] ?? neighbour.color;
      if (block.id !== neighbour.id && outer === neighbourOuter) pairs.add([block.id, neighbour.id].sort().join("|"));
    }
  }
  return pairs.size;
};
const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): boolean => {
  const model = new PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) if (!model.moveBlockStep(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  const snapshot = model.snapshot();
  return snapshot.complete && snapshot.blocks.length === 0 && snapshot.queuedBlocks.length === 0;
};

describe("player-facing shutter count contracts", () => {
  it("keeps the compact repair batch explicit and leaves every unrelated level identical", () => {
    expect(PLAYER_FACING_SHUTTER_COUNT_CONTRACT_LEVEL_IDS).toEqual([27, 40, 48, 55, 61, 68, 72]);
    const repaired = new Set(PLAYER_FACING_SHUTTER_COUNT_CONTRACT_LEVEL_IDS);
    for (const level of BASE_LEVELS) {
      const candidate = applyPlayerFacingShutterCountContract(level);
      if (!repaired.has(level.id)) expect(candidate).toBe(level);
      else {
        expect(candidate).not.toBe(level);
        expect(candidate).toEqual(PLAYER_FACING_LEVELS.find((production) => production.id === level.id));
        expect(applyPlayerFacingShutterCountContract(candidate)).toEqual(candidate);
      }
    }
  });

  it.each(PLAYER_FACING_SHUTTER_COUNT_CONTRACT_LEVEL_IDS)(
    "restores Lv%i's exact shutter cohort without changing its opening or generators",
    (levelId) => {
      const source = BASE_LEVELS.find((level) => level.id === levelId)!;
      const candidate = applyPlayerFacingShutterCountContract(source);
      expect(candidate.shutters).toEqual(source.shutters);
      expect(candidate.generators).toEqual(source.generators);
      expect(openingIds(candidate)).toEqual(openingIds(source));
      expect(openingAdjacencyCount(candidate)).toBe(0);
      expect(() => validateLevel(candidate)).not.toThrow();
      expect(auditOrdinaryShutterCoverage(candidate)).toEqual([]);
      const issues = compareCompetitorMechanismCountContract(candidate, contractById.get(levelId)!).issues
        .filter((issue) => SHUTTER_FIELDS.has(issue.field));
      expect(issues).toEqual([]);
    },
  );

  it.each(PLAYER_FACING_SHUTTER_COUNT_CONTRACT_LEVEL_IDS)(
    "fresh-solves and independently replays Lv%i",
    (levelId) => {
      const source = BASE_LEVELS.find((level) => level.id === levelId)!;
      const candidate = applyPlayerFacingShutterCountContract(source);
      const solved = solveLevelForValidation(candidate, 20_000);
      expect(solved.staticUnsatReasons).toEqual([]);
      expect(solved.solved, `${solved.termination}, ${solved.exploredStates} states`).toBe(true);
      expect(replay(candidate, solved.drags)).toBe(true);
    },
  );
});
