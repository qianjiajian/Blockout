import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec, Side } from "../src/core/types";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { ComboAnimation } from "../src/game/comboAnimation";
import { createContinuousCollisionValidator } from "../src/game/continuousDrag";
import { CountdownWarning } from "../src/game/countdownWarning";
import { LeagueScroll } from "../src/game/leagueScroll";

const NOW = new Date("2026-10-09T08:00:00.000Z").getTime();

/** Sparse input/event fixture, never a formal level or difficulty certificate. */
const fixture = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 11, name: "combo input integration fixture", difficulty: "normal", reward: 0,
  mechanismRules: "revised-2026-09-27-v1.5", width: 8, height: 6, timeSeconds: 600,
  gates: [{ id: "red-exit", color: "red", side: "left", offset: 0, size: 1 }],
  blocks: [
    ...Array.from({ length: 6 }, (_, x) => ({ id: `red-${x}`, color: "red" as const, x, y: 0, shape: [[0, 0] as [number, number]] })),
    { id: "spare", color: "blue", x: 5, y: 4, shape: [[0, 0]] },
  ],
  ...overrides,
});

/** Real model, exit, move, release and cancel code; no real storage or render host. */
const comboGame = (level = fixture(), reducedMotion = false) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.comboAnimation = new ComboAnimation();
  game.countdownWarning = new CountdownWarning();
  game.leagueScroll = new LeagueScroll();
  game.save = game.sanitizeSave({ ...game.sanitizeSave(undefined), reducedMotion,
    currentLevel: level.id, highestLevel: level.id,
    activeRun: { levelId: level.id, returnLevelId: level.id, lifeStarted: true, daily: false,
      boosterSpent: { time: 0, rocket: 0, pulse: 0 } },
  });
  game.host = { storageSet: vi.fn(), storageRead: vi.fn(),
    viewport: () => ({ width: 496, height: 1078, safeTop: 0, safeBottom: 0, dpr: 1 }) };
  game.model = new PuzzleModel(level, { deferExitCompletion: true });
  Object.assign(game, { screen: "playing", appVisible: true, elapsed: 0, lastBlockedFeedbackAt: -1,
    artReady: true, storageBaselineReady: true, storageReadAttempts: 0 });
  game.boardLayout = () => ({ innerX: 40, innerY: 300, cell: 45,
    innerWidth: level.width * 45, innerHeight: level.height * 45 });
  game.advanceRevisedClockBeforeMutation = vi.fn(() => !game.model.snapshot().failed);
  game.tr = (key: string) => key;
  for (const method of ["playSound", "vibrate", "scheduleFrame", "captureGeneratorSpawns",
    "emitMechanicFeedback", "emitBurst", "requestWinArt", "releaseBoosterPurchaseArt"])
    game[method] = vi.fn();
  game.resetPuzzlePresentation();
  return game;
};

/** Begin at the same selected pose as pointerdown, then use the production sweep. */
const beginDrag = (game: any, id: string) => {
  const block = game.model.getBlock(id);
  expect(block).toBeDefined();
  const board = game.boardLayout();
  const point = { id: 7, x: board.innerX + (block.x + 0.5) * board.cell,
    y: board.innerY + (block.y + 0.5) * board.cell };
  game.activePointer = point.id;
  game.selectedId = id;
  game.pointerDown = { x: point.x, y: point.y };
  game.pointerNow = { x: point.x, y: point.y };
  game.dragVisual = { blockId: id, x: block.x, y: block.y, originX: block.x, originY: block.y,
    modelX: block.x, modelY: block.y, started: false, settling: false,
    exitFeedbackSides: new Set(), exitFeedbackPortalKeys: new Set(),
    settleFromX: block.x, settleFromY: block.y, settleToX: block.x, settleToY: block.y,
    settleElapsed: 0, settleDuration: 0.1,
    isPoseValid: createContinuousCollisionValidator(game.model.snapshot(), id) };
  game.model.beginAction();
  return point;
};

const exitDrag = (game: any, id: string, side: Side = "left") => {
  const point = beginDrag(game, id), board = game.boardLayout();
  const end = { ...point,
    x: side === "left" ? board.innerX - board.cell : point.x,
    y: side === "top" ? board.innerY - board.cell : point.y };
  game.handleMove(end);
  game.handleUp(end);
};
const firstThree = (game: any) => { for (let i = 0; i < 3; i += 1) exitDrag(game, `red-${i}`); };

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("consecutive committed exit feedback", () => {
  it.each([false, true])("advances at exits 3/4/5 and keeps Excellent thereafter (reduced=%s)", (reduced) => {
    const game = comboGame(fixture(), reduced), saved = clone(game.save);
    for (let i = 0; i < 6; i += 1) {
      exitDrag(game, `red-${i}`);
      expect(game.comboAnimation.count).toBe(i + 1);
      expect(game.model.getBlock(`red-${i}`)).toBeUndefined();
      if (i < 2) expect(game.comboAnimation.samples(reduced)).toEqual([]);
      else expect(game.comboAnimation.samples(reduced).at(-1)).toMatchObject({
        count: i + 1, tier: i === 2 ? "good" : i === 3 ? "great" : "excellent",
      });
    }
    expect(game.model.snapshot()).toMatchObject({ moves: 6, cleared: 6, complete: false });
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("counts one shell peel and the later body exit separately", () => {
    const game = comboGame(fixture({ gates: [
      { id: "red-exit", color: "red", side: "left", offset: 0, size: 1 },
      { id: "blue-exit", color: "blue", side: "top", offset: 0, size: 1 },
    ], blocks: [
      { id: "shell", color: "red", x: 0, y: 0, shape: [[0, 0]], layers: ["red", "blue"] },
      { id: "spare", color: "green", x: 5, y: 4, shape: [[0, 0]] },
    ] }));
    exitDrag(game, "shell");
    expect(game.comboAnimation.count).toBe(1);
    expect(game.model.getBlock("shell")).toMatchObject({ color: "blue", layers: ["blue"] });
    exitDrag(game, "shell", "top");
    expect(game.comboAnimation.count).toBe(2);
    expect(game.model.getBlock("shell")).toBeUndefined();
    expect(game.model.snapshot()).toMatchObject({ moves: 2, cleared: 2 });
  });

  it("counts a multi-cell sweep plus its exit once, even after duplicate release samples", () => {
    const game = comboGame(fixture({ blocks: [
      { id: "wide", color: "red", x: 4, y: 0, shape: [[0, 0], [1, 0]] },
      { id: "spare", color: "blue", x: 5, y: 4, shape: [[0, 0]] },
    ] }));
    const point = beginDrag(game, "wide");
    game.handleMove({ ...point, x: point.x - 90 });
    expect(game.model.getBlock("wide").x).toBe(2);
    expect(game.comboAnimation.count).toBe(0);
    const end = { ...point, x: 0 };
    game.handleMove(end);
    game.handleUp(end);
    game.handleUp(end);
    expect(game.comboAnimation.count).toBe(1);
    expect(game.model.snapshot()).toMatchObject({ moves: 1, cleared: 1 });
  });

  it("breaks on a committed non-clearing release, then starts the next exit at one", () => {
    const game = comboGame();
    firstThree(game);
    const point = beginDrag(game, "spare"), end = { ...point, x: point.x - 45 };
    game.handleMove(end);
    expect(game.comboAnimation.count).toBe(3);
    game.handleUp(end);
    expect(game.model.getBlock("spare").x).toBe(4);
    expect(game.model.snapshot().moves).toBe(4);
    expect(game.comboAnimation.count).toBe(0);
    exitDrag(game, "red-3");
    expect(game.comboAnimation.count).toBe(1);
  });

  it("leaves the chain unchanged for a failed exit, an idle click and an interrupted unaligned drag", () => {
    const game = comboGame();
    firstThree(game);
    game.selectedId = "spare";
    game.model.beginAction();
    const unchanged = game.model.snapshot();
    game.attemptExit("right");
    expect(game.model.snapshot()).toEqual(unchanged);
    expect(game.comboAnimation.count).toBe(3);
    game.model.cancelAction();
    let point = beginDrag(game, "spare");
    game.handleUp(point);
    expect(game.model.snapshot().moves).toBe(3);
    expect(game.comboAnimation.count).toBe(3);
    point = beginDrag(game, "spare");
    const interrupted = { ...point, x: point.x - 45 };
    game.handleMove(interrupted);
    expect(game.model.getBlock("spare").x).toBe(4);
    game.handleCancel(interrupted);
    expect(game.model.getBlock("spare").x).toBe(5);
    expect(game.model.snapshot().moves).toBe(3);
    expect(game.comboAnimation.count).toBe(3);
  });

  it("expires praise without a time limit on the chain", () => {
    const game = comboGame();
    firstThree(game);
    game.updateComboAnimation(100);
    expect(game.comboAnimation.samples(false)).toEqual([]);
    expect(game.comboAnimation.count).toBe(3);
    exitDrag(game, "red-3");
    expect(game.comboAnimation.samples(false).at(-1)).toMatchObject({ count: 4, tier: "great" });
  });
});

describe("combo ownership and lifecycle", () => {
  it.each(["paused", "background"])("holds age and count during %s, then resumes", (reason) => {
    const game = comboGame();
    firstThree(game);
    game.updateComboAnimation(0.1);
    const sample = game.comboAnimation.samples(false), before = game.model.snapshot();
    if (reason === "paused") game.screen = "paused";
    else game.appVisible = false;
    game.updateComboAnimation(100);
    expect(game.comboAnimation.count).toBe(3);
    expect(game.comboAnimation.samples(false)).toEqual(sample);
    Object.assign(game, { screen: "playing", appVisible: true });
    game.updateComboAnimation(0.1);
    expect(game.comboAnimation.samples(false)[0].age).toBeCloseTo(0.2);
    expect(game.model.snapshot()).toEqual(before);
  });

  it.each(["reset", "owner", "home", "failed", "result screen"])("clears count and praise on %s without a save write", (reason) => {
    const game = comboGame();
    firstThree(game);
    const saved = clone(game.save);
    if (reason === "reset") game.resetPuzzlePresentation();
    if (reason === "owner") game.model = new PuzzleModel(fixture());
    if (reason === "home") game.screen = "home";
    if (reason === "failed") { game.model.startCountdown(); game.model.tick(601); }
    if (reason === "result screen") game.screen = "win";
    const before = game.model.snapshot();
    game.updateComboAnimation(1);
    expect(game.comboAnimation.count).toBe(0);
    expect(game.comboAnimation.samples(false)).toEqual([]);
    expect(game.comboAnimationOwner).toBeUndefined();
    expect(game.model.snapshot()).toEqual(before);
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });
});
