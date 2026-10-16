import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {singleVacancyGraph} from './design-single-vacancy.mjs';
import {colourDelayedVacancy} from './design-vacancy-colouring.mjs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {auditCompleteReverseWitness} from './reverse-route-audit.mjs';
const runtime=await loadBoundedRuntime(),evidence=[];
const output=process.env.VACANCY_AUDIT_OUT??fs.mkdtempSync('deliverables/daily-formal-v3-20261008/proof/vacancy-independent-');
if(process.env.VACANCY_AUDIT_OUT)fs.mkdirSync(output);
const hash=path=>createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const base={id:999817,name:'Isolated vacancy cost qualification',width:2,height:2,timeSeconds:100,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5'};
test('rim pose depth includes the final held drag, which can clear at zero non-clearing cost',()=>{
 const level={...base,blocks:[{id:'opening',x:0,y:0,shape:[[0,0],[1,0]],color:'red'},
  {id:'target',x:0,y:1,shape:[[0,0],[1,0]],color:'blue'}],
  gates:[{id:'red',side:'top',offset:0,size:2,color:'red'},{id:'blue',side:'right',offset:0,size:1,color:'blue'}]};
 const graph=singleVacancyGraph(level,level.blocks,{maxDepth:4,maxStates:100});
 const gate=graph.apertures.findIndex(g=>g.side==='right'&&g.offset===0&&g.size===1);
 const drags=[{blockId:'opening',path:[],exitSide:'top'},{blockId:'target',path:[[0,0]],exitSide:'right'}];
 const audit=auditCompleteReverseWitness(runtime,level,drags);
 assert.equal(graph.earliest[0][gate],1);assert(audit.valid);assert.equal(audit.U,0);
 evidence.push({test:'pose-cost-off-by-one',passed:true,level,drags,earliestPoseDepth:1,actualNonClearingDrags:0,
  actualReplay:audit,conclusion:'A matching pose at graph depth d permits a last held clear at cost d-1; use earliest >= floor+1.'});
});
test('held reachable closure counts a turn and multiple unit steps as one parking edge',()=>{
 const level={...base,blocks:[{id:'opening',x:1,y:0,shape:[[0,0],[0,1]],color:'blue'},
  {id:'target',x:0,y:0,shape:[[0,0]],color:'red'},{id:'other',x:0,y:1,shape:[[0,0]],color:'green'}],
  gates:[{id:'blue',side:'right',offset:0,size:2,color:'blue'},{id:'red',side:'bottom',offset:1,size:1,color:'red'},
   {id:'green',side:'left',offset:1,size:1,color:'green'}]};
 const graph=singleVacancyGraph(level,level.blocks,{maxDepth:4,maxStates:100}),target=graph.queue.find(n=>n.positions[0][0]===1&&n.positions[0][1]===1&&n.positions[1][0]===0&&n.positions[1][1]===1);
 assert.equal(target.depth,1);
 const drags=[{blockId:'opening',path:[],exitSide:'right'},{blockId:'target',path:[[1,0],[1,1]],exitSide:'bottom'},
  {blockId:'other',path:[],exitSide:'left'}];
 const audit=auditCompleteReverseWitness(runtime,level,drags);assert(audit.valid);assert.equal(audit.U,0);
 evidence.push({test:'one-held-turn',passed:true,unitSteps:2,graphParkingEdges:1,actualReplay:audit,
  scope:'Micro-action qualification uses singletons; production tiler still uses remaining 2/3-cell bars.'});
});
test('colouring refuses an exact-floor first pose and a partial state-budget graph',()=>{
 const body={id:'opening',x:0,y:0,shape:[[0,0]],color:'red'},b={id:'target',x:1,y:0,shape:[[0,0]],color:'blue'};
 const geometry={built:{ok:true,blocks:[body,b]},result:{maxReached:31,termination:'construction-depth-limit',
  apertures:[{side:'top',size:1,offset:0},{side:'top',size:1,offset:1}],earliest:[[31,31]]}};
 assert.equal(colourDelayedVacancy(geometry,{width:2,height:2},runtime,{floor:31}).reason,'no-delayed-geometric-exit');
 geometry.result.termination='construction-state-budget';
 assert.equal(colourDelayedVacancy(geometry,{width:2,height:2},runtime,{floor:31}).reason,'geometry-has-no-complete-required-depth');
 evidence.push({test:'corrected-floor-filter',passed:true,rejectPoseDepth:31,requiredNonClearingFloor:31,stateBudgetTruncationRejected:true});
});
test('existing failed source198 is only read and its assigned first pose is 32, not 31',()=>{
 const file='deliverables/daily-formal-v3-20261008/design/delayed-vacancy-01/construction.json',before=hash(file),packet=JSON.parse(fs.readFileSync(file));
 const geometryFile=packet.sourceGeometry.path;assert.equal(hash(geometryFile),packet.sourceGeometry.sha256);
 const geometry=JSON.parse(fs.readFileSync(geometryFile));
 const assignments=packet.assigned.map((color,i)=>({blockId:geometry.built.blocks[i+1].id,
  aperture:geometry.result.apertures[packet.gateIndices[color]],earliest:geometry.result.earliest[i][packet.gateIndices[color]]}));
 assert.equal(Math.min(...assignments.map(a=>a.earliest??Infinity)),32);assert.equal(geometry.result.maxReached,45);
 assert.equal(geometry.result.termination,'construction-depth-limit');assert.equal(packet.accepted,false);assert.equal(hash(file),before);
 evidence.push({test:'existing-input-readonly',passed:true,file,fileSha256:before,geometryFile,geometrySha256:hash(geometryFile),
  registeredGeometryStates:geometry.result.rawGeometricStates,maximumCompletedDepth:45,assignments,
  completeRouteKnown:false,accepted:false,oldCandidateSolverCalls:0,note:'This audit does not create a lower certificate or retry the failed mathematical input.'});
});
test.after(()=>{
 const files=['tools/daily-challenge/formal-v3/design-single-vacancy.mjs','tools/daily-challenge/formal-v3/design-vacancy-colouring.mjs',
  'tools/daily-challenge/formal-v3/design-single-vacancy-independent.test.mjs'];
 fs.writeFileSync(`${output}/report.json`,JSON.stringify({status:evidence.length===4?'QUALIFICATION_COMPLETE':'INCOMPLETE',evidence,
  toolBindings:Object.fromEntries(files.map(p=>[p,hash(p)])),proofToolchainSha256:runtime.toolchainSha256,
  realCandidateSolverCalls:0,publicLedgerWrites:0,productionChanged:false,formalReady:false},null,2)+'\n',{flag:'wx'});
});
