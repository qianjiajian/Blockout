import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Isolated exact-contract redesigns for the Lv17/Lv32 reposition-floor audit.
 *
 * This tool deliberately writes only under .codex-temp.  It does not import or
 * modify the formal campaign assembler/generator/source files.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = resolve(root,
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json");
const sourceLevelsPath = resolve(root,
  ".codex-temp/video-parity-lv17-lv32-last-gate-seeds/final/runtime.generated.ts");
const outputDir = resolve(root, ".codex-temp/video-parity-lv17-lv32-floor-seeds");
const outputLevelsPath = resolve(outputDir, "runtime.generated.ts");
const outputJsonPath = resolve(outputDir, "runtime-levels.json");
const outputAuditPath = resolve(outputDir, "runtime-assembly-audit.json");
const outputRoutesPath = resolve(outputDir, "empty-routes.json");
const outputCorePlanPath = resolve(outputDir, "core-plan.json");
const preservedSize5PoolPath = resolve(root,
  ".codex-temp/video-parity-lv17-floor-core-search/size5/runtime-search/candidate-pool.json");
const stageSevenSearchPath = resolve(root,
  ".codex-temp/video-parity-lv17-deadline-layout-search/run1/candidates.json");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
    value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
  )));
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const levelSpecSha256 = (level) => sha256(canonicalJson(level));
const display = (path) => relative(root, path).replaceAll("\\", "/");
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const sortedNumbers = (values) => [...values].map(Number).sort((left, right) => left - right);

const contractSource = await readFile(contractPath, "utf8");
const contractSha256 = sha256(contractSource);
const contract = JSON.parse(contractSource);

const sourceBundle = await build({
  entryPoints: [sourceLevelsPath],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const sourceModule = await import(`data:text/javascript;base64,${Buffer.from(sourceBundle.outputFiles[0].text).toString("base64")}`);
const sourceLevels = sourceModule.VIDEO_PARITY_LEVELS;

const runtimeBundle = await build({
  stdin: {
    contents: `export { validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: root,
    sourcefile: "lv17-lv32-floor-seed-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].text).toString("base64")}`);

const L4 = [
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1], [1, 2]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
];
const V3 = [[0, 0], [0, 1], [0, 2]];
const H2 = [[0, 0], [1, 0]];

const clone = (value) => structuredClone(value);
const source17 = clone(sourceLevels.find((level) => level.id === 17));
const source32 = clone(sourceLevels.find((level) => level.id === 32));
if (!source17 || !source32) throw new Error("The isolated source fixture does not contain Lv17/Lv32");

const ids17 = {
  single: source17.blocks.filter((block) => block.shape.length === 1).map((block) => block.id),
  h2: source17.blocks.filter((block) => block.shape.length === 2 && block.shape.every(([, y]) => y === 0)).map((block) => block.id),
  v2: source17.blocks.filter((block) => block.shape.length === 2 && block.shape.every(([x]) => x === 0)).map((block) => block.id),
  h3: source17.blocks.filter((block) => block.shape.length === 3).map((block) => block.id),
  sq2: source17.blocks.filter((block) => block.shape.length === 4).map((block) => block.id),
};
if (!same(Object.fromEntries(Object.entries(ids17).map(([key, ids]) => [key, ids.length])),
  { single: 12, h2: 3, v2: 4, h3: 6, sq2: 1 })) {
  throw new Error(`Unexpected Lv17 source histogram: ${JSON.stringify(ids17)}`);
}

const ids32 = {
  v3: source32.blocks.filter((block) => block.shape.length === 3).map((block) => block.id),
  h2: source32.blocks.filter((block) => block.shape.length === 2).map((block) => block.id),
  l4: source32.blocks.filter((block) => block.shape.length === 4).map((block) => block.id),
};
if (!same(Object.fromEntries(Object.entries(ids32).map(([key, ids]) => [key, ids.length])), { v3: 6, h2: 2, l4: 6 })) {
  throw new Error(`Unexpected Lv32 source histogram: ${JSON.stringify(ids32)}`);
}

const makeBlock = (id, x, y, shape, color, extra = {}) => ({ id, x, y, shape, color, ...extra });
const SINGLE = [[0, 0]];
const V2 = [[0, 0], [0, 1]];
const H3 = [[0, 0], [1, 0], [2, 0]];
const SQ2 = [[0, 0], [1, 0], [0, 1], [1, 1]];
const wallLevel17 = {
  ...source17,
  gates: [
    { id: "vp-017-gate-01", side: "top", offset: 0, size: 6, color: "purple" },
    { id: "vp-017-gate-02", side: "right", offset: 2, size: 2, color: "blue", frozen: 8 },
    { id: "vp-017-gate-03", side: "left", offset: 2, size: 4, color: "yellow", frozen: 16 },
    { id: "vp-017-gate-04", side: "right", offset: 4, size: 2, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "right", offset: 6, size: 2, color: "red", frozen: 26 },
  ],
  blocks: [
    makeBlock(ids17.single[0], 0, 0, SINGLE, "purple"),
    makeBlock(ids17.single[1], 1, 0, SINGLE, "purple"),
    makeBlock(ids17.single[2], 2, 0, SINGLE, "purple"),
    makeBlock(ids17.single[3], 3, 0, SINGLE, "purple"),
    makeBlock(ids17.single[4], 4, 0, SINGLE, "purple"),
    makeBlock(ids17.single[5], 5, 0, SINGLE, "purple"),
    makeBlock(ids17.single[6], 0, 7, SINGLE, "pink"),
    makeBlock(ids17.single[7], 1, 7, SINGLE, "pink"),
    makeBlock(ids17.single[8], 2, 7, SINGLE, "pink"),
    makeBlock(ids17.single[9], 3, 7, SINGLE, "pink"),
    makeBlock(ids17.single[10], 4, 7, SINGLE, "pink"),
    makeBlock(ids17.single[11], 5, 7, SINGLE, "red"),
    makeBlock(ids17.h3[0], 0, 5, H3, "yellow"),
    makeBlock(ids17.h3[1], 0, 4, H3, "yellow", { frozen: 18 }),
    makeBlock(ids17.h3[2], 0, 6, H3, "red", { frozen: 18 }),
    makeBlock(ids17.h3[3], 3, 4, H3, "yellow", { frozen: 19 }),
    makeBlock(ids17.h3[4], 3, 6, H3, "red", { frozen: 19 }),
    makeBlock(ids17.h3[5], 3, 5, H3, "yellow"),
    makeBlock(ids17.h2[0], 0, 1, H2, "blue", { frozen: 6 }),
    makeBlock(ids17.h2[1], 2, 1, H2, "blue", { frozen: 6 }),
    makeBlock(ids17.h2[2], 4, 1, H2, "blue", { frozen: 6 }),
    makeBlock(ids17.v2[0], 0, 2, V2, "purple", { layers: ["purple", "blue"] }),
    makeBlock(ids17.v2[1], 3, 2, V2, "purple", { layers: ["purple", "blue"] }),
    makeBlock(ids17.v2[2], 1, 2, V2, "blue"),
    makeBlock(ids17.v2[3], 2, 2, V2, "blue"),
    makeBlock(ids17.sq2[0], 4, 2, SQ2, "purple", { layers: ["purple", "yellow"] }),
  ],
};
// Geometry migrated from the old dense Lv17 opening certificate.  Three H3
// bodies become the contract-required H2 bodies; the three released cells and
// the three old opening holes receive the six formerly staged singles.  This
// keeps the exact v6 inventory while retaining the tightly interlocked layout.
const denseLevel17 = {
  ...source17,
  gates: [
    { id: "vp-017-gate-01", side: "right", offset: 3, size: 5, color: "purple" },
    { id: "vp-017-gate-02", side: "left", offset: 0, size: 3, color: "blue", frozen: 8 },
    { id: "vp-017-gate-03", side: "top", offset: 0, size: 3, color: "yellow", frozen: 16 },
    { id: "vp-017-gate-04", side: "top", offset: 3, size: 3, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "bottom", offset: 3, size: 3, color: "red", frozen: 26 },
  ],
  blocks: [
    makeBlock(ids17.h3[0], 0, 0, H3, "blue", { frozen: 18 }),
    makeBlock(ids17.h3[1], 3, 0, H3, "pink", { frozen: 18 }),
    makeBlock(ids17.h3[2], 0, 1, H3, "blue", { frozen: 19 }),
    makeBlock(ids17.h3[3], 3, 1, H3, "red", { frozen: 19 }),
    makeBlock(ids17.h3[4], 0, 2, H3, "blue"),
    makeBlock(ids17.h3[5], 3, 2, H3, "blue"),
    makeBlock(ids17.h2[0], 1, 4, H2, "blue", { frozen: 6 }),
    makeBlock(ids17.h2[1], 1, 5, H2, "blue", { frozen: 6 }),
    makeBlock(ids17.h2[2], 3, 7, H2, "purple", { frozen: 6 }),
    makeBlock(ids17.v2[0], 4, 3, V2, "yellow", { layers: ["yellow", "pink"] }),
    makeBlock(ids17.v2[1], 0, 3, V2, "blue", { layers: ["blue", "yellow"] }),
    makeBlock(ids17.v2[2], 0, 5, V2, "blue"),
    makeBlock(ids17.v2[3], 4, 5, V2, "purple"),
    makeBlock(ids17.sq2[0], 1, 6, SQ2, "red", { layers: ["red", "yellow"] }),
    makeBlock(ids17.single[0], 1, 3, SINGLE, "blue"),
    makeBlock(ids17.single[1], 2, 3, SINGLE, "blue"),
    makeBlock(ids17.single[2], 3, 3, SINGLE, "blue"),
    makeBlock(ids17.single[3], 5, 3, SINGLE, "purple"),
    makeBlock(ids17.single[4], 5, 4, SINGLE, "purple"),
    makeBlock(ids17.single[5], 3, 4, SINGLE, "blue"),
    makeBlock(ids17.single[6], 3, 5, SINGLE, "purple"),
    makeBlock(ids17.single[7], 5, 5, SINGLE, "purple"),
    makeBlock(ids17.single[8], 3, 6, SINGLE, "purple"),
    makeBlock(ids17.single[9], 5, 6, SINGLE, "purple"),
    makeBlock(ids17.single[10], 0, 7, SINGLE, "yellow"),
    makeBlock(ids17.single[11], 5, 7, SINGLE, "purple"),
  ],
};
// Proof-oriented late-wall variant.  The four high-count H3 carriers occupy
// two complete rows, while the two ordinary H3 bodies stay in the first
// thaw-stage search pool.  Colours/gates are intentionally tuned below after
// the bounded opening-stage probe identifies a seven-move deadline core.
const stageSevenLevel17 = {
  ...wallLevel17,
  gates: [
    { id: "vp-017-gate-01", side: "right", offset: 4, size: 2, color: "purple" },
    { id: "vp-017-gate-02", side: "right", offset: 0, size: 4, color: "blue", frozen: 8 },
    { id: "vp-017-gate-03", side: "top", offset: 0, size: 3, color: "yellow", frozen: 16 },
    { id: "vp-017-gate-04", side: "top", offset: 3, size: 3, color: "pink", frozen: 21 },
    { id: "vp-017-gate-05", side: "bottom", offset: 0, size: 3, color: "red", frozen: 26 },
  ],
  blocks: [
    makeBlock(ids17.single[0], 3, 0, SINGLE, "blue"),
    makeBlock(ids17.single[1], 4, 0, SINGLE, "blue"),
    makeBlock(ids17.single[2], 5, 0, SINGLE, "purple"),
    makeBlock(ids17.single[3], 3, 7, SINGLE, "blue"),
    makeBlock(ids17.single[4], 4, 5, SINGLE, "purple"),
    makeBlock(ids17.single[5], 5, 7, SINGLE, "blue"),
    makeBlock(ids17.single[6], 4, 7, SINGLE, "blue"),
    makeBlock(ids17.single[7], 5, 5, SINGLE, "blue"),
    makeBlock(ids17.single[8], 2, 6, SINGLE, "yellow"),
    makeBlock(ids17.single[9], 3, 6, SINGLE, "blue"),
    makeBlock(ids17.single[10], 4, 6, SINGLE, "yellow"),
    makeBlock(ids17.single[11], 5, 6, SINGLE, "pink"),
    makeBlock(ids17.h3[0], 3, 4, H3, "purple"),
    makeBlock(ids17.h3[1], 0, 0, H3, "pink", { frozen: 18 }),
    makeBlock(ids17.h3[2], 3, 0, H3, "yellow", { frozen: 18 }),
    makeBlock(ids17.h3[3], 0, 1, H3, "yellow", { frozen: 19 }),
    makeBlock(ids17.h3[4], 3, 1, H3, "yellow", { frozen: 19 }),
    makeBlock(ids17.h3[5], 0, 4, H3, "pink"),
    makeBlock(ids17.h2[0], 4, 1, H2, "pink", { frozen: 6 }),
    makeBlock(ids17.h2[1], 4, 2, H2, "purple", { frozen: 6 }),
    makeBlock(ids17.h2[2], 2, 5, H2, "purple", { frozen: 6 }),
    makeBlock(ids17.v2[0], 0, 5, V2, "blue", { layers: ["blue", "pink"] }),
    makeBlock(ids17.v2[1], 3, 1, V2, "purple", { layers: ["purple", "red"] }),
    makeBlock(ids17.v2[2], 2, 1, V2, "purple"),
    makeBlock(ids17.v2[3], 1, 5, V2, "red"),
    makeBlock(ids17.sq2[0], 0, 1, SQ2, "purple", { layers: ["purple", "yellow"] }),
  ].map((block) => {
    // The explicit seed only supplies the palette/mechanism assignment.  Keep
    // the known-valid source packing here; the isolated deadline search below
    // is responsible for replacing every anchor, including the fixed H3 core.
    const sourceBlock = source17.blocks.find((entry) => entry.id === block.id);
    if (!sourceBlock) throw new Error(`Missing Lv17 source block ${block.id}`);
    return { ...block, x: sourceBlock.x, y: sourceBlock.y };
  }),
};
const preservedSize5Pool = JSON.parse(await readFile(preservedSize5PoolPath, "utf8"));
const preservedSize5Candidate = preservedSize5Pool.levels
  .find((entry) => entry.level_id === "Lv017")?.candidates?.[0];
if (!preservedSize5Candidate?.level || !Array.isArray(preservedSize5Candidate.route)) {
  throw new Error("Preserved replaying Lv17 size-5 candidate is missing");
}
const stageSevenSearch = JSON.parse(await readFile(stageSevenSearchPath, "utf8"));
const stageSevenSearchLevel17 = stageSevenSearch.candidates?.[0]?.level;
if (!stageSevenSearchLevel17) throw new Error("Searched Lv17 seven-action deadline candidate is missing");
const level17 = process.env.LV17_FLOOR_SEED === "size5"
  ? clone(preservedSize5Candidate.level)
  : process.env.LV17_FLOOR_SEED === "wall"
    ? wallLevel17
    : process.env.LV17_FLOOR_SEED === "stage7"
      ? stageSevenLevel17
      : process.env.LV17_FLOOR_SEED === "stage7search"
        ? clone(stageSevenSearchLevel17)
        : denseLevel17;
const level32 = {
  ...source32,
  gates: [
    { id: "vp-032-gate-01", side: "top", offset: 0, size: 3, color: "purple" },
    { id: "vp-032-gate-02", side: "bottom", offset: 0, size: 3, color: "cyan", frozen: 8 },
    { id: "vp-032-gate-03", side: "left", offset: 3, size: 3, color: "green", frozen: 8 },
    { id: "vp-032-gate-04", side: "right", offset: 3, size: 3, color: "blue", frozen: 8 },
  ],
  blocks: [
    makeBlock(ids32.v3[0], 0, 0, V3, "purple"),
    makeBlock(ids32.v3[1], 1, 0, V3, "purple"),
    makeBlock(ids32.v3[2], 2, 0, V3, "purple"),
    makeBlock(ids32.v3[3], 0, 6, V3, "purple"),
    makeBlock(ids32.v3[4], 1, 6, V3, "cyan"),
    makeBlock(ids32.v3[5], 2, 6, V3, "cyan"),
    makeBlock(ids32.h2[0], 4, 7, H2, "green"),
    makeBlock(ids32.h2[1], 3, 8, H2, "green"),
    makeBlock(ids32.l4[0], 1, 4, L4[1], "purple", { layers: ["purple", "blue"], frozen: 4 }),
    makeBlock(ids32.l4[1], 3, 0, L4[2], "purple", { layers: ["purple", "blue"], frozen: 4 }),
    makeBlock(ids32.l4[2], 3, 6, L4[1], "purple", { layers: ["purple", "blue"], frozen: 4 }),
    makeBlock(ids32.l4[3], 1, 2, L4[3], "cyan", { layers: ["cyan", "blue"], frozen: 4 }),
    makeBlock(ids32.l4[4], 4, 3, L4[2], "cyan", { layers: ["cyan", "blue"], frozen: 4 }),
    makeBlock(ids32.l4[5], 2, 4, L4[3], "purple", { layers: ["purple", "blue"], frozen: 4 }),
  ],
};

const selectedLevels = [level17, level32];
for (const level of selectedLevels) runtime.validateLevel(level);

const SHAPE_BY_SIGNATURE = new Map([
  [canonicalJson([[0, 0]]), "SINGLE"],
  [canonicalJson(H2), "H2"],
  [canonicalJson([[0, 0], [0, 1]]), "V2"],
  [canonicalJson([[0, 0], [1, 0], [2, 0]]), "H3"],
  [canonicalJson(V3), "V3"],
  [canonicalJson([[0, 0], [1, 0], [0, 1], [1, 1]]), "SQ2"],
  ...L4.map((shape) => [canonicalJson(shape), "L4"]),
]);
const shapeId = (shape) => SHAPE_BY_SIGNATURE.get(canonicalJson(shape)) ?? "UNKNOWN";
const histogram = (blocks) => Object.fromEntries(Object.entries(blocks.reduce((result, block) => {
  const id = shapeId(block.shape);
  result[id] = (result[id] ?? 0) + 1;
  return result;
}, {})).sort(([left], [right]) => left.localeCompare(right)));
const maskRows = (level) => {
  const cells = new Set(level.playable.map(([x, y]) => `${x},${y}`));
  return Array.from({ length: level.height }, (_row, y) => (
    Array.from({ length: level.width }, (_cell, x) => cells.has(`${x},${y}`) ? "#" : ".").join("")
  ));
};
const contractAudit = (level) => {
  const levelId = `Lv${String(level.id).padStart(3, "0")}`;
  const target = contract.levels.find((entry) => entry.level_id === levelId)?.our_design_target;
  if (!target) throw new Error(`${levelId} target missing from contract`);
  const numeric = level.blocks.filter((block) => Number(block.frozen ?? 0) > 0);
  const shells = level.blocks.filter((block) => (block.layers?.length ?? 1) > 1);
  const allLayers = (block) => block.layers?.length ? block.layers : [block.color];
  const fullPalette = new Set(level.blocks.flatMap(allLayers));
  const nonNumericPalette = new Set(level.blocks.filter((block) => !numeric.includes(block)).flatMap(allLayers));
  const numericPalette = new Set(numeric.flatMap(allLayers));
  const concealedOnly = new Set([...numericPalette].filter((color) => !nonNumericPalette.has(color)));
  const hidden = new Set(numeric.filter((block) => allLayers(block).some((color) => concealedOnly.has(color))).map((block) => block.id));
  const visiblePalette = new Set(level.blocks.filter((block) => !hidden.has(block.id)).flatMap(allLayers));
  const mechanism = target.mechanism_contract;
  const checks = {
    board_rows: level.height === target.board.rows,
    board_cols: level.width === target.board.cols,
    playable_count: level.playable.length === target.board.playable_cell_count,
    playable_mask: same(maskRows(level), target.board.playable_mask),
    time_seconds: level.timeSeconds === target.time_seconds,
    block_count: level.blocks.length === target.full_level_block_count,
    shape_histogram: same(histogram(level.blocks), target.full_level_shape_histogram),
    occupied_cells: level.blocks.reduce((sum, block) => sum + block.shape.length, 0) === target.full_level_occupied_cell_count,
    full_colors: fullPalette.size === target.full_level_color_count,
    opening_colors: visiblePalette.size === target.opening_color_count,
    gate_ordinary_count: level.gates.filter((gate) => Number(gate.frozen ?? 0) <= 0 && !gate.star).length
      === mechanism.directional_exits.ordinary_count,
    gate_frozen_values: same(sortedNumbers(level.gates.filter((gate) => Number(gate.frozen ?? 0) > 0).map((gate) => gate.frozen)),
      sortedNumbers(mechanism.directional_exits.frozen_values)),
    numeric_count: numeric.length === mechanism.numeric_ice.count,
    numeric_values: same(sortedNumbers(numeric.map((block) => block.frozen)), sortedNumbers(mechanism.numeric_ice.values)),
    numeric_histogram: same(histogram(numeric), mechanism.numeric_ice.shape_histogram),
    shell_count: shells.length === mechanism.shells.count,
    shell_extras: same(sortedNumbers(shells.map((block) => block.layers.length - 1)),
      sortedNumbers(mechanism.shells.extra_layers)),
    shell_histogram: same(histogram(shells), mechanism.shells.shape_histogram),
    shell_layers_distinct: shells.every((block) => new Set(block.layers).size === block.layers.length),
  };
  const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
  if (failed.length) throw new Error(`${levelId} exact-contract checks failed: ${failed.join(", ")}`);
  return {
    level_id: levelId,
    target,
    level_spec_sha256: levelSpecSha256(level),
    validate_level: "pass",
    exact_contract: {
      exact: true,
      actual: {
        colors: {
          opening_hidden_color_carrier_ids: [...hidden].sort(),
        },
      },
    },
    checks,
    observed: {
      full_palette: [...fullPalette].sort(),
      visible_opening_palette: [...visiblePalette].sort(),
      hidden_numeric_carrier_ids: [...hidden].sort(),
    },
  };
};
const levelAudits = selectedLevels.map(contractAudit);

const generatedSource = [
  "/* eslint-disable */",
  "// Isolated Lv17/Lv32 exact-contract reposition-floor candidates.",
  `// Contract SHA-256: ${contractSha256}`,
  "// Not a formal campaign source.",
  `export const VIDEO_PARITY_LEVELS = ${JSON.stringify(selectedLevels, null, 2)};`,
  "",
].join("\n");
const canonicalSpecsSha256 = sha256(canonicalJson(selectedLevels));
const runtimeAudit = {
  schema_version: "blockout-video-parity-isolated-floor-seed-v1",
  generated_on: new Date().toISOString(),
  inputs: {
    contract: { path: display(contractPath), sha256: contractSha256 },
    source_fixture: { path: display(sourceLevelsPath), sha256: sha256(await readFile(sourceLevelsPath)) },
  },
  outputs: {
    levels: display(outputLevelsPath),
    levels_sha256: sha256(generatedSource),
    canonical_level_specs_sha256: canonicalSpecsSha256,
  },
  summary: {
    emitted: selectedLevels.length,
    exact_contract: levelAudits.length,
    validate_level_passed: selectedLevels.length,
  },
  levels: levelAudits,
};
const corePlan = {
  schema_version: "blockout-video-parity-disjoint-core-plan-v1",
  generated_on: new Date().toISOString(),
  contract_sha256: contractSha256,
  levels: [{
    level_id: "Lv032",
    source: "isolated hand-designed disjoint relaxed cores",
    proof_scope: "disjoint relaxed-core lower bound",
    level_spec_sha256: levelSpecSha256(level32),
    groups: [
      { id: "l4-corridor-six", block_ids: [...ids32.l4], target_reposition_overhead: 5, stage_key: "opening" },
      { id: "v3-opposed-column-0", block_ids: [ids32.v3[0], ids32.v3[3]], target_reposition_overhead: 1, stage_key: "opening" },
      { id: "v3-opposed-column-1", block_ids: [ids32.v3[1], ids32.v3[4]], target_reposition_overhead: 1, stage_key: "opening" },
      { id: "v3-opposed-column-2", block_ids: [ids32.v3[2], ids32.v3[5]], target_reposition_overhead: 1, stage_key: "opening" },
    ],
  }],
};
const emptyRoutes = {
  schema_version: "blockout-video-parity-completion-witness-v1",
  contract_sha256: contractSha256,
  levels: selectedLevels.map((level) => ({
    level_id: `Lv${String(level.id).padStart(3, "0")}`,
    route: level.id === 17 && process.env.LV17_FLOOR_SEED === "size5"
      ? preservedSize5Candidate.route
      : [],
  })),
};

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(outputLevelsPath, generatedSource),
  writeFile(outputJsonPath, `${JSON.stringify({ contract_sha256: contractSha256, levels: selectedLevels }, null, 2)}\n`),
  writeFile(outputAuditPath, `${JSON.stringify(runtimeAudit, null, 2)}\n`),
  writeFile(outputRoutesPath, `${JSON.stringify(emptyRoutes, null, 2)}\n`),
  writeFile(outputCorePlanPath, `${JSON.stringify(corePlan, null, 2)}\n`),
]);

console.log(JSON.stringify({
  contract_sha256: contractSha256,
  levels: levelAudits.map((entry) => ({ level_id: entry.level_id, level_spec_sha256: entry.level_spec_sha256 })),
  outputs: {
    levels: display(outputLevelsPath),
    audit: display(outputAuditPath),
    routes: display(outputRoutesPath),
    core_plan: display(outputCorePlanPath),
  },
}, null, 2));
