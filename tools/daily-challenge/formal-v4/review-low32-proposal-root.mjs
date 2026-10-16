import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {boardCells,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';

const [proposalPath,proposalSha,out]=process.argv.slice(2);
const bindings={},hash=b=>createHash('sha256').update(b).digest('hex');
async function read(p,h){const b=await fs.readFile(p),a=hash(b);if(h)assert.equal(a,h,p);bindings[p]=a;return JSON.parse(b);}
const q=await read(proposalPath,proposalSha),runtime=await loadV4Runtime();
assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
assert.equal(q.scope,300);assert.equal(q.selectedCount,150);assert.equal(q.newConstructions,0);assert.equal(q.newSearches,0);
assert.equal(q.campaign.newFixedExperimentalInputQuota,32);assert.equal(q.references.length,8);assert.equal(q.inputs.length,32);
assert.equal(q.campaign.maximumStaticPartitionAttempts,4000);assert.equal(q.campaign.noReplacementsForFailedColourCsp,true);
assert.equal(q.campaign.previousMacroExperiment.actualInputs,58);assert.equal(q.campaign.previousMacroExperiment.endedWithoutFillingUnusedQuota,true);
assert.equal(q.designPolicy.shapeInventoryPolicy.retireGlobalShapeMultisetOnlyBanForFutureInputs,true);
const selection=await read(q.selectedIndex.path,q.selectedIndex.sha256);assert.equal(selection.files.length,150);
const refs=new Map(),rows=[],bands={1:0,2:0},counts={};
for(const r of q.references){
 const p=await read(r.reference.path,r.reference.sha256);assert(p.accepted);assert.equal(p.levelSha256,levelSha256(p.level));assert.equal(r.routeSha256,routeSha256(p.drags));if(p.routeSha256!==undefined)assert.equal(p.routeSha256,r.routeSha256);
 assert.equal(p.sourceLevelId??p.level.id,r.sourceLevelId);assert.equal(boardBaselineSha256(p.level),boardBaselineSha256(runtime.LEVELS.find(l=>l.id===r.sourceLevelId)));
 const canonical=runtime.replayRevisedRoute(p.level,p.drags),other=independentReplay(runtime,p.level,p.drags);
 for(const a of [canonical,other])assert(a.valid&&a.complete&&!a.failed);
 assert.equal(canonical.nonClearingDrags,other.nonClearingDrags);assert.equal(canonical.nonClearingDrags,p.U);
 for(const b of p.level.blocks){const a=runtime.matchFormalBlockShape(b.shape,'native-only');assert(a&&a.quarterTurns===0);assert(runtime.GAME_ART.gameplay.formalBlocks[b.color]?.solid?.[a.shapeId]);}
 const prefix='deliverables/daily-formal-v3-20261008/proof/attempts/'+p.attempt.id;
 const request=await read(prefix+'.request.json'),result=await read(prefix+'.result.json');assert.deepEqual(request,p.attempt);assert(result.accepted);assert.equal(result.levelSha256,p.levelSha256);
 refs.set(r.referenceId,{reference:r,candidate:p});
 rows.push({source:r.sourceLevelId,reference:r.reference,L:p.L,U:p.U,actualDualCompleteReplays:2,normalMainlineMask:true});
}
const sorted=ps=>ps.map(p=>p.join(',')).sort();
for(const i of q.inputs){
 const {candidate:p,reference:r}=refs.get(i.referenceId);assert.equal(i.sourceLevelId,r.sourceLevelId);assert.equal(i.targetDifficulty,r.targetDifficulty);
 assert.equal(i.quota,1);assert.equal(i.maximumStaticPartitionAttempts,125);assert([1,2].includes(i.targetDifficulty));
 bands[i.targetDifficulty]++;counts[i.sourceLevelId]=(counts[i.sourceLevelId]??0)+1;
 assert.equal(i.lowerFloor,i.targetDifficulty===1?16:21);assert.equal(i.upperCeiling,i.targetDifficulty===1?20:30);
 assert.deepEqual(i.prefixDrags,p.drags.slice(0,i.cut));assert.equal(i.prefixSha256,routeSha256(i.prefixDrags));
 const ids=new Set(i.region.bodyIds);assert.equal(ids.size,i.region.bodyIds.length);assert(i.prefixDrags.every(d=>!ids.has(d.blockId)));
 assert.equal(p.drags.findIndex(d=>ids.has(d.blockId)),i.cut);
 const cells=p.level.blocks.filter(b=>ids.has(b.id)).flatMap(absoluteCells);assert.deepEqual(sorted(cells),sorted(i.region.cells));
 assert.equal(cells.length,i.region.area);assert.equal(i.region.fraction,cells.length/boardCells(p.level).length);assert(i.region.fraction>=.35);
 const all=new Set(sorted(cells)),seen=new Set(),queue=[cells[0]];for(const c of queue){const key=c.join(',');if(seen.has(key))continue;seen.add(key);for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[c[0]+x,c[1]+y];if(all.has(n.join(','))&&!seen.has(n.join(',')))queue.push(n);}}
 assert.equal(seen.size,all.size);assert.equal(i.prefixFacts.parking,i.prefixDrags.filter(d=>!d.exitSide).length);
 assert.equal(i.prefixFacts.maximumNewTailParking,i.upperCeiling-i.prefixFacts.parking);assert(i.prefixFacts.maximumNewTailParking>=0);
 assert.equal(i.prefixFacts.notALowerBound,true);
}
assert.deepEqual(bands,{1:8,2:24});assert(Object.values(counts).every(n=>n===4));
const report={status:'ROOT_LOW32_READONLY_PROPOSAL_REVIEW_PASS',proposal:{path:proposalPath,sha256:proposalSha},fileBindings:bindings,
 referenceRows:rows,plannedInputs:32,plannedBands:bands,errors:[],newConstructions:0,newSearches:0,newClaims:0,
 qualificationScope:'Review of fixed proposal geometry, actual reference routes and 32 target bands; executable plan and new candidate evidence still required.',
 executable:false,formalReady:false};
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,path:out,sha256:hash(await fs.readFile(out)),references:8,inputs:32}));
