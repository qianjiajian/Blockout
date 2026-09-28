import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only full LevelSpec layout search.  It preserves every block,
// shape, reveal-stage assignment, mechanism carrier and gate descriptor;
// only per-stage anchors/outer colours and gate descriptor placement vary.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRelative = process.env.VIDEO_PARITY_FULL_FLOOR_RUNTIME_RELATIVE;
const outputRelative = process.env.VIDEO_PARITY_FULL_FLOOR_OUTPUT_RELATIVE;
const levelId = Number(process.env.VIDEO_PARITY_FULL_FLOOR_LEVEL_ID);
const trials = Number(process.env.VIDEO_PARITY_FULL_FLOOR_TRIALS ?? 1000);
const maxStates = Number(process.env.VIDEO_PARITY_FULL_FLOOR_MAX_STATES ?? 100000);
const seed = Number(process.env.VIDEO_PARITY_FULL_FLOOR_SEED ?? levelId * 32452843 + 19) >>> 0;
const keep = Number(process.env.VIDEO_PARITY_FULL_FLOOR_KEEP ?? 8);
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
const random = () => { randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5; return (randomState >>> 0) / 2 ** 32; };
const shuffled = (values) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};
const playable = new Set(source.playable.map(([x, y]) => `${x},${y}`));
const anchorsByShape = new Map();
const shapeKey = (shape) => shape.map(([x, y]) => `${x},${y}`).sort().join(";");
const anchorsFor = (block) => {
  const key = shapeKey(block.shape);
  if (!anchorsByShape.has(key)) {
    const anchors = [];
    for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
      if (block.shape.every(([dx, dy]) => playable.has(`${x + dx},${y + dy}`))) anchors.push([x, y]);
    }
    anchorsByShape.set(key, anchors);
  }
  return anchorsByShape.get(key);
};
const stageKey = (block) => block.shutterId ?? "opening";
const stages = new Map();
for (const block of source.blocks) {
  const key = stageKey(block);
  if (!stages.has(key)) stages.set(key, []);
  stages.get(key).push(block);
}
const place = (blocks) => {
  const ordered = shuffled(blocks).sort((left, right) => right.shape.length - left.shape.length);
  const occupied = new Set();
  const positions = new Map();
  const recurse = (index) => {
    if (index === ordered.length) return true;
    const block = ordered[index];
    for (const [x, y] of shuffled(anchorsFor(block))) {
      const cells = block.shape.map(([dx, dy]) => `${x + dx},${y + dy}`);
      if (cells.some((cell) => occupied.has(cell))) continue;
      cells.forEach((cell) => occupied.add(cell)); positions.set(block.id, [x, y]);
      if (recurse(index + 1)) return true;
      positions.delete(block.id); cells.forEach((cell) => occupied.delete(cell));
    }
    return false;
  };
  return recurse(0) ? positions : null;
};
const mutableColor = (block) => (block.layers?.length ?? 1) === 1 && !block.keyId && !block.lockedBy;
const candidates = [];
let solvedCount = 0;
let validCount = 0;
for (let trial = 0; trial < trials; trial += 1) {
  const level = structuredClone(source);
  const positions = new Map();
  let placed = true;
  for (const blocks of stages.values()) {
    const stagePositions = place(blocks);
    if (!stagePositions) { placed = false; break; }
    for (const [id, point] of stagePositions) positions.set(id, point);
    const swappable = blocks.filter(mutableColor);
    const colors = shuffled(swappable.map((block) => block.color));
    swappable.forEach((block, index) => {
      const target = level.blocks.find((candidate) => candidate.id === block.id);
      target.color = colors[index]; target.layers = [colors[index]];
    });
  }
  if (!placed) continue;
  for (const block of level.blocks) [block.x, block.y] = positions.get(block.id);
  const descriptors = shuffled(level.gates.map((gate) => ({ color: gate.color, frozen: gate.frozen, star: gate.star })));
  level.gates.forEach((gate, index) => {
    const descriptor = descriptors[index]; gate.color = descriptor.color;
    if (descriptor.frozen === undefined) delete gate.frozen; else gate.frozen = descriptor.frozen;
    if (descriptor.star === undefined) delete gate.star; else gate.star = descriptor.star;
  });
  try { runtime.validateLevel(level); } catch { continue; }
  validCount += 1;
  const solved = runtime.solveLevelOptimally(level, maxStates);
  if (!solved.solved) continue;
  solvedCount += 1;
  const candidate = { trial, reposition_overhead: solved.repositionOverhead, minimum_drags: solved.minimumDrags, explored_states: solved.exploredStates, level, route: solved.drags };
  candidates.push(candidate);
  candidates.sort((left, right) => right.reposition_overhead - left.reposition_overhead || left.explored_states - right.explored_states || left.trial - right.trial);
  candidates.length = Math.min(candidates.length, keep);
  if (trial % 100 === 0 || candidates[0] === candidate) console.log(`trial=${trial} best=${candidates[0].reposition_overhead} solved=${solvedCount}`);
}
const output = {
  schema_version: "blockout-video-parity-full-layout-floor-search-v1",
  source_binding: { runtime: { path: runtimeRelative, sha256: sha256(runtimeText) } },
  level_id: `Lv${String(levelId).padStart(3, "0")}`,
  seed, trials, max_states: maxStates, valid_count: validCount, solved_count: solvedCount, candidates,
};
const text = `${JSON.stringify(output, null, 2)}\n`;
const path = resolve(root, outputRelative);
await mkdir(dirname(path), { recursive: true });
await writeFile(path, text, "utf8");
console.log(JSON.stringify({ output: outputRelative, sha256: sha256(text), valid_count: validCount, solved_count: solvedCount, best: candidates[0]?.reposition_overhead ?? null }, null, 2));
