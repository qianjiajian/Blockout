import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {guardAllowanceFor} from './reserved-guard-budget.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';

// Read-only evidence verification. No ledger factory, solver or generator is
// imported/called. All new files stay in the audit's own directory.
const root='deliverables/daily-formal-v3-20261008',ledger=`${root}/proof/attempts`,out=`${root}/proof/representative-beam-03-04-completion-audit`;
assert(!fs.existsSync(out));fs.mkdirSync(out);
const inputHashes=new Map(),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bind=p=>{const value=sha(p);if(inputHashes.has(p))assert.equal(inputHashes.get(p),value,'Input changed during audit');inputHashes.set(p,value);return{path:p,sha256:value};};
const read=p=>{bind(p);return JSON.parse(fs.readFileSync(p,'utf8'));};
const failures=[],check=(ok,code,context)=>{if(!ok)failures.push({code,...context});return ok;};
const same=(a,b)=>levelSha256(a)===levelSha256(b);
const tool='tools/daily-challenge/formal-v3/design-promote-beam.mjs',currentTool=bind(tool),runtime=await loadBoundedRuntime(),lineage=createReferenceLineageReader();
const batches=['representative-beam-03','representative-beam-04'].map(name=>({name,report:read(`${root}/design/${name}/report.json`),index:read(`${root}/design/${name}/index.json`)}));
const packetByAttempt=new Map();
for(const name of ['representative-promotion-01','representative-late-promotion-02','representative-beam-03','representative-beam-04']){
 const dir=`${root}/design/${name}`;
 for(const name of fs.readdirSync(dir).filter(n=>/^candidate-.*\.json$/.test(n))){const path=`${dir}/${name}`,p=read(path);if(p.attempt?.id)packetByAttempt.set(p.attempt.id,{path,p});}
}
const requestFiles=fs.readdirSync(ledger).filter(n=>n.endsWith('.request.json'));
const replayCache=new Map();
function actualReplay(path,expectedU){
 if(replayCache.has(path)){const got=replayCache.get(path);check(got.U===expectedU,'ANCHOR_U_MISMATCH',{path,expectedU,actual:got.U});return got;}
 const p=read(path),a=runtime.replayRevisedRoute(p.level,p.drags),b=independentReplay(runtime,p.level,p.drags,{}),
  valid=!!(a.valid&&a.complete&&!a.failed&&b.valid&&b.complete&&!b.failed&&a.nonClearingDrags===b.nonClearingDrags&&a.nonClearingDrags===expectedU);
 const result={...bind(path),valid,U:a.nonClearingDrags,totalDrags:a.effectiveDrags,independentU:b.nonClearingDrags,complete:a.complete&&b.complete,failed:!!(a.failed||b.failed),providedRouteOnly:true};
 check(valid,'KNOWN_ROUTE_REPLAY_FAILED',{path,expectedU,result});replayCache.set(path,result);return result;
}
const auditBatches=[];
for(const batch of batches){
 const r=batch.report,context={batch:batch.name},candidateFiles=fs.readdirSync(`${root}/design/${batch.name}`).filter(n=>/^candidate-.*\.json$/.test(n)),rows=[];
 check(r.status==='FINITE_NEW_DESIGN_BEAM_FINISHED','NOT_FINISHED',context);check(r.rows.length===(batch.name.endsWith('03')?192:48),'COUNT',context);
 check(candidateFiles.length===r.rows.length,'EXTRA_OR_MISSING_CANDIDATE',context);check(r.records.length===0&&batch.index.records.length===0,'UNEXPECTED_ACCEPTED_PROPOSAL',context);
 check(sha(r.indexFile)===r.indexSha256,'SELECTED_INDEX_CHANGED',context);bind(r.indexFile);
 const representativeFiles=new Set(read(r.indexFile).files),refBySource=new Map(r.references.map(x=>[x.source,x]));
 let actualCount=0,providedRoutes=0,maxRaw=0,maxConservative=0,maxMicro=0,maxActions=0;const anchors=new Map(),lastAttemptBySource=new Map();
 for(const ref of r.references){
  check(representativeFiles.has(ref.file),'REFERENCE_NOT_SELECTED',{...context,file:ref.file});check(sha(ref.file)===ref.sha256,'REPRESENTATIVE_RECEIPT_CHANGED',{...context,file:ref.file});
  const receipt=read(ref.file),base=read(ref.base);check(receipt.sourceLevelId===ref.source,'SOURCE_REFERENCE_MISMATCH',context);
  if(ref.baseFileSha256)check(sha(ref.base)===ref.baseFileSha256,'REFERENCE_BASE_CHANGED',context);
  // Batch 03 did not store baseFileSha256 in its report, but the selected
  // receipt and each anchor provenance independently bind the original base.
  check(sha(receipt.baseInputFile)===receipt.baseInputFileSha256,'RECEIPT_BASE_CHANGED',{...context,file:receipt.baseInputFile});bind(receipt.baseInputFile);
  check(same(lineage.inspect(ref.base).roots,[ref.family]),'REFERENCE_FAMILY_MISMATCH',{...context,file:ref.base});
  actualReplay(ref.base,ref.U);
 }
 const ids=new Set();
 for(const row of r.rows){
  const p=read(row.path),where={...context,path:row.path},a=p.attempt,proof=p.proof,f=designFingerprints(p.level),id=a.id;
  check(!ids.has(id),'DUPLICATE_BATCH_ATTEMPT',where);ids.add(id);
  const requestPath=`${ledger}/${id}.request.json`,resultPath=`${ledger}/${id}.result.json`,blockPath=`${ledger}/${id}.blocked.json`,identityPath=`${ledger}/identities/${a.retryIdentitySha256}.json`,identityBlockPath=`${ledger}/identities/${a.retryIdentitySha256}.blocked.json`,
   request=read(requestPath),result=read(resultPath),block=read(blockPath),identity=read(identityPath),identityBlock=read(identityBlockPath);
  check(same(request,a),'PACKET_REQUEST_MISMATCH',where);check(request.id===f.designSha256&&request.identityOrigin===request.id&&!request.revalidates,'NOT_FIRST_PHYSICAL_CLAIM',where);
  check(requestFiles.filter(n=>n.startsWith(id)&&n.endsWith('.request.json')).length===1,'MULTIPLE_REQUESTS_FOR_ATTEMPT',where);
  check(identity.origin===id,'RETRY_IDENTITY_ORIGIN_MISMATCH',where);check(identityBlock.attemptId===id||identityBlock.attemptIds?.includes(id),'IDENTITY_BLOCK_MISMATCH',where);
  check(block.attemptId===id&&block.status===p.status,'FAILED_BLOCK_MISMATCH',where);
  check(same(Object.fromEntries(Object.keys(f).map(k=>[k,request[k]])),f),'ACTUAL_FINGERPRINT_MISMATCH',where);
  check(request.levelSha256===p.levelSha256&&p.levelSha256===levelSha256(p.level)&&proof.sourceLevelSha256===p.levelSha256,'ACTUAL_LEVEL_HASH_MISMATCH',where);
  check(same(result.lower,proof)&&same(result.upper,proof)&&result.accepted===false&&result.status===p.status&&result.levelSha256===p.levelSha256,'LEDGER_RESULT_MISMATCH',where);
  check(p.accepted===false&&!p.formalReady,'FAILED_INPUT_RELABELED',where);
  check(Date.parse(request.startedAt)<=Date.parse(result.finishedAt),'ATTEMPT_TIME_ORDER',where);
  check(p.proofToolchainSha256===r.proofToolchainSha256&&levelSha256(p.proofToolchainBindings)===p.proofToolchainSha256,'PROOF_BINDING_AGGREGATE_MISMATCH',where);
  check(same(p.proofToolchainBindings,runtime.toolchainBindings),'FROZEN_PROOF_BYTES_DRIFT',where);
  const source=runtime.LEVELS.find(s=>s.id===p.sourceLevelId);check(levelSha256(source)===p.sourceLevelSha256,'MAINLINE_SOURCE_CHANGED',where);
  let expectedGuard;try{expectedGuard=guardAllowanceFor(proof);}catch(error){failures.push({...where,code:'GUARD_SCHEMA_INVALID',message:error.message});}
  check(same(proof.guardAllowance,expectedGuard),'GUARD_ANNOTATION_MISMATCH',where);
  check(proof.budget.maxStates<=9999&&proof.rawFullBoardStates<=9999&&proof.rawExploredStates<=9999&&proof.guardAllowance.conservativeFullBoardStateUpperBound<=10000,'RAW_BUDGET_EXCEEDED',where);
  maxRaw=Math.max(maxRaw,proof.rawFullBoardStates);maxConservative=Math.max(maxConservative,proof.guardAllowance.conservativeFullBoardStateUpperBound);maxMicro=Math.max(maxMicro,proof.microDiscoveredStates);maxActions=Math.max(maxActions,proof.attemptedTransitions);
  const parentPacket=packetByAttempt.get(a.redesignOf);check(!!parentPacket,'PARENT_FULL_OBJECT_NOT_LOCATED',where);
  let parentDetails=null;
  if(parentPacket){
   const parentRequest=read(`${ledger}/${a.redesignOf}.request.json`),parentResult=read(`${ledger}/${a.redesignOf}.result.json`),parentBlock=read(`${ledger}/${a.redesignOf}.blocked.json`),pf=designFingerprints(parentPacket.p.level),
    priorColors=new Map(pf.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),changedSharedIds=f.colorAssignments.filter(b=>priorColors.has(b.id)&&priorColors.get(b.id)!==JSON.stringify(b.colors)).map(b=>b.id);
   check(parentResult.accepted===false&&parentPacket.p.accepted===false&&parentBlock.attemptId===a.redesignOf,'PARENT_IS_NOT_FAILED',where);
   check(parentPacket.p.sourceLevelId===p.sourceLevelId,'PARENT_SOURCE_DIFFERS',where);
   check(parentRequest.levelSha256===levelSha256(parentPacket.p.level)&&parentRequest.shapeSha256===pf.shapeSha256&&parentRequest.colorSha256===pf.colorSha256,'PARENT_OBJECT_NOT_BOUND',where);
   check(pf.shapeSha256!==f.shapeSha256&&pf.colorSha256!==f.colorSha256&&changedSharedIds.length>0,'FAILED_PARENT_NOT_BOTH_REDESIGNED',where);
   check(Date.parse(parentResult.finishedAt)<=Date.parse(a.startedAt),'REDESIGN_STARTED_BEFORE_PARENT_FINISHED',where);
   parentDetails={id:a.redesignOf,...bind(parentPacket.path),sameSource:true,actualShapeChanged:pf.shapeSha256!==f.shapeSha256,actualCellColoursChanged:pf.colorSha256!==f.colorSha256,changedSharedIds};
  }
  if(lastAttemptBySource.has(p.sourceLevelId))check(a.redesignOf===lastAttemptBySource.get(p.sourceLevelId),'FAILED_CHAIN_SKIPPED_OR_RESET',where);lastAttemptBySource.set(p.sourceLevelId,id);
  const anchorPath=p.provenance.input,anchor=read(anchorPath),reference=refBySource.get(p.sourceLevelId);
  check(sha(anchorPath)===p.provenance.inputFileSha256,'ANCHOR_FILE_CHANGED',where);check(anchor.sourceLevelId===p.sourceLevelId,'ANCHOR_SOURCE_DIFFERS',where);
  check(row.anchor===anchorPath&&row.anchorU===p.provenance.anchorActualU,'ANCHOR_REPORT_MISMATCH',where);
  const anchorReplay=actualReplay(anchorPath,p.provenance.anchorActualU);anchors.set(anchorPath,anchorReplay);
  check(anchor.accepted===true||anchor.actualU===p.provenance.anchorActualU,'FAILED_ANCHOR_WITHOUT_ACTUAL_U',where);
  if(anchor.accepted===false)check(anchor.proof?.drags&&anchor.replay?.valid&&anchor.replay?.complete&&anchor.independentReplay?.valid&&anchor.independentReplay?.complete&&!anchor.independentReplay?.failed,'BEAM_ADMITTED_NONACTUAL_ROUTE',where);
  check(p.replacementOf.receipt===reference.file&&p.replacementOf.receiptSha256===reference.sha256&&p.replacementOf.familyRoot===reference.family,'REPRESENTATIVE_TARGET_MISMATCH',where);
  if(p.drags)providedRoutes++;
  if(Number.isFinite(p.actualU)){actualCount++;check(same(p.drags,proof.drags),'WITNESS_ROUTE_CHANGED',where);actualReplay(row.path,p.actualU);
   check(p.replay?.valid&&p.replay?.complete&&!p.replay?.failed&&p.independentReplay?.valid&&p.independentReplay?.complete&&!p.independentReplay?.failed&&p.actualU===p.replay.nonClearingDrags&&p.actualU===p.independentReplay.nonClearingDrags,'SAVED_U_NOT_ACTUAL',where);}
  rows.push({path:row.path,sha256:sha(row.path),sourceLevelId:p.sourceLevelId,attemptId:id,firstClaim:!a.revalidates,parent:parentDetails,
   ledgerBindings:[bind(requestPath),bind(resultPath),bind(blockPath),bind(identityPath),bind(identityBlockPath)],raw:proof.rawFullBoardStates,expanded:proof.rawExploredStates,
   conservativeFullBoardUpperBound:proof.guardAllowance.conservativeFullBoardStateUpperBound,termination:proof.termination,routeTermination:proof.routeTermination??null,
   actualU:p.actualU??null,providedRoute:!!p.drags,anchor:anchorReplay,accepted:false});
 }
 for(const f of r.familyResults){
  const original=r.references.find(x=>x.source===f.sourceLevelId);check(f.solved===r.rows.filter(x=>x.sourceLevelId===f.sourceLevelId).length,'FAMILY_SOLVED_COUNT',context);
  check(f.bestCompleteU===Math.max(original.U,...r.rows.filter(x=>x.sourceLevelId===f.sourceLevelId).map(x=>x.actualU??-1)),'BEST_U_REPORT_MISMATCH',context);
  for(const b of f.finalBeam)actualReplay(b.file,b.U);
 }
 auditBatches.push({batch:batch.name,report:bind(`${root}/design/${batch.name}/report.json`),index:bind(`${root}/design/${batch.name}/index.json`),
  declaredHistoricalTool:r.tool,currentTool,currentBytesMatchDeclared:currentTool.sha256===r.tool.sha256,
  historicalToolByteStatus:batch.name.endsWith('03')?'UNVERIFIED_HISTORICAL_SOURCE_SNAPSHOT_MISSING':'CURRENT_BYTES_MATCH_HISTORICAL_SHA',
  limitation:batch.name.endsWith('03')?'Batch 03 recorded f3d08509... but did not preserve its source bytes; current override-enabled bb716a71... is different. This audit does not reconstruct or certify the missing historical generator implementation.':null,
  attempts:rows.length,actualCompleteU:actualCount,providedRoutes,rejectedOrIncompleteRouteOutputs:providedRoutes-actualCount,acceptedD3:0,
  maximumRegisteredRaw:maxRaw,maximumConservativeFullBoardUpperBound:maxConservative,maximumMicro:maxMicro,maximumActions:maxActions,anchors:[...anchors.values()],familyResults:r.familyResults,rows});
}

// The current 149-member catalog retains the 148 predecessor files and their
// old parent representatives; none of these failed promotion packets entered.
const selectedPath=`${root}/selection/macro-opening02-selected/index.json`,selected=read(selectedPath),selectedAuditPath=`${root}/selection/macro-opening02-selected/audit.json`,selectedAudit=read(selectedAuditPath),prior=read(selected.priorIndex),representatives=[];
check(selected.files.length===149&&prior.files.length===148,'SELECTED_COUNT_UNEXPECTED',{});check(prior.files.every(f=>selected.files.includes(f)),'PRIOR_REPRESENTATIVE_REMOVED',{});
const acceptedRows=new Map(selectedAudit.rows.filter(r=>r.levelSha256).map(r=>[r.formalId,r]));
for(const file of selected.files){const p=read(file),r=acceptedRows.get(p.formalId);check(p.accepted===true&&levelSha256(p.level)===p.levelSha256&&r?.levelSha256===p.levelSha256,'SELECTED_LEVEL_BINDING_CHANGED',{path:file});
 check(!file.includes('representative-beam-03')&&!file.includes('representative-beam-04'),'FAILED_BEAM_ENTERED_SELECTION',{path:file});representatives.push({...bind(file),formalId:p.formalId,levelSha256:p.levelSha256});}
for(const batch of batches)for(const ref of batch.report.references)check(selected.files.includes(ref.file)&&sha(ref.file)===ref.sha256,'PARENT_REPRESENTATIVE_NO_LONGER_UNCHANGED',{path:ref.file});
const override=read(`${root}/design/representative-beam-04/report.json`).referenceOverrides['60'],overridePacket=read(override),override03=actualReplay(override,29);
check(overridePacket.accepted===false&&overridePacket.actualU===29,'OVERRIDE_NOT_UNDER_TARGET_FULL_U',{});
check(!auditBatches[1].rows.some(r=>r.attemptId===overridePacket.attempt.id),'FAILED_OVERRIDE_RESEARCHED',{});
const unchangedInputs=[];for(const[path,before]of inputHashes){const after=sha(path);check(before===after,'AUDIT_INPUT_BYTES_CHANGED',{path});unchangedInputs.push({path,sha256:before,unchanged:before===after});}
const completion={status:failures.length?'AUDIT_FAILED':'EVIDENCE_CHECKS_PASS_WITH_HISTORICAL_SOURCE_LIMITATION',scope:'Two completed finite beams; not a D3 success or a full catalog acceptance',
 createdAt:new Date().toISOString(),proofSearches:0,generationCalls:0,knownRouteReplays:replayCache.size,acceptedD3:0,errors:failures,
 historicalToolLimitation:'Batch 03 has only the recorded historical source SHA, without the original source-byte snapshot. Hash-bound object, ledger, budget and known-route facts were audited independently; missing implementation bytes remain unverified.',
 frozenProofSha256:runtime.toolchainSha256,currentAuditTool:bind('tools/daily-challenge/formal-v3/audit-representative-beam-completion.mjs'),
 batches:auditBatches,failedButCompleteUReference:{...override03,accepted:false,usedOnlyAsNewDesignReference:true,retriedOriginal:false},
 selection149:{index:bind(selectedPath),audit:bind(selectedAuditPath),count:representatives.length,predecessor148Retained:true,failedPromotionInserted:false,representatives},
 knownRouteChecks:[...replayCache.values()],inputIntegrity:{checkedFiles:unchangedInputs.length,allUnchanged:unchangedInputs.every(x=>x.unchanged),bindings:unchangedInputs}};
fs.writeFileSync(`${out}/completion-audit.json`,JSON.stringify(completion,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:completion.status,attempts:auditBatches.map(x=>x.attempts),actualU:auditBatches.map(x=>x.actualCompleteU),knownRouteReplays:replayCache.size,
 errors:failures,output:`${out}/completion-audit.json`,sha256:sha(`${out}/completion-audit.json`)}));
