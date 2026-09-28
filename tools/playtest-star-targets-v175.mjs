import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {observeFormalModelTiming,replayObservedModelTiming} from './revised-model-timing-observer.mjs';

// Scoring-only verification: no candidate overlay, search, lower-bound
// recertification, clock patch, or runtime/data mutation is performed here.
const IDS=[112,115,118,119];
const TARGETS={112:52,115:56,118:38,119:62};
const OLD_TARGETS={112:36,115:13,118:34,119:45};
const FIXTURE='tests/fixtures/remake111to120-v146.json';
const OUTPUT='deliverables/star-targets-v175-20260927';
const [beforeFile,expectedBeforeSha]=process.argv.slice(2);
assert(beforeFile&&/^[a-f0-9]{64}$/.test(expectedBeforeSha??''),'Usage: node tools/playtest-star-targets-v175.mjs BEFORE_JSON RAW_SHA256');
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert.equal(lock.activeVersion,'1.75.0','Use the explicitly reviewed scoring contract');
const viewport={width:Number(process.env.REMAKE_VIEWPORT_WIDTH??496),height:Number(process.env.REMAKE_VIEWPORT_HEIGHT??1078)};
assert(Number.isInteger(viewport.width)&&viewport.width>=300&&viewport.width<=1200);
assert(Number.isInteger(viewport.height)&&viewport.height>=500&&viewport.height<=2000);
const bindings={};
function bind(file){
  const absolute=path.resolve(file),p=path.relative(process.cwd(),absolute).replaceAll('\\','/');
  assert(!p.startsWith('../')&&!path.isAbsolute(p));
  if(Object.hasOwn(bindings,p))return;
  const bytes=fs.readFileSync(p);bindings[p]=digest(bytes);
  if(/\.[cm]?[jt]s$/.test(p)){
    const source=ts.createSourceFile(p,bytes.toString('utf8'),ts.ScriptTarget.Latest,true);
    for(const node of source.statements){
      if(!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node))continue;
      const spec=node.moduleSpecifier;
      if(spec&&ts.isStringLiteral(spec)&&/^\..*\.[cm]?[jt]s$/.test(spec.text))bind(path.resolve(path.dirname(absolute),spec.text));
    }
  }
}
const tree=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p);else bind(p);}};
tree('src');tree('public/assets/art');
for(const p of [beforeFile,FIXTURE,'docs/rules/manifest.json','docs/rules/mechanism-rules-v1.75.0.md','tools/star-targets-v175-browser.mjs','tools/star-targets-v175.html','tools/playtest-star-targets-v175.mjs'])bind(p);
assert.equal(digest(fs.readFileSync(beforeFile)),expectedBeforeSha,'Before archive must match its independently pinned bytes');
const before=JSON.parse(fs.readFileSync(beforeFile)),fixture=JSON.parse(fs.readFileSync(FIXTURE));
const clean=v=>JSON.parse(JSON.stringify(v));
const omitTarget=l=>{const x=clean(l);delete x.preservedMoveTarget;return x;};
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:`export {LEVELS} from './src/core/levels.ts';export {PuzzleModel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const levels=clean(api.LEVELS);
assert(Array.isArray(before.priorLevels)&&before.priorLevels.length===200,'Archive must contain all 200 priorLevels');
assert(before.fixture?.rows,'Archive must contain the whole prior fixture');
assert.deepEqual(levels.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
const expectedLevels=clean(before.priorLevels),expectedFixture=clean(before.fixture);
for(const id of IDS){
  assert.equal(api.levelStarTargets(before.priorLevels[id-1]).moveTarget,OLD_TARGETS[id]);
  expectedLevels[id-1].preservedMoveTarget=TARGETS[id];
  const oldRow=expectedFixture.rows.find(r=>r.id===id);assert(oldRow);oldRow.level.preservedMoveTarget=TARGETS[id];
}
assert.deepEqual(levels,expectedLevels,'Across all 200 levels, only the four authorized preservedMoveTarget fields may change');
assert.deepEqual(fixture,expectedFixture,'Fixture route, bounds, references and all other fields must remain unchanged');
const candidates=IDS.map(id=>{
  const row=fixture.rows.find(r=>r.id===id),level=levels[id-1],old=before.priorLevels[id-1];
  assert.deepEqual(row.level,level,'Fixture and current final LEVELS must agree');
  assert.deepEqual(omitTarget(level),omitTarget(old),'Scoring change cannot mutate a gameplay map');
  const oldStars=api.levelStarTargets(old),stars=api.levelStarTargets(level);
  assert.equal(stars.moveTarget,TARGETS[id]);assert.equal(stars.timeTargetSeconds,oldStars.timeTargetSeconds);
  const replay=api.replayRevisedRoute(level,row.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));
  assert.equal(replay.effectiveDrags,TARGETS[id]);assert.equal(row.drags.length,TARGETS[id]);
  // Precompute spatial comparisons before the live clock starts.
  const prefixStates=row.drags.map((_,i)=>{const r=api.replayRevisedRoute(level,row.drags.slice(0,i+1));assert(r.valid,r.error);return JSON.parse(r.finalStateKey);});
  return{...row,level,oldStars,stars,prefixStates};
});
const output=path.resolve(OUTPUT,`pointer-${Date.now()}-${viewport.width}x${viewport.height}-${process.pid}`);
fs.mkdirSync(output,{recursive:true});
const report={status:'running',ruleVersion:lock.activeVersion,scope:'four scoring metadata changes in final LEVELS',requestedIds:IDS,viewport,beforeFile,beforeSha256:expectedBeforeSha,fixture:FIXTURE,bindings,rows:[],errors:[],formalDataValidated:true,all200OnlyAuthorizedFieldsChanged:true,oldRoutesPreserved:true,timeTargetsPreserved:true,naturalClock:true,clockFrozen:false,playerSaveTouched:false,lowerBoundsRecomputed:false,mechanismRecertificationClaimed:false,humanBlindTested:false,releaseApproved:false};
const snapshotRoot=path.join(output,'source-snapshot');
for(const [p,h]of Object.entries(bindings)){const bytes=fs.readFileSync(p);assert.equal(digest(bytes),h,'Source changed before snapshot: '+p);const dst=path.join(snapshotRoot,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,bytes);}
report.sourceSnapshot=snapshotRoot;
const server=await createServer({root:snapshotRoot,configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});let page;
const spatial=s=>clean(Object.fromEntries(['blocks','gates','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]])));
try{
  for(const data of candidates){
    const {id,level,drags,stars}=data;
    page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push({id,message:e.message}));
    await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
    await page.goto(`${origin}/tools/star-targets-v175.html`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
    const entry=await page.evaluate(({id,observe})=>{
      const e=window.__STAR_TARGETS__.load(id),game=window.__COLOR_ESCAPE__;
      const initial=(0,eval)('('+observe+')')();
      for(const name of ['freezeTime','thawAll'])game.model[name]=()=>{throw Error('No booster in scoring verification: '+name);};
      return{...e,initial,storage:window.__STAR_TARGETS__.storage()};
    },{id,observe:observeFormalModelTiming.toString()});
    assert.deepEqual(entry.level,level);assert(entry.formalObjectIdentity&&!entry.candidateOverlay);
    assert.deepEqual(entry.initial,clean(new api.PuzzleModel(level).snapshot()));
    assert.equal(entry.storage.save.bestStars[String(id)]??0,0,'A historical three-star save cannot satisfy this run');
    await page.evaluate(()=>{
      const game=window.__COLOR_ESCAPE__,original=game.drawFormalWholeBlockAt.bind(game);
      window.__NATIVE_DRAW_AUDIT__={calls:0,rotated:0,canvasRotationCalls:0};
      game.drawFormalWholeBlockAt=function(image,match,...args){
        const a=window.__NATIVE_DRAW_AUDIT__;a.calls++;if(match.quarterTurns!==0)a.rotated++;
        const rotate=game.ctx.rotate;game.ctx.rotate=function(angle){if(angle!==0)a.canvasRotationCalls++;return rotate.call(this,angle);};
        try{return original(image,match,...args);}finally{game.ctx.rotate=rotate;}
      };
    });
    const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
    const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
    await stable();const initial=await state();assert.deepEqual(initial.starTargets,stars);assert.deepEqual(initial.art.formalGameplay.missingWholeBlockIds,[]);
    const row={id,status:'running',levelSha256:digest(level),gameplaySha256:digest(omitTarget(level)),routeSha256:digest(drags),oldStarTargets:data.oldStars,newStarTargets:stars,formalObjectIdentity:true,candidateOverlay:false,steps:[],opening:initial.puzzle};report.rows.push(row);
    await page.screenshot({path:path.join(output,`lv${id}-opening.png`)});
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
    const final=(await state()).puzzle;assert(final.complete&&!final.failed&&final.remainingSeconds>0);assert.equal(final.moves,TARGETS[id]);
    const timing=await page.evaluate(()=>window.__FORMAL_MODEL_TIMING__.read());row.naturalTimingReplay=replayObservedModelTiming(level,timing,api);
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
    const result=row.settlement;assert.equal(result.screen,'win');assert.equal(result.earnedStars,3);assert.equal(result.assistedClear,false);
    assert.deepEqual(result.conditions,api.evaluateLevelStars(level,result.completionMetrics));
    assert.equal(result.conditions.moveTarget,TARGETS[id]);assert.equal(result.conditions.timeTargetSeconds,stars.timeTargetSeconds);assert(result.conditions.moveAchieved&&result.conditions.timeAchieved);assert.equal(result.conditions.earnedStars,3);
    assert(result.texts.includes(`${TARGETS[id]}次拖动内完成`),'The actually drawn move target must use the new total-drag value');assert(result.texts.includes(`${stars.timeTargetSeconds}秒内完成`),'The actually drawn time target must remain unchanged');
    assert.deepEqual(result.starImages.sort(),['starCenter','starLeft','starRight'],'All three actual result-star sprites must be active');
    assert.equal(result.storage.backend,'MemoryHost');assert.equal(result.storage.save.bestStars[String(id)],3);assert.equal(result.storage.save.bestMoves[String(id)],TARGETS[id]);assert.equal(result.storage.save.activeRun,undefined);assert(result.storage.operations.some(o=>o.kind==='write'&&o.key==='color-escape-save-v1'));
    assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);row.nativeDrawAudit=await page.evaluate(()=>window.__NATIVE_DRAW_AUDIT__);assert(row.nativeDrawAudit.calls>0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
    row.final=final;row.nonClearingDrags=row.steps.filter(s=>s.clears===0).length;row.status='PASS';
    await page.screenshot({path:path.join(output,`lv${id}-three-stars.png`)});
    console.log(JSON.stringify({id,status:row.status,moves:final.moves,earnedStars:result.earnedStars,elapsedSeconds:result.conditions.elapsedSeconds,timeTargetSeconds:stars.timeTargetSeconds,storedBestStars:result.storage.save.bestStars[String(id)]}));
    await page.close();page=null;
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.rows.map(r=>r.id),IDS);
  report.snapshotDrift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(path.join(snapshotRoot,p)))!==h);assert.deepEqual(report.snapshotDrift,[]);
  report.currentWorkspaceDrift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h).map(([p])=>p);assert.deepEqual(report.currentWorkspaceDrift,[],'Current runtime/art/data must still match the exact tested snapshot');
  const afterLock=verifyRulesLock();assert(afterLock.ok&&afterLock.activeVersion==='1.75.0');report.status='PASS';
}catch(error){
  report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');
  if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}process.exitCode=1;
}finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
