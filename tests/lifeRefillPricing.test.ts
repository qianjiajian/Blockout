import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LIFE_REGEN_INTERVAL_MS,
  LIFE_REFILL_COIN_COST,
  LIFE_REFILL_COIN_COST_PER_LIFE,
  getLifeRefillQuote,
  type LifeState,
} from "../src/core/lives";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

const NOW = new Date("2026-09-24T12:00:00.000Z").getTime();
const INTERVAL = LIFE_REGEN_INTERVAL_MS;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const lifeState = (lives: number, nextLifeAtMs = NOW + INTERVAL): LifeState => ({
  lives,
  nextLifeAtMs: lives >= 5 ? 0 : nextLifeAtMs,
  unlimitedLivesUntilMs: 0,
});

/** Calls the real purchase and verified-save path with isolated in-memory storage. */
const refillGame = (state: LifeState, coins = 1000) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.save = game.sanitizeSave({ ...game.sanitizeSave(undefined), coins, lifeState: state });
  game.storageReadAttempts = 0;
  game.storageBaselineReady = true;
  game.lifeRefillOpen = true;
  game.playSound = vi.fn();
  game.scheduleFrame = vi.fn();
  game.scheduleLifeRefreshWatch = vi.fn();
  const storage = {
    value: clone(game.save),
    mode: "commit" as "commit" | "reject" | "unknown-after-write" | "lost-ack",
  };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" }
      : { status: "ok", value: clone(storage.value) }),
  };
  return { game, storage };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => vi.useRealTimers());

describe("life refill quotes", () => {
  it("charges the agreed 100 coins per point, up to 500 from empty", () => {
    expect(LIFE_REFILL_COIN_COST_PER_LIFE).toBe(100);
    expect(LIFE_REFILL_COIN_COST).toBe(500);
  });

  it.each([
    [0, 5, 500], [1, 4, 400], [2, 3, 300], [3, 2, 200], [4, 1, 100],
    [5, 0, 0], [8, 0, 0], [Number.MAX_SAFE_INTEGER, 0, 0],
  ])("quotes balance %s as %s missing points for %s coins", (lives, missingLives, coinCost) => {
    expect(getLifeRefillQuote(lifeState(lives), NOW)).toEqual({
      state: lifeState(lives), missingLives, coinCost,
    });
  });

  it("drops the price exactly when the next natural recovery becomes due", () => {
    const state = lifeState(2, NOW + 1000);
    expect(getLifeRefillQuote(state, NOW + 999).coinCost).toBe(300);
    expect(getLifeRefillQuote(state, NOW + 1000)).toEqual({
      state: lifeState(3, NOW + 1000 + INTERVAL), missingLives: 2, coinCost: 200,
    });
  });

  it("subtracts all earned offline points and keeps the remaining recovery cadence", () => {
    const quote = getLifeRefillQuote(lifeState(0, NOW), NOW + 2 * INTERVAL + 1234);
    expect(quote).toEqual({
      state: lifeState(3, NOW + 3 * INTERVAL), missingLives: 2, coinCost: 200,
    });
    expect(getLifeRefillQuote(lifeState(0, NOW), NOW + 8 * INTERVAL)).toEqual({
      state: lifeState(5), missingLives: 0, coinCost: 0,
    });
  });

  it("prices ordinary missing points during unlimited life without removing its expiry", () => {
    const state = { ...lifeState(1, NOW), unlimitedLivesUntilMs: NOW + 4 * INTERVAL };
    expect(getLifeRefillQuote(state, NOW)).toEqual({
      state: { ...state, lives: 2, nextLifeAtMs: NOW + INTERVAL },
      missingLives: 3,
      coinCost: 300,
    });
  });

  it("does not mutate the input or share its returned state with that input", () => {
    const state = Object.freeze(lifeState(2, NOW));
    const quote = getLifeRefillQuote(state, NOW);
    expect(state).toEqual(lifeState(2, NOW));
    expect(quote.state).not.toBe(state);
    quote.state.lives = 99;
    expect(state.lives).toBe(2);
  });

  it.each([
    [undefined, 5, 0],
    [null, 5, 0],
    [{ lives: NaN }, 5, 0],
    [{ lives: Infinity }, 5, 0],
    [{ lives: -3, nextLifeAtMs: -1 }, 0, 500],
    [{ lives: 2.9, nextLifeAtMs: "invalid" }, 2, 300],
  ])("normalizes persisted input %j before quoting", (value, lives, coinCost) => {
    const quote = getLifeRefillQuote(value, NOW);
    expect(quote.state.lives).toBe(lives);
    expect(quote.coinCost).toBe(coinCost);
    expect(Number.isSafeInteger(quote.coinCost)).toBe(true);
    expect(quote.state.nextLifeAtMs).toBe(lives < 5 ? NOW + INTERVAL : 0);
  });
});

describe("dynamic refill purchase transactions", () => {
  it.each([0, 1, 2, 3, 4])("accepts exactly the quoted cost from %s lives and commits it once", (lives) => {
    const quote = getLifeRefillQuote(lifeState(lives), NOW);
    const { game, storage } = refillGame(lifeState(lives), quote.coinCost);
    const before = clone(game.save);
    game.buyLifeRefill(NOW);
    expect(game.save).toEqual({ ...before, coins: 0, lifeState: lifeState(5) });
    expect(storage.value).toEqual(game.save);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    expect(game.pendingLifeRefill).toBeUndefined();
    game.buyLifeRefill(NOW);
    expect(game.save.coins).toBe(0);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it.each([0, 1, 2, 3, 4])("rejects one coin below the quote from %s lives without changing storage", (lives) => {
    const quote = getLifeRefillQuote(lifeState(lives), NOW);
    const { game, storage } = refillGame(lifeState(lives), quote.coinCost - 1);
    const before = clone(game.save);
    game.buyLifeRefill(NOW);
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(game.pendingLifeRefill).toBeUndefined();
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.lifeRefillFeedback).toBe(game.tr("shop.insufficientCoins", { shortfall: 1 }));
  });

  it.each([5, 8])("does not charge or lower an already full or overflow balance of %s", (lives) => {
    const { game, storage } = refillGame(lifeState(lives));
    const before = clone(game.save);
    game.buyLifeRefill(NOW);
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.pendingLifeRefill).toBeUndefined();
  });

  it("uses the lower click-time price when a point recovered since the popup opened", () => {
    const { game, storage } = refillGame(lifeState(2, NOW + 1000), 200);
    expect(getLifeRefillQuote(game.save.lifeState, NOW).coinCost).toBe(300);
    vi.setSystemTime(NOW + 1000);
    game.buyLifeRefill();
    expect(game.save.coins).toBe(0);
    expect(game.save.lifeState).toEqual(lifeState(5));
    expect(storage.value).toEqual(game.save);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("refuses a purchase if natural recovery reached full at the click boundary", () => {
    const { game, storage } = refillGame(lifeState(4, NOW + 1000));
    const before = clone(game.save);
    vi.setSystemTime(NOW + 1000);
    game.buyLifeRefill();
    expect(game.save.coins).toBe(before.coins);
    expect(game.currentLifeState().lives).toBe(5);
    expect(storage.value).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.pendingLifeRefill).toBeUndefined();
  });

  it("preserves active unlimited life when buying missing ordinary points", () => {
    const unlimitedLivesUntilMs = NOW + INTERVAL;
    const { game } = refillGame({ ...lifeState(3), unlimitedLivesUntilMs }, 200);
    game.buyLifeRefill(NOW);
    expect(game.save.coins).toBe(0);
    expect(game.save.lifeState).toEqual({ ...lifeState(5), unlimitedLivesUntilMs });
  });

  it("releases a reliably rejected quote and prices the next purchase after recovery", () => {
    const { game, storage } = refillGame(lifeState(2, NOW + 1000));
    const before = clone(game.save);
    storage.mode = "reject";
    game.buyLifeRefill(NOW);
    expect(game.pendingLifeRefill).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(game.host.storageSet.mock.calls[0][1].coins).toBe(700);
    storage.mode = "commit";
    vi.setSystemTime(NOW + 1000);
    game.buyLifeRefill();
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
    expect(game.save.coins).toBe(800);
    expect(game.save.lifeState.lives).toBe(5);
  });

  it.each([[2, 100], [4, 0]])("keeps an unknown transaction fixed across %s recovery intervals", (intervals, freshCost) => {
    const initialState = { ...lifeState(1, NOW + 1000), unlimitedLivesUntilMs: NOW + 500 };
    const { game, storage } = refillGame(initialState);
    const before = clone(game.save);
    storage.mode = "unknown-after-write";
    game.buyLifeRefill(NOW);
    const pending = game.pendingLifeRefill;
    const candidate = clone(pending.candidateSave);
    const originalQuote = clone(pending.quote);
    expect(originalQuote).toEqual({ state: initialState, missingLives: 4, coinCost: 400 });
    expect(candidate.coins).toBe(600);
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(candidate);

    vi.setSystemTime(NOW + intervals * INTERVAL + 1000);
    expect(getLifeRefillQuote(game.save.lifeState, Date.now()).coinCost).toBe(freshCost);
    game.refreshLifeState();
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    expect(pending.quote).toEqual(originalQuote);
    expect(pending.candidateSave).toEqual(candidate);

    storage.mode = "commit";
    game.buyLifeRefill();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(game.save).toEqual(candidate);
    expect(storage.value).toEqual(candidate);
    expect(game.save.coins).toBe(600);
    expect(game.currentLifeState()).toEqual(lifeState(5));
    expect(game.pendingLifeRefill).toBeUndefined();
    game.buyLifeRefill();
    expect(game.save.coins).toBe(600);
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
  });

  it("recognizes a landed purchase despite a lost acknowledgement without charging twice", () => {
    const { game, storage } = refillGame(lifeState(4), 150);
    storage.mode = "lost-ack";
    game.buyLifeRefill(NOW);
    expect(game.host.storageRead).toHaveBeenCalledTimes(1);
    expect(game.pendingLifeRefill).toBeUndefined();
    expect(game.save.coins).toBe(50);
    expect(game.save.lifeState).toEqual(lifeState(5));
    expect(storage.value).toEqual(game.save);
    game.buyLifeRefill(NOW);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    expect(game.save.coins).toBe(50);
  });
});
