export interface ShutterBoardProjection {
  innerX: number;
  innerY: number;
  cell: number;
}

export interface ShutterVisualRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShutterCounterLayout extends ShutterVisualRect {
  centerX: number;
  centerY: number;
  labelSize: number;
}

/**
 * One authoritative board-to-canvas projection for the shutter surface and
 * all of its feedback effects.  Keeping this outside the renderer makes the
 * visible cover, countdown badge and unlock pulse share identical geometry.
 */
export const projectShutterVisualRect = (
  x: number,
  y: number,
  width: number,
  height: number,
  board: ShutterBoardProjection,
): ShutterVisualRect => {
  const inset = Math.max(2, board.cell * 0.035);
  return {
    x: board.innerX + x * board.cell + inset,
    y: board.innerY + y * board.cell + inset,
    width: Math.max(1, width * board.cell - inset * 2),
    height: Math.max(1, height * board.cell - inset * 2),
  };
};

/** Fit the countdown plaque inside even a one-cell cover at narrow widths. */
export const shutterCounterLayout = (rect: ShutterVisualRect): ShutterCounterLayout => {
  const width = Math.max(18, Math.min(56, rect.width - 6));
  const height = Math.max(18, Math.min(50, rect.height - 6));
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    centerX,
    centerY,
    labelSize: Math.max(14, Math.min(28, height * 0.56)),
  };
};
