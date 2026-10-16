import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const output=resolve('playtest-results/league-full',String(Date.now()));await mkdir(output,{recursive:true});
const proofs=await Promise.all(Array.from({length:100},(_,i)=>readFile(`deliverables/league-full-20261001/levels/${String(i+1).padStart(3,'0')}.json`,'utf8').then(JSON.parse)));
const server=await createServer({configFile:false,root:resolve('.'),logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]},server:{host:'127.0.0.1',port:5183,strictPort:true,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({headless:true}),rows=[],errors=[];
async function play(viewport){
 const tag=`${viewport.width}x${viewport.height}`,context=await browser.newContext({viewport});
 await context.addInitScript(()=>{if(!localStorage.getItem('color-escape-save-v1'))localStorage.setItem('color-escape-save-v1',JSON.stringify({schemaVersion:1,currentLevel:6,highestLevel:6,coins:1234,sound:false,haptic:false,reducedMotion:true,language:'zh-CN',rewardedLevels:[1,2,3,4,5],featureSeen:['basics'],boosters:{time:3,rocket:3,pulse:3},lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}}));});
 const page=await context.newPage();page.on('pageerror',e=>errors.push({tag,message:e.message}));
 await page.goto('http://127.0.0.1:5183/');await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,{timeout:60000});
 await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.updateToastVisible=false;g.dirty=true;g.scheduleFrame();});
 const baseline=await page.evaluate(()=>structuredClone(window.__COLOR_ESCAPE__.save));
 const snap=name=>page.screenshot({path:resolve(output,`${tag}-${name}.png`)});
 async function click(key){const p=await page.evaluate(key=>{const d=window.__COLOR_ESCAPE__.getDebugState(),r=d.interactionTargets.targets[key]?.hit,t=d.viewportTransform;if(!r)throw Error(`Missing ${key}`);return{x:t.offsetX+(r.x+r.width/2)*t.scale,y:t.offsetY+(r.y+r.height/2)*t.scale};},key),b=await page.locator('canvas').boundingBox();await page.mouse.click(b.x+p.x,b.y+p.y);await page.waitForTimeout(70);}
 const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return !g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:30000});
 await snap('home-entry');await click('homeLeague');await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art));
 const results=[];let expected=0;
 for(const proof of proofs){
  await click('league.challenge');if(proof.index===1)await snap('start-warning');await click('league.start');await stable();
  const actual=await page.evaluate(()=>window.__COLOR_ESCAPE__.model.level);
  assert.deepEqual(actual,proof.level);assert.equal(createHash('sha256').update(JSON.stringify(actual)).digest('hex'),proof.levelSha256);
  const started=Date.now(),seconds=await page.evaluate(()=>window.__COLOR_ESCAPE__.model.snapshot().remainingSeconds);
  if([1,25,50,75,100].includes(proof.index))await snap(`opening-${proof.index}`);
  for(const drag of proof.drags){
   await stable();const s=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return{puzzle:d.puzzle,board:d.board,viewportTransform:d.viewportTransform};});
   const b=s.puzzle.blocks.find(b=>b.id===drag.blockId);assert(b);
   const rect=await page.locator('canvas').boundingBox(),t=s.viewportTransform,[gx,gy]=b.shape[0];
   const move=(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:1});
   await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();for(const[x,y]of drag.path)await move(x+gx+.5,y+gy+.5);
   if(drag.exitSide){const[x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}
   await page.mouse.up();await stable();
   const after=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;return{moves:g.model.snapshot().moves,failed:g.model.snapshot().failed,score:g.save.league.season.score,screen:g.screen};});
   assert.equal(after.moves,s.puzzle.moves+1,`${tag} level${proof.index} drag`);assert(!after.failed);
   if(after.screen!=='leagueResult')assert.equal(after.score,expected,'No provisional banking');
  }
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='leagueResult');
  const final=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;return{result:g.leagueRunResult,season:g.save.league.season,completedMs:g.leagueRun.completedMs,seconds:g.model.snapshot().remainingSeconds};});
  expected+=proof.specials.length*10;assert.equal(final.result.points,proof.specials.length*10);assert.equal(final.result.persistence,'committed');assert.equal(final.season.score,expected);assert.equal(final.season.cleared.length,proof.index);assert(final.seconds<seconds,'Natural countdown advances');
  const result={index:proof.index,sha256:proof.levelSha256,drags:proof.drags.length,L:16,U:proof.replay.nonClearingDrags,points:final.result.points,naturalMilliseconds:Date.now()-started,remainingSeconds:final.seconds};results.push(result);
  await writeFile(resolve(output,`${tag}-progress.json`),JSON.stringify({status:'RUNNING',results},null,2));
  if([1,25,50,75,100].includes(proof.index))await snap(`reward-${proof.index}`);
  await click('league.resultBack');
  if(proof.index%10===0)console.log(`${tag}: ${proof.index}/100 actual Pointer passes`);
 }
 await click('league.challenge');assert.deepEqual(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueTargets().map(([k])=>k)),['league.dismiss']);await snap('all-complete');await click('league.dismiss');
 const save=await page.evaluate(()=>structuredClone(window.__COLOR_ESCAPE__.save));
 for(const key of ['currentLevel','highestLevel','coins','rewardedLevels','bestStars','bestMoves','lifeState','boosters','activeRun','dailyTaskProgress','featureSeen'])assert.deepEqual(save[key],baseline[key],`Campaign isolation ${key}`);
 await page.reload();await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady);assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.league.season.cleared.length),100);
 await page.evaluate(async()=>{
  const api=await import('/src/core/league.ts'),g=window.__COLOR_ESCAPE__,s=structuredClone(g.save.league),delta=api.LEAGUE_PERIOD_MS;
  // Declared historical-window fixture: shift all stored timestamps together,
  // preserving a valid Beijing window and the 100 successful clear records.
  s.anchorMs-=delta;s.lastNowMs-=delta;for(const key of ['startMs','endMs','joinedMs'])s.season[key]-=delta;
  s.season.scoreHistory.forEach(h=>h.atMs-=delta);g.save.league=api.advanceLeague(api.parseLeague(s),Date.now());g.persist(g.save);g.updateToastVisible=false;
 });
 await click('homeLeague');await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art));await snap('settlement');
 const reward=await page.evaluate(()=>window.__COLOR_ESCAPE__.save.league.pending.coins);await click('league.claim');
 assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.coins),baseline.coins+reward);
 assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.league.season.cleared.length),0);
 await click('league.challenge');await click('league.start');await stable();assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueRun.attempt.level),1);
 await click('pause');await click('pauseHome');await click('league.back');await click('homeLeague');assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.coins),baseline.coins+reward);
 rows.push({tag,status:'PASS',results,earned:expected,reward,checks:['100 real Pointer / natural clock routes','exact final independent objects','all specials counted once','next uncleared / all-complete / reload','no campaign, life, coins, daily or teaching mutation','season coin claim then reset and first level playable','no duplicate reward'],fixtures:['private localStorage','user reduced-motion setting','historical window shifted after 100 actual clears']});await context.close();
}
try{
 const settled=await Promise.allSettled([{width:320,height:568},{width:496,height:1078}].map(play));
 for(const result of settled)if(result.status==='rejected')throw result.reason;
 assert.deepEqual(errors,[]);await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',rows,errors,scope:'All 100 maps x two viewports, actual Pointer, natural Date/rAF; no physical device or blind human test'},null,2));console.log(JSON.stringify({status:'PASS',output}));
}catch(e){await writeFile(resolve(output,'report.json'),JSON.stringify({status:'FAIL',rows,errors,error:String(e)},null,2));throw e;}finally{await browser.close();await server.close();}
