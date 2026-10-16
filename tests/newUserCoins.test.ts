import { describe, expect, it } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

describe("new-player coin balance", () => {
  it("starts a missing save with zero coins", () => {
    const game = Object.create(ColorEscapeGame.prototype) as { sanitizeSave: (value: unknown) => { coins: number } };

    expect(game.sanitizeSave(undefined).coins).toBe(0);
  });

  it("preserves coins from an existing valid save", () => {
    const game = Object.create(ColorEscapeGame.prototype) as { sanitizeSave: (value: unknown) => { coins: number } };

    expect(game.sanitizeSave({ schemaVersion: 1, coins: 275 }).coins).toBe(275);
  });
});
