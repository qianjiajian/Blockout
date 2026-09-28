import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const rootUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = path.resolve(process.env.PLAYTEST_OUTPUT ?? "playtest-results/experiments/revised-mechanisms-2026-09-21/ui");
const caseFilter = process.env.PLAYTEST_CASE_FILTER;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 1078 } });
const errors = [];
const evidence = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => {
  window.__LOCAL_STORAGE_CALLS__ = [];
  for (const method of ["getItem", "setItem", "removeItem", "clear"]) {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function (...args) {
      window.__LOCAL_STORAGE_CALLS__.push({ method, key: args[0] });
      return original.apply(this, args);
    };
  }
});
const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const scene = async (key) => {
  await page.evaluate((value) => window.__REVISED_MECHANISM_SANDBOX__.loadScene(value), key);
  await page.waitForTimeout(120);
};
const point = async (x, y) => page.evaluate(({ x, y }) => {
  const s = window.__COLOR_ESCAPE__.getDebugState();
  const bounds = document.querySelector("canvas").getBoundingClientRect();
  const t = s.viewportTransform;
  return { x: bounds.left + t.offsetX + (s.board.innerX + x * s.board.cell) * t.scale,
    y: bounds.top + t.offsetY + (s.board.innerY + y * s.board.cell) * t.scale };
}, { x, y });
const drag = async (from, to, release = true) => {
  const a = await point(...from), b = await point(...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  if (release) await page.mouse.up();
};
const screenshot = async (key) => page.screenshot({ path: path.join(output, `${key}.png`) });
const rendered = () => page.evaluate(() => window.__REVISED_RENDER__);
const check = async (name, action) => {
  if (caseFilter && !name.includes(caseFilter)) return;
  const details = await action();
  await screenshot(name);
  evidence.push({ name, pass: true, ...(details ? { details } : {}) });
  console.log(`PASS ${name}`);
};

const pointerMoveTo = async (x, y) => {
  const p = await point(x, y);
  await page.mouse.move(p.x, p.y);
};
const heldPose = () => page.evaluate(() => {
  const visual = window.__COLOR_ESCAPE__.dragVisual;
  return visual ? { x: visual.x, y: visual.y, modelX: visual.modelX, modelY: visual.modelY,
    valid: visual.isPoseValid(visual.x, visual.y) } : undefined;
});
const assertNoVisibleOverlap = (s) => {
  const cells = s.puzzle.blocks.filter((block) => !block.shutterId
    || s.puzzle.shutters.find(({ id }) => id === block.shutterId)?.revealed).flatMap((block) => (
      block.shape.map(([x, y]) => `${block.x + x},${block.y + y}`)
    ));
  assert.equal(new Set(cells).size, cells.length, "newly spawned cargo remains a collision obstacle during its animation");
};
const cargoTrace = (s) => ({
  moves: s.puzzle.moves, cleared: s.puzzle.cleared, selectedId: s.selectedId, activePointer: s.activePointer,
  remaining: s.puzzle.generators[0].remaining,
  blocks: s.puzzle.blocks.map(({ id, x, y }) => ({ id, x, y })),
  animations: s.generatorSpawnAnimations.map(({ blockId, phase, age }) => ({ blockId, phase, age })),
});
const openContinuousCargoScene = async () => {
  await scene("generator-continuous");
  await page.waitForFunction(() => {
    const s = window.__COLOR_ESCAPE__.getDebugState();
    return s.puzzle.started && s.generatorSpawnAnimations.length === 0;
  });
  const a = await point(2.5, 0.5);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
};

try {
  await page.goto(new URL("tools/revised-mechanisms.html", rootUrl).href, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready
    && window.__COLOR_ESCAPE__.getDebugState().art.revisedMechanisms.ready
    && window.__COLOR_ESCAPE__.model.level.mechanismRules === "revised-2026-09-21-v1.2");
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__;
    const originalBoard = game.drawBoard.bind(game);
    const originalBlock = game.drawBlock.bind(game);
    const originalMarker = game.drawBlockMechanicMarkers.bind(game);
    const originalLift = game.drawLiftFrame.bind(game);
    const originalShutter = game.drawShutter.bind(game);
    const originalRevisedRegion = game.drawRevisedMechanismRegion.bind(game);
    const frames = [];
    let current;
    window.__REVISED_RENDER__ = { frames };
    game.drawBoard = (...args) => {
      current = { blocks: [], bombs: [], lifts: [], shutters: [], animation: game.getDebugState().generatorSpawnAnimations };
      frames.push(current);
      if (frames.length > 180) frames.shift();
      try { return originalBoard(...args); } finally { current = undefined; }
    };
    game.drawBlock = (block, ...args) => {
      if (current) {
        const matrix = game.ctx.getTransform();
        current.blocks.push({ id: block.id, frozen: block.frozen, x: block.x, y: block.y, tx: matrix.e, ty: matrix.f });
      }
      return originalBlock(block, ...args);
    };
    game.drawBlockMechanicMarkers = (block, ...args) => {
      if (current && block.timedBombSeconds !== undefined) current.bombs.push(block.id);
      return originalMarker(block, ...args);
    };
    game.drawLiftFrame = (...args) => { current?.lifts.push(args.slice(0, 4)); return originalLift(...args); };
    game.drawShutter = (...args) => { current?.shutters.push(args.slice(0, 5)); return originalShutter(...args); };
    game.drawRevisedMechanismRegion = (region, ...args) => {
      if (current) {
        const rect = [region.x, region.y, region.width, region.height];
        if (region.skin === "lift") current.lifts.push(rect);
        else current.shutters.push([...rect, region.count]);
      }
      return originalRevisedRegion(region, ...args);
    };
  });

  await check("01-shell-flip-hidden-ice-bomb", async () => {
    await scene("shell");
    assert(!(await rendered()).frames.at(-1).blocks.some(({ id }) => id === "hidden-ice"));
    await drag([0.5, 1.5], [-0.7, 1.5]);
    await page.waitForTimeout(350);
    let s = await state();
    assert.deepEqual(s.puzzle.flipDoors.map(({ open }) => open), [false, true]);
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "hidden-ice").frozen, 6);
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "shell").timedBombSeconds, undefined);
    const frame = (await rendered()).frames.at(-1);
    assert(frame.blocks.some(({ id, frozen }) => id === "hidden-ice" && frozen === 6));
    assert(!frame.bombs.includes("shell"));
    await drag([4.5, 0.5], [5.7, 0.5]);
    s = await state();
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "hidden-ice").frozen, 5);
  });

  await check("02-lift-fixed-region-and-foreign-occupant", async () => {
    await scene("lift");
    let frame = (await rendered()).frames.at(-1);
    assert.deepEqual(frame.lifts, [[1, 1, 2, 2]]);
    assert(!frame.blocks.some(({ id }) => id === "hidden-ice"));
    await drag([0.5, 1.5], [0.5, 3.5]);
    let s = await state();
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "top").y, 3);
    assert.equal(s.puzzle.shutters[0].revealed, false);
    await drag([2.5, 2.5], [3.5, 2.5]);
    await page.waitForTimeout(120);
    s = await state();
    assert.equal(s.puzzle.shutters[0].revealed, true);
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "hidden-ice").frozen, 6);
    frame = (await rendered()).frames.at(-1);
    assert(frame.blocks.some(({ id }) => id === "hidden-ice"));
    for (const rect of frame.lifts) assert.deepEqual(rect, [1, 1, 2, 2], "lift opening keeps its original fixed region");
    await page.waitForFunction(() => !window.__COLOR_ESCAPE__.getDebugState().revisedMechanismAnimations
      .some(({ kind }) => kind === "lift"));
    assert.equal((await rendered()).frames.at(-1).lifts.length, 0);
  });

  await check("03-generator-during-held-pointer-and-cancel", async () => {
    await scene("generator");
    assert.equal((await state()).puzzle.generators[0].remaining, 2);
    await drag([2.5, 0.5], [2.5, 1.5], false);
    let s = await state();
    assert.equal(s.puzzle.generators[0].remaining, 1);
    assert(s.generatorSpawnAnimations.length > 0, "spawn must be animated before pointerup");
    assert.equal(s.puzzle.moves, 0, "held transaction is not committed");
    const p = await point(3.5, 1.5);
    await page.mouse.move(p.x, p.y);
    s = await state();
    assert(s.generatorSpawnAnimations.length > 0, "continuation must be exercised while the incoming cargo still animates");
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "blocker").x, 3, "the already held block must continue dragging during another block's spawn");
    await page.waitForTimeout(320);
    const frames = (await rendered()).frames;
    assert(frames.some((frame) => frame.blocks.some(({ id, ty }) => id === "cargo-a" && ty < frames.at(-1).blocks.find(({ id: id2 }) => id2 === "blocker").ty)), "partially translated cargo render frame required");
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      document.querySelector("canvas").dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: game.activePointer }));
    });
    await page.mouse.up();
    s = await state();
    assert.equal(s.puzzle.generators[0].remaining, 2);
    assert(!s.puzzle.blocks.some(({ id }) => id === "cargo-a"));
    assert.equal(s.generatorSpawnAnimations.length, 0);
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "blocker").y, 0);
    await drag([2.5, 0.5], [2.5, 1.5]);
    await page.waitForTimeout(730);
    await drag([2.5, 0.5], [3.5, 0.5]);
    assert.equal((await state()).puzzle.generators[0].remaining, 0);
  });

  await check("03b-cargo-continuation-turn-and-exit-during-refill", async () => {
    await openContinuousCargoScene();
    const pointerId = (await state()).activePointer;
    const trace = [];
    for (const [x, y] of [[2.5, 1.5], [2.5, 2.5], [3.5, 2.5]]) {
      if (trace.length === 1) {
        // Also exercise visible emergence, not just the initial response delay.
        // The pointer stays down throughout; the other tests cover no-wait input.
        await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState()
          .generatorSpawnAnimations.some(({ blockId, phase }) => blockId === "cargo-b" && phase === "sliding"),
        undefined, { polling: "raf", timeout: 2000 });
      }
      await pointerMoveTo(x, y);
      const s = await state();
      const cargo = s.puzzle.blocks.find(({ id }) => id === "cargo-a");
      assert.deepEqual([cargo.x, cargo.y], [x - 0.5, y - 0.5], "same pointer continues beyond first cell and turns during refill");
      assert.equal(s.activePointer, pointerId);
      assert.equal(s.selectedId, "cargo-a");
      assert.equal(s.puzzle.moves, 0, "continuation does not create intermediate drag commits");
      assert.equal(s.puzzle.generators[0].remaining, 0);
      assert(s.generatorSpawnAnimations.some(({ blockId }) => blockId === "cargo-b"), "refill is still visibly animating during the continued gesture");
      assertNoVisibleOverlap(s);
      trace.push(cargoTrace(s));
    }
    assert(trace.some(({ animations }) => animations.some(({ phase }) => phase === "sliding")),
      "at least one continued pointer move occurs while the incoming cargo visibly slides");
    await pointerMoveTo(4.5, 2.5);
    let s = await state();
    assert(!s.puzzle.blocks.some(({ id }) => id === "cargo-a"), "the held cargo can exit before incoming cargo's animation ends");
    assert(s.generatorSpawnAnimations.some(({ blockId }) => blockId === "cargo-b"));
    assert.equal(s.puzzle.cleared, 1);
    assert.equal(s.puzzle.moves, 1);
    assert.equal(s.puzzle.generators[0].remaining, 0);
    assertNoVisibleOverlap(s);
    trace.push(cargoTrace(s));
    await page.mouse.up();
    s = await state();
    assert.equal(s.puzzle.moves, 1, "terminal pointerup cannot count a second drag");
    return { trace };
  });

  await check("03c-cargo-refill-collision-and-cancel-atomicity", async () => {
    await openContinuousCargoScene();
    const baseline = await state();
    const pointerId = baseline.activePointer;
    const trace = [];
    for (const [x, y] of [[2.5, 1.5], [2.5, 2.5], [3.5, 2.5], [2.5, 2.5], [2.5, 1.5]]) {
      await pointerMoveTo(x, y);
      const s = await state();
      const cargo = s.puzzle.blocks.find(({ id }) => id === "cargo-a");
      assert.deepEqual([cargo.x, cargo.y], [x - 0.5, y - 0.5]);
      assert.equal(s.activePointer, pointerId);
      assert.equal(s.puzzle.moves, 0);
      assert(s.generatorSpawnAnimations.some(({ blockId }) => blockId === "cargo-b"));
      assertNoVisibleOverlap(s);
      trace.push(cargoTrace(s));
    }
    await pointerMoveTo(2.5, 0.5);
    let s = await state();
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "cargo-a").y, 1, "cannot drag backwards through the newly occupied machine mouth");
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "cargo-b").y, 0);
    assert.equal(s.puzzle.generators[0].remaining, 0);
    assertNoVisibleOverlap(s);
    trace.push(cargoTrace(s));
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      document.querySelector("canvas").dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: game.activePointer }));
    });
    await page.mouse.up();
    s = await state();
    assert.equal(s.puzzle.moves, 0);
    assert.equal(s.puzzle.generators[0].head, 1);
    assert.equal(s.puzzle.generators[0].remaining, 1);
    assert.equal(s.puzzle.queuedBlocks[0].id, "cargo-b");
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "cargo-a").y, 0);
    assert(!s.puzzle.blocks.some(({ id }) => id === "cargo-b"));
    assert.equal(s.generatorSpawnAnimations.length, 0);
    assert(s.puzzle.remainingSeconds < baseline.puzzle.remainingSeconds, "cancellation must not restore elapsed wall time");
    assertNoVisibleOverlap(s);
    trace.push(cargoTrace(s));
    return { trace };
  });

  await check("03d-cargo-sparse-move-and-exit-during-refill", async () => {
    await openContinuousCargoScene();
    const pointerId = (await state()).activePointer;
    // One native pointermove (no Playwright interpolation) advances three cells,
    // with the refill occurring at its first integer step.
    await pointerMoveTo(2.5, 3.5);
    let s = await state();
    const pose = await heldPose();
    assert.deepEqual([s.puzzle.blocks.find(({ id }) => id === "cargo-a").x,
      s.puzzle.blocks.find(({ id }) => id === "cargo-a").y], [2, 3]);
    assert(pose.valid && Math.abs(pose.x - 2) < 0.01 && Math.abs(pose.y - 3) < 0.01);
    assert.equal(s.activePointer, pointerId);
    assert.equal(s.puzzle.moves, 0);
    assert.equal(s.puzzle.generators[0].remaining, 0);
    assert(s.generatorSpawnAnimations.some(({ blockId }) => blockId === "cargo-b"));
    assertNoVisibleOverlap(s);
    const trace = [{ ...cargoTrace(s), pose }];
    await pointerMoveTo(2.5, 2.5);
    await pointerMoveTo(4.5, 2.5);
    s = await state();
    assert(!s.puzzle.blocks.some(({ id }) => id === "cargo-a"));
    assert.equal(s.puzzle.cleared, 1);
    assert.equal(s.puzzle.moves, 1);
    assert(s.generatorSpawnAnimations.some(({ blockId }) => blockId === "cargo-b"));
    assertNoVisibleOverlap(s);
    trace.push(cargoTrace(s));
    await page.mouse.up();
    assert.equal((await state()).puzzle.moves, 1);
    return { trace };
  });

  await check("03e-sparse-refill-cavity-blocks-swept-visual", async () => {
    await scene("generator");
    // Keep this collision adversary out of the selectable demo list. It uses the
    // real constructor and native pointer path; no model moves are injected.
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      const level = structuredClone(game.model.level);
      level.generators[0].queueBlockIds = ["cargo-a"];
      level.blocks = [
        { id: "blocker", x: 2, y: 0, color: "red", shape: [[0, 0]] },
        { id: "cargo-a", x: 2, y: 0, color: "blue", shape: [[0, 0], [1, 0], [1, 1], [1, 2], [0, 2]] },
      ];
      game.model = new game.model.constructor(level);
      game.dirty = true;
      game.scheduleFrame();
    });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.model.snapshot().started);
    const start = await point(2.5, 0.5);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    const pointerId = (await state()).activePointer;
    await pointerMoveTo(2.5, 4.5);
    let s = await state();
    const pose = await heldPose();
    const block = s.puzzle.blocks.find(({ id }) => id === "blocker");
    assert.deepEqual([block.x, block.y], [2, 1], "new C-shaped cargo blocks the integer path at its bottom arm");
    assert(pose.valid && Math.abs(pose.x - 2) < 0.01 && Math.abs(pose.y - 1) < 0.01,
      "a valid but unreachable stale visual endpoint must not tunnel beyond the new cargo");
    assert.equal(s.puzzle.generators[0].head, 1);
    assert.equal(s.puzzle.generators[0].remaining, 0);
    assert.equal(s.activePointer, pointerId);
    assert.equal(s.puzzle.moves, 0);
    assert(s.generatorSpawnAnimations.some(({ blockId }) => blockId === "cargo-a"));
    assertNoVisibleOverlap(s);
    const trace = [{ ...cargoTrace(s), pose }];
    // The rejected downward displacement is consumed: turn left immediately,
    // then continue down past the arm without releasing or waiting for animation.
    await pointerMoveTo(1.5, 4.5);
    s = await state();
    assert.deepEqual([s.puzzle.blocks.find(({ id }) => id === "blocker").x,
      s.puzzle.blocks.find(({ id }) => id === "blocker").y], [1, 1]);
    const next = await point(1.5, 4.5);
    const cellPixels = await page.evaluate(() => {
      const state = window.__COLOR_ESCAPE__.getDebugState();
      return state.board.cell * state.viewportTransform.scale;
    });
    await page.mouse.move(next.x, next.y + cellPixels * 2);
    s = await state();
    assert.deepEqual([s.puzzle.blocks.find(({ id }) => id === "blocker").x,
      s.puzzle.blocks.find(({ id }) => id === "blocker").y], [1, 3]);
    assert.equal(s.activePointer, pointerId);
    assert.equal(s.puzzle.generators[0].head, 1);
    assert.equal(s.puzzle.moves, 0);
    assert(s.generatorSpawnAnimations.some(({ blockId }) => blockId === "cargo-a"));
    assert((await heldPose()).valid);
    assertNoVisibleOverlap(s);
    trace.push({ ...cargoTrace(s), pose: await heldPose() });
    await page.mouse.up();
    s = await state();
    assert.equal(s.puzzle.moves, 1, "sparse collision and the turn remain one effective drag");
    assert.equal(s.puzzle.generators[0].head, 1);
    return { trace };
  });

  await check("04-clock-enable-and-pause", async () => {
    await scene("bomb");
    const initial = await state();
    assert.equal(initial.puzzle.started, true, "v1.1 starts at playable frame");
    await page.waitForTimeout(550);
    let s = await state();
    assert(s.puzzle.blocks.find(({ id }) => id === "bomb").timedBombSeconds < 29.7);
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "frozen-bomb").timedBombSeconds, 30);
    await drag([0.5, 0.5], [-0.7, 0.5]);
    await page.waitForTimeout(120);
    s = await state();
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "frozen-bomb").frozen, 0);
    assert(s.puzzle.blocks.find(({ id }) => id === "frozen-bomb").timedBombSeconds < 30);
    const pause = await page.evaluate(() => {
      const g = window.__COLOR_ESCAPE__, s = g.getDebugState(), r = document.querySelector("canvas").getBoundingClientRect();
      return { x: r.left + s.viewportTransform.offsetX + 427 * s.viewportTransform.scale,
        y: r.top + s.viewportTransform.offsetY + 122 * s.viewportTransform.scale };
    });
    await page.mouse.click(pause.x, pause.y);
    const paused = await state();
    assert.equal(paused.screen, "paused");
    await page.waitForTimeout(500);
    assert.deepEqual((await state()).puzzle, paused.puzzle);
  });

  await check("04b-opening-spawn-before-clock", async () => {
    await page.evaluate(() => window.__REVISED_MECHANISM_SANDBOX__.loadScene("generator-open"));
    let s = await state();
    assert.equal(s.puzzle.generators[0].remaining, 1);
    assert.equal(s.puzzle.started, false);
    assert(s.generatorSpawnAnimations.length > 0);
    await page.waitForTimeout(200);
    assert.equal((await state()).puzzle.started, false, "entry spawn animation is not playable time");
    await page.waitForFunction(() => {
      const s = window.__COLOR_ESCAPE__.getDebugState();
      return s.puzzle.started && s.generatorSpawnAnimations.length === 0;
    });
    s = await state();
    assert.equal(s.generatorSpawnAnimations.length, 0);
    assert.equal(s.puzzle.started, true);
    assert(s.puzzle.remainingSeconds > 179.85, "clock starts only once entry motion actually completes");
    assert((await rendered()).frames.at(-1).blocks.some(({ id }) => id === "cargo-a"));
  });

  await check("05-grid-axis-pointer", async () => {
    await scene("grid");
    await drag([0.5, 2.5], [0.5, 3.5]);
    assert.equal((await state()).puzzle.blocks.find(({ id }) => id === "axis").y, 2);
    await drag([0.5, 2.5], [2.5, 2.5]);
    assert.equal((await state()).puzzle.blocks.find(({ id }) => id === "axis").x, 1);
    await drag([3.5, 2.5], [2.5, 2.5]);
    const s = await state();
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "blue").x, 2);
    assert.equal(s.puzzle.cleared, 0);
  });

  await check("06-full-width-narrow-rejection", async () => {
    await scene("narrow");
    await drag([2.5, 4.5], [2.5, 5.7]);
    assert.equal((await state()).puzzle.blocks.length, 1);
    assert.equal((await state()).puzzle.cleared, 0);
  });

  await check("07-full-width-wide-acceptance", async () => {
    await scene("wide");
    await drag([2.5, 4.5], [2.5, 5.7]);
    assert.equal((await state()).puzzle.complete, true);
    await page.waitForTimeout(1600);
    assert.equal((await state()).screen, "win");
    await page.click("#reset");
    assert.equal((await state()).screen, "playing");
  });

  await check("08-star-door-persistence-and-frozen-exit", async () => {
    await scene("star-ice");
    await drag([4.5, 1.5], [5.7, 1.5]);
    assert((await state()).puzzle.blocks.some(({ id }) => id === "orange"));
    await drag([0.5, 1.5], [-0.7, 1.5]);
    let s = await state();
    assert.equal(s.puzzle.gates.find(({ id }) => id === "star-gate").star, true);
    assert.equal(s.puzzle.gates.find(({ id }) => id === "ice-gate").frozen, 0);
    await drag([0.5, 3.5], [-0.7, 3.5]);
    s = await state();
    assert(!s.puzzle.blocks.some(({ id }) => id === "ordinary"));
    await drag([4.5, 1.5], [5.7, 1.5]);
    assert.equal((await state()).puzzle.complete, true);
  });

  await check("09-irregular-outline-and-seam", async () => {
    await scene("irregular");
    await drag([2.5, 2.5], [1.5, 2.5]);
    assert.equal((await state()).puzzle.blocks.find(({ id }) => id === "neck").x, 2);
    await drag([0.5, 0.5], [0.5, 1.5]);
    assert.equal((await state()).puzzle.blocks.find(({ id }) => id === "seam").y, 0);
  });

  await check("10-input-clock-slice-and-expiry-before-peel", async () => {
    await scene("bomb");
    const sliced = await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      const original = Object.getOwnPropertyDescriptor(performance, "now");
      let at = 1000;
      Object.defineProperty(performance, "now", { configurable: true, value: () => at });
      try {
        game.playableClockSlices.reset();
        for (const id of ["bomb", "frozen-bomb"]) game.model.getBlock(id).timedBombSeconds = 30;
        game.advanceRevisedClockBeforeMutation();
        at = 1750;
        game.selectedId = "key";
        game.attemptExit("left");
        const afterUnlock = game.model.snapshot();
        at = 2000;
        game.advanceRevisedClockBeforeMutation();
        return { afterUnlock, afterNextFrame: game.model.snapshot() };
      } finally {
        if (original) Object.defineProperty(performance, "now", original); else delete performance.now;
        game.playableClockSlices.reset();
      }
    });
    assert.equal(sliced.afterUnlock.blocks.find(({ id }) => id === "bomb").timedBombSeconds, 29.25);
    assert.equal(sliced.afterUnlock.blocks.find(({ id }) => id === "frozen-bomb").timedBombSeconds, 30);
    assert.equal(sliced.afterNextFrame.blocks.find(({ id }) => id === "bomb").timedBombSeconds, 29);
    assert.equal(sliced.afterNextFrame.blocks.find(({ id }) => id === "frozen-bomb").timedBombSeconds, 29.75);

    await scene("shell");
    const expired = await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      const original = Object.getOwnPropertyDescriptor(performance, "now");
      let at = 1000;
      Object.defineProperty(performance, "now", { configurable: true, value: () => at });
      try {
        game.playableClockSlices.reset();
        game.model.getBlock("shell").timedBombSeconds = 1;
        game.advanceRevisedClockBeforeMutation();
        at = 2100;
        game.selectedId = "shell";
        game.attemptExit("left");
        return game.model.snapshot();
      } finally {
        if (original) Object.defineProperty(performance, "now", original); else delete performance.now;
        game.playableClockSlices.reset();
      }
    });
    assert.equal(expired.failed, true);
    assert.deepEqual(expired.blocks.find(({ id }) => id === "shell").layers, ["red", "blue"]);
    assert.equal(expired.cleared, 0);
  });
  assert.deepEqual(await page.evaluate(() => window.__LOCAL_STORAGE_CALLS__), [], "sandbox must never read or write formal storage");
  assert.deepEqual(errors, []);
} catch (error) {
  evidence.push({ name: "failure", pass: false, message: error.stack });
  await screenshot("failure");
  process.exitCode = 1;
  console.error(error);
} finally {
  await writeFile(path.join(output, "report.json"), JSON.stringify({ ruleVersion: "1.2.1", profile: "revised-2026-09-21-v1.2", evidence, errors,
    note: "Pointer/Canvas validation of isolated scenes only; not 15-mechanism exhaustive coverage or candidate release certification." }, null, 2));
  await browser.close();
}
