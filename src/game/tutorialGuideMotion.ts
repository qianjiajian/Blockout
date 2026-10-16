export interface TutorialGuideMotion {
  progress: number;
  alpha: number;
}

export interface TutorialTapMotion {
  /** Vertical press distance in logical pixels; horizontal position stays fixed. */
  offsetY: number;
  scale: number;
  alpha: number;
}

const CYCLE_SECONDS = 1.6;
const TRAVEL_END = 0.68;
const HOLD_END = 0.76;
const FADE_END = 0.92;
const TAP_CYCLE_SECONDS = 1.08;

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

/**
 * A stationary tap cue for button/block targets. The pointer never travels
 * along a path: it only presses straight down and springs back up.
 */
export const tutorialTapMotion = (elapsedSeconds: number, reducedMotion: boolean): TutorialTapMotion => {
  if (reducedMotion) return { offsetY: 0, scale: 1, alpha: 0.86 };
  const cycle = positiveModulo(elapsedSeconds, TAP_CYCLE_SECONDS) / TAP_CYCLE_SECONDS;
  const press = cycle <= 0.3
    ? smoothstep(cycle / 0.3)
    : cycle <= 0.5
      ? 1
      : cycle <= 0.78
        ? 1 - smoothstep((cycle - 0.5) / 0.28)
        : 0;
  return {
    offsetY: press * 18,
    scale: 1 - press * 0.055,
    alpha: 0.72 + Math.sin(cycle * Math.PI * 2) * 0.12,
  };
};
