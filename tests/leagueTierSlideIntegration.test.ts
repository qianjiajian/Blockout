import { describe, expect, it, vi } from "vitest";
import { createLeague, type LeagueTier } from "../src/core/league";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { LeagueScroll } from "../src/game/leagueScroll";
import { LEAGUE_TIER_SLIDE_DURATION } from "../src/game/leagueTierSlide";

function fixture(tier: LeagueTier = 0) {
  const g = Object.create(ColorEscapeGame.prototype) as any;
  g.save = { ...g.sanitizeSave(undefined), league: createLeague(Date.now(), 715, tier), reducedMotion: false };
  g.leagueTier = tier;
  g.leagueScroll = new LeagueScroll();
  g.leagueArtStore = { art: {}, dispose: vi.fn() };
  g.screen = "league";
  g.appVisible = true;
  g.interactionHit = (p: any, r: any) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
  g.playSound = vi.fn(); g.scheduleFrame = vi.fn(); g.releaseFormalPageArt = vi.fn();
  g.persist = vi.fn(() => { throw new Error("Preview must not save"); });
  return g;
}
function press(g: any, key: string) {
  const rect = g.leagueTargets().find(([k]: [string]) => k === key)?.[1];
  expect(rect).toBeTruthy();
  g.handleLeaguePointer({ id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
}

describe("league tier slide interaction", () => {
  it("moves through intermediate positions and ends exactly at the preview target without changing the account", () => {
    const g = fixture(2), before = structuredClone(g.save);
    press(g, "league.tierNext");
    expect(g.leagueTier).toBe(3);
    expect(g.leagueTierPosition()).toBe(2);
    g.updateLeagueTierSlide(0.1);
    expect(g.leagueTierPosition()).toBeGreaterThan(2);
    expect(g.leagueTierPosition()).toBeLessThan(3);
    g.updateLeagueTierSlide(LEAGUE_TIER_SLIDE_DURATION);
    expect(g.leagueTierSlide).toBeUndefined();
    expect(g.leagueTierPosition()).toBe(3);
    expect(g.save).toEqual(before);
    expect(g.persist).not.toHaveBeenCalled();
  });

  it("retargets repeated and reverse taps from the actual current position", () => {
    const g = fixture();
    press(g, "league.tierNext"); g.updateLeagueTierSlide(0.08);
    const first = g.leagueTierPosition();
    press(g, "league.tierNext");
    expect(g.leagueTierPosition()).toBe(first);
    expect(g.leagueTier).toBe(2);
    g.updateLeagueTierSlide(0.08);
    const second = g.leagueTierPosition();
    press(g, "league.tierPrevious");
    expect(g.leagueTierPosition()).toBe(second);
    expect(g.leagueTier).toBe(1);
    g.updateLeagueTierSlide(1);
    expect(g.leagueTierPosition()).toBe(1);
  });

  it("has no navigation beyond bronze or glory, including rapid taps", () => {
    const g = fixture();
    expect(g.leagueTargets().some(([k]: [string]) => k === "league.tierPrevious")).toBe(false);
    for (let i = 0; i < 7; i++) press(g, "league.tierNext");
    expect(g.leagueTier).toBe(7);
    expect(g.leagueTargets().some(([k]: [string]) => k === "league.tierNext")).toBe(false);
    g.shiftLeagueTier(1); g.updateLeagueTierSlide(1);
    expect(g.leagueTierPosition()).toBe(7);
  });

  it("freezes in the background and while art is unavailable", () => {
    const g = fixture(); press(g, "league.tierNext");
    g.updateLeagueTierSlide(0.05); const current = g.leagueTierPosition();
    g.appVisible = false; g.updateLeagueTierSlide(30);
    expect(g.leagueTierPosition()).toBe(current);
    g.appVisible = true; g.leagueArtStore.art = undefined; g.updateLeagueTierSlide(30);
    expect(g.leagueTierPosition()).toBe(current);
    g.leagueArtStore.art = {}; g.updateLeagueTierSlide(0.05);
    expect(g.leagueTierPosition()).toBeGreaterThan(current);
  });

  it.each(["league.info", "league.challenge", "league.back"])("cleans up the transition when %s opens another view", key => {
    const g = fixture(); press(g, "league.tierNext"); g.updateLeagueTierSlide(0.05);
    press(g, key);
    expect(g.leagueTierSlide).toBeUndefined();
  });

  it("clears a transition when the season settlement takes over", () => {
    const g = fixture(); press(g, "league.tierNext");
    g.save.league.pending = { seasonIndex: 0 }; g.updateLeagueTierSlide(0.01);
    expect(g.leagueTierSlide).toBeUndefined();
  });

  it("uses the final icon immediately with reduced motion enabled", () => {
    const g = fixture(); g.save.reducedMotion = true;
    press(g, "league.tierNext");
    expect(g.leagueTierSlide).toBeUndefined();
    expect(g.leagueTierPosition()).toBe(1);
  });
});
