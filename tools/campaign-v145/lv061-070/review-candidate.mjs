import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,auditStructure,TARGETS,OUTPUT,BASELINE,writeNew,proveFloor} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
import {checkSymmetryFloor as checkAxisFloor} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/axis-symmetry-floor.mjs';
import {proveOpeningFloor,verifyRouteProjection} from './opening-projection.mjs';
import {checkLiftFloor} from './lift-floor.mjs';
import {checkCanonicalLiftFloor} from './canonical-lift-floor.mjs';
import {checkAutomaticGeneratorFloor} from './automatic-generator-floor.mjs';
import {checkFastFloor67} from './fast-floor67.mjs';
import {archiveReviewInputs} from './review-input-archive.mjs';
import {verifyGeneratorRouteProjection} from './remake61to70-generator-floor-v146.mjs';
import {verifyFullGeneratorRouteProjection} from './remake61to70-full-generator-floor-v146.mjs';

// Independent fresh mechanical review. Source matching and GUI evidence are
// explicitly separate: this command cannot approve either by reading a flag.
const lock=ruleGate(),files=process.argv.slice(2),discovery=await loadApi();
const archive=archiveReviewInputs(`${OUTPUT}/checks/review-inputs-${Date.now()}`,[...discovery.inputs,...files,BASELINE,'docs/rules/manifest.json',`docs/mechanism-rules-v${lock.activeVersion}.md`,'tools/campaign-v145/lv061-070/review-candidate.mjs']);
const {api,inputs}=await loadApi();assert.deepEqual([...inputs].sort(),[...discovery.inputs].sort());archive.assertUnchanged();
const baseline=JSON.parse(fs.readFileSync(BASELINE));
for(const file of files){
 const data=JSON.parse(fs.readFileSync(file)),{level,drags}=data,target=TARGETS[level.id];
 const audit=auditStructure(data,api),route=api.replayRevisedRoute(level,drags);
 assert(route.valid&&route.complete,JSON.stringify(route));
 assert(route.nonClearingDrags>=target.min&&route.nonClearingDrags<=target.max);
 const measurement=measureRoute(level,drags,api);assert(measurement.multiCellDrags>measurement.singleCellDrags);
 const budget={floor:target.min,maxStates:2000000,maxMilliseconds:240000};
 let proof,projection=null;
 if(level.id===62){proof=checkAutomaticGeneratorFloor(level,api,budget);projection=verifyFullGeneratorRouteProjection(level,drags,api);assert(projection.valid,projection.error);}
 else if(level.id===67){proof=checkFastFloor67(level,api,budget);}
 else if(level.blocks.some(b=>b.movementAxis)&&!level.generators?.length){proof=checkAxisFloor(level,budget);}
 else if(level.shutters?.some(s=>s.skin==='lift')){if([68,69].includes(level.id)){proof=checkCanonicalLiftFloor(level,api,budget);}else{proof=proveOpeningFloor(level,api,budget);projection=verifyRouteProjection(level,drags,api);if(!proof.thresholdProven){const openingAttempt=proof;proof={...checkLiftFloor(level,api,budget),openingAttempt};}}}
 else {proof=await proveFloor(level,api,budget);if(level.generators?.length){projection=proof.abstraction.startsWith('opening-visible')?verifyGeneratorRouteProjection(level,drags,api):verifyFullGeneratorRouteProjection(level,drags,api);assert(projection.valid,projection.error);}}
 assert(proof.thresholdProven,JSON.stringify(proof));
 const decisions=[];
 for(const c of data.decisionCases??[]){
  const n=c.beforeDrag??c.atStep,wrong=c.legalWrongParking,recovery=c.recoveryDrag,next=c.blockedNextAction;
  assert(Number.isInteger(n)&&n>=1&&n<=drags.length);assert(wrong&&recovery&&next);
  const prefix=drags.slice(0,n-1),before=api.replayRevisedRoute(level,prefix),wrongOnly=api.replayRevisedRoute(level,[...prefix,wrong]);
  assert(before.valid&&wrongOnly.valid);assert.equal(wrongOnly.nonClearingDrags,before.nonClearingDrags+1);
  const failed=api.replayRevisedRoute(level,[...prefix,wrong,next]);assert(!failed.valid&&failed.error?.startsWith('Rejected move'));
  const restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]);assert(restored.valid);assert.equal(restored.finalStateKey,before.finalStateKey);
  const full=[...prefix,wrong,recovery,...drags.slice(n-1)],checked=api.replayRevisedRoute(level,full);assert(checked.valid&&checked.complete);
  assert.deepEqual(c.fullRecoveredRoute,full);
  decisions.push({beforeDrag:n,blockId:wrong.blockId,blockedReason:failed.error,recoveredTotalDrags:checked.effectiveDrags,recoveredRepositions:checked.nonClearingDrags});
 }
 assert(decisions.length>0,'Need concrete recoverable multi-cell decision cases');
 const old=baseline.levels[level.id-1],clearEvents=level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
 archive.assertUnchanged();const bindings=archive.bindings,inputArchive=archive.serializable();
 const output=`${OUTPUT}/checks/root-review-${level.id}-${Date.now()}.json`;
 writeNew(output,{status:'PASS',scope:'mechanical-route-floor-recoverable-decisions',ruleVersion:lock.activeVersion,designContract:'1.45.0',candidate:file,candidateFileSha256:digest(fs.readFileSync(file)),levelSha256:digest(level),routeSha256:digest(drags),target,audit,route,measurement,proof,projection,decisions,lowerBound:target.min,upperBound:route.nonClearingDrags,totalDrags:route.effectiveDrags,starAssessment:{preserved:old.starTargets,clearEvents,minimumTotalDrags:clearEvents+target.min,moveTargetImpossible:clearEvents+target.min>old.starTargets.moveTarget},bindings,inputArchive,sourceValidated:false,mechanismCausalityValidated:false,pointerValidated:false,formalAdopted:false,humanBlindTested:false,mobileTested:false,releaseApproved:false});
 console.log(JSON.stringify({id:level.id,status:'PASS',L:target.min,U:route.nonClearingDrags,totalDrags:route.effectiveDrags,output}));
}
