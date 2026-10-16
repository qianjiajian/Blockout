import path from 'node:path';import {OUT,read,write,sha,saveSummary} from './baseline-common.mjs';
const rt=await import(path.resolve(`${OUT}/baseline-runtime.mjs`).replaceAll('\\','/').replace(/^([A-Z]):/i,'file:///$1:'));
const manifest=read(`${OUT}/manifest.json`);const rows=manifest.rows;
const routeBudget={maxStates:3000,maxDragStates:512,maxTransitions:80000,maxMilliseconds:350};
const lowerBudget={maxStates:4000,maxDragStates:512,maxTransitions:120000,maxMilliseconds:500};
let i=0;
for(const row of rows){const packet=read(row.levelFile);const floor=row.difficulty===1?16:row.difficulty===2?21:31;const upper=row.difficulty===1?20:row.difficulty===2?30:null;
 if(row.routeStatus!=='FRESH_COMPLETE'){
  const result=rt.searchRevisedLevel(packet.level,routeBudget);row.routeSearchArtifact=`${OUT}/search/${row.formalId}.json`;
  write(row.routeSearchArtifact,{formalId:row.formalId,levelSha256:row.levelSha256,budget:routeBudget,result});
  if(result.witnessFound){const replay=rt.replayRevisedRoute(packet.level,result.drags);if(!replay.valid||!replay.complete)throw Error('fresh replay rejected');row.status=replay.nonClearingDrags<floor?'COUNTEREXAMPLE':'ROUTE_VERIFIED_PENDING_LOWER_BOUND';row.routeStatus='FRESH_COMPLETE';row.routeUpperBound=replay.nonClearingDrags;row.effectiveDrags=replay.effectiveDrags;row.routeWithinUpperBand=upper===null||replay.nonClearingDrags<=upper;row.lowerBoundStatus=replay.nonClearingDrags<floor?'DISPROVEN_BY_COMPLETE_ROUTE':'PENDING';row.routeArtifact=`${OUT}/routes/${row.formalId}.json`;write(row.routeArtifact,{formalId:row.formalId,levelSha256:row.levelSha256,drags:result.drags,routeSha256:sha(result.drags),replay:{...replay,finalStateKey:undefined},freshModel:true,boosterUse:[],timeValidated:false,pointerValidated:false,minimumNotProven:true,searchArtifact:row.routeSearchArtifact});
  }else row.routeStatus=result.status==='unsupported'?'UNSUPPORTED_BY_CURRENT_SPATIAL_SOLVER':'PENDING_FINITE_SEARCH_INCONCLUSIVE';
 }
 if(row.routeStatus==='FRESH_COMPLETE'&&row.routeUpperBound>=floor&&row.routeWithinUpperBand){
  const lower=rt.checkRevisedRepositionFloor(packet.level,{floor,...lowerBudget});row.lowerArtifact=`${OUT}/lower/${row.formalId}.json`;write(row.lowerArtifact,{formalId:row.formalId,levelSha256:row.levelSha256,ruleVersion:'1.152.0',floor,budget:lowerBudget,lower});row.lowerBoundStatus=lower.status;
  if(lower.thresholdProven){row.status='SPATIAL_BAND_VERIFIED_PENDING_ADDITIONAL_GATES';row.freshLowerBound=floor;}
 }else if(row.routeStatus==='FRESH_COMPLETE'&&row.routeUpperBound>=floor&&!row.routeWithinUpperBand)row.lowerBoundStatus='PENDING_ROUTE_UPPER_ABOVE_BAND';
 for(const k of ['status','routeStatus','routeUpperBound','effectiveDrags','routeWithinUpperBand','lowerBoundStatus','routeArtifact','routeSearchArtifact','lowerArtifact','freshLowerBound'])packet[k]=row[k];write(row.levelFile,packet);
 if(++i%30===0){console.log(i,saveSummary(rows));}
}
console.log('final',saveSummary(rows));write(`${OUT}/finite-budget.json`,{routeBudget,lowerBudget,neverRaisedSameSampleBudget:true,solvingMode:'Exact current level, unchanged current PuzzleModel; unsupported remains unsupported'});
