import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";

describe("document-aligned progression", () => {
  const videoParityLevels1To100 = LEVELS.slice(0, 100);
  const alignedWithMatchingGate = (level: (typeof LEVELS)[number], block: (typeof LEVELS)[number]["blocks"][number]): boolean => {
    const cells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy] as const);
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const color = block.layers?.[0] ?? block.color;
    return level.gates.some((gate) => gate.color === color && (!block.star || gate.star) && (
      (gate.side === "top" && minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size)
      || (gate.side === "bottom" && maxY === level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size)
      || (gate.side === "left" && minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size)
      || (gate.side === "right" && maxX === level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size)
    ));
  };

  it("keeps all 200 levels structurally valid without permanent interior blockers", () => {
    expect(LEVELS).toHaveLength(200);
    for (const level of LEVELS) {
      expect(() => validateLevel(level), `level ${level.id}`).not.toThrow();
      expect(level.blocked ?? [], `level ${level.id} permanent blockers`).toEqual([]);
      expect(
        level.blocks.every((block) => (block.layers?.length ?? 1) <= 2),
        `level ${level.id} one-extra-shell cap`,
      ).toBe(true);
    }
  });

  it("introduces mechanics on the reference milestones", () => {
    expect(videoParityLevels1To100.filter((level) => level.featureIntro).map((level) => [level.id, level.featureIntro?.kind])).toEqual([
      [6, "ice-door"],
      [10, "ice-block"],
      [15, "layer"],
      [20, "shutter"],
      [35, "generator"],
      [50, "arrow-block"],
      [59, "key-lock"],
      [65, "lift"],
      [70, "timed-generator"],
      [73, "staged-frame"],
      [100, "star"],
    ]);
    expect(LEVELS.slice(0, 5).every((level) => (
      level.gates.every((gate) => !gate.frozen)
      && level.blocks.every((block) => !block.frozen && !block.layers && !block.shutterId)
      && !level.shutters?.length
    ))).toBe(true);
    expect(LEVELS[5].gates.some((gate) => (gate.frozen ?? 0) > 0)).toBe(true);
    expect(LEVELS[9].blocks.some((block) => (block.frozen ?? 0) > 0)).toBe(true);
    expect(LEVELS[14].blocks.some((block) => (block.layers?.length ?? 0) > 1)).toBe(true);
    expect(LEVELS[19].shutters?.some((shutter) => shutter.skin === "shutter")).toBe(true);
    expect(LEVELS[34].generators?.length).toBeGreaterThan(0);
    expect(LEVELS[49].blocks.some((block) => block.movementAxis)).toBe(true);
    expect(LEVELS[58].blocks.some((block) => block.keyId || block.lockedBy)).toBe(true);
    expect(LEVELS[64].shutters?.some((shutter) => shutter.skin === "lift")).toBe(true);
    expect(LEVELS[69].generators?.some((generator) => generator.trigger === "time")).toBe(true);
    expect(LEVELS[72].shutters?.some((shutter) => shutter.skin === "staged-frame")).toBe(true);
    expect(LEVELS[99].designTargets).toMatchObject({ calibratedDifficulty: 95, minimumRepositionOverhead: 18 });
    expect(LEVELS[99].blocks.some((block) => block.star)).toBe(true);
    expect(LEVELS[99].gates.some((gate) => gate.star)).toBe(true);
  });

  it("retains the approved planning floor when contract-locked blocks start at matching exits", () => {
    const violations: string[] = [];
    for (const level of videoParityLevels1To100.slice(10)) {
      const offenders = level.blocks.filter((block) => !block.shutterId && alignedWithMatchingGate(level, block));
      violations.push(...offenders.map((block) => `Lv${level.id}:${block.id}`));
      const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
      expect((level.parMoves ?? 0) - clearLoad, `Lv${level.id} planning witness`).toBeGreaterThanOrEqual(
        level.designTargets?.minimumRepositionOverhead ?? 0,
      );
    }
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("progression mechanic rules", () => {
  it("moves a carried block with the timed elevator", () => {
    const level: LevelSpec = {
      id: 901, name: "elevator fixture", difficulty: "normal", timeSeconds: 180, reward: 0,
      width: 4, height: 4,
      gates: [{ id: "blue-right", side: "right", offset: 1, size: 1, color: "blue" }],
      blocks: [{ id: "blue", x: 1, y: 1, shape: [[0, 0]], color: "blue" }],
      elevators: [{ id: "lift", blockId: "blue", fromX: 1, fromY: 1, toX: 2, toY: 1, width: 1, height: 1, periodSeconds: 1 }],
    };
    const model = new PuzzleModel(level);
    model.start();
    model.tick(1.01);
    expect(model.getBlock("blue")).toMatchObject({ x: 2, y: 1 });
    expect(model.snapshot().elevators[0]).toMatchObject({ x: 2, y: 1 });
  });

  it("advances a conveyor payload after a successful clear", () => {
    const level: LevelSpec = {
      id: 902, name: "conveyor fixture", difficulty: "normal", timeSeconds: 180, reward: 0,
      width: 5, height: 4,
      gates: [
        { id: "red-top", side: "top", offset: 0, size: 1, color: "red" },
        { id: "green-right", side: "right", offset: 2, size: 1, color: "green" },
      ],
      blocks: [
        { id: "red", x: 0, y: 0, shape: [[0, 0]], color: "red" },
        { id: "green", x: 1, y: 2, shape: [[0, 0]], color: "green" },
      ],
      conveyors: [{ id: "belt", blockId: "green", x: 1, y: 2, width: 3, height: 1, direction: "right" }],
    };
    const model = new PuzzleModel(level);
    expect(model.tryExit("red", "top").ok).toBe(true);
    expect(model.getBlock("green")).toMatchObject({ x: 2, y: 2 });
  });

  it("requires a star gate only for star-marked blocks", () => {
    const level: LevelSpec = {
      id: 903, name: "star fixture", difficulty: "normal", timeSeconds: 180, reward: 0,
      width: 3, height: 3,
      gates: [
        { id: "normal", side: "top", offset: 0, size: 1, color: "purple" },
        { id: "star", side: "top", offset: 2, size: 1, color: "purple", star: true },
      ],
      blocks: [{ id: "star-block", x: 0, y: 0, shape: [[0, 0]], color: "purple", star: true }],
    };
    const model = new PuzzleModel(level);
    expect(model.exitAttemptStatus("star-block", "top")).toBe("star-gate-required");
    expect(model.moveBlock("star-block", 2, 0)).toBe(true);
    expect(model.exitAttemptStatus("star-block", "top")).toBe("ok");
  });
});
