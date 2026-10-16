import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Isolated synthetic progress; Pointer-only navigation, scrolling and equipment.
// No puzzle is completed, and browser storage is forbidden throughout this QA.
const output=resolve(process.env.PROFILE_FRAME_ACCEPTANCE_OUTPUT??`playtest-results/profile-frames-supplied-20261015/acceptance-${Date.now()}`);
const prefix='/assets/art/ui/profile-frames-supplied-v1/';
const helperPath='tools/playtest-formal-ui-resources.mjs',helper=await readFile(helperPath,'utf8');
const begin=helper.indexOf('function seed('),end=helper.indexOf('const economy =',begin);
assert(begin>=0&&end>begin);
const {seed,fixture:baseFixture}=new Function(helper.slice(begin,end)+';return {seed,fixture};')();
const sha=value=>createHash('sha256').update(value).digest('hex');
const files=[helperPath,'tools/playtest-profile-frames-supplied-20261015.mjs','src/core/playerProfile.ts',
 'src/game/playerProfileUi.ts','src/game/ProfileAvatarArtStore.ts','src/game/ColorEscapeGame.ts',
 ...Array.from({length:19},(_,id)=>`public${prefix}frame-${id}.png`)];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async path=>[path,sha(await readFile(path))])));
function progress(completed){
 const value=seed('normal');value.currentLevel=Math.min(200,completed+1);value.highestLevel=Math.min(200,completed+1);
 value.rewardedLevels=Array.from({length:completed},(_,i)=>i+1);
 value.bestStars=Object.fromEntries(value.rewardedLevels.map(level=>[level,3]));
 value.journeyProgress.seenEpisodeUnlockLevels=Array.from({length:20},(_,i)=>11+i*10);
 value.playerProfile.avatar=1;value.playerProfile.frame=0;value.playerProfile.seenAvatars=Array.from({length:25},(_,i)=>i);
 value.playerProfile.seenFrames=Array.from({length:19},(_,i)=>i);value.reducedMotion=true;
 return value;
}
function fixture(initial){
 let html=baseFixture(initial);
 html=html.replace("import {getLevelStrict} from '/src/core/levels.ts';",`import {getLevelStrict} from '/src/core/levels.ts';
import {PROFILE_CATALOG_RECT,profileCatalogCells} from '/src/game/playerProfileUi.ts';`);
 html=html.replace('const host=new MemoryHost(),game=new ColorEscapeGame(host),ctx=host.context;',`
const host=new MemoryHost(),createCanvas=host.createOffscreenCanvas.bind(host);
host.createOffscreenCanvas=function(){const canvas=createCanvas(),c=canvas.getContext('2d'),draw=c.drawImage.bind(c);
 c.drawImage=function(image,...args){if(image instanceof HTMLImageElement)canvas.__SOURCE__=new URL(image.currentSrc||image.src,location.href).pathname;return draw(image,...args);};return canvas;};
const game=new ColorEscapeGame(host),ctx=host.context;`);
 html=html.replace('game.start();',`
const qa={phase:'startup',images:[],texts:[],ranking:[],loads:[],catalog:PROFILE_CATALOG_RECT};
window.__FRAMES_QA__=qa;let rankingDraw;
const ranking=game.drawRankingAvatar.bind(game),leagueRanking=game.drawLeagueRankingAvatar.bind(game);let leaguePlayer;
game.drawLeagueRankingAvatar=function(a,p,r){leaguePlayer=p;try{return leagueRanking(a,p,r);}finally{leaguePlayer=undefined;}};
game.drawRankingAvatar=function(art,avatar,frame,rect){const row={avatar,frame,rect,screen:game.screen,leaguePlayer,images:[]};rankingDraw=row;
 try{return ranking(art,avatar,frame,rect);}finally{rankingDraw=undefined;qa.ranking.push(row);}};
const drawImage=ctx.drawImage.bind(ctx),drawText=ctx.fillText.bind(ctx),observedRender=game.render.bind(game);
ctx.drawImage=function(image,...args){const src=image instanceof HTMLImageElement?new URL(image.currentSrc||image.src,location.href).pathname:image.__SOURCE__;
 if(src){const row={src,args,kind:image instanceof HTMLImageElement?'image':'canvas',width:image.naturalWidth||image.width,height:image.naturalHeight||image.height};
  if(image instanceof HTMLCanvasElement){const data=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let visible=0,colored=0;
   for(let i=0;i<data.length;i+=4)if(data[i+3]){visible++;if(data[i]!==data[i+1]||data[i+1]!==data[i+2])colored++;}row.raster={visible,colored};}
  qa.images.push(row);if(rankingDraw)rankingDraw.images.push(row);}
 return drawImage(image,...args);};
ctx.fillText=function(text,...args){qa.texts.push(String(text));return drawText(text,...args);};
game.render=function(...args){qa.images=[];qa.texts=[];qa.ranking=[];return observedRender(...args);};
qa.state=()=>({debug:game.getDebugState(),page:game.profilePage,view:game.profileView(),draft:game.profileDraftFrame,
 live:structuredClone(game.save.playerProfile),stored:structuredClone(host.data.get(key).playerProfile),
 writes:audit.writes.length,images:structuredClone(qa.images),texts:qa.texts,ranking:structuredClone(qa.ranking),loads:audit.images,
 cells:game.profilePage?profileCatalogCells(game.profilePage,game.profileScrolls[game.profilePage]?.offset||0):[],storageViolations:window.__STORAGE_VIOLATIONS__});
game.start();`);
 return html;
}
const state=page=>page.evaluate(()=>window.__FRAMES_QA__.state());
async function ready(page){await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady&&g.homeProfileArt&&g.screen==='home'&&!g.featureUnlockGuide&&!g.collectionIntro&&!g.journeyPresentation;},undefined,{timeout:45000});await page.waitForTimeout(150);}
async function point(page,key){
 await page.waitForFunction(key=>Boolean(window.__COLOR_ESCAPE__?.getDebugState().interactionTargets.targets[key]?.hit),key,{timeout:10000});
 const s=await state(page),r=s.debug.interactionTargets.targets[key].hit,t=s.debug.viewportTransform,b=await page.locator('canvas').boundingBox();
 return {x:b.x+t.offsetX+(r.x+r.width/2)*t.scale,y:b.y+t.offsetY+(r.y+r.height/2)*t.scale};
}
async function click(page,key){const p=await point(page,key);await page.mouse.click(p.x,p.y,{delay:35});await page.waitForTimeout(130);}
async function openFrames(page){await click(page,'homeProfile');await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.profileArt));await click(page,'profile.edit');await click(page,'profile.frameTab');}
async function close(page){await click(page,'profile.close');await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.profilePage);await page.waitForTimeout(100);}
async function scroll(page,down){
 const s=await state(page),t=s.debug.viewportTransform,b=await page.locator('canvas').boundingBox(),r=await page.evaluate(()=>window.__FRAMES_QA__.catalog);
 const map=(x,y)=>({x:b.x+t.offsetX+x*t.scale,y:b.y+t.offsetY+y*t.scale});
 const from=map(r.x+r.width*.55,r.y+r.height*(down?.85:.15)),to=map(r.x+r.width*.55,r.y+r.height*(down?.15:.85));
 await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();await page.waitForTimeout(150);
}
async function reveal(page,index){
 for(let attempt=0;attempt<7;attempt++){
  const s=await state(page),r=s.debug.interactionTargets.targets[`profile.select.${index}`]?.hit;
  if(r&&r.height>40)return;
  const ids=s.cells.map(c=>c.index);await scroll(page,index>Math.min(...ids));
 }
 throw Error(`Cannot reach frame ${index} through Pointer scrolling`);
}
function expectOnlyNew(s){
 const images=s.images.filter(d=>/\/frame-\d+\.png$/.test(d.src));assert(images.length>0,'Frames actually draw');
 assert(images.every(d=>d.src.startsWith(prefix)),'Every drawn frame uses the supplied resource directory');
 for(const d of images){const [w,h]=d.args.slice(-2);assert(Math.abs(w/h-d.width/d.height)<.002,'Frame keeps native aspect ratio');}
 assert(!s.loads.some(d=>/\/(profile-reference-v1|profile-unlocks-v1)\/frame-\d+\.png$/.test(d.src)),'Old frames are never loaded');
 assert(!s.loads.some(d=>d.src.endsWith('/frame-19.png')),'Reserved twentieth frame is not a runtime slot');
}
function expectEquipped(s,index){assert.equal(s.live.frame,index);assert.equal(s.stored.frame,index);}
function expectAvatarOrder(images,index){
 const frame=images.findIndex(d=>d.src===prefix+`frame-${index}.png`);assert(frame>=0,'Selected supplied frame is painted');
 assert(images.slice(0,frame).some(d=>/\/avatar-\d+\.png$/.test(d.src)),'Avatar is painted underneath the decorative frame');
}
async function shot(page,row,label){const s=await state(page),file=resolve(output,`${row.name}-${label}.png`);await page.screenshot({path:file});row.shots.push({label,file,sha256:sha(await readFile(file))});return s;}
async function rankingCheck(page,row,index,league){
 await page.waitForFunction(({id,league})=>window.__FRAMES_QA__.ranking.some(r=>r.frame===id&&(!league||r.leaguePlayer===true)&&r.images.some(d=>d.src.endsWith('/frame-'+id+'.png'))),{id:index,league},{timeout:15000});
 const s=await state(page);expectOnlyNew(s);const rows=s.ranking.filter(r=>r.frame===index&&(!league||r.leaguePlayer===true));assert(rows.length);rows.forEach(r=>expectAvatarOrder(r.images,index));
 row.rankings.push({frame:index,league,rows:rows.map(r=>({avatar:r.avatar,frame:r.frame,screen:r.screen,player:r.leaguePlayer,images:r.images}))});
}

await mkdir(output,{recursive:true});
const report={status:'PREPARED',scope:'Synthetic MemoryHost progress, actual Pointer selections and equipment. All nineteen slots and representative frame synchronization are checked on two screens; no puzzle-completion or device-test claim, no real storage, no WeChat packaging.',sources:await hashes(),cases:[]};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
async function run(viewport){
 const row={name:`${viewport.width}x${viewport.height}`,viewport,status:'RUNNING',errors:[],shots:[],catalog:[],rankings:[]};report.cases.push(row);
 const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage();
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real Storage forbidden');};for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real IndexedDB forbidden');};});
 page.on('pageerror',e=>row.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')row.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)row.errors.push(r.status()+' '+r.url());});
 let fixtureSeed=progress(5);
 await page.route('**/*',route=>{const url=route.request().url();if(url===origin+'/__profile_frames__')return route.fulfill({contentType:'text/html',body:fixture(fixtureSeed)});return url.startsWith(origin+'/')||url.startsWith('data:')?route.continue():route.abort();});
 const load=async()=>{await page.goto(origin+'/__profile_frames__',{waitUntil:'domcontentloaded'});await ready(page);};
 try{
  await load();await openFrames(page);await reveal(page,18);const before=await state(page);await click(page,'profile.select.18');let s=await shot(page,row,'locked-selected-18');
  expectOnlyNew(s);expectEquipped(s,0);assert.equal(s.draft,18);assert.equal(s.writes,before.writes,'Locked selection never writes');
  const draws=s.images.filter(d=>d.src===prefix+'frame-18.png');assert(draws.some(d=>d.kind==='canvas'&&d.raster.visible>0&&d.raster.colored===0),'Locked catalog frame is grayscale');
  assert(draws.some(d=>d.kind==='image'),'Selected preview remains full color');assert(!s.debug.interactionTargets.targets['profile.save'],'Locked item has no Save control');assert(s.texts.includes('通过200关解锁'));
  expectAvatarOrder(s.images,18);await close(page);
  fixtureSeed=progress(200);await load();await openFrames(page);
  for(let index=0;index<19;index++){
   await reveal(page,index);await click(page,`profile.select.${index}`);s=await state(page);expectOnlyNew(s);assert.equal(s.draft,index);assert(s.debug.interactionTargets.targets['profile.save']);
   assert(s.images.filter(d=>d.src===prefix+`frame-${index}.png`).every(d=>d.kind==='image'),'Unlocked previews and catalog retain full color');
   expectAvatarOrder(s.images,index);row.catalog.push({index,unlocked:true,save:true});
   if([0,9,18].includes(index))await shot(page,row,`unlocked-catalog-${index}`);
  }
  await close(page);
  for(const index of [0,2,9,12,17,18]){
   await openFrames(page);await reveal(page,index);await click(page,`profile.select.${index}`);await click(page,'profile.save');s=await state(page);expectEquipped(s,index);await close(page);
   s=await state(page);expectOnlyNew(s);expectEquipped(s,index);expectAvatarOrder(s.images,index);
   if([2,12,18].includes(index))await shot(page,row,`home-frame-${index}`);
   await click(page,'navigation.1');await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='leaderboard'&&!g.navigationTransition&&g.formalPageReady('leaderboard');},{timeout:30000});
   await rankingCheck(page,row,index,false);if([2,12,18].includes(index))await shot(page,row,`main-rank-frame-${index}`);
   await click(page,'navigation.2');await ready(page);await click(page,'homeLeague');
   await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='league'&&g.leagueArtStore?.art&&g.leagueAvatarArtStore?.art;},undefined,{timeout:30000});
   await rankingCheck(page,row,index,true);if([2,12,18].includes(index))await shot(page,row,`league-rank-frame-${index}`);
   await click(page,'league.back');await ready(page);
  }
  s=await state(page);assert.deepEqual(s.storageViolations,[]);assert.deepEqual(row.errors,[]);row.final={profile:s.stored,loads:s.loads,storageViolations:s.storageViolations};row.status='PASS';
 }catch(error){row.status='FAIL';row.failure=String(error.stack??error);row.last=await state(page).catch(()=>null);await page.screenshot({path:resolve(output,row.name+'-failure.png')}).catch(()=>{});throw error;}
 finally{await context.close();console.log(row.name+': '+row.status);await writeFile(resolve(output,'partial.json'),JSON.stringify(report,null,2)+'\n');}
}
try{for(const viewport of [{width:405,height:882},{width:320,height:568}])await run(viewport);report.status='PASS';}
catch(error){report.status='FAIL';report.failure=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();report.sourcesAfter=await hashes();report.sourceChanges=files.filter(path=>report.sources[path]!==report.sourcesAfter[path]);if(report.sourceChanges.length){report.status='FAIL';process.exitCode=1;}await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({name:r.name,status:r.status})),sourceChanges:report.sourceChanges,output,failure:report.failure},null,2));
