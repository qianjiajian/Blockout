import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PLAYTEST_URL ?? process.env.BASE_URL ?? "http://127.0.0.1:5173/";
const viewport = { width: 496, height: 1078 };
const fixtureLevelId = 5;
const outputDir = path.resolve("playtest-results/generator-spawn-animation");
const failures = [];
const browserErrors = [];
const evidence = [];

const save = {
  schemaVersion: 1,
  currentLevel: fixtureLevelId,
  highestLevel: 200,
  coins: 1000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "timed-generator"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const near = (actual, expected, tolerance = 0.08) => (
  typeof actual === "number" && Math.abs(actual - expected) <= tolerance
);

const safeName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const debug = (page) => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());

const screenPoint = (page, logical) => {
  const size = page.viewportSize();
  const scale = Math.min(size.width / 496, size.height / 1078);
  return {
    x: (size.width - 496 * scale) / 2 + logical.x * scale,
    y: (size.height - 1078 * scale) / 2 + logical.y * scale,
  };
};

const blockPoint = (page, state, block) => screenPoint(page, {
  x: state.board.innerX + (block.x + block.shape[0][0] + 0.5) * state.board.cell,
  y: state.board.innerY + (block.y + block.shape[0][1] + 0.5) * state.board.cell,
});

const cellPoint = (page, state, x, y) => screenPoint(page, {
  x: state.board.innerX + (x + 0.5) * state.board.cell,
  y: state.board.innerY + (y + 0.5) * state.board.cell,
});

const nativePointer = (session) => ({
  hover: (point) => session.send("Input.dispatchMouseEvent", {
    type: "mouseMoved", x: point.x, y: point.y, button: "none", buttons: 0, pointerType: "mouse",
  }),
  down: (point) => session.send("Input.dispatchMouseEvent", {
    type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1, pointerType: "mouse",
  }),
  move: (point) => session.send("Input.dispatchMouseEvent", {
    type: "mouseMoved", x: point.x, y: point.y, button: "left", buttons: 1, pointerType: "mouse",
  }),
  up: (point) => session.send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1, pointerType: "mouse",
  }),
});

const createPage = async (browser, label) => {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`[${label}] ${message.text()}`);
  });
  page.on("pageerror", (error) => browserErrors.push(`[${label}] ${error.message}`));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate((value) => localStorage.setItem("color-escape-save-v1", JSON.stringify(value)), save);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState != null);
  return page;
};

const installRenderProbe = async (page) => page.evaluate(() => {
  const game = window.__COLOR_ESCAPE__;
  if (!game?.drawBoard || !game?.drawBlock || !game?.drawIndependentGenerator || !game?.ctx) {
    throw new Error("Generator-spawn E2E: render methods are unavailable for observation");
  }
  const probe = {
    frames: [],
    current: undefined,
    activeCargoId: undefined,
    clipActive: false,
    clipStack: [],
  };
  globalThis.__GENERATOR_SPAWN_RENDER_PROBE__ = probe;

  const originalDrawBoard = game.drawBoard.bind(game);
  game.drawBoard = (...args) => {
    const frame = { at: performance.now(), blocks: [], generators: [], clippedCargoIds: [] };
    probe.current = frame;
    probe.frames.push(frame);
    if (probe.frames.length > 240) probe.frames.shift();
    try {
      return originalDrawBoard(...args);
    } finally {
      probe.activeCargoId = undefined;
      probe.current = undefined;
    }
  };

  const originalDrawBlock = game.drawBlock.bind(game);
  game.drawBlock = (block, ...args) => {
    const cargo = typeof block?.id === "string" && block.id.startsWith("spawn-e2e-cargo-");
    if (cargo && probe.current) {
      probe.current.blocks.push({
        id: block.id,
        x: block.x,
        y: block.y,
        shape: block.shape.map((cell) => [...cell]),
      });
      if (probe.clipActive) probe.current.clippedCargoIds.push(block.id);
      probe.activeCargoId = block.id;
    }
    try {
      return originalDrawBlock(block, ...args);
    } finally {
      if (cargo) probe.activeCargoId = undefined;
    }
  };

  const originalDrawGenerator = game.drawIndependentGenerator.bind(game);
  game.drawIndependentGenerator = (generator, preview, ...args) => {
    if (probe.current && typeof generator?.id === "string" && generator.id.startsWith("spawn-e2e-generator-")) {
      probe.current.generators.push({
        id: generator.id,
        remaining: generator.remaining,
        previewBlockId: preview?.id,
      });
    }
    return originalDrawGenerator(generator, preview, ...args);
  };

  const context = game.ctx;
  const originalSave = context.save.bind(context);
  context.save = (...args) => {
    probe.clipStack.push(probe.clipActive);
    return originalSave(...args);
  };
  const originalRestore = context.restore.bind(context);
  context.restore = (...args) => {
    const result = originalRestore(...args);
    probe.clipActive = probe.clipStack.pop() ?? false;
    return result;
  };
  const originalClip = context.clip.bind(context);
  context.clip = (...args) => {
    probe.clipActive = true;
    if (probe.current && probe.activeCargoId) {
      probe.current.clippedCargoIds.push(probe.activeCargoId);
    }
    return originalClip(...args);
  };
});

const clearRenderProbe = (page) => page.evaluate(() => {
  if (globalThis.__GENERATOR_SPAWN_RENDER_PROBE__) {
    globalThis.__GENERATOR_SPAWN_RENDER_PROBE__.frames = [];
  }
});

const fixtureFor = (side, queueLength = 2) => {
  const isLeft = side === "left";
  const generatorId = `spawn-e2e-generator-${side}`;
  const cargoIds = Array.from({ length: queueLength }, (_, index) => `spawn-e2e-cargo-${side}-${index + 1}`);
  const firstShape = isLeft
    ? [[1, 0], [2, 0], [3, 0]] // H3 with a non-zero inward shape origin.
    : [[0, 1], [0, 2], [1, 2]]; // L with a non-zero inward shape origin.
  const firstColor = isLeft ? "yellow" : "cyan";
  const spawn = isLeft ? [0, 3] : [4, 0];
  const blocker = isLeft
    ? { id: "spawn-e2e-blocker", x: 1, y: 3, shape: [[0, 0], [1, 0], [2, 0]], color: "purple" }
    : { id: "spawn-e2e-blocker", x: 4, y: 1, shape: [[0, 0]], color: "purple" };
  return {
    id: fixtureLevelId,
    name: `Generator spawn ${side} fixture`,
    difficulty: "normal",
    timeSeconds: 120,
    reward: 0,
    parMoves: 4,
    width: 8,
    height: 8,
    gates: [],
    blocks: [
      { id: "spawn-e2e-probe", x: 6, y: 6, shape: [[0, 0]], color: "green" },
      blocker,
      {
        id: cargoIds[0], x: 0, y: 0, shape: firstShape, color: firstColor,
      },
      ...cargoIds.slice(1).map((id, index) => ({
        id, x: 0, y: 0, shape: [[0, 0]], color: index % 2 ? "red" : "blue",
      })),
    ],
    generators: [{
      id: generatorId,
      side,
      offset: isLeft ? 3 : 4,
      spawn,
      queueBlockIds: cargoIds,
      trigger: "move",
    }],
  };
};

const simultaneousFixture = () => ({
  id: fixtureLevelId,
  name: "Simultaneous final generator spawn fixture",
  difficulty: "normal",
  timeSeconds: 120,
  reward: 0,
  parMoves: 2,
  width: 8,
  height: 8,
  gates: [],
  blocks: [
    { id: "spawn-e2e-probe", x: 6, y: 6, shape: [[0, 0]], color: "green" },
    { id: "spawn-e2e-cargo-left-final", x: 0, y: 0, shape: [[1, 0], [2, 0], [3, 0]], color: "yellow" },
    { id: "spawn-e2e-cargo-top-final", x: 0, y: 0, shape: [[0, 1], [0, 2], [1, 2]], color: "cyan" },
  ],
  generators: [
    {
      id: "spawn-e2e-generator-left-final",
      side: "left",
      offset: 3,
      spawn: [0, 3],
      queueBlockIds: ["spawn-e2e-cargo-left-final"],
      trigger: "move",
    },
    {
      id: "spawn-e2e-generator-top-final",
      side: "top",
      offset: 4,
      spawn: [4, 0],
      queueBlockIds: ["spawn-e2e-cargo-top-final"],
      trigger: "move",
    },
  ],
});

const loadFixture = async (page, fixture) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), fixtureLevelId);
  await page.waitForFunction((id) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "playing" && state?.puzzle?.levelId === id;
  }, fixtureLevelId);
  await page.evaluate(async (level) => {
    const game = window.__COLOR_ESCAPE__;
    const { PuzzleModel } = await import("/src/core/PuzzleModel.ts");
    game.model = new PuzzleModel(level);
    game.selectedId = undefined;
    game.activePointer = undefined;
    game.dragVisual = undefined;
    game.selectionAssist = undefined;
    game.blockedBlockId = undefined;
    game.blockerFocusBlockId = undefined;
    if (Array.isArray(game.generatorSpawnAnimations)) game.generatorSpawnAnimations = [];
    game.dirty = true;
    game.scheduleFrame();
  }, fixture);
  await page.waitForTimeout(90);
  await clearRenderProbe(page);
  const state = await debug(page);
  assert(state.screen === "playing" && state.puzzle.levelId === fixtureLevelId,
    `Generator-spawn E2E: fixture did not open in play ${JSON.stringify({ screen: state.screen, level: state.puzzle.levelId })}`);
  return state;
};

const dragBlockTo = async (page, input, blockId, targetX, targetY) => {
  const before = await debug(page);
  const block = before.puzzle.blocks.find((candidate) => candidate.id === blockId);
  assert(block, `Generator-spawn E2E: active block ${blockId} is missing`);
  const start = blockPoint(page, before, block);
  const target = cellPoint(page, before, targetX + block.shape[0][0], targetY + block.shape[0][1]);
  await input.hover(start);
  await input.down(start);
  await input.move(target);
  await input.up(target);
  return debug(page);
};

const waitForAnimationAge = async (page, blockId, seconds) => {
  await page.waitForFunction(({ id, target }) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    const animations = state?.generatorSpawnAnimations;
    if (!Array.isArray(animations)) return false;
    const animation = animations.find((candidate) => candidate.blockId === id);
    if (!animation) return false;
    const age = animation.age > 10 ? animation.age / 1000 : animation.age;
    return age >= target;
  }, { id: blockId, target: seconds }, { timeout: 3_500 });
};

const animationFor = (state, blockId) => {
  assert(Array.isArray(state.generatorSpawnAnimations),
    "Generator-spawn E2E: runtime implementation is not integrated; getDebugState().generatorSpawnAnimations is missing");
  return state.generatorSpawnAnimations.find((candidate) => candidate.blockId === blockId);
};

const generatorView = (frame, generatorId) => frame?.generators?.find((candidate) => candidate.id === generatorId);
const cargoViews = (frame, blockId) => frame?.blocks?.filter((candidate) => candidate.id === blockId) ?? [];

const captureSample = async (page, caseName, label, blockId, settleMs = 24, saveScreenshot = false) => {
  if (settleMs > 0) await page.waitForTimeout(settleMs);
  // Keep the animation clock and its most recently painted generator face in
  // one browser task. Separate page.evaluate calls can straddle a 30fps frame
  // boundary (especially the exact 100ms count-change boundary).
  const { state, frame } = await page.evaluate(() => {
    const frames = globalThis.__GENERATOR_SPAWN_RENDER_PROBE__?.frames ?? [];
    return {
      state: window.__COLOR_ESCAPE__.getDebugState(),
      frame: frames.at(-1),
    };
  });
  const file = `${safeName(caseName)}-${label}.png`;
  if (saveScreenshot) await page.screenshot({ path: path.join(outputDir, file) });
  const sample = {
    label,
    screenshot: saveScreenshot ? file : undefined,
    animation: animationFor(state, blockId),
    generators: frame?.generators ?? [],
    cargo: frame?.blocks ?? [],
    clippedCargoIds: frame?.clippedCargoIds ?? [],
    puzzle: {
      moves: state.puzzle.moves,
      generators: state.puzzle.generators.map(({ id, head, remaining, nextBlockId }) => ({ id, head, remaining, nextBlockId })),
      cargo: state.puzzle.blocks.filter(({ id }) => id.startsWith("spawn-e2e-cargo-")).map(({ id, x, y }) => ({ id, x, y })),
    },
  };
  return { state, frame, sample };
};

const assertOldGeneratorFace = (frame, generatorId, blockId, oldCount, label) => {
  const face = generatorView(frame, generatorId);
  assert(face?.remaining === oldCount && face.previewBlockId === blockId,
    `Generator-spawn E2E: ${label} did not retain old count/preview ${JSON.stringify(face)}`);
};

const assertBlockedInput = async (page, input, label) => {
  const before = await debug(page);
  const probe = before.puzzle.blocks.find((candidate) => candidate.id === "spawn-e2e-probe");
  assert(probe, `Generator-spawn E2E: ${label} input probe is missing`);
  await dragBlockTo(page, input, probe.id, probe.x - 1, probe.y);
  const after = await debug(page);
  const result = after.puzzle.blocks.find((candidate) => candidate.id === probe.id);
  assert(result?.x === probe.x && result?.y === probe.y && after.puzzle.moves === before.puzzle.moves,
    `Generator-spawn E2E: ${label} accepted input during spawn ${JSON.stringify({ before: { x: probe.x, y: probe.y, moves: before.puzzle.moves }, after: { x: result?.x, y: result?.y, moves: after.puzzle.moves } })}`);
  assert(after.selectedId == null && after.activePointer == null,
    `Generator-spawn E2E: ${label} retained pointer ownership while input-locked`);
};

const runDirectionalTimeline = async (page, input, side) => {
  const fixture = fixtureFor(side, 2);
  let state = await loadFixture(page, fixture);
  const generatorId = fixture.generators[0].id;
  const [firstId, nextId] = fixture.generators[0].queueBlockIds;

  state = await dragBlockTo(page, input, "spawn-e2e-probe", 5, 6);
  const blockedGenerator = state.puzzle.generators.find(({ id }) => id === generatorId);
  assert(blockedGenerator?.remaining === 2 && blockedGenerator.head === 0 && blockedGenerator.nextBlockId === firstId,
    `Generator-spawn E2E: ${side} blocked attempt consumed cargo ${JSON.stringify(blockedGenerator)}`);
  assert(!animationFor(state, firstId), `Generator-spawn E2E: ${side} blocked attempt started an animation`);

  const blockerTarget = side === "left" ? [1, 4] : [3, 1];
  state = await dragBlockTo(page, input, "spawn-e2e-blocker", ...blockerTarget);
  assert(animationFor(state, firstId),
    `Generator-spawn E2E: ${side} committed release did not synchronously register its animation`);
  const releasedGenerator = state.puzzle.generators.find(({ id }) => id === generatorId);
  assert(releasedGenerator?.remaining === 1 && releasedGenerator.head === 1 && releasedGenerator.nextBlockId === nextId,
    `Generator-spawn E2E: ${side} clear spawn did not consume exactly one cargo ${JSON.stringify(releasedGenerator)}`);

  // The authored count changes at exactly 3/30s. Sample well before that
  // boundary. The pointer-up debug snapshot already proves synchronous
  // registration; wait for a painted frame at >=35ms and read it immediately.
  await waitForAnimationAge(page, firstId, 0.035);
  const pre100 = await captureSample(page, side, "pre-100ms", firstId, 0);
  const early = animationFor(pre100.state, firstId);
  assert(early && ["response-delay", "pre-roll"].includes(early.phase) && (early.slideProgress ?? 0) <= 0.05,
    `Generator-spawn E2E: ${side} pre-100ms phase/progress drifted ${JSON.stringify(early)}`);
  assert(early.previousRemaining === 2 && early.currentRemaining === 1
    && early.previousPreviewBlockId === firstId && early.nextPreviewBlockId === nextId && early.inputLocked === true,
  `Generator-spawn E2E: ${side} early transition contract drifted ${JSON.stringify(early)}`);
  assertOldGeneratorFace(pre100.frame, generatorId, firstId, 2,
    `${side} before 100ms (${JSON.stringify({ age: early.age, phase: early.phase })})`);
  assert(cargoViews(pre100.frame, firstId).length === 0,
    `Generator-spawn E2E: ${side} cargo appeared during the response delay`);

  // From frame 3 through frame 6 the decremented count is visible while the
  // preview well is deliberately blank and the cargo remains hidden.
  await waitForAnimationAge(page, firstId, 0.135);
  const post100 = await captureSample(page, side, "post-100ms-pre-233ms", firstId, 0);
  const blank = animationFor(post100.state, firstId);
  assert(blank?.phase === "pre-roll" && (blank.slideProgress ?? 0) <= 0.05,
    `Generator-spawn E2E: ${side} post-100ms blank phase drifted ${JSON.stringify(blank)}`);
  const blankFace = generatorView(post100.frame, generatorId);
  assert(blankFace?.remaining === 1 && blankFace.previewBlockId == null,
    `Generator-spawn E2E: ${side} did not show new count with a blank preview ${JSON.stringify(blankFace)}`);
  assert(cargoViews(post100.frame, firstId).length === 0,
    `Generator-spawn E2E: ${side} cargo appeared before the 233ms reveal`);

  await waitForAnimationAge(page, firstId, 0.235);
  const at233 = await captureSample(page, side, "233ms", firstId, 0);
  const entering = animationFor(at233.state, firstId);
  assert(entering?.phase === "sliding" && entering.slideProgress > 0 && entering.slideProgress < 0.9,
    `Generator-spawn E2E: ${side} was not partly sliding at ~233ms ${JSON.stringify(entering)}`);
  const enteringViews = cargoViews(at233.frame, firstId);
  assert(enteringViews.length > 0, `Generator-spawn E2E: ${side} first visibility was absent at ~233ms`);
  assert(enteringViews.some((block) => side === "left" ? block.x < fixture.generators[0].spawn[0] : block.y < fixture.generators[0].spawn[1]),
    `Generator-spawn E2E: ${side} did not enter from outside its rim ${JSON.stringify(enteringViews)}`);
  assert(at233.frame?.clippedCargoIds?.includes(firstId),
    `Generator-spawn E2E: ${side} partial cargo was not clipped to the board edge`);

  await waitForAnimationAge(page, firstId, 0.368);
  const at367 = await captureSample(page, side, "367ms", firstId, 0);
  const settled = animationFor(at367.state, firstId);
  assert(settled && (settled.phase === "settled-wait" || settled.slideProgress >= 0.94),
    `Generator-spawn E2E: ${side} was not fully placed at ~367ms ${JSON.stringify(settled)}`);
  const settledViews = cargoViews(at367.frame, firstId);
  assert(settledViews.some((block) => near(block.x, fixture.generators[0].spawn[0]) && near(block.y, fixture.generators[0].spawn[1])),
    `Generator-spawn E2E: ${side} cargo was not on its exact authored anchor ${JSON.stringify(settledViews)}`);
  await assertBlockedInput(page, input, `${side} during settled-wait`);

  await page.waitForFunction((id) => {
    const animations = window.__COLOR_ESCAPE__?.getDebugState()?.generatorSpawnAnimations;
    return Array.isArray(animations) && !animations.some((candidate) => candidate.blockId === id);
  }, firstId, { timeout: 1_500 });
  const at600 = await captureSample(page, side, "600ms", firstId, 24, true);
  assert(!animationFor(at600.state, firstId),
    `Generator-spawn E2E: ${side} animation was still live after the 600ms handoff`);
  const nextFace = generatorView(at600.frame, generatorId);
  assert(nextFace?.remaining === 1 && nextFace.previewBlockId === nextId,
    `Generator-spawn E2E: ${side} next preview/count did not appear by ~600ms ${JSON.stringify(nextFace)}`);
  evidence.push({ case: `${side} directional timeline`, samples: [pre100.sample, post100.sample, at233.sample, at367.sample, at600.sample] });
};

const runSimultaneousFinalCargo = async (page, input) => {
  const fixture = simultaneousFixture();
  const initial = await loadFixture(page, fixture);
  animationFor(initial, "spawn-e2e-contract-probe");
  const released = await dragBlockTo(page, input, "spawn-e2e-probe", 5, 6);
  assert(released.generatorSpawnAnimations.length === 2,
    `Generator-spawn E2E: simultaneous release did not synchronously register two animations ${JSON.stringify(released.generatorSpawnAnimations)}`);
  await waitForAnimationAge(page, "spawn-e2e-cargo-left-final", 0.035);
  const pre100 = await captureSample(page, "simultaneous-final", "pre-100ms", "spawn-e2e-cargo-left-final", 0);
  const animations = pre100.state.generatorSpawnAnimations;
  assert(animations.length === 2 && new Set(animations.map(({ generatorId }) => generatorId)).size === 2,
    `Generator-spawn E2E: simultaneous generators did not own distinct animations ${JSON.stringify(animations)}`);
  for (const generator of fixture.generators) {
    const cargoId = generator.queueBlockIds[0];
    const animation = animations.find((candidate) => candidate.blockId === cargoId);
    assert(animation?.previousRemaining === 1 && animation.currentRemaining === 0 && animation.inputLocked === true,
      `Generator-spawn E2E: final cargo metadata drifted ${JSON.stringify(animation)}`);
    assertOldGeneratorFace(pre100.frame, generator.id, cargoId, 1,
      `${generator.side} final cargo before 100ms (${JSON.stringify({ age: animation.age, phase: animation.phase })})`);
  }

  await waitForAnimationAge(page, "spawn-e2e-cargo-left-final", 0.368);
  const at367 = await captureSample(page, "simultaneous-final", "367ms", "spawn-e2e-cargo-left-final", 0, true);
  for (const generator of fixture.generators) {
    assert(generatorView(at367.frame, generator.id),
      `Generator-spawn E2E: exhausted ${generator.side} chassis vanished before its last cargo settled`);
  }
  evidence.push({ case: "simultaneous final cargo", samples: [pre100.sample, at367.sample] });
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

const runCase = async (name, test) => {
  let page;
  try {
    page = await createPage(browser, name);
    await installRenderProbe(page);
    const session = await page.context().newCDPSession(page);
    await test(page, nativePointer(session));
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`FAIL ${name}: ${message}`);
  } finally {
    await page?.close();
  }
};

await runCase("left H3 internal-offset timeline", (page, input) => runDirectionalTimeline(page, input, "left"));
await runCase("top L internal-offset timeline", (page, input) => runDirectionalTimeline(page, input, "top"));
await runCase("simultaneous final cargo keeps chassis", runSimultaneousFinalCargo);

await browser.close();
await writeFile(path.join(outputDir, "evidence.json"), `${JSON.stringify({ baseUrl, viewport, evidence, failures, browserErrors }, null, 2)}\n`);

if (browserErrors.length) failures.push(`browser errors:\n${browserErrors.join("\n")}`);
if (failures.length) {
  throw new Error(`Generator-spawn animation E2E failed:\n${failures.join("\n")}\nEvidence: ${path.join(outputDir, "evidence.json")}`);
}

console.log(`Generator spawn animation passed: blocked queues, left/top entry timing, clipped first visibility, input lock, next preview, and simultaneous final cargo. Evidence: ${path.join(outputDir, "evidence.json")}`);
