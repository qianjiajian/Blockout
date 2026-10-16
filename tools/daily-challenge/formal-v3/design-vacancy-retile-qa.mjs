import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardCells,inventorySummary} from './diversity-layout-factory.mjs';
import {auditRetile,layerCoverage,targetGeometryChain} from './design-vacancy-retile-candidates.mjs';

const dir=process.argv[2]??'deliverables/daily-formal-v3-20261008/design/delayed-vacancy-retile-01';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const binding=p=>({path:p,sha256:sha(p)}),verify=b=>assert.equal(sha(b.path),b.sha256??b.fileSha256);
const plan=read(`${dir}/plan.json`),report=read(`${dir}/report.json`),index=read(`${dir}/index.json`),root=read(plan.wholeBoardRoot.path),parent=read(plan.parentFailure.path);
for(const b of [plan.wholeBoardRoot,plan.rootGeometry,plan.parentFailure,plan.parentFailure.request,plan.parentFailure.blocked,plan.selected,plan.old450,...plan.tools])verify(b);
assert.equal(report.geometryCalls,report.rows.length);assert(report.rows.length<=20);assert.equal(report.proofSearches,0);assert.equal(report.accepted,0);assert(index.records.length<=4);
const rows=[];let inspectedNodes=0;
for(const row of report.rows){
 verify(row.geometry);const g=read(row.geometry.path),input=plan.inputs[row.index];
 assert.equal(input.shapeSha256,designFingerprints(input.level).shapeSha256);assert.notEqual(input.shapeSha256,parent.attempt.shapeSha256);
 assert(auditRetile(root.level,input.level).pass);assert.equal(levelSha256(g.built.blocks),levelSha256(input.level.blocks.map(({id,x,y,shape})=>({id,x,y,shape}))));
 assert.equal(g.result.rawGeometricStates,g.result.queue.length);assert(g.result.rawGeometricStates<=9999&&g.result.expanded<=9999);
 assert.deepEqual(layerCoverage(g.result),row.layerCoverage);
 const legal=new Set(boardCells(input.level).map(p=>p.join(','))),seen=new Set(),bodies=g.built.blocks.slice(1);
 for(const [i,node]of g.result.queue.entries()){
  inspectedNodes++;const stateKey=JSON.stringify(node.positions);assert(!seen.has(stateKey));seen.add(stateKey);
  const occupied=new Set();
  for(const[b,bIndex]of bodies.map((b,i)=>[b,i]))for(const[dx,dy]of b.shape){const key=`${node.positions[bIndex][0]+dx},${node.positions[bIndex][1]+dy}`;assert(legal.has(key));assert(!occupied.has(key));occupied.add(key);}
  assert.equal(legal.size-occupied.size,2);
  if(i===0){assert.equal(node.parent,-1);assert.equal(node.depth,0);continue;}
  assert(node.parent>=0&&node.parent<i);const before=g.result.queue[node.parent];assert.equal(node.depth,before.depth+1);
  const moved=node.positions.flatMap((p,j)=>JSON.stringify(p)!==JSON.stringify(before.positions[j])?[j]:[]);assert.equal(moved.length,1);
  assert.equal(node.move.blockId,bodies[moved[0]].id);assert.deepEqual(node.move.from,before.positions[moved[0]]);assert.deepEqual(node.move.to,node.positions[moved[0]]);
 }
 rows.push({index:row.index,geometry:row.geometry,rawGeometricStates:g.result.rawGeometricStates,retainedNodeOccupancyAndParents:'PASS',geometryBudget:'PASS',openingAndInventory:'PASS',layerCoverage:row.layerCoverage});
}
const runtime=await loadBoundedRuntime(),packets=[];
for(const record of index.records){
 verify(record);const p=read(record.path),g=read(p.sourceGeometry.path);verify(p.sourceGeometry);
 assert.equal(p.levelSha256,levelSha256(p.level));assert.deepEqual(p.fingerprints,designFingerprints(p.level));assert.equal(p.actualColorSha256,p.fingerprints.colorSha256);
 assert.notEqual(p.fingerprints.shapeSha256,parent.attempt.shapeSha256);assert.notEqual(p.fingerprints.colorSha256,parent.attempt.colorSha256);assert(p.changedSharedIds.length>0);
 assert(auditRetile(root.level,p.level).pass);assert.equal(p.redesignOf,parent.attempt.id);assert.equal(p.accepted,false);assert.equal(p.proofSearches,0);
 assert(layerCoverage(g.result).complete);assert.notEqual(g.result.termination,'construction-state-budget');assert(p.geometryTarget.depth>=32);
 assert.deepEqual(p.geometryChain,targetGeometryChain(g,p.geometryTarget));
 const assignedDepths=p.assigned.map((colorIndex,bodyIndex)=>g.result.earliest[bodyIndex][p.gateIndices[colorIndex]]);
 assert(assignedDepths.every(d=>d===null||d>=32));
 runtime.validateLevel(p.level);const inventory=inventorySummary(p.level,runtime);assert.equal(inventory.nonNativeOrMissingArtIds.length,0);
 const audit=runtime.auditRevisedCandidate(p.level,undefined),issues=audit.issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');assert.equal(issues.length,0);
 assert(Object.values(p.comparisons).every(c=>c.pass));
 packets.push({path:record.path,sha256:record.fileSha256,levelSha256:p.levelSha256,shapeSha256:p.fingerprints.shapeSha256,actualColorSha256:p.actualColorSha256,
  changedSharedIds:p.changedSharedIds.length,shapeInventory:'PASS',actualColourChange:'PASS',openingAndSourceMask:'PASS',nativeArtAndStaticAudit:'PASS',
  targetPoseDepth:p.geometryTarget.depth,minimumAssignedFinitePoseDepth:Math.min(...assignedDepths.filter(d=>d!==null)),
  assignedUnreachedWithinConstructionDepth:assignedDepths.filter(d=>d===null).length,rawGeometricStates:g.result.rawGeometricStates,
  parentChainMoves:p.geometryChain.moves.length,completePuzzleRoute:false,difficultyProof:false,comparisons:p.comparisons});
}
const result={status:'STATIC_CONSTRUCTION_QA_PASS',createdAt:new Date().toISOString(),proofSearches:0,geometrySearchesInThisAudit:0,
 accepted:0,formalReady:false,familyMaximumAccepted:1,bindings:[binding(`${dir}/plan.json`),binding(`${dir}/report.json`),binding(`${dir}/index.json`),binding('tools/daily-challenge/formal-v3/design-vacancy-retile-qa.mjs')],
 geometryInputs:rows.length,inspectedRetainedGeometryNodes:inspectedNodes,packets:packets.length,
 excludedCappedGeometryDespiteEarlyLayerCompletion:report.rows.filter(r=>r.termination==='construction-state-budget'&&r.layerCoverage.complete&&r.latePairsAtLeast32>0).map(r=>r.index),
 limitation:'The reviewed colouring tool rejects every capped graph. Those graphs were retained without recolouring or continuing construction. No U, lower bound or proof acceptance is claimed.',
 rows,candidates:packets};
fs.writeFileSync(`${dir}/qa.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,geometryInputs:rows.length,inspectedNodes,packets:packets.length,proofSearches:0,qa:binding(`${dir}/qa.json`)}));
