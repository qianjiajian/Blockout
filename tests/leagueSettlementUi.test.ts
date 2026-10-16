import { describe, expect, it, vi } from "vitest";
import { advanceLeague, createLeague, LEAGUE_TIERS, type LeagueSettlement } from "../src/core/league";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { LEAGUE_SETTLEMENT_ART_NAMES, type LeagueSettlementArt } from "../src/game/LeagueSettlementArtStore";
import { LeagueScroll } from "../src/game/leagueScroll";
import { drawLeagueSettlement, LEAGUE_SETTLEMENT_UI, type LeagueSettlementView } from "../src/game/leagueSettlementUi";
import { drawLeague, LEAGUE_ART_NAMES, LEAGUE_UI, type LeagueArt, type LeaguePaint, type LeagueRect } from "../src/game/leagueUi";

const badgeNames = ["bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "glory"];
const basePending: LeagueSettlement = {
  seasonIndex: 4, rank: 7, score: 450, coins: 150,
  fromTier: 0, fromStars: 0, toTier: 1, toStars: 0,
};
function fakeImage(src: string) {
  return { src, naturalWidth: 200, naturalHeight: 160 } as HTMLImageElement;
}
const settlementArt = Object.fromEntries(LEAGUE_SETTLEMENT_ART_NAMES.map(name => [name, fakeImage(name)])) as LeagueSettlementArt;
const leagueArt = Object.fromEntries(LEAGUE_ART_NAMES.map(name => [name, fakeImage(`board:${name}`)])) as LeagueArt;

function renderFixture() {
  const texts: string[] = [], images: string[] = [];
  const buttons: Array<[string, LeagueRect]> = [];
  // Deliberately provide only supported Canvas operations, with no roundRect.
  const ctx = {
    save: vi.fn(), restore: vi.fn(), fillRect: vi.fn(),
    fillText: vi.fn((value: string) => texts.push(value)), strokeText: vi.fn(),
    measureText: vi.fn((value: string) => ({ width: value.length * 20 })),
    drawImage: vi.fn((image: HTMLImageElement) => images.push(image.src)),
    translate: vi.fn(), scale: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
    bezierCurveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(),
    arc: vi.fn(), stroke: vi.fn(), rect: vi.fn(), clip: vi.fn(), arcTo: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const paint: LeaguePaint = {
    button: (key, rect) => { buttons.push([key, rect]); },
    pressable: (key, rect, draw) => { buttons.push([key, rect]); draw(); },
  };
  return { ctx, paint, texts, images, buttons };
}
function gameFixture() {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  const now = Date.now(), league = createLeague(now, 123, 0);
  game.save = {
    ...game.sanitizeSave({ highestLevel: 21, currentLevel: 21, leagueIntroSeen: true }),
    league: advanceLeague(league, league.season.endMs),
  };
  game.screen = "league";
  game.leagueAction = "claim";
  game.leagueScroll = new LeagueScroll();
  game.leagueArtStore = { art: leagueArt, dispose: vi.fn() };
  game.leagueSettlementArtStore = { art: settlementArt, request: vi.fn(), dispose: vi.fn() };
  game.leagueAvatarArtStore = { art: {}, dispose: vi.fn() };
  game.playSound = vi.fn(); game.scheduleFrame = vi.fn();
  game.releaseFormalPageArt = vi.fn();
  game.interactionHit = (point: { x: number; y: number }, rect: LeagueRect) =>
    point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
  return game;
}
function view(game: any): LeagueSettlementView {
  return { pending: game.save.league.pending, persistence: game.leaguePersistence,
    action: game.leagueAction, artError: game.leagueSettlementArtStore.error };
}
function click(game: any, rect: LeagueRect) {
  game.handleLeaguePointer({ id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
}

describe("supplied league season settlement presentation", () => {
  it.each([
    { name: "promotion", pending: basePending, from: "青铜", to: "白银", hero: "silver-hero" },
    { name: "relegation", pending: { ...basePending, rank: 47, score: 10, coins: 150, fromTier: 5, toTier: 4 } as LeagueSettlement, from: "钻石", to: "翡翠", hero: "emerald" },
    { name: "glory star gain", pending: { ...basePending, rank: 1, score: 900, coins: 2000, fromTier: 7, fromStars: 12, toTier: 7, toStars: 17 } as LeagueSettlement, from: "荣耀 12星", to: "荣耀 17星", hero: "glory" },
    { name: "glory star loss", pending: { ...basePending, rank: 49, score: 70, coins: 250, fromTier: 7, fromStars: 3, toTier: 7, toStars: 1 } as LeagueSettlement, from: "荣耀 3星", to: "荣耀 1星", hero: "glory" },
    { name: "zero-score relegation", pending: { ...basePending, rank: 50, score: 0, coins: 0, fromTier: 7, fromStars: 0, toTier: 6 } as LeagueSettlement, from: "荣耀 0星", to: "大师", hero: "master" },
  ])("renders the pending data for $name without editing settlement state", ({ pending, from, to, hero }) => {
    const { ctx, paint, texts, images, buttons } = renderFixture(), before = structuredClone(pending);
    expect((ctx as any).roundRect).toBeUndefined();
    drawLeagueSettlement(ctx, { pending }, paint, settlementArt);
    expect(texts).toContain(`第${pending.seasonIndex + 1}期　已结束`);
    expect(texts).toContain(`第${pending.rank}名`);
    expect(texts).toContain(String(pending.score));
    expect(texts).toContain(`+${pending.coins}`);
    expect(texts).toContain(from); expect(texts).toContain(to);
    expect(images).toContain(hero);
    expect(images).toContain(badgeNames[pending.fromTier]);
    expect(images).toContain(badgeNames[pending.toTier]);
    expect(images).toContain("stage-panel"); expect(images).toContain("result-panel");
    expect(texts.includes("本期0分，无金币奖励")).toBe(pending.score === 0);
    expect(buttons).toEqual([["league.back", LEAGUE_SETTLEMENT_UI.back], ["league.claim", LEAGUE_SETTLEMENT_UI.claim]]);
    expect(pending).toEqual(before);
  });

  it("routes pending settlement through its own assets before leaderboard assets are ready", () => {
    const game = gameFixture(), rendered = renderFixture();
    drawLeague(rendered.ctx, { state: game.save.league, now: Date.now(), scroll: 0, tier: 0, info: false },
      { ...rendered.paint, settlementArt });
    expect(rendered.images).toContain("result-panel");
    expect(rendered.texts).toContain("赛季成绩");
    expect(rendered.texts).not.toContain("界面加载中…");
    expect(rendered.images.every(src => !src.startsWith("board:"))).toBe(true);
    game.leagueArtStore.art = undefined; game.leagueAvatarArtStore.art = undefined;
    expect(game.leagueTargets()).toEqual(rendered.buttons);
  });

  it.each([
    { name: "loading", art: false, error: false, persistence: undefined, keys: ["league.back"] },
    { name: "failed image load", art: false, error: true, persistence: undefined, keys: ["league.back", "league.artRetry"] },
    { name: "ready", art: true, error: false, persistence: undefined, keys: ["league.back", "league.claim"] },
    { name: "unknown save without art", art: false, error: true, persistence: "unknown" as const, keys: ["league.retry"] },
    { name: "unknown save with art", art: true, error: false, persistence: "unknown" as const, keys: ["league.retry"] },
    { name: "rejected save without art", art: false, error: true, persistence: "rejected" as const, keys: ["league.back", "league.retry"] },
    { name: "rejected save with art", art: true, error: false, persistence: "rejected" as const, keys: ["league.back", "league.retry"] },
  ])("matches visible buttons and interaction coordinates during $name", ({ art, error, persistence, keys }) => {
    const game = gameFixture(), rendered = renderFixture();
    game.leagueSettlementArtStore.art = art ? settlementArt : undefined;
    game.leagueSettlementArtStore.error = error;
    game.leaguePersistence = persistence;
    drawLeagueSettlement(rendered.ctx, view(game), rendered.paint, game.leagueSettlementArtStore.art);
    expect(rendered.buttons.map(([key]) => key)).toEqual(keys);
    expect(game.leagueTargets()).toEqual(rendered.buttons);
  });

  it("ignores the return button while a claim is unknown and retries from the displayed button", () => {
    const game = gameFixture();
    game.leaguePersistence = "unknown";
    game.claimLeagueReward = vi.fn(() => "unknown");
    const before = structuredClone(game.save);
    click(game, LEAGUE_SETTLEMENT_UI.back);
    expect(game.screen).toBe("league");
    expect(game.claimLeagueReward).not.toHaveBeenCalled();
    expect(game.leagueSettlementArtStore.dispose).not.toHaveBeenCalled();
    click(game, LEAGUE_SETTLEMENT_UI.claim);
    expect(game.claimLeagueReward).toHaveBeenCalledTimes(1);
    expect(game.save).toEqual(before);
    expect(game.leagueTargets()).toEqual([["league.retry", LEAGUE_SETTLEMENT_UI.claim]]);
  });

  it("keeps first-entry explanation above a pending settlement and its claim hit target disabled", () => {
    const game = gameFixture(), rendered = renderFixture();
    game.leagueIntroPage = 0;
    drawLeague(rendered.ctx, { state: game.save.league, now: Date.now(), scroll: 0, tier: 0, info: false, introPage: 0 },
      { ...rendered.paint, art: leagueArt, settlementArt });
    expect(rendered.texts).toContain("联赛说明");
    expect(rendered.texts.at(-1)).toBe("点击继续");
    expect(game.leagueTargets()).toEqual([["league.introContinue", LEAGUE_UI.introContinue]]);
    game.leaguePersistence = "unknown";
    expect(game.leagueTargets()).toEqual([["league.retry", LEAGUE_UI.primary]]);
    expect(LEAGUE_UI.primary).not.toEqual(LEAGUE_SETTLEMENT_UI.claim);
  });

  it("drops settlement art ownership after a confirmed claim while preserving mainline progress", () => {
    const game = gameFixture();
    const highest = game.save.highestLevel, current = game.save.currentLevel;
    game.claimLeagueReward = vi.fn(() => { game.save.league.pending = undefined; return "committed"; });
    click(game, LEAGUE_SETTLEMENT_UI.claim);
    expect(game.leagueSettlementArtStore.dispose).toHaveBeenCalledTimes(1);
    expect(game.leagueTargets().some(([key]: [string]) => key === "league.claim")).toBe(false);
    expect(game.leagueTargets().some(([key]: [string]) => key === "league.challenge")).toBe(true);
    expect(game.save.highestLevel).toBe(highest); expect(game.save.currentLevel).toBe(current);
    expect(LEAGUE_TIERS[game.save.league.season.tier]).toBe("青铜");
  });
});
