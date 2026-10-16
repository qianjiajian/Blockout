import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadRuntime, verifyCandidate, levelSha256, routeSha256 } from './contract.mjs';
import { expectedDailySlots, catalogProgress } from './catalog-progress.mjs';
import { independentPartitionSha256, boardBaselineKey } from './geometry.mjs';
import { decorate } from './mechanism-decorate.mjs';
import { verifyRulesLock } from '../../verify-rules-lock.mjs';

const ROOT='deliverables/daily-formal-v2-20261007';
const [label,limitArg='80']=process.argv.slice(2),limit=Number(limitArg);
if(!label||!Number.isSafeInteger(limit)||limit<1||limit>450)throw Error('Usage: allocate-pool.mjs new-run-label [max-attempts<=450]');
const output=`${ROOT}/selected-v2`,runDir=`${output}/runs/${label}`;
await fs.mkdir(`${output}/runs`,{recursive:true});await fs.mkdir(runDir,{recursive:false});
const lock=verifyRulesLock();if(!lock.ok)throw Error('Rules lock failed');
const runtime=await loadRuntime(),expected=expectedDailySlots(runtime.MECHANISM_GUIDE);
const decoratorSha256=createHash('sha256').update(await fs.readFile('tools/daily-challenge/formal-v2/mechanism-decorate.mjs')).digest('hex');
if(expected.length!==450)throw Error('Full 450 scope changed');
const indexFile=`${output}/index.json`,historyFile=`${output}/attempt-history.json`;
let index;
try{index=JSON.parse(await fs.readFile(indexFile,'utf8'));}
catch(error){if(error.code!=='ENOENT')throw error;
  const seed=JSON.parse(await fs.readFile(`${ROOT}/qualified-stage1-round1/index.json`,'utf8'));
  index={scope:450,formalReady:false,productionChanged:false,entries:seed.entries.filter(row=>row.accepted)};
}
let history=[];
try{history=JSON.parse(await fs.readFile(historyFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const attempted=new Set(history.map(row=>row.attemptKey)),selected=new Map(index.entries.map(row=>[row.formalId,row]));
const usedPartitions=new Set(),usedBases=new Set();
for(const row of selected.values()){
  const result=JSON.parse(await fs.readFile(row.path,'utf8'));
  usedPartitions.add(independentPartitionSha256(result.level));
  usedBases.add(row.basePartitionSha256??independentPartitionSha256(result.level));
}
async function atomic(file,value){const temp=`${file}.${process.pid}.tmp`;await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n');await fs.rename(temp,file);}
async function filesUnder(dir){const out=[];for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=`${dir}/${entry.name}`;if(entry.isDirectory())out.push(...await filesUnder(file));else if(entry.name.endsWith('.json'))out.push(file);}return out;}
const candidates=[];
for(const directory of [`${ROOT}/design-lab`,`${ROOT}/design-d3-proof`,`${ROOT}/design-band-proof`]){
  if(!await fs.stat(directory).then(s=>s.isDirectory()).catch(()=>false))continue;
  for(const file of await filesUnder(directory)){
    let record;try{record=JSON.parse(await fs.readFile(file,'utf8'));}catch{continue;} // A running producer may still be writing a progress file; retry on the next bounded batch.
    if(!record.accepted||!record.level||!record.drags||!record.sourceLevelId||![1,2,3].includes(record.difficulty))continue;
    if(levelSha256(record.level)!==record.levelSha256||routeSha256(record.drags)!==record.routeSha256)continue;
    const partition=independentPartitionSha256(record.level);if(usedBases.has(partition))continue;
    const mechanisms=runtime.mechanismsUsedByDailyLevel(record.level);
    candidates.push({file,record,partition,mechanisms});
  }
}
// Scarce prerequisites first. Constraint-only stages may use any sufficiently
// late-compatible plain layout, so they must not consume the only concave or
// irregular seed needed by an earlier stage. Each base is used at most once.
const skipped=new Set((process.env.DAILY_ALLOCATION_SKIP_MECHANISMS??'').split(',').filter(Boolean));
const priority=['irregular-board','irregular-block','frozen-exit','numeric-ice','generator','colored-grid','multilayer-shell',
  'layered-lift','axis-block','key-lock','star','bomb','flip-door','color-exit','shutter'].filter(id=>!skipped.has(id));
const rows=[],start=new Date().toISOString();let attempts=0;
outer:for(const mechanism of priority){
  for(const difficulty of [1,2,3]){
    const slots=expected.filter(row=>row.newestMechanism===mechanism&&row.difficulty===difficulty&&!selected.has(row.formalId));
    for(const slot of slots){
      const available=candidates.filter(base=>!usedBases.has(base.partition)&&base.record.difficulty===difficulty
        &&base.mechanisms.every(id=>runtime.MECHANISM_GUIDE.find(m=>m.id===id)?.unlockLevel<=slot.unlockLevel)
        &&(!['irregular-board','irregular-block'].includes(mechanism)||base.mechanisms.includes(mechanism)));
      for(const base of available){
        if(attempts>=limit)break outer;
        const attemptKey=`${slot.stageKey}:${difficulty}:${base.record.levelSha256}:${decoratorSha256}:${runtime.toolchainSha256}`;
        if(attempted.has(attemptKey))continue;
        attempted.add(attemptKey);attempts++;
        const row={formalId:slot.formalId,stageKey:slot.stageKey,difficulty,baseFile:base.file,basePartitionSha256:base.partition,decoratorSha256,attemptKey,status:'PENDING'};
        try{
          const decorated=base.mechanisms.includes(mechanism)
            ?{ok:true,level:structuredClone(base.record.level),drags:structuredClone(base.record.drags),provenance:{kind:'independently-retiled-native-baseline'}}
            :await decorate(base.record.level,base.record.drags,mechanism,{runtime,variant:slot.slot-1,maxAttempts:24,idPrefix:slot.formalId});
          if(!decorated.ok){row.status='NO_COMPATIBLE_DECORATION';row.reason=decorated.reason;row.failedPlans=decorated.attempts;}
          else{
            const level=decorated.level;level.id=base.record.sourceLevelId;level.reward=0;
            level.name=`每日挑战 ${slot.newestMechanism} ${difficulty}-${slot.slot}`;
            const partition=independentPartitionSha256(level),source=runtime.LEVELS.find(x=>x.id===level.id);
            if(usedPartitions.has(partition))throw Error('Duplicate actual partition');
            if(!source||boardBaselineKey(level)!==boardBaselineKey(source))throw Error('Mainline board baseline changed');
            const result=await verifyCandidate(runtime,{formalId:slot.formalId,stageKey:slot.stageKey,difficulty,sourceLevelId:source.id,
              level,drags:decorated.drags,...(decorated.timeSchedule?{timeSchedule:decorated.timeSchedule}:{})},
              {lowerBudget:{maxStates:250000,maxDragStates:2000,maxTransitions:3000000,maxMilliseconds:10000}});
            result.provenance={ruleVersion:lock.activeVersion,baseFile:base.file,baseLevelSha256:base.record.levelSha256,
              basePartitionSha256:base.partition,baseConstruction:base.record.provenance,decoration:decorated.provenance};
            result.mechanismEvents={activity:decorated.mechanismActivity??null,events:decorated.replay?.events??[],trace:decorated.replay?.trace??[]};
            const file=`${runDir}/${slot.formalId}-${result.levelSha256.slice(0,10)}.json`;
            await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
            Object.assign(row,{path:file,status:result.status,accepted:result.accepted,L:result.L,U:result.U,levelSha256:result.levelSha256,reasons:result.reasons});
            if(result.accepted){selected.set(slot.formalId,row);usedPartitions.add(partition);usedBases.add(base.partition);}
          }
        }catch(error){row.status='REJECTED_ERROR';row.reason=error.message;}
        rows.push(row);history.push(row);
        await atomic(historyFile,history);
        await atomic(indexFile,{scope:450,formalReady:false,productionChanged:false,updatedAt:new Date().toISOString(),
          entries:[...selected.values()],files:[...selected.values()].map(row=>row.path)});
        await atomic(`${runDir}/progress.json`,{startedAt:start,attempts,limit,selected:selected.size,remaining:450-selected.size,rows});
        console.log(JSON.stringify({attempt:attempts,formalId:slot.formalId,status:row.status,L:row.L,U:row.U,selected:selected.size}));
        if(row.accepted)break;
      }
    }
  }
}
const progress=await catalogProgress(runtime,[...selected.values()].map(row=>row.path));
await fs.writeFile(`${runDir}/catalog-readiness.json`,JSON.stringify(progress,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({scope:450,attempts,counts:progress.counts,duplicates:progress.geometryDuplicates.length,formalReady:false}));
