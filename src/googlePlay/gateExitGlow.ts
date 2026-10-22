interface GateExitGlowBounds {
  centerX: number;
  centerY: number;
  halfSpan: number;
  cell: number;
  horizontal: boolean;
  intensity: number;
}

interface GlowSurface {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  ownerWidth: number;
  ownerHeight: number;
}

// One reusable scratch surface per game canvas, never one entry per colour,
// animation strength, gate or frame. At most 2 MiB of RGBA backing pixels.
const MAX_SURFACE_PIXELS = 512 * 1024;
const MAX_SURFACE_EDGE = 1536;
const surfaces = new WeakMap<HTMLCanvasElement, GlowSurface>();

/** Render the unchanged animated light into its small physical bounds. Canvas
 * shadows otherwise make some Android rasterizers process the large game
 * surface for every stroke. The scratch image is composited at device-pixel
 * coordinates so the original fractional alignment and unscaled shadowBlur
 * are retained. This is scratch-buffer reuse, not animation-frame caching. */
export function drawGooglePlayGateExitGlow(
  context: CanvasRenderingContext2D,
  bounds: GateExitGlowBounds,
  draw: (context: CanvasRenderingContext2D) => void,
): void {
  const owner = context.canvas;
  const document = owner.ownerDocument;
  if (!document || typeof context.getTransform !== "function"
    || (context.filter && context.filter !== "none")) {
    draw(context);
    return;
  }
  const transform = context.getTransform();
  const { centerX, centerY, halfSpan, cell, horizontal, intensity } = bounds;
  // The curtain extends .08 cells outwards and at most .36 inwards; the
  // longest ray is .29 cells. A symmetric .4-cell envelope includes all sides.
  const extentX = horizontal ? halfSpan : cell * 0.4;
  const extentY = horizontal ? cell * 0.4 : halfSpan;
  const deviceCenterX = transform.a * centerX + transform.c * centerY + transform.e;
  const deviceCenterY = transform.b * centerX + transform.d * centerY + transform.f;
  const deviceExtentX = Math.abs(transform.a) * extentX + Math.abs(transform.c) * extentY;
  const deviceExtentY = Math.abs(transform.b) * extentX + Math.abs(transform.d) * extentY;
  const strokeRadius = Math.max(2, cell * 0.05) / 2;
  // shadowBlur/offset are device-space values, independent of the CTM. Two
  // blur radii plus AA padding retain the Gaussian tail beyond the geometry.
  const blurPadding = cell * (0.1 + intensity * 0.13) * 2 + 4;
  const padX = blurPadding + strokeRadius * (Math.abs(transform.a) + Math.abs(transform.c)) + Math.abs(context.shadowOffsetX);
  const padY = blurPadding + strokeRadius * (Math.abs(transform.b) + Math.abs(transform.d)) + Math.abs(context.shadowOffsetY);
  const left = Math.floor(deviceCenterX - deviceExtentX - padX);
  const top = Math.floor(deviceCenterY - deviceExtentY - padY);
  const width = Math.ceil(deviceCenterX + deviceExtentX + padX) - left;
  const height = Math.ceil(deviceCenterY + deviceExtentY + padY) - top;
  const allocatedWidth = Math.ceil(width / 32) * 32;
  const allocatedHeight = Math.ceil(height / 32) * 32;
  if (!Number.isFinite(left + top + allocatedWidth + allocatedHeight)
    || allocatedWidth <= 0 || allocatedHeight <= 0
    || allocatedWidth > MAX_SURFACE_EDGE || allocatedHeight > MAX_SURFACE_EDGE
    || allocatedWidth * allocatedHeight > MAX_SURFACE_PIXELS) {
    draw(context);
    return;
  }

  let surface = surfaces.get(owner);
  if (!surface) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = allocatedWidth;
      canvas.height = allocatedHeight;
      const scratch = canvas.getContext("2d");
      if (!scratch) { draw(context); return; }
      surface = { canvas, context: scratch, ownerWidth: owner.width, ownerHeight: owner.height };
      surfaces.set(owner, surface);
    } catch {
      draw(context);
      return;
    }
  }
  const resized = surface.ownerWidth !== owner.width || surface.ownerHeight !== owner.height;
  // Grow rather than reallocating each time the continuous strength changes.
  // A resize resets the retained size; a shape change cannot exceed the budget.
  const nextWidth = resized ? allocatedWidth : Math.max(surface.canvas.width, allocatedWidth);
  const nextHeight = resized ? allocatedHeight : Math.max(surface.canvas.height, allocatedHeight);
  const retainSize = nextWidth * nextHeight <= MAX_SURFACE_PIXELS;
  const targetWidth = retainSize ? nextWidth : allocatedWidth;
  const targetHeight = retainSize ? nextHeight : allocatedHeight;
  try {
    // Shrink first when changing orientation, avoiding a transient oversized
    // width-by-old-height allocation even though both final sizes fit.
    if (surface.canvas.width > targetWidth) surface.canvas.width = targetWidth;
    if (surface.canvas.height > targetHeight) surface.canvas.height = targetHeight;
    if (surface.canvas.width !== targetWidth) surface.canvas.width = targetWidth;
    if (surface.canvas.height !== targetHeight) surface.canvas.height = targetHeight;
  } catch {
    surfaces.delete(owner);
    draw(context);
    return;
  }
  surface.ownerWidth = owner.width;
  surface.ownerHeight = owner.height;
  const scratch = surface.context;
  if (typeof scratch.isContextLost === "function" && scratch.isContextLost()) {
    surfaces.delete(owner);
    draw(context);
    return;
  }
  scratch.setTransform(1, 0, 0, 1, 0, 0);
  scratch.clearRect(0, 0, surface.canvas.width, surface.canvas.height);
  scratch.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e - left, transform.f - top);
  scratch.globalAlpha = context.globalAlpha;
  scratch.shadowOffsetX = context.shadowOffsetX;
  scratch.shadowOffsetY = context.shadowOffsetY;
  scratch.lineJoin = context.lineJoin;
  scratch.miterLimit = context.miterLimit;
  scratch.setLineDash(context.getLineDash());
  scratch.lineDashOffset = context.lineDashOffset;
  draw(scratch);

  context.save();
  try {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1; // Original alpha already applied to every stroke.
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = 0;
    context.shadowColor = "rgba(0,0,0,0)";
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.drawImage(surface.canvas, 0, 0, width, height, left, top, width, height);
  } finally {
    context.restore();
  }
}
