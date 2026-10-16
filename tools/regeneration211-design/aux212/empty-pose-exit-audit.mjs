import {compileSpatial} from '../../continuation211-optional-lift-domain.mjs';
/** Necessary condition only: remove all other bodies/covers and open all gates,
 * preserving original board, each actual orientation/axis and colored grids.
 * Failure proves a permanent geometric trap. PASS does not prove solvability. */
export function emptyPoseExitAudit(level,api){
 const plan=structuredClone(level);for(const b of plan.blocks)delete b.timedBombSeconds;
 const c=compileSpatial(plan,api),rows=[];
 for(const b of c.blocks){const seen=new Set(),q=[b.initial],stages=new Set();while(q.length){const at=q.pop();if(seen.has(at))continue;seen.add(at);const pose=b.poses[at];pose.exits.forEach((es,j)=>{if(es.length)stages.add(j);});q.push(...pose.neighbors.filter(n=>!seen.has(n)));}rows.push({id:b.id,color:b.color,reachablePoses:seen.size,layers:b.layers.length,reachableExitStages:[...stages],passed:stages.size===b.layers.length});}
 return{passed:rows.every(r=>r.passed),trappedBodyIds:rows.filter(r=>!r.passed).map(r=>r.id),scope:'Necessary geometric condition only; ignore other bodies and covers, open gates; keep board, axis, native orientation, colored grid.',rows};
}
