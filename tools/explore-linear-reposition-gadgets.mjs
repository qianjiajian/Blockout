import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const valueFor = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const widthFrom = valueFor("--width-from", 3);
const widthTo = valueFor("--width-to", 10);
const maxStates = valueFor("--max-states", 250_000);
const boardHeight = valueFor("--board-height", 4);
const laneY = Math.floor(boardHeight / 2);

const bundle = await build({
  stdin: {
    contents: `
      import { validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "linear-reposition-gadgets-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);

const rows = [];
let firstValidationError = null;
for (let width = widthFrom; width <= widthTo; width += 1) {
  const blockCount = width - 1;
  const variants = 2 ** blockCount;
  let best = null;
  for (let empty = 0; empty < width; empty += 1) {
    for (let mask = 1; mask < variants - 1; mask += 1) {
      const occupied = Array.from({ length: width }, (_value, x) => x).filter((x) => x !== empty);
      const blocks = occupied.map((x, index) => ({
        id: `b-${index + 1}`,
        x,
        y: laneY,
        shape: [[0, 0]],
        color: (mask & (1 << index)) ? "red" : "blue",
      }));
      const level = {
        id: 990000 + width * 100 + empty,
        name: `linear-${width}-${empty}-${mask}`,
        difficulty: "hard",
        timeSeconds: 999,
        reward: 1,
        width,
        height: boardHeight,
        playable: Array.from({ length: width }, (_value, x) => [x, laneY]),
        gates: [
          { id: "red-left", side: "left", offset: laneY, size: 1, color: "red" },
          { id: "blue-right", side: "right", offset: laneY, size: 1, color: "blue" },
        ],
        blocks,
      };
      try { runtime.validateLevel(level); } catch (error) {
        firstValidationError ??= error.message;
        continue;
      }
      const solved = runtime.solveLevelOptimally(level, maxStates);
      if (!solved.solved) continue;
      if (!best || solved.repositionOverhead > best.reposition_overhead
        || (solved.repositionOverhead === best.reposition_overhead && solved.moves < best.moves)) {
        best = {
          width,
          block_count: blockCount,
          empty,
          sequence: blocks.sort((left, right) => left.x - right.x).map((block) => `${block.x}:${block.color[0]}`).join(" "),
          reposition_overhead: solved.repositionOverhead,
          moves: solved.moves,
          explored_states: solved.exploredStates,
          route: solved.drags,
        };
      }
    }
  }
  rows.push(best);
  console.log(JSON.stringify(best));
}

console.log(JSON.stringify({ first_validation_error: firstValidationError, rows }, null, 2));
