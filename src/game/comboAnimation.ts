import { COMBO_PRAISE_LETTERING, traceComboPraiseLettering } from "./comboPraiseLettering";

/** A transient response to successful exits; no clock, score, inventory or save rules live here. */
export const COMBO_PRAISE_DURATION = 26 / 30;
export const COMBO_PRAISE_REDUCED_DURATION = 0.5;

export type ComboTier = "good" | "great" | "excellent";
export interface ComboPoint { x: number; y: number }
export interface ComboBounds extends ComboPoint { width: number; height: number }
export interface ComboPraiseSample extends ComboPoint {
  count: number;
  tier: ComboTier;
  text: string;
  age: number;
  scale: number;
  opacity: number;
  reducedMotion: boolean;
}
interface Praise extends ComboPoint { count: number; tier: ComboTier; age: number }

const STYLE = {
  good: { text: "Good!", top: "#7bda42", bottom: "#47bd25", shadow: "#408b3866", sparkle: "#80e853" },
  great: { text: "Great!", top: "#55cef1", bottom: "#25a9da", shadow: "#358ca366", sparkle: "#62d8f5" },
  excellent: { text: "Excellent!", top: "#d78cee", bottom: "#b45de0", shadow: "#9250b366", sparkle: "#d993f3" },
} as const;
const MAX_VISIBLE = 4;
const MAX_SCALE = 1.16;
const OUTLINE = 4;
const SHADOW_PADDING = 9;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const validPoint = (point: ComboPoint): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);

// Decoded 30 fps reference: peak three frames after removal, settle over four,
// hold, then shrink in three frames without dimming the lettering.
const SCALE_FRAMES = [[0, 0], [1, 0.8], [2, 1.08], [3, MAX_SCALE],
  [4, 1.10], [5, 1.04], [6, 1.01], [7, 1], [22.5, 1], [24, 0.5], [25, 0]] as const;
function referenceScale(age: number): number {
  const frame = age * 30;
  for (let index = 1; index < SCALE_FRAMES.length; index += 1) {
    const [end, to] = SCALE_FRAMES[index], [start, from] = SCALE_FRAMES[index - 1];
    if (frame <= end) return from + (to - from) * clamp01((frame - start) / (end - start));
  }
  return 0;
}

export class ComboAnimation {
  private consecutive = 0;
  private praises: Praise[] = [];

  get count(): number { return this.consecutive; }
  get isVisible(): boolean { return this.praises.length > 0; }

  clear(): void { this.consecutive = 0; this.praises = []; }
  /** A committed non-clearing drag ends the chain, but lets existing praise finish. */
  breakChain(): void { this.consecutive = 0; }

  recordExit(point: ComboPoint): void {
    this.consecutive = Math.min(Number.MAX_SAFE_INTEGER, this.consecutive + 1);
    if (this.consecutive < 3 || !validPoint(point)) return;
    const tier: ComboTier = this.consecutive === 3 ? "good" : this.consecutive === 4 ? "great" : "excellent";
    this.praises.push({ count: this.consecutive, tier, age: 0, x: point.x, y: point.y });
    if (this.praises.length > MAX_VISIBLE) this.praises.splice(0, this.praises.length - MAX_VISIBLE);
  }

  update(delta: number, active: boolean, reduced: boolean): void {
    if (!active || !Number.isFinite(delta) || delta <= 0) return;
    const duration = reduced ? COMBO_PRAISE_REDUCED_DURATION : COMBO_PRAISE_DURATION;
    for (const praise of this.praises) praise.age += delta;
    this.praises = this.praises.filter((praise) => praise.age < duration);
  }

  samples(reduced: boolean): ComboPraiseSample[] {
    const duration = reduced ? COMBO_PRAISE_REDUCED_DURATION : COMBO_PRAISE_DURATION;
    return this.praises.filter((praise) => praise.age < duration).map((praise) => {
      const age = praise.age;
      const fade = 1 - smooth((age - 0.3) / 0.2);
      const scale = reduced ? 1 : referenceScale(age);
      return { ...praise, text: STYLE[praise.tier].text, scale,
        opacity: reduced ? fade : smooth(age / 0.1), reducedMotion: reduced };
    });
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  const inner = radius * 0.23;
  ctx.moveTo(x, y - radius);
  ctx.quadraticCurveTo(x + inner, y - inner, x + radius, y);
  ctx.quadraticCurveTo(x + inner, y + inner, x, y + radius);
  ctx.quadraticCurveTo(x - inner, y + inner, x - radius, y);
  ctx.quadraticCurveTo(x - inner, y - inner, x, y - radius);
  ctx.closePath();
  ctx.fill();
}

function drawSparkles(ctx: CanvasRenderingContext2D, sample: ComboPraiseSample, halfWidth: number): void {
  const bursts = sample.tier === "excellent" ? [
    { start: 0.11, duration: 0.25, x: -20, y: 27, dx: -6, dy: 10, radius: 11 },
    { start: 0.15, duration: 0.24, x: halfWidth + 1, y: 16, dx: 10, dy: 1, radius: 8 },
    { start: 0.18, duration: 0.22, x: -51, y: -17, dx: -5, dy: -6, radius: 7 },
    { start: 0.13, duration: 0.25, x: 36, y: -29, dx: 7, dy: -4, radius: 7 },
  ] : [
    { start: 0.11, duration: 0.25, x: -halfWidth * 0.55, y: 27, dx: -10, dy: 8,
      radius: 9 },
    { start: 0.15, duration: 0.24, x: halfWidth + 10, y: -1, dx: 10, dy: 1, radius: 8 },
    { start: 0.18, duration: 0.22, x: -halfWidth * 0.77, y: -27, dx: -5, dy: -6, radius: 7 },
  ];
  for (const burst of bursts) {
    const t = (sample.age - burst.start) / burst.duration;
    if (t <= 0 || t >= 1) continue;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, t / 0.2) * (1 - smooth((t - 0.4) / 0.6));
    star(ctx, burst.x + burst.dx * t, burst.y + burst.dy * t,
      burst.radius * Math.sin(Math.PI * t) ** 0.6);
    ctx.restore();
  }
}

/** Bounds use the same logical coordinates as the exit point. This creates no input surface. */
export function drawComboPraise(ctx: CanvasRenderingContext2D, sample: ComboPraiseSample, bounds: ComboBounds): void {
  if (!validPoint(sample) || !validPoint(bounds) || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)
    || bounds.width <= 0 || bounds.height <= 0 || !Number.isFinite(bounds.x + bounds.width)
    || !Number.isFinite(bounds.y + bounds.height) || !Number.isFinite(sample.scale) || sample.scale <= 0
    || !Number.isFinite(sample.opacity) || sample.opacity <= 0) return;
  const style = STYLE[sample.tier];
  const lettering = COMBO_PRAISE_LETTERING[sample.tier];
  ctx.save();
  const halfWidth = lettering.width / 2, halfHeight = lettering.height / 2;
  // Fixed vector glyph bounds are identical on Web and WeChat. Reserve the
  // largest word and every sparkle's whole path before any animation starts.
  const peak = sample.reducedMotion ? 1 : MAX_SCALE;
  const extentX = Math.max((halfWidth + OUTLINE / 2) * peak + SHADOW_PADDING,
    sample.reducedMotion ? 0 : halfWidth + 28);
  const extentY = Math.max((halfHeight + OUTLINE / 2) * peak + SHADOW_PADDING,
    sample.reducedMotion ? 0 : 46);
  const fit = Math.min(1, bounds.width / (extentX * 2), bounds.height / (extentY * 2));
  const marginX = extentX * fit, marginY = extentY * fit;
  const x = Math.max(bounds.x + marginX, Math.min(bounds.x + bounds.width - marginX, sample.x));
  const y = Math.max(bounds.y + marginY, Math.min(bounds.y + bounds.height - marginY, sample.y));
  ctx.beginPath();
  ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(fit, fit);
  ctx.save();
  const scale = sample.reducedMotion ? 1 : Math.min(MAX_SCALE, sample.scale);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= clamp01(sample.opacity);
  ctx.lineJoin = "round";
  ctx.lineWidth = OUTLINE;
  ctx.strokeStyle = "#ffffff";
  ctx.shadowColor = style.shadow;
  ctx.shadowBlur = 5 * scale * fit;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2 * scale * fit;
  traceComboPraiseLettering(ctx, sample.tier);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const gradient = ctx.createLinearGradient(0, -halfHeight, 0, halfHeight);
  gradient.addColorStop(0, style.top);
  gradient.addColorStop(1, style.bottom);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
  if (!sample.reducedMotion) {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = style.sparkle;
    drawSparkles(ctx, sample, halfWidth);
  }
  ctx.restore();
}
