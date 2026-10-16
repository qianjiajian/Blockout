/** Presentation only. The caller owns the impact, inventory and model event. */
export const ROCKET_FLIGHT_DURATION = 0.48;
export const ROCKET_REDUCED_FLIGHT_DURATION = 0.12;
export const ROCKET_SHATTER_DURATION = 0.56;
export const ROCKET_REDUCED_SHATTER_DURATION = 0.12;
export const ROCKET_SHAKE_DURATION = 0.2;

export interface RocketPoint { x: number; y: number }
export interface RocketCell extends RocketPoint { width: number; height: number }
export interface RocketFlightSample {
  age: number;
  duration: number;
  source: RocketPoint;
  target: RocketPoint;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const validPoint = (point: RocketPoint): boolean => Number.isFinite(point.x) && Number.isFinite(point.y);
const validAge = (age: number, duration: number): boolean => Number.isFinite(age)
  && Number.isFinite(duration) && age >= 0 && duration > 0 && age < duration;
const mix = (from: number, to: number, progress: number): number => from + (to - from) * progress;
const unit = (index: number, channel: number): number => {
  // Stable fragment/tail scatter; no frame-to-frame random flicker.
  const value = Math.sin((index + 1) * 91.73 + channel * 43.17) * 43758.5453;
  return value - Math.floor(value);
};

/** The artwork's nose points upper-right, about 58 degrees above horizontal. */
const ROCKET_ART_ANGLE = -58 * Math.PI / 180;

export function drawRocketFlight(
  ctx: CanvasRenderingContext2D,
  flight: RocketFlightSample,
  image: HTMLImageElement | undefined,
  reduced: boolean,
): void {
  if (reduced || !validAge(flight.age, flight.duration)
    || !validPoint(flight.source) || !validPoint(flight.target)) return;
  const imageWidth = image?.naturalWidth || image?.width || 0;
  const imageHeight = image?.naturalHeight || image?.height || 0;
  if (!image || !Number.isFinite(imageWidth) || !Number.isFinite(imageHeight)
    || imageWidth <= 0 || imageHeight <= 0) return;
  const progress = clamp01(flight.age / flight.duration);
  const travel = progress * (0.28 + 0.72 * progress);
  // Only one scalar is interpolated: the sprite's centre cannot curve off the
  // straight source-to-target segment, including on non-square viewports.
  const x = mix(flight.source.x, flight.target.x, travel);
  const y = mix(flight.source.y, flight.target.y, travel);
  const angle = Math.atan2(flight.target.y - flight.source.y, flight.target.x - flight.source.x);
  const width = 66;
  const height = width * imageHeight / imageWidth;
  const flameLength = 20 + 12 * progress + 2 * Math.sin(flight.age * 63);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const inheritedAlpha = ctx.globalAlpha;
  const flame = ctx.createLinearGradient(-width * 0.31, 0, -width * 0.31 - flameLength, 0);
  flame.addColorStop(0, "rgba(255,255,217,0.98)");
  flame.addColorStop(0.4, "rgba(255,198,46,0.9)");
  flame.addColorStop(1, "rgba(255,100,35,0)");
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-width * 0.27, -8);
  ctx.quadraticCurveTo(-width * 0.43, -7, -width * 0.31 - flameLength, 0);
  ctx.quadraticCurveTo(-width * 0.43, 7, -width * 0.27, 8);
  ctx.closePath();
  ctx.fill();
  // Six short-lived deterministic flecks stay close to the exhaust, rather
  // than forming a second curved projectile path.
  for (let index = 0; index < 6; index += 1) {
    const life = (flight.age * 4.3 + unit(index, 1)) % 1;
    ctx.globalAlpha = inheritedAlpha * 0.65 * (1 - life);
    ctx.fillStyle = index % 2 ? "#ffb534" : "#fff1b2";
    ctx.beginPath();
    ctx.arc(-width * 0.39 - life * 47, (unit(index, 2) - 0.5) * (5 + life * 14),
      1.2 + (1 - life) * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle - ROCKET_ART_ANGLE);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

const SHAKE_NODES: readonly RocketPoint[] = [
  { x: -4, y: 7 }, { x: 7, y: -2 }, { x: -1, y: -5 },
  { x: -3, y: -2 }, { x: 1, y: -3 }, { x: 2, y: 1 }, { x: 0, y: 0 },
];

/** Reference-frame offsets converted from its 560-wide world to logical 496. */
export function sampleRocketShake(age: number, reduced: boolean): RocketPoint {
  if (reduced || !validAge(age, ROCKET_SHAKE_DURATION)) return { x: 0, y: 0 };
  const sample = age / ROCKET_SHAKE_DURATION * (SHAKE_NODES.length - 1);
  const index = Math.min(SHAKE_NODES.length - 2, Math.floor(sample));
  const local = sample - index;
  const scale = 496 / 560;
  return {
    x: mix(SHAKE_NODES[index].x, SHAKE_NODES[index + 1].x, local) * scale,
    y: mix(SHAKE_NODES[index].y, SHAKE_NODES[index + 1].y, local) * scale,
  };
}

function trianglePath(ctx: CanvasRenderingContext2D, cell: RocketCell, index: number, half: number): void {
  const left = cell.x;
  const top = cell.y;
  const right = left + cell.width;
  const bottom = top + cell.height;
  ctx.beginPath();
  if (index % 2 === 0) {
    ctx.moveTo(left, top);
    ctx.lineTo(half === 0 ? right : left, half === 0 ? top : bottom);
    ctx.lineTo(right, bottom);
  } else {
    ctx.moveTo(right, top);
    ctx.lineTo(half === 0 ? left : right, half === 0 ? top : bottom);
    ctx.lineTo(left, bottom);
  }
  ctx.closePath();
}

/**
 * Each occupied cell breaks into two pieces of its original texture. The
 * callback draws the untransformed whole block in the same logical coordinate
 * system as cells. The clip/transform selects and moves only one triangle.
 */
export function drawRocketShatter(
  ctx: CanvasRenderingContext2D,
  age: number,
  duration: number,
  cells: Array<RocketCell>,
  reduced: boolean,
  drawOriginal: () => void,
): void {
  if (!validAge(age, duration)) return;
  const visibleCells = cells.filter((cell) => validPoint(cell) && Number.isFinite(cell.width)
    && Number.isFinite(cell.height) && cell.width > 0 && cell.height > 0);
  if (visibleCells.length === 0) return;
  const progress = clamp01(age / duration);
  if (reduced) {
    ctx.save();
    try {
      ctx.globalAlpha *= 1 - progress;
      drawOriginal();
    } finally { ctx.restore(); }
    return;
  }

  const crackHold = Math.min(0.04, duration * 0.2);
  if (age < crackHold) {
    ctx.save();
    try {
      drawOriginal();
      ctx.strokeStyle = "rgba(255,252,206,0.92)";
      ctx.lineWidth = 1.6;
      for (const [index, cell] of visibleCells.entries()) {
        ctx.fillStyle = `rgba(255,245,190,${0.28 * (1 - age / crackHold)})`;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        ctx.beginPath();
        ctx.moveTo(cell.x + (index % 2 ? cell.width : 0), cell.y);
        ctx.lineTo(cell.x + cell.width * (0.45 + unit(index, 4) * 0.1), cell.y + cell.height * 0.49);
        ctx.lineTo(cell.x + (index % 2 ? 0 : cell.width), cell.y + cell.height);
        ctx.stroke();
      }
    } finally { ctx.restore(); }
    return;
  }

  const breakup = clamp01((age - crackHold) / (duration - crackHold));
  const travel = 1 - (1 - breakup) ** 2;
  const opacity = (1 - breakup) ** 1.35;
  const center = visibleCells.reduce((sum, cell) => ({
    x: sum.x + cell.x + cell.width / 2,
    y: sum.y + cell.y + cell.height / 2,
  }), { x: 0, y: 0 });
  center.x /= visibleCells.length;
  center.y /= visibleCells.length;

  for (const [index, cell] of visibleCells.entries()) {
    for (let half = 0; half < 2; half += 1) {
      const seed = index * 2 + half;
      const cx = cell.x + cell.width * (half === 0 ? 0.66 : 0.34);
      const cy = cell.y + cell.height * (half === 0 ? 0.34 : 0.66);
      const radialX = cx - center.x;
      const radialY = cy - center.y;
      const length = Math.max(1, Math.hypot(radialX, radialY));
      const distance = Math.min(cell.width, cell.height) * (0.6 + unit(seed, 5) * 0.55);
      const dx = travel * (radialX / length * distance + (unit(seed, 6) - 0.5) * 12);
      // Symmetric initial blast, then gravity; the intact block never flies up.
      const dy = travel * (radialY / length * distance + (unit(seed, 7) - 0.5) * 10)
        + breakup * breakup * 45;
      const angle = travel * (unit(seed, 8) - 0.5) * 1.4;
      ctx.save();
      try {
        ctx.globalAlpha *= opacity;
        ctx.translate(cx + dx, cy + dy);
        ctx.rotate(angle);
        ctx.translate(-cx, -cy);
        trianglePath(ctx, cell, index, half);
        ctx.clip();
        drawOriginal();
      } finally { ctx.restore(); }
    }
  }
}

/** Compact warm impact light; intentionally not a full-screen white flash. */
export function drawRocketImpact(
  ctx: CanvasRenderingContext2D,
  target: RocketPoint,
  age: number,
  reduced: boolean,
): void {
  const duration = 0.3;
  if (reduced || !validAge(age, duration) || !validPoint(target)) return;
  const progress = age / duration;
  const radius = 8 + 51 * (1 - (1 - progress) ** 2);
  ctx.save();
  const glow = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, radius);
  glow.addColorStop(0, `rgba(255,255,231,${(1 - progress) ** 2 * 0.95})`);
  glow.addColorStop(0.22, `rgba(255,246,173,${(1 - progress) ** 2 * 0.76})`);
  glow.addColorStop(1, "rgba(255,215,66,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,244,154,${0.75 * (1 - progress) ** 1.4})`;
  ctx.lineWidth = 1.3 + 1.5 * (1 - progress);
  ctx.beginPath();
  ctx.arc(target.x, target.y, radius * 0.68, 0, Math.PI * 2);
  ctx.stroke();
  if (progress < 0.62) {
    ctx.strokeStyle = `rgba(255,255,221,${1 - progress / 0.62})`;
    ctx.lineWidth = 1.6;
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4 + 0.12;
      const inner = radius * (0.38 + progress * 0.1);
      const outer = radius * (0.86 + unit(index, 9) * 0.25);
      ctx.beginPath();
      ctx.moveTo(target.x + Math.cos(angle) * inner, target.y + Math.sin(angle) * inner);
      ctx.lineTo(target.x + Math.cos(angle) * outer, target.y + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }
  ctx.restore();
}
