export const META_LEADERBOARD_MAX_LEVEL = 200;
export const META_LEADERBOARD_MAX_STARS = META_LEADERBOARD_MAX_LEVEL * 3;
export const META_LEADERBOARD_PLACEHOLDER_PLAYER_RANK = 66;

export const META_LEADERBOARD_MODES = ["weekly", "world", "country"] as const;
export type MetaLeaderboardMode = (typeof META_LEADERBOARD_MODES)[number];

export const META_LEADERBOARD_AVATARS = ["fox", "raccoon", "panda", "rabbit", "cat"] as const;
export type MetaLeaderboardAvatar = (typeof META_LEADERBOARD_AVATARS)[number];

export interface MetaLeaderboardEntry {
  id: string;
  name: string;
  avatar: MetaLeaderboardAvatar;
  totalStars: number;
  isPlayer: boolean;
  rank: number;
}

export interface MetaLeaderboardPlayer {
  id: string;
  name: string;
  avatar: MetaLeaderboardAvatar;
  totalStars: number;
}

export interface MetaLeaderboardSnapshot {
  mode: MetaLeaderboardMode;
  source: string;
  entries: readonly MetaLeaderboardEntry[];
  player: MetaLeaderboardEntry;
  totalPlayers: number;
}

/**
 * Synchronous boundary consumed by the canvas renderer. A future network
 * adapter can keep its latest server response in a cache and expose it through
 * this same interface without changing the leaderboard UI.
 */
export interface MetaLeaderboardSource {
  readonly id: string;
  getSnapshot(mode: MetaLeaderboardMode, player: MetaLeaderboardPlayer): MetaLeaderboardSnapshot;
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
}

export const META_LEADERBOARD_LABELS: Readonly<Record<MetaLeaderboardMode, string>> = {
  weekly: "Weekly",
  world: "World",
  country: "Country",
};

const PLACEHOLDER_NAMES = [
  "Mia",
  "Hed",
  "Kai",
  "Hedgehog",
  "Popner",
  "Kliphaked",
  "Nola",
  "Max",
  "Luna",
  "Theo",
  "Milo",
  "Ava",
  "Leo",
  "Ruby",
  "Finn",
  "Nico",
  "Ivy",
  "Zoe",
  "Remy",
  "Coco",
] as const;

const PLACEHOLDER_AVATARS: readonly MetaLeaderboardAvatar[] = [
  "fox",
  "raccoon",
  "panda",
  "cat",
  "rabbit",
  "cat",
];

const clampInteger = (value: unknown, minimum: number, maximum: number, fallback: number): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.floor(numeric)));
};

const sanitizeText = (value: unknown, fallback: string, maximumLength: number): string => {
  if (typeof value !== "string") return fallback;
  const compact = value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
  return compact || fallback;
};

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

  const avatar = META_LEADERBOARD_AVATARS.includes(input.playerAvatar as MetaLeaderboardAvatar)
    ? input.playerAvatar as MetaLeaderboardAvatar
    : "cat";

  return {
    id: sanitizeText(input.playerId, "local-player", 48),
    name: sanitizeText(input.playerName, "Klip", 16),
    avatar,
    totalStars: Math.min(META_LEADERBOARD_MAX_STARS, totalStars),
  };
};

const placeholderName = (rank: number): string => {
  if (rank <= PLACEHOLDER_NAMES.length) return PLACEHOLDER_NAMES[rank - 1];
  const base = PLACEHOLDER_NAMES[(rank - 1) % PLACEHOLDER_NAMES.length];
  return `${base}${Math.ceil(rank / PLACEHOLDER_NAMES.length)}`;
};

const placeholderStars = (rank: number, playerStars: number, mode: MetaLeaderboardMode): number => {
  const scopeNudge = mode === "weekly" ? 2 : mode === "country" ? 1 : 0;
  if (rank < META_LEADERBOARD_PLACEHOLDER_PLAYER_RANK) {
    const headroom = META_LEADERBOARD_MAX_STARS - playerStars;
    const step = Math.max(1, Math.ceil(headroom / (META_LEADERBOARD_PLACEHOLDER_PLAYER_RANK - 1)));
    return Math.min(
      META_LEADERBOARD_MAX_STARS,
      playerStars + (META_LEADERBOARD_PLACEHOLDER_PLAYER_RANK - rank) * step + scopeNudge,
    );
  }
  const step = Math.max(1, Math.ceil(Math.max(1, playerStars) / 34));
  return Math.max(0, playerStars - (rank - META_LEADERBOARD_PLACEHOLDER_PLAYER_RANK) * step - scopeNudge);
};

const buildPlaceholderEntries = (
  mode: MetaLeaderboardMode,
  player: MetaLeaderboardPlayer,
): MetaLeaderboardEntry[] => Array.from({ length: 100 }, (_, index) => index + 1)
  .filter((rank) => rank !== META_LEADERBOARD_PLACEHOLDER_PLAYER_RANK)
  .map((rank) => ({
    id: `placeholder-${mode}-${rank}`,
    name: placeholderName(rank),
    avatar: PLACEHOLDER_AVATARS[(rank - 1) % PLACEHOLDER_AVATARS.length],
    totalStars: placeholderStars(rank, player.totalStars, mode),
    isPlayer: false,
    rank,
  }));

export const PLACEHOLDER_META_LEADERBOARD_SOURCE: MetaLeaderboardSource = {
  id: "placeholder-v1",
  getSnapshot(mode, player) {
    return {
      mode,
      source: this.id,
      entries: buildPlaceholderEntries(mode, player),
      player: {
        ...player,
        isPlayer: true,
        rank: META_LEADERBOARD_PLACEHOLDER_PLAYER_RANK,
      },
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
  return source.getSnapshot(safeMode, sanitizePlayer(input));
};

export const buildAllMetaLeaderboards = (
  input: MetaLeaderboardInput,
  source: MetaLeaderboardSource = PLACEHOLDER_META_LEADERBOARD_SOURCE,
): Record<MetaLeaderboardMode, MetaLeaderboardSnapshot> => ({
  weekly: buildMetaLeaderboard("weekly", input, source),
  world: buildMetaLeaderboard("world", input, source),
  country: buildMetaLeaderboard("country", input, source),
});
