import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const rootUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = path.resolve(process.env.PLAYTEST_OUTPUT ?? "playtest-results/experiments/revised-mechanism-art-2026-09-21/ui");
const filter = process.env.PLAYTEST_CASE_FILTER;
const artRoot = "assets/art/gameplay/mechanics/revised-reference-v1/";
const shutterRoot = "assets/art/gameplay/mechanics/shutter-nine-slice-v1/";
const shutterPieces = ["panel", "top-left", "top-right", "bottom-left", "bottom-right", "top", "bottom", "left", "right"];
const cornerSizes = { "top-left": [86, 78], "top-right": [80, 78], "bottom-left": [86, 84], "bottom-right": [80, 84] };
const colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];
const evidence = [], errors = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 1078 } });
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => {
  window.__ART_STORAGE_CALLS__ = [];
  for (const method of ["getItem", "setItem", "removeItem", "clear"]) {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function (...args) {
      window.__ART_STORAGE_CALLS__.push({ method, key: args[0] });
      return original.apply(this, args);
    };
  }
});
const state = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const frames = () => page.evaluate(() => window.__ART_RENDER__.frames);
const resetFrames = () => page.evaluate(() => { window.__ART_RENDER__.frames.length = 0; });
const point = (x, y) => page.evaluate(({ x, y }) => {
  const s = window.__COLOR_ESCAPE__.getDebugState(), r = document.querySelector("canvas").getBoundingClientRect();
  return { x: r.left + s.viewportTransform.offsetX + (s.board.innerX + x * s.board.cell) * s.viewportTransform.scale,
    y: r.top + s.viewportTransform.offsetY + (s.board.innerY + y * s.board.cell) * s.viewportTransform.scale };
}, { x, y });
const drag = async (from, to, release = true) => {
  const a = await point(...from), b = await point(...to);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  if (release) await page.mouse.up();
};
const load = async (key) => {
  await page.evaluate((key) => window.__REVISED_MECHANISM_SANDBOX__.loadScene(key), key);
  await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().art.revisedMechanisms.ready);
  await page.waitForTimeout(60);
  await resetFrames();
};
const fixture = async (extra) => {
  await page.evaluate((extra) => {
    const game = window.__COLOR_ESCAPE__;
    window.__REVISED_MECHANISM_SANDBOX__.loadScene("shell");
    const level = { id: 21, name: "原图接线隔离验证", difficulty: "normal", width: 6, height: 6,
      timeSeconds: 180, reward: 0, parMoves: 50, mechanismRules: "revised-2026-09-21-v1.2",
      gates: [], blocks: [{ id: "sentinel", x: 5, y: 5, color: "pink", shape: [[0, 0]] }], ...extra };
    game.model = new game.model.constructor(level);
    game.captureInitialGeneratorSpawns();
    game.revisedTransitions = [];
    game.mechanicPulses = [];
    game.dirty = true;
    game.scheduleFrame();
    window.__ART_RENDER__.frames.length = 0;
  }, extra);
  await page.waitForTimeout(65);
};
const check = async (name, action) => {
  if (filter && !name.includes(filter)) return;
  const details = await action();
  await page.screenshot({ path: path.join(output, `${name}.png`) });
  evidence.push({ name, pass: true, ...(details ? { details } : {}) });
  console.log(`PASS ${name}`);
};
const hasArt = (list, file) => list.some((frame) => frame.calls.some(({ src }) => src.endsWith(artRoot + file)));
const hasShutterArt = (list, name) => list.some((frame) => frame.calls.some(({ src }) => src.endsWith(`${shutterRoot}${name}.png`)));
const assertNoRetiredShutter = (list) => assert(!list.some((frame) => frame.calls.some(({ src }) =>
  src.endsWith("/shutter-strip.png") || src.endsWith("/mechanics/shutter-v1.png"))), "Neither retired strip nor ornate shutter frame may be drawn");

try {
  await page.goto(new URL("tools/revised-mechanisms.html", rootUrl).href, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.revisedMechanisms.ready);
  const activeArtPaths = await page.evaluate(async () => [
    ...(await import("/src/game/revisedMechanismArt.ts")).ACTIVE_REVISED_MECHANISM_ART_PATHS,
  ]);
  assert.equal(activeArtPaths.length, 71);
  await page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__, ctx = game.ctx;
    const originalRender = game.render.bind(game), originalImage = ctx.drawImage.bind(ctx), originalLabel = game.label.bind(game);
    let current;
    window.__ART_RENDER__ = { frames: [], midScreenshots: {} };
    game.render = (...args) => {
      current = { calls: [], labels: [], transitions: structuredClone(game.revisedTransitions ?? []),
        snapshot: game.model.snapshot(), board: game.boardLayout() };
      window.__ART_RENDER__.frames.push(current);
      if (window.__ART_RENDER__.frames.length > 180) window.__ART_RENDER__.frames.shift();
      try { return originalRender(...args); } finally {
        for (const transition of current.transitions) {
          const windows = { flip: [0.05, 0.18], shutter: [0.35, 0.55], lift: [0.12, 0.3],
            lock: [0.75, 0.9], generator: [0.8, 1.05] };
          const range = windows[transition.kind];
          if (range && transition.age >= range[0] && transition.age <= range[1]
            && !window.__ART_RENDER__.midScreenshots[transition.kind]) {
            window.__ART_RENDER__.midScreenshots[transition.kind] = document.querySelector("canvas").toDataURL("image/png");
          }
        }
        current = undefined;
      }
    };
    ctx.drawImage = (image, ...args) => {
      if (current) {
        const t = ctx.getTransform();
        current.calls.push({ src: image?.currentSrc || image?.src || "", args, alpha: ctx.globalAlpha,
          transform: [t.a, t.b, t.c, t.d, t.e, t.f] });
      }
      return originalImage(image, ...args);
    };
    game.label = (...args) => {
      current?.labels.push(args.slice(0, 5));
      return originalLabel(...args);
    };
  });

  await check("01-all-71-active-original-pngs-actually-drawn", async () => {
    const used = new Set();
    const remember = async () => {
      for (const frame of await frames()) for (const call of frame.calls) {
        for (const root of [artRoot, shutterRoot]) {
          const at = call.src.indexOf(root);
          if (at >= 0) used.add(call.src.slice(at));
        }
      }
      assertNoRetiredShutter(await frames());
    };
    for (const color of colors) for (const horizontal of [true, false]) for (const size of [1, 2, 3]) {
      const file = `flip-${color}-${horizontal ? "horizontal" : "vertical"}-${size}.png`;
      await fixture({ flipDoors: [{ id: "door", side: horizontal ? "top" : "left", offset: 1, size, color, initiallyOpen: false }] });
      assert(hasArt(await frames(), file), `${file} must reach real Canvas drawImage, not just the loader`);
      await remember();
    }
    await fixture({ coloredGrids: colors.map((color, i) => ({ id: color, color, cells: [[i % 4, Math.floor(i / 4)]] })),
      blocks: [{ id: "horizontal", x: 0, y: 3, color: "red", movementAxis: "horizontal", shape: [[0, 0], [1, 0]] },
        { id: "vertical", x: 3, y: 3, color: "blue", movementAxis: "vertical", shape: [[0, 0], [0, 1]] },
        { id: "bomb", x: 5, y: 5, color: "yellow", timedBombSeconds: 30, shape: [[0, 0]] }] });
    const markers = await frames();
    for (const color of colors) assert(hasArt(markers, `grid-${color}.png`));
    for (const file of ["axis-horizontal.png", "axis-vertical.png", "bomb-face.png"]) assert(hasArt(markers, file));
    await remember();
    await load("shell"); await page.waitForTimeout(40); await remember();
    for (const name of shutterPieces) assert(hasShutterArt(await frames(), name), `${name} must reach real Canvas drawImage`);
    await load("lift"); await page.waitForTimeout(40); await remember();
    for (const file of ["lift-frame.png", "lift-left.png", "lift-right.png"]) assert(hasArt(await frames(), file));
    assert.equal(used.size, 71);
    assert.deepEqual([...used].sort(), [...activeArtPaths].sort(), "Every active original path must be drawn exactly as inventoried, with no retired strip substituted");
    return { actualCanvasPngCount: used.size, paths: [...used].sort() };
  });

  await check("02-flip-and-shutter-have-real-mid-animation-draws", async () => {
    await load("shell");
    await drag([0.5, 1.5], [-0.7, 1.5]);
    await page.waitForTimeout(230);
    const sampled = await frames();
    assert(sampled.some(({ transitions }) => transitions.some(({ kind, age }) => kind === "flip" && age > 0 && age < 0.2)));
    assert(sampled.some(({ transitions, calls }) => transitions.some(({ kind, age }) => kind === "shutter" && age > 0 && age < 0.9)
      && calls.some(({ src }) => src.endsWith(`${shutterRoot}panel.png`))));
    assertNoRetiredShutter(sampled);
    const panelCalls = sampled.filter(({ transitions }) => transitions.some(({ kind, age }) => kind === "shutter" && age > 0))
      .flatMap(({ calls }) => calls.filter(({ src }) => src.endsWith(`${shutterRoot}panel.png`)));
    assert(panelCalls.length >= 3, "Opening must sample multiple intact-panel draws");
    assert(panelCalls.every(({ args }) => args.length === 4), "Animation translates the entire supplied panel");
    assert.equal(new Set(panelCalls.map(({ args }) => JSON.stringify([args[0], args[2], args[3]]))).size, 1,
      "The panel keeps its x, width and height throughout opening");
    assert(new Set(panelCalls.map(({ args }) => args[1])).size >= 3, "The unchanged panel must move through distinct y positions");
    assert(!(await state()).puzzle.blocks.find(({ id }) => id === "shell").timedBombSeconds);
    assert.equal((await state()).puzzle.blocks.find(({ id }) => id === "hidden-ice").frozen, 6);
    return { midFrames: sampled.filter(({ transitions }) => transitions.length).map(({ transitions, calls }) => ({ transitions,
      art: calls.filter(({ src }) => src.includes(artRoot) || src.includes(shutterRoot)) })).slice(0, 12) };
  });

  await check("03-lift-reveal-pause-and-cancel", async () => {
    await load("lift");
    await drag([0.5, 1.5], [0.5, 3.5]);
    await drag([2.5, 2.5], [3.5, 2.5], false);
    await page.waitForTimeout(90);
    let s = await state();
    assert.equal(s.puzzle.shutters[0].revealed, true);
    const beforeCancel = await frames();
    assert(beforeCancel.some(({ transitions, calls }) => transitions.some(({ kind, age }) => kind === "lift" && age > 0 && age < 0.5)
      && calls.some(({ src }) => src.endsWith("/lift-left.png"))));
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__;
      document.querySelector("canvas").dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: game.activePointer }));
    });
    await page.mouse.up();
    s = await state();
    assert.equal(s.puzzle.shutters[0].revealed, false);
    assert.equal(await page.evaluate(() => window.__COLOR_ESCAPE__.revisedTransitions.some(({ kind }) => kind === "lift")), false);
    // Trigger again, then use the real pause control and prove visual time freezes.
    await drag([2.5, 2.5], [3.5, 2.5]);
    const pause = await page.evaluate(() => {
      const s = window.__COLOR_ESCAPE__.getDebugState(), r = document.querySelector("canvas").getBoundingClientRect();
      return { x: r.left + s.viewportTransform.offsetX + 427 * s.viewportTransform.scale,
        y: r.top + s.viewportTransform.offsetY + 122 * s.viewportTransform.scale };
    });
    await page.mouse.click(pause.x, pause.y);
    assert.equal((await state()).screen, "paused");
    const frozen = await page.evaluate(() => structuredClone(window.__COLOR_ESCAPE__.revisedTransitions));
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(() => window.__COLOR_ESCAPE__.revisedTransitions), frozen);
    return { pausedTransitions: frozen };
  });

  await check("04-key-flight-arrival-and-lock-number", async () => {
    await fixture({ gates: [{ id: "red", side: "left", offset: 0, size: 1, color: "red" }],
      blocks: [{ id: "key", x: 0, y: 0, color: "red", shape: [[0, 0]], keyId: "blue" },
        { id: "locked", x: 3, y: 3, color: "green", shape: [[0, 0]], lockedBy: "blue", lockCount: 2 }] });
    await drag([0.5, 0.5], [-0.7, 0.5]);
    assert.equal((await state()).puzzle.blocks.find(({ id }) => id === "locked").lockCount, 1);
    await page.waitForTimeout(500);
    let sampled = await frames();
    assert(sampled.some(({ transitions }) => transitions.some(({ kind, age }) => kind === "lock" && age > 0.3 && age < 0.7)));
    assert(sampled.some(({ transitions, labels }) => transitions.some(({ kind, age }) => kind === "lock" && age < 0.95)
      && labels.some(([text]) => text === "2")), "old lock number is presentation-only until the key arrives");
    await page.waitForTimeout(620);
    sampled = await frames();
    assert(sampled.some(({ transitions }) => transitions.some(({ kind, age }) => kind === "lock" && age > 0.7 && age < 0.95)));
    assert(sampled.some(({ transitions, labels }) => transitions.some(({ kind, age }) => kind === "lock" && age >= 0.95)
      && labels.some(([text]) => text === "1")));
    return { keyFrames: sampled.filter(({ transitions }) => transitions.some(({ kind }) => kind === "lock"))
      .filter((_, i) => i % 5 === 0).map(({ transitions, calls, labels }) => ({ transitions,
        keyCalls: calls.filter(({ src }) => /key|lock/i.test(src)), labels: labels.filter(([text]) => text === "1" || text === "2") })) };
  });

  await check("05-reduced-motion-keeps-art-and-final-states", async () => {
    await load("shell");
    await page.evaluate(() => { window.__COLOR_ESCAPE__.save.reducedMotion = true; });
    await drag([0.5, 1.5], [-0.7, 1.5]);
    await page.waitForTimeout(120);
    const s = await state();
    assert.deepEqual(s.puzzle.flipDoors.map(({ open }) => open), [false, true]);
    assert.equal(s.puzzle.shutters[0].revealed, true);
    assert.equal(s.puzzle.blocks.find(({ id }) => id === "shell").timedBombSeconds, undefined);
    assert(hasArt(await frames(), "flip-red-vertical-1.png"));
    const reducedRegion = s.revisedMechanismAnimations.find(({ kind }) => kind === "shutter");
    assert(reducedRegion && reducedRegion.duration < 0.6,
      `reduced motion uses the shortened region timeline: ${JSON.stringify({ reducedRegion, preference: s.settings })}`);
    await page.waitForFunction(() => !window.__COLOR_ESCAPE__.getDebugState().revisedMechanismAnimations
      .some(({ kind }) => kind === "shutter"));
    assert(!(await frames()).at(-1).calls.some(({ src }) => src.includes(shutterRoot)), "reduced motion reveals without a lingering panel or nine-slice frame");
    assertNoRetiredShutter(await frames());
    await page.evaluate(() => { window.__COLOR_ESCAPE__.save.reducedMotion = false; });
  });

  await check("06-final-cargo-chassis-fragments-not-block-fragments", async () => {
    await fixture({ generators: [{ id: "machine", side: "top", offset: 2, rimSpan: 3, rimMount: "rim",
      rimAnchor: { x: 2.5, y: 0, quarterTurns: 0 }, spawn: [2, 0], queueBlockIds: ["cargo"] }],
    blocks: [{ id: "held", x: 2, y: 0, color: "red", shape: [[0, 0]] },
      { id: "cargo", x: 2, y: 0, color: "blue", shape: [[0, 0]] },
      { id: "sentinel", x: 5, y: 5, color: "pink", shape: [[0, 0]] }] });
    const chassis = await page.evaluate(() => window.__COLOR_ESCAPE__.art.videoParity.sideGenerator.src);
    await drag([2.5, 0.5], [2.5, 1.5]);
    assert.equal((await state()).puzzle.generators[0].remaining, 0);
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().revisedMechanismAnimations
      .some(({ kind, age }) => kind === "generator" && age > 0.85 && age < 1.15), undefined, { polling: "raf" });
    const sampled = await frames();
    const mid = sampled.find(({ transitions, calls }) => transitions.some(({ kind, age }) => kind === "generator" && age > 0.8)
      && calls.filter(({ src, args }) => src === chassis && args.length === 8).length === 18);
    assert(mid, "exhaustion splits the original chassis into eighteen real Canvas sprite fragments");
    assert(mid.calls.filter(({ src }) => src === chassis).every(({ alpha }) => alpha > 0 && alpha < 1));
    assert.equal(mid.snapshot.generators[0].remaining, 0);
    assert.equal(mid.snapshot.blocks.find(({ id }) => id === "cargo").y, 0);
    await page.waitForFunction(() => !window.__COLOR_ESCAPE__.getDebugState().revisedMechanismAnimations
      .some(({ kind }) => kind === "generator"));
    const s = await state();
    assert.equal(s.puzzle.generators[0].head, 1);
    assert.equal(s.puzzle.moves, 1);
    assert.equal(s.puzzle.blocks.filter(({ id }) => id === "cargo").length, 1);
    assert(!(await frames()).at(-1).calls.some(({ src }) => src === chassis), "exhausted machine is gone after its presentation ends");
    return { transition: mid.transitions.find(({ kind }) => kind === "generator"),
      fragmentCalls: mid.calls.filter(({ src }) => src === chassis) };
  });

  await check("07-fixed-corners-across-square-wide-and-tall-shutters", async () => {
    await fixture({
      shutters: [
        { id: "small", x: 0, y: 0, width: 1, height: 1, count: 1 },
        { id: "wide", x: 2, y: 0, width: 3, height: 1, count: 1 },
        { id: "tall", x: 0, y: 2, width: 1, height: 3, count: 1 },
      ],
      blocks: [
        { id: "small-hidden", x: 0, y: 0, color: "blue", shape: [[0, 0]], shutterId: "small" },
        { id: "wide-hidden", x: 2, y: 0, color: "red", shape: [[0, 0], [1, 0], [2, 0]], shutterId: "wide" },
        { id: "tall-hidden", x: 0, y: 2, color: "green", shape: [[0, 0], [0, 1], [0, 2]], shutterId: "tall" },
        { id: "sentinel", x: 5, y: 5, color: "pink", shape: [[0, 0]] },
      ],
    });
    const sampled = await frames();
    assertNoRetiredShutter(sampled);
    const frame = sampled.find(({ calls }) => calls.filter(({ src }) => src.endsWith(`${shutterRoot}panel.png`)).length === 3);
    assert(frame, "All three differently shaped regions must draw their real panels in the same frame");
    const cell = frame.board.cell, scale = Math.max(0, cell - Math.max(2, cell * 0.035) * 2) / 180;
    const panels = frame.calls.filter(({ src }) => src.endsWith(`${shutterRoot}panel.png`));
    assert.equal(new Set(panels.map(({ args }) => JSON.stringify(args.slice(2)))).size, 3);
    const corners = {};
    for (const [name, [width, height]] of Object.entries(cornerSizes)) {
      const calls = frame.calls.filter(({ src }) => src.endsWith(`${shutterRoot}${name}.png`));
      assert.equal(calls.length, 3, `All three ${name} pieces must be drawn`);
      for (const { args } of calls) {
        assert.equal(args.length, 4, "The complete corner PNG is used");
        assert(Math.abs(args[2] - width * scale) < 1e-7 && Math.abs(args[3] - height * scale) < 1e-7,
          `${name} must use one board scale regardless of region width or height`);
      }
      corners[name] = calls;
    }
    const edges = {};
    const overlap = Math.min(2, 24 * scale);
    const edgeSpecs = [
      ["top", 21, true, [2, 0, 129, 21], (x, y, w) => [x + 84 * scale - overlap, y, w - 162 * scale + 2 * overlap, 21 * scale]],
      ["bottom", 22, true, [2, 0, 129, 22], (x, y, w, h) => [x + 84 * scale - overlap, y + h - 22 * scale, w - 162 * scale + 2 * overlap, 22 * scale]],
      ["left", 20, false, [0, 2, 20, 131], (x, y, w, h) => [x, y + 77 * scale - overlap, 20 * scale, h - 157 * scale + 2 * overlap]],
      ["right", 21, false, [0, 2, 21, 130], (x, y, w, h) => [x + w - 21 * scale, y + 76 * scale - overlap, 21 * scale, h - 158 * scale + 2 * overlap]],
    ];
    for (const [name, thickness, horizontal, sourceRect, destination] of edgeSpecs) {
      const calls = frame.calls.filter(({ src }) => src.endsWith(`${shutterRoot}${name}.png`));
      assert.equal(calls.length, 3);
      for (const [index, { args }] of calls.entries()) {
        assert.equal(args.length, 8, `${name} must crop only the two source end pixels before stretching`);
        assert.deepEqual(args.slice(0, 4), sourceRect, `${name} must retain the full source thickness`);
        const target = args.slice(4), expected = destination(...panels[index].args);
        assert(target.every((value, at) => Math.abs(value - expected[at]) < 1e-7),
          `${name} must extend by the fixed underlap at both corner joints without moving the corners`);
        assert(Math.abs(target[horizontal ? 3 : 2] - thickness * scale) < 1e-7,
          `${name} may stretch only along its long direction`);
      }
      assert(new Set(calls.map(({ args }) => args[horizontal ? 6 : 7])).size >= 2, `${name} must adapt to different region spans`);
      edges[name] = calls;
    }
    return { boardCell: cell, frameScale: scale, edgeUnderlap: overlap, panels, corners, edges };
  });

  assert.deepEqual(await page.evaluate(() => window.__ART_STORAGE_CALLS__), []);
  assert.deepEqual(errors, []);
} catch (error) {
  evidence.push({ name: "failure", pass: false, message: error.stack });
  await page.screenshot({ path: path.join(output, "failure.png") });
  process.exitCode = 1;
  console.error(error);
} finally {
  const captured = await page.evaluate(() => window.__ART_RENDER__?.midScreenshots ?? {}).catch(() => ({}));
  for (const [kind, url] of Object.entries(captured)) {
    await writeFile(path.join(output, `mid-${kind}.png`), Buffer.from(url.split(",")[1], "base64"));
  }
  await writeFile(path.join(output, "report.json"), JSON.stringify({ ruleVersion: "1.2.1", evidence, errors,
    note: "Actual isolated Canvas/Pointer coverage; not a pixel-identical or phone-device claim. Existing 15-scene drag/mechanism suite must be run separately." }, null, 2));
  await browser.close();
}
