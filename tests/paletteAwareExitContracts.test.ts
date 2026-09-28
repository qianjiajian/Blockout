// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { finalGeneratorPlacementIssues } from "../src/core/finalGeneratorContracts";
import { LEVELS_BEFORE_PALETTE_AWARE_EXIT_CONTRACT as LEVELS } from "../src/core/levels";
import {
  buildPaletteAwareExitCandidate,
  paletteAwareExitContractFor,
  paletteAwareFrozenDeadlocks,
  paletteAwareMissingExitRequirements,
} from "../src/core/paletteAwareExitContractAudit";
import {
  applyPaletteAwareExitContracts,
  PALETTE_AWARE_EXIT_EXCLUDED_LEVEL_IDS,
  PALETTE_AWARE_EXIT_PACKED_PATCHES,
  PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS,
  PALETTE_AWARE_EXIT_SOURCE_MISSING_LEVEL_IDS,
} from "../src/core/paletteAwareExitContracts";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import {
  extractCompetitorMechanismCountContracts,
  extractRuntimeMechanismCountFacts,
} from "../src/core/competitorMechanismCountContract";
import { COLORS, type LevelSpec } from "../src/core/types";

const truthPaths = [
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
] as const;
const truthContracts = truthPaths.flatMap((path) => extractCompetitorMechanismCountContracts(
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8").replace(/^\uFEFF/, "")),
));
const safeLevelIds = new Set<number>(PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS);

const openingIds = (level: LevelSpec): string[] => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  return level.blocks.filter((block) => (
    !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId))
  )).map((block) => block.id).sort();
};

const replay = (level: LevelSpec, drags: ReturnType<typeof solveLevelForValidation>["drags"]): void => {
  const model = new PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && timedInterval > 0) model.tick(timedInterval);
    model.beginAction();
    for (const [x, y] of drag.path) {
      expect(model.moveBlockStep(drag.blockId, x, y), `Lv${level.id}/${drag.blockId} -> ${x},${y}`).toBe(true);
    }
    if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
    if (timedInterval > 0) model.tick(timedInterval);
  }
  expect(model.snapshot()).toMatchObject({ complete: true, blocks: [], queuedBlocks: [] });
};

describe("palette-aware exact exit contracts", () => {
  const results = LEVELS.map(buildPaletteAwareExitCandidate);

  it("keeps the dedicated Lv20 implementation and source-missing levels outside the overlay", () => {
    expect(results.filter(({ status }) => status === "excluded").map(({ levelId }) => levelId))
      .toEqual([...PALETTE_AWARE_EXIT_EXCLUDED_LEVEL_IDS]);
    expect(results.filter(({ status }) => status === "source-missing").map(({ levelId }) => levelId))
      .toEqual([...PALETTE_AWARE_EXIT_SOURCE_MISSING_LEVEL_IDS]);
    expect(applyPaletteAwareExitContracts(LEVELS[19]!)).toBe(LEVELS[19]);
  });

  it("derives every known exact count/value from competitor truth", () => {
    for (const truth of truthContracts) {
      if (truth.sourceMissing) continue;
      const contract = paletteAwareExitContractFor(truth.levelId);
      expect(contract, `Lv${truth.levelId}`).toBeDefined();
      const facts = truth.facts;
      if (facts.ordinaryExitCount !== undefined) expect(contract!.ordinaryCount).toBe(facts.ordinaryExitCount);
      if (facts.frozenExitCount !== undefined) expect(contract!.frozenValues).toHaveLength(facts.frozenExitCount as number);
      if (facts.frozenExitValues !== undefined) expect(contract!.frozenValues).toEqual(facts.frozenExitValues);
      if (facts.starExitCount !== undefined) expect(contract!.starCount).toBe(facts.starExitCount);
      if (facts.starFrozenExitCount !== undefined) {
        expect(contract!.starFrozenValues).toHaveLength(facts.starFrozenExitCount as number);
      }
      if (facts.starFrozenExitValues !== undefined) expect(contract!.starFrozenValues).toEqual(facts.starFrozenExitValues);
      if (facts.flipDoorCount !== undefined) expect(contract!.flipDoorCount).toBe(facts.flipDoorCount);
    }
  });

  it("admits only candidates that pass every structural and palette gate", () => {
    const candidates = results.filter(({ status }) => status === "candidate");
    expect(candidates.length).toBeGreaterThan(0);
    for (const result of candidates) {
      const { source, level, contract } = result;
      expect(contract).toBeDefined();
      expect(level.blocks).toBe(source.blocks);
      expect(level.shutters).toBe(source.shutters);
      expect(openingIds(level), `Lv${level.id} opening`).toEqual(openingIds(source));
      expect(paletteAwareMissingExitRequirements(level), `Lv${level.id} compatible exits`).toEqual([]);
      expect(paletteAwareFrozenDeadlocks(level), `Lv${level.id} frozen exits`).toEqual([]);
      expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
      expect(finalGeneratorPlacementIssues(level), `Lv${level.id} generators`)
        .toEqual(finalGeneratorPlacementIssues(source));

      const facts = extractRuntimeMechanismCountFacts(level);
      expect(facts.ordinaryExitCount).toBe(contract!.ordinaryCount);
      expect(facts.frozenExitValues).toEqual(contract!.frozenValues);
      expect(facts.starExitCount).toBe(contract!.starCount);
      expect(facts.starFrozenExitValues).toEqual(contract!.starFrozenValues);
      expect(facts.flipDoorCount).toBe(contract!.flipDoorCount);

      const exits = [...level.gates, ...(level.flipDoors ?? [])];
      const uniqueColors = new Set(exits.map(({ color }) => color)).size;
      expect(uniqueColors, `Lv${level.id} minimum color repetition`)
        .toBe(Math.min(exits.length, COLORS.length));
      expect(buildPaletteAwareExitCandidate(level).status, `Lv${level.id} idempotence`).toBe("unchanged");
    }
  });

  it("does not silently apply structurally rejected or uncertified candidates", () => {
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.issues.length, `Lv${result.levelId}`).toBeGreaterThan(0);
        expect(result.level).toBe(result.source);
      }
      if (!safeLevelIds.has(result.levelId)) {
        expect(applyPaletteAwareExitContracts(result.source), `Lv${result.levelId}`).toBe(result.source);
      }
    }
  });

  it("decodes the compact production patches exactly like the audited builder", () => {
    expect(Object.keys(PALETTE_AWARE_EXIT_PACKED_PATCHES).map(Number).sort((a, b) => a - b))
      .toEqual([...PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS]);
    for (const levelId of PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS) {
      const source = LEVELS.find((level) => level.id === levelId)!;
      const candidate = buildPaletteAwareExitCandidate(source);
      expect(candidate.status, `Lv${levelId}`).toBe("candidate");
      expect(applyPaletteAwareExitContracts(source), `Lv${levelId} packed equivalence`)
        .toEqual(candidate.level);
    }
  });

  for (const levelId of PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS) {
    it(`solver-certifies and PuzzleModel-replays safe Lv${levelId}`, () => {
      const source = LEVELS.find((level) => level.id === levelId)!;
      const level = applyPaletteAwareExitContracts(source);
      expect(level).not.toBe(source);
      const solution = solveLevelForValidation(level, 20_000);
      expect(solution.staticUnsatReasons, `Lv${levelId}`).toEqual([]);
      expect(solution.solved, `Lv${levelId}/${solution.termination}`).toBe(true);
      replay(level, solution.drags);
    }, 60_000);
  }
});
