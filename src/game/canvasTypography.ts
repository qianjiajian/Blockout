const MIN_CANVAS_FONT_WEIGHT = 100;
const MAX_CANVAS_FONT_WEIGHT = 900;
const CANVAS_FONT_WEIGHT_STEP = 100;
const DEFAULT_CANVAS_FONT_FAMILY = 'system-ui, "Microsoft YaHei", sans-serif';

/**
 * Keeps Canvas font shorthand compatible with runtimes that only accept the
 * traditional 100-900 weight steps, including the WeChat Mini Game canvas.
 */
export const normalizeCanvasFontWeight = (weight: number): number => Math.min(
  MAX_CANVAS_FONT_WEIGHT,
  Math.max(
    MIN_CANVAS_FONT_WEIGHT,
    Math.round(weight / CANVAS_FONT_WEIGHT_STEP) * CANVAS_FONT_WEIGHT_STEP,
  ),
);

/** Builds a Canvas font shorthand without changing the requested size/family. */
export const canvasFont = (
  weight: number,
  size: number,
  family = DEFAULT_CANVAS_FONT_FAMILY,
): string => (
  `${normalizeCanvasFontWeight(weight)} ${size}px ${family}`
);

/** Correct middle/centre alignment for glyph ink (including punctuation). */
export function centeredCanvasTextOrigin(metrics: Partial<TextMetrics>, x: number, y: number): { x: number; y: number } {
  const { actualBoundingBoxLeft: left, actualBoundingBoxRight: right,
    actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = metrics;
  return {
    x: x + (Number.isFinite(left) && Number.isFinite(right) ? (left! - right!) / 2 : 0),
    y: y + (Number.isFinite(ascent) && Number.isFinite(descent) ? (ascent! - descent!) / 2 : 0),
  };
}
