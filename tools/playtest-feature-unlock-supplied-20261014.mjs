import assert from 'node:assert/strict';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Reuse only the isolated seed/MemoryHost fixture from the historical runner.
// Never execute that runner and never access persistent player Storage.
const output=resolve(process.env.FEATURE_UI_OUTPUT??`playtest-results/feature-unlock-supplied-20261014/run-${Date.now()}`);
const prefix=process.env.FEATURE_UI_PREFIX??'/assets/art/ui/formal-pages/feature-unlock-supplied-v1/';
const features=[{id:'leaderboard',level:6,name:'排行'},{id:'supply',level:8,name:'商店'},
 {id:'levels',level:10,name:'旅程'},{id:'dailyChallenge',level:15,name:'每日挑战'},{id:'league',level:20,name:'荣耀联赛'}];
const helperPath='tools/playtest-feature-unlock-card-restored.mjs',helper=await readFile(helperPath,'utf8');
const a=helper.indexOf('function seed('),b=helper.indexOf('const server=',a);
assert(a>=0&&b>a,'Known isolated helper boundaries');
const {seed,fixture:baseFixture}=new Function('features',helper.slice(a,b)+';return {seed,fixture};')(features);
const sha=x=>createHash('sha256').update(x).digest('hex');
async function bindings(){
 const files=[helperPath,'tools/playtest-feature-unlock-supplied-20261014.mjs','docs/rules/manifest.json'];
 async function visit(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())await visit(p);else files.push(p);}}
 await visit('src');await visit('public'+prefix.slice(0,-1));return Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(p))])));
}
function fixture(initial,{resourceMode='normal'}={}){
 const source=baseFixture(initial),needle='game.start();';assert.equal(source.split(needle).length,2);
 return source.replace(needle,`
const suppliedPrefix=${JSON.stringify(prefix)},resourceMode=${JSON.stringify(resourceMode)};
const supplied={frame:[],requests:[],released:[],injected:[],blocks:[],failuresLeft:resourceMode==='error'?1:0,hold:resourceMode==='loading',chrome:[],phaseFrames:[]};
window.__SUPPLIED__=supplied;
host.resolveLeaderboardProvince=async()=>({province:'广东',source:'random'});
const create=host.createImage.bind(host);
host.createImage=async function(src){const path=new URL(src,location.href).pathname;if(path.startsWith(suppliedPrefix)){
 supplied.requests.push({src:path,feature:game.featureUnlockGuide?.feature,phase:game.featureUnlockGuide?.phase});
 if(supplied.hold)await new Promise(resolve=>supplied.blocks.push(resolve));
 if(supplied.failuresLeft>0){supplied.failuresLeft--;supplied.injected.push({src:path,kind:'one-native-image-rejection'});throw Error('QA synthetic supplied image failure');}
 }return create(src);};
supplied.releaseLoading=()=>{supplied.hold=false;for(const resolve of supplied.blocks.splice(0))resolve();};
const releaseImage=host.releaseImage?.bind(host);host.releaseImage=function(image){const src=new URL(image.currentSrc||image.src,location.href).pathname;if(src.startsWith(suppliedPrefix))supplied.released.push(src);return releaseImage?.(image);};
const ctx=host.context,observedImageDraw=ctx.drawImage,gameRender=game.render;
ctx.drawImage=function(image,...args){if(drawingGuide&&image instanceof HTMLImageElement){const m=this.getTransform();supplied.frame.push({src:new URL(image.currentSrc||image.src,location.href).pathname,args,width:image.naturalWidth,height:image.naturalHeight,alpha:this.globalAlpha,matrix:{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f},phase:game.featureUnlockGuide?.phase});}return observedImageDraw.call(this,image,...args);};
game.render=function(...args){supplied.frame=[];const result=gameRender.apply(this,args);return result;};
game.start();`);
}
const state=p=>p.evaluate(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState(),x=window.__RESTORED__,s=window.__SUPPLIED__;return{
 screen:g.screen,guide:d.featureUnlockGuide,targets:d.interactionTargets.targets??d.interactionTargets,transform:d.viewportTransform,
 save:structuredClone(g.save),stored:structuredClone(x.host.data.get('color-escape-save-v1')),writes:x.audit.writes.length,audit:structuredClone(x.audit),
 supplied:{frame:structuredClone(s.frame),requests:structuredClone(s.requests),released:structuredClone(s.released),injected:structuredClone(s.injected),waiting:s.blocks.length,liveArt:Boolean(g.featureUnlockArt)},storageViolations:window.__STORAGE_VIOLATIONS__};});
const economy=s=>({coins:s.coins,boosters:s.boosters,highest:s.highestLevel,current:s.currentLevel,rewards:s.rewardedLevels,inspiration:s.collectionProgress.inspiration,daily:s.dailyChallenge,lives:s.lifeState});
async function point(p,x,y){const s=await state(p),b=await p.locator('canvas').boundingBox(),t=s.transform;return{x:b.x+t.offsetX+x*t.scale,y:b.y+t.offsetY+y*t.scale};}
async function down(p,key){await p.waitForFunction(k=>{const t=window.__COLOR_ESCAPE__?.getDebugState().interactionTargets;return Boolean(t&&(t.targets??t)[k]);},key);const s=await state(p),r=s.targets[key].hit,q=await point(p,r.x+r.width/2,r.y+r.height/2);await p.mouse.move(q.x,q.y);await p.mouse.down();await p.waitForTimeout(75);}
async function click(p,key){await down(p,key);await p.mouse.up();}
async function outside(p){const q=await point(p,8,180);await p.mouse.click(q.x,q.y);}
async function ready(p,phase='reveal'){await p.waitForFunction(phase=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return g?.artReady&&d.featureUnlockGuide?.phase===phase&&d.featureUnlockGuide.ready;},phase,{timeout:60000});}
async function entered(p,feature){await p.waitForFunction(feature=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return g.screen===feature&&!g.navigationTransition&&(feature==='league'?d.league.artReady&&g.leagueAvatarArtStore?.art:feature==='dailyChallenge'?d.dailyChallenge.art.ready:g.formalPageReady(feature));},feature,{timeout:30000});}
const guideKeys=s=>Object.keys(s.targets).filter(k=>k.startsWith('featureGuide.'));
async function snap(p,row,label){const file=resolve(output,`${row.name}-${label}.png`);await p.screenshot({path:file});const s=await state(p);row.images.push({label,file,sha256:sha(await readFile(file)),frame:s.supplied.frame,guide:s.guide});}
function checkCard(s){
 assert.equal(s.screen,'home');assert.equal(s.guide.phase,'reveal');assert(s.supplied.frame.some(d=>d.src.startsWith(prefix)&&d.alpha>.9),'Supplied PNGs are actually drawn');
 assert(s.guide.art.ready&&!s.guide.art.loading&&!s.guide.art.error,'Supplied group reaches ready');
 const title=s.save.language==='zh-CN'?'title-zh.png':s.save.language==='en'?'title-en.png':null;
 if(title)assert(s.supplied.frame.some(d=>d.src===prefix+title&&d.alpha>.9),'Localized supplied title PNG is actually drawn');
 if(s.save.language==='zh-CN')assert(s.audit.labels.some(l=>l.value===features.find(f=>f.id===s.guide.feature).name),'Correct dynamic feature name is drawn');
 if(s.guide.feature==='leaderboard')assert(s.supplied.frame.some(d=>d.src===prefix+'rank-icon.png'&&d.alpha>.9),'Leaderboard uses supplied trophy PNG');
 assert.equal(s.audit.panels.length,0,'Supplied card never invokes drawChromePanel');
 assert(!s.audit.labels.some(l=>l.value==='新功能解锁'),'Title is an actual supplied PNG, not a replacement Canvas label');
 assert.equal(s.audit.hands.length,0,'No hand before Take a Look');
 for(const key of ['panel','glow','sparkles','divider','button','later-line'])assert(s.supplied.frame.some(d=>d.src===prefix+key+'.png'),'Required slice drawn: '+key);
}
await mkdir(output,{recursive:true});
const report={status:'RUNNING',scope:'Current Web source; synthetic completed-progress fixtures in isolated MemoryHost; real Pointer and natural RAF. No puzzle-solving, real Storage, WeChat build or physical-device claim.',prefix,sources:await bindings(),cases:[]};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
async function run(viewport,feature,{action='entry',fault,reduced=false,resourceMode='normal',noPending=false,language='zh-CN'}={}){
 const row={name:`${viewport.width}-${feature.id}-${action}${fault?'-'+fault:''}${resourceMode!=='normal'?'-'+resourceMode:''}${noPending?'-no-pending':''}${language==='zh-CN'?'':'-'+language}`,status:'RUNNING',feature,action,fault,reduced,resourceMode,noPending,language,images:[],errors:[]};report.cases.push(row);
 const context=await browser.newContext({viewport,deviceScaleFactor:1}),p=await context.newPage();let currentSeed=seed(feature,reduced);
 currentSeed.language=language;
 if(noPending){currentSeed.featureGuideProgress.pending=[];currentSeed.featureGuideProgress.seen.push(feature.id);}
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('Persistent storage forbidden');};for(const k of ['open','deleteDatabase'])indexedDB[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('Persistent database forbidden');};});
 p.on('pageerror',e=>row.errors.push(e.message));p.on('console',e=>{if(e.type()==='error')row.errors.push(e.text());});
 await p.route('**/*',r=>r.request().url()===origin+'/__feature_supplied_fixture__'?r.fulfill({contentType:'text/html',body:fixture(currentSeed,{resourceMode})}):r.request().url().startsWith(origin)||r.request().url().startsWith('data:')?r.continue():r.abort());
 try{
  await p.goto(origin+'/__feature_supplied_fixture__',{waitUntil:'domcontentloaded'});
  if(noPending){await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__.storageBaselineReady);await p.waitForTimeout(1000);const s=await state(p);assert(!s.guide.active);assert.equal(s.supplied.requests.length,0,'No pending guide must not load the lazy group');assert.deepEqual(s.storageViolations,[]);assert.deepEqual(row.errors,[]);row.supplied=s.supplied;row.storageViolations=s.storageViolations;row.status='PASS';return;}
  if(resourceMode!=='normal'){
   await p.waitForFunction(()=>window.__SUPPLIED__?.requests.length>0);
   if(resourceMode==='error')await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().featureUnlockGuide.art.error);
   await p.waitForTimeout(300);
   let s=await state(p);row.resourceBefore=s;assert(s.stored.featureGuideProgress.pending.includes(feature.id));assert(!s.stored.featureGuideProgress.seen.includes(feature.id));
   assert.equal(s.guide.art.ready,false);assert.equal(s.guide.age,0,'Animation clock waits for complete art');
   assert(resourceMode==='loading'?s.guide.art.loading:s.guide.art.error,'Resource fault is exposed accurately');
   assert(!guideKeys(s).includes('featureGuide.look')&&!guideKeys(s).includes('featureGuide.later'),'Incomplete art cannot acknowledge or advance');await snap(p,row,resourceMode);
   if(resourceMode==='loading'){assert(s.supplied.waiting>0);await p.evaluate(()=>window.__SUPPLIED__.releaseLoading());}
   else {await click(p,process.env.FEATURE_UI_ART_RETRY_KEY??'featureGuide.artRetry');}
  }
  await ready(p);await p.waitForTimeout(400);let s=await state(p),baseline=s;row.before={guide:s.guide,save:s.save};checkCard(s);
  assert.equal(s.guide.feature,feature.id);assert.deepEqual(guideKeys(s),['featureGuide.look','featureGuide.later']);assert(s.stored.featureGuideProgress.pending.includes(feature.id));assert(!s.stored.featureGuideProgress.seen.includes(feature.id));
  await snap(p,row,'card');await outside(p);assert.equal((await state(p)).guide.phase,'reveal');assert.equal((await state(p)).writes,s.writes);
  await down(p,'featureGuide.look');assert.equal((await state(p)).writes,s.writes,'Pointerdown cannot acknowledge');await snap(p,row,'look-pressed');await p.mouse.move(1,1,{steps:3});await p.mouse.up();assert.equal((await state(p)).guide.phase,'reveal','Drag out cancels button');
  if(action==='entry'){
   await click(p,'featureGuide.look');await ready(p,'focus');await p.waitForFunction(()=>window.__RESTORED__.audit.handImages.some(h=>h.phase==='focus')&&window.__COLOR_ESCAPE__.featureUnlockGuide.age>.15);
   s=await state(p);assert.equal(s.writes,baseline.writes);assert.deepEqual(guideKeys(s),['featureGuide.entry']);assert.equal(s.audit.panels.length,0);assert.equal(s.audit.labels.filter(x=>x.phase==='focus').length,0);assert(!s.supplied.frame.some(d=>d.src.startsWith(prefix)),'Reveal PNGs are not rendered over focused entry');assert(!s.supplied.liveArt,'Reveal images released on focus');
   row.focus={guide:s.guide,targets:guideKeys(s)};await snap(p,row,'hand');await outside(p);assert.equal((await state(p)).guide.phase,'focus');
  }
  const confirm=action==='entry'?'featureGuide.entry':'featureGuide.later',writesBefore=(await state(p)).writes;
  if(fault)await p.evaluate(mode=>window.__RESTORED__.mode(mode),fault);await click(p,confirm);
  if(fault){await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.getDebugState().featureUnlockGuide?.persistence);s=await state(p);row.failed={guide:s.guide,save:s.save,targets:guideKeys(s)};assert.equal(s.screen,'home');assert.equal(s.guide.persistence,fault==='reject'?'rejected':'unknown');assert.deepEqual(guideKeys(s),['featureGuide.retry']);assert.deepEqual(economy(s.save),economy(baseline.save));assert(s.save.featureGuideProgress.pending.includes(feature.id));assert(!s.save.featureGuideProgress.seen.includes(feature.id));await snap(p,row,'save-retry');await p.evaluate(()=>window.__RESTORED__.mode('commit'));await click(p,'featureGuide.retry');}
  await p.waitForFunction(()=>!window.__COLOR_ESCAPE__.featureUnlockGuide&&!window.__COLOR_ESCAPE__.navigationTransition,null,{timeout:30000});if(action==='entry')await entered(p,feature.id);
  s=await state(p);assert.equal(s.screen,action==='entry'?feature.id:'home');assert(s.stored.featureGuideProgress.seen.includes(feature.id));assert(!s.stored.featureGuideProgress.pending.includes(feature.id));assert.deepEqual(economy(s.save),economy(baseline.save));assert.deepEqual(s.audit.overlaps,[]);assert.equal(s.audit.panels.length,0);row.after={screen:s.screen,save:s.save};row.audit=s.audit;row.supplied=s.supplied;
  if(fault){const writes=s.audit.writes.slice(writesBefore).filter(w=>w.guide?.feature===feature.id);assert(writes.length>0);assert.equal(new Set(writes.map(w=>JSON.stringify(w.value))).size,1,'Retry uses unchanged acknowledgement candidate');if(fault.startsWith('unknown'))assert.equal(new Set(writes.map(w=>w.identity)).size,1,'Unknown retry retains candidate object');row.retryWrites=writes;}
  await snap(p,row,action==='entry'?'entered':'later');currentSeed=s.stored;await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__.homeProfileArt,null,{timeout:60000});await p.waitForTimeout(900);s=await state(p);assert.equal(s.screen,'home');assert(!s.guide.active,'Acknowledged guide cannot reopen');assert.equal(s.supplied.requests.length,0,'Acknowledged reload does not load supplied group');row.storageViolations=s.storageViolations;assert.deepEqual(s.storageViolations,[]);assert.deepEqual(row.errors,[]);row.status='PASS';
 }catch(error){row.status='FAIL';row.error=error.stack;row.last=await state(p).catch(()=>null);await snap(p,row,'failure').catch(()=>{});throw error;}finally{await context.close();console.log(`${row.name}: ${row.status}`);await writeFile(resolve(output,'partial.json'),JSON.stringify(report,null,2));}
}
try{
 for(const viewport of[{width:320,height:568},{width:496,height:1078}]){for(const feature of features)await run(viewport,feature,{reduced:viewport.width===496&&feature.id==='league'});await run(viewport,features[3],{action:'later',reduced:viewport.width===496});}
 for(const [fault,i]of ['reject','unknown-written','unknown-unwritten'].map((f,i)=>[f,i]))for(const action of ['entry','later'])await run(i%2?{width:496,height:1078}:{width:320,height:568},features[3],{action,fault});
 for(const resourceMode of ['loading','error'])await run({width:320,height:568},features[0],{action:'later',resourceMode});
 await run({width:320,height:568},features[0],{noPending:true});
 await run({width:320,height:568},features[3],{action:'later',language:'en'});
 report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}finally{
 await browser.close();await server.close();report.sourcesAfter=await bindings();report.sourceChanges=Object.keys(report.sources).filter(p=>report.sources[p]!==report.sourcesAfter[p]);
 if(report.sourceChanges.length){report.status='FAIL';report.sourceDrift=true;process.exitCode=1;}
 await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({status:report.status,output,cases:report.cases.map(c=>({name:c.name,status:c.status})),failure:report.failure,sourceChanges:report.sourceChanges},null,2));
