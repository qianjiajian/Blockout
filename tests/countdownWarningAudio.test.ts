import { describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";

function harness() {
  const snapshot = { started: true, remainingSeconds: 31, timeFreezeSeconds: 0, complete: false, failed: false };
  const host = { music: vi.fn(), sound: vi.fn(), stopSound: vi.fn() };
  const game = Object.assign(Object.create(ColorEscapeGame.prototype), {
    model: { readStatus: () => ({ ...snapshot }) }, host,
    screen: "playing", appVisible: true, save: { sound: true, reducedMotion: false },
    countdownWarning: new CountdownWarning(),
  });
  const tick = (remaining: number) => {
    const before = { ...snapshot };
    snapshot.remainingSeconds = remaining;
    game.countdownWarning.observe(before, snapshot);
    game.syncMusic();
    game.updateCountdownWarning(0.016);
  };
  return { game, snapshot, host, tick };
}

describe("countdown warning recorded sound integration", () => {
  it("plays timeover once with each displayed second from 10 to 1, never at 30 or 0", () => {
    const { game, snapshot, host, tick } = harness();
    tick(30);
    tick(10.01);
    expect(host.sound).not.toHaveBeenCalled();
    for (let second = 10; second >= 1; second--) {
      tick(second);
      expect(host.sound).toHaveBeenCalledTimes(11 - second);
      expect(host.sound).toHaveBeenLastCalledWith("timeover");
      expect(game.countdownWarning.debug(snapshot, false)).toMatchObject({
        lastPunchedSecond: second, punchSeconds: 0,
      });
      tick(second - 0.4);
      tick(second - 0.99);
      expect(host.sound).toHaveBeenCalledTimes(11 - second);
    }
    snapshot.failed = true;
    tick(0);
    expect(host.sound).toHaveBeenCalledTimes(10);
    expect(host.stopSound).toHaveBeenLastCalledWith("timeover");
  });

  it("drops muted seconds and only plays the next new second after sound is enabled", () => {
    const { game, host, tick } = harness();
    game.save.sound = false;
    tick(10);
    tick(9);
    expect(host.sound).not.toHaveBeenCalled();
    game.save.sound = true;
    tick(8.8);
    expect(host.sound).not.toHaveBeenCalled();
    tick(8);
    expect(host.sound).toHaveBeenCalledExactlyOnceWith("timeover");
  });

  it("keeps sound enabled independently of reduced motion and coalesces skipped seconds", () => {
    const { game, snapshot, host, tick } = harness();
    game.save.reducedMotion = true;
    tick(7.2);
    expect(host.sound).toHaveBeenCalledExactlyOnceWith("timeover");
    expect(game.countdownWarning.debug(snapshot, true)).toMatchObject({ lastPunchedSecond: 8, digitScale: 1 });
    tick(7.1);
    expect(host.sound).toHaveBeenCalledTimes(1);
    tick(7);
    expect(host.sound).toHaveBeenCalledTimes(2);
  });

  it.each(["pause", "freeze", "hidden"])("stops the current sound during %s and defers a crossed second once", (reason) => {
    const { game, snapshot, host, tick } = harness();
    tick(10);
    host.stopSound.mockClear();
    if (reason === "pause") game.screen = "paused";
    if (reason === "freeze") snapshot.timeFreezeSeconds = 10;
    if (reason === "hidden") game.appVisible = false;
    game.syncMusic();
    expect(host.stopSound).toHaveBeenCalledExactlyOnceWith("timeover");

    // An input-event flush can cross the threshold just before the inactive state.
    game.countdownWarning.observe({ ...snapshot, remainingSeconds: 9.01 }, { ...snapshot, remainingSeconds: 9 });
    snapshot.remainingSeconds = 9;
    for (let i = 0; i < 5; i++) game.updateCountdownWarning(0.05);
    expect(host.sound).toHaveBeenCalledTimes(1);
    game.screen = "playing";
    snapshot.timeFreezeSeconds = 0;
    game.appVisible = true;
    game.updateCountdownWarning(0);
    expect(host.sound).toHaveBeenCalledTimes(2);
    game.updateCountdownWarning(0.01);
    expect(host.sound).toHaveBeenCalledTimes(2);
  });

  it.each(["complete", "failed", "muted", "loading", "lifeStart", "lifeRefill"])("stops an active warning on %s", (reason) => {
    const { game, snapshot, host, tick } = harness();
    tick(10);
    host.stopSound.mockClear();
    if (reason === "complete") snapshot.complete = true;
    if (reason === "failed") snapshot.failed = true;
    if (reason === "muted") game.save.sound = false;
    if (reason === "loading") game.directLevelTransition = {};
    if (reason === "lifeStart") game.pendingLifeStart = {};
    if (reason === "lifeRefill") game.lifeRefillOpen = true;
    game.syncMusic();
    game.updateCountdownWarning(0.016);
    expect(host.stopSound).toHaveBeenCalledWith("timeover");
    expect(host.sound).toHaveBeenCalledTimes(1);
  });

  it("stops on reset, discards a pending old second and re-arms for the next game", () => {
    const { game, snapshot, host, tick } = harness();
    tick(10);
    game.countdownWarning.observe({ ...snapshot, remainingSeconds: 9.01 }, { ...snapshot, remainingSeconds: 9 });
    host.stopSound.mockClear();
    game.resetCountdownWarning();
    expect(host.stopSound).toHaveBeenCalledExactlyOnceWith("timeover");
    snapshot.remainingSeconds = 31;
    game.updateCountdownWarning(0);
    expect(host.sound).toHaveBeenCalledTimes(1);
    tick(10);
    expect(host.sound).toHaveBeenCalledTimes(2);
  });
});
