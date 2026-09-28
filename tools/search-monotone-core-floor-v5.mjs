import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const optional = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const required = (name) => {
  const value = optional(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const positiveInteger = (name, fallback) => {
  const value = Number(optional(name, String(fallback)));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};

const input = resolve(ROOT, required("--input"));
const outputDir = resolve(ROOT, required("--output-dir"));
const levelNumber = positiveInteger("--level", 1);
const trials = positiveInteger("--trials", 800);
const maxStates = positiveInteger("--max-states", 30_000);
const seed = positiveInteger("--seed", levelNumber * 104729 + 17);
const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "search-monotone-core-floor-v5-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const artifact = JSON.parse(await readFile(input, "utf8"));
const source = (artifact.levels ?? []).find((entry) => entry.level_id === levelId || entry.level?.id === levelNumber);
if (!source) throw new Error(`${levelId} is missing from ${input}`);
if ((source.level.shutters?.length ?? 0) > 0 || source.level.elevators?.length || source.level.conveyors?.length) {
  throw new Error("This search currently accepts only a fixed, nonstaged level without elevators or conveyors");
}
const target = source.target?.recommended_minimum_reposition_overhead
  ?? source.target?.solver_acceptance?.minimum_reposition_overhead
  ?? source.audit?.target_reposition_overhead;
if (!Number.isSafeInteger(target) || target <= 0) throw new Error(`${levelId} has no positive target floor`);

const clone = (value) => structuredClone(value);
const keyOf = (x, y) => `${x},${y}`;
const replay = (level, route) => {
  let model;
  try { model = new runtime.PuzzleModel(level); } catch (error) { return { pass: false, reason: `init:${error.message}` }; }
  for (let index = 0; index < route.length; index += 1) {
    const drag = route[index];
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlock(drag.blockId, x, y)) return { pass: false, reason: `move:${index}` };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return { pass: false, reason: `exit:${index}` };
    if (!model.commitAction()) return { pass: false, reason: `commit:${index}` };
  }
  return { pass: model.snapshot().complete, reason: model.snapshot().complete ? null : "incomplete" };
};
const coreLevel = (blockIds) => {
  const selected = new Set(blockIds);
  const level = clone(source.level);
  level.name = `${source.level.name} monotone core search`;
  level.blocks = level.blocks.filter((block) => selected.has(block.id)).map((block) => ({ ...block, frozen: 0 }));
  level.gates = level.gates.map((gate) => ({ ...gate, frozen: 0 }));
  delete level.designTargets;
  delete level.onboardingHint;
  delete level.strategyNudge;
  delete level.strategyFocus;
  return level;
};
const gateCells = source.level.gates.map((gate) => ({
  gate,
  cells: new Set(Array.from({ length: gate.size }, (_, index) => {
    const coordinate = gate.offset + index;
    if (gate.side === "top") return keyOf(coordinate, 0);
    if (gate.side === "bottom") return keyOf(coordinate, source.level.height - 1);
    if (gate.side === "left") return keyOf(0, coordinate);
    return keyOf(source.level.width - 1, coordinate);
  })),
}));
const touchesForeignGate = (block) => {
  const cells = block.shape.map(([dx, dy]) => keyOf(block.x + dx, block.y + dy));
  return gateCells.some(({ gate, cells: mouth }) => gate.color !== block.color && cells.some((cell) => mouth.has(cell)));
};
const allIds = source.level.blocks.map((block) => block.id);
const repositionedIds = new Set(source.route.filter((drag) => !drag.exitSide).map((drag) => drag.blockId));
const foreignIds = new Set(source.level.blocks.filter(touchesForeignGate).map((block) => block.id));
const priorityIds = [...new Set([...repositionedIds, ...foreignIds])];
const remainingIds = allIds.filter((id) => !priorityIds.includes(id));

let rngState = seed >>> 0;
const random = () => {
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 4294967296;
};
const shuffled = (values) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const signatures = new Set();
const candidateSubsets = [];
const addSubset = (ids) => {
  const ordered = [...new Set(ids)].sort();
  if (ordered.length < Math.min(allIds.length, target + 1) || ordered.length >= allIds.length) return;
  const signature = ordered.join("|");
  if (signatures.has(signature)) return;
  signatures.add(signature);
  candidateSubsets.push(ordered);
};

addSubset(priorityIds);
for (let removeCount = 1; removeCount <= Math.min(10, allIds.length - target - 1); removeCount += 1) {
  for (let attempt = 0; attempt < Math.max(4, Math.floor(trials / 25)); attempt += 1) {
    const removable = shuffled(allIds);
    addSubset(removable.slice(removeCount));
  }
}
while (candidateSubsets.length < trials) {
  const minimumSize = Math.max(target + 1, priorityIds.length, Math.ceil(allIds.length * 0.5));
  const size = minimumSize + Math.floor(random() * Math.max(1, allIds.length - minimumSize));
  const keepPriority = random() < 0.7;
  const base = keepPriority ? shuffled(priorityIds).slice(0, Math.min(priorityIds.length, size)) : [];
  const pool = shuffled([...remainingIds, ...priorityIds.filter((id) => !base.includes(id))]);
  addSubset([...base, ...pool.slice(0, Math.max(0, size - base.length))]);
  if (signatures.size >= (2 ** Math.min(allIds.length, 20)) - 2) break;
}
candidateSubsets.sort((left, right) => left.length - right.length
  || right.filter((id) => priorityIds.includes(id)).length - left.filter((id) => priorityIds.includes(id)).length
  || left.join("|").localeCompare(right.join("|")));

const attempts = [];
let winner = null;
let bestSolved = null;
for (let index = 0; index < candidateSubsets.length && !winner; index += 1) {
  const blockIds = candidateSubsets[index];
  const level = coreLevel(blockIds);
  let validateError = null;
  try { runtime.validateLevel(level); } catch (error) { validateError = error.message; }
  const projectedRoute = source.route.filter((drag) => blockIds.includes(drag.blockId));
  const projectedReplay = validateError ? { pass: false, reason: validateError } : replay(level, projectedRoute);
  if (!projectedReplay.pass) {
    attempts.push({ subset_size: blockIds.length, status: "projected_route_rejected", reason: projectedReplay.reason });
    globalThis.gc?.();
    continue;
  }
  const solved = runtime.solveLevelOptimally(level, maxStates);
  const row = {
    subset_size: blockIds.length,
    priority_blocks: blockIds.filter((id) => priorityIds.includes(id)).length,
    solved: solved.solved,
    explored_states: solved.exploredStates,
    exact_reposition_overhead: solved.solved ? solved.repositionOverhead : null,
  };
  attempts.push(row);
  if (solved.solved && (!bestSolved || solved.repositionOverhead > bestSolved.exact_reposition_overhead
    || (solved.repositionOverhead === bestSolved.exact_reposition_overhead && blockIds.length < bestSolved.block_ids.length))) {
    bestSolved = { ...row, block_ids: blockIds };
  }
  if (solved.solved && solved.repositionOverhead >= target) {
    winner = { blockIds, solved, projectedRoute };
    console.log(`${levelId}: core ${blockIds.length}/${allIds.length} certifies exact OH ${solved.repositionOverhead} >= ${target}`);
  } else if ((index + 1) % 25 === 0) {
    console.log(`${levelId}: searched ${index + 1}/${candidateSubsets.length}; best exact OH ${bestSolved?.exact_reposition_overhead ?? "none"}`);
  }
  // The exact solver creates a large transposition table for every subset.
  // Release each table before evaluating the next independent core candidate.
  globalThis.gc?.();
}

const candidate = winner ? clone(source) : null;
if (candidate) {
  candidate.audit = {
    ...(candidate.audit ?? {}),
    strict_core_floor_groups: [{
      stage_index: 1,
      block_ids: winner.blockIds,
      target_reposition_overhead: target,
    }],
    monotone_core_search: {
      exact_core_reposition_overhead: winner.solved.repositionOverhead,
      exact_core_minimum_drags: winner.solved.minimumDrags,
      exact_core_explored_states: winner.solved.exploredStates,
      full_block_count: allIds.length,
      core_block_count: winner.blockIds.length,
      proof_invariant: "All non-core blocks are removed and frozen counters are reset, yielding an easier puzzle. Every full solution projects onto the selected core, so its reposition lower bound applies to the full level.",
    },
  };
}

await mkdir(outputDir, { recursive: true });
const report = {
  schema_version: "blockout-v5-monotone-core-search-1",
  generated_at: new Date().toISOString(),
  source: relative(ROOT, input).replaceAll("\\", "/"),
  level_id: levelId,
  target_reposition_overhead: target,
  configuration: { trials, max_states_per_subset: maxStates, seed },
  source_summary: {
    block_count: allIds.length,
    route_reposition_overhead: source.route.filter((drag) => !drag.exitSide).length,
    repositioned_block_count: repositionedIds.size,
    foreign_gate_block_count: foreignIds.size,
    priority_block_count: priorityIds.length,
  },
  status: winner ? "core_found" : "unresolved",
  selected_core: winner ? {
    block_ids: winner.blockIds,
    block_count: winner.blockIds.length,
    exact_reposition_overhead: winner.solved.repositionOverhead,
    exact_minimum_drags: winner.solved.minimumDrags,
    explored_states: winner.solved.exploredStates,
  } : null,
  best_solved_core: bestSolved,
  attempts,
};
await Promise.all([
  writeFile(resolve(outputDir, "core-search-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "formal-candidates.json"), `${JSON.stringify({
    title: `${levelId} monotone-core lower-bound candidate`,
    applied_to_live_campaign: false,
    levels: candidate ? [candidate] : [],
  }, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({ level_id: levelId, status: report.status, selected_core: report.selected_core, best_solved_core: bestSolved }, null, 2));
if (!winner) process.exitCode = 1;
