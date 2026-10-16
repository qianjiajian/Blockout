import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {compareLayouts,describeLayout} from '../formal-v3/diversity.mjs';
import {createReferenceLineageReader} from '../formal-v3/reference-lineage.mjs';
import {historicalPromotedFamilies} from '../formal-v3/family-promotion-history.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';

// Read only: in particular do NOT call inspectHistoricalAttempt, because its
// migration helper can create historical aliases. No ledger helper is opened.
const root='deliverables/daily-formal-v3-20261008',v4='deliverables/daily-formal-v4-20261008',out=`${v4}/design/remaining-d2d3-readonly-01`;
assert(!fs.existsSync(out));const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={};
const read=p=>{const b=fs.readFileSync(p);bindings[p]=sha(b);return JSON.parse(b);};
const descriptor=p=>({path:p,sha256:bindings[p]??sha(fs.readFileSync(p))});
const optional=p=>fs.existsSync(p)?read(p):null;
const runtime=await loadV4CatalogRuntime(),environment=prefixExecutionEnvironment(runtime),selectionPath=`${v4}/selection/prefix-basic-139-01/index.json`,selection=read(selectionPath),selected=selection.files.map(file=>({file,q:read(file)}));
const planPath=`${v4}/design/constraint-seven-plan-02/plan.json`,plan=read(planPath),reserved=plan.rows.map(r=>({file:r.baseReceipt.path,q:{...read(r.baseReceipt.path),...r.slot},kind:'pending-seven'}));
const gatePath=`${v4}/design/late-prefix-gate-aware-math-01/candidate-002.json`,gate=read(gatePath),gateSlot=runtime.slots.find(s=>s.stageKey==='basic-combined'&&s.difficulty===3&&s.slot===9);
assert(gate.accepted&&gate.L>=31);reserved.push({file:gatePath,q:{...gate,...gateSlot},kind:'reserved-basic-d3-09'});
const occupied=[...selected.map(r=>({...r,kind:'selected139'})),...reserved],occupiedHashes=new Set(occupied.map(r=>levelSha256(r.q.level))),lineage=createReferenceLineageReader();
const old150=`${root}/selection/macro-fixed64-03-selected/index.json`,compatible=[];
for(const r of selected){const q=r.q.historicalProof?read(r.q.historicalProof.path):r.q;
 const input=q.baseInputFile??q.baseReceipt?.path??(q.mathematicalProof?.path?read(read(q.mathematicalProof.path).input.path).provenance?.reference?.path:null);
 if(input)compatible.push({...q,baseInputFile:input});}
for(const r of reserved)compatible.push({...r.q,baseInputFile:r.q.input?.path??r.file});
const retired=await historicalPromotedFamilies(old150,compatible.filter(q=>q.familyPromotion||!q.baseInputFile.includes('late-prefix'))),liveRoots=new Map();
for(const q of compatible)for(const r of lineage.inspect(q.baseInputFile).roots)liveRoots.set(r,[...(liveRoots.get(r)??[]),q.formalId]);
const excluded=new Set(),skeletons=[];
for(const item of read(`${root}/proof/preselection-visual-exclusions.json`).records){const review=read(item.reviewFile);assert.equal(bindings[item.reviewFile],item.reviewSha256);excluded.add(designFingerprints(read(review.candidate.path).level).designSha256);}
let history=old150;while(history){const q=read(history);for(const r of q.visualCuration?.removed??[]){const prior=read(r.file);excluded.add(designFingerprints(read(prior.baseInputFile).level).designSha256);}
 if(q.visualCuration?.reviewFile)for(const f of read(q.visualCuration.reviewFile).families??[])if(f.decision==='KEEP_ONE_REPRESENTATIVE'&&f.exactSharedVisibleGeometryAndOuterColour?.anchors?.length&&f.gateTopologyAndColourEvidence?.allMembersExactlyEqual)skeletons.push(f);
 history=q.priorIndex;}
const anchor=b=>JSON.stringify({color:b.layers?.[0]??b.color,cells:b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])}),gates=gs=>JSON.stringify(gs.map(g=>({side:g.side,offset:g.offset,size:g.size,color:g.color})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
const scan=[],candidates=[];const walk=directory=>{for(const e of fs.readdirSync(directory,{withFileTypes:true})){const p=`${directory}/${e.name}`;if(e.isDirectory())walk(p);else if(/^candidate.*\.json$/.test(e.name)){
 const bytes=fs.readFileSync(p);let q;try{q=JSON.parse(bytes);}catch(error){scan.push({path:p,sha256:sha(bytes),parseError:error.message});continue;}
 const accepted=q.accepted===true||q.proof?.accepted===true;scan.push({path:p,sha256:sha(bytes),accepted});if(accepted&&q.level&&Array.isArray(q.drags))candidates.push({file:p,q,sha256:sha(bytes)});
 }}};
walk(`${root}/design`);walk(`${v4}/design`);
// The earlier external-league survey is a bound separate zero-supply result,
// not silently included as a new current search or certification here.
const externalSurvey=read(`${root}/design/unused-successful-reference-survey-01/index.json`);
const old450=[];for(const p of runtime.priorDailySlots.values())old450.push({formalId:p.formalId,level:read(p.sourceReport).level});
const ledger=`${root}/proof/attempts`,construct=`${v4}/proof/capacity-construction-attempts`,rows=[],seen=new Map(),duplicates=[];
function journal(level){const f=designFingerprints(level),identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256}),issues=[],evidence=[];
 for(const [kind,dir]of [['public',ledger],['construction',construct]]){
  const record=optional(`${dir}/identities/${identity}.json`),origin=record?.origin??f.designSha256;
  for(const p of [`${dir}/identities/${identity}.blocked.json`,`${dir}/${origin}.blocked.json`])if(fs.existsSync(p)){issues.push(`${kind}-failed-identity`);evidence.push(descriptor(p));}
  const request=optional(`${dir}/${origin}.request.json`),result=optional(`${dir}/${origin}.result.json`);
  if(request){evidence.push(descriptor(`${dir}/${origin}.request.json`));if(result)evidence.push(descriptor(`${dir}/${origin}.result.json`));
   if(kind==='construction')issues.push(result?'already-constructed':'construction-pending');else if(!result?.accepted)issues.push(result?'public-result-failed':'public-pending');}
  if(kind==='construction'&&fs.existsSync(`${dir}/aliases/${identity}.json`)){issues.push('constructed-final-alias');evidence.push(descriptor(`${dir}/aliases/${identity}.json`));}
 }
 return{identity,fingerprints:f,issues:[...new Set(issues)],evidence};
}
for(const {file,q,sha256}of candidates){
 const actualSha=levelSha256(q.level);if(seen.has(actualSha)){duplicates.push({file,sha256,sameLevelAs:seen.get(actualSha)});continue;}seen.set(actualSha,file);
 const issues=[],row={path:file,sha256,sourceLevelId:q.sourceLevelId,difficulty:q.difficulty,L:q.L??null,U:q.U??q.replay?.nonClearingDrags??null,
  levelSha256:actualSha,routeSha256:routeSha256(q.drags),drags:q.drags.length,issues};
 if(q.levelSha256!==actualSha)issues.push('full-object-sha-not-bound');
 try{assertPlainProofDomain(q.level);row.plain=true;}catch(error){row.plain=false;issues.push('non-plain');}
 if(occupiedHashes.has(actualSha))issues.push('selected-or-explicitly-reserved');
 const trace=journal(q.level);row.journal=trace;issues.push(...trace.issues);
 const request=q.attempt?.id?optional(`${ledger}/${q.attempt.id}.request.json`):null,result=q.attempt?.id?optional(`${ledger}/${q.attempt.id}.result.json`):null;
 row.acceptedPublicReceiptBound=!!request&&!!result&&result.accepted===true&&request.levelSha256===actualSha&&result.levelSha256===actualSha&&result.status===q.status&&levelSha256(request)===levelSha256(q.attempt);
 if(!row.acceptedPublicReceiptBound)issues.push('no-exact-current-public-acceptance');
 const a=lineage.inspect(file);row.ancestry=a;row.liveFamilyRoots=a.roots.filter(r=>liveRoots.has(r)).map(r=>({root:r,formalIds:liveRoots.get(r)}));
 if(row.liveFamilyRoots.length)issues.push('live-family');if(a.roots.some(r=>retired.has(r)))issues.push('retired-promotion-family');
 if(a.unknownReasons.length||a.roots.length!==1)issues.push('ancestry-needs-review');
 if(excluded.has(trace.fingerprints.designSha256))issues.push('visual-rejection');
 const anchors=new Set(q.level.blocks.map(anchor)),gateKey=gates([...(q.level.gates??[]),...(q.level.flipDoors??[])]);
 if(skeletons.some(f=>gates(f.gateTopologyAndColourEvidence.canonicalTopology)===gateKey&&f.exactSharedVisibleGeometryAndOuterColour.anchors.every(b=>anchors.has(anchor(b)))))issues.push('retired-visual-skeleton');
 const comparisons=occupied.map(r=>({formalId:r.q.formalId,kind:r.kind,stageKey:r.q.stageKey,difficulty:r.q.difficulty,similarity:compareLayouts(q.level,r.q.level).footprintSimilarity}));
 row.nearest= comparisons.toSorted((a,b)=>b.similarity-a.similarity)[0];if(row.nearest.similarity>.75+1e-12)issues.push('selected-or-reserved-global-near');
 const source=runtime.LEVELS.find(l=>l.id===q.sourceLevelId);if(!source)issues.push('unknown-source');else{
  row.sourceSimilarity=compareLayouts(q.level,source).footprintSimilarity;if(row.sourceSimilarity>.55+1e-12)issues.push('source-near');
  if(boardBaselineSha256(q.level)!==boardBaselineSha256(source))issues.push('source-mask-changed');}
 row.nearestOld=old450.map(r=>({formalId:r.formalId,similarity:compareLayouts(q.level,r.level).footprintSimilarity})).sort((a,b)=>b.similarity-a.similarity)[0];
 if(row.nearestOld.similarity>.75+1e-12)issues.push('old450-near');
 row.geometryCompatibleEmptyAdvancedSlots=runtime.slots.filter(s=>s.newestMechanism&&s.difficulty===q.difficulty&&!occupied.some(r=>r.q.formalId===s.formalId)
  &&comparisons.every(r=>r.similarity<=((r.stageKey===s.stageKey&&r.difficulty===s.difficulty)?.65:.75)+1e-12)).map(s=>s.formalId);
 if(!issues.length){const canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
  row.actualKnownReplay={canonical,independent};if(!canonical.valid||!canonical.complete||canonical.failed||!independent.valid||!independent.complete||independent.failed||canonical.nonClearingDrags!==row.U||independent.nonClearingDrags!==row.U)issues.push('known-route-replay-failed');}
 row.outline=describeLayout(q.level).boardOutlineSha256;row.issues=[...new Set(issues)];row.status=issues.length?'NOT_FREE_REUSABLE_PLAIN_BASE':'UNUSED_PLAIN_BASE_REQUIRES_ONE_NEW_MECHANISM_ADAPTATION';rows.push(row);
}
const gaps=runtime.slots.filter(s=>!occupied.some(r=>r.q.formalId===s.formalId)),stages=[...new Set(runtime.slots.map(s=>s.stageKey))].map(stageKey=>({stageKey,
 actualSelected:[1,2,3].map(d=>selected.filter(r=>r.q.stageKey===stageKey&&r.q.difficulty===d).length),
 reserved:[1,2,3].map(d=>reserved.filter(r=>r.q.stageKey===stageKey&&r.q.difficulty===d).length),
 remaining:[1,2,3].map(d=>gaps.filter(s=>s.stageKey===stageKey&&s.difficulty===d).length),
 missingSlots:gaps.filter(s=>s.stageKey===stageKey).map(s=>s.formalId)}));
const free=rows.filter(r=>!r.issues.length),countByBand=rs=>[1,2,3].map(d=>rs.filter(r=>r.difficulty===d).length);
const report={status:'READ_ONLY_REMAINING_PLAIN_SUPPLY_AND_SLOTS',scope:300,selection:descriptor(selectionPath),reservedPlan:descriptor(planPath),reservedGate:descriptor(gatePath),
 counts:{scannedFiles:scan.length,acceptedPackets:candidates.length,uniqueLevelObjects:rows.length,duplicatePackets:duplicates.length,
  acceptedBands:countByBand(rows),plainBands:countByBand(rows.filter(r=>r.plain)),unusedReusableBands:countByBand(free),
  actualSelected:139,reserved:reserved.length,remainingAfterReservations:gaps.length},stages,rows,duplicatePackets:duplicates,free,
 externalSurvey:{...descriptor(`${root}/design/unused-successful-reference-survey-01/index.json`),historicalFiles:externalSurvey.files.length,currentNewSearches:0},
 scopeLimitations:['Scans exact candidate*.json packets in daily v3/v4 design directories; copies are grouped by complete level SHA.',
 'All public/construction journals are read directly; no alias migration, claim, solver, mutation, or mechanism construction is invoked.',
 'A reusable classification would still require fresh final mechanism/static/strength/lower/Pointer admission. Unknown ancestry is not automatically admitted.',
 'The seven running slots and gate-aware002 are reservations, not claimed accepted additions.'],
 executionEnvironment:environment,currentRuntimeValidationClaimed:false,policyRuleVersion:runtime.policyRuleVersion,mathematicalToolchainSha256:runtime.toolchainSha256,
 newSearches:0,ledgerWrites:0,newCandidates:0,formalReady:false,tool:{path:'tools/daily-challenge/formal-v4/audit-remaining-plain-sources.mjs',sha256:sha(fs.readFileSync('tools/daily-challenge/formal-v4/audit-remaining-plain-sources.mjs'))}};
fs.mkdirSync(out);fs.writeFileSync(`${out}/scan-inputs.json`,JSON.stringify(scan,null,2)+'\n',{flag:'wx'});
report.scanInputs={path:`${out}/scan-inputs.json`,sha256:sha(fs.readFileSync(`${out}/scan-inputs.json`))};report.inputBindings=bindings;
fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,counts:report.counts,free:free.map(r=>({file:r.path,band:r.difficulty})),D2D3Reasons:rows.filter(r=>r.difficulty>=2).reduce((a,r)=>{for(const x of r.issues)a[x]=(a[x]??0)+1;return a;},{}),stages:stages.map(({missingSlots,...r})=>r)}));
