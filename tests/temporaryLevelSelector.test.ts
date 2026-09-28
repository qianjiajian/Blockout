import { describe, expect, it } from "vitest";
import { expandInteractionTarget, MINIMUM_INTERACTION_TARGET_CSS } from "../src/game/hitTargets";
import {
  TEMPORARY_LEVEL_SELECTOR_COLUMN_PITCH,
  TEMPORARY_LEVEL_SELECTOR_HOME_ART_RECT,
  TEMPORARY_LEVEL_SELECTOR_HOME_RECT,
  TEMPORARY_LEVEL_SELECTOR_PAGE_SIZE,
  TEMPORARY_LEVEL_SELECTOR_ROW_PITCH,
  clampTemporaryLevelSelectorPage,
  temporaryLevelSelectorLayout,
  temporaryLevelSelectorLevelAt,
  temporaryLevelSelectorPageCount,
  temporaryLevelSelectorPageForLevel,
} from "../src/game/temporaryLevelSelector";

const intersects = (
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
): boolean => (
  left.x < right.x + right.width
  && left.x + left.width > right.x
  && left.y < right.y + right.height
  && left.y + left.height > right.y
);

describe("temporary level selector geometry", () => {
  it("uses twenty levels per four-by-five page and maps all 200 levels", () => {
    expect(TEMPORARY_LEVEL_SELECTOR_PAGE_SIZE).toBe(20);
    expect(temporaryLevelSelectorPageCount(200)).toBe(10);
    expect(temporaryLevelSelectorPageForLevel(1, 200)).toBe(0);
    expect(temporaryLevelSelectorPageForLevel(20, 200)).toBe(0);
    expect(temporaryLevelSelectorPageForLevel(21, 200)).toBe(1);
    expect(temporaryLevelSelectorPageForLevel(200, 200)).toBe(9);

    const levels = Array.from({ length: 10 }, (_, page) => (
      temporaryLevelSelectorLayout(200, page).cells.map((cell) => cell.levelId)
    )).flat();
    expect(levels).toEqual(Array.from({ length: 200 }, (_, index) => index + 1));
  });

  it("clamps pages and exposes only populated cells on the final page", () => {
    expect(temporaryLevelSelectorPageCount(0)).toBe(1);
    expect(clampTemporaryLevelSelectorPage(-5, 41)).toBe(0);
    expect(clampTemporaryLevelSelectorPage(99, 41)).toBe(2);
    expect(temporaryLevelSelectorLevelAt(2, 0, 41)).toBe(41);
    expect(temporaryLevelSelectorLevelAt(2, 1, 41)).toBeUndefined();
    expect(temporaryLevelSelectorLevelAt(2, 20, 41)).toBeUndefined();

    const layout = temporaryLevelSelectorLayout(41, 99, 41);
    expect(layout).toMatchObject({ page: 2, pageCount: 3, canPrevious: true, canNext: false });
    expect(layout.cells).toHaveLength(1);
    expect(layout.cells[0]).toMatchObject({ slotIndex: 0, levelId: 41, selected: true });
  });

  it("keeps the temporary Home entry in the intended left-side gap", () => {
    expect(TEMPORARY_LEVEL_SELECTOR_HOME_ART_RECT).toEqual({ x: 16, y: 820, width: 196, height: 64 });
    expect(TEMPORARY_LEVEL_SELECTOR_HOME_RECT.x).toBeCloseTo(11.0222, 3);
    expect(TEMPORARY_LEVEL_SELECTOR_HOME_RECT.y).toBeCloseTo(558.2889, 3);
    expect(TEMPORARY_LEVEL_SELECTOR_HOME_RECT.width).toBeCloseTo(135.0222, 3);
    expect(TEMPORARY_LEVEL_SELECTOR_HOME_RECT.height).toBeCloseTo(44.0889, 3);
  });

  it("keeps every expanded modal target disjoint on a 320x568-class screen", () => {
    const shortScreenScale = 568 / 1078;
    const layout = temporaryLevelSelectorLayout(200, 0, 1);
    const visualTargets = [
      layout.close,
      ...layout.cells.map((cell) => cell.rect),
      layout.previousPage,
      layout.nextPage,
      layout.start,
      layout.exit,
    ];
    const hitTargets = visualTargets.map((rect) => expandInteractionTarget(rect, shortScreenScale));

    expect(TEMPORARY_LEVEL_SELECTOR_COLUMN_PITCH).toBeGreaterThanOrEqual(84);
    expect(TEMPORARY_LEVEL_SELECTOR_ROW_PITCH).toBeGreaterThanOrEqual(84);
    for (const hit of hitTargets) {
      expect(hit.width * shortScreenScale).toBeGreaterThanOrEqual(MINIMUM_INTERACTION_TARGET_CSS);
      expect(hit.height * shortScreenScale).toBeGreaterThanOrEqual(MINIMUM_INTERACTION_TARGET_CSS);
      expect(hit.x).toBeGreaterThanOrEqual(layout.panel.x);
      expect(hit.y).toBeGreaterThanOrEqual(layout.panel.y);
      expect(hit.x + hit.width).toBeLessThanOrEqual(layout.panel.x + layout.panel.width);
      expect(hit.y + hit.height).toBeLessThanOrEqual(layout.panel.y + layout.panel.height);
    }
    for (let left = 0; left < hitTargets.length; left += 1) {
      for (let right = left + 1; right < hitTargets.length; right += 1) {
        expect(intersects(hitTargets[left], hitTargets[right]), `${left} overlaps ${right}`).toBe(false);
      }
    }
  });
});
