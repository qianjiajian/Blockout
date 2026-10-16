import type { DailyChallengeState } from "./dailyChallenge";
import type { LevelSpec } from "./types";
import {
  DAILY_CHALLENGE_V3_PROFILE, DAILY_CHALLENGE_V3_SLOTS, dailyChallengeStageV3,
  getDailyChallengeStageV3, mapLegacyDailyChallengeStageV3, validateDailyChallengeStageMechanismsV3,
  type DailyChallengeDifficultyV3,
} from "./dailyChallengeStagesV3";

/** Candidate-only schema. Nothing imports this module from the production game.
 * Structural admission is not final design/Pointer acceptance or activation. */
export interface DailyChallengeCatalogEntryV3 {
  formalId: string;
  stageKey: string;
  difficulty: DailyChallengeDifficultyV3;
  slot: number;
  sourceLevelId: number;
  layoutSha256: string;
  dailyMechanisms: readonly string[];
  level: LevelSpec;
  proof: {
    /** Evidence binds the unchanged object, independently of its new slot id. */
    levelSha256: string;
    sourceLevelId: number;
    lowerBound: number;
    upperBound: number;
    routeReplayComplete: true;
    reportSha256: string;
    toolchainSha256: string;
  };
}

export interface DailyChallengeCatalogV3 {
  schemaVersion: 3;
  profile: typeof DAILY_CHALLENGE_V3_PROFILE;
  catalogRevision: string;
  entries: readonly DailyChallengeCatalogEntryV3[];
}

export interface DailyChallengeAssignmentV3 {
  id: string;
  profile: typeof DAILY_CHALLENGE_V3_PROFILE;
  catalogRevision: string;
  stageKey: string;
  difficulty: DailyChallengeDifficultyV3;
  slot: number;
  sourceLevelId: number;
  layoutSha256: string;
  proofReportSha256: string;
  minimumRepositionMoves: number;
  verifiedSolutionRepositionMoves: number;
}

type PoolsV3 = Record<DailyChallengeDifficultyV3, DailyChallengeAssignmentV3[]>;
export type DailyChallengeStateV3 = Omit<DailyChallengeState, "version" | "pools"> & {
  version: 3;
  profile: typeof DAILY_CHALLENGE_V3_PROFILE;
  catalogRevision: string;
  pools: PoolsV3;
  migration?: { fromProfile: string; fromCatalogRevision: string; fromStageKey: string };
};

export interface DailyChallengeCatalogInspectorV3 {
  /** Must hash every LevelSpec field using the emitter's canonical SHA-256. */
  levelSha256(level: LevelSpec): string;
  mechanismsUsedByLevel(level: LevelSpec): readonly string[];
  sourceLevelExists(sourceLevelId: number): boolean;
}

export interface DailyChallengeCatalogProviderV3 {
  readonly phase: "candidate-only";
  readonly profile: typeof DAILY_CHALLENGE_V3_PROFILE;
  readonly catalogRevision: string;
  getAssignments(stageKey: string, difficulty: DailyChallengeDifficultyV3): DailyChallengeAssignmentV3[] | undefined;
  cloneLevel(assignment: DailyChallengeAssignmentV3): LevelSpec | undefined;
}

const hex = (s: unknown): s is string => typeof s === "string" && /^[a-f0-9]{64}$/.test(s);
const difficulties = [1, 2, 3] as const;
const whole = (n: number, min = 0) => Number.isSafeInteger(n) && n >= min;
const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === new Set(a).size && b.length === new Set(b).size &&
  a.length === b.length && a.every((id) => b.includes(id));

export function createDailyChallengeCatalogProviderV3(
  input: DailyChallengeCatalogV3, inspector: DailyChallengeCatalogInspectorV3,
): { ok: boolean; issues: string[]; provider?: DailyChallengeCatalogProviderV3 } {
  const issues: string[] = [];
  if (input.schemaVersion !== 3 || input.profile !== DAILY_CHALLENGE_V3_PROFILE || !hex(input.catalogRevision))
    issues.push("catalog-profile-or-revision");
  if (input.entries.length !== DAILY_CHALLENGE_V3_SLOTS.length) issues.push("catalog-requires-all-300-slots");
  const expected = new Map(DAILY_CHALLENGE_V3_SLOTS.map((s) => [s.id, s]));
  const ids = new Set<string>(), layouts = new Set<string>();
  for (const entry of input.entries) {
    const slot = expected.get(entry.formalId);
    if (!slot || entry.stageKey !== slot.stageKey || entry.difficulty !== slot.difficulty || entry.slot !== slot.slot)
      issues.push(`${entry.formalId}:slot-binding`);
    if (ids.has(entry.formalId)) issues.push(`${entry.formalId}:duplicate-id`);
    ids.add(entry.formalId);
    if (layouts.has(entry.layoutSha256)) issues.push(`${entry.formalId}:duplicate-full-object`);
    layouts.add(entry.layoutSha256);
    const p = entry.proof;
    if (!whole(entry.sourceLevelId, 1) || !inspector.sourceLevelExists(entry.sourceLevelId) || entry.level.id !== entry.sourceLevelId)
      issues.push(`${entry.formalId}:source-binding`);
    if (!hex(entry.layoutSha256) || inspector.levelSha256(entry.level) !== entry.layoutSha256)
      issues.push(`${entry.formalId}:full-object-sha`);
    if (!p || p.levelSha256 !== entry.layoutSha256 || p.sourceLevelId !== entry.sourceLevelId ||
      !hex(p.reportSha256) || !hex(p.toolchainSha256) || p.routeReplayComplete !== true ||
      !whole(p.lowerBound) || !whole(p.upperBound) || p.lowerBound > p.upperBound ||
      p.lowerBound < (entry.difficulty === 1 ? 16 : entry.difficulty === 2 ? 21 : 31) ||
      (entry.difficulty < 3 && p.upperBound > (entry.difficulty === 1 ? 20 : 30)))
      issues.push(`${entry.formalId}:proof-binding-or-band`);
    const used = inspector.mechanismsUsedByLevel(entry.level);
    if (!sameSet(used, entry.dailyMechanisms)) issues.push(`${entry.formalId}:actual-mechanism-binding`);
    if (!validateDailyChallengeStageMechanismsV3(entry.stageKey, used).ok)
      issues.push(`${entry.formalId}:stage-mechanisms`);
  }
  if (ids.size !== expected.size || [...expected.keys()].some((id) => !ids.has(id))) issues.push("catalog-missing-slots");
  if (issues.length) return { ok: false, issues };

  // Keep our own snapshot; neither emitter input mutation nor a returned clone changes it.
  const catalog = structuredClone(input);
  const entries = new Map(catalog.entries.map((e) => [e.formalId, e]));
  const assignmentFor = (entry: DailyChallengeCatalogEntryV3): DailyChallengeAssignmentV3 => ({
    id: entry.formalId, profile: DAILY_CHALLENGE_V3_PROFILE, catalogRevision: catalog.catalogRevision,
    stageKey: entry.stageKey, difficulty: entry.difficulty, slot: entry.slot, sourceLevelId: entry.sourceLevelId,
    layoutSha256: entry.layoutSha256, proofReportSha256: entry.proof.reportSha256,
    minimumRepositionMoves: entry.proof.lowerBound, verifiedSolutionRepositionMoves: entry.proof.upperBound,
  });
  const provider: DailyChallengeCatalogProviderV3 = Object.freeze({
    phase: "candidate-only", profile: DAILY_CHALLENGE_V3_PROFILE, catalogRevision: catalog.catalogRevision,
    getAssignments(stageKey: string, difficulty: DailyChallengeDifficultyV3) {
      if (!getDailyChallengeStageV3(stageKey) || !difficulties.includes(difficulty)) return undefined;
      return catalog.entries.filter((e) => e.stageKey === stageKey && e.difficulty === difficulty)
        .sort((a, b) => a.slot - b.slot).map(assignmentFor);
    },
    cloneLevel(assignment: DailyChallengeAssignmentV3) {
      const entry = entries.get(assignment.id);
      if (!entry) return undefined;
      const expectedAssignment = assignmentFor(entry);
      if (Object.entries(expectedAssignment).some(([key, value]) => assignment[key as keyof DailyChallengeAssignmentV3] !== value))
        return undefined;
      return structuredClone(entry.level);
    },
  });
  return { ok: true, issues: [], provider };
}

export interface DailyChallengeActiveRunV3 {
  daily: boolean;
  dailyDayKey?: string;
  dailyChallengeDifficulty?: number;
  dailyChallengeSourceLevelId?: number;
  levelId: number;
}

export interface DailyChallengeRunOwnerV3 {
  profile: string;
  catalogRevision: string;
  formalId: string;
  layoutSha256: string;
  sourceLevelId: number;
  dayKey: string;
  difficulty: DailyChallengeDifficultyV3;
}

export type DailyChallengeMigrationV3 =
  | { status: "ready"; state: DailyChallengeStateV3; grantsReward: false; consumesAttempt: false;
    sameDayStageFrozen: boolean; stageSource: "saved-stage-key" | "new-day-progress"; mappedFromStageKey: string | null }
  | { status: "defer-active-run"; owner: DailyChallengeRunOwnerV3; grantsReward: false; consumesAttempt: false;
    sameDayStageFrozen: true; releaseCondition: "settled-or-abandoned" }
  | { status: "blocked"; reason: string; grantsReward: false; consumesAttempt: false };

const validDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  Number.isFinite(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const validState = (s: DailyChallengeState | DailyChallengeStateV3) =>
  (s.version === 2 || s.version === 3) && validDay(s.dayKey) && validDay(s.maxObservedDayKey) &&
  s.maxObservedDayKey >= s.dayKey && whole(s.playerSeed, 1) && s.playerSeed <= 0xffffffff &&
  whole(s.attemptsRemaining) && s.attemptsRemaining <= 5 && whole(s.lastAttemptAtMs) &&
  difficulties.every((d) => whole(s.selected[d]) && s.selected[d] < 10 &&
    typeof s.completed[d] === "boolean" && typeof s.rewarded[d] === "boolean");

/** Pure proposal. The caller persists it only after final300 adoption is authorized.
 * It intentionally takes no campaign progress: the saved day's stage remains frozen. */
export function planDailyChallengeMigrationV3(
  saved: DailyChallengeState | DailyChallengeStateV3,
  provider: DailyChallengeCatalogProviderV3,
  activeRun?: DailyChallengeActiveRunV3,
): DailyChallengeMigrationV3 {
  const blocked = (reason: string): DailyChallengeMigrationV3 =>
    ({ status: "blocked", reason, grantsReward: false, consumesAttempt: false });
  if (!validState(saved)) return blocked("invalid-saved-day-state");
  if (saved.version === 3 && saved.profile !== DAILY_CHALLENGE_V3_PROFILE) return blocked("unknown-saved-profile");
  const stage = mapLegacyDailyChallengeStageV3(saved.stageKey);
  if (!stage) return blocked("unknown-saved-stage");
  const savedUnlock = saved.version === 3 ? stage.unlockLevel : Number(saved.stageKey.match(/-(\d+)$/)?.[1]);
  if (saved.stageUnlockLevel !== savedUnlock) return blocked("saved-stage-unlock-binding");
  if (activeRun?.daily) {
    const d = activeRun.dailyChallengeDifficulty;
    if (d !== 1 && d !== 2 && d !== 3) return blocked("active-run-difficulty");
    const selected = saved.pools[d][saved.selected[d]];
    const expectedId = `daily-${saved.stageKey}-d${d}-${String(saved.selected[d] + 1).padStart(2, "0")}`;
    if (activeRun.dailyDayKey !== saved.dayKey || !selected || !hex(saved.catalogRevision) ||
      selected.id !== expectedId || !whole(selected.sourceLevelId, 1) ||
      selected.catalogRevision !== saved.catalogRevision || !hex(selected.layoutSha256) ||
      selected.sourceLevelId !== activeRun.dailyChallengeSourceLevelId || selected.sourceLevelId !== activeRun.levelId)
      return blocked("active-run-owner-binding");
    if (saved.version === 2) {
      const legacy = saved.pools[d][saved.selected[d]];
      if (legacy.variant !== saved.selected[d] || legacy.layoutFactory !== "explicit-certified-v2" ||
        legacy.proofStatus !== "same-object-verified-v2") return blocked("active-run-legacy-assignment-binding");
    } else {
      const current = saved.pools[d][saved.selected[d]];
      if (current.profile !== saved.profile || current.stageKey !== saved.stageKey || current.difficulty !== d ||
        current.slot !== saved.selected[d] + 1 || !hex(current.proofReportSha256))
        return blocked("active-run-current-assignment-binding");
    }
    return { status: "defer-active-run", grantsReward: false, consumesAttempt: false,
      sameDayStageFrozen: true, releaseCondition: "settled-or-abandoned", owner: {
      profile: saved.version === 3 ? saved.profile : "legacy-450-schema2", catalogRevision: saved.catalogRevision,
      formalId: selected.id, layoutSha256: selected.layoutSha256, sourceLevelId: selected.sourceLevelId,
      dayKey: saved.dayKey, difficulty: d,
    } };
  }
  const pools = {} as PoolsV3;
  for (const d of difficulties) {
    const pool = provider.getAssignments(stage.key, d);
    if (pool?.length !== 10 || pool.some((a) => !provider.cloneLevel(a))) return blocked("incomplete-target-catalog");
    pools[d] = pool;
  }
  return { status: "ready", grantsReward: false, consumesAttempt: false, sameDayStageFrozen: true,
    stageSource: "saved-stage-key", mappedFromStageKey: saved.stageKey, state: {
    ...structuredClone(saved), version: 3, profile: DAILY_CHALLENGE_V3_PROFILE,
    catalogRevision: provider.catalogRevision, stageKey: stage.key, stageUnlockLevel: stage.unlockLevel,
    unlockedMechanisms: [...stage.allowedMechanisms], pools,
    migration: saved.version === 3 ? saved.migration : {
      fromProfile: "legacy-450-schema2", fromCatalogRevision: saved.catalogRevision ?? "",
      fromStageKey: saved.stageKey,
    },
  } };
}

const hash = (text: string) => {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
};
const mix = (value: number) => {
  let n = value >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return (n ^ (n >>> 16)) >>> 0;
};

/** Explicit new-day factory, separate from same-day content migration. */
export function createDailyChallengeStateV3(
  dayKey: string, highestLevel: number, playerSeed: number, provider: DailyChallengeCatalogProviderV3,
): DailyChallengeStateV3 | undefined {
  if (!validDay(dayKey) || !whole(playerSeed, 1) || playerSeed > 0xffffffff) return undefined;
  const stage = dailyChallengeStageV3(highestLevel);
  const choose = (d: DailyChallengeDifficultyV3) => mix(playerSeed ^ hash(`${dayKey}-${stage.key}-${d}`)) % 10;
  const selected = { 1: choose(1), 2: choose(2), 3: choose(3) };
  const initial: DailyChallengeStateV3 = {
    version: 3, profile: DAILY_CHALLENGE_V3_PROFILE, catalogRevision: provider.catalogRevision,
    dayKey, maxObservedDayKey: dayKey, stageKey: stage.key, stageUnlockLevel: stage.unlockLevel,
    unlockedMechanisms: [...stage.allowedMechanisms], selected, playerSeed, pools: { 1: [], 2: [], 3: [] },
    attemptsRemaining: 5, lastAttemptAtMs: 0,
    completed: { 1: false, 2: false, 3: false }, rewarded: { 1: false, 2: false, 3: false },
  };
  const result = planDailyChallengeMigrationV3(initial, provider);
  return result.status === "ready" ? result.state : undefined;
}

/** Caller supplies time; no storage, reward, attempt, or active-run mutation occurs. */
export function reconcileDailyChallengeStateV3(
  saved: DailyChallengeState | DailyChallengeStateV3,
  highestLevel: number,
  now: Date,
  provider: DailyChallengeCatalogProviderV3,
  activeRun?: DailyChallengeActiveRunV3,
): DailyChallengeMigrationV3 {
  const migration = planDailyChallengeMigrationV3(saved, provider, activeRun);
  if (migration.status !== "ready") return migration;
  if (!Number.isFinite(now.getTime())) return {
    status: "blocked", reason: "invalid-clock", grantsReward: false, consumesAttempt: false,
  };
  const today = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (today <= saved.maxObservedDayKey) return migration;
  const fresh = createDailyChallengeStateV3(today, highestLevel, saved.playerSeed, provider);
  return fresh ? { status: "ready", state: fresh, grantsReward: false, consumesAttempt: false,
    sameDayStageFrozen: false, stageSource: "new-day-progress", mappedFromStageKey: null }
    : { status: "blocked", reason: "incomplete-target-catalog", grantsReward: false, consumesAttempt: false };
}
