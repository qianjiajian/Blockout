import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const output=resolve(process.env.BUTTON_FEEDBACK_OUTPUT??`playtest-results/button-feedback-20261014/run-${Date.now()}`);
const helperPath='tools/playtest-formal-ui-resources.mjs',helper=await readFile(helperPath,'utf8');
const a=helper.indexOf('function seed('),b=helper.indexOf('const economy =',a);assert(a>=0&&b>a);
const {seed,fixture:baseFixture}=new Function(helper.slice(a,b)+';return {seed,fixture};')();
const sha=value=>createHash('sha256').update(value).digest('hex');
const files=[helperPath,'tools/playtest-button-feedback-20261014.mjs','src/game/ColorEscapeGame.ts','src/game/stackedHintMotion.ts',
 'src/game/playerProfileUi.ts','src/game/welfareStationUi.ts','src/game/welfareLocalization.ts','src/game/localization.ts','src/game/artManifest.ts','docs/rules/manifest.json'];
const bindings=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,sha(await readFile(p))])));
await mkdir(output,{recursive:true});
const report={status:'RUNNING',scope:'Bundled current source served in isolation; synthetic MemoryHost saves, actual Pointer and input. Ads explicitly stubbed, save rejection is a test fixture. No player Storage, publishing or WeChat build.',sources:await bindings(),cases:[]};
let html=baseFixture({});
html=html.replace("initial={};","initial=window.__QA_SEED__;");
assert(html.includes('initial=window.__QA_SEED__'),'Seed replaced before construction');
html=html.replace('game.start();',`
const toast={frame:{panels:[],texts:[]},ads:false,rejectReward:false,baseInspiration:initial.collectionProgress.inspiration};
window.__TOAST_QA__=toast;
host.isRewardedAdAvailable=()=>toast.ads;host.showRewardedAd=async requestId=>({requestId,status:'completed'});
const normalWrite=host.storageSet.bind(host);host.storageSet=function(k,v){if(toast.rejectReward&&v.collectionProgress.inspiration>toast.baseInspiration){audit.writes.push({key:k,phase:audit.phase,value:structuredClone(v),rejected:true});return false;}return normalWrite(k,v);};
const hintDraw=game.drawButtonHints;let drawingHint=false;
game.drawButtonHints=function(...args){toast.frame={panels:[],texts:[]};drawingHint=true;try{return hintDraw.apply(this,args);}finally{drawingHint=false;}};
const textDraw=ctx.fillText,imageDraw=ctx.drawImage;
ctx.fillText=function(text,x,y,maxWidth){if(drawingHint){const m=this.measureText(text);toast.frame.texts.push({text:String(text),x,y,font:this.font,fill:this.fillStyle,alpha:this.globalAlpha,width:m.width,left:m.actualBoundingBoxLeft,right:m.actualBoundingBoxRight,ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent,maxWidth});}return maxWidth===undefined?textDraw.call(this,text,x,y):textDraw.call(this,text,x,y,maxWidth);};
ctx.drawImage=function(image,...args){if(drawingHint)toast.frame.panels.push({src:image.currentSrc||image.src,args,alpha:this.globalAlpha});return imageDraw.call(this,image,...args);};
game.start();`);
const moduleStart=html.indexOf('<script type="module">'),moduleEnd=html.lastIndexOf('</script>');
const source=html.slice(moduleStart+'<script type="module">'.length,moduleEnd).replaceAll("from '/src/","from './src/");
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2020',define:{'import.meta.env':'{}'},logLevel:'error'});
const js=bundle.outputFiles[0].contents;await writeFile(resolve(output,'fixture.js'),js);report.bundleSHA=sha(js);
html=html.slice(0,moduleStart)+'<script defer src="/__fixture.js"></script>';
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/__fixture'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 if(path==='/__fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(js);return;}
 if(!path.startsWith('/assets/')||path.includes('..')){res.statusCode=404;res.end();return;}
 const bytes=await readFile(resolve('public','.'+path));res.setHeader('Content-Type',({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg'})[extname(path)]??'application/octet-stream');res.end(bytes);
 }catch{res.statusCode=404;res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true});
const state=p=>p.evaluate(()=>({snapshot:window.__FORMAL_UI__.snapshot(),toast:structuredClone(window.__TOAST_QA__.frame),pending:!!window.__COLOR_ESCAPE__.pendingWelfareSave}));
async function click(p,key){await p.waitForFunction(key=>{const s=window.__COLOR_ESCAPE__?.getDebugState(),t=s?.interactionTargets;return !!(t&&(t.targets??t)[key]?.hit);},key,{timeout:20000});const s=(await state(p)).snapshot.state,t=s.viewportTransform,r=(s.interactionTargets.targets??s.interactionTargets)[key].hit,c=await p.locator('canvas').boundingBox();await p.mouse.move(c.x+t.offsetX+(r.x+r.width/2)*t.scale,c.y+t.offsetY+(r.y+r.height/2)*t.scale);await p.mouse.down();await p.waitForTimeout(35);await p.mouse.up();await p.waitForTimeout(70);}
async function snapshotHint(p,row,name,expected,{lines=1}={}){
 await p.waitForFunction(expected=>window.__COLOR_ESCAPE__.getDebugState().buttonHints.some(h=>h.text.includes(expected)),expected);
 const s=await state(p),hints=s.snapshot.state.buttonHints;assert(hints.length>0);assert.equal(s.toast.panels.length,hints.length);
 assert(s.toast.panels.every(d=>d.src.endsWith('/locked-hint-panel.png')),'Every toast uses actual shared bitmap');
 assert(s.toast.texts.every(t=>t.fill==='#ffffff'&&t.alpha===1),'Toast text stays opaque white');
 const compact=text=>text.replace(/\s/g,'');
 assert(compact(s.toast.texts.map(t=>t.text).join('')).includes(compact(expected)),'Expected text actually painted');
 const targetIndex=hints.findLastIndex(h=>h.text.includes(expected)),panel=s.toast.panels[targetIndex];
 assert(panel,'Target hint has its own actual panel');
 const [px,py,pw,ph]=panel.args;
 const targetText=s.toast.texts.filter(t=>t.y>=py&&t.y<=py+ph);
 assert.equal(compact(targetText.map(t=>t.text).join('')),compact(hints[targetIndex].text),'Target panel contains its own complete message');
 if(lines>1)assert.equal(targetText.length,lines,'Target message itself wraps to the expected number of lines');
 for(const t of targetText){const scale=t.maxWidth===undefined?1:Math.min(1,t.maxWidth/t.width);
  assert(t.x-t.left*scale>=px&&t.x+t.right*scale<=px+pw&&t.y-t.ascent>=py&&t.y+t.descent<=py+ph,'Actual target glyphs stay within its own panel');}
 if(expected==='请输入不同的昵称')assert.equal(s.snapshot.audit.frame.texts.filter(t=>t===expected).length,hints.filter(h=>h.text===expected).length,'No duplicate legacy inline message');
 const file=resolve(output,`${row.name}-${name}.png`);await p.screenshot({path:file});row.shots.push({name,file,sha256:sha(await readFile(file)),hints,toast:s.toast,target:{index:targetIndex,panel,text:targetText,lineCount:targetText.length}});return s;
}
async function readyHome(p){await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady&&g.homeProfileArt&&!g.featureUnlockGuide&&!g.collectionIntro&&!g.journeyPresentation;},undefined,{timeout:60000});}
async function run(viewport,kind){
 const row={name:`${viewport.width}-${kind}`,viewport,kind,status:'RUNNING',errors:[],shots:[]};report.cases.push(row);
 const context=await browser.newContext({viewport,deviceScaleFactor:1}),p=await context.newPage();
const initial=seed('normal');initial.coins=0;initial.lifeState={lives:2,nextLifeAtMs:Date.now()+1800000,unlimitedLivesUntilMs:0};initial.playerProfile.name='原昵称';
 if(kind==='booster')initial.boosters.rocket=1;
 if(kind==='long-en')initial.language='en';
 if(kind==='locked'){initial.currentLevel=2;initial.highestLevel=2;initial.rewardedLevels=[1];initial.bestStars={1:3};}
 await context.addInitScript(seed=>{window.__QA_SEED__=seed;window.__STORAGE_VIOLATIONS__=[];for(const key of ['getItem','setItem','removeItem','clear'])Storage.prototype[key]=function(){window.__STORAGE_VIOLATIONS__.push(key);throw Error('Real Storage forbidden');};for(const key of ['open','deleteDatabase'])indexedDB[key]=function(){window.__STORAGE_VIOLATIONS__.push(key);throw Error('Real IndexedDB forbidden');};},initial);
 p.on('pageerror',e=>row.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')row.errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)row.errors.push(`${r.status()} ${r.url()}`);});
 await p.route('**/*',r=>r.request().url().startsWith(origin)||r.request().url().startsWith('data:')?r.continue():r.abort());
 try{
  await p.goto(origin+'/__fixture',{waitUntil:'networkidle'});await readyHome(p);
  if(kind==='locked'){
   const before=await state(p);await click(p,'navigation.3');await click(p,'navigation.3');await click(p,'navigation.0');
   const s=await snapshotHint(p,row,'stack','通关第8关解锁');assert.equal(s.snapshot.state.buttonHints.length,3);assert.equal(s.snapshot.audit.writes.length,before.snapshot.audit.writes.length);
   assert.equal(s.snapshot.state.screen,'home');
  }else if(kind==='booster'){
   await click(p,'homePlay');await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='playing'&&!g.revisedArtLoading&&!g.boosterUnlockGuide&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();},undefined,{timeout:60000});
   await click(p,'booster.time');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().boosterPurchase?.artReady);
   const before=await state(p);await click(p,'boosterPurchase.buy');await snapshotHint(p,row,'insufficient','金币不足');
   assert.equal((await state(p)).snapshot.audit.writes.length,before.snapshot.audit.writes.length);
   await click(p,'boosterPurchase.close');await p.waitForFunction(()=>window.__COLOR_ESCAPE__.screen==='playing');row.nextPointerWhileToast='boosterPurchase.close';
   await click(p,'booster.rocket');await p.waitForTimeout(300);
   const rocket=await state(p);assert(rocket.snapshot.audit.frame.draws.some(d=>d.src.endsWith('/locked-hint-panel.png')&&d.args[1]>800),'Persistent rocket prompt draws the shared panel at its original lower location');
   const rocketFile=resolve(output,row.name+'-rocket-target.png');await p.screenshot({path:rocketFile});row.shots.push({name:'rocket-target',file:rocketFile,sha256:sha(await readFile(rocketFile)),state:rocket.snapshot.state,draws:rocket.snapshot.audit.frame.draws.filter(d=>d.src.endsWith('/locked-hint-panel.png'))});
   await click(p,'booster.rocket');assert.equal((await state(p)).snapshot.saved.boosters.rocket,1,'Cancelling target selection consumes nothing');
  }else if(kind==='long-en'){
   await click(p,'navigation.0');await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='supply'&&!g.navigationTransition&&g.formalPageReady('supply');});
   await p.evaluate(()=>{window.__TOAST_QA__.ads=true;window.__TOAST_QA__.rejectReward=true;});
   await click(p,'welfare.claim.inspiration');
   await snapshotHint(p,row,'long-save-failure','Save failed · Retry the claim without another ad',{lines:2});
   await click(p,'welfare.claim.inspiration');
   await snapshotHint(p,row,'actual-retry','Save failed · Retry the claim without another ad',{lines:2});
   assert((await state(p)).pending);row.nextPointerWhileToast='Actual welfare reward retry while first long toast remains visible';
  }else{
   await click(p,'homeProfile');await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.profileArt);await click(p,'profile.editName');
   const before=await state(p);await click(p,'profile.rename');await click(p,'profile.rename');
   let s=await snapshotHint(p,row,'nickname-stack','请输入不同的昵称');assert.equal(s.snapshot.state.buttonHints.length,2);assert.equal(s.snapshot.audit.writes.length,before.snapshot.audit.writes.length);
   await click(p,'profile.input');await p.locator('input').fill('新昵称');await click(p,'profile.rename');await snapshotHint(p,row,'nickname-coins','金币不足');
   await click(p,'profile.cancelRename');await click(p,'profile.close');await click(p,'homeLife');await p.waitForFunction(()=>!!window.__COLOR_ESCAPE__.lifeRefillArt);
   const beforeLife=await state(p);await click(p,'lifeRefillBuy');await snapshotHint(p,row,'life','金币不足');assert.equal((await state(p)).snapshot.audit.writes.length,beforeLife.snapshot.audit.writes.length);
   await click(p,'lifeRefillDismiss');await click(p,'navigation.0');await p.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.screen==='supply'&&!g.navigationTransition&&g.formalPageReady('supply');});
   await click(p,'welfare.claim.inspiration');await snapshotHint(p,row,'welfare','广告暂不可用');
   // A rejected reward after a synthetic completed ad exercises the genuine long failure message.
   await p.evaluate(()=>{window.__TOAST_QA__.ads=true;window.__TOAST_QA__.rejectReward=true;});
   await click(p,'welfare.claim.inspiration');await snapshotHint(p,row,'long-save-failure','保存失败，请重试领取，无需重看广告');
   s=await state(p);assert(s.pending);assert.equal(s.snapshot.saved.collectionProgress.inspiration,initial.collectionProgress.inspiration);row.nextPointerWhileToast='profile.input, cancelRename, close, homeLife, welfare claim';
  }
  const end=await state(p);assert.deepEqual(end.snapshot.storageViolations,[]);assert.deepEqual(row.errors,[]);row.pointerEvents=end.snapshot.audit.pointers;row.storageViolations=end.snapshot.storageViolations;row.status='PASS';
 }catch(error){row.status='FAIL';row.failure=error.stack;row.last=await state(p).catch(()=>null);await p.screenshot({path:resolve(output,row.name+'-failure.png')}).catch(()=>{});throw error;}
 finally{await context.close();console.log(`${row.name}: ${row.status}`);await writeFile(resolve(output,'partial.json'),JSON.stringify(report,null,2));}
}
try{for(const viewport of [{width:320,height:568},{width:496,height:1078}])for(const kind of ['profile-life-welfare','booster','locked'])await run(viewport,kind);await run({width:320,height:568},'long-en');report.status='PASS';}
catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await new Promise(done=>server.close(done));report.sourcesAfter=await bindings();report.sourceChanges=files.filter(p=>report.sources[p]!==report.sourcesAfter[p]);if(report.sourceChanges.length){report.status='FAIL';process.exitCode=1;}await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,sourceChanges:report.sourceChanges,output,failure:report.failure},null,2));
