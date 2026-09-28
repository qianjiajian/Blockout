import { VIDEO_PARITY_LEVELS } from "./videoParityLevels.generated";
import type {
  BlockSpec,
  GateSpec,
  GeneratorSpec,
  LevelSpec,
  Point,
  ShutterSpec,
} from "./types";

export const MECHANISM_PARITY_REPAIR_1_TO_100_VERSION = "source-mechanism-kinds-r1" as const;

export const MECHANISM_PARITY_REPAIR_1_TO_100_LEVEL_IDS = [
  8, 10, 11, 16, 17, 19, 20, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
  34, 38, 39, 40, 41, 46, 47, 48, 49, 51, 52, 53, 54, 55, 57, 58, 59, 60,
  61, 62, 64, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 79, 83, 84,
  87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 99, 100,
] as const;

const REPAIR_IDS = new Set<number>(MECHANISM_PARITY_REPAIR_1_TO_100_LEVEL_IDS);
const LV19_20_BLOCK_COLOR_REPAIR: Readonly<Record<string, BlockSpec["color"]>> = {
  "cc-piece-01": "purple",
  "cc-piece-03": "green",
  "strategy-guard-06": "yellow",
  "cc-piece-09": "red",
  "cc-piece-12": "blue",
  "strategy-guard-16": "blue",
};
const IRREGULAR_HOLE_EXCEPTIONS: Readonly<Record<number, Point>> = {
  26: [3, 4],
  30: [3, 6],
  47: [3, 6],
  73: [6, 11],
  75: [6, 10],
  87: [2, 8],
  92: [6, 11],
  93: [7, 8],
  95: [3, 10],
  99: [6, 9],
};
const NUMERIC_ICE_TARGET_EXCEPTIONS: Readonly<Record<number, string>> = {
  58: "cc-058-b1-12",
};
const AXIS_TARGET_EXCEPTIONS: Readonly<Record<number, readonly [string, "horizontal" | "vertical"]>> = {
  91: ["cc-091-b1-13", "horizontal"],
  93: ["cc-093-b1-03", "vertical"],
  99: ["cc-099-b2-04", "horizontal"],
};
const sourceIdFor = (runtimeId: number): number => runtimeId;
const sourceFor = (runtimeId: number): LevelSpec => VIDEO_PARITY_LEVELS[sourceIdFor(runtimeId) - 1]!;

const clonePoints = (points: readonly Point[] | undefined): Point[] | undefined => (
  points?.map(([x, y]) => [x, y] as Point)
);
const cloneGate = (gate: GateSpec): GateSpec => ({ ...gate });
const cloneBlock = (block: BlockSpec): BlockSpec => ({
  ...block,
  shape: clonePoints(block.shape)!,
  layers: block.layers ? [...block.layers] : undefined,
});
const cloneShutter = (shutter: ShutterSpec): ShutterSpec => ({
  ...shutter,
  triggerBlockIds: shutter.triggerBlockIds ? [...shutter.triggerBlockIds] : undefined,
});
const cloneGenerator = (generator: GeneratorSpec): GeneratorSpec => ({
  ...generator,
  spawn: [...generator.spawn] as Point,
  queueBlockIds: [...generator.queueBlockIds],
  rimAnchor: generator.rimAnchor ? { ...generator.rimAnchor } : undefined,
});

const isOrdinaryShutter = (shutter: ShutterSpec): boolean => (
  shutter.skin === undefined || shutter.skin === "shutter"
);
const hasIrregularBoard = (level: LevelSpec): boolean => (
  (level.playable?.length ?? level.width * level.height - (level.blocked?.length ?? 0))
  < level.width * level.height
);
const bounds = (block: BlockSpec): { x: number; y: number; width: number; height: number } => {
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: block.x + minX,
    y: block.y + minY,
    width: Math.max(...xs) - minX + 1,
    height: Math.max(...ys) - minY + 1,
  };
};

const removeUnusedStaging = (level: LevelSpec): LevelSpec => {
  const referenced = new Set(level.blocks.flatMap((block) => block.shutterId ? [block.shutterId] : []));
  return {
    ...level,
    shutters: level.shutters?.filter((shutter) => shutter.skin !== "staging" || referenced.has(shutter.id)),
  };
};

const withFrozenExit = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (level.gates.some((gate) => (gate.frozen ?? 0) > 0)
    || (level.flipDoors ?? []).some((gate) => (gate.frozen ?? 0) > 0)) return level;
  const candidates = source.gates
    .filter((gate) => (gate.frozen ?? 0) > 0)
    .sort((left, right) => left.frozen! - right.frozen!);
  if (!candidates.length || !level.gates.length) return level;
  const sourceGate = candidates[0]!;
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const openingColors = new Set(level.blocks.filter((block) => !block.shutterId && !queued.has(block.id))
    .map((block) => block.layers?.[0] ?? block.color));
  const sourceIndex = level.gates.findIndex((gate) => (
    gate.color === sourceGate.color && !openingColors.has(gate.color)
  ));
  const nonOpeningIndex = level.gates.findIndex((gate) => !openingColors.has(gate.color));
  const index = sourceIndex >= 0 ? sourceIndex : Math.max(0, nonOpeningIndex);
  return {
    ...level,
    gates: level.gates.map((gate, gateIndex) => gateIndex === index
      // The taxonomy contract is the real thaw interaction, not the source's
      // numeric tuning. One completed clear is the least invasive way to
      // restore it without invalidating an already-proved runtime route.
      ? { ...gate, frozen: 1 }
      : gate),
  };
};

const withNumericIce = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (level.blocks.some((block) => (block.frozen ?? 0) > 0)) return level;
  const sourceFrozen = source.blocks
    .filter((block) => (block.frozen ?? 0) > 0)
    .sort((left, right) => left.frozen! - right.frozen!);
  const currentIds = new Set(level.blocks.map((block) => block.id));
  const exact = sourceFrozen.find((block) => currentIds.has(block.id));
  const targetId = NUMERIC_ICE_TARGET_EXCEPTIONS[level.id]
    ?? exact?.id ?? level.blocks.find((block) => !block.shutterId)?.id ?? level.blocks[0]?.id;
  const frozen = exact?.frozen ?? sourceFrozen[0]?.frozen;
  if (!targetId || !frozen) return level;
  return {
    ...level,
    blocks: level.blocks.map((block) => block.id === targetId ? { ...block, frozen: 1 } : block),
  };
};

const withAxisBlock = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (level.blocks.some((block) => block.movementAxis)) return level;
  const override = AXIS_TARGET_EXCEPTIONS[level.id];
  if (override) return {
    ...level,
    blocks: level.blocks.map((block) => block.id === override[0]
      ? { ...block, movementAxis: override[1] }
      : block),
  };
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  const candidate = source.blocks.filter((block) => block.movementAxis && byId.has(block.id)).find((block) => {
    const current = byId.get(block.id)!;
    return level.gates.some((gate) => gate.color === current.color && (
      block.movementAxis === "horizontal"
        ? gate.side === "left" || gate.side === "right"
        : gate.side === "top" || gate.side === "bottom"
    ));
  }) ?? source.blocks.find((block) => block.movementAxis && byId.has(block.id));
  if (!candidate?.movementAxis) return level;
  return {
    ...level,
    blocks: level.blocks.map((block) => block.id === candidate.id
      ? { ...block, movementAxis: candidate.movementAxis }
      : block),
  };
};

const withGenerator = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if ((level.generators ?? []).some((generator) => (generator.trigger ?? "move") !== "time")) return level;
  const sourceGenerators = (source.generators ?? [])
    .filter((generator) => (generator.trigger ?? "move") !== "time")
    .map(cloneGenerator);
  if (!sourceGenerators.length) return level;
  const queueIds = new Set(sourceGenerators.flatMap((generator) => generator.queueBlockIds));
  const currentIds = new Set(level.blocks.map((block) => block.id));
  if ([...queueIds].some((id) => !currentIds.has(id))) return level;
  return removeUnusedStaging({
    ...level,
    blocks: level.blocks.map((block) => queueIds.has(block.id)
      ? { ...block, shutterId: undefined }
      : block),
    generators: [...(level.generators ?? []).map(cloneGenerator), ...sourceGenerators],
  });
};

const withOrdinaryShutter = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if ((level.shutters ?? []).some(isOrdinaryShutter)) return level;
  const sourceShutter = (source.shutters ?? []).filter(isOrdinaryShutter)
    .sort((left, right) => left.count - right.count)[0];
  if (!sourceShutter) return level;
  const staging = (level.shutters ?? []).filter((shutter) => shutter.skin === "staging")
    .sort((left, right) => left.count - right.count);
  const sourceHiddenIds = new Set(source.blocks.flatMap((block) => block.shutterId ? [block.id] : []));
  const stagedCandidates = staging.flatMap((shutter) => level.blocks
    .filter((block) => block.shutterId === shutter.id)
    .map((block) => ({ block, count: shutter.count })));
  const firstCount = stagedCandidates[0]?.count;
  const candidate = stagedCandidates.find(({ block, count }) => (
    count === firstCount && sourceHiddenIds.has(block.id)
  ))?.block ?? stagedCandidates[0]?.block;
  if (!candidate?.shutterId) return level;
  const rectangle = bounds(candidate);
  return {
    ...level,
    shutters: level.shutters?.map((shutter) => shutter.id === candidate.shutterId
      ? {
        ...shutter,
        ...rectangle,
        count: 1,
        skin: "shutter" as const,
      }
      : shutter),
  };
};

const withExactCohort = (
  level: LevelSpec,
  source: LevelSpec,
  skin: "lift" | "staged-frame",
): LevelSpec => {
  if (!(source.shutters ?? []).some((shutter) => shutter.skin === skin)) return level;
  const normalizedShutters = (level.shutters ?? []).map((shutter): ShutterSpec => shutter.skin === skin
    ? { ...shutter, x: 0, y: 0, width: 1, height: 1, skin: "staging", triggerBlockIds: undefined }
    : shutter);
  const stageIds = new Set(normalizedShutters
    .filter((shutter) => shutter.skin === "staging")
    .map((shutter) => shutter.id));
  const hiddenCandidates = level.blocks.filter((block) => block.shutterId && stageIds.has(block.shutterId));
  const triggerCandidates = level.blocks.filter((block) => !block.shutterId
    && !(level.generators ?? []).some((generator) => generator.queueBlockIds.includes(block.id)));
  const pair = hiddenCandidates.flatMap((hidden) => triggerCandidates.map((trigger) => {
    const hiddenBounds = bounds(hidden);
    const triggerBounds = bounds(trigger);
    const x = Math.min(hiddenBounds.x, triggerBounds.x);
    const y = Math.min(hiddenBounds.y, triggerBounds.y);
    const right = Math.max(hiddenBounds.x + hiddenBounds.width, triggerBounds.x + triggerBounds.width);
    const bottom = Math.max(hiddenBounds.y + hiddenBounds.height, triggerBounds.y + triggerBounds.height);
    return { hidden, trigger, x, y, width: right - x, height: bottom - y };
  })).sort((left, right) => left.width * left.height - right.width * right.height)[0];
  const hidden = pair?.hidden;
  const trigger = pair?.trigger;
  if (!hidden?.shutterId || !trigger) return level;
  const hiddenBounds = bounds(hidden);
  const id = `mechanism-parity-${skin}-${level.id}`;
  return {
    ...level,
    blocks: level.blocks.map((block) => block.id === hidden.id ? { ...block, shutterId: id } : block),
    shutters: [
      ...normalizedShutters,
      {
        id,
        x: skin === "lift" ? hiddenBounds.x : pair.x,
        y: skin === "lift" ? hiddenBounds.y : pair.y,
        width: skin === "lift" ? hiddenBounds.width : pair.width,
        height: skin === "lift" ? hiddenBounds.height : pair.height,
        count: 1,
        skin,
        triggerBlockIds: [trigger.id],
      },
    ],
  };
};

const cellsRequiredByRuntime = (level: LevelSpec): Set<string> => {
  const cells = new Set<string>();
  const add = (x: number, y: number): void => { cells.add(`${x},${y}`); };
  for (const block of level.blocks) {
    for (const [dx, dy] of block.shape) add(block.x + dx, block.y + dy);
  }
  for (const gate of [...level.gates, ...(level.flipDoors ?? [])]) {
    for (let step = 0; step < gate.size; step += 1) add(
      gate.side === "left" ? 0 : gate.side === "right" ? level.width - 1 : gate.offset + step,
      gate.side === "top" ? 0 : gate.side === "bottom" ? level.height - 1 : gate.offset + step,
    );
  }
  for (const shutter of level.shutters ?? []) {
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) add(x, y);
    }
  }
  for (const generator of level.generators ?? []) {
    for (const blockId of generator.queueBlockIds) {
      const block = level.blocks.find((candidate) => candidate.id === blockId);
      if (!block) continue;
      for (const [dx, dy] of block.shape) add(generator.spawn[0] + dx, generator.spawn[1] + dy);
    }
  }
  return cells;
};

const withIrregularBoard = (level: LevelSpec, source: LevelSpec): LevelSpec => {
  if (hasIrregularBoard(level) || !hasIrregularBoard(source)) return level;
  const required = cellsRequiredByRuntime(level);
  const hole = IRREGULAR_HOLE_EXCEPTIONS[level.id];
  if (hole) {
    const playable = Array.from({ length: level.width * level.height }, (_, index) => (
      [index % level.width, Math.floor(index / level.width)] as Point
    )).filter(([x, y]) => x !== hole[0] || y !== hole[1]);
    return { ...level, playable, blocked: undefined };
  }
  const cells = new Map<string, Point>();
  for (const [x, y] of source.playable ?? []) cells.set(`${x},${y}`, [x, y]);
  for (const key of required) {
    const [x, y] = key.split(",").map(Number);
    cells.set(key, [x, y]);
  }
  if (cells.size === level.width * level.height) {
    const removable = Array.from({ length: level.width * level.height }, (_, index) => (
      [index % level.width, Math.floor(index / level.width)] as Point
    )).find(([x, y]) => !required.has(`${x},${y}`));
    if (removable) cells.delete(`${removable[0]},${removable[1]}`);
  }
  return { ...level, playable: [...cells.values()], blocked: undefined };
};

const rectangularTemplate = (level: LevelSpec, templateId: 12 | 13): LevelSpec => {
  const template = VIDEO_PARITY_LEVELS[templateId - 1]!;
  const width = level.id === 20 ? level.width : template.width;
  const height = level.id === 20 ? level.height : template.height;
  const ordinaryShutter = (level.shutters ?? []).find(isOrdinaryShutter);
  const shutterCargoId = level.id === 20 ? template.blocks.at(-1)?.id : undefined;
  const playable = level.id === 20
    ? (() => {
      const cells = new Map((level.playable ?? []).map(([x, y]) => [`${x},${y}`, [x, y] as Point]));
      for (const gate of template.gates) for (let step = 0; step < gate.size; step += 1) {
        const x = gate.side === "left" ? 0 : gate.side === "right" ? width - 1 : gate.offset + step;
        const y = gate.side === "top" ? 0 : gate.side === "bottom" ? height - 1 : gate.offset + step;
        cells.set(`${x},${y}`, [x, y]);
      }
      return [...cells.values()];
    })()
    : undefined;
  return {
    ...level,
    width,
    height,
    designTargets: level.id === 19 && level.designTargets
      ? { ...level.designTargets, minimumRepositionOverhead: 10 }
      : level.designTargets,
    playable,
    blocked: undefined,
    gates: template.gates.map((gate) => {
      const cloned = cloneGate(gate);
      return level.id === 20 && gate.id === "vp-013-gate-03"
        ? { ...cloned, frozen: 2 }
        : cloned;
    }),
    blocks: template.blocks.map((block) => {
      const cloned = cloneBlock(block);
      const color = (level.id === 19 || level.id === 20)
        ? LV19_20_BLOCK_COLOR_REPAIR[block.id]
        : undefined;
      if (color) {
        cloned.color = color;
        if (cloned.layers?.length) cloned.layers = [color, ...cloned.layers.slice(1)];
      }
      if (block.id === "strategy-guard-15") Object.assign(cloned, { x: 0, y: 7 });
      if (block.id === "cc-piece-03") Object.assign(cloned, { x: 2, y: 6 });
      if (level.id !== 20) return cloned;
      const { frozen: _frozen, ...withoutIce } = cloned;
      return block.id === shutterCargoId && ordinaryShutter
        ? { ...withoutIce, shutterId: ordinaryShutter.id }
        : withoutIce;
    }),
    shutters: level.id === 20 && ordinaryShutter && shutterCargoId
      ? template.blocks.filter((block) => block.id === shutterCargoId).map((block) => {
        const rectangle = bounds(block);
        return { ...cloneShutter(ordinaryShutter), ...rectangle, count: 1, skin: "shutter" as const };
      })
      : undefined,
    generators: undefined,
    flipDoors: undefined,
    coloredGrids: undefined,
    elevators: undefined,
    conveyors: undefined,
    onboardingHint: undefined,
    strategyNudge: undefined,
    strategyFocus: undefined,
  };
};

export const applyMechanismParityRepair1To100 = (input: LevelSpec): LevelSpec => {
  // Lv20 is fully authored by level20Regeneration: running the old Lv13
  // rectangular template here would discard its exact 5×3 physical cover and
  // seven-block hidden cohort.
  if (input.id === 20) return input;
  if (!REPAIR_IDS.has(input.id)) return input;
  const source = sourceFor(input.id);
  let level: LevelSpec = {
    ...input,
    playable: clonePoints(input.playable),
    blocked: clonePoints(input.blocked),
    gates: input.gates.map(cloneGate),
    blocks: input.blocks.map(cloneBlock),
    shutters: input.shutters?.map(cloneShutter),
    generators: input.generators?.map(cloneGenerator),
    flipDoors: input.flipDoors?.map((door) => ({ ...door })),
    coloredGrids: input.coloredGrids?.map((grid) => ({ ...grid, cells: clonePoints(grid.cells)! })),
  };
  if (level.id === 30) {
    level.blocks = level.blocks.map((block) => block.id === "cc-030-b1-01"
      ? { ...block, x: 4, y: 0 }
      : block.id === "cc-030-b1-08"
        ? { ...block, x: 2, y: 0 }
        : block);
  }
  if (level.id === 19) level = rectangularTemplate(level, 13);

  const sourceHasFrozenExit = source.gates.some((gate) => (gate.frozen ?? 0) > 0)
    || (source.flipDoors ?? []).some((gate) => (gate.frozen ?? 0) > 0);
  const sourceHasNumericIce = source.blocks.some((block) => (block.frozen ?? 0) > 0);
  const sourceHasOrdinaryShutter = (source.shutters ?? []).some(isOrdinaryShutter);
  const sourceHasMoveGenerator = (source.generators ?? [])
    .some((generator) => (generator.trigger ?? "move") !== "time");
  const sourceHasAxis = source.blocks.some((block) => block.movementAxis);
  const sourceHasLift = (source.shutters ?? []).some((shutter) => shutter.skin === "lift");
  const sourceHasFrame = (source.shutters ?? []).some((shutter) => shutter.skin === "staged-frame");

  if (sourceHasFrozenExit) level = withFrozenExit(level, source);
  if (sourceHasNumericIce) level = withNumericIce(level, source);
  if (sourceHasMoveGenerator) level = withGenerator(level, source);
  if (sourceHasAxis) level = withAxisBlock(level, source);
  if (sourceHasOrdinaryShutter) level = withOrdinaryShutter(level, source);
  if (sourceHasLift) level = withExactCohort(level, source, "lift");
  if (sourceHasFrame) level = withExactCohort(level, source, "staged-frame");
  if (hasIrregularBoard(source)) level = withIrregularBoard(level, source);
  return removeUnusedStaging(level);
};
