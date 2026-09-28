import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {validateQueueObligationPrefix} from './stationary-queue-obligations.mjs';
const directions=[[1,0],[-1,0],[0,1],[0,-1]],sides=['top','right','bottom','left'];

// A fixed SET must obstruct an opening target even after every other active
// body and the entire queue are removed for free. This is an optimistic model.
export function fixedSetReachability(level,api,targetId,blockerIds){
 const keep=new Set([targetId,...blockerIds]),reduced=structuredClone(level);
 delete reduced.generators;
 reduced.blocks=reduced.blocks.filter(b=>keep.has(b.id)||b.shutterId);
 for(const b of reduced.blocks){delete b.generatorId;if(b.id===targetId)delete b.frozen;}
 const initial=new api.PuzzleModel(reduced);initial.startCountdown();
 const target=initial.getBlock(targetId),nodes=[initial],seen=new Set([target.x+','+target.y]);
 for(let at=0;at<nodes.length;at++){
  const model=nodes[at],body=model.getBlock(targetId);
  for(const side of sides){const n=model.clone();n.beginAction();if(n.tryExit(targetId,side).ok)return {reachable:true,visitedPositions:[...seen],reducedLevelSha256:digest(reduced)};}
  for(const [dx,dy]of directions){const n=model.clone();n.beginAction();const x=body.x+dx,y=body.y+dy;if(!n.moveBlockStep(targetId,x,y))continue;const key=x+','+y;if(seen.has(key))continue;seen.add(key);nodes.push(n);}
 }
 return {reachable:false,visitedPositions:[...seen],reducedLevelSha256:digest(reduced)};
}

// Each disjoint cut needs a different body's first non-clearing gesture before
// K. Disjointness is checked explicitly; intersecting cuts never add twice.
export function checkDisjointStationaryCuts(level,api,{floor=11,cuts=[]}={}){
 let contract;try{contract=validateQueueObligationPrefix(level,api);}catch(e){return {status:'unsupported',thresholdProven:false,reason:e.message};}
 assert(Number.isSafeInteger(floor)&&floor>0);
 const targets=new Set(contract.targets.map(b=>b.id)),blockers=new Set(contract.blockers.map(b=>b.id)),used=new Set(),checks=[];
 for(const cut of cuts){
  assert(targets.has(cut.targetId),'Only an opening ordinary body may be a target');
  assert(Array.isArray(cut.blockerIds)&&cut.blockerIds.length>0,'Nonempty fixed blocker set');
  for(const id of cut.blockerIds){assert(blockers.has(id),'Only a nonordinary opening body may be a blocker');assert(!used.has(id),'Cuts must be pairwise disjoint');used.add(id);}
  const result=fixedSetReachability(level,api,cut.targetId,cut.blockerIds);
  checks.push({...cut,...result});
 }
 const provedObligations=checks.filter(c=>!c.reachable).length;
 return {status:provedObligations>=floor?'threshold-proven':'insufficient-obligations',thresholdProven:provedObligations>=floor,floor,provedObligations,sourceLevelSha256:digest(level),contract:{color:contract.color,gateId:contract.gateId,goalClears:contract.goalClears,targetIds:contract.targets.map(b=>b.id),queuedTargetIds:contract.queuedTargets.map(b=>b.id),queueIds:contract.queueIds},checks,abstraction:'disjoint-initial-stationary-cuts-with-counted-ordinary-fifo-v172',solvabilityValidated:false,pointerValidated:false};
}
