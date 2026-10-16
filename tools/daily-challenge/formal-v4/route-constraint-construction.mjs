import assert from 'node:assert/strict';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {createCapacityConstructionBudget} from '../formal-v3/capacity-primary-adapter.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';

export const CONSTRAINT_CONSTRUCTION_VERSION='fixed-d1-key-or-flip-known-route-once-v1';
export const CONSTRAINT_STAGES=Object.freeze(['key-lock','flip-door']);

function replayAccounted(runtime,level,drags,budget,kind){
 budget.reserve(1,kind+'-initial');const model=new runtime.PuzzleModel(level);model.startCountdown();
 const trace=[],exits=[],timings=new Map(level.blocks.map(b=>[b.id,{id:b.id,firstAction:null,exitDrag:null}]));
 const initial=model.snapshot();
 for(const [i,drag]of drags.entries()){
  budget.reserve(drag.path.length+Number(!!drag.exitSide)+1,kind+'-unit-exit-commit');
  const before=model.snapshot(),timing=timings.get(drag.blockId);assert(timing);timing.firstAction??=i+1;
  const original=model.tryExit,events=[];model.tryExit=function(id,side){
   const opening=this.snapshot(),result=original.call(this,id,side);
   if(result.ok){const portal=opening.gates.find(g=>g.id===result.gateId),flip=opening.flipDoors.find(g=>g.id===result.gateId);
    assert(portal||flip,'Actual gate identity required');events.push({drag:i+1,blockId:id,gateId:result.gateId,side,
     kind:flip?'flip-door':'ordinary',openBeforeExit:flip?.open??null,clearedBefore:opening.cleared});}
   return result;};
  try{applyNativeDrag(model,drag);}finally{model.tryExit=original;}
  const after=model.snapshot();assert.equal(events.length,drag.exitSide?1:0);if(drag.exitSide)timing.exitDrag=i+1;
  exits.push(...events);trace.push({drag:i+1,blockId:drag.blockId,clearDelta:after.cleared-before.cleared,
   unlocked:before.blocks.filter(b=>b.lockedBy&&!after.blocks.find(x=>x.id===b.id)?.lockedBy).map(b=>b.id),
   flipsBefore:before.flipDoors.map(g=>({id:g.id,open:g.open})),flipsAfter:after.flipDoors.map(g=>({id:g.id,open:g.open})),
   stateSha256:levelSha256(after)});
 }
 const final=model.snapshot();assert(final.complete&&!final.failed&&!final.blocks.length&&!final.queuedBlocks.length,'Exact complete known U required');
 return{valid:true,complete:true,effectiveDrags:drags.length,nonClearingDrags:trace.filter(t=>t.clearDelta===0).length,
  initial,final,trace,exits,timings:[...timings.values()]};
}

/** This batch intentionally uses exactly two primary instances on D1.
 * It is not a new user quota and does not relax any difficulty threshold.
 * There is one configuration, one fixed witness and no route repair/search. */
export function constructRouteConstraint(runtime,base,slot,priorLevel,{worldBudget}={}){
 assert(CONSTRAINT_STAGES.includes(slot.newestMechanism));assert.equal(slot.difficulty,1,'Only this fixed seven D1 plan is reviewed');
 assertPlainProofDomain(base.level);const budget=createCapacityConstructionBudget(worldBudget),input=levelSha256(base.level),route=routeSha256(base.drags);
 let level=null,design=null;const previous=mechanismInventory(priorLevel),mechanism=slot.newestMechanism;
 try{
  const original=replayAccounted(runtime,base.level,base.drags,budget,'original-reference');
  const prior=previous[mechanism];assert(prior.length<2,'Two-instance proposal must strictly increase the exact old slot');
  if(mechanism==='key-lock'){
   const keys=original.timings.toSorted((a,b)=>a.exitDrag-b.exitDrag).slice(0,3);assert.equal(keys.length,3);
   const eligible=original.timings.filter(b=>!keys.some(k=>k.id===b.id)).map(b=>({...b,available:keys.filter(k=>k.exitDrag<b.firstAction).length}));
   const lock3=eligible.findLast(b=>b.available>=3),lock2=eligible.find(b=>b.id!==lock3?.id&&b.available>=2);
   assert(lock2&&lock3,'The fixed route must support actual 2-key and 3-key unlocks');
   assert(2>Math.max(0,...prior.map(b=>b.value)),'Both actual counters must increase over prior maximum');
   const group=`constraint-${slot.formalId}-keys`;design={keys,locks:[{...lock2,count:2},{...lock3,count:3}],group};
   budget.reserve(1,'new-full-key-configuration');
   level={...structuredClone(base.level),blocks:base.level.blocks.map(b=>({...structuredClone(b),
    ...(keys.some(k=>k.id===b.id)?{keyId:group}:{}),...(b.id===lock2.id?{lockedBy:group,lockCount:2}:b.id===lock3.id?{lockedBy:group,lockCount:3}:{})}))};
  }else{
   const compatible=base.level.gates.flatMap(g=>{const uses=original.exits.filter(e=>e.gateId===g.id),parities=new Set(uses.map(e=>e.clearedBefore%2));
    return uses.length&&parities.size===1?[{gate:structuredClone(g),initiallyOpen:[...parities][0]===0,uses}]:[];});
   assert(compatible.length>=2,'Two actual gate identities with stable exit parity required');
   const chosen=compatible.slice(0,2);design={chosen};budget.reserve(1,'new-full-flip-configuration');
   level={...structuredClone(base.level),gates:base.level.gates.filter(g=>!chosen.some(c=>c.gate.id===g.id)).map(g=>structuredClone(g)),
    flipDoors:chosen.map(c=>({...c.gate,initiallyOpen:c.initiallyOpen}))};
  }
  // All presentation metadata is assigned before the candidate is validated.
  level={...level,name:`每日挑战 · ${mechanism==='key-lock'?'钥匙与锁':'翻转门'} · 困难 ${slot.slot}`,difficulty:'hard',reward:0};
  runtime.validateLevel(level);const actual=replayAccounted(runtime,level,base.drags,budget,'actual-mechanism'),independent=independentReplay(runtime,level,base.drags);
  assert(independent.valid&&independent.complete&&!independent.failed&&independent.remainingBodies===0&&independent.remainingQueued===0);
  assert.equal(actual.nonClearingDrags,original.nonClearingDrags);assert.equal(independent.nonClearingDrags,actual.nonClearingDrags);
  const inventory=mechanismInventory(level),details=[];
  if(mechanism==='key-lock')for(const lock of design.locks){
   const event=actual.trace.find(t=>t.unlocked.includes(lock.id)),keyEvents=actual.exits.filter(e=>design.keys.some(k=>k.id===e.blockId)&&e.drag<=event?.drag);
   assert(event&&keyEvents.length===lock.count&&lock.firstAction>event.drag,'Actual lock release must precede first action and use exact keys');
   details.push({id:lock.id,count:lock.count,unlockDrag:event.drag,firstAction:lock.firstAction,keyClearDrags:keyEvents.map(e=>e.drag),active:true});
  }else for(const chosen of design.chosen){
   const uses=actual.exits.filter(e=>e.gateId===chosen.gate.id&&e.kind==='flip-door');
   const toggles=actual.trace.filter(t=>t.flipsBefore.find(g=>g.id===chosen.gate.id)?.open!==t.flipsAfter.find(g=>g.id===chosen.gate.id)?.open).length;
   assert(uses.length>0&&uses.every(e=>e.openBeforeExit===true)&&toggles>=2,'Actual gate use and phase changes required');
   details.push({id:chosen.gate.id,initiallyOpen:chosen.initiallyOpen,toggles,actualPortalExits:uses,active:true});
  }
  if(mechanism==='key-lock')assert.equal(new Set(details.map(d=>d.unlockDrag)).size,2);
  assert.equal(inventory[mechanism].length,2);assert.equal(levelSha256(base.level),input);assert.equal(routeSha256(base.drags),route);
  const audit={passed:true,mechanism,details,inventory,previousInventory:previous,actualInstances:2,priorInstances:prior.length,
   instanceIncrease:2-prior.length,numericCounters:mechanism==='key-lock'?[2,3]:null,
   allPresentMechanismsParticipate:true,realGateIdentityChecked:true,originalU:original.nonClearingDrags,U:actual.nonClearingDrags,
   designChoiceNotUserUniformQuota:true};
  return{...slot,ok:true,level,drags:structuredClone(base.drags),levelSha256:levelSha256(level),routeSha256:route,
   primaryInstances:2,addedSupport:[],targets:{mechanism,difficulty:1,instances:2,minimumCounter:mechanism==='key-lock'?2:null,designChoiceNotUserUniformQuota:true},audit,
   participation:details,design,canonicalReplay:actual,independentReplay:independent,constructionAccounting:budget.report(),
   provenance:{version:CONSTRAINT_CONSTRUCTION_VERSION,inputLevelSha256:input,inputRouteSha256:route,outputLevelSha256:levelSha256(level),outputRouteSha256:route,
    constructionAccounting:budget.report(),configurationsAttempted:1,heldSearches:0,fullBoardSearches:0,routeRepairAllowed:false},
   mathematicalAcceptance:false,formalReady:false};
 }catch(error){return{...slot,ok:false,status:'ONE_FIXED_CONSTRAINT_CONFIGURATION_REJECTED',reason:error.message,level,design,
  constructionAccounting:budget.report(),provenance:{version:CONSTRAINT_CONSTRUCTION_VERSION,inputLevelSha256:input,inputRouteSha256:route,
   configurationsAttempted:1,heldSearches:0,fullBoardSearches:0,routeRepairAllowed:false},mathematicalAcceptance:false,formalReady:false};}
}

/** Fresh verification of the fixed object's actual events; no search or
 * alternate design is attempted. Repeating its known trace is not a new U. */
export function auditRouteConstraint(runtime,level,drags,slot,priorLevel){
 assert(CONSTRAINT_STAGES.includes(slot.newestMechanism)&&slot.difficulty===1);
 const mechanism=slot.newestMechanism,budget=createCapacityConstructionBudget(),replay=replayAccounted(runtime,level,drags,budget,'verification');
 const inventory=mechanismInventory(level),priorInventory=mechanismInventory(priorLevel),instances=inventory[mechanism],prior=priorInventory[mechanism],issues=[],details=[];
 if(instances.length!==2||instances.length<=prior.length)issues.push('two-real-instances-must-increase-prior');
 if(Object.entries(inventory).some(([m,rows])=>m!==mechanism&&rows.length))issues.push('unexpected-other-mechanism');
 for(const instance of instances){
  if(mechanism==='key-lock'){
   const unlock=replay.trace.find(t=>t.unlocked.includes(instance.id)),first=replay.timings.find(t=>t.id===instance.id)?.firstAction;
   const actualKeys=replay.exits.filter(e=>instance.keys.includes(e.blockId)&&e.drag<=unlock?.drag);
   const active=!!unlock&&first>unlock.drag&&actualKeys.length===instance.value;
   details.push({...instance,active,unlockDrag:unlock?.drag,firstAction:first,actualKeyEvents:actualKeys});if(!active)issues.push('inactive-or-premature-lock');
  }else{
   const uses=replay.exits.filter(e=>e.gateId===instance.id&&e.kind==='flip-door');
   const toggles=replay.trace.filter(t=>t.flipsBefore.find(g=>g.id===instance.id)?.open!==t.flipsAfter.find(g=>g.id===instance.id)?.open).length;
   const active=uses.length>0&&uses.every(e=>e.openBeforeExit===true)&&toggles>=2;
   details.push({...instance,active,toggles,actualPortalExits:uses});if(!active)issues.push('inactive-or-closed-flip-portal');
  }
 }
 if(mechanism==='key-lock'){
  if(JSON.stringify(instances.map(x=>x.value).sort())!=='[2,3]')issues.push('fixed-two-staggered-counters-required');
  if(instances.some(x=>x.value<=Math.max(0,...prior.map(p=>p.value))))issues.push('counters-not-increased-over-prior');
  if(new Set(details.map(x=>x.unlockDrag)).size!==2)issues.push('release-events-not-distinct');
 }
 return{passed:issues.length===0,issues,mechanism,inventory,priorInventory,details,actualInstances:instances.length,priorInstances:prior.length,
  actualU:replay.nonClearingDrags,allPresentMechanismsParticipate:details.every(x=>x.active),realGateIdentityChecked:true,
  designChoiceNotUserUniformQuota:true,verificationReplay:replay,verificationAccounting:budget.report(),searchPerformed:false};
}
