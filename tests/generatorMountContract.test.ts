import { describe, expect, it } from "vitest";
import { auditGeneratorMounts, generatorMountBounds } from "../src/core/generatorMountContract";
import { buildGeneratorRimGeometry } from "../src/game/generatorRimGeometry";
import type { GeneratorSpec, LevelSpec, Point, Side } from "../src/core/types";

const level = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 99201, name: "isolated machine mount", difficulty: "normal", timeSeconds: 90,
  reward: 0, width: 7, height: 7, gates: [], blocks: [], ...overrides,
});
const machine = (side: Side = "top", offset = 2, extra: Partial<GeneratorSpec> = {}): GeneratorSpec => ({
  id: "g", side, offset, spawn: [2, 0], queueBlockIds: [], ...extra,
});
const codes = (input: LevelSpec) => auditGeneratorMounts(input).map(({ code }) => code);

describe("pure generator mounting geometry", () => {
  it.each(["top", "right", "bottom", "left"] as const)("accepts a three-rail %s edge without requiring optional metadata", (side) => {
    const input = level({ generators: [machine(side)] });
    const before = structuredClone(input);
    expect(auditGeneratorMounts(input)).toEqual([]);
    expect(input).toEqual(before);
  });

  it.each([0, 1, 2, 3] as const)("keeps logical machine envelopes synchronized with renderer quarter-turn %s", (quarterTurns) => {
    const anchor = quarterTurns === 0 ? { x: 2.5, y: 0, quarterTurns }
      : quarterTurns === 1 ? { x: 7, y: 2.5, quarterTurns }
        : quarterTurns === 2 ? { x: 2.5, y: 7, quarterTurns }
          : { x: 0, y: 2.5, quarterTurns };
    const actual = generatorMountBounds(anchor);
    const rendered = buildGeneratorRimGeometry(anchor).visualBounds;
    for (const field of ["x", "y", "width", "height"] as const) expect(actual[field]).toBeCloseTo(rendered[field], 12);
  });

  it("accepts concave exterior rim anchors instead of demanding the bounding rectangle edge", () => {
    const playable: Point[] = [];
    for (let y = 0; y < 7; y += 1) for (let x = 0; x < 7; x += 1) {
      if (!(y < 2 && x >= 1 && x <= 3)) playable.push([x, y]);
    }
    const input = level({ playable, generators: [machine("top", 2, { rimAnchor: { x: 2.5, y: 2, quarterTurns: 0 } })] });
    expect(auditGeneratorMounts(input)).toEqual([]);
  });

  it("rejects floating interior mouths, incomplete corner spans, explicit walls and seam-only edges", () => {
    expect(codes(level({ generators: [machine("top", 2, { rimAnchor: { x: 2.5, y: 2, quarterTurns: 0 } })] })))
      .toEqual(Array(3).fill("generator-rim-not-exposed"));
    expect(codes(level({ generators: [machine("top", 0)] }))).toContain("generator-rim-not-exposed");
    expect(codes(level({ blocked: [[1, 0]], generators: [machine()] }))).toContain("generator-rim-not-exposed");
    expect(codes(level({
      seams: [{ orientation: "horizontal", offset: 2, start: 1, size: 3 }],
      generators: [machine("top", 2, { rimAnchor: { x: 2.5, y: 2, quarterTurns: 0 } })],
    }))).toContain("generator-rim-not-exposed");
  });

  it("does not mistake an enclosed three-cell wall for an exterior machine edge", () => {
    const input = level({ blocked: [[1, 1], [2, 1], [3, 1]],
      generators: [machine("top", 2, { rimAnchor: { x: 2.5, y: 2, quarterTurns: 0 } })] });
    expect(codes(input)).toEqual(Array(3).fill("generator-rim-not-exposed"));
  });

  it("diagnoses mount style and disagreement between side/offset and the real mouth", () => {
    const input = level({ generators: [machine("bottom", 1, {
      rimMount: "outboard", rimAnchor: { x: 2.5, y: 0, quarterTurns: 0 },
    })] });
    expect(codes(input)).toEqual(["generator-rim-mount", "generator-rim-direction"]);
    input.generators![0].rimAnchor!.x = 2.25;
    expect(codes(input)).toContain("generator-rim-geometry");
    input.generators![0].rimAnchor = undefined;
    input.generators![0].offset = 1.5;
    expect(codes(input)).toContain("generator-rim-geometry");
  });

  it.each(["ordinary", "frozen", "star", "flip"] as const)("reserves %s exit rails even when the exit is unavailable", (kind) => {
    const gate = { id: "exit", side: "top" as const, offset: 1, size: 1, color: "red" as const,
      ...(kind === "frozen" ? { frozen: 6 } : {}), ...(kind === "star" ? { star: true } : {}) };
    const input = level({ generators: [machine()],
      ...(kind === "flip" ? { flipDoors: [{ ...gate, initiallyOpen: false }] } : { gates: [gate] }) });
    expect(auditGeneratorMounts(input)).toContainEqual({ code: "generator-exit-overlap",
      message: expect.any(String), generatorId: "g", gateId: "exit", cell: [1, 0] });
  });

  it("uses all explicit local exit portals, not just compatibility side/offset", () => {
    const input = level({ generators: [machine()], gates: [{ id: "multi", side: "bottom", offset: 0, size: 1, color: "red",
      portals: [{ side: "bottom", origin: [0, 6], size: 1 }, { side: "top", origin: [3, 0], size: 1 }] }] });
    expect(auditGeneratorMounts(input)).toMatchObject([{ code: "generator-exit-overlap", gateId: "multi", cell: [3, 0] }]);
  });

  it("rejects same-rail machines and perpendicular corner body overlap", () => {
    const repeated = level({ generators: [machine(), machine("top", 2, { id: "other" })] });
    expect(codes(repeated)).toEqual(["generator-rail-overlap", "generator-rail-overlap", "generator-rail-overlap", "generator-body-overlap"]);
    const corner = level({ width: 5, height: 5, generators: [machine("top", 3), machine("right", 1, { id: "other" })] });
    expect(codes(corner)).toEqual(["generator-body-overlap"]);
  });

  it("allows edge-touching non-overlapping bodies and valid separated mouths with competing future cargo", () => {
    expect(auditGeneratorMounts(level({ generators: [machine("top", 1), machine("top", 4, { id: "other" })] }))).toEqual([]);
    const input = level({ width: 5, height: 5, generators: [machine("top", 2), machine("right", 2, { id: "other", spawn: [2, 2] })] });
    expect(auditGeneratorMounts(input)).toEqual([]);
  });
});
