export interface TutorialGuideMotion {
  progress: number;
  alpha: number;
}

const CYCLE_SECONDS = 1.6;
const TRAVEL_END = 0.68;
const HOLD_END = 0.76;
const FADE_END = 0.92;

const positiveModulo = (value: number, divisor: number): number => (
  ((value % divisor) + divisor) % divisor
);

const smoothstep = (progress: number): number => {
  const t = Math.min(1, Math.max(0, progress));
  return t * t * (3 - 2 * t);
};

export const tutorialGuideMotion = (elapsedSeconds: number, reducedMotion: boolean): TutorialGuideMotion => {
  if (reducedMotion) return { progress: 0.28, alpha: 0.78 };

  const cycle = positiveModulo(elapsedSeconds, CYCLE_SECONDS) / CYCLE_SECONDS;
  const travel = Math.min(1, cycle / TRAVEL_END);
  const progress = smoothstep(travel);
  if (cycle <= HOLD_END) {
    return {
      progress,
      alpha: 0.56 + Math.sin(travel * Math.PI) * 0.38,
    };
  }
  if (cycle <= FADE_END) {
    const fade = smoothstep((cycle - HOLD_END) / (FADE_END - HOLD_END));
    return { progress: 1, alpha: 0.56 * (1 - fade) };
  }
  return { progress: 1, alpha: 0 };
};
