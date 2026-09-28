import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = resolve(root, ".codex-temp/video-parity-v6-lv14-17-18-20-baseline-r35/runtime.generated.ts");
const search = JSON.parse(await readFile(resolve(root, ".codex-temp/lv14-stage-gadget-search-r2.json"), "utf8"));
const candidate = search.stages[0].best[0];
const bundle = await build({ stdin: { contents: `
  export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(runtimePath)};
  export { validateLevel } from "./src/core/PuzzleModel.ts";
  export { solveLevelOptimally } from "./src/core/levelSolver.ts";
`, resolveDir: root, sourcefile: "lv14-stage-probe.ts", loader: "ts" }, bundle: true,
platform: "node", format: "esm", write: false, logLevel: "silent" });
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const level = structuredClone(runtime.levels.find((entry) => entry.id === 14));
for (const block of level.blocks) {
  [block.x, block.y] = candidate.positions[block.id];
  block.color = candidate.colors[block.id];
  block.layers = [block.color];
  if (block.id !== "strategy-guard-12") delete block.frozen;
}
const frozenGate = process.argv[2] ?? "right";
for (const gate of level.gates) {
  if (gate.side === frozenGate && gate.color === "green") gate.frozen = 17;
  else delete gate.frozen;
}
delete level.parMoves; delete level.designTargets;
runtime.validateLevel(level);
const solved = runtime.solveLevelOptimally(level, Number(process.argv[3] ?? 500_000));
console.log(JSON.stringify({ frozenGate, solved: solved.solved, repositions: solved.repositionOverhead,
  minimumDrags: solved.minimumDrags, states: solved.exploredStates,
  route: process.argv[4] === "summary" ? undefined : solved.drags }, null, 2));
