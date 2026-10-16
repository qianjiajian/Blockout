/** Timings measured from QQ20261009-112104.mp4; input starts the flight. */
export const BOOSTER_UNLOCK_FLIGHT_DURATION = 1.65;
export const BOOSTER_UNLOCK_READY_AGE = 0.45;
const BOOSTER_UNLOCK_FIRST_ARRIVAL = 1.19;
const BOOSTER_UNLOCK_COPY_STAGGER = 0.09;
export function boosterUnlockLandedCount(flightAge: number, reduced = false): number {
  // Reduced motion fades the card without rendering flying item copies.
  if (reduced) return 0;
  return [0, 1, 2].filter(index => flightAge >= BOOSTER_UNLOCK_FIRST_ARRIVAL + index * BOOSTER_UNLOCK_COPY_STAGGER).length;
}
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
export interface BoosterUnlockMotion {
  overlayAlpha: number;
  contentAlpha: number;
  iconScale: number;
  numberScale: number;
  burst: number;
  flight: boolean;
  copies: Array<{ x: number; y: number; size: number; alpha: number; impact: number }>;
}
export function sampleBoosterUnlockMotion(age: number, flightAge: number | undefined,
  origin: { x: number; y: number; size: number }, target: { x: number; y: number; size: number },
  reduced = false): BoosterUnlockMotion {
  const reveal = reduced ? 1 : smooth(age / 0.16);
  if (flightAge === undefined) return {
    overlayAlpha: reveal, contentAlpha: reveal,
    iconScale: reduced ? 1 : age < 0.32 ? 2.5 - 1.57 * smooth(age / 0.32) : 0.93 + 0.07 * smooth((age - 0.32) / 0.12),
    numberScale: 1, burst: reduced ? 0 : Math.max(0, 1 - Math.abs(age - 0.3) / 0.2),
    flight: false, copies: [],
  };
  const t = Math.max(0, flightAge);
  if (reduced) return { overlayAlpha: 1 - smooth(t / 0.2), contentAlpha: 0, iconScale: 1,
    numberScale: 1, burst: 0, flight: true, copies: [] };
  const spread = smooth((t - 0.17) / 0.25);
  const offsets = [{ x: 0, y: -30 }, { x: -56, y: 52 }, { x: 56, y: 52 }];
  const copies = offsets.map((offset, i) => {
    const progress = clamp((t - 0.64 - i * BOOSTER_UNLOCK_COPY_STAGGER) / 0.55);
    const travel = progress * progress;
    const sx = origin.x + offset.x * spread, sy = origin.y + offset.y * spread;
    const impact = clamp((t - BOOSTER_UNLOCK_FIRST_ARRIVAL - i * BOOSTER_UNLOCK_COPY_STAGGER) / 0.24);
    return { x: sx + (target.x - sx) * travel,
      y: sy + (target.y - sy) * travel - Math.sin(progress * Math.PI) * 25,
      size: origin.size * 0.72 + (target.size - origin.size * 0.72) * travel,
      alpha: progress < 1 ? (i === 0 ? 1 : spread) : 0,
      impact: progress === 1 ? Math.sin(impact * Math.PI) : 0 };
  });
  return { overlayAlpha: 1 - smooth((t - 1.4) / 0.25), contentAlpha: 1 - smooth((t - 0.24) / 0.18),
    iconScale: 1, numberScale: 1 + 1.4 * Math.sin(clamp(t / 0.3) * Math.PI),
    burst: 0, flight: true, copies };
}

/** Original canvas effects using the reference's radial glow, four-point sparks and ribbons. */
export function drawBoosterUnlockGlow(ctx: CanvasRenderingContext2D, x: number, y: number,
  age: number, alpha: number, burst = 0, reduced = false): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const glow = ctx.createRadialGradient(x, y, 8, x, y, 200);
  glow.addColorStop(0, "rgba(255,232,99,.75)");
  glow.addColorStop(.38, "rgba(255,211,62,.26)");
  glow.addColorStop(1, "rgba(255,186,32,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 210, y - 210, 420, 420);
  ctx.save();ctx.translate(x, y);ctx.rotate(reduced ? 0 : age * .22);
  const ray = ctx.createRadialGradient(0, 0, 20, 0, 0, 155);
  ray.addColorStop(0, "rgba(255,223,79,.6)");ray.addColorStop(1, "rgba(255,201,51,0)");
  ctx.fillStyle = ray;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);ctx.beginPath();ctx.moveTo(0, 0);
    ctx.lineTo(156, -14);ctx.lineTo(156, 14);ctx.closePath();ctx.fill();
  }
  ctx.restore();
  if (burst > 0) {
    ctx.save();ctx.globalAlpha *= burst;ctx.shadowColor = "#ffe761";ctx.shadowBlur = 22;
    ctx.strokeStyle = "#fff47c";ctx.lineWidth = 5;ctx.beginPath();ctx.arc(x, y, 120 + (1 - burst) * 22, 0, Math.PI * 2);ctx.stroke();ctx.restore();
  }
  const colors = ["#fff765", "#5eefff", "#e785ff", "#ffd243"];
  for (let i = 0; i < 18; i++) {
    const cycle = reduced ? .5 : ((age * .58 + i * .137) % 1);
    const angle = i * 2.399 + .2;
    const radius = 68 + cycle * 255;
    const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
    ctx.save();ctx.globalAlpha *= Math.sin(cycle * Math.PI);
    ctx.fillStyle = colors[i % 4];ctx.shadowColor = colors[i % 4];ctx.shadowBlur = 12;
    ctx.translate(px, py);ctx.rotate(angle);
    if (i % 3 === 0) {
      const r = 8 + (i % 4) * 3;
      ctx.beginPath();ctx.moveTo(0, -r);ctx.lineTo(r * .25, -r * .25);ctx.lineTo(r, 0);
      ctx.lineTo(r * .25, r * .25);ctx.lineTo(0, r);ctx.lineTo(-r * .25, r * .25);
      ctx.lineTo(-r, 0);ctx.lineTo(-r * .25, -r * .25);ctx.closePath();ctx.fill();
    } else if (i % 3 === 1) {
      ctx.beginPath();ctx.arc(0, 0, 3 + i % 4, 0, Math.PI * 2);ctx.fill();
    } else if (!reduced) {
      ctx.beginPath();ctx.moveTo(-42, 0);ctx.quadraticCurveTo(-16, -12, 12, 0);
      ctx.quadraticCurveTo(-10, 6, -42, 0);ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
