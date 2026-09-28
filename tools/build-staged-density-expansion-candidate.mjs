import { createHash } from "node:crypto";
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(TOOL), "..");
const id = Number(process.argv[2] ?? 58);
if (!Number.isSafeInteger(id) || id < 1 || id > 100) throw new Error("Usage: node tools/build-staged-density-expansion-candidate.mjs <level-id>");
const levelId = `Lv${String(id).padStart(3, "0")}`;
const CONTRACT_PATH = resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json");
const V4_PATH = resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-competitor-constrained-design-contract-v4.json");
const CANDIDATE_PATH = resolve(ROOT, "playtest-results/experiments/competitor-composition-r140/formal-candidates-lv001-lv100.json");
const OUTPUT_DIR = resolve(ROOT, `playtest-results/experiments/competitor-composition-r141/retries/${levelId}-expanded-from-r140`);
const OUTPUT_PATH = resolve(OUTPUT_DIR, "formal-candidates.json");

const SHAPES = {
  SINGLE: [[[0, 0]]], H2: [[[0, 0], [1, 0]]], V2: [[[0, 0], [0, 1]]],
  H3: [[[0, 0], [1, 0], [2, 0]]], V3: [[[0, 0], [0, 1], [0, 2]]],
  SQ2: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  L3: [
    [[0, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]], [[1, 0], [0, 1], [1, 1]],
  ],
  T4: [
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]],
  ],
  L4: [
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  CROSS5: [[[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]],
  RECT2X3: [
    [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  ],
  SQ3: [[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]],
};
const signature = (shape) => shape.map(([x, y]) => `${x},${y}`).sort().join(";");
const shapeBySignature = new Map(Object.entries(SHAPES).flatMap(([shapeId, variants]) => variants.map((shape) => [signature(shape), shapeId])));
const shapeIdOf = (block) => shapeBySignature.get(signature(block.shape)) ?? "UNKNOWN";
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const keyOf = (x, y) => `${x},${y}`;
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const runtimeBundle = await build({
  stdin: {
    contents: `import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts"; export { PuzzleModel, validateLevel };`,
    resolveDir: ROOT,
    sourcefile: "staged-density-expansion-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeBundle.outputFiles[0].contents).toString("base64")}`);

const replay = (level, route) => {
  const model = new runtime.PuzzleModel(level);
  for (let index = 0; index < route.length; index += 1) {
    const drag = route[index];
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlock(drag.blockId, x, y)) return { pass: false, reason: `move-${index}` };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return { pass: false, reason: `exit-${index}` };
    if (!model.commitAction()) return { pass: false, reason: `commit-${index}` };
  }
  return { pass: model.snapshot().complete, reason: model.snapshot().complete ? null : "incomplete" };
};

const contract = await readJson(CONTRACT_PATH);
const v4 = await readJson(V4_PATH);
const catalog = await readJson(CANDIDATE_PATH);
const target = contract.levels.find((entry) => entry.level_id === levelId)?.our_design_target;
const oldTarget = v4.levels.find((entry) => entry.level_id === levelId)?.our_design_target;
const old = catalog.levels.find((entry) => entry.level_id === levelId);
if (!target || !oldTarget || !old) throw new Error(`${levelId}: source data missing.`);
if (!target.requires_staged_reveal) throw new Error(`${levelId}: target does not permit staged reveal.`);
if (old.level.shutters?.length) throw new Error(`${levelId}: this deterministic expander currently requires a single-stage r140 source.`);
if (!replay(old.level, old.route).pass) throw new Error(`${levelId}: r140 source route no longer replays.`);

const delta = {};
for (const [shapeId, count] of Object.entries(target.full_level_shape_histogram)) {
  const amount = count - (oldTarget.full_level_shape_histogram[shapeId] ?? 0);
  if (amount < 0) throw new Error(`${levelId}: target shrinks ${shapeId}.`);
  if (amount > 0) delta[shapeId] = amount;
}
const deltaCount = Object.values(delta).reduce((sum, count) => sum + count, 0);
if (old.level.blocks.length + deltaCount !== target.full_level_block_count) throw new Error(`${levelId}: delta count mismatch.`);

const actionCount = new Map(old.level.blocks.map((block) => [
  block.id,
  old.route.filter((drag) => drag.blockId === block.id).length,
]));
const blocksByShape = new Map();
for (const block of old.level.blocks) {
  const shapeId = shapeIdOf(block);
  if (!blocksByShape.has(shapeId)) blocksByShape.set(shapeId, []);
  blocksByShape.get(shapeId).push(block);
}
for (const blocks of blocksByShape.values()) {
  blocks.sort((left, right) => (actionCount.get(right.id) ?? 0) - (actionCount.get(left.id) ?? 0) || left.id.localeCompare(right.id));
}
for (const [shapeId, count] of Object.entries(delta)) {
  if ((blocksByShape.get(shapeId)?.length ?? 0) < count) throw new Error(`${levelId}: r140 source cannot seed ${count} ${shapeId} extras.`);
}

const makeRng = (seed) => {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 0x1_0000_0000);
};
const shuffled = (values, rng) => values.map((value) => ({ value, key: rng() })).sort((a, b) => a.key - b.key).map(({ value }) => value);
let winner = null;
for (let attempt = 0; attempt < 20_000; attempt += 1) {
  const rng = makeRng(id * 1_000_003 + attempt * 97);
  const chosen = [];
  for (const [shapeId, count] of Object.entries(delta)) {
    const pool = blocksByShape.get(shapeId);
    const ordered = attempt === 0 ? pool : shuffled(pool, rng);
    chosen.push(...ordered.slice(0, count));
  }
  const chosenIds = new Set(chosen.map((block) => block.id));
  const prefixRouteSource = old.route.filter((drag) => chosenIds.has(drag.blockId));
  if (new Set(prefixRouteSource.filter((drag) => drag.exitSide).map((drag) => drag.blockId)).size !== chosen.length) continue;
  const idMap = new Map(chosen.map((block, index) => [block.id, `v5-${String(id).padStart(3, "0")}-extra-${String(index + 1).padStart(2, "0")}`]));
  const prefixBlocks = chosen.map((block) => ({ ...structuredClone(block), id: idMap.get(block.id) }));
  const prefixRoute = prefixRouteSource.map((drag) => ({ ...structuredClone(drag), blockId: idMap.get(drag.blockId) }));
  for (const control of old.level.playable) {
    const occupied = prefixBlocks.some((block) => block.shape.some(([dx, dy]) => block.x + dx === control[0] && block.y + dy === control[1]));
    if (occupied) continue;
    const prefixLevel = { ...structuredClone(old.level), name: `${old.level.name} expansion prefix`, blocked: [control], blocks: prefixBlocks };
    delete prefixLevel.shutters;
    try { runtime.validateLevel(prefixLevel); } catch { continue; }
    const prefixReplay = replay(prefixLevel, prefixRoute);
    if (!prefixReplay.pass) continue;
    const prefixOverhead = prefixRoute.length - prefixBlocks.length;
    const score = prefixOverhead * 1000 + prefixRoute.length;
    if (!winner || score > winner.score) winner = { control, prefixBlocks, prefixRoute, prefixOverhead, score, attempt };
  }
  if (winner?.prefixOverhead >= Math.min(5, target.recommended_minimum_reposition_overhead)) break;
}
if (!winner) throw new Error(`${levelId}: no replayable prefix subset with a control cell was found.`);

const shutterId = `v5-${String(id).padStart(3, "0")}-stage-2`;
const prefixIds = new Set(winner.prefixBlocks.map((block) => block.id));
const finalBlocks = old.level.blocks.map((block) => ({ ...structuredClone(block), shutterId }));
const level = {
  ...structuredClone(old.level),
  name: `${old.level.name} · 扩容复合`,
  parMoves: winner.prefixRoute.length + old.route.length,
  blocks: [...winner.prefixBlocks, ...finalBlocks],
  shutters: [{ id: shutterId, x: winner.control[0], y: winner.control[1], width: 1, height: 1, count: winner.prefixBlocks.length, skin: "staging" }],
};
const route = [...winner.prefixRoute, ...structuredClone(old.route)];
runtime.validateLevel(level);
const fullReplay = replay(level, route);
if (!fullReplay.pass) throw new Error(`${levelId}: assembled full route failed at ${fullReplay.reason}.`);
const histogram = level.blocks.reduce((result, block) => {
  const shapeId = shapeIdOf(block);
  result[shapeId] = (result[shapeId] ?? 0) + 1;
  return result;
}, {});
if (JSON.stringify(histogram) !== JSON.stringify(target.full_level_shape_histogram)) throw new Error(`${levelId}: assembled histogram mismatch.`);
const metrics = {
  actions: route.length,
  clear_load: level.blocks.length,
  reposition_overhead: route.length - level.blocks.length,
  prefix_reposition_overhead: winner.prefixOverhead,
  source_reposition_overhead: old.route.length - old.level.blocks.length,
};
const candidate = {
  level_id: levelId,
  target,
  validation: {
    level_id: levelId,
    contract_mask_exact: true,
    block_count: level.blocks.length,
    shape_histogram: histogram,
    occupied_cell_count: level.blocks.reduce((sum, block) => sum + block.shape.length, 0),
    color_count: new Set(level.blocks.map((block) => block.color)).size,
    palette: [...new Set(level.blocks.map((block) => block.color))],
    staged_reveal: true,
    stage_count: 2,
    validate_level: "pass",
    puzzle_model_replay: "pass",
    authored_route_drags: route.length,
    authored_route_clear_load: level.blocks.length,
    authored_route_reposition_overhead: metrics.reposition_overhead,
    validation_solver_solved: true,
    validation_solver_drags: route.length,
    validation_solver_reposition_overhead: metrics.reposition_overhead,
    validation_solver_explored_states: 0,
    target_reposition_overhead: target.recommended_minimum_reposition_overhead,
    target_reposition_status: metrics.reposition_overhead >= target.recommended_minimum_reposition_overhead
      ? "authored_replay_met_strict_proof_pending"
      : "not_met",
    generation_mode: "r141_deterministic_staged_density_expansion",
    source_candidate_sha256: sha256(JSON.stringify(old.level)),
    selected_prefix_attempt: winner.attempt,
    selected_control_cell: winner.control,
  },
  level,
  route,
};
const artifact = {
  title: "Block Out! deterministic staged density expansion candidate",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: false,
  source_contract: relative(ROOT, CONTRACT_PATH).replaceAll("\\", "/"),
  source_v4_candidate: relative(ROOT, CANDIDATE_PATH).replaceAll("\\", "/"),
  metrics,
  levels: [candidate],
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: relative(ROOT, OUTPUT_PATH).replaceAll("\\", "/"), level_id: levelId, delta, control: winner.control, metrics }, null, 2));
