// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHAPTER_ONE_PILOT_LEVELS } from "../src/core/chapterOnePilotLevels";
import { campaignRepositionFloor } from "../src/core/campaignDifficultyTargets";
import { EXPANDED_DENSITY_CAMPAIGN_LEVELS } from "../src/core/expandedDensityCampaign";
import { EXPANDED_DENSITY_LEVEL_CANDIDATES } from "../src/core/expandedDensityLevels.generated";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { normalizeRuntimeLevel } from "../src/core/runtimeLevelNormalization";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

interface ContractTarget {
  board: {
    rows: number;
    cols: number;
    playable_cell_count: number;
    playable_mask: string[];
  };
  full_level_block_count: number;
  full_level_shape_histogram: Record<string, number>;
  full_level_occupied_cell_count: number;
  full_level_color_count: number;
  design_palette: string[];
  target_d1_difficulty: { calibrated_score: number };
  recommended_minimum_reposition_overhead: number | null;
}

interface ContractLevel {
  level_id: string;
  our_design_target: ContractTarget;
}

interface AssemblyReport {
  applied_to_live_campaign: boolean;
  contract_sha256: string;
  counts: {
    contract_levels: number;
    selected: number;
    witness_floor_met: number;
    strict_v5_floor_certified: number;
    missing: number;
    below_witness_floor: number;
  };
  decisions: Array<{
    level_id: string;
    witness_floor_met: boolean;
    strict_v5_floor_certified: boolean;
  }>;
}

const CONTRACT_PATH = new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json",
  import.meta.url,
);
const ASSEMBLY_PATH = new URL(
  "../playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json",
  import.meta.url,
);
const CONTRACT = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as { levels: ContractLevel[] };
const ASSEMBLY = JSON.parse(readFileSync(ASSEMBLY_PATH, "utf8")) as AssemblyReport;
const STAGING_AUDIT = JSON.parse(readFileSync(new URL(
  "../playtest-results/staging-collision/staging-collision-audit.json",
  import.meta.url,
), "utf8")) as {
  passed: boolean;
  staging_semantics_version: string;
  counts: {
    staging_levels: number;
    staging_shutters: number;
    current_solutions_passed: number;
    historical_floor_certificates_invalidated: number;
    current_validation_routes_below_authored_reposition_target: number;
  };
};

const shapeKind = (block: BlockSpec): string => {
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (block.shape.length === 1) return "SINGLE";
  if (block.shape.length === 2 && width === 2 && height === 1) return "H2";
  if (block.shape.length === 2 && width === 1 && height === 2) return "V2";
  if (block.shape.length === 3 && width === 3 && height === 1) return "H3";
  if (block.shape.length === 3 && width === 1 && height === 3) return "V3";
  if (block.shape.length === 3 && width === 2 && height === 2) return "L3";
  if (block.shape.length === 4 && width === 2 && height === 2) return "SQ2";
  if (block.shape.length === 4) {
    const cells = new Set(block.shape.map(([x, y]) => `${x},${y}`));
    const maximumDegree = Math.max(...block.shape.map(([x, y]) => (
      [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => cells.has(`${x + dx},${y + dy}`)).length
    )));
    return maximumDegree === 3 ? "T4" : "L4";
  }
  if (block.shape.length === 5 && width === 3 && height === 3) return "CROSS5";
  if (block.shape.length === 6 && ((width === 2 && height === 3) || (width === 3 && height === 2))) return "RECT2X3";
  if (block.shape.length === 9 && width === 3 && height === 3) return "SQ3";
  throw new Error(`Unknown v5 shape on ${block.id}`);
};

const shapeHistogram = (level: LevelSpec): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const block of level.blocks) result[shapeKind(block)] = (result[shapeKind(block)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
};

const playableMask = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_, y) => Array.from(
    { length: level.width },
    (__, x) => playable.has(`${x},${y}`) ? "#" : ".",
  ).join(""));
};

const palette = (level: LevelSpec): string[] => [...new Set(level.blocks.map((block) => block.color))].sort();
const occupiedCells = (level: LevelSpec): number => level.blocks.reduce((sum, block) => sum + block.shape.length, 0);

const physicalBlockData = (block: BlockSpec) => ({
  id: block.id,
  x: block.x,
  y: block.y,
  shape: block.shape,
  color: block.color,
});

const physicalGateData = (level: LevelSpec) => level.gates.map((gate) => ({
  id: gate.id,
  side: gate.side,
  offset: gate.offset,
  size: gate.size,
  color: gate.color,
}));

type ValidationDrag = ReturnType<typeof solveLevelForValidation>["drags"][number];

const replayDrag = (model: PuzzleModel, drag: ValidationDrag): void => {
  model.beginAction();
  for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
  if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide)).toMatchObject({ ok: true });
  expect(model.commitAction()).toBe(true);
};

describe("expanded-density v5 live campaign", () => {
  it("keeps the historical v5 acceptance chain as provenance and publishes current staging evidence", () => {
    expect(ASSEMBLY.applied_to_live_campaign).toBe(true);
    expect(ASSEMBLY.contract_sha256).toBe("A32F64092F209FFDB804C3EE997AAF994CDD5B05BEFFDA9FD8EB5E6B71C0A1F5");
    expect(ASSEMBLY.counts).toMatchObject({
      contract_levels: 100,
      selected: 100,
      witness_floor_met: 100,
      strict_v5_floor_certified: 100,
      missing: 0,
      below_witness_floor: 0,
    });
    expect(ASSEMBLY.decisions).toHaveLength(100);
    expect(ASSEMBLY.decisions.every((decision) => (
      decision.witness_floor_met && decision.strict_v5_floor_certified
    ))).toBe(true);
    expect(STAGING_AUDIT).toMatchObject({
      passed: true,
      staging_semantics_version: "nonspatial-block-removal-v1",
      counts: {
        staging_levels: 80,
        staging_shutters: 107,
        current_solutions_passed: 100,
        historical_floor_certificates_invalidated: 80,
        current_validation_routes_below_authored_reposition_target: 42,
      },
    });
  });

  it("keeps Lv1-Lv10 byte-semantic ownership in the approved pilot", () => {
    expect(VIDEO_PARITY_LEVELS_1_TO_100.slice(0, 10)).toEqual(CHAPTER_ONE_PILOT_LEVELS);
    expect(EXPANDED_DENSITY_LEVEL_CANDIDATES.map((level) => level.id)).toEqual(
      Array.from({ length: 90 }, (_, index) => index + 11),
    );
    expect(EXPANDED_DENSITY_CAMPAIGN_LEVELS.map((level) => level.id)).toEqual(
      Array.from({ length: 90 }, (_, index) => index + 11),
    );
  });

  it("matches every Lv11-Lv100 board, block, shape, occupied-cell, and palette lock", () => {
    expect(CONTRACT.levels).toHaveLength(100);
    for (const candidate of EXPANDED_DENSITY_LEVEL_CANDIDATES) {
      const contract = CONTRACT.levels[candidate.id - 1];
      const target = contract.our_design_target;
      expect(contract.level_id).toBe(`Lv${String(candidate.id).padStart(3, "0")}`);
      expect([candidate.height, candidate.width], `${contract.level_id} dimensions`).toEqual([
        target.board.rows,
        target.board.cols,
      ]);
      expect(candidate.playable?.length, `${contract.level_id} playable cells`).toBe(target.board.playable_cell_count);
      expect(playableMask(candidate), `${contract.level_id} mask`).toEqual(target.board.playable_mask);
      expect(candidate.blocks, `${contract.level_id} block count`).toHaveLength(target.full_level_block_count);
      expect(shapeHistogram(candidate), `${contract.level_id} shape histogram`).toEqual(
        Object.fromEntries(Object.entries(target.full_level_shape_histogram).sort(([left], [right]) => left.localeCompare(right))),
      );
      expect(occupiedCells(candidate), `${contract.level_id} occupied cells`).toBe(target.full_level_occupied_cell_count);
      expect(palette(candidate), `${contract.level_id} palette`).toEqual([...target.design_palette].sort());
      expect(palette(candidate), `${contract.level_id} color count`).toHaveLength(target.full_level_color_count);
    }
  });

  it("ports runtime mechanics without changing the locked physical composition", () => {
    for (let index = 0; index < EXPANDED_DENSITY_LEVEL_CANDIDATES.length; index += 1) {
      const source = EXPANDED_DENSITY_LEVEL_CANDIDATES[index];
      const runtimeSource = normalizeRuntimeLevel(source);
      const adapted = EXPANDED_DENSITY_CAMPAIGN_LEVELS[index];
      const target = CONTRACT.levels[source.id - 1].our_design_target;
      expect([adapted.width, adapted.height], `Lv${source.id} board`).toEqual([source.width, source.height]);
      expect(adapted.playable, `Lv${source.id} playable`).toEqual(source.playable);
      expect(adapted.blocks.map(physicalBlockData), `Lv${source.id} blocks`).toEqual(runtimeSource.blocks.map(physicalBlockData));
      expect(physicalGateData(adapted), `Lv${source.id} gates`).toEqual(physicalGateData(source));
      expect(occupiedCells(adapted), `Lv${source.id} occupied cells`).toBe(occupiedCells(runtimeSource));
      expect(palette(adapted), `Lv${source.id} palette`).toEqual(palette(source));
      expect(adapted.designTargets).toEqual({
        formulaVersion: "blockout-d1",
        calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
        minimumRepositionOverhead: campaignRepositionFloor(adapted.id),
      });
    }
  });

  it("restores the established milestones and keeps internal batches non-player-facing", () => {
    const first = (predicate: (level: LevelSpec) => boolean) => VIDEO_PARITY_LEVELS_1_TO_100.find(predicate)?.id;
    expect({
      shell: first((level) => level.blocks.some((block) => (block.layers?.length ?? 1) > 1)),
      generator: first((level) => level.generators?.some((generator) => (generator.trigger ?? "move") === "move") ?? false),
      shutter: first((level) => level.shutters?.some((shutter) => shutter.skin === "shutter" || shutter.skin === undefined) ?? false),
      axis: first((level) => level.blocks.some((block) => Boolean(block.movementAxis))),
      keyLock: first((level) => level.blocks.some((block) => Boolean(block.keyId || block.lockedBy))),
      lift: first((level) => level.shutters?.some((shutter) => shutter.skin === "lift") ?? false),
      timedGenerator: first((level) => level.generators?.some((generator) => generator.trigger === "time") ?? false),
      stagedFrame: first((level) => level.shutters?.some((shutter) => shutter.skin === "staged-frame") ?? false),
      star: first((level) => level.blocks.some((block) => block.star) || level.gates.some((gate) => gate.star)),
    }).toEqual({ shell: 15, generator: 35, shutter: 20, axis: 50, keyLock: 59, lift: 65, timedGenerator: 70, stagedFrame: 73, star: 100 });
    expect(VIDEO_PARITY_LEVELS_1_TO_100.filter((level) => level.featureIntro).map((level) => [level.id, level.featureIntro?.kind])).toEqual([
      [6, "ice-door"],
      [10, "ice-block"],
      [15, "layer"],
      [20, "shutter"],
      [35, "generator"],
      [50, "arrow-block"],
      [59, "key-lock"],
      [65, "lift"],
      [70, "timed-generator"],
      [73, "staged-frame"],
      [100, "star"],
    ]);
    expect(VIDEO_PARITY_LEVELS_1_TO_100.every((level) => !level.elevators?.length && !level.conveyors?.length)).toBe(true);
    expect(LEVELS[99].blocks.some((block) => block.star)).toBe(true);
    expect(LEVELS[99].gates.some((gate) => gate.star)).toBe(true);
  });

  it("keeps the original 100 runtime levels structurally valid with at most one extra shell", () => {
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100) {
      expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
      expect(level.blocks.every((block) => (block.layers?.length ?? 1) <= 2), `Lv${level.id} shell cap`).toBe(true);
    }
  });

  it("keeps the new Lv50 elevator endpoints and Lv70 conveyor chain solvable", () => {
    const level50 = LEVELS[49];
    const elevator = level50.elevators?.[0];
    expect(elevator).toMatchObject({
      id: "ed-050-elevator",
      blockId: "cc-piece-s1-07",
      fromX: 2,
      fromY: 3,
      toX: 3,
      toY: 3,
      width: 2,
      height: 1,
    });
    if (!elevator) throw new Error("Lv50 elevator missing");
    const alternate50: LevelSpec = {
      ...level50,
      blocks: level50.blocks.map((block) => block.id === elevator.blockId
        ? { ...block, x: elevator.toX, y: elevator.toY }
        : { ...block }),
      elevators: [{
        ...elevator,
        fromX: elevator.toX,
        fromY: elevator.toY,
        toX: elevator.fromX,
        toY: elevator.fromY,
      }],
    };
    for (const endpoint of [level50, alternate50]) {
      expect(() => validateLevel(endpoint)).not.toThrow();
      expect(solveLevelForValidation(endpoint, 1_000_000).solved).toBe(true);
    }

    const level70 = LEVELS[69];
    const solution70 = solveLevelForValidation(level70, 1_000_000);
    expect(solution70.solved).toBe(true);
    expect(level70.conveyors?.[0]).toMatchObject({
      id: "ed-070-conveyor",
      blockId: "cc-piece-s1-14",
      x: 3,
      y: 4,
      width: 1,
      height: 2,
      direction: "bottom",
    });
    const model = new PuzzleModel(level70);
    let clears = 0;
    for (const drag of solution70.drags) {
      replayDrag(model, drag);
      if (!drag.exitSide) continue;
      clears += 1;
      if (clears === 1) {
        expect(model.snapshot().shutters.find((shutter) => shutter.id === "ed-070-belt-shutter")?.count).toBe(1);
        expect(model.getBlock("cc-piece-s1-14")).toMatchObject({ x: 3, y: 4 });
      }
      if (clears === 2) {
        expect(model.snapshot().shutters.find((shutter) => shutter.id === "ed-070-belt-shutter")?.count).toBe(0);
        expect(model.getBlock("cc-piece-s1-14")).toMatchObject({ x: 3, y: 5 });
      }
    }
    expect(model.snapshot().complete).toBe(true);
  }, 60_000);
});
