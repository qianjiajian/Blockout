import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Random exact search for four thawed H3 carriers that retain a two-move
// optimal floor under the actual five-gate Lv17 palette.  This is an isolated
// topology probe and never writes campaign sources.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, process.argv[2]
  ?? ".codex-temp/video-parity-lv17-h3-core-layouts");
const attempts = Number(process.argv[3] ?? 100_000);
const cap = Number(process.argv[4] ?? 20_000);
let state = Number(process.argv[5] ?? 170917) >>> 0;
const random = () => {
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  return (state >>> 0) / 0x1_0000_0000;
};
const pick = (values) => values[Math.floor(random() * values.length)];
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const bundle = await build({
  stdin: {
    contents: `export { solveLevelOptimally } from "./src/core/levelSolver.ts";`,
    resolveDir: root, sourcefile: "lv17-h3-core-layouts-runtime.ts", loader: "ts",
  },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const H3 = [[0, 0], [1, 0], [2, 0]];
const anchors = Array.from({ length: 8 }, (_row, y) => (
  Array.from({ length: 4 }, (_column, x) => [x, y])
)).flat();
const colors = ["blue", "yellow", "pink", "red", "purple"];
const gates = [
  { id: "ordinary", side: "right", offset: 4, size: 2, color: "purple" },
  { id: "f8", side: "right", offset: 0, size: 4, color: "blue" },
  { id: "f16", side: "top", offset: 0, size: 3, color: "yellow" },
  { id: "f21", side: "top", offset: 3, size: 3, color: "pink" },
  { id: "f26", side: "bottom", offset: 0, size: 3, color: "red" },
];
const overlaps = (left, right) => left[1] === right[1]
  && left[0] <= right[0] + 2 && right[0] <= left[0] + 2;
const results = [];
const topologyKeys = new Set();
for (let attempt = 0; attempt < attempts && results.length < 200; attempt += 1) {
  const selected = [];
  for (let tries = 0; tries < 40 && selected.length < 4; tries += 1) {
    const anchor = pick(anchors);
    if (selected.some((entry) => entry[0] === anchor[0] && entry[1] === anchor[1])
      || selected.some((entry) => overlaps(entry, anchor))) continue;
    selected.push(anchor);
  }
  if (selected.length !== 4) continue;
  selected.sort((left, right) => left[1] - right[1] || left[0] - right[0]);
  const blockColors = selected.map(() => pick(colors));
  const level = {
    id: 17, name: "Lv17 random H3 core", difficulty: "hard", timeSeconds: 135, reward: 0,
    width: 6, height: 8,
    playable: Array.from({ length: 8 }, (_row, y) => Array.from({ length: 6 }, (_cell, x) => [x, y])).flat(),
    gates,
    blocks: selected.map(([x, y], index) => ({ id: `b${index}`, x, y, shape: H3, color: blockColors[index] })),
  };
  let solution;
  try { solution = runtime.solveLevelOptimally(level, cap); } catch { continue; }
  if (!solution.solved || solution.repositionOverhead < 2) continue;
  const topologyKey = JSON.stringify(selected);
  if (topologyKeys.has(topologyKey)) continue;
  topologyKeys.add(topologyKey);
  results.push({
    attempt, anchors: selected, block_colors: blockColors,
    reposition_overhead: solution.repositionOverhead,
    explored_states: solution.exploredStates,
    route: solution.drags,
  });
  console.log(`attempt=${attempt} topologies=${results.length} floor=${solution.repositionOverhead}`);
}
results.sort((left, right) => right.reposition_overhead - left.reposition_overhead
  || left.explored_states - right.explored_states);
await mkdir(outputDir, { recursive: true });
const artifact = {
  schema: "blockout-video-parity-lv17-random-h3-core-layout-search-v1",
  attempts, solver_state_cap: cap, final_prng_state: state,
  runtime_bundle_sha256: sha256(bundle.outputFiles[0].contents),
  gates, results,
};
const outputPath = resolve(outputDir, "results.json");
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output: outputPath, count: results.length, best: results[0] ?? null }, null, 2));
