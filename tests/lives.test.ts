import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIFE_STATE,
  LIFE_REGEN_INTERVAL_MS,
  LIFE_REFILL_COIN_COST,
  LIFE_REFILL_COIN_COST_PER_LIFE,
  MAX_LIVES,
  completeLifeAttempt,
  createDefaultLifeState,
  formatLifeCountdown,
  formatNextLifeRecovery,
  formatUnlimitedLives,
  getNextLifeRecoveryRemainingMs,
  getLifeRefillQuote,
  getUnlimitedLivesRemainingMs,
  grantLives,
  grantUnlimitedLives,
  hasPlayableLife,
  hasUnlimitedLives,
  reconcileLifeState,
  refillLife,
  sanitizeLifeState,
  spendLifeOnFailure,
  startLifeAttempt,
  type LifeState,
} from "../src/core/lives";

const INTERVAL = LIFE_REGEN_INTERVAL_MS;
const START = 1_800_000_000_000;

describe("lives model", () => {
  it("starts at the five-life recovery threshold with no recovery or unlimited timer", () => {
    expect(MAX_LIVES).toBe(5);
    expect(INTERVAL).toBe(30 * 60 * 1000);
    expect(DEFAULT_LIFE_STATE).toEqual({
      lives: 5,
      nextLifeAtMs: 0,
      unlimitedLivesUntilMs: 0,
    });
    expect(createDefaultLifeState()).toEqual(DEFAULT_LIFE_STATE);
    expect(createDefaultLifeState()).not.toBe(DEFAULT_LIFE_STATE);
  });

  it("sanitizes malformed save data without discarding rewarded lives above five", () => {
    expect(sanitizeLifeState(null)).toEqual(DEFAULT_LIFE_STATE);
    expect(sanitizeLifeState({
      lives: -8.4,
      nextLifeAtMs: -200,
      unlimitedLivesUntilMs: Number.NaN,
    })).toEqual({ lives: 0, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
    expect(sanitizeLifeState({
      lives: 99,
      nextLifeAtMs: START,
      unlimitedLivesUntilMs: Number.POSITIVE_INFINITY,
    })).toEqual({ lives: 99, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
    expect(sanitizeLifeState({
      lives: "3.9",
      nextLifeAtMs: `${START + INTERVAL}`,
      unlimitedLivesUntilMs: `${START + 2 * INTERVAL}`,
    })).toEqual({
      lives: 3,
      nextLifeAtMs: START + INTERVAL,
      unlimitedLivesUntilMs: START + 2 * INTERVAL,
    });
  });

  it("spends one life from full and starts the first recovery interval", () => {
    const initial = createDefaultLifeState();
    const spent = startLifeAttempt(initial, false, START);
    expect(spent).toEqual({
      state: {
        lives: 4,
        nextLifeAtMs: START + INTERVAL,
        unlimitedLivesUntilMs: 0,
      },
      started: true,
      spent: true,
    });
    expect(initial).toEqual(DEFAULT_LIFE_STATE);
  });

  it("keeps the existing cadence when spending partial lives and never goes below zero", () => {
    const partial: LifeState = {
      lives: 2,
      nextLifeAtMs: START + INTERVAL / 2,
      unlimitedLivesUntilMs: 0,
    };
    expect(startLifeAttempt(partial, false, START)).toEqual({
      state: { ...partial, lives: 1 }, started: true, spent: true,
    });

    const empty = { ...partial, lives: 0 };
    expect(startLifeAttempt(empty, false, START)).toEqual({
      state: empty, started: false, spent: false,
    });
    expect(hasPlayableLife(empty, START)).toBe(false);
  });

  it("recovers at the exact deadline and clears the timer on reaching full", () => {
    expect(reconcileLifeState({
      lives: 4,
      nextLifeAtMs: START + INTERVAL,
      unlimitedLivesUntilMs: 0,
    }, START + INTERVAL)).toEqual(DEFAULT_LIFE_STATE);
  });

  it("recovers multiple offline intervals while preserving the cadence anchor", () => {
    const saved: LifeState = {
      lives: 1,
      nextLifeAtMs: START + INTERVAL,
      unlimitedLivesUntilMs: 0,
    };
    expect(reconcileLifeState(saved, START + 2 * INTERVAL + 123)).toEqual({
      lives: 3,
      nextLifeAtMs: START + 3 * INTERVAL,
      unlimitedLivesUntilMs: 0,
    });
    expect(reconcileLifeState(saved, START + 20 * INTERVAL)).toEqual(DEFAULT_LIFE_STATE);
  });

  it("remains reproducible across serialized restarts", () => {
    const firstSave: LifeState = {
      lives: 0,
      nextLifeAtMs: START + INTERVAL,
      unlimitedLivesUntilMs: 0,
    };
    const afterFirstRestart = reconcileLifeState(firstSave, START + 2 * INTERVAL + 10);
    expect(afterFirstRestart).toEqual({
      lives: 2,
      nextLifeAtMs: START + 3 * INTERVAL,
      unlimitedLivesUntilMs: 0,
    });

    const roundTripped = JSON.parse(JSON.stringify(afterFirstRestart)) as unknown;
    expect(reconcileLifeState(roundTripped, START + 4 * INTERVAL)).toEqual({
      lives: 4,
      nextLifeAtMs: START + 5 * INTERVAL,
      unlimitedLivesUntilMs: 0,
    });
  });

  it("starts missing timers from now and bounds an anomalously distant future deadline", () => {
    expect(reconcileLifeState({ lives: 0 }, START)).toEqual({
      lives: 0,
      nextLifeAtMs: START + INTERVAL,
      unlimitedLivesUntilMs: 0,
    });
    expect(reconcileLifeState({
      lives: 2,
      nextLifeAtMs: START + 200 * INTERVAL,
      unlimitedLivesUntilMs: -1,
    }, START)).toEqual({
      lives: 2,
      nextLifeAtMs: START + INTERVAL,
      unlimitedLivesUntilMs: 0,
    });
  });

  it("does not spend during unlimited lives and resumes ordinary spending at expiry", () => {
    const active: LifeState = {
      lives: 2,
      nextLifeAtMs: START + INTERVAL,
      unlimitedLivesUntilMs: START + 2 * INTERVAL,
    };
    expect(hasUnlimitedLives(active, START)).toBe(true);
    expect(hasPlayableLife({ ...active, lives: 0 }, START)).toBe(true);
    expect(startLifeAttempt(active, false, START)).toEqual({
      state: active, started: true, spent: false,
    });

    const atExpiry = START + 2 * INTERVAL;
    expect(startLifeAttempt(active, false, atExpiry)).toEqual({
      state: {
        lives: 3,
        nextLifeAtMs: START + 3 * INTERVAL,
        unlimitedLivesUntilMs: 0,
      },
      started: true,
      spent: true,
    });
    expect(hasUnlimitedLives(active, atExpiry)).toBe(false);
  });

  it("allows rewards above five and clears recovery once five is reached", () => {
    const state: LifeState = {
      lives: 1,
      nextLifeAtMs: START + INTERVAL,
      unlimitedLivesUntilMs: 0,
    };
    expect(grantLives(state, 2, START)).toEqual({ ...state, lives: 3 });
    expect(grantLives(state, 99, START)).toEqual({ ...DEFAULT_LIFE_STATE, lives: 100 });
    expect(grantLives(state, -10, START)).toEqual(state);
  });

  it("retains extra lives across serialization and never regenerates above five", () => {
    const rewarded = grantLives(DEFAULT_LIFE_STATE, 3, START);
    const roundTripped: unknown = JSON.parse(JSON.stringify(rewarded));
    expect(reconcileLifeState(roundTripped, START + 100 * INTERVAL)).toEqual({
      lives: 8, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0,
    });
    expect(getNextLifeRecoveryRemainingMs(roundTripped, START)).toBe(0);
  });

  it("waits until spending below five before starting a fresh recovery interval", () => {
    const extra = { ...DEFAULT_LIFE_STATE, lives: 6 };
    const toFive = startLifeAttempt(extra, false, START);
    expect(toFive.state).toEqual(DEFAULT_LIFE_STATE);
    const toFour = startLifeAttempt(toFive.state, false, START + INTERVAL);
    expect(toFour.state).toEqual({
      lives: 4, nextLifeAtMs: START + 2 * INTERVAL, unlimitedLivesUntilMs: 0,
    });
  });

  it("does not charge the same persisted attempt twice after the last life is spent", () => {
    const first = startLifeAttempt({
      lives: 1, nextLifeAtMs: START + INTERVAL, unlimitedLivesUntilMs: 0,
    }, false, START);
    expect(first).toEqual({
      state: { lives: 0, nextLifeAtMs: START + INTERVAL, unlimitedLivesUntilMs: 0 },
      started: true,
      spent: true,
    });
    const restored = JSON.parse(JSON.stringify(first)) as typeof first;
    expect(startLifeAttempt(restored.state, restored.started, START + 1_000)).toEqual({
      state: first.state, started: true, spent: false,
    });
    expect(startLifeAttempt(restored.state, false, START + 1_000).started).toBe(false);
  });

  it("does not retroactively charge an unlimited attempt when its protection expires", () => {
    const state: LifeState = {
      lives: 2, nextLifeAtMs: START + INTERVAL, unlimitedLivesUntilMs: START + 1_000,
    };
    const first = startLifeAttempt(state, false, START);
    expect(first.spent).toBe(false);
    const atExpiry = startLifeAttempt(first.state, first.started, START + 1_000);
    expect(atExpiry).toEqual({
      state: { ...state, unlimitedLivesUntilMs: 0 }, started: true, spent: false,
    });
    expect(startLifeAttempt(atExpiry.state, false, START + 1_000).state.lives).toBe(1);
  });

  it("uses a life earned exactly at its recovery deadline to start a new attempt", () => {
    expect(startLifeAttempt({
      lives: 0, nextLifeAtMs: START + INTERVAL, unlimitedLivesUntilMs: 0,
    }, false, START + INTERVAL)).toEqual({
      state: {
        lives: 0, nextLifeAtMs: START + 2 * INTERVAL, unlimitedLivesUntilMs: 0,
      },
      started: true,
      spent: true,
    });
  });

  it("keeps the failure compatibility helper free of any second charge", () => {
    expect(spendLifeOnFailure(DEFAULT_LIFE_STATE, START)).toEqual(DEFAULT_LIFE_STATE);
    const started = startLifeAttempt(DEFAULT_LIFE_STATE, false, START);
    expect(spendLifeOnFailure(started.state, START + 1_000)).toEqual(started.state);
    expect(spendLifeOnFailure(started.state, START + INTERVAL)).toEqual(DEFAULT_LIFE_STATE);
  });

  it("awards one life on a normal win and clears recovery only when reaching five", () => {
    const partial: LifeState = {
      lives: 3, nextLifeAtMs: START + INTERVAL, unlimitedLivesUntilMs: 0,
    };
    expect(completeLifeAttempt(partial, START)).toEqual({ ...partial, lives: 4 });
    const started = startLifeAttempt(DEFAULT_LIFE_STATE, false, START);
    expect(completeLifeAttempt(started.state, START + 1_000)).toEqual(DEFAULT_LIFE_STATE);
    expect(completeLifeAttempt(DEFAULT_LIFE_STATE, START)).toEqual({
      ...DEFAULT_LIFE_STATE, lives: 6,
    });
    expect(partial.lives).toBe(3);
  });

  it("settles elapsed recovery before adding the uncapped win reward", () => {
    expect(completeLifeAttempt({
      lives: 4, nextLifeAtMs: START + INTERVAL, unlimitedLivesUntilMs: 0,
    }, START + INTERVAL)).toEqual({ ...DEFAULT_LIFE_STATE, lives: 6 });
  });

  it("does not grant a win life while unlimited protection is active at settlement", () => {
    const ordinaryStart = startLifeAttempt(DEFAULT_LIFE_STATE, false, START);
    expect(ordinaryStart.spent).toBe(true);
    const gainedUnlimited = grantUnlimitedLives(ordinaryStart.state, 2 * INTERVAL, START);
    expect(completeLifeAttempt(gainedUnlimited, START + 1_000)).toEqual(gainedUnlimited);
    expect(completeLifeAttempt(gainedUnlimited, START + INTERVAL)).toEqual({
      ...DEFAULT_LIFE_STATE, unlimitedLivesUntilMs: START + 2 * INTERVAL,
    });
  });

  it("grants a win life at unlimited expiry even if that attempt started for free", () => {
    const protectedState = grantUnlimitedLives(DEFAULT_LIFE_STATE, 1_000, START);
    const freeStart = startLifeAttempt(protectedState, false, START);
    expect(freeStart.spent).toBe(false);
    expect(completeLifeAttempt(freeStart.state, START + 999)).toEqual(protectedState);
    expect(completeLifeAttempt(freeStart.state, START + 1_000)).toEqual({
      ...DEFAULT_LIFE_STATE, lives: 6,
    });
  });

  it("quotes 100 coins for each missing life, up to a 500-coin refill", () => {
    expect(LIFE_REFILL_COIN_COST).toBe(500);
    expect(LIFE_REFILL_COIN_COST_PER_LIFE).toBe(100);
    for (let lives = 0; lives < MAX_LIVES; lives += 1) {
      const partial: LifeState = {
        lives, nextLifeAtMs: START + INTERVAL, unlimitedLivesUntilMs: 0,
      };
      expect(getLifeRefillQuote(partial, START).coinCost).toBe((MAX_LIVES - lives) * 100);
      expect(refillLife(partial, START)).toEqual({
        state: DEFAULT_LIFE_STATE, changed: true,
      });
      expect(partial.lives).toBe(lives);
    }
  });

  it("does not refill or lower a balance already at or above five", () => {
    for (const lives of [5, 6, 99]) {
      const full = { ...DEFAULT_LIFE_STATE, lives };
      expect(refillLife(full, START)).toEqual({ state: full, changed: false });
    }
    const first = refillLife({ lives: 0 }, START);
    expect(refillLife(first.state, START)).toEqual({ state: first.state, changed: false });
  });

  it("reconciles earned recovery before deciding whether a refill adds lives", () => {
    const due: LifeState = {
      lives: 4, nextLifeAtMs: START + INTERVAL, unlimitedLivesUntilMs: 0,
    };
    expect(refillLife(due, START + INTERVAL)).toEqual({
      state: DEFAULT_LIFE_STATE, changed: false,
    });
    expect(refillLife({ ...due, lives: 2 }, START + INTERVAL)).toEqual({
      state: DEFAULT_LIFE_STATE, changed: true,
    });
  });

  it("keeps an existing unlimited expiry unchanged when refilling ordinary lives", () => {
    const partial: LifeState = {
      lives: 1, nextLifeAtMs: START + INTERVAL, unlimitedLivesUntilMs: START + 2 * INTERVAL,
    };
    expect(refillLife(partial, START)).toEqual({
      state: { ...partial, lives: 5, nextLifeAtMs: 0 }, changed: true,
    });
  });

  it("bounds malformed large rewards at safe integer precision without a gameplay cap", () => {
    const largest = { ...DEFAULT_LIFE_STATE, lives: Number.MAX_SAFE_INTEGER };
    expect(grantLives(largest, Number.MAX_SAFE_INTEGER, START)).toEqual(largest);
    expect(grantLives(DEFAULT_LIFE_STATE, Number.POSITIVE_INFINITY, START)).toEqual(DEFAULT_LIFE_STATE);
    expect(grantLives(DEFAULT_LIFE_STATE, 2.9, START).lives).toBe(7);
  });

  it("does not refill on an unlimited grant and continues recovery while it is active", () => {
    const partial: LifeState = {
      lives: 1, nextLifeAtMs: START + INTERVAL / 2, unlimitedLivesUntilMs: 0,
    };
    const unlimited = grantUnlimitedLives(partial, 3 * INTERVAL, START);
    expect(unlimited).toEqual({ ...partial, unlimitedLivesUntilMs: START + 3 * INTERVAL });
    expect(reconcileLifeState(unlimited, START + 2 * INTERVAL)).toEqual({
      lives: 3,
      nextLifeAtMs: START + 2.5 * INTERVAL,
      unlimitedLivesUntilMs: START + 3 * INTERVAL,
    });
    const empty = startLifeAttempt({ ...unlimited, lives: 0 }, false, START);
    expect(empty).toEqual({
      state: { ...unlimited, lives: 0 }, started: true, spent: false,
    });
  });

  it("stacks unlimited durations after the current expiry and restarts after expiry", () => {
    const first = grantUnlimitedLives(DEFAULT_LIFE_STATE, INTERVAL, START);
    expect(first.unlimitedLivesUntilMs).toBe(START + INTERVAL);
    const stacked = grantUnlimitedLives(first, 2 * INTERVAL, START + 1_000);
    expect(stacked.unlimitedLivesUntilMs).toBe(START + 3 * INTERVAL);

    const afterExpiry = grantUnlimitedLives(stacked, INTERVAL, START + 4 * INTERVAL);
    expect(afterExpiry.unlimitedLivesUntilMs).toBe(START + 5 * INTERVAL);
    expect(grantUnlimitedLives(afterExpiry, -1, START + 4 * INTERVAL)).toEqual(afterExpiry);
  });

  it("reports and formats unlimited and next-recovery countdowns at boundaries", () => {
    const state: LifeState = {
      lives: 1,
      nextLifeAtMs: START + INTERVAL,
      unlimitedLivesUntilMs: START + 60 * 60 * 1000,
    };
    expect(getNextLifeRecoveryRemainingMs(state, START)).toBe(INTERVAL);
    expect(getUnlimitedLivesRemainingMs(state, START)).toBe(60 * 60 * 1000);
    expect(formatNextLifeRecovery(state, START)).toBe("30:00");
    expect(formatUnlimitedLives(state, START)).toBe("1:00:00");
    expect(formatLifeCountdown(1)).toBe("00:01");
    expect(formatLifeCountdown(-1)).toBe("00:00");
    expect(formatUnlimitedLives(state, START + 60 * 60 * 1000)).toBe("00:00");
  });
});
