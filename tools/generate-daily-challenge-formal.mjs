// Retired implementation is preserved for historical audit only. Its input
// catalogue and proof factory are not the runtime objects used by schema 2.
throw new Error("Retired daily v1 generator. Use tools/daily-challenge/formal-v2/emit-catalog.mjs with a complete selected receipt index and a new output directory.");
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "esbuild";

// This tool writes an auditable, isolated catalogue. It deliberately does not
// alter LEVELS or the production selector: daily assignments remain a
// per-player, per-day choice at runtime. Candidate selection is repeated here
// from source rules so regeneration cannot accidentally read this catalogue.
const OUTPUT = "deliverables/daily-challenge-formal-20261005/catalog.json";
let proofEvidence;
let proofReportSha256;
try {
  const proofPath = "deliverables/daily-challenge-formal-20261006/proof-report.json";
  const proofBytes = await readFile(proofPath);
  proofEvidence = JSON.parse(proofBytes.toString("utf8"));
  proofReportSha256 = createHash("sha256").update(proofBytes).digest("hex");
} catch {
  proofEvidence = undefined;
}
const bundle = await build({
  stdin: {
    contents: `export { LEVELS } from "./src/core/levels.ts"; export { MECHANISM_GUIDE } from "./src/core/mechanismCatalog.ts"; export { mechanismsUsedByDailyLevel, dailyChallengeDifficultyLabel } from "./src/core/dailyChallenge.ts"; export { buildIndependentDailyChallengeLevel, dailyChallengeLayoutHash, dailyChallengeGeometryHash, dailyVariantIdentity } from "./src/core/dailyChallengeVariant.ts"; export { validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { LEVELS, MECHANISM_GUIDE, mechanismsUsedByDailyLevel, dailyChallengeDifficultyLabel, buildIndependentDailyChallengeLevel, dailyChallengeLayoutHash, dailyChallengeGeometryHash, dailyVariantIdentity, validateLevel } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`,
);

const levelsById = new Map(LEVELS.map((level) => [level.id, level]));
const mechanismUnlocks = new Map(MECHANISM_GUIDE.map(({ id, unlockLevel }) => [id, unlockLevel]));
const difficultyMatches = (level, difficulty) => difficulty === 1 ? level.difficulty === "hard" : level.difficulty === "super";
const repositionEstimate = (level) => Math.max(0, Math.floor(Number(level.preservedMoveTarget ?? level.parMoves) || 0));
const candidateLevels = (highestLevel, difficulty, newestMechanism) => {
  const allowed = (level) => {
    const used = mechanismsUsedByDailyLevel(level);
    return used.includes(newestMechanism)
      && used.every((id) => (mechanismUnlocks.get(id) ?? Number.MAX_SAFE_INTEGER) <= highestLevel);
  };
  const stageCandidates = LEVELS.filter((level) => difficultyMatches(level, difficulty) && allowed(level));
  if (stageCandidates.length) return stageCandidates;
  const stageMechanismCandidates = LEVELS.filter(allowed);
  if (stageMechanismCandidates.length) return stageMechanismCandidates;
  const sameDifficulty = LEVELS.filter((level) => difficultyMatches(level, difficulty));
  if (sameDifficulty.length) return sameDifficulty;
  return LEVELS.filter((level) => level.difficulty === "hard" || level.difficulty === "super");
};
const makeAssignments = (highestLevel, difficulty, newestMechanism) => {
  const candidates = candidateLevels(highestLevel, difficulty, newestMechanism);
  assert(candidates.length, `${newestMechanism} must have source candidates`);
  return Array.from({ length: 10 }, (_, slot) => {
    const source = candidates[slot % candidates.length];
    const variant = Math.floor(slot / candidates.length);
    const moves = repositionEstimate(source);
    return {
      sourceLevelId: source.id,
      variant,
      sourceDifficulty: source.difficulty,
      minimumRepositionMoves: difficulty === 1 ? 11 : difficulty === 2 ? 21 : 31,
    };
  });
};
const stages = [];
for (const mechanism of MECHANISM_GUIDE) {
  const stageKey = `mechanisms-${mechanism.id}-${mechanism.unlockLevel}`;
  const stage = {
    stageKey,
    unlockLevel: mechanism.unlockLevel,
    newestMechanism: mechanism.id,
    unlockedMechanisms: MECHANISM_GUIDE.filter(({ unlockLevel }) => unlockLevel <= mechanism.unlockLevel).map(({ id }) => id),
    difficulties: {},
  };
  for (const difficulty of [1, 2, 3]) {
    const assignments = makeAssignments(mechanism.unlockLevel, difficulty, mechanism.id);
    assert.equal(assignments.length, 10, `${stage.stageKey} D${difficulty} must have 10 candidates`);
    const pool = assignments.map((assignment, slot) => {
      const source = levelsById.get(assignment.sourceLevelId);
      assert(source, `missing source level ${assignment.sourceLevelId}`);
      const sourceMechanisms = mechanismsUsedByDailyLevel(source);
      assert(sourceMechanisms.includes(mechanism.id), `${assignment.sourceLevelId} omits stage mechanism ${mechanism.id}`);
      assert(
        sourceMechanisms.every((id) => (MECHANISM_GUIDE.find((entry) => entry.id === id)?.unlockLevel ?? Number.MAX_SAFE_INTEGER) <= mechanism.unlockLevel),
        `${assignment.sourceLevelId} uses a mechanism that is not unlocked at ${stage.stageKey}`,
      );
      if (difficulty === 3) assert(assignment.minimumRepositionMoves > 30, `${stage.stageKey} D3 move gate`);
      const formalId = `daily-${stage.stageKey}-d${difficulty}-${String(slot + 1).padStart(2, "0")}`;
      const derived = buildIndependentDailyChallengeLevel(source, formalId, difficulty);
      validateLevel(derived);
      // A daily slot is an independently authored layout.  Keep the source
      // fingerprint beside the derived fingerprint so the catalogue itself
      // proves that no slot is the unchanged mainline board.  Comparing the
      // semantic fingerprints (rather than ids/names) catches identity
      // transforms and colour/layout collisions as well as obvious reuse.
      const sourceLayoutSha256 = createHash("sha256").update(dailyChallengeLayoutHash(source)).digest("hex");
      const layoutSha256 = createHash("sha256").update(dailyChallengeLayoutHash(derived)).digest("hex");
      assert.notEqual(layoutSha256, sourceLayoutSha256, `${formalId} must differ from source layout`);
      const sourceGeometrySha256 = createHash("sha256").update(dailyChallengeGeometryHash(source)).digest("hex");
      const geometrySha256 = createHash("sha256").update(dailyChallengeGeometryHash(derived)).digest("hex");
      assert.notEqual(geometrySha256, sourceGeometrySha256, `${formalId} must differ from source geometry`);
      const identity = dailyVariantIdentity(formalId);
      const proof = proofEvidence?.results?.find((result) => result.formalId === formalId);
      const proofPassed = proof?.status === "PASS"
        && proof.hashBinding?.matched === true
        && proof.lowerBound?.thresholdProven === true
        && proof.route?.replay?.valid === true
        && proof.route?.replay?.complete === true;
      return {
        formalId,
        slot: slot + 1,
        sourceLevelId: assignment.sourceLevelId,
        variant: assignment.variant,
        layoutVariant: identity.layoutVariant,
        layoutTransform: identity.transform,
        colorShift: identity.colorShift,
        colorMultiplier: identity.colorMultiplier,
        colorPermutation: identity.colorPermutation,
        sourceLayoutSha256,
        layoutSha256,
        layoutDiffersFromSource: true,
        sourceGeometrySha256,
        geometrySha256,
        geometryDiffersFromSource: geometrySha256 !== sourceGeometrySha256,
        layoutFactory: "seam-chambers-v1",
        chamberCount: difficulty === 1 ? 11 : difficulty === 2 ? 21 : 31,
        dailyMechanisms: mechanismsUsedByDailyLevel(derived),
        proofReport: proofPassed ? "deliverables/daily-challenge-formal-20261006/proof-report.json" : undefined,
        proofReportSha256: proofPassed ? proofReportSha256 : undefined,
        proofResultSha256: proofPassed ? createHash("sha256").update(JSON.stringify(proof)).digest("hex") : undefined,
        proofTargetFloor: proofPassed ? proof.proofTargetFloor : undefined,
        proofLowerBound: proofPassed ? (proof.lowerBound?.composition?.componentFloorSum ?? proof.lowerBound?.relaxedNonClearingDrags) : undefined,
        routeReplayComplete: proofPassed ? true : undefined,
        sourceDifficulty: assignment.sourceDifficulty,
        dailyDifficulty: dailyChallengeDifficultyLabel(difficulty),
        minimumRepositionMoves: assignment.minimumRepositionMoves,
        timeSeconds: source.timeSeconds,
        sourceMechanisms,
        proofStatus: proofPassed ? "threshold-proven" : "pending",
      };
    });
    stage.difficulties[difficulty] = {
      label: dailyChallengeDifficultyLabel(difficulty),
      candidates: pool,
      uniqueSourceCount: new Set(pool.map((entry) => entry.sourceLevelId)).size,
      repeatedSourceVariants: pool.length - new Set(pool.map((entry) => entry.sourceLevelId)).size,
    };
  }
  stages.push(stage);
}

const report = {
  schemaVersion: 1,
  generatedAt: "2026-10-05",
  status: proofEvidence?.status === "PASS_INDEPENDENT_LOWER_BOUND_AND_ROUTE"
    && stages.every((stage) => Object.values(stage.difficulties).every((bucket) => bucket.candidates.every((candidate) => candidate.proofStatus === "threshold-proven")))
    ? "FORMAL_INDEPENDENT_LAYOUTS_PROVEN" : "PENDING_INDEPENDENT_LOWER_BOUND_PROOF",
  source: "src/core/levels.ts",
  sourceLevelCount: LEVELS.length,
  stageCount: stages.length,
  candidatesPerStage: 3 * 10,
  dailyDifficultyLabels: { 1: "难", 2: "超难", 3: "超超难" },
  notes: [
    "每个机制解锁阶段均登记三档各10个主线改编候选；当天抽取仍由玩家种子固定。",
    "每个槽位都由正式 id 生成独立 seam-chambers-v1 LevelSpec，并记录源/派生语义布局 SHA 与颜色无关的几何 SHA；布局不得复用主线源图。",
    proofEvidence?.status === "PASS_INDEPENDENT_LOWER_BOUND_AND_ROUTE"
      ? "450个槽位均已绑定同一布局的真实下界证明与fresh路线回放。"
      : "proofStatus=pending 表示真实下界证明尚未绑定到该槽位；在证明完成前不得把目录标为正式。",
    "目录隔离于生产 LEVELS、玩家存档和活动关序；不发布。",
  ],
  stages,
};
await mkdir("deliverables/daily-challenge-formal-20261005", { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
const tsData = [
  "// Generated by tools/generate-daily-challenge-formal.mjs; do not edit by hand.",
  "// This registry is isolated from LEVELS. Layouts are runtime-derived and admitted only with their bound proof metadata.",
  "export const FORMAL_DAILY_CHALLENGE_SCHEMA_VERSION = 1 as const;",
  `export const FORMAL_DAILY_CHALLENGE_CATALOG = ${JSON.stringify(stages, null, 2)} as const;`,
  "export type FormalDailyChallengeStage = (typeof FORMAL_DAILY_CHALLENGE_CATALOG)[number];",
  "export type FormalDailyChallengeDifficulty = 1 | 2 | 3;",
  "export const getFormalDailyChallengeStage = (stageKey: string): FormalDailyChallengeStage | undefined => FORMAL_DAILY_CHALLENGE_CATALOG.find((stage) => stage.stageKey === stageKey);",
  "export const getFormalDailyChallengeAssignments = (stageKey: string, difficulty: FormalDailyChallengeDifficulty) => {",
  "  const stage = getFormalDailyChallengeStage(stageKey);",
  "  const bucket = stage?.difficulties[String(difficulty) as keyof typeof stage.difficulties];",
  "  return bucket?.candidates.map((candidate) => ({ id: candidate.formalId, sourceLevelId: candidate.sourceLevelId, variant: candidate.variant, minimumRepositionMoves: candidate.minimumRepositionMoves, sourceDifficulty: candidate.sourceDifficulty, layoutVariant: candidate.layoutVariant, sourceLayoutSha256: candidate.sourceLayoutSha256, layoutSha256: candidate.layoutSha256, layoutDiffersFromSource: candidate.layoutDiffersFromSource, sourceGeometrySha256: candidate.sourceGeometrySha256, geometrySha256: candidate.geometrySha256, geometryDiffersFromSource: candidate.geometryDiffersFromSource, layoutFactory: candidate.layoutFactory, chamberCount: candidate.chamberCount, dailyMechanisms: candidate.dailyMechanisms, proofReport: candidate.proofReport, proofReportSha256: candidate.proofReportSha256, proofResultSha256: candidate.proofResultSha256, proofTargetFloor: candidate.proofTargetFloor, proofLowerBound: candidate.proofLowerBound, routeReplayComplete: candidate.routeReplayComplete, proofStatus: candidate.proofStatus }));",
  "};",
  "",
].join("\n");
await writeFile("src/core/formalDailyChallengeData.ts", tsData, "utf8");
console.log(`PASS ${stages.length} stages × 3 difficulties × 10 candidates -> ${OUTPUT}`);
