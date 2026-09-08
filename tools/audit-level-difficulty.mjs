import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ids = (process.env.LEVEL_IDS ?? "1,2,3,4,5,6,7,8,9,10")
  .split(",")
  .map(Number)
  .filter((id) => Number.isInteger(id) && id >= 1 && id <= 100);
const runOptimal = process.env.LEVEL_AUDIT_OPTIMAL === "1";
const includeSpec = process.env.LEVEL_AUDIT_SPEC === "1";
const positionReportPaths = (process.env.LEVEL_POSITION_REPORTS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => resolve(root, entry));
const candidatePositions = new Map();
for (const reportPath of positionReportPaths) {
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  for (const level of report.levels ?? []) candidatePositions.set(level.levelId, level.positions);
}

const bundle = await build({
  stdin: {
    contents: `
      import { LEVELS } from "./src/core/levels.ts";
      import { scoreBlockOutLevel } from "./src/core/blockOutDifficulty.ts";
      import { solveLevelForValidation, solveLevelOptimally } from "./src/core/levelSolver.ts";
      import { openingStrategyMetrics } from "./src/core/levelStrategyMetrics.ts";
      export { LEVELS, scoreBlockOutLevel, solveLevelForValidation, solveLevelOptimally, openingStrategyMetrics };
    `,
    resolveDir: root,
    sourcefile: "level-difficulty-audit-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
const {
  LEVELS,
  scoreBlockOutLevel,
  solveLevelForValidation,
  solveLevelOptimally,
  openingStrategyMetrics,
} = await import(moduleUrl);

const CALIBRATION = { slope: 0.826935, intercept: 13.161835 };
const round = (value, digits = 2) => Number(value.toFixed(digits));
const rows = ids.map((id) => {
  const source = LEVELS[id - 1];
  const positions = candidatePositions.get(id);
  const level = positions ? {
    ...source,
    blocks: source.blocks.map((block) => {
      const position = positions[block.id];
      if (!position) throw new Error(`Candidate for Lv${id} is missing block ${block.id}`);
      return { ...block, x: position[0], y: position[1] };
    }),
  } : source;
  if (positions && Object.keys(positions).length !== source.blocks.length) {
    throw new Error(`Candidate for Lv${id} has ${Object.keys(positions).length} positions for ${source.blocks.length} blocks`);
  }
  const score = scoreBlockOutLevel(level);
  const validation = solveLevelForValidation(level);
  const optimal = runOptimal ? solveLevelOptimally(level) : undefined;
  return {
    levelId: id,
    blockCount: level.blocks.length,
    clearLoad: validation.clearLoad,
    rawScore: score.score,
    calibratedScore: round(CALIBRATION.intercept + CALIBRATION.slope * score.score),
    scoreComponents: score.components,
    validation: {
      solved: validation.solved,
      drags: validation.minimumDrags,
      repositionOverhead: validation.repositionOverhead,
      turns: validation.turns,
      gridSteps: validation.gridSteps,
      exploredStates: validation.exploredStates,
      firstDrag: validation.drags[0] ?? null,
    },
    optimal: optimal ? {
      solved: optimal.solved,
      drags: optimal.minimumDrags,
      repositionOverhead: optimal.repositionOverhead,
      turns: optimal.turns,
      gridSteps: optimal.gridSteps,
      exploredStates: optimal.exploredStates,
      firstDrag: optimal.drags[0] ?? null,
    } : undefined,
    opening: openingStrategyMetrics(level),
    onboardingHint: level.onboardingHint ?? null,
    strategyNudge: level.strategyNudge ?? null,
    evidence: score.evidence,
    spec: includeSpec ? {
      width: level.width,
      height: level.height,
      playable: level.playable,
      gates: level.gates,
      blocks: level.blocks,
    } : undefined,
  };
});

const output = `${JSON.stringify(rows, null, 2)}\n`;
if (process.env.LEVEL_AUDIT_OUTPUT) {
  await writeFile(resolve(root, process.env.LEVEL_AUDIT_OUTPUT), output, "utf8");
}
console.log(output.trimEnd());
