import assert from "node:assert/strict";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
import {createServer} from "vite";
import {chromium} from "playwright";
const proof=JSON.parse(await readFile("deliverables/league-step4-20261001/test-level-proof.json","utf8"));
const crossPeriod=process.argv.includes("--cross-period");
const output=resolve("playtest-results/league-prototype",String(Date.now()));await mkdir(output,{recursive:true});
const server=await createServer({configFile:false,root:resolve("."),logLevel:"error",optimizeDeps:{noDiscovery:true,include:[]},server:{host:"127.0.0.1",port:5183,strictPort:true,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({headless:true}),rows=[],errors=[];
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const tag=`${viewport.width}x${viewport.height}`,context=await browser.newContext({viewport});
  await context.addInitScript(()=>{if(!localStorage.getItem("color-escape-save-v1"))localStorage.setItem("color-escape-save-v1",JSON.stringify({schemaVersion:1,currentLevel:6,highestLevel:200,coins:1234,sound:false,haptic:false,reducedMotion:false,language:"zh-CN",boosterUnlockSeen:["time","rocket","pulse"],rewardedLevels:[1,2,3,4,5],featureSeen:["basics","ice-door","ice-block","layer","shutter","generator","arrow-block","lift","timed-generator","key-lock","staged-frame","star"],boosters:{time:3,rocket:3,pulse:3},lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}}));});
  const page=await context.newPage();page.on("pageerror",e=>errors.push({tag,message:e.message}));
  await page.goto("http://127.0.0.1:5183/");await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,{timeout:60000});
  await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.updateToastVisible=false;g.dirty=true;g.scheduleFrame();});
  const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
  const baseline=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;return structuredClone(g.save);});
  const snap=name=>page.screenshot({path:resolve(output,`${tag}-${name}.png`)});
  async function click(key){const p=await page.evaluate(key=>{const d=window.__COLOR_ESCAPE__.getDebugState(),r=d.interactionTargets.targets[key]?.hit,t=d.viewportTransform;if(!r)throw Error(`Missing ${key}`);return{x:t.offsetX+(r.x+r.width/2)*t.scale,y:t.offsetY+(r.y+r.height/2)*t.scale};},key),b=await page.locator("canvas").boundingBox();await page.mouse.click(b.x+p.x,b.y+p.y);await page.waitForTimeout(120);}
  const stable=()=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return !g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:30000});
  async function drag(drag){await stable();const s=await state(),b=s.puzzle.blocks.find(b=>b.id===drag.blockId);assert(b);const rect=await page.locator("canvas").boundingBox(),t=s.viewportTransform,[gx,gy]=b.shape[0];const move=(x,y)=>page.mouse.move(rect.x+t.offsetX+(s.board.innerX+x*s.board.cell)*t.scale,rect.y+t.offsetY+(s.board.innerY+y*s.board.cell)*t.scale,{steps:1});await move(b.x+gx+.5,b.y+gy+.5);await page.mouse.down();for(const[x,y]of drag.path)await move(x+gx+.5,y+gy+.5);if(drag.exitSide){const[x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+gx+.5+dx,y+gy+.5+dy);}await page.mouse.up();await stable();return state();}
  await click("homeLeague");await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art));
  await click("league.challenge");const targets=(await state()).interactionTargets.targets;assert(targets["league.start"].hit.y+targets["league.start"].hit.height<=targets["league.dismiss"].hit.y,"small-screen start/return hit regions must not overlap");await snap("start-warning");await click("league.start");await stable();
  assert.equal((await state()).screen,"playing");assert.equal((await state()).puzzle.levelId,900001);
  const actual=await page.evaluate(()=>window.__COLOR_ESCAPE__.model.level);assert.deepEqual(actual,proof.level);assert.equal(createHash("sha256").update(JSON.stringify(actual)).digest("hex"),proof.levelSha256);
  await snap("opening");const initialSeconds=(await state()).puzzle.remainingSeconds;await page.waitForTimeout(700);assert((await state()).puzzle.remainingSeconds<initialSeconds);
  // Actual rocket removal + undo proves booster scoring without committing.
  await click("booster.rocket");
  const target=await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState(),b=d.puzzle.blocks.find(b=>g.leagueRun.specialIds.has(b.id)&&g.model.isBlockActive(b)),t=d.viewportTransform;if(!b)throw Error("No active special");const[x,y]=b.shape[0];return{x:t.offsetX+(d.board.innerX+(b.x+x+.5)*d.board.cell)*t.scale,y:t.offsetY+(d.board.innerY+(b.y+y+.5)*d.board.cell)*t.scale};});
  const canvas=await page.locator("canvas").boundingBox();await page.mouse.click(canvas.x+target.x,canvas.y+target.y);await stable();
  assert.equal((await state()).league.run.points,10);assert.equal((await state()).league.state.season.score,0);
  await click("undo");await stable();assert.equal((await state()).league.run.points,0);
  for(const step of proof.drags){await drag(step);if((await state()).league.run.points>0)break;}
  assert((await state()).league.run.points>0);await snap("temporary-points");
  await click("pause");await click("pauseHome");assert.equal((await state()).screen,"league");assert.equal((await state()).league.state.season.score,0);
  await click("league.challenge");await click("league.start");await stable();
  // Explicit near-timeout fixture; Date and rAF remain natural, no acceleration.
  await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.model.remainingSeconds=.2;g.scheduleFrame();});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==="failed");await snap("failure");await click("failedReplay");await stable();
  if(crossPeriod)await page.evaluate(async()=>{
    const api=await import("/src/core/league.ts"),g=window.__COLOR_ESCAPE__,past=api.createLeague(Date.now()-16*86400000,123,0);
    // Declared offline-resume fixture: genuine old window + valid old attempt,
    // same puzzle, natural current clock, without editing any boundary or Date.
    g.save.league=past;g.leagueRun.attempt=api.startLeagueAttempt(past,1,past.season.joinedMs);g.persist(g.save);
  });
  const steps=[];
  for(let i=0;i<proof.drags.length;i++){
    if(!crossPeriod && i===proof.drags.length-1)await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.leagueTestOriginalSet=g.host.storageSet.bind(g.host);g.leagueTestOriginalRead=g.host.storageRead.bind(g.host);g.host.storageSet=()=>false;g.host.storageRead=()=>({status:"unavailable"});});
    const before=await state(),after=await drag(proof.drags[i]);
    assert.equal(after.puzzle.moves,before.puzzle.moves+1,`step ${i+1}`);assert(!after.puzzle.failed);assert.equal(after.league.state.season.score,0);
    steps.push({step:i+1,block:proof.drags[i].blockId,remainingSeconds:after.puzzle.remainingSeconds,points:after.league.run.points});
  }
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==="leagueResult",{timeout:10000});
  if(!crossPeriod){
    const unresolved=await state();assert.equal(unresolved.league.result.persistence,"unknown");assert.equal(unresolved.league.state.season.score,0);
    assert.deepEqual(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueTargets().map(([k])=>k)),["league.resultRetry"]);
    const completionTime=unresolved.league.run.completedMs;await snap("unknown-save");await page.waitForTimeout(500);
    await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.host.storageSet=g.leagueTestOriginalSet;g.host.storageRead=g.leagueTestOriginalRead;});await click("league.resultRetry");
    assert.equal((await state()).league.run.completedMs,completionTime);
  }
  const expected=crossPeriod?0:90;
  let final=await state();await writeFile(resolve(output,`${tag}-final-debug.json`),JSON.stringify({league:final.league,steps},null,2));assert.equal(final.league.result.persistence,"committed");assert.equal(final.league.result.points,expected);assert.equal(final.league.state.season.score,expected);if(crossPeriod)assert.equal(final.league.result.status,"expired");await snap("success");
  await click("league.resultBack");assert.equal((await state()).screen,"league");
  if(!crossPeriod){await click("league.challenge");assert.deepEqual(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueTargets().map(([k])=>k)),["league.dismiss"]);await click("league.dismiss");}else{assert((await state()).league.state.pending);await snap("expired-settlement");}
  const save=await page.evaluate(()=>structuredClone(window.__COLOR_ESCAPE__.save));
  for(const key of ["currentLevel","highestLevel","coins","rewardedLevels","bestStars","bestMoves","lifeState","boosters","activeRun","dailyTaskProgress"])assert.deepEqual(save[key],baseline[key],`campaign isolation ${key}`);
  await page.reload();await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady);assert.equal((await state()).league.state.season.score,expected);
  rows.push({tag,status:"PASS",steps,earned:expected,crossPeriod,checks:["exact independent data / fresh L16 U20","real Pointer full 41-drag route","9 actual special removals","rocket and undo","failed replay","exit discards collected points","natural countdown","atomic success and no extra coins/life/campaign progress",crossPeriod?"old-window success credited to neither board":"unknown candidate retry keeps success timestamp and duplicate blocked","reload persists"],fixtures:["isolated localStorage","near-timeout remainder .2 seconds",...(crossPeriod?["valid old-window offline-resume challenge"]:[])]});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(output,"report.json"),JSON.stringify({status:"PASS",rows,errors,scope:"Private browser contexts, actual Pointer and natural Date/rAF; near-timeout fixture explicit; no physical device/100 levels/publication"},null,2));console.log(JSON.stringify({status:"PASS",output}));
}catch(e){await writeFile(resolve(output,"report.json"),JSON.stringify({status:"FAIL",rows,errors,error:String(e)},null,2));throw e;}finally{await browser.close();await server.close();}
