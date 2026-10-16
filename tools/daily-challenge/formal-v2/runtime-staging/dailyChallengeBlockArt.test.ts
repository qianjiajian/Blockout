// @ts-expect-error Node ambient types are intentionally excluded from the app tsconfig.
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { FORMAL_DAILY_CHALLENGE_CATALOG, getFormalDailyChallengeLevel } from "../src/core/formalDailyChallengeData";
import { dailyVariantForSource, dailyVariantIdentity, deriveDailyChallengeLevel } from "../src/core/dailyChallengeVariant";
import { validateLevel } from "../src/core/PuzzleModel";
import type { LevelSpec } from "../src/core/types";
import { matchFormalBlockShapeForLevel } from "../src/game/formalBlockShapes";
import { GAME_ART } from "../src/game/artManifest";

function verifyWholeBlockArt(level: LevelSpec) {
  for (const block of level.blocks) {
    const match = matchFormalBlockShapeForLevel(block.shape, level.id);
    expect(match, `${block.id}: whole silhouette`).toBeDefined();
    if (level.id !== 5) expect(match!.quarterTurns, block.id).toBe(0);
    const layers = block.layers?.length ? block.layers : [block.color];
    layers.forEach((color, index) => {
      const family = GAME_ART.gameplay.formalBlocks[color];
      for (const kind of index < layers.length - 1 ? ["solid", "shell"] as const : ["solid"] as const) {
        const path = (family[kind] as Partial<Record<number, string>>)[match!.shapeId];
        expect(path, `${block.id}: ${color}/${kind}`).toBeTruthy();
        expect(existsSync(`public/${path}`), `${block.id}: ${path}`).toBe(true);
      }
    });
  }
}

describe("daily challenge whole-block artwork", () => {
  it("keeps all 21 blocks visible in the reported source-187 slot", () => {
    const source = LEVELS.find(({ id }) => id === 187)!;
    const slot = "daily-mechanisms-frozen-exit-6-d3-09";
    expect(dailyVariantIdentity(slot).transform).toBe("rotate-180");
    const adapted = deriveDailyChallengeLevel(source, slot);
    expect(adapted.blocks).toHaveLength(21);
    expect(adapted.blocks.reduce((cells, block) => cells + block.shape.length, 0)).toBe(56);
    verifyWholeBlockArt(adapted);
    validateLevel(adapted);
    expect(deriveDailyChallengeLevel(source, slot)).toEqual(adapted);
  });

  it("covers every layer, hidden block and queued block in all 450 runtime slots", () => {
    const sourceBefore = JSON.stringify(LEVELS);
    let checked = 0;
    for (const stage of FORMAL_DAILY_CHALLENGE_CATALOG) {
      for (const difficulty of Object.values(stage.difficulties)) {
        for (const candidate of difficulty.candidates) {
          const adapted = getFormalDailyChallengeLevel(candidate.formalId)!;
          expect(adapted).toEqual(candidate.level);
          expect(adapted.id).toBe(candidate.sourceLevelId);
          expect(candidate.layoutFactory).toBe("explicit-certified-v2");
          verifyWholeBlockArt(adapted);
          validateLevel(adapted);
          checked++;
        }
      }
    }
    expect(checked).toBe(450);
    expect(JSON.stringify(LEVELS)).toBe(sourceBefore);
  });

  it("does not introduce rotated sprites when adapting the legacy source-5 shapes", () => {
    const source = LEVELS.find(({ id }) => id === 5)!;
    const slot = "daily-legacy-source-5";
    const identity = dailyVariantForSource(source, slot);
    const adapted = deriveDailyChallengeLevel(source, slot);
    if (identity.transform === "identity") {
      expect(adapted.blocks.map(({ shape, x, y }) => ({ shape, x, y })))
        .toEqual(source.blocks.map(({ shape, x, y }) => ({ shape, x, y })));
    } else {
      expect(adapted.blocks.every((block) => matchFormalBlockShapeForLevel(block.shape, 5)?.quarterTurns === 0)).toBe(true);
    }
    verifyWholeBlockArt(adapted);
  });
});
