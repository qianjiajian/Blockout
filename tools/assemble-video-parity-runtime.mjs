import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Assemble the video-parity v6 composition contract and the geometry-only base
 * generator output into production-shaped LevelSpec records.
 *
 * This tool deliberately keeps two different claims separate:
 *   1. a replayed completion route is an upper-bound witness; and
 *   2. a necessary-reposition floor is proven only by a completed optimal run.
 * A long validation route is never published as a lower-bound certificate.
 *
 * Set VIDEO_PARITY_DIRECT_DATA=1 to assemble contract-exact LevelSpec data
 * without running PuzzleModel route replay, route repair/permutation, dynamic
 * completion-witness synthesis, or either gameplay solver. In that mode the
 * publication gate is intentionally limited to validateLevel plus the exact
 * contract audit, and the audit makes no solvability or reposition-floor claim.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractRelative = process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const baseReportDirRelative = process.env.VIDEO_PARITY_BASE_REPORT_DIR_RELATIVE
  ?? "playtest-results/experiments/video-parity-v6/base";
const baseGeneratedRelative = process.env.VIDEO_PARITY_BASE_GENERATED_RELATIVE
  ?? "src/core/videoParityBaseLevels.generated.ts";
const baseCandidatesRelative = process.env.VIDEO_PARITY_BASE_CANDIDATES_RELATIVE
  ?? `${baseReportDirRelative}/formal-candidates.json`;
const baseRoutesRelative = process.env.VIDEO_PARITY_BASE_ROUTES_RELATIVE
  ?? `${baseReportDirRelative}/validation-routes.json`;
// Optional, narrowly scoped base seeds can replace geometry + authored routes
// before runtime mechanisms are installed.  This is used for contracts whose
// movement restrictions must already be respected by the geometry witness
// (for example all-axis Arrow Block boards).  The override artifact remains
// contract-bound and is recorded in the assembly audit; it is never an
// implicit fallback to unrelated historical candidates.
const baseOverridesRelative = process.env.VIDEO_PARITY_BASE_OVERRIDES_RELATIVE?.trim() || null;
const completionWitnessesRelative = process.env.VIDEO_PARITY_COMPLETION_WITNESSES_RELATIVE?.trim() || null;
const completionWitnessLevelsSha256 = process.env.VIDEO_PARITY_COMPLETION_WITNESS_LEVELS_SHA256
  ?.trim().toUpperCase() || null;
const defaultOutputRelative = "src/core/videoParityLevels.generated.ts";
const defaultAuditRelative = "playtest-results/experiments/video-parity-v6/runtime-assembly-audit.json";
const defaultRouteOutputRelative = "playtest-results/experiments/video-parity-v6/runtime-validation-routes.json";
const outputRelative = process.env.VIDEO_PARITY_OUTPUT_RELATIVE ?? defaultOutputRelative;
const auditRelative = process.env.VIDEO_PARITY_AUDIT_RELATIVE ?? defaultAuditRelative;
const routeOutputRelative = process.env.VIDEO_PARITY_ROUTE_OUTPUT_RELATIVE ?? defaultRouteOutputRelative;
const directDataMode = process.env.VIDEO_PARITY_DIRECT_DATA === "1";
const solverMaxStates = Math.max(1, Number.parseInt(
  process.env.VIDEO_PARITY_SOLVER_MAX_STATES ?? "500",
  10,
) || 500);
const routePermutationMaxStates = Math.max(1, Number.parseInt(
  process.env.VIDEO_PARITY_ROUTE_PERMUTATION_MAX_STATES ?? "500",
  10,
) || 500);
const dynamicWitnessMaxStates = Math.max(1, Number.parseInt(
  process.env.VIDEO_PARITY_DYNAMIC_WITNESS_MAX_STATES ?? "5000",
  10,
) || 5_000);
const gateThawPermutationEnabled = !directDataMode
  && process.env.VIDEO_PARITY_GATE_THAW_PERMUTATION !== "0";
const exactProofRequested = process.env.VIDEO_PARITY_PROVE_FLOORS === "1";
const exactProofEnabled = !directDataMode && exactProofRequested;
const exactProofMaxStates = Math.max(1, Number.parseInt(
  process.env.VIDEO_PARITY_PROOF_MAX_STATES ?? "500000",
  10,
) || 500_000);
const parseLevelIds = (source) => String(source ?? "")
  .split(",")
  .flatMap((token) => {
    const range = token.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (!range) return [Number.parseInt(token.trim(), 10)];
    const start = Number(range[1]);
    const end = Number(range[2]);
    const lower = Math.min(start, end);
    const upper = Math.max(start, end);
    return Array.from({ length: upper - lower + 1 }, (_, index) => lower + index);
  })
  .filter((value) => Number.isInteger(value) && value >= 1 && value <= 100);
const requestedIds = new Set(parseLevelIds(process.env.VIDEO_PARITY_LEVEL_IDS ?? ""));
// Preserve no existing levels by default. A caller may opt specific ids out for
// an isolated diagnostic run, but preserved records can never be formally
// published as an exact whole-season assembly.
const preserveExistingIds = new Set(parseLevelIds(
  process.env.VIDEO_PARITY_PRESERVE_EXISTING_IDS ?? "",
));

if (directDataMode && completionWitnessesRelative) {
  throw new Error(
    "VIDEO_PARITY_COMPLETION_WITNESSES_RELATIVE is incompatible with VIDEO_PARITY_DIRECT_DATA=1.",
  );
}
if (directDataMode && exactProofRequested) {
  throw new Error("VIDEO_PARITY_PROVE_FLOORS=1 is incompatible with VIDEO_PARITY_DIRECT_DATA=1.");
}

const contractPath = resolve(root, contractRelative);
const baseGeneratedPath = resolve(root, baseGeneratedRelative);
const baseCandidatesPath = resolve(root, baseCandidatesRelative);
const baseRoutesPath = resolve(root, baseRoutesRelative);
const baseOverridesPath = baseOverridesRelative ? resolve(root, baseOverridesRelative) : null;
const completionWitnessesPath = completionWitnessesRelative
  ? resolve(root, completionWitnessesRelative)
  : null;
const outputPath = resolve(root, outputRelative);
const auditPath = resolve(root, auditRelative);
const routeOutputPath = resolve(root, routeOutputRelative);
const artifactPathKey = (path) => resolve(path).replaceAll("\\", "/").toLowerCase();
const formalArtifactPaths = new Set([
  resolve(root, defaultOutputRelative),
  resolve(root, defaultAuditRelative),
  resolve(root, defaultRouteOutputRelative),
].map(artifactPathKey));

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const deepClone = (value) => structuredClone(value);
const keyOf = (x, y) => `${x},${y}`;
const sortedNumbers = (values) => [...values].map(Number).sort((a, b) => a - b);
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const histogramOrNull = (value) => isObject(value) ? value : null;
const canonicalJsonValue = (value) => {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value)
    .sort()
    .map((key) => [key, canonicalJsonValue(value[key])]));
};
const sameJson = (left, right) => (
  JSON.stringify(canonicalJsonValue(left)) === JSON.stringify(canonicalJsonValue(right))
);
const levelLabel = (id) => `Lv${String(id).padStart(3, "0")}`;

const SHAPE_VARIANTS = {
  SINGLE: [[[0, 0]]],
  H2: [[[0, 0], [1, 0]]],
  V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]],
  V3: [[[0, 0], [0, 1], [0, 2]]],
  H4: [[[0, 0], [1, 0], [2, 0], [3, 0]]],
  V4: [[[0, 0], [0, 1], [0, 2], [0, 3]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L3: [
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1]],
  ],
  T4: [
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [0, 2]],
  ],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  S4: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  T5: [
    [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2]],
    [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  ],
  L5: [
    [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3]],
    [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
  ],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  SQ3: [[
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
  ]],
};
const SHAPE_ORDER = Object.keys(SHAPE_VARIANTS);
const SIDES = ["top", "right", "bottom", "left"];

const normalizedShapeSignature = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape
    .map(([x, y]) => [x - minX, y - minY])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .map(([x, y]) => `${x},${y}`)
    .join("|");
};
const shapeSignatures = new Map(SHAPE_ORDER.flatMap((shapeId) => (
  SHAPE_VARIANTS[shapeId].map((shape) => [normalizedShapeSignature(shape), shapeId])
)));
const shapeIdOf = (shape) => shapeSignatures.get(normalizedShapeSignature(shape)) ?? "UNKNOWN";
const shapeBounds = (shape) => ({
  width: Math.max(...shape.map(([x]) => x)) + 1,
  height: Math.max(...shape.map(([, y]) => y)) + 1,
});

const orderedHistogram = (histogram) => Object.fromEntries(SHAPE_ORDER
  .filter((shapeId) => (histogram?.[shapeId] ?? 0) > 0)
  .map((shapeId) => [shapeId, histogram[shapeId]]));
const histogramOf = (blocks) => orderedHistogram(blocks.reduce((histogram, block) => {
  const shapeId = shapeIdOf(block.shape);
  histogram[shapeId] = (histogram[shapeId] ?? 0) + 1;
  return histogram;
}, {}));
const histogramTotal = (histogram) => Object.values(histogram ?? {}).reduce((sum, value) => sum + Number(value), 0);
const histogramEquals = (left, right) => sameJson(orderedHistogram(left), orderedHistogram(right));
const expandHistogram = (histogram) => SHAPE_ORDER.flatMap((shapeId) => Array.from(
  { length: histogram?.[shapeId] ?? 0 },
  () => shapeId,
));

const maskPoints = (rows) => rows.flatMap((row, y) => [...row].flatMap((cell, x) => (
  cell === "#" ? [[x, y]] : []
)));
const maskRows = (level) => {
  const points = new Set((level.playable ?? []).map(([x, y]) => keyOf(x, y)));
  return Array.from({ length: level.height }, (_, y) => Array.from(
    { length: level.width },
    (_, x) => points.has(keyOf(x, y)) ? "#" : ".",
  ).join(""));
};
const cellsAt = (block, x = block.x, y = block.y) => block.shape.map(([dx, dy]) => [x + dx, y + dy]);

const clearLayerColorsOf = (block) => (
  block.layers?.length ? [...block.layers] : [block.color]
);
const allClearLayerColors = (level) => level.blocks.flatMap(clearLayerColorsOf);
const blockClearsColor = (block, color) => clearLayerColorsOf(block).includes(color);
const openingBlockIds = (stages) => new Set(stages
  .filter((stage) => stage.partition.kind === "opening")
  .flatMap((stage) => stage.blocks.map((block) => block.id)));

// Opening color is the source-audit composition union for the untouched
// opening. Some videos expose the frozen carrier's identity through a prior
// frame/animation, while others keep it genuinely concealed. The base audit
// records that distinction per carrier; do not infer it merely from `frozen`.
// Blocks not yet admitted by a cover/generator/Lift stage are absent as well.
const openingVisibleBlocks = (level, stages) => {
  const openingIds = new Set(stages
    .filter((stage) => stage.partition.kind === "opening")
    .flatMap((stage) => stage.blocks.map((block) => block.id)));
  return level.blocks.filter((block) => openingIds.has(block.id));
};
const openingVisibleColors = (level, stages, hiddenCarrierIds = []) => {
  const hidden = new Set(hiddenCarrierIds);
  return openingVisibleBlocks(level, stages)
    .flatMap((block) => hidden.has(block.id) ? [] : clearLayerColorsOf(block));
};

const colorSlotsOf = (level) => level.blocks.flatMap((block) => {
  if (block.layers?.length) {
    return block.layers.map((color, layerIndex) => ({ block, layerIndex, color }));
  }
  return [{ block, layerIndex: null, color: block.color }];
});

const setColorSlot = (slot, color, changes, reason) => {
  if (!slot || slot.color === color) return;
  changes.push({
    blockId: slot.block.id,
    layerIndex: slot.layerIndex,
    from: slot.color,
    to: color,
    reason,
  });
  slot.color = color;
  if (slot.layerIndex === null) slot.block.color = color;
  else {
    slot.block.layers[slot.layerIndex] = color;
    if (slot.layerIndex === 0) slot.block.color = color;
  }
};

const shellLayersAreDistinct = (block) => (
  !block.layers || block.layers.length < 2 || block.layers[0] !== block.layers.at(-1)
);
const slotPreservesShellDistinct = (slot, color) => {
  const layers = slot?.block.layers;
  if (!layers || layers.length < 2 || slot.layerIndex === null) return true;
  if (slot.layerIndex === 0) return layers.at(-1) !== color;
  if (slot.layerIndex === layers.length - 1) return layers[0] !== color;
  return true;
};

const normalizeExactColorCounts = ({ level, target, stages, warnings, meta }) => {
  const palette = [...target.design_palette];
  const expectedFull = Number(target.full_level_color_count);
  const expectedOpening = Number(target.opening_color_count ?? expectedFull);
  const visible = openingVisibleBlocks(level, stages);
  const visibleIds = new Set(visible.map((block) => block.id));
  const hiddenCarrierIds = new Set(meta.openingHiddenColorCarrierIds ?? []);
  const allSlots = colorSlotsOf(level);
  const visibleSlots = allSlots.filter((slot) => (
    visibleIds.has(slot.block.id) && !hiddenCarrierIds.has(slot.block.id)
  ));
  const visibleSlotKeys = new Set(visibleSlots.map((slot) => `${slot.block.id}:${slot.layerIndex ?? "body"}`));
  const concealedSlots = allSlots.filter((slot) => !visibleSlotKeys.has(
    `${slot.block.id}:${slot.layerIndex ?? "body"}`,
  ));
  const changes = [];

  if (palette.length !== expectedFull || visibleSlots.length < expectedOpening
    || concealedSlots.length < expectedFull - expectedOpening || expectedOpening > expectedFull) {
    warnings.push(
      `colors: cannot allocate full=${expectedFull}, opening-visible=${expectedOpening} `
      + `across visible-layer-slots=${visibleSlots.length}, concealed-layer-slots=${concealedSlots.length}`,
    );
    meta.colorAllocation = { changes, feasible: false };
    return;
  }

  const visibleFrequency = new Map(palette.map((color) => [color, 0]));
  for (const slot of visibleSlots) {
    if (visibleFrequency.has(slot.color)) {
      visibleFrequency.set(slot.color, visibleFrequency.get(slot.color) + 1);
    }
  }
  const desiredVisible = [...palette]
    .sort((left, right) => (
      visibleFrequency.get(right) - visibleFrequency.get(left)
      || palette.indexOf(left) - palette.indexOf(right)
    ))
    .slice(0, expectedOpening);
  const desiredSet = new Set(desiredVisible);
  const openingCounts = () => new Map(desiredVisible.map((color) => [
    color,
    visibleSlots.filter((slot) => slot.color === color).length,
  ]));

  // First constrain every clearable color to the contracted palette. Inner
  // layers are independent slots; never recolor an entire shell as one unit.
  for (const slot of allSlots.filter((entry) => !palette.includes(entry.color))) {
    const fallback = palette.find((color) => slotPreservesShellDistinct(slot, color)) ?? palette[0];
    setColorSlot(slot, fallback, changes, "remove_non_contract_layer_color");
  }

  for (const missingColor of desiredVisible.filter((color) => !visibleSlots.some((slot) => slot.color === color))) {
    const counts = openingCounts();
    const candidate = visibleSlots.find((slot) => (
      !desiredSet.has(slot.color) && slotPreservesShellDistinct(slot, missingColor)
    )) ?? visibleSlots.find((slot) => (
      (counts.get(slot.color) ?? 0) > 1 && slotPreservesShellDistinct(slot, missingColor)
    ));
    if (!candidate) {
      warnings.push(`colors: no opening block can seed visible color ${missingColor}`);
      continue;
    }
    setColorSlot(candidate, missingColor, changes, "seed_opening_visible_palette");
  }
  for (const slot of visibleSlots.filter((candidate) => !desiredSet.has(candidate.color))) {
    const counts = openingCounts();
    const replacement = [...desiredVisible]
      .sort((left, right) => counts.get(left) - counts.get(right))
      .find((color) => slotPreservesShellDistinct(slot, color));
    if (!replacement) {
      warnings.push(`colors: no distinct shell-safe opening replacement for ${slot.block.id}`);
      continue;
    }
    setColorSlot(slot, replacement, changes, "remove_extra_opening_visible_color");
  }

  // A shell is a sequence of differently colored clear actions. Repair any
  // accidental outer/core collision before seeding the complete palette.
  for (const block of level.blocks.filter((candidate) => candidate.layers?.length > 1)) {
    if (shellLayersAreDistinct(block)) continue;
    const coreSlot = allSlots.find((slot) => slot.block.id === block.id && slot.layerIndex === block.layers.length - 1);
    const alternate = palette.find((color) => color !== block.layers[0]);
    if (alternate) setColorSlot(coreSlot, alternate, changes, "separate_shell_outer_and_core");
  }

  const totalCounts = () => new Map(palette.map((color) => [color, colorSlotsOf(level)
    .filter((slot) => slot.color === color).length]));
  for (const missingColor of palette.filter((color) => !allClearLayerColors(level).includes(color))) {
    const counts = totalCounts();
    const candidate = concealedSlots.find((slot) => (
      (counts.get(slot.color) ?? 0) > 1
      && slotPreservesShellDistinct(slot, missingColor)
    ));
    if (!candidate) {
      warnings.push(`colors: no concealed layer slot can seed full-level color ${missingColor}`);
      continue;
    }
    setColorSlot(candidate, missingColor, changes, "seed_concealed_full_palette");
  }

  if (changes.length) warnings.push(`colors: reassigned ${changes.length} block colors to match opening/full counts`);
  const openingHiddenColorCarrierIds = [...hiddenCarrierIds];
  meta.colorAllocation = {
    feasible: new Set(allClearLayerColors(level)).size === expectedFull
      && new Set(openingVisibleColors(level, stages, openingHiddenColorCarrierIds)).size === expectedOpening
      && level.blocks.every(shellLayersAreDistinct),
    openingVisibilityRule: "opening-stage colors minus only the source/base-audited concealed carriers",
    openingVisibleBlockIds: visible.map((block) => block.id),
    openingHiddenColorCarrierIds,
    desiredOpeningColors: desiredVisible,
    changes,
  };
};

const compactColorsForGateCapacity = ({ level, target, stages, warnings, meta }) => {
  const before = JSON.stringify(colorSlotsOf(level).map((slot) => slot.color));
  normalizeExactColorCounts({ level, target, stages, warnings, meta });
  const after = JSON.stringify(colorSlotsOf(level).map((slot) => slot.color));
  warnings.push("colors: revalidated layer-aware palette before exact gate repack");
  return meta.colorAllocation?.feasible === true || before !== after;
};

const runtimeBundleEntry = directDataMode
  ? `
      import { validateLevel } from "./src/core/PuzzleModel.ts";
      import { LEVELS } from "./src/core/levels.ts";
      export { LEVELS, validateLevel };
    `
  : `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelForValidation, solveLevelOptimally } from "./src/core/levelSolver.ts";
      import { LEVELS } from "./src/core/levels.ts";
      export { LEVELS, PuzzleModel, validateLevel, solveLevelForValidation, solveLevelOptimally };
    `;
const bundle = await build({
  stdin: {
    contents: runtimeBundleEntry,
    resolveDir: root,
    sourcefile: "video-parity-runtime-assembler-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const runtimeModule = await import(moduleUrl);
const {
  LEVELS: existingCampaignLevels,
  validateLevel,
} = runtimeModule;
const PuzzleModel = runtimeModule.PuzzleModel ?? null;
const solveLevelForValidation = runtimeModule.solveLevelForValidation ?? null;
const solveLevelOptimally = runtimeModule.solveLevelOptimally ?? null;

const contractText = await readFile(contractPath, "utf8");
const contract = JSON.parse(contractText);
const baseGeneratedText = await readFile(baseGeneratedPath, "utf8").catch((error) => {
  if (error?.code === "ENOENT") {
    throw new Error(`Missing generated base levels at ${baseGeneratedRelative}. Run the v6 base generator first.`);
  }
  throw error;
});
const baseText = await readFile(baseCandidatesPath, "utf8").catch((error) => {
  if (error?.code === "ENOENT") {
    throw new Error(`Missing base candidates at ${baseCandidatesRelative}. Run the v6 base generator first.`);
  }
  throw error;
});
const baseArtifact = JSON.parse(baseText);
const baseRoutesText = await readFile(baseRoutesPath, "utf8").catch((error) => {
  if (error?.code === "ENOENT") return "[]";
  throw error;
});
const routeArtifact = JSON.parse(baseRoutesText);
const baseOverridesText = baseOverridesPath
  ? await readFile(baseOverridesPath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") {
      throw new Error(`Missing base override artifact at ${baseOverridesRelative}.`);
    }
    throw error;
  })
  : null;
const baseOverridesArtifact = baseOverridesText ? JSON.parse(baseOverridesText) : null;
const completionWitnessesText = completionWitnessesPath
  ? await readFile(completionWitnessesPath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") {
      throw new Error(`Missing completion witness artifact at ${completionWitnessesRelative}.`);
    }
    throw error;
  })
  : null;
if (completionWitnessesText && !completionWitnessLevelsSha256) {
  throw new Error(
    "VIDEO_PARITY_COMPLETION_WITNESS_LEVELS_SHA256 is required when completion witnesses are supplied.",
  );
}
const completionWitnessArtifact = completionWitnessesText
  ? JSON.parse(completionWitnessesText)
  : null;

const contractSha256 = sha256(contractText);
const baseOverrideDeclaredContractSha = baseOverridesArtifact
  ? (baseOverridesArtifact.source?.contract?.sha256
    ?? baseOverridesArtifact.sources?.contract?.sha256
    ?? baseOverridesArtifact.source_contract?.sha256
    ?? null)
  : null;
if (baseOverridesArtifact
  && (!baseOverrideDeclaredContractSha
    || String(baseOverrideDeclaredContractSha).toUpperCase() !== contractSha256)) {
  throw new Error(
    `Base override contract SHA ${baseOverrideDeclaredContractSha ?? "missing"} does not match ${contractSha256}.`,
  );
}
const baseOverrideEntriesForCompatibility = baseOverridesArtifact
  ? (Array.isArray(baseOverridesArtifact) ? baseOverridesArtifact : baseOverridesArtifact.levels ?? [])
  : [];
const baseOverrideIdsForCompatibility = new Set(baseOverrideEntriesForCompatibility.map((entry) => (
  Number(entry.level?.id ?? entry.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""))
)).filter((id) => Number.isInteger(id)));
const rawBaseEntries = Array.isArray(baseArtifact.levels) ? baseArtifact.levels
  : Array.isArray(baseArtifact) ? baseArtifact
    : [];
const baseTargetProjection = (value) => {
  const projected = deepClone(value ?? {});
  // The base generator consumes geometry, composition, palette, stage, timer,
  // difficulty and floor fields. Runtime mechanism installation is exclusively
  // owned by this assembler, so a mechanism-only contract correction does not
  // invalidate an otherwise byte-identical base-generator input projection.
  delete projected.mechanism_contract;
  return projected;
};
let baseContractCompatibility = {
  mode: "full_contract_sha256_exact",
  declared_sha256: baseArtifact.source_contract?.sha256 ?? null,
  current_sha256: contractSha256,
  differing_level_ids: [],
};
if (baseArtifact.source_contract?.sha256
  && baseArtifact.source_contract.sha256.toUpperCase() !== contractSha256) {
  const baseEntryById = new Map(rawBaseEntries.map((entry) => [
    Number(entry.level?.id ?? String(entry.level_id ?? "").replace(/^Lv/i, "")),
    entry,
  ]));
  const differingLevelIds = contract.levels
    .map((entry) => {
      const id = Number(String(entry.level_id).replace(/^Lv/i, ""));
      const baseEntry = baseEntryById.get(id);
      return baseEntry && sameJson(
        baseTargetProjection(entry.our_design_target),
        baseTargetProjection(baseEntry.target),
      ) ? null : id;
    })
    .filter((id) => id !== null);
  const uncoveredDifferingLevelIds = differingLevelIds
    .filter((id) => !baseOverrideIdsForCompatibility.has(id));
  if (uncoveredDifferingLevelIds.length) {
    throw new Error(
      `Base candidates target contract ${baseArtifact.source_contract.sha256}, `
      + `current contract is ${contractSha256}, and base-generator inputs differ at `
      + `${uncoveredDifferingLevelIds.map(levelLabel).join(", ")}. Regenerate the v6 base candidates first.`,
    );
  }
  baseContractCompatibility = {
    mode: differingLevelIds.length
      ? "base_generator_input_projection_rebound_by_contract_bound_overrides"
      : "base_generator_input_projection_exact_mechanism_only_rebind",
    declared_sha256: baseArtifact.source_contract.sha256,
    current_sha256: contractSha256,
    excluded_runtime_owned_field: "mechanism_contract",
    compared_level_count: contract.levels.length,
    differing_level_ids: differingLevelIds,
    contract_bound_override_ids: [...baseOverrideIdsForCompatibility].sort((a, b) => a - b),
  };
}

if (!Array.isArray(contract.levels) || contract.levels.length !== 100) {
  throw new Error(`Expected a 100-level v6 contract, got ${contract.levels?.length ?? "missing"}.`);
}
const baseById = new Map(rawBaseEntries.map((entry) => {
  const level = entry.level ?? entry;
  return [level.id, {
    level,
    route: entry.route ?? null,
    validation: entry.validation ?? entry.audit ?? null,
    carrierAssignments: entry.carrier_assignments ?? entry.carrierAssignments ?? null,
    routeSemantics: entry.route_semantics ?? entry.routeSemantics ?? null,
    preserveGateThawDescriptors:
      entry.preserve_gate_thaw_descriptors ?? entry.preserveGateThawDescriptors ?? false,
    preserveGeneratorDescriptors:
      entry.preserve_generator_descriptors ?? entry.preserveGeneratorDescriptors ?? false,
    preserveStarDescriptors:
      entry.preserve_star_descriptors ?? entry.preserveStarDescriptors ?? false,
  }];
}));
const routeById = new Map((Array.isArray(routeArtifact) ? routeArtifact : routeArtifact.levels ?? [])
  .map((entry) => [Number(String(entry.level_id ?? entry.levelId ?? entry.id).replace(/^Lv/i, "")), entry.drags ?? entry.route ?? []]));
const appliedBaseOverrideIds = [];
if (baseOverridesArtifact) {
  const overrideEntries = Array.isArray(baseOverridesArtifact)
    ? baseOverridesArtifact
    : baseOverridesArtifact.levels;
  if (!Array.isArray(overrideEntries) || overrideEntries.length === 0) {
    throw new Error("Base override artifact must contain a non-empty levels array.");
  }
  const contractById = new Map(contract.levels.map((entry) => [
    Number(String(entry.level_id).replace(/^Lv/i, "")),
    entry,
  ]));
  const seen = new Set();
  for (const entry of overrideEntries) {
    const level = entry.level ?? entry;
    const id = Number(level?.id ?? String(entry.level_id ?? "").replace(/^Lv/i, ""));
    if (!Number.isInteger(id) || !contractById.has(id)) {
      throw new Error(`Base override contains invalid or unknown level id ${entry.level_id ?? level?.id}.`);
    }
    if (seen.has(id)) throw new Error(`Base override contains duplicate ${levelLabel(id)}.`);
    seen.add(id);
    if (level.id !== id) throw new Error(`${levelLabel(id)}: override LevelSpec id is inconsistent.`);
    if (entry.target && !sameJson(entry.target, contractById.get(id).our_design_target)) {
      throw new Error(`${levelLabel(id)}: override target does not exactly match the active v6 contract.`);
    }
    const route = entry.route ?? entry.drags;
    if (!Array.isArray(route) || route.length === 0) {
      throw new Error(`${levelLabel(id)}: override is missing a non-empty authored completion route.`);
    }
    const inherited = baseById.get(id);
    baseById.set(id, {
      level: deepClone(level),
      route: deepClone(route),
      validation: entry.validation ?? inherited?.validation ?? null,
      carrierAssignments: deepClone(
        entry.carrier_assignments ?? entry.carrierAssignments ?? inherited?.carrierAssignments ?? null,
      ),
      routeSemantics: entry.route_semantics ?? entry.routeSemantics ?? inherited?.routeSemantics ?? null,
      preserveGateThawDescriptors: entry.preserve_gate_thaw_descriptors
        ?? entry.preserveGateThawDescriptors
        ?? inherited?.preserveGateThawDescriptors
        ?? false,
      preserveGeneratorDescriptors: entry.preserve_generator_descriptors
        ?? entry.preserveGeneratorDescriptors
        ?? inherited?.preserveGeneratorDescriptors
        ?? false,
      preserveStarDescriptors: entry.preserve_star_descriptors
        ?? entry.preserveStarDescriptors
        ?? inherited?.preserveStarDescriptors
        ?? false,
    });
    routeById.set(id, deepClone(route));
    appliedBaseOverrideIds.push(id);
  }
  appliedBaseOverrideIds.sort((left, right) => left - right);
}
const completionWitnessById = new Map((completionWitnessArtifact
  ? (Array.isArray(completionWitnessArtifact)
    ? completionWitnessArtifact
    : completionWitnessArtifact.levels ?? [])
  : []).flatMap((entry) => {
  const id = Number(String(entry.level_id ?? entry.levelId ?? entry.id).replace(/^Lv/i, ""));
  const route = entry.drags ?? entry.route
    ?? (entry.events ?? []).filter((event) => event && event.type !== "wait" && event.blockId);
  return Number.isInteger(id) && Array.isArray(route) && route.length && entry.replayed !== false
    ? [[id, deepClone(route)]]
    : [];
}));
const existingCampaignById = new Map((existingCampaignLevels ?? []).map((level) => [level.id, level]));

const routeRanks = (route) => {
  const first = new Map();
  const last = new Map();
  route.forEach((drag, index) => {
    if (!first.has(drag.blockId)) first.set(drag.blockId, index);
    last.set(drag.blockId, index);
  });
  return {
    first: (id) => first.get(id) ?? Number.MAX_SAFE_INTEGER,
    last: (id) => last.get(id) ?? Number.MAX_SAFE_INTEGER,
  };
};

/**
 * Return a deterministic minimum-cost, maximum-cardinality assignment.
 *
 * Every requirement gets its own dummy edge, so callers can distinguish a
 * genuinely missing carrier from a greedy selection failure. Candidate costs
 * are lexicographic weights chosen by the caller; the dummy cost is kept far
 * above every real edge. Successive shortest augmenting paths are sufficient
 * here because the largest observed contract cohort is only 35 pieces.
 */
const assignRequirementsGlobally = ({ requirements, candidatesFor, unmatchedCost = 1_000_000_000_000 }) => {
  const rows = requirements.map((requirement, index) => {
    const deduplicated = new Map();
    for (const candidate of candidatesFor(requirement, index)) {
      const blockId = candidate.block?.id;
      if (!blockId) continue;
      const normalized = {
        ...candidate,
        cost: Math.max(0, Math.trunc(Number(candidate.cost) || 0)),
      };
      const existing = deduplicated.get(blockId);
      if (!existing || normalized.cost < existing.cost) deduplicated.set(blockId, normalized);
    }
    return [...deduplicated.values()].sort((left, right) => (
      left.cost - right.cost || left.block.id.localeCompare(right.block.id)
    ));
  });
  const carrierIds = [...new Set(rows.flatMap((row) => row.map((candidate) => candidate.block.id)))].sort();
  const source = 0;
  const requirementOffset = 1;
  const carrierOffset = requirementOffset + requirements.length;
  const dummyOffset = carrierOffset + carrierIds.length;
  const sink = dummyOffset + requirements.length;
  const graph = Array.from({ length: sink + 1 }, () => []);
  const addEdge = (from, to, capacity, cost) => {
    const forward = { to, reverse: graph[to].length, capacity, cost };
    const reverse = { to: from, reverse: graph[from].length, capacity: 0, cost: -cost };
    graph[from].push(forward);
    graph[to].push(reverse);
    return forward;
  };
  const carrierNodeById = new Map(carrierIds.map((id, index) => [id, carrierOffset + index]));
  const assignmentEdges = requirements.map(() => []);
  requirements.forEach((requirement, requirementIndex) => {
    const requirementNode = requirementOffset + requirementIndex;
    addEdge(source, requirementNode, 1, 0);
    for (const candidate of rows[requirementIndex]) {
      const edge = addEdge(requirementNode, carrierNodeById.get(candidate.block.id), 1, candidate.cost);
      assignmentEdges[requirementIndex].push({ edge, candidate });
    }
    const dummy = { requirement, unmatched: true };
    const edge = addEdge(requirementNode, dummyOffset + requirementIndex, 1, unmatchedCost);
    assignmentEdges[requirementIndex].push({ edge, candidate: dummy });
  });
  carrierIds.forEach((id) => addEdge(carrierNodeById.get(id), sink, 1, 0));
  requirements.forEach((_, index) => addEdge(dummyOffset + index, sink, 1, 0));

  for (let flow = 0; flow < requirements.length; flow += 1) {
    const distance = Array(graph.length).fill(Number.POSITIVE_INFINITY);
    const parentNode = Array(graph.length).fill(-1);
    const parentEdge = Array(graph.length).fill(-1);
    distance[source] = 0;
    for (let pass = 0; pass < graph.length - 1; pass += 1) {
      let changed = false;
      for (let node = 0; node < graph.length; node += 1) {
        if (!Number.isFinite(distance[node])) continue;
        for (let edgeIndex = 0; edgeIndex < graph[node].length; edgeIndex += 1) {
          const edge = graph[node][edgeIndex];
          if (edge.capacity <= 0) continue;
          const nextDistance = distance[node] + edge.cost;
          if (nextDistance >= distance[edge.to]) continue;
          distance[edge.to] = nextDistance;
          parentNode[edge.to] = node;
          parentEdge[edge.to] = edgeIndex;
          changed = true;
        }
      }
      if (!changed) break;
    }
    if (!Number.isFinite(distance[sink])) break;
    for (let node = sink; node !== source; node = parentNode[node]) {
      const edge = graph[parentNode[node]][parentEdge[node]];
      edge.capacity -= 1;
      graph[node][edge.reverse].capacity += 1;
    }
  }

  return requirements.map((_, requirementIndex) => {
    const selected = assignmentEdges[requirementIndex].find(({ edge }) => edge.capacity === 0);
    return selected && !selected.candidate.unmatched ? selected.candidate : null;
  });
};

const routeActionTimeline = (route) => {
  const firstTouchIndex = new Map();
  const clearLayersBeforeFirstTouch = new Map();
  const fullyClearedIndex = new Map();
  let priorClearLayers = 0;
  route.forEach((drag, index) => {
    if (!firstTouchIndex.has(drag.blockId)) {
      firstTouchIndex.set(drag.blockId, index);
      clearLayersBeforeFirstTouch.set(drag.blockId, priorClearLayers);
    }
    if (drag.exitSide) {
      fullyClearedIndex.set(drag.blockId, index);
      priorClearLayers += 1;
    }
  });
  return {
    firstTouchIndex,
    clearLayersBeforeFirstTouch,
    fullyClearedIndex,
    totalClearLayers: priorClearLayers,
  };
};

const replayRoute = (level, drags) => {
  const model = new PuzzleModel(level);
  model.start();
  const timedIntervals = (level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0));
  for (let dragIndex = 0; dragIndex < drags.length; dragIndex += 1) {
    const drag = drags[dragIndex];
    if (!model.getBlock(drag.blockId) && timedIntervals.length) {
      model.tick(Math.max(...timedIntervals));
    }
    if (!model.getBlock(drag.blockId)) {
      return { ok: false, error: `drag ${dragIndex + 1}: block ${drag.blockId} is not active` };
    }
    model.beginAction();
    for (let pathIndex = 0; pathIndex < (drag.path ?? []).length; pathIndex += 1) {
      const [x, y] = drag.path[pathIndex];
      const before = model.getBlock(drag.blockId);
      const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
      const moved = distance === 1
        ? model.moveBlockStep(drag.blockId, x, y)
        : model.moveBlock(drag.blockId, x, y);
      const after = model.getBlock(drag.blockId);
      if (!moved || !after || after.x !== x || after.y !== y) {
        return { ok: false, error: `drag ${dragIndex + 1} step ${pathIndex + 1}: cannot move ${drag.blockId} to ${x},${y}` };
      }
    }
    if (drag.exitSide) {
      const result = model.tryExit(drag.blockId, drag.exitSide);
      if (!result.ok) {
        return { ok: false, error: `drag ${dragIndex + 1}: cannot exit ${drag.blockId} via ${drag.exitSide}` };
      }
    }
    if (!model.commitAction()) {
      return { ok: false, error: `drag ${dragIndex + 1}: action did not mutate the puzzle` };
    }
    if (timedIntervals.length) model.tick(Math.max(...timedIntervals));
  }
  const snapshot = model.snapshot();
  return snapshot.complete
    ? { ok: true, moves: snapshot.moves, cleared: snapshot.cleared }
    : {
      ok: false,
      error: `${snapshot.blocks.length} active and ${snapshot.queuedBlocks.length} queued blocks remain`,
    };
};

const rescheduleCompletionRoute = (level, drags) => {
  let model = new PuzzleModel(level);
  model.start();
  const pending = drags.map((drag, index) => ({ drag: deepClone(drag), index }));
  const scheduled = [];
  const timedIntervals = (level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0));
  let idleTimedTicks = 0;

  const attempt = (drag) => {
    if (!model.getBlock(drag.blockId)) return null;
    const trial = model.clone();
    trial.beginAction();
    for (const [x, y] of drag.path ?? []) {
      const before = trial.getBlock(drag.blockId);
      const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
      const moved = distance === 1
        ? trial.moveBlockStep(drag.blockId, x, y)
        : trial.moveBlock(drag.blockId, x, y);
      const after = trial.getBlock(drag.blockId);
      if (!moved || !after || after.x !== x || after.y !== y) return null;
    }
    if (drag.exitSide && !trial.tryExit(drag.blockId, drag.exitSide).ok) return null;
    if (!trial.commitAction()) return null;
    return trial;
  };

  while (pending.length) {
    const firstPendingByBlock = new Set();
    let selectedIndex = -1;
    let selectedModel = null;
    for (let index = 0; index < pending.length; index += 1) {
      const { drag } = pending[index];
      if (firstPendingByBlock.has(drag.blockId)) continue;
      firstPendingByBlock.add(drag.blockId);
      const trial = attempt(drag);
      if (!trial) continue;
      if (selectedIndex < 0 || drag.exitSide) {
        selectedIndex = index;
        selectedModel = trial;
      }
      if (drag.exitSide) break;
    }
    if (selectedIndex >= 0) {
      const [{ drag }] = pending.splice(selectedIndex, 1);
      model = selectedModel;
      scheduled.push(drag);
      idleTimedTicks = 0;
      if (timedIntervals.length) model.tick(Math.max(...timedIntervals));
      continue;
    }
    if (timedIntervals.length && idleTimedTicks <= pending.length + 1) {
      model.tick(Math.max(...timedIntervals));
      idleTimedTicks += 1;
      continue;
    }
    break;
  }

  const snapshot = model.snapshot();
  if (!pending.length && snapshot.complete) {
    const replayed = replayRoute(level, scheduled);
    if (replayed.ok) return { ok: true, drags: scheduled, replay: replayed };
    return { ok: false, error: `rescheduled route failed independent replay: ${replayed.error}` };
  }
  return {
    ok: false,
    error: `${pending.length} route actions remain; ${snapshot.blocks.length} active and `
      + `${snapshot.queuedBlocks.length} queued blocks remain`,
  };
};

const searchAuthoredRoutePermutation = (level, drags, maxStates) => {
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0)));
  const entries = drags.map((drag, index) => ({ drag: deepClone(drag), index }));
  const memo = new Set();
  let exploredStates = 0;
  let solvedRoute = null;

  const structuralSignature = (model, pending) => {
    const snapshot = model.snapshot();
    return JSON.stringify({
      pending: pending.map((entry) => entry.index),
      gates: snapshot.gates.map((gate) => [gate.id, gate.frozen ?? null]),
      blocks: snapshot.blocks.map((block) => [
        block.id,
        block.x,
        block.y,
        block.layers,
        block.frozen,
        block.shutterId,
        block.lockedBy,
        block.lockCount,
      ]),
      queued: snapshot.queuedBlocks.map((block) => block.id),
      shutters: snapshot.shutters.map((shutter) => [shutter.id, shutter.count]),
      generators: snapshot.generators.map((generator) => [generator.id, generator.queueBlockIds]),
      complete: snapshot.complete,
    });
  };

  const attempt = (model, drag) => {
    if (!model.getBlock(drag.blockId)) return null;
    const trial = model.clone();
    trial.beginAction();
    for (const [x, y] of drag.path ?? []) {
      const before = trial.getBlock(drag.blockId);
      const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
      const moved = distance === 1
        ? trial.moveBlockStep(drag.blockId, x, y)
        : trial.moveBlock(drag.blockId, x, y);
      const after = trial.getBlock(drag.blockId);
      if (!moved || !after || after.x !== x || after.y !== y) return null;
    }
    if (drag.exitSide && !trial.tryExit(drag.blockId, drag.exitSide).ok) return null;
    if (!trial.commitAction()) return null;
    if (timedInterval) trial.tick(timedInterval);
    return trial;
  };

  const visit = (model, pending, route) => {
    if (exploredStates >= maxStates) return false;
    exploredStates += 1;
    const signature = structuralSignature(model, pending);
    if (memo.has(signature)) return false;
    memo.add(signature);
    const snapshot = model.snapshot();
    if (!pending.length) {
      if (snapshot.complete) {
        solvedRoute = route;
        return true;
      }
      return false;
    }

    const firstByBlock = new Set();
    const candidates = [];
    for (let index = 0; index < pending.length; index += 1) {
      const entry = pending[index];
      if (firstByBlock.has(entry.drag.blockId)) continue;
      firstByBlock.add(entry.drag.blockId);
      const trial = attempt(model, entry.drag);
      if (!trial) continue;
      candidates.push({
        index,
        entry,
        trial,
        clearedGain: trial.snapshot().cleared - snapshot.cleared,
      });
    }
    candidates.sort((left, right) => (
      right.clearedGain - left.clearedGain
      || Number(Boolean(right.entry.drag.exitSide)) - Number(Boolean(left.entry.drag.exitSide))
      || left.entry.index - right.entry.index
    ));
    for (const candidate of candidates) {
      const nextPending = pending.filter((_, index) => index !== candidate.index);
      if (visit(candidate.trial, nextPending, [...route, candidate.entry.drag])) return true;
    }

    if (!candidates.length && timedInterval) {
      const ticked = model.clone();
      const before = structuralSignature(model, pending);
      ticked.tick(timedInterval);
      if (structuralSignature(ticked, pending) !== before && visit(ticked, pending, route)) return true;
    }
    return false;
  };

  const model = new PuzzleModel(level);
  model.start();
  visit(model, entries, []);
  if (solvedRoute) {
    const replayed = replayRoute(level, solvedRoute);
    if (replayed.ok) {
      return { ok: true, drags: solvedRoute, replay: replayed, exploredStates, capped: false };
    }
    return {
      ok: false,
      error: `authored-route permutation failed independent replay: ${replayed.error}`,
      exploredStates,
      capped: false,
    };
  }
  return {
    ok: false,
    error: `no authored-route permutation found after ${exploredStates} states`,
    exploredStates,
    capped: exploredStates >= maxStates,
  };
};

const adaptBaseRouteForShells = (route, level) => {
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  return route.flatMap((drag) => {
    if (!drag.exitSide) return [deepClone(drag)];
    const extraLayers = Math.max(0, (blockById.get(drag.blockId)?.layers?.length ?? 1) - 1);
    return [
      deepClone(drag),
      ...Array.from({ length: extraLayers }, () => ({
        blockId: drag.blockId,
        path: [],
        exitSide: drag.exitSide,
      })),
    ];
  });
};

const dynamicExitSidesAt = ({ level, snapshot, block, x, y, preferredSide }) => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  const activeColor = block.layers?.[0] ?? block.color;
  const orderedSides = [preferredSide, ...SIDES].filter((side, index, values) => (
    SIDES.includes(side) && values.indexOf(side) === index
  ));
  return orderedSides.filter((side) => {
    if (block.movementAxis === "horizontal" && side !== "left" && side !== "right") return false;
    if (block.movementAxis === "vertical" && side !== "top" && side !== "bottom") return false;
    const atEdge = side === "top" ? minY === 0
      : side === "bottom" ? maxY === level.height - 1
        : side === "left" ? minX === 0
          : maxX === level.width - 1;
    if (!atEdge) return false;
    const gate = snapshot.gates.find((candidate) => {
      if (candidate.side !== side) return false;
      if (side === "top" || side === "bottom") {
        return minX >= candidate.offset && maxX < candidate.offset + candidate.size;
      }
      return minY >= candidate.offset && maxY < candidate.offset + candidate.size;
    });
    return Boolean(gate
      && gate.color === activeColor
      && Number(gate.frozen ?? 0) <= 0
      && (!block.star || gate.star));
  });
};

const anchorDirectionsFor = (block, preferredSide = null) => {
  const towardSide = preferredSide === "top" ? [0, -1]
    : preferredSide === "right" ? [1, 0]
      : preferredSide === "bottom" ? [0, 1]
        : preferredSide === "left" ? [-1, 0]
          : null;
  const directions = [towardSide, [0, -1], [1, 0], [0, 1], [-1, 0]]
    .filter((direction, index, values) => direction
      && values.findIndex((candidate) => candidate?.[0] === direction[0] && candidate?.[1] === direction[1]) === index);
  return directions.filter(([dx, dy]) => (
    block.movementAxis === "horizontal" ? dy === 0
      : block.movementAxis === "vertical" ? dx === 0
        : true
  ));
};

const findDynamicAnchorPath = ({ level, model, block, target = null, preferredSide = null }) => {
  const start = [block.x, block.y];
  const queue = [{ x: start[0], y: start[1], path: [] }];
  const visited = new Set([keyOf(start[0], start[1])]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (target) {
      if (current.x === target[0] && current.y === target[1]) return { path: current.path, exitSide: null };
    } else {
      const exitSide = dynamicExitSidesAt({
        level,
        snapshot: model.snapshot(),
        block,
        x: current.x,
        y: current.y,
        preferredSide,
      })[0];
      if (exitSide) return { path: current.path, exitSide };
    }
    for (const [dx, dy] of anchorDirectionsFor(block, preferredSide)) {
      const nextX = current.x + dx;
      const nextY = current.y + dy;
      const key = keyOf(nextX, nextY);
      if (visited.has(key) || !model.canPlace(block, nextX, nextY)) continue;
      visited.add(key);
      queue.push({ x: nextX, y: nextY, path: [...current.path, [nextX, nextY]] });
    }
  }
  return null;
};

const findDynamicExitPlans = ({ level, model, block, preferredSide = null, limit = 16 }) => {
  const start = [block.x, block.y];
  const queue = [{ x: start[0], y: start[1], path: [] }];
  const visited = new Set([keyOf(start[0], start[1])]);
  const plans = [];
  const snapshot = model.snapshot();
  for (let cursor = 0; cursor < queue.length && plans.length < limit; cursor += 1) {
    const current = queue[cursor];
    for (const exitSide of dynamicExitSidesAt({
      level,
      snapshot,
      block,
      x: current.x,
      y: current.y,
      preferredSide,
    })) {
      plans.push({ path: current.path, exitSide });
      if (plans.length >= limit) break;
    }
    for (const [dx, dy] of anchorDirectionsFor(block, preferredSide)) {
      const nextX = current.x + dx;
      const nextY = current.y + dy;
      const key = keyOf(nextX, nextY);
      if (visited.has(key) || !model.canPlace(block, nextX, nextY)) continue;
      visited.add(key);
      queue.push({ x: nextX, y: nextY, path: [...current.path, [nextX, nextY]] });
    }
  }
  return plans;
};

/**
 * Rebuild a concrete completion witness against the live mechanism state.
 * The authored route supplies per-block task order, while paths and exit sides
 * are synthesized from PuzzleModel after every mutation. In particular, an
 * authored exit task remains pending after an outer shell is removed, so the
 * newly exposed core color gets its own gate/path search.
 */
const synthesizeDynamicCompletionWitness = (level, authoredRoute) => {
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0)));
  const tasksByBlock = new Map();
  authoredRoute.forEach((drag, index) => {
    if (!tasksByBlock.has(drag.blockId)) tasksByBlock.set(drag.blockId, []);
    tasksByBlock.get(drag.blockId).push({
      originalIndex: index,
      blockId: drag.blockId,
      target: drag.exitSide ? null : drag.path?.at(-1) ?? null,
      exit: Boolean(drag.exitSide),
      preferredExitSide: drag.exitSide ?? null,
    });
  });
  const orderedBlockIds = [...tasksByBlock]
    .sort((left, right) => left[1][0].originalIndex - right[1][0].originalIndex || left[0].localeCompare(right[0]))
    .map(([blockId]) => blockId);
  const initialCursors = new Map(orderedBlockIds.map((blockId) => [blockId, 0]));
  const memo = new Set();
  let exploredStates = 0;
  let solved = null;
  let bestPartial = {
    cleared: -1,
    drags: [],
    pendingTaskCount: authoredRoute.length,
    consumedNoops: 0,
    implicitPreTicks: 0,
  };

  const pendingTaskCountFor = (cursors) => orderedBlockIds.reduce((sum, blockId) => (
    sum + Math.max(0, tasksByBlock.get(blockId).length - (cursors.get(blockId) ?? 0))
  ), 0);

  const structuralSignature = (model, cursors) => {
    const snapshot = model.snapshot();
    const orderedBlocks = (blocks) => [...blocks]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((block) => [
        block.id,
        block.x,
        block.y,
        block.layers,
        block.frozen,
        block.shutterId ?? null,
        block.lockedBy ?? null,
        block.lockCount ?? null,
      ]);
    return JSON.stringify({
      cursors: orderedBlockIds.map((blockId) => cursors.get(blockId) ?? 0),
      gates: snapshot.gates.map((gate) => [gate.id, gate.frozen ?? null]),
      blocks: orderedBlocks(snapshot.blocks),
      queued: orderedBlocks(snapshot.queuedBlocks),
      shutters: snapshot.shutters.map((shutter) => [shutter.id, shutter.count]),
      generators: snapshot.generators.map((generator) => [
        generator.id,
        generator.head,
        generator.remaining,
        generator.nextBlockId ?? null,
        generator.elapsed,
      ]),
      elevators: snapshot.elevators.map((elevator) => [
        elevator.id,
        elevator.x,
        elevator.y,
        elevator.direction,
        elevator.elapsed,
      ]),
      cleared: snapshot.cleared,
      remainingSeconds: snapshot.remainingSeconds,
      complete: snapshot.complete,
      failed: snapshot.failed,
    });
  };

  const attemptTask = (baseline, task, preTick = false) => {
    const prepared = baseline.clone();
    if (preTick) prepared.tick(timedInterval);
    const block = prepared.getBlock(task.blockId);
    if (!block) return { results: [], reason: preTick ? "not released by one replayable pre-tick" : "not active yet" };
    if (!prepared.isBlockActive(block)) {
      const reason = block.frozen > 0 ? `numeric ice ${block.frozen}`
        : block.lockedBy ? `locked by ${block.lockedBy}`
          : block.shutterId ? `staged behind ${block.shutterId}`
            : "inactive";
      return { results: [], reason };
    }
    const plans = task.exit
      ? findDynamicExitPlans({ level, model: prepared, block, preferredSide: task.preferredExitSide })
      : task.target
        ? [findDynamicAnchorPath({ level, model: prepared, block, target: task.target })].filter(Boolean)
        : [{ path: [], exitSide: null }];
    if (!plans.length) return { results: [], reason: task.exit ? "no active-color gate path" : "target anchor unreachable" };
    if (!task.exit && plans[0].path.length === 0) {
      if (preTick) {
        return {
          results: [],
          reason: "replayable pre-tick released a block whose pending waypoint is already satisfied",
        };
      }
      return {
        results: [{ noop: true, trial: prepared, drag: null, blockRemoved: false, clearedGain: 0 }],
        reason: null,
      };
    }
    const results = [];
    for (const plan of plans) {
      const trial = prepared.clone();
      const beforeCleared = trial.snapshot().cleared;
      trial.beginAction();
      let rejectedStep = null;
      for (const [x, y] of plan.path) {
        if (!trial.moveBlockStep(task.blockId, x, y)) {
          rejectedStep = `${x},${y}`;
          break;
        }
      }
      if (rejectedStep) {
        trial.cancelAction();
        continue;
      }
      if (task.exit && !trial.tryExit(task.blockId, plan.exitSide).ok) {
        trial.cancelAction();
        continue;
      }
      if (!trial.commitAction()) continue;
      if (timedInterval) trial.tick(timedInterval);
      results.push({
        noop: false,
        trial,
        drag: {
          blockId: task.blockId,
          path: plan.path,
          ...(task.exit ? { exitSide: plan.exitSide } : {}),
        },
        blockRemoved: task.exit && !trial.getBlock(task.blockId),
        clearedGain: trial.snapshot().cleared - beforeCleared,
      });
    }
    return {
      results,
      reason: results.length ? null : "all synthesized plans were rejected by PuzzleModel",
    };
  };

  const syntheticRepositionCandidates = (baseline, heads) => {
    const snapshot = baseline.snapshot();
    const headByBlock = new Map(heads.map((task) => [task.blockId, task]));
    const candidates = [];
    for (const block of [...snapshot.blocks].sort((left, right) => left.id.localeCompare(right.id))) {
      const liveBlock = baseline.getBlock(block.id);
      if (!liveBlock || !baseline.isBlockActive(liveBlock)) continue;
      for (const [dx, dy] of anchorDirectionsFor(liveBlock)) {
        const nextX = liveBlock.x + dx;
        const nextY = liveBlock.y + dy;
        if (!baseline.canPlace(liveBlock, nextX, nextY)) continue;
        const trial = baseline.clone();
        trial.beginAction();
        if (!trial.moveBlockStep(liveBlock.id, nextX, nextY) || !trial.commitAction()) continue;
        if (timedInterval) trial.tick(timedInterval);
        const unlockedHeads = heads.slice(0, 8).reduce((count, task) => (
          count + Number(attemptTask(trial, task, false).results.length > 0)
        ), 0);
        const ownTask = headByBlock.get(liveBlock.id);
        const targetDistance = ownTask?.target
          ? Math.abs(nextX - ownTask.target[0]) + Math.abs(nextY - ownTask.target[1])
          : Number.MAX_SAFE_INTEGER;
        candidates.push({
          synthetic: true,
          result: {
            noop: false,
            trial,
            drag: { blockId: liveBlock.id, path: [[nextX, nextY]] },
            blockRemoved: false,
            clearedGain: 0,
          },
          unlockedHeads,
          targetDistance,
          blockId: liveBlock.id,
          directionOrder: anchorDirectionsFor(liveBlock)
            .findIndex(([candidateDx, candidateDy]) => candidateDx === dx && candidateDy === dy),
        });
      }
    }
    return candidates.sort((left, right) => (
      right.unlockedHeads - left.unlockedHeads
      || left.targetDistance - right.targetDistance
      || left.blockId.localeCompare(right.blockId)
      || left.directionOrder - right.directionOrder
    ));
  };

  const visit = (model, cursors, route, consumedNoops, implicitPreTicks, consecutiveSynthetic) => {
    if (exploredStates >= dynamicWitnessMaxStates) return false;
    exploredStates += 1;
    const signature = structuralSignature(model, cursors);
    if (memo.has(signature)) return false;
    memo.add(signature);
    const snapshot = model.snapshot();
    const pendingTaskCount = pendingTaskCountFor(cursors);
    if (snapshot.cleared > bestPartial.cleared
      || (snapshot.cleared === bestPartial.cleared && route.length > bestPartial.drags.length)) {
      bestPartial = {
        cleared: snapshot.cleared,
        drags: route,
        pendingTaskCount,
        consumedNoops,
        implicitPreTicks,
      };
    }
    if (snapshot.complete) {
      const independentReplay = replayRoute(level, route);
      if (!independentReplay.ok) return false;
      solved = {
        ok: true,
        drags: route,
        replay: independentReplay,
        consumedNoops,
        implicitPreTicks,
        exploredStates,
        capped: false,
      };
      return true;
    }

    const heads = orderedBlockIds.flatMap((blockId) => {
      const cursor = cursors.get(blockId) ?? 0;
      const task = tasksByBlock.get(blockId)[cursor];
      return task ? [task] : [];
    });
    const candidates = [];
    const deferred = [];
    for (const task of heads) {
      const attempted = attemptTask(model, task, false);
      if (attempted.results.length) {
        candidates.push(...attempted.results.map((result) => ({ task, result, preTick: false })));
      } else {
        deferred.push({ task, reason: attempted.reason });
      }
      if (timedInterval && !model.getBlock(task.blockId)) {
        const attemptedAfterTick = attemptTask(model, task, true);
        if (attemptedAfterTick.results.length) {
          candidates.push(...attemptedAfterTick.results.map((result) => ({ task, result, preTick: true })));
        } else {
          deferred.push({ task, reason: attemptedAfterTick.reason });
        }
      }
      // Geometry-only base routes sometimes contain parking waypoints that
      // become unnecessary (or permanently unreachable) after mechanism
      // carriers are rebound. Keep per-block ordering as the primary branch,
      // but also allow that block's eventual exit task to subsume its remaining
      // parking prefix when the live PuzzleModel proves a direct exit route.
      if (!task.exit) {
        const cursor = cursors.get(task.blockId) ?? 0;
        const queue = tasksByBlock.get(task.blockId);
        const exitIndex = queue.findIndex((candidate, index) => index >= cursor && candidate.exit);
        if (exitIndex > cursor) {
          const exitTask = queue[exitIndex];
          const attemptedExit = attemptTask(model, exitTask, false);
          candidates.push(...attemptedExit.results.map((result) => ({
            task: exitTask,
            result,
            preTick: false,
            bypassCursor: exitIndex,
          })));
        }
      }
    }
    if (!candidates.length) {
      if (consecutiveSynthetic < 24) {
        candidates.push(...syntheticRepositionCandidates(model, heads));
      }
      if (!candidates.length) {
        bestPartial.deferred = deferred;
        return false;
      }
    }
    if (!candidates[0]?.synthetic) {
      candidates.sort((left, right) => (
        right.result.clearedGain - left.result.clearedGain
        || Number(right.task.exit) - Number(left.task.exit)
        || left.task.originalIndex - right.task.originalIndex
        || left.task.blockId.localeCompare(right.task.blockId)
        || (left.result.drag?.path.length ?? 0) - (right.result.drag?.path.length ?? 0)
        || SIDES.indexOf(left.result.drag?.exitSide ?? "") - SIDES.indexOf(right.result.drag?.exitSide ?? "")
      ));
    }
    for (const candidate of candidates) {
      if (candidate.synthetic) {
        if (visit(
          candidate.result.trial,
          cursors,
          [...route, candidate.result.drag],
          consumedNoops,
          implicitPreTicks,
          consecutiveSynthetic + 1,
        )) return true;
        continue;
      }
      const nextCursors = new Map(cursors);
      const cursor = candidate.bypassCursor ?? nextCursors.get(candidate.task.blockId) ?? 0;
      if (candidate.result.noop || !candidate.task.exit || candidate.result.blockRemoved) {
        nextCursors.set(candidate.task.blockId, cursor + 1);
      } else if (candidate.bypassCursor !== undefined) {
        // The outer shell cleared but the core is still present. Discard only
        // the proven-unneeded parking prefix and retain this same exit task so
        // it is re-planned from the new layer color and current anchor.
        nextCursors.set(candidate.task.blockId, cursor);
      }
      const nextRoute = candidate.result.noop
        ? route
        : [...route, candidate.result.drag];
      if (visit(
        candidate.result.trial,
        nextCursors,
        nextRoute,
        consumedNoops + Number(candidate.result.noop),
        implicitPreTicks + Number(candidate.preTick),
        0,
      )) return true;
    }
    return false;
  };

  const model = new PuzzleModel(level);
  model.start();
  visit(model, initialCursors, [], 0, 0, 0);
  if (solved) return solved;
  const deferredSummary = bestPartial.deferred?.slice(0, 8)
    .map(({ task, reason }) => `${task.blockId}=${reason}`).join("; ");
  return {
    ok: false,
    error: `dynamic witness found no complete independently replayable route after ${exploredStates} states`
      + `${exploredStates >= dynamicWitnessMaxStates ? " (state cap reached)" : ""}`
      + `${deferredSummary ? `; furthest stall: ${deferredSummary}` : ""}`,
    partialDragCount: bestPartial.drags.length,
    pendingTaskCount: bestPartial.pendingTaskCount,
    consumedNoops: bestPartial.consumedNoops,
    implicitPreTicks: bestPartial.implicitPreTicks,
    exploredStates,
    capped: exploredStates >= dynamicWitnessMaxStates,
  };
};

const routeGateClearTimeline = (level, route) => {
  const blocks = new Map(level.blocks.map((block) => [block.id, {
    ...deepClone(block),
    layers: [...(block.layers?.length ? block.layers : [block.color])],
  }]));
  const firstUseByGateId = new Map();
  let priorClears = 0;

  const gateContains = (gate, block, side) => {
    if (gate.side !== side) return false;
    const cells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
    const minX = Math.min(...cells.map(([x]) => x));
    const maxX = Math.max(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const atEdge = side === "top" ? minY === 0
      : side === "bottom" ? maxY === level.height - 1
        : side === "left" ? minX === 0
          : maxX === level.width - 1;
    if (!atEdge) return false;
    if (block.movementAxis === "horizontal" && side !== "left" && side !== "right") return false;
    if (block.movementAxis === "vertical" && side !== "top" && side !== "bottom") return false;
    if (side === "top" || side === "bottom") {
      return minX >= gate.offset && maxX < gate.offset + gate.size;
    }
    return minY >= gate.offset && maxY < gate.offset + gate.size;
  };

  for (const drag of route) {
    const block = blocks.get(drag.blockId);
    if (!block) continue;
    const destination = drag.path?.at(-1);
    if (destination) [block.x, block.y] = destination;
    if (!drag.exitSide) continue;

    const activeColor = block.layers[0] ?? block.color;
    const gate = level.gates.find((candidate) => (
      candidate.color === activeColor
      && (!block.star || candidate.star)
      && gateContains(candidate, block, drag.exitSide)
    ));
    if (gate && !firstUseByGateId.has(gate.id)) {
      firstUseByGateId.set(gate.id, priorClears);
    }

    priorClears += 1;
    if (block.layers.length > 1) {
      block.layers.shift();
      block.color = block.layers[0];
    } else {
      blocks.delete(block.id);
    }
  }

  return { firstUseByGateId, clearCount: priorClears };
};

const permuteGateThawDescriptors = ({
  level,
  route,
  mechanism,
  warnings,
  meta,
  dynamicWitnessForLevel = null,
}) => {
  const ownFrozen = (gate) => Object.hasOwn(gate, "frozen");
  const before = level.gates.map((gate) => ({
    id: gate.id,
    side: gate.side,
    offset: gate.offset,
    size: gate.size,
    color: gate.color,
    star: Boolean(gate.star),
    frozen: ownFrozen(gate) ? Number(gate.frozen) : null,
  }));
  const { firstUseByGateId, clearCount } = routeGateClearTimeline(level, route);
  const mappingConstrained = Boolean(mechanism.directional_exits?.star_mapping);
  const poolKey = (gate) => mappingConstrained
    ? `${Boolean(gate.star)}|${gate.color}|${gate.side}`
    : String(Boolean(gate.star));
  const pools = new Map();
  level.gates.forEach((gate, index) => {
    const key = poolKey(gate);
    if (!pools.has(key)) pools.set(key, []);
    pools.get(key).push({ gate, index });
  });

  const poolAudits = [];
  for (const [key, entries] of pools) {
    if (entries.length < 2) continue;
    const descriptors = entries.map(({ gate, index }) => ({
      originalIndex: index,
      frozen: ownFrozen(gate) ? Number(gate.frozen) : null,
    })).sort((left, right) => (
      (left.frozen ?? 0) - (right.frozen ?? 0)
      || left.originalIndex - right.originalIndex
    ));
    const gatesByFirstUse = [...entries].sort((left, right) => (
      (firstUseByGateId.get(left.gate.id) ?? Number.MAX_SAFE_INTEGER)
        - (firstUseByGateId.get(right.gate.id) ?? Number.MAX_SAFE_INTEGER)
      || left.index - right.index
    ));
    const assignments = [];
    gatesByFirstUse.forEach(({ gate, index }, descriptorIndex) => {
      const descriptor = descriptors[descriptorIndex];
      const priorFrozen = ownFrozen(gate) ? Number(gate.frozen) : null;
      delete gate.frozen;
      if (descriptor.frozen !== null) gate.frozen = descriptor.frozen;
      assignments.push({
        gateId: gate.id,
        gateIndex: index,
        firstUseAfterClears: firstUseByGateId.get(gate.id) ?? null,
        beforeFrozen: priorFrozen,
        afterFrozen: descriptor.frozen,
      });
    });
    poolAudits.push({ key, assignments });
  }

  const after = level.gates.map((gate) => ({
    id: gate.id,
    side: gate.side,
    offset: gate.offset,
    size: gate.size,
    color: gate.color,
    star: Boolean(gate.star),
    frozen: ownFrozen(gate) ? Number(gate.frozen) : null,
  }));
  const proposedChanged = before.filter((entry, index) => entry.frozen !== after[index].frozen).length;
  const invariant = (entries) => ({
    geometryColorsAndStars: entries.map(({ side, offset, size, color, star }) => (
      { side, offset, size, color, star }
    )),
    nonStarDescriptors: entries.filter((entry) => !entry.star)
      .map((entry) => entry.frozen).sort((left, right) => (left ?? 0) - (right ?? 0)),
    starDescriptors: entries.filter((entry) => entry.star)
      .map((entry) => entry.frozen).sort((left, right) => (left ?? 0) - (right ?? 0)),
  });
  if (!sameJson(invariant(before), invariant(after))) {
    throw new Error(`${levelLabel(level.id)}: gate thaw permutation changed a protected gate invariant`);
  }
  if (level.gates.some((gate) => Object.hasOwn(gate, "frozen") && !(Number(gate.frozen) > 0))) {
    throw new Error(`${levelLabel(level.id)}: ordinary gates must omit frozen after thaw permutation`);
  }

  let accepted = true;
  let decision = proposedChanged ? "adapted_route_timing_order" : "already_timing_ordered";
  let baselineBoundedWitness = null;
  let proposedBoundedWitness = null;
  let proposedDynamicWitness = null;
  if (proposedChanged) {
    const baselineLevel = { ...level, gates: deepClone(before).map((gate) => ({
      id: gate.id,
      side: gate.side,
      offset: gate.offset,
      size: gate.size,
      color: gate.color,
      ...(gate.star ? { star: true } : {}),
      ...(gate.frozen === null ? {} : { frozen: gate.frozen }),
    })) };
    const baselineRouteReplay = replayRoute(baselineLevel, route);
    const proposedRouteReplay = replayRoute(level, route);
    if (!proposedRouteReplay.ok && dynamicWitnessForLevel) {
      proposedDynamicWitness = dynamicWitnessForLevel(level);
    }
    const proposedHasWitness = proposedRouteReplay.ok || proposedDynamicWitness?.ok;
    if (baselineRouteReplay.ok && !proposedHasWitness) {
      accepted = false;
      decision = "rollback_preserved_adapted_route_witness";
    } else if (!baselineRouteReplay.ok && !proposedHasWitness) {
      const boundedWitness = (candidateLevel) => {
        try {
          const solved = solveLevelForValidation(candidateLevel, solverMaxStates);
          if (!solved.solved) return { solved: false, exploredStates: solved.exploredStates };
          const replayed = replayRoute(candidateLevel, solved.drags);
          return {
            solved: replayed.ok,
            exploredStates: solved.exploredStates,
            replayError: replayed.ok ? null : replayed.error,
          };
        } catch (error) {
          return {
            solved: false,
            exploredStates: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      };
      baselineBoundedWitness = boundedWitness(baselineLevel);
      proposedBoundedWitness = boundedWitness(level);
      if (baselineBoundedWitness.solved && !proposedBoundedWitness.solved) {
        accepted = false;
        decision = "rollback_preserved_bounded_solver_witness";
      }
    }
    if (!accepted) {
      level.gates.forEach((gate, index) => {
        delete gate.frozen;
        if (before[index].frozen !== null) gate.frozen = before[index].frozen;
      });
    }
  }
  const changed = accepted ? proposedChanged : 0;
  if (changed) {
    warnings.push(
      `directional exits: reassigned ${changed} ordinary/frozen descriptors by adapted-route clear timing`,
    );
  } else if (proposedChanged && !accepted) {
    warnings.push(`directional exits: ${decision.replaceAll("_", " ")}`);
  }
  meta.gateThawPermutation = {
    applied: true,
    accepted,
    decision,
    mapping_constrained: mappingConstrained,
    adapted_route_clear_count: clearCount,
    proposed_changed_gate_count: proposedChanged,
    changed_gate_count: changed,
    bounded_witness_comparison: {
      baseline: baselineBoundedWitness,
      proposed: proposedBoundedWitness,
    },
    proposed_dynamic_witness: proposedDynamicWitness ? {
      ok: proposedDynamicWitness.ok,
      drags: proposedDynamicWitness.ok ? proposedDynamicWitness.drags.length : null,
      error: proposedDynamicWitness.ok ? null : proposedDynamicWitness.error,
    } : null,
    pools: poolAudits,
  };
};

const pickByHistogram = ({ eligible, histogram, count, score, label, warnings }) => {
  const selected = [];
  const used = new Set();
  const choose = (shapeId, amount) => {
    const candidates = eligible
      .filter((block) => !used.has(block.id) && (shapeId === null || shapeIdOf(block.shape) === shapeId))
      .sort((left, right) => score(right) - score(left) || left.id.localeCompare(right.id));
    if (candidates.length < amount) {
      warnings.push(`${label}: needs ${amount} ${shapeId ?? "any"} blocks, found ${candidates.length}`);
    }
    for (const block of candidates.slice(0, amount)) {
      used.add(block.id);
      selected.push(block);
    }
  };
  const normalized = histogramOrNull(histogram);
  if (normalized) {
    for (const shapeId of SHAPE_ORDER) choose(shapeId, normalized[shapeId] ?? 0);
  }
  const remaining = Math.max(0, Number(count ?? histogramTotal(normalized)) - selected.length);
  if (remaining) choose(null, remaining);
  return selected;
};

const combinations = (items, maxSize) => {
  const result = [];
  const visit = (start, picked) => {
    if (picked.length) result.push([...picked]);
    if (picked.length >= maxSize) return;
    for (let index = start; index < items.length; index += 1) {
      picked.push(items[index]);
      visit(index + 1, picked);
      picked.pop();
    }
  };
  visit(0, []);
  return result;
};

const normalizeStarGateMapping = (mapping, palette) => {
  if (!isObject(mapping)) return [];
  const sourceColors = [];
  const parsed = Object.entries(mapping).map(([sourceKey, description]) => {
    const match = sourceKey.match(/^(.*?)(ordinary|star)$/i);
    const sourceColor = (match?.[1] ?? sourceKey).toLowerCase();
    if (!sourceColors.includes(sourceColor)) sourceColors.push(sourceColor);
    const text = String(description).toLowerCase();
    const side = SIDES.find((candidate) => new RegExp(`\\b${candidate}\\b`).test(text)) ?? null;
    const frozenMatch = text.match(/\bfrozen\s*(\d+)\b/);
    return {
      sourceKey,
      sourceColor,
      star: match?.[2]?.toLowerCase() === "star",
      side,
      frozen: frozenMatch ? Number(frozenMatch[1]) : null,
    };
  });
  const targetBySourceColor = new Map(sourceColors.map((sourceColor, index) => [
    sourceColor,
    palette[index] ?? null,
  ]));
  return parsed.map((entry) => ({
    ...entry,
    color: targetBySourceColor.get(entry.sourceColor),
  }));
};

const pickByHistogramCoveringColors = ({
  eligible,
  histogram,
  count,
  requiredColors,
  score,
}) => {
  const normalized = histogramOrNull(histogram);
  const targetCount = Number(count ?? histogramTotal(normalized));
  const uniqueColors = [...new Set(requiredColors)];
  if (uniqueColors.length > targetCount) return [];
  const quota = normalized ? new Map(Object.entries(normalized)) : null;
  const usedByShape = new Map();
  const selected = [];
  const usedIds = new Set();
  const orderedColors = [...uniqueColors].sort((left, right) => (
    eligible.filter((block) => block.color === left).length
    - eligible.filter((block) => block.color === right).length
  ));
  const seed = (index) => {
    if (index === orderedColors.length) return true;
    const color = orderedColors[index];
    const candidates = eligible
      .filter((block) => block.color === color && !usedIds.has(block.id))
      .sort((left, right) => score(right) - score(left) || left.id.localeCompare(right.id));
    for (const block of candidates) {
      const shapeId = shapeIdOf(block.shape);
      if (quota && (usedByShape.get(shapeId) ?? 0) >= Number(quota.get(shapeId) ?? 0)) continue;
      selected.push(block);
      usedIds.add(block.id);
      usedByShape.set(shapeId, (usedByShape.get(shapeId) ?? 0) + 1);
      if (seed(index + 1)) return true;
      usedByShape.set(shapeId, usedByShape.get(shapeId) - 1);
      usedIds.delete(block.id);
      selected.pop();
    }
    return false;
  };
  if (!seed(0)) return [];

  const remainingHistogram = normalized
    ? Object.fromEntries(Object.entries(normalized).map(([shapeId, amount]) => [
      shapeId,
      Number(amount) - (usedByShape.get(shapeId) ?? 0),
    ]))
    : null;
  const fillWarnings = [];
  const fill = pickByHistogram({
    eligible: eligible.filter((block) => !usedIds.has(block.id)),
    histogram: remainingHistogram,
    count: targetCount - selected.length,
    score,
    label: "stars mapped fill",
    warnings: fillWarnings,
  });
  const result = [...selected, ...fill];
  if (result.length !== targetCount) return [];
  if (normalized && !histogramEquals(histogramOf(result), normalized)) return [];
  if (!uniqueColors.every((color) => result.some((block) => block.color === color))) return [];
  return result;
};

const selectStarBlocks = ({ level, target, mechanism, ranks, warnings }) => {
  const stars = mechanism.stars;
  if (!stars?.count) return { blocks: [], colors: [] };
  const starGateCount = mechanism.directional_exits?.star_count ?? 0;
  const requiredHistogram = histogramOrNull(stars.shape_histogram);
  const palette = [
    ...target.design_palette.filter((color) => allClearLayerColors(level).includes(color)),
    ...allClearLayerColors(level).filter((color) => !target.design_palette.includes(color)),
  ].filter((color, index, colors) => colors.indexOf(color) === index);
  let selected = [];
  let colors = [];
  const mappedStarColors = normalizeStarGateMapping(
    mechanism.directional_exits?.star_mapping,
    palette,
  ).filter((entry) => entry.star).map((entry) => entry.color).filter(Boolean);
  if (mappedStarColors.length) {
    selected = pickByHistogramCoveringColors({
      eligible: level.blocks.filter((block) => mappedStarColors.includes(block.color)),
      histogram: requiredHistogram,
      count: stars.count,
      requiredColors: mappedStarColors,
      score: (block) => ranks.last(block.id),
    });
    colors = [...new Set(selected.map((block) => block.color))];
    if (!selected.length) {
      warnings.push(
        `stars: cannot satisfy exact mapped colors ${[...new Set(mappedStarColors)].join(", ")} `
        + `with histogram ${JSON.stringify(requiredHistogram)}`,
      );
    }
  }
  for (const candidateColors of selected.length ? [] : combinations(palette, Math.max(1, starGateCount))
    .sort((left, right) => left.length - right.length)) {
    const candidates = level.blocks.filter((block) => candidateColors.includes(block.color));
    const trialWarnings = [];
    const trial = pickByHistogram({
      eligible: candidates,
      histogram: requiredHistogram,
      count: stars.count,
      score: (block) => ranks.last(block.id),
      label: "stars",
      warnings: trialWarnings,
    });
    if (trial.length === stars.count) {
      selected = trial;
      colors = [...new Set(trial.map((block) => block.color))];
      break;
    }
  }
  if (selected.length !== stars.count) {
    selected = pickByHistogram({
      eligible: level.blocks,
      histogram: requiredHistogram,
      count: stars.count,
      score: (block) => ranks.last(block.id),
      label: "stars",
      warnings,
    });
    colors = [...new Set(selected.map((block) => block.color))];
  }
  if (colors.length > starGateCount) {
    warnings.push(`stars: ${colors.length} star colors need gates but contract has ${starGateCount}`);
  }
  for (const block of selected) block.star = true;
  return { blocks: selected, colors };
};

const boundaryPlayable = (level, side, coordinate) => {
  const playable = new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  if (side === "top") return playable.has(keyOf(coordinate, 0));
  if (side === "bottom") return playable.has(keyOf(coordinate, level.height - 1));
  if (side === "left") return playable.has(keyOf(0, coordinate));
  return playable.has(keyOf(level.width - 1, coordinate));
};

const assembleGates = ({
  level,
  target,
  mechanism,
  baseGates,
  route,
  starSelection,
  stages,
  warnings,
  meta,
}) => {
  const spec = mechanism.directional_exits ?? { ordinary_count: baseGates.length, frozen_values: [] };
  const descriptors = [
    ...Array.from({ length: spec.ordinary_count ?? 0 }, () => ({ star: false, kind: "ordinary" })),
    ...Array.from(spec.frozen_values ?? [], (frozen) => ({ star: false, kind: "frozen", frozen })),
    ...Array.from({ length: Math.max(0, (spec.star_count ?? 0) - (spec.star_frozen_count ?? 0)) }, () => ({
      star: true,
      kind: "star_ordinary",
    })),
    ...Array.from(spec.star_frozen_values ?? [], (frozen) => ({ star: true, kind: "star_frozen", frozen })),
  ];
  const palette = target.design_palette;
  const ranks = routeRanks(route);
  const buildAssignments = () => {
    const ordinary = descriptors.filter((descriptor) => !descriptor.star && descriptor.kind === "ordinary");
    const frozen = descriptors.filter((descriptor) => !descriptor.star && descriptor.kind === "frozen")
      .sort((left, right) => Number(left.frozen) - Number(right.frozen));
    const star = descriptors.filter((descriptor) => descriptor.star)
      .sort((left, right) => (
        (left.kind === "star_ordinary" ? -1 : Number(left.frozen))
        - (right.kind === "star_ordinary" ? -1 : Number(right.frozen))
      ));
    const queuedIds = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
    const capacity = new Map(palette.map((color) => {
      const blocks = level.blocks.filter((block) => blockClearsColor(block, color));
      const initial = blocks
        .filter((block) => !block.shutterId && !queuedIds.has(block.id) && !(Number(block.frozen ?? 0) > 0))
        .reduce((sum, block) => sum + Number(clearLayerColorsOf(block)[0] === color), 0);
      const total = blocks.reduce((sum, block) => (
        sum + clearLayerColorsOf(block).filter((layerColor) => layerColor === color).length
      ), 0);
      const first = Math.min(...blocks.map((block) => ranks.first(block.id)));
      return [color, { initial, total, first }];
    }));
    const orderedColors = [...palette].sort((left, right) => (
      capacity.get(right).initial - capacity.get(left).initial
      || capacity.get(right).total - capacity.get(left).total
      || capacity.get(left).first - capacity.get(right).first
      || palette.indexOf(left) - palette.indexOf(right)
    ));
    const primary = [];
    const covered = new Set();
    const currentStarColors = [...new Set(starSelection.blocks.flatMap(clearLayerColorsOf))];
    for (const color of currentStarColors) {
      const descriptor = star.shift();
      if (!descriptor) {
        warnings.push(`directional exits: no contracted star gate remains for star color ${color}`);
        continue;
      }
      primary.push({ color, descriptor });
      covered.add(color);
    }
    for (const color of orderedColors.filter((candidate) => !covered.has(candidate))) {
      let descriptor = ordinary.shift();
      if (!descriptor) descriptor = frozen.shift();
      if (!descriptor) {
        warnings.push(`directional exits: no contracted gate remains for color ${color}`);
        continue;
      }
      primary.push({ color, descriptor });
      covered.add(color);
    }
    return { primary, extras: [...ordinary, ...frozen, ...star] };
  };
  let { primary: primaryAssignments, extras } = buildAssignments();
  const templates = [...baseGates];
  const usedTemplates = new Set();
  const gates = [];
  const occupied = new Set();
  const occupy = (gate) => {
    for (let offset = gate.offset; offset < gate.offset + gate.size; offset += 1) {
      occupied.add(`${gate.side}:${offset}`);
    }
  };
  const gateFrom = (template, color, descriptor, index) => {
    const gate = {
      id: `vp-${String(level.id).padStart(3, "0")}-gate-${String(index + 1).padStart(2, "0")}`,
      side: template.side,
      offset: template.offset,
      size: template.size,
      color,
      ...(descriptor.star ? { star: true } : {}),
      ...(descriptor.kind.includes("frozen") ? { frozen: Number(descriptor.frozen) } : {}),
    };
    return gate;
  };
  // The base generator has already replayed its route against these exact gate
  // mouths.  When the source contract only distinguishes ordinary vs frozen
  // exits (no star mapping), preserve every base gate's color and geometry and
  // attach the contracted thaw descriptors in place.  Rebuilding the surplus
  // mouths from arbitrary free boundary slots can invalidate an otherwise
  // axis-compatible witness: a left/right Arrow carrier may be left with only
  // a top/bottom gate after repacking.  The later thaw permutation still moves
  // frozen values onto gates in route-feasible order without changing this
  // protected geometry/color mapping.
  const clearLayerPalette = new Set(level.blocks.flatMap(clearLayerColorsOf));
  const canPreserveExactBaseGates = appliedBaseOverrideIds.includes(level.id)
    && descriptors.every((descriptor) => !descriptor.star)
    && baseGates.length === descriptors.length
    && baseGates.every((gate) => palette.includes(gate.color))
    && [...clearLayerPalette].every((color) => baseGates.some((gate) => gate.color === color));
  if (canPreserveExactBaseGates) {
    level.gates = baseGates.map((template, index) => gateFrom(
      template,
      template.color,
      descriptors[index],
      index,
    ));
    warnings.push("directional exits: preserved exact base gate color/geometry mapping");
    return descriptors;
  }
  const mappedGates = normalizeStarGateMapping(spec.star_mapping, palette);
  const mappingMatchesDescriptorContract = mappedGates.length === descriptors.length
    && mappedGates.every((entry) => entry.color && entry.side)
    && mappedGates.filter((entry) => !entry.star && entry.frozen === null).length
      === Number(spec.ordinary_count ?? 0)
    && sameJson(
      sortedNumbers(mappedGates.filter((entry) => !entry.star && entry.frozen !== null)
        .map((entry) => entry.frozen)),
      sortedNumbers(spec.frozen_values ?? []),
    )
    && mappedGates.filter((entry) => entry.star).length === Number(spec.star_count ?? 0)
    && mappedGates.filter((entry) => entry.star && entry.frozen !== null).length
      === Number(spec.star_frozen_count ?? 0)
    && sameJson(
      sortedNumbers(mappedGates.filter((entry) => entry.star && entry.frozen !== null)
        .map((entry) => entry.frozen)),
      sortedNumbers(spec.star_frozen_values ?? []),
    );
  if (mappedGates.length && mappingMatchesDescriptorContract) {
    const mappedOccupied = new Set();
    const exactGates = [];
    for (const [index, mapping] of mappedGates.entries()) {
      const relevant = (mapping.star ? starSelection.blocks : level.blocks)
        .filter((block) => blockClearsColor(block, mapping.color));
      const horizontal = mapping.side === "top" || mapping.side === "bottom";
      const size = Math.max(1, ...relevant.map((block) => {
        const bounds = shapeBounds(block.shape);
        return horizontal ? bounds.width : bounds.height;
      }));
      const limit = horizontal ? level.width : level.height;
      const template = baseGates.find((gate) => gate.side === mapping.side && gate.color === mapping.color)
        ?? baseGates.find((gate) => gate.side === mapping.side);
      const candidates = Array.from({ length: Math.max(0, limit - size + 1) }, (_, offset) => ({
        side: mapping.side,
        offset,
        size,
        keys: Array.from({ length: size }, (__, delta) => `${mapping.side}:${offset + delta}`),
      })).filter((candidate) => candidate.keys.every((key, delta) => (
        !mappedOccupied.has(key)
        && boundaryPlayable(level, mapping.side, candidate.offset + delta)
      ))).sort((left, right) => (
        Math.abs(left.offset - (template?.offset ?? Math.floor((limit - size) / 2)))
        - Math.abs(right.offset - (template?.offset ?? Math.floor((limit - size) / 2)))
      ));
      const slot = candidates[0];
      if (!slot) {
        warnings.push(
          `directional exits: exact star_mapping cannot place ${mapping.sourceKey} `
          + `on ${mapping.side} for ${mapping.color}`,
        );
        exactGates.length = 0;
        break;
      }
      const descriptor = {
        star: mapping.star,
        kind: `${mapping.star ? "star_" : ""}${mapping.frozen === null ? "ordinary" : "frozen"}`,
        ...(mapping.frozen === null ? {} : { frozen: mapping.frozen }),
      };
      const gate = gateFrom(slot, mapping.color, descriptor, index);
      exactGates.push(gate);
      slot.keys.forEach((key) => mappedOccupied.add(key));
    }
    if (exactGates.length === mappedGates.length) {
      level.gates = exactGates;
      meta.starGateMapping = mappedGates;
      return descriptors;
    }
  } else if (mappedGates.length) {
    warnings.push("directional exits: star_mapping does not match aggregate gate contract");
  }
  for (const assignment of primaryAssignments) {
    let templateIndex = templates.findIndex((gate, index) => !usedTemplates.has(index) && gate.color === assignment.color);
    if (templateIndex < 0) templateIndex = templates.findIndex((_, index) => !usedTemplates.has(index));
    if (templateIndex < 0) {
      warnings.push(`directional exits: no base gate template for primary color ${assignment.color}`);
      continue;
    }
    usedTemplates.add(templateIndex);
    const gate = gateFrom(templates[templateIndex], assignment.color, assignment.descriptor, gates.length);
    gates.push(gate);
    occupy(gate);
  }
  const selectedStarColors = [...new Set(starSelection.blocks.flatMap(clearLayerColorsOf))];
  const starColors = selectedStarColors.length ? selectedStarColors : palette.slice(0, 1);
  const requiredSpanFor = (descriptor, color, side) => {
    if (!descriptor.star) return 1;
    const relevant = starSelection.blocks.filter((block) => blockClearsColor(block, color));
    if (!relevant.length) return 1;
    return Math.max(...relevant.map((block) => {
      const bounds = shapeBounds(block.shape);
      return side === "top" || side === "bottom" ? bounds.width : bounds.height;
    }));
  };
  const findSlot = (descriptor, color) => {
    for (const side of SIDES) {
      const limit = side === "top" || side === "bottom" ? level.width : level.height;
      const required = requiredSpanFor(descriptor, color, side);
      for (let offset = 0; offset + required <= limit; offset += 1) {
        let available = true;
        for (let coordinate = offset; coordinate < offset + required; coordinate += 1) {
          if (occupied.has(`${side}:${coordinate}`) || !boundaryPlayable(level, side, coordinate)) {
            available = false;
            break;
          }
        }
        if (available) return { side, offset, size: required };
      }
    }
    return null;
  };
  let primaryGatesCompacted = false;
  const compactPrimaryGates = () => {
    if (primaryGatesCompacted) return;
    primaryGatesCompacted = true;
    for (const gate of gates.slice(0, primaryAssignments.length)) {
      const requiredSpan = Math.max(1, ...level.blocks
        .filter((block) => blockClearsColor(block, gate.color))
        .map((block) => {
          const bounds = shapeBounds(block.shape);
          return gate.side === "top" || gate.side === "bottom" ? bounds.width : bounds.height;
        }));
      if (requiredSpan < gate.size) {
        gate.offset += Math.floor((gate.size - requiredSpan) / 2);
        gate.size = requiredSpan;
      }
    }
    occupied.clear();
    gates.forEach(occupy);
  };
  const extraAssignments = extras.map((descriptor, extraIndex) => ({
    descriptor,
    color: descriptor.star
      ? starColors[extraIndex % starColors.length]
      : palette[extraIndex % palette.length],
  }));
  let initialPlacementFailureCount = 0;
  extraAssignments.forEach(({ descriptor, color }) => {
    let slot = findSlot(descriptor, color);
    if (!slot) {
      // The base packer uses intentionally generous mouths. Compact them only
      // when the exact source gate multiplicity cannot otherwise fit (notably
      // Lv37 and the 24 one-cell exits of Lv60), preserving its authored route
      // for every level where the original layout already has enough room.
      compactPrimaryGates();
      slot = findSlot(descriptor, color);
    }
    if (!slot) {
      initialPlacementFailureCount += 1;
      return;
    }
    const gate = gateFrom(slot, color, descriptor, gates.length);
    gates.push(gate);
    occupy(gate);
  });

  const repackAllGates = () => {
    const currentStarColors = [...new Set(starSelection.blocks.flatMap(clearLayerColorsOf))];
    if (!currentStarColors.length) currentStarColors.push(palette[0]);
    const currentExtras = extras.map((descriptor, index) => ({
      key: `extra-${index}`,
      descriptor,
      color: descriptor.star
        ? currentStarColors[index % currentStarColors.length]
        : palette[index % palette.length],
      primary: false,
    }));
    const constrained = [
      ...primaryAssignments.map((assignment, index) => ({
        key: `primary-${index}`,
        ...assignment,
        primary: true,
      })),
      ...currentExtras.filter((assignment) => assignment.descriptor.star),
    ];
    const unitExtras = currentExtras.filter((assignment) => !assignment.descriptor.star);
    const legalSlots = SIDES.flatMap((side) => {
      const limit = side === "top" || side === "bottom" ? level.width : level.height;
      return Array.from({ length: limit }, (_, coordinate) => ({
        side,
        coordinate,
        key: `${side}:${coordinate}`,
      })).filter((slot) => boundaryPlayable(level, slot.side, slot.coordinate));
    });
    const preferredExitSide = new Map();
    for (const drag of route) {
      if (!drag.exitSide) continue;
      const routeBlock = level.blocks.find((block) => block.id === drag.blockId);
      const color = routeBlock ? clearLayerColorsOf(routeBlock)[0] : null;
      if (color && !preferredExitSide.has(color)) preferredExitSide.set(color, drag.exitSide);
    }
    const candidatesFor = (request) => {
      const relevant = request.primary
        ? level.blocks.filter((block) => blockClearsColor(block, request.color))
        : starSelection.blocks.filter((block) => blockClearsColor(block, request.color));
      const candidates = [];
      for (const side of SIDES) {
        const horizontal = side === "top" || side === "bottom";
        const size = Math.max(1, ...relevant.map((block) => {
          const bounds = shapeBounds(block.shape);
          return horizontal ? bounds.width : bounds.height;
        }));
        const limit = horizontal ? level.width : level.height;
        for (let offset = 0; offset + size <= limit; offset += 1) {
          const keys = Array.from({ length: size }, (_, delta) => `${side}:${offset + delta}`);
          if (keys.every((key, delta) => (
            boundaryPlayable(level, side, offset + delta)
          ))) {
            const template = baseGates.find((gate) => gate.color === request.color);
            const preference = (preferredExitSide.get(request.color) === side ? 0 : 10_000)
              + (template?.side === side ? 0 : 1_000)
              + Math.abs((template?.offset ?? offset) - offset);
            candidates.push({ side, offset, size, keys, preference });
          }
        }
      }
      return candidates.sort((left, right) => (
        left.size - right.size || left.preference - right.preference
      ));
    };
    const requests = constrained.map((request) => ({
      ...request,
      candidates: candidatesFor(request),
    })).sort((left, right) => {
      const leftMinimum = Math.min(...left.candidates.map((candidate) => candidate.size));
      const rightMinimum = Math.min(...right.candidates.map((candidate) => candidate.size));
      return rightMinimum - leftMinimum || left.candidates.length - right.candidates.length;
    });
    if (requests.some((request) => !request.candidates.length)) return null;

    const assignments = new Map();
    const occupiedKeys = new Set();
    const memo = new Set();
    let searchNodes = 0;
    const search = (index) => {
      searchNodes += 1;
      if (searchNodes > 1_000_000) return false;
      if (index === requests.length) {
        return legalSlots.filter((slot) => !occupiedKeys.has(slot.key)).length >= unitExtras.length;
      }
      const minimumRemaining = requests.slice(index).reduce((sum, request) => (
        sum + Math.min(...request.candidates.map((candidate) => candidate.size))
      ), unitExtras.length);
      if (legalSlots.length - occupiedKeys.size < minimumRemaining) return false;
      const memoKey = `${index}|${[...occupiedKeys].sort().join(",")}`;
      if (memo.has(memoKey)) return false;
      const request = requests[index];
      for (const candidate of request.candidates) {
        if (candidate.keys.some((key) => occupiedKeys.has(key))) continue;
        candidate.keys.forEach((key) => occupiedKeys.add(key));
        assignments.set(request.key, candidate);
        if (search(index + 1)) return true;
        assignments.delete(request.key);
        candidate.keys.forEach((key) => occupiedKeys.delete(key));
      }
      memo.add(memoKey);
      return false;
    };
    if (!search(0)) return null;

    const freeSlots = legalSlots.filter((slot) => !occupiedKeys.has(slot.key));
    unitExtras.forEach((request, index) => {
      const slot = freeSlots[index];
      assignments.set(request.key, {
        side: slot.side,
        offset: slot.coordinate,
        size: 1,
        keys: [slot.key],
      });
    });
    const orderedRequests = [
      ...primaryAssignments.map((assignment, index) => ({ key: `primary-${index}`, ...assignment })),
      ...currentExtras,
    ];
    return orderedRequests.map((request, index) => gateFrom(
      assignments.get(request.key),
      request.color,
      request.descriptor,
      index,
    ));
  };

  if (gates.length !== descriptors.length) {
    let repacked = repackAllGates();
    if (!repacked && compactColorsForGateCapacity({ level, target, stages, warnings, meta })) {
      ({ primary: primaryAssignments, extras } = buildAssignments());
      repacked = repackAllGates();
    }
    if (repacked) {
      gates.splice(0, gates.length, ...repacked);
      warnings.push(
        `directional exits: repacked complete exact gate set on legal boundary slots `
        + `after ${initialPlacementFailureCount} initial placement conflicts`,
      );
    } else {
      warnings.push(
        `directional exits: exact repack failed (${gates.length}/${descriptors.length}; `
        + `${initialPlacementFailureCount} initial placement conflicts)`,
      );
    }
  }

  // If a contracted star descriptor became a primary gate for another color,
  // remap star gates so every actually starred color has a legal destination.
  const finalStarColors = [...new Set(starSelection.blocks.flatMap(clearLayerColorsOf))];
  for (const [index, color] of finalStarColors.entries()) {
    const candidate = gates.filter((gate) => gate.star)[index];
    if (candidate) candidate.color = color;
  }
  level.gates = gates;
  return descriptors;
};

const stageGroupsFromBase = ({ level, target, warnings }) => {
  const partitions = target.stage_partitions ?? [{ id: "opening", kind: "opening", count: level.blocks.length }];
  const groups = [];
  let cursor = 0;
  for (let index = 0; index < partitions.length; index += 1) {
    const partition = partitions[index];
    const blocks = level.blocks.slice(cursor, cursor + partition.count);
    cursor += partition.count;
    if (blocks.length !== partition.count) {
      warnings.push(`${partition.id}: expected ${partition.count} blocks, found ${blocks.length}`);
    }
    if (histogramOrNull(partition.shape_histogram)
      && !histogramEquals(histogramOf(blocks), partition.shape_histogram)) {
      warnings.push(`${partition.id}: base stage histogram differs from contract`);
    }
    groups.push({ index, partition, blocks });
  }
  if (cursor !== level.blocks.length) {
    warnings.push(`stage partitions consume ${cursor}/${level.blocks.length} blocks`);
  }
  return groups;
};

const splitBlocks = (blocks, count) => {
  if (count <= 1) return [[...blocks]];
  const result = Array.from({ length: count }, () => []);
  blocks.forEach((block, index) => result[index % count].push(block));
  return result;
};

const deviceGroupsFromStages = (stages, desiredCount, ranks, warnings, label) => {
  if (!desiredCount) return [];
  const orderedStages = stages.map((stage) => ({
    stage,
    blocks: [...stage.blocks].sort((left, right) => ranks.first(left.id) - ranks.first(right.id)),
  }));
  if (!orderedStages.length) {
    warnings.push(`${label}: ${desiredCount} devices requested but no stage groups exist`);
    return [];
  }
  if (orderedStages.length === desiredCount) return orderedStages;
  if (orderedStages.length < desiredCount) {
    // A source video can prove that several same-value devices released one
    // combined cohort without revealing which block belonged to which device
    // (Lv49: three value-19 covers, one 17-block reveal). Materialize every
    // runtime device deterministically, while retaining the common source
    // stage so the evidence audit can recombine the split into one batch.
    const deviceCounts = Array.from({ length: orderedStages.length }, () => 1);
    for (let index = orderedStages.length; index < desiredCount; index += 1) {
      deviceCounts[index % orderedStages.length] += 1;
    }
    const groups = orderedStages.flatMap((entry, stageIndex) => (
      splitBlocks(entry.blocks, deviceCounts[stageIndex]).map((blocks, syntheticDeviceIndex) => ({
        stage: entry.stage,
        sourceBatchKey: entry.stage.partition.id,
        syntheticDeviceIndex,
        blocks,
      }))
    ));
    if (groups.some((group) => group.blocks.length === 0)) {
      warnings.push(`${label}: ${desiredCount} devices exceed the available staged blocks`);
    }
    return groups;
  }
  if (orderedStages.length > desiredCount) {
    const result = Array.from({ length: desiredCount }, () => ({ stages: [], blocks: [] }));
    orderedStages.forEach((entry, index) => {
      const bucket = result[index % desiredCount];
      bucket.stages.push(entry.stage);
      bucket.blocks.push(...entry.blocks);
    });
    return result;
  }
  return orderedStages;
};

const blockBox = (blocks) => {
  const cells = blocks.flatMap((block) => cellsAt(block));
  if (!cells.length) return { x: 0, y: 0, width: 1, height: 1 };
  const minX = Math.min(...cells.map(([x]) => x));
  const maxX = Math.max(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  const maxY = Math.max(...cells.map(([, y]) => y));
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

// Directly counted from the local 1 fps gameplay evidence. These are the
// opening pieces visibly enclosed by the fixed frame, before its hidden batch
// appears. Keeping this fact here prevents route order from inventing a front
// cohort while the v6 contract still says only `opening_subset`.
const STAGED_FRAME_FRONT_VIDEO_FACTS = new Map([
  [73, [{
    count: 9,
    histogram: { SINGLE: 2, H2: 2, SQ2: 3, L3: 1, L4: 1 },
    evidence: "capacity-chain-reaudit/corrections.json#lv073-opening-staged-frame-and-cover-full-ledger",
  }]],
  [75, [{
    count: 5,
    histogram: { SINGLE: 1, H2: 1, H3: 3 },
    evidence: "references/imported/blockout-100-level-images-2026-09-04/crops100/level075.png",
  }]],
  [78, [{
    count: 5,
    histogram: { H2: 3, L3: 2 },
    evidence: "references/imported/blockout-100-level-images-2026-09-04/crops100/level078.png",
  }]],
]);

const stagedFrameFrontScore = (block, hiddenBox) => {
  const cells = cellsAt(block);
  const overlap = cells.filter(([x, y]) => (
    x >= hiddenBox.x && x < hiddenBox.x + hiddenBox.width
    && y >= hiddenBox.y && y < hiddenBox.y + hiddenBox.height
  )).length;
  const distance = Math.min(...cells.map(([x, y]) => {
    const dx = x < hiddenBox.x ? hiddenBox.x - x
      : x >= hiddenBox.x + hiddenBox.width ? x - (hiddenBox.x + hiddenBox.width - 1)
        : 0;
    const dy = y < hiddenBox.y ? hiddenBox.y - y
      : y >= hiddenBox.y + hiddenBox.height ? y - (hiddenBox.y + hiddenBox.height - 1)
        : 0;
    return dx + dy;
  }));
  return overlap * 1_000_000 - distance * 10_000;
};

const rectangleIsPlayable = (level, rectangle) => {
  const playable = new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  for (let y = rectangle.y; y < rectangle.y + rectangle.height; y += 1) {
    for (let x = rectangle.x; x < rectangle.x + rectangle.width; x += 1) {
      if (!playable.has(keyOf(x, y))) return false;
    }
  }
  return true;
};

const playableRectangles = (level, minimumArea) => {
  const playable = new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  const rectangles = new Map();
  for (let top = 0; top < level.height; top += 1) {
    let common = Array.from({ length: level.width }, () => true);
    for (let bottom = top; bottom < level.height; bottom += 1) {
      common = common.map((present, x) => present && playable.has(keyOf(x, bottom)));
      let start = -1;
      for (let x = 0; x <= level.width; x += 1) {
        if (x < level.width && common[x]) {
          if (start < 0) start = x;
          continue;
        }
        if (start >= 0) {
          const rectangle = { x: start, y: top, width: x - start, height: bottom - top + 1 };
          if (rectangle.width * rectangle.height >= minimumArea) {
            rectangles.set(`${rectangle.x},${rectangle.y},${rectangle.width},${rectangle.height}`, rectangle);
          }
          start = -1;
        }
      }
    }
  }
  return [...rectangles.values()];
};

const distanceToRectangle = (block, rectangle) => {
  const bounds = shapeBounds(block.shape);
  const maximumX = rectangle.x + rectangle.width - bounds.width;
  const maximumY = rectangle.y + rectangle.height - bounds.height;
  if (maximumX < rectangle.x || maximumY < rectangle.y) return Number.MAX_SAFE_INTEGER;
  const nearestX = Math.max(rectangle.x, Math.min(maximumX, block.x));
  const nearestY = Math.max(rectangle.y, Math.min(maximumY, block.y));
  return Math.abs(block.x - nearestX) + Math.abs(block.y - nearestY);
};

const packBlocksInRectangle = ({ blocks, rectangle, fixedCells }) => {
  const entries = blocks.map((block) => {
    const bounds = shapeBounds(block.shape);
    const candidates = [];
    for (let y = rectangle.y; y <= rectangle.y + rectangle.height - bounds.height; y += 1) {
      for (let x = rectangle.x; x <= rectangle.x + rectangle.width - bounds.width; x += 1) {
        const cells = cellsAt(block, x, y).map(([cellX, cellY]) => keyOf(cellX, cellY));
        if (cells.some((cell) => fixedCells.has(cell))) continue;
        candidates.push({
          x,
          y,
          cells,
          distance: Math.abs(block.x - x) + Math.abs(block.y - y),
        });
      }
    }
    candidates.sort((left, right) => left.distance - right.distance || left.y - right.y || left.x - right.x);
    return { block, candidates };
  }).sort((left, right) => (
    left.candidates.length - right.candidates.length
    || right.block.shape.length - left.block.shape.length
    || left.block.id.localeCompare(right.block.id)
  ));
  if (entries.some((entry) => entry.candidates.length === 0)) return null;

  const occupied = new Set(fixedCells);
  const placements = new Map();
  let explored = 0;
  const visit = (index) => {
    explored += 1;
    if (explored > 250_000) return false;
    if (index === entries.length) return true;
    const { block, candidates } = entries[index];
    for (const candidate of candidates) {
      if (candidate.cells.some((cell) => occupied.has(cell))) continue;
      candidate.cells.forEach((cell) => occupied.add(cell));
      placements.set(block.id, candidate);
      if (visit(index + 1)) return true;
      placements.delete(block.id);
      candidate.cells.forEach((cell) => occupied.delete(cell));
    }
    return false;
  };
  return visit(0) ? placements : null;
};

const ensurePlayableStagedFrameGeometry = ({ level, opening, front, hidden, warnings, label }) => {
  const currentBox = blockBox([...front, ...hidden]);
  if (rectangleIsPlayable(level, currentBox)) return currentBox;

  const frontIds = new Set(front.map((block) => block.id));
  const outsideOpeningCells = new Set(opening
    .filter((block) => !frontIds.has(block.id))
    .flatMap((block) => cellsAt(block).map(([x, y]) => keyOf(x, y))));
  const requiredArea = Math.max(
    front.reduce((sum, block) => sum + block.shape.length, 0),
    hidden.reduce((sum, block) => sum + block.shape.length, 0),
  );
  const rectangles = playableRectangles(level, requiredArea).sort((left, right) => {
    const leftDistance = [...front, ...hidden]
      .reduce((sum, block) => sum + distanceToRectangle(block, left), 0);
    const rightDistance = [...front, ...hidden]
      .reduce((sum, block) => sum + distanceToRectangle(block, right), 0);
    return leftDistance - rightDistance
      || left.width * left.height - right.width * right.height
      || left.y - right.y
      || left.x - right.x;
  });

  for (const rectangle of rectangles) {
    const frontPlacements = packBlocksInRectangle({
      blocks: front,
      rectangle,
      fixedCells: outsideOpeningCells,
    });
    if (!frontPlacements) continue;
    // The front cohort is gone when the hidden layer becomes active, so the two
    // layers may reuse cells. Blocks outside the frame remain active and must be
    // excluded from both layers.
    const hiddenPlacements = packBlocksInRectangle({
      blocks: hidden,
      rectangle,
      fixedCells: outsideOpeningCells,
    });
    if (!hiddenPlacements) continue;
    for (const block of [...front, ...hidden]) {
      const placement = frontPlacements.get(block.id) ?? hiddenPlacements.get(block.id);
      if (!placement) continue;
      block.x = placement.x;
      block.y = placement.y;
    }
    const repairedBox = blockBox([...front, ...hidden]);
    if (!rectangleIsPlayable(level, repairedBox)) continue;
    warnings.push(
      `${label}: repacked front/hidden cohorts inside playable rectangle `
      + `${repairedBox.x},${repairedBox.y} ${repairedBox.width}x${repairedBox.height}`,
    );
    return repairedBox;
  }
  throw new Error(`${label}: no fully playable rectangular frame placement exists`);
};

const findDeviceCell = ({ level, preferred, taken, openingBlocks }) => {
  const openingCells = new Set(openingBlocks.flatMap((block) => cellsAt(block).map(([x, y]) => keyOf(x, y))));
  const candidates = [
    ...(preferred ? [[preferred.x, preferred.y]] : []),
    ...level.playable,
  ];
  return candidates.find(([x, y]) => !taken.has(keyOf(x, y)) && !openingCells.has(keyOf(x, y)))
    ?? candidates.find(([x, y]) => !taken.has(keyOf(x, y)))
    ?? [0, 0];
};

const selectCohort = ({ eligible, histogram, count, ranks, label, warnings }) => pickByHistogram({
  eligible,
  histogram: histogramOrNull(histogram),
  count,
  score: (block) => ranks.last(block.id),
  label,
  warnings,
});

const installStagedDevices = ({ level, target, mechanism, stages, baseShutters, ranks, warnings, meta }) => {
  const opening = stages.find((stage) => stage.partition.kind === "opening")?.blocks ?? [];
  const takenCells = new Set();
  const stagePreferred = (stage) => baseShutters[Math.max(0, stage.index - 1)] ?? null;
  const coverStages = stages.filter((stage) => stage.partition.kind === "countdown_cover");
  const coverCount = mechanism.covers?.count ?? coverStages.length;
  const coverGroups = deviceGroupsFromStages(coverStages, coverCount, ranks, warnings, "covers");
  const coverValues = mechanism.covers?.values ?? coverStages.map((stage) => stage.partition.trigger_value ?? 0);
  coverGroups.forEach((group, index) => {
    const sourceStage = group.stage ?? group.stages?.[0] ?? coverStages[0];
    const preferred = stagePreferred(sourceStage);
    const contractedPosition = sourceStage?.partition?.position;
    if (contractedPosition && (
      !preferred
      || preferred.x !== contractedPosition.x
      || preferred.y !== contractedPosition.y
      || preferred.width !== contractedPosition.width
      || preferred.height !== contractedPosition.height
    )) {
      throw new Error(
        `Lv${level.id}: countdown cover ${sourceStage.partition.id} has authored geometry `
        + `${contractedPosition.x},${contractedPosition.y} ${contractedPosition.width}x${contractedPosition.height}, `
        + "but the source carrier does not match it; materialize/repack the exact spatial cohort instead of emitting a synthetic marker",
      );
    }
    const openingCells = new Set(opening.flatMap((block) => cellsAt(block).map(([x, y]) => keyOf(x, y))));
    const preferredGeometry = preferred ? {
      x: preferred.x,
      y: preferred.y,
      width: preferred.width,
      height: preferred.height,
    } : null;
    const preferredCells = preferredGeometry
      ? Array.from({ length: preferredGeometry.height }, (_row, dy) => (
        Array.from({ length: preferredGeometry.width }, (_column, dx) => (
          keyOf(preferredGeometry.x + dx, preferredGeometry.y + dy)
        ))
      )).flat()
      : [];
    // A fully authored base candidate may use the countdown cover itself as
    // meaningful board geometry. Preserve that entire legal footprint: reducing
    // it to a synthetic 1x1 marker changes collision semantics and can invalidate
    // a proof that was replayed against the base LevelSpec. Legacy/invalid
    // preferences still fall back to the safe free-cell placement below.
    const preservePreferredGeometry = preferredGeometry
      && preferred?.skin === "shutter"
      && rectangleIsPlayable(level, preferredGeometry)
      && preferredCells.every((cell) => !takenCells.has(cell) && !openingCells.has(cell));
    if (preferredGeometry && preferred?.skin === "shutter" && !preservePreferredGeometry) {
      throw new Error(
        `Lv${level.id}: refusing to replace authored shutter ${preferred.id} `
        + `${preferredGeometry.x},${preferredGeometry.y} ${preferredGeometry.width}x${preferredGeometry.height} `
        + "with a synthetic 1x1 marker; repack the opening and hidden cohort instead",
      );
    }
    const geometry = preservePreferredGeometry
      ? preferredGeometry
      : (() => {
        const [x, y] = findDeviceCell({ level, preferred, taken: takenCells, openingBlocks: opening });
        return { x, y, width: 1, height: 1 };
      })();
    for (let y = geometry.y; y < geometry.y + geometry.height; y += 1) {
      for (let x = geometry.x; x < geometry.x + geometry.width; x += 1) takenCells.add(keyOf(x, y));
    }
    const value = Number(group.stage?.partition.trigger_value ?? coverValues[index] ?? 0);
    const id = `vp-${String(level.id).padStart(3, "0")}-cover-${index + 1}`;
    level.shutters.push({ id, ...geometry, count: value, skin: "shutter" });
    for (const block of group.blocks) block.shutterId = id;
    meta.covers.push({
      id,
      value,
      blockIds: group.blocks.map((block) => block.id),
      stageIds: group.stages?.map((stage) => stage.partition.id)
        ?? [group.stage?.partition.id].filter(Boolean),
      sourceBatchKey: group.sourceBatchKey
        ?? group.stages?.map((stage) => stage.partition.id).join("|")
        ?? group.stage?.partition.id
        ?? id,
    });
  });

  const liftStages = stages.filter((stage) => stage.partition.kind === "lift");
  if (mechanism.lifts?.count) {
    const layers = mechanism.lifts.layers ?? [];
    const openingLayer = layers[0] ?? { count: opening.length, histogram: null };
    let previous = selectCohort({
      eligible: opening,
      histogram: openingLayer.histogram,
      count: openingLayer.count ?? opening.length,
      ranks,
      label: "lift layer 1",
      warnings,
    });
    const liftMeta = { id: `vp-${String(level.id).padStart(3, "0")}-lift-1`, layers: [previous.map((block) => block.id)] };
    liftStages.forEach((stage, index) => {
      const contractLayer = layers[index + 1];
      const hidden = selectCohort({
        eligible: stage.blocks,
        histogram: contractLayer?.histogram ?? stage.partition.shape_histogram,
        count: contractLayer?.count ?? stage.blocks.length,
        ranks,
        label: `lift layer ${index + 2}`,
        warnings,
      });
      const box = blockBox([...previous, ...hidden]);
      const id = `${liftMeta.id}-release-${index + 2}`;
      level.shutters.push({
        id,
        ...box,
        count: previous.length,
        skin: "lift",
        triggerBlockIds: previous.map((block) => block.id),
      });
      for (const block of hidden) block.shutterId = id;
      previous = hidden;
      liftMeta.layers.push(hidden.map((block) => block.id));
    });
    meta.lifts.push(liftMeta);
  }

  const frameStages = stages.filter((stage) => stage.partition.kind === "staged_frame");
  if (mechanism.staged_frames?.count) {
    frameStages.forEach((stage, index) => {
      const hidden = stage.blocks;
      const hiddenBox = blockBox(hidden);
      const frontFact = STAGED_FRAME_FRONT_VIDEO_FACTS.get(level.id)?.[index];
      if (!frontFact) {
        warnings.push(`staged frame ${index + 1}: exact front-layer video fact is missing`);
        return;
      }
      const front = pickByHistogram({
        eligible: opening,
        histogram: frontFact.histogram,
        count: frontFact.count,
        score: (block) => stagedFrameFrontScore(block, hiddenBox),
        label: `staged frame ${index + 1} front video cohort`,
        warnings,
      });
      const id = `vp-${String(level.id).padStart(3, "0")}-staged-frame-${index + 1}`;
      const frameBox = ensurePlayableStagedFrameGeometry({
        level,
        opening,
        front,
        hidden,
        warnings,
        label: `staged frame ${index + 1}`,
      });
      level.shutters.push({
        id,
        ...frameBox,
        count: front.length,
        skin: "staged-frame",
        triggerBlockIds: front.map((block) => block.id),
      });
      for (const block of hidden) block.shutterId = id;
      meta.stagedFrames.push({
        id,
        skin: "staged-frame",
        frontBlockIds: front.map((block) => block.id),
        hiddenBlockIds: hidden.map((block) => block.id),
        frontEvidence: frontFact.evidence,
      });
    });
  }
};

const spawnCandidates = ({ level, blocks, preferred, occupiedSpawnCells }) => {
  const playable = new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  const activeCells = new Set(level.blocks
    .filter((block) => !block.shutterId)
    .flatMap((block) => cellsAt(block).map(([x, y]) => keyOf(x, y))));
  const candidates = [];
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const fitsAll = blocks.every((block) => cellsAt(block, x, y).every(([cellX, cellY]) => playable.has(keyOf(cellX, cellY))));
      if (!fitsAll) continue;
      const firstCells = cellsAt(blocks[0], x, y).map(([cellX, cellY]) => keyOf(cellX, cellY));
      const collisions = firstCells.filter((key) => activeCells.has(key) || occupiedSpawnCells.has(key)).length;
      const distance = preferred ? Math.abs(preferred.x - x) + Math.abs(preferred.y - y) : 0;
      candidates.push({ point: [x, y], collisions, distance });
    }
  }
  return candidates.sort((left, right) => left.collisions - right.collisions || left.distance - right.distance);
};

const generatorSideFor = (level, [x, y], index, requiredSide = null) => {
  const options = [
    { side: "top", offset: Math.min(level.width - 1, x), distance: y },
    { side: "bottom", offset: Math.min(level.width - 1, x), distance: level.height - 1 - y },
    { side: "left", offset: Math.min(level.height - 1, y), distance: x },
    { side: "right", offset: Math.min(level.height - 1, y), distance: level.width - 1 - x },
  ].sort((left, right) => left.distance - right.distance || SIDES.indexOf(left.side) - SIDES.indexOf(right.side));
  if (SIDES.includes(requiredSide)) return options.find((option) => option.side === requiredSide);
  return options[index % Math.min(options.length, 2)];
};

const orderGeneratorQueue = ({ blocks, sequence, previewShape, ranks, index, warnings }) => {
  const desired = Array.isArray(sequence) ? sequence.map(runtimeContractShapeId) : null;
  if (desired) {
    const remaining = [...blocks];
    const ordered = [];
    for (const [shapeIndex, shapeId] of desired.entries()) {
      const candidates = remaining
        .filter((block) => shapeIdOf(block.shape) === shapeId)
        .sort((left, right) => ranks.first(left.id) - ranks.first(right.id) || left.id.localeCompare(right.id));
      const block = candidates[0];
      if (!block) {
        warnings.push(`generator ${index + 1}: sequence item ${shapeIndex + 1} needs ${shapeId}`);
        continue;
      }
      ordered.push(block);
      remaining.splice(remaining.indexOf(block), 1);
    }
    if (ordered.length === desired.length && remaining.length === 0) return ordered;
    warnings.push(
      `generator ${index + 1}: exact sequence consumed ${ordered.length}/${desired.length} `
      + `and left ${remaining.length} blocks`,
    );
    return [...ordered, ...remaining];
  }
  const preview = previewShape ? runtimeContractShapeId(previewShape) : null;
  if (preview) {
    const first = blocks
      .filter((block) => shapeIdOf(block.shape) === preview)
      .sort((left, right) => ranks.first(left.id) - ranks.first(right.id) || left.id.localeCompare(right.id))[0];
    if (first) return [first, ...blocks.filter((block) => block !== first)];
    warnings.push(`generator ${index + 1}: preview ${preview} is absent from its queue histogram`);
  }
  return blocks;
};

const installGenerators = ({ level, mechanism, stages, baseShutters, ranks, warnings, meta }) => {
  const generatorSpec = mechanism.generators;
  if (!generatorSpec?.count) return;
  const generatorStages = stages.filter((stage) => ["side_generator", "timed_feeder"].includes(stage.partition.kind));
  const groups = deviceGroupsFromStages(generatorStages, generatorSpec.count, ranks, warnings, "generators");
  const occupiedSpawnCells = new Set();
  groups.forEach((group, index) => {
    const routeOrderedBlocks = [...group.blocks]
      .sort((left, right) => ranks.first(left.id) - ranks.first(right.id) || left.id.localeCompare(right.id));
    const blocks = orderGeneratorQueue({
      blocks: routeOrderedBlocks,
      sequence: generatorSpec.queue_shape_sequences?.[index],
      previewShape: generatorSpec.preview_shapes?.[index],
      ranks,
      index,
      warnings,
    });
    if (!blocks.length) {
      warnings.push(`generator ${index + 1}: empty queue`);
      return;
    }
    const stage = group.stage ?? group.stages?.[0] ?? generatorStages[0];
    const preferred = baseShutters[Math.max(0, (stage?.index ?? 1) - 1)] ?? null;
    const candidate = spawnCandidates({ level, blocks, preferred, occupiedSpawnCells })[0];
    if (!candidate) {
      warnings.push(`generator ${index + 1}: no common spawn fits every queued shape`);
      return;
    }
    const spawn = candidate.point;
    for (const [cellX, cellY] of cellsAt(blocks[0], spawn[0], spawn[1])) occupiedSpawnCells.add(keyOf(cellX, cellY));
    const contractedSideRaw = generatorSpec.queue_sides?.[index] ?? null;
    const contractedSide = typeof contractedSideRaw === "string"
      ? contractedSideRaw.toLowerCase()
      : contractedSideRaw;
    if (contractedSide !== null && !SIDES.includes(contractedSide)) {
      warnings.push(`generator ${index + 1}: invalid contracted queue side ${String(contractedSideRaw)}`);
    }
    const side = generatorSideFor(level, spawn, index, contractedSide);
    const trigger = generatorSpec.trigger === "time" ? "time" : "move";
    const id = `vp-${String(level.id).padStart(3, "0")}-generator-${index + 1}`;
    const generator = {
      id,
      side: side.side,
      offset: side.offset,
      spawn,
      queueBlockIds: blocks.map((block) => block.id),
      trigger,
      ...(trigger === "time" ? { intervalSeconds: 1, initialDelaySeconds: 1 } : {}),
    };
    for (const block of blocks) delete block.shutterId;
    level.generators.push(generator);
    meta.generators.push({ ...generator, stageIds: group.stages?.map((item) => item.partition.id) ?? [stage?.partition.id] });
  });
};

const installPreservedGenerators = ({ level, mechanism, stages, baseGenerators, ranks, warnings, meta }) => {
  const generatorSpec = mechanism.generators;
  const expectedCount = Number(generatorSpec?.count ?? 0);
  if (!expectedCount) {
    if (baseGenerators.length) {
      throw new Error(`${levelLabel(level.id)}: preserved generators exist without a generator contract.`);
    }
    return;
  }
  if (baseGenerators.length !== expectedCount) {
    throw new Error(
      `${levelLabel(level.id)}: preserved generator count ${baseGenerators.length} != contract ${expectedCount}.`,
    );
  }
  const generatorStages = stages.filter((stage) => ["side_generator", "timed_feeder"].includes(stage.partition.kind));
  const groups = deviceGroupsFromStages(generatorStages, expectedCount, ranks, warnings, "preserved generators");
  if (groups.length !== expectedCount) {
    throw new Error(
      `${levelLabel(level.id)}: preserved generator stage-group count ${groups.length} != contract ${expectedCount}.`,
    );
  }
  const playable = new Set(level.playable.map(([x, y]) => keyOf(x, y)));
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  baseGenerators.forEach((sourceGenerator, index) => {
    const generator = deepClone(sourceGenerator);
    if (!generator || typeof generator.id !== "string" || !generator.id) {
      throw new Error(`${levelLabel(level.id)} generator ${index + 1}: preserved id is missing.`);
    }
    if (!SIDES.includes(generator.side)) {
      throw new Error(`${levelLabel(level.id)} generator ${index + 1}: invalid preserved side ${generator.side}.`);
    }
    const maximumOffset = ["top", "bottom"].includes(generator.side)
      ? level.width - 1
      : level.height - 1;
    if (!Number.isInteger(generator.offset) || generator.offset < 0 || generator.offset > maximumOffset) {
      throw new Error(`${levelLabel(level.id)} generator ${index + 1}: preserved offset is out of bounds.`);
    }
    if (!Array.isArray(generator.spawn) || generator.spawn.length !== 2
      || !generator.spawn.every(Number.isInteger)) {
      throw new Error(`${levelLabel(level.id)} generator ${index + 1}: preserved spawn must be two integers.`);
    }
    const expectedTrigger = generatorSpec.trigger === "time" ? "time" : "move";
    if (generator.trigger !== expectedTrigger) {
      throw new Error(
        `${levelLabel(level.id)} generator ${index + 1}: preserved trigger ${generator.trigger} != ${expectedTrigger}.`,
      );
    }
    if (!Array.isArray(generator.queueBlockIds) || !generator.queueBlockIds.length
      || new Set(generator.queueBlockIds).size !== generator.queueBlockIds.length) {
      throw new Error(`${levelLabel(level.id)} generator ${index + 1}: preserved queue is missing or duplicated.`);
    }
    const group = groups[index];
    const expectedIds = new Set(group.blocks.map((block) => block.id));
    if (generator.queueBlockIds.length !== expectedIds.size
      || generator.queueBlockIds.some((id) => !expectedIds.has(id))) {
      throw new Error(
        `${levelLabel(level.id)} generator ${index + 1}: preserved queue ids do not match its contracted stage.`,
      );
    }
    const expectedLength = Number(generatorSpec.queue_lengths?.[index] ?? expectedIds.size);
    if (generator.queueBlockIds.length !== expectedLength) {
      throw new Error(
        `${levelLabel(level.id)} generator ${index + 1}: preserved queue length `
        + `${generator.queueBlockIds.length} != contract ${expectedLength}.`,
      );
    }
    const actualShapeSequence = generator.queueBlockIds.map((id) => {
      const block = blockById.get(id);
      if (!block) throw new Error(`${levelLabel(level.id)} generator ${index + 1}: unknown queue block ${id}.`);
      const fits = cellsAt(block, generator.spawn[0], generator.spawn[1])
        .every(([x, y]) => playable.has(keyOf(x, y)));
      if (!fits) {
        throw new Error(
          `${levelLabel(level.id)} generator ${index + 1}: ${id} does not fit preserved spawn `
          + `${generator.spawn[0]},${generator.spawn[1]}.`,
        );
      }
      return shapeIdOf(block.shape);
    });
    const expectedShapeSequence = (generatorSpec.queue_shape_sequences?.[index] ?? [])
      .map(runtimeContractShapeId);
    if (expectedShapeSequence.length && !sameJson(actualShapeSequence, expectedShapeSequence)) {
      throw new Error(
        `${levelLabel(level.id)} generator ${index + 1}: preserved queue shape sequence `
        + `${actualShapeSequence.join(",")} != contract ${expectedShapeSequence.join(",")}.`,
      );
    }
    const contractedSideRaw = generatorSpec.queue_sides?.[index] ?? null;
    const contractedSide = typeof contractedSideRaw === "string"
      ? contractedSideRaw.toLowerCase()
      : contractedSideRaw;
    if (contractedSide !== null && generator.side !== contractedSide) {
      throw new Error(
        `${levelLabel(level.id)} generator ${index + 1}: preserved side ${generator.side} != contract ${contractedSide}.`,
      );
    }
    if (generator.trigger === "time") {
      if (!(Number.isFinite(generator.intervalSeconds) && generator.intervalSeconds > 0)
        || !(Number.isFinite(generator.initialDelaySeconds) && generator.initialDelaySeconds >= 0)) {
        throw new Error(`${levelLabel(level.id)} generator ${index + 1}: invalid preserved timing fields.`);
      }
    }
    for (const block of group.blocks) delete block.shutterId;
    level.generators.push(generator);
    meta.generators.push({
      ...deepClone(generator),
      stageIds: group.stages?.map((item) => item.partition.id) ?? [group.stage?.partition.id].filter(Boolean),
    });
  });
  warnings.push("generators: preserved explicit fully-assembled descriptors");
};

const compatibleAxesFor = (block, route) => {
  const drags = route.filter((drag) => drag.blockId === block.id);
  // A carrier with no authored route is not evidence for either axis. Treating
  // an untouched block as compatible with both axes used to create exact-looking
  // but non-replayable assignments.
  if (!drags.length) return [];
  let horizontal = true;
  let vertical = true;
  let x = block.x;
  let y = block.y;
  for (const drag of drags) {
    for (const [nextX, nextY] of drag.path ?? []) {
      if (nextY !== y) horizontal = false;
      if (nextX !== x) vertical = false;
      x = nextX;
      y = nextY;
    }
    if (drag.exitSide === "top" || drag.exitSide === "bottom") horizontal = false;
    if (drag.exitSide === "left" || drag.exitSide === "right") vertical = false;
  }
  return [horizontal ? "horizontal" : null, vertical ? "vertical" : null].filter(Boolean);
};

const installAxisBlocks = ({ level, mechanism, stages, route, ranks, warnings, meta }) => {
  const spec = mechanism.axis_blocks;
  if (!spec?.count) return;
  const openingIds = new Set(stages.find((stage) => stage.partition.kind === "opening")?.blocks.map((block) => block.id) ?? []);
  const eligible = level.blocks.filter((block) => (
    spec.hidden_at_opening === true ? !openingIds.has(block.id)
      : spec.hidden_at_opening === false ? openingIds.has(block.id)
        : true
  ));
  const requirements = [];
  if (Array.isArray(spec.items)) {
    for (const item of spec.items) requirements.push({
      axis: item.axis ?? null,
      shapeId: runtimeContractShapeId(item.shape),
      stageId: item.stage_id ?? null,
    });
  } else if (isObject(spec.by_axis_shape)) {
    for (const axis of ["horizontal", "vertical"]) {
      for (const shapeId of expandHistogram(spec.by_axis_shape[axis])) requirements.push({ axis, shapeId });
    }
  } else {
    const shapes = expandHistogram(histogramOrNull(spec.shape_histogram));
    const axes = Array.isArray(spec.axes) ? spec.axes : [];
    for (let index = 0; index < spec.count; index += 1) {
      requirements.push({ shapeId: shapes[index] ?? null, axis: axes[index] ?? null });
    }
  }
  while (requirements.length < spec.count) requirements.push({ axis: null, shapeId: null });
  const selectedRequirements = requirements.slice(0, spec.count)
    .map((requirement, index) => ({ ...requirement, index }));
  const finiteLastRanks = eligible
    .map((block) => ranks.last(block.id))
    .filter(Number.isFinite);
  const maximumLastRank = Math.max(0, ...finiteLastRanks.filter((rank) => rank < Number.MAX_SAFE_INTEGER));
  const incompatiblePenalty = 1_000_000_000;
  const assignments = assignRequirementsGlobally({
    requirements: selectedRequirements,
    candidatesFor: (requirement) => eligible
      .filter((block) => !requirement.shapeId || shapeIdOf(block.shape) === requirement.shapeId)
      .filter((block) => {
        if (!requirement.stageId) return true;
        const stageBlockIds = mechanismStageBlockIds({
          stageId: requirement.stageId,
          stages,
          meta,
        });
        return stageBlockIds?.has(block.id) ?? false;
      })
      .flatMap((block) => {
        const compatible = compatibleAxesFor(block, route);
        const bounds = shapeBounds(block.shape);
        const preferred = bounds.width >= bounds.height ? "horizontal" : "vertical";
        const axis = requirement.axis ?? (compatible.includes(preferred) ? preferred : compatible[0]);
        const fallbackAxis = axis ?? preferred;
        const routeCompatible = compatible.includes(fallbackAxis);
        const lastRank = ranks.last(block.id);
        return [{
          block,
          axis: fallbackAxis,
          compatibleAxes: compatible,
          routeCompatible,
          // Preserve the former late-route preference, but only inside the set
          // of carriers whose complete path and exit respect the required axis.
          // If the base route contains too few compatible carriers, preserve
          // the exact mechanism contract but make that debt explicit rather
          // than hiding it behind an unlabelled fallback.
          cost: (routeCompatible ? 0 : incompatiblePenalty)
            + Math.max(0, maximumLastRank - Math.min(maximumLastRank, lastRank)),
        }];
      }),
  });
  selectedRequirements.forEach((requirement, index) => {
    const assignment = assignments[index];
    if (!assignment) {
      warnings.push(
        `axis block ${requirement.index + 1}: no route-compatible `
        + `${requirement.axis ?? "horizontal/vertical"} ${requirement.shapeId ?? "shape"} carrier`,
      );
      return;
    }
    const { block, axis, compatibleAxes, routeCompatible } = assignment;
    block.movementAxis = axis;
    meta.axisBlocks.push({
      blockId: block.id,
      axis,
      shapeId: shapeIdOf(block.shape),
      stageId: stages.find((stage) => stage.blocks.some((candidate) => candidate.id === block.id))?.partition.id ?? null,
      contractedStageId: requirement.stageId ?? null,
      opening: openingIds.has(block.id),
      routeCompatible,
      compatibleAxes,
    });
    if (!routeCompatible) {
      warnings.push(
        `axis block ${requirement.index + 1}: exact ${axis} ${requirement.shapeId ?? shapeIdOf(block.shape)} `
        + `carrier ${block.id} is incompatible with its complete authored route; P0 route replan required`,
      );
    }
  });
};

const runtimeContractShapeId = (shapeId) => {
  const normalized = String(shapeId ?? "").toUpperCase();
  if (["SQ3", "RECT3X3", "RECT3X2", "RECT2X3"].includes(normalized)) return "RECT2X3";
  return normalized;
};

const mechanismStageBlockIds = ({ stageId, stages, meta }) => {
  if (!stageId) return null;
  const exact = stages.find((stage) => stage.partition.id === stageId);
  if (exact) return new Set(exact.blocks.map((block) => block.id));
  const lift = String(stageId).match(/^lift-layer-(\d+)$/i);
  if (lift) {
    return new Set(meta.lifts[0]?.layers[Number(lift[1]) - 1] ?? []);
  }
  const frame = String(stageId).match(/^staged-frame-(\d+)-(front|hidden)$/i);
  if (frame) {
    const entry = meta.stagedFrames[Number(frame[1]) - 1];
    return new Set(frame[2].toLowerCase() === "front"
      ? entry?.frontBlockIds ?? []
      : entry?.hiddenBlockIds ?? []);
  }
  return new Set();
};

const installNumericIce = ({
  level,
  mechanism,
  stages,
  route,
  carrierHints = [],
  warnings,
  meta,
}) => {
  const spec = mechanism.numeric_ice;
  if (!spec?.count) return;
  const openingIds = new Set(stages.find((stage) => stage.partition.kind === "opening")?.blocks.map((block) => block.id) ?? []);
  const postMeltShellIsExactZero = spec.post_melt_shell !== null
    && spec.post_melt_shell !== undefined
    && spec.post_melt_shell !== "unclear"
    && Number.isFinite(Number(spec.post_melt_shell))
    && Number(spec.post_melt_shell) === 0;
  // An exact zero forbids ice+shell overlap. Exact positive relationships are
  // bound by item ledgers (Lv24/Lv32). A null/unclear relationship must remain
  // unconstrained: excluding shell carriers there can make an otherwise exact
  // source shape/stage ledger impossible (for example Lv66's Lift cohort).
  const eligibleBlocks = postMeltShellIsExactZero
    ? level.blocks.filter((block) => (block.layers?.length ?? 1) <= 1)
    : level.blocks;
  const timeline = routeActionTimeline(route);
  const hasItemLedger = Array.isArray(spec.items) && spec.items.length > 0;
  const requirements = hasItemLedger
    ? spec.items.map((item, index) => ({
      index,
      value: Number(item.value),
      shapeId: runtimeContractShapeId(item.shape),
      stageId: item.stage_id ?? null,
      opening: null,
    }))
    : (() => {
      const values = [...(spec.values ?? [])].map(Number).sort((left, right) => right - left);
      const shapes = expandHistogram(histogramOrNull(spec.shape_histogram));
      while (values.length < spec.count) values.push(values.at(-1) ?? 1);
      while (shapes.length < spec.count) shapes.push(null);
      const exactOpeningCount = Number.isInteger(spec.opening_visible_count)
        ? Math.max(0, Math.min(spec.count, Number(spec.opening_visible_count)))
        : null;
      return Array.from({ length: spec.count }, (_, index) => ({
        index,
        value: values[index],
        shapeId: shapes[index] ? runtimeContractShapeId(shapes[index]) : null,
        stageId: null,
        opening: spec.stage_scope === "hidden_only" ? false
          : exactOpeningCount !== null ? index < exactOpeningCount
            : spec.stage_scope === "opening_and_hidden" && index < 2 ? index === 0
              : null,
      }));
    })();
  // A shell ledger can require only a subset of otherwise identical numeric
  // carriers.  Bind exactly that many numeric requirements per stage/shape,
  // preferring the highest countdowns, instead of forcing every same-shape
  // requirement onto the same small shell cohort (Lv44 has three opening V2
  // numeric blocks but only one opening V2 post-melt shell).
  const numericShellIdsByKey = new Map();
  for (const shell of meta.shells.filter((entry) => entry.requiresNumericIce)) {
    const key = `${shell.stageId ?? ""}|${shell.shapeId ?? ""}`;
    if (!numericShellIdsByKey.has(key)) numericShellIdsByKey.set(key, new Set());
    numericShellIdsByKey.get(key).add(shell.blockId);
  }
  const shellBindingQuotaByKey = new Map(
    [...numericShellIdsByKey].map(([key, blockIds]) => [key, blockIds.size]),
  );
  for (const requirement of [...requirements].sort((left, right) => (
    right.value - left.value || left.index - right.index
  ))) {
    const key = `${requirement.stageId ?? ""}|${requirement.shapeId ?? ""}`;
    const remaining = shellBindingQuotaByKey.get(key) ?? 0;
    requirement.requiresShell = remaining > 0;
    if (remaining > 0) shellBindingQuotaByKey.set(key, remaining - 1);
  }
  const normalizedCarrierHints = (Array.isArray(carrierHints) ? carrierHints : []).map((hint) => ({
    blockId: String(hint.block_id ?? hint.blockId ?? ""),
    value: Number(hint.value),
    shapeId: hint.shape ? runtimeContractShapeId(hint.shape) : null,
    stageId: hint.stage_id ?? hint.stageId ?? null,
    requirementIndex: Number.isInteger(hint.requirement_index)
      ? Number(hint.requirement_index)
      : Number.isInteger(hint.requirementIndex) ? Number(hint.requirementIndex) : null,
  })).filter((hint) => hint.blockId && Number.isFinite(hint.value));
  const reservedHintIds = new Set(normalizedCarrierHints.map((hint) => hint.blockId));
  const hintForRequirement = (requirement) => normalizedCarrierHints.find((hint) => (
    (hint.requirementIndex === null || hint.requirementIndex === requirement.index)
    && hint.value === requirement.value
    && (!hint.shapeId || hint.shapeId === requirement.shapeId)
    && (!hint.stageId || hint.stageId === requirement.stageId)
  )) ?? null;
  const assignments = assignRequirementsGlobally({
    requirements,
    candidatesFor: (requirement) => {
      const stageIds = mechanismStageBlockIds({ stageId: requirement.stageId, stages, meta });
      const requiredShellIds = numericShellIdsByKey.get(
        `${requirement.stageId ?? ""}|${requirement.shapeId ?? ""}`,
      ) ?? new Set();
      const carrierHint = hintForRequirement(requirement);
      return eligibleBlocks.flatMap((block) => {
        if (carrierHint && block.id !== carrierHint.blockId) return [];
        if (!carrierHint && reservedHintIds.has(block.id)) return [];
        if (requirement.shapeId && shapeIdOf(block.shape) !== requirement.shapeId) return [];
        if (stageIds !== null && !stageIds.has(block.id)) return [];
        if (requirement.opening !== null && openingIds.has(block.id) !== requirement.opening) return [];
        if (requirement.requiresShell && !requiredShellIds.has(block.id)) return [];
        if (!requirement.requiresShell && requiredShellIds.has(block.id)) return [];
        const firstTouchIndex = timeline.firstTouchIndex.get(block.id);
        const clearCapacity = timeline.clearLayersBeforeFirstTouch.get(block.id) ?? -1;
        const routeFeasible = Number.isInteger(firstTouchIndex) && requirement.value <= clearCapacity;
        const deficit = Math.max(0, requirement.value - clearCapacity);
        const surplus = Math.max(0, clearCapacity - requirement.value);
        return [{
          block,
          firstTouchIndex: firstTouchIndex ?? null,
          clearCapacity,
          routeFeasible,
          carrierHinted: carrierHint?.blockId === block.id,
          requiredShellBinding: requirement.requiresShell && requiredShellIds.has(block.id),
          // A zero-deficit full matching is always preferred. If the source
          // values make that mathematically impossible, minimize severe early
          // freeze debt (squared deficit) before counting individually feasible
          // items. This keeps a high countdown on the latest viable carrier and
          // avoids the Lv72 regression where value 17 was moved onto the early
          // board-blocking piece merely to make value 10 individually feasible.
          cost: Math.min(900_000_000_000, deficit * deficit * 1_000_000)
            + (routeFeasible ? 0 : 100_000)
            + Math.min(99_999, surplus * 1_000 + Math.max(0, timeline.totalClearLayers - clearCapacity)),
        }];
      });
    },
  });
  requirements.forEach((requirement, index) => {
    const assignment = assignments[index];
    if (!assignment) {
      warnings.push(
        `numeric ice item ${requirement.index + 1}: no ${requirement.shapeId ?? "matching"} carrier `
        + `in ${requirement.stageId ?? spec.stage_scope ?? "any stage"}`,
      );
      return;
    }
    const { block } = assignment;
    block.frozen = requirement.value;
    meta.numericIce.push({
      blockId: block.id,
      value: block.frozen,
      shapeId: shapeIdOf(block.shape),
      stageId: requirement.stageId,
      requiredShellBinding: assignment.requiredShellBinding,
      carrierHinted: assignment.carrierHinted,
      firstRouteTouchIndex: assignment.firstTouchIndex,
      clearLayersBeforeFirstRouteTouch: assignment.clearCapacity,
      routeFeasible: assignment.routeFeasible,
    });
    if (!assignment.routeFeasible) {
      warnings.push(
        `numeric ice item ${requirement.index + 1}: exact value ${requirement.value} on ${block.id} `
        + `has only ${assignment.clearCapacity} clear layers before its first authored-route touch; `
        + "installed explicitly to preserve the source contract, but not claimed route-feasible",
      );
    }
  });
};

const installShells = ({ level, target, mechanism, stages, ranks, carrierHints = [], warnings, meta }) => {
  const spec = mechanism.shells;
  if (!spec?.count) return;
  const palette = [...target.design_palette];
  const normalizedCarrierHints = (Array.isArray(carrierHints) ? carrierHints : []).map((hint) => ({
    blockId: String(hint.block_id ?? hint.blockId ?? ""),
    requirementIndex: Number.isInteger(hint.requirement_index)
      ? Number(hint.requirement_index)
      : Number.isInteger(hint.requirementIndex) ? Number(hint.requirementIndex) : null,
    layers: Array.isArray(hint.layers) ? [...hint.layers] : null,
  })).filter((hint) => hint.blockId);
  const applyShell = ({
    block, extraLayers, stageId = null, requiresNumericIce = false, itemIndex = null, carrierHint = null,
  }) => {
    const extra = Number(extraLayers ?? 1);
    const coreColor = palette.includes(block.color) ? block.color : palette[0];
    const coreIndex = Math.max(0, palette.indexOf(coreColor));
    const outerColor = palette.find((color, index) => (
      color !== coreColor && index >= ((coreIndex + 1 + meta.shells.length) % Math.max(1, palette.length))
    )) ?? palette.find((color) => color !== coreColor);
    const hintedLayers = carrierHint?.layers?.length === 2
      && carrierHint.layers.every((color) => palette.includes(color))
      && carrierHint.layers[0] !== carrierHint.layers[1]
      ? [...carrierHint.layers]
      : null;
    if (!outerColor && !hintedLayers) {
      warnings.push(`shell ${itemIndex === null ? meta.shells.length + 1 : itemIndex + 1}: palette cannot provide distinct outer/core colors`);
      return;
    }
    block.layers = hintedLayers ?? [outerColor, coreColor];
    block.color = block.layers[0];
    meta.shells.push({
      blockId: block.id,
      extraLayers: block.layers.length - 1,
      requestedExtraLayers: extra,
      shapeId: shapeIdOf(block.shape),
      stageId,
      requiresNumericIce: Boolean(requiresNumericIce),
      itemIndex,
      carrierHinted: carrierHint?.blockId === block.id,
    });
    if (extra !== 1) {
      warnings.push(`shell ${itemIndex === null ? meta.shells.length : itemIndex + 1}: runtime supports exactly one extra layer, contract requests ${extra}`);
    }
  };

  if (Array.isArray(spec.items) && spec.items.length) {
    const used = new Set();
    const orderedItems = spec.items.map((item, index) => {
      const shapeId = runtimeContractShapeId(item.shape);
      const stageIds = mechanismStageBlockIds({ stageId: item.stage_id, stages, meta });
      const candidates = level.blocks.filter((block) => (
        shapeIdOf(block.shape) === shapeId && (stageIds === null || stageIds.has(block.id))
      ));
      return { item, index, shapeId, stageIds, candidateCount: candidates.length };
    }).sort((left, right) => (
      left.candidateCount - right.candidateCount || left.index - right.index
    ));
    for (const { item, index, shapeId, stageIds } of orderedItems) {
      if (item.stage_id && stageIds.size === 0) {
        warnings.push(`shell item ${index + 1}: unknown or empty stage ${item.stage_id}`);
      }
      const carrierHint = normalizedCarrierHints.find((hint) => (
        hint.requirementIndex === index || (hint.requirementIndex === null
          && !used.has(hint.blockId)
          && shapeIdOf(level.blocks.find((candidate) => candidate.id === hint.blockId)?.shape ?? []) === shapeId)
      )) ?? null;
      const block = level.blocks
        .filter((candidate) => (
          !used.has(candidate.id)
          && (!carrierHint || candidate.id === carrierHint.blockId)
          && shapeIdOf(candidate.shape) === shapeId
          && (stageIds === null || stageIds.has(candidate.id))
        ))
        .sort((left, right) => ranks.last(right.id) - ranks.last(left.id) || left.id.localeCompare(right.id))[0];
      if (!block) {
        warnings.push(`shell item ${index + 1}: no ${shapeId} carrier in ${item.stage_id ?? "any stage"}`);
        continue;
      }
      used.add(block.id);
      applyShell({
        block,
        extraLayers: item.extra_layers,
        stageId: item.stage_id ?? null,
        requiresNumericIce: item.requires_numeric_ice,
        itemIndex: index,
        carrierHint,
      });
    }
    return;
  }

  const openingIds = openingBlockIds(stages);
  const expectedOpeningCount = spec.opening_visible_count;
  const genericEligible = expectedOpeningCount === spec.count
    ? level.blocks.filter((block) => openingIds.has(block.id))
    : expectedOpeningCount === 0
      ? level.blocks.filter((block) => !openingIds.has(block.id))
      : level.blocks;
  const orderedGenericHints = [...normalizedCarrierHints].sort((left, right) => (
    (left.requirementIndex ?? Number.MAX_SAFE_INTEGER)
      - (right.requirementIndex ?? Number.MAX_SAFE_INTEGER)
    || left.blockId.localeCompare(right.blockId)
  ));
  const hintedSelection = orderedGenericHints.length === spec.count
    ? orderedGenericHints.map((hint) => level.blocks.find((block) => block.id === hint.blockId))
    : [];
  const selected = hintedSelection.length === spec.count && hintedSelection.every(Boolean)
    ? hintedSelection
    : pickByHistogram({
      eligible: genericEligible,
      histogram: spec.shape_histogram,
      count: spec.count,
      score: (block) => ranks.last(block.id),
      label: "shells",
      warnings,
    });
  const extras = spec.extra_layers ?? Array.from({ length: spec.count }, () => 1);
  selected.forEach((block, index) => applyShell({
    block,
    extraLayers: extras[index],
    itemIndex: index,
    carrierHint: orderedGenericHints.find((hint) => hint.blockId === block.id) ?? null,
  }));
};

const installKeyLocks = ({ level, mechanism, stages, route, ranks, warnings, meta }) => {
  const spec = mechanism.key_locks;
  if (!spec || (!spec.key_count && !spec.lock_count)) return;
  const openingIds = new Set(stages.find((stage) => stage.partition.kind === "opening")?.blocks.map((block) => block.id) ?? []);
  const timeline = routeActionTimeline(route);
  const lockShapes = expandHistogram(histogramOrNull(spec.lock_shapes));
  const lockRequirements = [...(spec.lock_requirements ?? [])];
  while (lockRequirements.length < spec.lock_count) lockRequirements.push(1);
  const lockHiddenAtOpening = spec.lock_hidden_at_opening ?? spec.hidden_at_opening ?? null;
  const keyShapes = expandHistogram(histogramOrNull(spec.key_shapes));
  while (keyShapes.length < spec.key_count) keyShapes.push(null);
  const openingCount = Math.max(0, Math.min(spec.key_count, Number(spec.opening_visible_key_count ?? spec.key_count)));
  const lockSlots = Array.from({ length: spec.lock_count }, (_, index) => ({
    index,
    shapeId: lockShapes[index] ?? null,
    requirement: Number(lockRequirements[index] ?? 1),
  }));
  const lockCandidates = lockSlots.map((slot) => level.blocks
    .filter((block) => (
      (!slot.shapeId || shapeIdOf(block.shape) === slot.shapeId)
      && (lockHiddenAtOpening === null
        || openingIds.has(block.id) === !Boolean(lockHiddenAtOpening))
      && timeline.firstTouchIndex.has(block.id)
    ))
    .sort((left, right) => (
      timeline.firstTouchIndex.get(right.id) - timeline.firstTouchIndex.get(left.id)
      || ranks.last(right.id) - ranks.last(left.id)
      || left.id.localeCompare(right.id)
    )));
  const lockSearchOrder = [...lockSlots].sort((left, right) => (
    lockCandidates[left.index].length - lockCandidates[right.index].length
    || right.requirement - left.requirement
    || left.index - right.index
  ));

  const openingMasks = [];
  const buildOpeningMasks = (index, remaining, mask) => {
    if (index === spec.key_count) {
      if (remaining === 0) openingMasks.push([...mask]);
      return;
    }
    if (remaining > 0) {
      mask.push(true);
      buildOpeningMasks(index + 1, remaining - 1, mask);
      mask.pop();
    }
    if (spec.key_count - index - 1 >= remaining) {
      mask.push(false);
      buildOpeningMasks(index + 1, remaining, mask);
      mask.pop();
    }
  };
  buildOpeningMasks(0, openingCount, []);

  const uniquePermutations = (values) => {
    const result = [];
    const counts = new Map();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    const orderedValues = [...counts.keys()].sort((left, right) => left - right);
    const visit = (path) => {
      if (path.length === values.length) {
        result.push([...path]);
        return;
      }
      for (const value of orderedValues) {
        if (!counts.get(value)) continue;
        counts.set(value, counts.get(value) - 1);
        path.push(value);
        visit(path);
        path.pop();
        counts.set(value, counts.get(value) + 1);
      }
    };
    visit([]);
    return result;
  };
  const lockGroupSlots = lockSlots.flatMap((slot) => Array.from({ length: slot.requirement }, () => slot.index));
  const groupAssignments = uniquePermutations(lockGroupSlots);
  let selectedLocks = null;
  let selectedKeyAssignments = null;
  let exploredLockAssignments = 0;
  const lockAssignment = Array(spec.lock_count).fill(null);
  const usedLockIds = new Set();
  const dependencyPenalty = 1_000_000_000;
  const tryKeyAssignment = (allowUnsafe) => {
    const lockIds = new Set(lockAssignment.map((entry) => entry.block.id));
    let best = null;
    for (const openingMask of openingMasks) {
      for (const groups of groupAssignments) {
        const requirements = Array.from({ length: spec.key_count }, (_, index) => ({
          index,
          shapeId: keyShapes[index] ?? null,
          opening: openingMask[index],
          lockIndex: groups[index],
        }));
        const assignments = assignRequirementsGlobally({
          requirements,
          candidatesFor: (requirement) => {
            const lock = lockAssignment[requirement.lockIndex];
            const lockFirstTouchIndex = timeline.firstTouchIndex.get(lock.block.id);
            return level.blocks.flatMap((block) => {
              if (lockIds.has(block.id)) return [];
              if (requirement.shapeId && shapeIdOf(block.shape) !== requirement.shapeId) return [];
              if (openingIds.has(block.id) !== requirement.opening) return [];
              const fullyClearedIndex = timeline.fullyClearedIndex.get(block.id);
              const dependencySafe = Number.isInteger(fullyClearedIndex)
                && fullyClearedIndex < lockFirstTouchIndex;
              if (!allowUnsafe && !dependencySafe) return [];
              return [{
                block,
                fullyClearedIndex: fullyClearedIndex ?? null,
                lockFirstTouchIndex,
                dependencySafe,
                cost: (dependencySafe ? 0 : dependencyPenalty)
                  + Math.max(0, fullyClearedIndex ?? timeline.totalClearLayers + 1) * 1_000
                  + Math.min(999, ranks.first(block.id)),
              }];
            });
          },
        });
        if (!assignments.every(Boolean)) continue;
        const unsafeCount = assignments.filter((assignment) => !assignment.dependencySafe).length;
        const cost = assignments.reduce((sum, assignment) => sum + assignment.cost, 0);
        const candidate = { requirements, assignments, unsafeCount, cost };
        if (!best || unsafeCount < best.unsafeCount || (unsafeCount === best.unsafeCount && cost < best.cost)) {
          best = candidate;
        }
        if (!allowUnsafe && unsafeCount === 0) return best;
      }
    }
    return best;
  };
  const searchLocks = (depth, allowUnsafe) => {
    if (depth === lockSearchOrder.length) {
      exploredLockAssignments += 1;
      const keyAssignment = tryKeyAssignment(allowUnsafe);
      if (!keyAssignment) return false;
      selectedLocks = lockAssignment.map((entry) => entry);
      selectedKeyAssignments = keyAssignment;
      return true;
    }
    const slot = lockSearchOrder[depth];
    for (const block of lockCandidates[slot.index]) {
      if (usedLockIds.has(block.id)) continue;
      lockAssignment[slot.index] = { block, requirement: slot.requirement };
      usedLockIds.add(block.id);
      if (searchLocks(depth + 1, allowUnsafe)) return true;
      usedLockIds.delete(block.id);
      lockAssignment[slot.index] = null;
    }
    return false;
  };
  searchLocks(0, false);

  if (!selectedLocks || !selectedKeyAssignments) {
    const safeAssignmentAttempts = exploredLockAssignments;
    exploredLockAssignments = 0;
    lockAssignment.fill(null);
    usedLockIds.clear();
    searchLocks(0, true);
    if (selectedLocks && selectedKeyAssignments) {
      warnings.push(
        `key-lock: no fully dependency-safe binding across ${safeAssignmentAttempts} lock assignments; `
        + `preserved the exact contract with ${selectedKeyAssignments.unsafeCount} explicit inverted `
        + "carrier(s), P0 route replan required",
      );
    }
  }

  if (!selectedLocks || !selectedKeyAssignments) {
    warnings.push(
      `key-lock: no shape/visibility-exact global binding after ${exploredLockAssignments} fallback lock assignments`,
    );
    return;
  }

  const keyBlocksByLock = selectedLocks.map(() => []);
  selectedKeyAssignments.requirements.forEach((requirement, index) => {
    keyBlocksByLock[requirement.lockIndex].push(selectedKeyAssignments.assignments[index]);
  });
  selectedLocks.forEach(({ block, requirement }, index) => {
    const keyId = `vp-${String(level.id).padStart(3, "0")}-key-group-${index + 1}`;
    const groupKeys = keyBlocksByLock[index].map((assignment) => assignment.block);
    for (const keyBlock of groupKeys) keyBlock.keyId = keyId;
    block.lockedBy = keyId;
    block.lockCount = requirement;
    meta.keyLocks.push({
      keyId,
      keyBlockIds: groupKeys.map((keyBlock) => keyBlock.id),
      lockBlockId: block.id,
      requirement,
      opening: openingIds.has(block.id),
      keyFullyClearedIndices: keyBlocksByLock[index].map((assignment) => assignment.fullyClearedIndex),
      lockFirstRouteTouchIndex: timeline.firstTouchIndex.get(block.id),
      dependencySafe: keyBlocksByLock[index].every((assignment) => assignment.dependencySafe),
    });
    for (const assignment of keyBlocksByLock[index].filter((entry) => !entry.dependencySafe)) {
      warnings.push(
        `key-lock ${index + 1}: key ${assignment.block.id} fully clears at route action `
        + `${assignment.fullyClearedIndex ?? "missing"}, not before locked block ${block.id} first acts at `
        + `${timeline.firstTouchIndex.get(block.id)}; P0 route replan required`,
      );
    }
  });
  meta.keyBlockIds.push(...selectedKeyAssignments.assignments.map((assignment) => assignment.block.id));
};

const clearLegacyMechanics = (level) => {
  const baseShutters = deepClone(level.shutters ?? []);
  for (const block of level.blocks) {
    delete block.layers;
    delete block.frozen;
    delete block.shutterId;
    delete block.movementAxis;
    delete block.keyId;
    delete block.lockedBy;
    delete block.lockCount;
    delete block.star;
  }
  level.shutters = [];
  level.generators = [];
  delete level.elevators;
  delete level.conveyors;
  return baseShutters;
};

const byAxisShapeOf = (axisBlocks) => {
  const result = {};
  for (const { axis, shapeId } of axisBlocks) {
    result[axis] ??= {};
    result[axis][shapeId] = (result[axis][shapeId] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).map(([axis, histogram]) => [axis, orderedHistogram(histogram)]));
};

const addMismatch = (mismatches, path, expected, actual) => {
  if (!sameJson(expected, actual)) mismatches.push({ path, expected, actual });
};

const canonicalNumericIceItems = (items) => (items ?? []).map((item) => ({
  value: Number(item.value),
  shape: runtimeContractShapeId(item.shape),
  stage_id: item.stage_id ?? null,
})).sort((left, right) => (
  String(left.stage_id).localeCompare(String(right.stage_id))
  || String(left.shape).localeCompare(String(right.shape))
  || left.value - right.value
));

const canonicalShellItems = (items) => (items ?? []).map((item) => ({
  shape: runtimeContractShapeId(item.shape ?? item.shapeId),
  stage_id: item.stage_id ?? item.stageId ?? null,
  extra_layers: Number(item.extra_layers ?? item.extraLayers ?? 1),
  requires_numeric_ice: Boolean(item.requires_numeric_ice ?? item.requiresNumericIce),
})).sort((left, right) => (
  String(left.stage_id).localeCompare(String(right.stage_id))
  || String(left.shape).localeCompare(String(right.shape))
  || left.extra_layers - right.extra_layers
  || Number(left.requires_numeric_ice) - Number(right.requires_numeric_ice)
));

const canonicalGeneratorSequences = (sequences) => (sequences ?? []).map((sequence) => (
  Array.isArray(sequence) ? sequence.map(runtimeContractShapeId) : sequence
));

const coverBatchesOf = (coverDevices) => {
  const batches = new Map();
  for (const entry of coverDevices) {
    const key = entry.sourceBatchKey ?? (entry.stageIds?.join("|") || entry.id);
    const batch = batches.get(key) ?? { stageIds: entry.stageIds ?? [], blockIds: [] };
    batch.blockIds.push(...entry.blockIds);
    batches.set(key, batch);
  }
  return [...batches.values()];
};

const auditContract = ({ level, target, mechanism, stages, meta }) => {
  const mismatches = [];
  addMismatch(mismatches, "board.rows", target.board.rows, level.height);
  addMismatch(mismatches, "board.cols", target.board.cols, level.width);
  addMismatch(mismatches, "board.playable_cell_count", target.board.playable_cell_count, level.playable.length);
  addMismatch(mismatches, "board.playable_mask", target.board.playable_mask, maskRows(level));
  addMismatch(mismatches, "time_seconds", target.time_seconds, level.timeSeconds);
  addMismatch(mismatches, "full_level_block_count", target.full_level_block_count, level.blocks.length);
  addMismatch(
    mismatches,
    "full_level_shape_histogram",
    orderedHistogram(target.full_level_shape_histogram),
    histogramOf(level.blocks),
  );
  addMismatch(
    mismatches,
    "full_level_occupied_cell_count",
    target.full_level_occupied_cell_count,
    level.blocks.reduce((sum, block) => sum + block.shape.length, 0),
  );
  addMismatch(
    mismatches,
    "full_level_color_count",
    target.full_level_color_count,
    new Set(allClearLayerColors(level)).size,
  );
  if (target.opening_color_count !== undefined && target.opening_color_count !== null) {
    addMismatch(
      mismatches,
      "opening_color_count",
      target.opening_color_count,
      new Set(openingVisibleColors(level, stages, meta.openingHiddenColorCarrierIds)).size,
    );
  }
  const openingIdsForColorAudit = openingBlockIds(stages);
  addMismatch(
    mismatches,
    "opening_numeric_ice_color_carriers",
    meta.numericIce
      .filter((entry) => openingIdsForColorAudit.has(entry.blockId)
        && meta.openingHiddenColorCarrierIds.includes(entry.blockId))
      .map((entry) => entry.blockId)
      .sort(),
    [...meta.openingHiddenColorCarrierIds].sort(),
  );
  addMismatch(
    mismatches,
    "shell_layers_outer_core_distinct",
    true,
    meta.shells.every((entry) => {
      const block = level.blocks.find((candidate) => candidate.id === entry.blockId);
      return Boolean(block && shellLayersAreDistinct(block));
    }),
  );
  const sq3Count = level.blocks.filter((block) => shapeIdOf(block.shape) === "SQ3").length;
  addMismatch(mismatches, "runtime_source_sq3_count", 0, sq3Count);

  const stageActual = stages.map((stage) => ({
    id: stage.partition.id,
    kind: stage.partition.kind,
    count: stage.blocks.length,
    shape_histogram: histogramOf(stage.blocks),
  }));
  const stageExpected = (target.stage_partitions ?? []).map((stage) => ({
    id: stage.id,
    kind: stage.kind,
    count: stage.count,
    shape_histogram: orderedHistogram(stage.shape_histogram),
  }));
  addMismatch(mismatches, "stage_partitions", stageExpected, stageActual);

  const ownFrozen = (gate) => Object.hasOwn(gate, "frozen");
  const ordinaryGates = level.gates.filter((gate) => !gate.star && !ownFrozen(gate));
  const frozenGates = level.gates.filter((gate) => !gate.star && ownFrozen(gate));
  const starGates = level.gates.filter((gate) => gate.star);
  const starFrozenGates = starGates.filter(ownFrozen);
  const exits = mechanism.directional_exits ?? {};
  addMismatch(mismatches, "mechanism.directional_exits.ordinary_count", exits.ordinary_count ?? 0, ordinaryGates.length);
  addMismatch(
    mismatches,
    "mechanism.directional_exits.frozen_values",
    sortedNumbers(exits.frozen_values ?? []),
    sortedNumbers(frozenGates.map((gate) => gate.frozen)),
  );
  addMismatch(mismatches, "mechanism.directional_exits.star_count", exits.star_count ?? 0, starGates.length);
  addMismatch(mismatches, "mechanism.directional_exits.star_frozen_count", exits.star_frozen_count ?? 0, starFrozenGates.length);
  addMismatch(
    mismatches,
    "mechanism.directional_exits.star_frozen_values",
    sortedNumbers(exits.star_frozen_values ?? []),
    sortedNumbers(starFrozenGates.map((gate) => gate.frozen)),
  );
  const clearLayerColorSet = [...new Set(allClearLayerColors(level))].sort();
  const gateColorSet = [...new Set(level.gates.map((gate) => gate.color))].sort();
  addMismatch(
    mismatches,
    "mechanism.directional_exits.clear_layer_color_coverage",
    clearLayerColorSet,
    clearLayerColorSet.filter((color) => gateColorSet.includes(color)),
  );
  const starLayerColorSet = [...new Set(meta.starBlockIds.flatMap((id) => {
    const block = level.blocks.find((candidate) => candidate.id === id);
    return block ? clearLayerColorsOf(block) : [];
  }))].sort();
  const starGateColorSet = [...new Set(starGates.map((gate) => gate.color))].sort();
  addMismatch(
    mismatches,
    "mechanism.directional_exits.star_layer_color_coverage",
    starLayerColorSet,
    starLayerColorSet.filter((color) => starGateColorSet.includes(color)),
  );
  const expectedStarGateMapping = normalizeStarGateMapping(exits.star_mapping, target.design_palette);
  const compactGateMapping = (entries) => entries.map((entry) => ({
    color: entry.color,
    star: Boolean(entry.star),
    side: entry.side,
    frozen: entry.frozen ?? null,
  })).sort((left, right) => (
    Number(left.star) - Number(right.star)
    || (left.frozen ?? -1) - (right.frozen ?? -1)
    || String(left.side).localeCompare(String(right.side))
    || String(left.color).localeCompare(String(right.color))
  ));
  if (expectedStarGateMapping.length) {
    addMismatch(
      mismatches,
      "mechanism.directional_exits.star_mapping",
      compactGateMapping(expectedStarGateMapping),
      compactGateMapping(level.gates),
    );
  }

  const numeric = mechanism.numeric_ice;
  if (numeric) {
    addMismatch(mismatches, "mechanism.numeric_ice.count", numeric.count, meta.numericIce.length);
    addMismatch(
      mismatches,
      "mechanism.numeric_ice.values",
      sortedNumbers(numeric.values ?? []),
      sortedNumbers(meta.numericIce.map((entry) => entry.value)),
    );
    if (histogramOrNull(numeric.shape_histogram)) {
      addMismatch(
        mismatches,
        "mechanism.numeric_ice.shape_histogram",
        orderedHistogram(numeric.shape_histogram),
        orderedHistogram(meta.numericIce.reduce((histogram, entry) => {
          histogram[entry.shapeId] = (histogram[entry.shapeId] ?? 0) + 1;
          return histogram;
        }, {})),
      );
    }
    if (Array.isArray(numeric.items)) {
      addMismatch(
        mismatches,
        "mechanism.numeric_ice.items",
        canonicalNumericIceItems(numeric.items),
        canonicalNumericIceItems(meta.numericIce.map((entry) => ({
          value: entry.value,
          shape: entry.shapeId,
          stage_id: entry.stageId ?? null,
        }))),
      );
      addMismatch(
        mismatches,
        "mechanism.numeric_ice.item_stage_membership",
        Array.from({ length: numeric.items.length }, () => true),
        meta.numericIce.map((entry) => {
          const allowed = mechanismStageBlockIds({ stageId: entry.stageId, stages, meta });
          return allowed === null || allowed.has(entry.blockId);
        }),
      );
    }
    const openingIds = new Set(stages
      .filter((stage) => stage.partition.kind === "opening")
      .flatMap((stage) => stage.blocks.map((block) => block.id)));
    const numericOpeningCount = meta.numericIce.filter((entry) => openingIds.has(entry.blockId)).length;
    if (numeric.stage_scope === "hidden_only") {
      addMismatch(mismatches, "mechanism.numeric_ice.opening_count", 0, numericOpeningCount);
    } else if (numeric.stage_scope === "opening_and_hidden" && numeric.count > 1) {
      addMismatch(
        mismatches,
        "mechanism.numeric_ice.opening_and_hidden",
        true,
        numericOpeningCount > 0 && numericOpeningCount < meta.numericIce.length,
      );
    }
    if (numeric.post_melt_shell !== null
      && numeric.post_melt_shell !== undefined
      && numeric.post_melt_shell !== "unclear"
      && Number.isFinite(Number(numeric.post_melt_shell))) {
      const numericIds = new Set(meta.numericIce.map((entry) => entry.blockId));
      addMismatch(
        mismatches,
        "mechanism.numeric_ice.post_melt_shell",
        Number(numeric.post_melt_shell),
        level.blocks.filter((block) => numericIds.has(block.id) && (block.layers?.length ?? 1) > 1).length,
      );
    }
  } else addMismatch(mismatches, "mechanism.numeric_ice.unexpected", 0, meta.numericIce.length);

  const shells = mechanism.shells;
  if (shells) {
    addMismatch(mismatches, "mechanism.shells.count", shells.count, meta.shells.length);
    addMismatch(
      mismatches,
      "mechanism.shells.extra_layers",
      sortedNumbers(shells.extra_layers ?? []),
      sortedNumbers(meta.shells.map((entry) => entry.extraLayers)),
    );
    if (shells.opening_visible_count !== null && shells.opening_visible_count !== undefined) {
      const openingIds = openingBlockIds(stages);
      addMismatch(
        mismatches,
        "mechanism.shells.opening_visible_count",
        Number(shells.opening_visible_count),
        meta.shells.filter((entry) => openingIds.has(entry.blockId)).length,
      );
    }
    if (histogramOrNull(shells.shape_histogram)) {
      addMismatch(
        mismatches,
        "mechanism.shells.shape_histogram",
        orderedHistogram(shells.shape_histogram),
        orderedHistogram(meta.shells.reduce((histogram, entry) => {
          histogram[entry.shapeId] = (histogram[entry.shapeId] ?? 0) + 1;
          return histogram;
        }, {})),
      );
    }
    if (Array.isArray(shells.items)) {
      addMismatch(
        mismatches,
        "mechanism.shells.items",
        canonicalShellItems(shells.items),
        canonicalShellItems(meta.shells),
      );
      addMismatch(
        mismatches,
        "mechanism.shells.item_stage_membership",
        Array.from({ length: shells.items.length }, () => true),
        meta.shells.map((entry) => {
          const allowed = mechanismStageBlockIds({ stageId: entry.stageId, stages, meta });
          return allowed === null || allowed.has(entry.blockId);
        }),
      );
      const numericIds = new Set(meta.numericIce.map((entry) => entry.blockId));
      const requiredBindings = meta.shells.filter((entry) => entry.requiresNumericIce);
      addMismatch(
        mismatches,
        "mechanism.shells.required_numeric_ice_binding",
        Array.from({ length: requiredBindings.length }, () => true),
        requiredBindings.map((entry) => numericIds.has(entry.blockId)),
      );
    }
  } else addMismatch(mismatches, "mechanism.shells.unexpected", 0, meta.shells.length);

  const covers = mechanism.covers;
  if (covers) {
    // A video can prove one simultaneous hidden reveal without exposing which
    // of several equal-count covers owned each block (Lv49 is the canonical
    // case). Keep the runtime devices distinct, but compare the evidence-level
    // batches after recombining devices that came from the same stage seed.
    const coverBatches = coverBatchesOf(meta.covers);
    addMismatch(mismatches, "mechanism.covers.count", covers.count, meta.covers.length);
    addMismatch(
      mismatches,
      "mechanism.covers.values",
      (covers.values ?? []).map(Number),
      meta.covers.map((entry) => entry.value),
    );
    addMismatch(
      mismatches,
      "mechanism.covers.hidden_total",
      (covers.hidden_batch_counts ?? []).reduce((sum, count) => sum + count, 0),
      coverBatches.reduce((sum, entry) => sum + entry.blockIds.length, 0),
    );
    addMismatch(
      mismatches,
      "mechanism.covers.hidden_batch_counts",
      covers.hidden_batch_counts ?? [],
      coverBatches.map((entry) => entry.blockIds.length),
    );
    addMismatch(
      mismatches,
      "mechanism.covers.hidden_batch_histograms",
      (covers.hidden_batch_histograms ?? []).map(orderedHistogram),
      coverBatches.map((entry) => histogramOf(entry.blockIds
        .map((id) => level.blocks.find((block) => block.id === id)).filter(Boolean))),
    );
  } else addMismatch(mismatches, "mechanism.covers.unexpected", 0, meta.covers.length);

  const generators = mechanism.generators;
  if (generators) {
    const actualLengths = meta.generators.map((generator) => generator.queueBlockIds.length);
    addMismatch(mismatches, "mechanism.generators.count", generators.count, meta.generators.length);
    addMismatch(
      mismatches,
      "mechanism.generators.trigger",
      Array.from({ length: generators.count }, () => generators.trigger).sort(),
      meta.generators.map((generator) => generator.trigger).sort(),
    );
    const expectedLengths = generators.queue_lengths ?? [];
    if (expectedLengths.length === generators.count) {
      addMismatch(mismatches, "mechanism.generators.queue_lengths", expectedLengths, actualLengths);
    } else {
      addMismatch(
        mismatches,
        "mechanism.generators.combined_queue_count",
        expectedLengths.reduce((sum, count) => sum + count, 0),
        actualLengths.reduce((sum, count) => sum + count, 0),
      );
    }
    addMismatch(
      mismatches,
      "mechanism.generators.queue_histograms",
      (generators.queue_histograms ?? []).map(orderedHistogram),
      meta.generators.map((generator) => histogramOf(generator.queueBlockIds
        .map((id) => level.blocks.find((block) => block.id === id)).filter(Boolean))),
    );
    if (Array.isArray(generators.queue_shape_sequences)) {
      addMismatch(
        mismatches,
        "mechanism.generators.queue_shape_sequences",
        canonicalGeneratorSequences(generators.queue_shape_sequences),
        canonicalGeneratorSequences(meta.generators.map((generator) => generator.queueBlockIds
          .map((id) => level.blocks.find((block) => block.id === id))
          .filter(Boolean)
          .map((block) => shapeIdOf(block.shape)))),
      );
    }
    if (Array.isArray(generators.queue_sides)) {
      const providedSides = generators.queue_sides
        .map((side, index) => ({ index, side: typeof side === "string" ? side.toLowerCase() : side }))
        .filter((entry) => entry.side !== null && entry.side !== undefined);
      addMismatch(
        mismatches,
        "mechanism.generators.queue_sides",
        providedSides,
        providedSides.map(({ index }) => ({ index, side: meta.generators[index]?.side ?? null })),
      );
    }
    if (Array.isArray(generators.preview_shapes)) {
      const expectedPreviews = generators.preview_shapes.map((shape) => (
        shape === null || shape === undefined ? null : runtimeContractShapeId(shape)
      ));
      const actualPreviews = meta.generators.map((generator) => {
        const block = level.blocks.find((candidate) => candidate.id === generator.queueBlockIds[0]);
        return block ? shapeIdOf(block.shape) : null;
      });
      addMismatch(
        mismatches,
        "mechanism.generators.preview_shapes",
        expectedPreviews,
        actualPreviews,
      );
    }
    if (generators.trigger === "time") {
      addMismatch(
        mismatches,
        "mechanism.generators.timed_interval_seconds",
        Array.from({ length: generators.count }, () => 1),
        meta.generators.map((generator) => generator.intervalSeconds),
      );
    }
  } else addMismatch(mismatches, "mechanism.generators.unexpected", 0, meta.generators.length);

  const lifts = mechanism.lifts;
  if (lifts) {
    addMismatch(mismatches, "mechanism.lifts.count", lifts.count, meta.lifts.length);
    const actualLayers = meta.lifts[0]?.layers.map((ids) => ({
      count: ids.length,
      histogram: histogramOf(ids.map((id) => level.blocks.find((block) => block.id === id)).filter(Boolean)),
    })) ?? [];
    const expectedLayers = (lifts.layers ?? []).map((layer) => ({
      count: layer.count,
      histogram: orderedHistogram(layer.histogram),
    }));
    addMismatch(mismatches, "mechanism.lifts.layers", expectedLayers, actualLayers);
  } else addMismatch(mismatches, "mechanism.lifts.unexpected", 0, meta.lifts.length);

  const stagedFrames = mechanism.staged_frames;
  if (stagedFrames) {
    addMismatch(mismatches, "mechanism.staged_frames.count", stagedFrames.count, meta.stagedFrames.length);
    const expectedFrontLayers = (STAGED_FRAME_FRONT_VIDEO_FACTS.get(level.id) ?? []).map((fact) => ({
      count: fact.count,
      histogram: orderedHistogram(fact.histogram),
    }));
    addMismatch(
      mismatches,
      "mechanism.staged_frames.identity",
      Array.from({ length: stagedFrames.count }, () => "staged-frame"),
      meta.stagedFrames.map((frame) => frame.skin),
    );
    addMismatch(
      mismatches,
      "mechanism.staged_frames.front_layers_video_fact",
      expectedFrontLayers,
      meta.stagedFrames.map((frame) => ({
        count: frame.frontBlockIds.length,
        histogram: histogramOf(frame.frontBlockIds
          .map((id) => level.blocks.find((block) => block.id === id)).filter(Boolean)),
      })),
    );
    const expectedHidden = (stagedFrames.layers ?? []).slice(1).reduce((sum, layer) => sum + Number(layer.count ?? 0), 0);
    const actualHidden = meta.stagedFrames.reduce((sum, frame) => sum + frame.hiddenBlockIds.length, 0);
    addMismatch(mismatches, "mechanism.staged_frames.hidden_count", expectedHidden, actualHidden);
    addMismatch(
      mismatches,
      "mechanism.staged_frames.hidden_layers",
      (stagedFrames.layers ?? []).slice(1).map((layer) => ({
        count: layer.count,
        histogram: orderedHistogram(layer.histogram),
      })),
      meta.stagedFrames.map((frame) => ({
        count: frame.hiddenBlockIds.length,
        histogram: histogramOf(frame.hiddenBlockIds
          .map((id) => level.blocks.find((block) => block.id === id)).filter(Boolean)),
      })),
    );
  } else addMismatch(mismatches, "mechanism.staged_frames.unexpected", 0, meta.stagedFrames.length);

  const axes = mechanism.axis_blocks;
  if (axes) {
    addMismatch(mismatches, "mechanism.axis_blocks.count", axes.count, meta.axisBlocks.length);
    if (histogramOrNull(axes.shape_histogram)) {
      addMismatch(
        mismatches,
        "mechanism.axis_blocks.shape_histogram",
        orderedHistogram(axes.shape_histogram),
        orderedHistogram(meta.axisBlocks.reduce((histogram, entry) => {
          histogram[entry.shapeId] = (histogram[entry.shapeId] ?? 0) + 1;
          return histogram;
        }, {})),
      );
    }
    if (isObject(axes.by_axis_shape)) {
      addMismatch(mismatches, "mechanism.axis_blocks.by_axis_shape", axes.by_axis_shape, byAxisShapeOf(meta.axisBlocks));
    }
    if (Array.isArray(axes.axes)) {
      addMismatch(
        mismatches,
        "mechanism.axis_blocks.axes",
        [...axes.axes].sort(),
        meta.axisBlocks.map((entry) => entry.axis).sort(),
      );
    }
    if (Array.isArray(axes.items)) {
      const normalizeItem = (item) => ({
        shape: runtimeContractShapeId(item.shape ?? item.shapeId),
        axis: item.axis,
        stage_id: Object.prototype.hasOwnProperty.call(item, "contractedStageId")
          ? item.contractedStageId
          : item.stage_id ?? item.stageId ?? null,
      });
      const compareItems = (left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right));
      addMismatch(
        mismatches,
        "mechanism.axis_blocks.items",
        axes.items.map(normalizeItem).sort(compareItems),
        meta.axisBlocks.map(normalizeItem).sort(compareItems),
      );
    }
    if (axes.hidden_at_opening !== null && axes.hidden_at_opening !== undefined) {
      addMismatch(
        mismatches,
        "mechanism.axis_blocks.opening_count",
        axes.hidden_at_opening ? 0 : axes.count,
        meta.axisBlocks.filter((entry) => entry.opening).length,
      );
    }
  } else addMismatch(mismatches, "mechanism.axis_blocks.unexpected", 0, meta.axisBlocks.length);

  const keyLocks = mechanism.key_locks;
  if (keyLocks) {
    const keyBlocks = meta.keyBlockIds.map((id) => level.blocks.find((block) => block.id === id)).filter(Boolean);
    const lockBlocks = meta.keyLocks.map((entry) => level.blocks.find((block) => block.id === entry.lockBlockId)).filter(Boolean);
    const openingIds = new Set(stages.find((stage) => stage.partition.kind === "opening")?.blocks.map((block) => block.id) ?? []);
    addMismatch(mismatches, "mechanism.key_locks.key_count", keyLocks.key_count, keyBlocks.length);
    addMismatch(mismatches, "mechanism.key_locks.lock_count", keyLocks.lock_count, lockBlocks.length);
    addMismatch(
      mismatches,
      "mechanism.key_locks.lock_requirements",
      sortedNumbers(keyLocks.lock_requirements ?? []),
      sortedNumbers(meta.keyLocks.map((entry) => entry.requirement)),
    );
    addMismatch(
      mismatches,
      "mechanism.key_locks.opening_visible_key_count",
      keyLocks.opening_visible_key_count,
      keyBlocks.filter((block) => openingIds.has(block.id)).length,
    );
    const lockHiddenAtOpening = keyLocks.lock_hidden_at_opening ?? keyLocks.hidden_at_opening ?? null;
    if (lockHiddenAtOpening !== null) {
      addMismatch(
        mismatches,
        "mechanism.key_locks.lock_opening_count",
        lockHiddenAtOpening ? 0 : Number(keyLocks.lock_count),
        meta.keyLocks.filter((entry) => entry.opening).length,
      );
    }
    if (histogramOrNull(keyLocks.key_shapes)) {
      addMismatch(mismatches, "mechanism.key_locks.key_shapes", orderedHistogram(keyLocks.key_shapes), histogramOf(keyBlocks));
    }
    if (histogramOrNull(keyLocks.lock_shapes)) {
      addMismatch(mismatches, "mechanism.key_locks.lock_shapes", orderedHistogram(keyLocks.lock_shapes), histogramOf(lockBlocks));
    }
  } else {
    addMismatch(mismatches, "mechanism.key_locks.unexpected_keys", 0, meta.keyBlockIds.length);
    addMismatch(mismatches, "mechanism.key_locks.unexpected_locks", 0, meta.keyLocks.length);
  }

  const irregular = mechanism.irregular_blocks;
  if (irregular) {
    const rectangularShapeIds = new Set([
      "SINGLE", "H2", "V2", "H3", "V3", "H4", "V4", "SQ2", "RECT2X3", "SQ3",
    ]);
    addMismatch(
      mismatches,
      "mechanism.irregular_blocks.count",
      irregular.count,
      level.blocks.filter((block) => !rectangularShapeIds.has(shapeIdOf(block.shape))).length,
    );
  }

  const stars = mechanism.stars;
  if (stars) {
    const blocks = meta.starBlockIds.map((id) => level.blocks.find((block) => block.id === id)).filter(Boolean);
    addMismatch(mismatches, "mechanism.stars.count", stars.count, blocks.length);
    if (expectedStarGateMapping.length) {
      addMismatch(
        mismatches,
        "mechanism.stars.mapped_colors",
        [...new Set(expectedStarGateMapping.filter((entry) => entry.star).map((entry) => entry.color))].sort(),
        [...new Set(blocks.flatMap(clearLayerColorsOf))].sort(),
      );
    }
    if (histogramOrNull(stars.shape_histogram)) {
      addMismatch(mismatches, "mechanism.stars.shape_histogram", orderedHistogram(stars.shape_histogram), histogramOf(blocks));
      const starShapeIds = new Set(Object.keys(stars.shape_histogram));
      addMismatch(
        mismatches,
        "mechanism.stars.plain_same_shape_count",
        stars.plain_same_shape_count,
        level.blocks.filter((block) => !block.star && starShapeIds.has(shapeIdOf(block.shape))).length,
      );
    }
  } else addMismatch(mismatches, "mechanism.stars.unexpected", 0, meta.starBlockIds.length);

  return {
    exact: mismatches.length === 0,
    mismatches,
    actual: {
      colors: {
        full_logical_count: new Set(allClearLayerColors(level)).size,
        full_clear_layer_colors: [...new Set(allClearLayerColors(level))].sort(),
        opening_visible_count: new Set(openingVisibleColors(
          level,
          stages,
          meta.openingHiddenColorCarrierIds,
        )).size,
        opening_visible_colors: [...new Set(openingVisibleColors(
          level,
          stages,
          meta.openingHiddenColorCarrierIds,
        ))].sort(),
        opening_hidden_color_carrier_ids: meta.openingHiddenColorCarrierIds,
        opening_visibility_rule: meta.colorAllocation?.openingVisibilityRule
          ?? "opening-stage colors minus only source/base-audited concealed carriers",
      },
      gates: {
        ordinary_count: ordinaryGates.length,
        frozen_values: frozenGates.map((gate) => gate.frozen),
        star_count: starGates.length,
        star_frozen_values: starFrozenGates.map((gate) => gate.frozen),
        clear_layer_color_coverage: [...new Set(level.gates.map((gate) => gate.color))].sort(),
        ...(expectedStarGateMapping.length ? { star_mapping: compactGateMapping(level.gates) } : {}),
      },
      numeric_ice: meta.numericIce,
      shells: meta.shells.map((entry) => ({
        ...entry,
        layers: clearLayerColorsOf(level.blocks.find((block) => block.id === entry.blockId) ?? {}),
      })),
      covers: meta.covers,
      cover_release_batches: coverBatchesOf(meta.covers).map((batch) => ({
        stage_ids: batch.stageIds,
        count: batch.blockIds.length,
        shape_histogram: histogramOf(batch.blockIds
          .map((id) => level.blocks.find((block) => block.id === id)).filter(Boolean)),
      })),
      generators: meta.generators.map((generator) => ({
        id: generator.id,
        side: generator.side,
        offset: generator.offset,
        trigger: generator.trigger,
        queue_length: generator.queueBlockIds.length,
        preview_shape: (() => {
          const block = level.blocks.find((candidate) => candidate.id === generator.queueBlockIds[0]);
          return block ? shapeIdOf(block.shape) : null;
        })(),
        queue_shape_sequence: generator.queueBlockIds
          .map((id) => level.blocks.find((block) => block.id === id))
          .filter(Boolean)
          .map((block) => shapeIdOf(block.shape)),
        queue_histogram: histogramOf(generator.queueBlockIds
          .map((id) => level.blocks.find((block) => block.id === id)).filter(Boolean)),
      })),
      lifts: meta.lifts,
      staged_frames: meta.stagedFrames,
      axis_blocks: meta.axisBlocks,
      key_locks: meta.keyLocks,
      stars: meta.starBlockIds,
    },
  };
};

const targetDifficulty = (target) => {
  const score = target.target_d1_difficulty?.calibrated_score ?? 0;
  return score >= 80 ? "super" : score >= 70 ? "hard" : "normal";
};

const assembleLevel = (contractEntry) => {
  const id = Number(String(contractEntry.level_id).replace(/^Lv/i, ""));
  const baseEntry = baseById.get(id);
  if (!baseEntry?.level) throw new Error(`${levelLabel(id)}: base candidate is missing`);
  const target = contractEntry.our_design_target;
  const mechanism = target.mechanism_contract ?? {};
  const level = deepClone(baseEntry.level);
  const authoredStarBlockIds = new Set(
    level.blocks.filter((block) => block.star === true).map((block) => block.id),
  );
  const baseRoute = deepClone(routeById.get(id) ?? baseEntry.route ?? []);
  const ranks = routeRanks(baseRoute);
  const warnings = [];
  const meta = {
    covers: [], generators: [], lifts: [], stagedFrames: [], numericIce: [], shells: [],
    axisBlocks: [], keyLocks: [], keyBlockIds: [], starBlockIds: [],
    openingHiddenColorCarrierIds: [],
    expectedOpeningHiddenColorCarrierCount:
      baseEntry.validation?.opening_hidden_color_carrier_ids?.length ?? 0,
  };

  const baseShutters = deepClone(level.shutters ?? []);
  const baseGenerators = deepClone(level.generators ?? []);
  const stages = stageGroupsFromBase({ level, target, warnings });
  clearLegacyMechanics(level);
  delete level.parMoves;
  level.width = target.board.cols;
  level.height = target.board.rows;
  level.playable = maskPoints(target.board.playable_mask);
  level.timeSeconds = target.time_seconds;
  level.difficulty = targetDifficulty(target);
  level.designTargets = {
    formulaVersion: "blockout-d1",
    calibratedDifficulty: target.target_d1_difficulty?.calibrated_score ?? 0,
    minimumRepositionOverhead: target.campaign_reposition_floor ?? null,
  };

  installStagedDevices({ level, target, mechanism, stages, baseShutters, ranks, warnings, meta });
  if (baseEntry.preserveGeneratorDescriptors === true) {
    if (baseEntry.routeSemantics !== "fully_assembled_runtime") {
      throw new Error(
        `${levelLabel(id)}: preserve_generator_descriptors requires route_semantics=fully_assembled_runtime.`,
      );
    }
    installPreservedGenerators({
      level,
      mechanism,
      stages,
      baseGenerators,
      ranks,
      warnings,
      meta,
    });
  } else {
    installGenerators({ level, mechanism, stages, baseShutters, ranks, warnings, meta });
  }
  installShells({
    level,
    target,
    mechanism,
    stages,
    ranks,
    carrierHints: baseEntry.carrierAssignments?.shells,
    warnings,
    meta,
  });
  // Shells add a second clear action for their carrier. All mechanism-carrier
  // timing decisions must therefore use this adapted route, never the raw
  // geometry witness.
  const adaptedBaseRoute = baseEntry.routeSemantics === "fully_assembled_runtime"
    ? baseRoute
    : adaptBaseRouteForShells(baseRoute, level);
  installNumericIce({
    level,
    mechanism,
    stages,
    route: adaptedBaseRoute,
    carrierHints: baseEntry.carrierAssignments?.numeric_ice,
    warnings,
    meta,
  });
  if (meta.expectedOpeningHiddenColorCarrierCount > 0) {
    const openingIds = openingBlockIds(stages);
    const openingNumericIceIds = meta.numericIce
      .filter((entry) => openingIds.has(entry.blockId))
      .map((entry) => entry.blockId);
    if (openingNumericIceIds.length !== meta.expectedOpeningHiddenColorCarrierCount) {
      warnings.push(
        `opening concealed numeric carriers: base audit expected `
        + `${meta.expectedOpeningHiddenColorCarrierCount}, installed ${openingNumericIceIds.length}`,
      );
    }
    meta.openingHiddenColorCarrierIds = openingNumericIceIds
      .slice(0, meta.expectedOpeningHiddenColorCarrierCount);
  }
  installAxisBlocks({ level, mechanism, stages, route: adaptedBaseRoute, ranks, warnings, meta });
  installKeyLocks({ level, mechanism, stages, route: adaptedBaseRoute, ranks, warnings, meta });
  normalizeExactColorCounts({ level, target, stages, warnings, meta });

  if (baseEntry.preserveStarDescriptors === true
    && baseEntry.routeSemantics !== "fully_assembled_runtime") {
    throw new Error(
      `${levelLabel(id)}: preserve_star_descriptors requires route_semantics=fully_assembled_runtime.`,
    );
  }
  const starSelection = baseEntry.preserveStarDescriptors === true
    ? {
      blocks: level.blocks.filter((block) => authoredStarBlockIds.has(block.id)),
      colors: [...new Set(level.blocks
        .filter((block) => authoredStarBlockIds.has(block.id))
        .flatMap(clearLayerColorsOf))],
    }
    : selectStarBlocks({ level, target, mechanism, ranks, warnings });
  if (baseEntry.preserveStarDescriptors === true) {
    for (const block of starSelection.blocks) block.star = true;
    warnings.push("stars: preserved explicit fully-assembled carrier descriptors");
  }
  meta.starBlockIds.push(...starSelection.blocks.map((block) => block.id));
  assembleGates({
    level,
    target,
    mechanism,
    baseGates: baseEntry.level.gates ?? [],
    route: baseRoute,
    starSelection,
    stages,
    warnings,
    meta,
  });
  const preserveAuthoredGateThawDescriptors = baseEntry.preserveGateThawDescriptors === true;
  if (preserveAuthoredGateThawDescriptors) {
    // Some exact-floor constructions bind a particular colour/geometry/frozen
    // descriptor as one semantic unit.  Reinstall that explicitly authored
    // mapping only for opt-in, already fully assembled overrides; the regular
    // contract audit below still rejects any descriptor-count/value drift.
    level.gates = deepClone(baseEntry.level.gates ?? []);
    warnings.push("directional exits: preserved explicit fully-assembled gate descriptors");
  }
  const hasShellCarriers = meta.shells.length > 0;
  const preGateShellWitness = hasShellCarriers && !directDataMode
    ? synthesizeDynamicCompletionWitness(level, baseRoute)
    : null;
  if (preGateShellWitness && !preGateShellWitness.ok) {
    warnings.push(
      `shell dynamic witness before gate permutation failed: ${preGateShellWitness.error}; `
      + "partial route discarded",
    );
  }
  const preGateTimingRoute = preGateShellWitness?.ok
    ? preGateShellWitness.drags
    : adaptedBaseRoute;
  if (gateThawPermutationEnabled && !preserveAuthoredGateThawDescriptors) {
    permuteGateThawDescriptors({
      level,
      route: preGateTimingRoute,
      mechanism,
      warnings,
      meta,
      dynamicWitnessForLevel: hasShellCarriers
        ? (candidateLevel) => synthesizeDynamicCompletionWitness(candidateLevel, baseRoute)
        : null,
    });
  } else {
    meta.gateThawPermutation = {
      applied: false,
      reason: directDataMode
        ? "skipped_direct_data_mode"
        : preserveAuthoredGateThawDescriptors
        ? "preserved_by_explicit_fully_assembled_override"
        : "disabled_by_environment",
    };
  }
  const finalGateShellWitness = hasShellCarriers && !directDataMode
    ? synthesizeDynamicCompletionWitness(level, baseRoute)
    : null;
  if (finalGateShellWitness && !finalGateShellWitness.ok) {
    warnings.push(
      `shell dynamic witness after final gate assignment failed: ${finalGateShellWitness.error}; `
      + "partial route discarded",
    );
  }
  const preGateWitnessReplay = !directDataMode && preGateShellWitness?.ok
    ? replayRoute(level, preGateShellWitness.drags)
    : null;
  const initialWitnessRoute = directDataMode
    ? []
    : finalGateShellWitness?.ok
      ? finalGateShellWitness.drags
      : preGateWitnessReplay?.ok
        ? preGateShellWitness.drags
        : adaptedBaseRoute;
  const initialWitnessSource = directDataMode
    ? null
    : finalGateShellWitness?.ok
      ? "post_gate_dynamic_shell_witness"
      : preGateWitnessReplay?.ok
        ? "pre_gate_dynamic_shell_witness_replayed_after_final_gate_assignment"
        : "adapted_base_route";
  meta.shellDynamicWitness = {
    attempted: hasShellCarriers && !directDataMode,
    skipped_reason: directDataMode ? "direct_data_mode" : null,
    pre_gate: preGateShellWitness ? {
      ok: preGateShellWitness.ok,
      drags: preGateShellWitness.ok ? preGateShellWitness.drags.length : null,
      error: preGateShellWitness.ok ? null : preGateShellWitness.error,
      discarded_partial_drags: preGateShellWitness.ok ? 0 : preGateShellWitness.partialDragCount,
      explored_states: preGateShellWitness.exploredStates ?? null,
      capped: preGateShellWitness.capped ?? false,
    } : null,
    post_gate: finalGateShellWitness ? {
      ok: finalGateShellWitness.ok,
      drags: finalGateShellWitness.ok ? finalGateShellWitness.drags.length : null,
      error: finalGateShellWitness.ok ? null : finalGateShellWitness.error,
      discarded_partial_drags: finalGateShellWitness.ok ? 0 : finalGateShellWitness.partialDragCount,
      explored_states: finalGateShellWitness.exploredStates ?? null,
      capped: finalGateShellWitness.capped ?? false,
    } : null,
    selected_source: initialWitnessSource,
  };

  const queuedIds = new Set(level.generators.flatMap((generator) => generator.queueBlockIds));
  for (const stage of stages.filter((entry) => entry.partition.kind !== "opening")) {
    for (const block of stage.blocks) {
      if (!block.shutterId && !queuedIds.has(block.id)) {
        warnings.push(`${stage.partition.id}: ${block.id} is neither shutter-hidden nor generator-queued`);
      }
    }
  }
  if (!level.shutters.length) delete level.shutters;
  if (!level.generators.length) delete level.generators;

  let validateStatus = "pass";
  try {
    validateLevel(level);
  } catch (error) {
    validateStatus = error instanceof Error ? error.message : String(error);
  }
  const contractAudit = auditContract({ level, target, mechanism, stages, meta });

  let witnessRoute = directDataMode ? [] : initialWitnessRoute;
  let witnessReplay = directDataMode
    ? { ok: false, error: "skipped by direct-data mode" }
    : validateStatus === "pass"
      ? replayRoute(level, witnessRoute)
      : { ok: false, error: "validateLevel failed" };
  let routeSource = directDataMode ? null : initialWitnessSource;
  let rescheduledRoute = null;
  let permutedRoute = null;
  let validationSolver = null;
  if (!directDataMode && !witnessReplay.ok && validateStatus === "pass") {
    rescheduledRoute = rescheduleCompletionRoute(level, witnessRoute);
    if (rescheduledRoute.ok) {
      witnessRoute = rescheduledRoute.drags;
      witnessReplay = rescheduledRoute.replay;
      routeSource = "mechanism_aware_rescheduled_base_route";
    }
  }
  if (!directDataMode && !witnessReplay.ok && validateStatus === "pass") {
    permutedRoute = searchAuthoredRoutePermutation(level, witnessRoute, routePermutationMaxStates);
    if (permutedRoute.ok) {
      witnessRoute = permutedRoute.drags;
      witnessReplay = permutedRoute.replay;
      routeSource = "bounded_authored_route_permutation_replayed";
    }
  }
  if (!directDataMode
    && !witnessReplay.ok
    && validateStatus === "pass"
    && completionWitnessById.has(id)) {
    const externalRoute = completionWitnessById.get(id);
    const externalReplay = replayRoute(level, externalRoute);
    if (!externalReplay.ok) {
      throw new Error(
        `${levelLabel(id)}: contract-bound external completion witness failed replay: ${externalReplay.error}`,
      );
    }
    witnessRoute = externalRoute;
    witnessReplay = externalReplay;
    routeSource = "contract_bound_route_free_completion_witness";
  }
  if (!directDataMode && !witnessReplay.ok && validateStatus === "pass") {
    try {
      validationSolver = solveLevelForValidation(level, solverMaxStates);
      if (validationSolver.solved) {
        const replayed = replayRoute(level, validationSolver.drags);
        if (replayed.ok) {
          witnessRoute = validationSolver.drags;
          witnessReplay = replayed;
          routeSource = "heuristic_validation_solver_replayed";
        } else {
          warnings.push(`validation solver returned a non-replaying route: ${replayed.error}`);
        }
      }
    } catch (error) {
      warnings.push(`validation solver threw: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!directDataMode && witnessReplay.ok) level.parMoves = witnessRoute.length;

  const clearLoad = level.blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
  const witnessOverhead = witnessReplay.ok ? witnessRoute.length - clearLoad : null;
  const floor = target.campaign_reposition_floor ?? target.recommended_minimum_reposition_overhead ?? null;
  let exactProof = null;
  if (!directDataMode && exactProofEnabled && validateStatus === "pass") {
    try {
      const candidate = solveLevelOptimally(level, exactProofMaxStates);
      if (candidate.solved) {
        const replayed = replayRoute(level, candidate.drags);
        exactProof = replayed.ok ? candidate : { ...candidate, solved: false, replay_error: replayed.error };
      } else exactProof = candidate;
    } catch (error) {
      exactProof = { solved: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  const floorStatus = directDataMode
    ? "not_assessed_direct_data_mode"
    : floor === null
    ? "not_applicable"
    : exactProof?.solved
      ? exactProof.repositionOverhead >= floor ? "proven_minimum_met" : "proven_minimum_below_target"
      : witnessOverhead === null
        ? "no_completion_witness_no_floor_claim"
        : witnessOverhead >= floor
          ? "witness_overhead_meets_target_but_is_not_a_lower_bound_proof"
          : "witness_overhead_below_target_not_met";

  return {
    level,
    route: !directDataMode && witnessReplay.ok ? witnessRoute : [],
    audit: {
      level_id: levelLabel(id),
      status: validateStatus === "pass" && contractAudit.exact
        && (directDataMode || witnessReplay.ok)
        ? directDataMode ? "assembled_structurally" : "assembled_and_replayed"
        : "incomplete",
      validate_level: validateStatus,
      exact_contract: contractAudit,
      completion_witness: {
        attempted: !directDataMode,
        skipped_reason: directDataMode ? "direct_data_mode" : null,
        replayed: !directDataMode && witnessReplay.ok,
        source: !directDataMode && witnessReplay.ok ? routeSource : null,
        error: directDataMode ? null : witnessReplay.ok ? null : witnessReplay.error,
        drags: !directDataMode && witnessReplay.ok ? witnessRoute.length : null,
        clear_load: clearLoad,
        reposition_overhead_upper_bound: witnessOverhead,
        solver_explored_states: validationSolver?.exploredStates ?? null,
        reschedule_error: rescheduledRoute?.ok ? null : rescheduledRoute?.error ?? null,
        authored_route_permutation: {
          attempted: permutedRoute !== null,
          explored_states: permutedRoute?.exploredStates ?? null,
          capped: permutedRoute?.capped ?? null,
          error: permutedRoute?.ok ? null : permutedRoute?.error ?? null,
        },
      },
      validation_search: {
        attempted: !directDataMode && validationSolver !== null,
        skipped_reason: directDataMode ? "direct_data_mode" : null,
        max_states: validationSolver !== null ? solverMaxStates : null,
        solved: validationSolver?.solved ?? null,
        explored_states: validationSolver?.exploredStates ?? null,
        termination: directDataMode
          ? "skipped_direct_data_mode"
          : validationSolver === null
          ? "not_needed"
          : validationSolver.solved
            ? "solved_and_replayed"
            : validationSolver.exploredStates >= solverMaxStates
              ? "max_states_reached_no_conclusion"
              : "search_space_exhausted_no_solution_in_solver_model",
      },
      necessary_reposition: {
        target_floor: floor,
        status: floorStatus,
        proof_method: directDataMode
          ? "not_run_direct_data_mode"
          : exactProof?.solved
            ? "completed_optimal_solver_and_replayed_witness"
            : "not_proven",
        proven_minimum: exactProof?.solved ? exactProof.repositionOverhead : null,
        exact_solver_explored_states: exactProof?.exploredStates ?? null,
        warning: directDataMode
          ? "Direct-data assembly performs no gameplay search and makes no solvability or necessary-reposition claim."
          : exactProof?.solved
          ? null
          : "A replayed validation route is only a completion upper bound and is never treated as proof of a necessary-reposition floor.",
      },
      gate_thaw_permutation: meta.gateThawPermutation,
      shell_dynamic_witness: meta.shellDynamicWitness,
      carrier_assignment: {
        numeric_ice: {
          total: meta.numericIce.length,
          base_route_feasible: meta.numericIce.filter((entry) => entry.routeFeasible).length,
          base_route_replan_required: meta.numericIce.filter((entry) => entry.routeFeasible === false).length,
        },
        axis_blocks: {
          total: meta.axisBlocks.length,
          base_route_compatible: meta.axisBlocks.filter((entry) => entry.routeCompatible).length,
          base_route_replan_required: meta.axisBlocks.filter((entry) => entry.routeCompatible === false).length,
        },
        key_lock_groups: {
          total: meta.keyLocks.length,
          base_route_dependency_safe: meta.keyLocks.filter((entry) => entry.dependencySafe).length,
          base_route_replan_required: meta.keyLocks.filter((entry) => entry.dependencySafe === false).length,
        },
      },
      warnings,
    },
  };
};

const assembled = [];
const preserved = [];
const failures = [];
for (const contractEntry of contract.levels) {
  const id = Number(String(contractEntry.level_id).replace(/^Lv/i, ""));
  if (requestedIds.size && !requestedIds.has(id)) continue;
  if (preserveExistingIds.has(id)) {
    const existing = existingCampaignById.get(id);
    if (!existing) {
      failures.push({ level_id: contractEntry.level_id, error: "current LEVELS record is missing" });
      console.error(`${contractEntry.level_id}: ERROR current LEVELS record is missing`);
      continue;
    }
    const level = deepClone(existing);
    let validateStatus = "pass";
    try {
      validateLevel(level);
    } catch (error) {
      validateStatus = error instanceof Error ? error.message : String(error);
    }
    preserved.push({
      level,
      audit: {
        level_id: levelLabel(id),
        status: validateStatus === "pass"
          ? "preserved_existing_out_of_video_parity_scope"
          : "preserved_existing_validation_failed",
        validate_level: validateStatus,
        exact_contract: {
          assessed: false,
          exact: null,
          reason: "The caller explicitly preserved this current LEVELS record instead of applying the video-parity contract.",
          mismatches: [],
        },
        preservation: {
          source: "src/core/levels.ts#LEVELS",
          canonical_level_spec_sha256: sha256(JSON.stringify(canonicalJsonValue(level))),
        },
        necessary_reposition: {
          status: "not_assessed_out_of_video_parity_scope",
          proof_method: "not_run",
          warning: "No competitor-parity or reposition-floor claim is made for this preserved level.",
        },
        warnings: [],
      },
    });
    console.error(`${contractEntry.level_id}: preserved current LEVELS record; parity exact=not assessed`);
    continue;
  }
  try {
    const result = assembleLevel(contractEntry);
    assembled.push(result);
    console.error(`${contractEntry.level_id}: ${result.audit.status}; replay=${result.audit.completion_witness.replayed}; exact=${result.audit.exact_contract.exact}`);
  } catch (error) {
    failures.push({
      level_id: contractEntry.level_id,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`${contractEntry.level_id}: ERROR ${failures.at(-1).error}`);
  }
  // Long all-season diagnostics may create many short-lived solver graphs.
  // Honour --expose-gc when supplied by CI so one difficult level cannot keep
  // the previous level's search arena alive until the process limit is hit.
  globalThis.gc?.();
}

const levels = [
  ...assembled.map((entry) => entry.level),
  ...preserved.map((entry) => entry.level),
].sort((left, right) => left.id - right.id);
const generatedSource = `/* eslint-disable */
// AUTO-GENERATED by tools/assemble-video-parity-runtime.mjs.
// Source: ${contractRelative}
// Contract SHA-256: ${contractSha256}
// Assembly mode: ${directDataMode ? "direct-data (structural validation; no gameplay solving)" : "witnessed runtime"}.
// The assembler publishes this source to the formal path only after its mode-specific full-season gate passes.
// ${directDataMode
    ? "No completion or necessary-reposition claim is made; see the runtime assembly audit."
    : "Completion routes are witnesses only; see the runtime assembly audit for floor-proof status."}
import type { LevelSpec } from "./types";

export const VIDEO_PARITY_LEVELS: LevelSpec[] = ${JSON.stringify(levels, null, 2)};

export const VIDEO_PARITY_LEVEL_BY_ID = new Map(VIDEO_PARITY_LEVELS.map((level) => [level.id, level]));
`;
const generatedSourceSha256 = sha256(generatedSource);
if (completionWitnessesText && generatedSourceSha256 !== completionWitnessLevelsSha256) {
  throw new Error(
    `Completion witnesses bind level source ${completionWitnessLevelsSha256}, `
    + `but this assembly generated ${generatedSourceSha256}. Re-run the route repair against this exact source.`,
  );
}
const routeReport = assembled.map((entry) => ({
  level_id: entry.audit.level_id,
  source: entry.audit.completion_witness.source,
  proof_scope: directDataMode
    ? "not_run_direct_data_mode"
    : "completion_upper_bound_only_unless_audit_marks_completed_optimal_solver",
  skipped_reason: directDataMode ? "direct_data_mode" : null,
  drags: entry.route,
}));
const routeReportSource = `${JSON.stringify(routeReport, null, 2)}\n`;
const canonicalLevelSpecs = JSON.stringify(canonicalJsonValue(levels));
const audit = {
  schema_version: "blockout-video-parity-runtime-assembly-v2",
  title: "Block Out! Lv1-Lv100 video-parity runtime assembly audit",
  generated_on: new Date().toISOString(),
  inputs: {
    contract: { path: contractRelative, sha256: contractSha256 },
    preserved_existing_levels: {
      path: "src/core/levels.ts#LEVELS",
      level_ids: preserved.map((entry) => entry.level.id).sort((a, b) => a - b),
      canonical_level_specs_sha256: sha256(JSON.stringify(canonicalJsonValue(
        preserved.map((entry) => entry.level).sort((left, right) => left.id - right.id),
      ))),
    },
    base_generated: { path: baseGeneratedRelative, sha256: sha256(baseGeneratedText) },
    base_candidates: { path: baseCandidatesRelative, sha256: sha256(baseText) },
    base_routes: { path: baseRoutesRelative, sha256: sha256(baseRoutesText) },
    ...(baseOverridesText ? {
      base_overrides: {
        path: baseOverridesRelative,
        sha256: sha256(baseOverridesText),
        level_ids: appliedBaseOverrideIds,
      },
    } : {}),
    ...(completionWitnessesText ? {
      completion_witnesses: {
        path: completionWitnessesRelative,
        sha256: sha256(completionWitnessesText),
        bound_levels_sha256: completionWitnessLevelsSha256,
        accepted_level_ids: [...completionWitnessById.keys()].sort((left, right) => left - right),
      },
    } : {}),
    base_contract_compatibility: baseContractCompatibility,
  },
  outputs: {
    levels: outputRelative,
    levels_sha256: generatedSourceSha256,
    canonical_level_specs_sha256: sha256(canonicalLevelSpecs),
    validation_routes: routeOutputRelative,
    validation_routes_sha256: sha256(routeReportSource),
  },
  proof_policy: {
    completion_witness: directDataMode
      ? "Not run. Direct-data mode makes no completion or solvability claim."
      : "A route replayed through PuzzleModel proves only that the level can be completed.",
    necessary_reposition_floor: directDataMode
      ? "Not run. Direct-data mode makes no necessary-reposition claim."
      : "Published only after solveLevelOptimally exhaustively reaches an optimum and that exact route replays.",
    heuristic_route_warning: directDataMode
      ? "No gameplay search, route replay, route repair, or route permutation was executed."
      : "A high-overhead authored or heuristic route is never relabeled as a minimum or lower-bound proof.",
  },
  run_configuration: {
    assembly_mode: directDataMode ? "direct_data" : "witnessed_runtime",
    gameplay_solver_enabled: !directDataMode,
    completion_witness_enabled: !directDataMode,
    route_repair_and_permutation_enabled: !directDataMode,
    gate_thaw_permutation_enabled: gateThawPermutationEnabled,
    selected_level_ids: requestedIds.size ? [...requestedIds].sort((a, b) => a - b) : "all",
    preserve_existing_ids: [...preserveExistingIds].sort((a, b) => a - b),
    exact_video_parity_scope: "all selected, non-preserved contract levels",
    validation_solver_max_states: directDataMode ? null : solverMaxStates,
    authored_route_permutation_max_states: directDataMode ? null : routePermutationMaxStates,
    dynamic_shell_witness_max_states: directDataMode ? null : dynamicWitnessMaxStates,
    exact_floor_proof_enabled: exactProofEnabled,
    exact_floor_proof_max_states: exactProofEnabled ? exactProofMaxStates : null,
  },
  summary: {
    requested: requestedIds.size || 100,
    exact_parity_requested: assembled.length + failures.filter((entry) => !preserveExistingIds.has(
      Number(String(entry.level_id).replace(/^Lv/i, "")),
    )).length,
    assembled: assembled.length,
    preserved_existing: preserved.length,
    emitted: levels.length,
    exact_contract: assembled.filter((entry) => entry.audit.exact_contract.exact).length,
    validate_level_passed: assembled.filter((entry) => entry.audit.validate_level === "pass").length,
    preserved_validate_level_passed: preserved.filter((entry) => entry.audit.validate_level === "pass").length,
    completion_witness_replayed: assembled.filter((entry) => entry.audit.completion_witness.replayed).length,
    completion_witness_skipped: assembled.filter((entry) => (
      entry.audit.completion_witness.skipped_reason === "direct_data_mode"
    )).length,
    carrier_assignment: {
      numeric_ice: {
        total: assembled.reduce((sum, entry) => sum + entry.audit.carrier_assignment.numeric_ice.total, 0),
        base_route_feasible: assembled.reduce((sum, entry) => (
          sum + entry.audit.carrier_assignment.numeric_ice.base_route_feasible
        ), 0),
        base_route_replan_required: assembled.reduce((sum, entry) => (
          sum + entry.audit.carrier_assignment.numeric_ice.base_route_replan_required
        ), 0),
      },
      axis_blocks: {
        total: assembled.reduce((sum, entry) => sum + entry.audit.carrier_assignment.axis_blocks.total, 0),
        base_route_compatible: assembled.reduce((sum, entry) => (
          sum + entry.audit.carrier_assignment.axis_blocks.base_route_compatible
        ), 0),
        base_route_replan_required: assembled.reduce((sum, entry) => (
          sum + entry.audit.carrier_assignment.axis_blocks.base_route_replan_required
        ), 0),
      },
      key_lock_groups: {
        total: assembled.reduce((sum, entry) => sum + entry.audit.carrier_assignment.key_lock_groups.total, 0),
        base_route_dependency_safe: assembled.reduce((sum, entry) => (
          sum + entry.audit.carrier_assignment.key_lock_groups.base_route_dependency_safe
        ), 0),
        base_route_replan_required: assembled.reduce((sum, entry) => (
          sum + entry.audit.carrier_assignment.key_lock_groups.base_route_replan_required
        ), 0),
      },
    },
    floor_proven_met: assembled.filter((entry) => entry.audit.necessary_reposition.status === "proven_minimum_met").length,
    floor_witness_only_not_proven: assembled.filter((entry) => entry.audit.necessary_reposition.status.includes("not_a_lower_bound_proof")).length,
    incomplete: assembled.filter((entry) => entry.audit.status !== (
      directDataMode ? "assembled_structurally" : "assembled_and_replayed"
    )).length
      + preserved.filter((entry) => entry.audit.validate_level !== "pass").length
      + failures.length,
    fatal_errors: failures.length,
  },
  failures,
  levels: [...assembled, ...preserved]
    .sort((left, right) => left.level.id - right.level.id)
    .map((entry) => entry.audit),
};

const selectedLevelIds = requestedIds.size
  ? [...requestedIds].sort((left, right) => left - right)
  : contract.levels.map((entry) => Number(String(entry.level_id).replace(/^Lv/i, "")))
    .sort((left, right) => left - right);
const selectedWholeSeason = selectedLevelIds.length === 100
  && selectedLevelIds.every((id, index) => id === index + 1);
const publicationReady = selectedWholeSeason
  && preserveExistingIds.size === 0
  && levels.length === 100
  && assembled.length === 100
  && audit.summary.exact_contract === 100
  && audit.summary.validate_level_passed === 100
  && (directDataMode || audit.summary.completion_witness_replayed === 100)
  && audit.summary.incomplete === 0
  && audit.summary.fatal_errors === 0;
const destinationPaths = [outputPath, auditPath, routeOutputPath];
const touchesFormalArtifacts = destinationPaths.some((path) => formalArtifactPaths.has(artifactPathKey(path)));
const diagnosticDestinations = destinationPaths.every((path) => !formalArtifactPaths.has(artifactPathKey(path)));
const writeArtifacts = publicationReady || diagnosticDestinations;
audit.publication = {
  ready: publicationReady,
  mode: publicationReady && touchesFormalArtifacts
    ? directDataMode
      ? "formal_atomic_publication_direct_data"
      : "formal_atomic_publication"
    : diagnosticDestinations
      ? "isolated_diagnostic_artifacts"
      : "formal_publication_withheld",
  selected_whole_season: selectedWholeSeason,
  zero_failures_and_incomplete: audit.summary.incomplete === 0 && audit.summary.fatal_errors === 0,
  formal_artifacts_touched: writeArtifacts && touchesFormalArtifacts,
  evidence_scope: directDataMode
    ? "exact_contract_and_validateLevel_only"
    : "exact_contract_validateLevel_and_completion_witness",
};

const atomicWriteArtifacts = async (artifacts) => {
  const nonce = `${process.pid}-${Date.now()}`;
  const prepared = artifacts.map(({ path, source }) => ({
    path,
    source,
    temporaryPath: `${path}.tmp-${nonce}`,
  }));
  try {
    await Promise.all(prepared.map(async ({ temporaryPath, source }) => {
      await mkdir(dirname(temporaryPath), { recursive: true });
      await writeFile(temporaryPath, source, "utf8");
    }));
    for (const { temporaryPath, path } of prepared) await rename(temporaryPath, path);
  } finally {
    await Promise.all(prepared.map(({ temporaryPath }) => rm(temporaryPath, { force: true }).catch(() => {})));
  }
};

if (writeArtifacts) {
  await atomicWriteArtifacts([
    { path: auditPath, source: `${JSON.stringify(audit, null, 2)}\n` },
    { path: routeOutputPath, source: routeReportSource },
    // Publish the executable runtime source last. Each rename is same-directory
    // atomic, so consumers never observe a partially written LevelSpec module.
    { path: outputPath, source: generatedSource },
  ]);
} else {
  console.error(
    "Formal runtime publication withheld: requires all Lv1-Lv100, zero preserved records, "
    + (directDataMode
      ? "100 exact audits, 100 validateLevel passes, and zero failures/incomplete records."
      : "100 exact audits, 100 validateLevel passes, 100 replayed witnesses, and zero failures/incomplete records."),
  );
}
console.log(JSON.stringify(audit.summary, null, 2));
if (audit.summary.incomplete > 0 && process.env.VIDEO_PARITY_ALLOW_INCOMPLETE !== "1") process.exitCode = 2;
