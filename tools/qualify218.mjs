import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadContinuationRuntime,sha256} from './continuation211-runtime.mjs';
import {searchSpatial,loadSpatialApi} from './remake201to210-v123-floor.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
assert(verifyRulesLock().ok);
const OUT='deliverables/continue211-220-20260930/design218-new';
const data=JSON.parse(fs.readFileSync(OUT+'/spatial-pass.json'));
const api=await loadContinuationRuntime(),spatial=await loadSpatialApi(),level=structuredClone(data.level);
level.preservedMoveTarget=35;
const levelSha256=sha256(level),replay=api.replayRevisedRoute(level,data.drags);
assert(replay.valid&&replay.complete&&replay.nonClearingDrags===10&&replay.effectiveDrags===35);
const lower=searchSpatial(level,spatial,{floor:5,prove:true,maxMilliseconds:5000,maxStates:150000,maxTransitions:2000000});
assert.equal(lower.status,'threshold-proven');assert.equal(lower.sourceLevelSha256,levelSha256);
const coverage=auditOpeningCoverage(new api.PuzzleModel(level).snapshot());assert(coverage.passed);
const mechanism=api.auditRevisedMechanismContract(level);assert.deepEqual(mechanism,[]);
const audit=api.auditRevisedCandidate(level);
const staticHardIssues=audit.issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');assert.deepEqual(staticHardIssues,[]);
const art=level.blocks.map(b=>({blockId:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(art.every(a=>a.match?.quarterTurns===0));
const source={status:'VISUALLY_REVIEWED_SOURCE_FACTS_WITH_EXPLICIT_ADAPTATION',levelId:218,
 frames:['.codex-temp/video211220/frame-0393-0786.00s.png','.codex-temp/video211220/frame-0410-0820.00s.png','.codex-temp/video211220/frame-0413-0826.00s.png'].map(path=>({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')})),
 sourceBoard:{width:7,height:10,playableCells:64,blocked:[[0,0],[1,0],[0,1],[6,8],[5,9],[6,9]],openingBodies:16,occupiedCells:47},
 mechanics:{keys:3,lockCount:3,shells:[['green','orange'],['yellow','blue'],['purple','red']],iceGates:[{color:'blue',count:3},{color:'orange',count:3},{color:'red',count:1}],ordinaryGateColors:['purple','green','yellow'],hiddenCohorts:0},
 palette:{gold:'orange',lime:'yellow'},
 differences:[{field:'playable',source:'64 cells, asymmetric stair sides',design:'66 cells, left-right symmetric bevel corners',reason:'Original symmetric irregular floor required; keep source7×10 bounds.'},{field:'blocks',source:'16 bodies/47 occupied cells;17 holes',design:'22 bodies/66 occupied cells, all q0',reason:'Full opening and native shapes; add ordinary filler, retiling and color arrangement.'},{field:'shells',source:'Two L3 shells plusV3',design:'TwoSQ2 shells plusV3',reason:'Shells require rectangular bodies; both inner/outer colors preserved.'},{field:'gates',source:'Purpletop2/blue top5/greenleft8',design:'Purpletop3/bluetop1/greenleft7',reason:'Fit original symmetric mask; other gate colors,ice counts and widths preserved.'}],unknown:[],preciseCopy:false};
const starTime=api.timeTargetForLevel(level);assert.equal(starTime,72);
assert.equal(api.evaluateLevelStars(level,{moves:35,elapsedSeconds:72}).earnedStars,3);
const result={status:'PASS_SOURCE_ADAPTED_SPATIAL_MODEL_PENDING_POINTER',level,levelSha256,drags:data.drags,dragsSha256:sha256(data.drags),lower,replay,coverage,mechanism,audit,staticHardIssues,art,source,starMoves:35,starTime,pointerValidated:false,timeValidated:false,releaseApproved:false};
fs.writeFileSync(OUT+'/qualified218.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({levelSha256,L:5,U:10,starMoves:35,starTime,lowerStates:lower.exploredStates}));
