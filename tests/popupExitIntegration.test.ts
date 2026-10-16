import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { JOURNEY_EPISODES } from "../src/core/journeyProgress";
import { advanceLeague, createLeague, LEAGUE_PERIOD_MS } from "../src/core/league";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { POPUP_ENTRANCE_DURATION, POPUP_EXIT_DURATION } from "../src/game/popupEntrance";
import type { GameHost } from "../src/platform/Host";

const NOW = new Date("2026-10-09T06:00:00.000Z").getTime();
const PANEL = { x: 50, y: 200, width: 400, height: 500 };
const flushPromises = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

/** Real constructor, lifecycle callbacks, close routing and verified save logic.
 * Art services and raster drawing are isolated, and storage is memory-only. */
function exitGame() {
  const initial = {
    schemaVersion: 1, currentLevel: 21, highestLevel: 21, coins: 1254,
    language: "zh-CN", sound: false, music: false, reducedMotion: false,
    rewardedLevels: Array.from({ length: 20 }, (_, index) => index + 1),
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter"],
    boosterUnlockSeen: ["time", "rocket", "pulse"], boosterUsageSeen: ["time", "rocket", "pulse"],
    boosters: { time: 0, rocket: 0, pulse: 0 },
    collectionIntroShown: true, collectionIntroPending: false,
    featureGuideProgress: { version: 1, pending: [], seen: ["leaderboard", "supply", "levels", "dailyChallenge", "league"] },
    selectedJourneyEpisode: 1,
    journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [1, 11, 21] },
    lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
  };
  const storage = { value: clone(initial) as any, mode: "commit" as "commit" | "unknown-written" };
  const callbacks: { hide?: () => void; show?: () => void } = {};
  const requests: Array<{ src: string; resolve: (image: HTMLImageElement) => void }> = [];
  const alphaStack: number[] = [];
  const context = {
    globalAlpha: 1,
    save: () => { alphaStack.push(context.globalAlpha); },
    restore: () => { context.globalAlpha = alphaStack.pop()!; },
    translate: vi.fn(), scale: vi.fn(),
  };
  const host = {
    canvas: { setAttribute: vi.fn() }, context,
    viewport: () => ({ width: 496, height: 1078, pixelRatio: 1, safeTop: 0, safeBottom: 0 }),
    isVisible: () => true, preferredLocales: () => ["zh-CN"], prefersReducedMotion: () => false,
    onPointer: vi.fn(), onResize: vi.fn(),
    onHide: (callback: () => void) => { callbacks.hide = callback; },
    onShow: (callback: () => void) => { callbacks.show = callback; },
    requestFrame: vi.fn(() => 1), scheduleTimeout: vi.fn(() => 1), cancelTimeout: vi.fn(),
    createImage: vi.fn((src: string) => new Promise<HTMLImageElement>(resolve => requests.push({ src, resolve }))),
    releaseImage: vi.fn(),
    storageRead: vi.fn(() => storage.mode === "unknown-written"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
    storageSet: vi.fn((_key: string, value: unknown) => {
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    music: vi.fn(), musicTransport: () => ({ positionSeconds: 0, durationSeconds: 0, playing: false }),
    sound: vi.fn(), stopSound: vi.fn(), vibrate: vi.fn(),
  };
  const game = new ColorEscapeGame(host as unknown as GameHost) as any;
  game.screen = "home";
  game.artReady = true;
  game.shellArtReady = true;
  game.startupEntryPending = false;
  game.art = { home: { src: "home" }, homeUi: {} };
  game.journeyHomeThemeIndex = 1;
  game.journeyHomeThemeLoading = false;
  game.scheduleFrame = vi.fn();
  game.ensureRevisedMechanismArt = vi.fn();
  game.requestHomeProfileArt = vi.fn();
  const painted: any[][] = [];
  game.render = vi.fn(() => {
    const keys: string[] = [];
    if (game.profilePage) keys.push("profile");
    if (game.profilePage === "rename") keys.push("profile.rename");
    if (game.screen === "dailyChallenge") keys.push("dailyChallenge");
    if (game.screen === "boosterPurchase" && game.boosterPurchase) keys.push("boosterPurchase");
    if (game.screen === "league" && game.leagueInfo) keys.push("league.info");
    if (game.journeyPresentation?.intent === "theme_selection") keys.push("journeyPresentation");
    game.popupEntrance.beginFrame();
    for (const key of keys) game.withPopupEntrance(key, PANEL, () => {});
    game.popupEntrance.endFrame();
    painted.push(game.popupEntrance.snapshot());
  });
  storage.value = clone(game.save);
  host.storageSet.mockClear();
  const ready = () => {
    game.render();
    game.popupEntrance.update(POPUP_ENTRANCE_DURATION, true, false);
    game.render();
    painted.length = 0;
  };
  const finish = () => {
    game.popupEntrance.update(POPUP_EXIT_DURATION, true, false);
    game.render();
    game.popupEntrance.flushExits();
  };
  return { game, host, storage, callbacks, requests, painted, ready, finish };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - NOW);
  vi.spyOn(ColorEscapeGame.prototype as any, "loadArt").mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("popup exit Game integration", () => {
  it("refreshes an expired league using the current time after its info exit resumes from hours in the background", () => {
    const { game, callbacks, painted, ready, storage } = exitGame();
    game.screen = "league";
    game.leagueInfo = true;
    game.save.league = createLeague(NOW - LEAGUE_PERIOD_MS, 123, 0);
    storage.value = clone(game.save);
    ready();
    const refresh = vi.spyOn(game, "refreshLeague").mockImplementation((now: unknown) => {
      expect(painted.at(-1)?.find(entry => entry.key === "league.info")).toMatchObject({ phase: "exit", alpha: 0 });
      // Keep season reconciliation real, with the storage boundary isolated.
      game.save.league = advanceLeague(game.save.league, now as number);
      return "committed";
    });
    let frameTime = 1000;
    game.lastFrame = frameTime;
    const tick = (milliseconds: number) => {
      frameTime += milliseconds;
      vi.advanceTimersByTime(milliseconds);
      game.frame(frameTime);
    };
    tick(20);
    const exitStartedAt = Date.now();
    expect(game.popupEntrance.snapshot()[0]).toMatchObject({ key: "league.info", phase: "exit" });
    expect(refresh).not.toHaveBeenCalled();
    const beforeHide = game.popupEntrance.snapshot();
    callbacks.hide!();
    tick(4 * 60 * 60 * 1000);
    expect(game.popupEntrance.snapshot()).toEqual(beforeHide);
    expect(refresh).not.toHaveBeenCalled();
    callbacks.show!();
    for (let i = 0; i < 20 && !refresh.mock.calls.length; i++) tick(20);
    expect(refresh).toHaveBeenCalledExactlyOnceWith(Date.now());
    expect(refresh.mock.calls[0][0]).toBeGreaterThanOrEqual(exitStartedAt + 4 * 60 * 60 * 1000);
    expect(game.leagueInfo).toBe(false);
    expect(game.popupEntrance.snapshot().some((entry: any) => entry.key === "league.info")).toBe(false);
  });

  it("closes native input immediately, pauses while hidden and finalizes only after the painted terminal frame", () => {
    const { game, host, callbacks, painted, ready } = exitGame();
    game.profilePage = "rename";
    const closeInput = vi.fn();
    game.closeProfileInput = closeInput;
    game.profileInputAfterEntrance = true;
    ready();
    const finalize = vi.fn(() => {
      expect(painted.at(-1)?.find(entry => entry.key === "profile.rename")).toMatchObject({ phase: "exit", alpha: 0 });
      expect(game.popupEntrance.snapshot().some((entry: any) => entry.key === "profile.rename")).toBe(false);
      game.profilePage = "avatar";
    });
    game.closePopup("profile.rename", finalize);
    expect(closeInput).toHaveBeenCalledOnce();
    expect(game.closeProfileInput).toBeUndefined();
    expect(game.profileInputAfterEntrance).toBe(false);
    expect(game.profilePage).toBe("rename");
    expect(game.buttonReleaseTargetAt({ id: 1, x: 250, y: 500 })).toBeUndefined();
    let time = 1000;
    game.lastFrame = time;
    const tick = (milliseconds: number) => {
      time += milliseconds;
      vi.advanceTimersByTime(milliseconds);
      game.frame(time);
    };
    tick(40);
    const beforeHide = game.popupEntrance.snapshot();
    callbacks.hide!();
    tick(1000);
    expect(game.popupEntrance.snapshot()).toEqual(beforeHide);
    expect(finalize).not.toHaveBeenCalled();
    expect(game.profilePage).toBe("rename");
    callbacks.show!();
    for (let i = 0; i < 20; i++) tick(20);
    expect(finalize).toHaveBeenCalledOnce();
    expect(closeInput).toHaveBeenCalledOnce();
    expect(game.profilePage).toBe("avatar");
    expect(game.popupEntrance.snapshot()).toEqual([expect.objectContaining({ key: "profile", phase: "idle" })]);
    expect(host.storageSet).not.toHaveBeenCalled();
    expect(game.popupEntrance.flushExits()).toBe(false);
  });

  it("executes a missing-layer finalize immediately and swallows repeated visible-layer close intents", () => {
    const { game, ready, finish } = exitGame();
    const absent = vi.fn();
    game.closePopup("missing", absent);
    expect(absent).toHaveBeenCalledOnce();
    game.profilePage = "stats";
    ready();
    const close = vi.fn(() => { game.profilePage = undefined; }), duplicate = vi.fn();
    game.closePopup("profile", close);
    game.closePopup("profile", duplicate);
    expect(close).not.toHaveBeenCalled();
    finish();
    expect(close).toHaveBeenCalledOnce();
    expect(duplicate).not.toHaveBeenCalled();
    expect(game.lastFrame).toBe(0);
  });

  it("releases a late theme candidate without saving after cancel starts but before its exit finishes", async () => {
    const { game, host, requests, ready, finish, storage } = exitGame();
    game.screen = "levels";
    game.selectJourneyEpisode(JOURNEY_EPISODES[1]);
    const presentation = game.journeyPresentation;
    ready();
    const before = clone(game.save);
    game.completeJourneyThemeSelection(presentation);
    expect(presentation.themeApplying).toBe(true);
    expect(requests).toHaveLength(1);
    game.dismissJourneyPresentation();
    expect(presentation.themeApplying).toBe(false);
    expect(game.journeyPresentation).toBe(presentation);
    expect(game.popupEntrance.snapshot()[0]).toMatchObject({ key: "journeyPresentation", phase: "exit" });
    const image = { src: requests[0].src } as HTMLImageElement;
    requests[0].resolve(image);
    await flushPromises();
    expect(host.releaseImage).toHaveBeenCalledExactlyOnceWith(image);
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(before);
    expect(host.storageSet).not.toHaveBeenCalled();
    expect(game.pendingJourneyThemeSelection).toBeUndefined();
    expect(game.journeyPresentation).toBe(presentation);
    finish();
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.journeyHomeThemeIndex).toBe(1);
    expect(game.save.selectedJourneyEpisode).toBe(1);
    expect(host.storageSet).not.toHaveBeenCalled();
  });

  it("does not start theme exit while the selected candidate save remains unknown", async () => {
    const { game, host, requests, ready, storage } = exitGame();
    game.screen = "levels";
    game.selectJourneyEpisode(JOURNEY_EPISODES[1]);
    const presentation = game.journeyPresentation;
    ready();
    storage.mode = "unknown-written";
    game.completeJourneyThemeSelection(presentation);
    requests[0].resolve({ src: requests[0].src } as HTMLImageElement);
    await flushPromises();
    const pending = game.pendingJourneyThemeSelection;
    expect(pending).toBeDefined();
    const writes = host.storageSet.mock.calls.length;
    game.dismissJourneyPresentation();
    expect(game.journeyPresentation).toBe(presentation);
    expect(game.pendingJourneyThemeSelection).toBe(pending);
    expect(game.popupEntrance.snapshot()[0]).toMatchObject({ key: "journeyPresentation", phase: "idle" });
    expect(game.popupEntrance.active).toBe(false);
    expect(game.save.selectedJourneyEpisode).toBe(1);
    expect(host.storageSet).toHaveBeenCalledTimes(writes);
  });

  it("persists the daily attempt and run journal before delaying only model and screen routing", () => {
    const { game, host, storage, ready, finish } = exitGame();
    game.screen = "dailyChallenge";
    ready();
    const previousModel = game.model;
    const before = clone(game.save);
    game.startDailyChallenge(1);
    expect(game.screen).toBe("dailyChallenge");
    expect(game.model).toBe(previousModel);
    expect(game.popupEntrance.snapshot()[0]).toMatchObject({ key: "dailyChallenge", phase: "exit" });
    expect(game.save.activeRun).toMatchObject({ daily: true, dailyChallengeDifficulty: 1, returnLevelId: 21, lifeStarted: true });
    expect(storage.value.activeRun).toEqual(game.save.activeRun);
    expect(storage.value.dailyChallenge.attemptsRemaining).toBe(before.dailyChallenge.attemptsRemaining - 1);
    expect(game.save.currentLevel).toBe(21);
    expect(game.save.lifeState).toEqual(before.lifeState);
    const writes = host.storageSet.mock.calls.length;
    expect(writes).toBeGreaterThan(0);
    const sourceLevelId = game.save.activeRun.dailyChallengeSourceLevelId;
    finish();
    expect(game.screen).toBe("playing");
    expect(game.model).not.toBe(previousModel);
    expect(game.model.level.id).toBe(sourceLevelId);
    expect(storage.value.activeRun).toEqual(game.save.activeRun);
    expect(host.storageSet).toHaveBeenCalledTimes(writes);
  });

  it("blocks purchase dismissal while persistence is unknown and closes only after the original candidate commits", () => {
    const { game, host, storage, ready, finish } = exitGame();
    game.screen = "playing";
    game.openBoosterPurchase("time");
    expect(game.screen).toBe("boosterPurchase");
    ready();
    const before = clone(game.save);
    storage.mode = "unknown-written";
    game.buyBoosterBundle();
    const pending = game.pendingBoosterPurchase;
    expect(pending).toBeDefined();
    game.closeBoosterPurchase();
    expect(game.screen).toBe("boosterPurchase");
    expect(game.pendingBoosterPurchase).toBe(pending);
    expect(game.popupEntrance.snapshot()[0]).toMatchObject({ key: "boosterPurchase", phase: "idle" });
    expect(game.save).toEqual(before);
    storage.mode = "commit";
    game.buyBoosterBundle();
    expect(game.pendingBoosterPurchase).toBeUndefined();
    expect(game.save).toEqual(pending.candidateSave);
    expect(game.save.coins).toBe(before.coins - 300);
    expect(game.save.boosters.time).toBe(before.boosters.time + 1);
    expect(game.screen).toBe("boosterPurchase");
    expect(game.popupEntrance.snapshot()[0]).toMatchObject({ key: "boosterPurchase", phase: "exit" });
    const writes = host.storageSet.mock.calls.length;
    finish();
    expect(game.screen).toBe("playing");
    expect(game.boosterPurchase).toBeUndefined();
    expect(storage.value).toEqual(pending.candidateSave);
    expect(host.storageSet).toHaveBeenCalledTimes(writes);
  });
});
