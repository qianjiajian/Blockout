import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Actual production settlement/rendering; completion metrics are injected.
// This is NOT a puzzle route proof and never accesses persistent player storage.
const output=resolve(`playtest-results/mainline-rank-change-20261009-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=v=>createHash('sha256').update(v).digest('hex');
const paths=['src/core/metaLeaderboard.ts','src/core/featureUnlocks.ts','src/game/ColorEscapeGame.ts',
  'src/game/winSettlementLayout.ts','tools/playtest-mainline-rank-change.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha(await readFile(p))])));
const report={status:'RUNNING',scope:'Synthetic MemoryHost saves, formal levels, injected completion metrics; natural RAF, actual Pointer Continue, no real puzzle solution or persistent player storage.',sources:await hashes(),cases:[],errors:[]};
function html(level=7,reduced=false) {
  const cleared=level-1;
  const seed={schemaVersion:1,currentLevel:level,highestLevel:level,coins:1000,language:'zh-CN',
    sound:false,music:false,haptic:false,reducedMotion:reduced,
    playerProfile:{id:'7654321',name:'排名验证',avatar:13,frame:4,joinedAt:Date.now(),firstTryWins:0,longestStreak:0,currentStreak:0,attempts:{},lastAttemptWon:false},
    featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],
    boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:2,rocket:2,pulse:2},
    bestStars:Object.fromEntries(Array.from({length:cleared},(_,i)=>[String(i+1),3])),bestMoves:{},rewardedLevels:Array.from({length:cleared},(_,i)=>i+1),
    featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
    collectionIntroPending:false,collectionIntroShown:true,lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}};
  return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {getLevelStrict} from '/src/core/levels.ts';
const key='color-escape-save-v1',initial=${JSON.stringify(seed)},audit={phase:'startup',writes:[],texts:[],frames:[],injections:[]};
class MemoryHost extends WebHost {
  data=new Map([[key,structuredClone(initial)]]); hidden=[];shown=[];
  storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
  storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
  storageSet(k,v){audit.writes.push({phase:audit.phase,value:structuredClone(v)});this.data.set(k,structuredClone(v));return true;}
  onHide(f){super.onHide(f);this.hidden.push(f);} onShow(f){super.onShow(f);this.shown.push(f);}
  music(){}sound(){}vibrate(){}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),seen=new Set();
const fill=host.context.fillText;
host.context.fillText=function(value,...args){const text=String(value),id=audit.phase+'|'+text;if(!seen.has(id)){seen.add(id);audit.texts.push({phase:audit.phase,text,screen:game.screen,args});}return fill.call(this,value,...args);};
const update=game.updateMainlineRankChange.bind(game);game.updateMainlineRankChange=function(delta){update(delta);if(game.mainlineRankChange)audit.frames.push({at:performance.now(),...game.mainlineRankChange,screen:game.screen,visible:game.appVisible});};
window.__COLOR_ESCAPE__=game;window.__RANK__={game,host,audit,getLevelStrict};game.start();
</script>`;
}
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
async function ready(page,level=7,reduced=false){
  await page.goto(`${origin}/__rank_fixture__?level=${level}&reduced=${Number(reduced)}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.getDebugState().art.ready);
}
async function complete(page,level=7,phase='clear'){
  return page.evaluate(({level,phase})=>{
    const {game:g,host,audit,getLevelStrict}=window.__RANK__;audit.phase=phase;g.loadLevel(level,true);
    if(JSON.stringify(g.model.level)!==JSON.stringify(getLevelStrict(level)))throw Error('Formal level mismatch');
    const before=structuredClone(g.save);g.completionMetrics={moves:1,elapsedSeconds:1};g.pendingCelebration=0;
    audit.injections.push({phase,level,metrics:structuredClone(g.completionMetrics),modelComplete:g.model.snapshot().complete});
    g.beginCelebration();g.dirty=true;g.scheduleFrame();
    return {before,screen:g.screen,rank:g.mainlineRankChange?{...g.mainlineRankChange}:null,after:structuredClone(g.save),stored:structuredClone(host.data.get('color-escape-save-v1'))};
  },{level,phase});
}
async function snapAt(page,row,age,name){
  await page.waitForFunction(age=>window.__COLOR_ESCAPE__.mainlineRankChange?.age>=age,age,{polling:'raf',timeout:15000});
  const before=await page.evaluate(()=>({...window.__COLOR_ESCAPE__.mainlineRankChange}));
  const file=resolve(output,`${row.name}-${name}.png`);await page.screenshot({path:file});
  row.images.push({file,sha256:sha(await readFile(file)),before,after:await page.evaluate(()=>window.__COLOR_ESCAPE__.mainlineRankChange?{...window.__COLOR_ESCAPE__.mainlineRankChange}:null)});
}
async function audit(page){
  const result=await page.evaluate(()=>({audit:structuredClone(window.__RANK__.audit),storage:window.__STORAGE_VIOLATIONS__}));
  assert.deepEqual(result.storage,[]);return result;
}
try{
  for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
    const context=await browser.newContext({viewport,deviceScaleFactor:1});
    await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
    const row={name:`${viewport.width}x${viewport.height}`,status:'RUNNING',images:[]};report.cases.push(row);
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${row.name}: ${e.message}`));
    page.on('console',e=>{if(e.type()==='error')report.errors.push(`${row.name}: ${e.text()}`);});
    await page.route('**/__rank_fixture__*',route=>{const p=new URL(route.request().url()).searchParams;return route.fulfill({contentType:'text/html',body:html(Number(p.get('level')||7),p.get('reduced')==='1')});});
    await ready(page);row.clear=await complete(page);
    assert.equal(row.clear.screen,'win');assert(row.clear.rank.beforeRank>row.clear.rank.afterRank);
    assert.equal(row.clear.after.coins,1040);assert.equal(row.clear.stored.coins,1040);assert.equal(row.clear.after.bestStars['7'],3);
    for(const [age,name] of [[.25,'entry'],[.7,'rolling'],[1.5,'hold'],[2.15,'exit']])await snapAt(page,row,age,name);
    await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.mainlineRankChange,null,{polling:'raf'});
    row.natural=await audit(page);assert(row.natural.audit.texts.some(t=>t.text==='排名提升'));
    // Repeating the same three-star result cannot create another rank climb.
    row.repeat=await complete(page,7,'repeat');assert.equal(row.repeat.rank,null);assert.equal(row.repeat.after.coins,1040);
    await ready(page);row.skip=await complete(page,7,'skip');
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.mainlineRankChange?.age>.45,null,{polling:'raf'});
    const click=await page.evaluate(()=>{const d=window.__COLOR_ESCAPE__.getDebugState();const b=d.interactionTargets.targets.modalPrimary;if(!b)throw Error('Continue hit target missing');return {rect:b.hit,transform:d.viewportTransform,rank:{...window.__COLOR_ESCAPE__.mainlineRankChange}};});
    row.pointer=click;await page.mouse.click(click.transform.offsetX+(click.rect.x+click.rect.width/2)*click.transform.scale,click.transform.offsetY+(click.rect.y+click.rect.height/2)*click.transform.scale);
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen!=='win');
    row.afterContinue=await page.evaluate(()=>({screen:window.__COLOR_ESCAPE__.screen,level:window.__COLOR_ESCAPE__.model.level.id,rank:window.__COLOR_ESCAPE__.mainlineRankChange??null}));
    assert.equal(row.afterContinue.rank,null);assert.equal(row.afterContinue.level,8);row.skipAudit=await audit(page);
    await ready(page);await complete(page,7,'background');
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.mainlineRankChange?.age>.6,null,{polling:'raf'});
    const hiddenAge=await page.evaluate(()=>{const x=window.__RANK__;x.host.hidden.forEach(f=>f());return x.game.mainlineRankChange.age;});
    await page.waitForTimeout(650);
    const stillAge=await page.evaluate(()=>window.__COLOR_ESCAPE__.mainlineRankChange.age);assert.equal(stillAge,hiddenAge);
    await page.evaluate(()=>window.__RANK__.host.shown.forEach(f=>f()));
    await page.waitForFunction(age=>window.__COLOR_ESCAPE__.mainlineRankChange?.age>age+.15,hiddenAge,{polling:'raf'});
    row.background={hiddenAge,stillAge,resumedAge:await page.evaluate(()=>window.__COLOR_ESCAPE__.mainlineRankChange.age)};row.backgroundAudit=await audit(page);
    for(const level of [5,6]){await ready(page,level);const result=await complete(page,level,`locked-${level}`);assert.equal(result.rank,null);row[`level${level}`]=result;await audit(page);}
    await ready(page,7,true);row.reduced=await complete(page);await snapAt(page,row,.7,'reduced');row.reducedAudit=await audit(page);
    row.status='PASS';await context.close();
  }
  assert.deepEqual(report.errors,[]);report.sourceAfter=await hashes();report.sourceChanges=paths.filter(p=>report.sources[p]!==report.sourceAfter[p]);assert.deepEqual(report.sourceChanges,[],'Bound source changed during playtest');report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({name:r.name,status:r.status})),failure:report.failure,output},null,2));
