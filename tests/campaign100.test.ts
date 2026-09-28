import { describe, expect, it } from "vitest";
import { calibratedBlockOutDifficulty, scoreBlockOutLevel } from "../src/core/blockOutDifficulty";
import { campaignPacingForTarget } from "../src/core/campaignDifficultyTargets";
import { LEVELS, getLevelStrict } from "../src/core/levels";

const VIDEO_CHAPTER_TIMERS = [90, 90, 90, 120, 60, 90, 90, 120, 160, 90] as const;
const VIDEO_PARITY_LEVELS_1_TO_100 = LEVELS.slice(0, 100);

const layoutSignature = (level: (typeof LEVELS)[number]): string => JSON.stringify({
  width: level.width,
  height: level.height,
  playable: level.playable ?? [],
  blocked: level.blocked ?? [],
  gates: level.gates.map((gate) => [gate.side, gate.offset, gate.size, gate.frozen ?? 0]),
  blocks: level.blocks.map((block) => [block.x, block.y, block.shape, block.layers?.length ?? 1, block.frozen ?? 0, block.shutterId ?? ""]),
  shutters: level.shutters ?? [],
  generators: level.generators ?? [],
});

const playableComponentCount = (level: (typeof LEVELS)[number]): number => {
  const remaining = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  let components = 0;
  while (remaining.size > 0) {
    components += 1;
    const first = remaining.values().next().value as string;
    const queue = [first];
    remaining.delete(first);
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index].split(",").map(Number);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const neighbor = `${x + dx},${y + dy}`;
        if (!remaining.delete(neighbor)) continue;
        queue.push(neighbor);
      }
    }
  }
  return components;
};

describe("100-level campaign", () => {
  it("contains exactly 100 newly authored, sequential, unique levels", () => {
    expect(VIDEO_PARITY_LEVELS_1_TO_100).toHaveLength(100);
    expect(VIDEO_PARITY_LEVELS_1_TO_100.map((level) => level.id)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(new Set(VIDEO_PARITY_LEVELS_1_TO_100.map((level) => level.name)).size).toBe(100);
    expect(new Set(VIDEO_PARITY_LEVELS_1_TO_100.map(layoutSignature)).size).toBe(100);
  });

  it("ships the approved v5 mask catalog, including unavoidable repeated rectangles", () => {
    const voidCounts: number[] = [];
    const silhouettes = VIDEO_PARITY_LEVELS_1_TO_100.map((level) => {
      expect(level.playable, `level ${level.id} playable mask`).toBeDefined();
      const cells = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
      const rows = Array.from({ length: level.height }, (_, y) => (
        Array.from({ length: level.width }, (_, x) => cells.has(`${x},${y}`) ? "#" : ".").join("")
      ));
      const voids = level.width * level.height - cells.size;
      voidCounts.push(voids);
      return `${level.width}x${level.height}:${rows.join("/")}`;
    });
    const idsBySilhouette = new Map<string, number[]>();
    silhouettes.forEach((signature, index) => idsBySilhouette.set(signature, [...(idsBySilhouette.get(signature) ?? []), index + 1]));
    const duplicates = [...idsBySilhouette.values()].filter((ids) => ids.length > 1);
    expect(new Set(silhouettes).size, `duplicate silhouettes: ${JSON.stringify(duplicates)}`).toBe(61);
    expect(voidCounts.filter((count) => count > 0).length).toBe(45);
  });

  it("keeps every original tray connected without permanent interior blockers", () => {
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100) {
      expect(level.blocked ?? [], `level ${level.id} static walls`).toEqual([]);
      expect(level.playable?.length ?? 0, `level ${level.id} playable cells`).toBeGreaterThan(0);
      expect(playableComponentCount(level), `level ${level.id} playable components`).toBe(1);
    }
  });

  it("keeps level 63 dense and above its approved planning witness", () => {
    const level = getLevelStrict(63);
    const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    expect(level.blocks.length).toBeGreaterThanOrEqual(30);
    expect(level.parMoves! - clearLoad).toBeGreaterThanOrEqual(level.designTargets?.minimumRepositionOverhead ?? 0);
    expect(level.shutters?.every((shutter) => shutter.skin === "staging")).toBe(true);
  });

  it("rejects invalid campaign ids instead of wrapping into another level", () => {
    expect(() => getLevelStrict(0)).toThrow(RangeError);
    expect(() => getLevelStrict(201)).toThrow(RangeError);
    expect(() => getLevelStrict(1.5)).toThrow(RangeError);
  });

  it("stages mechanic explanations at the current runtime milestones", () => {
    expect(VIDEO_PARITY_LEVELS_1_TO_100.filter((level) => level.featureIntro).map((level) => [level.id, level.featureIntro?.kind])).toEqual([
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
    // Tutorials are metadata over the video-authored level. They must not
    // rewrite the competitor timer or difficulty identity.
    expect(VIDEO_PARITY_LEVELS_1_TO_100.slice(30, 40).map((level) => level.timeSeconds)).toEqual(VIDEO_CHAPTER_TIMERS);
  });

  it("keeps the locked pilot measurements while using approved wave targets afterward", () => {
    const d1 = (id: number) => calibratedBlockOutDifficulty(scoreBlockOutLevel(LEVELS[id - 1]).score);
    expect(LEVELS[4]).toMatchObject({ id: 5, difficulty: "hard", timeSeconds: 150 });
    expect(LEVELS[5]).toMatchObject({ id: 6, difficulty: "hard", timeSeconds: 150 });
    expect(Array.from({ length: 10 }, (_, index) => d1(index + 1))).toEqual([
      30.87, 54.74, 48.7, 56.34, 60.61, 62.28, 60.07, 62.17, 57.91, 60.7,
    ]);

    for (const level of VIDEO_PARITY_LEVELS_1_TO_100.slice(10)) {
      const pacing = campaignPacingForTarget(level.designTargets!.calibratedDifficulty);
      expect(level.difficulty).toBe(pacing.difficulty);
      if (level.id < 31 || level.id > 40) expect(level.timeSeconds).toBe(pacing.timeSeconds);
    }
    expect(VIDEO_PARITY_LEVELS_1_TO_100.slice(30, 40).map((level) => level.timeSeconds)).toEqual(VIDEO_CHAPTER_TIMERS);
    expect(LEVELS[94]).toMatchObject({ id: 95, difficulty: "super", timeSeconds: 120 });
    expect(LEVELS[99]).toMatchObject({ id: 100, difficulty: "super", timeSeconds: 120 });
  });

  it("raises the real planning floor instead of only changing timers and labels", () => {
    const clearLoad = (level: (typeof LEVELS)[number]): number => level.blocks
      .reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    const overhead = (level: (typeof LEVELS)[number]): number | null => (
      level.parMoves === undefined ? null : level.parMoves - clearLoad(level)
    );
    const dependencies = (level: (typeof LEVELS)[number]): number => (
      level.blocks.filter((block) => (
        (block.frozen ?? 0) > 0 || (block.layers?.length ?? 1) > 1 || Boolean(block.shutterId)
      )).length
      + level.gates.filter((gate) => (gate.frozen ?? 0) > 0).length
      + (level.shutters?.length ?? 0)
      + (level.generators?.length ?? 0)
      + (level.elevators?.length ?? 0)
      + (level.conveyors?.length ?? 0)
    );
    expect(VIDEO_PARITY_LEVELS_1_TO_100.filter((level) => level.id > 10 && overhead(level) !== null && overhead(level)! < 3).map((level) => level.id)).toEqual([]);
    expect(VIDEO_PARITY_LEVELS_1_TO_100.filter((level) => level.id > 10 && overhead(level) === null).map((level) => level.id))
      .toEqual([]);
    expect(VIDEO_PARITY_LEVELS_1_TO_100.filter((level) => level.id >= 4 && (level.designTargets?.minimumRepositionOverhead ?? 0) < 5)
      .map((level) => level.id)).toEqual([]);
    expect(VIDEO_PARITY_LEVELS_1_TO_100.slice(0, 10).filter((level) => overhead(level)! < 3).map((level) => level.id)).toEqual([1, 2, 3]);
    expect(LEVELS[0]).toMatchObject({ id: 1, name: "新手教程", parMoves: 3 });
    for (const level of VIDEO_PARITY_LEVELS_1_TO_100.filter((candidate) => candidate.difficulty === "super")) {
      expect((overhead(level) ?? 0) >= 2 || dependencies(level) >= 2, `level ${level.id} super planning`).toBe(true);
      expect(dependencies(level), `level ${level.id} super dependencies`).toBeGreaterThanOrEqual(2);
    }

    const chapterMedianLoads = Array.from({ length: 10 }, (_, chapter) => {
      const values = VIDEO_PARITY_LEVELS_1_TO_100.slice(chapter * 10, chapter * 10 + 10).map(clearLoad).sort((a, b) => a - b);
      return (values[4] + values[5]) / 2;
    });
    expect(chapterMedianLoads).toEqual([17, 17, 26.5, 19.5, 30.5, 32, 34, 36, 38, 40]);

    const strategicBosses = VIDEO_PARITY_LEVELS_1_TO_100.filter((level) => level.id >= 20 && level.id % 10 === 0);
    expect(strategicBosses.every((level) => (overhead(level) ?? 0) + dependencies(level) >= 2)).toBe(true);
  });

  it("raises five-level wave crests without flattening the campaign", () => {
    const peaks = VIDEO_PARITY_LEVELS_1_TO_100.filter((level) => level.id >= 15 && level.id % 5 === 0);
    expect(peaks).toHaveLength(18);
    for (const peak of peaks) {
      const leadIn = VIDEO_PARITY_LEVELS_1_TO_100.slice(peak.id - 5, peak.id - 1);
      expect(peak.designTargets!.calibratedDifficulty).toBeGreaterThan(
        Math.max(...leadIn.map((level) => level.designTargets!.calibratedDifficulty)),
      );
    }
    const peakScores = peaks.map((level) => level.designTargets!.calibratedDifficulty);
    expect(peakScores).toEqual([...peakScores].sort((left, right) => left - right));
  });

});
