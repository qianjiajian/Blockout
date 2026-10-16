import type { GatePortalSpec, Point } from "../core/types";
import type { FormalBlockShapeMatch } from "./formalBlockShapes";
import { gatePortalVisualRect, type GatePortalVisualBoard } from "./gatePortalVisualGeometry";
import type { PulseRect } from "./pulseAnimation";
import { formalBlockVisualBounds } from "./selectionFrameGeometry";

export interface PulseHighlightImage {
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

export type PulseHighlightBoard = GatePortalVisualBoard;

const AUTHORED_CELL = 95;

const imageSize = (image: PulseHighlightImage | undefined): { width: number; height: number } | undefined => {
  if (!image) return undefined;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height } : undefined;
};

/**
 * Project the frozen sprite, not its nominal cell box. Whole ice artwork is
 * bottom-aligned by drawFormalWholeBlockAt; the occupied-cell union preserves
 * concavities instead of turning an L/S/T piece into a rectangular spotlight.
 */
export const projectPulseBlockRects = (
  cells: readonly Point[],
  match: FormalBlockShapeMatch | undefined,
  board: Readonly<PulseHighlightBoard>,
  wholeIce?: PulseHighlightImage,
  cellIce?: PulseHighlightImage,
): PulseRect[] => {
  if (!cells.length) return [];
  const scale = board.cell / AUTHORED_CELL;
  const wholeSize = imageSize(wholeIce);
  if (match && wholeSize) {
    const bounds = formalBlockVisualBounds(match, wholeSize.width, wholeSize.height, AUTHORED_CELL);
    const minX = Math.min(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const width = bounds.width * scale / match.targetWidth;
    const height = bounds.height * scale / match.targetHeight;
    const originX = board.innerX + minX * board.cell + bounds.x * scale;
    const originY = board.innerY + minY * board.cell + bounds.y * scale;
    return cells.map(([x, y]) => ({
      x: originX + (x - minX) * width,
      y: originY + (y - minY) * height,
      width,
      height,
    }));
  }
  const cellSize = imageSize(cellIce);
  // The per-cell fallback has its own bottom alignment even when there is no
  // whole sprite for this shape; do not stretch one tile across the block.
  const offsetX = cellSize ? (AUTHORED_CELL - cellSize.width) * scale / 2 : 0;
  const offsetY = cellSize ? (AUTHORED_CELL - cellSize.height) * scale : 0;
  const width = cellSize ? cellSize.width * scale : board.cell;
  const height = cellSize ? cellSize.height * scale : board.cell;
  return cells.map(([x, y]) => ({
    x: board.innerX + x * board.cell + offsetX,
    y: board.innerY + y * board.cell + offsetY,
    width,
    height,
  }));
};

/** Matches drawGateIceStripSegment, including local portals and long strips. */
export const projectPulseGateRect = (
  portal: GatePortalSpec,
  board: Readonly<PulseHighlightBoard>,
  image?: PulseHighlightImage,
): PulseRect => {
  const rect = gatePortalVisualRect(portal, board);
  const size = imageSize(image);
  if (!size) return rect;
  const scale = board.cell / AUTHORED_CELL;
  const horizontal = portal.side === "top" || portal.side === "bottom";
  const anchorX = horizontal ? rect.x : portal.side === "left" ? rect.x + rect.width : rect.x;
  const anchorY = horizontal && portal.side === "top" ? rect.y + rect.height : rect.y;
  const nativeSpan = Math.min(3, portal.size);
  const nominalLength = portal.size * AUTHORED_CELL;
  const extended = portal.size > 3;
  // Long ports preserve both bitmap end caps and extend only the centre.
  const width = horizontal && extended
    ? nominalLength + size.width - nativeSpan * AUTHORED_CELL : size.width;
  const height = !horizontal && extended
    ? nominalLength + size.height - nativeSpan * AUTHORED_CELL : size.height;
  const x = horizontal
    ? ((extended ? nativeSpan : portal.size) * AUTHORED_CELL - size.width) / 2
    : portal.side === "left" ? -size.width : 0;
  const y = horizontal && portal.side === "top" ? -size.height : 0;
  return { x: anchorX + x * scale, y: anchorY + y * scale, width: width * scale, height: height * scale };
};
