import fs from 'node:fs';
import path from 'node:path';
import {loadRuntime,levelSha256,auditStaticCandidate,verifyCandidate} from './contract.mjs';
import {searchSpatial} from '../../continuation211-colored-witness.mjs';
import {localRetiles,fixColors,rectangular} from './design-layout-factory.mjs';
import {independentPartitionSha256,boardBaselineSha256} from './geometry.mjs';
import {adaptPlainRoute,alignRetiledIdentities} from './proof-design-route-adapter.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const ROOT='deliverables/daily-formal-v2-20261007',OUT=`${ROOT}/design-band-proof`;
const label=process.env.BAND_JOB??'irregular198-band-01',sourceLevelId=Number(process.env.BAND_SOURCE??198);
const stageKey=process.env.BAND_STAGE??'mechanisms-irregular-block-5',cap=Number(process.env.BAND_CAP??120);
const target={1:Number(process.env.BAND_TARGET_D1??6),2:Number(process.env.BAND_TARGET_D2??14)};
if(!/^[a-z0-9-]+$/.test(label)||!Number.isInteger(cap)||cap<1||cap>200||Object.values(target).some(x=>!Number.isInteger(x)||x<0||x>100))throw new Error('Invalid finite job');
const job=path.join(OUT,label);if(fs.existsSync(job))throw new Error('New immutable job label required');
const lock=verifyRulesLock();if(!lock.ok||lock.activeVersion!=='1.153.0')throw new Error('Rules lock mismatch');
fs.mkdirSync(job,{recursive:true});
const runtime=await loadRuntime(),used=new Set(),seeds=[];
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.json')?[path.join(dir,e.name)]:[]):[];
for(const file of [`${ROOT}/design-lab`,`${ROOT}/design-d3-proof`,OUT].flatMap(walk)){
 let packet;try{packet=JSON.parse(fs.readFileSync(file));}catch{continue;}
 if(packet.level)used.add(independentPartitionSha256(packet.level));
 if(packet.accepted&&[1,2].includes(packet.difficulty)&&(!process.env.BAND_ONLY_D2||packet.difficulty===2)&&packet.sourceLevelId===sourceLevelId&&packet.stageKey===stageKey)
  seeds.push({file,packet});
}
seeds.sort((a,b)=>b.packet.difficulty-a.packet.difficulty||(a.packet.lowerBound?.result?.discoveredStates??1e9)-(b.packet.lowerBound?.result?.discoveredStates??1e9));
if(!seeds.length)throw new Error('No accepted band seed');
const lowerBudget={maxMilliseconds:5000,maxStates:160000,maxTransitions:900000},rows=[],accepted=[];
const counts=()=>Object.fromEntries([1,2].map(d=>[d,accepted.filter(x=>x.difficulty===d).length]));
const done=()=>[1,2].every(d=>counts()[d]>=target[d]);let tested=0,serial=0;
const progress=()=>fs.writeFileSync(path.join(job,'progress.json'),JSON.stringify({label,sourceLevelId,stageKey,tested,cap,target,counts:counts(),
  status:'FINITE_BAND_PARTITION_GENERATION',productionChanged:false,formalReady:false,toolchainSha256:runtime.toolchainSha256,
  budgets:{lowerBudget,routeAdapterMilliseconds:1200,routeSearchMilliseconds:1800,neverRetrySamePartition:true},rows,accepted},null,2)+'\n');
for(const seed of seeds){
 if(tested>=cap||done())break;
 const startAtSeed=tested;
 const pool=localRetiles(seed.packet.level,{irregular:stageKey!=='mechanisms-color-exit-1',maxUnion:12}).map((x,i)=>({...x,order:Math.imul(i+label.length*17,2654435761)>>>0})).sort((a,b)=>a.order-b.order);
 for(const item of pool){
  if(tested>=cap||done()||tested-startAtSeed>=48)break;if(used.has(item.partition))continue;used.add(item.partition);serial++;
  const level=item.level;if(stageKey==='mechanisms-irregular-block-5'&&!level.blocks.some(b=>!rectangular(b.shape)))continue;
  alignRetiledIdentities(level,seed.packet.level,item.changedIds);
  if(!fixColors(level,item.changedIds,serial*9319+label.length*1231,runtime))continue;
  level.id=sourceLevelId;level.reward=0;level.name=`每日难度布局 ${label}-${serial}`;
  const candidate={formalId:`daily-${stageKey}-d2-lab-${label}-${serial}`,stageKey,difficulty:2,sourceLevelId,level};
  const staticAudit=await auditStaticCandidate(runtime,candidate);if(!staticAudit.passed){rows.push({serial,status:'STATIC_REJECTED',partitionSha256:item.partition,issues:staticAudit.issues});continue;}
  tested++;let drags=seed.packet.drags,replay=runtime.replayRevisedRoute(level,drags),routeSearch;
  if(!replay.valid||!replay.complete)for(const alternative of seeds.slice(0,24)){
   const r=runtime.replayRevisedRoute(level,alternative.packet.drags);if(r.valid&&r.complete){drags=alternative.packet.drags;replay=r;break;}
  }
  if(!replay.valid||!replay.complete){const r=adaptPlainRoute(runtime,level,seed.packet.drags);if(r.status==='witness'){drags=r.drags;replay=r.replay;routeSearch=r;}}
  if(!replay.valid||!replay.complete){routeSearch=searchSpatial(level,runtime,{floor:80,normalize:true,maxMilliseconds:1800,maxStates:160000,maxTransitions:900000,orderSeed:serial});drags=routeSearch.drags;replay=drags?runtime.replayRevisedRoute(level,drags):null;}
  let report;
  if(!replay?.valid||!replay.complete)report={...candidate,accepted:false,status:'PENDING_COMPLETE_ROUTE',routeSearch,replay};
  else if(replay.nonClearingDrags<16)report={...candidate,accepted:false,status:'COUNTEREXAMPLE_BELOW_D1',drags,replay};
  else if(replay.nonClearingDrags>30)report={...candidate,accepted:false,status:'PENDING_U_WITHIN_D1_D2',drags,replay};
  else {
   let difficulty=replay.nonClearingDrags<=20?1:2;
   report=await verifyCandidate(runtime,{...candidate,difficulty,formalId:`daily-${stageKey}-d${difficulty}-lab-${label}-${serial}`,drags},{lowerBudget});
   const shortcut=report.lowerBound?.result;
   if(!report.accepted&&difficulty===2&&shortcut?.drags&&shortcut.cost>=16&&shortcut.cost<=20)
    report=await verifyCandidate(runtime,{...candidate,difficulty:1,formalId:`daily-${stageKey}-d1-lab-${label}-${serial}`,drags:shortcut.drags},{lowerBudget});
  }
  report.levelSha256=levelSha256(level);report.partitionSha256=item.partition;report.boardBaselineSha256=boardBaselineSha256(level);
  report.provenance={ruleVersion:lock.activeVersion,sourceLevelId,baselinePath:seed.file,retainedSourceBoard:true,retiledBlockIds:item.changedIds,sourceShapeAndColorDifferences:true};
  const file=path.join(job,`candidate-${String(serial).padStart(4,'0')}.json`).replaceAll('\\','/');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  const row={serial,file,seed:seed.file,partitionSha256:item.partition,status:report.status,difficulty:report.difficulty,L:report.L??null,U:report.U??replay?.nonClearingDrags??null};
  rows.push(row);if(report.accepted)accepted.push(row);progress();console.log(JSON.stringify({label,tested,serial,status:row.status,difficulty:row.difficulty,L:row.L,U:row.U,counts:counts()}));
 }
}
progress();fs.writeFileSync(path.join(job,'summary.json'),JSON.stringify({label,tested,counts:counts(),accepted,finished:true,toolchainSha256:runtime.toolchainSha256},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({finished:true,label,tested,counts:counts()}));
