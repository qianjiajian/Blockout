import { describe, expect, it } from "vitest";
import { portalMouthCells } from "../src/core/gatePortals";
import type { GatePortalSpec, Point, Side } from "../src/core/types";
import {
  boardPortalRimRun,
  buildBoardRimLayout,
  splitBoardRimRunIntoSegments,
  type BoardRimRun,
} from "../src/game/boardRim";

const sides: Side[] = ["top", "right", "bottom", "left"];
const cases = sides.flatMap(side => [1, 2, 3, 4, 6].map(size => ({ side, size })));
const railKey = (x: number, y: number, quarterTurns: number): string => `${quarterTurns}:${x},${y}`;
const runRails = (run: BoardRimRun): string[] => {
  const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][run.quarterTurns];
  return Array.from({ length: run.length }, (_, index) => railKey(
    run.x + dx * (index + 0.5), run.y + dy * (index + 0.5), run.quarterTurns));
};
const mouthRails = (portal: GatePortalSpec): string[] => portalMouthCells(portal).map(([x, y]) => {
  if (portal.side === "top") return railKey(x + 0.5, y, 0);
  if (portal.side === "right") return railKey(x + 1, y + 0.5, 1);
  if (portal.side === "bottom") return railKey(x + 0.5, y + 1, 2);
  return railKey(x, y + 0.5, 3);
});

describe("neutral backing for a fading local gate", () => {
  it.each(cases)("covers every $side mouth rail at span $size with native <=3-cell strips", ({ side, size }) => {
    const portal: GatePortalSpec = { side, origin: [3, 4], size };
    const original = structuredClone(portal);
    const run = boardPortalRimRun(portal);
    const expectedStart = {
      top: { x: 3, y: 4, quarterTurns: 0 },
      right: { x: 4, y: 4, quarterTurns: 1 },
      bottom: { x: 3 + size, y: 5, quarterTurns: 2 },
      left: { x: 3, y: 4 + size, quarterTurns: 3 },
    }[side];
    expect(run).toEqual({ ...expectedStart, length: size, startConcave: false, endConcave: false });
    expect(runRails(run).sort()).toEqual(mouthRails(portal).sort());
    const segments = splitBoardRimRunIntoSegments(run);
    expect(segments.map(segment => segment.length)).toEqual(
      size <= 3 ? [size] : size === 4 ? [3, 1] : [3, 3]);
    expect(segments.every(segment => segment.length >= 1 && segment.length <= 3)).toBe(true);
    expect(segments.every(segment => segment.quarterTurns === run.quarterTurns
      && !segment.startConcave && !segment.endConcave)).toBe(true);
    const splitRails = segments.flatMap(runRails);
    expect(splitRails).toHaveLength(size);
    expect(new Set(splitRails).size).toBe(size);
    expect(splitRails.sort()).toEqual(mouthRails(portal).sort());
    expect(portal).toEqual(original);
  });

  it.each(sides)("uses the real %s inner-void boundary, not the rectangular board edge", side => {
    const playable: Point[] = Array.from({ length: 10 }, (_, y) =>
      Array.from({ length: 10 }, (_, x) => [x, y] as Point)).flat()
      .filter(([x, y]) => !(x >= 3 && x <= 6 && y >= 2 && y <= 5));
    const origins: Record<Side, Point> = { top: [3, 6], right: [2, 2], bottom: [3, 1], left: [7, 2] };
    const portal: GatePortalSpec = { side, origin: origins[side], size: 3 };
    const gate = { side, offset: 0, size: 3, portals: [portal] };
    const occupied = buildBoardRimLayout(playable, [], 10, 10, [gate]);
    const restored = buildBoardRimLayout(playable, [], 10, 10);
    const backing = splitBoardRimRunIntoSegments(boardPortalRimRun(portal)).flatMap(runRails).sort();
    expect(backing).toEqual(occupied.gateRails.map(rail => railKey(rail.x, rail.y, rail.quarterTurns)).sort());
    const normalRails = restored.runs.flatMap(runRails);
    for (const key of backing) expect(normalRails).toContain(key);
    // Existing geometric corners belong to the normal rim pass, not the backing.
    expect(occupied.convexCorners).toEqual(restored.convexCorners);
    expect(occupied.concaveCorners).toEqual(restored.concaveCorners);
    const run = boardPortalRimRun(portal);
    expect(side === "top" || side === "bottom" ? run.y : run.x).toBeGreaterThan(0);
    expect(side === "top" || side === "bottom" ? run.y : run.x).toBeLessThan(10);
  });

  it("keeps separate apertures of one gate on their own local rails", () => {
    const portals: GatePortalSpec[] = [
      { side: "top", origin: [1, 4], size: 2 },
      { side: "top", origin: [5, 4], size: 1 },
      { side: "right", origin: [3, 6], size: 4 },
    ];
    const actual = portals.flatMap(portal => splitBoardRimRunIntoSegments(boardPortalRimRun(portal)).flatMap(runRails));
    expect(actual.sort()).toEqual(portals.flatMap(mouthRails).sort());
    expect(new Set(actual).size).toBe(7);
    expect(actual).not.toContain(railKey(3.5, 4, 0));
    expect(actual).not.toContain(railKey(4.5, 4, 0));
  });

  it.each(sides)("keeps a retired two-cell %s slot separate from adjacent one/three-cell neutral runs", side => {
    const playable: Point[] = Array.from({ length: 6 }, (_, y) =>
      Array.from({ length: 6 }, (_, x) => [x, y] as Point)).flat();
    const origins: Record<Side, Point> = { top: [1, 0], right: [5, 1], bottom: [1, 5], left: [0, 1] };
    const portal: GatePortalSpec = { side, origin: origins[side], size: 2 };
    const gate = { side, offset: 1, size: 2, portals: [portal] };
    const direction = sides.indexOf(side);

    // Retirement changes opacity, not the authored gate reservation. Keeping
    // this slot makes the neighboring neutral sections remain one and three.
    const reserved = buildBoardRimLayout(playable, [], 6, 6, [gate]);
    const adjacent = reserved.runs.filter(run => run.quarterTurns === direction);
    expect(adjacent.map(run => run.length).sort((a, b) => a - b)).toEqual([1, 3]);
    const backing = splitBoardRimRunIntoSegments(boardPortalRimRun(portal));
    expect(backing).toHaveLength(1);
    expect(backing[0].length).toBe(2);
    const gateRails = new Set(mouthRails(portal));
    expect(backing.flatMap(runRails).sort()).toEqual([...gateRails].sort());
    expect(adjacent.flatMap(runRails).every(rail => !gateRails.has(rail))).toBe(true);

    // The fully retired frame is the existing neutral sections plus exactly
    // the original two-cell native strip; no rail is omitted or painted twice.
    const retiredSegments = [...adjacent.flatMap(splitBoardRimRunIntoSegments), ...backing];
    expect(retiredSegments.map(run => run.length).sort((a, b) => a - b)).toEqual([1, 2, 3]);
    const retiredRails = retiredSegments.flatMap(runRails);
    expect(retiredRails).toHaveLength(6);
    expect(new Set(retiredRails).size).toBe(6);

    // Regression control: dropping all gate reservations rejoins six rails,
    // then native splitting turns them into 3+3 and crosses the old gate seam.
    const unreserved = buildBoardRimLayout(playable, [], 6, 6);
    const merged = unreserved.runs.filter(run => run.quarterTurns === direction);
    expect(merged.map(run => run.length)).toEqual([6]);
    const oldSegments = merged.flatMap(splitBoardRimRunIntoSegments);
    expect(oldSegments.map(run => run.length)).toEqual([3, 3]);
    expect(oldSegments.some(run => {
      const rails = runRails(run);
      return rails.some(rail => gateRails.has(rail)) && rails.some(rail => !gateRails.has(rail));
    })).toBe(true);
    expect(retiredRails.sort()).toEqual(oldSegments.flatMap(runRails).sort());
  });
});
