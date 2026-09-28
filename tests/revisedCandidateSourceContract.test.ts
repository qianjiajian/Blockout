import { beforeAll, describe, expect, it } from "vitest";
import type { RevisedCandidateSourceContract } from "../src/core/revisedCandidateAudit";
// @ts-ignore Independent Node source tools intentionally have no app declaration dependency.
import { buildAudit } from "../tools/audit-revised-generation-inputs.mjs";
// @ts-ignore Independent Node source tools intentionally have no app declaration dependency.
import { buildCandidateSourceContract, auditCandidateSourceDetails } from "../tools/revised-candidate-source-contract.mjs";

let audit: any;
beforeAll(async () => { audit = await buildAudit(); });
const rowFor = (level: number, report = audit) => report.levels.find((row: any) => row.level === level);
const converted = (level: number, report = audit, seed = "contract-test-seed") => buildCandidateSourceContract(rowFor(level, report), { seed, audit: report });
const altered = (level: number, change: (row: any, report: any) => void) => {
  const report = structuredClone(audit);
  change(rowFor(level, report), report);
  return () => converted(level, report);
};

// Deliberately attachment-only data: positions/shapes are not a playable candidate
// and are not used to infer any source quota. The core static audit owns geometry.
const lv21AttachmentFixture = () => {
  const block = (id: string, shutterId?: string, frozen = 0, shell = false) => ({
    id, color: "red", ...(shutterId ? { shutterId } : {}),
    ...(frozen ? { frozen } : {}), ...(shell ? { layers: ["red", "blue"] } : {}),
  });
  return {
    id: 21,
    shutters: [{ id: "alpha", count: 10 }, { id: "beta", count: 17 }, { id: "gamma", count: 19 }],
    blocks: [
      ...Array.from({ length: 14 }, (_, i) => block(`opening-${i}`)),
      block("a-plain", "alpha"), block("a-shell1", "alpha", 0, true),
      block("a-shell2", "alpha", 0, true), block("a-ice", "alpha", 6),
      block("b-plain1", "beta"), block("b-plain2", "beta"),
      block("b-shell", "beta", 0, true), block("b-iced-shell", "beta", 2, true),
      block("c-plain1", "gamma"), block("c-plain2", "gamma"),
    ],
  };
};

describe("verified source report to revised candidate contract", () => {
  it("converts every real Lv21-30 row with the corrected independent counts", () => {
    const results = audit.levels.map((row: any) => buildCandidateSourceContract(row, { seed: `lv${row.level}-seed`, audit }));
    expect(results.map((result: any) => {
      const source: RevisedCandidateSourceContract = result.sourceContract;
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(source.levelId).toBeGreaterThanOrEqual(21);
      expect(source.originalMask?.length).toBe(rowFor(source.levelId!).sourceReferenceBoard.playable_cell_count);
      return [source.openingBlockCount, source.fullBlockCount];
    })).toEqual([[14, 24], [17, 29], [13, 20], [12, 26], [22, 22], [20, 35], [9, 18], [6, 19], [21, 32], [16, 21]]);
    expect(results.map((result: any) => result.minimumRepositionFloor)).toEqual([10, 10, 15, 10, 15, 10, 10, 15, 10, 20]);
  });

  it("keeps the Lv21 corrected fourth shell and the hidden ice/shell overlap", () => {
    const result = converted(21);
    expect(result.sourceContract.mechanisms.numericIceValues).toEqual([6, 2]);
    expect(result.sourceContract.mechanisms.shellBlocks).toBe(4);
    expect(result.sourceDetails.numericIce.post_melt_shell).toBe(1);
    expect(result.sourceDetails.stageProfiles).toEqual([
      { stageId: "opening", kind: "opening", clearCount: null, blockCount: 14, numericIceValues: [], shellBlocks: 0, icedShellValues: [] },
      { stageId: "cover-1", kind: "countdown_cover", clearCount: 10, blockCount: 4, numericIceValues: [6], shellBlocks: 2, icedShellValues: [] },
      { stageId: "cover-2", kind: "countdown_cover", clearCount: 17, blockCount: 4, numericIceValues: [2], shellBlocks: 2, icedShellValues: [2] },
      { stageId: "cover-3", kind: "countdown_cover", clearCount: 19, blockCount: 2, numericIceValues: [], shellBlocks: 0, icedShellValues: [] },
    ]);
  });

  it("keeps Lv24 two equal counters attached to distinct 5/9-block cohorts", () => {
    const result = converted(24);
    expect(result.sourceContract.mechanisms.shutterClearCounts).toEqual([12, 12]);
    expect(result.sourceContract.mechanisms.shutterHiddenBatchCounts).toEqual([5, 9]);
    expect(result.sourceDetails.stageProfiles.slice(1).map((profile: any) => [profile.blockCount, profile.numericIceValues, profile.icedShellValues])).toEqual([[5, [6, 6], [6, 6]], [9, [6, 6], [6]]]);
  });

  it("preserves the corrected Lv23 reference holes only for originality comparison", () => {
    const result = converted(23);
    expect(result.sourceContract.originalMask).toHaveLength(46);
    expect(result.sourceContract.originalMask).not.toContainEqual([2, 2]);
    expect(result.sourceContract.originalMask).not.toContainEqual([3, 2]);
    expect(result.designConstraints.sourceMaskIsReferenceNotCandidate).toBe(true);
    expect(result.sourceContract).not.toHaveProperty("playable");
    expect(result.sourceContract).not.toHaveProperty("gates");
  });

  it("keeps Lv26 source 11 exits and reports the separate approved design range", () => {
    const result = converted(26);
    expect(result.sourceContract.mechanisms.exits).toHaveLength(11);
    expect(result.sourceContract.mechanisms.exits.filter((exit: any) => exit.frozen === 0)).toHaveLength(8);
    expect(result.sourceContract.mechanisms.exits.filter((exit: any) => exit.frozen > 0).map((exit: any) => exit.frozen)).toEqual([5, 9, 14]);
    expect(result.approvedDesignOverride.ordinaryExitCountRange).toEqual([1, 5]);
    expect(result.approvedDesignOverride.candidateCount).toBeNull();
    expect(altered(26, (row) => { row.approvedDesignOverride.ordinaryExitCountRange = [1, 8]; })).toThrow(/lv026-override-mismatch/);
    expect(altered(25, (row) => { row.approvedDesignOverride = structuredClone(rowFor(26).approvedDesignOverride); })).toThrow(/unauthorized-level-override/);
  });

  it("binds effective source details and preserves inputs without mutating them", () => {
    const before = JSON.stringify(audit);
    const first = converted(21);
    const otherSeed = converted(21, audit, "a-different-generation-seed");
    expect(first.sourceContract.sha256).toBe(otherSeed.sourceContract.sha256);
    expect(first.sourceContract.seed).not.toBe(otherSeed.sourceContract.seed);
    expect(first.sourceBindings[first.ruleBinding.document].sha256).toBe(first.ruleBinding.sha256);
    const changed = structuredClone(audit);
    changed.inputs["tools/revised-source-inventory.mjs"].sha256 = "f".repeat(64);
    expect(converted(21, changed).sourceContract.sha256).not.toBe(first.sourceContract.sha256);
    first.sourceContract.originalMask[0][0] = 999;
    first.sourceDetails.numericIce.items[0].value = 999;
    expect(JSON.stringify(audit)).toBe(before);
  });

  it("rejects unbound rows and stale rule/frame bindings", () => {
    const detached = structuredClone(rowFor(21));
    detached.sourceNotes.push("unbound edit");
    expect(() => buildCandidateSourceContract(detached, { seed: "s", audit })).toThrow(/unbound-audit-row/);
    expect(altered(21, (_, report) => { report.rulesDocumentVersion = "1.1.0"; })).toThrow(/wrong-rule-binding/);
    expect(altered(21, (_, report) => { report.inputs["docs/mechanism-rules-v1.2.1.md"].sha256 = "0".repeat(64); })).toThrow(/wrong-rule-digest/);
    expect(altered(21, (row, report) => { delete report.inputs[row.inventoryReview.evidence[0].path]; })).toThrow(/unbound-source-frame/);
  });

  it("rejects missing evidence, unknown mechanism fields and unresolved source conflicts", () => {
    expect(altered(21, (row) => { row.sourceMechanismCoverage.axisBlocks = { status: "unknown-not-recorded", value: null }; })).toThrow(/unknown-mechanism/);
    expect(altered(21, (row) => { row.hardConflicts.push({ code: "unresolved", message: "source conflict" }); })).toThrow(/source-not-ready/);
    expect(altered(21, (row) => { row.evidenceGaps.push({ code: "missing", message: "source evidence missing" }); })).toThrow(/source-not-ready/);
    expect(altered(21, (row) => { row.inventoryReview.verified = false; })).toThrow(/unverified-inventory-review/);
  });

  it("does not silently erase a newly present unsupported mechanism family", () => {
    expect(altered(21, (row) => { row.sourceMechanismCoverage.axisBlocks.value.count = 1; })).toThrow(/unsupported-source-mechanism/);
    expect(altered(21, (row) => { row.sourceMechanismCoverage.keyLocks.value.key_count = 1; })).toThrow(/contradictory-absence/);
  });

  it("fails closed for unknown or inconsistent source masks", () => {
    expect(altered(21, (row) => { delete row.sourceReferenceBoard.source_playable_mask; })).toThrow(/source-mask-unknown/);
    expect(altered(21, (row) => { row.sourceReferenceBoard.playable_cell_count = 53; })).toThrow(/source-mask-count/);
    expect(altered(21, (row) => { row.sourceReferenceBoard.rows = 8; })).toThrow(/source-mask-dimensions/);
  });

  it("rejects independently reordered cover quotas and unsupported stage inventories", () => {
    expect(altered(28, (row) => {
      const covers = structuredClone(row.immutableSourceContract.covers);
      covers.hidden_batch_counts.reverse();
      covers.hidden_batch_histograms.reverse();
      row.immutableSourceContract.covers = covers;
      row.sourceMechanismCoverage.covers.value = structuredClone(covers);
    })).toThrow(/cover-stage-pairing/);
    expect(altered(21, (row) => { row.immutableSourceContract.stages[1].kind = "nonspatial_staging"; })).toThrow(/unsupported-stage/);
  });

  it("rejects hidden ice without an actual stage and unknown ice/shell attachment", () => {
    expect(altered(21, (row) => {
      row.immutableSourceContract.numericIce.items[0].stage_id = "not-a-stage";
      row.sourceMechanismCoverage.numericIce.value.items[0].stage_id = "not-a-stage";
    })).toThrow(/unbound-numeric-ice/);
    expect(altered(21, (row) => {
      delete row.immutableSourceContract.shells.items[3].requires_numeric_ice;
      delete row.sourceMechanismCoverage.shells.value.items[3].requires_numeric_ice;
    })).toThrow(/ice-shell-overlap-unknown/);
  });

  it("rejects ice values, deeper shells and weakened floors rather than normalizing them", () => {
    expect(altered(21, (row) => {
      row.immutableSourceContract.numericIce.values[0] = 5;
      row.sourceMechanismCoverage.numericIce.value.values[0] = 5;
    })).toThrow(/ice-item-values/);
    expect(altered(21, (row) => {
      row.immutableSourceContract.shells.extra_layers[0] = 2;
      row.sourceMechanismCoverage.shells.value.extra_layers[0] = 2;
    })).toThrow(/unsupported-shell-depth/);
    expect(altered(23, (row) => { row.designConstraints.minimumRepositionFloor = 10; })).toThrow(/design-rule-mismatch/);
  });
});

describe("candidate stage attachment supplement", () => {
  it("accepts independently named/reordered stages with the exact source attachments", () => {
    const candidate = lv21AttachmentFixture();
    candidate.shutters.reverse();
    candidate.blocks.reverse();
    expect(auditCandidateSourceDetails(candidate, rowFor(21))).toMatchObject({ checked: true, passed: true, issues: [] });
  });

  it("rejects hidden ice moved to opening even though all global counts are unchanged", () => {
    const candidate = lv21AttachmentFixture();
    const ice = candidate.blocks.find((block) => block.id === "a-ice")!;
    delete ice.frozen;
    candidate.blocks[0].frozen = 6;
    expect(auditCandidateSourceDetails(candidate, rowFor(21))).toMatchObject({ checked: true, passed: false, issues: [expect.objectContaining({ code: "candidate-stage-attachments" })] });
  });

  it("rejects separating ice from its shell within the same cohort", () => {
    const candidate = lv21AttachmentFixture();
    delete candidate.blocks.find((block) => block.id === "b-iced-shell")!.frozen;
    candidate.blocks.find((block) => block.id === "b-plain1")!.frozen = 2;
    expect(auditCandidateSourceDetails(candidate, rowFor(21)).passed).toBe(false);
  });

  it("rejects switching different hidden ice counters across equal-size cover cohorts", () => {
    const candidate = lv21AttachmentFixture();
    candidate.blocks.find((block) => block.id === "a-ice")!.frozen = 2;
    candidate.blocks.find((block) => block.id === "b-iced-shell")!.frozen = 6;
    expect(auditCandidateSourceDetails(candidate, rowFor(21)).passed).toBe(false);
  });

  it("rejects orphan hidden carriers and duplicate real cover IDs", () => {
    const candidate = lv21AttachmentFixture();
    candidate.blocks.find((block) => block.id === "a-ice")!.shutterId = "missing-cover";
    expect(auditCandidateSourceDetails(candidate, rowFor(21)).issues).toContainEqual(expect.objectContaining({ code: "orphan-candidate-hidden-block" }));
    const duplicate = lv21AttachmentFixture();
    duplicate.shutters[1].id = "alpha";
    expect(auditCandidateSourceDetails(duplicate, rowFor(21)).issues).toContainEqual(expect.objectContaining({ code: "invalid-candidate-shutter-ids" }));
  });
});
