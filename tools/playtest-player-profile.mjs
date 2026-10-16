import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const output=resolve('playtest-results/player-profile-20261008');await mkdir(output,{recursive:true});
const source=await readFile('src/game/ColorEscapeGame.ts');const sha=b=>createHash('sha256').update(b).digest('hex');
const errors=[],rows=[];
const fixture=(language)=>`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
const key='color-escape-save-v1';let mode='commit',game;const writes=[];
const initial={schemaVersion:1,currentLevel:6,highestLevel:6,coins:240,language:${JSON.stringify(language)},sound:false,music:false,haptic:false,reducedMotion:true,
 collectionIntroShown:true,featureSeen:['basics'],lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},bestStars:{1:3,2:3,3:3,4:3,5:3},rewardedLevels:[1,2,3,4,5],
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
 const context=await browser.newContext({viewport:{width,height:width===320?568:1078}});const p=await context.newPage();
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Persistent storage forbidden');};Storage.prototype.setItem=()=>{throw Error('Persistent storage forbidden');};});
 await p.goto(origin+'/profile-fixture?'+language);await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.homeProfileArt);
 const header=await p.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets);
 assert(header.homeProfile.visual.x<header.homeSupply.visual.x && header.homeSupply.visual.x<header.homeLife.visual.x,'Header order: avatar, coins, lives');
 await screenshot(p,`home-${width}-${language}`);await click(p,'homeProfile');assert.equal((await current(p)).page,'stats');await screenshot(p,`stats-${width}-${language}`);
 await click(p,'profile.copy');assert.equal((await current(p)).page,'stats');await click(p,'profile.edit');await screenshot(p,`avatars-${width}-${language}`);
 await click(p,'profile.select.13');await click(p,'profile.frameTab');await screenshot(p,`frames-${width}-${language}`);await click(p,'profile.select.4');
 await click(p,'profile.close');assert.equal((await current(p)).save.playerProfile.avatar,1,'Closing editor cancels unsaved selection');
 await click(p,'homeProfile');await click(p,'profile.edit');await click(p,'profile.select.13');await click(p,'profile.frameTab');await click(p,'profile.select.4');await click(p,'profile.save');
 assert.equal((await current(p)).stored.playerProfile.avatar,13);assert.equal((await current(p)).stored.playerProfile.frame,4);assert.equal((await current(p)).stored.coins,240);
 await click(p,'profile.edit');await click(p,'profile.editName');await p.locator('input').fill('so cool');await screenshot(p,`rename-${width}-${language}`);await click(p,'profile.rename');
 assert.equal((await current(p)).stored.coins,140);assert.equal((await current(p)).stored.playerProfile.name,'so cool');
 await click(p,'profile.editName');await p.locator('input').fill('so cool11');await click(p,'profile.rename');assert.equal((await current(p)).stored.coins,40);
 await click(p,'profile.editName');await p.locator('input').fill('unaffordable');await click(p,'profile.rename');assert.equal((await current(p)).save.coins,40);assert.equal((await current(p)).save.playerProfile.name,'so cool11');
 await screenshot(p,`insufficient-${width}-${language}`);await click(p,'profile.cancelRename');await click(p,'profile.save');await screenshot(p,`final-${width}-${language}`);
 await click(p,'profile.close');
 for(const fault of ['reject','unknown-empty','unknown-written']){
  await click(p,'homeProfile');await click(p,'profile.edit');await click(p,'profile.frameTab');await click(p,'profile.select.2');
  await p.evaluate(m=>window.__PROFILE_TEST__.mode(m),fault);const before=await current(p);await click(p,'profile.save');const failed=await current(p);assert.equal(failed.save.playerProfile.frame,before.save.playerProfile.frame);
  if(fault!=='reject'){assert(failed.pending);const targets=await p.evaluate(()=>Object.keys(window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets));assert.deepEqual(targets,['profile.retry']);}
  await p.evaluate(()=>window.__PROFILE_TEST__.mode('commit'));await click(p,fault==='reject'?'profile.save':'profile.retry');assert.equal((await current(p)).stored.playerProfile.frame,2);
  if(fault!=='reject'){const same=await p.evaluate(()=>{const w=window.__PROFILE_TEST__.writes;return w.at(-1).object===w.at(-2).object;});assert(same,'Unknown retry uses exact original candidate');}
  await click(p,'profile.close');
 }
 for(const fault of ['reject','unknown-empty','unknown-written']){
  // Explicit synthetic balance fixture, never a real player's storage.
  await p.evaluate(()=>{const t=window.__PROFILE_TEST__,g=window.__COLOR_ESCAPE__;g.save.coins=240;t.host.data=structuredClone(g.save);});
  await click(p,'homeProfile');await click(p,'profile.edit');await click(p,'profile.editName');await p.locator('input').fill('rename '+fault);
  await p.evaluate(m=>window.__PROFILE_TEST__.mode(m),fault);await click(p,'profile.rename');assert.equal((await current(p)).save.coins,240);
  if(fault!=='reject'){assert((await current(p)).pending);const targets=await p.evaluate(()=>Object.keys(window.__COLOR_ESCAPE__.getDebugState().interactionTargets.targets));assert.deepEqual(targets,['profile.retry']);}
  await p.evaluate(()=>window.__PROFILE_TEST__.mode('commit'));await click(p,fault==='reject'?'profile.rename':'profile.retry');assert.equal((await current(p)).stored.coins,140);
  if(fault!=='reject')assert(await p.evaluate(()=>{const w=window.__PROFILE_TEST__.writes;return w.at(-1).object===w.at(-2).object;}));
  await click(p,'profile.close');
 }
 rows.push({width,language,status:'PASS',renameTwiceCharges200:true,nineFrames:true,fifteenAvatars:true,saveFaults:['reject','unknown-empty','unknown-written']});await context.close();
}assert.deepEqual(errors,[]);assert.equal(sha(await readFile('src/game/ColorEscapeGame.ts')),sha(source),'Source unchanged during run');
await writeFile(resolve(output,'report.json'),JSON.stringify({status:'PASS',sourceSha:sha(source),scope:'Synthetic account; actual Pointer and isolated MemoryHost; header order plus appearance/rename storage faults; no real localStorage or native WeChat validation.',rows,errors},null,2));console.log('PASS profile: 4 viewport/language runs, header order, selection/cancel/save, real text input, rename 100 twice, insufficient coins, 24 appearance/rename save fault retries.');
}catch(e){await writeFile(resolve(output,'report.json'),JSON.stringify({status:'FAIL',rows,errors,error:String(e)},null,2));throw e;}finally{await browser.close();await server.close();}
