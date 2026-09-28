import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {observe,replayTiming} from './observed-timing.mjs';

const files=process.argv.slice(2);assert(files.length);
const lock=verifyRulesLock();assert(lock.ok&&['1.46.0','1.47.0'].includes(lock.activeVersion));
const baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')),{api}=await loadApi();
const output=`deliverables/remake31-200-v145-20260924/batches/lv141-150/pointer-${Date.now()}`;fs.mkdirSync(output,{recursive:true});
const bindings={},bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
const tree=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p);else bind(p);}};
tree('src');tree('public/assets/art');
for(const p of [...files,'docs/rules/manifest.json',`docs/mechanism-rules-v${lock.activeVersion}.md`,'deliverables/remake31-200-v145-20260924/baseline.json',
 'tools/campaign-v145/lv141-150/candidate.html','tools/campaign-v145/lv141-150/candidate-browser.mjs','tools/campaign-v145/lv141-150/observed-timing.mjs','tools/campaign-v145/lv141-150/pointer-compact.mjs'])bind(p);
const report={inputPolicy:'Trusted Playwright mouse; polyline corners, compact read-only inspector responses and fixed viewport coordinates; unchanged formal collision, full animation waits and natural clock',ruleVersion:lock.activeVersion,status:'running',candidateInjection:true,formalObjectIdentity:false,formalAdopted:false,naturalClock:true,clockFrozen:false,playerSaveTouched:false,humanBlindTested:false,bindings,rows:[],errors:[]};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});let page;
try{
 for(const file of files){
  const data=JSON.parse(fs.readFileSync(file)),{level,drags}=data,id=level.id;
  assert(id>=141&&id<=150&&drags.length);assert.deepEqual(geometry(level),baseline.levels[id-1].geometry);assert.deepEqual(api.levelStarTargets(level),baseline.levels[id-1].starTargets);
  page=await browser.newPage({viewport:{width:496,height:1078}});page.on('pageerror',e=>report.errors.push({id,message:e.message}));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
  await page.goto(`${origin}/tools/campaign-v145/lv141-150/candidate.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
  const entry=await page.evaluate(({level,observe})=>{const e=window.__BATCH_CANDIDATE__.load(level);const initial=(0,eval)('('+observe+')')();
   const g=window.__COLOR_ESCAPE__,original=g.drawFormalWholeBlockAt.bind(g);window.__NATIVE_DRAW_AUDIT__={calls:0,rotated:0,canvasRotationCalls:0,shapes:[]};
   g.drawFormalWholeBlockAt=function(image,match,...args){const a=window.__NATIVE_DRAW_AUDIT__;a.calls++;if(match.quarterTurns!==0)a.rotated++;if(!a.shapes.includes(match.shapeId))a.shapes.push(match.shapeId);
    const rotate=g.ctx.rotate;g.ctx.rotate=function(angle){if(angle!==0)a.canvasRotationCalls++;return rotate.call(this,angle);};try{return original(image,match,...args);}finally{g.ctx.rotate=rotate;}};
   return {...e,initial};},{level,observe:observe.toString()});
  assert.deepEqual(entry.level,level);
  const state=()=>page.evaluate(()=>{const d=window.__COLOR_ESCAPE__.getDebugState();return {puzzle:d.puzzle,board:d.board,viewportTransform:d.viewportTransform,starTargets:d.starTargets};});
  const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
  await stable();const initial=await state();assert.deepEqual(initial.starTargets,baseline.levels[id-1].starTargets);
  const rect=await page.locator('canvas').boundingBox();
  const row={id,candidate:file,levelSha256:digest(level),routeSha256:digest(drags),status:'running',steps:[],opening:initial.puzzle};report.rows.push(row);
  await page.screenshot({path:path.join(output,`lv${id}-opening.png`)});
  const beforeClock=(await state()).puzzle.remainingSeconds;await page.waitForTimeout(180);const afterClock=(await state()).puzzle.remainingSeconds;assert(afterClock<beforeClock);row.naturalClockProbe={beforeClock,afterClock};
  for(const [index,drag]of drags.entries()){
   await stable();const s=await state(),before=s.puzzle,b=before.blocks.find(b=>b.id===drag.blockId);assert(b&&!before.failed,`step ${index+1} missing block or failed time`);
   const [gx,gy]=b.shape[0],t=s.viewportTransform;
   const move=async(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:1});
   await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();const full=[[b.x,b.y],...drag.path],waypoints=drag.path.filter((p,i)=>{const prev=full[i],next=drag.path[i+1];return !next||((p[0]-prev[0])*(next[1]-p[1])!==(p[1]-prev[1])*(next[0]-p[0]))||((p[0]-prev[0])*(next[0]-p[0])+(p[1]-prev[1])*(next[1]-p[1])<=0);});
   for(const [x,y]of waypoints)await move(x+gx+.5,y+gy+.5);
   if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
   await page.mouse.up();await stable();const after=(await state()).puzzle;assert.equal(after.moves,before.moves+1,`actual Pointer step ${index+1}`);assert(after.remainingSeconds<=before.remainingSeconds&&!after.failed);
   if((index+1)%10===0)console.log(JSON.stringify({phase:'pointer-progress',id,step:index+1,remainingSeconds:after.remainingSeconds}));
   row.steps.push({step:index+1,blockId:drag.blockId,clears:after.cleared-before.cleared,moves:after.moves,remainingSeconds:after.remainingSeconds});
   if(after.shutters.some(c=>c.revealed&&!before.shutters.find(b=>b.id===c.id)?.revealed))await page.screenshot({path:path.join(output,`lv${id}-reveal-${index+1}.png`)});
  }
  const final=(await state()).puzzle;assert(final.complete&&!final.failed&&final.remainingSeconds>0);
  const timing=await page.evaluate(()=>window.__BATCH_TIMING__.read());fs.writeFileSync(path.join(output,`lv${id}-observed-timing.json`),JSON.stringify(timing));row.naturalTimingReplay=replayTiming(level,timing,api);
  assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);row.nativeDrawAudit=await page.evaluate(()=>window.__NATIVE_DRAW_AUDIT__);assert(row.nativeDrawAudit.calls>0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
  row.final=final;row.nonClearingDrags=row.steps.filter(s=>s.clears===0).length;row.storage=await page.evaluate(()=>window.__BATCH_CANDIDATE__.storage());row.status='PASS';await page.screenshot({path:path.join(output,`lv${id}-complete.png`)});
  console.log(JSON.stringify({id,status:row.status,totalDrags:final.moves,nonClearingDrags:row.nonClearingDrags,remainingSeconds:final.remainingSeconds}));await page.close();page=null;
 }
 assert.deepEqual(report.errors,[]);report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e);process.exitCode=1;if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});const log=await page.evaluate(()=>window.__BATCH_TIMING__?.read()).catch(()=>null);if(log)fs.writeFileSync(path.join(output,'failed-timing.json'),JSON.stringify(log));}}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));


