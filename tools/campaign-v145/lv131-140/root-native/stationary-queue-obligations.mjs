import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const directions=[[1,0],[-1,0],[0,1],[0,-1]],sides=['top','right','bottom','left'];
export function validateQueueObligationPrefix(level,api){
 api.validateLevel(level);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 for(const key of ['seams','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[key]?.length,'Unsupported '+key);
 const allowed=new Set(['id','x','y','shape','color','layers','frozen','shutterId','movementAxis','generatorId']);
 for(const b of level.blocks){assert(Object.keys(b).every(k=>allowed.has(k)));assert.equal((b.layers??[b.color]).length,1,'No shells or extra clear events');assert.equal((b.layers??[b.color])[0],b.color,'Declared color must match the actual single outer layer');if(b.movementAxis)assert.equal(b.shape.length,(Math.max(...b.shape.map(p=>p[0]))+1)*(Math.max(...b.shape.map(p=>p[1]))+1));}
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen','portals'].includes(k)));
 const ordinary=level.gates.filter(g=>!g.frozen);assert.equal(ordinary.length,1,'Exactly one initially open color');const color=ordinary[0].color;assert.equal(level.gates.filter(g=>g.color===color).length,1);
 const queue=new Set();for(const g of level.generators??[]){assert(Object.keys(g).every(k=>['id','side','offset','rimSpan','rimMount','spawn','queueBlockIds','trigger'].includes(k)));assert(!g.trigger||g.trigger==='move');for(const id of g.queueBlockIds){assert(!queue.has(id));queue.add(id);}}
 const covers=level.shutters??[],coverCells=new Set();for(const s of covers){assert(Object.keys(s).every(k=>['id','x','y','width','height','count','skin'].includes(k)));assert(!s.skin||s.skin==='shutter');for(let y=s.y;y<s.y+s.height;y++)for(let x=s.x;x<s.x+s.width;x++){const k=x+','+y;assert(!coverCells.has(k));coverCells.add(k);}}
 const opening=level.blocks.filter(b=>!queue.has(b.id)&&!b.shutterId),targets=opening.filter(b=>b.color===color),queuedTargets=level.blocks.filter(b=>queue.has(b.id)&&b.color===color),K=targets.length+queuedTargets.length;assert(K>0);assert(covers.every(s=>Number.isSafeInteger(s.count)&&s.count>=K));
 for(const b of level.blocks){if(queue.has(b.id)){assert(!b.shutterId&&!b.frozen);}if(b.generatorId)assert(queue.has(b.id));if(b.shutterId){const c=covers.find(c=>c.id===b.shutterId);assert(c);assert(b.shape.every(([dx,dy])=>b.x+dx>=c.x&&b.x+dx<c.x+c.width&&b.y+dy>=c.y&&b.y+dy<c.y+c.height));}else if(!queue.has(b.id))assert(b.shape.every(([dx,dy])=>!coverCells.has((b.x+dx)+','+(b.y+dy))));
  if(b.color!==color){const exits=level.gates.filter(g=>g.color===b.color);assert.equal(exits.length,1);assert((exits[0].frozen??0)>=K,'Another color can clear before all targets');}
 }
 return {color,gateId:ordinary[0].id,goalClears:K,targets,queuedTargets,blockers:opening.filter(b=>b.color!==color),queueIds:[...queue]};
}
export function fixedBlockerReachability(level,api,targetId,blockerId){
 const reduced=structuredClone(level);delete reduced.generators;reduced.blocks=reduced.blocks.filter(b=>b.id===targetId||b.id===blockerId||b.shutterId);for(const b of reduced.blocks){delete b.generatorId;if(b.id===targetId)delete b.frozen;}
 const initial=new api.PuzzleModel(reduced);initial.startCountdown();const nodes=[initial],target=initial.getBlock(targetId),seen=new Set([target.x+','+target.y]);
 for(let i=0;i<nodes.length;i++){const m=nodes[i],b=m.getBlock(targetId);for(const side of sides){const n=m.clone();n.beginAction();if(n.tryExit(targetId,side).ok)return {reachable:true,visitedPositions:[...seen],reducedLevelSha256:digest(reduced)};}
  for(const [dx,dy]of directions){const n=m.clone();n.beginAction();const x=b.x+dx,y=b.y+dy;if(!n.moveBlockStep(targetId,x,y))continue;const key=x+','+y;if(seen.has(key))continue;seen.add(key);nodes.push(n);}
 }return {reachable:false,visitedPositions:[...seen],reducedLevelSha256:digest(reduced)};
}
/** Before K clears only the K opening plus queued target-color bodies can clear. Every opening
 * target must therefore leave before any non-target body can clear or any
 * curtain can reveal. A non-target initial body whose fixed footprint prevents
 * a target from reaching its exit even after all other active obstacles are
 * deleted must move at least once. Its first movement is necessarily a separate
 * non-clearing gesture. Distinct such bodies give additive unit obligations.
 * This counts bodies, never paths, distances, axes, or guessed player actions.
 */
export function checkQueueStationaryObligations(level,api,{floor=11,targetIds}={}){
 assert(Number.isSafeInteger(floor)&&floor>0);
 let contract;try{contract=validateQueueObligationPrefix(level,api);}catch(e){return {status:'unsupported',thresholdProven:false,reason:e.message};}
 const targets=targetIds?contract.targets.filter(b=>targetIds.includes(b.id)):contract.targets;assert(targets.length);if(targetIds)assert.equal(targets.length,new Set(targetIds).size);
 const obligations=new Map(),checks=[];for(const target of targets)for(const blocker of contract.blockers){if(obligations.has(blocker.id))continue;const reach=fixedBlockerReachability(level,api,target.id,blocker.id);checks.push({targetId:target.id,blockerId:blocker.id,...reach});if(!reach.reachable)obligations.set(blocker.id,{targetId:target.id,blockerId:blocker.id,initialFootprint:blocker.shape.map(([x,y])=>[blocker.x+x,blocker.y+y])});}
 return {status:obligations.size>=floor?'threshold-proven':'insufficient-obligations',thresholdProven:obligations.size>=floor,floor,provedObligations:obligations.size,sourceLevelSha256:digest(level),contract:{color:contract.color,gateId:contract.gateId,goalClears:contract.goalClears,targetIds:contract.targets.map(b=>b.id),queuedTargetIds:contract.queuedTargets.map(b=>b.id),queueIds:contract.queueIds},obligations:[...obligations.values()],checks,abstraction:'independent-initial-stationary-blocker-with-counted-ordinary-fifo-v172',solvabilityValidated:false,pointerValidated:false};
}

