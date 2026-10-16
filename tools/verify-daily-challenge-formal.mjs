throw new Error("Retired seam-factory verifier. Use tools/daily-challenge/formal-v2/verify-runtime.mjs with a new evidence directory to verify the actual 450 runtime objects.");
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { auditGeneratorQueueColors } from "./revised-generator-queue-colors.mjs";

const bundle = await build({
  stdin: {
    contents: `export { LEVELS } from "./src/core/levels.ts"; export { MECHANISM_GUIDE } from "./src/core/mechanismCatalog.ts"; export { FORMAL_DAILY_CHALLENGE_CATALOG } from "./src/core/formalDailyChallengeData.ts"; export { buildIndependentDailyChallengeLevel, dailyChallengeLayoutHash, dailyChallengeGeometryHash } from "./src/core/dailyChallengeVariant.ts"; export { validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { LEVELS, MECHANISM_GUIDE, FORMAL_DAILY_CHALLENGE_CATALOG: catalog, buildIndependentDailyChallengeLevel, dailyChallengeLayoutHash, dailyChallengeGeometryHash, validateLevel } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`,
);
const report = JSON.parse(await readFile("deliverables/daily-challenge-formal-20261005/catalog.json", "utf8"));
assert.equal(report.status, "FORMAL_INDEPENDENT_LAYOUTS_PROVEN");
assert.equal(LEVELS.length, 200, "formal daily generation must not widen the mainline campaign");
assert.equal(catalog.length, MECHANISM_GUIDE.length);
assert.equal(report.stageCount, MECHANISM_GUIDE.length);
const levelsById = new Map(LEVELS.map((level) => [level.id, level]));
const formalIds = new Set();
const layoutHashes = new Set();
let pendingProofs = 0;
let geometrySameAsSource = 0;
for (const [stageIndex, stage] of catalog.entries()) {
  const mechanism = MECHANISM_GUIDE[stageIndex];
  assert.equal(stage.newestMechanism, mechanism.id);
  assert.equal(stage.unlockLevel, mechanism.unlockLevel);
  assert.deepEqual(stage.unlockedMechanisms, MECHANISM_GUIDE
    .filter(({ unlockLevel }) => unlockLevel <= mechanism.unlockLevel)
    .map(({ id }) => id));
  assert.equal(stage.difficulties[1].candidates.length, 10);
  assert.equal(stage.difficulties[2].candidates.length, 10);
  assert.equal(stage.difficulties[3].candidates.length, 10);
  for (const difficulty of [1, 2, 3]) {
    for (const candidate of stage.difficulties[difficulty].candidates) {
      assert(!formalIds.has(candidate.formalId), `duplicate formal id ${candidate.formalId}`);
      formalIds.add(candidate.formalId);
      const source = levelsById.get(candidate.sourceLevelId);
      assert(source, `missing source ${candidate.sourceLevelId}`);
      const derived = buildIndependentDailyChallengeLevel(source, candidate.formalId, difficulty);
      validateLevel(derived);
      const queueAudit = auditGeneratorQueueColors(derived);
      assert(queueAudit.passed, `${candidate.formalId} generator queue contract: ${JSON.stringify(queueAudit.issues)}`);
      assert.equal(candidate.layoutSha256.length, 64, `${candidate.formalId} layout hash`);
      const layoutHash = (await import("node:crypto")).createHash("sha256").update(dailyChallengeLayoutHash(derived)).digest("hex");
      assert.equal(candidate.layoutSha256, layoutHash, `${candidate.formalId} layout binding`);
      const sourceLayoutHash = (await import("node:crypto")).createHash("sha256").update(dailyChallengeLayoutHash(source)).digest("hex");
      assert.equal(candidate.sourceLayoutSha256, sourceLayoutHash, `${candidate.formalId} source layout binding`);
      assert.equal(candidate.layoutDiffersFromSource, true, `${candidate.formalId} independent layout marker`);
      assert.notEqual(layoutHash, sourceLayoutHash, `${candidate.formalId} must not reuse mainline layout`);
      const sourceGeometryHash = (await import("node:crypto")).createHash("sha256").update(dailyChallengeGeometryHash(source)).digest("hex");
      const geometryHash = (await import("node:crypto")).createHash("sha256").update(dailyChallengeGeometryHash(derived)).digest("hex");
      assert.equal(candidate.sourceGeometrySha256, sourceGeometryHash, `${candidate.formalId} source geometry binding`);
      assert.equal(candidate.geometrySha256, geometryHash, `${candidate.formalId} geometry binding`);
      assert.equal(candidate.geometryDiffersFromSource, geometryHash !== sourceGeometryHash, `${candidate.formalId} geometry marker`);
      if (geometryHash === sourceGeometryHash) geometrySameAsSource += 1;
      assert(!layoutHashes.has(layoutHash), `duplicate independent layout ${candidate.formalId}`);
      layoutHashes.add(layoutHash);
      if (candidate.proofStatus !== "threshold-proven") pendingProofs += 1;
      assert.equal(candidate.layoutFactory, "seam-chambers-v1", `${candidate.formalId} independent factory`);
      assert.equal(candidate.routeReplayComplete, true, `${candidate.formalId} fresh route evidence`);
      assert.equal(candidate.proofTargetFloor, difficulty === 1 ? 11 : difficulty === 2 ? 21 : 31, `${candidate.formalId} proof floor`);
      assert.equal(candidate.sourceMechanisms.includes(mechanism.id), true);
      assert.equal(candidate.sourceMechanisms.every((id) => (
        (MECHANISM_GUIDE.find((entry) => entry.id === id)?.unlockLevel ?? Number.MAX_SAFE_INTEGER) <= mechanism.unlockLevel
      )), true);
      assert.equal(candidate.timeSeconds, source.timeSeconds);
      if (difficulty === 3) assert(candidate.minimumRepositionMoves > 30);
    }
  }
}
assert.equal(formalIds.size, catalog.length * 3 * 10);
assert.equal(layoutHashes.size, formalIds.size);
assert.equal(pendingProofs, 0, "formal catalogue contains pending proof rows");
assert.equal(geometrySameAsSource, 0, "formal catalogue reuses source geometry");
console.log(`PASS formal daily data: ${formalIds.size} unique independent layouts; geometry-equal-to-source=${geometrySameAsSource}; lower-bound proofs pending=${pendingProofs}; source LEVELS=${LEVELS.length}`);
