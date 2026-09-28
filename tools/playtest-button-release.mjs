import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/button-release/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const PRESSED_SCALE = 0.95;
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 496, height: 1078 } });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const clientPoint = async (logical) => {
  const state = await debug();
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Button release E2E: canvas is missing");
  return {
    x: bounds.x + state.viewportTransform.offsetX + logical.x * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + logical.y * state.viewportTransform.scale,
  };
};
const targetPoint = async (name) => {
  const state = await debug();
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  if (!hit) throw new Error(`Button release E2E: missing target ${name}`);
  return clientPoint({ x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 });
};
const dispatchPointer = async (type, pointerId, client, buttons = 0) => page.evaluate((event) => {
  const canvas = document.querySelector("canvas");
  if (!canvas) throw new Error("Button release E2E: canvas is missing");
  const originalCapture = canvas.setPointerCapture;
  canvas.setPointerCapture = () => {};
  try {
    canvas.dispatchEvent(new PointerEvent(event.type, {
      pointerId: event.pointerId,
      pointerType: "touch",
      clientX: event.client.x,
      clientY: event.client.y,
      buttons: event.buttons,
      bubbles: true,
      cancelable: true,
    }));
  } finally {
    canvas.setPointerCapture = originalCapture;
  }
}, { type, pointerId, client, buttons });
const waitForRenderedButtonScale = async (scale) => {
  await page.waitForFunction((expected) => {
    const press = window.__COLOR_ESCAPE__?.getDebugState().buttonPress;
    return press?.visualScale === expected && press?.renderedScale === expected;
  }, scale);
};
const resetCanvasScaleProbe = () => page.evaluate(() => window.__resetButtonCanvasScaleProbe());
const assertPressedCanvasScale = async (name, expectedScale = PRESSED_SCALE) => {
  const calls = await page.evaluate(() => window.__buttonCanvasScaleProbe.slice());
  const usedPressedScale = calls.some(({ x, y }) => (
    Math.abs(x - PRESSED_SCALE) < 0.0001 && Math.abs(y - PRESSED_SCALE) < 0.0001
  ));
  if (expectedScale === 1 && usedPressedScale) {
    throw new Error(`Button release E2E: ${name} unexpectedly executed scale(${PRESSED_SCALE}, ${PRESSED_SCALE})`);
  }
  if (expectedScale !== 1 && !usedPressedScale) {
    throw new Error(`Button release E2E: ${name} debug state changed but Canvas never executed scale(${PRESSED_SCALE}, ${PRESSED_SCALE})`);
  }
};
const clickTarget = async (name, waitMs = 80) => {
  const point = await targetPoint(name);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(waitMs);
  return debug();
};
const restoreHome = async () => {
  await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, false));
  await page.waitForTimeout(50);
  const state = await debug();
  if (state.screen !== "home") throw new Error(`Button release E2E: expected Home, got ${state.screen}`);
  return state;
};
const pressFeedbackCoverage = [];
const nonScalingToggleCoverage = [];
let pressFeedbackPointerId = 300;
const auditPressFeedback = async (name, expectedScale = PRESSED_SCALE) => {
  const before = await debug();
  const hitBefore = before.interactionTargets?.targets?.[name]?.hit;
  const point = await targetPoint(name);
  const pointerId = pressFeedbackPointerId++;
  await resetCanvasScaleProbe();
  await dispatchPointer("pointerdown", pointerId, point, 1);
  await waitForRenderedButtonScale(expectedScale);
  await assertPressedCanvasScale(name, expectedScale);
  const pressed = await debug();
  if (pressed.buttonPress?.key !== name || pressed.buttonPress.inside !== true
    || pressed.buttonPress.visualScale !== expectedScale || pressed.buttonPress.renderedScale !== expectedScale) {
    throw new Error(`Button release E2E: ${name} did not render the expected ${expectedScale} press scale ${JSON.stringify(pressed.buttonPress)}`);
  }
  const hitDuring = pressed.interactionTargets?.targets?.[name]?.hit;
  if (JSON.stringify(hitDuring) !== JSON.stringify(hitBefore)) {
    throw new Error(`Button release E2E: ${name} changed its hit target while visually scaled`);
  }
  await dispatchPointer("pointercancel", pointerId, point, 0);
  await page.waitForFunction(() => !window.__COLOR_ESCAPE__?.getDebugState().buttonPress);
  if (expectedScale === 1) nonScalingToggleCoverage.push(name);
  else pressFeedbackCoverage.push(name);
};

await page.addInitScript(() => {
  const originalScale = CanvasRenderingContext2D.prototype.scale;
  window.__buttonCanvasScaleProbe = [];
  window.__resetButtonCanvasScaleProbe = () => { window.__buttonCanvasScaleProbe.length = 0; };
  CanvasRenderingContext2D.prototype.scale = function scale(x, y) {
    window.__buttonCanvasScaleProbe.push({ x, y });
    if (window.__buttonCanvasScaleProbe.length > 2_000) window.__buttonCanvasScaleProbe.shift();
    return originalScale.call(this, x, y);
  };
});
await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState);
const updateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
await page.evaluate((lastSeenUpdate) => localStorage.setItem("color-escape-save-v1", JSON.stringify({
  schemaVersion: 1,
  currentLevel: 2,
  highestLevel: 30,
  coins: 10000,
  sound: false,
  haptic: false,
  reducedMotion: false,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: {},
  bestMoves: {},
  rewardedLevels: [1],
  dailyStreak: 0,
  lastDailyCompletedDay: "",
  lastSeenUpdate,
})), updateId);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
await page.waitForTimeout(80);

// Pressing START only arms it; releasing over the same target performs the action.
let point = await targetPoint("homePlay");
await page.mouse.move(point.x, point.y);
await page.mouse.down();
await waitForRenderedButtonScale(PRESSED_SCALE);
let state = await debug();
if (state.screen !== "home" || state.activeRun || state.buttonPress?.key !== "homePlay" || !state.buttonPress.inside) {
  throw new Error(`Button release E2E: START activated before release ${JSON.stringify({
    screen: state.screen,
    activeRun: state.activeRun,
    buttonPress: state.buttonPress,
  })}`);
}
if (state.buttonPress.visualScale !== PRESSED_SCALE || state.buttonPress.renderedScale !== PRESSED_SCALE) {
  throw new Error(`Button release E2E: START press scale is ${JSON.stringify({
    visual: state.buttonPress.visualScale,
    rendered: state.buttonPress.renderedScale,
  })}, expected ${PRESSED_SCALE}`);
}
await page.screenshot({ path: resolve(output, "button-pressed-home-play.png") });
await page.mouse.up();
await page.waitForTimeout(80);
state = await debug();
if (state.screen !== "playing" || state.buttonPress) {
  throw new Error(`Button release E2E: START did not activate on release (${state.screen})`);
}

// Leaving the original target and releasing cancels it.
await restoreHome();
point = await targetPoint("homeSettings");
const neutral = await clientPoint({ x: 248, y: 350 });
await page.mouse.move(point.x, point.y);
await page.mouse.down();
await page.mouse.move(neutral.x, neutral.y, { steps: 4 });
await waitForRenderedButtonScale(1);
state = await debug();
if (state.screen !== "home" || state.buttonPress?.key !== "homeSettings" || state.buttonPress.inside !== false
  || state.buttonPress.visualScale !== 1 || state.buttonPress.renderedScale !== 1) {
  throw new Error(`Button release E2E: moving out did not cancel the armed state ${JSON.stringify(state.buttonPress)}`);
}
await page.mouse.up();
await page.waitForTimeout(50);
state = await debug();
if (state.screen !== "home" || state.buttonPress) {
  throw new Error("Button release E2E: release outside activated settings");
}

// Sliding from one button into another cannot activate either button.
const settingsPoint = await targetPoint("homeSettings");
const supplyPoint = await targetPoint("homeSupply");
await page.mouse.move(settingsPoint.x, settingsPoint.y);
await page.mouse.down();
await page.mouse.move(supplyPoint.x, supplyPoint.y, { steps: 4 });
await page.mouse.up();
await page.waitForTimeout(50);
state = await debug();
if (state.screen !== "home" || state.buttonPress) {
  throw new Error(`Button release E2E: sliding into another button activated ${state.screen}`);
}

// Moving away and back to the originally pressed target is a valid release.
await page.mouse.move(settingsPoint.x, settingsPoint.y);
await page.mouse.down();
await page.mouse.move(neutral.x, neutral.y, { steps: 3 });
await page.mouse.move(settingsPoint.x, settingsPoint.y, { steps: 3 });
await waitForRenderedButtonScale(PRESSED_SCALE);
state = await debug();
if (state.buttonPress?.key !== "homeSettings" || state.buttonPress.visualScale !== PRESSED_SCALE
  || state.buttonPress.renderedScale !== PRESSED_SCALE) {
  throw new Error("Button release E2E: returning to the original target did not restore the 5% press scale");
}
await page.mouse.up();
await page.waitForTimeout(50);
state = await debug();
if (state.screen !== "settings" || state.buttonPress) {
  throw new Error(`Button release E2E: returning to the original target did not activate settings (${state.screen})`);
}
await clickTarget("menuBack");

// A bottom navigation tab follows the same release contract.
point = await targetPoint("navigation.0");
await page.mouse.move(point.x, point.y);
await page.mouse.down();
await waitForRenderedButtonScale(PRESSED_SCALE);
state = await debug();
if (state.screen !== "home" || state.navigation.transition || state.buttonPress?.key !== "navigation.0"
  || state.buttonPress.visualScale !== PRESSED_SCALE || state.buttonPress.renderedScale !== PRESSED_SCALE) {
  throw new Error("Button release E2E: navigation activated before release");
}
await page.screenshot({ path: resolve(output, "button-pressed-navigation.png") });
await page.mouse.up();
await page.waitForTimeout(450);
state = await debug();
if (state.screen !== "supply" || state.buttonPress) {
  throw new Error(`Button release E2E: navigation did not activate on release (${state.screen})`);
}

// Side-effecting controls are atomic too: purchasing cannot mutate coins or
// inventory until the matching pointer is released over the same button.
const purchasePoint = await targetPoint("supply.time");
const coinsBeforePurchase = state.economy.coins;
const timeBeforePurchase = state.economy.boosters.time;
await page.mouse.move(purchasePoint.x, purchasePoint.y);
await page.mouse.down();
await waitForRenderedButtonScale(PRESSED_SCALE);
state = await debug();
if (state.economy.coins !== coinsBeforePurchase || state.economy.boosters.time !== timeBeforePurchase
  || state.buttonPress?.key !== "supply.time" || state.buttonPress.visualScale !== PRESSED_SCALE
  || state.buttonPress.renderedScale !== PRESSED_SCALE) {
  throw new Error("Button release E2E: Shop purchase mutated before release");
}
await page.mouse.up();
await page.waitForTimeout(50);
state = await debug();
if (state.economy.coins >= coinsBeforePurchase || state.economy.boosters.time !== timeBeforePurchase + 1 || state.buttonPress) {
  throw new Error("Button release E2E: Shop purchase did not commit exactly once on release");
}

// The navigation bar remains the same control while pages slide underneath it.
// Holding a tab across one or more transition settlements must still activate
// that originally pressed tab when the finger is released there.
const leaderboardPoint = await targetPoint("navigation.1");
const homePoint = await targetPoint("navigation.2");
const collectionPoint = await targetPoint("navigation.4");
await page.mouse.click(leaderboardPoint.x, leaderboardPoint.y);
await page.waitForTimeout(20);
await page.mouse.click(homePoint.x, homePoint.y);
await page.waitForTimeout(10);
await page.mouse.move(collectionPoint.x, collectionPoint.y);
await page.mouse.down();
await waitForRenderedButtonScale(PRESSED_SCALE);
state = await debug();
if (state.buttonPress?.key !== "navigation.4") {
  throw new Error("Button release E2E: transition-time navigation did not arm");
}
await page.waitForTimeout(500);
state = await debug();
if (state.buttonPress?.key !== "navigation.4" || state.screen === "supply") {
  throw new Error("Button release E2E: navigation hold was lost when the underlying page settled");
}
await page.mouse.up();
await page.waitForTimeout(300);
state = await debug();
if (state.screen !== "records" || state.buttonPress) {
  throw new Error(`Button release E2E: cross-transition navigation release missed Collection (${state.screen})`);
}

// In-game pause is also release-triggered.
await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
await page.waitForTimeout(50);
point = await targetPoint("pause");
await page.mouse.move(point.x, point.y);
await page.mouse.down();
await waitForRenderedButtonScale(PRESSED_SCALE);
state = await debug();
if (state.screen !== "playing" || state.buttonPress?.key !== "pause" || state.buttonPress.visualScale !== PRESSED_SCALE
  || state.buttonPress.renderedScale !== PRESSED_SCALE) {
  throw new Error("Button release E2E: pause activated before release");
}
await page.mouse.up();
await page.waitForTimeout(50);
state = await debug();
if (state.screen !== "paused" || state.buttonPress) {
  throw new Error("Button release E2E: pause did not activate on release");
}
await clickTarget("pauseResume");

// A board block still begins dragging immediately; this change is UI-button-only.
state = await debug();
const canExitImmediately = (candidate) => {
  const cells = candidate.shape.map(([dx, dy]) => [candidate.x + dx, candidate.y + dy]);
  const minX = Math.min(...cells.map(([x]) => x));
  const maxX = Math.max(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  const maxY = Math.max(...cells.map(([, y]) => y));
  const activeColor = candidate.layers?.[0] ?? candidate.color;
  return state.puzzle.gates.some((gate) => {
    if (gate.color !== activeColor || gate.frozen > 0 || (candidate.star && !gate.star)) return false;
    if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
    if (gate.side === "bottom") return maxY === state.level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
    if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
    return maxX === state.level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
  });
};
const block = state.puzzle.blocks.find((candidate) => (
  !candidate.shutterId && candidate.frozen <= 0 && !canExitImmediately(candidate)
));
if (!block) throw new Error("Button release E2E: no draggable block found");
const [shapeX, shapeY] = block.shape[0];
const blockClient = await clientPoint({
  x: state.board.innerX + (block.x + shapeX + 0.5) * state.board.cell,
  y: state.board.innerY + (block.y + shapeY + 0.5) * state.board.cell,
});
await dispatchPointer("pointerdown", 71, blockClient, 1);
state = await debug();
if (state.screen !== "playing" || state.activePointer !== 71 || state.selectedId !== block.id || state.buttonPress) {
  throw new Error(`Button release E2E: board dragging no longer starts on pointer down ${JSON.stringify({
    block,
    blockClient,
    screen: state.screen,
    activePointer: state.activePointer,
    selectedId: state.selectedId,
    buttonPress: state.buttonPress,
    dragMotion: state.dragMotion,
  })}`);
}

// While that drag owns input, a second finger cannot arm or execute pause.
const pauseClient = await targetPoint("pause");
await dispatchPointer("pointerdown", 72, pauseClient, 1);
await dispatchPointer("pointerup", 72, pauseClient, 0);
state = await debug();
if (state.screen !== "playing" || state.activePointer !== 71 || state.selectedId !== block.id || state.buttonPress) {
  throw new Error("Button release E2E: a second pointer interrupted the active board drag");
}
await dispatchPointer("pointercancel", 71, blockClient, 0);

// Platform cancellation clears an armed button without performing its action.
await restoreHome();
const cancelClient = await targetPoint("homeSettings");
await dispatchPointer("pointerdown", 91, cancelClient, 1);
await waitForRenderedButtonScale(PRESSED_SCALE);
state = await debug();
if (state.buttonPress?.key !== "homeSettings" || state.buttonPress.visualScale !== PRESSED_SCALE
  || state.buttonPress.renderedScale !== PRESSED_SCALE) {
  throw new Error("Button release E2E: touch pointer did not arm settings");
}
await dispatchPointer("pointercancel", 91, cancelClient, 0);
await page.waitForTimeout(30);
state = await debug();
if (state.screen !== "home" || state.buttonPress) {
  throw new Error("Button release E2E: pointer cancellation activated or retained settings");
}

// Audit every distinct renderer family. Repeated Journey nodes and Collection
// cards share their respective draw loops, so one pass over each visible state
// proves the full visual group uses the common transform.
await restoreHome();
for (const name of [
  "homeSupply", "homeSettings", "homePlay", "homePrev", "homeNext",
  "navigation.0", "navigation.1", "navigation.2", "navigation.3", "navigation.4",
]) await auditPressFeedback(name);

await clickTarget("homeSettings");
for (const name of ["settings.sound", "settings.haptic", "settings.reducedMotion"]) {
  await auditPressFeedback(name, 1);
}
for (const name of ["menuBack", "settingsReset"]) await auditPressFeedback(name);
await clickTarget("menuBack");

await clickTarget("navigation.0", 450);
for (const name of ["supply.time", "supply.rocket", "supply.pulse"]) await auditPressFeedback(name);

await clickTarget("navigation.1", 450);
for (const name of ["leaderboardWeekly", "leaderboardWorld", "leaderboardCountry"]) {
  await auditPressFeedback(name);
}

await clickTarget("navigation.3", 450);
state = await debug();
const visibleJourneyTargets = Object.keys(state.interactionTargets.targets)
  .filter((name) => name.startsWith("journeyNode."))
  .slice(0, 3);
if (visibleJourneyTargets.length < 2) {
  throw new Error(`Button release E2E: Journey exposed too few visible row targets (${JSON.stringify(visibleJourneyTargets)})`);
}
for (const name of visibleJourneyTargets) await auditPressFeedback(name);

// A swipe that starts on a chapter Use button must remain owned by Journey
// scrolling. Crossing the 7 CSS px dead zone cancels the pending Use release,
// so it cannot open the theme-selection overlay.
state = await debug();
let journeyEpisodeUseTarget;
for (let attempt = 0; attempt < 12 && !journeyEpisodeUseTarget; attempt += 1) {
  journeyEpisodeUseTarget = Object.keys(state.interactionTargets.targets)
    .filter((name) => name.startsWith("journeyEpisode."))
    .find((name) => {
      const index = Number(name.split(".")[1]);
      const unlockLevel = 1 + (index - 1) * 10;
      return index !== state.journey.selectedEpisode && unlockLevel <= state.progression.highestLevel;
    });
  if (journeyEpisodeUseTarget) break;
  const viewport = state.journey.viewport;
  const start = await clientPoint({
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height * 0.68,
  });
  const end = await clientPoint({
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height * (state.journey.canScrollUp ? 0.48 : 0.88),
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(() => {
    const current = window.__COLOR_ESCAPE__?.getDebugState();
    return current && !current.journey.scrolling && Math.abs(current.journey.velocity) < 0.5;
  }, undefined, { timeout: 5_000 });
  state = await debug();
}
if (!journeyEpisodeUseTarget) {
  throw new Error("Button release E2E: Journey exposed no unlocked, non-selected episode Use target");
}
const journeyEpisodeSelectedBeforeDrag = state.journey.selectedEpisode;
const journeyEpisodeOffsetBeforeDrag = state.journey.scrollOffset;
const journeyEpisodeDragStart = await targetPoint(journeyEpisodeUseTarget);
await dispatchPointer("pointerdown", 500, journeyEpisodeDragStart, 1);
state = await debug();
if (state.buttonPress?.key !== journeyEpisodeUseTarget || state.journey.presentation) {
  throw new Error("Button release E2E: episode Use did not remain pending on pointer down");
}
await dispatchPointer("pointermove", 500, {
  x: journeyEpisodeDragStart.x,
  y: journeyEpisodeDragStart.y + 10,
}, 1);
state = await debug();
if (!state.journey.scrolling || state.buttonPress || state.journey.presentation || state.screen !== "levels") {
  throw new Error("Button release E2E: episode Use swipe did not cancel into Journey scrolling");
}
await dispatchPointer("pointerup", 500, {
  x: journeyEpisodeDragStart.x,
  y: journeyEpisodeDragStart.y + 10,
}, 0);
await page.waitForTimeout(80);
state = await debug();
if (state.screen !== "levels" || state.journey.scrolling || state.journey.presentation
  || state.journey.selectedEpisode !== journeyEpisodeSelectedBeforeDrag
  || Math.abs(state.journey.scrollOffset - journeyEpisodeOffsetBeforeDrag) < 0.01) {
  throw new Error(`Button release E2E: episode Use swipe activated or failed to scroll (${JSON.stringify({
    screen: state.screen,
    scrolling: state.journey.scrolling,
    presentation: state.journey.presentation,
    selectedBefore: journeyEpisodeSelectedBeforeDrag,
    selectedAfter: state.journey.selectedEpisode,
    offsetBefore: journeyEpisodeOffsetBeforeDrag,
    offsetAfter: state.journey.scrollOffset,
  })})`);
}

// The Journey tap/scroll threshold is measured in CSS pixels. A normal 4px
// finger wobble must remain a tap even on the 320-wide viewport.
await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(50);
const journeyStateBeforeTap = await debug();
const journeyTapTarget = "journeyNode.1";
const journeyTapIndex = Number(journeyTapTarget.split(".")[1]);
const journeyTappedLevel = journeyStateBeforeTap.journey.displayedLevels[journeyTapIndex];
if (!Number.isFinite(journeyTappedLevel)) {
  throw new Error(`Button release E2E: ${journeyTapTarget} has no displayed-level mapping`);
}
const journeyTapPoint = await targetPoint(journeyTapTarget);
const journeyOffsetBeforeWobble = journeyStateBeforeTap.journey.scrollOffset;
await page.mouse.move(journeyTapPoint.x, journeyTapPoint.y);
await page.mouse.down();
await page.mouse.move(journeyTapPoint.x, journeyTapPoint.y + 4, { steps: 2 });
await page.waitForTimeout(30);
state = await debug();
if (state.buttonPress?.key !== journeyTapTarget || state.buttonPress.visualScale !== PRESSED_SCALE
  || Math.abs(state.journey.scrollOffset - journeyOffsetBeforeWobble) >= 0.001) {
  throw new Error(`Button release E2E: 4 CSS px Journey wobble became a scroll on 320px (${JSON.stringify({
    buttonPress: state.buttonPress,
    before: journeyOffsetBeforeWobble,
    after: state.journey.scrollOffset,
  })})`);
}
await page.mouse.up();
await page.waitForTimeout(80);
state = await debug();
if (state.screen !== "home" || state.level.id !== journeyTappedLevel || state.buttonPress || state.journey.scrolling) {
  throw new Error(`Button release E2E: small-screen Journey tap did not activate on release (${JSON.stringify({
    screen: state.screen,
    level: state.level.id,
    buttonPress: state.buttonPress,
    scrolling: state.journey.scrolling,
    selectedEpisode: state.journey.selectedEpisode,
  })})`);
}
await clickTarget("navigation.3", 450);
const journeyDragStart = await targetPoint("journeyNode.1");
const collectionDuringJourneyDrag = await targetPoint("navigation.4");
await dispatchPointer("pointerdown", 501, journeyDragStart, 1);
await dispatchPointer("pointermove", 501, { x: journeyDragStart.x, y: journeyDragStart.y + 10 }, 1);
state = await debug();
if (!state.journey.scrolling || state.buttonPress || state.screen !== "levels") {
  throw new Error("Button release E2E: Journey drag did not cancel its row press");
}
await dispatchPointer("pointerdown", 502, collectionDuringJourneyDrag, 1);
await dispatchPointer("pointerup", 502, collectionDuringJourneyDrag, 0);
state = await debug();
if (state.screen !== "levels" || !state.journey.scrolling) {
  throw new Error("Button release E2E: a second pointer interrupted the Journey scroll owner");
}
await dispatchPointer("pointercancel", 501, { x: journeyDragStart.x, y: journeyDragStart.y + 10 }, 0);
state = await debug();
if (state.screen !== "levels" || state.journey.scrolling || state.buttonPress) {
  throw new Error("Button release E2E: Journey pointer cancellation retained or activated input");
}

// Collection cards use the same CSS-pixel gesture arbitration. On a narrow
// viewport, a small finger wobble must keep the old selection until release.
await clickTarget("navigation.4", 450);
state = await debug();
const collectionSelectedBeforeWobble = state.collection.selectedId;
const collectionOffsetBeforeWobble = state.collection.scrollOffset;
const collectionTapPoint = await targetPoint("collection.color-exit");
await page.mouse.move(collectionTapPoint.x, collectionTapPoint.y);
await page.mouse.down();
await page.mouse.move(collectionTapPoint.x, collectionTapPoint.y + 4, { steps: 2 });
await page.waitForTimeout(30);
state = await debug();
if (state.collection.selectedId !== collectionSelectedBeforeWobble
  || state.buttonPress?.key !== "collection.color-exit"
  || state.buttonPress.visualScale !== PRESSED_SCALE
  || Math.abs(state.collection.scrollOffset - collectionOffsetBeforeWobble) >= 0.001) {
  throw new Error(`Button release E2E: 4 CSS px Collection wobble selected or scrolled before release (${JSON.stringify({
    selectedBefore: collectionSelectedBeforeWobble,
    selectedAfter: state.collection.selectedId,
    buttonPress: state.buttonPress,
    offsetBefore: collectionOffsetBeforeWobble,
    offsetAfter: state.collection.scrollOffset,
  })})`);
}
await page.mouse.up();
await page.waitForTimeout(80);
state = await debug();
if (state.collection.selectedId !== "color-exit" || state.buttonPress || state.collection.scrolling) {
  throw new Error("Button release E2E: small-screen Collection card did not activate exclusively on release");
}

await page.setViewportSize({ width: 496, height: 1078 });
await page.waitForTimeout(50);

for (const name of ["collection.color-block", "collection.color-exit", "collection.irregular-block"]) {
  await auditPressFeedback(name);
}
// Numeric ice now unlocks at its actual first appearance, Lv10. It follows
// the other unlocked entries just below the initial three-row composition,
// so reveal it with the same real vertical gesture players use.
for (let attempt = 0; attempt < 3; attempt += 1) {
  state = await debug();
  if (state.interactionTargets.targets["collection.numeric-ice"]) break;
  const viewport = state.collection.layout.listViewportRect;
  const start = await clientPoint({
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height * 0.82,
  });
  const end = await clientPoint({
    x: viewport.x + viewport.width / 2,
    y: viewport.y + viewport.height * 0.42,
  });
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(50);
}
state = await debug();
if (!state.interactionTargets.targets["collection.numeric-ice"]) {
  throw new Error("Button release E2E: vertical Collection scroll did not reveal numeric ice");
}
await auditPressFeedback("collection.numeric-ice");
state = await debug();
for (const legacy of ["collectionCategory.colors", "collectionCategory.mechanisms", "collectionPrevious", "collectionNext"]) {
  if (state.interactionTargets.targets[legacy]) {
    throw new Error(`Button release E2E: unified Collection retained ${legacy}`);
  }
}
const collectionSelectedBeforeDrag = state.collection.selectedId;
const collectionOffsetBeforeDrag = state.collection.scrollOffset;
const collectionDragStart = await targetPoint("collection.numeric-ice");
const homeDuringCollectionDrag = await targetPoint("navigation.2");
await dispatchPointer("pointerdown", 601, collectionDragStart, 1);
await dispatchPointer("pointermove", 601, { x: collectionDragStart.x, y: collectionDragStart.y - 10 }, 1);
state = await debug();
if (!state.collection.scrolling || state.buttonPress
  || state.collection.scrollOffset <= collectionOffsetBeforeDrag
  || state.collection.selectedId !== collectionSelectedBeforeDrag) {
  throw new Error("Button release E2E: Collection drag did not cancel its card press without selecting it");
}
await dispatchPointer("pointerdown", 602, homeDuringCollectionDrag, 1);
await dispatchPointer("pointerup", 602, homeDuringCollectionDrag, 0);
state = await debug();
if (state.screen !== "records" || !state.collection.scrolling) {
  throw new Error("Button release E2E: a second pointer interrupted the Collection scroll owner");
}
await dispatchPointer("pointercancel", 601, { x: collectionDragStart.x, y: collectionDragStart.y - 10 }, 0);
state = await debug();
if (state.screen !== "records" || state.collection.scrolling || state.buttonPress) {
  throw new Error("Button release E2E: Collection pointer cancellation retained or activated input");
}
if (state.collection.scrollOffset <= 0) {
  throw new Error("Button release E2E: Collection scroll setup did not leave a non-zero offset");
}
await clickTarget("navigation.2", 450);
await clickTarget("navigation.4", 450);
state = await debug();
if (state.screen !== "records" || state.collection.scrollOffset !== 0) {
  throw new Error("Button release E2E: re-entering Collection did not restore its unlocked-first top row");
}

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(2, true));
await page.waitForTimeout(50);
for (const name of ["undo", "pause", "booster.time", "booster.rocket", "booster.pulse"]) await auditPressFeedback(name);
await clickTarget("pause");
for (const name of ["pause.sound", "pause.haptic", "pause.reducedMotion"]) {
  await auditPressFeedback(name, 1);
}
for (const name of ["pauseResume", "pauseRestart", "pauseHome"]) await auditPressFeedback(name);
await clickTarget("pauseHome");

await clickTarget("homeSettings");
await clickTarget("settingsReset");
await auditPressFeedback("modalPrimary");
await auditPressFeedback("modalSecondary");
await clickTarget("modalSecondary");

// Animated banners have their own drawing paths and must obey the same press
// transform. Re-open an unseen update, then reveal the first unseen booster.
await page.evaluate(() => {
  const raw = localStorage.getItem("color-escape-save-v1");
  if (!raw) throw new Error("Button release E2E: save missing before banner audit");
  const save = JSON.parse(raw);
  save.lastSeenUpdate = "";
  save.boosterUnlockSeen = [];
  localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
await auditPressFeedback("updateToast");
await clickTarget("updateToast");
await auditPressFeedback("modalPrimary");
await clickTarget("modalPrimary");
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().boosterUnlock.pending?.visible === true);
await auditPressFeedback("boosterUnlockToast");

await page.screenshot({ path: resolve(output, "button-release-final.png") });
await writeFile(resolve(output, "button-release-report.json"), `${JSON.stringify({
  activation: "pointerup",
  pressedScale: PRESSED_SCALE,
  pressedReductionPercent: 5,
  centeredUniformScale: true,
  canvasScaleCallVerified: true,
  sameTargetRequired: true,
  releaseOutsideCancels: true,
  slideIntoAnotherCancels: true,
  returnToOriginalActivates: true,
  navigationVerified: true,
  navigationHoldAcrossTransitionVerified: true,
  pauseVerified: true,
  sideEffectAtomicityVerified: true,
  boardDragStillStartsOnDown: true,
  multiPointerOwnershipPreserved: true,
  pointerCancelClears: true,
  journeyDeadZoneCss: 7,
  journeyFourCssPixelWobbleRemainsTapAt320: true,
  journeyScrollPointerOwnershipVerified: true,
  journeyScrollCancelVerified: true,
  journeyEpisodeScrollCancelVerified: true,
  visualRendererCoverage: pressFeedbackCoverage,
  nonScalingToggleCoverage,
  browserErrors: errors,
}, null, 2)}\n`, "utf8");

await browser.close();
if (errors.length) throw new Error(`Button release browser errors:\n${errors.join("\n")}`);
console.log("5% centered button press feedback, non-scaling settings toggles, release activation, cancel boundaries, navigation, pause, board drag, and multi-touch ownership passed.");
