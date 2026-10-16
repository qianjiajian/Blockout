import assert from 'node:assert/strict';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {inverseUnitPath} from '../formal-v3/reverse-route-audit.mjs';
const copy=structuredClone;
export const STAR_SUFFIX_DECLARATION=Object.freeze({path:'deliverables/daily-formal-v4-20261008/design/star-two-route-source200-readonly-01/declaration.json',sha256:'ba87e8d1886e212cf121641eee9bc711a8705428e49368387af07dee935cde9c'});
const FIXED_DESIGN={"inventory":[{"color":"blue","shape":[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],"star":false},{"color":"pink","shape":[[0,0],[1,0],[0,1],[1,1]],"star":false},{"color":"pink","shape":[[0,0],[1,0]],"star":true},{"color":"pink","shape":[[0,0],[1,0]],"star":false},{"color":"blue","shape":[[0,0],[0,1]],"star":true},{"color":"blue","shape":[[0,0],[0,1]],"star":false},{"color":"green","shape":[[0,0],[1,0],[0,1],[1,1]],"star":false},{"color":"green","shape":[[0,0],[1,0]],"star":false},{"color":"yellow","shape":[[0,0],[1,0],[0,1],[1,1]],"star":false},{"color":"yellow","shape":[[0,0],[0,1]],"star":false},{"color":"cyan","shape":[[0,0],[1,0],[2,0]],"star":false},{"color":"cyan","shape":[[0,0],[0,1]],"star":false},{"color":"orange","shape":[[0,0],[1,0],[2,0]],"star":false},{"color":"orange","shape":[[0,0],[1,0]],"star":false},{"color":"purple","shape":[[0,0],[0,1],[0,2]],"star":false},{"color":"red","shape":[[0,0],[0,1],[0,2]],"star":false},{"color":"red","shape":[[0,0],[1,0]],"star":false}],"gates":[{"color":"green","side":"top","offset":0,"size":2,"star":false},{"color":"yellow","side":"top","offset":2,"size":2,"star":false},{"color":"blue","side":"top","offset":4,"size":2,"star":false},{"color":"pink","side":"left","offset":2,"size":1,"star":true},{"color":"cyan","side":"left","offset":4,"size":2,"star":false},{"color":"orange","side":"left","offset":6,"size":1,"star":false},{"color":"purple","side":"bottom","offset":0,"size":2,"star":false},{"color":"pink","side":"bottom","offset":2,"size":2,"star":false},{"color":"red","side":"bottom","offset":4,"size":2,"star":false},{"color":"blue","side":"right","offset":5,"size":2,"star":true}]};
const bodyPhysical=b=>({color:b.color,shape:b.shape,star:b.star??false});
const gatePhysical=g=>({color:g.color,side:g.side,offset:g.offset,size:g.size,star:g.star??false});
const signatures=bs=>bs.map(b=>levelSha256(bodyPhysical(b))).sort();
/** Scalar metadata only: no LevelSpec, projection, coordinate domain or model. */
export function assertSource200StarStock(inventory,gates){
 assert.equal(inventory.length,17);assert.equal(new Set(inventory.map(b=>b.id)).size,17);
 assert.deepEqual(signatures(inventory),signatures(FIXED_DESIGN.inventory),'Only declared shape/colour/star inventory');
 assert.deepEqual(gates.map(gatePhysical),FIXED_DESIGN.gates,'All ten portals and their resolution order');assert.equal(new Set(gates.map(g=>g.id)).size,10);
 assert.equal(inventory.filter(b=>b.star===true).length,2);
 for(const b of inventory.filter(b=>b.star))assert(inventory.some(n=>!n.star&&n.color===b.color&&levelSha256(n.shape)===levelSha256(b.shape)),'Same-shape ordinary counterpart required');return true;
}
/** Domain assertion allocates no projected world. Other mechanics fail closed. */
export function assertStaticStarDomain(level){
 const fields=new Set(['id','name','difficulty','timeSeconds','reward','parMoves','preservedMoveTarget','mechanismRules','width','height','playable','blocked','gates','blocks']);
 assert(level&&typeof level==='object');for(const k of Object.keys(level))assert(fields.has(k),'Static star excludes level field '+k);
 assert.equal(level.mechanismRules,'revised-2026-09-27-v1.5');assert(Number.isSafeInteger(level.width)&&level.width>0&&Number.isSafeInteger(level.height)&&level.height>0);
 assert(Array.isArray(level.blocks)&&Array.isArray(level.gates));assert(!level.blocked?.length,'Only normal rectangle');
 if(level.playable)assert.deepEqual(level.playable.map(p=>p.join(',')).sort(),Array.from({length:level.width*level.height},(_,i)=>[i%level.width,Math.floor(i/level.width)].join(',')).sort());
 for(const b of level.blocks){assert(Object.keys(b).every(k=>['id','x','y','shape','color','star','frozen','layers'].includes(k)),'Unsupported body field');assert(b.star===undefined||typeof b.star==='boolean');assert((b.frozen??0)===0);assert(!b.layers||b.layers.length===1&&b.layers[0]===b.color);}
 const occupied=new Set();assert.equal(new Set(level.gates.map(g=>g.id)).size,level.gates.length);
 for(const g of level.gates){assert(Object.keys(g).every(k=>['id','side','offset','size','color','star','frozen'].includes(k)),'Unsupported gate field');assert(g.star===undefined||typeof g.star==='boolean');assert((g.frozen??0)===0);assert(['top','right','bottom','left'].includes(g.side));assert(Number.isSafeInteger(g.offset)&&g.offset>=0&&Number.isSafeInteger(g.size)&&g.size>0);assert(g.offset+g.size<=(['top','bottom'].includes(g.side)?level.width:level.height));
  for(let i=g.offset;i<g.offset+g.size;i++){const k=g.side+':'+i;assert(!occupied.has(k),'Overlapping apertures excluded');occupied.add(k);}
 }return true;
}

/** Pure metadata. Only FINAL drags supply the suffix, never old reverseOperations.
 * The original complete level is read, not reconstructed/replayed/searched. */
export function compileStoredStarSuffixBlueprint(reference,{cutAfterDrag,gates,inventory,qualificationOnly=false}){
 assert.equal(reference.levelSha256,levelSha256(reference.level));
 const actualRouteSha256=routeSha256(reference.drags);
 // The original source200 receipt predates the optional routeSha256 field.
 // Always hash its actual drags; an existing declaration must still agree.
 if(reference.routeSha256!==undefined)assert.equal(reference.routeSha256,actualRouteSha256);
 assert(Number.isSafeInteger(cutAfterDrag)&&cutAfterDrag>0&&cutAfterDrag<reference.drags.length);
 const level=reference.level,area=level.width*level.height;
 if(qualificationOnly){assert(level.id>=990000&&area<=16&&level.blocks.length<=8);}
 else{assert.equal(level.id,200);assert.equal(level.width,6);assert.equal(level.height,8);assert.equal(cutAfterDrag,34);assertSource200StarStock(inventory,gates);
  assert.equal(reference.levelSha256,'70272cc260187ba7ed487f1d613a1ccd9e334fb9af5b5704079a001c5756b508');
  assert.equal(actualRouteSha256,'6c24b2647962d510e55920d388e44bc22fff3480172e7dfd61fbc3ca8647d6e1');assert.equal(reference.accepted,true);
  assert.equal(reference.replay.valid,true);assert.equal(reference.replay.complete,true);assert.equal(reference.independentReplay.valid,true);assert.equal(reference.independentReplay.complete,true);}
 const atoms=new Map(level.blocks.map(b=>[b.id,b])),poses=new Map(level.blocks.map(b=>[b.id,[b.x,b.y]])),frames=[];
 for(const [index,drag]of reference.drags.entries()){
  assert(poses.has(drag.blockId),'Stored drag uses absent body');const start=poses.get(drag.blockId);let previous=start;
  for(const p of drag.path){assert(Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger));assert.equal(Math.abs(p[0]-previous[0])+Math.abs(p[1]-previous[1]),1);previous=p;}
  if(index>=cutAfterDrag){assert(drag.exitSide,'This narrow suffix contains only original clear drags');const old=atoms.get(drag.blockId),atom=inventory.find(b=>b.id===old.id);assert(atom,'Retained suffix ID missing');
   assert.equal(atom.color,old.color);assert.deepEqual(atom.shape,old.shape);assert.equal(atom.star??false,old.star??false);const prior=level.gates.filter(g=>g.color===old.color&&g.side===drag.exitSide&&!g.star);assert.equal(prior.length,1);const actual=gates.filter(g=>levelSha256(gatePhysical(g))===levelSha256(gatePhysical(prior[0])));assert.equal(actual.length,1,'Retained tail portal changed');
   frames.push({kind:'insertion',body:{id:old.id,color:old.color,shape:copy(old.shape),star:old.star??false,x:previous[0],y:previous[1]},reversePath:inverseUnitPath(start,drag.path),exitSide:drag.exitSide,forwardDrag:copy(drag),seedPose:{id:old.id,x:start[0],y:start[1],shape:copy(old.shape),color:old.color,star:old.star??false}});
  }
  if(drag.exitSide)poses.delete(drag.blockId);else poses.set(drag.blockId,previous);
 }
 assert.equal(poses.size,0,'Saved route must remove its whole inventory');assert.equal(new Set(frames.map(x=>x.body.id)).size,frames.length);
 const retained=new Set(frames.map(x=>x.body.id)),retainedArea=frames.reduce((n,f)=>n+f.body.shape.length,0),newAtoms=inventory.filter(b=>!retained.has(b.id));
 assert(newAtoms.every(b=>!atoms.has(b.id)),'Replacement IDs cannot masquerade as retained bodies');assert.equal(inventory.reduce((n,b)=>n+b.shape.length,0),area);
 if(!qualificationOnly){assert.equal(frames.length,2);assert.equal(retainedArea,10);assert.equal(newAtoms.length,15);assert.equal(area-retainedArea,38);}
 return{version:'stored-star-final-clear-suffix-blueprint-v1',referenceLevelSha256:reference.levelSha256,referenceRouteSha256:actualRouteSha256,cutAfterDrag,retainedArea,replacementArea:area-retainedArea,retainedBodyIds:frames.map(x=>x.body.id),replacementBodyIds:newAtoms.map(b=>b.id),seedBodies:frames.map(f=>f.seedPose),inverseOperations:frames.reverse().map(({seedPose,...x})=>x),originalFullReplayPerformed:false};
}

/** The supplied session is the SAME admitted private session used by the graph.
 * Every portal, endpoint and actual model mutation is charged by that session. */
export function restoreStoredStarSuffixSeed(session,initial,blueprint){
 let current=initial;const operations=[];
 for(const expected of blueprint.inverseOperations){
  const atom=expected.body;
  session.materialize('suffix-insertion-portal',current.blocks,()=>({...current,blocks:[...current.blocks,copy(atom)]}),{add:atom});
  const audit=session.insertion(current,atom,expected.reversePath,expected.exitSide);assert(audit.valid,'Known suffix partial inverse failed: '+audit.error);assert.deepEqual(audit.forwardDrag,expected.forwardDrag);
  current=audit.reverseAfterLevel;operations.push({kind:'insertion',body:copy(atom),reversePath:copy(expected.reversePath),exitSide:expected.exitSide,forwardDrag:audit.forwardDrag});
 }
 const key=bs=>levelSha256(bs.map(({id,x,y,shape,color,star})=>({id,x,y,shape,color,star:star??false})).sort((a,b)=>a.id.localeCompare(b.id)));
 assert.equal(key(current.blocks),key(blueprint.seedBodies),'Metered seed differs from stored final-route cut');
 session.visit(current,false);return{level:current,operations};
}
