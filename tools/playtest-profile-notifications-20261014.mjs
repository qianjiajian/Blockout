import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Synthetic saves and observation only. All navigation, selection and scrolling
// use real Pointer events; production code and existing evidence stay untouched.
const output=resolve(process.env.PROFILE_NOTIFICATIONS_OUTPUT??`playtest-results/profile-notifications-20261014/run-${Date.now()}`);
const helperPath='tools/playtest-formal-ui-resources.mjs',helper=await readFile(helperPath,'utf8');
const begin=helper.indexOf('function seed('),end=helper.indexOf('const economy =',begin);
assert(begin>=0&&end>begin);
const {seed,fixture:baseFixture}=new Function(helper.slice(begin,end)+';return {seed,fixture};')();
const sha=value=>createHash('sha256').update(value).digest('hex');
const files=[helperPath,'tools/playtest-profile-notifications-20261014.mjs','src/game/ColorEscapeGame.ts',
 'src/core/playerProfile.ts','src/game/playerProfileUi.ts','src/game/profileSuppliedArt.ts','docs/rules/manifest.json'];
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
 html=html.replace("import {getLevelStrict} from '/src/core/levels.ts';",`import {getLevelStrict} from '/src/core/levels.ts';
import {PROFILE_CATALOG_RECT,PROFILE_LAYOUT,profileCatalogCells,profileNotificationDotRect,PROFILE_SCALE,PROFILE_OFFSET_Y} from '/src/game/playerProfileUi.ts';`);
 html=html.replace('game.start();',`
const profileAudit={frame:[],history:[],catalog:PROFILE_CATALOG_RECT};
window.__PROFILE_QA__=profileAudit;
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
const profileObservedRender=game.render.bind(game);
game.render=function(...args){profileAudit.frame=[];return profileObservedRender(...args);};
game.start();`);
 return html;
}
const state=page=>page.evaluate(()=>({snapshot:window.__FORMAL_UI__.snapshot(),view:window.__COLOR_ESCAPE__.profileView(),
 page:window.__COLOR_ESCAPE__.profilePage??null,draftAvatar:window.__COLOR_ESCAPE__.profileDraftAvatar,
 draftFrame:window.__COLOR_ESCAPE__.profileDraftFrame,scrolls:{avatar:window.__COLOR_ESCAPE__.profileScrolls.avatar.offset,frame:window.__COLOR_ESCAPE__.profileScrolls.frame.offset},
 notifications:window.__COLOR_ESCAPE__.profileNotifications(),paint:{frame:structuredClone(window.__PROFILE_QA__.frame),expected:window.__PROFILE_QA__.expected()}}));
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
async function run(viewport){
 const row={name:String(viewport.width),viewport,status:'RUNNING',errors:[],shots:[],reloads:[]};report.cases.push(row);
 const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage();
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real Storage forbidden');};for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real IndexedDB forbidden');};});
 page.on('pageerror',e=>row.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')row.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)row.errors.push(`${r.status()} ${r.url()}`);});
 let fixtureSeed=progress(5);fixtureSeed.playerProfile.avatar=1;fixtureSeed.playerProfile.frame=0;
 await page.route('**/*',route=>{const url=route.request().url();if(url===origin+'/__profile_notifications__')return route.fulfill({contentType:'text/html',body:fixture(fixtureSeed)});
  return url.startsWith(origin+'/')||url.startsWith('data:')?route.continue():route.abort();});
 const load=async(value,label)=>{fixtureSeed=structuredClone(value);await page.goto(origin+'/__profile_notifications__',{waitUntil:'domcontentloaded'});await readyHome(page);await page.waitForTimeout(150);
  row.reloads.push({label,seed:structuredClone(value)});};
 try{
  await load(fixtureSeed,'baseline: 15 base avatars and 9 base frames');let s=await state(page);expectUnread(s,[],[]);expectPaint(s,{home:false});
  await openEditor(page);s=await state(page);expectUnread(s,[],[]);expectPaint(s);await click(page,'profile.frameTab');s=await state(page);expectPaint(s);await closeProfile(page);
  const newlyUnlocked=progress(20);newlyUnlocked.playerProfile.avatar=1;newlyUnlocked.playerProfile.frame=0;
  await load(newlyUnlocked,'synthetic cleared levels 1–20: avatar 15 and frame 9 unlocked');s=await shot(page,row,'home-unread');expectUnread(s,[15],[9]);expectPaint(s,{home:true});
  await click(page,'homeProfile');await page.waitForFunction(()=>Boolean(window.__COLOR_ESCAPE__.profileArt));s=await shot(page,row,'stats-unread');expectUnread(s,[15],[9]);expectPaint(s);
  await click(page,'profile.edit');await click(page,'profile.frameTab');await click(page,'profile.avatarTab');s=await state(page);expectUnread(s,[15],[9]);expectPaint(s);
  const beforeScroll=s;await revealItem(page,15);s=await shot(page,row,'avatar-unread');expectUnread(s,[15],[9]);expectPaint(s);assert.equal(s.draftAvatar,beforeScroll.draftAvatar);assert(s.scrolls.avatar>0);
  const writesBefore=s.snapshot.audit.writes.length;await click(page,'profile.select.15');s=await shot(page,row,'avatar-selected');expectUnread(s,[],[9]);expectPaint(s);expectEquipped(s,1,0);
  assert.equal(s.draftAvatar,15);assert(s.snapshot.saved.playerProfile.seenAvatars.includes(15));assert(s.snapshot.audit.writes.length>writesBefore,'Selection persists its own read state');
  await closeProfile(page);s=await state(page);expectUnread(s,[],[9]);expectPaint(s,{home:true});expectEquipped(s,1,0);
  await load(s.snapshot.saved,'reload after acknowledging only avatar 15');s=await state(page);expectUnread(s,[],[9]);expectEquipped(s,1,0);expectPaint(s,{home:true});
  await openEditor(page);await click(page,'profile.frameTab');await revealItem(page,9);s=await shot(page,row,'frame-unread');expectUnread(s,[],[9]);expectPaint(s);
  await click(page,'profile.select.9');s=await state(page);expectUnread(s,[],[]);expectPaint(s);expectEquipped(s,1,0);assert.equal(s.draftFrame,9);assert(s.snapshot.saved.playerProfile.seenFrames.includes(9));assert(s.snapshot.saved.playerProfile.seenAvatars.includes(15));
  await click(page,'profile.save');s=await state(page);expectEquipped(s,1,9);await closeProfile(page);s=await shot(page,row,'home-cleared');expectUnread(s,[],[]);expectPaint(s,{home:false});
  await load(s.snapshot.saved,'reload after both read and explicitly saving frame 9');s=await state(page);expectUnread(s,[],[]);expectEquipped(s,1,9);expectPaint(s,{home:false});
  await load(progress(30,structuredClone(s.snapshot.saved)),'synthetic subsequent completion 30: avatar 16 newly unlocks');s=await shot(page,row,'home-next-unlock');expectUnread(s,[16],[]);expectEquipped(s,1,9);expectPaint(s,{home:true});
  await openEditor(page);await revealItem(page,16);s=await shot(page,row,'avatar-next-unlock');expectUnread(s,[16],[]);expectPaint(s);
  assert.deepEqual(s.snapshot.storageViolations,[]);assert.deepEqual(row.errors,[]);row.final=s;row.status='PASS';
 }catch(error){row.status='FAIL';row.failure=String(error.stack??error);row.last=await state(page).catch(()=>null);await page.screenshot({path:resolve(output,row.name+'-failure.png')}).catch(()=>{});throw error;}
 finally{await context.close();console.log(`${row.name}: ${row.status}`);await writeFile(resolve(output,'partial.json'),JSON.stringify(report,null,2)+'\n');}
}

await mkdir(output,{recursive:true});
const report={status:'PREPARED',scope:'Isolated current-source Chromium; synthetic MemoryHost and real Pointer. Reload clones only this fixture save; later unlock uses explicitly synthetic mainline progress.',sources:await bindings(),cases:[]};
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
