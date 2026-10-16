import fs from 'node:fs';
import {loadSpatialApi,searchSpatial,compileSpatial} from '../../continuation211-colored-witness.mjs';
import {loadRuntime,verifyCandidate,levelSha256} from './contract.mjs';
import {checkPlainFloor} from './proof-plain.mjs';
import {independentPartitionSha256,boardBaselineSha256} from './geometry.mjs';
import {neighborhood,fixColors,rectangular} from './design-layout-factory.mjs';
import {adaptPlainRoute} from './proof-design-route-adapter.mjs';
import {decorate} from './mechanism-decorate.mjs';
const OUT='deliverables/daily-formal-v2-20261007/design-lab';
const basePath=process.env.DESIGN_BASE??`${OUT}/stage1-d1-10-seed.json`;
const original=JSON.parse(fs.readFileSync(basePath)),base=original.level;
const stageKey=process.env.DESIGN_STAGE??'mechanisms-irregular-block-5';
const irregular=process.env.DESIGN_IRREGULAR!=='0';
const label=process.env.DESIGN_LABEL??'native-irregular-seed';
if(fs.existsSync(`${OUT}/${label}-report.json`))throw new Error('Use a fresh label; old trial evidence is immutable');
const cap=Number(process.env.DESIGN_CAP??64),sourceLevelId=original.sourceLevelId??base.id;
const recolorAll=process.env.DESIGN_RECOLOR_ALL==='1'&&!original.accepted;
const targetBands=(process.env.DESIGN_TARGET_BANDS??'1,2,3').split(',').map(Number);
if(fs.existsSync(`${OUT}/STOP_DESIGN_GENERATION`)||(process.env.DESIGN_BATCH_LABEL&&fs.existsSync(`${OUT}/${process.env.DESIGN_BATCH_LABEL}.STOP`))){
 fs.writeFileSync(`${OUT}/${label}-report.json`,JSON.stringify({status:'SKIPPED_COORDINATOR_STOP',sourceLevelId,stageKey,baseline:basePath,productionChanged:false,finiteBudget:{maxCandidates:cap,proofMs:5000,maxStates:160000,maxTransitions:900000},attemptedCandidates:0,rows:[],candidates:[]},null,2)+'\n');
 console.log(JSON.stringify({label,status:'SKIPPED_COORDINATOR_STOP'}));process.exit(0);
}
const runtime=await loadRuntime(),api=await loadSpatialApi(),reserved=new Set(),seenObjects=new Set(),currentStagePools={1:new Set(),2:new Set(),3:new Set()};
for(const name of fs.readdirSync(OUT).filter(n=>n.endsWith('.json'))){const c=JSON.parse(fs.readFileSync(`${OUT}/${name}`));if(c.accepted&&c.level){const partition=independentPartitionSha256(c.level);reserved.add(partition);if(c.stageKey===stageKey)currentStagePools[c.difficulty]?.add(partition);}for(const row of c.rows??[])if(row.gameplayFingerprint)seenObjects.add(row.gameplayFingerprint);}
const stageQuota=Number(process.env.DESIGN_STAGE_QUOTA??(stageKey==='mechanisms-frozen-exit-6'?10:0));
if(stageQuota&&[1,2].every(d=>currentStagePools[d].size>=stageQuota)){
 fs.writeFileSync(`${OUT}/${label}-report.json`,JSON.stringify({status:'SKIPPED_ALREADY_HAVE_TARGET_POOL',sourceLevelId,stageKey,baseline:basePath,productionChanged:false,finiteBudget:{maxCandidates:cap,proofMs:5000,maxStates:160000,maxTransitions:900000},attemptedCandidates:0,rows:[],candidates:[],poolSizes:[1,2,3].map(d=>({difficulty:d,count:currentStagePools[d].size}))},null,2)+'\n');
 console.log(JSON.stringify({label,status:'SKIPPED_ALREADY_HAVE_TARGET_POOL'}));process.exit(0);
}
const scanExternal=dir=>{if(!fs.existsSync(dir))return;for(const item of fs.readdirSync(dir,{withFileTypes:true})){const path=`${dir}/${item.name}`;if(item.isDirectory())scanExternal(path);else if(item.name.endsWith('.json')){try{const c=JSON.parse(fs.readFileSync(path));if(c.accepted&&c.level)reserved.add(independentPartitionSha256(c.level));}catch{/* Another worker may currently be writing its own provisional file. Root ledger rechecks every final partition. */}}}};
scanExternal('deliverables/daily-formal-v2-20261007/design-d3-proof');
scanExternal('deliverables/daily-formal-v2-20261007/design-band-proof');
scanExternal('deliverables/daily-formal-v2-20261007/mechanism-lab');
const pool=neighborhood(base,{irregular}),rows=[],candidates=[];
const write=()=>fs.writeFileSync(`${OUT}/${label}-report.json`,JSON.stringify({status:'FINITE_NATIVE_PARTITION_CANDIDATES',sourceLevelId,stageKey,baseline:basePath,productionChanged:false,finiteBudget:{maxCandidates:cap,proofMs:5000,maxStates:160000,maxTransitions:900000},attemptedCandidates:tried,availablePartitions:pool.length,rows,candidates},null,2)+'\n');
let tried=0;
for(let i=0;i<pool.length&&tried<cap;i++){
 const x=pool[i],level=x.level;if(reserved.has(x.partition))continue;reserved.add(x.partition);
 const row={i,partitionSha256:x.partition,generation:x.generation,changedIds:x.changedIds,status:'BLOCKED'};
 if(stageKey==='mechanisms-irregular-block-5'&&!level.blocks.some(b=>!rectangular(b.shape))){row.reason='missing-irregular-block';rows.push(row);continue;}
 // Native irregular pieces need an actual two-cell cross section. On source2,
 // widen selected top exits inside the existing rim, without changing the
 // playable board. Each attempt still has its own non-equivalent partition.
 if(stageKey==='mechanisms-irregular-block-5'&&sourceLevelId===2){
  const variant=i%4;
  if(variant===1||variant===3){const g=level.gates.find(g=>g.color==='orange'&&g.side==='top');if(g){g.offset=0;g.size=2;}}
  if(variant===2||variant===3){const g=level.gates.find(g=>g.color==='purple'&&g.side==='top');if(g){g.offset=2;g.size=2;}}
 }
 row.gateChanges=level.gates.flatMap((g,index)=>JSON.stringify(g)===JSON.stringify(base.gates[index])?[]:[{before:base.gates[index],after:g}]);
 let colorIds=x.changedIds;
 if(recolorAll){
  const compiled=compileSpatial(level,api),anchor=compiled.blocks.find(b=>b.poses[b.initial].exits[0].length);
  colorIds=level.blocks.filter(b=>b.id!==anchor?.id).map(b=>b.id);row.retainedOpeningBlockId=anchor?.id??null;
 }
 const colorSeed=173311+i*717+[...label].reduce((n,c)=>n+c.charCodeAt(0)*977,0);
 if(!fixColors(level,colorIds,colorSeed,runtime,{keepProbability:recolorAll?0:.7})){row.reason='native-color-or-adjacency';rows.push(row);continue;}
 row.gameplayFingerprint=levelSha256({...level,name:''});if(seenObjects.has(row.gameplayFingerprint)){row.reason='already-attempted-object';rows.push(row);continue;}seenObjects.add(row.gameplayFingerprint);
 level.id=sourceLevelId;level.reward=0;level.name=`每日挑战候选 ${label}-${i}`;tried++;row.levelSha256=levelSha256(level);row.level=structuredClone(level);
 try{
  runtime.validateLevel(level);
  const budget={maxStates:160000,maxTransitions:900000,maxMilliseconds:5000};
  let route;
  if(level.width*level.height<=36)route=checkPlainFloor(level,api,{floor:16,searchUpper:50,...budget});
  else{
   if(original.drags&&!recolorAll){route=adaptPlainRoute(runtime,level,original.drags,{maxMilliseconds:1200,maxNodes:6000});row.routeAdapter={status:route.status,nodes:route.nodes,reason:route.reason};}
   if(route?.status!=='witness')route=searchSpatial(level,api,{floor:100,normalize:true,...budget,maxMilliseconds:1800,orderSeed:i});
  }
  row.route={status:route.status,cost:route.cost,reason:route.termination};
  if(!route.drags){row.reason='no-complete-route';rows.push(row);write();continue;}
  const replay=runtime.replayRevisedRoute(level,route.drags);row.replay={valid:replay.valid,complete:replay.complete,U:replay.nonClearingDrags,totalDrags:replay.effectiveDrags};
  if(!replay.valid||!replay.complete||replay.nonClearingDrags<16){row.reason='below-hard-or-invalid';rows.push(row);write();continue;}
  let U=replay.nonClearingDrags,difficulty=U<=20?1:U<=30?2:3,drags=route.drags;
  if(!targetBands.includes(3)&&U>30){
   const bounded=checkPlainFloor(level,api,{floor:16,searchUpper:30,...budget});
   row.bandSearch={status:bounded.status,cost:bounded.cost,termination:bounded.termination};
   if(!bounded.drags){row.reason='no-upper-witness-in-target-bands';rows.push(row);write();continue;}
   U=bounded.cost;difficulty=U<=20?1:2;drags=bounded.drags;
  }
  if(!targetBands.includes(difficulty)){row.reason='complete-witness-outside-requested-bands';rows.push(row);write();continue;}
  let formalId=`daily-${stageKey}-d${difficulty}-lab-${label}-${i}`;
  let submitted={formalId,stageKey,difficulty,sourceLevelId,level,drags};
  if(process.env.DESIGN_DECORATE){
   const decorated=await decorate(level,drags,process.env.DESIGN_DECORATE,{runtime,difficulty,sourceLevelId,formalId,maxAttempts:12,idPrefix:`${label}-${i}`});
   row.decoration={ok:decorated.ok,provenance:decorated.provenance,failedAttempts:decorated.failedAttempts};
   if(!decorated.ok){row.reason='mechanism-decoration-failed';rows.push(row);write();continue;}
   submitted={...decorated,formalId,stageKey,difficulty,sourceLevelId};
  }
  let verified=await verifyCandidate(runtime,submitted,{lowerBudget:budget});
  // A complete shortcut obtained while refuting a higher band is usable as a
  // new upper witness. It is replayed and re-certified in its actual band.
  const shortcut=verified.lowerBound?.result;
  if(!process.env.DESIGN_DECORATE&&!verified.accepted&&shortcut?.drags&&shortcut.cost>=16&&shortcut.cost<U&&targetBands.includes(shortcut.cost<=20?1:shortcut.cost<=30?2:3)){
   U=shortcut.cost;difficulty=U<=20?1:U<=30?2:3;drags=shortcut.drags;formalId=`daily-${stageKey}-d${difficulty}-lab-${label}-${i}`;
   verified=await verifyCandidate(runtime,{formalId,stageKey,difficulty,sourceLevelId,level,drags},{lowerBudget:budget});
  }
  row.verification={status:verified.status,L:verified.L,U:verified.U,issues:verified.staticAudit?.issues};
  if(verified.lowerBound?.result){const lower=verified.lowerBound.result;row.lowerSummary={status:lower.status,provenFloor:lower.provenFloor,exploredStates:lower.exploredStates,attemptedTransitions:lower.attemptedTransitions,termination:lower.termination};}
  if(verified.accepted){
   const path=`${OUT}/${label}-candidate-${i}.json`;
   if(independentPartitionSha256(verified.level)!==x.partition)throw new Error('Decorator changed partitions; extend independent-layout tracking before admitting inventory decorators');
   const candidate={...verified,partitionSha256:x.partition,boardBaselineSha256:boardBaselineSha256(verified.level),provenance:{ruleVersion:'1.153.0',baselinePath:basePath,sourceLevelId,removedMechanisms:original.provenance?.removedMechanisms??[],retiledBlockIds:x.changedIds,changedNativeShapes:true,changedColors:level.blocks.flatMap(b=>{const before=base.blocks.find(a=>a.id===b.id);return before?.color===b.color?[]:[{blockId:b.id,before:before?.color,after:b.color}]}),gateChanges:row.gateChanges,mechanismDecoration:row.decoration,retainedSourceBoard:true}};
   fs.writeFileSync(path,JSON.stringify(candidate,null,2)+'\n');row.status='BOUND_AND_ROUTE_CANDIDATE';row.path=path;
   candidates.push({path,formalId,difficulty,L:verified.L,U:verified.U,levelSha256:verified.levelSha256,partitionSha256:x.partition});
   console.log(JSON.stringify({label,tried,i,difficulty,L:verified.L,U:verified.U,count:candidates.length}));
  }
  rows.push(row);write();
 }catch(error){row.reason=String(error);rows.push(row);write();}
}
write();console.log(JSON.stringify({label,tried,available:pool.length,candidates:candidates.length,counts:[1,2,3].map(d=>[d,candidates.filter(c=>c.difficulty===d).length])}));
