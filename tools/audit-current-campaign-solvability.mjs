import { build } from "esbuild";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = resolve(root, process.env.SOLVER_AUDIT_OUTPUT ?? "playtest-results/current-campaign-solver-2026-09-18");
const workerPath = resolve(outputDir, ".current-campaign-solver-worker.mjs");
const jsonlPath = resolve(outputDir, "results.jsonl");
const jsonPath = resolve(outputDir, "report.json");
const markdownPath = resolve(outputDir, "report.md");
const logPath = resolve(outputDir, "run.log");
const fromLevel = Number(process.env.SOLVER_LEVEL_FROM ?? 1);
const toLevel = Number(process.env.SOLVER_LEVEL_TO ?? 200);
const maxStates = Number(process.env.SOLVER_MAX_STATES ?? 120_000);
const timeoutMs = Number(process.env.SOLVER_TIMEOUT_MS ?? 30_000);
const concurrency = Math.max(1, Math.min(4, Number(process.env.SOLVER_CONCURRENCY ?? 3)));
const requestedLevelIds = process.env.SOLVER_LEVEL_IDS
  ? process.env.SOLVER_LEVEL_IDS.split(",").map((value) => Number(value.trim())).filter(Number.isInteger)
  : null;

if (!Number.isInteger(fromLevel) || !Number.isInteger(toLevel) || fromLevel < 1 || toLevel > 200 || fromLevel > toLevel) {
  throw new Error(`Invalid level range ${fromLevel}-${toLevel}`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(jsonlPath, "", "utf8");
await writeFile(logPath, "", "utf8");

const workerSource = String.raw`
  import { parentPort, workerData } from "node:worker_threads";
  import { createHash } from "node:crypto";
  import { LEVELS } from "./src/core/levels.ts";
  import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
  import { solveLevelForValidation } from "./src/core/levelSolver.ts";

  const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    }
    return value;
  };
  const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

  if (workerData.mode === "metadata") {
    parentPort.postMessage({
      campaignSemanticSha256: sha256(JSON.stringify(canonical(LEVELS))),
      levelCount: LEVELS.length,
      levelIds: LEVELS.map((level) => level.id),
    });
  } else {
    const replayRoute = (level, drags) => {
      const model = new PuzzleModel(level);
      model.start();
      model.startCountdown();
      const timedIntervals = (level.generators ?? [])
        .filter((generator) => generator.trigger === "time")
        .map((generator) => Math.max(generator.intervalSeconds ?? 1, generator.initialDelaySeconds ?? 0));
      const tickDuration = timedIntervals.length ? Math.max(...timedIntervals) : 0;
      for (let dragIndex = 0; dragIndex < drags.length; dragIndex += 1) {
        const drag = drags[dragIndex];
        if (!model.getBlock(drag.blockId) && tickDuration > 0) model.tick(tickDuration);
        if (!model.getBlock(drag.blockId)) {
          return { ok: false, failure: "missing_block", detail: "drag " + (dragIndex + 1) + ": " + drag.blockId + " is not active" };
        }
        model.beginAction();
        for (let pathIndex = 0; pathIndex < (drag.path ?? []).length; pathIndex += 1) {
          const [x, y] = drag.path[pathIndex];
          const before = model.getBlock(drag.blockId);
          const distance = before ? Math.abs(before.x - x) + Math.abs(before.y - y) : 0;
          const moved = distance === 1
            ? model.moveBlockStep(drag.blockId, x, y)
            : model.moveBlock(drag.blockId, x, y);
          const after = model.getBlock(drag.blockId);
          if (!moved || !after || after.x !== x || after.y !== y) {
            return {
              ok: false,
              failure: "move_rejected",
              detail: "drag " + (dragIndex + 1) + " step " + (pathIndex + 1) + ": " + drag.blockId + " -> " + x + "," + y,
            };
          }
        }
        if (drag.exitSide) {
          const status = model.exitAttemptStatus(drag.blockId, drag.exitSide);
          const result = model.tryExit(drag.blockId, drag.exitSide);
          if (!result.ok) {
            return {
              ok: false,
              failure: "exit_rejected",
              detail: "drag " + (dragIndex + 1) + ": " + drag.blockId + " " + drag.exitSide + " (" + status + ")",
            };
          }
        }
        if (!model.commitAction()) {
          return { ok: false, failure: "no_mutation", detail: "drag " + (dragIndex + 1) + " did not mutate the puzzle" };
        }
        if (tickDuration > 0) model.tick(tickDuration);
        if (model.snapshot().failed) {
          return { ok: false, failure: "runtime_deadline", detail: "drag " + (dragIndex + 1) + ": timer or bomb deadline failed" };
        }
      }
      const snapshot = model.snapshot();
      return snapshot.complete
        ? { ok: true, moves: snapshot.moves, cleared: snapshot.cleared }
        : { ok: false, failure: "incomplete", detail: snapshot.blocks.length + " active + " + snapshot.queuedBlocks.length + " queued remain" };
    };

    const level = LEVELS.find((candidate) => candidate.id === workerData.levelId);
    if (!level) throw new Error("Missing level " + workerData.levelId);
    validateLevel(level);
    const levelSemanticSha256 = sha256(JSON.stringify(canonical(level)));
    const startedAt = performance.now();
    const solver = solveLevelForValidation(level, workerData.maxStates);
    const replay = solver.solved ? replayRoute(level, solver.drags) : null;
    parentPort.postMessage({
      levelId: level.id,
      name: level.name,
      levelSemanticSha256,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      solver,
      replay,
    });
  }
`;

const bundle = await build({
  stdin: {
    contents: workerSource,
    resolveDir: root,
    sourcefile: "current-campaign-solvability-worker.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
await writeFile(workerPath, bundle.outputFiles[0].text, "utf8");

const log = async (line) => {
  const text = `${new Date().toISOString()} ${line}`;
  console.log(text);
  await appendFile(logPath, `${text}\n`, "utf8");
};

const runWorker = (workerData, wallTimeoutMs) => new Promise((resolveResult) => {
  const startedAt = Date.now();
  const worker = new Worker(workerPath, { workerData });
  let settled = false;
  const settle = (result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolveResult({ ...result, wallDurationMs: Date.now() - startedAt });
  };
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    worker.terminate().catch(() => {});
    resolveResult({
      levelId: workerData.levelId,
      wallTimeout: true,
      error: `wall-clock timeout after ${wallTimeoutMs}ms`,
      wallDurationMs: Date.now() - startedAt,
    });
  }, wallTimeoutMs);
  worker.once("message", settle);
  worker.once("error", (error) => settle({
    levelId: workerData.levelId,
    workerError: true,
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  }));
  worker.once("exit", (code) => {
    if (!settled && code !== 0) settle({
      levelId: workerData.levelId,
      workerError: true,
      error: `worker exited with code ${code}`,
    });
  });
});

const metadata = await runWorker({ mode: "metadata" }, 30_000);
if (metadata.workerError || metadata.wallTimeout) throw new Error(metadata.error);
if (metadata.levelCount !== 200 || metadata.levelIds.some((id, index) => id !== index + 1)) {
  throw new Error(`Expected contiguous Lv1-200, received ${metadata.levelCount} levels`);
}

const taskLevelIds = requestedLevelIds ?? Array.from(
  { length: toLevel - fromLevel + 1 },
  (_, index) => fromLevel + index,
);
if (!taskLevelIds.length || taskLevelIds.some((levelId) => levelId < 1 || levelId > 200)) {
  throw new Error(`Invalid SOLVER_LEVEL_IDS: ${process.env.SOLVER_LEVEL_IDS ?? ""}`);
}
await log(`BEGIN campaign=${metadata.campaignSemanticSha256} levels=${taskLevelIds.join(",")} maxStates=${maxStates} timeoutMs=${timeoutMs} concurrency=${concurrency}`);
const tasks = taskLevelIds.map((levelId) => ({ mode: "solve", levelId, maxStates }));
const rawResults = new Array(tasks.length);
let cursor = 0;
const lanes = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= tasks.length) return;
    const task = tasks[index];
    const result = await runWorker(task, timeoutMs);
    rawResults[index] = result;
    await appendFile(jsonlPath, `${JSON.stringify(result)}\n`, "utf8");
    const detail = result.wallTimeout || result.workerError
      ? `ERROR ${result.error}`
      : `${result.solver.termination} states=${result.solver.exploredStates} replay=${result.replay?.ok ?? "n/a"}`;
    await log(`Lv${String(task.levelId).padStart(3, "0")} ${detail} wall=${result.wallDurationMs}ms`);
  }
});
await Promise.all(lanes);

const rows = rawResults.map((result) => {
  const solved = Boolean(result?.solver?.solved && result?.replay?.ok);
  const termination = result?.wallTimeout
    ? "wall_timeout"
    : result?.workerError
      ? "worker_error"
      : result?.solver?.termination ?? "unknown";
  const provenUnsat = !solved && termination === "exhausted" && !(result?.solver?.unsupportedReasons?.length);
  return {
    level_id: result.levelId,
    name: result.name ?? null,
    level_semantic_sha256: result.levelSemanticSha256 ?? null,
    status: solved ? "solved" : provenUnsat ? "proven_unsat" : "inconclusive",
    proof_kind: solved
      ? "solveLevelForValidation route replayed through PuzzleModel"
      : provenUnsat
        ? "supported solver state space exhausted"
        : "bounded search did not establish either outcome",
    termination,
    explored_states: result?.solver?.exploredStates ?? null,
    minimum_drags: solved ? result.solver.minimumDrags : null,
    clear_load: result?.solver?.clearLoad ?? null,
    reposition_overhead: solved ? result.solver.repositionOverhead : null,
    grid_steps: solved ? result.solver.gridSteps : null,
    turns: solved ? result.solver.turns : null,
    route: solved ? result.solver.drags : null,
    puzzle_model_replay: result?.replay ?? null,
    unsupported_reasons: result?.solver?.unsupportedReasons ?? [],
    duration_ms: result?.durationMs ?? null,
    wall_duration_ms: result?.wallDurationMs ?? null,
    error: result?.error ?? result?.replay?.detail ?? null,
  };
});

const count = (status) => rows.filter((row) => row.status === status).length;
const sourceHashes = {};
for (const relativePath of ["src/core/levels.ts", "src/core/levelSolver.ts", "src/core/PuzzleModel.ts"]) {
  sourceHashes[relativePath] = createHash("sha256").update(await readFile(resolve(root, relativePath))).digest("hex").toUpperCase();
}
const report = {
  generated_at: new Date().toISOString(),
  scope: { from_level: fromLevel, to_level: toLevel, level_ids: taskLevelIds, level_count: rows.length },
  campaign_semantic_sha256: metadata.campaignSemanticSha256,
  source_sha256: sourceHashes,
  policy: {
    solved: "solver produced a route and current PuzzleModel replay completed",
    proven_unsat: "supported solver state space returned exhausted",
    inconclusive: "max_states, wall_timeout, worker_error, unsupported, or replay mismatch; never treated as unsat",
    time_limit: "spatial/mechanism completion witness; authored countdown feasibility is not separately certified",
  },
  settings: { max_states: maxStates, wall_timeout_ms: timeoutMs, concurrency },
  summary: {
    solved: count("solved"),
    proven_unsat: count("proven_unsat"),
    inconclusive: count("inconclusive"),
    total: rows.length,
  },
  levels: rows,
};
await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const tableRows = rows.map((row) => `| ${row.level_id} | ${row.status} | ${row.termination} | ${row.explored_states ?? "—"} | ${row.minimum_drags ?? "—"} | ${row.reposition_overhead ?? "—"} | ${(row.error ?? row.unsupported_reasons.join("；")) || "—"} |`);
const markdown = `# 当前正式 Lv${fromLevel}–${toLevel} 求解审计\n\n` +
  `- Campaign semantic SHA-256：\`${metadata.campaignSemanticSha256}\`\n` +
  `- solved：${report.summary.solved}\n` +
  `- proven_unsat：${report.summary.proven_unsat}\n` +
  `- inconclusive：${report.summary.inconclusive}\n` +
  `- 配置：每关最多 ${maxStates} 状态 / ${timeoutMs}ms，成功路线必须通过当前 PuzzleModel 回放。\n\n` +
  `| Lv | 状态 | 终止原因 | 状态数 | 拖数 | 必要腾挪 | 备注 |\n|---:|---|---|---:|---:|---:|---|\n${tableRows.join("\n")}\n`;
await writeFile(markdownPath, markdown, "utf8");
await log(`DONE solved=${report.summary.solved} proven_unsat=${report.summary.proven_unsat} inconclusive=${report.summary.inconclusive}`);
await rm(workerPath, { force: true });
console.log(JSON.stringify({ outputDir, campaignSemanticSha256: metadata.campaignSemanticSha256, summary: report.summary }, null, 2));
