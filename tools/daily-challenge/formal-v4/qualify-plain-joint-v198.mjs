import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {loadDailyDifficultyPolicyV198} from './difficulty-policy-v198.mjs';
import {assertOriginalMathematicalEvidenceV198} from './admit-incremental-entry-v198.mjs';

// Read-only evidence qualification. This module never instantiates a model,
// invokes a search/replay/history consumer, claims an input or registers data.
export const VERSION='plain-joint-original-evidence-current-ui-qualification-v198';
export const SELF='tools/daily-challenge/formal-v4/qualify-plain-joint-v198.mjs';
const V='deliverables/daily-formal-v4-20261008',LEDGER='deliverables/daily-formal-v3-20261008/proof/attempts';
const FROZEN=V+'/frozen-workspace-4588',TOOLCHAIN='45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804';
const DOMAIN={path:V+'/proof/pulse-rescue-nonparticipant-domain-readonly-01/report.json',sha256:'e1222d6c4a3880f44f8c71a0008da857c2d180d11a16609c4bb7410fa228b07d'};
const ADMIT={path:'tools/daily-challenge/formal-v4/admit-incremental-entry-v198.mjs',sha256:'50e77150d7c3d75ccd2ba8ed6ccc9c94f9bc89e09434d2351dafd881e735419a'};
const sha=b=>createHash('sha256').update(b).digest('hex');
const isHash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
const exactKeys=(q,keys)=>assert.deepEqual(Object.keys(q).sort(),[...keys].sort());
const descriptor=d=>{exactKeys(d,['path','sha256']);assert(typeof d.path==='string'&&d.path.length&&isHash(d.sha256));};
export function assertPlainJointQualificationConfigV198(c){
 exactKeys(c,['version','candidate','rootDesign','pointer','visual','output']);assert.equal(c.version,VERSION);
 for(const k of ['candidate','rootDesign','pointer','visual'])descriptor(c[k]);
 assert(typeof c.output==='string'&&c.output.startsWith(V+'/proof/')&&c.output.endsWith('.json'));
 assert.equal(path.posix.normalize(c.output),c.output);assert(!c.output.includes('..')&&!c.output.includes('\\'));
 for(const k of ['candidate','rootDesign','pointer','visual'])assert.notEqual(path.resolve(c.output),path.resolve(c[k].path));
 return c;
}
export function assertPlainJointAttemptPlanV198(p,metadata){
 assert.equal(p.difficultyPolicyVersion,'1.198.0');assert.deepEqual(p.strategy,{route:'plain-joint',lower:'plain'});
 assert.equal(p.inputLevelSha256,metadata.levelSha256);assert.equal(p.providedRouteSha256,null);
 assert.equal(p.formedBeforeClaim,true);assert.equal(p.sameExactObjectRevalidationAllowed,false);
 assert.equal(p.mechanismBaseReceipt,null);assert.equal(p.acceptedBaseMechanismAdaptationRequested,false);
 assert(p.redesignOf===null||isHash(p.redesignOf));assert.deepEqual(p.band,metadata.band);
 assert(Number.isSafeInteger(p.searchUpper)&&p.searchUpper>=p.band.lower&&p.searchUpper<=256);
 const ceilings={maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000};
 for(const budget of [p.lowerBudget,p.upperBudget]){exactKeys(budget,Object.keys(ceilings));for(const[k,max]of Object.entries(ceilings))assert(Number.isSafeInteger(budget[k])&&budget[k]>0&&budget[k]<=max,k);}
 return Object.fromEntries(Object.keys(ceilings).map(k=>[k,Math.min(p.lowerBudget[k],p.upperBudget[k])]));
}
export function assertNewPlainJointReceiptV198(q){
 assert.equal(q.schemaVersion,4);assert.equal(q.contractVersion,'daily-300-frozen-math-first-attempt-tolerance-v198');
 assert.equal(q.difficultyPolicyVersion,'1.198.0');assert.equal(q.accepted,true);assert.equal(q.formalReady,false);assert.equal(q.qualificationOnly,false);
 assert.equal(q.catalogEligible,true);assert.equal(q.redesignRequired,false);assert(!Object.hasOwn(q,'timeSchedule')&&!Object.hasOwn(q,'timeScheduleSha256'));
 assert.equal(q.status,'FROZEN_MATH_V198_VERIFIED_AWAITING_DESIGN_AND_POINTER');assert.deepEqual(q.reasons,[]);
 assert.equal(q.stageKey,'basic-combined');assert.equal(q.newestMechanism,null);assert([1,2,3].includes(q.difficulty));
 assert(Number.isSafeInteger(q.slot)&&q.slot>=1&&q.slot<=10);assert.equal(q.formalId,`daily-basic-combined-d${q.difficulty}-${String(q.slot).padStart(2,'0')}`);
 assert(Number.isSafeInteger(q.sourceLevelId)&&q.sourceLevelId>=1&&q.sourceLevelId<=200);
 assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(q.level.id,q.sourceLevelId);
 assert(Array.isArray(q.drags)&&q.drags.length);assert.equal(routeSha256(q.drags),q.routeSha256);
 assertPlainProofDomain(q.level);assert(!Object.hasOwn(q.level,'pulseRescue'));
 assert.equal(q.lowerBound?.method,'v3-plain-joint-search');assert.equal(q.lowerBound.projectedLevelSha256,null);assert.equal(q.lowerBound.projection,null);
 assert.equal(q.attemptPlanSha256,levelSha256(q.attemptPlan));
 assert.equal(q.toolchainSha256,TOOLCHAIN);assert.equal(levelSha256(q.toolchainBindings),TOOLCHAIN);assert.equal(Object.keys(q.toolchainBindings).length,36);
 assert.equal(q.policyToolchainSha256,levelSha256(q.policyBindings));
 assert(isHash(q.attempt?.id)&&isHash(q.attempt.retryIdentitySha256));assert.equal(q.attempt.identityOrigin,q.attempt.id);assert(!q.attempt.revalidates&&!q.attempt.lockFile);
 const budget=assertPlainJointAttemptPlanV198(q.attemptPlan,{levelSha256:q.levelSha256,band:q.band});
 assert.deepEqual(q.lowerBound.result.budget,budget);assert.deepEqual(q.route?.search,q.lowerBound.result,'Joint upper and lower must be the same original result');
 assert(q.lowerBound.result.guardAllowance,'New proofs must have the original guard, never a retrospective budget summary');
 assert.equal(q.lowerBound.result.routeTermination,'minimum-relaxed-route-found');assert.equal(q.lowerBound.result.cost,q.U);
 assert.deepEqual(q.lowerBound.result.drags,q.drags);assert.equal(q.lowerBound.result.certifiedFloor,q.U);
 return budget;
}
export function assertPlainOriginalRouteMetadataV198(q){
 const a=q.route.canonicalReplay,b=q.route.independentReplay,ids=new Set(q.level.blocks.map(x=>x.id));
 assert.equal(ids.size,q.level.blocks.length);assert.equal(q.route.inputLevelSha256,q.levelSha256);assert.equal(q.route.routeSha256,q.routeSha256);
 for(const r of [a,b]){assert(r.valid&&r.complete&&r.failed===false);assert.equal(r.nonClearingDrags,q.U);assert.equal(r.effectiveDrags,q.drags.length);assert.equal(r.clearEvents,ids.size);}
 assert.equal(b.remainingBodies,0);assert.equal(b.remainingQueued,0);assert.equal(b.trace.length,q.drags.length);
 const removed=new Set();let nonClearing=0;
 for(const[i,t]of b.trace.entries()){
  assert.equal(t.index,i);assert.equal(t.moves,i+1);assert.equal(t.blockId,q.drags[i].blockId);assert(ids.has(t.blockId)&&!removed.has(t.blockId));
  assert(t.clearDelta===0||t.clearDelta===1);assert.equal(!!q.drags[i].exitSide,t.clearDelta===1);assert.equal(t.complete,i===q.drags.length-1);
  if(t.clearDelta)removed.add(t.blockId);else nonClearing++;
 }
 assert.equal(removed.size,ids.size);assert.equal(nonClearing,q.U);assert.equal(b.trace.at(-1).stateSha256,b.finalStateSha256);
 const final=JSON.parse(a.finalStateKey);assert(final.complete&&!final.failed);assert.deepEqual(final.blocks,[]);assert.deepEqual(final.queuedBlocks,[]);assert.equal(final.cleared,ids.size);
 const w=q.route.witnessValidation;assert.equal(w.providedRoute,false);assert.equal(w.searchPerformed,true);assert.equal(w.fullBoardSearchStates,q.lowerBound.result.discoveredStates);assert.equal(w.drags,q.drags.length);assert.equal(w.unitSteps,q.drags.reduce((n,d)=>n+d.path.length,0));
 return{canonicalValidComplete:true,independentValidComplete:true,completeOriginalInventory:true,bodies:ids.size,nonClearingDrags:nonClearing,totalDrags:q.drags.length};
}
export function assertRootViewedPointerImagesV198(visual,pointerDescriptor,formalId,images){
 assert.equal(visual.method,'view_image');assert.equal(visual.passed,true);assert.equal(visual.formalId,formalId);assert.equal(visual.pointerReportSha256,pointerDescriptor.sha256);
 assert(Array.isArray(visual.images)&&visual.images.length===4);assert.equal(images.length,4);
 for(const x of visual.images){assert.equal(x.actuallyViewed,true);assert(typeof x.path==='string'&&isHash(x.sha256));}
 const key=x=>path.resolve(x.path).toLowerCase()+'|'+x.sha256;
 assert.equal(new Set(images.map(key)).size,4);assert.deepEqual(visual.images.map(key).sort(),images.map(key).sort(),'Root must view exactly the four actual current Pointer PNGs');
}

export async function qualifyPlainJointV198(configDescriptor){
 descriptor(configDescriptor);assert.notEqual(path.basename(process.cwd()),'frozen-workspace-4588','Current source-workspace qualification required');
 const fileBindings={},absentFiles=[];
 async function bind(p,h){const b=await fs.readFile(p),actual=sha(b);if(h)assert.equal(actual,h,p);if(fileBindings[p])assert.equal(actual,fileBindings[p],p);fileBindings[p]=actual;return{path:p,sha256:actual};}
 async function read(d){descriptor(d);await bind(d.path,d.sha256);const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256);return JSON.parse(b);}
 async function readCurrent(p){const d=await bind(p);return{d,q:await read(d)};}
 async function absent(p){try{await fs.lstat(p);assert.fail('Failed/pending/output path exists: '+p);}catch(e){if(e.code!=='ENOENT')throw e;}}
 const c=assertPlainJointQualificationConfigV198(await read(configDescriptor));await absent(c.output);
 const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.198.0');await bind('docs/rules/manifest.json');
 const policy=await loadDailyDifficultyPolicyV198();for(const[p,h]of Object.entries(policy.bindings))await bind(p,h);
 const q=await read(c.candidate);assertNewPlainJointReceiptV198(q);assert(policy.accepts(q.difficulty,q.L,q.U));assert.deepEqual(q.band,policy.bands[q.difficulty]);assert.equal(q.L,q.band.lower,'New producer records the real requested threshold, not the route cost');
 assert.deepEqual(q.attemptPlan.policyBindings,policy.bindings);assert.deepEqual(q.difficultyPolicyBindings,policy.bindings);
 const replay=assertPlainOriginalRouteMetadataV198(q),stem=LEDGER+'/'+q.attempt.id;
 const request=await readCurrent(stem+'.request.json'),result=await readCurrent(stem+'.result.json'),plan=await readCurrent(stem+'.v4-plan.json');
 assert.deepEqual(request.q,q.attempt);assert.deepEqual(plan.q.attempt,q.attempt);assert.deepEqual(plan.q.plan,q.attemptPlan);assert.deepEqual(plan.q.policyBindings,q.policyBindings);
 assert.equal(result.q.accepted,true);assert.equal(result.q.status,q.status);assert.equal(result.q.levelSha256,q.levelSha256);
 assert.deepEqual(result.q.lower,q.lowerBound.result);assert.deepEqual(result.q.upper,q.route.search);assert.equal(q.attemptPlan.redesignOf,request.q.redesignOf);
 const identity=await readCurrent(LEDGER+'/identities/'+request.q.retryIdentitySha256+'.json');assert.equal(identity.q.origin,request.q.id);
 for(const p of [stem+'.blocked.json',stem+'.revalidation.lock',LEDGER+'/identities/'+request.q.retryIdentitySha256+'.blocked.json']){await absent(p);absentFiles.push(p);}
 const math={historicalReceipt:c.candidate,request:request.d,result:result.d,originalPlan:plan.d,identity:identity.d,attemptId:request.q.id,
  method:q.lowerBound.method,lowerStatus:q.lowerBound.result.status,lowerTermination:q.lowerBound.result.termination,lowerEvidenceSha256:levelSha256(q.lowerBound),
  rawFullBoardStates:q.lowerBound.result.rawFullBoardStates,proofInputLevelSha256:q.lowerBound.result.sourceLevelSha256,projectedLevelSha256:null,
  canonicalValidComplete:replay.canonicalValidComplete,independentValidComplete:replay.independentValidComplete,completeOriginalInventory:replay.completeOriginalInventory,
  guardAllowance:q.lowerBound.result.guardAllowance,jointUpperAndLowerSameOriginalResult:true,mathematicalCalls:1,originalValuesUnchanged:true};
 const originalMathematics=assertOriginalMathematicalEvidenceV198(q,math,{original:q,request:request.q,result:result.q});
 const guard=q.lowerBound.result.guardAllowance;assert.equal(guard.frozenProofToolchainSha256,TOOLCHAIN);await bind(guard.wrapper.path,guard.wrapper.sha256);
 assert.equal(guard.terminalBehavior,'first-unregistered-world-throws-and-immediately-returns-no-recovery-or-continuation');
 for(const[p,h]of Object.entries(q.policyBindings))await bind(p,h);
 assert(q.staticAudit?.passed&&q.staticAudit.levelSha256===q.levelSha256);assert.deepEqual(q.staticAudit.issues,[]);
 assert(q.staticAudit.opening.passed&&q.staticAudit.hidden.passed&&q.staticAudit.queue.passed&&q.staticAudit.support.supported);
 for(const[p,h]of Object.entries(q.staticAudit.policyBindings))await bind(p,h);
 for(const[p,h]of Object.entries(q.toolchainBindings)){assert(!path.isAbsolute(p));const f=path.resolve(FROZEN,p);assert(f.startsWith(path.resolve(FROZEN)+path.sep));await bind(f,h);}
 const domain=await read(DOMAIN);assert.equal(domain.status,'INDEPENDENT_PULSE_RESCUE_ABSENT_DOMAIN_EQUIVALENCE_PASS');assert.deepEqual(domain.errors,[]);
 const sr=domain.sourceReview;assert.equal(sr.completeSourceReconstructionBothDirections,true);
 for(const d of [sr.oldModel,sr.newModel,sr.oldTypes,sr.newTypes])await bind(d.path,d.sha256);
 async function reconstruct(a,b,replacements){let x=(await fs.readFile(a.path,'utf8')).replaceAll('\r\n','\n'),y=(await fs.readFile(b.path,'utf8')).replaceAll('\r\n','\n');const old=x,now=y;for(const r of replacements){assert.equal(x.split(r.oldText).length,2);x=x.replace(r.oldText,r.newText);}for(const r of [...replacements].reverse()){assert.equal(y.split(r.newText).length,2);y=y.replace(r.newText,r.oldText);}assert.equal(x,now);assert.equal(y,old);}
 await reconstruct(sr.oldModel,sr.newModel,sr.modelExactReplacements);await reconstruct(sr.oldTypes,sr.newTypes,sr.typesExactReplacements);
 const compatibleChanges=[];
 for(const[p,h]of Object.entries(q.toolchainBindings)){
  if(['src/game/ColorEscapeGame.ts','src/game/artManifest.ts'].includes(p))continue;
  const current=await bind(p);if(current.sha256!==h){const pair=p==='src/core/PuzzleModel.ts'?[sr.oldModel,sr.newModel]:p==='src/core/types.ts'?[sr.oldTypes,sr.newTypes]:null;
   assert(pair,'Unreviewed mathematical source drift '+p);assert.equal(pair[0].sha256,h);assert.equal(pair[1].sha256,current.sha256);compatibleChanges.push({path:p,old:h,current:current.sha256});}
 }
 assert.equal(compatibleChanges.length,2);
 const sourceBuild=await build({entryPoints:['src/core/levels.ts','src/core/dailyChallengeStagesV3.ts'],outdir:'.codex-temp/never-written-plain-qualification-data',bundle:true,write:false,metafile:true,format:'esm',platform:'node',logLevel:'silent'});
 for(const p of Object.keys(sourceBuild.metafile.inputs))await bind(p);
 const modules=await Promise.all(sourceBuild.outputFiles.map(f=>import('data:text/javascript;base64,'+Buffer.from(f.text).toString('base64'))));
 const source=modules.find(m=>m.LEVELS).LEVELS.find(x=>x.id===q.sourceLevelId),slot=modules.find(m=>m.DAILY_CHALLENGE_V3_SLOTS).DAILY_CHALLENGE_V3_SLOTS.find(x=>x.id===q.formalId);
 assert(source&&slot);assert.equal(levelSha256(source),q.sourceLevelSha256);assert.equal(levelSha256(source),q.staticAudit.sourceLevelSha256);
 for(const[k,v]of Object.entries({stageKey:slot.stageKey,difficulty:slot.difficulty,slot:slot.slot,newestMechanism:slot.newestMechanism}))assert.equal(q[k],v);
 const artBuild=await build({stdin:{contents:"export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';export {GAME_ART} from './src/game/artManifest.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,metafile:true,format:'esm',platform:'node',logLevel:'silent'});
 for(const p of Object.keys(artBuild.metafile.inputs))if(p!=='<stdin>')await bind(p);
 const {matchFormalBlockShape,GAME_ART}=await import('data:text/javascript;base64,'+Buffer.from(artBuild.outputFiles[0].text).toString('base64'));
 const blocked=new Set((q.level.blocked??[]).map(p=>p.join(','))),playable=new Set((q.level.playable??Array.from({length:q.level.width*q.level.height},(_,i)=>[i%q.level.width,Math.floor(i/q.level.width)])).filter(p=>!blocked.has(p.join(','))).map(p=>p.join(','))),occupancy=new Map(),assets=[];
 for(const b of q.level.blocks){
  const match=matchFormalBlockShape(b.shape,'native-only');assert(match&&match.quarterTurns===0);const a=q.staticAudit.artRequirements.find(x=>x.blockId===b.id);
  assert(a);assert.equal(a.kind,'solid');assert.equal(a.color,b.color);assert.equal(a.shapeId,match.shapeId);assert.equal(a.path,GAME_ART.gameplay.formalBlocks[b.color].solid[match.shapeId]);
  const current=await bind('public/'+a.path),historical=q.staticAudit.assetBindings[a.path];assert(isHash(historical));assets.push({blockId:b.id,shapeId:match.shapeId,quarterTurns:0,asset:current,historicalAssetSha256:historical,historicalAssetBytesUnchanged:current.sha256===historical});
  for(const[x,y]of b.shape){const key=[b.x+x,b.y+y].join(',');assert(playable.has(key)&&!occupancy.has(key));occupancy.set(key,b);}
 }
 assert.equal(occupancy.size,playable.size);for(const[key,b]of occupancy){const[x,y]=key.split(',').map(Number);for(const next of [[x+1,y],[x,y+1]]){const other=occupancy.get(next.join(','));assert(!other||other.id===b.id||other.color!==b.color);}}
 assert.equal(q.staticAudit.artRequirements.length,q.level.blocks.length);
 const rootDesign=await read(c.rootDesign),decision=rootDesign.designAccepted?.find(x=>x.formalId===q.formalId);
 assert(decision&&decision.status==='DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION');assert.equal(decision.levelSha256,q.levelSha256);assert.equal(decision.routeSha256,q.routeSha256);assert.equal(decision.receipt.sha256,c.candidate.sha256);
 await bind(decision.receipt.path,c.candidate.sha256);await read(decision.review);assert(!rootDesign.decisions?.some(x=>x.formalId===q.formalId&&x.formalAdoptionAllowed===false));
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
 const report={schemaVersion:1,status:'PLAIN_JOINT_V198_ORIGINAL_EVIDENCE_CURRENT_POINTER_QUALIFIED',createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,rows:[row],errors:[],originalMathematics,originalReplayMetadata:replay,
  currentStatic:{passed:true,levelSha256:q.levelSha256,playable:playable.size,covered:occupancy.size,bodies:q.level.blocks.length,overlaps:0,outside:0,adjacentSameColor:0,nativeQuarterTurns:0,assets,historicalAssetDrift:assets.filter(a=>!a.historicalAssetBytesUnchanged),oldAssetEvidenceUnchanged:true},
  runtimeCompatibility:{domainReview:DOMAIN,absentPulseRescue:true,originalDomainMembershipClaimed:false,sourceReconstructionBothDirections:true,compatibleChanges,currentSourceLevelSha256:levelSha256(source)},
  candidatePointer:c.pointer,visualReview:c.visual,formalCountObserved:entries.length,formalReady:false,registrationPerformed:false,newSearches:0,newModels:0,newReplays:0,newClaims:0,oldEvidenceChanged:false,absentFiles,fileBindings};
 for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h,p);for(const p of absentFiles)await absent(p);
 await fs.mkdir(path.dirname(c.output),{recursive:true});await fs.writeFile(c.output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return{output:c.output,sha256:sha(await fs.readFile(c.output)),formalId:q.formalId,L:q.L,U:q.U,bindings:Object.keys(fileBindings).length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,5);assert.equal(process.argv[2],'--qualify');
 console.log(JSON.stringify(await qualifyPlainJointV198({path:process.argv[3],sha256:process.argv[4]})));
}
