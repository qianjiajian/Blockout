import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const output = resolve(`playtest-results/collection-star-conditions-${Date.now()}`);
await mkdir(output, { recursive: true });
const fixture = `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
import {LEVEL_COLLECTION_CATALOG} from '/src/core/collectionCatalog.ts';import {levelStarTargets} from '/src/core/levelStarConditions.ts';import {LEVELS} from '/src/core/levels.ts';
const initial={schemaVersion:1,currentLevel:18,highestLevel:19,coins:1000,sound:false,music:false,haptic:false,language:'zh-CN',collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},rewardedLevels:Array.from({length:18},(_,i)=>i+1),bestStars:Object.fromEntries(Array.from({length:18},(_,i)=>[i+1,2]))};
class MemoryHost extends WebHost{data=new Map([['color-escape-save-v1',initial]]);storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}storageSet(k,v){this.data.set(k,structuredClone(v));return true}sound(){}music(){}vibrate(){}}
const g=new ColorEscapeGame(new MemoryHost());window.__COLOR_ESCAPE__=g;window.fixture={setup(mode){g.featureUnlockGuide=undefined;g.journeyPresentation=undefined;g.navigationTransition=undefined;g.collectionIntro=undefined;g.homeCoinFlight=undefined;const item=LEVEL_COLLECTION_CATALOG[9];const spec=LEVELS.find(l=>l.id===item.levelId),t=levelStarTargets(spec);g.save.bestStars[item.levelId]=mode==='three'?3:mode==='one'?1:2;g.save.bestStarConditions=mode==='legacy'?{}:{[item.levelId]:{stars:g.save.bestStars[item.levelId],moves:mode==='moveMissing'||mode==='one'?t.moveTarget+1:t.moveTarget,elapsedSeconds:mode==='timeMissing'||mode==='one'?t.timeTargetSeconds+1:t.timeTargetSeconds}};g.collectionAlbumDetailId=undefined;g.collectionAlbumPage.levels=1;g.screen='home';g.dirty=true;g.scheduleFrame();return item.id}};g.start();</script>`;
const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, entries: [] }, server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, plugins: [{ name: 'fixture', configureServer(s) { s.middlewares.use('/star-fixture', (_, res) => { res.setHeader('Content-Type', 'text/html'); res.end(fixture); }); } }] });
await server.listen();
const browser = await chromium.launch({ headless: true });
const report = { cases: [], errors: [] };
const state = p => p.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
async function click(p, key) {
  const s = await state(p), r = s.interactionTargets.targets[key]?.hit;
  assert(r, `Missing ${key}`);
  const b = await p.locator('canvas').boundingBox(), t = s.viewportTransform;
  await p.mouse.click(b.x + t.offsetX + (r.x + r.width / 2) * t.scale, b.y + t.offsetY + (r.y + r.height / 2) * t.scale);
}
try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 496, height: 1078 }]) {
    for (const mode of ['timeMissing', 'moveMissing', 'one', 'three', 'legacy']) {
      const context = await browser.newContext({ viewport }), p = await context.newPage();
      p.on('pageerror', e => report.errors.push(e.message));
      await p.addInitScript(() => { window.storageCalls = []; for (const k of ['getItem', 'setItem', 'removeItem']) Storage.prototype[k] = () => { window.storageCalls.push(k); throw Error('Storage forbidden'); }; });
      await p.goto(`http://127.0.0.1:${server.httpServer.address().port}/star-fixture`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await p.waitForFunction(() => window.__COLOR_ESCAPE__?.artReady, undefined, { timeout: 120000 });
      const id = await p.evaluate(mode => window.fixture.setup(mode), mode);
      await p.waitForTimeout(500);
      await click(p, 'navigation.4');
      await p.waitForFunction(() => { const s = window.__COLOR_ESCAPE__.getDebugState(); return s.screen === 'records' && s.collectionAlbum.art.ready && s.collectionAlbum.art.artworkReady && !window.__COLOR_ESCAPE__.navigationTransition; });
      await click(p, `collectionAlbumCard.${id}`);
      await p.waitForFunction(() => { const g = window.__COLOR_ESCAPE__; return g.collectionAlbumDetailId && !g.popupEntrance.active && g.popupEntrance.snapshot().some(s => s.key === 'collection.detail' && s.phase === 'idle') && g.getDebugState().collectionAlbum.art.artworkReady; });
      const image = resolve(output, `${viewport.width}-${mode}.png`);
      await p.screenshot({ path: image });
      assert.deepEqual(await p.evaluate(() => window.storageCalls), []);
      await click(p, mode === 'timeMissing' ? 'collectionAlbumDetailPrimary' : 'collectionAlbumDetailClose');
      await p.waitForFunction(() => !window.__COLOR_ESCAPE__.collectionAlbumDetailId);
      if (mode === 'timeMissing') {
        await p.waitForFunction(() => window.__COLOR_ESCAPE__.screen === 'playing');
        assert.equal(await p.evaluate(() => window.__COLOR_ESCAPE__.model.level.id), 10);
      }
      report.cases.push({ viewport, mode, image, status: 'PASS' });
      await context.close();
    }
  }
  assert.deepEqual(report.errors, []);
  report.status = 'PASS';
} catch (error) { report.status = 'FAIL'; report.error = error.stack; throw error; }
finally { await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); await server.close(); console.log(output); }
