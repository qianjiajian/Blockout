import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/feedback-budget/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const save = {
  schemaVersion: 1,
  currentLevel: 1,
  highestLevel: 100,
  coins: 1000,
  sound: true,
  haptic: true,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "elevator", "conveyor", "star-gate"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate: "2026-09-05-r95",
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript((initialSave) => {
  localStorage.setItem("color-escape-save-v1", JSON.stringify(initialSave));
  const probe = { tones: [], vibrations: [], suspends: 0, resumes: 0 };
  window.__FEEDBACK_PROBE__ = probe;
  class FakeParam {
    value = 0;
    setValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
  }
  class FakeOscillator {
    type = "sine";
    frequency = new FakeParam();
    connect(node) { return node; }
    start() { probe.tones.push({ frequency: this.frequency.value, at: performance.now() }); }
    stop() {}
  }
  class FakeGain {
    gain = new FakeParam();
    connect(node) { return node; }
  }
  class FakeAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    createOscillator() { return new FakeOscillator(); }
    createGain() { return new FakeGain(); }
    resume() { this.state = "running"; probe.resumes += 1; return Promise.resolve(); }
    suspend() { this.state = "suspended"; probe.suspends += 1; return Promise.resolve(); }
  }
  Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    value: (duration) => { probe.vibrations.push({ duration, at: performance.now() }); return true; },
  });
}, save);
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);

const fixtures = await page.evaluate(async () => {
  const [{ LEVELS }, { PuzzleModel }, { createContinuousCollisionValidator }] = await Promise.all([
    import("/src/core/levels.ts"),
    import("/src/core/PuzzleModel.ts"),
    import("/src/game/continuousDrag.ts"),
  ]);
  let oscillation;
  let blocked;
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const level of LEVELS.slice(0, 30)) {
    const base = new PuzzleModel(level);
    const snapshot = base.snapshot();
    for (const block of snapshot.blocks) {
      if (!base.isBlockActive(block) || base.possibleExitSides(block).length > 0) continue;
      if (!oscillation) {
        for (const [dx, dy] of directions) {
          const model = new PuzzleModel(level);
          const candidate = model.getBlock(block.id);
          if (!candidate || !model.moveBlockStep(block.id, candidate.x + dx, candidate.y + dy)) continue;
          const moved = model.getBlock(block.id);
          if (moved && model.possibleExitSides(moved).length === 0) {
            oscillation = { levelId: level.id, blockId: block.id, dx, dy };
            break;
          }
        }
      }
      if (!blocked) {
        const valid = createContinuousCollisionValidator(snapshot, block.id);
        for (const [dx, dy] of directions) {
          if (!valid(block.x + dx * 0.06, block.y + dy * 0.06)) {
            blocked = { levelId: level.id, blockId: block.id, dx, dy };
            break;
          }
        }
      }
      if (oscillation && blocked) return { oscillation, blocked };
    }
  }
  throw new Error(`Feedback-budget E2E: missing fixtures ${JSON.stringify({ oscillation, blocked })}`);
});

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clickInteractionTarget = async (name) => {
  const state = await debug();
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const canvas = await page.locator("canvas").boundingBox();
  if (!hit || !canvas) throw new Error(`Feedback-budget E2E: missing ${name} target or canvas bounds`);
  await page.mouse.click(
    canvas.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    canvas.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  );
};
const resetProbe = () => page.evaluate(() => {
  window.__FEEDBACK_PROBE__.tones.length = 0;
  window.__FEEDBACK_PROBE__.vibrations.length = 0;
});
const probe = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__FEEDBACK_PROBE__)));
const logicalPoint = (state, block, x = block.x, y = block.y) => {
  const [anchorX, anchorY] = block.shape[0];
  return {
    x: state.board.innerX + (x + anchorX + 0.5) * state.board.cell,
    y: state.board.innerY + (y + anchorY + 0.5) * state.board.cell,
  };
};
const openFixture = async (fixture) => {
  await page.evaluate((levelId) => window.__COLOR_ESCAPE__.loadLevel(levelId, true), fixture.levelId);
  await page.waitForTimeout(120);
  const state = await debug();
  const block = state.puzzle.blocks.find((candidate) => candidate.id === fixture.blockId);
  if (!block) throw new Error(`Feedback-budget E2E: missing ${fixture.blockId}`);
  return { state, block };
};
const gaps = (events) => events.slice(1).map((event, index) => event.at - events[index].at);

// Selection and movement remain silent. A gesture that crossed the drag dead
// zone emits exactly one putdown cue when the pointer is released.
let { state, block } = await openFixture(fixtures.oscillation);
let start = logicalPoint(state, block);
await page.mouse.move(start.x, start.y);
await resetProbe();
await page.mouse.down();
await page.waitForTimeout(30);
const selectionProbe = await probe();
const selectionTones = selectionProbe.tones.filter((event) => Math.round(event.frequency) === 540);
if (selectionTones.length !== 0) {
  throw new Error(`Feedback-budget E2E: block selection emitted ${selectionTones.length} cancelled tones`);
}
await resetProbe();
for (let cycle = 0; cycle < 18; cycle += 1) {
  let target = logicalPoint(state, block, block.x + fixtures.oscillation.dx, block.y + fixtures.oscillation.dy);
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(25);
  target = logicalPoint(state, block);
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(25);
}
await page.mouse.up();
await page.waitForTimeout(120);
const moveProbe = await probe();
const moveTones = moveProbe.tones.filter((event) => Math.round(event.frequency) === 520);
const putdownTones = moveProbe.tones.filter((event) => Math.round(event.frequency) === 120);
if (moveTones.length !== 0) {
  throw new Error(`Feedback-budget E2E: dragging emitted ${moveTones.length} cancelled tones`);
}
if (putdownTones.length !== 1) {
  throw new Error(`Feedback-budget E2E: drag release emitted ${putdownTones.length} putdown cues instead of one`);
}
if (moveProbe.vibrations.length !== 0) {
  throw new Error("Feedback-budget E2E: ordinary grid movement emitted repeated haptics");
}

// A plain tap selects and releases without moving, so it must not sound like a
// block was put down.
({ state, block } = await openFixture(fixtures.oscillation));
start = logicalPoint(state, block);
await page.mouse.move(start.x, start.y);
await resetProbe();
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(80);
const tapProbe = await probe();
const tapPutdownTones = tapProbe.tones.filter((event) => Math.round(event.frequency) === 120);
if (tapPutdownTones.length !== 0) {
  throw new Error(`Feedback-budget E2E: tap-only selection emitted ${tapPutdownTones.length} putdown cues`);
}

// Drive into a wall at 40 Hz for over a second. Collision audio is silent while
// the optional haptic cue retains its existing fatigue-safe cadence.
({ state, block } = await openFixture(fixtures.blocked));
start = logicalPoint(state, block);
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await resetProbe();
for (let frame = 0; frame < 48; frame += 1) {
  const depth = 0.35 + frame * 0.017;
  const target = logicalPoint(
    state,
    block,
    block.x + fixtures.blocked.dx * depth,
    block.y + fixtures.blocked.dy * depth,
  );
  await page.mouse.move(target.x, target.y);
  await page.waitForTimeout(25);
}
const blockedProbe = await probe();
const blockedTones = blockedProbe.tones.filter((event) => Math.round(event.frequency) === 140);
const hapticGaps = gaps(blockedProbe.vibrations);
if (blockedTones.length !== 0) {
  throw new Error(`Feedback-budget E2E: collision emitted ${blockedTones.length} cancelled tones`);
}
if (blockedProbe.vibrations.length < 3 || blockedProbe.vibrations.length > 14
  || hapticGaps.some((gap) => gap < 170)) {
  throw new Error(`Feedback-budget E2E: collision haptic budget failed ${JSON.stringify({ count: blockedProbe.vibrations.length, hapticGaps })}`);
}
await page.screenshot({ path: resolve(output, "01-wall-pressure-feedback-496x1078.png") });
await page.mouse.up();

// Initialize audio with a retained UI button before exercising lifecycle.
await clickInteractionTarget("pause");
await page.waitForTimeout(30);
await clickInteractionTarget("pauseResume");
await page.waitForTimeout(30);

// Backgrounding suspends audio and pauses the game. The first resumed button
// sound should resume the same context rather than creating a stuck silent UI.
await page.evaluate(() => {
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  document.dispatchEvent(new Event("visibilitychange"));
});
await page.waitForTimeout(30);
state = await debug();
let lifecycleProbe = await probe();
if (state.screen !== "paused" || lifecycleProbe.suspends !== 1) {
  throw new Error(`Feedback-budget E2E: background audio/game state failed ${JSON.stringify({ screen: state.screen, lifecycleProbe })}`);
}
await page.evaluate(() => {
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  document.dispatchEvent(new Event("visibilitychange"));
});
await clickInteractionTarget("pauseResume");
await page.waitForTimeout(30);
state = await debug();
lifecycleProbe = await probe();
if (state.screen !== "playing" || lifecycleProbe.resumes !== 1) {
  throw new Error(`Feedback-budget E2E: foreground audio resume failed ${JSON.stringify({ screen: state.screen, lifecycleProbe })}`);
}

const report = {
  fixtures,
  selection: { tones: selectionTones.length, haptics: selectionProbe.vibrations.length },
  move: { tones: moveTones.length, putdownTones: putdownTones.length, haptics: moveProbe.vibrations.length },
  tap: { putdownTones: tapPutdownTones.length },
  collision: { tones: blockedTones.length, haptics: blockedProbe.vibrations.length, minimumHapticGapMs: Math.min(...hapticGaps) },
  lifecycle: { suspends: lifecycleProbe.suspends, resumes: lifecycleProbe.resumes },
  browserErrors: errors,
};
await writeFile(resolve(output, "feedback-budget-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await browser.close();
if (errors.length) throw new Error(`Feedback-budget browser errors:\n${errors.join("\n")}`);
console.log(`Feedback budgets passed: selection, drag motion and collision remain silent; drag release emits one putdown cue, tap emits none.`);
