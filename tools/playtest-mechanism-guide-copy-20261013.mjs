import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Isolated current-source QA. Reuse read-only helpers without invoking either
// older runner (the older guide runner uses localStorage and is never run).
const output = resolve(process.env.MECHANISM_COPY_OUTPUT ?? `playtest-results/mechanism-guide-copy-20261013/run-${Date.now()}`);
const helperPath = 'tools/playtest-formal-ui-resources.mjs';
const probePath = 'tools/playtest-mechanism-guide-formal-art.mjs';
const helper = await readFile(helperPath, 'utf8'), guideHelper = await readFile(probePath, 'utf8');
const a = helper.indexOf('function seed('), b = helper.indexOf('const economy =', a);
const c = guideHelper.indexOf('async function probe('), d = guideHelper.indexOf('const transformPoint =', c);
assert(a >= 0 && b > a && c >= 0 && d > c, 'Expected read-only helper boundaries');
const {seed, fixture} = new Function(helper.slice(a, b) + ';return {seed,fixture};')();
const probe = new Function(guideHelper.slice(c, d) + ';return probe;')();
const catalog = await readFile('src/core/mechanismCatalog.ts','utf8');
const expectedEffects = Object.fromEntries([...catalog.matchAll(/id: "([^"]+)"[^\n]*\n\s*effect: "([^"]+)"/g)].map(match=>[match[1],match[2]]));
assert.equal(Object.keys(expectedEffects).length,15,'All expected Chinese short descriptions come from the current catalog');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function inputs() {
  const files = [helperPath, probePath, 'tools/playtest-mechanism-guide-copy-20261013.mjs', 'docs/rules/manifest.json'];
  async function visit(dir) {
    for (const e of await readdir(dir, {withFileTypes:true})) {
      const path = `${dir}/${e.name}`;
      if (e.isDirectory()) await visit(path); else files.push(path);
    }
  }
  await visit('src');
  return Object.fromEntries(await Promise.all(files.map(async path => [path, sha(await readFile(path))])));
}
const debug = page => page.evaluate(() => window.__COLOR_ESCAPE__.getDebugState());
const snapshot = page => page.evaluate(() => window.__FORMAL_UI__.snapshot());
async function point(page, rect) {
  const s = await debug(page), box = await page.locator('canvas').boundingBox(), t = s.viewportTransform;
  return {x:box.x + t.offsetX + (rect.x + rect.width/2)*t.scale,
    y:box.y + t.offsetY + (rect.y + rect.height/2)*t.scale};
}
async function click(page, key) {
  await page.waitForFunction(key => Boolean(window.__COLOR_ESCAPE__?.getDebugState().interactionTargets.targets[key]), key);
  const s = await debug(page), p = await point(page, s.interactionTargets.targets[key].hit);
  await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForTimeout(70);await page.mouse.up();
  await page.waitForTimeout(100);
}
async function swipe(page, later) {
  const v = (await debug(page)).collection.layout.listViewportRect;
  const p = await point(page,{x:v.x,y:v.y+v.height*(later?.78:.22),width:v.width,height:0});
  const q = await point(page,{x:v.x,y:v.y+v.height*(later?.22:.78),width:v.width,height:0});
  await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:10});await page.mouse.up();
  await page.waitForTimeout(250);
}
async function select(page,id) {
  for(let n=0;n<15;n++) {
    const s=await debug(page), v=s.collection.visibleEntries;
    if(s.interactionTargets.targets[`collection.${id}`]) {
      await click(page,`collection.${id}`);
      assert.equal((await debug(page)).collection.selectedId,id);
      return;
    }
    await swipe(page,s.collection.orderedItemIds.indexOf(id)>v[0].index);
  }
  assert.fail(`Cannot reach ${id} using real Pointer scrolling`);
}
function checkText(result, viewport) {
  const state=result.state.collection, body=result.text.filter(line=>line.inBody);
  assert.equal(state.selectedUnlocked,true);
  assert.equal(state.displayedDetail,expectedEffects[state.selectedId],'Actual Chinese guide selects the new catalog copy');
  assert(body.length,'Actual description fillText calls');
  const compact=s=>s.replace(/\s/g,'');
  assert.equal(compact(body.map(line=>line.text).join('')),compact(state.displayedDetail),'Complete selected description is actually drawn');
  const measured=body.map(line=>{
    const scale=line.maxWidth===undefined?1:Math.min(1,line.maxWidth/line.width);
    const box={left:line.x-line.left*scale,right:line.x+line.right*scale,top:line.y-line.ascent,bottom:line.y+line.descent};
    assert(box.left>=122&&box.right<=606&&box.top>=1130&&box.bottom<=1287,`Description ink escapes source-art inset: ${JSON.stringify({line,box})}`);
    const fontSize=Number(line.font.match(/([\d.]+)px/)?.[1]);
    assert(fontSize>0&&fontSize<=26);
    const m=line.matrix;
    const css={left:m.a*box.left+m.e,right:m.a*box.right+m.e,top:m.d*box.top+m.f,bottom:m.d*box.bottom+m.f};
    assert(Math.abs(m.b)<1e-7&&Math.abs(m.c)<1e-7,'Text is not rotated');
    assert(css.left>=0&&css.right<=viewport.width&&css.top>=0&&css.bottom<=viewport.height,'Description remains inside the actual CSS viewport');
    return {...line,box,css,fontSize};
  });
  assert(result.draws.some(draw=>draw.source.includes('/mechanism-guide-v2/')&&draw.source.includes('detail')),'Actual supplied guide UI drawn');
  return {id:state.selectedId,title:state.selectedTitle,description:state.displayedDetail,lines:measured,
    scrollOffset:state.scrollOffset,visible:state.visibleItemIds};
}
await mkdir(output,{recursive:true});
const report={startedAt:new Date().toISOString(),status:'RUNNING',method:'Current Web source; synthetic MemoryHost; real Pointer navigation and scrolling; actual Canvas fillText ink bounds. No real player storage, no WeChat build.',
  inputsBefore:await inputs(),expectedEffects,cases:[]};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
try {
  for(const viewport of [{width:320,height:568},{width:496,height:1078}]) {
    const row={name:`${viewport.width}x${viewport.height}`,viewport,status:'RUNNING',entries:[],errors:[]};report.cases.push(row);
    const context=await browser.newContext({viewport,deviceScaleFactor:1,locale:'zh-CN'}),page=await context.newPage();
    try {
      await page.addInitScript(()=>{
        window.__STORAGE_VIOLATIONS__=[];
        for(const name of ['getItem','setItem','removeItem','clear'])Storage.prototype[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real Storage forbidden');};
        for(const name of ['open','deleteDatabase'])indexedDB[name]=function(){window.__STORAGE_VIOLATIONS__.push(name);throw Error('Real IndexedDB forbidden');};
      });
      page.on('pageerror',e=>row.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')row.errors.push(m.text());});
      page.on('response',r=>{if(r.status()>=400)row.errors.push(`${r.status()} ${r.url()}`);});
      const save=seed('guide');save.currentLevel=200;save.highestLevel=200;save.reducedMotion=true;
      save.bestStars=Object.fromEntries(Array.from({length:200},(_,i)=>[String(i+1),3]));
      save.rewardedLevels=Array.from({length:200},(_,i)=>i+1);
      save.journeyProgress.seenEpisodeUnlockLevels=Array.from({length:19},(_,i)=>11+i*10);
      save.metaDiscovery={collectionViewedThroughLevel:200,dailyUnlockSeen:true};
      await page.route('**/*',route=>route.request().url()===origin+'/__guide-copy'
        ?route.fulfill({contentType:'text/html',body:fixture(save)})
        :route.request().url().startsWith(origin)||route.request().url().startsWith('data:')?route.continue():route.abort());
      await page.goto(origin+'/__guide-copy',{waitUntil:'networkidle'});
      await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__;return g?.artReady&&g.storageBaselineReady&&g.getDebugState().screen==='home';});
      await click(page,'navigation.4');
      await page.waitForFunction(()=>{const s=window.__COLOR_ESCAPE__.getDebugState();return s.screen==='records'&&!s.navigation.transition&&s.collectionAlbum.art.ready&&s.collectionAlbum.art.artworkReady;});
      await click(page,'collectionAlbumGuide');
      await page.waitForFunction(()=>{const s=window.__COLOR_ESCAPE__.getDebugState();return s.screen==='mechanismGuide'&&s.collection.artReady&&!s.art.formalPage.requested&&!s.art.formalPage.error;});
      await page.waitForTimeout(350);
      const state=await debug(page);assert.equal(state.collection.unlocked,15);assert.equal(state.collection.allTotal,15);
      // All 15 on both sizes is inexpensive and avoids guessing the longest line after wrapping.
      for(const id of state.collection.orderedItemIds) {
        await select(page,id);const result=await probe(page),entry=checkText(result,viewport);
        const file=resolve(output,`${row.name}-${id}.png`);await page.screenshot({path:file});
        entry.screenshot={file,sha256:sha(await readFile(file))};row.entries.push(entry);
        await writeFile(resolve(output,'partial.json'),JSON.stringify(report,null,2));
      }
      await click(page,'mechanismGuideClose');await page.waitForFunction(()=>window.__COLOR_ESCAPE__.getDebugState().screen==='records');
      const end=await snapshot(page);row.pointerEvents=end.audit.pointers;row.storageViolations=end.storageViolations;
      row.imageErrors=end.audit.images.filter(i=>i.error);row.drawnImageUrls=end.audit.history;
      assert.deepEqual(row.storageViolations,[]);assert.deepEqual(row.imageErrors,[]);assert.deepEqual(row.errors,[]);
      assert(row.pointerEvents.filter(p=>p.type==='pointerdown').length>=18);
      assert.equal(end.saved.coins,save.coins);assert.equal(end.saved.collectionProgress.inspiration,save.collectionProgress.inspiration);
      row.status='PASS';
    } catch(error) {
      row.status='FAIL';row.failure=String(error.stack??error);
      await page.screenshot({path:resolve(output,`${row.name}-failure.png`)}).catch(()=>{});
      row.failureSnapshot=await snapshot(page).catch(e=>({error:String(e)}));
    } finally {await context.close();}
    console.log(`${row.name}: ${row.status}, ${row.entries.length} entries${row.failure?' '+row.failure.split('\n')[0]:''}`);
  }
} finally {
  await browser.close();await server.close();report.inputsAfter=await inputs();
  report.inputsUnchanged=JSON.stringify(report.inputsBefore)===JSON.stringify(report.inputsAfter);
  report.status=report.cases.length===2&&report.cases.every(row=>row.status==='PASS')&&report.inputsUnchanged?'PASS':'FAIL';
  report.completedAt=new Date().toISOString();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({status:report.status,inputsUnchanged:report.inputsUnchanged,output}));
if(report.status!=='PASS')process.exitCode=1;
