import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only deterministic search. Unlike the relaxed stage gadget search,
// this preserves every runtime mechanism (numeric ice, shells, gates, covers)
// while permuting legal anchors and colour bundles within one reveal stage.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRelative = process.env.VIDEO_PARITY_RUNTIME_SEARCH_INPUT_RELATIVE;
const outputRelative = process.env.VIDEO_PARITY_RUNTIME_SEARCH_OUTPUT_RELATIVE;
const levelId = Number(process.env.VIDEO_PARITY_RUNTIME_SEARCH_LEVEL_ID);
const trials = Number(process.env.VIDEO_PARITY_RUNTIME_SEARCH_TRIALS ?? 500);
const maxStates = Number(process.env.VIDEO_PARITY_RUNTIME_SEARCH_MAX_STATES ?? 50_000);
const keep = Number(process.env.VIDEO_PARITY_RUNTIME_SEARCH_KEEP ?? 8);
const seed = Number(process.env.VIDEO_PARITY_RUNTIME_SEARCH_SEED ?? levelId * 1_000_003 + 97) >>> 0;
const maxSeconds = Number(process.env.VIDEO_PARITY_RUNTIME_SEARCH_MAX_SECONDS ?? 120);
const maxRssMb = Number(process.env.VIDEO_PARITY_RUNTIME_SEARCH_MAX_RSS_MB ?? 900);
const useValidationSolver = process.env.VIDEO_PARITY_RUNTIME_SEARCH_VALIDATION_FIRST === "1";
const shuffleColors = process.env.VIDEO_PARITY_RUNTIME_SEARCH_SHUFFLE_COLORS !== "0";
const scoreRelaxedFloor = process.env.VIDEO_PARITY_RUNTIME_SEARCH_SCORE_RELAXED_FLOOR === "1";
const relaxedMaxStates = Number(process.env.VIDEO_PARITY_RUNTIME_SEARCH_RELAXED_MAX_STATES ?? maxStates);
const fixedBlockIds = new Set((process.env.VIDEO_PARITY_RUNTIME_SEARCH_FIXED_BLOCK_IDS ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean));
if (!runtimeRelative || !outputRelative || !Number.isSafeInteger(levelId)) {
  throw new Error("runtime input, output, and integer level id are required");
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const runtimeText = await readFile(resolve(root, runtimeRelative), "utf8");
const inputIsJson = runtimeRelative.toLowerCase().endsWith(".json");
const bundle = await build({
  stdin: {
    contents: `
      ${inputIsJson ? "" : `export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(resolve(root, runtimeRelative))};`}
      export { validateLevel, PuzzleModel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
      export { solveLevelOptimally, solveLevelForValidation } from ${JSON.stringify(resolve(root, "src/core/levelSolver.ts"))};
    `,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const findJsonLevel = (value) => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findJsonLevel(entry);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  if (Number(value.id) === levelId && Array.isArray(value.blocks) && Array.isArray(value.gates)) return value;
  if (value.level) {
    const found = findJsonLevel(value.level);
    if (found) return found;
  }
  for (const key of ["levels", "candidates", "best"]) {
    const found = findJsonLevel(value[key]);
    if (found) return found;
  }
  return null;
};
const source = inputIsJson
  ? findJsonLevel(JSON.parse(runtimeText))
  : runtime.levels.find((level) => level.id === levelId);
if (!source) throw new Error(`Lv${levelId} missing from runtime input`);

let randomState = seed || 1;
const random = () => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 2 ** 32;
};
const shuffled = (values) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};
const key = (x, y) => `${x},${y}`;
const playable = new Set(source.playable.map(([x, y]) => key(x, y)));
const stageKey = (block) => block.shutterId ? `shutter:${block.shutterId}` : "opening";
const stages = new Map();
for (const block of source.blocks) {
  const stage = stageKey(block);
  if (!stages.has(stage)) stages.set(stage, []);
  stages.get(stage).push(block);
}
const anchorsFor = (block) => {
  const anchors = [];
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    if (block.shape.every(([dx, dy]) => playable.has(key(x + dx, y + dy)))) anchors.push([x, y]);
  }
  return anchors;
};
const anchorsById = new Map(source.blocks.map((block) => [block.id, anchorsFor(block)]));
const placeStage = (blocks) => {
  const order = blocks.filter((block) => !fixedBlockIds.has(block.id)).sort((left, right) => (
    right.shape.length - left.shape.length
    || anchorsById.get(left.id).length - anchorsById.get(right.id).length
    || left.id.localeCompare(right.id)
  ));
  const occupied = new Set();
  const positions = new Map();
  for (const block of blocks.filter((entry) => fixedBlockIds.has(entry.id))) {
    const cells = block.shape.map(([dx, dy]) => key(block.x + dx, block.y + dy));
    if (cells.some((cell) => !playable.has(cell) || occupied.has(cell))) return null;
    cells.forEach((cell) => occupied.add(cell));
    positions.set(block.id, [block.x, block.y]);
  }
  const place = (index) => {
    if (index === order.length) return true;
    const block = order[index];
    for (const [x, y] of shuffled(anchorsById.get(block.id))) {
      const cells = block.shape.map(([dx, dy]) => key(x + dx, y + dy));
      if (cells.some((cell) => occupied.has(cell))) continue;
      cells.forEach((cell) => occupied.add(cell));
      positions.set(block.id, [x, y]);
      if (place(index + 1)) return true;
      positions.delete(block.id);
      cells.forEach((cell) => occupied.delete(cell));
    }
    return false;
  };
  return place(0) ? positions : null;
};
const colorBundle = (block) => block.layers?.length
  ? { color: block.layers[0], layers: [...block.layers] }
  : { color: block.color, layers: null };
const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  let repositions = 0;
  for (const drag of drags) {
    model.beginAction();
    for (const [x, y] of drag.path ?? []) {
      if (!model.moveBlockStep(drag.blockId, x, y)) return null;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return null;
    if (!model.commitAction(true)) return null;
    if (!drag.exitSide) repositions += 1;
  }
  const snapshot = model.snapshot();
  return snapshot.complete ? { complete: true, repositions, actions: drags.length } : null;
};

const best = [];
const signatures = new Set();
const startedAt = Date.now();
let haltReason = null;
for (let trial = 0; trial < trials; trial += 1) {
  if (trial % 4 === 0) {
    globalThis.gc?.();
    const rssMb = process.memoryUsage().rss / 1024 / 1024;
    if (rssMb >= maxRssMb) { haltReason = `memory_cap_${rssMb.toFixed(1)}mb`; break; }
    if ((Date.now() - startedAt) / 1000 >= maxSeconds) { haltReason = "time_cap"; break; }
  }
  const level = structuredClone(source);
  const positions = new Map();
  let placed = true;
  for (const blocks of stages.values()) {
    const stagePositions = placeStage(blocks);
    if (!stagePositions) { placed = false; break; }
    for (const [id, anchor] of stagePositions) positions.set(id, anchor);
  }
  if (!placed) continue;
  const blockById = new Map(level.blocks.map((block) => [block.id, block]));
  for (const [stage, blocks] of stages) {
    const singleLayer = blocks.filter((block) => (block.layers?.length ?? 1) === 1);
    const multiLayer = blocks.filter((block) => (block.layers?.length ?? 1) > 1);
    const bundlesById = new Map();
    for (const cohort of [singleLayer, multiLayer]) {
      const bundles = shuffleColors ? shuffled(cohort.map(colorBundle)) : cohort.map(colorBundle);
      cohort.forEach((block, index) => bundlesById.set(block.id, bundles[index]));
    }
    for (const block of blocks) {
      const target = blockById.get(block.id);
      [target.x, target.y] = positions.get(block.id);
      const colors = bundlesById.get(block.id);
      target.color = colors.color;
      if (colors.layers) target.layers = [...colors.layers];
      else delete target.layers;
    }
    void stage;
  }
  const signature = level.blocks.map((block) => (
    `${block.id}@${block.x},${block.y}:${block.layers?.join(">") ?? block.color}`
  )).join("|");
  if (signatures.has(signature)) continue;
  signatures.add(signature);
  try { runtime.validateLevel(level); } catch { continue; }
  const solved = useValidationSolver
    ? runtime.solveLevelForValidation(level, maxStates)
    : runtime.solveLevelOptimally(level, maxStates);
  if (!solved.solved) continue;
  const replayed = replay(level, solved.drags);
  if (!replayed?.complete || replayed.repositions !== solved.repositionOverhead) continue;
  let relaxed = null;
  if (scoreRelaxedFloor) {
    const relaxedLevel = structuredClone(level);
    relaxedLevel.blocks = relaxedLevel.blocks.map((sourceBlock) => {
      const block = structuredClone(sourceBlock);
      const outer = block.layers?.[0] ?? block.color;
      block.color = outer;
      block.layers = [outer];
      delete block.frozen;
      delete block.shutterId;
      delete block.keyId;
      delete block.lockedBy;
      delete block.lockCount;
      delete block.star;
      return block;
    });
    relaxedLevel.gates = relaxedLevel.gates.map((sourceGate) => {
      const gate = structuredClone(sourceGate);
      delete gate.frozen;
      delete gate.star;
      return gate;
    });
    relaxedLevel.blocked = [];
    delete relaxedLevel.shutters;
    delete relaxedLevel.generators;
    delete relaxedLevel.elevators;
    delete relaxedLevel.conveyors;
    delete relaxedLevel.designTargets;
    delete relaxedLevel.parMoves;
    relaxed = runtime.solveLevelOptimally(relaxedLevel, relaxedMaxStates);
    if (!relaxed.solved) continue;
  }
  const candidate = {
    trial,
    reposition_overhead: solved.repositionOverhead,
    minimum_drags: solved.minimumDrags,
    explored_states: solved.exploredStates,
    level,
    route: solved.drags,
    replay: replayed,
    relaxed_floor: relaxed ? {
      reposition_overhead: relaxed.repositionOverhead,
      minimum_drags: relaxed.minimumDrags,
      explored_states: relaxed.exploredStates,
      route: relaxed.drags,
    } : null,
  };
  best.push(candidate);
  best.sort((left, right) => (right.relaxed_floor?.reposition_overhead ?? right.reposition_overhead)
    - (left.relaxed_floor?.reposition_overhead ?? left.reposition_overhead)
    || right.reposition_overhead - left.reposition_overhead
    || left.explored_states - right.explored_states || left.trial - right.trial);
  best.length = Math.min(best.length, keep);
  console.log(`trial=${trial} overhead=${candidate.reposition_overhead} relaxed=${candidate.relaxed_floor?.reposition_overhead ?? "off"} states=${candidate.explored_states}`);
}

const output = {
  schema_version: "blockout-video-parity-runtime-layout-search-v1",
  prototype_only: true,
  source: { path: runtimeRelative, sha256: sha256(runtimeText) },
  level_id: `Lv${String(levelId).padStart(3, "0")}`,
  seed,
  trials,
  unique_candidates: signatures.size,
  max_states: maxStates,
  solver_mode: useValidationSolver ? "validation" : "optimal",
  shuffle_colors: shuffleColors,
  fixed_block_ids: [...fixedBlockIds].sort(),
  score_relaxed_floor: scoreRelaxedFloor,
  relaxed_max_states: scoreRelaxedFloor ? relaxedMaxStates : null,
  halt_reason: haltReason,
  best,
};
const text = `${JSON.stringify(output, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, text, "utf8");
console.log(JSON.stringify({
  output: outputRelative,
  sha256: sha256(text),
  unique_candidates: signatures.size,
  halt_reason: haltReason,
  best_overhead: best[0]?.reposition_overhead ?? null,
  best_relaxed_floor: best[0]?.relaxed_floor?.reposition_overhead ?? null,
}, null, 2));
