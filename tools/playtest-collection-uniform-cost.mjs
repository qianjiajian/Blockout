import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const output = resolve(`playtest-results/collection-uniform-cost-20261009-${Date.now()}`);
await mkdir(output, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['src/core/collectionCatalog.ts', 'src/core/collectionProgress.ts', 'src/game/ColorEscapeGame.ts'];
const bindings = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await readFile(file))])));
const report = { status: 'RUNNING', started: new Date().toISOString(), sourceBindings: await bindings(), rows: [], errors: [],
  scope: 'Source Vite on a private random loopback port; synthetic MemoryHost; native persistent Storage methods forbidden. Real Pointer purchases, natural RAF flip and actual Canvas cost text. No real campaign completion or real player saves.' };
const key = 'color-escape-save-v1';
function fixture(inspiration, owned = false) {
  return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {MASTERPIECE_COLLECTION_CATALOG, COLLECTION_PAGE_SIZE} from '/src/core/collectionCatalog.ts';
const indexes=[0,20,39],audit={writes:[],pointer:[],costDraws:[],labels:[],samples:[],scales:[],captures:[]};
const initial={schemaVersion:1,currentLevel:200,highestLevel:200,coins:240,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],
 rewardedLevels:Array.from({length:200},(_,i)=>i+1),bestStars:{},collectionProgress:{version:1,inspiration:${inspiration},restoredMasterpieceIds:${owned ? 'indexes.map(i=>MASTERPIECE_COLLECTION_CATALOG[i].id)' : '[]'},seenItemIds:[],claimedMilestoneIds:[]}};
class MemoryHost extends WebHost {
 data=structuredClone(initial);
 storageRead(k){return k==='${key}'?{status:'ok',value:structuredClone(this.data)}:{status:'missing'}}
 storageGet(k,f){return k==='${key}'?structuredClone(this.data):f}
 storageSet(k,v){audit.writes.push({key:k,value:structuredClone(v),at:performance.now()});if(k==='${key}')this.data=structuredClone(v);return true}
 sound(){}music(){}vibrate(){}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
let inFlip=false;
const drawIntro=game.drawCollectionIntro;
game.drawCollectionIntro=function(...args){inFlip=true;try{
 const result=drawIntro.apply(this,args),intro=this.collectionIntro;
 if(intro?.restoration){audit.samples.push({age:intro.age,ready:this.collectionIntroReady(),screen:this.screen,itemId:intro.itemId,at:performance.now()});
  for(const [label,threshold] of [['card-back',.2],['turning',.6],['revealed',1.8]]){
   if(intro.age<threshold||audit.captures.some(c=>c.label===label))continue;
   audit.captures.push({label,threshold,age:intro.age,itemId:intro.itemId,at:performance.now(),dataUrl:host.canvas.toDataURL('image/png')});
  }
 }
 return result;
}finally{inFlip=false}};
const scale=host.context.scale;host.context.scale=function(x,y){if(inFlip)audit.scales.push({x,y,age:game.collectionIntro?.age});return scale.call(this,x,y)};
const fill=host.context.fillText;host.context.fillText=function(value,x,y,...args){
 const text=String(value);if(game.screen==='records'&&game.collectionAlbumDetailId){
  const cost=game.collectionAlbumLayout().detail.restorationCost;
  if(Math.abs(x-(cost.x+cost.width/2))<.01&&Math.abs(y-(cost.y+cost.height/2))<.01)audit.costDraws.push({text,x,y,alpha:this.globalAlpha,itemId:game.collectionAlbumDetailId});
  if(!audit.labels.includes(text))audit.labels.push(text);
 }
 return fill.call(this,value,x,y,...args);
};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointer.push({type,x:e.clientX,y:e.clientY,at:performance.now()}),true);
window.__COST_TEST__={host,audit,catalog:MASTERPIECE_COLLECTION_CATALOG,prepare(index){
 const item=MASTERPIECE_COLLECTION_CATALOG[index];
 game.screen='records';game.profilePage=undefined;game.collectionIntro=undefined;game.featureUnlockGuide=undefined;game.journeyPresentation=undefined;
 game.navigationTransition=undefined;game.navigationPendingTarget=undefined;game.homeCoinFlight=undefined;game.updateToastVisible=false;
 game.collectionAlbumTab='masterpieces';game.collectionAlbumPage.masterpieces=Math.floor(index/COLLECTION_PAGE_SIZE);game.collectionAlbumDetailId=item.id;
 game.collectionAlbumFeedback=undefined;game.setFormalPageIntent('records');game.requestCollectionAlbumArtwork();
 for(const k of ['costDraws','labels','samples','scales','captures'])audit[k]=[];
 game.dirty=true;game.scheduleFrame();return item;
}};game.start();</script>`;
}
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, entries: [] },
  server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
report.origin = origin;
const browser = await chromium.launch({ headless: true });
let activePage;
const state = p => p.evaluate(() => {
  const g = window.__COLOR_ESCAPE__, t = window.__COST_TEST__, d = g.getDebugState();
  return { intro: d.collectionIntro, screen: g.screen, detail: g.collectionAlbumDetailId, page: g.collectionAlbumPage.masterpieces,
    inspiration: g.save.collectionProgress.inspiration, restored: [...g.save.collectionProgress.restoredMasterpieceIds],
    stored: structuredClone(t.host.data.collectionProgress), writes: t.audit.writes.length,
    flags: [g.save.collectionIntroPending, g.save.collectionIntroShown],
    targets: Object.keys(d.interactionTargets.targets ?? d.interactionTargets), costs: t.audit.costDraws, labels: t.audit.labels };
});
async function point(p, key) {
  const d = await p.evaluate(() => window.__COLOR_ESCAPE__.getDebugState()), r = (d.interactionTargets.targets ?? d.interactionTargets)[key]?.hit;
  assert.ok(r, `Actual Pointer target ${key}`); const box = await p.locator('canvas').boundingBox(), t = d.viewportTransform;
  return { x: box.x + t.offsetX + (r.x + r.width / 2) * t.scale, y: box.y + t.offsetY + (r.y + r.height / 2) * t.scale };
}
const clickAt = (p, position) => p.mouse.click(position.x, position.y);
const click = async (p, key) => clickAt(p, await point(p, key));
async function prepare(p, index, expectAction = true) {
  const item = await p.evaluate(i => window.__COST_TEST__.prepare(i), index);
  assert.equal(item.inspirationCost, 50);
  await p.waitForFunction(() => { const g = window.__COLOR_ESCAPE__; return g.collectionAlbumArt && g.collectionAlbumArtworkReady(); });
  if (expectAction) await p.waitForFunction(() => window.__COST_TEST__.audit.costDraws.length > 0);
  else await p.waitForTimeout(80);
  return item;
}
async function open(viewport, inspiration, owned = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 }), p = await context.newPage(); activePage = p;
  p.on('pageerror', e => report.errors.push({ viewport, message: e.message }));
  await p.addInitScript(() => { window.__STORAGE_VIOLATIONS__ = []; for (const method of ['getItem', 'setItem', 'clear', 'removeItem']) Storage.prototype[method] = function () { window.__STORAGE_VIOLATIONS__.push(method); throw Error('Native persistent Storage forbidden'); }; });
  await p.route('**/__collection_cost_fixture__', route => route.fulfill({ contentType: 'text/html', body: fixture(inspiration, owned) }));
  await p.goto(origin + '/__collection_cost_fixture__'); await p.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady && window.__COLOR_ESCAPE__.storageBaselineReady, undefined, { timeout: 60000 });
  const catalog = await p.evaluate(() => window.__COST_TEST__.catalog.map(i => ({ id: i.id, cost: i.inspirationCost })));
  assert.equal(catalog.length, 40); assert.ok(catalog.every(i => i.cost === 50)); report.catalog ??= catalog;
  return { context, p };
}
async function screenshot(p, row, label) { const file = resolve(output, `${row.name}-${label}.png`); await p.screenshot({ path: file }); row.images.push(file); }
async function captures(p, row) {
  const images = await p.evaluate(() => window.__COST_TEST__.audit.captures), metadata = [];
  for (const capture of images) {
    const file = resolve(output, `${row.name}-${capture.label}.png`); await writeFile(file, Buffer.from(capture.dataUrl.split(',')[1], 'base64'));
    const { dataUrl, ...info } = capture; metadata.push({ ...info, file }); row.images.push(file);
  }
  assert.deepEqual(metadata.map(c => c.label), ['card-back', 'turning', 'revealed']); row.keyframes = metadata;
}
function cost50(s) { assert.ok(s.costs.length > 0, 'Actual Canvas cost location was drawn'); assert.ok(s.costs.every(c => c.text === '50'), 'Actual displayed cost is uniformly 50'); }
async function close(context, p) { assert.deepEqual(await p.evaluate(() => window.__STORAGE_VIOLATIONS__), []); await context.close(); }

try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 496, height: 1078 }]) {
    const success = await open(viewport, 150);
    for (const index of [0, 20, 39]) {
      const { p } = success, row = { name: `${viewport.width}-purchase-${index + 1}`, images: [] }; report.rows.push(row);
      const item = await prepare(p, index), before = await state(p); cost50(before); await screenshot(p, row, 'cost50');
      const target = await point(p, 'collectionAlbumDetailPrimary'); await clickAt(p, target);
      const used = await state(p); assert.equal(used.inspiration, before.inspiration - 50); assert.equal(used.stored.inspiration, used.inspiration);
      assert.equal(used.writes, before.writes + 1); assert.equal(used.restored.filter(id => id === item.id).length, 1);
      assert.ok(used.intro.active && used.intro.restoration); assert.equal(used.intro.itemId, item.id); assert.deepEqual(used.flags, before.flags);
      await clickAt(p, target); const repeated = await state(p); assert.equal(repeated.inspiration, used.inspiration); assert.equal(repeated.writes, used.writes);
      await p.waitForFunction(() => window.__COLOR_ESCAPE__.collectionIntroReady());
      const reveal = await state(p); assert.equal(reveal.intro.age, 1.8);
      const motion = await p.evaluate(() => ({ samples: window.__COST_TEST__.audit.samples, scales: window.__COST_TEST__.audit.scales }));
      assert.ok(motion.samples.some(s => s.age < .36)); assert.ok(motion.samples.some(s => s.age > .36 && s.age < .88));
      assert.ok(motion.scales.some(s => s.age > .36 && s.age < .88 && s.x < s.y * .6), 'Original card actually narrows while flipping');
      await captures(p, row); await click(p, 'collectionIntroPrimary'); const after = await state(p);
      assert.equal(after.inspiration, used.inspiration); assert.equal(after.writes, used.writes); assert.equal(after.detail, item.id); assert.equal(after.page, before.page);
      assert.ok(!after.targets.includes('collectionAlbumDetailPrimary')); await clickAt(p, target); const clickedOwned = await state(p);
      assert.equal(clickedOwned.inspiration, used.inspiration); assert.equal(clickedOwned.writes, used.writes); assert.ok(!clickedOwned.intro.active);
      await screenshot(p, row, 'collected'); row.itemId = item.id; row.before = before; row.used = used; row.after = clickedOwned; row.motion = motion; row.status = 'PASS';
    }
    assert.equal((await state(success.p)).inspiration, 0); await close(success.context, success.p);

    for (const amount of [49, 0]) {
      const { context, p } = await open(viewport, amount);
      const row = { name: `${viewport.width}-insufficient-${amount}`, images: [], items: [] }; report.rows.push(row);
      for (const index of [0, 20, 39]) {
        const item = await prepare(p, index), before = await state(p); cost50(before);
        await click(p, 'collectionAlbumDetailPrimary'); await p.waitForTimeout(60); const after = await state(p);
        assert.equal(after.inspiration, amount); assert.equal(after.stored.inspiration, amount); assert.equal(after.writes, before.writes);
        assert.deepEqual(after.restored, []); assert.ok(!after.intro.active); assert.ok(after.inspiration >= 0);
        row.items.push({ itemId: item.id, before, after });
        if (index === 0) await screenshot(p, row, 'blocked-cost50');
      }
      row.status = 'PASS'; await close(context, p);
    }

    const old = await open(viewport, 0, true), row = { name: `${viewport.width}-old-owned-no-recharge`, images: [], items: [] }; report.rows.push(row);
    for (const index of [0, 20, 39]) {
      const item = await prepare(old.p, index, false), before = await state(old.p);
      assert.equal(before.inspiration, 0); assert.equal(before.stored.inspiration, 0); assert.ok(before.restored.includes(item.id));
      assert.ok(!before.targets.includes('collectionAlbumDetailPrimary')); assert.equal(before.costs.length, 0);
      const r = await old.p.evaluate(() => window.__COLOR_ESCAPE__.collectionAlbumLayout().detail.primaryAction.visual);
      const d = await old.p.evaluate(() => window.__COLOR_ESCAPE__.getDebugState()), b = await old.p.locator('canvas').boundingBox(), t = d.viewportTransform;
      await old.p.mouse.click(b.x + t.offsetX + (r.x + r.width / 2) * t.scale, b.y + t.offsetY + (r.y + r.height / 2) * t.scale);
      const after = await state(old.p); assert.equal(after.inspiration, 0); assert.equal(after.writes, before.writes); assert.ok(!after.intro.active);
      assert.deepEqual(after.stored, before.stored); row.items.push({ itemId: item.id, before, after });
      if (index === 0) await screenshot(old.p, row, 'already-collected');
    }
    row.status = 'PASS'; await close(old.context, old.p);
  }
  assert.deepEqual(report.errors, []); report.status = 'PASS';
} catch (e) {
  report.status = 'FAIL'; report.failure = e.stack ?? String(e); process.exitCode = 1;
  if (activePage && !activePage.isClosed()) { report.lastState = await state(activePage).catch(() => null); await activePage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {}); }
} finally {
  report.finalSourceBindings = await bindings(); report.changedSources = files.filter(file => report.sourceBindings[file] !== report.finalSourceBindings[file]);
  report.sourceStable = report.changedSources.length === 0;
  if (!report.sourceStable) report.sourceWarning = 'Parallel workspace changes occurred; observations bind to the Vite modules loaded by each isolated page, not an assertion that a later whole Game file was tested.';
  await browser.close(); await server.close(); report.resourcesClosed = true;
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ status: report.status, rows: report.rows.length, errors: report.errors.length,
  sourceStable: report.sourceStable, changedSources: report.changedSources, resourcesClosed: report.resourcesClosed, failure: report.failure, output }, null, 2));
