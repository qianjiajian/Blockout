import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {intensityTargets,INTENSITY_VERSION} from './mechanism-intensity.mjs';
import {describeLayout} from './diversity.mjs';
import {boardCells} from './diversity-layout-factory.mjs';

const [selectionPath,output]=process.argv.slice(2);assert(selectionPath&&output&&!fs.existsSync(output));
const root='deliverables/daily-formal-v3-20261008',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),binding=p=>({path:p,sha256:hash(p)});
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
const selection=read(selectionPath),selected=selection.files.map(p=>({...read(p),receiptFile:p})),d3=selected.filter(r=>r.difficulty===3);
const stageRows=runtime.MECHANISM_GUIDE.map(s=>{const rows=d3.filter(r=>r.newestMechanism===s.id);return{mechanism:s.id,unlockLevel:s.unlockLevel,required:10,selected:rows.length,missing:10-rows.length,formalIds:rows.map(r=>r.formalId),targets:['color-exit','irregular-block','irregular-board'].includes(s.id)?null:intensityTargets(s.id,3)};});
const parseErrors=[],attempts=[];
function walk(dir,fn){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())walk(p,fn);else if(e.name.endsWith('.json'))fn(p,e.name);}}
walk(`${root}/selection`,(file,name)=>{if(!/^attempt-/.test(name))return;let r;try{r=read(file);}catch(error){parseErrors.push({file,error:error.message});return;}
 if(r.difficulty!==3)return;
 const errors=[...new Set((r.adaptation?.failedAttempts??[]).map(x=>x.error))],version=r.adaptation?.version??r.strength?.version??null;
 attempts.push({...binding(file),formalId:r.formalId,mechanism:r.newestMechanism,base:r.baseInputFile,accepted:r.accepted===true,status:r.status,intensityVersion:version,
  L:r.L??null,U:r.U??null,lowerTermination:r.lowerBound?.result?.termination??null,errors,reason:r.reasons??null});
});
const counts=(rows,key)=>rows.reduce((out,r)=>(out[key(r)]=(out[key(r)]??0)+1,out),{});
const attemptSummary=stageRows.map(s=>{const rows=attempts.filter(r=>r.mechanism===s.mechanism),current=rows.filter(r=>r.intensityVersion===INTENSITY_VERSION);return{mechanism:s.mechanism,
 allHistoricalAttempts:rows.length,currentIntensityAttempts:current.length,currentStatusCounts:counts(current,r=>r.status),historicalStatusCounts:counts(rows,r=>r.status),
 currentAdaptationErrors:counts(current.flatMap(r=>r.errors.map(error=>({error}))),r=>r.error)};});
const rectangle=b=>b.shape.length===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])));
function routeFacts(record){
 const level=record.level,drags=record.drags,model=new runtime.PuzzleModel(structuredClone(level));model.startCountdown();
 const rows=new Map(level.blocks.map(b=>[b.id,{id:b.id,color:b.color,shapeCells:b.shape.length,rectangle:rectangle(b),x:b.x,y:b.y,
  firstAction:null,clearsBeforeFirst:null,exitIndex:null,unitSteps:0,poses:[[b.x,b.y]],block:b}]));
 const gateFirst=new Map(),clearEvents=[];
 for(const [i,drag]of drags.entries()){
  const r=rows.get(drag.blockId),before=model.snapshot();assert(r);
  if(r.firstAction===null){r.firstAction=i+1;r.clearsBeforeFirst=before.cleared;}
  r.unitSteps+=drag.path.length;r.poses.push(...drag.path);
  applyNativeDrag(model,drag);
  if(drag.exitSide){r.exitIndex=i+1;r.exitSide=drag.exitSide;r.clearsBeforeExit=before.cleared;if(!gateFirst.has(r.color))gateFirst.set(r.color,before.cleared);clearEvents.push({drag:i+1,id:r.id,color:r.color,clearsBefore:before.cleared,area:r.shapeCells});}
 }
 assert(model.snapshot().complete);
 const bodies=[...rows.values()],N=bodies.length,counterProfiles=[2,3,4,5,6,7,8].map(c=>({counter:c,
  numericIceBodies:bodies.filter(b=>b.clearsBeforeFirst>=c).map(b=>b.id),
  physicalShutterRectangles:bodies.filter(b=>b.rectangle&&b.clearsBeforeFirst>=c).map(b=>b.id),
  frozenGateColours:[...gateFirst].filter(([,n])=>n>=c).map(([color])=>color)}));
 const keyProfiles=[2,3,4,5,6,7].map(counter=>{const keys=bodies.toSorted((a,b)=>a.exitIndex-b.exitIndex).slice(0,counter+3),ids=new Set(keys.map(b=>b.id));
  const locks=bodies.filter(b=>!ids.has(b.id)&&keys.filter(k=>k.exitIndex<b.firstAction).length>=counter);
  return{counter,reservedKeys:keys.map(b=>b.id),compatibleLocks:locks.map(b=>({id:b.id,count:keys.filter(k=>k.exitIndex<b.firstAction).length}))};});
 const lifts=bodies.filter(b=>b.rectangle&&b.shapeCells>=2&&b.firstAction===b.exitIndex&&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<N-2);
 const rim=[];let freeRimCapacity=0;
 for(const side of ['left','right','top','bottom']){
  const length=['left','right'].includes(side)?level.height:level.width,used=new Set(level.gates.filter(g=>g.side===side).flatMap(g=>Array.from({length:g.size},(_,i)=>g.offset+i)));
  const freeRuns=[];let run=[];for(let i=0;i<=length;i++){if(i<length&&!used.has(i))run.push(i);else if(run.length){freeRuns.push(run);run=[];}}
  const bound=freeRuns.reduce((sum,r)=>sum+Math.floor(r.length/3),0);freeRimCapacity+=bound;rim.push({side,length,gateOccupied:[...used],freeRuns,threeCellMountUpperBound:bound});
 }
 const mountCandidates=[];
 for(const b of bodies.filter(b=>b.rectangle&&b.firstAction===b.exitIndex&&b.clearsBeforeFirst>=2&&b.clearsBeforeFirst<N-2)){
  const w=1+Math.max(...b.block.shape.map(p=>p[0])),h=1+Math.max(...b.block.shape.map(p=>p[1]));if(w>3||h>3)continue;
  for(const side of ['left','right','top','bottom']){
   if(side==='left'&&b.x!==0||side==='right'&&b.x+w!==level.width||side==='top'&&b.y!==0||side==='bottom'&&b.y+h!==level.height)continue;
   const vertical=['left','right'].includes(side),length=vertical?level.height:level.width,first=vertical?b.y:b.x,last=first+(vertical?h:w)-1;
   for(let offset=Math.max(1,first);offset<=Math.min(length-2,last);offset++){
    if(first<offset-1||last>offset+1||level.gates.some(g=>g.side===side&&g.offset<offset+2&&offset-1<g.offset+g.size))continue;
    mountCandidates.push({blockId:b.id,side,offset,firstAction:b.firstAction,clearsBeforeFirst:b.clearsBeforeFirst});
   }
  }
 }
 let maximumParkingRun=0,run=0,longest=null,precedingClear=0;
 for(const [i,d]of drags.entries()){if(d.exitSide){if(run>maximumParkingRun){maximumParkingRun=run;longest={afterClearDrag:precedingClear,beforeClearDrag:i+1,nonClearingDrags:run};}run=0;precedingClear=i+1;}else run++;}
 return{width:level.width,height:level.height,playableCells:boardCells(level).length,openingBodies:N,gateCount:level.gates.length,
  clearEvents,counterProfiles,keyProfiles,liftEligible:lifts.map(({id,shapeCells,clearsBeforeFirst})=>({id,shapeCells,clearsBeforeFirst})),
  generator:{targetInstances:4,queuePerInstance:5,minimumAddedBodies:20,freeRimCapacityUpperBound:freeRimCapacity,rim,
   compatibleOpeningOwners:[...new Set(mountCandidates.map(m=>m.blockId))],mountCandidates,
   compatibleMountUpperBound:Math.min(freeRimCapacity,new Set(mountCandidates.map(m=>m.blockId)).size),
   boundsAreNecessaryOnly:true,routeFeasibilityNotInferred:true},
  axisEligible:bodies.filter(b=>b.unitSteps>0&&(b.poses.every(p=>p[0]===b.poses[0][0])&&['top','bottom'].includes(b.exitSide)||b.poses.every(p=>p[1]===b.poses[0][1])&&['left','right'].includes(b.exitSide))).map(b=>b.id),
  latestFirstActionClears:Math.max(...bodies.map(b=>b.clearsBeforeFirst)),longestNonClearingRun:longest,
  bodyTiming:bodies.map(({block,poses,...r})=>r)};
}
const baseFacts=[];
for(const r of d3){
 const file=r.baseInputFile;assert(file);const b=read(file);assert.equal(hash(file),r.baseInputFileSha256);
 const row={formalId:r.formalId,sourceLevelId:r.sourceLevelId,mechanism:r.newestMechanism,L:r.L,U:r.U,receipt:binding(r.receiptFile),base:binding(file),baseLevelSha256:levelSha256(b.level)};
 try{assertPlainProofDomain(b.level);}catch(error){baseFacts.push({...row,plain:false,reason:error.message});continue;}
 const canonical=runtime.replayRevisedRoute(b.level,b.drags),independent=independentReplay(runtime,b.level,b.drags);
 assert(canonical.valid&&canonical.complete&&independent.valid&&independent.complete&&!independent.failed&&canonical.nonClearingDrags===independent.nonClearingDrags);
 baseFacts.push({...row,plain:true,baseActualU:canonical.nonClearingDrags,canonicalReplayValid:true,independentReplayValid:true,...routeFacts(b)});
}
const designSuccesses=[];
walk(`${root}/design`,(file,name)=>{if(!/^candidate-/.test(name))return;let p;try{p=read(file);}catch(error){parseErrors.push({file,error:error.message});return;}
 if(p.accepted!==true||!p.level||!(p.L>=31)||!(p.U>=p.L))return;
 designSuccesses.push({...binding(file),sourceLevelId:p.sourceLevelId,L:p.L,U:p.U,partitionSha256:describeLayout(p.level).exactPartitionSha256,
  proofToolchainSha256:p.proofToolchainSha256??p.toolchainSha256??null,selectedAsBase:d3.some(r=>r.baseInputFile===file)});
});
const baselinePath=`${root}/mechanisms/old450-baseline.json`,baseline=read(baselinePath);
const report={schemaVersion:1,status:'READ_ONLY_D3_SUPPLY_AND_ADAPTATION_DIAGNOSIS',createdAt:new Date().toISOString(),
 selection:binding(selectionPath),selectedCount:selected.length,d3Selected:d3.length,d3Required:150,d3Missing:150-d3.length,
 sourceLevels:new Set(d3.map(r=>r.sourceLevelId)).size,stageRows,
 currentIntensityVersion:INTENSITY_VERSION,intensityFile:binding('tools/daily-challenge/formal-v3/mechanism-intensity.mjs'),
 attemptSummary,attempts,baseFacts,designSuccesses,
 exploratoryD3SuccessFiles:designSuccesses.length,exploratoryD3DistinctPartitions:new Set(designSuccesses.map(r=>r.partitionSha256)).size,
 old450Baseline:binding(baselinePath),oldD3MechanismSummary:baseline.summary.filter(r=>r.difficulty===3),
 tool:binding('tools/daily-challenge/formal-v3/inspect-d3-bottlenecks.mjs'),proofToolchainSha256:runtime.toolchainSha256,
 parseErrors,newFullBoardSearchInvocations:0,newHeldReachabilitySearches:0,mechanismAdaptationsRun:0,productionChanged:false,formalReady:false,
 limitations:['Route eligibility counts describe these supplied witnesses, not all possible solutions.',
 'A static mount upper bound can prove incompatibility of the current geometry but cannot prove a newly adapted route.',
 'Historical attempts include old intensity versions and repeated stage attempts; separate current-version and per-base counts are required.',
 'Exploratory accepted D3 packets are not all qualified current-policy slots; duplicate and visually rejected families remain in historical evidence.']};
fs.mkdirSync(output,{recursive:false});fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,selected:selected.length,d3:d3.length,missing:150-d3.length,attempts:attempts.length,exploratoryD3Files:designSuccesses.length,exploratoryD3Partitions:report.exploratoryD3DistinctPartitions,baseFacts:baseFacts.length,parseErrors:parseErrors.length}));
