interface PhysicalViewportRect { x: number; y: number; width: number; height: number }

/** Paint the visible margins only. The next drawBackground() paints an opaque
 * logical rectangle over the middle, so drawing that part twice wastes fill.
 * Integer clip edges retain every partially covered edge pixel; the later
 * logical background still performs the original antialiased edge coverage. */
export function drawGooglePlayViewportGutters(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  logical: PhysicalViewportRect,
  drawBackdrop: () => void,
): void {
  const left = Math.min(width, Math.max(0, Math.ceil(logical.x)));
  const right = Math.min(width, Math.max(left, Math.floor(logical.x + logical.width)));
  const top = Math.min(height, Math.max(0, Math.ceil(logical.y)));
  const bottom = Math.min(height, Math.max(top, Math.floor(logical.y + logical.height)));
  if (left === 0 && right === width && top === 0 && bottom === height) return;
  context.save();
  context.beginPath();
  if (top > 0) context.rect(0, 0, width, top);
  if (bottom < height) context.rect(0, bottom, width, height - bottom);
  if (left > 0) context.rect(0, top, left, bottom - top);
  if (right < width) context.rect(right, top, width - right, bottom - top);
  context.clip();
  drawBackdrop();
  context.restore();
}
