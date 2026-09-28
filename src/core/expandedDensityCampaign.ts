import { campaignRepositionFloor, campaignTargetD1 } from "./campaignDifficultyTargets";
import { EXPANDED_DENSITY_LEVEL_CANDIDATES } from "./expandedDensityLevels.generated";
import { normalizeRuntimeLevel } from "./runtimeLevelNormalization";
import type { BlockSpec, LevelSpec, Point, Side } from "./types";

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
  featureIntro: source.featureIntro ? { ...source.featureIntro } : undefined,
});

const blockCells = (block: BlockSpec, x = block.x, y = block.y): Point[] => (
  block.shape.map(([dx, dy]) => [x + dx, y + dy] as const)
);

const playableCellKeys = (level: LevelSpec): Set<string> => new Set(
  (level.playable ?? Array.from(
    { length: level.height },
    (_, y) => Array.from({ length: level.width }, (__, x) => [x, y] as const),
  ).flat()).map(([x, y]) => `${x},${y}`),
);

const assertOpenDestination = (
  level: LevelSpec,
  block: BlockSpec,
  toX: number,
  toY: number,
  label: string,
): void => {
  const playable = playableCellKeys(level);
  const destination = blockCells(block, toX, toY);
  if (!destination.every(([x, y]) => playable.has(`${x},${y}`))) {
    throw new Error(`${label} destination leaves the playable board`);
  }
  const occupied = new Set(level.blocks
    .filter((candidate) => candidate.id !== block.id && !candidate.shutterId)
    .flatMap((candidate) => blockCells(candidate).map(([x, y]) => `${x},${y}`)));
  if (destination.some(([x, y]) => occupied.has(`${x},${y}`))) {
    throw new Error(`${label} destination overlaps an opening block`);
  }
};

const intro = (
  kind: NonNullable<LevelSpec["featureIntro"]>["kind"],
  title: string,
  description: string,
): NonNullable<LevelSpec["featureIntro"]> => ({ kind, title, description });

const requireBlock = (level: LevelSpec, id: string, label: string): BlockSpec => {
  const block = level.blocks.find((candidate) => candidate.id === id && !candidate.shutterId);
  if (!block) throw new Error(`${label} requires visible block ${id}`);
  return block;
};

const keepInternalStagesHidden = (level: LevelSpec): void => {
  level.shutters = level.shutters?.map((shutter) => ({ ...shutter, skin: "staging" }));
};

const applySingleShell = (level: LevelSpec): void => {
  const blockIndex = level.blocks.findIndex((block) => !block.shutterId);
  if (blockIndex < 0) throw new Error("Expanded-density Lv15 needs one visible block for its shell");
  const block = level.blocks[blockIndex];
  level.blocks[blockIndex] = { ...block, layers: [block.color, block.color] };
};

const applyGeneratorIntro = (level: LevelSpec): void => {
  if (!level.shutters?.length) throw new Error("Expanded-density Lv35 needs a staged batch for its generator");
  level.shutters = level.shutters.map((shutter, index) => ({
    ...shutter,
    skin: index === 0 ? "generator" : "staging",
  }));
  level.featureIntro = intro(
    "generator",
    "方块生成器！",
    "每次有效清除都会让生成器减一；归零后释放下一批方块。",
  );
};

const applyElevatorIntro = (level: LevelSpec): void => {
  const carried = requireBlock(level, "cc-piece-s1-07", "Expanded-density Lv50 elevator");
  const toX = carried.x + 1;
  const toY = carried.y;
  assertOpenDestination(level, carried, toX, toY, "Expanded-density Lv50 elevator");
  const xs = carried.shape.map(([x]) => x);
  const ys = carried.shape.map(([, y]) => y);
  level.elevators = [{
    id: "ed-050-elevator",
    blockId: carried.id,
    fromX: carried.x,
    fromY: carried.y,
    toX,
    toY,
    width: Math.max(...xs) - Math.min(...xs) + 1,
    height: Math.max(...ys) - Math.min(...ys) + 1,
    periodSeconds: 1.65,
  }];
  level.featureIntro = intro(
    "elevator",
    "移动升降台！",
    "指定载荷与平台对齐时会随平台移动；拖离平台后即脱离。",
  );
};

const applyShutterConveyorIntro = (level: LevelSpec): void => {
  const carried = requireBlock(level, "cc-piece-s1-14", "Expanded-density Lv70 conveyor");
  if (carried.shape.length !== 1) {
    throw new Error("Expanded-density Lv70 conveyor payload must remain a single-cell block");
  }
  const toX = carried.x;
  const toY = carried.y + 1;
  assertOpenDestination(level, carried, toX, toY, "Expanded-density Lv70 conveyor");
  const shutterId = "ed-070-belt-shutter";
  const blockIndex = level.blocks.findIndex((block) => block.id === carried.id);
  level.blocks[blockIndex] = { ...carried, shutterId };
  level.shutters = [
    ...(level.shutters ?? []),
    {
      id: shutterId,
      x: carried.x,
      y: carried.y,
      width: 1,
      height: 1,
      count: 2,
      skin: "shutter",
    },
  ];
  level.conveyors = [{
    id: "ed-070-conveyor",
    blockId: carried.id,
    x: carried.x,
    y: carried.y,
    width: 1,
    height: 2,
    direction: "bottom" satisfies Side,
  }];
  level.featureIntro = intro(
    "conveyor",
    "传送带与卷帘！",
    "先让卷帘归零；带上的指定载荷会在有效清除后沿箭头移动。",
  );
};

const applyStar = (level: LevelSpec, introduce: boolean): void => {
  const blockIndex = level.blocks.findIndex((block) => (
    !block.shutterId
    && (block.layers?.length ?? 1) === 1
    && level.gates.some((gate) => gate.color === block.color)
  ));
  if (blockIndex < 0) throw new Error("Expanded-density Lv91 needs a star-compatible visible block");
  const block = level.blocks[blockIndex];
  const gateIndex = level.gates.findIndex((gate) => gate.color === block.color);
  if (gateIndex < 0) throw new Error("Expanded-density Lv91 needs a same-color star gate");
  level.blocks[blockIndex] = { ...block, star: true };
  level.gates[gateIndex] = { ...level.gates[gateIndex], star: true };
  if (introduce) {
    level.featureIntro = intro(
      "star",
      "星标方块！",
      "带星方块只能从同色星标出口离开；普通方块仍可使用星门。",
    );
  }
};

const adaptCandidate = (candidate: LevelSpec): LevelSpec => {
  const level = cloneLevel(candidate);
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: campaignTargetD1(level.id),
    minimumRepositionOverhead: campaignRepositionFloor(level.id),
  };
  keepInternalStagesHidden(level);
  if (level.id === 15) applySingleShell(level);
  if (level.id === 35) applyGeneratorIntro(level);
  if (level.id === 50) applyElevatorIntro(level);
  if (level.id === 70) applyShutterConveyorIntro(level);
  if (level.id === 91) applyStar(level, true);
  if (level.id === 100) applyStar(level, false);
  return normalizeRuntimeLevel(level);
};

/**
 * Strictly accepted expanded-density candidates for Lv11-Lv100. Lv1-Lv10
 * remain owned by chapterOnePilotLevels.ts and are intentionally absent here.
 */
export const EXPANDED_DENSITY_CAMPAIGN_LEVELS: LevelSpec[] = (
  EXPANDED_DENSITY_LEVEL_CANDIDATES.map(adaptCandidate)
);
