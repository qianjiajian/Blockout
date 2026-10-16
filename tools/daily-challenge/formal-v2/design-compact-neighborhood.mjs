import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadSpatialApi,searchSpatial} from '../../continuation211-colored-witness.mjs';
import {loadContinuationRuntime} from '../../continuation211-runtime.mjs';
import {plainMonotoneProof} from '../../league-regeneration/plain-monotone-proof.mjs';
import {openingAudit} from '../../league-regeneration/round3-contract.mjs';
import {independentPartitionSha256,boardBaselineSha256} from './geometry.mjs';
import {loadRuntime,verifyCandidate} from './contract.mjs';
import {checkPlainFloor} from './proof-plain.mjs';

const OUT='deliverables/daily-formal-v2-20261007/design-lab';
const basePath=process.env.DESIGN_BASE??`${OUT}/compact-interlock-12.json`;
const BASE=JSON.parse(fs.readFileSync(basePath)).level;
if(!process.env.DESIGN_BASE)for(const item of [...BASE.blocks,...BASE.gates])if(item.color==='green')item.color='blue';else if(item.color==='blue')item.color='green';
const BATCH=Number(process.env.DESIGN_BATCH??0), CAP=Number(process.env.DESIGN_CAP??96);
const label=`${process.env.DESIGN_LABEL??'compact-neighborhood'}-b${BATCH}`;
const api=await loadSpatialApi(),runtime=await loadContinuationRuntime();
const contractRuntime=await loadRuntime();
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const random=n=>()=> (n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296;
const key=p=>p.join(','),cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]);
const rectangle=shape=>shape.length===(1+Math.max(...shape.map(p=>p[0])))*(1+Math.max(...shape.map(p=>p[1])));
const shapes=[[[0,0]],[[0,0],[0,1]],[[0,0],[1,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[1,0],[1,1]],[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]];
const normalized=points=>{const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));return{x,y,shape:points.map(p=>[p[0]-x,p[1]-y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])};};
function localRetiles(level){
 const variants=[],seen=new Set([independentPartitionSha256(level)]);
 for(let i=0;i<level.blocks.length;i++)for(let j=i+1;j<level.blocks.length;j++){
  const aa=level.blocks[i],bb=level.blocks[j],union=[...cells(aa),...cells(bb)],total=new Set(union.map(key));
  if(union.length>9||union.length<3||total.size!==union.length)continue;
  for(const shape of shapes)if(shape.length<union.length)for(const anchor of union){
   const first=shape.map(([x,y])=>[x+anchor[0],y+anchor[1]]);
   if(!first.every(p=>total.has(key(p))))continue;
   const used=new Set(first.map(key)),rest=union.filter(p=>!used.has(key(p))),second=normalized(rest);
   if(!rectangle(second.shape)||!shapes.some(s=>JSON.stringify(normalized(s).shape)===JSON.stringify(second.shape)))continue;
   const candidate=structuredClone(level);Object.assign(candidate.blocks[i],{x:anchor[0],y:anchor[1],shape:structuredClone(shape)});Object.assign(candidate.blocks[j],second);
   const partition=independentPartitionSha256(candidate);if(seen.has(partition))continue;seen.add(partition);
   variants.push({level:candidate,changedIds:[aa.id,bb.id],partition});
  }
 }
 return variants;
}
function fixColors(level,ids,seed){
 const r=random(seed),palette=[...new Set(level.gates.map(g=>g.color))],targets=ids.map(id=>level.blocks.find(b=>b.id===id));
 const adjacent=(a,b)=>cells(a).some(p=>cells(b).some(q=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])===1));
 for(const target of targets){
  const excluded=new Set(level.blocks.filter(b=>b.id!==target.id&&adjacent(target,b)).map(b=>b.color));
  const width=1+Math.max(...target.shape.map(p=>p[0])),height=1+Math.max(...target.shape.map(p=>p[1]));
  const art=contractRuntime.matchFormalBlockShape(target.shape,'native-only');
  const choices=palette.filter(c=>!excluded.has(c)&&art?.quarterTurns===0&&contractRuntime.GAME_ART.gameplay.formalBlocks[c]?.solid?.[art.shapeId]
    &&level.gates.some(g=>g.color===c&&(g.side==='top'||g.side==='bottom'?width:height)<=g.size));
  if(!choices.length)return false;
  target.color=choices.includes(target.color)&&r()<.7?target.color:choices[Math.floor(r()*choices.length)];
 }
 return openingAudit(level).status==='PASS';
}
const first=localRetiles(BASE),pool=[{level:BASE,changedIds:[],partition:independentPartitionSha256(BASE),generation:0}];
for(let i=0;i<first.length;i++)pool.push({...first[i],generation:1});
// A second real partition change broadens geometry without board seams or towers.
for(let i=0;i<Math.min(first.length,12);i++)for(const x of localRetiles(first[i].level).slice(0,16))pool.push({...x,changedIds:[...new Set([...first[i].changedIds,...x.changedIds])],generation:2});
const order=pool.map((x,i)=>({...x,order:(Math.imul(i+17,2654435761)>>>0)})).sort((a,b)=>a.order-b.order);
const previousPartitions=[];
if(process.env.DESIGN_BASE)for(const name of fs.readdirSync(OUT).filter(n=>n.endsWith('-report.json'))){const data=JSON.parse(fs.readFileSync(`${OUT}/${name}`));for(const c of data.candidates??[])if(c.partitionSha256)previousPartitions.push(c.partitionSha256);}
if(BATCH>0&&!process.env.DESIGN_BASE)previousPartitions.push(...JSON.parse(fs.readFileSync(`${OUT}/compact-neighborhood-b0-report.json`)).candidates.map(c=>c.partitionSha256));
const usedPartitions=new Set(previousPartitions),usedObjects=new Set(),rows=[],candidates=[];
const write=()=>fs.writeFileSync(`${OUT}/${label}-report.json`,JSON.stringify({status:'FINITE_LOCAL_RETILE_CANDIDATES',sourceLevelId:2,baseline:basePath,productionChanged:false,finiteBudget:{maxCandidates:CAP,method:'exact plain BFS trace',proofMs:5000,neverEnlargeSameObjectBudget:true},availablePartitions:first.length,rows,candidates,counts:[1,2,3].map(d=>({difficulty:d,count:candidates.filter(c=>c.difficulty===d).length}))},null,2)+'\n');
let tried=0;
for(let i=BATCH*CAP;i<order.length&&tried<CAP;i++){
 const x=order[i],level=x.level;
 if(usedPartitions.has(x.partition))continue;usedPartitions.add(x.partition);
 const row={i,partitionSha256:x.partition,generation:x.generation,changedIds:x.changedIds,status:'BLOCKED'};
 if(!fixColors(level,x.changedIds,812341+i*971)){row.reason='adjacency-color-failed';rows.push(row);continue;}
 row.levelSha256=sha(level);if(usedObjects.has(row.levelSha256)){row.reason='duplicate-object';rows.push(row);continue;}usedObjects.add(row.levelSha256);tried++;
 try{
  level.id=2;level.reward=0;level.name=`每日挑战基础紧凑候选${BATCH}-${i}`;
  api.validateLevel(level);row.opening=openingAudit(level);
  const route=checkPlainFloor(level,api,{floor:16,searchUpper:50,maxStates:120000,maxTransitions:900000,maxMilliseconds:5000});
  row.route={status:route.status,U:route.cost??null,reason:route.termination??null};
  if(!route.drags){row.reason='route-unavailable';rows.push(row);write();console.log(JSON.stringify({tried,i,...row.route}));continue;}
  const replay=runtime.replayRevisedRoute(level,route.drags);row.replay={valid:replay.valid,complete:replay.complete,U:replay.nonClearingDrags,totalDrags:replay.effectiveDrags};
  if(!replay.valid||!replay.complete||replay.nonClearingDrags<16){row.reason='upper-refutes-hard-or-replay-invalid';rows.push(row);write();continue;}
  const U=replay.nonClearingDrags,difficulty=U<=20?1:U<=30?2:3,floor=difficulty===1?16:difficulty===2?21:31;
  const formalId=`daily-mechanisms-color-exit-1-d${difficulty}-lab-${label}-${i}`;
  const final=await verifyCandidate(contractRuntime,{formalId,stageKey:'mechanisms-color-exit-1',difficulty,sourceLevelId:2,level,drags:route.drags},{lowerBudget:{maxStates:120000,maxTransitions:900000,maxMilliseconds:5000}});
  row.lower=final.lowerBound?.result??{status:final.status};
  if(final.accepted){
   row.status='BOUND_AND_ROUTE_CANDIDATE';row.difficulty=difficulty;
   const candidate={...final,exactSearch:route,partitionSha256:x.partition,boardBaselineSha256:boardBaselineSha256(level),opening:row.opening,provenance:{ruleVersion:'1.153.0',baselinePath:basePath,sourceLevelId:2,removedMechanisms:[],retiledBlockIds:x.changedIds,sourceShapeAndColorDifferences:true,baseAdaptation:'Retain source2 normal 4x6 outline; replace full rectangular inventory with interconnected compact sliding arrangement; global blue/green swap only resolves native H4 art, not counted as independent layout.'}};
   const file=`${OUT}/${label}-candidate-${i}.json`;fs.writeFileSync(file,JSON.stringify(candidate,null,2)+'\n');row.path=file;candidates.push({path:file,formalId,difficulty,U,L:floor,levelSha256:final.levelSha256,partitionSha256:x.partition});
  }else row.reason='lower-not-proven';
  rows.push(row);write();console.log(JSON.stringify({tried,i,U,lower:row.lower.status,L:floor,cost:row.lower.cost,status:row.status,candidates:candidates.length}));
 }catch(e){row.reason=String(e);rows.push(row);write();console.log(JSON.stringify({i,error:String(e)}));}
}
write();console.log(JSON.stringify({label,tried,available:first.length,candidates:candidates.length,counts:[1,2,3].map(d=>[d,candidates.filter(c=>c.difficulty===d).length])}));
