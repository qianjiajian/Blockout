import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {inspectSearchAccounting} from './catalog-contract.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';

// Snapshot audit only: this module never calls a solver, claims an attempt or
// changes a prior receipt. A running producer is reported as a partial snapshot.
const [input,output]=process.argv.slice(2);assert(input&&output&&!fs.existsSync(output));
const hashBytes=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const bind=p=>({path:p,sha256:hashBytes(fs.readFileSync(p))});
const inputBytes=fs.readFileSync(input),report=JSON.parse(inputBytes),runtime=await loadBoundedRuntime();
const indexBytes=fs.readFileSync(report.inputIndex.path);assert.equal(hashBytes(indexBytes),report.inputIndex.sha256);
const selected=JSON.parse(indexBytes).files.map(file=>({file,receipt:read(file)})),lineages=createReferenceLineageReader();
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts',groups=new Map(),seen=new Set(),rows=[];
for(const [i,ref]of report.references.entries()){
 const receipt=read(ref.receipt),base=read(ref.baseInputFile),actual=lineages.inspect(ref.baseInputFile);
 assert.equal(bind(ref.receipt).sha256,ref.receiptSha256);assert.equal(bind(ref.baseInputFile).sha256,ref.baseInputFileSha256);
 assert.equal(receipt.formalId,ref.formalId);assert(receipt.difficulty===2&&receipt.U>=24);
 assert(base.accepted&&levelSha256(base.level)===ref.baseLevelSha256);
 assert.deepEqual(actual.roots,[ref.family]);assert.deepEqual(actual.unknownReasons,[]);
 assert.equal(selected.filter(e=>lineages.inspect(e.receipt.baseInputFile).roots.includes(ref.family)).length,1);
 groups.set(i,{reference:ref,rootFingerprint:designFingerprints(base.level),previousFailed:null,searches:0,accepted:0});
}
for(const row of report.rows){
 const p=read(row.path),f=designFingerprints(p.level),g=groups.get(row.referenceIndex);assert(g);
 assert(!seen.has(p.attempt.id));seen.add(p.attempt.id);assert.equal(g.accepted,0);g.searches++;
 const requestFile=`${ledger}/${p.attempt.id}.request.json`,resultFile=`${ledger}/${p.attempt.id}.result.json`,request=read(requestFile),result=read(resultFile);
 assert.equal(p.attempt.id,f.designSha256);assert.equal(request.levelSha256,levelSha256(p.level));assert.equal(p.levelSha256,request.levelSha256);
 for(const key of ['shapeSha256','colorSha256','designSha256'])assert.equal(request[key],f[key]);
 assert.equal(request.redesignOf,g.previousFailed?.id??null);
 for(const old of [g.rootFingerprint,g.previousFailed].filter(Boolean)){
  assert.notEqual(f.shapeSha256,old.shapeSha256);assert.notEqual(f.colorSha256,old.colorSha256);
  const colors=new Map(old.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)]));
  assert(f.colorAssignments.some(b=>colors.has(b.id)&&colors.get(b.id)!==JSON.stringify(b.colors)));
 }
 assert.deepEqual(inspectSearchAccounting(p.proof,'joint'),[]);assert.equal(p.proof.floor,31);assert.equal(p.proof.budget.maxStates,10000);
 assert.equal(p.proof.sourceLevelSha256,p.levelSha256);assert.equal(p.proofToolchainSha256,runtime.toolchainSha256);
 assert.equal(levelSha256(p.proofToolchainBindings),levelSha256(runtime.toolchainBindings));
 assert.equal(levelSha256(result.lower),levelSha256(p.proof));assert.equal(levelSha256(result.upper),levelSha256(p.proof));
 assert.equal(result.accepted,p.accepted);assert.equal(row.accepted,p.accepted);
 const parent=g.reference;assert.equal(p.replacementOf.receipt,parent.receipt);assert.equal(p.replacementOf.receiptSha256,parent.receiptSha256);
 assert.equal(p.replacementOf.familyRoot,parent.family);assert.equal(p.replacementOf.baseLevelSha256,parent.baseLevelSha256);
 const identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256}),blockedFile=`${ledger}/identities/${identity}.blocked.json`;
 assert.equal(request.retryIdentitySha256,identity);
 if(!p.accepted){assert(fs.existsSync(blockedFile));g.previousFailed=request;}
 else{
  assert(p.proof.status==='threshold-proven'&&p.proof.thresholdProven&&p.L>=31&&p.U>=p.L);
  for(const replay of [runtime.replayRevisedRoute(p.level,p.drags),independentReplay(runtime,p.level,p.drags)])assert(replay.valid&&replay.complete&&!replay.failed&&replay.nonClearingDrags===p.U);
  g.accepted++;
 }
 rows.push({...bind(row.path),request:bind(requestFile),result:bind(resultFile),blocked:p.accepted?null:bind(blockedFile),referenceIndex:row.referenceIndex,
  accepted:p.accepted,raw:p.proof.rawFullBoardStates,expanded:p.proof.rawExploredStates,termination:p.proof.termination});
}
for(const g of groups.values())assert(g.searches<=report.perRoot&&g.accepted<=1);
const outputReport={status:'READ_ONLY_REPLACEMENT_EXPLORATION_SNAPSHOT_CHECKED',input:{path:input,sha256:hashBytes(inputBytes),producerStatus:report.status},
 inputIndex:report.inputIndex,tool:bind('tools/daily-challenge/formal-v3/inspect-representative-promotion.mjs'),proofToolchainSha256:runtime.toolchainSha256,
 references:groups.size,searches:rows.length,acceptedProposals:rows.filter(r=>r.accepted).length,failedBlocked:rows.filter(r=>!r.accepted).length,
 maxima:{raw:Math.max(0,...rows.map(r=>r.raw)),expanded:Math.max(0,...rows.map(r=>r.expanded))},rows,
 perReference:[...groups].map(([referenceIndex,g])=>({referenceIndex,sourceLevelId:g.reference.sourceLevelId,searches:g.searches,accepted:g.accepted})),
 newSolverCalls:0,newLedgerWrites:0,formalReady:false,admissionReviewed:false,
 admissionFinding:'The ordinary selector checks child-after-parent only. Final admission must enforce atomic retirement and family exclusion in both insertion orders; current exploratory success alone authorizes no replacement.'};
fs.writeFileSync(output,JSON.stringify(outputReport,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,searches:outputReport.searches,accepted:outputReport.acceptedProposals,blocked:outputReport.failedBlocked,maxima:outputReport.maxima,producerStatus:report.status}));
