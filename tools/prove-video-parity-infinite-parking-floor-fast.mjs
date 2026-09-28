import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Memory-bounded exact necessary-reposition lower bound.
 *
 * The relaxation is deliberately stronger than PuzzleModel gameplay.  A paid
 * action may remove any still-boarded block to infinite off-board parking.
 * Parked blocks cease to obstruct immediately; their visible layers clear for
 * free whenever a matching gate becomes active.  A geometrically routeable
 * block may likewise leave at zero cost.  Numeric ice and every other dynamic
 * restriction are ignored.  Consequently every real completion projects to a
 * relaxed completion with no greater paid cost.
 *
 * Unlike the older status-string BFS, closure is canonical for a removed-block
 * bit mask.  Compact bit sets and typed frontiers make exhaustive search below
 * a requested floor practical for dense 26-block boards.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(root, process.argv[2]
  ?? ".codex-temp/video-parity-lv17-floor-core-search/size5/runtime-search/candidate-pool.json");
const levelId = Number(process.argv[3] ?? 17);
const floor = Number(process.argv[4] ?? 9);
const maxStates = Number(process.argv[5] ?? 8_000_000);
const outputPath = resolve(root, process.argv[6]
  ?? `.codex-temp/video-parity-lv17-lv32-floor-seeds/fast-infinite-parking-proof-lv${levelId}.json`);
const contractPath = resolve(root, process.argv[7]
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json");

if (!Number.isSafeInteger(levelId) || levelId <= 0) throw new Error("levelId must be positive");
if (!Number.isSafeInteger(floor) || floor <= 0) throw new Error("floor must be positive");
if (!Number.isSafeInteger(maxStates) || maxStates <= 0) throw new Error("maxStates must be positive");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
      value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
    )))
    : value;
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const display = (path) => relative(root, path).replaceAll("\\", "/");

async function loadLevel(path, id) {
  if (extname(path).toLowerCase() !== ".json") {
    const bundle = await build({
      entryPoints: [path], bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
    });
    const imported = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
    const levels = imported.VIDEO_PARITY_LEVELS ?? imported.LEVELS ?? imported.default;
    return structuredClone(levels.find((entry) => entry.id === id));
  }
  const parsed = JSON.parse(await readFile(path, "utf8"));
  const direct = (Array.isArray(parsed) ? parsed : parsed.levels ?? parsed.candidates ?? [])
    .find((entry) => Number(String(entry.level_id ?? entry.id ?? "").replace(/^Lv/i, "")) === id);
  if (!direct) return null;
  if (direct.level?.id === id) return structuredClone(direct.level);
  if (direct.candidates?.length) {
    const candidate = direct.candidates.find((entry) => entry.level?.id === id);
    if (candidate) return structuredClone(candidate.level);
  }
  if (direct.id === id && direct.blocks) return structuredClone(direct);
  return null;
}

const inputText = await readFile(inputPath, "utf8");
const contractText = await readFile(contractPath, "utf8");
const contractSha256 = sha256(contractText);
const level = await loadLevel(inputPath, levelId);
if (!level) throw new Error(`Lv${levelId} missing from ${display(inputPath)}`);
const blockCount = level.blocks.length;
if (blockCount > 30) throw new Error(`compact proof supports at most 30 blocks, got ${blockCount}`);
if (level.width * level.height > 63) throw new Error("compact proof supports at most 63 board cells");

const allMask = (2 ** blockCount) - 1;
const maskSpace = 2 ** blockCount;
const totalBoardCells = level.width * level.height;
const fullBoardMask = (1n << BigInt(totalBoardCells)) - 1n;
const playableMask = level.playable.reduce((mask, [x, y]) => (
  mask | (1n << BigInt(y * level.width + x))
), 0n);
const initialCellMasks = [];
let initialOccupiedMask = 0n;
for (const block of level.blocks) {
  let mask = 0n;
  for (const [dx, dy] of block.shape) mask |= 1n << BigInt((block.y + dy) * level.width + block.x + dx);
  if (initialOccupiedMask & mask) throw new Error(`overlapping initial geometry at ${block.id}`);
  initialOccupiedMask |= mask;
  initialCellMasks.push(mask);
}
if (initialOccupiedMask !== playableMask || playableMask !== fullBoardMask) {
  throw new Error("fast proof currently requires a full, exactly tiled rectangle");
}

const layers = level.blocks.map((block) => block.layers?.length ? [...block.layers] : [block.color]);
const totalLayers = layers.reduce((sum, value) => sum + value.length, 0);
const thresholdByColor = new Map();
for (const gate of level.gates) {
  const threshold = Number(gate.frozen ?? 0);
  const previous = thresholdByColor.get(gate.color);
  if (previous === undefined || threshold < previous) thresholdByColor.set(gate.color, threshold);
}
for (const blockLayers of layers) {
  for (const color of blockLayers) {
    if (!thresholdByColor.has(color)) throw new Error(`no gate for layer colour ${color}`);
  }
}

const boundsOf = (shape) => ({
  width: Math.max(...shape.map(([x]) => x)) + 1,
  height: Math.max(...shape.map(([, y]) => y)) + 1,
});
const placements = level.blocks.map((block) => {
  const bounds = boundsOf(block.shape);
  const values = [];
  const indexByPoint = new Map();
  for (let y = 0; y <= level.height - bounds.height; y += 1) {
    for (let x = 0; x <= level.width - bounds.width; x += 1) {
      let cellMask = 0n;
      for (const [dx, dy] of block.shape) cellMask |= 1n << BigInt((y + dy) * level.width + x + dx);
      const entry = { x, y, cellMask, neighbors: [], gates: [] };
      indexByPoint.set(`${x},${y}`, values.length);
      values.push(entry);
    }
  }
  for (const entry of values) {
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const next = indexByPoint.get(`${entry.x + dx},${entry.y + dy}`);
      if (next !== undefined) entry.neighbors.push(next);
    }
    const minX = entry.x;
    const maxX = entry.x + bounds.width - 1;
    const minY = entry.y;
    const maxY = entry.y + bounds.height - 1;
    for (const gate of level.gates) {
      const aligned = gate.side === "top" ? minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size
        : gate.side === "bottom" ? maxY === level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size
          : gate.side === "left" ? minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size
            : maxX === level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
      if (aligned) entry.gates.push(gate);
    }
  }
  const start = indexByPoint.get(`${block.x},${block.y}`);
  if (start === undefined) throw new Error(`missing initial placement for ${block.id}`);
  return { values, start };
});

const bitset = () => new Uint8Array(Math.ceil(maskSpace / 8));
const hasBit = (set, index) => (set[index >>> 3] & (1 << (index & 7))) !== 0;
const addBit = (set, index) => { set[index >>> 3] |= 1 << (index & 7); };

let reachabilityCalls = 0;
let placementVisits = 0;
function canExit(blockIndex, freeMask, clearedLayers) {
  reachabilityCalls += 1;
  const color = layers[blockIndex][0];
  const data = placements[blockIndex];
  const freeWithDragged = freeMask | initialCellMasks[blockIndex];
  const queue = new Uint8Array(data.values.length);
  const visited = new Uint8Array(data.values.length);
  let head = 0;
  let tail = 0;
  queue[tail++] = data.start;
  visited[data.start] = 1;
  while (head < tail) {
    const placementIndex = queue[head++];
    placementVisits += 1;
    const entry = data.values[placementIndex];
    if (entry.gates.some((gate) => gate.color === color && Number(gate.frozen ?? 0) <= clearedLayers)) return true;
    for (const nextIndex of entry.neighbors) {
      if (visited[nextIndex]) continue;
      const occupied = data.values[nextIndex].cellMask;
      if ((occupied & ~freeWithDragged) !== 0n) continue;
      visited[nextIndex] = 1;
      queue[tail++] = nextIndex;
    }
  }
  return false;
}

let closureCalls = 0;
let layerPasses = 0;
let zeroCostExits = 0;
function closeMask(sourceMask) {
  closureCalls += 1;
  let removedMask = sourceMask;
  let freeMask = 0n;
  for (let index = 0; index < blockCount; index += 1) {
    if ((removedMask & 2 ** index) !== 0) freeMask |= initialCellMasks[index];
  }
  const progress = new Uint8Array(blockCount);
  let clearedLayers = 0;
  while (true) {
    let changed = false;
    // Least fixed point of all off-board layer clears.
    for (let index = 0; index < blockCount; index += 1) {
      if ((removedMask & 2 ** index) === 0) continue;
      while (progress[index] < layers[index].length) {
        const color = layers[index][progress[index]];
        if (thresholdByColor.get(color) > clearedLayers) break;
        progress[index] += 1;
        clearedLayers += 1;
        layerPasses += 1;
        changed = true;
      }
    }
    // Routeability only grows as blocks leave and counters fall.  Repeating
    // this scan to quiescence therefore computes the unique monotone closure.
    for (let index = 0; index < blockCount; index += 1) {
      const bit = 2 ** index;
      if ((removedMask & bit) !== 0) continue;
      if (thresholdByColor.get(layers[index][0]) > clearedLayers) continue;
      if (!canExit(index, freeMask, clearedLayers)) continue;
      removedMask += bit;
      freeMask |= initialCellMasks[index];
      zeroCostExits += 1;
      changed = true;
    }
    if (!changed) return { removedMask, clearedLayers };
  }
}

class Uint32Vector {
  constructor(initialCapacity = 1024) {
    this.values = new Uint32Array(initialCapacity);
    this.length = 0;
  }
  push(value) {
    if (this.length >= this.values.length) {
      const next = new Uint32Array(this.values.length * 2);
      next.set(this.values);
      this.values = next;
    }
    this.values[this.length++] = value;
  }
}

const rawSeen = bitset();
const closedSeen = bitset();
const initial = closeMask(0);
addBit(rawSeen, 0);
addBit(closedSeen, initial.removedMask);
let frontier = new Uint32Vector();
frontier.push(initial.removedMask);
let discoveredStates = 1;
let expandedStates = 0;
let generatedTransitions = 0;
let certified = initial.clearedLayers < totalLayers;
let counterexampleCost = initial.clearedLayers === totalLayers ? 0 : null;
const layersReport = [{ cost: 0, frontier_states: frontier.length, discovered_states: discoveredStates }];
const startedAt = performance.now();

for (let cost = 0; cost < floor && counterexampleCost === null; cost += 1) {
  if (cost === floor - 1) {
    // Every state with cost < floor has been reached.  Expanding this final
    // frontier once is required to detect a completion whose paid cost is
    // exactly floor; it is not required for the lower-bound certificate.
  }
  const next = new Uint32Vector(Math.max(1024, Math.min(maxStates, frontier.length * 2)));
  for (let cursor = 0; cursor < frontier.length; cursor += 1) {
    const removedMask = frontier.values[cursor];
    expandedStates += 1;
    if (expandedStates > maxStates) break;
    const intactMask = allMask - (allMask & removedMask);
    for (let index = 0; index < blockCount; index += 1) {
      const bit = 2 ** index;
      if ((intactMask & bit) === 0) continue;
      generatedTransitions += 1;
      const raw = removedMask + bit;
      if (hasBit(rawSeen, raw)) continue;
      addBit(rawSeen, raw);
      const closed = closeMask(raw);
      if (closed.clearedLayers === totalLayers) {
        counterexampleCost = cost + 1;
        break;
      }
      if (hasBit(closedSeen, closed.removedMask)) continue;
      addBit(closedSeen, closed.removedMask);
      discoveredStates += 1;
      next.push(closed.removedMask);
    }
    if (counterexampleCost !== null || expandedStates > maxStates) break;
  }
  layersReport.push({ cost: cost + 1, frontier_states: next.length, discovered_states: discoveredStates });
  frontier = next;
  if (expandedStates > maxStates) break;
  if (frontier.length === 0) break;
}

const capped = expandedStates > maxStates;
certified = counterexampleCost === null && !capped;
const status = certified ? "floor_lower_bound_proven_by_compact_infinite_parking_relaxation"
  : counterexampleCost !== null ? "floor_disproven_in_relaxation"
    : "inconclusive_state_cap";
const report = {
  schema: "blockout-video-parity-compact-infinite-parking-lower-bound-v1",
  generated_at: new Date().toISOString(),
  status,
  target_floor_certified: certified,
  level_id: levelId,
  requested_floor: floor,
  counterexample_paid_cost: counterexampleCost,
  level_spec_sha256: sha256(canonicalJson(level)),
  bindings: {
    input: { path: display(inputPath), sha256: sha256(inputText) },
    contract: { path: display(contractPath), sha256: contractSha256 },
    proof_tool: { path: display(fileURLToPath(import.meta.url)), sha256: sha256(await readFile(fileURLToPath(import.meta.url))) },
  },
  exhaustive_frontier: {
    statement: certified
      ? `Every relaxed state reachable with fewer than ${floor} paid removals was exhausted without completion.`
      : null,
    expanded_states: expandedStates,
    discovered_states: discoveredStates,
    generated_transitions: generatedTransitions,
    max_states: maxStates,
    layers: layersReport,
  },
  relaxation: {
    paid_action: "remove any intact block to infinite off-board parking at cost one",
    parked_geometry: "removed immediately and permanently",
    layer_clears: "free at the least fixed point of matching gate thresholds",
    zero_cost_exit: "any geometrically routeable outer layer removes the whole geometry",
    removed_constraints: ["numeric ice", "locks", "axes", "dynamic mechanisms", "timer"],
    soundness: "Every real completion maps to a relaxed completion with paid cost no greater than its internal-drag count.",
  },
  implementation_audit: {
    block_count: blockCount,
    total_layers: totalLayers,
    exactly_tiled_full_rectangle: true,
    closure_calls: closureCalls,
    reachability_calls: reachabilityCalls,
    placement_visits: placementVisits,
    zero_cost_exits: zeroCostExits,
    layer_clear_events: layerPasses,
    elapsed_ms: Math.round((performance.now() - startedAt) * 100) / 100,
    peak_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100,
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: display(outputPath), status, level_spec_sha256: report.level_spec_sha256,
  expanded_states: expandedStates, discovered_states: discoveredStates,
  elapsed_ms: report.implementation_audit.elapsed_ms, peak_rss_mb: report.implementation_audit.peak_rss_mb,
}, null, 2));
if (!certified) process.exitCode = 2;
