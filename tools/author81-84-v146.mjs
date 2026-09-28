import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {loadApi as loadCore} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {campaignCadence} from './campaign31-200-plan-v145.mjs';
import {loadSpatialApi,searchSpatial,replayDomain,compileSpatial} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {search} from '../.codex-temp/remake31-40-v141/agent31-34/search-monotone.mjs';
import {searchKeyRoute} from '../deliverables/remake81-90-v146-20260924/agent81-84/search-key-route.mjs';
export const OUT='deliverables/remake81-90-v146-20260924/agent81-84';
export const BASE='deliverables/remake31-200-v145-20260924/baseline.json';
export const H3=[[0,0],[1,0],[2,0]];
export const SHAPES={S:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3,V3:[[0,0],[0,1],[0,2]],Q:[[0,0],[1,0],[0,1],[1,1]],L3:[[0,0],[0,1],[1,1]],L4:[[0,0],[1,0],[2,0],[0,1]]};
export const save=(name,data)=>{fs.mkdirSync(OUT,{recursive:true});const file=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return file;};
export async function loadApi(){return {...(await loadCore()).api,...await loadSpatialApi()};}
export function makeBase(id){const row=JSON.parse(fs.readFileSync(BASE)).levels[id-1],l=structuredClone(row.level);for(const k of ['blocks','gates','shutters','generators','hint','solution'])delete l[k];l.difficulty=campaignCadence().rows.find(r=>r.id===id).difficulty;l.preservedMoveTarget=row.starTargets.moveTarget;return l;}
export function rng(seed){let s=seed>>>0;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const shuffle=(a,r)=>a.map(v=>[r(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
export function source81(){
 const dir='.codex-temp/video-audit-71-100/81-90/samples1s/',frames=[1,8,14,22,30,40].map(n=>dir+'sec-'+String(n).padStart(5,'0')+'.jpg');
 const colors=[['blue','green'],['green','yellow'],['red','green'],['green','red'],['yellow','blue'],['blue','yellow'],['yellow','red'],['red','blue']];
 const blocks=colors.flatMap((row,y)=>row.map((color,col)=>({id:`s81-${y}-${col}`,x:col*3,y,shape:H3,color})));
 Object.assign(blocks.find(b=>b.id==='s81-2-0'),{layers:['red','blue'],lockedBy:'blue-key',lockCount:1});
 Object.assign(blocks.find(b=>b.id==='s81-2-1'),{keyId:'blue-key'});
 Object.assign(blocks.find(b=>b.id==='s81-3-0'),{layers:['green','yellow']});
 Object.assign(blocks.find(b=>b.id==='s81-5-0'),{lockedBy:'red-key',lockCount:2});
 for(const id of ['s81-6-1','s81-7-0'])Object.assign(blocks.find(b=>b.id===id),{keyId:'red-key'});
 return {id:81,status:'fresh-frame-reviewed',openingEvidence:frames[0],bindings:Object.fromEntries(frames.map(p=>[p,digest(fs.readFileSync(p))])),blocks,gates:[{id:'source-red',color:'red',side:'top',offset:0,size:3,frozen:4},{id:'source-green',color:'green',side:'top',offset:3,size:3},{id:'source-yellow',color:'yellow',side:'bottom',offset:0,size:3,frozen:13},{id:'source-blue',color:'blue',side:'bottom',offset:3,size:3,frozen:8}],corrections:[{field:'opening/full shape',old:'16 H2, area32',verified:'16 H3, area48',reason:'Untouched 6x8 rectangular board: each half-width bar spans three square cells; all 48 cells occupied.'},{field:'shell count',old:1,verified:2,reason:'Red locked1 carrier shows blue core after matching green blue-key exits: sec00008. Green carrier has yellow core. Gate colors independently visible after thaw at sec00014 and sec00040.'}],unknown:[],hidden:[],sourceVideo:'C:/Users/Administrator/Desktop/block out/参考视频/81-90.mp4'};
}
export function generate81(seed){
 const r=rng(seed),src=source81(),l=makeBase(81),bag=src.blocks.map(b=>structuredClone(b)),placed=[];
 const place=i=>{if(i===16)return true;const x=(i%2)*3,y=Math.floor(i/2);for(const b of shuffle(bag.filter(b=>!placed.includes(b)),r)){if((i%2&&placed[i-1].color===b.color)||(i>=2&&placed[i-2].color===b.color))continue;placed.push(b);if(place(i+1))return true;placed.pop();}return false;};assert(place(0));
 l.blocks=placed.map((b,i)=>({...b,x:(i%2)*3,y:Math.floor(i/2),id:b.id.replace('s81','r147-81')}));
 const templates=[...['top','bottom'].flatMap(side=>Array.from({length:4},(_,x)=>[side,x,3])),...['left','right'].flatMap(side=>Array.from({length:8},(_,y)=>[side,y,1]))],used=[];
 l.gates=shuffle(src.gates,r).map(g=>{let p;do{p=templates[Math.floor(r()*templates.length)];}while(used.some(q=>q[0]===p[0]&&q[1]<p[1]+p[2]&&p[1]<q[1]+q[2]));used.push(p);return{...g,id:g.id.replace('source','r147-81'),side:p[0],offset:p[1],size:p[2]};});
 return {activeRuleVersion:'1.47.0',seed,level:l,sourceReview:OUT+'/source81.json',sourceAdaptation:{shapeChanges:[],colorMapping:'identity',mechanisms:'Preserve both observed shells, exact key groups, 4/8/13 gate bindings and all 16 H3.'},originality:{layoutIntent:'Reorder the two aligned three-cell columns and relocate exits, changing color adjacency and dependency paths; the fixed sixteen H3 inventory constrains carrier boundaries.',alignment:'Eight horizontal rows with aligned center seam.',changes:'Local permutation is not global recoloring, mirror or rotation.',constraints:'All 48 cells, original H3 shapes, two shells, three keys/two locks and gate ice preserved.'},design:{primaryMechanism:'Two key groups constrain red-shell and blue carriers, while yellow13 requires all nonyellow clear events before release.',concreteDecision:'H3 parking must reserve a continuous three-cell lane between gate fronts and locked carriers.'}};
}
const relaxed=l=>{const p=structuredClone(l);for(const b of p.blocks){delete b.keyId;delete b.lockedBy;delete b.lockCount;}return p;};
export function source82(){
 const dir='.codex-temp/video-audit-71-100/81-90/samples1s/',frames=[53,54,55,57,63,73,91].map(n=>dir+'sec-'+String(n).padStart(5,'0')+'.jpg');
 const pieces=[['green','L4',0,1],['purple','S',1,1],['orange','S',2,1],['pink','S',3,1],['yellow','V2',4,0],['purple','V2',5,0],['cyan','H3',1,2],['purple','V2',4,2],['red','S',2,3],['yellow','S',3,3],['purple','L3',4,3],['red','V2',0,4],['pink','V2',1,4],['green','H2',2,4],['purple','H2',2,5],['green','S',4,5],['yellow','Q',0,6],['blue','H2',3,6],['green','H2',3,7],['pink','V2',5,6]];
 const blocks=pieces.map(([color,kind,x,y],i)=>({id:'s82-'+i,color,shape:structuredClone(SHAPES[kind]),sourceShapeClass:kind,x,y}));
 blocks[0].shape=[[0,0],[0,1],[0,2],[1,2]];blocks[10].shape=[[1,0],[0,1],[1,1]];
 blocks[5].keyId='blue-key';blocks[13].keyId='blue-key';blocks[14].keyId='red-key';Object.assign(blocks[11],{lockedBy:'red-key',lockCount:1});Object.assign(blocks[16],{lockedBy:'blue-key',lockCount:2});blocks[6].frozen=3;
 return {id:82,status:'fresh-frame-reviewed',openingEvidence:frames[0],bindings:Object.fromEntries(frames.map(p=>[p,digest(fs.readFileSync(p))])),blocks,gates:[{id:'source-red',color:'red',side:'top',offset:1,size:1,frozen:6},{id:'source-blue',color:'blue',side:'top',offset:4,size:2,frozen:7},{id:'source-purple',color:'purple',side:'right',offset:3,size:2},{id:'source-yellow',color:'yellow',side:'bottom',offset:0,size:2},{id:'source-green',color:'green',side:'bottom',offset:3,size:2,frozen:4},{id:'source-pink',color:'pink',side:'left',offset:2,size:2,frozen:11},{id:'source-cyan',color:'cyan',side:'left',offset:4,size:1,frozen:13},{id:'source-orange',color:'orange',side:'left',offset:5,size:2,frozen:9}],colorMapping:{lime:'cyan',magenta:'pink',red:'red',blue:'blue',green:'green',yellow:'yellow',purple:'purple',orange:'orange'},openingArea:40,openingBlocks:20,corrections:[{field:'board',old:'7x9 / 58',verified:'6x8 / 40 occupied cells, with concave top and four empty boundary recess cells',reason:'Native frame square-cell grid at x37+36k/y180+36j, source frame has 6 columns and 8 rows.'},{field:'inventory',old:'19 bodies, 36 cells, 7 colors, H2 ice',verified:'20 bodies, 40 cells, 8 colors including lime/cyan; ice carrier H3; 6 V2 rather than5; upper-left green L4 rather thanL3',reason:'Purple V2 and right L3 are independent adjacent same-color bodies: L3 clears at54 and V2 at55 while other remains. Lime ice melts at57 and still differs from dark green.'}],unknown:[],hidden:[],sourceVideo:'C:/Users/Administrator/Desktop/block out/参考视频/81-90.mp4'};
}
export function tileBodies(level,bodies,r){
 const legal=new Set(level.playable.map(p=>p.join(','))),used=new Set(),placed=[],remaining=bodies.slice();let calls=0;
 const recurse=()=>{if(++calls>25000)return false;if(!remaining.length)return true;let anchor;for(const p of level.playable){if(!used.has(p.join(','))){anchor=p;break;}}if(!anchor)return false;
  const choices=remaining.map(b=>({b,p:r()*b.shape.length})).sort((a,b)=>b.p-a.p).map(x=>x.b);
  for(const b of choices)for(const[dx,dy]of shuffle(b.shape,r)){
   const x=anchor[0]-dx,y=anchor[1]-dy,cells=b.shape.map(([a,c])=>[x+a,y+c]);if(cells.some(p=>!legal.has(p.join(','))||used.has(p.join(','))))continue;
   if(placed.some(q=>q.color===b.color&&q.shape.some(([a,c])=>cells.some(([u,v])=>Math.abs(q.x+a-u)+Math.abs(q.y+c-v)===1))))continue;
   const idx=remaining.indexOf(b);remaining.splice(idx,1);placed.push({...b,x,y});for(const p of cells)used.add(p.join(','));if(recurse())return true;for(const p of cells)used.delete(p.join(','));placed.pop();remaining.splice(idx,0,b);
  }return false;
 };return recurse()?placed:null;
}
export function generate82(seed){
 const r=rng(seed),s=source82(),l=makeBase(82),bodies=s.blocks.map(b=>{const q={...b,id:b.id.replace('s82','r147-82'),shape:structuredClone(SHAPES[b.sourceShapeClass])};delete q.sourceShapeClass;return q;});
 bodies.push({id:'r147-82-fill-cyan',color:'cyan',shape:SHAPES.H2},{id:'r147-82-fill-orange',color:'orange',shape:SHAPES.H2});
 l.blocks=tileBodies(l,bodies,r);if(!l.blocks)return null;
 const used=[],templates=[...['left','right'].flatMap(side=>Array.from({length:5},(_,i)=>[side,i+1,2])),...['top','bottom'].flatMap(side=>Array.from({length:3},(_,i)=>[side,i+1,2]))];
 l.gates=shuffle(s.gates,r).map(g=>{let p,attempt=0;do{p=templates[Math.floor(r()*templates.length)];if(++attempt>100)return null;}while(used.some(q=>q[0]===p[0]&&q[1]<p[1]+p[2]&&p[1]<q[1]+q[2]));used.push(p);return{...g,id:g.id.replace('source','r147-82'),side:p[0],offset:p[1],size:p[2]};});if(l.gates.some(g=>!g))return null;
 return {activeRuleVersion:'1.47.0',seed,level:l,sourceReview:OUT+'/source82.json',sourceAdaptation:{colorMapping:s.colorMapping,shapeChanges:[{source:'s82-0',reason:'Mirror/rotation of original green L4 unsupported by q0 art; use existing native H3+one-under-left L4 of equal area.'},{source:'s82-10',reason:'Source upper-right L3 requires mirrored image; use q0 upper-left L3 of equal area.'}],addedBodies:[{id:'r147-82-fill-cyan',reason:'Fixed 44-cell board needs four extra cells relative to40 source cells; two distinct native H2 complete coverage.'},{id:'r147-82-fill-orange',reason:'Second H2 supplies the remaining two required cells; no added mechanism.'}]},originality:{layoutIntent:'Mixed aligned bar/square bands across preserved concave board, all carriers relocated.',alignment:'Prefer row and column carrier edges.',changes:'Different adjacency, native L silhouettes and boundary exits; not source coordinate copy.',constraints:'Fixed44 cells, original20 carrier colors and all keys/ice/gate bindings retained with only two filling H2.'},design:{primaryMechanism:'Two matched-key groups release red V2 and yellow SQ2 while ice3 protects a three-cell cyan bar.',concreteDecision:'Multi-cell parking coordinates work space between two ordinary gates and six initially frozen gate colors.'}};
}
export async function main(){const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');const api=await loadApi(),[mode='scan81',arg='1',count='100']=process.argv.slice(2);fs.mkdirSync(OUT,{recursive:true});
 if(mode==='source'){const id=Number(arg)===82?82:81,file=OUT+'/source'+id+'.json';assert(!fs.existsSync(file));fs.writeFileSync(file,JSON.stringify(id===82?source82():source81(),null,2)+'\n');console.log(file);return;}
 if(mode==='scan82'){let witnesses=0;const stats={};for(let seed=Number(arg);seed<Number(arg)+Number(count);seed++){
  const d=generate82(seed);if(!d)continue;try{api.validateLevel(d.level);}catch(e){stats.invalid=(stats.invalid??0)+1;continue;}
  let r=searchKeyRoute(d.level,{floor:11,maxStates:10000,maxMilliseconds:150,weight:100,orderSeed:seed%22});stats[r.status+':'+(r.cost??r.maxClearsSeen)]=(stats[r.status+':'+(r.cost??r.maxClearsSeen)]??0)+1;if(seed%100===0)console.log(JSON.stringify({seed,stats}));if(r.status==='unknown'&&r.maxClearsSeen>=8){console.log(JSON.stringify({partial:save('partial82-seed'+seed,d),maxClears:r.maxClearsSeen}));r=searchKeyRoute(d.level,{floor:11,maxStates:100000,maxMilliseconds:3000,weight:100,orderSeed:seed%22});}if(r.status!=='witness'||r.cost<5)continue;
  const replay=api.replayRevisedRoute(d.level,r.drags);if(!replay.valid||!replay.complete)continue;
  const proof=checkSymmetryFloor(relaxed(d.level),{floor:5,maxStates:100000,maxMilliseconds:3000});if(proof.status==='relaxed-shortcut')continue;d.drags=r.drags;const file=save('candidate82-seed'+seed,d);console.log(JSON.stringify({file,upper:r.cost,proof:{...proof,relaxedRoute:undefined}}));if(proof.thresholdProven||++witnesses>=3)return;
 }console.log(JSON.stringify({stats}));return;}
 if(mode==='scan81'){let best=0;const stats={};for(let seed=Number(arg);seed<Number(arg)+Number(count);seed++){
  const d=generate81(seed);try{api.validateLevel(d.level);}catch{continue;}
  const quick=search(relaxed(d.level),{floor:24,maxStates:10000,maxMilliseconds:250,weight:100});stats[quick.status+':'+(quick.cost??quick.maxClears)]=(stats[quick.status+':'+(quick.cost??quick.maxClears)]??0)+1;if(seed%100===0)console.log(JSON.stringify({seed,stats}));if(quick.status!=='witness'||quick.cost<11)continue;
  const rr=searchKeyRoute(d.level,{floor:21,maxStates:35000,maxMilliseconds:900,weight:100,orderSeed:seed%16});if(rr.status!=='witness')continue;const replay=api.replayRevisedRoute(d.level,rr.drags);if(!replay.valid||!replay.complete||replay.nonClearingDrags<16)continue;
  const proof=checkSymmetryFloor(relaxed(d.level),{floor:16,maxStates:30000,maxMilliseconds:1500});if(proof.status==='relaxed-shortcut'&&proof.relaxedNonClearingDrags<12)continue;
  d.drags=rr.drags;const file=save('candidate81-seed'+seed,d);console.log(JSON.stringify({file,upper:replay.nonClearingDrags,proof:{...proof,relaxedRoute:undefined}}));if(proof.thresholdProven)return;if(++best>=5)return;
 }console.log(JSON.stringify({stats}));return;}
 if(mode==='route'){const d=JSON.parse(fs.readFileSync(arg));const r=searchSpatial(d.level,api,{floor:Number(process.env.FLOOR??31),maxStates:Number(process.env.STATES??300000),maxMilliseconds:Number(process.env.MS??60000),weight:100,orderSeed:Number(process.env.ORDER??0),diagnosticTrace:true});if(r.drags)d.drags=r.drags;console.log(JSON.stringify({file:save('route'+d.level.id,{...d,search:r}),...r,drags:undefined,partialDrags:undefined}));return;}
 if(mode==='proof'){const d=JSON.parse(fs.readFileSync(arg)),floor=campaignCadence().rows.find(r=>r.id===d.level.id).range[0];const r=searchSpatial(d.level,api,{floor,maxStates:Number(process.env.STATES??500000),maxMilliseconds:Number(process.env.MS??60000),maxTransitions:50000000,prove:true});console.log(JSON.stringify({file:save('proof'+d.level.id,{levelSha256:digest(d.level),proof:r}),...r,drags:undefined}));return;}
 throw Error('Unknown mode');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
