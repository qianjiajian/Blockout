import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { LIFE_REGEN_INTERVAL_MS } from "../src/core/lives";

const NOW = new Date("2026-10-11T12:00:00.000Z").getTime();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const adGame = (status: "completed" | "cancelled" = "completed") => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  const base = game.sanitizeSave(undefined);
  base.lifeState = { lives: 2, nextLifeAtMs: NOW + LIFE_REGEN_INTERVAL_MS, unlimitedLivesUntilMs: 0 };
  game.save = base;
  game.storageBaselineReady = true;
  game.appVisible = true;
  game.lifeRefillOpen = true;
  game.lifeRefillFeedback = undefined;
  game.pendingLifeRefill = undefined;
  game.pendingLifeRefillAd = undefined;
  game.lifeRefillAdRequestId = undefined;
  game.playSound = vi.fn();
  game.syncMusic = vi.fn();
  game.scheduleFrame = vi.fn();
  game.scheduleLifeRefreshWatch = vi.fn();
  game.vibrate = vi.fn();
  const storage = { value: clone(base), writes: [] as unknown[] };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      storage.value = clone(value);
      storage.writes.push(value);
      return true;
    }),
    storageRead: vi.fn(() => ({ status: "ok", value: clone(storage.value) })),
    isRewardedAdAvailable: vi.fn(() => true),
    showRewardedAd: vi.fn(async (requestId: string) => ({ status, requestId })),
    music: vi.fn(),
  };
  return { game, storage };
};

const settleMicrotasks = async () => {
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
};

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

describe("life refill rewarded video", () => {
  it("persists prepare, receipt and reward, then adds exactly one life", async () => {
    const { game, storage } = adGame();
    game.startLifeRefillAd();
    await settleMicrotasks();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    expect(game.save.lifeState.lives).toBe(3);
    expect(game.save.lifeRefillAd.pending).toBeUndefined();
    expect(game.save.lifeRefillAd.completedRequestIds).toHaveLength(1);
    expect(storage.writes).toHaveLength(3);
    expect(game.pendingLifeRefillAd).toBeUndefined();
  });

  it("does not add a life when the player closes the ad", async () => {
    const { game, storage } = adGame("cancelled");
    game.startLifeRefillAd();
    await settleMicrotasks();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    expect(game.save.lifeState.lives).toBe(2);
    expect(game.save.lifeRefillAd.pending).toBeUndefined();
    expect(game.save.lifeRefillAd.completedRequestIds).toHaveLength(0);
    expect(storage.writes).toHaveLength(2);
  });

  it("does not submit a second ad while the first request is active", async () => {
    const { game } = adGame();
    let resolveAd!: (result: { status: "completed"; requestId: string }) => void;
    game.host.showRewardedAd = vi.fn((requestId: string) => new Promise(resolve => { resolveAd = resolve; }));
    game.startLifeRefillAd();
    await settleMicrotasks();
    game.startLifeRefillAd();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    resolveAd({ status: "completed", requestId: game.lifeRefillAdRequestId });
    await settleMicrotasks();
    expect(game.save.lifeState.lives).toBe(3);
  });
});

