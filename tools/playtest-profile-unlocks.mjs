import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const output=resolve('playtest-results/profile-unlocks-20261009');await mkdir(output,{recursive:true});
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
try{for(const width of [320,496])for(const language of ['zh-CN','en']){
 const context=await browser.newContext({viewport:{width,height:width===320?568:1078}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Persistent storage forbidden');};Storage.prototype.setItem=()=>{throw Error('Persistent storage forbidden');};});
 await p.goto(origin+'/profile-fixture?'+language);await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.homeProfileArt);
 await click(p,'homeProfile');await click(p,'profile.edit');await click(p,'profile.nextPage');await screenshot(p,'locked-avatars-'+width+'-'+language);
 await click(p,'profile.select.15');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftAvatar),1);
 await click(p,'profile.frameTab');await click(p,'profile.select.9');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftFrame),7);await click(p,'profile.nextPage');await click(p,'profile.select.18');await screenshot(p,'locked-frames-'+width+'-'+language);
 await click(p,'profile.close');await p.evaluate(()=>{const g=window.__COLOR_ESCAPE__;g.save.highestLevel=200;g.save.rewardedLevels=[190];});
 await click(p,'homeProfile');await click(p,'profile.edit');await click(p,'profile.nextPage');await click(p,'profile.select.24');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftAvatar),24);await screenshot(p,'unlocked-avatars-'+width+'-'+language);
 await click(p,'profile.frameTab');await click(p,'profile.nextPage');await click(p,'profile.select.18');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftFrame),7);
 await p.evaluate(()=>window.__COLOR_ESCAPE__.save.rewardedLevels.push(200));await click(p,'profile.select.18');assert.equal(await p.evaluate(()=>window.__COLOR_ESCAPE__.profileDraftFrame),18);await screenshot(p,'unlocked-frames-'+width+'-'+language);
 for(const fault of ['reject','unknown-empty','unknown-written']){
 await p.evaluate(m=>window.__PROFILE_TEST__.mode(m),fault);await click(p,'profile.save');assert.equal((await current(p)).save.playerProfile.avatar,1);
 await p.evaluate(()=>{window.__PROFILE_TEST__.candidate=window.__COLOR_ESCAPE__.pendingProfileSave?.candidateSave;window.__PROFILE_TEST__.candidateWriteCount=window.__PROFILE_TEST__.writes.filter(w=>w.object===window.__PROFILE_TEST__.candidate).length;window.__PROFILE_TEST__.mode('commit');});await click(p,fault==='reject'?'profile.save':'profile.retry');assert.equal((await current(p)).stored.playerProfile.avatar,24);assert.equal((await current(p)).stored.playerProfile.frame,18);assert.equal((await current(p)).stored.coins,240);
 if(fault!=='reject')assert(await p.evaluate(()=>{return window.__PROFILE_TEST__.candidateWriteCount===1 && window.__PROFILE_TEST__.writes.filter(w=>w.object===window.__PROFILE_TEST__.candidate).length>=1;}));
 await click(p,'profile.close');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.homeProfileArt);await screenshot(p,'equipped-home-'+width+'-'+language);
 await p.evaluate(()=>{window.__COLOR_ESCAPE__.save.playerProfile.avatar=1;window.__COLOR_ESCAPE__.save.playerProfile.frame=7;});await click(p,'homeProfile');await click(p,'profile.edit');await click(p,'profile.nextPage');await click(p,'profile.select.24');await click(p,'profile.frameTab');await click(p,'profile.nextPage');await click(p,'profile.select.18');
 }
 rows.push({width,language,status:'PASS',lockedClick:true,level200Ledger:true,freeSave:true,saveFaults:['reject','unknown-empty','unknown-written']});await context.close();
}assert.deepEqual(errors,[]);await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',scope:'Synthetic mainline progress, isolated MemoryHost, real Pointer. No real player save.',rows,errors,sourceSha:sha(await readFile('src/game/ColorEscapeGame.ts'))},null,2));console.log('PASS unlock profiles: four viewport/language runs');
}catch(e){await writeFile(resolve(output,'report.json'),JSON.stringify({status:'FAIL',rows,errors,error:String(e)},null,2));throw e;}finally{await browser.close();await server.close();}
