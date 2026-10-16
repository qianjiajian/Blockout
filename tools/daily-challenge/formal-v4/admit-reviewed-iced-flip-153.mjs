import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {loadV4CatalogRuntime,auditV4Diversity} from './catalog-contract.mjs';
import {auditV4StaticCandidate} from './static-contract.mjs';
import {assertFixedIcedFlipReceiptAccounting} from './audit-fixed-iced-flip-actual-independent-v2.mjs';
import {ICED_FLIP_BASE,ICED_FLIP_SLOT} from './fixed-iced-flip-construction.mjs';

// A single zero-search admission. Existing receipts, including all of their
// historical validation flags, are referenced unchanged rather than rewritten.
const ROOT='deliverables/daily-formal-v4-20261008',SELF='tools/daily-challenge/formal-v4/admit-reviewed-iced-flip-153.mjs';
export const ICED153_INPUTS=Object.freeze({
 prior:{path:ROOT+'/selection/completed-basic-and-advanced-152-01/index.json',sha256:'a6f14c0e32297bb02c081efc10f9c79775f8e54d7d375aa44685edd4cafd50a8'},
 priorAudit:{path:ROOT+'/proof/completed152-quick-independent-01.json',sha256:'aa4382392ea500b722e84aabbc5436de53cf3b6db8fbffdbc6ecedf401841752'},
 candidate:{path:ROOT+'/selection/fixed-iced-flip-01/candidate.json',sha256:'956f62fea2d3c13e0235601411e2b5f59de36be45db17d6e39701c13495179ef'},
 actual:{path:ROOT+'/proof/fixed-iced-flip-actual-independent-01/report.json',sha256:'763d0a75f272b7c0f0faf052980085e2862df16f0f73cefdb11e769889130f86'},
 pointer:{path:ROOT+'/proof/fixed-iced-flip-current-pointer-final-01/report.json',sha256:'ed9dc2551b2c5959aa077e4c664f4466314993128527a4e756478b3dcd593582'},
 visual:{path:ROOT+'/proof/fixed-iced-flip-current-pointer-final-01/root-visual-review.json',sha256:'5bd3f15e63f7a7a674db7b636bdae81533e6bd2551d102784928560f6bf635ef'}
});
const hash=b=>createHash('sha256').update(b).digest('hex'),same=(a,b,message)=>assert.equal(levelSha256(a),levelSha256(b),message);
const normal=p=>path.resolve(p);
export function assertIced153AdmissionMetadata(prior,priorAudit,q,actual,pointer,visual){
 assert.equal(prior.scope,300);assert.equal(prior.schemaVersion,4);assert.equal(prior.files.length,152);assert.equal(new Set(prior.files).size,152);
 assert.equal(priorAudit.status,'INDEPENDENT_152_MERGE_QUICK_CHECK_PASS');assert.deepEqual(priorAudit.selection,ICED153_INPUTS.prior);assert.deepEqual(priorAudit.errors,[]);assert.equal(priorAudit.newSearches,0);assert.equal(priorAudit.newLedgerClaims,0);
 assert.equal(actual.status,'INDEPENDENT_FIXED_ICED_FLIP_ACTUAL_PASS');assert.deepEqual(actual.receipt,ICED153_INPUTS.candidate);assert.deepEqual(actual.errors,[]);assert.equal(actual.acceptedCandidates,1);
 for(const k of ['newSearches','newLedgerClaims','newConstructions'])assert.equal(actual[k],0);assert(actual.result.accepted&&actual.result.formalId===ICED_FLIP_SLOT);
 assert(q.accepted&&q.catalogEligible&&!q.qualificationOnly&&!q.formalReady);assert.equal(q.formalId,ICED_FLIP_SLOT);assert.equal(q.L,31);assert.equal(q.U,46);assert.equal(q.drags.length,61);
 assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.routeSha256,routeSha256(q.drags));assert.equal(actual.result.L,q.L);assert.equal(actual.result.U,q.U);
 assert.equal(pointer.status,'FIXED_ICED_FLIP_DUAL_POINTER_PASS');assert.deepEqual(pointer.receipt,ICED153_INPUTS.candidate);assert.equal(pointer.passed,2);assert.equal(pointer.runs.length,2);
 assert(pointer.naturalClock&&pointer.candidateInjection);assert.equal(pointer.formalRegistryIdentity,false);assert.equal(pointer.formal300Acceptance,false);assert.equal(pointer.newSearches,0);assert.equal(pointer.newLedgerClaims,0);
 assert.deepEqual(pointer.runs.map(r=>[r.viewport.width,r.viewport.height]),[[320,568],[496,1078]]);
 assert.equal(visual.status,'ROOT_SIX_ICED_FLIP_CURRENT_IMAGES_REVIEWED');assert.deepEqual(visual.receipt,ICED153_INPUTS.candidate);assert.deepEqual(visual.pointerReport,ICED153_INPUTS.pointer);
 assert(visual.rootActuallyOpenedEveryImage);assert.equal(visual.images.length,6);assert.equal(new Set(visual.images.map(i=>normal(i.path))).size,6);assert.equal(visual.formal300Acceptance,false);assert.equal(visual.formalReady,false);
 return true;
}
export function assertIced153PointerRun(run,q,actual){
 assert.equal(run.status,'CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS');assert.deepEqual(run.receipt,ICED153_INPUTS.candidate);assert.equal(run.formalId,q.formalId);
 assert.equal(run.levelSha256,q.levelSha256);assert.equal(run.routeSha256,q.routeSha256);assert(run.pointerValidated&&run.timeValidated&&run.settlementValidated&&run.naturalClock&&run.candidateInjection);
 assert.equal(run.clockMocked,false);assert.equal(run.playerSaveTouched,false);assert.equal(run.formalRegistryIdentity,false);assert.equal(run.formalReady,false);assert.deepEqual(run.errors,[]);assert.deepEqual(run.storageViolations,[]);
 assert.equal(run.U,q.U);assert.equal(run.totalDrags,q.drags.length);assert(run.finalPuzzle.complete&&!run.finalPuzzle.failed&&run.finalPuzzle.remainingSeconds>0);assert.equal(run.finalPuzzle.blocks,0);assert.equal(run.finalPuzzle.queuedBlocks,0);assert.equal(run.finalPuzzle.moves,q.drags.length);
 const flips=actual.participation.flips.map(x=>({id:x.id,initiallyOpen:x.initiallyOpen,actualGateExits:x.actualGateExits.map(e=>e.drag),toggles:x.toggles}));
 const ice=actual.participation.ice.map(x=>({id:x.id,initialCount:x.count,releaseDrag:x.releaseDrag,firstAction:x.firstAction,clearsAtRelease:x.count}));
 same(run.flipParticipation,flips,'Pointer must use the same four physical gate IDs');same(run.iceParticipation,ice,'Pointer must release the same six ice bodies at their real counters');
 return true;
}

export async function admitReviewedIcedFlip153({label='completed-basic-and-advanced-153-01'}={}){
 assert(/^[a-z0-9][a-z0-9-]{1,79}$/.test(label),'A fresh selection label is required');const out=ROOT+'/selection/'+label;
 const bindings={},cache=new Map(),read=async(d,json=true)=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));const p=normal(d.path),old=cache.get(p);
  if(old){assert.equal(old.sha256,d.sha256,'Conflicting digest');bindings[d.path]=d.sha256;return json?JSON.parse(old.bytes):old.bytes;}
  const bytes=await fs.readFile(d.path);assert.equal(hash(bytes),d.sha256,'Changed bound input '+d.path);cache.set(p,{sha256:d.sha256,bytes});bindings[d.path]=d.sha256;return json?JSON.parse(bytes):bytes;};
 const {prior:pd,priorAudit:ad,candidate:cd,actual:md,pointer:td,visual:vd}=ICED153_INPUTS;
 const prior=await read(pd),priorAudit=await read(ad),q=await read(cd),actual=await read(md),pointer=await read(td),visual=await read(vd);
 assertIced153AdmissionMetadata(prior,priorAudit,q,actual,pointer,visual);
 const expected=(map,p)=>{const h=map[p]??map[normal(p)];assert(h,'Independent exact file binding required: '+p);return h;};
 assert.equal(expected(actual.fileBindings,cd.path),cd.sha256);const base=await read(ICED_FLIP_BASE);assertFixedIcedFlipReceiptAccounting(q,base);
 // Keep the already independent full historical audit as a bound document;
 // recheck this new object's complete ledger, math, construction and assets.
 const newEvidence=[q.entryResultFile,q.constructionSidecar.path,q.constructionPlan.path,
  path.join('deliverables/daily-formal-v3-20261008/proof/attempts',q.attempt.id+'.request.json'),path.join('deliverables/daily-formal-v3-20261008/proof/attempts',q.attempt.id+'.result.json'),path.join('deliverables/daily-formal-v3-20261008/proof/attempts',q.attempt.id+'.v4-plan.json')];
 for(const p of newEvidence)await read({path:p,sha256:expected(actual.fileBindings,p)},false);
 for(const map of [q.toolchainBindings,q.assetBindings])for(const[p,h]of Object.entries(map))await read({path:p,sha256:h},false);
 const records=[],fileBindings={},bands={1:0,2:0,3:0},groups={};
 for(const p of prior.files){const h=expected(priorAudit.inputBindings,p),r=await read({path:p,sha256:h});assert(r.accepted&&!r.qualificationOnly&&!r.formalReady);assert.equal(levelSha256(r.level),r.levelSha256);assert.equal(routeSha256(r.drags),r.routeSha256);records.push(r);fileBindings[p]=h;}
 assert(!records.some(r=>r.formalId===q.formalId));records.push(q);fileBindings[cd.path]=cd.sha256;
 for(const r of records){bands[r.difficulty]++;groups[r.stageKey]??={1:0,2:0,3:0};groups[r.stageKey][r.difficulty]++;}
 assert.deepEqual(bands,{1:81,2:52,3:20});assert.deepEqual(groups['basic-combined'],{1:10,2:10,3:10});assert.equal(new Set(records.map(r=>r.formalId)).size,153);for(const g of Object.values(groups))for(const n of Object.values(g))assert(n<=10);
 const screenshots=[];
 for(const summary of pointer.runs){const run=await read(summary.report);same(run.viewport,summary.viewport);assertIced153PointerRun(run,q,actual);same(summary.flipParticipation,run.flipParticipation);same(summary.iceParticipation,run.iceParticipation);
  for(const name of ['opening','mechanism','complete']){const d=run.screenshots[name];assert(d);screenshots.push({...d,name,viewport:run.viewport});await read(d,false);}}
 same(visual.images,screenshots,'Every reviewed image must be one of these two actual Pointer runs');for(const image of visual.images)await read(image,false);
 const runtime=await loadV4CatalogRuntime(),staticAudit=await auditV4StaticCandidate(runtime,q);assert(staticAudit.passed,staticAudit.issues.join(';'));same(staticAudit,q.staticAudit);
 const diversity=auditV4Diversity(records,runtime.slots,{expectFull:false});assert.deepEqual(diversity.reasons,[]);
 for(const[p,h]of Object.entries(runtime.toolchainBindings))await read({path:p,sha256:h},false);const self=await fs.readFile(SELF);bindings[SELF]=hash(self);cache.set(normal(SELF),{bytes:self,sha256:hash(self)});
 for(const[p,v]of cache)assert.equal(hash(await fs.readFile(p)),v.sha256,'File changed while preparing admission: '+p);
 // The first write is after every check. wx and a fresh directory forbid a
 // second execution overwriting an existing acceptance record.
 await fs.mkdir(out,{recursive:false});const files=[...prior.files,cd.path];
 const audit={status:'ROOT_REVIEWED_153_SELECTION_ADMISSION_PASS',prior:pd,priorIndependentAudit:ad,acceptedReceipt:cd,independentActual:md,currentCandidatePointer:td,actualImageReview:vd,
  original152FilesAndOrderPreserved:true,receiptsModified:false,sourceReceiptFlagsUnmodified:true,candidateCount:153,missing:147,bands,groups,staticAudit,diversity,inputBindings:bindings,
  newSearches:0,newLedgerClaims:0,newConstructions:0,productionChanged:false,formalReady:false};
 const ap=out+'/merge-audit.json',ab=JSON.stringify(audit,null,2)+'\n';await fs.writeFile(ap,ab,{flag:'wx'});
 const index={schemaVersion:4,scope:300,status:'PARTIAL_CANDIDATES_AWAITING_FINAL_ACCEPTANCE',files,fileBindings,
  priorIndex:pd.path,inputSelection:pd,priorIndependentAudit:ad,acceptedReceipts:[cd],independentActualAudit:md,currentCandidatePointer:td,actualImageReview:vd,
  mergeAudit:{path:ap,sha256:hash(ab)},candidateCount:153,missing:147,bands,groups,candidatePointerValidatedForNewEntries:true,formal300Acceptance:false,formalReady:false,productionChanged:false};
 const ip=out+'/index.json',ib=JSON.stringify(index,null,2)+'\n';await fs.writeFile(ip,ib,{flag:'wx'});return{index:{path:ip,sha256:hash(ib)},audit:{path:ap,sha256:hash(ab)},candidateCount:153,bands,formalReady:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){console.log(JSON.stringify(await admitReviewedIcedFlip153({label:process.argv[2]??'completed-basic-and-advanced-153-01'})));}
