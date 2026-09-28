import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Production Canvas + actual Pointer, with an isolated in-memory account.
// Never import web.ts or seed the user's real browser storage.
const root = fileURLToPath(new URL('../', import.meta.url));
const baseUrl = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:5173/';
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseUrl).hostname));
const fixtureUrl = new URL('__life_refill_panel_fixture__', baseUrl).href;
const LIFE_INTERVAL_MS = 30 * 60 * 1000;
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/life-refill-panel-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const ruleManifest = JSON.parse(await readFile(resolve(root, 'docs/rules/manifest.json'), 'utf8'));
const activeRules = ruleManifest.versions.find(version => version.version === ruleManifest.activeVersion);
assert(activeRules, 'Current frozen rule document exists');
const sourceFiles = ['src/game/ColorEscapeGame.ts', 'src/game/formalPageLayout.ts', 'src/game/artManifest.ts',
  'src/game/localization.ts', 'src/core/lives.ts', 'src/core/levels.ts', 'src/core/economyBalance.ts', 'docs/rules/manifest.json',
  activeRules.document, 'tools/playtest-life-refill-panel.mjs',
  ...['panel','close','home-button','replay-button'].map(n=>`public/assets/art/ui/formal-pages/overlays/pause-settings/${n}.png`),
  'public/assets/art/ui/formal-pages/overlays/win/coin-pile.png', 'public/assets/art/ui/formal-pages/overlays/win/reward-pill.png'];
const hashes = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path,
  createHash('sha256').update(await readFile(resolve(root, path))).digest('hex')])));
const report = { scope: 'Refill presentation and 100 coins per missing life with immutable transaction retry; MemoryHost accounts, actual Pointer and Canvas. Account clock controlled solely for recovery boundaries. No user storage, native phone or full campaign claim.',
  output, activeRuleVersion: activeRules.version, sourcesBefore: await hashes(), scenarios: [], errors: [] };
await mkdir(output, { recursive: false });
const html = language => `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { WebHost } from '/src/platform/WebHost.ts';
import { LIFE_REFILL_LAYOUT } from '/src/game/formalPageLayout.ts';
import { GAME_ART } from '/src/game/artManifest.ts';
class MemoryHost extends WebHost {
  data=new Map(); mode='normal'; commits=[]; imageRequests=[]; imageReleases=[];
  storageRead(k){if(this.mode==='unknown'&&this.written)return{status:'failed'};return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
  storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
  storageSet(k,v){this.data.set(k,structuredClone(v));this.commits.push(structuredClone(v));if(this.mode==='unknown'){this.written=true;return false;}return true;}
  music(){} sound(){} vibrate(){}
  createImage(path){this.imageRequests.push(path);return super.createImage(path);}
  releaseImage(image){this.imageReleases.push(image.src);return super.releaseImage(image);}
}
const host=new MemoryHost();host.data.set('color-escape-save-v1',{schemaVersion:1,currentLevel:36,highestLevel:36,coins:1000,
language:${JSON.stringify(language)},sound:false,haptic:false,reducedMotion:true,featureSeen:['basics','ice-door','ice-block','layer','shutter','generator'],
boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},bestStars:{'1':3},bestMoves:{},rewardedLevels:[1],
journeyProgress:{claimedMilestoneLevels:[],seenEpisodeUnlockLevels:[11,21,31]},lifeState:{lives:1,nextLifeAtMs:Date.now()+1800000,unlimitedLivesUntilMs:0}});
const game=new ColorEscapeGame(host);window.__REFILL_TEST__={game,host,layout:LIFE_REFILL_LAYOUT,art:GAME_ART};game.start();
</script>`;
const browser = await chromium.launch({ headless: true });
let page, context;
const debug = () => page.evaluate(() => window.__REFILL_TEST__.game.getDebugState());
async function clickRect(rect, state = undefined) {
  const d = state ?? await debug(), box = await page.locator('canvas').boundingBox(); assert(box);
  await page.mouse.click(box.x + d.viewportTransform.offsetX + (rect.x + rect.width / 2) * d.viewportTransform.scale,
    box.y + d.viewportTransform.offsetY + (rect.y + rect.height / 2) * d.viewportTransform.scale);
  await page.waitForTimeout(35);
}
async function click(key) { const d = await debug(), rect = d.interactionTargets.targets[key]?.hit; assert(rect, `${key} hit target exists`); await clickRect(rect, d); }
async function open() {
  await click('homeLife'); assert.equal((await debug()).lives.refillOpen, true);
  await page.waitForFunction(()=>Boolean(window.__REFILL_TEST__.game.lifeRefillArt),undefined,{timeout:30000});
}
async function account(lives, coins) {
  await page.evaluate(({ lives, coins }) => {
    const {game,host}=window.__REFILL_TEST__;host.mode='normal';host.written=false;
    game.save.lifeState={lives,nextLifeAtMs:lives<5?Date.now()+1800000:0,unlimitedLivesUntilMs:0};game.save.coins=coins;
    if(!game.persist())throw Error('Memory account setup failed');game.lifeRefillFeedback=undefined;game.dirty=true;game.render();
  }, { lives, coins });
}
async function advanceAccountClock(milliseconds) {
  await page.evaluate(milliseconds=>{
    window.__REFILL_NOW__+=milliseconds;
    const game=window.__REFILL_TEST__.game;game.refreshLifeState(Date.now());game.dirty=true;game.render();
  },milliseconds);
}
async function probe(label) {
  return page.evaluate(label => {
    const t=window.__REFILL_TEST__,{game}=t,ctx=game.ctx,draw=ctx.drawImage,fill=ctx.fillText,render=game.drawLifeRefill;
    const images=[],texts=[];let active=false;
    game.drawLifeRefill=function(){active=true;try{return render.call(this);}finally{active=false;}};
    ctx.drawImage=function(image,...args){if(active){const m=this.getTransform();images.push({src:image.currentSrc||image.src||'',args,native:[image.naturalWidth||image.width,image.naturalHeight||image.height],matrix:[m.a,m.b,m.c,m.d,m.e,m.f]});}return draw.call(this,image,...args);};
    ctx.fillText=function(text,x,y,maxWidth){if(active){const metrics=this.measureText(text),compress=maxWidth==null?1:Math.min(1,maxWidth/metrics.width);texts.push({text:String(text),x,y,maxWidth:maxWidth??null,font:this.font,bounds:{x:x-metrics.actualBoundingBoxLeft*compress,y:y-metrics.actualBoundingBoxAscent,width:(metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight)*compress,height:metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent}});}return maxWidth==null?fill.call(this,text,x,y):fill.call(this,text,x,y,maxWidth);};
    try{game.render();}finally{ctx.drawImage=draw;ctx.fillText=fill;game.drawLifeRefill=render;}
    return{label,images,texts,layout:t.layout,state:game.getDebugState(),expected:{refill:game.tr('gameplay.life.refill'),cancel:game.tr('common.cancel'),full:game.tr('common.full')},imageRequests:t.host.imageRequests,imageReleases:t.host.imageReleases,memorySave:structuredClone(t.host.data.get('color-escape-save-v1')),nativeStorageCalls:window.__STORAGE_CALLS__};
  }, label);
}
function contained(inner, outer, label, tolerance=1) {
  assert(inner.x>=outer.x-tolerance&&inner.y>=outer.y-tolerance&&inner.x+inner.width<=outer.x+outer.width+tolerance&&inner.y+inner.height<=outer.y+outer.height+tolerance,`${label}: ${JSON.stringify(inner)} outside ${JSON.stringify(outer)}`);
}
function validate(p, {pending=false,cost=Math.max(0,5-p.state.lives.lives)*100}={}) {
  const full=!pending&&p.state.lives.lives>=5;
  assert.equal(p.state.lives.refillOpen,true);assert.deepEqual(p.nativeStorageCalls,[]);
  assert(p.images.some(i=>i.src.endsWith('/overlays/pause-settings/panel.png')),'Supplied light common panel drawn');
  assert(!p.images.some(i=>i.src.endsWith('/chrome/universal-panel-v2.png')),'Legacy blue modal not drawn');
  assert.equal(p.images.filter(i=>i.src.endsWith('/overlays/pause-settings/home-button.png')).length,full?0:1,'Green refill only appears below cap or for unresolved transaction retry');
  assert(!p.images.some(i=>i.src.endsWith('/overlays/pause-settings/replay-button.png')),'Removed yellow Cancel never draws');
  assert(p.images.some(i=>i.src.endsWith('/overlays/win/coin-pile.png')),'Existing reward coin pile is reused');
  assert(p.images.some(i=>i.src.endsWith('/overlays/win/reward-pill.png')),'Existing blue reward pill is reused');
  const expense=p.texts.find(t=>t.text===(cost===0?'0':`-${cost}`));
  assert(expense,`Refill expense reflects actual quote ${cost}`);
  assert(!p.texts.some(t=>/^\+\d/.test(t.text)),'No positive reward amount in a purchase dialog');
  assert.equal(p.images.filter(i=>i.src.endsWith('/overlays/pause-settings/close.png')).length,pending?0:1,'Top-right close is suppressed during unknown purchase');
  assert(p.texts.some(t=>t.text===p.expected.refill),'Localized refill label');
  for(const text of p.texts)contained(text.bounds,p.layout.panel,`${text.text} stays within supplied panel`);
  contained(expense.bounds,p.layout.costPill,'Expense ink stays in blue price pill');
  for(const text of p.texts.filter(t=>t.y===p.layout.action.y)) {
    contained(text.bounds,p.layout.buyButton,`${text.text} actual glyph ink stays in the centered action slot`);
  }
  assert.equal(p.layout.buyButton.x+p.layout.buyButton.width/2,360,'Refill action is horizontally centered');
  assert(!p.texts.some(t=>t.text===p.expected.cancel),'No Cancel label');
  const fullLabels=p.texts.filter(t=>t.text===p.expected.full);
  assert.equal(fullLabels.length,full?1:0,'Only one full label, never a duplicate above the action');
  if(full)assert.equal(fullLabels[0].y,p.layout.action.y,'Full label occupies former button position');
  const pile=p.images.find(i=>i.src.endsWith('/overlays/win/coin-pile.png'));
  assert.equal(pile.args.length,4,'Full original coin pile drawn');
  assert(Math.abs(pile.args[2]/pile.native[0]-pile.args[3]/pile.native[1])<1e-6,'Coin pile keeps original aspect');
  assert.deepEqual([...new Set(p.imageRequests.filter(path=>path.includes('/overlays/win/')))].sort(),[
    'assets/art/ui/formal-pages/overlays/win/coin-pile.png','assets/art/ui/formal-pages/overlays/win/reward-pill.png'].sort(),'Only the two required win assets load, no victory panel/glow');
  const targets=p.state.interactionTargets.targets;
  assert.equal(Boolean(targets.lifeRefillBuy),!full,'No invisible clickable Buy at full life; unknown retry stays available');
  assert.equal(Boolean(targets.lifeRefillClose),false,'Cancel target removed');assert.equal(Boolean(targets.lifeRefillDismiss),!pending);
}
try {
  for(const viewport of [{width:496,height:1078},{width:320,height:568}])for(const language of ['zh-CN','zh-TW','en','ja','ko','es','pt','fr','de','ru']) {
    const name=`${viewport.width}x${viewport.height}-${language}`;context=await browser.newContext({viewport,deviceScaleFactor:1});
    await context.addInitScript(()=>{
      window.__STORAGE_CALLS__=[];for(const key of ['getItem','setItem','removeItem','clear']){const native=Storage.prototype[key];Storage.prototype[key]=function(...args){window.__STORAGE_CALLS__.push(key);return native.apply(this,args);};}
      window.__REFILL_NOW__=Date.parse('2026-09-24T10:00:00.000Z');const NativeDate=Date;
      const ControlledDate=new Proxy(NativeDate,{apply(target){return new target(window.__REFILL_NOW__).toString();},construct(target,args){return Reflect.construct(target,args.length?args:[window.__REFILL_NOW__],target);}});
      Object.defineProperty(ControlledDate,'now',{value:()=>window.__REFILL_NOW__});window.Date=ControlledDate;
    });
    page=await context.newPage();page.on('pageerror',e=>report.errors.push({name,error:e.message}));page.on('console',m=>{if(m.type()==='error')report.errors.push({name,error:m.text()});});
    await page.route(fixtureUrl,r=>r.fulfill({contentType:'text/html',body:html(language)}));await page.goto(fixtureUrl,{waitUntil:'commit'});
    await page.waitForFunction(()=>{const g=window.__REFILL_TEST__?.game;return g?.artReady&&g.storageBaselineReady&&g.art.pauseSettings;},undefined,{timeout:60000});
    await page.evaluate(()=>{const g=window.__REFILL_TEST__.game;g.updateToastVisible=false;g.boosterUnlockToast=undefined;g.dirty=true;g.render();});
    assert.equal(await page.evaluate(()=>window.__REFILL_TEST__.game.lifeRefillArt),undefined,'Coin assets absent before opening');
    await open();const initial=await probe('initial');validate(initial);const states=[initial];
    await page.screenshot({path:resolve(output,`${name}-initial.png`)});
    // This point is inside the old yellow Cancel but outside the new centered
    // action. Mapping uses production artboard geometry, never direct handlers.
    const buttonVisual=initial.state.interactionTargets.targets.lifeRefillBuy.visual;
    const artScale=buttonVisual.width/initial.layout.buyButton.width;
    const artOffset={x:buttonVisual.x-initial.layout.buyButton.x*artScale,y:buttonVisual.y-initial.layout.buyButton.y*artScale};
    const oldCancel={x:artOffset.x+130*artScale,y:artOffset.y+1035*artScale,width:10*artScale,height:10*artScale};
    await clickRect(oldCancel);assert.equal((await debug()).lives.refillOpen,true);assert.equal((await debug()).economy.coins,1000);
    await click('lifeRefillDismiss');assert.equal((await debug()).lives.refillOpen,false);assert.equal((await debug()).lives.lives,1);
    assert.equal(await page.evaluate(()=>window.__REFILL_TEST__.game.lifeRefillArt),undefined,'Red X releases transient coin assets');
    await open();const buyRect=(await debug()).interactionTargets.targets.lifeRefillBuy.hit;
    for(const [lives,cost] of [[0,500],[1,400],[2,300],[3,200],[4,100],[5,0],[9,0]]){
      await account(lives,1000);const quoted=await probe(`quote-${lives}`);validate(quoted,{cost});states.push(quoted);
      if(lives===5)await page.screenshot({path:resolve(output,`${name}-full.png`)});
      if(lives>=5){await clickRect(buyRect);assert.equal((await debug()).lives.lives,lives);assert.equal((await debug()).economy.coins,1000);}
      else{await click('lifeRefillBuy');const bought=await probe(`bought-${lives}`);validate(bought);assert.equal(bought.state.lives.lives,5);assert.equal(bought.state.economy.coins,1000-cost);assert.equal(bought.memorySave.coins,1000-cost);states.push(bought);}
    }
    await page.screenshot({path:resolve(output,`${name}-overcap.png`)});
    await account(4,99);await click('lifeRefillBuy');const insufficient=await probe('insufficient');validate(insufficient);assert.equal(insufficient.state.lives.lives,4);assert.equal(insufficient.state.economy.coins,99);assert.equal(insufficient.memorySave.coins,99);states.push(insufficient);
    await account(0,1000);await advanceAccountClock(LIFE_INTERVAL_MS-1);const beforeRecovery=await probe('recovery-before');validate(beforeRecovery,{cost:500});states.push(beforeRecovery);
    await advanceAccountClock(1);const afterRecovery=await probe('recovery-after');validate(afterRecovery,{cost:400});assert.equal(afterRecovery.state.lives.lives,1);states.push(afterRecovery);
    await click('lifeRefillBuy');const boughtAfterRecovery=await probe('buy-after-recovery');validate(boughtAfterRecovery);assert.equal(boughtAfterRecovery.state.lives.lives,5);assert.equal(boughtAfterRecovery.state.economy.coins,600);assert.equal(boughtAfterRecovery.memorySave.coins,600);states.push(boughtAfterRecovery);
    await account(4,1000);await advanceAccountClock(LIFE_INTERVAL_MS);const recoveredFull=await probe('recovery-full');validate(recoveredFull,{cost:0});assert.equal(recoveredFull.state.lives.lives,5);states.push(recoveredFull);
    await account(0,1000);const beforeUnknown=await debug();await page.evaluate(()=>{window.__REFILL_TEST__.host.mode='unknown';});await click('lifeRefillBuy');
    const unknown=await probe('unknown');validate(unknown,{pending:true,cost:500});assert.equal(unknown.state.lives.refillPersistence,'unknown');assert.equal(unknown.state.economy.coins,1000);assert.equal(unknown.state.lives.lives,0);assert.equal(unknown.memorySave.coins,500);states.push(unknown);
    await advanceAccountClock(LIFE_INTERVAL_MS*5);const unknownAfterRecovery=await probe('unknown-crosses-full-recovery');validate(unknownAfterRecovery,{pending:true,cost:500});assert.equal(unknownAfterRecovery.state.economy.coins,1000);assert.equal(unknownAfterRecovery.memorySave.coins,500);assert(unknownAfterRecovery.texts.some(t=>t.text==='0 / 5'),'Unknown transaction continues showing original quote state');states.push(unknownAfterRecovery);
    await clickRect(beforeUnknown.interactionTargets.targets.lifeRefillDismiss.hit);assert.equal((await debug()).lives.refillOpen,true);assert.equal((await debug()).lives.refillPersistence,'unknown');
    await page.screenshot({path:resolve(output,`${name}-pending.png`)});await page.evaluate(()=>{window.__REFILL_TEST__.host.mode='normal';});await click('lifeRefillBuy');
    const resolved=await probe('resolved');validate(resolved);assert.equal(resolved.state.lives.refillPersistence,'idle');assert.equal(resolved.state.economy.coins,500);assert.equal(resolved.state.lives.lives,5);assert.equal(resolved.memorySave.coins,500);states.push(resolved);
    await click('lifeRefillDismiss');assert.equal((await debug()).lives.refillOpen,false);
    assert.equal(await page.evaluate(()=>window.__REFILL_TEST__.game.lifeRefillArt),undefined,'Resolved close releases transient coin assets');
    assert.deepEqual(await page.evaluate(()=>window.__STORAGE_CALLS__),[]);
    const evidence={name,status:'PASS',viewport,language,states};
    await writeFile(resolve(output,`${name}.json`),JSON.stringify(evidence,null,2));report.scenarios.push({name,status:'PASS',states:evidence.states.length});
    console.log(`PASS ${name}`);await context.close();context=undefined;
  }
  assert.deepEqual(report.errors,[]);report.sourcesAfter=await hashes();assert.deepEqual(report.sourcesAfter,report.sourcesBefore,'Bound source remained stable');report.status='PASS';
} catch(error) { report.status='FAIL';report.failure=error.stack??String(error);if(page&&!page.isClosed())await page.screenshot({path:resolve(output,'failure.png')}).catch(()=>{});process.exitCode=1;
} finally { if(context)await context.close();await browser.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,scenarios:report.scenarios.length,output,failure:report.failure},null,2)); }
