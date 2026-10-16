import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {prepareLowTwenty} from './prepare-low-twenty.mjs';
import {assertLowBandBatchPlan} from './low-twenty-contract.mjs';
import {readBound,checkBindings,mergeBindings,checkLedgerSnapshot,write,exists,sha,PUBLIC_LEDGER} from './low-twenty-io.mjs';
import {ICED153_INPUTS,assertIced153AdmissionMetadata,assertIced153PointerRun} from './admit-reviewed-iced-flip-153.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';

// This adapter recognizes only the reviewed 152 -> 153 admission. It neither
// generalizes future selections nor presents the iced receipt as a low-band one.
const ROOT='deliverables/daily-formal-v4-20261008';
const SELF='tools/daily-challenge/formal-v4/prepare-low-twenty-153.mjs';
export const LOW_TWENTY_153_INPUTS=Object.freeze({
 selection:{path:ROOT+'/selection/completed-basic-and-advanced-153-01/index.json',sha256:'a12babe4ad50dc649eb3a409cd6d39cbd5b6c536df33bc4446d348b458488135'},
 review:{path:ROOT+'/proof/completed153-quick-independent-01.json',sha256:'90d8a0d028e9d49b57108327baf27d27b03421e36a344573618cfcb320133e14'},
 merge:{path:ROOT+'/selection/completed-basic-and-advanced-153-01/merge-audit.json',sha256:'2c6fa338266336367b32260af3b97b5dd9ab7885c28444b43faef7eef36bfc47'},
 ...ICED153_INPUTS,
});
const keyHash=(map,p)=>map[p]??map[path.resolve(p)]??Object.entries(map).find(([k])=>path.resolve(k)===path.resolve(p))?.[1];

export function assertLowTwenty153Envelope({index,review,prior,priorReview,merge,candidate,actual,pointer,visual}){
 const d=LOW_TWENTY_153_INPUTS;
 assertIced153AdmissionMetadata(prior,priorReview,candidate,actual,pointer,visual);
 assert.equal(index.schemaVersion,4);assert.equal(index.scope,300);assert.equal(index.files.length,153);assert.equal(new Set(index.files).size,153);
 assert.deepEqual(index.files,[...prior.files,d.candidate.path]);assert.deepEqual(index.inputSelection,d.prior);assert.equal(index.priorIndex,d.prior.path);
 assert.deepEqual(index.priorIndependentAudit,d.priorAudit);assert.deepEqual(index.acceptedReceipts,[d.candidate]);
 for(const [key,desc]of Object.entries({mergeAudit:d.merge,independentActualAudit:d.actual,currentCandidatePointer:d.pointer,actualImageReview:d.visual}))assert.deepEqual(index[key],desc);
 assert.equal(review.status,'INDEPENDENT_153_MERGE_QUICK_CHECK_PASS');assert.deepEqual(review.selection,d.selection);assert.deepEqual(review.prior,d.prior);assert.deepEqual(review.priorQuickReview,d.priorAudit);
 assert.equal(review.original152ExactPrefixAndBytes,true);assert.equal(review.exactOneAppendedOriginalIcedReceipt,true);assert.equal(review.candidates,153);
 assert.deepEqual(review.difficultyCounts,[81,52,20]);assert.deepEqual(review.errors,[]);
 for(const k of ['newSearches','newLedgerClaims','newConstructions','newWitnessReplays'])assert.equal(review[k],0);
 for(const [key,desc]of Object.entries({mergeAudit:d.merge,independentActualAudit:d.actual,currentCandidatePointer:d.pointer,actualImageReview:d.visual}))assert.deepEqual(review[key],desc);
 assert.equal(review.appended.length,1);const a=review.appended[0];assert.equal(a.path,d.candidate.path);assert.equal(a.sha256,d.candidate.sha256);
 for(const k of ['formalId','sourceLevelId','difficulty','L','U','levelSha256','routeSha256'])assert.equal(a[k],candidate[k]);
 assert.equal(a.totalDrags,candidate.drags.length);assert.equal(a.fullInventoryCleared,true);
 assert.equal(merge.status,'ROOT_REVIEWED_153_SELECTION_ADMISSION_PASS');assert.deepEqual(merge.prior,d.prior);assert.deepEqual(merge.priorIndependentAudit,d.priorAudit);assert.deepEqual(merge.acceptedReceipt,d.candidate);
 assert.deepEqual(merge.independentActual,d.actual);assert.deepEqual(merge.currentCandidatePointer,d.pointer);assert.deepEqual(merge.actualImageReview,d.visual);
 assert.equal(merge.original152FilesAndOrderPreserved,true);assert.equal(merge.receiptsModified,false);assert.equal(merge.sourceReceiptFlagsUnmodified,true);
 assert.equal(merge.staticAudit.passed,true);assert.deepEqual(merge.staticAudit.issues,[]);assert.equal(merge.staticAudit.levelSha256,candidate.levelSha256);
 assert.equal(merge.diversity.count,153);assert.deepEqual(merge.diversity.reasons,[]);
 for(const k of ['newSearches','newLedgerClaims','newConstructions'])assert.equal(merge[k],0);
 for(const q of [index,review,merge]){assert.equal(q.formalReady,false);assert.equal(q.productionChanged,false);}
 assert.deepEqual(index.bands,{1:81,2:52,3:20});assert.equal(index.candidateCount,153);assert.equal(index.missing,147);
 assert.equal(index.fileBindings[d.candidate.path],d.candidate.sha256);
 for(const p of prior.files){const h=keyHash(priorReview.inputBindings,p);assert(h);assert.equal(keyHash(index.fileBindings,p),h);assert.equal(keyHash(review.inputBindings,p),h);}
 assert.equal(keyHash(review.inputBindings,d.candidate.path),d.candidate.sha256);return true;
}

/** Read existing evidence only: no model replay, retile, solver or ledger write. */
export async function readLowTwenty153Admission(selection,selectionReview){
 const d=LOW_TWENTY_153_INPUTS;assert.deepEqual(selection,d.selection);assert.deepEqual(selectionReview,d.review);
 const bindings={},bound=desc=>readBound(desc,bindings),bundle={};
 for(const [key,desc]of Object.entries({index:d.selection,review:d.review,prior:d.prior,priorReview:d.priorAudit,merge:d.merge,candidate:d.candidate,actual:d.actual,pointer:d.pointer,visual:d.visual}))bundle[key]=await bound(desc);
 assertLowTwenty153Envelope(bundle);
 const {candidate:q,actual,pointer,visual}=bundle;
 // The independently reviewed selection binds all original receipt bytes.
 await checkBindings(bundle.review.inputBindings);mergeBindings(bindings,bundle.review.inputBindings);
 const records=[];for(const p of bundle.index.files){const r=await bound({path:p,sha256:keyHash(bundle.index.fileBindings,p)});assert(r.accepted&&!r.qualificationOnly);assert.equal(levelSha256(r.level),r.levelSha256);assert.equal(routeSha256(r.drags),r.routeSha256);records.push(r);}
 const actualBound=async p=>{const h=keyHash(actual.fileBindings,p);assert(h,'Actual audit must bind original evidence '+p);return bound({path:p,sha256:h});};
 const request=await actualBound(`${PUBLIC_LEDGER}/${q.attempt.id}.request.json`),result=await actualBound(`${PUBLIC_LEDGER}/${q.attempt.id}.result.json`);
 assert.deepEqual(request,q.attempt);assert.equal(request.levelSha256,q.levelSha256);assert.equal(result.accepted,true);assert.equal(result.levelSha256,q.levelSha256);
 assert.deepEqual(result.lower,q.lowerBound.result);assert.deepEqual(result.upper,q.route.search);assert.deepEqual(await actualBound(q.entryResultFile),q);
 assert(q.lowerBound.result.thresholdProven&&q.lowerBound.result.certifiedFloor>=31);assert(q.lowerBound.result.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
 await bound(q.constructionPlan);await bound(q.constructionSidecar);
 for(const r of [actual.canonicalReplay,actual.independentReplay]){assert(r.valid&&r.complete);assert.equal(r.nonClearingDrags,q.U);assert.equal(r.effectiveDrags,q.drags.length);assert.equal(r.clearEvents,q.level.blocks.length);}
 const screenshots=[];for(const s of pointer.runs){const r=await bound(s.report);assertIced153PointerRun(r,q,actual);assert.deepEqual(r.viewport,s.viewport);
  for(const name of ['opening','mechanism','complete']){const img=r.screenshots[name];assert(img);screenshots.push({...img,name,viewport:r.viewport});}}
 assert.deepEqual(visual.images,screenshots);
 for(const img of visual.images){const bytes=await fs.readFile(img.path);assert.equal(sha(bytes),img.sha256);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),img.viewport.width);assert.equal(bytes.readUInt32BE(20),img.viewport.height);mergeBindings(bindings,{[img.path]:img.sha256});}
 await checkBindings(pointer.inputBindings);mergeBindings(bindings,pointer.inputBindings);await checkBindings(bindings);
 return {...bundle,records,bindings};
}

export function appendReviewed153ToPreparedLowTwenty(plan,admission){
 const d=LOW_TWENTY_153_INPUTS;assertLowTwenty153Envelope(admission);
 assert.deepEqual(plan.selectedIndex,d.prior);assert.deepEqual(plan.selectionReview,d.priorAudit);assert.equal(plan.selectedCount,152);assert.equal(plan.selected.length,152);
 assert.deepEqual(plan.selected.map(r=>r.path),admission.prior.files);
 for(const r of plan.selected)assert.equal(r.sha256,keyHash(admission.priorReview.inputBindings,r.path));
 const candidate=admission.candidate;
 return {...plan,selectedIndex:d.selection,selectionReview:d.review,selectedCount:153,
  selected:[...plan.selected,{...d.candidate,levelSha256:candidate.levelSha256}],
  selectionAdapter:{version:'exact-reviewed-152-to-153-low-twenty-v1',ancestorSelection:d.prior,ancestorReview:d.priorAudit,acceptedReceipt:d.candidate,actualAudit:d.actual,pointer:d.pointer,visual:d.visual,mergeAudit:d.merge,
   historicalReceiptsUnmodified:true,newMathematicalVerification:false,currentUIExecuted:false},bindings:{...plan.bindings}};
}

/** Root alone executes this metadata preparation. The old seven tools stay
 * frozen; known-reference replay and live seven-root capture remain in their
 * original implementation. No new candidate or claim is created here. */
export async function prepareLowTwenty153(context){
 const admission=await readLowTwenty153Admission(context.selection,context.selectionReview),d=LOW_TWENTY_153_INPUTS;
 const oldPlan=await prepareLowTwenty({...context,selection:d.prior,selectionReview:d.priorAudit});
 const plan=appendReviewed153ToPreparedLowTwenty(oldPlan,admission);mergeBindings(plan.bindings,admission.bindings);
 const runtime=await loadV4CatalogRuntime();assert.equal(runtime.toolchainSha256,plan.mathematicalToolchainSha256);
 assert.deepEqual(auditV4Diversity(admission.records,runtime.slots).reasons,[]);
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,outdir:'unused',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))mergeBindings(plan.bindings,{[file.replaceAll('\\','/')]:sha(await fs.readFile(file))});
 assertLowBandBatchPlan(plan);await checkBindings(plan.bindings);await checkLedgerSnapshot(plan.ledgerSnapshot);return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[c,h,out]=process.argv.slice(2);assert(c&&h&&out&&!(await exists(out)));
 const d={path:c,sha256:h},plan=await prepareLowTwenty153(await readBound(d));mergeBindings(plan.bindings,{[d.path]:d.sha256});
 await fs.mkdir(out,{recursive:false});await write(`${out}/plan.json`,plan);console.log(JSON.stringify({plan:{path:`${out}/plan.json`,sha256:sha(await fs.readFile(`${out}/plan.json`))},newConstructions:0,newSearches:0,newClaims:0}));}
