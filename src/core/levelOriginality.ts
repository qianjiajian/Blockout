import type { LevelSpec, Point, Side } from "./types";

type Transform = "identity" | "rotate-90" | "rotate-180" | "rotate-270" | "mirror-x" | "mirror-y" | "transpose" | "anti-transpose";

export interface OriginalityReport {
  levelCount: number;
  uniqueCanonicalLayouts: number;
  duplicateLayoutGroups: number[][];
  duplicateNameGroups: number[][];
  passed: boolean;
}

const TRANSFORMS: Transform[] = [
  "identity", "rotate-90", "rotate-180", "rotate-270",
  "mirror-x", "mirror-y", "transpose", "anti-transpose",
];

const dimensionsAfter = (width: number, height: number, transform: Transform): [number, number] => (
  transform === "rotate-90" || transform === "rotate-270" || transform === "transpose" || transform === "anti-transpose"
    ? [height, width]
    : [width, height]
);

const transformPoint = ([x, y]: Point, width: number, height: number, transform: Transform): Point => {
  if (transform === "rotate-90") return [height - 1 - y, x];
  if (transform === "rotate-180") return [width - 1 - x, height - 1 - y];
  if (transform === "rotate-270") return [y, width - 1 - x];
  if (transform === "mirror-x") return [width - 1 - x, y];
  if (transform === "mirror-y") return [x, height - 1 - y];
  if (transform === "transpose") return [y, x];
  if (transform === "anti-transpose") return [height - 1 - y, width - 1 - x];
  return [x, y];
};

const transformSide = (side: Side, transform: Transform): Side => {
  const map: Record<Transform, Record<Side, Side>> = {
    identity: { top: "top", right: "right", bottom: "bottom", left: "left" },
    "rotate-90": { top: "right", right: "bottom", bottom: "left", left: "top" },
    "rotate-180": { top: "bottom", right: "left", bottom: "top", left: "right" },
    "rotate-270": { top: "left", right: "top", bottom: "right", left: "bottom" },
    "mirror-x": { top: "top", right: "left", bottom: "bottom", left: "right" },
    "mirror-y": { top: "bottom", right: "right", bottom: "top", left: "left" },
    transpose: { top: "left", right: "bottom", bottom: "right", left: "top" },
    "anti-transpose": { top: "right", right: "top", bottom: "left", left: "bottom" },
  };
  return map[transform][side];
};

const gateCells = (level: LevelSpec, side: Side, offset: number, size: number): Point[] => {
  const points: Point[] = [];
  for (let index = offset; index < offset + size; index += 1) {
    if (side === "top") points.push([index, 0]);
    else if (side === "bottom") points.push([index, level.height - 1]);
    else if (side === "left") points.push([0, index]);
    else points.push([level.width - 1, index]);
  }
  return points;
};

const allPlayable = (level: LevelSpec): Point[] => {
  if (level.playable?.length) return level.playable;
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => `${x},${y}`));
  const result: Point[] = [];
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) if (!blocked.has(`${x},${y}`)) result.push([x, y]);
  }
  return result;
};

const pointsSignature = (points: Point[]): string => points
  .map(([x, y]) => `${x},${y}`)
  .sort()
  .join(";");

const signatureForTransform = (level: LevelSpec, transform: Transform): string => {
  const [width, height] = dimensionsAfter(level.width, level.height, transform);
  const playable = pointsSignature(allPlayable(level)
    .map((point) => transformPoint(point, level.width, level.height, transform)));
  const blocks = level.blocks.map((block) => {
    const cells = block.shape.map(([dx, dy]) => (
      transformPoint([block.x + dx, block.y + dy], level.width, level.height, transform)
    ));
    const mechanics = [block.layers?.length ?? 1, block.frozen ?? 0, block.shutterId ? 1 : 0, block.star ? 1 : 0].join(",");
    return `${pointsSignature(cells)}@${mechanics}`;
  }).sort().join("|");
  const gates = level.gates.map((gate) => {
    const side = transformSide(gate.side, transform);
    const cells = gateCells(level, gate.side, gate.offset, gate.size)
      .map((point) => transformPoint(point, level.width, level.height, transform));
    const offset = side === "top" || side === "bottom"
      ? Math.min(...cells.map(([x]) => x))
      : Math.min(...cells.map(([, y]) => y));
    return `${side}:${offset}:${gate.size}:${gate.frozen ?? 0}:${gate.star ? 1 : 0}`;
  }).sort().join("|");
  const covers = (level.shutters ?? []).map((cover) => {
    const cells: Point[] = [];
    for (let y = cover.y; y < cover.y + cover.height; y += 1) {
      for (let x = cover.x; x < cover.x + cover.width; x += 1) cells.push([x, y]);
    }
    return `${cover.skin ?? "shutter"}:${pointsSignature(cells.map((point) => transformPoint(point, level.width, level.height, transform)))}:${cover.count}`;
  }).sort().join("|");
  return `${width}x${height}#${playable}#${blocks}#${gates}#${covers}`;
};

/**
 * Ignores names, ids and colors, then canonicalizes all rotations/reflections.
 * A collision therefore catches recolors and simple mirror/rotation copies too.
 */
export const canonicalLevelLayoutSignature = (level: LevelSpec): string => TRANSFORMS
  .map((transform) => signatureForTransform(level, transform))
  .sort()[0];

const duplicateGroups = (entries: Array<{ id: number; key: string }>): number[][] => {
  const groups = new Map<string, number[]>();
  for (const entry of entries) groups.set(entry.key, [...(groups.get(entry.key) ?? []), entry.id]);
  return [...groups.values()].filter((ids) => ids.length > 1).sort((a, b) => a[0] - b[0]);
};

export const validateCampaignOriginality = (levels: LevelSpec[]): OriginalityReport => {
  const layoutEntries = levels.map((level) => ({ id: level.id, key: canonicalLevelLayoutSignature(level) }));
  const duplicateLayoutGroups = duplicateGroups(layoutEntries);
  const duplicateNameGroups = duplicateGroups(levels.map((level) => ({ id: level.id, key: level.name.trim() })));
  return {
    levelCount: levels.length,
    uniqueCanonicalLayouts: new Set(layoutEntries.map((entry) => entry.key)).size,
    duplicateLayoutGroups,
    duplicateNameGroups,
    passed: duplicateLayoutGroups.length === 0 && duplicateNameGroups.length === 0,
  };
};
