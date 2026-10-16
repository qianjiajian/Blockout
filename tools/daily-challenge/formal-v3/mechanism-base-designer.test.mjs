import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {generatorBerthOwners,routeCapacity,adaptGeneratorAtVacancy,runDirectedBatch} from './mechanism-base-designer.mjs';

const runtime=await loadBoundedRuntime();
test('a three-rail mount rejects a footprint which misses its center mouth cell',()=>{
 const level={width:5,height:6,blocks:[{id:'miss',x:0,y:1,shape:[[0,0],[1,0]]}]};
 assert.equal(generatorBerthOwners(level,[{side:'left',offset:1,size:3}]).ok,false);
 level.blocks[0].y=2;
 const result=generatorBerthOwners(level,[{side:'left',offset:1,size:3}]);
 assert.equal(result.ok,true);assert.equal(result.chosen[0].mount.offset,2);
 assert.deepEqual(result.chosen[0].mount.spawn,[0,2]);
});

test('two mounts cannot count the same opening body as two distinct owners',()=>{
 const level={width:5,height:6,blocks:[{id:'corner',x:0,y:0,shape:[[0,0],[1,0],[0,1],[1,1]]}]};
 assert.equal(generatorBerthOwners(level,[{side:'left',offset:0,size:3},{side:'top',offset:0,size:3}]).ok,false);
});

test('capacity analysis distinguishes late first moves from late exits and rejects truncated routes',async()=>{
 const p=JSON.parse(await fs.readFile('deliverables/daily-formal-v3-20261008/design/wide-rect-06/candidate-0379.json','utf8'));
 const before=JSON.stringify(p),capacity=routeCapacity(runtime,p.level,p.drags);
 assert.equal(capacity.numericIceD3Compatible,0);assert.equal(capacity.frozenExitD3Compatible,4);
 assert.deepEqual(capacity.firstColorExit.filter(x=>x.clears>=7).map(x=>x.clears).sort((a,b)=>a-b),[9,10,13,21]);
 assert.equal(capacity.fullBoardSearchInvocations,0);assert.equal(JSON.stringify(p),before);
 assert.throws(()=>routeCapacity(runtime,p.level,p.drags.slice(0,-1)),/complete route/);
});

test('finite driver limits are rejected before any candidate ledger or output is created',async()=>{
 await assert.rejects(()=>runDirectedBatch({maxSearches:11}),/Finite pilot limits/);
 await assert.rejects(()=>runDirectedBatch({maxSearches:0}),/Finite pilot limits/);
 await assert.rejects(()=>runDirectedBatch({maxConstructions:Infinity}),/Finite pilot limits/);
 await assert.rejects(()=>adaptGeneratorAtVacancy(runtime,{},[],{maxAttempts:25}),/24 finite/);
});

test('the first directed pilot preserves all ten failed searches without an acceptance claim',async()=>{
 const report=JSON.parse(await fs.readFile('deliverables/daily-formal-v3-20261008/mechanisms/directed-high-01/report.json','utf8'));
 assert.equal(report.searches,10);assert.equal(report.accepted.length,0);assert.equal(report.formalAccepted,0);
 for(const row of report.rows.filter(row=>row.path)){
  const packet=JSON.parse(await fs.readFile(row.path,'utf8'));
  assert.equal(packet.accepted,false);assert.equal(packet.redesignRequired,true);
  assert(packet.route.search.discoveredStates<=10000&&packet.route.search.exploredStates<=10000);
  const blocked=JSON.parse(await fs.readFile(`deliverables/daily-formal-v3-20261008/proof/attempts/${packet.attempt.identityOrigin}.blocked.json`,'utf8'));
  assert.equal(blocked.status,packet.status);
 }
});
