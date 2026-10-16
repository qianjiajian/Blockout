import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { JOURNEY_MILESTONE_REWARDS, type JourneyReward } from "../src/core/journeyProgress";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { PopupEntranceController } from "../src/game/popupEntrance";
import { CountdownWarning } from "../src/game/countdownWarning";
import { homeCoinFlightDuration, homeCoinFlightTiming } from "../src/game/completionFlow";
import { JOURNEY_PRESENTATION_LAYOUT } from "../src/game/formalPageLayout";
import { HOME_ARTBOARD } from "../src/game/homeArtLayout";
import { LeagueScroll } from "../src/game/leagueScroll";

const NOW = new Date("2026-10-09T06:00:00.000Z").getTime();
const rewardAt = (level: number): JourneyReward => JOURNEY_MILESTONE_REWARDS.find(reward => reward.level === level)!;
const arrivalCount = (game: any): number => game.playSound.mock.calls
  .filter(([kind]: [string]) => kind === "itemArrival").length;

/** Exercise the actual claim and shared animation against verified in-memory
 * persistence; no player data, solver shortcut, browser storage or canvas mock
 * is needed to prove a reward is granted exactly once before its flight. */
function journeyGame(overrides: Record<string, unknown> = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.popupEntrance = new PopupEntranceController();
  game.countdownWarning = new CountdownWarning();
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined),
    currentLevel: 12, highestLevel: 12, rewardedLevels: Array.from({ length: 11 }, (_, index) => index + 1),
    coins: 700, collectionIntroShown: true, collectionIntroPending: false,
    journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [11] },
    ...overrides,
  });
  game.screen = "levels";
  game.appVisible = true;
  game.artReady = true;
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  game.formalPageArtCache = {};
  game.journeyScrollOffset = 413;
  game.journeyScrollVelocity = 0;
  game.leagueScroll = new LeagueScroll();
  game.safeOffsets = () => ({ top: 12, bottom: 0 });
  game.viewportTransform = () => ({ scale: 1, offsetY: 0 });
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "emitBurst", "scheduleLifeRefreshWatch",
    "requestJourneyPresentationArt", "releaseFormalPageArt",
    "setFormalPageIntent", "pruneMainPageArt",
  ]) game[method] = vi.fn();
  const storage = {
    value: clone(game.save),
    mode: "commit" as "commit" | "reject" | "unknown-after-write" | "lost-ack",
  };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
  };
  const startFlight = vi.spyOn(game, "beginHomeCoinFlight");
  return { game, storage, startFlight };
}

function openAndClaim(game: any, level = 10) {
  game.openJourneyReward(rewardAt(level));
  game.completeJourneyPresentation();
}

function finishFlight(game: any) {
  game.updateHomeCoinFlight(homeCoinFlightDuration(game.save.reducedMotion));
  game.updateJourneyPresentation(0);
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Journey claimed coins reuse the campaign reward flight", () => {
  it("does not unlock level 15's task merely by reaching that level", () => {
    const { game } = journeyGame({ highestLevel: 15, currentLevel: 15,
      rewardedLevels: Array.from({ length: 14 }, (_, index) => index + 1),
      journeyProgress: { claimedMilestoneLevels: [10], seenEpisodeUnlockLevels: [11] } });
    const before = clone(game.save);
    expect(game.journeyRewardEarned(rewardAt(15))).toBe(false);
    expect(game.journeyRewardClaimable(rewardAt(15))).toBe(false);
    expect(game.hasClaimableJourneyReward()).toBe(false);
    openAndClaim(game, 15);
    expect(game.journeyPresentationRewardReadOnlyText()).toBe(game.tr("journey.claimAfterLevel", { level: 15 }));
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.playSound).not.toHaveBeenCalledWith("gold");
  });

  it("unlocks a task from that level's confirmed completion and claims its reward exactly once", () => {
    const { game } = journeyGame({ highestLevel: 16, currentLevel: 16,
      rewardedLevels: Array.from({ length: 15 }, (_, index) => index + 1),
      boosters: { time: 0, rocket: 0, pulse: 0 },
      journeyProgress: { claimedMilestoneLevels: [10], seenEpisodeUnlockLevels: [11] } });
    expect(game.journeyRewardClaimable(rewardAt(15))).toBe(true);
    expect(game.hasClaimableJourneyReward()).toBe(true);
    openAndClaim(game, 15);
    expect(game.save.lifeState.unlimitedLivesUntilMs).toBe(NOW + rewardAt(15).amount * 1000);
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([10, 15]);
    expect(game.hasClaimableJourneyReward()).toBe(false);
    game.updateJourneyPresentation(10);
    openAndClaim(game, 15);
    expect(game.journeyPresentationRewardReadOnlyText()).toBe(game.tr("journey.claimed"));
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    expect(game.save.lifeState.unlimitedLivesUntilMs).toBe(NOW + rewardAt(15).amount * 1000);
  });

  it("preserves an already-claimed task even when its old save has no completion record", () => {
    const { game } = journeyGame({ highestLevel: 15, currentLevel: 15, rewardedLevels: [], bestStars: {},
      journeyProgress: { claimedMilestoneLevels: [10, 15], seenEpisodeUnlockLevels: [11] } });
    const before = clone(game.save);
    expect(game.journeyRewardEarned(rewardAt(15))).toBe(false);
    expect(game.journeyRewardClaimable(rewardAt(15))).toBe(false);
    openAndClaim(game, 15);
    expect(game.journeyPresentationRewardReadOnlyText()).toBe(game.tr("journey.claimed"));
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("does not infer a missing milestone completion from higher sparse progress", () => {
    const { game } = journeyGame({ highestLevel: 101, currentLevel: 101,
      rewardedLevels: [1, 7, 14, 16, 99], bestStars: { 99: 3 } });
    const before = clone(game.save);
    expect(game.journeyRewardClaimable(rewardAt(15))).toBe(false);
    expect(game.hasClaimableJourneyReward()).toBe(false);
    openAndClaim(game, 15);
    expect(game.journeyPresentationRewardReadOnlyText()).toBe(game.tr("journey.claimAfterLevel", { level: 15 }));
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it.each([10, 110])("commits the level %i reward once, then flies from the displayed reward without leaving the map", level => {
    const { game, storage, startFlight } = journeyGame({
      highestLevel: level + 2, currentLevel: level + 2,
      rewardedLevels: Array.from({ length: level + 1 }, (_, index) => index + 1),
    });
    const before = clone(game.save);
    openAndClaim(game, level);
    expect(game.save.coins).toBe(before.coins + rewardAt(level).amount);
    expect(storage.value).toEqual(game.save);
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([level]);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
    expect(game.homeCoinFlight).toMatchObject({
      kind: "coins", age: 0, reward: rewardAt(level).amount,
      startCoins: before.coins, endCoins: game.save.coins, landedCount: 0,
    });
    const scale = 496 / HOME_ARTBOARD.width;
    expect(game.homeCoinFlight.start).toEqual({
      x: JOURNEY_PRESENTATION_LAYOUT.rewardCenter.x * scale,
      y: (1078 - HOME_ARTBOARD.height * scale) / 2 + JOURNEY_PRESENTATION_LAYOUT.rewardCenter.y * scale,
    });
    expect(startFlight).toHaveBeenCalledTimes(1);
    expect(game.displayedHomeCoins()).toBe(before.coins);
    expect(game.screen).toBe("levels");
    expect(game.journeyScrollOffset).toBe(413);
    for (const key of ["rewardedLevels", "highestLevel", "currentLevel", "boosters", "bestStars", "selectedJourneyEpisode"]) {
      expect(game.save[key], key).toEqual(before[key]);
    }
    game.completeJourneyPresentation();
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    expect(startFlight).toHaveBeenCalledTimes(1);
    finishFlight(game);
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.displayedHomeCoins()).toBe(game.save.coins);
    expect(game.screen).toBe("levels");
    expect(game.journeyScrollOffset).toBe(413);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
  });

  it("keeps the claim presentation until the final shared-flight arrival and settles the displayed balance incrementally", () => {
    const { game } = journeyGame();
    openAndClaim(game);
    game.updateJourneyPresentation(100);
    expect(game.journeyPresentation.phase).toBe("claiming");
    expect(game.homeCoinFlight.age).toBe(0);
    const timing = homeCoinFlightTiming(false);
    const duration = homeCoinFlightDuration(false);
    let observedIntermediate = false;
    for (let elapsed = 0; elapsed < duration - 0.05; elapsed += 0.05) {
      game.updateJourneyPresentation(0.05);
      game.updateHomeCoinFlight(0.05);
      const flight = game.homeCoinFlight;
      if (flight && flight.landedCount > 0 && flight.landedCount < timing.coinCount) {
        expect(game.displayedHomeCoins()).toBeGreaterThan(700);
        expect(game.displayedHomeCoins()).toBeLessThan(750);
        observedIntermediate = true;
      }
      expect(game.journeyPresentation).toBeDefined();
    }
    expect(observedIntermediate).toBe(true);
    finishFlight(game);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
  });

  it.each([false, true])("honors reducedMotion=%s and never grants again while the animation progresses", reducedMotion => {
    const { game } = journeyGame({ reducedMotion });
    openAndClaim(game);
    expect(game.homeCoinFlight.reducedMotion).toBe(reducedMotion);
    const committed = clone(game.save);
    finishFlight(game);
    expect(game.save).toEqual(committed);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
  });

  it("pauses the shared flight in background and resumes from the same age", () => {
    const { game } = journeyGame();
    openAndClaim(game);
    game.updateHomeCoinFlight(0.2);
    const before = clone(game.homeCoinFlight);
    game.appVisible = false;
    game.updateJourneyPresentation(30);
    game.updateHomeCoinFlight(30);
    expect(game.homeCoinFlight).toEqual(before);
    expect(game.journeyPresentation.phase).toBe("claiming");
    game.appVisible = true;
    game.updateHomeCoinFlight(0.1);
    expect(game.homeCoinFlight.age).toBeCloseTo(0.3);
    finishFlight(game);
    expect(game.homeCoinFlight).toBeUndefined();
  });

  it.each(["reject", "unknown-after-write"] as const)("does not fly on %s; a verified retry gives exactly one reward and flight", mode => {
    const { game, storage, startFlight } = journeyGame();
    const before = clone(game.save);
    storage.mode = mode;
    openAndClaim(game);
    expect(game.save).toEqual(before);
    expect(game.homeCoinFlight).toBeUndefined();
    expect(startFlight).not.toHaveBeenCalled();
    expect(game.journeyPresentation.phase).toBe("overlay");
    expect(game.playSound).not.toHaveBeenCalledWith("gold");
    const candidate = game.host.storageSet.mock.calls[0][1];
    if (mode === "unknown-after-write") {
      expect(game.pendingJourneyClaim.candidateSave).toBe(candidate);
      game.dismissJourneyPresentation();
      expect(game.journeyPresentation).toBeDefined();
    }
    storage.mode = "commit";
    game.completeJourneyPresentation();
    expect(game.save.coins).toBe(before.coins + 50);
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([10]);
    expect(game.homeCoinFlight).toMatchObject({ startCoins: before.coins, endCoins: before.coins + 50 });
    if (mode === "unknown-after-write") expect(game.host.storageSet.mock.calls[1][1]).toBe(candidate);
    expect(startFlight).toHaveBeenCalledTimes(1);
    finishFlight(game);
    expect(game.host.storageSet).toHaveBeenCalledTimes(2);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
  });

  it("starts once when a lost write acknowledgement is verified by readback", () => {
    const { game, storage, startFlight } = journeyGame();
    storage.mode = "lost-ack";
    openAndClaim(game);
    expect(game.save.coins).toBe(750);
    expect(game.homeCoinFlight).toBeDefined();
    expect(startFlight).toHaveBeenCalledTimes(1);
    expect(game.pendingJourneyClaim).toBeUndefined();
    finishFlight(game);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
  });

  it.each(["unearned", "claimed", "full"] as const)("does not fly or write for a %s reward", reason => {
    const { game, storage, startFlight } = journeyGame(reason === "full" ? { coins: 999999 } : {});
    if (reason === "unearned") game.save.rewardedLevels = game.save.rewardedLevels.filter((level: number) => level !== 10);
    if (reason === "claimed") game.save.journeyProgress.claimedMilestoneLevels = [10];
    storage.value = clone(game.save);
    const before = clone(game.save);
    openAndClaim(game);
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(startFlight).not.toHaveBeenCalled();
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.playSound).not.toHaveBeenCalledWith("gold");
  });

  it("does not replay after reloading an already committed reward", () => {
    const original = journeyGame();
    openAndClaim(original.game);
    const reloaded = journeyGame(clone(original.storage.value));
    openAndClaim(reloaded.game);
    expect(reloaded.game.save.coins).toBe(750);
    expect(reloaded.startFlight).not.toHaveBeenCalled();
    expect(reloaded.game.host.storageSet).not.toHaveBeenCalled();
    expect(reloaded.game.playSound).not.toHaveBeenCalledWith("gold");
  });

  it.each([15, 30, 35, 45])("keeps the original non-coin reward flow at level %i", level => {
    const { game, startFlight } = journeyGame({
      highestLevel: 46, currentLevel: 46, rewardedLevels: Array.from({ length: 45 }, (_, index) => index + 1),
      boosters: { time: 0, rocket: 0, pulse: 0 },
    });
    openAndClaim(game, level);
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([level]);
    expect(game.save.coins).toBe(700);
    expect(game.journeyPresentation.phase).toBe("claiming");
    expect(startFlight).not.toHaveBeenCalled();
    expect(game.homeCoinFlight).toBeUndefined();
    game.updateJourneyPresentation(10);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.screen).toBe("levels");
    expect(game.journeyScrollOffset).toBe(413);
    expect(game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold")).toHaveLength(1);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
  });

  it("accepts a complete navigation press during the committed coin flight", () => {
    const { game } = journeyGame();
    openAndClaim(game);
    const rect = game.mainNavigationRect(2);
    const point = { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    expect(game.buttonReleaseTargetAt(point)?.key).toBe("navigation.2");
    game.handleDown(point);
    expect(game.pendingButtonPress?.key).toBe("navigation.2");
    expect(game.homeCoinFlight.age).toBe(0);
    game.handleUp(point);
    expect(game.screen).toBe("home");
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.save.coins).toBe(750);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("allows map scrolling during the committed reward presentation", () => {
    const { game } = journeyGame();
    game.formalPageReady = () => true;
    openAndClaim(game);
    const viewport = game.journeyScrollView().viewport;
    const point = { id: 2, x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height / 2 };
    const startOffset = game.journeyScrollOffset;
    expect(game.beginJourneyScroll(point)).toBe(true);
    game.updateJourneyScroll({ ...point, y: point.y - 60 });
    expect(game.journeyScrollGesture.moved).toBe(true);
    expect(game.journeyScrollOffset).not.toBe(startOffset);
    game.handleUp({ ...point, y: point.y - 60 });
    expect(game.screen).toBe("levels");
    expect(game.pendingButtonPress).toBeUndefined();
    expect(game.journeyScrollGesture).toBeUndefined();
    expect(game.homeCoinFlight.age).toBe(0);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("keeps a held navigation press valid when the last flying coin arrives before release", () => {
    const { game } = journeyGame();
    openAndClaim(game);
    const rect = game.mainNavigationRect(2);
    const point = { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    game.handleDown(point);
    const beginNext = vi.spyOn(game, "beginPendingHomePresentation");
    finishFlight(game);
    expect(game.pendingButtonPress?.key).toBe("navigation.2");
    expect(game.homeCoinFlight).toBeDefined();
    expect(beginNext).not.toHaveBeenCalled();
    expect(arrivalCount(game)).toBe(5);
    finishFlight(game);
    expect(arrivalCount(game)).toBe(5);
    game.handleUp(point);
    expect(game.screen).toBe("home");
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("accepts navigation while a non-coin milestone reward animates", () => {
    const { game } = journeyGame({ highestLevel: 16, currentLevel: 16,
      rewardedLevels: Array.from({ length: 15 }, (_, index) => index + 1) });
    openAndClaim(game, 15);
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.journeyPresentation.phase).toBe("claiming");
    const rect = game.mainNavigationRect(2);
    const point = { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    game.handleDown(point); game.handleUp(point);
    expect(game.screen).toBe("home");
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([15]);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it.each(["reject", "unknown-after-write"] as const)("keeps the uncommitted %s reward overlay blocking navigation and scroll", mode => {
    const { game, storage } = journeyGame();
    storage.mode = mode;
    game.formalPageReady = () => true;
    openAndClaim(game);
    const rect = game.mainNavigationRect(2);
    const point = { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    expect(game.buttonReleaseTargetAt(point)).toBeUndefined();
    game.handleDown(point);
    game.handleUp(point);
    expect(game.beginJourneyScroll({ id: 2, x: 240, y: 550 })).toBe(false);
    expect(game.screen).toBe("levels");
    expect(game.journeyPresentation.phase).toBe("overlay");
    expect(game.save.coins).toBe(700);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("subtracts only the unlanded reward from the current wallet after spending mid-flight", () => {
    const { game } = journeyGame();
    openAndClaim(game);
    game.updateHomeCoinFlight(0.65);
    const beforeSpending = game.displayedHomeCoins();
    game.save.coins -= 300;
    expect(game.displayedHomeCoins()).toBe(beforeSpending - 300);
    finishFlight(game);
    expect(game.displayedHomeCoins()).toBe(450);
  });

  it("keeps an orphaned inspiration icon alive across a concurrent coin reward and releases it after landing", () => {
    const { game } = journeyGame();
    game.host.releaseImage = vi.fn();
    const icon = { src: "inspiration.png" };
    game.dailyTaskInspirationArt = icon;
    game.beginInspirationFlight(10);
    game.updateHomeCoinFlight(0.5);
    const inspirationFlight = game.homeCoinFlight;
    game.dailyTaskInspirationArt = undefined;
    openAndClaim(game);
    expect(game.homeCoinFlights.map((flight: any) => flight.kind)).toEqual(["inspiration", "coins"]);
    expect(game.homeCoinFlights[0]).toBe(inspirationFlight);
    expect(inspirationFlight.age).toBe(0.5);
    expect(game.inspirationFlightArt).toBe(icon);
    expect(game.host.releaseImage).not.toHaveBeenCalled();
    game.updateHomeCoinFlight(homeCoinFlightDuration(false) - 0.5 + 0.001);
    expect(game.homeCoinFlights.map((flight: any) => flight.kind)).toEqual(["coins"]);
    expect(game.inspirationFlightArt).toBeUndefined();
    expect(game.host.releaseImage).toHaveBeenCalledExactlyOnceWith(icon);
    finishFlight(game);
    expect(game.host.releaseImage).toHaveBeenCalledTimes(1);
  });

  it("retains one inspiration image until every concurrent inspiration batch finishes across popup reopen", () => {
    const { game } = journeyGame();
    const firstIcon = { src: "inspiration-first.png" };
    const reopenedIcon = { src: "inspiration-reopened.png" };
    game.host.releaseImage = vi.fn();
    game.dailyTaskInspirationArt = firstIcon;
    game.beginInspirationFlight(10);
    game.updateHomeCoinFlight(0.4);
    game.releaseDailyTaskArt();
    expect(game.inspirationFlightArt).toBe(firstIcon);
    expect(game.host.releaseImage).not.toHaveBeenCalled();
    game.dailyTaskInspirationArt = reopenedIcon;
    game.beginInspirationFlight(10);
    openAndClaim(game);
    expect(game.homeCoinFlights).toHaveLength(3);
    expect(game.inspirationFlightArt).toBe(firstIcon);
    game.releaseDailyTaskArt();
    expect(game.host.releaseImage).toHaveBeenCalledExactlyOnceWith(reopenedIcon);
    game.updateHomeCoinFlight(homeCoinFlightDuration(false) - 0.4 + 0.001);
    expect(game.homeCoinFlights.map((flight: any) => flight.kind)).toEqual(["inspiration", "coins"]);
    expect(game.inspirationFlightArt).toBe(firstIcon);
    expect(game.host.releaseImage).toHaveBeenCalledTimes(1);
    finishFlight(game);
    expect(game.inspirationFlightArt).toBeUndefined();
    expect(game.host.releaseImage.mock.calls).toEqual([[reopenedIcon], [firstIcon]]);
    game.clearHomeCoinFlight();
    expect(game.host.releaseImage).toHaveBeenCalledTimes(2);
  });

  it("draws every active reward batch without changing its timeline", () => {
    const { game } = journeyGame();
    openAndClaim(game);
    game.updateHomeCoinFlight(0.3);
    game.beginInspirationFlight(10);
    const before = clone(game.homeCoinFlights);
    game.drawRewardFlight = vi.fn();
    game.drawHomeCoinFlight();
    expect(game.drawRewardFlight.mock.calls.map(([flight]: [unknown]) => flight)).toEqual(game.homeCoinFlights);
    expect(game.homeCoinFlights).toEqual(before);
  });
});

describe("reward item arrival recording", () => {
  it.each(["coins", "inspiration"] as const)("plays once at each of the five %s arrivals, never at takeoff", kind => {
    const { game } = journeyGame();
    if (kind === "coins") openAndClaim(game);
    else game.beginInspirationFlight(10);
    expect(arrivalCount(game)).toBe(0);
    const timing = homeCoinFlightTiming(false);
    expect(timing.coinCount).toBe(5);
    let age = 0;
    const advanceTo = (next: number) => { game.updateHomeCoinFlight(next - age); age = next; };
    for (let index = 0; index < 5; index += 1) {
      const arrivalAt = timing.delay + timing.coinDuration + timing.stagger * index;
      advanceTo(arrivalAt - 0.0001);
      expect(arrivalCount(game)).toBe(index);
      advanceTo(arrivalAt + 0.0001);
      expect(arrivalCount(game)).toBe(index + 1);
      game.updateHomeCoinFlight(0);
      expect(arrivalCount(game)).toBe(index + 1);
    }
    finishFlight(game);
    finishFlight(game);
    expect(arrivalCount(game)).toBe(5);
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
    if (kind === "coins") {
      expect(game.playSound.mock.calls.filter(([sound]: [string]) => sound === "gold")).toHaveLength(1);
      expect(game.host.storageSet).toHaveBeenCalledTimes(1);
    }
  });

  it.each([false, true])("counts every skipped-frame arrival once with reducedMotion=%s", reducedMotion => {
    const { game } = journeyGame({ reducedMotion });
    openAndClaim(game);
    const expected = reducedMotion ? 1 : 5;
    expect(arrivalCount(game)).toBe(0);
    game.updateHomeCoinFlight(100);
    game.updateHomeCoinFlight(100);
    game.updateJourneyPresentation(100);
    expect(arrivalCount(game)).toBe(expected);
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("does not advance or play arrivals while the app is in the background", () => {
    const { game } = journeyGame();
    openAndClaim(game);
    game.updateHomeCoinFlight(0.5);
    game.appVisible = false;
    game.updateHomeCoinFlight(100);
    game.updateJourneyPresentation(100);
    expect(arrivalCount(game)).toBe(0);
    expect(game.homeCoinFlight.age).toBe(0.5);
    game.appVisible = true;
    finishFlight(game);
    expect(arrivalCount(game)).toBe(5);
  });

  it.each([[0, 0], [1.1, 1]])("cancels remaining sounds when navigating away at age %s", (age, expected) => {
    const { game } = journeyGame();
    openAndClaim(game);
    game.updateHomeCoinFlight(age);
    expect(arrivalCount(game)).toBe(expected);
    const rect = game.mainNavigationRect(2);
    const point = { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    game.handleDown(point); game.handleUp(point);
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.journeyPresentation).toBeUndefined();
    finishFlight(game);
    expect(arrivalCount(game)).toBe(expected);
  });

  it("plays both batches' arrivals once when a second reward starts during the first flight", () => {
    const { game } = journeyGame();
    openAndClaim(game);
    game.updateHomeCoinFlight(0.5);
    game.beginInspirationFlight(10);
    expect(arrivalCount(game)).toBe(0);
    game.updateHomeCoinFlight(100);
    game.updateHomeCoinFlight(100);
    expect(arrivalCount(game)).toBe(10);
  });

  it("honors the sound setting for takeoff and every item arrival", () => {
    const { game } = journeyGame({ sound: false });
    game.playSound = ColorEscapeGame.prototype["playSound"];
    game.syncMusic = vi.fn(); game.host.sound = vi.fn();
    openAndClaim(game);
    finishFlight(game);
    expect(game.host.sound).not.toHaveBeenCalled();
    expect(game.save.coins).toBe(750);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it.each(["reject", "unknown-after-write"] as const)("never plays arrivals before a %s reward is confirmed", mode => {
    const { game, storage } = journeyGame();
    storage.mode = mode;
    openAndClaim(game);
    finishFlight(game);
    expect(arrivalCount(game)).toBe(0);
    storage.mode = "commit";
    game.completeJourneyPresentation();
    finishFlight(game);
    expect(arrivalCount(game)).toBe(5);
    game.completeJourneyPresentation();
    finishFlight(game);
    expect(arrivalCount(game)).toBe(5);
  });

  it.each([15, 30, 35, 45])("plays once when level %i's single non-coin reward reaches its endpoint", level => {
    const { game } = journeyGame({ highestLevel: 46, currentLevel: 46,
      rewardedLevels: Array.from({ length: 45 }, (_, index) => index + 1) });
    openAndClaim(game, level);
    expect(arrivalCount(game)).toBe(0);
    game.updateJourneyPresentation(0.71);
    expect(arrivalCount(game)).toBe(0);
    game.updateJourneyPresentation(0.02);
    expect(arrivalCount(game)).toBe(1);
    expect(game.journeyPresentation).toBeUndefined();
    game.updateJourneyPresentation(100);
    expect(arrivalCount(game)).toBe(1);
    expect(game.playSound.mock.calls.filter(([sound]: [string]) => sound === "gold")).toHaveLength(1);
    expect(game.host.storageSet).toHaveBeenCalledTimes(1);
  });

  it("pauses a non-coin reward before arrival and does not play a cancelled endpoint", () => {
    const { game } = journeyGame({ highestLevel: 16, currentLevel: 16,
      rewardedLevels: Array.from({ length: 15 }, (_, index) => index + 1) });
    openAndClaim(game, 15);
    game.updateJourneyPresentation(0.5);
    game.appVisible = false;
    game.updateJourneyPresentation(100);
    expect(game.journeyPresentation.age).toBe(0.5);
    expect(arrivalCount(game)).toBe(0);
    game.appVisible = true;
    const rect = game.mainNavigationRect(2);
    const point = { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    game.handleDown(point); game.handleUp(point);
    game.updateJourneyPresentation(100);
    expect(arrivalCount(game)).toBe(0);
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([15]);
  });
});
