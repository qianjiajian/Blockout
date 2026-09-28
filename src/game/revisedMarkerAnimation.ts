/** Visual-only samples. PuzzleModel owns every gate/lock/bomb state change. */
export const REVISED_FLIP_GATE_SECONDS = 0.2;
export const REVISED_KEY_UNLOCK_TIMING = {
  popEnd: 0.3,
  flightStart: 0.7,
  arrival: 0.95,
  end: 1.35,
} as const;

const unit = (value: number): number => Math.max(0, Math.min(1, Number.isNaN(value) ? 0 : value));
const elapsed = (value: number): number => Math.max(0, Number.isNaN(value) ? 0 : value);
const smooth = (value: number): number => value * value * (3 - 2 * value);

/**
 * Two closed-panel halves retract toward the aperture's opposite long-axis ends.
 * 30fps reference: flip 1.417–1.617s and 2.633–2.800s (one-frame uncertainty).
 * fromOpenness preserves continuity if another clear arrives before settling.
 */
export const sampleRevisedFlipGate = (
  ageSeconds: number,
  toOpen: boolean,
  reducedMotion = false,
  fromOpenness = toOpen ? 0 : 1,
): { openness: number; closedPanelFraction: number; complete: boolean } => {
  const progress = reducedMotion ? 1 : unit(elapsed(ageSeconds) / REVISED_FLIP_GATE_SECONDS);
  const from = unit(fromOpenness);
  const openness = from + ((toOpen ? 1 : 0) - from) * smooth(progress);
  return { openness, closedPanelFraction: 1 - openness, complete: progress >= 1 };
};

/**
 * Reference key/lock sequence: pop and hover, fly to its matching lock, then
 * disappear into a short gold/white lock flash. No rotation or gameplay delay.
 * Renderer lerps source→lock by flightProgress and adds popOffsetCells on y.
 * Source is the key's pre-clear location, NOT the carrying block's exit trail.
 * Video samples: 16.567–17.9s and 35.833–37.2s. Timings rounded to 30fps evidence.
 */
export const sampleRevisedKeyUnlock = (ageSeconds: number, reducedMotion = false): {
  keyVisible: boolean;
  keyAlpha: number;
  keyScale: number;
  popOffsetCells: number;
  flightProgress: number;
  sparkleAlpha: number;
  lockFlashAlpha: number;
  lockFlashProgress: number;
  arrived: boolean;
  complete: boolean;
} => {
  const age = reducedMotion ? REVISED_KEY_UNLOCK_TIMING.end : elapsed(ageSeconds);
  const { popEnd, flightStart, arrival, end } = REVISED_KEY_UNLOCK_TIMING;
  const flightTime = unit((age - flightStart) / (arrival - flightStart));
  const flightProgress = flightTime * flightTime;
  const arrived = age >= arrival;
  const popUp = smooth(unit(age / 0.15));
  const settle = smooth(unit((age - 0.15) / (popEnd - 0.15)));
  const keyScale = age < 0.15 ? 1 + 0.8 * popUp : 1.8 - 0.8 * settle;
  const popOffsetCells = (age < 0.15 ? -0.55 * popUp : -0.55 + 0.15 * settle) * (1 - flightProgress);
  const ring = age >= 0.25 && age < flightStart
    ? Math.sin(Math.PI * unit((age - 0.25) / (flightStart - 0.25))) : 0;
  const lockFlashProgress = unit((age - arrival) / (end - arrival));
  return {
    keyVisible: !arrived,
    keyAlpha: arrived ? 0 : 1,
    keyScale,
    popOffsetCells,
    flightProgress,
    sparkleAlpha: arrived ? 0 : age >= flightStart ? 1 - 0.2 * flightTime : ring,
    lockFlashAlpha: arrived && age < end ? 1 - smooth(lockFlashProgress) : 0,
    lockFlashProgress,
    arrived,
    complete: age >= end,
  };
};
