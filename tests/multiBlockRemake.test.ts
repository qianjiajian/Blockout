// @ts-expect-error Node APIs are available in Vitest, not the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS_BEFORE_RHYTHM_REMAKE as LEVELS, LEVELS_BEFORE_MULTI_BLOCK_REMAKE } from "../src/core/levels";
import { MULTI_BLOCK_REMAKE_IDS } from "../src/core/multiBlockRemake";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { levelStarTargets } from "../src/core/levelStarConditions";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import type { LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/multi-block-remake.json", import.meta.url), "utf8")) as {
  rows: { id: number; level: LevelSpec; drags: RevisedSearchDrag[]; lowerBound: number }[];
};
const expectedIds = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
// Historical v1.21 certificates stay bound to their own data stage. Final
// production lookup and v1.27 routes are tested in rhythmRemake.test.ts.
const getLevelStrict = (id: number): LevelSpec => LEVELS[id - 1]!;
const remade = new Set<number>(MULTI_BLOCK_REMAKE_IDS);
const physicalBoard = (level: LevelSpec) => [level.width, level.height, level.playable, level.blocked, level.seams];
const requiredFloor = (id: number) => id % 10 === 0 ? 20 : [3, 5, 8].includes(id % 10) ? 15 : 10;

describe("historical v1.21 21–30 multi-block mechanism-combination remake", () => {
  it("changes exactly the ten authorized layouts and preserves all other 190 object identities", () => {
    expect(MULTI_BLOCK_REMAKE_IDS).toEqual(expectedIds);
    expect(fixture.rows.map(row => row.id)).toEqual(expectedIds);
    expect(LEVELS).toHaveLength(200);
    expect(LEVELS_BEFORE_MULTI_BLOCK_REMAKE).toHaveLength(200);
    const changedIds: number[] = [];
    for (const [index, level] of LEVELS.entries()) {
      const previous = LEVELS_BEFORE_MULTI_BLOCK_REMAKE[index]!;
      expect(level.id).toBe(index + 1);
      expect(() => validateLevel(level)).not.toThrow();
      expect(getLevelStrict(level.id)).toBe(level);
      if (remade.has(level.id)) {
        expect(level).not.toEqual(previous);
        changedIds.push(level.id);
      } else expect(level).toBe(previous);
    }
    expect(changedIds).toEqual(expectedIds);
  });

  it("preserves every physical board, time, reward, difficulty and actual star target across all 200 levels", () => {
    for (const [index, level] of LEVELS.entries()) {
      const previous = LEVELS_BEFORE_MULTI_BLOCK_REMAKE[index]!;
      expect(physicalBoard(level)).toEqual(physicalBoard(previous));
      for (const field of ["name", "difficulty", "timeSeconds", "reward"] as const) {
        expect(level[field]).toEqual(previous[field]);
      }
      expect(levelStarTargets(level)).toEqual(levelStarTargets(previous));
    }
    expect(levelStarTargets(getLevelStrict(29)).moveTarget).toBe(204);
  });

  for (const row of fixture.rows) {
    it(`completes final formal Lv${row.id} through the pinned no-booster route, with mostly multi-cell repositioning`, () => {
      const level = getLevelStrict(row.id);
      expect(level).toBe(LEVELS[row.id - 1]);
      expect(level).toEqual(row.level);
      expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
      expect(Number.isSafeInteger(row.lowerBound)).toBe(true);
      expect(row.lowerBound).toBeGreaterThanOrEqual(requiredFloor(row.id));
      const replay = replayRevisedRoute(level, row.drags);
      expect(replay).toMatchObject({ valid: true, complete: true, effectiveDrags: row.drags.length });
      expect(replay.nonClearingDrags).toBeGreaterThanOrEqual(row.lowerBound);
      // This only checks the stored witness against the certified threshold.
      // Independent graph exhaustion in the adoption verifier proves the bound;
      // a passing route is not evidence that its count is the exact minimum.
      const model = new PuzzleModel(level);
      model.startCountdown();
      let singleCellDrags = 0;
      let multiCellDrags = 0;
      for (const drag of row.drags) {
        const block = model.getBlock(drag.blockId)!;
        expect(block).toBeDefined();
        const area = block.shape.length;
        const cleared = model.snapshot().cleared;
        model.beginAction();
        for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
        if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
        expect(model.commitAction()).toBe(true);
        if (model.snapshot().cleared === cleared) {
          if (area === 1) singleCellDrags++;
          else multiCellDrags++;
        }
      }
      expect(model.snapshot()).toMatchObject({ complete: true, failed: false, timeFreezeSeconds: 0 });
      expect(singleCellDrags + multiCellDrags).toBe(replay.nonClearingDrags);
      // Internal candidate-selection safeguard for this design pass, not a new
      // permanent gameplay rule or a substitute for decision/human review.
      expect(multiCellDrags).toBeGreaterThan(singleCellDrags);
    });
  }

  it("covers every opening playable cell with a visible body or a real unopened curtain and keeps neighbors differently colored", () => {
    for (const id of expectedIds) {
      const snapshot = new PuzzleModel(getLevelStrict(id)).snapshot();
      const occupied = new Map<string, { id: string; color: string }>();
      const visible = snapshot.blocks.filter(block => !block.shutterId
        || snapshot.shutters.find(shutter => shutter.id === block.shutterId)?.revealed);
      for (const block of visible) for (const [dx, dy] of block.shape) {
        const key = `${block.x + dx},${block.y + dy}`;
        expect(occupied.has(key)).toBe(false);
        occupied.set(key, { id: block.id, color: block.layers[0]! });
      }
      for (const [key, block] of occupied) {
        const [x, y] = key.split(",").map(Number) as [number, number];
        for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
          const neighbor = occupied.get(`${x + dx},${y + dy}`);
          if (neighbor && neighbor.id !== block.id) expect(neighbor.color).not.toBe(block.color);
        }
      }
      for (const shutter of snapshot.shutters.filter(shutter => !shutter.revealed)) {
        expect(shutter.count).toBeGreaterThan(0);
        const hidden = snapshot.blocks.filter(block => block.shutterId === shutter.id);
        expect(hidden.length).toBeGreaterThan(0);
        for (const block of hidden) for (const [dx, dy] of block.shape) {
          expect(block.x + dx).toBeGreaterThanOrEqual(shutter.x);
          expect(block.x + dx).toBeLessThan(shutter.x + shutter.width);
          expect(block.y + dy).toBeGreaterThanOrEqual(shutter.y);
          expect(block.y + dy).toBeLessThan(shutter.y + shutter.height);
        }
        for (let y = shutter.y; y < shutter.y + shutter.height; y++) {
          for (let x = shutter.x; x < shutter.x + shutter.width; x++) {
            const key = `${x},${y}`;
            expect(occupied.has(key)).toBe(false);
            occupied.set(key, { id: shutter.id, color: "curtain-cover" });
          }
        }
      }
      const blocked = new Set(snapshot.blocked.map(point => point.join(",")));
      expect([...occupied.keys()].sort()).toEqual(snapshot.playable.map(point => point.join(","))
        .filter(key => !blocked.has(key)).sort());
    }
  });

  it("starts Lv22 with a visible on-board mechanism, not frozen exits alone", () => {
    const snapshot = new PuzzleModel(getLevelStrict(22)).snapshot();
    const visible = snapshot.blocks.filter(block => !block.shutterId
      || snapshot.shutters.find(shutter => shutter.id === block.shutterId)?.revealed);
    const hasVisibleBoardMechanism = snapshot.shutters.some(shutter => !shutter.revealed)
      || visible.some(block => block.layers.length > 1 || block.frozen > 0);
    expect(hasVisibleBoardMechanism).toBe(true);
  });
});
