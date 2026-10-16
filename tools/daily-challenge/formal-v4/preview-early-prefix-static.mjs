import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {levelSha256} from '../formal-v2/contract.mjs';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';

// Actual Canvas openings of explicitly unaccepted static inputs. No gameplay
// route, lower bound, registry entry or final slot is fabricated for rendering.
const[input,auditPath,auditSha,output]=process.argv.slice(2);
assert(input&&auditPath&&/^[a-f0-9]{64}$/.test(auditSha??'')&&output,
 'Usage: preview-early-prefix-static construction-index static-audit-path static-audit-sha new-output-directory');
const hash=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p));
const auditBytes=await fs.readFile(auditPath);assert.equal(hash(auditBytes),auditSha);const audit=JSON.parse(auditBytes);
assert(['INDEPENDENT_FINITE_LOW_BAND_BATCH_STATIC_PASS','INDEPENDENT_EARLY_FROZEN_STATIC_PASS','INDEPENDENT_EARLY_PREFIX_STATIC_PASS'].includes(audit.status),'Verified finite static audit required');assert.equal(audit.publicClaimsStarted,0);assert.equal(audit.newGameplaySearches,0);
const indexBytes=await fs.readFile(input),index=JSON.parse(indexBytes);assert.equal(audit.index.sha256,hash(indexBytes));assert.equal(path.resolve(audit.index.path),path.resolve(input));
const runtime=await loadV4Runtime(),environment=prefixExecutionEnvironment(runtime);assert.deepEqual(environment,audit.environment);
const candidates=[];
for(const item of index.candidates){const bytes=await fs.readFile(item.path),receipt=JSON.parse(bytes);assert.equal(hash(bytes),item.sha256);
 assert.equal(receipt.accepted,false);assert.equal(receipt.L,null);assert.equal(receipt.U,null);assert.notEqual(receipt.fullOriginalUValidated,true);
 assert.equal(receipt.levelSha256,levelSha256(receipt.level));assert(audit.rows.some(r=>r.candidate.path===item.path&&r.candidate.sha256===item.sha256));
 candidates.push({id:path.basename(item.path,'.json'),file:item.path,receipt,sha256:item.sha256});}
assert.equal(candidates.length,audit.verifiedCandidates);await fs.mkdir(output,{recursive:false});
const sourceBindings={};async function bindTree(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())await bindTree(p);else sourceBindings[p]=hash(await fs.readFile(p));}}
await bindTree('src');const own='tools/daily-challenge/formal-v4/preview-early-prefix-static.mjs';sourceBindings[own]=hash(await fs.readFile(own));
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
await server.listen();const browser=await chromium.launch({headless:true}),rows=[];let next=0;
try{
 await Promise.all(Array.from({length:2},async()=>{
  const page=await browser.newPage({viewport:{width:496,height:1078}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=()=>{window.__STORAGE_VIOLATIONS__.push(m);throw Error('No player storage');};indexedDB.open=()=>{window.__STORAGE_VIOLATIONS__.push('indexedDB.open');throw Error('No player database');};});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tools/daily-challenge/formal-v3/pointer.html`);
  await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
  while(next<candidates.length){
   const item=candidates[next++],q=item.receipt;
   await page.evaluate(level=>{const g=window.__COLOR_ESCAPE__;g.loadLevel(level.id,false,false,level);g.updateToastVisible=false;g.screen='playing';g.dirty=true;g.scheduleFrame();},q.level);
   await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return d.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();});
   const image=`${output}/${item.id}.png`;await page.screenshot({path:image});
   const actual=await page.evaluate(()=>({debug:window.__COLOR_ESCAPE__.getDebugState(),storage:window.__STORAGE_VIOLATIONS__}));
   assert.equal(errors.length,0);assert.equal(actual.storage.length,0);
   rows.push({id:item.id,file:item.file,fileSha256:item.sha256,sourceLevelId:q.sourceLevelId,recipeId:q.recipeId,predeclaredUpperStrategy:q.predeclaredUpperStrategy,levelSha256:q.levelSha256,
    image:{path:image,sha256:hash(await fs.readFile(image))},board:actual.debug.board,missingWholeBlockIds:actual.debug.art.formalGameplay.missingWholeBlockIds,
    errors:[...errors],storage:actual.storage,prefixFacts:q.provenance?.prefixFacts??q.prefixAudit,L:null,U:null,accepted:false});
  }await page.close();
 }));
 rows.sort((a,b)=>a.id.localeCompare(b.id));const sheet=await browser.newPage({viewport:{width:1984,height:2400}}),sheets=[];
 for(let offset=0;offset<rows.length;offset+=8){const batch=rows.slice(offset,offset+8),cards=[];
  for(const r of batch)cards.push(`<article><header>${r.id} · 源${r.sourceLevelId}<br>完整U / L 尚未验证</header><img src="data:image/png;base64,${(await fs.readFile(r.image.path)).toString('base64')}"></article>`);
  await sheet.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:20px;width:1984px;background:#f4f1f9;font:22px sans-serif;color:#382842}main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}article{background:white}header{padding:12px}img{width:100%;height:auto;display:block}</style><h1>新静态库存实际Canvas开局 · 未接受候选</h1><main>${cards.join('')}</main>`);
  await sheet.evaluate(()=>Promise.all([...document.images].map(x=>x.decode())));const p=`${output}/sheet-${String(sheets.length+1).padStart(2,'0')}.jpg`;
  await sheet.screenshot({path:p,fullPage:true,type:'jpeg',quality:92});sheets.push({path:p,sha256:hash(await fs.readFile(p)),candidateIds:batch.map(r=>r.id)});
 }
 for(const[p,h]of Object.entries(sourceBindings))assert.equal(hash(await fs.readFile(p)),h,`Source changed during preview: ${p}`);
 assert.equal(hash(await fs.readFile(input)),hash(indexBytes));assert.equal(hash(await fs.readFile(auditPath)),auditSha);
 const report={status:'STATIC_INPUT_ACTUAL_CANVAS_OPENINGS_CAPTURED',index:{path:input,sha256:hash(indexBytes)},staticAudit:{path:auditPath,sha256:auditSha},
  executionEnvironment:environment,sourceBindings,rows,sheets,candidateInjection:true,accepted:false,formalRegistryIdentity:false,
  completeRouteValidated:false,difficultyValidated:false,pointerGameplayValidated:false,naturalTimeValidated:false,manualVisualReviewPending:true,
  playerSaveTouched:false,currentRuntimeValidationClaimed:false,newGameplaySearches:0,publicClaimsStarted:0,formalReady:false};
 await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({captured:rows.length,sheets:sheets.length,output,formalReady:false}));
}finally{await browser.close();await server.close();}
