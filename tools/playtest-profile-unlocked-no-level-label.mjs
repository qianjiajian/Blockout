import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const output=resolve(`playtest-results/profile-unlocked-no-level-label-20261009-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=v=>createHash('sha256').update(v).digest('hex');
const paths=['src/game/playerProfileUi.ts','src/core/playerProfile.ts','tools/playtest-profile-unlocked-no-level-label.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha(await readFile(p))])));
const report={status:'RUNNING',scope:'Synthetic MemoryHost cleared Lv20/current Lv21. Real Pointer profile navigation, scrolling and selecting unlocked avatar15/frame9. No real storage or gameplay route.',sources:await hashes(),cases:[],errors:[]};
function html(language){return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
const initial={schemaVersion:1,currentLevel:21,highestLevel:21,coins:240,language:${JSON.stringify(language)},sound:false,music:false,haptic:false,reducedMotion:true,
collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics'],boosterUnlockSeen:['time','rocket','pulse'],featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},lifeState:{lives:5,nextLifeAtMs:0,unlimitedLivesUntilMs:0},bestStars:Object.fromEntries(Array.from({length:20},(_,i)=>[i+1,3])),rewardedLevels:Array.from({length:20},(_,i)=>i+1),playerProfile:{id:'1482757',name:'Player#148221',avatar:1,frame:7,joinedAt:1785542400000,firstTryWins:3,longestStreak:3,currentStreak:0,attempts:{},lastAttemptWon:true}};
const audit={writes:0,pointers:0},key='color-escape-save-v1';let game,frame;
class MemoryHost extends WebHost{data=new Map([[key,structuredClone(initial)]]);storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}storageSet(k,v){audit.writes++;this.data.set(k,structuredClone(v));return true;}music(){}sound(){}vibrate(){}}
const host=new MemoryHost();game=new ColorEscapeGame(host);const render=game.render;game.render=function(...args){frame={page:game.profilePage,avatar:game.profileDraftAvatar,frame:game.profileDraftFrame,texts:[],buttons:[]};audit.frame=frame;return render.apply(this,args);};
const fill=host.context.fillText;host.context.fillText=function(value,...args){if(frame&&game.profilePage)frame.texts.push({value:String(value),args});return fill.call(this,value,...args);};
const press=game.drawPressable;game.drawPressable=function(key,...args){if(frame&&game.profilePage)frame.buttons.push(key);return press.call(this,key,...args);};
host.canvas.addEventListener('pointerdown',()=>audit.pointers++,true);
window.__QA__={game,host,audit};game.start();</script>`;}
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>{const{game:g,audit}=window.__QA__,d=g.getDebugState();return{page:g.profilePage,avatar:g.profileDraftAvatar,frame:g.profileDraftFrame,saveEnabled:g.profileView().saveEnabled,profile:structuredClone(g.save.playerProfile),coins:g.save.coins,targets:d.interactionTargets.targets??d.interactionTargets,transform:d.viewportTransform,writes:audit.writes,render:structuredClone(audit.frame)};});
async function click(p,key){const s=await state(p),r=s.targets[key]?.hit;assert(r,`Missing target ${key}`);await p.mouse.click(s.transform.offsetX+(r.x+r.width/2)*s.transform.scale,s.transform.offsetY+(r.y+r.height/2)*s.transform.scale,{delay:20});}
async function point(p,x,y){const{transform:t}=await state(p),s=496/388;return{x:t.offsetX+x*s*t.scale,y:t.offsetY+(539-360*s+y*s)*t.scale};}
async function swipe(p){const a=await point(p,150,500),b=await point(p,150,345);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:8});await p.mouse.up();await p.waitForTimeout(60);}
async function capture(p,row,kind,index){await p.waitForFunction(({kind,index})=>{const{game:g,audit}=window.__QA__,f=audit.frame;return g.profilePage===kind&&f.page===kind&&f.avatar===g.profileDraftAvatar&&f.frame===g.profileDraftFrame&&(kind==='avatar'?g.profileDraftAvatar:g.profileDraftFrame)===index&&f.buttons.includes('profile.save');},{kind,index},{polling:'raf'});
 const s=await state(p);assert.equal(s.saveEnabled,true);assert(s.targets['profile.save']);assert(s.render.buttons.includes('profile.save'));assert(!s.render.texts.some(t=>/^Lv\s*\d|^通关|^通过\d|^Complete level|^Clear \d/.test(t.value)),'No catalog level text or locked footer for eligible drafts');assert(s.render.texts.some(t=>t.value==='🔒'),'Later locked appearances keep their lock corners');assert.equal(s.writes,row.baseline.writes);assert.equal(s.coins,240);assert.deepEqual(s.profile,row.baseline.profile);
 const file=resolve(output,`${row.name}-${kind}.png`);await p.screenshot({path:file});row.checks.push({kind,index,state:s,screenshot:file,sha256:sha(await readFile(file))});}
try{for(const item of[{width:320,height:568,language:'zh-CN'},{width:496,height:1078,language:'en'}]){
 const{language,...viewport}=item,row={name:`${viewport.width}x${viewport.height}-${language}`,status:'RUNNING',checks:[]};report.cases.push(row);const context=await browser.newContext({viewport,deviceScaleFactor:1});await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Persistent storage forbidden');};for(const n of['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});const p=await context.newPage();p.on('pageerror',e=>report.errors.push(`${row.name}: ${e.message}`));p.on('console',e=>{if(e.type()==='error')report.errors.push(`${row.name}: ${e.text()}`);});await p.route('**/__profile_unlocked_label_fixture__',r=>r.fulfill({contentType:'text/html',body:html(language)}));await p.goto(`${origin}/__profile_unlocked_label_fixture__`,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__QA__?.game.artReady&&window.__QA__.game.homeProfileArt);await click(p,'homeProfile');await p.waitForFunction(()=>Boolean(window.__QA__.game.profileArt));await click(p,'profile.edit');row.baseline=await state(p);await swipe(p);await click(p,'profile.select.15');await capture(p,row,'avatar',15);await click(p,'profile.frameTab');await click(p,'profile.select.9');await capture(p,row,'frame',9);
 row.storage=await p.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storage,[]);row.pointerCount=await p.evaluate(()=>window.__QA__.audit.pointers);row.status='PASS';await context.close();
}assert.deepEqual(report.errors,[]);report.sourceAfter=await hashes();report.sourceChanges=paths.filter(p=>report.sources[p]!==report.sourceAfter[p]);assert.deepEqual(report.sourceChanges,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({name:r.name,status:r.status})),failure:report.failure,output},null,2));
