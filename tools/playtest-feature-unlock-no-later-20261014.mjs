import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Read-only reuse of the accepted isolated MemoryHost and Pointer helpers.
// The old runners and their reports are not executed or modified.
const output=resolve(process.env.FEATURE_NO_LATER_OUTPUT??`playtest-results/feature-unlock-no-later-20261014/run-${Date.now()}`);
const prefix='/assets/art/ui/formal-pages/feature-unlock-supplied-v1/';
const oldPath='tools/playtest-feature-unlock-card-restored.mjs',helperPath='tools/playtest-feature-unlock-supplied-20261014.mjs';
const old=await readFile(oldPath,'utf8'),helper=await readFile(helperPath,'utf8');
const allFeatures=[{id:'leaderboard',level:6},{id:'supply',level:8},{id:'levels',level:10},{id:'dailyChallenge',level:15},{id:'league',level:20}];
const a=old.indexOf('function seed('),b=old.indexOf('const server=',a);
assert(a>=0&&b>a);const {seed,fixture:baseFixture}=new Function('features',old.slice(a,b)+';return {seed,fixture};')(allFeatures);
const c=helper.indexOf('function fixture('),d=helper.indexOf('function checkCard(',c);
assert(c>=0&&d>c);
const sha=value=>createHash('sha256').update(value).digest('hex');
const {fixture,state,economy,point,click,ready,entered,guideKeys,snap}=new Function('baseFixture','assert','prefix','output','resolve','sha','readFile',
 helper.slice(c,d)+';return {fixture,state,economy,point,click,ready,entered,guideKeys,snap};')(baseFixture,assert,prefix,output,resolve,sha,readFile);
async function bindings(){
 const files=[oldPath,helperPath,'tools/playtest-feature-unlock-no-later-20261014.mjs','docs/rules/manifest.json',
 'src/game/ColorEscapeGame.ts','src/game/featureUnlockUi.ts','src/game/artManifest.ts','src/game/localization.ts',
 'src/core/featureUnlockGuides.ts','src/core/featureUnlocks.ts'];
 const artDir='public'+prefix.slice(0,-1);for(const name of await readdir(artDir))files.push(artDir+'/'+name);
 return Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await readFile(file))])));
}
await mkdir(output,{recursive:true});
const report={status:'RUNNING',scope:'Synthetic MemoryHost progress; actual Pointer clicks. Checks only removal of Later plus unchanged Look/focus/entry. No real Storage or WeChat operations.',sources:await bindings(),cases:[]};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
try{
 for(const viewport of [{width:320,height:568},{width:496,height:1078}])for(const feature of [allFeatures[0],allFeatures[3]]){
  const row={name:`${viewport.width}-${feature.id}`,status:'RUNNING',viewport,feature,images:[],errors:[]};report.cases.push(row);
  const context=await browser.newContext({viewport,deviceScaleFactor:1}),p=await context.newPage();
  try{
   await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const k of ['getItem','setItem','removeItem','clear'])Storage.prototype[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('Persistent storage forbidden');};for(const k of ['open','deleteDatabase'])indexedDB[k]=function(){window.__STORAGE_VIOLATIONS__.push(k);throw Error('Persistent database forbidden');};});
   p.on('pageerror',e=>row.errors.push(e.message));p.on('console',e=>{if(e.type()==='error')row.errors.push(e.text());});
   const initial=seed(feature);
   await p.route('**/*',r=>r.request().url()===origin+'/__feature_no_later__'?r.fulfill({contentType:'text/html',body:fixture(initial)}):r.request().url().startsWith(origin)||r.request().url().startsWith('data:')?r.continue():r.abort());
   await p.goto(origin+'/__feature_no_later__',{waitUntil:'domcontentloaded'});await ready(p);await p.waitForTimeout(450);
   const baseline=await state(p);assert.deepEqual(guideKeys(baseline),['featureGuide.look']);
   assert(!baseline.audit.labels.some(l=>l.value==='稍后'),'No Later text ever drawn');
   assert(!baseline.supplied.frame.some(d=>d.src===prefix+'later-line.png'),'No later-line PNG drawn');
   assert(baseline.supplied.frame.some(d=>d.src===prefix+'title-zh.png'),'Actual supplied title remains');
   assert.equal(baseline.audit.panels.length,0,'No drawChromePanel fallback');
   row.before={guide:baseline.guide,targets:guideKeys(baseline),stored:baseline.stored};await snap(p,row,'card');
   const oldRect=baseline.guide.layout.later;assert(oldRect,'Old rectangle retained for regression coordinates');row.oldRegion=oldRect;row.oldRegionClicks=[];
   for(const fraction of [.15,.5,.85]){
    const q=await point(p,oldRect.x+oldRect.width*fraction,oldRect.y+oldRect.height/2);
    await p.mouse.move(q.x,q.y);await p.mouse.down();await p.waitForTimeout(70);await p.mouse.up();await p.waitForTimeout(100);
    const s=await state(p);assert.equal(s.guide.phase,'reveal');assert.equal(s.screen,'home');assert.equal(s.writes,baseline.writes,'Old Later area must not save');
    assert.deepEqual(s.stored,baseline.stored,'Old Later area must not acknowledge');assert.deepEqual(guideKeys(s),['featureGuide.look']);
    row.oldRegionClicks.push({fraction,pointer:q,phase:s.guide.phase,writes:s.writes});
   }
   await click(p,'featureGuide.look');await ready(p,'focus');await p.waitForFunction(()=>window.__RESTORED__.audit.handImages.some(h=>h.phase==='focus'));
   let s=await state(p);assert.deepEqual(guideKeys(s),['featureGuide.entry']);assert.equal(s.writes,baseline.writes);assert(!s.supplied.liveArt);await snap(p,row,'focus');
   await click(p,'featureGuide.entry');await entered(p,feature.id);s=await state(p);
   assert(!s.guide.active);assert(s.stored.featureGuideProgress.seen.includes(feature.id));assert(!s.stored.featureGuideProgress.pending.includes(feature.id));
   assert.deepEqual(economy(s.save),economy(baseline.save));assert.deepEqual(s.storageViolations,[]);assert.deepEqual(row.errors,[]);
   assert.equal(s.audit.panels.length,0);assert(!s.audit.labels.some(l=>l.value==='稍后'));
   row.after={screen:s.screen,guide:s.guide,stored:s.stored};row.audit=s.audit;row.storageViolations=s.storageViolations;
   await snap(p,row,'entered');row.status='PASS';
  }catch(error){row.status='FAIL';row.failure=error.stack;row.last=await state(p).catch(()=>null);await snap(p,row,'failure').catch(()=>{});throw error;}
  finally{await context.close();console.log(`${row.name}: ${row.status}`);await writeFile(resolve(output,'partial.json'),JSON.stringify(report,null,2));}
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();await server.close();report.sourcesAfter=await bindings();report.sourceChanges=Object.keys(report.sources).filter(p=>report.sources[p]!==report.sourcesAfter[p]);if(report.sourceChanges.length){report.status='FAIL';process.exitCode=1;}await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,sourceChanges:report.sourceChanges,output,failure:report.failure},null,2));
