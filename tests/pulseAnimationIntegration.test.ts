import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { getLevel } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec, PuzzleSnapshot } from "../src/core/types";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";
import { PulseAnimation, samplePulseShake } from "../src/game/pulseAnimation";
import { sampleRocketShake } from "../src/game/rocketAnimation";
import { projectPulseBlockRects } from "../src/game/pulseHighlightGeometry";
import { matchFormalBlockShapeForLevel } from "../src/game/formalBlockShapes";
import { PopupEntranceController } from "../src/game/popupEntrance";
import { TimeFreezeAnimation } from "../src/game/timeFreezeAnimation";

const NOW = new Date("2026-10-09T10:00:00.000Z").getTime();
const fixture = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 11, name: "pulse presentation integration", difficulty: "normal", reward: 0,
  mechanismRules: "revised-2026-09-27-v1.5", width: 8, height: 6, timeSeconds: 60,
  gates: [
    { id: "ice-gate", color: "red", side: "left", offset: 0, size: 1, frozen: 4 },
    { id: "ordinary-gate", color: "yellow", side: "bottom", offset: 5, size: 1 },
  ],
  flipDoors: [{ id: "ice-flip", color: "green", side: "top", offset: 2, size: 1, frozen: 1, initiallyOpen: false }],
  blocks: [
    { id: "ice-five", color: "red", x: 0, y: 0, shape: [[0, 0]], frozen: 5 },
    { id: "ice-one", color: "blue", x: 1, y: 0, shape: [[0, 0]], frozen: 1 },
    { id: "key", color: "green", x: 2, y: 0, shape: [[0, 0]], keyId: "k" },
    { id: "locked", color: "orange", x: 3, y: 0, shape: [[0, 0]], lockedBy: "k", lockCount: 1 },
    { id: "bomb", color: "purple", x: 4, y: 0, shape: [[0, 0]], timedBombSeconds: 30 },
    { id: "shell", color: "yellow", x: 5, y: 0, shape: [[0, 0]], layers: ["yellow", "green"] },
    { id: "hidden", color: "pink", x: 0, y: 3, shape: [[0, 0]], shutterId: "cover", frozen: 5 },
    { id: "lift-top", color: "yellow", x: 2, y: 3, shape: [[0, 0]] },
    { id: "lift-hidden", color: "blue", x: 2, y: 3, shape: [[0, 0]], shutterId: "lift", frozen: 5 },
  ],
  shutters: [
    { id: "cover", x: 0, y: 3, width: 1, height: 1, count: 2 },
    { id: "lift", x: 2, y: 3, width: 1, height: 1, count: 4, skin: "lift" },
  ],
  ...overrides,
});

/** Actual use/model/history/feedback entry points, with memory-only persistence.
 * The clock flush is isolated; clock progression below uses the real model tick. */
const pulseGame = (level = fixture(), reducedMotion = false) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.countdownWarning = new CountdownWarning();
  game.timeFreezeAnimation = new TimeFreezeAnimation();
  game.pulseAnimation = new PulseAnimation();
  game.popupEntrance = new PopupEntranceController();
  game.playableClockSlices = { reset: vi.fn() };
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined), currentLevel: level.id, highestLevel: Math.max(10, level.id), reducedMotion,
    rewardedLevels: Array.from({ length: 9 }, (_, index) => index + 1),
    boosters: { time: 3, rocket: 3, pulse: 3 },
    boosterUnlockSeen: ["time", "rocket", "pulse"], boosterUsageSeen: ["time", "rocket"],
    lifeState: { lives: 4, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: 0 },
    activeRun: { levelId: level.id, returnLevelId: level.id, lifeStarted: true, daily: false,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 } },
  });
  const storage = { value: clone(game.save), mode: "commit" as "commit" | "reject" | "unknown-after-write" };
  game.host = {
    viewport: () => ({ width: 496, height: 1078, safeTop: 0, safeBottom: 0, dpr: 1 }),
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
  };
  game.model = new PuzzleModel(level, { deferExitCompletion: true });
  Object.assign(game, { screen: "playing", appVisible: true, artReady: true,
    storageBaselineReady: true, storageReadAttempts: 0 });
  game.advanceRevisedClockBeforeMutation = vi.fn(() => !game.model.snapshot().failed);
  game.boardLayout = () => ({ innerX: 40, innerY: 300, cell: 45,
    innerWidth: level.width * 45, innerHeight: level.height * 45 });
  game.tr = (key: string) => key;
  game.interactionHit = (point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }) => (
    point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
  );
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "captureGeneratorSpawns", "captureInitialGeneratorSpawns", "emitBurst",
    "scheduleLifeRefreshWatch", "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseWinArt",
    "releaseCollectionAlbumArt", "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt",
    "requestWinArt", "requestBoosterPurchaseArt", "requestJourneyHomeThemeArt",
  ]) game[method] = vi.fn();
  game.resetPuzzlePresentation();
  const trigger = vi.spyOn(game.pulseAnimation, "trigger");
  const commit = vi.spyOn(game.model, "commitAction");
  const thaw = vi.spyOn(game.model, "thawAll");
  return { game, storage, trigger, commit, thaw };
};

/** Compare real before/after counters, without deciding which mechanics Pulse may affect. */
const counterChanges = (before: PuzzleSnapshot, after: PuzzleSnapshot) => {
  const rows = (snapshot: PuzzleSnapshot) => [
    ...snapshot.blocks.map((item) => ({ id: item.id, kind: "block", value: item.frozen })),
    ...[...snapshot.gates, ...snapshot.flipDoors].map((item) => ({ id: item.id, kind: "gate", value: item.frozen })),
    ...snapshot.shutters.map((item) => ({ id: item.id, kind: "shutter", value: item.count })),
  ];
  const old = new Map(rows(before).map((row) => [`${row.kind}:${row.id}`, row.value]));
  return rows(after).flatMap(({ id, kind, value }) => {
    const previous = old.get(`${kind}:${id}`);
    return previous !== undefined && previous !== value ? [{ id, kind, previous, remaining: value }] : [];
  }).sort((a, b) => a.id.localeCompare(b.id));
};
const animationTargets = (game: any) => game.pulseAnimation.sample(game.save.reducedMotion).targets
  .map(({ id, kind, previous, remaining }: any) => ({ id, kind, previous, remaining }))
  .sort((a: any, b: any) => a.id.localeCompare(b.id));

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("committed Pulse presentation", () => {
  it.each([false, true])("uses actual changed targets and applies the gameplay effect once (reduced=%s)", (reducedMotion) => {
    const { game, storage, trigger, commit, thaw } = pulseGame(fixture(), reducedMotion);
    const before = game.model.snapshot();
    game.useBooster("pulse");
    const after = game.model.snapshot();
    expect(trigger).toHaveBeenCalledOnce();
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "pulse")).toHaveLength(1);
    expect(commit).toHaveBeenCalledExactlyOnceWith(false);
    expect(thaw).toHaveBeenCalledExactlyOnceWith(2);
    expect(game.pulseAnimationOwner).toBe(game.model);
    expect(game.pulseAnimation.sample(reducedMotion)).toMatchObject({ visible: true, age: 0 });
    expect(animationTargets(game)).toEqual(counterChanges(before, after));
    expect(animationTargets(game).map((target: any) => target.id)).toEqual(["cover", "ice-five", "ice-flip", "ice-gate", "ice-one"]);
    expect(game.model.getBlock("ice-five").frozen).toBe(3);
    expect(game.model.getBlock("ice-one").frozen).toBe(0);
    expect(after.flipDoors[0]).toMatchObject({ frozen: 0, open: false });
    expect(after.shutters.find((item: any) => item.id === "cover")).toMatchObject({ count: 0, revealed: true });
    // Cargo exposed by this pulse is not retroactively hit by the same pulse.
    expect(game.model.getBlock("hidden").frozen).toBe(5);
    for (const id of ["key", "locked", "bomb", "shell", "lift-hidden"]) {
      expect(after.blocks.find((item: any) => item.id === id)).toEqual(before.blocks.find((item: any) => item.id === id));
    }
    for (const id of ["lift"]) {
      expect(after.shutters.find((item: any) => item.id === id)).toEqual(before.shutters.find((item: any) => item.id === id));
    }
    expect(after).toMatchObject({ moves: 0, cleared: 0, remainingSeconds: 60, timeFreezeSeconds: 0 });
    expect(game.save.boosters.pulse).toBe(2);
    expect(game.save.activeRun.boosterSpent.pulse).toBe(1);
    expect(game.save.boosterUsageSeen).toContain("pulse");
    expect(game.save.lifeState.lives).toBe(4);
    expect(storage.value.boosters.pulse).toBe(2);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
    const saved = clone(storage.value);
    game.updatePulseAnimation(reducedMotion ? 0.251 : 1.401);
    game.updatePulseAnimation(50);
    expect(game.pulseAnimation.isVisible).toBe(false);
    expect(game.model.snapshot()).toEqual(after);
    expect(storage.value).toEqual(saved);
    expect(commit).toHaveBeenCalledOnce();
    expect(thaw).toHaveBeenCalledOnce();
    expect(game.host.storageSet).toHaveBeenCalledOnce();
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "pulse")).toHaveLength(1);
  });

  it("excludes the protected staging and staged-frame counters in their supported legacy runtime", () => {
    const { game } = pulseGame(fixture({ mechanismRules: undefined, gates: [], flipDoors: [], blocks: [
      { id: "ice", color: "red", x: 0, y: 0, shape: [[0, 0]], frozen: 3 },
      { id: "key", color: "green", x: 2, y: 0, shape: [[0, 0]] },
      { id: "stage-hidden", color: "red", x: 4, y: 3, shape: [[0, 0]], shutterId: "stage" },
      { id: "frame-top", color: "blue", x: 6, y: 3, shape: [[0, 0]] },
      { id: "frame-hidden", color: "orange", x: 6, y: 3, shape: [[0, 0]], shutterId: "frame" },
    ], shutters: [
      { id: "stage", x: 4, y: 3, width: 1, height: 1, count: 1, skin: "staging", triggerBlockIds: ["key"] },
      { id: "frame", x: 6, y: 3, width: 1, height: 1, count: 1, skin: "staged-frame", triggerBlockIds: ["frame-top"] },
    ] }));
    const before = game.model.snapshot();
    game.useBooster("pulse");
    const after = game.model.snapshot();
    expect(animationTargets(game)).toEqual([{ id: "ice", kind: "block", previous: 3, remaining: 1 }]);
    expect(after.shutters).toEqual(before.shutters);
    expect(game.save.boosters.pulse).toBe(2);
  });

  it("ignores repeated booster input while presentation is active", () => {
    const { game, trigger } = pulseGame();
    game.useBooster("pulse");
    game.updatePulseAnimation(0.1);
    const before = game.model.snapshot(), saved = clone(game.save), animation = game.pulseAnimation.sample(false);
    for (const kind of ["pulse", "time", "rocket"]) game.useBooster(kind);
    expect(trigger).toHaveBeenCalledOnce();
    expect(game.pulseAnimation.sample(false)).toEqual(animation);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "pulse")).toHaveLength(1);
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
  });

  it("holds existing gate and shutter feedback until the wave without holding the model counters", () => {
    const { game } = pulseGame();
    const before = game.model.snapshot();
    game.useBooster("pulse");
    const actual = game.model.snapshot();
    const held = game.pulseVisualSnapshot(actual);
    expect(held.gates[0].frozen).toBe(before.gates[0].frozen);
    expect(held.flipDoors[0].frozen).toBe(before.flipDoors[0].frozen);
    expect(held.shutters.find((item: any) => item.id === "cover").count).toBe(2);
    expect(actual.gates[0].frozen).toBe(2);
    expect(actual.flipDoors[0].frozen).toBe(0);
    expect(actual.shutters.find((item: any) => item.id === "cover").count).toBe(0);
    expect(game.pulsePresentationPulses.length).toBeGreaterThan(0);
    for (const pulse of game.pulsePresentationPulses) {
      expect(pulse.presented).toBe(false);
      expect(pulse.age).toBeLessThanOrEqual(-0.65);
    }
    expect(game.pulsePresentationTransitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: "cover", kind: "shutter" }),
    ]));
    const targets = game.pulseAnimation.sample(false).targets;
    const lastArrival = Math.max(...targets.map((target: any) => game.pulseArrival(target)));
    game.updatePulseAnimation(lastArrival + 0.001);
    expect(game.pulseVisualSnapshot(actual)).toEqual(actual);
    expect(game.model.snapshot()).toEqual(actual);
  });

  it("finishing presentation releases only this pulse's delayed feedback", () => {
    const { game } = pulseGame();
    const unrelatedPulse = { targetId: "other", target: "block", kind: "ice", age: -10, presented: false };
    const unrelatedTransition = { targetId: "other-cover", kind: "shutter", age: -10 };
    game.mechanicPulses.push(unrelatedPulse);
    game.revisedTransitions.push(unrelatedTransition);
    game.useBooster("pulse");
    const ownedPulses = [...game.pulsePresentationPulses];
    const ownedTransitions = [...game.pulsePresentationTransitions];
    const before = game.model.snapshot();
    game.finishPulsePresentation();
    expect(game.pulseAnimation.isVisible).toBe(false);
    expect(unrelatedPulse).toMatchObject({ age: -10, presented: false });
    expect(unrelatedTransition.age).toBe(-10);
    for (const pulse of ownedPulses) expect(pulse).toMatchObject({ age: 0, presented: true });
    for (const transition of ownedTransitions) expect(transition.age).toBe(0);
    expect(game.model.snapshot()).toEqual(before);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
  });

  it("does not animate, charge or start a life when there is no reducible mechanism", () => {
    const { game, trigger } = pulseGame(fixture({ gates: [], flipDoors: [], shutters: [], blocks: [
      { id: "plain", color: "red", x: 0, y: 0, shape: [[0, 0]] },
    ] }));
    game.save.activeRun.lifeStarted = false;
    const before = game.model.snapshot(), saved = clone(game.save);
    game.useBooster("pulse");
    expect(trigger).not.toHaveBeenCalled();
    expect(game.pulseAnimation.isVisible).toBe(false);
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.playSound).not.toHaveBeenCalledWith("pulse");
  });

  it.each(["locked", "empty", "clock-blocked", "baseline-unavailable"])("does not start a pulse when %s", (reason) => {
    const { game, trigger } = pulseGame(fixture({ id: reason === "locked" ? 9 : 11 }));
    if (reason === "locked") game.save.highestLevel = 9;
    if (reason === "empty") game.save.boosters.pulse = 0;
    if (reason === "clock-blocked") game.advanceRevisedClockBeforeMutation.mockReturnValue(false);
    if (reason === "baseline-unavailable") {
      game.storageBaselineReady = false;
      game.save.activeRun.lifeStarted = false;
    }
    const before = game.model.snapshot(), saved = clone(game.save);
    game.useBooster("pulse");
    expect(trigger).not.toHaveBeenCalled();
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.playSound).not.toHaveBeenCalledWith("pulse");
  });

  it.each(["reject", "unknown-after-write"] as const)("waits for a %s life-start transaction before applying or animating", (mode) => {
    const { game, storage, trigger, thaw } = pulseGame();
    game.save.activeRun.lifeStarted = false;
    storage.value = clone(game.save);
    storage.mode = mode;
    const before = game.model.snapshot(), saved = clone(game.save);
    game.useBooster("pulse");
    expect(trigger).not.toHaveBeenCalled();
    expect(thaw).not.toHaveBeenCalled();
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save).toEqual(saved);
    const pending = game.pendingLifeStart;
    if (mode === "unknown-after-write") expect(pending).toBeDefined();
    expect(game.playSound).not.toHaveBeenCalledWith("pulse");
    storage.mode = "commit";
    game.useBooster("pulse");
    expect(trigger).toHaveBeenCalledOnce();
    expect(thaw).toHaveBeenCalledExactlyOnceWith(2);
    expect(game.save.lifeState.lives).toBe(3);
    expect(game.save.boosters.pulse).toBe(2);
    expect(game.save.activeRun.boosterSpent.pulse).toBe(1);
    if (pending) expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "pulse")).toHaveLength(1);
  });

  it.each([false, true])("respects the sound-effects setting with music disabled (sound=%s)", (sound) => {
    const { game } = pulseGame();
    game.save.sound = sound;
    game.save.music = false;
    game.playSound = (ColorEscapeGame.prototype as any).playSound;
    game.syncMusic = vi.fn();
    game.host.sound = vi.fn();
    game.useBooster("pulse");
    expect(game.model.getBlock("ice-five").frozen).toBe(3);
    expect(game.save.boosters.pulse).toBe(2);
    expect(game.host.sound.mock.calls).toEqual(sound ? [["pulse"]] : []);
  });

  it("does not play the success recording if the action fails to commit", () => {
    const { game, commit } = pulseGame();
    commit.mockReturnValue(false);
    game.useBooster("pulse");
    expect(game.playSound).not.toHaveBeenCalledWith("pulse");
  });
});

describe("Pulse presentation ownership and lifecycle", () => {
  it.each(["paused", "background", "booster-guide", "life-dialog", "life-save", "direct-transition"])("holds presentation during %s and resumes", (reason) => {
    const { game } = pulseGame();
    game.useBooster("pulse");
    game.updatePulseAnimation(0.1);
    if (reason === "paused") game.screen = "paused";
    if (reason === "background") game.appVisible = false;
    if (reason === "booster-guide") game.boosterUnlockGuide = {};
    if (reason === "life-dialog") game.lifeRefillOpen = true;
    if (reason === "life-save") game.pendingLifeStart = {};
    if (reason === "direct-transition") game.directLevelTransition = {};
    const before = game.model.snapshot(), saved = clone(game.save), sample = game.pulseAnimation.sample(false);
    game.updatePulseAnimation(100);
    expect(game.pulseAnimation.sample(false)).toEqual(sample);
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save).toEqual(saved);
    Object.assign(game, { screen: "playing", appVisible: true, boosterUnlockGuide: undefined,
      lifeRefillOpen: false, pendingLifeStart: undefined, directLevelTransition: undefined });
    game.updatePulseAnimation(0.1);
    expect(game.pulseAnimation.sample(false).age).toBeCloseTo(0.2);
  });

  it.each(["owner", "home", "failed", "complete"])("discards stale %s presentation without another model effect or write", (reason) => {
    const { game } = pulseGame();
    game.useBooster("pulse");
    const ownedPulses = [...game.pulsePresentationPulses];
    const ownedTransitions = [...game.pulsePresentationTransitions];
    if (reason === "owner") game.model = new PuzzleModel(fixture());
    if (reason === "home") game.screen = "home";
    if (reason === "failed") { game.model.startCountdown(); game.model.tick(61); }
    if (reason === "complete") {
      // Explicit terminal-state fixture; not a claimed complete solution route.
      const complete = new PuzzleModel(fixture({ gates: [], flipDoors: [], shutters: [], blocks: [
        { id: "last", color: "red", x: 0, y: 0, shape: [[0, 0]] },
      ] }));
      complete.removeBlockWithBooster("last");
      game.model.restore(complete.snapshot());
    }
    const before = game.model.snapshot(), saved = clone(game.save);
    game.updatePulseAnimation(100);
    expect(game.pulseAnimation.isVisible).toBe(false);
    expect(game.pulseAnimationOwner).toBeUndefined();
    expect(game.pulsePresentationPulses).toEqual([]);
    expect(game.pulsePresentationTransitions).toEqual([]);
    for (const pulse of ownedPulses) expect(game.mechanicPulses).not.toContain(pulse);
    for (const transition of ownedTransitions) expect(game.revisedTransitions).not.toContain(transition);
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
  });

  it.each([false, true])("clears presentation on loadLevel without refunding an ordinary pulse (play=%s)", (play) => {
    const { game } = pulseGame();
    game.useBooster("pulse");
    game.loadLevel(12, play);
    expect(game.pulseAnimation.isVisible).toBe(false);
    expect(game.pulseAnimationOwner).toBeUndefined();
    expect(game.model.level.id).toBe(12);
    expect(game.save.boosters.pulse).toBe(2);
    const before = game.model.snapshot();
    game.updatePulseAnimation(100);
    expect(game.model.snapshot()).toEqual(before);
  });

  it("clears presentation on a reset without undoing its committed model effect", () => {
    const { game } = pulseGame();
    game.useBooster("pulse");
    const before = game.model.snapshot(), saved = clone(game.save);
    game.resetPuzzlePresentation();
    expect(game.pulseAnimation.isVisible).toBe(false);
    expect(game.pulseAnimationOwner).toBeUndefined();
    expect(game.pulsePresentationPulses).toEqual([]);
    expect(game.pulsePresentationTransitions).toEqual([]);
    game.updatePulseAnimation(100);
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save).toEqual(saved);
  });

  it("keeps level and bomb clocks running while the presentation advances", () => {
    const { game, thaw } = pulseGame();
    game.model.startCountdown();
    game.useBooster("pulse");
    const before = game.model.snapshot();
    game.model.tick(0.5);
    game.updatePulseAnimation(0.5);
    expect(game.model.snapshot().remainingSeconds).toBeCloseTo(before.remainingSeconds - 0.5);
    expect(game.model.getBlock("bomb").timedBombSeconds).toBeCloseTo(29.5);
    expect(game.model.snapshot().timeFreezeSeconds).toBe(0);
    expect(game.pulseAnimation.isVisible).toBe(true);
    expect(thaw).toHaveBeenCalledOnce();
  });

  it("finishes only presentation before a board press and permits dragging the thawed block immediately", () => {
    const { game, thaw } = pulseGame(fixture({ gates: [], flipDoors: [], shutters: [], blocks: [
      { id: "ice-one", color: "red", x: 1, y: 1, shape: [[0, 0]], frozen: 1 },
      { id: "other", color: "blue", x: 4, y: 4, shape: [[0, 0]] },
    ] }));
    game.useBooster("pulse");
    const before = game.model.snapshot();
    const board = game.boardLayout();
    game.executePointerDown({ id: 1, x: board.innerX + 1.5 * board.cell, y: board.innerY + 1.5 * board.cell });
    expect(game.pulseAnimation.isVisible).toBe(false);
    expect(game.selectedId).toBe("ice-one");
    expect(game.activePointer).toBe(1);
    expect(game.dragVisual.blockId).toBe("ice-one");
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save.boosters.pulse).toBe(2);
    expect(thaw).toHaveBeenCalledOnce();
  });
});

describe("Pulse artwork focus integration", () => {
  const ice = { width: 95, height: 104, naturalWidth: 95, naturalHeight: 104 };
  const setArt = (game: any) => {
    game.art = { formalIceCell: ice, formalIceBlocks: { 1: ice }, iceStrips: {
      horizontal: { 1: { width: 94, height: 67 } },
      vertical: { 1: { width: 58, height: 111 } },
    } };
  };
  const captureCanvas = () => {
    const trace: Array<{ name: string; args: any[] }> = [];
    const methods: Record<string, (...args: any[]) => any> = {};
    const ctx = new Proxy({ globalAlpha: 1 }, {
      get(target: any, property: string) {
        if (property in target) return target[property];
        return methods[property] ??= (...args: any[]) => {
          trace.push({ name: property, args });
          if (property === "createRadialGradient") return { addColorStop: vi.fn() };
        };
      },
      set(target: any, property: string, value: any) { target[property] = value; return true; },
    });
    return { ctx, trace };
  };

  it.each([false, true])("only highlights the committed targets and never mutates counters while drawing (reduced=%s)", (reduced) => {
    const { game, commit, thaw } = pulseGame(fixture(), reduced);
    setArt(game);
    game.ctx = captureCanvas().ctx;
    game.useBooster("pulse");
    const targets = game.pulseAnimation.sample(reduced).targets;
    const targetSnapshot = clone(targets);
    const arrivals = targets.map((target: any) => game.pulseArrival(target));
    const highlights = game.pulseHighlightRects(targets);
    expect([...highlights.keys()].sort()).toEqual([
      "block:ice-five", "block:ice-one", "gate:ice-flip", "gate:ice-gate", "shutter:cover",
    ]);
    // The cover opens in the model immediately, but its newly visible ice did
    // not receive this pulse. A focus implementation must not rescan all ice.
    expect(game.model.snapshot().shutters.find((item: any) => item.id === "cover").revealed).toBe(true);
    expect(game.model.getBlock("hidden").frozen).toBe(5);
    for (const id of ["hidden", "lift-hidden", "key", "locked", "bomb", "shell", "lift-top"]) {
      expect(highlights.has(`block:${id}`)).toBe(false);
    }
    const after = game.model.snapshot(), saved = clone(game.save);
    for (let frame = 0; frame < 4; frame += 1) {
      game.updatePulseAnimation(reduced ? 0.04 : 0.2);
      game.drawPulsePresentation();
    }
    expect(game.model.snapshot()).toEqual(after);
    expect(game.save).toEqual(saved);
    expect(commit).toHaveBeenCalledOnce();
    expect(thaw).toHaveBeenCalledExactlyOnceWith(2);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
    expect(targets).toEqual(targetSnapshot);
    expect(targets.map((target: any) => game.pulseArrival(target))).toEqual(arrivals);
  });

  it("applies every board offset equally to the spotlight holes and the outline layer", () => {
    const { game } = pulseGame();
    setArt(game);
    const canvas = captureCanvas(); game.ctx = canvas.ctx;
    game.useBooster("pulse");
    game.updatePulseAnimation(0.69);
    game.directTransitionBoardOffset = () => 17;
    game.rocketImpact = { age: 0.04 };
    game.elapsed = 0.83;
    game.boardShakeTime = 0.09;
    const pulse = samplePulseShake(0.69, false), rocket = sampleRocketShake(0.04, false);
    const expected = {
      x: 17 + pulse.x + rocket.x + Math.sin(0.83 * 92) * 0.5 * 2.8,
      y: pulse.y + rocket.y + Math.cos(0.83 * 77) * 0.5 * 1.8,
    };
    expect(game.boardPresentationOffset().x).toBeCloseTo(expected.x);
    expect(game.boardPresentationOffset().y).toBeCloseTo(expected.y);
    const highlights = game.pulseHighlightRects(game.pulseAnimation.sample(false).targets);
    game.drawPulsePresentation();
    const layerTranslation = canvas.trace.find(call => call.name === "translate")!;
    expect(layerTranslation.args[0]).toBeCloseTo(expected.x);
    expect(layerTranslation.args[1]).toBeCloseTo(expected.y);
    const dim = canvas.trace.slice(0, canvas.trace.findIndex(call => call.name === "fill"))
      .filter(call => call.name === "rect").map(call => call.args);
    const pointIsDimmed = (x: number, y: number) => dim.some(([rx, ry, width, height]) => (
      x > rx && x < rx + width && y > ry && y < ry + height
    ));
    for (const rects of highlights.values()) for (const rect of rects) {
      expect(pointIsDimmed(rect.x + expected.x + rect.width / 2,
        rect.y + expected.y + rect.height / 2)).toBe(false);
    }
    const board = game.boardLayout();
    expect(pointIsDimmed(board.innerX + 2.5 * board.cell + expected.x,
      board.innerY + 0.5 * board.cell + expected.y)).toBe(true);
  });

  it("suppresses the three shake sources in reduced motion while preserving the scene transition", () => {
    const { game } = pulseGame(fixture(), true);
    game.useBooster("pulse");
    game.updatePulseAnimation(0.1);
    game.directTransitionBoardOffset = () => 17;
    game.rocketImpact = { age: 0.04 };
    game.elapsed = 0.83; game.boardShakeTime = 0.09;
    expect(game.boardPresentationOffset()).toEqual({ x: 17, y: 0 });
  });

  it.each([false, true])("projects dragging, settling and blocked feedback with the same matrix as the block (reduced=%s)", (reduced) => {
    const { game } = pulseGame(fixture(), reduced);
    setArt(game);
    game.useBooster("pulse");
    const block = game.model.getBlock("ice-five"), board = game.boardLayout();
    game.dragVisual = { blockId: block.id, x: block.x + 0.25, y: block.y + 0.5,
      settling: true, settleElapsed: 0.05, settleDuration: 0.1 };
    game.selectedId = block.id;
    game.grabFeedbackTime = 0.06;
    game.blockedBlockId = block.id; game.blockedFeedbackTime = 0.09;
    const transform = game.blockInteractionTransform(block, board, true);
    expect(transform.x).toBeCloseTo(11.25);
    expect(transform.y).toBeCloseTo(reduced ? 22 : 21.75);
    expect(transform.scale).toBeCloseTo(reduced ? 0.945 : 1.001953125 * 0.945);

    // Apply the real block draw transform to a simple affine canvas. This
    // catches a changed scale centre/order as well as a lost drag translation.
    let sx = 1, sy = 1, tx = 0, ty = 0;
    game.ctx = {
      translate: (x: number, y: number) => { tx += sx * x; ty += sy * y; },
      scale: (x: number, y: number) => { sx *= x; sy *= y; },
    };
    game.applyBlockInteractionTransform(block, board, true);
    const cells = game.model.blockCells(block);
    const raw = projectPulseBlockRects(cells, matchFormalBlockShapeForLevel(cells, game.model.level.id), board, ice, ice);
    const targets = game.pulseAnimation.sample(reduced).targets;
    const actual = game.pulseHighlightRects(targets).get(`block:${block.id}`);
    for (let index = 0; index < raw.length; index += 1) {
      expect(actual[index].x).toBeCloseTo(raw[index].x * sx + tx);
      expect(actual[index].y).toBeCloseTo(raw[index].y * sy + ty);
      expect(actual[index].width).toBeCloseTo(raw[index].width * sx);
      expect(actual[index].height).toBeCloseTo(raw[index].height * sy);
    }
  });
});

describe("Pulse level-10 rescue compatibility", () => {
  it("remembers an opening pulse and does not ask for another at count one", () => {
    const { game, storage } = pulseGame(getLevel(10));
    game.model.startCountdown();
    game.useBooster("pulse");
    expect(game.model.getBlock("cc-010-b1-15").frozen).toBe(23);
    expect(game.model.snapshot().pulseRescueUsed).toBe(true);
    expect(game.save.activeRun.boosterSpent.pulse).toBe(1);
    expect(storage.value.boosters.pulse).toBe(3);
    game.updatePulseAnimation(1.5);
    // Isolated UI boundary; the complete natural route is tested in level10PulseRescue.
    const boundary = game.model.snapshot();
    boundary.blocks.find((block: any) => block.id === "cc-010-b1-15")!.frozen = 1;
    game.model.restore(boundary);
    game.pulseRescueGuide = { phase: "booster", age: 0 };
    expect(game.pulseRescueGuideEligible()).toBe(false);
    game.updatePulseRescueGuide(1);
    expect(game.pulseRescueGuide).toBeUndefined();
    game.updatePulseRescueGuide(1);
    expect(game.pulseRescueGuide).toBeUndefined();
    expect(game.availablePulseStock()).toBe(2);
  });

  it("clears the booster guide without a target-hand phase and preserves deferred inventory", () => {
    const { game, storage } = pulseGame(getLevel(10));
    game.model.startCountdown();
    // Synthetic counter boundary without a previous pulse; not a solution route.
    const boundary = game.model.snapshot();
    boundary.blocks.find((block: any) => block.id === "cc-010-b1-15")!.frozen = 1;
    game.model.restore(boundary);
    game.updatePulseRescueGuide(0);
    expect(game.pulseRescueGuide?.phase).toBe("booster");
    game.useBooster("pulse");
    expect(game.pulseRescueGuide).toBeUndefined();
    expect(game.pulseAnimation.isVisible).toBe(true);
    expect(game.save.boosters.pulse).toBe(3);
    expect(storage.value.boosters.pulse).toBe(3);
    expect(game.save.activeRun.boosterSpent.pulse).toBe(1);
    expect(game.availablePulseStock()).toBe(2);
    game.updatePulseAnimation(1.5);
    game.updatePulseRescueGuide(1);
    expect(game.pulseRescueGuide).toBeUndefined();
    // Inspect the real candidate builder; this assertion does not claim a complete route.
    expect(game.createPendingSettlement().candidateSave.boosters.pulse).toBe(2);
  });
});
