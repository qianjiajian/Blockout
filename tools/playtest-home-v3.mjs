import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright";

const output = fileURLToPath(new URL("../playtest-results/home-v3/", import.meta.url));
const playtestUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 720, height: 1584 }, deviceScaleFactor: 1 });
await page.addInitScript(() => {
  const prototype = CanvasRenderingContext2D.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "font");
  const audit = { rejected: 0, requested: [] };
  const starAudit = [];
  Object.defineProperty(window, "__WECHAT_FONT_AUDIT__", { value: audit, configurable: true });
  Object.defineProperty(window, "__HOME_STAR_AUDIT__", { value: starAudit, configurable: true });
  window.__clearHomeStarAudit = () => { starAudit.length = 0; };
  const originalDrawImage = prototype.drawImage;
  prototype.drawImage = function auditedHomeStar(image, ...args) {
    let pathname = String(image?.currentSrc || image?.src || "");
    try { pathname = new URL(pathname, location.href).pathname; } catch { /* use the raw value */ }
    if (pathname.includes("/assets/art/ui/home-v3/star-")) {
      starAudit.push({
        filename: pathname.split("/").at(-1),
        args: args.map(Number),
        globalAlpha: this.globalAlpha,
        naturalWidth: Number(image?.naturalWidth || image?.width || 0),
        naturalHeight: Number(image?.naturalHeight || image?.height || 0),
      });
    }
    return originalDrawImage.call(this, image, ...args);
  };
  if (!descriptor?.get || !descriptor.set) return;
  Object.defineProperty(prototype, "font", {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value) {
      if (typeof value === "string") {
        audit.requested.push(value);
        const match = /^(\d+)\s/.exec(value);
        const weight = Number(match?.[1]);
        if (match && (weight < 100 || weight > 900 || weight % 100 !== 0)) {
          audit.rejected += 1;
          return;
        }
      }
      descriptor.set.call(this, value);
    },
  });
});
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const targetEntry = async (name) => {
  const state = await debug();
  const entry = state.interactionTargets?.targets?.[name];
  if (!entry) throw new Error(`Home V3 E2E: missing interaction target ${name}`);
  return entry;
};
const clickTarget = async (name, waitMs = 100) => {
  const state = await debug();
  const target = state.interactionTargets?.targets?.[name]?.hit;
  const bounds = await page.locator("canvas").boundingBox();
  if (!target || !bounds) throw new Error(`Home V3 E2E: missing ${name} target or canvas bounds`);
  await page.mouse.click(
    bounds.x + state.viewportTransform.offsetX + (target.x + target.width / 2) * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + (target.y + target.height / 2) * state.viewportTransform.scale,
  );
  await page.waitForTimeout(waitMs);
  return debug();
};
const clickLogical = async ({ x, y }, waitMs = 100) => {
  const state = await debug();
  const bounds = await page.locator("canvas").boundingBox();
  if (!bounds) throw new Error("Home V3 E2E: missing canvas bounds");
  await page.mouse.click(
    bounds.x + state.viewportTransform.offsetX + x * state.viewportTransform.scale,
    bounds.y + state.viewportTransform.offsetY + y * state.viewportTransform.scale,
  );
  await page.waitForTimeout(waitMs);
  return debug();
};
const centerOf = ({ hit }) => ({
  x: hit.x + hit.width / 2,
  y: hit.y + hit.height / 2,
});
const capture = (name) => page.screenshot({ path: resolve(output, name) });
const assertWechatFontCompatibility = async (phase) => {
  const audit = await page.evaluate(() => window.__WECHAT_FONT_AUDIT__);
  if (!audit || audit.rejected !== 0 || !audit.requested.some((font) => /^900 43px\s/.test(font))) {
    throw new Error(`Home V3 E2E: incompatible Canvas font during ${phase}: ${JSON.stringify(audit)}`);
  }
  return audit;
};

const completed = (count) => Array.from({ length: count }, (_, index) => index + 1);
const makeSave = ({
  currentLevel = 22,
  highestLevel = 23,
  completedCount = 22,
  bestStars = { "22": 2, "23": 3 },
} = {}) => ({
  schemaVersion: 1,
  currentLevel,
  highestLevel,
  coins: 300000,
  sound: false,
  haptic: false,
  reducedMotion: true,
  featureSeen: ["basics", "ice-door", "ice-block", "layer", "shutter", "generator", "elevator", "conveyor", "star"],
  boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: { collectionViewedThroughLevel: highestLevel, dailyUnlockSeen: highestLevel >= 6 },
  boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars,
  bestMoves: {},
  rewardedLevels: completed(completedCount),
  dailyStreak: 4,
  lastDailyCompletedDay: "",
});

await page.goto(playtestUrl, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState);
const updateId = await page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState().updateNotice.id);
const loadSave = async (save) => {
  await page.evaluate(({ value, currentUpdateId }) => {
    localStorage.setItem("color-escape-save-v1", JSON.stringify({ ...value, lastSeenUpdate: currentUpdateId }));
  }, { value: save, currentUpdateId: updateId });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready, undefined, { timeout: 5_000 });
  await page.waitForTimeout(80);
  return debug();
};
const assertHomeStars = async (label, expected) => {
  await page.evaluate(() => new Promise((resolveFrame) => {
    window.__clearHomeStarAudit();
    window.dispatchEvent(new Event("resize"));
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
  const records = await page.evaluate(() => structuredClone(window.__HOME_STAR_AUDIT__));
  if (records.length < 3 || records.length % 3 !== 0) {
    throw new Error(`Home V3 E2E: ${label} produced ${records.length} star draws instead of complete three-star frames`);
  }
  for (let offset = 0; offset < records.length; offset += 3) {
    const frame = records.slice(offset, offset + 3);
    frame.forEach((record, index) => {
      const target = expected[index];
      if (record.filename !== target.filename
        || JSON.stringify(record.args) !== JSON.stringify([target.x, target.y])
        || Math.abs(record.globalAlpha - 1) > 1e-8
        || record.naturalWidth !== target.width
        || record.naturalHeight !== target.height) {
        throw new Error(`Home V3 E2E: ${label} star ${index + 1} differs from the supplied native asset: ${JSON.stringify({ record, target })}`);
      }
    });
  }
  return records.slice(-3);
};
const filledStars = [
  { filename: "star-left.png", x: 275, y: 1105, width: 55, height: 55 },
  { filename: "star-center.png", x: 329, y: 1096, width: 60, height: 59 },
  { filename: "star-right.png", x: 391, y: 1105, width: 53, height: 55 },
];
const emptyStars = [
  { filename: "star-empty-left.png", x: 274, y: 1106, width: 54, height: 54 },
  { filename: "star-empty-center.png", x: 330, y: 1098, width: 58, height: 56 },
  { filename: "star-empty-right.png", x: 390, y: 1105, width: 54, height: 55 },
];
const starState = (earned) => filledStars.map((star, index) => (index < earned ? star : emptyStars[index]));

let state = await loadSave(makeSave());
const canvasBounds = await page.locator("canvas").boundingBox();
if (!canvasBounds || Math.round(canvasBounds.width) !== 720 || Math.round(canvasBounds.height) !== 1584) {
  throw new Error(`Home V3 E2E: expected a 720x1584 canvas, got ${JSON.stringify(canvasBounds)}`);
}
const expectedScale = 720 / 496;
// The permanent shell now includes the independently replaceable Collection,
// Achievements, and Daily Tasks shortcuts. Formal page bodies remain lazy;
// current-level block art is the only dynamic contribution here.
const expectedLoadedImages = 159 + state.art.formalGameplay.dynamicImages;
if (state.screen !== "home" || state.level.id !== 22 || state.art.loadedImages !== expectedLoadedImages
  || !state.navigation.artReady || Math.abs(state.viewportTransform.scale - expectedScale) > 0.0001
  || Math.abs(state.viewportTransform.offsetX) > 0.01 || state.viewportTransform.offsetY <= 0) {
  throw new Error(`Home V3 E2E: invalid initial state ${JSON.stringify({
    screen: state.screen,
    level: state.level.id,
    art: state.art,
    navigation: state.navigation,
    viewportTransform: state.viewportTransform,
  })}`);
}

const targetNames = ["homePrev", "homeNext", "homeSettings", "homePlay"];
const targetCenters = Object.fromEntries(await Promise.all(targetNames.map(async (name) => (
  [name, centerOf(await targetEntry(name))]
))));
if (Math.abs(targetCenters.homePlay.x - 244) > 2 || Math.abs(targetCenters.homePlay.y - 896) > 2) {
  throw new Error(`Home V3 E2E: START target drifted from the authored position ${JSON.stringify(targetCenters.homePlay)}`);
}
const twoStarAudit = await assertHomeStars("two-star level", starState(2));
await capture("01-home-level-22-720x1584.png");
await assertWechatFontCompatibility("unlocked Home");

state = await clickTarget("homeNext");
if (state.screen !== "home" || state.level.id !== 23) {
  throw new Error(`Home V3 E2E: next-level arrow missed (${state.screen}, Lv${state.level.id})`);
}
const threeStarAudit = await assertHomeStars("three-star level", starState(3));
await capture("02-home-next-level-23-720x1584.png");

state = await clickTarget("homePrev");
if (state.screen !== "home" || state.level.id !== 22) {
  throw new Error(`Home V3 E2E: previous-level arrow missed (${state.screen}, Lv${state.level.id})`);
}
await capture("03-home-previous-level-22-720x1584.png");

state = await clickTarget("homeSettings");
if (state.screen !== "settings" || state.activeRun || state.puzzle.started) {
  throw new Error("Home V3 E2E: settings entry diverged from its authored icon");
}
await capture("04-settings-from-home-720x1584.png");
state = await clickTarget("menuBack");
if (state.screen !== "home" || state.level.id !== 22) throw new Error("Home V3 E2E: settings back did not restore Home");

state = await clickTarget("homePlay", 160);
if (state.screen !== "playing" || state.level.id !== 22 || state.activeRun?.daily || state.activeRun?.levelId !== 22) {
  throw new Error(`Home V3 E2E: START did not begin the selected normal level ${JSON.stringify({
    screen: state.screen,
    level: state.level.id,
    activeRun: state.activeRun,
  })}`);
}
await capture("05-start-level-22-720x1584.png");

await page.evaluate(() => window.__COLOR_ESCAPE__.loadLevel(22, false));
await page.waitForTimeout(100);
state = await debug();
if (state.screen !== "home" || state.activeRun || state.interactionTargets.targets.homeDaily) {
  throw new Error("Home V3 E2E: removed Daily task still exposed a Home target");
}
await capture("06-home-without-daily-task-720x1584.png");
const homeScale = 496 / 720;
const homeOffsetY = (1078 - 1584 * homeScale) / 2;
const removedDailyCenter = {
  x: (530 + 170 / 2) * homeScale,
  y: homeOffsetY + (1394 + 48 / 2) * homeScale,
};
state = await clickLogical(removedDailyCenter, 160);
if (state.screen !== "home" || state.level.id !== 22 || state.activeRun) {
  throw new Error(`Home V3 E2E: removed Daily area retained a ghost action ${JSON.stringify({
    screen: state.screen,
    level: state.level.id,
    activeRun: state.activeRun,
  })}`);
}

state = await loadSave(makeSave({ currentLevel: 1, highestLevel: 1, completedCount: 0 }));
if (state.screen !== "home" || state.level.id !== 1 || state.interactionTargets.targets.homeDaily) {
  throw new Error("Home V3 E2E: removed Daily task reappeared for a new save");
}
const zeroStarAudit = await assertHomeStars("zero-star level", starState(0));
await capture("07-new-save-without-daily-task-720x1584.png");
state = await clickLogical(removedDailyCenter);
if (state.screen !== "home" || state.level.id !== 1 || state.activeRun) {
  throw new Error("Home V3 E2E: removed Daily area retained a new-save ghost action");
}

state = await loadSave(makeSave({ bestStars: { "22": 1, "23": 3 } }));
if (state.screen !== "home" || state.level.id !== 22) throw new Error("Home V3 E2E: one-star visual fixture did not load");
const oneStarAudit = await assertHomeStars("one-star level", starState(1));
await capture("08-home-level-22-one-star-720x1584.png");

await page.setViewportSize({ width: 320, height: 568 });
state = await loadSave(makeSave());
if (state.screen !== "home" || state.interactionTargets.targets.homeDaily) {
  throw new Error("Home V3 E2E: removed Daily task reappeared on a narrow phone viewport");
}
const phoneTwoStarAudit = await assertHomeStars("phone two-star level", starState(2));
await capture("09-home-without-daily-task-320x568.png");
state = await clickLogical(removedDailyCenter);
if (state.screen !== "home" || state.activeRun) {
  throw new Error("Home V3 E2E: removed Daily area retained a phone ghost action");
}
const fontAudit = await assertWechatFontCompatibility("Home without Daily task");

await writeFile(resolve(output, "home-v3-report.json"), `${JSON.stringify({
  viewport: { width: 720, height: 1584 },
  canvasBounds,
  viewportTransform: state.viewportTransform,
  loadedImages: state.art.loadedImages,
  targetCenters,
  canvasFontCompatibility: {
    rejected: fontAudit.rejected,
    requested: [...new Set(fontAudit.requested)],
  },
  verified: {
    home: true,
    nextLevel: 23,
    previousLevel: 22,
    settings: true,
    normalStart: 22,
    dailyTaskRemoved: true,
    formerDailyAreaInactive: true,
    narrowPhoneVerified: true,
    starAssets: {
      zero: zeroStarAudit,
      one: oneStarAudit,
      two: twoStarAudit,
      three: threeStarAudit,
      phoneTwo: phoneTwoStarAudit,
      unearnedStarsUseFullOpacity: true,
    },
  },
  browserErrors: errors,
}, null, 2)}\n`, "utf8");

await browser.close();
if (errors.length) throw new Error(`Home V3 browser errors:\n${errors.join("\n")}`);
console.log("Home V3 layout, native empty-star states, level arrows, settings, START, and legacy Daily-challenge removal passed.");
