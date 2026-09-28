import { describe, expect, it } from "vitest";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { rect, type LevelSpec } from "../src/core/types";

const timedMechanicFixture = (): LevelSpec => ({
  id: 976,
  name: "countdown start boundary fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 0,
  width: 4,
  height: 3,
  gates: [
    { id: "red-left", side: "left", offset: 2, size: 1, color: "red" },
    { id: "blue-right", side: "right", offset: 1, size: 1, color: "blue" },
  ],
  generators: [{
    id: "timed-feeder",
    side: "top",
    offset: 2,
    spawn: [2, 1],
    queueBlockIds: ["queued-blue"],
    trigger: "time",
    intervalSeconds: 0.5,
    initialDelaySeconds: 0.5,
  }],
  blocks: [
    { id: "starter", x: 0, y: 2, shape: rect(1, 1), color: "red" },
    { id: "queued-blue", x: 2, y: 1, shape: rect(1, 1), color: "blue" },
  ],
});

describe("countdown start boundary", () => {
  it("starts the level clock without activating time-driven mechanics", () => {
    const model = new PuzzleModel(timedMechanicFixture());

    model.startCountdown();
    expect(model.snapshot()).toMatchObject({
      started: true,
      autonomousStarted: false,
      remainingSeconds: 60,
      generators: [{ head: 0, remaining: 1, elapsed: 0 }],
    });

    expect(model.tick(0.75)).toBe(false);
    expect(model.snapshot()).toMatchObject({
      started: true,
      autonomousStarted: false,
      remainingSeconds: 59.25,
      generators: [{ head: 0, remaining: 1, elapsed: 0 }],
    });
    expect(model.getBlock("queued-blue")).toBeUndefined();

    model.beginAction();
    expect(model.moveBlockStep("starter", 1, 2)).toBe(true);
    expect(model.commitAction()).toBe(true);
    expect(model.snapshot().autonomousStarted).toBe(true);

    expect(model.tick(0.49)).toBe(false);
    expect(model.snapshot().generators[0]).toMatchObject({ head: 0, remaining: 1, elapsed: 0.49 });
    expect(model.tick(0.01)).toBe(true);
    expect(model.getBlock("queued-blue")).toMatchObject({ x: 2, y: 1 });
  });
});
