import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Reuse the established source fixture without executing the old runner or
// modifying its evidence. Only completion metrics are injected; navigation,
// animations, resource loading and account transactions remain production code.
const helperPath='tools/playtest-formal-ui-resources.mjs';
const helper=await readFile(helperPath,'utf8');
const start=helper.indexOf('function seed('),end=helper.indexOf('const economy =',start);
assert(start>=0&&end>start,'Known MemoryHost fixture boundaries');
const {seed,fixture}=new Function(helper.slice(start,end)+'; return {seed,fixture};')();
const output=resolve(process.env.HOME_RANK_OUTPUT??'playtest-results/home-rank-position-20261014/acceptance-01');
const rankPrefix='/assets/art/ui/formal-pages/supplied-popups-v1/rank/';
const sha=data=>createHash('sha256').update(data).digest('hex');
async function sources(){
  const files=['tools/playtest-home-rank-position-20261014.mjs',helperPath,'docs/rules/manifest.json'];
  async function visit(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await visit(p);else files.push(p);}}
  await visit('src');return Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await readFile(file))])));
}
function html(level){
  const value=seed(level===11?'scene':'settlement-rank');
  const observer=`
audit.rankFrames=[];
let rankPositionDraws=[];
const rankPositionDraw=ctx.drawImage.bind(ctx);
ctx.drawImage=function(image,...args){
 const ui=game.art.homeUi;
 const kind=image===game.mainlineRankArt?.panel?'rank':image===ui?.resourcePanel?'resource':image===ui?.dailyTaskEntry?'dailyTask':undefined;
 if(kind){
  const dest=args.length===2?[args[0],args[1],image.naturalWidth||image.width,image.naturalHeight||image.height]:args.length===4?args:args.slice(4);
  const [x,y,w,h]=dest,t=this.getTransform(),box=host.canvas.getBoundingClientRect();
  const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:t.a*px+t.c*py+t.e,y:t.b*px+t.d*py+t.f}));
  const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));
  rankPositionDraws.push({kind,src:new URL(image.currentSrc||image.src,location.href).pathname,args,transform:{a:t.a,b:t.b,c:t.c,d:t.d,e:t.e,f:t.f},
   css:{x:box.x+left*box.width/host.canvas.width,y:box.y+top*box.height/host.canvas.height,width:(right-left)*box.width/host.canvas.width,height:(bottom-top)*box.height/host.canvas.height}});
 }
 return rankPositionDraw(image,...args);
};
const observedRender=game.render.bind(game);
game.render=function(...args){rankPositionDraws=[];const result=observedRender(...args),rank=game.mainlineRankChange;
 const draws=audit.frame.draws.filter(d=>d.src.includes('/supplied-popups-v1/rank/'));
 if(rank||draws.length||audit.injections.length)audit.rankFrames.push({at:performance.now(),screen:game.screen,
  rank:rank?{...rank}:null,draws,positionDraws:rankPositionDraws,coinFlight:Boolean(game.homeCoinFlight)||Boolean(game.homeCoinFlights?.length),journey:game.journeyPresentation?.phase??null,
  collection:Boolean(game.collectionIntro),feature:Boolean(game.featureUnlockGuide),navigation:Boolean(game.navigationTransition),
  lifeRefill:Boolean(game.lifeRefillOpen),visible:game.appVisible});return result;};
game.start();`;
  const content=fixture(value);assert.equal(content.split('game.start();').length,2);
  return content.replace('game.start();',observer);
}
const snapshot=page=>page.evaluate(()=>window.__FORMAL_UI__.snapshot());
const economy=save=>structuredClone({coins:save.coins,boosters:save.boosters,stars:save.bestStars,rewarded:save.rewardedLevels,
  inspiration:save.collectionProgress.inspiration,restored:save.collectionProgress.restoredMasterpieceIds});
async function target(page,key){
  await page.waitForFunction(key=>{const d=window.__COLOR_ESCAPE__?.getDebugState();return Boolean(d&&(d.interactionTargets.targets??d.interactionTargets)[key]?.hit);},key,{timeout:15000});
  const {state}=await snapshot(page),r=(state.interactionTargets.targets??state.interactionTargets)[key].hit;
  const box=await page.locator('canvas').boundingBox(),t=state.viewportTransform;
  return {x:box.x+t.offsetX+(r.x+r.width/2)*t.scale,y:box.y+t.offsetY+(r.y+r.height/2)*t.scale};
}
async function down(page,key){const p=await target(page,key);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForTimeout(90);}
async function click(page,key){await down(page,key);await page.mouse.up();}
async function shot(page,row,name){const file=resolve(output,`${row.name}-${name}.png`);await page.screenshot({path:file});
 const s=await snapshot(page);row.screenshots.push({file,sha256:sha(await readFile(file)),screen:s.state.screen,
  rank:s.state.settlement.rankChange,draws:s.audit.frame.draws.filter(d=>d.src.startsWith(rankPrefix)),texts:s.audit.frame.texts});return s;}
async function settleAndReturn(page,row){
  await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady&&g.screen==='home'
    &&!g.featureUnlockGuide&&!g.journeyPresentation&&!g.collectionIntro;},undefined,{timeout:60000});
  await click(page,'homePlay');
  await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='playing'&&!g.revisedArtLoading
    &&!g.boosterUnlockGuide&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();},undefined,{timeout:30000});
  const initial=await snapshot(page);
  await page.evaluate(()=>window.__FORMAL_UI__.complete());
  await page.waitForFunction(()=>{const s=window.__COLOR_ESCAPE__.getDebugState();return s.screen==='win'&&s.art.win.ready;},undefined,{timeout:20000});
  const settled=await snapshot(page);assert.equal(settled.saved.coins,initial.saved.coins+40);
  assert.equal(settled.state.settlement.rankChange?.age,0);assert(settled.state.settlement.rankChange.beforeRank>settled.state.settlement.rankChange.afterRank);
  const waitStarted=Date.now();await page.waitForTimeout(2700);const held=await shot(page,row,'win-held');
  assert(Date.now()-waitStarted>=2600);assert.equal(held.state.screen,'win');assert.equal(held.state.settlement.rankChange?.age,0,'Win consumed queued rank animation');
  assert(!held.audit.history.some(src=>src.startsWith(rankPrefix)),'Rank art was drawn before returning Home');
  assert(held.audit.rankFrames.filter(f=>f.screen==='win').every(f=>f.rank?.age===0&&f.draws.length===0));
  await down(page,row.action);assert.equal((await snapshot(page)).state.screen,'win','Return triggered before release');
  await page.mouse.up();await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='home',undefined,{timeout:15000});
  await shot(page,row,'home-return');
  if(row.level===11){
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().journey.sceneReveal?.ready,undefined,{timeout:20000});
    const scene=await shot(page,row,'scene-before-rank');
    assert.equal(scene.state.settlement.rankChange?.age,0,'Scene modal consumed queued rank animation');
    assert(scene.state.journey.presentation);assert(scene.audit.rankFrames.every(f=>!f.draws.length),'Rank appeared before scene confirmation');
    await page.waitForTimeout(600);assert.equal((await snapshot(page)).state.settlement.rankChange?.age,0);
    await down(page,'journeySceneConfirm');assert((await snapshot(page)).state.journey.presentation);await page.mouse.up();
    await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.getDebugState().journey.presentation,undefined,{timeout:15000});
    row.sceneAcknowledged=true;
  }
  await page.waitForFunction(()=>{const a=window.__FORMAL_UI__.audit,r=window.__COLOR_ESCAPE__.mainlineRankChange;
    return r?.age>=.6&&r.age<1.65&&a.frame.draws.some(d=>d.src.includes('/supplied-popups-v1/rank/'));},undefined,{timeout:20000});
  const visible=await shot(page,row,'home-rank');assert.equal(visible.state.screen,'home');
  assert.deepEqual(economy(visible.saved),economy(settled.saved),'Moving the banner changed rewards');
  const positionFrame=visible.audit.rankFrames.findLast(f=>f.positionDraws.some(d=>d.kind==='rank'));
  const rankDraw=positionFrame.positionDraws.find(d=>d.kind==='rank'),protectedDraws=positionFrame.positionDraws.filter(d=>d.kind!=='rank');
  assert.equal(protectedDraws.filter(d=>d.kind==='resource').length,2,'Both top resource panels must actually draw');
  assert.equal(protectedDraws.filter(d=>d.kind==='dailyTask').length,1,'Right daily task entry must actually draw');
  const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  for(const d of protectedDraws)assert(!overlaps(rankDraw.css,d.css),'Rank overlaps '+d.kind);
  assert(rankDraw.css.y>Math.max(...protectedDraws.filter(d=>d.kind==='resource').map(d=>d.css.y+d.css.height)),'Rank must be below resources');
  const box=await page.locator('canvas').boundingBox(),vt=visible.state.viewportTransform,targets=visible.state.interactionTargets.targets??visible.state.interactionTargets;
  const protectedTargets=['homeSupply','homeLife','homeMissions'].map(key=>{const r=targets[key]?.hit;assert(r,'Missing target '+key);return {key,css:{x:box.x+vt.offsetX+r.x*vt.scale,y:box.y+vt.offsetY+r.y*vt.scale,width:r.width*vt.scale,height:r.height*vt.scale}};});
  for(const d of protectedTargets)assert(!overlaps(rankDraw.css,d.css),'Rank overlaps target '+d.key);
  assert(rankDraw.css.x>=0&&rankDraw.css.y>=0&&rankDraw.css.x+rankDraw.css.width<=row.viewport.width&&rankDraw.css.y+rankDraw.css.height<=row.viewport.height);
  for(const f of visible.audit.rankFrames.filter(f=>f.positionDraws.some(d=>d.kind==='rank'))){const r=f.positionDraws.find(d=>d.kind==='rank');for(const d of f.positionDraws.filter(d=>d.kind!=='rank'))assert(!overlaps(r.css,d.css),'Animated rank overlaps '+d.kind);}
  row.position={actualRankPanel:rankDraw,protectedDraws,protectedTargets,overlaps:false,fullyWithinViewport:true};
  const frames=visible.audit.rankFrames.filter(f=>f.draws.length);
  assert(frames.length>0);assert(frames.every(f=>f.screen==='home'&&!f.coinFlight&&!f.journey&&!f.collection&&!f.feature&&!f.navigation&&f.visible),
    'Banner was drawn before Home was ready or while another presentation owned the screen');
  const coinFlightWaitObserved=visible.audit.rankFrames.some(f=>f.screen==='home'&&f.coinFlight&&f.rank?.age===0);
  if(row.action==='modalPrimary')assert(coinFlightWaitObserved,'Did not observe queue waiting for Home coin flight');
  row.queued={winWaitMs:Date.now()-waitStarted,beforeRank:visible.state.settlement.rankChange.beforeRank,afterRank:visible.state.settlement.rankChange.afterRank,
    coinFlightWaitObserved};
  if(row.pauseOnTab){
    await click(page,'navigation.1');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='leaderboard'&&!window.__COLOR_ESCAPE__.navigationTransition);
    const paused=await snapshot(page),age=paused.state.settlement.rankChange?.age;assert(age>0&&age<2.3,'Tab navigation lost pending animation');
    await page.waitForTimeout(900);const heldAway=await shot(page,row,'leaderboard-paused');
    assert.equal(heldAway.state.settlement.rankChange?.age,age,'Hidden Home banner advanced on another tab');
    assert(!heldAway.audit.frame.draws.some(d=>d.src.startsWith(rankPrefix)),'Banner drawn on leaderboard');
    await click(page,'navigation.2');await page.waitForFunction(age=>window.__COLOR_ESCAPE__.screen==='home'&&window.__COLOR_ESCAPE__.mainlineRankChange?.age>age+.12,age);
    await shot(page,row,'home-resumed');row.tabPause={pausedAge:age,heldMilliseconds:900,inputUnlocked:true};
  }
  await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.mainlineRankChange,undefined,{timeout:10000});
  await page.waitForTimeout(180);const finished=await shot(page,row,'home-finished');
  assert(!finished.audit.frame.draws.some(d=>d.src.startsWith(rankPrefix)),'Finished rank banner remained visible');
  assert.deepEqual(economy(finished.saved),economy(settled.saved),'Banner completion granted another reward');
  const firstDraw=finished.audit.rankFrames.find(f=>f.draws.length),lastDraw=finished.audit.rankFrames.findLast(f=>f.draws.length);
  assert(firstDraw.rank.age<.2,'Animation entry was skipped');assert(lastDraw.rank.age>=2,'Animation did not play its exit');
  row.account={before:economy(initial.saved),settled:economy(settled.saved),finished:economy(finished.saved)};
  row.finishedNaturally=true;return finished;
}

await mkdir(output,{recursive:true});
const report={status:'RUNNING',scope:'Chromium on current Web source, real Pointer, natural RAF, synthetic MemoryHost only; metrics injected solely to enter real settlement, not a puzzle solution or native-device claim.',
 sources:await sources(),cases:[],errors:[],assets:{}};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:405,height:882},{width:320,height:568}])for(const mode of ['continue']){
  const row={name:`${viewport.width}-${mode}`,viewport,level:mode==='scene'?11:7,action:mode==='close'?'modalSecondary':'modalPrimary',
    pauseOnTab:false,status:'RUNNING',screenshots:[]};report.cases.push(row);
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.route('**/*',route=>{const u=route.request().url();if(u===origin+'/__home_rank_fixture__')return route.fulfill({contentType:'text/html',body:html(row.level)});
    return u.startsWith(origin+'/')||u.startsWith('data:')?route.continue():route.abort();});
  try{
    await page.goto(origin+'/__home_rank_fixture__',{waitUntil:'domcontentloaded'});const final=await settleAndReturn(page,row);
    assert.deepEqual(final.storageViolations,[]);assert.deepEqual(errors,[]);assert(!final.audit.images.some(i=>i.error));
    const drawnFrames=final.audit.rankFrames.filter(f=>f.draws.length);
    assert(drawnFrames.every(f=>f.screen==='home'&&!f.coinFlight&&!f.journey&&!f.collection&&!f.feature&&!f.navigation&&f.visible));
    row.audit=final.audit;row.storageViolations=final.storageViolations;
    for(const src of final.audit.history.filter(src=>src.startsWith('/assets/'))){const file='public'+src,digest=sha(await readFile(file));
      assert(!report.assets[file]||report.assets[file]===digest);report.assets[file]=digest;}
    row.status='PASS';console.log(`PASS ${row.name}`);
  }catch(error){row.status='FAIL';row.error=String(error.stack??error);row.snapshot=await snapshot(page).catch(()=>undefined);
    await page.screenshot({path:resolve(output,`${row.name}-failure.png`)}).catch(()=>{});report.errors.push({case:row.name,error:row.error});console.error(`FAIL ${row.name}: ${error}`);
  }finally{row.browserErrors=errors;await context.close();}
 }
 report.sourceAfter=await sources();assert.deepEqual(report.sourceAfter,report.sources,'Inputs changed during acceptance');
 for(const [file,digest]of Object.entries(report.assets))assert.equal(sha(await readFile(file)),digest,`Image changed: ${file}`);
 report.inputsUnchanged=true;
}catch(error){report.errors.push({case:'harness',error:String(error.stack??error)});}
finally{await browser.close();await server.close();report.status=report.errors.length?'FAIL':'PASS';await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 if(report.errors.length)process.exitCode=1;console.log(JSON.stringify({status:report.status,output}));}
