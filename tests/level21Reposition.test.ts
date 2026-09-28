// @ts-expect-error Node APIs are available in Vitest, not the browser tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node APIs are available in Vitest, not the browser tsconfig.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LEVELS_BEFORE_MECHANISM_FOCUS_REMAKE as LEVELS, LEVELS_BEFORE_LEVEL21_REPOSITION } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import { levelStarTargets } from "../src/core/levelStarConditions";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/level21-reposition-route.json", import.meta.url), "utf8")) as {
  levelSha256: string; drags: RevisedSearchDrag[]; expectedNonClearingDrags: number; expectedClearEvents: number;
};
const current = LEVELS[20]!, before = LEVELS_BEFORE_LEVEL21_REPOSITION[20]!;
const nonBlocks = ({ blocks: _blocks, ...rest }: LevelSpec) => rest;
const protectedBlock = ({ x: _x, y: _y, shape: _shape, color: _color, layers, ...rest }: BlockSpec) => ({ ...rest, layerCount: layers?.length ?? 1 });

describe("v1.15 Lv21 block-only necessary reposition redesign", () => {
  it("preserves the other 199 levels as the exact same objects", () => {
    expect(LEVELS).toHaveLength(200);
    for (const [i, level] of LEVELS.entries()) {
      expect(() => validateLevel(level)).not.toThrow();
      if (level.id !== 21) expect(level).toBe(LEVELS_BEFORE_LEVEL21_REPOSITION[i]);
    }
  });

  it("changes only the fourteen opening block geometries/colors, not any mechanism fields", () => {
    expect(nonBlocks(current)).toEqual(nonBlocks(before));
    expect(current.blocks).toHaveLength(24);
    for (const [i, block] of current.blocks.entries()) {
      expect(protectedBlock(block)).toEqual(protectedBlock(before.blocks[i]!));
      if (block.shutterId) expect(block).toBe(before.blocks[i]);
    }
    expect(current.blocks.filter((block, i) => JSON.stringify(block) !== JSON.stringify(before.blocks[i]))).toHaveLength(14);
    expect(levelStarTargets(current)).toEqual(levelStarTargets(before));
    expect(current.timeSeconds).toBe(130);
  });

  it("pins the historical v1.15 level and its complete 46-drag/18-reposition canonical witness", () => {
    expect(createHash("sha256").update(JSON.stringify(current)).digest("hex")).toBe(fixture.levelSha256);
    expect(replayRevisedRoute(current, fixture.drags)).toMatchObject({
      valid: true, complete: true, effectiveDrags: 46, nonClearingDrags: 18, clearEvents: 28,
    });
    // The lower-bound certificate is rerun separately by
    // node tools/verify-level21-reposition.mjs, not inferred from this witness.
  });

  it("keeps a completely covered opening with fourteen visible blocks and no same-color neighbors", () => {
    const model = new PuzzleModel(current);
    const snapshot = model.snapshot();
    const visible = snapshot.blocks.filter(block => !block.shutterId
      || snapshot.shutters.find(shutter => shutter.id === block.shutterId)?.revealed);
    expect(visible).toHaveLength(14);
    const cells = new Map<string, { id: string; color: string }>();
    for (const block of visible) for (const [dx, dy] of block.shape) {
      const key = `${block.x + dx},${block.y + dy}`;
      expect(cells.has(key)).toBe(false);
      cells.set(key, { id: block.id, color: block.layers[0]! });
    }
    expect(cells.size).toBe(42);
    for (const [key, block] of cells) {
      const [x, y] = key.split(",").map(Number) as [number, number];
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const neighbor = cells.get(`${x + dx},${y + dy}`);
        if (neighbor && neighbor.id !== block.id) expect(neighbor.color).not.toBe(block.color);
      }
    }
    for (const sh of current.shutters!) for (let y = sh.y; y < sh.y + sh.height; y++) for (let x = sh.x; x < sh.x + sh.width; x++) {
      const key = `${x},${y}`; expect(cells.has(key)).toBe(false); cells.set(key, { id: sh.id, color: "cover" });
    }
    expect(cells.size).toBe(54);
  });

  it("completes under positive model time without using a booster", () => {
    const model = new PuzzleModel(current); model.startCountdown();
    for (const drag of fixture.drags) {
      model.tick(.6 + .13 * drag.path.length); model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
    }
    expect(model.snapshot()).toMatchObject({ complete: true, failed: false, moves: 46, cleared: 28, timeFreezeSeconds: 0 });
    expect(model.snapshot().remainingSeconds).toBeGreaterThan(0);
  });
});
