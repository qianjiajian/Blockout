import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Exact lower-bound proof through an infinite-parking relaxation.
 *
 * A paid action may erase any still-boarded block into an infinite off-board
 * parking space, even when that move is physically impossible. Parked blocks
 * never obstruct anything and every one of their layers may later clear for
 * free as soon as its colour gate unlocks. A normal zero-cost exit also erases
 * the block after its first layer instead of leaving it at the gate. Numeric
 * ice, blocked cells, axes, locks, stars and other mechanics are removed.
 * These changes only add solutions and never add cost, so the exact minimum
 * number of erased blocks is a sound lower bound on real internal drags.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(root, process.argv[2]
  ?? ".codex-temp/video-parity-lv17-lv32-floor-seeds/runtime.generated.ts");
const levelId = Number(process.argv[3] ?? 17);
const floor = Number(process.argv[4] ?? 9);
const maxStates = Number(process.argv[5] ?? 5_000_000);
const outputPath = resolve(root, process.argv[6]
  ?? `.codex-temp/video-parity-lv17-lv32-floor-seeds/relaxed-parking-proof-lv${levelId}.json`);

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().flatMap((key) => value[key] === undefined ? [] : [[key, canonicalize(value[key])]]))
    : value;
const canonicalJson = (value) => JSON.stringify(canonicalize(value));

const inputText = await readFile(inputPath, "utf8");
const bundle = await build({
  entryPoints: [inputPath],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const imported = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const level = structuredClone(imported.VIDEO_PARITY_LEVELS.find((entry) => entry.id === levelId));
if (!level) throw new Error(`Lv${levelId} missing from ${inputPath}`);

const layersOf = (block) => block.layers?.length ? [...block.layers] : [block.color];
const layers = level.blocks.map(layersOf);
const totalLayers = layers.reduce((sum, entry) => sum + entry.length, 0);
const doneStatus = (index) => layers[index].length + 1;
const stateKey = (statuses) => statuses.join("");
const clearedCount = (statuses) => statuses.reduce((sum, status, index) => {
  if (status === 0 || status === 1) return sum;
  return sum + Math.min(status - 1, layers[index].length);
}, 0);
const gateActive = (gate, cleared) => Number(gate.frozen ?? 0) <= cleared;
const matchingGates = (color, cleared) => level.gates.filter((gate) => gate.color === color && gateActive(gate, cleared));
const occupiedKey = (x, y) => `${x},${y}`;
const fits = (block, x, y) => block.shape.every(([dx, dy]) => {
  const cellX = x + dx;
  const cellY = y + dy;
  return cellX >= 0 && cellX < level.width && cellY >= 0 && cellY < level.height;
});
const atGate = (block, x, y, gate) => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "bottom") return maxY === level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
  if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
  return maxX === level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
};

const reachabilityCache = new Map();
function canExit(statuses, blockIndex, gates) {
  // Geometry depends only on which blocks remain intact, not on off-board
  // layer progress. Collapsing those equivalent states keeps the exhaustive
  // relaxation finite without changing a transition.
  let intactMask = 0;
  for (let index = 0; index < statuses.length; index += 1) {
    if (statuses[index] === 0) intactMask |= (1 << index);
  }
  const cacheKey = `${intactMask}:${blockIndex}:${gates.map((gate) => gate.id).join(",")}`;
  const cached = reachabilityCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const block = level.blocks[blockIndex];
  const occupied = new Set();
  for (let index = 0; index < level.blocks.length; index += 1) {
    if (index === blockIndex || statuses[index] !== 0) continue;
    const other = level.blocks[index];
    for (const [dx, dy] of other.shape) occupied.add(occupiedKey(other.x + dx, other.y + dy));
  }
  const canPlace = (x, y) => fits(block, x, y)
    && block.shape.every(([dx, dy]) => !occupied.has(occupiedKey(x + dx, y + dy)));
  const queue = [[block.x, block.y]];
  const seen = new Set([occupiedKey(block.x, block.y)]);
  let result = false;
  for (let cursor = 0; cursor < queue.length && !result; cursor += 1) {
    const [x, y] = queue[cursor];
    if (gates.some((gate) => atGate(block, x, y, gate))) {
      result = true;
      break;
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = occupiedKey(nextX, nextY);
      if (seen.has(key) || !canPlace(nextX, nextY)) continue;
      seen.add(key);
      queue.push([nextX, nextY]);
    }
  }
  reachabilityCache.set(cacheKey, result);
  return result;
}

function closeZeroCost(source) {
  const statuses = [...source];
  const events = [];
  while (true) {
    const cleared = clearedCount(statuses);
    let changed = false;
    // Off-board parked/peeled blocks clear layers without geometry.
    for (let index = 0; index < statuses.length; index += 1) {
      const status = statuses[index];
      if (status < 1 || status >= doneStatus(index)) continue;
      const layerIndex = status - 1;
      const color = layers[index][layerIndex];
      if (!matchingGates(color, clearedCount(statuses)).length) continue;
      statuses[index] += 1;
      events.push({ type: "offboard_layer_clear", block_id: level.blocks[index].id, color, layer_index: layerIndex });
      changed = true;
    }
    // Any geometrically routeable opening layer exits at zero cost. The block
    // then disappears from geometry and its deeper layers become off-board.
    for (let index = 0; index < statuses.length; index += 1) {
      if (statuses[index] !== 0) continue;
      const color = layers[index][0];
      const gates = matchingGates(color, clearedCount(statuses));
      if (!gates.length || !canExit(statuses, index, gates)) continue;
      statuses[index] = 2;
      events.push({ type: "free_geometric_outer_clear", block_id: level.blocks[index].id, color });
      changed = true;
    }
    if (!changed) return { statuses, events };
  }
}

const initialClosure = closeZeroCost(level.blocks.map(() => 0));
const initialKey = stateKey(initialClosure.statuses);
const queue = [{ statuses: initialClosure.statuses, cost: 0 }];
const seen = new Set([initialKey]);
const parent = new Map();
let cursor = 0;
let solved = null;
while (cursor < queue.length && cursor < maxStates) {
  const current = queue[cursor++];
  if (clearedCount(current.statuses) === totalLayers) {
    solved = current;
    break;
  }
  for (let index = 0; index < current.statuses.length; index += 1) {
    if (current.statuses[index] !== 0) continue;
    const moved = [...current.statuses];
    moved[index] = 1;
    const closure = closeZeroCost(moved);
    const key = stateKey(closure.statuses);
    if (seen.has(key)) continue;
    seen.add(key);
    parent.set(key, {
      previous: stateKey(current.statuses),
      paid_event: { type: "magic_infinite_parking", block_id: level.blocks[index].id, cost: 1 },
      zero_cost_events: closure.events,
    });
    queue.push({ statuses: closure.statuses, cost: current.cost + 1 });
  }
}

let abstractWitness = null;
if (solved) {
  const segments = [];
  let key = stateKey(solved.statuses);
  while (key !== initialKey) {
    const entry = parent.get(key);
    if (!entry) throw new Error("Broken abstract predecessor chain");
    segments.push(entry);
    key = entry.previous;
  }
  segments.reverse();
  abstractWitness = {
    initial_zero_cost_events: initialClosure.events,
    paid_cost: solved.cost,
    segments,
    final_cleared_layers: clearedCount(solved.statuses),
  };
}

const minimum = solved?.cost ?? null;
const exhausted = Boolean(solved || cursor >= queue.length);
const status = solved
  ? minimum >= floor ? "floor_lower_bound_proven_by_infinite_parking_relaxation" : "floor_disproven_in_relaxation_only"
  : exhausted ? "relaxed_puzzle_impossible" : "inconclusive_state_cap";
const report = {
  schema: "blockout-video-parity-infinite-parking-lower-bound-v1",
  generated_at: new Date().toISOString(),
  input: {
    path: relative(root, inputPath).replaceAll("\\", "/"),
    source_sha256: sha256(inputText),
    bundled_sha256: sha256(bundle.outputFiles[0].contents),
  },
  level_id: levelId,
  level_spec_sha256: sha256(canonicalJson(level)),
  requested_floor: floor,
  status,
  target_floor_certified: Boolean(solved && minimum >= floor),
  exact_relaxed_minimum_paid_blocks: minimum,
  explored_states: cursor,
  discovered_states: seen.size,
  state_cap: maxStates,
  total_layers: totalLayers,
  relaxation: {
    paid_action: "erase any intact block into infinite parking at cost 1, even if no legal real move exists",
    parked_geometry: "removed permanently",
    parked_layer_clears: "free whenever the matching gate unlocks",
    normal_outer_exit: "removes geometry immediately; deeper layers continue off-board",
    removed_constraints: ["numeric ice", "blocked cells", "movement axes", "locks/keys", "stars", "dynamic mechanics", "timer"],
    soundness: "Every real solution maps to a relaxed solution with no greater paid cost; therefore relaxed minimum <= real internal-drag minimum.",
  },
  abstract_completion_witness: abstractWitness,
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: outputPath, status, minimum, explored_states: cursor, discovered_states: seen.size }, null, 2));
if (!report.target_floor_certified) process.exitCode = 2;
