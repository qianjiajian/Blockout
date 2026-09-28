import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, process.env.PLAYTEST_OUTPUT ?? `playtest-results/legacy-shutter-reference-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const baseUrl = process.env.PLAYTEST_URL ?? "http://127.0.0.1:5173/";
const files = ["src/game/ColorEscapeGame.ts", "src/game/revisedMechanismArt.ts", "src/game/revisedMechanismPresentation.ts",
  "src/game/revisedMechanismDrawing.ts", "src/game/shutterNineSlice.ts", "src/core/levels.ts", "src/core/PuzzleModel.ts", "tools/playtest-legacy-shutter-reference.mjs"];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file,
  createHash("sha256").update(await readFile(resolve(root, file))).digest("hex")])));
const sourcesBefore = await hashes();
const shutterRoot = "assets/art/gameplay/mechanics/shutter-nine-slice-v1/";
const panel = `${shutterRoot}panel.png`;
const pieces = ["panel", "top-left", "top-right", "bottom-left", "bottom-right", "top", "bottom", "left", "right"];
const corners = { "top-left": [86,78], "top-right": [80,78], "bottom-left": [86,84], "bottom-right": [80,84] };
const strip = "/revised-reference-v1/shutter-strip.png";
const old = "/mechanics/shutter-v1.png";
// Original 24-drag witness from verify-level20-mechanism-parity-difficulty.mjs.
// It is independently replayed against the current official level before Pointer input.
const route = [
  ["cc-020-b1-06", [], "bottom"], ["cc-020-b1-07", [[2,4],[2,3]]],
  ["cc-020-b1-05", [[1,7],[2,7],[3,7]]], ["cc-020-b1-03", [[0,7]]],
  ["cc-020-b1-04", [[2,6],[1,6]]], ["cc-020-b1-05", [[3,6]], "right"],
  ["cc-020-b1-02", [[3,6],[3,7]], "bottom"], ["cc-020-b1-03", [[1,7],[2,7],[3,7]]],
  ["cc-020-b1-04", [[1,7],[0,7]], "bottom"], ["cc-020-b1-01", [[0,6],[0,7]], "bottom"],
  ["cc-020-b1-03", [[2,7],[1,7],[0,7],[0,6],[0,5]], "left"],
  ["cc-020-b2-02", [], "top"], ["cc-020-b2-01", [[2,0],[3,0]]],
  ["cc-020-b2-03", [[1,0]]], ["cc-020-b2-04", [[2,1],[1,1]]],
  ["cc-020-b2-01", [[3,1]]], ["cc-020-b2-03", [[2,0],[3,0]], "top"],
  ["cc-020-b2-04", [[1,0],[2,0],[3,0]]], ["cc-020-b2-05", [[1,1],[1,0]], "top"],
  ["cc-020-b1-07", [[2,2],[2,1],[2,0]], "top"],
  ["cc-020-b2-07", [[1,0],[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[3,5]], "bottom"],
  ["cc-020-b2-01", [[2,1],[1,1],[1,2],[0,2]], "left"],
  ["cc-020-b2-04", [[3,1],[2,1],[1,1],[1,2],[0,2]], "left"],
  ["cc-020-b2-06", [[3,1],[3,0]], "right"],
];
const results = [], errors = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
let page;
const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import { ColorEscapeGame } from '/src/game/ColorEscapeGame.ts';
import { WebHost } from '/src/platform/WebHost.ts';
import { getLevel, LEVELS } from '/src/core/levels.ts';
import { PuzzleModel } from '/src/core/PuzzleModel.ts';
import { ACTIVE_REVISED_MECHANISM_ART_PATHS } from '/src/game/revisedMechanismArt.ts';
import { SHUTTER_NINE_SLICE_PATHS } from '/src/game/shutterNineSlice.ts';
class MemoryHost extends WebHost {
  data = new Map(); imageRequests = [];
  storageRead(k) { return this.data.has(k) ? {status:'ok',value:structuredClone(this.data.get(k))} : {status:'missing'}; }
  storageGet(k,f) { const r=this.storageRead(k); return r.status==='ok'?r.value:f; }
  storageSet(k,v) { this.data.set(k,structuredClone(v)); return true; }
  music() {} sound() {} vibrate() {}
  createImage(p) { this.imageRequests.push(p); return super.createImage(p); }
}
const host = new MemoryHost();
host.data.set('color-escape-save-v1', {schemaVersion:1,currentLevel:20,highestLevel:200,coins:1000,sound:false,haptic:false,reducedMotion:false,
featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','arrow-block','key-lock','lift','star','bomb','flip-door','colored-grid'],
boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},bestStars:{},bestMoves:{},rewardedLevels:[],dailyStreak:0,lastDailyCompletedDay:''});
const game = new ColorEscapeGame(host);
window.__COLOR_ESCAPE__=game; window.__SHUTTER_TEST__={host,frames:[],captures:{},getLevel,PuzzleModel,LEVELS,
  activePaths:ACTIVE_REVISED_MECHANISM_ART_PATHS,shutterPaths:SHUTTER_NINE_SLICE_PATHS};
const test=window.__SHUTTER_TEST__, render=game.render.bind(game), draw=game.ctx.drawImage.bind(game.ctx); let current;
game.render=(...args)=>{current={screen:game.screen,level:game.model.level.id,board:game.boardLayout(),transitions:structuredClone(game.revisedTransitions),shutters:game.model.snapshot().shutters,calls:[]};
try{return render(...args)} finally {if(current.screen==='playing'||current.screen==='paused'){
test.frames.push(current); if(test.frames.length>1800)test.frames.shift();
const t=current.transitions.find(t=>t.kind==='shutter'&&t.age>0.65&&t.age<0.9);
if(t&&!test.captures.mid)test.captures.mid=host.canvas.toDataURL('image/png');}current=undefined;}};
game.ctx.drawImage=(image,...args)=>{const src=image?.currentSrc||image?.src||'';
if(current&&/shutter-nine-slice-v1|shutter-strip|shutter-v1/.test(src))current.calls.push({src,args,alpha:game.ctx.globalAlpha}); return draw(image,...args);};
game.start();
</script>`;
const debug = () => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const ready = () => page.waitForFunction(() => {
  const g=window.__COLOR_ESCAPE__, s=g?.getDebugState();
  return s?.screen==='playing' && s.art.ready && s.art.revisedMechanisms.currentSceneReady
    && !s.art.revisedMechanisms.loading && s.art.formalGameplay.requestedBlockSignature == null
    && !s.art.formalGameplay.missingWholeBlockIds.length && !g.hasActiveMechanicMotion();
}, undefined, { timeout:15000 });
const screenPoint = async (x,y) => page.evaluate(({x,y})=>{
  const s=window.__COLOR_ESCAPE__.getDebugState(),r=document.querySelector('canvas').getBoundingClientRect();
  return {x:r.x+s.viewportTransform.offsetX+x*s.viewportTransform.scale,y:r.y+s.viewportTransform.offsetY+y*s.viewportTransform.scale};
},{x,y});
const click = async key => {
  const s=await debug(), r=s.interactionTargets.targets[key]?.hit;
  assert(r, `Missing real button ${key}`); const p=await screenPoint(r.x+r.width/2,r.y+r.height/2);
  await page.mouse.click(p.x,p.y);
};
const drag = async (entry, expected, wait=100) => {
  const [id,path,exitSide]=entry,s=await debug(),b=s.puzzle.blocks.find(b=>b.id===id);
  assert(b,`Missing visible ${id}`);
  const at=async(x,y)=>screenPoint(s.board.innerX+(x+b.shape[0][0]+0.5)*s.board.cell,s.board.innerY+(y+b.shape[0][1]+0.5)*s.board.cell);
  const start=await at(b.x,b.y); await page.mouse.move(start.x,start.y); await page.mouse.down();
  const picked=await debug();
  assert(picked.selectedId===id || (exitSide && !picked.puzzle.blocks.some(b=>b.id===id)
    && picked.puzzle.cleared===expected.cleared),`Pointer must select ${id} or immediately release its already aligned exit`);
  for(const [x,y] of path){ if(!(await debug()).puzzle.blocks.some(b=>b.id===id))break;
    const p=await at(x,y); await page.mouse.move(p.x,p.y,{steps:4}); }
  if(exitSide && (await debug()).puzzle.blocks.some(b=>b.id===id)){
    const [x,y]=path.at(-1)??[b.x,b.y];
    const delta={left:[-2,0],right:[2,0],top:[0,-2],bottom:[0,2]}[exitSide];
    const p=await at(x+delta[0],y+delta[1]); await page.mouse.move(p.x,p.y,{steps:4});
  }
  await page.mouse.up();
  if(wait)await page.waitForTimeout(wait);
  const after=(await debug()).puzzle;
  assert.equal(after.cleared,expected.cleared,`${id}: clear semantics`);
  assert.equal(after.shutters[0].count,expected.count,`${id}: shutter semantics`);
  if(!exitSide){const remain=after.blocks.find(b=>b.id===id);assert.deepEqual([remain?.x,remain?.y],path.at(-1));}
  return {id,cleared:after.cleared,count:after.shutters[0].count,moves:after.moves};
};
try {
  for(const viewport of [{width:496,height:1078},{width:320,height:568}]){
    const label=`${viewport.width}x${viewport.height}`,context=await browser.newContext({viewport,deviceScaleFactor:1});
    await context.addInitScript(()=>{window.__STORAGE_CALLS__=[];for(const key of ['getItem','setItem','removeItem','clear']){
      const original=Storage.prototype[key];Storage.prototype[key]=function(...args){window.__STORAGE_CALLS__.push({key,args});return original.apply(this,args)};}});
    page=await context.newPage();page.on('pageerror',e=>errors.push(`${label}: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`${label}: ${m.text()}`)});
    await page.route('**/__legacy-shutter-reference-e2e__',r=>r.fulfill({contentType:'text/html',body:html}));
    await page.goto(new URL('__legacy-shutter-reference-e2e__',baseUrl).href,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.getDebugState().art.ready);
    const initial=await page.evaluate(route=>{
      const {getLevel,PuzzleModel}=window.__SHUTTER_TEST__,level=getLevel(20),model=new PuzzleModel(level),expected=[];
      model.start();model.startCountdown();
      for(const [id,path,side] of route){model.beginAction();for(const [x,y]of path)if(!model.moveBlockStep(id,x,y))throw Error('Shadow route move '+id);
      if(side&&!model.tryExit(id,side).ok)throw Error('Shadow route exit '+id);model.commitAction();const s=model.snapshot();expected.push({cleared:s.cleared,count:s.shutters[0].count});}
      if(!model.snapshot().complete)throw Error('Shadow route incomplete');
      window.__COLOR_ESCAPE__.loadLevel(20,true);return {level,expected,campaign:JSON.stringify(window.__SHUTTER_TEST__.LEVELS)};
    },route);
    assert.equal(initial.level.mechanismRules,undefined);assert.equal(initial.level.shutters[0].count,6);
    await ready();
    let s=await debug();assert.equal(s.art.revisedMechanisms.loadedImages,9,'Legacy scene must load exactly the nine shutter pieces');
    const openingAssets=await page.evaluate(()=>({
      requests:window.__SHUTTER_TEST__.host.imageRequests.filter(p=>/revised-reference-v1|shutter-nine-slice-v1/.test(p)),
      expected:window.__SHUTTER_TEST__.shutterPaths,
    }));
    assert.deepEqual([...new Set(openingAssets.requests)].sort(),[...openingAssets.expected].sort());
    await page.screenshot({path:resolve(output,`opening-${label}.png`)});
    const counts=[6],steps=[];
    for(let i=0;i<11;i++){steps.push(await drag(route[i],initial.expected[i],i===10?0:100));counts.push(steps.at(-1).count);}
    assert.deepEqual([...new Set(counts)],[6,5,4,3,2,1,0]);
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.revisedTransitions.some(t=>t.kind==='shutter'&&t.age>0.1&&t.age<0.4),undefined,{polling:'raf',timeout:5000});
    await click('pause');assert.equal((await debug()).screen,'paused');
    const paused=await page.evaluate(()=>structuredClone(window.__COLOR_ESCAPE__.revisedTransitions));
    assert(paused.some(t=>t.kind==='shutter'),'Pause must occur while shutter animates');
    await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>window.__COLOR_ESCAPE__.revisedTransitions),paused,'Pause freezes visual progress');
    await click('pauseResume');await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.revisedTransitions.some(t=>t.kind==='shutter'));
    await page.screenshot({path:resolve(output,`revealed-${label}.png`)});
    const renderEvidence=await page.evaluate(()=>({frames:window.__SHUTTER_TEST__.frames,captures:window.__SHUTTER_TEST__.captures}));
    for(const piece of pieces)assert(renderEvidence.frames.some(f=>f.calls.some(c=>c.src.endsWith(`${shutterRoot}${piece}.png`))),`${piece} must reach real drawImage`);
    assert(!renderEvidence.frames.some(f=>f.calls.some(c=>c.src.endsWith(old)||c.src.endsWith(strip))),'Neither retired ornate frame nor strip may be drawn');
    const midFrames=renderEvidence.frames.filter(f=>f.transitions.some(t=>t.kind==='shutter'&&t.age>0&&t.age<t.duration)&&f.calls.some(c=>c.src.endsWith(panel)));
    assert(midFrames.length>=3,'Opening must render multiple visible intermediate frames');
    assert(new Set(midFrames.map(f=>JSON.stringify(f.calls.map(c=>c.args)))).size>=3,
      'Intermediate frames must change actual Canvas panel position, not just keep a timer while showing a static cover');
    const restingPanel=renderEvidence.frames.flatMap(f=>f.transitions.some(t=>t.kind==='shutter')?[]:f.calls).find(c=>c.src.endsWith(panel));
    assert(restingPanel,'Closed panel must have an actual resting draw');
    const panelCalls=midFrames.map(f=>f.calls.find(c=>c.src.endsWith(panel)));
    for(const call of panelCalls){
      assert.equal(call.args.length,4,'Panel is translated intact, not source-cropped');
      assert.deepEqual([call.args[0],...call.args.slice(2)],[restingPanel.args[0],...restingPanel.args.slice(2)],'Opening keeps panel x/width/height');
    }
    assert(new Set(panelCalls.map(c=>c.args[1])).size>=3,'Panel must move up through distinct y positions');
    assert(panelCalls.some(c=>c.args[1]<restingPanel.args[1]),'Panel moves upwards');
    for(const frame of renderEvidence.frames){
      const cell=frame.board.cell,scale=Math.max(0,cell-Math.max(2,cell*0.035)*2)/180;
      for(const [name,[width,height]]of Object.entries(corners))for(const call of frame.calls.filter(c=>c.src.endsWith(`${shutterRoot}${name}.png`))){
        assert.equal(call.args.length,4,'Complete corner source must be drawn');
        assert(Math.abs(call.args[2]-width*scale)<1e-7&&Math.abs(call.args[3]-height*scale)<1e-7,`${name}: corners keep board-scaled dimensions while opening`);
      }
    }
    assert(renderEvidence.captures.mid,'Natural mid-animation image captured');
    await writeFile(resolve(output,`mid-animation-${label}.png`),Buffer.from(renderEvidence.captures.mid.split(',')[1],'base64'));
    const lastPlaying=renderEvidence.frames.filter(f=>f.screen==='playing').at(-1);
    assert(!lastPlaying.calls.some(c=>c.src.includes(shutterRoot)),'No lingering panel or frame after reveal');
    for(let i=11;i<route.length;i++)steps.push(await drag(route[i],initial.expected[i]));
    assert((await debug()).puzzle.complete,'Actual Pointer route must complete Lv20');
    // Official loadLevel is used for lifecycle reset/next-level resource transition;
    // no model, block, counter, or profile is replaced for either level.
    await page.evaluate(()=>window.__COLOR_ESCAPE__.loadLevel(20,true));await ready();
    assert.equal((await debug()).puzzle.shutters[0].count,6);
    for(let i=0;i<11;i++)await drag(route[i],initial.expected[i],i===10?0:60);
    await click('pause');await click('pauseRestart');await ready();
    await page.waitForTimeout(1200);s=await debug();
    assert.equal(s.puzzle.shutters[0].count,6);assert.equal(s.puzzle.cleared,0);
    assert(!s.revisedMechanismAnimations.some(t=>t.kind==='shutter'),'Restart discards stale visual work');
    await page.screenshot({path:resolve(output,`restart-${label}.png`)});
    await page.evaluate(()=>window.__COLOR_ESCAPE__.loadLevel(21,true));await ready();
    s=await debug();assert.equal(s.puzzle.levelId??await page.evaluate(()=>window.__COLOR_ESCAPE__.model.level.id),21);
    assert.equal(s.art.revisedMechanisms.loadedImages,71,'20 -> 21 must add the remaining 62 mechanism images');
    assert(s.art.revisedMechanisms.ready && s.art.revisedMechanisms.currentSceneReady);
    await page.screenshot({path:resolve(output,`next-level-21-${label}.png`)});
    const final=await page.evaluate(()=>({level20:window.__SHUTTER_TEST__.getLevel(20),level21:window.__COLOR_ESCAPE__.model.level,
      requests:window.__SHUTTER_TEST__.host.imageRequests.filter(p=>/revised-reference-v1|shutter-nine-slice-v1/.test(p)),
      expected:window.__SHUTTER_TEST__.activePaths,storageCalls:window.__STORAGE_CALLS__}));
    assert.deepEqual(final.level20,initial.level,'Official Lv20 data must be unchanged');
    assert.equal(final.level21.mechanismRules,'revised-2026-09-23-v1.4');assert.deepEqual(final.storageCalls,[]);
    assert.deepEqual([...new Set(final.requests)].sort(),[...final.expected].sort());
    assert.equal(final.requests.length,71,'9 -> 71 cache expansion must not request already loaded pieces again');
    assert.equal(final.requests.filter(p=>p.endsWith('shutter-strip.png')).length,0);
    for(const name of pieces)assert.equal(final.requests.filter(p=>p===`${shutterRoot}${name}.png`).length,1);
    results.push({viewport:label,counts,steps,paused,midFrames:midFrames.filter((_,i)=>i%Math.max(1,Math.floor(midFrames.length/12))===0),initialLevel:initial.level,
      campaignSemanticSha256:createHash('sha256').update(initial.campaign).digest('hex'),
      level20RawSha256:createHash('sha256').update(JSON.stringify(initial.level)).digest('hex'),
      requestCount:final.requests.length,resourceCount:s.art.revisedMechanisms.loadedImages,storageCalls:final.storageCalls});
    console.log(`PASS ${label}: official 24 Pointer drags, nine-slice frame/panel, 6->0, natural translation, pause/restart, 9->71 assets`);
    await context.close();page=undefined;
  }
  for(const scenario of ['first-panel-decode-failure','switch-while-panel-loading']){
    const context=await browser.newContext({viewport:{width:496,height:1078}});page=await context.newPage();
    page.on('pageerror',e=>errors.push(`${scenario}: ${e.message}`));
    let panelRequests=0;
    await page.route('**/__legacy-shutter-reference-e2e__',r=>r.fulfill({contentType:'text/html',body:html}));
    await page.route('**/shutter-nine-slice-v1/panel.png',async r=>{
      panelRequests++;
      if(panelRequests===1 && scenario==='first-panel-decode-failure')return r.fulfill({status:200,contentType:'image/png',body:Buffer.from('controlled invalid PNG')});
      if(panelRequests===1)await new Promise(done=>setTimeout(done,220));
      return r.continue();
    });
    await page.goto(new URL('__legacy-shutter-reference-e2e__',baseUrl).href,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.getDebugState().art.ready);
    await page.evaluate(()=>window.__COLOR_ESCAPE__.loadLevel(20,true));
    if(scenario==='first-panel-decode-failure'){
      await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.getDebugState().art.revisedMechanisms.error),undefined,{polling:'raf'});
      const failed=(await debug()).art.revisedMechanisms;
      assert.equal(failed.loadedImages,0);
      await page.screenshot({path:resolve(output,'panel-failure-opaque-fallback.png')});
      await ready();assert(panelRequests>=2,'Failed panel must be retried without changing the level');
      assert.equal((await debug()).puzzle.shutters[0].count,6);
      assert.equal((await debug()).art.revisedMechanisms.loadedImages,9);
      const paths=await page.evaluate(()=>({actual:[...window.__COLOR_ESCAPE__.revisedArt.keys()],expected:window.__SHUTTER_TEST__.shutterPaths}));
      assert.deepEqual(paths.actual.sort(),[...paths.expected].sort(),'Recovered legacy cache must contain the nine original shutter pieces');
      await page.screenshot({path:resolve(output,'panel-recovered.png')});
      results.push({scenario,failed,panelRequests,recovered:(await debug()).art.revisedMechanisms});
    }else{
      await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().art.revisedMechanisms.loading);
      await page.evaluate(()=>window.__COLOR_ESCAPE__.loadLevel(21,true));await ready();
      const loaded=(await debug()).art.revisedMechanisms;
      assert.equal(loaded.loadedImages,71);assert(loaded.ready);
      const paths=await page.evaluate(()=>({actual:[...window.__COLOR_ESCAPE__.revisedArt.keys()],expected:window.__SHUTTER_TEST__.activePaths}));
      assert.deepEqual(paths.actual.sort(),[...paths.expected].sort(),'In-flight legacy completion must merge with the full revised inventory');
      results.push({scenario,panelRequests,loaded});
    }
    const frames=await page.evaluate(()=>window.__SHUTTER_TEST__.frames);
    assert(!frames.some(f=>f.calls.some(c=>c.src.endsWith(old)||c.src.endsWith(strip))),'Failure/race must not draw either retired shutter asset');
    await context.close();page=undefined;
  }
  assert.deepEqual(errors,[]);const sourcesAfter=await hashes();assert.deepEqual(sourcesAfter,sourcesBefore,'Sources drifted during this run');
  await writeFile(resolve(output,'report.json'),JSON.stringify({pass:true,isolatedMemoryHost:true,playerSaveTouched:false,naturalClock:true,
    note:'Official Lv20 data and real Pointer route. Direct loadLevel only selects the formal campaign level for setup/reset/20->21 resource transition; no model/clock mutation.',
    sourcesBefore,sourcesAfter,results,errors},null,2));
  console.log(JSON.stringify({pass:true,output}));
} catch(error){
  await page?.screenshot({path:resolve(output,'failure.png')}).catch(()=>undefined);
  await writeFile(resolve(output,'failure.json'),JSON.stringify({pass:false,error:String(error),stack:error.stack,results,errors,
    state:await page?.evaluate(()=>window.__COLOR_ESCAPE__?.getDebugState()).catch(()=>undefined)},null,2));
  throw error;
} finally {await browser.close();}
