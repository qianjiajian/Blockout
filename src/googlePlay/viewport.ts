import type { Viewport } from "../platform/Host";

/** Keep the complete 720x1584 home artwork (slightly taller than the logical
 * frame) and its stroked navigation labels inside the usable screen. */
export function googlePlayViewportTransform(viewport: Viewport, logicalWidth: number, logicalHeight: number,
  sides = { left: 0, right: 0 }) {
  const width = Math.max(1, viewport.width - sides.left - sides.right);
  const height = Math.max(1, viewport.height - viewport.safeTop - viewport.safeBottom);
  const scale = Math.min(width / logicalWidth, height / (logicalHeight + 24));
  return { scale, offsetX: sides.left + (width - logicalWidth * scale) / 2,
    offsetY: viewport.safeTop + (height - logicalHeight * scale) / 2 };
}

export function googlePlaySafeSides() {
  const style = getComputedStyle(document.documentElement);
  const inset = (name: string) => Math.max(0, Number.parseFloat(style.getPropertyValue(name)) || 0);
  return { left: inset("--color-escape-safe-left"), right: inset("--color-escape-safe-right") };
}

/** These plain decorative bands have no buttons baked in. Extend only their
 * width; all interactive art keeps the same uniform transform and hitboxes. */
export function drawGooglePlayFullWidthBand(ctx: CanvasRenderingContext2D, image: HTMLImageElement,
  x: number, y: number, edge: "top" | "bottom") {
  const transform = ctx.getTransform();
  const left = Math.min(x, -transform.e / transform.a);
  const right = Math.max(x + image.width, (ctx.canvas.width - transform.e) / transform.a);
  const top = -transform.f / transform.d;
  const bottom = (ctx.canvas.height - transform.f) / transform.d;
  if (edge === "top" && top < y) {
    ctx.drawImage(image, 0, 0, image.width, 1, left, top, right - left, y - top + 1);
  } else if (edge === "bottom" && bottom > y + image.height) {
    ctx.drawImage(image, 0, image.height - 1, image.width, 1,
      left, y + image.height - 1, right - left, bottom - y - image.height + 1);
  }
  ctx.drawImage(image, left, y, right - left, image.height);
}
