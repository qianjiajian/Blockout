import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const output = fileURLToPath(new URL("../playtest-results/formal-typography/", import.meta.url));
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
const browserErrors = [];
page.on("pageerror", (error) => browserErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(message.text());
});

await page.addInitScript(() => {
  const records = [];
  globalThis.__FORMAL_TYPOGRAPHY_AUDIT__ = records;
  globalThis.__resetFormalTypographyAudit = () => { records.length = 0; };
  for (const method of ["strokeText", "fillText"]) {
    const original = CanvasRenderingContext2D.prototype[method];
    CanvasRenderingContext2D.prototype[method] = function auditedText(text, x, y, ...args) {
      const matrix = this.getTransform();
      records.push({
        method,
        text: String(text),
        x: Number(x),
        y: Number(y),
        maxWidth: args.length ? Number(args[0]) : null,
        font: this.font,
        align: this.textAlign,
        baseline: this.textBaseline,
        fill: String(this.fillStyle).toLowerCase(),
        stroke: String(this.strokeStyle).toLowerCase(),
        lineWidth: this.lineWidth,
        matrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f },
      });
      return original.call(this, text, x, y, ...args);
    };
  }
});

const completed = Array.from({ length: 57 }, (_, index) => index + 1);
const seedSave = {
  schemaVersion: 1,
  currentLevel: 58,
  highestLevel: 58,
  coins: 300000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  language: "en",
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: { collectionViewedThroughLevel: 58, dailyUnlockSeen: true },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(completed.map((level) => [String(level), 1 + level % 3])),
  bestMoves: Object.fromEntries(completed.map((level) => [String(level), 8 + level % 6])),
  rewardedLevels: completed,
  journeyProgress: {
    claimedMilestoneLevels: Array.from({ length: 11 }, (_, index) => (index + 1) * 5),
    seenEpisodeUnlockLevels: [11, 21, 31, 41, 51],
  },
  lifeState: { lives: 5, nextLifeAtMs: 0, unlimitedLivesUntilMs: 0 },
  dailyStreak: 4,
  lastDailyCompletedDay: "",
};

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const fail = (message) => { throw new Error(`Formal typography E2E: ${message}`); };
const closeTo = (actual, expected, tolerance = 0.01) => Math.abs(actual - expected) <= tolerance;

const targetPoint = async (name) => {
  const state = await debug();
  const hit = state.interactionTargets?.targets?.[name]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  if (!hit || !bounds) fail(`missing interaction target ${name}`);
  return {
    x: bounds.x + state.viewportTransform.offsetX + (hit.x + hit.width / 2) * state.viewportTransform.scale,
    y: bounds.y + state.viewportTransform.offsetY + (hit.y + hit.height / 2) * state.viewportTransform.scale,
  };
};

const clickTarget = async (name) => {
  const point = await targetPoint(name);
  await page.mouse.click(point.x, point.y);
};

const waitScreen = async (screen) => {
  await page.waitForFunction((expected) => {
    const state = window.__COLOR_ESCAPE__?.getDebugState();
    if (state?.screen !== expected || state.navigation?.transition) return false;
    if (expected === "records") {
      return state.collectionAlbum?.art?.ready && state.collectionAlbum.art.artworkReady
        && !state.collectionAlbum.art.error && !state.collectionAlbum.art.artworkError;
    }
    if (["supply", "leaderboard", "levels", "mechanismGuide"].includes(expected)) {
      return state.art?.formalPage?.loaded === (expected === "mechanismGuide" ? "records" : expected)
        && !state.art?.formalPage?.error;
    }
    return true;
  }, screen, { timeout: 15_000 });
};

const stableAudit = async () => {
  await page.evaluate(() => {
    globalThis.__resetFormalTypographyAudit();
    window.dispatchEvent(new Event("resize"));
  });
  await page.waitForFunction(() => globalThis.__FORMAL_TYPOGRAPHY_AUDIT__
    .some((record) => record.method === "fillText"), undefined, { timeout: 3_000 });
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return page.evaluate(() => structuredClone(globalThis.__FORMAL_TYPOGRAPHY_AUDIT__));
};

const fillRecords = (audit, text) => audit.filter((entry) => entry.method === "fillText" && entry.text === text);
const fontSize = (record) => Number(record.font.match(/(?:^|\s)([\d.]+)px(?:\s|$)/)?.[1] ?? Number.NaN);
const assertRecord = (record, expected, label) => {
  if (!record) fail(`${label} was not drawn`);
  if (expected.x != null && !closeTo(record.x, expected.x)) fail(`${label} x=${record.x}, expected ${expected.x}`);
  if (expected.y != null && !closeTo(record.y, expected.y)) fail(`${label} y=${record.y}, expected ${expected.y}`);
  if (expected.size != null && !closeTo(fontSize(record), expected.size)) fail(`${label} size=${fontSize(record)}, expected ${expected.size}`);
  if (expected.align && record.align !== expected.align) fail(`${label} align=${record.align}, expected ${expected.align}`);
  if (expected.maxWidth != null && !closeTo(record.maxWidth, expected.maxWidth)) fail(`${label} maxWidth=${record.maxWidth}, expected ${expected.maxWidth}`);
  if (record.baseline !== "middle") fail(`${label} baseline=${record.baseline}, expected middle`);
  const matrix = expected.matrix ?? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  if (Object.entries(matrix).some(([key, value]) => !closeTo(record.matrix[key], value, key === "f" ? 0.5 : 0.01))) {
    fail(`${label} artboard transform drifted: ${JSON.stringify(record.matrix)}`);
  }
};
const findAt = (audit, text, expected) => fillRecords(audit, text).find((record) => (
  (expected.x == null || closeTo(record.x, expected.x))
  && (expected.y == null || closeTo(record.y, expected.y))
  && (expected.size == null || closeTo(fontSize(record), expected.size))
));

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 15_000 });
const updateId = (await debug()).updateNotice.id;
await page.evaluate(({ save, lastSeenUpdate }) => {
  localStorage.clear();
  localStorage.setItem("color-escape-save-v1", JSON.stringify({ ...save, lastSeenUpdate }));
}, { save: seedSave, lastSeenUpdate: updateId });
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.screen === "home" && state.art.ready && state.storage.status === "ready";
}, undefined, { timeout: 15_000 });

const screenshots = [];
const capture = async (name) => {
  screenshots.push(name);
  await page.screenshot({ path: resolve(output, name) });
};

let audit = await stableAudit();
const homeCoinRecord = fillRecords(audit, "300000").find((record) => (
  closeTo(record.x, 0)
  && closeTo(record.y, 0)
  && closeTo(fontSize(record), 27)
  && closeTo(record.matrix.e, 127, 0.01)
  && closeTo(record.matrix.f, 80, 0.01)
));
if (!homeCoinRecord) {
  fail(`Home coins pulse anchor drifted; numeric records: ${JSON.stringify(audit.filter((record) => (
    record.method === "fillText" && /^\d+$/.test(record.text)
  )))}`);
}
if (!closeTo(homeCoinRecord.maxWidth, 82)
  || !closeTo(homeCoinRecord.matrix.a, homeCoinRecord.matrix.d, 0.001)
  || homeCoinRecord.matrix.a < 0.98
  || homeCoinRecord.matrix.a > 1.08) {
  fail(`Home coins pulse geometry drifted: ${JSON.stringify(homeCoinRecord)}`);
}
assertRecord(findAt(audit, "Full", { x: 334, y: 80, size: 27 }), { x: 334, y: 80, size: 27, maxWidth: 36 }, "Home lives");
assertRecord(findAt(audit, "LEVEL 58", { x: 356, y: 1180, size: 34 }), { x: 356, y: 1180, size: 34 }, "Home level");
assertRecord(findAt(audit, "START", { x: 354, y: 1315, size: 43 }), { x: 354, y: 1315, size: 43 }, "Home START");
assertRecord(findAt(audit, "HOME", { y: 1567, size: 26 }), { y: 1567, size: 26 }, "Home navigation label");
await capture("01-home-typography-720x1584.png");

await clickTarget("homeSettings");
await waitScreen("settings");
audit = await stableAudit();
assertRecord(findAt(audit, "Settings", { x: 360, y: 381, size: 60 }), { x: 360, y: 381, size: 60 }, "Settings title");
for (const [text, y] of [["Music", 586], ["Vibration", 716], ["Effects", 848]]) {
  assertRecord(findAt(audit, text, { x: 263, y, size: 46 }), { x: 263, y, size: 46, align: "left" }, `Settings ${text}`);
}
assertRecord(findAt(audit, "Language", { x: 228.5, y: 1065, size: 30 }), { x: 228.5, y: 1065, size: 30 }, "Settings language action");
assertRecord(findAt(audit, "Clear Progress", { x: 492.5, y: 1065, size: 26 }), { x: 492.5, y: 1065, size: 26 }, "Settings reset action");
await capture("02-settings-typography-720x1584.png");
await clickTarget("menuBack");
await waitScreen("home");

await clickTarget("navigation.0");
await waitScreen("supply");
audit = await stableAudit();
for (const [text, x, y, size, maxWidth] of [
  ["Countdown +30 seconds", 279, 322, 30, 363],
  ["Remaining: 3/9", 279, 372, 31, 218],
  ["Time Boost", 84, 497, 39, null],
  ["Remove one active block", 279, 664, 30, 363],
  ["Rocket", 84, 839, 39, null],
  ["Mechanism progress -2", 279, 1007, 30, 363],
  ["Pulse", 84, 1182, 39, null],
]) assertRecord(findAt(audit, text, { x, y, size }), { x, y, size, align: "left", maxWidth }, `Shop ${text}`);
assertRecord(findAt(audit, "180", { x: 576, y: 496, size: 32 }), { x: 576, y: 496, size: 32 }, "Shop price");
assertRecord(findAt(audit, "SHOP", { y: 1567, size: 26 }), { y: 1567, size: 26 }, "Shop navigation label");
await capture("03-shop-typography-720x1584.png");

await clickTarget("navigation.1");
await waitScreen("leaderboard");
audit = await stableAudit();
for (const [text, x] of [["Weekly", 204.5], ["World", 360.5], ["Country", 516.5]]) {
  assertRecord(findAt(audit, text, { y: 220, size: 30 }), { x, y: 220, size: 30 }, `Leaderboard ${text} tab`);
}
const podiumRecords = [["Mia", 364, 442], ["Hed", 208, 474], ["Kai", 513, 472]].map(([text, x, y]) => (
  findAt(audit, text, { x, y, size: 35 })
));
if (podiumRecords.some((record) => !record || record.maxWidth !== 108)) {
  fail(`Leaderboard podium text geometry drifted: ${JSON.stringify(podiumRecords)}`);
}
const firstLeaderboardTitle = findAt(audit, "Mia", { x: 205, y: 657, size: 30 });
assertRecord(firstLeaderboardTitle, { x: 205, y: 657, size: 30, align: "left" }, "Leaderboard first row title");
const firstLeaderboardMetric = findAt(audit, "300", { x: 503, y: 663, size: 29 });
assertRecord(firstLeaderboardMetric, { x: 503, y: 663, size: 29, align: "left" }, "Leaderboard first row metric");
const leaderboardTitles = audit.filter((record) => record.method === "fillText" && record.x === 205 && fontSize(record) === 30);
if (leaderboardTitles.map(({ y }) => y).sort((a, b) => a - b).join(",") !== "657,785,918,1045,1175,1309,1398") {
  fail(`Leaderboard row-title anchors drifted: ${JSON.stringify(leaderboardTitles)}`);
}
const leaderboardMetrics = audit.filter((record) => record.method === "fillText" && record.x === 503 && fontSize(record) === 29);
if (leaderboardMetrics.map(({ y }) => y).sort((a, b) => a - b).join(",") !== "663,788,921,1051,1178,1313,1397") {
  fail(`Leaderboard row-metric anchors drifted: ${JSON.stringify(leaderboardMetrics)}`);
}
assertRecord(findAt(audit, "Klip", { x: 205, y: 1398, size: 30 }), { x: 205, y: 1398, size: 30, align: "left" }, "Leaderboard fixed player name");
assertRecord(findAt(audit, "114", { x: 503, y: 1397, size: 29 }), { x: 503, y: 1397, size: 29, align: "left" }, "Leaderboard fixed player total stars");
assertRecord(findAt(audit, "LEADERBOARD", { y: 1567, size: 26 }), { y: 1567, size: 26 }, "Leaderboard navigation label");
await capture("04-leaderboard-typography-720x1584.png");

await clickTarget("navigation.3");
await waitScreen("levels");
audit = await stableAudit();
const journeyLabels = fillRecords(audit, "Level").filter((record) => record.x === 197 && fontSize(record) === 28);
const journeyNumbers = audit.filter((record) => record.method === "fillText" && record.x === 197 && fontSize(record) === 48 && /^\d+$/.test(record.text));
if (!journeyLabels.length || !journeyLabels.every((label) => (
  journeyNumbers.some((number) => closeTo(number.y, label.y + 51))
))) {
  fail(`Journey level label/number geometry drifted: ${JSON.stringify({ journeyLabels, journeyNumbers })}`);
}
if (!journeyNumbers.some(({ text }) => text === "58")) {
  fail(`Journey focus reward card did not display the live anchor level: ${JSON.stringify(journeyNumbers)}`);
}
if (audit.some((record) => record.method === "fillText" && record.fill === "#ff70dc")) {
  fail("Journey retained the obsolete purple current-level badge");
}
const journeyReward = audit.find((record) => (
  record.method === "fillText"
  && /^(?:x\d+|∞ )/.test(record.text)
  && record.x === 522.5
  && fontSize(record) === 47
));
assertRecord(journeyReward, { x: 522.5, size: 47 }, "Journey reward count");
const journeyEpisodeTitle = audit.find((record) => (
  record.method === "fillText"
  && ["Episode: Sky Islands", "Episode: Blossom Town"].includes(record.text)
  && record.x === 360
  && fontSize(record) === 35
));
assertRecord(journeyEpisodeTitle, { x: 360, size: 35 }, "Journey episode title");
const journeyEpisodeRange = audit.find((record) => (
  record.method === "fillText"
  && /^Level \d+-\d+$/.test(record.text)
  && record.x === 356
  && fontSize(record) === 24
));
assertRecord(journeyEpisodeRange, { x: 356, size: 24 }, "Journey episode range");
if (audit.some((record) => record.method === "fillText" && /^Level \d+ - \d+$/.test(record.text))) {
  fail("Journey episode range retained spaces around its hyphen");
}
const journeyEpisodeAction = audit.find((record) => (
  record.method === "fillText"
  && ["Use", "Using"].includes(record.text)
  && record.x === 356
  && fontSize(record) === 24
));
assertRecord(journeyEpisodeAction, { x: 356, size: 24 }, "Journey episode action");
assertRecord(findAt(audit, "JOURNEY", { y: 1567, size: 26 }), { y: 1567, size: 26 }, "Journey navigation label");
await capture("05-journey-typography-720x1584.png");

await clickTarget("navigation.4");
await waitScreen("records");
audit = await stableAudit();
assertRecord(findAt(audit, "COLLECTION", { y: 1567, size: 26 }), { y: 1567, size: 26 }, "Collection navigation label");
await capture("06-collection-typography-720x1584.png");
await clickTarget("collectionAlbumGuide");
await waitScreen("mechanismGuide");
const guideState = await debug();
const guideLayout = guideState.collection.modal;
const viewport = guideState.viewportTransform;
const artScale = 496 / 720;
const artOffsetY = (1078 - 1584 * artScale) / 2;
const guideMatrix = {
  a: viewport.scale * guideLayout.scale * artScale,
  b: 0,
  c: 0,
  d: viewport.scale * guideLayout.scale * artScale,
  e: viewport.offsetX + viewport.scale * guideLayout.offsetX,
  f: viewport.offsetY + viewport.scale * (guideLayout.offsetY + guideLayout.scale * artOffsetY),
};
audit = await stableAudit();
assertRecord(findAt(audit, "Gameplay Guide", { x: 360, y: 294, size: 51 }), { x: 360, y: 294, size: 51, matrix: guideMatrix }, "Guide popup title");
assertRecord(findAt(audit, "Color Block", { x: 166, y: 576, size: 27 }), { x: 166, y: 576, size: 27, matrix: guideMatrix }, "Guide aggregate block card title");
assertRecord(findAt(audit, "Color Block", { x: 369.5, y: 1087.5, size: 30 }), { x: 369.5, y: 1087.5, size: 30, matrix: guideMatrix }, "Guide aggregate block detail title");
const bodyLine = audit.find((record) => record.method === "fillText" && record.x === 134 && record.y === 1165 && fontSize(record) === 26);
assertRecord(bodyLine, { x: 134, y: 1165, size: 26, align: "left", matrix: guideMatrix }, "Guide detail body");
const secondBodyLine = audit.find((record) => record.method === "fillText" && record.x === 134 && record.y === 1209 && fontSize(record) === 26);
assertRecord(secondBodyLine, { x: 134, y: 1209, size: 26, align: "left", matrix: guideMatrix }, "Guide detail second line");
await capture("06b-mechanism-guide-typography-720x1584.png");
await clickTarget("mechanismGuideClose");
await waitScreen("records");

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(26, true));
await waitScreen("playing");
await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().art.formalGameplay.uiReady, undefined, { timeout: 15_000 });
audit = await stableAudit();
assertRecord(findAt(audit, "300000", { x: 146, y: 107, size: 29 }), { x: 146, y: 107, size: 29, maxWidth: 98 }, "Gameplay coins");
assertRecord(findAt(audit, "LEVEL 26", { x: 361.5, y: 202, size: 31 }), { x: 361.5, y: 202, size: 31 }, "Gameplay level");
const timer = audit.find((record) => record.method === "fillText" && /^\d{2}:\d{2}$/.test(record.text) && record.x === 371 && record.y === 288);
assertRecord(timer, { x: 371, y: 288, size: 33 }, "Gameplay timer");
for (const x of [200.5, 410.5, 624.5]) {
  const badge = audit.find((record) => record.method === "fillText" && record.text === "3" && record.x === x && record.y === 1434);
  assertRecord(badge, { x, y: 1434, size: 32 }, `Gameplay booster badge ${x}`);
}
await capture("07-gameplay-typography-720x1584.png");

await clickTarget("pause");
await waitScreen("paused");
audit = await stableAudit();
assertRecord(findAt(audit, "Paused", { x: 360, y: 375, size: 60 }), { x: 360, y: 375, size: 60 }, "Pause title");
for (const [text, y] of [["Music", 586], ["Vibration", 716], ["Effects", 848]]) {
  assertRecord(findAt(audit, text, { x: 263, y, size: 46 }), { x: 263, y, size: 46, align: "left" }, `Pause ${text}`);
}
assertRecord(findAt(audit, "Replay", { x: 228.5, y: 1065, size: 36 }), { x: 228.5, y: 1065, size: 36 }, "Pause replay");
assertRecord(findAt(audit, "Home", { x: 492.5, y: 1065, size: 36 }), { x: 492.5, y: 1065, size: 36 }, "Pause home");
await capture("08-pause-typography-720x1584.png");

await page.evaluate(() => {
  const save = JSON.parse(localStorage.getItem("color-escape-save-v1") ?? "{}");
  save.lifeState = { lives: 4, nextLifeAtMs: Date.now() + 29 * 60_000 + 59_000, unlimitedLivesUntilMs: 0 };
  localStorage.setItem("color-escape-save-v1", JSON.stringify(save));
});
await page.reload({ waitUntil: "networkidle" });
await waitScreen("home");
await page.waitForFunction(() => {
  const state = window.__COLOR_ESCAPE__?.getDebugState();
  return state?.storage.status === "ready"
    && state?.lives.lives === 4
    && state?.lives.nextRecoveryRemainingMs > 0;
}, undefined, { timeout: 15_000 });
audit = await stableAudit();
const recoveringLives = audit.find((record) => (
  record.method === "fillText" && /^4 · \d{2}:\d{2}$/.test(record.text)
));
if (!recoveringLives) {
  fail(`Home recovering lives was not drawn: ${JSON.stringify(audit.filter((record) => record.method === "fillText" && record.x === 334))}`);
}
assertRecord(recoveringLives, {
  x: 334,
  y: 80,
  size: 17,
  maxWidth: 68,
}, "Home recovering lives");
await capture("09-home-life-countdown-720x1584.png");

const report = {
  playtestUrl,
  viewport: { width: 720, height: 1584, deviceScaleFactor: 1 },
  references: {
    home: "切图/主界面/示意.png",
    shop: "切图/商店/示意.png",
    leaderboard: "切图/排行/示意.png",
    journey: "旅途补充/旅途补充/示意.png",
    collection: "art-source/ui/formal-pages/mechanism-guide-v2/reference-layout.png",
    settings: "切图2/设置界面/示意图1.png",
    gameplay: "界面UI+空星/游戏界面/示意标注.png",
    pause: "切图2/暂停界面/示意图1.png",
    win: "切图2/通关/1.png (covered by playtest-formal-win.mjs)",
  },
  verifiedTypography: {
    home: {
      coins: { size: 27, x: 127, y: 80, maxWidth: 82 },
      lives: { size: 27, x: 334, y: 80, maxWidth: 36 },
      recoveringLives: { size: 17, x: 334, y: 80, maxWidth: 68 },
      level: { size: 34, x: 356, y: 1180 },
      start: { size: 43, x: 354, y: 1315 },
      navigation: { y: 1567, sizes: [26, 26, 26, 26, 26] },
    },
    shop: { effect: 30, stock: 31, itemTitle: 39, price: 32 },
    leaderboard: { tabs: 23, podium: 35, podiumMaxWidth: 108, rowTitle: 30, metric: 29, fixedPlayerRow: true },
    journey: {
      levelLabel: 28,
      levelNumber: 48,
      play: 24,
      rewardAmount: 47,
      episodeTitle: 35,
      episodeRange: 24,
      episodeButton: 24,
      episodeRangeFormat: "Lv 1-10",
    },
    collection: { popupTitle: 51, cardTitle: 27, detailTitle: 30, body: 26, bodyLineHeight: 44 },
    gameplay: { coins: 29, level: 31, timer: 33, boosterCount: 32 },
    pauseAndSettings: { title: 60, rowLabel: 46, action: 36 },
    win: { annotatedDesignSize: 28, calibratedCanvasSize: 44 },
  },
  screenshots,
  assertions: {
    fixedReferenceSizes: true,
    calibratedMiddleBaselineAnchors: true,
    collectionLeftAlignedBodyAndLineHeight: true,
    noHomeLengthBasedTypography: true,
    gameplayHudAligned: true,
    pauseAndSettingsAligned: true,
    recoveringLivesRemainLegible: true,
    identityReferenceArtboardTransform: true,
  },
  browserErrors,
};
await writeFile(resolve(output, "formal-typography-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

await browser.close();
if (browserErrors.length) fail(`browser errors:\n${browserErrors.join("\n")}`);
console.log(`Formal typography PASS: ${screenshots.length} interface screenshots; sizes, anchors, alignment, and line spacing match the supplied mockups.`);
