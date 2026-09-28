import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

// All interaction runs in a fresh, non-persistent browser context. This never
// attaches to the user's browser or reads/writes their live save.
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/exit-full-shape-alignment-${new Date().toISOString().replaceAll(":", "-")}`);
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const sourcePaths = [
  "src/core/blockExitFrontier.ts", "src/core/PuzzleModel.ts", "src/core/levels.ts",
  "src/game/continuousDrag.ts", "src/game/ColorEscapeGame.ts",
  "tools/playtest-exit-full-shape-alignment.mjs",
];
const hashes = async () => Object.fromEntries(await Promise.all(sourcePaths.map(async (path) => [
  path, createHash("sha256").update(await readFile(resolve(root, path))).digest("hex"),
])));
const beforeHashes = await hashes();
const results = [];
const errors = [];
const save = {
  schemaVersion: 1, currentLevel: 5, highestLevel: 200, coins: 1000,
  sound: false, haptic: false, reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "flip-door", "star-gate"],
  boosters: { time: 3, rocket: 3, pulse: 3 }, bestStars: {}, bestMoves: {}, rewardedLevels: [],
  dailyStreak: 0, lastDailyCompletedDay: "",
};
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 496, height: 1078 }, deviceScaleFactor: 1 });
await context.addInitScript((value) => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify(value));
}, save);
const page = await context.newPage();
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
const state = () => page.evaluate(() => {
  const d = window.__COLOR_ESCAPE__.getDebugState();
  return { puzzle: d.puzzle, board: d.board, selectedId: d.selectedId, activePointer: d.activePointer,
    exitGhosts: d.exitGhosts, exitAnimations: d.exitAnimations, exitPulses: d.exitPulses, art: d.art.formalGameplay };
});
const ready = () => page.waitForFunction(() => {
  const game = window.__COLOR_ESCAPE__;
  const d = game?.getDebugState();
  return d?.screen === "playing" && d.art.formalGameplay.requestedBlockSignature == null
    && d.art.formalGameplay.missingWholeBlockIds.length === 0
    && !game.revisedArtLoading && !game.hasActiveMechanicMotion()
    && !game.hasInitialRevisedRegionPresentation();
}, undefined, { timeout: 15_000 });
const point = (s, block, x = block.x, y = block.y) => ({
  x: s.board.innerX + (x + block.shape[0][0] + 0.5) * s.board.cell,
  y: s.board.innerY + (y + block.shape[0][1] + 0.5) * s.board.cell,
});
const drag = async (blockId, path, { release = true, removed = false } = {}) => {
  const before = await state();
  const block = before.puzzle.blocks.find(({ id }) => id === blockId);
  assert.ok(block, `Pointer drag requires visible ${blockId}`);
  const start = point(before, block);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const picked = await state();
  if (picked.selectedId !== blockId) {
    const diagnostic = await page.evaluate(({ x, y }) => {
      const g = window.__COLOR_ESCAPE__;
      const p = g.toLogical({ id: 1, x, y });
      return { point: p, blockAt: g.blockAt(p.x, p.y)?.id, screen: g.screen,
        drag: g.dragVisual, activePointer: g.activePointer, pointerNow: g.pointerNow,
        pendingButtonPress: g.pendingButtonPress, journeyPresentation: g.journeyPresentation,
        directLevelTransition: g.directLevelTransition, homeCoinFlight: g.homeCoinFlight,
        revisedArtLoading: g.revisedArtLoading, canvas: g.host.canvas.getBoundingClientRect().toJSON(),
        target: document.elementFromPoint(x, y)?.tagName };
    }, start);
    assert.fail(`Pointer did not pick ${blockId}: ${JSON.stringify(diagnostic)}`);
  }
  for (const [x, y] of path) {
    const end = point(before, block, x, y);
    await page.mouse.move(end.x, end.y, { steps: 8 });
  }
  if (release) await page.mouse.up();
  await page.waitForTimeout(release ? 130 : 60);
  const after = await state();
  const remaining = after.puzzle.blocks.find(({ id }) => id === blockId);
  if (removed) assert.equal(remaining, undefined, `${blockId} must exit only through the full-width aperture`);
  else {
    assert.ok(remaining, `${blockId} must remain on board`);
    assert.deepEqual([remaining.x, remaining.y], path.at(-1), `${blockId} did not reach the intended legal cell`);
  }
  return { before, after };
};

const fixtures = {
  left: { shape: [[0, 0], [1, 0], [2, 0], [1, 1]], start: [1, 2], end: [0, 2], narrowOffset: 2, wideOffset: 2, wideSize: 2 },
  right: { shape: [[0, 0], [1, 0], [2, 0], [1, 1]], start: [2, 2], end: [3, 2], narrowOffset: 2, wideOffset: 2, wideSize: 2 },
  top: { shape: [[1, 0], [0, 1], [1, 1], [2, 1]], start: [1, 1], end: [1, 0], narrowOffset: 2, wideOffset: 1, wideSize: 3 },
  bottom: { shape: [[0, 0], [1, 0], [2, 0], [1, 1]], start: [1, 3], end: [1, 4], narrowOffset: 2, wideOffset: 1, wideSize: 3 },
};

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
  for (const profile of ["legacy", "revised-2026-09-21-v1.2"]) {
    for (const [side, geometry] of Object.entries(fixtures)) {
      for (const wide of [false, true]) {
        const name = `${profile === "legacy" ? "legacy" : "revised"}-${side}-${wide ? "full-width" : "tail-outside"}`;
        await page.evaluate(async ({ side, geometry, wide, profile }) => {
          const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
          const game = window.__COLOR_ESCAPE__;
          game.loadLevel(1, true);
          game.model = new PuzzleModel({
            id: 9981, name: "Full-shape exit width Pointer regression", difficulty: "normal",
            timeSeconds: 180, reward: 0, parMoves: 2, width: 6, height: 6,
            ...(profile === "legacy" ? {} : { mechanismRules: profile }),
            playable: Array.from({ length: 6 }, (_, y) => Array.from({ length: 6 }, (__, x) => [x, y])).flat(),
            blocked: [], gates: [{ id: "cyan-aperture", color: "cyan", side,
              offset: wide ? geometry.wideOffset : geometry.narrowOffset, size: wide ? geometry.wideSize : 1 }],
            blocks: [
              { id: "cyan-t", color: "cyan", x: geometry.start[0], y: geometry.start[1], shape: geometry.shape },
              { id: "blue-keeps-level-open", color: "blue", x: 5, y: 5, shape: [[0, 0]] },
            ],
          });
          game.selectedId = undefined;
          game.activePointer = undefined;
          game.dragVisual = undefined;
          game.exitGhosts = [];
          game.exitPulses = [];
          game.particles = [];
          game.pendingCelebration = 0;
          // Begin the same lazy resource request as the normal update before
          // waiting, so the next animation frame cannot start it after ready.
          game.ensureRevisedMechanismArt();
          game.dirty = true;
          game.render();
        }, { side, geometry, wide, profile });
        await ready();
        const held = await drag("cyan-t", [geometry.end], { release: false, removed: wide });
        assert.equal(held.after.puzzle.cleared, wide ? 1 : 0, `${name}: held clear count`);
        assert.equal(held.after.exitGhosts, wide ? 1 : 0, `${name}: held ghost count`);
        await page.mouse.up();
        await page.waitForTimeout(100);
        const released = await state();
        assert.equal(released.puzzle.cleared, wide ? 1 : 0, `${name}: release must not bypass width or double-clear`);
        assert.equal(released.puzzle.blocks.some(({ id }) => id === "cyan-t"), !wide);
        assert.equal(released.puzzle.moves, 1, `${name}: the whole gesture is one action`);
        await page.screenshot({ path: resolve(output, `${name}.png`) });
        results.push({ name, held: held.after, released });
      }
    }
  }

  // Reconstruct the video contact through legal Pointer moves on actual LEVELS[4].
  // Current official red L starts at (3,3), whereas the video starts at (2,3):
  // move it left first; no block/gate/state is teleported or deleted to clear a path.
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(5, true));
  await ready();
  const original = await state();
  const cyanGate = original.puzzle.gates.find(({ color, side }) => color === "cyan" && side === "left");
  assert.deepEqual([cyanGate.offset, cyanGate.size], [3, 3]);
  const prefix = [
    ["piece-04", [[2, 3]]],
    ["strategy-guard-02", [[4, 1], [4, 2]]],
    ["piece-05", [[3, 0]]],
    ["piece-07", [[2, 0]]],
    ["piece-03", [[1, 3], [1, 2], [1, 1], [1, 0]]],
    ["strategy-guard-06", [[1, 3]]],
    ["strategy-guard-08", [[0, 1], [0, 2], [0, 3]], true],
    ["strategy-guard-06", [[0, 3], [0, 2]]],
  ];
  const prefixResults = [];
  for (const [blockId, path, removed] of prefix) {
    const result = await drag(blockId, path, { removed });
    prefixResults.push({ blockId, path, removed: Boolean(removed), after: result.after.puzzle });
  }
  await page.waitForTimeout(1250);
  const rejected = await drag("strategy-guard-01", [[1, 5], [0, 5]], { release: false });
  assert.equal(rejected.after.puzzle.cleared, 1, "Lv5: T tail below cyan gate must not clear");
  assert.equal(rejected.after.exitGhosts, 0, "Lv5: no suction while the tail extends below aperture");
  await page.screenshot({ path: resolve(output, "lv005-tail-outside-held.png") });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const rejectedRelease = await state();
  assert.ok(rejectedRelease.puzzle.blocks.find(({ id }) => id === "strategy-guard-01"));
  assert.equal(rejectedRelease.puzzle.cleared, 1, "Lv5: release must also reject incomplete alignment");

  // Clear the right green V3, move the red L right, and shift the left green V3
  // up. The same T can then rise one cell into the exact full aperture and exit.
  const positivePrefix = [
    ["strategy-guard-02", [[4, 3], [4, 4]], true],
    ["piece-04", [[3, 3]]],
    ["strategy-guard-06", [[0, 1], [0, 0]]],
  ];
  for (const [blockId, path, removed] of positivePrefix) await drag(blockId, path, { removed });
  await page.waitForTimeout(1250);
  const accepted = await drag("strategy-guard-01", [[0, 4]], { release: false, removed: true });
  assert.equal(accepted.after.puzzle.cleared, 3, "Lv5: aligned T clears exactly once");
  assert.equal(accepted.after.exitGhosts, 1);
  assert.ok(accepted.after.exitAnimations.some(({ side }) => side === "left"));
  await page.screenshot({ path: resolve(output, "lv005-full-width-accepted.png") });
  await page.mouse.up();
  const final = await state();
  assert.equal(final.puzzle.cleared, 3);
  results.push({ name: "official-lv005-video-contact", original, prefix, prefixResults,
    rejectedHeld: rejected.after, rejectedRelease, positivePrefix, accepted: accepted.after, final });

  assert.deepEqual(errors, [], "Browser must not log errors");
  const afterHashes = await hashes();
  assert.deepEqual(afterHashes, beforeHashes, "Source changed during this run; rerun on stable code");
  await writeFile(resolve(output, "report.json"), JSON.stringify({ pass: true,
    scope: "Full rigid-shape aperture containment, not a change to sub-cell snap timing",
    input: "Actual Playwright mouse Pointer events; model only replaced for named fixtures",
    isolatedStorage: true, naturalClock: true, sources: afterHashes, results, errors }, null, 2));
  console.log(JSON.stringify({ pass: true, scenarios: results.length, output }));
} catch (error) {
  await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => undefined);
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ pass: false, error: String(error), results,
    state: await state().catch(() => undefined), sourcesBefore: beforeHashes, sourcesAfter: await hashes(), errors }, null, 2));
  throw error;
} finally {
  await browser.close();
}
