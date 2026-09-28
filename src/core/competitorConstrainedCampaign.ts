import { isIceEligibleBlockShape } from "./blockShape";
import { campaignRepositionFloor, campaignTargetD1 } from "./campaignDifficultyTargets";
import { COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES } from "./competitorConstrainedLevels.generated";
import { normalizeRuntimeLevel } from "./runtimeLevelNormalization";
import type { BlockSpec, GateSpec, LevelSpec, Point } from "./types";
import { gateCoversExitFrontier } from "./blockExitFrontier";

const clonePoint = ([x, y]: Point): Point => [x, y];

const cloneLevel = (source: LevelSpec): LevelSpec => ({
  ...source,
  playable: source.playable?.map(clonePoint),
  blocked: source.blocked?.map(clonePoint),
  gates: source.gates.map((gate) => ({ ...gate })),
  blocks: source.blocks.map((block) => ({
    ...block,
    shape: block.shape.map(clonePoint),
    layers: block.layers ? [...block.layers] : undefined,
  })),
  shutters: source.shutters?.map((shutter) => ({ ...shutter })),
  elevators: source.elevators?.map((elevator) => ({ ...elevator })),
  conveyors: source.conveyors?.map((conveyor) => ({ ...conveyor })),
  designTargets: source.designTargets ? { ...source.designTargets } : undefined,
  onboardingHint: source.onboardingHint ? {
    blockId: source.onboardingHint.blockId,
    path: source.onboardingHint.path.map(clonePoint),
  } : undefined,
  strategyNudge: source.strategyNudge ? {
    blockId: source.strategyNudge.blockId,
    from: clonePoint(source.strategyNudge.from),
    path: source.strategyNudge.path.map(clonePoint),
    afterMoves: source.strategyNudge.afterMoves,
  } : undefined,
  strategyFocus: source.strategyFocus ? { ...source.strategyFocus } : undefined,
  featureIntro: source.featureIntro ? { ...source.featureIntro } : undefined,
});

const blockBounds = (block: BlockSpec): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} => {
  const xs = block.shape.map(([x]) => block.x + x);
  const ys = block.shape.map(([, y]) => block.y + y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const blockAlignedWithGate = (level: LevelSpec, block: BlockSpec, gate: GateSpec): boolean => {
  if ((block.layers?.[0] ?? block.color) !== gate.color) return false;
  const cells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as Point);
  return gateCoversExitFrontier(level, cells, gate);
};

const isDirectExitBlock = (level: LevelSpec, block: BlockSpec): boolean => (
  !block.shutterId
  && (block.frozen ?? 0) === 0
  && level.gates.some((gate) => (gate.frozen ?? 0) === 0 && blockAlignedWithGate(level, block, gate))
);

const requireValue = <T>(value: T | undefined, message: string): T => {
  if (value === undefined) throw new Error(message);
  return value;
};

const intro = (
  kind: NonNullable<LevelSpec["featureIntro"]>["kind"],
  title: string,
  description: string,
): NonNullable<LevelSpec["featureIntro"]> => ({ kind, title, description });

const applyStagedRevealSkin = (level: LevelSpec): void => {
  if (!level.shutters?.length) return;
  const skin = level.id === 17 || level.id === 28
    ? "staging"
    : level.id === 77 ? "shutter" : "generator";
  level.shutters = level.shutters.map((shutter) => ({ ...shutter, skin }));
};

const applyLevelOneOnboarding = (level: LevelSpec): void => {
  const block = requireValue(
    level.blocks.find((candidate) => isDirectExitBlock(level, candidate)),
    "Competitor-constrained Lv1 needs a directly clearable onboarding block",
  );
  // A zero-cell path means “drag this already aligned block through its gate”.
  level.onboardingHint = { blockId: block.id, path: [] };
};

const applyFrozenExitIntro = (level: LevelSpec): void => {
  if (level.gates.length < 2) throw new Error("Competitor-constrained Lv6 must retain an open exit beside its frozen exit");
  const gateIndex = level.gates.findIndex((gate) => (
    !level.blocks.some((block) => isDirectExitBlock(level, block) && blockAlignedWithGate(level, block, gate))
  ));
  const selectedIndex = gateIndex >= 0 ? gateIndex : level.gates.length - 1;
  level.gates[selectedIndex] = { ...level.gates[selectedIndex], frozen: 1 };
  level.featureIntro = intro(
    "ice-door",
    "冰封出口！",
    "每次有效清除都会让冰封出口数字减一；归零后出口开放。",
  );
};

const applyNumericIceIntro = (level: LevelSpec): void => {
  const blockIndex = level.blocks.findIndex((block) => (
    !block.shutterId && isIceEligibleBlockShape(block.shape) && !isDirectExitBlock(level, block)
  ));
  if (blockIndex < 0) throw new Error("Competitor-constrained Lv10 needs a non-opening solid bar or rectangle for numeric ice");
  level.blocks[blockIndex] = { ...level.blocks[blockIndex], frozen: 1 };
  level.featureIntro = intro(
    "ice-block",
    "数字冰块！",
    "每次有效清除都会让数字冰块减一；归零后才可拖动。",
  );
};

const applySingleShell = (level: LevelSpec): void => {
  const blockIndex = level.blocks.findIndex((block) => !block.shutterId);
  if (blockIndex < 0) throw new Error("Competitor-constrained Lv15 needs one visible block for its shell");
  const block = level.blocks[blockIndex];
  level.blocks[blockIndex] = { ...block, layers: [block.color, block.color] };
};

const applyGeneratorIntro = (level: LevelSpec): void => {
  if (!level.shutters?.some((shutter) => shutter.skin === "generator")) {
    throw new Error("Competitor-constrained Lv35 needs its staged generator");
  }
  level.featureIntro = intro(
    "generator",
    "方块生成器！",
    "每次有效清除都会让生成器减一；归零后释放下一批方块。",
  );
};

const applyElevatorIntro = (level: LevelSpec): void => {
  const carried = requireValue(
    level.blocks.find((block) => block.id === "cc-piece-10" && !block.shutterId),
    "Competitor-constrained Lv50 needs cc-piece-10 as its elevator payload",
  );
  const bounds = blockBounds(carried);
  const toX = carried.x + 1;
  const toY = carried.y;
  if (!rectangleIsPlayable(level, toX, toY, bounds.width, bounds.height)) {
    throw new Error("Competitor-constrained Lv50 elevator destination must stay on playable cells");
  }
  level.elevators = [{
    id: "cc-050-elevator",
    blockId: carried.id,
    fromX: carried.x,
    fromY: carried.y,
    toX,
    toY,
    width: bounds.width,
    height: bounds.height,
    periodSeconds: 1.65,
  }];
  level.featureIntro = intro(
    "elevator",
    "移动升降台！",
    "指定载荷与平台对齐时会随平台移动；拖离平台后即脱离。",
  );
};

const rectangleIsPlayable = (
  level: LevelSpec,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean => {
  const playable = new Set((level.playable ?? Array.from(
    { length: level.height },
    (_, row) => Array.from({ length: level.width }, (__, column) => [column, row] as const),
  ).flat()).map(([cellX, cellY]) => `${cellX},${cellY}`));
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      if (!playable.has(`${x + dx},${y + dy}`)) return false;
    }
  }
  return true;
};

const applyShutterConveyorIntro = (level: LevelSpec): void => {
  const block = requireValue(
    level.blocks.find((candidate) => candidate.id === "cc-piece-15" && !candidate.shutterId),
    "Competitor-constrained Lv70 needs cc-piece-15 as its shuttered conveyor payload",
  );
  const bounds = blockBounds(block);
  const destinationY = block.y + 1;
  if (bounds.width !== 1 || bounds.height !== 1) {
    throw new Error("Competitor-constrained Lv70 conveyor payload must remain a single-cell block");
  }
  if (!rectangleIsPlayable(level, block.x, block.y, 1, destinationY - block.y + 1)) {
    throw new Error("Competitor-constrained Lv70 conveyor lane must point to an in-board playable cell");
  }

  const shutterId = "cc-070-belt-shutter";
  const blockIndex = level.blocks.findIndex((candidate) => candidate.id === block.id);
  level.blocks[blockIndex] = { ...level.blocks[blockIndex], shutterId };
  level.shutters = [
    ...(level.shutters ?? []),
    {
      id: shutterId,
      x: bounds.minX,
      y: bounds.minY,
      width: bounds.width,
      height: bounds.height,
      count: 2,
      skin: "shutter",
    },
  ];
  level.conveyors = [{
    id: "cc-070-conveyor",
    blockId: block.id,
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.width,
    height: bounds.height + 1,
    direction: "bottom",
  }];
  level.featureIntro = intro(
    "conveyor",
    "传送带与卷帘！",
    "先让卷帘归零；带上的指定载荷会在有效清除后沿箭头移动。",
  );
};

const applyStarIntro = (level: LevelSpec): void => {
  const blockIndex = level.blocks.findIndex((block) => (
    !block.shutterId
    && (block.layers?.length ?? 1) === 1
    && level.gates.some((gate) => gate.color === block.color)
  ));
  if (blockIndex < 0) throw new Error("Competitor-constrained Lv91 needs a star-compatible block");
  const block = level.blocks[blockIndex];
  const gateIndex = level.gates.findIndex((gate) => gate.color === block.color);
  if (gateIndex < 0) throw new Error("Competitor-constrained Lv91 needs a same-color star gate");
  level.blocks[blockIndex] = { ...block, star: true };
  level.gates[gateIndex] = { ...level.gates[gateIndex], star: true };
  level.featureIntro = intro(
    "star",
    "星标方块！",
    "带星方块只能从同色星标出口离开；普通方块仍可使用星门。",
  );
};

const adaptCandidate = (candidate: LevelSpec): LevelSpec => {
  const level = cloneLevel(candidate);
  // The generated candidate corpus stays in its immutable source order. The
  // shipping pilot swaps source Lv2/Lv3 later, so map back to the source-slot
  // contract here and let chapterOnePilotLevels normalize runtime targets.
  const contractLevelId = level.id === 2 ? 3 : level.id === 3 ? 2 : level.id;
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: campaignTargetD1(contractLevelId),
    minimumRepositionOverhead: campaignRepositionFloor(contractLevelId),
  };
  applyStagedRevealSkin(level);

  if (level.id === 1) applyLevelOneOnboarding(level);
  if (level.id === 6) applyFrozenExitIntro(level);
  if (level.id === 10) applyNumericIceIntro(level);
  if (level.id === 15) applySingleShell(level);
  if (level.id === 35) applyGeneratorIntro(level);
  if (level.id === 50) applyElevatorIntro(level);
  if (level.id === 70) applyShutterConveyorIntro(level);
  if (level.id === 91) applyStarIntro(level);

  return normalizeRuntimeLevel(level);
};

/**
 * Formal campaign candidates with only the established project mechanic
 * milestones restored. The generated source remains immutable evidence; this
 * adapter owns all runtime-only flags and devices.
 */
export const COMPETITOR_CONSTRAINED_CAMPAIGN_LEVELS: LevelSpec[] = (
  COMPETITOR_CONSTRAINED_LEVEL_CANDIDATES.map(adaptCandidate)
);
