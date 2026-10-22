import { localizedRankingPlayerName, rankingLanguage, RANKING_PLAYER_NAMES } from "./playerNames";
import { PROFILE_AVATAR_COUNT, PROFILE_FRAME_COUNT } from "./playerProfile";
import type { OpponentType } from "./opponentPacing";
import { LEADERBOARD_PROVINCES, normalizeLeaderboardProvince } from "./rankingProvince";
import {
  beijingWeekStartMs,
  mainlineOpponentProgressAt,
} from "./mainlineOpponents";
export { beijingWeekStartMs } from "./mainlineOpponents";

export const META_LEADERBOARD_MAX_LEVEL = 200;
export const META_LEADERBOARD_MAX_STARS = META_LEADERBOARD_MAX_LEVEL * 3;
export const META_LEADERBOARD_MAX_BOT_STARS = META_LEADERBOARD_MAX_STARS;
export const META_LEADERBOARD_BOT_COUNT = 99;
export const META_LEADERBOARD_BEIJING_HOUR_MS = 3_600_000;

export const META_LEADERBOARD_MODES = ["weekly", "world", "country"] as const;
export type MetaLeaderboardMode = (typeof META_LEADERBOARD_MODES)[number];

export const META_LEADERBOARD_AVATARS = Object.freeze(Array.from({ length: PROFILE_AVATAR_COUNT }, (_, index) => index));
export type MetaLeaderboardAvatar = (typeof META_LEADERBOARD_AVATARS)[number];

export interface MetaLeaderboardEntry {
  id: string;
  name: string;
  avatar: MetaLeaderboardAvatar;
  frame: number;
  totalStars: number;
  isPlayer: boolean;
  rank: number;
  lifetimeStars?: number;
  weeklyStars?: number;
  cleared?: number;
  province?: string;
}

export interface MetaLeaderboardPlayer {
  id: string;
  name: string;
  avatar: MetaLeaderboardAvatar;
  frame: number;
  totalStars: number;
}

export interface MetaLeaderboardSnapshot {
  mode: MetaLeaderboardMode;
  source: string;
  entries: readonly MetaLeaderboardEntry[];
  player: MetaLeaderboardEntry;
  totalPlayers: number;
}

/** Complete display order; the source keeps the pinned player separately. */
export const metaLeaderboardDisplayEntries = (
  snapshot: MetaLeaderboardSnapshot,
): readonly MetaLeaderboardEntry[] => [
  ...snapshot.entries.filter((entry) => !entry.isPlayer && entry.id !== snapshot.player.id),
  snapshot.player,
].sort((left, right) => left.rank - right.rank);

/**
 * Synchronous boundary consumed by the canvas renderer. A future network
 * adapter can keep its latest server response in a cache and expose it through
 * this same interface without changing the leaderboard UI.
 */
export interface MetaLeaderboardSource {
  readonly id: string;
  getSnapshot(mode: MetaLeaderboardMode, player: MetaLeaderboardPlayer, clock?: MetaLeaderboardClock): MetaLeaderboardSnapshot;
}

export interface MetaLeaderboardClock {
  readonly nowMs: number;
  readonly groupCreatedAtMs: number;
  readonly province?: string;
  readonly weeklyStars?: number;
  readonly weekBaselineMs?: number;
  /** Locale captured from the player's first device session. */
  readonly opponentLanguage?: string;
}

/**
 * These fields accept unknown values because local save data crosses a storage
 * boundary. They are normalized before being handed to any leaderboard source.
 */
export interface MetaLeaderboardInput {
  highestLevel: unknown;
  bestStars?: Readonly<Record<string, unknown>> | null;
  playerId?: unknown;
  playerName?: unknown;
  playerAvatar?: unknown;
  playerFrame?: unknown;
  nowMs?: unknown;
  groupCreatedAtMs?: unknown;
  province?: string;
  weeklyStars?: number;
  weekBaselineMs?: number;
  /** Locale used for generated opponent display names. */
  opponentLanguage?: string;
}

export const META_LEADERBOARD_LABELS: Readonly<Record<MetaLeaderboardMode, string>> = {
  weekly: "Weekly",
  world: "National",
  country: "Province",
};

const PLACEHOLDER_NAMES = RANKING_PLAYER_NAMES;

const chineseCount = (name: string): number => (name.match(/[\u3400-\u9fff]/g) ?? []).length;
const DIVERSE_PLACEHOLDER_NAMES = (() => {
  const buckets = [2, 3, 4, 5].map((length) => PLACEHOLDER_NAMES.filter((name) => chineseCount(name) === length));
  const result: string[] = [];
  let cursor = 0;
  while (result.length < PLACEHOLDER_NAMES.length) {
    const bucket = buckets[cursor % buckets.length];
    const next = bucket.shift();
    if (next) result.push(next);
    cursor += 1;
    if (cursor > PLACEHOLDER_NAMES.length * 8) break;
  }
  return result;
})();

const clampInteger = (value: unknown, minimum: number, maximum: number, fallback: number): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(numeric)));
};

const appearanceIndex = (value: unknown, count: number): number => (
  typeof value === "number" ? clampInteger(value, 0, count - 1, 0) : 0
);

const sanitizeText = (value: unknown, fallback: string, maximumLength: number): string => {
  if (typeof value !== "string") return fallback;
  const compact = value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
  return compact || fallback;
};

const safeEpoch = (value: unknown, fallback: number): number => (
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : fallback
);

const sanitizePlayer = (input: MetaLeaderboardInput): MetaLeaderboardPlayer => {
  const highestLevel = clampInteger(input.highestLevel, 1, META_LEADERBOARD_MAX_LEVEL, 1);
  let totalStars = 0;
  if (input.bestStars && typeof input.bestStars === "object") {
    Object.entries(input.bestStars).forEach(([key, rawStars]) => {
      if (!/^[1-9]\d*$/.test(key)) return;
      const level = Number(key);
      if (!Number.isSafeInteger(level) || level > highestLevel || level > META_LEADERBOARD_MAX_LEVEL) return;
      totalStars += clampInteger(rawStars, 0, 3, 0);
    });
  }

  return {
    id: sanitizeText(input.playerId, "local-player", 48),
    name: sanitizeText(input.playerName, "Klip", 16),
    avatar: appearanceIndex(input.playerAvatar, PROFILE_AVATAR_COUNT),
    frame: appearanceIndex(input.playerFrame, PROFILE_FRAME_COUNT),
    totalStars: Math.min(META_LEADERBOARD_MAX_STARS, totalStars),
  };
};

const placeholderName = (rank: number): string => {
  if (rank <= DIVERSE_PLACEHOLDER_NAMES.length) return DIVERSE_PLACEHOLDER_NAMES[rank - 1];
  const base = DIVERSE_PLACEHOLDER_NAMES[(rank - 1) % DIVERSE_PLACEHOLDER_NAMES.length];
  return `${base}${Math.ceil(rank / PLACEHOLDER_NAMES.length)}`;
};

const localizedIdentityName = (identity: MainlineOpponentIdentity, language: unknown): string => {
  const locale = rankingLanguage(language);
  // Keep the established Chinese ordering for existing saves and screenshots.
  if (locale === "zh-CN" && identity.nameIndex < 100) return placeholderName(identity.nameIndex);
  // The Chinese local roster historically used a separate poetic catalog; keep
  // it for continuity while all other locales use their native catalog.
  if (locale === "zh-CN" && identity.nameIndex >= 100) {
    return LOCAL_OPPONENT_NAMES[(identity.nameIndex - 100) % LOCAL_OPPONENT_NAMES.length];
  }
  return localizedRankingPlayerName(locale, identity.nameIndex);
};

interface MainlineOpponentIdentity {
  id: string;
  /** Stable ordinal used only to project a localized display name. */
  nameIndex: number;
  avatar: number;
  frame: number;
  type: OpponentType;
  province: string;
}

const TYPES: readonly OpponentType[] = ["casual", "steady", "active", "expert"];
const NATIONAL_TYPE_COUNTS = [20, 30, 35, 14] as const;
const PROVINCE_TYPE_COUNTS = [40, 35, 20, 4] as const;
const typeAt = (index: number): OpponentType => {
  let offset = 0;
  for (let typeIndex = 0; typeIndex < TYPES.length; typeIndex += 1) {
    offset += NATIONAL_TYPE_COUNTS[typeIndex];
    if (index < offset) return TYPES[typeIndex];
  }
  return "expert";
};

const NATIONAL_OPPONENTS: readonly MainlineOpponentIdentity[] = Array.from({ length: META_LEADERBOARD_BOT_COUNT }, (_, index) => ({
  id: `meta-bot-${String(index + 1).padStart(2, "0")}`,
  nameIndex: index + 1,
  avatar: META_LEADERBOARD_AVATARS[index % META_LEADERBOARD_AVATARS.length],
  frame: 0,
  type: typeAt(index),
  province: LEADERBOARD_PROVINCES[index % LEADERBOARD_PROVINCES.length].code,
}));

// A local-only identity must not look like a national identity with a different
// score when switching tabs. Keep this pool separate from the league name list.
const LOCAL_OPPONENT_NAMES: readonly string[] = (() => {
  const prefixes = ["岚", "禾", "鹿", "晴", "竹", "墨", "星", "月", "海棠", "银杏", "栀子", "青竹", "松林", "云溪", "晓月", "远帆", "晚星", "木棉", "石榴", "雪松", "山茶", "听雨", "南栀", "野鹤"];
  const endings = ["汀", "川", "梦", "游", "微风", "晴空", "拾光", "小径", "听风", "漫游", "星河", "问月", "归途", "慢行", "小屋", "晚照", "望远山", "听晚风", "伴星行", "看云归"];
  const used = new Set(NATIONAL_OPPONENTS.map((bot) => placeholderName(bot.nameIndex)));
  const buckets = [2, 3, 4, 5].map(() => [] as string[]);
  for (const prefix of prefixes) for (const ending of endings) {
    const name = `${prefix}${ending}`;
    if (used.has(name)) continue;
    used.add(name);
    buckets[name.length - 2].push(name);
  }
  const names: string[] = [];
  while (buckets.some((bucket) => bucket.length)) for (const bucket of buckets) {
    const next = bucket.shift();
    if (next) names.push(next);
  }
  return names;
})();

const provinceRosters = new Map<string, readonly MainlineOpponentIdentity[]>();
const provinceOpponents = (province: string): readonly MainlineOpponentIdentity[] => {
  const cached = provinceRosters.get(province);
  if (cached) return cached;
  const result = NATIONAL_OPPONENTS.filter((bot) => bot.province === province);
  const usedNames = new Set(result.map((bot) => localizedIdentityName(bot, "zh-CN")));
  const provinceIndex = LEADERBOARD_PROVINCES.findIndex((entry) => entry.code === province);
  let nameCursor = provinceIndex * 7;
  let localIndex = 0;
  for (let typeIndex = 0; typeIndex < TYPES.length; typeIndex += 1) {
    const type = TYPES[typeIndex];
    const remaining = PROVINCE_TYPE_COUNTS[typeIndex] - result.filter((bot) => bot.type === type).length;
    for (let index = 0; index < remaining; index += 1) {
      let name: string;
      do {
        name = LOCAL_OPPONENT_NAMES[nameCursor % LOCAL_OPPONENT_NAMES.length];
        nameCursor += 1;
      } while (usedNames.has(name));
      usedNames.add(name);
      localIndex += 1;
      result.push({
        id: `meta-province-${province}-${String(localIndex).padStart(2, "0")}`,
        nameIndex: 100 + nameCursor - 1,
        avatar: (localIndex - 1 + provinceIndex) % META_LEADERBOARD_AVATARS.length,
        frame: 0,
        type,
        province,
      });
    }
  }
  provinceRosters.set(province, result);
  return result;
};

const nationalCandidates = (province: string | undefined): readonly MainlineOpponentIdentity[] => {
  if (!province) return NATIONAL_OPPONENTS;
  const candidates = new Map(NATIONAL_OPPONENTS.map((identity) => [identity.id, identity]));
  for (const identity of provinceOpponents(province)) {
    if (!candidates.has(identity.id)) candidates.set(identity.id, identity);
  }
  return [...candidates.values()];
};

const compareLeaderboardEntries = (left: MetaLeaderboardEntry, right: MetaLeaderboardEntry): number => (
  right.totalStars - left.totalStars
  || Number(right.isPlayer) - Number(left.isPlayer)
  || left.id.localeCompare(right.id)
);

const buildPlaceholderEntries = (
  mode: MetaLeaderboardMode,
  player: MetaLeaderboardPlayer,
  clock: MetaLeaderboardClock,
): MetaLeaderboardEntry[] => {
  const confirmedProvince = normalizeLeaderboardProvince(clock.province);
  const province = confirmedProvince ?? "11";
  const nowMs = Math.max(clock.nowMs, clock.groupCreatedAtMs);
  const weekStart = beijingWeekStartMs(nowMs);
  const baselineMs = Math.min(nowMs, Math.max(weekStart, clock.groupCreatedAtMs,
    safeEpoch(clock.weekBaselineMs, weekStart)));
  const roster = mode === "world" ? nationalCandidates(confirmedProvince) : provinceOpponents(province);
  const bots = roster.map((identity) => {
    const current = mainlineOpponentProgressAt(identity.id, identity.type, clock.groupCreatedAtMs, nowMs);
    const baseline = mainlineOpponentProgressAt(identity.id, identity.type, clock.groupCreatedAtMs, baselineMs);
    const weeklyStars = Math.max(0, current.stars - baseline.stars);
    return {
      id: identity.id,
      name: localizedIdentityName(identity, clock.opponentLanguage),
      avatar: identity.avatar,
      frame: identity.frame,
      province: identity.province,
      cleared: current.cleared,
      lifetimeStars: current.stars,
      weeklyStars,
      totalStars: mode === "weekly" ? weeklyStars : current.stars,
      isPlayer: false,
      rank: 0,
    } satisfies MetaLeaderboardEntry;
  });
  // Select opponents before inserting the player, so changing the player's
  // score cannot change the candidates or the 99 selected opponents.
  const selectedBots = mode === "world"
    ? bots.sort(compareLeaderboardEntries).slice(0, META_LEADERBOARD_BOT_COUNT) : bots;
  const weeklyStars = clampInteger(clock.weeklyStars, 0, player.totalStars, 0);
  return [...selectedBots, { ...player, province: mode === "world" ? confirmedProvince : province,
    lifetimeStars: player.totalStars, weeklyStars,
    totalStars: mode === "weekly" ? weeklyStars : player.totalStars, isPlayer: true, rank: 0 }]
    .sort(compareLeaderboardEntries)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export const PLACEHOLDER_META_LEADERBOARD_SOURCE: MetaLeaderboardSource = {
  // Keep the replaceable source identifier stable for existing host tooling;
  // the old fixed-rank behavior is removed by the snapshot itself.
  id: "placeholder-v1",
  getSnapshot(mode, player, clock) {
    const nowMs = clock?.nowMs ?? Date.now();
    const groupCreatedAtMs = clock?.groupCreatedAtMs ?? nowMs;
    const entries = buildPlaceholderEntries(mode, player, { ...clock, nowMs, groupCreatedAtMs });
    return {
      mode,
      source: this.id,
      entries: entries.filter((entry) => !entry.isPlayer),
      player: entries.find((entry) => entry.isPlayer)!,
      totalPlayers: 100,
    };
  },
};

export const buildMetaLeaderboard = (
  mode: MetaLeaderboardMode,
  input: MetaLeaderboardInput,
  source: MetaLeaderboardSource = PLACEHOLDER_META_LEADERBOARD_SOURCE,
): MetaLeaderboardSnapshot => {
  const safeMode: MetaLeaderboardMode = META_LEADERBOARD_MODES.includes(mode) ? mode : "world";
  const nowMs = safeEpoch(input.nowMs, Date.now());
  const groupCreatedAtMs = safeEpoch(input.groupCreatedAtMs, nowMs);
  return source.getSnapshot(safeMode, sanitizePlayer(input), { nowMs, groupCreatedAtMs,
    province: input.province, weeklyStars: input.weeklyStars, weekBaselineMs: input.weekBaselineMs,
    opponentLanguage: input.opponentLanguage });
};

export const buildAllMetaLeaderboards = (
  input: MetaLeaderboardInput,
  source: MetaLeaderboardSource = PLACEHOLDER_META_LEADERBOARD_SOURCE,
): Record<MetaLeaderboardMode, MetaLeaderboardSnapshot> => ({
  weekly: buildMetaLeaderboard("weekly", input, source),
  world: buildMetaLeaderboard("world", input, source),
  country: buildMetaLeaderboard("country", input, source),
});
