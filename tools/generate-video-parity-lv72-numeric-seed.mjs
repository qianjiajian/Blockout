import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Create the narrow Lv72 base override that keeps both opening V3 numeric-ice
 * carriers behind their exact 10/17 clear-layer deadlines.
 *
 * Geometry and composition come unchanged from the active v6 base candidate.
 * The only authored change is a fresh-replayed peel order/path witness obtained
 * from the mechanism-aware runtime solver.  Feeding that order back into the
 * assembler makes the global numeric assignment see the same feasible timing
 * that the complete runtime witness already demonstrated.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  baseCandidates: ".codex-temp/numeric-deadline-peel-full-r9/report/formal-candidates.json",
  runtimeRoutes: ".codex-temp/lv72-numeric-capacity/baseline-routes.json",
  outputDir: ".codex-temp/video-parity-lv72-numeric-seed",
};

const parseArgs = (argv) => {
  const parsed = { ...defaults };
  const names = new Map([
    ["--contract", "contract"],
    ["--base-candidates", "baseCandidates"],
    ["--runtime-routes", "runtimeRoutes"],
    ["--output-dir", "outputDir"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = names.get(argv[index]);
    if (!name) throw new Error(`Unknown option: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argv[index]}`);
    parsed[name] = value;
    index += 1;
  }
  return parsed;
};

const options = parseArgs(process.argv.slice(2));
const absolute = (path) => resolve(root, path);
const displayPath = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (source) => createHash("sha256").update(source).digest("hex").toUpperCase();
const pointKey = (x, y) => `${x},${y}`;
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
};

const [contractText, candidatesText, runtimeRoutesText] = await Promise.all([
  readFile(absolute(options.contract), "utf8"),
  readFile(absolute(options.baseCandidates), "utf8"),
  readFile(absolute(options.runtimeRoutes), "utf8"),
]);
const contract = JSON.parse(contractText);
const candidates = JSON.parse(candidatesText);
const runtimeRoutes = JSON.parse(runtimeRoutesText);
const contractEntry = contract.levels.find((entry) => entry.level_id === "Lv072");
const baseEntry = candidates.levels.find((entry) => Number(entry.level?.id ?? entry.id) === 72);
const runtimeRouteEntry = (Array.isArray(runtimeRoutes) ? runtimeRoutes : runtimeRoutes.levels ?? [])
  .find((entry) => entry.level_id === "Lv072");
if (!contractEntry || !baseEntry || !runtimeRouteEntry) {
  throw new Error("Lv072 contract, base candidate, or mechanism-aware runtime route is missing.");
}
const level = structuredClone(baseEntry.level ?? baseEntry);
const route = structuredClone(runtimeRouteEntry.drags ?? runtimeRouteEntry.route);
const coverValue = Number(contractEntry.our_design_target.mechanism_contract.covers?.values?.[0]);
if (level.shutters?.length !== 1 || !Number.isInteger(coverValue)) {
  throw new Error("Lv072 expected one exact countdown cover value.");
}
const inheritedPlaceholderCount = level.shutters[0].count;
// The geometry generator used opening_count (14) as a conservative staging
// placeholder.  Runtime parity requires the video-observed cover trigger 7;
// normalize that placeholder before proving the interleaved peel witness.
level.shutters[0].count = coverValue;

const bundle = await build({
  stdin: {
    contents: `export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: root,
    sourcefile: "lv72-numeric-seed-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const { PuzzleModel, validateLevel } = await import(moduleUrl);

const execute = (model, event) => {
  const block = model.getBlock(event.blockId);
  if (!block) return { ok: false, reason: `missing ${event.blockId}` };
  model.beginAction();
  for (const [x, y] of event.path ?? []) {
    const before = model.getBlock(event.blockId);
    const adjacent = before && Math.abs(before.x - x) + Math.abs(before.y - y) === 1;
    const moved = adjacent
      ? model.moveBlockStep(event.blockId, x, y)
      : model.moveBlock(event.blockId, x, y);
    const after = model.getBlock(event.blockId);
    if (!moved || !after || after.x !== x || after.y !== y) {
      model.cancelAction();
      return { ok: false, reason: `cannot move ${event.blockId} to ${x},${y}` };
    }
  }
  if (event.exitSide) {
    const exited = model.tryExit(event.blockId, event.exitSide);
    if (!exited.ok) {
      const status = model.exitAttemptStatus(event.blockId, event.exitSide);
      model.cancelAction();
      return { ok: false, reason: `cannot exit ${event.blockId} via ${event.exitSide}: ${status}` };
    }
  }
  if (!model.commitAction()) return { ok: false, reason: `${event.blockId} action is a no-op` };
  return { ok: true };
};

validateLevel(level);
const model = new PuzzleModel(level);
const timeline = [];
let clearLayers = 0;
for (let index = 0; index < route.length; index += 1) {
  const event = route[index];
  const before = model.snapshot().cleared;
  const result = execute(model, event);
  if (!result.ok) throw new Error(`Lv072 base replay event ${index + 1}: ${result.reason}`);
  const cleared = model.snapshot().cleared - before;
  timeline.push({
    event_index: index,
    block_id: event.blockId,
    clear_layers_before: clearLayers,
    clear_layers_added: cleared,
  });
  clearLayers += cleared;
}
const snapshot = model.snapshot();
if (!snapshot.complete) {
  throw new Error(`Lv072 base replay incomplete: ${snapshot.blocks.length} active / ${snapshot.queuedBlocks.length} queued remain.`);
}

const target = contractEntry.our_design_target;
const numericValues = [...target.mechanism_contract.numeric_ice.values].map(Number).sort((a, b) => b - a);
const v3Ids = level.blocks
  .filter((block) => {
    const normalized = block.shape.map(([x, y]) => [x - Math.min(...block.shape.map(([dx]) => dx)), y - Math.min(...block.shape.map(([, dy]) => dy))]);
    return normalized.length === 3 && new Set(normalized.map(([x]) => x)).size === 1;
  })
  .map((block) => block.id);
const capacities = v3Ids.map((blockId) => ({
  block_id: blockId,
  clear_layers_before_first_touch: timeline.find((entry) => entry.block_id === blockId)?.clear_layers_before ?? -1,
})).sort((left, right) => right.clear_layers_before_first_touch - left.clear_layers_before_first_touch);
if (capacities.length !== numericValues.length) {
  throw new Error(`Lv072 expected ${numericValues.length} V3 carriers, found ${capacities.length}.`);
}
const matching = numericValues.map((value, index) => ({
  value,
  block_id: capacities[index].block_id,
  clear_layers_before_first_touch: capacities[index].clear_layers_before_first_touch,
  feasible: capacities[index].clear_layers_before_first_touch >= value,
}));
if (!matching.every((entry) => entry.feasible)) {
  throw new Error(`Lv072 numeric deadline matching is not feasible: ${JSON.stringify(matching)}.`);
}

const expectedMask = target.board.playable_mask;
const actualMask = Array.from({ length: level.height }, (_, y) => Array.from(
  { length: level.width },
  (_, x) => level.playable.some(([cellX, cellY]) => cellX === x && cellY === y) ? "#" : ".",
).join(""));
const scalarChecks = {
  rows: level.height === target.board.rows,
  cols: level.width === target.board.cols,
  playable_cells: new Set(level.playable.map(([x, y]) => pointKey(x, y))).size === target.board.playable_cell_count,
  playable_mask: JSON.stringify(actualMask) === JSON.stringify(expectedMask),
  full_blocks: level.blocks.length === target.full_level_block_count,
  time_seconds: level.timeSeconds === target.time_seconds,
};
if (!Object.values(scalarChecks).every(Boolean)) {
  throw new Error(`Lv072 base scalar drift: ${JSON.stringify(scalarChecks)}.`);
}

const outputDir = absolute(options.outputDir);
const overridePath = resolve(outputDir, "base-overrides.json");
const auditPath = resolve(outputDir, "audit.json");
const override = {
  schema_version: "blockout-video-parity-lv72-numeric-deadline-base-override-v1",
  generated_on: new Date().toISOString(),
  source: {
    contract: { path: options.contract, sha256: sha256(contractText) },
    base_candidates: { path: options.baseCandidates, sha256: sha256(candidatesText) },
    mechanism_aware_runtime_route: { path: options.runtimeRoutes, sha256: sha256(runtimeRoutesText) },
  },
  policy: {
    scope: "Lv072 authored peel order/path only",
    immutable: "board, playable mask, block placement/shapes/colours/count, gates, stage partition, timer and every contract scalar",
    normalized_base_placeholder: `single staging shutter count ${inheritedPlaceholderCount} -> contracted cover value ${coverValue}`,
    proof: "fresh base validateLevel + PuzzleModel completion replay + Hall deadline matching for V3 values 17/10",
  },
  levels: [{
    level_id: "Lv072",
    target: structuredClone(target),
    level,
    route,
    validation: {
      validate_level: "pass",
      base_completion_replay: "pass",
      clear_layers: clearLayers,
      numeric_deadline_matching: matching,
      staging_placeholder_count_before: inheritedPlaceholderCount,
      staging_cover_count_after: coverValue,
    },
  }],
};
const overrideText = `${JSON.stringify(override, null, 2)}\n`;
const audit = {
  schema_version: "blockout-video-parity-lv72-numeric-deadline-audit-v1",
  generated_on: override.generated_on,
  source: override.source,
  output: {
    path: displayPath(overridePath),
    sha256: sha256(overrideText),
    canonical_level_sha256: sha256(JSON.stringify(canonical(level))),
    canonical_route_sha256: sha256(JSON.stringify(canonical(route))),
  },
  checks: {
    ...scalarChecks,
    validate_level: true,
    base_completion_replay: true,
    complete: snapshot.complete,
    clear_layers: clearLayers,
    events: route.length,
    staging_placeholder_count_before: inheritedPlaceholderCount,
    staging_cover_count_after: coverValue,
    numeric_deadline_matching: matching,
    all_numeric_deadlines_feasible: matching.every((entry) => entry.feasible),
  },
};
await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(overridePath, overrideText, "utf8"),
  writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify(audit, null, 2));
