import { describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

function harness(screen: string, music = true) {
  const host = { music: vi.fn(), stopSound: vi.fn() };
  const game = Object.assign(Object.create(ColorEscapeGame.prototype), {
    host,
    screen,
    appVisible: true,
    save: {
      music,
      sound: true,
      selectedMusicTrack: "menu",
      highestLevel: 1,
      mutedMusicTracks: [],
    },
    model: {
      level: { id: 1 },
      readStatus: () => ({
        started: false,
        remainingSeconds: 120,
        complete: false,
        failed: false,
        timeFreezeSeconds: 0,
      }),
    },
    directLevelTransition: undefined,
    pendingLifeStart: undefined,
    lifeRefillOpen: false,
    boosterUnlockGuide: undefined,
  }) as any;
  game.syncMusic();
  return { game, host };
}

describe("music scene synchronization", () => {
  it("keeps menu music controlled by the music setting", () => {
    const { host } = harness("home");

    expect(host.music).toHaveBeenLastCalledWith("menu", true);

    const muted = harness("home", false);
    expect(muted.host.music).toHaveBeenLastCalledWith("menu", false);
  });

  it("ignores retired music-library selections and favorites from older saves", () => {
    const { game, host } = harness("home");
    game.save.highestLevel = 100;
    game.save.selectedMusicTrack = "challenge";
    game.save.mutedMusicTracks = ["menu"];
    game.musicPlaylistTracks = vi.fn(() => ["challenge", "tides-smiles"]);

    game.syncMusic();
    expect(host.music).toHaveBeenLastCalledWith("menu", true);
    expect(game.musicPlaylistTracks).not.toHaveBeenCalled();

    game.save.music = false;
    game.syncMusic();
    expect(host.music).toHaveBeenLastCalledWith("menu", false);

    game.screen = "playing";
    game.save.music = true;
    game.syncMusic();
    expect(host.music).toHaveBeenLastCalledWith("gameplay", true);
    expect(game.save.selectedMusicTrack).toBe("challenge");
    expect(game.save.mutedMusicTracks).toEqual(["menu"]);
  });

  it("switches into the dedicated challenge track instead of carrying menu selection", () => {
    const { host } = harness("playing");

    expect(host.music).toHaveBeenLastCalledWith("gameplay", true);
  });

  it("resynchronizes after the campaign start button changes screens", () => {
    const { game, host } = harness("home");
    game.canStartCampaignAttempt = () => true;
    game.beginRunJournal = vi.fn();
    game.updateBoosterUnlockGuide = vi.fn();
    game.scheduleFrame = vi.fn();

    game.beginSelectedChallenge();

    expect(game.screen).toBe("playing");
    expect(host.music).toHaveBeenLastCalledWith("gameplay", true);
  });
});
