import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import type { BlockColor, LevelSpec } from "../src/core/types";

const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

const clearLoad = (level: LevelSpec): number => level.blocks
  .reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);

const placementFitsGate = (
  level: LevelSpec,
  block: LevelSpec["blocks"][number],
  gate: LevelSpec["gates"][number],
  x: number,
  y: number,
): boolean => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy] as const);
  const xs = cells.map(([cellX]) => cellX);
  const ys = cells.map(([, cellY]) => cellY);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "bottom") return maxY === level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
  return maxX === level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
};

const geometricallyReachableGateColors = (
  level: LevelSpec,
  block: LevelSpec["blocks"][number],
): { ordinary: Set<BlockColor>; star: Set<BlockColor> } => {
  const playable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const canPlace = (x: number, y: number): boolean => block.shape
    .every(([dx, dy]) => playable.has(`${x + dx},${y + dy}`));
  const ordinary = new Set<BlockColor>();
  const star = new Set<BlockColor>();
  if (!canPlace(block.x, block.y)) return { ordinary, star };
  const queue: Array<readonly [number, number]> = [[block.x, block.y]];
  const visited = new Set([`${block.x},${block.y}`]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    for (const gate of level.gates) {
      if (!placementFitsGate(level, block, gate, x, y)) continue;
      ordinary.add(gate.color);
      if (gate.star) star.add(gate.color);
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = `${nextX},${nextY}`;
      if (visited.has(key) || !canPlace(nextX, nextY)) continue;
      visited.add(key);
      queue.push([nextX, nextY]);
    }
  }
  return { ordinary, star };
};

const strategyProfile = (level: LevelSpec): string => JSON.stringify({
  blocks: level.blocks.length,
  clearLoad: clearLoad(level),
  layerDepths: level.blocks.map((block) => block.layers?.length ?? 1).sort((a, b) => a - b),
  frozenBlocks: level.blocks.map((block) => block.frozen ?? 0).filter(Boolean).sort((a, b) => a - b),
  frozenGates: level.gates.map((gate) => gate.frozen ?? 0).filter(Boolean).sort((a, b) => a - b),
  counters: (level.shutters ?? []).map((shutter) => [shutter.skin ?? "shutter", shutter.count]).sort(),
  generators: (level.generators ?? []).map((generator) => generator.queueBlockIds.length).sort((a, b) => a - b),
  elevators: level.elevators?.length ?? 0,
  conveyors: level.conveyors?.length ?? 0,
  stars: level.blocks.filter((block) => block.star).length,
});

const openingLayoutMetrics = (level: LevelSpec): { active: number; density: number; contacts: number } => {
  const closedShutters = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  const activeBlocks = level.blocks.filter((block) => !block.shutterId || !closedShutters.has(block.shutterId));
  const occupied = new Map<string, string>();
  for (const block of activeBlocks) {
    for (const [dx, dy] of block.shape) occupied.set(`${block.x + dx},${block.y + dy}`, block.id);
  }
  const contactPairs = new Set<string>();
  for (const [key, blockId] of occupied) {
    const [x, y] = key.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const otherId = occupied.get(`${x + dx},${y + dy}`);
      if (otherId && otherId !== blockId) contactPairs.add([blockId, otherId].sort().join("|"));
    }
  }
  return {
    active: activeBlocks.length,
    density: occupied.size / (level.playable?.length ?? level.width * level.height),
    contacts: contactPairs.size,
  };
};

describe("strategy-depth gates", () => {
  it("grows real clear workload through the ten chapters", () => {
    const medians = Array.from({ length: 10 }, (_, chapter) => {
      const loads = VIDEO_PARITY_LEVELS_1_TO_100.slice(chapter * 10, chapter * 10 + 10).map(clearLoad).sort((a, b) => a - b);
      return (loads[4] + loads[5]) / 2;
    });
    expect(medians).toEqual([17, 17, 26.5, 19.5, 30.5, 32, 34, 36, 38, 40]);
  });

  it("keeps every authored color layer geometrically connected to a compatible exit", () => {
    const violations: string[] = [];
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100) {
      for (const block of level.blocks) {
        const reachable = geometricallyReachableGateColors(level, block);
        for (const color of block.layers ?? [block.color]) {
          const exits = block.star ? reachable.star : reachable.ordinary;
          if (!exits.has(color)) violations.push(`Lv${level.id}:${block.id}:${color}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("does not let later chapters collapse into one repeated dependency profile", () => {
    const uniqueProfiles = Array.from({ length: 10 }, (_, chapter) => (
      new Set(VIDEO_PARITY_LEVELS_1_TO_100.slice(chapter * 10, chapter * 10 + 10).map(strategyProfile)).size
    ));
    expect(uniqueProfiles.slice(2).every((count) => count >= 6)).toBe(true);
    expect(uniqueProfiles.slice(5).every((count) => count >= 8)).toBe(true);
  });

  it("keeps late super levels physically occupied and interacting at the opening", () => {
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100.filter((candidate) => candidate.id >= 51 && candidate.difficulty === "super")) {
      const metrics = openingLayoutMetrics(level);
      expect(metrics.density, `Lv${level.id} opening density`).toBeGreaterThanOrEqual(0.17);
      expect(metrics.contacts, `Lv${level.id} touching block pairs`).toBeGreaterThanOrEqual(1);
    }
    for (const id of [58, 68, 78, 88, 98]) {
      const metrics = openingLayoutMetrics(LEVELS[id - 1]);
      expect(metrics.active, `Lv${id} surfaced cargo`).toBeGreaterThanOrEqual(4);
      expect(metrics.contacts, `Lv${id} shared-space contacts`).toBeGreaterThanOrEqual(2);
    }
  });
});
