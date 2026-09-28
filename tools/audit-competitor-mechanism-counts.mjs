import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];
const comparisonPath = process.argv.find((argument) => argument.startsWith("--comparison="))?.slice("--comparison=".length)
  ?? process.env.BLOCK_OUT_COMPARISON
  ?? "deliverables/competitor-vs-ours-lv001-200-current/comparison.json";
const includeDetails = process.argv.includes("--details");

const readJson = async (relativePath) => JSON.parse(
  (await readFile(resolve(root, relativePath), "utf8")).replace(/^\uFEFF/, ""),
);

const bundle = await build({
  stdin: {
    contents: [
      "export { LEVELS } from './src/core/levels.ts';",
      "export {",
      "  auditCompetitorMechanismCountContracts,",
      "  COMPETITOR_MECHANISM_COUNT_CONTRACT_VERSION,",
      "  extractCompetitorMechanismCountContracts,",
      "} from './src/core/competitorMechanismCountContract.ts';",
    ].join("\n"),
    resolveDir: root,
    sourcefile: "audit-competitor-mechanism-counts-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
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

const [truthDocuments, comparison] = await Promise.all([
  Promise.all(truthPaths.map(readJson)),
  readJson(comparisonPath),
]);
const contracts = truthDocuments.flatMap(runtime.extractCompetitorMechanismCountContracts);
if (contracts.length !== 200 || new Set(contracts.map(({ levelId }) => levelId)).size !== 200) {
  throw new Error(`Competitor truth must yield 200 unique contracts, received ${contracts.length}`);
}
if (!Array.isArray(runtime.LEVELS) || runtime.LEVELS.length !== 200) {
  throw new Error(`Final LEVELS must contain 200 levels, received ${runtime.LEVELS?.length ?? "invalid"}`);
}

const records = runtime.auditCompetitorMechanismCountContracts(runtime.LEVELS, contracts);
const runtimeIssues = records.flatMap((record) => record.issues);
const runtimeFailureLevelIds = records.filter((record) => record.issues.length).map((record) => record.levelId);
const sourceMissingLevelIds = records.filter((record) => record.sourceMissing).map((record) => record.levelId);
const comparisonById = new Map((comparison.levels ?? []).map((level) => [level.level, level]));
const comparisonGeneratorQueueDrift = [];
for (const contract of contracts) {
  const expected = contract.facts.generatorQueueCounts;
  if (!Array.isArray(expected)) continue;
  const level = comparisonById.get(contract.levelId);
  const actual = level?.mechanism?.raw?.competitor?.generatorQueueLengths;
  if (JSON.stringify(expected) === JSON.stringify(actual)) continue;
  comparisonGeneratorQueueDrift.push({ levelId: contract.levelId, expected, actual: actual ?? "missing" });
}

const byField = Object.values(runtimeIssues.reduce((result, issue) => {
  const row = result[issue.field] ?? { field: issue.field, mismatchLevelIds: [] };
  row.mismatchLevelIds.push(issue.levelId);
  result[issue.field] = row;
  return result;
}, {}));
const allFailureLevelIds = [...new Set([
  ...runtimeFailureLevelIds,
  ...comparisonGeneratorQueueDrift.map(({ levelId }) => levelId),
])].sort((left, right) => left - right);

const report = {
  schemaVersion: 1,
  policy: runtime.COMPETITOR_MECHANISM_COUNT_CONTRACT_VERSION,
  status: allFailureLevelIds.length ? "FAIL" : "PASS",
  inputs: { truthPaths, comparisonPath },
  summary: {
    levelCount: records.length,
    sourceMissingLevelIds,
    comparableFactCount: records.reduce((sum, record) => sum + record.comparableFields.length, 0),
    runtimeIssueCount: runtimeIssues.length,
    runtimeFailureLevelIds,
    comparisonGeneratorQueueDriftLevelIds: comparisonGeneratorQueueDrift.map(({ levelId }) => levelId),
    allFailureLevelIds,
  },
  policyNotes: [
    "Only quantities explicitly known in truth are compared; null/unclear facts remain unknown.",
    "Generator queues accept both queue_length and queue_count and never coerce an unknown queue to zero.",
    "Player-facing shutters are skin=shutter or unskinned positive-count panels; internal staging/lift/frame metadata is excluded.",
    "A covered cohort is the runtime block set directly bound to that player-facing shutter id.",
    "Partial source cover cohorts are checked as count:cohort multiset requirements; unknown peer covers stay unasserted.",
  ],
  byField,
  comparisonGeneratorQueueDrift,
  ...(includeDetails ? { runtimeIssues } : { runtimeIssueSamples: runtimeIssues.slice(0, 25) }),
};

console.log(JSON.stringify(report, null, 2));
if (allFailureLevelIds.length) process.exitCode = 1;
