import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import ts from "typescript";
import { transform } from "esbuild";

const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, "").split("=")));
if (!args.baseline || !args.output) throw new Error("Use --baseline=<original ColorEscapeGame.ts> --output=<report.json>");
const current = resolve("src/game/ColorEscapeGame.ts");

// Compile the unchanged method text and storage-only helpers from each version.
// The harness has no browser profile, native storage, level loading or renderer.
async function harness(path) {
  const text = await readFile(path, "utf8");
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const helperNames = new Set(["isPlainRecord", "canonicalStorageValue", "storageValuesEqual",
    "trustedStorageBaseline", "storedValueBaseline", "storageReadMatchesBaseline"]);
  const helpers = ast.statements.filter(node => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(declaration => helperNames.has(declaration.name.getText(ast))));
  const game = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "ColorEscapeGame");
  const methods = game.members.filter(node => ts.isMethodDeclaration(node)
    && ["establishStorageBaseline", "persist", "persistVerified"].includes(node.name.getText(ast)));
  if (helpers.length !== helperNames.size || methods.length !== 3) throw new Error(`Cannot extract complete storage methods: ${path}`);
  const source = `const SAVE_KEY = "fixture-only";\n${helpers.map(node => node.getText(ast)).join("\n")}\n`
    + `export class StorageHarness { ${methods.map(node => node.getText(ast)).join("\n")} }`;
  const built = await transform(source, { loader: "ts", format: "esm", target: "es2022" });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.code).toString("base64")}`)).StorageHarness;
}

const versions = { before: await harness(resolve(args.baseline)), after: await harness(current) };
const levelRecord = value => Object.fromEntries(Array.from({ length: 200 }, (_, index) => [String(index + 1), value]));
const save = { schemaVersion: 1, highestLevel: 200, currentLevel: 101, coins: 99999,
  sound: true, music: true, haptic: false, language: "zh-CN",
  bestStars: levelRecord(3), bestMoves: levelRecord(49),
  rewardedLevels: Array.from({ length: 200 }, (_, i) => i + 1),
  collectionProgress: { version: 1, inspiration: 777,
    seenItemIds: Array.from({ length: 200 }, (_, i) => `level-${i + 1}`), restoredMasterpieceIds: [], claimedMilestoneIds: [] },
  dailyChallenge: { dayKey: "2026-10-14", completedDifficulties: [1, 2], attempts: 3 },
  mainlineRanking: { weeklyStars: 5, lastObservedMs: 1791950400000 },
  boosters: { time: 3, rocket: 4, pulse: 2 }, playerProfile: { id: "fixture", name: "Synthetic fixture" },
};
const candidate = { ...save, coins: save.coins + 1 };
const third = { ...save, coins: save.coins + 2 };
const old = { schemaVersion: 1, highestLevel: 200, coins: 99999 };
const scenarios = ["stable-startup", "migration-startup", "ordinary-success", "failure-third-value", "failure-written"];
function run(Type, scenario, iterations) {
  const game = new Type();
  let raw = JSON.stringify(save), reads = 0, writes = 0;
  const canonical = value => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  game.save = save; game.storageBaselineReady = true; game.storageReadAttempts = 0;
  game.durableStorageBaseline = { status: "ok", value: canonical(save) };
  game.host = {
    storageSet: (_key, value) => {
      writes++;
      if (scenario === "failure-third-value") return false;
      raw = JSON.stringify(value);
      return scenario !== "failure-written";
    },
    storageRead: () => { reads++; return { status: "ok", value: JSON.parse(raw) }; },
  };
  const reset = JSON.stringify(scenario === "migration-startup" ? old : scenario === "failure-third-value" ? third : save);
  let result;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    raw = reset;
    result = scenario.endsWith("startup") ? game.establishStorageBaseline(game.host.storageRead(), save)
      : scenario === "ordinary-success" ? game.persist(candidate) : game.persistVerified(candidate, save);
  }
  const elapsedMs = performance.now() - start;
  const expected = scenario === "failure-third-value" ? "unknown" : scenario === "failure-written" ? "committed" : true;
  if (result !== expected) throw new Error(`${scenario}: ${result} !== ${expected}`);
  return { elapsedMs, reads, writes, result };
}
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const iterations = 1000, rounds = 5;
const report = {
  generatedAt: new Date().toISOString(), baseline: resolve(args.baseline), current,
  fixture: { kind: "synthetic 200-level storage payload; methods only, no real player storage", utf8Bytes: Buffer.byteLength(JSON.stringify(save)), iterations, rounds },
  scenarios: {},
};
for (const scenario of scenarios) {
  for (const Type of Object.values(versions)) run(Type, scenario, 50);
  const samples = { before: [], after: [] };
  for (let round = 0; round < rounds; round++) {
    for (const version of round % 2 ? ["after", "before"] : ["before", "after"]) {
      samples[version].push(run(versions[version], scenario, iterations));
    }
  }
  const before = median(samples.before.map(sample => sample.elapsedMs));
  const after = median(samples.after.map(sample => sample.elapsedMs));
  report.scenarios[scenario] = { beforeMedianMs: before, afterMedianMs: after,
    medianReductionPercent: (1 - after / before) * 100,
    beforeIO: { reads: samples.before[0].reads, writes: samples.before[0].writes },
    afterIO: { reads: samples.after[0].reads, writes: samples.after[0].writes }, samples };
}
await writeFile(resolve(args.output), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ fixture: report.fixture, scenarios: Object.fromEntries(Object.entries(report.scenarios)
  .map(([key, { samples, ...summary }]) => [key, summary])) }, null, 2));
