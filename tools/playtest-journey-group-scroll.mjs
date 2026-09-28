import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const SAVE_KEY = "color-escape-save-v1";
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = fileURLToPath(new URL("../playtest-results/journey-group-scroll/", import.meta.url));
const viewport = { width: 720, height: 1584 };
const FORMAL_TO_LOGICAL_SCALE = 496 / 720;
await mkdir(output, { recursive: true });

const assert = (condition, message) => {
  if (!condition) throw new Error(`Journey grouped-scroll E2E: ${message}`);
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

await page.addInitScript(() => {
  const originalFillRect = CanvasRenderingContext2D.prototype.fillRect;
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  let frame = { serial: 0, images: [], texts: [] };

  const transformedRect = (context, x, y, width, height) => {
    const matrix = context.getTransform();
    const corners = [
      [x, y],
      [x + width, y],
      [x, y + height],
      [x + width, y + height],
    ].map(([localX, localY]) => ({
      x: matrix.a * localX + matrix.c * localY + matrix.e,
      y: matrix.b * localX + matrix.d * localY + matrix.f,
    }));
    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  };

  CanvasRenderingContext2D.prototype.fillRect = function fillRect(x, y, width, height) {
    const matrix = this.getTransform();
    if (x === 0 && y === 0 && width >= this.canvas.width && height >= this.canvas.height
      && matrix.a === 1 && matrix.b === 0 && matrix.c === 0 && matrix.d === 1
      && matrix.e === 0 && matrix.f === 0) {
      frame = { serial: frame.serial + 1, images: [], texts: [] };
    }
    return originalFillRect.call(this, x, y, width, height);
  };

  CanvasRenderingContext2D.prototype.drawImage = function drawImage(image, ...args) {
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.naturalWidth || image.videoWidth || image.width || 0;
    let sourceHeight = image.naturalHeight || image.videoHeight || image.height || 0;
    let destinationX;
    let destinationY;
    let destinationWidth = sourceWidth;
    let destinationHeight = sourceHeight;
    if (args.length === 2) {
      [destinationX, destinationY] = args;
    } else if (args.length === 4) {
      [destinationX, destinationY, destinationWidth, destinationHeight] = args;
    } else if (args.length === 8) {
      [sourceX, sourceY, sourceWidth, sourceHeight,
        destinationX, destinationY, destinationWidth, destinationHeight] = args;
    }
    if ([destinationX, destinationY, destinationWidth, destinationHeight].every(Number.isFinite)) {
      const rect = transformedRect(this, destinationX, destinationY, destinationWidth, destinationHeight);
      frame.images.push({
        src: String(image.currentSrc || image.src || ""),
        ...rect,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
      });
    }
    return originalDrawImage.call(this, image, ...args);
  };

  CanvasRenderingContext2D.prototype.fillText = function fillText(value, x, y, maxWidth) {
    const point = transformedRect(this, x, y, 0, 0);
    frame.texts.push({ text: String(value), x: point.x, y: point.y, maxWidth, font: this.font });
    return maxWidth === undefined
      ? originalFillText.call(this, value, x, y)
      : originalFillText.call(this, value, x, y, maxWidth);
  };

  globalThis.__JOURNEY_CANVAS_AUDIT__ = () => structuredClone(frame);
});

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const audit = () => page.evaluate(() => globalThis.__JOURNEY_CANVAS_AUDIT__());
const settleFrame = () => page.evaluate(() => new Promise((resolveFrame) => {
  requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
}));
const pixelHash = (rect) => page.evaluate(({ x, y, width, height }) => {
  const canvas = document.querySelector("canvas");
  const context2d = canvas.getContext("2d", { willReadFrequently: true });
  const pixels = context2d.getImageData(x, y, width, height).data;
  let value = 2166136261;
  for (let index = 0; index < pixels.length; index += 1) {
    value ^= pixels[index];
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}, rect);

const assetCalls = (frame, suffix) => frame.images.filter(({ src }) => src.replaceAll("\\", "/").endsWith(suffix));
const visibleAt = (calls, y) => calls.find((call) => call.y <= y && call.y + call.height >= y);
const textCall = (frame, matcher) => frame.texts.find(({ text }) => matcher(text));
const fontSize = (call) => Number(call?.font?.match(/(?:^|\s)([\d.]+)px(?:\s|$)/)?.[1] ?? Number.NaN);
const nearestY = (calls, y) => [...calls].sort((left, right) => Math.abs(left.y - y) - Math.abs(right.y - y))[0];
const deltaY = (before, held) => held.y - before.y;
const periodicDeltaY = (before, held, referenceDelta) => {
  const raw = deltaY(before, held);
  const period = before.height;
  if (!(period > 0)) return raw;
  return [-2, -1, 0, 1, 2]
    .map((turns) => raw + turns * period)
    .sort((left, right) => Math.abs(left - referenceDelta) - Math.abs(right - referenceDelta))[0];
};
const close = (left, right, tolerance, label) => {
  assert(Math.abs(left - right) <= tolerance,
    `${label} drifted: ${left.toFixed(2)} vs ${right.toFixed(2)} (tolerance ${tolerance})`);
};
const coversViewport = (calls, top, bottom) => {
  const intervals = calls
    .map((call) => [Math.max(top, call.y), Math.min(bottom, call.y + call.height)])
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0]);
  let cursor = top;
  for (const [start, end] of intervals) {
    if (start > cursor + 0.5) return false;
    cursor = Math.max(cursor, end);
  }
  return cursor >= bottom - 0.5;
};

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
const updateId = (await debug()).updateNotice.id;
await page.evaluate(({ key, updateId: lastSeenUpdate }) => {
  const highestLevel = 58;
  localStorage.clear();
  localStorage.setItem(key, JSON.stringify({
    schemaVersion: 1,
    currentLevel: 1,
    highestLevel,
    coins: 1640,
    sound: false,
    haptic: false,
    reducedMotion: false,
    language: "en",
    featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
    boosterUnlockSeen: ["time", "rocket", "pulse"],
    boosters: { time: 2, rocket: 4, pulse: 1 },
    bestStars: Object.fromEntries(Array.from({ length: 100 }, (_, index) => [String(index + 1), 1 + index % 3])),
    bestMoves: Object.fromEntries(Array.from({ length: 100 }, (_, index) => [String(index + 1), 10 + index % 9])),
    rewardedLevels: Array.from({ length: 57 }, (_, index) => index + 1),
    selectedJourneyEpisode: 6,
    journeyProgress: {
      claimedMilestoneLevels: Array.from({ length: 11 }, (_, index) => (index + 1) * 5),
      seenEpisodeUnlockLevels: [11, 21, 31, 41, 51],
    },
    lifeState: { lives: 3, nextLifeAtMs: Date.now() + 30 * 60 * 1000, unlimitedLivesUntilMs: 0 },
    metaDiscovery: { collectionViewedThroughLevel: highestLevel, dailyUnlockSeen: true },
    dailyStreak: 3,
    lastDailyCompletedDay: "",
    lastSeenUpdate,
  }));
}, { key: SAVE_KEY, updateId });
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.screen === "home" && state.art.ready && state.storage.status === "ready";
});

const home = await debug();
const navigation = home.interactionTargets.targets["navigation.3"].hit;
const canvasBounds = await page.locator("canvas").boundingBox();
const toClient = (state, point) => ({
  x: canvasBounds.x + state.viewportTransform.offsetX + point.x * state.viewportTransform.scale,
  y: canvasBounds.y + state.viewportTransform.offsetY + point.y * state.viewportTransform.scale,
});
const navigationPoint = toClient(home, {
  x: navigation.x + navigation.width / 2,
  y: navigation.y + navigation.height / 2,
});
await page.mouse.click(navigationPoint.x, navigationPoint.y);
await page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.screen === "levels" && !state.navigation.transition
    && state.art.formalPage.loaded === "levels" && !state.art.formalPage.error;
}, undefined, { timeout: 15_000 });
await settleFrame();

const beforeState = await debug();
const beforeAudit = await audit();
const renderViewport = beforeState.journey.renderViewport;
const scrollViewport = beforeState.journey.viewport;
close(
  renderViewport.y + renderViewport.height,
  beforeState.navigation.bar.y,
  0.01,
  "Journey render/navigation seam",
);
close(
  renderViewport.y + renderViewport.height - (scrollViewport.y + scrollViewport.height),
  28 * FORMAL_TO_LOGICAL_SCALE,
  0.01,
  "visual-only selected-tab underlay",
);
const titleRect = { x: 110, y: 40, width: 500, height: 140 };
const navigationRect = { x: 0, y: 1448, width: 720, height: 136 };
const beforeTitleHash = await pixelHash(titleRect);
const beforeNavigationHash = await pixelHash(navigationRect);
await page.screenshot({ path: resolve(output, "01-before-scroll-720x1584.png") });

const start = toClient(beforeState, {
  x: scrollViewport.x + scrollViewport.width / 2,
  y: scrollViewport.y + scrollViewport.height * 0.68,
});
// Flick toward earlier/lower milestones. The drag crosses both retired inner
// list edges while all content remains inside the complete red-box viewport.
const dragDistance = 420 * beforeState.viewportTransform.scale;
await page.mouse.move(start.x, start.y);
await page.mouse.down();
await page.mouse.move(start.x, start.y - dragDistance, { steps: 8 });
await page.waitForTimeout(50);
await settleFrame();

const heldState = await debug();
const heldAudit = await audit();
const heldTitleHash = await pixelHash(titleRect);
const heldNavigationHash = await pixelHash(navigationRect);
await page.screenshot({ path: resolve(output, "02-held-group-scroll-720x1584.png") });

assert(heldState.journey.scrolling, "the Journey viewport did not retain the held pointer");
assert(!heldState.buttonPress, "the grouped swipe was misclassified as a button press");
assert(heldState.screen === "levels" && heldState.level.id === beforeState.level.id,
  "the grouped swipe entered a level before release");
assert(Math.abs(heldState.journey.contentOffset - beforeState.journey.contentOffset) >= 60,
  "the deep drag did not move the continuous Journey map far enough");
const newlyVisibleLevels = heldState.journey.visibleLevels
  .filter((levelId) => !beforeState.journey.visibleLevels.includes(levelId));
const noLongerVisibleLevels = beforeState.journey.visibleLevels
  .filter((levelId) => !heldState.journey.visibleLevels.includes(levelId));
assert(newlyVisibleLevels.length + noLongerVisibleLevels.length > 0,
  "the deep drag did not change the visible chapter/reward-node set");

const beforeBackgroundTiles = assetCalls(beforeAudit, "/formal-pages/journey/background.jpg").slice(1);
const heldBackgroundTiles = assetCalls(heldAudit, "/formal-pages/journey/background.jpg").slice(1);
const beforeBackground = visibleAt(beforeBackgroundTiles, 600);
const heldBackground = visibleAt(heldBackgroundTiles, 600);
const beforeTrack = visibleAt(assetCalls(beforeAudit, "/formal-pages/journey/track.png"), 600);
const heldTrack = visibleAt(assetCalls(heldAudit, "/formal-pages/journey/track.png"), 600);
const beforeTrackProgress = assetCalls(beforeAudit, "/formal-pages/journey/track-progress.png")[0];
const heldTrackProgress = assetCalls(heldAudit, "/formal-pages/journey/track-progress.png")[0];
const beforeMarker = assetCalls(beforeAudit, "/formal-pages/journey/current-marker.png")[0];
const heldMarker = assetCalls(heldAudit, "/formal-pages/journey/current-marker.png")[0];
const beforeChapter = assetCalls(beforeAudit, "/formal-pages/journey/episode-06.webp")[0];
const heldChapter = assetCalls(heldAudit, "/formal-pages/journey/episode-06.webp")[0];
const beforeChapterTitle = textCall(beforeAudit, (text) => text.endsWith("Sky Islands"));
const heldChapterTitle = textCall(heldAudit, (text) => text.endsWith("Sky Islands"));
const beforeLockedShade = assetCalls(beforeAudit, "/formal-pages/journey/episode-locked-shade.png")[0];
const beforeLock = assetCalls(beforeAudit, "/formal-pages/journey/lock.png")[0];
const beforeRangePanel = nearestY(
  assetCalls(beforeAudit, "/formal-pages/journey/episode-range-panel.png"),
  beforeChapter.y + 21,
);
const beforeSelectedButton = nearestY(
  assetCalls(beforeAudit, "/formal-pages/journey/episode-selected-button.png"),
  beforeChapter.y + 282,
);
const beforeSelectedCheck = assetCalls(beforeAudit, "/formal-pages/journey/reward-complete.png")
  .find((call) => Math.abs(call.x - (beforeSelectedButton.x + 46)) < 0.01
    && Math.abs(call.y - (beforeSelectedButton.y - 26)) < 0.01);
const beforeRangeText = textCall(beforeAudit, (text) => text === "Level 51-60");
const beforeTitle = assetCalls(beforeAudit, "/formal-pages/journey/title-panel.png")[0];
const heldTitle = assetCalls(heldAudit, "/formal-pages/journey/title-panel.png")[0];
const beforeNavigation = assetCalls(beforeAudit, "/home-v3/navigation-bar.png")[0];
const heldNavigation = assetCalls(heldAudit, "/home-v3/navigation-bar.png")[0];
const beforeSelected = assetCalls(beforeAudit, "/home-v3/navigation-selected.png")[0];
const heldSelected = assetCalls(heldAudit, "/home-v3/navigation-selected.png")[0];

for (const [value, label] of [
  [beforeBackground, "before background"], [heldBackground, "held background"],
  [beforeTrack, "before track"], [heldTrack, "held track"],
  [beforeTrackProgress, "before track progress"], [heldTrackProgress, "held track progress"],
  [beforeMarker, "before current marker"], [heldMarker, "held current marker"],
  [beforeChapter, "before Sky Islands chapter"], [heldChapter, "held Sky Islands chapter"],
  [beforeChapterTitle, "before Sky Islands title"], [heldChapterTitle, "held Sky Islands title"],
  [beforeLockedShade, "before locked chapter shade"], [beforeLock, "before locked chapter lock"],
  [beforeRangePanel, "before Sky Islands range panel"],
  [beforeSelectedButton, "before Sky Islands selected button"],
  [beforeSelectedCheck, "before Sky Islands selected check"],
  [beforeRangeText, "before Sky Islands range"],
  [beforeTitle, "before title"], [heldTitle, "held title"],
  [beforeNavigation, "before navigation"], [heldNavigation, "held navigation"],
  [beforeSelected, "before selected navigation"], [heldSelected, "held selected navigation"],
]) assert(value, `missing Canvas evidence for ${label}`);

close(beforeChapter.x, 207, 0.01, "chapter image x");
close(beforeChapter.width, 299, 0.01, "chapter image width");
close(beforeChapter.height, 288, 0.01, "chapter image height");
close(beforeLockedShade.x, 207, 0.01, "locked shade x");
close(beforeLockedShade.width, 299, 0.01, "locked shade width");
close(beforeLockedShade.height, 288, 0.01, "locked shade height");
close(beforeLock.x - beforeLockedShade.x, 123, 0.01, "lock x offset");
close(beforeLock.y - beforeLockedShade.y, 100, 0.01, "lock y offset");
close(beforeLock.width, 60, 0.01, "lock width");
close(beforeLock.height, 77, 0.01, "lock height");
close(beforeRangePanel.x, 252, 0.01, "episode range-panel x");
close(beforeRangePanel.y - beforeChapter.y, 21, 0.01, "episode range-panel y offset");
close(beforeRangePanel.width, 208, 0.01, "episode range-panel width");
close(beforeRangePanel.height, 36, 0.01, "episode range-panel height");
close(beforeSelectedButton.x, 279, 0.01, "episode selected-button x");
close(beforeSelectedButton.y - beforeChapter.y, 282, 0.01, "episode selected-button y offset");
close(beforeSelectedButton.width, 155, 0.01, "episode selected-button width");
close(beforeSelectedButton.height, 58, 0.01, "episode selected-button height");
close(beforeSelectedCheck.x, 325, 0.01, "episode selected-check x");
close(beforeSelectedCheck.y - beforeSelectedButton.y, -26, 0.01, "episode selected-check y offset");
close(beforeSelectedCheck.width, 82, 0.01, "episode selected-check width");
close(beforeSelectedCheck.height, 73, 0.01, "episode selected-check height");
close(beforeChapterTitle.x, 360, 0.01, "episode title x");
close(fontSize(beforeChapterTitle), 35, 0.01, "episode title font size");
close(beforeRangeText.x, 356, 0.01, "episode range x");
close(fontSize(beforeRangeText), 24, 0.01, "episode range font size");
const selectedEpisodeTarget = beforeState.interactionTargets.targets["journeyEpisode.6"]?.hit;
assert(selectedEpisodeTarget, "missing selected Journey episode hit target");
close(selectedEpisodeTarget.x / FORMAL_TO_LOGICAL_SCALE, 278, 0.01, "episode hit x");
close(selectedEpisodeTarget.width / FORMAL_TO_LOGICAL_SCALE, 157, 0.01, "episode hit width");
close(selectedEpisodeTarget.height / FORMAL_TO_LOGICAL_SCALE, 58, 0.01, "episode hit height");

const sharedRewardLevels = beforeState.journey.displayedLevels
  .filter((levelId) => heldState.journey.displayedLevels.includes(levelId));
assert(sharedRewardLevels.length >= 2,
  `expected at least two sparse reward rows in both frames, saw ${sharedRewardLevels.join(", ")}`);
const levelEvidence = Object.fromEntries(sharedRewardLevels.map((levelId) => {
  const displayedLevel = levelId === 60 ? 58 : levelId;
  const beforeText = beforeAudit.texts.find(({ text, x }) => text === String(displayedLevel) && x < viewport.width / 2);
  const heldText = heldAudit.texts.find(({ text, x }) => text === String(displayedLevel) && x < viewport.width / 2);
  assert(beforeText && heldText, `missing level ${levelId} text in a shared frame`);
  const beforeCard = nearestY(
    assetCalls(beforeAudit, "/formal-pages/journey/level-card-left.png"),
    beforeText.y - 90,
  );
  const heldCard = nearestY(
    assetCalls(heldAudit, "/formal-pages/journey/level-card-left.png"),
    heldText.y - 90,
  );
  assert(beforeCard && heldCard, `missing level ${levelId} card in a shared frame`);
  return [levelId, { beforeText, heldText, beforeCard, heldCard }];
}));
const primaryRewardLevel = sharedRewardLevels[0];
const beforeLevelCard = levelEvidence[primaryRewardLevel].beforeCard;
const heldLevelCard = levelEvidence[primaryRewardLevel].heldCard;
const beforeActiveLevelCard = nearestY(
  assetCalls(beforeAudit, "/formal-pages/journey/level-card-active-left.png"),
  beforeLevelCard.y - 7,
);
const beforeRewardCard = nearestY(
  assetCalls(beforeAudit, "/formal-pages/journey/reward-card-right.png"),
  beforeLevelCard.y,
);
const heldRewardCard = nearestY(
  assetCalls(heldAudit, "/formal-pages/journey/reward-card-right.png"),
  heldLevelCard.y,
);
const beforeActiveRewardCard = nearestY(
  assetCalls(beforeAudit, "/formal-pages/journey/reward-card-active-right.png"),
  beforeRewardCard.y - 6,
);
assert(beforeRewardCard && heldRewardCard && beforeActiveLevelCard && beforeActiveRewardCard,
  "missing paired normal/active reward-card evidence");
close(beforeActiveLevelCard.x - beforeLevelCard.x, -9, 0.01, "active level-card x offset");
close(beforeActiveLevelCard.y - beforeLevelCard.y, -7, 0.01, "active level-card y offset");
close(beforeActiveLevelCard.width, 246, 0.01, "active level-card width");
close(beforeActiveLevelCard.height, 163, 0.01, "active level-card height");
close(beforeActiveRewardCard.x - beforeRewardCard.x, -9, 0.01, "active reward-card x offset");
close(beforeActiveRewardCard.y - beforeRewardCard.y, -6, 0.01, "active reward-card y offset");
close(beforeActiveRewardCard.width, 246, 0.01, "active reward-card width");
close(beforeActiveRewardCard.height, 162, 0.01, "active reward-card height");
assert(beforeAudit.images.indexOf(beforeActiveLevelCard) < beforeAudit.images.indexOf(beforeLevelCard),
  "active level-card was not drawn beneath the normal card");
assert(beforeAudit.images.indexOf(beforeActiveRewardCard) < beforeAudit.images.indexOf(beforeRewardCard),
  "active reward-card was not drawn beneath the normal card");
const completedRewardCard = nearestY(
  assetCalls(beforeAudit, "/formal-pages/journey/reward-card-right.png"),
  levelEvidence[50].beforeCard.y,
);
const completedRewardHeart = nearestY(
  assetCalls(beforeAudit, "/formal-pages/journey/reward-heart.png"),
  completedRewardCard.y + 37,
);
const completedRewardCheck = assetCalls(beforeAudit, "/formal-pages/journey/reward-complete.png")
  .find((call) => Math.abs(call.x - (completedRewardCard.x + 171)) < 0.01
    && Math.abs(call.y - (completedRewardCard.y + 85)) < 0.01);
assert(completedRewardCard && completedRewardHeart && completedRewardCheck,
  "missing completed Lv50 reward icon/check geometry");
close(completedRewardCard.x, 398, 0.01, "reward card x");
close(completedRewardHeart.x, 485, 0.01, "reward-heart x");
close(completedRewardHeart.y - completedRewardCard.y, 37, 0.01, "reward-heart y offset");
close(completedRewardHeart.width, 75, 0.01, "reward-heart width");
close(completedRewardHeart.height, 67, 0.01, "reward-heart height");
close(completedRewardCheck.x - completedRewardCard.x, 171, 0.01, "completed reward-check x offset");
close(completedRewardCheck.y - completedRewardCard.y, 85, 0.01, "completed reward-check y offset");
assert(!beforeAudit.texts.some(({ text }) => text === "∞ 30m"),
  "completed Lv50 reward still rendered its amount label");

const levelDeltas = Object.fromEntries(Object.entries(levelEvidence).map(([levelId, evidence]) => [levelId, {
  text: deltaY(evidence.beforeText, evidence.heldText),
  card: deltaY(evidence.beforeCard, evidence.heldCard),
}]));
const levelCardDelta = deltaY(beforeLevelCard, heldLevelCard);

const deltas = {
  scrollOffset: heldState.journey.scrollOffset - beforeState.journey.scrollOffset,
  contentOffset: heldState.journey.contentOffset - beforeState.journey.contentOffset,
  background: periodicDeltaY(beforeBackground, heldBackground, levelCardDelta),
  track: periodicDeltaY(beforeTrack, heldTrack, levelCardDelta),
  trackProgress: periodicDeltaY(beforeTrackProgress, heldTrackProgress, levelCardDelta),
  chapterImage: deltaY(beforeChapter, heldChapter),
  chapterTitle: deltaY(beforeChapterTitle, heldChapterTitle),
  marker: deltaY(beforeMarker, heldMarker),
  levels: levelDeltas,
  levelText: levelDeltas[primaryRewardLevel].text,
  levelCard: levelCardDelta,
  rewardCard: deltaY(beforeRewardCard, heldRewardCard),
  title: deltaY(beforeTitle, heldTitle),
  navigation: deltaY(beforeNavigation, heldNavigation),
  selectedNavigation: deltaY(beforeSelected, heldSelected),
};

assert(Math.abs(deltas.levelCard) >= 60, `card only moved ${deltas.levelCard.toFixed(2)}px`);
assert(deltas.levelCard < 0, "an upward finger drag did not move the Journey scene upward");
close(deltas.background, deltas.levelCard, 0.75, "background/card movement");
close(deltas.track, deltas.levelCard, 0.75, "track/card movement");
close(deltas.trackProgress, deltas.levelCard, 0.75, "track progress/card movement");
close(deltas.chapterImage, deltas.levelCard, 0.75, "chapter/card movement");
close(deltas.chapterTitle, deltas.levelCard, 0.75, "chapter title/card movement");
close(deltas.marker, deltas.levelCard, 0.75, "current marker/card movement");
for (const [levelId, levelDelta] of Object.entries(levelDeltas)) {
  close(levelDelta.card, deltas.background, 0.75, `Lv${levelId} card/background movement`);
  close(levelDelta.text, levelDelta.card, 0.75, `Lv${levelId} text/sprite movement`);
}
close(deltas.rewardCard, deltas.levelCard, 0.75, "reward/card movement");
close(deltas.title, 0, 0.25, "fixed title movement");
close(deltas.navigation, 0, 0.25, "fixed navigation movement");
close(deltas.selectedNavigation, 0, 0.25, "fixed selected-navigation movement");
assert(beforeTitleHash === heldTitleHash, "title pixels changed while the Journey scene moved");
assert(beforeNavigationHash === heldNavigationHash, "navigation pixels changed while the Journey scene moved");
assert(coversViewport(beforeBackgroundTiles, 180, 1448), "background tiles did not reach the navigation bar before dragging");
assert(coversViewport(heldBackgroundTiles, 180, 1448), "background tiles left a gap above the navigation bar while dragging");

const interactiveLevel = heldState.journey.interactiveLevels
  .find((levelId) => levelId <= 58 && heldState.journey.displayedLevels.includes(levelId));
assert(interactiveLevel, "the deep-scrolled viewport exposes no unlocked interactive reward row");
const interactiveIndex = heldState.journey.displayedLevels.indexOf(interactiveLevel);
const interactiveTargetKey = `journeyNode.${interactiveIndex}`;
const interactiveTarget = heldState.interactionTargets.targets[interactiveTargetKey]?.hit;
assert(interactiveTarget, `missing ${interactiveTargetKey} after the deep drag`);
assert(interactiveTarget.x >= scrollViewport.x - 0.5
  && interactiveTarget.y >= scrollViewport.y - 0.5
  && interactiveTarget.x + interactiveTarget.width <= scrollViewport.x + scrollViewport.width + 0.5
  && interactiveTarget.y + interactiveTarget.height <= scrollViewport.y + scrollViewport.height + 0.5,
`the deep-scrolled ${interactiveTargetKey} hit area escaped the Journey viewport`);

await page.mouse.up();
await page.waitForTimeout(80);
const releasedState = await debug();
assert(!releasedState.journey.scrolling, "Journey remained in the scrolling state after release");
assert(releasedState.screen === "levels" && releasedState.level.id === beforeState.level.id,
  "Journey swipe release was misclassified as level selection");
const clickLevel = releasedState.journey.interactiveLevels
  .find((levelId) => levelId <= 58 && releasedState.journey.displayedLevels.includes(levelId));
assert(clickLevel, "inertial release left no unlocked sparse reward row available for hit testing");
const clickIndex = releasedState.journey.displayedLevels.indexOf(clickLevel);
const clickTargetKey = `journeyNode.${clickIndex}`;
const clickTarget = releasedState.interactionTargets.targets[clickTargetKey]?.hit;
assert(clickTarget, `missing live ${clickTargetKey} target after inertial release`);
const interactionPoint = toClient(releasedState, {
  x: clickTarget.x + clickTarget.width * 0.25,
  y: clickTarget.y + clickTarget.height / 2,
});
await page.mouse.click(interactionPoint.x, interactionPoint.y);
await page.waitForTimeout(250);
const afterState = await debug();
assert(afterState.screen === "home" && afterState.level.id === clickLevel,
  `${clickTargetKey} did not select Lv${clickLevel} and return Home; screen=${afterState.screen}, level=${afterState.level.id}, `
  + `visible=${afterState.journey.visibleLevels.join(",")}, offset=${afterState.journey.scrollOffset.toFixed(2)}`);
await page.screenshot({ path: resolve(output, "03-deep-scroll-node-selected-720x1584.png") });
assert(errors.length === 0, `browser errors: ${errors.join(" | ")}`);

// Regression for the supplied Lv22 screenshot: the marker belongs in the
// exposed connector between Episode 4's button and Episode 3's medallion, not
// on top of the Jungle Ruins artwork.
await page.evaluate(({ key }) => {
  const save = JSON.parse(localStorage.getItem(key));
  save.currentLevel = 22;
  save.highestLevel = 22;
  save.reducedMotion = true;
  save.rewardedLevels = Array.from({ length: 21 }, (_, index) => index + 1);
  save.selectedJourneyEpisode = 3;
  save.journeyProgress = {
    claimedMilestoneLevels: [10, 15],
    seenEpisodeUnlockLevels: [11, 21],
  };
  localStorage.setItem(key, JSON.stringify(save));
}, { key: SAVE_KEY });
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.screen === "home" && state.art.ready && state.storage.status === "ready";
});
const markerHomeState = await debug();
const markerNavigation = markerHomeState.interactionTargets.targets["navigation.3"].hit;
const markerNavigationPoint = toClient(markerHomeState, {
  x: markerNavigation.x + markerNavigation.width / 2,
  y: markerNavigation.y + markerNavigation.height / 2,
});
await page.mouse.click(markerNavigationPoint.x, markerNavigationPoint.y);
await page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.screen === "levels" && !state.navigation.transition
    && state.art.formalPage.loaded === "levels" && !state.art.formalPage.error;
}, undefined, { timeout: 15_000 });
await settleFrame();

const markerAudit = await audit();
const markerCalls = assetCalls(markerAudit, "/formal-pages/journey/current-marker.png");
const currentMarker = markerCalls[0];
const lowerEpisode = assetCalls(markerAudit, "/formal-pages/journey/episode-03.webp")[0];
const upperEpisode = assetCalls(markerAudit, "/formal-pages/journey/episode-04.webp")[0];
assert(markerCalls.length === 1, `expected one current marker, saw ${markerCalls.length}`);
assert(currentMarker && lowerEpisode && upperEpisode,
  "missing Lv22 marker or neighboring episode geometry");
const upperButtonBottom = upperEpisode.y + 340;
const lowerImageTop = lowerEpisode.y;
const expectedMarkerCenterY = (upperButtonBottom + lowerImageTop) / 2;
const actualMarkerCenterY = currentMarker.y + currentMarker.height / 2;
close(actualMarkerCenterY, expectedMarkerCenterY, 0.05, "Lv22 connector-centered marker");
assert(currentMarker.y > upperButtonBottom
  && currentMarker.y + currentMarker.height < lowerImageTop,
"Lv22 current marker overlaps a chapter button or medallion");
close(currentMarker.x + currentMarker.width / 2, 358.5, 0.05, "marker/track horizontal center");
await page.screenshot({ path: resolve(output, "04-lv22-marker-centered-between-track-segments-720x1584.png") });
assert(errors.length === 0, `browser errors: ${errors.join(" | ")}`);

const markerEvidence = {
  level: 22,
  upperEpisode: 4,
  lowerEpisode: 3,
  upperButtonBottom,
  lowerImageTop,
  expectedCenterY: expectedMarkerCenterY,
  actualCenterY: actualMarkerCenterY,
  rect: currentMarker,
  overlapsUpperButton: currentMarker.y <= upperButtonBottom,
  overlapsLowerMedallion: currentMarker.y + currentMarker.height >= lowerImageTop,
};

const report = {
  passed: true,
  viewport,
  screenshots: [
    "01-before-scroll-720x1584.png",
    "02-held-group-scroll-720x1584.png",
    "03-deep-scroll-node-selected-720x1584.png",
    "04-lv22-marker-centered-between-track-segments-720x1584.png",
  ],
  map: {
    beforeVisibleLevels: beforeState.journey.visibleLevels,
    heldVisibleLevels: heldState.journey.visibleLevels,
    newlyVisibleLevels,
    noLongerVisibleLevels,
    sharedRewardLevels,
  },
  deltas,
  fixedPixelRegions: {
    title: { before: beforeTitleHash, held: heldTitleHash, equal: beforeTitleHash === heldTitleHash },
    navigation: { before: beforeNavigationHash, held: heldNavigationHash, equal: beforeNavigationHash === heldNavigationHash },
  },
  backgroundCoverage: {
    before: coversViewport(beforeBackgroundTiles, 180, 1448),
    held: coversViewport(heldBackgroundTiles, 180, 1448),
    renderViewport,
    scrollViewport,
    navigationBarTop: beforeState.navigation.bar.y,
  },
  marker: markerEvidence,
  interaction: {
    heldLevel: interactiveLevel,
    heldTargetKey: interactiveTargetKey,
    heldHit: interactiveTarget,
    level: clickLevel,
    targetKey: clickTargetKey,
    hit: clickTarget,
    resultingScreen: afterState.screen,
    resultingLevel: afterState.level.id,
  },
};
await writeFile(resolve(output, "journey-group-scroll-report.json"), `${JSON.stringify(report, null, 2)}\n`);
await browser.close();

console.log(
  `Journey grouped-scroll PASS: card ${deltas.levelCard.toFixed(2)}px, background ${deltas.background.toFixed(2)}px, `
  + `track ${deltas.track.toFixed(2)}px, chapter ${deltas.chapterImage.toFixed(2)}px; `
  + `title/navigation fixed, Lv${clickLevel} hit target selected.`,
);
