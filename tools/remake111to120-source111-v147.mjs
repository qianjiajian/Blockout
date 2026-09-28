import fs from 'node:fs';import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const sourceFile='deliverables/remake111-120-v146-20260924/source111-reviewed.json';
const shapes={SINGLE:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],SQ2:[[0,0],[1,0],[0,1],[1,1]],L3:[[0,0],[0,1],[1,1]],T4:[[1,0],[0,1],[1,1],[2,1]]};
const sk=s=>JSON.stringify([...s].sort(([x,y],[a,b])=>y-b||x-a)),gateKey=g=>`${g.color}:${g.frozen??0}:${Boolean(g.star)}`;
export function checkSource111(level,api){
 assert.equal(level.id,111);api.validateLevel(level);const bytes=fs.readFileSync(sourceFile);assert.equal(digest(bytes),'a3e36a77021171c14d8a10eb037d92f8d006f662d7f3c4cbaae96876f9525754');const source=JSON.parse(bytes),known=new Set(),changes=[];
 assert.equal(level.blocks.length,24);assert.equal(level.shutters?.length,1);const cover=level.shutters[0];assert.deepEqual([cover.width,cover.height,cover.count],[4,2,14]);assert(!cover.skin||cover.skin==='shutter');
 for(const group of ['upper','lower','hidden'])for(const a of source[group]){const id='r147-111-'+a.sourceId,b=level.blocks.find(b=>b.id===id);assert(b,id);known.add(id);
  assert(Object.keys(b).every(k=>['id','x','y','shape','color','star','movementAxis','shutterId'].includes(k)));for(const k of ['color','star','movementAxis'])assert.deepEqual(b[k],a[k],`${id}:${k}`);
  const expected=group==='hidden'?'V2':a.sourceId==='upper2'?'L3':['lower4','lower5'].includes(a.sourceId)?'H2':'SINGLE';assert.equal(sk(b.shape),sk(shapes[expected]),id+':shape');
  assert.equal(b.shutterId,group==='hidden'?cover.id:undefined);if(expected!==a.kind)changes.push({sourceId:a.sourceId,from:a.kind,to:expected,sourceArea:shapes[a.kind].length,authoredArea:shapes[expected].length});
 }
 assert.equal(known.size,24);assert.equal(changes.length,11);assert.equal(level.blocks.reduce((n,b)=>n+b.shape.length,0),32);
 const original=[...source.upper,...source.lower,...source.hidden],reductions=original.map(b=>shapes[b.kind].length-1).sort((a,b)=>b-a),required=original.reduce((n,b)=>n+shapes[b.kind].length,0)-32;
 assert.equal(required,27);assert.equal(reductions.slice(0,10).reduce((a,b)=>a+b,0),26);assert.equal(changes.reduce((n,c)=>n+c.sourceArea-c.authoredArea,0),27);
 assert.deepEqual(level.gates.map(gateKey).sort(),['blue:14:false','cyan:0:false','green:5:false','purple:11:false','red:20:true','red:7:false','yellow:0:false']);
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen','star','portals'].includes(k)));
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length);
 const sourceBindings=Object.fromEntries(source.frames.map(r=>[r.file,r.sha256]));sourceBindings[sourceFile]=digest(bytes);for(const[p,h]of Object.entries(sourceBindings))assert.equal(digest(fs.readFileSync(p)),h);
 return{passed:true,level:111,sourceFile,sourceBindings,observedBodies:24,authoredBodies:24,sourceBodyArea:59,authoredBodyArea:32,changes,minimumChangedBodiesAmongIdentityPreservingNonemptyShapes:11,
  adaptations:['Preserve all24 source identities and all mechanism properties while reducing exactly27 body cells to fit32. Even the ten largest possible body reductions total only26, so at least11 changed footprints are required.','The original vertical T4 and star SQ2 become single cells while retaining their vertical-axis and star properties; their original footprints are explicitly not preserved.','Known hidden10cells become four V2 bodies filling the chosen4x2 count14 curtain. Four source empty covered cells are omitted from the smaller real region.','Remove five duplicate source gates: upper blue8, lower red19/green17/purple21/yellow16. Retain source blue14, red7/star20, green5, purple11, yellow0 and cyan0.','The retained blue L3 uses its existing complete q0 orientation.'],exactCompetitorCopy:false};
}
