import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const output=resolve('playtest-results/league-intro',String(Date.now()));await mkdir(output,{recursive:true});
const server=await createServer({configFile:false,root:resolve('.'),logLevel:'error',optimizeDeps:{noDiscovery:true,include:[]},server:{host:'127.0.0.1',port:5186,strictPort:true,watch:null,hmr:false}});await server.listen();
const browser=await chromium.launch({headless:true}),rows=[],errors=[];
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]){
  const tag=`${viewport.width}x${viewport.height}`,context=await browser.newContext({viewport});
  await context.addInitScript(()=>{if(!localStorage.getItem('color-escape-save-v1'))localStorage.setItem('color-escape-save-v1',JSON.stringify({schemaVersion:1,currentLevel:6,highestLevel:6,coins:1234,sound:false,haptic:false,reducedMotion:true,language:'zh-CN',rewardedLevels:[1,2,3,4,5],featureSeen:['basics'],boosterUnlockSeen:['time']}));});
  const page=await context.newPage();page.on('pageerror',e=>errors.push({tag,message:e.message}));
  let failArt=true;await page.route('**/assets/art/ui/league-video-v1/gold.png',async route=>{if(failArt){failArt=false;await route.fulfill({status:503,body:'Explicit intro art failure fixture'});}else await route.continue();});
  await page.goto('http://127.0.0.1:5186/');await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,{timeout:60000});
  await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.updateToastVisible=false;g.dirty=true;g.scheduleFrame();});
  const state=()=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().league);
  const snapshot=name=>page.screenshot({path:resolve(output,`${tag}-${name}.png`)});
  async function logicalClick(x,y){const t=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().viewportTransform),r=await page.locator('canvas').boundingBox();await page.mouse.click(r.x+t.offsetX+x*t.scale,r.y+t.offsetY+y*t.scale);await page.waitForTimeout(90);}
  async function click(key){const r=await page.evaluate(key=>window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets[key]?.hit,key);assert(r,`Missing ${key}`);await logicalClick(r.x+r.width/2,r.y+r.height/2);}
  await click('homeLeague');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.leagueArtStore?.error);
  assert.equal((await state()).introSeen,false);await snapshot('art-retry');await click('league.artRetry');
  await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art));await page.waitForFunction(()=>window.__COLOR_ESCAPE__.formalPageArt?.screen==='leaderboard');
  assert.equal((await state()).introPage,0);assert.deepEqual(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueTargets().map(([k])=>k)),['league.introContinue']);await snapshot('page-1');
  // Actual underlying list drag and back click must not dismiss or start play.
  const t=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().viewportTransform),r=await page.locator('canvas').boundingBox();
  await page.mouse.move(r.x+t.offsetX+248*t.scale,r.y+t.offsetY+900*t.scale);await page.mouse.down();await page.mouse.move(r.x+t.offsetX+248*t.scale,r.y+t.offsetY+470*t.scale,{steps:10});await page.mouse.up();
  await logicalClick(38,108);assert.equal((await state()).introPage,0);assert.equal((await state()).scrollOffset,0);assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.screen),'league');
  await click('league.introContinue');assert.equal((await state()).introPage,1);assert.equal((await state()).introSeen,false);await snapshot('page-2');
  const before=await page.evaluate(()=>structuredClone(window.__COLOR_ESCAPE__.save));
  await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.introOriginalSet=g.host.storageSet.bind(g.host);g.introOriginalRead=g.host.storageRead.bind(g.host);g.host.storageSet=()=>false;g.host.storageRead=()=>({status:'unavailable'});});
  await click('league.introContinue');assert.equal((await state()).persistence,'unknown');assert.equal((await state()).introSeen,false);assert.deepEqual(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueTargets().map(([k])=>k)),['league.retry']);
  await page.evaluate(()=>window.__COLOR_ESCAPE__.introCandidate=window.__COLOR_ESCAPE__.leagueTransaction.pendingCandidate);await snapshot('unknown-save');await click('league.retry');assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.introCandidate===window.__COLOR_ESCAPE__.leagueTransaction.pendingCandidate),true);
  await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.host.storageSet=g.introOriginalSet;g.host.storageRead=g.introOriginalRead;});await click('league.retry');assert.equal((await state()).introSeen,true);assert.equal((await state()).introPage,undefined);
  const after=await page.evaluate(()=>structuredClone(window.__COLOR_ESCAPE__.save));assert.deepEqual({...after,leagueIntroSeen:false},before);await snapshot('finished-board');
  await click('league.back');await click('homeLeague');await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art));assert.equal((await state()).introPage,undefined);
  await page.reload();await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady);await page.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.updateToastVisible=false;g.dirty=true;g.scheduleFrame();});await click('homeLeague');await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art));assert.equal((await state()).introSeen,true);assert.equal((await state()).introPage,undefined);
  await page.evaluate(async()=>{const api=await import('/src/core/league.ts'),g=window.__COLOR_ESCAPE__,now=Date.now();g.save.league=api.advanceLeague(api.createLeague(now-16*86400000,123,0),now);g.persist(g.save);g.dirty=true;g.scheduleFrame();});
  assert.equal((await state()).introPage,undefined);await click('league.claim');assert.equal((await state()).introSeen,true);assert.equal((await state()).introPage,undefined);
  await click('league.info');assert.equal((await state()).infoOpen,true);await click('league.dismiss');await click('league.challenge');assert.equal((await state()).introPage,undefined);await click('league.start');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing');assert.equal(await page.evaluate(()=>window.__COLOR_ESCAPE__.leagueRun.attempt.level),1);await click('pause');await click('pauseHome');
  await context.close();
  const locked=await browser.newContext({viewport});await locked.addInitScript(()=>localStorage.setItem('color-escape-save-v1',JSON.stringify({schemaVersion:1,currentLevel:5,highestLevel:5,rewardedLevels:[1,2,3,4],sound:false,haptic:false})));
  const lp=await locked.newPage();lp.on('pageerror',e=>errors.push({tag,message:e.message}));await lp.goto('http://127.0.0.1:5186/');await lp.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady);await lp.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.updateToastVisible=false;g.openLeague();});await lp.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.leagueArtStore?.art));
  assert.equal(await lp.evaluate(()=>window.__COLOR_ESCAPE__.leagueIntroPage),undefined);assert.equal(await lp.evaluate(()=>window.__COLOR_ESCAPE__.save.leagueIntroSeen),false);await lp.screenshot({path:resolve(output,`${tag}-locked.png`)});await locked.close();
  rows.push({tag,status:'PASS',checks:['old-save first entry / two pages','art failure does not acknowledge','actual Pointer continue','underlying drag/back blocked','not acknowledged after first page','unknown same-candidate retry / full account preserved','re-entry / reload / new season no repeat','rules still available / real first challenge starts','locked entry unconsumed'],fixtures:['isolated private storage','gold art 503','unavailable save acknowledgment','valid historical-season fixture']});
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',rows,errors,scope:'Two viewports, actual Pointer, natural Date/rAF, private storage; no real player account or physical device'},null,2));console.log(JSON.stringify({status:'PASS',output}));
}catch(e){await writeFile(resolve(output,'report.json'),JSON.stringify({status:'FAIL',rows,errors,error:String(e)},null,2));throw e;}finally{await browser.close();await server.close();}
