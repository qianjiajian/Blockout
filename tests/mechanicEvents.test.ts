import { describe, expect, it } from "vitest";
import { detectMechanicEvents } from "../src/core/mechanicEvents";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec, Side } from "../src/core/types";

const eventFixture = (): LevelSpec => ({
  id: 995,
  name: "event fixture",
  difficulty: "normal",
  timeSeconds: 180,
  reward: 0,
  width: 4,
  height: 4,
  gates: [
    { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
    { id: "blue-bottom", side: "bottom", offset: 2, size: 2, color: "blue", frozen: 1 },
  ],
  shutters: [{ id: "cargo-door", x: 2, y: 2, width: 2, height: 1, count: 1 }],
  blocks: [
    { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
    { id: "blue", x: 2, y: 2, shape: [[0, 0], [1, 0]], color: "blue", frozen: 1, shutterId: "cargo-door" },
  ],
});

const clearAndDetect = (level: LevelSpec, blockId: string, side: Side) => {
  const model = new PuzzleModel(level);
  const before = model.snapshot();
  expect(model.tryExit(blockId, side).ok).toBe(true);
  return detectMechanicEvents(before, model.snapshot());
};

describe("mechanism feedback events", () => {
  it("reports frozen gate countdowns and exact unlock transitions", () => {
    const event = clearAndDetect(eventFixture(), "red", "top")
      .find((candidate) => candidate.kind === "ice" && candidate.target === "gate" && candidate.unlocked);
    expect(event).toMatchObject({ id: "blue-bottom", previous: 1, remaining: 0, unlocked: true });
  });

  it("reports a layer peel while the block remains playable with its inner color", () => {
    const fixture: LevelSpec = {
      id: 994, name: "layer event fixture", difficulty: "normal", timeSeconds: 180, reward: 0,
      width: 3, height: 3,
      gates: [
        { id: "red-top", side: "top", offset: 1, size: 1, color: "red" },
        { id: "blue-bottom", side: "bottom", offset: 1, size: 1, color: "blue" },
      ],
      blocks: [{ id: "layered", x: 1, y: 0, shape: [[0, 0]], color: "red", layers: ["red", "blue"] }],
    };
    const event = clearAndDetect(fixture, "layered", "top")
      .find((candidate) => candidate.kind === "layer" && candidate.target === "block");
    expect(event).toMatchObject({ id: "layered", previous: 2, remaining: 1, unlocked: true });
  });

  it("reports the exact shutter opening transition", () => {
    const event = clearAndDetect(eventFixture(), "red", "top")
      .find((candidate) => candidate.kind === "shutter" && candidate.unlocked);
    expect(event).toMatchObject({ id: "cargo-door", previous: 1, remaining: 0, unlocked: true });
  });

  it("maps a pulse thaw to the same feedback event contract", () => {
    const model = new PuzzleModel(eventFixture());
    const before = model.snapshot();
    expect(model.thawAll(1)).toBe(true);
    const events = detectMechanicEvents(before, model.snapshot());
    expect(events.some((event) => event.target === "block" && event.kind === "ice")).toBe(true);
    expect(events.some((event) => event.target === "gate" && event.kind === "ice")).toBe(true);
    expect(events.some((event) => event.target === "shutter" && event.kind === "shutter")).toBe(true);
    expect(events.every((event) => event.remaining < event.previous)).toBe(true);
  });

  it("preserves the generator skin so its feedback is not mislabeled as a roll shutter", () => {
    const fixture = eventFixture();
    fixture.shutters![0].skin = "generator";
    const event = clearAndDetect(fixture, "red", "top")
      .find((candidate) => candidate.kind === "shutter" && candidate.target === "shutter");
    expect(event).toMatchObject({ id: "cargo-door", skin: "generator", unlocked: true });
  });

  it("keeps internal staging countdowns out of player-facing mechanism events", () => {
    const fixture = eventFixture();
    fixture.shutters![0].skin = "staging";
    const events = clearAndDetect(fixture, "red", "top");

    expect(events.some((event) => event.target === "shutter")).toBe(false);
  });

  it("reports the exact conveyor payload movement caused by a successful clear", () => {
    const fixture: LevelSpec = {
      id: 993, name: "conveyor event fixture", difficulty: "normal", timeSeconds: 180, reward: 0,
      width: 5, height: 3,
      gates: [{ id: "red-top", side: "top", offset: 0, size: 1, color: "red" }],
      conveyors: [{ id: "belt", blockId: "blue", x: 1, y: 1, width: 3, height: 1, direction: "right" }],
      blocks: [
        { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
        { id: "blue", x: 1, y: 1, shape: [[0, 0]], color: "blue" },
      ],
    };
    const event = clearAndDetect(fixture, "red", "top")
      .find((candidate) => candidate.kind === "conveyor");
    expect(event).toMatchObject({
      target: "block",
      id: "blue",
      deviceId: "belt",
      from: [1, 1],
      to: [2, 1],
      unlocked: true,
    });
  });
});
