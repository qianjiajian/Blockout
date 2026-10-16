import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const output=resolve(process.env.SHOP_SUPPLIED_OUTPUT??`playtest-results/shop-supplied-20261014/run-${Date.now()}`);
const helperPath='tools/playtest-formal-ui-resources.mjs',helper=await readFile(helperPath,'utf8');
const begin=helper.indexOf('function seed('),end=helper.indexOf('const economy =',begin);assert(begin>=0&&end>begin);
const {seed,fixture:baseFixture}=new Function(helper.slice(begin,end)+';return {seed,fixture};')();
const sha=value=>createHash('sha256').update(value).digest('hex');
const files=[helperPath,'tools/playtest-shop-supplied-20261014.mjs','src/game/ColorEscapeGame.ts','src/game/welfareStationUi.ts',
 'src/game/welfareLocalization.ts','src/game/welfareSuppliedArt.ts','src/core/welfareRewards.ts','src/game/artManifest.ts',
 'src/platform/WebHost.ts','src/game/CollectionArtworkStore.ts','src/game/formalBlockShapes.ts','src/game/revisedMechanismArt.ts',
 'docs/rules/manifest.json','art-source/ui/shop-supplied-v1/provenance.json'];
const supplied=JSON.parse(await readFile('art-source/ui/shop-supplied-v1/provenance.json','utf8'));
files.push(...supplied.assets.map(asset=>asset.runtime));
const bindings=async()=>Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await readFile(file))])));
const assetPrefix='/assets/art/ui/formal-pages/shop-supplied-v1/';
function initial(language,limits=false){
 const value=seed('normal');value.currentLevel=21;value.highestLevel=21;value.rewardedLevels=Array.from({length:20},(_,i)=>i+1);
 value.bestStars=Object.fromEntries(value.rewardedLevels.map(i=>[i,3]));value.language=language;value.sound=true;
 value.coins=limits?999999:240;value.boosters={time:limits?9:3,rocket:limits?9:3,pulse:limits?9:3};
 value.lifeState={lives:2,nextLifeAtMs:Date.now()+1800000,unlimitedLivesUntilMs:0};value.collectionProgress.inspiration=40;
 value.journeyProgress.seenEpisodeUnlockLevels=[11,21,31,41];
 const day=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
 value.welfareRewards={version:1,dayKey:day,maxObservedDayKey:day,claimed:{inspiration:limits?3:0,coins:0,lives:limits?3:0,booster:0},
  cooldownUntilMs:Date.now()+60000,completedRequestIds:[]};return value;
}
function fixture(value){return baseFixture(value).replace('game.start();',`
const shop={ads:[],available:false,writeMode:'commit',sounds:[],frame:{images:[],texts:[]},history:[],faultBaseline:undefined,adResolve:undefined};
window.__SHOP_QA__=shop;
host.sound=kind=>shop.sounds.push({kind,at:performance.now()});
host.isRewardedAdAvailable=()=>shop.available&&!shop.adResolve;
host.showRewardedAd=requestId=>{shop.ads.push({requestId,status:'pending'});return new Promise(resolve=>{shop.adResolve=status=>{shop.ads.at(-1).status=status;shop.adResolve=undefined;resolve({requestId,status});};});};
const write=host.storageSet.bind(host),read=host.storageRead.bind(host);
host.storageSet=function(k,v){const b=shop.faultBaseline;
 const rewardChanged=b&&(v.coins>b.coins||v.collectionProgress.inspiration>b.collectionProgress.inspiration||v.lifeState.lives>b.lifeState.lives||['time','rocket','pulse'].some(kind=>v.boosters[kind]>b.boosters[kind]));
 if(shop.writeMode==='reject-reward'&&rewardChanged){audit.writes.push({key:k,value:structuredClone(v),rejected:true});return false;}
 return write(k,v);};
shop.setAvailable=value=>{shop.available=value;game.dirty=true;game.scheduleFrame();};
shop.setFault=value=>{shop.writeMode=value;shop.faultBaseline=structuredClone(game.save);};
let inSupply=false;
const supply=game.drawSupply.bind(game);game.drawSupply=function(...args){const before=inSupply;inSupply=true;try{return supply(...args);}finally{inSupply=before;}};
const imageDraw=ctx.drawImage.bind(ctx),textDraw=ctx.fillText.bind(ctx);
ctx.drawImage=function(image,...args){if(inSupply&&image instanceof HTMLImageElement){const m=this.getTransform(),src=new URL(image.currentSrc||image.src,location.href).pathname;
 const entry={src,args,alpha:this.globalAlpha,transform:{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f}};shop.frame.images.push(entry);if(!shop.history.includes(src))shop.history.push(src);}return imageDraw(image,...args);};
ctx.fillText=function(text,x,y,maxWidth){if(inSupply){const m=this.measureText(text),t=this.getTransform();shop.frame.texts.push({text:String(text),x,y,maxWidth,font:this.font,
 width:m.width,left:m.actualBoundingBoxLeft,right:m.actualBoundingBoxRight,ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent,
 transform:{a:t.a,b:t.b,c:t.c,d:t.d,e:t.e,f:t.f}});}return maxWidth===undefined?textDraw(text,x,y):textDraw(text,x,y,maxWidth);};
const shopRender=game.render.bind(game);game.render=function(...args){shop.frame={images:[],texts:[]};return shopRender(...args);};
game.start();`);}
const state=page=>page.evaluate(()=>{const q=window.__SHOP_QA__,g=window.__COLOR_ESCAPE__,canvas=window.__FORMAL_UI__.host.canvas,b=canvas.getBoundingClientRect();return {snapshot:window.__FORMAL_UI__.snapshot(),
 canvas:{width:canvas.width,height:canvas.height,box:{x:b.x,y:b.y,width:b.width,height:b.height}},
 welfare:g.getDebugState().welfare,layout:g.welfareLayout(),pending:!!g.pendingWelfareSave,flight:!!g.homeCoinFlight,
 flights:(g.homeCoinFlights??[]).map(f=>g.homeCoinFlightEvidence(f)),
 celebration:!!g.welfareCelebration,collectionIntro:!!g.collectionIntro,shop:{ads:structuredClone(q.ads),sounds:structuredClone(q.sounds),frame:structuredClone(q.frame),history:[...q.history]}};});
const economy=s=>({coins:s.snapshot.saved.coins,inspiration:s.snapshot.saved.collectionProgress.inspiration,lives:s.snapshot.saved.lifeState.lives,
 boosters:structuredClone(s.snapshot.saved.boosters),restored:s.snapshot.saved.collectionProgress.restoredMasterpieceIds});
async function point(page,key){const s=await state(page),t=s.snapshot.state.viewportTransform,targets=s.snapshot.state.interactionTargets,r=(targets.targets??targets)[key]?.hit;
 assert(r,`Missing Pointer target ${key}`);const b=await page.locator('canvas').boundingBox();return {x:b.x+t.offsetX+(r.x+r.width/2)*t.scale,y:b.y+t.offsetY+(r.y+r.height/2)*t.scale};}
async function click(page,key,{delay=80}={}){const p=await point(page,key);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForTimeout(25);await page.mouse.up();if(delay)await page.waitForTimeout(delay);}
async function scroll(page,direction=1){const b=await page.locator('canvas').boundingBox(),x=b.x+b.width*.55,from=b.y+b.height*(direction>0?.70:.34),to=b.y+b.height*(direction>0?.34:.70);
 await page.mouse.move(x,from);await page.mouse.down();await page.mouse.move(x,to,{steps:14});await page.mouse.up();await page.waitForTimeout(100);}
async function reveal(page,key,direction=1){for(let i=0;i<5;i++){const s=await state(page),targets=s.snapshot.state.interactionTargets,r=(targets.targets??targets)[key]?.hit;
  if(r&&r.height>12)return;await scroll(page,direction);}throw Error(`Cannot reach ${key} via Pointer scrolling`);}
async function screenshot(page,row,name){const s=await state(page),file=resolve(output,`${row.name}-${name}.png`);await page.screenshot({path:file});row.shots.push({name,file,sha256:sha(await readFile(file)),state:s});return s;}
function safeResourceBounds(s,safe){
 const sources=['resource-coins.png','resource-inspiration.png','resource-life.png'];
 const rects=sources.map(source=>{const matching=s.shop.frame.images.filter(d=>d.src.endsWith('/'+source));assert.equal(matching.length,1,`Exactly one header ${source} is actually drawn`);
  const d=matching[0];assert.equal(d.args.length,4);const [x,y,w,h]=d.args,m=d.transform,b=s.canvas.box;
  const points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:b.x+(m.a*px+m.c*py+m.e)*b.width/s.canvas.width,y:b.y+(m.b*px+m.d*py+m.f)*b.height/s.canvas.height}));
  const r={src:d.src,left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y))};
  assert(r.top>=safe.top-1,'Actual resource icon clears safeTop');assert(r.left>=0&&r.right<=b.width+1);return r;});return rects;
}
function englishDescriptionBounds(s){
 const r=s.layout.cards.inspiration.description,expected='10 more Inspiration to restore the next painting',compact=value=>value.replace(/\s/g,'');
 const lines=s.shop.frame.texts.filter(t=>t.y>=r.y&&t.y<=r.y+r.height&&t.x>=r.x-1&&t.x<=r.x+r.width+1);
 assert.equal(compact(lines.map(t=>t.text).join(' ')),compact(expected),'English long description is rendered completely in its own box');
 for(const t of lines){const scale=t.maxWidth===undefined?1:Math.min(1,t.maxWidth/t.width);
  assert(t.x-t.left*scale>=r.x-1&&t.x+t.right*scale<=r.x+r.width+1&&t.y-t.ascent>=r.y-1&&t.y+t.descent<=r.y+r.height+1,'Actual English description glyphs fit their declared rectangle');}
 return {rect:r,lines};
}
function englishLabelBounds(s){
 const compact=value=>value.replace(/\s/g,'');
 const entries=[...['inspiration','coins','lives','booster'].map(kind=>({name:`claim.${kind}`,rect:s.layout.cards[kind].claim,expected:'Watch & claim'})),
  {name:'booster.title',rect:s.layout.cards.booster.title,expected:'Choose a booster ×1'}];
 return entries.map(({name,rect,expected})=>{const lines=s.shop.frame.texts.filter(t=>t.y>=rect.y&&t.y<=rect.y+rect.height&&t.x>=rect.x&&t.x<=rect.x+rect.width);
  assert.equal(compact(lines.map(t=>t.text).join(' ')),compact(expected),`English ${name} must be complete within its own control`);
  assert.equal(lines.length,2,`Long English ${name} uses two lines instead of tiny single-line text`);
  return {name,rect,lines:lines.map(t=>{const size=Number(/([\d.]+)px/.exec(t.font)?.[1]),scale=t.maxWidth===undefined?1:Math.min(1,t.maxWidth/t.width);
   assert(size>=22,`English ${name} must remain at least 22 native artboard px`);
   const ink={left:t.x-t.left*scale,right:t.x+t.right*scale,top:t.y-t.ascent,bottom:t.y+t.descent};
   assert(ink.left>=rect.x-1&&ink.right<=rect.x+rect.width+1&&ink.top>=rect.y-1&&ink.bottom<=rect.y+rect.height+1,`English ${name} glyphs must fit the actual control`);
   return {...t,fontSize:size,cssFontSize:size*t.transform.d*s.canvas.box.height/s.canvas.height,ink};})};});
}
function flightTargetBounds(s,kind,safe){
 const icon=safeResourceBounds(s,safe).find(r=>r.src.endsWith(`/resource-${kind}.png`)),flight=s.flights.find(f=>f.kind===kind);
 assert(flight,`Live ${kind} reward flight must be present`);const t=s.snapshot.state.viewportTransform,b=s.canvas.box;
 const actual={x:b.x+t.offsetX+flight.target.x*t.scale,y:b.y+t.offsetY+flight.target.y*t.scale},expected={x:(icon.left+icon.right)/2,y:(icon.top+icon.bottom)/2};
 assert(Math.abs(actual.x-expected.x)<.5&&Math.abs(actual.y-expected.y)<.5,'Reward flight lands at the actual new wallet icon center, including safe area');
 return {kind,actual,expected,age:flight.age};
}
async function readyHome(page){await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady&&g.screen==='home'&&!g.featureUnlockGuide&&!g.collectionIntro&&!g.journeyPresentation;},undefined,{timeout:45000});}
async function enterShop(page){await click(page,'navigation.0');await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='supply'&&!g.navigationTransition&&g.formalPageReady('supply');},undefined,{timeout:25000});await page.waitForTimeout(180);}
async function completeAd(page,kind,{reject=false}={}){await reveal(page,`welfare.claim.${kind}`,kind==='inspiration'?-1:1);const before=await state(page);
 if(reject)await page.evaluate(()=>window.__SHOP_QA__.setFault('reject-reward'));
 await click(page,`welfare.claim.${kind}`);await page.waitForFunction(n=>window.__SHOP_QA__.ads.length===n+1,before.shop.ads.length);
 await page.evaluate(()=>window.__SHOP_QA__.adResolve('completed'));
 await page.waitForFunction(reject=>{const g=window.__COLOR_ESCAPE__;return !g.welfareAdRequestId&&(reject?g.pendingWelfareSave?.stage==='reward':!g.pendingWelfareSave);},reject,{timeout:10000});
 if(!reject&&(kind==='coins'||kind==='inspiration'))await page.waitForFunction(kind=>window.__COLOR_ESCAPE__.homeCoinFlights.some(f=>f.kind===kind&&f.age>0),kind,{timeout:5000});
 return {before,after:await state(page)};
}

await mkdir(output,{recursive:true});
const report={status:'RUNNING',scope:'Synthetic MemoryHost and controllable completed-ad fixture on current Web source; real Pointer/scrolling and natural animation. No real player Storage, actual ads, WeChat packaging, or native-device claim.',sources:await bindings(),cases:[],assets:{}};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
async function run(viewport,language,safe){
 const row={name:`${viewport.width}-${language}`,viewport,language,safe,status:'RUNNING',errors:[],shots:[]};report.cases.push(row);
 const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage();let value=initial(language);
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real Storage forbidden');};for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real IndexedDB forbidden');};});
 page.on('pageerror',e=>row.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')row.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)row.errors.push(`${r.status()} ${r.url()}`);});
 await page.route('**/*',route=>{const url=route.request().url();if(new URL(url).pathname==='/__shop_fixture__')return route.fulfill({contentType:'text/html',body:fixture(value)});
  return url.startsWith(origin+'/')||url.startsWith('data:')?route.continue():route.abort();});
 const load=async()=>{await page.goto(`${origin}/__shop_fixture__?safeTop=${safe.top}&safeBottom=${safe.bottom}`,{waitUntil:'domcontentloaded'});await readyHome(page);await enterShop(page);};
 try{
  await load();let s=await screenshot(page,row,'unavailable-top');const starting=economy(s);
  assert.equal(s.welfare.cards.inspiration.remaining,3);assert.equal(s.welfare.cards.booster.remaining,10);
  assert.equal(s.welfare.ledger.cooldownUntilMs,0,'Legacy cooldown is intentionally cleared by current rules');assert(Object.values(s.welfare.cards).every(c=>c.state!=='cooldown'));
  assert.equal(s.welfare.cards.inspiration.state,'unavailable');await click(page,'welfare.claim.inspiration');let unchanged=await state(page);assert.deepEqual(economy(unchanged),starting);assert.equal(unchanged.shop.ads.length,0);assert.equal(unchanged.snapshot.audit.writes.length,s.snapshot.audit.writes.length);
  await page.evaluate(()=>window.__SHOP_QA__.setAvailable(true));await page.waitForFunction(()=>window.__COLOR_ESCAPE__.buttonHints.length===0,undefined,{timeout:10000});await page.waitForTimeout(80);s=await screenshot(page,row,'available-top');row.resourceBounds=safeResourceBounds(s,safe);if(language==='en'){row.englishDescription=englishDescriptionBounds(s);row.englishLabels=englishLabelBounds(s);}
  const adStart=s.shop.ads.length,firstPoint=await point(page,'welfare.claim.inspiration');await click(page,'welfare.claim.inspiration');await page.waitForFunction(n=>window.__SHOP_QA__.ads.length===n+1,adStart);
  await page.mouse.click(firstPoint.x,firstPoint.y);assert.equal((await state(page)).shop.ads.length,adStart+1);
  await screenshot(page,row,'ad-waiting');await page.evaluate(()=>window.__SHOP_QA__.adResolve('completed'));
  await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return !g.pendingWelfareSave&&!g.welfareAdRequestId&&g.homeCoinFlight;},undefined,{timeout:10000});
  s=await screenshot(page,row,'inspiration-flight');assert.equal(s.snapshot.saved.collectionProgress.inspiration,starting.inspiration+50);row.flightTargets=[flightTargetBounds(s,'inspiration',safe)];
  await reveal(page,'welfare.claim.coins');const during=await state(page);assert(during.flight||during.celebration,'Next Pointer action must begin during a live reward animation');
  const coins=await completeAd(page,'coins');assert.equal(coins.after.snapshot.saved.coins,starting.coins+100);row.clickDuringAnimation=true;row.flightTargets.push(flightTargetBounds(coins.after,'coins',safe));
  const lives=await completeAd(page,'lives');assert.equal(lives.after.snapshot.saved.lifeState.lives,starting.lives+1);
  for(const kind of ['time','rocket','pulse']){await reveal(page,`welfare.select.${kind}`);const before=await state(page);await click(page,`welfare.select.${kind}`);s=await state(page);assert.equal(s.welfare.selectedBooster,kind);assert.deepEqual(economy(s),economy(before));}
  await screenshot(page,row,'booster-pulse-selected');const booster=await completeAd(page,'booster');assert.equal(booster.after.snapshot.saved.boosters.pulse,starting.boosters.pulse+1);assert.equal(booster.after.welfare.cards.booster.remaining,9);
  const retry=await completeAd(page,'inspiration',{reject:true});s=await screenshot(page,row,'retry-save');assert(s.pending);assert.equal(s.welfare.cards.inspiration.state,'retry');assert.deepEqual(economy(s),economy(retry.before));
  await page.evaluate(()=>window.__SHOP_QA__.setFault('commit'));await click(page,'welfare.claim.inspiration');await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.pendingWelfareSave);
  s=await state(page);assert.equal(s.shop.ads.length,retry.before.shop.ads.length+1,'Retry must not start another ad');assert.equal(s.snapshot.saved.collectionProgress.inspiration,starting.inspiration+100);
  await page.waitForFunction(()=>!window.__COLOR_ESCAPE__.homeCoinFlight&&!window.__COLOR_ESCAPE__.welfareCelebration);
  await reveal(page,'welfare.collection',-1);const collectionBefore=await state(page);await click(page,'welfare.collection');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='records'&&!window.__COLOR_ESCAPE__.navigationTransition);
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__.collectionAlbumArtworkReady(),undefined,{timeout:25000});await page.waitForTimeout(150);
  s=await screenshot(page,row,'collection-entry');assert.deepEqual(economy(s),economy(collectionBefore));assert(!s.collectionIntro,'Opening collection must not restore automatically');
  row.rewardFlow={starting,finished:economy(s),ads:s.shop.ads,legacyCooldownNormalized:true};
  value=initial(language,true);await load();await page.evaluate(()=>window.__SHOP_QA__.setAvailable(true));await page.waitForTimeout(100);s=await screenshot(page,row,'limits-full-top');
  assert.equal(s.welfare.cards.inspiration.state,'limit');assert.equal(s.welfare.cards.coins.state,'full');assert.equal(s.welfare.cards.lives.state,'limit');assert.equal(s.welfare.cards.booster.state,'full');
  const limitBefore=s;for(const kind of ['inspiration','coins','lives','booster']){await reveal(page,`welfare.claim.${kind}`);await click(page,`welfare.claim.${kind}`);}
  await scroll(page);s=await screenshot(page,row,'limits-full-bottom');assert.deepEqual(economy(s),economy(limitBefore));assert.equal(s.shop.ads.length,0);assert.equal(s.snapshot.audit.writes.length,limitBefore.snapshot.audit.writes.length);
  assert(s.layout.scroll>=s.layout.maxScroll-1,'Bottom content must be reached by actual Pointer scroll');
  const footerClaim=s.layout.cards.booster.claim;assert(footerClaim.y>=s.layout.viewport.y&&footerClaim.y+footerClaim.height<=s.layout.viewport.y+s.layout.viewport.height+1,'Bottom claim is fully within the scroll viewport');
  const actualNew=Array.from(new Set(row.shots.flatMap(x=>x.state.shop.history).filter(src=>src.startsWith(assetPrefix))));assert(actualNew.length>0,'New supplied art must actually be drawn');
  for(const file of ['panel.png','button-green.png','button-yellow.png','reward-inspiration.png','reward-coins.png','reward-life.png',
   'booster-time.png','booster-rocket.png','booster-pulse.png','resource-coins.png','resource-inspiration.png','resource-life.png','selected.png'])
   assert(actualNew.includes(assetPrefix+file),`Required supplied art was not actually drawn: ${file}`);
  for(const src of actualNew)report.assets['public'+src]=sha(await readFile('public'+src));row.newAssets=actualNew;
  assert.deepEqual(s.snapshot.storageViolations,[]);assert.deepEqual(row.errors,[]);row.final=s;row.status='PASS';
 }catch(error){row.status='FAIL';row.failure=String(error.stack??error);row.last=await state(page).catch(()=>null);await page.screenshot({path:resolve(output,row.name+'-failure.png')}).catch(()=>{});throw error;}
 finally{await context.close();console.log(`${row.name}: ${row.status}`);await writeFile(resolve(output,'partial.json'),JSON.stringify(report,null,2)+'\n');}
}
try{await run({width:405,height:882},'zh-CN',{top:0,bottom:0});await run({width:320,height:568},'en',{top:24,bottom:20});report.status='PASS';}
catch(error){report.status='FAIL';report.failure=String(error.stack??error);process.exitCode=1;}
finally{await browser.close();await server.close();report.sourcesAfter=await bindings();report.sourceChanges=files.filter(file=>report.sources[file]!==report.sourcesAfter[file]);
 if(report.sourceChanges.length){report.status='FAIL';process.exitCode=1;}for(const [file,digest]of Object.entries(report.assets))assert.equal(sha(await readFile(file)),digest,`Asset changed: ${file}`);
 await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,sourceChanges:report.sourceChanges,output,failure:report.failure},null,2));
