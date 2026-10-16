// Opening-only current-UI preview of original, independently audited receipts.
// No factories, proof runtimes, solvers, route players or history adapters import.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const SELF='tools/daily-challenge/formal-v4/preview-accepted-three-band-ice-openings.mjs';
const BASE='deliverables/daily-formal-v4-20261008';
const TASK_VERSION='wholeboard-three-band-ice-exploratory-fixed-72-batch-v2';
const ACTUAL_STATUS='INDEPENDENT_WHOLEBOARD_THREE_BAND_ICE_SUPPLY_ACTUAL_PASS';
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])])):v;
const objectHash=v=>hash(JSON.stringify(canonical(v)));
const descriptor=d=>{assert(d&&typeof d.path==='string'&&d.path.length);assert(/^[a-f0-9]{64}$/.test(d.sha256??''));};
const html=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function assertPreviewConfiguration(c){
 assert(c&&typeof c==='object');
 assert.deepEqual(Object.keys(c).sort(),['completion','actualAudit','outputDirectory',...c.candidates===undefined?[]:['candidates']].sort());
 descriptor(c.completion);descriptor(c.actualAudit);
 assert(typeof c.outputDirectory==='string'&&c.outputDirectory.startsWith(BASE+'/preview-'));
 const absolute=path.resolve(c.outputDirectory),base=path.resolve(BASE);
 assert(absolute.startsWith(base+path.sep)&&path.dirname(absolute)===base,'New direct preview directory required');
 if(c.candidates!==undefined){assert(Array.isArray(c.candidates)&&c.candidates.length>0);c.candidates.forEach(descriptor);assert.equal(new Set(c.candidates.map(d=>path.resolve(d.path))).size,c.candidates.length);}
 return true;
}

export function assertPreviewBatch(c,done,audit){
 assertPreviewConfiguration(c);assert.equal(done.status,'WHOLEBOARD_BATCH_TASK_CLOSED');assert.equal(done.closed,true);
 assert.equal(done.disposition?.status,'COMPLETE');assert.equal(done.finalizationError,null);assert.deepEqual(done.unpersistedInputs,[]);
 assert.equal(done.maximumInputs,72);assert.equal(done.consumedInputs,72);assert.equal(done.receipts.length,72);
 done.receipts.forEach(descriptor);assert.equal(new Set(done.receipts.map(d=>path.resolve(d.path))).size,72);
 assert.equal(audit.status,ACTUAL_STATUS);assert.equal(audit.mode,'actual');assert.deepEqual(audit.errors,[]);
 assert.deepEqual(audit.completion,c.completion);assert.deepEqual(audit.plan,done.plan);assert.deepEqual(audit.candidates,done.receipts);
 assert.equal(audit.accepted,done.accepted);assert(Number.isInteger(done.accepted)&&done.accepted>=0&&done.accepted<=72);
 for(const k of ['newSearches','newConstructions','newReplayCalls','publicClaimsStarted'])assert.equal(audit[k],0);
 for(const d of c.candidates??[])assert(done.receipts.some(r=>r.path===d.path&&r.sha256===d.sha256),'Explicit receipt must be an original audited member');
 return true;
}

export function assertPreviewCandidate(q,construction,done){
 assert.equal(q.version,TASK_VERSION);assert.deepEqual(q.plan,done.plan);assert.equal(q.accepted,true);
 assert.equal(q.status,'EXPLORATORY_WHOLEBOARD_ICE_EXACT_BAND_SUPPLY_ACCEPTED');assert.equal(q.mathematicalEvidenceValidated,true);
 for(const k of ['formalId','stageKey','difficulty'])assert.equal(q[k],null);
 for(const k of ['formalReady','catalogEligible','designAccepted'])assert.equal(q[k],false);
 assert(Number.isInteger(q.recipeIndex)&&q.recipeIndex>=0&&q.recipeIndex<72);assert(typeof q.recipeId==='string'&&q.recipeId.length);
 assert.equal(q.level.id,q.sourceLevelId);assert.equal(q.level.difficulty,'super');assert.equal(objectHash(q.level),q.levelSha256);
 assert.equal(construction.ok,true);assert.deepEqual(construction.level,q.level);assert.equal(construction.levelSha256,q.levelSha256);
 assert.deepEqual(construction.plan,done.plan);assert.equal(construction.recipeId,q.recipeId);
 const k=q.derivedCertificate?.k;assert(Number.isInteger(k)&&k>=16&&k<=128);
 assert.equal(q.L,k);assert.equal(q.U,k);assert.equal(q.derivedCertificate.L,k);assert.equal(q.derivedCertificate.U,k);
 assert.equal(q.derivedCertificate.sourceLevelSha256,q.levelSha256);assert.equal(q.derivedCertificate.routeSha256,q.routeSha256);
 assert.equal(q.derivedCertificate.qualificationOnly,false);assert.equal(q.derivedCertificate.formalSlotAssigned,false);
 assert.equal(q.admissionBand,k<=20?1:k<=30?2:3);assert.equal(q.derivedCertificate.admissionBand,q.admissionBand);
 assert.equal(q.joint.accepted,true);assert.deepEqual(q.joint.derivedCertificate,q.derivedCertificate);
 assert.equal(q.joint.L,k);assert.equal(q.joint.U,k);assert.equal(q.joint.admissionBand,q.admissionBand);
 assert.equal(q.routeSha256,objectHash(q.drags));assert.deepEqual(q.drags,q.joint.drags);assert.deepEqual(q.route,q.joint.route);
 assert.equal(q.route.inputLevelSha256,q.levelSha256);assert.equal(q.route.routeSha256,q.routeSha256);
 for(const r of [q.route.canonicalReplay,q.route.independentReplay]){assert.equal(r.valid,true);assert.equal(r.complete,true);assert.equal(r.nonClearingDrags,k);}
 // These checks bind already-audited evidence. They do not rerun its proof.
 return true;
}

export async function previewAcceptedOpenings(configPath){
 const bindings={},rows=[],sheets=[];let browser,server;const errors=[];
 async function bind(p){const b=await fs.readFile(p);bindings[p]=hash(b);return b;}
 async function bound(d){descriptor(d);const b=await bind(d.path);assert.equal(hash(b),d.sha256,d.path);return JSON.parse(b);}
 const configBytes=await bind(configPath),c=JSON.parse(configBytes);assertPreviewConfiguration(c);
 const done=await bound(c.completion),audit=await bound(c.actualAudit);assertPreviewBatch(c,done,audit);
 const chosen=[];let acceptedCount=0;
 for(const d of done.receipts){const q=await bound(d);assert.deepEqual(q.plan,done.plan);if(q.accepted)acceptedCount++;
  const requested=c.candidates?.some(r=>r.path===d.path&&r.sha256===d.sha256)??q.accepted;
  if(requested){assert.equal(q.accepted,true);const construction=await bound(q.constructionEvidence);assertPreviewCandidate(q,construction,done);chosen.push({descriptor:d,q});}}
 assert.equal(acceptedCount,done.accepted);assert.equal(chosen.length,c.candidates?.length??acceptedCount);
 assert.equal(new Set(chosen.map(x=>x.q.recipeIndex)).size,chosen.length);
 await fs.mkdir(c.outputDirectory,{recursive:false});
 const output=path.resolve(c.outputDirectory),configuration={path:configPath,sha256:hash(configBytes)},viewport={width:496,height:1078};
 try{
  const manifest=JSON.parse(await bind('docs/rules/manifest.json'));await bind(manifest.versions.find(v=>v.version===manifest.activeVersion).document);
  async function bindTree(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name).replaceAll('\\','/');if(e.isDirectory())await bindTree(p);else await bind(p);}}
  await bindTree('src');for(const p of [SELF,'tools/daily-challenge/formal-v3/pointer.html','tools/daily-challenge/formal-v3/pointer-browser.mjs','package.json','pnpm-lock.yaml','node_modules/playwright/package.json','node_modules/vite/package.json'])await bind(p);
  if(chosen.length){
   const {chromium}=await import('playwright'),{createServer}=await import('vite');
   server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,watch:null},logLevel:'error'});await server.listen();
   const origin=`http://127.0.0.1:${server.httpServer.address().port}`;browser=await chromium.launch({headless:true});
   for(const item of chosen){
    const {q}=item,page=await browser.newPage({viewport}),pageErrors=[],requests=new Set();page.on('pageerror',e=>pageErrors.push(e.message));page.on('request',r=>requests.add(r.url()));
    await page.addInitScript(()=>{window.__STORAGE_VIOLATIONS__=[];window.__PREVIEW_INPUTS__=[];
     for(const m of ['getItem','setItem','removeItem','clear'])Storage.prototype[m]=()=>{window.__STORAGE_VIOLATIONS__.push(m);throw Error('No player storage');};
     for(const m of ['open','deleteDatabase'])indexedDB[m]=()=>{window.__STORAGE_VIOLATIONS__.push(`indexedDB.${m}`);throw Error('No player database');};
     for(const type of ['pointerdown','pointermove','pointerup','keydown'])window.addEventListener(type,e=>window.__PREVIEW_INPUTS__.push({type:e.type,isTrusted:e.isTrusted}),true);
    });
    await page.goto(`${origin}/tools/daily-challenge/formal-v3/pointer.html`);await page.waitForFunction(()=>window.__COLOR_ESCAPE__?.artReady&&window.__COLOR_ESCAPE__?.storageBaselineReady);
    const loaded=await page.evaluate(async({level,band})=>{
     const {createDailyChallengeState,dailyChallengeDayKey}=await import('/src/core/dailyChallenge.ts');const g=window.__COLOR_ESCAPE__,dayKey=dailyChallengeDayKey();
     const draw=g.drawFormalWholeBlockAt.bind(g);window.__PREVIEW_DRAW__={calls:0,rotated:0,canvasRotationCalls:0};
     g.drawFormalWholeBlockAt=function(image,match,...args){const a=window.__PREVIEW_DRAW__;a.calls++;if(match.quarterTurns!==0)a.rotated++;const rotate=g.ctx.rotate;g.ctx.rotate=function(angle){if(angle!==0)a.canvasRotationCalls++;return rotate.call(this,angle);};try{return draw(image,match,...args);}finally{g.ctx.rotate=rotate;}};
     g.loadLevel(level.id,false,false,level);g.save.currentLevel=1;g.save.dailyChallenge=createDailyChallengeState(dayKey,200);
     g.save.activeRun={...g.createRunJournal(level.id),returnLevelId:1,daily:true,dailyDayKey:dayKey,dailyChallengeDifficulty:band,dailyChallengeSourceLevelId:level.id,lifeStarted:true};
     g.dailyChallengePendingDifficulty=band;g.updateToastVisible=false;g.screen='playing';g.dirty=true;g.scheduleFrame();
     return{level:structuredClone(g.model.level),daily:Boolean(g.dailyChallengeRunInfo())};
    },{level:q.level,band:q.admissionBand});
    assert.deepEqual(loaded.level,q.level);assert.equal(objectHash(loaded.level),q.levelSha256);assert(loaded.daily);
    await page.waitForFunction(()=>{const g=window.__COLOR_ESCAPE__,d=g.getDebugState();return d.puzzle?.started&&!g.revisedArtLoading&&d.art.formalGameplay.requestedBlockSignature==null&&d.art.formalGameplay.missingWholeBlockIds.length===0&&!g.hasInitialRevisedRegionPresentation()&&!g.hasActiveMechanicMotion();});
    const imagePath=path.join(output,`candidate-${String(q.recipeIndex+1).padStart(2,'0')}-${q.levelSha256.slice(0,12)}.png`);await page.screenshot({path:imagePath});
    const actual=await page.evaluate(()=>({level:structuredClone(window.__COLOR_ESCAPE__.model.level),debug:window.__COLOR_ESCAPE__.getDebugState(),storage:window.__STORAGE_VIOLATIONS__,inputs:window.__PREVIEW_INPUTS__,draw:window.__PREVIEW_DRAW__,memoryHost:window.__DAILY_CANDIDATE__.storage()}));
    assert.deepEqual(actual.level,q.level);assert.equal(objectHash(actual.level),q.levelSha256);assert.deepEqual(pageErrors,[]);assert.deepEqual(actual.storage,[]);assert.deepEqual(actual.inputs,[]);
    assert.equal(actual.debug.puzzle.moves,0);assert.equal(actual.debug.puzzle.blocks.length,q.level.blocks.length);assert(actual.draw.calls>0);assert.equal(actual.draw.rotated,0);assert.equal(actual.draw.canvasRotationCalls,0);
    for(const b of q.level.blocks){const live=actual.debug.puzzle.blocks.find(x=>x.id===b.id);assert(live);for(const k of ['x','y','color'])assert.equal(live[k],b[k]);assert.deepEqual(live.shape,b.shape);}
    const virtualRequests=[];for(const url of requests){if(url.startsWith('data:'))continue;assert(url.startsWith(origin+'/'),`Unexpected request ${url}`);const p=decodeURIComponent(new URL(url).pathname).slice(1);let found=false;for(const f of [path.resolve(p),path.resolve('public',p)]){try{if((await fs.stat(f)).isFile()){await bind(f);found=true;break;}}catch(e){if(e.code!=='ENOENT')throw e;}}if(!found)virtualRequests.push(url);}
    rows.push({candidate:item.descriptor,construction:q.constructionEvidence,recipeIndex:q.recipeIndex,recipeId:q.recipeId,sourceLevelId:q.sourceLevelId,arm:q.experimentEnvelope.arm,originalFormalId:q.formalId,originalStageKey:q.stageKey,originalDifficulty:q.difficulty,presentationBand:q.admissionBand,
     originalMathematicalEvidence:{accepted:true,L:q.L,U:q.U,routeSha256:q.routeSha256,derivedCertificate:q.derivedCertificate,revalidated:false},levelSha256:q.levelSha256,loadedObjectSha256:objectHash(loaded.level),postScreenshotObjectSha256:objectHash(actual.level),
     image:{path:imagePath,sha256:hash(await fs.readFile(imagePath))},board:actual.debug.board,openingSnapshot:actual.debug.puzzle,nativeDrawAudit:actual.draw,missingWholeBlockIds:actual.debug.art.formalGameplay.missingWholeBlockIds,storageViolations:actual.storage,inputEvents:actual.inputs,memoryHost:actual.memoryHost,errors:pageErrors,virtualRequests});
    await page.close();console.log(JSON.stringify({captured:rows.length,total:chosen.length,recipeId:q.recipeId}));
   }
   const page=await browser.newPage({viewport:{width:1984,height:2400}});
   for(let offset=0;offset<rows.length;offset+=8){const batch=rows.slice(offset,offset+8),cards=[];for(const r of batch)cards.push(`<article><header>${html(r.recipeId)}<br>源${r.sourceLevelId} · ${html(r.arm)} · D${r.presentationBand} · L=U=${r.originalMathematicalEvidence.L}</header><img src="data:image/png;base64,${(await fs.readFile(r.image.path)).toString('base64')}"></article>`);
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:20px;width:1984px;background:#f4f1f9;color:#382842;font:20px sans-serif}main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}article{background:white}header{padding:12px;overflow-wrap:anywhere}img{width:100%;display:block}</style><h1>已证候选原开局 · 设计待审 · 未接入正式槽</h1><main>${cards.join('')}</main>`);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));const file=path.join(output,`sheet-${String(sheets.length+1).padStart(2,'0')}.jpg`);await page.screenshot({path:file,fullPage:true,type:'jpeg',quality:92});sheets.push({path:file,sha256:hash(await fs.readFile(file)),recipes:batch.map(r=>r.recipeId)});
   }await page.close();
  }
  for(const[p,h]of Object.entries(bindings))assert.equal(hash(await fs.readFile(p)),h,`Bytes changed during preview: ${p}`);
  const report={schemaVersion:1,status:rows.length?'ORIGINAL_THREE_BAND_ACCEPTED_CANVAS_OPENINGS_CAPTURED':'NO_ACCEPTED_OBJECTS_TO_PREVIEW',configuration,completion:c.completion,actualAudit:c.actualAudit,executionWorkspace:process.cwd(),activeRuleVersion:manifest.activeVersion,environment:'CURRENT_ROOT_UI_RANDOM_LOCAL_PORT_MEMORY_HOST',viewport,rows,sheets,sourceBindings:bindings,
   originalLevelInjectedWithoutModification:true,receiptMetadataChanged:false,presentationBandSource:'original accepted admissionBand; volatile UI journal only',uiModelInitializedForPreview:rows.length>0,naturalOpeningFrames:rows.length>0,newCandidateConstruction:false,newMathematicalSearches:0,newRouteReplays:0,publicClaimsStarted:0,historyLoads:0,
   pointerGameplayValidated:false,naturalTimeAcceptance:false,playerSaveTouched:false,selectionChanged:false,formalRegistryIdentity:false,designAccepted:false,catalogEligible:false,formalReady:false,manualVisualReviewPending:rows.length>0,errors};
  const file=path.join(output,'report.json');await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({report:{path:file,sha256:hash(await fs.readFile(file))},captured:rows.length,sheets:sheets.length}));return report;
 }catch(e){errors.push(String(e?.stack??e));await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({status:'OPENING_PREVIEW_FAILED',configuration,completion:c.completion,actualAudit:c.actualAudit,rows,sheets,errors,sourceBindings:bindings,secondAttemptStarted:false},null,2)+'\n',{flag:'wx'});throw e;}
 finally{if(browser)await browser.close();if(server)await server.close();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,3,'Usage: node preview-accepted-three-band-ice-openings.mjs exact-config.json');await previewAcceptedOpenings(process.argv[2]);}
