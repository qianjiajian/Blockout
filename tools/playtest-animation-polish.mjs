import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, relative } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { verifyRulesLock } from "./verify-rules-lock.mjs";

// Official campaign data, actual Pointer gestures, and the browser's natural
// animation clock. Wrappers below observe tryExit; they never change results,
// call update/tick, shorten animations, or advance a mocked clock.
const root = fileURLToPath(new URL("../", import.meta.url));
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `.codex-temp/animation-polish-20260923/run-${new Date().toISOString().replaceAll(":", "-")}`);
const baseline = process.env.ANIMATION_BASELINE === "1";
const only = new Set((process.env.ANIMATION_SCENARIOS ?? "").split(",").filter(Boolean));
const lock = verifyRulesLock();
assert.ok(lock.ok, lock.errors.join("\n"));
assert.equal(lock.activeVersion, "1.16.0");
async function sourceHashes() {
  const paths = [];
  async function walk(folder) {
    for (const entry of await readdir(resolve(root, folder), { withFileTypes: true })) {
      const path = `${folder}/${entry.name}`;
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:ts|tsx)$/.test(entry.name)) paths.push(path);
    }
  }
  await walk("src");
  paths.push("docs/mechanism-rules-v1.16.0.md", "docs/rules/manifest.json", "tools/playtest-animation-polish.mjs");
  return Object.fromEntries(await Promise.all(paths.sort().map(async path => [path,
    createHash("sha256").update(await readFile(resolve(root, path))).digest("hex")])));
}
const sourcesBefore = await sourceHashes();
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [], errors = [];
let page, currentScenario;
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const ready = () => page.waitForFunction(() => {
  const g = window.__COLOR_ESCAPE__, d = g?.getDebugState();
  return d?.art.ready && d.storage.baselineReady && !g.revisedArtLoading
    && d.art.formalGameplay.requestedBlockSignature == null
    && d.art.formalGameplay.missingWholeBlockIds.length === 0
    && !g.hasActiveMechanicMotion() && !g.hasInitialRevisedRegionPresentation();
}, undefined, { timeout: 20_000 });
const cssPoint = (d, x, y, bounds) => ({
  x: bounds.x + d.viewportTransform.offsetX + x * d.viewportTransform.scale,
  y: bounds.y + d.viewportTransform.offsetY + y * d.viewportTransform.scale,
});
const point = (d, block, bounds, x = block.x, y = block.y) => cssPoint(d,
  d.board.innerX + (x + block.shape[0][0] + 0.5) * d.board.cell,
  d.board.innerY + (y + block.shape[0][1] + 0.5) * d.board.cell, bounds);

async function setup(reduced) {
  const context = await browser.newContext({ viewport: { width: reduced ? 390 : 496, height: reduced ? 844 : 1078 }, deviceScaleFactor: 1 });
  await context.addInitScript(({ reduced }) => localStorage.setItem("color-escape-save-v1", JSON.stringify({
    schemaVersion: 1, currentLevel: 10, highestLevel: 200, coins: 1000,
    sound: false, haptic: false, reducedMotion: reduced, language: "zh-CN",
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "axis", "key", "star-gate", "flip-door", "bomb", "colored-grid", "lift"],
    boosterUnlockSeen: ["time", "rocket", "pulse"], boosters: { time: 3, rocket: 3, pulse: 3 },
    bestStars: {}, bestMoves: {}, rewardedLevels: [1, 2, 3], dailyStreak: 0, lastDailyCompletedDay: "",
    lifeState: { lives: 50, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
  })), { reduced });
  page = await context.newPage();
  page.on("console", message => { if (message.type() === "error") errors.push(`${currentScenario}: ${message.text()}`); });
  page.on("pageerror", error => errors.push(`${currentScenario}: ${error.message}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await ready();
  return context;
}

async function discoverRoute(levelId, kind) {
  return page.evaluate(async ({ levelId, kind }) => {
    const [{ getLevel }, { PuzzleModel }, { solveLevelForValidation }] = await Promise.all([
      import("/src/core/levels.ts"), import("/src/core/PuzzleModel.ts"), import("/src/core/levelSolver.ts"),
    ]);
    const level = getLevel(levelId), solution = solveLevelForValidation(level);
    if (!solution.solved) throw new Error(`Current official Lv${levelId} has no solver witness`);
    const model = new PuzzleModel(level), prefix = [];
    for (const drag of solution.drags) {
      const before = model.snapshot();
      model.beginAction();
      for (const [x, y] of drag.path) model.moveBlock(drag.blockId, x, y);
      if (drag.exitSide) model.tryExit(drag.blockId, drag.exitSide);
      model.commitAction();
      const after = model.snapshot();
      prefix.push(drag);
      const old = before.blocks.find(b => b.id === drag.blockId), block = after.blocks.find(b => b.id === drag.blockId);
      const gateIds = before.gates.filter(g => g.frozen > 0 && after.gates.find(a => a.id === g.id)?.frozen === 0).map(g => g.id);
      const iceIds = before.blocks.filter(b => b.frozen > 0 && after.blocks.find(a => a.id === b.id)?.frozen === 0).map(b => b.id);
      const peel = old && block && old.layers.length > block.layers.length;
      if ((kind === "gate" && gateIds.length) || (kind === "ice" && iceIds.length) || (kind === "shell" && peel)) {
        return { levelId, kind, level, prefix, expected: { before, after, gateIds, iceIds, peel: Boolean(peel) }, totalDrags: solution.drags.length };
      }
    }
    throw new Error(`Lv${levelId} did not produce requested ${kind} event`);
  }, { levelId, kind });
}

async function performDrag(drag) {
  const before = await debug(), block = before.puzzle.blocks.find(b => b.id === drag.blockId);
  assert.ok(block, `Missing official route block ${drag.blockId}`);
  const bounds = await page.locator("canvas").boundingBox();
  assert.ok(bounds);
  const start = point(before, block, bounds);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of drag.path) {
    const end = point(before, block, bounds, x, y);
    await page.mouse.move(end.x, end.y, { steps: 3 });
  }
  // Edge-ready solver actions can have an empty path. A genuine outward
  // Pointer movement also works when pressing alone does not auto-exit.
  if (drag.exitSide) {
    const d = await debug(), remaining = d.puzzle.blocks.find(b => b.id === drag.blockId);
    if (d.selectedId === drag.blockId && remaining?.layers.length === block.layers.length) {
      const end = point(d, remaining, bounds);
      const vector = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[drag.exitSide];
      await page.mouse.move(end.x + vector[0] * d.board.cell * d.viewportTransform.scale,
        end.y + vector[1] * d.board.cell * d.viewportTransform.scale, { steps: 2 });
    }
  }
  await page.mouse.up();
  const after = await debug(), remaining = after.puzzle.blocks.find(b => b.id === drag.blockId);
  if (drag.exitSide) {
    if (block.layers.length > 1) assert.equal(remaining?.layers.length, block.layers.length - 1, "Shell body remains with exactly one layer removed");
    else assert.equal(remaining, undefined, "Pointer must remove the target body");
  } else assert.ok(remaining, "A parking drag cannot remove a block");
}

async function armRecorder(blockId) {
  await page.evaluate(({ blockId }) => {
    const game = window.__COLOR_ESCAPE__, model = game.model;
    const record = { startedAt: undefined, done: false, frames: [], pictures: [], release: undefined };
    window.__animationPolishCapture = record;
    const original = model.tryExit.bind(model);
    model.tryExit = (...args) => {
      const before = model.snapshot(), result = original(...args);
      if (args[0] === blockId && result.ok && !record.release) {
        record.startedAt = performance.now();
        record.release = { args, result: structuredClone(result), before, after: model.snapshot() };
      }
      return result;
    };
    let lastImage = -Infinity, raf;
    const sample = () => {
      if (record.done) return;
      if (game.model !== model) { record.error = "Model changed during natural capture"; record.done = true; return; }
      if (record.startedAt != null) {
        const d = game.getDebugState(), elapsedMs = performance.now() - record.startedAt;
        record.frames.push({ elapsedMs, screen: d.screen, remainingSeconds: d.puzzle.remainingSeconds,
          cleared: d.puzzle.cleared, moves: d.puzzle.moves, target: d.puzzle.blocks.find(b => b.id === blockId),
          frozenGates: d.puzzle.gates.map(g => ({ id: g.id, frozen: g.frozen })),
          frozenBlocks: d.puzzle.blocks.filter(b => b.frozen > 0).map(b => ({ id: b.id, frozen: b.frozen })),
          pending: d.puzzle.pendingExitAnimations, exitAnimations: d.exitAnimations, exitPulses: d.exitPulses,
          mechanicPulses: d.mechanicPulses, boardShakeTime: d.boardShakeTime,
          particles: d.particles, fragments: d.exitFragmentBreakdown });
        if (record.pictures.length < 16 && elapsedMs - lastImage >= (elapsedMs < 500 ? 45 : 140)) {
          record.pictures.push({ elapsedMs, png: game.host.canvas.toDataURL("image/png") });
          lastImage = elapsedMs;
        }
        if (elapsedMs >= 2200) { record.done = true; model.tryExit = original; return; }
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    window.__stopAnimationPolishRecorder = () => { record.done = true; cancelAnimationFrame(raf); model.tryExit = original; };
  }, { blockId });
}

async function images(name, capture) {
  const directory = resolve(output, name);
  await mkdir(directory, { recursive: true });
  const cards = [], paths = [];
  for (const [index, picture] of capture.pictures.entries()) {
    const filename = `${String(index).padStart(2, "0")}-${Math.round(picture.elapsedMs)}ms.png`;
    const bytes = Buffer.from(picture.png.split(",")[1], "base64");
    await writeFile(resolve(directory, filename), bytes);
    paths.push(`${name}/${filename}`);
    const thumb = await sharp(bytes).resize({ width: 200, height: 435, fit: "contain", background: "#151824" }).png().toBuffer();
    const caption = Buffer.from(`<svg width="200" height="24"><rect width="200" height="24" fill="#151824"/><text x="8" y="17" fill="white" font-size="13">${Math.round(picture.elapsedMs)} ms</text></svg>`);
    cards.push({ input: thumb, left: (index % 4) * 200, top: Math.floor(index / 4) * 459 });
    cards.push({ input: caption, left: (index % 4) * 200, top: Math.floor(index / 4) * 459 + 435 });
  }
  assert.ok(paths.length >= 3, "Natural capture needs several visible frames");
  await sharp({ create: { width: 800, height: Math.ceil(paths.length / 4) * 459, channels: 4, background: "#151824" } })
    .composite(cards).png().toFile(resolve(output, `${name}-contact.png`));
  capture.pictures = capture.pictures.map((p, index) => ({ elapsedMs: p.elapsedMs, path: paths[index] }));
  return paths;
}

function assertCapture(capture, route, reduced) {
  assert.equal(capture.error, undefined);
  assert.ok(capture.release?.result.ok, "Recorded actual successful Pointer exit");
  const { before, after, result } = capture.release;
  assert.equal(after.cleared, before.cleared + 1, "Clear counted once at departure start");
  for (const id of route.expected.gateIds) assert.equal(after.gates.find(g => g.id === id)?.frozen, 0);
  for (const id of route.expected.iceIds) assert.equal(after.blocks.find(b => b.id === id)?.frozen, 0);
  const targetId = route.prefix.at(-1).blockId;
  if (route.kind === "shell") {
    assert.equal(result.layerRemoved, true);
    const old = before.blocks.find(b => b.id === targetId), current = after.blocks.find(b => b.id === targetId);
    assert.deepEqual(current.layers, old.layers.slice(1));
    assert.deepEqual([current.x, current.y, current.shape], [old.x, old.y, old.shape]);
  } else assert.ok(!after.blocks.some(b => b.id === targetId));
  assert.ok(capture.frames.some(f => f.exitPulses.length), "Natural gate response frames must exist");
  for (const frame of capture.frames) {
    assert.equal(frame.cleared, after.cleared, "Visual callbacks cannot clear or decrement twice");
    assert.deepEqual(frame.frozenGates, after.gates.map(g => ({ id: g.id, frozen: g.frozen })), "Every gate counter stays at its once-counted result");
    assert.deepEqual(frame.frozenBlocks, after.blocks.filter(b => b.frozen > 0).map(b => ({ id: b.id, frozen: b.frozen })), "Every visible ice counter stays at its once-counted result");
    if (route.kind === "shell") {
      const body = after.blocks.find(b => b.id === targetId);
      assert.deepEqual([frame.target?.x, frame.target?.y, frame.target?.shape, frame.target?.layers], [body.x, body.y, body.shape, body.layers], "The exposed inner body stays fixed throughout shell travel");
    }
    for (const id of route.expected.gateIds) assert.equal(frame.frozenGates.find(g => g.id === id)?.frozen, 0);
    if (reduced) assert.equal(frame.boardShakeTime, 0, "Reduced motion suppresses board shake");
  }
  const allMechanics = capture.frames.flatMap(f => f.mechanicPulses);
  for (const [target, ids] of [["gate", route.expected.gateIds], ["block", route.expected.iceIds]]) {
    for (const id of ids) assert.ok(allMechanics.some(p => p.kind === "ice" && p.target === target && p.targetId === id && p.unlocked && p.phase === "visible"), `Natural thaw presentation missing for ${id}`);
  }
  if (!baseline) {
    for (const [target, ids] of [["gate", route.expected.gateIds], ["block", route.expected.iceIds]]) {
      for (const id of ids) {
        const ice = allMechanics.filter(p => p.kind === "ice" && p.target === target && p.targetId === id && p.phase === "visible").map(p => p.iceFracture).filter(Boolean);
        assert.ok(ice.some(s => s.iceSheetAlpha > 0), "The old ice sheet is visibly retained before breaking away");
        assert.ok(ice.some(s => s.iceSheetAlpha === 0), "The old ice sheet clears as the break completes");
        if (reduced) assert.ok(ice.every(s => s.sheetLift === 0), "Reduced ice skin stays stationary");
        else assert.ok(ice.some(s => s.sheetLift > 0), "Normal ice skin lifts before clearing");
      }
    }
    const responses = capture.frames.flatMap(f => f.exitPulses).map(p => p.response).filter(Boolean);
    assert.ok(responses.length, "Polished gate response must be exposed by debug sampling");
    assert.ok(responses.some(r => r.glow > 0), "Gate glow must progress on natural frames");
    if (reduced) for (const response of responses) {
      assert.equal(response.displacement, 0, "Reduced mode keeps the gate stationary");
      assert.ok(response.glow >= 0 && response.glow <= 0.32, "Reduced gate glow stays bounded");
    }
    else assert.ok(responses.some(r => r.displacement > 0), "Normal mode pushes the gate outward");
    if (route.kind === "shell") {
      const shells = capture.frames.flatMap(f => f.exitAnimations).filter(a => a.mode === "shell" && a.blockId === targetId && a.shellSample);
      assert.ok(shells.length, "Official legacy shell must expose its natural shell animation");
      assert.ok(shells.some(a => a.shellSample.travelProgress > 0 && a.shellSample.travelProgress < 1), "Shell material travels into the gate before settling");
      for (const shell of shells) {
        assert.ok(shell.shellSample.duration > 0);
        assert.equal(shell.shellSample.materialAlpha, shell.age >= shell.shellSample.duration ? 0 : 1);
      }
    }
  }
  const last = capture.frames.at(-1);
  assert.equal(last.exitAnimations.length, 0, "All departure visuals settle naturally");
  if (route.kind === "shell") assert.ok(last.target, "Shell animation never removes the inner body");
}

try {
  for (const reduced of [false, true]) {
    const context = await setup(reduced);
    try {
      for (const [levelId, kind] of [[10, "gate"], [12, "ice"], [15, "shell"]]) {
        const name = `lv${levelId}-${kind}-${reduced ? "reduced" : "normal"}`;
        if (only.size && !only.has(name)) continue;
        currentScenario = name;
        const route = await discoverRoute(levelId, kind);
        const levelSha256 = createHash("sha256").update(JSON.stringify(route.level)).digest("hex");
        await page.evaluate(id => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
        await ready();
        assert.equal((await debug()).screen, "playing");
        for (const drag of route.prefix.slice(0, -1)) {
          await performDrag(drag);
          await page.waitForFunction(() => {
            const d = window.__COLOR_ESCAPE__.getDebugState();
            return d.exitGhosts === 0 && d.mechanicPulses.length === 0 && !d.selectedId;
          }, undefined, { timeout: 5000 });
        }
        const before = await debug();
        await page.screenshot({ path: resolve(output, `${name}-before.png`) });
        await armRecorder(route.prefix.at(-1).blockId);
        await performDrag(route.prefix.at(-1));
        await page.waitForFunction(() => window.__animationPolishCapture?.done, undefined, { timeout: 6000, polling: "raf" });
        const capture = await page.evaluate(() => structuredClone(window.__animationPolishCapture));
        const paths = await images(name, capture);
        await page.waitForFunction(() => {
          const d = window.__COLOR_ESCAPE__.getDebugState();
          return d.exitGhosts === 0 && d.exitPulses.length === 0 && d.mechanicPulses.length === 0 && d.particles === 0;
        }, undefined, { timeout: 8000 });
        const settled = await debug();
        assert.equal(settled.puzzle.cleared, capture.release.after.cleared, "Trailing decoration cannot trigger another clear");
        await page.screenshot({ path: resolve(output, `${name}-settled.png`) });
        await writeFile(resolve(output, `${name}-frames.json`), JSON.stringify(capture, null, 2));
        assertCapture(capture, route, reduced);
        results.push({ name, levelId, kind, reduced, levelSha256, profile: route.level.mechanismRules ?? "legacy",
          prefix: route.prefix, fullWitnessDrags: route.totalDrags, captureFile: `${name}-frames.json`, contact: `${name}-contact.png`,
          before: { moves: before.puzzle.moves, cleared: before.puzzle.cleared },
          settled: { moves: settled.puzzle.moves, cleared: settled.puzzle.cleared, particles: settled.particles, mechanicPulses: settled.mechanicPulses.length },
          naturalFrames: capture.frames.length, pictures: paths, release: capture.release });
      }
    } finally { await context.close(); }
  }
  assert.equal(results.length, only.size || 6);
  assert.deepEqual(errors, []);
  const sourcesAfter = await sourceHashes();
  assert.deepEqual(sourcesAfter, sourcesBefore, "Source drift during capture: rerun after inputs stabilize");
  await writeFile(resolve(output, "report.json"), JSON.stringify({ pass: true, baseline, naturalClock: true, isolatedStorage: true,
    input: "Real mouse Pointer on unchanged official Lv10/12/15; solver only constructs a route, never advances the browser model.",
    limitations: "Formal early levels retain legacy; M05 lifecycle coverage is a separate v1.4 flip-completion run. Frame PNG sampling adds observation overhead but does not change simulation time.",
    sourceSha256: sourcesAfter, results, errors }, null, 2));
  await writeFile(resolve(output, "index.html"), `<!doctype html><meta charset="utf-8"><title>动画自然帧验证</title><style>body{font:16px sans-serif;background:#151824;color:white;margin:24px}img{max-width:100%}a{color:#8edcff}section{margin:32px 0}</style><h1>正式关卡自然帧：${baseline ? "基线" : "动画调整后"}</h1><p>真实Pointer；自然时钟；正常与低动态。<a href="report.json">验证报告</a></p>${results.map(r => `<section><h2>${r.name}</h2><p>${r.naturalFrames}自然帧 / ${r.prefix.length}拖到事件</p><a href="${r.captureFile}">逐帧状态</a><br><img src="${r.contact}" alt="${r.name}自然帧接触表"></section>`).join("")}`);
  console.log(JSON.stringify({ pass: true, baseline, scenarios: results.length, output: relative(root, output) }));
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ pass: false, scenario: currentScenario, error: String(error),
    results, errors, sourcesBefore, sourcesAfter: await sourceHashes() }, null, 2));
  throw error;
} finally { await browser.close(); }
