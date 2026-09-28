import fs from 'node:fs';import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const sourceFile='deliverables/remake111-120-v146-20260924/source116-reviewed.json';
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),shapes={SINGLE:rect(1,1),H2:rect(2,1),V2:rect(1,2),V3:rect(1,3),SQ2:rect(2,2),L3:[[0,0],[0,1],[1,1]],L4:[[0,0],[1,0],[2,0],[0,1]]};
const sk=s=>{const x=Math.min(...s.map(p=>p[0])),y=Math.min(...s.map(p=>p[1]));return JSON.stringify(s.map(([a,b])=>[a-x,b-y]).sort(([x,y],[a,b])=>y-b||x-a));};
export function checkSource116(level,api){
 assert.equal(level.id,116);api.validateLevel(level);const bytes=fs.readFileSync(sourceFile);assert.equal(digest(bytes),'670c5133edd49744ef0e11a41bbe7df35155b2da9b7c621ff85c7a8d9b387ff1');const source=JSON.parse(bytes),known=new Set(),shrunk=new Set([1,2,3,5,7,8]);
 assert.equal(level.blocks.length,28);assert.equal(level.generators?.length,2);assert.equal(level.shutters?.length,1);const cover=level.shutters[0];assert.deepEqual([cover.count,cover.width,cover.height],[9,6,3]);assert(!cover.skin||cover.skin==='shutter');
 for(const [group,prefix]of [['opening','o'],['cover9','c'],['leftQueue','l'],['rightQueue','r']])for(const [i,[color,kind,props={}]]of source[group].entries()){
  const index=i+(group.endsWith('Queue')?0:1),id='r147-116-'+prefix+index,b=level.blocks.find(b=>b.id===id);assert(b,id);known.add(id);
  assert(Object.keys(b).every(k=>['id','x','y','shape','color','layers','frozen','shutterId'].includes(k)));
  assert.equal(b.color,color);assert.deepEqual(b.layers,props.layers);assert.equal(b.frozen,props.frozen);
  const actualKind=group==='opening'&&shrunk.has(index)?'SINGLE':group==='cover9'&&index===5?'H2':kind;assert.equal(sk(b.shape),sk(shapes[actualKind]),id+':shape');
  assert.equal(b.shutterId,group==='cover9'?cover.id:undefined);
 }
 assert.equal(known.size,28);
 for(const [group,prefix]of [['leftQueue','l'],['rightQueue','r']]){const queue=source[group].map((_,i)=>'r147-116-'+prefix+i);assert(level.generators.some(g=>JSON.stringify(g.queueBlockIds)===JSON.stringify(queue)));}
 for(const g of level.generators)assert(Object.keys(g).every(k=>['id','side','offset','rimMount','rimSpan','rimAnchor','spawn','queueBlockIds','trigger'].includes(k)));
 assert.deepEqual(level.gates.map(g=>`${g.color}:${g.frozen??0}`).sort(),['blue:4','cyan:8','green:7','purple:20','red:0','yellow:6']);
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen','portals'].includes(k)));
 for(const k of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length);
 const sourceBindings=Object.fromEntries(source.evidence.map(r=>[r.file,r.sha256]));sourceBindings[sourceFile]=digest(bytes);for(const[p,h]of Object.entries(sourceBindings))assert.equal(digest(fs.readFileSync(p)),h);
 return{passed:true,level:116,sourceFile,sourceBindings,observedBodies:28,authoredBodies:28,openingSourceArea:44,openingAuthoredArea:38,hiddenKnownArea:18,sourceClosedArea:20,authoredClosedArea:18,queueCount:4,shellCount:1,bodyIce:[14,14],
  adaptations:['Six ordinary V2 bodies each shrink by one cell to fit the six-cell opening deficit, retaining all17 identities and mechanical carriers. This is an exact area adjustment, not a proof of globally fewest changed bodies.','The seven observed hidden bodies fill a6x3 rectangle; one cyan V2 uses a native H2, with unchanged area. Two source covered cells were actually empty.','Remove duplicate green18 mouth and retain green7 plus all other source gate initial values.','Native source L3/L4 orientation substitutions retain body area, colors, inventory order and all properties.'],exactCompetitorCopy:false};
}
