/** Metadata only: freeze the existing 48 recipes, then bind an independently
 * reviewed proposal to a later sealed history report. No history checkpoint or
 * delta is read/merged, and no runtime, factory, replay, search or claim runs.
 * Full history/parent/member authentication remains the qualified task's job. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {assertPlainSupplyProposal,assertPriorHistoryReport,SELF as TASK,VERSION as TASK_VERSION,
 QUALIFICATION_STATUS,PROPOSAL_REVIEW_STATUS,HOLDS} from './wholeboard-plain-supply-batch-task-v1.mjs';

export const SELF='tools/daily-challenge/formal-v4/build-wholeboard-plain-supply-metadata-v1.mjs';
const BASE='deliverables/daily-formal-v4-20261008';
const FROZEN=BASE+'/frozen-workspace-4588';
export const DRAFT={path:BASE+'/design/wholeboard-plain-d2-supply-fortyeight-draft-01/proposal.json',sha256:'067be5cd84f6869dbe35cc7a9f0b4801033f57822a0675c72a051f22d3819c31'};
export const QUALIFICATION={path:BASE+'/proof/wholeboard-plain-supply-batch-independent-01/report.json',sha256:'8c9cf3689f0737b61ca8368968dfe4bd86b20310dbba93f9feadf51e74bf501b'};
export const SELECTION={path:BASE+'/selection/completed-basic-and-advanced-161-01/index.json',sha256:'faf2a840869b3ed1ae971df301e82a495981449bb6207a3e186c2961af2965d1'};
export const SELECTION_REVIEW={path:BASE+'/proof/completed161-quick-independent-01.json',sha256:'91ced2f2d9d6db570fb0b149add08c437506c3218a5145eefa896c5a07443d82'};
export const SOURCE_IDS=[58,109,124];
const TASK_SHA='f316cde2bef30f4b00b9f6be79f9875a216b37d323acc5603a01efa8a103b90c';
const sha=b=>createHash('sha256').update(b).digest('hex');
const clone=structuredClone;
const hash=h=>assert(/^[a-f0-9]{64}$/.test(h??''),'Exact SHA-256 required');
const descriptor=d=>{assert(d&&typeof d.path==='string'&&d.path.length);hash(d.sha256);};
const jsonBytes=q=>Buffer.from(JSON.stringify(q,null,2)+'\n');
const exists=p=>fs.stat(p).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
const ZERO={newHistoryLoads:0,newHistoryMerges:0,newDomains:0,newFullWorlds:0,newModels:0,newSearches:0,newReplayCalls:0,newClaims:0,selectionWritten:false,formalAdoptionPerformed:false};

/** Validate only the exported declaration; this does not authenticate a merge
 * or infer the latest parent from old summaries. All lexical paths are kept. */
export function inheritPostTwoHistory(h){
 assert.equal(h.status,'NONAXIS_MAJOR_REGION_HISTORY_DELTAS_EXPORTED_AND_V6_VALIDATED');
 assert.deepEqual(h.errors,[]);hash(h.headSha256);descriptor(h.checkpoint);descriptor(h.checkpointReview);
 assert.equal(h.checkpointReexported,false);assert.equal(h.oldFilesChanged,false);
 for(const k of ['newConstructions','newSearches','newLedgerClaims','newReplayCalls'])assert.equal(h[k],0);
 assert.deepEqual(h.selection,SELECTION);assert.equal(h.summary?.consumedInputs,2);assert.equal(h.summary?.maximumInputs,2);
 assert.deepEqual(h.candidateStatuses.map(r=>r.sourceLevelId).toSorted((a,b)=>a-b),[100,115]);
 assert(Array.isArray(h.historyScope?.roots)&&h.historyScope.roots.length===7);
 assert.equal(new Set(h.historyScope.roots.map(r=>r.id)).size,7);
 for(const r of h.historyScope.roots)assert(typeof r.physicalPath==='string'&&r.physicalPath.length);
 assert(Array.isArray(h.priorHistoryDeltas)&&h.priorHistoryDeltas.length>0);
 assert(Array.isArray(h.historyDeltas)&&h.historyDeltas.length>=1&&h.historyDeltas.length<=2);
 assert.deepEqual(h.completeHistoryDeltas,[...h.priorHistoryDeltas,...h.historyDeltas]);
 const seen=new Set();for(const d of h.completeHistoryDeltas){descriptor(d.descriptor);descriptor(d.declaredOwner?.definition);
  assert(typeof d.declaredOwner.id==='string'&&d.declaredOwner.id);assert(typeof d.declaredOwner.namespace==='string'&&d.declaredOwner.namespace);
  assert(['construction','mathematical'].includes(d.declaredOwner.kind));assert(!seen.has(d.descriptor.sha256),'Duplicate delta');seen.add(d.descriptor.sha256);}
 assert.equal(h.previousHeadSha256,h.priorHistoryDeltas.at(-1).descriptor.sha256);
 assert.equal(h.headSha256,h.completeHistoryDeltas.at(-1).descriptor.sha256);
 descriptor(h.comparisonEvidence?.provenance);descriptor(h.comparisonEvidence?.review);
 const f=h.futureParents;assert(f);assert.equal(f.historyHeadSha256,h.headSha256);
 assert.equal(f.newHistoryTraversal,false);assert.equal(f.newModelCalls,0);assert.equal(f.newSearches,0);assert.equal(f.mathematicalProofRevalidated,false);
 assert(Array.isArray(f.requestedSourceLevelIds));assert.equal(new Set(f.requestedSourceLevelIds).size,f.requestedSourceLevelIds.length);
 assert(Array.isArray(f.resolved)&&Array.isArray(f.unresolved));
 assert.equal(new Set([...f.resolved,...f.unresolved].map(r=>r.sourceLevelId)).size,f.resolved.length+f.unresolved.length);
 const parents=SOURCE_IDS.map(sourceLevelId=>{assert(f.requestedSourceLevelIds.includes(sourceLevelId));
  const row=f.resolved.find(r=>r.sourceLevelId===sourceLevelId);assert(row,'Missing current exported failed parent '+sourceLevelId);
  assert.equal(row.status,'RESOLVED_ORIGINAL_FAILED_PARENT');descriptor(row.receipt);hash(row.attemptId);
  assert(typeof row.namespace==='string'&&row.namespace);assert(typeof row.startedAt==='string'&&Number.isFinite(Date.parse(row.startedAt)));
  assert.equal(row.readDirectHistoryRolePassed,true);assert.equal(row.mathematicalProofRevalidated,false);
  assert.equal(row.blocked?.length,2);row.blocked.forEach(descriptor);assert.notEqual(row.blocked[0].path,row.blocked[1].path);
  return clone(row);});
 const inherited={history:clone(h.checkpoint),historyReview:clone(h.checkpointReview),historyScope:clone(h.historyScope),
  historyDeltas:clone(h.completeHistoryDeltas),historyHeadSha256:h.headSha256,selection:clone(h.selection),
  comparison:{provenance:clone(h.comparisonEvidence.provenance),review:clone(h.comparisonEvidence.review)},
  failedParents:parents.map(r=>({sourceLevelId:r.sourceLevelId,receipt:clone(r.receipt)}))};
 assertPriorHistoryReport(inherited,h);return{inherited,parents};
}

export function composePlainSupplyProposal(draft,priorHistoryReport,history){
 descriptor(priorHistoryReport);assert.equal(draft.status,'READONLY_METADATA_DRAFT_NOT_EXECUTABLE');
 assert.equal(draft.executable,false);assert.equal(draft.maximumInputs,48);assert.equal(draft.recipesPerSource,16);
 assert.deepEqual(draft.sourceIds,SOURCE_IDS);assert.deepEqual(draft.selection,SELECTION);assert.deepEqual(draft.designDisposition,HOLDS);
 assert.equal(draft.recipes.length,48);for(let i=0;i<48;i++)assert.equal(draft.recipes[i].sourceLevelId,SOURCE_IDS[i%3]);
 const {inherited,parents}=inheritPostTwoHistory(history);
 const proposal={...clone(draft),status:'METADATA_DESIGN_PROPOSAL_NOT_EXECUTABLE',executable:false,
  sourceDraft:clone(DRAFT),qualification:clone(QUALIFICATION),priorHistoryReport:clone(priorHistoryReport),
  inheritedContext:inherited,exportedFailedParents:parents,
  historyTiming:{priorHistoryReport:clone(priorHistoryReport),qualification:clone(QUALIFICATION),proposalReview:null,
   requiresLatestSealedPostTwoInputHistory:true,metadataDraftDoesNotAuthorizeActualRun:true},
  metadataPreparation:{recipeObjectsUnchanged:true,latestParentAuthenticationDeferredToTaskPrepare:true,
   historyCheckpointOrDeltaRead:false,comparisonEvidenceHistoricalHeadNotUsedAsCurrentHead:true,
   independentProposalReviewStillRequired:true,...ZERO}};
 assert.deepEqual(proposal.recipes,draft.recipes);assertPlainSupplyProposal(proposal,48);return proposal;
}

export function composePlainSupplyContext(proposal,proposalDescriptor,review,reviewDescriptor){
 descriptor(proposalDescriptor);descriptor(reviewDescriptor);assertPlainSupplyProposal(proposal,48);
 assert.deepEqual(proposal.qualification,QUALIFICATION);assert.deepEqual(proposal.sourceDraft,DRAFT);
 assert.equal(review.status,PROPOSAL_REVIEW_STATUS);assert.deepEqual(review.proposal,proposalDescriptor);assert.deepEqual(review.errors,[]);
 for(const k of ['newConstructions','newSearches','newClaims'])assert.equal(review[k],0);
 return{version:TASK_VERSION,experimentId:proposal.experimentId,maximumInputs:48,failedInputRebandAllowed:false,fallbackAllowed:false,
  proposal:clone(proposalDescriptor),proposalReview:clone(reviewDescriptor),qualification:clone(QUALIFICATION),
  priorHistoryReport:clone(proposal.priorHistoryReport),...clone(proposal.inheritedContext),selectionReview:clone(SELECTION_REVIEW),designDisposition:clone(HOLDS)};
}

function reader(){const bindings={};return{bindings,
 async bytes(p,expected){const b=await fs.readFile(p),h=sha(b);if(expected)assert.equal(h,expected,p);
  if(bindings[p])assert.equal(bindings[p],h,p);bindings[p]=h;return b;},
 async bound(d){descriptor(d);return JSON.parse(await this.bytes(d.path,d.sha256));}};}

async function bindInputs(r,priorHistoryReport){
 const draft=await r.bound(DRAFT),qualification=await r.bound(QUALIFICATION);
 assert.equal(qualification.status,QUALIFICATION_STATUS);assert.deepEqual(qualification.errors,[]);
 for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(qualification[k],0);
 assert.equal(qualification.toolBindings?.[TASK],TASK_SHA);
 // Only toolBindings belong to this frozen cwd. Do not reinterpret mixed-root
 // arbitrary nested report fileBindings (including root-only UI rule files).
 for(const[p,h]of Object.entries(qualification.toolBindings))await r.bytes(p,h);
 const history=await r.bound(priorHistoryReport),{parents,inherited}=inheritPostTwoHistory(history);
 const selection=await r.bound(SELECTION);assert.equal(selection.files.length,161);await r.bound(SELECTION_REVIEW);
 const holds=await r.bound(HOLDS);assert.equal(holds.status,'SELECTED_MATHEMATICS_PRESERVED_DESIGN_HOLDS_RECORDED');
 assert.deepEqual(holds.selection,SELECTION);assert.equal(holds.formalAcceptedCount,0);assert.equal(holds.decisions.length,8);
 for(const d of holds.decisions){assert.equal(d.formalAdoptionAllowed,false);assert.equal(d.originalMathematicalEvidencePreserved,true);}
 await r.bound(inherited.comparison.provenance);await r.bound(inherited.comparison.review);
 for(const p of parents){const receipt=await r.bound(p.receipt),a=receipt.attempt??receipt.proof?.attempt;
  assert.equal(receipt.accepted,false);assert.equal(receipt.sourceLevelId??receipt.level?.id,p.sourceLevelId);
  assert(receipt.level);assert.equal(levelSha256(receipt.level),receipt.levelSha256);assert.equal(a?.id,p.attemptId);
  assert.equal(a.startedAt,p.startedAt);assert.equal(a.levelSha256,receipt.levelSha256);
  const paths=p.blocked.map(d=>d.path.replaceAll('\\','/').toLowerCase());
  assert(paths.some(s=>s.endsWith('/'+p.attemptId+'.blocked.json')));hash(a.retryIdentitySha256);
  assert(paths.some(s=>s.endsWith('/identities/'+a.retryIdentitySha256+'.blocked.json')));
  for(const d of p.blocked){const b=await r.bound(d);assert.equal(b.attemptId,p.attemptId);}
 }
 // Hash only the already saved catalogue/source fields; never make a new level.
 const catalogues=new Map();for(const recipe of draft.recipes){const d=recipe.source.catalogue,key=d.path+'|'+d.sha256;
  if(!catalogues.has(key))catalogues.set(key,await r.bound(d));
  const row=catalogues.get(key).rows.find(x=>x.sourceLevelId===recipe.sourceLevelId);assert(row);
  assert.equal(row.sourceLevelSha256,recipe.source.levelSha256);assert.equal(row.maskSha256,recipe.source.maskSha256);
  assert.equal(row.level.width,recipe.source.width);assert.equal(row.level.height,recipe.source.height);
  assert.equal(levelSha256(row.level),recipe.source.levelSha256);assert.equal(row.level.seams?.length??0,0);
  assert.equal(boardBaselineSha256(row.level),recipe.source.boardBaselineSha256);
  assert.equal(row.inventory.playableCells,recipe.source.playableCells);
 }
 return{draft,history};
}

/** Call only after root review and the two-input batch's actual sealed export.
 * Output directories are new and immutable; failed attempts leave failure.json.
 * The context phase requires an external independent proposal-review report. */
export async function buildPlainSupplyMetadata(mode,config){
 assert(['proposal','context'].includes(mode));
 assert.deepEqual(Object.keys(config).sort(),(mode==='proposal'?['outputDirectory','priorHistoryReport']:['outputDirectory','proposal','proposalReview']).sort());
 assert(process.cwd().replaceAll('\\','/').toLowerCase().endsWith('/'+FROZEN.toLowerCase()),'Use frozen workspace 4588 cwd');
 assert(typeof config.outputDirectory==='string'&&/^deliverables\/daily-formal-v4-20261008\/design\/[a-z0-9-]+$/.test(config.outputDirectory));
 assert(!await exists(config.outputDirectory),'Immutable output already exists');
 await fs.mkdir(config.outputDirectory);const r=reader();
 try{await r.bytes(SELF);let value,priorHistoryReport;
  if(mode==='proposal'){priorHistoryReport=config.priorHistoryReport;const {draft,history}=await bindInputs(r,priorHistoryReport);
   value=composePlainSupplyProposal(draft,priorHistoryReport,history);
  }else{const proposal=await r.bound(config.proposal);priorHistoryReport=proposal.priorHistoryReport;
   const {draft,history}=await bindInputs(r,priorHistoryReport);assert.deepEqual(proposal,composePlainSupplyProposal(draft,priorHistoryReport,history),'Proposal differs from fixed draft/current declared history');
   const review=await r.bound(config.proposalReview);value=composePlainSupplyContext(proposal,config.proposal,review,config.proposalReview);
   assertPriorHistoryReport(value,history);
  }
  const file=config.outputDirectory+'/'+mode+'.json',b=jsonBytes(value);await fs.writeFile(file,b,{flag:'wx'});
  const output={path:file,sha256:sha(b)},report={schemaVersion:1,status:'WHOLEBOARD_PLAIN_SUPPLY_METADATA_'+mode.toUpperCase()+'_BUILT',
   mode,configuration:clone(config),output,sourceDraft:DRAFT,qualification:QUALIFICATION,priorHistoryReport,
   recipeCount:48,sourceIds:SOURCE_IDS,recipesPerSource:16,recipesChanged:false,
   historyHeadSha256:mode==='proposal'?value.inheritedContext.historyHeadSha256:value.historyHeadSha256,
   fullOrderedDeltaCount:(mode==='proposal'?value.inheritedContext.historyDeltas:value.historyDeltas).length,
   independentReviewCreated:false,executionPermissionCreated:false,fullHistoryAndLatestRolesAuthenticatedHere:false,
   bindingBaseDirectory:process.cwd(),fileBindings:r.bindings,...ZERO,errors:[]};
  const reportPath=config.outputDirectory+'/report.json',reportBytes=jsonBytes(report);await fs.writeFile(reportPath,reportBytes,{flag:'wx'});
  return{output,report:{path:reportPath,sha256:sha(reportBytes)},recipeCount:48,sourceIds:SOURCE_IDS};
 }catch(e){await fs.writeFile(config.outputDirectory+'/failure.json',jsonBytes({status:'METADATA_BUILD_FAILED',mode,configuration:config,reason:e.message,fileBindings:r.bindings,...ZERO}),{flag:'wx'});throw e;}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{const[mode,configPath]=process.argv.slice(2);assert.equal(process.argv.length,4,'Usage: node <tool> proposal|context <config.json>');
  console.log(JSON.stringify(await buildPlainSupplyMetadata(mode,JSON.parse(await fs.readFile(configPath,'utf8')))));
 }catch(e){console.error(e.stack);process.exitCode=1;}
}
