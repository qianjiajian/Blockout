import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COLLECTION_PAGE_SIZE, MASTERPIECE_COLLECTION_CATALOG, findCollectionCatalogItem } from "../src/core/collectionCatalog";
import { LEVELS } from "../src/core/levels";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { PopupEntranceController } from "../src/game/popupEntrance";
import { CountdownWarning } from "../src/game/countdownWarning";
import { SUPPLIED_REVEAL_ART } from "../src/game/artManifest";
import { SUPPLIED_COLLECTION_INTRO_LAYOUT } from "../src/game/suppliedRevealArt";

const NOW = new Date("2026-10-07T04:00:00.000Z").getTime();
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const FIRST_MASTERPIECE = MASTERPIECE_COLLECTION_CATALOG.find((item) => item.unlockLevel === 5)!;
const PAID_MASTERPIECE = MASTERPIECE_COLLECTION_CATALOG[1]!;
const LATER_MASTERPIECE = MASTERPIECE_COLLECTION_CATALOG[25]!;

/** Use the real game flow and persistence methods without a renderer or player storage. */
const collectionGame = (saveOverrides: Record<string, unknown> = {}) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.popupEntrance = new PopupEntranceController();
  game.countdownWarning = new CountdownWarning();
  const defaults = game.sanitizeSave(undefined);
  game.save = game.sanitizeSave({
    ...defaults,
    currentLevel: 6,
    highestLevel: 6,
    rewardedLevels: [1, 2, 3, 4, 5],
    collectionIntroPending: true,
    collectionIntroShown: false,
    // Guidance and successful restoration cases have exactly the new price;
    // insufficient historical balances are covered explicitly below.
    collectionProgress: { ...defaults.collectionProgress, inspiration: 50 },
    ...saveOverrides,
  });
  game.screen = "home";
  game.appVisible = true;
  game.artReady = true;
  game.storageBaselineReady = true;
  game.storageReadAttempts = 0;
  game.collectionAlbumTab = "levels";
  game.collectionAlbumPage = { levels: 0, masterpieces: 2 };
  game.collectionAlbumArt = {};
  game.collectionAlbumArtRequestToken = 0;
  game.collectionAlbumArtworkRequestToken = 0;
  game.collectionAlbumArtwork = { image: vi.fn(() => ({})), failedIndexes: [], dispose: vi.fn() };
  // These transaction fixtures start with decoded decorations, just as their
  // matching atlas above is ready. Loader failure/lifetime has separate tests.
  const painting = Object.fromEntries(Object.entries(SUPPLIED_REVEAL_ART.painting)
    .map(([key, src]) => [key, { src }]));
  game.suppliedRevealArt = {
    imageGroup: vi.fn((group: string) => group === "painting" ? painting : undefined),
    request: vi.fn(), failed: vi.fn(() => false), dispose: vi.fn(),
  };
  game.playSound = vi.fn();
  game.vibrate = vi.fn();
  game.scheduleFrame = vi.fn();
  game.setFormalPageIntent = vi.fn(() => {
    // Deferred artwork requests must see their destination as already visible.
    expect(game.screen).toBe("records");
  });
  game.requestCollectionAlbumArtwork = vi.fn();
  game.beginPendingJourneyPresentation = vi.fn(() => false);
  game.safeOffsets = () => ({ top: 0, bottom: 0 });
  game.viewportTransform = () => ({ scale: 1 });
  game.mainNavigationInteractive = () => false;
  game.formalPageForScreen = () => undefined;
  game.interactionRect = (rect: unknown) => rect;
  game.interactionHit = (point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }) => (
    point.x >= rect.x && point.x <= rect.x + rect.width
    && point.y >= rect.y && point.y <= rect.y + rect.height
  );
  const storage = {
    value: clone(game.save),
    mode: "commit" as "commit" | "reject" | "unknown-after-write",
  };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value);
      return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown-after-write"
      ? { status: "unavailable" }
      : { status: "ok", value: clone(storage.value) }),
  };
  return { game, storage };
};

const openFirstMasterpiece = (game: any) => {
  expect(game.beginCollectionIntro()).toBe(true);
  game.updateCollectionIntro(2);
  game.finishCollectionIntro(true);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("level 5 masterpiece reveal animation", () => {
  const continuePoint = { id: 1, x: 248, y: SUPPLIED_COLLECTION_INTRO_LAYOUT.primary.y + SUPPLIED_COLLECTION_INTRO_LAYOUT.primary.height / 2 };
  const artworkPoint = { id: 1, x: 248, y: 514 };
  const retryTextPoint = { id: 1, x: 248, y: SUPPLIED_COLLECTION_INTRO_LAYOUT.name.y };
  const closePoint = { id: 1, x: 441, y: 258 };

  it("starts the matching masterpiece at age zero without acknowledging or granting it", () => {
    const { game } = collectionGame();
    const before = clone(game.save);
    expect(game.beginCollectionIntro()).toBe(true);
    expect(game.collectionIntro).toEqual({ level: 5, itemId: FIRST_MASTERPIECE.id, age: 0 });
    expect(game.collectionIntroReady()).toBe(false);
    expect(game.requestCollectionAlbumArtwork).toHaveBeenCalledOnce();
    expect(game.save).toEqual(before);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.collectionAlbumDetailId).toBeUndefined();
  });

  it("blocks early continue and underlying clicks until the actual reveal completes", () => {
    const { game } = collectionGame();
    game.beginCollectionIntro();
    game.updateCollectionIntro(1.7);
    expect(game.collectionIntroReady()).toBe(false);
    expect(game.buttonReleaseTargetAt(continuePoint)).toBeUndefined();
    expect(game.buttonReleaseTargetAt({ id: 1, x: 248, y: 980 })).toBeUndefined();
    game.executePointerDown(continuePoint);
    game.executePointerDown({ id: 1, x: 248, y: 980 });
    game.finishCollectionIntro(true);
    expect(game.screen).toBe("home");
    expect(game.save.collectionIntroPending).toBe(true);
    expect(game.save.collectionIntroShown).toBe(false);
    expect(game.host.storageSet).not.toHaveBeenCalled();

    game.updateCollectionIntro(2);
    expect(game.collectionIntro.age).toBe(1.8);
    expect(game.collectionIntroReady()).toBe(true);
    expect(game.buttonReleaseTargetAt(continuePoint)?.key).toBe("collectionIntroPrimary");
    game.executePointerDown(continuePoint);
    expect(game.screen).toBe("records");
    expect(game.collectionAlbumDetailId).toBe(FIRST_MASTERPIECE.id);
    expect(game.collectionRestorationGuide?.itemId).toBe(FIRST_MASTERPIECE.id);
  });

  it("waits for the real masterpiece image and does not skip the animation after a slow load", () => {
    const { game } = collectionGame();
    game.collectionAlbumArtwork.image.mockReturnValue(undefined);
    game.beginCollectionIntro();
    game.updateCollectionIntro(20);
    expect(game.collectionIntro.age).toBe(0);
    expect(game.collectionIntroReady()).toBe(false);
    game.finishCollectionIntro(true);
    expect(game.screen).toBe("home");
    expect(game.save.collectionIntroPending).toBe(true);
    game.collectionAlbumArtwork.image.mockReturnValue({});
    game.updateCollectionIntro(0.5);
    expect(game.collectionIntro.age).toBe(0.5);
    expect(game.collectionIntroReady()).toBe(false);
    game.updateCollectionIntro(2);
    expect(game.collectionIntro.age).toBe(1.8);
    expect(game.collectionIntroReady()).toBe(true);
  });

  it("requests the matching masterpiece atlas, not the current level-collection page", () => {
    const { game } = collectionGame();
    game.collectionAlbumPage.levels = 3;
    game.beginCollectionIntro();
    expect(game.collectionAlbumCurrentAtlasIndexes()).toEqual([game.collectionAlbumAtlasIndex(FIRST_MASTERPIECE)]);
    expect(game.collectionAlbumTab).toBe("levels");
    expect(game.collectionAlbumPage.levels).toBe(3);
  });

  it("does not treat already-loaded unrelated artwork as the new masterpiece image", () => {
    const { game } = collectionGame();
    const targetAtlas = game.collectionAlbumAtlasIndex(FIRST_MASTERPIECE);
    game.collectionAlbumArtwork.image.mockImplementation((index: number) => index === targetAtlas ? undefined : {});
    game.beginCollectionIntro();
    game.updateCollectionIntro(2);
    expect(game.collectionIntro.age).toBe(0);
    expect(game.collectionIntroReady()).toBe(false);
    expect(game.collectionAlbumArtwork.image).toHaveBeenCalledWith(targetAtlas);
  });

  it.each(["background", "different-screen"])("does not advance or offer continue in %s", (state) => {
    const { game } = collectionGame();
    game.beginCollectionIntro();
    game.updateCollectionIntro(0.5);
    if (state === "background") game.appVisible = false;
    else game.screen = "records";
    game.updateCollectionIntro(20);
    expect(game.collectionIntro.age).toBe(0.5);
    expect(game.collectionIntroReady()).toBe(false);
    game.appVisible = true;
    game.screen = "home";
    game.updateCollectionIntro(2);
    expect(game.collectionIntro.age).toBe(1.8);
    expect(game.collectionIntroReady()).toBe(true);
  });

  it("presents the reduced-motion final state without waiting, but still requires the image", () => {
    const { game } = collectionGame({ reducedMotion: true });
    game.collectionAlbumArtwork.image.mockReturnValue(undefined);
    game.beginCollectionIntro();
    game.updateCollectionIntro(0);
    expect(game.collectionIntro.age).toBe(0);
    expect(game.collectionIntroReady()).toBe(false);
    game.collectionAlbumArtwork.image.mockReturnValue({});
    game.updateCollectionIntro(0);
    expect(game.collectionIntro.age).toBe(1.8);
    expect(game.collectionIntroReady()).toBe(true);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });

  it("offers artwork retry only after a failed image and leaves the one-shot state pending", () => {
    const { game } = collectionGame();
    game.collectionAlbumArtwork.image.mockReturnValue(undefined);
    game.beginCollectionIntro();
    expect(game.buttonReleaseTargetAt(artworkPoint)).toBeUndefined();
    game.collectionAlbumArtwork.failedIndexes = [game.collectionAlbumAtlasIndex(FIRST_MASTERPIECE)];
    expect(game.buttonReleaseTargetAt(artworkPoint)?.key).toBe("collectionIntroRetry");
    expect(game.buttonReleaseTargetAt(retryTextPoint)?.key).toBe("collectionIntroRetry");
    game.requestCollectionAlbumArtwork.mockClear();
    game.executePointerDown(retryTextPoint);
    expect(game.requestCollectionAlbumArtwork).toHaveBeenCalledWith(true);
    expect(game.screen).toBe("home");
    expect(game.collectionIntro.age).toBe(0);
    expect(game.save.collectionIntroPending).toBe(true);
    expect(game.save.collectionIntroShown).toBe(false);
  });

  it("allows closing during loading without automatically restoring or entering the collection", () => {
    const { game } = collectionGame();
    game.collectionAlbumArtwork.image.mockReturnValue(undefined);
    game.beginCollectionIntro();
    expect(game.buttonReleaseTargetAt(closePoint)?.key).toBe("collectionIntroLater");
    game.executePointerDown(closePoint);
    expect(game.screen).toBe("home");
    expect(game.collectionIntro).toBeUndefined();
    expect(game.collectionAlbumDetailId).toBeUndefined();
    expect(game.collectionRestorationGuide).toBeUndefined();
    expect(game.save.collectionIntroShown).toBe(true);
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([]);
  });

  it("continues only once and does not replay after returning home or loading the acknowledged save", () => {
    const { game, storage } = collectionGame();
    openFirstMasterpiece(game);
    const after = clone(game.save);
    const writeCount = game.host.storageSet.mock.calls.length;
    game.finishCollectionIntro(true);
    expect(game.save).toEqual(after);
    expect(game.host.storageSet).toHaveBeenCalledTimes(writeCount);
    expect(game.setFormalPageIntent).toHaveBeenCalledOnce();
    game.screen = "home";
    expect(game.beginCollectionIntro()).toBe(false);
    const restored = collectionGame(storage.value).game;
    expect(restored.beginCollectionIntro()).toBe(false);
    expect(restored.save.collectionProgress.restoredMasterpieceIds).toEqual([]);
  });
});

describe("level 5 collection restoration introduction", () => {
  it("opens the masterpiece unlocked at level 5 without restoring it or spending inspiration", () => {
    const { game } = collectionGame();
    const before = clone(game.save);
    expect(FIRST_MASTERPIECE.id).toBe("masterpiece-01");
    openFirstMasterpiece(game);
    expect(game.screen).toBe("records");
    expect(game.collectionAlbumTab).toBe("masterpieces");
    expect(game.collectionAlbumPage.masterpieces).toBe(0);
    expect(game.collectionAlbumDetailId).toBe(FIRST_MASTERPIECE.id);
    expect(findCollectionCatalogItem(game.collectionAlbumDetailId)).toBe(FIRST_MASTERPIECE);
    expect(game.collectionRestorationGuide).toEqual({ itemId: FIRST_MASTERPIECE.id, age: 0 });
    expect(game.save.collectionProgress).toEqual(before.collectionProgress);
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.rewardedLevels).toEqual(before.rewardedLevels);
    expect(game.save.collectionIntroPending).toBe(false);
    expect(game.save.collectionIntroShown).toBe(true);
    expect(game.setFormalPageIntent).toHaveBeenCalledWith("records");
    expect(game.beginCollectionIntro()).toBe(false);
  });

  it("dismisses without opening a collection detail or starting a restoration", () => {
    const { game } = collectionGame();
    game.beginCollectionIntro();
    game.finishCollectionIntro(false);
    expect(game.screen).toBe("home");
    expect(game.collectionAlbumDetailId).toBeUndefined();
    expect(game.collectionRestorationGuide).toBeUndefined();
    expect(game.save.collectionIntroShown).toBe(true);
    expect(game.beginPendingJourneyPresentation).toHaveBeenCalledOnce();
  });

  it.each(["locked", "restored"])('does not start a repair guide for an already %s masterpiece', (state) => {
    const { game } = collectionGame(state === "locked" ? { rewardedLevels: [1, 2, 3, 4] } : {});
    if (state === "restored") game.save.collectionProgress.restoredMasterpieceIds = [FIRST_MASTERPIECE.id];
    openFirstMasterpiece(game);
    expect(game.collectionAlbumDetailId).toBe(FIRST_MASTERPIECE.id);
    expect(game.collectionRestorationGuide).toBeUndefined();
  });

  it("does not reopen the first-clear intro merely because an old save is beyond level 5", () => {
    const { game } = collectionGame({ highestLevel: 40, collectionIntroPending: undefined, collectionIntroShown: undefined });
    expect(game.beginCollectionIntro()).toBe(false);
    expect(game.collectionIntro).toBeUndefined();
  });

  it("sets the pending flag only on first completion of level 5", () => {
    for (const levelId of [4, 5, 6]) {
      const { game } = collectionGame({ currentLevel: levelId, highestLevel: levelId, rewardedLevels: [], collectionIntroPending: false });
      game.model = { level: LEVELS[levelId - 1], snapshot: () => ({ moves: 1, remainingSeconds: 1 }) };
      game.completionMetrics = { moves: 1, elapsedSeconds: 1 };
      const first = game.createPendingSettlement();
      expect(first.candidateSave.collectionIntroPending, `first clear ${levelId}`).toBe(levelId === 5);
      game.save = { ...first.candidateSave, collectionIntroPending: false };
      expect(game.createPendingSettlement().candidateSave.collectionIntroPending).toBe(false);
    }
  });
});

describe("collection restoration guide visibility and lifetime", () => {
  it("waits for its actual detail artwork, app visibility and settled navigation", () => {
    const { game } = collectionGame();
    openFirstMasterpiece(game);
    expect(game.collectionRestorationGuideEligible()).toBe(true);
    const guide = game.collectionRestorationGuide;
    for (const [field, unavailable] of [
      ["appVisible", false], ["screen", "home"], ["navigationTransition", {}],
      ["collectionAlbumDetailId", "level-005"], ["collectionAlbumArt", undefined],
    ] as const) {
      const original = game[field];
      game[field] = unavailable;
      expect(game.collectionRestorationGuideEligible(), field).toBe(false);
      expect(game.collectionRestorationGuide).toBe(guide);
      game[field] = original;
    }
    game.collectionAlbumArtwork.image.mockReturnValue(undefined);
    expect(game.collectionRestorationGuideEligible()).toBe(false);
    game.collectionAlbumArtwork.image.mockReturnValue({});
    expect(game.collectionRestorationGuideEligible()).toBe(true);
    game.collectionRestorationGuide = { itemId: "masterpiece-missing", age: 0 };
    game.collectionAlbumDetailId = "masterpiece-missing";
    expect(game.collectionRestorationGuideEligible()).toBe(false);
  });

  it("clears the guide when the detail is closed, without performing restoration", () => {
    const { game } = collectionGame();
    openFirstMasterpiece(game);
    const close = game.collectionAlbumLayout().detail.close.hit;
    game.executePointerDown({ id: 1, x: close.x + close.width / 2, y: close.y + close.height / 2 });
    expect(game.collectionAlbumDetailId).toBeUndefined();
    expect(game.collectionRestorationGuide).toBeUndefined();
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([]);
  });

  it("clears the guide when album resources are released", () => {
    const { game } = collectionGame();
    openFirstMasterpiece(game);
    game.releaseCollectionAlbumArt();
    expect(game.collectionRestorationGuide).toBeUndefined();
    expect(game.collectionRestorationGuideEligible()).toBe(false);
  });

  it("clears the guide when loading a different level", () => {
    const { game } = collectionGame();
    openFirstMasterpiece(game);
    game.playableClockSlices = { reset: vi.fn() };
    for (const method of ["resetPuzzlePresentation", "releaseFormalPageArt", "releaseDailyChallengeArt", "releaseWinArt",
      "releaseAchievementArt", "cancelDailyTaskRefreshWatch", "releaseDailyTaskArt", "captureInitialGeneratorSpawns"]) {
      game[method] = vi.fn();
    }
    game.loadLevel(6, false);
    expect(game.collectionRestorationGuide).toBeUndefined();
    expect(game.model.level.id).toBe(6);
  });
});

describe("collection restoration acknowledgement safety", () => {
  it("requires the player's repair action and clears its guide only after committed restoration", () => {
    const { game, storage } = collectionGame();
    openFirstMasterpiece(game);
    const inspirationBefore = game.save.collectionProgress.inspiration;
    expect(inspirationBefore).toBe(50);
    expect(FIRST_MASTERPIECE.inspirationCost).toBe(50);
    game.activateCollectionAlbumDetail();
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([FIRST_MASTERPIECE.id]);
    expect(game.save.collectionProgress.inspiration).toBe(inspirationBefore - FIRST_MASTERPIECE.inspirationCost);
    expect(game.save.collectionProgress.inspiration).toBe(0);
    expect(game.collectionIntro).toMatchObject({ itemId: FIRST_MASTERPIECE.id, restoration: true });
    expect(game.collectionRestorationGuide).toBeUndefined();
    expect(storage.value.collectionProgress.restoredMasterpieceIds).toEqual([FIRST_MASTERPIECE.id]);
    const after = clone(game.save);
    game.activateCollectionAlbumDetail();
    expect(game.save).toEqual(after);
  });

  it.each([12, 49])("does not show the repair guide or purchase with %s inspiration, and allows closing the detail", (inspiration) => {
    const { game, storage } = collectionGame({ collectionProgress: { inspiration } });
    // The level-5 blueprint introduction still opens its detail. It does not
    // grant a free restoration or show an unaffordable purchase hand.
    openFirstMasterpiece(game);
    expect(game.collectionAlbumDetailId).toBe(FIRST_MASTERPIECE.id);
    expect(game.collectionRestorationGuideEligible()).toBe(false);
    expect(game.collectionIntro).toBeUndefined();
    const before = clone(game.save);
    const persisted = clone(storage.value);
    const writes = game.host.storageSet.mock.calls.length;
    game.playSound.mockClear();
    game.vibrate.mockClear();
    game.requestCollectionAlbumArtwork.mockClear();

    const action = game.collectionAlbumLayout().detail.primaryAction.hit;
    const actionPoint = { id: 1, x: action.x + action.width / 2, y: action.y + action.height / 2 };
    game.executePointerDown(actionPoint);
    game.executePointerDown(actionPoint);
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(persisted);
    expect(game.save.collectionProgress.inspiration).toBe(inspiration);
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([]);
    expect(game.pendingCollectionRestoration).toBeUndefined();
    expect(game.collectionRestorationGuideEligible()).toBe(false);
    expect(game.collectionIntro).toBeUndefined();
    expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
    expect(game.playSound).toHaveBeenCalledWith("blocked");
    expect(game.playSound).not.toHaveBeenCalledWith("reward");
    expect(game.vibrate).not.toHaveBeenCalled();
    expect(game.requestCollectionAlbumArtwork).not.toHaveBeenCalled();

    const close = game.collectionAlbumLayout().detail.close.hit;
    game.executePointerDown({ id: 1, x: close.x + close.width / 2, y: close.y + close.height / 2 });
    expect(game.screen).toBe("records");
    expect(game.collectionAlbumDetailId).toBeUndefined();
    expect(game.collectionRestorationGuide).toBeUndefined();
    expect(game.collectionAlbumFeedback).toBeUndefined();
    expect(game.collectionIntro).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(storage.value).toEqual(persisted);
    expect(game.host.storageSet).toHaveBeenCalledTimes(writes);
  });

  it.each(["reject", "unknown-after-write"] as const)("keeps the guide and offers a safe retry after %s", (mode) => {
    const { game, storage } = collectionGame();
    openFirstMasterpiece(game);
    const before = clone(game.save);
    storage.mode = mode;
    game.activateCollectionAlbumDetail();
    expect(game.collectionRestorationGuide?.itemId).toBe(FIRST_MASTERPIECE.id);
    expect(game.collectionRestorationGuideEligible()).toBe(true);
    expect(game.save).toEqual(before);
    const pending = game.pendingCollectionRestoration;
    if (mode === "unknown-after-write") {
      expect(pending?.id).toBe(FIRST_MASTERPIECE.id);
      const close = game.collectionAlbumLayout().detail.close.hit;
      game.executePointerDown({ id: 1, x: close.x + close.width / 2, y: close.y + close.height / 2 });
      expect(game.collectionAlbumDetailId).toBe(FIRST_MASTERPIECE.id);
      expect(game.collectionRestorationGuide).toBeDefined();
    }
    storage.mode = "commit";
    game.activateCollectionAlbumDetail();
    if (pending) expect(game.save).toBe(pending.candidateSave);
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([FIRST_MASTERPIECE.id]);
    expect(game.collectionRestorationGuide).toBeUndefined();
    expect(game.pendingCollectionRestoration).toBeUndefined();
  });
});

describe("manual masterpiece collection reveal", () => {
  const manualCollection = (item = PAID_MASTERPIECE, overrides: Record<string, unknown> = {}) => {
    const fixture = collectionGame({
      currentLevel: item.unlockLevel + 1,
      highestLevel: item.unlockLevel + 1,
      rewardedLevels: Array.from({ length: item.unlockLevel }, (_, index) => index + 1),
      ...overrides,
    });
    const { game, storage } = fixture;
    game.screen = "records";
    game.collectionAlbumTab = "masterpieces";
    game.collectionAlbumPage.masterpieces = Math.floor((item.catalogNumber - 1) / COLLECTION_PAGE_SIZE);
    game.collectionScrollOffset = 37;
    game.collectionAlbumDetailId = item.id;
    game.save.collectionProgress.inspiration = 1000;
    storage.value = clone(game.save);
    return fixture;
  };

  it.each([PAID_MASTERPIECE, LATER_MASTERPIECE])("reveals the committed $id and charges its price only once", (item) => {
    const { game, storage } = manualCollection(item);
    const before = clone(game.save);
    game.activateCollectionAlbumDetail();
    expect(game.collectionIntro).toEqual({ level: item.unlockLevel, itemId: item.id, age: 0, restoration: true });
    expect(game.save.collectionProgress.inspiration).toBe(1000 - item.inspirationCost);
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([item.id]);
    expect(storage.value.collectionProgress).toEqual(game.save.collectionProgress);
    expect(game.save.coins).toBe(before.coins);
    expect(game.save.rewardedLevels).toEqual(before.rewardedLevels);
    expect(game.save.collectionIntroPending).toBe(before.collectionIntroPending);
    expect(game.save.collectionIntroShown).toBe(before.collectionIntroShown);
    expect(game.collectionAlbumCurrentAtlasIndexes()).toEqual([game.collectionAlbumAtlasIndex(item)]);
    expect(game.requestCollectionAlbumArtwork).toHaveBeenCalledOnce();
    expect(game.host.storageSet).toHaveBeenCalledOnce();

    game.updateCollectionIntro(0.75);
    const intro = game.collectionIntro;
    game.activateCollectionAlbumDetail();
    expect(game.collectionIntro).toBe(intro);
    expect(game.collectionIntro.age).toBe(0.75);
    expect(game.save.collectionProgress.inspiration).toBe(1000 - item.inspirationCost);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
  });

  it.each(["reject", "unknown-after-write"] as const)("does not reveal before confirmed persistence after %s", (mode) => {
    const { game, storage } = manualCollection();
    const before = clone(game.save);
    storage.mode = mode;
    game.activateCollectionAlbumDetail();
    expect(game.collectionIntro).toBeUndefined();
    expect(game.save).toEqual(before);
    expect(game.requestCollectionAlbumArtwork).not.toHaveBeenCalled();
    const pending = game.pendingCollectionRestoration;
    if (mode === "unknown-after-write") expect(pending?.id).toBe(PAID_MASTERPIECE.id);
    storage.mode = "commit";
    game.activateCollectionAlbumDetail();
    if (pending) expect(game.save).toBe(pending.candidateSave);
    expect(game.pendingCollectionRestoration).toBeUndefined();
    expect(game.save.collectionProgress.inspiration).toBe(1000 - PAID_MASTERPIECE.inspirationCost);
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([PAID_MASTERPIECE.id]);
    expect(game.collectionIntro).toEqual({
      level: PAID_MASTERPIECE.unlockLevel, itemId: PAID_MASTERPIECE.id, age: 0, restoration: true,
    });
  });

  it("does not reveal or write for insufficient inspiration, locked blueprints or already collected works", () => {
    for (const status of ["insufficient", "locked", "collected"]) {
      const { game } = manualCollection();
      if (status === "insufficient") game.save.collectionProgress.inspiration = PAID_MASTERPIECE.inspirationCost - 1;
      if (status === "locked") game.save.rewardedLevels = [];
      if (status === "collected") game.save.collectionProgress.restoredMasterpieceIds = [PAID_MASTERPIECE.id];
      const before = clone(game.save);
      game.activateCollectionAlbumDetail();
      expect(game.collectionIntro, status).toBeUndefined();
      expect(game.save, status).toEqual(before);
      expect(game.host.storageSet, status).not.toHaveBeenCalled();
    }
  });

  it("waits for the matching picture, pauses in background or off-page, then completes on records", () => {
    const { game } = manualCollection(LATER_MASTERPIECE);
    const targetAtlas = game.collectionAlbumAtlasIndex(LATER_MASTERPIECE);
    game.collectionAlbumArtwork.image.mockImplementation((index: number) => index === targetAtlas ? undefined : {});
    game.activateCollectionAlbumDetail();
    game.updateCollectionIntro(20);
    expect(game.collectionIntro.age).toBe(0);
    expect(game.collectionIntroReady()).toBe(false);
    game.collectionAlbumArtwork.image.mockReturnValue({});
    game.updateCollectionIntro(0.5);
    expect(game.collectionIntro.age).toBe(0.5);
    game.appVisible = false;
    game.updateCollectionIntro(20);
    expect(game.collectionIntro.age).toBe(0.5);
    expect(game.collectionIntroReady()).toBe(false);
    game.appVisible = true;
    game.screen = "home";
    game.updateCollectionIntro(20);
    expect(game.collectionIntro.age).toBe(0.5);
    expect(game.collectionIntroReady()).toBe(false);
    game.screen = "records";
    game.updateCollectionIntro(2);
    expect(game.collectionIntro.age).toBe(1.8);
    expect(game.collectionIntroReady()).toBe(true);
  });

  it("blocks premature continue and underlying collection interactions during the reveal", () => {
    const { game } = manualCollection();
    game.activateCollectionAlbumDetail();
    const continuePoint = { id: 1, x: 248, y: SUPPLIED_COLLECTION_INTRO_LAYOUT.primary.y + SUPPLIED_COLLECTION_INTRO_LAYOUT.primary.height / 2 };
    expect(game.buttonReleaseTargetAt(continuePoint)).toBeUndefined();
    game.executePointerDown(continuePoint);
    game.finishCollectionIntro(true);
    expect(game.collectionIntro).toBeDefined();
    expect(game.collectionAlbumDetailId).toBe(PAID_MASTERPIECE.id);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
    game.updateCollectionIntro(2);
    expect(game.buttonReleaseTargetAt(continuePoint)?.key).toBe("collectionIntroPrimary");
  });

  it.each([true, false])("dismisses with continue=%s into the same collected detail without another save", (continueAction) => {
    const { game } = manualCollection(LATER_MASTERPIECE);
    game.activateCollectionAlbumDetail();
    game.updateCollectionIntro(2);
    const saved = clone(game.save);
    const page = clone(game.collectionAlbumPage);
    game.requestCollectionAlbumArtwork.mockClear();
    game.finishCollectionIntro(continueAction);
    expect(game.collectionIntro).toBeUndefined();
    expect(game.screen).toBe("records");
    expect(game.collectionAlbumTab).toBe("masterpieces");
    expect(game.collectionAlbumPage).toEqual(page);
    expect(game.collectionScrollOffset).toBe(37);
    expect(game.collectionAlbumDetailId).toBe(LATER_MASTERPIECE.id);
    expect(game.collectionRestorationGuide).toBeUndefined();
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
    expect(game.setFormalPageIntent).not.toHaveBeenCalled();
    expect(game.beginPendingJourneyPresentation).not.toHaveBeenCalled();
    expect(game.requestCollectionAlbumArtwork).toHaveBeenCalledOnce();
    game.activateCollectionAlbumDetail();
    expect(game.collectionIntro).toBeUndefined();
    expect(game.host.storageSet).toHaveBeenCalledOnce();
  });

  it("allows closing while its picture is unavailable and preserves the already committed collection", () => {
    const { game } = manualCollection();
    game.collectionAlbumArtwork.image.mockReturnValue(undefined);
    game.activateCollectionAlbumDetail();
    const saved = clone(game.save);
    game.executePointerDown({ id: 1, x: 441, y: 258 });
    expect(game.collectionIntro).toBeUndefined();
    expect(game.screen).toBe("records");
    expect(game.collectionAlbumDetailId).toBe(PAID_MASTERPIECE.id);
    expect(game.save).toEqual(saved);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
  });

  it("uses the final state for reduced motion only when its real image is ready", () => {
    const { game } = manualCollection(PAID_MASTERPIECE, { reducedMotion: true });
    game.collectionAlbumArtwork.image.mockReturnValue(undefined);
    game.activateCollectionAlbumDetail();
    game.updateCollectionIntro(0);
    expect(game.collectionIntroReady()).toBe(false);
    game.collectionAlbumArtwork.image.mockReturnValue({});
    game.updateCollectionIntro(0);
    expect(game.collectionIntro.age).toBe(1.8);
    expect(game.collectionIntroReady()).toBe(true);
    expect(game.host.storageSet).toHaveBeenCalledOnce();
  });

  it("clears the transient reveal when album resources are released and does not recreate it after reload", () => {
    const { game, storage } = manualCollection();
    game.activateCollectionAlbumDetail();
    game.releaseCollectionAlbumArt();
    expect(game.collectionIntro).toBeUndefined();
    expect(game.save.collectionProgress.restoredMasterpieceIds).toEqual([PAID_MASTERPIECE.id]);
    const reloaded = collectionGame(storage.value).game;
    reloaded.screen = "records";
    reloaded.collectionAlbumDetailId = PAID_MASTERPIECE.id;
    reloaded.activateCollectionAlbumDetail();
    expect(reloaded.collectionIntro).toBeUndefined();
    expect(reloaded.host.storageSet).not.toHaveBeenCalled();
  });
});
