import fs from 'node:fs';
import assert from 'node:assert/strict';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';

// Inventory/event/FIFO feasibility reasoning only. Does not create a candidate,
// solve a board, alter counters, or certify the whole-level difficulty floor.
const lock=verifyRulesLock();
assert(lock.ok,JSON.stringify(lock.errors));assert.equal(lock.activeVersion,'1.94.0');
const basePath='deliverables/lv70-remake-20260927/baseline.json';
const base=JSON.parse(fs.readFileSync(basePath)).level;
const queued=new Set(base.generators.flatMap(g=>g.queueBlockIds));
const byId=new Map(base.blocks.map(b=>[b.id,b]));
const count=(blocks)=>Object.fromEntries(['blue','green','pink','yellow'].map(c=>[c,blocks.filter(b=>b.color===c).length]));
const openingCounts=count(base.blocks.filter(b=>!queued.has(b.id))),queueCounts=count(base.blocks.filter(b=>queued.has(b.id)));
assert.deepEqual(openingCounts,{blue:4,green:5,pink:6,yellow:4});
assert.deepEqual(queueCounts,{blue:1,green:5,pink:5,yellow:6});
const ids=([1,5,16,3,2,4,0,7,8]);
const proposal=[ids,[9,13,11,6,10,14,12,15]].map((numbers,i)=>({name:i?'B':'A',queue:numbers.map(n=>byId.get(`v146-70-queue-${n}`))}));
assert.deepEqual(proposal.flatMap(g=>g.queue.map(b=>b.id)).sort(),[...queued].sort());
for(const g of proposal)assert(g.queue.every((b,i)=>!i||b.color!==g.queue[i-1].color));
const blueCarrier=proposal.find(g=>g.queue.some(b=>b.color==='blue'));
const blueIndex=blueCarrier.queue.findIndex(b=>b.color==='blue');
// Until the first gate thaws at clear #5 only blue is eligible. Reaching the
// sole queued blue necessarily moves all preceding frozen-color cargo off the
// fixed mouth; those bodies cannot clear during that movement.
const forcedBeforeGreen=new Set(blueCarrier.queue.slice(0,blueIndex).map(b=>b.id));
const greenCountNeededBeforePink=14-(openingCounts.blue+queueCounts.blue);
const greenQueueNeededBeforePink=greenCountNeededBeforePink-openingCounts.green;
assert.equal(greenQueueNeededBeforePink,4);
const allocations=[];
for(let a=0;a<=3;a++)for(let b=0;b<=2;b++){
 if(a+b<greenQueueNeededBeforePink)continue;
 const used=[a,b],forced=new Set(forcedBeforeGreen),prefixes=[];
 for(const[gIndex,g]of proposal.entries()){
  const greens=g.queue.map((body,i)=>body.color==='green'?i:-1).filter(i=>i>=0);
  const end=used[gIndex]?greens[used[gIndex]-1]:-1;
  const prefix=g.queue.slice(0,end+1);
  for(const body of prefix)if(['pink','yellow'].includes(body.color))forced.add(body.id);
  prefixes.push({machine:g.name,greenCargoNeeded:used[gIndex],minimumEmittedPrefix:prefix.map(body=>body.id)});
 }
 const bodies=[...forced].map(id=>byId.get(id));
 allocations.push({greens:[a,b],prefixes,forcedDistinctCargoParkingIds:[...forced],forcedCargoRepositionsAtLeast:forced.size,forcedMultiCellAtLeast:bodies.filter(body=>body.shape.length>1).length,forcedSingleCellAtLeast:bodies.filter(body=>body.shape.length===1).length});
}
const minimumCargoParking=Math.min(...allocations.map(a=>a.forcedCargoRepositionsAtLeast));
assert.equal(minimumCargoParking,7);
const report={createdAt:new Date().toISOString(),activeRule:lock.activeVersion,status:'INVENTORY_AND_EVENT_PREFIX_ARGUMENT_ONLY',
 sourceIceCounts:{blue:0,green:1,pink:1,yellow:1},authoredCounterProposals:[{green:5,pink:14,yellow:24},{green:5,pink:14,yellow:25}],
 openingCounts,queueCounts,fullCounts:count(base.blocks),
 proposedQueues:proposal.map(g=>({name:g.name,queue:g.queue.map(b=>({id:b.id,color:b.color,shape:b.shape,area:b.shape.length})),adjacentColorsDifferent:true})),
 totalInventoryUnchanged:true,queueOrderAuthoredNotSourceFact:true,
 eventEnvelope:{firstGate:{color:'green',count:5,priorClearCapacity:5,requiresAllOpeningBlue:true,requiresOnlyQueuedBlue:true},secondGate:{color:'pink',count:14,priorColors:['blue','green'],priorClearCapacity:15,greenClearMinimum:9,greenCargoClearMinimum:4,bothMachinesRequiredBecauseGreenSplit:[3,2]},thirdGateAlternatives:[{color:'yellow',count:24,priorClearCapacity:26,pinkClearMinimum:9,pinkCargoClearMinimum:3},{color:'yellow',count:25,priorClearCapacity:26,pinkClearMinimum:10,pinkCargoClearMinimum:4,bothMachinesRequiredBecausePinkSplit:[2,3]}]},
 forcedBeforeGreen:[...forcedBeforeGreen],beforePinkAllocations:allocations,minimumDistinctCargoParkingBeforePink:minimumCargoParking,
 earlyAreaCheck:{fourOpeningBlueRemovedCells:8,firstThreeMachineACargoCells:6,meaning:'No simple area contradiction, not a spatial reachability check.'},
 assumptions:['Each of the 36 bodies contributes one clear; no shell, hidden batch, bomb, ice block or other clear-event source is added.','Unique ordinary blue and ice green/pink/yellow exits enforce body colors.','Fixed FIFO automatic spawn keeps each queue body blocking successors until it physically leaves the spawn footprint.','Pressing a mouth to delay spawning remains legal and is not excluded; capacity argument still requires the listed cargo clears before each unlock.','A body parked while its exit is frozen cannot count as a clearing drag.'],
 caveats:['The final board geometry/gates/placements are not designed by this report.','Event capacities do not prove spatial solvability, fairness, absence of all deadlocks, L>=11, U<=15, or natural-clock/input success.','At least 7 cargo parking is a conditional necessary argument for the proposed queues/counters, not a new user-mandated quota and not a certification of any existing candidate.','Source counters remain 1/1/1; 5/14/24 or 25 are original design proposals authorized by v1.93.'],
 candidateCreated:false,formalModified:false,fullSolverRun:false,wholeLevelDifficultyCertified:false,pointerValidated:false,playerSaveTouched:false,published:false,
 bindings:Object.fromEntries([basePath,'tools/lv70-remake-20260927/source-ice-chain.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.91.0.md','docs/rules/mechanism-rules-v1.93.0.md','docs/rules/mechanism-rules-v1.94.0.md'].map(p=>[p,digest(fs.readFileSync(p))]))};
const out=`deliverables/lv70-remake-20260927/source-ice-chain-${Date.now()}.json`;
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,status:report.status,openingCounts,queueCounts,minimumCargoParking,allocations:allocations.map(a=>({greens:a.greens,parks:a.forcedCargoRepositionsAtLeast,multi:a.forcedMultiCellAtLeast,single:a.forcedSingleCellAtLeast}))}));
