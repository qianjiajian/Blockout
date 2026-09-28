import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const truthPaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
const solveArg = process.argv.find((arg) => arg.startsWith("--solve="))?.slice("--solve=".length);
const certifyCandidatesIsolated = process.argv.includes("--certify-candidates-isolated");
const resumeIsolated = process.argv.includes("--resume-isolated");
const concurrencyArg = Number(process.argv.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1]);
const timeoutArg = Number(process.argv.find((arg) => arg.startsWith("--timeout-ms="))?.split("=")[1]);
const heapArg = Number(process.argv.find((arg) => arg.startsWith("--heap-mb="))?.split("=")[1]);
const isolatedPolicy = {
  concurrency: Number.isInteger(concurrencyArg) && concurrencyArg > 0 ? concurrencyArg : 2,
  timeoutMs: Number.isFinite(timeoutArg) && timeoutArg >= 1_000 ? timeoutArg : 180_000,
  heapMb: Number.isInteger(heapArg) && heapArg >= 256 ? heapArg : 2_048,
};
const requestedSolveIds = solveArg
  ? solveArg.split(",").map(Number).filter((value) => Number.isInteger(value) && value > 0)
  : undefined;

const bundle = await build({
  stdin: {
    contents: [
      "export { LEVELS_BEFORE_PALETTE_AWARE_EXIT_CONTRACT as LEVELS } from './src/core/levels.ts';",
      "export { PuzzleModel } from './src/core/PuzzleModel.ts';",
      "export { solveLevelForValidation } from './src/core/levelSolver.ts';",
      "export * from './src/core/paletteAwareExitContracts.ts';",
      "export { buildPaletteAwareExitCandidate } from './src/core/paletteAwareExitContractAudit.ts';",
      "export { auditCompetitorMechanismCountContracts, extractCompetitorMechanismCountContracts } from './src/core/competitorMechanismCountContract.ts';",
    ].join("\n"),
    resolveDir: root,
    sourcefile: "audit-palette-aware-exit-contracts-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  write: false,
  logLevel: "silent",
});
const runtime = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);
const readJson = async (relativePath) => JSON.parse(
  (await readFile(resolve(root, relativePath), "utf8")).replace(/^\uFEFF/, ""),
);
const contracts = (await Promise.all(truthPaths.map(readJson)))
  .flatMap(runtime.extractCompetitorMechanismCountContracts);
const results = runtime.LEVELS.map(runtime.buildPaletteAwareExitCandidate);
const candidateLevels = results.map((result) => result.level);
const certifiedLevels = results.map((result) => (
  runtime.PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS.includes(result.levelId) ? result.level : result.source
));
const exitFields = new Set([
  "ordinaryExitCount",
  "frozenExitCount",
  "frozenExitValues",
  "starExitCount",
  "starFrozenExitCount",
  "starFrozenExitValues",
  "flipDoorCount",
]);
const countIssues = (levels) => runtime.auditCompetitorMechanismCountContracts(levels, contracts)
  .flatMap((record) => record.issues).filter(({ field }) => exitFields.has(field));
const baselineExitIssues = countIssues(runtime.LEVELS);
const candidateExitIssues = countIssues(candidateLevels);
const certifiedExitIssues = countIssues(certifiedLevels);

const grouped = (rows, keyOf) => Object.values(rows.reduce((groups, row) => {
  const key = keyOf(row);
  const group = groups[key] ?? { group: key, count: 0, levelIds: [] };
  group.count += 1;
  group.levelIds.push(row.levelId);
  groups[key] = group;
  return groups;
}, {})).sort((left, right) => right.count - left.count || left.group.localeCompare(right.group));

const replay = (level, drags) => {
  const model = new runtime.PuzzleModel(level);
  model.start();
  model.startCountdown();
  const timedInterval = Math.max(0, ...(level.generators ?? [])
    .filter((generator) => generator.trigger === "time")
    .map((generator) => Math.max(generator.initialDelaySeconds ?? 0, generator.intervalSeconds ?? 1)));
  for (const drag of drags) {
    if (!model.getBlock(drag.blockId) && timedInterval > 0) model.tick(timedInterval);
    model.beginAction();
    for (const [x, y] of drag.path) {
      if (!model.moveBlockStep(drag.blockId, x, y)) return { passed: false, error: `${drag.blockId}: move ${x},${y} rejected` };
    }
    if (drag.exitSide && !model.tryExit(drag.blockId, drag.exitSide).ok) {
      return { passed: false, error: `${drag.blockId}: exit ${drag.exitSide} rejected` };
    }
    if (!model.commitAction()) return { passed: false, error: `${drag.blockId}: commit rejected` };
    if (timedInterval > 0) model.tick(timedInterval);
  }
  const snapshot = model.snapshot();
  return {
    passed: snapshot.complete && !snapshot.blocks.length && !snapshot.queuedBlocks.length,
    complete: snapshot.complete,
    remainingBlocks: snapshot.blocks.length,
    queuedBlocks: snapshot.queuedBlocks.length,
    moves: snapshot.moves,
  };
};

const structuralCandidateIds = results.filter(({ status }) => status === "candidate").map(({ levelId }) => levelId);
const solveIds = requestedSolveIds ?? (certifyCandidatesIsolated
  ? structuralCandidateIds.filter((levelId) => !runtime.PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS.includes(levelId))
  : [...runtime.PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS]);
const resultById = new Map(results.map((result) => [result.levelId, result]));
let solverResults = [];
if (certifyCandidatesIsolated) {
  const isolatedDir = resolve(root, ".codex-temp/palette-aware-exit-certification");
  await mkdir(isolatedDir, { recursive: true });
  let cursor = 0;
  const rows = new Map();
  if (resumeIsolated) {
    for (const levelId of solveIds) {
      try {
        const childOutput = resolve(isolatedDir, `level-${String(levelId).padStart(3, "0")}.json`);
        const childReport = JSON.parse(await readFile(childOutput, "utf8"));
        const result = childReport.solver?.results?.find((row) => row.levelId === levelId);
        if (result) rows.set(levelId, result);
      } catch {
        // Missing or interrupted workers are dispatched below.
      }
    }
    console.error(`[palette-exit] resumed ${rows.size}/${solveIds.length} completed candidates`);
  }
  const pendingIds = solveIds.filter((levelId) => !rows.has(levelId));
  const runOne = (levelId) => new Promise((resolveRun) => {
    const childOutput = resolve(isolatedDir, `level-${String(levelId).padStart(3, "0")}.json`);
    const child = spawn(process.execPath, [
      `--max-old-space-size=${isolatedPolicy.heapMb}`,
      fileURLToPath(import.meta.url),
      `--solve=${levelId}`,
      `--output=${childOutput}`,
    ], { cwd: root, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let timedOut = false;
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-8_000); });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, isolatedPolicy.timeoutMs);
    child.on("close", async (code, signal) => {
      clearTimeout(timer);
      try {
        const childReport = JSON.parse(await readFile(childOutput, "utf8"));
        const result = childReport.solver?.results?.find((row) => row.levelId === levelId);
        if (result) return resolveRun(result);
      } catch {
        // Infrastructure failures are classified below with the process evidence.
      }
      const group = timedOut ? "timeout"
        : /heap out of memory|allocation failed/i.test(stderr) ? "memory-limit" : "child-failed";
      const failure = { levelId, group, termination: group, childExitCode: code, childSignal: signal, stderrTail: stderr };
      await writeFile(childOutput, `${JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        solver: { results: [failure] },
      }, null, 2)}\n`, "utf8");
      resolveRun(failure);
    });
  });
  const worker = async () => {
    while (cursor < pendingIds.length) {
      const levelId = pendingIds[cursor++];
      const row = await runOne(levelId);
      rows.set(levelId, row);
      console.error(`[palette-exit] Lv${levelId} -> ${row.group}`);
    }
  };
  await Promise.all(Array.from({ length: isolatedPolicy.concurrency }, worker));
  solverResults = solveIds.map((levelId) => rows.get(levelId));
} else {
  for (const levelId of solveIds) {
    const candidate = resultById.get(levelId);
    if (!candidate || (candidate.status !== "candidate" && candidate.status !== "unchanged")) {
      solverResults.push({ levelId, group: "not-structural-candidate", status: candidate?.status ?? "missing" });
      continue;
    }
    const solution = runtime.solveLevelForValidation(candidate.level, 20_000);
    const replayResult = solution.solved ? replay(candidate.level, solution.drags) : null;
    const group = solution.solved
      ? replayResult?.passed ? "solved-replay-pass" : "solved-replay-fail"
      : solution.staticUnsatReasons.length ? "static-unsat"
        : solution.termination === "max_states" ? "max-states"
          : solution.termination === "unsupported" ? "unsupported" : "exhausted-search";
    solverResults.push({
      levelId,
      group,
      termination: solution.termination,
      exploredStates: solution.exploredStates,
      minimumDrags: Number.isFinite(solution.minimumDrags) ? solution.minimumDrags : null,
      staticUnsatReasons: solution.staticUnsatReasons,
      unsupportedReasons: solution.unsupportedReasons,
      replay: replayResult,
    });
  }
}

const rejected = results.filter(({ status }) => status === "rejected");
const report = {
  schemaVersion: 1,
  policy: runtime.PALETTE_AWARE_EXIT_CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  summary: {
    levelCount: results.length,
    baselineExitIssueCount: baselineExitIssues.length,
    certifiedExitIssueCount: certifiedExitIssues.length,
    certifiedExitIssueReduction: baselineExitIssues.length - certifiedExitIssues.length,
    candidateExitIssueCount: candidateExitIssues.length,
    exitIssueReduction: baselineExitIssues.length - candidateExitIssues.length,
    structuralCandidateCount: structuralCandidateIds.length,
    structuralRejectedCount: rejected.length,
    unchangedCount: results.filter(({ status }) => status === "unchanged").length,
    excludedLevelIds: results.filter(({ status }) => status === "excluded").map(({ levelId }) => levelId),
    sourceMissingLevelIds: results.filter(({ status }) => status === "source-missing").map(({ levelId }) => levelId),
    safeLevelIds: [...runtime.PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS],
  },
  statusGroups: grouped(results, ({ status }) => status),
  modeGroups: grouped(results.filter(({ mode }) => mode), ({ mode }) => mode),
  structuralCandidateIds,
  rejected: rejected.map(({ levelId, mode, issues }) => ({ levelId, mode, issues })),
  remainingCertifiedExitIssues: certifiedExitIssues,
  remainingStructuralCandidateExitIssues: candidateExitIssues,
  solver: {
    isolatedProcesses: certifyCandidatesIsolated,
    ...(certifyCandidatesIsolated ? { policy: isolatedPolicy } : {}),
    requestedLevelIds: solveIds,
    groups: grouped(solverResults, ({ group }) => group),
    results: solverResults,
  },
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (outputArg) {
  const outputPath = resolve(root, outputArg);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, "utf8");
}
console.log(serialized);
const requiredSafeLevelIds = requestedSolveIds
  ? runtime.PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS.filter((levelId) => solveIds.includes(levelId))
  : runtime.PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS;
if (requiredSafeLevelIds.some((levelId) => (
  !solverResults.some((result) => result.levelId === levelId && result.group === "solved-replay-pass")
))) process.exitCode = 1;
