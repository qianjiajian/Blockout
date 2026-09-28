import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/';
const output = resolve(root, `playtest-results/win-coin-size-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const sources = ['src/game/ColorEscapeGame.ts', 'src/game/winSettlementLayout.ts', 'src/game/formalPageLayout.ts',
  'public/assets/art/ui/formal-pages/overlays/win/coin-pile.png',
  'public/assets/art/ui/formal-pages/overlays/win/reward-pill.png', 'tools/playtest-win-coin-size.mjs'];
const hashes = async () => Object.fromEntries(await Promise.all(sources.map(async file => [file,
  createHash('sha256').update(await readFile(resolve(root, file))).digest('hex')])));
const before = await hashes(), report = { scope: 'Actual drawWin Canvas in an isolated memory-host presentation fixture; NOT a playthrough, settlement, reward or native-device test',
  output, sources: before, scenarios: [], errors: [] };
const fixtureUrl = new URL('__win_coin_size_fixture__', baseUrl).href;
const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { WebHost } from '/src/platform/WebHost.ts';
class MemoryHost extends WebHost {
  data = new Map();
  storageRead(k) { return this.data.has(k) ? {status:'ok',value:structuredClone(this.data.get(k))} : {status:'missing'}; }
  storageGet(k,f) { const r=this.storageRead(k); return r.status==='ok'?r.value:f; }
  storageSet(k,v) { this.data.set(k,structuredClone(v)); return true; }
  music() {} sound() {} vibrate() {}
}
const host = new MemoryHost();
host.data.set('color-escape-save-v1',{schemaVersion:1,currentLevel:1,highestLevel:1,coins:1000,sound:false,haptic:false,reducedMotion:true,language:'zh'});
const game = new ColorEscapeGame(host), frames = [];
const render=game.render.bind(game), draw=game.ctx.drawImage.bind(game.ctx), fill=game.ctx.fillText.bind(game.ctx), stroke=game.ctx.strokeText.bind(game.ctx);
let frame;
const transform=()=>Array.from(['a','b','c','d','e','f'],key=>game.ctx.getTransform()[key]);
game.render=(...args)=>{frame={images:[],texts:[]};try{return render(...args)}finally{if(game.screen==='win'){frames.push(frame);if(frames.length>10)frames.shift();}frame=undefined;}};
game.ctx.drawImage=(image,...args)=>{const src=image.currentSrc||image.src||'';if(frame&&src.includes('/overlays/win/'))frame.images.push({src,args,native:[image.naturalWidth||image.width,image.naturalHeight||image.height],transform:transform()});return draw(image,...args);};
for(const [method,original] of [['fillText',fill],['strokeText',stroke]])game.ctx[method]=(text,x,y,...args)=>{if(frame&&String(text)==='+123')frame.texts.push({method,text:String(text),x,y,font:game.ctx.font,lineWidth:game.ctx.lineWidth,transform:transform()});return original(text,x,y,...args);};
window.__WIN_COIN_TEST__={game,host,frames}; game.start();
</script>`;
await mkdir(output, { recursive: false });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 496, height: 1078 }, { width: 320, height: 568 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.addInitScript(() => {
      window.__NATIVE_STORAGE_CALLS__ = [];
      for (const name of ['getItem', 'setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[name];
        Storage.prototype[name] = function (...args) { window.__NATIVE_STORAGE_CALLS__.push(name); return original.apply(this, args); };
      }
    });
    await page.route(fixtureUrl, route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto(fixtureUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__WIN_COIN_TEST__?.game.getDebugState().art.ready);
    await page.evaluate(() => {
      const { game } = window.__WIN_COIN_TEST__;
      // Presentation only: never call completion/settlement or change the model.
      game.screen = 'win'; game.winCoinReward = 123; game.requestWinArt();
      game.dirty = true; game.scheduleFrame();
    });
    await page.waitForFunction(() => window.__WIN_COIN_TEST__.frames.some(frame =>
      frame.images.some(image => image.src.endsWith('/coin-pile.png')) && frame.texts.some(text => text.method === 'fillText')));
    const evidence = await page.evaluate(() => ({ frame: window.__WIN_COIN_TEST__.frames.at(-1),
      nativeStorageCalls: window.__NATIVE_STORAGE_CALLS__, screen: window.__WIN_COIN_TEST__.game.screen }));
    const pile = evidence.frame.images.find(image => image.src.endsWith('/coin-pile.png'));
    const pill = evidence.frame.images.find(image => image.src.endsWith('/reward-pill.png'));
    assert.deepEqual(pile.args, [178.8, 768.2, 174.4, 145.6]);
    assert.deepEqual(pile.native, [243, 203], 'Original PNG remains unchanged');
    assert.deepEqual([pile.args[0] + pile.args[2] / 2, pile.args[1] + pile.args[3] / 2], [266, 841]);
    assert.deepEqual(pill.args, [444, 806]); assert.deepEqual(pill.native, [178, 69]);
    assert.deepEqual(pile.transform, pill.transform, 'Only the icon rectangle shrinks, not its parent transform');
    for (const method of ['fillText', 'strokeText']) {
      const label = evidence.frame.texts.find(label => label.method === method);
      assert(label, `Reward ${method} must still be drawn`);
      assert.equal(label.text, '+123'); assert.equal(label.x, 533); assert.equal(label.y, 842.5);
      assert(label.font.includes('34px')); assert.deepEqual(label.transform, pill.transform);
      if (method === 'strokeText') assert.equal(label.lineWidth, 5);
    }
    assert.equal(evidence.screen, 'win'); assert.deepEqual(evidence.nativeStorageCalls, []);
    const screenshot = `win-coin-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: resolve(output, screenshot) });
    report.scenarios.push({ viewport, screenshot, evidence });
    await context.close();
    console.log(`PASS ${viewport.width}x${viewport.height}: icon 80%, centre and reward label unchanged`);
  }
  assert.deepEqual(await hashes(), before, 'Inputs changed during visual verification');
  assert.deepEqual(report.errors, []); report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1; console.error(error);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close(); console.log(JSON.stringify({ status: report.status, output }));
}
