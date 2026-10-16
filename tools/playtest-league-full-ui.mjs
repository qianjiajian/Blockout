import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
const output=resolve("playtest-results/league-full-ui",String(Date.now()));
await mkdir(output,{recursive:true});
const server=await createServer({configFile:false,root:resolve("."),logLevel:"error",optimizeDeps:{noDiscovery:true,include:[]},server:{host:"127.0.0.1",port:5184,strictPort:true,watch:null,hmr:false}});
await server.listen();
const browser=await chromium.launch({headless:true});
const results=[],errors=[];
try {
  for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
    const tag=`${viewport.width}x${viewport.height}`;
    const context=await browser.newContext({viewport,deviceScaleFactor:1});
    await context.addInitScript(()=>{
      if(!localStorage.getItem("color-escape-save-v1"))localStorage.setItem("color-escape-save-v1",JSON.stringify({schemaVersion:1,currentLevel:6,highestLevel:6,coins:1234,sound:false,haptic:false,reducedMotion:true,rewardedLevels:[1,2,3,4,5]}));
    });
    const page=await context.newPage();
    let failLeagueArt=true;
    await page.route("**/assets/art/ui/league-video-v1/gold.png",async route=>{
      if(failLeagueArt){failLeagueArt=false;await route.fulfill({status:503,body:"fixture: temporary art failure"});}
      else await route.continue();
    });
    page.on("pageerror",e=>errors.push({tag,message:e.message}));
    await page.goto("http://127.0.0.1:5184/",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,{timeout:60000});
    await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.updateToastVisible=false;g.dirty=true;g.scheduleFrame();});
    async function snap(name){await page.screenshot({path:resolve(output,`${tag}-${name}.png`)});}
    async function point(key){
      return page.evaluate(key=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState(),r=d.interactionTargets.targets[key]?.hit,t=d.viewportTransform;if(!r)throw Error(`Missing ${key}`);return {x:t.offsetX+(r.x+r.width/2)*t.scale,y:t.offsetY+(r.y+r.height/2)*t.scale};},key);
    }
    async function click(key){const p=await point(key);const canvas=await page.locator("canvas").boundingBox();await page.mouse.click(canvas.x+p.x,canvas.y+p.y);await page.waitForTimeout(100);}
    await snap("home-entry");
    const cancelled=await point("homeLeague");await page.mouse.move(cancelled.x,cancelled.y);await page.mouse.down();
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.screen),"home");
    await page.mouse.move(5,5);await page.mouse.up();assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.screen),"home");
    await click("homeLeague");assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.screen),"league");
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.leagueArtStore?.error);
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueArtStore.art),undefined);
    await snap("art-failure");await click("league.artRetry");
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.formalPageArt?.screen==="leaderboard",{timeout:30000});
    await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art),{timeout:30000});
    let info=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().league);
    assert.equal(info.rows.length,50);assert.equal(info.state.season.tier,0);await snap("board");
    async function drag(y1,y2){
      const p=await page.evaluate(()=>{const t=window.__COLOR_ESCAPE__.getDebugState().viewportTransform;return t;});
      const b=await page.locator("canvas").boundingBox();
      await page.mouse.move(b.x+p.offsetX+248*p.scale,b.y+p.offsetY+y1*p.scale);await page.mouse.down();
      await page.mouse.move(b.x+p.offsetX+248*p.scale,b.y+p.offsetY+y2*p.scale,{steps:10});await page.mouse.up();await page.waitForTimeout(40);
    }
    for(let i=0;i<12;i++)await drag(900,460);
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueScroll.offset),4270);await snap("last-ranks");
    for(let i=0;i<12;i++)await drag(460,900);
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueScroll.offset),0);
    await click("league.self");await snap("self-position");
    await click("league.challenge");assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueChallengeNotice),true);await snap("challenge-notice");
    const beforeModal=await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueScroll.offset);await drag(900,460);
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueScroll.offset),beforeModal);await click("league.dismiss");
    for(let i=0;i<7;i++)await click("league.tierNext");
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueTier),7);await snap("tier-preview");
    await click("league.info");assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueInfo),true);await snap("rules");
    await click("league.dismiss");
    // Legitimate old state forces a scheduled refresh while the rules modal is open.
    await page.evaluate(async()=>{
      const api=await import("/src/core/league.ts"),g=window.__COLOR_ESCAPE__;
      g.save.league=api.createLeague(Date.now()-120000,123,0);g.persist(g.save);
      g.leagueInfo=true;g.leagueTestOriginalSet=g.host.storageSet.bind(g.host);g.leagueTestOriginalRead=g.host.storageRead.bind(g.host);
      g.host.storageSet=()=>false;g.host.storageRead=()=>({status:"unavailable"});g.scheduleFrame();
    });
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.leaguePersistence==="unknown"&&!window.__COLOR_ESCAPE__.leagueInfo);
    await snap("rules-refresh-unknown");
    await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.host.storageSet=g.leagueTestOriginalSet;g.host.storageRead=g.leagueTestOriginalRead;});
    await click("league.retry");await click("league.back");
    const pending=await page.evaluate(async()=>{
      const api=await import("/src/core/league.ts"),g=window.__COLOR_ESCAPE__,now=Date.now();
      let s=api.createLeague(now-16*86400000,98765,6),a=api.startLeagueAttempt(s,1,s.season.joinedMs);
      for(let i=0;i<50;i++)a=api.collectLeagueSpecial(a,`special${i}`);
      s=api.finishLeagueAttempt(s,a,true,s.season.joinedMs+1000).state;
      g.save.league=api.advanceLeague(s,now);g.persist(g.save);return g.save.league.pending;
    });
    await click("homeLeague");await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art));assert.equal(await page.evaluate(()=>Boolean(window.__COLOR_ESCAPE__.save.league.pending)),true);await snap("settlement");
    await page.evaluate(()=>{
      const g=window.__COLOR_ESCAPE__;g.leagueTestOriginalSet=g.host.storageSet.bind(g.host);g.leagueTestOriginalRead=g.host.storageRead.bind(g.host);
      g.host.storageSet=()=>false;g.host.storageRead=()=>({status:"unavailable"});
    });
    const beforeCoins=await page.evaluate(()=>window.__COLOR_ESCAPE__.save.coins);
    await click("league.claim");
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leaguePersistence),"unknown");
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.coins),beforeCoins);await snap("unknown");
    const targets=await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueTargets().map(([key])=>key));assert.deepEqual(targets,["league.retry"]);
    await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.host.storageSet=g.leagueTestOriginalSet;g.host.storageRead=g.leagueTestOriginalRead;});
    await click("league.retry");assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.coins),beforeCoins+pending.coins);
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.league.pending),undefined);
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.highestLevel),6);await snap("claimed");
    await click("league.back");await click("homeLeague");
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.coins),beforeCoins+pending.coins);
    await page.reload();await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,{timeout:60000});
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.coins),beforeCoins+pending.coins);
    assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.save.league.season.score),0);
    // Explicit fixture near the real clock boundary; no Date/rAF acceleration.
    await page.evaluate(async()=>{
      const api=await import("/src/core/league.ts"),g=window.__COLOR_ESCAPE__,now=Date.now();
      const midnight=api.beijingMidnight(now),anchor=midnight-14*86400000;
      // A normal season has midnight boundaries. Use the real nearest past boundary
      // to verify resume/open expiration without modifying the rule window.
      g.save.league=api.createLeague(anchor-1000,123,0);g.persist(g.save);g.updateToastVisible=false;
    });
    await click("homeLeague");assert.equal(await page.evaluate(()=>Boolean(window.__COLOR_ESCAPE__.save.league.pending)),true);
    results.push({tag,status:"PASS",checks:["release-only entry","drag-out cancellation","generated art 503 / actual Pointer retry","50 rows, vertical Pointer scroll to both boundaries, fixed self bar and self locate","modal scroll blocked","eight tier preview","modal isolation","settlement gate","unknown retry","atomic coin claim","no duplicate claim","reload persistence","expired season open"],pending,coins:beforeCoins+pending.coins});
    await context.close();
    const locked=await browser.newContext({viewport});
    await locked.addInitScript(()=>localStorage.setItem("color-escape-save-v1",JSON.stringify({schemaVersion:1,currentLevel:5,highestLevel:5,rewardedLevels:[1,2,3,4],sound:false,haptic:false})));
    const lp=await locked.newPage();lp.on("pageerror",e=>errors.push({tag,message:e.message}));
    await lp.goto("http://127.0.0.1:5184/");await lp.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,{timeout:60000});
    await lp.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.updateToastVisible=false;g.dirty=true;g.scheduleFrame();});
    const lockedPoint=await lp.evaluate(()=>{const d=window.__COLOR_ESCAPE__.getDebugState(),r=d.interactionTargets.targets.homeLeague.hit,t=d.viewportTransform;return {x:t.offsetX+(r.x+r.width/2)*t.scale,y:t.offsetY+(r.y+r.height/2)*t.scale};});
    const lockedCanvas=await lp.locator("canvas").boundingBox();await lp.mouse.click(lockedCanvas.x+lockedPoint.x,lockedCanvas.y+lockedPoint.y);await lp.waitForTimeout(100);
    assert.equal(await lp.evaluate(()=>window.__COLOR_ESCAPE__.screen),"league");
    assert.equal(await lp.evaluate(()=>window.__COLOR_ESCAPE__.save.league),undefined);
    await lp.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art));
    await lp.screenshot({path:resolve(output,`${tag}-locked.png`)});await locked.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(resolve(output,"report.json"),JSON.stringify({status:"PASS",results,errors,scope:"Real Pointer + natural browser clock; isolated storage; explicit settlement fixtures; no real league gameplay or device test"},null,2));
  console.log(JSON.stringify({output,status:"PASS",screens:results.length}));
} catch(error){
  await writeFile(resolve(output,"report.json"),JSON.stringify({status:"FAIL",results,errors,error:String(error)},null,2));throw error;
} finally {await browser.close();await server.close();}
