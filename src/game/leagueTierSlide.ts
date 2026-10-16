export const LEAGUE_TIER_SLIDE_DURATION = 0.34;

export interface LeagueTierSlide {
  from: number;
  to: number;
  age: number;
}

export interface LeagueTierCarouselSlot {
  tier: number;
  x: number;
  y: number;
  width: number;
  height: number;
  alpha: number;
  distance: number;
}

export const LEAGUE_TIER_CAROUSEL_CLIP = { x: 0, y: 166, width: 496, height: 232 } as const;

const clampPosition = (value: number): number => Number.isNaN(value) ? 0 : Math.max(0, Math.min(7, value));
const mix = (from: number, to: number, progress: number): number => progress <= 0 ? from : progress >= 1 ? to : from + (to - from) * progress;
const smooth = (value: number): number => value * value * (3 - 2 * value);

/** Pure time sampling allows a new click to retarget from the displayed position. */
export function sampleLeagueTierPosition({ from, to, age }: LeagueTierSlide): number {
  const start = clampPosition(from), target = clampPosition(to);
  const progress = Number.isNaN(age) ? 0 : Math.max(0, Math.min(1, age / LEAGUE_TIER_SLIDE_DURATION));
  return mix(start, target, 1 - Math.pow(1 - progress, 3));
}

/** Slot geometry follows the existing center/neighbor positions, without wrapping tiers. */
export function leagueTierCarouselSlots(position: number): LeagueTierCarouselSlot[] {
  const current = clampPosition(position);
  const slots: LeagueTierCarouselSlot[] = [];
  for (let tier = 0; tier < 8; tier += 1) {
    const offset = tier - current, distance = Math.abs(offset);
    if (distance >= 2) continue;
    const sideX = offset < 0 ? 66 : 427;
    const outsideX = offset < 0 ? -100 : 596;
    const inner = distance <= 1;
    const progress = smooth(inner ? distance : distance - 1);
    const centerX = inner ? mix(248, sideX, progress) : mix(sideX, outsideX, progress);
    const centerY = inner ? mix(282, 302.5, progress) : mix(302.5, 310, progress);
    const width = inner ? mix(204, 124, progress) : mix(124, 88, progress);
    const height = inner ? mix(226, 185, progress) : mix(185, 144, progress);
    const alpha = inner ? mix(1, 0.32, progress) : mix(0.32, 0, progress);
    if (alpha <= 0) continue;
    slots.push({ tier, x: centerX - width / 2, y: centerY - height / 2, width, height, alpha, distance });
  }
  return slots.sort((a, b) => b.distance - a.distance || a.tier - b.tier);
}
