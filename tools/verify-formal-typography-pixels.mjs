import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "playtest-results", "formal-typography");
await mkdir(output, { recursive: true });

const allChecks = [
  { screen: "home", name: "coins", reference: "art-source/ui/home-v3/reference-layout.png", current: "playtest-results/formal-typography/01-home-typography-720x1584.png", roi: [80, 64, 90, 32], mode: "brown" },
  { screen: "home", name: "lives", reference: "art-source/ui/home-v3/reference-layout.png", current: "playtest-results/formal-typography/01-home-typography-720x1584.png", roi: [305, 64, 60, 32], mode: "brown" },
  { screen: "home", name: "start", reference: "art-source/ui/home-v3/reference-layout.png", current: "playtest-results/formal-typography/01-home-typography-720x1584.png", roi: [270, 1270, 180, 80], mode: "light" },
  { screen: "shop", name: "effect", reference: "art-source/ui/formal-pages/shop/reference.png", current: "playtest-results/formal-typography/03-shop-typography-720x1584.png", roi: [270, 292, 380, 58], mode: "brown" },
  { screen: "shop", name: "stock", reference: "art-source/ui/formal-pages/shop/reference.png", current: "playtest-results/formal-typography/03-shop-typography-720x1584.png", roi: [270, 347, 270, 53], mode: "brown" },
  { screen: "shop", name: "title", reference: "art-source/ui/formal-pages/shop/reference.png", current: "playtest-results/formal-typography/03-shop-typography-720x1584.png", roi: [70, 462, 260, 62], mode: "light" },
  { screen: "shop", name: "price", reference: "art-source/ui/formal-pages/shop/reference.png", current: "playtest-results/formal-typography/03-shop-typography-720x1584.png", roi: [535, 465, 100, 54], mode: "light" },
  { screen: "leaderboard", name: "tab", reference: "art-source/ui/formal-pages/leaderboard/reference.png", current: "playtest-results/formal-typography/04-leaderboard-typography-720x1584.png", roi: [300, 195, 122, 50], mode: "light" },
  { screen: "leaderboard", name: "podium", reference: "art-source/ui/formal-pages/leaderboard/reference.png", current: "playtest-results/formal-typography/04-leaderboard-typography-720x1584.png", roi: [304, 416, 120, 47], mode: "brown" },
  { screen: "leaderboard", name: "row-title", reference: "art-source/ui/formal-pages/leaderboard/reference.png", current: "playtest-results/formal-typography/04-leaderboard-typography-720x1584.png", roi: [200, 630, 240, 46], mode: "brown" },
  { screen: "leaderboard", name: "row-metric", reference: "art-source/ui/formal-pages/leaderboard/reference.png", current: "playtest-results/formal-typography/04-leaderboard-typography-720x1584.png", roi: [500, 635, 160, 44], mode: "brown" },
  // Journey content is now virtualized around the live campaign anchor, so its
  // text does not share fixed pixel ROIs with the static Level 16 mock. Exact
  // type sizes/anchors remain covered by playtest-formal-typography.mjs.
  // Collection, Settings, and Pause now intentionally use the active locale,
  // while their supplied pixel mocks contain Simplified Chinese. Their exact
  // runtime geometry is verified by the language-aware Canvas probe instead
  // of comparing unrelated glyph silhouettes.
  { screen: "gameplay", name: "coins", reference: "art-source/references/gameplay-v1/screen-reference.png", current: "playtest-results/formal-typography/07-gameplay-typography-720x1584.png", roi: [90, 91, 110, 32], mode: "brown" },
  { screen: "gameplay", name: "level", reference: "art-source/references/gameplay-v1/screen-reference-2026-09-15-annotated.png", current: "playtest-results/formal-typography/07-gameplay-typography-720x1584.png", roi: [280, 175, 165, 58], mode: "light" },
  { screen: "gameplay", name: "timer", reference: "art-source/references/gameplay-v1/screen-reference-2026-09-15-annotated.png", current: "playtest-results/formal-typography/07-gameplay-typography-720x1584.png", roi: [320, 264, 120, 48], mode: "light" },
  { screen: "gameplay", name: "booster-count", reference: "art-source/references/gameplay-v1/screen-reference.png", current: "playtest-results/formal-typography/07-gameplay-typography-720x1584.png", roi: [386, 1407, 56, 47], mode: "light" },
  { screen: "win", name: "reward", reference: "art-source/ui/formal-pages/overlays/win/reference.png", current: "playtest-results/formal-win/level-005-first-clear-720x1584.png", roi: [300, 808, 120, 62], mode: "light" },
  { screen: "win", name: "continue", reference: "art-source/ui/formal-pages/overlays/win/reference.png", current: "playtest-results/formal-win/level-005-first-clear-720x1584.png", roi: [245, 990, 235, 75], mode: "light" },
];
const requestedScreen = process.argv.find((argument) => argument.startsWith("--screen="))?.slice("--screen=".length);
const checks = requestedScreen
  ? allChecks.filter(({ screen }) => screen === requestedScreen)
  : allChecks;
if (!checks.length) throw new Error(`Unknown formal typography screen: ${requestedScreen}`);

const tolerances = {
  "home.coins": { centerX: 3, centerY: 5, width: 2, height: 6 },
  "home.lives": { centerX: 2, centerY: 3, width: 4, height: 4 },
  "home.start": { centerX: 2, centerY: 2, height: 1 },
  "shop.effect": { minX: 2, maxX: 2, minY: 2, maxY: 2, width: 2, height: 2 },
  "shop.stock": { minX: 2, maxX: 2, minY: 2, maxY: 2, width: 2, height: 2 },
  "shop.title": { minX: 2, centerY: 2, width: 8, height: 2 },
  "shop.price": { minX: 2, maxX: 2, centerY: 1, width: 2, height: 1 },
  "leaderboard.tab": { centerX: 2, centerY: 1, height: 1 },
  "leaderboard.podium": { centerX: 1, centerY: 1, height: 1 },
  "leaderboard.row-title": { minX: 2, centerY: 2, height: 3 },
  // The live metric is a total-star number. Validate its left anchor and
  // vertical glyph geometry; horizontal extent varies with the number of digits.
  "leaderboard.row-metric": { minX: 2, centerY: 2, height: 2 },
  // Localized glyph widths differ from the supplied Chinese mock; keep the
  // invariant vertical baselines and heights here while Canvas probes enforce
  // the exact runtime anchors and max widths.
  "collection.card-title": { centerY: 1, height: 1 },
  "collection.detail-title": { centerY: 1, height: 1 },
  "collection.body-first-line": { centerY: 1, height: 1 },
  "settings.title": { centerY: 1, height: 1 },
  "settings.first-row": { minX: 2, centerY: 1 },
  "settings.action": { centerY: 1, height: 1 },
  "gameplay.coins": { minX: 2, maxX: 2, centerY: 2, width: 3, height: 4 },
  // The supplied mock uses a baked rounded display face while runtime uses the
  // cross-platform Canvas system stack. Lock the annotated size and visual
  // center tightly, while allowing the expected small glyph-width difference.
  "gameplay.level": { minX: 5, maxX: 2, centerX: 2, centerY: 1, width: 7, height: 2 },
  "gameplay.timer": { centerX: 1, centerY: 1, height: 3 },
  // The latest mock shows plus badges rather than a numeric stock example.
  // Keep the prior digit reference for vertical glyph sizing; the exact new
  // horizontal anchor is covered by the layout and Canvas-recording tests.
  "gameplay.booster-count": { centerY: 1, height: 3 },
  "pause.title": { centerY: 1, height: 2 },
  "pause.first-row": { minX: 2, centerY: 1 },
  "pause.left-action": { centerX: 1, centerY: 1, height: 1 },
  "win.reward": { minX: 1, maxX: 1, centerY: 1, width: 1, height: 1 },
  "win.continue": { minX: 3, maxX: 1, centerY: 1, width: 3, height: 1 },
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const imageCache = new Map();

const dataUrl = async (relativePath) => {
  if (!imageCache.has(relativePath)) {
    imageCache.set(relativePath, `data:image/png;base64,${(await readFile(resolve(root, relativePath))).toString("base64")}`);
  }
  return imageCache.get(relativePath);
};

const measure = async (relativePath, roi, mode) => page.evaluate(async ({ src, roi, mode, relativePath }) => {
  const image = new Image();
  image.src = src;
  await image.decode();
  if (image.width !== 720 || image.height !== 1584) throw new Error(`${relativePath} is ${image.width}x${image.height}`);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const [left, top, width, height] = roi;
  const pixels = context.getImageData(left, top, width, height).data;
  const points = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const a = pixels[offset + 3];
      const matched = mode === "brown"
        ? a > 200 && r < 150 && g < 110 && b < 95 && r > g * 1.04
        : mode === "blue"
          ? a > 200 && b > 135 && g > 85 && r < 175 && b > r * 1.08
          : mode === "dark"
            ? a > 200 && r < 75 && g < 75 && b < 75
            : a > 200 && r > 220 && g > 215 && b > 190;
      if (matched) points.push([left + x, top + y]);
    }
  }
  if (!points.length) throw new Error(`No ${mode} pixels in ${relativePath} ROI ${roi.join(",")}`);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    matchedPixels: points.length,
  };
}, { src: await dataUrl(relativePath), roi, mode, relativePath });

const results = [];
for (const check of checks) {
  const reference = await measure(check.reference, check.roi, check.mode);
  const current = await measure(check.current, check.roi, check.mode);
  results.push({
    screen: check.screen,
    name: check.name,
    mode: check.mode,
    roi: check.roi,
    reference,
    current,
    delta: Object.fromEntries(["minX", "maxX", "minY", "maxY", "width", "height", "centerX", "centerY"]
      .map((field) => [field, Number((current[field] - reference[field]).toFixed(2))])),
  });
}

await browser.close();
const failures = [];
for (const result of results) {
  const key = `${result.screen}.${result.name}`;
  const expected = tolerances[key];
  if (!expected) failures.push(`${key}: missing tolerance contract`);
  for (const [field, tolerance] of Object.entries(expected ?? {})) {
    const delta = Math.abs(result.delta[field]);
    if (delta > tolerance) failures.push(`${key}.${field}: delta ${result.delta[field]}, tolerance ${tolerance}`);
  }
}
const coveredScreens = [...new Set(results.map(({ screen }) => screen))].sort();
const expectedScreens = requestedScreen
  ? [requestedScreen]
  : ["gameplay", "home", "leaderboard", "shop", "win"];
if (JSON.stringify(coveredScreens) !== JSON.stringify(expectedScreens)) {
  failures.push(`screen coverage ${coveredScreens.join(",")}`);
}
await writeFile(resolve(output, "formal-typography-pixel-report.json"), `${JSON.stringify({
  passed: failures.length === 0,
  coveredScreens,
  checkCount: results.length,
  checks: results,
  failures,
}, null, 2)}\n`, "utf8");
if (failures.length) throw new Error(`Formal typography pixel audit failed:\n${failures.join("\n")}`);
console.log(`Formal typography pixel audit PASS: ${results.length} regions across ${coveredScreens.length} supplied interface mockups.`);
