import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {OUT} from './design212.mjs';
const spatial=await loadSpatialApi(),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{levelStarTargets,evaluateLevelStars}from'./src/core/levelStarConditions.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...spatial,...extra};
const rows=[];
for(const index of[2,7]){
 const input=`${OUT}/source213/mutation213-${index}.json`,prior=JSON.parse(fs.readFileSync(input)),level=structuredClone(prior.level);
 level.preservedMoveTarget=prior.replay.effectiveDrags;
 const strict=replay(level,prior.search.drags,api,{timed:true,complete:true,requirePointerCompatible:true});
 const targets=extra.levelStarTargets(level),stars=extra.evaluateLevelStars(level,{moves:strict.effectiveDrags,elapsedSeconds:strict.simulatedSeconds});
 const packet={status:'SCORED_SOURCE_CANDIDATE_U_IN_BAND_LOWER_BOUND_UNKNOWN',level,levelSha256:digest(level),drags:prior.search.drags,routeSha256:digest(prior.search.drags),strictTimedModelReplay:strict,starTargets:targets,modelStarEvaluation:stars,lowerBound:{status:'UNKNOWN',certified:false,priorUnprovedSearchFile:input,priorUnprovedSearchLevelSha256:prior.levelSha256,note:'Score change does not alter geometry; no old unknown search is promoted to a certificate. Fresh proof must bind the new exact object.'},sourceReview:{framePaths:['.codex-temp/video211220/frame-0108-0216.00s.png','.codex-temp/video211220/frame-0112-0224.00s.png','.codex-temp/video211220/frame-0113-0226.00s.png','.codex-temp/video211220/frame-0114-0228.00s.png','.codex-temp/video211220/frame-0134-0268.00s.png'],factsAndAdaptations:level.mechanismAdaptation,unresolved:['The meaning of the central orange outline is UNKNOWN; no colored-grid mechanism is asserted.','Exact later source gameplay movement is not claimed as an authored solution.'],knownMechanisms:{upperShutter:3,liftRegion:[5,9,2,3],hiddenNumericIce:Array(7).fill(5),openingNumericIce:1,postMeltShell:['blue','orange'],liftShell:['yellow','blue'],frozenGates:[10,9,9,2,1,2],fullSourceDesignParity:false}},audit:prior.audit,pointerValidated:false,naturalClockValidated:false,formalStarSettlementValidated:false,formalAdopted:false};
 const file=`${OUT}/source213/scored-candidate213-${index}.json`;if(fs.existsSync(file))throw Error('Evidence exists; do not overwrite');fs.writeFileSync(file,JSON.stringify(packet,null,2));rows.push({file,levelSha256:packet.levelSha256,U:strict.nonClearingDrags,totalDrags:strict.effectiveDrags,starTargets:targets,simulatedSeconds:strict.simulatedSeconds,modelStars:stars.earnedStars,L:'UNKNOWN'});
}
const sourceFrames=rows.length?JSON.parse(fs.readFileSync(rows[0].file)).sourceReview.framePaths.map(path=>({path,sha256:digest(fs.readFileSync(path))})):[];
fs.writeFileSync(`${OUT}/source213/scored-status213.json`,JSON.stringify({status:'TWO_SOURCE_BASED_COMPLETE_CANDIDATES_U_IN_NORMAL_BAND_LOWER_BOUND_PENDING',sourceFrames,rows,formalAdopted:false,naturalClockValidated:false},null,2));console.log(JSON.stringify(rows,null,2));
