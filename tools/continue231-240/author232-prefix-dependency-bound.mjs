import assert from 'node:assert/strict';
import {compileSpatial,NONE} from '../continuation211-optional-lift-domain.mjs';
import {unionPaths,popcount} from './author240-alt-blocker-bound.mjs';
import {digest} from './common.mjs';
import {joinDependencyMasks} from './author232-prefix-dependency-core.mjs';

export function prefixBound232(level,api,{maxLabels=100000,maxMilliseconds=1200,maxJoined=200000}={}){
 assert.equal(level.id,232);assert.equal(level.blocks.length,42);
 assert(!level.generators?.length&&!level.flipDoors?.length&&!level.elevators?.length&&!level.coloredGrids?.length);
 assert(level.blocks.every(b=>!b.layers&&!b.frozen&&!b.lockedBy&&!b.keyId&&!b.star));
 const ordinary=level.gates.filter(g=>!g.frozen),freeColors=new Set(ordinary.map(g=>g.color));assert.deepEqual([...freeColors].sort(),['blue','red']);assert.equal(ordinary.length,2);
 assert(level.gates.filter(g=>!freeColors.has(g.color)).every(g=>g.frozen>=6));
 const c=compileSpatial(level,api),curtains=c.covers.filter(co=>co.skin!=='lift'),lifts=c.covers.filter(co=>co.skin==='lift');assert.equal(c.covers.length,4);assert.equal(curtains.length,2);assert.equal(lifts.length,2);
 const sameRegion=(a,b)=>['x','y','width','height'].every(k=>a[k]===b[k]);
 const permanent=new Set();
 for(const co of curtains){assert.equal(co.count,11);assert.equal(lifts.filter(l=>sameRegion(co,l)).length,1);for(let y=co.y;y<co.y+co.height;y++)for(let x=co.x;x<co.x+co.width;x++)permanent.add([x,y].join(','));}
 for(const co of c.covers){assert.equal(c.initial[co.stateIndex],NONE);assert.equal(co.members.length,4);assert.equal(co.width*co.height,12);const covered=co.members.flatMap(i=>{const b=c.blocks[i];assert.equal(b.ice,0);return b.shape.map(([x,y])=>[b.x+x,b.y+y].join(','));});assert.equal(covered.length,12);assert.equal(new Set(covered).size,12);assert(covered.every(k=>permanent.has(k)));}
 const opening=level.blocks.filter(b=>!b.shutterId);assert.equal(opening.length,26);
 const targets=opening.filter(b=>freeColors.has(b.color)),obstacles=opening.filter(b=>!freeColors.has(b.color));assert.equal(targets.length,6);assert.equal(obstacles.length,20);
 const owner=new Map([...obstacles,...targets].flatMap((b,i)=>b.shape.map(([x,y])=>[[b.x+x,b.y+y].join(','),i]))),graphs=[],rows=[];
 for(const [targetIndex,target] of targets.entries()){
  const b=c.blocks.find(b=>b.id===target.id),cells=b.poses.map((p,i)=>p?b.shape.map(([x,y])=>[i%c.W+x,Math.floor(i/c.W)+y].join(',')):[]),allowed=b.poses.map((p,i)=>!!p&&!cells[i].some(k=>permanent.has(k)));
  assert(allowed[b.initial]);
  const neighbors=b.poses.map((p,i)=>allowed[i]?p.neighbors.filter(j=>allowed[j]):[]),occupied=cells.map((ks,i)=>allowed[i]?ks.reduce((m,k)=>owner.has(k)&&owner.get(k)!==20+targetIndex?m|(1<<owner.get(k)):m,0):0),goals=b.poses.flatMap((p,i)=>allowed[i]&&p.exits[0].some(ex=>!ex.gate.frozen&&ex.gate.color===b.color)?[i]:[]),graph={neighbors,occupied,start:b.initial,goals};
  graphs.push({id:b.id,color:b.color,shape:b.shape,graph});const result=unionPaths(graph,{maxLabels,maxMilliseconds});rows.push({id:b.id,graphSha256:digest(graph),...result});
  if(result.status!=='complete')return{status:'unknown',thresholdProven:false,sourceLevelSha256:digest(level),rows};
  if(!result.masks.length)return{status:'no-static-path',thresholdProven:false,sourceLevelSha256:digest(level),rows};
 }
 const combined=joinDependencyMasks(rows.map(r=>r.masks),{obstacleBits:20,maxJoined});
 if(combined.status!=='complete')return{...combined,thresholdProven:false,sourceLevelSha256:digest(level),rows};
 const minimum=combined.minimum;
 return{status:'complete',thresholdProven:minimum>=11,provenLowerBound:minimum,minimumCombinedParkingBound:minimum,bestObstacleCount:combined.best.obstacleCount,bestOrdinaryFeedbackCount:combined.best.feedbackCount,sourceLevelSha256:digest(level),mathematicalInputSha256:digest({fullInventory:level.blocks,allCovers:level.shutters,allGates:level.gates,permanent:[...permanent],blockerIds:obstacles.map(b=>b.id),graphs}),fullInventoryBodies:42,openingBodies:26,hiddenBodies:16,necessaryClearPrefix:6,ordinaryColors:[...freeColors],targetIds:targets.map(b=>b.id),blockerIds:obstacles.map(b=>b.id),permanentCurtainIds:curtains.map(co=>co.id),liftPairing:curtains.map(co=>({curtain:co.id,lift:lifts.find(l=>sameRegion(co,l)).id})),rows,combined,proof:'For each target path, the extra six bits identify the other ordinary targets whose initial footprints it crosses. Any target which never parks must clear in one gesture; if it crosses another never-parked target, that other target cleared earlier. Thus all dependency cycles must contain at least one parked ordinary target. A minimum feedback vertex set is a lower bound on distinct ordinary targets parked. Its count adds to the disjoint nonordinary blocker count. Subset domination of both obstacle identities and dependency edges preserves a lower bound. Before the sixth clear, all non-red/blue gates remain frozen and both curtain11 regions remain solid. Each coincident lift is also hidden because its region overlaps the unrevealed solid curtain. Exactly six opening bodies can clear in this prefix, so every full solution clears all six. Static legal target paths exclude those permanent curtain cells; target collisions are recorded as dependency edges, while moved-body occupancy is relaxed. Every initial nonordinary obstacle identity crossed by their combined trajectories must have moved in a prior nonclearing drag, because it cannot yet clear. The subset-antichain path fixed point and six-target dependency product cover every such trajectory; each combined label is evaluated as nonordinary blocker count plus minimum feedback vertex count. All42 original bodies and four cohorts remain in the source object; hidden16 are not falsely counted as opening blockers. This is only a necessary-prefix lower bound; a complete actual route is separately required.'};
}
