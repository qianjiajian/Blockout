import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {absoluteCells,boardCells,inventorySummary} from '../formal-v3/diversity-layout-factory.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {sha,mergeBindings,checkBindings} from './native-batch-io.mjs';
const own='tools/daily-challenge/formal-v4/propose-low-band-diverse-twenty-readonly.mjs';
const V4='deliverables/daily-formal-v4-20261008',V3='deliverables/daily-formal-v3-20261008';
const out=process.argv[2]??`${V4}/design/low-band-diverse-twenty-proposal-01`;
const bindings={},read=async p=>{const b=await fs.readFile(p);mergeBindings(bindings,{[p]:sha(b)});return JSON.parse(b);};
const desc=p=>({path:p,sha256:bindings[p]});
const choices=[
 [124,'axial3-global-10/candidate-0301.json',1,[[11,21],[10,27]],'generator'],
 [195,'nearband21-short-references/candidate-0074.json',1,[[11,19],[10,23]],'layered-lift'],
 [200,'broad-rect-04/candidate-0344.json',1,[[14,19],[8,28]],'generator'],
 [130,'axial2-rect-10/candidate-0631.json',1,[[14,21],[8,25]],'generator'],
 [60,'wide-rect-06/candidate-0511.json',2,[[21,16],[14,21]],'layered-lift'],
 [131,'concave-plain-08/candidate-0279.json',2,[[17,29],[16,32]],'generator'],
 [151,'nearband16-shared/candidate-0026.json',2,[[13,13],[9,15]],'layered-lift'],
 [80,'concave-plain-08/candidate-0110.json',2,[[8,14],[7,16]],'future-shell-star-bomb'],
 [35,'nearband-multistep-02/candidate-0103.json',2,[[8,18],[7,20]],'future-shell-star-bomb'],
 [31,'wide-rect-06/candidate-0799.json',2,[[6,18],[5,33]],'generator'],
];
function components(blocks){const m=new Map(blocks.flatMap(b=>absoluteCells(b).map(p=>[p.join(','),p]))),remaining=new Set(m.keys()),out=[];
 while(remaining.size){const k=remaining.values().next().value,q=[m.get(k)];remaining.delete(k);
  for(const[x,y]of q)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(remaining.delete(p.join(',')))q.push(p);
  const s=new Set(q.map(p=>p.join(',')));out.push({cells:q.sort((a,b)=>a[1]-b[1]||a[0]-b[0]),bodyIds:blocks.filter(b=>absoluteCells(b).some(p=>s.has(p.join(',')))).map(b=>b.id)});
 }return out;}
function mounts(level,b){const out=[],w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));if(w>3||h>3)return out;
 for(const side of ['left','right','top','bottom']){if(side==='left'&&b.x!==0||side==='right'&&b.x+w!==level.width||side==='top'&&b.y!==0||side==='bottom'&&b.y+h!==level.height)continue;
  const v=['left','right'].includes(side),n=v?level.height:level.width,first=v?b.y:b.x,last=first+(v?h:w)-1;
  for(let offset=Math.max(1,first);offset<=Math.min(n-2,last);offset++){if(first<offset-1||last>offset+1||level.gates.some(g=>g.side===side&&g.offset<offset+2&&offset-1<g.offset+g.size))continue;
   out.push({side,offset,rimSpan:3,spawn:[b.x,b.y]});}}
 return out;}

const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime);
const selectionPath=`${V4}/selection/completed-basic-and-advanced-150-01/index.json`,selection=await read(selectionPath);assert.equal(selection.files.length,150);
const pendingPath=`${V4}/design/low-band-thirtytwo-advanced-plan-01/plan.json`,pending=await read(pendingPath);
const optionsPath=`${V4}/design/low-band-late-options-readonly-01/report.json`,knownOptions=await read(optionsPath);
const h32Path=`${V4}/proof/low-band-thirtytwo-actual-independent-01/terminal-handoff-02.json`,h32=await read(h32Path);
const c32Path=`${V4}/design/low-band-thirtytwo-math-01/completion.json`,c32=await read(c32Path);
const c16Path=`${V4}/design/low-band-sixteen-math-01/completion.json`,c16=await read(c16Path);
const historyPath=`${V3}/design/macro-prefix64-04/scope156/preview-1/report.json`,history=await read(historyPath);
const failures=[],reasons={};
for(const r of c32.results){const q=await read(r.file);assert.equal(bindings[r.file],r.sha256);const tail=q.upperConstruction?.tailSearch,lower=q.lowerBound?.result;
 const cause=q.accepted?'ACCEPTED':q.U!==null&&q.U!==undefined?`ORIGINAL_LOWER_${lower?.termination}`:tail?.termination==='below-threshold-exhausted'?'FIXED_TAIL_WINDOW_EXHAUSTED':`UPPER_${tail?.termination??q.upperConstruction?.reason??'UNKNOWN'}`;
 reasons[cause]=(reasons[cause]??0)+1;failures.push({...r,cause,tailTermination:tail?.termination??null,tailCost:tail?.cost??null,lowerTermination:lower?.termination??null,relaxedLowerCost:lower?.cost??null});
}
const refs=[],inputs=[];
for(const[source,suffix,difficulty,regions,intent]of choices){
 const file=`${V3}/design/${suffix}`,q=await read(file),l=q.level;
 assert(q.accepted&&q.levelSha256===levelSha256(l));runtime.assertPlainProofDomain(l);assert.equal(l.id,source);
 const sourceLevel=runtime.LEVELS.find(x=>x.id===source);assert.equal(boardBaselineSha256(l),boardBaselineSha256(sourceLevel));
 const inventory=inventorySummary(l,runtime);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);
 assert(l.blocks.every(b=>b.shape.length===(Math.max(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))+1)));
 const canonical=runtime.replayRevisedRoute(l,q.drags),independent=independentReplay(runtime,l,q.drags),trace=replayDecorated(runtime,l,q.drags);
 assert(canonical.valid&&canonical.complete&&independent.valid&&independent.complete);assert.equal(canonical.nonClearingDrags,q.U);assert.equal(independent.nonClearingDrags,q.U);
 const ledger=`${V3}/proof/attempts`,requestPath=`${ledger}/${q.attempt.id}.request.json`,resultPath=`${ledger}/${q.attempt.id}.result.json`;
 const request=await read(requestPath),result=await read(resultPath);assert.deepEqual(request,q.attempt);assert(result.accepted&&result.levelSha256===q.levelSha256);
 const first=new Map(),late=[];let cleared=0;
 for(const [i,d]of q.drags.entries()){if(!first.has(d.blockId)){first.set(d.blockId,i);const b=l.blocks.find(b=>b.id===d.blockId);
  if(d.exitSide&&cleared>=2&&cleared<l.blocks.length-2)late.push({blockId:b.id,area:b.shape.length,firstActionDrag:i+1,clearsBeforeFirst:cleared,shape:b.shape,position:[b.x,b.y],generatorMounts:mounts(l,b),liftAreaSuitable:b.shape.length>=2});}
  if(d.exitSide)cleared++;}
 const latest16=c16.results.filter(r=>r.sourceLevelId===source&&!r.accepted).at(-1),legacy=history.latestFailedBySource.find(r=>r.source===source);
 assert(latest16||legacy);const parentFile=latest16?.file??legacy.file,parent=await read(parentFile),attempt=parent.attempt??parent.proof?.attempt;
 assert(attempt&&parent.accepted===false);const pr=await read(`${ledger}/${attempt.id}.request.json`),ps=await read(`${ledger}/${attempt.id}.result.json`);
 assert.deepEqual(pr,attempt);assert.equal(ps.accepted,false);assert.equal(ps.levelSha256,levelSha256(parent.level));
 const blocked=await read(`${ledger}/${attempt.id}.blocked.json`),identityBlocked=await read(`${ledger}/identities/${pr.retryIdentitySha256}.blocked.json`);
 assert.equal(blocked.attemptId,attempt.id);assert.equal(identityBlocked.attemptId,attempt.id);
 const reference={reference:desc(file),sourceLevelId:source,targetDifficulty:difficulty,historicalBounds:{L:q.L,U:q.U},levelSha256:q.levelSha256,routeSha256:routeSha256(q.drags),
  board:{width:l.width,height:l.height,area:boardCells(l).length,bodyCount:l.blocks.length,normalSourceMaskSha256:boardBaselineSha256(sourceLevel)},
  referenceActualReplay:{canonicalComplete:true,independentComplete:true,drags:q.drags.length,U:q.U},referenceReceipt:{request:desc(requestPath),result:desc(resultPath)},
  knownSealedParent:{candidate:desc(parentFile),attemptId:attempt.id,request:desc(`${ledger}/${attempt.id}.request.json`),result:desc(`${ledger}/${attempt.id}.result.json`),blocked:desc(`${ledger}/${attempt.id}.blocked.json`),identityBlocked:desc(`${ledger}/identities/${pr.retryIdentitySha256}.blocked.json`),currentLatestMustBeRefreshedBeforePrepare:true},
  advancedIntent:intent,referenceOnlyLateFirstClearBodies:late,capacityNotInheritedByNewStock:true,occupiedFamilies:knownOptions.rows.find(r=>r.reference.path===file)?.occupiedFamilies??[]};refs.push(reference);
 for(const [ordinal,[cut,area]]of regions.entries()){
  const prefix=q.drags.slice(0,cut),touched=new Set(prefix.map(d=>d.blockId)),region=components(l.blocks.filter(b=>!touched.has(b.id))).find(r=>r.cells.length===area);
  assert(region,'Exact proposed whole-body region missing');assert.equal(q.drags.findIndex(d=>region.bodyIds.includes(d.blockId)),cut);
  const p=trace.trace.slice(0,cut).filter(t=>t.nonClearing).length,c=cut-p,ids=new Set(region.bodyIds),fraction=area/boardCells(l).length;assert(fraction>=.35);
  const knownPrefixKeptLateOwners=late.filter(b=>!ids.has(b.blockId));
  inputs.push({recipeId:`diverse20-${String(inputs.length+1).padStart(2,'0')}`,sourceLevelId:source,targetDifficulty:difficulty,reference:desc(file),
   quota:1,cut,prefixDrags:prefix,prefixSha256:routeSha256(prefix),prefixFacts:{drags:cut,parking:p,clears:c,originalTailParking:q.U-p,newTailParkingAllowance:(difficulty===1?20:30)-p,notALowerBound:true},
   region:{...region,area,fraction,connected:true,oldBodyCount:region.bodyIds.length},
   bodyCountDelta:ordinal===0?-1:1,proposedSeed:831008001+source*3571+ordinal*100003,maximumStaticPartitionAttempts:200,
   advancedIntent:intent,knownReferenceOwnerOutsideRegion:knownPrefixKeptLateOwners,
   gateAndStockDesign:{preservePrefixRequiredGateGeometry:true,preserveReferenceFreeGeneratorRimSpans:intent==='generator'?late.flatMap(b=>b.generatorMounts):[],
    newRegionNativeRectanglesOnly:true,realShapeInventoryAndCellColoursMustChange:true,noNewMechanismOnPlainStock:true,newSameSourceShapeAndColourRequired:true},
   candidateAbsent:true,actualNewLayoutSimilarityNotYetEvaluated:true});
 }
}
assert.equal(inputs.length,20);assert.equal(new Set(refs.map(r=>r.sourceLevelId)).size,10);
mergeBindings(bindings,runtime.toolchainBindings,runtime.designBindings,environment.bindings);
const buildInfo=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
for(const f of Object.keys(buildInfo.metafile.inputs))mergeBindings(bindings,{[f]:sha(await fs.readFile(f))});await checkBindings(bindings);
const report={status:'READONLY_DIVERSE_LOW_BAND_TWENTY_PROPOSAL',executable:false,selection:desc(selectionPath),pendingOnly:desc(pendingPath),selectionExpectedAfterPending:152,
 actualFinalSelectionDescriptorRequiredBeforePrepare:true,history22:desc(h32Path),sourceHistory:desc(historyPath),failureAnalysis:{completion:desc(c32Path),actual:25,accepted:3,chosenForAdaptation:2,reasons,rows:failures,
  interpretations:['A capped suffix failure is neither a full original deadlock nor permission to retry the same stock.','Relaxed original lower shortcut is not an actual Pointer upper bound.','Four source149 transition stops require lower branching new inventories, not an increased budget.']},
 campaign:{newIndependentCampaign:true,oldMacroQuotaExtended:false,maximumCspInputsIncludingFailed:20,sources:10,perSourceMaximum:2,maximumStaticPartitionAttempts:4000,d1Inputs:8,d2Inputs:12,maximumAcceptedFamilyRepresentatives:1},
 references:refs,inputs,mathPolicy:{frozenEntry:'tools/daily-challenge/formal-v4/prefix-tail-low-band.mjs',oneFixedTailOnly:true,fixedTargetDifficulty:true,
  originalLowerFloors:{1:16,2:21},originalUpperCeilings:{1:20,2:30},upperWorlds:'C + known prefix worlds + tail raw + 1 <=10000',lowerWorlds:'registered9999 + guard1 <=10000',
  maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000,noBandFallback:true,noStrategyRetry:true,oldFailuresNeverSearched:true},
 selectionPolicy:{excludeSourcesThisRound:[5,18,86,100,115,149,154,17,14],reason:'Source5 retired; avoid the two chosen low32 families and the concentrated/exhausted low32 families for this separate campaign.',
  sameGroupMaximum:.65,globalMaximum:.75,sourceMaximum:.55,old450Maximum:.75,futureConstructionStricterPrefilter:.65,
  realCanvasAndFamilyChoiceRequired:true,oneRepresentativePerReferenceFamily:true,doNotFillQuotaWithColourOnlyVariants:true},
 implementationScope:{existingQualifiedFinalStages:['generator','layered-lift','axis-block','colored-grid','key-lock D1/D2','flip-door D1'],
  shellStarBomb:'Supply intent only. A small separate qualified final adapter is required before any real shell/star/bomb claim; do not silently widen the generic entry.',
  generatorRimCriterion:'Preserve declared available three-rail spans before colouring, then require a real new owner and validate its first-action/clear/FIFO capacity on the newly proved complete route. Old reference capacity is not inherited.',
  priorParentRule:'Refresh seven histories and same-source latest sealed parent at real prepare; compare new shape inventory AND cell-colour identities to that parent and prior new same-source stocks, not global unrelated inventories.'},
 currentRuntimeValidationClaimed:false,knownReferenceDoubleReplays:refs.length,newCandidateReplays:0,newConstructions:0,newSearches:0,newLedgerClaims:0,formalReady:false,executionEnvironment:environment,fileBindings:bindings};
await fs.mkdir(out,{recursive:false});await fs.writeFile(path.join(out,'proposal.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:path.join(out,'proposal.json'),sha256:sha(await fs.readFile(path.join(out,'proposal.json'))),status:report.status,inputs:inputs.length,reasons}));
