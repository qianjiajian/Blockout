import { describe, expect, it, vi } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import {
  replayRevisedRoute,
  revisedSpatialStateKey,
  searchRevisedLevel,
  type RevisedSearchDrag,
} from "../src/core/revisedLevelSearch";
import type { LevelSpec } from "../src/core/types";

const fixture = (overrides: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 98620, name: "revised spatial witness fixture", mechanismRules: "revised-2026-09-21-v1.1",
  difficulty: "normal", width: 3, height: 3, timeSeconds: 60, reward: 0,
  gates: [{ id: "gate-red", side: "left", offset: 0, size: 1, color: "red" }],
  blocks: [{ id: "red", x: 1, y: 1, shape: [[0, 0]], color: "red" }],
  ...overrides,
});

const generatorFixture = (): LevelSpec => fixture({
  gates: [
    { id: "gate-red", side: "right", offset: 1, size: 1, color: "red" },
    { id: "gate-blue", side: "left", offset: 1, size: 1, color: "blue" },
    { id: "gate-green", side: "bottom", offset: 1, size: 1, color: "green" },
  ],
  blocks: [
    { id: "red", x: 1, y: 0, color: "red", shape: [[0, 0]] },
    { id: "blue", x: 1, y: 0, color: "blue", shape: [[0, 0]] },
    { id: "green", x: 1, y: 0, color: "green", shape: [[0, 0]] },
  ],
  generators: [{ id: "machine", side: "top", offset: 1, spawn: [1, 0], queueBlockIds: ["blue", "green"] }],
});

const expectWitness = (level: LevelSpec) => {
  const result = searchRevisedLevel(level, { maxStates: 3000, maxTransitions: 200000, maxMilliseconds: 10000 });
  expect(result, JSON.stringify(result)).toMatchObject({
    status: "witness", termination: "witness", rulesProfile: level.mechanismRules,
    witnessFound: true, evidence: "spatial-witness-only", lowerBoundCertified: false, timeValidated: false,
    pointerReplayValidated: false, pointerPolicy: "first-shape-cell-center-and-unit-steps",
    replay: { valid: true, complete: true },
  });
  const replay = replayRevisedRoute(level, result.drags);
  expect(replay).toEqual(result.replay);
  expect(replay.effectiveDrags).toBe(result.drags.length);
  return result;
};

describe("authoritative revised spatial witness search", () => {
  it("searches turns and multiple grid steps within one counted drag", () => {
    const result = expectWitness(fixture());
    expect(result.drags).toHaveLength(1);
    expect(result.drags[0].path.length).toBeGreaterThanOrEqual(2);
    expect(result.drags[0].exitSide).toBe("left");
    expect(result.replay).toMatchObject({ effectiveDrags: 1, nonClearingDrags: 0, clearEvents: 1 });
  });

  it("replays and directly counts non-clearing gestures instead of inferring a lower bound", () => {
    const route: RevisedSearchDrag[] = [
      { blockId: "red", path: [[0, 1]] },
      { blockId: "red", path: [[0, 0]], exitSide: "left" },
    ];
    expect(replayRevisedRoute(fixture(), route)).toMatchObject({
      valid: true, complete: true, effectiveDrags: 2, nonClearingDrags: 1, clearEvents: 1,
    });
    const clearAndPeel = fixture({
      blocks: [{ id: "red", x: 0, y: 0, color: "red", layers: ["red", "blue"], shape: [[0, 0]] }],
      gates: [
        { id: "gate-red", side: "left", offset: 0, size: 1, color: "red" },
        { id: "gate-blue", side: "top", offset: 0, size: 1, color: "blue" },
      ],
    });
    expect(replayRevisedRoute(clearAndPeel, [
      { blockId: "red", path: [], exitSide: "left" },
      { blockId: "red", path: [], exitSide: "top" },
    ])).toMatchObject({ valid: true, complete: true, effectiveDrags: 2, nonClearingDrags: 0, clearEvents: 2 });
  });

  it("finds peel routes using newly toggled current and other flip doors", () => {
    const level = fixture({ gates: [],
      flipDoors: [
        { id: "red-door", color: "red", side: "left", offset: 0, size: 1, initiallyOpen: true },
        { id: "blue-door", color: "blue", side: "top", offset: 0, size: 1, initiallyOpen: false },
      ],
      blocks: [{ id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red", layers: ["red", "blue"] }],
    });
    const result = expectWitness(level);
    expect(result.drags.map(({ exitSide }) => exitSide)).toEqual(["left", "top"]);
    expect(result.replay).toMatchObject({ clearEvents: 2, nonClearingDrags: 0 });
  });

  it("retains hidden ice until after revelation and one later clear", () => {
    const level = fixture({
      gates: [
        { id: "gate-red", side: "left", offset: 0, size: 1, color: "red" },
        { id: "gate-green", side: "left", offset: 1, size: 1, color: "green" },
        { id: "gate-blue", side: "right", offset: 2, size: 1, color: "blue" },
      ],
      blocks: [
        { id: "red", x: 0, y: 0, color: "red", shape: [[0, 0]] },
        { id: "green", x: 0, y: 1, color: "green", shape: [[0, 0]] },
        { id: "blue", x: 2, y: 2, color: "blue", shape: [[0, 0]], frozen: 1, shutterId: "cover" },
      ],
      shutters: [{ id: "cover", x: 2, y: 2, width: 1, height: 1, count: 1 }],
    });
    const result = expectWitness(level);
    expect(result.drags.at(-1)?.blockId).toBe("blue");
    const model = new PuzzleModel(level);
    const first = result.drags[0];
    model.beginAction();
    for (const [x, y] of first.path) expect(model.moveBlockStep(first.blockId, x, y)).toBe(true);
    expect(model.tryExit(first.blockId, first.exitSide!).ok).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(model.getBlock("blue")?.frozen).toBe(1);
    expect(model.snapshot().shutters[0].revealed).toBe(true);
  });

  it("keeps a lift reveal caused mid-drag when continuing through multiple cells", () => {
    const level = fixture({
      gates: [
        { id: "gate-red", side: "right", offset: 1, size: 1, color: "red" },
        { id: "gate-blue", side: "top", offset: 0, size: 1, color: "blue" },
      ],
      blocks: [
        { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
        { id: "blue", x: 0, y: 0, shape: [[0, 0]], color: "blue", shutterId: "lift" },
      ],
      shutters: [{ id: "lift", x: 0, y: 0, width: 1, height: 1, count: 1, skin: "lift" }],
    });
    const result = expectWitness(level);
    expect(result.drags).toHaveLength(2);
    expect(result.drags[0]).toMatchObject({ blockId: "red", exitSide: "right" });
    expect(result.drags[0].path.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps immediate deliveries in each substep and finishes all queued cargo", () => {
    const level = generatorFixture();
    const result = expectWitness(level);
    expect(result.replay?.clearEvents).toBe(3);
    const route: RevisedSearchDrag[] = [
      { blockId: "red", path: [[1, 1], [2, 1]], exitSide: "right" },
      { blockId: "blue", path: [[1, 1], [0, 1]], exitSide: "left" },
      { blockId: "green", path: [[1, 1], [1, 2]], exitSide: "bottom" },
    ];
    expect(replayRevisedRoute(level, route)).toMatchObject({ valid: true, complete: true, effectiveDrags: 3, nonClearingDrags: 0 });
    // A frozen-board movement flood-fill would incorrectly permit returning
    // to the now-occupied mouth. The authoritative replay must reject it.
    expect(replayRevisedRoute(level, [{ blockId: "red", path: [[1, 1], [1, 0]] }]))
      .toMatchObject({ valid: false, error: "Rejected move of red to 1,0." });
  });

  it("accepts the older explicit revised profile without changing unmarked levels", () => {
    expectWitness(fixture({ mechanismRules: "revised-2026-09-21" }));
    expect(searchRevisedLevel(fixture({ mechanismRules: undefined }))).toMatchObject({ status: "unsupported", witnessFound: false });
  });

  it("does not claim a narrow-gate failure is a certified unsatisfiable level", () => {
    const level = fixture({ width: 3, height: 2,
      gates: [{ id: "gate-red", side: "bottom", offset: 1, size: 1, color: "red" }],
      blocks: [{ id: "red", x: 0, y: 0, color: "red", shape: [[0, 0], [1, 0], [2, 0], [1, 1]] }],
    });
    expect(searchRevisedLevel(level)).toMatchObject({ status: "unknown", termination: "search-exhausted", witnessFound: false, lowerBoundCertified: false });
  });
});

describe("revised witness guardrails", () => {
  it("rejects moving away from a usable gate because pointer-down clears immediately", () => {
    const level = fixture({ blocks: [{ id: "red", x: 0, y: 0, color: "red", shape: [[0, 0]] }] });
    const previouslyAccepted: RevisedSearchDrag[] = [
      { blockId: "red", path: [[0, 1]] },
      { blockId: "red", path: [[0, 0]], exitSide: "left" },
    ];
    expect(replayRevisedRoute(level, previouslyAccepted)).toMatchObject({
      valid: false, complete: false, error: "Pointer-down auto-exit of red must precede movement.",
    });
    expect(expectWitness(level).drags).toEqual([{ blockId: "red", path: [], exitSide: "left" }]);
  });

  it("rejects passing through the first available gate without ending the gesture", () => {
    const level = fixture({ gates: [{ id: "gate-red", color: "red", side: "left", offset: 1, size: 1 }] });
    expect(replayRevisedRoute(level, [{
      blockId: "red", path: [[0, 1], [0, 0], [0, 1]], exitSide: "left",
    }])).toMatchObject({ valid: false, error: "First-contact auto-exit of red must end this drag." });
    expect(replayRevisedRoute(level, [{ blockId: "red", path: [[0, 1]] }]).valid).toBe(false);
    expect(expectWitness(level).drags).toEqual([{ blockId: "red", path: [[0, 1]], exitSide: "left" }]);
  });

  it("uses actual UI distance/order on pointer-down and direction priority while moving", () => {
    const gate: LevelSpec["gates"][number] = {
      id: "corner-gate", color: "red", side: "top", offset: 0, size: 1,
      portals: [{ side: "top", origin: [0, 0], size: 1 }, { side: "left", origin: [0, 0], size: 1 }],
    };
    const atCorner = fixture({ gates: [gate], blocks: [{ id: "red", x: 0, y: 0, color: "red", shape: [[0, 0]] }] });
    // Equal-distance pointer-down contacts keep the UI's top-before-left order.
    expect(expectWitness(atCorner).drags).toEqual([{ blockId: "red", path: [], exitSide: "top" }]);
    expect(replayRevisedRoute(atCorner, [{ blockId: "red", path: [], exitSide: "left" }]).valid).toBe(false);
    const fromRight = fixture({ gates: [gate], blocks: [{ id: "red", x: 1, y: 0, color: "red", shape: [[0, 0]] }] });
    expect(expectWitness(fromRight).drags).toEqual([{ blockId: "red", path: [[0, 0]], exitSide: "left" }]);
    expect(replayRevisedRoute(fromRight, [{ blockId: "red", path: [[0, 0]], exitSide: "top" }]).valid).toBe(false);
  });

  it("refuses bombs rather than erasing clocks or pretending a zero-time route passes", () => {
    const level = fixture();
    level.blocks[0].timedBombSeconds = 5;
    const before = JSON.stringify(level);
    const result = searchRevisedLevel(level);
    expect(result).toMatchObject({ status: "unsupported", termination: "unsupported", witnessFound: false, timeValidated: false, drags: [] });
    expect(result.reasons.join(" ")).toContain("Bomb deadlines");
    expect(replayRevisedRoute(level, [])).toMatchObject({ valid: false, complete: false });
    expect(JSON.stringify(level)).toBe(before);
  });

  it("refuses timed/legacy mechanics explicitly", () => {
    const timed = generatorFixture();
    timed.generators![0].trigger = "time";
    timed.generators![0].intervalSeconds = 1;
    expect(searchRevisedLevel(timed)).toMatchObject({ status: "unsupported", termination: "unsupported" });
    const staged = fixture({ shutters: [{ id: "stage", x: 0, y: 0, width: 1, height: 1, count: 1, skin: "staging" }] });
    expect(searchRevisedLevel(staged).status).toBe("unsupported");
  });

  it.each([
    [{ maxStates: 1 }, "max-states"],
    [{ maxDragStates: 1 }, "max-drag-states"],
    [{ maxTransitions: 1 }, "max-transitions"],
  ] as const)("reports budget exhaustion as unknown: %s", (options, termination) => {
    expect(searchRevisedLevel(fixture(), options)).toMatchObject({ status: "unknown", termination, witnessFound: false, drags: [], lowerBoundCertified: false });
  });

  it("bounds wall-clock work and rejects unsafe/non-finite budgets", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(10);
    try {
      expect(searchRevisedLevel(fixture(), { maxMilliseconds: 1 })).toMatchObject({ status: "unknown", termination: "deadline" });
    } finally { clock.mockRestore(); }
    for (const maxStates of [0, -1, Infinity, NaN, 1.5]) {
      expect(searchRevisedLevel(fixture(), { maxStates })).toMatchObject({ status: "invalid", termination: "invalid" });
    }
  });

  it("rejects invalid, diagonal, teleport, no-op, and post-completion drags during independent replay", () => {
    const level = fixture();
    expect(replayRevisedRoute(level, [{ blockId: "red", path: [[0, 0]], exitSide: "left" }]).valid).toBe(false);
    expect(replayRevisedRoute(level, [{ blockId: "missing", path: [] }]).valid).toBe(false);
    expect(replayRevisedRoute(level, [{ blockId: "red", path: [] }]).valid).toBe(false);
    expect(replayRevisedRoute(level, [{ blockId: "red", path: [[1, 3]] }]).valid).toBe(false);
    const successful = expectWitness(level).drags;
    expect(replayRevisedRoute(level, [...successful, { blockId: "red", path: [], exitSide: "left" }]).valid).toBe(false);
    const invalid = fixture({ blocks: [{ id: "bad", x: -1, y: 0, shape: [[0, 0]], color: "red" }] });
    expect(searchRevisedLevel(invalid).status).toBe("invalid");
  });

  it("retains all dynamic spatial state in its key while excluding accumulated move count", () => {
    const base = new PuzzleModel(generatorFixture()).snapshot();
    const key = revisedSpatialStateKey(base);
    expect(revisedSpatialStateKey({ ...base, moves: 500 })).toBe(key);
    const different = (mutate: (state: typeof base) => void): void => {
      const copy = structuredClone(base);
      mutate(copy);
      expect(revisedSpatialStateKey(copy)).not.toBe(key);
    };
    different((state) => { state.blocks[0].x += 1; });
    different((state) => { state.queuedBlocks[0].color = "yellow"; });
    different((state) => { state.gates[0].frozen = 1; });
    different((state) => { state.flipDoors.push({ ...state.gates[0], initiallyOpen: true, open: false }); });
    different((state) => { state.shutters.push({ id: "lift", x: 0, y: 0, width: 1, height: 1, count: 0, skin: "lift", revealed: false }); });
    different((state) => { state.generators[0].head = 1; });
    different((state) => { state.generators[0].remaining = 0; });
    different((state) => { state.cleared += 1; });
  });
});
