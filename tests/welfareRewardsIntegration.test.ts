import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MASTERPIECE_COLLECTION_CATALOG } from "../src/core/collectionCatalog";
import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { confirmWelfareAdCompletion, prepareWelfareReward } from "../src/core/welfareRewards";
import { welfareStationLayout } from "../src/game/welfareStationUi";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { CountdownWarning } from "../src/game/countdownWarning";
import { PopupEntranceController } from "../src/game/popupEntrance";
import { LeagueScroll } from "../src/game/leagueScroll";
import type { RewardedAdResult, RewardedAdStatus } from "../src/platform/Host";

const NOW = Date.parse("2026-10-10T04:00:00Z");
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type Stage = "prepare" | "receipt" | "reward" | "cancel";
type Failure = "reject" | "unknown-written";

/** Real Game transactions, sanitizer, candidate cloning and welfare methods.
 * Only native ad callbacks, storage and nontransactional rendering are simulated. */
function welfareGame(options: { saved?: unknown; overrides?: Record<string, unknown> } = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.popupEntrance = new PopupEntranceController();
  game.countdownWarning = new CountdownWarning();
  game.playableClockSlices = { reset: vi.fn() };
  const defaults = game.sanitizeSave(undefined);
  game.save = game.sanitizeSave(options.saved ?? {
    ...defaults, currentLevel: 11, highestLevel: 11, rewardedLevels: Array.from({ length: 10 }, (_, i) => i + 1),
    coins: 200, collectionIntroShown: true, collectionIntroPending: false,
    featureGuideProgress: { version: 1, pending: [], seen: ["leaderboard", "supply"] },
    boosters: { time: 3, rocket: 3, pulse: 3 },
    collectionProgress: { ...defaults.collectionProgress, inspiration: 45 },
    lifeState: { lives: 3, nextLifeAtMs: NOW + 1_800_000, unlimitedLivesUntilMs: 0 },
    ...options.overrides,
  });
  game.screen = "supply"; game.appVisible = true; game.artReady = true;
  game.model = new PuzzleModel(LEVELS[10]);
  game.storageBaselineReady = true; game.storageReadAttempts = 0;
  game.welfareSelectedBooster = "rocket"; game.welfareScroll = 0;
  game.formalPageArt = { screen: "supply" }; game.formalPageArtCache = {};
  game.collectionAlbumTab = "levels"; game.collectionAlbumPage = { levels: 0, masterpieces: 0 };
  game.collectionScrollOffset = 0;
  for (const method of ["playSound", "vibrate", "scheduleFrame", "syncMusic", "emitBurst",
    "beginHomeCoinFlight", "beginInspirationFlight", "setFormalPageIntent", "requestCollectionAlbumArtwork",
    "releaseFormalPageArt", "cancelLifeRefreshWatch", "cancelDailyTaskRefreshWatch", "cancelLeagueHomeRefreshWatch"])
    game[method] = vi.fn();
  game.safeOffsets = () => ({ top: 0, bottom: 0 });
  game.viewportTransform = () => ({ scale: 1 });
  game.homeCoinTarget = () => ({ x: 120, y: 50 });
  game.inspirationTarget = () => ({ x: 240, y: 50 });
  const storage: { value: any; fault?: { stage: Stage; mode: Failure }; readUnavailable: boolean;
    writes: { stage?: Stage; candidate: any; snapshot: any }[] } = {
      value: clone(game.save), readUnavailable: false, writes: [],
    };
  const ad = { available: true, requests: [] as { id: string; resolve: (result: RewardedAdResult) => void;
    reject: (error: Error) => void }[] };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      const stage = game.pendingWelfareSave?.stage as Stage | undefined;
      storage.writes.push({ stage, candidate: value, snapshot: clone(value) });
      const fault = stage === storage.fault?.stage ? storage.fault?.mode : undefined;
      storage.readUnavailable = fault === "unknown-written";
      if (fault !== "reject") storage.value = clone(value);
      return !fault;
    }),
    storageRead: vi.fn(() => storage.readUnavailable ? { status: "unavailable" }
      : { status: "ok", value: clone(storage.value) }),
    isRewardedAdAvailable: vi.fn(() => ad.available),
    showRewardedAd: vi.fn((id: string) => new Promise<RewardedAdResult>((resolve, reject) => ad.requests.push({ id, resolve, reject }))),
    scheduleTimeout: vi.fn(() => 1), cancelTimeout: vi.fn(),
  };
  return { game, storage, ad };
}

async function flushAd() { for (let i = 0; i < 8; i += 1) await Promise.resolve(); }
async function completeAd(fixture: ReturnType<typeof welfareGame>, status: RewardedAdStatus = "completed", id?: string) {
  const request = fixture.ad.requests[fixture.ad.requests.length - 1];
  expect(request).toBeDefined(); request.resolve({ status, requestId: id ?? request.id }); await flushAd();
}
const goldCount = (game: any): number => game.playSound.mock.calls.filter(([kind]: [string]) => kind === "gold").length;
const economic = (save: any) => ({ coins: save.coins, boosters: clone(save.boosters), lives: clone(save.lifeState),
  collection: clone(save.collectionProgress), rewardedLevels: [...save.rewardedLevels], bestStars: clone(save.bestStars) });

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("welfare Game prepare / completion receipt / reward transactions", () => {
  it("accepts an inspiration ad during the preceding coin flight and still locks concurrent requests", async () => {
    const fixture = welfareGame(), { game, storage, ad } = fixture;
    game.leagueScroll = new LeagueScroll();
    game.beginHomeCoinFlight = ColorEscapeGame.prototype["beginHomeCoinFlight"];
    game.beginInspirationFlight = ColorEscapeGame.prototype["beginInspirationFlight"];
    const press = (kind: string) => {
      const target = game.welfareTargets().find(([key]: [string]) => key === `welfare.claim.${kind}`);
      expect(target).toBeDefined();
      const rect = target[1], point = { id: 9, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      expect(game.buttonReleaseTargetAt(point)?.key).toBe(`welfare.claim.${kind}`);
      game.handleDown(point); game.handleUp(point);
    };
    press("coins"); await completeAd(fixture); game.presentWelfareReward();
    expect(game.homeCoinFlight).toMatchObject({ kind: "coins", age: 0 });
    expect(game.save.coins).toBe(300);
    press("inspiration");
    expect(ad.requests).toHaveLength(2);
    expect(game.homeCoinFlight).toMatchObject({ kind: "coins", age: 0 });
    const home = game.mainNavigationRect(2);
    const homePoint = { id: 10, x: home.x + home.width / 2, y: home.y + home.height / 2 };
    expect(game.buttonReleaseTargetAt(homePoint)).toBeUndefined();
    game.handleDown(homePoint); game.handleUp(homePoint);
    expect(game.screen).toBe("supply");
    game.claimWelfareReward("coins"); expect(ad.requests).toHaveLength(2);
    await completeAd(fixture); game.presentWelfareReward();
    expect(game.homeCoinFlights).toMatchObject([
      { kind: "coins", age: 0 }, { kind: "inspiration", age: 0, reward: 50, startCoins: 45, endCoins: 95 },
    ]);
    expect(game.save.collectionProgress.inspiration).toBe(95);
    expect(game.save.coins).toBe(300);
    expect(storage.writes).toHaveLength(6);
    expect(goldCount(game)).toBe(2);
    const before = game.welfareView().inspiration;
    expect(before).toBe(45);
    game.save.collectionProgress.inspiration -= 50;
    expect(game.welfareView().inspiration).toBe(Math.max(0, before - 50));
    game.updateHomeCoinFlight(100);
    expect(game.welfareView().inspiration).toBe(45);
  });

  it("persists the three stages and presents one committed reward only", async () => {
    const fixture = welfareGame(), { game, storage, ad } = fixture, before = clone(game.save);
    game.claimWelfareReward("coins");
    expect(storage.writes.map(row => row.stage)).toEqual(["prepare"]);
    expect(game.save.welfareRewards.pending.phase).toBe("watching");
    expect(ad.requests).toHaveLength(1); expect(game.save.coins).toBe(before.coins); expect(goldCount(game)).toBe(0);
    vi.setSystemTime(NOW + 15_000); await completeAd(fixture);
    expect(storage.writes.map(row => row.stage)).toEqual(["prepare", "receipt", "reward"]);
    const receipt = storage.writes[1].snapshot, reward = storage.writes[2].snapshot;
    expect(receipt.welfareRewards.pending.phase).toBe("completed"); expect(receipt.coins).toBe(before.coins);
    expect(receipt.welfareRewards.claimed.coins).toBe(0);
    expect(reward.coins).toBe(before.coins + 100); expect(reward.welfareRewards.claimed.coins).toBe(1);
    expect(reward.welfareRewards.cooldownUntilMs).toBe(0);
    expect(game.save).toEqual(reward); expect(storage.value).toEqual(reward);
    expect(game.pendingWelfareSave).toBeUndefined(); expect(game.welfareAdRequestId).toBeUndefined();
    game.presentWelfareReward(); game.presentWelfareReward();
    expect(goldCount(game)).toBe(1);
    expect(game.save.collectionProgress).toEqual(before.collectionProgress);
  });

  it.each(["cancelled", "unavailable", "error"] as const)("does not award or consume quota when the host reports %s", async status => {
    const fixture = welfareGame(), { game, storage } = fixture, before = economic(game.save);
    game.claimWelfareReward("inspiration"); await completeAd(fixture, status);
    expect(economic(game.save)).toEqual(before); expect(game.save.welfareRewards.pending).toBeUndefined();
    expect(game.save.welfareRewards.claimed.inspiration).toBe(0); expect(game.save.welfareRewards.cooldownUntilMs).toBe(0);
    expect(storage.writes.some(row => row.stage === "reward")).toBe(false); expect(goldCount(game)).toBe(0);
  });

  it("does not write or request an ad when configuration is unavailable or the entry is locked", () => {
    const fixture = welfareGame(); fixture.ad.available = false;
    fixture.game.claimWelfareReward("coins");
    expect(fixture.storage.writes).toHaveLength(0); expect(fixture.ad.requests).toHaveLength(0);
    const locked = welfareGame({ overrides: { highestLevel: 8, currentLevel: 8, rewardedLevels: [1, 2, 3, 4, 5, 6, 7] } });
    locked.game.claimWelfareReward("coins"); expect(locked.ad.requests).toHaveLength(0); expect(locked.storage.writes).toHaveLength(0);
  });

  it("blocks duplicate requests and unrelated saving while an ad is outstanding", async () => {
    const fixture = welfareGame(), { game, storage, ad } = fixture;
    game.claimWelfareReward("coins"); game.claimWelfareReward("coins"); game.claimWelfareReward("inspiration");
    expect(ad.requests).toHaveLength(1); expect(storage.writes).toHaveLength(1);
    const unrelated = game.cloneSave(game.save); unrelated.coins += 1000;
    expect(game.persist(unrelated)).toBe(false); expect(storage.writes).toHaveLength(1);
    await completeAd(fixture); const saved = clone(game.save), writes = storage.writes.length;
    ad.requests[0].resolve({ status: "completed", requestId: ad.requests[0].id }); await flushAd();
    game.recoverWelfareReward(); game.presentWelfareReward();
    expect(game.save).toEqual(saved); expect(storage.writes).toHaveLength(writes); expect(goldCount(game)).toBe(1);
  });

  it.each([
    ["prepare", "reject"], ["prepare", "unknown-written"],
    ["receipt", "reject"], ["receipt", "unknown-written"],
    ["reward", "reject"], ["reward", "unknown-written"],
  ] as const)("retains and retries the identical %s candidate after %s", async (stage, mode) => {
    const fixture = welfareGame(), { game, storage, ad } = fixture, startingCoins = game.save.coins;
    storage.fault = { stage, mode }; game.claimWelfareReward("coins");
    if (stage !== "prepare") { vi.setSystemTime(NOW + 10_000); await completeAd(fixture); }
    const pending = game.pendingWelfareSave;
    expect(pending?.stage).toBe(stage); expect(game.save.coins).toBe(startingCoins); expect(goldCount(game)).toBe(0);
    const original = pending.candidateSave, originalJson = clone(original), priorAds = ad.requests.length;
    game.claimWelfareReward("inspiration"); expect(ad.requests).toHaveLength(priorAds);
    expect(game.pendingWelfareSave.candidateSave).toBe(original);
    storage.fault = undefined; storage.readUnavailable = false; vi.setSystemTime(NOW + 600_000);
    game.finishWelfareSave(); await flushAd();
    expect(storage.writes.filter(row => row.stage === stage).every(row => row.candidate === original)).toBe(true);
    expect(original).toEqual(originalJson);
    if (stage === "prepare") { expect(ad.requests).toHaveLength(1); await completeAd(fixture); }
    else expect(ad.requests).toHaveLength(1);
    expect(game.pendingWelfareSave).toBeUndefined(); expect(game.save.coins).toBe(startingCoins + 100);
    expect(game.save.welfareRewards.claimed.coins).toBe(1);
    expect(game.save.welfareRewards.cooldownUntilMs).toBe(0);
    game.presentWelfareReward(); expect(goldCount(game)).toBe(1);
  });

  it("restores a completed receipt after reload without replaying the ad", () => {
    const first = welfareGame(), state = prepareWelfareReward(first.game.save.welfareRewards, first.game.welfareAccount(),
      { id: "durable-completion", kind: "coins", nowMs: NOW });
    const saved = clone(first.game.save);
    saved.welfareRewards = confirmWelfareAdCompletion(state.state, "durable-completion", NOW + 15_000).state;
    vi.setSystemTime(NOW + 300_000);
    const reloaded = welfareGame({ saved }); reloaded.game.recoverWelfareReward();
    expect(reloaded.ad.requests).toHaveLength(0); expect(reloaded.game.save.coins).toBe(saved.coins + 100);
    expect(reloaded.game.save.welfareRewards.completedRequestIds).toContain("durable-completion");
    expect(reloaded.game.save.welfareRewards.cooldownUntilMs).toBe(0);
    const writes = reloaded.storage.writes.length; reloaded.game.recoverWelfareReward();
    expect(reloaded.storage.writes).toHaveLength(writes); expect(reloaded.game.save.coins).toBe(saved.coins + 100);
  });

  it("clears an unproved watching request after reload without awarding it", () => {
    const first = welfareGame(); first.game.claimWelfareReward("coins");
    const saved = clone(first.storage.value), reloaded = welfareGame({ saved });
    reloaded.game.recoverWelfareReward();
    expect(reloaded.ad.requests).toHaveLength(0); expect(economic(reloaded.game.save)).toEqual(economic(saved));
    expect(reloaded.game.save.welfareRewards.pending).toBeUndefined(); expect(reloaded.game.save.welfareRewards.claimed.coins).toBe(0);
    expect(goldCount(reloaded.game)).toBe(0);
  });

  it.each(["receipt", "reward"] as const)("does not duplicate a landed but unacknowledged %s after reload", async stage => {
    const fixture = welfareGame(); fixture.storage.fault = { stage, mode: "unknown-written" };
    fixture.game.claimWelfareReward("coins"); vi.setSystemTime(NOW + 10_000); await completeAd(fixture);
    expect(fixture.game.pendingWelfareSave?.stage).toBe(stage);
    const saved = clone(fixture.storage.value), reloaded = welfareGame({ saved });
    reloaded.game.recoverWelfareReward(); reloaded.game.recoverWelfareReward();
    expect(reloaded.ad.requests).toHaveLength(0); expect(reloaded.game.save.coins).toBe(300);
    expect(reloaded.game.save.welfareRewards.claimed.coins).toBe(1);
    expect(reloaded.game.save.welfareRewards.completedRequestIds).toHaveLength(1);
    expect(reloaded.storage.writes).toHaveLength(stage === "receipt" ? 1 : 0);
  });

  it("settles a cross-midnight ad in the original batch without a cooldown", async () => {
    const midnight = Date.parse("2026-10-10T16:00:00Z");
    vi.setSystemTime(midnight - 5000); const fixture = welfareGame();
    fixture.game.claimWelfareReward("coins");
    expect(fixture.game.save.welfareRewards.pending.dayKey).toBe("2026-10-10");
    vi.setSystemTime(midnight + 10_000); await completeAd(fixture);
    expect(fixture.game.save.coins).toBe(300); expect(fixture.game.save.welfareRewards.dayKey).toBe("2026-10-11");
    expect(fixture.game.save.welfareRewards.claimed.coins).toBe(0);
    expect(fixture.game.save.welfareRewards.cooldownUntilMs).toBe(0);
  });

  it("keeps the promised life when natural recovery reaches five during the ad", async () => {
    const fixture = welfareGame({ overrides: { lifeState: { lives: 4, nextLifeAtMs: NOW + 5000, unlimitedLivesUntilMs: 0 } } });
    fixture.game.claimWelfareReward("lives"); vi.setSystemTime(NOW + 10_000); await completeAd(fixture);
    expect(fixture.game.save.lifeState.lives).toBe(6); expect(fixture.game.save.welfareRewards.claimed.lives).toBe(1);
  });

  it("rewards full lives from five through eight immediately, preserving the daily limit after reload", async () => {
    const fixture = welfareGame({ overrides: { lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 } } });
    const { game, storage, ad } = fixture;
    expect(game.welfareView().cards.lives.state).toBe("available");
    expect(game.welfareView().livesLabel).toBe("5/5");
    game.claimWelfareReward("lives");
    expect(ad.requests).toHaveLength(1); expect(game.save.lifeState.lives).toBe(5);
    await completeAd(fixture);
    expect(game.save.lifeState).toEqual({ lives: 6, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
    expect(game.welfareView().livesLabel).toBe("6/5");
    expect(game.save.welfareRewards.claimed.lives).toBe(1);
    expect(game.save.welfareRewards.cooldownUntilMs).toBe(0);
    expect(game.welfareView().cards.lives.state).toBe("available");
    expect(game.welfareView().cards.coins.state).toBe("available");
    game.claimWelfareReward("lives"); expect(ad.requests).toHaveLength(2);
    await completeAd(fixture);
    expect(game.save.lifeState).toEqual({ lives: 7, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
    expect(game.save.welfareRewards.claimed.lives).toBe(2);
    expect(game.welfareView().cards.lives).toMatchObject({ state: "available", remaining: 1 });
    game.claimWelfareReward("lives"); expect(ad.requests).toHaveLength(3);
    await completeAd(fixture);
    expect(game.save.lifeState).toEqual({ lives: 8, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 });
    expect(game.save.welfareRewards.claimed.lives).toBe(3);
    expect(storage.writes.map(row => row.stage)).toEqual(Array.from({ length: 3 }, () => ["prepare", "receipt", "reward"]).flat());
    expect(storage.value.lifeState.lives).toBe(8);
    expect(Date.now()).toBe(NOW);
    expect(game.welfareView().cards.lives.state).toBe("limit");
    game.claimWelfareReward("lives");
    expect(ad.requests).toHaveLength(3); expect(storage.writes).toHaveLength(9);

    const reloaded = welfareGame({ saved: storage.value });
    reloaded.game.recoverWelfareReward();
    expect(reloaded.game.save.lifeState.lives).toBe(8);
    expect(reloaded.game.welfareView().livesLabel).toBe("8/5");
    expect(reloaded.game.welfareView().cards.lives).toMatchObject({ state: "limit", remaining: 0 });
    reloaded.game.claimWelfareReward("lives");
    expect(reloaded.ad.requests).toHaveLength(0); expect(reloaded.storage.writes).toHaveLength(0);
    expect(reloaded.game.save.lifeState.lives).toBe(8);
  });

  it.each(["inspiration", "coins", "lives", "booster"] as const)("ignores a legacy future cooldown when claiming %s", async kind => {
    const previous = welfareGame(), saved = clone(previous.game.save);
    saved.welfareRewards.cooldownUntilMs = NOW + 86_400_000;
    const fixture = welfareGame({ saved }), { game, ad, storage } = fixture;
    for (const card of ["inspiration", "coins", "lives", "booster"] as const) {
      expect(game.welfareView().cards[card]).toMatchObject({ state: "available", cooldownSeconds: 0 });
    }
    game.claimWelfareReward(kind);
    expect(ad.requests).toHaveLength(1);
    await completeAd(fixture);
    expect(game.save.welfareRewards.claimed[kind]).toBe(1);
    expect(game.save.welfareRewards.cooldownUntilMs).toBe(0);
    expect(storage.writes.map(row => row.stage)).toEqual(["prepare", "receipt", "reward"]);
    for (const card of ["inspiration", "coins", "lives", "booster"] as const) {
      expect(game.welfareView().cards[card].state).toBe("available");
    }
    expect(Date.now()).toBe(NOW);
  });

  it.each([5, 7])("shows unavailable rather than full for %i lives without an ad configuration", lives => {
    const fixture = welfareGame({ overrides: { lifeState: { lives, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 } } });
    fixture.ad.available = false;
    expect(fixture.game.welfareView().cards.lives.state).toBe("unavailable");
    fixture.game.claimWelfareReward("lives");
    expect(fixture.game.save.lifeState.lives).toBe(lives);
    expect(fixture.ad.requests).toHaveLength(0); expect(fixture.storage.writes).toHaveLength(0);
  });

  it("keeps five full lives and unspent quota when the viewer closes early", async () => {
    const fixture = welfareGame({ overrides: { lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 } } });
    fixture.game.claimWelfareReward("lives");
    expect(fixture.ad.requests).toHaveLength(1);
    await completeAd(fixture, "cancelled");
    expect(fixture.game.save.lifeState.lives).toBe(5);
    expect(fixture.game.save.welfareRewards.claimed.lives).toBe(0);
    expect(fixture.game.save.welfareRewards.cooldownUntilMs).toBe(0);
    expect(fixture.storage.writes.map(row => row.stage)).toEqual(["prepare", "cancel"]);
  });

  it("treats a rejected host promise or a mismatched request identity as no completion", async () => {
    for (const failure of ["reject", "wrong-id"]) {
      const fixture = welfareGame(), before = economic(fixture.game.save); fixture.game.claimWelfareReward("coins");
      if (failure === "reject") { fixture.ad.requests[0].reject(new Error("native load failed")); await flushAd(); }
      else await completeAd(fixture, "completed", "another-request");
      expect(economic(fixture.game.save)).toEqual(before); expect(fixture.game.save.welfareRewards.pending).toBeUndefined();
      expect(fixture.game.save.welfareRewards.claimed.coins).toBe(0); expect(goldCount(fixture.game)).toBe(0);
    }
  });

  it("locks the chosen booster before watching, even if the visible selection changes", async () => {
    const fixture = welfareGame(), { game } = fixture, before = clone(game.save.boosters);
    game.welfareSelectedBooster = "time"; game.claimWelfareReward("booster");
    expect(game.save.welfareRewards.pending.boosterKind).toBe("time");
    game.welfareSelectedBooster = "pulse"; await completeAd(fixture);
    expect(game.save.boosters).toEqual({ ...before, time: before.time + 1 });
    expect(game.save.welfareRewards.claimed.booster).toBe(1);
  });

  it("shares ten claims across all booster choices and rejects the eleventh without another ad", async () => {
    const fixture = welfareGame(), { game, storage, ad } = fixture;
    const before = economic(game.save);
    expect(game.welfareView().cards.booster.remaining).toBe(10);
    for (let index = 0; index < 10; index += 1) {
      game.welfareSelectedBooster = (["time", "rocket", "pulse"] as const)[index % 3];
      game.claimWelfareReward("booster");
      expect(ad.requests).toHaveLength(index + 1);
      await completeAd(fixture);
      expect(game.save.welfareRewards.claimed.booster).toBe(index + 1);
      expect(game.welfareView().cards.booster.remaining).toBe(9 - index);
    }
    expect(game.save.boosters).toEqual({ time: 7, rocket: 6, pulse: 6 });
    expect(storage.writes).toHaveLength(30);
    expect(game.welfareView().cards.booster.state).toBe("limit");
    for (const choice of ["time", "rocket", "pulse"]) {
      game.welfareSelectedBooster = choice;
      game.claimWelfareReward("booster");
    }
    expect(ad.requests).toHaveLength(10); expect(storage.writes).toHaveLength(30);
    expect(economic(game.save)).toEqual({ ...before, boosters: { time: 7, rocket: 6, pulse: 6 } });
    for (const kind of ["inspiration", "coins", "lives"]) {
      expect(game.welfareView().cards[kind]).toMatchObject({ remaining: 3, state: "available" });
    }
    const reloaded = welfareGame({ saved: storage.value });
    expect(reloaded.game.save.welfareRewards.claimed.booster).toBe(10);
    expect(reloaded.game.welfareView().cards.booster).toMatchObject({ remaining: 0, state: "limit" });
    reloaded.game.claimWelfareReward("booster");
    expect(reloaded.ad.requests).toHaveLength(0); expect(reloaded.storage.writes).toHaveLength(0);
  });

  it.each([2, 3, 9])("reloads %i used booster claims unchanged and retains the balance without a retroactive grant", async claimed => {
    const saved = clone(welfareGame().game.save);
    saved.welfareRewards.claimed.booster = claimed;
    saved.welfareRewards.completedRequestIds = Array.from({ length: claimed }, (_, i) => `prior-booster-${i}`);
    const fixture = welfareGame({ saved }), { game, storage, ad } = fixture;
    game.recoverWelfareReward();
    expect(game.save.welfareRewards.claimed.booster).toBe(claimed);
    expect(game.welfareView().cards.booster.remaining).toBe(10 - claimed);
    expect(economic(game.save)).toEqual(economic(saved));
    expect(storage.writes).toHaveLength(0); expect(ad.requests).toHaveLength(0);
    game.claimWelfareReward("booster"); await completeAd(fixture);
    expect(game.save.welfareRewards.claimed.booster).toBe(claimed + 1);
    expect(game.save.boosters).toEqual({ ...saved.boosters, rocket: saved.boosters.rocket + 1 });
    expect(game.welfareView().cards.booster.remaining).toBe(9 - claimed);
    const reloaded = welfareGame({ saved: storage.value });
    expect(reloaded.game.save.welfareRewards.claimed.booster).toBe(claimed + 1);
  });

  it("restores ten booster claims at Beijing midnight without restoring spent inventory", async () => {
    const midnight = Date.parse("2026-10-10T16:00:00Z");
    const saved = clone(welfareGame().game.save);
    saved.welfareRewards.claimed.booster = 10;
    vi.setSystemTime(midnight - 1);
    const fixture = welfareGame({ saved }), { game, ad } = fixture;
    expect(game.welfareView().cards.booster.remaining).toBe(0);
    vi.setSystemTime(midnight);
    expect(game.welfareView().cards.booster.remaining).toBe(10);
    expect(game.save.boosters).toEqual(saved.boosters);
    game.claimWelfareReward("booster"); await completeAd(fixture);
    expect(ad.requests).toHaveLength(1);
    expect(game.save.welfareRewards).toMatchObject({ dayKey: "2026-10-11", claimed: { booster: 1 } });
    expect(game.welfareView().cards.booster.remaining).toBe(9);
  });

  it.each(["cancelled", "unavailable", "error"] as const)("preserves nine used booster claims after %s", async status => {
    const saved = clone(welfareGame().game.save);
    saved.welfareRewards.claimed.booster = 9;
    const fixture = welfareGame({ saved }), { game, storage } = fixture;
    game.claimWelfareReward("booster"); await completeAd(fixture, status);
    expect(game.save.welfareRewards.claimed.booster).toBe(9);
    expect(game.welfareView().cards.booster.remaining).toBe(1);
    expect(economic(game.save)).toEqual(economic(saved));
    expect(storage.writes.some(row => row.stage === "reward")).toBe(false);
  });

  it("retries the identical tenth booster reward candidate without double-paying or resetting its count", async () => {
    const saved = clone(welfareGame().game.save);
    saved.welfareRewards.claimed.booster = 9;
    const fixture = welfareGame({ saved }), { game, storage, ad } = fixture;
    storage.fault = { stage: "reward", mode: "unknown-written" };
    game.claimWelfareReward("booster"); await completeAd(fixture);
    const candidate = game.pendingWelfareSave.candidateSave, before = clone(candidate);
    expect(candidate.welfareRewards.claimed.booster).toBe(10);
    expect(game.save.welfareRewards.claimed.booster).toBe(9);
    storage.fault = undefined; storage.readUnavailable = false;
    game.finishWelfareSave(); await flushAd();
    expect(storage.writes.filter(row => row.stage === "reward").every(row => row.candidate === candidate)).toBe(true);
    expect(candidate).toEqual(before);
    expect(game.save.welfareRewards.claimed.booster).toBe(10);
    expect(game.save.boosters.rocket).toBe(saved.boosters.rocket + 1);
    game.recoverWelfareReward(); game.claimWelfareReward("booster");
    expect(ad.requests).toHaveLength(1);
    expect(game.save.boosters.rocket).toBe(saved.boosters.rocket + 1);
  });

  it("grants inspiration without restoring or acknowledging a masterpiece", async () => {
    const fixture = welfareGame(), { game } = fixture, before = clone(game.save.collectionProgress);
    game.claimWelfareReward("inspiration"); await completeAd(fixture);
    expect(game.save.collectionProgress).toEqual({ ...before, inspiration: before.inspiration + 50 });
    expect(game.collectionIntro).toBeUndefined(); expect(game.screen).toBe("supply");
    expect(game.welfareView().canOpenCollection).toBe(true);
  });

  it("grants 50 inspiration per completed ad and stops after three claims totalling 150", async () => {
    const fixture = welfareGame(), { game, ad, storage } = fixture, before = economic(game.save);
    for (let count = 1; count <= 3; count += 1) {
      game.claimWelfareReward("inspiration");
      expect(game.save.collectionProgress.inspiration).toBe(before.collection.inspiration + (count - 1) * 50);
      await completeAd(fixture);
      expect(game.save.collectionProgress.inspiration).toBe(before.collection.inspiration + count * 50);
      expect(game.save.welfareRewards.claimed.inspiration).toBe(count);
      expect(game.welfareView().cards.inspiration.remaining).toBe(3 - count);
    }
    expect(game.welfareView().cards.inspiration.state).toBe("limit");
    game.claimWelfareReward("inspiration");
    expect(ad.requests).toHaveLength(3);
    expect(storage.writes.map(row => row.stage)).toEqual(Array.from({ length: 3 }, () => ["prepare", "receipt", "reward"]).flat());
    expect(economic(game.save)).toEqual({ ...before,
      collection: { ...before.collection, inspiration: before.collection.inspiration + 150 } });
  });

  it.each(["inspiration", "coins", "lives"] as const)("preserves two used %s claims, permits the third, and persists the fourth-claim limit", async kind => {
    const saved = clone(welfareGame().game.save);
    saved.welfareRewards.claimed[kind] = 2;
    saved.welfareRewards.completedRequestIds = [`legacy-${kind}-1`, `legacy-${kind}-2`];
    const fixture = welfareGame({ saved }), { game, ad, storage } = fixture;
    game.recoverWelfareReward();
    const before = economic(saved);
    expect(economic(game.save)).toEqual(before);
    expect(game.save.welfareRewards.claimed[kind]).toBe(2);
    expect(game.welfareView().cards[kind]).toMatchObject({ state: "available", remaining: 1 });
    expect(ad.requests).toHaveLength(0); expect(storage.writes).toHaveLength(0);

    game.claimWelfareReward(kind); await completeAd(fixture);
    expect(game.save.welfareRewards.claimed[kind]).toBe(3);
    expect(game.save.welfareRewards.completedRequestIds).toEqual(expect.arrayContaining(saved.welfareRewards.completedRequestIds));
    expect(game.welfareView().cards[kind]).toMatchObject({ state: "limit", remaining: 0 });
    const expected = clone(before);
    if (kind === "inspiration") expected.collection.inspiration += 50;
    else if (kind === "coins") expected.coins += 100;
    else expected.lives.lives += 1;
    expect(economic(game.save)).toEqual(expected);
    for (const other of ["inspiration", "coins", "lives"] as const) {
      if (other !== kind) expect(game.welfareView().cards[other]).toMatchObject({ state: "available", remaining: 3 });
    }
    expect(game.welfareView().cards.booster.remaining).toBe(10);
    game.claimWelfareReward(kind);
    expect(ad.requests).toHaveLength(1); expect(storage.writes).toHaveLength(3);

    const reloaded = welfareGame({ saved: storage.value });
    reloaded.game.recoverWelfareReward();
    expect(reloaded.game.save.welfareRewards.claimed[kind]).toBe(3);
    expect(reloaded.game.welfareView().cards[kind]).toMatchObject({ state: "limit", remaining: 0 });
    expect(economic(reloaded.game.save)).toEqual(expected);
    reloaded.game.claimWelfareReward(kind);
    expect(reloaded.ad.requests).toHaveLength(0); expect(reloaded.storage.writes).toHaveLength(0);
  });

  it.each(["reject", "unknown-written"] as const)("retries the same 50-inspiration reward after %s without paying twice", async mode => {
    const fixture = welfareGame(), { game, ad, storage } = fixture, before = economic(game.save);
    storage.fault = { stage: "reward", mode };
    game.claimWelfareReward("inspiration"); await completeAd(fixture);
    const candidate = game.pendingWelfareSave.candidateSave, snapshot = clone(candidate);
    expect(candidate.collectionProgress.inspiration).toBe(before.collection.inspiration + 50);
    expect(economic(game.save)).toEqual(before);
    ad.requests[0].resolve({ status: "completed", requestId: ad.requests[0].id }); await flushAd();
    expect(game.pendingWelfareSave.candidateSave).toBe(candidate);
    storage.fault = undefined; storage.readUnavailable = false;
    game.finishWelfareSave(); await flushAd();
    expect(storage.writes.filter(row => row.stage === "reward").every(row => row.candidate === candidate)).toBe(true);
    expect(candidate).toEqual(snapshot);
    expect(game.save.collectionProgress.inspiration).toBe(before.collection.inspiration + 50);
    expect(game.save.welfareRewards.claimed.inspiration).toBe(1);
    const writes = storage.writes.length;
    game.recoverWelfareReward(); game.presentWelfareReward(); game.presentWelfareReward();
    expect(storage.writes).toHaveLength(writes); expect(ad.requests).toHaveLength(1);
    expect(game.save.collectionProgress.inspiration).toBe(before.collection.inspiration + 50);
    expect(goldCount(game)).toBe(1);
  });

  it("preserves old inspiration balances and claimed quota without a retrospective top-up", async () => {
    const saved = clone(welfareGame().game.save);
    saved.collectionProgress.inspiration = 55;
    saved.welfareRewards.claimed.inspiration = 1;
    saved.welfareRewards.completedRequestIds = ["legacy-inspiration-10"];
    const fixture = welfareGame({ saved }), { game, storage, ad } = fixture;
    game.recoverWelfareReward();
    expect(game.save.collectionProgress.inspiration).toBe(55);
    expect(game.welfareView().cards.inspiration.remaining).toBe(2);
    expect(storage.writes).toHaveLength(0); expect(ad.requests).toHaveLength(0);
    game.claimWelfareReward("inspiration"); await completeAd(fixture);
    expect(game.save.collectionProgress.inspiration).toBe(105);
    expect(game.save.welfareRewards.claimed.inspiration).toBe(2);
    expect(game.save.welfareRewards.completedRequestIds).toContain("legacy-inspiration-10");
  });

  it("settles an amount-less legacy inspiration receipt once without replaying its ad", () => {
    const saved = clone(welfareGame().game.save);
    saved.welfareRewards.pending = { id: "legacy-inspiration-pending", kind: "inspiration",
      dayKey: "2026-10-10", startedAtMs: NOW, phase: "completed", completedAtMs: NOW + 10_000 };
    vi.setSystemTime(NOW + 20_000);
    const { game, storage, ad } = welfareGame({ saved });
    game.recoverWelfareReward();
    expect(game.save.collectionProgress.inspiration).toBe(saved.collectionProgress.inspiration + 50);
    expect(game.save.welfareRewards.claimed.inspiration).toBe(1);
    expect(game.save.welfareRewards.pending).toBeUndefined();
    expect(game.save.welfareRewards.completedRequestIds).toContain("legacy-inspiration-pending");
    expect(ad.requests).toHaveLength(0);
    const writes = storage.writes.length;
    game.recoverWelfareReward();
    expect(game.save.collectionProgress.inspiration).toBe(saved.collectionProgress.inspiration + 50);
    expect(storage.writes).toHaveLength(writes);
  });

  it("opens the eligible collection detail without paying or granting its artwork", () => {
    const fixture = welfareGame(), { game, storage } = fixture;
    game.save.collectionProgress.inspiration = 50; storage.value = clone(game.save);
    const before = economic(game.save); game.openWelfareCollection();
    expect(game.screen).toBe("records"); expect(game.collectionAlbumTab).toBe("masterpieces");
    expect(game.collectionAlbumDetailId).toBe(MASTERPIECE_COLLECTION_CATALOG[0].id);
    expect(economic(game.save)).toEqual(before); expect(game.collectionIntro).toBeUndefined();
    expect(storage.writes).toHaveLength(0);
  });

  it("holds reward presentation while hidden and plays it once after returning", async () => {
    const fixture = welfareGame(), { game } = fixture;
    game.claimWelfareReward("coins"); game.appVisible = false; await completeAd(fixture);
    expect(game.save.coins).toBe(300); expect(goldCount(game)).toBe(0);
    game.presentWelfareReward(); expect(goldCount(game)).toBe(0);
    game.appVisible = true; game.presentWelfareReward(); game.presentWelfareReward();
    expect(goldCount(game)).toBe(1);
  });

  it("scrolls a rejected restored booster reward into view without changing its candidate", () => {
    const first = welfareGame(), requestId = "restored-booster-scroll";
    const prepared = prepareWelfareReward(first.game.save.welfareRewards, first.game.welfareAccount(),
      { id: requestId, kind: "booster", boosterKind: "rocket", nowMs: NOW });
    const saved = clone(first.game.save);
    saved.welfareRewards = confirmWelfareAdCompletion(prepared.state, requestId, NOW + 10_000).state;
    vi.setSystemTime(NOW + 20_000);
    const { game, storage, ad } = welfareGame({ saved });
    storage.fault = { stage: "reward", mode: "reject" };
    // Logical 53.73 corresponds to a 78-pixel offset in the 720-wide artboard.
    const artScale = 496 / 720, artOffsetY = (1078 - 1584 * artScale) / 2;
    game.safeOffsets = () => ({ top: 78 * artScale, bottom: 0 });
    // Keep the regression on a deliberately restricted viewport even when the regular page fits without scrolling.
    game.welfareLayout = () => welfareStationLayout(game.welfareScroll ?? 0, 1200, 78);
    game.recoverWelfareReward();
    const candidate = game.pendingWelfareSave.candidateSave, candidateJson = clone(candidate);
    expect(game.welfareTargets().some(([key]: [string]) => key === "welfare.claim.booster")).toBe(false);
    const viewport = game.welfareLayout().viewport;
    const start = { id: 17, x: (viewport.x + 80) * artScale,
      y: artOffsetY + (viewport.y + viewport.height / 2) * artScale };
    expect(game.beginWelfareScroll(start)).toBe(true);
    game.updateWelfareScroll({ ...start, y: start.y - 500 });
    expect(game.welfareScroll).toBeGreaterThan(0);
    expect(game.pendingWelfareSave.candidateSave).toBe(candidate);
    expect(candidate).toEqual(candidateJson); expect(ad.requests).toHaveLength(0);
    const retry = game.welfareTargets().find(([key]: [string]) => key === "welfare.claim.booster");
    expect(retry).toBeDefined();
    storage.fault = undefined;
    const rect = retry[1];
    const point = { id: 18, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    expect(game.buttonReleaseTargetAt(point)?.key).toBe("welfare.claim.booster");
    game.executePointerAction(point);
    expect(storage.writes.every(row => row.candidate === candidate)).toBe(true);
    expect(game.save.boosters.rocket).toBe(saved.boosters.rocket + 1);
    expect(game.save.welfareRewards.claimed.booster).toBe(1);
    expect(game.pendingWelfareSave).toBeUndefined(); expect(ad.requests).toHaveLength(0);
  });

  it.each(["coins", "booster"] as const)("keeps a capacity-blocked %s receipt while permitting navigation and ordinary spending", kind => {
    const first = welfareGame(), requestId = "deferred-" + kind;
    const prepared = prepareWelfareReward(first.game.save.welfareRewards, first.game.welfareAccount(),
      { id: requestId, kind, boosterKind: "rocket", nowMs: NOW });
    const saved = clone(first.game.save);
    saved.welfareRewards = confirmWelfareAdCompletion(prepared.state, requestId, NOW + 10_000).state;
    if (kind === "coins") saved.coins = 999_950;
    else saved.boosters.rocket = 9;
    vi.setSystemTime(NOW + 20_000);
    const { game, storage, ad } = welfareGame({ saved });
    game.recoverWelfareReward();
    expect(game.welfareRewardDeferred).toBe(true);
    expect(game.welfareTransactionActive()).toBe(false);
    expect(game.pendingWelfareSave).toBeUndefined(); expect(storage.writes).toHaveLength(0);
    expect(game.save.welfareRewards.pending).toEqual(saved.welfareRewards.pending);
    expect(game.welfareView().cards[kind].state).toBe("retry");
    expect(game.welfareTargets().some(([key]: [string]) => key.startsWith("welfare.select."))).toBe(false);
    game.claimWelfareReward(kind === "coins" ? "booster" : "coins");
    expect(ad.requests).toHaveLength(0); expect(storage.writes).toHaveLength(0);

    const home = game.mainNavigationRect(2);
    const homePoint = { id: 9, x: home.x + home.width / 2, y: home.y + home.height / 2 };
    expect(game.buttonReleaseTargetAt(homePoint)?.key).toBe("navigation.2");
    game.executePointerAction(homePoint); expect(game.screen).toBe("home");
    game.recoverWelfareReward(); expect(game.screen).toBe("home");
    if (kind === "coins") {
      game.buyLifeRefill();
      expect(game.save.coins).toBe(999_750); expect(game.save.lifeState.lives).toBe(5);
    } else {
      game.spendBooster("rocket"); expect(game.persist()).toBe(true);
      expect(game.save.boosters.rocket).toBe(8);
    }
    expect(storage.value.welfareRewards.pending).toEqual(saved.welfareRewards.pending);
    game.screen = "supply"; game.navigationTransition = undefined;
    game.welfareSelectedBooster = "pulse";
    game.claimWelfareReward(kind);
    expect(game.welfareRewardDeferred).toBe(false); expect(game.save.welfareRewards.pending).toBeUndefined();
    expect(game.save.welfareRewards.completedRequestIds).toEqual([requestId]);
    expect(game.save.welfareRewards.claimed[kind]).toBe(1);
    expect(game.save.welfareRewards.cooldownUntilMs).toBe(0);
    if (kind === "coins") expect(game.save.coins).toBe(999_850);
    else expect(game.save.boosters).toEqual({ ...saved.boosters, rocket: 9 });
    const writes = storage.writes.length, finalSave = clone(game.save);
    game.settleWelfareReward(); game.recoverWelfareReward();
    expect(game.save).toEqual(finalSave); expect(storage.writes).toHaveLength(writes);
    expect(ad.requests).toHaveLength(0);
  });

  it.each(["watching", "completed"] as const)("allows startup artwork retry with a durable %s request", phase => {
    const { game, storage, ad } = welfareGame();
    const prepared = prepareWelfareReward(game.save.welfareRewards, game.welfareAccount(),
      { id: "startup-pending", kind: "coins", nowMs: NOW });
    game.save.welfareRewards = phase === "watching" ? prepared.state
      : confirmWelfareAdCompletion(prepared.state, "startup-pending", NOW + 10_000).state;
    const receipt = clone(game.save.welfareRewards);
    game.screen = "home"; game.artReady = false; game.artLoadError = new Error("isolated startup image failure");
    game.retryStartupArt = vi.fn();
    const rect = game.startupRetryRect();
    const point = { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    expect(game.buttonReleaseTargetAt(point)?.key).toBe("startupRetry");
    game.executePointerAction(point);
    expect(game.retryStartupArt).toHaveBeenCalledOnce();
    expect(game.save.welfareRewards).toEqual(receipt);
    expect(storage.writes).toHaveLength(0); expect(ad.requests).toHaveLength(0);
  });

  it("allows supply artwork retry without resubmitting a pending reward", async () => {
    const fixture = welfareGame(), { game, storage, ad } = fixture;
    storage.fault = { stage: "reward", mode: "reject" };
    game.claimWelfareReward("coins"); await completeAd(fixture);
    const candidate = game.pendingWelfareSave.candidateSave, writes = storage.writes.length;
    game.formalPageArt = undefined; game.formalPageArtError = new Error("isolated supply image failure");
    game.formalPageArtErrorScreen = "supply";
    game.retryFormalPageArt = vi.fn();
    const point = { id: 2, x: 248, y: 551 };
    expect(game.buttonReleaseTargetAt(point)?.key).toBe("formalPageRetry");
    game.executePointerAction(point);
    expect(game.retryFormalPageArt).toHaveBeenCalledWith("supply");
    expect(game.pendingWelfareSave.candidateSave).toBe(candidate);
    expect(storage.writes).toHaveLength(writes); expect(ad.requests).toHaveLength(1);
  });
});
