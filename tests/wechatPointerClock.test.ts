import { afterEach, describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { LeagueScroll } from "../src/game/leagueScroll";

// Exercise the actual input dispatch and gesture classes without a Canvas,
// persistent host storage, asset requests or rendering animation frames.
function fixture(screen: string) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.screen = screen;
  game.save = { reducedMotion: false, league: {} };
  game.leagueScroll = new LeagueScroll();
  game.leagueArtStore = { art: {} };
  game.artReady = true;
  game.storageBaselineReady = true;
  game.scheduleFrame = vi.fn();
  game.buttonReleaseTargetAt = vi.fn(() => undefined);
  return game;
}

function withoutPerformance(kind: "absent" | "missing-now") {
  vi.stubGlobal("performance", kind === "absent" ? undefined : {});
  if (kind === "absent") Reflect.deleteProperty(globalThis, "performance");
  let time = 1000;
  vi.spyOn(Date, "now").mockImplementation(() => time);
  return (next: number) => { time = next; };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe.each(["absent", "missing-now"] as const)("touch dispatch when performance is %s", kind => {
  it("scrolls the league through real down/move/up handlers and releases its gesture", () => {
    const setTime = withoutPerformance(kind);
    const game = fixture("league");
    game.handleDown({ id: 7, x: 200, y: 700 });
    expect(game.leagueScroll.gesture).toMatchObject({ id: 7, lastAt: 1000 });
    setTime(1050);
    game.handleMove({ id: 7, x: 200, y: 620 });
    expect(game.leagueScroll.offset).toBe(80);
    expect(game.leagueScroll.gesture).toMatchObject({ lastAt: 1050, moved: true });
    game.handleUp({ id: 8, x: 200, y: 620 });
    expect(game.leagueScroll.gesture?.id).toBe(7);
    setTime(1075);
    game.handleUp({ id: 7, x: 200, y: 620 });
    expect(game.leagueScroll.gesture).toBeUndefined();
    expect(game.leagueScroll.velocity).toBeGreaterThan(0);
    expect(Number.isFinite(game.leagueScroll.velocity)).toBe(true);
    expect(game.scheduleFrame).toHaveBeenCalledTimes(3);
  });

  it.each(["home", "settings", "playing"])("releases a %s button without an active league gesture", screen => {
    withoutPerformance(kind);
    const game = fixture(screen);
    const target = { key: "test.button", hit: { x: 100, y: 100, width: 100, height: 80 } };
    game.buttonReleaseTargetAt.mockReturnValue(target);
    game.executePointerDown = vi.fn();
    game.handleDown({ id: 2, x: 120, y: 120 });
    expect(game.pendingButtonPress?.pointerId).toBe(2);
    expect(game.executePointerDown).not.toHaveBeenCalled();
    game.handleMove({ id: 2, x: 125, y: 125 });
    game.handleUp({ id: 2, x: 125, y: 125 });
    expect(game.pendingButtonPress).toBeUndefined();
    expect(game.executePointerDown).toHaveBeenCalledExactlyOnceWith({ id: 2, x: 125, y: 125 });
    expect(game.leagueScroll.gesture).toBeUndefined();
    // Stray touchend after activation must also be safe and cannot reactivate.
    expect(() => game.handleUp({ id: 9, x: 125, y: 125 })).not.toThrow();
    expect(game.executePointerDown).toHaveBeenCalledTimes(1);
  });

  it("keeps journey dragging and release momentum on the same fallback clock", () => {
    const setTime = withoutPerformance(kind);
    const game = fixture("levels");
    game.formalPageReady = () => true;
    game.journeyScrollViewportArt = () => ({ x: 0, y: 0, width: 720, height: 1584 });
    game.viewportTransform = () => ({ scale: 1 });
    game.journeyScrollBounds = () => ({ min: 0, max: 3000 });
    game.journeyScrollOffset = 100;
    game.handleDown({ id: 4, x: 200, y: 600 });
    expect(game.journeyScrollGesture).toMatchObject({ pointerId: 4, lastTimeMs: 1000 });
    setTime(1100);
    game.handleMove({ id: 4, x: 200, y: 500 });
    expect(game.journeyScrollOffset).toBeGreaterThan(100);
    expect(game.journeyScrollGesture).toMatchObject({ lastTimeMs: 1100, moved: true });
    setTime(1120);
    game.handleUp({ id: 4, x: 200, y: 480 });
    expect(game.journeyScrollGesture).toBeUndefined();
    expect(game.journeyScrollVelocity).toBeGreaterThan(0);
    expect(Number.isFinite(game.journeyScrollVelocity)).toBe(true);
  });
});

it("uses performance.now for browser league gestures instead of wall-clock time", () => {
  const game = fixture("league");
  let time = 300;
  const now = vi.fn(() => time);
  vi.stubGlobal("performance", { now });
  const dateNow = vi.spyOn(Date, "now").mockReturnValue(1730000000000);
  game.handleDown({ id: 1, x: 200, y: 700 });
  expect(game.leagueScroll.gesture.lastAt).toBe(300);
  time = 350;
  game.handleMove({ id: 1, x: 200, y: 650 });
  expect(game.leagueScroll.gesture.lastAt).toBe(350);
  time = 375;
  game.handleUp({ id: 1, x: 200, y: 650 });
  expect(game.leagueScroll.gesture).toBeUndefined();
  expect(now).toHaveBeenCalledTimes(3);
  expect(dateNow).not.toHaveBeenCalled();
});
