import { describe, expect, it, vi } from "vitest";
import { MASTERPIECE_COLLECTION_CATALOG } from "../src/core/collectionCatalog";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { GAME_LANGUAGES, type GameLanguage } from "../src/game/localization";
import { SUPPLIED_COLLECTION_INTRO_LAYOUT as layout } from "../src/game/suppliedRevealArt";

const painting = MASTERPIECE_COLLECTION_CATALOG[1]!;
type Phase = "unlockPreview" | "intro" | "restoration";

/** Invoke the actual renderer with isolated presentation state, never player storage. */
function presentation(phase: Phase, formalArt: boolean, language: GameLanguage = "zh-CN") {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    globalAlpha: 1,
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(),
    fill: vi.fn(), stroke: vi.fn(), fillRect: vi.fn(), clip: vi.fn(),
    translate: vi.fn(), scale: vi.fn(),
    createRadialGradient: vi.fn(() => gradient), createLinearGradient: vi.fn(() => gradient),
  };
  const supplied = Object.fromEntries(["banner", "titleZh", "titleEn", "button", "close"]
    .map(key => [key, { key }]));
  Object.assign(game, {
    ctx,
    save: Object.freeze({ language, reducedMotion: true,
      collectionProgress: Object.freeze({ inspiration: 50, restoredMasterpieceIds: Object.freeze([]) }) }),
    collectionIntro: Object.freeze({ itemId: painting.id, level: painting.unlockLevel, age: 1.8,
      ...(phase === "unlockPreview" ? { unlockPreview: true } : {}),
      ...(phase === "restoration" ? { restoration: true } : {}) }),
    screen: phase === "unlockPreview" ? "win" : phase === "restoration" ? "records" : "home",
    host: { storageRead: vi.fn(), storageSet: vi.fn() },
    art: {},
    suppliedRevealAssets: vi.fn(() => formalArt ? supplied : undefined),
    // Isolate text rendering from asynchronous decoding/readiness checks. This
    // also exercises the fallback button/text branch without loading images.
    collectionIntroReady: vi.fn(() => true),
    collectionIntroArtworkReady: vi.fn(() => true),
    drawDim: vi.fn(),
    withPopupEntrance: vi.fn((_id: string, _rect: unknown, draw: () => void) => draw()),
    drawPressable: vi.fn((_id: string, _rect: unknown, draw: () => void) => draw()),
    drawCollectionAlbumArtwork: vi.fn(),
    drawCollectionImageContained: vi.fn(),
    drawButton: vi.fn(),
    label: vi.fn(),
  });
  const before = JSON.stringify({ save: game.save, intro: game.collectionIntro });
  return {
    game, ctx, supplied,
    render: () => game.drawCollectionIntro(),
    assertUnchanged: () => {
      expect(JSON.stringify({ save: game.save, intro: game.collectionIntro })).toBe(before);
      expect(game.host.storageRead).not.toHaveBeenCalled();
      expect(game.host.storageSet).not.toHaveBeenCalled();
      expect(MASTERPIECE_COLLECTION_CATALOG.every(item => item.inspirationCost === 50)).toBe(true);
      expect(ctx.save).toHaveBeenCalledTimes(ctx.restore.mock.calls.length);
    },
  };
}

describe("masterpiece reveal hint presentation", () => {
  describe.each([true, false])("formal artwork=%s", formalArt => {
    it.each(GAME_LANGUAGES)("omits only the unlock-preview cost row in %s", language => {
      const { game, supplied, render, assertUnchanged } = presentation("unlockPreview", formalArt, language);
      render();
      const labels = game.label.mock.calls as unknown[][];
      expect(labels.some(call => call[0] === game.albumText("restorationCost", { cost: 50 }))).toBe(false);
      expect(labels.filter(call => call[1] === layout.hint.x && call[2] === layout.hint.y)).toEqual([]);
      expect(labels.some(call => call[0] === game.collectionAlbumItemTitle(painting)
        && call[1] === layout.name.x && call[2] === layout.name.y)).toBe(true);
      expect(game.drawCollectionAlbumArtwork).toHaveBeenCalledWith(painting, layout.artwork, "preview");
      if (formalArt) {
        expect(game.drawCollectionImageContained).toHaveBeenCalledWith(supplied.button, layout.primary);
        expect(labels.some(call => call[0] === game.tr("settlement.continue")
          && call[1] === layout.primary.x + layout.primary.width / 2
          && call[2] === layout.primary.y + layout.primary.height * 0.51)).toBe(true);
      } else {
        expect(game.drawButton).toHaveBeenCalledWith("collectionIntroPrimary", layout.primary,
          game.tr("settlement.continue"), "#43dc38", "#0a8122", 33);
      }
      assertUnchanged();
    });

    it.each(["intro", "restoration"] as const)("retains the existing %s hint", phase => {
      const { game, render, assertUnchanged } = presentation(phase, formalArt);
      render();
      const labels = game.label.mock.calls as unknown[][];
      const hint = game.albumText(phase === "restoration" ? "collected" : "introRestoreHint");
      expect(labels.filter(call => call[1] === layout.hint.x && call[2] === layout.hint.y))
        .toEqual([[hint, layout.hint.x, layout.hint.y, layout.hint.size,
          "#fff6a2", "center", 750, "#5b35c2", 2, layout.hint.maxWidth]]);
      assertUnchanged();
    });
  });
});
