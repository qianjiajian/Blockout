import { describe, expect, it } from "vitest";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, symlinkSync, existsSync, unlinkSync, rmdirSync } from "node:fs";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { tmpdir } from "node:os";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { join } from "node:path";
// @ts-ignore Independent Node artifact tool has no production declaration dependency.
import { ARTIFACT_VERSION, canonicalJson, semanticHash, parseProposal, normalizeBudgets, assertFileBindings, sealArtifact, verifyArtifactSeal, assertSameContext, validateCandidateFile, writeArtifact } from "../tools/revised-candidate-artifact.mjs";

// This exact pilot proposal is a REJECTION fixture: its complete 0-reposition
// route disproves the required floor of 10. It is not a delivered candidate.
const fixturePath = "tests/fixtures/revised-candidate-rejection-lv027.json";
const proposal = () => JSON.parse(readFileSync(fixturePath, "utf8"));
const bytesHash = (value: string) => createHash("sha256").update(value).digest("hex");
const contextFixture = () => ({
  seed: "recorded-seed", candidateSha256: "candidate", sourceContractSha256: "source",
  rules: { version: "1.2.1", sha256: "locked-rule" },
  tool: { version: "v1", nodeVersion: "node", bundleSha256: "bundle" },
  files: { "evidence.bin": { sha256: "a".repeat(64) } },
  budgets: { maxStates: 5000, maxMilliseconds: 10000 }, floor: 10,
});
const sealed = (context = contextFixture()) => sealArtifact({
  schemaVersion: ARTIFACT_VERSION, kind: "candidate-validation", context,
  evidence: { witness: { drags: [{ blockId: "a", path: [[1, 2], [2, 2]] }] } },
  gates: { repositionFloor: false }, releaseApproved: false,
});

describe("revised candidate artifacts bind evidence but never trust a saved PASS", () => {
  it("canonicalizes object key order while preserving nested shape, queue and route array order", () => {
    const a = { z: 1, level: { shape: [[0, 0], [1, 0]], queue: ["a", "b"] } };
    const b = { level: { queue: ["a", "b"], shape: [[0, 0], [1, 0]] }, z: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(semanticHash(a)).toBe(semanticHash(b));
    expect(semanticHash({ ...b, level: { ...b.level, shape: [[1, 0], [0, 0]] } })).not.toBe(semanticHash(a));
    expect(semanticHash({ ...b, level: { ...b.level, queue: ["b", "a"] } })).not.toBe(semanticHash(a));
    expect(semanticHash([{ path: [[1, 2], [2, 2]] }])).not.toBe(semanticHash([{ path: [[2, 2], [1, 2]] }]));
  });

  it.each([
    ["undefined", undefined], ["non-finite", Number.NaN], ["positive infinity", Infinity],
    ["negative infinity", -Infinity], ["nested undefined", { value: undefined }],
    ["array undefined", [undefined]], ["sparse array", Array(2)],
    ["class instance", new Date(0)], ["bigint", BigInt(1)], ["function", () => 1],
  ])("rejects lossy or non-JSON canonical input: %s", (_label, value) => {
    expect(() => canonicalJson(value)).toThrow(/JSON values only/);
  });

  it("accepts a current proposal as an independent deep copy", () => {
    const input = proposal();
    const result = parseProposal(input);
    expect(result).toEqual(input);
    result.level.blocks[0].x += 1;
    expect(result.level.blocks[0].x).not.toBe(input.level.blocks[0].x);
  });

  it.each(["source", "sourceContract", "certificate", "certificates", "floor", "minimumRepositionFloor", "releaseApproved"])(
    "rejects an externally supplied authority field: %s", (field) => {
      expect(() => parseProposal({ ...proposal(), [field]: field === "floor" ? 0 : { passed: true } })).toThrow(/exactly|not accepted/);
    },
  );

  it.each(["", "   ", "x".repeat(257), 27, null])("rejects an invalid generation seed: %j", (seed) => {
    expect(() => parseProposal({ ...proposal(), seed })).toThrow(/seed/);
  });

  it.each([20, 31, 27.5, "27"])("rejects a level ID outside the isolated integer range: %j", (levelId) => {
    expect(() => parseProposal({ ...proposal(), levelId })).toThrow(/Lv21-30/);
  });

  it("rejects mismatching IDs, schema versions, frozen rule versions and runtime profiles", () => {
    const input = proposal();
    expect(() => parseProposal({ ...input, schemaVersion: 2 })).toThrow(/schema/);
    expect(() => parseProposal({ ...input, ruleVersion: "1.1.0" })).toThrow(/locked rules/);
    expect(() => parseProposal({ ...input, level: { ...input.level, id: 28 } })).toThrow(/ID\/profile/);
    for (const mechanismRules of [undefined, "revised-2026-09-21", "revised-2026-09-21-v1.1"]) {
      expect(() => parseProposal({ ...input, level: { ...input.level, mechanismRules } })).toThrow(/ID\/profile/);
    }
  });

  it("allows execution budget changes but never accepts an overridden difficulty floor", () => {
    expect(normalizeBudgets({ maxStates: 5000, maxMilliseconds: 10000 })).toMatchObject({ maxStates: 5000, maxMilliseconds: 10000 });
    expect(() => normalizeBudgets({ floor: 0 })).toThrow(/cannot be overridden/);
    expect(() => normalizeBudgets({ maxStates: 0 })).toThrow(/positive safe integer/);
    expect(() => normalizeBudgets({ maxMilliseconds: 1.5 })).toThrow(/positive safe integer/);
  });

  it("rejects constructor as a budget key even though Object.prototype defines it", () => {
    expect(() => normalizeBudgets({ constructor: 1 })).toThrow(/Unknown budget field/);
  });

  it("detects report or route mutation and refuses to treat its checksum as a trusted signature", () => {
    const original = sealed();
    expect(verifyArtifactSeal(original).releaseApproved).toBe(false);
    const reportTamper = structuredClone(original);
    reportTamper.releaseApproved = true;
    expect(() => verifyArtifactSeal(reportTamper)).toThrow(/checksum/);
    const routeTamper = structuredClone(original);
    routeTamper.evidence.witness.drags[0].path.reverse();
    expect(() => verifyArtifactSeal(routeTamper)).toThrow(/checksum/);
    const signatureTamper = structuredClone(original);
    signatureTamper.integrity.trustedSignature = true;
    expect(() => verifyArtifactSeal(signatureTamper)).toThrow(/checksum/);
  });

  it.each([
    ["seed", (context: any) => { context.seed = "another-seed"; }],
    ["candidate", (context: any) => { context.candidateSha256 = "changed"; }],
    ["source", (context: any) => { context.sourceContractSha256 = "changed"; }],
    ["rules", (context: any) => { context.rules.sha256 = "changed"; }],
    ["tool", (context: any) => { context.tool.bundleSha256 = "changed"; }],
    ["environment", (context: any) => { context.tool.nodeVersion = "changed"; }],
    ["budget", (context: any) => { context.budgets.maxStates += 1; }],
    ["file", (context: any) => { context.files["evidence.bin"].sha256 = "b".repeat(64); }],
    ["floor", (context: any) => { context.floor = 0; }],
  ])("invalidates an otherwise intact report when %s changes", (_label, mutate) => {
    const context = contextFixture();
    const original = sealed(context);
    expect(() => assertSameContext(original, structuredClone(context))).not.toThrow();
    const changed = structuredClone(context);
    (mutate as (input: any) => void)(changed);
    expect(() => assertSameContext(original, changed)).toThrow(/Stale artifact/);
  });

  it("checks actual bytes in an owned temporary root and detects same-length file drift", async () => {
    const ownedRoot = mkdtempSync(join(tmpdir(), "blockout-artifact-bindings-"));
    const file = join(ownedRoot, "evidence.bin");
    try {
      writeFileSync(file, "original");
      const bindings = { "evidence.bin": { sha256: bytesHash("original") } };
      await expect(assertFileBindings(bindings, ownedRoot)).resolves.toBeUndefined();
      writeFileSync(file, "modified");
      await expect(assertFileBindings(bindings, ownedRoot)).rejects.toThrow(/Snapshot drift/);
      await expect(assertFileBindings({ "../evidence.bin": { sha256: bytesHash("modified") } }, ownedRoot)).rejects.toThrow(/Unsafe repository/);
    } finally {
      // Exact files only; no recursive delete and no production tree writes.
      unlinkSync(file);
      rmdirSync(ownedRoot);
    }
  });

  it("rejects an output junction to a src directory inside the same owned fake project", async () => {
    const ownedRoot = mkdtempSync(join(tmpdir(), "blockout-artifact-junction-"));
    const evidencePath = join(ownedRoot, "evidence.bin");
    const fakeSource = join(ownedRoot, "src");
    const outputRoot = join(ownedRoot, "playtest-results", "experiments", "revised-candidate-artifacts");
    const junction = join(outputRoot, "redirected");
    const escapedFile = join(fakeSource, "leak.json");
    mkdirSync(fakeSource);
    mkdirSync(outputRoot, { recursive: true });
    writeFileSync(evidencePath, "evidence");
    // Both link and destination belong to this temporary fake project. Neither
    // side points at the real workspace or the production src directory.
    symlinkSync(fakeSource, junction, "junction");
    try {
      const artifact = sealArtifact({ schemaVersion: ARTIFACT_VERSION, kind: "candidate-validation",
        context: { files: { "evidence.bin": { sha256: bytesHash("evidence") } } }, releaseApproved: false });
      await expect(writeArtifact(artifact, "playtest-results/experiments/revised-candidate-artifacts/redirected/leak.json", ownedRoot))
        .rejects.toThrow(/junction|symlink|experiment output root/);
      expect(existsSync(escapedFile)).toBe(false);
    } finally {
      // Explicit known targets, then empty directories. Never recurse through
      // the junction, even if a future regression unexpectedly creates leak.json.
      if (existsSync(escapedFile)) unlinkSync(escapedFile);
      unlinkSync(junction);
      unlinkSync(evidencePath);
      rmdirSync(fakeSource);
      rmdirSync(outputRoot);
      rmdirSync(join(ownedRoot, "playtest-results", "experiments"));
      rmdirSync(join(ownedRoot, "playtest-results"));
      rmdirSync(ownedRoot);
    }
  });

  it("creates a legal report exclusively and preserves an existing report byte for byte", async () => {
    const ownedRoot = mkdtempSync(join(tmpdir(), "blockout-artifact-exclusive-"));
    const evidencePath = join(ownedRoot, "evidence.bin");
    const outputRoot = join(ownedRoot, "playtest-results", "experiments", "revised-candidate-artifacts");
    const reportPath = join(outputRoot, "report.json");
    writeFileSync(evidencePath, "evidence");
    const body = { schemaVersion: ARTIFACT_VERSION, kind: "candidate-validation", generatedAt: "first",
      context: { files: { "evidence.bin": { sha256: bytesHash("evidence") } } }, releaseApproved: false };
    try {
      const first = sealArtifact(body);
      await expect(writeArtifact(first, "playtest-results/experiments/revised-candidate-artifacts/report.json", ownedRoot)).resolves.toBe(reportPath);
      const originalBytes = readFileSync(reportPath, "utf8");
      expect(JSON.parse(originalBytes)).toEqual(first);
      const second = sealArtifact({ ...body, generatedAt: "second" });
      await expect(writeArtifact(second, "playtest-results/experiments/revised-candidate-artifacts/report.json", ownedRoot)).rejects.toMatchObject({ code: "EEXIST" });
      expect(readFileSync(reportPath, "utf8")).toBe(originalBytes);
    } finally {
      if (existsSync(reportPath)) unlinkSync(reportPath);
      unlinkSync(evidencePath);
      if (existsSync(outputRoot)) rmdirSync(outputRoot);
      if (existsSync(join(ownedRoot, "playtest-results", "experiments"))) rmdirSync(join(ownedRoot, "playtest-results", "experiments"));
      if (existsSync(join(ownedRoot, "playtest-results"))) rmdirSync(join(ownedRoot, "playtest-results"));
      rmdirSync(ownedRoot);
    }
  });

  it("recomputes the real rejected Lv27 fixture even after a forged all-PASS report is resealed", async () => {
    const protectedPaths = ["src/core/levels.ts", "src/core/PuzzleModel.ts", "docs/rules/manifest.json"];
    const protectedBefore = protectedPaths.map(path => createHash("sha256").update(readFileSync(path)).digest("hex"));
    const budgets = { maxStates: 5000, maxDragStates: 1000, maxTransitions: 250000, maxMilliseconds: 10000 };
    const original = await validateCandidateFile(fixturePath, { budgets });
    expect(original.verifiedByFreshExecution).toBe(true);
    expect(original.context.floor).toBe(10);
    expect(original.evidence.static.staticPassed).toBe(true);
    expect(original.evidence.static.issues).toEqual([]);
    expect(original.evidence.independentModelReplay).toMatchObject({ valid: true, complete: true, nonClearingDrags: 0 });
    expect(original.gates).toMatchObject({ static: true, spatialWitness: true, repositionFloor: false, pointerReplay: false, sameRouteTimeAndStars: false, calibratedTimeCoefficients: false, userAcceptance: false });
    expect(original.releaseApproved).toBe(false);
    expect(original.userAccepted).toBe(false);
    expect(original.status).toBe("not-certified");
    expect(original.context.files[fixturePath].sha256).toBe(createHash("sha256").update(readFileSync(fixturePath)).digest("hex"));
    expect(original.context.files["src/core/PuzzleModel.ts"]).toBeDefined();
    expect(original.context.files["src/core/revisedRepositionFloor.ts"]).toBeDefined();

    const fakeBody = structuredClone(verifyArtifactSeal(original));
    fakeBody.gates = Object.fromEntries(Object.keys(fakeBody.gates).map(key => [key, true]));
    fakeBody.releaseApproved = true;
    fakeBody.userAccepted = true;
    fakeBody.status = "approved";
    fakeBody.outstandingGates = [];
    fakeBody.evidence.repositionFloor = { status: "threshold-proven", thresholdProven: true, floor: 10 };
    const forged = sealArtifact(fakeBody);
    expect(verifyArtifactSeal(forged).releaseApproved).toBe(true);
    expect(forged.integrity.trustedSignature).toBe(false);
    const ownedRoot = mkdtempSync(join(tmpdir(), "blockout-artifact-previous-"));
    const previousPath = join(ownedRoot, "forged.json");
    try {
      writeFileSync(previousPath, JSON.stringify(forged));
      const verified = await validateCandidateFile(fixturePath, { budgets, previousPath });
      expect(verified.verifiedByFreshExecution).toBe(true);
      expect(verified.context).toEqual(original.context);
      expect(verified.evidence.independentModelReplay).toMatchObject({ valid: true, complete: true, nonClearingDrags: 0 });
      expect(verified.gates).toEqual(original.gates);
      expect(verified.gates.repositionFloor).toBe(false);
      expect(verified.status).toBe("not-certified");
      expect(verified.releaseApproved).toBe(false);
      expect(verified.userAccepted).toBe(false);
      expect(verified.outstandingGates).toContain("repositionFloor");
    } finally {
      unlinkSync(previousPath);
      rmdirSync(ownedRoot);
    }
    expect(protectedPaths.map(path => createHash("sha256").update(readFileSync(path)).digest("hex"))).toEqual(protectedBefore);
  }, 60000);
});
