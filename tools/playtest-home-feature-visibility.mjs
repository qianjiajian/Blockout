import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Six small home-only scenarios. MemoryHost never accesses a player's storage.
const output=resolve(`playtest-results/home-feature-visibility-20261008-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const sourceFiles=['src/game/ColorEscapeGame.ts','src/game/artManifest.ts','src/core/featureUnlocks.ts','src/game/homeArtLayout.ts','tools/playtest-home-feature-visibility.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,sha(await readFile(p))])));
const report={status:'RUNNING',scope:'Synthetic in-memory progress 6/16/21, completed 5/15/20. Actual Home rendering and Pointer input at 320×568 and 496×1078. No player storage.',sources:await hashes(),cases:[],errors:[]};
function fixture(progress){
  const seed={schemaVersion:1,currentLevel:progress,highestLevel:progress,coins:1000,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
    featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],
    boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:2,rocket:2,pulse:2},bestStars:{},bestMoves:{},rewardedLevels:Array.from({length:progress-1},(_,i)=>i+1),
    featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
    collectionIntroPending:false,collectionIntroShown:true,leagueIntroSeen:true,selectedJourneyEpisode:1,
    journeyProgress:{claimedMilestoneLevels:[5,10,15,20],seenEpisodeUnlockLevels:[11,21]},
    lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0}};
  return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';import {HOME_ART_LAYOUT} from '/src/game/homeArtLayout.ts';
const key='color-escape-save-v1',audit={phase:'startup',writes:[],draws:[],texts:[]},initial=${JSON.stringify(seed)},seen=new Set();
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){audit.writes.push({phase:audit.phase,key:k,value:structuredClone(v)});this.data.set(k,structuredClone(v));return true;}
 music(){}sound(){}vibrate(){}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),draw=host.context.drawImage,fill=host.context.fillText;
host.context.drawImage=function(img,...args){const pair=Object.entries(game.art?.homeUi??{}).find(([k,v])=>v===img),key=pair?.[0];if(key){const id=JSON.stringify([audit.phase,key,this.globalAlpha]);if(!seen.has(id)){seen.add(id);audit.draws.push({phase:audit.phase,key,alpha:this.globalAlpha,filter:this.filter,source:img.src??null});}}return draw.call(this,img,...args);};
host.context.fillText=function(text,...args){const id=audit.phase+'|'+String(text);if(!seen.has(id)){seen.add(id);audit.texts.push({phase:audit.phase,text:String(text)});}return fill.call(this,text,...args);};
window.__COLOR_ESCAPE__=game;window.__HOME_VIS__={game,host,audit,layout:HOME_ART_LAYOUT};game.start();
</script>`;
}
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const read=page=>page.evaluate(()=>({debug:window.__COLOR_ESCAPE__.getDebugState(),save:structuredClone(window.__COLOR_ESCAPE__.save),writes:window.__HOME_VIS__.audit.writes.length}));
async function click(page,p){const s=(await read(page)).debug,box=await page.locator('canvas').boundingBox(),t=s.viewportTransform;await page.mouse.click(box.x+t.offsetX+p.x*t.scale,box.y+t.offsetY+p.y*t.scale,{delay:35});}
async function phase(page,value){await page.evaluate(v=>{const {game,audit}=window.__HOME_VIS__;audit.phase=v;game.dirty=true;game.scheduleFrame();},value);}
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}])for(const progress of [6,16,21]){
  const row={name:`${viewport.width}x${viewport.height}-progress${progress}`,viewport,progress,status:'RUNNING',hiddenClicks:[],lockedClicks:[]};report.cases.push(row);
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(`${row.name}: ${e.message}`));page.on('console',e=>{if(e.type()==='error')report.errors.push(`${row.name}: ${e.text()}`);});
  await page.route('**/__home_visibility__',route=>route.fulfill({contentType:'text/html',body:fixture(progress)}));
  await page.goto(`${origin}/__home_visibility__`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.getDebugState().art.ready&&g.screen==='home'&&g.art.homeUi?.shopIconLocked&&g.art.homeUi?.leaderboardIconLocked&&g.art.homeUi?.journeyIconLocked&&!g.journeyPresentation&&!g.collectionIntro&&!g.featureGuide;},null,{timeout:30000});
  await phase(page,'home');
  const locked=progress===6;
  const expectedNav=locked?['shopIconLocked','leaderboardIconLocked','journeyIconLocked']:['shopIcon','leaderboardIcon','journeyIcon'];
  await page.waitForFunction(keys=>keys.every(key=>window.__HOME_VIS__.audit.draws.some(d=>d.phase==='home'&&d.key===key)),expectedNav);
  const baseline=await read(page),targets=baseline.debug.interactionTargets.targets;
  assert.equal(Boolean(targets.homeDailyChallenge),progress>=16);assert.equal(Boolean(targets.homeLeague),progress>=21);
  row.home=baseline.debug;row.saveBefore=baseline.save;
  row.draws=await page.evaluate(()=>window.__HOME_VIS__.audit.draws.filter(x=>x.phase==='home'));
  assert.equal(row.draws.some(d=>d.key==='dailyChallengeEntry'),progress>=16);
  assert.equal(row.draws.some(d=>d.key==='leagueEntry'),progress>=21);
  for(const key of expectedNav){const draw=row.draws.find(x=>x.key===key);assert.equal(draw.alpha,1,`${key} full alpha`);assert(!draw.filter||draw.filter==='none',`${key} no blur`);}
  row.iconPixels=await page.evaluate(keys=>keys.map(key=>{const img=window.__COLOR_ESCAPE__.art.homeUi[key],c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);const p=x.getImageData(0,0,c.width,c.height).data;let opaque=0,colored=0;for(let i=0;i<p.length;i+=4)if(p[i+3]>0){opaque++;if(p[i]!==p[i+1]||p[i]!==p[i+2])colored++;}return{key,width:c.width,height:c.height,opaque,colored};}),expectedNav);
  for(const icon of row.iconPixels){assert(icon.opaque>0);if(locked)assert.equal(icon.colored,0);else assert(icon.colored>0);}
  row.image=resolve(output,row.name+'.png');await page.screenshot({path:row.image});row.imageSha256=sha(await readFile(row.image));
  for(const [feature,available] of [['dailyChallenge',progress>=16],['league',progress>=21]])if(!available){
   await phase(page,`hidden-${feature}`);const before=await read(page),scale=496/720,offset=(1078-1584*scale)/2;
   const rect=await page.evaluate(f=>window.__HOME_VIS__.layout[f+'Entry'],feature);
   await click(page,{x:(rect.x+rect.width/2)*scale,y:offset+(rect.y+rect.height/2)*scale});await page.waitForTimeout(70);
   const after=await read(page);assert.equal(after.debug.screen,'home');assert.equal(after.debug.featureLockFeedback,undefined);assert.equal(after.writes,before.writes);assert.deepEqual(after.save,before.save);
   row.hiddenClicks.push({feature,screen:after.debug.screen,noWrite:true,noFeedback:true});
  }
  if(locked)for(const [index,feature,threshold] of [[0,'supply',8],[1,'leaderboard',6],[3,'levels',11]]){
   await phase(page,`locked-${feature}`);const before=await read(page),rect=before.debug.interactionTargets.targets[`navigation.${index}`].hit;
   await click(page,{x:rect.x+rect.width/2,y:rect.y+rect.height/2});
   await page.waitForFunction(f=>window.__COLOR_ESCAPE__.getDebugState().featureLockFeedback?.feature===f,feature);
   await page.waitForFunction(text=>window.__HOME_VIS__.audit.texts.some(t=>t.text===text),`通关第${threshold}关解锁`);
   const after=await read(page);assert.equal(after.debug.screen,'home');assert.equal(after.writes,before.writes);assert.deepEqual(after.save,before.save);row.lockedClicks.push({feature,threshold,noWrite:true});
  }
  if(progress===21){
   const entries=[['homeMissions','dailyTasks','dailyTaskClose'],['homeAchievements','achievements','achievementClose'],['homeDailyChallenge','dailyChallenge','dailyChallengeClose'],['homeLeague','league','league.back']];
   row.entryOrder=entries.map(([key])=>({key,y:targets[key].hit.y}));
   assert(row.entryOrder.every((entry,i)=>i===0||entry.y>row.entryOrder[i-1].y),'Tasks, achievements, daily challenge, league are vertically ordered');
   if(viewport.width===496){row.entryClicks=[];for(const [key,screen,closeKey] of entries){
    await phase(page,`open-${screen}`);let rect=(await read(page)).debug.interactionTargets.targets[key].hit;
    await click(page,{x:rect.x+rect.width/2,y:rect.y+rect.height/2});
    await page.waitForFunction(screen=>window.__COLOR_ESCAPE__.screen===screen,screen,{timeout:10000});
    await page.waitForFunction(key=>Boolean(window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets[key]),closeKey,{timeout:10000});
    row.entryClicks.push({key,screen:(await read(page)).debug.screen});
    rect=(await read(page)).debug.interactionTargets.targets[closeKey].hit;await click(page,{x:rect.x+rect.width/2,y:rect.y+rect.height/2});
    await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='home',null,{timeout:10000});
   }}
  }
  row.audit=await page.evaluate(()=>structuredClone(window.__HOME_VIS__.audit));row.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);row.status='PASS';await context.close();
 }
 assert.deepEqual(report.errors,[]);report.sourceAfter=await hashes();report.sourceChanges=sourceFiles.filter(p=>report.sources[p]!==report.sourceAfter[p]);assert.deepEqual(report.sourceChanges,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({name:r.name,status:r.status})),failure:report.failure,output},null,2));
