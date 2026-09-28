import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {search} from '../../../.codex-temp/remake31-40-v141/agent31-34/search-monotone.mjs';
const ROOT='deliverables/remake31-200-v145-20260924/batches/lv141-150/root149';
const baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api}=await loadApi();
fs.mkdirSync(ROOT,{recursive:true});
const shapes=Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s=>[s.shapeId,s.cells]));
const piece=(id,shapeId,color,extra={})=>({id:'new149-'+id,shape:shapes[shapeId],color,...extra});
const opening=[piece('op-purple-L',4,'purple'),piece('op-green-S',1,'green'),piece('op-ice3',8,'red',{frozen:3}),
 piece('op-cyan-V',2,'cyan'),piece('op-red-S',1,'red'),piece('op-purple-S1',1,'purple'),piece('op-blue-V',2,'blue'),
 piece('op-yellow-L',4,'yellow'),piece('op-shell',8,'red',{layers:['red','purple']}),piece('op-purple-S2',1,'purple'),
 piece('op-blue-S',1,'blue'),piece('op-green-H',8,'green'),piece('op-red-H3',9,'red')];
const hidden6=[piece('c6-ice2',3,'purple',{layers:['purple','yellow'],frozen:2}),piece('c6-green',2,'green'),piece('c6-purple',8,'purple'),
 piece('c6-yellow',4,'yellow'),piece('c6-blue-S',1,'blue'),piece('c6-red',8,'red'),piece('c6-blue-H',8,'blue')];
const hidden14=[piece('c14-ice7',3,'purple',{layers:['purple','cyan'],frozen:7}),piece('c14-blue-H',8,'blue'),piece('c14-green',2,'green'),
 piece('c14-shell',2,'purple',{layers:['purple','cyan']})];
const hidden22=[piece('c22-blue-L4',10,'blue'),piece('c22-purple',7,'purple'),piece('c22-green-shell',9,'green',{layers:['green','cyan']}),
 piece('c22-ice13',3,'yellow',{frozen:13}),piece('c22-purple-shell',3,'purple',{layers:['purple','yellow']}),
 piece('c22-red-shell',9,'red',{layers:['red','cyan']})];
// Exhaustive native-carrier packing found a three-body solution: preserve the
// red SQ2, reassign the blue L4's area to R3x2, and the unavailable cyan L4 shell
// to V2. Total region area and all three source identities/layers are retained.
// Earlier four-body splits remain archived and are superseded for this reason.
const hidden25=[piece('c25-red',7,'red'),piece('c25-blue',21,'blue'),piece('c25-cyan-shell',2,'cyan',{layers:['cyan','yellow']})];
let rngState=Number(process.env.SEED??146149);
const random=()=>{rngState^=rngState<<13;rngState^=rngState>>>17;rngState^=rngState<<5;return (rngState>>>0)/4294967296;};
const shuffled=a=>a.map(v=>({v,k:random()})).sort((a,b)=>a.k-b.k).map(r=>r.v);
function tile(blocks,{x:ox,y:oy,width:W,height:H},adjacent,fixed=[]){
 const grid=Array(W*H).fill(-1),placed=[],unused=new Set(blocks.map((_,i)=>i));let visits=0;
 for(const {id,x,y}of fixed){const i=blocks.findIndex(b=>b.id===id);assert(i>=0);const b=blocks[i];for(const [dx,dy]of b.shape){assert(grid[(y+dy)*W+x+dx]===-1);grid[(y+dy)*W+x+dx]=i;}unused.delete(i);placed.push({...b,x:x+ox,y:y+oy});}
 function go(){
  if(++visits>20000)return false;
  const p=grid.indexOf(-1);if(p<0)return unused.size===0;
  const tx=p%W,ty=Math.floor(p/W),signatures=new Set();
  for(const i of shuffled([...unused])){
   const b=blocks[i],sig=JSON.stringify([b.shape,b.color,b.layers,b.frozen]);if(signatures.has(sig))continue;signatures.add(sig);
   for(const [sx,sy]of shuffled(b.shape)){
    const x=tx-sx,y=ty-sy,cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);
    if(cells.some(([cx,cy])=>cx<0||cy<0||cx>=W||cy>=H||grid[cy*W+cx]>=0))continue;
    if(adjacent&&cells.some(([cx,cy])=>[[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]].some(([nx,ny])=>nx>=0&&ny>=0&&nx<W&&ny<H&&grid[ny*W+nx]>=0&&blocks[grid[ny*W+nx]].color===b.color)))continue;
    cells.forEach(([cx,cy])=>grid[cy*W+cx]=i);unused.delete(i);placed.push({...b,x:x+ox,y:y+oy});
    if(go())return true;
    placed.pop();unused.add(i);cells.forEach(([cx,cy])=>grid[cy*W+cx]=-1);
   }
  }return false;
 }
 return go()?placed:null;
}
const regions=[{id:'new149-cover6',x:3,y:3,width:5,height:3,count:6},
 {id:'new149-cover14',x:0,y:3,width:3,height:3,count:14},
 {id:'new149-cover22',x:0,y:6,width:5,height:4,count:22},
 {id:'new149-cover25',x:5,y:6,width:3,height:4,count:25}];
const inventory=[hidden6,hidden14,hidden22,hidden25];
const write=(name,obj)=>{const file=ROOT+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});return file;};
const source={level:149,status:'partially-reviewed-not-source-PASS',activeRuleVersion:lock.activeVersion,
 sourceVideo:'C:/Users/Administrator/Desktop/block out/参考视频/145-149.mp4',firstStableSeconds:464,
 correction:{old:'Old truth used a frame after first H3 removal and miscounted shapes/region sizes.',
 openingPieces:13,openingCells:24,openingShapes:{L3:2,SINGLE:5,H2:3,V2:2,H3:1},ice:3,
 covers:[{count:22,width:5,height:4},{count:25,width:3,height:4},{count:6,width:5,height:3},{count:14,width:3,height:3}],
 gates:[{color:'yellow',frozen:29},{color:'cyan',frozen:32},{color:'purple',frozen:6},{color:'blue',frozen:15},{color:'green',frozen:4},{color:'red',frozen:0}]},
 evidenceRoot:'deliverables/remake141-150-v146-20260924/root149',
 hidden:{cover6:{frame:'hidden6.png',initialIce:2,correctedShell:{outer:'purple',inner:'yellow',evidence:'deliverables/remake31-200-v145-20260924/batches/lv141-150/source148/cross149-65.png',peeledAtVideoSeconds:65.4}},cover14:{frame:'frame80.png',initialIce:7,correctedShell:{outer:'purple',inner:'cyan',evidence:'deliverables/remake31-200-v145-20260924/batches/lv141-150/source148/cross149-93.png'}},
 cover22:{frame:'hidden22.png',initialIce:13},cover25:{frame:'frame109.png'}},
 provisionalDesignInventory:{opening,hidden6,hidden14,hidden22,hidden25},
 pending:['Known ice colors/layers now reviewed in source148/crosscheck149-evidence.json; bind evidence into final source table.',
 'Bind original video/frame hashes and fully review all source carrier-to-design mappings.',
 'Hidden25 three-body native solution established in carrier-proof-1790250664797.json; final source mapping must record blue L4 to R3x2 and cyan/yellow L4 shell to V2. Earlier extra-body drafts are superseded.']};
const sourceFile=write('source-review',source);console.log(JSON.stringify({sourceFile}));
const attempts=Number(process.env.ATTEMPTS??20),results=[];let bestClears=0;
for(let attempt=0;attempt<attempts;attempt++){
 const fixed=process.env.FIX_OPENING==='1'?[{id:'new149-op-red-H3',x:0,y:0},{id:'new149-op-shell',x:0,y:2}]:[];
 if(process.env.EARLY_GREEN==='1')fixed.push({id:'new149-op-green-H',x:6,y:2},{id:'new149-op-green-S',x:7,y:0});
 const op=tile(opening,{x:0,y:0,width:8,height:3},true,fixed);if(!op){results.push({attempt,status:'opening-native-tiling-not-found'});continue;}
 const hidden=inventory.map((b,i)=>{
  if(i!==0)return tile(b,regions[i],false);
  // Keep the long frozen shell at the three-cell purple exit after its region
  // reveals, so the layout tests the countdown order rather than hiding the
  // only early clear behind a fully packed row of late-color pieces.
  const bs=tile(b.slice(1),{x:3,y:3,width:4,height:3},false);
  return bs?[...bs,{...b[0],x:7,y:3}]:null;
 });if(hidden.some(b=>!b)){results.push({attempt,status:'hidden-native-tiling-not-found',failed: hidden.map((b,i)=>b?null:regions[i].id).filter(Boolean)});continue;}
 const level={...structuredClone(baseline.levels[148].level),difficulty:'normal',preservedMoveTarget:baseline.levels[148].starTargets.moveTarget,
  blocks:[...op,...hidden.flatMap((bs,i)=>bs.map(b=>({...b,shutterId:regions[i].id})))],shutters:regions,
  gates:[{id:'n149-red',color:'red',side:'left',offset:0,size:3},
   {id:'n149-green',color:'green',side:'right',offset:0,size:3,frozen:4},
   {id:'n149-purple',color:'purple',side:'right',offset:3,size:3,frozen:6},
   {id:'n149-blue',color:'blue',side:'left',offset:3,size:3,frozen:15},
   {id:'n149-yellow',color:'yellow',side:'bottom',offset:0,size:3,frozen:29},
   {id:'n149-cyan',color:'cyan',side:'bottom',offset:5,size:3,frozen:32}]};
 assert.deepEqual(geometry(level),baseline.levels[148].geometry);assert.deepEqual(api.levelStarTargets(level),baseline.levels[148].starTargets);
 let audit;try{api.validateLevel(level);audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),art:api.auditCandidateBlockArt(level)};}catch(e){results.push({attempt,status:'invalid',error:e.message});continue;}
 if(!Object.values(audit).every(a=>a.passed)){results.push({attempt,status:'static-rejected',audit});continue;}
 assert(level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')));
 const route=search(level,{floor:Number(process.env.ROUTE_LIMIT??60),maxStates:30000,maxMilliseconds:Number(process.env.SEARCH_MS??1200)});
 const data={level,seed:`146149-attempt-${attempt}`,sourceReview:sourceFile,sourceAdaptation:source.pending,
  originality:{layoutIntent:'Three aligned bands: visible top, swapped narrow/wide middle workspaces, late bottom rooms.',alignment:'All room boundaries on x=3/5 and y=3/6; fresh within-room tilings.',changes:'Rearranged room adjacency and opening tiling; not one global reflection.',constraints:'Original 8x10 geometry, counters, body attributes and star targets preserved; native carrier adaptations provisional.'},
  drags:route.drags??[],search:route,audit,status:'draft-not-certified',lowerBoundCertified:false,pointerValidated:false,formalAdopted:false};
 if(route.status==='witness')data.replay=api.replayRevisedRoute(level,route.drags);
 if(attempt===0||route.status==='witness'||route.maxClears>bestClears){bestClears=Math.max(bestClears,route.maxClears??0);const file=write('draft',data);console.log(JSON.stringify({file,status:route.status,cost:route.cost,maxClears:route.maxClears,replay:data.replay&&{valid:data.replay.valid,complete:data.replay.complete,nonClearingDrags:data.replay.nonClearingDrags}}));}
 results.push({attempt,status:route.status,cost:route.cost,maxClears:route.maxClears});
 if(data.replay?.valid&&data.replay.complete)break;
}
console.log(JSON.stringify({report:write('attempts',{activeRuleVersion:lock.activeVersion,results}),attempts:results.length,bestClears,statuses:results.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{})}));
