import { VIDEO_PARITY_LEVELS_101_TO_200 } from "./videoParityLevels101To200.generated";
import type {
  BlockColor,
  BlockSpec,
  FlipDoorSpec,
  GateSpec,
  GeneratorSpec,
  LevelSpec,
  MovementAxis,
  Point,
  ShutterSpec,
} from "./types";

/**
 * Post-overlay restoration of player-facing mechanism *kinds* evidenced by
 * the Lv101–200 competitor-video truth. Solvability staging remains internal
 * and is never counted or rendered as a substitute for a physical shutter.
 *
 * The earlier repair layers deliberately simplify impossible generated
 * layouts. This layer keeps those solved layouts, then restores the smallest
 * real, interactive carrier for every source-proven mechanism kind. Exact
 * source entities are reused whenever they remain compatible; otherwise the
 * source metadata is projected onto the solved geometry and recorded by the
 * companion evidence report.
 */
export const MECHANISM_PARITY_REPAIR_101_TO_200_VERSION = "source-kind-restoration-r1" as const;

const SOURCE_BY_ID = new Map<number, LevelSpec>(
  VIDEO_PARITY_LEVELS_101_TO_200.map((level) => [level.id, level]),
);

/** Source-visible covers omitted by the original formal projection. */
const TRUTH_SHUTTER_LEVELS = new Set([102, 131, 154, 172, 175, 178, 193]);
/** Source-visible stage frames omitted by the original formal projection. */
const TRUTH_STAGED_FRAME_LEVELS = new Set([110, 113, 123, 145, 163, 166]);
/** Source masks omitted by the original formal projection. */
const TRUTH_IRREGULAR_BOARD_LEVELS = new Set([176, 185]);
/** Source-visible non-rectangular pieces lost by the formal projection. */
const TRUTH_IRREGULAR_BLOCK_LEVELS = new Set([174, 178, 181, 182, 185, 187, 188, 197, 199]);

const clonePoints = (points: readonly Point[]): Point[] => points.map(([x, y]) => [x, y]);
const outerColor = (block: BlockSpec): BlockColor => block.layers?.[0] ?? block.color;
const blockBounds = (block: BlockSpec): { x: number; y: number; width: number; height: number } => {
  const xs = block.shape.map(([dx]) => block.x + dx);
  const ys = block.shape.map(([, dy]) => block.y + dy);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x + 1,
    height: Math.max(...ys) - y + 1,
  };
};
const activeStageIds = (level: LevelSpec): Set<string> => new Set(
  (level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id),
);
const queuedIds = (level: LevelSpec): Set<string> => new Set(
  (level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
);
const openingBlocks = (level: LevelSpec): BlockSpec[] => {
  const closed = activeStageIds(level);
  const queued = queuedIds(level);
  return level.blocks.filter((block) => !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId)));
};
const publicShutters = (level: LevelSpec): ShutterSpec[] => (
  (level.shutters ?? []).filter((shutter) => shutter.skin == null || shutter.skin === "shutter")
);
const internalStages = (level: LevelSpec): ShutterSpec[] => (
  (level.shutters ?? []).filter((shutter) => shutter.skin === "staging")
);
const hasIrregularBoard = (level: LevelSpec): boolean => (
  (level.playable?.length ?? level.width * level.height) < level.width * level.height
);
const hasIrregularShape = (block: BlockSpec): boolean => {
  if (!block.shape.length) return false;
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return block.shape.length < area;
};

const sourceNeedsFrozenExit = (source: LevelSpec): boolean => (
  [...source.gates, ...(source.flipDoors ?? [])].some((gate) => (gate.frozen ?? 0) > 0)
);
const sourceNeedsNumericIce = (source: LevelSpec): boolean => source.blocks.some((block) => (block.frozen ?? 0) > 0);
const sourceNeedsAxis = (source: LevelSpec): boolean => source.blocks.some((block) => Boolean(block.movementAxis));
const sourceNeedsStar = (source: LevelSpec): boolean => (
  source.blocks.some((block) => block.star)
  || [...source.gates, ...(source.flipDoors ?? [])].some((gate) => gate.star)
);
const sourceNeedsIrregularBlock = (source: LevelSpec): boolean => source.blocks.some(hasIrregularShape);

const replaceBlock = (
  level: LevelSpec,
  blockId: string,
  transform: (block: BlockSpec) => BlockSpec,
): LevelSpec => ({
  ...level,
  blocks: level.blocks.map((block) => block.id === blockId ? transform(block) : block),
});

const restoreFrozenExit = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  if (!sourceNeedsFrozenExit(source) || exits.some((gate) => (gate.frozen ?? 0) > 0)) return level;
  const visibleColors = new Set(openingBlocks(level).map(outerColor));
  const sourceFrozen = [...source.gates, ...(source.flipDoors ?? [])]
    .filter((gate) => (gate.frozen ?? 0) > 0)
    .sort((left, right) => (left.frozen ?? 0) - (right.frozen ?? 0));
  const sourceGate = sourceFrozen.find((gate) => (
    exits.some((candidate) => candidate.color === gate.color) && !visibleColors.has(gate.color)
  )) ?? sourceFrozen.find((gate) => exits.some((candidate) => candidate.color === gate.color));
  const target = sourceGate
    ? exits.find((gate) => gate.color === sourceGate.color)
    : exits.find((gate) => !visibleColors.has(gate.color)) ?? exits.at(-1);
  if (!target) return level;
  const apply = <T extends GateSpec>(gate: T): T => gate.id === target.id ? { ...gate, frozen: 1 } : gate;
  return {
    ...level,
    gates: level.gates.map(apply),
    flipDoors: level.flipDoors?.map(apply),
  };
};

const restoreNumericIce = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (!sourceNeedsNumericIce(source) || level.blocks.some((block) => (block.frozen ?? 0) > 0)) return level;
  const target = openingBlocks(level).find((block) => level.blocks.some((candidate) => candidate.id !== block.id))
    ?? level.blocks[0];
  return target ? replaceBlock(level, target.id, (block) => ({ ...block, frozen: 1 })) : level;
};

const restoreAxis = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (!sourceNeedsAxis(source) || level.blocks.some((block) => block.movementAxis)) return level;
  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  const stageCount = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter.count]));
  const compatible = (block: BlockSpec, axis: MovementAxis): boolean => {
    const bounds = blockBounds(block);
    const colors = block.layers?.length ? block.layers : [block.color];
    return colors.every((color) => exits.some((gate) => {
      if (gate.color !== color) return false;
      if (axis === "horizontal") {
        return (gate.side === "left" || gate.side === "right")
          && bounds.y >= gate.offset && bounds.y + bounds.height <= gate.offset + gate.size;
      }
      return (gate.side === "top" || gate.side === "bottom")
        && bounds.x >= gate.offset && bounds.x + bounds.width <= gate.offset + gate.size;
    }));
  };
  const sourceBlock = source.blocks.find((block) => block.movementAxis);
  const candidates = [...level.blocks].sort((left, right) => (
    (stageCount.get(right.shutterId ?? "") ?? 0) - (stageCount.get(left.shutterId ?? "") ?? 0)
    || Number(right.id === sourceBlock?.id) - Number(left.id === sourceBlock?.id)
  ));
  for (const block of candidates) {
    const preferred = block.id === sourceBlock?.id ? sourceBlock.movementAxis : undefined;
    const movementAxis = preferred && compatible(block, preferred)
      ? preferred
      : (["horizontal", "vertical"] as const).find((axis) => compatible(block, axis));
    if (movementAxis) return replaceBlock(level, block.id, (candidate) => ({ ...candidate, movementAxis }));
  }
  return level;
};

const restoreStar = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  if (!sourceNeedsStar(source) || level.blocks.some((block) => block.star) || exits.some((gate) => gate.star)) return level;
  const sourceStarGate = [...source.gates, ...(source.flipDoors ?? [])].find((gate) => gate.star);
  const sourceStarBlock = source.blocks.find((block) => block.star);
  const color = sourceStarGate?.color ?? (sourceStarBlock ? outerColor(sourceStarBlock) : undefined);
  const target = level.gates.find((gate) => gate.color === color) ?? level.gates[0];
  const block = target && level.blocks.find((candidate) => outerColor(candidate) === target.color);
  if (!target || !block) return level;
  return {
    ...replaceBlock(level, block.id, (candidate) => ({ ...candidate, star: true })),
    gates: level.gates.map((gate) => gate.id === target.id ? { ...gate, star: true } : gate),
  };
};

const restorePhysicalShutter = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (publicShutters(level).length) return level;
  if (!publicShutters(source).length && !TRUTH_SHUTTER_LEVELS.has(level.id)) return level;
  const stages = internalStages(level).sort((left, right) => left.count - right.count);
  const sourceValues = publicShutters(source).map((shutter) => shutter.count);
  const stage = stages.find((candidate) => sourceValues.includes(candidate.count)) ?? stages[0];
  if (!stage) return level;
  const hidden = level.blocks.find((block) => block.shutterId === stage.id);
  if (!hidden) return level;
  const region = blockBounds(hidden);
  const shutter: ShutterSpec = {
    ...stage,
    ...region,
    skin: "shutter",
  };
  return {
    ...level,
    shutters: (level.shutters ?? []).map((candidate) => candidate.id === stage.id ? shutter : candidate),
  };
};

const restoreStagedFrame = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (!TRUTH_STAGED_FRAME_LEVELS.has(level.id)
    && !(source.shutters ?? []).some((shutter) => shutter.skin === "staged-frame")) return level;
  if ((level.shutters ?? []).some((shutter) => shutter.skin === "staged-frame")) return level;
  const trigger = openingBlocks(level)[0];
  const stage = internalStages(level).sort((left, right) => left.count - right.count)
    .find((candidate) => level.blocks.some((block) => block.shutterId === candidate.id));
  const hidden = stage && level.blocks.find((block) => block.shutterId === stage.id);
  if (!trigger || !stage || !hidden) return level;
  const triggerBounds = blockBounds(trigger);
  const hiddenBounds = blockBounds(hidden);
  const x = Math.min(triggerBounds.x, hiddenBounds.x);
  const y = Math.min(triggerBounds.y, hiddenBounds.y);
  const right = Math.max(triggerBounds.x + triggerBounds.width, hiddenBounds.x + hiddenBounds.width);
  const bottom = Math.max(triggerBounds.y + triggerBounds.height, hiddenBounds.y + hiddenBounds.height);
  const frameId = `mechanism-parity-frame-${level.id}`;
  const frame: ShutterSpec = {
    id: frameId,
    x,
    y,
    width: right - x,
    height: bottom - y,
    count: 1,
    skin: "staged-frame",
    triggerBlockIds: [trigger.id],
  };
  const blocked = new Set((level.blocked ?? []).map(([cellX, cellY]) => `${cellX},${cellY}`));
  const required = new Map((level.playable ?? Array.from({ length: level.height }, (_, cellY) => (
    Array.from({ length: level.width }, (__, cellX) => [cellX, cellY] as Point)
  )).flat().filter(([cellX, cellY]) => !blocked.has(`${cellX},${cellY}`))).map((point) => [`${point[0]},${point[1]}`, point]));
  for (let cellY = y; cellY < bottom; cellY += 1) for (let cellX = x; cellX < right; cellX += 1) {
    required.set(`${cellX},${cellY}`, [cellX, cellY]);
  }
  return {
    ...level,
    playable: level.playable || level.blocked ? [...required.values()] : undefined,
    blocked: level.playable || level.blocked ? undefined : level.blocked,
    blocks: level.blocks.map((block) => block.id === hidden.id ? { ...block, shutterId: frameId } : block),
    shutters: (level.shutters ?? []).filter((candidate) => candidate.id !== stage.id).concat(frame),
  };
};

const restoreIrregularBlock = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if ((!sourceNeedsIrregularBlock(source) && !TRUTH_IRREGULAR_BLOCK_LEVELS.has(level.id))
    || level.blocks.some(hasIrregularShape)) return level;
  const stageCount = new Map((level.shutters ?? []).map((shutter) => [shutter.id, shutter.count]));
  const target = level.blocks
    .map((block) => ({ block, bounds: blockBounds(block) }))
    .filter(({ block, bounds }) => block.shape.length === bounds.width * bounds.height
      && bounds.width >= 2 && bounds.height >= 2)
    .sort((left, right) => (stageCount.get(right.block.shutterId ?? "") ?? 0)
      - (stageCount.get(left.block.shutterId ?? "") ?? 0)
      || left.block.shape.length - right.block.shape.length)[0]?.block;
  if (target) {
    const maxX = Math.max(...target.shape.map(([x]) => x));
    const maxY = Math.max(...target.shape.map(([, y]) => y));
    return replaceBlock(level, target.id, (block) => ({
      ...block,
      shape: block.shape.filter(([x, y]) => x !== maxX || y !== maxY),
    }));
  }
  const visible = openingBlocks(level);
  const playable = new Set((level.playable ?? Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => [x, y] as Point)
  )).flat()).map(([x, y]) => `${x},${y}`));
  const candidates = [...level.blocks]
    .filter((candidate) => candidate.shape.length >= 3)
    .sort((left, right) => (stageCount.get(right.shutterId ?? "") ?? 0)
      - (stageCount.get(left.shutterId ?? "") ?? 0));
  for (const block of candidates) {
    const bounds = blockBounds(block);
    const horizontal = bounds.height === 1 && bounds.width === block.shape.length;
    const vertical = bounds.width === 1 && bounds.height === block.shape.length;
    if (!horizontal && !vertical) continue;
    const add: Point = horizontal ? [0, 1] : [1, 0];
    const absolute = `${block.x + add[0]},${block.y + add[1]}`;
    const occupied = !block.shutterId && visible.some((candidate) => candidate.id !== block.id
      && candidate.shape.some(([x, y]) => `${candidate.x + x},${candidate.y + y}` === absolute));
    if (!playable.has(absolute) || occupied) continue;
    const endX = horizontal ? bounds.width - 1 : 0;
    const endY = vertical ? bounds.height - 1 : 0;
    return replaceBlock(level, block.id, (candidate) => ({
      ...candidate,
      shape: candidate.shape.filter(([x, y]) => x !== endX || y !== endY).concat([add]),
    }));
  }
  return level;
};

const generatorClone = (generator: GeneratorSpec): GeneratorSpec => ({
  ...generator,
  spawn: [...generator.spawn] as Point,
  queueBlockIds: [...generator.queueBlockIds],
  ...(generator.rimAnchor ? { rimAnchor: { ...generator.rimAnchor } } : {}),
});

const restoreFlipDoor = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (!(source.flipDoors?.length) || level.flipDoors?.length) return level;
  const sourceDoor = source.flipDoors[0]!;
  const gate = level.gates.find((candidate) => candidate.color === sourceDoor.color) ?? level.gates[0];
  if (!gate) return level;
  const door: FlipDoorSpec = {
    ...gate,
    id: `mechanism-parity-flip-${level.id}`,
    initiallyOpen: sourceDoor.initiallyOpen,
  };
  return {
    ...level,
    gates: level.gates.filter((candidate) => candidate.id !== gate.id),
    flipDoors: [door],
  };
};

const restoreColoredGrid = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (!(source.coloredGrids?.length) || level.coloredGrids?.length) return level;
  const sourceGrid = source.coloredGrids[0]!;
  const block = openingBlocks(level).find((candidate) => outerColor(candidate) === sourceGrid.color)
    ?? level.blocks.find((candidate) => outerColor(candidate) === sourceGrid.color);
  if (!block) return level;
  const [dx, dy] = block.shape[0]!;
  return {
    ...level,
    coloredGrids: [{ id: sourceGrid.id, color: sourceGrid.color, cells: [[block.x + dx, block.y + dy]] }],
  };
};

const protectedCells = (level: LevelSpec): Set<string> => {
  const result = new Set<string>();
  const add = (x: number, y: number) => result.add(`${x},${y}`);
  for (const block of level.blocks) for (const [dx, dy] of block.shape) add(block.x + dx, block.y + dy);
  for (const shutter of (level.shutters ?? []).filter((candidate) => candidate.skin !== "staging")) {
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) add(x, y);
    }
  }
  for (const gate of [...level.gates, ...(level.flipDoors ?? [])]) for (let step = 0; step < gate.size; step += 1) {
    add(
      gate.side === "left" ? 0 : gate.side === "right" ? level.width - 1 : gate.offset + step,
      gate.side === "top" ? 0 : gate.side === "bottom" ? level.height - 1 : gate.offset + step,
    );
  }
  for (const generator of level.generators ?? []) for (const blockId of generator.queueBlockIds) {
    const block = level.blocks.find((candidate) => candidate.id === blockId);
    if (!block) continue;
    for (const [dx, dy] of block.shape) add(generator.spawn[0] + dx, generator.spawn[1] + dy);
  }
  for (const grid of level.coloredGrids ?? []) for (const [x, y] of grid.cells) add(x, y);
  return result;
};

const restoreIrregularBoard = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  const sourceIrregular = hasIrregularBoard(source) || TRUTH_IRREGULAR_BOARD_LEVELS.has(level.id);
  if (!sourceIrregular || hasIrregularBoard(level)) return level;
  const protectedSet = protectedCells(level);
  const full = Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => [x, y] as Point)
  )).flat();
  const candidate = new Map(full.map((point) => [`${point[0]},${point[1]}`, point] as const));
  const hole = [...full].reverse().find(([x, y]) => !protectedSet.has(`${x},${y}`));
  if (hole) candidate.delete(`${hole[0]},${hole[1]}`);
  return candidate.size < full.length ? { ...level, playable: [...candidate.values()], blocked: undefined } : level;
};

export const applyMechanismParityRepair101To200 = (input: LevelSpec): LevelSpec => {
  if (input.id < 101 || input.id > 200 || input.id === 190 || input.id === 191) return input;
  const source = SOURCE_BY_ID.get(input.id);
  if (!source) return input;
  let level: LevelSpec = {
    ...input,
    gates: input.gates.map((gate) => ({ ...gate })),
    blocks: input.blocks.map((block) => ({
      ...block,
      shape: clonePoints(block.shape),
      ...(block.layers ? { layers: [...block.layers] } : {}),
    })),
    shutters: input.shutters?.map((shutter) => ({
      ...shutter,
      ...(shutter.triggerBlockIds ? { triggerBlockIds: [...shutter.triggerBlockIds] } : {}),
    })),
    generators: input.generators?.map(generatorClone),
    flipDoors: input.flipDoors?.map((door) => ({ ...door })),
    coloredGrids: input.coloredGrids?.map((grid) => ({ ...grid, cells: clonePoints(grid.cells) })),
    playable: input.playable ? clonePoints(input.playable) : undefined,
    blocked: input.blocked ? clonePoints(input.blocked) : undefined,
  };
  level = restorePhysicalShutter(level, source);
  level = restoreStagedFrame(level, source);
  level = restoreFrozenExit(level, source);
  level = restoreNumericIce(level, source);
  level = restoreAxis(level, source);
  level = restoreStar(level, source);
  level = restoreIrregularBlock(level, source);
  level = restoreFlipDoor(level, source);
  level = restoreColoredGrid(level, source);
  level = restoreIrregularBoard(level, source);
  return level;
};
