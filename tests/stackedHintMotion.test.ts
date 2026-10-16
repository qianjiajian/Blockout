import { describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import {
  advanceStackedHints,
  createStackedHintMotion,
  STACKED_HINT_FADE,
  STACKED_HINT_GEOMETRY,
  STACKED_HINT_HOLD,
  stackedHintBackgroundAlpha,
  type StackedHintMotion,
} from "../src/game/stackedHintMotion";

const toReferencePixels = (logical: number) => logical * 34 / STACKED_HINT_GEOMETRY.height;
const entryTravelTime = 44 / 120;
const make = (id: string, previous?: StackedHintMotion, reduced = false) => ({
  ...createStackedHintMotion(previous, reduced), id,
});

function hintGame() {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.save = { highestLevel: 1, rewardedLevels: [], reducedMotion: false, language: "zh-CN" };
  game.appVisible = true;
  game.playSound = vi.fn();
  game.scheduleFrame = vi.fn();
  game.host = { storageSet: vi.fn(), storageRead: vi.fn() };
  return game;
}

describe("real game stacked lock hint integration", () => {
  it("appends repeated attempts through requireFeature without replacing the first animation or writing a save", () => {
    const game = hintGame(), originalSave = JSON.stringify(game.save);
    expect(game.requireFeature("levels")).toBe(false);
    const first = game.featureLockFeedback;
    game.updateButtonHints(0.4);
    expect(game.requireFeature("levels")).toBe(false);
    expect(game.featureLockFeedbacks).toHaveLength(2);
    expect(game.featureLockFeedbacks[0]).toBe(first);
    expect(first.age).toBeCloseTo(0.4, 10);
    expect(game.featureLockFeedback).toBe(game.featureLockFeedbacks[1]);
    expect(game.featureLockFeedback.age).toBe(0);
    game.updateButtonHints(0.1);
    expect(first.age).toBeCloseTo(0.5, 10);
    expect(game.featureLockFeedback.age).toBeCloseTo(0.1, 10);
    expect(game.playSound).toHaveBeenCalledTimes(2);
    expect(game.scheduleFrame).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(game.save)).toBe(originalSave);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.host.storageRead).not.toHaveBeenCalled();
  });

  it("pauses the whole stack in the background and resumes every message at its previous age", () => {
    const game = hintGame();
    game.requireFeature("levels");
    game.updateButtonHints(0.2);
    game.requireFeature("supply");
    game.updateButtonHints(0.1);
    const before = game.featureLockFeedbacks.map((entry: StackedHintMotion) => ({ ...entry }));
    game.appVisible = false;
    game.updateButtonHints(30);
    expect(game.featureLockFeedbacks).toEqual(before);
    game.appVisible = true;
    game.updateButtonHints(0.1);
    expect(game.featureLockFeedbacks).toHaveLength(2);
    expect(game.featureLockFeedbacks[0].age).toBeCloseTo(before[0].age + 0.1, 10);
    expect(game.featureLockFeedbacks[1].age).toBeCloseTo(before[1].age + 0.1, 10);
  });

  it("clears the whole stack when the requested feature has become unlocked", () => {
    const game = hintGame();
    game.requireFeature("levels");
    game.requireFeature("supply");
    expect(game.featureLockFeedbacks).toHaveLength(2);
    game.save.highestLevel = 11;
    expect(game.requireFeature("levels")).toBe(true);
    expect(game.featureLockFeedbacks).toEqual([]);
    expect(game.featureLockFeedback).toBeUndefined();
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("draws both formal panels independently and keeps the lettering opaque while an older panel fades", () => {
    const game = hintGame();
    const panels: { alpha: number; image: unknown; rect: number[] }[] = [];
    const labels: { alpha: number; text: string; x: number; y: number }[] = [];
    const stack: number[] = [];
    const ctx = {
      globalAlpha: 1,
      measureText(text: string) { return { width: text.length * 22 }; },
      save() { stack.push(this.globalAlpha); },
      restore() { this.globalAlpha = stack.pop()!; },
      drawImage(image: unknown, ...rect: number[]) { panels.push({ alpha: this.globalAlpha, image, rect }); },
    };
    const panel = { src: "assets/art/ui/formal-pages/supplied-popups-v1/scene/locked-hint-panel.png" };
    game.ctx = ctx;
    game.art = { lockedHintPanel: panel };
    game.tr = (_key: string, params: { level: number }) => `通关第${params.level}关解锁`;
    game.label = (text: string, x: number, y: number) => { labels.push({ alpha: ctx.globalAlpha, text, x, y }); };
    game.requireFeature("levels");
    game.updateButtonHints(0.2);
    game.requireFeature("supply");
    game.updateButtonHints(1.5);
    game.drawButtonHints();
    expect(panels).toHaveLength(2);
    expect(labels).toHaveLength(2);
    expect(panels[0].image).toBe(panel);
    expect(panels[1].image).toBe(panel);
    expect(panels[0].alpha).toBeCloseTo(0.5, 10);
    expect(panels[1].alpha).toBe(1);
    expect(labels.map(label => label.alpha)).toEqual([1, 1]);
    expect(labels.map(label => label.text)).toEqual(["通关第10关解锁", "通关第8关解锁"]);
    expect(labels[1].y - labels[0].y).toBeCloseTo(STACKED_HINT_GEOMETRY.pitch, 10);
    for (let index = 0; index < panels.length; index += 1) {
      const [x, y, width, height] = panels[index].rect;
      expect(width / height).toBeCloseTo(478 / 57, 10);
      expect(labels[index].x).toBeCloseTo(x + width / 2, 10);
      expect(labels[index].y).toBeCloseTo(y + height / 2, 10);
    }
    expect(ctx.globalAlpha).toBe(1);
    expect(stack).toEqual([]);
  });
});

describe("stacked lock hints from the reference video", () => {
  it("keeps the supplied bitmap ratio and uses the measured 36-pixel row spacing", () => {
    const { width, height, pitch, entryGap, speed } = STACKED_HINT_GEOMETRY;
    expect(width / height).toBeCloseTo(478 / 57, 10);
    expect(toReferencePixels(pitch)).toBeCloseTo(36, 10);
    expect(toReferencePixels(entryGap)).toBeCloseTo(8, 10);
    expect(toReferencePixels(speed)).toBeCloseTo(120, 10);
  });

  it("shows the first hint at the anchor and starts a later hint 44 reference pixels below", () => {
    const first = make("first");
    expect(first.offsetY).toBe(0);
    expect(first.age).toBe(0);
    expect(first.settledAge).toBe(0);
    const second = make("second", first);
    expect(toReferencePixels(second.offsetY)).toBeCloseTo(44, 10);
    expect(first.offsetY).toBe(0);
    expect(stackedHintBackgroundAlpha(first)).toBe(1);
    expect(stackedHintBackgroundAlpha(second)).toBe(1);
  });

  it("closes the 8-pixel entry gap before the new hint starts pushing the old one", () => {
    const first = make("first"), second = make("second", first);
    let entries = advanceStackedHints([first, second], 4 / 120);
    expect(toReferencePixels(first.offsetY)).toBeCloseTo(0, 10);
    expect(toReferencePixels(second.offsetY)).toBeCloseTo(40, 10);
    entries = advanceStackedHints(entries, 4 / 120);
    expect(toReferencePixels(first.offsetY)).toBeCloseTo(0, 10);
    expect(toReferencePixels(second.offsetY)).toBeCloseTo(36, 10);
    advanceStackedHints(entries, 12 / 120);
    expect(toReferencePixels(first.offsetY)).toBeCloseTo(-12, 10);
    expect(toReferencePixels(second.offsetY)).toBeCloseTo(24, 10);
  });

  it("arrives in 11 reference frames and moves the earlier row up exactly one pitch", () => {
    const first = make("first"), second = make("second", first);
    let entries = [first, second];
    for (let frame = 0; frame < 11; frame += 1) entries = advanceStackedHints(entries, 1 / 30);
    expect(toReferencePixels(first.offsetY)).toBeCloseTo(-36, 9);
    expect(second.offsetY).toBeCloseTo(0, 9);
    expect(first.age).toBeCloseTo(entryTravelTime, 9);
    expect(second.age).toBeCloseTo(entryTravelTime, 9);
    expect(second.settledAge).toBeCloseTo(0, 9);
  });

  it("preserves every earlier message and its elapsed lifetime when another appears", () => {
    const first = make("first");
    let entries = advanceStackedHints([first], 0.5);
    const second = make("second", first);
    entries.push(second);
    entries = advanceStackedHints(entries, entryTravelTime);
    const third = make("third", second);
    entries.push(third);
    entries = advanceStackedHints(entries, entryTravelTime);
    expect(entries[0]).toBe(first);
    expect(entries[1]).toBe(second);
    expect(entries[2]).toBe(third);
    expect(first.age).toBeCloseTo(0.5 + entryTravelTime * 2, 9);
    expect(first.settledAge).toBeCloseTo(first.age, 9);
    expect(second.age).toBeCloseTo(entryTravelTime * 2, 9);
    expect(entries.map(entry => Math.round(toReferencePixels(entry.offsetY)))).toEqual([-72, -36, 0]);
  });

  it("keeps separately arriving messages spaced apart during very rapid repeated taps", () => {
    let entries = [make("0")];
    for (let index = 1; index < 9; index += 1) {
      entries = advanceStackedHints(entries, 1 / 120);
      const newest = entries.at(-1)!;
      const next = make(String(index), newest);
      expect(next.offsetY - newest.offsetY).toBeGreaterThanOrEqual(STACKED_HINT_GEOMETRY.pitch);
      entries.push(next);
    }
    expect(entries.map(entry => entry.id)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8"]);
    for (let frame = 0; frame < 30; frame += 1) {
      const before = new Map(entries.map(entry => [entry.id, entry.offsetY]));
      entries = advanceStackedHints(entries, 1 / 30);
      for (let index = 0; index < entries.length; index += 1) {
        expect(entries[index].offsetY).toBeLessThanOrEqual(before.get(entries[index].id)! + 1e-9);
        if (index > 0) expect(entries[index].offsetY - entries[index - 1].offsetY)
          .toBeGreaterThanOrEqual(STACKED_HINT_GEOMETRY.pitch - 1e-9);
      }
    }
  });

  it("fades only the background during the final 0.4 seconds of its settled lifetime", () => {
    const entry = make("first");
    advanceStackedHints([entry], STACKED_HINT_HOLD - STACKED_HINT_FADE);
    expect(stackedHintBackgroundAlpha(entry)).toBeCloseTo(1, 10);
    advanceStackedHints([entry], STACKED_HINT_FADE / 2);
    expect(stackedHintBackgroundAlpha(entry)).toBeCloseTo(0.5, 10);
    advanceStackedHints([entry], STACKED_HINT_FADE / 2 - 0.001);
    expect(stackedHintBackgroundAlpha(entry)).toBeCloseTo(0.001 / STACKED_HINT_FADE, 9);
    expect(advanceStackedHints([entry], 0.002)).toHaveLength(0);
    expect(stackedHintBackgroundAlpha(entry)).toBe(0);
  });

  it("gives a travelling message its complete dwell time after reaching the anchor", () => {
    const first = make("first"), second = make("second", first);
    let entries = advanceStackedHints([first, second], entryTravelTime);
    expect(second.settledAge).toBeCloseTo(0, 10);
    entries = advanceStackedHints(entries, STACKED_HINT_HOLD - 0.001);
    expect(entries).toEqual([second]);
    expect(second.settledAge).toBeCloseTo(STACKED_HINT_HOLD - 0.001, 10);
    expect(advanceStackedHints(entries, 0.002)).toHaveLength(0);
  });

  it("does not drop surviving rows downward or restart them when the oldest disappears", () => {
    const first = make("first");
    let entries = advanceStackedHints([first], 0.8);
    const second = make("second", first);
    entries.push(second);
    entries = advanceStackedHints(entries, entryTravelTime);
    const third = make("third", second);
    entries.push(third);
    entries = advanceStackedHints(entries, entryTravelTime);
    const before = second.offsetY;
    const secondAge = second.age;
    entries = advanceStackedHints(entries, 0.4);
    expect(entries).toEqual([second, third]);
    expect(second.offsetY).toBeCloseTo(before, 10);
    expect(second.age).toBeCloseTo(secondAge + 0.4, 10);
    expect(third.offsetY).toBe(0);
  });

  it("produces the same travel and dwell times at 20, 30 and 60 frames per second", () => {
    const simulate = (fps: number) => {
      const first = make("first"), second = make("second", first);
      let entries = [first, second];
      for (let frame = 0; frame < fps; frame += 1) entries = advanceStackedHints(entries, 1 / fps);
      return entries;
    };
    const slow = simulate(20), normal = simulate(30), fast = simulate(60);
    for (let index = 0; index < 2; index += 1) {
      for (const entries of [slow, fast]) {
        expect(entries[index].offsetY).toBeCloseTo(normal[index].offsetY, 9);
        expect(entries[index].age).toBeCloseTo(normal[index].age, 9);
        expect(entries[index].settledAge).toBeCloseTo(normal[index].settledAge, 9);
        expect(stackedHintBackgroundAlpha(entries[index])).toBeCloseTo(stackedHintBackgroundAlpha(normal[index]), 9);
      }
    }
  });

  it("snaps to stacked positions for reduced motion while retaining each message and its lifetime", () => {
    const first = make("first", undefined, true);
    let entries = advanceStackedHints([first], 0.3, true);
    const second = make("second", first, true);
    entries.push(second);
    entries = advanceStackedHints(entries, 0, true);
    expect(first.offsetY).toBeCloseTo(-STACKED_HINT_GEOMETRY.pitch, 10);
    expect(second.offsetY).toBe(0);
    expect(first.age).toBeCloseTo(0.3, 10);
    entries = advanceStackedHints(entries, STACKED_HINT_HOLD - 0.2, true);
    expect(entries).toEqual([second]);
    expect(second.settledAge).toBeCloseTo(STACKED_HINT_HOLD - 0.2, 10);
    expect(advanceStackedHints(entries, 0.201, true)).toHaveLength(0);
  });
});
