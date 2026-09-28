import { describe, expect, it } from "vitest";
import {
  GENERATOR_RIM_METRICS,
  buildGeneratorRimGeometry,
  projectGeneratorRimGeometry,
  type GeneratorRimAnchor,
} from "../src/game/generatorRimGeometry";

const HORIZONTAL_COUNT_TANGENT = -1.5 + (246 / 285) * 3;
const HORIZONTAL_COUNT_OUTWARD = (3 * 118 / 285) * (1 - 55 / 118);
const VERTICAL_COUNT_SCREEN_UP = 1.5 - (39 / 299) * 3;
const VERTICAL_COUNT_OUTWARD = (55 / 299) * 3;
const HORIZONTAL_PREVIEW_TANGENT = -1.5 + (124 / 285) * 3;
const HORIZONTAL_PREVIEW_OUTWARD = (3 * 118 / 285) * (1 - 55 / 118);
const VERTICAL_PREVIEW_SCREEN_DOWN = -1.5 + (161 / 299) * 3;
const VERTICAL_PREVIEW_OUTWARD = (55 / 299) * 3;

describe("generator rim geometry", () => {
  const cases: Array<{
    anchor: GeneratorRimAnchor;
    rotation: number;
    reserved: Array<[number, number, number]>;
    bounds: { x: number; y: number; width: number; height: number };
    preview: [number, number];
    count: [number, number];
  }> = [
    {
      anchor: { x: 3.5, y: 2, quarterTurns: 0 },
      rotation: 0,
      reserved: [[2.5, 2, 0], [3.5, 2, 0], [4.5, 2, 0]],
      bounds: { x: 2, y: 1, width: 3, height: 1.35 },
      preview: [3.5 + HORIZONTAL_PREVIEW_TANGENT, 2 - HORIZONTAL_PREVIEW_OUTWARD],
      count: [3.5 + HORIZONTAL_COUNT_TANGENT, 2 - HORIZONTAL_COUNT_OUTWARD],
    },
    {
      anchor: { x: 6, y: 3.5, quarterTurns: 1 },
      rotation: Math.PI / 2,
      reserved: [[6, 2.5, 1], [6, 3.5, 1], [6, 4.5, 1]],
      bounds: { x: 5.65, y: 2, width: 1.35, height: 3 },
      preview: [6 + VERTICAL_PREVIEW_OUTWARD, 3.5 + VERTICAL_PREVIEW_SCREEN_DOWN],
      count: [6 + VERTICAL_COUNT_OUTWARD, 3.5 - VERTICAL_COUNT_SCREEN_UP],
    },
    {
      anchor: { x: 3.5, y: 8, quarterTurns: 2 },
      rotation: Math.PI,
      reserved: [[4.5, 8, 2], [3.5, 8, 2], [2.5, 8, 2]],
      bounds: { x: 2, y: 7.65, width: 3, height: 1.35 },
      preview: [3.5 - HORIZONTAL_PREVIEW_TANGENT, 8 + HORIZONTAL_PREVIEW_OUTWARD],
      count: [3.5 - HORIZONTAL_COUNT_TANGENT, 8 + HORIZONTAL_COUNT_OUTWARD],
    },
    {
      anchor: { x: 0, y: 3.5, quarterTurns: 3 },
      rotation: -Math.PI / 2,
      reserved: [[0, 4.5, 3], [0, 3.5, 3], [0, 2.5, 3]],
      bounds: { x: -1, y: 2, width: 1.35, height: 3 },
      preview: [-VERTICAL_PREVIEW_OUTWARD, 3.5 + VERTICAL_PREVIEW_SCREEN_DOWN],
      count: [-VERTICAL_COUNT_OUTWARD, 3.5 - VERTICAL_COUNT_SCREEN_UP],
    },
  ];

  it("uses one canonical three-rail, 1.35-cell machine in all four directions", () => {
    expect(GENERATOR_RIM_METRICS.span).toBe(3);
    expect(GENERATOR_RIM_METRICS.outwardDepth + GENERATOR_RIM_METRICS.inwardDepth)
      .toBe(GENERATOR_RIM_METRICS.totalDepth);

    for (const expected of cases) {
      const geometry = buildGeneratorRimGeometry(expected.anchor);
      expect(geometry.rotation).toBe(expected.rotation);
      expect(geometry.reservedRails.map(({ x, y, quarterTurns }) => [x, y, quarterTurns]))
        .toEqual(expected.reserved);
      expect(geometry.visualBounds.x).toBeCloseTo(expected.bounds.x);
      expect(geometry.visualBounds.y).toBeCloseTo(expected.bounds.y);
      expect(geometry.visualBounds.width).toBeCloseTo(expected.bounds.width);
      expect(geometry.visualBounds.height).toBeCloseTo(expected.bounds.height);
      expect(geometry.previewAnchor.x).toBeCloseTo(expected.preview[0]);
      expect(geometry.previewAnchor.y).toBeCloseTo(expected.preview[1]);
      expect(geometry.countAnchor.x).toBeCloseTo(expected.count[0]);
      expect(geometry.countAnchor.y).toBeCloseTo(expected.count[1]);
    }
  });

  it("projects every world anchor and visual bound with the same board transform", () => {
    const geometry = buildGeneratorRimGeometry({ x: 6, y: 3.5, quarterTurns: 1 });
    const projected = projectGeneratorRimGeometry(geometry, {
      innerX: 40,
      innerY: 120,
      cell: 20,
    });

    expect({ ...projected, visualBounds: undefined }).toEqual({
      anchor: { x: 160, y: 190 },
      rotation: Math.PI / 2,
      visualBounds: undefined,
      previewAnchor: {
        x: 40 + (6 + VERTICAL_PREVIEW_OUTWARD) * 20,
        y: 120 + (3.5 + VERTICAL_PREVIEW_SCREEN_DOWN) * 20,
      },
      countAnchor: {
        x: 40 + (6 + VERTICAL_COUNT_OUTWARD) * 20,
        y: 120 + (3.5 - VERTICAL_COUNT_SCREEN_UP) * 20,
      },
      reservedRailCenters: [
        { x: 160, y: 170 },
        { x: 160, y: 190 },
        { x: 160, y: 210 },
      ],
    });
    expect(projected.visualBounds.x).toBeCloseTo(153);
    expect(projected.visualBounds.y).toBeCloseTo(160);
    expect(projected.visualBounds.width).toBeCloseTo(27);
    expect(projected.visualBounds.height).toBeCloseTo(60);
  });

  it("does not mutate a caller-owned anchor", () => {
    const anchor: GeneratorRimAnchor = { x: 2.5, y: 1, quarterTurns: 0 };
    buildGeneratorRimGeometry(anchor);
    expect(anchor).toEqual({ x: 2.5, y: 1, quarterTurns: 0 });
  });
});
