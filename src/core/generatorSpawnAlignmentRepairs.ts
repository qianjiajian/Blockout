import type { BlockSpec, LevelSpec, Point } from "./types";
import {
  resolveGeneratorMouthTemplate,
  validateGeneratorMouthSpawn,
} from "./generatorMouthSpawnGeometry";

export const GENERATOR_SPAWN_ALIGNMENT_VERSION = "rim-center-mouth-shape-template-v2" as const;

const key = (x: number, y: number): string => `${x},${y}`;

const fullRectangle = (width: number, height: number): Point[] => Array.from(
  { length: height },
  (_, y) => Array.from({ length: width }, (__, x) => [x, y] as Point),
).flat();

const activeCells = (level: LevelSpec): Set<string> => {
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => key(x, y)));
  return new Set((level.playable ?? fullRectangle(level.width, level.height))
    .map(([x, y]) => key(x, y)).filter((cell) => !blocked.has(cell)));
};

type Generator = NonNullable<LevelSpec["generators"]>[number];
type Anchor = NonNullable<Generator["rimAnchor"]>;

interface Placement {
  x: number;
  y: number;
  cells: Point[];
  score: number;
}

const placementScore = (cells: readonly Point[], anchor: Anchor): number => {
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const tangentCenter = anchor.quarterTurns % 2 === 0
    ? (Math.min(...xs) + Math.max(...xs)) / 2
    : (Math.min(...ys) + Math.max(...ys)) / 2;
  const desiredTangentCenter = anchor.quarterTurns % 2 === 0 ? anchor.x - 0.5 : anchor.y - 0.5;
  const inwardDepth = anchor.quarterTurns === 0
    ? Math.min(...ys) - anchor.y
    : anchor.quarterTurns === 1
      ? anchor.x - 1 - Math.max(...xs)
      : anchor.quarterTurns === 2
        ? anchor.y - 1 - Math.max(...ys)
        : Math.min(...xs) - anchor.x;
  return Math.abs(inwardDepth) * 10_000
    + Math.abs(tangentCenter - desiredTangentCenter) * 100;
};

const alignedPlacement = (
  level: LevelSpec,
  block: BlockSpec,
  generator: Generator,
  active: ReadonlySet<string>,
): Placement => {
  const template = resolveGeneratorMouthTemplate(generator, level);
  if (template.status !== "ok") throw new Error(`Lv${level.id} ${generator.id}: ${template.reason}`);
  const center = key(...template.mouthCells[1]!);
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const minDx = Math.min(...xs), maxDx = Math.max(...xs);
  const minDy = Math.min(...ys), maxDy = Math.max(...ys);
  let best: Placement | undefined;
  for (let y = -minDy; y < level.height - maxDy; y += 1) {
    for (let x = -minDx; x < level.width - maxDx; x += 1) {
      const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy] as Point);
      if (cells.some(([cellX, cellY]) => !active.has(key(cellX, cellY)))) continue;
      if (!cells.some(([cellX, cellY]) => key(cellX, cellY) === center)) continue;
      const score = placementScore(cells, template.rimAnchor);
      if (!best || score < best.score
        || (score === best.score && (y < best.y || (y === best.y && x < best.x)))) {
        best = { x, y, cells, score };
      }
    }
  }
  if (!best) throw new Error(`Lv${level.id} ${block.id}: no playable placement occupies the generator mouth centre`);
  return best;
};

export const applyGeneratorSpawnAlignmentRepair = (source: LevelSpec): LevelSpec => {
  if (!(source.generators?.length)) return source;
  const active = activeCells(source);
  const blockById = new Map(source.blocks.map((block) => [block.id, block]));
  const shapes = new Map<string, Point[]>();
  const generators = source.generators.map((generator) => {
    if (!generator.rimAnchor) throw new Error(`Lv${source.id} ${generator.id}: rimAnchor is required before spawn alignment`);
    const template = resolveGeneratorMouthTemplate(generator, source);
    if (template.status !== "ok") throw new Error(`Lv${source.id} ${generator.id}: ${template.reason}`);
    const spawn = template.templateOrigin;
    for (const blockId of generator.queueBlockIds) {
      const block = blockById.get(blockId);
      if (!block) throw new Error(`Lv${source.id} ${generator.id}: missing queued block ${blockId}`);
      const placement = alignedPlacement(source, block, generator, active);
      shapes.set(blockId, block.shape.map(([dx, dy]) => [
        placement.x + dx - spawn[0],
        placement.y + dy - spawn[1],
      ] as Point));
    }
    return generator.spawn[0] === spawn[0] && generator.spawn[1] === spawn[1]
      ? generator
      : { ...generator, spawn };
  });
  const blocks = source.blocks.map((block) => {
    const shape = shapes.get(block.id);
    return shape ? { ...block, shape } : block;
  });
  return { ...source, generators, blocks };
};

export const generatorSpawnAlignmentIssues = (level: LevelSpec): string[] => {
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  const issues: string[] = [];
  for (const generator of level.generators ?? []) {
    if (!generator.rimAnchor) {
      issues.push(`Lv${level.id} ${generator.id}: missing rimAnchor`);
      continue;
    }
    const template = resolveGeneratorMouthTemplate(generator, level);
    if (template.status !== "ok") {
      issues.push(`Lv${level.id} ${generator.id}: ${template.reason}`);
      continue;
    }
    const expectedSpawn = template.templateOrigin;
    if (generator.spawn[0] !== expectedSpawn[0] || generator.spawn[1] !== expectedSpawn[1]) {
      issues.push(`Lv${level.id} ${generator.id}: spawn is not the inward 3x3 template origin`);
    }
    for (const blockId of generator.queueBlockIds) {
      const block = blockById.get(blockId);
      if (!block) {
        issues.push(`Lv${level.id} ${generator.id}: missing queued block ${blockId}`);
        continue;
      }
      const validation = validateGeneratorMouthSpawn(generator, generator.spawn, block.shape, level);
      if (validation.status === "ok") continue;
      issues.push(`Lv${level.id} ${generator.id}/${blockId}: ${validation.reason}`);
    }
  }
  return issues;
};
