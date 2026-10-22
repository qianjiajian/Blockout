import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {ROOT as OUTPUT, PROFILE, IDS, ruleGate, loadApi, replay, audit} from '../common.mjs';
const VERSION=ruleGate().activeVersion;
const checkCandidate=async(data,baseline,api)=>{
 assert(data&&data.level&&Array.isArray(data.drags)&&data.drags.length,'Expected {level,drags}');
 assert(IDS.includes(data.level.id),'Only 231–240 candidates are in scope');
 assert.equal(data.level.mechanismRules,PROFILE);
 if(data.levelSha256)assert.equal(digest(data.level),data.levelSha256,'Candidate level hash mismatch');
 if(data.routeSha256)assert.equal(digest(data.drags),data.routeSha256,'Candidate route hash mismatch');
 return {spatial:audit(data.level,api),route:replay(data.level,data.drags,api,{complete:true,requirePointerCompatible:true}),source:{sourceBindings:{}},sourceValidated:false,lowerBoundCertified:false};
};
const bombSpatialApi=api=>({replayRevisedRoute:(l,d)=>replay(l,d,api)});

import {digest} from '../../revised-preview-validation-v160.mjs';
import {observe as observeFormalModelTiming,replayTiming as replayObservedModelTiming} from '../../remake191-200/observed-timing.mjs';

ruleGate();
const candidateOnly=!process.argv.includes('--formal');
const requiredStars=3;
if(requiredStars!==null)assert([1,2,3].includes(requiredStars));
const args=process.argv.slice(2),smokeOnly=args.includes('--smoke');
if(args.includes('--help')){console.log('Usage: node tools/continue231-240/pointer/run.mjs <qualified.json> [...qualified.json]\nREMAKE_VIEWPORT_WIDTH=320 REMAKE_VIEWPORT_HEIGHT=568 (or 496×1078)\n--smoke checks startup only; no candidate is accepted.');process.exit(0);}
const files=args.filter(arg=>!arg.startsWith('--'));assert(args.every(arg=>!arg.startsWith('--')||['--smoke','--formal'].includes(arg)),'Unknown argument');
assert(smokeOnly?files.length===0:files.length>0,'Provide reviewed candidate JSON files, or --smoke alone');
const viewport={width:Number(process.env.REMAKE_VIEWPORT_WIDTH??496),height:Number(process.env.REMAKE_VIEWPORT_HEIGHT??1078)};
assert(Number.isInteger(viewport.width)&&viewport.width>=300&&viewport.width<=1200);
assert(Number.isInteger(viewport.height)&&viewport.height>=500&&viewport.height<=2000);
const baseline=null,{api,inputs}=await loadApi();
const candidates=files.map(file=>({file,data:JSON.parse(fs.readFileSync(file))}));
const requestedIds=candidates.map(c=>c.data.level.id);
assert.equal(new Set(requestedIds).size,requestedIds.length,'Duplicate levels do not count as separate validations');
const fullBatch=requestedIds.length===10&&[...requestedIds].sort((a,b)=>a-b).every((id,i)=>id===231+i);
const sourceBindings={},sourceFiles=[],preflight=[];
for(const {data}of candidates){const checked=await checkCandidate(data,baseline,api);preflight.push(checked);Object.assign(sourceBindings,checked.source.sourceBindings);if(data.proofQualification)Object.assign(sourceBindings,data.proofQualification.bindings);if(checked.source.sourceFile)sourceFiles.push(checked.source.sourceFile);}
const bindings={};
function bind(file){
 const absolute=path.resolve(file),p=path.relative(process.cwd(),absolute).replaceAll('\\','/');
 assert(!p.startsWith('../')&&!path.isAbsolute(p));if(Object.hasOwn(bindings,p))return;
 bindings[p]=digest(fs.readFileSync(p));
 if(/\.[cm]?[jt]s$/.test(p)){
  const parsed=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true);
  for(const statement of parsed.statements){
   if(!ts.isImportDeclaration(statement)&&!ts.isExportDeclaration(statement))continue;
   const spec=statement.moduleSpecifier;
   if(spec&&ts.isStringLiteral(spec)&&/^\..*\.[cm]?[jt]s$/.test(spec.text))bind(path.resolve(path.dirname(absolute),spec.text));
  }
 }
}
const tree=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p);else bind(p);}};
tree('src');tree('public/assets/art');
for(const p of [...inputs,...files,...sourceFiles,'docs/rules/manifest.json','docs/rules/mechanism-rules-v'+ruleGate().activeVersion+'.md','tools/continue231-240/pointer/browser.mjs','tools/continue231-240/pointer/index.html','tools/continue231-240/pointer/run.mjs'])bind(p);
const output=path.resolve(OUTPUT,`pointer-${Date.now()}-${viewport.width}x${viewport.height}-${process.pid}`);fs.mkdirSync(output,{recursive:true});
const report={candidateOnly,formalDataValidated:false,ruleVersion:VERSION,status:'running',scope:smokeOnly?'startup-smoke-only':fullBatch?'complete-ten-level-candidate-batch':'explicit-level-subset',smokeOnly,requestedIds,fullBatchValidated:false,testCampaignScaffold:true,productionCampaignValidated:false,productionBoundary:200,viewport,bindings,sourceBindings,preflight,rows:[],errors:[],naturalClock:!smokeOnly,clockFrozen:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
// A byte-verified private snapshot prevents parallel data batches from mixing
// revisions within an input run. It is test input, not a release freeze.
const snapshotRoot=path.join(output,'source-snapshot');
for(const [p,h]of Object.entries(bindings)){const bytes=fs.readFileSync(p);assert.equal(digest(bytes),h,`Source changed during snapshot: ${p}`);const dst=path.join(snapshotRoot,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,bytes);}
report.sourceSnapshot=snapshotRoot;
const server=await createServer({root:snapshotRoot,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});let page;
// Spatial comparison ignores the running deadline value only; the full timed
// observer below independently replays every tick and checks bomb values.
const spatial=s=>{const x=JSON.parse(JSON.stringify(Object.fromEntries(['blocks','gates','flipDoors','coloredGrids','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]]))));for(const b of [...x.blocks,...x.queuedBlocks])if(b.timedBombSeconds!==undefined)b.timedBombSeconds='active';return x;};
// Preserve every turn and unit sweep; omit only redundant collinear pointer
// samples. Production sweepContinuousPose checks the segment at 0.08-cell steps.
function turnPoints(start,path){
 const points=[start,...path].filter((p,i,a)=>i===0||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
 for(let i=1;i<points.length;i++)assert.equal(Math.abs(points[i][0]-points[i-1][0])+Math.abs(points[i][1]-points[i-1][1]),1);
 const turns=points.filter((p,i)=>i>0&&(i===points.length-1||p[0]-points[i-1][0]!==points[i+1][0]-p[0]||p[1]-points[i-1][1]!==points[i+1][1]-p[1]));
 const expanded=[start];for(const end of turns){let[x,y]=expanded.at(-1);const dx=Math.sign(end[0]-x),dy=Math.sign(end[1]-y);while(x!==end[0]||y!==end[1]){x+=dx;y+=dy;expanded.push([x,y]);}}
 assert.deepEqual(expanded,points);return turns;
}
try{
 if(smokeOnly){
  page=await browser.newPage({viewport});
  page.on('pageerror',e=>report.errors.push({message:e.message}));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
  await page.goto(`${origin}/tools/continue231-240/pointer/index.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
  report.startup=await page.evaluate(()=>({boundary:window.__REMAKE_FORMAL__.boundary(),backend:window.__REMAKE_FORMAL__.storage().backend,storageViolations:window.__STORAGE_VIOLATIONS__,canvas:!!document.querySelector('canvas'),candidateLoaded:false}));
  assert.equal(report.startup.boundary.memoryLevelCount,200);assert.equal(report.startup.backend,'MemoryHost');assert.deepEqual(report.startup.storageViolations,[]);assert(report.startup.canvas);
  await page.screenshot({path:path.join(output,'startup-only.png')});await page.close();page=null;
 }
 for(const {file,data}of candidates){
  const {level,drags}=data,id=level.id;
  // Precompute test-side reference snapshots before the game's clock starts.
  // Replaying every prefix during live input adds unrelated CPU work to the
  // player's timer, especially for full FIFO inventories on large canvases.
  const expectedStates=drags.map((_,index)=>{const expected=bombSpatialApi(api).replayRevisedRoute(level,drags.slice(0,index+1));assert(expected.valid,expected.error);return spatial(JSON.parse(expected.finalStateKey));});
  page=await browser.newPage({viewport});
  page.on('pageerror',e=>report.errors.push({id,message:e.message}));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
  await page.goto(`${origin}/tools/continue231-240/pointer/index.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
  const entry=await page.evaluate(({id,observe,overlay})=>{const e=window.__REMAKE_FORMAL__.load(id,overlay);const initial=(0,eval)('('+observe+')')();window.__COLOR_ESCAPE__.model.freezeTime=()=>{throw Error('No time booster in verification');};return {...e,initial};},{id,observe:observeFormalModelTiming.toString(),overlay:candidateOnly?level:null});
  assert.deepEqual(entry.level,level);assert(entry.memoryObjectIdentity);assert.equal(entry.formalObjectIdentity,!candidateOnly);assert.equal(entry.candidateOverlay,candidateOnly);
  await page.evaluate(()=>{
   const game=window.__COLOR_ESCAPE__,original=game.drawFormalWholeBlockAt.bind(game);
   window.__NATIVE_DRAW_AUDIT__={calls:0,rotated:0,canvasRotationCalls:0,shapes:[]};
   game.drawFormalWholeBlockAt=function(image,match,...args){
    const a=window.__NATIVE_DRAW_AUDIT__;a.calls++;if(match.quarterTurns!==0)a.rotated++;
    if(!a.shapes.includes(match.shapeId))a.shapes.push(match.shapeId);
    const rotate=game.ctx.rotate;
    game.ctx.rotate=function(angle){if(angle!==0)a.canvasRotationCalls++;return rotate.call(this,angle);};
    try{return original(image,match,...args);}finally{game.ctx.rotate=rotate;}
   };
  });
  const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
  const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.model?.started&&!g.revisedArtLoading&&g.formalBlockArtRequestSignature==null&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!g.exitGhosts.length&&!g.revisedTransitions.length&&!g.generatorSpawnAnimations.length;},undefined,{timeout:20000});
  await stable();const initial=await state();
  assert.deepEqual(initial.starTargets,api.levelStarTargets(level));
  assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);
  const row={id,candidate:file,levelSha256:digest(level),routeSha256:digest(drags),formalObjectIdentity:!candidateOnly,candidateOverlay:candidateOnly,candidateStarTargetsValidated:true,status:'running',steps:[],opening:initial.puzzle};report.rows.push(row);
  row.pointerSampling='all turns and segment endpoints; exact unit-route expansion checked; production continuous collision sweep unchanged';
  await page.evaluate(()=>{window.__TRUSTED_POINTER__={events:0,untrusted:0};for(const name of ['pointerdown','pointermove','pointerup'])document.addEventListener(name,e=>{window.__TRUSTED_POINTER__.events++;if(!e.isTrusted)window.__TRUSTED_POINTER__.untrusted++;},true);});
  await page.screenshot({path:path.join(output,`lv${id}-opening.png`)});
  const probeBefore=(await state()).puzzle.remainingSeconds;await page.waitForTimeout(180);const probeAfter=(await state()).puzzle.remainingSeconds;assert(probeAfter<probeBefore);row.naturalClockProbe={before:probeBefore,after:probeAfter};
  const rect=await page.locator('canvas').boundingBox(),t=initial.viewportTransform;
  let before=await page.evaluate(()=>window.__COLOR_ESCAPE__.model.snapshot());
  for(const [index,drag]of drags.entries()){
   const s=initial,b=before.blocks.find(b=>b.id===drag.blockId);assert(b&&!before.failed,`Lv${id} step ${index+1} block/time`);
   const [gx,gy]=b.shape[0];
   // Real pointer samples follow the same orthogonal sweep, retaining every
   // corner. Runtime collision subdivision handles each straight segment.
   const move=async(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:1});
   await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();
   for(const [x,y]of turnPoints([b.x,b.y],drag.path))await move(x+gx+.5,y+gy+.5);
   if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
   await page.mouse.up();await stable();const after=await page.evaluate(()=>window.__COLOR_ESCAPE__.model.snapshot());
   assert.deepEqual(spatial(after),expectedStates[index],`Lv${id} actual Pointer step ${index+1}`);
   assert.equal(after.moves,before.moves+1);assert(after.remainingSeconds<=before.remainingSeconds);
   row.steps.push({step:index+1,blockId:drag.blockId,clears:after.cleared-before.cleared,moves:after.moves,remainingSeconds:after.remainingSeconds});
   if(after.shutters.some(c=>c.revealed&&!before.shutters.find(b=>b.id===c.id)?.revealed)){
    row.revealedRegions??=[];row.revealedRegions.push({step:index+1,shutters:after.shutters});
    if(process.env.REMAKE_SKIP_REVEAL_SCREENSHOTS!=='1')await page.screenshot({path:path.join(output,`lv${id}-reveal-${index+1}.png`)});
   }
   before=after;
  }
  const final=(await state()).puzzle;assert(final.complete&&!final.failed&&final.remainingSeconds>0);
  const timing=await page.evaluate(()=>window.__BATCH_TIMING__.read());
  row.naturalTimingReplay=replayObservedModelTiming(level,timing,api);
  fs.writeFileSync(path.join(output,`lv${id}-observed-timing.json`),JSON.stringify(timing));
  assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);
  row.nativeDrawAudit=await page.evaluate(()=>window.__NATIVE_DRAW_AUDIT__);
  row.trustedPointer=await page.evaluate(()=>window.__TRUSTED_POINTER__);assert(row.trustedPointer.events>0);assert.equal(row.trustedPointer.untrusted,0);
  assert(row.nativeDrawAudit.calls>0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
  row.final=final;row.nonClearingDrags=row.steps.filter(s=>s.clears===0).length;row.storage=await page.evaluate(()=>window.__REMAKE_FORMAL__.storage());
  row.settlement=(await state()).settlement;
  assert.equal(row.settlement.status,'committed');assert.equal(row.storage.save.bestMoves[String(id)],final.moves);assert.equal(row.storage.save.bestStars[String(id)],row.settlement.earnedStars);
  if(requiredStars!==null){assert.equal(row.settlement.earnedStars,requiredStars,'Actual settlement stars');assert.equal(row.settlement.starConditions.moveTarget,initial.starTargets.moveTarget);assert.equal(row.settlement.starConditions.timeTargetSeconds,initial.starTargets.timeTargetSeconds);}
  row.requiredStars=requiredStars;row.status='PASS';
  // Exercise the real close control if a collection unlock overlays the result.
  // The overlay and final three-star screen are both retained as evidence.
  await page.waitForTimeout(1600);
  let resultState=await state();
  const close=resultState.interactionTargets.collectionIntroLater;
  if(close){
   await page.screenshot({path:path.join(output,`lv${id}-collection-overlay.png`)});
   const rect=await page.locator('canvas').boundingBox(),t=resultState.viewportTransform,r=close.hit;
   await page.mouse.click(rect.x+t.offsetX+(r.x+r.width/2)*t.scale,rect.y+t.offsetY+(r.y+r.height/2)*t.scale);
   await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.collectionIntro);
   row.collectionOverlayClosedByPointer=true;
  }
  await page.waitForTimeout(400);
  await page.screenshot({path:path.join(output,`lv${id}-complete.png`)});
  console.log(JSON.stringify({id,status:row.status,drags:final.moves,remainingSeconds:final.remainingSeconds,nonClearingDrags:row.nonClearingDrags}));
  await page.close();page=null;
 }
 assert.deepEqual(report.errors,[]);
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(path.join(snapshotRoot,p)))!==h);assert.deepEqual(report.drift,[]);
 report.sourceEvidenceDrift=Object.entries(sourceBindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.sourceEvidenceDrift,[]);
 report.currentWorkspaceDrift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h).map(([p,priorSha256])=>({path:p,priorSha256,currentSha256:digest(fs.readFileSync(p))}));
 report.acceptedConcurrentData=[];assert.deepEqual(report.currentWorkspaceDrift,[],'Source/art/candidate/proof changed during Pointer run');
 report.formalDataValidated=!candidateOnly&&!smokeOnly;
 report.status=smokeOnly?'STARTUP_SMOKE_PASS':'PASS';report.fullBatchValidated=!smokeOnly&&fullBatch;
}catch(error){report.status='FAIL';report.error=String(error.stack??error);if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}process.exitCode=1;}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
