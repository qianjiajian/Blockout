export const EARLY_AUTO_ADVANCE_LAST_LEVEL = 4;

export interface DirectLevelTransitionTiming {
  exitDuration: number;
  modelSwitchAt: number;
  enterAt: number;
  duration: number;
  travelScreens: number;
}

export interface DirectLevelTransitionSample {
  phase: "exit" | "gap" | "enter" | "done";
  boardOffsetScreens: number;
  switchReady: boolean;
  finished: boolean;
}

export interface HomeCoinFlightTiming {
  delay: number;
  stagger: number;
  coinDuration: number;
  settleDuration: number;
  coinCount: number;
}

const DIRECT_LEVEL_TRANSITION: DirectLevelTransitionTiming = {
  exitDuration: 0.13,
  modelSwitchAt: 0.31,
  enterAt: 0.45,
  duration: 0.6,
  travelScreens: 1.1,
};

const DIRECT_LEVEL_TRANSITION_REDUCED: DirectLevelTransitionTiming = {
  exitDuration: 0.04,
  modelSwitchAt: 0.08,
  enterAt: 0.1,
  duration: 0.18,
  travelScreens: 1.1,
};

const HOME_COIN_FLIGHT: HomeCoinFlightTiming = {
  delay: 0.13,
  stagger: 0.08,
  coinDuration: 0.93,
  settleDuration: 0.34,
  coinCount: 5,
};

const HOME_COIN_FLIGHT_REDUCED: HomeCoinFlightTiming = {
  delay: 0.04,
  stagger: 0,
  coinDuration: 0.18,
  settleDuration: 0.12,
  coinCount: 1,
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));
const easeOutCubic = (value: number): number => 1 - (1 - clampUnit(value)) ** 3;

export const shouldDirectAdvanceAfterClear = (levelId: number, levelCount: number): boolean => (
  Number.isInteger(levelId)
  && levelId >= 1
  && levelId <= EARLY_AUTO_ADVANCE_LAST_LEVEL
  && levelId < levelCount
);

export const directLevelTransitionTiming = (reducedMotion: boolean): DirectLevelTransitionTiming => (
  reducedMotion ? DIRECT_LEVEL_TRANSITION_REDUCED : DIRECT_LEVEL_TRANSITION
);

export const sampleDirectLevelTransition = (
  age: number,
  reducedMotion: boolean,
): DirectLevelTransitionSample => {
  const timing = directLevelTransitionTiming(reducedMotion);
  const safeAge = Math.max(0, age);
  if (safeAge < timing.exitDuration) {
    return {
      phase: "exit",
      boardOffsetScreens: -timing.travelScreens * clampUnit(safeAge / timing.exitDuration),
      switchReady: false,
      finished: false,
    };
  }
  if (safeAge < timing.modelSwitchAt) {
    return {
      phase: "gap",
      boardOffsetScreens: -timing.travelScreens,
      switchReady: false,
      finished: false,
    };
  }
  if (safeAge < timing.enterAt) {
    return {
      phase: "gap",
      boardOffsetScreens: timing.travelScreens,
      switchReady: true,
      finished: false,
    };
  }
  if (safeAge < timing.duration) {
    const linear = clampUnit((safeAge - timing.enterAt) / (timing.duration - timing.enterAt));
    // The reference entrance is almost linear, with only a slight ease-out as
    // the board reaches centre. Blend a small quadratic lead into linear time.
    const progress = linear + linear * (1 - linear) * 0.18;
    return {
      phase: "enter",
      boardOffsetScreens: timing.travelScreens * (1 - progress),
      switchReady: true,
      finished: false,
    };
  }
  return { phase: "done", boardOffsetScreens: 0, switchReady: true, finished: true };
};

export const homeCoinFlightTiming = (reducedMotion: boolean): HomeCoinFlightTiming => (
  reducedMotion ? HOME_COIN_FLIGHT_REDUCED : HOME_COIN_FLIGHT
);

export const homeCoinFlightDuration = (reducedMotion: boolean): number => {
  const timing = homeCoinFlightTiming(reducedMotion);
  return timing.delay
    + timing.stagger * Math.max(0, timing.coinCount - 1)
    + timing.coinDuration
    + timing.settleDuration;
};

export const homeCoinLocalProgress = (
  age: number,
  coinIndex: number,
  reducedMotion: boolean,
): number => {
  const timing = homeCoinFlightTiming(reducedMotion);
  const localAge = age - timing.delay - Math.max(0, coinIndex) * timing.stagger;
  return clampUnit(localAge / timing.coinDuration);
};

export const homeCoinLandedCount = (age: number, reducedMotion: boolean): number => {
  const timing = homeCoinFlightTiming(reducedMotion);
  let landed = 0;
  for (let index = 0; index < timing.coinCount; index += 1) {
    const landingAt = timing.delay + index * timing.stagger + timing.coinDuration;
    if (age >= landingAt) landed += 1;
  }
  return landed;
};

export const displayedCoinBalance = (
  startCoins: number,
  endCoins: number,
  landedCount: number,
  coinCount: number,
): number => {
  if (coinCount <= 0 || landedCount >= coinCount) return endCoins;
  const progress = clampUnit(landedCount / coinCount);
  return Math.round(startCoins + (endCoins - startCoins) * progress);
};
