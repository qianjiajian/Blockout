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
const maxGroupSize = Math.min(12, positiveInteger("--max-group-size", 5));
const minGroupSize = Math.max(2, Math.min(maxGroupSize, positiveInteger("--min-group-size", 2)));
const maxStates = positiveInteger("--max-states", 30_000);
const maxSubsets = positiveInteger("--max-subsets", 30_000);
const maxSubsetsPerStage = positiveInteger("--max-subsets-per-stage", maxSubsets);
const randomSubsets = args.includes("--random-subsets");
const randomSeed = positiveInteger("--seed", levelNumber * 104_729 + 17);
const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "search-disjoint-core-floor-v5-runtime.ts",
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
const target = source.target?.recommended_minimum_reposition_overhead
  ?? source.target?.solver_acceptance?.minimum_reposition_overhead
  ?? source.audit?.target_reposition_overhead
  ?? source.level?.designTargets?.minimumRepositionOverhead;
if (!Number.isSafeInteger(target) || target <= 0) throw new Error(`${levelId} has no positive reposition floor`);

const clone = (value) => structuredClone(value);
const keyOf = (x, y) => `${x},${y}`;
const shutterCells = (shutter) => {
  const cells = [];
  for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
    for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) cells.push([x, y]);
  }
  return cells;
};

const buildStages = (candidate) => {
  const level = candidate.level;
  const internal = [...(level.shutters ?? [])]
    .filter((shutter) => shutter.skin === "staging")
    .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
  if (internal.length !== (level.shutters?.length ?? 0)) {
    throw new Error(`${levelId} contains non-staging shutters; disjoint-core decomposition is intentionally static-only`);
  }
  const stageKeys = [undefined, ...internal.map((shutter) => shutter.id)];
  return stageKeys.map((shutterId, stageOffset) => {
    const blocks = level.blocks.filter((block) => block.shutterId === shutterId);
    const blockIds = new Set(blocks.map((block) => block.id));
    const stage = clone(level);
    stage.name = `${level.name} relaxed stage ${stageOffset + 1}`;
    stage.blocks = blocks.map((block) => {
      const copy = clone(block);
      delete copy.shutterId;
      return copy;
    });
    const futureCoverCells = internal.slice(stageOffset).flatMap(shutterCells);
    const blocked = new Map([...(level.blocked ?? []), ...futureCoverCells]
      .map((cell) => [keyOf(cell[0], cell[1]), cell]));
    if (blocked.size) stage.blocked = [...blocked.values()];
    else delete stage.blocked;
    delete stage.shutters;
    delete stage.elevators;
    delete stage.conveyors;
    delete stage.designTargets;
    delete stage.onboardingHint;
    delete stage.strategyNudge;
    delete stage.strategyFocus;
    delete stage.featureIntro;
    const route = (candidate.route ?? []).filter((drag) => blockIds.has(drag.blockId));
    return { index: stageOffset + 1, level: stage, blocks: stage.blocks, route };
  });
};

const coreLevel = (stage, selectedIds) => {
  const selected = new Set(selectedIds);
  const level = clone(stage.level);
  level.name = `${stage.level.name} disjoint monotone core`;
  level.blocks = level.blocks.filter((block) => selected.has(block.id)).map((block) => {
    const copy = clone(block);
    delete copy.frozen;
    return copy;
  });
  level.gates = level.gates.map((gate) => {
    const copy = clone(gate);
    delete copy.frozen;
    return copy;
  });
  return level;
};

const boundaryCells = (level, gate) => new Set(Array.from({ length: gate.size }, (_, index) => {
  const coordinate = gate.offset + index;
  if (gate.side === "top") return keyOf(coordinate, 0);
  if (gate.side === "bottom") return keyOf(coordinate, level.height - 1);
  if (gate.side === "left") return keyOf(0, coordinate);
  return keyOf(level.width - 1, coordinate);
}));

const prioritizedBlocks = (stage) => {
  const dragCounts = new Map();
  for (const drag of stage.route) dragCounts.set(drag.blockId, (dragCounts.get(drag.blockId) ?? 0) + 1);
  const mouths = stage.level.gates.map((gate) => ({ gate, cells: boundaryCells(stage.level, gate) }));
  const foreign = (block) => block.shape.some(([dx, dy]) => mouths.some(({ gate, cells }) => (
    gate.color !== (block.layers?.[0] ?? block.color) && cells.has(keyOf(block.x + dx, block.y + dy))
  )));
  return [...stage.blocks].sort((left, right) => (
    (dragCounts.get(right.id) ?? 0) - (dragCounts.get(left.id) ?? 0)
    || Number(foreign(right)) - Number(foreign(left))
    || right.shape.length - left.shape.length
    || left.id.localeCompare(right.id)
  ));
};

function* combinations(values, size, start = 0, prefix = []) {
  if (prefix.length === size) {
    yield [...prefix];
    return;
  }
  const remaining = size - prefix.length;
  for (let index = start; index <= values.length - remaining; index += 1) {
    prefix.push(values[index]);
    yield* combinations(values, size, index + 1, prefix);
    prefix.pop();
  }
}

const makeRng = (seed) => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};

function* sampledCombinations(values, size, limit, seed) {
  const random = makeRng(seed);
  const signatures = new Set();
  const maximumAttempts = Math.max(limit * 40, 200);
  for (let attempt = 0; signatures.size < limit && attempt < maximumAttempts; attempt += 1) {
    const indices = Array.from({ length: values.length }, (_value, index) => index);
    for (let index = indices.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [indices[index], indices[other]] = [indices[other], indices[index]];
    }
    const selected = indices.slice(0, size).sort((left, right) => left - right);
    const signature = selected.join(",");
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    yield selected.map((index) => values[index]);
  }
}

const bestDisjointPacking = (groups, blockIds) => {
  const indexById = new Map(blockIds.map((id, index) => [id, index]));
  const normalized = groups.map((group, groupIndex) => ({
    ...group,
    groupIndex,
    mask: group.block_ids.reduce((mask, id) => mask | (1n << BigInt(indexById.get(id))), 0n),
  }));
  const byBlock = Array.from({ length: blockIds.length }, () => []);
  normalized.forEach((group) => {
    for (const id of group.block_ids) byBlock[indexById.get(id)].push(group);
  });
  const memo = new Map();
  const visit = (available) => {
    const memoKey = available.toString(36);
    if (memo.has(memoKey)) return memo.get(memoKey);
    let pivot = -1;
    let pivotOptions = null;
    for (let index = 0; index < blockIds.length; index += 1) {
      if ((available & (1n << BigInt(index))) === 0n) continue;
      const options = byBlock[index].filter((group) => (group.mask & available) === group.mask);
      if (!options.length) continue;
      if (!pivotOptions || options.length < pivotOptions.length) {
        pivot = index;
        pivotOptions = options;
      }
    }
    if (pivot < 0) {
      const empty = { floor: 0, groups: [] };
      memo.set(memoKey, empty);
      return empty;
    }
    let best = visit(available & ~(1n << BigInt(pivot)));
    for (const group of pivotOptions) {
      const suffix = visit(available & ~group.mask);
      const candidate = { floor: group.floor + suffix.floor, groups: [group, ...suffix.groups] };
      if (candidate.floor > best.floor
        || (candidate.floor === best.floor && candidate.groups.reduce((sum, item) => sum + item.block_ids.length, 0)
          < best.groups.reduce((sum, item) => sum + item.block_ids.length, 0))) best = candidate;
    }
    memo.set(memoKey, best);
    return best;
  };
  const full = (1n << BigInt(blockIds.length)) - 1n;
  return { ...visit(full), memo_states: memo.size };
};

const stages = buildStages(source);
const stageSearches = stages.map((stage) => ({
  stage,
  ordered: prioritizedBlocks(stage),
  candidates: [],
  tested: 0,
  inconclusive: 0,
  invalid: 0,
  best: { floor: 0, groups: [], memo_states: 0 },
}));
let testedTotal = 0;
let reachedTarget = false;

outer:
for (let size = minGroupSize; size <= maxGroupSize && !reachedTarget && testedTotal < maxSubsets; size += 1) {
  for (const search of stageSearches) {
    if (search.ordered.length < size) continue;
    let testedForStageAndSize = 0;
    const remainingBudget = Math.min(maxSubsets - testedTotal, maxSubsetsPerStage);
    const candidates = randomSubsets
      ? sampledCombinations(search.ordered, size, remainingBudget, randomSeed + search.stage.index * 1_000_003 + size * 10_007)
      : combinations(search.ordered, size);
    for (const blocks of candidates) {
      if (testedTotal >= maxSubsets) break;
      if (testedForStageAndSize >= maxSubsetsPerStage) break;
      testedTotal += 1;
      testedForStageAndSize += 1;
      search.tested += 1;
      const blockIds = blocks.map((block) => block.id);
      const level = coreLevel(search.stage, blockIds);
      try { runtime.validateLevel(level); } catch {
        search.invalid += 1;
        continue;
      }
      const solved = runtime.solveLevelOptimally(level, maxStates);
      if (!solved.solved) {
        search.inconclusive += 1;
        globalThis.gc?.();
        continue;
      }
      if (solved.repositionOverhead <= 0) {
        globalThis.gc?.();
        continue;
      }
      search.candidates.push({
        block_ids: blockIds,
        floor: solved.repositionOverhead,
        minimum_drags: solved.minimumDrags,
        explored_states: solved.exploredStates,
        route: solved.drags,
      });
      if (search.candidates.length % 25 === 0) {
        search.best = bestDisjointPacking(search.candidates, search.ordered.map((block) => block.id));
        const combined = stageSearches.reduce((sum, entry) => sum + entry.best.floor, 0);
        if (combined >= target) {
          reachedTarget = true;
          break outer;
        }
      }
      if (testedTotal % 250 === 0) {
        console.log(`${levelId}: tested ${testedTotal}; stage ${search.stage.index} size ${size}; positive cores ${search.candidates.length}`);
      }
      globalThis.gc?.();
    }
    search.best = bestDisjointPacking(search.candidates, search.ordered.map((block) => block.id));
  }
  const combined = stageSearches.reduce((sum, search) => sum + search.best.floor, 0);
  console.log(`${levelId}: through group size ${size}, disjoint core floor ${combined}/${target}`);
  reachedTarget = combined >= target;
}

const stageAllocations = stageSearches.map((search) => search.best.floor);
const certifiedFloor = stageAllocations.reduce((sum, floor) => sum + floor, 0);
const routeCapacities = stages.map((stage) => Math.max(0, stage.route.length - stage.blocks.reduce(
  (sum, block) => sum + (block.layers?.length ?? 1), 0,
)));
const errors = [];
stageAllocations.forEach((floor, index) => {
  if (floor > routeCapacities[index]) errors.push(`stage ${index + 1} core floor ${floor} exceeds witness capacity ${routeCapacities[index]}`);
});
if (certifiedFloor < target) errors.push(`disjoint core floor ${certifiedFloor} is below target ${target}`);

const candidate = errors.length ? null : clone(source);
if (candidate) {
  candidate.audit = {
    ...(candidate.audit ?? {}),
    strict_stage_floor_allocation: stageAllocations,
    strict_core_floor_groups: stageSearches.flatMap((search) => search.best.groups.map((group) => ({
      stage_index: search.stage.index,
      block_ids: group.block_ids,
      target_reposition_overhead: group.floor,
      route: group.route,
    }))),
    disjoint_core_floor_search: {
      target_reposition_overhead: target,
      certified_core_floor: certifiedFloor,
      stage_allocations: stageAllocations,
      proof_invariant: "Removing all non-core blocks and thawing counters is a relaxation. Exact lower bounds over mutually disjoint block groups add because every drag belongs to only one block.",
    },
  };
}

const report = {
  schema_version: "blockout-v5-disjoint-core-floor-search-1",
  generated_at: new Date().toISOString(),
  source: relative(ROOT, input).replaceAll("\\", "/"),
  level_id: levelId,
  target_reposition_overhead: target,
  configuration: {
    min_group_size: minGroupSize,
    max_group_size: maxGroupSize,
    max_states_per_core: maxStates,
    max_subsets: maxSubsets,
    max_subsets_per_stage_and_size: maxSubsetsPerStage,
    random_subsets: randomSubsets,
    random_seed: randomSeed,
  },
  status: candidate ? "core_sum_found" : "unresolved",
  certified_core_floor: certifiedFloor,
  stage_allocations: stageAllocations,
  witness_route_capacities: routeCapacities,
  errors,
  stages: stageSearches.map((search) => ({
    stage_index: search.stage.index,
    block_count: search.stage.blocks.length,
    tested_subsets: search.tested,
    invalid_subsets: search.invalid,
    inconclusive_subsets: search.inconclusive,
    positive_core_count: search.candidates.length,
    best_disjoint_floor: search.best.floor,
    packing_memo_states: search.best.memo_states,
    selected_groups: search.best.groups.map(({ mask: _mask, groupIndex: _groupIndex, ...group }) => group),
  })),
};

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDir, "core-search-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "formal-candidates.json"), `${JSON.stringify({
    title: `${levelId} disjoint monotone-core lower-bound candidate`,
    applied_to_live_campaign: false,
    levels: candidate ? [candidate] : [],
  }, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  level_id: levelId,
  status: report.status,
  target,
  certified_core_floor: certifiedFloor,
  stage_allocations: stageAllocations,
  tested_subsets: testedTotal,
  output: relative(ROOT, outputDir).replaceAll("\\", "/"),
}, null, 2));
if (!candidate) process.exitCode = 1;
