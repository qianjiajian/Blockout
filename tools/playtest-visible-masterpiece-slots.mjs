import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Reuse the historical isolated MemoryHost completed-run fixture without editing
// it. This checks the current production Canvas UI, not a puzzle route or device.
const root = process.cwd();
const output = resolve('playtest-results', `visible-masterpiece-slots-20261013-${Date.now()}`);
await mkdir(output, { recursive: true });
const legacy = await readFile('tools/playtest-masterpiece-unlock.mjs', 'utf8');
const fixtureDefinitions = legacy.slice(legacy.indexOf('const initial='), legacy.indexOf('const server='));
let fixture = new Function(`${fixtureDefinitions};return fixture;`)();
const script = fixture.match(/<script type="module">([\s\S]*)<\/script>/)[1];
const instrumentation = `
import { WIN_SETTLEMENT_LAYOUT } from './src/game/winSettlementLayout.ts';
const originalDrawSlots = game.drawMasterpieceUnlockProgress;
game.drawMasterpieceUnlockProgress = function(...args) {
 const ctx = this.ctx, originalFill = ctx.fill, originalImage = ctx.drawImage;
 const rendered = {slots:0,green:[],transform:null};
 ctx.fill = function(...params) {
  if (this.fillStyle === '#35204f') {rendered.slots++;const t=this.getTransform();rendered.transform={a:t.a,b:t.b,c:t.c,d:t.d,e:t.e,f:t.f};}
  return originalFill.apply(this,params);
 };
 ctx.drawImage = function(image,...params) {
  if(image===game.winArt?.suppliedSettlement?.progressFill)rendered.green.push(params);
  return originalImage.call(this,image,...params);
 };
 try { return originalDrawSlots.apply(this,args); }
 finally {ctx.fill=originalFill;ctx.drawImage=originalImage;window.__lastRenderedSlots=rendered;}
};
window.__slotPixels = () => {
 const r=window.__lastRenderedSlots,l=WIN_SETTLEMENT_LAYOUT.unlock,t=r.transform;
 const total=game.masterpieceUnlockPresentation.progress.total;
 const w=(l.track.width-14-l.segmentGap*(total-1))/total;
 const pixel=(x,y)=>{const px=Math.round(t.a*x+t.c*y+t.e),py=Math.round(t.b*x+t.d*y+t.f);return {x:px,y:py,rgba:Array.from(game.ctx.getImageData(px,py,1,1).data)}};
 // Use each slot's left quarter: the unchanged completion badge overlays the
 // fifth slot's center on 5/5 and must not be mistaken for a missing green fill.
 return {...r,total,gap:l.segmentGap,width:w,centers:Array.from({length:total},(_,i)=>pixel(l.fill.x+i*(w+l.segmentGap)+w/4,l.fill.y+l.fill.height/2)),gaps:Array.from({length:total-1},(_,i)=>pixel(l.fill.x+i*(w+l.segmentGap)+w+l.segmentGap/2,l.fill.y+l.fill.height/2))};
};`;
const bundle = await build({
 stdin: { contents: script.replaceAll("'/src/", "'./src/") + instrumentation, resolveDir: root, sourcefile:'isolated-visible-slots.ts', loader:'ts' },
 bundle:true, write:false, format:'esm', platform:'browser', target:'es2022', metafile:true,
});
fixture = fixture.replace(/<script type="module">[\s\S]*<\/script>/, '<script type="module" src="/fixture.js"></script>');
const sha = b => createHash('sha256').update(b).digest('hex');
const files = [...Object.keys(bundle.metafile.inputs).filter(f=>f!=='isolated-visible-slots.ts'), 'tools/playtest-visible-masterpiece-slots.mjs','tools/playtest-masterpiece-unlock.mjs'];
const bindings = async () => Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await readFile(f))])));
const report={status:'RUNNING',scope:'Isolated synthetic completed-run MemoryHost; actual production Canvas and RAF, real Pointer preview dismissal; no puzzle solving or WeChat device claim; no native storage access.',sources:await bindings(),cases:[],errors:[],failedRequests:[]};
const server=createServer(async(req,res)=>{
 try {
  if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}
  if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);return;}
  const path=resolve('public','.'+decodeURIComponent((req.url??'').split('?')[0]));
  if(!path.startsWith(resolve('public')+sep)){res.statusCode=403;res.end();return;}
  const data=await readFile(path);res.setHeader('Content-Type',({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav'})[extname(path)]??'application/octet-stream');res.end(data);
 }catch(error){res.statusCode=404;res.end();report.failedRequests.push({url:req.url,error:error.message});}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const checkpoint=()=>writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
try {
 for(const viewport of [{width:320,height:568},{width:496,height:1078}]) {
  const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{window.__storageCalls=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__storageCalls.push(m);throw Error('native storage forbidden')}});
  await page.goto(origin+'/fixture');
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady,{},{timeout:30000});
  for(const options of [{level:10,replay:true,current:0},{level:6,current:1},{level:7,current:2},{level:10,current:5}]) {
   const row={name:`${viewport.width}x${viewport.height}-${options.current}of5`,options,status:'RUNNING'};
   report.cases.push(row);
   row.before=await page.evaluate(o=>window.__MASTERPIECE__.prepare(o),options);
   await page.evaluate(()=>window.__MASTERPIECE__.settle());
   await page.waitForFunction(()=>window.__COLOR_ESCAPE__.masterpieceUnlockPresentation?.age>=1.25,{},{timeout:30000});
   if(options.current===5){
    await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g.collectionIntroReady()&&!g.popupEntrance.active},{},{timeout:30000});
    const s=await page.evaluate(()=>window.__MASTERPIECE__.state()),r=s.targets.collectionIntroPrimary?.hit,t=s.transform;
    assert(r,'actual preview-dismissal target');
    const b=await page.locator('canvas').boundingBox();
    await page.mouse.click(b.x+t.offsetX+(r.x+r.width/2)*t.scale,b.y+t.offsetY+(r.y+r.height/2)*t.scale,{delay:12});
   }
   await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return !g.collectionIntro&&!g.popupEntrance.active&&g.popupEntrance.snapshot().some(s=>s.key==='win'&&s.phase==='idle')},{},{timeout:30000});
   await page.waitForTimeout(350);
   row.state=await page.evaluate(()=>window.__MASTERPIECE__.state());
   row.pixels=await page.evaluate(()=>window.__slotPixels());
   assert.equal(row.state.progress.progress.current,options.current);
   assert.equal(row.pixels.slots,5);assert.equal(row.pixels.total,5);assert.equal(row.pixels.green.length,options.current);assert.equal(row.pixels.gap,8);
   row.pixels.centers.forEach((p,i)=>{const [r,g,b]=p.rgba;if(i<options.current)assert(g>r&&g>b,`green slot ${i}`);else assert.deepEqual([r,g,b],[53,32,79],`empty slot ${i}`)});
   row.pixels.gaps.forEach((p,i)=>{const [r,g,b]=p.rgba;assert(!(g>r&&g>b),`gap ${i} must not be green`)});
   assert.equal(row.state.writes.length,1);assert.deepEqual(row.state.save,row.state.stored);
   assert.deepEqual(row.state.save.collectionProgress.restoredMasterpieceIds,[]);
   row.inspirationDelta=row.state.save.collectionProgress.inspiration-row.before.collectionProgress.inspiration;
   if(options.replay) assert.equal(row.inspirationDelta,0);
   else assert(row.inspirationDelta>=0,'progress presentation must not spend inspiration; original clear/star/milestone rewards remain authoritative');
   row.storageCalls=await page.evaluate(()=>window.__storageCalls);assert.deepEqual(row.storageCalls,[]);
   row.image=resolve(output,`${row.name}.png`);await page.screenshot({path:row.image});row.imageSha256=sha(await readFile(row.image));
   row.status='PASS';await checkpoint();
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);
 report.sourcesAfter=await bindings();assert.deepEqual(report.sourcesAfter,report.sources,'sources changed during capture');report.status='PASS';await checkpoint();
 console.log(JSON.stringify({status:report.status,cases:report.cases.length,output}));
}catch(error){report.status='FAIL';report.error=error.stack;await checkpoint();console.log(output);throw error;}
finally{await browser.close();await new Promise(r=>server.close(r));}
