import { describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

function fixture() {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.save = { sound: true };
  game.host = { sound: vi.fn() };
  game.syncMusic = vi.fn();
  game.buttonReleaseTargetAt = vi.fn(() => ({ key: "locked", hit: {} }));
  game.executePointerAction = vi.fn(() => game.playSound("blocked"));
  return game;
}

describe("disabled button audio", () => {
  it("uses button audio for a rejected UI activation without changing board collision audio", () => {
    const game = fixture();
    game.executePointerDown({ id: 1, x: 0, y: 0 });
    expect(game.host.sound).toHaveBeenLastCalledWith("button");
    game.playSound("blocked");
    expect(game.host.sound).toHaveBeenLastCalledWith("blocked");
    game.buttonReleaseTargetAt.mockReturnValue(undefined);
    game.executePointerDown({ id: 1, x: 0, y: 0 });
    expect(game.host.sound).toHaveBeenLastCalledWith("blocked");
  });

  it("preserves mute and resets the context after an action throws", () => {
    const game = fixture();
    game.save.sound = false;
    game.executePointerDown({ id: 1, x: 0, y: 0 });
    expect(game.host.sound).not.toHaveBeenCalled();
    game.executePointerAction.mockImplementation(() => { throw Error("action failed"); });
    expect(() => game.executePointerDown({ id: 1, x: 0, y: 0 })).toThrow("action failed");
    game.save.sound = true;
    game.playSound("blocked");
    expect(game.host.sound).toHaveBeenLastCalledWith("blocked");
  });
});
