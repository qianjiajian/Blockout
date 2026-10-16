import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { createLeague } from "../src/core/league";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import type { GameHost } from "../src/platform/Host";

const NOW = new Date("2026-10-14T08:00:00.000Z").getTime();
const PANEL = { x: 50, y: 200, width: 400, height: 500 };

/** Real game frame loop, lifecycle and timers, with memory-only storage and
 * deterministic host RAF delivery. Raster output is covered by browser QA. */
function fixture() {
  let stored: unknown = {
    schemaVersion: 1, currentLevel: 21, highestLevel: 21, coins: 500,
    language: "zh-CN", sound: false, music: false, reducedMotion: false,
    rewardedLevels: Array.from({ length: 20 }, (_, index) => index + 1),
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
    boosterUnlockSeen: ["time", "rocket", "pulse"], boosterUsageSeen: ["time", "rocket", "pulse"],
    boosters: { time: 0, rocket: 0, pulse: 0 },
    collectionIntroShown: true, collectionIntroPending: false,
    featureGuideProgress: { version: 1, pending: [], seen: ["leaderboard", "supply", "levels", "dailyChallenge", "league"] },
    lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
    league: createLeague(NOW, 431, 0), leagueIntroSeen: true,
  };
  const lifecycle: { hide?: () => void; show?: () => void } = {};
  const raf: FrameRequestCallback[] = [];
  const alpha: number[] = [];
  const context = {
    globalAlpha: 1,
    save: () => alpha.push(context.globalAlpha),
    restore: () => { context.globalAlpha = alpha.pop()!; },
    translate: vi.fn(), scale: vi.fn(),
  };
  const host = {
    canvas: { setAttribute: vi.fn() }, context,
    viewport: () => ({ width: 496, height: 1078, pixelRatio: 1, safeTop: 0, safeBottom: 0 }),
    isVisible: () => true, preferredLocales: () => ["zh-CN"], prefersReducedMotion: () => false,
    onPointer: vi.fn(), onResize: vi.fn(),
    onHide: (callback: () => void) => { lifecycle.hide = callback; },
    onShow: (callback: () => void) => { lifecycle.show = callback; },
    requestFrame: vi.fn((callback: FrameRequestCallback) => { raf.push(callback); return raf.length; }),
    scheduleTimeout: (callback: () => void, delay: number) => setTimeout(callback, delay) as unknown as number,
    cancelTimeout: (handle: number) => clearTimeout(handle),
    createImage: () => new Promise<HTMLImageElement>(() => {}), releaseImage: vi.fn(),
    storageRead: () => ({ status: "ok", value: clone(stored) }),
    storageSet: vi.fn((_key: string, value: unknown) => { stored = clone(value); return true; }),
    music: vi.fn(), musicTransport: () => ({ positionSeconds: 0, durationSeconds: 0, playing: false }),
    sound: vi.fn(), stopSound: vi.fn(), vibrate: vi.fn(),
  };
  const game = new ColorEscapeGame(host as unknown as GameHost) as any;
  game.screen = "league";
  game.shellArtReady = game.artReady = true;
  game.startupEntryPending = false;
  game.leagueArtStore = { art: {}, dispose: vi.fn() };
  game.render = vi.fn(() => {
    game.popupEntrance.beginFrame();
    if (game.leagueInfo) game.withPopupEntrance("league.info", PANEL, () => {});
    game.popupEntrance.endFrame();
  });
  const flushFrame = () => {
    for (const callback of raf.splice(0)) callback(Date.now() - NOW + 1);
  };
  const advance = (milliseconds: number) => {
    for (let elapsed = 0; elapsed < milliseconds; elapsed += 16) {
      vi.advanceTimersByTime(Math.min(16, milliseconds - elapsed));
      flushFrame();
    }
  };
  host.storageSet.mockClear();
  return { game, host, lifecycle, raf, flushFrame, advance };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - NOW);
  vi.spyOn(ColorEscapeGame.prototype as any, "loadArt").mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("foreground frame energy scheduling", () => {
  it("keeps a stationary league at one frame per second without changing its ranking or save", () => {
    const { game, host, flushFrame, advance } = fixture();
    const before = clone(game.save.league);
    game.scheduleFrame(); flushFrame();
    advance(10_000);
    expect(game.render.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(game.render.mock.calls.length).toBeLessThanOrEqual(11);
    expect(host.requestFrame.mock.calls.length).toBeLessThanOrEqual(11);
    expect(game.save.league).toEqual(before);
    expect(host.storageSet).not.toHaveBeenCalled();
  });

  it("settles an expired season on its next second tick without needing input", () => {
    const { game, host, flushFrame, advance } = fixture();
    const end = game.save.league.season.endMs;
    vi.setSystemTime(end - 1000);
    game.scheduleFrame(); flushFrame();
    expect(game.save.league.pending).toBeUndefined();
    advance(1000);
    expect(game.save.league.pending).toBeDefined();
    expect(host.storageSet).toHaveBeenCalledTimes(1);
    const frames = game.render.mock.calls.length;
    advance(2000);
    expect(game.render).toHaveBeenCalledTimes(frames);
  });

  it("continues inertial scrolling and tier motion at RAF cadence, then becomes idle", () => {
    const { game, host, flushFrame, advance, raf } = fixture();
    game.leagueScroll.offset = 100;
    game.leagueScroll.velocity = 600;
    game.shiftLeagueTier(1);
    game.scheduleFrame(); flushFrame();
    advance(400);
    expect(game.leagueScroll.offset).toBeGreaterThan(100);
    expect(game.leagueTierPosition()).toBe(1);
    expect(game.leagueTierSlide).toBeUndefined();
    expect(host.requestFrame.mock.calls.length).toBeGreaterThan(20);
    advance(1200);
    expect(game.leagueScroll.velocity).toBe(0);
    expect(raf).toHaveLength(0);
  });

  it("finishes popup entrance and closing before returning to second ticks", () => {
    const { game, flushFrame, advance, raf } = fixture();
    game.leagueInfo = true;
    game.scheduleFrame(); flushFrame();
    advance(400);
    expect(game.popupEntrance.active).toBe(false);
    expect(raf).toHaveLength(0);
    const close = vi.fn(() => { game.leagueInfo = false; });
    game.closePopup("league.info", close);
    advance(400);
    expect(close).toHaveBeenCalledOnce();
    expect(game.leagueInfo).toBe(false);
    expect(game.popupEntrance.active).toBe(false);
    expect(raf).toHaveLength(0);
  });

  it("ignores queued frames and async redraw requests while hidden, preserving animation age", () => {
    const { game, host, lifecycle, raf, advance } = fixture();
    game.homeCoinFlight = { age: 0.25 };
    game.scheduleFrame();
    const late = raf.shift()!;
    lifecycle.hide!();
    const age = game.homeCoinFlight.age;
    const calls = host.requestFrame.mock.calls.length;
    game.dirty = true;
    game.scheduleFrame();
    late(5000);
    game.frame(6000);
    advance(60_000);
    expect(game.homeCoinFlight.age).toBe(age);
    expect(game.render).not.toHaveBeenCalled();
    expect(host.requestFrame).toHaveBeenCalledTimes(calls);
  });

  it("rejects a pre-hide callback delivered after show without stealing the new frame", () => {
    const { game, host, lifecycle, raf } = fixture();
    game.scheduleFrame();
    const stale = raf.shift()!;
    lifecycle.hide!();
    lifecycle.show!();
    expect(host.requestFrame).toHaveBeenCalledTimes(2);
    expect(raf).toHaveLength(1);
    stale(10_000);
    expect(game.framePending).toBe(true);
    expect(game.render).not.toHaveBeenCalled();
    raf.shift()!(10_001);
    expect(game.render).toHaveBeenCalledOnce();
    expect(game.framePending).toBe(false);
  });
});
