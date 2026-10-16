/** New U engine only. The frozen native gesture loop has an independently
 * bound 120s ceiling. Old lower mathematics and its 30s ceiling are unchanged.
 * The companion wrapper owns the original input's single public claim. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {FROZEN_PROOF_SHA,reservedGuardBudget} from '../formal-v3/reserved-guard-budget.mjs';
import {auditPlainForwardDrag} from '../formal-v3/reverse-route-audit.mjs';

export const NATIVE120_UPPER_VERSION='rectangle-native-u-independent-wall120-v1';
const own='tools/daily-challenge/formal-v4/native-120-upper.mjs';
export const NATIVE120_ENGINE_BINDING=Object.freeze({version:NATIVE120_UPPER_VERSION,tool:{path:own,
 sha256:createHash('sha256').update(fs.readFileSync(own)).digest('hex')},
 derivedFrom:{path:'tools/daily-challenge/formal-v3/bounded-proof.mjs',sha256:'ebf6522ed5a6c8b3c5bc4e217a8026f68f05894cc07ebc54f190efc941360054',function:'boundedUpperSearch'},
 lowerToolchainSha256:FROZEN_PROOF_SHA,
 originalLoopSemantics:'same native priority, labelled snapshot, held first contact, coordinates and real exits; rectangle domain; witness deadline checked before and after replay'});
const ceilings={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:120000};
export function native120Budget(input={}){
 const result={...ceilings,...input};
 for(const[k,v]of Object.entries(result))assert(k in ceilings&&Number.isSafeInteger(v)&&v>=1&&v<=ceilings[k],`Invalid native120 budget ${k}: ${v}`);
 return result;
}
export function reservedNative120Budget(input={}){
 const budget=native120Budget({maxStates:9999,...input});assert(budget.maxStates<=9999,'Reserve terminal world; native registered cap <=9999');return budget;
}
export function assertNative120RectangleDomain(level){
 assertPlainProofDomain(level);
 for(const gate of level.gates)for(const k of Object.keys(gate))assert(['id','side','offset','size','color','portals','frozen','star'].includes(k),'Unknown plain gate field');
 for(const b of level.blocks){const w=Math.max(...b.shape.map(p=>p[0]))+1,h=Math.max(...b.shape.map(p=>p[1]))+1;
  assert.equal(new Set(b.shape.map(p=>p.join(','))).size,w*h,'Native120 stock requires solid original-orientation rectangles');}
}
export function native120GuardAllowanceFor(result){
 const budget=reservedNative120Budget(result.budget);
 assert(Number.isSafeInteger(result.rawFullBoardStates)&&result.rawFullBoardStates>=0&&result.rawFullBoardStates<=budget.maxStates);
 assert.equal(result.discoveredStates,result.rawFullBoardStates);assert.equal(result.visitedStates,result.rawFullBoardStates);
 assert(Number.isSafeInteger(result.rawExploredStates)&&result.rawExploredStates>=0&&result.rawExploredStates<=result.rawFullBoardStates);
 assert.equal(result.exploredStates,result.rawExploredStates);
 return{version:'native120-raw-set-plus-one-terminal-world-v1',upperEngine:NATIVE120_ENGINE_BINDING,
  registeredRawSetStates:result.rawFullBoardStates,registeredExpandedStates:result.rawExploredStates,registeredSetBudget:budget.maxStates,
  unregisteredTerminalWorldAllowance:1,conservativeFullBoardStateUpperBound:result.rawFullBoardStates+1,hardWholeBoardLimit:10000,
  exactFullBoardVisitedCountClaimed:false,terminalBehavior:'first-unregistered-world-throws-and-immediately-returns-no-recovery-or-continuation'};
}
export function guardedNative120Upper(runtime,level,budget={}){
 const result=native120UpperSearch(runtime,level,budget);return{...result,guardAllowance:native120GuardAllowanceFor(result)};
}

// BEGIN DERIVED NATIVE LOOP -- the qualification compares every source byte
// after the four declared substitutions with frozen boundedUpperSearch.
export function native120UpperSearch(runtime,level,requested={}){
  assert.equal(runtime.toolchainSha256,FROZEN_PROOF_SHA);assertNative120RectangleDomain(level);
  const budget=reservedNative120Budget(requested),started=Date.now(),counts={discoveredStates:0,exploredStates:0,attemptedTransitions:0,microDiscoveredStates:0,microExploredStates:0};
  const out=(status,termination,extra={})=>({upperEngine:NATIVE120_ENGINE_BINDING,status,termination,witnessFound:status==='witness',budget,...counts,visitedStates:counts.discoveredStates,
    rawFullBoardStates:counts.discoveredStates,rawExploredStates:counts.exploredStates,
    fullBoardStateDefinition:'distinct labelled complete committed PuzzleModel snapshots except move score; no quotient or clear closure',
    elapsedMilliseconds:Date.now()-started,sourceLevelSha256:levelSha256(level),lowerBoundCertified:false,drags:[],...extra});
  // A unit held step can immediately reveal a lift or dispense a move-fed
  // queue head. Those are whole-world changes, not exempt coordinate BFS.
  // Until this constructive search accounts for them in its board budget,
  // require a provided route; the separate fresh replay/lower path remains.
  if(level.generators?.length||level.shutters?.some(s=>s.skin==='lift')||level.elevators?.length||level.conveyors?.length)
    return out('unsupported','held-world-mutation-requires-provided-route');
  if(level.blocks.some(b=>b.timedBombSeconds!==undefined))return out('unsupported','explicit-timed-route-required');
  const stop=reason=>{const e=Error(reason);e.budgetStop=true;throw e;};
  const guard=()=>{if(Date.now()-started>=budget.maxMilliseconds)stop('deadline');};
  const spend=()=>{guard();if(counts.attemptedTransitions>=budget.maxTransitions)stop('max-transitions');counts.attemptedTransitions++;};
  const micro=()=>{guard();if(counts.microDiscoveredStates>=budget.maxMicroStates)stop('max-micro-states');counts.microDiscoveredStates++;};
  const stateKey=model=>{const {moves,...snapshot}=model.snapshot();return JSON.stringify(snapshot);};
  const layers=model=>{const s=model.snapshot();return[...s.blocks,...s.queuedBlocks].reduce((n,b)=>n+b.layers.length,0);};
  try{
    runtime.validateLevel(level);const initial=new runtime.PuzzleModel(structuredClone(level));initial.startCountdown();
    const nodes=[{model:initial,parent:-1,depth:0,remaining:layers(initial)}],open=[0],seen=new Set([stateKey(initial)]);counts.discoveredStates=1;
    const routeTo=index=>{const route=[];while(nodes[index].parent>=0){route.push(nodes[index].drag);index=nodes[index].parent;}return route.reverse();};
    const witness=drags=>{guard();const replay=runtime.replayRevisedRoute(level,drags);guard();return replay.valid&&replay.complete?out('witness','witness',{drags,replay}):out('invalid','fresh-replay-rejected',{replay});};
    if(initial.snapshot().complete)return witness([]);
    let found;
    const enqueue=(parent,drag)=>{
      const model=nodes[parent].model.clone();model.beginAction();
      for(const point of drag.path){spend();if(!model.moveBlockStep(drag.blockId,...point))throw Error('Upper gesture replay rejected unit move');}
      if(drag.exitSide){spend();if(!model.tryExit(drag.blockId,drag.exitSide).ok)throw Error('Upper gesture replay rejected exit');}
      if(!model.commitAction())throw Error('Upper gesture had no effective commit');
      const key=stateKey(model);if(seen.has(key))return;
      if(counts.discoveredStates>=budget.maxStates)stop('max-states');seen.add(key);counts.discoveredStates++;
      if(model.snapshot().complete){found=[...routeTo(parent),drag];return;}
      nodes.push({model,parent,drag,depth:nodes[parent].depth+1,remaining:layers(model)});open.push(nodes.length-1);
    };
    while(open.length){
      guard();let best=0;for(let i=1;i<open.length;i++){const a=nodes[open[i]],b=nodes[open[best]];if(a.remaining<b.remaining||a.remaining===b.remaining&&a.depth<b.depth)best=i;}
      const parent=open.splice(best,1)[0],source=nodes[parent].model;
      if(counts.exploredStates>=budget.maxStates)stop('max-expanded-states');counts.exploredStates++;
      for(const selected of source.snapshot().blocks){
        if(!source.isBlockActive(selected))continue;
        const inner=[{model:source,path:[]}],innerSeen=new Set([stateKey(source)]);micro();
        for(let cursor=0;cursor<inner.length;cursor++){
          guard();counts.microExploredStates++;const current=inner[cursor],held=current.model.getBlock(selected.id);if(!held)continue;
          const previous=current.path.length>1?current.path.at(-2):current.path.length?[selected.x,selected.y]:undefined;
          spend();const automatic=canonicalExit(runtime,current.model,selected.id,previous);
          if(automatic){enqueue(parent,{blockId:selected.id,path:current.path,exitSide:automatic});if(found)return witness(found);continue;}
          if(current.path.length)enqueue(parent,{blockId:selected.id,path:current.path});
          for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
            spend();const model=current.model.clone();model.beginAction();const target=[held.x+dx,held.y+dy];if(!model.moveBlockStep(selected.id,...target))continue;
            const key=stateKey(model);if(innerSeen.has(key))continue;
            if(innerSeen.size>=budget.maxDragStates)stop('max-drag-states');micro();innerSeen.add(key);inner.push({model,path:[...current.path,target]});
          }
        }
      }
    }return out('unknown','search-exhausted');
  }catch(error){return out(error.budgetStop?'unknown':'invalid',error.message,{reason:error.message});}
}
// END DERIVED NATIVE LOOP

const clone=structuredClone;
function apply(level,drag){
 const next=clone(level),body=next.blocks.find(b=>b.id===drag.blockId);assert(body,'Missing prefix body');
 if(drag.path.length)Object.assign(body,{x:drag.path.at(-1)[0],y:drag.path.at(-1)[1]});
 if(drag.exitSide)next.blocks=next.blocks.filter(b=>b.id!==drag.blockId);return next;
}
export function native120PrefixTailPlan(level,prefixDrags,{upperBudget={},lowerBudget={},floor=31}={}){
 assertNative120RectangleDomain(level);assert(Array.isArray(prefixDrags)&&prefixDrags.length>0);
 assert(Number.isSafeInteger(floor)&&floor>=1&&floor<=31);
 const total=native120Budget(upperBudget),prefixBoardCharge=prefixDrags.length+1;
 const rawRemainder=Math.min(9999,total.maxStates-prefixBoardCharge-1);
 assert(rawRemainder>=1,'No board budget after prefix and terminal reserve');
 return{version:NATIVE120_UPPER_VERSION,upperEngine:NATIVE120_ENGINE_BINDING,levelSha256:levelSha256(level),prefixSha256:routeSha256(prefixDrags),floor,
  fullUpperBudget:total,prefixBoardCharge,tailBudget:reservedNative120Budget({...total,maxStates:rawRemainder}),
  lowerBudget:reservedGuardBudget(lowerBudget),tailStrategy:'native',routeStrategy:'fixed-prefix-then-one-native120',
  unknownPolicy:'finish-failed-and-block-original-input; no alternative prefix, method, continuation or retry'};
}
/** One supplied prefix and one native tail. End-of-replay clock checks reject
 * late witnesses. Search clocks do not certify natural game time or Pointer. */
export function constructNative120PrefixTailUpper(runtime,level,prefixDrags,{plan=native120PrefixTailPlan(level,prefixDrags)}={}){
 assert.equal(runtime.toolchainSha256,FROZEN_PROOF_SHA);assertNative120RectangleDomain(level);
 assert.deepEqual(plan,native120PrefixTailPlan(level,prefixDrags,{upperBudget:plan.fullUpperBudget,lowerBudget:plan.lowerBudget,floor:plan.floor}),'Declared plan changed');
 const started=Date.now(),report={version:NATIVE120_UPPER_VERSION,upperEngine:NATIVE120_ENGINE_BINDING,valid:false,complete:false,lowerBoundClaimed:false,
  levelSha256:plan.levelSha256,prefixSha256:plan.prefixSha256,plan,prefixAudits:[],tailSearches:0,tailSearch:null,
  prefixCommittedWorldUpperBound:1,conservativeFullBoardStateUpperBound:1,exactFullBoardVisitedCountClaimed:false,U:null,drags:[],naturalTimeValidated:false};
 const guard=()=>assert(Date.now()-started<plan.fullUpperBudget.maxMilliseconds,'shared-upper-deadline');
 try{
  guard();runtime.validateLevel(level);let current=clone(level),prefixTransitions=0;
  for(const[index,drag]of prefixDrags.entries()){
   guard();assert(drag&&Array.isArray(drag.path),'Invalid fixed prefix drag');
   prefixTransitions+=drag.path.length+1;assert(prefixTransitions<plan.tailBudget.maxTransitions,'prefix-transition-budget');
   const next=apply(current,drag),audit=auditPlainForwardDrag(runtime,current,drag,{expectedBodies:next.blocks});
   report.prefixCommittedWorldUpperBound=index+2;report.conservativeFullBoardStateUpperBound=index+2;
   report.prefixAudits.push({index,...audit});assert(audit.valid,`prefix-replay:${audit.error}`);current=next;guard();
  }
  report.prefixTransitions=prefixTransitions;report.tailLevel=clone(current);report.tailLevelSha256=levelSha256(current);
  let tailDrags=[];
  if(current.blocks.length){
   guard();const remainingMs=plan.tailBudget.maxMilliseconds-(Date.now()-started);assert(remainingMs>=1,'prefix-deadline');
   const actualTailBudget={...plan.tailBudget,maxTransitions:plan.tailBudget.maxTransitions-prefixTransitions,maxMilliseconds:remainingMs};
   report.tailSearches=1;report.tailSearch=guardedNative120Upper(runtime,current,actualTailBudget);
   report.conservativeFullBoardStateUpperBound=plan.prefixBoardCharge+report.tailSearch.guardAllowance.conservativeFullBoardStateUpperBound;
   assert(report.conservativeFullBoardStateUpperBound<=plan.fullUpperBudget.maxStates);
   assert(report.tailSearch.witnessFound,'tail-'+report.tailSearch.termination);tailDrags=report.tailSearch.drags;guard();
  }
  const drags=[...clone(prefixDrags),...clone(tailDrags)],canonical=runtime.replayRevisedRoute(level,drags);guard();
  const independent=independentReplay(runtime,level,drags);guard();report.canonical=canonical;report.independent=independent;
  assert(canonical.valid&&canonical.complete&&!canonical.failed&&independent.valid&&independent.complete&&!independent.failed,'Original concatenated route failed actual double replay');
  assert.equal(canonical.clearEvents,level.blocks.length);assert.equal(independent.clearEvents,level.blocks.length);
  assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(canonical.effectiveDrags,independent.effectiveDrags);
  return{...report,status:'COMPLETE_ORIGINAL_UPPER_WITNESS',valid:true,complete:true,drags,routeSha256:routeSha256(drags),U:independent.nonClearingDrags,elapsedMilliseconds:Date.now()-started};
 }catch(error){return{...report,status:'UPPER_UNKNOWN',reason:error.message,elapsedMilliseconds:Date.now()-started};}
}
