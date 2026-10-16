import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from '../formal-v4/runtime.mjs';
import {designFingerprints} from './bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {compareLayouts,describeLayout} from './diversity.mjs';
import {createReferenceLineageReader} from './reference-lineage.mjs';
import {historicalPromotedFamilies} from './family-promotion-history.mjs';

const root='deliverables/daily-formal-v3-20261008',out=`${root}/design/unused-basic-bases-01`;
const source=`${root}/design/merged-basic-scope-01/inventory150.json`,selectedIndex='deliverables/daily-formal-v4-20261008/selection/merged-116-v1/index.json';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const runtime=await loadV4Runtime(),index=read(selectedIndex),selected=index.files.map(p=>({file:p,q:read(p)}));
const oldSelected=selected.map(r=>read(r.q.historicalProof.path)),lineage=createReferenceLineageReader();
const retired=await historicalPromotedFamilies(`${root}/selection/macro-fixed64-03-selected/index.json`,oldSelected);
const roots=new Map();for(const r of oldSelected){for(const key of lineage.inspect(r.baseInputFile).roots)roots.set(key,[...(roots.get(key)??[]),r.formalId]);}
const excluded=new Set(),families=[],historyBindings={};
for(const item of read(`${root}/proof/preselection-visual-exclusions.json`).records){assert.equal(sha(item.reviewFile),item.reviewSha256);const q=read(item.reviewFile);assert.equal(sha(q.candidate.path),q.candidate.sha256);excluded.add(designFingerprints(read(q.candidate.path).level).designSha256);historyBindings[item.reviewFile]=item.reviewSha256;}
let history=`${root}/selection/macro-fixed64-03-selected/index.json`;const seen=new Set();
while(history){assert(!seen.has(history));seen.add(history);historyBindings[history]=sha(history);const h=read(history);
 for(const removed of h.visualCuration?.removed??[]){const q=read(removed.file);excluded.add(designFingerprints(read(q.baseInputFile).level).designSha256);}
 if(h.visualCuration?.reviewFile){assert.equal(sha(h.visualCuration.reviewFile),h.visualCuration.reviewSha256);historyBindings[h.visualCuration.reviewFile]=h.visualCuration.reviewSha256;
  for(const f of read(h.visualCuration.reviewFile).families??[])if(f.decision==='KEEP_ONE_REPRESENTATIVE'&&f.exactSharedVisibleGeometryAndOuterColour?.anchors?.length&&f.gateTopologyAndColourEvidence?.allMembersExactlyEqual)families.push({...f,reviewFile:h.visualCuration.reviewFile});}
 history=h.priorIndex;
}
const anchor=b=>JSON.stringify({color:b.layers?.[0]??b.color,cells:b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const gates=g=>JSON.stringify(g.map(x=>({side:x.side,offset:x.offset,size:x.size,color:x.color})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
const reserves=read(source).records.filter(r=>r.plannedRole==='UNSELECTED_PRESERVED_RESERVE'),rows=[],levels=[];
for(const row of reserves){
 assert.equal(sha(row.file),row.fileSha256);assert.equal(sha(row.baseInputFile),row.baseInputFileSha256);const base=read(row.baseInputFile),f=designFingerprints(base.level),ancestry=lineage.inspect(row.baseInputFile),issues=[];
 assert.equal(levelSha256(base.level),base.levelSha256);if(!base.accepted)issues.push('base-not-accepted');
 let plain=true;try{assertPlainProofDomain(base.level,runtime);}catch(e){plain=false;issues.push(`not-plain:${e.message}`);}
 const identity=levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
 const blockPaths=[`${root}/proof/attempts/identities/${identity}.blocked.json`,...(base.attempt?.id?[`${root}/proof/attempts/${base.attempt.id}.blocked.json`]:[])].filter(p=>fs.existsSync(p));
 if(blockPaths.length)issues.push('public-failed-physical-identity');
 if(excluded.has(f.designSha256))issues.push('actual-visual-rejection');
 const anchors=new Set(base.level.blocks.map(anchor)),gateKey=gates([...(base.level.gates??[]),...(base.level.flipDoors??[])]);
 const skeletons=families.filter(x=>gates(x.gateTopologyAndColourEvidence.canonicalTopology)===gateKey&&x.exactSharedVisibleGeometryAndOuterColour.anchors.every(b=>anchors.has(anchor(b))));
 if(skeletons.length)issues.push('same-retired-visual-skeleton');
 const overlaps=ancestry.roots.flatMap(r=>(roots.get(r)??[]).map(formalId=>({root:r,formalId})));
 if(overlaps.length)issues.push('already-live-family-root');if(ancestry.roots.some(r=>retired.has(r)))issues.push('retired-promotion-family');
 if(ancestry.unknownReasons.length)issues.push('ancestry-needs-explicit-review');
 const comparisons=selected.map(r=>({formalId:r.q.formalId,stageKey:r.q.stageKey,difficulty:r.q.difficulty,similarity:compareLayouts(base.level,r.q.level).footprintSimilarity}));
 const nearest=comparisons.sort((a,b)=>b.similarity-a.similarity)[0];if(nearest.similarity>.75+1e-12)issues.push('new116-global-near');
 const candidateStages=[...new Set(selected.filter(r=>r.q.newestMechanism).map(r=>r.q.stageKey))].filter(stage=>comparisons.filter(r=>r.stageKey===stage&&r.difficulty===base.difficulty).every(r=>r.similarity<=.65+1e-12));
 let canonical,independent;if(plain&&Array.isArray(base.drags)){canonical=runtime.replayRevisedRoute(base.level,base.drags);independent=independentReplay(runtime,base.level,base.drags);
  if(!(canonical.valid&&canonical.complete&&independent.valid&&independent.complete&&canonical.nonClearingDrags===base.U&&independent.nonClearingDrags===base.U))issues.push('base-original-route-failed');}
 else issues.push('no-supported-complete-base-route');
 levels.push(base.level);rows.push({oldReceipt:row.file,oldReceiptSha256:row.fileSha256,path:row.baseInputFile,fileSha256:row.baseInputFileSha256,
 sourceLevelId:base.sourceLevelId,difficulty:base.difficulty,levelSha256:base.levelSha256,routeSha256:routeSha256(base.drags),priorBaseL:base.L,actualReplayedU:canonical?.nonClearingDrags,
 plain,fullOriginalDualReplay:canonical?.valid&&canonical?.complete&&independent?.valid&&independent?.complete,drags:base.drags?.length,
 baseProofToolchainSha256:base.proofToolchainSha256??base.toolchainSha256??null,baseProofRequiresCurrentQualification:true,
 identity,blockingLedgerFiles:blockPaths.map(path=>({path,sha256:sha(path)})),ancestry,liveFamilyOverlaps:overlaps,visualSkeletonMatches:skeletons.map(x=>({reviewFile:x.reviewFile,source:x.source})),
 nearestSelected:nearest,candidateAdvancedStagesByGeometryOnly:candidateStages,outlineSha256:describeLayout(base.level).boardOutlineSha256,
 status:issues.length?'NOT_AUTOMATICALLY_REUSABLE':'UNIQUE_UNBLOCKED_PLAIN_BASE_FOR_FUTURE_NEW_ADAPTATION',issues,newLUSearches:0});
}
const reservePairs=[];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const similarity=compareLayouts(levels[i],levels[j]).footprintSimilarity;
 if(similarity>.65)reservePairs.push({a:rows[i].path,b:rows[j].path,similarity});}
const report={status:'READ_ONLY_UNUSED_BASIC_BASE_REUSE_SCREEN',formalReady:false,productionChanged:false,policyRuleVersion:runtime.policyRuleVersion,proofToolchainSha256:runtime.toolchainSha256,
 selectedIndex,selectedIndexSha256:sha(selectedIndex),source,sourceSha256:sha(source),rows,reserveNearPairs:reservePairs,
 counts:{all:rows.length,plain:rows.filter(r=>r.plain).length,unblocked:rows.filter(r=>!r.blockingLedgerFiles.length).length,fullDualReplay:rows.filter(r=>r.fullOriginalDualReplay).length,
  reusable:rows.filter(r=>!r.issues.length).length,reusableBands:[1,2,3].map(d=>rows.filter(r=>!r.issues.length&&r.difficulty===d).length)},historyBindings,
 notes:['Not an adaptation run. No new mechanism, proof search, slot allocation, or ledger claim occurred.',
 'Every future adapter must claim its genuinely new final physical input and obey shared construction failure closure, active scope, original asset/static and complete difficulty evidence.',
 'Exactly one live representative per actual local family. Keep visual retirement and ancestor records reachable even though old150 was narrowed to116.',
 'Replaying original accepted witnesses is read-only validation, not a new upper search or transfer of an old certificate to new mechanisms.'],
 searchAccounting:{newLowerSearches:0,newUpperSearches:0,newMechanismCandidates:0},tool:{path:'tools/daily-challenge/formal-v3/design-audit-unused-basic-bases.mjs',sha256:sha('tools/daily-challenge/formal-v3/design-audit-unused-basic-bases.mjs')}};
fs.mkdirSync(out);fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(out+'/index.json',JSON.stringify({formalReady:false,sourceAudit:out+'/report.json',records:rows.filter(r=>!r.issues.length).map(r=>({path:r.path,fileSha256:r.fileSha256,sourceLevelId:r.sourceLevelId,difficulty:r.difficulty}))},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,counts:report.counts,nearPairs:reservePairs.length,issues:rows.filter(r=>r.issues.length).map(r=>({path:r.path,issues:r.issues}))}));
