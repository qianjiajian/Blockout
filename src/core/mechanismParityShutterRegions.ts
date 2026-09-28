import type { BlockSpec, LevelSpec, Point, ShutterSpec } from "./types";

export const MECHANISM_PARITY_SHUTTER_REGION_VERSION = "safe-panel-staging-v1" as const;

const key = (x: number, y: number): string => `${x},${y}`;
const cellsOf = (block: Pick<BlockSpec, "x" | "y" | "shape">): Point[] => (
  block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const)
);
const isOrdinary = (shutter: ShutterSpec): boolean => shutter.count > 0
  && (shutter.skin == null || shutter.skin === "shutter");

const playableCells = (level: LevelSpec): Point[] => {
  if (level.playable?.length) return level.playable.map(([x, y]) => [x, y]);
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => key(x, y)));
  return Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (__, x) => [x, y] as Point)
  )).flat().filter(([x, y]) => !blocked.has(key(x, y)));
};

const openingBlocks = (level: LevelSpec): BlockSpec[] => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  return level.blocks.filter((block) => !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId)));
};

const coverCells = (shutter: ShutterSpec): Point[] => Array.from(
  { length: shutter.width * shutter.height },
  (_, index) => [shutter.x + index % shutter.width, shutter.y + Math.floor(index / shutter.width)] as Point,
);

const needsRepair = (
  shutter: ShutterSpec,
  cargo: readonly BlockSpec[],
  playable: ReadonlySet<string>,
  opening: ReadonlySet<string>,
): boolean => {
  const cover = new Set(coverCells(shutter).map(([x, y]) => key(x, y)));
  if ([...cover].some((cell) => !playable.has(cell) || opening.has(cell))) return true;
  const occupied = new Set<string>();
  for (const block of cargo) for (const [x, y] of cellsOf(block)) {
    const cell = key(x, y);
    if (!cover.has(cell) || occupied.has(cell)) return true;
    occupied.add(cell);
  }
  return false;
};

/**
 * Keep every restored ordinary shutter as a real spatial countdown panel,
 * while separating its release cohort into a synchronized non-spatial stage.
 * This prevents a visual 1x1 panel from claiming an unrelated opening cell or
 * pretending that a large/multi-piece hidden batch occupies the same region.
 */
export const applyMechanismParityShutterRegionRepair = (level: LevelSpec): LevelSpec => {
  const shutters = level.shutters ?? [];
  const playable = playableCells(level);
  const playableSet = new Set(playable.map(([x, y]) => key(x, y)));
  const openingSet = new Set(openingBlocks(level).flatMap(cellsOf).map(([x, y]) => key(x, y)));
  const ordinary = shutters.filter(isOrdinary);
  const invalid = ordinary.filter((shutter) => needsRepair(
    shutter,
    level.blocks.filter((block) => block.shutterId === shutter.id),
    playableSet,
    openingSet,
  ));
  if (!invalid.length) return level;

  const invalidIds = new Set(invalid.map((shutter) => shutter.id));
  const occupiedByAnyBlock = new Set(level.blocks.flatMap(cellsOf).map(([x, y]) => key(x, y)));
  const reserved = new Set<string>();
  for (const shutter of ordinary) {
    if (invalidIds.has(shutter.id)) continue;
    for (const [x, y] of coverCells(shutter)) reserved.add(key(x, y));
  }
  for (const gate of [...level.gates, ...(level.flipDoors ?? [])]) {
    for (let step = 0; step < gate.size; step += 1) {
      reserved.add(key(
        gate.side === "left" ? 0 : gate.side === "right" ? level.width - 1 : gate.offset + step,
        gate.side === "top" ? 0 : gate.side === "bottom" ? level.height - 1 : gate.offset + step,
      ));
    }
  }
  for (const grid of level.coloredGrids ?? []) for (const [x, y] of grid.cells) reserved.add(key(x, y));
  for (const generator of level.generators ?? []) reserved.add(key(generator.spawn[0], generator.spawn[1]));

  const panelById = new Map<string, Point>();
  for (const shutter of invalid) {
    const cargo = level.blocks.filter((block) => block.shutterId === shutter.id);
    const candidates = [
      ...coverCells(shutter),
      ...cargo.flatMap(cellsOf),
      ...playable.filter(([x, y]) => !occupiedByAnyBlock.has(key(x, y))),
      ...playable,
    ];
    const panel = candidates.find(([x, y]) => {
      const cell = key(x, y);
      return playableSet.has(cell) && !openingSet.has(cell) && !reserved.has(cell);
    });
    if (!panel) continue;
    panelById.set(shutter.id, panel);
    reserved.add(key(panel[0], panel[1]));
  }
  if (!panelById.size) return level;

  const cargoStageByPanel = new Map<string, string>();
  const additions: ShutterSpec[] = [];
  for (const shutter of invalid) {
    const panel = panelById.get(shutter.id);
    if (!panel) continue;
    if (!level.blocks.some((block) => block.shutterId === shutter.id)) continue;
    const stageId = `${shutter.id}-cargo-stage`;
    cargoStageByPanel.set(shutter.id, stageId);
    additions.push({
      id: stageId,
      x: panel[0],
      y: panel[1],
      width: 1,
      height: 1,
      count: shutter.count,
      skin: "staging",
      ...(shutter.triggerBlockIds ? { triggerBlockIds: [...shutter.triggerBlockIds] } : {}),
    });
  }

  return {
    ...level,
    blocks: level.blocks.map((block) => {
      const stageId = block.shutterId && cargoStageByPanel.get(block.shutterId);
      return stageId ? { ...block, shutterId: stageId } : block;
    }),
    shutters: shutters.map<ShutterSpec>((shutter) => {
      const panel = panelById.get(shutter.id);
      return panel ? { ...shutter, x: panel[0], y: panel[1], width: 1, height: 1, skin: "shutter" } : shutter;
    }).concat(additions),
  };
};
