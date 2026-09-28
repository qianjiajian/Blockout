import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only search for independently provable same-stage relaxed cores.
// Positions and outer colours move only within the selected reveal stage;
// shape/stage inventory and the full contract remain untouched.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRelative = process.env.VIDEO_PARITY_STAGE_GADGET_RUNTIME_RELATIVE;
const outputRelative = process.env.VIDEO_PARITY_STAGE_GADGET_OUTPUT_RELATIVE;
const levelId = Number(process.env.VIDEO_PARITY_STAGE_GADGET_LEVEL_ID);
const trials = Number(process.env.VIDEO_PARITY_STAGE_GADGET_TRIALS ?? 1000);
const maxStates = Number(process.env.VIDEO_PARITY_STAGE_GADGET_MAX_STATES ?? 50000);
const keep = Number(process.env.VIDEO_PARITY_STAGE_GADGET_KEEP ?? 5);
const seed = Number(process.env.VIDEO_PARITY_STAGE_GADGET_SEED ?? levelId * 104729 + 17) >>> 0;
const selectedStage = process.env.VIDEO_PARITY_STAGE_GADGET_STAGE_KEY?.trim() || null;
const maxRssMb = Number(process.env.VIDEO_PARITY_STAGE_GADGET_MAX_RSS_MB ?? 800);
const maxSeconds = Number(process.env.VIDEO_PARITY_STAGE_GADGET_MAX_SECONDS ?? 120);
if (!runtimeRelative || !outputRelative || !Number.isSafeInteger(levelId)) throw new Error("runtime/output/level env required");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const runtimeText = await readFile(resolve(root, runtimeRelative), "utf8");
const bundle = await build({
  stdin: { contents: `export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(resolve(root, runtimeRelative))}; export { validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))}; export { solveLevelOptimally } from ${JSON.stringify(resolve(root, "src/core/levelSolver.ts"))};`, resolveDir: root, loader: "ts" },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const source = runtime.levels.find((level) => level.id === levelId);
if (!source) throw new Error(`Lv${levelId} missing`);
let randomState = seed || 1;
const random = () => {
  randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5;
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
const pointKey = ([x, y]) => `${x},${y}`;
const playable = new Set(source.playable.map(pointKey));
const stageKey = (block) => block.shutterId ? `shutter:${block.shutterId}` : "opening";
const stages = new Map();
for (const block of source.blocks) {
  const key = stageKey(block);
  if (!stages.has(key)) stages.set(key, []);
  stages.get(key).push(block);
}
const anchorsFor = (block) => {
  const result = [];
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
    if (block.shape.every(([dx, dy]) => playable.has(`${x + dx},${y + dy}`))) result.push([x, y]);
  }
  return result;
};
const placeStage = (blocks) => {
  const order = [...blocks].sort((left, right) => right.shape.length - left.shape.length || left.id.localeCompare(right.id));
  const occupied = new Set();
  const positions = new Map();
  const place = (index) => {
    if (index === order.length) return true;
    const block = order[index];
    for (const [x, y] of shuffled(anchorsFor(block))) {
      const cells = block.shape.map(([dx, dy]) => `${x + dx},${y + dy}`);
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
const coreLevel = (stageId, blocks, positions, colors) => {
  const level = structuredClone(source);
  level.name = `${source.name} searched relaxed ${stageId}`;
  level.blocks = blocks.map((original, index) => {
    const block = structuredClone(original);
    [block.x, block.y] = positions.get(block.id);
    block.color = colors[index];
    block.layers = [colors[index]];
    delete block.frozen; delete block.shutterId; delete block.keyId; delete block.lockedBy;
    delete block.lockCount; delete block.star;
    return block;
  });
  level.gates = level.gates.map((gate) => {
    const copy = structuredClone(gate); delete copy.frozen; delete copy.star; return copy;
  });
  level.blocked = [];
  delete level.shutters; delete level.generators; delete level.elevators; delete level.conveyors;
  delete level.designTargets; delete level.onboardingHint; delete level.strategyNudge;
  delete level.strategyFocus; delete level.featureIntro; delete level.parMoves;
  return level;
};
const outputStages = [];
for (const [key, blocks] of stages) {
  if (selectedStage && key !== selectedStage) continue;
  const outerColors = blocks.map((block) => block.layers?.[0] ?? block.color);
  const best = [];
  const signatures = new Set();
  const startedAt = Date.now();
  let haltReason = null;
  for (let trial = 0; trial < trials; trial += 1) {
    if (trial % 8 === 0) {
      globalThis.gc?.();
      const rssMb = process.memoryUsage().rss / 1024 / 1024;
      if (rssMb >= maxRssMb) { haltReason = `memory_cap_${rssMb.toFixed(1)}mb`; break; }
      if ((Date.now() - startedAt) / 1000 >= maxSeconds) { haltReason = "time_cap"; break; }
    }
    const positions = placeStage(blocks);
    if (!positions) continue;
    const colors = shuffled(outerColors);
    const signature = blocks.map((block, index) => `${block.id}@${positions.get(block.id).join(",")}:${colors[index]}`).join("|");
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    const level = coreLevel(key, blocks, positions, colors);
    try { runtime.validateLevel(level); } catch { continue; }
    const solved = runtime.solveLevelOptimally(level, maxStates);
    if (!solved.solved) continue;
    const candidate = {
      trial,
      stage_key: key,
      reposition_overhead: solved.repositionOverhead,
      minimum_drags: solved.minimumDrags,
      explored_states: solved.exploredStates,
      positions: Object.fromEntries(blocks.map((block) => [block.id, positions.get(block.id)])),
      colors: Object.fromEntries(blocks.map((block, index) => [block.id, colors[index]])),
      route: solved.drags,
    };
    best.push(candidate);
    best.sort((left, right) => right.reposition_overhead - left.reposition_overhead
      || left.explored_states - right.explored_states || left.trial - right.trial);
    best.length = Math.min(best.length, keep);
  }
  outputStages.push({ stage_key: key, block_ids: blocks.map((block) => block.id), trials, unique: signatures.size, halt_reason: haltReason, best });
  console.log(`${key}: ${best[0]?.reposition_overhead ?? "none"}`);
}
const output = {
  schema_version: "blockout-video-parity-stage-gadget-search-v1",
  source_binding: { runtime: { path: runtimeRelative, sha256: sha256(runtimeText) } },
  level_id: `Lv${String(levelId).padStart(3, "0")}`,
  seed, trials, max_states: maxStates,
  stages: outputStages,
};
const text = `${JSON.stringify(output, null, 2)}\n`;
const path = resolve(root, outputRelative);
await mkdir(dirname(path), { recursive: true });
await writeFile(path, text, "utf8");
console.log(JSON.stringify({ output: outputRelative, sha256: sha256(text), best: Object.fromEntries(outputStages.map((stage) => [stage.stage_key, stage.best[0]?.reposition_overhead ?? null])) }, null, 2));
