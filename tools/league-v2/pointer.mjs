import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { levelSha256, routeSha256 } from './proof-contract.mjs';

const [file,output,viewportArg='496x1078']=process.argv.slice(2);
const formalRegistry=process.argv.includes('--formal');
assert(file&&output,'Usage: node tools/league-v2/pointer.mjs proof.json new-output-directory [496x1078] [--formal]');
const dimensions=/^(\d+)x(\d+)$/.exec(viewportArg);assert(dimensions);
const viewport={width:Number(dimensions[1]),height:Number(dimensions[2])};
const candidate=JSON.parse(await fs.readFile(file,'utf8'));
assert.equal(candidate.accepted,true);assert.equal(levelSha256(candidate.level),candidate.levelSha256);
assert.equal(routeSha256(candidate.drags),candidate.routeSha256);
await fs.mkdir(output,{recursive:false});
const report={schemaVersion:2,mode:'league',index:candidate.index,levelSha256:candidate.levelSha256,routeSha256:candidate.routeSha256,
  viewport,status:'RUNNING',candidateInjection:!formalRegistry,formalRegistryIdentity:formalRegistry,naturalClock:true,clockMocked:false,
  pointerValidated:false,timeValidated:false,formalReady:false,playerSaveTouched:false,actions:[],errors:[],files:{}};
const bind=async file=>report.files[file.replaceAll('\\','/')]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
const tree=async dir=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await tree(file);else await bind(file);}};
await tree('src');
for(const f of [file,'tools/league-v2/pointer.mjs','tools/league-v2/pointer-browser.mjs','tools/league-v2/pointer.html'])await bind(f);
assert(Object.keys(candidate.staticAudit?.assetBindings??{}).length>0,'Bind the actual whole-block sprite files');
for(const [asset,hash]of Object.entries(candidate.staticAudit.assetBindings)){
 const f=path.join('public',asset);await bind(f);assert.equal(report.files[f.replaceAll('\\','/')],hash,'Candidate art changed: '+asset);
}
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport});page.on('pageerror',error=>report.errors.push(error.message));
await page.addInitScript(()=>{
  window.__STORAGE_VIOLATIONS__=[];
  for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Persistent storage forbidden in isolated candidate QA');};
  for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Persistent database forbidden');};
});
const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
const stable=()=>page.waitForFunction(()=>{
  const game=window.__COLOR_ESCAPE__,d=game?.getDebugState();
  return d?.puzzle?.started&&!game.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null
    &&d.art.formalGameplay.missingWholeBlockIds.length===0&&!game.hasInitialRevisedRegionPresentation()
    &&!game.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;
},undefined,{timeout:20000});
try{
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/league-v2/pointer.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
  const entry=await page.evaluate(({candidate,formalRegistry})=>window.__LEAGUE_CANDIDATE__.load(candidate,formalRegistry),{candidate,formalRegistry});
  assert.equal(levelSha256(entry.level),candidate.levelSha256);
  assert.equal(entry.formalRegistryIdentity,formalRegistry);report.assignment=entry.assignment;
  report.entryBaseline=entry.entryBaseline;
  await stable();const initial=await state();
  report.initialPuzzle={moves:initial.puzzle.moves,cleared:initial.puzzle.cleared,remainingSeconds:initial.puzzle.remainingSeconds};
  await page.screenshot({path:path.join(output,'opening.png')});
  const beforeClock=initial.puzzle.remainingSeconds;
  await page.waitForTimeout(180);
  const afterClock=(await state()).puzzle.remainingSeconds;
  assert(afterClock<beforeClock,'Natural clock must advance');report.naturalClockProbe={beforeClock,afterClock};
  const started=Date.now();
  for(const [index,drag]of candidate.drags.entries()){
    await stable();const s=await state(),before=s.puzzle,b=before.blocks.find(b=>b.id===drag.blockId);
    assert(b&&!before.failed,`Drag ${index}: missing body or timeout`);
    const rect=await page.locator('canvas').boundingBox(),[gx,gy]=b.shape[0],t=s.viewportTransform;
    const move=(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,
      rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:3});
    await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();
    for(const [x,y]of drag.path)await move(x+gx+.5,y+gy+.5);
    if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],delta={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+delta[0],y+gy+.5+delta[1]);}
    await page.mouse.up();await stable();const after=(await state()).puzzle;
    assert.equal(after.moves,before.moves+1,`Drag ${index}: exactly one real Pointer commit`);
    assert(!after.failed&&after.remainingSeconds<=before.remainingSeconds,`Drag ${index}: real clock/failure`);
    const clearDelta=after.cleared-before.cleared;
    const expected=candidate.route.independentReplay.trace[index];
    assert.equal(clearDelta,expected.clearDelta,`Drag ${index}: real clear/peel count`);
    if(!drag.exitSide){const actual=after.blocks.find(b=>b.id===drag.blockId);assert.deepEqual([actual.x,actual.y],drag.path.at(-1));}
    report.actions.push({index,blockId:drag.blockId,clearDelta,moves:after.moves,remainingSeconds:after.remainingSeconds});
    if(index%15===0)console.log(JSON.stringify({index:candidate.index,viewport:viewportArg,drag:index+1,total:candidate.drags.length}));
  }
  const final=(await state()).puzzle;
  assert(final.complete&&!final.failed&&final.remainingSeconds>0,'Actual route must finish in natural time');
  assert.equal(final.blocks.length,0);assert.equal(final.queuedBlocks.length,0);
  report.U=report.actions.filter(action=>action.clearDelta===0).length;assert.equal(report.U,candidate.U);
  report.totalDrags=final.moves;report.wallSeconds=(Date.now()-started)/1000;
  report.finalPuzzle={complete:final.complete,failed:final.failed,remainingSeconds:final.remainingSeconds,
    blocks:final.blocks.length,queuedBlocks:final.queuedBlocks.length,moves:final.moves,cleared:final.cleared};
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='leagueResult'&&window.__COLOR_ESCAPE__.leagueRunResult?.persistence==='committed',undefined,{timeout:10000});
  report.settlement=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;return {save:structuredClone(g.save),result:structuredClone(g.leagueRunResult),points:g.leagueRun.provisionalPoints};});
  assert.equal(report.settlement.result.points,candidate.specials.length*10);
  assert.equal(report.settlement.save.league.season.score,candidate.specials.length*10);
  assert.deepEqual(report.settlement.save.league.season.cleared,[...entry.entryBaseline.league.season.cleared,candidate.index]);
  report.memoryPersistence=await page.evaluate(()=>window.__LEAGUE_CANDIDATE__.storage());
  assert.equal(report.memoryPersistence.backend,'MemoryHost');
  assert(report.memoryPersistence.operations.some(o=>o.kind==='write'&&o.key==='color-escape-save-v1'));
  assert.deepEqual(report.memoryPersistence.persistedSave.league,report.settlement.save.league,'League result must reach the in-memory host persistence');
  for(const key of ['coins','currentLevel','highestLevel','bestStars','bestMoves','rewardedLevels','lifeState','boosters'])assert.deepEqual(report.settlement.save[key],entry.entryBaseline[key], 'League completion changed '+key);
  report.playableSeconds=initial.puzzle.remainingSeconds-final.remainingSeconds;
  report.drawAudit=await page.evaluate(()=>window.__LEAGUE_CANDIDATE__.drawAudit);
  assert(report.drawAudit.calls>0);assert.equal(report.drawAudit.rotated,0);assert.equal(report.drawAudit.canvasRotationCalls,0);
  report.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(report.storageViolations,[]);
  assert.deepEqual(report.errors,[]);
  await page.screenshot({path:path.join(output,'complete.png')});
  for(const [file,hash]of Object.entries(report.files))assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),hash,`Input changed during Pointer run: ${file}`);
  report.pointerValidated=true;report.timeValidated=true;report.status=formalRegistry?'FORMAL_POINTER_NATURAL_TIME_PASS':'CANDIDATE_POINTER_NATURAL_TIME_PASS';
}catch(error){
  report.status='FAIL';report.failure=error.message;process.exitCode=1;
  report.lastState=await state().catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
}finally{
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  await browser.close();await server.close();
}
console.log(JSON.stringify({output,status:report.status,U:report.U,totalDrags:report.totalDrags,failure:report.failure}));
