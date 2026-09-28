import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = resolve(process.env.PLAYTEST_OUTPUT ?? "playtest-results/experiments/revised-mechanism-art-2026-09-21/lifecycle");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 1078 } });
const evidence = [], errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => {
  window.__STORAGE_CALLS__ = [];
  for (const method of ["getItem", "setItem", "removeItem", "clear"]) {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function (...args) {
      window.__STORAGE_CALLS__.push(method);
      return original.apply(this, args);
    };
  }
});
const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const point = (x, y, grid = true) => page.evaluate(({ x, y, grid }) => {
  const s = window.__COLOR_ESCAPE__.getDebugState(), r = document.querySelector("canvas").getBoundingClientRect();
  if (grid) { x = s.board.innerX + x * s.board.cell; y = s.board.innerY + y * s.board.cell; }
  return { x: r.left + s.viewportTransform.offsetX + x * s.viewportTransform.scale,
    y: r.top + s.viewportTransform.offsetY + y * s.viewportTransform.scale };
}, { x, y, grid });
const drag = async (from, to, release = true) => {
  const a = await point(...from), b = await point(...to);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  if (release) await page.mouse.up();
};
const check = async (name, fn) => {
  const details = await fn();
  await page.screenshot({ path: resolve(output, `${name}.png`) });
  evidence.push({ name, pass: true, details }); console.log(`PASS ${name}`);
};
try {
  await page.goto(new URL("tools/revised-mechanisms.html", process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/").href);
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.revisedMechanisms.ready);
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__, original = game.render.bind(game);
    window.__LIFECYCLE_FRAMES__ = [];
    game.render = (...args) => {
      const s = game.getDebugState();
      window.__LIFECYCLE_FRAMES__.push({ puzzle: s.puzzle, transitions: s.revisedMechanismAnimations });
      if (window.__LIFECYCLE_FRAMES__.length > 120) window.__LIFECYCLE_FRAMES__.shift();
      return original(...args);
    };
  });
  for (const kind of ["lift", "shutter"]) await check(`initial-${kind}-clock`, async () => {
    await page.evaluate((kind) => {
      const game = window.__COLOR_ESCAPE__;
      window.__REVISED_MECHANISM_SANDBOX__.loadScene("lift");
      game.model = new game.model.constructor({ id: 21, name: "初始区域揭露", difficulty: "normal",
        width: 5, height: 5, timeSeconds: 180, reward: 0, parMoves: 50,
        mechanismRules: "revised-2026-09-21-v1.2", gates: [],
        shutters: [{ id: "initial", x: 1, y: 1, width: 2, height: 2, count: 0, skin: kind }],
        blocks: [{ id: "bomb", x: 1, y: 1, color: "red", shape: [[0, 0]], timedBombSeconds: 30, shutterId: "initial" },
          { id: "outside", x: 4, y: 4, color: "blue", shape: [[0, 0]] }] });
      game.captureInitialGeneratorSpawns();
      window.__LIFECYCLE_FRAMES__.length = 0;
      game.dirty = true; game.scheduleFrame();
    }, kind);
    await page.waitForTimeout(100);
    const initial = await state();
    assert.equal(initial.puzzle.started, false);
    assert.equal(initial.puzzle.blocks.find(({ id }) => id === "bomb").timedBombSeconds, 30);
    assert(initial.revisedMechanismAnimations.some((item) => item.kind === kind && item.initial));
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().puzzle.started);
    const frames = await page.evaluate(() => window.__LIFECYCLE_FRAMES__);
    assert(frames.some((frame) => !frame.puzzle.started && frame.transitions.some((item) => item.initial)));
    assert(frames.filter((frame) => frame.transitions.some((item) => item.initial)).every((frame) => !frame.puzzle.started));
    await page.waitForTimeout(100);
    assert((await state()).puzzle.blocks.find(({ id }) => id === "bomb").timedBombSeconds < 30);
    return { prePlayable: initial.puzzle.started, frozenBombTime: 30, sampledFrames: frames.length };
  });
  await check("held-reveal-cancel-and-undo", async () => {
    await page.evaluate(() => window.__REVISED_MECHANISM_SANDBOX__.loadScene("lift"));
    await page.waitForTimeout(100);
    await drag([0.5, 1.5], [0.5, 3.5]);
    await drag([2.5, 2.5], [3.5, 2.5], false);
    assert.equal((await state()).puzzle.shutters[0].revealed, true);
    await page.evaluate(() => {
      const id = window.__COLOR_ESCAPE__.getDebugState().activePointer;
      document.querySelector("canvas").dispatchEvent(new PointerEvent("pointercancel", { pointerId: id, bubbles: true }));
    });
    await page.mouse.up();
    assert.equal((await state()).puzzle.shutters[0].revealed, false);
    assert(!(await state()).revisedMechanismAnimations.some(({ kind }) => kind === "lift"));
    await drag([2.5, 2.5], [3.5, 2.5]);
    assert.equal((await state()).puzzle.shutters[0].revealed, true);
    const undo = await point(71, 122, false);
    await page.mouse.click(undo.x, undo.y);
    assert.equal((await state()).puzzle.shutters[0].revealed, false);
    assert.equal((await state()).revisedMechanismAnimations.length, 0);
    await page.evaluate(() => window.__REVISED_MECHANISM_SANDBOX__.loadScene("lift"));
    assert.equal((await state()).revisedMechanismAnimations.length, 0);
    return { cancelled: true, undone: true, restartClean: true };
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(await page.evaluate(() => window.__STORAGE_CALLS__), []);
} catch (error) {
  evidence.push({ name: "failure", pass: false, error: error.stack });
  await page.screenshot({ path: resolve(output, "failure.png") });
  console.error(error); process.exitCode = 1;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify({ ruleVersion: "1.2.1", evidence, errors }, null, 2));
  await browser.close();
}
