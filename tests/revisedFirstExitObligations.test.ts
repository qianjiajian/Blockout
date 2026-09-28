import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { checkRevisedRepositionFloor } from "../src/core/revisedRepositionFloor";
import type { BlockColor, BlockSpec, LevelSpec, Point, Side } from "../src/core/types";
// @ts-expect-error Offline proof tool is bundled with domain TS and has no app declaration dependency.
import { certifyFirstExitObligations } from "../tools/revised-first-exit-obligations.mjs";

const rectangle = (width: number, height: number): Point[] => Array.from({ length: height }, (_, y) =>
  Array.from({ length: width }, (_, x): Point => [x, y])).flat();
const single = (id: string, x: number, y: number, color: BlockColor): BlockSpec => ({ id, x, y, color, shape: [[0, 0]] });
const fixture = (): LevelSpec => ({
  id: 21, name: "isolated first-exit obligation fixture", mechanismRules: "revised-2026-09-21-v1.2",
  difficulty: "normal", width: 6, height: 9, timeSeconds: 300, reward: 0,
  playable: rectangle(6, 9).filter(([x, y]) => y !== 0 || (x !== 0 && x !== 5)),
  gates: [
    { id: "red", side: "left", offset: 5, size: 4, color: "red" },
    { id: "blue", side: "right", offset: 3, size: 1, color: "blue" },
    { id: "green", side: "right", offset: 4, size: 1, color: "green", frozen: 2 },
    { id: "yellow", side: "left", offset: 3, size: 2, color: "yellow", frozen: 6 },
    { id: "purple", side: "top", offset: 1, size: 4, color: "purple", frozen: 13 },
  ],
  blocks: [
    { id: "red-pivot", x: 3, y: 5, color: "red", shape: rectangle(3, 4) },
    single("blue-starter", 5, 3, "blue"), single("park-0", 0, 3, "green"), single("park-1", 2, 3, "yellow"),
    ...([[1, 5], [0, 6], [1, 6], [2, 6], [0, 7], [1, 7], [2, 7], [0, 8], [1, 8], [2, 8]] as Point[])
      .map(([x, y]) => single(`obligation-${x}-${y}`, x, y, (x + y) % 2 ? "yellow" : "green")),
    { ...single("c10-ice", 0, 1, "green"), shape: rectangle(2, 1), frozen: 6, shutterId: "c10" },
    { ...single("c10-shell-a", 2, 1, "yellow"), layers: ["yellow", "green"], shutterId: "c10" },
    { ...single("c10-shell-b", 0, 2, "green"), layers: ["green", "purple"], shutterId: "c10" },
    { ...single("c10-plain", 1, 2, "purple"), shutterId: "c10" },
    { ...single("c17-ice-shell", 3, 1, "purple"), shape: rectangle(2, 1), frozen: 2, layers: ["purple", "green"], shutterId: "c17" },
    { ...single("c17-shell", 5, 1, "yellow"), layers: ["yellow", "purple"], shutterId: "c17" },
    { ...single("c17-plain-a", 3, 2, "green"), shutterId: "c17" },
    { ...single("c17-plain-b", 4, 2, "yellow"), shutterId: "c17" },
    { ...single("c19-plain-a", 2, 0, "green"), shutterId: "c19" },
    { ...single("c19-plain-b", 3, 0, "yellow"), shutterId: "c19" },
  ],
  shutters: [
    { id: "c10", x: 0, y: 1, width: 3, height: 2, count: 10 },
    { id: "c17", x: 3, y: 1, width: 3, height: 2, count: 17 },
    { id: "c19", x: 2, y: 0, width: 2, height: 1, count: 19 },
  ],
});
const prove = (level = fixture(), floor = 10) => certifyFirstExitObligations(level, { floor });
const twoPivots = (): LevelSpec => ({
  id: 98712, name: "independent union proof fixture", width: 6, height: 4,
  mechanismRules: "revised-2026-09-21-v1.2", difficulty: "normal", timeSeconds: 60, reward: 0,
  gates: [
    { id: "r-exit", color: "red", side: "left", offset: 1, size: 1 },
    { id: "b-exit", color: "blue", side: "left", offset: 3, size: 1 },
    { id: "g-exit", color: "green", side: "right", offset: 0, size: 4, frozen: 2 },
  ],
  blocks: [
    { id: "r-pivot", color: "red", x: 2, y: 1, shape: rectangle(2, 1) },
    { id: "b-pivot", color: "blue", x: 2, y: 3, shape: rectangle(2, 1) },
    single("a", 0, 1, "green"), single("b", 1, 1, "green"),
    single("c", 0, 3, "green"), single("d", 1, 3, "green"),
  ],
});

describe("restricted first ordinary exit obligation certificate", () => {
  it("proves ten distinct surviving carriers, not twelve occupied cells or a route", () => {
    const level = fixture();
    const serialized = JSON.stringify(level);
    const result = prove(level);
    expect(result).toMatchObject({ status: "threshold-proven", thresholdProven: true, lowerBound: 10,
      pivot: "red-pivot", priorClearUpperBound: 1, hashBindingRequired: true,
      solvabilityValidated: false, pointerReplayValidated: false, timeValidated: false, releaseApproved: false });
    expect(result.exitFootprints).toHaveLength(1);
    expect(result.exitFootprints[0]).toMatchObject({ anchor: [0, 5], gateId: "red", side: "left", blockerCount: 10 });
    expect(result.exitFootprints[0].footprint).toHaveLength(12);
    expect(result.blockers).toHaveLength(10);
    expect(JSON.stringify(level)).toBe(serialized);
    expect(prove(level, 11)).toMatchObject({ status: "unproven", thresholdProven: false, lowerBound: 10 });
  });

  it("uses the actual model's full 3 by 4 rectangle and only possible exit anchor", () => {
    const level = fixture();
    level.blocks = [level.blocks[0]];
    level.shutters = [];
    const valid: Point[] = [];
    for (let y = 0; y <= 5; y++) for (let x = 0; x <= 3; x++) {
      const moved = structuredClone(level);
      moved.blocks[0].x = x;
      moved.blocks[0].y = y;
      if (y === 0) continue; // The two top corners are not playable.
      const model = new PuzzleModel(moved);
      if (model.tryExit("red-pivot", "left").ok) valid.push([x, y]);
    }
    expect(valid).toEqual([[0, 5]]);
  });

  it("has no dependence on shape-cell or block ordering", () => {
    const level = fixture();
    level.blocks.reverse();
    for (const block of level.blocks) block.shape.reverse();
    expect(prove(level)).toMatchObject({ status: "threshold-proven", lowerBound: 10, pivot: "red-pivot" });
  });

  it("keeps small negative shape offsets equivalent to the original board footprint", () => {
    const level = fixture();
    const pivot = level.blocks[0];
    pivot.x += 5;
    pivot.y += 5;
    pivot.shape = pivot.shape.map(([x, y]) => [x - 5, y - 5]);
    const result = prove(level);
    expect(result).toMatchObject({ status: "threshold-proven", lowerBound: 10 });
    expect(result.exitFootprints[0].anchor).toEqual([5, 10]);
    expect(result.exitFootprints[0].footprint).toEqual(prove().exitFootprints[0].footprint);
  });

  it.each([1, -1])("immediately rejects compensated MAX_SAFE_INTEGER geometry (sign %s)", (sign) => {
    const level = fixture();
    const pivot = level.blocks[0];
    const shift = sign * (Number.MAX_SAFE_INTEGER - 8);
    pivot.x += shift;
    pivot.shape = pivot.shape.map(([x, y]) => [x - shift, y]);
    expect(Number.isSafeInteger(pivot.x)).toBe(true);
    expect(pivot.shape.every(([x]) => Number.isSafeInteger(x))).toBe(true);
    expect(prove(level)).toMatchObject({ status: "unsupported", thresholdProven: false,
      reasons: ["Block anchors must be within +/-128 and relative shape offsets within +/-64 in this bounded proof domain"] });
  });

  it("counts a multicell blocker only once", () => {
    const level = fixture();
    level.blocks.find((block) => block.id === "obligation-0-6")!.shape = rectangle(2, 1);
    level.blocks = level.blocks.filter((block) => block.id !== "obligation-1-6");
    expect(prove(level)).toMatchObject({ status: "unproven", lowerBound: 9, thresholdProven: false });
  });

  it("unions fixed mandatory blockers from two ordinary pivots without adding minima", () => {
    const result = prove(twoPivots(), 4);
    expect(result).toMatchObject({ status: "threshold-proven", lowerBound: 4,
      bestSinglePivotLowerBound: 2, mandatoryUnionLowerBound: 4, boundMethod: "mandatory-blocker-union",
      solvabilityValidated: false, pointerReplayValidated: false, timeValidated: false, releaseApproved: false });
    expect(result.mandatoryBlockers).toEqual(["a", "b", "c", "d"]);
    expect(result.supportingPivots).toEqual(["r-pivot", "b-pivot"]);
    expect(result.pivots.map((pivot: { mandatoryBlockers: string[] }) => pivot.mandatoryBlockers)).toEqual([["a", "b"], ["c", "d"]]);
    expect(prove(twoPivots(), 5)).toMatchObject({ status: "unproven", lowerBound: 4 });
  });

  it.each([null, undefined, "invalid", 0, {}])("rejects gate and block colors outside the real palette: %j", (color) => {
    const invalidGate = fixture();
    (invalidGate.gates[2] as unknown as { color: unknown }).color = color;
    expect(prove(invalidGate)).toMatchObject({ status: "unsupported", thresholdProven: false, lowerBound: null });
    const invalidBlock = fixture();
    invalidBlock.blocks[2].layers = ["green"];
    (invalidBlock.blocks[2] as unknown as { color: unknown }).color = color;
    expect(prove(invalidBlock)).toMatchObject({ status: "unsupported", thresholdProven: false, lowerBound: null });
  });

  it.each([null, [], [null], [undefined], Array(1), ["invalid"], ["green", "invalid"], "green", {}])(
    "rejects malformed explicit layers before carrier classification: %j", (layers) => {
      const level = fixture();
      (level.blocks[2] as unknown as { layers: unknown }).layers = layers;
      expect(prove(level)).toMatchObject({ status: "unsupported", thresholdProven: false, lowerBound: null,
        reasons: ["Explicit layers must be a nonempty array of supported palette colors"] });
    },
  );

  it("keeps valid explicit single-color layers in the supported domain", () => {
    const level = fixture();
    level.blocks[2].layers = ["green"];
    expect(prove(level)).toMatchObject({ status: "threshold-proven", lowerBound: 10 });
  });

  it("rejects null-layer fallback inputs that the model can clear with zero non-clearing drags", () => {
    const level = twoPivots();
    (level.gates[2] as unknown as { color: unknown }).color = null;
    for (const block of level.blocks.slice(2)) {
      block.color = "red";
      (block as unknown as { layers: unknown }).layers = [null];
    }
    expect(prove(level, 4)).toMatchObject({ status: "unsupported", thresholdProven: false, lowerBound: null });
    // The previous proof classified these null layers as four frozen-color
    // survivors, while the model falls back to their ordinary red color.
    const model = new PuzzleModel(level);
    let nonClearingDrags = 0;
    const drag = (blockId: string, path: Point[]) => {
      const cleared = model.snapshot().cleared;
      model.beginAction();
      for (const [x, y] of path) expect(model.moveBlockStep(blockId, x, y)).toBe(true);
      expect(model.tryExit(blockId, "left").ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      if (model.snapshot().cleared === cleared) nonClearingDrags++;
    };
    drag("a", []);
    drag("b", [[0, 1]]);
    drag("c", [[0, 2], [0, 1]]);
    drag("d", [[1, 2], [0, 2], [0, 1]]);
    drag("r-pivot", [[1, 1], [0, 1]]);
    drag("b-pivot", [[1, 3], [0, 3]]);
    expect(model.snapshot()).toMatchObject({ complete: true, moves: 6, cleared: 6 });
    expect(nonClearingDrags).toBe(0);
  });

  it("has a real model completion with exactly four non-clearing drags for the union fixture", () => {
    const model = new PuzzleModel(twoPivots());
    let nonClearingDrags = 0;
    const drag = (blockId: string, path: Point[], exitSide?: Side) => {
      const cleared = model.snapshot().cleared;
      model.beginAction();
      for (const [x, y] of path) expect(model.moveBlockStep(blockId, x, y)).toBe(true);
      if (exitSide) expect(model.tryExit(blockId, exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
      if (model.snapshot().cleared === cleared) nonClearingDrags++;
    };
    drag("a", [[0, 0]]);
    drag("b", [[1, 0]]);
    drag("c", [[0, 2]]);
    drag("d", [[1, 2]]);
    drag("r-pivot", [[1, 1], [0, 1]], "left");
    expect(model.snapshot().gates.find((gate) => gate.id === "g-exit")!.frozen).toBe(1);
    drag("b-pivot", [[1, 3], [0, 3]], "left");
    expect(model.snapshot().gates.find((gate) => gate.id === "g-exit")!.frozen).toBe(0);
    drag("b", [[2, 0], [3, 0], [4, 0], [5, 0]], "right");
    drag("a", [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]], "right");
    drag("d", [[2, 2], [3, 2], [4, 2], [5, 2]], "right");
    drag("c", [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2]], "right");
    expect(model.snapshot().complete).toBe(true);
    expect(nonClearingDrags).toBe(4);
    expect(prove(twoPivots(), 4).lowerBound).toBe(nonClearingDrags);
  });

  it("deduplicates one rigid blocker that obstructs both mandatory pivots", () => {
    const level = twoPivots();
    level.blocks.find((block) => block.id === "a")!.shape = rectangle(1, 3);
    level.blocks = level.blocks.filter((block) => block.id !== "c");
    const result = prove(level, 4);
    expect(result).toMatchObject({ status: "unproven", lowerBound: 3,
      bestSinglePivotLowerBound: 2, mandatoryUnionLowerBound: 3 });
    expect(result.mandatoryBlockers).toEqual(["a", "b", "d"]);
    expect(result.pivots.map((pivot: { mandatoryBlockers: string[] }) => pivot.mandatoryBlockers)).toEqual([["a", "b"], ["a", "d"]]);
  });

  it("intersects alternative footprints before union, rather than adding their blockers", () => {
    const level = twoPivots();
    Object.assign(level.gates[0], { offset: 0, size: 2 });
    level.blocks.push(single("alternative-a", 0, 0, "green"), single("alternative-b", 1, 0, "green"));
    const result = prove(level, 3);
    expect(result).toMatchObject({ status: "unproven", lowerBound: 2,
      bestSinglePivotLowerBound: 2, mandatoryUnionLowerBound: 2, mandatoryBlockers: ["c", "d"] });
    expect(result.pivots[0].exitFootprints).toHaveLength(2);
    expect(result.pivots[0].mandatoryBlockers).toEqual([]);
  });

  it("retains the best single-pivot bound when all per-pivot ID intersections are empty", () => {
    const level = twoPivots();
    Object.assign(level.gates[0], { offset: 0, size: 2 });
    Object.assign(level.gates[1], { offset: 2, size: 2 });
    level.blocks.push(single("alternative-a", 0, 0, "green"), single("alternative-b", 1, 0, "green"),
      single("alternative-c", 0, 2, "green"), single("alternative-d", 1, 2, "green"));
    expect(prove(level, 2)).toMatchObject({ status: "threshold-proven", lowerBound: 2,
      bestSinglePivotLowerBound: 2, mandatoryUnionLowerBound: 0, mandatoryBlockers: [], boundMethod: "single-pivot-minimum" });
    expect(prove(level, 3)).toMatchObject({ status: "unproven", lowerBound: 2 });
  });

  it("takes the minimum over a wider gate's alternative exit footprints", () => {
    const level = fixture();
    Object.assign(level.gates[0], { offset: 4, size: 5 });
    Object.assign(level.gates[3], { side: "bottom", offset: 0, size: 1 });
    const result = prove(level);
    expect(result.status).toBe("unproven");
    expect(result.thresholdProven).toBe(false);
    expect(result.lowerBound).toBe(7);
    expect(result.exitFootprints.map((pose: { anchor: Point }) => pose.anchor)).toEqual([[0, 4], [0, 5]]);
  });

  it.each([
    ["third ordinary opening carrier", (level: LevelSpec) => { level.blocks[2].color = "blue"; }],
    ["ice exit thaws after the other ordinary clear", (level: LevelSpec) => { level.gates[2].frozen = 1; }],
    ["opening ordinary shell", (level: LevelSpec) => { level.blocks[1].layers = ["blue", "red"]; }],
    ["opening frozen-color shell", (level: LevelSpec) => { level.blocks[2].layers = ["green", "blue"]; }],
    ["repeated exit color", (level: LevelSpec) => { level.gates[3].color = "red"; }],
    ["explicit gate portal", (level: LevelSpec) => { level.gates[0].portals = [{ side: "left", origin: [0, 5], size: 4 }]; }],
    ["early hidden cohort", (level: LevelSpec) => { level.shutters![0].count = 1; }],
    ["initial auto-reveal", (level: LevelSpec) => { level.shutters![0].count = 0; }],
    ["fractional cover countdown", (level: LevelSpec) => { level.shutters![0].count = 1.5; }],
    ["non-finite cover countdown", (level: LevelSpec) => { level.shutters![0].count = Number.POSITIVE_INFINITY; }],
    ["fractional board cell", (level: LevelSpec) => { level.playable!.push([0.5, 4]); }],
    ["fractional block anchor", (level: LevelSpec) => { level.blocks[0].x = 3.5; }],
    ["fractional shape cell", (level: LevelSpec) => { level.blocks[0].shape[0] = [0.5, 0]; }],
    ["MAX_SAFE_INTEGER shape offset", (level: LevelSpec) => { level.blocks[0].shape[0] = [-Number.MAX_SAFE_INTEGER, 0]; }],
    ["MAX_SAFE_INTEGER block anchor", (level: LevelSpec) => { level.blocks[0].x = Number.MAX_SAFE_INTEGER; }],
    ["MAX_SAFE_INTEGER gate width", (level: LevelSpec) => { level.gates[0].size = Number.MAX_SAFE_INTEGER; }],
    ["MAX_SAFE_INTEGER cover origin", (level: LevelSpec) => { level.shutters![0].x = Number.MAX_SAFE_INTEGER; }],
    ["MAX_SAFE_INTEGER cover width", (level: LevelSpec) => { level.shutters![0].width = Number.MAX_SAFE_INTEGER; }],
    ["lift skin", (level: LevelSpec) => { level.shutters![0].skin = "lift"; }],
    ["bomb", (level: LevelSpec) => { level.blocks[0].timedBombSeconds = 30; }],
    ["key", (level: LevelSpec) => { level.blocks[0].keyId = "k"; }],
    ["lock", (level: LevelSpec) => { level.blocks[0].lockedBy = "k"; }],
    ["star", (level: LevelSpec) => { level.blocks[0].star = true; }],
    ["axis", (level: LevelSpec) => { level.blocks[0].movementAxis = "horizontal"; }],
    ["seam", (level: LevelSpec) => { level.seams = [{ orientation: "vertical", offset: 1, start: 0, size: 1 }]; }],
    ["flip door", (level: LevelSpec) => { level.flipDoors = [{ ...level.gates[0], initiallyOpen: true }]; }],
    ["colored grid", (level: LevelSpec) => { level.coloredGrids = [{ id: "grid", color: "red", cells: [[3, 5]] }]; }],
    ["generator", (level: LevelSpec) => { level.generators = [{ id: "g", side: "left", offset: 0, spawn: [0, 0], queueBlockIds: [] }]; }],
    ["legacy profile", (level: LevelSpec) => { delete level.mechanismRules; }],
  ] as const)("rejects %s instead of retaining the old bound", (_name, mutate) => {
    const level = fixture();
    mutate(level);
    expect(prove(level)).toMatchObject({ status: "unsupported", thresholdProven: false, lowerBound: null });
  });

  it("does not turn an impossible narrow gate into a vacuous ten-drag proof", () => {
    const level = fixture();
    level.gates[0].size = 3;
    expect(prove(level)).toMatchObject({ status: "unproven", lowerBound: 0, thresholdProven: false, pivot: "blue-starter" });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid floor %s", (floor) => {
    expect(prove(fixture(), floor)).toMatchObject({ status: "unsupported", thresholdProven: false });
  });

  it("agrees with exhaustive zero-cost exploration on a small one-obligation puzzle", () => {
    const level: LevelSpec = { id: 98711, name: "one obligation", width: 4, height: 3,
      mechanismRules: "revised-2026-09-21-v1.2", difficulty: "normal", timeSeconds: 60, reward: 0,
      gates: [
        { id: "r", color: "red", side: "left", offset: 1, size: 1 },
        { id: "b", color: "blue", side: "top", offset: 3, size: 1 },
        { id: "g", color: "green", side: "bottom", offset: 0, size: 4, frozen: 2 },
      ],
      blocks: [{ id: "pivot", color: "red", x: 2, y: 1, shape: rectangle(2, 1) },
        single("starter", 3, 0, "blue"), single("blocker", 0, 1, "green")],
    };
    expect(prove(level, 1)).toMatchObject({ status: "threshold-proven", lowerBound: 1 });
    expect(checkRevisedRepositionFloor(level, { floor: 1, maxStates: 1000, maxDragStates: 1000,
      maxTransitions: 200000, maxMilliseconds: 10000 })).toMatchObject({ status: "threshold-proven", thresholdProven: true });
  });
});
