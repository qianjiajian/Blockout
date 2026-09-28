import { describe, expect, it } from "vitest";
import { auditRevisedMechanismContract, assertRevisedMechanismContract } from "../src/core/revisedMechanismContract";
import type { BlockSpec, LevelSpec } from "../src/core/types";

const level = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 99101, name: "isolated mechanism contract", difficulty: "normal", timeSeconds: 90,
  reward: 0, width: 5, height: 5, gates: [], blocks: [],
  mechanismRules: "revised-2026-09-21", ...overrides,
});
const block = (id: string, x: number, y: number, extra: Partial<BlockSpec> = {}): BlockSpec => ({
  id, x, y, color: "red", shape: [[0, 0]], ...extra,
});
const codes = (input: LevelSpec) => auditRevisedMechanismContract(input).map((issue) => issue.code);
const machine = (): LevelSpec => level({
  generators: [{ id: "g", side: "top", offset: 1, spawn: [0, 0], queueBlockIds: ["cargo"] }],
  blocks: [block("cargo", 0, 0, { shape: [[1, 0]] }), block("occupant", 1, 0)],
});

describe("revised mechanism construction contract", () => {
  it("enforces the same static mechanism gates for the v1.1 profile", () => {
    const input = machine();
    input.mechanismRules = "revised-2026-09-21-v1.1";
    input.blocks[0].frozen = 2;
    input.generators![0].rimMount = "outboard";
    expect(codes(input)).toEqual(["queued-ice", "generator-rim-mount"]);
    expect(() => assertRevisedMechanismContract(input)).toThrow(/queued-ice/);
  });

  it("leaves legacy data outside this contract and does not impose generation-only gates on fixtures", () => {
    const legacy = machine();
    legacy.mechanismRules = undefined;
    legacy.generators![0].trigger = "time";
    legacy.blocks[0].frozen = 6;
    expect(auditRevisedMechanismContract(legacy)).toEqual([]);
    expect(() => assertRevisedMechanismContract(legacy)).not.toThrow();
    expect(auditRevisedMechanismContract(level({
      gates: [{ id: "a", side: "top", offset: 0, size: 1, color: "red" },
        { id: "b", side: "bottom", offset: 0, size: 1, color: "red" }],
      blocks: [block("a", 0, 0), block("b", 1, 0)],
    }))).toEqual([]);
  });

  it("allows default machine metadata and a currently occupied valid fixed landing", () => {
    const input = machine();
    const before = structuredClone(input);
    expect(auditRevisedMechanismContract(input)).toEqual([]);
    expect(input).toEqual(before);
    expect(() => assertRevisedMechanismContract(input)).not.toThrow();
  });

  it("rejects timer machines, frozen cargo and any queue shape missing the center mouth", () => {
    const input = machine();
    input.generators![0].trigger = "time";
    input.blocks[0].frozen = 6;
    input.blocks[0].shape = [[0, 0]];
    expect(codes(input)).toEqual(["timed-generator", "queued-ice", "generator-mouth-footprint"]);
    expect(() => assertRevisedMechanismContract(input)).toThrow(/timed-generator/);
  });

  it("checks the entire spawn footprint against missing cells and blocked cells", () => {
    const input = machine();
    input.blocks[0].shape = [[1, 0], [2, 0]];
    input.blocked = [[2, 0]];
    expect(codes(input)).toContain("generator-mouth-footprint");
    input.blocked = undefined;
    input.playable = [[1, 0]];
    expect(codes(input)).toContain("generator-mouth-footprint");
  });

  it("rejects every shell in a colored-grid level, including hidden and queued shells", () => {
    const input = machine();
    input.coloredGrids = [{ id: "floor", color: "red", cells: [[4, 4]] }];
    input.blocks[0].layers = ["red", "blue"];
    input.blocks.push(block("hidden", 3, 3, { layers: ["red", "blue"], shutterId: "cover" }));
    input.shutters = [{ id: "cover", x: 3, y: 3, width: 1, height: 1, count: 1 }];
    const violations = auditRevisedMechanismContract(input).filter((issue) => issue.code === "colored-grid-shell");
    expect(violations.map((issue) => issue.blockId)).toEqual(["cargo", "hidden"]);
  });

  it.each(["staging", "staged-frame"] as const)("rejects legacy %s", (skin) => {
    expect(codes(level({ shutters: [{ id: "old", x: 1, y: 1, width: 1, height: 1, count: 1, skin }] }))).toContain("legacy-nonspatial-staging");
  });

  it("rejects unsupported platform, conveyor, rotation and countdown-machine metadata only under opt-in", () => {
    const input = level({
      blocks: [block("rotation", 0, 0, { rotationBadge: true })],
      elevators: [{ id: "platform", blockId: "rotation", fromX: 0, fromY: 0, toX: 1, toY: 0,
        width: 1, height: 1, periodSeconds: 2 }],
      conveyors: [{ id: "belt", blockId: "rotation", x: 0, y: 0, width: 1, height: 1, direction: "right" }],
      shutters: [{ id: "old-machine", x: 2, y: 2, width: 1, height: 1, count: 1, skin: "generator" }],
    });
    expect(codes(input)).toEqual(["legacy-moving-elevator", "legacy-conveyor", "legacy-rotation-badge", "legacy-generator-shutter"]);
    expect(() => assertRevisedMechanismContract(input)).toThrow(/legacy-moving-elevator.*platform/);
    input.mechanismRules = undefined;
    expect(codes(input)).toEqual([]);
  });

  it("rejects stale generator clock settings and named clear cohorts on ordinary shutters", () => {
    const input = machine();
    input.generators![0].intervalSeconds = 2;
    input.generators![0].initialDelaySeconds = 1;
    input.shutters = [{ id: "cover", x: 3, y: 3, width: 1, height: 1, count: 2, triggerBlockIds: ["occupant"] }];
    expect(codes(input)).toEqual(["generator-clock-metadata", "shutter-trigger-cohort"]);
  });

  it("integrates mount errors without relocating the machine or changing its queue", () => {
    const input = machine();
    input.generators![0].rimAnchor = { x: 1.5, y: 2, quarterTurns: 0 };
    input.generators![0].spawn = [0, 2];
    const before = structuredClone(input);
    expect(codes(input)).toContain("generator-rim-not-exposed");
    expect(input).toEqual(before);
    input.mechanismRules = undefined;
    expect(codes(input)).toEqual([]);
  });

  it("checks ordinary cover ownership without requiring its rectangle to be filled", () => {
    const input = level({
      shutters: [{ id: "cover", x: 1, y: 1, width: 2, height: 2, count: 1 }],
      blocks: [block("hidden", 1, 1, { shutterId: "cover", frozen: 6 })],
    });
    expect(auditRevisedMechanismContract(input)).toEqual([]);
    input.blocks[0].shape = [[0, 0], [1, 0], [2, 0]];
    expect(codes(input)).toContain("shutter-hidden-cell-outside-cover");
    input.blocks[0].shape = [[0, 0]];
    input.blocks.push(block("opening", 2, 2));
    expect(codes(input)).toContain("shutter-opening-cell-covered");
  });

  it("rejects overlapping closed physical covers independently of cargo overlap", () => {
    expect(codes(level({
      shutters: [
        { id: "a", x: 1, y: 1, width: 2, height: 2, count: 2 },
        { id: "b", x: 2, y: 2, width: 2, height: 2, count: 3 },
      ],
      blocks: [block("ha", 1, 1, { shutterId: "a" }), block("hb", 3, 3, { shutterId: "b" })],
    }))).toEqual(["physical-shutter-overlap"]);
  });

  it("allows hidden lift ice and visible occupants but rejects incomplete or overlapping hidden batches", () => {
    const input = level({
      shutters: [{ id: "lift", x: 1, y: 1, width: 2, height: 1, count: 1, skin: "lift" }],
      blocks: [block("occupant", 1, 1), block("ha", 1, 1, { shutterId: "lift", frozen: 6 }),
        block("hb", 2, 1, { shutterId: "lift" })],
    });
    expect(auditRevisedMechanismContract(input)).toEqual([]);
    input.blocks[2].x = 1;
    expect(codes(input)).toContain("lift-hidden-overlap");
    input.blocks[2].x = 3;
    expect(codes(input)).toContain("lift-hidden-outside-region");
    input.shutters![0].triggerBlockIds = ["occupant"];
    expect(codes(input)).toContain("lift-trigger-cohort");
  });

  it("rejects invalid and non-playable lift regions even with a playable list and explicit wall", () => {
    const input = level({
      playable: [[1, 1], [2, 1]], blocked: [[2, 1]],
      shutters: [{ id: "lift", x: 1, y: 1, width: 2, height: 1, count: 1, skin: "lift" }],
    });
    expect(codes(input)).toContain("region-outside-playable");
    input.shutters![0].width = 1.5;
    expect(codes(input)).toEqual(["region-geometry"]);
  });
});
