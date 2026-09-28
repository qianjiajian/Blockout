import { build } from "esbuild";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

/**
 * Prototype-only necessary-reposition proof.
 *
 * Edge costs deliberately differ from solveLevelOptimally:
 *   - a drag that exits/clears one layer costs 0;
 *   - a drag that ends at a legal internal resting position costs 1.
 *
 * A 0-1 shortest-path search therefore minimizes reposition overhead directly.
 * Reaching a frontier whose cheapest cost is `target` proves that no solution
 * with overhead < target exists. Hitting MAX_STATES before that point is always
 * reported as inconclusive.
 */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const defaultInput = resolve(root, "playtest-results/experiments/competitor-composition-r140/formal-candidates-lv001-lv100.json");
const levelSolverPath = resolve(root, "src/core/levelSolver.ts");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
    value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
  )));
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const pathExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

function parseArgs(argv) {
  const options = {
    input: defaultInput,
    witnesses: null,
    runtimeAudit: null,
    expectedContractSha256: null,
    outputDir: scriptDir,
    reportTag: null,
    levels: "1-10",
    algorithm: process.env.PROOF_ALGORITHM ?? "bounded-dfs",
    maxStates: Number(process.env.MAX_STATES ?? 250_000),
    maxMemoryMb: Number(process.env.MAX_MEMORY_MB ?? 900),
    transpositionCap: Number(process.env.TRANSPOSITION_CAP ?? 150_000),
    symmetryReduction: process.env.SYMMETRY_REDUCTION === "1",
    zeroCostClosureReduction: process.env.ZERO_COST_CLOSURE_REDUCTION !== "0",
    relaxedBoundPruning: process.env.RELAXED_BOUND_PRUNING === "1",
    relaxedBoundRootOnly: process.env.RELAXED_BOUND_ROOT_ONLY === "1",
    relaxedBoundMaxStates: Number(process.env.RELAXED_BOUND_MAX_STATES ?? 5_000),
    officialMaxStates: Number(process.env.OFFICIAL_MAX_STATES ?? 8_000),
    validationMaxStates: Number(process.env.VALIDATION_MAX_STATES ?? 10_000),
    runOfficial: process.env.RUN_OFFICIAL === "1",
    continueAfterFloor: process.env.CONTINUE_AFTER_FLOOR === "1",
    write: true,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--input") { options.input = resolve(root, value); index += 1; }
    else if (argument === "--witnesses") { options.witnesses = resolve(root, value); index += 1; }
    else if (argument === "--runtime-audit") { options.runtimeAudit = resolve(root, value); index += 1; }
    else if (argument === "--expected-contract-sha256") { options.expectedContractSha256 = value.toUpperCase(); index += 1; }
    else if (argument === "--output-dir") { options.outputDir = resolve(root, value); index += 1; }
    else if (argument === "--report-tag") { options.reportTag = value.replace(/[^a-zA-Z0-9_-]+/g, "-"); index += 1; }
    else if (argument === "--levels") { options.levels = value; index += 1; }
    else if (argument === "--algorithm") { options.algorithm = value; index += 1; }
    else if (argument === "--max-states") { options.maxStates = Number(value); index += 1; }
    else if (argument === "--max-memory-mb") { options.maxMemoryMb = Number(value); index += 1; }
    else if (argument === "--transposition-cap") { options.transpositionCap = Number(value); index += 1; }
    else if (argument === "--symmetry-reduction") options.symmetryReduction = true;
    else if (argument === "--no-symmetry-reduction") options.symmetryReduction = false;
    else if (argument === "--zero-cost-closure-reduction") options.zeroCostClosureReduction = true;
    else if (argument === "--no-zero-cost-closure-reduction") options.zeroCostClosureReduction = false;
    else if (argument === "--relaxed-bound-pruning") options.relaxedBoundPruning = true;
    else if (argument === "--no-relaxed-bound-pruning") options.relaxedBoundPruning = false;
    else if (argument === "--relaxed-bound-root-only") options.relaxedBoundRootOnly = true;
    else if (argument === "--no-relaxed-bound-root-only") options.relaxedBoundRootOnly = false;
    else if (argument === "--relaxed-bound-max-states") { options.relaxedBoundMaxStates = Number(value); index += 1; }
    else if (argument === "--official-max-states") { options.officialMaxStates = Number(value); options.runOfficial = true; index += 1; }
    else if (argument === "--validation-max-states") { options.validationMaxStates = Number(value); index += 1; }
    else if (argument === "--official-crosscheck") options.runOfficial = true;
    else if (argument === "--skip-official") options.runOfficial = false;
    else if (argument === "--continue-after-floor") options.continueAfterFloor = true;
    else if (argument === "--stop-after-floor") options.continueAfterFloor = false;
    else if (argument === "--self-test") options.selfTest = true;
    else if (argument === "--no-write") options.write = false;
    else if (argument === "--help") {
      console.log([
        "Usage: node prove-reposition-lower-bound.mjs [options]",
        "  --input <json|ts>               candidate file or generated runtime module",
        "  --witnesses <json>              optional [{level_id,drags}] replay routes",
        "  --runtime-audit <json>           bind a generated runtime to its exact assembly audit",
        "  --expected-contract-sha256 <hex> require the authoritative contract SHA-256",
        "  --output-dir <path>              report output directory (default: tools)",
        "  --report-tag <text>             filename tag (default: inferred from input)",
        "  --levels <spec>                 e.g. 1-10,12,15 (default: 1-10)",
        "  --algorithm <name>              bounded-dfs (default) or zero-one",
        "  --max-states <n>                proof state cap (default: 250000)",
        "  --max-memory-mb <n>             RSS guard, maximum 1000 (default: 900)",
        "  --transposition-cap <n>         bounded DFS cache entries (default: 150000)",
        "  --symmetry-reduction            opt in to interchangeable-block canonicalization",
        "  --no-symmetry-reduction         retain exact block ids (default)",
        "  --zero-cost-closure-reduction    greedily clear monotone free exits when formally safe (default)",
        "  --no-zero-cost-closure-reduction disable monotone free-exit normalization",
        "  --relaxed-bound-pruning         opt in to a thresholded relaxed-parking lower bound",
        "  --no-relaxed-bound-pruning      disable relaxed lower-bound pruning (default)",
        "  --relaxed-bound-root-only       invoke the relaxed bound only once at the proof root",
        "  --no-relaxed-bound-root-only    allow enabled relaxed-bound calls below the root (default)",
        "  --relaxed-bound-max-states <n>  per-call relaxed-state cap (default: 5000)",
        "  --official-crosscheck           run optional solveLevelOptimally comparison",
        "  --skip-official                 omit official comparison (default)",
        "  --official-max-states <n>       enable comparison with cap (default cap: 8000)",
        "  --validation-max-states <n>     fallback solution-witness cap (default: 10000)",
        "  --continue-after-floor          continue toward exact minimum after proving target",
        "  --stop-after-floor              stop when < target is exhausted (default)",
        "  --self-test                     run deterministic proof classifications",
        "  --no-write                      print only; do not write reports",
      ].join("\n"));
      process.exit(0);
    }
  }
  for (const [name, value] of Object.entries({
    maxStates: options.maxStates,
    maxMemoryMb: options.maxMemoryMb,
    transpositionCap: options.transpositionCap,
    relaxedBoundMaxStates: options.relaxedBoundMaxStates,
    officialMaxStates: options.officialMaxStates,
    validationMaxStates: options.validationMaxStates,
  })) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive safe integer`);
  }
  if (!["bounded-dfs", "zero-one"].includes(options.algorithm)) throw new Error("algorithm must be bounded-dfs or zero-one");
  if (options.expectedContractSha256 && !/^[0-9A-F]{64}$/.test(options.expectedContractSha256)) {
    throw new Error("expectedContractSha256 must be a 64-character hexadecimal SHA-256");
  }
  if (options.maxMemoryMb > 1_000) throw new Error("maxMemoryMb may not exceed 1000; the proof process must remain below 1.2 GB RSS");
  if (options.transpositionCap > 600_000) throw new Error("transpositionCap may not exceed 600000 under the bounded proof memory budget");
  if (options.relaxedBoundMaxStates > 100_000) throw new Error("relaxedBoundMaxStates may not exceed 100000 under the prototype memory budget");
  if (options.officialMaxStates > 20_000 || options.validationMaxStates > 20_000) {
    throw new Error("official and fallback validation caps may not exceed 20000 under the prototype memory budget");
  }
  return options;
}

function parseLevelSelection(specification) {
  const selected = new Set();
  for (const token of specification.split(",").map((part) => part.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid level selection token: ${token}`);
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    if (from <= 0 || to < from) throw new Error(`Invalid level range: ${token}`);
    for (let id = from; id <= to; id += 1) selected.add(id);
  }
  return [...selected].sort((left, right) => left - right);
}

const options = parseArgs(process.argv.slice(2));
const selectedIds = parseLevelSelection(options.levels);

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { validateLevel, PuzzleModel } from "./src/core/PuzzleModel.ts";
      import { solveLevelForValidation, solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { validateLevel, PuzzleModel, solveLevelForValidation, solveLevelOptimally };
    `,
    resolveDir: root,
    sourcefile: "reposition-lower-bound-proof-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const isLevelSpec = (value) => Boolean(value && typeof value === "object"
  && Number.isSafeInteger(value.id) && Array.isArray(value.blocks) && Array.isArray(value.gates));

async function loadInputArtifact(path) {
  const text = await readFile(path, "utf8");
  if (extname(path).toLowerCase() === ".json") {
    const parsed = JSON.parse(text);
    const entries = Array.isArray(parsed) ? parsed : parsed.levels ?? parsed.LEVELS ?? [];
    const candidates = entries.map((entry) => {
      const level = entry?.level ?? entry?.level_spec ?? entry;
      if (!isLevelSpec(level)) return null;
      return entry?.level
        ? entry
        : {
          level_id: `Lv${String(level.id).padStart(3, "0")}`,
          target: {
            recommended_minimum_reposition_overhead: level.designTargets?.minimumRepositionOverhead ?? null,
          },
          level,
        };
    }).filter(Boolean);
    if (!candidates.length) throw new Error("JSON input does not contain recognizable LevelSpec records");
    return { text, candidates, bundledModuleSha256: null, selectedExport: null };
  }
  const bundle = await build({
    entryPoints: [path],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  const bytes = Buffer.from(bundle.outputFiles[0].contents);
  const module = await import(`data:text/javascript;base64,${bytes.toString("base64")}`);
  const priority = ["VIDEO_PARITY_LEVELS", "LEVELS", "GENERATED_LEVELS", "default"];
  let levels = null;
  let selectedExport = null;
  for (const name of [...priority, ...Object.keys(module).filter((name) => !priority.includes(name))]) {
    const value = module[name];
    const entries = Array.isArray(value) ? value : value?.levels ?? value?.LEVELS;
    if (Array.isArray(entries) && entries.length && entries.every(isLevelSpec)) {
      levels = entries;
      selectedExport = name;
      break;
    }
  }
  if (!levels) throw new Error("TypeScript input does not export a recognizable LevelSpec array");
  return {
    text,
    candidates: levels.map((level) => ({
      level_id: `Lv${String(level.id).padStart(3, "0")}`,
      target: {
        recommended_minimum_reposition_overhead: level.designTargets?.minimumRepositionOverhead ?? null,
      },
      level,
    })),
    bundledModuleSha256: sha256(bytes),
    selectedExport,
  };
}

const inputArtifact = await loadInputArtifact(options.input);
const inputText = inputArtifact.text;
const input = { levels: inputArtifact.candidates };
const inferredWitnessPath = resolve(dirname(options.input), "validation-routes.json");
const witnessPath = options.witnesses ?? inferredWitnessPath;
let witnessText = null;
let witnessInput = [];
try {
  witnessText = await readFile(witnessPath, "utf8");
  const parsed = JSON.parse(witnessText);
  witnessInput = Array.isArray(parsed) ? parsed : parsed.levels ?? parsed.routes ?? [];
} catch (error) {
  if (options.witnesses || error?.code !== "ENOENT") throw error;
}

async function loadRuntimeContractBinding() {
  if (!options.runtimeAudit) {
    return {
      requested: Boolean(options.expectedContractSha256),
      valid: options.expectedContractSha256 ? false : null,
      error: options.expectedContractSha256
        ? "expected contract SHA supplied without --runtime-audit"
        : null,
      path: null,
    };
  }
  const auditText = await readFile(options.runtimeAudit, "utf8");
  const audit = JSON.parse(auditText);
  const contractRelative = audit.inputs?.contract?.path;
  const contractPath = contractRelative ? resolve(root, contractRelative) : null;
  const contractText = contractPath && await pathExists(contractPath)
    ? await readFile(contractPath, "utf8")
    : null;
  const actualContractSha256 = contractText ? sha256(contractText) : null;
  const claimedContractSha256 = audit.inputs?.contract?.sha256?.toUpperCase?.() ?? null;
  const declaredOutputPath = audit.outputs?.levels ? resolve(root, audit.outputs.levels) : null;
  const declaredOutputSha256 = (audit.outputs?.levels_sha256
    ?? audit.outputs?.level_source_sha256
    ?? audit.outputs?.generated_levels_sha256)?.toUpperCase?.() ?? null;
  const actualCanonicalLevelSpecsSha256 = sha256(canonicalJson(
    input.levels.map((entry) => entry.level).sort((left, right) => left.id - right.id),
  ));
  const declaredCanonicalLevelSpecsSha256 = audit.outputs?.canonical_level_specs_sha256?.toUpperCase?.() ?? null;
  const samePath = (left, right) => Boolean(left && right
    && resolve(left).toLowerCase() === resolve(right).toLowerCase());
  const checks = {
    audit_has_contract_path: Boolean(contractPath),
    contract_file_exists: Boolean(contractText),
    audit_claim_matches_contract_file: Boolean(actualContractSha256
      && claimedContractSha256 === actualContractSha256),
    expected_sha_matches_contract_file: options.expectedContractSha256
      ? options.expectedContractSha256 === actualContractSha256
      : null,
    audit_output_matches_input: samePath(declaredOutputPath, options.input),
    audit_declares_output_sha256: Boolean(declaredOutputSha256),
    audit_output_sha_matches_input: Boolean(declaredOutputSha256
      && declaredOutputSha256 === sha256(inputText)),
    audit_declares_canonical_level_specs_sha256: Boolean(declaredCanonicalLevelSpecsSha256),
    audit_canonical_level_specs_sha_matches_input: Boolean(declaredCanonicalLevelSpecsSha256
      && declaredCanonicalLevelSpecsSha256 === actualCanonicalLevelSpecsSha256),
    emitted_level_count_matches_input: audit.summary?.emitted === input.levels.length,
    exact_contract_count_matches_input: audit.summary?.exact_contract === input.levels.length,
    validated_level_count_matches_input: audit.summary?.validate_level_passed === input.levels.length,
  };
  const failures = Object.entries(checks)
    .filter(([name, value]) => value === false
      && (name !== "expected_sha_matches_contract_file" || options.expectedContractSha256))
    .map(([name]) => name);
  return {
    requested: true,
    valid: failures.length === 0,
    error: failures.length ? `runtime/contract binding failed: ${failures.join(", ")}` : null,
    path: options.runtimeAudit,
    sha256: sha256(auditText),
    contract_path: contractPath,
    contract_sha256: actualContractSha256,
    audit_claimed_contract_sha256: claimedContractSha256,
    expected_contract_sha256: options.expectedContractSha256,
    declared_output_path: declaredOutputPath,
    declared_output_sha256: declaredOutputSha256,
    actual_input_source_sha256: sha256(inputText),
    declared_canonical_level_specs_sha256: declaredCanonicalLevelSpecsSha256,
    actual_canonical_level_specs_sha256: actualCanonicalLevelSpecsSha256,
    checks,
    audit_summary: audit.summary ?? null,
  };
}

const runtimeContractBinding = await loadRuntimeContractBinding();
const reportTag = options.reportTag ?? (basename(options.input, extname(options.input)).startsWith("formal-candidates")
  ? "formal"
  : basename(options.input, extname(options.input)).includes("r139") || options.input.includes("competitor-composition-r139")
    ? "r139"
    : basename(options.input, extname(options.input)).replace(/[^a-zA-Z0-9_-]+/g, "-"));
const levelSolverText = await readFile(levelSolverPath, "utf8");

const pointKey = (x, y) => `${x},${y}`;
const cellsAt = (block, x = block.x, y = block.y) => block.shape.map(([dx, dy]) => [x + dx, y + dy]);

const cloneState = (state) => ({
  blocks: state.blocks.map((block) => ({
    ...block,
    shape: block.shape.map(([x, y]) => [x, y]),
    layers: [...block.layers],
  })),
  gates: state.gates.map((gate) => ({ ...gate })),
  shutters: state.shutters.map((shutter) => ({ ...shutter })),
});

const initialState = (level) => ({
  blocks: level.blocks.map((block) => ({
    ...block,
    shape: block.shape.map(([x, y]) => [x, y]),
    layers: block.layers ? [...block.layers] : [block.color],
    frozen: block.frozen ?? 0,
  })),
  gates: level.gates.map((gate) => ({ ...gate, frozen: gate.frozen ?? 0 })),
  shutters: (level.shutters ?? []).map((shutter) => ({ ...shutter })),
});

// This key includes every mutable field used by levelSolver's transitions.
// Static shape/color/star/shutter ownership remains attached to the immutable
// block id; current color is also encoded defensively alongside the layer stack.
const stateKey = (state) => (
  `b:${state.blocks.map((block) => [
    block.id,
    `${block.x},${block.y}`,
    block.color,
    block.layers.join(","),
    block.frozen,
  ].join("@")).join("|")}`
  + `;g:${state.gates.map((gate) => `${gate.id ?? "gate"}:${gate.frozen}`).join(",")}`
  + `;s:${state.shutters.map((shutter) => `${shutter.id}:${shutter.count}`).join(",")}`
);

const staticBlockedCache = new WeakMap();
function staticBlockedFor(level) {
  const cached = staticBlockedCache.get(level);
  if (cached) return cached;
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => pointKey(x, y)));
  if (level.playable) {
    const playable = new Set(level.playable.map(([x, y]) => pointKey(x, y)));
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        if (!playable.has(pointKey(x, y))) blocked.add(pointKey(x, y));
      }
    }
  }
  staticBlockedCache.set(level, blocked);
  return blocked;
}

function active(state, block) {
  if (block.frozen > 0) return false;
  if (!block.shutterId) return true;
  return (state.shutters.find((shutter) => shutter.id === block.shutterId)?.count ?? 0) <= 0;
}

function placementConstraints(level, state, block) {
  const occupied = new Set();
  for (const other of state.blocks) {
    if (other.id === block.id) continue;
    const hidden = other.shutterId
      ? state.shutters.some((shutter) => shutter.id === other.shutterId && shutter.count > 0)
      : false;
    if (hidden) continue;
    for (const [x, y] of cellsAt(other)) occupied.add(pointKey(x, y));
  }
  for (const shutter of state.shutters) {
    if (shutter.count <= 0) continue;
    for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
      for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) occupied.add(pointKey(x, y));
    }
  }
  return { blocked: staticBlockedFor(level), occupied };
}

function canPlace(level, block, x, y, constraints) {
  return cellsAt(block, x, y).every(([cellX, cellY]) => (
    cellX >= 0 && cellY >= 0 && cellX < level.width && cellY < level.height
    && !constraints.blocked.has(pointKey(cellX, cellY))
    && !constraints.occupied.has(pointKey(cellX, cellY))
  ));
}

function exitSideAt(level, state, block, x, y, side) {
  const cells = cellsAt(block, x, y);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  const atEdge = side === "top" ? minY === 0
    : side === "bottom" ? maxY === level.height - 1
      : side === "left" ? minX === 0
        : maxX === level.width - 1;
  if (!atEdge) return false;
  return state.gates.some((gate) => {
    if (gate.side !== side || gate.frozen > 0 || gate.color !== block.layers[0]) return false;
    if (block.star && !gate.star) return false;
    return side === "top" || side === "bottom"
      ? minX >= gate.offset && maxX < gate.offset + gate.size
      : minY >= gate.offset && maxY < gate.offset + gate.size;
  });
}

function reachablePositions(level, state, block) {
  const start = pointKey(block.x, block.y);
  const reached = new Map([[start, { point: [block.x, block.y] }]]);
  const queue = [[block.x, block.y]];
  const constraints = placementConstraints(level, state, block);
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    const reachedByDragging = x !== block.x || y !== block.y;
    if (reachedByDragging && ["top", "right", "bottom", "left"]
      .some((side) => exitSideAt(level, state, block, x, y, side))) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = pointKey(nextX, nextY);
      if (reached.has(key) || !canPlace(level, block, nextX, nextY, constraints)) continue;
      reached.set(key, { point: [nextX, nextY], parent: pointKey(x, y) });
      queue.push([nextX, nextY]);
    }
  }
  return reached;
}

function pathTo(reached, target) {
  const path = [];
  let cursor = pointKey(target[0], target[1]);
  while (cursor) {
    const node = reached.get(cursor);
    if (!node) break;
    path.push(node.point);
    cursor = node.parent;
  }
  path.reverse();
  return path.slice(1);
}

function advanceConveyors(level, state) {
  const vectors = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
  for (const conveyor of level.conveyors ?? []) {
    const block = state.blocks.find((candidate) => candidate.id === conveyor.blockId);
    if (!block || !active(state, block)) continue;
    const onBelt = cellsAt(block).every(([x, y]) => (
      x >= conveyor.x && x < conveyor.x + conveyor.width
      && y >= conveyor.y && y < conveyor.y + conveyor.height
    ));
    if (!onBelt) continue;
    const [dx, dy] = vectors[conveyor.direction];
    if (canPlace(level, block, block.x + dx, block.y + dy, placementConstraints(level, state, block))) {
      block.x += dx;
      block.y += dy;
    }
  }
}

function advanceCounters(level, state, clearedId) {
  for (const gate of state.gates) gate.frozen = Math.max(0, gate.frozen - 1);
  for (const block of state.blocks) {
    if (block.id !== clearedId) block.frozen = Math.max(0, block.frozen - 1);
  }
  for (const shutter of state.shutters) shutter.count = Math.max(0, shutter.count - 1);
  advanceConveyors(level, state);
}

function applyDrag(level, state, drag) {
  const next = cloneState(state);
  const block = next.blocks.find((candidate) => candidate.id === drag.blockId);
  if (!block) return next;
  const destination = drag.path.at(-1);
  if (destination) [block.x, block.y] = destination;
  if (!drag.exitSide) return next;
  if (block.layers.length > 1) {
    block.layers.shift();
    block.color = block.layers[0];
  } else {
    next.blocks = next.blocks.filter((candidate) => candidate.id !== block.id);
  }
  advanceCounters(level, next, block.id);
  return next;
}

function transitions(level, state) {
  const unique = new Map();
  for (const block of state.blocks) {
    if (!active(state, block)) continue;
    const reached = reachablePositions(level, state, block);
    for (const { point } of reached.values()) {
      const path = pathTo(reached, point);
      let automaticExit = false;
      for (const side of ["top", "right", "bottom", "left"]) {
        if (!exitSideAt(level, state, block, point[0], point[1], side)) continue;
        automaticExit = true;
        const drag = { blockId: block.id, path, exitSide: side };
        const next = applyDrag(level, state, drag);
        const key = stateKey(next);
        const candidate = { drag, state: next, key, weight: 0 };
        const previous = unique.get(key);
        if (!previous || candidate.weight < previous.weight || drag.path.length < previous.drag.path.length) unique.set(key, candidate);
      }
      if (path.length && !automaticExit) {
        const drag = { blockId: block.id, path };
        const next = applyDrag(level, state, drag);
        const key = stateKey(next);
        const candidate = { drag, state: next, key, weight: 1 };
        const previous = unique.get(key);
        if (!previous || candidate.weight < previous.weight || (candidate.weight === previous.weight && drag.path.length < previous.drag.path.length)) {
          unique.set(key, candidate);
        }
      }
    }
  }
  return [...unique.values()].sort((left, right) => left.weight - right.weight || left.drag.path.length - right.drag.path.length);
}

const canonicalIdentityCache = new WeakMap();
const KNOWN_LEVEL_FIELDS = new Set([
  "id", "name", "difficulty", "timeSeconds", "reward", "parMoves", "width", "height",
  "playable", "blocked", "gates", "blocks", "shutters", "elevators", "conveyors",
  "designTargets", "onboardingHint", "strategyNudge", "strategyFocus", "featureIntro",
]);

function collectReferencedBlockIds(value, validBlockIds, referenced = new Set(), key = "", seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return referenced;
  seen.add(value);
  if (Array.isArray(value)) {
    if (/Ids$/i.test(key)) {
      for (const item of value) if (typeof item === "string" && validBlockIds.has(item)) referenced.add(item);
    }
    for (const item of value) collectReferencedBlockIds(item, validBlockIds, referenced, key, seen);
    return referenced;
  }
  for (const [field, item] of Object.entries(value)) {
    if (field === "blocks") continue;
    if (/Id$/i.test(field) && typeof item === "string" && validBlockIds.has(item)) referenced.add(item);
    else collectReferencedBlockIds(item, validBlockIds, referenced, field, seen);
  }
  return referenced;
}

function canonicalIdentityFor(level) {
  let identity = canonicalIdentityCache.get(level);
  if (identity) return identity;
  const unknownLevelFields = Object.keys(level).filter((field) => !KNOWN_LEVEL_FIELDS.has(field));
  const validBlockIds = new Set(level.blocks.map((block) => block.id));
  const idBoundBlocks = collectReferencedBlockIds(level, validBlockIds);
  // A future top-level mechanism may bind block identity using a field name
  // unknown to this proof. Fail closed by disabling block interchangeability
  // for that level rather than silently assuming the new mechanic is symmetric.
  if (unknownLevelFields.length) {
    for (const block of level.blocks) idBoundBlocks.add(block.id);
  }
  identity = new Map(level.blocks.map((block) => [block.id, {
      shape: block.shape.map(([x, y]) => `${x}:${y}`).sort().join(";"),
      star: Boolean(block.star),
      shutterId: block.shutterId ?? "",
      idBound: idBoundBlocks.has(block.id),
      unknownLevelFields,
    }]));
  canonicalIdentityCache.set(level, identity);
  return identity;
}

function canonicalStateKey(level, state) {
  const identity = canonicalIdentityFor(level);
  const groups = new Map();
  for (const block of state.blocks) {
    const fixed = identity.get(block.id);
    const signature = [
      fixed?.idBound ? block.id : "interchangeable",
      fixed?.shape ?? block.shape.map(([x, y]) => `${x}:${y}`).sort().join(";"),
      fixed?.star ? "star" : "plain",
      fixed?.shutterId ?? block.shutterId ?? "",
      block.color,
      block.layers.join(","),
      block.frozen,
    ].join("@");
    const positions = groups.get(signature) ?? [];
    positions.push(`${block.x},${block.y}`);
    groups.set(signature, positions);
  }
  const blocks = [...groups.entries()]
    .map(([signature, positions]) => `${signature}=[${positions.sort().join("|")}]`)
    .sort()
    .join(";");
  return `b:${blocks}`
    + `;g:${state.gates.map((gate) => `${gate.id ?? "gate"}:${gate.frozen}`).join(",")}`
    + `;s:${state.shutters.map((shutter) => `${shutter.id}:${shutter.count}`).join(",")}`;
}

function* lazyTransitions(level, state, includeRepositions, proofKey) {
  const unique = new Set();
  const reachableByBlock = [];
  for (const block of state.blocks) {
    if (!active(state, block)) continue;
    const reached = reachablePositions(level, state, block);
    reachableByBlock.push({
      block,
      points: [...reached.values()].map(({ point }) => ({
        path: pathTo(reached, point),
        point,
        exitSides: ["top", "right", "bottom", "left"]
          .filter((side) => exitSideAt(level, state, block, point[0], point[1], side)),
      })),
    });
  }
  for (const weight of includeRepositions ? [0, 1] : [0]) {
    for (const { block, points } of reachableByBlock) {
      for (const { path, exitSides } of points) {
        if (weight === 0) {
          for (const exitSide of exitSides) {
            const drag = { blockId: block.id, path, exitSide };
            const next = applyDrag(level, state, drag);
            const key = proofKey(next);
            if (unique.has(key)) continue;
            unique.add(key);
            yield { drag, state: next, key, weight: 0 };
          }
        } else if (path.length && !exitSides.length) {
          const drag = { blockId: block.id, path };
          const next = applyDrag(level, state, drag);
          const key = proofKey(next);
          if (unique.has(key)) continue;
          unique.add(key);
          yield { drag, state: next, key, weight: 1 };
        }
      }
    }
  }
}

class BoundedDominanceTable {
  constructor(capacity) {
    this.capacity = capacity;
    this.values = new Map();
    this.evicted = 0;
    this.peakSize = 0;
  }

  dominated(key, cost) {
    const previous = this.values.get(key);
    if (previous !== undefined && previous <= cost) return true;
    if (this.values.size >= this.capacity) {
      const deleteCount = Math.max(1, Math.ceil(this.capacity / 4));
      let deleted = 0;
      for (const staleKey of this.values.keys()) {
        this.values.delete(staleKey);
        deleted += 1;
        if (deleted >= deleteCount) break;
      }
      this.evicted += deleted;
    }
    this.values.set(key, cost);
    this.peakSize = Math.max(this.peakSize, this.values.size);
    return false;
  }

  get size() { return this.values.size; }
}

class ZeroOneDeque {
  front = [];
  back = [];
  backHead = 0;

  pushFront(value) { this.front.push(value); }
  pushBack(value) { this.back.push(value); }
  peek() { return this.front.length ? this.front.at(-1) : this.back[this.backHead]; }
  shift() { return this.front.length ? this.front.pop() : this.back[this.backHead++]; }
  get size() { return this.front.length + this.back.length - this.backHead; }
}

function reconstruct(records, nodeId) {
  const route = [];
  let cursor = nodeId;
  while (cursor !== 0) {
    const record = records[cursor];
    if (!record) throw new Error(`Broken proof predecessor chain at record ${cursor}`);
    route.push(record.drag);
    cursor = record.parentId;
  }
  route.reverse();
  return route;
}

function replayRoute(level, drags) {
  const model = new runtime.PuzzleModel(level);
  for (let index = 0; index < drags.length; index += 1) {
    const drag = drags[index];
    model.beginAction();
    for (const [x, y] of drag.path) {
      if (!model.moveBlock(drag.blockId, x, y)) {
        return { replayed: false, complete: false, failed_at: index, reason: `moveBlock rejected ${drag.blockId} -> ${x},${y}` };
      }
    }
    if (drag.exitSide) {
      const exit = model.tryExit(drag.blockId, drag.exitSide);
      if (!exit.ok) return { replayed: false, complete: false, failed_at: index, reason: `tryExit rejected ${drag.blockId} -> ${drag.exitSide}` };
    }
    if (!model.commitAction()) return { replayed: false, complete: false, failed_at: index, reason: `commitAction rejected ${drag.blockId}` };
  }
  const complete = model.snapshot().complete;
  return { replayed: complete, complete, failed_at: complete ? null : drags.length, reason: complete ? null : "route ended before completion" };
}

function routeMetrics(drags) {
  return {
    actions: drags.length,
    exits: drags.filter((drag) => Boolean(drag.exitSide)).length,
    repositions: drags.filter((drag) => !drag.exitSide).length,
    grid_steps: drags.reduce((sum, drag) => sum + drag.path.length, 0),
  };
}

function relaxedBoundEligible(level) {
  // Removing a parked blocker can change a mandatory conveyor advance. The
  // current relaxed model has no stay/move branching, so fail closed here.
  // Elevators are runtime-driven and are not represented in levelSolver.ts.
  return !(level.conveyors?.length) && !(level.elevators?.length);
}

function relaxedStateKey(state) {
  const parked = state.parked
    .map((block) => `${block.id}@${block.color}:${block.layers.join(",")}:${block.frozen}`)
    .sort()
    .join("|");
  return `${stateKey(state.board)};p:${parked}`;
}

function cloneRelaxedState(state) {
  return {
    board: cloneState(state.board),
    parked: state.parked.map((block) => ({
      ...block,
      shape: block.shape.map(([x, y]) => [x, y]),
      layers: [...block.layers],
    })),
  };
}

function advanceRelaxedCounters(level, state, clearedId) {
  advanceCounters(level, state.board, clearedId);
  for (const block of state.parked) {
    if (block.id !== clearedId) block.frozen = Math.max(0, block.frozen - 1);
  }
}

function canExitParked(state, block) {
  if (block.frozen > 0) return false;
  return state.board.gates.some((gate) => gate.frozen <= 0 && gate.color === block.layers[0]);
}

/**
 * Determines only whether every relaxed completion below `threshold` has been
 * excluded. A resource cap is always an unproven result and therefore never
 * authorizes a real-search prune.
 */
function certifyRelaxedParkingThreshold(level, start, threshold, { maxStates, maxMemoryMb }) {
  if (!Number.isSafeInteger(threshold) || threshold <= 0) throw new Error(`Invalid relaxed threshold ${threshold}`);
  if (!relaxedBoundEligible(level)) {
    return { eligible: false, certified: false, exactMinimum: null, exploredStates: 0, haltReason: "unsupported_dynamic_mechanism" };
  }

  const initial = { board: cloneState(start), parked: [] };
  const buckets = Array.from({ length: threshold }, () => []);
  const best = new Map([[relaxedStateKey(initial), 0]]);
  buckets[0].push(initial);
  let exploredStates = 0;
  let generatedTransitions = 0;
  const memoryStopMb = Math.max(1, maxMemoryMb - 8);

  const enqueue = (state, cost) => {
    if (cost >= threshold) return;
    const key = relaxedStateKey(state);
    if (cost >= (best.get(key) ?? Number.POSITIVE_INFINITY)) return;
    best.set(key, cost);
    buckets[cost].push(state);
    generatedTransitions += 1;
  };

  for (let cost = 0; cost < threshold; cost += 1) {
    while (buckets[cost].length) {
      const stateAtCost = buckets[cost].pop();
      const nodeKey = relaxedStateKey(stateAtCost);
      if (best.get(nodeKey) !== cost) continue;
      if (!stateAtCost.board.blocks.length && !stateAtCost.parked.length) {
        return {
          eligible: true,
          certified: false,
          exactMinimum: cost,
          exploredStates,
          generatedTransitions,
          haltReason: "relaxed_completion_below_threshold",
        };
      }
      if (exploredStates >= maxStates) {
        return {
          eligible: true,
          certified: false,
          exactMinimum: null,
          exploredStates,
          generatedTransitions,
          haltReason: "relaxed_state_cap_unproven",
        };
      }
      if (exploredStates % 16 === 0 && process.memoryUsage().rss / 1048576 >= memoryStopMb) {
        return {
          eligible: true,
          certified: false,
          exactMinimum: null,
          exploredStates,
          generatedTransitions,
          haltReason: "relaxed_memory_cap_unproven",
        };
      }
      exploredStates += 1;

      for (const transition of lazyTransitions(level, stateAtCost.board, false, stateKey)) {
        const state = cloneRelaxedState(stateAtCost);
        state.board = transition.state;
        for (const parked of state.parked) {
          if (parked.id !== transition.drag.blockId) parked.frozen = Math.max(0, parked.frozen - 1);
        }
        enqueue(state, cost);
      }

      for (const parked of stateAtCost.parked) {
        if (!canExitParked(stateAtCost, parked)) continue;
        const state = cloneRelaxedState(stateAtCost);
        const exiting = state.parked.find((block) => block.id === parked.id);
        if (exiting.layers.length > 1) {
          exiting.layers.shift();
          exiting.color = exiting.layers[0];
        } else {
          state.parked = state.parked.filter((block) => block.id !== exiting.id);
        }
        advanceRelaxedCounters(level, state, exiting.id);
        enqueue(state, cost);
      }

      if (cost + 1 >= threshold) continue;
      for (const block of stateAtCost.board.blocks) {
        const state = cloneRelaxedState(stateAtCost);
        const parked = state.board.blocks.find((candidate) => candidate.id === block.id);
        state.board.blocks = state.board.blocks.filter((candidate) => candidate.id !== block.id);
        state.parked.push(parked);
        enqueue(state, cost + 1);
      }
    }
  }

  return {
    eligible: true,
    certified: true,
    exactMinimum: null,
    certifiedLowerBound: threshold,
    exploredStates,
    generatedTransitions,
    haltReason: "all_relaxed_states_below_threshold_exhausted",
  };
}

function proveMinimumRepositionZeroOne(level, target, { maxStates, continueAfterFloor, maxMemoryMb = 1_000 }) {
  const startedAt = performance.now();
  const start = initialState(level);
  const startKey = stateKey(start);
  const deque = new ZeroOneDeque();
  const records = [{ parentId: null, drag: null }];
  const best = new Map([[startKey, { cost: 0, nodeId: 0 }]]);
  deque.pushBack({ state: start, key: startKey, cost: 0, nodeId: 0 });

  let exploredStates = 0;
  let generatedTransitions = 0;
  let zeroCostTransitions = 0;
  let oneCostTransitions = 0;
  let peakFrontier = 1;
  let highestProcessedCost = -1;
  let lowerBoundProvenAtStates = null;
  let solutionNode = null;
  let haltReason = null;
  let peakRssMb = Math.round(process.memoryUsage().rss / 104857.6) / 10;
  const memoryStopMb = Math.max(1, maxMemoryMb - 8);

  const cleanPeek = () => {
    while (deque.size) {
      const node = deque.peek();
      const current = best.get(node.key);
      if (current?.cost === node.cost && current.nodeId === node.nodeId) return node;
      deque.shift();
    }
    return undefined;
  };

  while (true) {
    const frontier = cleanPeek();
    if (!frontier) { haltReason = "state_graph_exhausted"; break; }

    if (target !== null && target !== undefined && lowerBoundProvenAtStates === null && frontier.cost >= target) {
      lowerBoundProvenAtStates = exploredStates;
      if (!continueAfterFloor) { haltReason = "target_lower_bound_reached"; break; }
    }
    if (exploredStates >= maxStates) { haltReason = "state_cap_exhausted"; break; }
    if (exploredStates % 16 === 0) {
      const rssMb = process.memoryUsage().rss / 1048576;
      peakRssMb = Math.max(peakRssMb, Math.round(rssMb * 10) / 10);
      if (rssMb >= memoryStopMb) { haltReason = "memory_cap_exhausted"; break; }
    }

    const node = deque.shift();
    exploredStates += 1;
    highestProcessedCost = Math.max(highestProcessedCost, node.cost);
    if (!node.state.blocks.length) { solutionNode = node; haltReason = "minimum_solution_popped"; break; }

    for (const transition of transitions(level, node.state)) {
      generatedTransitions += 1;
      if (transition.weight === 0) zeroCostTransitions += 1;
      else oneCostTransitions += 1;
      const cost = node.cost + transition.weight;
      if (cost >= (best.get(transition.key)?.cost ?? Number.POSITIVE_INFINITY)) continue;
      const nodeId = records.length;
      records.push({ parentId: node.nodeId, drag: transition.drag });
      best.set(transition.key, { cost, nodeId });
      const nextNode = { state: transition.state, key: transition.key, cost, nodeId };
      if (transition.weight === 0) deque.pushFront(nextNode);
      else deque.pushBack(nextNode);
    }
    peakFrontier = Math.max(peakFrontier, deque.size);
  }

  const frontier = cleanPeek();
  if (target !== null && target !== undefined && lowerBoundProvenAtStates === null && frontier && frontier.cost >= target) {
    lowerBoundProvenAtStates = exploredStates;
  }
  const graphExhausted = haltReason === "state_graph_exhausted";
  const route = solutionNode ? reconstruct(records, solutionNode.nodeId) : [];
  const minimum = solutionNode?.cost ?? null;
  const floorStatementProven = target === null || target === undefined
    ? null
    : minimum !== null
      ? minimum >= target
      : lowerBoundProvenAtStates !== null || graphExhausted;
  const floorDisproven = target === null || target === undefined ? false : minimum !== null && minimum < target;

  let status;
  if (solutionNode && floorDisproven) status = "floor_disproven_exact_minimum";
  else if (solutionNode) status = target === null || target === undefined ? "exact_minimum_proven" : "exact_minimum_and_floor_proven";
  else if (graphExhausted) status = "no_solution_in_complete_levelsolver_graph";
  else if (floorStatementProven && haltReason === "state_cap_exhausted") status = "floor_proven_minimum_inconclusive_state_cap";
  else if (floorStatementProven && haltReason === "memory_cap_exhausted") status = "floor_proven_minimum_inconclusive_memory_cap";
  else if (floorStatementProven) status = "floor_lower_bound_proven_minimum_inconclusive";
  else status = haltReason === "memory_cap_exhausted" ? "inconclusive_memory_cap" : "inconclusive_state_cap";

  const endRssMb = Math.round(process.memoryUsage().rss / 104857.6) / 10;
  peakRssMb = Math.max(peakRssMb, endRssMb);

  return {
    status,
    target_reposition_overhead: target,
    exact_minimum_reposition_overhead: minimum,
    lower_bound_statement_proven: floorStatementProven,
    lower_bound_proven_at_states: lowerBoundProvenAtStates,
    floor_disproven: floorDisproven,
    graph_exhausted: graphExhausted,
    halt_reason: haltReason,
    frontier_minimum_cost: frontier?.cost ?? null,
    explored_states: exploredStates,
    discovered_states: best.size,
    generated_transitions: generatedTransitions,
    zero_cost_transitions: zeroCostTransitions,
    one_cost_transitions: oneCostTransitions,
    peak_frontier: peakFrontier,
    highest_processed_cost: highestProcessedCost,
    memory_guard_mb: maxMemoryMb,
    memory_stop_threshold_mb: memoryStopMb,
    peak_rss_mb: peakRssMb,
    end_rss_mb: endRssMb,
    elapsed_ms: Math.round((performance.now() - startedAt) * 100) / 100,
    route: solutionNode ? { metrics: routeMetrics(route), drags: route } : null,
  };
}

function allRemainingLayersHaveGate(level, state) {
  return state.blocks.every((block) => block.layers.every((color) => level.gates.some((gate) => (
    gate.color === color && (!block.star || gate.star)
  ))));
}

function zeroCostClosureEligible(level) {
  return !(level.shutters?.length)
    && !(level.generators?.length)
    && !(level.elevators?.length)
    && !(level.conveyors?.length)
    && level.blocks.every((block) => !block.shutterId && !block.triggerBlockIds?.length
      && !block.locked && !block.lockCount && !block.keyToken && !block.keyId && !block.lockedBy);
}

function monotoneZeroCostClearEligible(block) {
  const layers = block.layers?.length ? block.layers : [block.color];
  return layers.length === 1 || layers.every((color) => color === layers[0]);
}

/**
 * On an eligible level, a selected zero-cost transition either removes a
 * single-layer block or peels a shell whose remaining layers all have the same
 * colour. It therefore frees space or preserves the exact footprint/colour,
 * while only decreasing monotone counters. Every solution can be normalized
 * to take such a clear immediately. Different-colour shells remain explicit
 * branches because peeling one can create a new blocker at the gate.
 */
function canonicalZeroCostClosure(level, state, proofKey) {
  let closed = state;
  const drags = [];
  while (closed.blocks.length) {
    let transition;
    for (const block of closed.blocks) {
      if (!active(closed, block)) continue;
      if (!monotoneZeroCostClearEligible(block)) continue;
      const reached = reachablePositions(level, closed, block);
      for (const { point } of reached.values()) {
        const exitSide = ["top", "right", "bottom", "left"]
          .find((side) => exitSideAt(level, closed, block, point[0], point[1], side));
        if (!exitSide) continue;
        const drag = { blockId: block.id, path: pathTo(reached, point), exitSide };
        const next = applyDrag(level, closed, drag);
        transition = { drag, state: next, key: proofKey(next), weight: 0 };
        break;
      }
      if (transition) break;
    }
    if (!transition) break;
    closed = transition.state;
    drags.push(transition.drag);
  }
  return { state: closed, drags };
}

function proveMinimumRepositionBoundedDfs(level, target, {
  maxStates,
  maxMemoryMb,
  transpositionCap,
  symmetryReduction = false,
  zeroCostClosureReduction = true,
  relaxedBoundPruning = false,
  relaxedBoundRootOnly = false,
  relaxedBoundMaxStates = 5_000,
}) {
  if (target === null || target === undefined) {
    return proveMinimumRepositionZeroOne(level, target, { maxStates, continueAfterFloor: true });
  }
  if (!Number.isSafeInteger(target) || target < 0) throw new Error(`Invalid reposition target ${target} for level ${level.id}`);

  const startedAt = performance.now();
  const repositionBudget = target - 1;
  const table = new BoundedDominanceTable(transpositionCap);
  const pathBest = new Map();
  const relaxedBoundCache = new Map();
  const currentRoute = [];
  let counterexample = null;
  let abortReason = null;
  let exploredStates = 0;
  let generatedTransitions = 0;
  let zeroCostTransitions = 0;
  let oneCostTransitions = 0;
  let zeroCostClosureCalls = 0;
  let zeroCostClosureClears = 0;
  let dominancePrunes = 0;
  let pathCyclePrunes = 0;
  let missingGatePrunes = 0;
  let relaxedBoundCalls = 0;
  let relaxedBoundPrunes = 0;
  let relaxedBoundCapResults = 0;
  let relaxedBoundExploredStates = 0;
  let peakDepth = 0;
  let highestProcessedCost = -1;
  let peakRssMb = Math.round(process.memoryUsage().rss / 104857.6) / 10;
  const proofKey = symmetryReduction ? (state) => canonicalStateKey(level, state) : stateKey;
  const memoryStopMb = Math.max(1, maxMemoryMb - 8);

  const checkResourceLimits = () => {
    if (exploredStates >= maxStates) {
      abortReason = "state_cap_exhausted";
      return false;
    }
    if (exploredStates % 16 === 0) {
      const rssMb = process.memoryUsage().rss / 1048576;
      peakRssMb = Math.max(peakRssMb, Math.round(rssMb * 10) / 10);
      if (rssMb >= memoryStopMb) {
        abortReason = "memory_cap_exhausted";
        return false;
      }
    }
    return true;
  };

  const closureEnabled = zeroCostClosureReduction && zeroCostClosureEligible(level);

  const visitClosed = (state, repositionCost) => {
    if (!state.blocks.length) {
      counterexample = { cost: repositionCost, drags: currentRoute.map((drag) => ({ ...drag, path: drag.path.map(([x, y]) => [x, y]) })) };
      return true;
    }
    if (repositionCost > repositionBudget || abortReason) return false;
    if (!checkResourceLimits()) return false;

    const key = proofKey(state);
    const ancestorCost = pathBest.get(key);
    if (ancestorCost !== undefined && ancestorCost <= repositionCost) {
      pathCyclePrunes += 1;
      return false;
    }
    if (table.dominated(key, repositionCost)) {
      dominancePrunes += 1;
      return false;
    }

    exploredStates += 1;
    highestProcessedCost = Math.max(highestProcessedCost, repositionCost);
    if (!allRemainingLayersHaveGate(level, state)) {
      missingGatePrunes += 1;
      return false;
    }

    if (relaxedBoundPruning && relaxedBoundEligible(level) && (!relaxedBoundRootOnly || currentRoute.length === 0)) {
      const neededLowerBound = repositionBudget - repositionCost + 1;
      const relaxedKey = stateKey(state);
      let cached = relaxedBoundCache.get(relaxedKey);
      let shouldPrune = cached?.exactMinimum !== null && cached?.exactMinimum !== undefined
        ? cached.exactMinimum >= neededLowerBound
        : (cached?.certifiedLowerBound ?? 0) >= neededLowerBound;
      const exactKnownBelowThreshold = cached?.exactMinimum !== null && cached?.exactMinimum !== undefined
        && cached.exactMinimum < neededLowerBound;
      if (!shouldPrune && !exactKnownBelowThreshold) {
        relaxedBoundCalls += 1;
        const relaxed = certifyRelaxedParkingThreshold(level, state, neededLowerBound, {
          maxStates: relaxedBoundMaxStates,
          maxMemoryMb,
        });
        relaxedBoundExploredStates += relaxed.exploredStates;
        if (relaxed.haltReason === "relaxed_state_cap_unproven" || relaxed.haltReason === "relaxed_memory_cap_unproven") {
          relaxedBoundCapResults += 1;
        }
        cached = cached ?? { exactMinimum: null, certifiedLowerBound: 0 };
        if (relaxed.exactMinimum !== null) cached.exactMinimum = relaxed.exactMinimum;
        if (relaxed.certified) cached.certifiedLowerBound = Math.max(cached.certifiedLowerBound, relaxed.certifiedLowerBound);
        if (relaxed.exactMinimum !== null || relaxed.certified) relaxedBoundCache.set(relaxedKey, cached);
        shouldPrune = relaxed.certified;
      }
      if (shouldPrune) {
        relaxedBoundPrunes += 1;
        return false;
      }
    }

    if (closureEnabled) {
      const closure = canonicalZeroCostClosure(level, state, proofKey);
      if (closure.drags.length) {
        zeroCostClosureCalls += 1;
        zeroCostClosureClears += closure.drags.length;
        generatedTransitions += closure.drags.length;
        zeroCostTransitions += closure.drags.length;
        for (const drag of closure.drags) currentRoute.push(drag);
        const stop = visit(closure.state, repositionCost);
        currentRoute.length -= closure.drags.length;
        return stop;
      }
    }

    const previousPathCost = pathBest.get(key);
    pathBest.set(key, repositionCost);
    peakDepth = Math.max(peakDepth, currentRoute.length);
    const layersBefore = state.blocks.reduce((sum, block) => sum + block.layers.length, 0);
    try {
      for (const transition of lazyTransitions(level, state, repositionCost < repositionBudget, proofKey)) {
        generatedTransitions += 1;
        if (transition.weight === 0) {
          zeroCostTransitions += 1;
          const layersAfter = transition.state.blocks.reduce((sum, block) => sum + block.layers.length, 0);
          if (layersAfter !== layersBefore - 1) {
            throw new Error(`Zero-cost edge did not clear exactly one layer at level ${level.id}`);
          }
        } else {
          oneCostTransitions += 1;
        }
        const nextCost = repositionCost + transition.weight;
        if (nextCost > repositionBudget) continue;
        currentRoute.push(transition.drag);
        const stop = visit(transition.state, nextCost);
        currentRoute.pop();
        if (stop || abortReason) return stop;
      }
    } finally {
      if (previousPathCost === undefined) pathBest.delete(key);
      else pathBest.set(key, previousPathCost);
    }
    return false;
  };

  const visit = visitClosed;

  if (repositionBudget >= 0) visit(initialState(level), 0);
  const lowerBoundProven = !counterexample && !abortReason;
  const floorDisproven = Boolean(counterexample);
  const endRssMb = Math.round(process.memoryUsage().rss / 104857.6) / 10;
  peakRssMb = Math.max(peakRssMb, endRssMb);
  const route = counterexample?.drags ?? [];
  const status = abortReason === "state_cap_exhausted" ? "inconclusive_state_cap"
    : abortReason === "memory_cap_exhausted" ? "inconclusive_memory_cap"
      : floorDisproven ? "floor_disproven_counterexample"
        : "floor_lower_bound_proven_minimum_inconclusive";

  return {
    algorithm: "bounded-dfs",
    status,
    target_reposition_overhead: target,
    searched_reposition_budget: repositionBudget,
    exact_minimum_reposition_overhead: null,
    counterexample_reposition_overhead: counterexample?.cost ?? null,
    lower_bound_statement_proven: lowerBoundProven,
    lower_bound_proven_at_states: lowerBoundProven ? exploredStates : null,
    floor_disproven: floorDisproven,
    graph_exhausted: false,
    halt_reason: abortReason ?? (floorDisproven ? "counterexample_solution_found" : "bounded_search_exhausted_below_target"),
    frontier_minimum_cost: lowerBoundProven ? target : null,
    explored_states: exploredStates,
    discovered_states: table.size,
    discovered_states_semantics: "retained transposition entries at end; evicted entries may be re-explored without weakening correctness",
    generated_transitions: generatedTransitions,
    zero_cost_transitions: zeroCostTransitions,
    one_cost_transitions: oneCostTransitions,
    zero_cost_closure_reduction_requested: zeroCostClosureReduction,
    zero_cost_closure_reduction_eligible: zeroCostClosureEligible(level),
    zero_cost_closure_reduction_applied: closureEnabled,
    zero_cost_closure_calls: zeroCostClosureCalls,
    zero_cost_closure_clears: zeroCostClosureClears,
    dominance_prunes: dominancePrunes,
    path_cycle_prunes: pathCyclePrunes,
    missing_gate_prunes: missingGatePrunes,
    relaxed_bound_pruning: relaxedBoundPruning,
    relaxed_bound_root_only: relaxedBoundRootOnly,
    relaxed_bound_eligible: relaxedBoundEligible(level),
    relaxed_bound_calls: relaxedBoundCalls,
    relaxed_bound_prunes: relaxedBoundPrunes,
    relaxed_bound_cap_results: relaxedBoundCapResults,
    relaxed_bound_explored_states: relaxedBoundExploredStates,
    relaxed_bound_cache_entries: relaxedBoundCache.size,
    transposition_capacity: transpositionCap,
    symmetry_reduction: symmetryReduction,
    transposition_peak_entries: table.peakSize,
    transposition_evicted_entries: table.evicted,
    peak_frontier: peakDepth,
    highest_processed_cost: highestProcessedCost,
    memory_guard_mb: maxMemoryMb,
    memory_stop_threshold_mb: memoryStopMb,
    peak_rss_mb: peakRssMb,
    end_rss_mb: endRssMb,
    elapsed_ms: Math.round((performance.now() - startedAt) * 100) / 100,
    route: counterexample ? { metrics: routeMetrics(route), drags: route } : null,
  };
}

function proveMinimumReposition(level, target, proofOptions) {
  if (proofOptions.algorithm === "zero-one" || proofOptions.continueAfterFloor || target === null || target === undefined) {
    const result = proveMinimumRepositionZeroOne(level, target, proofOptions);
    return { algorithm: "zero-one", ...result };
  }
  return proveMinimumRepositionBoundedDfs(level, target, proofOptions);
}

function runSelfTests() {
  const playable = Array.from({ length: 3 }, (_row, y) => Array.from({ length: 3 }, (_cell, x) => [x, y])).flat();
  const base = {
    name: "reposition proof self-test",
    difficulty: "normal",
    timeSeconds: 120,
    reward: 20,
    width: 3,
    height: 3,
    playable,
    blocked: [],
  };
  const direct = {
    ...base,
    id: 990001,
    gates: [{ id: "direct-red", side: "top", offset: 1, size: 1, color: "red" }],
    blocks: [{ id: "direct", x: 1, y: 0, shape: [[0, 0]], color: "red" }],
  };
  const parking = {
    ...base,
    id: 990002,
    gates: [
      { id: "parking-red", side: "top", offset: 1, size: 1, color: "red" },
      { id: "parking-blue", side: "bottom", offset: 1, size: 1, color: "blue" },
    ],
    blocks: [
      { id: "red", x: 1, y: 2, shape: [[0, 0]], color: "red" },
      { id: "blue", x: 1, y: 0, shape: [[0, 0]], color: "blue" },
    ],
  };
  const parkingWitness = [
    { blockId: "blue", path: [[0, 0]] },
    { blockId: "red", path: [[1, 1], [1, 0]], exitSide: "top" },
    { blockId: "blue", path: [[0, 1], [0, 2], [1, 2]], exitSide: "bottom" },
  ];
  const sameColourShell = {
    ...base,
    id: 990004,
    gates: [{ id: "shell-red", side: "top", offset: 1, size: 1, color: "red" }],
    blocks: [{ id: "shell", x: 1, y: 0, shape: [[0, 0]], color: "red", layers: ["red", "red"] }],
  };
  const twinPlayable = Array.from({ length: 3 }, (_row, y) => Array.from({ length: 4 }, (_cell, x) => [x, y])).flat();
  const twins = {
    ...base,
    id: 990003,
    width: 4,
    playable: twinPlayable,
    gates: [{ id: "twins-red", side: "bottom", offset: 0, size: 4, color: "red" }],
    blocks: [
      { id: "twin-a", x: 0, y: 0, shape: [[0, 0], [1, 0]], color: "red" },
      { id: "twin-b", x: 2, y: 0, shape: [[1, 0], [0, 0]], color: "red" },
    ],
  };
  runtime.validateLevel(direct);
  runtime.validateLevel(parking);
  runtime.validateLevel(twins);
  runtime.validateLevel(sameColourShell);
  const testOptions = { maxStates: 10_000, maxMemoryMb: 900, transpositionCap: 2_000 };
  const directDisproof = proveMinimumRepositionBoundedDfs(direct, 1, testOptions);
  const parkingProof = proveMinimumRepositionBoundedDfs(parking, 1, testOptions);
  const capInconclusive = proveMinimumRepositionBoundedDfs(parking, 2, {
    ...testOptions,
    maxStates: 1,
    zeroCostClosureReduction: false,
  });
  const memoryInconclusive = proveMinimumRepositionBoundedDfs(parking, 2, { ...testOptions, maxMemoryMb: 1 });
  const evictionDisproof = proveMinimumRepositionBoundedDfs(parking, 2, {
    ...testOptions,
    transpositionCap: 1,
    zeroCostClosureReduction: false,
  });
  const closureDisproof = proveMinimumRepositionBoundedDfs(parking, 2, testOptions);
  const sameColourShellDisproof = proveMinimumRepositionBoundedDfs(sameColourShell, 1, testOptions);
  const symmetryProof = proveMinimumRepositionBoundedDfs(parking, 1, { ...testOptions, symmetryReduction: true });
  const twinInitial = initialState(twins);
  const twinSwapped = cloneState(twinInitial);
  [twinSwapped.blocks[0].x, twinSwapped.blocks[1].x] = [twinSwapped.blocks[1].x, twinSwapped.blocks[0].x];
  const canonicalSuccessors = (state) => [...new Set([...lazyTransitions(
    twins,
    state,
    true,
    (next) => canonicalStateKey(twins, next),
  )].map((transition) => `${transition.weight}:${transition.key}`))].sort();
  const twinPlain = proveMinimumRepositionBoundedDfs(twins, 1, testOptions);
  const twinSymmetry = proveMinimumRepositionBoundedDfs(twins, 1, { ...testOptions, symmetryReduction: true });
  const boundTwinLevel = {
    ...twins,
    conveyors: [{ id: "bound-conveyor", blockId: "twin-a", x: 0, y: 0, width: 2, height: 1, direction: "bottom" }],
  };
  const futureBoundTwinLevel = { ...twins, futureMechanic: { targetId: "twin-a" } };
  const relaxedDirect = certifyRelaxedParkingThreshold(direct, initialState(direct), 1, { maxStates: 1_000, maxMemoryMb: 900 });
  const relaxedParkingFloor = certifyRelaxedParkingThreshold(parking, initialState(parking), 1, { maxStates: 1_000, maxMemoryMb: 900 });
  const relaxedParkingExact = certifyRelaxedParkingThreshold(parking, initialState(parking), 2, { maxStates: 1_000, maxMemoryMb: 900 });
  const relaxedCap = certifyRelaxedParkingThreshold(parking, initialState(parking), 2, { maxStates: 0, maxMemoryMb: 900 });
  const relaxedProof = proveMinimumRepositionBoundedDfs(parking, 1, {
    ...testOptions,
    relaxedBoundPruning: true,
    relaxedBoundMaxStates: 1_000,
  });
  const relaxedRootProof = proveMinimumRepositionBoundedDfs(parking, 1, {
    ...testOptions,
    relaxedBoundPruning: true,
    relaxedBoundRootOnly: true,
    relaxedBoundMaxStates: 1_000,
  });
  const relaxedRootCapFallback = proveMinimumRepositionBoundedDfs(parking, 1, {
    ...testOptions,
    relaxedBoundPruning: true,
    relaxedBoundRootOnly: true,
    relaxedBoundMaxStates: 0,
  });
  const rootOnlyFlagWithoutRelaxed = proveMinimumRepositionBoundedDfs(parking, 1, {
    ...testOptions,
    relaxedBoundRootOnly: true,
  });
  const zeroOne = proveMinimumRepositionZeroOne(parking, null, { maxStates: 10_000, continueAfterFloor: true });
  const official = runtime.solveLevelOptimally(parking, 10_000);
  const tinyRelaxedCrosschecks = [direct, parking, twins].map((level) => {
    const exact = runtime.solveLevelOptimally(level, 10_000);
    const relaxed = exact.solved
      ? certifyRelaxedParkingThreshold(level, initialState(level), exact.repositionOverhead + 1, { maxStates: 10_000, maxMemoryMb: 900 })
      : null;
    return { level, exact, relaxed };
  });
  const checks = [
    [directDisproof.status === "floor_disproven_counterexample" && directDisproof.counterexample_reposition_overhead === 0, "direct exit must disprove target 1 with OH 0"],
    [directDisproof.route && replayRoute(direct, directDisproof.route.drags).replayed, "direct counterexample must replay"],
    [parkingProof.lower_bound_statement_proven && parkingProof.status === "floor_lower_bound_proven_minimum_inconclusive", "parking cycle must prove target 1"],
    [replayRoute(parking, parkingWitness).replayed && routeMetrics(parkingWitness).repositions === 1, "parking upper-bound route must replay with OH 1"],
    [capInconclusive.status === "inconclusive_state_cap" && !capInconclusive.lower_bound_statement_proven, "state cap must be inconclusive"],
    [memoryInconclusive.status === "inconclusive_memory_cap" && !memoryInconclusive.lower_bound_statement_proven, "memory cap must be inconclusive"],
    [evictionDisproof.floor_disproven && evictionDisproof.transposition_evicted_entries > 0, "bounded-table eviction must retain counterexample completeness"],
    [closureDisproof.floor_disproven && closureDisproof.counterexample_reposition_overhead === 1
      && closureDisproof.zero_cost_closure_reduction_applied
      && closureDisproof.zero_cost_closure_clears >= 2
      && replayRoute(parking, closureDisproof.route.drags).replayed,
    "monotone zero-cost closure must preserve and replay the mandatory-parking counterexample"],
    [monotoneZeroCostClearEligible({ color: "red", layers: ["red", "red"] })
      && monotoneZeroCostClearEligible({ color: "red" })
      && !monotoneZeroCostClearEligible({ color: "red", layers: ["red", "blue"] }),
    "partial closure must accept only single-layer or same-colour shells"],
    [sameColourShellDisproof.floor_disproven
      && sameColourShellDisproof.counterexample_reposition_overhead === 0
      && sameColourShellDisproof.zero_cost_closure_clears === 2
      && replayRoute(sameColourShell, sameColourShellDisproof.route.drags).replayed,
    "same-colour shell closure must clear both layers and replay"],
    [symmetryProof.lower_bound_statement_proven, "opt-in symmetry key must preserve mandatory-parking lower bound"],
    [canonicalStateKey(twins, twinInitial) === canonicalStateKey(twins, twinSwapped), "shape point order must not prevent interchangeable-block canonicalization"],
    [JSON.stringify(canonicalSuccessors(twinInitial)) === JSON.stringify(canonicalSuccessors(twinSwapped)), "states merged by symmetry must expose the same canonical weighted successors"],
    [canonicalStateKey(boundTwinLevel, twinInitial) !== canonicalStateKey(boundTwinLevel, twinSwapped), "known blockId references must bind canonical identity"],
    [canonicalStateKey(futureBoundTwinLevel, twinInitial) !== canonicalStateKey(futureBoundTwinLevel, twinSwapped), "unknown mechanism fields must fail closed for canonical identity"],
    [twinPlain.floor_disproven && twinSymmetry.floor_disproven && twinPlain.counterexample_reposition_overhead === twinSymmetry.counterexample_reposition_overhead, "symmetry on/off must agree on a tiny interchangeable-block minimum"],
    [relaxedDirect.exactMinimum === 0 && !relaxedDirect.certified, "relaxed threshold must retain a zero-parking completion"],
    [relaxedParkingFloor.certified && relaxedParkingFloor.certifiedLowerBound === 1, "relaxed parking must certify the tiny mandatory-parking floor"],
    [relaxedParkingExact.exactMinimum === 1 && !relaxedParkingExact.certified, "relaxed parking must return the exact below-threshold completion"],
    [relaxedCap.haltReason === "relaxed_state_cap_unproven" && !relaxedCap.certified, "a relaxed state cap must never authorize pruning"],
    [relaxedProof.lower_bound_statement_proven && relaxedProof.relaxed_bound_prunes > 0, "opt-in relaxed bound must safely prune the mandatory-parking root"],
    [relaxedRootProof.lower_bound_statement_proven && relaxedRootProof.relaxed_bound_root_only && relaxedRootProof.relaxed_bound_calls === 1 && relaxedRootProof.relaxed_bound_prunes === 1, "root-only relaxed bound must invoke exactly once and retain a certified root prune"],
    [relaxedRootCapFallback.lower_bound_statement_proven && relaxedRootCapFallback.relaxed_bound_calls === 1 && relaxedRootCapFallback.relaxed_bound_cap_results === 1 && relaxedRootCapFallback.relaxed_bound_prunes === 0, "a capped root-only relaxed result must fall back without pruning"],
    [rootOnlyFlagWithoutRelaxed.relaxed_bound_calls === 0 && rootOnlyFlagWithoutRelaxed.status === parkingProof.status && rootOnlyFlagWithoutRelaxed.explored_states === parkingProof.explored_states, "root-only flag must not alter the default disabled relaxed-bound behavior"],
    [!relaxedBoundEligible(boundTwinLevel) && !relaxedBoundEligible({ ...twins, elevators: [{ id: "e", blockId: "twin-a" }] }), "dynamic mechanisms unsupported by the relaxation must fail closed"],
    [tinyRelaxedCrosschecks.every(({ exact, relaxed }) => exact.solved && relaxed && relaxed.exactMinimum !== null && relaxed.exactMinimum <= exact.repositionOverhead), "tiny relaxed minima must never exceed exact solver minima"],
    [zeroOne.exact_minimum_reposition_overhead === 1 && official.solved && official.repositionOverhead === 1, "0-1 and official exact minima must agree at OH 1"],
  ];
  const failed = checks.filter(([passed]) => !passed).map(([, message]) => message);
  if (failed.length) throw new Error(`Reposition proof self-test failed: ${failed.join("; ")}`);
  console.log(JSON.stringify({
    self_test: "pass",
    checks: checks.length,
    direct_disproof: directDisproof.status,
    mandatory_parking_floor: parkingProof.status,
    state_cap: capInconclusive.status,
    memory_cap: memoryInconclusive.status,
    exact_crosscheck: { zero_one: zeroOne.exact_minimum_reposition_overhead, official: official.repositionOverhead },
    relaxed_bound: {
      mandatory_floor: relaxedParkingFloor.certifiedLowerBound,
      exact_minimum: relaxedParkingExact.exactMinimum,
      cap: relaxedCap.haltReason,
      root_only_calls: relaxedRootProof.relaxed_bound_calls,
      root_cap_fallback_prunes: relaxedRootCapFallback.relaxed_bound_prunes,
    },
    symmetry_crosscheck: { plain: twinPlain.counterexample_reposition_overhead, canonical: twinSymmetry.counterexample_reposition_overhead },
    peak_rss_mb: Math.max(directDisproof.peak_rss_mb, parkingProof.peak_rss_mb),
  }, null, 2));
}

function summarizeOfficial(result, cap) {
  const route = result.solved ? result.drags : [];
  return {
    solved: result.solved,
    exact_minimum_reposition_overhead: Number.isFinite(result.repositionOverhead) ? result.repositionOverhead : null,
    minimum_drags: Number.isFinite(result.minimumDrags) ? result.minimumDrags : null,
    clear_load: Number.isFinite(result.clearLoad) ? result.clearLoad : null,
    explored_states: result.exploredStates,
    cap,
    termination: result.solved ? "minimum_solution_popped" : result.exploredStates >= cap ? "state_cap_exhausted_inconclusive" : "state_graph_exhausted_no_solution",
    route: result.solved ? { metrics: routeMetrics(route), drags: route } : null,
  };
}

function summarizeValidation(result, cap) {
  const route = result.solved ? result.drags : [];
  return {
    solved: result.solved,
    route_reposition_overhead: Number.isFinite(result.repositionOverhead) ? result.repositionOverhead : null,
    drags: Number.isFinite(result.minimumDrags) ? result.minimumDrags : null,
    clear_load: Number.isFinite(result.clearLoad) ? result.clearLoad : null,
    explored_states: result.exploredStates,
    cap,
    termination: result.solved ? "solution_witness_found_not_minimum_proof" : result.exploredStates >= cap ? "state_cap_exhausted_inconclusive" : "state_graph_exhausted_no_solution",
    route: result.solved ? { metrics: routeMetrics(route), drags: route } : null,
  };
}

function proofFromReplayedWitness(target, authored, maxMemoryMb) {
  const rssMb = Math.round(process.memoryUsage().rss / 104857.6) / 10;
  return {
    algorithm: "replayed-witness-precheck",
    status: "floor_disproven_replayed_witness",
    target_reposition_overhead: target,
    searched_reposition_budget: null,
    exact_minimum_reposition_overhead: null,
    counterexample_reposition_overhead: authored.route.metrics.repositions,
    lower_bound_statement_proven: false,
    lower_bound_proven_at_states: null,
    floor_disproven: true,
    graph_exhausted: false,
    halt_reason: "replayed_solution_below_target",
    frontier_minimum_cost: null,
    explored_states: 0,
    discovered_states: 0,
    generated_transitions: 0,
    zero_cost_transitions: 0,
    one_cost_transitions: 0,
    peak_frontier: 0,
    highest_processed_cost: -1,
    memory_guard_mb: maxMemoryMb,
    peak_rss_mb: rssMb,
    end_rss_mb: rssMb,
    elapsed_ms: 0,
    route: authored.route,
  };
}

const candidatesById = new Map((input.levels ?? []).map((entry) => [Number(entry.level_id.slice(2)), entry]));
const witnessesById = new Map(witnessInput.map((entry) => [Number(entry.level_id.slice(2)), entry.drags ?? entry.route?.drags ?? []]));
const reports = [];

if (options.selfTest) {
  runSelfTests();
  process.exit(0);
}

for (const id of selectedIds) {
  const levelId = `Lv${String(id).padStart(3, "0")}`;
  const candidate = candidatesById.get(id);
  if (!candidate) {
    reports.push({ level_id: levelId, available: false, status: "missing_input_candidate" });
    console.log(`${levelId}: missing input candidate`);
    continue;
  }

  runtime.validateLevel(candidate.level);
  const target = candidate.target?.recommended_minimum_reposition_overhead
    ?? candidate.target?.recommended_reposition_overhead
    ?? candidate.audit?.target_reposition_overhead
    ?? candidate.level?.designTargets?.minimumRepositionOverhead
    ?? null;
  const authoredDrags = witnessesById.get(id);
  const authored = authoredDrags?.length ? {
    available: true,
    route: { metrics: routeMetrics(authoredDrags), drags: authoredDrags },
    replay: replayRoute(candidate.level, authoredDrags),
  } : { available: false, route: null, replay: null };
  const proof = target !== null
    && authored.replay?.replayed
    && authored.route.metrics.repositions < target
    ? proofFromReplayedWitness(target, authored, options.maxMemoryMb)
    : proveMinimumReposition(candidate.level, target, options);

  let official;
  if (options.runOfficial && process.memoryUsage().rss / 1048576 < options.maxMemoryMb * 0.75) {
    const officialStarted = performance.now();
    const officialRaw = runtime.solveLevelOptimally(candidate.level, options.officialMaxStates);
    official = summarizeOfficial(officialRaw, options.officialMaxStates);
    official.elapsed_ms = Math.round((performance.now() - officialStarted) * 100) / 100;
    official.replay = official.route ? replayRoute(candidate.level, official.route.drags) : null;
  } else {
    official = {
      solved: null,
      exact_minimum_reposition_overhead: null,
      minimum_drags: null,
      clear_load: null,
      explored_states: 0,
      cap: options.officialMaxStates,
      termination: options.runOfficial ? "not_run_memory_guard" : "not_run_disabled",
      route: null,
      replay: null,
      elapsed_ms: 0,
    };
  }

  let validation;
  if (authored.replay?.replayed) {
    validation = {
      solved: null,
      route_reposition_overhead: null,
      drags: null,
      clear_load: null,
      explored_states: 0,
      cap: options.validationMaxStates,
      termination: "not_run_replayed_authored_witness_available",
      route: null,
      replay: null,
      elapsed_ms: 0,
    };
  } else {
    const validationStarted = performance.now();
    const validationRaw = runtime.solveLevelForValidation(candidate.level, options.validationMaxStates);
    validation = summarizeValidation(validationRaw, options.validationMaxStates);
    validation.elapsed_ms = Math.round((performance.now() - validationStarted) * 100) / 100;
    validation.replay = validation.route ? replayRoute(candidate.level, validation.route.drags) : null;
  }

  proof.replay = proof.route ? replayRoute(candidate.level, proof.route.drags) : null;
  const proofWitness = proof.route && proof.replay?.replayed ? {
    source: proof.algorithm === "zero-one" ? "zero_one_exact"
      : proof.algorithm === "replayed-witness-precheck" ? "replayed_witness_counterexample"
        : "bounded_dfs_counterexample",
    ...proof.route,
    replay: proof.replay,
  }
    : official.route && official.replay?.replayed ? { source: "solveLevelOptimally", ...official.route, replay: official.replay }
      : authored.route && authored.replay?.replayed ? { source: "authored_validation_route", ...authored.route, replay: authored.replay }
        : validation.route && validation.replay?.replayed ? { source: "solveLevelForValidation", ...validation.route, replay: validation.replay }
          : null;

  const exactValues = [
    proof.exact_minimum_reposition_overhead,
    official.solved && official.replay?.replayed ? official.exact_minimum_reposition_overhead : null,
  ].filter((value) => value !== null);
  const exactAgreement = exactValues.length < 2 ? null : new Set(exactValues).size === 1;
  const lowerBoundCompatibleWithOfficial = target === null || !official.solved || !official.replay?.replayed
    ? null
    : !proof.lower_bound_statement_proven || official.exact_minimum_reposition_overhead >= target;
  const upperBoundCompatibleWithProof = !proofWitness
    ? null
    : proof.exact_minimum_reposition_overhead !== null
      ? proofWitness.metrics.repositions >= proof.exact_minimum_reposition_overhead
      : target !== null && proof.lower_bound_statement_proven
        ? proofWitness.metrics.repositions >= target
        : null;
  const publishableFloorCertification = target === null
    ? null
    : Boolean(
      proof.lower_bound_statement_proven
      && !proof.floor_disproven
      && proofWitness?.replay?.replayed
      && (!runtimeContractBinding.requested || runtimeContractBinding.valid),
    );

  reports.push({
    level_id: levelId,
    available: true,
    target_reposition_overhead: target,
    proof,
    official_optimal_crosscheck: official,
    authored_solution_witness: authored,
    validation_solution_witness: validation,
    selected_solution_witness: proofWitness,
    crosscheck: {
      exact_minimum_agreement_when_both_solved: exactAgreement,
      lower_bound_compatible_with_official_minimum: lowerBoundCompatibleWithOfficial,
      replayed_upper_bound_compatible_with_proof: upperBoundCompatibleWithProof,
      mismatch: exactAgreement === false || lowerBoundCompatibleWithOfficial === false || upperBoundCompatibleWithProof === false,
    },
    certification: {
      lower_bound_only: Boolean(proof.lower_bound_statement_proven && !proof.floor_disproven),
      has_authoritative_replayed_solution_witness: Boolean(proofWitness?.replay?.replayed),
      target_floor_certified_for_playable_level: publishableFloorCertification,
      note: publishableFloorCertification
        ? "All states below target were excluded, a legal completion route replayed through PuzzleModel, and the generated runtime is contract-bound."
        : "Do not publish the target as guaranteed unless the lower-bound proof, replayed completion witness, and any requested runtime/contract binding are all valid.",
    },
  });

  console.log(`${levelId}: proof=${proof.status}, min=${proof.exact_minimum_reposition_overhead ?? "?"}, target=${target ?? "—"}, states=${proof.explored_states}, peakRSS=${proof.peak_rss_mb ?? "?"}MB, official=${official.exact_minimum_reposition_overhead ?? official.termination}, replay=${proofWitness?.source ?? "none"}`);
}

const postSearchDrift = [];
if (sha256(await readFile(options.input, "utf8")) !== sha256(inputText)) {
  postSearchDrift.push("input_source_changed_during_search");
}
if (runtimeContractBinding.path) {
  const currentAuditSha256 = sha256(await readFile(runtimeContractBinding.path, "utf8"));
  if (currentAuditSha256 !== runtimeContractBinding.sha256) {
    postSearchDrift.push("runtime_audit_changed_during_search");
  }
}
if (runtimeContractBinding.contract_path && runtimeContractBinding.contract_sha256) {
  const currentContractSha256 = sha256(await readFile(runtimeContractBinding.contract_path, "utf8"));
  if (currentContractSha256 !== runtimeContractBinding.contract_sha256) {
    postSearchDrift.push("contract_changed_during_search");
  }
}
const bindingStableAtPostSearch = postSearchDrift.length === 0;
if (!bindingStableAtPostSearch) {
  for (const entry of reports) {
    if (!entry.available || !entry.certification) continue;
    entry.certification.target_floor_certified_for_playable_level = false;
    entry.certification.note = `Certification withheld because binding drifted: ${postSearchDrift.join(", ")}`;
  }
}

const available = reports.filter((entry) => entry.available);
const summary = {
  generated_at: new Date().toISOString(),
  prototype_only: !(runtimeContractBinding.valid && bindingStableAtPostSearch),
  formal_contract_bound: Boolean(runtimeContractBinding.valid && bindingStableAtPostSearch),
  report_tag: reportTag,
  input: relative(root, options.input).replaceAll("\\", "/"),
  input_sha256: sha256(inputText),
  input_bundled_module_sha256: inputArtifact.bundledModuleSha256,
  input_selected_export: inputArtifact.selectedExport,
  witness_input: witnessText ? relative(root, witnessPath).replaceAll("\\", "/") : null,
  witness_input_sha256: witnessText ? sha256(witnessText) : null,
  level_solver_source: relative(root, levelSolverPath).replaceAll("\\", "/"),
  level_solver_sha256: sha256(levelSolverText),
  runtime_contract_binding: runtimeContractBinding,
  binding_stable_at_post_search_check: bindingStableAtPostSearch,
  binding_drift: postSearchDrift,
  requested_levels: selectedIds.map((id) => `Lv${String(id).padStart(3, "0")}`),
  parameters: {
    algorithm: options.algorithm,
    proof_max_states: options.maxStates,
    proof_max_memory_mb: options.maxMemoryMb,
    transposition_cap: options.transpositionCap,
    symmetry_reduction: options.symmetryReduction,
    zero_cost_closure_reduction: options.zeroCostClosureReduction,
    relaxed_bound_pruning: options.relaxedBoundPruning,
    relaxed_bound_root_only: options.relaxedBoundRootOnly,
    relaxed_bound_max_states_per_call: options.relaxedBoundMaxStates,
    official_optimal_max_states: options.officialMaxStates,
    official_crosscheck_enabled: options.runOfficial,
    validation_max_states: options.validationMaxStates,
    continue_after_floor: options.continueAfterFloor,
  },
  semantics: {
    zero_cost_edge: "A legal drag that exits and clears exactly one visible layer.",
    one_cost_edge: "A legal drag ending at an internal resting position without clearing a layer.",
    objective_equivalence: "Every complete route clears the fixed initial layer load, so totalDrags = clearLoad + nonExitDrags; minimizing total drags and minimizing reposition overhead are equivalent.",
    proof_rule: "A floor is proven only after every state reachable with reposition cost < target has been exhausted.",
    bounded_dfs_rule: "The default memory-bounded DFS exhausts every state with non-exit cost <= target-1; zero-cost edges strictly clear one layer, and bounded transposition eviction may repeat work but cannot remove a legal branch.",
    zero_cost_closure_rule: "When enabled, a state with a legal free clear follows one deterministic free clear before considering reposition edges, but only on single-layer levels without shutters, elevators, conveyors, or shutter-bound blocks. In that scope a free clear removes space and only decreases monotone counters, so taking it immediately cannot remove a solution or increase its reposition cost.",
    symmetry_rule: "Interchangeable-block canonicalization is opt-in, normalizes shape point order, binds every discovered block-id reference, and disables interchangeability for unknown top-level level fields.",
    relaxed_bound_rule: "The relaxed-parking bound is opt-in and is used only without conveyors/elevators. Root-only mode invokes it once at the initial proof state; an uncertified root result immediately falls back to the ordinary bounded search. A per-call state or memory cap is unproven and never authorizes pruning.",
    state_identity: "Block presence/order/id/position/current color/layer stack/frozen counters, gate frozen counters, and shutter counters; conveyor movement is applied after each clear exactly as in levelSolver.ts.",
    inconclusive_rule: "A state cap with frontier below target is inconclusive. It is never converted into a pass or fail proof.",
    playability_rule: "A lower bound is publishable only when accompanied by a completion route replayed through PuzzleModel.",
    supported_scope: "Matches src/core/levelSolver.ts semantics. Any mechanism unsupported by that solver is outside this prototype's proof scope.",
  },
  counts: {
    requested: reports.length,
    available_candidates: available.length,
    missing_candidates: reports.filter((entry) => !entry.available).length,
    exact_minimum_proven: available.filter((entry) => entry.proof.exact_minimum_reposition_overhead !== null).length,
    target_floor_certified: available.filter((entry) => entry.certification.target_floor_certified_for_playable_level === true).length,
    target_floor_disproven: available.filter((entry) => entry.proof.floor_disproven).length,
    inconclusive_before_target: available.filter((entry) => ["inconclusive_state_cap", "inconclusive_memory_cap"].includes(entry.proof.status)).length,
    graph_exhausted_without_solution: available.filter((entry) => entry.proof.graph_exhausted && !entry.proof.route).length,
    replayed_authored_witnesses: available.filter((entry) => entry.authored_solution_witness.replay?.replayed).length,
    crosscheck_mismatches: available.filter((entry) => entry.crosscheck.mismatch).length,
  },
  reports,
};

if (options.write) {
  await mkdir(options.outputDir, { recursive: true });
  const selectionTag = options.levels.split(",").map((token) => token.trim().split("-")
    .map((value) => `lv${String(Number(value)).padStart(3, "0")}`).join("-")).join("_");
  const outputStem = `reposition-lower-bound-report-${reportTag}-${selectionTag}`;
  const jsonPath = resolve(options.outputDir, `${outputStem}.json`);
  const csvPath = resolve(options.outputDir, `${outputStem}.csv`);
  const markdownPath = resolve(options.outputDir, `${outputStem}.md`);
  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  const csvCell = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const csvHeaders = [
    "level_id", "available", "target_reposition_overhead", "proof_status", "exact_minimum_reposition_overhead",
    "lower_bound_statement_proven", "floor_disproven", "halt_reason", "explored_states", "discovered_states", "frontier_minimum_cost",
    "proof_algorithm", "proof_elapsed_ms", "peak_rss_mb", "witness_source", "witness_reposition_overhead", "witness_replayed", "official_status",
    "official_exact_minimum_reposition_overhead", "official_explored_states", "crosscheck_mismatch", "target_floor_certified",
  ];
  const csvRows = reports.map((entry) => entry.available ? [
    entry.level_id,
    true,
    entry.target_reposition_overhead,
    entry.proof.status,
    entry.proof.exact_minimum_reposition_overhead,
    entry.proof.lower_bound_statement_proven,
    entry.proof.floor_disproven,
    entry.proof.halt_reason,
    entry.proof.explored_states,
    entry.proof.discovered_states,
    entry.proof.frontier_minimum_cost,
    entry.proof.algorithm,
    entry.proof.elapsed_ms,
    entry.proof.peak_rss_mb,
    entry.selected_solution_witness?.source,
    entry.selected_solution_witness?.metrics.repositions,
    entry.selected_solution_witness?.replay.replayed,
    entry.official_optimal_crosscheck.termination,
    entry.official_optimal_crosscheck.exact_minimum_reposition_overhead,
    entry.official_optimal_crosscheck.explored_states,
    entry.crosscheck.mismatch,
    entry.certification.target_floor_certified_for_playable_level,
  ] : [entry.level_id, false, null, entry.status]);
  await writeFile(csvPath, `${[csvHeaders, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`, "utf8");
  const lines = [
    "# Necessary reposition lower-bound proof",
    "",
    summary.formal_contract_bound
      ? "> Contract-bound exhaustive lower-bound evidence. No production level or freeze source is modified."
      : "> Prototype evidence only. No production level or freeze source is modified.",
    "",
    `- Proof algorithm: ${options.algorithm}`,
    `- Proof cap: ${options.maxStates.toLocaleString()} states per level`,
    `- RSS guard: ${options.maxMemoryMb.toLocaleString()} MB`,
    `- Official cross-check: ${options.runOfficial ? `${options.officialMaxStates.toLocaleString()} states per level` : "disabled"}`,
    `- Continue after reaching target: ${options.continueAfterFloor ? "yes" : "no"}`,
    `- Symmetry reduction: ${options.symmetryReduction ? "enabled" : "disabled"}`,
    `- Runtime/contract binding: ${summary.formal_contract_bound ? "valid and stable" : runtimeContractBinding.requested ? runtimeContractBinding.error ?? "invalid or drifted" : "not requested"}`,
    `- Relaxed parking bound: ${options.relaxedBoundPruning ? `enabled (${options.relaxedBoundMaxStates.toLocaleString()} states/call; ${options.relaxedBoundRootOnly ? "root only" : "every visited state"})` : "disabled"}`,
    "",
    "| Level | Target OH | 0-1 result | Exact min OH | States | Replayed witness | Official min OH | Cross-check | Publishable floor |",
    "|---:|---:|---|---:|---:|---|---:|---|---|",
    ...reports.map((entry) => entry.available
      ? `| ${entry.level_id} | ${entry.target_reposition_overhead ?? "—"} | ${entry.proof.status} | ${entry.proof.exact_minimum_reposition_overhead ?? "—"} | ${entry.proof.explored_states.toLocaleString()} | ${entry.selected_solution_witness?.source ?? "—"} | ${entry.official_optimal_crosscheck.exact_minimum_reposition_overhead ?? "—"} | ${entry.crosscheck.mismatch ? "MISMATCH" : "compatible"} | ${entry.certification.target_floor_certified_for_playable_level === null ? "n/a" : entry.certification.target_floor_certified_for_playable_level ? "yes" : "no"} |`
      : `| ${entry.level_id} | — | ${entry.status} | — | — | — | — | — | no |`),
    "",
    "## Interpretation",
    "",
    "A replayed high-overhead route is only an upper bound. The target is guaranteed only when the 0-1 search exhausts every state below that target and an independently replayed completion route proves the level is playable. `inconclusive_state_cap` means exactly that: increase the cap or redesign the candidate; it is never evidence that the floor passed.",
    "",
    `- Input SHA-256: \`${summary.input_sha256}\``,
    `- levelSolver.ts SHA-256: \`${summary.level_solver_sha256}\``,
  ];
  await writeFile(markdownPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${relative(root, jsonPath)}`);
  console.log(`Wrote ${relative(root, csvPath)}`);
  console.log(`Wrote ${relative(root, markdownPath)}`);
}

if (summary.counts.crosscheck_mismatches > 0) process.exitCode = 2;
if (options.expectedContractSha256 && (
  !summary.formal_contract_bound
  || available.some((entry) => entry.target_reposition_overhead !== null
    && entry.certification.target_floor_certified_for_playable_level !== true)
)) process.exitCode = 2;
