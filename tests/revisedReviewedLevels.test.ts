// @ts-expect-error The application tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The application tsconfig excludes Node ambient types; Vitest runs in Node.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LEVELS_BEFORE_LEVEL21_REPOSITION as FINAL_LEVELS, LEVELS_BEFORE_REVISED_CONTINUATION as LEVELS, LEVELS_BEFORE_REVISED_REVIEWED_INTEGRATION } from "../src/core/levels";
import { applyRevisedReviewedLevel } from "../src/core/revisedReviewedLevels";
import { REVISED_REVIEWED_LAYOUTS } from "../src/core/revisedReviewedLayouts.generated";
import { levelStarTargets, type LevelStarTargets } from "../src/core/levelStarConditions";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { replayRevisedRoute, type RevisedSearchDrag } from "../src/core/revisedLevelSearch";
import type { LevelSpec, PuzzleSnapshot } from "../src/core/types";

const REVIEWED_IDS = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 34, 50, 52, 58, 59, 60, 135, 152];
const BASELINE_PATH = ".codex-temp/formal-revised-v110/pre-integration.json";
const BASELINE_SHA256 = "00b7d87ee7a4bf835ce78bab65eb8420232bac5ab68f42c4743a589960089dae";
// Intentionally independent of the runtime generated type: a newly added
// legacy field must not silently become part of this reviewed gameplay payload.
const GAMEPLAY_FIELDS = [
  "mechanismRules", "width", "height", "playable", "blocked", "seams", "gates", "blocks",
  "flipDoors", "coloredGrids", "bombFailurePolicy", "shutters", "generators", "elevators", "conveyors",
] as const satisfies readonly (keyof LevelSpec)[];
const RETIRED_FIELDS = ["designTargets", "onboardingHint", "strategyNudge", "strategyFocus"] as const;

interface BaselineRow {
  id: number;
  sha256: string;
  starTargets: LevelStarTargets;
}
interface ReviewedRow {
  levelId: number;
  evidenceReport: string;
  evidenceReportSha256: string;
  dataPath: string;
  dataSha256: string;
  previewCandidateSha256: string;
  layoutSha256: string;
  drags: RevisedSearchDrag[];
  previous: Pick<LevelSpec, "name" | "difficulty" | "timeSeconds" | "reward" | "parMoves" | "featureIntro"> & {
    sha256: string;
    starTargets: LevelStarTargets;
  };
  sourceAligned: boolean;
  outlineAligned: boolean;
  legacyTargetsRecalibrated: boolean;
  lowerBoundCertified: boolean;
  releaseApproved: boolean;
}
interface IntegrationBaseline {
  ruleVersion: string;
  progressPath: string;
  expectedProgress: string;
  baseline: BaselineRow[];
  rows: ReviewedRow[];
  unchangedIds: number[];
}
interface PreviewRow {
  levelId: number;
  level: LevelSpec;
  drags: RevisedSearchDrag[];
  candidateSha256: string;
  sourceAligned: boolean;
  outlineAligned: boolean;
  pointerReplayValidated: boolean;
  renderVerified: boolean;
  lowerBoundCertified?: boolean;
  sourceFirstIntroductionCertified?: boolean;
  releaseApproved: boolean;
  replay: { valid: boolean; complete: boolean };
}
interface PreviewReport {
  rows: PreviewRow[];
  outputFiles: Record<string, { sha256: string }>;
}

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const entries = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(entries).sort().map((key) => [key, canonical(entries[key])]));
  }
  return value;
};
const bytesHash = (bytes: Uint8Array | string): string => createHash("sha256").update(bytes).digest("hex");
const semanticHash = (value: unknown): string => bytesHash(JSON.stringify(canonical(value)));
const readPinned = <T>(relativePath: string, expectedSha256: string): T => {
  const bytes = readFileSync(new URL(`../${relativePath}`, import.meta.url));
  // Fail closed before parsing: neither baseline nor historical evidence may
  // be edited in concert with runtime data to turn drift into a passing test.
  if (bytesHash(bytes) !== expectedSha256) throw new Error(`Pinned evidence changed: ${relativePath}`);
  return JSON.parse(bytes.toString("utf8")) as T;
};
const gameplay = (level: LevelSpec): Record<string, unknown> => Object.fromEntries(
  GAMEPLAY_FIELDS.filter((key) => Object.hasOwn(level, key)).map((key) => [key, level[key]]),
);
const baseline = readPinned<IntegrationBaseline>(BASELINE_PATH, BASELINE_SHA256);
const before = (id: number): LevelSpec => LEVELS_BEFORE_REVISED_REVIEWED_INTEGRATION[id - 1]!;
// This pinned certificate concerns the first 19-level stage. Subsequent batches
// have their own full-campaign before/after certificate; these 19 must stay exact.
const current = (id: number): LevelSpec => LEVELS[id - 1]!;
const evidence = new Map(baseline.rows.map((row) => {
  const detail = readPinned<PreviewRow>(row.dataPath, row.dataSha256);
  const report = readPinned<PreviewReport>(row.evidenceReport, row.evidenceReportSha256);
  return [row.levelId, { detail, report }] as const;
}));

describe("v1.10 first reviewed batch and its preserved final levels", () => {
  it("preserves the nineteen layouts through v1.14, before the separately certified v1.15 Lv21 redesign", () => {
    for (const id of REVIEWED_IDS) {
      const final = FINAL_LEVELS[id - 1]!;
      expect(final.mechanismRules).toBe("revised-2026-09-23-v1.4");
      expect({ ...final, mechanismRules: current(id).mechanismRules }).toEqual(current(id));
    }
  });
  it("pins the pre-integration snapshot and limits this batch to the 19 source-reviewed levels", () => {
    expect(baseline.ruleVersion).toBe("1.10.0");
    const progress = readPinned<{ rows: { levelId: number; status: string }[] }>(
      baseline.progressPath, baseline.expectedProgress,
    );
    expect(progress.rows.filter((row) => row.status === "source-reviewed").map((row) => row.levelId)).toEqual(REVIEWED_IDS);
    expect(baseline.rows.map((row) => row.levelId)).toEqual(REVIEWED_IDS);
    expect(Object.keys(REVISED_REVIEWED_LAYOUTS).map(Number)).toEqual(REVIEWED_IDS);
    expect(LEVELS).toHaveLength(200);
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 200 }, (_, index) => index + 1));
    expect(LEVELS.filter((level, index) => level !== LEVELS_BEFORE_REVISED_REVIEWED_INTEGRATION[index])
      .map((level) => level.id)).toEqual(REVIEWED_IDS);
  });

  it("preserves every pre-integration level hash, including the existing Lv2/Lv5 order swap", () => {
    expect(baseline.baseline).toHaveLength(200);
    for (const row of baseline.baseline) {
      expect(semanticHash(before(row.id)), `old Lv${row.id}`).toBe(row.sha256);
      expect(levelStarTargets(before(row.id)), `old stars Lv${row.id}`).toEqual(row.starTargets);
    }
    for (let id = 1; id <= 20; id += 1) {
      expect(current(id), `Lv${id} remains the same object`).toBe(before(id));
      expect(semanticHash(current(id)), `Lv${id} exact historical hash`).toBe(baseline.baseline[id - 1]!.sha256);
    }
  });

  it("leaves all other 181 levels untouched, including exit-only previews and the Lv39 conflict", () => {
    const unchangedIds = LEVELS.map((level) => level.id).filter((id) => !REVIEWED_IDS.includes(id));
    expect(unchangedIds).toHaveLength(181);
    expect(unchangedIds).toEqual(baseline.unchangedIds);
    expect(unchangedIds).toContain(39);
    for (const id of unchangedIds) {
      expect(current(id), `unmigrated Lv${id}`).toBe(before(id));
      expect(applyRevisedReviewedLevel(before(id))).toBe(before(id));
      expect(semanticHash(current(id))).toBe(baseline.baseline[id - 1]!.sha256);
    }
  });

  it("preserves the actual formal reward, name, total clock, teaching and displayed/settled star targets", () => {
    for (const row of baseline.rows) {
      const original = before(row.levelId), level = current(row.levelId);
      expect(semanticHash(original)).toBe(row.previous.sha256);
      for (const key of ["name", "reward", "timeSeconds", "featureIntro"] as const) {
        expect(level[key], `Lv${row.levelId} ${key}`).toEqual(original[key]);
        expect(level[key], `pinned Lv${row.levelId} ${key}`).toEqual(row.previous[key]);
      }
      expect(level.timeSeconds).not.toBe(300);
      expect(level.reward).toBeGreaterThan(0);
      expect(level.parMoves).toBe(row.previous.starTargets.moveTarget);
      expect(levelStarTargets(level)).toEqual(row.previous.starTargets);
      expect(levelStarTargets(level)).toEqual(levelStarTargets(original));
      const position = level.id % 10;
      expect(level.difficulty).toBe(position === 0 ? "super" : [3, 5, 8].includes(position) ? "hard" : "normal");
    }
  });

  it("matches all gameplay fields to SHA-bound preview data and its independently bound report", () => {
    for (const row of baseline.rows) {
      const { detail, report } = evidence.get(row.levelId)!;
      const reported = report.rows.find((entry) => entry.levelId === row.levelId)!;
      expect(reported, `Lv${row.levelId} report row`).toBeDefined();
      const reportDirectory = row.evidenceReport.slice(0, row.evidenceReport.lastIndexOf("/") + 1);
      expect(row.dataPath.startsWith(reportDirectory)).toBe(true);
      expect(report.outputFiles[row.dataPath.slice(reportDirectory.length)]!.sha256).toBe(row.dataSha256);
      for (const preview of [detail, reported]) {
        expect(semanticHash(preview.level)).toBe(row.previewCandidateSha256);
        expect(preview.candidateSha256).toBe(row.previewCandidateSha256);
        expect(preview.drags).toEqual(row.drags);
        expect(preview.sourceAligned).toBe(true);
        expect(preview.outlineAligned).toBe(true);
        expect(preview.pointerReplayValidated).toBe(true);
        expect(preview.renderVerified).toBe(true);
        expect(preview.replay.valid).toBe(true);
        expect(preview.replay.complete).toBe(true);
      }
      const expected = gameplay(detail.level);
      expect(semanticHash(expected)).toBe(row.layoutSha256);
      expect(REVISED_REVIEWED_LAYOUTS[row.levelId]).toEqual(expected);
      expect(gameplay(current(row.levelId))).toEqual(expected);
      expect(semanticHash(gameplay(current(row.levelId)))).toBe(row.layoutSha256);
    }
  });

  it("does not carry old geometry, staging, block-id hints or difficulty floors into the new layout", () => {
    for (const row of baseline.rows) {
      const level = current(row.levelId);
      expect(level.mechanismRules).toBe("revised-2026-09-21-v1.2");
      expect(level.shutters?.some((shutter) => ["staging", "staged-frame", "generator"].includes(shutter.skin ?? "")) ?? false).toBe(false);
      for (const key of RETIRED_FIELDS) expect(Object.hasOwn(level, key), `Lv${level.id} ${key}`).toBe(false);
      const allowed = new Set<string>([...GAMEPLAY_FIELDS, "id", "name", "difficulty", "timeSeconds", "reward", "parMoves", "featureIntro"]);
      expect(Object.keys(level).filter((key) => !allowed.has(key))).toEqual([]);
      expect(applyRevisedReviewedLevel(level)).toEqual(level);
      expect(row.lowerBoundCertified).toBe(false);
      expect(row.legacyTargetsRecalibrated).toBe(false);
      expect(row.releaseApproved).toBe(false);
      const detail = evidence.get(row.levelId)!.detail;
      expect(detail.lowerBoundCertified).not.toBe(true);
      expect(detail.sourceFirstIntroductionCertified).not.toBe(true);
    }
  });

  it("rebuilds gameplay even if a previous level contains obsolete optional mechanics and guidance", () => {
    const original = before(21);
    const contaminated: LevelSpec = {
      ...original,
      blocked: [[99, 99]],
      shutters: [{ id: "retired-stage", x: 99, y: 99, width: 1, height: 1, count: 1, skin: "staging" }],
      generators: [], elevators: [], conveyors: [], coloredGrids: [], flipDoors: [], seams: [],
      onboardingHint: { blockId: "retired-block", path: [[99, 99]] },
      strategyFocus: { blockId: "retired-block", afterMoves: 1 },
    };
    const migrated = applyRevisedReviewedLevel(contaminated);
    expect(gameplay(migrated)).toEqual(REVISED_REVIEWED_LAYOUTS[21]);
    for (const key of RETIRED_FIELDS) expect(Object.hasOwn(migrated, key)).toBe(false);
    expect(contaminated.blocked).toEqual([[99, 99]]);
    expect(contaminated.onboardingHint?.blockId).toBe("retired-block");
  });

  for (const row of baseline.rows) {
    it(`fresh-replays final Lv${row.levelId} completely without tools (spatial witness, not a time/lower-bound certificate)`, () => {
      const level = current(row.levelId), initialHash = semanticHash(level);
      expect(() => validateLevel(level)).not.toThrow();
      const opening = new PuzzleModel(level).snapshot();
      expect(opening.remainingSeconds).toBe(row.previous.timeSeconds);
      expect(opening.failed).toBe(false);
      const result = replayRevisedRoute(level, row.drags);
      expect(result.error).toBeUndefined();
      expect(result.valid).toBe(true);
      expect(result.complete).toBe(true);
      expect(result.effectiveDrags).toBe(row.drags.length);
      const final = JSON.parse(result.finalStateKey!) as Omit<PuzzleSnapshot, "moves">;
      expect(final.complete).toBe(true);
      expect(final.failed).toBe(false);
      expect(final.blocks).toEqual([]);
      expect(final.queuedBlocks).toEqual([]);
      expect(final.generators.every((generator) => generator.remaining === 0)).toBe(true);
      // The verifier deliberately supplies no fabricated elapsed time. Actual
      // Pointer replay and completion under the old fail clock are separate gates.
      expect(final.remainingSeconds).toBe(row.previous.timeSeconds);
      expect(semanticHash(level)).toBe(initialHash);
      expect(new PuzzleModel(level).snapshot()).toEqual(opening);
    });
  }
});
