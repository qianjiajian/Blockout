import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Search-only utility for the all-axis Lv50 contract.  Horizontal pieces are
// confined to rows with left exits and vertical pieces to columns with top
// exits, turning random exact packings into small Rush-Hour-style instances.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRelative = process.env.VIDEO_PARITY_LV50_RUNTIME_RELATIVE
  ?? ".codex-temp/video-parity-v6-lv50-53-baseline-r35/runtime.generated.ts";
const outputRelative = process.env.VIDEO_PARITY_LV50_SEARCH_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-v6-lv50-axis-search/search.json";
const trials = Number(process.env.VIDEO_PARITY_LV50_SEARCH_TRIALS ?? 500);
const maxStates = Number(process.env.VIDEO_PARITY_LV50_SEARCH_MAX_STATES ?? 100000);
const seed = Number(process.env.VIDEO_PARITY_LV50_SEARCH_SEED ?? 500053) >>> 0;
const sourcePath = resolve(root, runtimeRelative);
const sourceText = await readFile(sourcePath, "utf8");
const bundle = await build({
  stdin: {
    contents: `
      export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(sourcePath)};
      export { validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
      export { solveLevelOptimally } from ${JSON.stringify(resolve(root, "src/core/levelSolver.ts"))};
    `,
    resolveDir: root,
    sourcefile: "lv50-axis-layout-search-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const source = runtime.levels.find((level) => level.id === 50);
if (!source) throw new Error("Lv50 source missing");
let state = seed || 1;
const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 2 ** 32; };
const shuffled = (items) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};
const H2 = [[0, 0], [1, 0]];
const H3 = [[0, 0], [1, 0], [2, 0]];
const V2 = [[0, 0], [0, 1]];
const V3 = [[0, 0], [0, 1], [0, 2]];
const SQ2 = [[0, 0], [1, 0], [0, 1], [1, 1]];
const inventory = [
  ...Array.from({ length: 4 }, () => ({ shape: H2, axis: "horizontal" })),
  ...Array.from({ length: 2 }, () => ({ shape: H3, axis: "horizontal" })),
  ...Array.from({ length: 2 }, () => ({ shape: V2, axis: "vertical" })),
  ...Array.from({ length: 4 }, () => ({ shape: V3, axis: "vertical" })),
  { shape: SQ2, axis: "vertical" },
].map((entry, index) => ({ ...entry, id: source.blocks[index].id }));
const rowColors = new Map([[3, "orange"], [4, "green"], [5, "cyan"], [6, "red"], [7, "orange"]]);
const columnColors = new Map([[0, "red"], [1, "yellow"], [2, "green"], [3, "cyan"], [4, "cyan"]]);
const anchors = (piece) => {
  const width = Math.max(...piece.shape.map(([x]) => x)) + 1;
  const height = Math.max(...piece.shape.map(([, y]) => y)) + 1;
  const result = [];
  if (piece.axis === "horizontal") {
    for (const y of rowColors.keys()) for (let x = 0; x <= 5 - width; x += 1) result.push([x, y]);
  } else if (width === 2) {
    for (let y = 0; y <= 9 - height; y += 1) result.push([3, y]);
  } else {
    for (let x = 0; x < 5; x += 1) for (let y = 0; y <= 9 - height; y += 1) result.push([x, y]);
  }
  return shuffled(result);
};
const pack = () => {
  const ordered = shuffled(inventory).sort((left, right) => right.shape.length - left.shape.length);
  const occupied = new Set();
  const placed = new Map();
  let budget = 20000;
  const recurse = (index) => {
    budget -= 1;
    if (budget <= 0) return false;
    if (index === ordered.length) return true;
    const piece = ordered[index];
    for (const [x, y] of anchors(piece)) {
      const cells = piece.shape.map(([dx, dy]) => `${x + dx},${y + dy}`);
      if (cells.some((cell) => occupied.has(cell))) continue;
      cells.forEach((cell) => occupied.add(cell));
      placed.set(piece.id, [x, y]);
      if (recurse(index + 1)) return true;
      placed.delete(piece.id);
      cells.forEach((cell) => occupied.delete(cell));
    }
    return false;
  };
  return recurse(0) ? placed : null;
};
const randomGateSpecs = () => [
  { side: random() < 0.5 ? "top" : "bottom", offset: 0, size: 1, color: "red" },
  { side: random() < 0.5 ? "top" : "bottom", offset: 1, size: 1, color: "yellow" },
  { side: random() < 0.5 ? "top" : "bottom", offset: 2, size: 1, color: "green" },
  { side: random() < 0.5 ? "top" : "bottom", offset: 3, size: 2, color: "cyan" },
  ...[3, 4, 5, 6, 7].map((offset) => ({
    side: random() < 0.5 ? "left" : "right",
    offset,
    size: 1,
    color: rowColors.get(offset),
  })),
];
let packed = 0;
let valid = 0;
let solved = 0;
const best = [];
for (let trial = 0; trial < trials; trial += 1) {
  const positions = pack();
  if (!positions) continue;
  packed += 1;
  const level = structuredClone(source);
  delete level.blocked;
  delete level.shutters;
  delete level.generators;
  delete level.elevators;
  delete level.conveyors;
  const gateSpecs = randomGateSpecs();
  level.gates.forEach((gate, index) => Object.assign(gate, gateSpecs[index]));
  level.blocks = inventory.map((piece) => {
    const [x, y] = positions.get(piece.id);
    return {
      id: piece.id,
      x,
      y,
      shape: piece.shape.map((point) => [...point]),
      color: piece.axis === "horizontal" ? rowColors.get(y) : columnColors.get(x),
      movementAxis: piece.axis,
    };
  });
  if (new Set(level.blocks.map((block) => block.color)).size !== 5) continue;
  try { runtime.validateLevel(level); } catch { continue; }
  valid += 1;
  const result = runtime.solveLevelOptimally(level, maxStates);
  if (!result.solved) continue;
  solved += 1;
  const candidate = {
    trial,
    reposition_overhead: result.repositionOverhead,
    minimum_drags: result.minimumDrags,
    explored_states: result.exploredStates,
    level,
    route: result.drags,
  };
  best.push(candidate);
  best.sort((left, right) => right.reposition_overhead - left.reposition_overhead
    || left.explored_states - right.explored_states);
  best.length = Math.min(best.length, 10);
  if (best[0] === candidate) console.log(`trial=${trial} best=${candidate.reposition_overhead} states=${candidate.explored_states}`);
  if (candidate.reposition_overhead >= 5) break;
  globalThis.gc?.();
}
const artifact = {
  schema_version: "blockout-video-parity-lv50-axis-layout-search-v1",
  source: { path: runtimeRelative, sha256: createHash("sha256").update(sourceText).digest("hex").toUpperCase() },
  seed,
  trials,
  max_states: maxStates,
  packed,
  valid,
  solved,
  best,
};
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputRelative, packed, valid, solved, best: best[0]?.reposition_overhead ?? null }, null, 2));
