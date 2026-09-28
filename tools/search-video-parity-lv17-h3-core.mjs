import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundle = await build({
  stdin: {
    contents: `export { solveLevelOptimally } from "./src/core/levelSolver.ts";`,
    resolveDir: root, sourcefile: "lv17-h3-core-runtime.ts", loader: "ts",
  },
  bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const H3 = [[0, 0], [1, 0], [2, 0]];
const colors = ["blue", "yellow", "pink", "red"];
const permutations = (items) => items.length === 1 ? [items] : items.flatMap((item, index) => (
  permutations(items.filter((_other, otherIndex) => otherIndex !== index)).map((tail) => [item, ...tail])
));
const positions = [
  [[0, 0], [3, 0], [0, 1], [3, 1]],
  [[0, 0], [3, 0], [0, 3], [3, 3]],
  [[0, 0], [3, 0], [0, 7], [3, 7]],
  [[0, 1], [3, 1], [0, 6], [3, 6]],
];
const gateLayouts = [
  [["top", 0, 3], ["top", 3, 3], ["bottom", 0, 3], ["bottom", 3, 3]],
  [["left", 0, 2], ["left", 6, 2], ["right", 0, 2], ["right", 6, 2]],
  [["top", 0, 3], ["top", 3, 3], ["left", 0, 8], ["bottom", 0, 6]],
  [["bottom", 0, 3], ["bottom", 3, 3], ["left", 0, 8], ["top", 0, 6]],
];
const results = [];
if (process.env.H3_CORE_MODE !== "campaign") for (const anchors of positions) for (const layout of gateLayouts) {
  for (const gateColors of permutations(colors)) for (const blockColors of permutations(colors)) {
    const level = {
      id: 17, name: "late H3 core", difficulty: "hard", timeSeconds: 135, reward: 0,
      width: 6, height: 8,
      playable: Array.from({ length: 8 }, (_, y) => Array.from({ length: 6 }, (_v, x) => [x, y])).flat(),
      gates: layout.map(([side, offset, size], index) => ({ id: `g${index}`, side, offset, size, color: gateColors[index] })),
      blocks: anchors.map(([x, y], index) => ({ id: `b${index}`, x, y, shape: H3, color: blockColors[index] })),
    };
    let solved;
    try { solved = runtime.solveLevelOptimally(level, 100_000); } catch { continue; }
    if (!solved.solved || solved.repositionOverhead < 2) continue;
    results.push({ anchors, layout, gateColors, blockColors, reposition: solved.repositionOverhead, states: solved.exploredStates, route: solved.drags });
  }
}
const cartesian = (items, length) => length === 0 ? [[]]
  : items.flatMap((item) => cartesian(items, length - 1).map((tail) => [item, ...tail]));
const campaignGateLayouts = [
  [
    ["right", 4, 2, "purple"], ["right", 0, 4, "blue"],
    ["top", 0, 3, "yellow"], ["top", 3, 3, "pink"], ["bottom", 0, 3, "red"],
  ],
  [
    ["right", 4, 2, "purple"], ["right", 0, 4, "blue"],
    ["bottom", 0, 3, "yellow"], ["bottom", 3, 3, "pink"], ["top", 0, 3, "red"],
  ],
];
for (const anchors of positions) for (const layout of campaignGateLayouts) {
  for (const blockColors of cartesian(["blue", "yellow", "pink", "red", "purple"], 4)) {
    const level = {
      id: 17, name: "late H3 campaign core", difficulty: "hard", timeSeconds: 135, reward: 0,
      width: 6, height: 8,
      playable: Array.from({ length: 8 }, (_, y) => Array.from({ length: 6 }, (_v, x) => [x, y])).flat(),
      gates: layout.map(([side, offset, size, color], index) => ({ id: `cg${index}`, side, offset, size, color })),
      blocks: anchors.map(([x, y], index) => ({ id: `cb${index}`, x, y, shape: H3, color: blockColors[index] })),
    };
    let solved;
    try { solved = runtime.solveLevelOptimally(level, 100_000); } catch { continue; }
    if (!solved.solved || solved.repositionOverhead < 2) continue;
    results.push({ campaign: true, anchors, layout, blockColors, reposition: solved.repositionOverhead, states: solved.exploredStates, route: solved.drags });
  }
}
results.sort((left, right) => right.reposition - left.reposition || left.states - right.states);
const byAnchors = positions.map((anchors) => ({
  anchors,
  count: results.filter((entry) => JSON.stringify(entry.anchors) === JSON.stringify(anchors)).length,
  best: results.find((entry) => JSON.stringify(entry.anchors) === JSON.stringify(anchors)) ?? null,
}));
console.log(JSON.stringify(process.env.H3_CORE_SUMMARY === "1"
  ? { count: results.length, byAnchors: byAnchors.map((entry) => ({
    anchors: entry.anchors,
    count: entry.count,
    best: entry.best ? {
      layout: entry.best.layout,
      blockColors: entry.best.blockColors,
      reposition: entry.best.reposition,
      states: entry.best.states,
    } : null,
  })) }
  : { count: results.length, byAnchors, best: results.slice(0, 20) }, null, 2));
