import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
const integer = (name, fallback, minimum = 1) => {
  const value = Number(optional(name, String(fallback)));
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${name} must be an integer >= ${minimum}`);
  return value;
};
const inputPath = resolve(ROOT, required("--input"));
const outputDir = resolve(ROOT, required("--output-dir"));
const levelNumber = integer("--level", 80);
const maximumFrozen = integer("--max-frozen", 8);
const validationCap = integer("--validation-cap", 80_000);
const exactCap = integer("--exact-cap", 20_000);
const focusStage = optional("--focus-stage") === null ? null : integer("--focus-stage", 1);
const targetKind = optional("--kind", "gate");
const emitWitnessCandidates = args.includes("--emit-witness-candidates");
const descriptorOffset = integer("--descriptor-offset", 0, 0);
const descriptorLimit = integer("--descriptor-limit", Number.MAX_SAFE_INTEGER);
const targetBlockIds = new Set(String(optional("--block-ids", ""))
  .split(",").map((value) => value.trim()).filter(Boolean));
if (!new Set(["gate", "gate-pair", "block", "both", "layer"]).has(targetKind)) {
  throw new Error("--kind must be gate, gate-pair, block, both, or layer");
}

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { isIceEligibleBlockShape } from "./src/core/blockShape.ts";
      import { solveLevelForValidation, solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel, isIceEligibleBlockShape, solveLevelForValidation, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "search-staged-freeze-variants-v5-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].text).toString("base64")}`);

const clone = (value) => structuredClone(value);
const keyOf = ([x, y]) => `${x},${y}`;
const uniquePoints = (points) => [...new Map(points.map((point) => [keyOf(point), point])).values()];
const shutterFootprint = (shutter) => {
  const result = [];
  for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
    for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) result.push([x, y]);
  }
  return result;
};
const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlock(drag.blockId, x, y)) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  return model.snapshot().complete;
};
const clearFrozen = (level) => {
  for (const gate of level.gates) delete gate.frozen;
  for (const block of level.blocks) delete block.frozen;
};
const stageLevels = (level) => {
  const shutters = [...(level.shutters ?? [])]
    .filter((shutter) => shutter.skin === "staging")
    .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
  if (shutters.length !== (level.shutters?.length ?? 0)) {
    throw new Error("Candidate may contain no shutters or only internal staging shutters");
  }
  if (!shutters.length) {
    const stage = clone(level);
    delete stage.elevators;
    delete stage.conveyors;
    delete stage.designTargets;
    delete stage.onboardingHint;
    delete stage.strategyNudge;
    delete stage.strategyFocus;
    return [stage];
  }
  const groups = [
    level.blocks.filter((block) => !block.shutterId),
    ...shutters.map((shutter) => level.blocks.filter((block) => block.shutterId === shutter.id)),
  ];
  let priorClearLoad = 0;
  return groups.map((group, stageIndex) => {
    const stage = clone(level);
    stage.gates = stage.gates.map((gate) => ({
      ...gate,
      frozen: Math.max(0, (gate.frozen ?? 0) - priorClearLoad),
    }));
    stage.blocks = group.map((block) => {
      const copy = clone(block);
      delete copy.shutterId;
      copy.frozen = Math.max(0, (copy.frozen ?? 0) - priorClearLoad);
      return copy;
    });
    const futureCovers = shutters.slice(stageIndex).flatMap(shutterFootprint);
    const blocked = uniquePoints([...(level.blocked ?? []), ...futureCovers]);
    if (blocked.length) stage.blocked = blocked;
    else delete stage.blocked;
    delete stage.shutters;
    delete stage.elevators;
    delete stage.conveyors;
    priorClearLoad += group.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    return stage;
  });
};
const allocateFloor = (target, exactFloors) => {
  const floors = exactFloors.map(() => 0);
  let remaining = target;
  const order = exactFloors.map((value, index) => ({ index, value }))
    .sort((left, right) => right.value - left.value || left.index - right.index);
  for (const { index, value } of order) {
    const assigned = Math.min(value, remaining);
    floors[index] = assigned;
    remaining -= assigned;
  }
  return remaining === 0 ? floors : null;
};

const artifact = JSON.parse(await readFile(inputPath, "utf8"));
const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;
const source = (artifact.levels ?? []).find((entry) => entry.level_id === levelId || entry.level?.id === levelNumber);
if (!source) throw new Error(`${levelId} is missing from input`);
const target = source.target?.recommended_minimum_reposition_overhead
  ?? source.target?.solver_acceptance?.minimum_reposition_overhead
  ?? source.validation?.target_reposition_overhead;
if (!Number.isSafeInteger(target) || target < 1) throw new Error(`${levelId} has no positive reposition target`);
const baseLevel = clone(source.level);
clearFrozen(baseLevel);
const palette = source.target?.design_palette ?? [...new Set(baseLevel.blocks.map((block) => block.color))];

const descriptors = [];
if (targetKind === "gate" || targetKind === "both") {
  baseLevel.gates.forEach((gate, index) => {
    for (let frozen = 1; frozen <= maximumFrozen; frozen += 1) {
      descriptors.push({ kind: "gate", index, id: gate.id, frozen });
    }
  });
}
if (targetKind === "gate-pair") {
  for (let first = 0; first < baseLevel.gates.length; first += 1) {
    for (let second = first + 1; second < baseLevel.gates.length; second += 1) {
      for (let frozenA = 1; frozenA <= maximumFrozen; frozenA += 1) {
        for (let frozenB = 1; frozenB <= maximumFrozen; frozenB += 1) {
          descriptors.push({
            kind: "gate-pair",
            first,
            second,
            first_id: baseLevel.gates[first].id,
            second_id: baseLevel.gates[second].id,
            frozen_a: frozenA,
            frozen_b: frozenB,
          });
        }
      }
    }
  }
}
if (targetKind === "block" || targetKind === "both") {
  const orderedShutterIds = [...(baseLevel.shutters ?? [])]
    .filter((shutter) => shutter.skin === "staging")
    .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id))
    .map((shutter) => shutter.id);
  baseLevel.blocks.forEach((block, index) => {
    const blockStage = block.shutterId ? orderedShutterIds.indexOf(block.shutterId) + 2 : 1;
    if (focusStage !== null && blockStage !== focusStage) return;
    if (targetBlockIds.size && !targetBlockIds.has(block.id)) return;
    if (!runtime.isIceEligibleBlockShape(block.shape)) return;
    for (let frozen = 1; frozen <= maximumFrozen; frozen += 1) {
      descriptors.push({ kind: "block", index, id: block.id, frozen });
    }
  });
}
if (targetKind === "layer") {
  const orderedShutterIds = [...(baseLevel.shutters ?? [])]
    .filter((shutter) => shutter.skin === "staging")
    .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id))
    .map((shutter) => shutter.id);
  baseLevel.blocks.forEach((block, index) => {
    const blockStage = block.shutterId ? orderedShutterIds.indexOf(block.shutterId) + 2 : 1;
    if (focusStage !== null && blockStage !== focusStage) return;
    if (targetBlockIds.size && !targetBlockIds.has(block.id)) return;
    for (const color of palette) {
      if (color !== block.color) descriptors.push({ kind: "layer", index, id: block.id, color });
    }
  });
}

await mkdir(outputDir, { recursive: true });
const results = [];
const exactStageCache = new Map();
const selectedDescriptors = descriptors.slice(descriptorOffset, descriptorOffset + descriptorLimit);
for (const descriptor of selectedDescriptors) {
  const candidate = clone(source);
  candidate.level = clone(baseLevel);
  if (descriptor.kind === "gate") candidate.level.gates[descriptor.index].frozen = descriptor.frozen;
  else if (descriptor.kind === "gate-pair") {
    candidate.level.gates[descriptor.first].frozen = descriptor.frozen_a;
    candidate.level.gates[descriptor.second].frozen = descriptor.frozen_b;
  }
  else if (descriptor.kind === "block") candidate.level.blocks[descriptor.index].frozen = descriptor.frozen;
  else candidate.level.blocks[descriptor.index].layers = [
    candidate.level.blocks[descriptor.index].color,
    descriptor.color,
  ];
  if (descriptor.kind === "layer") {
    const shutters = [...(candidate.level.shutters ?? [])]
      .filter((shutter) => shutter.skin === "staging")
      .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
    const groups = [
      candidate.level.blocks.filter((block) => !block.shutterId),
      ...shutters.map((shutter) => candidate.level.blocks.filter((block) => block.shutterId === shutter.id)),
    ];
    let cumulative = groups[0].reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    shutters.forEach((shutter, index) => {
      shutter.count = cumulative;
      cumulative += groups[index + 1].reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);
    });
  }
  try {
    runtime.validateLevel(candidate.level);
  } catch (error) {
    results.push({ descriptor, status: "invalid", error: error.message });
    globalThis.gc?.();
    continue;
  }
  const exactFloors = [];
  const exactStates = [];
  let exact = true;
  for (const stage of stageLevels(candidate.level)) {
    let solved;
    const cacheKey = JSON.stringify(stage);
    if (exactStageCache.has(cacheKey)) {
      solved = exactStageCache.get(cacheKey);
    } else {
      try {
        runtime.validateLevel(stage);
        solved = runtime.solveLevelOptimally(stage, exactCap);
      } catch {
        solved = null;
      }
      exactStageCache.set(cacheKey, solved);
    }
    if (!solved?.solved || !replay(stage, solved.drags)) {
      exact = false;
      exactStates.push(solved?.exploredStates ?? 0);
      break;
    }
    exactFloors.push(solved.repositionOverhead);
    exactStates.push(solved.exploredStates);
  }
  const exactFloor = exact ? exactFloors.reduce((sum, value) => sum + value, 0) : null;
  const floorAllocation = exactFloor !== null && exactFloor >= target ? allocateFloor(target, exactFloors) : null;
  const row = {
    descriptor,
    status: floorAllocation ? "exact_floor_met" : exact ? "exact_floor_below_target" : "exact_inconclusive",
    exact_stage_floors: exact ? exactFloors : null,
    exact_floor: exactFloor,
    exact_explored_states: exactStates,
  };
  results.push(row);
  if (!floorAllocation && !(emitWitnessCandidates && !exact)) {
    globalThis.gc?.();
    continue;
  }
  let validation;
  try {
    validation = runtime.solveLevelForValidation(candidate.level, validationCap);
  } catch (error) {
    row.status = "validation_solver_error";
    row.error = error.message;
    globalThis.gc?.();
    continue;
  }
  if (!validation.solved || !replay(candidate.level, validation.drags)) {
    row.status = "validation_unsolved";
    row.explored_states = validation.exploredStates;
    globalThis.gc?.();
    continue;
  }
  row.witness_reposition_overhead = validation.repositionOverhead;
  if (validation.repositionOverhead < target) {
    row.status = "validation_witness_below_target";
    globalThis.gc?.();
    continue;
  }
  if (!floorAllocation) row.status = "witness_floor_met_exact_inconclusive";
  candidate.route = validation.drags;
  candidate.audit = {
    ...(candidate.audit ?? {}),
    ...(floorAllocation ? { strict_stage_floor_allocation: floorAllocation } : {}),
  };
  candidate.validation = {
    ...(candidate.validation ?? {}),
    validation_solver_solved: true,
    validation_solver_drags: validation.minimumDrags,
    validation_solver_reposition_overhead: validation.repositionOverhead,
    validation_solver_explored_states: validation.exploredStates,
    certified_reposition_lower_bound: exactFloor ?? 0,
    target_reposition_status: floorAllocation
      ? "exact_stage_floor_met_pending_strict_certificate"
      : "validation_route_met_exact_stage_floor_inconclusive",
    generation_mode: `r141_${descriptor.kind}_freeze_exact_stage_search`,
  };
  const variantLabel = descriptor.kind === "layer"
    ? `layer-${String(descriptor.index + 1).padStart(2, "0")}-${descriptor.color}`
    : descriptor.kind === "gate-pair"
      ? `gate-pair-${descriptor.first + 1}-${descriptor.second + 1}-f${descriptor.frozen_a}-${descriptor.frozen_b}`
    : `${descriptor.kind}-${String(descriptor.index + 1).padStart(2, "0")}-f${descriptor.frozen}`;
  const candidateDir = resolve(outputDir, variantLabel);
  await mkdir(candidateDir, { recursive: true });
  await writeFile(resolve(candidateDir, "formal-candidates.json"), `${JSON.stringify({
    title: `${levelId} staged frozen-counter exact-floor candidate`,
    source: inputPath,
    levels: [candidate],
  }, null, 2)}\n`, "utf8");
  row.candidate_path = resolve(candidateDir, "formal-candidates.json");
  globalThis.gc?.();
}

results.sort((left, right) => Number(right.status === "exact_floor_met") - Number(left.status === "exact_floor_met")
  || (right.exact_floor ?? -1) - (left.exact_floor ?? -1)
  || (right.witness_reposition_overhead ?? -1) - (left.witness_reposition_overhead ?? -1));
const report = {
  schema_version: "blockout-v5-staged-freeze-variant-search-1",
  source: inputPath,
  level_id: levelId,
  target,
  configuration: {
    target_kind: targetKind,
    focus_stage: focusStage,
    maximum_frozen: maximumFrozen,
    validation_cap: validationCap,
    exact_cap: exactCap,
    emit_witness_candidates: emitWitnessCandidates,
    target_block_ids: [...targetBlockIds],
    descriptor_offset: descriptorOffset,
    descriptor_limit: descriptorLimit,
    descriptor_total: descriptors.length,
  },
  counts: {
    attempted: results.length,
    solved: results.filter((row) => row.witness_reposition_overhead !== undefined).length,
    exact: results.filter((row) => row.exact_floor !== null && row.exact_floor !== undefined).length,
    exact_floor_met: results.filter((row) => row.status === "exact_floor_met").length,
  },
  results,
};
await writeFile(resolve(outputDir, "freeze-variant-search.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputDir, counts: report.counts, best: results[0] ?? null }, null, 2));
process.exitCode = report.counts.exact_floor_met ? 0 : 1;
