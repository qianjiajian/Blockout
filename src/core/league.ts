import { RANKING_PLAYER_NAMES } from "./playerNames";
import { advanceLeagueOpponent, createLeagueOpponentProgress, LEAGUE_OPPONENT_MAX_CLEARED,
  type LeagueOpponentProgress } from "./leagueOpponent";

/** Independent league state. Times are epoch milliseconds, never host-local dates. */
export const LEAGUE_DAY_MS = 86_400_000;
export const LEAGUE_PERIOD_MS = 15 * LEAGUE_DAY_MS;
export const LEAGUE_TIERS = ["青铜", "白银", "黄金", "铂金", "翡翠", "钻石", "大师", "荣耀"] as const;
export type LeagueTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface LeagueBot {
  id: string; name: string; avatar: number; score: number;
  /** Missing on legacy saves; adopted without changing an already-earned score. */
  progress?: LeagueOpponentProgress;
}
export interface LeagueSeason {
  index: number; startMs: number; endMs: number; joinedMs: number;
  tier: LeagueTier; stars: number; score: number; cleared: number[]; bots: LeagueBot[];
  scoreHistory: { atMs: number; score: number }[];
}
export interface LeagueSettlement {
  seasonIndex: number; rank: number; score: number; coins: number;
  fromTier: LeagueTier; fromStars: number; toTier: LeagueTier; toStars: number;
}
export interface LeagueState {
  version: 1; anchorMs: number; seed: number; lastNowMs: number;
  season: LeagueSeason; pending?: LeagueSettlement;
}
export interface LeagueAccount { coins: number; league?: LeagueState }
export interface LeagueAttempt {
  seasonIndex: number; level: number; startedMs: number; specialIds: string[];
}
const REWARDS = [
  [300,240,200,150,80,40], [400,320,270,200,110,50],
  [550,440,360,270,150,70], [700,560,460,350,190,90],
  [900,720,600,450,250,120], [1150,920,760,570,320,150],
  [1450,1160,960,720,400,190], [1800,1440,1200,900,500,240],
];
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const validTime = (time: number) => { if (!Number.isSafeInteger(time) || time < 0) throw Error("Invalid league time"); return time; };
export const beijingMidnight = (now: number): number => Math.floor((validTime(now) + 8 * 3_600_000) / LEAGUE_DAY_MS) * LEAGUE_DAY_MS - 8 * 3_600_000;
export function leagueWindow(anchorMs: number, nowMs: number) {
  validTime(nowMs);
  const index = Math.max(0, Math.floor((nowMs - anchorMs) / LEAGUE_PERIOD_MS));
  return { index, startMs: anchorMs + index * LEAGUE_PERIOD_MS, endMs: anchorMs + (index + 1) * LEAGUE_PERIOD_MS };
}
function noise(seed: number, ...parts: number[]): number {
  let h = seed >>> 0;
  for (const part of parts) { h = Math.imul(h ^ part, 0x45d9f3b); h ^= h >>> 16; }
  return (h >>> 0) / 4294967296;
}
const LEAGUE_NAME_POOLS = [2, 3, 4, 5].map(length =>
  RANKING_PLAYER_NAMES.filter(name => Array.from(name).length === length),
);

/** The current nickname catalog also applies to already-saved seasons.
 * Assign before score sorting so each opponent keeps its name when its rank changes.
 * This is a display projection; it never migrates or writes account data.
 */
export function leagueBotNames(seed: number, seasonIndex: number): string[] {
  const usedNames = new Set<string>();
  return Array.from({ length: 49 }, (_, i) => {
    const pool = LEAGUE_NAME_POOLS[i % LEAGUE_NAME_POOLS.length];
    const start = Math.floor(noise(seed, seasonIndex, i, 1) * pool.length);
    for (let offset = 0; offset < pool.length; offset++) {
      const candidate = pool[(start + offset) % pool.length];
      if (usedNames.has(candidate)) continue;
      usedNames.add(candidate);
      return candidate;
    }
    throw Error("Insufficient unique league nicknames");
  });
}

function newSeason(state: Pick<LeagueState, "anchorMs" | "seed">, now: number, tier: LeagueTier, stars: number): LeagueSeason {
  const window = leagueWindow(state.anchorMs, now);
  const names = leagueBotNames(state.seed, window.index);
  return { ...window, joinedMs: now, tier, stars, score: 0, cleared: [], scoreHistory: [], bots: Array.from({ length: 49 }, (_, i) => ({
    id: `${window.index}:${i}`, name: names[i],
    avatar: Math.floor(noise(state.seed, window.index, i, 4) * 32),
    ...advanceLeagueOpponent({ score: 0, progress: createLeagueOpponentProgress(0, window.startMs) },
      i, state.seed, window.index, window.startMs, now),
  })) };
}
/** Tier is explicit until the initial-tier policy is confirmed. Seed is supplied once and persisted. */
export function createLeague(now: number, seed: number, tier: LeagueTier): LeagueState {
  validTime(now);
  if (!Number.isSafeInteger(seed) || seed < 0 || !LEAGUE_TIERS[tier]) throw Error("Invalid league initialization");
  const state = { version: 1 as const, anchorMs: beijingMidnight(now), seed, lastNowMs: now };
  return { ...state, season: newSeason(state, now, tier, 0) };
}
export function leagueRank(season: LeagueSeason): number { return 1 + season.bots.filter(bot => bot.score > season.score).length; }
export function leagueReward(tier: LeagueTier, rank: number, score: number): number {
  if (!Number.isInteger(rank) || rank < 1 || rank > 50 || !LEAGUE_TIERS[tier]) throw Error("Invalid league result");
  return score <= 0 ? 0 : REWARDS[tier][rank <= 3 ? rank - 1 : rank <= 10 ? 3 : rank <= 40 ? 4 : 5];
}
export function leaguePromotion(tier: LeagueTier, stars: number, rank: number) {
  leagueReward(tier, rank, 0);
  if (tier < 7) return { tier: Math.max(0, Math.min(7, tier + (rank <= 10 ? 1 : rank >= 41 ? -1 : 0))) as LeagueTier, stars: 0 };
  if (rank >= 41 && stars === 0) return { tier: 6 as LeagueTier, stars: 0 };
  return { tier, stars: Math.max(0, stars + (rank === 1 ? 5 : rank === 2 ? 3 : rank === 3 ? 2 : rank <= 10 ? 1 : rank >= 41 ? -2 : 0)) };
}
/** Independent, deterministic daily clear budgets split across Beijing hours.
 * No player score, score history or ranking feeds an opponent's progress. */
export function advanceLeague(input: LeagueState, time: number): LeagueState {
  validTime(time);
  const state = copy(input), now = Math.max(time, state.lastNowMs), s = state.season;
  if (state.pending) return state;
  const until = Math.min(now, s.endMs - 1);
  for (let i = 0; i < s.bots.length; i++) {
    const bot = s.bots[i];
    Object.assign(bot, advanceLeagueOpponent(bot, i, state.seed, s.index,
      Math.min(state.lastNowMs, s.endMs - 1), until));
  }
  state.lastNowMs = now;
  if (now >= s.endMs) {
    const rank = leagueRank(s), promotion = leaguePromotion(s.tier, s.stars, rank);
    state.pending = { seasonIndex: s.index, rank, score: s.score, coins: leagueReward(s.tier, rank, s.score), fromTier: s.tier, fromStars: s.stars, toTier: promotion.tier, toStars: promotion.stars };
  }
  return state;
}
/** Candidate includes coins + consumption marker together; caller verifies one account write. */
export function claimLeague<T extends LeagueAccount>(account: T, now: number): T {
  const candidate = copy(account);
  if (!candidate.league) return candidate;
  const state = advanceLeague(candidate.league, now);
  candidate.league = state;
  if (!state.pending) return candidate;
  candidate.coins += state.pending.coins;
  const effectiveNow = Math.max(now, state.lastNowMs);
  state.season = newSeason(state, effectiveNow, state.pending.toTier, state.pending.toStars);
  state.lastNowMs = effectiveNow;
  delete state.pending;
  return candidate;
}
export function startLeagueAttempt(state: LeagueState, level: number, now: number): LeagueAttempt {
  validTime(now);
  if (state.pending || now >= state.season.endMs || now < state.lastNowMs || !Number.isInteger(level) || level < 1 || level > 100 || state.season.cleared.includes(level)) throw Error("League challenge unavailable");
  return { seasonIndex: state.season.index, level, startedMs: now, specialIds: [] };
}
/** Called for a confirmed special-block removal, including removal by a booster. */
export function collectLeagueSpecial(attempt: LeagueAttempt, specialId: string): LeagueAttempt {
  if (!specialId || specialId.length > 128) throw Error("Invalid special block id");
  return { ...attempt, specialIds: [...new Set([...attempt.specialIds, specialId])] };
}
export function finishLeagueAttempt(input: LeagueState, attempt: LeagueAttempt, success: boolean, now: number) {
  const state = advanceLeague(input, now), s = state.season;
  if (!success) return { state, status: "discarded" as const, points: 0 };
  if (now < attempt.startedMs || now < input.lastNowMs || attempt.seasonIndex !== s.index || state.pending || now >= s.endMs) return { state, status: "expired" as const, points: 0 };
  if (!Number.isInteger(attempt.level) || attempt.level < 1 || attempt.level > 100) throw Error("Invalid league level");
  if (s.cleared.includes(attempt.level)) return { state, status: "duplicate" as const, points: 0 };
  const points = new Set(attempt.specialIds).size * 10;
  s.score += points; s.cleared.push(attempt.level);
  s.scoreHistory.push({ atMs: now, score: s.score });
  return { state, status: "credited" as const, points };
}
/** Fail closed: caller must preserve a malformed raw save for recovery, not reset it. */
export function parseLeague(value: unknown): LeagueState | undefined {
  if (value === undefined) return undefined;
  const s = value as LeagueState;
  const integer = (x: unknown) => typeof x === "number" && Number.isSafeInteger(x) && x >= 0;
  if (!s || s.version !== 1 || !integer(s.anchorMs) || !integer(s.seed) || !integer(s.lastNowMs) || !s.season) throw Error("Invalid league save");
  const season = s.season;
  if (![season.index, season.startMs, season.endMs, season.joinedMs, season.score, season.stars].every(integer)
    || !LEAGUE_TIERS[season.tier] || season.startMs !== s.anchorMs + season.index * LEAGUE_PERIOD_MS || season.endMs !== season.startMs + LEAGUE_PERIOD_MS
    || season.joinedMs < season.startMs || season.joinedMs >= season.endMs || s.lastNowMs < season.joinedMs
    || !Array.isArray(season.cleared) || new Set(season.cleared).size !== season.cleared.length || season.cleared.some(n => !Number.isInteger(n) || n < 1 || n > 100)
    || !Array.isArray(season.scoreHistory) || season.scoreHistory.length !== season.cleared.length || season.scoreHistory.some((h, i) => !integer(h.atMs) || !integer(h.score) || h.atMs < season.joinedMs || h.atMs >= season.endMs || (i > 0 && (h.atMs < season.scoreHistory[i-1].atMs || h.score < season.scoreHistory[i-1].score))) || (season.scoreHistory[season.scoreHistory.length - 1]?.score ?? 0) !== season.score
    || !Array.isArray(season.bots) || season.bots.length !== 49 || new Set(season.bots.map(b => b.id)).size !== 49
    || season.bots.some(b => typeof b.id !== "string" || typeof b.name !== "string" || !integer(b.avatar) || b.avatar >= 32 || !integer(b.score))) throw Error("Invalid league season save");
  const dayIndex = (atMs: number) => Math.floor((atMs + 8 * 3_600_000) / LEAGUE_DAY_MS);
  for (const bot of season.bots) {
    const progress = bot.progress;
    if (progress === undefined) continue;
    if (!progress || !integer(progress.cleared) || progress.cleared > LEAGUE_OPPONENT_MAX_CLEARED
      || !integer(progress.dayStartCleared) || progress.dayStartCleared > progress.cleared
      || !integer(progress.dayIndex)
      || progress.dayIndex !== dayIndex(Math.min(s.lastNowMs, season.endMs - 1))) throw Error("Invalid league opponent progress");
  }
  if (s.pending) {
    const p = s.pending, rank = leagueRank(season), promotion = leaguePromotion(season.tier, season.stars, rank);
    if (s.lastNowMs < season.endMs || p.seasonIndex !== season.index || p.rank !== rank || p.score !== season.score || p.coins !== leagueReward(season.tier, rank, season.score)
      || p.fromTier !== season.tier || p.fromStars !== season.stars || p.toTier !== promotion.tier || p.toStars !== promotion.stars) throw Error("Invalid league settlement save");
  }
  return copy(s);
}
