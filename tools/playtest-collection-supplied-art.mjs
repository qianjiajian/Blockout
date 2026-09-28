import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const output = fileURLToPath(new URL("../playtest-results/collection-default-page-2026-09-22/collection-regression/", import.meta.url));
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
const languages = ["zh-CN", "zh-TW", "en", "ja", "ko", "es", "pt", "fr", "de", "ru"];
const supplied = {
  "tab-blue.png": [204, 77], "tab-purple.png": [203, 80],
  "card-gray.png": [215, 269], "card-blue.png": [194, 242], "card-purple.png": [194, 242], "card-gold.png": [215, 269],
  "progress-icon.png": [45, 46], "progress-panel.png": [320, 60],
  "lock.png": [64, 75], "mask.png": [159, 157],
  "detail-panel.png": [679, 960], "detail-close.png": [94, 98],
  "page-previous.png": [50, 58], "page-next.png": [49, 57], "page-indicator.png": [116, 45],
  "star-filled.png": [36, 35], "star-empty.png": [38, 37], "guide-book.png": [96, 103],
};
const prefix = "/assets/art/ui/formal-pages/collection-album-v3/";
const retainedPrefix = "/assets/art/ui/formal-pages/collection-album-v2/";
const inspirationPath = "/assets/art/ui/formal-pages/collection-album-v1/inspiration.webp";
const assetPath = file => file === "detail-close.png" ? "/assets/art/ui/formal-pages/daily-tasks-v2/close.png"
  : `${["progress-panel.png", "detail-panel.png"].includes(file) ? retainedPrefix : prefix}${file}`;
const cardScale = 211.5 / 194;
await mkdir(output, { recursive: true });
const inputPaths = ["src/game/ColorEscapeGame.ts", "src/game/artManifest.ts", "src/game/collectionAlbumLayout.ts", "src/game/collectionAlbumLocalization.ts",
  `public${inspirationPath}`,
  ...Object.keys(supplied).map(file => `public${assetPath(file)}`)];
const fingerprint = async () => Object.fromEntries(await Promise.all(inputPaths.map(async path =>
  [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
const inputHashes = await fingerprint();
const imageAlpha = {};
for (const file of ["mask.png", "progress-panel.png"]) {
  const { data, info } = await sharp(resolve(`public${assetPath(file)}`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minimum = 255, maximum = 0;
  for (let index = 3; index < data.length; index += 4) { minimum = Math.min(minimum, data[index]); maximum = Math.max(maximum, data[index]); }
  assert.deepEqual([info.width, info.height], supplied[file]);
  assert.equal(minimum, 0, `${file} keeps transparent margins`);
  assert.ok(maximum > 0 && maximum < 255, `${file} keeps the supplied partial alpha`);
  assert.equal(maximum, file === "mask.png" ? 161 : 99, `${file} keeps the exact supplied alpha maximum`);
  imageAlpha[file] = { minimum, maximum };
}

const makeSave = () => ({
  schemaVersion: 1, currentLevel: 16, highestLevel: 17, coins: 1000,
  sound: false, haptic: false, reducedMotion: true, language: "zh-CN",
  featureSeen: ["basics"], boosterUnlockSeen: ["time", "rocket", "pulse"],
  metaDiscovery: { collectionViewedItemIds: [] }, boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(Array.from({ length: 16 }, (_, index) => [String(index + 1), index % 3 + 1])),
  bestMoves: {}, rewardedLevels: Array.from({ length: 16 }, (_, index) => index + 1),
  journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] },
  achievementProgress: { claimedIds: [] }, selectedJourneyEpisode: 1,
  collectionProgress: { version: 1, inspiration: 1000, restoredMasterpieceIds: ["masterpiece-01"], seenItemIds: ["masterpiece-01"], claimedMilestoneIds: [] },
  dailyStreak: 0, lastDailyCompletedDay: "",
});
const highestClearedLevel = Math.max(0, ...makeSave().rewardedLevels);
const defaultLevelPage = Math.max(0, Math.floor((highestClearedLevel - 1) / 9));
const browser = await chromium.launch({ headless: true });
const errors = [], reports = [];
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
async function point(page, rect) {
  const state = await debug(page), canvas = await page.locator("canvas").boundingBox();
  assert.ok(canvas && rect);
  return { x: canvas.x + state.viewportTransform.offsetX + (rect.x + rect.width / 2) * state.viewportTransform.scale,
    y: canvas.y + state.viewportTransform.offsetY + (rect.y + rect.height / 2) * state.viewportTransform.scale };
}
async function clickRect(page, rect) { const p = await point(page, rect); await page.mouse.click(p.x, p.y); }
async function click(page, key) {
  const target = (await debug(page)).interactionTargets.targets[key];
  assert.ok(target, `missing ${key}`);
  await clickRect(page, target.hit); await page.waitForTimeout(35);
}
async function ready(page) {
  await page.waitForFunction(() => {
    const state = window.__COLOR_ESCAPE__.getDebugState(), art = state.collectionAlbum.art;
    return state.screen === "records" && !state.navigation.transition && art.ready && art.artworkReady
      && !art.requested && !art.error && !art.artworkError
      && art.currentAtlasIndexes.every(index => art.loadedAtlasIndexes.includes(index));
  });
}
function parentState(state) { return { tab: state.collectionAlbum.tab, pageIndex: state.collectionAlbum.pageIndex,
  ids: state.collectionAlbum.visibleItems.map(item => item.id) }; }
async function probe(page) {
  if ((await debug(page)).screen === "records") await ready(page);
  return page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__, ctx = game.ctx;
    const original = { draw: ctx.drawImage, label: game.label, wrap: game.wrapText, detail: game.drawCollectionAlbumDetail, card: game.drawCollectionAlbumCard };
    const draws = [], texts = [], wraps = [], cardInfo = [];
    let insideDetail = false;
    let cardId;
    ctx.drawImage = function(image, ...args) {
      const matrix = this.getTransform();
      draws.push({ source: image.currentSrc || image.src || "", args,
        width: image.naturalWidth || image.width, height: image.naturalHeight || image.height,
        alpha: this.globalAlpha, insideDetail, cardId, transform: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f } });
      return original.draw.call(this, image, ...args);
    };
    game.label = function(text, x, y, size, ...rest) {
      texts.push({ text: String(text), x, y, size, cardId }); return original.label.call(this, text, x, y, size, ...rest);
    };
    game.wrapText = function(text, x, y, maxWidth, lineHeight, size, ...rest) {
      wraps.push({ text: String(text), x, y, maxWidth, lineHeight, size });
      return original.wrap.call(this, text, x, y, maxWidth, lineHeight, size, ...rest);
    };
    game.drawCollectionAlbumDetail = function(...args) { insideDetail = true; try { return original.detail.apply(this, args); } finally { insideDetail = false; } };
    game.drawCollectionAlbumCard = function(item, ...args) {
      cardId = item.id;
      cardInfo.push({ id: item.id, unlockLevel: item.unlockLevel,
        unlockText: game.albumText("cardUnlockAfterLevel", { level: item.unlockLevel }),
        collectedText: game.albumText("collected"), previewText: game.albumText("needsRestoration") });
      try { return original.card.call(this, item, ...args); } finally { cardId = undefined; }
    };
    try { game.render(); } finally { ctx.drawImage = original.draw; game.label = original.label; game.wrapText = original.wrap; game.drawCollectionAlbumDetail = original.detail; game.drawCollectionAlbumCard = original.card; }
    return { draws, texts, wraps, cardInfo, state: game.getDebugState(), language: game.save.language };
  });
}
function nativeDraws(result) {
  const draws = result.draws.filter(draw => draw.source.includes(prefix) || draw.source.includes(retainedPrefix)
    || draw.source.endsWith(assetPath("detail-close.png")));
  for (const draw of draws) {
    const file = Object.keys(supplied).find(name => draw.source.endsWith(assetPath(name)));
    assert.ok(supplied[file], `registered supplied file ${file}`);
    assert.ok(draw.source.endsWith(assetPath(file)), `only the final official version is drawn for ${file}`);
    assert.deepEqual([draw.width, draw.height], supplied[file], `native source dimensions ${file}`);
    assert.equal(draw.args.length, 4, `supplied ${file} must use its complete bitmap without source cropping`);
    const cardAsset = /^(card-gray|card-blue|card-purple|card-gold|mask|lock)\.png$/.test(file);
    assert.ok(Math.abs(draw.args[2] / draw.width - draw.args[3] / draw.height) < 1e-7, `supplied ${file} keeps its complete native aspect`);
    if (cardAsset) {
      const cardWidth = 194 * cardScale;
      const cardHeight = 242 * cardScale;
      const scale = result.state.collectionAlbum.layout.artTransform.scale
        * Math.min(cardWidth / draw.width, cardHeight / draw.height);
      assert.ok(Math.abs(draw.args[2] - draw.width * scale) < 1e-7 && Math.abs(draw.args[3] - draw.height * scale) < 1e-7, `${file} uses a uniform fit inside the approved card slot`);
    }
    assert.ok(Math.abs(Math.hypot(draw.transform.a, draw.transform.b) - Math.hypot(draw.transform.c, draw.transform.d)) < 1e-7, `no anisotropic stretch for ${file}`);
  }
  assert.ok(result.texts.every(item => !item.text.includes("undefined") && !/\{\w+\}/.test(item.text)), "all localized text resolved");
  return draws;
}
function containedPlacement(result, draw, slot, label) {
  const { scale, offsetX, offsetY } = result.state.collectionAlbum.layout.artTransform;
  const ratio = Math.min(slot.width / draw.width, slot.height / draw.height);
  const expected = [offsetX + (slot.x + (slot.width - draw.width * ratio) / 2) * scale,
    offsetY + (slot.y + (slot.height - draw.height * ratio) / 2) * scale,
    draw.width * ratio * scale, draw.height * ratio * scale];
  assert.ok(draw.args.every((value, index) => Math.abs(value - expected[index]) < 1e-7), `complete contained bitmap placement: ${label}`);
}
function placement(result, draw, x, y, label) {
  const { scale, offsetX, offsetY } = result.state.collectionAlbum.layout.artTransform;
  assert.ok(Math.abs(draw.args[0] - offsetX - x * scale) < 1e-7
    && Math.abs(draw.args[1] - offsetY - y * scale) < 1e-7, `authored placement ${label}`);
}
function assertDetail(result) {
  const draws = nativeDraws(result);
  const panel = draws.find(draw => draw.source.endsWith("/detail-panel.png"));
  const close = draws.find(draw => draw.source.endsWith(assetPath("detail-close.png")));
  assert.ok(panel && close, "supplied detail panel and close painted");
  assert.ok(!draws.some(draw => draw.insideDetail && /\/(mask|lock)\.png$/.test(draw.source)), "detail artwork stays clear even for locked cards");
  containedPlacement(result, panel, { x: 21, y: 342, width: 679, height: 960 }, "detail panel");
  containedPlacement(result, close, { x: 625, y: 300, width: 94, height: 98 }, "detail close");
  const primary = draws.find(draw => draw.insideDetail && draw.source.endsWith("/tab-blue.png"));
  if (primary) containedPlacement(result, primary, { x: 238, y: 1198, width: 242, height: 90 }, "detail primary action");
  const stars = draws.filter(draw => draw.insideDetail && /\/star-(filled|empty)\.png$/.test(draw.source));
  const detailId = result.state.collectionAlbum.detailId;
  const detailItem = result.state.collectionAlbum.visibleItems.find(item => item.id === detailId);
  if (detailId?.startsWith("level-") && detailItem?.collected) {
    assert.equal(stars.length, 3, "collected level detail paints three bitmap stars");
    const expectedStars = result.state.progression.bestStars[String(Number(detailId.slice(6)))];
    for (const [index, star] of stars.entries()) {
      assert.ok(star.source.endsWith(index < expectedStars ? "/star-filled.png" : "/star-empty.png"), "saved stars select the matching supplied bitmap");
      containedPlacement(result, star, { x: 360 + index * 50 - 69, y: 1106, width: 38, height: 38 }, `detail star ${index}`);
    }
  } else assert.equal(stars.length, 0, "locked levels and masterpieces do not paint earned stars");
  assert.ok(result.texts.every(item => !/[★☆]/.test(item.text)), "collection stars are not Unicode substitutes");
  const scale = result.state.collectionAlbum.layout.artTransform.scale;
  assert.ok(result.texts.some(item => Math.abs(item.size - 41 * scale) < 1e-7), "detail title uses 41px native typography");
  assert.ok(result.texts.some(item => Math.abs(item.size - 34 * scale) < 1e-7) || result.wraps.some(item => Math.abs(item.size - 34 * scale) < 1e-7), "detail description uses 34px native typography");
}
function assertGrid(result) {
  const draws = nativeDraws(result);
  assert.ok(!result.draws.some(draw => draw.source.endsWith("/collection-album-v1/panel.webp")), "main collection has no old white modal shell");
  const frames = draws.filter(draw => /\/card-(gray|blue|purple|gold)\.png$/.test(draw.source));
  assert.equal(frames.length, result.state.collectionAlbum.visibleItems.length, "one native frame per visible card");
  const gridOffset = result.state.collectionAlbum.layout.gridOffsetY / result.state.collectionAlbum.layout.artTransform.scale;
  for (const [index, draw] of frames.entries()) {
    placement(result, draw, 18.75 + index % 3 * 240, 420 + Math.floor(index / 3) * 300 + gridOffset, `3x3 card ${index}`);
    const item = result.state.collectionAlbum.visibleItems[index];
    const expectedFrame = item.category === "level"
      ? (!item.collected ? "card-gray.png" : item.stars === 1 ? "card-blue.png" : item.stars === 2 ? "card-purple.png" : "card-gold.png")
      : (item.collected ? "card-purple.png" : item.blueprintUnlocked ? "card-blue.png" : "card-gray.png");
    assert.ok(draw.source.endsWith(`/${expectedFrame}`), `${item.id} uses its ownership/star frame ${expectedFrame}`);
  }
  const cardStars = [];
  for (const [index, item] of result.state.collectionAlbum.visibleItems.entries()) {
    const info = result.cardInfo.find(card => card.id === item.id);
    assert.ok(info, `captured card ${item.id}`);
    const stars = draws.filter(draw => draw.cardId === item.id && /\/star-(filled|empty)\.png$/.test(draw.source));
    const texts = result.texts.filter(text => text.cardId === item.id).map(text => text.text);
    if (item.category === "level" && item.collected) {
      const level = Number(item.id.slice(6));
      const expectedStars = result.state.progression.bestStars[String(level)];
      assert.ok([1, 2, 3].includes(expectedStars), "the completed-level fixture has real saved 1–3 star values");
      assert.equal(item.stars, expectedStars, `debug stars match saved best stars for ${item.id}`);
      assert.equal(stars.length, 3, `${item.id} paints exactly three bitmap stars`);
      const x = 18.75 + index % 3 * 240;
      const y = 420 + Math.floor(index / 3) * 300 + gridOffset;
      for (const [ordinal, star] of stars.entries()) {
        assert.ok(star.source.endsWith(ordinal < expectedStars ? "/star-filled.png" : "/star-empty.png"), `${item.id} uses its exact saved filled/empty sequence`);
        containedPlacement(result, star, { x: x + (40 + ordinal * 39) * cardScale, y: y + 189.5 * cardScale,
          width: 36 * cardScale, height: 37 * cardScale }, `${item.id} list star ${ordinal}`);
      }
      assert.ok(!texts.includes(info.collectedText), "obtained level replaces its old collected caption with stars");
      cardStars.push(expectedStars);
    } else {
      assert.equal(stars.length, 0, `${item.id}: locked level or masterpiece never paints list stars`);
      if (item.category === "level") { assert.equal(item.stars, 0, "locked level retains zero-star progress"); cardStars.push(0); }
      if (!item.collected && !item.blueprintUnlocked) {
        assert.equal(info.unlockLevel, item.category === "level" ? Number(item.id.slice(6)) : Number(item.id.slice(12)) * 5, "unlock caption uses this catalog item's actual level");
        assert.ok(texts.includes(info.unlockText), `${item.id} paints the localized compact unlock caption`);
        if (result.language === "zh-CN") assert.equal(info.unlockText, `通关${info.unlockLevel}解锁`, "Chinese card caption has no extra 第/关/spaces");
      } else assert.ok(texts.includes(item.collected ? info.collectedText : info.previewText), "masterpieces keep their collected/restoration captions");
    }
  }
  const selectedTab = result.state.collectionAlbum.tab;
  const tabColors = { levels: selectedTab === "levels" ? "purple" : "blue", masterpieces: selectedTab === "masterpieces" ? "purple" : "blue" };
  const progressX = selectedTab === "masterpieces" ? 32 : 192;
  const fixed = [[`tab-${tabColors.levels}.png`, 90, 210, 242, 242 * 77 / 204], [`tab-${tabColors.masterpieces}.png`, 394, 210, 241, 241 * 80 / 203],
    ["progress-panel.png", progressX, 332, 320, 60], ["progress-icon.png", progressX + 44, 340, 45, 46]];
  const { scale, offsetX, offsetY } = result.state.collectionAlbum.layout.artTransform;
  for (const [file, x, y, width, height] of fixed) {
    const draw = draws.find(candidate => candidate.source.endsWith(`/${file}`));
    assert.ok(draw, `fixed supplied ${file}`);
    containedPlacement(result, draw, { x, y, width, height }, file);
  }
  const progressPanels = draws.filter(draw => draw.source.endsWith("/progress-panel.png"));
  assert.equal(progressPanels.length, selectedTab === "masterpieces" ? 2 : 1, "only masterpieces add the current inspiration balance panel");
  if (selectedTab === "masterpieces") {
    containedPlacement(result, progressPanels[1], { x: 368, y: 332, width: 320, height: 60 }, "current inspiration panel");
  }
  const masks = draws.filter(draw => draw.source.endsWith("/mask.png"));
  const locks = draws.filter(draw => draw.source.endsWith("/lock.png"));
  const lockedIndices = result.state.collectionAlbum.visibleItems.flatMap((item, index) => !item.collected && !item.blueprintUnlocked ? [index] : []);
  assert.equal(masks.length, lockedIndices.length, "only truly locked cards use a mask");
  assert.equal(locks.length, lockedIndices.length, "restorable cards have no lock");
  for (const [ordinal, index] of lockedIndices.entries()) {
    const x = 18.75 + index % 3 * 240, y = 420 + Math.floor(index / 3) * 300 + gridOffset;
    placement(result, masks[ordinal], x + 17 * cardScale, y + 27 * cardScale, "locked card mask");
    placement(result, locks[ordinal], x + 64.5 * cardScale, y + 68 * cardScale, "locked card lock");
  }
  const artworkDraws = result.draws.filter(draw => draw.source.includes("/collection-card-atlases-v1/"));
  assert.equal(artworkDraws.length, frames.length, "one atlas window per card");
  for (const [index, draw] of artworkDraws.entries()) {
    const x = 18.75 + index % 3 * 240 + 17 * cardScale;
    const y = 420 + Math.floor(index / 3) * 300 + gridOffset + 27 * cardScale;
    const expected = [offsetX + x * scale, offsetY + y * scale, 159 * cardScale * scale, 157 * cardScale * scale];
    assert.equal(draw.args.length, 8);
    assert.ok(draw.args.slice(4).every((value, axis) => Math.abs(value - expected[axis]) < 1e-7), "v3 artwork fits the rectangular 159x157 picture well");
  }
  for (const draw of masks) assert.equal(draw.alpha, 1, "supplied mask keeps its authored partial alpha without another opacity multiplier");
  const book = draws.find(draw => draw.source.endsWith("/guide-book.png"));
  assert.ok(book, "gameplay guide uses the small book in the lower left");
  containedPlacement(result, book, { x: 24, y: 1300, width: 128, height: 90 }, "guide book");
  for (const [file, x, y, width, height] of [["page-previous.png", 204, 1330, 64, 64], ["page-next.png", 456, 1330, 64, 64], ["page-indicator.png", 282, 1340, 156, 44]]) {
    const draw = draws.find(candidate => candidate.source.endsWith(`/${file}`));
    assert.ok(draw, `official ${file} is painted`);
    containedPlacement(result, draw, { x, y, width, height }, file);
  }
  assert.ok(result.texts.every(item => !/[‹›★☆]/.test(item.text)), "official arrow/star images are not substituted with glyphs");
  assert.ok(!result.draws.some(draw => /\/collection-album-v1\/(page-button|guide-book|star)\.webp$/.test(draw.source)), "retired arrow/book/star assets are not drawn");
  const guide = result.state.collectionAlbum.layout.guide.visual;
  assert.ok(guide.x < result.state.collectionAlbum.layout.pagination.previous.visual.x
    && guide.y > result.state.collectionAlbum.layout.cards.at(-1).visual.y, "book is below the nine-card grid");
  assert.equal(draws.filter(draw => /\/tab-(blue|purple)\.png$/.test(draw.source)).length, 2, "only the two top category tabs are painted");
  const inspirationDraws = result.draws.filter(draw => draw.source.endsWith(inspirationPath));
  assert.equal(inspirationDraws.length, selectedTab === "masterpieces" ? 1 : 0,
    "only the masterpiece header paints the restored inspiration palette once");
  if (selectedTab === "masterpieces") {
    const palette = inspirationDraws[0];
    assert.deepEqual([palette.width, palette.height], [48, 48], "palette retains its native size");
    assert.equal(palette.args.length, 4, "palette uses the complete uncropped bitmap");
    assert.equal(palette.alpha, 1, "palette uses its source alpha without extra dimming");
    containedPlacement(result, palette, { x: 384, y: 338, width: 48, height: 48 }, "inspiration palette");
    const balanceRect = result.state.collectionAlbum.layout.progress.inspirationText;
    const balanceLabels = result.texts.filter(text => Math.abs(text.x - balanceRect.x - balanceRect.width / 2) < 1e-7
      && Math.abs(text.y - balanceRect.y - balanceRect.height / 2) < 1e-7);
    assert.equal(balanceLabels.length, 1, "balance has its own text slot beside the palette");
    assert.ok(balanceLabels[0].text.includes(String(result.state.collectionAlbum.inspiration)), "the displayed amount is the current balance");
  }
  for (const key of ["collectionAlbumTab.levels", "collectionAlbumTab.masterpieces", "collectionAlbumGuide", "collectionAlbumPrevious", "collectionAlbumNext"]) {
    const target = result.state.interactionTargets.targets[key];
    assert.ok(target && target.cssWidth >= 43.9 && target.cssHeight >= 43.9, `${key} retains a 44 CSS px target`);
  }
  return { frames, masks, tabColors, cardStars };
}
async function returnToFirstAlbumPage(page) {
  let state = await debug(page);
  while (state.collectionAlbum.pageIndex > 0) {
    await click(page, "collectionAlbumPrevious");
    state = await debug(page);
  }
  assert.equal(state.collectionAlbum.pageIndex, 0, "manual previous-page navigation reaches the first page");
}
async function paginate(page, tab, count) {
  await click(page, `collectionAlbumTab.${tab}`);
  const seen = [];
  let state = await debug(page);
  await returnToFirstAlbumPage(page);
  const pages = Math.ceil(count / 9);
  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    await ready(page);
    state = await debug(page);
    assert.equal(state.collectionAlbum.pageCount, pages);
    assert.equal(state.collectionAlbum.pageIndex, pageIndex);
    assert.equal(state.collectionAlbum.visibleItems.length, Math.min(9, count - pageIndex * 9));
    seen.push(...state.collectionAlbum.visibleItems.map(item => item.id));
    assertGrid(await probe(page));
    if (pageIndex + 1 < pages) await click(page, "collectionAlbumNext");
  }
  assert.equal(new Set(seen).size, count, `all ${tab} ids reachable without duplication`);
  assert.equal(seen.length, count);
  const last = parentState(state);
  await click(page, "collectionAlbumNext"); assert.deepEqual(parentState(await debug(page)), last, "last page cannot overflow");
  return { pages, total: seen.length, lastVisible: last.ids };
}

try {
  for (const scenario of [
    { name: "720x1584", viewport: { width: 720, height: 1584 } },
    { name: "320x568", viewport: { width: 320, height: 568 } },
    { name: "320x568-safe", viewport: { width: 320, height: 568 }, safe: true },
  ]) {
    const context = await browser.newContext({ viewport: scenario.viewport, locale: "zh-CN" });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${scenario.name}: ${error.message}`));
    page.on("console", message => { if (message.type() === "error" && !message.text().includes("navigator.vibrate")) errors.push(`${scenario.name}: ${message.text()}`); });
    const targetUrl = new URL(url);
    if (scenario.safe) { targetUrl.searchParams.set("safeTop", "44"); targetUrl.searchParams.set("safeBottom", "34"); }
    await page.goto(targetUrl.href, { waitUntil: "networkidle" });
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: saveKey, value: makeSave() });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady && window.__COLOR_ESCAPE__.storageBaselineReady);
    await page.evaluate(() => { const game = window.__COLOR_ESCAPE__; game.updateToastVisible = false; game.boosterUnlockToast = undefined; });
    const resources = await page.evaluate(async () => {
      const { GAME_ART } = await import("/src/game/artManifest.ts");
      return [...Object.values(GAME_ART.ui.collectionAlbum), ...GAME_ART.ui.collectionCardAtlases.levels, ...GAME_ART.ui.collectionCardAtlases.masterpieces];
    });
    const chromeCount = resources.filter(path => !path.includes('/collection-card-atlases-v1/')).length;
    const assertAlbumArt = state => {
      const art = state.collectionAlbum.art;
      assert.ok(art.ready && art.artworkReady);
      assert.ok(art.currentAtlasIndexes.every(index => art.loadedAtlasIndexes.includes(index)));
      assert.equal(art.loadedImages, chromeCount + art.loadedAtlasIndexes.length);
      assert.ok(art.loadedImages <= resources.length);
    };
    const guideResourceCount = await page.evaluate(async () => {
      const { GAME_ART } = await import("/src/game/artManifest.ts");
      const { itemImages, retiredItemImages, background, topHeader, titlePanel, ...chrome } = GAME_ART.ui.formalPages.collection;
      return Object.keys(chrome).length + itemImages.length;
    });
    assert.equal((await debug(page)).collectionAlbum.art.loadedImages, 0, "album images lazy on Home");
    await click(page, "navigation.4"); await ready(page);
    let state = await debug(page);
    assert.equal(state.collectionAlbum.tab, "levels", "bottom collection opens levels by default");
    assert.equal(state.collectionAlbum.pageIndex, defaultLevelPage, "entry opens the page containing the highest obtained level card");
    assert.ok(state.collectionAlbum.visibleItems.some(item => item.id === `level-${String(highestClearedLevel).padStart(3, "0")}`), "highest obtained level card is visible on entry");
    assert.equal(state.collectionAlbum.masterpieceCount, 40); assert.equal(state.collectionAlbum.levelCardCount, 200);
    assertAlbumArt(state); assert.ok(state.collectionAlbum.art.loadedAtlasIndexes.length < 10, "cold entry uses nearby atlases only");
    assert.equal(state.collectionAlbum.art.splitAssetCount, resources.length);
    assert.equal(state.collectionAlbum.visibleItems.length, 9);
    assert.equal(state.collectionAlbum.pageCount, 23);
    assert.ok(state.interactionTargets.targets["collectionAlbumTab.levels"] && state.interactionTargets.targets["collectionAlbumTab.masterpieces"], "both top categories are reachable");
    assert.ok(!state.interactionTargets.targets.homeCollectionAlbum && !state.interactionTargets.targets.collectionAlbumClose);
    const tabSelection = [];
    for (const [stage, tab] of [["initial-levels", "levels"], ["select-masterpieces", "masterpieces"], ["return-levels", "levels"]]) {
      if (stage !== "initial-levels") await click(page, `collectionAlbumTab.${tab}`);
      state = await debug(page);
      assert.equal(state.collectionAlbum.tab, tab, `${stage} selects the expected category`);
      assert.equal(state.collectionAlbum.pageIndex, tab === "levels" ? defaultLevelPage : 0, `${stage} uses the category's intended entry page`);
      const { tabColors } = assertGrid(await probe(page));
      assert.deepEqual(tabColors, tab === "levels" ? { levels: "purple", masterpieces: "blue" } : { levels: "blue", masterpieces: "purple" });
      const screenshot = `tabs-${stage}-${scenario.name}.png`;
      await page.screenshot({ path: resolve(output, screenshot) });
      tabSelection.push({ stage, selectedTab: tab, tabColors, screenshot });
    }
    // The artwork/star probes intentionally exercise pages 1 and 2, independent
    // of the progress-based entry page verified above. Navigate there manually.
    await returnToFirstAlbumPage(page);
    const locales = [];
    const observedCardStars = new Set();
    for (const language of languages) {
      await page.evaluate(value => { const game = window.__COLOR_ESCAPE__; game.save.language = value; game.render(); }, language);
      for (const stars of assertGrid(await probe(page)).cardStars) observedCardStars.add(stars);
      const gridFile = `album-${scenario.name}-${language}.png`;
      await page.screenshot({ path: resolve(output, gridFile) });
      await click(page, "collectionAlbumNext");
      const mixed = await debug(page);
      assert.ok(mixed.collectionAlbum.visibleItems.some(item => item.collected) && mixed.collectionAlbum.visibleItems.some(item => !item.collected), "second page has obtained and locked cards together");
      for (const stars of assertGrid(await probe(page)).cardStars) observedCardStars.add(stars);
      const mixedFile = `mixed-card-stars-${scenario.name}-${language}.png`;
      await page.screenshot({ path: resolve(output, mixedFile) });
      await click(page, "collectionAlbumPrevious");
      await click(page, "collectionAlbumCard.level-001");
      assertDetail(await probe(page));
      const detailFile = `detail-${scenario.name}-${language}.png`;
      await page.screenshot({ path: resolve(output, detailFile) });
      await click(page, "collectionAlbumDetailClose");
      assert.equal((await debug(page)).collectionAlbum.detailId, undefined);
      locales.push({ language, gridFile, mixedFile, detailFile });
    }
    assert.deepEqual([...observedCardStars].sort(), [0, 1, 2, 3], "list probes cover locked zero and obtained one/two/three-star progress");
    await page.evaluate(() => { window.__COLOR_ESCAPE__.save.language = "zh-CN"; });
    const masterpiecePages = await paginate(page, "masterpieces", 40);
    await click(page, "collectionAlbumCard.masterpiece-40"); assertDetail(await probe(page));
    assert.ok(!(await debug(page)).interactionTargets.targets.collectionAlbumDetailPrimary, "locked masterpiece has no invisible primary target");
    await page.screenshot({ path: resolve(output, `locked-detail-${scenario.name}.png`) });
    await click(page, "collectionAlbumDetailClose");
    const levelPages = await paginate(page, "levels", 200);
    await click(page, "collectionAlbumCard.level-200"); assertDetail(await probe(page));
    assert.ok(!(await debug(page)).interactionTargets.targets.collectionAlbumDetailPrimary, "locked level has no invisible replay target");
    await page.screenshot({ path: resolve(output, `locked-level-detail-${scenario.name}.png`) });
    await click(page, "collectionAlbumDetailClose");
    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionAlbum.art.pendingAtlasIndexes.length === 0);
    const beforeGuide = parentState(await debug(page));
    const albumImagesBeforeGuide = (await debug(page)).collectionAlbum.art.loadedImages;
    const underlyingHome = (await debug(page)).interactionTargets.targets["navigation.2"].hit;
    await click(page, "collectionAlbumGuide");
    await page.waitForFunction(() => { const s = window.__COLOR_ESCAPE__.getDebugState(); return s.screen === "mechanismGuide" && s.collection.artReady; });
    state = await debug(page);
    assert.equal(state.collection.allTotal, 15); assert.equal(state.art.formalPage.loadedImages, guideResourceCount);
    assertAlbumArt(state); assert.equal(state.collectionAlbum.art.loadedImages, albumImagesBeforeGuide);
    await clickRect(page, underlyingHome); assert.equal((await debug(page)).screen, "mechanismGuide");
    await page.screenshot({ path: resolve(output, `guide-${scenario.name}.png`) });
    await click(page, "mechanismGuideClose");
    assert.deepEqual(parentState(await debug(page)), beforeGuide);
    assert.equal((await debug(page)).collectionAlbum.art.loadedImages, albumImagesBeforeGuide);
    assert.equal((await debug(page)).art.formalPage.loadedImages, 0);

    await click(page, "collectionAlbumTab.masterpieces");
    await click(page, "collectionAlbumCard.masterpiece-01"); assertDetail(await probe(page));
    assert.ok(!(await debug(page)).interactionTargets.targets.collectionAlbumDetailPrimary, "already restored masterpiece has no invisible primary target");
    await click(page, "collectionAlbumDetailClose");
    await click(page, "collectionAlbumCard.masterpiece-02");
    state = await debug(page); const inspirationBefore = state.collectionAlbum.inspiration;
    const restoreHit = state.interactionTargets.targets.collectionAlbumDetailPrimary.hit;
    const cost = state.collectionAlbum.visibleItems.find(item => item.id === "masterpiece-02").cost;
    await page.evaluate(() => {
      window.__collectionStorage = { get: Storage.prototype.getItem, set: Storage.prototype.setItem };
      Storage.prototype.setItem = function(key, value) {
        if (key === "color-escape-save-v1") { window.__collectionStorage.set.call(this, key, value); throw new Error("intentional acknowledgement loss"); }
        return window.__collectionStorage.set.call(this, key, value);
      };
      Storage.prototype.getItem = function(key) { if (key === "color-escape-save-v1") throw new Error("intentional readback outage"); return window.__collectionStorage.get.call(this, key); };
    });
    await click(page, "collectionAlbumDetailPrimary");
    state = await debug(page); assert.equal(state.collectionAlbum.pendingRestorationId, "masterpiece-02");
    assert.ok(state.interactionTargets.targets.collectionAlbumDetailPrimary, "unknown restoration keeps an actionable retry target");
    assert.equal(state.collectionAlbum.inspiration, inspirationBefore);
    const candidate = await page.evaluate(() => JSON.stringify(window.__COLOR_ESCAPE__.pendingCollectionRestoration.candidateSave));
    await click(page, "collectionAlbumDetailClose"); await clickRect(page, underlyingHome);
    state = await debug(page); assert.equal(state.screen, "records"); assert.equal(state.collectionAlbum.detailId, "masterpiece-02");
    assert.equal(await page.evaluate(() => JSON.stringify(window.__COLOR_ESCAPE__.pendingCollectionRestoration.candidateSave)), candidate);
    await page.evaluate(() => { Storage.prototype.getItem = window.__collectionStorage.get; Storage.prototype.setItem = window.__collectionStorage.set; });
    await click(page, "collectionAlbumDetailPrimary");
    state = await debug(page); assert.equal(state.collectionAlbum.pendingRestorationId, undefined);
    assert.equal(state.collectionAlbum.inspiration, inspirationBefore - cost);
    assert.ok(state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-02"));
    assert.ok(!state.interactionTargets.targets.collectionAlbumDetailPrimary, "committed restoration removes its former action target");
    await clickRect(page, restoreHit); assert.equal((await debug(page)).collectionAlbum.inspiration, inspirationBefore - cost);
    await click(page, "collectionAlbumDetailClose"); assertGrid(await probe(page));

    await page.waitForFunction(() => window.__COLOR_ESCAPE__.getDebugState().collectionAlbum.art.pendingAtlasIndexes.length === 0);
    assert.equal((await debug(page)).collectionAlbum.art.loadedAtlasIndexes.length, 10,
      "visiting all 240 illustrations eventually loads all ten original atlases");
    await page.evaluate(() => {
      const game = window.__COLOR_ESCAPE__, images = new Set([...Object.values(game.collectionAlbumArt), ...game.collectionAlbumArtwork.images]), release = game.host.releaseImage;
      window.__collectionReleased = [];
      game.host.releaseImage = function(image) { if (images.has(image)) window.__collectionReleased.push(image.currentSrc || image.src || ""); return release?.call(this, image); };
    });
    await click(page, "navigation.2");
    await page.waitForFunction(() => { const s = window.__COLOR_ESCAPE__.getDebugState(); return s.screen === "home" && !s.navigation.transition; });
    assert.equal((await debug(page)).collectionAlbum.art.loadedImages, 0);
    const released = await page.evaluate(() => window.__collectionReleased.map(source => new URL(source).pathname.slice(1)).sort());
    assert.deepEqual(released, [...resources].sort(), "main exit releases every exact album image, including supplied art");
    await click(page, "navigation.4"); await ready(page); await click(page, "collectionAlbumTab.levels");
    assert.equal((await debug(page)).collectionAlbum.pageIndex, defaultLevelPage, "external re-entry again locates the highest obtained level");
    await returnToFirstAlbumPage(page);
    await click(page, "collectionAlbumCard.level-001"); assertDetail(await probe(page));
    await click(page, "collectionAlbumDetailPrimary");
    await page.waitForFunction(() => { const s = window.__COLOR_ESCAPE__.getDebugState(); return s.level.id === 1 && ["playing", "feature"].includes(s.screen); });
    state = await debug(page); assert.equal(state.collectionAlbum.art.loadedImages, 0, "replay releases album art");
    assert.ok(state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-02"));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady && window.__COLOR_ESCAPE__.storageBaselineReady);
    state = await debug(page); assert.ok(state.collectionAlbum.restoredMasterpieceIds.includes("masterpiece-02"));
    assert.equal(state.collectionAlbum.inspiration, inspirationBefore - cost, "restoration survives replay and reload once");
    reports.push({ scenario: scenario.name, status: "pass", resources: resources.length, suppliedNativeAssets: Object.keys(supplied).length,
      masterpiecePages, levelPages, locales, tabSelection, cardStarValues: [...observedCardStars].sort(),
      compactActualUnlockLabels: true, masterpiecesKeepTextWithoutStars: true, unknownRestorationExactRetry: true, replayPreservesCollection: true,
      guideReturnsToParentPage: true, exactReleasedImages: released.length });
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(await fingerprint(), inputHashes, "runtime, layout, manifest, and official images remain stable throughout this run");
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "pass", isolatedContexts: true, inputHashes, imageAlpha, reports, errors }, null, 2));
  console.log("Collection supplied art PASS: native PNGs/alpha, 40 paintings and 200 cards in 9-card pages, guide/detail/replay, restoration retry, three viewports, ten languages, exact image release.");
} finally { await browser.close(); }
