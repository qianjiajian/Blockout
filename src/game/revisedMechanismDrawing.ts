import type { RevisedRegionAnimationSample, RevisedRegionRect } from "./revisedRegionAnimation";
import { drawShutterFrame, type ShutterNineSliceImages } from "./shutterNineSlice";

export interface RevisedRegionImages {
  strip?: HTMLImageElement;
  frame?: HTMLImageElement;
  left?: HTMLImageElement;
  right?: HTMLImageElement;
  shutter?: ShutterNineSliceImages;
  shutterScale?: number;
}

const unit = (value: number): number => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const drawable = (rect: Readonly<RevisedRegionRect>): boolean =>
  [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
const clipRect = (ctx: CanvasRenderingContext2D, rect: Readonly<RevisedRegionRect>): void => {
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
};

function clipShutterCorners(ctx: CanvasRenderingContext2D, rect: Readonly<RevisedRegionRect>, scale: number): void {
  const { x, y, width: w, height: h } = rect;
  const r = Math.min(18 * scale, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath(); ctx.clip();
}

function shutterCounter(ctx: CanvasRenderingContext2D, rect: Readonly<RevisedRegionRect>, count: number, scale: number): void {
  if (scale <= 0) return;
  const size = Math.min(36, rect.width * 0.45, rect.height * 0.65);
  ctx.save();
  ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
  ctx.scale(scale, scale);
  // Independent badge observed in the clip; it does not travel with the slats.
  // Use the same basic path primitives as the other UI rounded rectangles:
  // some WeChat device contexts do not implement Canvas roundRect.
  const half = size / 2;
  const radius = size * 0.23;
  ctx.beginPath();
  ctx.moveTo(-half + radius, -half);
  ctx.lineTo(half - radius, -half);
  ctx.quadraticCurveTo(half, -half, half, -half + radius);
  ctx.lineTo(half, half - radius);
  ctx.quadraticCurveTo(half, half, half - radius, half);
  ctx.lineTo(-half + radius, half);
  ctx.quadraticCurveTo(-half, half, -half, half - radius);
  ctx.lineTo(-half, -half + radius);
  ctx.quadraticCurveTo(-half, -half, -half + radius, -half);
  ctx.closePath();
  ctx.fillStyle = "#79151c";
  ctx.fill();
  ctx.strokeStyle = "#f5bc4d";
  ctx.lineWidth = size * 0.075;
  ctx.stroke();
  ctx.font = `900 ${size * 0.62}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#341425";
  ctx.lineWidth = size * 0.08;
  const label = String(Math.max(0, Math.floor(Number.isFinite(count) ? count : 0)));
  ctx.strokeText(label, 0, size * 0.035, size * 0.82);
  ctx.fillStyle = "#fffaf0";
  ctx.fillText(label, 0, size * 0.035, size * 0.82);
  ctx.restore();
}

/** Frame PNG contains an opaque decorative centre: draw only its original four rims. */
function liftFrame(ctx: CanvasRenderingContext2D, rect: Readonly<RevisedRegionRect>, image: HTMLImageElement): void {
  const sw = image.width || 330;
  const sh = image.height || 317;
  const sx = sw * 18 / 330;
  const sy = sh * 17 / 317;
  const dx = rect.width * 18 / 330;
  const dy = rect.height * 17 / 317;
  ctx.drawImage(image, 0, 0, sw, sy, rect.x, rect.y, rect.width, dy);
  ctx.drawImage(image, 0, sh - sy, sw, sy, rect.x, rect.y + rect.height - dy, rect.width, dy);
  ctx.drawImage(image, 0, sy, sx, sh - 2 * sy, rect.x, rect.y + dy, dx, rect.height - 2 * dy);
  ctx.drawImage(image, sw - sx, sy, sx, sh - 2 * sy, rect.x + rect.width - dx, rect.y + dy, dx, rect.height - 2 * dy);
}

/**
 * Pure foreground cover. Draw the new cohort first; its open gap stays transparent.
 * The caller may draw a black lift well below that cohort. Undefined sample = closed.
 * Rects adapt the original pieces at rest; animation only translates intact pieces.
 * No model state, timers, input locks, frame shards or block transforms are changed here.
 */
export function drawRevisedRegion(
  ctx: CanvasRenderingContext2D,
  rect: Readonly<RevisedRegionRect>,
  kind: "shutter" | "lift",
  images: RevisedRegionImages,
  sample: RevisedRegionAnimationSample | undefined,
  count: number,
): void {
  if (!drawable(rect)) return;
  const progress = sample ? unit(sample.openProgress) : 0;
  ctx.save();
  if (kind === "shutter") {
    const frameScale = images.shutterScale ?? 0;
    const visibleHeight = rect.height * (1 - progress);
    if (visibleHeight > 0) {
      ctx.save();
      // Clip the translated bottom edge too: the final partial strip must not
      // become an extra full strip as the whole curtain moves upwards.
      clipRect(ctx, { ...rect, height: visibleHeight });
      if (images.shutter && frameScale > 0) clipShutterCorners(ctx, rect, frameScale);
      ctx.fillStyle = "#201459";
      ctx.fillRect(rect.x, rect.y, rect.width, visibleHeight);
      const strip = images.strip;
      if (images.shutter?.panel) {
        // Fit once at rest; opening only translates that intact panel upwards.
        ctx.drawImage(images.shutter.panel, rect.x, rect.y - rect.height * progress, rect.width, rect.height);
      } else if (strip) {
        const stripHeight = rect.width * (strip.height || 40) / (strip.width || 292);
        const offset = -rect.height * progress;
        const first = Math.max(0, Math.floor(-offset / stripHeight));
        const last = Math.ceil(rect.height / stripHeight);
        for (let row = first; row < last; row++) {
          ctx.drawImage(strip, rect.x, rect.y + offset + row * stripHeight, rect.width, stripHeight);
        }
      }
      ctx.restore();
    }
    const frameAlpha = sample ? unit(sample.frameAlpha) : 1;
    if (images.shutter && frameAlpha > 0) {
      ctx.save();
      ctx.globalAlpha *= frameAlpha;
      drawShutterFrame(ctx, rect, images.shutter, frameScale);
      ctx.restore();
    }
    shutterCounter(ctx, rect, count, sample ? unit(sample.counterScale) : 1);
  } else {
    const dx = rect.width * 18 / 330;
    const dy = rect.height * 17 / 317;
    const inside = { x: rect.x + dx, y: rect.y + dy, width: rect.width - 2 * dx, height: rect.height - 2 * dy };
    const half = inside.width / 2;
    if (progress < 1) {
      ctx.save();
      clipRect(ctx, inside);
      const leftX = inside.x - half * progress;
      const rightX = inside.x + half + half * progress;
      // Opaque only under the leaves, never across their expanding open gap.
      ctx.fillStyle = "#03050d";
      ctx.fillRect(leftX, inside.y, half, inside.height);
      ctx.fillRect(rightX, inside.y, half, inside.height);
      if (images.left) ctx.drawImage(images.left, leftX, inside.y, half, inside.height);
      if (images.right) ctx.drawImage(images.right, rightX, inside.y, half, inside.height);
      ctx.restore();
    }
    const alpha = sample ? unit(sample.frameAlpha) : 1;
    if (images.frame && alpha > 0) {
      ctx.globalAlpha *= alpha;
      liftFrame(ctx, rect, images.frame);
    }
  }
  ctx.restore();
}

/**
 * Split panels from the reference motion, in the gate aperture.
 * Draw the coloured gate bed/arrow before this. The original art is the moving
 * panel pair itself, not an additional stationary frame. With no image loaded,
 * the silver/blue procedural fallback preserves the same sliding geometry.
 * 0 = shut, 1 = open. Both complete leaves translate along the long axis, not rotate.
 */
export function drawRevisedFlipPanels(
  ctx: CanvasRenderingContext2D,
  rect: Readonly<RevisedRegionRect>,
  horizontal: boolean,
  openness: number,
  image?: HTMLImageElement,
): void {
  if (!drawable(rect)) return;
  const progress = unit(openness);
  if (progress >= 1) return;
  ctx.save();
  clipRect(ctx, rect);
  if (image) {
    const sw = image.width;
    const sh = image.height;
    if (horizontal) {
      const half = rect.width / 2;
      ctx.drawImage(image, 0, 0, sw / 2, sh, rect.x - half * progress, rect.y, half, rect.height);
      ctx.drawImage(image, sw / 2, 0, sw / 2, sh, rect.x + half + half * progress, rect.y, half, rect.height);
    } else {
      const half = rect.height / 2;
      ctx.drawImage(image, 0, 0, sw, sh / 2, rect.x, rect.y - half * progress, rect.width, half);
      ctx.drawImage(image, 0, sh / 2, sw, sh / 2, rect.x, rect.y + half + half * progress, rect.width, half);
    }
    ctx.restore();
    return;
  }
  ctx.translate(rect.x, rect.y);
  if (!horizontal) {
    ctx.translate(0, rect.height);
    ctx.rotate(-Math.PI / 2);
  }
  const length = horizontal ? rect.width : rect.height;
  const depth = horizontal ? rect.height : rect.width;
  const half = length / 2;
  const border = Math.min(depth * 0.13, half * 0.22);
  const metal = ctx.createLinearGradient(0, 0, 0, depth);
  metal.addColorStop(0, "#7b9ec5");
  metal.addColorStop(0.18, "#e0edfa");
  metal.addColorStop(0.5, "#7fa9cb");
  metal.addColorStop(1, "#355881");
  for (const x of [-half * progress, half + half * progress]) {
    ctx.save();
    ctx.translate(x, 0);
    // The reference's silver leaves have coloured inset windows: leave those
    // windows unpainted so the original gate colour is retained, not replaced.
    ctx.fillStyle = "#25456f";
    ctx.fillRect(0, 0, half, border * 1.5);
    ctx.fillRect(0, depth - border * 1.5, half, border * 1.5);
    ctx.fillRect(0, 0, border * 1.5, depth);
    ctx.fillRect(half - border * 1.5, 0, border * 1.5, depth);
    ctx.fillStyle = metal;
    ctx.fillRect(0, 0, half, border);
    ctx.fillRect(0, depth - border, half, border);
    ctx.fillRect(0, 0, border, depth);
    ctx.fillRect(half - border, 0, border, depth);
    ctx.restore();
  }
  ctx.restore();
}
