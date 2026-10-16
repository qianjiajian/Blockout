import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding,mapHistoricalBindingsTask} from './prefix-execution-environment-task.mjs';
import {readLowTwenty153Admission} from './prepare-low-twenty-153.mjs';
import {assertNoFailedDescendant,assertLowTwentyParentAncestry,assertLowTwentyFailedParent} from './prepare-low-twenty-task.mjs';
import {formedStockImages} from './prepare-early-prefix-four.mjs';
export {formedStockImages};
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';
import {auditPlainForwardDrag} from '../formal-v3/reverse-route-audit.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {EARLY_CONSTRUCTION_VERSION,EARLY_EXPERIMENT_ID,RECIPES,STATIC_SLOT,UPPER_BUDGET,LOWER_BUDGET,MATH_ENTRY_PATH,FUTURE_FILES,PROPOSAL_SHA,HISTORY_ROOTS,
 assertEarlyConstructionPlan,captureEarlyPrefixHistory,checkEarlyPrefixHistory,physicalRetry} from './early-six-task-contract.mjs';
import {readBound,readFile,write,sha,exists,checkBindings,mergeBindings,PUBLIC_LEDGER} from './native-batch-io.mjs';
const own='tools/daily-challenge/formal-v4/prepare-early-six-task.mjs';
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Bound descriptor required');

export function assertEarlySixProposal(p){
 assert.equal(p.status,'READ_ONLY_MULTISOURCE_EARLY_SIX_PROPOSAL');assert.equal(p.executable,false);
 for(const k of ['newConstructions','newColourCspCalls','newSearches','newLedgerClaims','newPhysicalCandidates'])assert.equal(p[k],0);
 assert.equal(p.recipes.length,6);assert.deepEqual(p.sources.map(s=>s.sourceLevelId),[154,109,86]);
 for(const [i,r]of p.recipes.entries()){
  const fixed=RECIPES[i];assert.equal(r.recipeId,fixed.recipeId);assert.equal(r.sourceLevelId,fixed.sourceLevelId);
  assert.equal(r.prefixDrags.length,fixed.cut);assert.equal(r.iceDesign.initialCount,fixed.iceCount);assert.equal(r.maximumColourCspInputs,1);assert.equal(r.maximumStaticPartitionAttempts,300);
  assert.equal(r.prefixSha256,routeSha256(r.prefixDrags));assert(r.prefixFacts.clears>=fixed.iceCount);
  assert(r.prefixIsNotLowerBound&&r.oldSuffixIsNotNewU);assert.equal(r.newL,null);assert.equal(r.newU,null);
  assert.equal(r.bodyCountDesign.target,r.region.originalBodyCount);assert(r.region.connected&&r.region.fraction>=.35);
 }
 assert.deepEqual(p.quotaProposal,{newSeparateExperiment:true,extendsOldMacroQuota:false,sourceCount:3,recipes:6,maximumCspInputsIncludingFailures:6,maximumStaticPartitionAttemptsPerRecipe:300,maximumStaticPartitionAttemptsTotal:1800});return true;
}

/** Reads a complete old route only. Its old L is neither required to be 31
 * nor inherited by the new physical stock. The actual prefix is fixed. */
export function makeEarlyPrefixBlueprint(runtime,q,r,fixed,failedParent){
 assert.equal(levelSha256(q.level),r.referenceLevelSha256);assert.equal(routeSha256(q.drags),r.referenceRouteSha256);
 assert(q.accepted&&Number.isFinite(q.U));runtime.assertPlainProofDomain(q.level);
 const source=runtime.LEVELS.find(l=>l.id===fixed.sourceLevelId);assert(source);assert.equal(boardBaselineSha256(source),boardBaselineSha256(q.level));
 const canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
 for(const a of [canonical,independent]){assert(a.valid&&a.complete&&!a.failed);assert.equal(a.nonClearingDrags,q.U);}
 assert.deepEqual(q.drags.slice(0,fixed.cut),r.prefixDrags);assert.deepEqual(q.level.gates,r.allReferenceGatesToPreserve);
 const ids=new Set(r.region.bodyIds),changed=q.level.blocks.filter(b=>ids.has(b.id)),outside=q.level.blocks.filter(b=>!ids.has(b.id));
 assert.equal(ids.size,r.region.bodyIds.length);assert.equal(changed.length,ids.size);assert.deepEqual(outside.map(b=>b.id),r.fixedOutsideBodyIds);
 assert(r.prefixDrags.every(d=>outside.some(b=>b.id===d.blockId)),'Region touched before prefix ends');
 const cells=changed.flatMap(absoluteCells),points=new Set(cells.map(p=>p.join(','))),pending=[cells[0]],seen=new Set();
 assert.equal(points.size,cells.length);while(pending.length){const p=pending.pop(),key=p.join(',');if(seen.has(key))continue;seen.add(key);
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const next=[p[0]+dx,p[1]+dy];if(points.has(next.join(','))&&!seen.has(next.join(',')))pending.push(next);}}
 assert.equal(seen.size,cells.length);assert(cells.length/boardCells(q.level).length>=.35);assert.deepEqual([...points].sort(),r.region.cells.map(p=>p.join(',')).sort());
 assert.equal(r.region.area,cells.length);assert.equal(r.region.normalBoardArea,boardCells(q.level).length);assert.equal(r.region.originalBodyCount,changed.length);
 let partial=structuredClone(q.level);const prefixAudits=[];
 for(const drag of r.prefixDrags){const a=auditPlainForwardDrag(runtime,partial,drag);assert(a.valid,a.error);prefixAudits.push(a);
  if(drag.exitSide)partial.blocks=partial.blocks.filter(b=>b.id!==drag.blockId);else if(drag.path.length){const b=partial.blocks.find(b=>b.id===drag.blockId);[b.x,b.y]=drag.path.at(-1);}}
 const clears=r.prefixDrags.filter(d=>d.exitSide).length;assert(clears>=fixed.iceCount);assert.equal(clears,r.prefixFacts.clears);assert.equal(fixed.cut-clears,r.prefixFacts.parking);
 return{...fixed,reference:r.reference,referenceLevelSha256:r.referenceLevelSha256,referenceRouteSha256:r.referenceRouteSha256,
  level:q.level,fixedBlocks:outside,changedBodies:changed,region:r.region,prefixDrags:r.prefixDrags,prefixFacts:r.prefixFacts,
  allReferenceGates:q.level.gates,failedParent,referenceQualification:{canonical,independent,prefixAudits,searches:0,originalLNotTransferred:true}};
}

export function assertEarlySixQualification(q){
 assert.equal(q.status,'INDEPENDENT_EARLY_SIX_TASK_PASS');assert.deepEqual(q.errors,[]);
 for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(q[k],0);
 for(const f of FUTURE_FILES)assert(/^[a-f0-9]{64}$/.test(q.fileBindings?.[f]??''),'Future tool missing independent byte binding: '+f);
 return true;
}

/** Metadata only. Context is supplied after preceding real work is terminal.
 * No real stock, CSP, mathematical search or public claim is formed here. */
export async function prepareEarlySixTask(context){
 for(const k of ['proposal','constructorQualification','selection','selectionReview','historyCheckpoint','historyPlan'])descriptor(context[k]);
 assert.equal(context.proposal.sha256,PROPOSAL_SHA);assert.equal(context.failedParents?.length,3);assert(context.additionalHistoryReviews?.length);
 const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
 const bindings={},historicalBindingResolutions=[],bound=d=>readBound(d,bindings),read=p=>readFile(p,bindings);
 const bindHistorical=map=>{const mapped=mapHistoricalBindingsTask(map,environment);mergeBindings(bindings,mapped.bindings);
  for(const r of mapped.resolutions)if(!historicalBindingResolutions.some(x=>x.oldPath===r.oldPath&&x.expectedSha256===r.expectedSha256))historicalBindingResolutions.push(r);};
 mergeBindings(bindings,environment.bindings,runtime.toolchainBindings);
 const p=await bound(context.proposal);assertEarlySixProposal(p);
 // Proposal bytes remain historical evidence. Its mutable root policy index is
 // intentionally not copied into immutable bindings; every physical input and
 // route used below is re-read and checked directly against its fixed proposal.
 const qual=await bound(context.constructorQualification);assertEarlySixQualification(qual);bindHistorical(qual.fileBindings);
 const bindAudit=async d=>{const q=await bound(d);assert.deepEqual(q.errors,[]);
  assert(['INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS','INDEPENDENT_EARLY_FROZEN_ACTUAL_PASS','INDEPENDENT_EARLY_PREFIX_ACTUAL_PASS'].includes(q.status));
  assert.equal(q.newSearches??q.newGameplaySearches,0);assert.equal(q.newLedgerClaims??q.publicClaimsStarted,0);bindHistorical(q.fileBindings);return q;};
 const history=await bindAudit(context.historyCheckpoint);assert.equal(history.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');
 for(const d of context.additionalHistoryReviews)await bindAudit(d);
 const completed=await bound(history.completion);assert.deepEqual(completed.batchPlan,context.historyPlan);
 const inherited=await bound(context.historyPlan),admission=await readLowTwenty153Admission(context.selection,context.selectionReview);bindHistorical(admission.bindings);
 const selected=[],records=[];for(const file of admission.index.files){const q=await read(file);assert(q.accepted&&!q.qualificationOnly);
  assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));
  assert.equal(admission.bindings[path.resolve(file)]??admission.bindings[file],bindings[file]);records.push(q);selected.push({path:file,sha256:bindings[file],levelSha256:q.levelSha256});}
 assert.deepEqual(auditV4Diversity(records,runtime.slots).reasons,[]);
 for(const k of ['old450','previousMacro','comparisonOnly']){assert(Array.isArray(inherited[k]));for(const d of inherited[k])await bound(d);}
 const publicStocks=[],requests=[];for(const name of (await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort()){
  const file=path.join(PUBLIC_LEDGER,name),q=await read(file);requests.push(q);publicStocks.push({path:file,sha256:bindings[file],id:q.id,
   shapeSha256:q.shapeSha256,colorSha256:q.colorSha256,designSha256:q.designSha256??q.id,retryIdentitySha256:q.retryIdentitySha256??physicalRetry(q)});}
 const parents=new Map();for(const spec of context.failedParents){descriptor(spec.receipt);const failed=await bound(spec.receipt),attempt=failed.attempt??failed.proof?.attempt;
  assert.equal(failed.accepted,false);assert.equal(failed.sourceLevelId??failed.level?.id,spec.sourceLevelId);assert(attempt?.id);assert.equal(failed.levelSha256,levelSha256(failed.level));
  const reqPath=`${PUBLIC_LEDGER}/${attempt.id}.request.json`,resultPath=`${PUBLIC_LEDGER}/${attempt.id}.result.json`,req=await read(reqPath),res=await read(resultPath);
  assert.deepEqual(req,attempt);assert.equal(req.levelSha256,failed.levelSha256);assertLowTwentyFailedParent(failed,res);
  const blockedPath=`${PUBLIC_LEDGER}/${req.id}.blocked.json`,identityPath=`${PUBLIC_LEDGER}/identities/${req.retryIdentitySha256}.blocked.json`;
  assert.equal((await read(blockedPath)).attemptId,req.id);assert.equal((await read(identityPath)).attemptId,req.id);
  const source=p.sources.find(s=>s.sourceLevelId===spec.sourceLevelId);assert(source);const anchor=p.recipes.find(r=>r.sourceLevelId===spec.sourceLevelId).failedParent.id;
  assertLowTwentyParentAncestry(req.id,anchor,requests);const lineage=await assertNoFailedDescendant(req.id,requests,id=>read(`${PUBLIC_LEDGER}/${id}.result.json`));
  assert(!parents.has(spec.sourceLevelId));parents.set(spec.sourceLevelId,{sourceLevelId:spec.sourceLevelId,attemptId:req.id,candidate:spec.receipt,
   request:{path:reqPath,sha256:bindings[reqPath]},result:{path:resultPath,sha256:bindings[resultPath]},blocked:{path:blockedPath,sha256:bindings[blockedPath]},
   identityBlocked:{path:identityPath,sha256:bindings[identityPath]},fingerprints:designFingerprints(failed.level),lineage});
 }
 const blueprints=[];for(const [i,r]of p.recipes.entries()){
  const bp=makeEarlyPrefixBlueprint(runtime,await bound(r.reference),r,RECIPES[i],parents.get(r.sourceLevelId));assert(bp.failedParent);
  bp.currentSourceBinding=await currentMainlineSourceBinding(runtime,environment,bp.sourceLevelId,{qualificationOnly:false});mergeBindings(bindings,bp.currentSourceBinding.bindings);blueprints.push(bp);
 }
 const previousLateStocks=[],seenStocks=new Set(),add=(level,d,q={})=>{const h=levelSha256(level);if(seenStocks.has(h))return;seenStocks.add(h);
  previousLateStocks.push({...d,level,sourceLevelId:q.sourceLevelId??level.id,reference:q.plain?.provenance?.reference??q.provenance?.reference??q.branchProvenance?.reference??q.reference??null});};
 for(const q of inherited.previousLateStocks??[])add(q.level,{path:q.path,sha256:q.sha256},q);
 const ledgerSnapshot=await captureEarlyPrefixHistory(bindings),terminalHistory=[];
 for(const root of ledgerSnapshot.roots)for(const d of root.files){const q=await bound(d);for(const l of formedStockImages(q))add(l,d,q);
  if(d.path.endsWith('.claim.json')&&q.outputDirectory){const resultPath=d.path.replace(/\.claim\.json$/,'.result.json');
   if([HISTORY_ROOTS[1],HISTORY_ROOTS[5],HISTORY_ROOTS[6]].includes(root.directory))assert(await exists(resultPath),'Unfinished shared constructor');
   if(await exists(resultPath)){const result=await read(resultPath);if(result.constructionFiles){assert.deepEqual(result.plan,q.plan);
    const indexPath=path.join(q.outputDirectory,'index.json'),index=await read(indexPath);assert.deepEqual(index.plan,q.plan);
    terminalHistory.push({claim:d,result:{path:resultPath,sha256:bindings[resultPath]},index:{path:indexPath,sha256:bindings[indexPath]},actualCspInputs:index.fixedColourInputs,quotaNotReopened:true});
    for(const f of result.constructionFiles){const stock=await bound(f);for(const l of formedStockImages(stock))add(l,f,stock);}}}}
 }
 const compiled=await build({entryPoints:[own,...FUTURE_FILES],bundle:true,packages:'external',write:false,outdir:'unused',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const f of Object.keys(compiled.metafile.inputs))mergeBindings(bindings,{[f.replaceAll('\\','/')]:sha(await fs.readFile(f))});
 const plan={schemaVersion:4,version:EARLY_CONSTRUCTION_VERSION,status:'FIXED_EARLY_SIX_TASK_PLAN_NOT_EXECUTED',experimentId:EARLY_EXPERIMENT_ID,proposal:context.proposal,qualificationOnly:false,
  constructorQualification:context.constructorQualification,mathEntry:{path:MATH_ENTRY_PATH,sha256:bindings[MATH_ENTRY_PATH]},mathEntryQualification:context.constructorQualification,
  historyCheckpoint:context.historyCheckpoint,historyPlan:context.historyPlan,additionalHistoryReviews:context.additionalHistoryReviews,terminalHistory,
  selectedIndex:context.selection,selectionReview:context.selectionReview,selectedCount:selected.length,selected,old450:inherited.old450,previousMacro:inherited.previousMacro,comparisonOnly:inherited.comparisonOnly,
  previousLateStocks,publicStocks,ledgerSnapshot,blueprints,sequence:{step:3571,bodyCountDeltas:[0]},
  maximumStocksEnteringColourCspIncludingFailed:6,maximumStaticPartitionAttempts:1800,closedCampaignsExtended:false,
  accountingScope:'per-physical-stock',futureStrategy:'one-thawed-prefix-plain-tail-original-ice-lower',futureUpperBudget:UPPER_BUDGET,futureLowerBudget:LOWER_BUDGET,
  staticSlot:STATIC_SLOT,similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,newBatch:.65,source:.55,old450:.75},
  historicalBindingResolutions,historicalDesignPolicy:environment.historicalDesignPolicy,policyReviewedAtPreparation:environment.policyReviewedAtPreparation,mathematicalContract:environment.mathematicalContract,
  proposalPhysicalInputsRevalidated:true,proposalPolicyObservationIsHistorical:true,executionEnvironment:environment,bindings,publicRequestCount:publicStocks.length,
  slotAssigned:false,gameplaySearches:0,publicClaimsStarted:0,formalReady:false};
 assertEarlyConstructionPlan(plan);await checkBindings(bindings);await checkEarlyPrefixHistory(ledgerSnapshot);return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[c,h,out]=process.argv.slice(2);assert(c&&h&&out&&!(await exists(out)));
 const d={path:c,sha256:h},plan=await prepareEarlySixTask(await readBound(d));mergeBindings(plan.bindings,{[d.path]:d.sha256});await fs.mkdir(out,{recursive:false});await write(`${out}/plan.json`,plan);
 console.log(JSON.stringify({plan:{path:`${out}/plan.json`,sha256:sha(await fs.readFile(`${out}/plan.json`))},newConstructions:0,newSearches:0,newClaims:0}));}
