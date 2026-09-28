import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const value = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const input = resolve(ROOT, value("--input"));
const levelId = Number(value("--level"));
const stageIndex = Number(value("--stage", "1"));
const maxStates = Number(value("--max-states", "20000"));

const bundle = await build({
  stdin: {
    contents: `
      import { validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      export { validateLevel, solveLevelOptimally };
    `,
    resolveDir: ROOT,
    sourcefile: "explore-layered-pair-floor-v5-runtime.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);
const artifact = JSON.parse(await readFile(input, "utf8"));
const source = artifact.levels.find((entry) => entry.level?.id === levelId);
if (!source) throw new Error(`Lv${levelId} missing`);
const shutters = [...(source.level.shutters ?? [])].filter((item) => item.skin === "staging")
  .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
const stages = [
  source.level.blocks.filter((block) => !block.shutterId),
  ...shutters.map((shutter) => source.level.blocks.filter((block) => block.shutterId === shutter.id)),
];
const pair = stages[stageIndex - 1].slice(0, 2);
if (pair.length !== 2) throw new Error("Selected stage has fewer than two blocks");
const blocked = new Map((source.level.blocked ?? []).map((point) => [point.join(","), point]));
for (const shutter of shutters.slice(stageIndex - 1)) {
  for (let y = shutter.y; y < shutter.y + shutter.height; y += 1) {
    for (let x = shutter.x; x < shutter.x + shutter.width; x += 1) blocked.set(`${x},${y}`, [x, y]);
  }
}
const palette = [...new Set(source.level.gates.map((gate) => gate.color))];
const outerCandidatesA = args.includes("--all-outer") ? palette : [pair[0].color];
const outerCandidatesB = args.includes("--all-outer") ? palette : [pair[1].color];
let best = null;
let solvedCount = 0;
for (const outerA of outerCandidatesA) {
  for (const innerA of palette) {
    for (const outerB of outerCandidatesB) {
      for (const innerB of palette) {
        const blocks = pair.map((block, index) => {
          const layers = index === 0 ? [outerA, innerA] : [outerB, innerB];
          const copy = structuredClone(block);
          delete copy.shutterId;
          delete copy.frozen;
          copy.color = layers[0];
          copy.layers = layers;
          return copy;
        });
        const level = {
          ...structuredClone(source.level),
          blocks,
          blocked: [...blocked.values()],
          gates: source.level.gates.map((gate) => ({ ...gate, frozen: 0 })),
        };
        delete level.shutters;
        delete level.elevators;
        delete level.conveyors;
        try { runtime.validateLevel(level); } catch { continue; }
        const solved = runtime.solveLevelOptimally(level, maxStates);
        if (!solved.solved) continue;
        solvedCount += 1;
        if (!best || solved.repositionOverhead > best.reposition_overhead) {
          best = {
            block_ids: blocks.map((block) => block.id),
            layers: blocks.map((block) => block.layers),
            reposition_overhead: solved.repositionOverhead,
            minimum_drags: solved.minimumDrags,
            explored_states: solved.exploredStates,
            route: solved.drags,
          };
          console.log(JSON.stringify(best));
        }
      }
    }
  }
}
console.log(JSON.stringify({ level: levelId, stage: stageIndex, solved_count: solvedCount, best }, null, 2));
