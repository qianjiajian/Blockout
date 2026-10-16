import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi} from '../continuation211-optional-lift-domain.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {ghostPayload,runGhost} from './native-ghost212-v2.mjs';
import {sha256,modelBinding} from '../continuation211-runtime.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {adjacency,OUT} from './design212.mjs';
const dir=`${OUT}/source212-grid`,input=`${dir}/q3redVb55prefix212-6.json`,output=`${dir}/scored-q3redVb55prefix212-6.json`,proofFile=`${dir}/native-q3redVb55prefix212-6.json`,factsFile=`${dir}/source212-q3redV-facts-v4.json`;
if([output,proofFile,factsFile].some(f=>fs.existsSync(f)))throw Error('Finite evidence is append-only; do not rerun.');
const parent=JSON.parse(fs.readFileSync(input)),level=structuredClone(parent.level),facts=JSON.parse(fs.readFileSync(`${dir}/source212-facts-v2.json`));
facts.authoredDifferences=[
 'Preserve source7x9 irregular category; original55-cell contour uses7x2top,5x4middle,7x3bottom; source56-cell internal-hole outline differs. Full55 opening coverage and every hidden layer fully filled.',
 'v1.11 preserves two blue colored-floor cells and removes both source shell properties; underlying ordinary inventory is retilled under finite-regeneration authorization.',
 'Both actual full curtains retained: top7x2 count10, small2x2 count1. Small curtain moves fromsource1,4 to0,7 and now holds4S: blue1,7 and0,8, yellow0,7 and1,8. Source had goldS plus3empty; 2bluefloors relocated to these two blue cells.',
 'Retain one numeric redH2 ice11 (source4,4 moved2,7), one top-hidden blueH2 bomb40 (sourceposition2,0 retained), greenicegate19, redicegate16, yellowicegate11 andone ordinarybluegate.',
 'Ordinary blue gate source rightoffset6/span2 adapted torightoffset6/span3 solely because the newnativeblueQ3 has3cell exit cross-section. Allthree icegate positions,widths,colors,counts preserved.',
 'Six bottom-right ordinary bodies retiled asone blueQ3; rightcoldS mergedgreenV3; bottomcenter ordinarypieces mergednativegreenT4; ordinaryblueH2 splitblueS+greenS; ordinaryyellowV2 recoloredred becausebluefloor geometry blocks everyyellowV2 exit approach. Neighbors recoloredgreen/yellow/red toavoid samecolor adjacency. Full actualspec records final colors/footprints.',
 'Top source non-nativeblueL3 retilledblueH2+greenS; sourceyellowL3 becomesnativeredL3; sourcegreenH2 becomesyellowH2; otherknown top H2 bodies andbluebomb preserved. All pieces useexisting q0 assets.',
 'Final32 bodies =21 visible+7top-hidden+4small-hidden. Source32 =25visible+6top-hidden+1small-hidden; equal total is coincidence and does not imply exact inventory. AuthoredM11 aretopredL3 andlowergreenT4.'
];facts.supersedesDesignOnly=`${dir}/source212-facts-v2.json`;
fs.writeFileSync(factsFile,JSON.stringify(facts,null,2));
level.preservedMoveTarget=46;level.mechanismAdaptation.sourceFactsFile=factsFile;
const api0=await loadSpatialApi(),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{levelStarTargets,evaluateLevelStars}from'./src/core/levelStarConditions.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra};
const drags=parent.search.drags,strict=replay(level,drags,api,{timed:true,complete:true,requirePointerCompatible:true});
const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
const packet={status:'STRICT_COMPLETE_L11_PENDING',level,levelSha256:sha256(level),drags,routeSha256:sha256(drags),strictTimedModelReplay:strict,audit,starTargets:extra.levelStarTargets(level),modelStarEvaluation:extra.evaluateLevelStars(level,{moves:strict.effectiveDrags,elapsedSeconds:strict.simulatedSeconds}),sourceFactsFile:factsFile,sourceFactsSha256:sha256(facts),parentFile:input,pointerValidated:false,naturalClockValidated:false,formalStarSettlementValidated:false,formalAdopted:false};
fs.writeFileSync(output,JSON.stringify(packet,null,2));
console.log(JSON.stringify({output,sha256:packet.levelSha256,U:strict.nonClearingDrags,drags:strict.effectiveDrags}));
const projection=structuredClone(level),removed=[];for(const b of projection.blocks)if(b.timedBombSeconds!==undefined){removed.push({id:b.id,timedBombSeconds:b.timedBombSeconds});delete b.timedBombSeconds;}
const {p}=liftPayload(projection,api,{floor:11,maxMilliseconds:6000,maxStates:500000}),native=runNativeLift(p),report={sourceLevelSha256:packet.levelSha256,projectedLevelSha256:sha256(projection),modelBinding:modelBinding(),qualification:'deliverables/continue211-220-20260930/native-lift-qualification.json',relaxation:{removed,retained:'All bodies, colored grid cells, curtains, counts, ice, geometry, exits. Only bomb deadline removed; every successful real solution projects to equal drag cost.'},budget:{floor:11,maxMilliseconds:6000,maxStates:500000},native,certified:native.status==='threshold-proven',formalAdopted:false};
fs.writeFileSync(proofFile,JSON.stringify(report,null,2));console.log(JSON.stringify({proofFile,...native}));
const ghost=runGhost(ghostPayload(projection,api,{floor:11,maxMilliseconds:4000,maxStates:150000}).p);const ghostFile=proofFile.replace('native-','ghost-v2-');fs.writeFileSync(ghostFile,JSON.stringify({sourceLevelSha256:packet.levelSha256,projectionSha256:sha256(projection),qualification:'deliverables/continue211-220-20260930/design212-new/ghost212-v2/qualification.json',result:ghost,formalAdopted:false},null,2));console.log(JSON.stringify({ghostFile,...ghost}));
