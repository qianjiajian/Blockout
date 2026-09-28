import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Isolated design probe: evaluate candidate Lv20 gate/color variants without
// writing the contract, campaign, assembler, verifier, or any candidate file.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const input = resolve(root, process.argv[2]
  ?? ".codex-temp/video-parity-v6-lv20-cover-dual-stage-candidate-r4/proof-input.json");
const parsed = JSON.parse(await readFile(input, "utf8"));
const level = structuredClone(parsed.levels[0].level);
if (process.argv[7] === "restricted") {
  const mask = ["##.##", "##.##", "##.##", "#####", "#####", "####.", "##...", ".####"];
  level.playable = mask.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [[x, y]] : []));
}
const [A, B, C, D, E] = parsed.levels[0].target.design_palette;
const colorBySymbol = { A, B, C, D, E };
const requestedColors = process.argv[4] === "simple"
  ? [B, B, B, B, B]
  : process.argv[4]?.includes(",")
    ? process.argv[4].split(",").map((symbol) => colorBySymbol[symbol])
    : null;
if (requestedColors) {
  const requestedIds = requestedColors.length === 7
    ? ["cc-020-b1-01", "cc-020-b1-02", "cc-020-b1-03", "cc-020-b1-04", "cc-020-b1-05", "cc-020-b1-06", "cc-020-b1-07"]
    : ["cc-020-b1-01", "cc-020-b1-02", "cc-020-b1-03", "cc-020-b1-04", "cc-020-b1-05"];
  requestedIds.forEach((id, index) => {
    const block = level.blocks.find((entry) => entry.id === id);
    block.color = requestedColors[index]; block.layers = [requestedColors[index]];
  });
}
const leftGateSymbols = (process.argv[5] ?? "D,E,B").split(",");
const leftGateSpecs = [
  { side: "top", offset: 0, size: 2, color: A },
  { side: "left", offset: 0, size: 1, color: colorBySymbol[leftGateSymbols[0]], frozen: 1 },
  { side: "left", offset: 1, size: 1, color: colorBySymbol[leftGateSymbols[1]], frozen: 2 },
  { side: "left", offset: 2, size: 1, color: colorBySymbol[leftGateSymbols[2]], frozen: 3 },
  { side: "left", offset: 3, size: 3, color: C, frozen: 6 },
  { side: "top", offset: 3, size: 1, color: B, frozen: 7 },
  { side: "top", offset: 4, size: 1, color: D, frozen: 8 },
  { side: "bottom", offset: 3, size: 1, color: E, frozen: 10 },
];
const rightGateSpecs = [
  { side: "top", offset: 0, size: 2, color: A },
  { side: "right", offset: 0, size: 1, color: D, frozen: 1 },
  { side: "right", offset: 1, size: 1, color: E, frozen: 2 },
  { side: "right", offset: 2, size: 1, color: B, frozen: 3 },
  { side: "left", offset: 3, size: 3, color: C, frozen: 6 },
  { side: "top", offset: 3, size: 1, color: B, frozen: 7 },
  { side: "top", offset: 4, size: 1, color: D, frozen: 8 },
  { side: "bottom", offset: 1, size: 1, color: E, frozen: 10 },
];
const gateSpecs = process.argv[5] === "right-cycle" ? rightGateSpecs : leftGateSpecs;
if (process.argv[5] !== "keep-gates") {
  level.gates.forEach((gate, index) => Object.assign(gate, gateSpecs[index]));
}
level.blocks = level.blocks.filter((block) => !block.shutterId).map((block) => {
  const copy = structuredClone(block);
  delete copy.frozen; delete copy.shutterId; delete copy.layers;
  return copy;
});
level.gates.forEach((gate) => delete gate.frozen);
delete level.shutters; delete level.designTargets; delete level.parMoves;

const bundle = await build({
  stdin: {
    contents: `export { validateLevel } from "./src/core/PuzzleModel.ts"; export { solveLevelOptimally } from "./src/core/levelSolver.ts";`,
    resolveDir: root, sourcefile: "lv20-handle-gate-probe.ts", loader: "ts",
  },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
runtime.validateLevel(level);
const solved = runtime.solveLevelOptimally(level, Number(process.argv[3] ?? 1_000_000));
console.log(JSON.stringify({ solved: solved.solved, repositions: solved.repositionOverhead,
  minimum_drags: solved.minimumDrags, states: solved.exploredStates,
  route: process.argv[6] === "summary" ? undefined : solved.drags }, null, 2));
