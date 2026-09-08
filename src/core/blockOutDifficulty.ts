import type { BlockColor, BlockSpec, GateSpec, LevelSpec, Point } from "./types";

export interface BlockOutDifficultyComponents {
  /** Share of playable space unavailable as an opening buffer. */
  bufferTightness: number;
  /** Rules whose state is not represented by ordinary position and color alone. */
  hiddenInformation: number;
  /** Breadth of independently acting mechanics on the level. */
  mechanismDiversity: number;
  /** Multiple clear stages competing for few or tightly fitting exits. */
  exitCompetition: number;
}

export interface BlockOutDifficultyScore {
  version: "blockout-d1";
  score: number;
  components: BlockOutDifficultyComponents;
  evidence: {
    playableCells: number;
    openingUnavailableCells: number;
    hiddenStateUnits: number;
    mechanisms: string[];
    clearStages: number;
    gateCount: number;
  };
}

export const BLOCK_OUT_DIFFICULTY_WEIGHTS = {
  bufferTightness: 0.35,
  hiddenInformation: 0.20,
  mechanismDiversity: 0.20,
  exitCompetition: 0.25,
} as const;

export const BLOCK_OUT_DIFFICULTY_CALIBRATION = {
  slope: 0.826935,
  intercept: 13.161835,
} as const;

export const BLOCK_OUT_DIFFICULTY_BANDS = [
  { id: "entry", label: "入门", min: 45, max: 49.99 },
  { id: "normal", label: "普通", min: 50, max: 59.99 },
  { id: "advanced", label: "进阶", min: 60, max: 69.99 },
  { id: "hard", label: "困难", min: 70, max: 79.99 },
  { id: "extreme", label: "极难", min: 80, max: 100 },
] as const;

export type BlockOutDifficultyBand = (typeof BLOCK_OUT_DIFFICULTY_BANDS)[number];

export const calibratedBlockOutDifficulty = (rawScore: number): number => round(
  BLOCK_OUT_DIFFICULTY_CALIBRATION.intercept + BLOCK_OUT_DIFFICULTY_CALIBRATION.slope * rawScore,
  2,
);

export const blockOutDifficultyBand = (calibratedScore: number): BlockOutDifficultyBand | undefined => (
  BLOCK_OUT_DIFFICULTY_BANDS.find(({ min, max }) => calibratedScore >= min && calibratedScore <= max)
);

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const round = (value: number, digits = 4): number => Number(value.toFixed(digits));
const pointKey = ([x, y]: Point): string => `${x},${y}`;

const playableCellsOf = (level: LevelSpec): Set<string> => {
  if (level.playable?.length) return new Set(level.playable.map(pointKey));
  const blocked = new Set((level.blocked ?? []).map(pointKey));
  const cells = new Set<string>();
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const key = `${x},${y}`;
      if (!blocked.has(key)) cells.add(key);
    }
  }
  return cells;
};

const physicalCells = (block: BlockSpec): string[] => block.shape
  .map(([dx, dy]) => `${block.x + dx},${block.y + dy}`);

const blockClearColors = (block: BlockSpec): BlockColor[] => block.layers?.length
  ? [...block.layers]
  : [block.color];

const requiredSpan = (block: BlockSpec, gate: GateSpec): number => {
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  return gate.side === "top" || gate.side === "bottom"
    ? Math.max(...xs) - Math.min(...xs) + 1
    : Math.max(...ys) - Math.min(...ys) + 1;
};

const mechanismTags = (level: LevelSpec, playableCells: number): string[] => {
  const tags = new Set<string>();
  if (playableCells < level.width * level.height) tags.add("irregular-board");
  if (level.gates.some((gate) => (gate.frozen ?? 0) > 0)) tags.add("frozen-gate");
  if (level.blocks.some((block) => (block.frozen ?? 0) > 0)) tags.add("frozen-block");
  if (level.blocks.some((block) => (block.layers?.length ?? 1) > 1)) tags.add("layered-block");
  if ((level.shutters?.length ?? 0) > 0) tags.add("counter-cover");
  if ((level.elevators?.length ?? 0) > 0) tags.add("elevator");
  if ((level.conveyors?.length ?? 0) > 0) tags.add("conveyor");
  if (level.blocks.some((block) => block.star) || level.gates.some((gate) => gate.star)) tags.add("star-routing");
  return [...tags].sort();
};

const exitCompetitionOf = (level: LevelSpec): number => {
  const demand = new Map<BlockColor, BlockSpec[]>();
  for (const block of level.blocks) {
    for (const color of blockClearColors(block)) {
      const entries = demand.get(color) ?? [];
      entries.push(block);
      demand.set(color, entries);
    }
  }

  let sharingTotal = 0;
  let apertureTotal = 0;
  let colorWeight = 0;
  for (const [color, blocks] of demand) {
    const gates = level.gates.filter((gate) => gate.color === color);
    if (!gates.length) {
      sharingTotal += blocks.length;
      apertureTotal += blocks.length;
      colorWeight += blocks.length;
      continue;
    }
    const sharing = clamp01((blocks.length - gates.length) / Math.max(1, blocks.length));
    const aperture = blocks.reduce((sum, block) => {
      const bestSlack = Math.max(...gates.map((gate) => gate.size - requiredSpan(block, gate)));
      return sum + (bestSlack < 0 ? 1 : 1 - clamp01(bestSlack / 3));
    }, 0) / blocks.length;
    sharingTotal += sharing * blocks.length;
    apertureTotal += aperture * blocks.length;
    colorWeight += blocks.length;
  }
  if (!colorWeight) return 0;
  return clamp01(0.7 * (sharingTotal / colorWeight) + 0.3 * (apertureTotal / colorWeight));
};

export const scoreBlockOutLevel = (level: LevelSpec): BlockOutDifficultyScore => {
  const playable = playableCellsOf(level);
  const unavailable = new Set<string>();
  for (const block of level.blocks) {
    if (block.shutterId) continue;
    for (const cell of physicalCells(block)) if (playable.has(cell)) unavailable.add(cell);
  }
  for (const shutter of level.shutters ?? []) {
    if (shutter.count <= 0) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        const key = `${x},${y}`;
        if (playable.has(key)) unavailable.add(key);
      }
    }
  }

  const unavailableRatio = unavailable.size / Math.max(1, playable.size);
  const bufferTightness = clamp01((unavailableRatio - 0.18) / 0.64);
  const hiddenStateUnits = level.gates.reduce((sum, gate) => sum + (gate.frozen ?? 0), 0)
    + level.blocks.reduce((sum, block) => (
      sum + (block.frozen ?? 0) + Math.max(0, (block.layers?.length ?? 1) - 1) * 2 + (block.star ? 2 : 0)
    ), 0)
    + (level.shutters ?? []).reduce((sum, shutter) => sum + Math.max(1, shutter.count), 0)
    + (level.elevators?.length ?? 0) * 2
    + (level.conveyors?.length ?? 0) * 2;
  const hiddenInformation = clamp01(hiddenStateUnits / 24);
  const mechanisms = mechanismTags(level, playable.size);
  const mechanismDiversity = clamp01(mechanisms.length / 7);
  const exitCompetition = exitCompetitionOf(level);
  const components = { bufferTightness, hiddenInformation, mechanismDiversity, exitCompetition };
  const score = 100 * Object.entries(BLOCK_OUT_DIFFICULTY_WEIGHTS)
    .reduce((sum, [key, weight]) => sum + components[key as keyof BlockOutDifficultyComponents] * weight, 0);

  return {
    version: "blockout-d1",
    score: round(score, 2),
    components: Object.fromEntries(
      Object.entries(components).map(([key, value]) => [key, round(value)]),
    ) as unknown as BlockOutDifficultyComponents,
    evidence: {
      playableCells: playable.size,
      openingUnavailableCells: unavailable.size,
      hiddenStateUnits,
      mechanisms,
      clearStages: level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0),
      gateCount: level.gates.length,
    },
  };
};
