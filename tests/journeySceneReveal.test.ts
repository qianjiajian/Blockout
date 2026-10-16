import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { JOURNEY_EPISODES, JOURNEY_MILESTONE_REWARDS } from "../src/core/journeyProgress";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { GAME_ART, SUPPLIED_REVEAL_ART } from "../src/game/artManifest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { PopupEntranceController } from "../src/game/popupEntrance";
import { CountdownWarning } from "../src/game/countdownWarning";
import { HOME_ART_LAYOUT } from "../src/game/homeArtLayout";
import { GAME_LANGUAGES } from "../src/game/localization";

const NOW = new Date("2026-10-08T06:00:00.000Z").getTime();
const image = (src: string) => ({ src }) as HTMLImageElement;
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const center = (rect: { x: number; y: number; width: number; height: number }) => (
  { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
);

/** Real presentation, hit resolution, acknowledgement and storage transactions.
 * Image completion is controlled; no player storage, timers or game routes are used. */
function sceneGame(options: { ready?: boolean; save?: Record<string, unknown> } = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.popupEntrance = new PopupEntranceController();
  game.countdownWarning = new CountdownWarning();
  game.playableClockSlices = { reset: vi.fn() };
  game.save = game.sanitizeSave({
    ...game.sanitizeSave(undefined),
    currentLevel: 12, highestLevel: 12, selectedJourneyEpisode: 2,
    rewardedLevels: Array.from({ length: 11 }, (_, index) => index + 1),
    coins: 1254, collectionIntroPending: false, collectionIntroShown: true,
    journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
    ...options.save,
  });
  game.model = new PuzzleModel(LEVELS[game.save.currentLevel - 1]);
  game.screen = "home";
  game.appVisible = true;
  game.artReady = true;
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  game.art = { home: image("default-home"), homeUi: {} };
  game.journeyHomeThemeRequestToken = 0;
  game.journeyHomeThemeIndex = options.ready === false ? 1 : game.save.selectedJourneyEpisode;
  game.journeyHomeThemeLoading = false;
  game.journeyHomeThemeFailed = false;
  if (options.ready !== false) game.journeyHomeThemeArt = image("ready-selected-theme");
  game.leagueScroll = { gesture: undefined };
  game.collectionAlbumPage = { levels: 0, masterpieces: 0 };
  game.collectionAlbumArtwork = { image: vi.fn(() => image("collection")), failedIndexes: [], dispose: vi.fn() };
  // This fixture controls landscape loading; the independent decorations have
  // already decoded. Store loading/late disposal is covered by its own tests.
  const decorations = Object.fromEntries(Object.entries(SUPPLIED_REVEAL_ART).map(([group, urls]) => [
    group, Object.fromEntries(Object.entries(urls).map(([key, src]) => [key, { src, naturalWidth: 300, naturalHeight: 100 }])),
  ]));
  game.suppliedRevealArt = {
    imageGroup: vi.fn((group: string) => decorations[group]),
    request: vi.fn(), failed: vi.fn(() => false), dispose: vi.fn(),
  };
  game.safeOffsets = () => ({ top: 0, bottom: 0 });
  game.viewportTransform = () => ({ scale: 1, offsetY: 0 });
  game.formalPageArtFor = vi.fn(() => undefined);
  game.formalPageReady = vi.fn(() => false);
  game.formalPageFailed = vi.fn(() => false);
  game.formalPageForScreen = () => undefined;
  game.mainNavigationInteractive = () => false;
  for (const method of [
    "playSound", "vibrate", "scheduleFrame", "emitBurst", "setFormalPageIntent",
    "requestCollectionAlbumArtwork", "releaseCollectionAlbumArt", "releaseFormalPageArt",
    "scheduleLifeRefreshWatch", "refreshLifeState", "captureInitialGeneratorSpawns",
    "releaseDailyChallengeArt", "releaseWinArt", "releaseAchievementArt",
    "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt",
  ]) game[method] = vi.fn();
  const storage = {
    value: clone(game.save),
    mode: "commit" as "commit" | "reject" | "unknown-after-write" | "lost-ack",
  };
  const requests: Array<{ src: string; resolve: (value: HTMLImageElement) => void; reject: (reason: Error) => void }> = [];
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
    createImage: vi.fn((src: string) => new Promise<HTMLImageElement>((resolve, reject) => requests.push({ src, resolve, reject }))),
    releaseImage: vi.fn(),
  };
  return { game, storage, requests };
}

function openReadyScene(game: any) {
  expect(game.beginPendingHomePresentation()).toBe(true);
  expect(game.journeyPresentation.sceneReveal).toBe(true);
  game.updateJourneyPresentation(0);
  expect(game.journeyPresentation).toMatchObject({ intent: "progress_event", phase: "overlay" });
  if (!game.save.reducedMotion) expect(game.journeyPresentation.age).toBe(0);
}

function confirmPoint(game: any) { return center(game.journeySceneLayout().primary); }

function renderHome(game: any) {
  const alphaStack: number[] = [];
  const ctx: any = {
    globalAlpha: 1,
    drawImage: vi.fn(),
    save: vi.fn(() => alphaStack.push(ctx.globalAlpha)),
    restore: vi.fn(() => { ctx.globalAlpha = alphaStack.pop() ?? 1; }),
    translate: vi.fn(), scale: vi.fn(),
  };
  game.ctx = ctx;
  game.withHomeArtboard = (draw: () => void) => draw();
  game.lifeHeaderText = () => "Full";
  const controls: Array<{ key: string; rect: unknown; alpha: number }> = [];
  game.drawPressable = vi.fn((key: string, rect: unknown, draw?: () => void) => {
    controls.push({ key, rect: clone(rect), alpha: ctx.globalAlpha });
    if (key === "homePlay") draw?.();
  });
  for (const method of ["label", "drawTemporaryLevelButton", "drawHomeLevelArrows", "drawDailyTaskHomeEntry", "drawLeagueHomeEntry", "drawDailyChallengeHomeEntry"]) game[method] = vi.fn();
  game.drawGeneratedHome(false);
  return { controls, ctx };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Home Journey scene reveal", () => {
  it("does not reveal or select the desert while level 11 has only been reached", () => {
    const { game, requests } = sceneGame({ save: { highestLevel: 11, currentLevel: 11, selectedJourneyEpisode: 1,
      rewardedLevels: Array.from({ length: 10 }, (_, index) => index + 1) } });
    expect(game.beginPendingHomePresentation()).toBe(false);
    expect(game.journeyPresentation).toBeUndefined();
    game.screen = "levels";
    game.selectJourneyEpisode(JOURNEY_EPISODES[1]);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.save.selectedJourneyEpisode).toBe(1);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(requests).toHaveLength(0);
  });

  it.each(["playing", "win", "levels"])("does not interrupt the %s screen", screen => {
    const { game } = sceneGame();
    game.screen = screen;
    expect(game.beginPendingHomePresentation()).toBe(false);
    expect(game.journeyPresentation).toBeUndefined();
  });

  it.each(["directLevelTransition", "navigationTransition", "lifeRefillOpen"])("waits while %s owns Home", field => {
    const { game } = sceneGame();
    game[field] = true;
    expect(game.beginPendingHomePresentation()).toBe(false);
    expect(game.journeyPresentation).toBeUndefined();
  });

  it("finishes the actual coin flight and collection introduction before opening the new scene", () => {
    const { game } = sceneGame({ save: { collectionIntroPending: true, collectionIntroShown: false } });
    game.beginHomeCoinFlight(20);
    expect(game.beginPendingHomePresentation()).toBe(false);
    expect(game.journeyPresentation).toBeUndefined();
    game.updateHomeCoinFlight(10);
    expect(game.homeCoinFlight).toBeUndefined();
    expect(game.collectionIntro).toBeDefined();
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.beginPendingJourneyPresentation()).toBe(false);
    game.finishCollectionIntro(false);
    expect(game.collectionIntro).toBeUndefined();
    expect(game.journeyPresentation?.sceneReveal).toBe(true);
  });

  it("waits at full HUD opacity for the actual selected image, without consuming the fade duration", async () => {
    const { game, requests } = sceneGame({ ready: false });
    const before = clone(game.save);
    expect(game.beginPendingHomePresentation()).toBe(true);
    expect(game.journeyPresentation.phase).toBe("progress");
    expect(requests).toHaveLength(1);
    expect(requests[0].src).toBe(GAME_ART.ui.formalPages.journey.homeThemes[1]);
    game.updateJourneyPresentation(20);
    expect(game.journeyPresentation).toMatchObject({ phase: "progress", age: 0 });
    expect(game.journeySceneHudAlpha()).toBe(1);
    expect(game.journeySceneConfirmReady()).toBe(false);
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    requests[0].resolve(image(requests[0].src));
    await flush();
    game.updateJourneyPresentation(0);
    expect(game.journeyPresentation).toMatchObject({ phase: "overlay", age: 0 });
    expect(game.journeySceneHudAlpha()).toBe(1);
    expect(game.setFormalPageIntent).not.toHaveBeenCalled();
    expect(game.formalPageReady).not.toHaveBeenCalled();
  });

  it("does not treat a different loaded theme as ready for this reveal", () => {
    const { game } = sceneGame();
    game.journeyHomeThemeIndex = 1;
    game.beginPendingHomePresentation();
    game.updateJourneyPresentation(10);
    expect(game.journeySceneArtReady()).toBe(false);
    expect(game.journeySceneHudAlpha()).toBe(1);
    expect(game.journeyPresentation.phase).toBe("progress");
  });

  it("provides an actual retry target after image failure and starts the fade only after retry succeeds", async () => {
    const { game, requests } = sceneGame({ ready: false });
    game.beginPendingHomePresentation();
    requests[0].reject(new Error("offline"));
    await flush();
    expect(game.journeyHomeThemeFailed).toBe(true);
    expect(game.journeyPresentation.phase).toBe("progress");
    expect(game.journeySceneHudAlpha()).toBe(1);
    const point = confirmPoint(game);
    expect(game.buttonReleaseTargetAt(point)?.key).toBe("journeySceneRetry");
    game.executePointerDown(point);
    expect(requests).toHaveLength(2);
    expect(game.journeyHomeThemeFailed).toBe(false);
    requests[1].resolve(image(requests[1].src));
    await flush();
    game.updateJourneyPresentation(0);
    expect(game.journeyPresentation).toMatchObject({ phase: "overlay", age: 0 });
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([]);
  });

  it("allows Later while loading without acknowledging the scene or modifying progress", () => {
    const { game } = sceneGame({ ready: false });
    const before = clone(game.save);
    game.beginPendingHomePresentation();
    const later = center(game.journeySceneLayout().later);
    expect(game.buttonReleaseTargetAt(later)?.key).toBe("journeySceneLater");
    game.executePointerDown(later);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.screen).toBe("home");
    expect(game.save).toEqual(before);
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([]);
  });

  it("fades and restores HUD while keeping the Start placement and transform fixed", () => {
    const { game } = sceneGame();
    openReadyScene(game);
    const samples = [renderHome(game)];
    expect(game.journeySceneHudAlpha()).toBe(1);
    game.updateJourneyPresentation(0.3);
    expect(game.journeySceneHudAlpha()).toBeGreaterThan(0);
    expect(game.journeySceneHudAlpha()).toBeLessThan(1);
    samples.push(renderHome(game));
    game.updateJourneyPresentation(0.3);
    expect(game.journeySceneHudAlpha()).toBe(0);
    samples.push(renderHome(game));
    game.completeJourneyPresentation();
    samples.push(renderHome(game));
    game.updateJourneyPresentation(0.125);
    samples.push(renderHome(game));
    game.updateJourneyPresentation(0.125);
    samples.push(renderHome(game));
    for (const sample of samples) {
      expect(sample.controls.find(control => control.key === "homePlay")?.rect).toEqual(HOME_ART_LAYOUT.start);
      expect(sample.ctx.drawImage.mock.calls[0][0]).toBe(game.journeyHomeThemeArt);
      expect(sample.ctx.scale.mock.calls).toEqual([]);
    }
    expect(samples[0].controls.find(control => control.key === "homePlay")?.alpha).toBe(1);
    expect(samples[1].controls.find(control => control.key === "homePlay")?.alpha).toBeGreaterThan(0);
    expect(samples[1].controls.find(control => control.key === "homePlay")?.alpha).toBeLessThan(1);
    expect(samples[2].controls.find(control => control.key === "homePlay")?.alpha).toBe(0);
    expect(samples[3].controls.find(control => control.key === "homePlay")?.alpha).toBe(0);
    expect(samples[4].controls.find(control => control.key === "homePlay")?.alpha).toBeGreaterThan(0);
    expect(samples[4].controls.find(control => control.key === "homePlay")?.alpha).toBeLessThan(1);
    expect(samples[5].controls.find(control => control.key === "homePlay")?.alpha).toBe(1);
  });

  it("fades the revealed captions and supplied decorations in place when confirmation resets the restoration clock", () => {
    const { game } = sceneGame();
    openReadyScene(game);
    game.updateJourneyPresentation(0.6);
    const capture = () => {
      const labels: Array<{ args: unknown[]; alpha: number }> = [];
      const decorations: Array<{ args: unknown[]; alpha: number }> = [];
      const ctx = {
        globalAlpha: 1, save: vi.fn(), restore: vi.fn(), fillRect: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      };
      game.ctx = ctx;
      game.label = (...args: unknown[]) => labels.push({ args, alpha: ctx.globalAlpha });
      game.drawCollectionImageContained = (...args: unknown[]) => decorations.push({ args, alpha: ctx.globalAlpha });
      game.drawPressable = (_key: string, _rect: unknown, draw: () => void) => draw();
      game.drawButton = vi.fn();
      game.drawJourneySceneReveal();
      return { labels, decorations };
    };
    const overlay = capture();
    game.completeJourneyPresentation();
    expect(game.journeyPresentation).toMatchObject({ phase: "claiming", age: 0 });
    const restorationStart = capture();
    game.updateJourneyPresentation(0.125);
    const restorationMidpoint = capture();
    expect(overlay.labels.length).toBeGreaterThan(0);
    expect(overlay.decorations.length).toBeGreaterThan(0);
    for (const key of ["labels", "decorations"] as const) {
      expect(restorationStart[key].map(item => item.args)).toEqual(overlay[key].map(item => item.args));
      expect(restorationMidpoint[key].map(item => item.args)).toEqual(overlay[key].map(item => item.args));
      for (let index = 0; index < overlay[key].length; index++) {
        expect(overlay[key][index].alpha).toBe(1);
        expect(restorationStart[key][index].alpha).toBe(1);
        expect(restorationMidpoint[key][index].alpha).toBeGreaterThan(0);
        expect(restorationMidpoint[key][index].alpha).toBeLessThan(1);
      }
    }
  });

  it("blocks early confirmation and underlying Home clicks until the 0.6-second reveal finishes", () => {
    const { game } = sceneGame();
    openReadyScene(game);
    game.updateJourneyPresentation(0.59);
    const point = confirmPoint(game);
    expect(game.journeySceneConfirmReady()).toBe(false);
    expect(game.buttonReleaseTargetAt(point)).toBeUndefined();
    expect(game.buttonReleaseTargetAt({ id: 2, x: 248, y: 950 })).toBeUndefined();
    game.executePointerDown(point);
    game.completeJourneyPresentation();
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.journeyPresentation.phase).toBe("overlay");
    game.updateJourneyPresentation(0.01);
    expect(game.journeySceneConfirmReady()).toBe(true);
    expect(game.buttonReleaseTargetAt(point)?.key).toBe("journeySceneConfirm");
  });

  it.each([
    { level: 11, episode: 2, title: "新场景已解锁！", name: "沙漠王国" },
    { level: 101, episode: 11, title: "新篇章开启", name: "城堡大道" },
  ])("renders the supplied title or later-chapter title, actual landscape name and matching confirmation target for level $level", ({ level, episode, title, name }) => {
    const { game } = sceneGame({ save: {
      highestLevel: level + 1, currentLevel: level + 1, selectedJourneyEpisode: episode,
      rewardedLevels: Array.from({ length: level }, (_, index) => index + 1),
      journeyProgress: {
        claimedMilestoneLevels: [],
        seenEpisodeUnlockLevels: Array.from({ length: episode - 2 }, (_, index) => index * 10 + 11),
      },
    } });
    openReadyScene(game);
    game.updateJourneyPresentation(0.6);
    game.ctx = {
      globalAlpha: 1, save: vi.fn(), restore: vi.fn(), fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    };
    game.label = vi.fn();
    game.drawButton = vi.fn();
    game.drawCollectionImageContained = vi.fn();
    game.drawPressable = vi.fn((_key: string, _rect: unknown, draw: () => void) => draw());
    game.drawJourneySceneReveal();
    const labels = game.label.mock.calls.map((args: unknown[]) => args[0]);
    if (episode <= 10) {
      expect(game.drawCollectionImageContained.mock.calls.some(([image]: [HTMLImageElement]) => image.src === SUPPLIED_REVEAL_ART.scene.titleZh)).toBe(true);
    } else expect(labels).toContain(title);
    expect(labels).toContain(name);
    expect(labels).toContain("太棒了");
    const decorations = game.drawCollectionImageContained.mock.calls.map(([image]: [HTMLImageElement]) => image.src);
    expect(decorations).toContain(SUPPLIED_REVEAL_ART.scene.button);
    expect(decorations).not.toContain(SUPPLIED_REVEAL_ART.scene.range);
    expect(labels).not.toContain(game.tr("journey.sceneApplied"));
    expect(labels).not.toContain(game.tr("journey.levelRange", { start: level, end: level + 9 }));
    const confirmation = game.drawPressable.mock.calls.find((args: unknown[]) => args[0] === "journeySceneConfirm");
    expect(confirmation?.[1]).toEqual(game.journeySceneLayout().primary);
    expect(game.buttonReleaseTargetAt(center(confirmation![1]))?.key).toBe("journeySceneConfirm");
  });

  it.each(GAME_LANGUAGES.flatMap(language => [true, false].map(formalArt => ({ language, formalArt }))))(
    "removes the applied subtitle and complete range sign in $language (formal art: $formalArt), keeping title and confirmation in place",
    ({ language, formalArt }) => {
      const { game } = sceneGame({ save: { language } });
      openReadyScene(game);
      game.updateJourneyPresentation(0.6);
      if (!formalArt) game.suppliedRevealAssets = vi.fn(() => undefined);
      const before = clone(game.save);
      game.ctx = {
        globalAlpha: 1, save: vi.fn(), restore: vi.fn(), fillRect: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      };
      game.label = vi.fn();
      game.drawButton = vi.fn();
      game.drawCollectionImageContained = vi.fn();
      game.drawPressable = vi.fn((_key: string, _rect: unknown, draw: () => void) => draw());
      game.drawJourneySceneReveal();
      const labels = game.label.mock.calls.map((args: unknown[]) => args[0]);
      const decorations = game.drawCollectionImageContained.mock.calls;
      expect(labels).not.toContain(game.tr("journey.sceneApplied"));
      expect(labels).not.toContain(game.tr("journey.levelRange", { start: 11, end: 20 }));
      expect(decorations.some(([art]: [HTMLImageElement]) => art.src === SUPPLIED_REVEAL_ART.scene.range)).toBe(false);
      expect(game.label.mock.calls.find((args: unknown[]) => args[0] === game.journeySceneName())?.slice(1, 4))
        .toEqual([248, 207, 74]);
      const bitmapTitle = formalArt && (language === "zh-CN" || language === "en");
      if (bitmapTitle) {
        const titleSrc = language === "en" ? SUPPLIED_REVEAL_ART.scene.titleEn : SUPPLIED_REVEAL_ART.scene.titleZh;
        const width = language === "en" ? 426 : 318;
        expect(decorations.find(([art]: [HTMLImageElement]) => art.src === titleSrc)?.[1])
          .toEqual({ x: 248 - width / 2, y: 85, width, height: language === "en" ? 82 : 69 });
      } else {
        expect(game.label.mock.calls.find((args: unknown[]) => args[0] === game.journeySceneTitle())?.slice(1, 4))
          .toEqual([248, 120, 34]);
      }
      const primary = { x: 122, y: 839, width: 252, height: 93 };
      if (formalArt) {
        expect(decorations.find(([art]: [HTMLImageElement]) => art.src === SUPPLIED_REVEAL_ART.scene.button)?.[1]).toEqual(primary);
        expect(game.label.mock.calls.find((args: unknown[]) => args[0] === game.tr("journey.sceneConfirm"))?.slice(1, 4))
          .toEqual([248, 839 + 93 * 0.48, 39]);
      } else {
        expect(game.drawButton).toHaveBeenCalledWith("journeySceneConfirm", primary,
          game.tr("journey.sceneConfirm"), "#43dc38", "#0a8122", 33);
      }
      expect(game.save).toEqual(before);
      expect(game.host.storageSet).not.toHaveBeenCalled();
      expect(game.host.storageRead).not.toHaveBeenCalled();
    },
  );

  it("pauses both reveal and HUD restoration while the app is hidden", () => {
    const { game } = sceneGame();
    openReadyScene(game);
    game.updateJourneyPresentation(0.2);
    game.appVisible = false;
    game.updateJourneyPresentation(30);
    expect(game.journeyPresentation.age).toBe(0.2);
    expect(game.journeySceneConfirmReady()).toBe(false);
    game.appVisible = true;
    game.updateJourneyPresentation(0.4);
    game.completeJourneyPresentation();
    expect(game.journeyPresentation.phase).toBe("claiming");
    game.appVisible = false;
    game.updateJourneyPresentation(30);
    expect(game.journeyPresentation.age).toBe(0);
    game.appVisible = true;
    game.updateJourneyPresentation(0.25);
    expect(game.journeyPresentation).toBeUndefined();
  });

  it("confirms once, persists only the seen marker, then restores HUD over 0.25 seconds", () => {
    const { game, storage } = sceneGame();
    const before = clone(game.save);
    openReadyScene(game);
    game.updateJourneyPresentation(0.6);
    game.executePointerDown(confirmPoint(game));
    expect(game.journeyPresentation).toMatchObject({ phase: "claiming", age: 0 });
    expect(game.journeySceneHudAlpha()).toBe(0);
    expect(game.save).toEqual({ ...before, journeyProgress: { ...before.journeyProgress, seenEpisodeUnlockLevels: [11] } });
    expect(storage.value).toEqual(game.save);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
    game.completeJourneyPresentation();
    expect(game.host.storageSet).toHaveBeenCalledOnce();
    game.updateJourneyPresentation(0.125);
    expect(game.journeySceneHudAlpha()).toBeGreaterThan(0);
    expect(game.journeySceneHudAlpha()).toBeLessThan(1);
    game.updateJourneyPresentation(0.125);
    expect(game.journeyPresentation).toBeUndefined();
    expect(game.journeySceneHudAlpha()).toBe(1);
    expect(game.beginPendingHomePresentation()).toBe(false);
    const reloaded = sceneGame({ save: storage.value });
    expect(reloaded.game.beginPendingHomePresentation()).toBe(false);
    expect(reloaded.game.save.selectedJourneyEpisode).toBe(2);
  });

  it.each(["reject", "unknown-after-write", "lost-ack"] as const)("handles confirmation storage outcome %s without a premature acknowledgement or duplicate grant", mode => {
    const { game, storage } = sceneGame();
    const before = clone(game.save);
    openReadyScene(game);
    game.updateJourneyPresentation(0.6);
    storage.mode = mode;
    game.completeJourneyPresentation();
    if (mode === "lost-ack") {
      expect(game.journeyPresentation.phase).toBe("claiming");
      expect(game.host.storageRead).toHaveBeenCalledOnce();
    } else {
      expect(game.journeyPresentation.phase).toBe("overlay");
      expect(game.save).toEqual(before);
      expect(game.journeySceneHudAlpha()).toBe(0);
      expect(game.journeyPresentation.error).toBeTypeOf("string");
      const candidate = game.host.storageSet.mock.calls[0][1];
      if (mode === "unknown-after-write") {
        expect(game.pendingJourneyClaim.candidateSave).toBe(candidate);
        game.dismissJourneyPresentation();
        expect(game.journeyPresentation).toBeDefined();
      }
      storage.mode = "commit";
      game.completeJourneyPresentation();
      if (mode === "unknown-after-write") expect(game.host.storageSet.mock.calls[1][1]).toBe(candidate);
      expect(game.journeyPresentation.phase).toBe("claiming");
    }
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([11]);
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.boosters).toEqual(before.boosters);
    expect(game.save.selectedJourneyEpisode).toBe(before.selectedJourneyEpisode);
  });

  it("keeps explicit confirmation in reduced motion mode", () => {
    const { game } = sceneGame({ save: { reducedMotion: true } });
    openReadyScene(game);
    game.updateJourneyPresentation(1);
    expect(game.journeySceneConfirmReady()).toBe(true);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([]);
    game.completeJourneyPresentation();
    expect(game.save.journeyProgress.seenEpisodeUnlockLevels).toEqual([11]);
  });

  it("keeps older unseen chapters on their information presentation if another theme is selected", () => {
    const { game } = sceneGame({ save: { highestLevel: 22, currentLevel: 22, selectedJourneyEpisode: 3,
      rewardedLevels: Array.from({ length: 21 }, (_, index) => index + 1) } });
    game.beginPendingHomePresentation();
    expect(game.journeyPresentation.event.level).toBe(11);
    expect(game.journeyPresentation.sceneReveal).not.toBe(true);
    expect(game.setFormalPageIntent).toHaveBeenCalledWith("levels");
    expect(game.journeySceneHudAlpha()).toBe(1);
    expect(game.save.selectedJourneyEpisode).toBe(3);
  });

  it("retains manual preview/use selection without marking an unlock seen", async () => {
    const { game, requests } = sceneGame({ save: { highestLevel: 22, currentLevel: 22, selectedJourneyEpisode: 2,
      rewardedLevels: Array.from({ length: 21 }, (_, index) => index + 1) } });
    game.screen = "levels";
    const before = clone(game.save);
    game.selectJourneyEpisode(JOURNEY_EPISODES[2]);
    expect(game.journeyPresentation).toMatchObject({ intent: "theme_selection", phase: "overlay" });
    expect(game.journeyPresentation.sceneReveal).not.toBe(true);
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    game.completeJourneyPresentation();
    expect(requests).toHaveLength(1);
    expect(game.save.selectedJourneyEpisode).toBe(2);
    requests[0].resolve(image(requests[0].src));
    await flush();
    expect(game.save.selectedJourneyEpisode).toBe(3);
    expect(game.save.journeyProgress).toEqual(before.journeyProgress);
    expect(game.screen).toBe("home");
    expect(game.journeyPresentation).toBeUndefined();
  });

  it("retains the existing manual milestone claim and never auto-grants it with the scene", () => {
    const { game } = sceneGame({ save: { highestLevel: 12, currentLevel: 12,
      journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [11] } } });
    expect(game.beginPendingHomePresentation()).toBe(false);
    const before = game.save.coins;
    game.openJourneyReward(JOURNEY_MILESTONE_REWARDS.find(reward => reward.level === 10)!);
    expect(game.journeyPresentation.intent).toBe("reward_inspection");
    expect(game.journeyPresentation.sceneReveal).not.toBe(true);
    game.completeJourneyPresentation();
    expect(game.save.coins).toBe(before + 50);
    expect(game.save.journeyProgress.claimedMilestoneLevels).toEqual([10]);
    expect(game.save.selectedJourneyEpisode).toBe(2);
  });
});
