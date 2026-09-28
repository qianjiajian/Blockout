import assert from "node:assert/strict";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
import { validateCandidateFile, parseProposal, assertFileBindings, semanticHash, sealArtifact } from "./revised-candidate-artifact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = Object.fromEntries(process.argv.slice(2).map(argument => {
  const match = /^--(candidate|previous|route|viewport)=(.+)$/.exec(argument);
  if (!match) throw new Error("Usage: --candidate=proposal.json [--previous=artifact.json] [--route=bound-route.json] [--viewport=1000x1078]");
  return [match[1], match[2]];
}));
const candidatePath = options.candidate ?? "tests/fixtures/revised-candidate-rejection-lv027.json";
const candidate = parseProposal(JSON.parse(await readFile(path.resolve(root, candidatePath), "utf8")));
const budgets = { maxStates: 5000, maxDragStates: 1000, maxTransitions: 250000, maxMilliseconds: 10000 };
const artifact = await validateCandidateFile(candidatePath, { root, budgets, previousPath: options.previous, routePath: options.route });
assert(artifact.gates.static && artifact.gates.spatialWitness, "Pointer replay requires fresh static and model witness evidence");
assert(artifact.gates.wholeBlockArt, `Candidate block art rejected: ${JSON.stringify(artifact.evidence.wholeBlockArt.issues)}`);
const viewportParts = /^(\d+)x(\d+)$/.exec(options.viewport ?? "1000x1078");
assert(viewportParts, "Viewport must be WIDTHxHEIGHT");
const viewport = { width: Number(viewportParts[1]), height: Number(viewportParts[2]) };
assert(Object.values(viewport).every(value => value >= 240 && value <= 4096), "Viewport outside QA range");
const drags = artifact.evidence.witness.drags;
const files = { ...artifact.context.files };
async function bindTree(relativeDirectory) {
  for (const entry of await readdir(path.resolve(root, relativeDirectory), { withFileTypes: true })) {
    const relative = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) await bindTree(relative);
    else files[relative] = { sha256: createHash("sha256").update(await readFile(path.resolve(root, relative))).digest("hex") };
  }
}
await bindTree("src");
for (const relative of ["tools/playtest-revised-candidate-route.mjs", "tools/revised-candidate-route.html", "tools/revised-candidate-route-browser.mjs"]) {
  files[relative] = { sha256: createHash("sha256").update(await readFile(path.resolve(root, relative))).digest("hex") };
}
await assertFileBindings(files, root);
const output = path.join(root, "playtest-results/experiments/revised-candidate-pointer", `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`);
await mkdir(output, { recursive: true });
const server = await createServer({ root, configFile: false, server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
await server.listen();
const address = server.httpServer.address();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport });
const errors = [], actions = [];
page.on("pageerror", error => errors.push(error.message));
await page.addInitScript(() => {
  window.__PERSISTENT_STORAGE_CALLS__ = [];
  for (const method of ["getItem", "setItem", "removeItem", "clear"]) {
    Storage.prototype[method] = function (...args) {
      window.__PERSISTENT_STORAGE_CALLS__.push({ method, key: args[0] });
      throw new Error("Persistent storage is forbidden in candidate replay");
    };
  }
  for (const method of ["open", "deleteDatabase"]) {
    const database = window.indexedDB;
    database[method] = function (...args) {
      window.__PERSISTENT_STORAGE_CALLS__.push({ method: `indexedDB.${method}`, key: args[0] });
      throw new Error("Persistent databases are forbidden in candidate replay");
    };
  }
});
const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const stable = () => page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.puzzle?.started && !state.generatorSpawnAnimations.length && !state.revisedMechanismAnimations.length;
}, undefined, { timeout: 10000, polling: "raf" });
const point = (x, y) => page.evaluate(({ x, y }) => {
  const state = window.__COLOR_ESCAPE__.getDebugState(), bounds = document.querySelector("canvas").getBoundingClientRect(), t = state.viewportTransform;
  return { x: bounds.left + t.offsetX + (state.board.innerX + x * state.board.cell) * t.scale,
    y: bounds.top + t.offsetY + (state.board.innerY + y * state.board.cell) * t.scale };
}, { x, y });
const move = async (x, y) => { const p = await point(x, y); await page.mouse.move(p.x, p.y, { steps: 3 }); };
const spatial = snapshot => {
  // The independent replay key is JSON; compare the actual optional fields
  // using that same serialization rather than treating undefined as a value.
  const copy = JSON.parse(JSON.stringify(snapshot));
  delete copy.remainingSeconds;
  delete copy.moves;
  // Beginning/cancelling a first gesture may start the historical autonomous
  // clock marker. Cancellation must not rewind clocks; only space is compared.
  delete copy.autonomousStarted;
  return copy;
};
let report = { schemaVersion: "revised-candidate-pointer-v1", kind: "pointer-route-experiment", candidatePath,
  candidateSha256: artifact.context.candidateSha256, routeSha256: semanticHash(drags), sourceArtifactBodySha256: artifact.integrity.bodySha256, sourceArtifact: artifact, drags,
  files, viewport, inputPolicy: "Playwright mouse Pointer events; first shape cell grab; adjacent anchor samples",
  sourceGates: artifact.gates, pointerReplayValidated: false, timeValidated: false, calibratedTimeCoefficients: false,
  sameRouteTimeAndStars: false, releaseApproved: false, userAccepted: false, actions, errors };
try {
  await page.goto(`http://127.0.0.1:${address.port}/tools/revised-candidate-route.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => window.__REVISED_CANDIDATE_ROUTE__, undefined, { timeout: 30000 });
  await page.evaluate(value => window.__REVISED_CANDIDATE_ROUTE__.load(value), candidate);
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready && window.__COLOR_ESCAPE__.getDebugState().art.revisedMechanisms.ready, undefined, { timeout: 60000 });
  await page.waitForFunction(requirements => requirements.every(({ color, kind, shapeId }) => {
    const image = window.__COLOR_ESCAPE__.art.formalBlocks?.[color]?.[kind]?.[shapeId];
    return image && (image.naturalWidth || image.width) > 0 && (image.naturalHeight || image.height) > 0;
  }), artifact.evidence.wholeBlockArt.requirements, { timeout: 30000 });
  const renderCoverage = (await state()).art.formalGameplay;
  assert.deepEqual(renderCoverage.missingWholeBlockIds, [], "Every candidate block needs a rendered whole-block silhouette");
  report.renderCoverage = { exact: renderCoverage.exactWholeBlockCoverage, loaded: renderCoverage.loadedWholeBlockCoverage,
    total: renderCoverage.totalBlocks, allLayerRequirements: artifact.evidence.wholeBlockArt.requirements.length };
  await stable();
  const cancel = await page.evaluate(() => window.__REVISED_CANDIDATE_ROUTE__.cancelMove());
  if (cancel) {
    const before = (await state()).puzzle;
    await move(cancel.from[0] + cancel.grab[0] + .5, cancel.from[1] + cancel.grab[1] + .5);
    await page.mouse.down();
    await move(cancel.to[0] + cancel.grab[0] + .5, cancel.to[1] + cancel.grab[1] + .5);
    const held = (await state()).puzzle.blocks.find(block => block.id === cancel.blockId);
    assert.deepEqual([held.x, held.y], cancel.to, "cancel probe must first really move");
    await page.evaluate(() => document.querySelector("canvas").dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: window.__COLOR_ESCAPE__.activePointer })));
    await page.mouse.up();
    const after = (await state()).puzzle;
    assert.deepEqual(spatial(after), spatial(before), "pointercancel must restore the spatial transaction");
    assert.equal(after.moves, before.moves);
    report.cancelProbe = { passed: true, ...cancel, event: "DOM PointerEvent(pointercancel) after real mouse drag" };
  } else report.cancelProbe = { passed: false, status: "not-exercised", reason: "No non-exiting one-step probe in initial board" };
  await page.evaluate(value => window.__REVISED_CANDIDATE_ROUTE__.load(value), candidate);
  await stable();
  const started = await page.evaluate(() => performance.now());
  const initial = await state();
  const expectedInitial = await page.evaluate(() => window.__REVISED_CANDIDATE_ROUTE__.expected([]));
  assert.deepEqual(spatial(initial.puzzle), spatial(JSON.parse(expectedInitial.finalStateKey)));
  assert.equal(initial.puzzle.moves, 0);
  report.initialStable = { openingBlockCount: initial.puzzle.blocks.filter(block => !block.shutterId || initial.puzzle.shutters.find(shutter => shutter.id === block.shutterId)?.revealed).length, remainingSeconds: initial.puzzle.remainingSeconds, started: initial.puzzle.started };
  await page.screenshot({ path: path.join(output, "opening.png") });
  for (let index = 0; index < drags.length; index += 1) {
    await stable();
    const drag = drags[index], before = (await state()).puzzle;
    const block = before.blocks.find(item => item.id === drag.blockId);
    assert(block, `Drag ${index}: missing selected block`);
    const [grabX, grabY] = block.shape[0];
    await move(block.x + grabX + .5, block.y + grabY + .5);
    await page.mouse.down();
    const trace = [];
    for (let step = 0; step < drag.path.length; step += 1) {
      const [x, y] = drag.path[step];
      await move(x + grabX + .5, y + grabY + .5);
      const snapshot = (await state()).puzzle;
      const actual = snapshot.blocks.find(item => item.id === block.id);
      const cleared = snapshot.cleared > before.cleared;
      if (!cleared) assert.deepEqual(actual && [actual.x, actual.y], [x, y], `Drag ${index} step ${step}: actual anchor`);
      else assert(step === drag.path.length - 1 && drag.exitSide, `Drag ${index}: cleared before final canonical contact`);
      trace.push({ anchor: [x, y], actual: actual ? [actual.x, actual.y] : null, cleared: snapshot.cleared });
    }
    if (drag.exitSide) {
      const anchor = drag.path.at(-1) ?? [block.x, block.y];
      const delta = { left: [-.8, 0], right: [.8, 0], top: [0, -.8], bottom: [0, .8] }[drag.exitSide];
      await move(anchor[0] + grabX + .5 + delta[0], anchor[1] + grabY + .5 + delta[1]);
    }
    await page.mouse.up();
    await stable();
    const after = (await state()).puzzle;
    const expected = await page.evaluate(route => window.__REVISED_CANDIDATE_ROUTE__.expected(route), drags.slice(0, index + 1));
    assert(expected.valid, expected.error);
    assert.deepEqual(spatial(after), spatial(JSON.parse(expected.finalStateKey)), `Drag ${index}: independent model state`);
    assert.equal(after.moves, before.moves + 1, `Drag ${index}: one committed gesture`);
    actions.push({ index, blockId: block.id, trace, moves: after.moves, clearDelta: after.cleared - before.cleared, nonClearing: after.cleared === before.cleared });
  }
  const final = (await state()).puzzle;
  assert(final.complete && !final.failed, "Actual browser must complete");
  report.measuredWallSeconds = ((await page.evaluate(() => performance.now())) - started) / 1000;
  report.measuredPlayableSeconds = initial.puzzle.remainingSeconds - final.remainingSeconds;
  report.effectiveDrags = final.moves;
  report.nonClearingDrags = actions.filter(action => action.nonClearing).length;
  report.clearEvents = final.cleared;
  report.persistentStorageCalls = await page.evaluate(() => window.__PERSISTENT_STORAGE_CALLS__);
  assert.deepEqual(report.persistentStorageCalls, []);
  assert.deepEqual(errors, []);
  await assertFileBindings(files, root);
  report.pointerReplayValidated = true;
  report.status = "pointer-route-passed-only";
  await page.screenshot({ path: path.join(output, "complete.png") });
} catch (error) {
  report.status = "pointer-route-failed";
  report.failure = error.stack ?? String(error);
  report.persistentStorageCalls = await page.evaluate(() => window.__PERSISTENT_STORAGE_CALLS__).catch(() => []);
  await page.screenshot({ path: path.join(output, "failure.png") }).catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(path.join(output, "report.json"), JSON.stringify(sealArtifact(report), null, 2) + "\n", { flag: "wx" });
  await browser.close();
  await server.close();
}
console.log(JSON.stringify({ output, status: report.status, drags: report.effectiveDrags, nonClearingDrags: report.nonClearingDrags,
  pointerReplayValidated: report.pointerReplayValidated, releaseApproved: false, failure: report.failure }, null, 2));
