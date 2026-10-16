import fs from 'node:fs';
import path from 'node:path';
import {loadRuntime,levelSha256,auditStaticCandidate,verifyCandidate} from './contract.mjs';
import {searchSpatial} from '../../continuation211-colored-witness.mjs';
import {localRetiles,fixColors,rectangular} from './design-layout-factory.mjs';
import {independentPartitionSha256,boardBaselineSha256} from './geometry.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {adaptPlainRoute} from './proof-design-route-adapter.mjs';

const OUT='deliverables/daily-formal-v2-20261007/design-d3-proof';
const LAB='deliverables/daily-formal-v2-20261007/design-lab';
const label=process.env.D3_JOB??'d3-batch-01',cap=Number(process.env.D3_CAP??80),target=Number(process.env.D3_TARGET??20);
const sourceLevelId=Number(process.env.D3_SOURCE??198),explicitSeed=process.env.D3_SEED_FILE;
if(!/^[a-z0-9-]+$/.test(label)||!Number.isSafeInteger(cap)||cap<1||cap>200||!Number.isSafeInteger(target)||target<1||target>100)throw new Error('Invalid bounded job configuration');
const job=path.join(OUT,label);
if(fs.existsSync(job))throw new Error('New job label required; prior evidence is immutable');
const lock=verifyRulesLock();if(!lock.ok||lock.activeVersion!=='1.153.0')throw new Error('Active rules lock mismatch');
fs.mkdirSync(job,{recursive:true});
const runtime=await loadRuntime(),used=new Set(),seedPackets=[];
const files=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.json')?[path.join(dir,entry.name)]:[]):[];
for(const file of [...files(LAB),...files(OUT)]) {
  let packet;try{packet=JSON.parse(fs.readFileSync(file,'utf8'));}catch{continue;}
  if(packet.level)used.add(independentPartitionSha256(packet.level));
  if(packet.accepted&&packet.difficulty===3&&packet.level?.id===sourceLevelId&&(!explicitSeed||path.resolve(file)===path.resolve(explicitSeed))&&packet.level.blocks.every(b=>!b.layers&&!b.shutterId)&&!packet.level.shutters?.length&&!packet.level.generators?.length) {
    if(!seedPackets.some(x=>x.partition===independentPartitionSha256(packet.level)))seedPackets.push({file,packet,partition:independentPartitionSha256(packet.level)});
  }
}
seedPackets.sort((a,b)=>(a.packet.lowerBound?.result?.discoveredStates??1e9)-(b.packet.lowerBound?.result?.discoveredStates??1e9)||a.file.localeCompare(b.file));
if(!seedPackets.length)throw new Error('No qualified D3 seed for selected mainline source');
const lowerBudget={maxMilliseconds:5000,maxStates:160000,maxTransitions:900000};
const routeBudget={maxMilliseconds:1800,maxStates:160000,maxTransitions:900000};
const rows=[],accepted=[];let tested=0,serial=0;
const progress=()=>fs.writeFileSync(path.join(job,'progress.json'),JSON.stringify({schemaVersion:1,ruleVersion:lock.activeVersion,
  status:'BOUNDED_D3_PARTITION_GENERATION',productionChanged:false,formalReady:false,label,cap,target,tested,
  budgets:{lowerBudget,routeBudget,neverRetrySamePartition:true},toolchainSha256:runtime.toolchainSha256,rows,accepted},null,2)+'\n');
// One pass per seed. New accepted layouts can seed later uniquely named jobs.
for(const seed of seedPackets){
  if(tested>=cap||accepted.length>=target)break;
  const testedAtSeedStart=tested;
  const pool=localRetiles(seed.packet.level,{irregular:true,maxUnion:12}).map((x,i)=>({...x,order:Math.imul(i+label.length*13,2654435761)>>>0})).sort((a,b)=>a.order-b.order);
  for(const item of pool){
    if(tested>=cap||accepted.length>=target||tested-testedAtSeedStart>=24)break;
    if(used.has(item.partition))continue;used.add(item.partition);serial++;
    const level=item.level;
    if(!fixColors(level,item.changedIds,78119+serial*7919+label.length*111,runtime))continue;
    level.id=sourceLevelId;level.reward=0;level.name=`每日超超难独立重铺 ${label}-${serial}`;
    const stageKey=runtime.mechanismsUsedByDailyLevel(level).includes('irregular-board')?'mechanisms-irregular-board-8':level.blocks.some(b=>!rectangular(b.shape))?'mechanisms-irregular-block-5':'mechanisms-color-exit-1';
    const formalId=`daily-${stageKey}-d3-lab-${label}-${serial}`;
    const candidate={formalId,stageKey,difficulty:3,sourceLevelId,level};
    const staticAudit=await auditStaticCandidate(runtime,candidate);
    if(!staticAudit.passed){rows.push({serial,seed:seed.file,partitionSha256:item.partition,status:'STATIC_REJECTED',issues:staticAudit.issues});continue;}
    tested++;
    let drags=seed.packet.drags,routeSearch=null;
    let replay=runtime.replayRevisedRoute(level,drags);
    if(!replay.valid||!replay.complete)for(const alternative of seedPackets.slice(0,32)) {
      if(alternative===seed)continue;
      const attempt=runtime.replayRevisedRoute(level,alternative.packet.drags);
      if(attempt.valid&&attempt.complete){drags=alternative.packet.drags;replay=attempt;break;}
    }
    if(!replay.valid||!replay.complete){
      const adapted=adaptPlainRoute(runtime,level,seed.packet.drags);
      if(adapted.status==='witness'){drags=adapted.drags;replay=adapted.replay;routeSearch=adapted;}
    }
    if(!replay.valid||!replay.complete){
      routeSearch=searchSpatial(level,runtime,{floor:100,normalize:true,...routeBudget,orderSeed:serial});
      drags=routeSearch.drags;
      replay=drags?runtime.replayRevisedRoute(level,drags):null;
    }
    let report;
    if(!replay?.valid||!replay.complete)report={...candidate,accepted:false,status:'PENDING_COMPLETE_ROUTE',staticAudit,routeSearch,replay};
    else if(replay.nonClearingDrags<31)report={...candidate,accepted:false,status:'COUNTEREXAMPLE_BELOW_D3',drags,replay};
    else report=await verifyCandidate(runtime,{...candidate,drags},{lowerBudget});
    report.provenance={ruleVersion:lock.activeVersion,sourceLevelId,baselinePath:seed.file,
      retainedSourceBoard:true,retiledBlockIds:item.changedIds,sourceShapeAndColorDifferences:true,
      description:`Exact union of adjacent source bodies retiled into two native shapes; source ${sourceLevelId} ${level.width}x${level.height} board mask and full interlocking inventory retained.`};
    report.partitionSha256=item.partition;report.boardBaselineSha256=boardBaselineSha256(level);report.levelSha256=levelSha256(level);
    const file=path.join(job,`candidate-${String(serial).padStart(4,'0')}.json`).replaceAll('\\','/');
    fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    const row={serial,seed:seed.file,file,partitionSha256:item.partition,status:report.status,L:report.L??null,U:report.U??replay?.nonClearingDrags??null,
      drags:drags?.length,lower:report.lowerBound?.result?.status,stageKey};
    rows.push(row);if(report.accepted)accepted.push(row);progress();
    console.log(JSON.stringify({label,tested,serial,status:row.status,L:row.L,U:row.U,accepted:accepted.length,stageKey}));
  }
}
progress();fs.writeFileSync(path.join(job,'summary.json'),JSON.stringify({label,tested,accepted,cap,target,toolchainSha256:runtime.toolchainSha256,finished:true},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({finished:true,label,tested,accepted:accepted.length}));
