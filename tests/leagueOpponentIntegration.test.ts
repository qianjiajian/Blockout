import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clonePlainData as clone } from "../src/core/clonePlainData";
import {
  advanceLeague, claimLeague, collectLeagueSpecial, createLeague, finishLeagueAttempt,
  LEAGUE_DAY_MS, LEAGUE_PERIOD_MS, parseLeague, startLeagueAttempt, type LeagueState,
} from "../src/core/league";
import { LeagueAccountTransaction, reconcileLeagueAccount } from "../src/core/leagueAccount";
import { LEAGUE_LEVELS } from "../src/core/leagueLevelData";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

const HOUR = 3_600_000;
const START = Date.parse("2026-10-01T00:00:00+08:00");
const SEED = 12345;
const FORMAL_MAX_SCORE = LEAGUE_LEVELS.reduce((sum, level) => sum + level.specials.length * 10, 0);
const fresh = (time = START) => createLeague(time, SEED, 0);
const progress = (state: LeagueState, index = 0) => state.season.bots[index].progress!;

function advanceInSteps(input: LeagueState, until: number, step: number) {
  let state = input;
  for (let now = input.lastNowMs + step; now < until; now += step) state = advanceLeague(state, now);
  return advanceLeague(state, until);
}

function withPlayerScore(input: LeagueState, score: number) {
  const state = clone(input);
  state.season.score = score;
  state.season.cleared = score > 0 ? [1] : [];
  state.season.scoreHistory = score > 0 ? [{ atMs: state.season.joinedMs, score }] : [];
  return state;
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(START); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("league independent hourly opponent integration", () => {
  it("starts at zero at the first Beijing midnight and gives a late entrant the same elapsed opponent progress", () => {
    const midnight = fresh();
    expect(midnight.season.bots).toHaveLength(49);
    expect(midnight.season.bots.every(bot => bot.score === 0 && bot.progress?.cleared === 0)).toBe(true);
    const lateTime = START + 19 * HOUR + 31_337;
    const late = fresh(lateTime);
    const elapsed = advanceLeague(midnight, lateTime);
    expect(late.season.joinedMs).toBe(lateTime);
    expect(late.season.bots).toEqual(elapsed.season.bots);
    expect(late.season.bots.some(bot => bot.score > 0)).toBe(true);
    expect(parseLeague(late)).toEqual(late);
  });

  it.each([30, 3000, 900000])("ignores player score/history of %i at every common timestamp", score => {
    let quiet = fresh(START + 2 * HOUR);
    let strong = withPlayerScore(quiet, score);
    for (const elapsed of [7, 23, 48, 97, 211, 359]) {
      const at = START + elapsed * HOUR + 17_123;
      quiet = advanceLeague(quiet, at);
      strong = advanceLeague(strong, at);
      expect(strong.season.bots).toEqual(quiet.season.bots);
      expect(strong.season.bots.every(bot => bot.score <= FORMAL_MAX_SCORE)).toBe(true);
    }
  });

  it.each([HOUR, 17 * 60_000 + 113])("one catch-up equals repeated updates every %i ms, including non-hour times", step => {
    const initial = fresh(START + 83_177);
    const before = clone(initial);
    const end = START + 8 * LEAGUE_DAY_MS + 13 * HOUR + 91_731;
    expect(advanceInSteps(initial, end, step)).toEqual(advanceLeague(initial, end));
    expect(initial).toEqual(before);
  });

  it("a successful player clear changes player points while leaving the same-time opponent outcome independent", () => {
    const initial = fresh(START + 6 * HOUR);
    const at = START + 7 * HOUR;
    let attempt = startLeagueAttempt(initial, 1, initial.lastNowMs);
    for (const id of LEAGUE_LEVELS[0].specials) attempt = collectLeagueSpecial(attempt, id);
    const success = finishLeagueAttempt(initial, attempt, true, at);
    const fail = finishLeagueAttempt(initial, attempt, false, at);
    expect(success.status).toBe("credited");
    expect(success.points).toBe(LEAGUE_LEVELS[0].specials.length * 10);
    expect(fail.points).toBe(0);
    expect(success.state.season.bots).toEqual(fail.state.season.bots);
    expect(advanceLeague(success.state, at + 5 * LEAGUE_DAY_MS).season.bots)
      .toEqual(advanceLeague(fail.state, at + 5 * LEAGUE_DAY_MS).season.bots);
  });

  it("migrates old opponents from the saved time without repricing scores or replaying past hours", () => {
    const legacy = fresh(START + 7 * LEAGUE_DAY_MS + 13 * HOUR + 51_123);
    legacy.season.bots.forEach((bot, index) => {
      delete bot.progress;
      bot.score = [0, 75, FORMAL_MAX_SCORE, FORMAL_MAX_SCORE + 5000][index % 4];
    });
    const raw = clone(legacy);
    expect(parseLeague(raw)).toEqual(raw);
    const migrated = advanceLeague(parseLeague(raw)!, raw.lastNowMs);
    expect(migrated.season.bots.map(bot => bot.score)).toEqual(raw.season.bots.map(bot => bot.score));
    expect(migrated.season.bots.every(bot => bot.progress !== undefined)).toBe(true);
    expect(parseLeague(migrated)).toEqual(migrated);
    const later = advanceLeague(migrated, migrated.lastNowMs + 3 * LEAGUE_DAY_MS);
    later.season.bots.forEach((bot, index) => {
      const oldScore = raw.season.bots[index].score;
      expect(bot.score).toBeGreaterThanOrEqual(oldScore);
      if (oldScore >= FORMAL_MAX_SCORE) expect(bot.score).toBe(oldScore);
      else expect(bot.score).toBeLessThanOrEqual(FORMAL_MAX_SCORE);
      expect(bot.score % 10).toBe(oldScore % 10);
    });
    expect(raw).toEqual(legacy);
  });

  it("old-save catch-up is also invariant to refresh frequency after its one-time migration", () => {
    const old = fresh(START + 4 * LEAGUE_DAY_MS + 11 * HOUR + 41_931);
    old.season.bots.forEach((bot, index) => { delete bot.progress; bot.score = 75 + index * 20; });
    const end = START + 12 * LEAGUE_DAY_MS + 47_171;
    expect(advanceInSteps(old, end, 41 * 60_000 + 137)).toEqual(advanceLeague(old, end));
  });

  it("the real save sanitizer restores legacy identities and points without touching campaign or account balances", () => {
    const now = START + 8 * LEAGUE_DAY_MS + 11 * HOUR + 172;
    vi.setSystemTime(now);
    const old = fresh(now);
    old.season.bots.forEach((bot, index) => { delete bot.progress; bot.score = 75 + index * 10; });
    const game = Object.create(ColorEscapeGame.prototype) as any;
    const raw = {
      ...game.sanitizeSave(undefined), highestLevel: 21, currentLevel: 21, coins: 765,
      rewardedLevels: Array.from({ length: 20 }, (_, index) => index + 1), league: old,
    };
    const restored = game.sanitizeSave(raw);
    expect(restored.league.season.bots.map(({ progress: _progress, ...bot }: any) => bot)).toEqual(old.season.bots);
    expect(restored.league.season.bots.every((bot: any) => bot.progress)).toBe(true);
    expect(restored.highestLevel).toBe(21);
    expect(restored.currentLevel).toBe(21);
    expect(restored.coins).toBe(765);
    expect(restored.rewardedLevels).toEqual(raw.rewardedLevels);
    expect(restored.boosters).toEqual(raw.boosters);
    expect(old.season.bots.every(bot => bot.progress === undefined)).toBe(true);
  });

  it("caps the virtual clears at the formal 100-level total and leaves legacy excess scores intact", () => {
    const initial = fresh();
    const beforeLast = LEAGUE_LEVELS.slice(0, -1).reduce((sum, level) => sum + level.specials.length * 10, 0);
    initial.season.bots.forEach(bot => {
      bot.score = beforeLast;
      bot.progress = { ...bot.progress!, cleared: 99, dayStartCleared: 99 };
    });
    const capped = advanceLeague(initial, initial.season.endMs - 1);
    expect(capped.season.bots.every(bot => bot.progress?.cleared === 100 && bot.score === FORMAL_MAX_SCORE)).toBe(true);
    expect(parseLeague(capped)).toEqual(capped);
    const ended = advanceLeague(capped, initial.season.endMs + 9 * LEAGUE_PERIOD_MS);
    expect(ended.season.bots).toEqual(capped.season.bots);
  });

  it("ends opponent catch-up at the final millisecond, before the next Beijing day", () => {
    const initial = fresh(START + 3 * HOUR);
    const lastMoment = advanceLeague(initial, initial.season.endMs - 1);
    const ended = advanceLeague(initial, initial.season.endMs);
    expect(ended.season.bots).toEqual(lastMoment.season.bots);
    expect(ended.pending).toBeDefined();
    expect(ended.season.bots.every(bot => bot.progress!.dayIndex === progress(lastMoment).dayIndex)).toBe(true);
  });

  it("returns a frozen old pending season unchanged, including opponents without new progress", () => {
    const frozen = advanceLeague(withPlayerScore(fresh(), 30), START + LEAGUE_PERIOD_MS);
    frozen.season.bots.forEach(bot => { delete bot.progress; });
    expect(parseLeague(frozen)).toEqual(frozen);
    const before = clone(frozen);
    expect(advanceLeague(frozen, START + 10 * LEAGUE_PERIOD_MS)).toEqual(before);
    expect(frozen).toEqual(before);
  });

  it("settles only the joined season after a long absence and rebuilds current-season progress when claimed", () => {
    const initial = withPlayerScore(fresh(START + 4 * HOUR), 30);
    const now = START + 5 * LEAGUE_PERIOD_MS + 4 * LEAGUE_DAY_MS + 19 * HOUR + 137;
    const ended = advanceLeague(initial, now);
    expect(ended.season.index).toBe(0);
    expect(ended.pending?.seasonIndex).toBe(0);
    const account = { coins: 321, league: ended, mainlineMarker: [1, 2, 3] };
    const claimed = claimLeague(account, now);
    expect(claimed.coins).toBe(321 + ended.pending!.coins);
    expect(claimed.mainlineMarker).toEqual(account.mainlineMarker);
    expect(claimed.league.season.index).toBe(5);
    expect(claimed.league.season.score).toBe(0);
    expect(claimed.league.season.joinedMs).toBe(now);
    expect(claimed.league.pending).toBeUndefined();
    expect(claimed.league.season.bots.every(bot => bot.progress!.cleared >= 0 && bot.score <= FORMAL_MAX_SCORE)).toBe(true);
    expect(claimed.league.season.bots.some(bot => bot.score > 0)).toBe(true);
    const earlyFrozen = advanceLeague(initial, initial.season.endMs);
    const joinedAtBoundary = claimLeague({ ...account, league: earlyFrozen }, claimed.league.season.startMs);
    expect(joinedAtBoundary.league.season.joinedMs).toBe(claimed.league.season.startMs);
    expect(joinedAtBoundary.league.season.bots.every(bot => bot.score === 0)).toBe(true);
    expect(advanceLeague(joinedAtBoundary.league, now).season.bots).toEqual(claimed.league.season.bots);
    expect(claimLeague(claimed, now)).toEqual(claimed);
    expect(parseLeague(claimed.league)).toEqual(claimed.league);
  });

  it("retains one immutable unknown refresh candidate across later hours, then catches up only on the next transaction", () => {
    let account = { coins: 123, league: fresh(), mainlineMarker: 8 };
    const baseline = clone(account);
    const writes: typeof account[] = [];
    let outcome: "unknown" | "committed" = "unknown";
    const tx = new LeagueAccountTransaction(() => account,
      candidate => { writes.push(candidate); return outcome; }, candidate => { account = candidate; });
    const firstTime = START + 5 * HOUR;
    tx.commit(value => reconcileLeagueAccount(value, true, firstTime, SEED));
    expect(account).toEqual(baseline);
    expect(tx.pending).toBe(true);
    const firstCandidate = tx.pendingCandidate;
    const laterTime = START + 4 * LEAGUE_DAY_MS;
    outcome = "committed";
    tx.commit(value => reconcileLeagueAccount(value, true, laterTime, SEED));
    expect(writes[1]).toBe(writes[0]);
    expect(account).toBe(firstCandidate);
    expect(account.league.lastNowMs).toBe(firstTime);
    tx.commit(value => reconcileLeagueAccount(value, true, laterTime, SEED));
    expect(account.league).toEqual(advanceLeague(baseline.league, laterTime));
    expect(account.coins).toBe(123);
    expect(account.mainlineMarker).toBe(8);
  });

  it.each([
    { cleared: -1 }, { cleared: 101 }, { cleared: 1.5 }, { cleared: Number.NaN },
    { dayStartCleared: -1 }, { dayStartCleared: 101 }, { dayStartCleared: 1 },
    { dayIndex: -1 }, { dayIndex: Number.MAX_SAFE_INTEGER }, { dayIndex: 1.5 },
  ])("rejects malformed opponent progress %j instead of silently resetting the save", changes => {
    const state = fresh();
    state.season.bots[0].progress = { ...progress(state), ...changes };
    expect(() => parseLeague(state)).toThrow();
  });

  it("rejects a stale day marker inside the season instead of resetting today's quota on restore", () => {
    const state = advanceLeague(fresh(), START + 2 * LEAGUE_DAY_MS + 12 * HOUR);
    expect(parseLeague(state)).toEqual(state);
    state.season.bots[0].progress = { ...progress(state), dayIndex: progress(state).dayIndex - 1 };
    expect(state.season.bots[0].progress.dayIndex).toBeGreaterThan(progress(fresh()).dayIndex);
    expect(() => parseLeague(state)).toThrow();
    delete state.season.bots[0].progress;
    expect(parseLeague(state)).toEqual(state);
  });

  it("does not reverse opponent time or scores when the host clock moves backwards", () => {
    const state = advanceLeague(fresh(), START + 8 * LEAGUE_DAY_MS + 11 * HOUR);
    expect(advanceLeague(state, START + HOUR)).toEqual(state);
  });
});

describe("open league page keeps its ranking snapshot stable", () => {
  function frameGame() {
    const game = Object.create(ColorEscapeGame.prototype) as any;
    game.save = { league: fresh() };
    game.screen = "league";
    game.appVisible = true;
    game.shellArtReady = false;
    game.leagueFrameSecond = -1;
    game.leagueScroll = { cancel: vi.fn() };
    game.leagueSettlementArtStore = { request: vi.fn(), dispose: vi.fn() };
    game.syncMusic = vi.fn();
    game.refreshLeague = vi.fn((now: number) => {
      game.save.league = advanceLeague(game.save.league, now);
      return "committed";
    });
    return game;
  }

  it("updates countdown dirtiness but does not periodically refresh or reorder during the open session", () => {
    const game = frameGame();
    const before = clone(game.save.league);
    for (const elapsed of [1, 60, 3599, 3600, 7200, 86400]) {
      vi.setSystemTime(START + elapsed * 1000);
      game.dirty = false;
      game.frame(elapsed * 1000);
      expect(game.dirty).toBe(true);
      expect(game.leagueFrameSecond).toBe(Math.floor(Date.now() / 1000));
      expect(game.save.league).toEqual(before);
    }
    expect(game.refreshLeague).not.toHaveBeenCalled();
  });

  it("still refreshes at the season boundary and freezes the resulting settlement", () => {
    const game = frameGame();
    const end = game.save.league.season.endMs;
    vi.setSystemTime(end);
    game.frame(1);
    expect(game.refreshLeague).toHaveBeenCalledExactlyOnceWith(end);
    expect(game.save.league.pending).toBeDefined();
    expect(game.leagueScroll.cancel).toHaveBeenCalledTimes(1);
    expect(game.leagueSettlementArtStore.request).toHaveBeenCalledTimes(1);
    const frozen = clone(game.save.league);
    vi.setSystemTime(end + 3 * LEAGUE_PERIOD_MS);
    game.frame(2);
    expect(game.refreshLeague).toHaveBeenCalledTimes(1);
    expect(game.save.league).toEqual(frozen);
    expect(game.leagueSettlementArtStore.request).toHaveBeenCalledTimes(1);
  });

  it("does not refresh while hidden or while persistence acknowledgement is unknown", () => {
    const game = frameGame();
    vi.setSystemTime(game.save.league.season.endMs);
    game.appVisible = false;
    game.frame(1);
    game.appVisible = true;
    game.leaguePersistence = "unknown";
    game.frame(2);
    expect(game.refreshLeague).not.toHaveBeenCalled();
  });
});
