// Read-only formal opening capture. No moves, player storage, map edits, or release.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifySourceCatalog} from './remake21to30-source-v139.mjs';

const lock=verifyRulesLock(); assert(lock.ok); assert.equal(lock.activeVersion,'1.39.0');
const previous='deliverables/remake21-30-v139-20260924';
const baseline=JSON.parse(fs.readFileSync(`${previous}/baseline.json`)); verifySourceCatalog(baseline.sources);
const verified=JSON.parse(fs.readFileSync(`${previous}/formal-verification-1790222337379.json`));
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEVELS}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
assert.equal(digest(LEVELS),verified.campaignSha256,'Current formal data must match accepted batch');
const output=path.resolve('deliverables',`comparison21-30-v139-${Date.now()}`);
fs.mkdirSync(path.join(output,'originals'),{recursive:true});
const bindings={};
function tree(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())tree(file);else bindings[file.replaceAll('\\','/')]=digest(fs.readFileSync(file));}}
tree('src');tree('public/assets/art');
for(const file of ['tools/capture-comparison21to30-v139.mjs','tools/remake21to30-browser.mjs','tools/remake21to30.html'])bindings[file]=digest(fs.readFileSync(file));
const report={status:'running',createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,campaignSha256:verified.campaignSha256,viewport:{width:496,height:1078},bindings,rows:[],errors:[],playerSaveTouched:false,movesPerformed:0,scope:'opening-visual-capture-only'};
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({headless:true});
try{
 for(let id=21;id<=30;id++){
  const page=await browser.newPage({viewport:report.viewport});
  page.on('pageerror',e=>report.errors.push({id,message:e.message}));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent storage forbidden');};for(const m of ['open','deleteDatabase'])indexedDB[m]=function(){window.__STORAGE_VIOLATIONS__.push(m);throw Error('Persistent database forbidden');};});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/remake21to30.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady,undefined,{timeout:60000});
  const entry=await page.evaluate(id=>window.__REMAKE_FORMAL__.load(id),id);
  assert.deepEqual(entry.level,LEVELS[id-1]);assert(entry.formalObjectIdentity);
  await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g?.getDebugState();return d?.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion()&&!d.exitAnimations.length&&!d.revisedMechanismAnimations.length&&!d.generatorSpawnAnimations.length;},undefined,{timeout:20000});
  const state=await page.evaluate(()=>window.__COLOR_ESCAPE__.getDebugState());
  assert.equal(state.puzzle.moves,0);assert.equal(state.puzzle.cleared,0);assert(!state.puzzle.failed);
  assert.deepEqual(await page.evaluate(()=>window.__STORAGE_VIOLATIONS__),[]);
  const file=`originals/our-lv${id}.png`;
  await page.screenshot({path:path.join(output,file)});
  const canvas=await page.locator('canvas').boundingBox(),b=state.board,t=state.viewportTransform;
  const x=Math.max(0,Math.floor(canvas.x+t.offsetX+(b.innerX-b.cell*.72)*t.scale));
  const y=Math.max(0,Math.floor(canvas.y+t.offsetY+(b.innerY-b.cell*.72)*t.scale));
  const right=Math.min(report.viewport.width,Math.ceil(canvas.x+t.offsetX+(b.innerX+b.innerWidth+b.cell*.72)*t.scale));
  const bottom=Math.min(report.viewport.height,Math.ceil(canvas.y+t.offsetY+(b.innerY+b.innerHeight+b.cell*.72)*t.scale));
  report.rows.push({id,file,sha256:digest(fs.readFileSync(path.join(output,file))),levelSha256:digest(entry.level),formalObjectIdentity:entry.formalObjectIdentity,crop:{x,y,width:right-x,height:bottom-y},moves:state.puzzle.moves,cleared:state.puzzle.cleared,remainingSeconds:state.puzzle.remainingSeconds,missingWholeBlockIds:state.art.formalGameplay.missingWholeBlockIds,board:state.board,viewportTransform:t});
  console.log(`Lv${id}: formal opening captured, moves=0`);
  await page.close();
 }
 assert.deepEqual(report.errors,[]);
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e);process.exitCode=1;}
finally{await browser.close();await server.close();fs.writeFileSync(path.join(output,'capture-report.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({output,status:report.status,error:report.error}));
