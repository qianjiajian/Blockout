import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const maxStates = Number(process.env.EXACT_STATES ?? 200_000);

const bundle = await build({
  stdin: {
    contents: `
      import { CHAPTER_ONE_PILOT_LEVELS, CHAPTER_ONE_PILOT_SOURCE_ORDER } from "./src/core/chapterOnePilotLevels.ts";
      import { LEVELS } from "./src/core/levels.ts";
      import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
      import { solveLevelOptimally } from "./src/core/levelSolver.ts";
      import { openingStrategyMetrics } from "./src/core/levelStrategyMetrics.ts";
      import { calibratedBlockOutDifficulty, scoreBlockOutLevel } from "./src/core/blockOutDifficulty.ts";
      export { CHAPTER_ONE_PILOT_LEVELS, CHAPTER_ONE_PILOT_SOURCE_ORDER, LEVELS, PuzzleModel, validateLevel, solveLevelOptimally, openingStrategyMetrics, calibratedBlockOutDifficulty, scoreBlockOutLevel };
    `,
    resolveDir: root,
    sourcefile: "verify-chapter-one-competitor-match.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);

const expected = [
  { cells: 25, blocks: 3, colors: 3, shapes: { SQ2: 3 }, open: 3, frozen: [], drags: 3, overhead: 0 },
  { cells: 35, blocks: 8, colors: 5, shapes: { L3: 2, T4: 1, V3: 5 }, open: 5, frozen: [], drags: 9, overhead: 1 },
  { cells: 36, blocks: 9, colors: 5, shapes: { SQ2: 9 }, open: 5, frozen: [], drags: 10, overhead: 1 },
  { cells: 30, blocks: 18, colors: 8, shapes: { H3: 6, SINGLE: 12 }, open: 8, frozen: [], drags: 21, overhead: 3 },
  { cells: 24, blocks: 20, colors: 3, shapes: { V3: 2, SINGLE: 18 }, open: 3, frozen: [], drags: 20, overhead: 0 },
  { cells: 25, blocks: 21, colors: 4, shapes: { H2: 4, SINGLE: 17 }, open: 1, frozen: [5, 10, 10], drags: 21, overhead: 0 },
  { cells: 40, blocks: 16, colors: 3, shapes: { V2: 12, SQ2: 4 }, open: 1, frozen: [4, 10], drags: 16, overhead: 0 },
  { cells: 33, blocks: 25, colors: 4, shapes: { SQ3: 1, SINGLE: 24 }, open: 2, frozen: [9, 17], drags: 25, overhead: 0 },
  { cells: 40, blocks: 10, colors: 5, shapes: { SQ2: 10 }, open: 1, frozen: [2, 4, 6, 8], drags: 10, overhead: 0 },
  { cells: 48, blocks: 25, colors: 6, shapes: { V3: 4, SQ2: 5, SINGLE: 16 }, open: 1, frozen: [4, 11, 13, 19, 20], drags: 25, overhead: 0 },
];

const signature = (shape) => {
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  const width = Math.max(...shape.map(([x]) => x)) + 1;
  const height = Math.max(...shape.map(([, y]) => y)) + 1;
  if (shape.length === 1) return "SINGLE";
  if (shape.length === 2 && width === 2 && height === 1) return "H2";
  if (shape.length === 2 && width === 1 && height === 2) return "V2";
  if (shape.length === 3 && width === 3 && height === 1) return "H3";
  if (shape.length === 3 && width === 1 && height === 3) return "V3";
  if (shape.length === 3 && width === 2 && height === 2) return "L3";
  if (shape.length === 4 && width === 2 && height === 2) return "SQ2";
  if (shape.length === 4 && width === 3 && height === 2 && cells.has("1,0")) return "T4";
  if (shape.length === 9 && width === 3 && height === 3) return "SQ3";
  return `UNKNOWN:${[...cells].sort().join("|")}`;
};

const histogram = (blocks) => Object.fromEntries(
  [...blocks.reduce((counts, block) => {
    const key = signature(block.shape);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([a], [b]) => a.localeCompare(b)),
);

const sortedObject = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
const assertEqual = (label, actual, wanted) => {
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label}: expected ${JSON.stringify(wanted)}, got ${JSON.stringify(actual)}`);
  }
};

const replay = (level, solution) => {
  const model = new api.PuzzleModel(level);
  for (const drag of solution.drags) {
    model.beginAction();
    for (const [x, y] of drag.path) {
      if (!model.moveBlock(drag.blockId, x, y)) return false;
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) return false;
    if (!model.commitAction()) return false;
  }
  return model.snapshot().complete;
};

const competitorCatalog = JSON.parse(await readFile(
  resolve(root, "deliverables/competitor-board-shapes/blockout-lv001-lv100-board-shapes.json"),
  "utf8",
));

const results = [];
for (const [index, level] of api.CHAPTER_ONE_PILOT_LEVELS.entries()) {
  const sourceIndex = api.CHAPTER_ONE_PILOT_SOURCE_ORDER[index] - 1;
  const target = expected[sourceIndex];
  api.validateLevel(level);
  assertEqual(`Lv${level.id} runtime overlay`, api.LEVELS[index], level);
  assertEqual(`Lv${level.id} cells`, level.playable.length, target.cells);
  assertEqual(`Lv${level.id} blocks`, level.blocks.length, target.blocks);
  assertEqual(`Lv${level.id} colors`, new Set(level.blocks.map((block) => block.color)).size, target.colors);
  assertEqual(`Lv${level.id} shapes`, sortedObject(histogram(level.blocks)), sortedObject(target.shapes));
  assertEqual(`Lv${level.id} open gates`, level.gates.filter((gate) => !(gate.frozen > 0)).length, target.open);
  assertEqual(
    `Lv${level.id} frozen gates`,
    level.gates.filter((gate) => gate.frozen > 0).map((gate) => gate.frozen).sort((a, b) => a - b),
    target.frozen,
  );
  assertEqual(`Lv${level.id} shutters`, level.shutters ?? [], []);
  assertEqual(`Lv${level.id} layered blocks`, level.blocks.filter((block) => block.layers?.length).length, 0);

  const ownMask = Array.from({ length: level.height }, (_, y) => (
    Array.from({ length: level.width }, (_, x) => (
      level.playable.some(([cellX, cellY]) => cellX === x && cellY === y) ? "#" : "."
    )).join("")
  ));
  const competitorMask = competitorCatalog.levels[sourceIndex].playable_mask;
  const fullRectangleLocked = level.playable.length === level.width * level.height;
  if (!fullRectangleLocked && JSON.stringify(ownMask) === JSON.stringify(competitorMask)) {
    throw new Error(`Lv${level.id} board silhouette duplicates the competitor`);
  }

  const solution = api.solveLevelOptimally(level, maxStates);
  if (!solution.solved) throw new Error(`Lv${level.id} is unsolved after ${solution.exploredStates} states`);
  assertEqual(`Lv${level.id} exact drags`, solution.minimumDrags, target.drags);
  assertEqual(`Lv${level.id} exact overhead`, solution.repositionOverhead, target.overhead);
  if (!replay(level, solution)) throw new Error(`Lv${level.id} exact route failed PuzzleModel replay`);

  if (level.id === 10) {
    assertEqual(
      "Lv10 frozen block values",
      level.blocks.filter((block) => block.frozen > 0).map((block) => block.frozen).sort((a, b) => a - b),
      [11, 12, 13, 19, 19, 19, 21, 22, 22],
    );
    assertEqual(
      "Lv10 opening normal colors",
      new Set(level.blocks.filter((block) => !(block.frozen > 0)).map((block) => block.color)).size,
      3,
    );
  }

  results.push({
    id: level.id,
    sourceId: sourceIndex + 1,
    size: `${level.width}x${level.height}`,
    cells: level.playable.length,
    blocks: level.blocks.length,
    colors: new Set(level.blocks.map((block) => block.color)).size,
    shapes: histogram(level.blocks),
    exactDrags: solution.minimumDrags,
    repositionOverhead: solution.repositionOverhead,
    clearLoad: solution.clearLoad,
    gridSteps: solution.gridSteps,
    turns: solution.turns,
    difficulty: api.calibratedBlockOutDifficulty(api.scoreBlockOutLevel(level).score),
    exploredStates: solution.exploredStates,
  });
}

const audit = {
  scope: "Block Out original Lv1-Lv10 exact competitor-composition redesign",
  source_sha256: "9C6182035F26B3CF1F7F9CF50142E064CD52D27939ED415EF42D630E7A7C0049",
  summary: {
    level_count: results.length,
    all_exact_solved: true,
    all_exact_replays_passed: true,
    exact_drags: results.reduce((sum, level) => sum + level.exactDrags, 0),
    reposition_overhead: results.reduce((sum, level) => sum + level.repositionOverhead, 0),
  },
  levels: results.map((result, index) => ({
    level_id: result.id,
    source_level_id: result.sourceId,
    name: api.CHAPTER_ONE_PILOT_LEVELS[index].name,
    board: { width: api.CHAPTER_ONE_PILOT_LEVELS[index].width, height: api.CHAPTER_ONE_PILOT_LEVELS[index].height },
    playable_cells: result.cells,
    total_blocks: result.blocks,
    color_count: result.colors,
    shape_histogram: result.shapes,
    calibrated_difficulty: result.difficulty,
    exact: {
      solved: true,
      drags: result.exactDrags,
      clear_load: result.clearLoad,
      reposition_overhead: result.repositionOverhead,
      grid_steps: result.gridSteps,
      turns: result.turns,
      explored_states: result.exploredStates,
      replay: true,
    },
  })),
};
const auditDirectory = resolve(root, "playtest-results/experiments/lv1-10-competitor-composition");
await mkdir(auditDirectory, { recursive: true });
await writeFile(resolve(auditDirectory, "lv1-10-final-audit.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  auditPath: "playtest-results/experiments/lv1-10-competitor-composition/lv1-10-final-audit.json",
  maxStates,
  levels: results,
  campaignMechanics: {
    intros: api.LEVELS.filter((level) => level.featureIntro).map((level) => [level.id, level.featureIntro.kind]),
    firstLayer: api.LEVELS.find((level) => level.blocks.some((block) => (block.layers?.length ?? 0) > 1))?.id,
    firstShutter: api.LEVELS.find((level) => level.shutters?.some((shutter) => shutter.skin === "shutter"))?.id,
    firstFrozenBlock: api.LEVELS.find((level) => level.blocks.some((block) => (block.frozen ?? 0) > 0))?.id,
    firstFrozenGate: api.LEVELS.find((level) => level.gates.some((gate) => (gate.frozen ?? 0) > 0))?.id,
    chapterOneOpeningMetrics: api.LEVELS.slice(0, 10).map((level) => ({ id: level.id, ...api.openingStrategyMetrics(level) })),
  },
}, null, 2));
