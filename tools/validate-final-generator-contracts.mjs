import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];
const bundle = await build({
  stdin: {
    contents: [
      "export { LEVELS } from './src/core/levels.ts';",
      "export { validateLevel } from './src/core/PuzzleModel.ts';",
      "export { extractGeneratorTruthContracts, finalGeneratorPlacementIssues, finalGeneratorTruthIssues } from './src/core/finalGeneratorContracts.ts';",
      "export { generatorSpawnAlignmentIssues } from './src/core/generatorSpawnAlignmentRepairs.ts';",
    ].join("\n"),
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
let runtime;
try {
  runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
} catch (error) {
  console.error(`Failed to load final LEVELS: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
const truths = await Promise.all(truthPaths.map(async (path) => (
  JSON.parse((await readFile(resolve(root, path), "utf8")).replace(/^\uFEFF/, ""))
)));
const contracts = truths.flatMap(runtime.extractGeneratorTruthContracts);
const issues = [];

if (contracts.length !== 200 || new Set(contracts.map(({ levelId }) => levelId)).size !== 200) {
  issues.push(`canonical truth must yield 200 unique level contracts, received ${contracts.length}`);
}
for (const level of runtime.LEVELS) {
  try {
    runtime.validateLevel(level);
  } catch (error) {
    issues.push(`Lv${level.id}: validateLevel failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  issues.push(...runtime.finalGeneratorPlacementIssues(level));
  issues.push(...runtime.generatorSpawnAlignmentIssues(level));
}
issues.push(...runtime.finalGeneratorTruthIssues(runtime.LEVELS, contracts));

const generatorLevels = runtime.LEVELS.filter((level) => level.generators?.length);
const machineCount = generatorLevels.reduce((sum, level) => sum + level.generators.length, 0);
const queuePieceCount = generatorLevels.reduce((sum, level) => sum
  + level.generators.reduce((queueSum, generator) => queueSum + generator.queueBlockIds.length, 0), 0);
const result = {
  status: issues.length ? "FAIL" : "PASS",
  level_count: runtime.LEVELS.length,
  generator_level_count: generatorLevels.length,
  generator_count: machineCount,
  generator_queue_piece_count: queuePieceCount,
  truth_paths: truthPaths,
  issues,
};
console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exitCode = 1;
