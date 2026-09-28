// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS } from "../src/core/competitorConstrainedCampaign";
import { COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES } from "../src/core/competitorConstrainedLevels.generated";
import { campaignRepositionFloor } from "../src/core/campaignDifficultyTargets";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { normalizeRuntimeLevel } from "../src/core/runtimeLevelNormalization";
import type { BlockSpec, LevelSpec } from "../src/core/types";

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
  target_d1_difficulty: {
    calibrated_score: number;
  };
  recommended_minimum_reposition_overhead: number | null;
}

interface ContractLevel {
  level_id: string;
  our_design_target: ContractTarget;
}

const CONTRACT_PATH = new URL(
  "../deliverables/level-generation-blueprint/blockout-lv001-lv100-competitor-constrained-design-contract-v4.json",
  import.meta.url,
);
const CONTRACT = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as { levels: ContractLevel[] };

const shapeKind = (block: BlockSpec): string => {
  const normalized = block.shape.map(([x, y]) => [x, y] as const);
  const xs = normalized.map(([x]) => x);
  const ys = normalized.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (normalized.length === 1) return "SINGLE";
  if (normalized.length === 2 && width === 2 && height === 1) return "H2";
  if (normalized.length === 2 && width === 1 && height === 2) return "V2";
  if (normalized.length === 3 && width === 3 && height === 1) return "H3";
  if (normalized.length === 3 && width === 1 && height === 3) return "V3";
  if (normalized.length === 3 && width === 2 && height === 2) return "L3";
  if (normalized.length === 4 && width === 2 && height === 2) return "SQ2";
  if (normalized.length === 4) {
    const cells = new Set(normalized.map(([x, y]) => `${x},${y}`));
    const maximumDegree = Math.max(...normalized.map(([x, y]) => (
      [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => cells.has(`${x + dx},${y + dy}`)).length
    )));
    return maximumDegree === 3 ? "T4" : "L4";
  }
  if (normalized.length === 5 && width === 3 && height === 3) return "CROSS5";
  if (normalized.length === 6 && ((width === 2 && height === 3) || (width === 3 && height === 2))) return "RECT2X3";
  if (normalized.length === 9 && width === 3 && height === 3) return "SQ3";
  throw new Error(`Unknown contract shape on block ${block.id}: ${JSON.stringify(block.shape)}`);
};

const shapeHistogram = (level: LevelSpec): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const block of level.blocks) {
    const kind = shapeKind(block);
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
};

const playableMask = (level: LevelSpec): string[] => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_, y) => Array.from(
    { length: level.width },
    (__, x) => playable.has(`${x},${y}`) ? "#" : ".",
  ).join(""));
};

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

const occupiedCells = (level: LevelSpec): number => (
  level.blocks.reduce((sum, block) => sum + block.shape.length, 0)
);

const palette = (level: LevelSpec): string[] => [...new Set(level.blocks.map((block) => block.color))].sort();

const isIrregularBlock = (block: BlockSpec): boolean => {
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const bounds = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return block.shape.length < bounds;
};

const firstLevelWith = (predicate: (level: LevelSpec) => boolean): number | undefined => (
  COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS.find(predicate)?.id
);

const campaignLevel = (id: number): LevelSpec => {
  const level = COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(`Missing competitor-constrained Lv${id}`);
  return level;
};

type ValidationDrag = ReturnType<typeof solveLevelForValidation>["drags"][number];

const replayDrag = (model: PuzzleModel, drag: ValidationDrag): void => {
  model.beginAction();
  for (const [x, y] of drag.path) {
    expect(model.moveBlockStep(drag.blockId, x, y), `${drag.blockId} -> ${x},${y}`).toBe(true);
  }
  if (drag.exitSide) {
    expect(model.tryExit(drag.blockId, drag.exitSide), `${drag.blockId} exits ${drag.exitSide}`).toMatchObject({ ok: true });
  }
  expect(model.commitAction(), `${drag.blockId} commits`).toBe(true);
};

const replay = (
  level: LevelSpec,
  solution: ReturnType<typeof solveLevelForValidation>,
): PuzzleModel => {
  const model = new PuzzleModel(level);
  for (const drag of solution.drags) replayDrag(model, drag);
  return model;
};

describe("competitor-constrained campaign mechanic adapter", () => {
  it("matches every generated candidate directly to the v4 contract locks", () => {
    expect(CONTRACT.levels).toHaveLength(100);
    expect(COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES).toHaveLength(100);
    for (let index = 0; index < CONTRACT.levels.length; index += 1) {
      const contract = CONTRACT.levels[index];
      const target = contract.our_design_target;
      const candidate = COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES[index];
      expect(contract.level_id, `contract row ${index + 1}`).toBe(`Lv${String(index + 1).padStart(3, "0")}`);
      expect(candidate.id, contract.level_id).toBe(index + 1);
      expect([candidate.height, candidate.width], `${contract.level_id} dimensions`).toEqual([target.board.rows, target.board.cols]);
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

  it("preserves every competitor-locked physical structure and palette", () => {
    expect(COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS).toHaveLength(100);
    for (let index = 0; index < COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES.length; index += 1) {
      const source = COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES[index];
      const runtimeSource = normalizeRuntimeLevel(source);
      const adapted = COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS[index];
      expect(adapted, `Lv${source.id}`).not.toBe(source);
      expect([adapted.width, adapted.height], `Lv${source.id} board`).toEqual([source.width, source.height]);
      expect(adapted.playable, `Lv${source.id} playable`).toEqual(source.playable);
      expect(adapted.blocked, `Lv${source.id} blocked`).toEqual(source.blocked);
      expect(adapted.blocks.map(physicalBlockData), `Lv${source.id} blocks`).toEqual(runtimeSource.blocks.map(physicalBlockData));
      expect(physicalGateData(adapted), `Lv${source.id} gates`).toEqual(physicalGateData(source));
      expect(adapted.blocks, `Lv${source.id} block clone`).not.toBe(source.blocks);
      expect(occupiedCells(adapted), `Lv${source.id} occupied cells`).toBe(occupiedCells(runtimeSource));
      expect(palette(adapted), `Lv${source.id} palette`).toEqual(palette(source));
    }
  });

  it("embeds the approved difficulty and reposition targets without relabeling them as measurements", () => {
    for (let index = 0; index < CONTRACT.levels.length; index += 1) {
      const contract = CONTRACT.levels[index];
      const adapted = COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS[index];
      const contractLevelId = adapted.id === 2 ? 3 : adapted.id === 3 ? 2 : adapted.id;
      expect(adapted.designTargets, contract.level_id).toEqual({
        formulaVersion: "blockout-d1",
        calibratedDifficulty: contract.our_design_target.target_d1_difficulty.calibrated_score,
        minimumRepositionOverhead: campaignRepositionFloor(contractLevelId),
      });
    }
  });

  it("restores only the established player-facing mechanic milestones", () => {
    expect({
      colorExit: firstLevelWith((level) => level.gates.length > 0),
      irregularBoard: firstLevelWith((level) => (level.playable?.length ?? level.width * level.height) < level.width * level.height),
      irregularBlock: firstLevelWith((level) => level.blocks.some(isIrregularBlock)),
      frozenExit: firstLevelWith((level) => level.gates.some((gate) => (gate.frozen ?? 0) > 0)),
      numericIce: firstLevelWith((level) => level.blocks.some((block) => (block.frozen ?? 0) > 0)),
      shell: firstLevelWith((level) => level.blocks.some((block) => (block.layers?.length ?? 1) > 1)),
      generator: firstLevelWith((level) => level.shutters?.some((shutter) => shutter.skin === "generator") ?? false),
      elevator: firstLevelWith((level) => (level.elevators?.length ?? 0) > 0),
      shutter: firstLevelWith((level) => level.shutters?.some((shutter) => (
        shutter.skin === undefined || shutter.skin === "shutter"
      )) ?? false),
      conveyor: firstLevelWith((level) => (level.conveyors?.length ?? 0) > 0),
      star: firstLevelWith((level) => level.blocks.some((block) => block.star) || level.gates.some((gate) => gate.star)),
    }).toEqual({
      colorExit: 1,
      irregularBoard: 8,
      irregularBlock: 2,
      frozenExit: 6,
      numericIce: 10,
      shell: 15,
      generator: 35,
      elevator: 50,
      shutter: 70,
      conveyor: 70,
      star: 91,
    });
    expect(COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS.filter((level) => level.featureIntro).map((level) => (
      [level.id, level.featureIntro?.kind]
    ))).toEqual([
      [6, "ice-door"],
      [10, "ice-block"],
      [35, "generator"],
      [50, "elevator"],
      [70, "conveyor"],
      [91, "star"],
    ]);
    expect(COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS.filter((level) => (
      level.shutters?.some((shutter) => shutter.skin === "staging")
    )).map((level) => level.id)).toEqual([17, 28]);
  });

  it("keeps every adapted level valid without mutating the generated evidence", () => {
    for (const level of COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS) {
      expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
    }
    expect(COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES[16].shutters?.every((shutter) => (
      shutter.skin === "staging"
    ))).toBe(true);
    expect(COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS[16].shutters?.every((shutter) => (
      shutter.skin === "staging"
    ))).toBe(true);
  });

  it("runs the Lv50 elevator between two legal, solvable payload states", () => {
    const level = campaignLevel(50);
    const elevator = level.elevators?.[0];
    expect(elevator).toMatchObject({
      id: "cc-050-elevator",
      blockId: "cc-piece-10",
      fromX: 1,
      fromY: 6,
      toX: 2,
      toY: 6,
      width: 2,
      height: 2,
    });
    if (!elevator) throw new Error("Lv50 elevator missing");
    expect([elevator.fromX, elevator.fromY]).not.toEqual([elevator.toX, elevator.toY]);

    const model = new PuzzleModel(level);
    const payload = model.getBlock(elevator.blockId);
    expect(payload).toMatchObject({ x: elevator.fromX, y: elevator.fromY });
    if (!payload) throw new Error("Lv50 elevator payload missing");
    expect(model.canPlace(payload, elevator.toX, elevator.toY)).toBe(true);
    model.start();
    expect(model.tick(elevator.periodSeconds)).toBe(true);
    expect(model.snapshot().elevators[0]).toMatchObject({ x: elevator.toX, y: elevator.toY });
    expect(model.getBlock(elevator.blockId)).toMatchObject({ x: elevator.toX, y: elevator.toY });
    expect(model.tick(elevator.periodSeconds)).toBe(true);
    expect(model.snapshot().elevators[0]).toMatchObject({ x: elevator.fromX, y: elevator.fromY });
    expect(model.getBlock(elevator.blockId)).toMatchObject({ x: elevator.fromX, y: elevator.fromY });

    const endpointLevel: LevelSpec = {
      ...level,
      blocks: level.blocks.map((block) => block.id === elevator.blockId
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
    for (const endpoint of [level, endpointLevel]) {
      expect(() => validateLevel(endpoint)).not.toThrow();
      const solution = solveLevelForValidation(endpoint, 500_000);
      expect(solution.solved, `Lv50 endpoint ${endpoint.blocks.find((block) => block.id === elevator.blockId)?.x}`).toBe(true);
      expect(replay(endpoint, solution).snapshot().complete).toBe(true);
    }
  }, 30_000);

  it("makes the Lv70 shutter gate a real prerequisite for its inward conveyor tick", () => {
    const level = campaignLevel(70);
    const conveyor = level.conveyors?.[0];
    const shutter = level.shutters?.find((candidate) => candidate.id === "cc-070-belt-shutter");
    expect(conveyor).toMatchObject({
      id: "cc-070-conveyor",
      blockId: "cc-piece-15",
      x: 1,
      y: 4,
      width: 1,
      height: 2,
      direction: "bottom",
    });
    expect(shutter).toMatchObject({ x: 1, y: 4, width: 1, height: 1, count: 2, skin: "shutter" });
    if (!conveyor || !shutter) throw new Error("Lv70 conveyor chain missing");

    const solution = solveLevelForValidation(level, 500_000);
    expect(solution.solved).toBe(true);
    const model = new PuzzleModel(level);
    const payload = model.getBlock(conveyor.blockId);
    expect(payload).toMatchObject({ x: 1, y: 4 });
    if (!payload) throw new Error("Lv70 conveyor payload missing");
    expect(model.isBlockActive(payload)).toBe(false);
    expect(model.canPlace(payload, 1, 5)).toBe(false);

    let clears = 0;
    for (const drag of solution.drags) {
      replayDrag(model, drag);
      if (!drag.exitSide) continue;
      clears += 1;
      if (clears === 1) {
        expect(model.snapshot().shutters.find((candidate) => candidate.id === shutter.id)?.count).toBe(1);
        expect(model.getBlock(conveyor.blockId)).toMatchObject({ x: 1, y: 4 });
        expect(model.isBlockActive(model.getBlock(conveyor.blockId)!)).toBe(false);
      } else if (clears === 2) {
        expect(model.snapshot().shutters.find((candidate) => candidate.id === shutter.id)?.count).toBe(0);
        expect(model.getBlock(conveyor.blockId)).toMatchObject({ x: 1, y: 5 });
        expect(model.isBlockActive(model.getBlock(conveyor.blockId)!)).toBe(true);
      }
    }
    expect(clears).toBeGreaterThanOrEqual(2);
    const replayed = model.snapshot();
    expect(replayed.complete).toBe(true);
    expect(replayed.blocks).toHaveLength(0);
    expect(replayed.shutters.find((candidate) => candidate.id === shutter.id)?.count).toBe(0);
  }, 30_000);
});
