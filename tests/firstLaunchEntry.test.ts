import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import type { GameHost, StorageReadResult } from "../src/platform/Host";

const NOW = new Date("2026-10-08T06:00:00.000Z").getTime();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Actual constructor, model, run journal and persistence; all storage stays in memory. */
const startupGame = (
  initial: StorageReadResult<unknown> = { status: "missing" },
  visible = true,
  setMode: "commit" | "unknown-after-write" = "commit",
  audioPreparation?: GameHost["prepareAudio"],
) => {
  const storage = {
    read: clone(initial),
    setMode,
    lastWritten: undefined as unknown,
  };
  const callbacks: { show?: () => void; hide?: () => void } = {};
  const host = {
    canvas: { setAttribute: vi.fn() },
    context: {},
    viewport: () => ({ width: 496, height: 1078, pixelRatio: 1, safeTop: 0, safeBottom: 0 }),
    isVisible: () => visible,
    preferredLocales: () => ["zh-CN"],
    prefersReducedMotion: () => false,
    onPointer: vi.fn(),
    onResize: vi.fn(),
    onShow: (callback: () => void) => { callbacks.show = callback; },
    onHide: (callback: () => void) => { callbacks.hide = callback; },
    requestFrame: vi.fn(() => 1),
    scheduleTimeout: vi.fn(() => 1),
    cancelTimeout: vi.fn(),
    createImage: vi.fn(() => new Promise<HTMLImageElement>(() => {})),
    storageRead: vi.fn(() => clone(storage.read)),
    storageSet: vi.fn((_key: string, value: unknown) => {
      storage.lastWritten = clone(value);
      storage.read = storage.setMode === "commit"
        ? { status: "ok", value: clone(value) }
        : { status: "unavailable" };
      return storage.setMode === "commit";
    }),
    music: vi.fn(),
    prepareAudio: audioPreparation,
    musicTransport: () => ({ positionSeconds: 0, durationSeconds: 0, playing: false }),
    sound: vi.fn(),
    stopSound: vi.fn(),
    vibrate: vi.fn(),
  };
  const game = new ColorEscapeGame(host as unknown as GameHost) as any;
  return { game, host, storage, callbacks };
};

const oldSave = (level: number) => ({
  schemaVersion: 1,
  currentLevel: level,
  highestLevel: level,
  rewardedLevels: level > 1 ? Array.from({ length: level - 1 }, (_, i) => i + 1) : [],
  featureSeen: [],
  coins: 321,
  language: "zh-CN",
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  // Preserve real startup/persistence; tests explicitly control art readiness.
  vi.spyOn(ColorEscapeGame.prototype as any, "loadArt").mockResolvedValue(undefined);
  vi.spyOn(ColorEscapeGame.prototype as any, "requestJourneyHomeThemeArt").mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("first-entry audio preparation", () => {
  it("warms the actual challenge during artwork loading and enters only after audio is ready", async () => {
    let ready!: () => void;
    const preparation = vi.fn(() => new Promise<void>(resolve => { ready = resolve; }));
    const { game, host } = startupGame({ status: "missing" }, true, "commit", preparation);
    const before = clone(game.save);
    expect(preparation).toHaveBeenCalledExactlyOnceWith("gameplay", { music: true, sound: true });
    expect(host.music).toHaveBeenLastCalledWith("gameplay", true);
    expect(host.music.mock.calls.some(([scene]) => scene === "menu")).toBe(false);
    game.artReady = true;
    expect(game.tryBeginStartupEntry()).toBe(false);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.save).toEqual(before);
    ready(); await game.startupAudioPreparation;
    expect(game.tryBeginStartupEntry()).toBe(true);
    expect(game.screen).toBe("playing");
    expect(game.model.snapshot().started).toBe(false);
    expect(game.save.lifeState).toEqual(before.lifeState);
    expect(host.sound).not.toHaveBeenCalled();
  });

  it("prepares music independently when effects are disabled", async () => {
    const prepare = vi.fn(async () => undefined);
    const { game } = startupGame({ status: "ok", value: { ...oldSave(1), music: true, sound: false } }, true, "commit", prepare);
    expect(prepare).toHaveBeenCalledExactlyOnceWith("gameplay", { music: true, sound: false });
    await game.startupAudioPreparation;
    game.artReady = true; expect(game.tryBeginStartupEntry()).toBe(true);
  });

  it("does no work or waiting when both sound settings are off", () => {
    const prepare = vi.fn(async () => undefined);
    const { game } = startupGame({ status: "ok", value: { ...oldSave(1), music: false, sound: false } }, true, "commit", prepare);
    expect(prepare).not.toHaveBeenCalled();
    game.artReady = true; expect(game.tryBeginStartupEntry()).toBe(true);
  });

  it.each(["reject", "throw", "timeout"] as const)("allows entry after audio %s without waiting forever", async mode => {
    const prepare = vi.fn(() => {
      if (mode === "throw") throw Error("audio unavailable");
      return mode === "reject" ? Promise.reject(Error("audio unavailable")) : new Promise<void>(() => {});
    });
    const { game } = startupGame({ status: "missing" }, true, "commit", prepare);
    if (mode === "timeout") {
      game.artReady = true;
      await vi.advanceTimersByTimeAsync(7_999);
      expect(game.tryBeginStartupEntry()).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
    }
    await game.startupAudioPreparation;
    game.artReady = true; expect(game.tryBeginStartupEntry()).toBe(true);
    expect(game.screen).toBe("playing");
  });

  it("keeps a prepared hidden first launch waiting until it returns to the foreground", async () => {
    const { game, callbacks } = startupGame({ status: "missing" }, false, "commit", async () => undefined);
    await game.startupAudioPreparation; game.artReady = true;
    expect(game.tryBeginStartupEntry()).toBe(false);
    callbacks.show!();
    // onShow schedules the next frame; this fixture does not run RAF callbacks.
    expect(game.appVisible).toBe(true);
    expect(game.tryBeginStartupEntry()).toBe(true);
    expect(game.screen).toBe("playing");
  });

  it("warms the menu for an established player without blocking the home screen", () => {
    const prepare = vi.fn(() => new Promise<void>(() => {}));
    const { game } = startupGame({ status: "ok", value: oldSave(6) }, true, "commit", prepare);
    expect(prepare).toHaveBeenCalledExactlyOnceWith("menu", { music: true, sound: true });
    expect(game.startupAudioPending).toBe(false);
    expect(game.startupEntryPending).toBe(false);
  });
});

describe("first-five campaign startup entry", () => {
  it("starts the genuinely missing account in level 1 without a popup or synthetic action", () => {
    const { game, host } = startupGame();
    const before = clone(game.save);
    expect(game.screen).toBe("home");
    expect(game.storageBaselineReady).toBe(true);
    expect(game.startupEntryPending).toBe(true);
    game.artReady = true;
    expect(game.tryBeginStartupEntry()).toBe(true);
    expect(game.screen).toBe("playing");
    expect(game.model.level.id).toBe(1);
    expect(game.model.snapshot().started).toBe(false);
    expect(game.model.snapshot().moves).toBe(0);
    expect(game.save.lifeState).toEqual(before.lifeState);
    expect(game.save.boosters).toEqual(before.boosters);
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.rewardedLevels).toEqual([]);
    expect(game.save.featureSeen).not.toContain("basics");
    expect(game.shouldShowBasicTutorial()).toBe(true);
    expect(game.save.activeRun).toMatchObject({ levelId: 1, returnLevelId: 1, lifeStarted: false, daily: false });
    expect(game.boosterUnlockGuide).toBeUndefined();
    expect(game.collectionIntro).toBeUndefined();
    expect(host.storageSet).toHaveBeenCalledTimes(2);
  });

  it.each([1, 2, 3, 4, 5])("resumes the unfinished opening sequence directly at level %s", (level) => {
    const { game } = startupGame({ status: "ok", value: oldSave(level) });
    game.artReady = true;
    const before = clone(game.save);
    expect(game.startupEntryPending).toBe(true);
    expect(game.tryBeginStartupEntry()).toBe(true);
    expect(["playing", "feature"]).toContain(game.screen);
    expect(game.model.level.id).toBe(level);
    expect(game.save.currentLevel).toBe(level);
    expect(game.save.activeRun).toMatchObject({ levelId: level, lifeStarted: false, daily: false });
    expect(game.save.lifeState).toEqual(before.lifeState);
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.boosters).toEqual(before.boosters);
  });

  it.each([6, 43])("keeps existing level %s accounts on the main menu even without basic tutorial acknowledgement", (level) => {
    const { game, host } = startupGame({ status: "ok", value: oldSave(level) });
    game.artReady = true;
    const writes = host.storageSet.mock.calls.length;
    expect(game.startupEntryPending).toBe(false);
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.screen).toBe("home");
    expect(game.model.level.id).toBe(level);
    expect(game.save.coins).toBe(321);
    expect(host.storageSet).toHaveBeenCalledTimes(writes);
  });

  it.each(["corrupt", "unavailable"] as const)("does not misclassify %s storage as a new player", (status) => {
    const { game } = startupGame({ status });
    game.artReady = true;
    expect(game.startupEntryPending).toBe(false);
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.screen).toBe("home");
    expect(game.save.activeRun).toBeUndefined();
  });

  it("waits for required art and a visible foreground before consuming the one-shot entry", () => {
    const { game } = startupGame({ status: "missing" }, false);
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.startupEntryPending).toBe(true);
    game.artReady = true;
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.screen).toBe("home");
    expect(game.startupEntryPending).toBe(true);
    game.appVisible = true;
    expect(game.tryBeginStartupEntry()).toBe(true);
    expect(game.screen).toBe("playing");
  });

  it("does not skip other screens, and does not repeat entry after returning home", () => {
    const { game, host } = startupGame();
    game.artReady = true;
    game.screen = "settings";
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.startupEntryPending).toBe(true);
    game.screen = "home";
    expect(game.tryBeginStartupEntry()).toBe(true);
    expect(game.startupEntryPending).toBe(false);
    const writes = host.storageSet.mock.calls.length;
    game.screen = "home";
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.screen).toBe("home");
    expect(host.storageSet).toHaveBeenCalledTimes(writes);
  });

  it("reenters level one when its normalized but unfinished first-session save is reloaded", () => {
    const { game, storage } = startupGame();
    game.artReady = true;
    game.tryBeginStartupEntry();
    const reloaded = startupGame(storage.read).game;
    reloaded.artReady = true;
    expect(reloaded.tryBeginStartupEntry()).toBe(true);
    expect(reloaded.screen).toBe("playing");
    expect(reloaded.model.level.id).toBe(1);
    expect(reloaded.save.featureSeen).not.toContain("basics");
  });

  it("waits for storage recovery and keeps the restored existing account on home", () => {
    const { game, storage } = startupGame({ status: "unavailable" });
    game.artReady = true;
    expect(game.storageBaselineReady).toBe(false);
    expect(game.tryBeginStartupEntry()).toBe(false);
    storage.read = { status: "ok", value: oldSave(43) };
    expect(game.retryStorageBaseline()).toBe(true);
    expect(game.screen).toBe("home");
    expect(game.model.level.id).toBe(43);
    expect(game.startupEntryPending).toBe(false);
    expect(game.save.coins).toBe(321);
  });

  it("starts after recovery only when storage confirms the account really is missing", () => {
    const { game, storage } = startupGame({ status: "unavailable" });
    game.artReady = true;
    storage.read = { status: "missing" };
    expect(game.retryStorageBaseline()).toBe(true);
    expect(game.screen).toBe("playing");
    expect(game.model.level.id).toBe(1);
    expect(game.save.activeRun?.lifeStarted).toBe(false);
    expect(game.shouldShowBasicTutorial()).toBe(true);
  });

  it("does not enter while a trusted storage baseline is unresolved", () => {
    const { game, host } = startupGame();
    game.artReady = true;
    game.storageBaselineReady = false;
    const writes = host.storageSet.mock.calls.length;
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.startupEntryPending).toBe(true);
    expect(game.screen).toBe("home");
    expect(host.storageSet).toHaveBeenCalledTimes(writes);
  });

  it("preserves missing-account eligibility when its normalized save is later confirmed after an ambiguous write", () => {
    const { game, storage } = startupGame({ status: "missing" }, true, "unknown-after-write");
    expect(game.storageBaselineReady).toBe(false);
    expect(game.startupEntryPending).toBe(true);
    game.artReady = true;
    expect(game.tryBeginStartupEntry()).toBe(false);
    // Confirm exactly the bytes the new account's normalization wrote, with
    // no real persistent storage or manual change to eligibility state.
    storage.read = { status: "ok", value: clone(storage.lastWritten) };
    storage.setMode = "commit";
    expect(game.retryStorageBaseline()).toBe(true);
    expect(game.screen).toBe("playing");
    expect(game.shouldShowBasicTutorial()).toBe(true);
  });

  it("cancels pending auto-entry if progress changes before startup completes", () => {
    const { game } = startupGame();
    game.save.highestLevel = 6;
    game.save.rewardedLevels = [1, 2, 3, 4, 5];
    game.artReady = true;
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.startupEntryPending).toBe(false);
    expect(game.screen).toBe("home");
    expect(game.save.activeRun).toBeUndefined();
  });

  it.each([
    { highestLevel: 43 },
    { rewardedLevels: [1, 2, 3, 4, 5] },
    { rewardedLevels: [100] },
    { bestStars: { "5": 1 } },
    { bestStars: { "20": 3 } },
    { collectionIntroShown: true },
  ])("does not mistake an older account browsing level one for unfinished onboarding: %j", (progress) => {
    const { game } = startupGame({ status: "ok", value: { ...oldSave(1), ...progress } });
    game.artReady = true;
    expect(game.startupEntryPending).toBe(false);
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.screen).toBe("home");
    expect(game.save.activeRun).toBeUndefined();
  });

  it("does not auto-enter from an ok response with invalid save schema", () => {
    const { game } = startupGame({ status: "ok", value: { unexpected: true } });
    game.artReady = true;
    expect(game.startupEntryPending).toBe(false);
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.screen).toBe("home");
  });

  it.each(["initial", "recovery"])("does not replace a stored daily session with an early campaign level on %s", (phase) => {
    const read: StorageReadResult<unknown> = { status: "ok", value: {
      ...oldSave(3),
      activeRun: { levelId: 3, returnLevelId: 3, daily: true, lifeStarted: false,
        boosterSpent: { time: 0, rocket: 0, pulse: 0 } },
    } };
    const { game, storage } = startupGame(phase === "initial" ? read : { status: "unavailable" });
    game.artReady = true;
    if (phase === "recovery") {
      storage.read = read;
      expect(game.retryStorageBaseline()).toBe(true);
    }
    expect(game.startupEntryPending).toBe(false);
    expect(game.tryBeginStartupEntry()).toBe(false);
    expect(game.screen).toBe("home");
  });

  it("resumes a stored pre-five account after unavailable storage becomes readable", () => {
    const { game, storage } = startupGame({ status: "unavailable" });
    game.artReady = true;
    storage.read = { status: "ok", value: oldSave(3) };
    expect(game.retryStorageBaseline()).toBe(true);
    expect(["playing", "feature"]).toContain(game.screen);
    expect(game.model.level.id).toBe(3);
    expect(game.save.coins).toBe(321);
    expect(game.save.activeRun?.lifeStarted).toBe(false);
  });

  it("uses the existing empty-life dialog instead of granting free automatic admission", () => {
    const { game } = startupGame({ status: "ok", value: {
      ...oldSave(3),
      lifeState: { lives: 0, nextLifeAtMs: NOW + 30 * 60 * 1000, unlimitedLivesUntilMs: 0 },
    } });
    game.artReady = true;
    game.tryBeginStartupEntry();
    expect(game.screen).toBe("home");
    expect(game.lifeRefillOpen).toBe(true);
    expect(game.save.activeRun).toBeUndefined();
    expect(game.save.lifeState.lives).toBe(0);
    expect(game.save.coins).toBe(321);
    expect(game.startupEntryPending).toBe(false);
  });

  it("restores a pending level-five masterpiece introduction on home without acknowledging it", () => {
    const { game, host } = startupGame({ status: "ok", value: {
      ...oldSave(6), collectionIntroPending: true, collectionIntroShown: false,
    } });
    game.artReady = true;
    game.requestCollectionAlbumArtwork = vi.fn();
    const writes = host.storageSet.mock.calls.length;
    game.tryBeginStartupEntry();
    expect(game.screen).toBe("home");
    expect(game.model.level.id).toBe(6);
    expect(game.collectionIntro).toMatchObject({ level: 5, age: 0 });
    expect(game.save.collectionIntroPending).toBe(true);
    expect(game.save.collectionIntroShown).toBe(false);
    expect(game.save.activeRun).toBeUndefined();
    expect(host.storageSet).toHaveBeenCalledTimes(writes);
  });
});

describe("pause availability after the fifth campaign clear", () => {
  it.each([
    { highestLevel: 5, rewardedLevels: [1, 2, 3, 4], unlocked: false },
    { highestLevel: 6, rewardedLevels: [], unlocked: true },
    { highestLevel: 5, rewardedLevels: [5], unlocked: true },
  ])("uses completed campaign progress when replaying level one: %j", ({ unlocked, ...progress }) => {
    const { game } = startupGame({ status: "ok", value: { ...oldSave(1), ...progress } });
    expect(game.model.level.id).toBe(1);
    expect(game.pauseUnlocked()).toBe(unlocked);
  });

  it("uses the original campaign progress while a temporary level changes the working save", () => {
    const { game } = startupGame({ status: "ok", value: oldSave(5) });
    const earlyBaseline = clone(game.save);
    game.temporaryLevelTestSession = { baselineSave: earlyBaseline };
    game.save.highestLevel = 100;
    game.save.rewardedLevels = [5];
    expect(game.pauseUnlocked()).toBe(false);

    game.temporaryLevelTestSession.baselineSave = { ...earlyBaseline, highestLevel: 6 };
    game.save.highestLevel = 1;
    game.save.rewardedLevels = [];
    expect(game.pauseUnlocked()).toBe(true);
  });

  it.each([5, 6])("keeps background time paused and resumes only the pre-unlock campaign (progress %s)", (progress) => {
    const { game, callbacks } = startupGame({ status: "ok", value: oldSave(progress) });
    let monotonic = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => monotonic);
    game.artReady = true;
    game.shellArtReady = true;
    game.render = vi.fn();
    game.screen = "playing";
    game.model.startCountdown();
    game.frame(monotonic);
    monotonic += 250;
    callbacks.hide!();
    expect(game.appVisible).toBe(false);
    expect(game.screen).toBe("paused");
    const paused = game.model.snapshot();

    monotonic += 60_000;
    game.frame(monotonic);
    expect(game.model.snapshot()).toEqual(paused);
    callbacks.show!();
    expect(game.appVisible).toBe(true);
    expect(game.screen).toBe(progress === 5 ? "playing" : "paused");
    expect(game.lastFrame).toBe(0);
    game.frame(monotonic);
    expect(game.model.snapshot()).toEqual(paused);
    monotonic += 20;
    game.frame(monotonic);
    expect(game.model.snapshot().remainingSeconds).toBeCloseTo(
      paused.remainingSeconds - (progress === 5 ? 0.02 : 0), 6,
    );
  });

  it.each(["home", "feature", "win"])("does not turn a backgrounded %s screen into gameplay", (screen) => {
    const { game, callbacks } = startupGame({ status: "ok", value: oldSave(4) });
    game.screen = screen;
    const before = game.model.snapshot();
    callbacks.hide!();
    expect(game.screen).toBe(screen);
    callbacks.show!();
    expect(game.screen).toBe(screen);
    expect(game.model.snapshot()).toEqual(before);
  });
});
