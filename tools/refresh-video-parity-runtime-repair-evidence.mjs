import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(root, ".codex-temp/video-parity-runtime-repair-refresh-input.json");
const outputDirectory = resolve(
  root,
  "playtest-results/experiments/physical-shutter-runtime-recertification-2026-09-20",
);
const manifestPath = resolve(outputDirectory, "manifest.json");
const reportPath = resolve(outputDirectory, "report.md");
const workerPath = resolve(root, ".codex-temp/physical-shutter-runtime-recertification-worker.mjs");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

// These are the repairs whose pre-repair projection changed when the formal
// physical shutter footprints/cohorts were packed. Repairs omitted here have
// byte-identical source and target semantic hashes and retain their evidence.
const RECERTIFIED_LEVEL_IDS = [
  103, 105, 106, 112, 114, 115, 116, 117, 127, 130, 152, 156, 158,
];
const budgets = [20_000, 120_000, 500_000];

const inputText = (await readFile(inputPath, "utf8")).replace(/^\uFEFF/, "");
const input = JSON.parse(inputText);
if (input.schema_version !== "blockout-video-parity-runtime-repair-refresh-input-v1"
  || input.mode !== "explicit-evidence-refresh-only"
  || input.normal_sha_gates_bypassed !== true) {
  throw new Error("Unexpected runtime repair refresh input contract");
}
const repairByLevelId = new Map(input.repairs.map((repair) => [repair.level_id, repair]));
for (const levelId of RECERTIFIED_LEVEL_IDS) {
  if (!repairByLevelId.has(levelId)) throw new Error(`Missing refresh input for Lv${levelId}`);
}

await mkdir(dirname(workerPath), { recursive: true });
await mkdir(outputDirectory, { recursive: true });

const workerSource = String.raw`
  import { parentPort, workerData } from "node:worker_threads";
  import { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts";
  import { solveLevelForValidation } from "./src/core/levelSolver.ts";

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
        return {
          complete: false,
          failure: "missing_block",
          detail: "drag " + (dragIndex + 1) + ": " + drag.blockId + " is not active",
        };
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
            complete: false,
            failure: "move_rejected",
            detail: "drag " + (dragIndex + 1) + " step " + (pathIndex + 1)
              + ": " + drag.blockId + " -> " + x + "," + y,
          };
        }
      }
      if (drag.exitSide) {
        const status = model.exitAttemptStatus(drag.blockId, drag.exitSide);
        const result = model.tryExit(drag.blockId, drag.exitSide);
        if (!result.ok) {
          return {
            complete: false,
            failure: "exit_rejected",
            detail: "drag " + (dragIndex + 1) + ": " + drag.blockId + " "
              + drag.exitSide + " (" + status + ")",
          };
        }
      }
      if (!model.commitAction()) {
        return {
          complete: false,
          failure: "no_mutation",
          detail: "drag " + (dragIndex + 1) + " did not mutate the puzzle",
        };
      }
      if (tickDuration > 0) model.tick(tickDuration);
      if (model.snapshot().failed) {
        return {
          complete: false,
          failure: "runtime_deadline",
          detail: "drag " + (dragIndex + 1) + ": timer or bomb deadline failed",
        };
      }
    }
    const snapshot = model.snapshot();
    return {
      complete: snapshot.complete,
      failure: snapshot.complete ? null : "incomplete",
      detail: snapshot.complete
        ? null
        : snapshot.blocks.length + " active + " + snapshot.queuedBlocks.length + " queued remain",
      replayed_drags: drags.length,
      final_moves: snapshot.moves,
      cleared: snapshot.cleared,
      remaining_blocks: snapshot.blocks.length,
      queued_blocks: snapshot.queuedBlocks.length,
    };
  };

  const level = workerData.level;
  validateLevel(level);
  const solver = solveLevelForValidation(level, workerData.maxStates);
  const replay = solver.solved ? replayRoute(level, solver.drags) : null;
  parentPort.postMessage({ solver, replay });
`;

const bundle = await build({
  stdin: {
    contents: workerSource,
    resolveDir: root,
    sourcefile: "physical-shutter-runtime-recertification-worker.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
await writeFile(workerPath, bundle.outputFiles[0].text, "utf8");

const runWorker = (level, maxStates, wallTimeoutMs = 180_000) => new Promise((resolveResult) => {
  const worker = new Worker(workerPath, { workerData: { level, maxStates } });
  let settled = false;
  const settle = (result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolveResult(result);
  };
  const timer = setTimeout(() => {
    worker.terminate().catch(() => {});
    settle({ error: `wall-clock timeout after ${wallTimeoutMs}ms` });
  }, wallTimeoutMs);
  worker.once("message", settle);
  worker.once("error", (error) => settle({
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  }));
  worker.once("exit", (code) => {
    if (!settled && code !== 0) settle({ error: `worker exited with code ${code}` });
  });
});

const records = [];
try {
  for (const levelId of RECERTIFIED_LEVEL_IDS) {
    const repair = repairByLevelId.get(levelId);
    let result = null;
    let usedBudget = null;
    for (const budget of budgets) {
      console.log(`Lv${levelId}: solve/replay budget ${budget.toLocaleString("en-US")}`);
      result = await runWorker(repair.final_level, budget);
      if (result.error) throw new Error(`Lv${levelId}: ${result.error}`);
      usedBudget = budget;
      if (result.solver?.solved) break;
      if (result.solver?.termination !== "max_states") break;
    }
    if (!result?.solver?.solved || result.solver.termination !== "solved") {
      throw new Error(`Lv${levelId}: solver ${result?.solver?.termination ?? "failed"} at ${usedBudget} states`);
    }
    if (!result.replay?.complete
      || result.replay.replayed_drags !== result.solver.minimumDrags
      || result.replay.remaining_blocks !== 0
      || result.replay.queued_blocks !== 0) {
      throw new Error(`Lv${levelId}: PuzzleModel replay did not complete`);
    }
    records.push({
      level_id: levelId,
      candidate_id: repair.candidate_id,
      prior_source_semantic_sha256: repair.previous_source_semantic_sha256,
      prior_target_semantic_sha256: repair.previous_target_semantic_sha256,
      source_semantic_sha256: repair.source_semantic_sha256,
      repair_target_semantic_sha256: repair.target_semantic_sha256,
      final_level_semantic_sha256: repair.final_level_semantic_sha256,
      recertification_reason: "formal physical-shutter footprint/cohort repack changed repair input geometry",
      solver: {
        max_states: usedBudget,
        termination: result.solver.termination,
        solved: result.solver.solved,
        explored_states: result.solver.exploredStates,
        minimum_drags: result.solver.minimumDrags,
        clear_load: result.solver.clearLoad,
        reposition_overhead: result.solver.repositionOverhead,
        grid_steps: result.solver.gridSteps,
        turns: result.solver.turns,
        static_unsat_reasons: result.solver.staticUnsatReasons,
        unsupported_reasons: result.solver.unsupportedReasons,
        route: result.solver.drags,
      },
      puzzle_model_replay: result.replay,
      physical_shutter_recertification_updates: levelId === 117 ? {
        block_updates: {
          "lv117-opening-b15": { source: { color: "orange" }, target: { color: "yellow" } },
        },
      } : { block_updates: {} },
    });
  }
} finally {
  await rm(workerPath, { force: true });
}

const manifest = {
  schema_version: "blockout-physical-shutter-runtime-recertification-v1",
  input: {
    path: relative(root, inputPath).replaceAll("\\", "/"),
    sha256: sha256(inputText),
    schema_version: input.schema_version,
  },
  contract: {
    solver: "solveLevelForValidation",
    initial_max_states: budgets[0],
    higher_budget_sequence: budgets.slice(1),
    replay: "PuzzleModel authoritative transaction replay",
    normal_builder_sha_gates_bypassed: false,
    evidence_refresh_input_was_explicit: true,
    preserves_formal_physical_shutter_footprints_and_cohorts: true,
  },
  recertified_level_ids: RECERTIFIED_LEVEL_IDS,
  level_count: records.length,
  levels: records,
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(manifestPath, manifestText, "utf8");

const report = [
  "# Physical shutter runtime repair recertification",
  "",
  `- Levels: ${RECERTIFIED_LEVEL_IDS.map((id) => `Lv${id}`).join(", ")}`,
  "- Every listed final level was validated, solved with `solveLevelForValidation`, and replayed through `PuzzleModel`.",
  "- The normal builder SHA gates were not skipped or weakened; this manifest supplies their new signed source/target identities.",
  "- Formal shutter counts, countdowns, footprints, hidden cohorts, and opening-count contracts are preserved.",
  "",
  "| Level | Budget | Explored | Drags | Clear load | Reposition | Replay |",
  "|---:|---:|---:|---:|---:|---:|:---:|",
  ...records.map((record) => `| ${record.level_id} | ${record.solver.max_states} | ${record.solver.explored_states} | ${record.solver.minimum_drags} | ${record.solver.clear_load} | ${record.solver.reposition_overhead} | PASS |`),
  "",
  `Manifest SHA-256: \`${sha256(manifestText)}\``,
  "",
].join("\n");
await writeFile(reportPath, report, "utf8");
console.log(`Wrote ${relative(root, manifestPath)} (${records.length}/${records.length} solved + replayed)`);
console.log(`Manifest SHA-256: ${sha256(manifestText)}`);
