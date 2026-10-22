// @ts-expect-error Node test tooling is outside app ambient types.
import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
// @ts-expect-error Reviewed build projection is a Node JavaScript module.
import { googlePlayInputPerformancePlugin, instrumentGooglePlayInputPerformance } from "../tools/google-play-input-performance-plugin.mjs";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { LEVELS } from "../src/core/levels";
import type { LevelSpec } from "../src/core/types";
import { usesImmediatePlayableClock, usesRevisedMechanisms } from "../src/core/mechanismRules";
import { PlayableClockSlices } from "../src/game/playableClockSlices";
import {
  advanceContinuousDragPose, candidateGridSteps, choosePortalReleaseCandidate,
  createContinuousCollisionValidator, isContinuousPoseAtPortal,
  matchingContinuousExitPortals, sweepContinuousPose,
} from "../src/game/continuousDrag";

const source: string = readFileSync("src/game/ColorEscapeGame.ts", "utf8").replace(/\r\n/g, "\n");
const projected: string = instrumentGooglePlayInputPerformance(source);
const tree = (text: string) => ts.createSourceFile("ColorEscapeGame.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
function methodMap(text: string): Map<string, string> {
  const file = tree(text);
  const declaration = file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "ColorEscapeGame") as ts.ClassDeclaration;
  return new Map(declaration.members.filter(ts.isMethodDeclaration).map(method => [method.name.getText(file), method.getText(file)]));
}
const originalMethods = methodMap(source);
const projectedMethods = methodMap(projected);

// Run the actual source methods, with the actual PuzzleModel and continuous
// collision functions. The omitted surface only records presentation effects;
// this harness neither reimplements nor stubs the input/model decisions.
function harness(text: string, level: LevelSpec, selectedId?: string) {
  let now = 1_000;
  const methods = methodMap(text);
  const names = ["handleMove", "syncDragGridCandidate", "captureAlignedExit", "moveBlockStepWithPresentation", "advanceRevisedClockBeforeMutation", "refreshActiveDragCollisionWorld"];
  const dependencies = {
    advanceContinuousDragPose, candidateGridSteps, choosePortalReleaseCandidate,
    createContinuousCollisionValidator, isContinuousPoseAtPortal,
    matchingContinuousExitPortals, sweepContinuousPose, usesRevisedMechanisms, usesImmediatePlayableClock,
    monotonicGameTime: () => now,
    DRAG_DEAD_ZONE: 5, DRAG_SWEEP_STEP: 0.08, DRAG_GRID_HYSTERESIS: 0.08,
    EXIT_CAPTURE_TOLERANCE: 0.14, BLOCKED_FEEDBACK_DURATION: 0.22,
  };
  const emitted = ts.transpileModule(`class Harness {\n${names.map(name => methods.get(name)).join("\n")}\n}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const Harness = new Function(...Object.keys(dependencies), `${emitted};return Harness;`)(...Object.values(dependencies));
  const game = new Harness();
  const model = new PuzzleModel(level, { deferExitCompletion: true });
  const block = selectedId ? model.getBlock(selectedId)! : model.snapshot().blocks.find(candidate => model.isBlockActive(candidate))!;
  expect(block).toBeDefined();
  const board = { innerX: 0, innerY: 0, cell: 100, innerWidth: level.width * 100, innerHeight: level.height * 100 };
  const effects: unknown[] = [];
  Object.assign(game, {
    model, screen: "playing", appVisible: true, activePointer: 1, selectedId: block.id,
    pointerDown: { x: 0, y: 0 }, pointerNow: { x: 0, y: 0 },
    save: { featureSeen: ["basics"] }, elapsed: 1, lastBlockedFeedbackAt: 0,
    playableClockSlices: new PlayableClockSlices(), runElapsedSeconds: 0,
    countdownWarning: { observe() {} }, currentProfileScroll: () => undefined,
    leagueScroll: { move: () => false }, updateLeaderboardScroll: () => false,
    scheduleFrame() {}, boardLayout: () => board,
    vibrate: (kind: string) => effects.push(["vibrate", kind]),
    emitMechanicFeedback: (before: unknown, after: unknown) => effects.push(["mechanics", before, after]),
    exitPortalFeedbackKey: (match: { gateId: string; portalIndex: number }) => `${match.gateId}:${match.portalIndex}`,
    pointerIsPastPortal: () => false,
    attemptExit: (side: "top" | "right" | "bottom" | "left") => {
      const result = model.tryExit(game.selectedId, side);
      effects.push(["exit", side, result]);
      if (result.ok) { game.selectedId = undefined; game.activePointer = undefined; }
    },
    dragVisual: {
      blockId: block.id, x: block.x, y: block.y, originX: block.x, originY: block.y,
      modelX: block.x, modelY: block.y, started: false, settling: false,
      exitFeedbackSides: new Set(), exitFeedbackPortalKeys: new Set(),
      isPoseValid: createContinuousCollisionValidator(model.snapshot(), block.id),
    },
  });
  model.startCountdown(); model.beginAction(); game.playableClockSlices.sample(now, true);
  let snapshots = 0;
  const snapshot = model.snapshot.bind(model);
  model.snapshot = () => { snapshots++; return snapshot(); };
  return {
    game,
    sample(x: number, y: number) { now += 8; game.handleMove({ id: 1, x, y }); },
    read: () => ({ state: snapshot(), visual: { x: game.dragVisual.x, y: game.dragVisual.y, started: game.dragVisual.started },
      pointerNow: game.pointerNow, selected: game.selectedId, effects, elapsed: game.runElapsedSeconds }),
    count: () => snapshots,
  };
}

const openLevel: LevelSpec = {
  id: 997, name: "input projection fixture", difficulty: "normal", timeSeconds: 180, reward: 0,
  width: 6, height: 6,
  gates: [{ id: "right-red", side: "right", offset: 1, size: 1, color: "red" }],
  blocks: [{ id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
};

describe("Google Play input allocation projection", () => {
  it("changes only the three read-query methods and the frame journey guard", () => {
    const changed = [...originalMethods].filter(([name, body]) => projectedMethods.get(name) !== body).map(([name]) => name).sort();
    expect(changed).toEqual(["captureAlignedExit", "frame", "syncDragGridCandidate"]);
    for (const name of ["handleMove", "handleUp", "handleCancel", "moveBlockStepWithPresentation", "advanceRevisedClockBeforeMutation", "updateDragSettle", "refreshActiveDragCollisionWorld"])
      expect(projectedMethods.get(name)).toBe(originalMethods.get(name));
    expect(projected).toContain("return { moved, exitPortals };");
    expect(projected).toContain("const probe = this.model.clone();");
  });

  it("refuses changed consumers, missing anchors and double projection", () => {
    expect(() => instrumentGooglePlayInputPerformance(source.replace("const moved = synced.moved;", "const moved = synced.exitPortals.length > 0;"))).toThrow();
    expect(() => instrumentGooglePlayInputPerformance(source + "\nthis.syncDragGridCandidate(other);\n")).toThrow();
    expect(() => instrumentGooglePlayInputPerformance(source.replace("const journeyBounds = this.journeyScrollBounds();", "const journeyBounds = changed();"))).toThrow();
    expect(() => instrumentGooglePlayInputPerformance(projected)).toThrow();
    const plugin = googlePlayInputPerformancePlugin();
    expect(plugin.transform(source, "/repo/src/game/OtherGame.ts")).toBeUndefined();
    expect(plugin.transform(source, "C:\\repo\\src\\game\\ColorEscapeGame.ts?query").code).toBe(projected);
  });

  it("preserves fractional, corner and wall-drag samples while reducing full snapshots", () => {
    const before = harness(source, openLevel), after = harness(projected, openLevel);
    const samples = [[1, 0], [3, 0], [7, 0], [12, 0], [20, 0], [29, 0], [38, 0], [49, 0], [58, 0], [65, 0], [65, 10], [65, 30], [65, 70], [45, 70], [-160, 70], [-170, 100], [-170, 60], [-120, 60]];
    for (const [x, y] of samples) { before.sample(x, y); after.sample(x, y); expect(after.read()).toEqual(before.read()); }
    expect(after.count()).toBeLessThan(before.count());
  });

  it("preserves the successful-step portal stop and near-half-cell capture", () => {
    const before = harness(source, openLevel), after = harness(projected, openLevel);
    for (const x of [6, 50, 58, 90, 150, 158, 200, 250, 258, 300, 350, 358, 400, 450]) {
      before.sample(x, 0); after.sample(x, 0); expect(after.read()).toEqual(before.read());
    }
    expect(after.read().effects.some((event: any) => event[0] === "exit" && event[2].ok)).toBe(true);
    expect(after.count()).toBeLessThan(before.count());
  });

  it.each([49, 139, 166])("preserves dense revised level %i input/model/timer results", (id) => {
    const level = LEVELS.find(candidate => candidate.id === id)!;
    const before = harness(source, level), after = harness(projected, level);
    for (const [x, y] of [[6, 0], [20, 0], [60, 0], [120, 0], [120, -40], [120, -120], [-40, -120], [-120, -120], [-120, 60], [0, 60], [0, 0]]) {
      before.sample(x, y); after.sample(x, y); expect(after.read()).toEqual(before.read());
    }
    expect(after.count()).toBeLessThan(before.count());
  });

  it("keeps journey animation predicates while skipping layout work in other screens", () => {
    function predicate(text: string) {
      const start = text.indexOf("    const journeyBounds = ");
      const end = text.indexOf("    const boardFxActive = ", start);
      return new Function(`${text.slice(start, end)}; return journeyScrollAnimating;`);
    }
    const original = predicate(source), optimized = predicate(projected);
    for (const screen of ["playing", "home", "supply", "settings", "levels"])
      for (const velocity of [0, 0.05, 1]) for (const offset of [-1, 0, 50, 101]) {
        let oldCalls = 0, newCalls = 0;
        const state = { screen, journeyScrollVelocity: velocity, journeyScrollOffset: offset };
        const oldResult = original.call({ ...state, journeyScrollBounds: () => { oldCalls++; return { min: 0, max: 100 }; } });
        const newResult = optimized.call({ ...state, journeyScrollBounds: () => { newCalls++; return { min: 0, max: 100 }; } });
        expect(newResult).toBe(oldResult);
        expect(oldCalls).toBe(1); expect(newCalls).toBe(screen === "levels" ? 1 : 0);
      }
  });
});
