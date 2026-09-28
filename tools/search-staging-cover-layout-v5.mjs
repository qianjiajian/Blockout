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
const trials = positiveInteger("--trials", 2_000);
const maxStates = positiveInteger("--max-states", 50_000);
const seed = positiveInteger("--seed", levelNumber * 104729 + 31);
const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;

const runtimeBundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "search-staging-cover-layout-v5-runtime.ts",
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
const originalShutters = [...(source.level.shutters ?? [])]
  .filter((shutter) => shutter.skin === "staging")
  .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
if (!originalShutters.length || originalShutters.length !== (source.level.shutters?.length ?? 0)) {
  throw new Error(`${levelId} must contain only internal staging shutters`);
}
if (originalShutters.length > 3) throw new Error("cover-layout search supports at most four stages");

const clone = (value) => structuredClone(value);
const keyOf = (x, y) => `${x},${y}`;
let lastReplayReason = null;
const replay = (level, route) => {
  let model;
  try { model = new runtime.PuzzleModel(level); } catch (error) { lastReplayReason = `init:${error.message}`; return false; }
  for (let dragIndex = 0; dragIndex < (route ?? []).length; dragIndex += 1) {
    const drag = route[dragIndex];
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlock(drag.blockId, x, y)) { lastReplayReason = `move:${dragIndex}:${x},${y}`; return false; }
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) { lastReplayReason = `exit:${dragIndex}`; return false; }
    if (!model.commitAction()) { lastReplayReason = `commit:${dragIndex}`; return false; }
  }
  lastReplayReason = model.snapshot().complete ? null : `incomplete:${model.snapshot().blocks.length}`;
  return model.snapshot().complete;
};

const shutterFootprint = (shutter) => {
  const cells = [];
  for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
    for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) cells.push([x, y]);
  }
  return cells;
};

const stagesFor = (candidate) => {
  const shutters = [...candidate.level.shutters]
    .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
  const keys = [undefined, ...shutters.map((shutter) => shutter.id)];
  return keys.map((shutterId, stageOffset) => {
    const blocks = candidate.level.blocks.filter((block) => block.shutterId === shutterId);
    const ids = new Set(blocks.map((block) => block.id));
    const level = clone(candidate.level);
    level.name = `${candidate.level.name} cover-search stage ${stageOffset + 1}`;
    level.blocks = blocks.map((block) => {
      const copy = clone(block);
      delete copy.shutterId;
      return copy;
    });
    const blocked = new Map([...(candidate.level.blocked ?? []), ...shutters.slice(stageOffset).flatMap(shutterFootprint)]
      .map((cell) => [keyOf(cell[0], cell[1]), cell]));
    if (blocked.size) level.blocked = [...blocked.values()];
    else delete level.blocked;
    delete level.shutters;
    delete level.elevators;
    delete level.conveyors;
    delete level.designTargets;
    delete level.onboardingHint;
    delete level.strategyNudge;
    delete level.strategyFocus;
    delete level.featureIntro;
    const route = (candidate.route ?? []).filter((drag) => ids.has(drag.blockId));
    return { index: stageOffset + 1, level, blocks: level.blocks, route };
  });
};

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

const playable = source.level.playable ?? Array.from(
  { length: source.level.width * source.level.height },
  (_, index) => [index % source.level.width, Math.floor(index / source.level.width)],
);
const playableKeys = new Set(playable.map(([x, y]) => keyOf(x, y)));
const staticBlocked = new Set((source.level.blocked ?? []).map(([x, y]) => keyOf(x, y)));
const sourceStages = stagesFor(source);
const initiallyOccupied = (stage) => {
  const occupied = new Set();
  for (const block of stage.blocks) {
    for (const [dx, dy] of block.shape) occupied.add(keyOf(block.x + dx, block.y + dy));
  }
  return occupied;
};
const initiallyOccupiedByStage = sourceStages.map(initiallyOccupied);
const fitsShutterAt = (shutter, x, y, forbidden) => {
  for (let sy = y; sy < y + shutter.height; sy += 1) {
    for (let sx = x; sx < x + shutter.width; sx += 1) {
      const key = keyOf(sx, sy);
      if (!playableKeys.has(key) || staticBlocked.has(key) || forbidden.has(key)) return false;
    }
  }
  return true;
};
// Shutter j stays closed while stages 0..j are played. Its cover may overlap
// later, still-locked blocks, but never an active block's initial footprint.
// We intentionally do not preserve the generator's old drag corridor: every
// relocated layout receives a fresh exact stage solution below.
const allowedPools = originalShutters.map((shutter, shutterIndex) => {
  const forbidden = new Set(staticBlocked);
  for (let stageIndex = 0; stageIndex <= shutterIndex; stageIndex += 1) {
    for (const key of initiallyOccupiedByStage[stageIndex] ?? []) forbidden.add(key);
  }
  return playable.filter(([x, y]) => fitsShutterAt(shutter, x, y, forbidden));
});
if (allowedPools.some((pool) => pool.length === 0)) {
  throw new Error(`${levelId} has a staging shutter with no route-safe cover position`);
}
const layouts = [];
const seenLayouts = new Set();
const addLayout = (positions, { allowOverlap = false } = {}) => {
  if (!allowOverlap && new Set(positions.map(([x, y]) => keyOf(x, y))).size !== positions.length) return false;
  const signature = positions.map(([x, y]) => keyOf(x, y)).join("|");
  if (seenLayouts.has(signature)) return false;
  seenLayouts.add(signature);
  layouts.push(positions);
  return true;
};
// Keep the generator's shared-cover layout as a baseline even though its
// shutters intentionally overlap. Random alternatives use distinct cells so
// later covers can independently obstruct otherwise-short escape corridors.
addLayout(originalShutters.map((shutter) => [shutter.x, shutter.y]), { allowOverlap: true });
let layoutAttempts = 0;
const maxLayoutAttempts = trials * 200;
while (layouts.length < trials && layoutAttempts < maxLayoutAttempts) {
  layoutAttempts += 1;
  const positions = [];
  const used = new Set();
  let complete = true;
  for (const pool of allowedPools) {
    const options = shuffled(pool).filter(([x, y]) => !used.has(keyOf(x, y)));
    if (!options.length) {
      complete = false;
      break;
    }
    const position = options[0];
    positions.push(position);
    used.add(keyOf(position[0], position[1]));
  }
  if (complete) addLayout(positions);
}

const stageCache = new Map();
let replayRejected = 0;
let validateRejected = 0;
let exactInconclusive = 0;
let exactSolved = 0;
let winner = null;
let best = null;

for (let trial = 0; trial < layouts.length && !winner; trial += 1) {
  const positions = layouts[trial];
  const candidate = clone(source);
  candidate.level.shutters = originalShutters.map((shutter, index) => ({
    ...clone(shutter),
    x: positions[index][0],
    y: positions[index][1],
  }));
  try { runtime.validateLevel(candidate.level); } catch {
    validateRejected += 1;
    continue;
  }
  const stages = stagesFor(candidate);
  const exact = [];
  let inconclusive = false;
  for (const stage of stages) {
    const coverSignature = (stage.level.blocked ?? []).map(([x, y]) => keyOf(x, y)).sort().join("|");
    const cacheKey = `${stage.index}:${coverSignature}`;
    let solved = stageCache.get(cacheKey);
    if (!solved) {
      solved = runtime.solveLevelOptimally(stage.level, maxStates);
      stageCache.set(cacheKey, solved);
    }
    if (!solved.solved) {
      inconclusive = true;
      exactInconclusive += 1;
      break;
    }
    exactSolved += 1;
    exact.push(solved);
  }
  if (inconclusive || exact.length !== stages.length) continue;
  candidate.route = exact.flatMap((result) => result.drags);
  if (!replay(candidate.level, candidate.route)) {
    replayRejected += 1;
    continue;
  }
  const allocations = exact.map((result) => result.repositionOverhead);
  const floor = allocations.reduce((sum, value) => sum + value, 0);
  const row = {
    trial: trial + 1,
    cover_positions: positions,
    stage_allocations: allocations,
    exact_floor: floor,
    explored_states: exact.map((result) => result.exploredStates),
  };
  if (!best || floor > best.exact_floor) {
    best = row;
    console.log(`${levelId}: cover trial ${trial + 1} improved exact floor to ${floor}/${target} via [${allocations.join(",")}]`);
  }
  if (floor >= target) {
    candidate.audit = {
      ...(candidate.audit ?? {}),
      strict_stage_floor_allocation: allocations,
      staging_cover_layout_search: {
        trial: trial + 1,
        seed,
        cover_positions: positions,
        exact_stage_reposition_overhead: allocations,
        exact_floor: floor,
        solver_state_cap: maxStates,
        proof_role: "candidate discovery only; strict-accept must independently recertify every stage",
      },
    };
    winner = candidate;
  }
  if ((trial + 1) % 100 === 0) console.log(`${levelId}: searched ${trial + 1}/${layouts.length}; best ${best?.exact_floor ?? 0}/${target}`);
  globalThis.gc?.();
}

await mkdir(outputDir, { recursive: true });
const report = {
  schema_version: "blockout-v5-staging-cover-layout-search-1",
  generated_at: new Date().toISOString(),
  source: relative(ROOT, input).replaceAll("\\", "/"),
  level_id: levelId,
  target_reposition_overhead: target,
  status: winner ? "candidate_found" : "unresolved",
  configuration: {
    trials,
    max_states_per_stage: maxStates,
    seed,
    generated_layout_attempts: layoutAttempts,
    route_safe_position_counts: allowedPools.map((pool) => pool.length),
  },
  searched_layouts: layouts.length,
  replay_rejected: replayRejected,
  last_replay_rejection: lastReplayReason,
  validate_rejected: validateRejected,
  exact_inconclusive: exactInconclusive,
  exact_solved_stage_calls: exactSolved,
  cache_entries: stageCache.size,
  best,
};
await Promise.all([
  writeFile(resolve(outputDir, "cover-search-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "formal-candidates.json"), `${JSON.stringify({
    title: `${levelId} staging-cover layout candidate`,
    applied_to_live_campaign: false,
    levels: winner ? [winner] : [],
  }, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify({
  level_id: levelId,
  status: report.status,
  best,
  output: relative(ROOT, outputDir).replaceAll("\\", "/"),
}, null, 2));
if (!winner) process.exitCode = 1;
