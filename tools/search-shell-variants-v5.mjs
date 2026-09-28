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
const integer = (name, fallback) => {
  const value = Number(optional(name, String(fallback)));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};

const input = resolve(ROOT, required("--input"));
const outputDir = resolve(ROOT, required("--output-dir"));
const levelNumber = integer("--level", 15);
const validationCap = integer("--validation-cap", 30_000);
const exactCap = integer("--exact-cap", 80_000);
const maxVariants = integer("--max-variants", 24);
const includeAllStages = args.includes("--all-stages");
const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;
if (levelNumber < 15) throw new Error("Outer-shell search is disabled before the Lv15 mechanism introduction");

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelForValidation, solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel, solveLevelForValidation, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "search-shell-variants-v5-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const clone = (value) => structuredClone(value);
const keyOf = (x, y) => `${x},${y}`;
const shutterFootprint = (shutter) => {
  const cells = [];
  for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
    for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) cells.push([x, y]);
  }
  return cells;
};
const replay = (level, route) => {
  let model;
  try { model = new runtime.PuzzleModel(level); } catch (error) { return { pass: false, reason: `init:${error.message}` }; }
  for (let index = 0; index < (route ?? []).length; index += 1) {
    const drag = route[index];
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlock(drag.blockId, x, y)) return { pass: false, reason: `move:${index}:${x},${y}` };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return { pass: false, reason: `exit:${index}` };
    if (!model.commitAction()) return { pass: false, reason: `commit:${index}` };
  }
  return model.snapshot().complete
    ? { pass: true, reason: null }
    : { pass: false, reason: `incomplete:${model.snapshot().blocks.length}` };
};
const clearLoad = (blocks) => blocks.reduce((sum, block) => sum + (block.layers?.length ?? 1), 0);

const artifact = JSON.parse(await readFile(input, "utf8"));
const source = (artifact.levels ?? []).find((entry) => entry.level_id === levelId || entry.level?.id === levelNumber);
if (!source) throw new Error(`${levelId} is missing from ${input}`);
const target = source.target?.recommended_minimum_reposition_overhead
  ?? source.target?.solver_acceptance?.minimum_reposition_overhead
  ?? source.level?.designTargets?.minimumRepositionOverhead;
if (!Number.isSafeInteger(target) || target <= 0) throw new Error(`${levelId} has no positive reposition target`);
const palette = source.target?.design_palette ?? [...new Set(source.level.blocks.flatMap((block) => block.layers ?? [block.color]))];
const shutters = [...(source.level.shutters ?? [])]
  .filter((shutter) => shutter.skin === "staging")
  .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
if (shutters.length !== (source.level.shutters?.length ?? 0)) {
  throw new Error(`${levelId} shell search only supports no shutters or internal staging shutters`);
}
const stageKeys = [undefined, ...shutters.map((shutter) => shutter.id)];
const groupFor = (level, stageIndex) => level.blocks.filter((block) => block.shutterId === stageKeys[stageIndex]);
const stageLevelFor = (level, stageIndex) => {
  const stage = clone(level);
  stage.name = `${level.name} shell-search stage ${stageIndex + 1}`;
  stage.blocks = groupFor(level, stageIndex).map((block) => {
    const copy = clone(block);
    delete copy.shutterId;
    return copy;
  });
  const blocked = new Map([...(level.blocked ?? []), ...shutters.slice(stageIndex).flatMap(shutterFootprint)]
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
  runtime.validateLevel(stage);
  return stage;
};

const baseStageRoutes = [];
const stageByBlock = new Map();
stageKeys.forEach((_key, stageIndex) => groupFor(source.level, stageIndex)
  .forEach((block) => stageByBlock.set(block.id, stageIndex)));
for (let stageIndex = 0; stageIndex < stageKeys.length; stageIndex += 1) baseStageRoutes.push([]);
for (const drag of source.route ?? []) {
  const stageIndex = stageByBlock.get(drag.blockId);
  if (stageIndex === undefined) throw new Error(`${levelId} route references unknown block ${drag.blockId}`);
  baseStageRoutes[stageIndex].push(clone(drag));
}
for (let stageIndex = 0; stageIndex < stageKeys.length; stageIndex += 1) {
  const replayed = replay(stageLevelFor(source.level, stageIndex), baseStageRoutes[stageIndex]);
  if (!replayed.pass) throw new Error(`${levelId} source stage ${stageIndex + 1} route failed: ${replayed.reason}`);
}
const baseStageExact = stageKeys.map((_key, stageIndex) => {
  const level = stageLevelFor(source.level, stageIndex);
  const solved = runtime.solveLevelOptimally(level, exactCap);
  return solved.solved && replay(level, solved.drags).pass ? solved : null;
});

const searchableStages = includeAllStages
  ? stageKeys.map((_key, index) => index)
  : [stageKeys.length - 1];
const variants = [];
const attempts = [];
for (const stageIndex of searchableStages) {
  const blocks = groupFor(source.level, stageIndex);
  for (const block of blocks) {
    if ((block.layers?.length ?? 1) > 1) continue;
    for (const outerColor of palette) {
      if (outerColor === block.color) continue;
      const candidate = clone(source);
      const changed = candidate.level.blocks.find((entry) => entry.id === block.id);
      changed.layers = [outerColor, changed.color];
      let solved;
      try {
        runtime.validateLevel(candidate.level);
        solved = runtime.solveLevelForValidation(stageLevelFor(candidate.level, stageIndex), validationCap);
      } catch (error) {
        attempts.push({ stage: stageIndex + 1, block_id: block.id, outer_color: outerColor, status: `invalid:${error.message}` });
        continue;
      }
      if (!solved.solved || !replay(stageLevelFor(candidate.level, stageIndex), solved.drags).pass) {
        attempts.push({ stage: stageIndex + 1, block_id: block.id, outer_color: outerColor, status: "unsolved", explored_states: solved.exploredStates });
        continue;
      }
      const route = baseStageRoutes.flatMap((stageRoute, index) => index === stageIndex ? solved.drags : stageRoute);
      const fullReplay = replay(candidate.level, route);
      if (!fullReplay.pass) {
        attempts.push({ stage: stageIndex + 1, block_id: block.id, outer_color: outerColor, status: `full_replay:${fullReplay.reason}` });
        continue;
      }
      const routeOverhead = route.length - clearLoad(candidate.level.blocks);
      const changedStageLevel = stageLevelFor(candidate.level, stageIndex);
      const exact = runtime.solveLevelOptimally(changedStageLevel, exactCap);
      const exactValid = exact.solved && replay(changedStageLevel, exact.drags).pass;
      const exactByStage = baseStageExact.map((result, index) => index === stageIndex
        ? (exactValid ? exact : null)
        : result);
      const exactFloor = exactByStage.every(Boolean)
        ? exactByStage.reduce((sum, result) => sum + result.repositionOverhead, 0)
        : null;
      attempts.push({
        stage: stageIndex + 1,
        block_id: block.id,
        outer_color: outerColor,
        status: exactFloor !== null && exactFloor < target
          ? "exact_below_target"
          : routeOverhead >= target ? "witness_capacity_met" : "below_target",
        route_reposition_overhead: routeOverhead,
        changed_stage_reposition_overhead: solved.repositionOverhead,
        explored_states: solved.exploredStates,
        exact_floor: exactFloor,
        exact_changed_stage_reposition_overhead: exactValid ? exact.repositionOverhead : null,
        exact_explored_states: exact.exploredStates,
      });
      if (routeOverhead < target || (exactFloor !== null && exactFloor < target)) continue;
      candidate.route = exactFloor !== null
        ? exactByStage.flatMap((result) => result.drags)
        : route;
      candidate.level.parMoves = candidate.route.length;
      candidate.audit = {
        ...(candidate.audit ?? {}),
        shell_variant_search: {
          stage: stageIndex + 1,
          block_id: block.id,
          outer_color: outerColor,
          body_color: block.color,
          extra_shell_layers: 1,
          route_reposition_overhead: routeOverhead,
          exact_reposition_overhead: exactFloor,
          proof_status: "candidate_only_requires_independent_strict_acceptance",
        },
      };
      variants.push(candidate);
      variants.sort((left, right) => (
        (right.audit.shell_variant_search.exact_reposition_overhead ?? -1)
        - (left.audit.shell_variant_search.exact_reposition_overhead ?? -1)
        || right.audit.shell_variant_search.route_reposition_overhead
        - left.audit.shell_variant_search.route_reposition_overhead
      ));
      if (variants.length > maxVariants) variants.length = maxVariants;
    }
  }
}

await mkdir(outputDir, { recursive: true });
await Promise.all(variants.map(async (candidate, index) => {
  const variantDir = resolve(outputDir, `variant-${String(index + 1).padStart(3, "0")}`);
  await mkdir(variantDir, { recursive: true });
  await writeFile(resolve(variantDir, "formal-candidates.json"), `${JSON.stringify({
    title: `${levelId} one-extra-shell candidate ${index + 1}`,
    applied_to_live_campaign: false,
    levels: [candidate],
  }, null, 2)}\n`, "utf8");
}));
const report = {
  schema_version: "blockout-v5-shell-variant-search-1",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: false,
  source: relative(ROOT, input).replaceAll("\\", "/"),
  level_id: levelId,
  target_reposition_overhead: target,
  searched_stages: searchableStages.map((index) => index + 1),
  base_stage_exact: baseStageExact.map((result, index) => ({
    stage: index + 1,
    solved: Boolean(result),
    reposition_overhead: result?.repositionOverhead ?? null,
    explored_states: result?.exploredStates ?? exactCap,
  })),
  attempts,
  counts: {
    attempted: attempts.length,
    witness_capacity_met: attempts.filter((attempt) => attempt.status === "witness_capacity_met").length,
    exact_floor_met: attempts.filter((attempt) => (attempt.exact_floor ?? -1) >= target).length,
    retained: variants.length,
  },
  levels: variants,
};
await Promise.all([
  writeFile(resolve(outputDir, "shell-search-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "formal-candidates.json"), `${JSON.stringify({
    title: `${levelId} one-extra-shell candidate search`,
    applied_to_live_campaign: false,
    levels: variants,
  }, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  level_id: levelId,
  target,
  counts: report.counts,
  best_witness_overhead: variants[0]?.audit.shell_variant_search.route_reposition_overhead ?? null,
  best_exact_overhead: variants[0]?.audit.shell_variant_search.exact_reposition_overhead ?? null,
  output: relative(ROOT, outputDir).replaceAll("\\", "/"),
}, null, 2));
if (!variants.length) process.exitCode = 1;
