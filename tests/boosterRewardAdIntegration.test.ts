import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

const NOW = new Date("2026-10-11T12:00:00.000Z").getTime();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const adGame = (kind: "time" | "rocket" | "pulse" = "time", status: "completed" | "cancelled" = "completed") => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  const base = game.sanitizeSave(undefined);
  base.boosters = { time: 0, rocket: 0, pulse: 0 };
  game.save = base;
  game.storageBaselineReady = true;
  game.appVisible = true;
  game.screen = "boosterPurchase";
  game.model = { level: { id: 1 } };
  game.boosterPurchase = { kind };
  game.pendingBoosterPurchase = undefined;
  game.pendingBoosterRewardAd = undefined;
  game.boosterRewardAdRequestId = undefined;
  game.playSound = vi.fn();
  game.syncMusic = vi.fn();
  game.scheduleFrame = vi.fn();
  game.vibrate = vi.fn();
  game.closeBoosterPurchase = vi.fn();
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

describe("booster empty-stock rewarded video", () => {
  it("persists prepare, receipt and reward, then grants one matching booster", async () => {
    const { game, storage } = adGame("rocket");
    game.startBoosterRewardAd();
    await settleMicrotasks();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    expect(game.save.boosters).toEqual({ time: 0, rocket: 1, pulse: 0 });
    expect(game.save.boosterRewardAd.pending).toBeUndefined();
    expect(game.save.boosterRewardAd.completedRequestIds).toHaveLength(1);
    expect(storage.writes).toHaveLength(3);
  });

  it("does not grant an item when the player closes the ad", async () => {
    const { game, storage } = adGame("pulse", "cancelled");
    game.startBoosterRewardAd();
    await settleMicrotasks();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    expect(game.save.boosters).toEqual({ time: 0, rocket: 0, pulse: 0 });
    expect(game.save.boosterRewardAd.pending).toBeUndefined();
    expect(storage.writes).toHaveLength(2);
  });

  it("does not submit a second ad while the first request is active", async () => {
    const { game } = adGame();
    let resolveAd!: (result: { status: "completed"; requestId: string }) => void;
    game.host.showRewardedAd = vi.fn((requestId: string) => new Promise(resolve => { resolveAd = resolve; }));
    game.startBoosterRewardAd();
    await settleMicrotasks();
    game.startBoosterRewardAd();
    expect(game.host.showRewardedAd).toHaveBeenCalledOnce();
    resolveAd({ status: "completed", requestId: game.boosterRewardAdRequestId });
    await settleMicrotasks();
    expect(game.save.boosters.time).toBe(1);
  });
});

