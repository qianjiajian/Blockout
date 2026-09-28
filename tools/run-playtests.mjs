import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const parsedPlaytestUrl = new URL(playtestUrl);
if (parsedPlaytestUrl.protocol !== "http:") throw new Error(`Browser playtests require an http URL, got ${playtestUrl}`);
const playtestHost = parsedPlaytestUrl.hostname;
const playtestPort = parsedPlaytestUrl.port || "80";
const scripts = [
  "playtest.mjs",
  "playtest-startup-art-loading.mjs",
  "playtest-progression.mjs",
  "playtest-full-season.mjs",
  "playtest-meta-discovery.mjs",
  "playtest-settlement-transaction.mjs",
  "playtest-season.mjs",
  "playtest-mechanics.mjs",
  "playtest-numeric-ice-fracture.mjs",
  "playtest-frozen-gate-counter-centering.mjs",
  "playtest-key-lock-counts.mjs",
  "playtest-lifecycle-input.mjs",
  "playtest-button-release.mjs",
  "playtest-exit-feedback.mjs",
  "playtest-onboarding.mjs",
  "playtest-pause-navigation.mjs",
  "playtest-feature-intros.mjs",
  "playtest-mechanism-guide.mjs",
  "playtest-mechanism-guide-formal-art.mjs",
  "playtest-document-progression.mjs",
  "playtest-boosters.mjs",
  "playtest-booster-unlocks.mjs",
  "playtest-booster-unlock-toast.mjs",
  "playtest-booster-recovery.mjs",
  "playtest-save-resilience.mjs",
  "playtest-reduced-motion.mjs",
  "playtest-continuous-next.mjs",
  "playtest-disabled-controls.mjs",
  "playtest-timeout-recovery.mjs",
  "playtest-color-accessibility.mjs",
  "playtest-supply.mjs",
  "playtest-home-settings.mjs",
  "playtest-achievements.mjs",
  "playtest-achievement-formal-art.mjs",
  "playtest-collection-album.mjs",
  "playtest-collection-navigation.mjs",
  "playtest-collection-default-page.mjs",
  "playtest-collection-supplied-art.mjs",
  "playtest-daily-tasks.mjs",
  "playtest-daily-task-formal-art.mjs",
  "playtest-language-settings.mjs",
  "playtest-home-v3.mjs",
  "playtest-temporary-level-selector.mjs",
  "playtest-formal-win.mjs",
  "playtest-completion-flow.mjs",
  "playtest-update-notice.mjs",
  "playtest-reset-progress.mjs",
  "playtest-level-pacing.mjs",
  "playtest-early-curve.mjs",
  "playtest-difficulty-band-regeneration.mjs",
  "playtest-board-shapes.mjs",
  "playtest-board-editor.mjs",
  "playtest-board-rim.mjs",
  "playtest-generator-spawn-animation.mjs",
  "playtest-block-unity.mjs",
  "playtest-formal-frozen-block-art.mjs",
  "playtest-single-block-badge.mjs",
  "playtest-strategic-openings.mjs",
  "playtest-strategy-nudge.mjs",
  "playtest-strategy-focus.mjs",
  "playtest-locked-target-hierarchy.mjs",
  "playtest-gate-readiness-hierarchy.mjs",
  "playtest-quick-flow.mjs",
  "playtest-boss-redesign.mjs",
  "playtest-selection-feedback.mjs",
  "playtest-blocker-focus.mjs",
  "playtest-gate-focus.mjs",
  "playtest-exit-success-feedback.mjs",
  "playtest-exit-animation-parity.mjs",
  "playtest-feedback-sequencing.mjs",
  "playtest-mechanic-causality.mjs",
  "playtest-feedback-budget.mjs",
  "playtest-audio.mjs",
  "playtest-adaptive-hit-targets.mjs",
  "playtest-block-pick-assist.mjs",
  "playtest-hybrid-drag.mjs",
  "playtest-drag-continuity.mjs",
  "playtest-elevator-drag-sync.mjs",
  "playtest-drag-edge-regressions.mjs",
  "playtest-turn-drag.mjs",
  "playtest-drag-performance.mjs",
  "playtest-low-end-frame-pacing.mjs",
  "playtest-memory-lifecycle.mjs",
  "playtest-edge-release-exit.mjs",
  "playtest-left-drag.mjs",
  "playtest-five-tab-navigation.mjs",
  "playtest-journey-leaderboard.mjs",
  "playtest-journey-group-scroll.mjs",
  "playtest-lives.mjs",
];
const startAt = process.env.PLAYTEST_START_AT;
const startIndex = startAt ? scripts.indexOf(startAt) : 0;
if (startAt && startIndex < 0) throw new Error(`Unknown PLAYTEST_START_AT script: ${startAt}`);
const selectedScripts = scripts.slice(startIndex);

const runNode = (script, env = process.env) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(process.execPath, [script], { cwd: projectRoot, env, stdio: "inherit" });
  child.once("error", rejectRun);
  child.once("exit", (code, signal) => {
    if (code === 0) resolveRun();
    else rejectRun(new Error(`${script} failed (${signal ?? code})`));
  });
});

const waitForServer = async () => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (serverFailure || server.exitCode !== null) throw serverFailure ?? new Error("Vite exited before becoming ready");
    try {
      const response = await fetch(playtestUrl);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Timed out waiting for ${playtestUrl}`);
};

const viteEntry = resolve(projectRoot, "node_modules/vite/bin/vite.js");
const server = spawn(process.execPath, [viteEntry, "--host", playtestHost, "--port", playtestPort, "--strictPort"], {
  cwd: projectRoot,
  env: process.env,
  stdio: ["ignore", "inherit", "inherit"],
});
let shuttingDown = false;
let serverFailure;
const serverDone = new Promise((resolveDone) => {
  server.once("error", (error) => {
    serverFailure = error;
    resolveDone();
  });
  server.once("exit", (code, signal) => {
    if (!shuttingDown && code !== 0) serverFailure = new Error(`Vite exited before playtests (${signal ?? code})`);
    resolveDone();
  });
});

try {
  await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  if (serverFailure || server.exitCode !== null) throw serverFailure ?? new Error("Vite exited before becoming ready");
  await waitForServer();
  await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  if (serverFailure || server.exitCode !== null) throw serverFailure ?? new Error("Vite exited while another process occupied the test port");
  for (const script of selectedScripts) {
    await runNode(resolve(projectRoot, "tools", script), { ...process.env, PLAYTEST_URL: playtestUrl });
  }
  console.log("All browser playtests passed.");
} finally {
  shuttingDown = true;
  if (server.exitCode === null) server.kill();
  await Promise.race([
    serverDone,
    new Promise((resolveWait) => setTimeout(resolveWait, 5_000)),
  ]);
}
