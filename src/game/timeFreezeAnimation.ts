import { TIME_FREEZE_SECONDS } from "../core/supply";

/** The effect observes the real model clock. It never grants or consumes freeze time. */
export type TimeFreezeAnimationPhase = "idle" | "launch" | "hover" | "fly" | "burst" | "frozen" | "ending";

export interface TimeFreezeAnimationSample {
  phase: TimeFreezeAnimationPhase;
  age: number;
  endProgress: number;
  visible: boolean;
  remaining: number;
  reducedMotion: boolean;
  opacity: number;
  freezeProgress: number;
}

export interface TimeFreezeAnimationRect { x: number; y: number; width: number; height: number }
export interface TimeFreezeAnimationGeometry {
  viewport: TimeFreezeAnimationRect;
  source: TimeFreezeAnimationRect;
  timer: TimeFreezeAnimationRect;
}
export interface TimeFreezeAnimationArt { clock?: HTMLImageElement; ice?: HTMLImageElement }

const LAUNCH_END = 0.55;
const HOVER_END = 1.18;
const ARRIVAL = 1.65;
const BURST_END = 2.35;
const END_DURATION = 0.32;
const TAU = Math.PI * 2;
const unit = (n: number) => Math.min(1, Math.max(0, n));
const finitePositive = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { const p = unit(t); return p * p * (3 - 2 * p); };
const center = (r: TimeFreezeAnimationRect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

export class TimeFreezeAnimation {
  private visible = false;
  private age = 0;
  private endAge: number | undefined;

  get isVisible(): boolean { return this.visible; }

  trigger(): void {
    this.visible = true;
    this.age = 0;
    this.endAge = undefined;
  }

  reset(): void {
    this.visible = false;
    this.age = 0;
    this.endAge = undefined;
  }

  update(remaining: number, active: boolean, delta: number, terminal = false): void {
    if (terminal) { this.reset(); return; }
    if (!this.visible) return;
    // Keep the exact visual pose behind pause/background/transaction overlays.
    if (!active) return;
    if (finitePositive(remaining) === 0 && this.endAge === undefined) this.endAge = 0;
    const dt = finitePositive(delta);
    // The real effect lasts ten seconds. A generous display-only ceiling also
    // prevents hostile/nonphysical deltas from overflowing trigonometric input.
    this.age = Math.min(60, this.age + dt);
    if (this.endAge !== undefined) {
      this.endAge += dt;
      if (this.endAge >= END_DURATION) this.reset();
    }
  }

  sample(remaining: number, reducedMotion: boolean): TimeFreezeAnimationSample {
    const seconds = finitePositive(remaining);
    const endProgress = this.endAge === undefined ? 0 : unit(this.endAge / END_DURATION);
    const phase: TimeFreezeAnimationPhase = !this.visible ? "idle"
      : this.endAge !== undefined ? "ending"
        : reducedMotion ? "frozen"
          : this.age < LAUNCH_END ? "launch"
            : this.age < HOVER_END ? "hover"
              : this.age < ARRIVAL ? "fly"
                : this.age < BURST_END ? "burst" : "frozen";
    return {
      phase, age: this.age, endProgress, visible: this.visible,
      remaining: seconds, reducedMotion,
      opacity: this.visible ? 1 - smooth(endProgress) : 0,
      freezeProgress: unit(seconds / TIME_FREEZE_SECONDS),
    };
  }
}

const roundedPath = (ctx: CanvasRenderingContext2D, r: TimeFreezeAnimationRect, radius: number): void => {
  const b = Math.max(0, Math.min(radius, r.width / 2, r.height / 2));
  ctx.beginPath();
  ctx.moveTo(r.x + b, r.y);
  ctx.lineTo(r.x + r.width - b, r.y);
  ctx.quadraticCurveTo(r.x + r.width, r.y, r.x + r.width, r.y + b);
  ctx.lineTo(r.x + r.width, r.y + r.height - b);
  ctx.quadraticCurveTo(r.x + r.width, r.y + r.height, r.x + r.width - b, r.y + r.height);
  ctx.lineTo(r.x + b, r.y + r.height);
  ctx.quadraticCurveTo(r.x, r.y + r.height, r.x, r.y + r.height - b);
  ctx.lineTo(r.x, r.y + b);
  ctx.quadraticCurveTo(r.x, r.y, r.x + b, r.y);
  ctx.closePath();
};

const glow = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number): void => {
  if (radius <= 0 || alpha <= 0) return;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(240,255,255,${unit(alpha)})`);
  gradient.addColorStop(0.24, `rgba(142,241,255,${unit(alpha * 0.7)})`);
  gradient.addColorStop(1, "rgba(77,201,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
};

/** Only the eight outer pieces are drawn: the supplied transparent centre is never stretched. */
const iceBorder = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  rect: TimeFreezeAnimationRect,
  border: number,
): void => {
  if (!image || rect.width <= 0 || rect.height <= 0) return;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!(width > 0 && height > 0)) return;
  const sourceBorder = Math.min(150, width * 0.3, height * 0.3);
  const b = Math.max(0.1, Math.min(border, rect.width / 2, rect.height / 2));
  const sx = [0, sourceBorder, width - sourceBorder];
  const sy = [0, sourceBorder, height - sourceBorder];
  const sw = [sourceBorder, width - sourceBorder * 2, sourceBorder];
  const sh = [sourceBorder, height - sourceBorder * 2, sourceBorder];
  const dx = [rect.x, rect.x + b, rect.x + rect.width - b];
  const dy = [rect.y, rect.y + b, rect.y + rect.height - b];
  const dw = [b, rect.width - b * 2, b];
  const dh = [b, rect.height - b * 2, b];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      if ((row === 1 && column === 1) || dw[column] <= 0 || dh[row] <= 0) continue;
      ctx.drawImage(image, sx[column], sy[row], sw[column], sh[row], dx[column], dy[row], dw[column], dh[row]);
    }
  }
};

const snowflake = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = "#d6ffff";
  ctx.lineWidth = Math.max(0.8, radius * 0.15);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let arm = 0; arm < 6; arm += 1) {
    const a = arm * Math.PI / 3;
    const ux = Math.cos(a), uy = Math.sin(a);
    ctx.moveTo(0, 0);
    ctx.lineTo(ux * radius, uy * radius);
    const fork = radius * 0.59, branch = radius * 0.3;
    ctx.moveTo(ux * fork + Math.cos(a - 1.05) * branch, uy * fork + Math.sin(a - 1.05) * branch);
    ctx.lineTo(ux * fork, uy * fork);
    ctx.lineTo(ux * fork + Math.cos(a + 1.05) * branch, uy * fork + Math.sin(a + 1.05) * branch);
  }
  ctx.stroke();
  ctx.restore();
};

const iceShard = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(radius * 0.5, -radius * 0.1);
  ctx.lineTo(radius * 0.2, radius * 0.8);
  ctx.lineTo(-radius * 0.65, radius * 0.27);
  ctx.closePath();
  ctx.fillStyle = "rgba(173,246,255,0.8)";
  ctx.fill();
  ctx.strokeStyle = "rgba(242,255,255,0.95)";
  ctx.lineWidth = Math.max(0.75, radius * 0.11);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.lineTo(0, radius * 0.4);
  ctx.lineTo(-radius * 0.65, radius * 0.27);
  ctx.stroke();
  ctx.restore();
};

const launchPosition = (geometry: TimeFreezeAnimationGeometry, progress: number) => {
  const origin = center(geometry.source);
  const focus = { x: geometry.viewport.x + geometry.viewport.width * 0.5,
    y: geometry.viewport.y + geometry.viewport.height * 0.31 };
  const p = unit(progress), q = 1 - p;
  const control1 = { x: origin.x - geometry.viewport.width * 0.035,
    y: origin.y - geometry.viewport.height * 0.25 };
  const control2 = { x: focus.x - geometry.viewport.width * 0.045,
    y: focus.y + geometry.viewport.height * 0.11 };
  return {
    x: q ** 3 * origin.x + 3 * q * q * p * control1.x + 3 * q * p * p * control2.x + p ** 3 * focus.x,
    y: q ** 3 * origin.y + 3 * q * q * p * control1.y + 3 * q * p * p * control2.y + p ** 3 * focus.y,
  };
};

const clockFrost = (ctx: CanvasRenderingContext2D, size: number): void => {
  // Follow the watch's curved body and bells rather than enclosing it in a
  // stretched square glass panel. This is a glow and a few ice facets only.
  const halo = ctx.createRadialGradient(0, 0, size * 0.38, 0, 0, size * 0.67);
  halo.addColorStop(0, "rgba(112,228,255,0)");
  halo.addColorStop(0.45, "rgba(149,243,255,0.58)");
  halo.addColorStop(0.66, "rgba(215,255,255,0.42)");
  halo.addColorStop(1, "rgba(107,218,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
  ctx.beginPath();
  for (let i = 0; i <= 48; i += 1) {
    const a = i * TAU / 48;
    const r = size * (0.485 + Math.sin(a * 7) * 0.021 + Math.cos(a * 11) * 0.009);
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 1.045;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = "rgba(109,231,255,0.7)";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.056;
  ctx.stroke();
  ctx.strokeStyle = "rgba(223,255,255,0.8)";
  ctx.lineWidth = size * 0.013;
  ctx.stroke();
  for (let i = 0; i < 9; i += 1) {
    const a = i * TAU / 9 + 0.28;
    iceShard(ctx, Math.cos(a) * size * 0.49, Math.sin(a) * size * 0.512,
      size * (0.035 + (i % 3) * 0.009), a + 0.4);
  }
};

const drawFlyingClock = (
  ctx: CanvasRenderingContext2D,
  sample: TimeFreezeAnimationSample,
  geometry: TimeFreezeAnimationGeometry,
  art: TimeFreezeAnimationArt,
): void => {
  const viewport = geometry.viewport;
  const focus = launchPosition(geometry, 1);
  const target = center(geometry.timer);
  const p = unit(sample.age / LAUNCH_END);
  const flightProgress = unit((sample.age - HOVER_END) / (ARRIVAL - HOVER_END));
  const fly = 1 - (1 - flightProgress) ** 3;
  const up = 1 - (1 - unit(flightProgress / 0.7)) ** 3;
  const drop = smooth((flightProgress - 0.7) / 0.3);
  const overshootY = target.y - geometry.timer.height * 0.46;
  const position = sample.phase === "launch" ? launchPosition(geometry, p)
    : { x: mix(focus.x, target.x, fly), y: flightProgress <= 0.7
      ? mix(focus.y, overshootY, up) : mix(overshootY, target.y, drop) };
  const restingSize = viewport.width * 0.244;
  const size = sample.phase === "launch" ? mix(geometry.source.width * 0.65, restingSize, smooth(p))
    : mix(restingSize * (1 + Math.sin((sample.age - LAUNCH_END) * 11) * 0.033), geometry.timer.height * 0.68, fly);

  // Deterministic wisps along the curved route, not frame-spawned particles.
  const trailOpacity = sample.phase === "fly" ? 0.55 * (1 - fly) : 0.6;
  for (let i = 0; i < 10; i += 1) {
    const routeProgress = Math.max(0, (sample.phase === "launch" ? p : 1) - i * 0.064);
    const point = launchPosition(geometry, routeProgress);
    const opacity = trailOpacity * (1 - i / 11) * Math.min(1, sample.age * 8);
    glow(ctx, point.x, point.y, viewport.width * (0.03 + (i % 3) * 0.005), opacity * 0.42);
    if (i % 2 === 0) {
      ctx.save();
      ctx.globalAlpha *= opacity;
      snowflake(ctx, point.x + Math.sin(i * 2.7) * 9, point.y + 7, viewport.width * 0.012, sample.age + i);
      ctx.restore();
    }
  }
  glow(ctx, position.x, position.y, size * 0.82, 0.48);
  ctx.save();
  ctx.translate(position.x, position.y);
  const flip = sample.phase === "launch" ? Math.cos(p * TAU) : 1;
  ctx.rotate(sample.phase === "launch" ? Math.sin(p * TAU) * 0.1 : -fly * 0.06);
  ctx.scale(Math.abs(flip) < 0.07 ? (flip < 0 ? -0.07 : 0.07) : flip, 1);
  clockFrost(ctx, size);
  if (art.clock) {
    const iw = art.clock.naturalWidth || art.clock.width;
    const ih = art.clock.naturalHeight || art.clock.height;
    if (iw > 0 && ih > 0) {
      const width = size * iw / Math.max(iw, ih), height = size * ih / Math.max(iw, ih);
      ctx.drawImage(art.clock, -width / 2, -height / 2, width, height);
    }
  }
  ctx.restore();
};

const drawFrostFrame = (
  ctx: CanvasRenderingContext2D,
  viewport: TimeFreezeAnimationRect,
  ice: HTMLImageElement | undefined,
  age: number,
  reducedMotion: boolean,
): void => {
  const edge = Math.max(18, Math.min(28, viewport.width * 0.048));
  // Each side is a soft uneven frost ribbon, not a luminous rectangular frame.
  // All texture and light is clipped to its narrow organic silhouette.
  for (let side = 0; side < 4; side += 1) {
    ctx.save();
    const length = side % 2 === 0 ? viewport.width : viewport.height;
    const ox = side === 1 || side === 2 ? viewport.x + viewport.width : viewport.x;
    const oy = side >= 2 ? viewport.y + viewport.height : viewport.y;
    ctx.translate(ox, oy);
    ctx.rotate(side * Math.PI / 2);
    const segments = Math.max(12, Math.ceil(length / 24));
    const depth = (i: number) => edge * (0.68 + Math.sin(i * 1.17 + side * 2.8) * 0.17
      + Math.sin(i * 2.91 + side) * 0.075);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.lineTo(length, depth(segments));
    for (let i = segments - 1; i >= 0; i -= 1) {
      const x = i * length / segments;
      const nextX = (i + 1) * length / segments;
      ctx.quadraticCurveTo((x + nextX) / 2, depth(i + 0.5), x, depth(i));
    }
    ctx.closePath();
    ctx.clip();
    const gradient = ctx.createLinearGradient(0, 0, 0, edge);
    gradient.addColorStop(0, "rgba(69,193,244,0.76)");
    gradient.addColorStop(0.2, "rgba(141,239,255,0.61)");
    gradient.addColorStop(0.48, "rgba(113,220,255,0.29)");
    gradient.addColorStop(0.8, "rgba(105,224,255,0.1)");
    gradient.addColorStop(1, "rgba(105,224,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, length, edge);
    if (ice) {
      const iw = ice.naturalWidth || ice.width, ih = ice.naturalHeight || ice.height;
      if (iw > 0 && ih > 0) {
        ctx.save();
        ctx.globalAlpha *= 0.38;
        // Exclude the asset's straight white outermost line. Repeating its
        // fractured inner strip supplies frost grain without a frame seam.
        for (let tile = 0; tile < 6; tile += 1) {
          ctx.drawImage(ice, iw * 0.25, ih * 0.055, iw * 0.5, ih * 0.24,
            tile * length / 6, 0, length / 6 + 0.5, edge * (0.76 + (tile % 3) * 0.08));
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }
  // Twelve fixed edge facets break up the straight nine-slice silhouette.
  for (let i = 0; i < 12; i += 1) {
    const side = i % 4, t = (Math.floor(i / 4) + 0.45 + (i % 3) * 0.17) / 3.55;
    const x = side < 2 ? viewport.x + (side === 0 ? edge * 0.33 : viewport.width - edge * 0.33)
      : viewport.x + viewport.width * t;
    const y = side < 2 ? viewport.y + viewport.height * t
      : viewport.y + (side === 2 ? edge * 0.3 : viewport.height - edge * 0.3);
    ctx.save();
    ctx.globalAlpha *= reducedMotion ? 0.48 : 0.43 + Math.sin(age * 1.1 + i) * 0.09;
    iceShard(ctx, x, y, edge * (0.27 + (i % 3) * 0.055), i * 1.73);
    ctx.restore();
  }
};

const drawFrozenTimer = (
  ctx: CanvasRenderingContext2D,
  sample: TimeFreezeAnimationSample,
  timer: TimeFreezeAnimationRect,
  art: TimeFreezeAnimationArt,
): void => {
  const casing = { x: timer.x - 6, y: timer.y - 5, width: timer.width + 12, height: timer.height + 10 };
  ctx.fillStyle = "rgba(118,235,255,0.13)";
  roundedPath(ctx, casing, casing.height * 0.4);
  ctx.fill();
  iceBorder(ctx, art.ice, casing, Math.min(11, casing.height * 0.23));
  const bar = { x: timer.x + timer.width * 0.1, y: timer.y + timer.height + 9,
    width: timer.width * 0.8, height: 14 };
  ctx.fillStyle = "#16465e";
  roundedPath(ctx, bar, 7);
  ctx.fill();
  if (sample.freezeProgress > 0) {
    ctx.save();
    roundedPath(ctx, bar, 7);
    ctx.clip();
    const fill = ctx.createLinearGradient(0, bar.y, 0, bar.y + bar.height);
    fill.addColorStop(0, "#a9f8ff");
    fill.addColorStop(1, "#32aedd");
    ctx.fillStyle = fill;
    ctx.fillRect(bar.x, bar.y, bar.width * sample.freezeProgress, bar.height);
    ctx.restore();
  }
  ctx.strokeStyle = "#98f2ff";
  ctx.lineWidth = 1;
  roundedPath(ctx, bar, 7);
  ctx.stroke();
  snowflake(ctx, bar.x + 9, bar.y + bar.height / 2, 4.4, 0);
  ctx.font = "900 10px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "#16445d";
  ctx.fillStyle = "#ffffff";
  const text = `${Math.ceil(sample.remaining)}s`;
  ctx.strokeText(text, bar.x + bar.width / 2 + 3, bar.y + bar.height / 2 + 0.5);
  ctx.fillText(text, bar.x + bar.width / 2 + 3, bar.y + bar.height / 2 + 0.5);
};

export const drawTimeFreezeAnimation = (
  ctx: CanvasRenderingContext2D,
  sample: TimeFreezeAnimationSample,
  geometry: TimeFreezeAnimationGeometry,
  art: TimeFreezeAnimationArt,
): void => {
  if (!sample.visible || sample.opacity <= 0 || geometry.viewport.width <= 0 || geometry.viewport.height <= 0) return;
  const viewport = geometry.viewport;
  const activeScene = sample.reducedMotion || sample.age >= ARRIVAL || sample.phase === "ending";
  const arrivalProgress = sample.reducedMotion ? 1 : smooth((sample.age - ARRIVAL) / 0.24);
  ctx.save();
  ctx.globalAlpha *= sample.opacity;
  ctx.beginPath();
  ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.clip();
  if (!sample.reducedMotion && sample.age < ARRIVAL && sample.phase !== "ending") {
    ctx.fillStyle = `rgba(8,13,36,${0.38 * Math.min(1, sample.age / 0.12)})`;
    ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
    drawFlyingClock(ctx, sample, geometry, art);
  }
  if (activeScene) {
    ctx.save();
    ctx.globalAlpha *= sample.phase === "ending" ? 1 : arrivalProgress;
    drawFrostFrame(ctx, viewport, art.ice, sample.age, sample.reducedMotion);
    drawFrozenTimer(ctx, sample, geometry.timer, art);
    if (!sample.reducedMotion) {
      // Ten slow flakes, twelve edge facets and sixteen burst shards, plus the
      // timer's single snowflake: at most thirty-nine particle/decor pieces.
      for (let i = 0; i < 10; i += 1) {
        const seed = (i * 0.61803398875 + 0.13) % 1;
        const travel = ((sample.age - ARRIVAL) * (0.028 + (i % 3) * 0.008) + i * 0.173) % 1;
        const x = viewport.x + viewport.width * (0.04 + seed * 0.92) + Math.sin(sample.age * 0.75 + i) * 9;
        const y = viewport.y + viewport.height * travel;
        const alpha = 0.27 + 0.29 * Math.sin(Math.PI * unit(travel));
        ctx.save();
        ctx.globalAlpha *= alpha;
        snowflake(ctx, x, y, 3.6 + (i % 4) * 1.4, sample.age * 0.18 + i);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  if (!sample.reducedMotion && sample.phase === "burst") {
    const p = unit((sample.age - ARRIVAL) / (BURST_END - ARRIVAL));
    const origin = center(geometry.timer);
    const radius = mix(10, viewport.height * 0.57, 1 - (1 - p) ** 2);
    const alpha = (1 - p) ** 1.65;
    glow(ctx, origin.x, origin.y, Math.max(32, radius * 0.92), alpha * 0.65);
    glow(ctx, origin.x, origin.y, mix(36, viewport.width * 0.23, p), (1 - unit(p / 0.32)) * 0.94);
    // A wide feathered pulse has no hard stroke that reads as a glass hoop.
    const waveOuter = radius * 1.15 + 14;
    const wave = ctx.createRadialGradient(origin.x, origin.y, Math.max(0, radius * 0.76 - 8),
      origin.x, origin.y, waveOuter);
    wave.addColorStop(0, "rgba(135,230,255,0)");
    wave.addColorStop(0.3, `rgba(141,233,255,${alpha * 0.13})`);
    wave.addColorStop(0.55, `rgba(193,253,255,${alpha * 0.37})`);
    wave.addColorStop(0.72, `rgba(146,238,255,${alpha * 0.16})`);
    wave.addColorStop(1, "rgba(125,220,255,0)");
    ctx.fillStyle = wave;
    ctx.fillRect(origin.x - waveOuter, origin.y - waveOuter, waveOuter * 2, waveOuter * 2);
    for (let i = 0; i < 16; i += 1) {
      const angle = i * TAU / 16 + 0.19;
      const distance = radius * (0.4 + (i % 5) * 0.12);
      ctx.save();
      ctx.globalAlpha *= alpha * 0.8;
      iceShard(ctx, origin.x + Math.cos(angle) * distance,
        origin.y + Math.sin(angle) * distance + p * p * viewport.height * 0.12,
        viewport.width * (0.012 + (i % 3) * 0.004), angle + p * 2);
      ctx.restore();
    }
  }
  ctx.restore();
};
