import { describe, expect, it } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

const gameWithSnapshot = (remainingSeconds: number): any => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.screen = "paused";
  game.model = {
    readStatus: () => ({
      started: true,
      remainingSeconds,
    }),
  };
  return game;
};

describe("paused challenge music", () => {
  it("keeps the current challenge track playing on the pause panel", () => {
    expect(gameWithSnapshot(90).musicScene()).toBe("gameplay");
    expect(gameWithSnapshot(12).musicScene()).toBe("danger");
  });

  it("keeps settlement screens silent", () => {
    const game = gameWithSnapshot(90);
    game.screen = "settlementFailed";
    expect(game.musicScene()).toBe("silent");
  });
});
