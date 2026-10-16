import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const output = resolve(`playtest-results/life-refill-home-wallet-20261009-${Date.now()}`);
await mkdir(output, { recursive: true });
const fixture = language => `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';import { WebHost } from '/src/platform/WebHost.ts';
const initial={schemaVersion:1,currentLevel:6,highestLevel:6,coins:1000,sound:false,music:false,haptic:false,reducedMotion:true,
 language:${JSON.stringify(language)},collectionIntroShown:true,featureSeen:['basics'],lifeState:{lives:3,nextLifeAtMs:Date.now()+128000,unlimitedLivesUntilMs:0},
 boosters:{time:3,rocket:3,pulse:3},bestStars:{1:3},bestMoves:{},rewardedLevels:[1]};
class MemoryHost extends WebHost {data=structuredClone(initial);storageRead(){return {status:'ok',value:structuredClone(this.data)}}storageGet(k,f){return this.data??f}storageSet(k,v){this.data=structuredClone(v);return true}sound(){}music(){}vibrate(){}}
const host=new MemoryHost(),game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;game.start();</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},plugins:[{name:'refill-wallet-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{
 if(req.url?.startsWith('/refill-fixture')){res.setHeader('Content-Type','text/html');res.end(fixture(req.url.includes('en')?'en':'zh-CN'))}else next();
})}}],server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true });
const errors = [], reports = [];
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
async function click(page, name) {
  const s = await debug(page), r = s.interactionTargets.targets[name]?.hit;
  assert.ok(r, `Missing actual target ${name}`);
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + s.viewportTransform.offsetX + (r.x + r.width / 2) * s.viewportTransform.scale,
    box.y + s.viewportTransform.offsetY + (r.y + r.height / 2) * s.viewportTransform.scale);
  await page.waitForTimeout(80);
}
try {
  for (const width of [320, 496]) for (const language of ['zh-CN', 'en']) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 1078 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {Storage.prototype.getItem=()=>{throw Error('Persistent storage forbidden')};Storage.prototype.setItem=()=>{throw Error('Persistent storage forbidden')}});
    await page.goto(origin+'/refill-fixture?'+language, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__COLOR_ESCAPE__?.getDebugState().art.ready);
    assert.equal((await debug(page)).screen, 'home');
    await click(page, 'homeLife');
    await page.waitForFunction(() => Boolean(window.__COLOR_ESCAPE__.lifeRefillArt), undefined, { timeout: 5000 }).catch(async error => {
      await page.screenshot({ path: resolve(output, 'failed-opening.png') });
      const state = await debug(page);
      console.log(JSON.stringify({ errors, screen: state.screen, lives: state.lives,
        privateState: await page.evaluate(() => { const g = window.__COLOR_ESCAPE__; return {
          open: g.lifeRefillOpen, loading: g.lifeRefillArtLoading, error: g.lifeRefillArtError,
          featureGuide: g.featureUnlockGuide, journey: g.journeyPresentation, intro: g.collectionIntro,
        }; }) }, null, 2));
      throw error;
    });
    const before = await page.evaluate(() => JSON.stringify(window.__COLOR_ESCAPE__.save));
    await page.screenshot({ path: resolve(output, `refill-${width}-${language}.png`) });
    await click(page, 'homeSupply');
    assert.equal((await debug(page)).screen, 'home', 'Highlighted wallet cannot open shop through modal');
    assert.equal((await debug(page)).lives.refillOpen, true);
    await click(page, 'lifeRefillAd');
    const afterAd = await page.evaluate(() => JSON.stringify(window.__COLOR_ESCAPE__.save));
    assert.equal(afterAd, before, 'Unavailable ad must not award lives or write a save');
    await click(page, 'lifeRefillBuy');
    const purchase = await page.evaluate(() => ({ lives: window.__COLOR_ESCAPE__.save.lifeState.lives,
      coins: window.__COLOR_ESCAPE__.save.coins, open: window.__COLOR_ESCAPE__.lifeRefillOpen }));
    assert.equal(purchase.lives, 5);
    assert.equal(purchase.coins, 800);
    // Reopening full lives must not offer a purchase.
    if (!purchase.open) await click(page, 'homeLife');
    assert.ok(!(await debug(page)).interactionTargets.targets.lifeRefillBuy);
    await page.screenshot({ path: resolve(output, `full-${width}-${language}.png`) });
    await click(page, 'lifeRefillDismiss');
    assert.equal(await page.evaluate(() => window.__COLOR_ESCAPE__.lifeRefillOpen), false);
    reports.push({ width, language, purchase, unavailableAdSaveUnchanged: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ status: 'PASS', scope:'Isolated MemoryHost, no persistent player storage; real mouse Pointer', reports, errors }, null, 2));
  console.log('PASS: four real Pointer cases, wallet blocks clicks, real 200-coin refill, full-state purchase blocked and close. '+output);
} finally { await browser.close(); await server.close(); }
