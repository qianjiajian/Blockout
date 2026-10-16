import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const output=resolve(`playtest-results/profile-supplied-20261014-${Date.now()}`);
await mkdir(output,{recursive:true});
const files=['src/game/playerProfileUi.ts','src/game/profileSuppliedArt.ts','src/game/ColorEscapeGame.ts','src/core/playerProfile.ts','src/platform/WebHost.ts','src/platform/Host.ts'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const report={status:'RUNNING',scope:'Production Canvas and real Pointer/text input with isolated MemoryHost. Synthetic eligibility only, no actual player storage and no native WeChat claim.',sources:await hashes(),rows:[],errors:[]};
const fixture=language=>`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';
import {WebHost} from '/src/platform/WebHost.ts';
import {PROFILE_CATALOG_RECT,PROFILE_INPUT_RECT,profileCatalogMaxScroll,profileRect} from '/src/game/playerProfileUi.ts';
const key='color-escape-save-v1',writes=[],audit={texts:[],images:[],copies:[]};let mode='commit';
const initial={schemaVersion:1,currentLevel:6,highestLevel:6,coins:340,language:${JSON.stringify(language)},sound:false,music:false,haptic:false,reducedMotion:true,
 collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],
 featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},
 lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},bestStars:{1:3,2:3,3:3,4:3,5:3},rewardedLevels:[1,2,3,4,5],
 playerProfile:{id:'1482757',name:'Player#148221',avatar:1,frame:7,joinedAt:1785542400000,firstTryWins:3,longestStreak:3,currentStreak:0,attempts:{},lastAttemptWon:true}};
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);
 storageRead(k){if(mode.startsWith('unknown'))return{status:'unavailable'};return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){return this.data.has(k)?structuredClone(this.data.get(k)):f;}
 storageSet(k,v){writes.push({key:k,value:structuredClone(v),object:v,mode});if(mode==='commit'||mode==='unknown-written')this.data.set(k,structuredClone(v));return mode==='commit';}
 music(){}sound(){}vibrate(){}async copyText(value){audit.copies.push(value);return true;}
}
const host=new MemoryHost(),game=new ColorEscapeGame(host),fill=host.context.fillText,draw=host.context.drawImage,seen=new Set();
host.context.fillText=function(value,...args){if(game.profilePage){const entry={page:game.profilePage,text:String(value),args,font:this.font},id=JSON.stringify(entry);if(!seen.has(id)){seen.add(id);audit.texts.push(entry);}}return fill.call(this,value,...args);};
host.context.drawImage=function(image,...args){if(game.profilePage){const entry={page:game.profilePage,src:image.src??'',args,alpha:this.globalAlpha,filter:this.filter},id=JSON.stringify(entry);if(!seen.has(id)){seen.add(id);audit.images.push(entry);}}return draw.call(this,image,...args);};
window.__PROFILE_TEST__={game,host,writes,audit,key,mode:value=>mode=value,catalog:PROFILE_CATALOG_RECT,input:PROFILE_INPUT_RECT,maxScroll:profileCatalogMaxScroll,profileRect};window.__COLOR_ESCAPE__=game;game.start();
</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>{const t=window.__PROFILE_TEST__,g=t.game;return{save:structuredClone(g.save),stored:structuredClone(t.host.data.get(t.key)),view:structuredClone(g.profileView()),page:g.profilePage,pending:!!g.pendingProfileSave,writes:t.writes.length};});
async function click(p,key){
 const s=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),r=s.interactionTargets.targets[key]?.hit;
 assert(r,`Missing visible target ${key}`);const b=await p.locator('canvas').boundingBox(),t=s.viewportTransform;
 await p.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:25});
 await p.waitForTimeout(100);
}
async function screenshot(p,name){await p.screenshot({path:resolve(output,`${name}.png`)});}
async function swipe(p,up=true){
 const s=await p.evaluate(()=>({t:window.__COLOR_ESCAPE__.getDebugState().viewportTransform,r:window.__PROFILE_TEST__.catalog})),b=await p.locator('canvas').boundingBox();
 const x=b.x+s.t.offsetX+(s.r.x+s.r.width/2)*s.t.scale;
 const a=b.y+s.t.offsetY+(s.r.y+s.r.height*(up?.9:.1))*s.t.scale,z=b.y+s.t.offsetY+(s.r.y+s.r.height*(up?.1:.9))*s.t.scale;
 await p.mouse.move(x,a);await p.mouse.down();await p.mouse.move(x,z,{steps:12});await p.mouse.up();await p.waitForTimeout(100);
}
async function bottom(p){for(let attempt=0;attempt<6;attempt++){
 const atBottom=await p.evaluate(()=>{const t=window.__PROFILE_TEST__,g=t.game;return Math.abs(g.currentProfileScroll().offset-t.maxScroll(g.profilePage))<.1;});
 if(atBottom)return;await swipe(p);
}assert(false,'Catalog did not reach bottom through real Pointer');}
async function top(p){for(let attempt=0;attempt<6;attempt++){if((await state(p)).view.scrollOffset<.1)return;await swipe(p,false);}assert(false,'Catalog did not return to top');}
async function open(p){await click(p,'homeProfile');await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.profileArt?.ui);}
async function lockedNoSave(p){const before=await state(p),s=await p.evaluate(()=>({t:window.__COLOR_ESCAPE__.getDebugState().viewportTransform,r:window.__PROFILE_TEST__.profileRect(248,1100,225,84),keys:Object.keys(window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets)}));
 assert(!s.keys.includes('profile.save'));const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+s.t.offsetX+(s.r.x+s.r.width/2)*s.t.scale,b.y+s.t.offsetY+(s.r.y+s.r.height/2)*s.t.scale);await p.waitForTimeout(60);
 const after=await state(p);assert.equal(after.writes,before.writes);assert.deepEqual(after.save,before.save);
}
try{
 for(const width of [320,496])for(const language of ['zh-CN','en']){
  const row={width,height:width===320?568:1078,language,status:'RUNNING'};report.rows.push(row);
  const context=await browser.newContext({viewport:{width,height:row.height},deviceScaleFactor:1}),p=await context.newPage();
  await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Persistent storage forbidden');};for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('IndexedDB forbidden');};});
  p.on('pageerror',e=>report.errors.push(`${width}/${language}: ${e.message}`));p.on('console',m=>{if(m.type()==='error')report.errors.push(`${width}/${language}: ${m.text()}`);});p.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await p.route('**/__profile_supplied__',route=>route.fulfill({contentType:'text/html',body:fixture(language)}));
  await p.goto(`${origin}/__profile_supplied__`);await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.homeProfileArt&&g.screen==='home'&&!g.featureGuide&&!g.collectionIntro;});
  await open(p);assert.equal((await state(p)).page,'stats');assert.equal((await state(p)).view.highest,5);assert.equal((await state(p)).view.totalStars,15);
  await screenshot(p,`${width}-${language}-stats`);await click(p,'profile.copy');assert.deepEqual(await p.evaluate(()=>window.__PROFILE_TEST__.audit.copies),['1482757']);
  const statsBefore=await state(p);await click(p,'profile.editName');await p.locator('input').waitFor();
  assert.equal((await state(p)).view.renameReturnPage,'stats');await p.locator('input').fill('Cancel Stats');await click(p,'profile.cancelRename');
  assert.equal((await state(p)).page,'stats');assert.equal(await p.locator('input').count(),0);assert.equal((await state(p)).writes,statsBefore.writes);assert.deepEqual((await state(p)).save,statsBefore.save);
  await click(p,'profile.editName');await p.locator('input').waitFor();await p.locator('input').fill('Stats Name');await screenshot(p,`${width}-${language}-stats-rename`);
  await click(p,'profile.rename');const statsRenamed=await state(p);assert.equal(statsRenamed.page,'stats');assert.equal(statsRenamed.save.coins,240);assert.equal(statsRenamed.stored.coins,240);assert.equal(statsRenamed.save.playerProfile.name,'Stats Name');
  assert.deepEqual({...statsRenamed.save.playerProfile,name:statsBefore.save.playerProfile.name},statsBefore.save.playerProfile);assert.deepEqual(statsRenamed.save.bestStars,statsBefore.save.bestStars);assert.deepEqual(statsRenamed.save.rewardedLevels,statsBefore.save.rewardedLevels);assert.equal(await p.locator('input').count(),0);
  row.statsRename={cancelNoWrite:true,coinsBefore:statsBefore.save.coins,coinsAfter:statsRenamed.save.coins,returnsTo:statsRenamed.page,name:statsRenamed.save.playerProfile.name};
  await screenshot(p,`${width}-${language}-stats-renamed`);
  await click(p,'profile.edit');await screenshot(p,`${width}-${language}-avatars`);
  await click(p,'profile.select.2');await click(p,'profile.frameTab');await click(p,'profile.select.4');await screenshot(p,`${width}-${language}-frames`);
  await click(p,'profile.close');assert.equal((await state(p)).save.playerProfile.avatar,1);assert.equal((await state(p)).save.playerProfile.frame,7);
  await open(p);await click(p,'profile.edit');const original=(await state(p)).view.draftAvatar;await bottom(p);assert.equal((await state(p)).view.draftAvatar,original,'Scrolling must not select');
  await click(p,'profile.select.24');await lockedNoSave(p);await screenshot(p,`${width}-${language}-locked-avatar`);
  await click(p,'profile.frameTab');await bottom(p);await click(p,'profile.select.18');await lockedNoSave(p);await screenshot(p,`${width}-${language}-locked-frame`);
  const offset=(await state(p)).view.scrollOffset;await click(p,'profile.avatarTab');assert((await state(p)).view.scrollOffset>0);await click(p,'profile.frameTab');assert.equal((await state(p)).view.scrollOffset,offset);
  // Eligibility is granted only to this test's in-memory synthetic account.
  await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.save.highestLevel=200;g.save.rewardedLevels.push(200);});
  await p.evaluate(()=>window.__PROFILE_TEST__.mode('unknown-written'));await click(p,'profile.save');assert((await state(p)).pending);
  assert.deepEqual(await p.evaluate(()=>Object.keys(window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets)),['profile.retry']);
  await p.evaluate(()=>window.__PROFILE_TEST__.mode('commit'));await click(p,'profile.retry');
  const saved=await state(p);assert.equal(saved.stored.playerProfile.avatar,24);assert.equal(saved.stored.playerProfile.frame,18);assert.equal(saved.stored.coins,240);assert.equal(saved.page,'frame');assert.equal(saved.view.scrollOffset,offset);assert.equal(saved.view.feedback,language==='en'?'Saved successfully':'保存成功');
  assert(await p.evaluate(()=>{const w=window.__PROFILE_TEST__.writes;return w.at(-1).object===w.at(-2).object;}),'Unknown save must reuse identical candidate');
  await screenshot(p,`${width}-${language}-saved`);
  await click(p,'profile.editName');await p.locator('input').waitFor();await p.locator('input').fill('Not Saved');await click(p,'profile.cancelRename');
  assert.equal((await state(p)).page,'avatar');assert.equal((await state(p)).save.playerProfile.name,'Stats Name');assert.equal((await state(p)).save.coins,240);
  assert.equal(await p.locator('input').count(),0,'Rename X must remove the active text input');
  await click(p,'profile.editName');await p.locator('input').waitFor();await p.locator('input').fill('Art Test');
  row.renameInput=await p.locator('input').evaluate(input=>{const style=getComputedStyle(input),r=input.getBoundingClientRect();return{color:style.color,backgroundColor:style.backgroundColor,fontSize:style.fontSize,bounds:{x:r.x,y:r.y,width:r.width,height:r.height}};});
  const expectedInput=await p.evaluate(()=>{const t=window.__PROFILE_TEST__,v=t.game.getDebugState().viewportTransform,b=t.host.canvas.getBoundingClientRect(),r=t.input,insetX=r.width*4/458,insetY=r.height*4/84;return{x:b.x+v.offsetX+(r.x+insetX)*v.scale,y:b.y+v.offsetY+(r.y+insetY)*v.scale,width:(r.width-2*insetX)*v.scale,height:(r.height-2*insetY)*v.scale};});
  for(const dimension of ['x','y','width','height'])assert(Math.abs(row.renameInput.bounds[dimension]-expectedInput[dimension])<1,`Real input ${dimension} follows the supplied field`);
  assert.equal(row.renameInput.color,'rgb(88, 45, 216)');assert.equal(row.renameInput.backgroundColor,'rgb(238, 226, 214)');
  await screenshot(p,`${width}-${language}-rename`);
  await click(p,'profile.rename');assert.equal((await state(p)).stored.coins,140);assert.equal((await state(p)).stored.playerProfile.name,'Art Test');assert.equal((await state(p)).page,'avatar');
  await click(p,'profile.editName');await p.locator('input').fill('Retry Name');await p.evaluate(()=>window.__PROFILE_TEST__.mode('unknown-written'));await click(p,'profile.rename');
  assert.equal((await state(p)).save.coins,140);assert.deepEqual(await p.evaluate(()=>Object.keys(window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets)),['profile.retry']);
  await p.evaluate(()=>window.__PROFILE_TEST__.mode('commit'));await click(p,'profile.retry');assert.equal((await state(p)).stored.coins,40);assert.equal((await state(p)).stored.playerProfile.name,'Retry Name');
  assert(await p.evaluate(()=>{const w=window.__PROFILE_TEST__.writes;return w.at(-1).object===w.at(-2).object;}));
  await click(p,'profile.editName');await p.locator('input').fill('Cannot Buy');await click(p,'profile.rename');assert.equal((await state(p)).save.coins,40);assert.equal((await state(p)).save.playerProfile.name,'Retry Name');
  await screenshot(p,`${width}-${language}-insufficient`);await click(p,'profile.cancelRename');assert.equal((await state(p)).page,'avatar');await click(p,'profile.close');assert.equal((await state(p)).page,undefined);
  await open(p);await screenshot(p,`${width}-${language}-final-stats`);await click(p,'profile.close');
  row.storageViolations=await p.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);
  row.final=await state(p);row.artAudit=await p.evaluate(()=>window.__PROFILE_TEST__.audit);
  for(const page of ['avatar','frame'])assert(row.artAudit.images.some(image=>image.page===page&&image.src.endsWith('/profile-supplied-v2/edit-name.png')&&image.args.join()===[526,517,66,67].join()),`Formal edit-name art drawn on ${page}`);
  assert(row.artAudit.images.some(image=>image.page==='stats'&&image.src.endsWith('/profile-supplied-v2/edit-name.png')&&image.args.join()===[536,527,49,49].join()),'Formal edit-name art drawn next to the overview nickname');
  assert(!row.artAudit.images.some(image=>image.src.endsWith('/profile-reference-v1/edit.png')),'Old edit icon is not drawn');
  row.status='PASS';
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(await hashes(),report.sources,'Production source changed during QA');report.status='PASS';
 await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));console.log(`PASS profile supplied: 4 dual-screen/language cases. ${output}`);
}catch(error){report.status='FAIL';report.error=String(error?.stack??error);await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));throw error;}
finally{await browser.close();await server.close();}
