import assert from 'node:assert/strict';
import {observeFormalModelTiming,replayObservedModelTiming} from './revised-model-timing-observer.mjs';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {loadPreviewCore,digest} from './revised-preview-validation-v160.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {verifyContinuationBatchV111 as verifyContinuationBatch} from './revised-continuation-bombs-v111.mjs';
import {selectFormalUiIds} from './revised-formal-ui-selection.mjs';

const continuation=process.argv[2]==='--continuation',root=process.cwd();
assert(continuation,'v1.11 UI requires --continuation ARCHIVE SHA');
const baselinePath=continuation?process.argv[3]:'.codex-temp/formal-revised-v110/pre-integration.json';
const expectedBaseline=continuation?process.argv[4]:'00b7d87ee7a4bf835ce78bab65eb8420232bac5ab68f42c4743a589960089dae';
assert.match(expectedBaseline??'',/^[a-f0-9]{64}$/i,'Pin the before-adoption archive');
assert.equal(digest(readFileSync(baselinePath)),expectedBaseline.toLowerCase(),'Preserved pre-integration values');
const baseline=JSON.parse(readFileSync(baselinePath));
const continuationVerification=continuation?await verifyContinuationBatch(baselinePath,expectedBaseline):null;
const onlyNew=continuation&&process.argv.includes('--only-new');
const sinceIndex=process.argv.indexOf('--since-ui');
const selection=continuation?selectFormalUiIds(baseline,continuationVerification.inputs,sinceIndex<0?null:{path:process.argv[sinceIndex+1],sha256:process.argv[sinceIndex+2]}):null;
assert(!(onlyNew&&sinceIndex>=0),'Select one explicit UI scope');
const currentBatchIds=onlyNew?JSON.parse(readFileSync(baseline.batchPath)).rows.map(r=>r.levelId).sort((a,b)=>a-b):null;
const EXPECTED_IDS=continuation?(onlyNew?currentBatchIds:selection.ids):[21,22,23,24,25,26,27,28,29,30,31,34,50,52,58,59,60,135,152];
const progressPath=continuation?baseline.batchPath:(process.argv[2]??'deliverables/revised-season-design-progress-v190-2026-09-22T10-10-14-828Z/progress.json');
if(!continuation)assert.equal(progressPath,baseline.progressPath);
assert.equal(digest(readFileSync(progressPath)),continuation?baseline.batchSha256:baseline.expectedProgress);
const lock=verifyRulesLock({readText:p=>readFileSync(path.resolve(root,p),'utf8')});
assert(lock.ok&&lock.activeVersion==='1.11.0','Formal adoption E2E requires the explicitly authorized v1.11 lock');
const manifest=JSON.parse(readFileSync('docs/rules/manifest.json')),rules=manifest.versions.find(r=>r.version===lock.activeVersion);
const files={},bind=(p,expected)=>{const h=digest(readFileSync(path.resolve(root,p)));if(expected)assert.equal(h,expected,`Input SHA ${p}`);if(files[p])assert.equal(h,files[p].sha256,`Concurrent input change ${p}`);files[p]={sha256:h};};
const tree=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=path.posix.join(dir,e.name);if(e.isDirectory())tree(p);else bind(p);}};
for(const[p,h]of Object.entries(continuationVerification?.inputs??{}))bind(p,h);
bind('tools/revised-formal-ui-selection.mjs');if(selection?.priorUi)bind(selection.priorUi.path,selection.priorUi.sha256);
for(const p of [progressPath,baselinePath,'docs/rules/manifest.json',rules.document,'tools/playtest-revised-formal-timed-bombs-v111.mjs','tools/revised-continuation-bombs-v111.mjs','tools/revised-formal-levels.html','tools/revised-formal-levels-browser.mjs','tools/revised-preview-validation-v160.mjs','tools/revised-gate-span-limits.mjs','tools/revised-opening-coverage.mjs','tools/verify-rules-lock.mjs'])bind(p);
bind('tools/revised-model-timing-observer.mjs');tree('src');tree('public/assets/art');
const progress=JSON.parse(readFileSync(progressPath));
const selected=continuation?baseline.rows.filter(r=>EXPECTED_IDS.includes(r.levelId)).map(r=>({levelId:r.levelId,dataPath:r.path,evidenceReport:r.sourceReview.path,candidateSha256:continuationVerification.rows.find(c=>c.levelId===r.levelId).candidateSha256})):progress.rows.filter(r=>r.status==='source-reviewed').sort((a,b)=>a.levelId-b.levelId);
assert.deepEqual(selected.map(r=>r.levelId),EXPECTED_IDS,'Exactly the independently source-reviewed formal batch');
const {api,inputs}=await loadPreviewCore();for(const p of inputs)bind(p);
const sources=[];
for(const row of selected){
 const old=baseline.rows.find(r=>r.levelId===row.levelId);assert(old);
 bind(row.dataPath,continuation?old.sha256:progress.files[row.dataPath]?.sha256);
 bind(row.evidenceReport,continuation?old.sourceReview.sha256:progress.files[row.evidenceReport]?.sha256);
 const prior=JSON.parse(readFileSync(row.dataPath));assert.deepEqual(prior.drags,old.drags,'Preserved full route');
 if(continuation){row.candidateSha256=digest(prior.level);assert(continuationVerification.rows.find(r=>r.levelId===row.levelId)?.replay.complete);}
 else{assert.equal(digest(prior.level),row.candidateSha256);assert(prior.pointerReplayValidated,'Prior first-batch pointer evidence required');}
 assert(prior.rulesPassed&&prior.sourceAligned&&prior.outlineAligned&&prior.ruleVersion==='1.11.0','Reviewed source and explicit v1.11 policy required');
 assert.equal(baseline.schemaVersion,2,'v1.11 preserved metadata schema');
 sources.push({row,prior,previous:{...old.previous.metadata,starTargets:old.previous.starTargets}});
}
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),relative=`playtest-results/revised-formal-timed-bombs-v111-${stamp}`,output=path.resolve(relative);mkdirSync(output,{recursive:true});
const report={ruleVersion:lock.activeVersion,scope:`${EXPECTED_IDS.length} adopted formal LEVELS through original loadLevel(id,true); MemoryHost only`,archivePath:baselinePath,archiveSha256:expectedBaseline,status:'running',selection:onlyNew?'newly-adopted-batch':selection?.selection??'cumulative',priorUi:selection?.priorUi??null,cumulativeIds:baseline.rows.map(r=>r.levelId),ids:EXPECTED_IDS,files,rows:[],errors:[],naturalClock:true,clockFrozen:false,difficultyLowerBoundCertified:false,timeAndStarsCalibrated:false,releaseApproved:false};
const server=await createServer({root,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,watch:{ignored:['**/deliverables/**','**/.codex-temp/**','**/playtest-results/**']}},logLevel:'error'});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1000,height:1078}});page.on('pageerror',e=>report.errors.push(e.message));
await page.addInitScript(()=>{window.__FORBIDDEN_STORAGE__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__FORBIDDEN_STORAGE__.push(m);throw Error('Real storage forbidden in formal E2E');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__FORBIDDEN_STORAGE__.push(m);throw Error('Real database forbidden in formal E2E');};});
const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
const stable=()=>page.waitForFunction(()=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return d?.puzzle?.started&&!d.generatorSpawnAnimations.length&&!d.revisedMechanismAnimations.length&&!d.exitAnimations.length;},undefined,{timeout:20000});
const spatial=s=>{const{moves,remainingSeconds,autonomousStarted,...rest}=s;return JSON.parse(JSON.stringify(rest));};
const geometry=l=>Object.fromEntries(['id','mechanismRules','width','height','playable','blocked','seams','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy','shutters','generators','elevators','conveyors'].map(k=>[k,l[k]??(['id','mechanismRules','width','height','bombFailurePolicy'].includes(k)?null:[])]));
async function move(x,y){const p=await page.evaluate(({x,y})=>{const d=window.__COLOR_ESCAPE__.getDebugState(),c=document.querySelector('canvas').getBoundingClientRect(),t=d.viewportTransform;return{x:c.left+t.offsetX+(d.board.innerX+x*d.board.cell)*t.scale,y:c.top+t.offsetY+(d.board.innerY+y*d.board.cell)*t.scale};},{x,y});await page.mouse.move(p.x,p.y,{steps:3});}
try{
 await page.goto(`${origin}/tools/revised-formal-levels.html`,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__REVISED_FORMAL_LEVELS__,undefined,{timeout:60000});
 await page.evaluate(install=>{window.__INSTALL_FORMAL_OBSERVER__=(0,eval)('('+install+')');},observeFormalModelTiming.toString());
 for(const {row:priorRow,prior,previous}of sources){
  const id=priorRow.levelId,startWall=Date.now(),entry=await page.evaluate(id=>{const entry=window.__REVISED_FORMAL_LEVELS__.load(id);return{...entry,timingInitial:window.__INSTALL_FORMAL_OBSERVER__()};},id),formal=entry.level;
  assert.deepEqual(entry.timingInitial,JSON.parse(JSON.stringify(new api.PuzzleModel(formal).snapshot())),'Observe before the first playable tick');
  assert(entry.formalObjectIdentity,`Formal object identity ${id}`);assert.deepEqual(geometry(formal),geometry(prior.level),`Formal geometry must match reviewed candidate Lv${id}`);
  for(const key of ['name','timeSeconds','reward'])assert.deepEqual(formal[key],previous[key],`Preserved formal ${key} Lv${id}`);
  const art=api.auditCandidateBlockArt(formal);assert(art.passed,`Formal art Lv${id}`);const span=auditGateSpanLimits(formal);assert(span.passed,`Formal gate span Lv${id}`);
  const expectedOpening=new api.PuzzleModel(formal);expectedOpening.start();const coverage=auditOpeningCoverage(expectedOpening.snapshot());assert(coverage.passed);
  const row={levelId:id,formalLevelSha256:digest(formal),geometrySha256:digest(geometry(formal)),sourceCandidateSha256:priorRow.candidateSha256,sourceReport:priorRow.evidenceReport,sourceData:priorRow.dataPath,approvedDifferences:prior.designPolicy.differences,exactCompetitorMatch:prior.exactMatch,formalObjectIdentity:true,metadata:{name:formal.name,difficulty:formal.difficulty,timeSeconds:formal.timeSeconds,reward:formal.reward,parMoves:formal.parMoves??null},coverage,span,artPassed:art.passed,steps:[],status:'running'};report.rows.push(row);
  await page.waitForFunction(req=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.art.ready&&d.art.revisedMechanisms.ready&&!d.art.formalGameplay.requestedIceSignature&&!d.art.formalGameplay.iceError&&req.every(({color,kind,shapeId})=>{const a=g.art.formalBlocks?.[color]?.[kind]?.[shapeId];return a&&(a.naturalWidth||a.width)>0;});},art.requirements,{timeout:60000});
  // Loading and screenshots consume natural time. All exact timer values are
  // independently checked by the complete observed-event replay below.
  await stable();const initial=await state();assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);assert.deepEqual(auditOpeningCoverage(initial.puzzle),coverage);
  row.metadata.actualStarTargets=initial.starTargets;assert.deepEqual(initial.starTargets,previous.starTargets,`Preserved actual display/settlement star targets Lv${id}`);row.oldMetadataPreserved=true;
  row.openingRemainingSeconds=initial.puzzle.remainingSeconds;const clockBefore=initial.puzzle.remainingSeconds;await page.waitForTimeout(180);const clockAfter=(await state()).puzzle.remainingSeconds;assert(clockAfter<clockBefore,`Natural playable clock must run Lv${id}`);row.naturalClockProbe={before:clockBefore,after:clockAfter};
  row.gateRenderAudit=await page.evaluate(async()=>{const{gatePortals}=await import('/src/core/gatePortals.ts');const g=window.__COLOR_ESCAPE__,s=g.model.snapshot(),actual=[],expected=[...s.gates.map(g=>({g,kind:'fixed'})),...s.flipDoors.map(g=>({g,kind:'flip'}))].flatMap(({g,kind})=>gatePortals(s,g).map(p=>({kind,color:g.color,side:p.side,size:p.size,origin:p.origin,frozen:g.frozen,...(kind==='flip'?{open:g.open}:{})})));const fixed=g.drawGateSegment,flip=g.drawFlipDoorSegment;let nested=false;g.drawGateSegment=function(...a){if(!nested)actual.push({kind:'fixed',color:a[3],side:a[0],size:a[2],origin:a[10]?.origin,frozen:a[4]});return fixed.apply(this,a);};g.drawFlipDoorSegment=function(...a){actual.push({kind:'flip',color:a[3],side:a[0],size:a[2],origin:a[8]?.origin,frozen:a[4],open:a[5]});nested=true;try{return flip.apply(this,a);}finally{nested=false;}};try{g.render();}finally{g.drawGateSegment=fixed;g.drawFlipDoorSegment=flip;}const sort=a=>a.sort((x,y)=>JSON.stringify(x).localeCompare(JSON.stringify(y)));return{actual:sort(actual),expected:sort(expected)};});assert.deepEqual(row.gateRenderAudit.actual,row.gateRenderAudit.expected,`Actual formal gate rendering Lv${id}`);row.gateRenderAudit.passed=true;
  await page.screenshot({path:path.join(output,`level-${String(id).padStart(3,'0')}-opening.png`)});
  await page.locator('canvas').screenshot({path:path.join(output,`level-${String(id).padStart(3,'0')}-board.png`)});
  for(const[i,drag]of prior.drags.entries()){
   const before=(await state()).puzzle;assert(!before.failed,`Natural clock expired before Lv${id}/${i+1}`);const b=before.blocks.find(b=>b.id===drag.blockId);assert(b,`Current block Lv${id}/${i+1}`);const[gx,gy]=b.shape[0];await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();for(const[x,y]of drag.path)await move(x+gx+.5,y+gy+.5);if(drag.exitSide){const[x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}await page.mouse.up();await stable();
   const after=(await state()).puzzle;assert.equal(after.moves,i+1);assert.equal(after.moves,before.moves+1);assert(after.remainingSeconds<=before.remainingSeconds,'No clock rewind');
   row.steps.push({step:i+1,blockId:drag.blockId,moves:after.moves,cleared:after.cleared,remainingSeconds:after.remainingSeconds,complete:after.complete});
  }
  const final=await state();assert(final.puzzle.complete&&!final.puzzle.failed);
  const timingLog=await page.evaluate(()=>window.__FORMAL_MODEL_TIMING__.read());
  row.observedTiming=replayObservedModelTiming(formal,timingLog,api);
  const logFile=`level-${String(id).padStart(3,'0')}-timing.json`;writeFileSync(path.join(output,logFile),JSON.stringify(timingLog)+'\n',{flag:'wx'});row.timingLogFile=logFile;assert(await page.evaluate(()=>window.__REVISED_FORMAL_LEVELS__.identity()));assert.deepEqual(await page.evaluate(()=>window.__FORBIDDEN_STORAGE__),[]);assert.deepEqual(report.errors,[]);
  row.status='passed';row.pointerReplayValidated=true;row.complete=true;row.remainingSeconds=final.puzzle.remainingSeconds;row.realElapsedMilliseconds=Date.now()-startWall;row.effectiveDrags=final.puzzle.moves;row.clearEvents=final.puzzle.cleared;row.timeAndStarsCalibrated=false;
  await page.screenshot({path:path.join(output,`level-${String(id).padStart(3,'0')}-complete.png`)});console.log(`PASS formal Lv${id}: ${row.effectiveDrags} real Pointer drags, clock ${row.openingRemainingSeconds.toFixed(2)} -> ${row.remainingSeconds.toFixed(2)}`);
 }
 report.memoryHost=await page.evaluate(()=>window.__REVISED_FORMAL_LEVELS__.storage());assert.equal(report.memoryHost.loaded.length,EXPECTED_IDS.length);report.forbiddenStorage=await page.evaluate(()=>window.__FORBIDDEN_STORAGE__);assert.deepEqual(report.forbiddenStorage,[]);
 for(const[p,b]of Object.entries(files))bind(p,b.sha256);report.status='passed';report.passed=report.rows.filter(r=>r.status==='passed').length;
}catch(e){report.status='failed';report.error=String(e.stack??e).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');report.inputDrift=Object.entries(files).flatMap(([p,b])=>{try{const current=digest(readFileSync(path.resolve(root,p)));return current===b.sha256?[]:[{path:p,expected:b.sha256,current}];}catch(error){return[{path:p,expected:b.sha256,current:null,error:String(error)}];}});if(report.inputDrift.length)report.failureClassification='concurrent-input-change-not-a-gameplay-conclusion';process.exitCode=1;await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}
finally{report.outputFiles={};for(const f of readdirSync(output))report.outputFiles[f]={sha256:digest(readFileSync(path.join(output,f)))};writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();await server.close();}
console.log(JSON.stringify({output:relative,status:report.status,passed:report.rows.filter(r=>r.status==='passed').length,total:EXPECTED_IDS.length,error:report.error}));
