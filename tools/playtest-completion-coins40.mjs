import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Settlement-only integration: injected completion metrics, NOT a solved route.
// Current formal Lv5 and production persistence/rendering, isolated MemoryHost.
const output = resolve('playtest-results/completion-coins40-20261008');
await mkdir(output, {recursive:true});
const sha = value => createHash('sha256').update(value).digest('hex');
const paths = ['src/core/completionRewards.ts','src/core/economyBalance.ts',
  'src/core/levels.ts','src/game/ColorEscapeGame.ts','tools/playtest-completion-coins40.mjs',
  'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.161.0.md'];
const hashes = async () => Object.fromEntries(await Promise.all(paths.map(async p => [p,sha(await readFile(p))])));
const report = {status:'RUNNING',scope:'Synthetic in-memory saves; actual formal Lv5 settlement/persistence/rendering. Completion metrics are injected; no real puzzle route or real player storage is claimed.',sources:await hashes(),cases:[],errors:[]};
function html(highestLevel) {
  const seed = {schemaVersion:1,currentLevel:5,highestLevel,coins:1000,language:'zh-CN',
    sound:false,music:false,haptic:false,reducedMotion:false,
    featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],
    boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],
    boosters:{time:2,rocket:2,pulse:2},bestStars:{},bestMoves:{},rewardedLevels:[1,2,3,4],
    featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
    collectionIntroPending:false,collectionIntroShown:true,
    lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}};
  return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {getLevelStrict} from '/src/core/levels.ts';
const key='color-escape-save-v1',initial=${JSON.stringify(seed)};
const audit={phase:'startup',writes:[],texts:[],injections:[]};
class MemoryHost extends WebHost {
  data=new Map([[key,structuredClone(initial)]]);
  storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
  storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
  storageSet(k,v){audit.writes.push({phase:audit.phase,value:structuredClone(v)});this.data.set(k,structuredClone(v));return true;}
  music(){}sound(){}vibrate(){}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),seen=new Set();
const fill=host.context.fillText;
host.context.fillText=function(value,...args){const text=String(value),id=audit.phase+'|'+text;if(!seen.has(id)){seen.add(id);audit.texts.push({phase:audit.phase,text,screen:game.screen,args});}return fill.call(this,value,...args);};
window.__COLOR_ESCAPE__=game;window.__COIN40__={game,host,audit,getLevelStrict};game.start();
</script>`;
}
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
async function snap(page,row,name) {
  const file=resolve(output,`${row.name}-${name}.png`);
  await page.screenshot({path:file});row.images.push({file,sha256:sha(await readFile(file))});
}
async function complete(page,phase) {
  return page.evaluate(phase => {
    const {game:g,audit,getLevelStrict}=window.__COIN40__;
    audit.phase=phase;g.loadLevel(5,true);
    if(JSON.stringify(g.model.level)!==JSON.stringify(getLevelStrict(5)))throw Error('Formal level mismatch');
    const before=structuredClone(g.save);
    g.completionMetrics={moves:1,elapsedSeconds:1};g.pendingCelebration=0;
    audit.injections.push({phase,level:5,metrics:structuredClone(g.completionMetrics),modelComplete:g.model.snapshot().complete});
    g.beginCelebration();g.dirty=true;g.scheduleFrame();
    return {before,screen:g.screen,reward:g.winCoinReward,flight:g.homeCoinFlight?structuredClone(g.homeCoinFlight):null,live:structuredClone(g.save),stored:structuredClone(window.__COIN40__.host.data.get('color-escape-save-v1'))};
  },phase);
}
function verify(result,reward) {
  assert.equal(result.before.coins,1000+(reward===0?40:0));
  assert.equal(result.live.coins,result.before.coins+reward);
  assert.equal(result.stored.coins,result.before.coins+reward);
  assert.equal(result.screen==='home' ? result.flight?.reward : result.reward,reward);
  assert.equal(result.stored.rewardedLevels.filter(n=>n===5).length,1);
  assert.deepEqual(result.stored.boosters,result.before.boosters);
}
try {
  for(const viewport of [{width:320,height:568},{width:496,height:1078}]) {
    const context=await browser.newContext({viewport,deviceScaleFactor:1});
    await context.addInitScript(()=>{
      window.__STORAGE_VIOLATIONS__=[];
      for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};
      for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};
    });
    const row={name:`${viewport.width}x${viewport.height}`,viewport,status:'RUNNING',images:[]};report.cases.push(row);
    const page=await context.newPage();
    page.on('pageerror',e=>report.errors.push(`${row.name}: ${e.message}`));
    page.on('console',e=>{if(e.type()==='error')report.errors.push(`${row.name}: ${e.text()}`);});
    await page.route('**/__coin40_fixture__*',route=>route.fulfill({contentType:'text/html',body:html(new URL(route.request().url()).searchParams.get('highest')==='5'?5:6)}));
    // Highest 6 with an explicit unclaimed Lv5 ledger exercises the standard win panel.
    await page.goto(`${origin}/__coin40_fixture__?highest=6`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.getDebugState().art.ready);
    row.first=await complete(page,'first-reward');verify(row.first,40);assert.equal(row.first.screen,'win');
    await page.waitForFunction(()=>window.__COIN40__.audit.texts.some(x=>x.phase==='first-reward'&&x.text==='+40'),null,{timeout:30000});
    await snap(page,row,'first-plus40');
    row.repeat=await complete(page,'repeat');verify(row.repeat,0);assert.equal(row.repeat.screen,'win');
    await page.waitForFunction(()=>window.__COIN40__.audit.texts.some(x=>x.phase==='repeat'&&x.text==='+0'),null,{timeout:10000});
    await snap(page,row,'repeat-plus0');
    row.panelAudit=await page.evaluate(()=>structuredClone(window.__COIN40__.audit));
    assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);
    // Actual first-ever Lv5 retains its existing return-home reward-flight branch.
    await page.goto(`${origin}/__coin40_fixture__?highest=5`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.getDebugState().art.ready);
    row.introFirst=await complete(page,'intro-first');verify(row.introFirst,40);
    assert.equal(row.introFirst.screen,'home');assert.equal(row.introFirst.flight.reward,40);
    assert.equal(row.introFirst.flight.startCoins,1000);assert.equal(row.introFirst.flight.endCoins,1040);
    await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.homeCoinFlight);
    await snap(page,row,'intro-home1040');
    row.introAudit=await page.evaluate(()=>structuredClone(window.__COIN40__.audit));
    row.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);
    row.status='PASS';await context.close();
  }
  assert.deepEqual(report.errors,[]);
  report.sourceAfter=await hashes();report.sourceChanges=paths.filter(p=>report.sources[p]!==report.sourceAfter[p]);
  assert.deepEqual(report.sourceChanges,[],'Bound production source remains stable');
  report.status='PASS';
} catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({name:r.name,status:r.status})),failure:report.failure,output},null,2));
