import type { BlockSpec, GeneratorSpec, LevelSpec, Point, Side } from "./types";
import { VIDEO_PARITY_LEVELS } from "./videoParityLevels.generated";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "./videoParityLevels101To200.generated";
import { buildBoardRimLayout, type BoardRimRail } from "../game/boardRim";
import { gatePortals, portalMouthCells } from "./gatePortals";
import {
  buildGeneratorRimGeometry,
  type GeneratorRimAnchor,
  type GeneratorRimBounds,
} from "../game/generatorRimGeometry";

/** Levels whose canonical generator queues were removed or truncated by a later repair. */
export const GENERATOR_CONTRACT_RESTORE_LEVEL_IDS = Object.freeze([
  70, 119, 129, 132, 138, 139, 143, 161, 177, 183, 186,
] as const);

const RESTORE_LEVEL_IDS = new Set<number>(GENERATOR_CONTRACT_RESTORE_LEVEL_IDS);
const SIDE_BY_QUARTER_TURN: readonly Side[] = ["top", "right", "bottom", "left"];

const pointKey = (x: number, y: number): string => `${x},${y}`;
const railKey = ({ x, y, quarterTurns }: BoardRimRail): string => `${quarterTurns}:${x},${y}`;

const fullRectangle = (width: number, height: number): Point[] => {
  const result: Point[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) result.push([x, y]);
  }
  return result;
};

const activePlayable = (level: Pick<LevelSpec, "width" | "height" | "playable" | "blocked">): Point[] => {
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => pointKey(x, y)));
  return (level.playable ?? fullRectangle(level.width, level.height))
    .filter(([x, y]) => !blocked.has(pointKey(x, y)));
};

const exitRailKeys = (level: Pick<LevelSpec, "width" | "height" | "gates" | "flipDoors">): Set<string> => {
  const result = new Set<string>();
  for (const exit of [...level.gates, ...(level.flipDoors ?? [])]) {
    for (const portal of gatePortals(level, exit)) for (const [x, y] of portalMouthCells(portal)) {
      const rail: BoardRimRail = portal.side === "top"
        ? { x: x + 0.5, y, quarterTurns: 0 }
        : portal.side === "right"
          ? { x: x + 1, y: y + 0.5, quarterTurns: 1 }
          : portal.side === "bottom"
            ? { x: x + 0.5, y: y + 1, quarterTurns: 2 }
            : { x, y: y + 0.5, quarterTurns: 3 };
      result.add(railKey(rail));
    }
  }
  return result;
};

interface PlacementCandidate {
  anchor: GeneratorRimAnchor;
  bounds: GeneratorRimBounds;
  railKeys: string[];
}

const overlapsWithPositiveArea = (left: GeneratorRimBounds, right: GeneratorRimBounds): boolean => (
  Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x) > 1e-9
  && Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y) > 1e-9
);

const placementCandidates = (level: LevelSpec): PlacementCandidate[] => {
  const playable = activePlayable(level);
  const exposed = buildBoardRimLayout(playable, [], level.width, level.height).rails;
  const exposedKeys = new Set(exposed.map(railKey));
  const exits = exitRailKeys(level);
  return exposed.flatMap((anchorRail) => {
    const anchor: GeneratorRimAnchor = { ...anchorRail };
    const geometry = buildGeneratorRimGeometry(anchor);
    const railKeys = geometry.reservedRails.map(railKey);
    if (!railKeys.every((key) => exposedKeys.has(key) && !exits.has(key))) return [];
    return [{ anchor, bounds: geometry.visualBounds, railKeys }];
  });
};

const defaultAnchor = (generator: GeneratorSpec, level: LevelSpec): GeneratorRimAnchor => {
  if (generator.rimAnchor) return { ...generator.rimAnchor };
  if (generator.side === "top") return { x: generator.offset + 0.5, y: 0, quarterTurns: 0 };
  if (generator.side === "right") return { x: level.width, y: generator.offset + 0.5, quarterTurns: 1 };
  if (generator.side === "bottom") return { x: generator.offset + 0.5, y: level.height, quarterTurns: 2 };
  return { x: 0, y: generator.offset + 0.5, quarterTurns: 3 };
};

const placementScore = (
  candidate: PlacementCandidate,
  generator: GeneratorSpec,
  level: LevelSpec,
): number => {
  const preferred = defaultAnchor(generator, level);
  const orientationDistance = Math.min(
    Math.abs(candidate.anchor.quarterTurns - preferred.quarterTurns),
    4 - Math.abs(candidate.anchor.quarterTurns - preferred.quarterTurns),
  );
  return orientationDistance * 10_000
    + (candidate.anchor.x - preferred.x) ** 2
    + (candidate.anchor.y - preferred.y) ** 2;
};

const assignPlacements = (level: LevelSpec, generators: readonly GeneratorSpec[]): PlacementCandidate[] => {
  const candidates = placementCandidates(level);
  if (candidates.length < generators.length) {
    throw new Error(`Lv${level.id}: ${generators.length} generators but only ${candidates.length} legal rim anchors`);
  }
  const orderedCandidates = generators.map((generator) => candidates
    .map((candidate, sourceIndex) => ({ candidate, sourceIndex }))
    .sort((left, right) => (
      placementScore(left.candidate, generator, level) - placementScore(right.candidate, generator, level)
      || left.sourceIndex - right.sourceIndex
    ))
    .map(({ candidate }) => candidate));
  const assignments: Array<PlacementCandidate | undefined> = Array(generators.length);
  const occupiedRails = new Set<string>();
  const occupiedBounds: GeneratorRimBounds[] = [];

  const visit = (generatorIndex: number): boolean => {
    if (generatorIndex === generators.length) return true;
    for (const candidate of orderedCandidates[generatorIndex]!) {
      if (candidate.railKeys.some((key) => occupiedRails.has(key))) continue;
      if (occupiedBounds.some((bounds) => overlapsWithPositiveArea(bounds, candidate.bounds))) continue;
      assignments[generatorIndex] = candidate;
      candidate.railKeys.forEach((key) => occupiedRails.add(key));
      occupiedBounds.push(candidate.bounds);
      if (visit(generatorIndex + 1)) return true;
      occupiedBounds.pop();
      candidate.railKeys.forEach((key) => occupiedRails.delete(key));
      assignments[generatorIndex] = undefined;
    }
    return false;
  };

  if (!visit(0)) throw new Error(`Lv${level.id}: generators cannot share the available exposed rim without overlap`);
  return assignments as PlacementCandidate[];
};

const offsetFromAnchor = (anchor: GeneratorRimAnchor): number => (
  anchor.quarterTurns === 0 || anchor.quarterTurns === 2 ? anchor.x - 0.5 : anchor.y - 0.5
);

const cloneGenerator = (generator: GeneratorSpec): GeneratorSpec => ({
  ...generator,
  spawn: [...generator.spawn],
  queueBlockIds: [...generator.queueBlockIds],
  ...(generator.rimAnchor ? { rimAnchor: { ...generator.rimAnchor } } : {}),
});

const canonicalGenerators = (levelId: number): GeneratorSpec[] | undefined => {
  const source = levelId <= 100
    ? VIDEO_PARITY_LEVELS[levelId - 1]
    : VIDEO_PARITY_LEVELS_101_TO_200[levelId - 101];
  return source?.generators?.map(cloneGenerator);
};

const generatorRimMaskProtectedCells = (level: LevelSpec): Set<string> => {
  const result = new Set<string>();
  const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  for (const block of level.blocks.filter((candidate) => !queuedIds.has(candidate.id))) {
    for (const [dx, dy] of block.shape) result.add(pointKey(block.x + dx, block.y + dy));
  }
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  for (const generator of level.generators ?? []) {
    for (const blockId of generator.queueBlockIds) {
      const block = blockById.get(blockId);
      if (!block) continue;
      for (const footprint of blockFootprint(block, generator.spawn)) result.add(footprint);
    }
  }
  for (const exit of [...level.gates, ...(level.flipDoors ?? [])]) {
    for (const portal of gatePortals(level, exit)) {
      for (const [x, y] of portalMouthCells(portal)) result.add(pointKey(x, y));
    }
  }
  for (const grid of level.coloredGrids ?? []) {
    for (const [x, y] of grid.cells) result.add(pointKey(x, y));
  }
  for (const shutter of (level.shutters ?? []).filter((candidate) => candidate.skin !== "staging")) {
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) result.add(pointKey(x, y));
    }
  }
  return result;
};

const alreadyHasGeneratorRimCapacity = (level: LevelSpec): boolean => {
  try {
    assignPlacements(level, level.generators ?? []);
    return true;
  } catch {
    return false;
  }
};

/**
 * Three source masks do not contain enough unobstructed three-rail spans for
 * their observed machine count. These cells were audited as unused by active
 * blocks, queue spawns, exits, covers, and coloured grids. The smallest safe
 * mask edits create real local outline segments instead of floating devices.
 */
const repairGeneratorRimCapacity = (level: LevelSpec): LevelSpec => {
  if (!(level.generators?.length)) return level;
  if (alreadyHasGeneratorRimCapacity(level)) return level;
  const playable = activePlayable(level);
  const keys = new Set(playable.map(([x, y]) => pointKey(x, y)));
  const protectedCells = generatorRimMaskProtectedCells(level);
  if (level.id === 43 && ["1,1", "1,2", "1,3"].every((key) => keys.has(key))) {
    const removals = ["1,1", "1,2", "1,3"];
    if (removals.some((key) => protectedCells.has(key))) {
      throw new Error("Lv43: audited generator rim wall cells became occupied");
    }
    const blocked = new Map((level.blocked ?? []).map((point) => [pointKey(point[0], point[1]), point]));
    for (const point of [[1, 1], [1, 2], [1, 3]] as const) blocked.set(pointKey(point[0], point[1]), point);
    return { ...level, blocked: [...blocked.values()] };
  }
  if (level.id === 88 && !keys.has("3,1")) {
    return {
      ...level,
      playable: [...playable, [3, 1]],
      blocked: level.blocked?.filter(([x, y]) => x !== 3 || y !== 1),
    };
  }
  if (level.id === 114 && !keys.has("3,3") && keys.has("3,4")) {
    return {
      ...level,
      playable: [...playable, [3, 3]],
      blocked: level.blocked?.filter(([x, y]) => x !== 3 || y !== 3),
    };
  }
  return level;
};

const restoreCanonicalGeneratorQueue = (level: LevelSpec): LevelSpec => {
  if (!RESTORE_LEVEL_IDS.has(level.id)) return level;
  const generators = canonicalGenerators(level.id);
  if (!generators?.length) throw new Error(`Lv${level.id}: canonical generator contract is missing`);
  const queuedIds = new Set(generators.flatMap((generator) => generator.queueBlockIds));
  const blocks = level.blocks.map((block) => {
    if (!queuedIds.has(block.id) || !block.shutterId) return block;
    const restored = { ...block };
    delete restored.shutterId;
    return restored;
  });
  const referencedShutters = new Set(blocks.flatMap((block) => block.shutterId ? [block.shutterId] : []));
  const shutters = level.shutters?.filter((shutter) => (
    shutter.skin !== "staging" || referencedShutters.has(shutter.id)
  ));
  return {
    ...level,
    blocks,
    generators,
    ...(shutters?.length ? { shutters } : { shutters: undefined }),
  };
};

/** Final, deterministic generator contract overlay. Keep this as the last LEVELS map. */
export const applyFinalGeneratorContracts = (source: LevelSpec): LevelSpec => {
  let level = restoreCanonicalGeneratorQueue(source);
  if (!(level.generators?.length)) return level;
  level = repairGeneratorRimCapacity(level);
  const generators = level.generators;
  if (!generators?.length) return level;
  const placements = assignPlacements(level, generators);
  return {
    ...level,
    generators: generators.map((generator, index): GeneratorSpec => {
      const anchor = placements[index]!.anchor;
      return {
        ...cloneGenerator(generator),
        side: SIDE_BY_QUARTER_TURN[anchor.quarterTurns]!,
        offset: offsetFromAnchor(anchor),
        rimSpan: 3,
        rimMount: "rim",
        rimAnchor: { ...anchor },
      };
    }),
  };
};

const blockFootprint = (block: BlockSpec, spawn: Point): string[] => block.shape.map(([dx, dy]) => (
  pointKey(spawn[0] + dx, spawn[1] + dy)
));

/** Read-only final-level validator used by Vitest and the CLI. */
export const finalGeneratorPlacementIssues = (level: LevelSpec): string[] => {
  const generators = level.generators ?? [];
  if (!generators.length) return [];
  const issues: string[] = [];
  const activeKeys = new Set(activePlayable(level).map(([x, y]) => pointKey(x, y)));
  const exposedKeys = new Set(buildBoardRimLayout(
    activePlayable(level), [], level.width, level.height,
  ).rails.map(railKey));
  const exits = exitRailKeys(level);
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  const coloredGridByCell = new Map((level.coloredGrids ?? []).flatMap((grid) => (
    grid.cells.map(([x, y]) => [pointKey(x, y), grid.color] as const)
  )));
  const occupiedRails = new Map<string, string>();
  const occupiedBounds: Array<{ id: string; bounds: GeneratorRimBounds }> = [];

  for (const generator of generators) {
    const prefix = `Lv${level.id} ${generator.id}`;
    if (generator.rimSpan !== 3) issues.push(`${prefix}: rimSpan must be 3`);
    if (generator.rimMount !== "rim") issues.push(`${prefix}: rimMount must be rim`);
    if (!generator.rimAnchor) {
      issues.push(`${prefix}: explicit rimAnchor is required`);
      continue;
    }
    const geometry = buildGeneratorRimGeometry(generator.rimAnchor);
    for (const rail of geometry.reservedRails) {
      const key = railKey(rail);
      if (!exposedKeys.has(key)) issues.push(`${prefix}: reserved rail ${key} is not exposed`);
      if (exits.has(key)) issues.push(`${prefix}: reserved rail ${key} overlaps an exit`);
      const owner = occupiedRails.get(key);
      if (owner) issues.push(`${prefix}: reserved rail ${key} overlaps ${owner}`);
      occupiedRails.set(key, generator.id);
    }
    const expectedSide = SIDE_BY_QUARTER_TURN[generator.rimAnchor.quarterTurns]!;
    const expectedOffset = offsetFromAnchor(generator.rimAnchor);
    if (generator.side !== expectedSide || generator.offset !== expectedOffset) {
      issues.push(`${prefix}: side/offset disagree with rimAnchor`);
    }
    for (const occupied of occupiedBounds) {
      if (overlapsWithPositiveArea(occupied.bounds, geometry.visualBounds)) {
        issues.push(`${prefix}: visual bounds overlap ${occupied.id}`);
      }
    }
    occupiedBounds.push({ id: generator.id, bounds: geometry.visualBounds });

    for (const blockId of generator.queueBlockIds) {
      const block = blockById.get(blockId);
      if (!block) {
        issues.push(`${prefix}: queued block ${blockId} is missing`);
        continue;
      }
      if ((block.frozen ?? 0) > 0) {
        issues.push(`${prefix}: queued block ${blockId} cannot be frozen`);
      }
      const footprint = blockFootprint(block, generator.spawn);
      const invalidCells = footprint.filter((key) => !activeKeys.has(key));
      if (invalidCells.length) issues.push(`${prefix}: ${blockId} spawn footprint leaves playable mask at ${invalidCells.join("|")}`);
      const activeColor = block.layers?.[0] ?? block.color;
      const wrongGridCells = footprint.filter((key) => {
        const gridColor = coloredGridByCell.get(key);
        return gridColor !== undefined && gridColor !== activeColor;
      });
      if (wrongGridCells.length) issues.push(`${prefix}: ${blockId} spawn footprint mismatches a coloured grid at ${wrongGridCells.join("|")}`);
    }
  }
  return issues;
};

export interface GeneratorTruthContract {
  levelId: number;
  count: number | null;
  queueLengths: number[] | null;
}

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord | undefined => (
  value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined
);
const records = (value: unknown): JsonRecord[] => (
  Array.isArray(value) ? value.map(record).filter((value): value is JsonRecord => Boolean(value)) : []
);
const finiteNonNegativeInteger = (value: unknown): number | undefined => (
  Number.isInteger(value) && Number(value) >= 0 ? Number(value) : undefined
);

/** Extracts the canonical count/queue contract from either truth schema. */
export const extractGeneratorTruthContracts = (truth: unknown): GeneratorTruthContract[] => {
  const root = record(truth);
  return records(root?.levels).map((level): GeneratorTruthContract => {
    const levelId = finiteNonNegativeInteger(level.level)
      ?? Number(String(level.level_id ?? "").replace(/\D/g, ""));
    const mechanisms = record(level.mechanisms);
    const source = mechanisms?.generators;
    if (source === null || source === "unclear") return { levelId, count: null, queueLengths: null };
    if (Array.isArray(source)) {
      const generators = records(source);
      const queueLengths = generators.map((generator) => {
        const direct = finiteNonNegativeInteger(generator.queue_length)
          ?? finiteNonNegativeInteger(generator.queue_count);
        if (direct !== undefined) return direct;
        if (Array.isArray(generator.queue)) return generator.queue.length;
        return null;
      });
      return {
        levelId,
        count: generators.length,
        queueLengths: queueLengths.every((value): value is number => value !== null)
          ? queueLengths.toSorted((a, b) => a - b) : null,
      };
    }
    const generators = record(source);
    const count = generators ? finiteNonNegativeInteger(generators.count) ?? null : 0;
    const rawLengths = Array.isArray(generators?.queue_lengths) ? generators.queue_lengths : [];
    const queueLengths = rawLengths.map((value) => {
      const parsed = finiteNonNegativeInteger(value);
      if (parsed === undefined) throw new Error(`Lv${levelId}: generator queue length is unknown`);
      return parsed;
    }).toSorted((a, b) => a - b);
    if (count !== null && queueLengths.length !== count) {
      if (count === 0 && queueLengths.length === 0) return { levelId, count, queueLengths };
      if (!rawLengths.length) return { levelId, count, queueLengths: null };
      throw new Error(`Lv${levelId}: generator count ${count} disagrees with ${queueLengths.length} queues`);
    }
    return { levelId, count, queueLengths };
  });
};

export const finalGeneratorTruthIssues = (
  levels: readonly LevelSpec[],
  contracts: readonly GeneratorTruthContract[],
): string[] => {
  const levelById = new Map(levels.map((level) => [level.id, level]));
  const issues: string[] = [];
  for (const contract of contracts) {
    const level = levelById.get(contract.levelId);
    if (!level) {
      issues.push(`Lv${contract.levelId}: final level is missing`);
      continue;
    }
    const generators = level.generators ?? [];
    const queueLengths = generators.map((generator) => generator.queueBlockIds.length).toSorted((a, b) => a - b);
    if (contract.count !== null && generators.length !== contract.count) {
      issues.push(`Lv${contract.levelId}: generator count ${generators.length}, expected ${contract.count}`);
    }
    if (contract.queueLengths !== null && queueLengths.join(",") !== contract.queueLengths.join(",")) {
      issues.push(`Lv${contract.levelId}: generator queues [${queueLengths}], expected [${contract.queueLengths}]`);
    }
  }
  return issues;
};
