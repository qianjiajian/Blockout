/** Presentation only: the caller owns the mechanism event, inventory and save. */
export const PULSE_RELEASE_TIME = 0.65;
export const PULSE_DURATION = 1.4;
export const PULSE_REDUCED_DURATION = 0.25;

export interface PulsePoint { x: number; y: number }
export interface PulseRect extends PulsePoint { width: number; height: number }
export interface PulseTarget {
  id: string;
  kind: "block" | "gate" | "shutter";
  previous: number;
  remaining: number;
  /** Occupied cells or separate ports, in the same logical coordinates as the board. */
  rects: PulseRect[];
}
export type PulseAnimationPhase = "idle" | "focus" | "fly" | "gather" | "wave" | "fade";
export interface PulseAnimationSample {
  age: number;
  visible: boolean;
  phase: PulseAnimationPhase;
  dimAlpha: number;
  opacity: number;
  reducedMotion: boolean;
  targets: PulseTarget[];
}
export interface PulseAnimationGeometry { source: PulsePoint; center: PulsePoint; board: PulseRect }

const TAU = Math.PI * 2;
const WAVE_TRAVEL = 0.38;
const SHAKE_DURATION = 0.12;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const mix = (from: number, to: number, progress: number): number => from + (to - from) * progress;
const validPoint = (point: PulsePoint): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);
const validRect = (rect: PulseRect): boolean => validPoint(rect)
  && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0
  && Number.isFinite(rect.x + rect.width) && Number.isFinite(rect.y + rect.height);
const rectCenter = (rect: PulseRect): PulsePoint => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
const cloneTarget = (target: PulseTarget): PulseTarget => ({ ...target, rects: target.rects.map((rect) => ({ ...rect })) });

/** Paint only the complement of the focus union. Overlapping ice sprites must
 * not cancel each other's holes, as an even-odd clip would do. One fill also
 * avoids stacking opacity where adjacent targets share a band. */
export function drawPulseDim(ctx: CanvasRenderingContext2D, alpha: number, viewport: PulseRect,
  focusRects: readonly PulseRect[]): void {
  if (!validRect(viewport) || !Number.isFinite(alpha) || alpha <= 0) return;
  const right = viewport.x + viewport.width, bottom = viewport.y + viewport.height;
  const holes = focusRects.filter(validRect).map(rect => ({
    x: Math.max(viewport.x, rect.x), y: Math.max(viewport.y, rect.y),
    right: Math.min(right, rect.x + rect.width), bottom: Math.min(bottom, rect.y + rect.height),
  })).filter(rect => rect.right > rect.x && rect.bottom > rect.y);
  const rows = [...new Set([viewport.y, bottom, ...holes.flatMap(rect => [rect.y, rect.bottom])])].sort((a, b) => a - b);
  ctx.save();
  try {
    ctx.globalAlpha *= clamp01(alpha);
    ctx.fillStyle = "#090d24";
    ctx.beginPath();
    for (let row = 0; row < rows.length - 1; row += 1) {
      const y = rows[row], height = rows[row + 1] - y;
      const intervals = holes.filter(rect => rect.y < y + height && rect.bottom > y).sort((a, b) => a.x - b.x);
      let x = viewport.x;
      for (const rect of intervals) {
        if (rect.x > x) ctx.rect(x, y, rect.x - x, height);
        x = Math.max(x, rect.right);
      }
      if (x < right) ctx.rect(x, y, right - x, height);
    }
    ctx.fill();
  } finally { ctx.restore(); }
}

export class PulseAnimation {
  private visible = false;
  private age = 0;
  private targets: PulseTarget[] = [];

  get isVisible(): boolean { return this.visible; }

  trigger(targets: PulseTarget[]): void {
    this.reset();
    this.targets = targets.filter((target) => Number.isFinite(target.previous)
      && Number.isFinite(target.remaining) && target.remaining >= 0 && target.previous > target.remaining)
      .map((target) => ({ ...target, rects: target.rects.filter(validRect).map((rect) => ({ ...rect })) }))
      .filter((target) => target.rects.length > 0);
    this.visible = this.targets.length > 0;
  }

  reset(): void { this.visible = false; this.age = 0; this.targets = []; }

  update(delta: number, active: boolean, terminal: boolean, reduced: boolean): void {
    if (terminal) { this.reset(); return; }
    if (!active || !this.visible || !Number.isFinite(delta) || delta <= 0) return;
    const duration = reduced ? PULSE_REDUCED_DURATION : PULSE_DURATION;
    this.age = Math.min(duration, this.age + delta);
    if (this.age >= duration) this.reset();
  }

  sample(reduced: boolean): PulseAnimationSample {
    const duration = reduced ? PULSE_REDUCED_DURATION : PULSE_DURATION;
    const visible = this.visible && this.age < duration;
    const opacity = !visible ? 0 : reduced ? 1 - smooth(this.age / duration)
      : 1 - smooth((this.age - 1.05) / (PULSE_DURATION - 1.05));
    const phase: PulseAnimationPhase = !visible ? "idle" : reduced ? "fade"
      : this.age < 0.15 ? "focus" : this.age < 0.45 ? "fly" : this.age < PULSE_RELEASE_TIME ? "gather"
        : this.age < 1.05 ? "wave" : "fade";
    return { age: this.age, visible, phase, opacity, reducedMotion: reduced,
      dimAlpha: opacity * (reduced ? 0.18 : 0.5 * smooth(this.age / 0.15)),
      targets: visible ? this.targets.map(cloneTarget) : [] };
  }
}

/** Separate ports share the first wave arrival; the renderer and counter overlay use this same clock. */
export function pulseTargetArrival(target: PulseTarget, center: PulsePoint, maxRadius: number, reduced: boolean): number {
  if (reduced) return 0;
  if (!validPoint(center) || !Number.isFinite(maxRadius) || maxRadius <= 0) return PULSE_RELEASE_TIME;
  let distance = Infinity;
  for (const rect of target.rects) {
    if (!validRect(rect)) continue;
    const point = rectCenter(rect);
    distance = Math.min(distance, Math.hypot(point.x - center.x, point.y - center.y));
  }
  return PULSE_RELEASE_TIME + WAVE_TRAVEL * (Number.isFinite(distance) ? clamp01(distance / maxRadius) : 0);
}

const SHAKE_NODES: readonly PulsePoint[] = [
  { x: -4, y: 7 }, { x: 7, y: -2 }, { x: -1, y: -5 },
  { x: -3, y: -2 }, { x: 1, y: -3 }, { x: 2, y: 1 }, { x: 0, y: 0 },
];

/** Overall animation age. Half the rocket's logical offsets, compressed to 120 ms. */
export function samplePulseShake(age: number, reduced: boolean): PulsePoint {
  const sinceRelease = age - PULSE_RELEASE_TIME;
  if (reduced || !Number.isFinite(age) || sinceRelease < 0 || sinceRelease >= SHAKE_DURATION) return { x: 0, y: 0 };
  const progress = sinceRelease / SHAKE_DURATION * (SHAKE_NODES.length - 1);
  const index = Math.min(SHAKE_NODES.length - 2, Math.floor(progress));
  const local = progress - index;
  const scale = 496 / 560 * 0.5;
  return { x: mix(SHAKE_NODES[index].x, SHAKE_NODES[index + 1].x, local) * scale,
    y: mix(SHAKE_NODES[index].y, SHAKE_NODES[index + 1].y, local) * scale };
}

const withState = (ctx: CanvasRenderingContext2D, draw: () => void): void => {
  ctx.save();
  try { draw(); } finally { ctx.restore(); }
};

interface Edge { a: PulsePoint; b: PulsePoint }

/** Remove shared sides, including partial contacts, so an L shape stays an L silhouette. */
function outerEdges(rects: PulseRect[]): Edge[] {
  const unique = rects.filter((rect, index) => rects.findIndex((other) => other.x === rect.x && other.y === rect.y
    && other.width === rect.width && other.height === rect.height) === index);
  const edges: Edge[] = [];
  const epsilon = 0.0001;
  for (const rect of unique) {
    for (let side = 0; side < 4; side += 1) {
      const horizontal = side % 2 === 0;
      const fixed = side === 0 ? rect.y : side === 1 ? rect.x + rect.width
        : side === 2 ? rect.y + rect.height : rect.x;
      let spans = [[horizontal ? rect.x : rect.y, horizontal ? rect.x + rect.width : rect.y + rect.height]];
      for (const other of unique) {
        if (other === rect) continue;
        const coversOutside = side === 0 ? other.y < fixed - epsilon && other.y + other.height >= fixed - epsilon
          : side === 1 ? other.x <= fixed + epsilon && other.x + other.width > fixed + epsilon
            : side === 2 ? other.y <= fixed + epsilon && other.y + other.height > fixed + epsilon
              : other.x < fixed - epsilon && other.x + other.width >= fixed - epsilon;
        if (!coversOutside) continue;
        const from = horizontal ? other.x : other.y;
        const to = horizontal ? other.x + other.width : other.y + other.height;
        const next: number[][] = [];
        for (const [start, end] of spans) {
          if (to <= start + epsilon || from >= end - epsilon) { next.push([start, end]); continue; }
          if (from > start + epsilon) next.push([start, Math.min(end, from)]);
          if (to < end - epsilon) next.push([Math.max(start, to), end]);
        }
        spans = next;
      }
      for (const [start, end] of spans) edges.push(horizontal
        ? { a: { x: start, y: fixed }, b: { x: end, y: fixed } }
        : { a: { x: fixed, y: start }, b: { x: fixed, y: end } });
    }
  }
  return edges;
}

function glow(ctx: CanvasRenderingContext2D, point: PulsePoint, radius: number, opacity: number): void {
  if (radius <= 0 || opacity <= 0) return;
  const light = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
  light.addColorStop(0, `rgba(230,253,255,${clamp01(opacity)})`);
  light.addColorStop(0.25, `rgba(93,225,255,${clamp01(opacity * 0.55)})`);
  light.addColorStop(0.6, `rgba(173,115,255,${clamp01(opacity * 0.25)})`);
  light.addColorStop(1, "rgba(110,137,255,0)");
  ctx.fillStyle = light;
  ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
}

function drawOutlines(ctx: CanvasRenderingContext2D, target: PulseTarget, alpha: number, hit: number): void {
  if (alpha <= 0) return;
  const edges = outerEdges(target.rects);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const edge of edges) { ctx.moveTo(edge.a.x, edge.a.y); ctx.lineTo(edge.b.x, edge.b.y); }
  ctx.strokeStyle = `rgba(165,91,255,${alpha * 0.37})`;
  ctx.lineWidth = 8 + hit * 2;
  ctx.stroke();
  ctx.strokeStyle = `rgba(103,239,255,${alpha * 0.9})`;
  ctx.lineWidth = 2.5 + hit;
  ctx.stroke();
  if (hit > 0) {
    ctx.strokeStyle = `rgba(238,255,255,${alpha * hit * 0.85})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function drawIcon(ctx: CanvasRenderingContext2D, sample: PulseAnimationSample, geometry: PulseAnimationGeometry,
  image: HTMLImageElement | undefined): void {
  if (sample.age < 0.15 || sample.age >= 0.85) return;
  const flight = clamp01((sample.age - 0.15) / 0.3);
  const travel = 1 - (1 - flight) ** 3;
  const size = Math.max(52, Math.min(92, Math.min(geometry.board.width, geometry.board.height) * 0.23));
  const point = { x: mix(geometry.source.x, geometry.center.x, travel),
    y: mix(geometry.source.y, geometry.center.y, travel) - Math.sin(travel * Math.PI) * size * 0.25 };
  const gathering = clamp01((sample.age - 0.45) / 0.2);
  const released = clamp01((sample.age - PULSE_RELEASE_TIME) / 0.2);
  withState(ctx, () => {
    ctx.globalAlpha *= smooth((sample.age - 0.15) / 0.045) * (1 - smooth(released));
    glow(ctx, point, size * (0.75 + gathering * 0.2), 0.5 + gathering * 0.25);
    const spriteSize = size * mix(0.68, 1, travel) * (1 + gathering * 0.08 - released * 0.22);
    const width = image?.naturalWidth || image?.width || 0;
    const height = image?.naturalHeight || image?.height || 0;
    if (image && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      const scale = spriteSize / Math.max(width, height);
      ctx.drawImage(image, point.x - width * scale / 2, point.y - height * scale / 2, width * scale, height * scale);
    }
    if (sample.age >= 0.45 && sample.age < PULSE_RELEASE_TIME) {
      const angle = gathering * TAU * 0.65;
      for (let arc = 0; arc < 3; arc += 1) {
        const from = angle + arc * TAU / 3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 0.65, from, from + TAU * 0.22);
        ctx.strokeStyle = arc % 2 === 0 ? "#8ef6ff" : "#c8a0ff";
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
      for (let particle = 0; particle < 18; particle += 1) {
        const angle = particle * TAU / 18 + gathering * 0.4;
        const radius = size * mix(1.2 + (particle % 3) * 0.25, 0.28, gathering);
        const x = point.x + Math.cos(angle) * radius, y = point.y + Math.sin(angle) * radius;
        ctx.fillStyle = particle % 3 ? "#a2f7ff" : "#c39bff";
        ctx.beginPath();
        ctx.arc(x, y, 1.1 + (particle % 3) * 0.5, 0, TAU);
        ctx.fill();
      }
    }
  });
}

function drawWaves(ctx: CanvasRenderingContext2D, age: number, geometry: PulseAnimationGeometry, maxRadius: number): void {
  if (age < PULSE_RELEASE_TIME || age >= 1.05) return;
  withState(ctx, () => {
    ctx.beginPath();
    ctx.rect(geometry.board.x, geometry.board.y, geometry.board.width, geometry.board.height);
    ctx.clip();
    const burst = clamp01((age - PULSE_RELEASE_TIME) / 0.17);
    glow(ctx, geometry.center, 35 + burst * 65, 0.8 * (1 - burst) ** 2);
    for (let wave = 0; wave < 2; wave += 1) {
      const elapsed = age - PULSE_RELEASE_TIME - wave * 0.065;
      const duration = wave === 0 ? WAVE_TRAVEL : 0.32;
      if (elapsed <= 0 || elapsed >= duration) continue;
      const progress = elapsed / duration;
      const radius = maxRadius * progress;
      const alpha = (1 - smooth((progress - 0.73) / 0.27)) * (wave === 0 ? 0.9 : 0.72);
      const width = wave === 0 ? 12 : 8;
      const ring = ctx.createRadialGradient(geometry.center.x, geometry.center.y, Math.max(0, radius - width),
        geometry.center.x, geometry.center.y, radius + width);
      const color = wave === 0 ? "94,235,255" : "178,119,255";
      ring.addColorStop(0, `rgba(${color},0)`);
      ring.addColorStop(0.42, `rgba(${color},${alpha * 0.3})`);
      ring.addColorStop(0.5, `rgba(${color},${alpha * 0.72})`);
      ring.addColorStop(0.58, `rgba(${color},${alpha * 0.3})`);
      ring.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(geometry.center.x, geometry.center.y, radius + width, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(${wave === 0 ? "202,255,255" : "222,191,255"},${alpha})`;
      ctx.lineWidth = wave === 0 ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.arc(geometry.center.x, geometry.center.y, radius, 0, TAU);
      ctx.stroke();
    }
  });
}

function drawBadge(ctx: CanvasRenderingContext2D, target: PulseTarget, age: number, arrival: number,
  reduced: boolean, geometry: PulseAnimationGeometry): void {
  const elapsed = age - arrival;
  if (elapsed < 0) return;
  // Anchor to the nearest actual occupied cell/port, never an empty concavity
  // or the centre of the space between two separate same-colour exits.
  const anchor = target.rects.reduce((best, rect) => {
    const point = rectCenter(rect), current = rectCenter(best);
    return Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y)
      < Math.hypot(current.x - geometry.center.x, current.y - geometry.center.y) ? rect : best;
  });
  const point = rectCenter(anchor);
  const lift = reduced ? 0 : 16 * smooth(elapsed / 0.32);
  const x = point.x, y = point.y - lift;
  const text = `${target.previous}→${target.remaining}`;
  const fontSize = Math.max(13, Math.min(19, Math.min(geometry.board.width, geometry.board.height) * 0.047));
  withState(ctx, () => {
    ctx.globalAlpha *= reduced ? 1 : smooth(elapsed / 0.045);
    ctx.font = `900 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#24214f";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = target.remaining === 0 ? "#eaffff" : "#b2faff";
    ctx.fillText(text, x, y);
  });
}

export function drawPulseAnimation(ctx: CanvasRenderingContext2D, sample: PulseAnimationSample,
  geometry: PulseAnimationGeometry, image?: HTMLImageElement,
  highlightRects?: ReadonlyMap<string, PulseRect[]>): void {
  if (!sample.visible || !Number.isFinite(sample.age) || sample.age < 0 || !Number.isFinite(sample.opacity)
    || sample.opacity <= 0 || !validRect(geometry.board) || !validPoint(geometry.source) || !validPoint(geometry.center)) return;
  const board = geometry.board;
  const maxRadius = Math.max(...[
    { x: board.x, y: board.y }, { x: board.x + board.width, y: board.y },
    { x: board.x, y: board.y + board.height }, { x: board.x + board.width, y: board.y + board.height },
  ].map((point) => Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y)));
  if (!Number.isFinite(maxRadius) || maxRadius <= 0) return;
  withState(ctx, () => {
    ctx.globalAlpha *= clamp01(sample.opacity);
    const targets = sample.targets.map((target) => ({ ...target, rects: target.rects.filter(validRect) }))
      .filter((target) => target.rects.length > 0 && Number.isFinite(target.previous)
        && Number.isFinite(target.remaining) && target.previous > target.remaining && target.remaining >= 0);
    for (const target of targets) {
      const arrival = pulseTargetArrival(target, geometry.center, maxRadius, sample.reducedMotion);
      const hit = sample.reducedMotion || sample.age < arrival ? 0 : 1 - clamp01((sample.age - arrival) / 0.24);
      const alpha = sample.reducedMotion ? 0.75 : (0.58 + hit * 0.42) * smooth(sample.age / 0.1);
      // Keep wave/counter timing bound to the original logical snapshot;
      // the focus frame follows the current artwork registration separately.
      const rects = highlightRects?.get(`${target.kind}:${target.id}`) ?? target.rects;
      drawOutlines(ctx, { ...target, rects }, alpha, hit);
    }
    if (!sample.reducedMotion) {
      drawIcon(ctx, sample, geometry, image);
      drawWaves(ctx, sample.age, geometry, maxRadius);
    }
    for (const target of targets) drawBadge(ctx, target, sample.age,
      pulseTargetArrival(target, geometry.center, maxRadius, sample.reducedMotion), sample.reducedMotion, geometry);
  });
}
