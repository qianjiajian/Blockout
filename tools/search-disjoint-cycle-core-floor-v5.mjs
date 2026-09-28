import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const valueOf = (name, fallback = null) => {
  const index = argv.indexOf(name);
  return index < 0 ? fallback : argv[index + 1];
};
const required = (name) => {
  const value = valueOf(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const integer = (name, fallback) => {
  const value = Number(valueOf(name, String(fallback)));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};

const inputPath = resolve(ROOT, required("--input"));
const outputDir = resolve(ROOT, required("--output-dir"));
const levelNumber = integer("--level", 1);
const directStateCap = integer("--direct-state-cap", 10_000);
const coreStateCap = integer("--core-state-cap", 50_000);
const maximumCycleLength = integer("--max-cycle-length", 8);
const maximumCycleMasks = integer("--max-cycle-masks", 20_000);
const packingNodeCap = integer("--packing-node-cap", 1_000_000);
const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;

const bundle = await build({
  stdin: {
    contents: `
      import { validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "search-disjoint-cycle-core-floor-v5-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);

const artifact = JSON.parse(await readFile(inputPath, "utf8"));
const source = (artifact.levels ?? []).find((entry) => entry.level_id === levelId || entry.level?.id === levelNumber);
if (!source) throw new Error(`${levelId} is missing from ${inputPath}`);
const level = source.level;
if ((level.shutters?.length ?? 0) || (level.elevators?.length ?? 0) || (level.conveyors?.length ?? 0)) {
  throw new Error(`${levelId} is dynamic or staged; use the stage-additive verifier instead`);
}
if (level.blocks.some((block) => (block.layers?.length ?? 1) !== 1 || (block.frozen ?? 0) !== 0 || block.star)) {
  throw new Error(`${levelId} contains layered, frozen, or star blocks unsupported by this conservative cycle search`);
}
if (level.gates.some((gate) => (gate.frozen ?? 0) !== 0 || gate.star)) {
  throw new Error(`${levelId} contains frozen or star gates unsupported by this conservative cycle search`);
}
const target = source.target?.recommended_minimum_reposition_overhead
  ?? source.target?.solver_acceptance?.minimum_reposition_overhead
  ?? source.audit?.target_reposition_overhead;
if (!Number.isSafeInteger(target) || target <= 0) throw new Error(`${levelId} has no positive target floor`);

const clone = (value) => structuredClone(value);
const pointKey = ([x, y]) => `${x},${y}`;
const uniquePoints = (points) => [...new Map(points.map((point) => [pointKey(point), point])).values()];
const cellsOf = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const strippedLevel = (blocks, extraBlocked = []) => {
  const next = clone(level);
  next.name = `${level.name} conservative zero-setup precedence core`;
  next.blocks = blocks.map((block) => {
    const copy = clone(block);
    copy.frozen = 0;
    delete copy.shutterId;
    return copy;
  });
  next.gates = next.gates.map((gate) => ({ ...gate, frozen: 0 }));
  const blocked = uniquePoints([...(next.blocked ?? []), ...extraBlocked]);
  if (blocked.length) next.blocked = blocked;
  else delete next.blocked;
  delete next.shutters;
  delete next.elevators;
  delete next.conveyors;
  delete next.designTargets;
  delete next.onboardingHint;
  delete next.strategyNudge;
  delete next.strategyFocus;
  delete next.featureIntro;
  return next;
};
const solve = (candidate, cap) => {
  try { runtime.validateLevel(candidate); } catch { return { status: "invalid", solution: null }; }
  const solution = runtime.solveLevelOptimally(candidate, cap);
  const status = solution.solved ? "solved" : solution.exploredStates < cap ? "exhausted_unsolved" : "capped";
  return { status, solution };
};

const blocks = level.blocks;
const indices = new Map(blocks.map((block, index) => [block.id, index]));
const baseline = [];
for (const block of blocks) {
  const result = solve(strippedLevel([block]), directStateCap);
  baseline.push(result);
}
const adjacency = Array.from({ length: blocks.length }, () => []);
const edgeEvidence = [];
for (let blockerIndex = 0; blockerIndex < blocks.length; blockerIndex += 1) {
  const blocker = blocks[blockerIndex];
  for (let blockedIndex = 0; blockedIndex < blocks.length; blockedIndex += 1) {
    if (blockerIndex === blockedIndex) continue;
    const direct = baseline[blockedIndex];
    if (direct.status !== "solved" || direct.solution.repositionOverhead !== 0) continue;
    const blockedBlock = blocks[blockedIndex];
    const result = solve(strippedLevel([blockedBlock], cellsOf(blocker)), directStateCap);
    const provesNoDirectExit = result.status === "exhausted_unsolved"
      || (result.status === "solved" && result.solution.repositionOverhead > 0);
    if (!provesNoDirectExit) continue;
    adjacency[blockerIndex].push(blockedIndex);
    edgeEvidence.push({
      must_vacate_block_id: blocker.id,
      before_zero_setup_exit_of_block_id: blockedBlock.id,
      blocked_single_block_status: result.status,
      blocked_single_block_reposition_overhead: result.solution?.solved ? result.solution.repositionOverhead : null,
      explored_states: result.solution?.exploredStates ?? 0,
    });
    globalThis.gc?.();
  }
}

// Enumerate simple directed cycles. Requiring the start vertex to be the
// smallest index removes rotational duplicates. Vertex-set duplicates are
// collapsed because the subsequent exact core proof depends only on the set.
const cycleMasks = new Map();
let cycleEnumerationCapped = false;
for (let start = 0; start < blocks.length && !cycleEnumerationCapped; start += 1) {
  const visited = new Set([start]);
  const path = [start];
  const visit = (current) => {
    if (cycleEnumerationCapped) return;
    for (const next of adjacency[current]) {
      if (next === start && path.length >= 2) {
        const ordered = [...path].sort((left, right) => left - right);
        const mask = ordered.reduce((value, index) => value | (1n << BigInt(index)), 0n);
        const signature = mask.toString(36);
        if (!cycleMasks.has(signature)) cycleMasks.set(signature, { mask, indices: ordered, cycle: [...path, start] });
        if (cycleMasks.size >= maximumCycleMasks) cycleEnumerationCapped = true;
        continue;
      }
      if (path.length >= maximumCycleLength || next <= start || visited.has(next)) continue;
      visited.add(next);
      path.push(next);
      visit(next);
      path.pop();
      visited.delete(next);
    }
  };
  visit(start);
}

const coreGroups = [];
const orderedCycleMasks = [...cycleMasks.values()].sort((left, right) => left.indices.length - right.indices.length
  || left.indices.join(",").localeCompare(right.indices.join(",")));
for (let index = 0; index < orderedCycleMasks.length; index += 1) {
  const cycle = orderedCycleMasks[index];
  const coreBlocks = cycle.indices.map((blockIndex) => blocks[blockIndex]);
  const result = solve(strippedLevel(coreBlocks), coreStateCap);
  if (result.status === "solved" && result.solution.repositionOverhead > 0) {
    coreGroups.push({
      mask: cycle.mask,
      block_ids: coreBlocks.map((block) => block.id),
      exact_reposition_overhead: result.solution.repositionOverhead,
      exact_minimum_drags: result.solution.minimumDrags,
      explored_states: result.solution.exploredStates,
      route: result.solution.drags,
      precedence_cycle: cycle.cycle.map((blockIndex) => blocks[blockIndex].id),
    });
  }
  if ((index + 1) % 250 === 0) console.log(`${levelId}: exact cycle cores ${index + 1}/${orderedCycleMasks.length}`);
  globalThis.gc?.();
}

// A mask can appear through more than one cycle. Keep its strongest exact
// lower bound, then search for disjoint masks whose certified floors add.
const bestByMask = new Map();
for (const group of coreGroups) {
  const signature = group.mask.toString(36);
  const previous = bestByMask.get(signature);
  if (!previous || group.exact_reposition_overhead > previous.exact_reposition_overhead) bestByMask.set(signature, group);
}
const groups = [...bestByMask.values()].sort((left, right) => (
  (right.exact_reposition_overhead / right.block_ids.length) - (left.exact_reposition_overhead / left.block_ids.length)
  || right.exact_reposition_overhead - left.exact_reposition_overhead
  || left.block_ids.length - right.block_ids.length
));
let packingNodes = 0;
let winner = null;
let best = { floor: 0, groups: [] };
const visitPacking = (from, usedMask, floor, selected) => {
  packingNodes += 1;
  if (floor > best.floor) best = { floor, groups: [...selected] };
  if (floor >= target) { winner = [...selected]; return; }
  if (winner || packingNodes >= packingNodeCap) return;
  for (let index = from; index < groups.length; index += 1) {
    const group = groups[index];
    if ((usedMask & group.mask) !== 0n) continue;
    selected.push(group);
    visitPacking(index + 1, usedMask | group.mask, floor + group.exact_reposition_overhead, selected);
    selected.pop();
    if (winner || packingNodes >= packingNodeCap) return;
  }
};
visitPacking(0, 0n, 0, []);
const selected = winner ?? best.groups;
let remainingFloor = target;
const annotations = selected.map((group) => {
  const allocatedFloor = Math.min(group.exact_reposition_overhead, remainingFloor);
  remainingFloor -= allocatedFloor;
  return {
    stage_index: 1,
    block_ids: group.block_ids,
    target_reposition_overhead: allocatedFloor,
    route: group.route,
    exact_core_reposition_overhead: group.exact_reposition_overhead,
    exact_core_minimum_drags: group.exact_minimum_drags,
    exact_core_explored_states: group.explored_states,
    precedence_cycle: group.precedence_cycle,
  };
}).filter((group) => group.target_reposition_overhead > 0);
const certifiedFloor = annotations.reduce((sum, group) => sum + group.target_reposition_overhead, 0);

const candidate = certifiedFloor >= target ? clone(source) : null;
if (candidate) {
  candidate.audit = {
    ...(candidate.audit ?? {}),
    strict_core_floor_groups: annotations,
    disjoint_cycle_core_search: {
      target_reposition_overhead: target,
      certified_reposition_overhead: certifiedFloor,
      proof_invariant: "With zero setup moves, every precedence edge requires its blocker to exit first. Every directed cycle therefore requires at least one repositioned block. The emitted disjoint cycle cores are independently solved and are re-proved by the strict verifier; their block-action lower bounds add.",
    },
  };
}

await mkdir(outputDir, { recursive: true });
const report = {
  schema_version: "blockout-v5-disjoint-cycle-core-search-1",
  generated_at: new Date().toISOString(),
  source: relative(ROOT, inputPath).replaceAll("\\", "/"),
  level_id: levelId,
  target_reposition_overhead: target,
  status: candidate ? "core_groups_found" : "unresolved",
  graph: {
    block_count: blocks.length,
    edge_count: edgeEvidence.length,
    cycle_mask_count: cycleMasks.size,
    cycle_enumeration_capped: cycleEnumerationCapped,
    maximum_cycle_length: maximumCycleLength,
  },
  packing: {
    exact_core_group_count: groups.length,
    explored_nodes: packingNodes,
    node_cap: packingNodeCap,
    selected_group_count: annotations.length,
    selected_certified_floor: certifiedFloor,
  },
  selected_groups: annotations,
  best_floor_found: best.floor,
  edge_evidence: edgeEvidence,
};
await Promise.all([
  writeFile(resolve(outputDir, "cycle-core-search-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "formal-candidates.json"), `${JSON.stringify({
    title: `${levelId} disjoint-cycle monotone-core candidate`,
    applied_to_live_campaign: false,
    levels: candidate ? [candidate] : [],
  }, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  level_id: levelId,
  status: report.status,
  edge_count: edgeEvidence.length,
  cycle_masks: cycleMasks.size,
  exact_core_groups: groups.length,
  selected_groups: annotations.length,
  certified_floor: certifiedFloor,
  target,
}, null, 2));
if (!candidate) process.exitCode = 1;
