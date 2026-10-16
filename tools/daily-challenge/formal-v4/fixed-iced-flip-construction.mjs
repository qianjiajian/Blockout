import assert from 'node:assert/strict';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {assertIcePreservingDomain} from '../formal-v3/ice-preserving-projection.mjs';
import {createCapacityConstructionBudget} from '../formal-v3/capacity-primary-adapter.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';

export const ICED_FLIP_VERSION='one-known-iced-base-four-real-flips-staggered-ice-v1';
export const ICED_FLIP_SLOT='daily-mechanisms-flip-door-150-d3-03';
export const ICED_FLIP_BASE={path:'deliverables/daily-formal-v4-20261008/design/early-prefix-four-math-01/candidate-000.json',sha256:'5a85d64b1c049790242aeb7de8e66c790f26b8b43ed1575d58c655c961a90576'};
export const ICED_FLIP_BASE_AUDIT={path:'deliverables/daily-formal-v4-20261008/proof/early-prefix-four-actual-independent-01/report.json',sha256:'aa70c67297b006da2a3dc975468bb2581320a631c6735e30f19342e0c47b1e3b'};
export const ICED_FLIP_CONFIGURATION=Object.freeze({
 flips:[{id:'v3-g-orange',initiallyOpen:true},{id:'late-aware-yellow',initiallyOpen:true},{id:'late-aware-cyan',initiallyOpen:true},{id:'v3-g-red',initiallyOpen:false}],
 ice:[{id:'v3-18-6841290-b11',count:3},{id:'v3-18-6841290-b12',count:2},{id:'v3-18-6841290-b13',count:4},{id:'v3-18-6841290-b2',count:2},{id:'v3-18-6841290-b10',count:4},{id:'late-811217594-6',count:4}]
});
const clone=structuredClone;
export function assertIcedFlipConfiguration(level,c,{qualificationOnly=false}={}){
 assert.equal(typeof qualificationOnly,'boolean');
 if(!qualificationOnly)assert.deepEqual(c,ICED_FLIP_CONFIGURATION,'Only the one predeclared production configuration');
 assert(c&&Object.keys(c).sort().join(',')==='flips,ice');assert.equal(c.flips.length,4);assert.equal(c.ice.length,6);
 assert.equal(new Set(c.flips.map(x=>x.id)).size,4);assert.equal(new Set(c.ice.map(x=>x.id)).size,6);
 assert(c.flips.every(x=>Object.keys(x).sort().join(',')==='id,initiallyOpen'&&typeof x.initiallyOpen==='boolean'));
 assert(c.ice.every(x=>Object.keys(x).sort().join(',')==='count,id'&&Number.isSafeInteger(x.count)&&x.count>=2&&x.count<=4));
 assert.deepEqual(level.blocks.filter(b=>(b.frozen??0)>0).map(b=>b.id).sort(),c.ice.map(x=>x.id).sort(),'All six original ice bodies must remain represented');
 for(const x of c.ice){const b=level.blocks.find(b=>b.id===x.id);assert(b&&b.frozen<=x.count,'Ice may only strengthen, never erase');}
 assert.equal((level.flipDoors??[]).length,0);assert(c.flips.every(x=>level.gates.some(g=>g.id===x.id)));
 assert.equal(new Set(level.gates.map(g=>g.color)).size,level.gates.length,'This fixed design requires unique physical exits per colour');
 const plain=clone(level);for(const b of plain.blocks)delete b.frozen;assertPlainProofDomain(plain);
 return clone(c);
}
function trace(runtime,level,drags,meter,kind){
 meter.reserve(1,kind+'-initial');const model=new runtime.PuzzleModel(level);model.startCountdown();
 const events=[],rows=[],first=new Map();
 for(const [i,d]of drags.entries()){
  assert(Array.isArray(d.path)&&d.path.every(p=>p.length===2&&p.every(Number.isSafeInteger)));
  meter.reserve(d.path.length+2+2*Number(!!d.exitSide),kind+'-begin-unit-exit-commit');
  const before=model.snapshot();assert(model.getBlock(d.blockId));
  if(!first.has(d.blockId))first.set(d.blockId,{id:d.blockId,drag:i+1,clearsBeforeFirst:before.cleared});
  const native=model.tryExit,exits=[];
  model.tryExit=function(id,side){const s=this.snapshot(),out=native.call(this,id,side);if(out.ok){
   const gate=[...s.gates,...s.flipDoors].find(g=>g.id===out.gateId);assert(gate,'Actual tryExit gate ID required');
   exits.push({drag:i+1,blockId:id,gateId:out.gateId,side,clearedBefore:s.cleared,flip:s.flipDoors.some(g=>g.id===out.gateId),openBeforeExit:gate.open??null});}return out;};
  try{applyNativeDrag(model,d);}finally{model.tryExit=native;}
  const after=model.snapshot();assert.equal(after.moves,before.moves+1);assert.equal(exits.length,Number(!!d.exitSide));
  assert.equal(after.cleared-before.cleared,Number(!!d.exitSide),'One single-layer clear per declared exit');
  rows.push({drag:i+1,blockId:d.blockId,cleared:after.cleared,clearDelta:after.cleared-before.cleared,
   thawed:before.blocks.filter(b=>b.frozen>0&&after.blocks.some(a=>a.id===b.id&&a.frozen===0)).map(b=>b.id),
   flipsBefore:before.flipDoors.map(g=>({id:g.id,open:g.open})),flipsAfter:after.flipDoors.map(g=>({id:g.id,open:g.open})),stateSha256:levelSha256(after)});events.push(...exits);
 }
 const final=model.snapshot();assert(final.complete&&!final.failed&&final.blocks.length===0&&final.queuedBlocks.length===0,'Full original inventory must clear');
 return{valid:true,complete:true,failed:false,effectiveDrags:drags.length,nonClearingDrags:rows.filter(r=>!r.clearDelta).length,clearEvents:events.length,events,trace:rows,firstActions:[...first.values()],final};
}
function independent(runtime,level,drags,meter){
 meter.reserve(1+drags.reduce((n,d)=>n+d.path.length+2+2*Number(!!d.exitSide),0),'deferred-independent-full-route');
 const r=independentReplay(runtime,level,drags);assert(r.valid&&r.complete&&!r.failed&&r.remainingBodies===0&&r.remainingQueued===0,r.error??'Independent original U');return r;
}
export function inspectFixedIcedFlipObject(baseLevel,level,c){
 const restored=clone(level);assert.equal(restored.flipDoors.length,4);
 for(const x of c.flips){const actual=restored.flipDoors.find(g=>g.id===x.id),old=baseLevel.gates.find(g=>g.id===x.id);
  assert(actual&&old);assert.deepEqual(actual,{...old,initiallyOpen:x.initiallyOpen},'Exact portal identity, geometry, colour and initial phase');}
 restored.gates=baseLevel.gates.map(g=>{const actual=[...level.gates,...level.flipDoors].find(x=>x.id===g.id);assert(actual);const copy=clone(actual);delete copy.initiallyOpen;assert.deepEqual(copy,g);return copy;});
 assert.equal(level.gates.length+level.flipDoors.length,baseLevel.gates.length);delete restored.flipDoors;
 if(Object.hasOwn(baseLevel,'flipDoors'))restored.flipDoors=clone(baseLevel.flipDoors);
 for(const x of c.ice){const b=restored.blocks.find(b=>b.id===x.id),old=baseLevel.blocks.find(b=>b.id===x.id);assert.equal(b.frozen,x.count);b.frozen=old.frozen;}
 assert.deepEqual(restored,baseLevel,'Only the declared ice values and gate types may change');assertIcePreservingDomain(level);
 return true;
}
function strength(base,level,c,priorLevel,replay,original,qualificationOnly=false){
 inspectFixedIcedFlipObject(base,level,c);const inventory=mechanismInventory(level),previous=mechanismInventory(priorLevel);
 assert(previous['flip-door'].length<4);assert(Object.values(previous).reduce((n,x)=>n+x.length,0)<10);
 const flips=c.flips.map(x=>{const uses=replay.events.filter(e=>e.gateId===x.id&&e.flip),toggles=replay.trace.filter(t=>t.flipsBefore.find(g=>g.id===x.id)?.open!==t.flipsAfter.find(g=>g.id===x.id)?.open).length;
  assert(uses.length&&uses.every(e=>e.openBeforeExit===true)&&toggles>=2,'Every real flip portal must be used and change phase');return{...x,active:true,toggles,actualGateExits:uses};});
 const ice=c.ice.map(x=>{const old=base.blocks.find(b=>b.id===x.id),first=original.firstActions.find(t=>t.id===x.id),release=replay.trace.find(t=>t.thawed.includes(x.id));
  assert(first&&x.count<=first.clearsBeforeFirst,'Frozen body cannot move before its declared release');if(!qualificationOnly)assert.equal(x.count,first.clearsBeforeFirst,'Production values are the highest safe values on this known route');
  assert(release&&release.cleared===x.count&&release.drag<first.drag,'Actual thaw must precede first action');
  return{...x,previousCount:old.frozen,increase:x.count-old.frozen,firstAction:first.drag,clearsBeforeFirst:first.clearsBeforeFirst,releaseDrag:release.drag,active:true};});
 assert(new Set(ice.map(x=>x.releaseDrag)).size>=2,'Distinct actual release events required');assert(ice.some(x=>x.increase>0));
 assert.equal(inventory['flip-door'].length,4);assert.equal(inventory['numeric-ice'].length,6);
 return{passed:true,issues:[],mechanism:'flip-door',actualInstances:4,priorInstances:previous['flip-door'].length,
  instanceIncrease:4-previous['flip-door'].length,inventory,priorInventory:previous,flips,ice,allPresentMechanismsParticipate:true,realGateIdentityChecked:true,
  originalU:original.nonClearingDrags,U:replay.nonClearingDrags,designChoiceNotUserUniformQuota:true,
  strengthStrategy:'four-real-flip-portals-plus-six-existing-early-release-ice-at-route-safe-maxima',numericIceUniformMinimumSevenClaimed:false,
  priorComparison:{priorInventory:previous,currentInventory:inventory,priorFlipCount:previous['flip-door'].length,currentFlipCount:4,baseIceCounts:ice.map(x=>x.previousCount),currentIceCounts:ice.map(x=>x.count),increasedIceBodies:ice.filter(x=>x.increase>0).map(x=>x.id)}};
}
export function constructFixedIcedFlip(runtime,base,slot,priorLevel,{configuration=ICED_FLIP_CONFIGURATION,qualificationOnly=false,worldBudget}={}){
 assert.equal(slot.formalId,ICED_FLIP_SLOT);assert.equal(slot.difficulty,3);assert.equal(slot.newestMechanism,'flip-door');
 const c=assertIcedFlipConfiguration(base.level,configuration,{qualificationOnly}),meter=createCapacityConstructionBudget(worldBudget),input=levelSha256(base.level),route=routeSha256(base.drags);let level;
 const provenance=()=>({version:ICED_FLIP_VERSION,inputLevelSha256:input,inputRouteSha256:route,outputLevelSha256:level?levelSha256(level):null,outputRouteSha256:route,configuration:c,configurationsAttempted:1,heldSearches:0,fullBoardSearches:0,routeRepairAllowed:false,constructionAccounting:meter.report()});
 try{
  const original=trace(runtime,base.level,base.drags,meter,'base');meter.reserve(1,'one-final-iced-flip-world');
  level={...clone(base.level),blocks:base.level.blocks.map(b=>({...clone(b),...(c.ice.find(x=>x.id===b.id)?{frozen:c.ice.find(x=>x.id===b.id).count}:{})})),
   gates:base.level.gates.filter(g=>!c.flips.some(x=>x.id===g.id)).map(g=>clone(g)),flipDoors:c.flips.map(x=>({...clone(base.level.gates.find(g=>g.id===x.id)),initiallyOpen:x.initiallyOpen}))};
  runtime.validateLevel(level);inspectFixedIcedFlipObject(base.level,level,c);
  const canonical=trace(runtime,level,base.drags,meter,'final'),other=independent(runtime,level,base.drags,meter);
  assert.equal(canonical.nonClearingDrags,original.nonClearingDrags);assert.equal(other.nonClearingDrags,canonical.nonClearingDrags);
  const audit=strength(base.level,level,c,priorLevel,canonical,original,qualificationOnly);
  assert.equal(levelSha256(base.level),input);assert.equal(routeSha256(base.drags),route);
  return{...clone(slot),ok:true,level,drags:clone(base.drags),levelSha256:levelSha256(level),routeSha256:route,configuration:c,audit,
   canonicalReplay:canonical,independentReplay:other,originalReplay:original,constructionAccounting:meter.report(),provenance:provenance(),primaryInstances:4,addedSupport:[],mathematicalAcceptance:false};
 }catch(e){return{ok:false,status:'ONE_ICED_FLIP_CONFIGURATION_REJECTED',reason:e.message,budgetExhausted:e.capacityBudgetExhausted===true,level,configuration:c,constructionAccounting:meter.report(),provenance:provenance(),mathematicalAcceptance:false};}
}
export function auditFixedIcedFlip(runtime,base,level,drags,priorLevel,{configuration=ICED_FLIP_CONFIGURATION,qualificationOnly=false,worldBudget}={}){
 const c=assertIcedFlipConfiguration(base.level,configuration,{qualificationOnly});assert.deepEqual(drags,base.drags);inspectFixedIcedFlipObject(base.level,level,c);
 const m=createCapacityConstructionBudget(worldBudget),original=trace(runtime,base.level,drags,m,'verification-base'),actual=trace(runtime,level,drags,m,'verification-final'),other=independent(runtime,level,drags,m);
 assert.equal(actual.nonClearingDrags,other.nonClearingDrags);return{...strength(base.level,level,c,priorLevel,actual,original,qualificationOnly),canonicalReplay:actual,independentReplay:other,verificationAccounting:m.report(),newSearches:0};
}
