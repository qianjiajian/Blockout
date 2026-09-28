import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {loadSpatialApi,searchSpatial} from '../../../../deliverables/remake101-110-v146-20260924/pipeline/spatial-star-domain.mjs';
const ROOT='deliverables/remake131-140-v146-20260924/agent139-140';
const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));
const {api}=await loadApi(), spatial=await loadSpatialApi();
const baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[139];
const shapes=Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s=>[s.shapeId,s.cells]));
const clone=structuredClone, results=[];
let state=Number(process.env.SEED??140001);const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
const shuffle=a=>a.map(x=>({x,k:random()})).sort((a,b)=>a.k-b.k).map(r=>r.x);
const key=([x,y])=>`${x},${y}`;
const write=(name,obj)=>{const p=`${ROOT}/${name}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});return p;};
const colors=['purple','green','orange','pink'];
function piece(id,shape,color,extra={}){return{id:`n140-${id}`,shape:shapes[shape],color,...extra};}
function chooseInventory(count,total,pools){for(let attempt=0;attempt<100000;attempt++){const ids=Array.from({length:count},(_,i)=>{const p=pools[i];return p[Math.floor(random()*p.length)];});if(ids.reduce((n,s)=>n+shapes[s].length,0)===total)return ids;}throw Error('Inventory sampling exhausted');}
function tile(blocks,cells,fixed=[]){
 const legal=new Set(cells.map(key)),occupied=new Set(),placed=[],unused=new Set(blocks.map((_,i)=>i));let visits=0;
 for(const f of fixed){const i=blocks.findIndex(b=>b.id===f.id);assert(i>=0);const b={...blocks[i],x:f.x,y:f.y};for(const[dx,dy]of b.shape){const k=key([b.x+dx,b.y+dy]);if(!legal.has(k)||occupied.has(k))return null;occupied.add(k);}placed.push(b);unused.delete(i);}
 function go(){if(++visits>30000)return false;const cell=cells.find(p=>!occupied.has(key(p)));if(!cell)return !unused.size;
  const sigs=new Set();for(const i of shuffle([...unused])){const b=blocks[i],sig=JSON.stringify([b.shape,b.color,b.movementAxis,b.layers]);if(sigs.has(sig))continue;sigs.add(sig);
   for(const[sx,sy]of shuffle(b.shape)){const x=cell[0]-sx,y=cell[1]-sy,cc=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(cc.some(p=>!legal.has(key(p))||occupied.has(key(p))))continue;
    if(b.movementAxis==='vertical'&&((b.color==='blue'&&x!==1)||(b.color==='cyan'&&x!==2)||(b.color==='yellow'&&x!==3)||(b.color==='red'&&x!==2)))continue;
    cc.forEach(p=>occupied.add(key(p)));unused.delete(i);placed.push({...b,x,y});if(go())return true;placed.pop();unused.add(i);cc.forEach(p=>occupied.delete(key(p)));
   }
  }return false;
 }return go()?placed:null;
}
const cover={id:'n140-cover8',x:0,y:8,width:5,height:3,count:8};
const openingCells=baseline.level.playable.filter(([x,y])=>y<8||y===11);
const hiddenCells=Array.from({length:15},(_,i)=>[i%5,8+Math.floor(i/5)]);
const source={review140:'.codex-temp/remaining147-v110/core-111-140/source-review-140.json',frames:['.codex-temp/video-audit-135-169/openings/level-140.jpg','.codex-temp/video-audit-135-169/137-144/samples1s/sec-00377.jpg','.codex-temp/video-audit-135-169/level-timelines/lv140.jpg'],facts:{opening:13,hidden:5,axisVertical:4,shells:3,cover:[8],gateIce:[3,2,4],fullIrregular:3},adaptations:['Keep baseline 56-cell board. Source opening 27 and hidden footprint15 cannot fully cover current opening31 and cover25; retain 13+5 identities with resized native shapes.','Source irregular shell art is unavailable: keep three shells on native SQ2; transfer three irregular identities to one opening L3 and two hidden native irregular carriers.','User 2026-09-27 permits color/type changes after bounded failed search. Retain all four vertical axes, cover8 and three ice gates; source colors and shapes remain in source review.','Source duplicate gates adapted to unique eight-color mouths; retain frozen initial values2/3/4.']};
let cachedOpening=null,cachedHidden=null,savedDraft=false,searchCount=0;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??80);attempt++){
 const seed=state;
 const irregular=[4,5,6,10,11,12,16],rect=[1,2,3,7,8,9,13,14,21],shell=[1,2,3,7,8,9];
 const openIds=chooseInventory(6,26,[irregular,rect,rect,rect,rect,rect]);
 const hiddenIds=chooseInventory(5,15,[shell,shell,shell,irregular,irregular]);
 const opening=[piece('axis-blue',3,'blue',{movementAxis:'vertical'}),piece('axis-cyan',3,'cyan',{movementAxis:'vertical'}),piece('axis-yellow',3,'yellow',{movementAxis:'vertical'}),piece('axis-red',3,'red',{movementAxis:'vertical'}),...openIds.map((s,i)=>piece(`ordinary-${i}`,s,colors[Math.floor(random()*colors.length)])),...['bottom1','bottom2','bottom3'].map(n=>piece(n,1,colors[Math.floor(random()*colors.length)]))];
 const hidden=[piece('hidden-shell0',hiddenIds[0],'green',{layers:['green','purple']}),piece('hidden-shell1',hiddenIds[1],'purple',{layers:['purple','orange']}),piece('hidden-shell2',hiddenIds[2],'pink',{layers:['pink','green']}),piece('hidden-plus',hiddenIds[3],colors[Math.floor(random()*colors.length)]),piece('hidden-eight',hiddenIds[4],colors[Math.floor(random()*colors.length)])];
 cachedOpening??=tile(opening,openingCells,[{id:'n140-axis-blue',x:1,y:0},{id:'n140-axis-cyan',x:2,y:0},{id:'n140-axis-yellow',x:3,y:0},{id:'n140-axis-red',x:2,y:3},{id:'n140-bottom1',x:1,y:11},{id:'n140-bottom2',x:2,y:11},{id:'n140-bottom3',x:3,y:11}]);
 cachedHidden??=tile(hidden,hiddenCells);
 const op=clone(cachedOpening),h=clone(cachedHidden);if(!op||!h){results.push({attempt,seed,status:'tiling-not-found',opening:!!op,hidden:!!h});continue;}
 for(const b of [...op,...h]){if(!b.movementAxis){const palette=colors.filter(color=>api.auditCandidateBlockArt({blocks:[{...b,color,layers:undefined}]}).passed);b.color=palette[Math.floor(random()*palette.length)];}if(b.layers){b.layers[0]=b.color;b.layers[1]=colors.filter(c=>c!==b.color)[Math.floor(random()*3)];}}
 const level={...clone(baseline.level),difficulty:'hard',preservedMoveTarget:baseline.starTargets.moveTarget,blocks:[...op,...h.map(b=>({...b,shutterId:cover.id}))],shutters:[cover],gates:[
  {id:'n140-blue',color:'blue',side:'top',offset:1,size:1},{id:'n140-cyan',color:'cyan',side:'top',offset:2,size:1},{id:'n140-yellow',color:'yellow',side:'top',offset:3,size:1,frozen:2},
  {id:'n140-red',color:'red',side:'bottom',offset:1,size:3,frozen:4},{id:'n140-purple',color:'purple',side:'left',offset:1,size:3,frozen:3},{id:'n140-green',color:'green',side:'right',offset:1,size:3},
  {id:'n140-orange',color:'orange',side:'left',offset:4,size:3},{id:'n140-pink',color:'pink',side:'right',offset:4,size:3}]};
 assert.deepEqual(geometry(level),baseline.geometry);assert.deepEqual(api.levelStarTargets(level),baseline.starTargets);
 let audit,search,replay,error;
 try{api.validateLevel(level);audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),spans:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level),native:{passed:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only'))}};assert(Object.values(audit).every(a=>a.passed),JSON.stringify(audit));
  searchCount++;search=searchSpatial(level,spatial,{floor:21,maxStates:80000,maxMilliseconds:Number(process.env.SEARCH_MS??1500),maxTransitions:2000000,symmetry:true,diagnosticTrace:true});
  if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);
 }catch(e){error=e.message;}
 const row={attempt,seed,status:search?.status??'rejected',cost:search?.cost,clears:search?.maxClearsSeen,error};results.push(row);
 if(!savedDraft||replay?.complete){savedDraft=true;const file=write('candidate140',{level,seed,source,audit,search,drags:search?.drags??[],replay,activeRuleVersion:lock.activeVersion,status:replay?.complete?'COMPLETE_ROUTE_FLOOR_UNCERTIFIED':'DRAFT_UNSOLVED',formalAdopted:false});console.log(JSON.stringify({file,...row,replay}));}
 if(replay?.complete&&replay.nonClearingDrags>=16){const proof=searchSpatial(level,spatial,{floor:16,prove:true,maxStates:250000,maxMilliseconds:30000,symmetry:true});const file=write('floor140',{levelSha256:digest(level),proof});console.log(JSON.stringify({file,proofStatus:proof.status}));if(proof.thresholdProven)break;}
 if(searchCount>=60)break;
}
console.log(JSON.stringify({report:write('attempts140',{activeRuleVersion:lock.activeVersion,results}),results:results.length,statuses:results.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{})}));
