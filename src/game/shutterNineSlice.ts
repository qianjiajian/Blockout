import type { RevisedRegionRect } from './revisedRegionAnimation';

const ROOT = 'assets/art/gameplay/mechanics/shutter-nine-slice-v1';
export const SHUTTER_NINE_SLICE_URLS = {
  panel: `${ROOT}/panel.png`,
  topLeft: `${ROOT}/top-left.png`, topRight: `${ROOT}/top-right.png`,
  bottomLeft: `${ROOT}/bottom-left.png`, bottomRight: `${ROOT}/bottom-right.png`,
  top: `${ROOT}/top.png`, bottom: `${ROOT}/bottom.png`,
  left: `${ROOT}/left.png`, right: `${ROOT}/right.png`,
} as const;
export const SHUTTER_NINE_SLICE_PATHS: readonly string[] = Object.values(SHUTTER_NINE_SLICE_URLS);
export type ShutterFramePart = Exclude<keyof typeof SHUTTER_NINE_SLICE_URLS, 'panel'>;
export type ShutterNineSliceImages = Partial<Record<keyof typeof SHUTTER_NINE_SLICE_URLS, HTMLImageElement>>;
export interface ShutterFramePiece extends RevisedRegionRect { part: ShutterFramePart }

/** The supplied cut faces have alpha 129/210 (corner cut faces only 44).
 * Stretching those endpoint pixels widens them into visible dark seams.
 * Skip two LONG-axis source pixels: one cut face + one bilinear guard.
 * Never crop the edge thickness, edit the original PNGs, or resize corners. */
export const SHUTTER_EDGE_SOURCE_RECTS = {
  top: { x: 2, y: 0, width: 129, height: 21 },
  bottom: { x: 2, y: 0, width: 129, height: 22 },
  left: { x: 0, y: 2, width: 20, height: 131 },
  right: { x: 0, y: 2, width: 21, height: 130 },
} as const;

/** A small underlap covers fractional destination-pixel filtering too. Clamp
 * to the straight arm so very small scales never paint beyond a round corner. */
export const shutterEdgeUnderlap = (scale: number): number => Math.min(2, 24 * scale);

/** One scale per board, NOT per curtain. Even a one-cell cover fits all four
 * complete corner PNGs. Layout resizing stretches only the four straight runs. */
export function shutterFrameScale(cell: number): number {
  if (!Number.isFinite(cell) || cell <= 0) return 0;
  return Math.max(0, cell - Math.max(2, cell * 0.035) * 2) / 180;
}

/** Registration measured against the user's 示意.png. Original corner sizes
 * differ: keep their proportions. 1–4 source px overlap seals cut-edge alpha.
 * Invalid/tiny boxes fail closed instead of silently resizing the corners. */
export function shutterFramePieces(rect: Readonly<RevisedRegionRect>, scale: number): ShutterFramePiece[] {
  const { x, y, width: w, height: h } = rect;
  if (![x, y, w, h, scale].every(Number.isFinite) || scale <= 0 || w < 166 * scale || h < 162 * scale) return [];
  const piece = (part: ShutterFramePart, dx: number, dy: number, width: number, height: number): ShutterFramePiece =>
    ({ part, x: x + dx, y: y + dy, width, height });
  return [
    piece('top', 84 * scale, 0, w - 162 * scale, 21 * scale),
    piece('bottom', 84 * scale, h - 22 * scale, w - 162 * scale, 22 * scale),
    piece('left', 0, 77 * scale, 20 * scale, h - 157 * scale),
    piece('right', w - 21 * scale, 76 * scale, 21 * scale, h - 158 * scale),
    piece('topLeft', 0, 0, 86 * scale, 78 * scale),
    piece('topRight', w - 80 * scale, 0, 80 * scale, 78 * scale),
    piece('bottomLeft', 0, h - 84 * scale, 86 * scale, 84 * scale),
    piece('bottomRight', w - 80 * scale, h - 84 * scale, 80 * scale, 84 * scale),
  ];
}

export function drawShutterFrame(ctx: CanvasRenderingContext2D, rect: Readonly<RevisedRegionRect>,
  images: ShutterNineSliceImages, scale: number): void {
  for (const piece of shutterFramePieces(rect, scale)) {
    const image = images[piece.part];
    if (!image) continue;
    if (piece.part === 'top' || piece.part === 'bottom' || piece.part === 'left' || piece.part === 'right') {
      const source = SHUTTER_EDGE_SOURCE_RECTS[piece.part];
      const horizontal = piece.part === 'top' || piece.part === 'bottom';
      const underlap = shutterEdgeUnderlap(scale);
      ctx.drawImage(image, source.x, source.y, source.width, source.height,
        piece.x - (horizontal ? underlap : 0), piece.y - (horizontal ? 0 : underlap),
        piece.width + (horizontal ? underlap * 2 : 0), piece.height + (horizontal ? 0 : underlap * 2));
    } else {
      ctx.drawImage(image, piece.x, piece.y, piece.width, piece.height);
    }
  }
}
