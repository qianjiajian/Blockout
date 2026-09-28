import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, version as esbuildVersion } from "esbuild";
import { verifyRulesLock } from "./verify-rules-lock.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_IDS = [150, 152, 155, 171, 178, 181];
// These files supply historical route inputs only. Their former PASS results
// are never accepted as verification of the new runtime or positive-time run.
const ROUTE_SOURCES = [
  { path: ".codex-temp/remaining30-v112/adoption-01/adoption.json", sha256: "08cfc142b250c7abebad5cbc4603f3bdcc07d4bb75ff70f7a321d09597b1217f", ids: [150, 181] },
  { path: ".codex-temp/formal-revised-v110/pre-integration.json", sha256: "00b7d87ee7a4bf835ce78bab65eb8420232bac5ab68f42c4743a589960089dae", ids: [152] },
  { path: ".codex-temp/remaining161-v110/adoption-cumulative63/adoption.json", sha256: "eda13770fcee392a774f33bff6c6602e1a2b8856d0aba3ef54e1ff0de442c9ae", ids: [155, 178] },
  { path: ".codex-temp/remaining98-v111/adoption-64/adoption.json", sha256: "4d9002e7620132c4d61ca5d0d48391716951f7b9550c6f0cae990ab926c2d40c", ids: [171] },
];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const semanticHash = (value) => sha256(JSON.stringify(canonical(value)));
const normalizedPath = (path) => relative(ROOT, path).replaceAll("\\", "/");
const doorStates = (snapshot) => snapshot.flipDoors.map((door) => ({ id: door.id, open: door.open }));
const exceptDoorCompletion = (snapshot) => {
  const copy = structuredClone(snapshot);
  delete copy.pendingExitAnimations;
  copy.flipDoors = copy.flipDoors.map(({ open: _open, ...door }) => door);
  return copy;
};

function verifyCampaign(runtime) {
  const { LEVELS, LEVELS_BEFORE_EXIT_ANIMATION_COMPLETION: before, ACTIVE_MECHANISM_PROFILE, validateLevel, levelStarTargets } = runtime;
  assert.equal(ACTIVE_MECHANISM_PROFILE, "revised-2026-09-23-v1.3");
  assert.equal(LEVELS.length, 200);
  assert.equal(before.length, 200);
  const rows = LEVELS.map((level, index) => {
    const previous = before[index];
    assert.equal(level.id, index + 1);
    assert.equal(previous.id, level.id);
    validateLevel(level);
    if (level.id <= 20) assert.equal(level, previous, `Lv${level.id} legacy object changed`);
    else {
      assert.equal(previous.mechanismRules, "revised-2026-09-21-v1.2");
      assert.equal(level.mechanismRules, ACTIVE_MECHANISM_PROFILE);
      assert.deepEqual({ ...level, mechanismRules: previous.mechanismRules }, previous, `Lv${level.id} non-profile drift`);
    }
    assert.deepEqual(levelStarTargets(level), levelStarTargets(previous));
    assert.equal(level.reward, previous.reward);
    assert.equal(level.timeSeconds, previous.timeSeconds);
    return { id: level.id, previousProfile: previous.mechanismRules ?? "legacy", profile: level.mechanismRules ?? "legacy", sameObject: level === previous,
      previousSha256: semanticHash(previous), sha256: semanticHash(level), starTargets: levelStarTargets(level), timeSeconds: level.timeSeconds, reward: level.reward };
  });
  const flipDoorLevels = LEVELS.filter((level) => level.flipDoors?.length).map((level) => level.id);
  assert.deepEqual(flipDoorLevels, EXPECTED_IDS);
  return { levelCount: 200, validated: 200, legacyObjectsUnchanged: 20, profileOnlyUpgrades: 180, flipDoorLevels,
    beforeCampaignSha256: semanticHash(before), campaignSha256: semanticHash(LEVELS), rows };
}

function replayWithDeferredCompletion(runtime, level, drags) {
  const { PuzzleModel, replayRevisedRoute } = runtime;
  const headlessReplay = replayRevisedRoute(level, drags);
  assert.equal(headlessReplay.valid, true, `Lv${level.id}: ${headlessReplay.error}`);
  assert.equal(headlessReplay.complete, true);
  // Compare two independent fresh instances. Both run the same positive clock;
  // one holds flip state until its completion acknowledgement, the other models
  // an animation-free immediate completion. No inventory tools are used.
  const model = new PuzzleModel(level, { deferExitCompletion: true });
  const immediate = new PuzzleModel(level);
  model.startCountdown(); immediate.startCountdown();
  const timing = { beforeEachDragSeconds: 0.1, eachGridStepSeconds: 0.04, departureWaitSeconds: 0.25 };
  let suppliedSeconds = 0, clearEvents = 0, peelEvents = 0, ackCount = 0, nonClearingDrags = 0;
  const transitions = [];
  const tickBoth = (seconds) => {
    suppliedSeconds += seconds;
    model.tick(seconds); immediate.tick(seconds);
    assert.equal(model.snapshot().failed, false, `Lv${level.id} timed out`);
    assert.equal(immediate.snapshot().failed, false);
  };
  for (const [index, drag] of drags.entries()) {
    tickBoth(timing.beforeEachDragSeconds);
    const before = model.snapshot();
    model.beginAction(); immediate.beginAction();
    for (const [x, y] of drag.path) {
      tickBoth(timing.eachGridStepSeconds);
      assert.equal(model.moveBlockStep(drag.blockId, x, y), true, `Lv${level.id} drag${index} move`);
      assert.equal(immediate.moveBlockStep(drag.blockId, x, y), true);
    }
    let result;
    if (drag.exitSide) {
      result = model.tryExit(drag.blockId, drag.exitSide);
      assert.equal(result.ok, true, `Lv${level.id} drag${index} exit`);
      assert.equal(immediate.tryExit(drag.blockId, drag.exitSide).ok, true);
      assert.equal(typeof result.exitAnimationId, "string");
    }
    assert.equal(model.commitAction(), true);
    assert.equal(immediate.commitAction(), true);
    const pending = model.snapshot();
    assert.equal(pending.moves, before.moves + 1);
    assert.deepEqual(doorStates(pending), doorStates(before), `Lv${level.id} drag${index} changed door before completion`);
    assert.deepEqual(exceptDoorCompletion(pending), exceptDoorCompletion(immediate.snapshot()));
    if (!result) {
      nonClearingDrags += 1;
      assert.equal(pending.cleared, before.cleared);
      assert.deepEqual(pending.pendingExitAnimations ?? [], []);
      continue;
    }
    clearEvents += 1;
    if (result.layerRemoved) peelEvents += 1;
    assert.equal(pending.cleared, before.cleared + 1);
    assert.deepEqual(pending.pendingExitAnimations, [result.exitAnimationId]);
    for (const gate of pending.gates) {
      assert.equal(gate.frozen, Math.max(0, before.gates.find((entry) => entry.id === gate.id).frozen - 1));
    }
    for (const door of pending.flipDoors) {
      assert.equal(door.frozen, Math.max(0, before.flipDoors.find((entry) => entry.id === door.id).frozen - 1));
    }
    tickBoth(timing.departureWaitSeconds);
    const beforeAck = model.snapshot();
    assert.deepEqual(doorStates(beforeAck), doorStates(before), `Lv${level.id} tick must not complete an animation`);
    assert.equal(model.completeExitAnimation(result.exitAnimationId), true);
    ackCount += 1;
    const afterAck = model.snapshot();
    assert.deepEqual(doorStates(afterAck), doorStates(beforeAck).map((door) => ({ ...door, open: !door.open })));
    // Ack must not perform any second clear/counter/key/queue/spatial update,
    // consume clock, or alter any other public state.
    assert.deepEqual(exceptDoorCompletion(afterAck), exceptDoorCompletion(beforeAck));
    assert.deepEqual(afterAck.pendingExitAnimations ?? [], []);
    assert.deepEqual(afterAck, immediate.snapshot(), `Lv${level.id} stable state mismatch`);
    assert.equal(model.completeExitAnimation(result.exitAnimationId), false);
    assert.deepEqual(model.snapshot(), afterAck, `Lv${level.id} duplicate callback changed state`);
    transitions.push({ dragIndex: index, blockId: drag.blockId, layerRemoved: Boolean(result.layerRemoved),
      exitSide: drag.exitSide, cleared: afterAck.cleared, remainingSeconds: afterAck.remainingSeconds,
      beforeDoors: doorStates(beforeAck), afterDoors: doorStates(afterAck), stateSha256: semanticHash(afterAck) });
  }
  const final = model.snapshot();
  assert.equal(final.complete, true);
  assert.equal(final.failed, false);
  assert.deepEqual(final.blocks, []);
  assert.deepEqual(final.queuedBlocks, []);
  assert.deepEqual(final.pendingExitAnimations ?? [], []);
  assert(final.generators.every((generator) => generator.remaining === 0));
  assert(final.remainingSeconds > 0 && final.remainingSeconds < level.timeSeconds);
  assert.equal(ackCount, clearEvents);
  return { levelId: level.id, valid: true, complete: true, effectiveDrags: drags.length, nonClearingDrags, clearEvents, peelEvents,
    acknowledgements: ackCount, timing, suppliedSeconds, elapsedModelSeconds: level.timeSeconds - final.remainingSeconds,
    remainingSeconds: final.remainingSeconds, finalStateSha256: semanticHash(final), transitions,
    canonicalSpatialReplay: { valid: headlessReplay.valid, complete: headlessReplay.complete, effectiveDrags: headlessReplay.effectiveDrags } };
}

async function main() {
  const lock = verifyRulesLock();
  assert.equal(lock.ok, true, lock.errors.join("\n"));
  assert.equal(lock.activeVersion, "1.13.0");
  const captured = new Map();
  const capture = (path) => {
    const absolute = resolve(ROOT, path), bytes = readFileSync(absolute);
    const key = normalizedPath(absolute), digest = sha256(bytes);
    if (captured.has(key)) assert.equal(captured.get(key), digest, `Input changed while reading: ${key}`);
    captured.set(key, digest);
    return bytes;
  };
  for (const path of ["tools/verify-flip-door-campaign.mjs", "tools/verify-rules-lock.mjs", "docs/rules/manifest.json",
    "docs/mechanism-rules-v1.13.0.md", "tests/exitAnimationCampaign.test.ts", "tests/revisedReviewedLevels.test.ts",
    "package.json", "pnpm-lock.yaml"]) capture(path);
  const routes = new Map();
  for (const source of ROUTE_SOURCES) {
    const bytes = capture(source.path);
    assert.equal(sha256(bytes), source.sha256, `Pinned route input changed: ${source.path}`);
    const document = JSON.parse(bytes);
    for (const id of source.ids) {
      const row = document.rows.find((entry) => entry.levelId === id);
      assert(row?.drags?.length, `Missing Lv${id} route`);
      routes.set(id, { drags: row.drags, path: source.path, sha256: source.sha256, routeSha256: semanticHash(row.drags) });
    }
  }
  const built = await build({
    stdin: { contents: 'export { LEVELS, LEVELS_BEFORE_EXIT_ANIMATION_COMPLETION } from "./src/core/levels.ts"; export { ACTIVE_MECHANISM_PROFILE } from "./src/core/mechanismRules.ts"; export { PuzzleModel, validateLevel } from "./src/core/PuzzleModel.ts"; export { levelStarTargets } from "./src/core/levelStarConditions.ts"; export { replayRevisedRoute } from "./src/core/revisedLevelSearch.ts";', resolveDir: ROOT, sourcefile: "flip-campaign-entry.ts", loader: "ts" },
    absWorkingDir: ROOT, bundle: true, platform: "node", format: "cjs", write: false, metafile: true,
    plugins: [{ name: "capture-exact-compiled-inputs", setup(builder) {
      builder.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, (args) => ({ contents: capture(args.path).toString("utf8"), loader: args.path.endsWith(".ts") ? "ts" : "js" }));
    } }],
  });
  for (const path of Object.keys(built.metafile.inputs).filter((path) => path !== "flip-campaign-entry.ts" && path !== "<stdin>")) {
    assert(captured.has(path.replaceAll("\\", "/")), `Unbound compiled input ${path}`);
  }
  const module = { exports: {} };
  new Function("require", "module", "exports", built.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  const runtime = module.exports;
  const campaign = verifyCampaign(runtime);
  const replays = EXPECTED_IDS.map((id) => {
    const source = routes.get(id);
    return { ...replayWithDeferredCompletion(runtime, runtime.LEVELS[id - 1], source.drags),
      routeSource: source.path, routeSourceSha256: source.sha256, routeSha256: source.routeSha256 };
  });
  for (const [path, digest] of captured) assert.equal(sha256(readFileSync(resolve(ROOT, path))), digest, `Source drift: ${path}`);
  const report = { capturedAt: new Date().toISOString(), ruleVersion: lock.activeVersion, status: "pass", campaign, replays,
    toolchain: { node: process.version, esbuild: esbuildVersion, compiledBundleSha256: sha256(built.outputFiles[0].contents) },
    bindingCount: captured.size, bindings: [...captured].map(([path, digest]) => ({ path, sha256: digest })),
    scope: "Fresh model replay with explicit animation acknowledgements and synthetic positive time; no real Pointer, natural browser clock, player speed calibration, lower-bound certification or release approval.",
    pointerValidated: false, naturalClockValidated: false, timeAndStarsCalibrated: false, lowerBoundCertified: false, releaseApproved: false };
  const output = resolve(ROOT, ".codex-temp/flip-door-completion-v113/campaign", report.capturedAt.replaceAll(/[:.]/g, "-"));
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: report.status, output: normalizedPath(resolve(output, "report.json")),
    validatedLevels: campaign.validated, profileOnlyUpgrades: campaign.profileOnlyUpgrades, bindings: captured.size,
    replays: replays.map(({ levelId, effectiveDrags, clearEvents, peelEvents, remainingSeconds }) => ({ levelId, effectiveDrags, clearEvents, peelEvents, remainingSeconds })) }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
