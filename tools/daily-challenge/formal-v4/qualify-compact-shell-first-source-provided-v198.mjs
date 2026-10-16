import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {assertRootViewedPointerImagesV198} from './qualify-plain-joint-v198.mjs';
import {assertShellOriginalRouteMetadataV198,assertRootShellMechanismReviewV198} from './shell-provided-qualification-metadata-v198.mjs';
import {assertNewShellFirstSourceProvidedReceiptV198} from './shell-first-source-provided-qualification-metadata-v198.mjs';
import {assertCompactShellFirstSourceProvidedExecutionEvidenceV198,assertSameCompactDescriptorV198} from './compact-shell-first-source-provided-execution-evidence-v198.mjs';
import {assertCompactShellCurrentCompatibilityV198} from './compact-shell-current-compatibility-v198.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {loadDailyDifficultyPolicyV198} from './difficulty-policy-v198.mjs';
import {assertOriginalMathematicalEvidenceV198} from './admit-incremental-entry-v198.mjs';

// Read-only evidence qualification. This module never instantiates a model,
// invokes a search/replay/history consumer, claims an input or registers data.
export const VERSION='compact-shell-first-source-provided-current-ui-qualification-v198-v1';
export const SELF='tools/daily-challenge/formal-v4/qualify-compact-shell-first-source-provided-v198.mjs';
const V='deliverables/daily-formal-v4-20261008',LEDGER='deliverables/daily-formal-v3-20261008/proof/attempts';
const FROZEN=V+'/frozen-workspace-4588',TOOLCHAIN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const ADMIT={path:'tools/daily-challenge/formal-v4/admit-incremental-entry-v198.mjs',sha256:'50e77150d7c3d75ccd2ba8ed6ccc9c94f9bc89e09434d2351dafd881e735419a'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const isHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const exactKeys=(q,keys)=>assert.deepEqual(Object.keys(q).sort(),[...keys].sort());
const descriptor=d=>{exactKeys(d,['path','sha256']);assert(typeof d.path==='string'&&d.path.length&&isHash(d.sha256));};
export function assertCompactShellFirstSourceProvidedQualificationConfigV198(c){
 exactKeys(c,['version','candidate','rootDesign','pointer','visual','completion','mechanismReview','successorIndex','successorIndexReview','compatibilityReview','output']);assert.equal(c.version,VERSION);
 for(const k of ['candidate','rootDesign','pointer','visual','completion','mechanismReview','successorIndex','successorIndexReview','compatibilityReview'])descriptor(c[k]);
 assert(typeof c.output==='string'&&c.output.startsWith(V+'/proof/')&&c.output.endsWith('.json'));
 assert.equal(path.posix.normalize(c.output),c.output);assert(!c.output.includes('..')&&!c.output.includes('\\'));
 for(const k of ['candidate','rootDesign','pointer','visual','completion','mechanismReview','successorIndex','successorIndexReview','compatibilityReview'])assert.notEqual(path.resolve(c.output),path.resolve(c[k].path));
 return c;
}

export async function qualifyCompactShellFirstSourceProvidedV198(configDescriptor){
 descriptor(configDescriptor);assert.notEqual(path.basename(process.cwd()),'frozen-workspace-4588','Current source-workspace qualification required');
 const fileBindings={},absentFiles=[];
 async function bind(p,h){const b=await fs.readFile(p),actual=sha(b);if(h)assert.equal(actual,h,p);if(fileBindings[p])assert.equal(actual,fileBindings[p],p);fileBindings[p]=actual;return{path:p,sha256:actual};}
 async function read(d){descriptor(d);await bind(d.path,d.sha256);const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256);return JSON.parse(b);}
 async function readCurrent(p){const d=await bind(p);return{d,q:await read(d)};}
 async function absent(p){try{await fs.lstat(p);assert.fail('Failed/pending/output path exists: '+p);}catch(e){if(e.code!=='ENOENT')throw e;}}
 const c=assertCompactShellFirstSourceProvidedQualificationConfigV198(await read(configDescriptor));await absent(c.output);
 const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.198.0');await bind('docs/rules/manifest.json');
 const policy=await loadDailyDifficultyPolicyV198();for(const[p,h]of Object.entries(policy.bindings))await bind(p,h);
 const q=await read(c.candidate);const shellEvidence=assertNewShellFirstSourceProvidedReceiptV198(q);assert(policy.accepts(q.difficulty,q.L,q.U));assert.deepEqual(q.band,policy.bands[q.difficulty]);assert.equal(q.L,q.band.lower,'New producer records the real requested threshold, not the route cost');
 assert.deepEqual(q.attemptPlan.policyBindings,policy.bindings);assert.deepEqual(q.difficultyPolicyBindings,policy.bindings);
 const replay=assertShellOriginalRouteMetadataV198(q),stem=LEDGER+'/'+q.attempt.id;
 const request=await readCurrent(stem+'.request.json'),result=await readCurrent(stem+'.result.json'),plan=await readCurrent(stem+'.v4-plan.json');
 assert.deepEqual(request.q,q.attempt);assert.deepEqual(plan.q.attempt,q.attempt);assert.deepEqual(plan.q.plan,q.attemptPlan);assert.deepEqual(plan.q.policyBindings,q.policyBindings);
 assert.equal(result.q.accepted,true);assert.equal(result.q.status,q.status);assert.equal(result.q.levelSha256,q.levelSha256);
 assert.deepEqual(result.q.lower,q.lowerBound.result);assert.deepEqual(result.q.upper,q.route.search);assert.equal(q.attemptPlan.redesignOf,request.q.redesignOf);
 const identity=await readCurrent(LEDGER+'/identities/'+request.q.retryIdentitySha256+'.json');assert.equal(identity.q.origin,request.q.id);
 for(const p of [stem+'.blocked.json',stem+'.revalidation.lock',LEDGER+'/identities/'+request.q.retryIdentitySha256+'.blocked.json']){await absent(p);absentFiles.push(p);}
 const math={historicalReceipt:c.candidate,request:request.d,result:result.d,originalPlan:plan.d,identity:identity.d,attemptId:request.q.id,
  method:q.lowerBound.method,lowerStatus:q.lowerBound.result.status,lowerTermination:q.lowerBound.result.termination,lowerEvidenceSha256:levelSha256(q.lowerBound),
  rawFullBoardStates:q.lowerBound.result.rawFullBoardStates,proofInputLevelSha256:q.lowerBound.result.sourceLevelSha256,projectedLevelSha256:q.lowerBound.projectedLevelSha256,
  canonicalValidComplete:replay.canonicalValidComplete,independentValidComplete:replay.independentValidComplete,completeOriginalInventory:replay.completeOriginalInventory,
  guardAllowance:q.lowerBound.result.guardAllowance,providedOriginalRoute:true,upperSearchCalls:0,mathematicalCalls:1,originalValuesUnchanged:true};
 const originalMathematics=assertOriginalMathematicalEvidenceV198(q,math,{original:q,request:request.q,result:result.q});
 const {finalizeMembership,...execution}=await assertCompactShellFirstSourceProvidedExecutionEvidenceV198(q,c.candidate,c.completion,c.successorIndex,c.successorIndexReview,{read,bind});
 const mechanismReview=await read(c.mechanismReview);assertRootShellMechanismReviewV198(mechanismReview,c.candidate,q,replay);
 const independentMechanism=await read(mechanismReview.independentMechanismReview);assertSameCompactDescriptorV198(independentMechanism.candidate,c.candidate);
 for(const k of ['formalId','levelSha256','routeSha256'])assert.equal(independentMechanism[k],q[k]);assert.deepEqual(independentMechanism.errors,[]);
 for(const[p,h]of Object.entries(independentMechanism.fileBindings))await bind(p,h);
 assertSameCompactDescriptorV198(mechanismReview.currentPointer,c.pointer);await read(mechanismReview.currentPointer);await read(mechanismReview.rootVisual);
 const guard=q.lowerBound.result.guardAllowance;assert.equal(guard.frozenProofToolchainSha256,TOOLCHAIN);await bind(guard.wrapper.path,guard.wrapper.sha256);
 assert.equal(guard.terminalBehavior,'first-unregistered-world-throws-and-immediately-returns-no-recovery-or-continuation');
 for(const[p,h]of Object.entries(q.policyBindings))await bind(p,h);
 assert(q.staticAudit?.passed&&q.staticAudit.levelSha256===q.levelSha256);assert.deepEqual(q.staticAudit.issues,[]);
 assert(q.staticAudit.opening.passed&&q.staticAudit.hidden.passed&&q.staticAudit.queue.passed&&q.staticAudit.support.supported);
 for(const[p,h]of Object.entries(q.staticAudit.policyBindings))await bind(p,h);
 for(const[p,h]of Object.entries(q.toolchainBindings)){assert(!path.isAbsolute(p));const f=path.resolve(FROZEN,p);assert(f.startsWith(path.resolve(FROZEN)+path.sep));await bind(f,h);}
 const runtimeCompatibility=await assertCompactShellCurrentCompatibilityV198(q,c.candidate,c.compatibilityReview,{read,bind});
 const sourceBuild=await build({entryPoints:['src/core/levels.ts','src/core/dailyChallengeStagesV3.ts'],outdir:'.codex-temp/never-written-shell-qualification-data',bundle:true,write:false,metafile:true,format:'esm',platform:'node',logLevel:'silent'});
 for(const p of Object.keys(sourceBuild.metafile.inputs))await bind(p);
 const modules=await Promise.all(sourceBuild.outputFiles.map(f=>import('data:text/javascript;base64,'+Buffer.from(f.text).toString('base64'))));
 const source=modules.find(m=>m.LEVELS).LEVELS.find(x=>x.id===q.sourceLevelId),slot=modules.find(m=>m.DAILY_CHALLENGE_V3_SLOTS).DAILY_CHALLENGE_V3_SLOTS.find(x=>x.id===q.formalId);
 assert(source&&slot);assert.equal(levelSha256(source),q.sourceLevelSha256);assert.equal(levelSha256(source),q.staticAudit.sourceLevelSha256);
 for(const[k,v]of Object.entries({stageKey:slot.stageKey,difficulty:slot.difficulty,slot:slot.slot,newestMechanism:slot.newestMechanism}))assert.equal(q[k],v);
 const artBuild=await build({stdin:{contents:"export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';export {GAME_ART} from './src/game/artManifest.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,metafile:true,format:'esm',platform:'node',logLevel:'silent'});
 for(const p of Object.keys(artBuild.metafile.inputs))if(p!=='<stdin>')await bind(p);
 const {matchFormalBlockShape,GAME_ART}=await import('data:text/javascript;base64,'+Buffer.from(artBuild.outputFiles[0].text).toString('base64'));
 const blocked=new Set((q.level.blocked??[]).map(p=>p.join(','))),playable=new Set((q.level.playable??Array.from({length:q.level.width*q.level.height},(_,i)=>[i%q.level.width,Math.floor(i/q.level.width)])).filter(p=>!blocked.has(p.join(','))).map(p=>p.join(','))),occupancy=new Map(),assets=[];
 const expectedArt=[];
 for(const b of q.level.blocks){
  const match=matchFormalBlockShape(b.shape,'native-only');assert(match&&match.quarterTurns===0);
  const layers=b.layers??[b.color];
  for(const[index,color]of layers.entries())for(const kind of index<layers.length-1?['solid','shell']:['solid']){
   const assetPath=GAME_ART.gameplay.formalBlocks[color]?.[kind]?.[match.shapeId];assert(assetPath);
   expectedArt.push({blockId:b.id,color,kind,shapeId:match.shapeId,path:assetPath});
   const current=await bind('public/'+assetPath),historical=q.staticAudit.assetBindings[assetPath];assert(isHash(historical));
   assets.push({blockId:b.id,layer:index,color,kind,shapeId:match.shapeId,quarterTurns:0,asset:current,historicalAssetSha256:historical,historicalAssetBytesUnchanged:current.sha256===historical});
  }
  for(const[x,y]of b.shape){const key=[b.x+x,b.y+y].join(',');assert(playable.has(key)&&!occupancy.has(key));occupancy.set(key,b);}
 }
 assert.deepEqual(q.staticAudit.artRequirements,expectedArt,'All outer and inner solid/shell assets, preserving layer order');
 assert.equal(occupancy.size,playable.size);for(const[key,b]of occupancy){const[x,y]=key.split(',').map(Number);for(const next of [[x+1,y],[x,y+1]]){const other=occupancy.get(next.join(','));assert(!other||other.id===b.id||other.color!==b.color);}}
 const rootDesign=await read(c.rootDesign),decision=rootDesign.designAccepted?.find(x=>x.formalId===q.formalId);
 assert(decision&&decision.status==='DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION');assert.equal(decision.levelSha256,q.levelSha256);assert.equal(decision.routeSha256,q.routeSha256);assert.equal(decision.receipt.sha256,c.candidate.sha256);
 await bind(decision.receipt.path,c.candidate.sha256);assertSameCompactDescriptorV198(decision.review,c.mechanismReview);await read(decision.review);assert(!rootDesign.decisions?.some(x=>x.formalId===q.formalId&&x.formalAdoptionAllowed===false));
 const pointer=await read(c.pointer),visual=await read(c.visual);assert.equal(pointer.status,'INCREMENTAL_CANDIDATES_CURRENT_POINTER_RUNS_PASS');assert.equal(pointer.passed,2);assert.equal(pointer.results.length,2);
 assert.deepEqual(pointer.results.map(x=>x.viewport).sort((a,b)=>a.width-b.width),[{width:320,height:568},{width:496,height:1078}]);
 const images=[];
 for(const row of pointer.results){assert.equal(row.formalId,q.formalId);const p=await read(row.report);assert.equal(p.status,'CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS');assert.deepEqual(p.viewport,row.viewport);assert.equal(p.receipt.sha256,c.candidate.sha256);await bind(p.receipt.path,c.candidate.sha256);
  assert.equal(p.levelSha256,q.levelSha256);assert.equal(p.routeSha256,q.routeSha256);assert.equal(p.U,q.U);assert.equal(p.totalDrags,q.drags.length);
  assert(p.pointerValidated&&p.timeValidated&&p.settlementValidated&&p.naturalClock&&!p.clockMocked);assert(p.finalPuzzle.complete&&!p.finalPuzzle.failed&&!p.finalPuzzle.blocks&&!p.finalPuzzle.queuedBlocks);
  assert(p.drawAudit.calls>0&&!p.drawAudit.rotated&&!p.drawAudit.canvasRotationCalls);assert.deepEqual(p.errors,[]);assert.deepEqual(p.storageViolations,[]);
  for(const d of Object.values(p.screenshots)){await bind(d.path,d.sha256);images.push(d);}
 }
 assertRootViewedPointerImagesV198(visual,c.pointer,q.formalId,images);for(const d of visual.images)await bind(d.path,d.sha256);
 for(const[p,h]of Object.entries(pointer.bindings))await bind(p,h);
 const registryFile='src/core/formalDailyChallenge300Data.ts',text=await fs.readFile(registryFile,'utf8'),marker='export const FORMAL_DAILY_300_ENTRIES: readonly FormalDaily300Entry[] = Object.freeze(',start=text.indexOf(marker);assert(start>=0);
 const entries=JSON.parse(text.slice(start+marker.length,text.lastIndexOf(');')));assert.equal(levelSha256(entries),text.match(/FORMAL_DAILY_300_REVISION = "([a-f0-9]{64})"/)[1]);assert(!entries.some(x=>x.formalId===q.formalId||x.layoutSha256===q.levelSha256));await bind(registryFile,sha(text));
 await bind(ADMIT.path,ADMIT.sha256);await bind(SELF);
 const controls=await build({entryPoints:[SELF],bundle:true,write:false,metafile:true,format:'esm',platform:'node',packages:'external',logLevel:'silent'});for(const p of Object.keys(controls.metafile.inputs))await bind(p);
 const row={formalId:q.formalId,candidate:c.candidate,sourceLevelId:q.sourceLevelId,stageKey:q.stageKey,difficulty:q.difficulty,slot:q.slot,levelSha256:q.levelSha256,routeSha256:q.routeSha256,L:q.L,U:q.U,totalDrags:q.drags.length,toolchainSha256:q.toolchainSha256,qualified:true,
  designAcceptance:{rootDisposition:c.rootDesign,review:decision.review,status:decision.status},mathematicalEvidence:math,difficultyPolicy:{version:policy.version,band:policy.bands[q.difficulty],actualProofValuesUnchanged:true}};
 const report={schemaVersion:1,status:'COMPACT_SHELL_FIRST_SOURCE_PROVIDED_V198_ORIGINAL_EVIDENCE_CURRENT_POINTER_QUALIFIED',createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,rows:[row],errors:[],originalMathematics,originalReplayMetadata:replay,shellEvidence,execution,mechanismReview:c.mechanismReview,
  currentStatic:{passed:true,levelSha256:q.levelSha256,playable:playable.size,covered:occupancy.size,bodies:q.level.blocks.length,overlaps:0,outside:0,adjacentSameColor:0,nativeQuarterTurns:0,assets,historicalAssetDrift:assets.filter(a=>!a.historicalAssetBytesUnchanged),oldAssetEvidenceUnchanged:true},
  runtimeCompatibility:{...runtimeCompatibility,currentSourceLevelSha256:levelSha256(source)},
  candidatePointer:c.pointer,visualReview:c.visual,formalCountObserved:entries.length,formalReady:false,registrationPerformed:false,newSearches:0,newModels:0,newReplays:0,newClaims:0,oldEvidenceChanged:false,absentFiles,fileBindings};
 for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h,p);for(const p of absentFiles)await absent(p);
 await finalizeMembership();
 await fs.mkdir(path.dirname(c.output),{recursive:true});await fs.writeFile(c.output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return{output:c.output,sha256:sha(await fs.readFile(c.output)),formalId:q.formalId,L:q.L,U:q.U,bindings:Object.keys(fileBindings).length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,5);assert.equal(process.argv[2],'--qualify');
 console.log(JSON.stringify(await qualifyCompactShellFirstSourceProvidedV198({path:process.argv[3],sha256:process.argv[4]})));
}
