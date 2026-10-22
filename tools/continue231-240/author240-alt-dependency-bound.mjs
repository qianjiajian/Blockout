import assert from'node:assert/strict';
import{compileSpatial}from'../continuation211-colored-witness.mjs';
import{unionPaths}from'./author240-alt-blocker-bound.mjs';
import{joinDependencyMasks}from'./author232-prefix-dependency-core.mjs';
import{digest}from'./common.mjs';
export function prefixBound240(level,api,{maxLabels=100000,maxMilliseconds=1200,maxJoined=200000}={}){
 assert.equal(level.id,240);assert.equal(level.width,7);assert.equal(level.height,9);assert.equal(level.playable.length,50);assert.equal(level.blocks.length,31);
 for(const key of['shutters','generators','flipDoors','elevators','coloredGrids','conveyors','seams'])assert(!level[key]?.length,`unsupported ${key}`);
 assert(level.blocks.every(b=>Object.keys(b).every(k=>['id','shape','color','x','y'].includes(k))),'plain initial inventory required');
 const free=level.gates.filter(g=>!g.frozen);assert.equal(free.length,1);assert.equal(free[0].color,'purple');assert.deepEqual(level.gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[4,6,9,12,14,18,20]);assert.equal(level.gates.find(g=>g.frozen===4).color,'blue');
 const targets=level.blocks.filter(b=>b.color==='purple'),obstacles=level.blocks.filter(b=>b.color!=='purple');assert.equal(targets.length,4);assert.equal(obstacles.length,27);assert(obstacles.length+targets.length<=31,'32-bit path label overflow');
 const c=compileSpatial(level,api),owner=new Map([...obstacles,...targets].flatMap((b,i)=>b.shape.map(([x,y])=>[[b.x+x,b.y+y].join(','),i]))),graphs=[],rows=[];
 for(const[targetIndex,target]of targets.entries()){
  const b=c.blocks.find(b=>b.id===target.id),neighbors=b.poses.map(p=>p?.neighbors??[]),occupied=b.poses.map((p,i)=>p?b.shape.reduce((m,[x,y])=>{const own=owner.get([i%c.W+x,Math.floor(i/c.W)+y].join(','));return own===undefined||own===27+targetIndex?m:m|(1<<own);},0):0),goals=b.poses.flatMap((p,i)=>p?.exits[0].some(ex=>!ex.gate.frozen&&ex.gate.color==='purple')?[i]:[]),graph={neighbors,occupied,start:b.initial,goals};
  graphs.push({id:b.id,shape:b.shape,graph});const result=unionPaths(graph,{maxLabels,maxMilliseconds});rows.push({id:b.id,graphSha256:digest(graph),...result});
  if(result.status!=='complete')return{status:'unknown',thresholdProven:false,sourceLevelSha256:digest(level),rows};
  if(!result.masks.length)return{status:'no-static-path',thresholdProven:false,sourceLevelSha256:digest(level),rows};
 }
 const combined=joinDependencyMasks(rows.map(r=>r.masks),{obstacleBits:27,maxJoined});
 if(combined.status!=='complete')return{...combined,thresholdProven:false,sourceLevelSha256:digest(level),rows};
 return{status:'complete',thresholdProven:combined.minimum>=21,provenLowerBound:combined.minimum,minimumCombinedParkingBound:combined.minimum,bestObstacleCount:combined.best.obstacleCount,bestOrdinaryFeedbackCount:combined.best.feedbackCount,sourceLevelSha256:digest(level),mathematicalInputSha256:digest({fullInventory:level.blocks,gates:level.gates,blockerIds:obstacles.map(b=>b.id),graphs}),fullInventoryBodies:31,necessaryClearPrefix:4,targetIds:targets.map(b=>b.id),blockerIds:obstacles.map(b=>b.id),pathLabelBits:31,combinedLabelBits:43,rows,combined,proof:'Before clear4, all nonpurple gates remain frozen, and only the four ordinary purple bodies can clear. Every nonpurple initial identity crossed by any actual purple path must have parked at least once. A never-parked purple body has one final clearing gesture; when its path crosses the initial footprint of another never-parked purple body, that other body must clear earlier. Therefore deleting the purple bodies that parked leaves an acyclic dependency graph. The minimum feedback vertex count bounds a disjoint class of ordinary parking drags and adds to the nonpurple blocker count. Every path label retains all27 blocker bits and4 dependency bits, excluding its own bit. The joint BigInt antichain retains all four target-specific dependency rows, so domination requires subset in both blocker identities and directed edges. All31 original bodies remain in the source object. This prefix lower bound requires a separately verified complete actual route.'};
}
export{prefixBound240 as blockerBound240};
