import fs from 'node:fs';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import { loadSpatialApi, searchSpatial } from '../continuation211-colored-witness.mjs';
import { loadContinuationRuntime } from '../continuation211-runtime.mjs';
import { staticDelayedLiftFloor } from '../regeneration211-design/native-static-lift214.mjs';
const IDS=[68,73,78,83,88,93,98];
const OUT='deliverables/league-regeneration-20261004/late-experiments'; fs.mkdirSync(OUT,{recursive:true});
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const b=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts'"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {LEVELS}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const api=await loadSpatialApi(); const core=await loadContinuationRuntime();
function mutate(base,id,attempt){
  const level=structuredClone(base); level.id=900000+id; level.name=`荣耀联赛·${id}·超难有限变异${attempt}`; level.difficulty='super'; level.mechanismRules='revised-2026-09-27-v1.5'; level.timeSeconds=180; level.reward=0;
  const gateColors=[...new Set((level.gates??[]).map(g=>g.color))];
  const shift=(attempt%Math.max(1,gateColors.length));
  const colorMap=new Map(gateColors.map((c,i)=>[c,gateColors[(i+shift)%gateColors.length]]));
  const colorChanges=[];
  for(const block of level.blocks){
    if(block.layers?.length)continue;
    if(!colorMap.has(block.color))continue;
    const next=colorMap.get(block.color); if(next!==block.color){colorChanges.push({blockId:block.id,from:block.color,to:next}); block.color=next;}
  }
  // A bounded shape/position mutation: swap only equal silhouettes within the same visible/hidden cohort.
  const groups=new Map();
  for(const block of level.blocks.filter(x=>!x.layers)){const key=`${block.shutterId??'opening'}|${JSON.stringify(block.shape)}`; if(!groups.has(key))groups.set(key,[]);groups.get(key).push(block);}
  const positionSwaps=[];
  for(const group of groups.values()){
    if(group.length<2)continue;
    const a=group[(attempt+group.length-1)%group.length], b=group[attempt%group.length];
    if(a===b)continue;
    const oldA=[a.x,a.y],oldB=[b.x,b.y]; [a.x,a.y]=oldB; [b.x,b.y]=oldA; positionSwaps.push({a:a.id,b:b.id});
  }
  return {level,mutation:{attempt,colorShift:shift,colorChanges:colorChanges.length,positionSwaps}};
}
function unsupported(level){const reasons=[];if(level.generators?.length)reasons.push('generator');if(level.flipDoors?.length)reasons.push('flip-door');if(level.coloredGrids?.length)reasons.push('colored-grid');if(level.blocks.some(b=>b.keyId||b.lockedBy))reasons.push('key-lock');if(level.elevators?.length||level.conveyors?.length)reasons.push('autonomous-platform');return reasons;}
const rows=[];
for(const id of IDS){
  const base=LEVELS.find(x=>x.id===id); const attempts=[]; let accepted=null;
  for(let attempt=0;attempt<4;attempt++){
    const {level,mutation}=mutate(base,id,attempt); const row={attempt,mutation,fingerprint:digest({level,attempt}),budget:{lower:{floor:21,maxMilliseconds:1800,maxStates:120000},upper:{floor:31,maxMilliseconds:1800,maxStates:120000}},status:'BLOCKED',failureReasons:[],sourceLevel:id};
    const unsupportedReasons=unsupported(level); if(unsupportedReasons.length)row.failureReasons.push(`solver-profile-unsupported:${unsupportedReasons.join(',')}`);
    let structural='PASS'; try{api.validateLevel(level);row.structural=structural;}catch(e){row.structural='FAIL';row.failureReasons.push(`structural:${e.message.slice(0,160)}`);attempts.push(row);continue;}
    if(!unsupportedReasons.length){
      try{const lower=staticDelayedLiftFloor(level,api,row.budget.lower); row.lower={status:lower.status,thresholdProven:lower.thresholdProven??false,exploredStates:lower.exploredStates??null,termination:lower.termination??null,reason:lower.reason??null};}catch(e){row.lower={status:'unsupported',thresholdProven:false,reason:e.message.slice(0,180)};row.failureReasons.push(`lower-exception:${e.message.slice(0,160)}`);}
      try{const upper=searchSpatial(level,api,{...row.budget.upper,normalize:true,orderSeed:attempt}); row.upper={status:upper.status,cost:upper.cost??null,maxClearsSeen:upper.maxClearsSeen??null,exploredStates:upper.exploredStates??null,termination:upper.termination??null}; if(upper.drags){const replay=core.replayRevisedRoute(level,upper.drags);row.replay={valid:replay.valid,complete:replay.complete,nonClearingDrags:replay.nonClearingDrags};} }catch(e){row.upper={status:'exception'};row.failureReasons.push(`upper-exception:${e.message.slice(0,160)}`);}
      const lowerOk=row.lower?.thresholdProven===true; const upperOk=row.replay?.valid===true&&row.replay?.complete===true&&row.replay.nonClearingDrags>=21&&row.replay.nonClearingDrags<=30;
      if(!lowerOk)row.failureReasons.push('fresh-lower-L21-not-proven'); if(!upperOk)row.failureReasons.push('upper-U21-30-not-proven');
      if(lowerOk&&upperOk){row.status='PASS_CANDIDATE';accepted={level,mutation,row};}
    } else {row.failureReasons.push('solver-route-not-run-until-mechanism-adapter-available');}
    attempts.push(row); if(accepted)break;
  }
  const result={id,status:accepted?'PASS_CANDIDATE':'BLOCKED',attempts,accepted:accepted?{level:accepted.level,mutation:accepted.mutation,evidence:accepted.row}:null};
  fs.writeFileSync(`${OUT}/super-${id}.json`,JSON.stringify(result,null,2)+'\n');
  rows.push({id,status:result.status,attempts:attempts.length,uniqueFingerprints:new Set(attempts.map(x=>x.fingerprint)).size,accepted:!!accepted,reasons:[...new Set(attempts.flatMap(x=>x.failureReasons))],file:`${OUT}/super-${id}.json`});
  console.log(JSON.stringify(rows.at(-1)));
}
fs.writeFileSync(`${OUT}/super-summary.json`,JSON.stringify({status:rows.every(x=>x.accepted)?'PASS':'INCOMPLETE',range:IDS,attemptBudget:4,rows},null,2)+'\n');
