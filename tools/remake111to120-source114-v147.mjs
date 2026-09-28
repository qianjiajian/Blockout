import fs from 'node:fs';import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const sourceFile='deliverables/remake111-120-v146-20260924/source114-reviewed.json';
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),shapes={SINGLE:rect(1,1),H2:rect(2,1),V2:rect(1,2),V3:rect(1,3),SQ2:rect(2,2),L3:[[0,0],[0,1],[1,1]]};
const sk=s=>JSON.stringify([...s].sort(([x,y],[a,b])=>y-b||x-a)),gateKey=g=>`${g.color}:${g.frozen??0}:${Boolean(g.star)}`;
export function checkSource114(level,api){
 assert.equal(level.id,114);api.validateLevel(level);const bytes=fs.readFileSync(sourceFile);assert.equal(digest(bytes),'2a42bb122442d262103321ac78d9d7bb6578192a7bdaf6ab05d848738a503659');const source=JSON.parse(bytes),known=new Set();
 assert.equal(level.blocks.length,23);assert.equal(level.generators?.length,1);
 for(const a of [...source.opening,...source.generators[0].queue]){const id='r147-114-'+a.sourceId,b=level.blocks.find(b=>b.id===id);assert(b,id);known.add(id);assert(Object.keys(b).every(k=>['id','x','y','shape','color','star','keyId','lockedBy','lockCount'].includes(k)));
  for(const k of ['color','star','keyId','lockedBy','lockCount'])assert.deepEqual(b[k],a[k],`${id}:${k}`);assert.equal(sk(b.shape),sk(shapes[a.kind]));}
 assert.deepEqual(level.generators[0].queueBlockIds,source.generators[0].queue.map(a=>'r147-114-'+a.sourceId));
 const added=level.blocks.filter(b=>!known.has(b.id));assert.equal(added.length,1);assert.equal(sk(added[0].shape),sk(shapes.H2));assert(Object.keys(added[0]).every(k=>['id','x','y','shape','color'].includes(k)));assert(source.openingColors.includes(added[0].color));
 assert.deepEqual(level.gates.map(gateKey).sort(),source.gates.map(gateKey).sort());for(const g of level.gates)assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen','star'].includes(k)));
 for(const k of ['shutters','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length);
 const sourceBindings=Object.fromEntries(source.frames.map(r=>[r.file,r.sha256]));sourceBindings[sourceFile]=digest(bytes);for(const[p,h]of Object.entries(sourceBindings))assert.equal(digest(fs.readFileSync(p)),h);
 return{passed:true,level:114,sourceFile,sourceBindings,observedBodies:22,authoredBodies:23,openingSourceArea:42,openingAuthoredArea:44,queueCount:4,starBlocks:2,keys:2,locks:2,
  adaptations:['Add exactly one ordinary H2 to fill the fixed44-cell board versus42 observed opening cells.','The two source L3 bodies use native q0 L3 silhouettes at the same area; all colors and mechanics remain paired.','Source top FIFO moves to the authored bottom mount, preserving all four arrivals and order.'],exactCompetitorCopy:false};
}
