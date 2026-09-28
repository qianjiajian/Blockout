import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Narrow post-assembly Lv77 seed.
 *
 * The v6 source records two V3 numeric-ice carriers with values 6 and 18 but
 * leaves their identities under `opening_or_unspecified`. The generic global
 * matcher puts 18 on the first generated V3, which creates a strict queue
 * capacity deadlock. This tool exchanges only those carrier identities:
 * frozen-6 goes on the V3 queue head and frozen-18 goes on the latest ordinary
 * opening V3. No geometry, colour, gate, shape, count or scalar changes.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  levels: ".codex-temp/video-parity-lv77-numeric-queue-full-r10/runtime.generated.ts",
  assemblyAudit: ".codex-temp/video-parity-lv77-numeric-queue-full-r10/audit.json",
  baseSeed: ".codex-temp/video-parity-lv77-numeric-queue-seed-r11/base-overrides.json",
  outputDir: ".codex-temp/video-parity-lv77-numeric-carrier-seed-r11",
};

const parseArgs = (argv) => {
  const options = { ...defaults };
  const names = new Map([
    ["--contract", "contract"],
    ["--levels", "levels"],
    ["--assembly-audit", "assemblyAudit"],
    ["--base-seed", "baseSeed"],
    ["--output-dir", "outputDir"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = names.get(argv[index]);
    if (!name) throw new Error(`Unknown option: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argv[index]}`);
    options[name] = value;
    index += 1;
  }
  return options;
};

const options = parseArgs(process.argv.slice(2));
const absolute = (path) => resolve(root, path);
const display = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const clone = (value) => structuredClone(value);
const sortedNumbers = (values) => [...values].map(Number).sort((left, right) => left - right);
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const shapeIdOf = (shape) => {
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs) + 1;
  const height = Math.max(...ys) - Math.min(...ys) + 1;
  if (shape.length === 3 && width === 1 && height === 3) return "V3";
  if (shape.length === 2 && width === 1 && height === 2) return "V2";
  return `${shape.length}@${width}x${height}`;
};

const contractPath = absolute(options.contract);
const levelsPath = absolute(options.levels);
const assemblyAuditPath = absolute(options.assemblyAudit);
const baseSeedPath = absolute(options.baseSeed);
const outputDir = absolute(options.outputDir);
const outputPath = resolve(outputDir, "runtime-levels.json");
const baseOverridePath = resolve(outputDir, "base-overrides.json");
const auditPath = resolve(outputDir, "audit.json");
const [contractText, levelsText, assemblyAuditText, baseSeedText] = await Promise.all([
  readFile(contractPath, "utf8"),
  readFile(levelsPath, "utf8"),
  readFile(assemblyAuditPath, "utf8"),
  readFile(baseSeedPath, "utf8"),
]);

const levelsBundle = await build({
  entryPoints: [levelsPath],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const levelsModuleUrl = `data:text/javascript;base64,${Buffer.from(levelsBundle.outputFiles[0].text).toString("base64")}`;
const levelsModule = await import(levelsModuleUrl);
const sourceLevels = levelsModule.VIDEO_PARITY_LEVELS;
const sourceLevel = sourceLevels?.find((level) => Number(level.id) === 77);
if (!sourceLevel) throw new Error("Input generated source does not contain Lv077");

const puzzleBundle = await build({
  stdin: {
    contents: `export { validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: root,
    sourcefile: "lv77-numeric-carrier-seed-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const puzzleBundleSource = puzzleBundle.outputFiles[0].text;
const puzzleModuleUrl = `data:text/javascript;base64,${Buffer.from(puzzleBundleSource).toString("base64")}`;
const { validateLevel } = await import(puzzleModuleUrl);

const contract = JSON.parse(contractText);
const target = contract.levels.find((entry) => entry.level_id === "Lv077")?.our_design_target;
const numeric = target?.mechanism_contract?.numeric_ice;
if (numeric?.count !== 2
  || !sameJson(sortedNumbers(numeric.values), [6, 18])
  || !sameJson(numeric.shape_histogram, { V3: 2 })
  || numeric.stage_scope !== "opening_or_unspecified"
  || Number(numeric.post_melt_shell) !== 0) {
  throw new Error("Active Lv077 numeric contract no longer permits this carrier exchange");
}
const assemblyAudit = JSON.parse(assemblyAuditText);
const inheritedAssembly = assemblyAudit.levels?.find((entry) => entry.level_id === "Lv077");
if (!inheritedAssembly?.exact_contract?.exact || inheritedAssembly.validate_level !== "pass") {
  throw new Error("Input Lv077 is not an exact, validateLevel-passing assembly");
}
const baseSeed = JSON.parse(baseSeedText);
const baseEntry = baseSeed.levels?.find((entry) => entry.level_id === "Lv077");
if (!baseEntry) throw new Error("Base seed does not contain Lv077");
if (!sameJson(baseEntry.target, target)) {
  throw new Error("Lv077 base seed target does not exactly match the active contract");
}
const firstTouchRank = new Map();
let cleared = 0;
for (const [index, event] of baseEntry.route.entries()) {
  if (!firstTouchRank.has(event.blockId)) firstTouchRank.set(event.blockId, { index, cleared });
  if (event.exitSide) cleared += 1;
}

const level = clone(sourceLevel);
const generator = level.generators?.find((entry) => entry.queueBlockIds?.length === 3);
if (!generator) throw new Error("Lv077 has no three-member generator queue");
const queueHead = level.blocks.find((block) => block.id === generator.queueBlockIds[0]);
if (!queueHead || shapeIdOf(queueHead.shape) !== "V3") {
  throw new Error("Lv077 queue head is not the contracted V3 carrier");
}
const queuedIds = new Set(generator.queueBlockIds);
const shellIds = new Set(level.blocks.filter((block) => (block.layers?.length ?? 1) > 1).map((block) => block.id));
const lateOpeningV3 = level.blocks
  .filter((block) => shapeIdOf(block.shape) === "V3" && !queuedIds.has(block.id) && !shellIds.has(block.id))
  .sort((left, right) => (firstTouchRank.get(right.id)?.cleared ?? -1)
    - (firstTouchRank.get(left.id)?.cleared ?? -1)
    || right.id.localeCompare(left.id))[0];
if (!lateOpeningV3) throw new Error("Lv077 has no eligible late opening V3 numeric carrier");

const inheritedNumericCarriers = level.blocks
  .filter((block) => Number(block.frozen ?? 0) > 0)
  .map((block) => ({ block_id: block.id, value: Number(block.frozen), shape: shapeIdOf(block.shape) }));
if (!sameJson(sortedNumbers(inheritedNumericCarriers.map((entry) => entry.value)), [6, 18])
  || inheritedNumericCarriers.some((entry) => entry.shape !== "V3")) {
  throw new Error("Inherited runtime does not contain exactly the expected two V3 numeric carriers");
}
for (const carrier of inheritedNumericCarriers) delete level.blocks.find((block) => block.id === carrier.block_id).frozen;
queueHead.frozen = 6;
lateOpeningV3.frozen = 18;
validateLevel(level);

const seededNumericCarriers = level.blocks
  .filter((block) => Number(block.frozen ?? 0) > 0)
  .map((block) => ({
    block_id: block.id,
    value: Number(block.frozen),
    shape: shapeIdOf(block.shape),
    stage: queuedIds.has(block.id) ? "generator-1" : "opening",
    clear_layers_before_first_authored_touch: firstTouchRank.get(block.id)?.cleared ?? null,
  }));
if (!sameJson(sortedNumbers(seededNumericCarriers.map((entry) => entry.value)), [6, 18])
  || seededNumericCarriers.some((entry) => entry.shape !== "V3")
  || shellIds.has(queueHead.id) || shellIds.has(lateOpeningV3.id)) {
  throw new Error("Seeded numeric carriers violate the exact value/shape/post-melt-shell contract");
}

const sourceProjection = clone(sourceLevel);
const seededProjection = clone(level);
for (const projected of [sourceProjection, seededProjection]) {
  for (const block of projected.blocks) delete block.frozen;
}
if (!sameJson(sourceProjection, seededProjection)) {
  throw new Error("Carrier seed changed data outside block.frozen assignments");
}

const generatedOn = new Date().toISOString();
const artifact = {
  schema_version: "blockout-video-parity-lv77-numeric-carrier-runtime-seed-v1",
  generated_on: generatedOn,
  source: {
    contract: { path: display(contractPath), sha256: sha256(contractText) },
    levels: { path: display(levelsPath), sha256: sha256(levelsText) },
    assembly_audit: { path: display(assemblyAuditPath), sha256: sha256(assemblyAuditText) },
    base_seed: { path: display(baseSeedPath), sha256: sha256(baseSeedText) },
    runtime_authority: {
      path: "src/core/PuzzleModel.ts",
      bundled_with_dependencies_sha256: sha256(puzzleBundleSource),
    },
  },
  policy: {
    scope: "Lv077 numeric-ice carrier identity only",
    immutable: "all LevelSpec fields except block.frozen on two V3 carriers",
    contract_basis: "numeric_ice stage_scope=opening_or_unspecified; values=[6,18]; V3x2; post_melt_shell=0",
  },
  levels: [{ level_id: "Lv077", level }],
};
const hintedBaseEntry = clone(baseEntry);
hintedBaseEntry.target = clone(target);
hintedBaseEntry.carrier_assignments = {
  ...(hintedBaseEntry.carrier_assignments ?? {}),
  numeric_ice: seededNumericCarriers.map((entry) => ({
    block_id: entry.block_id,
    value: entry.value,
    shape: entry.shape,
  })),
};
const baseOverrideArtifact = {
  schema_version: "blockout-video-parity-base-overrides-v1",
  title: "Lv077 contract-bound numeric carrier identity seed",
  generated_on: generatedOn,
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    contract: { path: display(contractPath), sha256: sha256(contractText) },
    numeric_carrier_runtime_seed: { path: display(outputPath) },
  },
  scope: ["Lv077"],
  levels: [hintedBaseEntry],
};
const audit = {
  schema_version: "blockout-video-parity-lv77-numeric-carrier-runtime-seed-audit-v1",
  generated_on: generatedOn,
  sources: artifact.source,
  validation: {
    inherited_exact_contract: true,
    active_contract_target_exact: true,
    inherited_validate_level: "pass",
    seeded_validate_level: "pass",
    unchanged_outside_numeric_carriers: true,
    numeric_count: seededNumericCarriers.length,
    numeric_values: sortedNumbers(seededNumericCarriers.map((entry) => entry.value)),
    numeric_shape_histogram: { V3: seededNumericCarriers.filter((entry) => entry.shape === "V3").length },
    post_melt_shell_count: seededNumericCarriers.filter((entry) => shellIds.has(entry.block_id)).length,
  },
  inherited_numeric_carriers: inheritedNumericCarriers,
  seeded_numeric_carriers: seededNumericCarriers,
  generator_queue: generator.queueBlockIds,
};

await mkdir(outputDir, { recursive: true });
const writeAtomic = async (path, value) => {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rm(path, { force: true });
  await rename(temporary, path);
};
await Promise.all([
  writeAtomic(outputPath, artifact),
  writeAtomic(baseOverridePath, baseOverrideArtifact),
  writeAtomic(auditPath, audit),
]);
console.log(JSON.stringify({
  output: display(outputPath),
  base_override: display(baseOverridePath),
  audit: display(auditPath),
  seeded_numeric_carriers: seededNumericCarriers,
  generator_queue: generator.queueBlockIds,
}, null, 2));
