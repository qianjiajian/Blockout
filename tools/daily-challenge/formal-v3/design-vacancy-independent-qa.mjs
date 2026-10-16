import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {geometryStockFingerprint,graphMicroCounts,SOURCES} from './design-vacancy-independent-pool.mjs';
import {layerCoverage,targetGeometryChain} from './design-vacancy-retile-candidates.mjs';
import {loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boardCells,absoluteCells,inventorySummary} from './diversity-layout-factory.mjs';
import {compareLayouts} from './diversity.mjs';
const dir=process.argv[2]??'deliverables/daily-formal-v3-20261008/design/single-vacancy-independent-03';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),bind=p=>({path:p,sha256:sha(p)});
const verify=b=>assert.equal(sha(b.path),b.sha256??b.fileSha256);
const p=read(`${dir}/plan.json`),r=read(`${dir}/report.json`),idx=read(`${dir}/index.json`),history=read(p.priorStockCensus.path),runtime=await loadBoundedRuntime();
for(const b of [p.priorStockCensus,p.selected,p.old450,...p.tools])verify(b);
assert.equal(p.inputs.length,120);assert.deepEqual(p.sources,SOURCES);assert.equal(r.geometryCalls,120);assert.equal(r.proofSearches,0);assert.equal(r.accepted,0);
const oldSet=new Set(history.records.map(x=>x.stockSha256)),seen=new Set(),checks=[];
for(const input of p.inputs){
 assert(input.i>=4&&input.i<=11);assert.equal(input.seed,518492+input.i*714731+input.sourceLevelId*71719);
 const source=runtime.LEVELS.find(s=>s.id===input.sourceLevelId);assert.equal(levelSha256(source),input.sourceLevelSha256);
 assert(input.built.ok);const f=geometryStockFingerprint(source,input.built.blocks);assert.deepEqual(f,input.fingerprint);assert(!oldSet.has(f.stockSha256));assert(!seen.has(f.stockSha256));seen.add(f.stockSha256);
 const expected=boardCells(source).map(x=>x.join(',')).sort(),actual=input.built.blocks.flatMap(absoluteCells).map(x=>x.join(',')).sort();assert.deepEqual(actual,expected);
 assert.equal(input.built.blocks[0].shape.length,2);assert(input.built.blocks.every(b=>[2,3].includes(b.shape.length)&&(b.shape.every(p=>p[0]===0)||b.shape.every(p=>p[1]===0))));
 const row=r.rows.find(x=>x.index===input.index);assert(row.rawGeometricStates<=9999&&row.expanded<=9999);assert.equal(row.micro.microNeighbourChecks,4*row.micro.microDiscoveredStates);
 checks.push({index:input.index,sourceLevelId:input.sourceLevelId,i:input.i,stockSha256:f.stockSha256,staticCoverageAndNovelty:'PASS',raw:row.rawGeometricStates,termination:row.termination});
}
let inspectedNodes=0;const candidates=[];
const oldFamilyPaths=['deliverables/daily-formal-v3-20261008/design/delayed-vacancy-01/construction.json',
 'deliverables/daily-formal-v3-20261008/design/delayed-vacancy-retile-01/candidate-0001.json','deliverables/daily-formal-v3-20261008/design/delayed-vacancy-retile-01/candidate-0008.json'];
for(const entry of idx.records){
 verify(entry);verify(entry.geometry);const packet=read(entry.path),g=read(entry.geometry.path);
 assert.equal(packet.levelSha256,levelSha256(packet.level));assert.deepEqual(packet.fingerprints,designFingerprints(packet.level));assert.deepEqual(graphMicroCounts(g.result),g.micro);
 assert(layerCoverage(g.result).complete);assert.notEqual(g.result.termination,'construction-state-budget');assert.deepEqual(packet.geometryChain,targetGeometryChain(g,packet.geometryTarget));
 assert(packet.geometryTarget.depth>=32);assert(packet.assigned.every((c,i)=>g.result.earliest[i][packet.gateIndices[c]]===null||g.result.earliest[i][packet.gateIndices[c]]>=32));
 const legal=new Set(boardCells(packet.level).map(x=>x.join(','))),bodies=g.built.blocks.slice(1),seenStates=new Set();
 for(const [n,node]of g.result.queue.entries()){
  inspectedNodes++;const key=JSON.stringify(node.positions);assert(!seenStates.has(key));seenStates.add(key);const occupied=new Set();
  bodies.forEach((b,i)=>b.shape.forEach(([dx,dy])=>{const key=`${node.positions[i][0]+dx},${node.positions[i][1]+dy}`;assert(legal.has(key));assert(!occupied.has(key));occupied.add(key);}));
  assert.equal(legal.size-occupied.size,2);
  if(n===0){assert.equal(node.parent,-1);continue;}
  assert(node.parent<n&&node.parent>=0);const prior=g.result.queue[node.parent];assert.equal(node.depth,prior.depth+1);
  const changes=node.positions.flatMap((p,i)=>JSON.stringify(p)!==JSON.stringify(prior.positions[i])?[i]:[]);assert.equal(changes.length,1);
  assert.equal(node.move.blockId,bodies[changes[0]].id);assert.deepEqual(node.move.from,prior.positions[changes[0]]);assert.deepEqual(node.move.to,node.positions[changes[0]]);
 }
 runtime.validateLevel(packet.level);assert.equal(inventorySummary(packet.level,runtime).nonNativeOrMissingArtIds.length,0);
 const issues=runtime.auditRevisedCandidate(packet.level,undefined).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');assert.equal(issues.length,0);
 const priorFamilySimilarities=oldFamilyPaths.map(path=>({path,similarity:compareLayouts(packet.level,read(path).level).footprintSimilarity}));assert(priorFamilySimilarities.every(x=>x.similarity<=.65));
 candidates.push({path:entry.path,sha256:entry.fileSha256,levelSha256:packet.levelSha256,sourceLevelId:packet.sourceLevelId,raw:g.result.rawGeometricStates,
  micro:g.micro,targetDepth:packet.geometryTarget.depth,staticNativeCoverage:'PASS',geometryParentsAndOccupancy:'PASS',priorFamilySimilarities,proofSearches:0,U:null,L:null});
}
const out={status:'STATIC_ONLY_QA_PASS',geometrySearchesInThisAudit:0,proofSearches:0,accepted:0,formalReady:false,inputsChecked:checks.length,oldGeometryInputs:history.records.length,
 uniqueNewStocks:seen.size,oldStockOverlap:0,inspectedRetainedGeometryNodes:inspectedNodes,independentFamilies:candidates.length,
 sourceCount:new Set(candidates.map(x=>x.sourceLevelId)).size,scope:'No final puzzle route or mathematical difficulty proof; one slot maximum per independent family.',
 bindings:[bind(`${dir}/plan.json`),bind(`${dir}/report.json`),bind(`${dir}/index.json`),bind('tools/daily-challenge/formal-v3/design-vacancy-independent-qa.mjs')],checks,candidates};
fs.writeFileSync(`${dir}/qa.json`,JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:out.status,old:out.oldGeometryInputs,new:out.uniqueNewStocks,inspectedNodes,qa:bind(`${dir}/qa.json`)}));
