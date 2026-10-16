import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi} from '../remake201to210-v123-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {replay} from '../remake191-200/replay.mjs';
import {OUT,adjacency} from './design212.mjs';
const DIR=`${OUT}/source212-grid`, factsFile=`${DIR}/source212-facts-v2.json`;
const S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],Q2=[[0,0],[1,0],[0,1],[1,1]];
const B=(id,color,x,y,shape=S,extra={})=>({id,color,x,y,shape,...extra});
const facts={levelId:212,sourceVideo:'C:/Users/Administrator/Desktop/block out/参考视频/211-220.mp4',status:'SOURCE_OBSERVED_WITH_EXPLICIT_AUTHORED_ADAPTATIONS',coordinateSystem:'zero-based top-left; gold is mapped to authored yellow',
 frameReferences:[92,98,134,136,178].map(t=>{const file=`.codex-temp/video211220/frame-${String(t/2).padStart(4,'0')}-${t.toFixed(2).padStart(7,'0')}s.png`;return{file,sha256:digest(fs.readFileSync(file))};}),
 board:{width:7,height:9,category:'irregular',blocked:[[0,3],[6,3],[0,4],[3,4],[6,4],[0,5],[6,5]],playableCells:56},
 sourceTimeSeconds:95,
 openingBlocks:[B('a','blue',0,2,H2),B('b','yellow',2,2),B('c','blue',3,2),B('d','red',4,2),B('e','green',5,2,[[0,0],[1,0],[0,1]]),B('f','yellow',1,3),B('g','blue',2,3),B('h','green',3,3),B('i','blue',4,3),B('ice11','red',4,4,H2,{frozen:11}),B('j','blue',3,5),B('k','yellow',4,5),B('l','blue',5,5),...['blue','yellow','blue','yellow','blue','red','blue'].map((c,x)=>B(`row6-${x}`,c,x,6)),B('shell-red-blue','blue',0,7,Q2,{layers:['red','blue']}),B('n','yellow',2,7,V2),B('shell-green-red','red',3,7,Q2,{layers:['green','red']}),B('o','yellow',5,7,H2),B('p','red',5,8,H2)],
 shutters:[{id:'top10',x:0,y:0,width:7,height:2,count:10,hiddenObserved:[B('a','yellow',0,0,H2),B('bomb40','blue',2,0,H2,{timedBombSeconds:40}),B('c','yellow',4,0,[[0,0],[0,1],[1,1]]),B('d','blue',5,0,[[0,0],[1,0],[1,1]]),B('e','red',0,1,H2),B('f','green',2,1,H2)]},{id:'small1',x:1,y:4,width:2,height:2,count:1,hiddenObserved:[B('small-yellow','yellow',2,5)],observedEmptyCells:[[1,4],[2,4],[1,5]],note:'98s reveal shows one gold S and three empty cells; authored full coverage is required independently.'}],
 coloredGrids:[{color:'blue',cells:[[1,4],[2,4]]}],
 gates:[{color:'green',side:'top',offset:2,size:3,frozen:19},{color:'red',side:'left',offset:0,size:2,frozen:16},{color:'yellow',side:'left',offset:6,size:2,frozen:11},{color:'blue',side:'right',offset:6,size:2}],
 unknown:[],
 authoredDifferences:[
 'v1.11 item5: keep both blue colored cells and remove both shell attributes. The ordinary inventory is subsequently retilled under the authorized finite regeneration; no new shell or other mechanism is added.',
 'Keep the 7x9 irregular category; fill the source internal hole and both row3 outer cells. Authored 59-cell symmetric contour differs from the 56-cell source and has no interior wall.',
 'Keep top 7x2 curtain count10, small 2x2 curtain count1, numeric red H2 ice11, blue H2 bomb40, ice gate colors/counts19/16/11 and one ordinary blue gate.',
 'Move the small curtain and its two blue floor cells to x2,y7; make its true hidden layer full using blue H2 on the top row and yellow H2 on the bottom row. The source small S becomes yellow H2; three source empty cells receive real block cells.',
 'Move numeric red H2 to x0,y7 and ordinary blue gate offset6 to offset7; no gate width/count change.',
 'Retile ordinary pieces with native q0 assets and recolor as needed for adjacency and route difficulty. Top source blue non-native L3 becomes blue H2 plus green S; top source native yellow L3 is red. Native irregular kind is retained. Other source top H2 pieces and bomb remain.',
 'Final original design has 41 bodies, 32 visible and 9 hidden; source has 25 visible, six top hidden and one small hidden. This is authored fill/shape adaptation, not an exact source copy.'
 ]};
if(fs.existsSync(factsFile))throw Error('Do not overwrite source evidence');
fs.writeFileSync(factsFile,JSON.stringify(facts,null,2));
const api0=await loadSpatialApi(),bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{matchingContinuousExitPortals,choosePortalReleaseCandidate}from'./src/game/continuousDrag.ts';export{levelStarTargets,evaluateLevelStars}from'./src/core/levelStarConditions.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),extra=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),api={...api0,...extra};
for(const index of [0,3,4,6,7]){
 const parentFile=`${DIR}/mutation212b-${index}.json`,prior=JSON.parse(fs.readFileSync(parentFile)),level=structuredClone(prior.level),file=`${DIR}/scored-candidate212-${index}.json`;
 if(fs.existsSync(file))throw Error('Do not overwrite candidate evidence');
 level.preservedMoveTarget=prior.replay.effectiveDrags;
 level.mechanismAdaptation.sourceFactsFile=factsFile;
 level.mechanismAdaptation.ruleConflict='v1.11 item5 preserves the two blue colored grid cells and removes both shell properties. Ordinary bodies were then retilled under the finite regeneration authorization; source and final inventory are recorded separately.';
 const drags=prior.search.drags,strict=replay(level,drags,api,{timed:true,complete:true,requirePointerCompatible:true});
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),allInventoryAdjacency:adjacency(level.blocks),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:api.auditRevisedMechanismContract(level)};
 const packet={status:'SOURCE_REGENERATED_COMPLETE_ROUTE_LOWER11_PENDING',level,levelSha256:digest(level),drags,routeSha256:digest(drags),strictTimedModelReplay:strict,starTargets:extra.levelStarTargets(level),modelStarEvaluation:extra.evaluateLevelStars(level,{moves:strict.effectiveDrags,elapsedSeconds:strict.simulatedSeconds}),sourceFactsFile:factsFile,sourceFactsSha256:digest(facts),audit,parentFile,lowerBound:{status:'UNKNOWN',certified:false,priorUnprovedSearchFile:parentFile,reason:'Final source/score fields change the object SHA. Fresh floor11 proof must bind this exact new object. Prior finite grid/time-relaxation diagnostics were UNKNOWN.'},pointerValidated:false,naturalClockValidated:false,formalStarSettlementValidated:false,formalAdopted:false};
 fs.writeFileSync(file,JSON.stringify(packet,null,2));
 console.log(JSON.stringify({index,file,levelSha256:packet.levelSha256,U:strict.nonClearingDrags,drags:strict.effectiveDrags,clears:strict.clearEvents,simulatedSeconds:strict.simulatedSeconds,starTargets:packet.starTargets,modelStars:packet.modelStarEvaluation.earnedStars}));
}
