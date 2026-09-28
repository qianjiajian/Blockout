import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {observeFormalModelTiming,replayObservedModelTiming} from '../revised-model-timing-observer.mjs';

const [file,mode='formal',width='496',height='1078']=process.argv.slice(2);
assert(file&&['formal','candidate'].includes(mode),'Usage: FILE [formal|candidate] [width] [height]');
const lock=verifyRulesLock();assert(lock.ok,JSON.stringify(lock.errors));assert.equal(lock.activeVersion,'1.83.0');
// v1.83 retains the actual 34/86 targets despite hard -> easy.
const scoringSynchronizedToRoute=false;
const data=JSON.parse(fs.readFileSync(file)),level=data.level??data.candidate,drags=data.drags??data.route;
assert.equal(level?.id,15);assert(drags?.length);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
const {api}=await loadApi(),replay=api.replayRevisedRoute(level,drags);
assert(replay.valid&&replay.complete,JSON.stringify(replay));assert(replay.nonClearingDrags>=5&&replay.nonClearingDrags<=10);
if(mode==='formal')assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS[14])),level,'Candidate must exactly equal final production Lv15');
const stars=api.levelStarTargets(level);assert.equal(level.timeSeconds,120);assert.equal(stars.timeTargetSeconds,86);assert.equal(stars.moveTarget,34);
assert.equal(level.parMoves,536);assert.equal(level.preservedMoveTarget,34);assert.equal(level.reward,60);
assert.equal(level.difficulty,'easy');assert.equal(replay.clearEvents,15);
const baseline=JSON.parse(fs.readFileSync('deliverables/lv15-remake-20260927/baseline.json'));assert.deepEqual(level.featureIntro,baseline.level.featureIntro);
const viewport={width:Number(width),height:Number(height)};
assert((viewport.width===320&&viewport.height===568)||(viewport.width===496&&viewport.height===1078));
const output=`deliverables/lv15-remake-20260927/validation-pointer-${mode}-${viewport.width}-${Date.now()}`;
fs.mkdirSync(output,{recursive:true});
const bindings={},bind=p=>bindings[p.replaceAll('\\','/')]=digest(fs.readFileSync(p));
function tree(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p);else bind(p);}}
tree('src');tree('public/assets/art');
const html='tools/lv15-remake-20260927/validation-entry.html';
for(const p of [file,html,'tools/lv15-remake-20260927/validation-browser.mjs','tools/lv15-remake-20260927/validation-pointer.mjs','tools/revised-model-timing-observer.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.83.0.md'])bind(p);

const report={generatedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,mode,status:'running',viewport,candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(drags),bindings,scoringSynchronizedToRoute,naturalClock:true,candidateInjected:mode==='candidate',formalObjectIdentity:mode==='formal',playerSaveTouched:false,humanBlindTested:false,mobileDeviceTested:false,releaseApproved:false,steps:[],errors:[]};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});let page;
const spatial=s=>JSON.parse(JSON.stringify(Object.fromEntries(['blocks','gates','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]]))));
try{
 page=await browser.newPage({viewport});page.on('pageerror',e=>report.errors.push(String(e)));
 await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const method of ['getItem','setItem','removeItem','clear'])Storage.prototype[method]=function(){window.__STORAGE_VIOLATIONS__.push(method);throw Error('Persistent storage forbidden');};for(const method of ['open','deleteDatabase'])indexedDB[method]=function(){window.__STORAGE_VIOLATIONS__.push(method);throw Error('Persistent database forbidden');};});
 await page.goto(`${origin}/${html}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
 report.entry=await page.evaluate(({level,mode,observe})=>{
  const entry=mode==='formal'?window.__LV15_VALIDATION__.load(mode):window.__LV15_VALIDATION__.load(mode,level);
  const initial=(0,eval)('('+observe+')')();
  const game=window.__COLOR_ESCAPE__,draw=game.drawFormalWholeBlockAt.bind(game);
  window.__NATIVE_DRAW_AUDIT__={calls:0,rotated:0,canvasRotationCalls:0,shapes:[]};
  game.drawFormalWholeBlockAt=function(image,match,...args){const a=window.__NATIVE_DRAW_AUDIT__;a.calls++;if(match.quarterTurns!==0)a.rotated++;if(!a.shapes.includes(match.shapeId))a.shapes.push(match.shapeId);const rotate=game.ctx.rotate;game.ctx.rotate=function(angle){if(angle!==0)a.canvasRotationCalls++;return rotate.call(this,angle);};try{return draw(image,match,...args);}finally{game.ctx.rotate=rotate;}};
  game.model.freezeTime=()=>{throw Error('Freeze booster forbidden');};return {...entry,initial};
 },{level,mode,observe:observeFormalModelTiming.toString()});
 // Production retains optional undefined fields. The candidate is JSON; compare
 // both as JSON values while keeping the separate strict object-identity guard.
 assert.deepEqual(JSON.parse(JSON.stringify(report.entry.level)),level);assert.equal(report.entry.candidateInjected,mode==='candidate');assert.equal(report.entry.formalObjectIdentity,mode==='formal');
 const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
 const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.revisedMechanisms.currentSceneReady&&!d.art.revisedMechanisms.loading&&!d.art.revisedMechanisms.error&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.requestedIceSignature==null&&!d.art.formalGameplay.iceError&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
 // The public home entry (not retry/loadLevel(play=true)) schedules first intro.
 const home=await state(),homeButton=home.interactionTargets.targets.homePlay.hit,homeTransform=home.viewportTransform,homeRect=await page.locator('canvas').boundingBox();
 await page.mouse.click(homeRect.x+homeTransform.offsetX+(homeButton.x+homeButton.width/2)*homeTransform.scale,homeRect.y+homeTransform.offsetY+(homeButton.y+homeButton.height/2)*homeTransform.scale);
 // First-shell introduction is genuinely rendered and acknowledged by Pointer.
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='feature'&&window.__LV15_VALIDATION__.intro().iconReady,undefined,{timeout:30000});
 report.introduction=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,texts=[],draw=g.ctx.fillText;g.ctx.fillText=function(t,...a){texts.push(String(t));return draw.call(this,t,...a);};try{g.render();}finally{g.ctx.fillText=draw;}return {screen:g.screen,...window.__LV15_VALIDATION__.intro(),state:g.getDebugState(),texts};});
 assert.equal(report.introduction.scheduled.kind,'layer');assert.equal(report.introduction.seen,false);
 await page.screenshot({path:path.join(output,'introduction.png')});
 const introClock=report.introduction.state.puzzle.remainingSeconds;await page.waitForTimeout(200);assert.equal((await state()).puzzle.remainingSeconds,introClock);
 const button=report.introduction.state.interactionTargets.targets.featurePrimary.hit,t=report.introduction.state.viewportTransform,rect=await page.locator('canvas').boundingBox();
 await page.mouse.click(rect.x+t.offsetX+(button.x+button.width/2)*t.scale,rect.y+t.offsetY+(button.y+button.height/2)*t.scale);
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing'&&window.__LV15_VALIDATION__.intro().seen);
 report.introduction.pointerAcknowledged=true;report.introduction.clockHeldDuringPopup=true;
 await stable();report.opening=await state();assert.deepEqual(report.opening.starTargets,stars);
 await page.screenshot({path:path.join(output,'opening.png')});
 const beforeClock=(await state()).puzzle.remainingSeconds;await page.waitForTimeout(180);const afterClock=(await state()).puzzle.remainingSeconds;
 assert(afterClock<beforeClock);report.naturalClockProbe={beforeClock,afterClock};
 for(const [index,drag]of drags.entries()){
  await stable();const s=await state(),before=s.puzzle,b=before.blocks.find(b=>b.id===drag.blockId);assert(b&&!b.frozen&&!before.failed,`Step ${index+1}: missing block or failed`);
  const rect=await page.locator('canvas').boundingBox(),[gx,gy]=b.shape[0],t=s.viewportTransform;
  const move=async(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:3});
  await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();for(const [x,y]of drag.path)await move(x+gx+.5,y+gy+.5);
  if(drag.exitSide){const [x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
  await page.mouse.up();await stable();const after=(await state()).puzzle;
  const expected=api.replayRevisedRoute(level,drags.slice(0,index+1));assert(expected.valid,expected.error);
  assert.deepEqual(spatial(after),spatial(JSON.parse(expected.finalStateKey)),`Actual Pointer step ${index+1}`);
  assert.equal(after.moves,before.moves+1);assert(after.remainingSeconds<=before.remainingSeconds&&!after.failed);
  report.steps.push({step:index+1,blockId:drag.blockId,blockArea:b.shape.length,clears:after.cleared-before.cleared,event:after.cleared===before.cleared?'reposition':after.blocks.some(x=>x.id===b.id)?'peel':'body-removal',layersBefore:b.layers,layersAfter:after.blocks.find(x=>x.id===b.id)?.layers??null,gateIce:after.gates.map(g=>({id:g.id,ice:g.frozen??0})),moves:after.moves,remainingSeconds:after.remainingSeconds,numericIce:after.blocks.filter(b=>b.frozen).map(b=>({id:b.id,ice:b.frozen}))});
 }
 report.final=(await state()).puzzle;assert(report.final.complete&&!report.final.failed&&report.final.remainingSeconds>0);assert.equal(report.final.moves,drags.length);
 report.finalIdentity=await page.evaluate(()=>window.__LV15_VALIDATION__.verifyIdentity());assert.deepEqual(JSON.parse(JSON.stringify(report.finalIdentity.level)),level);assert.equal(report.finalIdentity.candidateInjected,mode==='candidate');assert.equal(report.finalIdentity.formalObjectIdentity,mode==='formal');assert(report.finalIdentity.other199Unchanged);
 if(mode==='formal')assert(report.finalIdentity.formalDefinitionsUnchanged);
 const timing=await page.evaluate(()=>window.__FORMAL_MODEL_TIMING__.read());fs.writeFileSync(path.join(output,'observed-timing.json'),JSON.stringify(timing));
 report.naturalTimingReplay=replayObservedModelTiming(level,timing,api);
 await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.screen==='win'&&g.winArt&&g.winStarConditions&&!g.pendingSettlement;},undefined,{timeout:30000});
 report.settlement=await page.evaluate(()=>{
  const g=window.__COLOR_ESCAPE__,ctx=g.ctx,texts=[],starImages=[],originalText=ctx.fillText,originalImage=ctx.drawImage;
  const ui=g.art.homeUi,images=Object.fromEntries(['starLeft','starCenter','starRight','emptyStarLeft','emptyStarCenter','emptyStarRight'].map(k=>[k,ui?.[k]]));
  ctx.fillText=function(text,...args){texts.push(String(text));return originalText.call(this,text,...args);};
  ctx.drawImage=function(image,...args){for(const[name,actual]of Object.entries(images))if(actual&&actual===image)starImages.push(name);return originalImage.call(this,image,...args);};
  try{g.render();}finally{ctx.fillText=originalText;ctx.drawImage=originalImage;}
  return{screen:g.screen,conditions:structuredClone(g.winStarConditions),earnedStars:g.earnedStars,assistedClear:g.assistedClear,completionMetrics:structuredClone(g.completionMetrics),texts,starImages,storage:window.__LV15_VALIDATION__.storage()};
 });
 const result=report.settlement,expectedStars=1+Number(drags.length<=stars.moveTarget)+Number(result.conditions.elapsedSeconds<=86);assert.equal(expectedStars,3);assert.equal(result.earnedStars,expectedStars);assert.equal(result.assistedClear,false);
 assert.equal(result.conditions.moveTarget,stars.moveTarget);assert.equal(result.conditions.timeTargetSeconds,86);assert.equal(result.conditions.moveAchieved,drags.length<=stars.moveTarget);assert(result.conditions.timeAchieved);assert.equal(result.conditions.earnedStars,expectedStars);
 assert(result.texts.includes(`${stars.moveTarget}次拖动内完成`));assert(result.texts.includes('86秒内完成'));assert.equal(result.starImages.length,3);assert.equal(result.starImages.filter(s=>!s.startsWith('empty')).length,expectedStars);
 assert.equal(result.storage.backend,'MemoryHost');assert.equal(result.storage.save.bestStars['15'],expectedStars);assert.equal(result.storage.save.bestMoves['15'],drags.length);assert.equal(result.storage.save.activeRun,undefined);
 report.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(report.storageViolations,[]);
 report.nativeDrawAudit=await page.evaluate(()=>window.__NATIVE_DRAW_AUDIT__);assert(report.nativeDrawAudit.calls>0);assert.equal(report.nativeDrawAudit.rotated,0);assert.equal(report.nativeDrawAudit.canvasRotationCalls,0);
 report.nonClearingDrags=report.steps.filter(s=>s.clears===0).length;assert.equal(report.nonClearingDrags,replay.nonClearingDrags);report.multiCellRepositions=report.steps.filter(s=>!s.clears&&s.blockArea>1).length;report.singleCellRepositions=report.steps.filter(s=>!s.clears&&s.blockArea===1).length;report.designMechanismReview='Every body is an original SQ2. Five peels keep the same 2x2 body and advance every frozen gate exactly once. Only non-clearing full-body gestures count as reposition.';
 report.peelEvents=report.steps.filter(s=>s.event==='peel').length;report.bodyRemovals=report.steps.filter(s=>s.event==='body-removal').length;assert.equal(report.peelEvents,5);assert.equal(report.bodyRemovals,10);
 assert.equal(report.singleCellRepositions,0);assert.equal(report.multiCellRepositions,report.nonClearingDrags);
 await page.screenshot({path:path.join(output,'settlement.png')});
 assert.deepEqual(report.errors,[]);report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;if(page){report.lastState=await page.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>null);await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});const timing=await page.evaluate(()=>window.__FORMAL_MODEL_TIMING__?.read()).catch(()=>null);if(timing)fs.writeFileSync(path.join(output,'failed-timing.json'),JSON.stringify(timing));}}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,totalDrags:report.final?.moves,nonClearingDrags:report.nonClearingDrags,remainingSeconds:report.final?.remainingSeconds,error:report.error}));
