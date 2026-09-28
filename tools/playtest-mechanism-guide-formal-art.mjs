import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const output = resolve(process.env.PLAYTEST_OUTPUT ?? `playtest-results/mechanism-guide-locked-icons-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const url = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const saveKey = "color-escape-save-v1";
const languages = ["zh-CN", "zh-TW", "en", "ja", "ko", "es", "pt", "fr", "de", "ru"];
const ids = ["generator", "axis-block", "key-lock", "star", "flip-door", "colored-grid", "bomb", "shutter", "layered-lift", "color-exit", "irregular-block", "irregular-board", "frozen-exit", "numeric-ice", "multilayer-shell"];
const unlockLevels = [35, 50, 59, 100, 150, 200, 120, 20, 65, 1, 5, 8, 6, 10, 15];
const prefix = "assets/art/ui/formal-pages/mechanism-guide-v2/";
const nativeChrome = {
  panel: [22, 226, 677, 1152], close: [624, 253, 94, 98],
  detailPanel: [80, 1030, 571, 294], titleShadow: [229, 1063, 281, 49], detailBody: [122, 1130, 484, 157],
};
const makeSave = (highest = 200) => ({
  schemaVersion: 1, currentLevel: highest, highestLevel: highest, coins: 2000,
  sound: false, haptic: false, reducedMotion: true, language: "zh-CN",
  featureSeen: ["basics"], boosterUnlockSeen: ["time", "rocket", "pulse"],
  boosters: { time: 3, rocket: 3, pulse: 3 }, bestMoves: {},
  bestStars: Object.fromEntries(Array.from({ length: highest - 1 }, (_, index) => [String(index + 1), index % 3 + 1])),
  rewardedLevels: Array.from({ length: highest - 1 }, (_, index) => index + 1),
  collectionProgress: { version: 1, inspiration: 1000, restoredMasterpieceIds: [], seenItemIds: [], claimedMilestoneIds: [] },
  metaDiscovery: { collectionViewedThroughLevel: highest, dailyUnlockSeen: true },
});
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], reports = [];
let spec, sourceMetadata, inputHashes;
const fingerprints = async paths => Object.fromEntries(await Promise.all(paths.map(async path =>
  [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const normalized = source => new URL(source, url).pathname.replace(/^\/+/, "");
const snapshotParent = state => ({ tab: state.collectionAlbum.tab, page: state.collectionAlbum.pageIndex,
  ids: state.collectionAlbum.visibleItems.map(item => item.id) });
async function point(page, rect) {
  const state = await debug(page), box = await page.locator("canvas").boundingBox();
  return { x: box.x + state.viewportTransform.offsetX + (rect.x + rect.width / 2) * state.viewportTransform.scale,
    y: box.y + state.viewportTransform.offsetY + (rect.y + rect.height / 2) * state.viewportTransform.scale };
}
async function clickRect(page, rect) { const p = await point(page, rect); await page.mouse.click(p.x, p.y); }
async function click(page, key) {
  const target = (await debug(page)).interactionTargets.targets[key]; assert.ok(target, `missing ${key}`);
  await clickRect(page, target.hit); await page.waitForTimeout(35);
}
async function readyAlbum(page) {
  await page.waitForFunction(() => { const s = window.__COLOR_ESCAPE__.getDebugState(); return s.screen === "records"
    && !s.navigation.transition && s.collectionAlbum.art.ready && s.collectionAlbum.art.artworkReady; });
}
async function readyGuide(page) {
  await page.waitForFunction(() => { const s = window.__COLOR_ESCAPE__.getDebugState(); return s.screen === "mechanismGuide"
    && s.collection.artReady && !s.art.formalPage.requested && !s.art.formalPage.error; });
}
async function lifecycle(page) {
  return page.evaluate(() => ({ active: Object.entries(window.__guideImages.active).map(([id, src]) => ({ id: Number(id), src })),
    released: [...window.__guideImages.released], failed: [...window.__guideImages.failed] }));
}
async function createPage(scenario, highest = 200) {
  const context = await browser.newContext({ viewport: scenario.viewport, locale: "zh-CN" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src"), imageIds = new WeakMap();
    const tracker = { active: {}, released: [], failed: [], nextId: 1, idFor: image => imageIds.get(image) };
    window.__guideImages = tracker;
    Object.defineProperty(HTMLImageElement.prototype, "src", { configurable: true, get: descriptor.get, set(value) {
      let id = imageIds.get(this); if (!id) {
        id = tracker.nextId++; imageIds.set(this, id);
        this.addEventListener("error", () => {
          // A rejected, never-decoded Image is not an owned loaded resource.
          // Keep explicit failure evidence; successful siblings still require release.
          if (tracker.active[id] && !this.naturalWidth) {
            const failure = { id, src: tracker.active[id], handlersCleared: false };
            tracker.failed.push(failure); delete tracker.active[id];
            queueMicrotask(() => { failure.handlersCleared = this.onload === null && this.onerror === null; });
          }
        });
      }
      const src = value ? new URL(String(value), location.href).pathname.replace(/^\/+/, "") : "";
      if (tracker.active[id] && tracker.active[id] !== src) tracker.released.push(id);
      if (src) tracker.active[id] = src; else delete tracker.active[id];
      descriptor.set.call(this, value);
    } });
  });
  page.on("pageerror", error => errors.push(`${scenario.name}: ${error.message}`));
  page.on("console", message => { if (message.type() === "error" && !message.text().includes("navigator.vibrate")
    && !(scenario.expectedFailure && message.text().includes("net::ERR_FAILED"))) errors.push(`${scenario.name}: ${message.text()}`); });
  const target = new URL(url);
  if (scenario.safe) { target.searchParams.set("safeTop", "80"); target.searchParams.set("safeBottom", "50"); }
  await page.goto(target.href, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.storageBaselineReady && window.__COLOR_ESCAPE__?.artReady);
  await page.evaluate(({ key, save }) => { save.lastSeenUpdate = window.__COLOR_ESCAPE__.getDebugState().updateNotice.id; localStorage.setItem(key, JSON.stringify(save)); }, { key: saveKey, save: makeSave(highest) });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__COLOR_ESCAPE__?.storageBaselineReady && window.__COLOR_ESCAPE__?.artReady);
  await click(page, "navigation.4"); await readyAlbum(page);
  return { page, context };
}
async function swipe(page, later) {
  const viewport = (await debug(page)).collection.layout.listViewportRect;
  const start = await point(page, { x: viewport.x, y: viewport.y + viewport.height * (later ? .78 : .22), width: viewport.width, height: 0 });
  const end = await point(page, { x: viewport.x, y: viewport.y + viewport.height * (later ? .22 : .78), width: viewport.width, height: 0 });
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 7 }); await page.mouse.up(); await page.waitForTimeout(40);
}
async function select(page, id) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const state = await debug(page);
    if (state.interactionTargets.targets[`collection.${id}`]) { await click(page, `collection.${id}`); assert.equal((await debug(page)).collection.selectedId, id); return; }
    const visible = state.collection.visibleEntries;
    await swipe(page, state.collection.orderedItemIds.indexOf(id) > visible[0].index);
  }
  assert.fail(`cannot reach ${id}`);
}
async function probe(page) {
  return page.evaluate(() => {
    const game = window.__COLOR_ESCAPE__, ctx = game.ctx;
    const old = { guide: game.drawMechanismGuide, draw: ctx.drawImage, fill: ctx.fillText, label: game.label, wrap: game.wrapText, press: game.drawPressable };
    const draws = [], labels = [], text = [];
    let inGuide = false, inBody = false;
    let cardId;
    const matrix = () => { const m = ctx.getTransform(); return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }; };
    game.drawMechanismGuide = function(...args) { inGuide = true; try { return old.guide.apply(this, args); } finally { inGuide = false; } };
    ctx.drawImage = function(image, ...args) { if (inGuide) draws.push({ source: image.currentSrc || image.src,
      width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, args, matrix: matrix(), alpha: this.globalAlpha, cardId }); return old.draw.call(this, image, ...args); };
    game.drawPressable = function(key, ...args) { const previous = cardId; if (inGuide && key.startsWith("collection.")) cardId = key.slice(11);
      try { return old.press.call(this, key, ...args); } finally { cardId = previous; } };
    game.label = function(value, x, y, size, ...args) { if (inGuide) labels.push({ text: String(value), x, y, size }); return old.label.call(this, value, x, y, size, ...args); };
    game.wrapText = function(...args) { const previous = inBody; if (inGuide) inBody = true; try { return old.wrap.apply(this, args); } finally { inBody = previous; } };
    ctx.fillText = function(value, x, y, maxWidth) {
      if (inGuide) { const metrics = this.measureText(value); text.push({ text: String(value), x, y, maxWidth, inBody, font: this.font,
        align: this.textAlign, baseline: this.textBaseline, width: metrics.width, left: metrics.actualBoundingBoxLeft,
        right: metrics.actualBoundingBoxRight, ascent: metrics.actualBoundingBoxAscent, descent: metrics.actualBoundingBoxDescent, matrix: matrix() }); }
      return maxWidth === undefined ? old.fill.call(this, value, x, y) : old.fill.call(this, value, x, y, maxWidth);
    };
    try { game.render(); } finally { game.drawMechanismGuide = old.guide; ctx.drawImage = old.draw; ctx.fillText = old.fill; game.label = old.label; game.wrapText = old.wrap; game.drawPressable = old.press; }
    return { draws, labels, text, state: game.getDebugState() };
  });
}
const transformPoint = (m, x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
function drawBox(draw) {
  assert.ok(draw.args.length === 2 || draw.args.length === 4, `full bitmap without cropping: ${draw.source}`);
  const [x, y, width = draw.width, height = draw.height] = draw.args;
  assert.ok(Math.abs(width / draw.width - height / draw.height) < 1e-7, `uniform source aspect: ${draw.source}`);
  const start = transformPoint(draw.matrix, x, y), end = transformPoint(draw.matrix, x + width, y + height);
  return { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y };
}
function compareBox(actual, expected, label) { for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(actual[key] - expected[key]) < .001, `${label}.${key}: ${actual[key]} != ${expected[key]}`); }
function expectedBox(native, matrix) { const [x, y, width, height] = native, start = transformPoint(matrix, x, y), end = transformPoint(matrix, x + width, y + height); return { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y }; }
function assertRender(result) {
  const { state, draws } = result;
  const drawFor = key => draws.find(draw => normalized(draw.source) === spec.chrome[key]);
  const panel = drawFor("panel"); assert.ok(panel, "official full panel is painted");
  const panelBox = drawBox(panel);
  assert.deepEqual([panel.width, panel.height], [677, 1152]);
  const matrix = { a: panelBox.width / 677, b: 0, c: 0, d: panelBox.height / 1152,
    e: panelBox.x - 22 * panelBox.width / 677, f: panelBox.y - 226 * panelBox.height / 1152 };
  assert.ok(Math.abs(matrix.a - matrix.d) < 1e-7, "panel is uniformly transformed");
  for (const [key, native] of Object.entries(nativeChrome)) { const draw = drawFor(key); assert.ok(draw, `${key} painted`); compareBox(drawBox(draw), expectedBox(native, matrix), key); }
  const sourceList = [...Object.values(spec.chrome), ...spec.items];
  for (const draw of draws) {
    const source = normalized(draw.source);
    if (!sourceList.includes(source)) continue;
    assert.deepEqual([draw.width, draw.height], sourceMetadata[source], `native dimensions for ${source}`);
    drawBox(draw);
  }
  const entries = state.collection.visibleEntries;
  const cards = draws.filter(draw => normalized(draw.source) === spec.chrome.card);
  assert.equal(cards.length, entries.length);
  for (const [index, entry] of entries.entries()) {
    compareBox(drawBox(cards[index]), expectedBox([87 + entry.column * 192, 400 + entry.row * 234 - state.collection.scrollOffset, 158, 198], matrix), `card ${entry.id}`);
    const iconPath = spec.items[ids.indexOf(entry.id)];
    const icons = draws.filter(draw => draw.cardId === entry.id && normalized(draw.source) === iconPath);
    assert.equal(icons.length, 1, `${entry.id}: every visible card paints its official mechanism icon, including locked cards`);
    const [width, height] = sourceMetadata[iconPath], scale = Math.min(1, 140 / width, 130 / height);
    compareBox(drawBox(icons[0]), expectedBox([87 + entry.column * 192 + 79 - width * scale / 2,
      400 + entry.row * 234 - state.collection.scrollOffset + 88 - height * scale / 2, width * scale, height * scale], matrix), `native contained icon ${entry.id}`);
    const cardMasks = draws.filter(draw => draw.cardId === entry.id && normalized(draw.source) === spec.chrome.lockedOverlay);
    const cardLocks = draws.filter(draw => draw.cardId === entry.id && normalized(draw.source) === spec.chrome.lock);
    assert.equal(cardMasks.length, entry.unlocked ? 0 : 1, `${entry.id}: lock mask matches unlock state`);
    assert.equal(cardLocks.length, entry.unlocked ? 0 : 1, `${entry.id}: lock badge matches unlock state`);
    assert.ok(draws.indexOf(cards[index]) < draws.indexOf(icons[0]), `${entry.id}: frame precedes icon`);
    if (!entry.unlocked) {
      assert.ok(draws.indexOf(icons[0]) < draws.indexOf(cardMasks[0])
        && draws.indexOf(cardMasks[0]) < draws.indexOf(cardLocks[0]), `${entry.id}: icon is painted beneath dim mask and lock badge`);
    }
  }
  const locked = entries.filter(entry => !entry.unlocked);
  const masks = draws.filter(draw => normalized(draw.source) === spec.chrome.lockedOverlay), locks = draws.filter(draw => normalized(draw.source) === spec.chrome.lock);
  assert.equal(masks.length, locked.length); assert.equal(locks.length, locked.length);
  for (const [index, entry] of locked.entries()) {
    const x = 87 + entry.column * 192, y = 400 + entry.row * 234 - state.collection.scrollOffset;
    compareBox(drawBox(masks[index]), expectedBox([x, y, 159, 197], matrix), `mask ${entry.id}`);
    compareBox(drawBox(locks[index]), expectedBox([x + 47, y + 49.5, 64, 77], matrix), `lock ${entry.id}`);
  }
  const selected = entries.find(entry => entry.id === state.collection.selectedId && entry.unlocked);
  const outlines = draws.filter(draw => normalized(draw.source) === spec.chrome.selected);
  assert.equal(outlines.length, selected ? 1 : 0, "selected outline is exclusive to the visible unlocked selected card");
  if (selected) compareBox(drawBox(outlines[0]), expectedBox([79 + selected.column * 192, 393 + selected.row * 234 - state.collection.scrollOffset, 174, 212], matrix), "selection outline");
  assert.ok(result.labels.some(label => Math.abs(label.size - 51) < 1e-7), "51px native heading");
  assert.ok(result.labels.some(label => Math.abs(label.size - 27) < 1e-7), "27px native card captions");
  assert.ok(result.labels.some(label => Math.abs(label.size - 30) < 1e-7), "30px native detail title");
  assert.ok(result.text.every(line => !line.text.includes("undefined") && !/\{\w+\}/.test(line.text)), "resolved localized strings");
  const body = result.text.filter(line => line.inBody);
  assert.ok(body.length, "selected detail body is painted");
  const compactText = value => value.replace(/\s/g, "");
  assert.equal(compactText(body.map(line => line.text).join("")), compactText(state.collection.displayedDetail), "complete localized rule is painted without truncation");
  for (const line of body) {
    const textScale = line.maxWidth === undefined ? 1 : Math.min(1, line.maxWidth / line.width);
    const x0 = line.x - line.left * textScale, x1 = line.x + line.right * textScale, y0 = line.y - line.ascent, y1 = line.y + line.descent;
    assert.ok(x0 >= 121 && x1 <= 607 && y0 >= 1129 && y1 <= 1288, `detail body stays within supplied inset: ${JSON.stringify(line)}`);
    assert.ok(Number(line.font.match(/([\d.]+)px/)?.[1]) <= 26, "detail uses native 26px or a bounded fit for long text");
  }
  const close = state.interactionTargets.targets.mechanismGuideClose;
  assert.ok(close && close.cssWidth >= 43.9 && close.cssHeight >= 43.9, "44 CSS px close");
  assert.equal(state.collection.allTotal, 15); assert.deepEqual(state.collection.orderedItemIds, ids);
  assert.ok(!state.collection.orderedItemIds.some(id => ["color-block", "timed-generator", "staged-frame"].includes(id)), "retired display entries are absent");
  assert.ok(!state.collection.hasCategoryTabs && !state.collection.hasPagination);
  return { bodyLines: body.length, smallestBodyFont: Math.min(...body.map(line => Number(line.font.match(/([\d.]+)px/)?.[1] ?? 0))) };
}
async function openAndAudit(page) {
  const before = await lifecycle(page), parent = snapshotParent(await debug(page));
  await click(page, "collectionAlbumGuide"); await readyGuide(page);
  const after = await lifecycle(page), beforeIds = new Set(before.active.map(image => image.id));
  const added = after.active.filter(image => !beforeIds.has(image.id));
  assert.deepEqual(added.map(image => image.src).sort(), [...Object.values(spec.chrome), ...spec.items].sort(), "guide creates every exact image instance");
  assert.equal(added.length, 24); assert.equal(new Set(added.map(image => image.src)).size, 24, "nine chrome and fifteen different icon resources");
  assert.equal((await debug(page)).art.formalPage.loadedImages, added.length);
  assert.equal(await page.evaluate(() => window.__COLOR_ESCAPE__.formalPageArtFor("records").close === window.__COLOR_ESCAPE__.collectionAlbumArt.detailClose), false, "shared Daily close URL is an independent guide image");
  return { before, parent, added };
}
async function closeAndAudit(page, audit) {
  await click(page, "mechanismGuideClose");
  const after = await lifecycle(page), state = await debug(page);
  assert.equal(state.screen, "records"); assert.equal(state.art.formalPage.loadedImages, 0);
  assert.deepEqual(snapshotParent(state), audit.parent);
  const active = new Set(after.active.map(image => image.id));
  for (const image of audit.added) assert.ok(!active.has(image.id) && after.released.includes(image.id), `guide image ${image.id} released`);
  assert.deepEqual(after.active, audit.before.active, "close releases no album/permanent/shared-URL image");
}

async function auditLockedScroll(page, scenarioName) {
  const initial = await debug(page), directions = [];
  assert.equal(initial.collection.scrollOffset, 0, "locked sweep starts at first row");
  for (const later of [true, false]) {
    const seen = new Set(), frames = [];
    for (let step = 0; step < 40; step++) {
      const result = await probe(page);
      assertRender(result);
      const collection = result.state.collection;
      assert.deepEqual(collection.unlockedItemIds, initial.collection.unlockedItemIds, "scrolling does not unlock mechanics");
      for (const entry of collection.visibleEntries) seen.add(entry.id);
      frames.push({ scrollOffset: collection.scrollOffset, visible: collection.visibleEntries.map(entry => ({ id: entry.id, unlocked: entry.unlocked })) });
      if (later ? !collection.canScrollDown : !collection.canScrollUp) break;
      await swipe(page, later);
    }
    assert.deepEqual([...seen].sort(), [...ids].sort(), `all fifteen official icons audited scrolling ${later ? "down" : "up"}`);
    const final = await debug(page);
    assert.equal(final.collection.scrollOffset, later ? final.collection.maxScrollOffset : 0, "sweep reaches exact list boundary");
    const screenshot = `locked-${later ? "bottom" : "returned-top"}-${scenarioName}.png`;
    await page.screenshot({ path: resolve(output, screenshot) });
    directions.push({ direction: later ? "down" : "up", seen: [...seen], frames, screenshot });
  }
  return directions;
}

try {
  for (const scenario of [
    { name: "720x1584", viewport: { width: 720, height: 1584 } },
    { name: "320x568", viewport: { width: 320, height: 568 } },
    { name: "320x568-safe", viewport: { width: 320, height: 568 }, safe: true },
  ]) {
    const { page, context } = await createPage(scenario);
    if (!spec) {
      spec = await page.evaluate(async () => { const { GAME_ART } = await import("/src/game/artManifest.ts");
        const { itemImages, retiredItemImages, background, topHeader, titlePanel, ...chrome } = GAME_ART.ui.formalPages.collection;
        return { chrome, items: itemImages }; });
      const sources = [...new Set([...Object.values(spec.chrome), ...spec.items])];
      assert.equal(Object.keys(spec.chrome).length, 9); assert.equal(spec.items.length, 15);
      assert.deepEqual(spec.items, ids.map(id => `${prefix}icon-${id}.png`), "official icons follow workbook order without index shifting");
      sourceMetadata = Object.fromEntries(await Promise.all(sources.map(async source => { const m = await sharp(resolve("public", source)).metadata(); return [source, [m.width, m.height]]; })));
      const paths = ["src/game/ColorEscapeGame.ts", "src/game/artManifest.ts", "src/game/formalPageLayout.ts", "src/game/mechanismGuideLayout.ts", "src/core/mechanismCatalog.ts", "src/game/localization.ts", ...sources.map(source => `public/${source}`)];
      inputHashes = await fingerprints(paths);
    }
    await click(page, "collectionAlbumTab.masterpieces"); await click(page, "collectionAlbumNext");
    const blockedHome = (await debug(page)).interactionTargets.targets["navigation.2"].hit;
    const audit = await openAndAudit(page);
    assert.equal((await debug(page)).collection.selectedId, "generator");
    assert.equal((await debug(page)).collection.unlocked, 15);
    assertRender(await probe(page));
    await page.screenshot({ path: resolve(output, `first-open-${scenario.name}.png`) });
    await clickRect(page, blockedHome); assert.equal((await debug(page)).screen, "mechanismGuide");
    const locales = [];
    for (const language of languages) {
      await page.evaluate(value => { window.__COLOR_ESCAPE__.save.language = value; }, language);
      const details = [];
      for (const id of ids) {
        await page.evaluate(value => { const game = window.__COLOR_ESCAPE__; game.collectionSelectedId = value; game.render(); }, id);
        const result = await probe(page), metrics = assertRender(result);
        details.push({ id, length: result.state.collection.displayedDetail.length, ...metrics });
      }
      const longest = details.reduce((a, b) => a.length > b.length ? a : b);
      await select(page, longest.id); assertRender(await probe(page));
      const screenshot = `long-detail-${scenario.name}-${language}.png`;
      await page.screenshot({ path: resolve(output, screenshot) });
      locales.push({ language, details, longest: longest.id, screenshot });
    }
    await page.evaluate(() => { window.__COLOR_ESCAPE__.save.language = "zh-CN"; });
    await select(page, "multilayer-shell");
    while ((await debug(page)).collection.canScrollDown) await swipe(page, true);
    const bottom = await debug(page); assert.equal(bottom.collection.scrollOffset, bottom.collection.maxScrollOffset);
    assert.ok(bottom.interactionTargets.targets["collection.multilayer-shell"]);
    assertRender(await probe(page)); await page.screenshot({ path: resolve(output, `bottom-${scenario.name}.png`) });
    await closeAndAudit(page, audit);
    const again = await openAndAudit(page); await closeAndAudit(page, again);
    await context.close();

    const lockedScenario = await createPage({ ...scenario, name: `${scenario.name}-locked` }, 6);
    const lockedAudit = await openAndAudit(lockedScenario.page);
    const initialLocked = await debug(lockedScenario.page);
    assert.equal(initialLocked.collection.selectedId, "generator"); assert.equal(initialLocked.collection.scrollOffset, 0);
    assert.equal(initialLocked.collection.selectedUnlocked, false);
    assert.equal(initialLocked.collection.displayedDetail, "到达第 35 关后解锁");
    assert.deepEqual(initialLocked.collection.unlockedItemIds, ids.filter((_, index) => unlockLevels[index] <= 6));
    assertRender(await probe(lockedScenario.page));
    const lockedFirstScreenshot = `locked-first-open-${scenario.name}.png`;
    await lockedScenario.page.screenshot({ path: resolve(output, lockedFirstScreenshot) });
    const lockedScroll = await auditLockedScroll(lockedScenario.page, scenario.name);
    await select(lockedScenario.page, "numeric-ice");
    const lockedState = await debug(lockedScenario.page);
    assert.equal(lockedState.collection.selectedUnlocked, false); assert.equal(lockedState.collection.selectedDetail, undefined);
    assert.equal(lockedState.collection.displayedDetail, "到达第 10 关后解锁");
    assertRender(await probe(lockedScenario.page));
    await lockedScenario.page.screenshot({ path: resolve(output, `locked-selected-${scenario.name}.png`) });
    await closeAndAudit(lockedScenario.page, lockedAudit); await lockedScenario.context.close();
    reports.push({ scenario: scenario.name, locales, guideInstances: audit.added.length, exactInstanceRelease: true,
      sharedUrlInstancesKeptSeparate: true, lockedSelection: true, lockedFirstScreenshot, lockedScroll,
      lockedIconMaskOrder: true, bottomReached: true, parentStatePreserved: true });
  }
  for (const failure of [false, true]) {
    const scenario = { name: failure ? "failed-retry" : "late-close", viewport: { width: 720, height: 1584 }, expectedFailure: failure };
    const { page, context } = await createPage(scenario);
    let releaseDelay, requests = 0;
    const delayed = new Promise(resolveDelay => { releaseDelay = resolveDelay; });
    const routePattern = `**/${spec.chrome.panel}`;
    await page.route(routePattern, async route => { requests++; if (failure) await route.abort("failed"); else { await delayed; await route.continue(); } });
    const baseline = await lifecycle(page), parent = snapshotParent(await debug(page));
    await click(page, "collectionAlbumGuide");
    if (failure) {
      await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__.getDebugState().art.formalPage.error));
      const count = requests; await page.waitForTimeout(250); assert.equal(requests, count, "failed group does not auto-loop retry");
      const failedGroup = await lifecycle(page);
      assert.deepEqual(failedGroup.active, baseline.active, "all successfully decoded siblings in a failed group are released");
      assert.equal(failedGroup.failed.length - baseline.failed.length, requests, "network failures are recorded separately from loaded images");
      assert.ok(failedGroup.failed.slice(baseline.failed.length).every(image => image.handlersCleared), "rejected image handlers are cleared after error settlement");
      await page.unroute(routePattern); await click(page, "formalPageRetry"); await readyGuide(page);
      assertRender(await probe(page));
      const active = await lifecycle(page), baselineIds = new Set(baseline.active.map(image => image.id));
      await closeAndAudit(page, { before: baseline, parent, added: active.active.filter(image => !baselineIds.has(image.id)) });
    } else {
      assert.equal((await debug(page)).collection.artReady, false);
      await click(page, "mechanismGuideClose"); releaseDelay();
      await page.waitForTimeout(700); assert.ok(requests > 0);
      assert.equal((await debug(page)).screen, "records"); assert.deepEqual(snapshotParent(await debug(page)), parent);
      assert.deepEqual((await lifecycle(page)).active, baseline.active, "late group cannot reopen or retain any images");
      await page.unroute(routePattern); const audit = await openAndAudit(page); await closeAndAudit(page, audit);
    }
    reports.push({ scenario: scenario.name, requests, status: "pass" }); await context.close();
  }
  assert.deepEqual(await fingerprints(Object.keys(inputHashes)), inputHashes, "all runtime, layout, and used image inputs remain stable");
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "pass", inputHashes, spec, sourceMetadata, reports, errors }, null, 2));
  console.log(`Formal mechanism guide PASS: native panel/cards, all 15 official icons including locked cards, icon-mask-lock order, bidirectional locked scroll, 3 viewports/10 languages, bounded detail text, pointer selection/scroll, modal isolation, exact image-instance release, late close and failed retry. Report: ${resolve(output, "report.json")}`);
} finally { await browser.close(); }
