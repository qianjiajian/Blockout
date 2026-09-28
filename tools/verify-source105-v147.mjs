import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const sourceFile='.codex-temp/remaining98-v111/middle/lv105/source-review-105.json';
const sourceHash='359c11b91a443365e942ac18d8696a249b958df10911b7c2b582442522a21787';
const shapeKey=cells=>cells.map(p=>p.join(',')).sort().join(';');
const shape=(w,h)=>shapeKey(Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]));
const kinds={V2:shape(1,2),V3:shape(1,3),H2:shape(2,1),H3:shape(3,1),SQ2:shape(2,2),L3:shapeKey([[0,0],[0,1],[1,1]])};
export function verifySource105(data){
 const l=data.level;assert.equal(l.id,105);assert.equal(digest(fs.readFileSync(sourceFile)),sourceHash);
 const source=JSON.parse(fs.readFileSync(sourceFile)),bindings={[sourceFile]:sourceHash};
 for(const row of source.evidence){assert.equal(digest(fs.readFileSync(row.path)),row.sha256);bindings[row.path]=row.sha256;}
 const stages={opening:null,cover2:'n105-c2',cover5:'n105-c5'},mapping=[];
 assert.equal(l.blocks.length,17);assert.equal(l.shutters.length,2);
 for(const [stage,rows]of Object.entries(source.sourceFacts.pieceLedger))rows.forEach((s,i)=>{
  const id=`n105-${stage}-${i+1}`,b=l.blocks.find(b=>b.id===id);assert(b,id);
  assert(Object.keys(b).every(k=>['id','x','y','shape','color','layers','shutterId'].includes(k)),'No source-external block properties');
  assert.equal(b.color,s.color);assert.equal(b.shutterId??null,stages[stage]);assert.deepEqual(b.layers??[b.color],s.inner?[s.color,s.inner]:[s.color]);
  let allowed=[s.shape];if(stage==='cover2'&&s.inner)allowed=['V3','H3'];if(stage==='cover5')allowed=['SQ2'];
  assert(allowed.some(k=>shapeKey(b.shape)===kinds[k]),'Exact allowed native carrier '+id);
  mapping.push({id,stage,sourceColor:s.color,sourceShape:s.shape,sourceCore:s.inner??null,shapeChanged:!kinds[s.shape]||shapeKey(b.shape)!==kinds[s.shape],candidateCells:b.shape});
 });
 for(const [id,count,area]of [['n105-c2',2,24],['n105-c5',5,12]]){const s=l.shutters.find(s=>s.id===id);assert(s);assert.equal(s.count,count);assert.equal(s.width*s.height,area);assert(Object.keys(s).every(k=>['id','x','y','width','height','count'].includes(k)));}
 const expected=[['blue',0],['pink',1],['red',2],['green',3],['yellow',5],['cyan',5],['purple',6]];
 assert.equal(l.gates.length,7);for(const [color,frozen]of expected){const g=l.gates.find(g=>g.color===color);assert(g);assert.equal(g.frozen??0,frozen);assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen'].includes(k)));}
 for(const k of ['generators','elevators','conveyors','flipDoors','coloredGrids'])assert(!l[k]?.length);
 return{passed:true,sourceFile,sourceHash,bindings,mapping,sourceOpening:5,sourceTotal:17,sourceHiddenCounts:[9,3],sourceShells:4,sourceIceGates:[1,2,3,5,5,6],adaptation:{shellCarriers:'Source L/T shells have no supported native complete shell art; two area-3 shells become bars, two area-4 shells become SQ2. Original outer/core, count and cohort retained.',lastT:'After the two SQ2 shell adaptations, retaining a T4 cannot tile any area-12 rectangle: two SQ2 contribute balanced checkerboard cells while T4 has imbalance 2. All even-area rectangles are balanced. The ordinary red T4 becomes same-area SQ2.',orientation:'Two ordinary pink L3 use the existing native corner footprint; changed source orientation explicitly recorded.',sourceGeometryCopied:false},hiddenUnknownFilled:false};
}
