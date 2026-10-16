import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Isolated source runtime: one genuine opening Pulse and the complete legal
// Pointer route. No target-counter fixtures, rockets, save imports or fake clock.
const output=resolve(process.env.EARLY_PULSE_OUTPUT??`playtest-results/early-pulse-rescue-20261010/run-${Date.now()}`);
await mkdir(output,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const clean=x=>JSON.parse(JSON.stringify(x));
const paths=['src/core/PuzzleModel.ts','src/core/types.ts','src/core/levels.ts','src/game/ColorEscapeGame.ts','tools/playtest-early-pulse-rescue.mjs'];
const bindings=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,hash(await readFile(p))])));
const compiled=await build({stdin:{contents:"export {getLevelStrict} from './src/core/levels.ts';export {PuzzleModel} from './src/core/PuzzleModel.ts';export {solveLevelForValidation} from './src/core/levelSolver.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const level=api.getLevelStrict(10),targetId=level.pulseRescue.targetBlockId;
const postPulse=clean(level);delete postPulse.pulseRescue;
for(const obj of [...postPulse.blocks,...postPulse.gates])if(obj.frozen){obj.frozen=Math.max(0,obj.frozen-2);if(!obj.frozen)delete obj.frozen;}
const solution=api.solveLevelForValidation(postPulse,10000);
assert(solution.solved,'Bounded route finder solves the actual post-Pulse state');
const expectedModel=new api.PuzzleModel(level);
expectedModel.beginAction();assert(expectedModel.thawAll(2));assert(expectedModel.commitAction(false));
const expected=[];
for(const drag of solution.drags){
 expectedModel.beginAction();
 for(const [x,y]of drag.path){let b=expectedModel.getBlock(drag.blockId);while(b.x!==x||b.y!==y){assert(expectedModel.moveBlockStep(b.id,b.x+Math.sign(x-b.x),b.y+Math.sign(y-b.y)));b=expectedModel.getBlock(drag.blockId);}}
 if(drag.exitSide)assert(expectedModel.tryExit(drag.blockId,drag.exitSide).ok);
 assert(expectedModel.commitAction());expected.push(expectedModel.snapshot());
}
assert(expectedModel.snapshot().complete,'Unchanged formal model fully replayed');
await writeFile(resolve(output,'route.json'),JSON.stringify({level,drags:solution.drags,exploredStates:solution.exploredStates},null,2));
const report={status:'RUNNING',scope:'Formal Lv10, one opening Pulse plus complete real Pointer route, natural RAF; isolated MemoryHost only. Not WeChat phone validation.',sourceBindings:await bindings(),formalLevelSha256:hash(JSON.stringify(level)),routeSha256:hash(JSON.stringify(solution.drags)),scenarios:[],errors:[]};
const seed={schemaVersion:1,currentLevel:10,highestLevel:10,coins:777,sound:false,music:false,haptic:false,reducedMotion:false,language:'zh-CN',
 featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','key-lock','arrow-block','lift','star'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:0,rocket:0,pulse:1},
 bestStars:Object.fromEntries(Array.from({length:9},(_,i)=>[String(i+1),3])),bestMoves:{},rewardedLevels:Array.from({length:9},(_,i)=>i+1),
 collectionIntroPending:false,collectionIntroShown:true,leagueIntroSeen:true,journeyProgress:{claimedMilestoneLevels:[5],seenEpisodeUnlockLevels:[1]},
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},metaDiscovery:{collectionViewedThroughLevel:10,dailyUnlockSeen:true}};
const fixture=`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {getLevelStrict} from '/src/core/levels.ts';
const key='color-escape-save-v1',audit={writes:[],frames:[],pointers:[]};let game;
class MemoryHost extends WebHost{data=new Map([[key,${JSON.stringify(seed)}]]);storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}storageSet(k,v){const copy=structuredClone(v);audit.writes.push({key:k,value:copy,at:performance.now()});this.data.set(k,copy);return true;}music(){}sound(){}vibrate(){}}
const host=new MemoryHost();game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;window.__EARLY_PULSE__={host,audit,formal:()=>game.model.level===getLevelStrict(10)};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,at:performance.now()}),true);
const sample=()=>{const s=game.getDebugState();audit.frames.push({at:performance.now(),screen:s.screen,frozen:s.puzzle.blocks.find(b=>b.id==='${targetId}')?.frozen,used:s.puzzle.pulseRescueUsed,guide:s.pulseRescueGuide,stock:s.economy.boosters.pulse,spent:s.activeRun?.boosterSpent.pulse??0,seconds:s.puzzle.remainingSeconds});requestAnimationFrame(sample);};game.start();requestAnimationFrame(sample);
</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
const save=p=>p.evaluate(()=>structuredClone(window.__EARLY_PULSE__.host.data.get('color-escape-save-v1')));
const stable=p=>p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,s=g?.getDebugState();return s&&g.artReady&&!g.revisedArtLoading&&!g.navigationTransition&&!g.directLevelTransition&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!s.exitAnimations.length&&!s.revisedMechanismAnimations.length&&!s.generatorSpawnAnimations.length&&!s.pulseAnimation.visible;},undefined,{timeout:30000});
async function point(p,s,x,y){const r=await p.locator('canvas').boundingBox();return{x:r.x+s.viewportTransform.offsetX+x*s.viewportTransform.scale,y:r.y+s.viewportTransform.offsetY+y*s.viewportTransform.scale};}
async function click(p,key){const s=await state(p),r=s.interactionTargets.targets[key]?.hit;assert(r,`Pointer target ${key}`);const v=await point(p,s,r.x+r.width/2,r.y+r.height/2);await p.mouse.click(v.x,v.y,{delay:35});}
async function snap(p,row,label){const path=resolve(output,`${row.viewport.width}-${label}.png`);await p.screenshot({path});row.images.push(path);}
function spatial(s){return clean(Object.fromEntries(['blocks','gates','shutters','generators','queuedBlocks','cleared','complete','failed','pulseRescueUsed'].map(k=>[k,s[k]])));}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const row={viewport,status:'RUNNING',steps:[],images:[]};report.scenarios.push(row);
  const context=await browser.newContext({viewport,deviceScaleFactor:1});const p=await context.newPage();
  p.on('pageerror',e=>report.errors.push({viewport,message:e.message}));p.on('console',m=>{if(m.type()==='error')report.errors.push({viewport,message:m.text()});});
  await p.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const method of ['getItem','setItem','removeItem','clear'])Storage.prototype[method]=function(){window.__STORAGE_VIOLATIONS__.push(method);throw Error('Persistent storage forbidden');};for(const method of ['open','deleteDatabase'])indexedDB[method]=function(){window.__STORAGE_VIOLATIONS__.push(method);throw Error('Persistent database forbidden');};});
  await p.route('**/__early_pulse_fixture__',r=>r.fulfill({contentType:'text/html',body:fixture}));
  try{
   await p.goto(origin+'/__early_pulse_fixture__',{waitUntil:'domcontentloaded'});
   await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__.storageBaselineReady,undefined,{timeout:60000});
   await p.evaluate(()=>window.__COLOR_ESCAPE__.loadLevel(10,true));await stable(p);
   assert.equal(await p.evaluate(()=>window.__EARLY_PULSE__.formal()),true);
   row.opening=await state(p);row.openingSave=await save(p);assert.equal(row.opening.puzzle.blocks.find(b=>b.id===targetId).frozen,25);await snap(p,row,'opening-25');
   await click(p,'booster.pulse');await stable(p);row.afterPulse=await state(p);
   assert.equal(row.afterPulse.puzzle.blocks.find(b=>b.id===targetId).frozen,23);assert.equal(row.afterPulse.puzzle.pulseRescueUsed,true);
   assert.equal(row.afterPulse.economy.boosters.pulse,1,'Lv10 retains physical inventory until win');assert.equal(row.afterPulse.activeRun.boosterSpent.pulse,1,'Only one deferred use');
   await snap(p,row,'early-pulse-23');
   for(const [index,drag]of solution.drags.entries()){
    await stable(p);const s=await state(p),b=s.puzzle.blocks.find(b=>b.id===drag.blockId);assert(b&&!b.frozen&&!s.puzzle.failed);
    const [gx,gy]=b.shape[0];const move=async(x,y)=>{const v=await point(p,s,s.board.innerX+(x+gx+.5)*s.board.cell,s.board.innerY+(y+gy+.5)*s.board.cell);await p.mouse.move(v.x,v.y,{steps:3});};
    await move(b.x,b.y);await p.mouse.down();for(const[x,y]of drag.path)await move(x,y);
    if(drag.exitSide){const[x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+dx,y+dy);}
    await p.mouse.up();await stable(p);const after=await state(p);
    assert.deepEqual(spatial(after.puzzle),spatial(expected[index]),`Actual Pointer route step ${index+1}`);assert.equal(after.puzzle.moves,index+1);
    assert(!after.pulseRescueGuide.visible,'No second pulse hand after early use');assert(after.puzzle.remainingSeconds<=s.puzzle.remainingSeconds&&!after.puzzle.failed);
    const frozen=after.puzzle.blocks.find(b=>b.id===targetId)?.frozen;row.steps.push({index:index+1,blockId:drag.blockId,frozen,moves:after.puzzle.moves,cleared:after.puzzle.cleared,seconds:after.puzzle.remainingSeconds,guide:after.pulseRescueGuide});
    if(frozen===1){row.atOne=after;await snap(p,row,'one-no-second-guide');}
    if(frozen===0&&!row.thawed){row.thawed=after;await snap(p,row,'naturally-thawed-zero');}
   }
   await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='win'&&!g.pendingSettlement;},undefined,{timeout:30000});
   row.win=await state(p);row.winSave=await save(p);assert(row.win.puzzle.complete&&row.win.puzzle.remainingSeconds>0);assert.equal(row.win.puzzle.blocks.length,0);assert.equal(row.win.puzzle.moves,solution.drags.length);
   assert(row.atOne&&row.thawed);assert.equal(row.winSave.boosters.pulse,0,'Exactly one charge at confirmed victory');assert.equal(row.winSave.boosters.rocket,0);assert(row.win.puzzle.remainingSeconds<row.afterPulse.puzzle.remainingSeconds,'Natural clock advanced');
   await snap(p,row,'win');row.audit=await p.evaluate(()=>structuredClone(window.__EARLY_PULSE__.audit));
   assert(!row.audit.frames.some(f=>f.used&&f.guide.visible));assert(row.audit.frames.some(f=>f.used&&f.frozen===1));
   assert.deepEqual(await p.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);row.status='PASS';
  }catch(error){row.status='FAIL';row.error=String(error.stack??error);row.lastState=await state(p).catch(()=>null);row.audit=await p.evaluate(()=>structuredClone(window.__EARLY_PULSE__?.audit)).catch(()=>null);await snap(p,row,'failure').catch(()=>{});throw error;}
  finally{await context.close();}
 }
 assert.deepEqual(report.errors,[]);report.finalSourceBindings=await bindings();assert.deepEqual(report.finalSourceBindings,report.sourceBindings,'Bound source files must not drift');report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,output,scenarios:report.scenarios.map(s=>({viewport:s.viewport,status:s.status,moves:s.win?.puzzle.moves,frames:s.audit?.frames.length})),error:report.error}));
