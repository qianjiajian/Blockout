import { describe, expect, it } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

const makeGame = (screen: string, activeLevel: number, highestLevel: number): any => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.screen = screen;
  game.save = { highestLevel };
  game.model = { level: { id: activeLevel } };
  return game;
};

describe("booster unlocks on its teaching level", () => {
  it("unlocks the rocket while level 7 is being played even if level 6 is the persisted progress", () => {
    const game = makeGame("playing", 7, 6);
    expect(game.boosterUnlocked("rocket")).toBe(true);
  });

  it("keeps the rocket locked below level 7 and on the home/shop progression value", () => {
    expect(makeGame("playing", 6, 6).boosterUnlocked("rocket")).toBe(false);
    expect(makeGame("home", 7, 6).boosterUnlocked("rocket")).toBe(false);
  });
});
