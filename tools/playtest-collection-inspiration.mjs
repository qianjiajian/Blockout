import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseUrl).hostname), 'Local source server only');
const sourceUrl = new URL('__collection_inspiration_fixture__', baseUrl).href;
const palettePath = 'assets/art/ui/formal-pages/collection-album-v1/inspiration.webp';
const output = resolve(root, `playtest-results/collection-inspiration-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const files = ['src/game/ColorEscapeGame.ts', 'src/game/collectionAlbumLayout.ts', 'src/game/collectionAlbumLocalization.ts',
  'src/game/artManifest.ts', 'src/game/canvasTypography.ts', 'src/core/collectionProgress.ts', 'src/core/collectionCatalog.ts',
  'src/core/levels.ts', 'src/platform/WebHost.ts', 'docs/rules/manifest.json', 'docs/mechanism-rules-v1.41.0.md',
  'art-source/ui/formal-pages/collection-album-v1/inspiration.png',
  'tools/playtest-collection-inspiration.mjs'];
async function walk(path) {
  const entries = await readdir(resolve(root, path), { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]))).flat().sort();
}
const assetInventory = () => walk('public/assets/art');
const inventoryBefore = await assetInventory();
files.push(...inventoryBefore.filter(path => /collection-album-v[123]|collection-card-atlases-v1|formal-pages\/collection\//.test(path)));
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file,
  createHash('sha256').update(await readFile(resolve(root, file))).digest('hex')])));
const report = { scope: 'Isolated MemoryHost saves; production collection Canvas, real Pointer navigation/restoration. UI regression only, not native-phone or full campaign/persistence-failure certification.',
  paletteEncoding: 'Reused original 48x48 PNG encoded with the existing lossy WebP-q72 collection standard. Source/runtime byte hashes are bound separately; no PNG/WebP RGBA-equality claim.',
  sourceUrl, output, sourcesBefore: await hashes(), assetInventoryBefore: inventoryBefore, scenarios: [], errors: [] };
await mkdir(output, { recursive: false });

const saveFor = (language, inspiration) => ({ schemaVersion: 1, currentLevel: 16, highestLevel: 17, coins: 1000,
  sound: false, haptic: false, reducedMotion: true, language, featureSeen: ['basics'], boosterUnlockSeen: ['time', 'rocket', 'pulse'],
  metaDiscovery: { collectionViewedItemIds: [] }, boosters: { time: 3, rocket: 3, pulse: 3 },
  bestStars: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [String(i + 1), i % 3 + 1])),
  bestMoves: {}, rewardedLevels: Array.from({ length: 16 }, (_, i) => i + 1),
  journeyProgress: { claimedMilestoneLevels: [], seenEpisodeUnlockLevels: [] }, achievementProgress: { claimedIds: [] }, selectedJourneyEpisode: 1,
  collectionProgress: { version: 1, inspiration, restoredMasterpieceIds: [], seenItemIds: [], claimedMilestoneIds: [] },
  dailyStreak: 0, lastDailyCompletedDay: '' });
const htmlFor = save => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { WebHost } from '/src/platform/WebHost.ts';
import { GAME_ART } from '/src/game/artManifest.ts';
import { COLLECTION_ALBUM_TRANSLATIONS, collectionAlbumText } from '/src/game/collectionAlbumLocalization.ts';
import { canvasFont } from '/src/game/canvasTypography.ts';
class MemoryHost extends WebHost {
 data=new Map(); imageRequests=[]; commits=[];
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){this.data.set(k,structuredClone(v));this.commits.push({key:k,value:structuredClone(v)});return true;}
 music(){} sound(){} vibrate(){}
 createImage(path){this.imageRequests.push(path);return super.createImage(path);}
}
const host=new MemoryHost();host.data.set('color-escape-save-v1',${JSON.stringify(save)});
const game=new ColorEscapeGame(host);
window.__COLLECTION_TEST__={game,host,collectionAlbumText,translations:COLLECTION_ALBUM_TRANSLATIONS,
 expectedImages:[...Object.values(GAME_ART.ui.collectionAlbum),...GAME_ART.ui.collectionCardAtlases.levels,...GAME_ART.ui.collectionCardAtlases.masterpieces]};
const ctx=game.ctx;ctx.save();ctx.font=canvasFont(950,21);
window.__COLLECTION_TEST__.languageWidths=Object.keys(COLLECTION_ALBUM_TRANSLATIONS).map(language=>({language,
 text:collectionAlbumText(language,'inspirationBalance',{amount:Number.MAX_SAFE_INTEGER}),
 width:ctx.measureText(collectionAlbumText(language,'inspirationBalance',{amount:Number.MAX_SAFE_INTEGER})).width})).sort((a,b)=>b.width-a.width);
ctx.restore();game.start();
</script>`;
const browser = await chromium.launch({ headless: true });
const paletteResponses = [];
let page;
const debug = () => page.evaluate(() => window.__COLLECTION_TEST__.game.getDebugState());
const click = async key => {
  const s = await debug(), rect = s.interactionTargets.targets[key]?.hit; assert(rect, `Actual target ${key} exists`);
  const canvas = await page.locator('canvas').boundingBox(); assert(canvas);
  await page.mouse.click(canvas.x + s.viewportTransform.offsetX + (rect.x + rect.width / 2) * s.viewportTransform.scale,
    canvas.y + s.viewportTransform.offsetY + (rect.y + rect.height / 2) * s.viewportTransform.scale);
  await page.waitForTimeout(45);
};
const ready = () => page.waitForFunction(() => {
  const s = window.__COLLECTION_TEST__.game.getDebugState(), art = s.collectionAlbum.art;
  return s.screen === 'records' && !s.navigation.transition && art.ready && art.artworkReady && !art.requested && !art.error && !art.artworkError
    && art.currentAtlasIndexes.every(index => art.loadedAtlasIndexes.includes(index));
});
async function newPage(viewport, language, inspiration) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: language });
  await context.addInitScript(() => {
    window.__NATIVE_STORAGE_CALLS__ = [];
    for (const key of ['getItem', 'setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[key];
      Storage.prototype[key] = function (...args) { window.__NATIVE_STORAGE_CALLS__.push(key); return original.apply(this, args); };
    }
  });
  page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => {
    if (new URL(response.url()).pathname === `/${palettePath}`) paletteResponses.push(response.body().then(bytes => ({
      url: response.url(), status: response.status(), bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })));
  });
  await page.route(sourceUrl, route => route.fulfill({ contentType: 'text/html', body: htmlFor(saveFor(language, inspiration)) }));
  await page.goto(sourceUrl, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__COLLECTION_TEST__?.game.artReady && window.__COLLECTION_TEST__.game.storageBaselineReady, undefined, { timeout: 60000 });
  // Suppress only unrelated one-time startup notices in this isolated save.
  await page.evaluate(() => { const { game } = window.__COLLECTION_TEST__; game.updateToastVisible = false; game.boosterUnlockToast = undefined; });
  return context;
}
async function probe() {
  return page.evaluate(() => {
    const t = window.__COLLECTION_TEST__, { game } = t, ctx = game.ctx;
    const draw = ctx.drawImage, fill = ctx.fillText, images = [], texts = [];
    ctx.drawImage = function (image, ...args) {
      const src = image.currentSrc || image.src || '', m = this.getTransform();
      images.push({ src, args, native: [image.naturalWidth || image.width, image.naturalHeight || image.height], alpha: this.globalAlpha,
        matrix: [m.a, m.b, m.c, m.d, m.e, m.f] });
      return draw.call(this, image, ...args);
    };
    ctx.fillText = function (text, x, y, maxWidth) {
      const metrics = this.measureText(text), compress = maxWidth == null ? 1 : Math.min(1, maxWidth / metrics.width);
      texts.push({ text: String(text), x, y, maxWidth: maxWidth ?? null, font: this.font, align: this.textAlign, baseline: this.textBaseline,
        naturalWidth: metrics.width, compress, bounds: { x: x - metrics.actualBoundingBoxLeft * compress, y: y - metrics.actualBoundingBoxAscent,
          width: (metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight) * compress,
          height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent } });
      return maxWidth == null ? fill.call(this, text, x, y) : fill.call(this, text, x, y, maxWidth);
    };
    try { game.render(); } finally { ctx.drawImage = draw; ctx.fillText = fill; }
    const state = game.getDebugState(), album = state.collectionAlbum, category = album.tab === 'levels'
      ? { owned: album.obtainedLevelCardCount, total: album.levelCardCount } : { owned: album.restoredMasterpieceCount, total: album.masterpieceCount };
    return { images, texts, state, language: game.save.language, expectedBalance: t.collectionAlbumText(game.save.language, 'inspirationBalance', { amount: album.inspiration }),
      expectedRestoreAction: t.collectionAlbumText(game.save.language, 'restoreAction'),
      expectedProgress: t.collectionAlbumText(game.save.language, 'collectionProgress', category),
      imageRequests: t.host.imageRequests, expectedImages: t.expectedImages, memorySave: structuredClone(t.host.data.get('color-escape-save-v1')),
      nativeStorageCalls: window.__NATIVE_STORAGE_CALLS__ };
  });
}
const near = (a, b, label) => assert(Math.abs(a - b) < 1e-6, `${label}: ${a} != ${b}`);
function expectedRect(result, rect) {
  const { scale, offsetX, offsetY } = result.state.collectionAlbum.layout.artTransform;
  return { x: offsetX + rect.x * scale, y: offsetY + rect.y * scale, width: rect.width * scale, height: rect.height * scale };
}
function assertContained(inner, outer, label, tolerance = .05) {
  assert(inner.x >= outer.x - tolerance && inner.y >= outer.y - tolerance && inner.x + inner.width <= outer.x + outer.width + tolerance
    && inner.y + inner.height <= outer.y + outer.height + tolerance, `${label}: ${JSON.stringify(inner)} outside ${JSON.stringify(outer)}`);
}
function assertPlacement(draw, expected, label) {
  assert(draw, `${label} drawn`); assert.equal(draw.args.length, 4, `${label} uses complete source`);
  draw.args.forEach((value, i) => near(value, [expected.x, expected.y, expected.width, expected.height][i], label));
  near(draw.args[2] / draw.native[0], draw.args[3] / draw.native[1], `${label} native aspect ratio`);
}
function containNative(draw, slot) {
  const scale = Math.min(slot.width / draw.native[0], slot.height / draw.native[1]);
  return { x: slot.x + (slot.width - draw.native[0] * scale) / 2,
    y: slot.y + (slot.height - draw.native[1] * scale) / 2, width: draw.native[0] * scale, height: draw.native[1] * scale };
}
function assertList(result, balance, owned = 0) {
  const album = result.state.collectionAlbum, layout = album.layout, scale = layout.artTransform.scale, masterpieces = album.tab === 'masterpieces';
  assert.equal(result.state.screen, 'records'); assert.equal(album.detailId, undefined); assert.equal(album.inspiration, balance);
  assert.equal(album.visibleItems.length, 9); assert.equal(layout.cards.filter(card => card.active).length, 9);
  assert.deepEqual(result.nativeStorageCalls, []);
  const panels = result.images.filter(image => image.src.endsWith('/collection-album-v2/progress-panel.png'));
  assert.equal(panels.length, masterpieces ? 2 : 1, 'Two existing panels only on Masterpieces');
  const xs = masterpieces ? [32, 368] : [192];
  for (const [i, x] of xs.entries()) {
    assert.deepEqual(panels[i].native, [320, 60]); assert.equal(panels[i].alpha, 1);
    const rect = expectedRect(result, { x, y: 332, width: 320, height: 60 });
    assertPlacement(panels[i], rect, `native progress panel ${i}`); assertContained(rect, layout.safeBounds, 'Panel inside safe bounds');
    assert(rect.y + rect.height < layout.grid.y, 'Header panels never overlap/squeeze card grid');
  }
  const icon = result.images.find(image => image.src.endsWith('/collection-album-v3/progress-icon.png'));
  assertPlacement(icon, expectedRect(result, { x: masterpieces ? 76 : 236, y: 340, width: 45, height: 46 }), 'Original progress icon');
  const progress = result.texts.find(text => text.text === result.expectedProgress); assert(progress, 'Progress label retained');
  assertContained(progress.bounds, layout.progress, 'Progress glyph ink contained');
  const palettes = result.images.filter(image => new URL(image.src, sourceUrl).pathname === `/${palettePath}`);
  assert.equal(palettes.length, masterpieces ? 1 : 0, 'Palette appears exactly once on Masterpieces and never on Levels');
  if (masterpieces) {
    assert.equal(album.restoredMasterpieceCount, owned);
    const balanceTexts = result.texts.filter(text => text.text === result.expectedBalance);
    assert.equal(balanceTexts.length, 1, 'Exactly one localized current-balance label');
    const palette = palettes[0], iconRect = expectedRect(result, { x: 384, y: 338, width: 48, height: 48 });
    const text = balanceTexts[0], rect = expectedRect(result, { x: 444, y: 332, width: 228, height: 60 });
    const panel = expectedRect(result, { x: 368, y: 332, width: 320, height: 60 });
    assert.deepEqual(palette.native, [48, 48]); assert.equal(palette.alpha, 1);
    assertPlacement(palette, iconRect, 'Reused palette stays square and correctly aligned');
    assert.deepEqual(layout.progress.inspirationIcon, iconRect); assert.deepEqual(layout.progress.inspirationText, rect);
    assertContained(iconRect, panel, 'Palette inside balance panel'); assertContained(rect, panel, 'Balance text slot inside panel');
    near(text.x, rect.x + rect.width / 2, 'Balance centered in its separate text rectangle');
    near(text.y, rect.y + rect.height / 2, 'Balance vertical center');
    near(iconRect.y + iconRect.height / 2, text.y, 'Palette center aligns with balance baseline anchor');
    near(text.maxWidth, 220 * scale, 'Balance reserves native 4px inset on both sides for glyph bearings');
    near(rect.x - (iconRect.x + iconRect.width), 12 * scale, 'Native palette/text slot gap retained');
    assertContained(text.bounds, rect, 'Actual balance glyph ink/maxWidth cannot overflow or reach palette');
    assert(text.bounds.x >= iconRect.x + iconRect.width + 10 * scale, 'Palette never overlaps actual balance glyph ink');
    assert.equal(text.align, 'center'); assert.equal(text.baseline, 'middle');
  } else assert(!result.texts.some(text => text.text === result.expectedBalance), 'Level tab has no balance label');
  const cards = result.images.filter(image => /\/collection-album-v3\/card-(gray|blue|purple|gold)\.png$/.test(image.src));
  assert.equal(cards.length, 9, 'Exactly nine intact existing card frames');
  const cardScale = 211.5 / 194;
  for (const [i, card] of cards.entries()) {
    const rect = expectedRect(result, { x: 18.75 + i % 3 * 240, y: 420 + Math.floor(i / 3) * 300 + layout.gridOffsetY / scale,
      width: 211.5, height: 242 * cardScale });
    assertPlacement(card, containNative(card, rect), `Unchanged native-fit card ${i}`);
  }
  const pendingRepairCards = masterpieces
    ? album.visibleItems.filter(item => item.blueprintUnlocked && !item.collected && item.cost <= balance)
    : [];
  const discoveryBadges = result.images.filter(image => image.src.endsWith('/notifications/discovery-badge-v1.png'));
  for (const item of pendingRepairCards) {
    const card = item.rect;
    const badgeScale = card.width / 194;
    const expected = {
      x: card.x + card.width - 40.5 * badgeScale,
      y: card.y + 4.5 * badgeScale,
      width: 39 * badgeScale,
      height: 39 * badgeScale,
    };
    const badge = discoveryBadges.find(image => image.args.length === 4
      && Math.abs(image.args[0] - expected.x) < 0.05
      && Math.abs(image.args[1] - expected.y) < 0.05);
    assertPlacement(badge, expected, `Repair notification badge for ${item.id}`);
  }
  const unaffordableRepairCards = masterpieces
    ? album.visibleItems.filter(item => item.blueprintUnlocked && !item.collected && item.cost > balance)
    : [];
  for (const item of unaffordableRepairCards) {
    const card = item.rect;
    const badgeScale = card.width / 194;
    const x = card.x + card.width - 40.5 * badgeScale;
    const y = card.y + 4.5 * badgeScale;
    assert(!discoveryBadges.some(image => image.args.length === 4
      && Math.abs(image.args[0] - x) < 0.05
      && Math.abs(image.args[1] - y) < 0.05),
    `Repair notification badge hidden without enough inspiration for ${item.id}`);
  }
  const albumRequests = result.imageRequests.filter(path => /formal-pages\/(collection-album|collection-card-atlases)/.test(path));
  assert(albumRequests.every(path => result.expectedImages.includes(path)), 'No new/nonmanifest album image request');
  const chromeCount = result.expectedImages.filter(path => !path.includes('/collection-card-atlases-v1/')).length;
  assert(album.art.ready && album.art.artworkReady, 'Current album page is ready');
  assert(album.art.currentAtlasIndexes.every(index => album.art.loadedAtlasIndexes.includes(index)), 'Every visible atlas is loaded');
  assert.equal(album.art.loadedImages, chromeCount + album.art.loadedAtlasIndexes.length, 'Only chrome and loaded atlases are resident');
  assert(album.art.loadedImages <= result.expectedImages.length, 'Residency stays within the manifest capacity');
  assert.equal(album.art.splitAssetCount, result.expectedImages.length);
  return { tab: album.tab, balance, owned: album.restoredMasterpieceCount, panels, progress,
    palette: palettes[0], balanceText: result.texts.find(text => text.text === result.expectedBalance), grid: layout.grid, cards,
    cardSlots: layout.cards.map(card => card.visual), safeBounds: layout.safeBounds, artTransform: layout.artTransform, imageRequests: albumRequests };
}
function assertDetail(result, itemId) {
  assert.equal(result.state.collectionAlbum.detailId, itemId);
  const panel = result.images.find(image => image.src.endsWith('/collection-album-v2/detail-panel.png'));
  assertPlacement(panel, expectedRect(result, { x: 21, y: 342, width: 679, height: 960 }), 'Unchanged detail panel');
  assert.deepEqual(panel.native, [679, 960]);
  assert(result.state.interactionTargets.targets.collectionAlbumDetailPrimary, 'Normal restoration remains reachable');
  const item = result.state.collectionAlbum.visibleItems.find(entry => entry.id === itemId);
  assert(item?.cost > 0, 'Detail item exposes its real inspiration cost');
  const scale = result.state.collectionAlbum.layout.artTransform.scale;
  const iconRect = expectedRect(result, { x: 325, y: 1205, width: 40, height: 40 });
  const palette = result.images.find(image => image.src.endsWith('/collection-album-v1/inspiration.webp')
    && image.args.length === 4 && Math.abs(image.args[0] - iconRect.x) < 0.05 && Math.abs(image.args[1] - iconRect.y) < 0.05);
  assertPlacement(palette, iconRect, 'Restoration button palette icon');
  const costRect = expectedRect(result, { x: 361, y: 1208, width: 32, height: 40 });
  const costText = result.texts.find(text => text.text === String(item.cost));
  assert(costText, 'Restoration button shows the real cost number');
  near(costText.x, costRect.x + costRect.width / 2, 'Restoration cost centered');
  near(costText.y, costRect.y + costRect.height / 2, 'Restoration cost vertical center');
  assertContained(costText.bounds, costRect, 'Restoration cost glyph contained');
  near((iconRect.x + costRect.x + costRect.width) / 2,
    expectedRect(result, { x: 238, y: 1198, width: 242, height: 90 }).x + 121 * scale,
    'Restoration icon and cost group centered in button');
  near(costRect.x - (iconRect.x + iconRect.width), -4 * scale, 'Restoration cost slot stays beside icon');
  const actionRect = expectedRect(result, { x: 250, y: 1242, width: 218, height: 40 });
  const actionText = result.texts.find(text => text.text === result.expectedRestoreAction);
  assert(actionText, 'Restoration button has localized action label');
  near(actionText.x, actionRect.x + actionRect.width / 2, 'Restoration action centered');
  near(actionText.y, actionRect.y + actionRect.height / 2, 'Restoration action vertical center');
  assertContained(actionText.bounds, actionRect, 'Restoration action glyph contained');
  assert(!result.texts.some(text => /(?:修复花费|修復花費|Restore for|Restaurar por|Restaurer pour|restaurieren|Реставрация за)/.test(text.text)),
    'Standalone restoration cost sentence is removed from detail body/button');
}

try {
  assert.equal(report.sourcesBefore['art-source/ui/formal-pages/collection-album-v1/inspiration.png'],
    '7f40c3bfb431d0221ee800eb0d0457d985bba943a1c9ed2eb36b68f9d30d161e', 'Existing palette source is unchanged');
  const discovery = await newPage({ width: 496, height: 1078 }, 'zh-CN', 0);
  report.languageWidths = await page.evaluate(() => window.__COLLECTION_TEST__.languageWidths);
  report.longestLanguage = report.languageWidths.find(entry => !entry.language.startsWith('zh')).language;
  report.selectedLanguages = report.languageWidths.map(entry => entry.language);
  assert.equal(report.selectedLanguages.length, 10, 'Every production language is covered'); await discovery.close();
  for (const viewport of [{ width: 496, height: 1078 }, { width: 320, height: 568 }]) {
    for (const language of report.selectedLanguages) {
      for (const balance of [0, 32, Number.MAX_SAFE_INTEGER]) {
        const label = `${viewport.width}x${viewport.height}-${language}-${balance}`;
        const context = await newPage(viewport, language, balance);
        assert(!(await page.evaluate(() => window.__COLLECTION_TEST__.host.imageRequests)).includes(palettePath), 'Palette remains collection-lazy before opening the album');
        await click('navigation.4'); await ready(); assert.equal((await debug()).collectionAlbum.tab, 'levels');
        const levelBefore = await probe(), levels = assertList(levelBefore, balance);
        assert(levelBefore.state.collectionAlbum.art.loadedAtlasIndexes.length < 10, 'Cold entry does not load the whole catalogue');
        await page.screenshot({ path: resolve(output, `${label}-levels.png`) });
        await click('collectionAlbumTab.masterpieces'); await ready();
        const before = await probe(), masterpieces = assertList(before, balance);
        if (!report.paletteDecode) {
          report.paletteDecode = await page.evaluate(async path => {
            const bitmap = await createImageBitmap(await (await fetch(path)).blob());
            const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
            const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let transparent = 0, opaque = 0, partial = 0;
            for (let i = 3; i < rgba.length; i += 4) { if (rgba[i] === 0) transparent++; else if (rgba[i] === 255) opaque++; else partial++; }
            const result = { width: bitmap.width, height: bitmap.height, transparent, opaque, partial }; bitmap.close(); return result;
          }, `/${palettePath}`);
          assert.equal(report.paletteDecode.width, 48); assert.equal(report.paletteDecode.height, 48);
          assert(report.paletteDecode.transparent > 0 && report.paletteDecode.opaque > 0, 'Runtime palette retains transparent background and visible paint');
        }
        assert.deepEqual(masterpieces.grid, levels.grid, 'Switching tabs does not move/shrink card grid');
        assert.deepEqual(masterpieces.cardSlots, levels.cardSlots);
        await page.screenshot({ path: resolve(output, `${label}-masterpieces.png`) });
        const scenario = { label, viewport, language, balance, levels, masterpieces, storageCalls: before.nativeStorageCalls, status: 'PASS' };
        if (balance === 32) {
          const item = before.state.collectionAlbum.visibleItems.find(item => item.blueprintUnlocked && !item.collected && item.cost > 0 && item.cost <= balance);
          assert(item?.blueprintUnlocked && !item.collected && item.cost > 0 && item.cost <= balance);
          await click(`collectionAlbumCard.${item.id}`); assertDetail(await probe(), item.id);
          await page.screenshot({ path: resolve(output, `${label}-detail-before.png`) });
          await click('collectionAlbumDetailPrimary');
          await page.waitForFunction(id => window.__COLLECTION_TEST__.game.getDebugState().collectionAlbum.restoredMasterpieceIds.includes(id), item.id);
          const restored = await probe(); assert.equal(restored.state.collectionAlbum.inspiration, balance - item.cost);
          assert.equal(restored.state.collectionAlbum.restoredMasterpieceCount, 1);
          assert.equal(restored.state.collectionAlbum.pendingRestorationId, undefined);
          assert.equal(restored.state.collectionAlbum.feedback, undefined, 'Successful restoration has no success caption');
          assert.equal(restored.memorySave.collectionProgress.inspiration, balance - item.cost, 'Normal transaction commits new balance into isolated host');
          assert.deepEqual(restored.memorySave.collectionProgress.restoredMasterpieceIds, [item.id]);
          await click('collectionAlbumDetailClose'); await ready();
          const after = await probe(), afterSummary = assertList(after, balance - item.cost, 1);
          assert.deepEqual(afterSummary.cardSlots, masterpieces.cardSlots);
          await page.screenshot({ path: resolve(output, `${label}-after-restoration.png`) });
          scenario.restoration = { id: item.id, cost: item.cost, balanceBefore: balance, balanceAfter: balance - item.cost,
            progressBefore: masterpieces.progress.text, progressAfter: afterSummary.progress.text, after: afterSummary,
            durableCollectionProgress: after.memorySave.collectionProgress };
        }
        await click('collectionAlbumTab.levels'); await ready();
        const back = await probe(), expectedBalance = balance === 32 ? scenario.restoration.balanceAfter : balance;
        scenario.returnedLevels = assertList(back, expectedBalance, balance === 32 ? 1 : 0);
        assert.deepEqual(scenario.returnedLevels.panels.map(panel => panel.args), levels.panels.map(panel => panel.args));
        assert.deepEqual(back.nativeStorageCalls, []);
        report.scenarios.push(scenario); await context.close();
        console.log(`PASS ${label}: current balance, progress, fixed nine-card grid, level-tab isolation${balance === 32 ? ', real restoration debit and refresh' : ''}`);
      }
    }
  }
  report.sourcesAfter = await hashes(); report.assetInventoryAfter = await assetInventory();
  report.paletteHttp = await Promise.all(paletteResponses);
  assert(report.paletteHttp.length >= report.scenarios.length, 'Reused icon loaded over HTTP in every isolated scenario');
  for (const response of report.paletteHttp) {
    assert.equal(response.status, 200); assert.equal(response.sha256, report.sourcesBefore[`public/${palettePath}`], 'HTTP palette equals the registered runtime WebP');
  }
  assert.deepEqual(report.sourcesAfter, report.sourcesBefore, 'Production, ledger, existing art, rules and test source stable');
  assert.deepEqual(report.assetInventoryAfter, report.assetInventoryBefore, 'No assets added or removed');
  assert.deepEqual(report.errors, []); report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; report.sourcesAfter = await hashes(); process.exitCode = 1;
  if (page && !page.isClosed()) {
    report.failureProbe = await probe().catch(() => undefined);
    await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  }
  console.error(error);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close(); console.log(JSON.stringify({ status: report.status, output }));
}
