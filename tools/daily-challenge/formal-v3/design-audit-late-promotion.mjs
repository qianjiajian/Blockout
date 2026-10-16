import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {inspectSearchAccounting} from './catalog-contract.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';
import {checkLateMutationPrefix} from './design-late-route-region.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
const [input,output]=process.argv.slice(2);assert(input&&output&&!fs.existsSync(output));
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=path=>({path,sha256:hash(path)});
const report=read(input),runtime=await loadBoundedRuntime(),lineages=createReferenceLineageReader(),groups=new Map(),rows=[],seen=new Set();
assert.equal(report.status,'FINITE_REPLACEMENT_PROPOSALS_FINISHED');assert(report.maximum<=8&&report.perRoot<=12);
assert.equal(hash(report.inputIndex.path),report.inputIndex.sha256);const selected=read(report.inputIndex.path).files.map(p=>({file:p,receipt:read(p)}));
const excluded=read(report.excludedPriorPromotion.path);assert.equal(hash(report.excludedPriorPromotion.path),report.excludedPriorPromotion.sha256);
const oldSources=new Set(excluded.references.map(r=>r.sourceLevelId));
for(const[i,r]of report.references.entries()){
 assert(!oldSources.has(r.sourceLevelId));assert.equal(hash(r.receipt),r.receiptSha256);assert.equal(hash(r.baseInputFile),r.baseInputFileSha256);
 const receipt=read(r.receipt),base=read(r.baseInputFile),family=lineages.inspect(r.baseInputFile);
 assert.equal(receipt.difficulty,2);assert.deepEqual(family.roots,[r.family]);assert.deepEqual(family.unknownReasons,[]);
 assert.equal(selected.filter(e=>lineages.inspect(e.receipt.baseInputFile).roots.includes(r.family)).length,1);
 groups.set(i,{reference:r,base,origin:designFingerprints(base.level),lastFailed:null,count:0,accepted:0});
}
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts';
for(const row of report.rows){
 const p=read(row.path),g=groups.get(row.referenceIndex);assert(g);assert.equal(g.accepted,0);g.count++;
 const f=designFingerprints(p.level),requestPath=`${ledger}/${p.attempt.id}.request.json`,resultPath=`${ledger}/${p.attempt.id}.result.json`,request=read(requestPath),result=read(resultPath);
 assert(!seen.has(p.attempt.id));seen.add(p.attempt.id);assert.equal(p.attempt.id,f.designSha256);
 assert.equal(request.redesignOf,g.lastFailed?.id??null);assert.equal(request.levelSha256,levelSha256(p.level));
 for(const old of [g.origin,g.lastFailed].filter(Boolean)){
  assert.notEqual(f.shapeSha256,old.shapeSha256);assert.notEqual(f.colorSha256,old.colorSha256);
  const colours=new Map(old.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)]));
  assert(f.colorAssignments.some(b=>colours.has(b.id)&&colours.get(b.id)!==JSON.stringify(b.colors)));
 }
 assert.equal(p.replacementOf.receipt,g.reference.receipt);assert.equal(p.replacementOf.receiptSha256,g.reference.receiptSha256);
 assert.equal(p.replacementOf.familyRoot,g.reference.family);assert.equal(p.replacementOf.baseLevelSha256,g.reference.baseLevelSha256);
 const prefix=checkLateMutationPrefix(runtime,g.base.level,p.level,p.provenance.changedBodyIds,g.base.drags);
 assert(prefix.valid);assert.equal(prefix.rawWorldsInspected,p.preservedPrefix.rawWorldsInspected);
 assert.equal(prefix.preservedPrefixNonclear,p.preservedPrefix.preservedPrefixNonclear);assert(prefix.preservedKnownNonclearFraction>=.5);
 if(p.proof){assert.equal(p.proof.floor,31);assert.equal(p.proof.budget.maxStates,10000);assert.deepEqual(inspectSearchAccounting(p.proof,'joint'),[]);
  assert.equal(p.proof.sourceLevelSha256,levelSha256(p.level));assert.equal(levelSha256(result.lower),levelSha256(p.proof));assert.equal(levelSha256(result.upper),levelSha256(p.proof));}
 assert.equal(p.proofToolchainSha256,runtime.toolchainSha256);assert.equal(levelSha256(p.proofToolchainBindings),levelSha256(runtime.toolchainBindings));
 assert.equal(result.accepted,p.accepted);assert.equal(p.accepted,row.accepted);
 const identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256}),blockedPath=`${ledger}/identities/${identity}.blocked.json`;
 if(!p.accepted){assert(fs.existsSync(blockedPath));g.lastFailed=request;}else{g.accepted++;assert(p.L>=31&&p.U>=p.L);}
 rows.push({...row,...bind(row.path),request:bind(requestPath),result:bind(resultPath),blocked:p.accepted?null:bind(blockedPath),
  preservedPrefixClears:prefix.preservedPrefixClears,prefixVerificationRaw:prefix.rawWorldsInspected,
  rawExpanded:p.proof?.rawExploredStates??0,actualCompleteReplay:Boolean(p.replay?.valid&&p.replay.complete&&!p.replay.failed&&p.independentReplay?.valid&&p.independentReplay.complete&&!p.independentReplay.failed),
  actualU:p.replay?.valid&&p.replay.complete?p.replay.nonClearingDrags:null,
  relaxedShortcutCost:p.proof?.status==='relaxed-shortcut'?p.proof.cost:null});
}
for(const g of groups.values())assert(g.count<=report.perRoot&&g.accepted<=1);
const reasons={};for(const r of rows)reasons[r.reason??'unknown']=(reasons[r.reason??'unknown']??0)+1;
const result={status:'LATE_REPRESENTATIVE_PROMOTION_READONLY_AUDIT_PASS',newSolverCalls:0,newLedgerWrites:0,formalReady:false,selectionChanged:false,
 input:bind(input),tool:bind('tools/daily-challenge/formal-v3/design-audit-late-promotion.mjs'),proofToolchainSha256:runtime.toolchainSha256,
 summary:{references:groups.size,newInputs:rows.length,jointSearches:rows.filter(r=>r.jointSearchPerformed).length,acceptedProposals:rows.filter(r=>r.accepted).length,
  allPrefixesActualVerified:true,actualCompleteUnder31:rows.filter(r=>r.actualCompleteReplay&&r.actualU<31).length,
  relaxedWitnessRejectedByActualModel:rows.filter(r=>r.relaxedShortcutCost!==null&&!r.actualCompleteReplay).length,
  maxRaw:Math.max(0,...rows.map(r=>r.rawStates??0)),maxPrefixVerificationRaw:Math.max(0,...rows.map(r=>r.prefixVerificationRaw)),reasons},
 perReference:[...groups].map(([referenceIndex,g])=>({referenceIndex,sourceLevelId:g.reference.sourceLevelId,newInputs:g.count,accepted:g.accepted})),rows,
 limitations:['The compatible original prefix is one valid route prefix, not a proof that the same early actions remain necessary in the new puzzle.',
  'Every complete relaxed witness is separately checked by both actual models; invalid swept exits are not accepted as U.',
  'A successful child would require replacing its sole parent representative. This audit performs no selection changes.']};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,summary:result.summary}));
