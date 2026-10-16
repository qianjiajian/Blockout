import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLeague } from "../src/core/league";
import { LeagueRun } from "../src/core/leagueRun";
import { getLevel } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";
import { REVISED_REGION_TIMING } from "../src/game/revisedRegionAnimation";
import { TimeFreezeAnimation } from "../src/game/timeFreezeAnimation";

const NOW = new Date("2026-10-08T12:00:00.000Z").getTime();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const fixture = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 8, name: "rocket animation event fixture", difficulty: "normal", reward: 0,
  mechanismRules: "revised-2026-09-27-v1.5", width: 5, height: 5, timeSeconds: 60,
  gates: [{ id: "red-exit", color: "red", side: "left", offset: 0, size: 1 }],
  blocks: [
    { id: "target", color: "red", x: 0, y: 0, shape: [[0, 0]] },
    { id: "other", color: "blue", x: 4, y: 4, shape: [[0, 0]] },
  ],
  ...overrides,
});

/** Real launch/impact, model history and memory-only persistence; no actual player storage. */
const rocketGame = (level = fixture(), reducedMotion = false) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  game.timeFreezeAnimation = new TimeFreezeAnimation();
  game.playableClockSlices = { reset: vi.fn() };
  const defaults = game.sanitizeSave(undefined);
  game.save = game.sanitizeSave({
    ...defaults, currentLevel: level.id, highestLevel: level.id, reducedMotion,
    boosters: { time: 2, rocket: 2, pulse: 2 },
    lifeState: { lives: 4, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: 0 },
    activeRun: { levelId: level.id, returnLevelId: level.id, lifeStarted: true, daily: false,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 } },
  });
  const storage = { value: clone(game.save), mode: "commit" as "commit" | "reject" | "unknown-after-write" };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
  };
  game.model = new PuzzleModel(level, { deferExitCompletion: true });
  game.resetPuzzlePresentation();
  Object.assign(game, { screen: "playing", appVisible: true, artReady: true,
    storageBaselineReady: true, storageReadAttempts: 0 });
  game.advanceRevisedClockBeforeMutation = vi.fn(() => !game.model.snapshot().failed);
  game.boardLayout = () => ({ innerX: 40, innerY: 300, cell: 50, innerWidth: 250, innerHeight: 250 });
  game.tr = (key: string) => key;
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "captureGeneratorSpawns", "captureInitialGeneratorSpawns",
    "emitMechanicFeedback", "emitBurst", "emitBlockParticles", "requestWinArt", "captureRevisedMechanicTransitions",
    "refreshActiveDragCollisionWorld", "scheduleLifeRefreshWatch", "releaseFormalPageArt", "releaseDailyChallengeArt",
    "releaseWinArt", "releaseCollectionAlbumArt", "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt",
  ]) game[method] = vi.fn();
  const impact = vi.spyOn(game, "impactRocket");
  return { game, storage, impact };
};

const launch = (game: any, id = "target") => {
  expect(game.beginRocketFlight(game.model.getBlock(id))).toBe(true);
  return game.rocketFlight;
};

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("rocket selection and delayed impact", () => {
  it("selects and cancels targeting without starting a life or spending an item", () => {
    const { game } = rocketGame();
    game.save.activeRun.lifeStarted = false;
    const before = clone(game.save);
    game.useBooster("rocket");
    expect(game.boosterTarget).toBe("rocket");
    expect(game.rocketTargetBlockIds()).toEqual(["target", "other"]);
    game.useBooster("rocket");
    expect(game.boosterTarget).toBeUndefined();
    expect(game.rocketFlight).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.playSound).not.toHaveBeenCalledWith("rocket");
  });

  it.each([false, true])("keeps the block intact until one impact and spends exactly once (reduced=%s)", (reduced) => {
    const { game, storage, impact } = rocketGame(fixture(), reduced);
    const before = game.model.snapshot();
    const flight = launch(game);
    expect(game.playSound.mock.calls).toEqual([["rocket"]]);
    expect(flight).toMatchObject({ owner: game.model, blockId: "target", blockPosition: { x: 0, y: 0 },
      age: 0, duration: reduced ? 0.12 : 0.48, target: { x: 65, y: 325 } });
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save.boosters.rocket).toBe(2);
    expect(game.save.activeRun.boosterSpent.rocket).toBe(0);
    game.updateRocketFlight(flight.duration - 0.001);
    expect(game.model.getBlock("target")).toBeDefined();
    expect(impact).not.toHaveBeenCalled();
    expect(game.rocketImpact).toBeUndefined();
    expect(game.playSound.mock.calls).toEqual([["rocket"]]);
    game.updateRocketFlight(0.002);
    expect(impact).toHaveBeenCalledOnce();
    expect(game.rocketFlight).toBeUndefined();
    expect(game.model.getBlock("target")).toBeUndefined();
    expect(game.model.snapshot()).toMatchObject({ cleared: 1, moves: 0, complete: false });
    expect(game.save.boosters.rocket).toBe(1);
    expect(game.save.activeRun.boosterSpent.rocket).toBe(1);
    expect(storage.value.boosters.rocket).toBe(1);
    expect(game.rocketImpact).toMatchObject({ age: 0, target: flight.target });
    expect(game.exitGhosts).toHaveLength(1);
    expect(game.exitGhosts[0]).toMatchObject({ mode: "rocket", exitAnimationOwner: game.model,
      duration: reduced ? 0.12 : 0.56, block: { id: "target" } });
    game.updateRocketFlight(10);
    expect(impact).toHaveBeenCalledOnce();
    expect(game.save.boosters.rocket).toBe(1);
    expect(game.model.snapshot().cleared).toBe(1);
    expect(game.playSound.mock.calls).toEqual([["rocket"]]);
  });

  it("blocks another launch and other booster actions while a rocket is flying", () => {
    const { game } = rocketGame();
    const flight = launch(game);
    const before = game.model.snapshot();
    expect(game.beginRocketFlight(game.model.getBlock("other"))).toBe(false);
    for (const booster of ["time", "rocket", "pulse"]) game.useBooster(booster);
    expect(game.rocketFlight).toBe(flight);
    expect(game.playSound.mock.calls).toEqual([["rocket"]]);
    expect(game.save.boosters).toEqual({ time: 2, rocket: 2, pulse: 2 });
    expect(game.model.snapshot()).toEqual(before);
  });

  it("excludes frozen, locked and still-hidden blocks from targeting and launch", () => {
    const level = fixture();
    level.blocks.push(
      { id: "ice", color: "green", x: 2, y: 0, shape: [[0, 0]], frozen: 3 },
      { id: "lock", color: "orange", x: 3, y: 0, shape: [[0, 0]], lockedBy: "key" },
      { id: "hidden", color: "pink", x: 2, y: 2, shape: [[0, 0]], shutterId: "cover" },
    );
    level.blocks[0].keyId = "key";
    level.shutters = [{ id: "cover", x: 2, y: 2, width: 1, height: 1, count: 2 }];
    const { game } = rocketGame(level);
    expect(game.rocketTargetBlockIds()).toEqual(["target", "other"]);
    for (const id of ["ice", "lock", "hidden"]) expect(game.beginRocketFlight(game.model.getBlock(id))).toBe(false);
    expect(game.rocketFlight).toBeUndefined();
    expect(game.save.boosters.rocket).toBe(2);
    expect(game.model.snapshot().cleared).toBe(0);
    expect(game.playSound).not.toHaveBeenCalledWith("rocket");
  });

  it.each(["empty", "locked"])("does not play the launch recording when %s", (reason) => {
    const { game } = rocketGame(fixture({ id: reason === "locked" ? 6 : 8 }));
    if (reason === "empty") game.save.boosters.rocket = 0;
    expect(game.beginRocketFlight(game.model.getBlock("target"))).toBe(false);
    expect(game.rocketFlight).toBeUndefined();
    expect(game.playSound).not.toHaveBeenCalledWith("rocket");
  });

  it.each([false, true])("respects the sound-effects setting at launch with music disabled (sound=%s)", (sound) => {
    const { game } = rocketGame();
    game.save.sound = sound;
    game.save.music = false;
    game.playSound = (ColorEscapeGame.prototype as any).playSound;
    game.syncMusic = vi.fn();
    game.host.sound = vi.fn();
    const flight = launch(game);
    expect(game.host.sound.mock.calls).toEqual(sound ? [["rocket"]] : []);
    game.updateRocketFlight(flight.duration);
    expect(game.model.getBlock("target")).toBeUndefined();
    expect(game.host.sound.mock.calls).toEqual(sound ? [["rocket"]] : []);
  });

  it.each(["shutter", "lift"] as const)("waits for the actual %s cover to clear before highlighting newly active cargo", (kind) => {
    const level = fixture();
    level.blocks.push({ id: "hidden", color: "pink", x: 2, y: 2, shape: [[0, 0]], shutterId: "cover" });
    level.shutters = [{ id: "cover", x: 2, y: 2, width: 1, height: 1, count: 1 }];
    const { game } = rocketGame(level);
    expect(game.model.removeBlockWithBooster("target").ok).toBe(true);
    const block = game.model.getBlock("hidden");
    expect(game.model.isBlockActive(block)).toBe(true);
    const open = kind === "shutter" ? REVISED_REGION_TIMING.shutterOpen : REVISED_REGION_TIMING.liftOpen;
    game.revisedTransitions = [{ kind, targetId: "cover", age: open - 0.001 }];
    expect(game.isBlockCoverCleared(block)).toBe(false);
    expect(game.rocketTargetBlockIds()).not.toContain("hidden");
    expect(game.beginRocketFlight(block)).toBe(false);
    game.revisedTransitions[0].age = open;
    expect(game.isBlockCoverCleared(block)).toBe(true);
    expect(game.rocketTargetBlockIds()).toContain("hidden");
    expect(game.beginRocketFlight(block)).toBe(true);
    expect(game.save.boosters.rocket).toBe(2);
  });
});

describe("rocket ownership, clock and cancellation", () => {
  it.each(["paused", "background", "booster-guide", "life-dialog"])("holds a flight during %s and resumes without early impact", (reason) => {
    const { game, impact } = rocketGame();
    launch(game);
    game.updateRocketFlight(0.1);
    if (reason === "paused") game.screen = "paused";
    if (reason === "background") game.appVisible = false;
    if (reason === "booster-guide") game.boosterUnlockGuide = {};
    if (reason === "life-dialog") game.lifeRefillOpen = true;
    game.updateRocketFlight(100);
    expect(game.rocketFlight.age).toBe(0.1);
    expect(impact).not.toHaveBeenCalled();
    Object.assign(game, { screen: "playing", appVisible: true, boosterUnlockGuide: undefined, lifeRefillOpen: false });
    game.updateRocketFlight(0.38);
    expect(impact).toHaveBeenCalledOnce();
    expect(game.save.boosters.rocket).toBe(1);
  });

  it.each(["owner", "screen", "failed", "missing-target", "moved-target"])("cancels a stale %s flight without removing or spending", (reason) => {
    const { game, impact } = rocketGame();
    launch(game);
    if (reason === "owner") game.model = new PuzzleModel(fixture());
    if (reason === "screen") game.screen = "home";
    if (reason === "failed") { game.model.startCountdown(); game.model.tick(60); }
    if (reason === "missing-target") game.model.removeBlockWithBooster("target");
    if (reason === "moved-target") expect(game.model.moveBlockStep("target", 1, 0)).toBe(true);
    const before = game.model.snapshot();
    game.updateRocketFlight(1);
    expect(game.rocketFlight).toBeUndefined();
    expect(impact).not.toHaveBeenCalled();
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save.boosters.rocket).toBe(2);
    expect(game.save.activeRun.boosterSpent.rocket).toBe(0);
  });

  it("rechecks position at impact even if a late callback bypasses the flight update", () => {
    const { game } = rocketGame();
    const flight = launch(game);
    expect(game.model.moveBlockStep("target", 1, 0)).toBe(true);
    game.impactRocket(flight.blockId, flight.target, flight.blockPosition);
    expect(game.model.getBlock("target").x).toBe(1);
    expect(game.save.boosters.rocket).toBe(2);
    expect(game.exitGhosts).toEqual([]);
  });

  it.each([false, true])("clears pending launch when loading a board (play=%s), retaining spent first-operation life", (play) => {
    const { game } = rocketGame();
    game.save.activeRun.lifeStarted = false;
    launch(game);
    expect(game.save.lifeState.lives).toBe(3);
    game.screen = "paused";
    game.loadLevel(9, play);
    expect(game.rocketFlight).toBeUndefined();
    game.updateRocketFlight(1);
    expect(game.save.boosters.rocket).toBe(2);
    expect(game.save.lifeState.lives).toBe(3);
    expect(game.model.level.id).toBe(9);
    expect(game.model.snapshot().cleared).toBe(0);
  });

  it("keeps the real clock running during flight and cancels if time expires before impact", () => {
    const { game, impact } = rocketGame(fixture({ timeSeconds: 0.2 }));
    game.model.startCountdown();
    launch(game);
    game.model.tick(0.1);
    game.updateRocketFlight(0.1);
    expect(game.model.snapshot().remainingSeconds).toBeCloseTo(0.1);
    game.model.tick(0.11);
    game.updateRocketFlight(0.38);
    expect(game.model.snapshot().failed).toBe(true);
    expect(game.rocketFlight).toBeUndefined();
    expect(impact).not.toHaveBeenCalled();
    expect(game.model.getBlock("target")).toBeDefined();
    expect(game.save.boosters.rocket).toBe(2);
  });

  it.each(["reject", "unknown-after-write"] as const)("does not launch or charge an item before a %s life-start write resolves", (mode) => {
    const { game, storage } = rocketGame();
    game.save.activeRun.lifeStarted = false;
    storage.value = clone(game.save);
    storage.mode = mode;
    expect(game.beginRocketFlight(game.model.getBlock("target"))).toBe(false);
    expect(game.rocketFlight).toBeUndefined();
    expect(game.save.boosters.rocket).toBe(2);
    expect(game.save.lifeState.lives).toBe(4);
    expect(game.playSound).not.toHaveBeenCalledWith("rocket");
    storage.mode = "commit";
    launch(game);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "rocket")).toHaveLength(1);
    expect(game.save.lifeState.lives).toBe(3);
    expect(game.save.boosters.rocket).toBe(2);
    game.updateRocketFlight(0.48);
    expect(game.save.boosters.rocket).toBe(1);
    expect(game.save.lifeState.lives).toBe(3);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "rocket")).toHaveLength(1);
  });
});

describe("rocket existing special-mode semantics", () => {
  it("retains the actual level-7 rescue target and defers its inventory deduction until settlement", () => {
    const { game, storage } = rocketGame(getLevel(7));
    game.model.startCountdown();
    game.model.beginAction();
    expect(game.model.tryExit("cc-piece-04", "top").ok).toBe(true);
    expect(game.commitAction()).toBe(true);
    game.updateRocketRescueGuide(0);
    expect(game.rocketRescueGuide?.phase).toBe("booster");
    game.useBooster("rocket");
    game.updateRocketRescueGuide(0);
    expect(game.rocketRescueGuide?.phase).toBe("target");
    launch(game, "strategy-guard-12");
    game.updateRocketFlight(0.48);
    expect(game.rocketRescueGuide).toBeUndefined();
    expect(game.save.boosters.rocket).toBe(2);
    expect(storage.value.boosters.rocket).toBe(2);
    expect(game.save.activeRun.boosterSpent.rocket).toBe(1);
    expect(game.availableRocketStock()).toBe(1);
    // Inspect the existing settlement candidate only; this is not a full Lv7 route.
    expect(game.createPendingSettlement().candidateSave.boosters.rocket).toBe(1);
  });

  it("records league special-block points only at impact and leaves campaign progress unchanged", () => {
    const { game } = rocketGame();
    const state = createLeague(NOW, 123, 0);
    game.leagueRun = new LeagueRun(state, 1, fixture({ id: 900001 }), ["target"], NOW);
    game.model = game.leagueRun.model;
    const campaign = { currentLevel: game.save.currentLevel, highestLevel: game.save.highestLevel,
      rewardedLevels: clone(game.save.rewardedLevels), lifeState: clone(game.save.lifeState) };
    launch(game);
    game.updateRocketFlight(0.479);
    expect(game.leagueRun.provisionalPoints).toBe(0);
    game.updateRocketFlight(0.002);
    expect(game.leagueRun.provisionalPoints).toBe(10);
    game.updateRocketFlight(1);
    expect(game.leagueRun.provisionalPoints).toBe(10);
    expect(state.season.score).toBe(0);
    expect(game.save.boosters.rocket).toBe(1);
    for (const [key, value] of Object.entries(campaign)) expect(game.save[key]).toEqual(value);
  });

  it("defers the final clear until impact and the flip event until the owned shatter finishes", () => {
    const level = fixture({ gates: [], flipDoors: [{ id: "red-flip", color: "red", side: "left", offset: 0, size: 1, initiallyOpen: true }],
      blocks: [{ id: "target", color: "red", x: 0, y: 0, shape: [[0, 0]], layers: ["red", "blue"] }] });
    const { game } = rocketGame(level);
    launch(game);
    expect(game.model.snapshot().complete).toBe(false);
    expect(game.pendingCelebration).toBe(0);
    game.updateRocketFlight(0.48);
    expect(game.model.snapshot()).toMatchObject({ complete: true, cleared: 1 });
    expect(game.model.snapshot().flipDoors[0].open).toBe(true);
    expect(game.model.snapshot().pendingExitAnimations).toHaveLength(1);
    expect(game.pendingCelebration).toBeCloseTo(0.68);
    expect(game.requestWinArt).toHaveBeenCalledOnce();
    expect(game.exitGhosts[0].block.layers).toEqual(["red", "blue"]);
    game.updateExitGhosts(0.55);
    expect(game.model.snapshot().flipDoors[0].open).toBe(true);
    game.screen = "paused";
    game.updateExitGhosts(10);
    expect(game.model.snapshot().flipDoors[0].open).toBe(true);
    game.screen = "playing";
    game.updateExitGhosts(0.02);
    expect(game.model.snapshot().flipDoors[0].open).toBe(false);
    expect(game.model.snapshot().pendingExitAnimations ?? []).toEqual([]);
    expect(game.exitGhosts).toEqual([]);
    game.updateExitGhosts(1);
    expect(game.model.snapshot().flipDoors[0].open).toBe(false);
  });
});
