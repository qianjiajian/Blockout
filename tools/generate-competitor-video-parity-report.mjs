import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const revision = process.env.VIDEO_PARITY_REPORT_REVISION ?? process.argv[2] ?? "v8-direct-data";
const runtimePath = path.resolve(ROOT, ".codex-temp", `formal-levels-${revision}.json`);
const layoutPath = path.resolve(ROOT, "deliverables", `level-layouts-${revision}`);
const reportPath = path.resolve(ROOT, "deliverables", `competitor-vs-ours-${revision}`);
const env = {
  ...process.env,
  VIDEO_PARITY_REPORT_REVISION: revision,
  VIDEO_PARITY_RUNTIME_PATH: runtimePath,
  VIDEO_PARITY_LAYOUT_ROOT: layoutPath,
};

const run = (args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd: ROOT, env, stdio: "inherit" });
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (code === 0) resolve();
    else reject(new Error(`${args.join(" ")} failed with ${signal ? `signal ${signal}` : `exit ${code}`}`));
  });
});

// Structural export and clean-opening screenshots only. No gameplay solver is
// imported or run anywhere in this report pipeline.
await run(["tools/export-current-formal-levels.mjs", runtimePath]);
await run(["tools/capture-video-parity-layouts.mjs", layoutPath]);
await run(["tools/build-competitor-video-parity-report.mjs", reportPath]);

console.log(JSON.stringify({ revision, runtimePath, layoutPath, reportPath, gameplaySolverRun: false }, null, 2));
