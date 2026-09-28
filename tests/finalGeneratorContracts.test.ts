import { describe, expect, it } from "vitest";
import truth1To100Text from "../deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json?raw";
import truth101To200Text from "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json?raw";
import { validateLevel } from "../src/core/PuzzleModel";
import {
  GENERATOR_CONTRACT_RESTORE_LEVEL_IDS,
  extractGeneratorTruthContracts,
  finalGeneratorPlacementIssues,
  finalGeneratorTruthIssues,
} from "../src/core/finalGeneratorContracts";
import { LEVELS, LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR } from "../src/core/levels";
import { VIDEO_PARITY_LEVELS } from "../src/core/videoParityLevels.generated";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "../src/core/videoParityLevels101To200.generated";

const truthContracts = [truth1To100Text, truth101To200Text]
  .flatMap((text) => extractGeneratorTruthContracts(JSON.parse(text.replace(/^\uFEFF/, ""))));

const canonicalLevel = (levelId: number) => levelId <= 100
  ? VIDEO_PARITY_LEVELS[levelId - 1]
  : VIDEO_PARITY_LEVELS_101_TO_200[levelId - 101];
const generatorMechanics = (generator: NonNullable<(typeof LEVELS)[number]["generators"]>[number]) => ({
  id: generator.id,
  spawn: generator.spawn,
  queueBlockIds: generator.queueBlockIds,
  trigger: generator.trigger,
  intervalSeconds: generator.intervalSeconds,
  initialDelaySeconds: generator.initialDelaySeconds,
});
const generatorMechanicsWithoutSpawn = (generator: NonNullable<(typeof LEVELS)[number]["generators"]>[number]) => ({
  ...generatorMechanics(generator),
  spawn: undefined,
});
const EXPECTED_RESTORED_QUEUE_LENGTHS = new Map<number, number[]>([
  [70, [17]],
  [119, [2, 2]],
  [129, [4, 5]],
  [132, [3, 3, 3, 3]],
  [138, [2]],
  [139, [4]],
  [143, [2]],
  [161, [2, 2]],
  [177, [3]],
  [183, [4]],
  [186, [3, 4]],
]);

describe("final generator contracts", () => {
  it("matches both canonical truth schemas for all 200 levels", () => {
    expect(truthContracts).toHaveLength(200);
    expect(new Set(truthContracts.map(({ levelId }) => levelId)).size).toBe(200);
    expect(finalGeneratorTruthIssues(LEVELS, truthContracts)).toEqual([]);

    const generatorLevels = LEVELS.filter((level) => level.generators?.length);
    expect(generatorLevels).toHaveLength(36);
    expect(generatorLevels.reduce((sum, level) => sum + level.generators!.length, 0)).toBe(62);
    expect(generatorLevels.reduce((sum, level) => sum
      + level.generators!.reduce((queueSum, generator) => queueSum + generator.queueBlockIds.length, 0), 0)).toBe(216);
    expect(generatorLevels.flatMap((level) => {
      const blocks = new Map(level.blocks.map((block) => [block.id, block] as const));
      return level.generators!.flatMap((generator) => generator.queueBlockIds.filter((blockId) => (
        (blocks.get(blockId)?.frozen ?? 0) > 0
      )).map((blockId) => `Lv${level.id}:${generator.id}:${blockId}`));
    })).toEqual([]);
  });

  it("understands queue_length and queue_count without converting unknown values to zero", () => {
    expect(extractGeneratorTruthContracts({
      levels: [{
        level: 101,
        mechanisms: { generators: [{ queue_length: 2 }, { queue_count: 4 }] },
      }],
    })).toEqual([{ levelId: 101, count: 2, queueLengths: [2, 4] }]);
    expect(extractGeneratorTruthContracts({
      levels: [{ level: 102, mechanisms: { generators: [{ queue_length: null }] } }],
    })).toEqual([{ levelId: 102, count: 1, queueLengths: null }]);
  });

  it("puts every machine on an exposed three-rail span with valid queue spawns", () => {
    const issues: string[] = [];
    for (const level of LEVELS) {
      expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
      issues.push(...finalGeneratorPlacementIssues(level));
    }
    expect(issues).toEqual([]);
  });

  it("restores exact canonical queues while preserving generator mechanics", () => {
    for (const levelId of GENERATOR_CONTRACT_RESTORE_LEVEL_IDS) {
      const level = LEVELS[levelId - 1]!;
      const preAlignment = LEVELS_BEFORE_GENERATOR_SPAWN_ALIGNMENT_REPAIR[levelId - 1]!;
      const canonical = canonicalLevel(levelId)!;
      expect(level.generators?.map((generator) => generator.queueBlockIds.length), `Lv${levelId} queue lengths`)
        .toEqual(EXPECTED_RESTORED_QUEUE_LENGTHS.get(levelId));
      expect(preAlignment.generators?.map(generatorMechanics), `Lv${levelId} canonical mechanics`)
        .toEqual(canonical.generators?.map(generatorMechanics));
      expect(level.generators?.map(generatorMechanicsWithoutSpawn), `Lv${levelId} post-alignment mechanics`)
        .toEqual(preAlignment.generators?.map(generatorMechanicsWithoutSpawn));
      const queuedIds = new Set(level.generators!.flatMap((generator) => generator.queueBlockIds));
      expect(level.blocks.filter((block) => queuedIds.has(block.id) && block.shutterId), `Lv${levelId} queue shutter binding`)
        .toEqual([]);
    }
  });

  it("anchors Lv114 to its repaired local top edge", () => {
    const level = LEVELS[113]!;
    expect(level.generators).toHaveLength(1);
    expect(level.generators![0]).toMatchObject({
      rimSpan: 3,
      rimMount: "rim",
      rimAnchor: { x: 2.5, y: 3, quarterTurns: 0 },
    });
    expect(level.playable).toContainEqual([3, 3]);
    expect(level.playable).toContainEqual([3, 4]);
  });
});
