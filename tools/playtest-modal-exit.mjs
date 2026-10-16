import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// UI-only fixtures deliberately exercise presentation without changing a real save
// or claiming complete campaign play. Animation advances only through native RAF.
const output=resolve(`playtest-results/modal-exit-20261009-${Date.now()}`);
await mkdir(output,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile('docs/rules/manifest.json','utf8'));
const files=['src/game/ColorEscapeGame.ts','src/game/popupEntrance.ts','src/game/playerProfileUi.ts','src/game/leagueUi.ts','tools/playtest-modal-exit.mjs','docs/rules/manifest.json',manifest.versions.find(v=>v.version===manifest.activeVersion).document];
const bindings=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await readFile(f))])));
const group=process.env.MODAL_EXIT_GROUP??'all',only=process.env.MODAL_EXIT_ONLY??'';
const viewports=[{width:320,height:568},{width:496,height:1078}].filter(v=>!process.env.MODAL_EXIT_WIDTH||v.width===Number(process.env.MODAL_EXIT_WIDTH));
const report={status:'RUNNING',activeVersion:manifest.activeVersion,selection:{group,only,viewports},sources:await bindings(),scope:'Explicit isolated MemoryHost presentation fixtures, native Storage/IndexedDB forbidden; actual Canvas primitives/matrices/alpha, natural RAF. Synthetic closePopup coverage plus separately labelled genuine Pointer transactions/navigation. Not campaign completion or physical-device verification.',cases:[],interactions:[],errors:[]};
const initial={schemaVersion:1,currentLevel:21,highestLevel:200,coins:2000,language:'zh-CN',sound:false,music:false,haptic:false,reducedMotion:false,
 collectionIntroShown:true,collectionIntroPending:false,featureSeen:['basics','ice-door','ice-block','layer','shutter','generator','axis','key-lock','lift','star','bomb','flip-door','color-floor'],boosterUnlockSeen:['time','rocket','pulse'],boosterUsageSeen:['time','rocket','pulse'],boosters:{time:0,rocket:0,pulse:0},rewardedLevels:Array.from({length:200},(_,i)=>i+1),bestStars:{},
 journeyProgress:{claimedMilestoneLevels:Array.from({length:40},(_,i)=>(i+1)*5),seenEpisodeUnlockLevels:Array.from({length:20},(_,i)=>i*10+1)},featureGuideProgress:{version:1,pending:[],seen:['leaderboard','supply','levels','dailyChallenge','league']},lifeState:{lives:3,nextLifeAtMs:Date.now()+1800000,unlimitedLivesUntilMs:0},collectionProgress:{version:1,inspiration:150,restoredMasterpieceIds:[],seenItemIds:[],claimedMilestoneIds:[]}};
function fixture(){return `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module">
import {ColorEscapeGame} from '/src/game/ColorEscapeGame.ts';import {WebHost} from '/src/platform/WebHost.ts';
import {MASTERPIECE_COLLECTION_CATALOG} from '/src/core/collectionCatalog.ts';import {JOURNEY_MILESTONE_REWARDS,JOURNEY_EPISODES} from '/src/core/journeyProgress.ts';import {createLeague,advanceLeague,LEAGUE_PERIOD_MS} from '/src/core/league.ts';
const audit={writes:[],pointers:[],inputs:[],images:[],hands:[],closes:[],completed:[]},key='color-escape-save-v1',identities=new WeakMap();let identity=0,mode='commit',game,record=null,frame=null,stack=[],baseStack=[];
class MemoryHost extends WebHost{data=new Map([[key,${JSON.stringify(initial)}]]);hideCallbacks=[];showCallbacks=[];
 storageRead(k){return mode.startsWith('unknown')?{status:'unavailable'}:this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'}}storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f}storageSet(k,v){if(!identities.has(v))identities.set(v,++identity);audit.writes.push({key:k,value:structuredClone(v),identity:identities.get(v),mode,at:performance.now()});if(mode==='commit'||mode==='unknown-written')this.data.set(k,structuredClone(v));return mode==='commit'}
 sound(){}music(){}vibrate(){}onHide(f){super.onHide(f);this.hideCallbacks.push(f)}onShow(f){super.onShow(f);this.showCallbacks.push(f)}
 openTextInput(o){audit.inputs.push({at:performance.now(),active:game.popupEntrance.active,rect:o.rect});return super.openTextInput(o)}
 async createImage(src){const i=await super.createImage(src);audit.images.push({src,width:i.naturalWidth,height:i.naturalHeight});return i}}
const host=new MemoryHost();game=new ColorEscapeGame(host);window.__COLOR_ESCAPE__=game;
const matrix=()=>{const m=host.context.getTransform();return[m.a,m.b,m.c,m.d,m.e,m.f]},copy=x=>JSON.parse(JSON.stringify(x));
const popup=game.withPopupEntrance;game.withPopupEntrance=function(k,b,draw,...rest){const before={matrix:matrix(),alpha:this.ctx.globalAlpha};return popup.call(this,k,b,()=>{const s=this.popupEntrance.snapshot().find(s=>s.key===k),row={key:k,bounds:copy(b),before,matrix:matrix(),alpha:this.ctx.globalAlpha,state:copy(s),primitives:[]};if(frame)frame.popups.push(row);stack.push(row);try{return draw()}finally{stack.pop()}},...rest)};
const closePopup=game.closePopup;game.closePopup=function(keys,finalize){const event={keys:Array.isArray(keys)?keys:[keys],at:performance.now(),screen:this.screen,profile:this.profilePage,callbacks:0};audit.closes.push(event);const result=closePopup.call(this,keys,()=>{event.callbacks++;event.completedAt=performance.now();event.snapshot=copy(this.popupEntrance.snapshot());return finalize()});event.requestSnapshot=copy(this.popupEntrance.snapshot());return result};
for(const name of ['drawHome','drawHud','drawBoard','drawLeaguePage','drawSupply','drawLeaderboard','drawLevels','drawCollectionPage']){const fn=game[name];game[name]=function(...args){const row={name,matrix:matrix(),alpha:this.ctx.globalAlpha,primitives:[]};if(frame)frame.bases.push(row);baseStack.push(row);try{return fn.apply(this,args)}finally{baseStack.pop()}}}
for(const name of ['drawImage','fillText','fillRect','fill']){const fn=host.context[name];host.context[name]=function(...args){if(name==='drawImage'&&args[0]===game.art.tutorialHand)audit.hands.push({phase:game.featureUnlockGuide?.phase,matrix:matrix(),alpha:this.globalAlpha,stack:stack.map(s=>s.key)});const target=stack.at(-1)??baseStack.at(-1);if(target&&target.primitives.length<6){const source=name==='drawImage'?String(args[0]?.src??''):name==='fillText'?String(args[0]):null;target.primitives.push({op:name,source,args:args.slice(name==='drawImage'||name==='fillText'?1:0).filter(a=>typeof a==='number'),matrix:matrix(),alpha:this.globalAlpha})}return fn.apply(this,args)}}
const render=game.render;game.render=function(...args){frame=record?{at:performance.now(),screen:this.screen,profile:this.profilePage,guide:this.featureUnlockGuide?.phase,popups:[],bases:[]}:null;try{return render.apply(this,args)}finally{if(frame&&record){frame.snapshot=copy(this.popupEntrance.snapshot());frame.active=this.popupEntrance.active;const targets=this.getDebugState().interactionTargets;frame.targetCount=Object.keys(targets.targets??targets).length;record.frames.push(frame);const s=frame.popups.find(s=>s.key===record.key&&s.state.phase===record.phase)?.state;const stage=s?(s.age>=.32?'end':s.age>=.12&&s.age<=.17?'peak':s.age>=.22?'fading':s.age<=.09?'start':null):null;if(stage&&!record.captures.some(c=>c.stage===stage))record.captures.push({stage,at:frame.at,state:s,dataUrl:host.canvas.toDataURL('image/png')});if(record.frames.length>300)record.frames.shift()}frame=null}};
for(const type of ['pointerdown','pointerup'])host.canvas.addEventListener(type,e=>{const event={type,x:e.clientX,y:e.clientY,active:game.popupEntrance.active,exiting:game.popupEntrance.snapshot().some(s=>s.phase==='exit'),screen:game.screen,at:performance.now(),writesBefore:audit.writes.length};audit.pointers.push(event);queueMicrotask(()=>{event.writesAfter=audit.writes.length;event.screenAfter=game.screen})},true);
window.__MODALS__={host,audit,mode:m=>mode=m,catalog:MASTERPIECE_COLLECTION_CATALOG,rewards:JOURNEY_MILESTONE_REWARDS,episodes:JOURNEY_EPISODES,seasonFixture:()=>advanceLeague(createLeague(Date.now()-LEAGUE_PERIOD_MS,1519,0),Date.now()),arm(k,phase='exit'){record={key:k,phase,frames:[],captures:[]};return record},get(){return record},stop(){record=null},hide(){host.hideCallbacks.forEach(f=>f())},show(){host.showCallbacks.forEach(f=>f())},reset(){
 mode='commit';
 game.closeProfileInput?.();game.closeProfileInput=undefined;game.profileInputAfterEntrance=false;
 for(const k of ['profilePage','collectionIntro','featureUnlockGuide','journeyPresentation','temporaryLevelSelector','boosterPurchase','pendingBoosterPurchase','pendingProfileSave','pendingFeatureGuideAck','pendingLifeRefill','pendingSettlement','pendingSettlementAbandon','navigationTransition','navigationPendingTarget','homeCoinFlight','dailyChallengeWin','featureLockFeedback','boosterUnlockGuide','boosterUnlockToast'])game[k]=undefined;
 game.screen='home';game.lifeRefillOpen=false;game.leagueInfo=false;game.leagueIntroPage=undefined;game.leagueChallengeNotice=false;game.storageBaselineReady=true;game.save.featureGuideProgress.pending=[];game.save.activeRun=undefined;host.data.set(key,structuredClone(game.save));game.dirty=true;game.scheduleFrame();
 }};game.start();</script>`;}
const scenarios=[
 ['settings',"g.screen='settings'"],['language',"g.screen='language'"],['resetConfirm',"g.screen='resetConfirm'"],['updates',"g.openUpdateNotice('home')"],
 ['dailyTasks','g.openDailyTasks()'],['dailyChallenge','g.openDailyChallenge()'],['achievements',"g.screen='achievements';g.requestAchievementArt()"],
 ['mechanismGuide',"g.screen='mechanismGuide';g.setFormalPageIntent('records');g.requestCollectionAlbumArt()"],
 ['collection.detail',"g.screen='records';g.setFormalPageIntent('records');g.collectionAlbumTab='masterpieces';g.collectionAlbumDetailId=x.catalog[0].id;g.requestCollectionAlbumArtwork()"],
 ['collectionIntro',"g.collectionIntro={level:5,itemId:x.catalog[0].id,age:0};g.requestCollectionAlbumArtwork()"],
 ['featureUnlock',"g.featureUnlockGuide={feature:'leaderboard',phase:'reveal',age:0};g.ensureTutorialHand()"],
 ['journeyPresentation',"g.screen='levels';g.setFormalPageIntent('levels');g.openJourneyReward(x.rewards[0]);g.requestJourneyPresentationArt()"],
 ['journeySceneLoading',"g.journeyPresentation={event:{type:'episode_unlock',level:x.episodes[1].unlockLevel,episode:x.episodes[1]},phase:'progress',age:0,intent:'progress_event',sceneReveal:true};g.journeyHomeThemeFailed=true;g.journeyHomeThemeIndex=1"],
 ['pause',"g.loadLevel(21,false);g.screen='paused'"],['feature',"g.loadLevel(6,false);g.screen='feature'"],
 ['win',"g.loadLevel(21,false);g.screen='win';g.winCoinReward=20;g.requestWinArt()"],
 ['win',"g.loadLevel(21,false);g.dailyChallengeWin={difficulty:1,coins:50,inspiration:20};g.screen='win';g.requestWinArt()",'daily-success'],
 ['failed',"g.loadLevel(21,false);g.screen='failed'"],['settlementFailed',"g.loadLevel(21,false);g.screen='settlementFailed';g.settlementFailureKind='rejected'"],
 ['boosterPurchase',"g.loadLevel(21,false);g.screen='playing';g.openBoosterPurchase('time')"],['lifeRefill','g.openLifeRefill()'],
 ['storageUnavailable','g.storageBaselineReady=false'],['temporaryLevelSelector','g.openTemporaryLevelSelector()'],
 ['profile','g.openProfile()'],['profile.rename',"g.openProfile();g.profilePage='rename';g.profileInputAfterEntrance=true"],
 ['league.info',"g.openLeague();g.leagueIntroPage=undefined;g.leagueInfo=true"],
];
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState(),x=window.__MODALS__;return{screen:g.screen,profile:g.profilePage,guide:g.featureUnlockGuide?structuredClone(g.featureUnlockGuide):null,leagueInfo:g.leagueInfo,inputOpen:!!g.closeProfileInput,visible:g.appVisible,active:g.popupEntrance.active,snapshot:g.popupEntrance.snapshot(),targets:d.interactionTargets.targets??d.interactionTargets,transform:d.viewportTransform,remaining:g.model.snapshot().remainingSeconds,save:structuredClone(g.save),stored:structuredClone(x.host.data.get('color-escape-save-v1')),writes:x.audit.writes.length,closes:structuredClone(x.audit.closes),completed:structuredClone(x.audit.completed)}});
async function evaluate(p,code){return p.evaluate(code=>{const g=window.__COLOR_ESCAPE__,x=window.__MODALS__;eval(code);g.dirty=true;g.scheduleFrame()},code)}
async function ready(p,key){await p.waitForFunction(key=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&!g.popupEntrance.active&&(!key||g.popupEntrance.snapshot().some(s=>s.key===key&&s.phase==='idle'))},key,{timeout:60000})}
async function reset(p){await p.evaluate(()=>window.__MODALS__.reset());await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.popupEntrance.snapshot().length);await p.waitForTimeout(40)}
async function point(p,r){const s=await state(p),b=await p.locator('canvas').boundingBox(),t=s.transform;await p.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:12})}
async function click(p,key){const s=await state(p),r=s.targets[key]?.hit;assert(r,`Missing actual target ${key}`);await point(p,r)}
async function screenshot(p,row,label){const file=resolve(output,`${row.name}-${label}.png`);await p.screenshot({path:file});row.images.push({stage:label,file,sha256:sha(await readFile(file))})}
async function capture(p,row){const data=await p.evaluate(()=>window.__MODALS__.get());for(const c of data.captures){const file=resolve(output,`${row.name}-${c.stage}.png`);await writeFile(file,Buffer.from(c.dataUrl.split(',')[1],'base64'));row.images.push({stage:c.stage,file,sha256:sha(await readFile(file)),state:c.state});delete c.dataUrl}row.record=data;return data}
const close=(a,b,why)=>assert(Math.abs(a-b)<2e-4,`${why}: ${a} != ${b}`);
function verify(row){
 const frames=row.record.frames,draws=frames.flatMap(f=>f.popups.filter(p=>p.key===row.key&&p.state.phase==='exit'));assert(draws.length,`No real exit drawing: ${row.key}`);const first=draws[0],last=draws.at(-1);
 assert(first.state.age<=.09,'Exit starts before the peak');close(last.state.age,.32,'Transparent terminal frame rendered');close(last.state.scale,.8,'Exit final scale');close(last.state.alpha,0,'Exit final alpha');
 assert(Math.max(...draws.map(d=>d.state.scale))>1.09,'Natural 110 percent peak');assert(draws.some(d=>d.state.age>.17&&d.state.age<.32&&d.state.alpha>0&&d.state.alpha<1),'Natural shrink/fade frame');
 for(const d of draws){const a=d.state.age,t=Math.min(1,a/.14),q=Math.max(0,Math.min(1,(a-.14)/.18)),smooth=q*q*(3-2*q),alpha=a<=.14?1:1-smooth,scale=a<=.14?1+.1*(1-(1-t)**3):1.1-.3*smooth;close(d.state.scale,scale,'Requested 100→110→80 timeline');close(d.state.alpha,alpha,'Fade only during shrink');
  const m=d.matrix,b=d.before.matrix,s=d.state.scale,cx=d.bounds.x+d.bounds.width/2,cy=d.bounds.y+d.bounds.height/2;close(m[0],b[0]*s,'Canvas scale x');close(m[3],b[3]*s,'Canvas scale y');close(m[4],b[4]+(1-s)*(b[0]*cx+b[2]*cy),'Canvas center x');close(m[5],b[5]+(1-s)*(b[1]*cx+b[3]*cy),'Canvas center y');close(d.alpha,d.before.alpha*d.state.alpha,'Canvas alpha');assert(d.primitives.length,'Actual drawing required');for(const primitive of d.primitives)assert(primitive.alpha<=d.alpha+2e-5,'Primitive must inherit exit opacity');
 }
 for(const f of frames.filter(f=>f.snapshot.some(s=>s.phase==='exit')))assert.equal(f.targetCount,0,'Exit input targets gated');
 const bases=new Map();for(const f of frames.filter(f=>f.snapshot.some(s=>s.key===row.key&&s.phase==='exit')))for(const b of f.bases){if(!bases.has(b.name))bases.set(b.name,b);else{assert.deepEqual(b.matrix,bases.get(b.name).matrix,`${b.name} underneath stays fixed`);close(b.alpha,bases.get(b.name).alpha,`${b.name} underneath opacity`)}}
 row.summary={frames:frames.length,draws:draws.length,underlying:[...bases.keys()],first:first.state,last:last.state};
}
async function checkpoint(){await writeFile(resolve(output,'checkpoint.json'),JSON.stringify(report,null,2)+'\n')}
async function prepare(p,code,key){await reset(p);await evaluate(p,`g.save.reducedMotion=false;${code}`);await ready(p,key)}
async function sample(p,viewport,[key,code,label],reduced=false){
 const row={name:`${viewport.width}-synthetic-${label??key}${reduced?'-reduced':''}`,key,reduced,trigger:'Explicit closePopup callback fixture',status:'RUNNING',images:[]};report.cases.push(row);
 try{await prepare(p,code,key);const before=await state(p);row.before=before;
  await evaluate(p,`g.save.reducedMotion=${reduced};x.arm(${JSON.stringify(key)});g.closePopup(${JSON.stringify(key)},()=>{x.audit.completed.push({key:${JSON.stringify(key)},at:performance.now()});x.reset()})`);
  await p.waitForFunction(n=>window.__MODALS__.audit.completed.length===n+1,before.completed.length);await p.waitForTimeout(50);await capture(p,row);row.after=await state(p);
  assert.equal(row.after.completed.length,before.completed.length+1);assert(!row.after.snapshot.some(s=>s.key===key));assert.equal(row.after.closes.at(-1).callbacks,1);
  if(reduced){assert.equal(row.record.frames.flatMap(f=>f.popups.filter(s=>s.state.phase==='exit')).length,0);await screenshot(p,row,'immediate-final')}else verify(row);
  row.status='PASS';
 }catch(e){row.status='FAIL';row.error=e.stack;row.after=await state(p).catch(()=>null);await capture(p,row).catch(()=>{});throw e}finally{await checkpoint()}
}
async function realExit(p,viewport,name,key,target,{checkDuring,checkAfter,repeat=true}={}){
 const row={name:`${viewport.width}-pointer-${name}`,key,trigger:`Real Pointer ${target}`,status:'RUNNING',images:[]};report.interactions.push(row);
 try{await ready(p,key);row.before=await state(p);const rect=row.before.targets[target]?.hit;assert(rect,`Target ${target}`);const box=await p.locator('canvas').boundingBox(),t=row.before.transform,cx=box.x+t.offsetX+(rect.x+rect.width/2)*t.scale,cy=box.y+t.offsetY+(rect.y+rect.height/2)*t.scale,pointerStart=await p.evaluate(()=>window.__MODALS__.audit.pointers.length);await evaluate(p,`x.arm(${JSON.stringify(key)})`);await p.mouse.click(cx,cy,{delay:12});
  await p.waitForFunction(key=>window.__COLOR_ESCAPE__.popupEntrance.snapshot().some(s=>s.key===key&&s.phase==='exit'),key);
  if(repeat){await p.mouse.click(cx,cy,{delay:12});await p.mouse.click(cx,cy,{delay:12})}
  row.during=await state(p);assert.equal(Object.keys(row.during.targets).length,0);if(checkDuring)await checkDuring(row.during,row.before);
  row.pointers=await p.evaluate(n=>window.__MODALS__.audit.pointers.slice(n),pointerStart);if(repeat){const gated=row.pointers.filter(e=>e.exiting);assert(gated.length>=4,'Both genuine repeated Pointer clicks land during exit');for(const e of gated)assert.equal(e.writesAfter,e.writesBefore,'Synchronous Pointer dispatch must not repeat a transaction')}
  await p.waitForFunction(key=>!window.__COLOR_ESCAPE__.popupEntrance.snapshot().some(s=>s.key===key&&s.phase==='exit'),key);await p.waitForTimeout(70);await capture(p,row);verify(row);row.after=await state(p);const closes=row.after.closes.slice(row.before.closes.length);assert.equal(closes.length,1,'Single close request');assert.equal(closes[0].callbacks,1,'Exactly one finalizer');if(checkAfter)await checkAfter(row.after,row.before,row.during);await screenshot(p,row,'after');row.status='PASS';
 }catch(e){row.status='FAIL';row.error=e.stack;row.after=await state(p).catch(()=>null);await capture(p,row).catch(()=>{});throw e}finally{await checkpoint()}
 return row;
}
async function pointerBasics(p,viewport){
 await prepare(p,"g.screen='settings'",'settings');await realExit(p,viewport,'settings-back','settings','menuBack',{checkDuring:s=>assert.equal(s.screen,'settings'),checkAfter:s=>assert.equal(s.screen,'home')});
 await prepare(p,"g.screen='resetConfirm'",'resetConfirm');await realExit(p,viewport,'nested-reset-cancel','resetConfirm','modalSecondary',{checkDuring:s=>{assert.equal(s.screen,'resetConfirm');const parent=s.snapshot.find(s=>s.key==='settings');assert.equal(parent.phase,'idle');close(parent.scale,1,'Parent stable during child exit')},checkAfter:s=>{assert.equal(s.screen,'settings');assert.equal(s.snapshot.find(s=>s.key==='settings').phase,'idle')}});
 await prepare(p,'g.openProfile()','profile');await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.profileArt);await realExit(p,viewport,'profile-close','profile','profile.close',{checkDuring:s=>assert.equal(s.profile,'stats'),checkAfter:s=>assert.equal(s.profile,undefined)});
 await prepare(p,"g.openProfile();g.profilePage='avatar'",'profile');await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.profileArt);await click(p,'profile.editName');await ready(p,'profile.rename');await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.closeProfileInput);await realExit(p,viewport,'rename-cancel','profile.rename','profile.cancelRenameBottom',{checkDuring:s=>{assert.equal(s.profile,'rename');assert.equal(s.inputOpen,false);close(s.snapshot.find(s=>s.key==='profile').scale,1,'Parent profile stays fixed')},checkAfter:s=>assert.equal(s.profile,'avatar')});
 await prepare(p,"g.openLeague();g.leagueIntroPage=undefined;g.leagueInfo=true",'league.info');await realExit(p,viewport,'league-detail-close','league.info','league.dismiss',{checkDuring:s=>assert.equal(s.leagueInfo,true),checkAfter:s=>{assert.equal(s.leagueInfo,false);assert.equal(s.screen,'league')}});
}
async function pointerGuide(p,viewport){
 await prepare(p,"g.save.featureGuideProgress.pending=['leaderboard'];g.save.featureGuideProgress.seen=g.save.featureGuideProgress.seen.filter(s=>s!=='leaderboard');x.audit.hands=[];g.beginPendingFeatureGuide()",'featureUnlock');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().featureUnlockGuide.ready);
 const row=await realExit(p,viewport,'feature-look','featureUnlock','featureGuide.look',{checkDuring:async(s,b)=>{assert.equal(s.guide.phase,'reveal');assert.equal(s.writes,b.writes);assert.equal(await p.evaluate(()=>window.__MODALS__.audit.hands.length),0)},checkAfter:(s,b)=>{assert.equal(s.guide.phase,'focus');assert.equal(s.writes,b.writes)}});
 await p.waitForFunction(()=>window.__MODALS__.audit.hands.some(h=>h.phase==='focus'));row.hands=await p.evaluate(()=>window.__MODALS__.audit.hands);assert(row.hands.every(h=>h.stack.length===0));assert(row.record.frames.filter(f=>f.popups.some(p=>p.state.phase==='exit')).every(f=>f.guide==='reveal'));await screenshot(p,row,'hand-after-exit');
}
async function pointerBooster(p,viewport,fault){
 await prepare(p,"g.save.coins=2000;g.save.boosters.time=0;x.host.data.set('color-escape-save-v1',structuredClone(g.save));g.loadLevel(21,false);g.screen='playing';g.openBoosterPurchase('time')",'boosterPurchase');await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.boosterPurchaseArt);
 let failed;const baseline=await state(p),writeStart=baseline.writes;
 if(fault){await evaluate(p,`x.mode(${JSON.stringify(fault)});x.arm('boosterPurchase')`);await click(p,'boosterPurchase.buy');await p.waitForTimeout(420);failed=await state(p);assert.equal(failed.screen,'boosterPurchase');assert.equal(failed.save.coins,2000);assert.equal(failed.save.boosters.time,0);assert(failed.snapshot.every(s=>s.phase!=='exit'),'Unconfirmed save must not start exit');assert.equal(failed.closes.length,baseline.closes.length);assert(await p.evaluate(()=>window.__MODALS__.get().frames.every(f=>f.popups.every(p=>p.state.phase!=='exit'))));await evaluate(p,"x.mode('commit')")}
 const row=await realExit(p,viewport,fault?'booster-'+fault+'-retry':'booster-purchase','boosterPurchase','boosterPurchase.buy',{checkDuring:s=>{assert.equal(s.screen,'boosterPurchase');assert.equal(s.save.coins,1700);assert.equal(s.save.boosters.time,1)},checkAfter:s=>{assert.equal(s.screen,'playing');assert.equal(s.save.coins,1700);assert.equal(s.save.boosters.time,1)}});
 row.failed=failed;row.transactionWrites=await p.evaluate(n=>window.__MODALS__.audit.writes.slice(n),writeStart);if(fault){assert.equal(new Set(row.transactionWrites.map(w=>JSON.stringify(w.value))).size,1,'Retry keeps the exact candidate');if(fault.startsWith('unknown'))assert.equal(new Set(row.transactionWrites.map(w=>w.identity)).size,1,'Unknown retry preserves candidate object')}
}
async function pointerPlay(p,viewport){
 await prepare(p,"g.loadLevel(21,false);g.model.startCountdown();g.screen='paused'",'pause');const paused=await realExit(p,viewport,'pause-resume','pause','pauseResume',{checkDuring:(s,b)=>{assert.equal(s.screen,'paused');close(s.remaining,b.remaining,'Clock frozen through exit')},checkAfter:s=>assert.equal(s.screen,'playing')});await p.waitForTimeout(250);assert((await state(p)).remaining<paused.after.remaining-.05,'Clock resumes after exit');
 await prepare(p,'g.openDailyChallenge()','dailyChallenge');await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.dailyChallengeArt);const daily=await realExit(p,viewport,'daily-confirm','dailyChallenge','dailyChallenge.1',{checkDuring:(s,b)=>{assert.equal(s.screen,'dailyChallenge');assert(s.save.activeRun?.daily);assert(s.stored.activeRun?.daily);assert.equal(s.save.dailyChallenge.attemptsRemaining,b.save.dailyChallenge.attemptsRemaining-1)},checkAfter:(s,b,d)=>{assert.equal(s.screen,'playing');assert.equal(s.save.activeRun.daily,true);assert.equal(s.save.activeRun.dailyChallengeSourceLevelId,d.save.activeRun.dailyChallengeSourceLevelId);assert.equal(s.save.currentLevel,b.save.currentLevel);assert.equal(s.save.lifeState.lives,b.save.lifeState.lives)}});daily.journal=daily.after.save.activeRun;
 await prepare(p,"g.loadLevel(21,false);g.screen='win';g.winCoinReward=0;g.requestWinArt()",'win');await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.winArt);await realExit(p,viewport,'win-confirm-home','win','modalPrimary',{checkDuring:s=>assert.equal(s.screen,'win'),checkAfter:s=>assert.equal(s.screen,'home')});
}
async function lifecycle(p,viewport){
 await prepare(p,"g.screen='settings'",'settings');const row={name:`${viewport.width}-lifecycle-hidden`,key:'settings',trigger:'Real Pointer plus host hide/show callbacks',status:'RUNNING',images:[]};report.interactions.push(row);try{await evaluate(p,"x.arm('settings')");await click(p,'menuBack');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.popupEntrance.snapshot().some(s=>s.phase==='exit'));await p.evaluate(()=>window.__MODALS__.hide());row.hidden=await state(p);await p.waitForTimeout(420);row.waiting=await state(p);assert.deepEqual(row.waiting.snapshot,row.hidden.snapshot);assert.equal(row.waiting.screen,'settings');await p.evaluate(()=>window.__MODALS__.show());await p.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='home');await capture(p,row);verify(row);row.after=await state(p);row.status='PASS'}catch(e){row.status='FAIL';row.error=e.stack;throw e}finally{await checkpoint()}
}
const pointerGroups={basics:pointerBasics,guide:pointerGuide,play:pointerPlay,lifecycle};
try{
 for(const viewport of viewports){const context=await browser.newContext({viewport,deviceScaleFactor:1});await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('Persistent storage forbidden')};for(const k of ['open','deleteDatabase'])indexedDB[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('Persistent database forbidden')}});const p=await context.newPage();p.on('pageerror',e=>report.errors.push({viewport,error:e.message}));await p.route('**/__modal_fixture__',r=>r.fulfill({contentType:'text/html',body:fixture()}));
  try{await p.goto(origin+'/__modal_fixture__');await ready(p);
   if(group==='all'||group==='draw'){for(const s of scenarios.filter(s=>!only||(s[2]??s[0])===only))await sample(p,viewport,s);if(!only)for(const key of ['settings','profile.rename','featureUnlock'])await sample(p,viewport,scenarios.find(s=>s[0]===key),true)}
   for(const [name,run]of Object.entries(pointerGroups))if(group==='all'||group===name)await run(p,viewport);
   if(group==='all'||group==='booster')for(const fault of [undefined,'reject','unknown-written','unknown-unwritten'])await pointerBooster(p,viewport,fault);
   assert.deepEqual(await p.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);
  }finally{await context.close()}
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1}finally{report.sourceAfter=await bindings();report.sourceChanges=files.filter(f=>report.sources[f]!==report.sourceAfter[f]);if(report.sourceChanges.length){report.status='FAIL';report.failure=(report.failure??'')+' Bound source drift: '+report.sourceChanges.join(',');process.exitCode=1}await browser.close();await server.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n')}
console.log(JSON.stringify({status:report.status,output,cases:report.cases.map(c=>({name:c.name,status:c.status})),interactions:report.interactions.map(c=>({name:c.name,status:c.status})),failure:report.failure},null,2));
