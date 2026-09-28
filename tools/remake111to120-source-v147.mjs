import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from './revised-preview-validation-v160.mjs';

const histogram=items=>Object.fromEntries([...items.reduce((m,x)=>(m.set(x,(m.get(x)??0)+1),m),new Map())].sort(([a],[b])=>a.localeCompare(b)));
const signature=b=>JSON.stringify({layers:b.layers??[b.color],bomb:b.timedBombSeconds??null});
export function checkSource113(level,api){
 assert.equal(level.id,113);api.validateLevel(level);
 const sourceFile='deliverables/remake111-120-v146-20260924/source113-reviewed.json',bytes=fs.readFileSync(sourceFile);
 assert.equal(digest(bytes),'f3becd46075172a6dfa08f062396b87539a3d8bb0c296a78d29777287e969d0b');
 const source=JSON.parse(bytes),rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
 const shapes={SINGLE:rect(1,1),H2:rect(2,1),V2:rect(1,2),H3:rect(3,1),V3:rect(1,3),SQ2:rect(2,2),L3:[[0,0],[0,1],[1,1]],L4:[[0,0],[1,0],[2,0],[0,1]],T4:[[1,0],[0,1],[1,1],[2,1]]};
 const changes={lower0:'SQ2',lower6:'H3',upper2:'H3',lift2:'V3'},known=new Set(),sk=s=>JSON.stringify([...s].sort(([x,y],[a,b])=>y-b||x-a));
 assert.equal(level.shutters?.length,3);assert.deepEqual(level.shutters.filter(s=>s.skin!=='lift').map(s=>s.count).sort((a,b)=>a-b),[1,7]);
 const lift=level.shutters.filter(s=>s.skin==='lift');assert.equal(lift.length,1);assert.equal(lift[0].width,3);assert.equal(lift[0].height,3);assert.equal(lift[0].count,0);
 for(const group of ['opening','lower','upper','lift'])for(const original of source[group]){
  const id='r147-113-'+original.sourceId,b=level.blocks.find(b=>b.id===id);assert(b,id);known.add(id);
  assert(Object.keys(b).every(k=>['id','x','y','shape','color','layers','shutterId','frozen'].includes(k)));
  assert.equal(b.color,original.color);assert.deepEqual(b.layers,original.layers);assert.equal(b.frozen,original.frozen);assert.equal(sk(b.shape),sk(shapes[changes[original.sourceId]??original.kind]));
  if(group==='opening')assert.equal(b.shutterId,undefined);
  else if(group==='lift')assert.equal(b.shutterId,lift[0].id);
  else assert.equal(level.shutters.find(s=>s.id===b.shutterId)?.count,group==='lower'?1:7);
 }
 const extra=level.blocks.filter(b=>!known.has(b.id));assert.equal(known.size,21);assert.equal(level.blocks.length,28);
 assert.equal(extra.reduce((n,b)=>n+b.shape.length,0),18);assert.equal(level.blocks.reduce((n,b)=>n+b.shape.length,0),78);
 for(const b of extra){assert(Object.keys(b).every(k=>['id','x','y','shape','color','shutterId'].includes(k)));assert(!b.shutterId||level.shutters.find(s=>s.id===b.shutterId)?.count===7);}
 assert.deepEqual(histogram(level.gates.map(g=>`${g.color}:${g.frozen??0}`)),histogram(source.sourceGates.map(([color,ice])=>`${color}:${ice}`)));
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen','portals'].includes(k)));
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length);
 const sourceBindings=Object.fromEntries(source.frames.map(r=>[r.file,r.sha256]));sourceBindings[sourceFile]=digest(bytes);
 for(const [p,h]of Object.entries(sourceBindings))assert.equal(digest(fs.readFileSync(p)),h);
 return{passed:true,level:113,sourceFile,sourceBindings,observedBodies:21,authoredBodies:28,sourceSurfaceArea:51,authoredSurfaceArea:69,additionalLiftArea:9,
  shapeAdaptations:changes,adaptations:['Add exactly18 ordinary cells:14 to the visible middle and4 to the upper curtain.','Two unsupported native shell footprints become equal-area complete native shapes.','Original native shapes cannot tile the preserved 3x3 lift or the chosen5x5 upper region; one equal-area three-cell shape in each is replaced.'],exactCompetitorCopy:false};
}
export function checkSource119(level,api){
 assert.equal(level.id,119);api.validateLevel(level);
 const sourceFile='deliverables/remake111-120-v146-20260924/source119-reviewed-1790269450.json',bytes=fs.readFileSync(sourceFile);
 assert.equal(digest(bytes),'554d47cedcf7cb27c12c4d046456fe2ceae23fdea14a1606dad502da7afa4bea');
 const source=JSON.parse(bytes),retained=new Set(),shapeKey=s=>JSON.stringify([...s].sort(([x,y],[a,b])=>y-b||x-a));
 assert.equal(level.generators?.length,2);assert.equal(level.shutters?.length,3);
 assert.deepEqual(level.shutters.map(s=>s.count).sort((a,b)=>a-b),[6,12,18]);assert(level.shutters.every(s=>!s.skin||s.skin==='shutter'));
 for(const [group,bodies]of Object.entries(source.sourceInventory))for(const original of bodies){
  const b=level.blocks.find(b=>b.id===original.id);assert(b,`Missing known body ${original.id}`);retained.add(b.id);
  assert.equal(b.color,original.color);assert.equal(shapeKey(b.shape),shapeKey(original.shape));assert.equal(b.frozen,original.frozen);
  assert(Object.keys(b).every(k=>['id','x','y','shape','color','shutterId','frozen'].includes(k)));
  if(group.startsWith('h'))assert.equal(level.shutters.find(s=>s.id===b.shutterId)?.count,Number(group.slice(1)));
  else assert.equal(b.shutterId,undefined);
 }
 for(const group of ['q0','q1']){
  const ids=source.sourceInventory[group].map(b=>b.id);assert(level.generators.some(g=>JSON.stringify(g.queueBlockIds)===JSON.stringify(ids)),'Preserve complete fixed source queue order');
 }
 const extra=level.blocks.filter(b=>!retained.has(b.id));assert.equal(retained.size,34);
 assert.equal(extra.reduce((n,b)=>n+b.shape.length,0),29,'Only actual 65→94 coverage deficit is filled');
 for(const b of extra){assert(Object.keys(b).every(k=>['id','x','y','shape','color','shutterId'].includes(k)));assert(!level.generators.some(g=>g.queueBlockIds.includes(b.id)),'No invented queue inventory');}
 assert.equal(level.blocks.filter(b=>!level.generators.some(g=>g.queueBlockIds.includes(b.id))).reduce((n,b)=>n+b.shape.length,0),94);
 const exits=['orange:0','blue:1','green:4','red:7','yellow:8','purple:12','pink:12','cyan:18'];
 assert.deepEqual(histogram(level.gates.map(g=>`${g.color}:${g.frozen??0}`)),histogram(exits));
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen','portals'].includes(k)));
 for(const k of ['flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length);
 const sourceBindings={...source.sourceBindings,[sourceFile]:digest(bytes)};
 for(const [p,h]of Object.entries(sourceBindings))assert.equal(digest(fs.readFileSync(p)),h);
 return{passed:true,level:119,sourceFile,sourceBindings,observedBodies:34,authoredBodies:level.blocks.length,sourceKnownQueueCount:4,sourceKnownHiddenBodies:19,
  adaptations:source.plannedAdaptations,unknownSourceFields:['Inner 18-ice mouth color remains unobserved. It is one of the four removed capacity-conflicting mouths; no invented color or initial value.'],exactCompetitorCopy:false};
}
export function checkSource118(level,api){
 assert.equal(level.id,118);api.validateLevel(level);assert.equal(level.blocks.length,24);
 const shapes={S:[[0,0]],H2:[[0,0],[1,0]],SQ2:[[0,0],[1,0],[0,1],[1,1]],L3:[[0,0],[0,1],[1,1]],L4:[[0,0],[1,0],[2,0],[0,1]],T4:[[1,0],[0,1],[1,1],[2,1]]};
 const source=[['purple','SQ2'],['cyan','T4'],['red','S'],['yellow','SQ2'],['green','S'],['green','S'],['yellow','H2'],['purple','H2'],['blue','S'],['purple','L3'],['cyan','SQ2',true],['red','H2'],['yellow','S'],['yellow','H2'],['green','S'],['red','H2'],['green','L4'],['blue','S'],['purple','L4'],['blue','L3'],['red','T4',false,'vertical'],['yellow','L3'],['yellow','S'],['blue','S']];
 const shapeKey=shape=>JSON.stringify([...shape].sort(([x,y],[a,b])=>y-b||x-a));
 const sig=b=>JSON.stringify([b.color,shapeKey(b.shape),Boolean(b.star),b.movementAxis??null]);
 for(const b of level.blocks){assert(Object.keys(b).every(k=>['id','x','y','shape','color','star','movementAxis'].includes(k)),'No extra body mechanics');assert.equal(api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns,0);}
 assert.deepEqual(histogram(level.blocks.map(sig)),histogram(source.map(([color,shape,star,movementAxis])=>sig({color,shape:shapes[shape],star,movementAxis}))),'Every known body color/shape/star/axis pairing retained after explicit native adaptation');
 const gateKey=g=>JSON.stringify([g.color,g.frozen??0,Boolean(g.star)]);
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen','star'].includes(k)));
 assert.deepEqual(histogram(level.gates.map(gateKey)),histogram([{color:'purple'},{color:'red',frozen:2},{color:'cyan',frozen:4},{color:'green',frozen:5},{color:'cyan',frozen:8,star:true},{color:'blue',frozen:10},{color:'yellow',frozen:12}].map(gateKey)));
 for(const k of ['generators','shutters','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length);
 const frames=[721,735,750,760,768].map(s=>`.codex-temp/video-audit-101-134/111-120/frames-1fps/sec-${String(s).padStart(4,'0')}.jpg`);
 return{passed:true,level:118,observedBodies:24,authoredBodies:24,observedArea:56,requiredArea:56,sourceBindings:Object.fromEntries(frames.map(p=>[p,digest(fs.readFileSync(p))])),
  adaptations:['One yellow T4 becomes SQ2 to reduce 8/24 irregular source bodies to the legal 7/24 without deleting a body or changing area.','Source orientations without complete native art are replaced by the q0 L3/L4/T4 of the same area; colors and the cyan star/red vertical axis remain paired.'],
  corrections:['Opening has 24 bodies, not 23.','Right green5 is one frozen exit, not a separate ordinary green exit.','Blue10 and yellow12 confirmed after ice clears.'],exactCompetitorCopy:false};
}
export function checkSource120(level,api){
 assert.equal(level.id,120);api.validateLevel(level);
 assert.equal(level.blocks.length,12,'11 observed bodies plus one plain SQ2 to fill the 4-cell deficit');
 const plain=[],mechanical=[];
 for(const b of level.blocks){
  assert(Object.keys(b).every(k=>['id','x','y','shape','color','layers','timedBombSeconds'].includes(k)),'No source-external body mechanics');
  assert.equal(api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns,0);
  assert.deepEqual([...b.shape].sort(([ax,ay],[bx,by])=>ay-by||ax-bx),[[0,0],[1,0],[0,1],[1,1]],'Every original and added body stays SQ2');
  assert(['red','green','blue','yellow'].includes(b.color));
  assert(!b.layers||b.color===b.layers[0]);
  ((b.layers?.length??1)>1||b.timedBombSeconds!==undefined?mechanical:plain).push(b);
 }
 const expected=[
  {layers:['yellow','blue']},{layers:['yellow','blue']},{layers:['green','blue']},
  {layers:['blue','red']},{layers:['red','blue']},{layers:['red','yellow'],timedBombSeconds:50},
  {color:'red',timedBombSeconds:15},{color:'red',timedBombSeconds:25},
 ];
 assert.deepEqual(histogram(mechanical.map(signature)),histogram(expected.map(signature)),'Preserve every observed shell pairing and bomb initial value');
 assert.equal(plain.length,4);
 for(const color of ['yellow','blue','green'])assert(plain.some(b=>b.color===color),'Preserve the observed plain '+color+' body');
 assert.deepEqual([...new Set(level.blocks.flatMap(b=>b.layers??[b.color]))].sort(),['blue','green','red','yellow']);
 assert.equal(level.gates.length,4);
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','side','offset','size','color','frozen'].includes(k)),'No source-external exit properties');
 assert.deepEqual(histogram(level.gates.map(g=>`${g.color}:${g.frozen??0}`)),histogram(['red:0','green:4','yellow:6','blue:10']));
 for(const k of ['generators','shutters','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,'Source has no '+k);
 const prefix='.codex-temp/video-audit-101-134/111-120/frames-1fps/';
 const frames=['sec-0972.jpg','sec-0990.jpg','sec-0993.jpg','sec-0996.jpg'].map(f=>prefix+f);
 return {passed:true,level:120,source:'local untouched opening and revealed gate colours',
  observedBodies:11,authoredBodies:12,observedArea:44,requiredArea:48,sourceColors:['red','green','blue','yellow'],
  sourceBindings:Object.fromEntries(frames.map(file=>[file,digest(fs.readFileSync(file))])),
  adaptations:[
   'Add exactly one ordinary SQ2 (4 cells) for the preserved 6×8 full board; retain all 11 observed attribute signatures.',
   'The observed 50-second timer appears on the inner yellow of a red/yellow shell. Our frozen rules attach it to the shell and disarm it upon the peel; retain 50 and explicitly acknowledge the semantic difference.',
  ],
  corrections:['The first plain yellow SQ2 is at source (0,0); the old truth anchor (2,0) is the empty opening region.'],
  exactCompetitorCopy:false,sourceCoordinatesCopied:false};
}
