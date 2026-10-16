import { describe, expect, it, vi } from "vitest";
import { sampleBoosterUnlockMotion, BOOSTER_UNLOCK_FLIGHT_DURATION } from "../src/game/boosterUnlockAnimation";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
const origin = { x: 360, y: 640, size: 148 }, target = { x: 360, y: 1378, size: 94 };
const arrivals = (game: any): number => game.playSound.mock.calls
  .filter(([kind]: [string]) => kind === "itemArrival").length;
const gameFixture = () => Object.assign(Object.create(ColorEscapeGame.prototype), {
  save: { reducedMotion: false, boosters: { time: 3, rocket: 3, pulse: 3 }, boosterUnlockSeen: [] },
  boosterUnlockGuide: { kind: "rocket", age: 0, duration: BOOSTER_UNLOCK_FLIGHT_DURATION },
  appVisible: true, screen: "playing", dirty: false,
  boosterUnlockGuideEligible() { return this.appVisible && this.screen === "playing"; },
  finishBoosterUnlockGuide: vi.fn(), playSound: vi.fn(), scheduleFrame: vi.fn(),
});
describe("reference booster unlock animation", () => {
  it("settles the oversized reveal and keeps it visible while waiting for input", () => {
    expect(sampleBoosterUnlockMotion(0, undefined, origin, target).iconScale).toBe(2.5);
    expect(sampleBoosterUnlockMotion(.45, undefined, origin, target).iconScale).toBe(1);
    expect(sampleBoosterUnlockMotion(60, undefined, origin, target).contentAlpha).toBe(1);
    const game = gameFixture();game.updateBoosterUnlockGuide(20);
    expect(game.finishBoosterUnlockGuide).not.toHaveBeenCalled();
    expect(game.boosterUnlockGuide.flightAge).toBeUndefined();
  });
  it("blocks early and repeated taps and never changes inventory", () => {
    const game = gameFixture();game.continueBoosterUnlockGuide();
    expect(game.boosterUnlockGuide.flightAge).toBeUndefined();
    game.updateBoosterUnlockGuide(.5);game.continueBoosterUnlockGuide();
    game.updateBoosterUnlockGuide(.3);game.continueBoosterUnlockGuide();
    expect(game.boosterUnlockGuide.flightAge).toBe(.3);
    expect(game.playSound).toHaveBeenCalledTimes(1);
    expect(game.save.boosters).toEqual({ time: 3, rocket: 3, pulse: 3 });
  });
  it("pauses both reveal and flight in background and acknowledges only after arrival", () => {
    const game = gameFixture();game.updateBoosterUnlockGuide(.5);game.continueBoosterUnlockGuide();
    game.appVisible = false;game.updateBoosterUnlockGuide(10);
    expect(game.boosterUnlockGuide.flightAge).toBe(0);
    expect(arrivals(game)).toBe(0);
    game.appVisible = true;game.updateBoosterUnlockGuide(1.4);
    expect(arrivals(game)).toBe(3);
    expect(game.finishBoosterUnlockGuide).not.toHaveBeenCalled();
    game.updateBoosterUnlockGuide(.3);expect(game.finishBoosterUnlockGuide).toHaveBeenCalledTimes(1);
    expect(arrivals(game)).toBe(3);
  });
  it("plays once when each of the three displayed copies reaches the booster slot", () => {
    const game = gameFixture();
    game.updateBoosterUnlockGuide(.5); game.continueBoosterUnlockGuide();
    expect(arrivals(game)).toBe(0);
    let age = 0;
    const advanceTo = (next: number) => { game.updateBoosterUnlockGuide(next - age); age = next; };
    for (const [index, time] of [1.19, 1.28, 1.37].entries()) {
      advanceTo(time - 0.0001);
      expect(arrivals(game)).toBe(index);
      expect(sampleBoosterUnlockMotion(2, age, origin, target).copies[index].y).toBeLessThan(target.y);
      advanceTo(time + 0.0001);
      expect(arrivals(game)).toBe(index + 1);
      expect(sampleBoosterUnlockMotion(2, age, origin, target).copies[index].y).toBeCloseTo(target.y);
      game.updateBoosterUnlockGuide(0);
      expect(arrivals(game)).toBe(index + 1);
    }
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind !== "itemArrival")).toHaveLength(1);
    expect(game.save.boosters).toEqual({ time: 3, rocket: 3, pulse: 3 });
  });
  it("plays all three arrivals once when a frame passes several endpoints", () => {
    const game = gameFixture();
    game.updateBoosterUnlockGuide(.5); game.continueBoosterUnlockGuide();
    game.updateBoosterUnlockGuide(10);
    expect(arrivals(game)).toBe(3);
    game.updateBoosterUnlockGuide(0);
    expect(arrivals(game)).toBe(3);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind !== "itemArrival")).toHaveLength(1);
  });
  it("splits three copies, staggers their arrival and fades after the final landing", () => {
    const split = sampleBoosterUnlockMotion(2, .5, origin, target);
    expect(split.copies).toHaveLength(3);
    expect(new Set(split.copies.map(c => c.x)).size).toBe(3);
    expect(split.copies.every(c => c.y < 750 && c.alpha === 1)).toBe(true);
    const first = sampleBoosterUnlockMotion(2, 1.2, origin, target);
    expect(first.copies[0].y).toBe(target.y);expect(first.copies[2].y).toBeLessThan(target.y);
    const end = sampleBoosterUnlockMotion(2, 1.65, origin, target);
    expect(end.overlayAlpha).toBeCloseTo(0);expect(end.copies.every(c => c.alpha === 0)).toBe(true);
  });
  it("honors reduced motion with explicit input and a short fade", () => {
    const game = gameFixture();game.save.reducedMotion = true;game.continueBoosterUnlockGuide();
    game.updateBoosterUnlockGuide(.2);expect(game.finishBoosterUnlockGuide).toHaveBeenCalledOnce();
    expect(sampleBoosterUnlockMotion(0, .1, origin, target, true).copies).toEqual([]);
    expect(arrivals(game)).toBe(0);
  });
});
