import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname,extname,resolve,sep} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createWebRuntimeLevelProjection} from './web-runtime-level-projection.mjs';
import {performanceSaveKey,performanceSaveSeed} from './performance-memory-seed.mjs';

const root=process.cwd(),variant=process.env.PERF_VARIANT??'before',sourceRoot=variant==='before'?resolve('.codex-temp/perf-five-20261014/baseline'):root;
assert(['before','after'].includes(variant));
const output=resolve(`playtest-results/startup-pages-20261014/${variant}-${Date.now()}`),sources={},assets={};await mkdir(output,{recursive:true});
const sha=v=>createHash('sha256').update(v).digest('hex');
const seed=`const key=${JSON.stringify(performanceSaveKey)};const initial=${JSON.stringify(performanceSaveSeed)};`;
const fixture=`import {ColorEscapeGame}from './src/game/ColorEscapeGame.ts';import{WebHost}from './src/platform/WebHost.ts';
${seed}
const audit={images:[],releases:[],frames:[],pointers:[],writes:0,maxIdleBytes:0,phase:'startup'};
function cache(host){const s=host.imageReuseCache?.stats??{idleImages:0,idleBytes:0,hits:0,loads:0};audit.maxIdleBytes=Math.max(audit.maxIdleBytes,s.idleBytes);return s;}
class MemoryHost extends WebHost{
 data=new Map([[key,structuredClone(initial)]]);
 storageRead(k){return this.data.has(k)?{status:'ok',value:structuredClone(this.data.get(k))}:{status:'missing'};}
 storageGet(k,f){const r=this.storageRead(k);return r.status==='ok'?r.value:f;}
 storageSet(k,v){audit.writes++;this.data.set(k,structuredClone(v));return true;}
 music(){}sound(){}vibrate(){}unlockAudio(){}async resolveLeaderboardProvince(){return{province:'广东',source:'random'};}
 async createImage(src){const row={src,start:performance.now(),phase:audit.phase,before:cache(this)};audit.images.push(row);try{const image=await super.createImage(src);Object.assign(row,{end:performance.now(),width:image.naturalWidth,height:image.naturalHeight,after:cache(this)});return image;}catch(e){row.error=String(e);throw e;}}
 releaseImage(image){super.releaseImage(image);audit.releases.push({at:performance.now(),phase:audit.phase,cache:cache(this)});}
}
const host=new MemoryHost();audit.beforeConstructor=performance.now();const game=new ColorEscapeGame(host);audit.afterConstructor=performance.now();
const render=game.render.bind(game);game.render=function(...args){const start=performance.now();try{return render(...args);}finally{audit.frames.push({at:performance.now(),ms:performance.now()-start,screen:game.screen,ready:game.artReady});cache(host);}};
for(const name of ['pointerdown','pointerup'])host.canvas.addEventListener(name,event=>audit.pointers.push({type:name,at:performance.now(),phase:audit.phase}),true);
window.__PAGES__={game,host,audit,cache:()=>cache(host),state:()=>({screen:game.screen,artReady:game.artReady,storageBaselineReady:game.storageBaselineReady,navigationTransition:!!game.navigationTransition,formalPageReady:game.formalPageReady(game.screen),cache:cache(host)})};
window.__COLOR_ESCAPE__=game;game.start();`;
await writeFile(resolve(output,'fixture-source.ts'),fixture);
const projection=variant==='after'&&process.env.PERF_PROJECTION==='1'?await createWebRuntimeLevelProjection({root,sourceRoot}):null;
if(projection){await writeFile(resolve(output,'runtime-projection.mjs'),projection.code);await writeFile(resolve(output,'runtime-projection-report.json'),JSON.stringify(projection.report,null,2));}
const result=await build({stdin:{contents:fixture,resolveDir:root,loader:'ts',sourcefile:'startup-pages.ts'},bundle:true,minify:true,write:false,format:'esm',platform:'browser',target:'es2020',logLevel:'silent',plugins:[{name:'archive-effective-sources',setup(b){b.onLoad({filter:/\.ts$/},async args=>{
 const name=args.path.slice(root.length+1).replaceAll('\\','/'),input=resolve(sourceRoot,name),raw=await readFile(input,'utf8'),contents=projection&&name==='src/core/levels.ts'?projection.code:raw,archive=resolve(output,'effective-sources',name);await mkdir(dirname(archive),{recursive:true});await writeFile(archive,contents);sources[name]={input,archive,sha256:sha(contents),rawSha256:sha(raw)};return{contents,loader:'ts',resolveDir:dirname(args.path)};
});}}]});
const script=result.outputFiles[0].contents;await writeFile(resolve(output,'fixture.js'),script);
const html='<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;overflow:hidden;background:#201953}canvas{display:block;width:100vw;height:100vh;touch-action:none}</style><script type="module" src="/fixture.js"></script>';
const publicRoot=resolve(root,'public'),mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(path==='/'){res.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}if(path==='/fixture.js'){res.writeHead(200,{'Content-Type':'application/javascript'}).end(script);return;}assert(path.startsWith('/assets/'));const file=resolve(publicRoot,'.'+path);assert(file.startsWith(publicRoot+sep));const bytes=await readFile(file);assets[file]=sha(bytes);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(bytes);}catch(e){res.writeHead(404).end(String(e));}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true});
const report={status:'RUNNING',variant,scope:'Isolated real Canvas/RAF and real Pointer navigation, synthetic MemoryHost only. Browser HTTP cache deliberately disabled to isolate retained decoded-image reuse. Local loopback timings are diagnostics, not real network/phone startup claims. Projection follows production build semantics if enabled; fixture bootstrap differs from web.ts.',projectionEnabled:!!projection,sourceRoot,fixtureSha256:sha(fixture),scriptBytes:script.length,sources,rows:[],errors:[]};
async function ready(page,screen){await page.waitForFunction(screen=>{const p=window.__PAGES__,g=p?.game;return g?.artReady&&g.storageBaselineReady&&g.screen===screen&&!g.navigationTransition&&(screen==='home'||g.formalPageReady(screen));},screen,{timeout:30000});await page.waitForTimeout(120);}
async function click(page,index){const p=await page.evaluate(index=>{const g=window.__PAGES__.game,s=g.getDebugState(),r=s.interactionTargets.targets['navigation.'+index].hit,b=g.host.canvas.getBoundingClientRect(),t=s.viewportTransform;return{x:b.x+t.offsetX+(r.x+r.width/2)*t.scale,y:b.y+t.offsetY+(r.y+r.height/2)*t.scale};},index);await page.mouse.click(p.x,p.y,{delay:35});}
try{for(const width of [320,496]){const context=await browser.newContext({viewport:{width,height:width===320?568:1078},deviceScaleFactor:1});
 await context.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const n of ['getItem','setItem','removeItem','clear'])Storage.prototype[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('Real storage forbidden');};for(const n of ['open','deleteDatabase'])indexedDB[n]=function(){window.__STORAGE_VIOLATIONS__.push(n);throw Error('IndexedDB forbidden');};});
 const page=await context.newPage(),errors=[],requests=[];let phase='startup';page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push({url:r.url().slice(origin.length),phase}));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('data:')?r.continue():r.abort());const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 const row={width,status:'RUNNING',pages:[]};report.rows.push(row);
 try{await page.goto(origin,{waitUntil:'domcontentloaded'});await ready(page,'home');row.startup=await page.evaluate(()=>({readyAt:performance.now(),state:window.__PAGES__.state(),timing:performance.getEntriesByType('navigation')[0].toJSON(),firstFrame:window.__PAGES__.audit.frames[0],firstReadyFrame:window.__PAGES__.audit.frames.find(f=>f.ready),constructorMs:window.__PAGES__.audit.afterConstructor-window.__PAGES__.audit.beforeConstructor}));await page.screenshot({path:resolve(output,`${width}-startup.png`)});
  for(const [name,index,screen]of [['shop-first',0,'supply'],['home-after-shop',2,'home'],['shop-repeat',0,'supply'],['home-after-shop-repeat',2,'home'],['ranking-first',1,'leaderboard'],['home-after-ranking',2,'home'],['ranking-repeat',1,'leaderboard'],['home-final',2,'home']]){
   phase=name;const before=await page.evaluate(name=>{window.__PAGES__.audit.phase=name;return{at:performance.now(),cache:window.__PAGES__.cache(),images:window.__PAGES__.audit.images.length};},name);await click(page,index);await ready(page,screen);
   const after=await page.evaluate(()=>({at:performance.now(),state:window.__PAGES__.state(),images:window.__PAGES__.audit.images.length}));row.pages.push({name,before,after,readyElapsedMs:after.at-before.at,createImageCalls:after.images-before.images,networkImageRequests:requests.filter(r=>r.phase===name&&r.url.startsWith('/assets/')).length});await page.screenshot({path:resolve(output,`${width}-${name}.png`)});
  }
  row.audit=await page.evaluate(()=>window.__PAGES__.audit);row.requests=requests;row.storageViolations=await page.evaluate(()=>window.__STORAGE_VIOLATIONS__);assert.deepEqual(row.storageViolations,[]);assert.deepEqual(errors,[]);assert.deepEqual(row.audit.images.filter(i=>i.error),[]);assert(row.audit.pointers.length>=16);assert(row.audit.maxIdleBytes<=4*1024*1024);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));row.hiddenCache=await page.evaluate(()=>window.__PAGES__.cache());assert.equal(row.hiddenCache.idleBytes,0);await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await ready(page,'home');await page.evaluate(()=>window.__PAGES__.host.dispose());row.disposedCache=await page.evaluate(()=>window.__PAGES__.cache());assert.equal(row.disposedCache.idleBytes,0);row.status='PASS';
 }catch(e){row.status='FAIL';row.error=String(e.stack??e);report.errors.push(row.error);await page.screenshot({path:resolve(output,`${width}-failure.png`)}).catch(()=>{});}finally{await context.close();}}
 report.workspaceDrift=[];for(const [name,s]of Object.entries(sources)){assert.equal(sha(await readFile(s.archive)),s.sha256);if(sha(await readFile(s.input))!==s.rawSha256)report.workspaceDrift.push(name);}for(const [file,digest]of Object.entries(assets))assert.equal(sha(await readFile(file)),digest);report.assetHashes=assets;
}catch(e){report.errors.push(String(e.stack??e));}finally{await browser.close();await new Promise(done=>server.close(done));report.status=report.errors.length?'FAIL':'PASS';await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,status:report.status,scriptBytes:script.length,rows:report.rows.map(r=>({width:r.width,status:r.status,startup:r.startup,pages:r.pages,maxIdleBytes:r.audit?.maxIdleBytes,error:r.error}))},null,2));if(report.status!=='PASS')process.exitCode=1;}
