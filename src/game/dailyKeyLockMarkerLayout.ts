import { chooseBlockBadgeCell, type BlockCell } from "./blockBadge";

type MarkerBoard = { innerX: number; innerY: number; cell: number };

/** Daily layouts can be concave. Drawing and key flights share a real cell. */
export const dailyKeyLockMarkerAnchor = (
  cells: readonly BlockCell[], board: MarkerBoard,
): { x: number; y: number } => {
  const [x, y] = chooseBlockBadgeCell(cells);
  return {
    x: board.innerX + (x + 0.5) * board.cell,
    y: board.innerY + (y + 0.46) * board.cell,
  };
};

/** Bounds include the whole bitmap, including its transparent padding. */
export const dailyKeyLockMarkerLayout = (
  cells: readonly BlockCell[], board: MarkerBoard,
  kind: "key" | "lock", aspectRatio: number, hasAxis = false,
) => {
  const [cellX, cellY] = chooseBlockBadgeCell(cells);
  const anchor = dailyKeyLockMarkerAnchor(cells, board);
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const height = board.cell * Math.min(kind === "lock" ? 0.76 : hasAxis ? 0.48 : 0.66, 0.76 / ratio);
  const width = height * ratio;
  return {
    anchor,
    cell: [cellX, cellY] as const,
    clip: {
      x: board.innerX + (cellX + 0.06) * board.cell,
      y: board.innerY + (cellY + 0.06) * board.cell,
      width: board.cell * 0.88, height: board.cell * 0.88,
    },
    image: { x: anchor.x - width / 2, y: anchor.y - height / 2, width, height },
    count: {
      x: anchor.x, y: anchor.y + board.cell * 0.11,
      size: board.cell * 0.30, maxWidth: board.cell * 0.66,
      strokeWidth: board.cell * 0.045,
    },
  };
};
