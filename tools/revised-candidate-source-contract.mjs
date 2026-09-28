import { createHash } from "node:crypto";

// This adapter accepts the independently verified report, never candidate-derived quotas.
// The calling artifact pipeline must run buildAudit and verify the file bindings again
// before publishing an artifact; an in-memory digest is not a filesystem attestation.
export const SOURCE_CONTRACT_ADAPTER_VERSION = "revised-candidate-source-contract-v1";
export const SOURCE_CONTRACT_RULE_BINDING = Object.freeze({
  version: "1.2.1",
  runtimeProfile: "revised-2026-09-21-v1.2",
  document: "docs/mechanism-rules-v1.2.1.md",
  sha256: "f68aafcac7d5b1f60eb7e8c2f7e98658695bab3fcd60f5c306fe65fc57ce8e42",
});

const families = ["generators", "axisBlocks", "keyLocks", "starBlocks", "flipDoors", "coloredGrids", "bombs", "lifts", "numericIce", "shells", "covers"];
const currentlyAbsentFamilies = families.slice(0, 8);
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
const sum = (values) => values.reduce((total, value) => total + value, 0);
const digest = (value) => createHash("sha256").update(canonical(value)).digest("hex");
const sha = (value) => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const sorted = (values) => [...values].sort((a, b) => a - b);
const same = (a, b) => canonical(a) === canonical(b);
const clone = (value) => structuredClone(value);
const fail = (code, message) => {
  const error = new Error(`source-contract/${code}: ${message}`);
  error.code = code;
  throw error;
};
const requireThat = (condition, code, message) => { if (!condition) fail(code, message); };

function canonical(value) {
  if (value === null || typeof value !== "object") {
    requireThat(value !== undefined && !(typeof value === "number" && !Number.isFinite(value)), "invalid-json-value", "Source bindings must contain finite JSON data.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

function numberList(value, count, label, minimum = 0) {
  requireThat(Array.isArray(value) && value.length === count && value.every((n) => integer(n, minimum)), "invalid-mechanism-values", `${label} must contain exactly ${count} evidenced integers >= ${minimum}.`);
  return [...value];
}

function recordedMechanisms(row) {
  const coverage = row.sourceMechanismCoverage;
  requireThat(plain(coverage), "missing-mechanism-inventory", "A complete independently recorded mechanism inventory is required.");
  const result = {};
  for (const family of families) {
    const entry = coverage[family];
    requireThat(entry?.status === "source-recorded" && plain(entry.value) && integer(entry.value.count), "unknown-mechanism", `${family} is missing, unknown or has an invalid count; it cannot become zero.`);
    result[family] = clone(entry.value);
  }
  for (const family of currentlyAbsentFamilies) {
    const entry = result[family];
    requireThat(entry.count === 0, "unsupported-source-mechanism", `${family} is present. This Lv21-30 adapter has no qualified positive mapping for this family; do not omit it.`);
    for (const field of ["items", "values", "queue_lengths", "queueLengths", "axes", "groups", "lock_requirements", "hidden_batch_counts"]) {
      if (entry[field] !== undefined) requireThat(Array.isArray(entry[field]) && entry[field].length === 0, "contradictory-absence", `${family}.${field} contradicts the explicit zero count.`);
    }
    for (const field of ["key_count", "lock_count"]) {
      if (entry[field] !== undefined) requireThat(entry[field] === 0, "contradictory-absence", `${family}.${field} contradicts the explicit zero count.`);
    }
  }
  return result;
}

function sourceMask(row, contract) {
  const board = row.sourceReferenceBoard;
  const rows = board?.source_playable_mask;
  requireThat(board?.cols === contract.width && board?.rows === contract.height, "source-mask-dimensions", "Reference board dimensions must agree with the independently evidenced width and height.");
  requireThat(Array.isArray(rows) && rows.length === contract.height && rows.every((line) => typeof line === "string" && line.length === contract.width && !/[^#.]/.test(line)), "source-mask-unknown", "A complete source mask is required to check originality; missing rows cannot be synthesized as a rectangle.");
  const points = rows.flatMap((line, y) => [...line].flatMap((cell, x) => cell === "#" ? [[x, y]] : []));
  requireThat(points.length > 0 && points.length === board.playable_cell_count, "source-mask-count", "Reference playable cell count differs from its mask.");
  requireThat(points.some(([x]) => x === 0) && points.some(([x]) => x === contract.width - 1) && points.some(([, y]) => y === 0) && points.some(([, y]) => y === contract.height - 1), "source-mask-bounds", "Reference mask must span the evidenced dimensions.");
  return points;
}

function checkHistogram(histogram, count, label) {
  requireThat(plain(histogram) && Object.values(histogram).every((n) => integer(n)) && sum(Object.values(histogram)) === count, "source-histogram-count", `${label} histogram must agree with its source carrier count. Shapes remain reference data, not candidate quotas.`);
}

/** Preserve cohorts and ice/shell overlap independently of their source geometry/colors. */
function sourceProfiles(row, mechanisms) {
  const contract = row.immutableSourceContract;
  const stages = contract.stages;
  requireThat(Array.isArray(stages) && stages.length > 0, "missing-stage-inventory", "Source stage cohorts must be explicitly recorded.");
  const stageIds = new Set();
  for (const stage of stages) {
    requireThat(plain(stage) && typeof stage.id === "string" && stage.id.trim() && !stageIds.has(stage.id) && integer(stage.count), "invalid-stage", "Source stages require unique IDs and explicit counts.");
    stageIds.add(stage.id);
    requireThat(["opening", "countdown_cover"].includes(stage.kind), "unsupported-stage", `${stage.id}: unsupported source stage kind ${stage.kind}; no generic nonspatial staging is allowed.`);
    checkHistogram(stage.shape_histogram, stage.count, stage.id);
  }
  const opening = stages.filter((stage) => stage.kind === "opening");
  requireThat(opening.length === 1 && opening[0].id === "opening" && opening[0].count === contract.openingCount, "opening-stage-count", "Exactly one opening stage must match the stable opening count.");
  requireThat(sum(stages.map((stage) => stage.count)) === contract.fullCount, "stage-total-mismatch", "Opening and real hidden cohorts must account for every independent source block.");
  const covers = mechanisms.covers;
  const coverValues = numberList(covers.values, covers.count, "covers.values", 1);
  const coverCounts = numberList(covers.hidden_batch_counts, covers.count, "covers.hidden_batch_counts", 1);
  requireThat(Array.isArray(covers.hidden_batch_histograms) && covers.hidden_batch_histograms.length === covers.count, "cover-histogram-count", "Every cover needs its separately evidenced cohort histogram.");
  covers.hidden_batch_histograms.forEach((hist, i) => checkHistogram(hist, coverCounts[i], `cover${i + 1}`));
  const hidden = stages.filter((stage) => stage.kind === "countdown_cover");
  requireThat(hidden.length === covers.count && hidden.every((stage, index) => stage.trigger_value === coverValues[index] && stage.count === coverCounts[index] && same(stage.shape_histogram, covers.hidden_batch_histograms[index])), "cover-stage-pairing", "Cover counters, batch sizes and stage records must retain their shared index; independent sorting loses ownership.");
  if (Array.isArray(covers.items) && covers.items.length > 0) {
    requireThat(covers.items.length === covers.count && covers.items.every((item, index) => (item.initialValue === undefined || item.initialValue === coverValues[index]) && (item.hiddenCount === undefined || item.hiddenCount === coverCounts[index])), "cover-item-pairing", "Detailed cover items disagree with the recorded counter/cohort pairing.");
  }

  const ice = mechanisms.numericIce;
  const iceValues = numberList(ice.values, ice.count, "numericIce.values", 1);
  requireThat(Array.isArray(ice.items) && ice.items.length === ice.count && ice.items.every((item) => plain(item) && integer(item.value, 1) && typeof item.shape === "string" && stageIds.has(item.stage_id)), "unbound-numeric-ice", "Every ice carrier needs its initial value, source shape and actual stage owner, including hidden ice.");
  requireThat(same(sorted(iceValues), sorted(ice.items.map((item) => item.value))), "ice-item-values", "Ice item values differ from the complete ice value inventory.");
  const visibleIce = ice.items.filter((item) => item.stage_id === "opening").length;
  if (ice.count > 0 || ice.opening_visible_count !== undefined) requireThat(ice.opening_visible_count === visibleIce, "ice-opening-count", "Ice opening-visible count must match its stage owners.");

  const shells = mechanisms.shells;
  requireThat(Array.isArray(shells.items) && shells.items.length === shells.count && shells.items.every((item) => plain(item) && item.extra_layers === 1 && typeof item.shape === "string" && stageIds.has(item.stage_id)), "unbound-shell", "Every shell requires one extra layer and a real source stage owner.");
  requireThat(same(numberList(shells.extra_layers, shells.count, "shells.extra_layers", 1), Array(shells.count).fill(1)), "unsupported-shell-depth", "Only one extra shell layer per source carrier is allowed.");
  const visibleShells = shells.items.filter((item) => item.stage_id === "opening").length;
  if (shells.count > 0 || shells.opening_visible_count !== undefined) requireThat(shells.opening_visible_count === visibleShells, "shell-opening-count", "Shell opening-visible count must match its stage owners.");

  let iceShellCount = 0;
  const profiles = stages.map((stage) => {
    const stageIce = ice.items.filter((item) => item.stage_id === stage.id);
    const stageShells = shells.items.filter((item) => item.stage_id === stage.id);
    const icedShellValues = [];
    const unusedIce = [...stageIce];
    for (const shell of stageShells) {
      // Missing overlap metadata is harmless only when this stage has no ice at all.
      requireThat(stageIce.length === 0 || typeof shell.requires_numeric_ice === "boolean", "ice-shell-overlap-unknown", `${stage.id}: shell/ice attachment is not explicitly recorded.`);
      if (!shell.requires_numeric_ice) continue;
      const possible = unusedIce.filter((item) => item.shape === shell.shape && item.post_melt_shell !== false);
      requireThat(possible.length > 0 && new Set(possible.map((item) => item.value)).size === 1, "ice-shell-pairing-unknown", `${stage.id}: a shell cannot be uniquely assigned to an evidenced numeric-ice value.`);
      const matched = possible[0];
      unusedIce.splice(unusedIce.indexOf(matched), 1);
      icedShellValues.push(matched.value);
    }
    requireThat(!unusedIce.some((item) => item.post_melt_shell === true), "ice-shell-item-mismatch", `${stage.id}: an ice item claims a post-thaw shell absent from shell items.`);
    requireThat(stageIce.length + stageShells.length - icedShellValues.length <= stage.count, "stage-mechanism-capacity", `${stage.id}: ice/shell carrier union exceeds the stage block count.`);
    iceShellCount += icedShellValues.length;
    return {
      stageId: stage.id, kind: stage.kind,
      clearCount: stage.kind === "opening" ? null : stage.trigger_value,
      blockCount: stage.count, numericIceValues: sorted(stageIce.map((item) => item.value)),
      shellBlocks: stageShells.length, icedShellValues: sorted(icedShellValues),
    };
  });
  if (ice.count > 0 || ice.post_melt_shell !== undefined) requireThat(ice.post_melt_shell === iceShellCount, "post-thaw-shell-count", "Ice post_melt_shell count must equal the independently attached shell carriers.");
  return profiles;
}

function verifiedBindings(row, audit) {
  requireThat(audit?.schemaVersion === "revised-generation-input-audit-v4" && audit.rulesDocumentVersion === SOURCE_CONTRACT_RULE_BINDING.version && audit.ruleVersion === SOURCE_CONTRACT_RULE_BINDING.runtimeProfile && row.ruleVersion === audit.ruleVersion, "wrong-rule-binding", "Adapter requires the qualified v4 input report and locked v1.2.1/v1.2 rules.");
  const matchingRows = audit.levels?.filter((entry) => entry.level === row.level);
  requireThat(matchingRows?.length === 1 && same(matchingRows[0], row), "unbound-audit-row", "The source row must be the exact, unique row of this independently produced audit.");
  const integrity = audit.evidenceIntegrity;
  requireThat(integrity?.directLedgerHashMatchesTruth === true && integrity.correctionHashMatchesTruth === true && integrity.sourceReviewVerified === true && integrity.mechanismInventoryVerified === true && integrity.mechanismInventoryLevels?.includes(row.level), "unverified-source-evidence", "The direct ledger, correction ledger and complete mechanism reviews must pass buildAudit integrity checks.");
  requireThat(plain(audit.inputs), "missing-source-bindings", "Verified input file bindings are required.");
  const bindings = Object.fromEntries(Object.entries(audit.inputs).map(([path, entry]) => {
    requireThat(typeof path === "string" && path.trim() && plain(entry) && sha(entry.sha256), "invalid-source-binding", `Invalid SHA-256 input binding: ${path}`);
    return [path, { sha256: entry.sha256.toLowerCase() }];
  }));
  requireThat(bindings[SOURCE_CONTRACT_RULE_BINDING.document]?.sha256 === SOURCE_CONTRACT_RULE_BINDING.sha256 && bindings["docs/rules/manifest.json"], "wrong-rule-digest", "Locked rules and manifest bindings are missing or changed.");
  const review = row.inventoryReview;
  requireThat(review?.verified === true && review.level === row.level && bindings[review.reviewPath] && Array.isArray(review.evidence) && review.evidence.length > 0 && Array.isArray(review.unknownFields) && review.unknownFields.length === 0, "unverified-inventory-review", "A complete verified mechanism review must own this source row.");
  for (const evidence of [...review.evidence, ...(row.sourceReview?.evidence ?? [])]) {
    requireThat(sha(evidence.sha256) && bindings[evidence.path]?.sha256 === evidence.sha256.toLowerCase(), "unbound-source-frame", `Reviewed frame has no matching report binding: ${evidence.path}`);
  }
  for (const path of [row.provenance?.truthPath, row.provenance?.directPath, row.provenance?.correction?.path, row.sourceReview?.path].filter(Boolean)) {
    requireThat(bindings[path], "unbound-source-file", `Source file not bound: ${path}`);
  }
  requireThat(typeof row.provenance?.truthPath === "string" && typeof row.provenance?.directPath === "string", "missing-source-provenance", "Truth and direct-ledger paths must be independently recorded.");
  return bindings;
}

function designFor(row) {
  const slot = (row.level - 1) % 10;
  const band = slot === 9 ? "super-hard" : [2, 4, 7].includes(slot) ? "hard" : "normal";
  const floor = band === "super-hard" ? 20 : band === "hard" ? 15 : 10;
  const design = row.designConstraints;
  requireThat(design?.band === band && design.minimumRepositionFloor === floor && design.paletteLimit === 8 && design.hiddenIceAllowed === true && design.generatorQueueIceAllowed === false && design.noAddedNonSpatialStaging === true && design.sourceMaskIsReferenceNotCandidate === true && design.sourceShapeHistogramIsReference === true && design.sourceColorCountEqualityRequired === false && design.sourceExitGeometryEqualityRequired === false && design.sourceCoverGeometryEqualityRequired === false && design.starNonStarPairRequiresMatchingStarBlock === true && design.recalculateTimeAndStars === true, "design-rule-mismatch", "Design policy must retain the locked schedule, 10/15/20 floors, original geometry and hidden-ice rules.");
  const override = row.approvedDesignOverride;
  if (row.level === 26) {
    requireThat(override?.id === "lv026-ordinary-exit-reconfiguration-v1.2" && override.ruleVersion === SOURCE_CONTRACT_RULE_BINDING.runtimeProfile && override.rulesDocument === SOURCE_CONTRACT_RULE_BINDING.document && override.sourceOrdinaryExitCount === 8 && override.sourcePhysicalExitTotal === 11 && same(override.ordinaryExitCountRange, [1, 5]) && override.frozenExitCount === 3 && same(override.frozenExitValues, [5, 9, 14]) && override.maximumPhysicalExits === 8 && override.allowAddedStarMechanisms === false && override.candidateCount === null, "lv026-override-mismatch", "Lv26 must retain its original 8+3 source and only the approved 1-5 ordinary candidate exit range.");
  } else requireThat(override === null, "unauthorized-level-override", "Lv26 exit reconfiguration cannot be applied to another level.");
  return { band, minimumRepositionFloor: floor, designConstraints: clone(design), approvedDesignOverride: clone(override) };
}

/**
 * @param {object} row One exact row returned by buildAudit().
 * @param {{seed:string, audit:object}} options Same independently built audit and generation seed.
 * @returns {{sourceContract:object, sourceDetails:object, designConstraints:object, sourceBindings:object}}
 */
export function buildCandidateSourceContract(row, { seed, audit } = {}) {
  requireThat(plain(row) && integer(row.level, 21) && row.level <= 30, "unsupported-source-range", "This qualified adapter accepts Lv21-30 audit rows only.");
  requireThat(typeof seed === "string" && seed.trim(), "missing-seed", "Generation seed must be explicit and nonempty.");
  const bindings = verifiedBindings(row, audit);
  requireThat(Array.isArray(row.hardConflicts) && row.hardConflicts.length === 0 && Array.isArray(row.evidenceGaps) && row.evidenceGaps.length === 0, "source-not-ready", "Unresolved hard conflicts or evidence gaps cannot be converted to a candidate contract.");
  const contract = row.immutableSourceContract;
  requireThat(plain(contract) && ["width", "height", "fullCount"].every((field) => integer(contract[field], 1)) && integer(contract.openingCount) && contract.openingCount <= contract.fullCount, "invalid-source-counts", "Width, height and stable opening/full counts must be explicitly valid.");
  checkHistogram(contract.sourceOpeningShapeHistogram, contract.openingCount, "opening");
  checkHistogram(contract.sourceFullShapeHistogram, contract.fullCount, "full");
  const mechanisms = recordedMechanisms(row);
  for (const [field, family] of [["numericIce", "numericIce"], ["shells", "shells"], ["covers", "covers"], ["generators", "generators"]]) {
    requireThat(same(contract[field], mechanisms[family]), "contradictory-source-inventory", `${field} differs between immutableSourceContract and the recorded mechanism inventory.`);
  }
  const originalMask = sourceMask(row, contract);
  const stageProfiles = sourceProfiles(row, mechanisms);
  const design = designFor(row);
  requireThat(integer(contract.ordinaryExitCount) && integer(contract.frozenExitCount) && contract.starExitCount === 0 && contract.starFrozenExitCount === 0 && contract.flipDoorCount === 0, "unsupported-exit-inventory", "This source batch requires explicit ordinary/ice exits and explicit zero star/flip exits; positive unsupported types cannot be dropped.");
  const frozen = numberList(contract.frozenExitValues, contract.frozenExitCount, "frozenExitValues", 1);
  const exits = [...Array.from({ length: contract.ordinaryExitCount }, () => ({ kind: "ordinary", frozen: 0, star: false })), ...frozen.map((value) => ({ kind: "ordinary", frozen: value, star: false }))];
  requireThat(contract.physicalExitTotal === exits.length, "physical-exit-count", "Every physical exit must occur exactly once in the source inventory.");
  if (row.level === 26) requireThat(contract.ordinaryExitCount === 8 && same(frozen, [5, 9, 14]), "lv026-source-reconfigured", "Do not overwrite Lv26 source 8+3 with a candidate exit selection.");
  const referenceId = `${row.inventoryReview.reviewPath}#Lv${String(row.level).padStart(3, "0")}`;
  const sourceDetails = {
    schemaVersion: 1,
    stages: clone(contract.stages), stageProfiles,
    numericIce: clone(mechanisms.numericIce), shells: clone(mechanisms.shells), covers: clone(mechanisms.covers),
    mechanismReferences: clone(mechanisms), sourceCorrections: clone(row.inventoryReview.sourceCorrections ?? null),
    referenceOnly: {
      board: clone(row.sourceReferenceBoard), openingShapeHistogram: clone(contract.sourceOpeningShapeHistogram),
      fullShapeHistogram: clone(contract.sourceFullShapeHistogram), openingColorCount: contract.sourceOpeningColors, fullColorCount: contract.sourceFullColors,
    },
    validationRequired: ["candidate-stage-ice-shell-attachments"],
  };
  const sourceHash = digest({ adapterVersion: SOURCE_CONTRACT_ADAPTER_VERSION, ruleBinding: SOURCE_CONTRACT_RULE_BINDING, levelId: row.level, immutableSourceContract: contract, sourceDetails, sourceBindings: bindings, design });
  return {
    adapterVersion: SOURCE_CONTRACT_ADAPTER_VERSION,
    ruleBinding: clone(SOURCE_CONTRACT_RULE_BINDING),
    sourceContract: {
      levelId: row.level, referenceId, sha256: sourceHash, seed,
      width: contract.width, height: contract.height, openingBlockCount: contract.openingCount, fullBlockCount: contract.fullCount,
      originalMask,
      mechanisms: {
        generatorQueueLengths: [], axisHorizontalBlocks: 0, axisVerticalBlocks: 0, keyGroups: [], starBlocks: 0,
        flipDoorInitialOpen: [], coloredGridCellCounts: [], bombSeconds: [],
        shutterClearCounts: [...mechanisms.covers.values], shutterHiddenBatchCounts: [...mechanisms.covers.hidden_batch_counts],
        liftCount: 0, liftHiddenBatchCounts: [], numericIceValues: [...mechanisms.numericIce.values], shellBlocks: mechanisms.shells.count, exits,
      },
    },
    ...design, sourceBindings: bindings, sourceDetails,
    validationBoundary: "Conversion is not static acceptance, solvability, a lower-bound proof or release approval. Run auditCandidateSourceDetails in addition to the core static audit. Reference masks/colors/shapes are not a requirement to copy source geometry.",
  };
}

const profileKey = ({ stageId, ...profile }) => canonical(profile);

/** Supplement the core inventory totals with hidden-stage and ice/shell co-location checks. */
export function auditCandidateSourceDetails(level, row) {
  const mechanisms = recordedMechanisms(row);
  const expected = sourceProfiles(row, mechanisms);
  const issues = [];
  const add = (code, message) => issues.push({ code, message });
  if (!plain(level) || !Array.isArray(level.blocks) || !level.blocks.every(plain) || (level.shutters !== undefined && (!Array.isArray(level.shutters) || !level.shutters.every(plain)))) {
    return { checked: false, passed: false, issues: [{ code: "invalid-candidate-detail-input", message: "Candidate blocks/shutters are not valid arrays." }] };
  }
  if (level.id !== row.level) add("candidate-source-level-id", "Candidate identity differs from the audited source level.");
  const shutters = level.shutters ?? [];
  if (shutters.some((shutter) => !integer(shutter.count, 1))) {
    return { checked: false, passed: false, issues: [...issues, { code: "invalid-candidate-cover-count", message: "Candidate countdown covers need explicit positive safe integer counts." }] };
  }
  if ((level.generators?.length ?? 0) > 0 || shutters.some((shutter) => shutter.skin !== undefined && shutter.skin !== "shutter")) add("unexpected-candidate-stage", "The source batch has only opening and countdown-cover cohorts; additional generator/lift stages are unsupported.");
  const shutterIds = new Set(shutters.map((shutter) => shutter.id));
  if (shutterIds.size !== shutters.length || shutters.some((shutter) => typeof shutter.id !== "string" || !shutter.id)) add("invalid-candidate-shutter-ids", "Candidate covers need unique, nonempty identifiers.");
  if (level.blocks.some((block) => block.shutterId !== undefined && !shutterIds.has(block.shutterId))) add("orphan-candidate-hidden-block", "A hidden candidate block refers to no actual countdown cover.");
  const measure = (stageId, kind, clearCount, blocks) => {
    const ice = blocks.filter((block) => (block.frozen ?? 0) > 0);
    const shell = blocks.filter((block) => Array.isArray(block.layers) && block.layers.length > 1);
    if (blocks.some((block) => block.frozen !== undefined && !integer(block.frozen))) add("invalid-candidate-ice", "Candidate numeric-ice counts must be nonnegative safe integers.");
    if (shell.some((block) => block.layers.length !== 2)) add("invalid-candidate-shell-depth", "Source shells each have exactly one extra layer.");
    return { stageId, kind, clearCount, blockCount: blocks.length, numericIceValues: sorted(ice.map((block) => block.frozen)), shellBlocks: shell.length, icedShellValues: sorted(shell.filter((block) => (block.frozen ?? 0) > 0).map((block) => block.frozen)) };
  };
  const actual = [measure("opening", "opening", null, level.blocks.filter((block) => block.shutterId === undefined)), ...shutters.map((shutter) => measure(shutter.id, "countdown_cover", shutter.count, level.blocks.filter((block) => block.shutterId === shutter.id)))];
  // Stage names and geometry belong to the original candidate. Compare whole cohort
  // profiles as a multiset, so equal counters do not detach their ice/shell batches.
  if (!same(expected.map(profileKey).sort(), actual.map(profileKey).sort())) add("candidate-stage-attachments", "Candidate stage counter/batch/ice/shell/iced-shell profiles differ from the independently recorded source. Hidden ice cannot move to opening, and ice/shell overlap cannot be split across carriers.");
  return { checked: true, passed: issues.length === 0, issues, sourceProfiles: clone(expected), candidateProfiles: actual };
}
