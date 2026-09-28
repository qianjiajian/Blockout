/** Natural recovery stops here; rewarded lives may exceed this threshold. */
export const MAX_LIVES = 5;
export const LIFE_REGEN_INTERVAL_MS = 30 * 60 * 1000;
export const LIFE_REFILL_COIN_COST_PER_LIFE = 100;
/** Maximum quote, for refilling from zero. Purchases must use getLifeRefillQuote. */
export const LIFE_REFILL_COIN_COST = MAX_LIVES * LIFE_REFILL_COIN_COST_PER_LIFE;

export interface LifeState {
  lives: number;
  nextLifeAtMs: number;
  unlimitedLivesUntilMs: number;
}

export interface LifeAttemptStartResult {
  state: LifeState;
  started: boolean;
  spent: boolean;
}

export interface LifeRefillResult {
  state: LifeState;
  /** True only when the refill itself adds lives after natural recovery. */
  changed: boolean;
}

export interface LifeRefillQuote {
  state: LifeState;
  missingLives: number;
  coinCost: number;
}

export const DEFAULT_LIFE_STATE: Readonly<LifeState> = Object.freeze({
  lives: MAX_LIVES,
  nextLifeAtMs: 0,
  unlimitedLivesUntilMs: 0,
});

const safeNonNegativeInteger = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(numeric)));
};

const safeNow = (nowMs: number): number => safeNonNegativeInteger(nowMs);

const addWithoutOverflow = (left: number, right: number): number => (
  Math.min(Number.MAX_SAFE_INTEGER, left + right)
);

export const createDefaultLifeState = (): LifeState => ({ ...DEFAULT_LIFE_STATE });

/**
 * Normalizes persisted data without consulting a clock. Time-dependent rules,
 * including expiry and offline regeneration, are applied by
 * `reconcileLifeState`.
 */
export const sanitizeLifeState = (value: unknown): LifeState => {
  const candidate = value && typeof value === "object"
    ? value as Partial<Record<keyof LifeState, unknown>>
    : {};
  const lives = safeNonNegativeInteger(candidate.lives, MAX_LIVES);

  return {
    lives,
    nextLifeAtMs: lives >= MAX_LIVES
      ? 0
      : safeNonNegativeInteger(candidate.nextLifeAtMs),
    unlimitedLivesUntilMs: safeNonNegativeInteger(candidate.unlimitedLivesUntilMs),
  };
};

/**
 * Recomputes the state at `nowMs`. A persisted recovery deadline remains the
 * cadence anchor, so reopening after several intervals grants every earned
 * life and advances the next deadline by the same number of whole intervals.
 */
export const reconcileLifeState = (value: unknown, nowMs: number): LifeState => {
  const now = safeNow(nowMs);
  const state = sanitizeLifeState(value);
  const unlimitedLivesUntilMs = state.unlimitedLivesUntilMs > now
    ? state.unlimitedLivesUntilMs
    : 0;

  if (state.lives >= MAX_LIVES) {
    return { lives: state.lives, nextLifeAtMs: 0, unlimitedLivesUntilMs };
  }

  const latestReasonableDeadline = addWithoutOverflow(now, LIFE_REGEN_INTERVAL_MS);
  if (state.nextLifeAtMs <= 0) {
    return {
      lives: state.lives,
      nextLifeAtMs: latestReasonableDeadline,
      unlimitedLivesUntilMs,
    };
  }

  // A normal recovery deadline can be at most one interval ahead. Rebase a
  // corrupt timestamp or clock rollback so it cannot create an excessive wait.
  const nextLifeAtMs = Math.min(state.nextLifeAtMs, latestReasonableDeadline);
  if (nextLifeAtMs > now) {
    return { lives: state.lives, nextLifeAtMs, unlimitedLivesUntilMs };
  }

  const earnedLives = Math.floor((now - nextLifeAtMs) / LIFE_REGEN_INTERVAL_MS) + 1;
  const lives = Math.min(MAX_LIVES, state.lives + earnedLives);
  if (lives >= MAX_LIVES) {
    return { lives: MAX_LIVES, nextLifeAtMs: 0, unlimitedLivesUntilMs };
  }

  return {
    lives,
    nextLifeAtMs: addWithoutOverflow(
      nextLifeAtMs,
      earnedLives * LIFE_REGEN_INTERVAL_MS,
    ),
    unlimitedLivesUntilMs,
  };
};

export const hasUnlimitedLives = (value: unknown, nowMs: number): boolean => {
  const now = safeNow(nowMs);
  return sanitizeLifeState(value).unlimitedLivesUntilMs > now;
};

export const hasPlayableLife = (value: unknown, nowMs: number): boolean => {
  const state = reconcileLifeState(value, nowMs);
  return state.lives > 0 || state.unlimitedLivesUntilMs > safeNow(nowMs);
};

/**
 * Starts an attempt at the first valid play action. Persist `started` alongside
 * the returned state so further actions (including after unlimited expires)
 * cannot charge the same attempt again.
 */
export const startLifeAttempt = (
  value: unknown,
  alreadyStarted: boolean,
  nowMs: number,
): LifeAttemptStartResult => {
  const now = safeNow(nowMs);
  const state = reconcileLifeState(value, now);
  if (alreadyStarted) return { state, started: true, spent: false };
  if (state.unlimitedLivesUntilMs > now) return { state, started: true, spent: false };
  if (state.lives <= 0) return { state, started: false, spent: false };

  const lives = state.lives - 1;
  return {
    state: {
      ...state,
      lives,
      nextLifeAtMs: lives >= MAX_LIVES
        ? 0
        : state.lives >= MAX_LIVES
          ? addWithoutOverflow(now, LIFE_REGEN_INTERVAL_MS)
          : state.nextLifeAtMs,
    },
    started: true,
    spent: true,
  };
};

/** @deprecated Attempts are charged on start; failure only reconciles recovery. */
export const spendLifeOnFailure = (value: unknown, nowMs: number): LifeState => (
  reconcileLifeState(value, nowMs)
);

export const grantLives = (value: unknown, amount: number, nowMs: number): LifeState => {
  const state = reconcileLifeState(value, nowMs);
  const granted = safeNonNegativeInteger(amount);
  if (granted <= 0) return state;

  const lives = addWithoutOverflow(state.lives, granted);
  return {
    ...state,
    lives,
    nextLifeAtMs: lives >= MAX_LIVES ? 0 : state.nextLifeAtMs,
  };
};

/**
 * Applies one successful attempt's reward. Eligibility is checked at settlement,
 * independently of whether its start spent a life. The settlement transaction
 * must call this exactly once per completed attempt.
 */
export const completeLifeAttempt = (value: unknown, nowMs: number): LifeState => {
  const now = safeNow(nowMs);
  const state = reconcileLifeState(value, now);
  return state.unlimitedLivesUntilMs > now ? state : grantLives(state, 1, now);
};

/** Quote only the lives still missing after natural recovery at this instant. */
export const getLifeRefillQuote = (value: unknown, nowMs: number): LifeRefillQuote => {
  const state = reconcileLifeState(value, nowMs);
  const missingLives = Math.max(0, MAX_LIVES - state.lives);
  return { state, missingLives, coinCost: missingLives * LIFE_REFILL_COIN_COST_PER_LIFE };
};

/** Fills ordinary lives to five; the caller owns the verified coin transaction. */
export const refillLife = (value: unknown, nowMs: number): LifeRefillResult => {
  const state = reconcileLifeState(value, nowMs);
  if (state.lives >= MAX_LIVES) return { state, changed: false };
  return {
    state: { ...state, lives: MAX_LIVES, nextLifeAtMs: 0 },
    changed: true,
  };
};

/** Adds duration after the later of `nowMs` and the existing expiry. */
export const grantUnlimitedLives = (
  value: unknown,
  durationMs: number,
  nowMs: number,
): LifeState => {
  const now = safeNow(nowMs);
  const state = reconcileLifeState(value, now);
  const duration = safeNonNegativeInteger(durationMs);
  if (duration <= 0) return state;

  return {
    ...state,
    unlimitedLivesUntilMs: addWithoutOverflow(
      Math.max(now, state.unlimitedLivesUntilMs),
      duration,
    ),
  };
};

export const getUnlimitedLivesRemainingMs = (value: unknown, nowMs: number): number => {
  const now = safeNow(nowMs);
  const state = reconcileLifeState(value, now);
  return Math.max(0, state.unlimitedLivesUntilMs - now);
};

export const getNextLifeRecoveryRemainingMs = (value: unknown, nowMs: number): number => {
  const now = safeNow(nowMs);
  const state = reconcileLifeState(value, now);
  if (state.lives >= MAX_LIVES || state.nextLifeAtMs <= 0) return 0;
  return Math.max(0, state.nextLifeAtMs - now);
};

/** Formats a countdown using ceiling seconds so positive sub-seconds show. */
export const formatLifeCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.ceil(safeNonNegativeInteger(remainingMs) / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const minuteText = String(minutes).padStart(2, "0");
  const secondText = String(seconds).padStart(2, "0");
  return hours > 0
    ? `${hours}:${minuteText}:${secondText}`
    : `${String(totalMinutes).padStart(2, "0")}:${secondText}`;
};

export const formatUnlimitedLives = (value: unknown, nowMs: number): string => (
  formatLifeCountdown(getUnlimitedLivesRemainingMs(value, nowMs))
);

export const formatNextLifeRecovery = (value: unknown, nowMs: number): string => (
  formatLifeCountdown(getNextLifeRecoveryRemainingMs(value, nowMs))
);
