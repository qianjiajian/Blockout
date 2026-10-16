import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boundedBudget,createAttemptLedger} from './bounded-proof.mjs';
import {guardedNativeUpper,guardedPlainTask,reservedGuardBudget,FROZEN_PROOF_SHA} from './reserved-guard-budget.mjs';
import {auditPlainForwardDrag} from './reverse-route-audit.mjs';
import {boardCells} from './diversity-layout-factory.mjs';

export const PREFIX_TAIL_VERSION='fixed-plain-prefix-one-declared-tail-v2';
const own='tools/daily-challenge/formal-v3/design-prefix-tail-upper-v2.mjs';
const binding={path:own,sha256:createHash('sha256').update(fs.readFileSync(own)).digest('hex')};
export const PREFIX_TAIL_BINDINGS=Object.fromEntries([own,'tools/daily-challenge/formal-v3/reserved-guard-budget.mjs',
 'tools/daily-challenge/formal-v3/reverse-route-audit.mjs'].map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const clone=structuredClone;
function plain(level){
 assertPlainProofDomain(level);
 // The plain proof checker already excludes active mechanisms. Reject unknown
 // gate fields too: resetting the tail must not erase unmodelled progress.
 for(const gate of level.gates)for(const key of Object.keys(gate))
  assert(['id','side','offset','size','color','portals','frozen','star'].includes(key),'Unknown plain gate field');
}
function apply(level,drag){
 const next=clone(level),body=next.blocks.find(b=>b.id===drag.blockId);assert(body,'Missing prefix body');
 if(drag.path.length)Object.assign(body,{x:drag.path.at(-1)[0],y:drag.path.at(-1)[1]});
 if(drag.exitSide)next.blocks=next.blocks.filter(b=>b.id!==drag.blockId);
 return next;
}

/** Recover every unit point for ONE already selected parent chain. The only
 * BFS is a selected body's coordinates with all other bodies fixed; no alternate
 * board node, colour, exit or parent chain is attempted. Actual first-contact
 * legality is checked later, and failure never chooses a different micro path. */
export function recoverVacancyPrefix(runtime,level,geometry,{targetNodeIndex,exitBlockId,exitSide,openingExitSide,
 maxMicroStates=100000,maxTransitions=1000000,maxMilliseconds=5000}={}){
 plain(level);runtime.validateLevel(level);
 boundedBudget({maxMicroStates,maxTransitions,maxMilliseconds});
 const started=Date.now(),queue=geometry.result.queue,stock=geometry.built.blocks;
 assert(stock[0]?.id==='opening'&&level.blocks[0]?.id==='opening','Opening body must be first');
 assert.deepEqual(stock.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape})),level.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape})),'Geometry belongs to a different full stock');
 assert(Number.isSafeInteger(targetNodeIndex)&&targetNodeIndex>=0&&targetNodeIndex<queue.length);
 assert(['top','right','bottom','left'].includes(exitSide)&&['top','right','bottom','left'].includes(openingExitSide));
 const chain=[];let at=targetNodeIndex;
 while(at>0){const node=queue[at];assert(Number.isSafeInteger(node.parent)&&node.parent>=0&&node.parent<at,'Invalid/cyclic parent');
  assert.equal(node.depth,queue[node.parent].depth+1);chain.push(at);at=node.parent;assert(chain.length<9997,'Fixed prefix exceeds whole-board allowance');}
 assert.equal(queue[0].parent,-1);assert.equal(queue[0].depth,0);chain.reverse();
 const current=clone(level.blocks.slice(1)),legal=new Set(boardCells(level).map(p=>p.join(',')));
 assert.deepEqual(queue[0].positions,current.map(b=>[b.x,b.y]));
 const drags=[{blockId:'opening',path:[],exitSide:openingExitSide}];let microDiscoveredStates=0,attemptedTransitions=0;
 const guard=()=>assert(Date.now()-started<maxMilliseconds,'prefix-recovery-deadline');
 const micro=()=>{guard();assert(microDiscoveredStates<maxMicroStates,'prefix-recovery-micro-budget');microDiscoveredStates++;};
 for(const index of chain){
  const node=queue[index],move=node.move,body=current.find(b=>b.id===move?.blockId);assert(body,'Unknown chain body');
  assert.deepEqual(move.from,[body.x,body.y]);assert.deepEqual(queue[node.parent].positions,current.map(b=>[b.x,b.y]));
  const blockers=new Set(current.filter(b=>b.id!==body.id).flatMap(b=>b.shape.map(([dx,dy])=>`${b.x+dx},${b.y+dy}`)));
  const start=[body.x,body.y],points=[start],parents=new Map([[start.join(','),null]]);micro();
  for(let cursor=0;cursor<points.length&&!parents.has(move.to.join(','));cursor++)for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
   guard();assert(attemptedTransitions<maxTransitions,'prefix-recovery-transition-budget');attemptedTransitions++;
   const p=[points[cursor][0]+dx,points[cursor][1]+dy],key=p.join(',');
   if(parents.has(key)||!body.shape.every(([sx,sy])=>legal.has(`${p[0]+sx},${p[1]+sy}`)&&!blockers.has(`${p[0]+sx},${p[1]+sy}`)))continue;
   micro();parents.set(key,points[cursor]);points.push(p);
  }
  assert(parents.has(move.to.join(',')),'Fixed chain endpoint has no held path');
  const path=[];let p=move.to;
  while(parents.get(p.join(','))!==null){path.push(p);p=parents.get(p.join(','));}
  path.reverse();assert(path.length,'Parent edge must change a body');Object.assign(body,{x:move.to[0],y:move.to[1]});
  assert.deepEqual(node.positions,current.map(b=>[b.x,b.y]),'Parent edge changed more than its selected body');
  drags.push({blockId:body.id,path});
 }
 assert(current.some(b=>b.id===exitBlockId),'Missing intended second clear');
 if(drags.length>1&&drags.at(-1).blockId===exitBlockId)drags.at(-1).exitSide=exitSide;
 else drags.push({blockId:exitBlockId,path:[],exitSide});
 return{drags,accounting:{version:'fixed-parent-chain-coordinate-recovery-v1',routeSha256:routeSha256(drags),geometrySha256:levelSha256(geometry),
  chainIndices:chain,microDiscoveredStates,attemptedTransitions,elapsedMilliseconds:Date.now()-started,
  completeBoardBranchSearches:0,fixedPrefixCommittedWorldUpperBound:drags.length+1,actualRouteValidated:false}};
}

/** Fix the method, full input and both budgets BEFORE the original-object
 * public ledger claim. The prefix is a supplied witness, never a second board
 * search. Its every committed board is conservatively charged even if repeated.
 * The duplicated tail initial world is intentionally not subtracted. */
export function prefixTailPlan(level,prefixDrags,{upperBudget={},lowerBudget={},floor=31,prefixRecovery=null,tailStrategy='native',searchUpper=128}={}){
 plain(level);assert(Array.isArray(prefixDrags)&&prefixDrags.length>0,'A nonempty fixed prefix is required');
 assert(['native','plain-joint'].includes(tailStrategy),'Unknown predeclared tail strategy');
 assert(Number.isSafeInteger(searchUpper)&&searchUpper>=1&&searchUpper<=256,'Invalid finite tail searchUpper');
 if(tailStrategy==='plain-joint')for(const b of level.blocks){
  const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));
  assert(new Set(b.shape.map(p=>p.join(','))).size===w*h,'Plain tail construction requires solid rectangular bodies');
 }

 assert(Number.isSafeInteger(floor)&&floor>=1&&floor<=256,'Invalid floor');
 const total=boundedBudget(upperBudget),prefixBoardCharge=prefixDrags.length+1;
 if(prefixRecovery){
  assert.equal(prefixRecovery.version,'fixed-parent-chain-coordinate-recovery-v1');assert.equal(prefixRecovery.routeSha256,routeSha256(prefixDrags));
  for(const key of ['microDiscoveredStates','attemptedTransitions','elapsedMilliseconds'])assert(Number.isSafeInteger(prefixRecovery[key])&&prefixRecovery[key]>=0);
  assert.equal(prefixRecovery.completeBoardBranchSearches,0);assert.equal(prefixRecovery.fixedPrefixCommittedWorldUpperBound,prefixBoardCharge);
 }
 const resources={maxMicroStates:total.maxMicroStates-(prefixRecovery?.microDiscoveredStates??0),
  maxTransitions:total.maxTransitions-(prefixRecovery?.attemptedTransitions??0),maxMilliseconds:total.maxMilliseconds-(prefixRecovery?.elapsedMilliseconds??0)};
 const rawRemainder=Math.min(9999,total.maxStates-prefixBoardCharge-1);
 assert(rawRemainder>=1,'No board budget remains after prefix and terminal guard reserve');
 return{version:PREFIX_TAIL_VERSION,tool:binding,toolBindings:PREFIX_TAIL_BINDINGS,levelSha256:levelSha256(level),prefixSha256:routeSha256(prefixDrags),floor,
  fullUpperBudget:total,prefixBoardCharge,prefixRecovery:clone(prefixRecovery),tailBudget:reservedGuardBudget({...total,...resources,maxStates:rawRemainder}),
  lowerBudget:reservedGuardBudget(lowerBudget),tailStrategy,searchUpper,routeStrategy:'fixed-prefix-then-one-'+tailStrategy,lowerStrategy:'original-full-plain-floor',
  unknownPolicy:'finish-failed-and-block-original-input; no alternative prefix, tail method, continuation or retry'};
}

/** A constructive U subtask only. The caller MUST hold the original input's
 * public attempt; the async exploration wrapper below owns that discipline.
 * Accepts unit-step held paths, including turns. No alternate prefix is tried. */
export function constructPrefixTailUpper(runtime,level,prefixDrags,{plan=prefixTailPlan(level,prefixDrags)}={}){
 assert.equal(runtime.toolchainSha256,FROZEN_PROOF_SHA);plain(level);
 assert.equal(plan.levelSha256,levelSha256(level));assert.equal(plan.prefixSha256,routeSha256(prefixDrags));
 const expected=prefixTailPlan(level,prefixDrags,{upperBudget:plan.fullUpperBudget,lowerBudget:plan.lowerBudget,floor:plan.floor,prefixRecovery:plan.prefixRecovery,tailStrategy:plan.tailStrategy,searchUpper:plan.searchUpper});
 assert.deepEqual(plan,expected,'The declared search plan cannot be changed after claim');
 const started=Date.now(),report={version:PREFIX_TAIL_VERSION,valid:false,complete:false,lowerBoundClaimed:false,
  levelSha256:plan.levelSha256,prefixSha256:plan.prefixSha256,plan,prefixAudits:[],tailSearches:0,tailSearch:null,
  prefixCommittedWorldUpperBound:1,conservativeFullBoardStateUpperBound:1,exactFullBoardVisitedCountClaimed:false,
  U:null,drags:[],naturalTimeValidated:false};
 try{
  runtime.validateLevel(level);let current=clone(level),prefixTransitions=0;
  for(const [index,drag]of prefixDrags.entries()){
   assert(Date.now()-started<plan.tailBudget.maxMilliseconds,'prefix-deadline');
   assert(drag&&Array.isArray(drag.path),'Invalid fixed prefix drag');
   prefixTransitions+=drag.path.length+1;assert(prefixTransitions<plan.tailBudget.maxTransitions,'prefix-transition-budget');
   const next=apply(current,drag),audit=auditPlainForwardDrag(runtime,current,drag,{expectedBodies:next.blocks});
   report.prefixCommittedWorldUpperBound=index+2;report.conservativeFullBoardStateUpperBound=index+2;
   report.prefixAudits.push({index,...audit});assert(audit.valid,`prefix-replay:${audit.error}`);current=next;
  }
  report.prefixTransitions=prefixTransitions;report.tailLevel=clone(current);report.tailLevelSha256=levelSha256(current);
  let tailDrags=[];
  if(current.blocks.length){
   const remainingMs=plan.tailBudget.maxMilliseconds-(Date.now()-started);
   assert(remainingMs>=1,'prefix-deadline');
   const actualTailBudget={...plan.tailBudget,maxTransitions:plan.tailBudget.maxTransitions-prefixTransitions,maxMilliseconds:remainingMs};
   // Exactly one tail search, including UNKNOWN or a replay-rejected witness.
   report.tailSearches=1;
   report.tailSearch=plan.tailStrategy==='plain-joint'
    ?guardedPlainTask(current,runtime,{floor:1,searchUpper:plan.searchUpper,...actualTailBudget})
    :guardedNativeUpper(runtime,current,actualTailBudget);
   report.conservativeFullBoardStateUpperBound=plan.prefixBoardCharge+report.tailSearch.guardAllowance.conservativeFullBoardStateUpperBound;
   assert(report.conservativeFullBoardStateUpperBound<=plan.fullUpperBudget.maxStates);
   const tail=report.tailSearch;
   const completeTail=plan.tailStrategy==='native'?tail.witnessFound
    :(['relaxed-shortcut','threshold-proven'].includes(tail.status)&&Number.isSafeInteger(tail.cost)&&tail.cost>=0&&Array.isArray(tail.drags)
     &&(tail.routeTermination==='minimum-relaxed-route-found'||tail.termination==='relaxed-completion'));
   assert(completeTail,'tail-'+tail.termination);tailDrags=tail.drags;
   // Tail plain statistics never become a bound on the original full input.
   // Only a complete original-object double replay below can establish U.
  }
  const drags=[...clone(prefixDrags),...clone(tailDrags)],canonical=runtime.replayRevisedRoute(level,drags),independent=independentReplay(runtime,level,drags);
  report.canonical=canonical;report.independent=independent;
  assert(canonical.valid&&canonical.complete&&independent.valid&&independent.complete&&!independent.failed,'Original concatenated route failed actual double replay');
  assert.equal(canonical.clearEvents,level.blocks.length);assert.equal(independent.clearEvents,level.blocks.length);
  assert.equal(canonical.nonClearingDrags,independent.nonClearingDrags);assert.equal(canonical.effectiveDrags,independent.effectiveDrags);
  return{...report,status:'COMPLETE_ORIGINAL_UPPER_WITNESS',valid:true,complete:true,drags,routeSha256:routeSha256(drags),U:independent.nonClearingDrags,
   elapsedMilliseconds:Date.now()-started};
 }catch(error){return{...report,status:'UPPER_UNKNOWN',reason:error.message,elapsedMilliseconds:Date.now()-started};}
}

/** Exploration receipt, not design/slot/Pointer acceptance. The ledger binds
 * the FULL original input, never the smaller tail. A failed U blocks that input
 * without a lower search; a successful U permits exactly one predeclared L.
 * Passed inputs may later receive the ordinary fresh formal qualification. */
export async function explorePrefixTailCandidate(runtime,candidate,{prefixDrags,prefixRecovery=null,floor=31,upperBudget={},lowerBudget={},redesignOf,tailStrategy='native',searchUpper=128,
 ledgerDirectory='deliverables/daily-formal-v3-20261008/proof/attempts'}={}){
 const level=clone(candidate.level),plan=prefixTailPlan(level,prefixDrags,{floor,upperBudget,lowerBudget,prefixRecovery,tailStrategy,searchUpper});
 runtime.validateLevel(level);assert.equal(runtime.toolchainSha256,FROZEN_PROOF_SHA);
 const ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(level,{redesignOf,allowRevalidation:false});
 const planPath=path.resolve(ledgerDirectory,`${attempt.id}.prefix-tail-plan.json`);
 fs.writeFileSync(planPath,JSON.stringify({attemptId:attempt.id,levelSha256:plan.levelSha256,plan,prefixDrags},null,2)+'\n',{flag:'wx'});
 const report={schemaVersion:3,exploratory:true,accepted:false,formalReady:false,version:PREFIX_TAIL_VERSION,
  level,levelSha256:plan.levelSha256,sourceLevelId:candidate.sourceLevelId,plan,attempt,
  planEvidence:{path:planPath,sha256:createHash('sha256').update(fs.readFileSync(planPath)).digest('hex')},toolchainSha256:runtime.toolchainSha256,
  toolchainBindings:runtime.toolchainBindings,status:'PENDING',upperConstruction:null,lowerBound:null,route:null,U:null,L:null,
  designValidated:false,mechanismStrengthValidated:false,pointerValidated:false,timeValidated:false};
 try{
  const upper=constructPrefixTailUpper(runtime,level,prefixDrags,{plan});report.upperConstruction=upper;
  if(!upper.valid){report.status='FAILED_FIXED_PREFIX_OR_SINGLE_TAIL';return report;}
  report.drags=upper.drags;report.routeSha256=upper.routeSha256;report.U=upper.U;
  report.route={replay:upper.canonical,independentReplay:upper.independent,providedBy:PREFIX_TAIL_VERSION,
   search:null,upperConstructionSha256:levelSha256(upper)};
  const result=guardedPlainTask(level,runtime,{floor,...plan.lowerBudget});
  report.lowerBound={levelSha256:plan.levelSha256,result};report.proof=result;
  if(!result.thresholdProven){report.status='LOWER_UNKNOWN_OR_BELOW_DECLARED_FLOOR';return report;}
  assert(upper.U>=floor,'Declared floor exceeds the complete actual upper');
  report.accepted=true;report.L=floor;report.status='EXPLORATORY_FULL_ORIGINAL_L_U_VERIFIED';return report;
 }catch(error){report.status='EXPLORATION_ERROR';report.error=error.message;return report;}
 finally{
  const upperPath=path.resolve(ledgerDirectory,`${attempt.id}.prefix-tail-upper.json`);
  fs.writeFileSync(upperPath,JSON.stringify({attemptId:attempt.id,levelSha256:plan.levelSha256,upper:report.upperConstruction},null,2)+'\n',{flag:'wx'});
  report.upperEvidence={path:upperPath,sha256:createHash('sha256').update(fs.readFileSync(upperPath)).digest('hex')};
  await ledger.finish(attempt,report);
 }
}
