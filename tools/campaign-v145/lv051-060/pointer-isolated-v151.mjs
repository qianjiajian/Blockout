import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
const BASELINE='deliverables/remake31-200-v145-20260924/baseline.json';
const OUTPUT='deliverables/remake31-200-v145-20260924/batches/lv051-060';
const lock=verifyRulesLock();assert(lock.ok);assert(lock.ok);assert.equal(lock.activeVersion,'1.51.0');const VERSION=lock.activeVersion;

import {digest} from '../../revised-preview-validation-v160.mjs';
import {observeFormalModelTiming,replayObservedModelTiming} from '../../revised-model-timing-observer.mjs';


const files=process.argv.slice(2);assert(files.length,'Provide reviewed candidate JSON files');
const viewport={width:Number(process.env.REMAKE_VIEWPORT_WIDTH??496),height:Number(process.env.REMAKE_VIEWPORT_HEIGHT??1078)};
assert(Number.isInteger(viewport.width)&&viewport.width>=300&&viewport.width<=1200);
assert(Number.isInteger(viewport.height)&&viewport.height>=500&&viewport.height<=2000);
const repo=process.cwd(),output=path.resolve(OUTPUT,`pointer-isolated-${Date.now()}`),runtime=path.join(output,'runtime');fs.mkdirSync(runtime,{recursive:true});
const capture={};
const captureTree=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())captureTree(f);else capture[f.replaceAll('\\','/')]=digest(fs.readFileSync(f));}};
captureTree('src');captureTree('public');
for(const dir of ['src','public','tools'])fs.cpSync(dir,path.join(runtime,dir),{recursive:true});
for(const [f,h]of Object.entries(capture)){assert.equal(digest(fs.readFileSync(f)),h,'Origin changed during capture: '+f);assert.equal(digest(fs.readFileSync(path.join(runtime,f))),h,'Snapshot mismatch: '+f);}
const baseline=JSON.parse(fs.readFileSync(BASELINE));let loaded;
try{process.chdir(runtime);loaded=await loadApi();}finally{process.chdir(repo);}
const {api,inputs}=loaded;
const candidates=files.map(file=>({file,data:JSON.parse(fs.readFileSync(file))}));
const requestedIds=candidates.map(c=>c.data.level.id);
assert.equal(new Set(requestedIds).size,requestedIds.length,'Duplicate levels do not count as separate validations');
const fullBatch=requestedIds.length===10&&[...requestedIds].sort((a,b)=>a-b).every((id,i)=>id===51+i);
for(const {data}of candidates){const l=data.level,b=baseline.levels[l.id-1];assert(l.id>=51&&l.id<=60);assert.deepEqual(geometry(l),b.geometry);for(const k of ['id','name','timeSeconds','reward','mechanismRules'])assert.deepEqual(l[k],b.level[k]);assert.deepEqual(api.levelStarTargets(l),b.starTargets);assert(auditSpatial(l,api).passed);const r=api.replayRevisedRoute(l,data.drags);assert(r.valid&&r.complete);}
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
tree(path.join(runtime,'src'));tree(path.join(runtime,'public/assets/art'));
bind('deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json');
// esbuild's persistent service reports metafile paths relative to its launch
// directory, while the art helper contributes a runtime-relative source path.
// Resolve both forms and require every compiled input to belong to the snapshot.
const snapshotInputs=inputs.map(f=>{
 const fromRepo=path.resolve(repo,f),fromRuntime=path.resolve(runtime,f);
 const inside=p=>{const r=path.relative(runtime,p);return r!==''&&!r.startsWith('..')&&!path.isAbsolute(r);};
 const resolved=inside(fromRepo)&&fs.existsSync(fromRepo)?fromRepo:fromRuntime;
 assert(inside(resolved)&&fs.existsSync(resolved),'Compiled input outside snapshot: '+f);return resolved;
});
for(const f of [...snapshotInputs,...files,BASELINE,'docs/rules/manifest.json','docs/mechanism-rules-v1.51.0.md',path.join(runtime,'tools/campaign-v145/lv051-060/candidate-browser.mjs'),path.join(runtime,'tools/campaign-v145/lv051-060/candidate.html'),'tools/campaign-v145/lv051-060/pointer-isolated-v147.mjs'])bind(f);

const report={ruleVersion:VERSION,status:'running',scope:fullBatch?'complete-ten-level-candidate-batch':'explicit-level-subset',requestedIds,candidateInjected:true,formalAdopted:false,fullBatchValidated:false,viewport,isolatedRuntime:path.relative(repo,runtime),sourceCapture:capture,bindings,rows:[],errors:[],naturalClock:true,clockFrozen:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
// The game and independent model both load this exact immutable captured runtime.
// Other tasks may continue changing unrelated production levels; this is explicitly candidate evidence.
const server=await createServer({root:runtime,publicDir:path.join(runtime,'public'),cacheDir:path.join(runtime,'.vite'),configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});let page;
const spatial=s=>JSON.parse(JSON.stringify(Object.fromEntries(['blocks','gates','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]]))));
try{
 for(const {file,data}of candidates){
  const {level,drags}=data,id=level.id;
  page=await browser.newPage({viewport});
  page.on('pageerror',e=>report.errors.push({id,message:e.message}));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
  await page.goto(`${origin}/tools/campaign-v145/lv051-060/candidate.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
  const entry=await page.evaluate(({level,observe})=>{const e=window.__REMAKE_FORMAL__.load(level);const initial=(0,eval)('('+observe+')')();window.__COLOR_ESCAPE__.model.freezeTime=()=>{throw Error('No time booster in verification');};return {...e,initial};},{level,observe:observeFormalModelTiming.toString()});
  assert.deepEqual(entry.level,level);assert(entry.candidateObjectIdentity);
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
  const row={id,candidate:file,levelSha256:digest(level),routeSha256:digest(drags),candidateObjectIdentity:true,candidateInjected:true,formalAdopted:false,oldStarTargetsPreserved:true,status:'running',steps:[],opening:initial.puzzle};report.rows.push(row);
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
 assert.deepEqual(report.errors,[]);report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';report.fullBatchValidated=fullBatch;
}catch(error){report.status='FAIL';report.error=String(error.stack??error);if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}process.exitCode=1;}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
