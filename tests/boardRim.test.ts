import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { boardRailIsSeam } from "../src/core/boardSeams";
import {
  boardGateVisualTop,
  boardPortalVisualDepthTop,
  boardPortalVisualTop,
  boardRimCornerVisualTop,
  boardRimRunVisualTop,
  buildBoardRimLayout,
  orderBoardRimLayersByDepth,
  planBoardRimRun,
  splitBoardRimRunIntoSegments,
} from "../src/game/boardRim";
import { buildGeneratorRimGeometry } from "../src/game/generatorRimGeometry";

describe("formal board rim topology", () => {
  it("paints lower board resources over upper resources across asset families", () => {
    const layers = [
      { id: "lower-corner", paintY: 301 },
      { id: "upper-gate", paintY: 190 },
      { id: "middle-run", paintY: 285 },
      { id: "same-depth-first", paintY: 285 },
    ];

    expect(orderBoardRimLayersByDepth(layers).map(({ id }) => id)).toEqual([
      "upper-gate",
      "middle-run",
      "same-depth-first",
      "lower-corner",
    ]);
    expect(layers.map(({ id }) => id)).toEqual([
      "lower-corner",
      "upper-gate",
      "middle-run",
      "same-depth-first",
    ]);
  });

  it("puts the Lv8 lower horizontal step after the upper descending rail", () => {
    const [lowerHorizontal] = splitBoardRimRunIntoSegments({
      x: 2,
      y: 3,
      length: 2,
      quarterTurns: 0,
      startConcave: false,
      endConcave: true,
    });
    const [upperVertical] = splitBoardRimRunIntoSegments({
      x: 4,
      y: 3,
      length: 3,
      quarterTurns: 3,
      startConcave: true,
      endConcave: false,
    });
    const lowerHorizontalTop = boardRimRunVisualTop(lowerHorizontal, 67);
    const upperVerticalTop = boardRimRunVisualTop(upperVertical, 206);
    const upperOuterCornerTop = boardRimCornerVisualTop({ y: 3, quarterTurns: 1 }, 69, false);
    const upperInnerCornerTop = boardRimCornerVisualTop({ y: 3, quarterTurns: 3 }, 68, true);

    expect(lowerHorizontalTop).toBe(218);
    expect(upperVerticalTop).toBe(0);
    expect(upperOuterCornerTop).toBe(216);
    expect(upperInnerCornerTop).toBe(217);
    expect(orderBoardRimLayersByDepth([
      { id: "horizontal-step", paintY: lowerHorizontalTop },
      { id: "inner-corner", paintY: upperInnerCornerTop },
      { id: "descending-vertical", paintY: upperVerticalTop },
      { id: "outer-corner", paintY: upperOuterCornerTop },
    ]).map(({ id }) => id)).toEqual([
      "descending-vertical",
      "outer-corner",
      "inner-corner",
      "horizontal-step",
    ]);
  });

  it("splits every straight direction into deterministic native one/two/three-cell spans", () => {
    const expectedLengths = new Map<number, number[]>([
      [1, [1]],
      [2, [2]],
      [3, [3]],
      [4, [3, 1]],
      [5, [3, 2]],
      [6, [3, 3]],
      [7, [3, 3, 1]],
    ]);
    const directions = [
      { quarterTurns: 0 as const, step: [1, 0] as const },
      { quarterTurns: 1 as const, step: [0, 1] as const },
      { quarterTurns: 2 as const, step: [-1, 0] as const },
      { quarterTurns: 3 as const, step: [0, -1] as const },
    ];

    for (const { quarterTurns, step: [stepX, stepY] } of directions) {
      for (const [length, chunkLengths] of expectedLengths) {
        const source = {
          x: 11,
          y: 13,
          length,
          quarterTurns,
          startConcave: true,
          endConcave: true,
        };
        const segments = splitBoardRimRunIntoSegments(source);

        expect(segments.map((segment) => segment.length), `q${quarterTurns} length ${length} chunks`)
          .toEqual(chunkLengths);
        expect(segments.reduce((sum, segment) => sum + segment.length, 0), `q${quarterTurns} length ${length} coverage`)
          .toBe(length);
        expect(segments.map((segment) => segment.startConcave), `q${quarterTurns} length ${length} start marker`)
          .toEqual(segments.map((_, index) => index === 0));
        expect(segments.map((segment) => segment.endConcave), `q${quarterTurns} length ${length} end marker`)
          .toEqual(segments.map((_, index) => index === segments.length - 1));

        let consumed = 0;
        const coveredUnits: string[] = [];
        for (const segment of segments) {
          expect([segment.x, segment.y], `q${quarterTurns} length ${length} segment start`)
            .toEqual([source.x + stepX * consumed, source.y + stepY * consumed]);
          expect(segment.quarterTurns).toBe(quarterTurns);
          for (let unit = 0; unit < segment.length; unit += 1) {
            coveredUnits.push(`${segment.x + stepX * unit},${segment.y + stepY * unit}`);
          }
          consumed += segment.length;
        }
        const expectedUnits = Array.from({ length }, (_, unit) => (
          `${source.x + stepX * unit},${source.y + stepY * unit}`
        ));
        expect(coveredUnits, `q${quarterTurns} length ${length} has no overlap or gap`).toEqual(expectedUnits);
        expect(new Set(coveredUnits).size).toBe(length);
        expect(source).toEqual({
          x: 11,
          y: 13,
          length,
          quarterTurns,
          startConcave: true,
          endConcave: true,
        });
      }
    }
  });

  it("includes the visible overhang when ordering corners and gates", () => {
    expect(boardRimCornerVisualTop({ y: 3, quarterTurns: 0 }, 68, false)).toBe(285);
    expect(boardRimCornerVisualTop({ y: 3, quarterTurns: 1 }, 69, false)).toBe(216);
    expect(boardGateVisualTop({ side: "top", offset: 1, size: 2 }, 8, 67)).toBe(-67);
    expect(boardGateVisualTop({ side: "bottom", offset: 1, size: 2 }, 8, 67)).toBe(760);
    expect(boardGateVisualTop({ side: "right", offset: 3, size: 3 }, 8, 206)).toBe(285);
  });

  it("orders local portals from their mouth row while matching legacy outer depth", () => {
    expect(boardPortalVisualTop({ side: "top", origin: [2, 3] }, 67)).toBe(218);
    expect(boardPortalVisualTop({ side: "bottom", origin: [2, 3] }, 67)).toBe(380);
    expect(boardPortalVisualTop({ side: "left", origin: [2, 3] }, 206)).toBe(285);
    expect(boardPortalVisualTop({ side: "right", origin: [2, 3] }, 206)).toBe(285);

    expect(boardPortalVisualTop({ side: "top", origin: [1, 0] }, 67))
      .toBe(boardGateVisualTop({ side: "top", offset: 1, size: 2 }, 8, 67));
    expect(boardPortalVisualTop({ side: "bottom", origin: [1, 7] }, 67))
      .toBe(boardGateVisualTop({ side: "bottom", offset: 1, size: 2 }, 8, 67));
    expect(boardPortalVisualTop({ side: "right", origin: [7, 3] }, 206))
      .toBe(boardGateVisualTop({ side: "right", offset: 3, size: 2 }, 8, 206));
  });

  it("lets a local portal own a same-depth corner cap", () => {
    const portal = { side: "bottom" as const, origin: [5, 4] as [number, number], size: 1 };
    const cornerDepth = boardRimCornerVisualTop({ y: 5, quarterTurns: 0 }, 58, false);
    expect(boardPortalVisualTop(portal, 58)).toBe(cornerDepth);
    expect(boardPortalVisualDepthTop(portal, 58)).toBeGreaterThan(cornerDepth);
    expect(orderBoardRimLayersByDepth([
      { id: "green-portal", paintY: boardPortalVisualDepthTop(portal, 58) },
      { id: "corner-cap", paintY: cornerDepth },
    ]).map(({ id }) => id)).toEqual(["corner-cap", "green-portal"]);
  });

  it("keeps Level 111's green local mouth above its lower-right corner", () => {
    const level = LEVELS.find(({ id }) => id === 111)!;
    const green = level.gates.find(({ id }) => id === "g111-green")!;
    const portal = green.portals![0]!;
    const rim = buildBoardRimLayout(level.playable ?? [], level.blocked ?? [], level.width, level.height, level.gates ?? []);
    const corner = rim.concaveCorners.find(({ x, y }) => x === 5 && y === 5)
      ?? rim.convexCorners.find(({ x, y }) => x === 6 && y === 5);
    expect(corner).toBeDefined();
    expect(boardPortalVisualDepthTop(portal, 58)).toBeGreaterThan(
      boardRimCornerVisualTop(corner!, 58, rim.concaveCorners.includes(corner!)),
    );
  });

  it("keeps both three-cell Level 72 neck exits above their lower concave caps", () => {
    const level = LEVELS.find(({ id }) => id === 72)!;
    const rim = buildBoardRimLayout(level.playable ?? [], level.blocked ?? [], level.width, level.height, level.gates);
    for (const [color, cornerX, quarterTurns] of [["blue", 2, 3], ["pink", 5, 0]] as const) {
      const portal = level.gates.find((gate) => gate.color === color)!.portals![0]!;
      expect(portal.size).toBe(3);
      expect(portal.origin[1]).toBe(1);
      const corner = rim.concaveCorners.find(({ x, y, quarterTurns: turn }) => (
        x === cornerX && y === 4 && turn === quarterTurns
      ))!;
      expect(corner).toBeDefined();
      const cornerDepth = boardRimCornerVisualTop(corner, 68, true);
      // The cap starts within the third cell (285..380 authored pixels).
      expect(cornerDepth).toBe(312);
      expect(orderBoardRimLayersByDepth([
        { id: "exit", paintY: boardPortalVisualDepthTop(portal, 299) },
        { id: "concave-cap", paintY: cornerDepth },
      ]).map(({ id }) => id)).toEqual(["concave-cap", "exit"]);
    }
  });

  it.each(["left", "right"] as const)("keeps a %s exit's lower bevel behind the following rim segment", (side) => {
    for (const size of [1, 2, 3, 6]) {
      const portal = { side, origin: [2, 2] as [number, number], size };
      const mouthBottom = 2 + size;
      const followingRail = { y: side === "left" ? mouthBottom + 1 : mouthBottom,
        length: 1, quarterTurns: side === "left" ? 3 as const : 1 as const };
      const endCorner = { y: mouthBottom, quarterTurns: side === "left" ? 3 as const : 0 as const };
      expect(orderBoardRimLayersByDepth([
        { id: "exit", paintY: boardPortalVisualDepthTop(portal, size * 95 + 14) },
        { id: "following-rim", paintY: boardRimRunVisualTop(followingRail, 109) },
        { id: "end-cap", paintY: boardRimCornerVisualTop(endCorner, 68, true) },
        { id: "following-exit", paintY: boardPortalVisualDepthTop({ ...portal, origin: [2, mouthBottom], size: 1 }, 109) },
      ]).map(({ id }) => id)).toEqual(["end-cap", "exit", "following-rim", "following-exit"]);
      expect(boardPortalVisualTop(portal, size * 95 + 14)).toBe(190);
    }
  });

  it("wraps one floor cell with four rails and four convex corners", () => {
    const rim = buildBoardRimLayout([[0, 0]], [], 1, 1);
    expect(rim.rails).toHaveLength(4);
    expect(rim.runs).toHaveLength(4);
    expect(rim.convexCorners).toHaveLength(4);
    expect(rim.concaveCorners).toHaveLength(0);
    expect(new Set(rim.rails.map((rail) => `${rail.x},${rail.y},${rail.quarterTurns}`)).size).toBe(4);
    expect(rim.convexCorners).toEqual(expect.arrayContaining([
      { x: 0, y: 0, quarterTurns: 1 },
      { x: 1, y: 0, quarterTurns: 2 },
      { x: 1, y: 1, quarterTurns: 3 },
      { x: 0, y: 1, quarterTurns: 0 },
    ]));
  });

  it("does not draw a rail between adjacent floor cells", () => {
    const rim = buildBoardRimLayout([[0, 0], [1, 0]], [], 2, 1);
    expect(rim.rails).toHaveLength(6);
    expect(rim.runs.map((run) => run.length).sort((a, b) => a - b)).toEqual([1, 1, 2, 2]);
    expect(rim.rails.some((rail) => rail.x === 1 && rail.y === 0.5)).toBe(false);
    expect(rim.convexCorners).toHaveLength(4);
  });

  it("emits the supplied zero-turn inner corner for a missing north-east quadrant", () => {
    const rim = buildBoardRimLayout([[0, 0], [0, 1], [1, 1]], [], 2, 2);
    expect(rim.concaveCorners).toContainEqual({ x: 1, y: 1, quarterTurns: 0 });
    const touchingRuns = rim.runs.filter((run) => run.startConcave || run.endConcave);
    expect(touchingRuns).toHaveLength(2);
  });

  it("treats blocked cells as voids in the visual silhouette", () => {
    const rim = buildBoardRimLayout([[0, 0], [1, 0]], [[1, 0]], 2, 1);
    expect(rim.rails).toHaveLength(4);
    expect(rim.convexCorners).toHaveLength(4);
  });

  it("removes gate-owned cells from neutral rails and splits the remaining runs", () => {
    const playable = Array.from({ length: 3 }, (_, y) => (
      Array.from({ length: 4 }, (_, x) => [x, y] as const)
    )).flat();
    const rim = buildBoardRimLayout(playable, [], 4, 3, [
      { side: "top", offset: 1, size: 2 },
      { side: "right", offset: 1, size: 1 },
    ]);

    expect(rim.gateRails).toEqual(expect.arrayContaining([
      { x: 1.5, y: 0, quarterTurns: 0 },
      { x: 2.5, y: 0, quarterTurns: 0 },
      { x: 4, y: 1.5, quarterTurns: 1 },
    ]));
    expect(rim.gateRails).toHaveLength(3);
    expect(rim.rails).toHaveLength(11);
    expect(rim.runs.reduce((sum, run) => sum + run.length, 0)).toBe(11);
    expect(rim.rails).not.toEqual(expect.arrayContaining(rim.gateRails));
    expect(rim.runs.filter((run) => run.quarterTurns === 0).map((run) => run.length).sort())
      .toEqual([1, 1]);
  });

  it("maps every local portal direction onto the matching rail of an internal void", () => {
    const playable = Array.from({ length: 3 }, (_, y) => (
      Array.from({ length: 3 }, (_, x) => [x, y] as const)
    )).flat().filter(([x, y]) => x !== 1 || y !== 1);
    const rim = buildBoardRimLayout(playable, [], 3, 3, [{
      side: "top",
      offset: 1,
      size: 1,
      portals: [
        { side: "top", origin: [1, 2], size: 1 },
        { side: "right", origin: [0, 1], size: 1 },
        { side: "bottom", origin: [1, 0], size: 1 },
        { side: "left", origin: [2, 1], size: 1 },
      ],
    }]);

    expect(rim.gateRails).toEqual(expect.arrayContaining([
      { x: 1.5, y: 2, quarterTurns: 0 },
      { x: 1, y: 1.5, quarterTurns: 1 },
      { x: 1.5, y: 1, quarterTurns: 2 },
      { x: 2, y: 1.5, quarterTurns: 3 },
    ]));
    expect(rim.gateRails).toHaveLength(4);
    expect(rim.rails).toHaveLength(12);
    expect(rim.runs.reduce((sum, run) => sum + run.length, 0)).toBe(12);
  });

  it("keeps equivalent legacy and explicit outer portals byte-for-byte aligned", () => {
    const playable = Array.from({ length: 3 }, (_, y) => (
      Array.from({ length: 4 }, (_, x) => [x, y] as const)
    )).flat();
    const cases = [
      {
        legacy: { side: "top" as const, offset: 1, size: 2 },
        portal: { side: "top" as const, origin: [1, 0] as const, size: 2 },
      },
      {
        legacy: { side: "right" as const, offset: 0, size: 2 },
        portal: { side: "right" as const, origin: [3, 0] as const, size: 2 },
      },
      {
        legacy: { side: "bottom" as const, offset: 1, size: 2 },
        portal: { side: "bottom" as const, origin: [1, 2] as const, size: 2 },
      },
      {
        legacy: { side: "left" as const, offset: 0, size: 2 },
        portal: { side: "left" as const, origin: [0, 0] as const, size: 2 },
      },
    ];

    for (const { legacy, portal } of cases) {
      const legacyRim = buildBoardRimLayout(playable, [], 4, 3, [legacy]);
      const portalRim = buildBoardRimLayout(playable, [], 4, 3, [{ ...legacy, portals: [portal] }]);
      expect(portalRim).toEqual(legacyRim);
    }
  });

  it("preserves legacy gate rounding while portal geometry stays cell-authored", () => {
    const playable = Array.from({ length: 2 }, (_, y) => (
      Array.from({ length: 4 }, (_, x) => [x, y] as const)
    )).flat();
    const rim = buildBoardRimLayout(playable, [], 4, 2, [
      { side: "top", offset: 0.6, size: 1.6 },
    ]);

    expect(rim.gateRails).toEqual([
      { x: 1.5, y: 0, quarterTurns: 0 },
      { x: 2.5, y: 0, quarterTurns: 0 },
    ]);
  });

  it("keeps the no-seam layout byte-for-byte identical", () => {
    const playable = Array.from({ length: 3 }, (_, y) => (
      Array.from({ length: 4 }, (_, x) => [x, y] as const)
    )).flat();
    const gates = [{ side: "top" as const, offset: 1, size: 2 }];
    const devices = [{ x: 4, y: 1.5, quarterTurns: 1 as const }];
    const legacy = buildBoardRimLayout(playable, [], 4, 3, gates, devices);
    const explicitNoSeams = buildBoardRimLayout(playable, [], 4, 3, gates, devices, []);

    expect(JSON.stringify(explicitNoSeams)).toBe(JSON.stringify(legacy));
  });

  it("rims both sides of a horizontal seam and splits the outer side runs at its endpoints", () => {
    const playable = Array.from({ length: 4 }, (_, y) => (
      Array.from({ length: 3 }, (_, x) => [x, y] as const)
    )).flat();
    const rim = buildBoardRimLayout(playable, [], 3, 4, [], [], [
      { orientation: "horizontal", offset: 2, start: 0, size: 3 },
    ]);

    expect(rim.rails).toHaveLength(20);
    expect(rim.rails).toEqual(expect.arrayContaining([
      { x: 0.5, y: 2, quarterTurns: 2 },
      { x: 1.5, y: 2, quarterTurns: 2 },
      { x: 2.5, y: 2, quarterTurns: 2 },
      { x: 0.5, y: 2, quarterTurns: 0 },
      { x: 1.5, y: 2, quarterTurns: 0 },
      { x: 2.5, y: 2, quarterTurns: 0 },
    ]));
    expect(rim.runs).toEqual(expect.arrayContaining([
      { x: 0, y: 2, length: 3, quarterTurns: 0, startConcave: false, endConcave: false },
      { x: 3, y: 2, length: 3, quarterTurns: 2, startConcave: false, endConcave: false },
    ]));
    expect(rim.runs.some((run) => (
      (run.quarterTurns === 1 || run.quarterTurns === 3) && run.length === 4
    ))).toBe(false);
    expect(rim.convexCorners).toEqual(expect.arrayContaining([
      { x: 0, y: 2, quarterTurns: 0 },
      { x: 0, y: 2, quarterTurns: 1 },
      { x: 3, y: 2, quarterTurns: 2 },
      { x: 3, y: 2, quarterTurns: 3 },
    ]));
    expect(rim.convexCorners).toHaveLength(8);
  });

  it("rims both sides of a vertical seam and never joins a neutral run across it", () => {
    const playable = Array.from({ length: 3 }, (_, y) => (
      Array.from({ length: 4 }, (_, x) => [x, y] as const)
    )).flat();
    const rim = buildBoardRimLayout(playable, [], 4, 3, [], [], [
      { orientation: "vertical", offset: 2, start: 0, size: 3 },
    ]);

    expect(rim.rails).toHaveLength(20);
    expect(rim.rails).toEqual(expect.arrayContaining([
      { x: 2, y: 0.5, quarterTurns: 1 },
      { x: 2, y: 1.5, quarterTurns: 1 },
      { x: 2, y: 2.5, quarterTurns: 1 },
      { x: 2, y: 0.5, quarterTurns: 3 },
      { x: 2, y: 1.5, quarterTurns: 3 },
      { x: 2, y: 2.5, quarterTurns: 3 },
    ]));
    expect(rim.runs).toEqual(expect.arrayContaining([
      { x: 2, y: 0, length: 3, quarterTurns: 1, startConcave: false, endConcave: false },
      { x: 2, y: 3, length: 3, quarterTurns: 3, startConcave: false, endConcave: false },
    ]));
    expect(rim.runs.some((run) => (
      (run.quarterTurns === 0 || run.quarterTurns === 2) && run.length === 4
    ))).toBe(false);
    expect(rim.convexCorners).toEqual(expect.arrayContaining([
      { x: 2, y: 0, quarterTurns: 1 },
      { x: 2, y: 0, quarterTurns: 2 },
      { x: 2, y: 3, quarterTurns: 0 },
      { x: 2, y: 3, quarterTurns: 3 },
    ]));
    expect(rim.convexCorners).toHaveLength(8);
  });

  it("reserves portals independently on both seam sides while gates retain device priority", () => {
    const playable = Array.from({ length: 4 }, (_, y) => (
      Array.from({ length: 3 }, (_, x) => [x, y] as const)
    )).flat();
    const gates = [
      {
        side: "bottom" as const,
        offset: 0,
        size: 1,
        portals: [{ side: "bottom" as const, origin: [0, 1] as const, size: 1 }],
      },
      {
        side: "top" as const,
        offset: 0,
        size: 1,
        portals: [{ side: "top" as const, origin: [0, 2] as const, size: 1 }],
      },
    ];
    const rim = buildBoardRimLayout(
      playable,
      [],
      3,
      4,
      gates,
      [
        { x: 0.5, y: 2, quarterTurns: 2 },
        { x: 0.5, y: 2, quarterTurns: 0 },
        { x: 1.5, y: 2, quarterTurns: 2 },
      ],
      [{ orientation: "horizontal", offset: 2, start: 0, size: 3 }],
    );

    expect(rim.gateRails).toEqual(expect.arrayContaining([
      { x: 0.5, y: 2, quarterTurns: 2 },
      { x: 0.5, y: 2, quarterTurns: 0 },
    ]));
    expect(rim.gateRails).toHaveLength(2);
    expect(rim.deviceRails).toEqual([{ x: 1.5, y: 2, quarterTurns: 2 }]);
    const reservedKeys = new Set([...rim.gateRails, ...rim.deviceRails].map((rail) => (
      `${rail.quarterTurns}:${rail.x},${rail.y}`
    )));
    expect(rim.rails.some((rail) => reservedKeys.has(`${rail.quarterTurns}:${rail.x},${rail.y}`)))
      .toBe(false);
    expect(rim.rails.length + rim.gateRails.length + rim.deviceRails.length).toBe(20);
  });

  it("reserves three device rails, splits the neutral run, and conserves the perimeter", () => {
    const playable = Array.from({ length: 3 }, (_, y) => (
      Array.from({ length: 7 }, (_, x) => [x, y] as const)
    )).flat();
    const generator = buildGeneratorRimGeometry({ x: 3.5, y: 0, quarterTurns: 0 });
    const rim = buildBoardRimLayout(playable, [], 7, 3, [], generator.reservedRails);
    const keyOf = ({ x, y, quarterTurns }: { x: number; y: number; quarterTurns: number }) => (
      `${quarterTurns}:${x},${y}`
    );
    const neutralKeys = new Set(rim.rails.map(keyOf));
    const gateKeys = new Set(rim.gateRails.map(keyOf));
    const deviceKeys = new Set(rim.deviceRails.map(keyOf));

    expect(rim.deviceRails).toEqual(generator.reservedRails);
    expect(rim.runs.filter((run) => run.quarterTurns === 0).map((run) => run.length).sort())
      .toEqual([2, 2]);
    expect([...neutralKeys].filter((key) => gateKeys.has(key) || deviceKeys.has(key))).toEqual([]);
    expect([...gateKeys].filter((key) => deviceKeys.has(key))).toEqual([]);
    expect(rim.rails.length + rim.gateRails.length + rim.deviceRails.length).toBe(20);
  });

  it("lets a generator own a three-rail local concave edge without crossing either corner", () => {
    const playable = [
      [0, 0] as const,
      [4, 0] as const,
      ...Array.from({ length: 5 }, (_, x) => [x, 1] as const),
    ];
    const generator = buildGeneratorRimGeometry({ x: 2.5, y: 1, quarterTurns: 0 });
    const baseline = buildBoardRimLayout(playable, [], 5, 2);
    const rim = buildBoardRimLayout(playable, [], 5, 2, [], generator.reservedRails);

    expect(baseline.runs).toContainEqual({
      x: 1,
      y: 1,
      length: 3,
      quarterTurns: 0,
      startConcave: true,
      endConcave: true,
    });
    expect(rim.deviceRails).toEqual(generator.reservedRails);
    expect(rim.runs).not.toContainEqual(expect.objectContaining({
      x: 1,
      y: 1,
      quarterTurns: 0,
    }));
    expect(rim.concaveCorners).toEqual(baseline.concaveCorners);
    expect(rim.rails.length + rim.gateRails.length + rim.deviceRails.length)
      .toBe(baseline.rails.length);
  });

  it("gives gates priority over conflicting device reservations", () => {
    const playable = Array.from({ length: 2 }, (_, y) => (
      Array.from({ length: 5 }, (_, x) => [x, y] as const)
    )).flat();
    const generator = buildGeneratorRimGeometry({ x: 2.5, y: 0, quarterTurns: 0 });
    const rim = buildBoardRimLayout(
      playable,
      [],
      5,
      2,
      [{ side: "top", offset: 2, size: 1 }],
      generator.reservedRails,
    );

    expect(rim.gateRails).toContainEqual({ x: 2.5, y: 0, quarterTurns: 0 });
    expect(rim.deviceRails).toEqual([
      { x: 1.5, y: 0, quarterTurns: 0 },
      { x: 3.5, y: 0, quarterTurns: 0 },
    ]);
    expect(rim.rails.length + rim.gateRails.length + rim.deviceRails.length).toBe(14);
  });

  it("plans one/two/three-cell double-concave runs without a plain rail under either corner", () => {
    const concaveRun = (length: number) => {
      const width = length + 2;
      const playable = [
        [0, 0] as const,
        [width - 1, 0] as const,
        ...Array.from({ length: width }, (_, x) => [x, 1] as const),
      ];
      const rim = buildBoardRimLayout(playable, [], width, 2);
      const run = rim.runs.find((candidate) => (
        candidate.length === length && candidate.startConcave && candidate.endConcave
      ));
      expect(run, `missing ${length}-cell double-concave fixture`).toBeDefined();
      return planBoardRimRun(run!);
    };

    expect(concaveRun(1)).toEqual({
      plain: undefined,
      startBridge: undefined,
      endBridge: undefined,
      splitInnerCorners: true,
    });
    expect(concaveRun(2)).toEqual({
      plain: undefined,
      startBridge: { start: 60, end: 95 },
      endBridge: { start: 95, end: 130 },
      splitInnerCorners: false,
    });
    expect(concaveRun(3)).toEqual({
      plain: undefined,
      startBridge: { start: 60, end: 142 },
      endBridge: { start: 142, end: 225 },
      splitInnerCorners: false,
    });
  });

  it("clips a whole adjacent-corner bridge for a one-cell single-concave run", () => {
    expect(planBoardRimRun({ length: 1, startConcave: true, endConcave: false })).toEqual({
      plain: undefined,
      startBridge: { start: 60, end: 95 },
      endBridge: undefined,
      splitInnerCorners: false,
    });
    expect(planBoardRimRun({ length: 1, startConcave: false, endConcave: true })).toEqual({
      plain: undefined,
      startBridge: undefined,
      endBridge: { start: 0, end: 35 },
      splitInnerCorners: false,
    });
  });

  it("covers every exposed edge exactly once across all 200 campaign masks", () => {
    for (const level of LEVELS) {
      const blocked = new Set((level.blocked ?? []).map(([x, y]) => `${x},${y}`));
      const playable = level.playable ?? Array.from({ length: level.height }, (_, y) => (
        Array.from({ length: level.width }, (_, x) => [x, y] as const)
      )).flat();
      const active = new Set(playable.map(([x, y]) => `${x},${y}`).filter((cell) => !blocked.has(cell)));
      let expectedPerimeter = 0;
      for (const cell of active) {
        const [x, y] = cell.split(",").map(Number);
        for (const [dx, dy, side] of [
          [0, -1, "top"],
          [1, 0, "right"],
          [0, 1, "bottom"],
          [-1, 0, "left"],
        ] as const) {
          if (!active.has(`${x + dx},${y + dy}`)
            || boardRailIsSeam(level, [x, y], side)) expectedPerimeter += 1;
        }
      }
      const rim = buildBoardRimLayout(
        playable,
        level.blocked ?? [],
        level.width,
        level.height,
        [],
        [],
        level.seams ?? [],
      );
      expect(rim.rails, `level ${level.id} exposed rails`).toHaveLength(expectedPerimeter);
      expect(new Set(rim.rails.map((rail) => `${rail.x},${rail.y},${rail.quarterTurns}`)).size, `level ${level.id} unique rails`).toBe(expectedPerimeter);
      expect(rim.runs.reduce((sum, run) => sum + run.length, 0), `level ${level.id} run coverage`).toBe(expectedPerimeter);
      expect(rim.convexCorners.length, `level ${level.id} visible convex corners`).toBeGreaterThanOrEqual(4);
    }
  });
});
