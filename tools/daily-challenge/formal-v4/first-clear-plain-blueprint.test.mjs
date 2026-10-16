import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {makeFirstClearPlainBlueprint,PLAIN_TARGET_ENTRIES} from './first-clear-plain-blueprint.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_LEDGER,sha,write} from './low-twenty-io.mjs';
const out=process.env.FIRST_CLEAR_BLUEPRINT_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const evidence=[],names=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),before=await names();

// Deliberately synthetic certificate metadata. This suite does not certify its
// L, route physics, or asset files; the returned blueprint must say so.
function fixture(referenceBand=2,target=3){
 const level={id:7,name:'private metadata fixture',width:4,height:3,mechanismRules:'revised-2026-09-27-v1.5',
  blocks:Array.from({length:12},(_,i)=>({id:'b'+i,x:i%4,y:Math.floor(i/4),shape:[[0,0]],color:i%2?'blue':'red'})),
  gates:[{id:'red',side:'top',offset:0,size:2,color:'red'},{id:'blue',side:'bottom',offset:2,size:2,color:'blue'}]};
 const U=referenceBand===2?23:38,drags=[{blockId:'b0',path:[],exitSide:'top'},
  ...Array.from({length:U},(_,i)=>({blockId:'b1',path:[[i%2?1:0,0]]})),
  ...level.blocks.slice(1).map(b=>({blockId:b.id,path:[],exitSide:b.color==='red'?'top':'bottom'}))];
 const ref={accepted:true,sourceLevelId:7,L:referenceBand===2?21:38,U,level,levelSha256:levelSha256(level),drags};
 const recipe={recipeId:'first-clear-private',branchId:'private-only',sourceLevelId:7,referenceBand,finalTargetDifficulty:target,
  reference:{path:'synthetic-private-reference.json',sha256:'a'.repeat(64)},referenceLevelSha256:ref.levelSha256,referenceRouteSha256:routeSha256(drags),
  cut:1,regionBodyIds:level.blocks.slice(1).map(b=>b.id),seed:1001,colourSeed:1074,bodyCountDelta:-1,maximumStocks:1,maximumStaticPartitionAttempts:200};
 const runtime={LEVELS:[structuredClone(level)],GAME_ART:{gameplay:{formalBlocks:{red:{solid:{square:'synthetic-red-q0.png'}},blue:{solid:{square:'synthetic-blue-q0.png'}}}}},
  matchFormalBlockShape(shape,mode){assert.equal(mode,'native-only');return shape.length===1?{shapeId:'square',quarterTurns:0}:null;},
  replayRevisedRoute(){throw Error('Metadata builder must never replay');},validateLevel(){throw Error('Metadata builder must never enter a model');}};
 return{runtime,ref,recipe};
}

test('reference band remains truthful while final plain target is independent; no proof or source object is mutated',()=>{
 for(const[referenceBand,target]of [[2,3],[3,2]]){
  const{runtime,ref,recipe}=fixture(referenceBand,target),before=JSON.stringify({runtime,ref,recipe}),b=makeFirstClearPlainBlueprint(runtime,ref,recipe);
  assert.equal(b.referenceBand,referenceBand);assert.equal(b.referenceL,ref.L);assert.equal(b.referenceU,ref.U);assert.equal(b.finalTargetDifficulty,target);
  assert.deepEqual(b.futureMathematics,PLAIN_TARGET_ENTRIES[target]);assert.equal(b.iceCount,0);assert.equal(b.metadataOnly,true);
  for(const k of ['referenceDescriptorBytesVerified','assetBytesVerified','referenceMathematicsTransferred','newCandidateRouteNotClaimed','accepted','formalReady'])assert.equal(b[k],k==='newCandidateRouteNotClaimed');
  assert(b.referenceReplayRequiredBeforeConstruction&&b.referencePrefixReplayRequiredBeforeConstruction);assert.deepEqual(b.allReferenceGates,ref.level.gates);
  assert.equal(JSON.stringify({runtime,ref,recipe}),before);
  const wrong=structuredClone(recipe);wrong.referenceBand=referenceBand===3?2:3;assert.throws(()=>makeFirstClearPlainBlueprint(runtime,ref,wrong));
 }
 evidence.push({name:'truthful-reference-band-independent-target-and-no-certificate-transfer',passed:true});
});

test('exact first exit, descriptor hashes and fixed finite parameters cannot be substituted',()=>{
 const{runtime,ref,recipe}=fixture();
 for(const mutate of [r=>r.cut=2,r=>r.referenceBand=undefined,r=>r.referenceLevelSha256='b'.repeat(64),r=>r.referenceRouteSha256='c'.repeat(64),r=>r.sourceLevelId=8,
  r=>r.reference.sha256='unbound',r=>r.maximumStocks=2,r=>r.seed=0,r=>r.colourSeed=0,r=>r.bodyCountDelta=-20,r=>r.maximumStaticPartitionAttempts=0,r=>r.finalTargetDifficulty=1]){
  const bad=structuredClone(recipe);mutate(bad);assert.throws(()=>makeFirstClearPlainBlueprint(runtime,ref,bad));
 }
 const failed=structuredClone(ref);failed.accepted=false;assert.throws(()=>makeFirstClearPlainBlueprint(runtime,failed,recipe));
 const missingExit=structuredClone(ref);delete missingExit.drags[0].exitSide;const altered={...recipe,referenceRouteSha256:routeSha256(missingExit.drags)};
 assert.throws(()=>makeFirstClearPlainBlueprint(runtime,missingExit,altered));
 evidence.push({name:'first-clear-hash-source-and-finite-parameter-negative-controls',passed:true});
});

test('whole-body region, untouched prefix, connectivity, normal mask and q0 mapping remain mandatory',()=>{
 const{runtime,ref,recipe}=fixture(),b=makeFirstClearPlainBlueprint(runtime,ref,recipe);assert.equal(b.region.area,11);assert.equal(b.normalBoardArea,12);assert.deepEqual(b.fixedBlocks,[ref.level.blocks[0]]);
 for(const ids of [['b0','b1','b2','b3','b4'],['b1','b1','b2','b3','b4'],['missing','b1','b2','b3','b4'],['b2','b3','b4','b5','b10','b11'],['b1']])
  assert.throws(()=>makeFirstClearPlainBlueprint(runtime,ref,{...recipe,bodyCountDelta:0,regionBodyIds:ids}));
 assert.throws(()=>makeFirstClearPlainBlueprint(runtime,ref,{...recipe,regionCells:b.region.cells.slice(1)}));
 const sourceChanged={...runtime,LEVELS:[{...runtime.LEVELS[0],width:5}]};assert.throws(()=>makeFirstClearPlainBlueprint(sourceChanged,ref,recipe));
 const missingArt={...runtime,GAME_ART:{gameplay:{formalBlocks:{red:{solid:{square:'synthetic-only'}}}}}};assert.throws(()=>makeFirstClearPlainBlueprint(missingArt,ref,recipe));
 const rotated={...runtime,matchFormalBlockShape(){return{shapeId:'square',quarterTurns:1};}};assert.throws(()=>makeFirstClearPlainBlueprint(rotated,ref,recipe));
 evidence.push({name:'whole-body-connected-untouched-region-source-mask-native-art-metadata',passed:true});
});

test.after(async()=>{
 const own='tools/daily-challenge/formal-v4/first-clear-plain-blueprint.mjs',testFile='tools/daily-challenge/formal-v4/first-clear-plain-blueprint.test.mjs',compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),fileBindings={};
 for(const f of [...Object.keys(compiled.metafile.inputs),testFile])fileBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 const after=await names();assert.deepEqual(after,before);
 await write(out+'/report.json',{status:evidence.length===3?'FIRST_CLEAR_PLAIN_BLUEPRINT_METADATA_PRIVATE_PASS':'INCOMPLETE',errors:evidence.length===3?[]:['Incomplete focused check'],evidence,fileBindings,
  scope:'Synthetic metadata only; no real reference validation or acceptance is claimed.',newRealReferencesReplayed:0,newConstructions:0,newCspCalls:0,newSearches:0,newLedgerClaims:0,publicRequestCountBeforeAfter:[before.length,after.length],formalReady:false});
});
