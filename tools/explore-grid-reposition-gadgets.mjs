import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const numberArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const width = numberArg("--width", 3);
const height = numberArg("--height", 3);
const emptyCount = numberArg("--empty", 1);
const trials = numberArg("--trials", 1_000);
const maxStates = numberArg("--max-states", 250_000);
const seed = numberArg("--seed", 1) >>> 0;

const bundle = await build({
  stdin: {
    contents: `
      import { validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "grid-reposition-gadgets-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);

let randomState = seed || 1;
const random = () => {
  randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
  return randomState / 2 ** 32;
};
const allCells = Array.from({ length: width * height }, (_value, index) => [index % width, Math.floor(index / width)]);
let best = null;
let solvedCount = 0;
for (let trial = 0; trial < trials; trial += 1) {
  const shuffled = [...allCells].sort(() => random() - 0.5);
  const empty = new Set(shuffled.slice(0, emptyCount).map(([x, y]) => `${x},${y}`));
  const occupied = allCells.filter(([x, y]) => !empty.has(`${x},${y}`));
  const blocks = occupied.map(([x, y], index) => ({
    id: `b-${index + 1}`,
    x,
    y,
    shape: [[0, 0]],
    color: random() < 0.5 ? "red" : "blue",
  }));
  if (!blocks.some((block) => block.color === "red") || !blocks.some((block) => block.color === "blue")) continue;
  const level = {
    id: 991000 + trial,
    name: `grid-${width}x${height}-${trial}`,
    difficulty: "hard",
    timeSeconds: 999,
    reward: 1,
    width,
    height,
    playable: allCells,
    gates: [
      { id: "red-top", side: "top", offset: Math.floor(width / 2), size: 1, color: "red" },
      { id: "blue-bottom", side: "bottom", offset: Math.floor(width / 2), size: 1, color: "blue" },
    ],
    blocks,
  };
  runtime.validateLevel(level);
  const solved = runtime.solveLevelOptimally(level, maxStates);
  if (!solved.solved) continue;
  solvedCount += 1;
  if (!best || solved.repositionOverhead > best.reposition_overhead) {
    best = {
      trial,
      width,
      height,
      empty: [...empty],
      layout: Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
        const block = blocks.find((item) => item.x === x && item.y === y);
        return block ? block.color[0].toUpperCase() : ".";
      }).join("")),
      reposition_overhead: solved.repositionOverhead,
      moves: solved.moves,
      explored_states: solved.exploredStates,
      route: solved.drags,
    };
    console.log(JSON.stringify(best));
  }
}

console.log(JSON.stringify({ solved_count: solvedCount, best }, null, 2));
