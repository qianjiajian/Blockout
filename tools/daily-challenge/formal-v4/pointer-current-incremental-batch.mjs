import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// Incremental candidate-only current-UI acceptance. Reuse the unchanged
// volatile-memory browser harness; original receipts are never rewritten.
// All moves, continuous holds, exits, FIFO, timers and settlement run in the
// actual current production game. No model actions or clock APIs are called.
const own='tools/daily-challenge/formal-v4/pointer-current-incremental-batch.mjs';

// Normalize only the saved witness lookup, not the level, drags, proof or time.
// If both receipt shapes occur, the fields consumed by this harness must agree.
export function readSavedIndependentReplay(q){
 const sources=[['route.independentReplay',q.route?.independentReplay],['freshIndependentReplay',q.freshIndependentReplay]]
  .filter(([,replay])=>replay!==undefined);
 assert(sources.length,'A saved independent full replay is required');
 assert(Array.isArray(q.drags)&&q.drags.length>0);
 const project=replay=>replay.trace.map(({index,blockId,clearDelta,moves})=>({index,blockId,clearDelta,moves}));
 for(const [source,replay]of sources){
  assert(replay?.valid===true&&replay.complete===true&&replay.failed!==true,`Invalid saved ${source}`);
  assert(Array.isArray(replay.trace));assert.equal(replay.trace.length,q.drags.length,`${source} trace length`);
  for(const [i,row]of replay.trace.entries()){
   assert.equal(row.index,i);assert.equal(row.blockId,q.drags[i].blockId);assert.equal(row.moves,i+1);
   assert(Number.isInteger(row.clearDelta)&&row.clearDelta>=0);
  }
  assert.equal(replay.effectiveDrags,q.drags.length);assert.equal(replay.nonClearingDrags,q.U);
  assert.equal(replay.trace.filter(row=>row.clearDelta===0).length,q.U);
  if(replay.clearEvents!==undefined)assert.equal(replay.trace.reduce((n,row)=>n+row.clearDelta,0),replay.clearEvents);
 }
 for(const [,replay]of sources.slice(1))assert.deepEqual(project(replay),project(sources[0][1]),'Saved independent traces disagree');
 return {source:sources[0][0],replay:sources[0][1]};
}

async function main(){
const [indexFile,output,targetList]=process.argv.slice(2);
assert(indexFile&&output&&targetList,'selection index, new output directory, comma-separated formal IDs required');
const targets=targetList.split(',');
assert(targets.length>0&&new Set(targets).size===targets.length&&targets.every(x=>/^daily-[a-z0-9-]+$/.test(x)));
const viewports=[{width:320,height:568},{width:496,height:1078}];
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(p,q)=>fs.writeFile(p,JSON.stringify(q,null,2)+'\n',{flag:'wx'});
const indexBytes=await fs.readFile(indexFile),index=JSON.parse(indexBytes),entries=[];
assert(Array.isArray(index.files)&&index.files.length>0&&index.files.length<=300);
for(const file of index.files){const b=await fs.readFile(file),q=JSON.parse(b);if(!targets.includes(q.formalId))continue;
 assert(q.accepted&&!q.qualificationOnly&&!q.formalReady);assert.equal(q.schemaVersion,4);
 assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(routeSha256(q.drags),q.routeSha256);
 const witness=readSavedIndependentReplay(q);entries.push({file,sha256:sha(b),q,witness});}
assert.deepEqual(entries.map(e=>e.q.formalId).sort(),[...targets].sort());
entries.sort((a,b)=>targets.indexOf(a.q.formalId)-targets.indexOf(b.q.formalId));
await fs.mkdir(output,{recursive:false});
const bindings={[indexFile]:sha(indexBytes)};
async function bindTree(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())await bindTree(p);else bindings[p]=sha(await fs.readFile(p));}}
await bindTree('src');
for(const p of [own,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.156.0.md','docs/rules/mechanism-rules-v1.185.0.md','docs/rules/mechanism-rules-v1.186.0.md','tools/daily-challenge/formal-v2/contract.mjs',
 'tools/daily-challenge/formal-v3/pointer.html','tools/daily-challenge/formal-v3/pointer-browser.mjs',...entries.map(e=>e.file)])bindings[p]=sha(await fs.readFile(p));
const checkBindings=async()=>{for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,`Current input changed: ${p}`);};
await write(`${output}/plan.json`,{status:'INCREMENTAL_CANDIDATE_CURRENT_UI_DUAL_POINTER_RUNS',selection:{path:indexFile,sha256:sha(indexBytes)},
 candidates:entries.map(({file,sha256,q,witness})=>({file,sha256,formalId:q.formalId,levelSha256:q.levelSha256,routeSha256:q.routeSha256,L:q.L,U:q.U,savedIndependentReplaySource:witness.source})),
 viewports,bindings,receiptMetadataOverride:{schemaVersion:3,originalSchemaVersion:4,physicalObjectUnchanged:true,
  reason:'Unchanged v3 candidate-injection browser metadata gate; saved independent trace lookup is normalized in memory only; original schema4 mathematical receipts remain immutable'},
 currentUIValidation:true,historicalMathematicsRecomputed:false,candidateInjection:true,formalRegistryIdentity:false,
 allRecordedDragsThroughPointer:true,naturalClock:true,clockMocked:false,isolatedMemorySave:true,formalReady:false});
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const item of entries)for(const viewport of viewports){
  await checkBindings();const q=item.q,folder=`${output}/${q.formalId}-${viewport.width}x${viewport.height}`;await fs.mkdir(folder,{recursive:false});
  const report={schemaVersion:4,status:'RUNNING',receipt:{path:item.file,sha256:item.sha256},formalId:q.formalId,
   savedIndependentReplaySource:item.witness.source,
   levelSha256:q.levelSha256,routeSha256:q.routeSha256,originalReceiptSchemaVersion:4,harnessMetadataSchemaOverride:3,
   candidateInjection:true,formalRegistryIdentity:false,naturalClock:true,clockMocked:false,playerSaveTouched:false,
   currentUIValidation:true,historicalMathToolchainSha256:q.toolchainSha256,proofNotRerun:true,viewport,
   actions:[],errors:[],screenshots:{},pointerValidated:false,timeValidated:false,settlementValidated:false,formalReady:false};
  const page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(e.message));
  const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
  const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&
   d.art.formalGameplay.requestedBlockSignature==null&&!d.art.formalGameplay.missingWholeBlockIds.length&&!g.hasInitialRevisedRegionPresentation()&&
   !g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
  const screenshot=async name=>{const p=`${folder}/${name}.png`;await page.screenshot({path:p});report.screenshots[name]={path:p,sha256:sha(await fs.readFile(p))};};
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];window.__POINTER_OBSERVATIONS__=[];
   for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Persistent storage forbidden');};
   for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Persistent database forbidden');};
   for(const name of ['pointerdown','pointermove','pointerup'])document.addEventListener(name,e=>{
    window.__POINTER_OBSERVATIONS__.push({type:name,isTrusted:e.isTrusted,x:e.clientX,y:e.clientY,buttons:e.buttons,timeStamp:e.timeStamp});
   },{capture:true,passive:true});});
  try{
   await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/daily-challenge/formal-v3/pointer.html`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
   const loaded=await page.evaluate(c=>window.__DAILY_CANDIDATE__.load({...c,schemaVersion:3},false),q);
   assert.equal(levelSha256(loaded.level),q.levelSha256);assert.equal(loaded.formalRegistryIdentity,false);await stable();
   const baseline=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,s=g.save;return{coins:s.coins,inspiration:s.collectionProgress.inspiration,
    currentLevel:s.currentLevel,highestLevel:s.highestLevel,bestStars:structuredClone(s.bestStars),bestMoves:structuredClone(s.bestMoves),
    rewardedLevels:structuredClone(s.rewardedLevels),boosters:structuredClone(s.boosters),lifeState:structuredClone(s.lifeState),
    attemptsRemaining:s.dailyChallenge.attemptsRemaining,dailyMode:Boolean(g.dailyChallengeRunInfo())};});
   assert(baseline.dailyMode);report.entryBaseline=baseline;
   const initial=(await state()).puzzle;report.initialInventory={bodies:initial.blocks.length,queued:initial.queuedBlocks.length,generators:initial.generators};
   assert.equal(initial.blocks.length+initial.queuedBlocks.length,q.level.blocks.length);await screenshot('opening');
   const clockBefore=(await state()).puzzle.remainingSeconds;await page.waitForTimeout(180);const clockAfter=(await state()).puzzle.remainingSeconds;
   assert(clockAfter<clockBefore,'Natural clock must decrease without clock manipulation');report.naturalClockProbe={before:clockBefore,after:clockAfter};
   const started=Date.now();
   for(const [i,drag]of q.drags.entries()){
    await stable();const s=await state(),before=s.puzzle,b=before.blocks.find(x=>x.id===drag.blockId);assert(b&&!before.failed);
    const rect=await page.locator('canvas').boundingBox(),[gx,gy]=b.shape[0],t=s.viewportTransform;
    const move=(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:3});
    const unitTrace=[];let previous=[b.x,b.y],previousDelta=null,turns=0;
    await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();
    for(const [x,y]of drag.path){const delta=[x-previous[0],y-previous[1]];assert.equal(Math.abs(delta[0])+Math.abs(delta[1]),1);
     if(previousDelta&&(delta[0]!==previousDelta[0]||delta[1]!==previousDelta[1]))turns++;
     await move(x+gx+.5,y+gy+.5);const p=(await state()).puzzle;
     unitTrace.push({anchor:[x,y],moves:p.moves,cleared:p.cleared,queuedIds:p.queuedBlocks.map(b=>b.id),generators:p.generators,
      lockCounts:p.blocks.filter(b=>b.lockedBy).map(b=>({id:b.id,count:b.lockCount})),remainingSeconds:p.remainingSeconds});
     previous=[x,y];previousDelta=delta;
    }
    if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],delta={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+delta[0],y+gy+.5+delta[1]);}
    await page.mouse.up();await stable();const after=(await state()).puzzle;
    assert.equal(after.moves,before.moves+1,`Gesture${i+1} must commit once`);assert(!after.failed);assert(after.remainingSeconds<=before.remainingSeconds);
    const clearDelta=after.cleared-before.cleared;assert.equal(clearDelta,item.witness.replay.trace[i].clearDelta);
    if(!drag.exitSide){const actual=after.blocks.find(x=>x.id===drag.blockId);assert(actual);assert.deepEqual([actual.x,actual.y],drag.path.at(-1));}
    const unlocked=before.blocks.filter(x=>x.lockedBy&&after.blocks.some(y=>y.id===x.id&&!y.lockedBy)).map(x=>x.id);
    const thawed=before.blocks.filter(x=>x.frozen>0&&after.blocks.some(y=>y.id===x.id&&y.frozen===0)).map(x=>x.id);
    const action={index:i,drag:i+1,blockId:drag.blockId,clearDelta,moves:after.moves,remainingSeconds:after.remainingSeconds,continuousHoldTurns:turns,unitTrace,
     before:{queuedIds:before.queuedBlocks.map(x=>x.id),generatorHeads:before.generators.map(x=>({id:x.id,head:x.head,remaining:x.remaining})),
      locks:before.blocks.filter(x=>x.lockedBy).map(x=>({id:x.id,count:x.lockCount}))},
     after:{bodyIds:after.blocks.map(x=>x.id),queuedIds:after.queuedBlocks.map(x=>x.id),generatorHeads:after.generators.map(x=>({id:x.id,head:x.head,remaining:x.remaining})),
      locks:after.blocks.filter(x=>x.lockedBy).map(x=>({id:x.id,count:x.lockCount}))},unlocked,thawed,
     iceBefore:before.blocks.filter(x=>x.frozen>0).map(x=>({id:x.id,count:x.frozen})),
     iceAfter:after.blocks.filter(x=>x.frozen>0).map(x=>({id:x.id,count:x.frozen}))};
    report.actions.push(action);
    if(unlocked.length||thawed.length||q.level.generators?.some(g=>g.queueBlockIds.includes(drag.blockId))){if(!report.screenshots.mechanism)await screenshot('mechanism');}
    if(i%15===0)console.log(JSON.stringify({formalId:q.formalId,viewport:`${viewport.width}x${viewport.height}`,drag:i+1,total:q.drags.length}));
   }
   const final=(await state()).puzzle;assert(final.complete&&!final.failed&&final.remainingSeconds>0);assert.equal(final.blocks.length,0);assert.equal(final.queuedBlocks.length,0);
   report.U=report.actions.filter(a=>a.clearDelta===0).length;assert.equal(report.U,q.U);assert.equal(final.moves,q.drags.length);
   report.wallSeconds=(Date.now()-started)/1000;report.totalDrags=final.moves;report.continuousHoldTurns=report.actions.reduce((n,a)=>n+a.continuousHoldTurns,0);
   report.continuousHoldTurningDrags=report.actions.filter(a=>a.continuousHoldTurns>0).length;
   report.finalPuzzle={complete:final.complete,failed:final.failed,remainingSeconds:final.remainingSeconds,blocks:0,queuedBlocks:0,moves:final.moves};
   report.playableSeconds=initial.remainingSeconds-final.remainingSeconds;
   const cargoIds=new Set((q.level.generators??[]).flatMap(g=>g.queueBlockIds));
   report.generatorParticipation=(q.level.generators??[]).map(g=>{const cargo=report.actions.filter(a=>g.queueBlockIds.includes(a.blockId)&&a.clearDelta===1);
    assert.deepEqual(cargo.map(a=>a.blockId).sort(),[...g.queueBlockIds].sort(),'Every queued body must actually clear once');
    const remaining=cargo.map(a=>a.after.bodyIds.filter(id=>!cargoIds.has(id)).length);
    // FIFO describes spawning, not the order in which already spawned cargo
    // must leave. Check the actual head and queued suffix at every observation.
    const observations=[{drag:0,phase:'initial',generators:initial.generators,queuedIds:initial.queuedBlocks.map(b=>b.id)},
     ...report.actions.flatMap(a=>[{drag:a.drag,phase:'before',generators:a.before.generatorHeads,queuedIds:a.before.queuedIds},
      ...a.unitTrace.map(u=>({drag:a.drag,phase:'held',generators:u.generators,queuedIds:u.queuedIds})),
      {drag:a.drag,phase:'after',generators:a.after.generatorHeads,queuedIds:a.after.queuedIds}])];
    let lastHead=0;const spawnEvents=[];
    for(const observation of observations){const generator=observation.generators.find(x=>x.id===g.id);assert(generator);
     assert(Number.isInteger(generator.head)&&generator.head>=lastHead&&generator.head<=g.queueBlockIds.length);
     assert.equal(generator.remaining,g.queueBlockIds.length-generator.head);
     assert.deepEqual(observation.queuedIds.filter(id=>g.queueBlockIds.includes(id)).sort(),g.queueBlockIds.slice(generator.head).sort());
     if(generator.head>lastHead)spawnEvents.push({drag:observation.drag,phase:observation.phase,fromHead:lastHead,toHead:generator.head,
      bodyIds:g.queueBlockIds.slice(lastHead,generator.head)});
     lastHead=generator.head;
    }
    const finalGenerator=final.generators.find(x=>x.id===g.id);assert.equal(finalGenerator.remaining,0);assert.equal(finalGenerator.head,g.queueBlockIds.length);
    return{id:g.id,queue:g.queueBlockIds,spawnEvents,clearOrder:cargo.map(a=>a.blockId),clearDrags:cargo.map(a=>a.drag),
     baseBodiesRemainingAtCargoClear:remaining,finalHead:finalGenerator.head,remaining:0,minimumRemainingBodyQuotaApplied:false};});
   report.axisParticipation=q.level.blocks.filter(b=>b.movementAxis).map(b=>{
    const moves=report.actions.filter(a=>a.blockId===b.id);assert(moves.length);
    let previous=[b.x,b.y],steps=0;
    for(const a of moves)for(const u of a.unitTrace){
     const [x,y]=u.anchor;assert(b.movementAxis==='horizontal'?y===previous[1]:x===previous[0],'Real pointer path must obey original axis');
     steps++;previous=[x,y];
    }
    assert(moves.some(a=>a.clearDelta===1));
    return{id:b.id,axis:b.movementAxis,unitSteps:steps,firstAction:moves[0].drag,exitDrag:moves.find(a=>a.clearDelta===1).drag};
   });
   report.iceParticipation=q.level.blocks.filter(b=>b.frozen>0).map(b=>{
    const thaw=report.actions.find(a=>a.thawed.includes(b.id)),first=report.actions.find(a=>a.blockId===b.id);
    assert(thaw&&first&&first.drag>thaw.drag,'Frozen body must thaw before its first actual pointer action');
    const clears=report.actions.filter(a=>a.drag<=thaw.drag).reduce((n,a)=>n+a.clearDelta,0);assert.equal(clears,b.frozen);
    return{id:b.id,initialCount:b.frozen,releaseDrag:thaw.drag,firstAction:first.drag,clearsAtRelease:clears};
   });
   report.keyParticipation=q.level.blocks.filter(b=>b.lockedBy).map(b=>{const unlock=report.actions.find(a=>a.unlocked.includes(b.id));assert(unlock);
    const keys=report.actions.filter(a=>a.clearDelta===1&&a.drag<=unlock.drag&&q.level.blocks.find(b=>b.id===a.blockId)?.keyId===b.lockedBy);
    assert.equal(keys.length,b.lockCount);const first=report.actions.find(a=>a.blockId===b.id);assert(first.drag>unlock.drag);
    return{id:b.id,initialCount:b.lockCount,keyEvents:keys.map(a=>({drag:a.drag,id:a.blockId})),unlockDrag:unlock.drag,firstAction:first.drag};});
   report.keyUnlockTiming={distinctUnlockDrags:[...new Set(report.keyParticipation.map(x=>x.unlockDrag))],
    lockCount:report.keyParticipation.length,distinctUnlockPerLockQuotaApplied:false};
   await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='win'&&g.dailyChallengeWin&&g.getDebugState().settlement.status==='committed';},undefined,{timeout:10000});
   report.settlement=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,s=g.save;return{screen:g.screen,win:g.dailyChallengeWin,debug:g.getDebugState().settlement,
    coins:s.coins,inspiration:s.collectionProgress.inspiration,currentLevel:s.currentLevel,highestLevel:s.highestLevel,bestStars:s.bestStars,bestMoves:s.bestMoves,
    rewardedLevels:s.rewardedLevels,boosters:s.boosters,lifeState:s.lifeState,activeRun:s.activeRun??null,daily:s.dailyChallenge};});
   const reward={1:{coins:50,inspiration:20},2:{coins:100,inspiration:50},3:{coins:200,inspiration:100}}[q.difficulty];
   assert.equal(report.settlement.coins-baseline.coins,reward.coins);assert.equal(report.settlement.inspiration-baseline.inspiration,reward.inspiration);
   for(const k of ['currentLevel','highestLevel','bestStars','bestMoves','rewardedLevels','boosters','lifeState'])assert.deepEqual(report.settlement[k],baseline[k]);
   assert.equal(report.settlement.daily.completed[q.difficulty],true);assert.equal(report.settlement.activeRun,null);
   assert.equal(report.settlement.debug.kind,'dailyChallenge');assert.equal(report.settlement.debug.earnedStars,0);assert.equal(report.settlement.debug.starConditions,undefined);
   assert.equal(report.settlement.daily.attemptsRemaining,baseline.attemptsRemaining,'Synthetic injection does not claim real entry debit validation');
   report.pointerEvents=await page.evaluate(()=>window.__POINTER_OBSERVATIONS__);assert(report.pointerEvents.every(e=>e.isTrusted));
   assert.equal(report.pointerEvents.filter(e=>e.type==='pointerdown').length,q.drags.length);assert.equal(report.pointerEvents.filter(e=>e.type==='pointerup').length,q.drags.length);
   report.drawAudit=await page.evaluate(()=>window.__DAILY_CANDIDATE__.drawAudit);assert(report.drawAudit.calls>0);assert.equal(report.drawAudit.rotated,0);assert.equal(report.drawAudit.canvasRotationCalls,0);
   report.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(report.storageViolations,[]);assert.deepEqual(report.errors,[]);
   await page.waitForTimeout(500);await screenshot('complete');await checkBindings();
   report.pointerValidated=true;report.timeValidated=true;report.settlementValidated=true;report.status='CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS';
  }catch(e){report.status='FAIL';report.failure=e.message;report.lastState=await state().catch(()=>null);await screenshot('failure').catch(()=>{});}
  finally{await write(`${folder}/report.json`,report);await page.close();}
  results.push({formalId:q.formalId,viewport,report:{path:`${folder}/report.json`,sha256:sha(await fs.readFile(`${folder}/report.json`))},
   status:report.status,U:report.U,totalDrags:report.totalDrags,wallSeconds:report.wallSeconds,continuousHoldTurningDrags:report.continuousHoldTurningDrags,failure:report.failure});
  await fs.writeFile(`${output}/progress.json`,JSON.stringify({completed:results.length,total:targets.length*viewports.length,results},null,2)+'\n');
  console.log(JSON.stringify(results.at(-1)));
 }
 await checkBindings();
 const report={status:results.every(r=>r.status==='CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS')?'INCREMENTAL_CANDIDATES_CURRENT_POINTER_RUNS_PASS':'INCREMENTAL_CANDIDATES_POINTER_FAILURE',
  selection:{path:indexFile,sha256:sha(indexBytes)},results,bindings,passed:results.filter(r=>r.status==='CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS').length,
  actualCurrentSource:true,candidateInjection:true,formalRegistryIdentity:false,formal300Acceptance:false,formalReady:false,
  noStarsEvaluated:true,realPlayerSaveTouched:false,newGameplaySearches:0,newPublicClaims:0,physicalObjectsUnchanged:true,
  note:'Isolated candidate runs on current root UI. Historical L/U receipts unchanged. Each accepted object still needs formal data admission and exact production-entry validation; no new300 completion or production entry debit is claimed.'};
 await write(`${output}/report.json`,report);console.log(JSON.stringify({output,status:report.status,passed:report.passed}));
 if(report.passed!==targets.length*viewports.length)process.exitCode=1;
}finally{await browser.close();await server.close();}
}

// Importing the trace reader for metadata checks does not start a browser.
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(own))await main();
