import { describe, expect, it } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

const game = Object.create(ColorEscapeGame.prototype) as any;

describe("initial inspiration", () => {
  it("starts a new profile with 50 and preserves the balance on subsequent loads", () => {
    const fresh = game.sanitizeSave(undefined);
    expect(fresh.collectionProgress.inspiration).toBe(50);
    fresh.collectionProgress.inspiration = 17;
    expect(game.sanitizeSave(fresh).collectionProgress.inspiration).toBe(17);
  });

  it("does not grant inspiration to historical profiles with zero or missing collection data", () => {
    const fresh = game.sanitizeSave(undefined);
    expect(game.sanitizeSave({ ...fresh, collectionProgress: undefined }).collectionProgress.inspiration).toBe(0);
    expect(game.sanitizeSave({ ...fresh, collectionProgress: { ...fresh.collectionProgress, inspiration: 0 } })
      .collectionProgress.inspiration).toBe(0);
  });
});
