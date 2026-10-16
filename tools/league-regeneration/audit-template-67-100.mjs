/* Finite same-object audit for mainline-template league candidates 67-100. */
import fs from 'node:fs';
import {build} from 'esbuild';
const input='deliverables/league-regeneration-20261005/template/mainline-template-candidates.json';
const output='deliverables/league-regeneration-20261005/template/formal-67-100.json';
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const candidates=data.entries.filter(e=>e.index>=67&&e.index<=100);
if(candidates.length!==34)throw new Error(`expected 34 candidates, got ${candidates.length}`);
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {searchRevisedLevel} from './src/core/revisedLevelSearch.ts'; export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {searchRevisedLevel,PuzzleModel,validateLevel}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const budget={maxStates:20000,maxDragStates:300,maxTransitions:100000,maxMilliseconds:1000};
const floorFor=d=>d==='super'?21:16;
function replayScore(level,specials,drags){
  const model=new PuzzleModel(level); model.startCountdown(); const hits=[]; let clearEvents=0;
  for(let i=0;i<drags.length;i++){
    const drag=drags[i], before=model.snapshot(); model.beginAction(); let ok=true;
    for(const [x,y] of drag.path){if(!model.moveBlockStep(drag.blockId,x,y)){ok=false;break;}}
    if(ok&&drag.exitSide)ok=model.tryExit(drag.blockId,drag.exitSide).ok;
    if(!ok||!model.commitAction())return {valid:false,complete:false,error:`replay failed at step ${i+1}`};
    const after=model.snapshot(); const clears=after.cleared-before.cleared; clearEvents+=clears;
    for(const id of specials)if(before.blocks.some(b=>b.id===id)&&!after.blocks.some(b=>b.id===id))hits.push({blockId:id,routeStep:i+1,score:10});
  }
  const final=model.snapshot();
  return {valid:true,complete:final.complete,clearEvents,scoreEvents:hits,allSpecialsCleared:hits.length===specials.length,lateSpecials:hits.every(x=>x.routeStep>drags.length/2),totalScore:hits.length*10};
}
const rows=[];
for(const entry of candidates){
  const required=floorFor(entry.difficulty); const row={index:entry.index,templateSourceId:entry.templateSource.levelId,candidateId:entry.level.id,difficulty:entry.difficulty,formalEligibility:false,requiredLowerBound:required,budget,attempts:[],status:'BLOCKED'};
  let validationError;
  try{validateLevel(entry.level);row.validation='structural-pass';}catch(error){validationError=String(error?.message??error);row.validation='structural-fail';row.status='BLOCKED';row.failureReasons=['structural:'+validationError];rows.push(row);continue;}
  const started=Date.now();
  let result;
  try{result=searchRevisedLevel(entry.level,budget);}catch(error){row.failureReasons=[`solver-exception:${String(error?.message??error).slice(0,240)}`];rows.push(row);continue;}
  const attempt={attempt:1,termination:result.termination,status:result.status,exploredStates:result.exploredStates,discoveredStates:result.discoveredStates,attemptedTransitions:result.attemptedTransitions,elapsedMilliseconds:result.replay?undefined:Date.now()-started,reasons:result.reasons};
  if(result.witnessFound){
    const replay=replayScore(entry.level,entry.specials,result.drags);
    attempt.route={drags:result.drags.length,nonClearingDrags:result.replay?.nonClearingDrags,clearEvents:result.replay?.clearEvents,replay:result.replay,score:replay};
    row.route=attempt.route; row.upperBound={value:result.replay?.nonClearingDrags??null,status:'WITNESS_ONLY',certificate:false};
    row.scoreEvidence=replay.scoreEvents;
    if(replay.valid&&replay.complete&&replay.allSpecialsCleared&&replay.lateSpecials){
      row.scoreSettlement={status:'PASS',fixedPointsPerSpecial:10,totalScore:replay.totalScore,events:replay.scoreEvents};
    }else row.scoreSettlement={status:'BLOCKED',reason:'special score block clear/order replay failed'};
    if((result.replay?.nonClearingDrags??Infinity)>=required){row.lowerBound={status:'NOT_CERTIFIED',value:required,reason:'observed route meets floor but no exhaustive lower-bound proof'};row.status='ROUTE_WITNESS_ONLY';}
    else {row.lowerBound={status:'FAIL_OBSERVED_UPPER_BELOW_FLOOR',value:result.replay?.nonClearingDrags,required};row.status='BLOCKED';row.failureReasons=[`observed upper bound ${result.replay?.nonClearingDrags} is below required difficulty floor ${required}`];}
  }else{
    row.status='BLOCKED'; row.lowerBound={status:'NOT_CERTIFIED',required}; row.upperBound={status:'NOT_FOUND'}; row.failureReasons=result.reasons?.length?result.reasons:['finite search did not find a witness'];
  }
  row.attempts.push(attempt); rows.push(row);
  console.log(JSON.stringify({index:row.index,status:row.status,termination:result.termination,drags:row.route?.drags??null,upper:row.upperBound?.value??null,score:row.scoreSettlement?.status??null}));
}
const report={schemaVersion:1,generatedAt:new Date().toISOString(),range:[67,100],source:input,finite:true,formalEligibility:false,budget,thresholds:{hard:{lowerBound:16,upperBound:20},super:{lowerBound:21,upperBound:30}},scorePolicy:{specialBlockPoints:10,onlySuccessfulClear:true,lateHalfRequired:true},counts:{total:rows.length,routeWitness:rows.filter(r=>r.route).length,lowerBoundCertified:rows.filter(r=>r.lowerBound?.status==='CERTIFIED').length,scoreSettlementPass:rows.filter(r=>r.scoreSettlement?.status==='PASS').length,statusPass:rows.filter(r=>r.status==='PASS').length,blocked:rows.filter(r=>r.status==='BLOCKED').length},rows};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,counts:report.counts},null,2));
