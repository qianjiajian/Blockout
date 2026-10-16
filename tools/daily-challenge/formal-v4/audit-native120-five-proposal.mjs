import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {boardCells,absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';

// Read existing reference routes; never generate, solve, claim or admit a level.
const own='tools/daily-challenge/formal-v4/audit-native120-five-proposal.mjs';
const input={path:'deliverables/daily-formal-v4-20261008/design/native120-five-proposal-01/proposal.json',sha256:'f0ad417e394e2abbe1f6eca289e78bf02bee525d4cdc0e8f10b3be2cd5f6e3b1'};
const output=process.argv[2];assert(output,'New output report required');
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts';
const sha=b=>createHash('sha256').update(b).digest('hex'),fileBindings={},rows=[],errors=[];
const names=async()=> (await fs.readdir(ledger)).filter(n=>n.endsWith('.request.json')).sort();
const before=await names();
const bind=async(p,h)=>{const b=await fs.readFile(p),actual=sha(b);if(h)assert.equal(actual,h,p);if(fileBindings[p])assert.equal(actual,fileBindings[p]);fileBindings[p]=actual;return b;};
const read=async d=>JSON.parse(await bind(d.path,d.sha256));
const cellsKey=ps=>ps.map(p=>p.join(',')).sort();
try{
 const q=await read(input),source=await read(q.blueprintSource),selected=await read(q.selectedIndex),rt=await loadV4Runtime();
 assert.equal(q.executable,false);assert.equal(q.recipes.length,5);assert.equal(q.maximumStocksEnteringColourCspIncludingFailed,5);
 assert.equal(q.previousMacro64ActualInputs,54);assert.equal(q.maximumAfterThisBatch,59);assert.equal(q.combinedMaximumInputs,64);
 assert.equal(q.futureUpperBudget.maxStates,10000);assert.equal(q.futureUpperBudget.maxMilliseconds,120000);
 assert.equal(q.futureLowerBudget.maxStates,9999);assert.equal(q.futureLowerBudget.maxMilliseconds,30000);assert.equal(q.originalLowerFloor,31);
 assert.equal(selected.files.length,150);assert.equal(new Set(q.recipes.map(r=>r.sourceLevelId)).size,5);
 const oldMath=await read(q.latestCompletedMath),oldReview=await read(q.latestCompletedMathReview);
 assert.equal(oldMath.accepted.length,0);assert.equal(oldReview.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(oldReview.errors,[]);
 assert.deepEqual(oldReview.completion,q.latestCompletedMath);
 const env=prefixExecutionEnvironment(rt,source.executionEnvironment.descriptor);
 for(const p of selected.files){const r=await read({path:p});assert(r.accepted&&!r.qualificationOnly);assert.equal(levelSha256(r.level),r.levelSha256);}
 for(const recipe of q.recipes){
  const b=source.blueprints.find(x=>x.recipeId===recipe.blueprintId);assert(b);assert.equal(b.sourceLevelId,recipe.sourceLevelId);assert.equal(recipe.maximumStocks,1);
  const r=await read(b.reference);assert(r.accepted);assert.deepEqual(r.level,b.level);assert.equal(levelSha256(r.level),b.referenceLevelSha256);assert.equal(routeSha256(r.drags),b.referenceRouteSha256);
  const current=await currentMainlineSourceBinding(rt,env,b.sourceLevelId,{qualificationOnly:false});
  for(const [p,h]of Object.entries(current.bindings))await bind(p,h);
  const mainline=rt.LEVELS.find(l=>l.id===b.sourceLevelId);assert.equal(boardBaselineSha256(mainline),boardBaselineSha256(r.level));
  rt.assertPlainProofDomain(r.level);rt.validateLevel(r.level);
  const playable=boardCells(r.level),occupied=r.level.blocks.flatMap(absoluteCells);
  assert.equal(new Set(cellsKey(occupied)).size,occupied.length);assert.deepEqual(cellsKey(occupied),cellsKey(playable));
  for(const body of r.level.blocks){
   const match=rt.matchFormalBlockShape(body.shape,'native-only');assert.equal(match.quarterTurns,0);
   assert.equal(body.shape.length,(Math.max(...body.shape.map(p=>p[0]))+1)*(Math.max(...body.shape.map(p=>p[1]))+1));
   const asset=rt.GAME_ART.gameplay.formalBlocks[body.color].solid[match.shapeId];assert(asset);assert((await bind(path.join('public',asset))).length>0);
  }
  const a=rt.replayRevisedRoute(r.level,r.drags),z=independentReplay(rt,r.level,r.drags);
  for(const replay of [a,z])assert(replay.valid&&replay.complete&&!replay.failed);
  assert.equal(a.nonClearingDrags,z.nonClearingDrags);assert.equal(z.remainingBodies,0);assert.equal(z.remainingQueued,0);
  const ids=new Set(b.region.bodyIds),changed=r.level.blocks.filter(body=>ids.has(body.id));assert.deepEqual(changed,b.changedBodies);
  const region=changed.flatMap(absoluteCells);assert.deepEqual(cellsKey(region),cellsKey(b.region.cells));assert.equal(region.length,b.region.area);
  assert.equal(region.length/playable.length,b.region.fraction);assert(b.region.fraction>=.35);
  const todo=new Set(cellsKey(region)),queue=[region[0]];todo.delete(region[0].join(','));
  for(const[x,y]of queue)for(const p of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(todo.delete(p.join(',')))queue.push(p);assert.equal(todo.size,0);
  assert.deepEqual(b.prefixDrags,r.drags.slice(0,b.prefixFacts.drags));assert.equal(routeSha256(b.prefixDrags),b.prefixSha256);
  assert(b.prefixDrags.every(d=>!ids.has(d.blockId)));assert.equal(r.drags.findIndex(d=>ids.has(d.blockId)),b.prefixDrags.length);
  const partial=independentReplay(rt,r.level,b.prefixDrags);assert(partial.valid&&!partial.failed);
  assert.equal(partial.nonClearingDrags,b.prefixFacts.parking);assert.equal(partial.clearEvents,b.prefixFacts.clears);
  const m=new rt.PuzzleModel(structuredClone(r.level));m.startCountdown();
  const untouched=()=>{for(const body of changed){const now=m.getBlock(body.id);assert(now);assert.deepEqual([now.x,now.y,now.shape,now.layers[0]],[body.x,body.y,body.shape,body.color]);}};
  for(const d of b.prefixDrags){m.beginAction();let exit=canonicalExit(rt,m,d.blockId);assert(!exit||d.path.length===0);
   for(const [i,p]of d.path.entries()){const body=m.getBlock(d.blockId),previous=[body.x,body.y];assert.equal(Math.abs(p[0]-body.x)+Math.abs(p[1]-body.y),1);
    assert(m.moveBlockStep(d.blockId,...p));exit=canonicalExit(rt,m,d.blockId,previous);assert(!exit||i===d.path.length-1);untouched();}
   assert.equal(exit,d.exitSide);if(exit)assert(m.tryExit(d.blockId,exit).ok);assert(m.commitAction());untouched();
  }
  rows.push({recipeId:b.recipeId,sourceLevelId:b.sourceLevelId,reference:b.reference,board:[r.level.width,r.level.height],cells:playable.length,
   changedArea:region.length,changedFraction:b.region.fraction,referenceCompleteU:z.nonClearingDrags,referenceDrags:r.drags.length,
   prefix:b.prefixFacts,untouchedAtEveryUnitPose:true,newCandidateCreated:false,newL:null,newU:null});
 }
 const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))await bind(p);for(const[p,h]of Object.entries(rt.toolchainBindings))await bind(p,h);
}catch(e){errors.push(e.stack??e.message);}
const after=await names();if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Public request set changed during readonly proposal audit');
const report={status:errors.length?'NATIVE120_FIVE_PROPOSAL_READONLY_FAIL':'NATIVE120_FIVE_PROPOSAL_READONLY_PASS',proposal:input,rows,errors,fileBindings,
 executable:false,newConstructions:0,newSearches:0,publicClaims:0,publicRequestsBefore:before.length,publicRequestsAfter:after.length,
 formalReady:false,productionChanged:false,limitations:['Only existing reference routes and untouched connected regions were checked. New complete U and original L31 still required.',
 'Source29/100 prefixes have only14/7 known parking moves; no lower-bound claim follows from a prefix.',
 'A separate fixed batch plan must bind qualified native120 tools, actual history and first-use shape/colour exclusions.']};
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,rows:rows.length,errors,report:output,sha256:sha(await fs.readFile(output))}));if(errors.length)process.exitCode=1;
