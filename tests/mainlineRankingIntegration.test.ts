import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { normalizeMainlineRankingProgress, rankingWeekStartMs } from "../src/core/mainlineRankingProgress";
import { buildMetaLeaderboard, PLACEHOLDER_META_LEADERBOARD_SOURCE } from "../src/core/metaLeaderboard";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import { PuzzleModel } from "../src/core/PuzzleModel";
import { LEVELS } from "../src/core/levels";

const NOW = Date.parse("2026-10-10T12:00:00+08:00");
const MONDAY = Date.parse("2026-10-12T00:00:00+08:00");
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function fixture(withProvince = true) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.save = game.sanitizeSave({ ...game.sanitizeSave(undefined), currentLevel: 7, highestLevel: 7,
    coins: 120, rewardedLevels: [1, 2, 3, 4, 5, 6], bestStars: { "1": 3, "2": 3, "3": 3, "4": 3, "5": 3, "6": 3 },
    playerProfile: { id: "1234567", name: "玩家", joinedAt: NOW - 86_400_000, avatar: 1, frame: 0 },
    mainlineRanking: { ...normalizeMainlineRankingProgress(undefined, NOW, NOW - 86_400_000),
      ...(withProvince ? { province: "44", provinceSource: "ip" } : {}) } });
  game.model = new PuzzleModel(LEVELS[6]);
  game.completionMetrics = { moves: 1, elapsedSeconds: 1 };
  game.runElapsedSeconds = 1;
  game.screen = "leaderboard"; game.appVisible = true; game.storageBaselineReady = true;
  game.rankingProvinceLookupToken = 0; game.rankingProvinceLoading = false;
  game.leaderboardSource = PLACEHOLDER_META_LEADERBOARD_SOURCE;
  game.leaderboardMode = "world"; game.leaderboardScrollOffsets = { world: 0, country: 0, weekly: 0 };
  game.scheduleFrame = vi.fn(); game.playSound = vi.fn(); game.vibrate = vi.fn();
  game.safeOffsets = () => ({ top: 0, bottom: 0 });
  game.storageReadAttempts = 0;
  const storage = { value: clone(game.save), mode: "commit" as "commit" | "reject" | "unknown" };
  game.host = {
    storageSet: vi.fn((_key: string, value: unknown) => {
      if (storage.mode === "reject") return false;
      storage.value = clone(value); return storage.mode === "commit";
    }),
    storageRead: vi.fn(() => storage.mode === "unknown" ? { status: "unavailable" } : { status: "ok", value: clone(storage.value) }),
    scheduleTimeout: vi.fn(() => 1), cancelTimeout: vi.fn(),
    resolveLeaderboardProvince: vi.fn(async () => ({ province: "44", source: "ip" })),
  };
  return { game, storage };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("actual mainline ranking save integration", () => {
  it("migrates old totals to weekly zero once and deeply isolates candidate state", () => {
    const { game } = fixture();
    delete game.save.mainlineRanking;
    const old = clone(game.save), migrated = game.sanitizeSave(old);
    expect(migrated.bestStars).toEqual(old.bestStars);
    expect(migrated.coins).toBe(old.coins);
    expect(migrated.mainlineRanking.weeklyStars).toBe(0);
    vi.setSystemTime(NOW + 86_400_000);
    expect(game.sanitizeSave(migrated).mainlineRanking).toEqual(migrated.mainlineRanking);
    const candidate = game.cloneSave(migrated);
    candidate.mainlineRanking.weeklyStars = 8;
    expect(migrated.mainlineRanking.weeklyStars).toBe(0);
  });
  it("writes new stars in the same real completion candidate as level progress and coins", () => {
    const { game } = fixture();
    const pending = game.createPendingSettlement();
    expect(pending.candidateSave.mainlineRanking.weeklyStars).toBe(3);
    expect(pending.candidateSave.bestStars["7"]).toBe(3);
    expect(pending.candidateSave.coins).toBe(game.save.coins + 40);
    expect(game.save.mainlineRanking.weeklyStars).toBe(0);
    expect(game.host.storageSet).not.toHaveBeenCalled();
  });
  it("counts replay improvement only and leaves temporary challenges outside weekly accounting", () => {
    const { game } = fixture();
    game.save.rewardedLevels.push(7); game.save.bestStars["7"] = 1;
    expect(game.createPendingSettlement().candidateSave.mainlineRanking.weeklyStars).toBe(2);
    game.save.bestStars["7"] = 3;
    expect(game.createPendingSettlement().candidateSave.mainlineRanking.weeklyStars).toBe(0);
    game.save.bestStars["7"] = 1;
    game.temporaryLevelTestSession = { baselineSave: clone(game.save), baselineLevelId: 7 };
    expect(game.createPendingSettlement().candidateSave.mainlineRanking).toEqual(game.save.mainlineRanking);
  });
  it("keeps daily challenge completion out of weekly and campaign records", () => {
    const { game } = fixture();
    const pending = game.createDailyChallengeSettlement(1, game.model.snapshot());
    expect(pending.candidateSave.mainlineRanking).toEqual(game.save.mainlineRanking);
    expect(pending.candidateSave.bestStars).toEqual(game.save.bestStars);
  });
  it("freezes successful completion week through ambiguous save retry across Monday", () => {
    vi.setSystemTime(MONDAY - 1);
    const { game, storage } = fixture();
    storage.mode = "unknown";
    const pending = game.createPendingSettlement();
    game.pendingSettlement = pending;
    expect(game.persistVerified(pending.candidateSave, pending.baselineSave)).toBe("unknown");
    const frozen = clone(pending.candidateSave);
    vi.setSystemTime(MONDAY + 10);
    storage.mode = "commit";
    expect(game.persistVerified(pending.candidateSave, pending.baselineSave)).toBe("committed");
    expect(pending.candidateSave).toEqual(frozen);
    expect(pending.candidateSave.mainlineRanking.weekStartMs).toBe(MONDAY - 7 * 86_400_000);
    expect(game.host.storageSet.mock.calls[0][1]).toBe(game.host.storageSet.mock.calls[1][1]);
    game.save = pending.candidateSave; game.pendingSettlement = undefined;
    game.beginRankingPage();
    expect(game.save.mainlineRanking.weeklyStars).toBe(0);
    expect(game.save.bestStars["7"]).toBe(3);
  });
  it("uses the already captured successful exit time when celebration starts after Monday", () => {
    const { game } = fixture();
    game.mainlineRankingCompletedAtMs = MONDAY - 150;
    vi.setSystemTime(MONDAY + 300);
    const pending = game.createPendingSettlement();
    expect(pending.candidateSave.mainlineRanking).toMatchObject({ weekStartMs: MONDAY - 7 * 86_400_000,
      weeklyStars: 3, lastObservedMs: MONDAY - 150 });
  });
  it("rejects a weekly ledger greater than all actual campaign stars", () => {
    const { game } = fixture(); game.save.mainlineRanking.weeklyStars = 600;
    const normalized = game.sanitizeSave(game.save);
    expect(normalized.mainlineRanking.weeklyStars).toBe(0);
    expect(normalized.bestStars).toEqual(game.save.bestStars);
  });
  it("keeps three tab snapshots at the same clock until reentry", () => {
    const { game } = fixture(); game.beginRankingPage();
    const before = Object.fromEntries(["world", "country", "weekly"].map(mode => [mode, clone(game.leaderboardSnapshot(mode))]));
    vi.setSystemTime(NOW + 12 * 3_600_000);
    for (const mode of ["weekly", "country", "world", "weekly"]) expect(game.leaderboardSnapshot(mode)).toEqual(before[mode]);
    game.beginRankingPage();
    expect(game.leaderboardSnapshot("world").entries).not.toEqual(before.world.entries);
  });
  it("refreshes weekly zero on Monday and preserves cumulative rank data", () => {
    const { game } = fixture(); game.save.mainlineRanking.weeklyStars = 8; game.beginRankingPage();
    expect(game.leaderboardSnapshot("weekly").player.totalStars).toBe(8);
    vi.setSystemTime(MONDAY); game.updateRankingPage();
    expect(game.save.mainlineRanking.weekStartMs).toBe(MONDAY);
    expect(game.leaderboardSnapshot("weekly").player.totalStars).toBe(0);
    expect(game.leaderboardSnapshot("world").player.totalStars).toBe(18);
  });
  it("monotonic clock survives reload and does not move opponents backward", () => {
    const { game } = fixture(); game.beginRankingPage();
    const before = clone(game.leaderboardSnapshot("world"));
    vi.setSystemTime(NOW - 4 * 86_400_000); game.save = game.sanitizeSave(game.save); game.beginRankingPage();
    expect(game.leaderboardSnapshot("world")).toEqual(before);
  });
  it("syncs appearance while preserving the frozen opponent clock", () => {
    const { game } = fixture(); game.beginRankingPage();
    const before = game.leaderboardSnapshot("world");
    game.save.playerProfile.avatar = 4; game.save.playerProfile.frame = 3; game.save.playerProfile.name = "新名字";
    const after = game.leaderboardSnapshot("world");
    expect(after.player).toMatchObject({ avatar: 4, frame: 3, name: "新名字" });
    expect(after.entries).toEqual(before.entries);
  });
  it("keeps opponent names in the first device language when the UI language changes", () => {
    const { game } = fixture();
    game.save.leaderboardLanguage = "ja";
    game.save.language = "en";
    game.beginRankingPage();
    const first = game.leaderboardSnapshot("world");
    const progress = game.save.mainlineRanking;
    const profile = game.save.playerProfile;
    const expected = buildMetaLeaderboard("world", {
      highestLevel: game.save.highestLevel, bestStars: game.save.bestStars,
      playerId: profile.id, playerName: profile.name, playerAvatar: profile.avatar, playerFrame: profile.frame,
      opponentLanguage: "ja", nowMs: game.rankingVisitClockMs, groupCreatedAtMs: progress.epochMs,
      province: progress.province, weeklyStars: progress.weeklyStars, weekBaselineMs: progress.weekBaselineMs,
    });
    expect(first.entries.map((entry: any) => entry.name)).toEqual(expected.entries.map((entry) => entry.name));
    game.save.language = "fr";
    expect(game.leaderboardSnapshot("world")).toEqual(first);
  });
  it("uses the same confirmed province and clock for both sides of a national rank improvement", () => {
    const { game } = fixture();
    const pending = game.createPendingSettlement();
    const source = vi.spyOn(PLACEHOLDER_META_LEADERBOARD_SOURCE, "getSnapshot");
    game.mainlineRankChangeForSettlement(pending.baselineSave, pending.candidateSave, NOW);
    expect(source.mock.calls).toHaveLength(2);
    for (const [mode, , clock] of source.mock.calls) {
      expect(mode).toBe("world");
      expect(clock).toMatchObject({ province: "44", nowMs: NOW,
        groupCreatedAtMs: pending.baselineSave.mainlineRanking.epochMs });
    }
  });
  it("automatically resolves province once without blocking lookup-time progress", async () => {
    const { game } = fixture(false);
    let resolve!: (value: unknown) => void;
    game.host.resolveLeaderboardProvince = vi.fn(() => new Promise(r => { resolve = r; }));
    game.beginRankingPage(); await flush();
    expect(game.leaderboardSnapshot("country").totalPlayers).toBe(0);
    expect(game.leaderboardEntries("country")).toEqual([]);
    expect(game.leaderboardSnapshot("world").totalPlayers).toBe(100);
    game.save.coins += 40; game.save.bestStars["7"] = 3;
    resolve({ province: "32", source: "ip" }); await flush();
    expect(game.save.mainlineRanking).toMatchObject({ province: "32", provinceSource: "ip" });
    expect(game.save.coins).toBe(160);
    expect(game.save.bestStars["7"]).toBe(3);
    game.beginRankingPage(); await flush();
    expect(game.host.resolveLeaderboardProvince).toHaveBeenCalledOnce();
  });
  it("defers a late lookup after leaving, then applies it to the newest save on reentry", async () => {
    const { game } = fixture(false);
    let resolve!: (value: unknown) => void;
    game.host.resolveLeaderboardProvince = vi.fn(() => new Promise(r => { resolve = r; }));
    game.beginRankingPage(); await flush(); game.screen = "home";
    game.save.coins += 80;
    resolve({ province: "51", source: "ip" }); await flush();
    expect(game.save.mainlineRanking.province).toBeUndefined();
    game.screen = "leaderboard"; game.beginRankingPage();
    expect(game.save.mainlineRanking.province).toBe("51");
    expect(game.save.coins).toBe(200);
  });
  it("late province resolution adds the confirmed province to national candidates at the original page clock", async () => {
    const { game } = fixture(false);
    let resolve!: (value: unknown) => void;
    game.host.resolveLeaderboardProvince = vi.fn(() => new Promise(r => { resolve = r; }));
    game.beginRankingPage(); await flush();
    const before = clone(game.leaderboardSnapshot("world"));
    vi.setSystemTime(NOW + 12 * 3_600_000);
    resolve({ province: "32", source: "ip" }); await flush();
    expect(game.rankingVisitClockMs).toBe(NOW);
    const after = game.leaderboardSnapshot("world");
    const progress = game.save.mainlineRanking, profile = game.save.playerProfile;
    const expected = buildMetaLeaderboard("world", {
      highestLevel: game.save.highestLevel, bestStars: game.save.bestStars,
      playerId: profile.id, playerName: profile.name, playerAvatar: profile.avatar, playerFrame: profile.frame,
      nowMs: NOW, groupCreatedAtMs: progress.epochMs, province: "32",
      weeklyStars: progress.weeklyStars, weekBaselineMs: progress.weekBaselineMs,
    });
    expect(after).toEqual(expected);
    expect(after.entries.some((entry: any) => entry.id.startsWith("meta-province-32-"))).toBe(true);
    const oldById = new Map(before.entries.map((entry: any) => [entry.id, entry]));
    for (const entry of after.entries) {
      const old = oldById.get(entry.id) as any;
      if (old) expect(entry).toEqual({ ...old, rank: entry.rank });
    }
    expect(game.profileView().levelRank).toBe(after.player.rank);
    expect(game.mainlineWorldRankForSave(game.save, NOW)).toBe(after.player.rank);
    expect(game.mainlineRankChange).toBeUndefined();
  });
  it("random fallback stays in the same candidate through unknown retry and reload", async () => {
    const { game, storage } = fixture(false);
    game.host.resolveLeaderboardProvince = vi.fn(async () => undefined);
    vi.spyOn(Math, "random").mockReturnValue(0.5); storage.mode = "unknown";
    game.beginRankingPage(); await flush();
    const pending = game.pendingRankingSave;
    expect(pending.candidateSave.mainlineRanking.provinceSource).toBe("random");
    expect(game.save.mainlineRanking.province).toBeUndefined();
    expect(game.persist(game.cloneSave(game.save))).toBe(false);
    vi.setSystemTime(MONDAY + 123); storage.mode = "commit"; game.finishRankingSave();
    expect(game.host.storageSet.mock.calls[1][1]).toBe(pending.candidateSave);
    expect(Math.random).toHaveBeenCalledOnce();
    expect(game.sanitizeSave(storage.value).mainlineRanking.province).toBe(pending.candidateSave.mainlineRanking.province);
  });
  it("starts a delayed province lookup after an entry-clock save is finally confirmed", async () => {
    const { game, storage } = fixture(false);
    vi.setSystemTime(NOW + 1); storage.mode = "unknown";
    game.beginRankingPage(); await flush();
    expect(game.pendingRankingSave).toBeDefined();
    expect(game.host.resolveLeaderboardProvince).not.toHaveBeenCalled();
    storage.mode = "commit"; game.beginRankingPage(); game.updateRankingPage(); await flush();
    expect(game.host.resolveLeaderboardProvince).toHaveBeenCalledOnce();
    expect(game.save.mainlineRanking.province).toBe("44");
  });
  it("projects the new week during an unknown save, then separately persists its rollover", async () => {
    const { game, storage } = fixture(false);
    game.host.resolveLeaderboardProvince = vi.fn(async () => ({ province: "44", source: "ip" }));
    storage.mode = "unknown"; game.beginRankingPage(); await flush();
    const pending = game.pendingRankingSave, original = clone(pending.candidateSave);
    vi.setSystemTime(MONDAY + 123);
    expect(game.leaderboardSnapshot("weekly").player.totalStars).toBe(0);
    storage.mode = "commit"; game.finishRankingSave();
    expect(pending.candidateSave).toEqual(original);
    game.updateRankingPage();
    expect(game.save.mainlineRanking.weekStartMs).toBe(MONDAY);
    expect(game.save.mainlineRanking.lastObservedMs).toBe(MONDAY + 123);
    expect(storage.value.mainlineRanking.weekStartMs).toBe(MONDAY);
  });
  it("rejected province retries retain the chosen region without a frame write loop", async () => {
    const { game, storage } = fixture(false);
    game.host.resolveLeaderboardProvince = vi.fn(async () => undefined);
    storage.mode = "reject"; game.beginRankingPage(); await flush();
    const region = game.rankingProvinceResolved.province, calls = game.host.storageSet.mock.calls.length;
    for (let i = 0; i < 10; i++) game.updateRankingPage();
    expect(game.host.storageSet).toHaveBeenCalledTimes(calls);
    storage.mode = "commit"; game.beginRankingPage();
    expect(game.save.mainlineRanking.province).toBe(region);
    expect(game.host.resolveLeaderboardProvince).toHaveBeenCalledOnce();
  });
  it("ignores a lookup owned by a reset player", async () => {
    const { game } = fixture(false);
    let resolve!: (value: unknown) => void;
    game.host.resolveLeaderboardProvince = vi.fn(() => new Promise(r => { resolve = r; }));
    game.beginRankingPage(); await flush(); game.save.playerProfile.id = "7654321";
    resolve({ province: "32", source: "ip" }); await flush();
    expect(game.save.mainlineRanking.province).toBeUndefined();
    expect(game.rankingProvinceLoading).toBe(false);
  });
});
