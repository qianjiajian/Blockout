// Measured from QQ20261013-121319.mp4: 34px cards, 36px pitch,
// 8px approach before contact, then a 120px/s upward translation.
// Scale distances to our supplied 478:57 hint artwork without scaling time.
const height = 392 * 57 / 478;
export const STACKED_HINT_GEOMETRY = {
  width: 392,
  height,
  pitch: height * 36 / 34,
  entryGap: height * 8 / 34,
  speed: height * 120 / 34,
} as const;
export const STACKED_HINT_HOLD = 1.9;
export const STACKED_HINT_FADE = 0.4;

export interface StackedHintMotion {
  age: number;
  offsetY: number;
  settledAge: number;
}

export function createStackedHintMotion(previous?: StackedHintMotion, reducedMotion = false): StackedHintMotion {
  const { pitch, entryGap } = STACKED_HINT_GEOMETRY;
  return {
    age: 0,
    offsetY: !previous || reducedMotion ? 0 : Math.max(0, previous.offsetY) + pitch + entryGap,
    settledAge: 0,
  };
}

/** Oldest first. New arrivals contact and lift existing rows without restarting them. */
export function advanceStackedHints<T extends StackedHintMotion>(entries: T[], delta: number, reducedMotion = false): T[] {
  const dt = Math.max(0, delta);
  const { pitch, speed } = STACKED_HINT_GEOMETRY;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    const previousY = entry.offsetY;
    entry.age += dt;
    // Once pushed above the anchor, a surviving row never drops back down.
    entry.offsetY = reducedMotion ? Math.min(0, previousY)
      : Math.min(previousY, Math.max(0, previousY - speed * dt));
    const newer = entries[index + 1];
    if (newer) entry.offsetY = Math.min(entry.offsetY, newer.offsetY - pitch);
    entry.settledAge += reducedMotion || previousY <= 0
      ? dt : Math.max(0, dt - previousY / speed);
  }
  return entries.filter((entry) => entry.settledAge < STACKED_HINT_HOLD);
}

// The reference fades the plate, while its lettering remains readable until removal.
export function stackedHintBackgroundAlpha(entry: StackedHintMotion): number {
  return Math.max(0, Math.min(1, (STACKED_HINT_HOLD - entry.settledAge) / STACKED_HINT_FADE));
}
