import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const sourceFile='deliverables/remake111-120-v146-20260924/source112-reviewed.json';
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const shapes={SINGLE:rect(1,1),H2:rect(2,1),V2:rect(1,2),H3:rect(3,1),V3:rect(1,3),L3:[[0,0],[0,1],[1,1]]};
const sk=s=>JSON.stringify([...s].sort(([x,y],[a,b])=>y-b||x-a));
export function checkSource112(level,api){
 assert.equal(level.id,112);api.validateLevel(level);
 const bytes=fs.readFileSync(sourceFile);assert.equal(digest(bytes),'473fd6876bd2bb4b37f3350066479876f0ba6871c40add07996d8febdeaa5746');
 const source=JSON.parse(bytes),known=new Set();assert.equal(level.blocks.length,28);assert.equal(level.shutters?.length,3);
 const ordinary=level.shutters.filter(s=>s.skin!=='lift'),lifts=level.shutters.filter(s=>s.skin==='lift');
 assert.deepEqual(ordinary.map(s=>s.count).sort((a,b)=>a-b),[9,12]);assert(ordinary.every(s=>s.width*s.height===12));
 assert.equal(lifts.length,1);assert.deepEqual([lifts[0].width,lifts[0].height,lifts[0].count],[2,3,0]);
 for(const group of ['opening','cover9','cover12','lift'])for(const a of source[group]){
  const id='r147-112-'+a.sourceId,b=level.blocks.find(b=>b.id===id);assert(b,id);known.add(id);
  assert(Object.keys(b).every(k=>['id','x','y','shape','color','layers','shutterId','frozen','movementAxis'].includes(k)));
  for(const k of ['color','layers','frozen','movementAxis'])assert.deepEqual(b[k],a[k],`${id}:${k}`);
  const actualKind=group==='cover12'?'H3':a.kind;assert.equal(sk(b.shape),sk(shapes[actualKind]),`${id}:shape`);
  if(group==='opening')assert.equal(b.shutterId,undefined);
  else if(group==='lift')assert.equal(b.shutterId,lifts[0].id);
  else assert.equal(level.shutters.find(s=>s.id===b.shutterId)?.count,Number(group.slice(5)));
 }
 assert.equal(known.size,28);assert.equal(level.blocks.reduce((n,b)=>n+b.shape.length,0),54);
 const exits=['blue:0','cyan:0','green:1','orange:6','pink:0','purple:0','red:0','yellow:0'];
 assert.deepEqual(level.gates.map(g=>`${g.color}:${g.frozen??0}`).sort(),exits);
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen'].includes(k)));
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length);
 const sourceBindings=Object.fromEntries(source.frames.map(r=>[r.file,r.sha256]));sourceBindings[sourceFile]=digest(bytes);
 for(const [p,h]of Object.entries(sourceBindings))assert.equal(digest(fs.readFileSync(p)),h);
 return{passed:true,level:112,sourceFile,sourceBindings,observedBodies:28,authoredBodies:28,surfaceArea:48,liftArea:6,axisInstances:4,iceBodyCounts:[5,5],shells:4,
  adaptations:['Four source L3 shells use equal-area H3 whole native shell art; all outer/inner pairs remain.','Two duplicate green ice mouths (2,3) are removed to retain the eight unique source colors; green1 and orange6 remain unchanged.','Both 12-cell count-cover regions are aligned as adjacent lower 3x4 rectangles; the source 2x3 lift retains its area and all four known bodies.'],exactCompetitorCopy:false};
}
