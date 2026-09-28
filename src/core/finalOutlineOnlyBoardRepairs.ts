import type { LevelSpec, Point } from "./types";

export const FINAL_OUTLINE_ONLY_BOARD_REPAIR_VERSION = "final-outline-only-board-r1" as const;
export const FINAL_OUTLINE_ONLY_BOARD_REPAIR_LEVEL_IDS = [85, 146, 178] as const;

/**
 * Cells enclosed by otherwise playable cells are internal obstacles rather
 * than part of an irregular outside outline. These additions fill the three
 * masks reintroduced by late competitor-layout overlays. Exterior-connected
 * indentations and source-proven disconnected rooms remain unchanged.
 *
 * Coordinates are packed as base-36 x/y pairs.
 */
const PACKED_ADDITIONS: Readonly<Record<number, string>> = {
  85: "233324342535",
  146: "2232233337473848",
  178: "32333435",
};

const rectangularCells = (width: number, height: number): Point[] => Array.from(
  { length: height },
  (_, y) => Array.from({ length: width }, (__, x) => [x, y] as Point),
).flat();

export const applyFinalOutlineOnlyBoardRepair = (source: LevelSpec): LevelSpec => {
  const packed = PACKED_ADDITIONS[source.id];
  if (packed === undefined) return source;

  const playable = [...(source.playable ?? rectangularCells(source.width, source.height))];
  const present = new Set(playable.map(([x, y]) => `${x},${y}`));
  let changed = (source.blocked?.length ?? 0) > 0;
  for (let index = 0; index < packed.length; index += 2) {
    const point = [
      Number.parseInt(packed[index]!, 36),
      Number.parseInt(packed[index + 1]!, 36),
    ] as Point;
    if (present.has(`${point[0]},${point[1]}`)) continue;
    playable.push(point);
    present.add(`${point[0]},${point[1]}`);
    changed = true;
  }
  if (!changed) return source;

  playable.sort((left, right) => left[1] - right[1] || left[0] - right[0]);
  const { blocked: _blocked, ...withoutBlocked } = source;
  return { ...withoutBlocked, playable };
};
