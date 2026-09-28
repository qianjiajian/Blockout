import { describe, expect, it } from "vitest";
import {
  generatorMouthTemplateFromRimAnchor,
  resolveGeneratorMouthTemplate,
  validateGeneratorMouthSpawn,
  type GeneratorMouthSpawnBoard,
} from "../src/core/generatorMouthSpawnGeometry";
import type { GeneratorSpec, Side } from "../src/core/types";

const board = (overrides: Partial<GeneratorMouthSpawnBoard> = {}): GeneratorMouthSpawnBoard => ({
  width: 6,
  height: 6,
  ...overrides,
});

const generator = (
  side: Side,
  offset: number,
  rimAnchor?: GeneratorSpec["rimAnchor"],
): GeneratorSpec => ({
  id: `generator-${side}`,
  side,
  offset,
  spawn: [5, 5],
  queueBlockIds: ["queued"],
  ...(rimAnchor ? { rimAnchor } : {}),
});

describe("generator mouth staging geometry", () => {
  it.each([
    {
      side: "top" as const,
      offset: 3,
      mouthCells: [[2, 0], [3, 0], [4, 0]],
      templateOrigin: [2, 0],
    },
    {
      side: "right" as const,
      offset: 3,
      mouthCells: [[5, 2], [5, 3], [5, 4]],
      templateOrigin: [3, 2],
    },
    {
      side: "bottom" as const,
      offset: 3,
      mouthCells: [[4, 5], [3, 5], [2, 5]],
      templateOrigin: [2, 3],
    },
    {
      side: "left" as const,
      offset: 3,
      mouthCells: [[0, 4], [0, 3], [0, 2]],
      templateOrigin: [0, 2],
    },
  ])("projects the $side mouth and inward 3x3 template", ({
    side, offset, mouthCells, templateOrigin,
  }) => {
    expect(resolveGeneratorMouthTemplate(generator(side, offset), board())).toMatchObject({
      status: "ok",
      mouthCells,
      templateOrigin,
      templateBounds: {
        x: templateOrigin[0],
        y: templateOrigin[1],
        width: 3,
        height: 3,
      },
    });
  });

  it("projects an inset rimAnchor directly and prefers it over side/offset", () => {
    const rimAnchor = { x: 2, y: 3.5, quarterTurns: 3 as const };
    const expected = {
      status: "ok",
      rimAnchor,
      mouthCells: [[2, 4], [2, 3], [2, 2]],
      templateOrigin: [2, 2],
      templateBounds: { x: 2, y: 2, width: 3, height: 3 },
    };

    expect(generatorMouthTemplateFromRimAnchor(rimAnchor)).toEqual(expected);
    expect(resolveGeneratorMouthTemplate(generator("top", 0, rimAnchor), board())).toEqual(expected);
  });
});

describe("generator mouth spawn validation", () => {
  it("rejects a footprint that touches only an outer mouth cell", () => {
    expect(validateGeneratorMouthSpawn(
      generator("top", 3),
      [1, 0],
      [[0, 0], [1, 0]],
      board(),
    )).toMatchObject({
      status: "invalid",
      spawn: [1, 0],
      footprint: [[1, 0], [2, 0]],
      touchesCenterMouth: false,
      reason: "Spawn footprint does not contain the center mouth cell.",
    });
  });

  it("preserves negative shape offsets", () => {
    expect(validateGeneratorMouthSpawn(
      generator("top", 0, { x: 2, y: 3.5, quarterTurns: 3 }),
      [2, 2],
      [[-1, 1], [0, 1]],
      board(),
    )).toMatchObject({
      status: "ok",
      templateOrigin: [2, 2],
      spawn: [2, 2],
      footprint: [[1, 3], [2, 3]],
      touchesCenterMouth: true,
    });
  });

  it("preserves shape offsets greater than the 3x3 template index range", () => {
    expect(validateGeneratorMouthSpawn(
      generator("top", 3),
      [2, 0],
      [[1, 0], [2, 0], [3, 0]],
      board(),
    )).toMatchObject({
      status: "ok",
      templateOrigin: [2, 0],
      spawn: [2, 0],
      footprint: [[3, 0], [4, 0], [5, 0]],
      touchesCenterMouth: true,
    });
  });

  it("validates an L footprint against an inset rimAnchor", () => {
    expect(validateGeneratorMouthSpawn(
      generator("top", 0, { x: 2, y: 3.5, quarterTurns: 3 }),
      [2, 2],
      [[0, 0], [0, 1], [1, 1]],
      board(),
    )).toMatchObject({
      status: "ok",
      mouthCells: [[2, 4], [2, 3], [2, 2]],
      footprint: [[2, 2], [2, 3], [3, 3]],
    });
  });

  it("rejects a playable footprint that does not touch any mouth cell", () => {
    expect(validateGeneratorMouthSpawn(
      generator("left", 3),
      [3, 3],
      [[0, 0]],
      board(),
    )).toMatchObject({
      status: "invalid",
      footprint: [[3, 3]],
      touchesCenterMouth: false,
      reason: "Spawn footprint does not contain the center mouth cell.",
    });
  });

  it("returns blocked for a mouth-touching footprint rejected by the playable mask", () => {
    expect(validateGeneratorMouthSpawn(
      generator("top", 2),
      [2, 0],
      [[0, 0], [0, 1], [1, 1]],
      board({ playable: [[2, 0], [2, 1]] }),
    )).toMatchObject({
      status: "blocked",
      footprint: [[2, 0], [2, 1], [3, 1]],
      rejectedCells: [[3, 1]],
    });
  });

  it("reports the authored footprint and does not search when a mouth cell is blocked", () => {
    expect(validateGeneratorMouthSpawn(
      generator("left", 2),
      [0, 2],
      [[0, 0]],
      board({ blocked: [[0, 2]] }),
    )).toMatchObject({
      status: "blocked",
      spawn: [0, 2],
      footprint: [[0, 2]],
      rejectedCells: [[0, 2]],
    });
  });
});
