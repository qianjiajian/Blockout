import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { BlockSpec, LevelSpec } from "../src/core/types";
import {
  KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS,
  KEY_LOCK_COUNT_VERTICAL_OFFSET_PX,
  KEY_LOCK_GROUP_COLORS,
  KEY_LOCK_MARKER_VERTICAL_OFFSET_CELLS,
  keyLockMarkerColor,
  keyLockMarkerVerticalOffset,
  markerAspectRatio,
} from "../src/game/keyLockMarkerArt";

const block = (id: string, markers: Partial<BlockSpec> = {}): BlockSpec => ({
  id, x: 0, y: 0, shape: [[0, 0]], color: "blue", ...markers,
});
const catalog = (groups: string[]): Pick<LevelSpec, "blocks"> => ({
  blocks: groups.flatMap((group, index) => [
    block(`key-${index}`, { keyId: group }),
    block(`lock-${index}`, { lockedBy: group, lockCount: 3 }),
  ]),
});

describe("key and lock marker artwork", () => {
  it("assigns exactly eight authored groups distinct supplied colours without cycling", () => {
    expect(KEY_LOCK_GROUP_COLORS).toEqual([
      "purple",
      "red",
      "blue",
      "green",
      "yellow",
      "orange",
      "pink",
      "cyan",
    ]);
    const groups = Array.from({ length: 8 }, (_, index) => `vp-key-group-${index + 1}`);
    const level = catalog(groups);
    expect(groups.map((id) => keyLockMarkerColor(id, level))).toEqual(KEY_LOCK_GROUP_COLORS);
  });

  it("keeps an arbitrary single group purple but rejects missing or unknown identity", () => {
    const level = catalog(["gold-key"]);
    expect(keyLockMarkerColor("gold-key", level)).toBe("purple");
    expect(() => keyLockMarkerColor(undefined, level)).toThrow(/Unknown authored/);
    expect(() => keyLockMarkerColor("", level)).toThrow(/Unknown authored/);
    expect(() => keyLockMarkerColor("unknown", level)).toThrow(/Unknown authored/);
  });

  it("separates group-0 from group-1 and arbitrary IDs without suffix assumptions", () => {
    for (const groups of [["group-0", "group-1"], ["k1", "k2"], ["gold-key", "another-key"]]) {
      const level = catalog(groups);
      expect(new Set(groups.map((id) => keyLockMarkerColor(id, level))).size).toBe(groups.length);
      for (const group of groups) {
        const key = level.blocks.find((b) => b.keyId === group)!;
        const lock = level.blocks.find((b) => b.lockedBy === group)!;
        expect(keyLockMarkerColor(key.keyId, level)).toBe(keyLockMarkerColor(lock.lockedBy, level));
      }
    }
  });

  it("uses group identity, not carrier colour, block count, order or lock count", () => {
    const level = catalog(["b", "a"]);
    const expected = keyLockMarkerColor("b", level);
    const reordered = { blocks: [...level.blocks].reverse() };
    expect(keyLockMarkerColor("b", reordered)).toBe(expected);
    reordered.blocks = reordered.blocks.map((b) => ({ ...b, color: "red", lockCount: b.lockedBy ? 2 : undefined }));
    reordered.blocks.push(block("third-key", { keyId: "b", color: "green" }));
    expect(keyLockMarkerColor("b", reordered)).toBe(expected);
  });

  it("includes hidden and generator cargo groups in the complete authored catalog", () => {
    const level: LevelSpec = {
      id: 901, name: "full marker catalog", difficulty: "normal", width: 4, height: 4,
      timeSeconds: 60, reward: 0,
      gates: [{ id: "blue", side: "right", offset: 0, size: 4, color: "blue" }],
      shutters: [{ id: "real-curtain", x: 2, y: 2, width: 2, height: 1, count: 1 }],
      generators: [{ id: "dispenser", side: "left", offset: 0, spawn: [0, 0], queueBlockIds: ["queued-key", "queued-lock"] }],
      blocks: [
        block("visible-key", { x: 3, keyId: "visible" }),
        block("visible-lock", { x: 3, y: 1, lockedBy: "visible" }),
        block("hidden-key", { x: 2, y: 2, shutterId: "real-curtain", keyId: "hidden" }),
        block("hidden-lock", { x: 3, y: 2, shutterId: "real-curtain", lockedBy: "hidden" }),
        block("queued-key", { x: -10, shape: [[0, 1]], keyId: "queued" }),
        block("queued-lock", { x: -10, shape: [[0, 1]], lockedBy: "queued" }),
      ],
    };
    const before = structuredClone(level);
    const model = new PuzzleModel(level);
    expect(model.snapshot().queuedBlocks.map((b) => b.id)).toEqual(["queued-key", "queued-lock"]);
    expect(model.isBlockActive(model.getBlock("hidden-key")!)).toBe(false);
    const colors = ["visible", "hidden", "queued"].map((id) => keyLockMarkerColor(id, model.level));
    expect(new Set(colors).size).toBe(3);
    expect(keyLockMarkerColor("queued", level)).toBe("red");
    expect(level).toEqual(before);
  });

  it("retains colours through actual key removal and unlocking with model.level", () => {
    const level: LevelSpec = {
      id: 900, name: "marker stability", difficulty: "normal", width: 4, height: 2,
      timeSeconds: 60, reward: 0, gates: [{ id: "blue", side: "top", offset: 0, size: 4, color: "blue" }],
      blocks: catalog(["group-0", "group-1"]).blocks.map((b, x) => ({ ...b, x, lockCount: b.lockedBy ? 1 : undefined })),
    };
    const before = structuredClone(level);
    const model = new PuzzleModel(level);
    const expected = keyLockMarkerColor("group-1", model.level);
    expect(model.tryExit("key-0", "top").ok).toBe(true);
    expect(model.tryExit("lock-0", "top").ok).toBe(true);
    expect(model.snapshot().blocks.every((b) => b.keyId !== "group-0" && b.lockedBy !== "group-0")).toBe(true);
    expect(keyLockMarkerColor("group-1", model.level)).toBe(expected);
    expect(keyLockMarkerColor("group-0", model.level)).toBe("purple");
    expect(level).toEqual(before);
  });

  it("does not return stale cached colours after in-place authoring edits", () => {
    const level = catalog(["b"]);
    expect(keyLockMarkerColor("b", level)).toBe("purple");
    level.blocks.push(block("added", { keyId: "a" }));
    expect(keyLockMarkerColor("b", level)).toBe("red");
  });

  it("rejects a ninth group rather than silently repeating any marker colour", () => {
    const level = catalog(Array.from({ length: 9 }, (_, i) => `group-${i}`));
    for (const b of level.blocks) {
      expect(() => keyLockMarkerColor(b.keyId ?? b.lockedBy, level)).toThrow(/at most 8 groups; got 9/);
    }
  });

  it("audits all 200 formal levels for unique group colours and matching key/lock artwork", () => {
    expect(LEVELS).toHaveLength(200);
    let groupCount = 0;
    for (const level of LEVELS) {
      const before = JSON.stringify(level);
      const groups = [...new Set(level.blocks.flatMap((b) => [b.keyId, b.lockedBy].filter((id): id is string => Boolean(id))))];
      const colors = groups.map((id) => keyLockMarkerColor(id, level));
      expect(new Set(colors).size, `Lv${level.id}`).toBe(groups.length);
      for (const b of level.blocks) {
        for (const id of [b.keyId, b.lockedBy]) if (id) {
          expect(keyLockMarkerColor(id, level)).toBe(colors[groups.indexOf(id)]);
        }
      }
      expect(JSON.stringify(level)).toBe(before);
      groupCount += groups.length;
    }
    expect(groupCount).toBeGreaterThan(0);
  });

  it("uses natural dimensions first and has safe aspect-ratio fallbacks", () => {
    expect(markerAspectRatio({ naturalWidth: 66, naturalHeight: 84, width: 1, height: 1 })).toBeCloseTo(66 / 84);
    expect(markerAspectRatio({ naturalWidth: 0, naturalHeight: 0, width: 62, height: 86 })).toBeCloseTo(62 / 86);
    expect(markerAspectRatio({ naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 })).toBe(1);
  });

  it("moves the complete gameplay marker group slightly upward", () => {
    expect(KEY_LOCK_MARKER_VERTICAL_OFFSET_CELLS).toBe(-0.12);
    expect(keyLockMarkerVerticalOffset(60)).toBeCloseTo(-7.2);
  });

  it("raises the lock count nine pixels, then lowers it by 0.08 cell", () => {
    expect(KEY_LOCK_COUNT_VERTICAL_OFFSET_PX).toBe(-9);
    expect(KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS).toBe(0.08);
  });
});
