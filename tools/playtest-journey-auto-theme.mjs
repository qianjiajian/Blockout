import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Current formal Lv20, real input only. No fixture completion, model mutation,
// accelerated clock, real browser profile, or persistent storage is used.
const routeFile = 'deliverables/lv20-remake-20260927/design-v187-1790503452295/candidate-120.json';
const output = resolve(process.env.JOURNEY_AUTO_OUTPUT ?? `playtest-results/journey-auto-theme-20261008-${Date.now()}`);
const hash = value => createHash('sha256').update(value).digest('hex');
const clean = value => JSON.parse(JSON.stringify(value));
const route = JSON.parse(await readFile(routeFile, 'utf8'));
const compiled = await build({stdin:{contents:"export {LEVELS} from './src/core/levels.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
assert.deepEqual(clean(api.LEVELS[19]), route.level, 'Historical route must bind current exact formal level');
const replay = api.replayRevisedRoute(api.LEVELS[19], route.drags);
assert(replay.valid && replay.complete, JSON.stringify(replay));
const sourceFiles = [];
async function tree(dir) { for (const row of await readdir(dir,{withFileTypes:true})) { const p=dir+'/'+row.name; if(row.isDirectory()) await tree(p);else sourceFiles.push(p); } }
await tree('src');
sourceFiles.push(routeFile, 'tools/playtest-journey-auto-theme.mjs');
const bindings = async () => Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,hash(await readFile(p))])));
const beforeBindings = await bindings();
await mkdir(output,{recursive:true});
const seed = () => ({schemaVersion:1,currentLevel:20,highestLevel:20,coins:777,
  sound:false,music:false,haptic:false,reducedMotion:false,language:'zh-CN',
  featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','key-lock','arrow-block','lift','star'],
  boosterUnlockSeen:['time','rocket','pulse'],boosters:{time:3,rocket:3,pulse:3},
  bestStars:Object.fromEntries(Array.from({length:19},(_,i)=>[String(i+1),3])),
  bestMoves:Object.fromEntries(Array.from({length:19},(_,i)=>[String(i+1),50])),
  rewardedLevels:Array.from({length:19},(_,i)=>i+1),selectedJourneyEpisode:2,
  journeyProgress:{claimedMilestoneLevels:[10,15],seenEpisodeUnlockLevels:[11]},
  lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},
  metaDiscovery:{collectionViewedThroughLevel:20,dailyUnlockSeen:true},
  dailyStreak:0,lastDailyCompletedDay:''});
function fixture(saved) {return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {getLevelStrict} from '/src/core/levels.ts';
import {GAME_ART} from '/src/game/artManifest.ts';
const saved=${JSON.stringify(saved)}, key='color-escape-save-v1';
const audit={images:[],writes:[],draws:[],pointers:[],screens:[]};
const images=new WeakMap();let game;
class MemoryHost extends WebHost {
 data=new Map([[key,structuredClone(saved)]]);
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){const copy=structuredClone(v);audit.writes.push({key:k,value:copy,at:performance.now(),screen:game?.screen});this.data.set(k,copy);return true;}
 music(){}sound(){}vibrate(){}
 async createImage(src){const row={src,start:performance.now(),screen:game?.screen};audit.images.push(row);try{const image=await super.createImage(src);row.end=performance.now();row.width=image.naturalWidth;row.height=image.naturalHeight;images.set(image,src);return image;}catch(e){row.error=String(e);throw e;}}
}
const host=new MemoryHost();game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
window.__AUTO_THEME__={game,host,audit,paths:GAME_ART.ui.formalPages.journey.homeThemes,formal:()=>game.model.level===getLevelStrict(game.model.level.id)};
const original=host.context.drawImage;host.context.drawImage=function(image,...args){const src=images.get(image);if(src&&GAME_ART.ui.formalPages.journey.homeThemes.includes(src)){const last=audit.draws.at(-1);if(!last||last.src!==src||last.screen!==game.screen)audit.draws.push({src,screen:game.screen,at:performance.now(),selected:game.save.selectedJourneyEpisode});}return original.call(this,image,...args);};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>audit.pointers.push({type,x:e.clientX,y:e.clientY,at:performance.now()}),true);
game.start();
</script>`;}
const report={status:'RUNNING',generatedAt:new Date().toISOString(),scope:'Current formal Lv20 real Pointer completion, 20 to 21, automatic theme 2 to 3. Isolated MemoryHost save copied into a new document for reload, no actual user storage. Desktop Chromium, not phone validation.',
  naturalClock:true,playerSaveTouched:false,levelSha256:hash(JSON.stringify(route.level)),routeSha256:hash(JSON.stringify(route.drags)),routeFile,
  replay:{valid:replay.valid,complete:replay.complete,effectiveDrags:replay.effectiveDrags,clearEvents:replay.clearEvents},bindings:beforeBindings,scenarios:[],errors:[]};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const state=page=>page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
const saved=page=>page.evaluate(()=>structuredClone(window.__AUTO_THEME__.host.data.get('color-escape-save-v1')));
const ready=page=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady&&!g.journeyHomeThemeLoading;},undefined,{timeout:60000});
const stable=page=>page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,s=g?.getDebugState();return s&&s.art.formalGameplay.missingWholeBlockIds.length===0&&!g.revisedArtLoading&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!s.exitAnimations.length&&!s.revisedMechanismAnimations.length&&!s.generatorSpawnAnimations.length;},undefined,{timeout:20000});
async function point(page,s,x,y) {const r=await page.locator('canvas').boundingBox();return{x:r.x+s.viewportTransform.offsetX+x*s.viewportTransform.scale,y:r.y+s.viewportTransform.offsetY+y*s.viewportTransform.scale};}
async function click(page,name) {const s=await state(page),r=s.interactionTargets.targets[name]?.hit;assert(r,`Pointer target ${name}`);const p=await point(page,s,r.x+r.width/2,r.y+r.height/2);await page.mouse.click(p.x,p.y,{delay:35});}
async function snap(page,row,name) {const file=resolve(output,`${row.viewport.width}-${name}.png`);await page.screenshot({path:file});row.screenshots.push({file,sha256:hash(await readFile(file))});}
function puzzleSpatial(s){return clean(Object.fromEntries(['blocks','gates','shutters','generators','queuedBlocks','cleared','complete','failed','timeFreezeSeconds'].map(k=>[k,s[k]])));}
try {
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]) {
  const row={viewport,status:'RUNNING',steps:[],screenshots:[]};report.scenarios.push(row);
  const context=await browser.newContext({viewport});const page=await context.newPage();let fixtureSave=seed();
  page.on('pageerror',e=>report.errors.push({viewport,type:'pageerror',message:e.message}));
  page.on('console',m=>{if(m.type()==='error')report.errors.push({viewport,type:'console',message:m.text()});});
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const method of ['getItem','setItem','removeItem','clear'])Storage.prototype[method]=function(){window.__STORAGE_VIOLATIONS__.push(method);throw Error('Persistent storage forbidden');};for(const method of ['open','deleteDatabase'])indexedDB[method]=function(){window.__STORAGE_VIOLATIONS__.push(method);throw Error('Persistent database forbidden');};});
  await page.route('**/__auto_theme_fixture__',route=>route.fulfill({contentType:'text/html',body:fixture(fixtureSave)}));
  try {
   await page.goto(origin+'/__auto_theme_fixture__',{waitUntil:'domcontentloaded'});await ready(page);
   row.initial=await state(page);row.initialSave=await saved(page);
   assert.equal(row.initial.screen,'home');assert.equal(row.initial.level.id,20);
   assert.equal(row.initial.journey.homeTheme.loadedEpisode,2);
   assert.equal(row.initialSave.selectedJourneyEpisode,2);
   assert.equal(await page.evaluate(()=>window.__AUTO_THEME__.formal()),true);
   await snap(page,row,'home-before');await click(page,'homePlay');
   await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing');await stable(page);
   row.opening=await state(page);await snap(page,row,'opening');
   const wallStart=Date.now(),timeBefore=row.opening.puzzle.remainingSeconds;
   await page.waitForTimeout(400);
   const timeAfter=(await state(page)).puzzle.remainingSeconds;
   assert(timeAfter<timeBefore,'Natural level time advances');
   row.naturalClockProbe={timeBefore,timeAfter,wallMilliseconds:Date.now()-wallStart};
   for(const [index,drag] of route.drags.entries()) {
    await stable(page);const s=await state(page),b=s.puzzle.blocks.find(b=>b.id===drag.blockId);assert(b&&!b.frozen&&!s.puzzle.failed);
    const [gx,gy]=b.shape[0];
    const move=async(x,y)=>{const p=await point(page,s,s.board.innerX+(x+gx+.5)*s.board.cell,s.board.innerY+(y+gy+.5)*s.board.cell);await page.mouse.move(p.x,p.y,{steps:3});};
    await move(b.x,b.y);await page.mouse.down();for(const [x,y]of drag.path)await move(x,y);
    if(drag.exitSide){const[x,y]=drag.path.at(-1)??[b.x,b.y],[dx,dy]={left:[-.8,0],right:[.8,0],top:[0,-.8],bottom:[0,.8]}[drag.exitSide];await move(x+dx,y+dy);}
    await page.mouse.up();await stable(page);const after=(await state(page)).puzzle;
    const expected=api.replayRevisedRoute(route.level,route.drags.slice(0,index+1));assert(expected.valid);
    assert.deepEqual(puzzleSpatial(after),puzzleSpatial(JSON.parse(expected.finalStateKey)),`actual drag ${index+1}`);
    assert.equal(after.moves,s.puzzle.moves+1);assert(after.remainingSeconds<=s.puzzle.remainingSeconds&&!after.failed);
    row.steps.push({index:index+1,blockId:drag.blockId,moves:after.moves,clearDelta:after.cleared-s.puzzle.cleared,remainingSeconds:after.remainingSeconds});
   }
   await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='win'&&!g.pendingSettlement&&g.winArt&&!g.journeyHomeThemeLoading;},undefined,{timeout:30000});
   row.win=await state(page);row.winSave=await saved(page);row.winAudit=await page.evaluate(()=>structuredClone(window.__AUTO_THEME__.audit));
   assert(row.win.puzzle.complete&&row.win.puzzle.remainingSeconds>0);assert.equal(row.win.puzzle.moves,route.drags.length);assert.equal(row.win.puzzle.blocks.length,0);
   assert.equal(row.winSave.highestLevel,21);assert.equal(row.winSave.currentLevel,21);assert.equal(row.winSave.selectedJourneyEpisode,3,'Automatic theme must be in confirmed settlement before Home');
   assert.equal(row.win.journey.homeTheme.loadedEpisode,3,'New theme loaded during result page');
   assert.equal(row.winSave.coins,row.initialSave.coins+40);assert.deepEqual(row.winSave.boosters,row.initialSave.boosters);
   const settlementWrites=row.winAudit.writes.filter(w=>w.key==='color-escape-save-v1'&&w.value.highestLevel===21);
   assert(settlementWrites.length>0);assert(settlementWrites.every(w=>w.value.selectedJourneyEpisode===3),'No intermediate new progress saved with old theme');
   const themePath=await page.evaluate(()=>window.__AUTO_THEME__.paths[2]);
   const themeLoad=row.winAudit.images.find(i=>i.src===themePath);
   assert(themeLoad?.end&&!themeLoad.error,'Theme actually decoded');assert(themeLoad.start>=settlementWrites[0].at,'Preload must start after settlement persistence');
   assert(!row.winAudit.pointers.some(p=>p.type==='pointerdown'&&p.at>=settlementWrites[0].at),'No theme-selection pointer after completion');
   await snap(page,row,'win-theme-preloaded');
   await click(page,'modalPrimary');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='home');
   await page.waitForFunction(path=>window.__AUTO_THEME__.audit.draws.some(d=>d.src===path&&d.screen==='home'),themePath);
   row.home=await state(page);assert.equal(row.home.journey.homeTheme.loadedEpisode,3);await snap(page,row,'home-after');
   fixtureSave=await saved(page);row.beforeReloadSave=clean(fixtureSave);row.beforeReloadAudit=await page.evaluate(()=>structuredClone(window.__AUTO_THEME__.audit));
   assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);
   await page.reload({waitUntil:'domcontentloaded'});await ready(page);
   await page.waitForFunction(path=>window.__AUTO_THEME__.audit.draws.some(d=>d.src===path&&d.screen==='home'),themePath);
   row.reloaded=await state(page);row.reloadedSave=await saved(page);row.reloadAudit=await page.evaluate(()=>structuredClone(window.__AUTO_THEME__.audit));
   assert.equal(row.reloaded.screen,'home');assert.equal(row.reloadedSave.selectedJourneyEpisode,3);assert.equal(row.reloaded.journey.homeTheme.loadedEpisode,3);
   assert.equal(row.reloadedSave.coins,row.winSave.coins);assert.equal(row.reloadedSave.highestLevel,21);
   assert.deepEqual(row.reloadedSave.rewardedLevels,row.winSave.rewardedLevels);assert.deepEqual(row.reloadAudit.pointers,[]);
   assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);await snap(page,row,'home-reloaded');
   row.status='PASS';
  }catch(error){row.status='FAIL';row.error=String(error.stack??error);row.lastState=await state(page).catch(()=>null);row.lastSave=await saved(page).catch(()=>null);row.audit=await page.evaluate(()=>structuredClone(window.__AUTO_THEME__?.audit)).catch(()=>null);await snap(page,row,'failure').catch(()=>{});throw error;}
  finally{await context.close();}
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(await bindings(),beforeBindings,'Source/route inputs cannot drift during validation');report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,output,scenarios:report.scenarios.map(s=>({viewport:s.viewport,status:s.status,moves:s.win?.puzzle.moves})),error:report.error}));
