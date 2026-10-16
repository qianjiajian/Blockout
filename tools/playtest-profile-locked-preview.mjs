import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const output=resolve('playtest-results/profile-save-stays-20261009');await mkdir(output,{recursive:true});
const source=await readFile('src/game/ColorEscapeGame.ts');const sha=b=>createHash('sha256').update(b).digest('hex');
const errors=[],rows=[];
const fixture=(language)=>`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
const key='color-escape-save-v1';let mode='commit',game;const writes=[];
const initial={schemaVersion:1,currentLevel:6,highestLevel:6,coins:240,language:${JSON.stringify(language)},sound:false,music:false,haptic:false,reducedMotion:true,
 collectionIntroShown:true,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},bestStars:{1:3,2:3,3:3,4:3,5:3},rewardedLevels:[1,2,3,4,5],
 playerProfile:{id:'1482757',name:'Player#148221',avatar:1,frame:7,joinedAt:1785542400000,firstTryWins:3,longestStreak:3,currentStreak:0,attempts:{},lastAttemptWon:true}};
class MemoryHost extends WebHost {data=structuredClone(initial);storageRead(){return mode.startsWith('unknown')?{status:'unavailable'}:{status:'ok',value:structuredClone(this.data)};}
 storageGet(k,f){return this.data??f;}storageSet(k,v){writes.push({value:structuredClone(v),object:v,mode});if(mode==='commit'||mode==='unknown-written')this.data=structuredClone(v);return mode==='commit';}music(){}sound(){}vibrate(){}async copyText(){return true;}}
const host=new MemoryHost();game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;window.__PROFILE_TEST__={host,writes,mode:m=>mode=m};game.start();</script>`;
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},plugins:[{name:'profile-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/profile-fixture')){res.setHeader('Content-Type','text/html');res.end(fixture(req.url.includes('en')?'en':'zh-CN'));}else next();});}}],server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
async function click(p,name){const s=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState()),r=s.interactionTargets.targets[name]?.hit;assert(r,`Missing target ${name}`);
const box=await p.locator('canvas').boundingBox();await p.mouse.click(box.x+s.viewportTransform.offsetX+(r.x+r.width/2)*s.viewportTransform.scale,box.y+s.viewportTransform.offsetY+(r.y+r.height/2)*s.viewportTransform.scale);await p.waitForTimeout(80);if(name==='homeProfile')await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.profileArt);}
const current=p=>p.evaluate(()=>({save:structuredClone(window.__COLOR_ESCAPE__.save),stored:structuredClone(window.__PROFILE_TEST__.host.data),page:window.__COLOR_ESCAPE__.profilePage,pending:!!window.__COLOR_ESCAPE__.pendingProfileSave}));
async function screenshot(p,name){await p.screenshot({path:resolve(output,name+'.png')});}
const scrollState=p=>p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;return {avatar:g.profileScrolls.avatar.offset,frame:g.profileScrolls.frame.offset,draftAvatar:g.profileDraftAvatar,draftFrame:g.profileDraftFrame,feedback:g.profileFeedback,screen:g.screen}});
async function swipe(p,cdp,up=true){
 const t=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().viewportTransform),b=await p.locator('canvas').boundingBox();
 const scale=496/388,yOffset=539-360*scale;
 const xy=(x,y)=>({x:b.x+t.offsetX+x*scale*t.scale,y:b.y+t.offsetY+(yOffset+y*scale)*t.scale});
 const from=xy(150,up?500:345),to=xy(150,up?345:500);
 if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...from,id:1}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:8});await p.mouse.up();}
 await p.waitForTimeout(70);
}
async function verifyDisabled(p){
 const targets=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets);assert(!targets['profile.save']);
 const before=await current(p),w=await p.evaluate(()=>window.__PROFILE_TEST__.writes.length);
 const t=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().viewportTransform),b=await p.locator('canvas').boundingBox(),s=496/388;
 await p.mouse.click(b.x+t.offsetX+194.5*s*t.scale,b.y+t.offsetY+(539-360*s+560*s)*t.scale);
 assert.deepEqual(await current(p),before,'Disabled save must not commit');assert.equal(await p.evaluate(()=>window.__PROFILE_TEST__.writes.length),w);
}
try{for(const width of [320,496])for(const language of ['zh-CN','en']){
 const context=await browser.newContext({viewport:{width,height:width===320?568:1078},hasTouch:true}),p=await context.newPage(),cdp=width===320?await context.newCDPSession(p):undefined;
 p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Persistent storage forbidden')};Storage.prototype.setItem=()=>{throw Error('Persistent storage forbidden')}});
 await p.goto(origin+'/profile-fixture?'+language);await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.homeProfileArt);
 await click(p,'homeProfile');await click(p,'profile.edit');await screenshot(p,'avatars-top-'+width+'-'+language);
 if(width===496&&language==='en'){
  const b=await p.locator('canvas').boundingBox(),t=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().viewportTransform),s=496/388;
  const x=b.x+t.offsetX+150*s*t.scale,y=b.y+t.offsetY+(539-360*s+455*s)*t.scale;
  await p.evaluate(()=>window.__COLOR_ESCAPE__.save.reducedMotion=false);
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y-25,{steps:2});await p.mouse.up();
  const released=(await scrollState(p)).avatar;await p.waitForTimeout(180);assert((await scrollState(p)).avatar>released,'Inertia advances after release');assert.equal((await scrollState(p)).draftAvatar,1);
  await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.save.reducedMotion=true;g.cancelProfileScroll()});await swipe(p,undefined,false);assert.equal((await scrollState(p)).avatar,0);
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y-30,{steps:2});
  await p.setViewportSize({width:495,height:1078});await p.mouse.up();assert(await p.evaluate(()=>!window.__COLOR_ESCAPE__.currentProfileScroll()?.gesture));assert.equal((await scrollState(p)).draftAvatar,1);
  await p.setViewportSize({width:496,height:1078});await swipe(p,undefined,false);assert.equal((await scrollState(p)).avatar,0);
 }
 let targets=await p.evaluate(()=>Object.keys(window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets));assert(!targets.some(k=>/Page/.test(k)));assert(!targets.includes('profile.select.24'));
 await swipe(p,cdp);const a=await scrollState(p);assert(a.avatar>0);assert.equal(a.draftAvatar,1,'Swipe must not select');await screenshot(p,'avatars-bottom-locked-'+width+'-'+language);
 await click(p,'profile.select.24');assert.equal((await scrollState(p)).draftAvatar,24);assert.equal((await scrollState(p)).feedback,undefined);await verifyDisabled(p);await screenshot(p,'locked-avatar-preview-'+width+'-'+language);
 await click(p,'profile.frameTab');assert.equal((await scrollState(p)).frame,0);await swipe(p,cdp);assert.equal((await scrollState(p)).draftFrame,7);await click(p,'profile.select.18');assert.equal((await scrollState(p)).draftFrame,18);assert.equal((await scrollState(p)).feedback,undefined);await verifyDisabled(p);await screenshot(p,'locked-frame-preview-'+width+'-'+language);
 await click(p,'profile.avatarTab');assert.equal((await scrollState(p)).avatar,a.avatar);await swipe(p,cdp,false);assert.equal((await scrollState(p)).avatar,0);
 // Grant eligibility only in this synthetic in-memory fixture.
 await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.save.highestLevel=200;g.save.rewardedLevels.push(200)});
 await swipe(p,cdp);await click(p,'profile.select.24');assert.equal((await scrollState(p)).draftAvatar,24);
 await click(p,'profile.frameTab');await click(p,'profile.select.18');assert.equal((await scrollState(p)).draftFrame,18);await screenshot(p,'frames-bottom-selected-'+width+'-'+language);
 await click(p,'profile.close');assert.equal((await current(p)).save.playerProfile.avatar,1,'Close cancels draft');
 await click(p,'homeProfile');await click(p,'profile.edit');assert.equal((await scrollState(p)).avatar,0);await swipe(p,cdp);await click(p,'profile.select.24');await click(p,'profile.frameTab');await swipe(p,cdp);await click(p,'profile.select.18');
 await p.evaluate(()=>window.__PROFILE_TEST__.mode('unknown-written'));await click(p,'profile.save');assert((await current(p)).pending);
 const pendingScroll=await scrollState(p);await swipe(p,cdp,false);assert.deepEqual(await scrollState(p),pendingScroll);targets=await p.evaluate(()=>Object.keys(window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets));assert.deepEqual(targets,['profile.retry']);
 await p.evaluate(()=>window.__PROFILE_TEST__.mode('commit'));await click(p,'profile.retry');assert.equal((await current(p)).stored.playerProfile.avatar,24);assert.equal((await current(p)).stored.playerProfile.frame,18);assert.equal((await current(p)).stored.coins,240);
 assert.equal((await current(p)).page,'frame');assert.equal((await scrollState(p)).frame,pendingScroll.frame);assert.equal((await scrollState(p)).feedback,language==='en'?'Saved successfully':'保存成功');await screenshot(p,'frame-saved-'+width+'-'+language);
 await click(p,'profile.avatarTab');const beforeAvatarSave=(await scrollState(p)).avatar;await click(p,'profile.save');assert.equal((await current(p)).page,'avatar');assert.equal((await scrollState(p)).avatar,beforeAvatarSave);assert.equal((await scrollState(p)).feedback,language==='en'?'Saved successfully':'保存成功');await screenshot(p,'avatar-saved-'+width+'-'+language);
 await click(p,'profile.select.23');assert.equal((await scrollState(p)).feedback,undefined);await click(p,'profile.close');assert.equal((await current(p)).stored.playerProfile.avatar,24);

 rows.push({width,language,input:cdp?'touch':'mouse',status:'PASS',swipeDoesNotSelect:true,allItemsReachable:true,tabsRememberOffset:true,closeCancels:true,pendingBlocksScroll:true,save:true,lockedPreviewSelectable:true,disabledSaveNoWrite:true});await context.close();
}assert.deepEqual(errors,[]);await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',sourceSha:sha(await readFile('src/game/ColorEscapeGame.ts')),scope:'Synthetic MemoryHost; real touch/mouse Pointer; no persistent player storage',rows,errors},null,2));console.log('PASS profile save stays open: 4 viewport/language runs');
}catch(e){await writeFile(resolve(output,'report.json'),JSON.stringify({status:'FAIL',rows,errors,error:String(e)},null,2));throw e}finally{await browser.close();await server.close()}
