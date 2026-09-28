import type { BlockSpec, LevelSpec, Point, ShutterSpec } from "./types";

export type ShutterCoverageIssueKind =
  | "missing-hidden-cohort"
  | "hidden-cell-outside-cover"
  | "hidden-cell-overlap"
  | "opening-cell-covered"
  | "cover-cell-outside-board";

export interface ShutterCoverageIssue {
  levelId: number;
  shutterId: string;
  kind: ShutterCoverageIssueKind;
  cell?: Point;
  blockId?: string;
  otherBlockId?: string;
}

/** Player-facing countdown covers; staging/lift/frame devices are non-spatial. */
export const isOrdinaryShutter = (
  shutter: Pick<ShutterSpec, "count" | "skin">,
): boolean => shutter.count > 0 && (shutter.skin === undefined || shutter.skin === "shutter");

const cellKey = (x: number, y: number): string => `${x},${y}`;

const blockCells = (block: Pick<BlockSpec, "x" | "y" | "shape">): Point[] => (
  block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const)
);

const playableKeys = (level: LevelSpec): Set<string> => {
  if (level.playable?.length) return new Set(level.playable.map(([x, y]) => cellKey(x, y)));
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => cellKey(x, y)));
  const result = new Set<string>();
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      if (!blocked.has(cellKey(x, y))) result.add(cellKey(x, y));
    }
  }
  return result;
};

/**
 * Verify the contract visible to the player: a shutter surface, its reserved
 * board cells, and the hidden batch revealed by it must describe one region.
 */
export const auditOrdinaryShutterCoverage = (level: LevelSpec): ShutterCoverageIssue[] => {
  const issues: ShutterCoverageIssue[] = [];
  const playable = playableKeys(level);
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const ordinary = (level.shutters ?? []).filter(isOrdinaryShutter);
  // Opening occupancy follows the runtime activation contract, not the
  // visual-cover subset. A block behind any positive-count shutter is still
  // inactive, including non-spatial staging/lift/frame cargo, and therefore
  // cannot overlap an ordinary cover at the opening.
  const closedIds = new Set((level.shutters ?? [])
    .filter(({ count }) => count > 0)
    .map(({ id }) => id));
  const openingBlocks = level.blocks.filter((block) => (
    !queued.has(block.id) && !(block.shutterId && closedIds.has(block.shutterId))
  ));

  for (const shutter of ordinary) {
    const cover = new Set<string>();
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) {
        const key = cellKey(x, y);
        cover.add(key);
        if (!playable.has(key)) {
          issues.push({
            levelId: level.id,
            shutterId: shutter.id,
            kind: "cover-cell-outside-board",
            cell: [x, y],
          });
        }
      }
    }

    const hidden = level.blocks.filter((block) => block.shutterId === shutter.id);
    if (!hidden.length) {
      issues.push({ levelId: level.id, shutterId: shutter.id, kind: "missing-hidden-cohort" });
    }

    const hiddenOccupants = new Map<string, string>();
    for (const block of hidden) {
      for (const [x, y] of blockCells(block)) {
        const key = cellKey(x, y);
        if (!cover.has(key)) {
          issues.push({
            levelId: level.id,
            shutterId: shutter.id,
            kind: "hidden-cell-outside-cover",
            cell: [x, y],
            blockId: block.id,
          });
        }
        const otherBlockId = hiddenOccupants.get(key);
        if (otherBlockId && otherBlockId !== block.id) {
          issues.push({
            levelId: level.id,
            shutterId: shutter.id,
            kind: "hidden-cell-overlap",
            cell: [x, y],
            blockId: block.id,
            otherBlockId,
          });
        } else hiddenOccupants.set(key, block.id);
      }
    }

    for (const block of openingBlocks) {
      for (const [x, y] of blockCells(block)) {
        if (!cover.has(cellKey(x, y))) continue;
        issues.push({
          levelId: level.id,
          shutterId: shutter.id,
          kind: "opening-cell-covered",
          cell: [x, y],
          blockId: block.id,
        });
      }
    }
  }
  return issues;
};

export const assertOrdinaryShutterCoverage = (level: LevelSpec): void => {
  // A cover may intentionally open empty manoeuvring space.  Missing cargo is
  // diagnostic information, not a display/reservation mismatch by itself.
  const issues = auditOrdinaryShutterCoverage(level)
    .filter(({ kind }) => kind !== "missing-hidden-cohort");
  if (!issues.length) return;
  const first = issues[0];
  const at = first.cell ? ` at ${first.cell[0]},${first.cell[1]}` : "";
  const block = first.blockId ? ` (${first.blockId})` : "";
  throw new Error(`Level ${level.id}: shutter ${first.shutterId} ${first.kind}${at}${block}`);
};
