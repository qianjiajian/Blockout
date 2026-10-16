import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createServer} from 'vite';

// One Canvas opening of the original accepted exploratory object. No registry
// wrapper, invented formal/stage identity, gameplay input, or mathematical call.
const SELF='tools/daily-challenge/formal-v4/preview-ice24-candidate20-opening.mjs';
const BASE='deliverables/daily-formal-v4-20261008';
const completionDescriptor={path:`${BASE}/design/wholeboard-ice-d3-supply-twentyfour-actual-01/completion.json`,sha256:'e6808e5b3ba9326fd03e0f797ab2716862a3466cad15272eb1ef4db9473664af'};
const candidateDescriptor={path:`${BASE}/design/wholeboard-ice-d3-supply-twentyfour-actual-01/candidate-20.json`,sha256:'6ac2cd808d38979c4881133da3d838730b10e8759f58688a816c31e961a31e2e'};
const output=process.argv[2];assert(output,'Supply a new preview output directory');
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
const objectHash=v=>hash(JSON.stringify(canonical(v))),bindings={};
async function bind(p){const h=hash(await fs.readFile(p));bindings[p]=h;return h;}
async function bound(d){const b=await fs.readFile(d.path);assert.equal(hash(b),d.sha256,d.path);bindings[d.path]=d.sha256;return JSON.parse(b);}
const completion=await bound(completionDescriptor),q=await bound(candidateDescriptor);
assert(completion.receipts.some(d=>d.path===candidateDescriptor.path&&d.sha256===candidateDescriptor.sha256));
assert.equal(completion.consumedInputs,24);assert.equal(completion.accepted,1);assert.equal(completion.finalizationError,null);
assert.equal(q.accepted,true);assert.equal(q.L,31);assert.equal(q.U,35);assert.equal(q.sourceLevelId,118);
assert.equal(q.formalReady,false);assert.equal(q.designAccepted,false);assert.equal(q.catalogEligible,false);
assert.equal(objectHash(q.level),q.levelSha256);assert.equal(q.levelSha256,'465c7311e356580d7737aea4e95ba8bfdae40c8018dc43cc8ba96b1503762b92');
const construction=await bound(q.constructionEvidence);assert.deepEqual(construction.level,q.level);
const manifest=JSON.parse(await fs.readFile('docs/rules/manifest.json'));
await bind('docs/rules/manifest.json');await bind(manifest.versions.find(v=>v.version===manifest.activeVersion).document);
async function bindTree(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())await bindTree(p);else await bind(p);}}
await bindTree('src');
for(const p of [SELF,'tools/daily-challenge/formal-v4/preview-reviewed-static-inputs.mjs','tools/daily-challenge/formal-v3/pointer.html','tools/daily-challenge/formal-v3/pointer-browser.mjs','package.json','pnpm-lock.yaml','node_modules/playwright/package.json','node_modules/vite/package.json'])await bind(p);
await fs.mkdir(output,{recursive:false});
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});
let browser;const errors=[],requests=new Set(),viewport={width:496,height:1078};
try{
 await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.add(r.url()));
 await page.addInitScript(()=>{
  window.__STORAGE_VIOLATIONS__=[];window.__PREVIEW_INPUTS__=[];
  for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=()=>{window.__STORAGE_VIOLATIONS__.push(m);throw Error('No player storage');};
  for(const m of ['open','deleteDatabase'])indexedDB[m]=()=>{window.__STORAGE_VIOLATIONS__.push(`indexedDB.${m}`);throw Error('No player database');};
  for(const type of ['pointerdown','pointermove','pointerup','keydown'])window.addEventListener(type,e=>window.__PREVIEW_INPUTS__.push({type:e.type,isTrusted:e.isTrusted}),true);
 });
 await page.goto(`${origin}/tools/daily-challenge/formal-v3/pointer.html`);
 await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
 const loaded=await page.evaluate(async({level,difficulty})=>{
  const {createDailyChallengeState,dailyChallengeDayKey}=await import('/src/core/dailyChallenge.ts');
  const g=window.__COLOR_ESCAPE__,dayKey=dailyChallengeDayKey();
  g.loadLevel(level.id,false,false,level);g.save.currentLevel=1;g.save.dailyChallenge=createDailyChallengeState(dayKey,200);
  g.save.activeRun={...g.createRunJournal(level.id),returnLevelId:1,daily:true,dailyDayKey:dayKey,dailyChallengeDifficulty:difficulty,dailyChallengeSourceLevelId:level.id,lifeStarted:true};
  g.dailyChallengePendingDifficulty=difficulty;g.updateToastVisible=false;g.screen='playing';g.dirty=true;g.scheduleFrame();
  return {level:structuredClone(g.model.level),daily:Boolean(g.dailyChallengeRunInfo())};
 },{level:q.level,difficulty:q.difficulty});
 assert.deepEqual(loaded.level,q.level);assert.equal(objectHash(loaded.level),q.levelSha256);assert(loaded.daily);
 await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return d.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();});
 const imagePath=path.resolve(output,'candidate-20-opening.png');
 await page.screenshot({path:imagePath});
 const actual=await page.evaluate(()=>({level:structuredClone(window.__COLOR_ESCAPE__.model.level),debug:window.__COLOR_ESCAPE__.getDebugState(),storage:window.__STORAGE_VIOLATIONS__,inputs:window.__PREVIEW_INPUTS__,memoryHost:window.__DAILY_CANDIDATE__.storage()}));
 assert.deepEqual(actual.level,q.level);assert.equal(objectHash(actual.level),q.levelSha256);
 assert.equal(errors.length,0);assert.equal(actual.storage.length,0);assert.equal(actual.inputs.length,0);
 assert.equal(actual.debug.puzzle.moves,0);assert.equal(actual.debug.puzzle.blocks.length,q.level.blocks.length);
 for(const b of q.level.blocks){const live=actual.debug.puzzle.blocks.find(x=>x.id===b.id);assert(live);assert.equal(live.x,b.x);assert.equal(live.y,b.y);assert.equal(live.color,b.color);assert.deepEqual(live.shape,b.shape);}
 const image={path:imagePath,sha256:hash(await fs.readFile(imagePath))};
 // Bind every directly fetched local source/asset in addition to the full src
 // tree. Vite virtual transforms are described, not mislabelled file bytes.
 const virtualRequests=[];
 for(const url of requests){if(url.startsWith('data:'))continue;assert(url.startsWith(origin+'/'),`Unexpected remote request ${url}`);const pathname=decodeURIComponent(new URL(url).pathname).slice(1);let found=false;for(const p of [path.resolve(pathname),path.resolve('public',pathname)]){try{if((await fs.stat(p)).isFile()){await bind(p);found=true;break;}}catch(e){if(e.code!=='ENOENT')throw e;}}if(!found)virtualRequests.push(url);}
 for(const[p,h]of Object.entries(bindings))assert.equal(hash(await fs.readFile(p)),h,`Bytes changed during preview: ${p}`);
 const report={schemaVersion:1,status:'ORIGINAL_EXPLORATORY_ACCEPTED_CANVAS_OPENING_CAPTURED',createdAt:new Date().toISOString(),completion:completionDescriptor,candidate:candidateDescriptor,construction:q.constructionEvidence,
  executionWorkspace:process.cwd(),activeRuleVersion:manifest.activeVersion,environment:'CURRENT_ROOT_UI_RANDOM_LOCAL_PORT_MEMORY_HOST',viewport,
  sourceLevelId:q.sourceLevelId,recipeId:q.recipeId,originalFormalId:q.formalId,originalStageKey:q.stageKey,levelSha256:q.levelSha256,
  originalMathematicalEvidence:{accepted:q.accepted,L:q.L,U:q.U,routeSha256:q.routeSha256,revalidated:false},
  originalLevelInjectedWithoutModification:true,originalLevelReturnedByGame:true,loadedObjectSha256:objectHash(loaded.level),postScreenshotObjectSha256:objectHash(actual.level),
  image,board:actual.debug.board,openingSnapshot:actual.debug.puzzle,missingWholeBlockIds:actual.debug.art.formalGameplay.missingWholeBlockIds,
  storageViolations:actual.storage,inputEvents:actual.inputs,memoryHost:actual.memoryHost,errors,sourceBindings:bindings,virtualRequests,
  uiModelInitializedForPreview:true,naturalOpeningFrames:true,newCandidateConstruction:false,newMathematicalSearches:0,newRouteReplays:0,publicClaimsStarted:0,historyLoads:0,
  pointerGameplayValidated:false,naturalTimeAcceptance:false,playerSaveTouched:false,selectionChanged:false,formalRegistryIdentity:false,designAccepted:false,catalogEligible:false,formalReady:false,manualVisualReviewPending:true};
 const reportPath=path.resolve(output,'report.json');await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({image,report:{path:reportPath,sha256:hash(await fs.readFile(reportPath))},levelSha256:q.levelSha256,sourceBindings:Object.keys(bindings).length,errors}));
}catch(e){await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({status:'OPENING_PREVIEW_FAILED',error:String(e?.stack??e),completion:completionDescriptor,candidate:candidateDescriptor,errors,sourceBindings:bindings,secondAttemptStarted:false},null,2)+'\n',{flag:'wx'});throw e;}
finally{if(browser)await browser.close();await server.close();}
