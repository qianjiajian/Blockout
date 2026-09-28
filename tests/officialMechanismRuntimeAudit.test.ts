import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";

const timedGeneratorFixture = (): LevelSpec => ({
  id: 965,
  name: "official timed-generator cadence audit",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 4,
  height: 3,
  gates: [],
  generators: [{
    id: "timed-generator",
    side: "top",
    offset: 0,
    spawn: [0, 1],
    queueBlockIds: ["cargo-a", "cargo-b", "cargo-c"],
    trigger: "time",
    initialDelaySeconds: 0.2,
    intervalSeconds: 0.2,
  }],
  blocks: [
    // The distinct relative cells keep the spawn probes disjoint, isolating
    // cadence catch-up from the separate blocked-spawn rule.
    { id: "cargo-a", x: 0, y: 1, shape: [[0, 0]], color: "red" },
    { id: "cargo-b", x: 0, y: 1, shape: [[1, 0]], color: "blue" },
    { id: "cargo-c", x: 0, y: 1, shape: [[2, 0]], color: "green" },
  ],
});

const liftFixture = (triggerBlockIds?: string[]): LevelSpec => ({
  id: 966,
  name: "official layered-lift validation audit",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 3,
  height: 3,
  gates: [{ id: "red-top", side: "top", offset: 0, size: 1, color: "red" }],
  shutters: [{
    id: "lift-stage",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    count: 1,
    skin: "lift",
    ...(triggerBlockIds === undefined ? {} : { triggerBlockIds }),
  }],
  blocks: [
    { id: "front-layer", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    { id: "hidden-layer", x: 0, y: 0, shape: [[0, 0]], color: "red", shutterId: "lift-stage" },
  ],
});

const starExitFixture = (blockStar: boolean, gateStar: boolean): LevelSpec => ({
  id: 967,
  name: "official star-gate compatibility audit",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 3,
  height: 3,
  gates: [{
    id: gateStar ? "star-gate" : "ordinary-gate",
    side: "top",
    offset: 1,
    size: 1,
    color: "purple",
    star: gateStar,
  }],
  blocks: [{
    id: blockStar ? "star-block" : "ordinary-block",
    x: 1,
    y: 0,
    shape: [[0, 0]],
    color: "purple",
    star: blockStar,
  }],
});

describe("official mechanism runtime audit", () => {
  it("catches up every elapsed timed-generator interval during one large tick", () => {
    const model = new PuzzleModel(timedGeneratorFixture());
    model.start();

    expect(model.tick(0.7)).toBe(true);
    const generator = model.snapshot().generators[0];
    expect(generator).toMatchObject({
      head: 3,
      remaining: 0,
      nextBlockId: undefined,
    });
    expect(generator.elapsed).toBeCloseTo(0.1, 9);
    expect(model.snapshot().blocks.map((block) => block.id)).toEqual([
      "cargo-a",
      "cargo-b",
      "cargo-c",
    ]);
    expect(model.snapshot().queuedBlocks).toEqual([]);
  });

  it.each([
    ["missing", undefined],
    ["empty", []],
  ] as const)("rejects a lift with a %s trigger cohort", (_case, triggerBlockIds) => {
    expect(() => validateLevel(liftFixture(triggerBlockIds ? [...triggerBlockIds] : undefined))).toThrow();
  });

  it("accepts a lift with an exact non-empty trigger cohort", () => {
    expect(() => validateLevel(liftFixture(["front-layer"]))).not.toThrow();
  });

  it.each([
    { blockStar: false, gateStar: false, status: "ok", exits: true },
    { blockStar: false, gateStar: true, status: "ok", exits: true },
    { blockStar: true, gateStar: false, status: "star-gate-required", exits: false },
    { blockStar: true, gateStar: true, status: "ok", exits: true },
  ] as const)(
    "routes block star=$blockStar through gate star=$gateStar as $status",
    ({ blockStar, gateStar, status, exits }) => {
      const model = new PuzzleModel(starExitFixture(blockStar, gateStar));
      const blockId = blockStar ? "star-block" : "ordinary-block";

      expect(model.exitAttemptStatus(blockId, "top")).toBe(status);
      expect(model.tryExit(blockId, "top").ok).toBe(exits);
      expect(model.getBlock(blockId) === undefined).toBe(exits);
    },
  );
});
