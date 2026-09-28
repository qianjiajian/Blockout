import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT = resolve(ROOT, "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json");
const ASSEMBLED = resolve(ROOT, "playtest-results/experiments/competitor-composition-r141/assembled-expanded-density-candidates-v5.json");
const OUTPUT_DIR = resolve(ROOT, "playtest-results/experiments/competitor-composition-r141/nonstaged-search/lv060-specialized");
const OUTPUT = resolve(OUTPUT_DIR, "formal-candidates.json");
const trials = Math.max(1, Number(process.env.LV60_TRIALS ?? 2_000));
const seedOffset = Math.max(0, Number(process.env.LV60_SEED_OFFSET ?? 0));
const validationCap = Math.max(100, Number(process.env.LV60_VALIDATION_CAP ?? 4_000));

const bundle = await build({
  stdin: {
    contents: `
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelForValidation } from "./src/core/levelSolver.ts";
      export { PuzzleModel, validateLevel, solveLevelForValidation };
    `,
    resolveDir: ROOT,
    sourcefile: "lv60-single-grid-search.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);

const makeRng = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};
const shuffled = (items, rng) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
};
const replay = (level, route) => {
  const model = new api.PuzzleModel(level);
  for (const drag of route) {
    model.beginAction();
    for (const [x, y] of drag.path ?? []) if (!model.moveBlock(drag.blockId, x, y)) return false;
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  return model.snapshot().complete;
};

const contract = JSON.parse(await readFile(CONTRACT, "utf8"));
const contractEntry = contract.levels.find((entry) => entry.level_id === "Lv060");
const target = contractEntry.our_design_target;
const assembled = JSON.parse(await readFile(ASSEMBLED, "utf8"));
const source = assembled.levels.find((entry) => entry.level_id === "Lv060");
const palette = target.design_palette;
const layouts = [
  [
    ["top", 0], ["top", 1], ["top", 2], ["top", 3],
  ],
  [
    ["top", 0], ["top", 1], ["bottom", 0], ["bottom", 1],
  ],
  [
    ["left", 0], ["left", 1], ["right", 0], ["right", 1],
  ],
  [
    ["top", 0], ["right", 0], ["bottom", 4], ["left", 6],
  ],
];
const candidates = [];

for (let trial = 0; trial < trials; trial += 1) {
  if (trial > 0 && trial % 4 === 0 && typeof global.gc === "function") global.gc();
  const rng = makeRng(60_000_019 + seedOffset * 1_000_003 + trial * 97_531);
  const gateLayout = layouts[trial % layouts.length];
  const gates = gateLayout.map(([side, offset], index) => ({
    id: `v5-060-gate-${index + 1}`,
    side,
    offset,
    size: 1,
    color: palette[index],
  }));
  const cells = source.level.playable.map(([x, y]) => [x, y]);
  const colors = [];
  for (let index = 0; index < cells.length; index += 1) colors.push(palette[index % palette.length]);
  const randomized = shuffled(colors, rng);
  const blocks = cells.map(([x, y], index) => ({
    id: `v5-060-cell-${String(index + 1).padStart(2, "0")}`,
    x,
    y,
    shape: [[0, 0]],
    color: randomized[index],
  }));
  const gateBlockIndices = gates.map((gate) => blocks.findIndex((block) => (
    gate.side === "top" ? block.x === gate.offset && block.y === 0
      : gate.side === "bottom" ? block.x === gate.offset && block.y === source.level.height - 1
        : gate.side === "left" ? block.x === 0 && block.y === gate.offset
          : block.x === source.level.width - 1 && block.y === gate.offset
  )));
  if (new Set(gateBlockIndices).size !== gates.length || gateBlockIndices.some((index) => index < 0)) continue;
  const opening = trial % gates.length;
  for (let gateIndex = 0; gateIndex < gates.length; gateIndex += 1) {
    const blockIndex = gateBlockIndices[gateIndex];
    if (gateIndex === opening) {
      blocks[blockIndex].color = gates[gateIndex].color;
    } else if (blocks[blockIndex].color === gates[gateIndex].color) {
      const swapGate = (gateIndex + 1) % gates.length;
      const swapIndex = gateBlockIndices[swapGate];
      [blocks[blockIndex].color, blocks[swapIndex].color] = [blocks[swapIndex].color, blocks[blockIndex].color];
    }
  }
  const ownMouths = gates.filter((gate, gateIndex) => blocks[gateBlockIndices[gateIndex]].color === gate.color).length;
  if (ownMouths !== 1) continue;
  const level = {
    ...structuredClone(source.level),
    gates,
    blocks,
    parMoves: undefined,
    designTargets: {
      formulaVersion: "blockout-d1",
      calibratedDifficulty: target.target_d1_difficulty.calibrated_score,
      minimumRepositionOverhead: target.recommended_minimum_reposition_overhead,
    },
  };
  delete level.shutters;
  try { api.validateLevel(level); } catch { continue; }
  const solved = api.solveLevelForValidation(level, validationCap);
  if (!solved.solved || !replay(level, solved.drags)) continue;
  level.parMoves = solved.minimumDrags;
  candidates.push({
    trial,
    level,
    route: solved.drags,
    layout: trial % layouts.length,
    repositionOverhead: solved.repositionOverhead,
    minimumDrags: solved.minimumDrags,
  });
  candidates.sort((left, right) => right.repositionOverhead - left.repositionOverhead
    || left.minimumDrags - right.minimumDrags || left.trial - right.trial);
  if (candidates.length > 12) candidates.length = 12;
  if (trial % 100 === 0) console.log(`trial=${trial} bestOH=${candidates[0]?.repositionOverhead ?? null}`);
  if (trial % 4 === 0 && typeof global.gc === "function") global.gc();
}

const best = candidates[0];
await mkdir(OUTPUT_DIR, { recursive: true });
const artifact = {
  title: "Lv60 all-visible full-grid specialized color/gate search",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: false,
  source_contract: relative(ROOT, CONTRACT).replaceAll("\\", "/"),
  search: { trials, seed_offset: seedOffset, validation_cap: validationCap },
  alternatives: candidates.map(({ level, route, ...summary }) => ({ ...summary, level, route })),
  levels: best ? [{
    level_id: "Lv060",
    target,
    audit: {
      generator: "lv60_single_grid_specialized_search",
      target_reposition_overhead: target.recommended_minimum_reposition_overhead,
      validation_solver_reposition_overhead: best.repositionOverhead,
      trial: best.trial,
      layout: best.layout,
    },
    level: best.level,
    route: best.route,
  }] : [],
};
await writeFile(OUTPUT, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: relative(ROOT, OUTPUT).replaceAll("\\", "/"), best: best ? { trial: best.trial, layout: best.layout, overhead: best.repositionOverhead, drags: best.minimumDrags } : null }, null, 2));
if (!best) process.exitCode = 1;
