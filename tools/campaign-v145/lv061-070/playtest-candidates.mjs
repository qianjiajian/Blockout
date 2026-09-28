import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {build} from 'esbuild';
import {BASELINE,OUTPUT,auditStructure,ruleGate,VERSION} from './remake61to70-v146.mjs';

import {digest} from '../../revised-preview-validation-v160.mjs';
import {observeFormalModelTiming,replayObservedModelTiming} from '../../revised-model-timing-observer.mjs';

ruleGate();
const files=process.argv.slice(2);assert(files.length,'Provide reviewed candidate JSON files');
const viewport={width:Number(process.env.REMAKE_VIEWPORT_WIDTH??496),height:Number(process.env.REMAKE_VIEWPORT_HEIGHT??1078)};
assert(Number.isInteger(viewport.width)&&viewport.width>=300&&viewport.width<=1200);
assert(Number.isInteger(viewport.height)&&viewport.height>=500&&viewport.height<=2000);
const output=path.resolve(OUTPUT,`pointer-${Date.now()}`);fs.mkdirSync(output,{recursive:true});
const runtime=path.join(output,'runtime'),sourceSnapshot={};
function snapshotTree(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())snapshotTree(p);else{const bytes=fs.readFileSync(p),dest=path.join(runtime,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});sourceSnapshot[p.replaceAll('\\','/')]=digest(bytes);}}}
snapshotTree('src');
const artTool='tools/revised-candidate-block-art.mjs';fs.mkdirSync(path.join(runtime,'tools'));fs.copyFileSync(artTool,path.join(runtime,artTool));sourceSnapshot[artTool]=digest(fs.readFileSync(artTool));
assert.deepEqual(Object.entries(sourceSnapshot).filter(([p,h])=>digest(fs.readFileSync(p))!==h),[],'Source changed while snapshot was copied');
const bundled=await build({stdin:{resolveDir:runtime,contents:`
 export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';
 export {LEVELS} from './src/core/levels.ts';
 export {levelStarTargets} from './src/core/levelStarConditions.ts';
 export {auditRevisedCandidate,measureRevisedMechanismInventory} from './src/core/revisedCandidateAudit.ts';
 export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
 export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';
 export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';
`},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const inputs=Object.keys(bundled.metafile.inputs).filter(p=>p!=='<stdin>'),baseline=JSON.parse(fs.readFileSync(BASELINE));
const candidates=files.map(file=>({file,data:JSON.parse(fs.readFileSync(file))}));
const requestedIds=candidates.map(c=>c.data.level.id);
assert.equal(new Set(requestedIds).size,requestedIds.length,'Duplicate levels do not count as separate validations');
const fullBatch=requestedIds.length===10&&[...requestedIds].sort((a,b)=>a-b).every((id,i)=>id===61+i);
for(const {data}of candidates){auditStructure(data,api);const replay=api.replayRevisedRoute(data.level,data.drags);assert(replay.valid&&replay.complete);}
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
tree(runtime);tree('public/assets/art');
bind('deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json');
for(const p of [...inputs,...files,BASELINE,'docs/rules/manifest.json','docs/mechanism-rules-v1.47.0.md','tools/campaign-v145/lv061-070/candidate-browser.mjs','tools/campaign-v145/lv061-070/candidate.html','tools/campaign-v145/lv061-070/playtest-candidates.mjs'])bind(p);
const report={ruleVersion:ruleGate().activeVersion,designContract:VERSION,status:'running',scope:fullBatch?'complete-ten-level-candidate-batch':'explicit-level-subset',requestedIds,fullBatchValidated:false,viewport,bindings,runtimeSnapshot:path.relative(process.cwd(),runtime).replaceAll('\\','/'),sourceSnapshot,rows:[],errors:[],naturalClock:true,clockFrozen:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
// Both the authoritative replay model and actual Game read the same immutable
// source snapshot. Live work in unrelated level tasks cannot swap that runtime.
const server=await createServer({configFile:false,resolve:{alias:[{find:'/src',replacement:path.join(runtime,'src').replaceAll('\\','/')}]},optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});let page;
const spatial=s=>JSON.parse(JSON.stringify(Object.fromEntries(['blocks','gates','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]]))));
try{
 for(const {file,data}of candidates){
  const {level,drags}=data,id=level.id;
  page=await browser.newPage({viewport});
  page.on('pageerror',e=>report.errors.push({id,message:e.message}));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
  await page.goto(`${origin}/tools/campaign-v145/lv061-070/candidate.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
  const entry=await page.evaluate(({id,level,observe})=>{const e=window.__REMAKE_FORMAL__.load(id,level);const initial=(0,eval)('('+observe+')')();window.__COLOR_ESCAPE__.model.freezeTime=()=>{throw Error('No time booster in verification');};return {...e,initial};},{id,level,observe:observeFormalModelTiming.toString()});
  assert.deepEqual(entry.level,level);assert(entry.candidateInjected&&!entry.formalObjectIdentity);
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
  const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
  await stable();const initial=await state();
  assert.deepEqual(initial.starTargets,baseline.levels[id-1].starTargets);
  assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);
  const row={id,candidate:file,levelSha256:digest(level),routeSha256:digest(drags),candidateInjected:true,formalObjectIdentity:false,oldStarTargetsPreserved:true,status:'running',steps:[],opening:initial.puzzle};report.rows.push(row);
  await page.screenshot({path:path.join(output,`lv${id}-opening.png`)});
  const probeBefore=(await state()).puzzle.remainingSeconds;await page.waitForTimeout(180);const probeAfter=(await state()).puzzle.remainingSeconds;assert(probeAfter<probeBefore);row.naturalClockProbe={before:probeBefore,after:probeAfter};
  for(const [index,drag]of drags.entries()){
   await stable();const s=await state(),before=s.puzzle,b=before.blocks.find(b=>b.id===drag.blockId);assert(b&&!before.failed,`Lv${id} step ${index+1} block/time`);
   const rect=await page.locator('canvas').boundingBox(),[gx,gy]=b.shape[0],t=s.viewportTransform;
   const move=async(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:3});
   await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();
   for(const [x,y]of drag.path)await move(x+gx+.5,y+gy+.5);
   if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
   await page.mouse.up();await stable();const after=(await state()).puzzle;
   const expected=api.replayRevisedRoute(level,drags.slice(0,index+1));assert(expected.valid,expected.error);
   assert.deepEqual(spatial(after),spatial(JSON.parse(expected.finalStateKey)),`Lv${id} actual Pointer step ${index+1}`);
   assert.equal(after.moves,before.moves+1);assert(after.remainingSeconds<=before.remainingSeconds);
   row.steps.push({step:index+1,blockId:drag.blockId,clears:after.cleared-before.cleared,moves:after.moves,remainingSeconds:after.remainingSeconds});
   if(after.shutters.some(c=>c.revealed&&!before.shutters.find(b=>b.id===c.id)?.revealed))await page.screenshot({path:path.join(output,`lv${id}-reveal-${index+1}.png`)});
  }
  const final=(await state()).puzzle;assert(final.complete&&!final.failed&&final.remainingSeconds>0);
  const timing=await page.evaluate(()=>window.__FORMAL_MODEL_TIMING__.read());
  row.naturalTimingReplay=replayObservedModelTiming(level,timing,api);
  fs.writeFileSync(path.join(output,`lv${id}-observed-timing.json`),JSON.stringify(timing));
  assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);
  row.nativeDrawAudit=await page.evaluate(()=>window.__NATIVE_DRAW_AUDIT__);
  assert(row.nativeDrawAudit.calls>0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
  row.final=final;row.nonClearingDrags=row.steps.filter(s=>s.clears===0).length;row.storage=await page.evaluate(()=>window.__REMAKE_FORMAL__.storage());row.status='PASS';
  await page.screenshot({path:path.join(output,`lv${id}-complete.png`)});
  console.log(JSON.stringify({id,status:row.status,drags:final.moves,remainingSeconds:final.remainingSeconds,nonClearingDrags:row.nonClearingDrags}));
  await page.close();page=null;
 }
 assert.deepEqual(report.errors,[]);report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.liveSourceChanges=Object.entries(sourceSnapshot).filter(([p,h])=>digest(fs.readFileSync(p))!==h).map(([p,h])=>({path:p,snapshotSha256:h,currentSha256:digest(fs.readFileSync(p))}));report.status='PASS';report.fullBatchValidated=fullBatch;
}catch(error){report.status='FAIL';report.error=String(error.stack??error);if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}process.exitCode=1;}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
