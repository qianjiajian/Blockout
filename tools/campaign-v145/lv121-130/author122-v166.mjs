import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../revised-generator-queue-colors.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';

const out='deliverables/campaign121-130-v146-20260924/root122';
const lock=verifyRulesLock(); assert(lock.ok,lock.errors.join('\n'));
assert(['1.46.0','1.47.0','1.48.0','1.49.0','1.50.0','1.51.0','1.52.0','1.53.0','1.54.0','1.55.0','1.56.0','1.57.0','1.58.0','1.59.0','1.60.0','1.61.0','1.62.0','1.63.0','1.64.0','1.65.0','1.66.0','1.67.0'].includes(lock.activeVersion));
const bundle=await build({stdin:{resolveDir:process.cwd(),sourcefile:'author122-entry.ts',loader:'ts',contents:`
 export {LEVELS} from './src/core/levels.ts';
 export {validateLevel,PuzzleModel} from './src/core/PuzzleModel.ts';
 export {searchRevisedLevel,replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
 export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';
`},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const base=api.LEVELS.find(level=>level.id===122); assert(base);
const source=JSON.parse(fs.readFileSync('deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json','utf8')).levels.find(row=>row.level===122);
const SH={H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],L4:[[0,0],[1,0],[2,0],[0,1]],S:[[0,0]]};
const COLORS=['red','blue','orange','yellow','green','pink','purple'];
const key=(x,y)=>`${x},${y}`;
const cellsOf=(block)=>block.shape.map(([dx,dy])=>[block.x+dx,block.y+dy]);
const shuffle=(xs,rng)=>{const a=[...xs];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function rngFor(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/0x100000000;};}
function placeShapes(seed){
 const rng=rngFor(seed),grid=Array.from({length:8},()=>Array(6).fill(null));
 const wanted=[...Array(5).fill('H2'),...Array(2).fill('V2'),...Array(2).fill('L4')];
 const pieces=[]; const cells=[...Array(48)].map((_,i)=>[i%6,Math.floor(i/6)]);
 function rec(index,remaining){
  if(!remaining.length)return true;
  for(const choice of shuffle(remaining.map((shape,i)=>({shape,i})),rng)){
   const shape=SH[choice.shape];
   for(const [x,y] of shuffle(cells,rng)){
    const abs=shape.map(([dx,dy])=>[x+dx,y+dy]);
    if(abs.some(([cx,cy])=>cx<0||cx>=6||cy<0||cy>=8||grid[cy][cx]!==null))continue;
    for(const [cx,cy] of abs)grid[cy][cx]=pieces.length;
    pieces.push({shape:shape.map(p=>[...p]),x,y,type:choice.shape});
    const next=remaining.slice();next.splice(choice.i,1);
    if(rec(index+1,next))return true;
    pieces.pop();for(const [cx,cy] of abs)grid[cy][cx]=null;
   }
  }
  return false;
 }
 if(!rec(0,wanted))return null;
 for(const [x,y] of cells)if(grid[y][x]===null)pieces.push({shape:SH.S.map(p=>[...p]),x,y,type:'S'});
 return pieces;
}
function adjacency(pieces){const map=new Map();pieces.forEach((p,i)=>cellsOf(p).forEach(c=>map.set(key(...c),i)));const edges=new Set();for(const [cell,i] of map){const [x,y]=cell.split(',').map(Number);for(const [dx,dy] of [[1,0],[0,1]]){const j=map.get(key(x+dx,y+dy));if(j!==undefined&&i!==j)edges.add(i<j?`${i}:${j}`:`${j}:${i}`);}}return [...edges].map(e=>e.split(':').map(Number));}
function colorPieces(pieces,seed){
 const rng=rngFor(seed),edges=adjacency(pieces),neighbors=Array.from({length:pieces.length},()=>new Set());for(const [a,b] of edges){neighbors[a].add(b);neighbors[b].add(a);}
 const order=[...pieces.keys()].sort((a,b)=>neighbors[b].size-neighbors[a].size);const colors=Array(pieces.length);
 function rec(k){if(k===order.length)return true;const i=order[k],used=new Set([...neighbors[i]].map(j=>colors[j]).filter(Boolean));for(const c of shuffle(COLORS,rng))if(!used.has(c)){colors[i]=c;if(rec(k+1))return true;}colors[i]=undefined;return false;}
 assert(rec(0));return colors;
}
function makeLevel(seed){
 const pieces=placeShapes(seed);if(!pieces)return null;const colors=colorPieces(pieces,seed+17);
 const blocks=pieces.map((p,i)=>({id:`r166-122-${p.type.toLowerCase()}-${i}`,x:p.x,y:p.y,shape:p.shape,color:colors[i]}));
 const level=structuredClone(base);level.blocks=blocks;level.shutters=[];level.generators=[];level.gates=[
  {id:'r166-122-red-top',color:'red',side:'top',offset:0,size:3,frozen:15},
  {id:'r166-122-orange-left',color:'orange',side:'left',offset:0,size:3,frozen:17},
  {id:'r166-122-yellow-left',color:'yellow',side:'left',offset:5,size:3,frozen:11},
  {id:'r166-122-green-right',color:'green',side:'right',offset:0,size:3,frozen:17},
  {id:'r166-122-purple-right',color:'purple',side:'right',offset:5,size:3,frozen:11},
  {id:'r166-122-pink-bottom',color:'pink',side:'bottom',offset:0,size:3},
  {id:'r166-122-blue-bottom',color:'blue',side:'bottom',offset:3,size:3},
 ];
 level.difficulty='normal';level.mechanismRules='revised-2026-09-23-v1.4';return level;
}
function staticAudit(level){const snap=new api.PuzzleModel(level).snapshot();const art=level.blocks.map(b=>api.matchFormalBlockShape(b.shape));return {opening:auditOpeningCoverage(snap),hidden:auditHiddenCoverage(level),queue:auditGeneratorQueueColors(level),gateSpans:auditGateSpanLimits(level),native:art.every(x=>x?.quarterTurns===0)};}
const attempts=[];let accepted=null;
for(let seed=122001;seed<122081&&!accepted;seed++){
 const level=makeLevel(seed);if(!level)continue;let audit,replay,search;
 try{api.validateLevel(level);audit=staticAudit(level);if(!audit.opening.passed||!audit.hidden.passed||!audit.queue.passed||!audit.gateSpans.passed||!audit.native)continue;search=api.searchRevisedLevel(level,{maxStates:400000,maxDragStates:2048,maxTransitions:4000000,maxMilliseconds:3000});if(search.status!=='witness')continue;replay=api.replayRevisedRoute(level,search.drags);if(!replay.valid||!replay.complete)continue;if(replay.nonClearingDrags<11||replay.nonClearingDrags>15)continue;accepted={seed,level,drags:search.drags,replay,search,audit};}catch(error){attempts.push({seed,error:String(error)});continue;}
 attempts.push({seed,status:search?.status,termination:search?.termination,nonClearingDrags:replay?.nonClearingDrags,drags:search?.drags?.length});
}
const report={schemaVersion:1,activeRuleVersion:lock.activeVersion,designContract:'1.45.0',levelId:122,sourceRecordSha256:digest(source),sourceAdaptation:['保留当前6×8棋盘几何；来源视频重建为6×11、42可玩格，因此以新增6个普通单格填补保留棋盘的48格容量。','来源结构化机制清单无炸弹/卷帘/生成器；视频底部炸弹文字与画面冲突，未新增定时炸弹，待来源复核。','保留来源7色、20S/5H2/2V2/2L4形状基底，所有新增块使用原生q0形状。'],attempts:attempts.slice(-80),candidate:accepted?{seed:accepted.seed,level:accepted.level,drags:accepted.drags,replay:accepted.replay,search:accepted.search,audit:accepted.audit,sourceReview:{status:'REVIEWED_WITH_EXPLICIT_GEOMETRY_ADAPTATION',recordSha256:digest(source)},formalAdopted:false}:null,status:accepted?'CANDIDATE_ROUTE_FOUND':'NO_CANDIDATE_IN_BUDGET',lowerBoundCertified:false,pointerValidated:false,formalAdopted:false};
fs.mkdirSync(out,{recursive:true});const file=path.join(out,`candidate122-v166-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:file.replaceAll('\\','/'),status:report.status,seed:accepted?.seed,drags:accepted?.drags?.length,nonClearingDrags:accepted?.replay?.nonClearingDrags,attempts:attempts.length},null,2));
