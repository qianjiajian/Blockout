import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { normalizeDailyChallengeRewardAd } from "../src/core/dailyChallengeRewardAd";

const NOW = Date.parse("2026-10-11T12:00:00.000Z");
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const adGame = (status: "completed" | "cancelled" = "completed") => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  const base = game.sanitizeSave(undefined);
  base.dailyChallenge.attemptsRemaining = 0;
  base.dailyChallenge.completed = { 1: false, 2: false, 3: false };
  base.dailyChallengeRewardAd = normalizeDailyChallengeRewardAd(undefined, base.dailyChallenge.dayKey);
  game.save = base;
  game.storageBaselineReady = true;
  game.appVisible = true;
  game.artReady = true;
  game.screen = "dailyChallenge";
  game.pendingDailyChallengeRewardAd = undefined;
  game.dailyChallengeRewardAdRequestId = undefined;
  game.pendingLifeRefillAd = undefined;
  game.lifeRefillAdRequestId = undefined;
  game.pendingBoosterRewardAd = undefined;
  game.boosterRewardAdRequestId = undefined;
  game.playSound = vi.fn();
  game.syncMusic = vi.fn();
  game.scheduleFrame = vi.fn();
  game.vibrate = vi.fn();
  const storage = { value: clone(base), writes: [] as unknown[] };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      storage.value = clone(value); storage.writes.push(value); return true;
    }),
    storageRead: vi.fn(() => ({ status: "ok", value: clone(storage.value) })),
    isRewardedAdAvailable: vi.fn(() => true),
    showRewardedAd: vi.fn(async (requestId: string) => ({ status, requestId })),
    music: vi.fn(),
  };
  return { game, storage };
};

const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

describe("daily challenge exhausted-attempt rewarded video", () => {
  it("persists the receipt and grants one bonus attempt", async () => {
    const { game, storage } = adGame();
    game.startDailyChallengeRewardAd();
    await settle();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    expect(game.save.dailyChallenge.attemptsRemaining).toBe(0);
    expect(game.save.dailyChallengeRewardAd.bonusAttempts).toBe(1);
    expect(game.save.dailyChallengeRewardAd.pending).toBeUndefined();
    expect(game.save.dailyChallengeRewardAd.completedRequestIds).toHaveLength(1);
    expect(storage.writes).toHaveLength(3);
  });

  it("does not add a bonus attempt when the video is cancelled", async () => {
    const { game, storage } = adGame("cancelled");
    game.startDailyChallengeRewardAd();
    await settle();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    expect(game.save.dailyChallengeRewardAd.bonusAttempts).toBe(0);
    expect(game.save.dailyChallengeRewardAd.completedRequestIds).toHaveLength(0);
    expect(storage.writes).toHaveLength(2);
  });

  it("does not submit a second ad while the first request is active", async () => {
    const { game } = adGame();
    let resolveAd!: (result: { status: "completed"; requestId: string }) => void;
    game.host.showRewardedAd = vi.fn((requestId: string) => new Promise(resolve => { resolveAd = resolve; }));
    game.startDailyChallengeRewardAd();
    await settle();
    game.startDailyChallengeRewardAd();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    resolveAd({ status: "completed", requestId: game.dailyChallengeRewardAdRequestId });
    await settle();
    expect(game.save.dailyChallengeRewardAd.bonusAttempts).toBe(1);
  });

});
