// @ts-expect-error Node APIs are available in Vitest, not the browser tsconfig.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS_BEFORE_MULTI_BLOCK_REMAKE as LEVELS, LEVELS_BEFORE_MECHANISM_FOCUS_REMAKE } from "../src/core/levels";
import { MECHANISM_FOCUS_REMAKE_IDS } from "../src/core/mechanismFocusRemake";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { levelStarTargets } from "../src/core/levelStarConditions";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import type { LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/mechanism-focus-remake.json", import.meta.url), "utf8")) as {
  rows: { id: number; level: LevelSpec; drags: RevisedSearchDrag[]; lowerBound: number }[];
};
// Historical v1.20 evidence only; multiBlockRemake.test.ts covers final LEVELS.
const historicalLevel = (id: number): LevelSpec => LEVELS[id - 1]!;
const remade = new Set<number>(MECHANISM_FOCUS_REMAKE_IDS);
const physicalBoard = (l: LevelSpec) => [l.width, l.height, l.playable, l.blocked, l.seams];

describe("historical v1.20 mechanism-focused 21–30 stage", () => {
  it("changes exactly ten layouts and preserves all other 190 object identities", () => {
    expect(LEVELS).toHaveLength(200);
    expect(fixture.rows.map(r => r.id)).toEqual(MECHANISM_FOCUS_REMAKE_IDS);
    for (const [i, level] of LEVELS.entries()) {
      expect(level.id).toBe(i + 1);
      expect(() => validateLevel(level)).not.toThrow();
      if (remade.has(level.id)) expect(level).not.toEqual(LEVELS_BEFORE_MECHANISM_FOCUS_REMAKE[i]);
      else expect(level).toBe(LEVELS_BEFORE_MECHANISM_FOCUS_REMAKE[i]);
    }
  });
  it("preserves the actual structures, metadata and all 200 displayed/settled star targets", () => {
    for (const [i, level] of LEVELS.entries()) {
      const previous = LEVELS_BEFORE_MECHANISM_FOCUS_REMAKE[i]!;
      expect(physicalBoard(level)).toEqual(physicalBoard(previous));
      for (const key of ["name", "difficulty", "timeSeconds", "reward"] as const) expect(level[key]).toEqual(previous[key]);
      expect(levelStarTargets(level)).toEqual(levelStarTargets(previous));
    }
    expect(historicalLevel(29).preservedMoveTarget).toBe(204);
  });
  for (const row of fixture.rows) it(`freshly completes historical v1.20 Lv${row.id} with the pinned unassisted continuous-input route`, () => {
    const level = historicalLevel(row.id);
    expect(level).toBe(LEVELS[row.id - 1]);
    expect(level).toEqual(row.level);
    expect(level.mechanismRules).toBe("revised-2026-09-23-v1.4");
    const replay = replayRevisedRoute(level, row.drags);
    expect(replay).toMatchObject({ valid: true, complete: true, effectiveDrags: row.drags.length });
    expect(replay.nonClearingDrags).toBeGreaterThanOrEqual(row.lowerBound);
    // The independent lower-bound algorithms run in the adoption verifier.
    // A route alone is an upper bound, not a minimum-difficulty certificate.
  });
  it("keeps every opening playable cell genuinely occupied and neighboring bodies differently colored", () => {
    for (const id of remade) {
      const snapshot = new PuzzleModel(historicalLevel(id)).snapshot();
      const occupied = new Map<string, { id: string; color: string }>();
      for (const b of snapshot.blocks.filter(b => !b.shutterId)) for (const [dx, dy] of b.shape) {
        const key = `${b.x + dx},${b.y + dy}`; expect(occupied.has(key)).toBe(false);
        occupied.set(key, { id: b.id, color: b.layers[0]! });
      }
      for (const [key, b] of occupied) {
        const [x, y] = key.split(",").map(Number) as [number, number];
        for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
          const neighbor = occupied.get(`${x + dx},${y + dy}`);
          if (neighbor && neighbor.id !== b.id) expect(neighbor.color).not.toBe(b.color);
        }
      }
      for (const s of snapshot.shutters) {
        expect(s.revealed).toBe(false);
        expect(snapshot.blocks.some(b => b.shutterId === s.id)).toBe(true);
        for (let y = s.y; y < s.y + s.height; y++) for (let x = s.x; x < s.x + s.width; x++) {
          const key = `${x},${y}`; expect(occupied.has(key)).toBe(false); occupied.set(key, { id: s.id, color: "cover" });
        }
      }
      const blocked = new Set(snapshot.blocked.map(p => p.join(",")));
      expect([...occupied.keys()].sort()).toEqual(snapshot.playable.map(p => p.join(",")).filter(k => !blocked.has(k)).sort());
    }
  });
});
