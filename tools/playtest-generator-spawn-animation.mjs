import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PLAYTEST_URL ?? process.env.BASE_URL ?? "http://127.0.0.1:5173/";
const viewport = { width: 496, height: 1078 };
const fixtureLevelId = 5;
const outputDir = path.resolve("playtest-results/generator-spawn-animation");
const caseFilter = process.env.PLAYTEST_CASE_FILTER?.toLowerCase();
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

const integerBlockPose = (block) => Number.isInteger(block?.x)
  && Number.isInteger(block?.y)
  && Array.isArray(block?.shape)
  && block.shape.every((cell) => Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger));

const generatorMouthCells = (generator, board) => {
  const anchor = generator.rimAnchor ?? (generator.side === "top"
    ? { x: generator.offset + 0.5, y: 0, quarterTurns: 0 }
    : generator.side === "right"
      ? { x: board.width, y: generator.offset + 0.5, quarterTurns: 1 }
      : generator.side === "bottom"
        ? { x: generator.offset + 0.5, y: board.height, quarterTurns: 2 }
        : { x: 0, y: generator.offset + 0.5, quarterTurns: 3 });
  assert(anchor && [0, 1, 2, 3].includes(anchor.quarterTurns),
    `Generator-spawn E2E: generator has no valid rimAnchor ${JSON.stringify(generator)}`);
  const vectors = anchor.quarterTurns === 0
    ? { tangent: [1, 0], inward: [0, 1] }
    : anchor.quarterTurns === 1
      ? { tangent: [0, 1], inward: [-1, 0] }
      : anchor.quarterTurns === 2
        ? { tangent: [-1, 0], inward: [0, -1] }
        : { tangent: [0, -1], inward: [1, 0] };
  return [-1, 0, 1].map((railOffset) => [
    anchor.x + vectors.tangent[0] * railOffset + vectors.inward[0] * 0.5 - 0.5,
    anchor.y + vectors.tangent[1] * railOffset + vectors.inward[1] * 0.5 - 0.5,
  ]).map((cell) => {
    assert(cell.every(Number.isInteger),
      `Generator-spawn E2E: rim rail did not resolve to an integer mouth cell ${JSON.stringify({ generator, cell })}`);
    return cell;
  });
};

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
    watchedBlockIds: [],
    watchedGeneratorIds: [],
    pixelRegion: undefined,
    pixelBaseline: undefined,
    previousPixels: undefined,
    captureImages: false,
  };
  globalThis.__GENERATOR_SPAWN_RENDER_PROBE__ = probe;

  const originalDrawBoard = game.drawBoard.bind(game);
  game.drawBoard = (...args) => {
    const frame = {
      at: performance.now(), blocks: [], generators: [], clippedCargoIds: [],
      animations: [], pixelDifference: 0, interframeDifference: 0, image: undefined,
    };
    probe.current = frame;
    probe.frames.push(frame);
    if (probe.frames.length > 240) probe.frames.shift();
    try {
      const result = originalDrawBoard(...args);
      frame.animations = game.getDebugState().generatorSpawnAnimations ?? [];
      if (probe.pixelRegion && probe.pixelBaseline) {
        const { x, y, width, height } = probe.pixelRegion;
        const pixels = game.ctx.getImageData(x, y, width, height).data;
        let difference = 0;
        let interframeDifference = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const delta = Math.abs(pixels[index] - probe.pixelBaseline[index])
            + Math.abs(pixels[index + 1] - probe.pixelBaseline[index + 1])
            + Math.abs(pixels[index + 2] - probe.pixelBaseline[index + 2])
            + Math.abs(pixels[index + 3] - probe.pixelBaseline[index + 3]);
          if (delta >= 48) difference += 1;
          if (probe.previousPixels) {
            const frameDelta = Math.abs(pixels[index] - probe.previousPixels[index])
              + Math.abs(pixels[index + 1] - probe.previousPixels[index + 1])
              + Math.abs(pixels[index + 2] - probe.previousPixels[index + 2])
              + Math.abs(pixels[index + 3] - probe.previousPixels[index + 3]);
            if (frameDelta >= 48) interframeDifference += 1;
          }
        }
        frame.pixelDifference = difference;
        frame.interframeDifference = interframeDifference;
        probe.previousPixels = pixels.slice();
      }
      if (probe.captureImages && frame.blocks.length) frame.image = game.ctx.canvas.toDataURL("image/png");
      return result;
    } finally {
      probe.activeCargoId = undefined;
      probe.current = undefined;
    }
  };

  const originalDrawBlock = game.drawBlock.bind(game);
  game.drawBlock = (block, ...args) => {
    const cargo = typeof block?.id === "string"
      && (block.id.startsWith("spawn-e2e-cargo-") || probe.watchedBlockIds.includes(block.id));
    if (cargo && probe.current) {
      const transform = game.ctx.getTransform();
      probe.current.blocks.push({
        id: block.id,
        x: block.x,
        y: block.y,
        shape: block.shape.map((cell) => [...cell]),
        transform: {
          a: transform.a, b: transform.b, c: transform.c,
          d: transform.d, e: transform.e, f: transform.f,
        },
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
    if (probe.current && typeof generator?.id === "string"
      && (generator.id.startsWith("spawn-e2e-generator-") || probe.watchedGeneratorIds.includes(generator.id))) {
      probe.current.generators.push({
        id: generator.id,
        head: generator.head,
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

const configureRenderProbe = (page, configuration) => page.evaluate((value) => {
  const game = window.__COLOR_ESCAPE__;
  const probe = globalThis.__GENERATOR_SPAWN_RENDER_PROBE__;
  if (!value.preserveFrames) probe.frames = [];
  probe.watchedBlockIds = value.blockIds ?? [];
  probe.watchedGeneratorIds = value.generatorIds ?? [];
  probe.captureImages = Boolean(value.captureImages);
  probe.pixelRegion = value.pixelRegion;
  probe.pixelBaseline = value.pixelRegion
    ? game.ctx.getImageData(
      value.pixelRegion.x,
      value.pixelRegion.y,
      value.pixelRegion.width,
      value.pixelRegion.height,
    ).data.slice()
    : undefined;
  probe.previousPixels = probe.pixelBaseline?.slice();
}, configuration);

const directionalFixture = {
  left: {
    firstShape: [[1, 0], [2, 0], [3, 0]],
    firstColor: "yellow",
    spawn: [-1, 3],
    blocker: { x: 0, y: 3, shape: [[0, 0], [1, 0], [2, 0]] },
    blockerTarget: [0, 4],
    offset: 3,
  },
  right: {
    firstShape: [[-2, 0], [-1, 0], [0, 0]],
    firstColor: "red",
    spawn: [7, 3],
    blocker: { x: 5, y: 3, shape: [[0, 0], [1, 0], [2, 0]] },
    blockerTarget: [5, 4],
    offset: 3,
  },
  top: {
    firstShape: [[0, 1], [0, 2], [1, 2]],
    firstColor: "cyan",
    spawn: [4, -1],
    blocker: { x: 4, y: 0, shape: [[0, 0], [0, 1], [1, 1]] },
    blockerTarget: [4, 2],
    offset: 4,
  },
  bottom: {
    firstShape: [[0, -2], [0, -1], [0, 0]],
    firstColor: "orange",
    spawn: [4, 7],
    blocker: { x: 4, y: 5, shape: [[0, 0], [0, 1], [0, 2]] },
    blockerTarget: [3, 5],
    offset: 4,
  },
};

const fixtureFor = (side, queueLength = 2) => {
  const configuration = directionalFixture[side];
  assert(configuration, `Generator-spawn E2E: unsupported fixture side ${side}`);
  const generatorId = `spawn-e2e-generator-${side}`;
  const cargoIds = Array.from({ length: queueLength }, (_, index) => `spawn-e2e-cargo-${side}-${index + 1}`);
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
      { id: "spawn-e2e-blocker", ...configuration.blocker, color: "purple" },
      {
        id: cargoIds[0], x: 0, y: 0, shape: configuration.firstShape, color: configuration.firstColor,
      },
      ...cargoIds.slice(1).map((id, index) => ({
        id, x: 0, y: 0, shape: configuration.firstShape, color: index % 2 ? "red" : "blue",
      })),
    ],
    generators: [{
      id: generatorId,
      side,
      offset: configuration.offset,
      spawn: configuration.spawn,
      queueBlockIds: cargoIds,
      trigger: "move",
    }],
    blockerTarget: configuration.blockerTarget,
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

const discoverOfficialGeneratorScenario = (page) => page.evaluate(async () => {
  const [{ LEVELS }, { PuzzleModel }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
  ]);
  const preferred = [...LEVELS].sort((left, right) => (
    Number(right.id === 71) - Number(left.id === 71) || left.id - right.id
  ));
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (const level of preferred) {
    if (!(level.generators?.some((generator) => (generator.trigger ?? "move") === "move"
      && generator.queueBlockIds.length >= 2))) continue;
    const initial = new PuzzleModel(level).snapshot();
    for (const block of initial.blocks) {
      for (const [dx, dy] of directions) {
        const model = new PuzzleModel(level);
        const before = model.snapshot();
        model.beginAction();
        if (!model.moveBlockStep(block.id, block.x + dx, block.y + dy)) {
          model.cancelAction();
          continue;
        }
        if (!model.commitAction()) continue;
        const after = model.snapshot();
        const released = after.generators.find((generator) => {
          const previous = before.generators.find(({ id }) => id === generator.id);
          return previous && generator.head === previous.head + 1;
        });
        if (!released) continue;
        const previous = before.generators.find(({ id }) => id === released.id);
        const cargoId = previous?.nextBlockId;
        const cargo = after.blocks.find(({ id }) => id === cargoId);
        if (!previous || !cargo || !released.nextBlockId) continue;
        return {
          levelId: level.id,
          action: { blockId: block.id, targetX: block.x + dx, targetY: block.y + dy },
          generatorId: released.id,
          cargoId,
          nextCargoId: released.nextBlockId,
          previousGenerator: previous,
          releasedGenerator: released,
          expectedCargo: cargo,
        };
      }
    }
  }
  return undefined;
});

const loadOfficialLevel = async (page, levelId) => {
  await page.evaluate((id) => window.__COLOR_ESCAPE__.loadLevel(id, true), levelId);
  await page.waitForFunction((id) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    return state?.screen === "playing" && state?.puzzle?.levelId === id;
  }, levelId);
  await page.waitForTimeout(90);
  await clearRenderProbe(page);
  return debug(page);
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

const dragBlockAlongPathAndExit = async (page, input, blockId, pathCells, side) => {
  const before = await debug(page);
  const block = before.puzzle.blocks.find((candidate) => candidate.id === blockId);
  assert(block, `Generator-spawn E2E: exit block ${blockId} is missing`);
  const start = blockPoint(page, before, block);
  await input.hover(start);
  await input.down(start);
  let pointer = start;
  for (const [x, y] of pathCells) {
    pointer = cellPoint(
      page,
      before,
      x + block.shape[0][0],
      y + block.shape[0][1],
    );
    await input.move(pointer);
    const current = await debug(page);
    if (!current.puzzle.blocks.some(({ id }) => id === blockId)) {
      await input.up(pointer);
      return debug(page);
    }
  }
  const last = pathCells.at(-1) ?? [block.x, block.y];
  const exitLogical = side === "right"
    ? { x: before.board.innerX + before.board.innerWidth + 18, y: before.board.innerY + (last[1] + block.shape[0][1] + 0.5) * before.board.cell }
    : side === "left"
      ? { x: before.board.innerX - 18, y: before.board.innerY + (last[1] + block.shape[0][1] + 0.5) * before.board.cell }
      : side === "bottom"
        ? { x: before.board.innerX + (last[0] + block.shape[0][0] + 0.5) * before.board.cell, y: before.board.innerY + before.board.innerHeight + 18 }
        : { x: before.board.innerX + (last[0] + block.shape[0][0] + 0.5) * before.board.cell, y: before.board.innerY - 18 };
  pointer = screenPoint(page, exitLogical);
  await input.move(pointer);
  await input.up(pointer);
  return debug(page);
};

const waitForAnimationAge = async (page, blockId, seconds) => {
  await page.waitForFunction(({ id, target }) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    const animations = state?.generatorSpawnAnimations;
    if (!Array.isArray(animations)) return false;
    const animation = animations.find((candidate) => candidate.blockId === id);
    const age = animation ? animation.age > 10 ? animation.age / 1000 : animation.age : -1;
    if (age >= target) return true;
    return (globalThis.__GENERATOR_SPAWN_RENDER_PROBE__?.frames ?? []).some((frame) => (
      frame.animations?.some((candidate) => candidate.blockId === id
        && (candidate.age > 10 ? candidate.age / 1000 : candidate.age) >= target)
    ));
  }, { id: blockId, target: seconds }, { timeout: 3_500 });
};

const animationFor = (state, blockId) => {
  assert(Array.isArray(state.generatorSpawnAnimations),
    "Generator-spawn E2E: runtime implementation is not integrated; getDebugState().generatorSpawnAnimations is missing");
  return state.generatorSpawnAnimations.find((candidate) => candidate.blockId === blockId);
};

const generatorView = (frame, generatorId) => frame?.generators?.find((candidate) => candidate.id === generatorId);
const cargoViews = (frame, blockId) => frame?.blocks?.filter((candidate) => candidate.id === blockId) ?? [];
const frameAnimationFor = (frame, blockId) => frame?.animations?.find((candidate) => candidate.blockId === blockId);

const captureSample = async (
  page,
  caseName,
  label,
  blockId,
  settleMs = 24,
  saveScreenshot = false,
  preferredPhase,
) => {
  if (settleMs > 0) await page.waitForTimeout(settleMs);
  // Keep the animation clock and its most recently painted generator face in
  // one browser task. Separate page.evaluate calls can straddle a 30fps frame
  // boundary (especially the exact 100ms count-change boundary).
  const { state, frame } = await page.evaluate(({ id, phase }) => {
    const frames = globalThis.__GENERATOR_SPAWN_RENDER_PROBE__?.frames ?? [];
    return {
      state: window.__COLOR_ESCAPE__.getDebugState(),
      frame: phase
        ? (phase === "sliding"
          ? frames.find((candidate) => candidate.animations?.some((animation) => (
            animation.blockId === id && animation.phase === phase
              && animation.slideProgress > 0.05 && animation.slideProgress < 0.9
          )))
          : phase === "settled-wait"
            ? frames.find((candidate) => candidate.animations?.some((animation) => (
              animation.blockId === id && animation.phase === phase
            )))
            : [...frames].reverse().find((candidate) => (
              candidate.animations?.some((animation) => animation.blockId === id && animation.phase === phase)
            ))) ?? frames.at(-1)
        : frames.at(-1),
    };
  }, { id: blockId, phase: preferredPhase });
  const file = `${safeName(caseName)}-${label}.png`;
  if (saveScreenshot) await page.screenshot({ path: path.join(outputDir, file) });
  const sample = {
    label,
    screenshot: saveScreenshot ? file : undefined,
    animation: frameAnimationFor(frame, blockId) ?? animationFor(state, blockId),
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

const pixelRegionFor = (board, block) => {
  const cells = block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
  const minX = Math.min(...cells.map(([x]) => x));
  const maxX = Math.max(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  const maxY = Math.max(...cells.map(([, y]) => y));
  const left = Math.max(board.innerX, board.innerX + minX * board.cell - 4);
  const top = Math.max(board.innerY, board.innerY + minY * board.cell - 4);
  const right = Math.min(board.innerX + board.innerWidth, board.innerX + (maxX + 1) * board.cell + 4);
  const bottom = Math.min(board.innerY + board.innerHeight, board.innerY + (maxY + 1) * board.cell + 4);
  return {
    x: Math.floor(left),
    y: Math.floor(top),
    width: Math.max(1, Math.ceil(right) - Math.floor(left)),
    height: Math.max(1, Math.ceil(bottom) - Math.floor(top)),
  };
};

const assertRenderedEntryHistory = async (page, { blockId, board, label }) => {
  const frames = await page.evaluate(() => globalThis.__GENERATOR_SPAWN_RENDER_PROBE__?.frames ?? []);
  const annotated = frames.map((frame) => ({
    frame,
    animation: frame.animations?.find((candidate) => candidate.blockId === blockId),
    calls: frame.blocks?.filter((candidate) => candidate.id === blockId) ?? [],
  }));
  const emerging = annotated.filter(({ animation }) => animation?.phase === "sliding"
    && animation.slideProgress > 0 && animation.slideProgress < 1);
  const calls = emerging.flatMap(({ frame, animation, calls: frameCalls }) => frameCalls.map((call) => ({
    ...call,
    animation,
    pixelDifference: frame.pixelDifference,
    interframeDifference: frame.interframeDifference,
    image: frame.image,
  })));
  assert(calls.length >= 2,
    `Generator-spawn E2E: ${label} was not rendered across multiple emerging frames`);
  assert(calls.every(integerBlockPose),
    `Generator-spawn E2E: ${label} sent fractional BlockState into drawBlock ${JSON.stringify(calls)}`);
  assert(calls.every(({ animation, transform }) => near(
    transform?.e,
    (animation?.translation?.x ?? 0) * board.cell,
    1.5,
  ) && near(
    transform?.f,
    (animation?.translation?.y ?? 0) * board.cell,
    1.5,
  )), `Generator-spawn E2E: ${label} did not express motion solely in Canvas CTM ${JSON.stringify(calls)}`);
  const visiblePartial = calls.find(({ animation, pixelDifference }) => animation.slideProgress > 0.05
    && animation.slideProgress < 0.95 && pixelDifference >= 24);
  assert(visiblePartial,
    `Generator-spawn E2E: ${label} had draw calls but no partial cargo pixels ${JSON.stringify(calls.map(({ animation, pixelDifference }) => ({ age: animation.age, progress: animation.slideProgress, pixelDifference })))}`);

  const lastEmerging = emerging.at(-1);
  const firstSettled = annotated.find(({ frame, animation }) => animation?.phase === "settled-wait"
    && frame.at >= (lastEmerging?.frame.at ?? 0));
  const lastCall = lastEmerging?.calls.at(-1);
  const settledCall = firstSettled?.calls.at(-1);
  assert(lastEmerging && firstSettled && lastCall && settledCall,
    `Generator-spawn E2E: ${label} did not paint both sides of the emerging-to-settled boundary`);
  assert(integerBlockPose(lastCall) && integerBlockPose(settledCall)
    && lastCall.x === settledCall.x && lastCall.y === settledCall.y,
  `Generator-spawn E2E: ${label} changed sprite pose at the phase boundary ${JSON.stringify({ lastCall, settledCall })}`);
  const ctmGap = Math.hypot(
    (lastCall.transform?.e ?? 0) - (settledCall.transform?.e ?? 0),
    (lastCall.transform?.f ?? 0) - (settledCall.transform?.f ?? 0),
  );
  assert(lastEmerging.frame.pixelDifference >= 24 && firstSettled.frame.pixelDifference >= 24
    && lastEmerging.animation.slideProgress >= 0.35
    // At 30fps the four-frame emerging phase can legitimately advance by
    // one quarter of a three-cell start vector between adjacent paints.
    && ctmGap <= board.cell * 0.85
    && firstSettled.frame.at - lastEmerging.frame.at <= 90,
  `Generator-spawn E2E: ${label} popped at the emerging-to-settled boundary ${JSON.stringify({
    emergingPixels: lastEmerging.frame.pixelDifference,
    settledPixels: firstSettled.frame.pixelDifference,
    boundaryPixelDelta: firstSettled.frame.interframeDifference,
    ctmGap,
    frameGapMs: firstSettled.frame.at - lastEmerging.frame.at,
  })}`);
  return {
    frames,
    visiblePartial,
    continuity: {
      emergingProgress: lastEmerging.animation.slideProgress,
      emergingPixels: lastEmerging.frame.pixelDifference,
      settledPixels: firstSettled.frame.pixelDifference,
      boundaryPixelDelta: firstSettled.frame.interframeDifference,
      ctmGap,
      frameGapMs: firstSettled.frame.at - lastEmerging.frame.at,
    },
  };
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

  state = await dragBlockTo(page, input, "spawn-e2e-blocker", ...fixture.blockerTarget);
  assert(animationFor(state, firstId),
    `Generator-spawn E2E: ${side} committed release did not synchronously register its animation`);
  const releasedGenerator = state.puzzle.generators.find(({ id }) => id === generatorId);
  assert(releasedGenerator?.remaining === 1 && releasedGenerator.head === 1 && releasedGenerator.nextBlockId === nextId,
    `Generator-spawn E2E: ${side} clear spawn did not consume exactly one cargo ${JSON.stringify(releasedGenerator)}`);

  // The authored count changes at exactly 3/30s. Sample well before that
  // boundary. The pointer-up debug snapshot already proves synchronous
  // registration; wait for a painted frame at >=35ms and read it immediately.
  await waitForAnimationAge(page, firstId, 0.035);
  const pre100 = await captureSample(page, side, "pre-100ms", firstId, 0, false, "response-delay");
  const early = frameAnimationFor(pre100.frame, firstId) ?? animationFor(pre100.state, firstId);
  assert(early && ["response-delay", "pre-roll"].includes(early.phase) && (early.slideProgress ?? 0) <= 0.05,
    `Generator-spawn E2E: ${side} pre-100ms phase/progress drifted ${JSON.stringify(early)}`);
  assert(early.previousRemaining === 2 && early.currentRemaining === 1
    && early.previousPreviewBlockId === firstId && early.nextPreviewBlockId === nextId && early.inputLocked === true,
  `Generator-spawn E2E: ${side} early transition contract drifted ${JSON.stringify(early)}`);
  assertOldGeneratorFace(pre100.frame, generatorId, firstId, 2,
    `${side} before 100ms (${JSON.stringify({ age: early.age, phase: early.phase })})`);
  assert(cargoViews(pre100.frame, firstId).length === 0,
    `Generator-spawn E2E: ${side} cargo appeared during the response delay`);
  const authoredCargo = fixture.blocks.find(({ id }) => id === firstId);
  const pixelRegion = pixelRegionFor(pre100.state.board, {
    ...authoredCargo,
    x: fixture.generators[0].spawn[0],
    y: fixture.generators[0].spawn[1],
  });
  await configureRenderProbe(page, {
    blockIds: [firstId],
    generatorIds: [generatorId],
    pixelRegion,
    captureImages: true,
  });

  // From frame 3 through frame 6 the decremented count is visible while the
  // preview well is deliberately blank and the cargo remains hidden.
  await waitForAnimationAge(page, firstId, 0.135);
  const post100 = await captureSample(page, side, "post-100ms-pre-233ms", firstId, 0, false, "pre-roll");
  const blank = frameAnimationFor(post100.frame, firstId) ?? animationFor(post100.state, firstId);
  assert(blank?.phase === "pre-roll" && (blank.slideProgress ?? 0) <= 0.05,
    `Generator-spawn E2E: ${side} post-100ms blank phase drifted ${JSON.stringify(blank)}`);
  const blankFace = generatorView(post100.frame, generatorId);
  assert(blankFace?.remaining === 1 && blankFace.previewBlockId == null,
    `Generator-spawn E2E: ${side} did not show new count with a blank preview ${JSON.stringify(blankFace)}`);
  assert(cargoViews(post100.frame, firstId).length === 0,
    `Generator-spawn E2E: ${side} cargo appeared before the 233ms reveal`);
  await assertBlockedInput(page, input, `${side} during input lock`);

  await waitForAnimationAge(page, firstId, 0.235);
  const at233 = await captureSample(page, side, "233ms", firstId, 0, false, "sliding");
  const entering = frameAnimationFor(at233.frame, firstId) ?? animationFor(at233.state, firstId);
  assert(entering?.phase === "sliding" && entering.slideProgress > 0 && entering.slideProgress < 0.9,
    `Generator-spawn E2E: ${side} was not partly sliding at ~233ms ${JSON.stringify(entering)}`);
  const enteringViews = cargoViews(at233.frame, firstId);
  assert(enteringViews.length > 0, `Generator-spawn E2E: ${side} first visibility was absent at ~233ms`);
  assert(enteringViews.every(integerBlockPose),
    `Generator-spawn E2E: ${side} passed fractional BlockState coordinates into formal sprite matching ${JSON.stringify(enteringViews)}`);
  assert(enteringViews.some((block) => side === "left" || side === "right"
    ? Math.abs(block.transform?.e ?? 0) > 0.5
    : Math.abs(block.transform?.f ?? 0) > 0.5),
  `Generator-spawn E2E: ${side} did not express partial entry through Canvas translation ${JSON.stringify(enteringViews)}`);
  assert(at233.frame?.clippedCargoIds?.includes(firstId),
    `Generator-spawn E2E: ${side} partial cargo was not clipped to the board edge`);
  assert(at233.frame?.pixelDifference >= 24,
    `Generator-spawn E2E: ${side} drawBlock call produced no partial Canvas pixels ${at233.frame?.pixelDifference}`);

  await waitForAnimationAge(page, firstId, 0.368);
  const at367 = await captureSample(page, side, "367ms", firstId, 0, false, "settled-wait");
  const settled = frameAnimationFor(at367.frame, firstId) ?? animationFor(at367.state, firstId);
  assert(settled && (settled.phase === "settled-wait" || settled.slideProgress >= 0.94),
    `Generator-spawn E2E: ${side} was not fully placed at ~367ms ${JSON.stringify(settled)}`);
  const settledViews = cargoViews(at367.frame, firstId);
  assert(settledViews.some((block) => near(block.x, fixture.generators[0].spawn[0]) && near(block.y, fixture.generators[0].spawn[1])),
    `Generator-spawn E2E: ${side} cargo was not on its exact authored anchor ${JSON.stringify(settledViews)}`);
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
  const finalBlock = at600.state.puzzle.blocks.find(({ id }) => id === firstId);
  const finalGenerator = at600.state.puzzle.generators.find(({ id }) => id === generatorId);
  assert(finalBlock && finalGenerator,
    `Generator-spawn E2E: ${side} lost its final block or generator`);
  const finalFootprint = finalBlock.shape.map(([dx, dy]) => [finalBlock.x + dx, finalBlock.y + dy]);
  const mouthCells = generatorMouthCells(finalGenerator, at600.state.puzzle);
  const centerMouthKey = `${mouthCells[1][0]},${mouthCells[1][1]}`;
  const playableKeys = new Set(at600.state.puzzle.playable.map(([x, y]) => `${x},${y}`));
  const blockedKeys = new Set(at600.state.puzzle.blocked.map(([x, y]) => `${x},${y}`));
  assert(finalFootprint.some(([x, y]) => `${x},${y}` === centerMouthKey),
    `Generator-spawn E2E: ${side} final footprint missed the center mouth cell ${JSON.stringify({ finalFootprint, mouthCells })}`);
  assert(finalFootprint.every(([x, y]) => playableKeys.has(`${x},${y}`) && !blockedKeys.has(`${x},${y}`)),
    `Generator-spawn E2E: ${side} final footprint is not fully playable ${JSON.stringify(finalFootprint)}`);
  const renderHistory = await assertRenderedEntryHistory(page, {
    blockId: firstId,
    board: at600.state.board,
    label: `${side} synthetic real-Canvas fixture`,
  });
  const partialFile = `${side}-synthetic-partial-cargo.png`;
  if (renderHistory.visiblePartial.image) {
    await writeFile(path.join(outputDir, partialFile), Buffer.from(renderHistory.visiblePartial.image.split(",")[1], "base64"));
  }
  evidence.push({
    case: `${side} directional timeline`,
    pixelRegion,
    mouthCells,
    finalFootprint,
    partialScreenshot: renderHistory.visiblePartial.image ? partialFile : undefined,
    partialFrame: {
      age: renderHistory.visiblePartial.animation.age,
      progress: renderHistory.visiblePartial.animation.slideProgress,
      block: {
        x: renderHistory.visiblePartial.x,
        y: renderHistory.visiblePartial.y,
        shape: renderHistory.visiblePartial.shape,
      },
      transform: renderHistory.visiblePartial.transform,
      pixelDifference: renderHistory.visiblePartial.pixelDifference,
    },
    continuity: renderHistory.continuity,
    samples: [pre100.sample, post100.sample, at233.sample, at367.sample, at600.sample],
  });
};

const runOfficialLevelTimeline = async (page, input) => {
  const scenario = await discoverOfficialGeneratorScenario(page);
  assert(scenario, "Generator-spawn E2E: no releasable move-generator action exists in current formal LEVELS");
  const initial = await loadOfficialLevel(page, scenario.levelId);
  const initialGenerator = initial.puzzle.generators.find(({ id }) => id === scenario.generatorId);
  assert(initialGenerator?.head === scenario.previousGenerator.head
    && initialGenerator.remaining === scenario.previousGenerator.remaining
    && initialGenerator.nextBlockId === scenario.cargoId,
  `Generator-spawn E2E: discovered formal scenario drifted before pointer input ${JSON.stringify({ scenario, initialGenerator })}`);

  await configureRenderProbe(page, {
    blockIds: [scenario.cargoId],
    generatorIds: [scenario.generatorId],
  });
  const released = await dragBlockTo(
    page,
    input,
    scenario.action.blockId,
    scenario.action.targetX,
    scenario.action.targetY,
  );
  const animation = animationFor(released, scenario.cargoId);
  assert(animation,
    `Generator-spawn E2E: formal Lv${scenario.levelId} real pointer action did not register an animation`);
  const releasedGenerator = released.puzzle.generators.find(({ id }) => id === scenario.generatorId);
  assert(releasedGenerator?.head === scenario.previousGenerator.head + 1
    && releasedGenerator.remaining === scenario.previousGenerator.remaining - 1
    && releasedGenerator.nextBlockId === scenario.nextCargoId,
  `Generator-spawn E2E: formal Lv${scenario.levelId} did not consume exactly one cargo ${JSON.stringify(releasedGenerator)}`);

  await waitForAnimationAge(page, scenario.cargoId, 0.035);
  const pre100 = await captureSample(page, `formal-lv${scenario.levelId}`, "pre-100ms", scenario.cargoId, 0, false, "response-delay");
  const early = frameAnimationFor(pre100.frame, scenario.cargoId) ?? animationFor(pre100.state, scenario.cargoId);
  assert(early?.inputLocked === true && early.previousRemaining === scenario.previousGenerator.remaining
    && early.currentRemaining === scenario.previousGenerator.remaining - 1,
  `Generator-spawn E2E: formal Lv${scenario.levelId} early animation metadata drifted ${JSON.stringify(early)}`);
  assertOldGeneratorFace(
    pre100.frame,
    scenario.generatorId,
    scenario.cargoId,
    scenario.previousGenerator.remaining,
    `formal Lv${scenario.levelId} before 100ms`,
  );

  const cargoCells = scenario.expectedCargo.shape.map(([dx, dy]) => [
    scenario.expectedCargo.x + dx,
    scenario.expectedCargo.y + dy,
  ]);
  const minX = Math.min(...cargoCells.map(([x]) => x));
  const maxX = Math.max(...cargoCells.map(([x]) => x));
  const minY = Math.min(...cargoCells.map(([, y]) => y));
  const maxY = Math.max(...cargoCells.map(([, y]) => y));
  const board = pre100.state.board;
  const regionLeft = Math.max(board.innerX, board.innerX + minX * board.cell - 4);
  const regionTop = Math.max(board.innerY, board.innerY + minY * board.cell - 4);
  const regionRight = Math.min(board.innerX + board.innerWidth, board.innerX + (maxX + 1) * board.cell + 4);
  const regionBottom = Math.min(board.innerY + board.innerHeight, board.innerY + (maxY + 1) * board.cell + 4);
  const pixelRegion = {
    x: Math.floor(regionLeft),
    y: Math.floor(regionTop),
    width: Math.max(1, Math.ceil(regionRight) - Math.floor(regionLeft)),
    height: Math.max(1, Math.ceil(regionBottom) - Math.floor(regionTop)),
  };
  await configureRenderProbe(page, {
    blockIds: [scenario.cargoId],
    generatorIds: [scenario.generatorId],
    pixelRegion,
    captureImages: true,
  });

  await waitForAnimationAge(page, scenario.cargoId, 0.135);
  const post100 = await captureSample(page, `formal-lv${scenario.levelId}`, "post-100ms-pre-233ms", scenario.cargoId, 0, false, "pre-roll");
  const blankFace = generatorView(post100.frame, scenario.generatorId);
  assert(blankFace?.remaining === scenario.previousGenerator.remaining - 1 && blankFace.previewBlockId == null,
    `Generator-spawn E2E: formal Lv${scenario.levelId} did not show decremented count with blank preview ${JSON.stringify(blankFace)}`);
  assert(cargoViews(post100.frame, scenario.cargoId).length === 0,
    `Generator-spawn E2E: formal Lv${scenario.levelId} painted cargo before the 233ms reveal`);

  await waitForAnimationAge(page, scenario.cargoId, 0.368);
  const at367 = await captureSample(page, `formal-lv${scenario.levelId}`, "367ms", scenario.cargoId, 0, false, "settled-wait");
  await page.waitForFunction((id) => {
    const animations = window.__COLOR_ESCAPE__?.getDebugState()?.generatorSpawnAnimations;
    return Array.isArray(animations) && !animations.some((candidate) => candidate.blockId === id);
  }, scenario.cargoId, { timeout: 1_500 });
  const at600 = await captureSample(page, `formal-lv${scenario.levelId}`, "600ms", scenario.cargoId, 24, true);

  const renderHistory = await assertRenderedEntryHistory(page, {
    blockId: scenario.cargoId,
    board,
    label: `formal Lv${scenario.levelId}`,
  });
  const { visiblePartial } = renderHistory;

  const finalState = at600.state;
  const finalBlock = finalState.puzzle.blocks.find(({ id }) => id === scenario.cargoId);
  const finalGenerator = finalState.puzzle.generators.find(({ id }) => id === scenario.generatorId);
  assert(finalBlock && finalGenerator,
    `Generator-spawn E2E: formal Lv${scenario.levelId} lost its final block or generator`);
  const finalFootprint = finalBlock.shape.map(([dx, dy]) => [finalBlock.x + dx, finalBlock.y + dy]);
  const mouthCells = generatorMouthCells(finalGenerator, finalState.puzzle);
  const playableKeys = new Set(finalState.puzzle.playable.map(([x, y]) => `${x},${y}`));
  const blockedKeys = new Set(finalState.puzzle.blocked.map(([x, y]) => `${x},${y}`));
  const centerMouthKey = `${mouthCells[1][0]},${mouthCells[1][1]}`;
  assert(finalFootprint.some(([x, y]) => `${x},${y}` === centerMouthKey),
    `Generator-spawn E2E: formal Lv${scenario.levelId} final footprint does not contain the center mouth cell ${JSON.stringify({ finalFootprint, mouthCells })}`);
  assert(finalFootprint.every(([x, y]) => playableKeys.has(`${x},${y}`) && !blockedKeys.has(`${x},${y}`)),
    `Generator-spawn E2E: formal Lv${scenario.levelId} final footprint is not fully playable ${JSON.stringify({ finalFootprint })}`);
  const nextFace = generatorView(at600.frame, scenario.generatorId);
  assert(nextFace?.remaining === scenario.previousGenerator.remaining - 1
    && nextFace.previewBlockId === scenario.nextCargoId,
  `Generator-spawn E2E: formal Lv${scenario.levelId} did not restore its next preview by 600ms ${JSON.stringify(nextFace)}`);

  const partialFile = `formal-lv${scenario.levelId}-partial-cargo.png`;
  if (visiblePartial.image) {
    await writeFile(path.join(outputDir, partialFile), Buffer.from(visiblePartial.image.split(",")[1], "base64"));
  }
  evidence.push({
    case: `formal Lv${scenario.levelId} real-pointer timeline`,
    scenario,
    pixelRegion,
    mouthCells,
    finalFootprint,
    partialScreenshot: visiblePartial.image ? partialFile : undefined,
    partialFrame: {
      age: visiblePartial.animation.age,
      progress: visiblePartial.animation.slideProgress,
      block: { x: visiblePartial.x, y: visiblePartial.y, shape: visiblePartial.shape },
      transform: visiblePartial.transform,
      pixelDifference: visiblePartial.pixelDifference,
    },
    continuity: renderHistory.continuity,
    samples: [pre100.sample, post100.sample, at367.sample, at600.sample],
  });
};

const runLevel39FinalCargoTimeline = async (page, input) => {
  const levelId = 39;
  const generatorId = "vp-039-generator-1";
  const prefixBlockId = "cc-039-b1-07";
  const triggerBlockId = "cc-039-b2-01";
  const cargoId = "cc-039-b2-02";
  let state = await loadOfficialLevel(page, levelId);
  const initialGenerator = state.puzzle.generators.find(({ id }) => id === generatorId);
  assert(initialGenerator?.remaining === 2 && initialGenerator.nextBlockId === triggerBlockId,
    `Generator-spawn E2E: Lv39 initial generator contract drifted ${JSON.stringify(initialGenerator)}`);
  const prefixBlock = state.puzzle.blocks.find(({ id }) => id === prefixBlockId);
  assert(prefixBlock && prefixBlock.layers[0] === "pink",
    `Generator-spawn E2E: Lv39 initial right-side pink/purple block drifted ${JSON.stringify(prefixBlock)}`);

  state = await dragBlockAlongPathAndExit(page, input, prefixBlockId, [], "right");
  assert(animationFor(state, triggerBlockId),
    "Generator-spawn E2E: Lv39 prefix right exit did not release the pink/purple 1x2 trigger block");
  await page.waitForFunction((id) => {
    const animations = window.__COLOR_ESCAPE__?.getDebugState()?.generatorSpawnAnimations;
    return Array.isArray(animations) && !animations.some((candidate) => candidate.blockId === id);
  }, triggerBlockId, { timeout: 2_000 });
  state = await debug(page);
  const beforeGenerator = state.puzzle.generators.find(({ id }) => id === generatorId);
  const triggerBlock = state.puzzle.blocks.find(({ id }) => id === triggerBlockId);
  assert(beforeGenerator?.head === 1 && beforeGenerator.remaining === 1 && beforeGenerator.nextBlockId === cargoId,
    `Generator-spawn E2E: Lv39 did not reach the deterministic final-cargo state ${JSON.stringify(beforeGenerator)}`);
  assert(triggerBlock?.layers[0] === "pink" && triggerBlock.shape.length === 2,
    `Generator-spawn E2E: Lv39 right-exit trigger is not the expected pink/purple 1x2 ${JSON.stringify(triggerBlock)}`);
  const cargoTemplate = await page.evaluate(async (id) => {
    const { getLevel } = await import("/src/core/levels.ts");
    const level = getLevel(39);
    const block = level.blocks.find((candidate) => candidate.id === id);
    const generator = level.generators?.find((candidate) => candidate.queueBlockIds.includes(id));
    return block && generator ? { ...block, x: generator.spawn[0], y: generator.spawn[1] } : undefined;
  }, cargoId);
  assert(cargoTemplate, "Generator-spawn E2E: Lv39 authored final cargo template is missing");
  const pixelRegion = pixelRegionFor(state.board, cargoTemplate);

  await configureRenderProbe(page, {
    blockIds: [cargoId],
    generatorIds: [generatorId],
  });
  state = await dragBlockAlongPathAndExit(page, input, triggerBlockId, [[5, 0], [6, 0]], "right");
  const registered = animationFor(state, cargoId);
  assert(registered,
    "Generator-spawn E2E: Lv39 real Pointer right exit did not synchronously register the final yellow cargo animation");
  await configureRenderProbe(page, {
    blockIds: [cargoId],
    generatorIds: [generatorId],
    pixelRegion,
    captureImages: true,
    preserveFrames: true,
  });
  const afterGenerator = state.puzzle.generators.find(({ id }) => id === generatorId);
  assert(afterGenerator?.head === 2 && afterGenerator.remaining === 0 && afterGenerator.nextBlockId == null,
    `Generator-spawn E2E: Lv39 final trigger did not decrement count 1->0 ${JSON.stringify(afterGenerator)}`);
  assert(!state.puzzle.blocks.some(({ id }) => id === triggerBlockId),
    "Generator-spawn E2E: Lv39 pink/purple trigger block did not leave through the right gate");

  await waitForAnimationAge(page, cargoId, 0.035);
  const pre100 = await captureSample(page, "formal-lv39-final", "pre-100ms", cargoId, 0, false, "response-delay");
  const early = frameAnimationFor(pre100.frame, cargoId) ?? animationFor(pre100.state, cargoId);
  assert(early?.inputLocked === true && early.previousRemaining === 1 && early.currentRemaining === 0,
    `Generator-spawn E2E: Lv39 early final-cargo metadata drifted ${JSON.stringify(early)}`);
  assertOldGeneratorFace(pre100.frame, generatorId, cargoId, 1, "formal Lv39 final cargo before 100ms");

  const expectedCargo = pre100.state.puzzle.blocks.find(({ id }) => id === cargoId);
  assert(expectedCargo?.layers[0] === "yellow" && expectedCargo.shape.length === 2,
    `Generator-spawn E2E: Lv39 final cargo is not yellow 1x2 ${JSON.stringify(expectedCargo)}`);
  await waitForAnimationAge(page, cargoId, 0.135);
  const post100 = await captureSample(page, "formal-lv39-final", "post-100ms-pre-233ms", cargoId, 0, false, "pre-roll");
  const blankFace = generatorView(post100.frame, generatorId);
  assert(blankFace?.remaining === 0 && blankFace.previewBlockId == null,
    `Generator-spawn E2E: Lv39 did not show count zero with blank preview ${JSON.stringify(blankFace)}`);
  assert(cargoViews(post100.frame, cargoId).length === 0,
    `Generator-spawn E2E: Lv39 yellow cargo appeared before the 233ms reveal ${JSON.stringify({ animation: frameAnimationFor(post100.frame, cargoId), blocks: cargoViews(post100.frame, cargoId), clipped: post100.frame?.clippedCargoIds })}`);

  await waitForAnimationAge(page, cargoId, 0.368);
  const at367 = await captureSample(page, "formal-lv39-final", "367ms", cargoId, 0, false, "settled-wait");
  await page.waitForFunction((id) => {
    const animations = window.__COLOR_ESCAPE__?.getDebugState()?.generatorSpawnAnimations;
    return Array.isArray(animations) && !animations.some((candidate) => candidate.blockId === id);
  }, cargoId, { timeout: 1_500 });
  const at600 = await captureSample(page, "formal-lv39-final", "600ms", cargoId, 24, true);
  const finalBlock = at600.state.puzzle.blocks.find(({ id }) => id === cargoId);
  const finalGenerator = at600.state.puzzle.generators.find(({ id }) => id === generatorId);
  assert(finalBlock && finalGenerator,
    "Generator-spawn E2E: Lv39 final yellow cargo or exhausted generator state is missing");
  const finalFootprint = finalBlock.shape.map(([dx, dy]) => [finalBlock.x + dx, finalBlock.y + dy]);
  const mouthCells = generatorMouthCells(finalGenerator, at600.state.puzzle);
  const centerMouthKey = `${mouthCells[1][0]},${mouthCells[1][1]}`;
  assert(finalFootprint.some(([x, y]) => `${x},${y}` === centerMouthKey),
    `Generator-spawn E2E: Lv39 yellow 1x2 missed center mouth cell ${JSON.stringify({ finalFootprint, mouthCells })}`);
  const playableKeys = new Set(at600.state.puzzle.playable.map(([x, y]) => `${x},${y}`));
  const blockedKeys = new Set(at600.state.puzzle.blocked.map(([x, y]) => `${x},${y}`));
  assert(finalFootprint.every(([x, y]) => playableKeys.has(`${x},${y}`) && !blockedKeys.has(`${x},${y}`)),
    `Generator-spawn E2E: Lv39 yellow 1x2 footprint is not fully playable ${JSON.stringify(finalFootprint)}`);
  const renderHistory = await assertRenderedEntryHistory(page, {
    blockId: cargoId,
    board: at600.state.board,
    label: "formal Lv39 final yellow 1x2",
  });
  const partialFile = "formal-lv39-final-yellow-partial-cargo.png";
  if (renderHistory.visiblePartial.image) {
    await writeFile(path.join(outputDir, partialFile), Buffer.from(renderHistory.visiblePartial.image.split(",")[1], "base64"));
  }
  evidence.push({
    case: "formal Lv39 pink/purple right-exit releases final yellow 1x2",
    pointerSequence: [
      { blockId: prefixBlockId, path: [], exitSide: "right" },
      { blockId: triggerBlockId, path: [[5, 0], [6, 0]], exitSide: "right" },
    ],
    triggerColor: triggerBlock.layers[0],
    countTransition: [beforeGenerator.remaining, afterGenerator.remaining],
    pixelRegion,
    mouthCells,
    finalFootprint,
    partialScreenshot: renderHistory.visiblePartial.image ? partialFile : undefined,
    partialFrame: {
      age: renderHistory.visiblePartial.animation.age,
      progress: renderHistory.visiblePartial.animation.slideProgress,
      block: {
        x: renderHistory.visiblePartial.x,
        y: renderHistory.visiblePartial.y,
        shape: renderHistory.visiblePartial.shape,
      },
      transform: renderHistory.visiblePartial.transform,
      pixelDifference: renderHistory.visiblePartial.pixelDifference,
    },
    continuity: renderHistory.continuity,
    samples: [pre100.sample, post100.sample, at367.sample, at600.sample],
  });
};

const runSimultaneousFinalCargo = async (page, input) => {
  const fixture = simultaneousFixture();
  const initial = await loadFixture(page, fixture);
  animationFor(initial, "spawn-e2e-contract-probe");
  const released = await dragBlockTo(page, input, "spawn-e2e-probe", 5, 6);
  assert(released.generatorSpawnAnimations.length === 2,
    `Generator-spawn E2E: simultaneous release did not synchronously register two animations ${JSON.stringify(released.generatorSpawnAnimations)}`);
  await waitForAnimationAge(page, "spawn-e2e-cargo-left-final", 0.035);
  const pre100 = await captureSample(page, "simultaneous-final", "pre-100ms", "spawn-e2e-cargo-left-final", 0, false, "response-delay");
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
  const at367 = await captureSample(page, "simultaneous-final", "367ms", "spawn-e2e-cargo-left-final", 0, true, "settled-wait");
  for (const generator of fixture.generators) {
    assert(generatorView(at367.frame, generator.id),
      `Generator-spawn E2E: exhausted ${generator.side} chassis vanished before its last cargo settled`);
  }
  evidence.push({ case: "simultaneous final cargo", samples: [pre100.sample, at367.sample] });
};

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

const runCase = async (name, test) => {
  if (caseFilter && !name.toLowerCase().includes(caseFilter)) return;
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
await runCase("right H3 negative-offset timeline", (page, input) => runDirectionalTimeline(page, input, "right"));
await runCase("top L internal-offset timeline", (page, input) => runDirectionalTimeline(page, input, "top"));
await runCase("bottom V3 negative-offset timeline", (page, input) => runDirectionalTimeline(page, input, "bottom"));
await runCase("formal LEVELS real-pointer timeline", runOfficialLevelTimeline);
await runCase("formal Lv39 final yellow cargo real-pointer timeline", runLevel39FinalCargoTimeline);
await runCase("simultaneous final cargo keeps chassis", runSimultaneousFinalCargo);

await browser.close();
await writeFile(path.join(outputDir, "evidence.json"), `${JSON.stringify({ baseUrl, viewport, evidence, failures, browserErrors }, null, 2)}\n`);

if (browserErrors.length) failures.push(`browser errors:\n${browserErrors.join("\n")}`);
if (failures.length) {
  throw new Error(`Generator-spawn animation E2E failed:\n${failures.join("\n")}\nEvidence: ${path.join(outputDir, "evidence.json")}`);
}

console.log(`Generator spawn animation passed: four-direction blocked queues, integer BlockState plus Canvas-CTM entry, partial pixels and phase-boundary continuity, formal Lv39 final yellow cargo, center-mouth contact, input lock, next preview, and simultaneous final cargo. Evidence: ${path.join(outputDir, "evidence.json")}`);
