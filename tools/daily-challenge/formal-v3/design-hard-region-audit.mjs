import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {compareLayouts} from './diversity.mjs';
import {bodyFootprint,digest} from './diversity-layout-factory.mjs';
import {inspectHardRegionStatic} from './design-hard-region-pool.mjs';
import {routeCapacity} from './mechanism-base-designer.mjs';

// Read-only review of the completed finite batch. No solver or ledger.claim.
const ROOT='deliverables/daily-formal-v3-20261008',read=p=>JSON.parse(fs.readFileSync(p)),
 hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const labels=process.argv.slice(2).length?process.argv.slice(2):['hard-region-01','hard-region-02'];
if(labels.some(label=>!/^hard-region-\d+$/.test(label)))throw Error('Audit accepts completed hard-region labels');
const reports=labels.map(label=>({path:`${ROOT}/design/${label}/report.json`,label}));
const output=`${ROOT}/design/hard-region-audit-${process.argv.slice(2).length?labels.join('-'):'01'}.json`;if(fs.existsSync(output))throw Error('Use a new audit output; preserve old evidence');
const runtime=await loadBoundedRuntime(),rows=[],reasons=[],identities=new Set(),counts={},accepted=[];
for(const entry of reports){
 const report=read(entry.path);entry.fileSha256=hash(entry.path);
 if(report.status!=='FINITE_BATCH_COMPLETE')reasons.push('batch-not-closed');
 const currentCounts={};for(const row of report.rows.filter(r=>r.proof&&r.path))currentCounts[row.sourceLevelId]=(currentCounts[row.sourceLevelId]??0)+1;
 const perSourceMaximum=report.newInputQuotaPerSource??report.maxSearchesPerSource;
 if(Object.values(currentCounts).some(n=>n>perSourceMaximum)||Object.keys(currentCounts).length>16
  ||Object.values(currentCounts).reduce((a,b)=>a+b,0)>160)reasons.push('finite-new-input-scope-exceeded');
 entry.newSearchCounts=currentCounts;entry.perSourceMaximum=perSourceMaximum;
 for(const binding of report.bindings){
  const suffix=binding.path.replace('tools/daily-challenge/','').replaceAll('/','-')+'.snapshot';
  if(hash(`${ROOT}/design/${entry.label}/${suffix}`)!==binding.sha256)reasons.push('snapshot-binding-mismatch');
 }
 const comparison=read(`${ROOT}/design/${entry.label}/comparison-inputs.json`);
 const selected=comparison.selected.map(x=>read(x.path).level),pool=comparison.acceptedNew.map(x=>read(x.path).level),
  old=read(comparison.oldIndex).entries.map(x=>read(x.path).level);
 for(const row of report.rows.filter(r=>r.proof&&r.path)){
  const q=read(row.path),proof=q.proof,fp=designFingerprints(q.level),ref=read(q.provenance.referencePath),source=runtime.LEVELS.find(l=>l.id===q.sourceLevelId),
   requestPath=`${ROOT}/proof/attempts/${q.attempt.id}.request.json`,resultPath=`${ROOT}/proof/attempts/${q.attempt.id}.result.json`,
   request=read(requestPath),result=read(resultPath),issues=[];
  counts[q.sourceLevelId]=(counts[q.sourceLevelId]??0)+1;
  if(comparison.visualExclusions?.excluded?.some(e=>e.designSha256===fp.designSha256))issues.push('visually-excluded-input-returned');
  if(identities.has(fp.designSha256))issues.push('duplicate-searched-physical-design');identities.add(fp.designSha256);
  if(q.levelSha256!==levelSha256(q.level)||request.levelSha256!==q.levelSha256||result.levelSha256!==q.levelSha256)issues.push('level-hash-mismatch');
  if(proof.discoveredStates>10000||proof.exploredStates>10000||proof.visitedStates>10000||proof.rawFullBoardStates!==proof.discoveredStates||proof.rawExploredStates!==proof.exploredStates)issues.push('raw-budget-mismatch');
  if(proof.attemptedTransitions>10000000||proof.microDiscoveredStates>3000000||proof.elapsedMilliseconds>30000)issues.push('finite-resource-limit');
  if(q.proofToolchainSha256!==runtime.toolchainSha256)issues.push('proof-sha-mismatch');
  if(result.accepted!==q.accepted||result.lower?.rawFullBoardStates!==proof.rawFullBoardStates)issues.push('ledger-outcome-mismatch');
  const blocked=fs.existsSync(`${ROOT}/proof/attempts/identities/${q.attempt.retryIdentitySha256}.blocked.json`);
  if(!q.accepted&&!blocked)issues.push('failed-retry-identity-not-blocked');
  let parentChanges=null;
  if(request.redesignOf){
   const parent=read(`${ROOT}/proof/attempts/${request.redesignOf}.request.json`),colors=new Map(parent.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),shared=fp.colorAssignments.filter(b=>colors.has(b.id));
   parentChanges={shapeChanged:parent.shapeSha256!==fp.shapeSha256,cellColoursChanged:parent.colorSha256!==fp.colorSha256,
    sharedIds:shared.length,sharedIdsWithChangedColour:shared.filter(b=>colors.get(b.id)!==JSON.stringify(b.colors)).length};
   if(!parentChanges.shapeChanged||!parentChanges.cellColoursChanged||shared.length&&!parentChanges.sharedIdsWithChangedColour)issues.push('invalid-failed-parent-redesign');
  }
  if(hash(q.provenance.referencePath)!==q.provenance.referenceFileSha256)issues.push('reference-byte-mutation');
  const unchanged=ref.level.blocks.filter(b=>q.provenance.retainedBodyIds.includes(b.id));
  if(unchanged.some(b=>digest(q.level.blocks.find(x=>x.id===b.id))!==digest(b)))issues.push('retained-scaffold-changed');
  const protectedIds=q.provenance.protectedBodyIds??[],protectedArea=ref.level.blocks.filter(b=>protectedIds.includes(b.id)).reduce((n,b)=>n+b.shape.length,0);
  if(protectedIds.some(id=>!q.provenance.retainedBodyIds.includes(id))||protectedArea/q.provenance.region.total>.25+1e-12)issues.push('protected-scaffold-contract');
  const forbidden=new Set(ref.level.blocks.filter(b=>q.provenance.oldRegionBodyIds.includes(b.id)).map(bodyFootprint));
  if(q.level.blocks.some(b=>forbidden.has(bodyFootprint(b))))issues.push('removed-region-footprint-reused');
  const retained=unchanged.reduce((n,b)=>n+b.shape.length,0)/q.provenance.region.total;
  if(retained<.50-1e-12||retained>.65+1e-12)issues.push('retention-band');
  if(!inspectHardRegionStatic(q.level,source,runtime).valid)issues.push('static-invalid');
  const out={path:row.path,fileSha256:hash(row.path),sourceLevelId:q.sourceLevelId,levelSha256:q.levelSha256,accepted:q.accepted,
   difficulty:q.difficulty??null,L:q.L??null,U:q.U??null,totalDrags:q.drags?.length??null,retainedAreaRatio:retained,
   protectedBodyIds:protectedIds,protectedAreaRatio:protectedArea/q.provenance.region.total,
   rawFullBoardStates:proof.rawFullBoardStates,rawExploredStates:proof.rawExploredStates,actions:proof.attemptedTransitions,
   microStates:proof.microDiscoveredStates,elapsedMilliseconds:proof.elapsedMilliseconds,termination:proof.routeTermination??proof.termination,
   ledgerRequest:{path:requestPath,sha256:hash(requestPath)},ledgerResult:{path:resultPath,sha256:hash(resultPath)},blocked,parentChanges,issues};
  if(q.accepted){
   const canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags,{});
   if(!canonical.valid||!canonical.complete||!independent.valid||!independent.complete||independent.failed||independent.remainingBodies||independent.remainingQueued
    ||canonical.nonClearingDrags!==q.U||independent.nonClearingDrags!==q.U)issues.push('accepted-fresh-route-invalid');
   out.complete=canonical.complete&&independent.complete;out.finalStateSha256=independent.finalStateSha256;
   out.capacity=routeCapacity(runtime,q.level,q.drags);
   const max=ls=>Math.max(0,...ls.map(l=>compareLayouts(l,q.level).footprintSimilarity));
   out.similarity={selected:max(selected),priorAccepted:max(pool),old450:max(old)};
   if(out.similarity.selected>.65+1e-12||out.similarity.priorAccepted>.65+1e-12||out.similarity.old450>.75+1e-12)issues.push('similarity-cap');
   accepted.push(out);
  }
  rows.push(out);for(const issue of issues)reasons.push(`${row.path}:${issue}`);
 }
}
if(!process.argv.slice(2).length&&(rows.length!==40||Object.keys(counts).length!==8||Object.values(counts).some(n=>n!==5)))reasons.push('batch-scope-count');
let successPairSimilarity=null;for(let i=0;i<accepted.length;i++)for(let j=i+1;j<accepted.length;j++){
 const similarity=compareLayouts(read(accepted[i].path).level,read(accepted[j].path).level).footprintSimilarity;
 successPairSimilarity=Math.max(successPairSimilarity??0,similarity);if(similarity>.65+1e-12)reasons.push('accepted-pair-similarity');
}
const artifact={status:reasons.length?'QA_FAILED':'FINITE_BATCH_AUDIT_PASSED',formalReady:false,productionChanged:false,
 proofToolchainSha256:runtime.toolchainSha256,searchesPerformedByThisAudit:0,searchesReviewed:rows.length,sourceCounts:counts,
 reports,acceptedCount:accepted.length,failedCount:rows.length-accepted.length,successPairSimilarity,
 maximum:{rawDiscovered:Math.max(...rows.map(r=>r.rawFullBoardStates)),rawExpanded:Math.max(...rows.map(r=>r.rawExploredStates)),
  actions:Math.max(...rows.map(r=>r.actions)),microStates:Math.max(...rows.map(r=>r.microStates)),elapsedMilliseconds:Math.max(...rows.map(r=>r.elapsedMilliseconds))},
 limitations:['Two exploratory plain candidates still require stage mechanism qualification and final Pointer acceptance.',
  'Late-action capacity describes the actual supplied route and does not prove an alternative route minimum.',
  'No failed candidate was resumed or searched with another solver. Original reports and screenshots were not modified.'],
 reasons,accepted,rows};
fs.writeFileSync(output,JSON.stringify(artifact,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:artifact.status,searchesReviewed:rows.length,accepted:accepted.map(r=>({path:r.path,L:r.L,U:r.U,drags:r.totalDrags})),maximum:artifact.maximum,reasons}));
if(reasons.length)process.exitCode=1;
