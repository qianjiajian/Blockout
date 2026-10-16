import assert from 'node:assert/strict';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {inverseUnitPath} from '../formal-v3/reverse-route-audit.mjs';
const copy=structuredClone;

/** Pure metadata. Only FINAL drags supply the suffix, never old reverseOperations.
 * The original complete level is read, not reconstructed/replayed/searched. */
export function compileStoredSuffixBlueprint(reference,{cutAfterDrag,gates,inventory,qualificationOnly=false}){
 assert.equal(reference.levelSha256,levelSha256(reference.level));
 assert.equal(reference.routeSha256,routeSha256(reference.drags));
 assert(Number.isSafeInteger(cutAfterDrag)&&cutAfterDrag>0&&cutAfterDrag<reference.drags.length);
 const level=reference.level,area=level.width*level.height;
 if(qualificationOnly){assert(level.id>=990000&&area<=16&&level.blocks.length<=8);}
 else{assert.equal(level.id,5);assert.equal(level.width,5);assert.equal(level.height,7);assert.equal(cutAfterDrag,26);
  assert.equal(reference.levelSha256,'f1a788a9ae94e7a78f076c84d680b56e69453f5f1b5f7c5afe7f928ecb3a91ec');
  assert.equal(reference.routeSha256,'b802810c1734ac44ab27d82e0ccfda9c5736e2f65e695252dfd7d6f676794727');assert.equal(reference.accepted,true);
  assert.equal(reference.replay.valid,true);assert.equal(reference.replay.complete,true);assert.equal(reference.independentReplay.valid,true);assert.equal(reference.independentReplay.complete,true);}
 const atoms=new Map(level.blocks.map(b=>[b.id,b])),poses=new Map(level.blocks.map(b=>[b.id,[b.x,b.y]])),frames=[];
 for(const [index,drag]of reference.drags.entries()){
  assert(poses.has(drag.blockId),'Stored drag uses absent body');const start=poses.get(drag.blockId);let previous=start;
  for(const p of drag.path){assert(Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger));assert.equal(Math.abs(p[0]-previous[0])+Math.abs(p[1]-previous[1]),1);previous=p;}
  if(index>=cutAfterDrag){assert(drag.exitSide,'This narrow suffix contains only original clear drags');const old=atoms.get(drag.blockId),atom=inventory.find(b=>b.id===old.id);assert(atom,'Retained suffix ID missing');
   assert.equal(atom.color,old.color);assert.deepEqual(atom.shape,old.shape);assert.deepEqual(gates.find(g=>g.color===old.color),level.gates.find(g=>g.color===old.color),'Retained tail portal changed');
   frames.push({kind:'insertion',body:{id:old.id,color:old.color,shape:copy(old.shape),x:previous[0],y:previous[1]},reversePath:inverseUnitPath(start,drag.path),exitSide:drag.exitSide,forwardDrag:copy(drag),seedPose:{id:old.id,x:start[0],y:start[1],shape:copy(old.shape),color:old.color}});
  }
  if(drag.exitSide)poses.delete(drag.blockId);else poses.set(drag.blockId,previous);
 }
 assert.equal(poses.size,0,'Saved route must remove its whole inventory');assert.equal(new Set(frames.map(x=>x.body.id)).size,frames.length);
 const retained=new Set(frames.map(x=>x.body.id)),retainedArea=frames.reduce((n,f)=>n+f.body.shape.length,0),newAtoms=inventory.filter(b=>!retained.has(b.id));
 assert(newAtoms.every(b=>!atoms.has(b.id)),'Replacement IDs cannot masquerade as retained bodies');assert.equal(inventory.reduce((n,b)=>n+b.shape.length,0),area);
 if(!qualificationOnly){assert.equal(frames.length,4);assert.equal(retainedArea,13);assert.equal(newAtoms.length,8);assert.equal(area-retainedArea,22);}
 return{version:'stored-final-clear-suffix-blueprint-v1',referenceLevelSha256:reference.levelSha256,referenceRouteSha256:reference.routeSha256,cutAfterDrag,retainedArea,replacementArea:area-retainedArea,retainedBodyIds:frames.map(x=>x.body.id),replacementBodyIds:newAtoms.map(b=>b.id),seedBodies:frames.map(f=>f.seedPose),inverseOperations:frames.reverse().map(({seedPose,...x})=>x),originalFullReplayPerformed:false};
}

/** The supplied session is the SAME admitted private session used by the graph.
 * Every portal, endpoint and actual model mutation is charged by that session. */
export function restoreStoredSuffixSeed(session,initial,blueprint){
 let current=initial;const operations=[];
 for(const expected of blueprint.inverseOperations){
  const atom=expected.body;
  session.materialize('suffix-insertion-portal',current.blocks,()=>({...current,blocks:[...current.blocks,copy(atom)]}),{add:atom});
  const audit=session.insertion(current,atom,expected.reversePath,expected.exitSide);assert(audit.valid,'Known suffix partial inverse failed: '+audit.error);assert.deepEqual(audit.forwardDrag,expected.forwardDrag);
  current=audit.reverseAfterLevel;operations.push({kind:'insertion',body:copy(atom),reversePath:copy(expected.reversePath),exitSide:expected.exitSide,forwardDrag:audit.forwardDrag});
 }
 const key=bs=>levelSha256(bs.map(({id,x,y,shape,color})=>({id,x,y,shape,color})).sort((a,b)=>a.id.localeCompare(b.id)));
 assert.equal(key(current.blocks),key(blueprint.seedBodies),'Metered seed differs from stored final-route cut');
 session.visit(current,false);return{level:current,operations};
}
