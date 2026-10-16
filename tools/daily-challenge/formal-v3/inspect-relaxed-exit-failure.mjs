import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {compileSpatial} from '../../continuation211-colored-witness.mjs';
import {independentReplay,levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// Read-only replay of an already recorded failed witness. No alternative
// action/route search, candidate mutation or new proof/ledger claim occurs.
const [input,output]=process.argv.slice(2);assert(input&&output&&!fs.existsSync(output));
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync(input),p=JSON.parse(bytes);
const bind=file=>({path:file,sha256:hash(fs.readFileSync(file))});
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,p.proofToolchainSha256);assert.equal(p.accepted,false);
assert.equal(levelSha256(p.level),p.levelSha256);assert.deepEqual(p.drags,p.proof.drags);
const canonical=runtime.replayRevisedRoute(p.level,p.drags),independent=independentReplay(runtime,p.level,p.drags);
assert.equal(canonical.valid,false);assert.equal(independent.valid,false);assert.equal(canonical.effectiveDrags,independent.effectiveDrags);
const index=canonical.effectiveDrags,model=new runtime.PuzzleModel(p.level);model.startCountdown();
const compiled=compileSpatial(p.level,runtime),literal=new Map(p.level.blocks.map(b=>[b.id,{...b}]));
for(let i=0;i<index;i++){
 const drag=p.drags[i];model.beginAction();
 for(const point of drag.path){assert(model.moveBlockStep(drag.blockId,...point));Object.assign(literal.get(drag.blockId),{x:point[0],y:point[1]});}
 if(drag.exitSide){assert(model.tryExit(drag.blockId,drag.exitSide).ok);literal.delete(drag.blockId);}
 assert(model.commitAction());
 for(const b of model.snapshot().blocks){const expected=literal.get(b.id);assert(expected&&b.x===expected.x&&b.y===expected.y);}
 assert.equal(model.snapshot().blocks.length,literal.size);
}
const before=model.snapshot(),drag=p.drags[index],unitSteps=[];model.beginAction();
for(const point of drag.path){assert(model.moveBlockStep(drag.blockId,...point));const b=model.getBlock(drag.blockId);unitSteps.push({anchor:point,possibleExitSides:model.possibleExitSides(b)});}
const b=model.getBlock(drag.blockId),cells=b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]),afterPath=model.snapshot();
const match=runtime.resolveMatchingGatePortal(p.level,cells,drag.exitSide,afterPath.gates,afterPath.flipDoors);
assert(match);assert.equal(model.exitAttemptStatus(b.id,drag.exitSide),'blocked-path');assert.deepEqual(model.possibleExitSides(b),[]);
const compiledBody=compiled.blocks.find(x=>x.id===b.id),compiledPose=compiledBody.poses[b.y*p.level.width+b.x];
assert(compiledPose.exits[0].some(x=>x.side===drag.exitSide));
const matchingStaticPoses=compiledBody.poses.flatMap((pose,pos)=>pose?.exits[0].length?[{anchor:[pos%p.level.width,Math.floor(pos/p.level.width)],exits:pose.exits[0]}]:[]);
assert.equal(matchingStaticPoses.length,1);assert.deepEqual(matchingStaticPoses[0].anchor,[b.x,b.y]);
const horizontal=['left','right'].includes(drag.exitSide),negative=['left','top'].includes(drag.exitSide),normalAxis=horizontal?0:1,tangentAxis=1-normalAxis;
const boundary=match.portal.origin[normalAxis]+(negative?0:1),normals=cells.map(c=>c[normalAxis]),distance=negative?Math.max(...normals)+1-boundary:boundary-Math.min(...normals);
const collisions=[];
for(const other of afterPath.blocks)if(other.id!==b.id)for(const [dx,dy]of other.shape){
 const obstacle=[other.x+dx,other.y+dy];
 for(const cell of cells){if(cell[tangentAxis]!==obstacle[tangentAxis])continue;
  const enter=negative?cell[normalAxis]-obstacle[normalAxis]-1:obstacle[normalAxis]-cell[normalAxis]-1;
  const leave=negative?cell[normalAxis]+1-obstacle[normalAxis]:obstacle[normalAxis]+1-cell[normalAxis];
  if(Math.max(0,enter)<Math.min(distance,leave)-1e-6)collisions.push({movingCell:cell,obstacleCell:obstacle,obstacleBlockId:other.id,obstacleColor:other.color,overlapTranslationInterval:[Math.max(0,enter),Math.min(distance,leave)]});
 }
}
assert(collisions.length>0);
const blocked=`deliverables/daily-formal-v3-20261008/proof/attempts/identities/${p.attempt.retryIdentitySha256}.blocked.json`;assert(fs.existsSync(blocked));
const out={status:'READ_ONLY_RELAXED_EXIT_FAILURE_EXPLAINED',input:{path:input,sha256:hash(bytes)},levelSha256:p.levelSha256,routeSha256:routeSha256(p.drags),
 tool:bind('tools/daily-challenge/formal-v3/inspect-relaxed-exit-failure.mjs'),proofToolchainSha256:runtime.toolchainSha256,blocked:bind(blocked),
 historicalLower:{status:p.proof.status,floor:p.proof.floor,certifiedFloor:p.proof.certifiedFloor,cost:p.proof.cost,raw:p.proof.rawFullBoardStates,expanded:p.proof.rawExploredStates,
  evidenceSha256:levelSha256(p.proof),freshlyRecomputed:false,actualCompleteUpperBound:null},
 canonical,independent,firstFailure:{indexZeroBased:index,dragOrdinal:index+1,drag,beforeSnapshot:before,afterPathSnapshot:afterPath,unitSteps,
  block:b,cells,frontierFacesBoundary:runtime.exitFrontierFacesBoundary(p.level,cells,drag.exitSide),matchedPortal:match,actualExitStatus:'blocked-path',actualPossibleExitSides:[],
  compiledGeometryExits:compiledPose.exits[0],matchingStaticPoses,departureDistance:distance,collisions,completedKnownPrefixMatchesLiteralGraph:true},
 conclusion:{type:'RELAXED_GHOST_EXIT_NOT_AN_ACTUAL_UPPER_BOUND',
  lowerEffect:'Static compiler omits the occupied swept-departure check and allows optional exits. Every actual legal exit still satisfies the same frontier/full-width/color checks, so this omission adds edges instead of deleting them. Plain clear closure remains monotone because removing an entity only frees cells and there are no counters or other mechanisms. This failure does not supply evidence invalidating the recorded lower bound; no new lower proof was run.',
  fixedOtherBodiesSingleHeldRepairPossible:false,
  reason:'There is exactly one static matching exit pose for this body. The fixed obstacle intersects its departure sweep at that pose, independently of the path used to arrive. Another entity must first move or clear; no alternate path was attempted.',
  futureNewInputOnly:'Before the first claim, choose routeStrategy native on a new plain input so its one bounded original-model upper search uses possibleExitSides/exitAttemptStatus, including the occupied departure sweep; then the separately bounded qualified lower task can use the relaxation. Keep original 10000 raw-state limits and block failures without switching strategy. Alternatively a new predeclared route constructor must include actual sweep checks and charge all complete-world alternatives against one upper budget.',
  candidateAccepted:false,formalReady:false},
 codeBindings:[bind('tools/continuation211-colored-witness.mjs'),bind('tools/daily-challenge/formal-v3/bounded-proof.mjs'),bind('src/core/PuzzleModel.ts'),bind('src/core/revisedLevelSearch.ts'),bind('src/core/blockExitFrontier.ts')],
 workAccounting:{newUpperSearches:0,newLowerSearches:0,newHeldReachabilitySearches:0,newLedgerWrites:0,alternativeRoutesAttempted:0,knownOriginalRoutesReplayed:2,
  diagnosticReplay:'original committed prefix and original failing drag only',staticAnchorPosesCompiled:p.level.width*p.level.height}};
assert.equal(hash(fs.readFileSync(input)),hash(bytes));
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,index,ordinal:index+1,body:b.id,anchor:[b.x,b.y],collisions,staticExitPoseCount:matchingStaticPoses.length,inputUnchanged:true,newSearches:0}));
