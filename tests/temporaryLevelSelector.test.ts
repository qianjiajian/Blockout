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
import { FORMAL_201_210_LEVELS, FORMAL_211_220_LEVELS, FORMAL_221_230_LEVELS, LEVELS, getLevelStrict } from "../src/core/levels";
import { FORMAL_231_240_LEVELS } from "../src/core/formal231to240Data";
import {
  TEMPORARY_TEST_LEVEL_COUNT,
  TEMPORARY_TEST_LEVEL_IDS,
  getAdjacentTemporaryTestLevelId,
  getTemporaryTestLevelStrict,
} from "../src/game/temporaryTestLevelCatalog";

const expectedTemporaryIds = [...Array.from({ length: 230 }, (_, index) => index + 1), ...FORMAL_231_240_LEVELS.map(level => level.id)];

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

  it("lists exactly production 1–200 and the accepted continuation registries", () => {
    expect(TEMPORARY_TEST_LEVEL_IDS).toEqual(expectedTemporaryIds);
    expect(TEMPORARY_TEST_LEVEL_COUNT).toBe(expectedTemporaryIds.length);
    expect(TEMPORARY_TEST_LEVEL_COUNT).toBe(TEMPORARY_TEST_LEVEL_IDS.length);
    expect(new Set(TEMPORARY_TEST_LEVEL_IDS).size).toBe(expectedTemporaryIds.length);
    const displayedIds = Array.from({ length: temporaryLevelSelectorPageCount(TEMPORARY_TEST_LEVEL_IDS) }, (_, page) => (
      temporaryLevelSelectorLayout(TEMPORARY_TEST_LEVEL_IDS, page).cells.map((cell) => cell.levelId)
    )).flat();
    expect(displayedIds).toEqual(expectedTemporaryIds);
  });

  it("places 211–220 on page eleven and 221 onward on page twelve", () => {
    expect(temporaryLevelSelectorPageCount(TEMPORARY_TEST_LEVEL_IDS)).toBe(12);
    expect(temporaryLevelSelectorPageForLevel(200, TEMPORARY_TEST_LEVEL_IDS)).toBe(9);
    expect(temporaryLevelSelectorPageForLevel(201, TEMPORARY_TEST_LEVEL_IDS)).toBe(10);
    expect(temporaryLevelSelectorPageForLevel(210, TEMPORARY_TEST_LEVEL_IDS)).toBe(10);
    expect(temporaryLevelSelectorPageForLevel(211, TEMPORARY_TEST_LEVEL_IDS)).toBe(10);
    expect(temporaryLevelSelectorPageForLevel(220, TEMPORARY_TEST_LEVEL_IDS)).toBe(10);
    expect(temporaryLevelSelectorPageForLevel(221, TEMPORARY_TEST_LEVEL_IDS)).toBe(11);
    expect(temporaryLevelSelectorPageForLevel(230, TEMPORARY_TEST_LEVEL_IDS)).toBe(11);
    expect(clampTemporaryLevelSelectorPage(-1, TEMPORARY_TEST_LEVEL_IDS)).toBe(0);
    expect(clampTemporaryLevelSelectorPage(99, TEMPORARY_TEST_LEVEL_IDS)).toBe(11);
    const eleventh = temporaryLevelSelectorLayout(TEMPORARY_TEST_LEVEL_IDS, 10, 211);
    expect(eleventh).toMatchObject({ page: 10, pageCount: 12, canPrevious: true, canNext: true });
    expect(eleventh.cells.map((cell) => cell.levelId)).toEqual(expectedTemporaryIds.slice(200, 220));
    expect(eleventh.cells.filter((cell) => cell.selected)).toMatchObject([{ slotIndex: 10, levelId: 211 }]);
    expect(eleventh.cells.map((cell) => cell.rect)).toEqual(temporaryLevelSelectorLayout(200, 0).cells.map((cell) => cell.rect));
    const layout = temporaryLevelSelectorLayout(TEMPORARY_TEST_LEVEL_IDS, 99, 230);
    expect(layout).toMatchObject({ page: 11, pageCount: 12, canPrevious: true, canNext: false });
    expect(layout.cells.map((cell) => cell.levelId)).toEqual(expectedTemporaryIds.slice(220));
    expect(layout.cells.filter((cell) => cell.selected)).toMatchObject([{ slotIndex: 9, levelId: 230 }]);
    expect(temporaryLevelSelectorLevelAt(10, 9, TEMPORARY_TEST_LEVEL_IDS)).toBe(210);
    expect(temporaryLevelSelectorLevelAt(10, 10, TEMPORARY_TEST_LEVEL_IDS)).toBe(211);
    expect(temporaryLevelSelectorLevelAt(10, 19, TEMPORARY_TEST_LEVEL_IDS)).toBe(220);
    expect(temporaryLevelSelectorLevelAt(10, 20, TEMPORARY_TEST_LEVEL_IDS)).toBeUndefined();
    expect(temporaryLevelSelectorLevelAt(11, 0, TEMPORARY_TEST_LEVEL_IDS)).toBe(221);
    expect(temporaryLevelSelectorLevelAt(11, 9, TEMPORARY_TEST_LEVEL_IDS)).toBe(230);
    expect(temporaryLevelSelectorLevelAt(11, 10, TEMPORARY_TEST_LEVEL_IDS)).toBe(231);
    expect(temporaryLevelSelectorLevelAt(11, expectedTemporaryIds.length - 220, TEMPORARY_TEST_LEVEL_IDS)).toBeUndefined();
  });

  it("uses explicit catalog positions for a sparse final page and leaves an empty catalog empty", () => {
    const sparseIds = [...Array.from({ length: 20 }, (_, index) => index + 1), 230] as const;
    expect(temporaryLevelSelectorPageCount(sparseIds)).toBe(2);
    expect(temporaryLevelSelectorPageForLevel(230, sparseIds)).toBe(1);
    const layout = temporaryLevelSelectorLayout(sparseIds, 1, 230);
    expect(layout).toMatchObject({ page: 1, pageCount: 2, canPrevious: true, canNext: false });
    expect(layout.cells).toMatchObject([{ slotIndex: 0, levelId: 230, selected: true }]);
    expect(layout.cells).toHaveLength(1);
    expect(temporaryLevelSelectorLevelAt(1, 1, sparseIds)).toBeUndefined();
    expect(temporaryLevelSelectorPageCount([])).toBe(1);
    expect(temporaryLevelSelectorLayout([], 1).cells).toEqual([]);
    expect(temporaryLevelSelectorLevelAt(0, 0, [])).toBeUndefined();
  });

  it("resolves current formal continuation objects without widening production", () => {
    expect(LEVELS).toHaveLength(200);
    expect(getTemporaryTestLevelStrict(1)).toBe(LEVELS[0]);
    expect(getTemporaryTestLevelStrict(200)).toBe(getLevelStrict(200));
    for (let id = 201; id <= 210; id += 1) {
      expect(getTemporaryTestLevelStrict(id)).toBe(FORMAL_201_210_LEVELS[id - 201]);
      expect(() => getLevelStrict(id)).toThrow(RangeError);
    }
    for (let id = 211; id <= 220; id += 1) {
      expect(getTemporaryTestLevelStrict(id)).toBe(FORMAL_211_220_LEVELS[id - 211]);
      expect(() => getLevelStrict(id)).toThrow(RangeError);
    }
    for (let id = 221; id <= 230; id += 1) {
      expect(getTemporaryTestLevelStrict(id)).toBe(FORMAL_221_230_LEVELS[id - 221]);
      expect(() => getLevelStrict(id)).toThrow(RangeError);
    }
    for (const level of FORMAL_231_240_LEVELS) {
      expect(getTemporaryTestLevelStrict(level.id)).toBe(level);
      expect(() => getLevelStrict(level.id)).toThrow(RangeError);
    }
    for (const invalid of [0, 241, 201.5, 211.5, 229.5, NaN, Infinity]) {
      expect(() => getTemporaryTestLevelStrict(invalid)).toThrow(RangeError);
    }
  });

  it("navigates adjacent formal batches and stops at both ends", () => {
    for (const [index, id] of expectedTemporaryIds.entries()) {
      expect(getAdjacentTemporaryTestLevelId(id, -1)).toBe(expectedTemporaryIds[Math.max(0, index - 1)]);
      expect(getAdjacentTemporaryTestLevelId(id, 1)).toBe(expectedTemporaryIds[Math.min(expectedTemporaryIds.length - 1, index + 1)]);
    }
    expect(getAdjacentTemporaryTestLevelId(210, 1)).toBe(211);
    expect(getAdjacentTemporaryTestLevelId(211, -1)).toBe(210);
    expect(getAdjacentTemporaryTestLevelId(220, 1)).toBe(221);
    expect(getAdjacentTemporaryTestLevelId(221, -1)).toBe(220);
    expect(getAdjacentTemporaryTestLevelId(230, 1)).toBe(231);
    expect(getAdjacentTemporaryTestLevelId(expectedTemporaryIds.at(-1)!, 1)).toBe(expectedTemporaryIds.at(-1));
    expect(getAdjacentTemporaryTestLevelId(1, -1)).toBe(1);
    for (const invalid of [0, 241, 211.5, 221.5, NaN]) {
      expect(() => getAdjacentTemporaryTestLevelId(invalid, -1)).toThrow(RangeError);
      expect(() => getAdjacentTemporaryTestLevelId(invalid, 1)).toThrow(RangeError);
    }
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
