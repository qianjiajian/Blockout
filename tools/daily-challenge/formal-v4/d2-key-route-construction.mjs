import assert from 'node:assert/strict';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {createCapacityConstructionBudget} from '../formal-v3/capacity-primary-adapter.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';

export const D2_KEY_CONSTRUCTION_VERSION='fixed-d2-six-keys-two-locks-5-6-known-route-once-v1';
const clone=structuredClone;
const total=inventory=>Object.values(inventory).reduce((n,items)=>n+items.length,0);

function assertSlot(slot){
 assert.equal(slot?.newestMechanism,'key-lock','Only the declared key-lock stage is reviewed');
 assert.equal(slot.difficulty,2,'Only the declared D2 plan is reviewed');
 assert.equal(slot.stageKey,'mechanisms-key-lock-59');
 assert(Number.isSafeInteger(slot.slot)&&slot.slot>=1&&slot.slot<=10);
 assert.equal(slot.formalId,`daily-mechanisms-key-lock-59-d2-${String(slot.slot).padStart(2,'0')}`);
}
function fixedConfiguration(level,configuration){
 assert(configuration&&Object.keys(configuration).every(k=>['keyBlockIds','locks'].includes(k)),'Explicit fixed configuration required');
 const {keyBlockIds,locks}=configuration;
 assert(Array.isArray(keyBlockIds)&&keyBlockIds.length===6,'Exactly six declared key bodies required');
 assert(Array.isArray(locks)&&locks.length===2,'Exactly two declared locks required');
 assert.deepEqual(locks.map(l=>l.count),[5,6],'Declared lock counters must be exactly 5 and 6');
 assert(locks.every(l=>Object.keys(l).length===2&&Object.hasOwn(l,'id')&&Object.hasOwn(l,'count')));
 const ids=[...keyBlockIds,...locks.map(l=>l.id)];
 assert(ids.every(id=>typeof id==='string'&&id.length>0)&&new Set(ids).size===8,'Keys and locks must be distinct real bodies');
 assert(ids.every(id=>level.blocks.some(b=>b.id===id)),'Declared body is absent from the complete inventory');
 return clone({keyBlockIds,locks});
}
function validateRoute(drags){
 assert(Array.isArray(drags)&&drags.length>0,'One nonempty complete known route required');
 for(const d of drags){
  assert(d&&Object.keys(d).every(k=>['blockId','path','exitSide'].includes(k))&&typeof d.blockId==='string'&&Array.isArray(d.path));
  assert(d.path.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)),'Unit coordinates must be finite integers');
  assert(d.exitSide===undefined||['left','right','top','bottom'].includes(d.exitSide));
 }
}
function priorFacts(priorLevel){
 const inventory=mechanismInventory(priorLevel),locks=inventory['key-lock'];
 assert(locks.length>=1&&locks.length<2,'The exact old slot must have fewer than two real locks');
 assert(locks.every(l=>Number.isSafeInteger(l.value)&&l.value>=1&&l.value<5),'Both proposed counters must exceed the old maximum');
 assert(total(inventory)<2,'Two real new lock instances must also exceed the old total mechanism count');
 return{inventory,locks,total:total(inventory)};
}
function chargedReplay(runtime,level,drags,budget,kind){
 // Reserve before model creation and before each possible mutation. Duplicates
 // are deliberately included. No per-body, per-key or replay budget reset.
 budget.reserve(1,`${kind}-initial`);
 const model=new runtime.PuzzleModel(level);model.startCountdown();
 const trace=[],exits=[],firstAction=new Map(),initial=model.snapshot();
 for(const [i,d]of drags.entries()){
  // beginAction + each move + tryExit + commit + possible exit completion.
  budget.reserve(d.path.length+2+2*Number(!!d.exitSide),`${kind}-unit-exit-commit`);
  const before=model.snapshot();assert(model.getBlock(d.blockId),'Route names a missing body');
  if(!firstAction.has(d.blockId))firstAction.set(d.blockId,i+1);
  const nativeTry=model.tryExit,events=[];
  model.tryExit=function(id,side){
   const state=this.snapshot(),body=this.getBlock(id),result=nativeTry.call(this,id,side);
   if(result.ok){const gate=state.gates.find(g=>g.id===result.gateId);assert(gate,'Actual ordinary physical portal required');
    events.push({drag:i+1,blockId:id,gateId:result.gateId,side,keyId:body?.keyId??null,clearedBefore:state.cleared});}
   return result;
  };
  try{applyNativeDrag(model,d);}finally{model.tryExit=nativeTry;}
  const after=model.snapshot(),clearDelta=after.cleared-before.cleared;
  assert.equal(after.moves,before.moves+1,'Every given drag must commit once');
  assert.equal(events.length,Number(!!d.exitSide));assert.equal(clearDelta,Number(!!d.exitSide),'Single-layer full-body clears only');
  const unlocked=before.blocks.filter(b=>b.lockedBy&&after.blocks.some(a=>a.id===b.id&&!a.lockedBy)).map(b=>b.id);
  trace.push({drag:i+1,blockId:d.blockId,clearDelta,unlocked,
   lockCountsBefore:before.blocks.filter(b=>b.lockedBy).map(b=>({id:b.id,group:b.lockedBy,count:b.lockCount})),
   lockCountsAfter:after.blocks.filter(b=>b.lockedBy).map(b=>({id:b.id,group:b.lockedBy,count:b.lockCount})),
   stateSha256:levelSha256(after)});
  exits.push(...events);
 }
 const final=model.snapshot();assert(final.complete&&!final.failed&&!final.blocks.length&&!final.queuedBlocks.length,'Entire exact inventory must clear');
 return{valid:true,complete:true,nonClearingDrags:trace.filter(t=>!t.clearDelta).length,effectiveDrags:drags.length,
  clearEvents:exits.length,initial,final,trace,exits,firstActions:[...firstAction].map(([id,drag])=>({id,drag}))};
}
function independentAccounted(runtime,level,drags,budget){
 // independentReplay uses deferred exits, including completeExitAnimation.
 // Conservatively reserve its entire fixed trace before it is instantiated.
 budget.reserve(1+drags.reduce((n,d)=>n+d.path.length+2+2*Number(!!d.exitSide),0),'independent-complete-known-route');
 const out=independentReplay(runtime,level,drags);
 assert(out.valid&&out.complete&&!out.failed&&out.remainingBodies===0&&out.remainingQueued===0,out.error??'Independent original replay failed');
 return out;
}
function assertKeyDomain(level,configuration,group){
 const plain=clone(level);
 for(const b of plain.blocks){delete b.keyId;delete b.lockedBy;delete b.lockCount;}
 assertPlainProofDomain(plain);
 const keys=level.blocks.filter(b=>b.keyId!==undefined),locks=level.blocks.filter(b=>b.lockedBy!==undefined||b.lockCount!==undefined);
 assert.deepEqual(keys.map(b=>b.id).sort(),[...configuration.keyBlockIds].sort(),'Exact six keys, no untracked key bodies');
 assert(keys.every(b=>b.keyId===group),'Every actual key must belong to the declared lock group');
 assert.deepEqual(locks.map(b=>b.id).sort(),configuration.locks.map(l=>l.id).sort(),'Exact two declared locks');
 for(const expected of configuration.locks){const b=locks.find(b=>b.id===expected.id);
  assert.equal(b.lockedBy,group);assert.equal(b.lockCount,expected.count,'Actual initial lock count changed');}
}
function actualStrength(level,replay,configuration,prior,group){
 assertKeyDomain(level,configuration,group);
 assert.deepEqual(replay.exits.slice(0,6).map(e=>e.blockId),configuration.keyBlockIds,'The fixed six keys must really clear first and in declared order');
 const inventory=mechanismInventory(level),details=[];
 for(const lock of configuration.locks){
  const event=replay.trace.find(t=>t.unlocked.includes(lock.id)),first=replay.firstActions.find(t=>t.id===lock.id)?.drag;
  const keyEvents=replay.exits.filter(e=>e.keyId===group&&e.drag<=event?.drag);
  assert(event&&Number.isSafeInteger(first)&&first>event.drag,'Actual release must precede the locked body first action');
  assert.equal(keyEvents.length,lock.count,'Actual key event count must equal the declared release threshold');
  assert.deepEqual(keyEvents.map(e=>e.blockId),configuration.keyBlockIds.slice(0,lock.count));
  details.push({id:lock.id,count:lock.count,value:lock.count,unlockDrag:event.drag,firstAction:first,actualKeyEvents:keyEvents,active:true});
 }
 assert.equal(new Set(details.map(d=>d.unlockDrag)).size,2,'Locks must release at distinct real events');
 assert.equal(inventory['key-lock'].length,2);assert.equal(total(inventory),2);
 return{passed:true,issues:[],mechanism:'key-lock',inventory,priorInventory:prior.inventory,details,
  actualInstances:2,priorInstances:prior.locks.length,instanceIncrease:2-prior.locks.length,
  actualKeyBodies:6,actualCounters:[5,6],actualU:replay.nonClearingDrags,allPresentMechanismsParticipate:true,
  realGateIdentityChecked:true,designChoiceNotUserUniformQuota:true,
  priorComparison:{priorInventory:prior.inventory,currentInventory:inventory,previousTotal:prior.total,currentTotal:2,
   instanceIncrease:2-prior.total,previousCounters:prior.locks.map(l=>l.value),currentCounters:[5,6]}};
}

/** One explicit D2 configuration and the original known route, no repair,
 * alternative key selection, held search, full-board search or ledger write. */
export function constructD2KeyRoute(runtime,base,slot,priorLevel,{configuration,worldBudget}={}){
 assertSlot(slot);assertPlainProofDomain(base.level);validateRoute(base.drags);
 const design=fixedConfiguration(base.level,configuration),prior=priorFacts(priorLevel);
 const budget=createCapacityConstructionBudget(worldBudget),input=levelSha256(base.level),route=routeSha256(base.drags);
 const group=`d2-key-${slot.formalId}`;let level=null;
 const provenance=()=>({version:D2_KEY_CONSTRUCTION_VERSION,inputLevelSha256:input,inputRouteSha256:route,
  ...(level?{outputLevelSha256:levelSha256(level),outputRouteSha256:route}:{}),configuration:design,
  constructionAccounting:budget.report(),configurationsAttempted:1,heldSearches:0,fullBoardSearches:0,
  routeRepairAllowed:false,budgetIncludesOriginalCanonicalActualCanonicalAndActualIndependent:true});
 try{
  const original=chargedReplay(runtime,base.level,base.drags,budget,'original');
  assert.deepEqual(original.exits.slice(0,6).map(e=>e.blockId),design.keyBlockIds,'Fixed keys differ from the first six actual clear events');
  for(const lock of design.locks){const first=original.firstActions.find(a=>a.id===lock.id)?.drag;
   assert(first>original.exits[lock.count-1].drag,'Original fixed route moves the lock before its planned release');}
  budget.reserve(1,'one-full-key-configuration');
  level={...clone(base.level),name:`每日挑战 · 钥匙与锁 · 超难 ${slot.slot}`,difficulty:'super',reward:0,
   blocks:base.level.blocks.map(b=>{const l=design.locks.find(l=>l.id===b.id);return{...clone(b),
    ...(design.keyBlockIds.includes(b.id)?{keyId:group}:{}),...(l?{lockedBy:group,lockCount:l.count}:{})};})};
  runtime.validateLevel(level);assertKeyDomain(level,design,group);
  const actual=chargedReplay(runtime,level,base.drags,budget,'actual'),independent=independentAccounted(runtime,level,base.drags,budget);
  assert.equal(actual.nonClearingDrags,original.nonClearingDrags);assert.equal(independent.nonClearingDrags,actual.nonClearingDrags);
  const audit=actualStrength(level,actual,design,prior,group);
  assert.equal(levelSha256(base.level),input);assert.equal(routeSha256(base.drags),route);
  return{...clone(slot),sourceLevelId:base.sourceLevelId,ok:true,level,drags:clone(base.drags),levelSha256:levelSha256(level),routeSha256:route,
   primaryInstances:2,addedSupport:[],configuration:design,targets:{mechanism:'key-lock',difficulty:2,instances:2,keyBodies:6,counters:[5,6],minimumCounter:5,designChoiceNotUserUniformQuota:true},
   audit,participation:audit.details,canonicalReplay:actual,independentReplay:independent,originalReplay:original,
   constructionAccounting:budget.report(),provenance:provenance(),mathematicalAcceptance:false,formalReady:false};
 }catch(error){return{...clone(slot),sourceLevelId:base.sourceLevelId,ok:false,status:'FIXED_D2_KEY_CONFIGURATION_REJECTED',reason:error.message,
  budgetExhausted:error.capacityBudgetExhausted===true,level,configuration:design,constructionAccounting:budget.report(),provenance:provenance(),
  mathematicalAcceptance:false,formalReady:false};}
}

/** Fresh audit of the one given object and witness. It cannot adapt a level or
 * switch configuration after a failed construction. No mathematical L claim. */
export function auditD2KeyRoute(runtime,level,drags,slot,priorLevel,{configuration,worldBudget}={}){
 assertSlot(slot);validateRoute(drags);const design=fixedConfiguration(level,configuration),prior=priorFacts(priorLevel);
 const group=`d2-key-${slot.formalId}`;assertKeyDomain(level,design,group);runtime.validateLevel(level);
 const budget=createCapacityConstructionBudget(worldBudget),replay=chargedReplay(runtime,level,drags,budget,'verification');
 const audit=actualStrength(level,replay,design,prior,group),independent=independentAccounted(runtime,level,drags,budget);
 assert.equal(independent.nonClearingDrags,replay.nonClearingDrags);
 return{...audit,verificationReplay:replay,independentReplay:independent,verificationAccounting:budget.report(),
  inputLevelSha256:levelSha256(level),inputRouteSha256:routeSha256(drags),searchPerformed:false,mathematicalAcceptance:false,formalReady:false};
}
