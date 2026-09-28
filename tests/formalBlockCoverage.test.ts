import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { GAME_ART } from "../src/game/artManifest";
import { matchFormalBlockShape, type FormalBlockShapeId } from "../src/game/formalBlockShapes";

describe("campaign formal whole-block art coverage", () => {
  it("maps every campaign silhouette and visible layer to a dedicated whole sprite", () => {
    const missing: string[] = [];

    for (const level of LEVELS) {
      for (const block of level.blocks) {
        const match = matchFormalBlockShape(block.shape);
        if (!match) {
          missing.push(`Lv${level.id}/${block.id}:unmapped-shape`);
          continue;
        }

        const colors = block.layers?.length ? block.layers : [block.color];
        for (const color of colors) {
          const solid = GAME_ART.gameplay.formalBlocks[color].solid as Partial<Record<FormalBlockShapeId, string>>;
          if (!solid[match.shapeId]) {
            missing.push(`Lv${level.id}/${block.id}:${color}/shape-${match.shapeId}`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("never assigns a single-cell sprite path to a multi-cell silhouette", () => {
    for (const level of LEVELS) {
      for (const block of level.blocks) {
        if (block.shape.length <= 1) continue;
        const match = matchFormalBlockShape(block.shape);
        expect(match, `Lv${level.id}/${block.id}`).toBeDefined();
        const color = block.layers?.[0] ?? block.color;
        const solid = GAME_ART.gameplay.formalBlocks[color].solid as Partial<Record<FormalBlockShapeId, string>>;
        expect(solid[match!.shapeId], `Lv${level.id}/${block.id}`).not.toMatch(/-single\.png$/);
      }
    }
  });
});
