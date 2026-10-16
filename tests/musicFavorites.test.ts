import { describe, expect, it } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

describe("music playlist favorites", () => {
  it("defaults unlocked tracks to lit without storing a fixed allow-list", () => {
    const game = Object.create(ColorEscapeGame.prototype) as {
      sanitizeSave: (value: unknown) => { mutedMusicTracks: string[] };
    };

    expect(game.sanitizeSave(undefined).mutedMusicTracks).toEqual([]);
  });

  it("keeps only muted tracks that are already unlocked", () => {
    const game = Object.create(ColorEscapeGame.prototype) as {
      sanitizeSave: (value: unknown) => { mutedMusicTracks: string[] };
    };

    expect(game.sanitizeSave({
      schemaVersion: 1,
      highestLevel: 30,
      mutedMusicTracks: ["menu", "dreamscape", "splash", "unknown", "dreamscape"],
    }).mutedMusicTracks).toEqual(["menu", "dreamscape"]);
  });
});
