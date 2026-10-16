import { clonePlainData } from "./clonePlainData";
import type { DailyChallengeAssignment, DailyChallengeDifficulty } from "./dailyChallenge";
import type { LevelSpec } from "./types";
import type { FormalDaily300Entry } from "./formalDailyChallenge300Data";
import { DAILY_CHALLENGE_V3_SLOTS, validateDailyChallengeStageMechanismsV3 } from "./dailyChallengeStagesV3";
import { isDailyChallengeProofWithinBand } from "./dailyChallengeDifficultyPolicy";

export interface FormalDaily300Registry {
  readonly revision: string;
  readonly count: number;
  assignments(stageKey: string, difficulty: DailyChallengeDifficulty): DailyChallengeAssignment[];
  resolve(assignment: DailyChallengeAssignment): Readonly<FormalDaily300Entry> | undefined;
}

const hex = (s: unknown): s is string => typeof s === "string" && /^[a-f0-9]{64}$/.test(s);
const positive = (n: number) => Number.isSafeInteger(n) && n > 0;
const freezeTree = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeTree(child);
    Object.freeze(value);
  }
  return value;
};

/** Admission hashes are verified offline against the original receipts and
 * actual UI evidence. Like the immutable legacy registry, runtime trusts only
 * compiled entries, never a persisted PASS flag or a persisted LevelSpec. */
export function createFormalDaily300Registry(
  revision: string,
  input: readonly FormalDaily300Entry[],
  inspector: {
    sourceLevelExists(id: number): boolean;
    mechanismsUsedByLevel(level: LevelSpec): readonly string[];
  },
): FormalDaily300Registry {
  if (!hex(revision)) throw new Error("Invalid formal300 revision");
  const slots = new Map(DAILY_CHALLENGE_V3_SLOTS.map((slot) => [slot.id, slot]));
  const entries = new Map<string, FormalDaily300Entry>();
  const layouts = new Set<string>();
  for (const original of input) {
    const entry = clonePlainData(original), slot = slots.get(entry.formalId);
    const p = entry.proof, a = entry.acceptance;
    const used = inspector.mechanismsUsedByLevel(entry.level);
    if (!slot || slot.stageKey !== entry.stageKey || slot.difficulty !== entry.difficulty || slot.slot !== entry.slot
      || entries.has(entry.formalId) || layouts.has(entry.layoutSha256)
      || !hex(entry.layoutSha256) || !hex(entry.admittedInRevision)
      || !positive(entry.sourceLevelId) || !inspector.sourceLevelExists(entry.sourceLevelId)
      || entry.level.id !== entry.sourceLevelId
      || !p || p.levelSha256 !== entry.layoutSha256 || p.sourceLevelId !== entry.sourceLevelId
      || !isDailyChallengeProofWithinBand(entry.difficulty, p.lowerBound, p.upperBound)
      || p.routeReplayComplete !== true || !hex(p.reportSha256) || !hex(p.routeSha256) || !hex(p.toolchainSha256)
      || !a || a.levelSha256 !== entry.layoutSha256 || !hex(a.designReportSha256) || !hex(a.runtimeReportSha256)
      || a.dualScreenPointer !== true || a.naturalTime !== true || a.fullInventory !== true || a.settlement !== true
      || !Array.isArray(entry.dailyMechanisms) || new Set(entry.dailyMechanisms).size !== entry.dailyMechanisms.length
      || used.length !== entry.dailyMechanisms.length || used.some((id) => !entry.dailyMechanisms.includes(id))
      || !validateDailyChallengeStageMechanismsV3(entry.stageKey, used).ok) {
      throw new Error(`Invalid formal300 entry: ${entry.formalId}`);
    }
    entries.set(entry.formalId, freezeTree(entry));
    layouts.add(entry.layoutSha256);
  }
  const assignmentFor = (entry: FormalDaily300Entry): DailyChallengeAssignment => ({
    id: entry.formalId, catalogKind: "formal300", catalogRevision: entry.admittedInRevision,
    sourceLevelId: entry.sourceLevelId, sourceDifficulty: entry.level.difficulty,
    variant: entry.slot - 1, minimumRepositionMoves: entry.proof.lowerBound,
    layoutSha256: entry.layoutSha256, layoutFactory: "explicit-certified-300-v1",
    proofStatus: "same-object-formal-300-v1", proofReportSha256: entry.proof.reportSha256,
    dailyMechanisms: [...entry.dailyMechanisms],
  });
  return Object.freeze({
    revision, count: entries.size,
    assignments(stageKey: string, difficulty: DailyChallengeDifficulty) {
      return [...entries.values()].filter((e) => e.stageKey === stageKey && e.difficulty === difficulty)
        .sort((a, b) => a.slot - b.slot).map(assignmentFor);
    },
    resolve(assignment: DailyChallengeAssignment) {
      if (assignment.catalogKind !== "formal300") return undefined;
      const entry = entries.get(assignment.id);
      if (!entry) return undefined;
      const expected = assignmentFor(entry);
      if (Object.entries(expected).some(([key, value]) => {
        const actual = assignment[key as keyof DailyChallengeAssignment];
        return Array.isArray(value) ? !Array.isArray(actual) || value.length !== actual.length
          || value.some((v, i) => v !== actual[i]) : actual !== value;
      })) return undefined;
      return entry;
    },
  });
}
