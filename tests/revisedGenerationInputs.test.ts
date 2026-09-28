import { describe, expect, it } from "vitest";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { createHash } from "node:crypto";
// The audit is an independent Node tool, deliberately outside production LevelSpec generation.
// @ts-ignore JS tool has no production declaration dependency.
import { auditCandidateCombinations, auditSourceLevel, buildAudit, inspectSourceMechanismCoverage, verifySourceReview, renderMarkdown, renderMechanismInventory } from "../tools/audit-revised-generation-inputs.mjs";
// @ts-ignore Independent Node evidence verifier is outside app declarations.
import { verifyInventoryReview, applyInventoryReview, INVENTORY_REVIEWS } from "../tools/revised-source-inventory.mjs";

const truthPath = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const reviewPath = "docs/level-generation/source-review-lv021-030.json";
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const sourceReview = () => JSON.parse(readFileSync(reviewPath, "utf8"));

describe("revised generation source contracts", () => {
  it("preserves source quantities separately from the authorized Lv26 design exception", async () => {
    const before = hash(truthPath);
    const report = await buildAudit();
    expect(report.ruleVersion).toBe("revised-2026-09-21-v1.2");
    expect(report.rulesDocumentVersion).toBe("1.2.1");
    expect(report.inputs["docs/rules/manifest.json"]).toBeDefined();
    expect(report.inputs["docs/mechanism-rules-v1.2.1.md"]).toBeDefined();
    for (const path of ["tools/audit-revised-generation-inputs.mjs", "src/core/revisedCandidateAudit.ts", "src/core/revisedLevelSearch.ts", "src/core/revisedRepositionFloor.ts", reviewPath]) {
      expect(report.inputs[path].sha256).toBe(hash(path));
    }
    expect(report.levels).toHaveLength(10);
    expect(report.conclusion.hardConflictLevels).toEqual([]);
    expect(report.conclusion.approvedOverrideLevels).toEqual([26]);
    expect(report.evidenceIntegrity.directLedgerHashMatchesTruth).toBe(true);
    expect(report.evidenceIntegrity.correctionHashMatchesTruth).toBe(true);
    expect(report.levels.map((row: any) => [row.level, row.immutableSourceContract.openingCount, row.immutableSourceContract.fullCount])).toEqual([
      [21, 14, 24], [22, 17, 29], [23, 13, 20], [24, 12, 26], [25, 22, 22],
      [26, 20, 35], [27, 9, 18], [28, 6, 19], [29, 21, 32], [30, 16, 21],
    ]);
    const lv26 = report.levels.find((row: any) => row.level === 26);
    expect(lv26.immutableSourceContract.physicalExitTotal).toBe(11);
    expect(lv26.immutableSourceContract.frozenExitValues).toEqual([5, 9, 14]);
    expect(lv26.immutableSourceContract.covers.hidden_batch_counts).toEqual([2, 13]);
    expect(lv26.approvedDesignOverride).toMatchObject({ ordinaryExitCountRange: [1, 5], frozenExitCount: 3, frozenExitValues: [5, 9, 14], maximumPhysicalExits: 8, allowAddedStarMechanisms: false, candidateCount: null });
    expect(report.levels.filter((row: any) => row.level !== 26).every((row: any) => row.approvedDesignOverride === null)).toBe(true);
    expect(report.conclusion.stage4SafeToStart).toBe(false);
    expect(report.conclusion.stage4Approved).toBe(false);
    expect(report.levels.every((row: any) => row.acceptance.stage4Approved === false)).toBe(true);
    expect(hash(truthPath)).toBe(before);
    expect(renderMarkdown(report)).toContain("普通出口由生成验证确定为1–5");
    expect(renderMarkdown(report)).not.toContain("本批无来源生成器和彩色地格");
  });

  it("checks one color across ordinary, frozen, star and flip exits together", () => {
    const result = auditCandidateCombinations({
      gates: [{ color: "red" }, { color: "red", frozen: 3 }, { color: "red", star: true }],
      flipDoors: [{ color: "red", initiallyOpen: true }],
      blocks: [],
    });
    expect(result.map((item: any) => item.code)).toEqual(["duplicate-exit-color", "star-exit-without-corresponding-block"]);
  });

  it("allows genuinely hidden ice but rejects generator queue ice", () => {
    const hidden = { id: "hidden", frozen: 6, shutterId: "cover" };
    expect(auditCandidateCombinations({ blocks: [hidden], shutters: [{ id: "cover", count: 1 }] })).toEqual([]);
    expect(auditCandidateCombinations({ blocks: [hidden], generators: [{ queueBlockIds: ["hidden"] }] })[0].code).toBe("queue-ice-prohibited");
  });

  it("does not hide duplicate physical exits behind one logical gate with two portals", () => {
    const result = auditCandidateCombinations({
      gates: [{ color: "red", portals: [
        { side: "left", origin: [0, 0], size: 1 },
        { side: "right", origin: [3, 0], size: 1 },
      ] }], blocks: [],
    });
    expect(result.map((item: any) => item.code)).toEqual(["duplicate-exit-color"]);
  });

  it("rejects shells anywhere in a floor level, including hidden and queued shells", () => {
    const blocks = [
      { id: "opening", layers: ["red", "blue"] },
      { id: "hidden", layers: ["red", "blue"], shutterId: "cover" },
      { id: "queued", layers: ["red", "blue"] },
    ];
    expect(auditCandidateCombinations({ coloredGrids: [{ color: "red", cells: [[0, 0]] }], blocks, generators: [{ queueBlockIds: ["queued"] }] }).map((item: any) => item.message)).toEqual(["opening", "hidden", "queued"]);
  });

  it("flags missing source cohorts instead of synthesizing staging or mutating input", () => {
    const source = {
      level: 21, board: { cols: 6, rows: 9 },
      composition: { opening_piece_count: 1, source_full_piece_count: 2, opening_shape_histogram: { SINGLE: 1 }, source_full_shape_histogram: { SINGLE: 2 }, full_color_count: 1 },
      mechanisms: { directional_exits: { ordinary_count: 1, frozen_values: [] } },
      stage_seeds: [{ id: "opening", kind: "opening", count: 1 }],
    };
    const before = JSON.stringify(source);
    expect(auditSourceLevel(source).hardConflicts.some((item: any) => item.code === "stage-total-mismatch")).toBe(true);
    expect(JSON.stringify(source)).toBe(before);
  });

  it.each([{}, { shutterId: "real-cover" }, { queued: true }])("allows one non-star plus one same-color star aperture with a matching carrier: %j", (placement) => {
    const blocks = [{ id: "star", color: "blue", star: true, layers: ["blue", "red"], ...placement }];
    expect(auditCandidateCombinations({
      gates: [{ color: "red", frozen: 3 }], flipDoors: [{ color: "red", star: true, initiallyOpen: false }], blocks,
      generators: placement.queued ? [{ queueBlockIds: ["star"] }] : [],
    })).toEqual([]);
  });

  it("does not apply the duplicate-color exception to a lone source-authorized star gate", () => {
    // Ordinary blocks may use star gates; source mechanism quantities are checked separately.
    expect(auditCandidateCombinations({
      gates: [{ color: "red", star: true }], blocks: [{ color: "red" }],
    })).toEqual([]);
  });

  it("requires a matching star carrier, not a plain or wrong-color block", () => {
    const gates = [{ color: "red" }, { color: "red", star: true }];
    for (const blocks of [[], [{ color: "red" }], [{ color: "blue", star: true }]]) {
      expect(auditCandidateCombinations({ gates, blocks }).map((item: any) => item.code)).toContain("star-exit-without-corresponding-block");
    }
  });

  it("still rejects two stars or two non-stars, including multiple physical star portals", () => {
    const blocks = [{ color: "red", star: true }];
    for (const gates of [
      [{ color: "red", star: true }, { color: "red", star: true }],
      [{ color: "red" }, { color: "red", frozen: 2 }],
      [{ color: "red", star: true, portals: [{}, {}] }],
    ]) expect(auditCandidateCombinations({ gates, blocks }).map((item: any) => item.code)).toContain("duplicate-exit-color");
  });

  it("counts palette colors, not valid star/non-star pairs as extra colors", () => {
    const colors = ["red", "blue", "yellow", "green", "orange", "purple", "pink", "cyan"];
    const gates = colors.flatMap((color) => [{ color }, { color, star: true }]);
    const blocks = colors.map((color) => ({ color, star: true }));
    expect(auditCandidateCombinations({ gates, blocks })).toEqual([]);
    expect(auditCandidateCombinations({ gates: [...gates, { color: "ninth" }], blocks }).map((item: any) => item.code)).toContain("exit-palette-capacity");
  });

  it("leaves unrecorded mechanism families unknown instead of fabricating absence", async () => {
    const coverage = inspectSourceMechanismCoverage({ mechanisms: {}, raw_evidence: { mechanisms: { nested_shell_block: { count: 0 } } } });
    expect(coverage.shells).toMatchObject({ status: "source-recorded", value: { count: 0 } });
    for (const family of ["generators", "coloredGrids", "bombs", "axisBlocks", "numericIce"]) {
      expect(coverage[family]).toEqual({ status: "unknown-not-recorded", value: null });
    }
    const report = await buildAudit();
    expect(report.conclusion.incompleteInventoryLevels).toEqual([]);
    expect(report.levels[0].immutableSourceContract.generators.count).toBe(0);
    expect(report.levels[0].evidenceGaps.map((item: any) => item.code)).not.toContain("source-mechanism-unknown");
    expect(report.levels[0].evidenceGaps.map((item: any) => item.code)).not.toContain("unserialized-exit-assignment");
    expect(report.levels[0].designConstraints).toMatchObject({ sourceExitGeometryEqualityRequired: false, sourceCoverGeometryEqualityRequired: false, sourceShapeHistogramIsReference: true });
  });

  it("binds all ten complete inventories to inspected evidence, without using runtime or changing truth", async () => {
    const before = hash(truthPath);
    const report = await buildAudit();
    expect(report.evidenceIntegrity.mechanismInventoryLevels).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
    for (const path of INVENTORY_REVIEWS) expect(report.inputs[path].sha256).toBe(hash(path));
    for (const row of report.levels) {
      expect(row.inventoryReview.verified).toBe(true);
      expect(Object.values(row.sourceMechanismCoverage)).toHaveLength(11);
      expect(Object.values(row.sourceMechanismCoverage).every((item: any) => item.status === "source-recorded")).toBe(true);
      for (const evidence of row.inventoryReview.evidence) expect(report.inputs[evidence.path].sha256).toBe(hash(evidence.path));
      for (const name of ["generators", "axisBlocks", "keyLocks", "starBlocks", "flipDoors", "coloredGrids", "bombs", "lifts"]) {
        expect(row.sourceMechanismCoverage[name].value.count).toBe(0);
        expect(row.sourceMechanismCoverage[name].value.reason.length).toBeGreaterThan(10);
      }
    }
    expect(hash(truthPath)).toBe(before);
    expect(renderMechanismInventory(report)).toContain("| 30 | 8×9 | 16/21 |");
    expect(renderMechanismInventory(report)).toContain("当前缺机制清单关数：0");
  });

  it("retains old counts beside evidence-backed corrections for thawed shells and missed whole blocks", async () => {
    const report = await buildAudit();
    expect(report.evidenceIntegrity.inventoryCorrectionLevels).toEqual([21, 29, 30]);
    const [a, b, c] = [21, 29, 30].map((id) => report.levels.find((row: any) => row.level === id));
    expect(a.originalRecordedSource.mechanisms.shells.count).toBe(3);
    expect(a.immutableSourceContract.shells.count).toBe(4);
    expect(a.immutableSourceContract.numericIce.post_melt_shell).toBe(1);
    expect(a.immutableSourceContract.shells.items[3]).toMatchObject({ shape: "SQ2", stage_id: "cover-2", requires_numeric_ice: true });
    expect(b.originalRecordedSource.composition.source_full_piece_count).toBe(31);
    expect(b.immutableSourceContract.covers.hidden_batch_counts).toEqual([6, 5]);
    expect(b.immutableSourceContract.sourceFullShapeHistogram.L4).toBe(2);
    expect(b.immutableSourceContract.shells.count).toBe(8);
    expect(c.originalRecordedSource.composition.opening_piece_count).toBe(15);
    expect(c.originalRecordedSource.composition.source_full_piece_count).toBe(18);
    expect(c.immutableSourceContract.covers.hidden_batch_counts).toEqual([5]);
    expect(c.immutableSourceContract.sourceOpeningShapeHistogram).toEqual({ SINGLE: 15, L3: 1 });
    expect(c.provenance.reviewedStableOpeningEvidence).toContain("sec-0548.jpg");
    for (const row of [a, b, c]) {
      expect(row.immutableSourceContract.stages.reduce((n: number, s: any) => n + s.count, 0)).toBe(row.immutableSourceContract.fullCount);
      expect(row.acceptance.stage4Approved).toBe(false);
    }
  });

  it("refuses stale, missing, duplicate or path-escaping source review evidence", async () => {
    const review = JSON.parse(readFileSync(INVENTORY_REVIEWS[0], "utf8"));
    const options = { truthSha256: hash(truthPath), directSha256: hash(review.direct.path), readBytes: async (path: string) => readFileSync(path) };
    await expect(verifyInventoryReview(review, options)).resolves.toBe(review);
    await expect(verifyInventoryReview(review, { ...options, truthSha256: "0".repeat(64) })).rejects.toThrow("source binding");
    const corrupt = structuredClone(review);
    corrupt.levels[0].evidence[0].sha256 = "0".repeat(64);
    await expect(verifyInventoryReview(corrupt, options)).rejects.toThrow("frame hash mismatch");
    const missing = structuredClone(review);
    delete missing.levels[0].mechanisms.bombs;
    await expect(verifyInventoryReview(missing, options)).rejects.toThrow("missing inventory family bombs");
    const duplicate = structuredClone(review);
    duplicate.levels.push(structuredClone(duplicate.levels[0]));
    await expect(verifyInventoryReview(duplicate, options)).rejects.toThrow("Duplicate/out-of-scope");
    const escape = structuredClone(review);
    escape.levels[0].evidence[0].path = ".codex-temp/video-audit-21-30-independent/../../outside.jpg";
    await expect(verifyInventoryReview(escape, options)).rejects.toThrow("invalid/duplicate");
    const unreasoned = structuredClone(review);
    delete unreasoned.levels[0].mechanisms.generators.reason;
    await expect(verifyInventoryReview(unreasoned, options)).rejects.toThrow("observation reason");
  });

  it("does not turn an explicitly unresolved reviewed family into an old default zero", () => {
    const source = JSON.parse(readFileSync(truthPath, "utf8")).levels.find((row: any) => row.level === 21);
    const row = JSON.parse(readFileSync(INVENTORY_REVIEWS[0], "utf8")).levels[0];
    row.verified = true;
    row.mechanisms.bombs = null;
    source.raw_evidence.mechanisms.bomb = { count: 0 };
    const result = applyInventoryReview(source, row);
    expect(inspectSourceMechanismCoverage(result).bombs).toEqual({ status: "unknown-not-recorded", value: null });
    expect(inspectSourceMechanismCoverage(source).bombs.value.count).toBe(0);
    const noCorrection = structuredClone(row);
    delete noCorrection.sourceCorrections;
    expect(() => applyInventoryReview(source, noCorrection)).toThrow("unlabelled source correction");
  });

  it("renders unresolved exit and cover inventories as unknown rather than zero", async () => {
    const report = await buildAudit();
    const row = report.levels.find((entry: any) => entry.level === 25);
    Object.assign(row.immutableSourceContract, { covers: null, ordinaryExitCount: null, starExitCount: null, starFrozenExitCount: null });
    const lines = renderMechanismInventory(report).split("\n").filter((line: string) => line.startsWith("| 25 |"));
    expect(lines[0]).toContain("| 未知 | 4、8、21、16、14、13、17 |");
    expect(lines[0]).toContain("| 2 | 未知 | 0/0 |");
    expect(lines[1]).toContain("| 0 | 0 | 0 | 0 | 未知 | 0 | 0 | 0 | 0 |");
  });

  it("applies the reviewed Lv23 reference mask only after truth and four frame hashes verify", async () => {
    const report = await buildAudit();
    const row = report.levels.find((entry: any) => entry.level === 23);
    expect(row.sourceReview.verified).toBe(true);
    expect(row.sourceReview.evidence).toHaveLength(4);
    expect(row.sourceReferenceBoard.playable_cell_count).toBe(46);
    expect(row.sourceReferenceBoard.source_playable_mask[2]).toBe("##..##");
    expect(row.evidenceGaps.map((item: any) => item.code)).not.toContain("source-mask-occupancy-mismatch");
    const original = JSON.parse(readFileSync(truthPath, "utf8")).levels.find((entry: any) => entry.level === 23);
    expect(original.board.playable_cell_count).toBe(48);
    for (const evidence of row.sourceReview.evidence) expect(report.inputs[evidence.path].sha256).toBe(hash(evidence.path));
  });

  it("refuses a stale truth hash or corrupted frame binding rather than applying review by level number", async () => {
    await expect(verifySourceReview(sourceReview(), { truthSha256: "0".repeat(64) })).rejects.toThrow("truth hash/path mismatch");
    const broken = sourceReview();
    broken.levels[0].evidence[2].sha256 = "0".repeat(64);
    await expect(verifySourceReview(broken, { truthSha256: hash(truthPath) })).rejects.toThrow("frame hash mismatch");
    const empty = sourceReview();
    empty.levels = [];
    expect((await verifySourceReview(empty, { truthSha256: hash(truthPath) })).size).toBe(0);
  });
});
