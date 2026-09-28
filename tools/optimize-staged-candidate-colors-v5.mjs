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
const numeric = (name, fallback, minimum = 1) => {
  const value = Number(optional(name, String(fallback)));
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${name} must be an integer >= ${minimum}`);
  return value;
};
const inputPath = resolve(ROOT, required("--input"));
const outputDir = resolve(ROOT, required("--output-dir"));
const levelNumber = numeric("--level", 80);
const trialsPerStage = numeric("--trials-per-stage", 200, 0);
const maxStates = numeric("--max-states", 5_000);
const seed = numeric("--seed", 1, 0);
const focusStages = new Set((optional("--focus-stages", "") ?? "").split(",")
  .map((value) => Number(value.trim())).filter((value) => Number.isSafeInteger(value) && value > 0));

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "optimize-staged-candidate-colors-v5-runtime.ts",
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
const keyOf = (x, y) => `${x},${y}`;
const uniquePoints = (points) => [...new Map(points.map(([x, y]) => [keyOf(x, y), [x, y]])).values()];
const shutterFootprint = (shutter) => {
  const points = [];
  for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
    for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) points.push([x, y]);
  }
  return points;
};
const makeRng = (initial) => {
  let state = initial >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};
const shuffle = (values, rng) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};
const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path) {
      if (!model.moveBlock(drag.blockId, x, y)) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  return model.snapshot().complete;
};
const requiredSpan = (shape, side) => {
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  return side === "top" || side === "bottom"
    ? Math.max(...xs) - Math.min(...xs) + 1
    : Math.max(...ys) - Math.min(...ys) + 1;
};

const artifact = JSON.parse(await readFile(inputPath, "utf8"));
const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;
const source = (artifact.levels ?? []).find((entry) => entry.level_id === levelId || entry.level?.id === levelNumber);
if (!source) throw new Error(`${levelId} is missing from input`);
const candidate = clone(source);
const level = candidate.level;
const palette = candidate.target?.design_palette ?? [...new Set(level.blocks.map((block) => block.color))];
const shutters = [...(level.shutters ?? [])].filter((shutter) => shutter.skin === "staging")
  .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
if (!shutters.length || shutters.length !== (level.shutters?.length ?? 0)) {
  throw new Error(`${levelId} must contain only internal staging shutters`);
}
const groups = [
  level.blocks.filter((block) => !block.shutterId),
  ...shutters.map((shutter) => level.blocks.filter((block) => block.shutterId === shutter.id)),
];
const baseBlocked = level.blocked ?? [];
const optimizedBlocks = new Map(level.blocks.map((block) => [block.id, clone(block)]));
const route = [];
const stageResults = [];

for (let stageIndex = 0; stageIndex < groups.length; stageIndex += 1) {
  const group = groups[stageIndex];
  const stageLevel = clone(level);
  stageLevel.name = `${level.name} exact-color stage ${stageIndex + 1}`;
  stageLevel.blocks = group.map((block) => {
    const copy = clone(block);
    delete copy.shutterId;
    return copy;
  });
  const futureCoverFootprint = shutters.slice(stageIndex).flatMap(shutterFootprint);
  const blocked = uniquePoints([...baseBlocked, ...futureCoverFootprint]);
  if (blocked.length) stageLevel.blocked = blocked;
  else delete stageLevel.blocked;
  delete stageLevel.shutters;
  delete stageLevel.elevators;
  delete stageLevel.conveyors;
  delete stageLevel.designTargets;
  delete stageLevel.onboardingHint;
  delete stageLevel.strategyNudge;
  delete stageLevel.strategyFocus;

  const rng = makeRng(seed * 1_000_003 + levelNumber * 104_729 + (stageIndex + 1) * 8191);
  const iterations = focusStages.size === 0 || focusStages.has(stageIndex + 1) ? trialsPerStage : 0;
  let best = null;
  const attempts = iterations + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const trial = clone(stageLevel);
    if (attempt > 0) {
      const assignment = shuffle(palette, rng);
      while (assignment.length < trial.blocks.length) assignment.push(palette[Math.floor(rng() * palette.length)]);
      const randomized = shuffle(assignment, rng).slice(0, trial.blocks.length);
      trial.blocks.forEach((block, index) => { block.color = randomized[index]; });
    }
    if (trial.blocks.some((block) => !trial.gates.some((gate) => (
      gate.color === block.color && requiredSpan(block.shape, gate.side) <= gate.size
    )))) {
      globalThis.gc?.();
      continue;
    }
    let exact;
    try {
      runtime.validateLevel(trial);
      exact = runtime.solveLevelOptimally(trial, maxStates);
    } catch {
      globalThis.gc?.();
      continue;
    }
    if (!exact.solved || !replay(trial, exact.drags)) {
      globalThis.gc?.();
      continue;
    }
    if (!best || exact.repositionOverhead > best.exact.repositionOverhead
      || (exact.repositionOverhead === best.exact.repositionOverhead && exact.minimumDrags < best.exact.minimumDrags)) {
      best = { level: trial, exact, attempt };
    }
    globalThis.gc?.();
  }
  if (!best) throw new Error(`${levelId} stage ${stageIndex + 1} has no exactly solved color assignment`);
  best.level.blocks.forEach((block) => {
    const full = optimizedBlocks.get(block.id);
    full.color = block.color;
  });
  route.push(...best.exact.drags);
  stageResults.push({
    stage_index: stageIndex + 1,
    block_count: group.length,
    trials: attempts,
    selected_attempt: best.attempt,
    exact_reposition_overhead: best.exact.repositionOverhead,
    exact_minimum_drags: best.exact.minimumDrags,
    explored_states: best.exact.exploredStates,
    palette: [...new Set(best.level.blocks.map((block) => block.color))],
  });
  console.log(`${levelId} stage ${stageIndex + 1}: exact reposition ${best.exact.repositionOverhead}`);
}

level.blocks = level.blocks.map((block) => optimizedBlocks.get(block.id));
candidate.route = route;
candidate.audit = {
  ...(candidate.audit ?? {}),
  exact_color_optimization: {
    source: inputPath,
    seed,
    trials_per_stage: trialsPerStage,
    max_states: maxStates,
    focus_stages: [...focusStages],
    stages: stageResults,
    exact_reposition_overhead_sum: stageResults.reduce((sum, stage) => sum + stage.exact_reposition_overhead, 0),
  },
};
candidate.validation = {
  ...(candidate.validation ?? {}),
  authored_route_drags: route.length,
  authored_route_clear_load: level.blocks.length,
  authored_route_reposition_overhead: route.length - level.blocks.length,
  validation_solver_solved: true,
  validation_solver_drags: route.length,
  validation_solver_reposition_overhead: route.length - level.blocks.length,
  generation_mode: "v5_exact_stage_color_optimization",
};
runtime.validateLevel(level);
if (!replay(level, route)) throw new Error(`${levelId} optimized full route does not replay`);
if (new Set(level.blocks.map((block) => block.color)).size !== palette.length) {
  throw new Error(`${levelId} optimized result lost a required palette color`);
}

await mkdir(outputDir, { recursive: true });
const outputPath = resolve(outputDir, "formal-candidates.json");
await writeFile(outputPath, `${JSON.stringify({
  title: `${levelId} exact staged color optimization`,
  source: inputPath,
  levels: [candidate],
}, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "optimization-report.json"), `${JSON.stringify({
  level_id: levelId,
  source: inputPath,
  output: outputPath,
  stage_results: stageResults,
  exact_reposition_overhead_sum: stageResults.reduce((sum, stage) => sum + stage.exact_reposition_overhead, 0),
  full_route_reposition_overhead: route.length - level.blocks.length,
}, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputPath, stage_results: stageResults }, null, 2));
