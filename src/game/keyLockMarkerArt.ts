import type { BlockColor, LevelSpec } from "../core/types";

/**
 * A key group is a gameplay identity, so every key and lock in that group must
 * use the same marker colour even when the underlying blocks have different
 * colours. Assign the complete authored group catalog to these distinct pairs;
 * never infer identity from an ID suffix or recycle colours within a level.
 */
export const KEY_LOCK_GROUP_COLORS = [
  "purple",
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "pink",
  "cyan",
] as const satisfies readonly BlockColor[];

/** Keeps the visual mass of the supplied tall cutouts centered in a block. */
export const KEY_LOCK_MARKER_VERTICAL_OFFSET_CELLS = -0.12;
export const KEY_LOCK_COUNT_VERTICAL_OFFSET_PX = -9;
export const KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS = 0.08;

export const keyLockMarkerVerticalOffset = (cellSize: number): number => (
  cellSize * KEY_LOCK_MARKER_VERTICAL_OFFSET_CELLS
);

/**
 * Pass model.level, not a live snapshot: authored blocks also retain removed,
 * hidden and queued groups, so revealing/removing a block cannot recolour one.
 * Default string sorting is locale-independent and ignores block array order.
 * Do not cache by object identity: authoring tools can edit a level in place.
 */
export const keyLockMarkerColor = (
  groupId: string | undefined,
  level: Pick<LevelSpec, "blocks">,
): BlockColor => {
  const groups = [...new Set(level.blocks.flatMap((block) => (
    [block.keyId, block.lockedBy].filter((id): id is string => Boolean(id))
  )))].sort();
  if (groups.length > KEY_LOCK_GROUP_COLORS.length) {
    throw new Error(`Key/lock marker palette supports at most ${KEY_LOCK_GROUP_COLORS.length} groups; got ${groups.length}`);
  }
  const index = groupId ? groups.indexOf(groupId) : -1;
  if (index < 0) throw new Error(`Unknown authored key/lock group: ${String(groupId)}`);
  return KEY_LOCK_GROUP_COLORS[index];
};

export const markerAspectRatio = (
  image: Pick<HTMLImageElement, "naturalWidth" | "naturalHeight" | "width" | "height">,
): number => {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  return width > 0 && height > 0 ? width / height : 1;
};
