import { describe, expect, it, vi } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { evaluateLevelStars } from "../src/core/levelStarConditions";
import type { LevelSpec } from "../src/core/types";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";

const clock = (remainingSeconds: number, overrides = {}) => ({
  started: true, remainingSeconds, timeFreezeSeconds: 0, complete: false, failed: false, ...overrides,
});
const step = (warning: CountdownWarning, before: number, after: number) => {
  warning.observe(clock(before), clock(after));
  warning.update(clock(after), true, before - after);
};
const animate = (warning: CountdownWarning, seconds: number, remaining = 9) => {
  for (let i = 0; i < Math.round(seconds * 100); i++) warning.update(clock(remaining), true, 0.01);
};

describe("countdown warning presentation", () => {
  it("starts the orange-red panel exactly at 30 seconds and breathes independently of the timer", () => {
    const warning = new CountdownWarning();
    step(warning, 31, 30.01);
    expect(warning.visual(clock(30.01), false).stage).toBe("normal");
    step(warning, 30.01, 30);
    const start = warning.visual(clock(30), false);
    expect(start).toMatchObject({ stage: "warning", panelColor: "#ff6337", digitScale: 1 });
    animate(warning, 0.6, 29.4);
    expect(warning.visual(clock(29.4), false).panelAlpha).toBeGreaterThan(start.panelAlpha);
    animate(warning, 0.6, 28.8);
    expect(warning.visual(clock(28.8), false).panelAlpha).toBeCloseTo(start.panelAlpha);
  });

  it("punches each displayed critical second once from 10 through 1", () => {
    const warning = new CountdownWarning();
    for (let second = 10; second >= 1; second--) {
      step(warning, second + 0.01, second);
      expect(warning.debug(clock(second), false)).toMatchObject({
        stage: "critical", punchSeconds: 0, lastPunchedSecond: second, pendingCritical: false,
      });
      animate(warning, 0.18, second - 0.18);
      expect(warning.visual(clock(second - 0.18), false)).toMatchObject({
        digitScale: 1.18, digitOffsetX: 4, digitOffsetY: -4,
      });
      animate(warning, 0.22, second - 0.4);
      expect(warning.debug(clock(second - 0.4), false)).toMatchObject({
        stage: "critical", digitScale: 1, punchSeconds: null, lastPunchedSecond: second,
      });
      for (const [before, after] of [[second - 0.4, second - 0.6], [second - 0.6, second - 0.99]]) {
        step(warning, before, after);
        expect(warning.debug(clock(after), false)).toMatchObject({
          lastPunchedSecond: second, pendingCritical: false, punchSeconds: null,
        });
      }
    }
    step(warning, 0.01, 0);
    expect(warning.debug(clock(0), false)).toMatchObject({
      lastPunchedSecond: 1, pendingCritical: false, punchSeconds: null,
    });
    const failed = clock(0, { failed: true });
    warning.observe(clock(0.01), failed);
    warning.update(failed, false, 0.01);
    expect(warning.debug(failed, false)).toMatchObject({
      stage: "normal", lastPunchedSecond: null, pendingCritical: false, punchSeconds: null,
    });
  });

  it("does not restart or repeat the punch while the displayed integer stays unchanged", () => {
    const warning = new CountdownWarning();
    step(warning, 10.01, 10);
    animate(warning, 0.18, 9.82);
    step(warning, 9.82, 9.81);
    expect(warning.debug(clock(9.81), false).punchSeconds).toBeCloseTo(0.19);
    animate(warning, 0.22, 9.59);
    step(warning, 9.59, 9.58);
    warning.observe(clock(9.58), clock(9.58));
    warning.update(clock(9.58), true, 0.01);
    expect(warning.debug(clock(9.58), false)).toMatchObject({
      lastPunchedSecond: 10, pendingCritical: false, punchSeconds: null, digitScale: 1,
    });
  });

  it("does not replay already punched seconds after undo or added time", () => {
    const warning = new CountdownWarning();
    for (const second of [10, 9, 8]) {
      step(warning, second + 0.01, second);
      animate(warning, 0.4, second - 0.4);
    }
    for (const [before, after] of [[20, 9.9], [9.9, 9], [9, 8]]) {
      step(warning, before, after);
      expect(warning.debug(clock(after), false)).toMatchObject({
        lastPunchedSecond: 8, pendingCritical: false, punchSeconds: null,
      });
    }
    step(warning, 8, 7);
    expect(warning.debug(clock(7), false)).toMatchObject({ lastPunchedSecond: 7, punchSeconds: 0 });
  });

  it("coalesces a single tick crossing both thresholds into one critical reminder", () => {
    const warning = new CountdownWarning();
    step(warning, 31, 9);
    expect(warning.debug(clock(9), false)).toMatchObject({
      stage: "critical", warningTriggered: true, criticalTriggered: true,
      pendingWarning: false, pendingCritical: false, punchSeconds: 0, lastPunchedSecond: 9,
    });
    animate(warning, 0.4);
    step(warning, 9, 5.2);
    expect(warning.debug(clock(5.2), false)).toMatchObject({
      lastPunchedSecond: 6, punchSeconds: 0, pendingCritical: false,
    });
    animate(warning, 0.4, 5.2);
    step(warning, 5.2, 5.1);
    expect(warning.debug(clock(5.1), false)).toMatchObject({
      lastPunchedSecond: 6, punchSeconds: null, pendingCritical: false,
    });
  });

  it("keeps the critical background breathing between digit punches", () => {
    const warning = new CountdownWarning();
    step(warning, 10.01, 10);
    const start = warning.visual(clock(10), false);
    expect(start).toMatchObject({ stage: "critical", panelColor: "#e52c41" });
    animate(warning, 0.6, 9.4);
    const peak = warning.visual(clock(9.4), false);
    expect(peak.panelAlpha).toBeGreaterThan(start.panelAlpha);
    expect(peak.digitScale).toBe(1);
    animate(warning, 0.6, 9.4);
    expect(warning.visual(clock(9.4), false).panelAlpha).toBeCloseTo(start.panelAlpha);
  });

  it.each(["pause", "hidden", "freeze"])("defers thresholds crossed before %s until countdown resumes", (reason) => {
    const warning = new CountdownWarning();
    warning.observe(clock(10.02), clock(9.99));
    const stopped = clock(9.99, { timeFreezeSeconds: reason === "freeze" ? 10 : 0 });
    for (let i = 0; i < 50; i++) warning.update(stopped, reason === "freeze", 0.05);
    expect(warning.debug(stopped, false)).toMatchObject({
      stage: "normal", pendingCritical: true, criticalTriggered: false, punchSeconds: null,
    });
    warning.update(clock(9.99), true, 0);
    expect(warning.debug(clock(9.99), false)).toMatchObject({ stage: "critical", punchSeconds: 0 });
  });

  it.each(["pause", "hidden", "freeze"])("defers the next 9-second punch during %s without advancing either animation", (reason) => {
    const warning = new CountdownWarning();
    step(warning, 10.01, 10);
    animate(warning, 0.4, 9.6);
    warning.observe(clock(9.01), clock(9));
    const stopped = clock(9, { timeFreezeSeconds: reason === "freeze" ? 10 : 0 });
    const before = warning.debug(stopped, false);
    for (let i = 0; i < 50; i++) warning.update(stopped, reason === "freeze", 0.05);
    expect(warning.debug(stopped, false)).toEqual(before);
    expect(before).toMatchObject({
      pendingCritical: true, pendingCriticalSecond: 9, lastPunchedSecond: 10, punchSeconds: null,
    });
    warning.update(clock(9), true, 0);
    expect(warning.debug(clock(9), false)).toMatchObject({
      pendingCritical: false, pendingCriticalSecond: null, lastPunchedSecond: 9, punchSeconds: 0,
    });
    animate(warning, 0.4, 8.6);
    step(warning, 8.6, 8.5);
    expect(warning.debug(clock(8.5), false).punchSeconds).toBeNull();
  });

  it("does not consume a deferred second after undo has restored an earlier displayed number", () => {
    const warning = new CountdownWarning();
    step(warning, 10.01, 10);
    animate(warning, 0.4, 9.6);
    warning.observe(clock(9.01), clock(9));
    warning.update(clock(9.5), true, 0.01);
    expect(warning.debug(clock(9.5), false)).toMatchObject({
      pendingCriticalSecond: 9, lastPunchedSecond: 10, punchSeconds: null,
    });
    step(warning, 9.01, 9);
    expect(warning.debug(clock(9), false)).toMatchObject({
      pendingCriticalSecond: null, lastPunchedSecond: 9, punchSeconds: 0,
    });
  });

  it.each(["pause", "hidden", "freeze"])("holds an in-flight animation during %s and continues it without restarting", (reason) => {
    const warning = new CountdownWarning();
    step(warning, 10.02, 9.99);
    animate(warning, 0.12);
    const stopped = clock(9, { timeFreezeSeconds: reason === "freeze" ? 10 : 0 });
    const before = warning.debug(stopped, false);
    for (let i = 0; i < 50; i++) warning.update(stopped, reason === "freeze", 0.05);
    expect(warning.debug(stopped, false)).toEqual(before);
    warning.update(clock(9), true, 0.01);
    expect(warning.debug(clock(9), false).punchSeconds).toBeCloseTo(0.13);
  });

  it("ignores unstarted time, frozen ticks and repeated snapshots", () => {
    const warning = new CountdownWarning();
    warning.observe(clock(31, { started: false }), clock(29, { started: false }));
    warning.observe(clock(10), clock(10, { timeFreezeSeconds: 10 }));
    warning.update(clock(10), true, 0.05);
    expect(warning.debug(clock(10), false)).toMatchObject({ stage: "normal", pendingWarning: false, pendingCritical: false });
  });

  it.each(["complete", "failed"])("clears all effects on %s even when update is inactive", (terminal) => {
    const warning = new CountdownWarning();
    step(warning, 10.02, 9.99);
    animate(warning, 0.12);
    const ended = clock(9, { [terminal]: true });
    expect(warning.visual(ended, false)).toMatchObject({ stage: "normal", panelAlpha: 0, digitScale: 1 });
    warning.update(ended, false, 0);
    expect(warning.debug(clock(9), false)).toEqual(new CountdownWarning().debug(clock(9), false));
  });

  it("clears pending reminders at termination and re-arms both thresholds for restart", () => {
    const warning = new CountdownWarning();
    warning.observe(clock(31), clock(9));
    warning.observe(clock(9), clock(0, { failed: true }));
    expect(warning.debug(clock(0), false).pendingCritical).toBe(false);
    step(warning, 31, 30);
    warning.reset();
    expect(warning.debug(clock(60), false)).toEqual(new CountdownWarning().debug(clock(60), false));
    step(warning, 31, 9);
    expect(warning.debug(clock(9), false)).toMatchObject({ criticalTriggered: true, lastPunchedSecond: 9, punchSeconds: 0 });
  });

  it("keeps warning colors but suppresses breathing and scaling for reduced motion", () => {
    const warning = new CountdownWarning();
    step(warning, 31, 30);
    const before = warning.visual(clock(30), true);
    animate(warning, 0.6, 29.4);
    expect(warning.visual(clock(29.4), true)).toEqual(before);
    step(warning, 10.01, 10);
    const critical = warning.visual(clock(10), true);
    expect(critical).toMatchObject({ stage: "critical", panelColor: "#e52c41", digitScale: 1 });
    expect(critical.digitOffsetX).toBeCloseTo(0);
    expect(critical.digitOffsetY).toBeCloseTo(0);
    animate(warning, 0.6, 9.4);
    expect(warning.visual(clock(9.4), true)).toEqual(critical);
    step(warning, 9.01, 9);
    animate(warning, 0.18, 8.82);
    expect(warning.visual(clock(8.82), true)).toEqual(critical);
  });
});

const fixture: LevelSpec = {
  id: 99130, name: "countdown warnings", difficulty: "normal", timeSeconds: 31, reward: 0,
  mechanismRules: "revised-2026-09-27-v1.5", width: 2, height: 2,
  gates: [{ id: "red-exit", color: "red", side: "left", offset: 0, size: 1 }],
  blocks: [{ id: "red", color: "red", x: 0, y: 0, shape: [[0, 0]] }],
};

describe("countdown warning integration", () => {
  it("does not mutate countdown, freeze, scoring or failure at either threshold", () => {
    const observed = new PuzzleModel(fixture);
    const control = new PuzzleModel(fixture);
    const warning = new CountdownWarning();
    observed.startCountdown();
    control.startCountdown();
    for (const delta of [1, 19.99, 0.02, 2, 10]) {
      if (delta === 2) { observed.freezeTime(1.5); control.freezeTime(1.5); }
      const before = observed.snapshot();
      observed.tick(delta);
      control.tick(delta);
      const after = observed.snapshot();
      warning.observe(before, after);
      warning.update(after, true, delta);
      expect(observed.snapshot()).toEqual(control.snapshot());
      const scoring = (model: PuzzleModel) => evaluateLevelStars(fixture, {
        moves: model.snapshot().moves, elapsedSeconds: fixture.timeSeconds - model.snapshot().remainingSeconds,
      });
      expect(scoring(observed)).toEqual(scoring(control));
    }
    expect(observed.snapshot().failed).toBe(true);
    expect(warning.debug(observed.snapshot(), false)).toMatchObject({ stage: "normal", pendingCritical: false });
  });

  it("captures a threshold crossed by the real pre-input clock flush before pause", () => {
    const model = new PuzzleModel(fixture);
    model.startCountdown();
    model.tick(20.99);
    const game = Object.create(ColorEscapeGame.prototype) as any;
    Object.assign(game, {
      model, screen: "playing", appVisible: true, runElapsedSeconds: 20.99,
      countdownWarning: new CountdownWarning(),
      playableClockSlices: { sample: () => 0.02 },
      scheduleFrame: vi.fn(),
    });
    expect(game.advanceRevisedClockBeforeMutation()).toBe(true);
    expect(model.snapshot().remainingSeconds).toBeCloseTo(9.99);
    expect(game.runElapsedSeconds).toBeCloseTo(21.01);
    game.countdownWarning.update(model.snapshot(), false, 0.05);
    expect(game.countdownWarning.debug(model.snapshot(), false)).toMatchObject({ pendingCritical: true, criticalTriggered: false });
    game.countdownWarning.update(model.snapshot(), true, 0);
    expect(game.countdownWarning.debug(model.snapshot(), false)).toMatchObject({ pendingCritical: false, criticalTriggered: true, punchSeconds: 0 });
  });
});
