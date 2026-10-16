import { MECHANISM_GUIDE } from "./mechanismCatalog";
import { LEVELS } from "./levels";
import {
  FORMAL_DAILY_CHALLENGE_SCHEMA_VERSION,
  FORMAL_DAILY_CHALLENGE_REVISION,
  getFormalDailyChallengeAssignments,
  getFormalDailyChallengeCandidate,
  getFormalDailyChallengeLevel,
} from "./formalDailyChallengeData";
import type { Difficulty, LevelSpec } from "./types";

/**
 * Daily Challenge is deliberately separate from campaign progression. A slot
 * points at a campaign source only for audit/provenance; the runtime loads an
 * immutable explicitly certified LevelSpec and never mutates the source.
 */
export type DailyChallengeDifficulty = 1 | 2 | 3;
export const DAILY_CHALLENGE_DIFFICULTIES: readonly DailyChallengeDifficulty[] = [1, 2, 3];
export const DAILY_CHALLENGE_POOL_SIZE = 10;
export const DAILY_CHALLENGE_MAX_ATTEMPTS = 5;
const DAILY_CHALLENGE_DAY_MS = 24 * 60 * 60 * 1000;
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

export interface DailyChallengeReward {
  coins: number;
  inspiration: number;
}

export const DAILY_CHALLENGE_REWARDS: Readonly<Record<DailyChallengeDifficulty, DailyChallengeReward>> = Object.freeze({
  1: Object.freeze({ coins: 50, inspiration: 20 }),
  2: Object.freeze({ coins: 100, inspiration: 50 }),
  3: Object.freeze({ coins: 200, inspiration: 100 }),
});

export interface DailyChallengeAssignment {
  /** Stable id within the day; source level remains a mainline level id. */
  id: string;
  sourceLevelId: number;
  /** Repeated source levels are independent adapted variants in the pool. */
  variant: number;
  /** Fresh certified lower bound; pending test fixtures use zero, not a target. */
  minimumRepositionMoves: number;
  sourceDifficulty: Difficulty;
  catalogRevision?: string;
  /** Historical recipe field; explicit-certified-v2 does not derive a level. */
  layoutVariant?: number;
  /** Schema2 SHA-256 of the entire mainline source object used for this slot. */
  sourceLayoutSha256?: string;
  /** Schema2 SHA-256 of the entire immutable certified LevelSpec. */
  layoutSha256?: string;
  /** Catalogue assertion that the derived semantic layout differs from source. */
  layoutDiffersFromSource?: boolean;
  /** SHA-256 fingerprints for the colour-independent spatial layout audit. */
  sourceGeometrySha256?: string;
  geometrySha256?: string;
  geometryDiffersFromSource?: boolean;
  /** Legacy values may be sanitized but are never admitted by production. */
  layoutFactory?: "seam-chambers-v1" | "explicit-certified-v2";
  chamberCount?: number;
  dailyMechanisms?: readonly string[];
  /** Lower-bound evidence is required before a slot can be called formal. */
  proofStatus?: "threshold-proven" | "same-object-verified-v2" | "pending";
}

export interface DailyChallengeAssignments {
  1: DailyChallengeAssignment[];
  2: DailyChallengeAssignment[];
  3: DailyChallengeAssignment[];
}

export interface DailyChallengeSelected {
  1: number;
  2: number;
  3: number;
}

export interface DailyChallengeCompletionFlags {
  1: boolean;
  2: boolean;
  3: boolean;
}

export interface DailyChallengeState {
  version: 2;
  /** Content correction identity, separate from the fixed daily slot draw. */
  catalogRevision?: string;
  /** Beijing (UTC+8) calendar key. A challenge stage is locked for this whole day. */
  dayKey: string;
  /** Clock rollback guard shared with the existing daily-task model. */
  maxObservedDayKey: string;
  /** Stage is derived from actual mechanism unlocks at the day boundary. */
  stageKey: string;
  stageUnlockLevel: number;
  unlockedMechanisms: string[];
  pools: DailyChallengeAssignments;
  selected: DailyChallengeSelected;
  /** A persisted per-player seed keeps same-day selection stable and player-specific. */
  playerSeed: number;
  attemptsRemaining: number;
  /** Consumption audit timestamp only; elapsed time never replenishes attempts. */
  lastAttemptAtMs: number;
  completed: DailyChallengeCompletionFlags;
  rewarded: DailyChallengeCompletionFlags;
}

export interface DailyChallengeAttemptResult {
  state: DailyChallengeState;
  accepted: boolean;
  attemptsRemaining: number;
}

export interface DailyChallengeCompletionResult {
  state: DailyChallengeState;
  reward: DailyChallengeReward;
  firstCompletion: boolean;
}

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DIFFICULTY_KEYS: readonly DailyChallengeDifficulty[] = [1, 2, 3];
const MECHANISM_IDS = new Set(MECHANISM_GUIDE.map(({ id }) => id));
const MECHANISM_UNLOCKS = new Map(MECHANISM_GUIDE.map(({ id, unlockLevel }) => [id, unlockLevel]));

const validDayKey = (value: unknown): value is string => {
  if (typeof value !== "string" || !DAY_KEY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const dailyChallengeDayKey = (date = new Date()): string => {
  return new Date(date.getTime() + BEIJING_OFFSET_MS).toISOString().slice(0, 10);
};

/** Fixed UTC+8 midnight, independent of the device's time zone or DST. */
export const millisecondsUntilNextDailyChallengeDay = (date = new Date()): number => {
  const shiftedMs = date.getTime() + BEIJING_OFFSET_MS;
  const elapsedTodayMs = ((shiftedMs % DAILY_CHALLENGE_DAY_MS) + DAILY_CHALLENGE_DAY_MS) % DAILY_CHALLENGE_DAY_MS;
  return DAILY_CHALLENGE_DAY_MS - elapsedTodayMs;
};

const finiteInteger = (value: unknown, fallback: number, minimum: number, maximum: number): number => {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, Math.floor(number)))
    : fallback;
};

const clampTimestamp = (value: unknown): number => {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
};

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mix = (value: number): number => {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
};

const randomSeed = (): number => {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoObject.getRandomValues(values);
    return values[0] >>> 0;
  }
  return mix(hashString(`${Date.now()}-${Math.random()}`));
};

const normalizeSeed = (value: unknown): number => {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number) ? (Math.floor(number) >>> 0) : randomSeed();
};

const latestUnlockedMechanism = (highestLevel: number) => {
  const safeLevel = finiteInteger(highestLevel, 1, 1, Number.MAX_SAFE_INTEGER);
  const unlocked = MECHANISM_GUIDE.filter(({ unlockLevel }) => unlockLevel <= safeLevel);
  return unlocked[unlocked.length - 1] ?? MECHANISM_GUIDE[0];
};

export const unlockedDailyChallengeMechanisms = (highestLevel: number): string[] => {
  const safeLevel = finiteInteger(highestLevel, 1, 1, Number.MAX_SAFE_INTEGER);
  return MECHANISM_GUIDE
    .filter(({ unlockLevel }) => unlockLevel <= safeLevel)
    .map(({ id }) => id);
};

export const dailyChallengeStage = (highestLevel: number): {
  key: string;
  unlockLevel: number;
  newestMechanism: string;
  mechanisms: string[];
} => {
  const newest = latestUnlockedMechanism(highestLevel);
  const mechanisms = unlockedDailyChallengeMechanisms(highestLevel);
  return {
    key: `mechanisms-${newest.id}-${newest.unlockLevel}`,
    unlockLevel: newest.unlockLevel,
    newestMechanism: newest.id,
    mechanisms,
  };
};

/** Return mechanism ids actually represented by a source LevelSpec. */
export const mechanismsUsedByDailyLevel = (level: LevelSpec): string[] => {
  const used = new Set<string>();
  if (level.gates.length > 0) used.add("color-exit");
  if (level.gates.some((gate) => (gate.frozen ?? 0) > 0)) used.add("frozen-exit");
  if (level.gates.some((gate) => gate.star === true) || level.blocks.some((block) => block.star === true)) used.add("star");
  if (level.blocks.some((block) => (block.frozen ?? 0) > 0)) used.add("numeric-ice");
  if (level.blocks.some((block) => (block.layers?.length ?? 1) > 1)) used.add("multilayer-shell");
  if (level.blocks.some((block) => block.movementAxis)) used.add("axis-block");
  if (level.blocks.some((block) => block.keyId || block.lockedBy)) used.add("key-lock");
  if (level.blocks.some((block) => typeof block.timedBombSeconds === "number")) used.add("bomb");
  if (level.blocks.some((block) => !isRectangularShape(block.shape))) used.add("irregular-block");
  if ((level.playable?.length ?? 0) > 0 && (level.playable?.length ?? 0) < level.width * level.height) used.add("irregular-board");
  if ((level.blocked?.length ?? 0) > 0) used.add("irregular-board");
  if ((level.flipDoors?.length ?? 0) > 0) used.add("flip-door");
  if ((level.coloredGrids?.length ?? 0) > 0) used.add("colored-grid");
  if ((level.elevators?.length ?? 0) > 0 || (level.shutters ?? []).some((shutter) => shutter.skin === "lift")) used.add("layered-lift");
  if ((level.shutters ?? []).some((shutter) => shutter.skin !== "lift" && shutter.skin !== "staging" && shutter.skin !== "staged-frame")) used.add("shutter");
  if ((level.generators?.length ?? 0) > 0) used.add("generator");
  return [...used].filter((id) => MECHANISM_IDS.has(id));
};

const isRectangularShape = (shape: readonly (readonly [number, number])[]): boolean => {
  if (!shape.length) return false;
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (cells.size !== (maxX - minX + 1) * (maxY - minY + 1)) return false;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!cells.has(`${x},${y}`)) return false;
    }
  }
  return true;
};

const allowedLevelForStage = (level: LevelSpec, highestLevel: number, newestMechanism: string): boolean => {
  const used = mechanismsUsedByDailyLevel(level);
  const safeLevel = finiteInteger(highestLevel, 1, 1, Number.MAX_SAFE_INTEGER);
  // A source level may be adapted only after all of its mechanisms are unlocked.
  if (used.some((id) => (MECHANISM_UNLOCKS.get(id) ?? Number.MAX_SAFE_INTEGER) > safeLevel)) return false;
  // Each current-stage pool must expose the mechanism that opened this stage.
  return used.includes(newestMechanism);
};

const difficultyMatches = (level: LevelSpec, difficulty: DailyChallengeDifficulty): boolean => {
  if (difficulty === 1) return level.difficulty === "hard";
  if (difficulty === 2) return level.difficulty === "super";
  return level.difficulty === "super";
};

const candidateLevels = (levels: readonly LevelSpec[], highestLevel: number, difficulty: DailyChallengeDifficulty, newestMechanism: string): LevelSpec[] => {
  const stageCandidates = levels.filter((level) => difficultyMatches(level, difficulty) && allowedLevelForStage(level, highestLevel, newestMechanism));
  // This selector is only for explicit custom-level test fixtures. Source
  // labels and scoring targets provide no mandatory-reposition certificate.
  if (stageCandidates.length) return stageCandidates;
  // In custom fixtures a missing source label may fall back to a compatible
  // mechanism example. Every such assignment remains explicitly pending.
  const stageMechanismCandidates = levels.filter((level) => allowedLevelForStage(level, highestLevel, newestMechanism));
  if (stageMechanismCandidates.length) return stageMechanismCandidates;
  const sameDifficulty = levels.filter((level) => difficultyMatches(level, difficulty));
  if (sameDifficulty.length) return sameDifficulty;
  return levels.filter((level) => level.difficulty === "hard" || level.difficulty === "super");
};

const assignmentPool = (
  levels: readonly LevelSpec[],
  highestLevel: number,
  difficulty: DailyChallengeDifficulty,
  newestMechanism: string,
): DailyChallengeAssignment[] => {
  const candidates = candidateLevels(levels, highestLevel, difficulty, newestMechanism);
  if (!candidates.length) return [];
  const assignments: DailyChallengeAssignment[] = [];
  for (let index = 0; index < DAILY_CHALLENGE_POOL_SIZE; index += 1) {
    const source = candidates[index % candidates.length];
    const variant = Math.floor(index / candidates.length);
    assignments.push({
      id: `daily-${difficulty}-${source.id}-${variant}`,
      sourceLevelId: source.id,
      variant,
      minimumRepositionMoves: 0,
      sourceDifficulty: source.difficulty,
      proofStatus: "pending",
    });
  }
  return assignments;
};

const boundFormalCandidate = (assignment: DailyChallengeAssignment) => {
  if (FORMAL_DAILY_CHALLENGE_SCHEMA_VERSION !== 2
    || assignment.catalogRevision !== FORMAL_DAILY_CHALLENGE_REVISION
    || assignment.layoutFactory !== "explicit-certified-v2"
    || assignment.proofStatus !== "same-object-verified-v2") return undefined;
  const candidate = getFormalDailyChallengeCandidate(assignment.id);
  if (!candidate || candidate.formalId !== assignment.id
    || candidate.sourceLevelId !== assignment.sourceLevelId
    || candidate.layoutSha256 !== assignment.layoutSha256
    || !/^[0-9a-f]{64}$/.test(candidate.layoutSha256)
    || candidate.proofSchemaVersion !== 2
    || candidate.proofStatus !== "same-object-verified-v2"
    || candidate.layoutFactory !== "explicit-certified-v2"
    || candidate.routeReplayComplete !== true
    || candidate.minimumRepositionMoves !== assignment.minimumRepositionMoves
    || candidate.minimumRepositionMoves !== candidate.proofLowerBound
    || candidate.verifiedSolutionRepositionMoves !== candidate.proofUpperBound
    || candidate.level.id !== candidate.sourceLevelId
    || !LEVELS.some(({ id }) => id === candidate.sourceLevelId)) return undefined;
  return candidate;
};

const certifiedBand = (assignment: DailyChallengeAssignment, difficulty: DailyChallengeDifficulty): boolean => {
  const candidate = boundFormalCandidate(assignment);
  const floor = difficulty === 1 ? 16 : difficulty === 2 ? 21 : 31;
  return Boolean(candidate && candidate.proofTargetFloor === floor
    && Number.isSafeInteger(candidate.proofLowerBound) && candidate.proofLowerBound >= floor
    && Number.isSafeInteger(candidate.proofUpperBound) && candidate.proofUpperBound >= candidate.proofLowerBound
    && (difficulty === 3 || candidate.proofUpperBound <= (difficulty === 1 ? 20 : 30)));
};

const buildAssignments = (
  levels: readonly LevelSpec[],
  highestLevel: number,
  newestMechanism: string,
): DailyChallengeAssignments => {
  // Only explicit, certified objects are playable in production. A partial or
  // stale registry cannot silently fall back to an easier mainline source.
  if (levels === LEVELS) {
    const stageKey = dailyChallengeStage(highestLevel).key;
    const formal = {
      1: getFormalDailyChallengeAssignments(stageKey, 1),
      2: getFormalDailyChallengeAssignments(stageKey, 2),
      3: getFormalDailyChallengeAssignments(stageKey, 3),
    };
    if (formal[1]?.length === DAILY_CHALLENGE_POOL_SIZE
      && formal[2]?.length === DAILY_CHALLENGE_POOL_SIZE
      && formal[3]?.length === DAILY_CHALLENGE_POOL_SIZE
      && DIFFICULTY_KEYS.every((difficulty) => formal[difficulty]!.every((entry, index) => {
        const candidate = boundFormalCandidate(entry);
        return entry.id === `daily-${stageKey}-d${difficulty}-${String(index + 1).padStart(2, "0")}`
          && entry.slot === index + 1 && entry.variant === index
          && certifiedBand(entry, difficulty)
          && candidate !== undefined && allowedLevelForStage(candidate.level, highestLevel, newestMechanism);
      }))) {
      return {
        1: formal[1],
        2: formal[2],
        3: formal[3],
      };
    }
    return { 1: [], 2: [], 3: [] };
  }
  return {
    1: assignmentPool(levels, highestLevel, 1, newestMechanism),
    2: assignmentPool(levels, highestLevel, 2, newestMechanism),
    3: assignmentPool(levels, highestLevel, 3, newestMechanism),
  };
};

const selectedIndices = (dayKey: string, stageKey: string, seed: number): DailyChallengeSelected => ({
  1: mix(seed ^ hashString(`${dayKey}-${stageKey}-1`)) % DAILY_CHALLENGE_POOL_SIZE,
  2: mix(seed ^ hashString(`${dayKey}-${stageKey}-2`)) % DAILY_CHALLENGE_POOL_SIZE,
  3: mix(seed ^ hashString(`${dayKey}-${stageKey}-3`)) % DAILY_CHALLENGE_POOL_SIZE,
});

const freshState = (dayKey: string, highestLevel: number, levels: readonly LevelSpec[], playerSeed = randomSeed()): DailyChallengeState => {
  const stage = dailyChallengeStage(highestLevel);
  const seed = normalizeSeed(playerSeed);
  return {
    version: 2,
    catalogRevision: levels === LEVELS ? FORMAL_DAILY_CHALLENGE_REVISION : undefined,
    dayKey,
    maxObservedDayKey: dayKey,
    stageKey: stage.key,
    stageUnlockLevel: stage.unlockLevel,
    unlockedMechanisms: stage.mechanisms,
    pools: buildAssignments(levels, highestLevel, stage.newestMechanism),
    selected: selectedIndices(dayKey, stage.key, seed),
    playerSeed: seed,
    attemptsRemaining: DAILY_CHALLENGE_MAX_ATTEMPTS,
    lastAttemptAtMs: 0,
    completed: { 1: false, 2: false, 3: false },
    rewarded: { 1: false, 2: false, 3: false },
  };
};

export const createDailyChallengeState = (
  dayKey = dailyChallengeDayKey(),
  highestLevel = 1,
  levels: readonly LevelSpec[] = LEVELS,
  playerSeed = randomSeed(),
): DailyChallengeState => freshState(validDayKey(dayKey) ? dayKey : dailyChallengeDayKey(), highestLevel, levels, playerSeed);

const assignmentFallback = (raw: unknown, difficulty: DailyChallengeDifficulty): DailyChallengeAssignment[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
    const source = entry as Record<string, unknown>;
    const sourceLevelId = finiteInteger(source.sourceLevelId, 0, 0, 999999);
    if (!sourceLevelId) return [];
    const variant = finiteInteger(source.variant, 0, 0, 999999);
    const sourceDifficulty: Difficulty = source.sourceDifficulty === "easy" || source.sourceDifficulty === "normal" || source.sourceDifficulty === "hard" || source.sourceDifficulty === "super"
      ? source.sourceDifficulty : difficulty === 1 ? "hard" : "super";
    return [{
      id: typeof source.id === "string" ? source.id : `daily-${difficulty}-${sourceLevelId}-${variant || index}`,
      sourceLevelId,
      variant,
      minimumRepositionMoves: finiteInteger(source.minimumRepositionMoves, 0, 0, 999999),
      sourceDifficulty,
      catalogRevision: typeof source.catalogRevision === "string" ? source.catalogRevision : undefined,
      layoutVariant: Number.isSafeInteger(source.layoutVariant) ? Number(source.layoutVariant) : undefined,
      sourceLayoutSha256: typeof source.sourceLayoutSha256 === "string" ? source.sourceLayoutSha256 : undefined,
      layoutSha256: typeof source.layoutSha256 === "string" ? source.layoutSha256 : undefined,
      layoutDiffersFromSource: source.layoutDiffersFromSource === true ? true : undefined,
      sourceGeometrySha256: typeof source.sourceGeometrySha256 === "string" ? source.sourceGeometrySha256 : undefined,
      geometrySha256: typeof source.geometrySha256 === "string" ? source.geometrySha256 : undefined,
      geometryDiffersFromSource: source.geometryDiffersFromSource === true ? true : undefined,
      layoutFactory: source.layoutFactory === "explicit-certified-v2" ? "explicit-certified-v2" as const
        : source.layoutFactory === "seam-chambers-v1" ? "seam-chambers-v1" as const : undefined,
      chamberCount: Number.isSafeInteger(source.chamberCount) ? Number(source.chamberCount) : undefined,
      dailyMechanisms: Array.isArray(source.dailyMechanisms) && source.dailyMechanisms.every((value) => typeof value === "string")
        ? source.dailyMechanisms as string[] : undefined,
      proofStatus: source.proofStatus === "same-object-verified-v2" ? "same-object-verified-v2" as const
        : source.proofStatus === "threshold-proven" ? "threshold-proven" as const : "pending" as const,
    }];
  }).slice(0, DAILY_CHALLENGE_POOL_SIZE);
};

const sanitizeExistingState = (raw: Record<string, unknown>, fallbackDayKey: string, levels: readonly LevelSpec[], highestLevel: number): DailyChallengeState => {
  const dayKey = validDayKey(raw.dayKey) ? raw.dayKey : fallbackDayKey;
  const maxObservedDayKey = validDayKey(raw.maxObservedDayKey)
    ? (raw.maxObservedDayKey < dayKey ? dayKey : raw.maxObservedDayKey)
    : dayKey;
  const stageUnlockLevel = finiteInteger(raw.stageUnlockLevel, highestLevel, 1, Number.MAX_SAFE_INTEGER);
  const stage = dailyChallengeStage(stageUnlockLevel);
  const poolsRaw = typeof raw.pools === "object" && raw.pools !== null && !Array.isArray(raw.pools)
    ? raw.pools as Record<string, unknown>
    : {};
  const persistedPools = {
    1: assignmentFallback(poolsRaw[1], 1),
    2: assignmentFallback(poolsRaw[2], 2),
    3: assignmentFallback(poolsRaw[3], 3),
  } as DailyChallengeAssignments;
  // A catalogue revision corrects slot content once while preserving the day's
  // fixed slot indices, locked stage, seed, attempts and completion/reward flags.
  // buildAssignments enforces the stable slot ordering; no old derived board
  // or persisted PASS flag is admitted as a fallback for a missing new object.
  const useProductionPools = levels === LEVELS;
  const fallbackPools = useProductionPools || DIFFICULTY_KEYS.some((difficulty) => !persistedPools[difficulty].length)
    ? buildAssignments(levels, stageUnlockLevel, stage.newestMechanism)
    : persistedPools;
  const pools = {
    1: !useProductionPools && persistedPools[1].length ? persistedPools[1] : fallbackPools[1],
    2: !useProductionPools && persistedPools[2].length ? persistedPools[2] : fallbackPools[2],
    3: !useProductionPools && persistedPools[3].length ? persistedPools[3] : fallbackPools[3],
  };
  const selectedRaw = typeof raw.selected === "object" && raw.selected !== null && !Array.isArray(raw.selected)
    ? raw.selected as Record<string, unknown>
    : {};
  const safeSelected = (difficulty: DailyChallengeDifficulty): number => {
    const poolLength = pools[difficulty].length || DAILY_CHALLENGE_POOL_SIZE;
    return Math.min(poolLength - 1, Math.max(0, finiteInteger(selectedRaw[difficulty], 0, 0, DAILY_CHALLENGE_POOL_SIZE - 1)));
  };
  const boolFlag = (container: unknown, difficulty: DailyChallengeDifficulty): boolean => (
    typeof container === "object" && container !== null && !Array.isArray(container)
      ? (container as Record<string, unknown>)[difficulty] === true
      : false
  );
  return {
    version: 2,
    catalogRevision: useProductionPools ? FORMAL_DAILY_CHALLENGE_REVISION
      : typeof raw.catalogRevision === "string" ? raw.catalogRevision : undefined,
    dayKey,
    maxObservedDayKey,
    stageKey: typeof raw.stageKey === "string" ? raw.stageKey : stage.key,
    stageUnlockLevel,
    unlockedMechanisms: Array.isArray(raw.unlockedMechanisms)
      ? raw.unlockedMechanisms.filter((id): id is string => typeof id === "string" && MECHANISM_IDS.has(id))
      : stage.mechanisms,
    pools,
    selected: { 1: safeSelected(1), 2: safeSelected(2), 3: safeSelected(3) },
    playerSeed: normalizeSeed(raw.playerSeed),
    // Upgrade the old 0..3 balance once; version 2 reloads never regrant it.
    attemptsRemaining: raw.version === 1 || raw.version === undefined
      ? finiteInteger(raw.attemptsRemaining, 3, 0, 3) + 2
      : finiteInteger(raw.attemptsRemaining, DAILY_CHALLENGE_MAX_ATTEMPTS, 0, DAILY_CHALLENGE_MAX_ATTEMPTS),
    lastAttemptAtMs: clampTimestamp(raw.lastAttemptAtMs),
    completed: { 1: boolFlag(raw.completed, 1), 2: boolFlag(raw.completed, 2), 3: boolFlag(raw.completed, 3) },
    rewarded: { 1: boolFlag(raw.rewarded, 1), 2: boolFlag(raw.rewarded, 2), 3: boolFlag(raw.rewarded, 3) },
  };
};

export const reconcileDailyChallengeState = (
  value: unknown,
  date = new Date(),
  highestLevel = 1,
  levels: readonly LevelSpec[] = LEVELS,
): DailyChallengeState => {
  const today = dailyChallengeDayKey(date);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return createDailyChallengeState(today, highestLevel, levels);
  const current = sanitizeExistingState(value as Record<string, unknown>, today, levels, highestLevel);
  if (today > current.maxObservedDayKey) return createDailyChallengeState(today, highestLevel, levels, current.playerSeed);
  return current;
};

export const getDailyChallengePool = (state: DailyChallengeState, difficulty: DailyChallengeDifficulty): readonly DailyChallengeAssignment[] => state.pools[difficulty];

export const getDailyChallengeAssignment = (state: DailyChallengeState, difficulty: DailyChallengeDifficulty): DailyChallengeAssignment | undefined => {
  const pool = state.pools[difficulty];
  return pool[state.selected[difficulty]] ?? pool[0];
};

export const getDailyChallengeSourceLevel = (state: DailyChallengeState, difficulty: DailyChallengeDifficulty, levels: readonly LevelSpec[] = LEVELS): LevelSpec | undefined => {
  const assignment = getDailyChallengeAssignment(state, difficulty);
  return assignment ? levels.find(({ id }) => id === assignment.sourceLevelId) : undefined;
};

/**
 * Resolve the exact certified object. The emitted registry is recursively
 * frozen and its full object SHA is verified by the complete catalogue build.
 * No gameplay field is changed after proof; the source ID remains provenance.
 */
export const cloneDailyChallengeLevel = (
  assignment: DailyChallengeAssignment,
  levels: readonly LevelSpec[] = LEVELS,
): LevelSpec | undefined => {
  if (levels === LEVELS) {
    const candidate = boundFormalCandidate(assignment);
    if (!candidate) return undefined;
    return getFormalDailyChallengeLevel(candidate.formalId);
  }
  // Explicit custom arrays are unproved test fixtures, never a production
  // recovery path. Keep source scoring metadata; do not manufacture D3 >30.
  if (assignment.proofStatus !== "pending") return undefined;
  const source = levels.find(({ id }) => id === assignment.sourceLevelId);
  return source ? { ...structuredClone(source), reward: 0 } : undefined;
};
export const consumeDailyChallengeAttempt = (state: DailyChallengeState, nowMs = Date.now()): DailyChallengeAttemptResult => {
  // Callers reconcile the day before selecting a new run. Consumption itself
  // never refreshes the day or changes the already-selected assignment.
  if (state.attemptsRemaining <= 0) return { state, accepted: false, attemptsRemaining: 0 };
  const now = clampTimestamp(nowMs);
  return {
    state: { ...state, attemptsRemaining: state.attemptsRemaining - 1, lastAttemptAtMs: now },
    accepted: true,
    attemptsRemaining: state.attemptsRemaining - 1,
  };
};

export const completeDailyChallenge = (
  state: DailyChallengeState,
  difficulty: DailyChallengeDifficulty,
): DailyChallengeCompletionResult => {
  if (state.completed[difficulty]) return { state, reward: Object.freeze({ coins: 0, inspiration: 0 }), firstCompletion: false };
  const reward = DAILY_CHALLENGE_REWARDS[difficulty];
  return {
    state: {
      ...state,
      completed: { ...state.completed, [difficulty]: true },
      rewarded: { ...state.rewarded, [difficulty]: true },
    },
    reward,
    firstCompletion: true,
  };
};

export const dailyChallengeHasReward = (state: DailyChallengeState, difficulty: DailyChallengeDifficulty): boolean => state.completed[difficulty] && state.rewarded[difficulty];

export const dailyChallengeDifficultyLabel = (difficulty: DailyChallengeDifficulty): "难" | "超难" | "超超难" => (
  difficulty === 1 ? "难" : difficulty === 2 ? "超难" : "超超难"
);

export const dailyChallengeTimeLimitSeconds = (assignment: DailyChallengeAssignment, levels: readonly LevelSpec[] = LEVELS): number => (
  levels === LEVELS ? boundFormalCandidate(assignment)?.level.timeSeconds ?? 0
    : levels.find(({ id }) => id === assignment.sourceLevelId)?.timeSeconds ?? 0
);

export const dailyChallengeDifficultyMeetsMoveRule = (assignment: DailyChallengeAssignment, difficulty: DailyChallengeDifficulty): boolean => (
  certifiedBand(assignment, difficulty)
);

/** Pure helper for UI and tests: a challenge cannot affect campaign progression. */
export const dailyChallengeCampaignMutationKeys = Object.freeze([
  "currentLevel",
  "highestLevel",
  "bestStars",
  "rewardedLevels",
  "dailyTaskProgress",
] as const);

// Keep this export available for callers that need to validate persisted state.
export const DAILY_CHALLENGE_DIFFICULTY_KEYS = DIFFICULTY_KEYS;




