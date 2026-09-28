import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {observe as observeFormalModelTiming,replayTiming as replayObservedModelTiming} from '../../campaign-v145/lv141-150/observed-timing-flips.mjs';
import {IDS,clean,omitTarget,validateRepair,replaySpatial,inspectReveal,spatialRevealProof} from './verification.mjs';
const OUTPUT='deliverables/repair78-lift-20260927/pointer';
const [beforeFile,expectedBeforeSha,routeFile,expectedRouteSha,ruleVersion,ruleSha,caseName]=process.argv.slice(2);
assert(process.argv.length===9&&beforeFile&&routeFile&&/^1\.[0-9]+\.0$/.test(ruleVersion??'')&&[expectedBeforeSha,ruleSha,expectedRouteSha].every(s=>/^[a-f0-9]{64}$/.test(s??'')),'Usage: playtest.mjs BEFORE SHA ROUTE SHA RULE_VERSION RULE_SHA CASE(normal|late-no-external)');
assert(['normal','late-no-external'].includes(caseName));
const ruleFile='docs/rules/mechanism-rules-v'+ruleVersion+'.md',lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,ruleVersion);assert.equal(digest(fs.readFileSync(ruleFile)),ruleSha);
assert.equal(digest(fs.readFileSync(beforeFile)),expectedBeforeSha);assert.equal(digest(fs.readFileSync(routeFile)),expectedRouteSha);
const before=JSON.parse(fs.readFileSync(beforeFile)),route=JSON.parse(fs.readFileSync(routeFile));
const viewport={width:Number(process.env.REMAKE_VIEWPORT_WIDTH??496),height:Number(process.env.REMAKE_VIEWPORT_HEIGHT??1078)};assert([[320,568],[496,1078]].some(([w,h])=>viewport.width===w&&viewport.height===h));
const bindings={};
function bind(file){const absolute=path.resolve(file),p=path.relative(process.cwd(),absolute).replaceAll('\\','/');assert(!p.startsWith('../')&&!path.isAbsolute(p));if(Object.hasOwn(bindings,p))return;const bytes=fs.readFileSync(p);bindings[p]=digest(bytes);if(/\.[cm]?[jt]s$/.test(p)){const source=ts.createSourceFile(p,bytes.toString('utf8'),ts.ScriptTarget.Latest,true);for(const node of source.statements){if(!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node))continue;const s=node.moduleSpecifier;if(s&&ts.isStringLiteral(s)&&/^\..*\.[cm]?[jt]s$/.test(s.text))bind(path.resolve(path.dirname(absolute),s.text));}}}
const tree=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p);else bind(p);}};
tree('src');tree('public/assets/art');for(const p of[beforeFile,routeFile,ruleFile,'docs/rules/manifest.json','tools/repair78-lift-20260927/pointer/browser.mjs','tools/repair78-lift-20260927/pointer/index.html','tools/repair78-lift-20260927/pointer/playtest.mjs','tools/repair78-lift-20260927/pointer/prepare.mjs','tools/repair78-lift-20260927/pointer/playtest-header.txt','tools/repair78-lift-20260927/pointer/verification.mjs'])bind(p);
for(const[p,h]of Object.entries(before.bindings)){if(p!=='src/core/levels.ts')assert.equal(digest(fs.readFileSync(p)),h,'Only the approved final LEVELS wiring may change: '+p);bind(p);}
const newSourceFiles=Object.keys(bindings).filter(p=>p.startsWith('src/')&&!Object.hasOwn(before.bindings,p));assert.deepEqual(newSourceFiles,['src/core/level78LateLiftRepair.ts'],'Only the approved Level 78 repair module may be added');
const sourceBindings={};
for(const[p,h]of Object.entries(route.evidenceBindings??{})){assert.equal(digest(fs.readFileSync(p)),h);sourceBindings[p]=h;bind(p);}
const evidence=route.sourceEvidence;assert(evidence&&evidence.file&&evidence.sha256,'Current route requires an immutable source');assert.equal(digest(fs.readFileSync(evidence.file)),evidence.sha256);sourceBindings[evidence.file]=evidence.sha256;bind(evidence.file);
const sourceDoc=JSON.parse(fs.readFileSync(evidence.file)),source=sourceDoc.rows?.find(r=>r.id===78)??sourceDoc;
assert.equal(source.id??source.levelId,78);const routeField=evidence.routeField??'drags';assert(['drags','lateDrags'].includes(routeField));assert.deepEqual(source[routeField],route.drags);assert(source.level||source.levelSha256,'Route source must bind current gameplay');if(source.level)assert.deepEqual(source.level,route.level);if(source.levelSha256)assert.equal(source.levelSha256,digest(route.level));
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts';export {PuzzleModel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64')),levels=clean(api.LEVELS),validation=validateRepair(before,route,levels,api);
const candidates=IDS.map(id=>{const level=levels[id-1],stars=api.levelStarTargets(level),replay=replaySpatial(level,route.drags,api);assert(replay.valid&&replay.complete,JSON.stringify({id,replay}));assert.equal(replay.effectiveDrags,route.drags.length);const prefixStates=route.drags.map((_,i)=>{const r=replaySpatial(level,route.drags.slice(0,i+1),api);assert(r.valid,r.error);return JSON.parse(r.finalStateKey);});const revealProof=spatialRevealProof(level,route.drags,api);if(caseName==='normal')assert(route.drags.length<=stars.moveTarget,'Normal route must reach current three-star drag target');else assert.deepEqual(revealProof.remainingExternalIds,[],'All opening blocks must already be cleared at the first reveal event');return{...route,level,oldStars:stars,stars,prefixStates,revealProof};});
const output=path.resolve(OUTPUT,`pointer-${caseName}-${Date.now()}-${viewport.width}x${viewport.height}-${process.pid}`);fs.mkdirSync(output,{recursive:true});
const report={status:'running',ruleVersion:lock.activeVersion,scope:'Lv78 hidden-lift repair final LEVELS route verification',caseName,requestedIds:IDS,viewport,beforeFile,beforeSha256:expectedBeforeSha,routeFile,routeSha256:expectedRouteSha,ruleFile,ruleSha256:ruleSha,bindings,sourceBindings,validation,rows:[],errors:[],formalDataValidated:true,other199Preserved:true,scoringPreserved:true,naturalClock:true,clockFrozen:false,playerSaveTouched:false,lowerBoundsRecomputed:false,mechanismRecertificationClaimed:false,humanBlindTested:false,releaseApproved:false};
if(process.env.REPAIR78_PREFLIGHT_ONLY==='1'){report.status='PREFLIGHT_PASS';report.pointerValidated=false;report.naturalClockValidated=false;report.preflightRows=candidates.map(({id,drags,stars,level})=>({id,drags:drags.length,stars,levelSha256:digest(level),routeSha256:digest(drags)}));fs.writeFileSync(path.join(output,'preflight.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({output,status:report.status,rows:report.preflightRows}));process.exit(0);}

const snapshotRoot=path.join(output,'source-snapshot');
for(const [p,h]of Object.entries(bindings)){const bytes=fs.readFileSync(p);assert.equal(digest(bytes),h,'Source changed before snapshot: '+p);const dst=path.join(snapshotRoot,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,bytes);}
report.sourceSnapshot=snapshotRoot;
const server=await createServer({root:snapshotRoot,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});let page;
// Bomb deadline values vary with natural ticks; the separate whole-model replay
// compares their exact value after every input, tick and animation callback.
const spatial=s=>{const x=clean(Object.fromEntries(['blocks','gates','flipDoors','coloredGrids','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]])));for(const b of [...x.blocks,...x.queuedBlocks])if(b.timedBombSeconds!==undefined)b.timedBombSeconds='active';return x;};
try{
  for(const data of candidates){
    const {id,level,drags,stars}=data;
    page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push({id,message:e.message}));
    await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
    await page.goto(`${origin}/tools/repair78-lift-20260927/pointer/index.html`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
    const entry=await page.evaluate(({id,observe})=>{
      const e=window.__STAR_TARGETS__.load(id),game=window.__COLOR_ESCAPE__;
      const initial=(0,eval)('('+observe+')')();
      for(const name of ['freezeTime','thawAll'])game.model[name]=()=>{throw Error('No booster in solve verification: '+name);};
      return{...e,initial,storage:window.__STAR_TARGETS__.storage()};
    },{id,observe:observeFormalModelTiming.toString()});
    assert.deepEqual(entry.level,level);assert(entry.formalObjectIdentity&&!entry.candidateOverlay);
    assert.deepEqual(entry.initial,clean(new api.PuzzleModel(level).snapshot()));
    assert.deepEqual(entry.storage.save.bestStars,{},'Every test starts with a fresh star history');assert.deepEqual(entry.storage.save.bestMoves,{},'Every test starts with a fresh move history');
    await page.evaluate(()=>{
      const game=window.__COLOR_ESCAPE__,original=game.drawFormalWholeBlockAt.bind(game);
      window.__NATIVE_DRAW_AUDIT__={calls:0,rotated:0,canvasRotationCalls:0,invalidImageDimensions:0};
      game.drawFormalWholeBlockAt=function(image,match,...args){
        const a=window.__NATIVE_DRAW_AUDIT__;a.calls++;if(!((image.naturalWidth??image.width)>0&&(image.naturalHeight??image.height)>0))a.invalidImageDimensions++;if(match.quarterTurns!==0)a.rotated++;
        const rotate=game.ctx.rotate;game.ctx.rotate=function(angle){if(angle!==0)a.canvasRotationCalls++;return rotate.call(this,angle);};
        try{return original(image,match,...args);}finally{game.ctx.rotate=rotate;}
      };
    });
    const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
    const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
    await stable();await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.getDebugState()?.art?.revisedMechanisms?.currentSceneReady===true,undefined,{timeout:60000});const initial=await state();assert.deepEqual(initial.starTargets,stars);assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);
    const row={id,caseName,spatialRevealProof:data.revealProof,status:'running',levelSha256:digest(level),gameplaySha256:digest(omitTarget(level)),routeSha256:digest(drags),starTargets:stars,formalObjectIdentity:true,candidateOverlay:false,steps:[],opening:initial.puzzle,difficultyReview:{currentRouteNonClearingDrags:data.currentRouteNonClearingDrags,historicalUpperBound:data.oldUpperBound,lowerBoundRecomputed:false,recertified:false,note:data.difficultyNote??"This run verifies scoring and full playability; no new lower-bound or difficulty recertification claim."}};report.rows.push(row);
    row.assetReadiness=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;return{mechanisms:g.getDebugState().art.revisedMechanisms,formal:g.getDebugState().art.formalGameplay,mechanismImages:[...g.revisedArt].map(([path,image])=>({path,width:image.naturalWidth??image.width??0,height:image.naturalHeight??image.height??0}))};});assert.equal(row.assetReadiness.mechanisms.currentSceneReady,true);assert(!row.assetReadiness.mechanisms.error);assert(row.assetReadiness.mechanismImages.every(i=>i.width>0&&i.height>0));assert.equal(row.assetReadiness.formal.loadedWholeBlockCoverage,row.assetReadiness.formal.totalBlocks);await page.screenshot({path:path.join(output,`lv${id}-opening.png`)});
    const probeBefore=(await state()).puzzle.remainingSeconds;await page.waitForTimeout(180);const probeAfter=(await state()).puzzle.remainingSeconds;assert(probeAfter<probeBefore);row.naturalClockProbe={before:probeBefore,after:probeAfter};
    for(const [index,drag]of drags.entries()){
      await stable();const s=await state(),prior=s.puzzle,b=prior.blocks.find(b=>b.id===drag.blockId);assert(b&&!prior.failed,`Lv${id} step ${index+1}`);
      const rect=await page.locator('canvas').boundingBox(),[gx,gy]=b.shape[0],t=s.viewportTransform;
      const move=async(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:1});
      await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();
      for(const [x,y]of drag.path)await move(x+gx+.5,y+gy+.5);
      if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
      await page.mouse.up();await stable();const after=(await state()).puzzle;
      assert.deepEqual(spatial(after),spatial(data.prefixStates[index]),`Lv${id} actual Pointer step ${index+1}`);
      assert.equal(after.moves,prior.moves+1);assert(after.remainingSeconds<=prior.remainingSeconds);
      row.steps.push({step:index+1,blockId:drag.blockId,clears:after.cleared-prior.cleared,moves:after.moves,remainingSeconds:after.remainingSeconds});
      if(after.shutters.some(c=>c.revealed&&!prior.shutters.find(b=>b.id===c.id)?.revealed))await page.screenshot({path:path.join(output,`lv${id}-reveal-${index+1}.png`)});
    }
    const final=(await state()).puzzle;assert(final.complete&&!final.failed&&final.remainingSeconds>0);assert.equal(final.moves,drags.length);
    const timing=await page.evaluate(()=>window.__BATCH_TIMING__.read());row.naturalTimingReplay=replayObservedModelTiming(level,timing,api);row.actualRevealProof=inspectReveal(level,timing.events,timing.initial);assert.deepEqual(row.actualRevealProof.remainingExternalIds,data.revealProof.remainingExternalIds);if(caseName==='late-no-external')assert.deepEqual(row.actualRevealProof.remainingExternalIds,[],'No external clears may assist ice after reveal');
    const timingFile=path.join(output,`lv${id}-observed-timing.json`);fs.writeFileSync(timingFile,JSON.stringify(timing));row.timingLog={file:timingFile,sha256:digest(fs.readFileSync(timingFile))};
    await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.screen==='win'&&g.winArt&&g.winStarConditions&&!g.pendingSettlement;},undefined,{timeout:30000});
    row.settlement=await page.evaluate(()=>{
      const g=window.__COLOR_ESCAPE__,ctx=g.ctx,texts=[],starImages=[],originalText=ctx.fillText,originalImage=ctx.drawImage;
      const ui=g.art.homeUi,images=Object.fromEntries(['starLeft','starCenter','starRight','emptyStarLeft','emptyStarCenter','emptyStarRight'].map(k=>[k,ui?.[k]]));
      ctx.fillText=function(text,...args){texts.push(String(text));return originalText.call(this,text,...args);};
      ctx.drawImage=function(image,...args){for(const[name,actual]of Object.entries(images))if(actual&&actual===image)starImages.push(name);return originalImage.call(this,image,...args);};
      try{g.render();}finally{ctx.fillText=originalText;ctx.drawImage=originalImage;}
      return{screen:g.screen,conditions:structuredClone(g.winStarConditions),earnedStars:g.earnedStars,assistedClear:g.assistedClear,completionMetrics:structuredClone(g.completionMetrics),texts,starImages,storage:window.__STAR_TARGETS__.storage()};
    });
    const result=row.settlement;assert.equal(result.screen,'win');assert.equal(result.earnedStars,api.evaluateLevelStars(level,result.completionMetrics).earnedStars);assert.equal(result.assistedClear,false);
    assert.deepEqual(result.conditions,api.evaluateLevelStars(level,result.completionMetrics));
    assert.equal(result.conditions.moveTarget,stars.moveTarget);assert.equal(result.conditions.timeTargetSeconds,stars.timeTargetSeconds);assert.equal(result.conditions.moveAchieved,drags.length<=stars.moveTarget);assert(result.conditions.timeAchieved);assert.equal(result.conditions.earnedStars,drags.length<=stars.moveTarget?3:2);
    assert(result.texts.includes(`${stars.moveTarget}次拖动内完成`),'The actually drawn move target must preserve the current scoring target');assert(result.texts.includes(`${stars.timeTargetSeconds}秒内完成`),'The actually drawn time target must remain unchanged');
    assert.equal(result.starImages.filter(n=>!n.startsWith('empty')).length,result.earnedStars,'Actually drawn bright stars must match earned stars');assert.equal(result.starImages.length,3);
    assert.equal(result.storage.backend,'MemoryHost');assert.equal(result.storage.save.bestStars[String(id)],result.earnedStars);assert.equal(result.storage.save.bestMoves[String(id)],drags.length);assert.equal(result.storage.save.activeRun,undefined);assert(result.storage.operations.some(o=>o.kind==='write'&&o.key==='color-escape-save-v1'));
    assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);row.nativeDrawAudit=await page.evaluate(()=>window.__NATIVE_DRAW_AUDIT__);assert(row.nativeDrawAudit.calls>0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert.equal(row.nativeDrawAudit.invalidImageDimensions,0);
    row.nativeStorageOperations=0;row.pointerValidated=true;row.naturalClockValidated=true;row.final=final;row.nonClearingDrags=row.steps.filter(s=>s.clears===0).length;row.status='PASS';
    await page.screenshot({path:path.join(output,`lv${id}-settlement.png`)});
    console.log(JSON.stringify({id,caseName,status:row.status,moves:final.moves,earnedStars:result.earnedStars,elapsedSeconds:result.conditions.elapsedSeconds,timeTargetSeconds:stars.timeTargetSeconds,storedBestStars:result.storage.save.bestStars[String(id)]}));
    await page.close();page=null;
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.rows.map(r=>r.id),IDS);
  report.snapshotDrift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(path.join(snapshotRoot,p)))!==h);assert.deepEqual(report.snapshotDrift,[]);
  report.sourceEvidenceDrift=Object.entries(sourceBindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h).map(([p])=>p);assert.deepEqual(report.sourceEvidenceDrift,[]);
  report.currentWorkspaceDrift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h).map(([p,priorSha256])=>({path:p,priorSha256,currentSha256:digest(fs.readFileSync(p))}));
  assert.deepEqual(report.currentWorkspaceDrift,[],'Runtime/art/rule/tool drift requires separate concrete review');
  const freshBuild=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
  const fresh=await import('data:text/javascript;base64,'+Buffer.from(freshBuild.outputFiles[0].text).toString('base64'));
  assert.deepEqual(clean(fresh.LEVELS),levels,'All200 formal objects preserved during Pointer');
  const afterLock=verifyRulesLock();assert(afterLock.ok&&afterLock.activeVersion===lock.activeVersion);report.status='PASS';report.pointerValidated=true;report.naturalClockValidated=true;report.formalRouteValidated=true;
}catch(error){
  report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');
  if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}process.exitCode=1;
}finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
