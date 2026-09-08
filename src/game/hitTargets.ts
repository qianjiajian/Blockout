export interface HitTargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type HitTargetAnchor = "start" | "center" | "end";

export interface HitTargetOptions {
  anchorX?: HitTargetAnchor;
  anchorY?: HitTargetAnchor;
  minimumCssSize?: number;
  bounds?: HitTargetRect;
}

export const MINIMUM_INTERACTION_TARGET_CSS = 44;

const positionedAxis = (
  start: number,
  currentSize: number,
  targetSize: number,
  anchor: HitTargetAnchor,
  boundsStart: number,
  boundsSize: number,
): readonly [number, number] => {
  if (targetSize >= boundsSize) return [boundsStart, boundsSize];
  const anchoredStart = anchor === "start"
    ? start
    : anchor === "end"
      ? start + currentSize - targetSize
      : start - (targetSize - currentSize) / 2;
  const boundedStart = Math.min(
    boundsStart + boundsSize - targetSize,
    Math.max(boundsStart, anchoredStart),
  );
  return [boundedStart, targetSize];
};

/**
 * Expands a logical Canvas control so its physical CSS hit target remains
 * finger-sized after the whole 496×1078 scene is scaled to a short screen.
 */
export const expandInteractionTarget = (
  rect: HitTargetRect,
  logicalToCssScale: number,
  options: HitTargetOptions = {},
): HitTargetRect => {
  const scale = Number.isFinite(logicalToCssScale) && logicalToCssScale > 0
    ? logicalToCssScale
    : 1;
  const minimumCssSize = Number.isFinite(options.minimumCssSize) && (options.minimumCssSize ?? 0) > 0
    ? options.minimumCssSize!
    : MINIMUM_INTERACTION_TARGET_CSS;
  const minimumLogicalSize = minimumCssSize / scale;
  const bounds = options.bounds ?? { x: 0, y: 0, width: 496, height: 1078 };
  const targetWidth = Math.max(rect.width, minimumLogicalSize);
  const targetHeight = Math.max(rect.height, minimumLogicalSize);
  const [x, width] = positionedAxis(
    rect.x,
    rect.width,
    targetWidth,
    options.anchorX ?? "center",
    bounds.x,
    bounds.width,
  );
  const [y, height] = positionedAxis(
    rect.y,
    rect.height,
    targetHeight,
    options.anchorY ?? "center",
    bounds.y,
    bounds.height,
  );
  return { x, y, width, height };
};
