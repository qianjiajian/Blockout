import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Synthetic saves and observation only. All navigation, selection and scrolling
// use real Pointer events; production code and existing evidence stay untouched.
const output=resolve(process.env.PROFILE_LOCKED_GRAY_OUTPUT??`playtest-results/profile-locked-gray-20261014/run-${Date.now()}`);
const helperPath='tools/playtest-formal-ui-resources.mjs',helper=await readFile(helperPath,'utf8');
const begin=helper.indexOf('function seed('),end=helper.indexOf('const economy =',begin);
assert(begin>=0&&end>begin);
const {seed,fixture:baseFixture}=new Function(helper.slice(begin,end)+';return {seed,fixture};')();
const sha=value=>createHash('sha256').update(value).digest('hex');
const files=[helperPath,'tools/playtest-profile-locked-gray-20261014.mjs','src/game/ColorEscapeGame.ts',
 'src/core/playerProfile.ts','src/game/playerProfileUi.ts','src/game/profileSuppliedArt.ts','src/game/GrayscaleImageCache.ts',
 'src/platform/Host.ts','src/platform/WebHost.ts','src/platform/WechatHost.ts','docs/rules/manifest.json'];
const bindings=async()=>Object.fromEntries(await Promise.all(files.map(async path=>[path,sha(await readFile(path))])));
function progress(completed,value=seed('normal')){
 value.currentLevel=completed+1;value.highestLevel=completed+1;
 value.rewardedLevels=Array.from({length:completed},(_,i)=>i+1);
 value.bestStars=Object.fromEntries(value.rewardedLevels.map(level=>[level,3]));
 value.journeyProgress.seenEpisodeUnlockLevels=[11,21,31,41];
 value.reducedMotion=true;
 return value;
}
function fixture(initial){
 let html=baseFixture(initial);
 html=html.replace('const host=new MemoryHost(),game=new ColorEscapeGame(host),ctx=host.context;',`
const host=new MemoryHost(),createObservedCanvas=host.createOffscreenCanvas.bind(host),qaOffscreenCanvases=[];
host.createOffscreenCanvas=function(){const canvas=createObservedCanvas(),offscreenContext=canvas.getContext('2d'),imageDraw=offscreenContext.drawImage.bind(offscreenContext);
 qaOffscreenCanvases.push(canvas);canvas.__QA_ID__=qaOffscreenCanvases.length;
 offscreenContext.drawImage=function(image,...args){const result=imageDraw(image,...args);
  if(image instanceof HTMLImageElement){canvas.__QA_SOURCE__=new URL(image.currentSrc||image.src,location.href).pathname;
   canvas.__QA_COLOR_REFERENCE__=new Uint8ClampedArray(offscreenContext.getImageData(0,0,canvas.width,canvas.height).data);}
  return result;};return canvas;};
const game=new ColorEscapeGame(host),ctx=host.context;
// Simulate a main Canvas with no CSS filter support. The production cache must
// visibly desaturate its own pixels without relying on this property.
Object.defineProperty(ctx,'filter',{configurable:true,get:()=> 'none',set:()=>{}});`);
 html=html.replace("import {getLevelStrict} from '/src/core/levels.ts';",`import {getLevelStrict} from '/src/core/levels.ts';
import {PROFILE_CATALOG_RECT,PROFILE_LAYOUT,profileCatalogCells,profileNotificationDotRect,PROFILE_SCALE,PROFILE_OFFSET_Y} from '/src/game/playerProfileUi.ts';`);
 html=html.replace('game.start();',`
const profileAudit={frame:[],images:[],texts:[],history:[],catalog:PROFILE_CATALOG_RECT};
window.__PROFILE_QA__=profileAudit;
const grayGet=game.profileGrayImages.get.bind(game.profileGrayImages),grayLookups=new Map();
game.profileGrayImages.get=function(image){const canvas=grayGet(image),src=new URL(image.currentSrc||image.src,location.href).pathname;
 const entry=grayLookups.get(src)||{calls:0,canvases:new Set()};entry.calls++;if(canvas)entry.canvases.add(canvas.__QA_ID__);grayLookups.set(src,entry);return canvas;};
profileAudit.cacheStats=()=>({canvases:qaOffscreenCanvases.map(c=>({id:c.__QA_ID__,src:c.__QA_SOURCE__,width:c.width,height:c.height})),
 lookups:Array.from(grayLookups,([src,v])=>({src,calls:v.calls,canvasIds:Array.from(v.canvases)}))});
let profilePaintScope='other';
for(const name of ['drawHome','drawProfile']){const original=game[name].bind(game);game[name]=function(...args){const before=profilePaintScope;profilePaintScope=name;try{return original(...args);}finally{profilePaintScope=before;}};}
const badgeDraw=game.drawDiscoveryBadge.bind(game);
game.drawDiscoveryBadge=function(rect){const first=audit.frame.draws.length,m=ctx.getTransform(),result=badgeDraw(rect);
 const entry={scope:profilePaintScope,rect:{...rect},transform:{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f},draws:audit.frame.draws.slice(first)};
 profileAudit.frame.push(entry);return result;};
profileAudit.expected=function(){const v=game.profileView(),r=[];
 const add=(rect,shown,size=30)=>{if(shown)r.push(profileNotificationDotRect(rect,size));};
 const avatar=v.unreadAvatars.some(Boolean),frame=v.unreadFrames.some(Boolean);
 if(v.page==='stats')add(PROFILE_LAYOUT.avatar,avatar||frame);
 else{add(PROFILE_LAYOUT.editAvatar,avatar||frame);add(PROFILE_LAYOUT.avatarTab,avatar);add(PROFILE_LAYOUT.frameTab,frame);
  for(const cell of profileCatalogCells(v.page,v.scrollOffset)){const x=cell.rect.x/PROFILE_SCALE,y=(cell.rect.y-PROFILE_OFFSET_Y)/PROFILE_SCALE,size=cell.rect.width/PROFILE_SCALE;
   add({x,y,width:size,height:size},(v.page==='frame'?v.unreadFrames:v.unreadAvatars)[cell.index],24);}}
 return r;
};
const profileImageDraw=ctx.drawImage.bind(ctx),profileTextDraw=ctx.fillText.bind(ctx);
ctx.drawImage=function(image,...args){if(profilePaintScope==='drawProfile'){
 const canvas=image instanceof HTMLCanvasElement,src=canvas?image.__QA_SOURCE__:image instanceof HTMLImageElement?new URL(image.currentSrc||image.src,location.href).pathname:undefined;
 if(canvas&&src&&!image.__QA_RASTER__){const data=image.getContext('2d').getImageData(0,0,image.width,image.height).data,original=image.__QA_COLOR_REFERENCE__;
  let visible=0,notGray=0,alphaChanged=0,sourceColored=0;for(let i=0;i<data.length;i+=4){if(data[i+3]>0){visible++;if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>0)notGray++;}
   if(data[i+3]!==original[i+3])alphaChanged++;if(original[i+3]>0&&Math.max(original[i],original[i+1],original[i+2])-Math.min(original[i],original[i+1],original[i+2])>10)sourceColored++;}
  image.__QA_RASTER__={width:image.width,height:image.height,visible,notGray,alphaChanged,sourceColored};}
 if(src){const m=this.getTransform();profileAudit.images.push({src,args,kind:canvas?'canvas':'image',raster:canvas?image.__QA_RASTER__:undefined,filter:this.filter,alpha:this.globalAlpha,transform:{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f}});}}
 return profileImageDraw(image,...args);};
ctx.fillText=function(text,...args){if(profilePaintScope==='drawProfile')profileAudit.texts.push({text:String(text),filter:this.filter});return profileTextDraw(text,...args);};
const profileObservedRender=game.render.bind(game);
game.render=function(...args){profileAudit.frame=[];profileAudit.images=[];profileAudit.texts=[];return profileObservedRender(...args);};
game.start();`);
 return html;
}
const state=page=>page.evaluate(()=>({snapshot:window.__FORMAL_UI__.snapshot(),view:window.__COLOR_ESCAPE__.profileView(),
 page:window.__COLOR_ESCAPE__.profilePage??null,draftAvatar:window.__COLOR_ESCAPE__.profileDraftAvatar,
 draftFrame:window.__COLOR_ESCAPE__.profileDraftFrame,scrolls:{avatar:window.__COLOR_ESCAPE__.profileScrolls.avatar.offset,frame:window.__COLOR_ESCAPE__.profileScrolls.frame.offset},
 notifications:window.__COLOR_ESCAPE__.profileNotifications(),paint:{frame:structuredClone(window.__PROFILE_QA__.frame),images:structuredClone(window.__PROFILE_QA__.images),texts:structuredClone(window.__PROFILE_QA__.texts),expected:window.__PROFILE_QA__.expected(),cache:window.__PROFILE_QA__.cacheStats()}}));
async function readyHome(page){await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady&&g.homeProfileArt
 &&g.screen==='home'&&!g.featureUnlockGuide&&!g.collectionIntro&&!g.journeyPresentation;},undefined,{timeout:45000});}
async function point(page,key){
 await page.waitForFunction(key=>{const s=window.__COLOR_ESCAPE__?.getDebugState(),t=s?.interactionTargets;return Boolean(t&&(t.targets??t)[key]?.hit);},key,{timeout:10000});
 const s=(await state(page)).snapshot.state,t=s.viewportTransform,r=(s.interactionTargets.targets??s.interactionTargets)[key].hit,b=await page.locator('canvas').boundingBox();
 return {x:b.x+t.offsetX+(r.x+r.width/2)*t.scale,y:b.y+t.offsetY+(r.y+r.height/2)*t.scale};
}
async function click(page,key){const p=await point(page,key);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForTimeout(35);await page.mouse.up();await page.waitForTimeout(130);}
async function openEditor(page){await click(page,'homeProfile');await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.profileArt));await click(page,'profile.edit');}
async function closeProfile(page){await click(page,'profile.close');await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.profilePage);await page.waitForTimeout(100);}
async function swipeCatalog(page,up=true){
 const s=(await state(page)).snapshot.state,t=s.viewportTransform,b=await page.locator('canvas').boundingBox(),r=await page.evaluate(()=>window.__PROFILE_QA__.catalog);
 const map=(x,y)=>({x:b.x+t.offsetX+x*t.scale,y:b.y+t.offsetY+y*t.scale});
 const from=map(r.x+r.width*.45,r.y+r.height*(up?.86:.14)),to=map(r.x+r.width*.45,r.y+r.height*(up?.14:.86));
 await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();await page.waitForTimeout(120);
}
async function revealItem(page,index){
 for(let attempt=0;attempt<5;attempt++){
  const s=await state(page),t=s.snapshot.state.interactionTargets,r=(t.targets??t)[`profile.select.${index}`]?.hit;
  if(r&&r.height>30)return;
  await swipeCatalog(page);
 }
 throw Error(`Item ${index} not reached by actual Pointer scrolling`);
}
async function shot(page,row,name){const current=await state(page),file=resolve(output,`${row.name}-${name}.png`);await page.screenshot({path:file});
 row.shots.push({name,file,sha256:sha(await readFile(file)),state:current});return current;}

const indices=values=>values.flatMap((yes,index)=>yes?[index]:[]);
function expectUnread(current,avatars,frames){
 assert.deepEqual(indices(current.notifications.unreadAvatars),avatars);
 assert.deepEqual(indices(current.notifications.unreadFrames),frames);
 assert.equal(current.notifications.hasUnread,Boolean(avatars.length||frames.length));
 assert.deepEqual(indices(current.view.unreadAvatars),avatars);assert.deepEqual(indices(current.view.unreadFrames),frames);
}
function expectPaint(current,{home}={}){
 if(home!==undefined){const dots=current.paint.frame.filter(d=>d.scope==='drawHome'&&d.rect.width===22);assert.equal(dots.length,home?1:0,'Home avatar dot draw count');}
 if(current.page){const dots=current.paint.frame.filter(d=>d.scope==='drawProfile');
  assert.deepEqual(dots.map(d=>d.rect),current.paint.expected,'Every visible avatar, tab and catalog red dot actually draws at its defined rectangle');
  assert(dots.every(d=>d.draws.length===1&&d.draws[0].src.includes('discovery-badge')),'Every profile dot draws the existing notification bitmap');}
}
function expectEquipped(current,avatar,frame){assert.equal(current.snapshot.saved.playerProfile.avatar,avatar);assert.equal(current.snapshot.saved.playerProfile.frame,frame);
 assert.equal(current.view.profile.avatar,avatar);assert.equal(current.view.profile.frame,frame);}

function assertAppearance(s,kind,index,locked,{selected=false}={}){
 const draws=s.paint.images.filter(d=>d.src.endsWith('/'+kind+'-'+index+'.png'));
 const list=draws.filter(d=>d.args[1]>700);assert.equal(list.length,1,'Target catalog image actually draws');
 assert.equal(list[0].filter,'none','Acceptance disables Canvas filter support');
 assert.equal(list[0].kind,locked?'canvas':'image','Only locked catalog uses the pixel-gray cache');
 if(locked){const raster=list[0].raster;assert(raster.visible>0&&raster.sourceColored>0,'Cached image started with visible colored pixels');
  assert.equal(raster.notGray,0,'Every visible cache pixel has equal RGB channels');assert.equal(raster.alphaChanged,0,'Grayscale preserves every source alpha byte at the same scaled size');
  assert(raster.width<=128&&raster.height<=128,'Thumbnail cache respects its native pixel cap');}
 if(selected){
  const preview=draws.filter(d=>d.args[1]<700);assert.equal(preview.length,1,'Selected appearance has a real top preview');assert.equal(preview[0].filter,'none','Preview remains full color');assert.equal(preview[0].kind,'image','Preview keeps the original color image');
  const green=s.paint.images.filter(d=>d.src.endsWith('/selected.png'));assert.equal(green.length,1);assert.equal(green[0].filter,'none','Green selected mark stays colored');
  assert(s.paint.texts.every(t=>t.filter==='none'),'Filter does not leak into text or lock marks');
  const targets=s.snapshot.state.interactionTargets;assert.equal(Boolean((targets.targets??targets)['profile.save']),!locked,'Save eligibility retains the original unlock rule');
  if(locked)assert(s.paint.texts.some(t=>t.text==='通过'+(kind==='avatar'?190:200)+'关解锁'),'Locked item keeps its level explanation');
 }
 for(const d of s.paint.images.filter(d=>!/-[0-9]+\.png$/.test(d.src)))assert.equal(d.filter,'none','Unrelated profile UI remains colored');
}
async function run(viewport){
 const row={name:String(viewport.width),viewport,status:'RUNNING',errors:[],shots:[]};report.cases.push(row);
 const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage();
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real Storage forbidden');};for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real IndexedDB forbidden');};});
 page.on('pageerror',e=>row.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')row.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)row.errors.push(r.status()+' '+r.url());});
 let fixtureSeed=progress(5);fixtureSeed.playerProfile.avatar=1;fixtureSeed.playerProfile.frame=0;
 await page.route('**/*',route=>{const url=route.request().url();if(url===origin+'/__profile_gray__')return route.fulfill({contentType:'text/html',body:fixture(fixtureSeed)});
  return url.startsWith(origin+'/')||url.startsWith('data:')?route.continue():route.abort();});
 const load=async()=>{await page.goto(origin+'/__profile_gray__',{waitUntil:'domcontentloaded'});await readyHome(page);await page.waitForTimeout(150);};
 try{
  await load();await openEditor(page);const baseline=await state(page),originalSaved=structuredClone(baseline.snapshot.saved.playerProfile),originalWrites=baseline.snapshot.audit.writes.length;
  await revealItem(page,24);let s=await state(page);assertAppearance(s,'avatar',24,true);await click(page,'profile.select.24');s=await shot(page,row,'avatar-locked-selected');assert.equal(s.draftAvatar,24);assertAppearance(s,'avatar',24,true,{selected:true});expectEquipped(s,1,0);expectUnread(s,[],[]);
  assert.deepEqual(s.snapshot.saved.playerProfile,originalSaved);assert.equal(s.snapshot.audit.writes.length,originalWrites,'Locked selection does not persist acknowledgment or equipment');
  await click(page,'profile.frameTab');await revealItem(page,18);await click(page,'profile.select.18');s=await shot(page,row,'frame-locked-selected');assert.equal(s.draftFrame,18);assertAppearance(s,'frame',18,true,{selected:true});expectEquipped(s,1,0);expectUnread(s,[],[]);
  assert.deepEqual(s.snapshot.saved.playerProfile,originalSaved);assert.equal(s.snapshot.audit.writes.length,originalWrites);
  for(const suffix of ['/avatar-24.png','/frame-18.png']){const lookup=s.paint.cache.lookups.find(x=>x.src.endsWith(suffix));assert(lookup?.calls>1,'Actual repeated frames consult the same cache');assert.equal(lookup.canvasIds.length,1,'Repeated draw reuses the same canvas');}
  row.cacheBeforeClose=s.paint.cache;await closeProfile(page);row.cacheAfterClose=(await state(page)).paint.cache;
  assert(row.cacheAfterClose.canvases.length>0&&row.cacheAfterClose.canvases.every(c=>c.width===0&&c.height===0),'Closing profile releases all gray canvas dimensions');
  fixtureSeed=progress(200,structuredClone(s.snapshot.saved));fixtureSeed.currentLevel=200;fixtureSeed.highestLevel=200;fixtureSeed.journeyProgress.seenEpisodeUnlockLevels=Array.from({length:20},(_,i)=>11+i*10);
  row.syntheticUnlock={completedLevels:[1,200],currentLevel:200,reason:'Fixture eligibility only; no level-completion claim'};
  await load();await openEditor(page);await revealItem(page,24);s=await shot(page,row,'avatar-unlocked-unread');assertAppearance(s,'avatar',24,false);assert(s.notifications.unreadAvatars[24]);expectPaint(s);
  await click(page,'profile.select.24');s=await state(page);assertAppearance(s,'avatar',24,false,{selected:true});assert(!s.notifications.unreadAvatars[24]);assert(s.notifications.unreadAvatars[23]);expectEquipped(s,1,0);
  await click(page,'profile.frameTab');await revealItem(page,18);s=await shot(page,row,'frame-unlocked-unread');assertAppearance(s,'frame',18,false);assert(s.notifications.unreadFrames[18]);expectPaint(s);
  await click(page,'profile.select.18');s=await state(page);assertAppearance(s,'frame',18,false,{selected:true});assert(!s.notifications.unreadFrames[18]);assert(s.notifications.unreadFrames[17]);expectEquipped(s,1,0);
  assert.deepEqual(s.snapshot.storageViolations,[]);assert.deepEqual(row.errors,[]);row.final=s;row.status='PASS';
 }catch(error){row.status='FAIL';row.failure=String(error.stack??error);row.last=await state(page).catch(()=>null);await page.screenshot({path:resolve(output,row.name+'-failure.png')}).catch(()=>{});throw error;}
 finally{await context.close();console.log(row.name+': '+row.status);await writeFile(resolve(output,'partial.json'),JSON.stringify(report,null,2)+'\n');}
}

await mkdir(output,{recursive:true});
const report={status:'PREPARED',scope:'Isolated current-source Chromium, synthetic MemoryHost progress and real Pointer. Main Canvas filter is deliberately disabled; actual locked gray-cache pixels and preserved alpha, colorful previews and selection/save/read rules are observed without real Storage or WeChat packaging.',sources:await bindings(),cases:[]};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:405,height:882},{width:320,height:568}])await run(viewport);
 report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();report.sourcesAfter=await bindings();report.sourceChanges=files.filter(path=>report.sources[path]!==report.sourcesAfter[path]);
 if(report.sourceChanges.length){report.status='FAIL';process.exitCode=1;}
 await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,sourceChanges:report.sourceChanges,output,failure:report.failure},null,2));
