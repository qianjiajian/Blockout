import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Isolated four-H3 late-core search for the already certified Lv17 opening
// layout.  It never writes campaign sources.  Every retained result is solved
// optimally after deleting the other bodies and thawing all four frozen gates.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(root, process.argv[2]
  ?? ".codex-temp/video-parity-lv17-deadline-layout-search/run1/candidates.json");
const outputDir = resolve(root, process.argv[3]
  ?? ".codex-temp/video-parity-lv17-candidate-late-core");
const cap = Number(process.argv[4] ?? 100_000);
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

const bundle = await build({
  stdin: {
    contents: `export { solveLevelOptimally } from "./src/core/levelSolver.ts";`,
    resolveDir: root,
    sourcefile: "lv17-candidate-late-core-runtime.ts",
    loader: "ts",
  },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const inputSource = await readFile(inputPath, "utf8");
const input = JSON.parse(inputSource);
const source = structuredClone(input.candidates?.[0]?.level);
if (!source || source.id !== 17) throw new Error("Lv17 certified opening candidate missing");

const highIds = ["cc-017-b1-05", "cc-017-b1-06", "cc-017-b1-08", "cc-017-b1-09"];
const palettes = ["blue", "yellow", "pink", "red"];
const cartesian = (values, length) => length === 0 ? [[]]
  : values.flatMap((value) => cartesian(values, length - 1).map((tail) => [value, ...tail]));
const layouts = [
  [["top", 0, 3], ["top", 3, 3], ["bottom", 0, 3], ["bottom", 3, 3]],
  [["bottom", 0, 3], ["bottom", 3, 3], ["top", 0, 3], ["top", 3, 3]],
  [["left", 0, 2], ["left", 6, 2], ["right", 0, 2], ["right", 6, 2]],
  [["right", 0, 2], ["right", 6, 2], ["left", 0, 2], ["left", 6, 2]],
  [["top", 0, 3], ["top", 3, 3], ["left", 0, 8], ["bottom", 0, 6]],
  [["bottom", 0, 3], ["bottom", 3, 3], ["left", 0, 8], ["top", 0, 6]],
  [["right", 0, 4], ["bottom", 0, 3], ["top", 0, 3], ["top", 3, 3]],
  [["right", 0, 4], ["top", 0, 3], ["top", 3, 3], ["bottom", 0, 3]],
];
const results = [];
for (let layoutIndex = 0; layoutIndex < layouts.length; layoutIndex += 1) {
  const layout = layouts[layoutIndex];
  for (const blockColors of cartesian(palettes, highIds.length)) {
    const core = structuredClone(source);
    core.blocks = core.blocks.filter((block) => highIds.includes(block.id)).map((block) => {
      const index = highIds.indexOf(block.id);
      return { ...block, color: blockColors[index], layers: [blockColors[index]], frozen: undefined };
    });
    core.gates = layout.map(([side, offset, size], index) => ({
      id: `lv17-late-core-g${index + 1}`,
      side, offset, size, color: palettes[index],
    }));
    delete core.shutters;
    delete core.generators;
    delete core.elevators;
    delete core.conveyors;
    delete core.designTargets;
    let solution;
    try { solution = runtime.solveLevelOptimally(core, cap); } catch { continue; }
    if (!solution.solved || solution.repositionOverhead < 2) continue;
    results.push({
      layout_index: layoutIndex,
      layout,
      block_colors: blockColors,
      reposition_overhead: solution.repositionOverhead,
      explored_states: solution.exploredStates,
      route: solution.drags,
    });
  }
  console.log(`layout=${layoutIndex} retained=${results.length}`);
}
results.sort((left, right) => right.reposition_overhead - left.reposition_overhead
  || left.explored_states - right.explored_states);
await mkdir(outputDir, { recursive: true });
const artifact = {
  schema: "blockout-video-parity-lv17-candidate-late-h3-core-search-v1",
  input: { path: inputPath, sha256: sha256(inputSource) },
  runtime_bundle_sha256: sha256(bundle.outputFiles[0].contents),
  solver_state_cap: cap,
  high_block_ids: highIds,
  results,
};
const outputPath = resolve(outputDir, "results.json");
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output: outputPath, count: results.length, best: results[0] ?? null }, null, 2));
