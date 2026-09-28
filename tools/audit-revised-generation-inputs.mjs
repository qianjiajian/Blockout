import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { verifyRulesLock } from "./verify-rules-lock.mjs";
import { loadMechanismInventory, applyInventoryReview } from "./revised-source-inventory.mjs";

// Read source evidence only. Never import LEVELS or mutate a production level.
export const RULE_VERSION = "revised-2026-09-21-v1.2";
export const AUDIT_VERSION = "revised-generation-input-audit-v4";
export const PALETTE_LIMIT = 8;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRUTH = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const DIRECT = ".codex-temp/video-audit-21-30-independent/audit-lv021-030.json";
const CORRECTIONS = "playtest-results/experiments/video-parity-v6/source-audit/capacity-chain-reaudit/corrections.json";
const RULES = "docs/mechanism-rules-v1.2.1.md";
const REVIEW = "docs/level-generation/source-review-lv021-030.json";
const MANIFEST = "docs/rules/manifest.json";
const OUTPUT = "playtest-results/experiments/revised-mechanisms-2026-09-21";
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const json = (text) => JSON.parse(text.replace(/^\uFEFF/, ""));
const sum = (values) => values.reduce((total, value) => total + value, 0);
const countHistogram = (histogram = {}) => sum(Object.values(histogram));
const issue = (code, message) => ({ code, message });

export function auditCandidateCombinations(candidate) {
  const issues = [];
  const allExits = [...(candidate.gates ?? []), ...(candidate.flipDoors ?? [])];
  const counts = new Map();
  const starColors = new Set((candidate.blocks ?? []).filter((block) => block.star)
    .flatMap((block) => [block.color, ...(block.layers ?? [])]));
  for (const exit of allExits) {
    const mouths = Array.isArray(exit.portals) ? exit.portals.length : 1;
    const count = counts.get(exit.color) ?? { ordinary: 0, star: 0 };
    count[exit.star ? "star" : "ordinary"] += mouths;
    counts.set(exit.color, count);
  }
  for (const [color, count] of counts) {
    if (count.ordinary > 1 || count.star > 1) issues.push(issue("duplicate-exit-color", `${color}: ${count.ordinary} non-star and ${count.star} star apertures; same-type duplicates are prohibited`));
    if (count.ordinary > 0 && count.star > 0 && !starColors.has(color)) issues.push(issue("star-exit-without-corresponding-block", `${color}: no source-authorized matching star carrier/layer; empty star exits cannot create a duplicate-color allowance`));
  }
  if (counts.size > PALETTE_LIMIT) issues.push(issue("exit-palette-capacity", `${counts.size} exit colors exceed the ${PALETTE_LIMIT}-color palette`));
  const queued = new Set((candidate.generators ?? []).flatMap((generator) => generator.queueBlockIds ?? []));
  for (const block of candidate.blocks ?? []) {
    if (queued.has(block.id) && (block.frozen ?? 0) > 0) issues.push(issue("queue-ice-prohibited", block.id));
    if ((candidate.coloredGrids?.length ?? 0) > 0 && (block.layers?.length ?? 1) > 1) {
      issues.push(issue("colored-grid-shell-prohibited", block.id));
    }
    // Hidden ice is expressly allowed. It must not be treated as queue ice.
    if ((block.layers?.length ?? 1) > 2) issues.push(issue("shell-depth", block.id));
    if (block.layers?.length === 2 && block.layers[0] === block.layers[1]) issues.push(issue("same-color-shell", block.id));
  }
  return issues;
}

// Missing source fields are unknown, not a declaration that a mechanism is absent.
const sourceMechanism = (source, names, rawNames = []) => {
  for (const name of names) if (Object.hasOwn(source.mechanisms ?? {}, name)) return structuredClone(source.mechanisms[name]);
  for (const name of rawNames) {
    const raw = source.raw_evidence?.mechanisms?.[name];
    if (raw?.count === 0) return { count: 0, values: [], items: [] };
  }
  return null;
};

export function inspectSourceMechanismCoverage(source) {
  const specs = {
    generators: [["generators"], ["generator"]], axisBlocks: [["axis_blocks", "axis_constraints"], ["axis_blocks"]],
    keyLocks: [["keys_locks", "key_lock"], ["keys_locks"]], starBlocks: [["star_blocks"], ["star_block"]],
    flipDoors: [["flip_doors", "flip_door"], ["flip_door"]], coloredGrids: [["colored_grids", "colored_grid"], ["colored_grid"]],
    bombs: [["bombs", "timed_bombs"], ["bomb"]], lifts: [["lifts", "elevators"], ["lift"]],
    numericIce: [["numeric_ice"], ["numbered_ice_block"]], shells: [["shells"], ["nested_shell_block"]],
    covers: [["covers"], ["countdown_cover"]],
  };
  return Object.fromEntries(Object.entries(specs).map(([name, [keys, rawKeys]]) => {
    const value = sourceMechanism(source, keys, rawKeys);
    return [name, { status: value === null ? "unknown-not-recorded" : "source-recorded", value }];
  }));
}

export function auditSourceLevel(source, { paletteLimit = PALETTE_LIMIT } = {}) {
  const mechanisms = source.mechanisms ?? {};
  const exits = mechanisms.directional_exits ?? {};
  const composition = source.composition ?? {};
  const coverage = inspectSourceMechanismCoverage(source);
  const ordinary = exits.ordinary_count ?? null;
  const frozen = Array.isArray(exits.frozen_values) ? [...exits.frozen_values] : null;
  const star = exits.star_count ?? null;
  const starFrozen = exits.star_frozen_count ?? null;
  const flip = coverage.flipDoors.value?.count ?? null;
  // Count the explicitly recorded physical apertures; unrecorded mechanism families
  // remain visible as unknown below, not silently certified absent.
  const exitTotal = ordinary === null || frozen === null ? null : ordinary + frozen.length + (star ?? 0) + (starFrozen ?? 0) + (flip ?? 0);
  const hardConflicts = [];
  const conditionalConflicts = [];
  const evidenceGaps = [];
  const approvedDesignOverride = source.level === 26 ? {
    id: "lv026-ordinary-exit-reconfiguration-v1.2", ruleVersion: RULE_VERSION, rulesDocument: RULES,
    sourceOrdinaryExitCount: ordinary, sourcePhysicalExitTotal: exitTotal,
    ordinaryExitCountRange: [1, 5], frozenExitCount: 3, frozenExitValues: [5, 9, 14],
    maximumPhysicalExits: 8, allowAddedStarMechanisms: false, candidateCount: null,
    unchanged: "All other evidenced mechanism quantities/values, dimensions, opening/full block counts remain fixed.",
  } : null;
  if (approvedDesignOverride && (ordinary !== 8 || frozen?.join(",") !== "5,9,14" || star !== 0 || starFrozen !== 0)) {
    hardConflicts.push(issue("lv026-override-source-mismatch", "The Lv26 exception is bound to source 8 ordinary plus ice 5/9/14 and no star exits; changed source facts require review."));
  }
  const nonStarTotal = ordinary === null || frozen === null ? null : ordinary + frozen.length;
  if (!approvedDesignOverride && nonStarTotal > paletteLimit) hardConflicts.push(issue("exit-palette-capacity", `${nonStarTotal} recorded non-star physical exits exceed ${paletteLimit}; star pairing cannot permit repeated non-star apertures`));
  if (!approvedDesignOverride && (star ?? 0) + (starFrozen ?? 0) > paletteLimit) hardConflicts.push(issue("exit-palette-capacity", "Recorded star physical apertures exceed the palette; same-type duplicates remain forbidden"));
  if (!approvedDesignOverride && composition.full_color_count < nonStarTotal) conditionalConflicts.push(issue("source-color-count-vs-unique-exits", `Only if source full color count ${composition.full_color_count} were additionally required to match, ${nonStarTotal} distinct non-star exit colors would conflict. Source color-count equality is not an adopted hard rule.`));
  for (const [name, entry] of Object.entries(coverage)) if (entry.status === "unknown-not-recorded") {
    evidenceGaps.push(issue("source-mechanism-unknown", `${name}: missing from the serialized source; do not infer confirmed absence from a zero/empty default.`));
  }
  if (ordinary === null || frozen === null || star === null || starFrozen === null) evidenceGaps.push(issue("source-exit-inventory-incomplete", "One or more exit-type counts/values are not explicitly recorded."));
  const sourceOpeningCount = composition.opening_piece_count;
  const sourceFullCount = composition.source_full_piece_count;
  if (countHistogram(composition.opening_shape_histogram) !== sourceOpeningCount) hardConflicts.push(issue("opening-histogram-mismatch", "Opening histogram does not sum to opening count"));
  if (countHistogram(composition.source_full_shape_histogram) !== sourceFullCount) hardConflicts.push(issue("full-histogram-mismatch", "Full histogram does not sum to full count"));
  const stages = structuredClone(source.stage_seeds ?? []);
  if (sum(stages.map((stage) => stage.count)) !== sourceFullCount) hardConflicts.push(issue("stage-total-mismatch", "Exact stage cohorts do not sum to full count; non-spatial staging cannot repair this"));
  const covers = coverage.covers.value === null ? null : coverage.covers.value.count === 0
    ? { ...coverage.covers.value, hidden_batch_counts: [], hidden_batch_histograms: [] } : coverage.covers.value;
  if (covers && (covers.values?.length !== covers.count || covers.hidden_batch_counts?.length !== covers.count)) hardConflicts.push(issue("cover-count-mismatch", "Cover values/cohorts must be one-to-one"));
  const hiddenIce = (coverage.numericIce.value?.items ?? []).filter((item) => item.stage_id !== "opening");
  const shells = coverage.shells.value?.count ?? null;
  const grids = coverage.coloredGrids.value?.count ?? null;
  if (grids && shells) hardConflicts.push(issue("colored-grid-shell-prohibited", "Source would require both floor cells and shells; whole-level prohibition includes hidden and queued shells"));
  if (hiddenIce.some((item) => !stages.some((stage) => stage.id === item.stage_id))) evidenceGaps.push(issue("unbound-hidden-ice", "A hidden frozen block lacks a source stage owner"));
  const rectangular = new Set(["SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "SQ3", "RECT2X3", "RECT3X2"]);
  const irregularCount = (histogram) => sum(Object.entries(histogram ?? {}).filter(([shape]) => !rectangular.has(shape)).map(([, count]) => count));
  const openingIrregular = irregularCount(composition.opening_shape_histogram);
  const fullIrregular = irregularCount(composition.source_full_shape_histogram);
  if (openingIrregular > sourceOpeningCount * 0.3 || fullIrregular > sourceFullCount * 0.3) conditionalConflicts.push(issue("source-irregular-shape-ratio", "Copying the source shape histogram would exceed the 30% block-count cap; new shapes need an explicit original-design contract"));
  // Source coordinates are reference only; original geometry belongs to the candidate.
  const referenceNotes = [issue("original-exit-geometry-required", "Candidate mouth color/side/width/position must be authored and validated. Missing source coordinates/width do not require replica geometry or block original design.")];
  const unpositionedCovers = stages.filter((stage) => stage.kind === "countdown_cover" && (typeof stage.position !== "object" || stage.position === null)).map((stage) => stage.id);
  if (unpositionedCovers.length) referenceNotes.push(issue("source-cover-geometry-reference-only", `${unpositionedCovers.join(", ")}: no source rectangle serialized. Author an original legal candidate region; keep each counter paired with its hidden batch count.`));
  for (const field of source.provenance?.unclear_fields ?? []) evidenceGaps.push(issue("source-unclear", String(field)));
  const slot = (source.level - 1) % 10;
  const band = slot === 9 ? "super-hard" : [2, 4, 7].includes(slot) ? "hard" : "normal";
  return {
    level: source.level,
    ruleVersion: RULE_VERSION,
    status: hardConflicts.length ? "blocked-source-constraint-conflict" : "contract-preflight-only-not-generation-approved",
    immutableSourceContract: {
      width: source.board.cols, height: source.board.rows,
      openingCount: sourceOpeningCount, fullCount: sourceFullCount,
      sourceOpeningColors: composition.opening_color_count, sourceFullColors: composition.full_color_count,
      ordinaryExitCount: ordinary, frozenExitCount: frozen?.length ?? null, frozenExitValues: frozen,
      starExitCount: star, starFrozenExitCount: starFrozen, flipDoorCount: flip, physicalExitTotal: exitTotal,
      numericIce: coverage.numericIce.value,
      shells: coverage.shells.value,
      covers, stages, sourceOpeningShapeHistogram: composition.opening_shape_histogram,
      sourceFullShapeHistogram: composition.source_full_shape_histogram,
      generators: coverage.generators.value,
      coloredGridCount: grids,
    },
    approvedDesignOverride, sourceMechanismCoverage: coverage,
    designConstraints: { band, minimumRepositionFloor: band === "super-hard" ? 20 : band === "hard" ? 15 : 10, paletteLimit, starNonStarPairRequiresMatchingStarBlock: true, hiddenIceAllowed: true, generatorQueueIceAllowed: false, noAddedNonSpatialStaging: true, sourceMaskIsReferenceNotCandidate: true, sourceShapeHistogramIsReference: true, sourceColorCountEqualityRequired: false, sourceExitGeometryEqualityRequired: false, sourceCoverGeometryEqualityRequired: false, recalculateTimeAndStars: true },
    combinationChecks: {
      hiddenIceCount: coverage.numericIce.value === null ? null : hiddenIce.length,
      hiddenIce: coverage.numericIce.value === null ? "unknown-source-inventory" : hiddenIce.length ? "allowed; invisible counters stay unchanged, reveal event does not decrement them" : "not-present-in-recorded-numeric-ice-inventory",
      generatorQueueIce: coverage.generators.status === "unknown-not-recorded" ? "source generator inventory unknown; candidate queue ice remains forbidden" : "recorded inventory; candidate queue ice remains forbidden",
      coloredGridShell: grids === null || shells === null ? "unknown-source-inventory" : grids && shells ? "conflict" : "no-observed-conflict",
      shellDepth: shells === 0 ? "explicitly-no-shells" : Array.isArray(coverage.shells.value?.extra_layers) && coverage.shells.value.extra_layers.every((value) => value === 1) ? "source shells have one extra layer" : "requires-review",
      irregularRatio: { opening: [openingIrregular, sourceOpeningCount], full: [fullIrregular, sourceFullCount] },
    },
    hardConflicts, conditionalConflicts, evidenceGaps, referenceNotes,
    sourceNotes: structuredClone(source.notes ?? []),
    acceptance: { staticCandidate: "not-run-no-candidate", modelReplay: "not-run-no-candidate", lowerBound: "unproven", calibratedTimeAndStars: "unproven", stage4SafeToStart: false, stage4Approved: false },
  };
}

const codeFinding = (path, source, needle, message) => ({ path, line: source.slice(0, source.indexOf(needle)).split("\n").length, needle, message });

export async function verifySourceReview(review, { root = ROOT, truthSha256 } = {}) {
  if (review.schemaVersion !== 1 || review.truth?.path !== TRUTH || review.truth.sha256 !== truthSha256) {
    throw new Error("Source review truth hash/path mismatch; stale corrections must not be applied");
  }
  const verified = new Map();
  for (const entry of review.levels ?? []) {
    if (verified.has(entry.level) || !Number.isSafeInteger(entry.level) || !Array.isArray(entry.evidence) || entry.evidence.length < 2) {
      throw new Error("Invalid or duplicate source-review level/evidence");
    }
    const mask = entry.correctedReferenceBoard?.source_playable_mask;
    const { cols, rows, playable_cell_count: count } = entry.correctedReferenceBoard ?? {};
    if (!Array.isArray(mask) || mask.length !== rows || mask.some((row) => typeof row !== "string" || row.length !== cols || /[^#.]/.test(row))
      || mask.join("").split("#").length - 1 !== count) throw new Error("Invalid corrected reference mask");
    for (const evidence of entry.evidence) {
      if (typeof evidence.path !== "string" || !evidence.path.startsWith(".codex-temp/video-audit-21-30-independent/frames-1fps/")
        || evidence.path.includes("..") || !/^[a-f0-9]{64}$/.test(evidence.sha256)) throw new Error("Invalid source review frame binding");
      const bytes = await readFile(resolve(root, evidence.path));
      if (sha256(bytes) !== evidence.sha256) throw new Error(`Source review frame hash mismatch: ${evidence.path}`);
    }
    verified.set(entry.level, structuredClone(entry));
  }
  return verified;
}

export async function buildAudit(root = ROOT) {
  const lock = verifyRulesLock({ readText: (path) => readFileSync(resolve(root, path), "utf8") });
  if (!lock.ok) throw new Error(`Rules integrity failed: ${lock.errors.join("; ")}`);
  const paths = [TRUTH, DIRECT, CORRECTIONS, REVIEW, MANIFEST, RULES, "tools/audit-revised-generation-inputs.mjs", "tools/revised-source-inventory.mjs", "src/core/types.ts", "src/core/PuzzleModel.ts", "src/core/mechanismRules.ts", "src/core/revisedMechanismContract.ts", "src/core/revisedCandidateAudit.ts", "src/core/revisedLevelSearch.ts", "src/core/revisedRepositionFloor.ts", "src/core/levelSolver.ts", "tools/prove-video-parity-reposition-floors.mjs", "tools/prove-video-parity-reposition-floor-wide.mjs", "src/core/blockExitFrontier.ts"];
  const texts = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await readFile(resolve(root, path), "utf8")])));
  const manifest = json(texts[MANIFEST]);
  const active = manifest.versions.find((entry) => entry.version === manifest.activeVersion);
  if (active?.runtimeProfile !== RULE_VERSION || active?.document !== RULES) throw new Error("Preflight tool must be updated for the active locked rules before generating a report");
  const truth = json(texts[TRUTH]);
  const direct = json(texts[DIRECT]);
  const corrections = json(texts[CORRECTIONS]);
  const sourceReviews = await verifySourceReview(json(texts[REVIEW]), { root, truthSha256: sha256(texts[TRUTH]) });
  const inventory = await loadMechanismInventory({ root, truthSha256: sha256(texts[TRUTH]), directSha256: sha256(texts[DIRECT]) });
  const records = truth.levels.filter((level) => level.level >= 21 && level.level <= 30);
  const rows = records.map((record) => {
    const inventoryReview = inventory.rows.get(record.level);
    const reviewedSource = applyInventoryReview(record, inventoryReview);
    const row = auditSourceLevel(reviewedSource);
    row.inventoryReview = inventoryReview;
    row.originalRecordedSource = { composition: structuredClone(record.composition), mechanisms: structuredClone(record.mechanisms), stage_seeds: structuredClone(record.stage_seeds) };
    const original = direct.levels.find((level) => level.level === record.level);
    const correction = corrections.levels.find((level) => level.level === record.level);
    const reviewed = sourceReviews.get(record.level);
    row.sourceReferenceBoard = structuredClone(reviewed?.correctedReferenceBoard ?? record.board);
    row.sourceReview = reviewed ? { path: REVIEW, verified: true, ...reviewed } : null;
    const expectedFull = inventoryReview.sourceCorrections?.composition?.source_full_piece_count ?? correction?.composition?.full_piece_count ?? original?.blocks?.full_count;
    if (expectedFull !== row.immutableSourceContract.fullCount) row.hardConflicts.push(issue("truth-source-full-count-mismatch", "Truth full count is not supported by the direct ledger or the later correction"));
    row.status = row.hardConflicts.length ? "blocked-source-constraint-conflict" : "contract-preflight-only-not-generation-approved";
    row.provenance = {
      truthPath: TRUTH, directPath: DIRECT, directOpeningEvidence: original?.opening_evidence,
      reviewedStableOpeningEvidence: inventoryReview.stableOpeningEvidence ?? original?.opening_evidence,
      correction: correction ? { path: CORRECTIONS, id: correction.correction_id, evidence: correction.evidence, oldFullCount: original.blocks.full_count, correctedFullCount: correction.composition.full_piece_count } : null,
    };
    return row;
  });
  const solverPath = "src/core/levelSolver.ts";
  const solver = texts[solverPath];
  const modernPath = "tools/prove-video-parity-reposition-floors.mjs";
  const modern = texts[modernPath];
  const oldPath = "tools/prove-video-parity-reposition-floor-wide.mjs";
  const old = texts[oldPath];
  const findings = [];
  const addIf = (condition, path, source, needle, message) => { if (condition) findings.push(codeFinding(path, source, needle, message)); };
  addIf(solver.includes("unsupportedRuleProfile"), solverPath, solver, "const unsupportedRuleProfile", "Legacy solver explicitly refuses versioned rules. Its historical transitions below are preserved for compatibility, not a revised route/proof implementation.");
  addIf(!solver.includes("mechanismRules"), solverPath, solver, "interface SolverState", "No revised rule-version dispatch found in the solver. Its state transitions are not qualified for the new rule version.");
  addIf(solver.includes("if (block.id !== clearedId) block.frozen = Math.max(0, block.frozen - 1);"), solverPath, solver, "if (block.id !== clearedId) block.frozen", "Counter loop decrements every hidden block too. This directly conflicts with Lv21/Lv22/Lv24 hidden numeric ice and M14.");
  addIf(/if \(blockRemoved\)\s*\{\s*for \(const door of next.flipDoors\)/.test(solver), solverPath, solver, "for (const door of next.flipDoors)", "Flip doors toggle only on full removal, whereas M05 requires successful peeling too.");
  addIf(solver.includes('releaseReadyGenerators(level, next, "move")'), solverPath, solver, 'releaseReadyGenerators(level, next, "move")', "Generator transitions still use move/time events. Revised immediate vacant-footprint release needs independent parity verification.");
  addIf(solver.includes('shutter.skin === "lift"'), solverPath, solver, 'shutter.skin === "lift"', "Lift state advances through clear counters, rather than arbitrary visible occupancy clearing its fixed region.");
  addIf(solver.includes('level.bombFailurePolicy === "fail"'), solverPath, solver, 'level.bombFailurePolicy === "fail"', "Historical deadline search is unsupported. Versioned profiles are now separately refused; a future revised witness/proof tool must also validate elapsed-time constraints.");
  const allowedSection = modern.slice(modern.indexOf("function unsupportedReason(level)"), modern.indexOf("function coreStageContext(level)"));
  addIf(!allowedSection.includes('"mechanismRules"'), modernPath, modern, "function unsupportedReason(level)", "Current proof tool safely rejects the new mechanismRules field as unknown. Removing that check is not a proof of semantic support.");
  addIf(!modern.includes('snapshot.flipDoors'), modernPath, modern, "`g:${snapshot.gates", "Proof state identity and exit enumeration do not represent flip-door state; bomb clocks and revised timing also need explicit identity and transition coverage.");
  addIf(old.includes("for (const shutter of state.shutters) shutter.count = Math.max(0, shutter.count - 1);"), oldPath, old, "for (const shutter of state.shutters) shutter.count", "Legacy wide proof duplicates old counter transitions and lacks revised hidden-ice/flip/generator semantics. Its full bounding span check alone does not qualify it.");
  const sourceBindings = Object.fromEntries(paths.map((path) => [path, { sha256: sha256(texts[path]) }]));
  Object.assign(sourceBindings, inventory.bindings);
  const directBinding = truth.sources.find((source) => source.scope === "lv021_030_direct");
  const correctionBinding = truth.sources.find((source) => source.scope === "capacity_chain_reaudit");
  const evidenceFiles = [];
  for (const original of direct.levels) {
    const match = original.opening_evidence.match(/frames-1fps\/sec-\d+\.jpg/);
    if (!match) continue;
    const path = `.codex-temp/video-audit-21-30-independent/${match[0]}`;
    let bytes = null;
    try { bytes = await readFile(resolve(root, path)); } catch { /* Missing evidence is reported explicitly. */ }
    evidenceFiles.push({ level: original.level, path, exists: bytes !== null, sha256: bytes === null ? null : sha256(bytes) });
  }
  for (const review of sourceReviews.values()) for (const evidence of review.evidence) sourceBindings[evidence.path] = { sha256: evidence.sha256 };
  const incompleteInventoryLevels = rows.filter((row) => row.evidenceGaps.some((gap) => gap.code === "source-mechanism-unknown")).map((row) => row.level);
  return {
    schemaVersion: AUDIT_VERSION, ruleVersion: RULE_VERSION, rulesDocumentVersion: manifest.activeVersion, generatedAt: new Date().toISOString(),
    scope: "Read-only source contract and proof-tool preflight for Lv21-30; no candidate generation, runtime LEVELS import, or solving",
    inputs: sourceBindings,
    evidenceIntegrity: { directLedgerHashMatchesTruth: directBinding.sha256.toLowerCase() === sha256(texts[DIRECT]), correctionHashMatchesTruth: correctionBinding.sha256.toLowerCase() === sha256(texts[CORRECTIONS]), sourceReviewVerified: true, sourceReviewLevels: [...sourceReviews.keys()], mechanismInventoryVerified: true, mechanismInventoryLevels: [...inventory.rows.keys()], inventoryCorrectionLevels: rows.filter((row) => row.inventoryReview.sourceCorrections).map((row) => row.level), openingEvidenceFiles: evidenceFiles },
    toolReadiness: { qualifiedForRevisedRules: false, findings, limits: "Static source inspection only. No model implementation claim, route, time calibration, or lower-bound certificate is issued. All source hashes bind this snapshot; rerun after code changes." },
    levels: rows,
    conclusion: { stage4SafeToStart: false, stage4Approved: false, mechanismInventoryComplete: incompleteInventoryLevels.length === 0, hardConflictLevels: rows.filter((row) => row.hardConflicts.length).map((row) => row.level), approvedOverrideLevels: rows.filter((row) => row.approvedDesignOverride).map((row) => row.level), incompleteInventoryLevels, conditionalColorConflictLevels: rows.filter((row) => row.conditionalConflicts.some((item) => item.code === "source-color-count-vs-unique-exits")).map((row) => row.level), requiredNextSteps: ["Apply the approved Lv26 design exception: retain frozen exits 5/9/14, choose 1-5 ordinary exits through generation/validation, and leave source 8+3 untouched.", ...(incompleteInventoryLevels.length ? ["Complete explicit source mechanism presence/absence evidence; unrecorded fields remain unknown, not zero."] : ["Use the verified inventory reviews and their source corrections, not the stale original quantities, for isolated candidate inputs."]), "Qualify revised model/solver/replay/lower-bound semantics and bind certificates to the revised rule version and hashes.", "Author original candidate geometry; source exit coordinates, mouth width, cover rectangles and shape histograms are reference rather than mandatory replicas. Validate full spans, real hidden cohorts, symmetry/connectivity, adjacency and shape-ratio caps.", "Prove floors 10/15/20 and calibrate a single no-item route meeting both drag and time targets; old routes/certificates do not establish these."] },
  };
}

export function renderMarkdown(report) {
  const list = (items) => items === null || items === undefined ? "未知" : items.length ? items.join("/") : "—";
  const lines = ["# Lv21–30 新机制生成前置审计", "", `规则文档：v${report.rulesDocumentVersion}；runtime：\`${RULE_VERSION}\`。只读来源与代码；未生成关卡、未改正式LEVELS、未执行求解。`, "", `阶段4尚未批准：来源机制清单尚有${report.conclusion.incompleteInventoryLevels.length}关未齐；候选验证、完整下界证明和时间标定仍待完成。Lv26出口重配已获授权，不再等待重复确认。`, "", "## 逐关来源事实（不是候选布局）", "", "宽×高；出口列为来源普通数+冰门数。原始truth不改，表中使用本轮证据审阅后的数量，差异另列；缺失字段仍显示未知，不默认当零。源形状直方图/原色数是参考，不因列在JSON就自动成为必须复刻的数量。", "", "| 关卡 | 尺寸 | 开局/全关 | 来源出口 | 冰门初值 | 冰块初值 | 外壳 | 卷帘初值→隐藏批量 | 来源色数开局/全关 | 腾挪下界 |", "|---|---|---|---|---|---|---|---|---|---|"];
  for (const row of report.levels) {
    const c = row.immutableSourceContract;
    lines.push(`| ${row.level} | ${c.width}×${c.height} | ${c.openingCount}/${c.fullCount} | ${c.ordinaryExitCount ?? "未知"}+${c.frozenExitCount ?? "未知"}=${c.physicalExitTotal ?? "未知"} | ${list(c.frozenExitValues)} | ${list(c.numericIce?.values)}${row.combinationChecks.hiddenIceCount ? "（隐藏）" : ""} | ${c.shells?.count ?? "未知"} | ${c.covers ? c.covers.values.map((value, index) => `${value}→${c.covers.hidden_batch_counts[index]}`).join("；") || "—" : "未知"} | ${c.sourceOpeningColors}/${c.sourceFullColors} | ${row.designConstraints.minimumRepositionFloor}（未证） |`);
  }
  lines.push("", "## 已批准的设计特例", "", "- Lv26来源仍为8普通＋3冰门＝11。v1.2.1批准候选保留3冰门及5/9/14，普通出口由生成验证确定为1–5，总实体口最多8。不得加入星机制绕过此上限，其他数量/数值不变；此报告不选择具体候选出口数。", "- 出口配色允许对应星块支持的一普通＋一同色星门配对，两个同类同色仍禁止；冰冻/翻转不额外增加同色配额，多portal逐个算实体口。", "- Lv25/Lv30源色数差异不是已采纳硬冲突，不要求用户重新确认未曾采用的源总色数相等规则。", "");
  lines.push("", "## 每关冲突与缺口", "");
  for (const row of report.levels) {
    lines.push(`### Lv${row.level}`, "", `证据：${row.provenance.directOpeningEvidence}。`, "");
    if (row.provenance.correction) lines.push(`后续source-fps修订：${row.provenance.correction.id}；全关${row.provenance.correction.oldFullCount}→${row.provenance.correction.correctedFullCount}。${row.provenance.correction.evidence.join("；")}`, "");
    if (!row.hardConflicts.length) lines.push("在已批准特例下未发现已知数量硬冲突；来源审阅不能代替可解性与候选验收。", "");
    lines.push(`- 完整机制审阅：${row.inventoryReview.reviewPath}；已校验来源和${row.inventoryReview.evidence.length}项证据SHA。`);
    if (row.inventoryReview.sourceCorrections) lines.push(`- 本轮独立来源修订：${row.inventoryReview.sourceCorrections.id}；${row.inventoryReview.sourceCorrections.reason} 原始记录仍保留于JSON的originalRecordedSource。`);
    for (const item of [...row.hardConflicts, ...row.conditionalConflicts, ...row.evidenceGaps]) lines.push(`- ${item.code}: ${item.message}`);
    for (const item of row.referenceNotes) lines.push(`- 参考/候选设计：${item.message}`);
    if (row.sourceReview) lines.push(`- 已核验源参考修订：${row.sourceReview.correctionId}；${row.sourceReview.evidence.length}张帧SHA及truth SHA验证通过，参考可玩格${row.sourceReferenceBoard.playable_cell_count}。源truth/direct未修改；新候选仍不得复制内部墙。`);
    lines.push(`- 已记录隐藏冰${row.combinationChecks.hiddenIceCount ?? "未知"}个：允许；揭开当次不扣数。队列冰禁止。未记录的机制保持unknown，须补独立证据，不能从旧runtime或默认值填齐。`, "");
  }
  lines.push("## 求解与下界工具资格", "");
  for (const finding of report.toolReadiness.findings) lines.push(`- ${finding.path}:${finding.line} — ${finding.message}`);
  lines.push("", "新版完整模型的成功路线只能证明可解；必要腾挪下界、同一路线拖动/时间双达标仍须单独证明。缺少种子、布局哈希、工具版本绑定的新候选不存在合格证。", "", "## 来源与边界", "", `数量来源：${TRUTH}。原始直接审计：${DIRECT}；Lv26后续更正：${CORRECTIONS}。原始直接审计及更正的哈希均与truth声明匹配：${report.evidenceIntegrity.directLedgerHashMatchesTruth && report.evidenceIntegrity.correctionHashMatchesTruth}。独立参考mask修订：${REVIEW}，应用前验证truth及每张原帧SHA。`, "", "所有输入、原帧与工具（含本脚本、新版候选审计/搜索/阈值工具）的SHA-256在同名JSON中；代码改变后须重跑。本次未使用旧runtime填缺失值。源出口逐口坐标/口宽、卷帘原矩形缺失不是候选必须复刻源几何的阻断项；候选仍须独立填写并验证合法位置、完整通行宽度和覆盖足迹。", "", "stage4Approved=false；静态来源审阅、成功运行脚本都不是生成批准或下界合格证。", "");
  return lines.join("\n");
}

export function renderMechanismInventory(report) {
  const valueList = (items) => items == null ? "未知" : items.length ? items.join("、") : "0";
  const rectangular = new Set(["SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "SQ3", "RECT2X3", "RECT3X2"]);
  const irregular = (histogram) => Object.entries(histogram).reduce((total, [shape, n]) => total + (rectangular.has(shape) ? 0 : n), 0);
  const lines = ["# 第21–30关：竞品机制清单（来源核验版）", "", `对应新规则v${report.rulesDocumentVersion}。这是一份生成输入清单，不是已生成关卡或验收证书。`, "", "本轮实际查看开局、各隐藏批次揭开、冰块解冻/外壳剥除及后段地面帧；未把旧JSON缺失键当作机制不存在。原始视频、truth及正式LEVELS均未修改。", "", "## 逐关数量与机制", "", "“冰块初值”只统计色块上的冰，不包含冰门；“卷帘”记为初值→隐藏块数；外壳和本体算同一块。全部异形占比按块数分别统计开局/全关。", "", "| 关卡 | 棋盘宽×高 | 开局/全关块数 | 普通门 | 冰门初值 | 冰块初值 | 外壳块 | 卷帘初值→隐藏块数 | 异形块开局/全关 |", "|---|---|---|---|---|---|---|---|---|"];
  for (const row of report.levels) {
    const c = row.immutableSourceContract;
    const coverText = c.covers == null ? "未知" : c.covers.count ? c.covers.values.map((n, i) => `${n}→${c.covers.hidden_batch_counts[i]}`).join("；") : "0";
    lines.push(`| ${row.level} | ${c.width}×${c.height} | ${c.openingCount}/${c.fullCount} | ${c.ordinaryExitCount ?? "未知"} | ${valueList(c.frozenExitValues)} | ${valueList(c.numericIce?.values)} | ${c.shells?.count ?? "未知"} | ${coverText} | ${irregular(c.sourceOpeningShapeHistogram)}/${irregular(c.sourceFullShapeHistogram)} |`);
  }
  lines.push("", "## 逐关确认不存在的机制", "", "下表的0来自本次各阶段可见块面、机口/出口和露出地面的人工核对，不是默认值。钥匙/锁为组合项，0表示两者均无；星标块/星门分别检查。", "", "| 关卡 | 生成器 | 轴向块 | 钥匙/锁 | 星块 | 星门 | 翻转门 | 彩色地格 | 炸弹 | 电梯 |", "|---|---|---|---|---|---|---|---|---|---|");
  for (const row of report.levels) {
    const counts = ["generators", "axisBlocks", "keyLocks", "starBlocks"].map((key) => row.sourceMechanismCoverage[key].value?.count ?? "未知");
    const c = row.immutableSourceContract;
    counts.push(c.starExitCount == null || c.starFrozenExitCount == null ? "未知" : c.starExitCount + c.starFrozenExitCount);
    counts.push(...["flipDoors", "coloredGrids", "bombs", "lifts"].map((key) => row.sourceMechanismCoverage[key].value?.count ?? "未知"));
    lines.push(`| ${row.level} | ${counts.join(" | ")} |`);
  }
  lines.push("", "## 本轮纠正的旧来源漏项", "");
  for (const row of report.levels.filter((r) => r.inventoryReview.sourceCorrections)) lines.push(`- 第${row.level}关：${row.inventoryReview.sourceCorrections.reason}`);
  lines.push("", "## 生成时保留的约束与设计例外", "", "- 第21/22/24关的冰块均在卷帘后；隐藏时不减数，显示当次不追扣。第21关其中一只SQ2冰块解冻后还有外壳；第24关三只冰块解冻后还有外壳。这些附加机制仍算同一个承载块。", "- 第26关竞品事实仍为8普通＋3冰门。用户批准候选保留冰门5/9/14，普通门重配为1–5，不扩色、不新增星门凑数。其他关出口数量不自行删减。", "- 竞品异形棋盘为24/25/26/27/30关；第23关为矩形外轮廓内有两格固定墙。候选只保留宽高，布局原创、至少左右或上下对称、无内部孤岛墙，不能照搬第23关内墙。", "- 源形状组合和颜色总数是参考；允许原创形状组合，但开局和全关异形块占比分别≤30%。新布局时间/三星重算，普通/困难/超难必要腾挪最低10/15/20，均需另行证明。", "", "## 证据与复现", "");
  for (const row of report.levels) {
    const framePaths = row.inventoryReview.evidence.filter((e) => /\.(jpg|png)$/.test(e.path));
    lines.push(`- 第${row.level}关：[逐项观察与${framePaths.length}张取帧SHA](${row.inventoryReview.reviewPath.replace("docs/level-generation/", "")})。`);
  }
  lines.push("", "复现命令：`pnpm levels:revised:inputs`。工具逐个验证审阅文件绑定的truth/direct和证据文件SHA，陈旧或缺失证据直接失败；来源修訂应用于只读副本，不回写旧truth。机器可读完整报告为`playtest-results/experiments/revised-mechanisms-2026-09-21/generation-input-audit.json`（含原始记录、修订、110项附加机制检查和全部输入哈希）。", "", `当前缺机制清单关数：${report.conclusion.incompleteInventoryLevels.length}；候选stage4Approved=false。下一步是候选生成/验证产物绑定、可解回放与难度下界，不把本清单当通关或发布证明。`, "");
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await buildAudit();
  if (!process.argv.includes("--no-write")) {
    await mkdir(resolve(ROOT, OUTPUT), { recursive: true });
    await writeFile(resolve(ROOT, OUTPUT, "generation-input-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(resolve(ROOT, OUTPUT, "generation-input-audit.md"), renderMarkdown(report), "utf8");
    await writeFile(resolve(ROOT, "docs/level-generation/mechanism-inventory-lv021-030.md"), renderMechanismInventory(report), "utf8");
  }
  console.log(JSON.stringify({ outputDirectory: OUTPUT, ...report.conclusion, evidenceIntegrity: report.evidenceIntegrity }, null, 2));
}
