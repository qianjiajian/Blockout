import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {loadApi} from './native-block-repair-v143.mjs';
import {loadSpatialApi,searchSpatial,replayDomain,compileSpatial} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
import {pack,SHAPES,seededRng} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
export const OUT='deliverables/remake81-90-v146-20260924/agent85-87';
export const writeNew=(name,data)=>{fs.mkdirSync(OUT,{recursive:true});const p=OUT+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
SHAPES.L3=[[[0,0],[0,1],[1,1]]];SHAPES.L4=[[[0,0],[1,0],[2,0],[0,1]]];
const body=(id,color,kind,x,y,extra={})=>({id,color,kind,x,y,...extra});
export const SOURCE={85:{
 opening:[body('85-o1','cyan','H2',0,0),body('85-o2','green','H2',2,0),body('85-o3','purple','H2',4,0),body('85-o4','red','SQ2',0,1),body('85-o5','cyan','L3',2,1),body('85-o6','blue','L4',4,1),body('85-o7','green','L3',3,2),body('85-o8','yellow','SQ2',0,3,{movementAxis:'vertical'}),body('85-o9','red','SQ2',4,4),body('85-o10','purple','H2',0,5),body('85-o11','yellow','V3',0,6),body('85-o12','red','L3',1,6),body('85-o13','cyan','L3',2,6),body('85-o14','purple','SQ2',4,6),body('85-o15','green','SINGLE',1,8),body('85-o16','yellow','H2',2,8),body('85-o17','blue','SINGLE',4,8),body('85-o18','green','SINGLE',5,8)],
 gates:[['purple',0],['red',8],['cyan',6],['blue',4],['yellow',2],['green',1],['yellow',0]],
 evidence:[318,355,390,415],notes:'Actual source 48 occupied cells: 3S,5H2,4SQ2,4L3,1L4,1V3. Old truth V2+5L3=46 is contradicted by visible blue L4 and yellow V3. Two yellow gates conflict with unique color; remove ordinary yellow, retain frozen2. Original 50-cell board needs2 extra ordinary cells.'},
86:{opening:[body('86-o1','purple','V2',0,0),body('86-o2','blue','V2',1,0),body('86-o3','green','H2',2,0),body('86-o4','purple','SINGLE',2,1),body('86-o5','purple','SINGLE',3,1),body('86-o6','red','V2',0,2),body('86-o7','orange','V2',1,2,{lockedBy:'red-key',lockCount:1}),body('86-o8','orange','SINGLE',2,2,{keyId:'cyan-key'}),body('86-o9','yellow','SINGLE',3,2),body('86-o10','blue','SINGLE',2,3,{keyId:'red-key'}),body('86-o11','purple','SINGLE',3,3),body('86-o12','purple','V2',0,4),body('86-o13','red','SINGLE',3,4),body('86-o14','green','SINGLE',1,5),body('86-o15','yellow','SINGLE',2,5),body('86-o16','green','SINGLE',3,5,{lockedBy:'cyan-key',lockCount:1})],
 gates:[['purple',0],['orange',0],['yellow',3],['green',2],['red',3],['blue',2]],evidence:[435,438,450,465,480,503],notes:'Actual source4x6 minus internal2 cells=22; source mask in old truth5x8 is wrong. Orange vertical2 red-lock1 opens on blue single red-key removal; green single cyan-lock1 opens on orange single cyan-key removal. Both source inventory and22 occupied cells preserved; our original22-cell outline differs.'}};
export function gates(level,rng,source){
 const legal=new Set(level.playable.map(p=>p.join(','))),opts=[],used=new Set();
 for(const side of ['top','right','bottom','left'])for(const[x,y]of level.playable){const hor=['top','bottom'].includes(side),dx=side==='right'?1:side==='left'?-1:0,dy=side==='bottom'?1:side==='top'?-1:0;
  for(let size=1;size<=3;size++){const cells=Array.from({length:size},(_,i)=>[x+(hor?i:0),y+(hor?0:i)]);if(cells.some(([a,b])=>!legal.has([a,b].join(','))||legal.has([a+dx,b+dy].join(','))))continue;opts.push({side,origin:[x,y],size,keys:cells.map(p=>side+':'+p.join(','))});}}
 const result=[];for(const[color,frozen]of rng.shuffle(source.map(s=>[...s]))){const bs=level.blocks.filter(b=>(b.layers??[b.color]).includes(color));const list=opts.filter(o=>!o.keys.some(k=>used.has(k))&&bs.every(b=>!(b.movementAxis==='vertical'&&['left','right'].includes(o.side))&&!(b.movementAxis==='horizontal'&&['top','bottom'].includes(o.side)))&&o.size>=Math.max(...bs.map(b=>1+Math.max(...b.shape.map(p=>p[['top','bottom'].includes(o.side)?0:1])))));
 if(!list.length)return false;const o=rng.shuffle(list)[0];o.keys.forEach(k=>used.add(k));result.push({id:`r147-${level.id}-g-${color}`,color,side:o.side,offset:o.origin[['top','bottom'].includes(o.side)?0:1],size:o.size,portals:[{side:o.side,origin:o.origin,size:o.size}],...(frozen?{frozen}:{})});}level.gates=result;return true;
}
export function audit(level,api){api.validateLevel(level);for(const b of level.blocks)assert.equal(api.matchFormalBlockShape(b.shape)?.quarterTurns,0);const ignored=['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile'];const issues=api.auditRevisedCandidate(level).issues.filter(i=>!ignored.includes(i.code));assert.deepEqual(issues,[]);for(const c of [auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),auditGateSpanLimits(level),api.auditCandidateBlockArt(level)])assert(c.passed,JSON.stringify(c));return true;}
export async function main(){
 const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');const {api}=await loadApi(),spatial=await loadSpatialApi();
 const [mode='author',arg='85']=process.argv.slice(2);
 if(mode==='source'){const refs={};for(const id of [85,86])for(const sec of SOURCE[id].evidence){const p=`.codex-temp/video-audit-71-100/81-90/samples1s/sec-${String(sec).padStart(5,'0')}.jpg`;refs[p]=digest(fs.readFileSync(p));}console.log(writeNew('source-review',{activeRuleVersion:lock.activeVersion,video:'C:/Users/Administrator/Desktop/block out/参考视频/81-90.mp4',frames:refs,levels:SOURCE,manuallyViewed:true,sourceTruthPreserved:true}));return;}
 if(mode==='floor'){const d=JSON.parse(fs.readFileSync(arg)),proof=searchSpatial(d.level,spatial,{prove:true,floor:d.level.id===85?5:11,maxStates:Number(process.env.STATES??1500000),maxMilliseconds:Number(process.env.MS??180000)});console.log(JSON.stringify({file:writeNew('floor'+d.level.id,{candidate:arg,levelSha256:digest(d.level),proof}),proof:{...proof,drags:undefined}}));return;}
 const id=Number(arg),source=SOURCE[id];assert(source);const old=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[id-1],spec=source.opening.map(b=>({...b,sourceId:b.id}));if(id===85)spec.push({sourceId:'85-fill',color:'cyan',kind:'H2'});const stats={pack:0,gates:0,static:0,search:0,witness:0,floor:0};let best=Infinity;
 for(let seed=Number(process.env.START??1);seed<Number(process.env.END??10001);seed++){
  const rng=seededRng(seed*8191),packed=pack(spec,old.level.playable,rng,Number(process.env.PACK??2500),true);if(!packed){stats.pack++;continue;}
  const blocks=packed.map(b=>({id:`r147-${b.sourceId}`,color:b.color,x:b.x,y:b.y,shape:b.shape,...Object.fromEntries(['movementAxis','keyId','lockedBy','lockCount'].filter(k=>b[k]!==undefined).map(k=>[k,b[k]]))}));
  const level={...structuredClone(old.level),difficulty:id===85?'easy':'normal',preservedMoveTarget:old.starTargets.moveTarget,blocks,gates:[],shutters:[]};delete level.generators;
  if(!gates(level,rng,id===85?source.gates.slice(0,6):source.gates)){stats.gates++;continue;}try{audit(level,api);}catch{stats.static++;continue;}
  stats.search++;const route=searchSpatial(level,spatial,{floor:id===85?11:16,maxMilliseconds:Number(process.env.SEARCH??250),maxStates:10000,orderSeed:seed%blocks.length});
  if(route.status==='witness'){stats.witness++;best=Math.min(best,route.cost);if(route.cost<(id===85?5:11))continue;const replay=api.replayRevisedRoute(level,route.drags);if(!replay.valid||!replay.complete)continue;const measurement=measureRoute(level,route.drags,api);if(process.env.QUALITY==='multi'&&measurement.multiCellDrags<=measurement.singleCellDrags)continue;const file=writeNew('candidate'+id+'-'+seed,{seed,level,drags:route.drags,replay,measurement,source,formalAdopted:false,pointerValidated:false});console.log(JSON.stringify({file,upper:route.cost,multi:measurement.multiCellDrags,single:measurement.singleCellDrags,stats}));const proof=searchSpatial(level,spatial,{prove:true,floor:id===85?5:11,maxStates:300000,maxMilliseconds:Number(process.env.PROOF??5000)});stats.floor++;const proofFile=writeNew('floor'+id+'-'+seed,{candidate:file,levelSha256:digest(level),proof});if(proof.thresholdProven){const replayGraph=replayDomain(compileSpatial(level,spatial),route.drags,spatial);assert(replayGraph.complete);console.log(JSON.stringify({file,proofFile,lower:id===85?5:11,upper:route.cost,stats}));return;}}
  if(seed%100===0)console.log(JSON.stringify({seed,stats,best,last:route.status}));
 }
 console.log(JSON.stringify({best,stats}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
