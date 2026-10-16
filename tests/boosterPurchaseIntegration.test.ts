import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { SUPPLY_ITEMS, type SupplyKind } from "../src/core/supply";
import type { LevelSpec } from "../src/core/types";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { monotonicGameTime } from "../src/game/playableClockSlices";
import type { GameHost } from "../src/platform/Host";

const NOW = new Date("2026-10-08T12:00:00.000Z").getTime();
const KINDS = ["time", "rocket", "pulse"] as const;
const PRICES = { time: 300, rocket: 400, pulse: 400 };
type Mode = "commit" | "reject" | "unknown-written" | "unknown-unwritten" | "lost-ack";

const fixture = (id: number): LevelSpec => ({
  id, name: "isolated booster purchase", difficulty: "normal", reward: 0,
  mechanismRules: "revised-2026-09-27-v1.5", width: 3, height: 3, timeSeconds: 60,
  gates: [{ id: "red-exit", color: "red", side: "left", offset: 0, size: 1 }],
  blocks: [
    { id: "red", color: "red", x: 0, y: 0, shape: [[0, 0]] },
    { id: "blue", color: "blue", x: 2, y: 2, shape: [[0, 0]], timedBombSeconds: 30 },
  ],
});

/** Real constructor, callbacks, model and verified-save transactions. Only host
 * storage/art/scheduling and canvas drawing are isolated; no player data. */
function purchaseGame(options: { level?: number; highest?: number; coins?: number; stock?: number } = {}) {
  const level = options.level ?? 20, highest = options.highest ?? level;
  const initial = {
    schemaVersion: 1, currentLevel: level, highestLevel: highest,
    coins: options.coins ?? 2000, language: "zh-CN", sound: false, music: false,
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
    boosterUnlockSeen: [...KINDS], boosterUsageSeen: [...KINDS],
    boosters: { time: options.stock ?? 0, rocket: options.stock ?? 0, pulse: options.stock ?? 0 },
    rewardedLevels: Array.from({ length: highest - 1 }, (_, index) => index + 1),
    featureGuideProgress: { version: 1, pending: [], seen: ["leaderboard", "supply", "levels", "dailyChallenge", "league"] },
    collectionIntroShown: true, collectionIntroPending: false,
    lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
  };
  const storage = { value: clone(initial) as any, mode: "commit" as Mode };
  const callbacks: { show?: () => void; hide?: () => void } = {};
  const host = {
    canvas: { setAttribute: vi.fn() }, context: {},
    viewport: () => ({ width: 496, height: 1078, pixelRatio: 1, safeTop: 0, safeBottom: 0 }),
    isVisible: () => true, preferredLocales: () => ["zh-CN"], prefersReducedMotion: () => false,
    onPointer: vi.fn(), onResize: vi.fn(),
    onShow: (callback: () => void) => { callbacks.show = callback; },
    onHide: (callback: () => void) => { callbacks.hide = callback; },
    requestFrame: vi.fn(() => 1), scheduleTimeout: vi.fn(() => 1), cancelTimeout: vi.fn(),
    createImage: vi.fn((_src: string) => new Promise<HTMLImageElement>(() => {})), releaseImage: vi.fn(),
    storageRead: vi.fn(() => storage.mode.startsWith("unknown")
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "commit" || storage.mode === "unknown-written" || storage.mode === "lost-ack") storage.value = clone(value);
      return storage.mode === "commit";
    }),
    music: vi.fn(), musicTransport: () => ({ positionSeconds: 0, durationSeconds: 0, playing: false }),
    sound: vi.fn(), stopSound: vi.fn(), vibrate: vi.fn(),
  };
  const game = new ColorEscapeGame(host as unknown as GameHost) as any;
  game.model = new PuzzleModel(fixture(level), { deferExitCompletion: true });
  game.resetPuzzlePresentation();
  game.save.currentLevel = level;
  game.save.activeRun = { levelId: level, returnLevelId: level, lifeStarted: true,
    daily: false, boosterSpent: { time: 0, rocket: 0, pulse: 0 } };
  game.screen = "playing";
  game.appVisible = true;
  game.artReady = true;
  game.shellArtReady = true;
  game.startupEntryPending = false;
  game.render = vi.fn();
  game.ensureRevisedMechanismArt = vi.fn();
  game.scheduleFrame = vi.fn();
  game.model.startCountdown();
  game.playableClockSlices.reset();
  game.playableClockSlices.sample(monotonicGameTime(), true);
  storage.value = clone(game.save);
  host.storageSet.mockClear();
  return { game, storage, host, callbacks };
}

const open = (game: any, kind: SupplyKind = "time") => {
  game.useBooster(kind);
  expect(game.screen).toBe("boosterPurchase");
  expect(game.boosterPurchase.kind).toBe(kind);
};

const pointFor = (game: any, key: string) => {
  const rect = game.boosterPurchaseTargets().find(([name]: [string]) => name === key)?.[1];
  expect(rect).toBeDefined();
  return { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - NOW);
  vi.spyOn(ColorEscapeGame.prototype as any, "loadArt").mockResolvedValue(undefined);
  vi.spyOn(ColorEscapeGame.prototype as any, "requestJourneyHomeThemeArt").mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("empty-stock purchase entry", () => {
  it.each(KINDS)("opens unlocked empty %s without charging or changing the board", kind => {
    const { game, storage, host } = purchaseGame();
    const before = clone(game.save), board = game.model.snapshot();
    open(game, kind);
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(game.model.snapshot()).toEqual(board);
    expect(host.storageSet).not.toHaveBeenCalled();
    expect(game.boosterTarget).toBeUndefined();
  });

  it.each(KINDS)("keeps %s locked before its teaching level, even when empty", kind => {
    const level = SUPPLY_ITEMS[kind].unlockLevel - 1;
    const { game, host } = purchaseGame({ level });
    const before = clone(game.save);
    game.useBooster(kind);
    expect(game.screen).toBe("playing");
    expect(game.boosterPurchase).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(host.storageSet).not.toHaveBeenCalled();
  });

  it.each(["home", "paused", "win", "failed", "leagueResult"])("does not open from %s", screen => {
    const { game, host } = purchaseGame();
    game.screen = screen;
    game.openBoosterPurchase("time");
    expect(game.screen).toBe(screen);
    expect(game.boosterPurchase).toBeUndefined();
    expect(host.storageSet).not.toHaveBeenCalled();
  });

  it("honors the current teaching level after changing to the purchase screen", () => {
    const { game, storage } = purchaseGame({ level: 7, highest: 6 });
    open(game, "rocket");
    expect(game.boosterUnlocked("rocket")).toBe(true);
    game.buyBoosterBundle();
    expect(game.screen).toBe("playing");
    expect(game.save.boosters.rocket).toBe(1);
    expect(storage.value.coins).toBe(1600);
  });

  it("allows restocking empty time while the existing freeze remains active", () => {
    const { game } = purchaseGame();
    game.model.freezeTime(10);
    open(game, "time");
    game.buyBoosterBundle();
    expect(game.model.snapshot().timeFreezeSeconds).toBe(10);
    expect(game.save.boosters.time).toBe(1);
  });

  it("closing without buying resumes the same board with no account mutation", () => {
    const { game, storage, host } = purchaseGame();
    const before = clone(game.save), board = game.model.snapshot();
    open(game);
    game.closeBoosterPurchase();
    expect(game.screen).toBe("playing");
    expect(game.boosterPurchase).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(game.model.snapshot()).toEqual(board);
    expect(game.lastFrame).toBe(0);
    expect(host.storageSet).not.toHaveBeenCalled();
  });
});

describe("one-item purchase and account isolation", () => {
  it.each(KINDS)("commits one %s at the agreed price, with no automatic use", kind => {
    const { game, storage, host } = purchaseGame();
    const before = clone(game.save), board = game.model.snapshot();
    open(game, kind);
    // Art is deliberately unresolved: the supported fallback remains usable.
    game.buyBoosterBundle();
    const expected = { ...before, coins: before.coins - PRICES[kind], boosters: { ...before.boosters, [kind]: 1 } };
    expect(game.save).toEqual(expected);
    expect(storage.value).toEqual(expected);
    expect(game.model.snapshot()).toEqual(board);
    expect(game.screen).toBe("playing");
    expect(game.boosterTarget).toBeUndefined();
    expect(game.rocketFlight).toBeUndefined();
    expect(game.pendingBoosterPurchase).toBeUndefined();
    expect(game.boosterPurchase).toBeUndefined();
    expect(host.storageSet).toHaveBeenCalledTimes(1);
    game.buyBoosterBundle();
    expect(host.storageSet).toHaveBeenCalledTimes(1);
    expect(game.save).toEqual(expected);
  });

  it.each(KINDS)("cannot buy %s one coin below its exact price", kind => {
    const { game, storage, host } = purchaseGame({ coins: PRICES[kind] - 1 });
    const before = clone(game.save);
    open(game, kind);
    game.buyBoosterBundle();
    expect(game.screen).toBe("boosterPurchase");
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(game.pendingBoosterPurchase).toBeUndefined();
    expect(host.storageSet).not.toHaveBeenCalled();
    game.closeBoosterPurchase();
    expect(game.screen).toBe("playing");
  });

  it("does not add purchases to the Lv7 delayed-consumption journal", () => {
    const { game, storage } = purchaseGame({ level: 7, stock: 2 });
    game.save.activeRun.boosterSpent.rocket = 2;
    storage.value = clone(game.save);
    expect(game.availableRocketStock()).toBe(0);
    open(game, "rocket");
    game.buyBoosterBundle();
    expect(game.save.boosters.rocket).toBe(3);
    expect(game.save.activeRun.boosterSpent.rocket).toBe(2);
    expect(game.availableRocketStock()).toBe(1);
  });
});

describe("verified-save recovery", () => {
  it("definite rejection leaves balances intact and permits close or one new retry", () => {
    const { game, storage, host } = purchaseGame();
    const before = clone(game.save);
    open(game);
    storage.mode = "reject";
    game.buyBoosterBundle();
    expect(game.screen).toBe("boosterPurchase");
    expect(game.pendingBoosterPurchase).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    game.closeBoosterPurchase();
    expect(game.screen).toBe("playing");
    open(game);
    storage.mode = "commit";
    game.buyBoosterBundle();
    expect(game.save.coins).toBe(1700);
    expect(game.save.boosters.time).toBe(1);
    expect(host.storageSet).toHaveBeenCalledTimes(2);
  });

  it("accepts exact read-back after a lost write acknowledgement without charging twice", () => {
    const { game, storage, host } = purchaseGame();
    open(game, "pulse");
    storage.mode = "lost-ack";
    game.buyBoosterBundle();
    expect(game.screen).toBe("playing");
    expect(game.save.coins).toBe(1600);
    expect(game.save.boosters.pulse).toBe(1);
    expect(game.pendingBoosterPurchase).toBeUndefined();
    expect(host.storageSet).toHaveBeenCalledTimes(1);
  });

  it.each(["unknown-written", "unknown-unwritten"] as const)("retries the identical candidate after %s and blocks escape", mode => {
    const { game, storage, host, callbacks } = purchaseGame();
    const before = clone(game.save);
    open(game, "rocket");
    storage.mode = mode;
    game.buyBoosterBundle();
    const pending = game.pendingBoosterPurchase;
    expect(pending).toMatchObject({ kind: "rocket", price: 400, quantity: 1 });
    expect(pending.candidateSave).toBe(host.storageSet.mock.calls.at(-1)![1]);
    const frozenCandidate = clone(pending.candidateSave);
    expect(game.save).toEqual(before);
    game.closeBoosterPurchase();
    game.openBoosterPurchase("pulse");
    game.loadLevel(1, true);
    expect(game.screen).toBe("boosterPurchase");
    expect(game.pendingBoosterPurchase).toBe(pending);
    expect(game.persist()).toBe(false);
    expect(host.storageSet).toHaveBeenCalledTimes(1);
    callbacks.hide!();
    callbacks.show!();
    expect(game.screen).toBe("boosterPurchase");
    expect(game.pendingBoosterPurchase).toBe(pending);
    expect(pending.candidateSave).toEqual(frozenCandidate);
    expect(game.save).toEqual(before);
    storage.mode = "commit";
    game.buyBoosterBundle();
    expect(host.storageSet.mock.calls.at(-1)![1]).toBe(pending.candidateSave);
    expect(host.storageSet).toHaveBeenCalledTimes(2);
    expect(game.save).toEqual(frozenCandidate);
    expect(storage.value).toEqual(frozenCandidate);
    expect(game.save.coins).toBe(1600);
    expect(game.save.boosters.rocket).toBe(1);
    expect(game.pendingBoosterPurchase).toBeUndefined();
    expect(game.screen).toBe("playing");
  });

  it("keeps an unresolved candidate stable across life recovery and daily rollover", () => {
    const { game, storage, callbacks } = purchaseGame();
    game.save.lifeState = { lives: 4, nextLifeAtMs: NOW + 1000, unlimitedLivesUntilMs: 0 };
    storage.value = clone(game.save);
    open(game);
    storage.mode = "unknown-written";
    game.buyBoosterBundle();
    const pending = game.pendingBoosterPurchase, before = clone(game.save), candidate = clone(pending.candidateSave);
    vi.setSystemTime(NOW + 24 * 60 * 60 * 1000);
    callbacks.hide!();
    callbacks.show!();
    game.refreshLifeState();
    game.ensureDailyTaskCycle();
    game.dailyChallengeState();
    expect(game.save).toEqual(before);
    expect(game.pendingBoosterPurchase).toBe(pending);
    expect(pending.candidateSave).toEqual(candidate);
    expect(storage.value).toEqual(candidate);
  });
});

describe("gameplay pause ownership", () => {
  it.each([false, true])("freezes actual clocks across foreground/background and resumes without catch-up (freeze=%s)", frozen => {
    const { game, callbacks } = purchaseGame();
    if (frozen) game.model.freezeTime(10);
    open(game, "rocket");
    const before = game.model.snapshot();
    vi.advanceTimersByTime(5000);
    game.frame(5000);
    callbacks.hide!();
    vi.advanceTimersByTime(20_000);
    game.frame(25_000);
    callbacks.show!();
    game.frame(26_000);
    expect(game.screen).toBe("boosterPurchase");
    expect(game.model.snapshot()).toEqual(before);
    expect(game.musicScene()).toBe("gameplay");
    game.closeBoosterPurchase();
    expect(game.lastFrame).toBe(0);
    game.frame(27_000);
    expect(game.model.snapshot()).toEqual(before);
    vi.advanceTimersByTime(200);
    game.frame(27_200);
    const after = game.model.snapshot();
    if (frozen) {
      expect(after.timeFreezeSeconds).toBeCloseTo(9.8, 6);
      expect(after.remainingSeconds).toBe(before.remainingSeconds);
      expect(after.blocks.find((b: any) => b.id === "blue").timedBombSeconds).toBe(30);
    } else {
      expect(after.remainingSeconds).toBeCloseTo(59.8, 6);
      expect(after.blocks.find((b: any) => b.id === "blue").timedBombSeconds).toBeCloseTo(29.8, 6);
    }
  });

  it("keeps the danger music classification behind the paused purchase screen", () => {
    const { game } = purchaseGame();
    game.model.tick(15);
    // The synthetic bomb limits this board to 30 seconds, so use its existing
    // countdown without waiting until the bomb fails.
    vi.spyOn(game.model, "readStatus").mockReturnValue({ ...game.model.readStatus(), remainingSeconds: 12 });
    open(game);
    expect(game.musicScene()).toBe("danger");
  });
});

describe("deferred purchase artwork", () => {
  it("art failure and retry never spend coins, while the fallback can still purchase", async () => {
    const { game, storage, host } = purchaseGame();
    // Independent supplied slices settle as a batch; the other slices must
    // finish so a rejected panel can release the successful partial load.
    const loaded: HTMLImageElement[] = [];
    host.createImage.mockImplementation(async src => {
      const image = { src } as HTMLImageElement;
      loaded.push(image);
      return image;
    });
    host.createImage.mockRejectedValueOnce(new Error("isolated missing purchase image"));
    const before = clone(game.save);
    open(game, "pulse");
    await vi.waitFor(() => expect(game.boosterPurchaseArtError).toContain("isolated missing purchase image"));
    expect(game.boosterPurchaseArt).toBeUndefined();
    expect(loaded.length).toBeGreaterThan(0);
    for (const image of loaded) expect(host.releaseImage).toHaveBeenCalledWith(image);
    expect(host.releaseImage).toHaveBeenCalledTimes(loaded.length);
    game.requestBoosterPurchaseArt();
    expect(game.boosterPurchaseArtLoading).toBe(true);
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(host.storageSet).not.toHaveBeenCalled();
    game.buyBoosterBundle();
    expect(game.screen).toBe("playing");
    expect(game.save.coins).toBe(before.coins - 400);
    expect(game.save.boosters.pulse).toBe(1);
  });

  it("releases a late image after closing and cannot resurrect the purchase screen", async () => {
    const { game, host } = purchaseGame();
    host.createImage.mockImplementation(async src => ({ src } as HTMLImageElement));
    let resolveImage!: (image: HTMLImageElement) => void;
    host.createImage.mockImplementationOnce(() => new Promise(resolve => { resolveImage = resolve; }));
    open(game);
    game.closeBoosterPurchase();
    const image = { src: "late isolated purchase image" } as HTMLImageElement;
    resolveImage(image);
    await vi.waitFor(() => expect(host.releaseImage).toHaveBeenCalledWith(image));
    expect(game.screen).toBe("playing");
    expect(game.boosterPurchase).toBeUndefined();
    expect(game.boosterPurchaseArt).toBeUndefined();
    expect(host.releaseImage).toHaveBeenCalledWith(image);
    expect(host.releaseImage).toHaveBeenCalledTimes(9);
    expect(host.storageSet).not.toHaveBeenCalled();
  });
});

describe("actual purchase button dispatch", () => {
  it("charges on the released buy target, never on pointer-down", () => {
    const { game, host } = purchaseGame();
    open(game, "pulse");
    const point = pointFor(game, "boosterPurchase.buy");
    game.handleDown(point);
    expect(host.storageSet).not.toHaveBeenCalled();
    expect(game.save.boosters.pulse).toBe(0);
    game.handleUp(point);
    expect(game.screen).toBe("playing");
    expect(game.save.boosters.pulse).toBe(1);
    expect(game.save.coins).toBe(1600);
    expect(host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("dragging outside cancels a purchase and the close target resumes without buying", () => {
    const { game, host } = purchaseGame();
    open(game);
    game.handleDown(pointFor(game, "boosterPurchase.buy"));
    const outside = { id: 1, x: 1, y: 1 };
    game.handleMove(outside);
    game.handleUp(outside);
    expect(game.screen).toBe("boosterPurchase");
    expect(host.storageSet).not.toHaveBeenCalled();
    const close = pointFor(game, "boosterPurchase.close");
    game.handleDown(close);
    game.handleUp(close);
    expect(game.screen).toBe("playing");
    expect(host.storageSet).not.toHaveBeenCalled();
  });

  it("unknown save exposes only transaction retry and the old close location cannot escape", () => {
    const { game, storage, host } = purchaseGame();
    open(game);
    const close = pointFor(game, "boosterPurchase.close");
    storage.mode = "unknown-written";
    const buy = pointFor(game, "boosterPurchase.buy");
    game.handleDown(buy);
    game.handleUp(buy);
    const candidate = game.pendingBoosterPurchase.candidateSave;
    expect(game.boosterPurchaseTargets().map(([name]: [string]) => name)).toEqual(["boosterPurchase.buy"]);
    game.handleDown(close);
    game.handleUp(close);
    expect(game.screen).toBe("boosterPurchase");
    expect(host.storageSet).toHaveBeenCalledTimes(1);
    storage.mode = "commit";
    game.handleDown(buy);
    game.handleUp(buy);
    expect(game.screen).toBe("playing");
    expect(host.storageSet.mock.calls.at(-1)![1]).toBe(candidate);
    expect(game.save.boosters.time).toBe(1);
    expect(game.save.coins).toBe(1700);
  });
});
