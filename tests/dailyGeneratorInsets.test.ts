import { describe, expect, it } from "vitest";
import { includeDailyGeneratorSpriteInsets } from "../src/game/dailyGeneratorInsets";
import { buildGeneratorRimGeometry, type GeneratorRimAnchor } from "../src/game/generatorRimGeometry";
import { fitGameplayBoard, GAMEPLAY_BOARD_RIM_VISUAL_INSETS } from "../src/game/gameplayArtLayout";

describe("daily generator native sprite envelope", () => {
  it("fits the actual wide vertical chassis inside the viewport on both sides", () => {
    for (const quarterTurns of [1, 3] as const) {
      const anchor: GeneratorRimAnchor = { x: quarterTurns === 3 ? 0 : 6, y: 3, quarterTurns };
      const geometry = buildGeneratorRimGeometry(anchor);
      const insets = { ...GAMEPLAY_BOARD_RIM_VISUAL_INSETS };
      includeDailyGeneratorSpriteInsets(insets, geometry, 6, 8, 112, 299);
      const fitted = fitGameplayBoard(6, 8, 890, insets, true);
      const actualLeft = fitted.innerX + (anchor.x - (quarterTurns === 3 ? 3 * 112 / 299 : 0)) * fitted.cell;
      const actualRight = fitted.innerX + (anchor.x + (quarterTurns === 1 ? 3 * 112 / 299 : 0)) * fitted.cell;
      expect(actualLeft).toBeGreaterThanOrEqual(6 - 1e-8);
      expect(actualRight).toBeLessThanOrEqual(490 + 1e-8);
    }
  });

  it("accounts for top and bottom native aspect ratio without shrinking the source image", () => {
    const insets = { ...GAMEPLAY_BOARD_RIM_VISUAL_INSETS };
    for (const quarterTurns of [0, 2] as const) {
      includeDailyGeneratorSpriteInsets(insets, buildGeneratorRimGeometry({x:3,y:quarterTurns===0?0:8,quarterTurns}),6,8,285,118);
    }
    expect(insets.top).toBeCloseTo(3 * 118 / 285);
    expect(insets.bottom).toBeCloseTo(3 * 118 / 285);
    const fitted = fitGameplayBoard(6,8,890,insets,true);
    expect(fitted.visualTop).toBeGreaterThanOrEqual(224);
    expect(fitted.visualBottom).toBeLessThanOrEqual(876 + 1e-8);
  });
});
