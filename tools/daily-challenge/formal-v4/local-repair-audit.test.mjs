import test from 'node:test';
import assert from 'node:assert/strict';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {assertLocalRepairRecipe,auditLocalRepairDelta,unclaimedFamilyDisposition} from './local-repair-eighteen-contract.mjs';
import {assertLocalRepairDisposition,assertLowBandRecordedUpperAccounting} from './audit-local-repair-actual-independent.mjs';

const descriptor={path:'private-fixture-only.json',sha256:'1'.repeat(64)};
function regionFixture(){
 const horizontal=n=>Array.from({length:n},(_,x)=>[x,0]);
 const original={id:999501,width:4,height:4,gates:[],blocks:Array.from({length:4},(_,y)=>({id:'o'+y,x:0,y,color:y%2?'blue':'red',shape:horizontal(4)}))};
 const seed={...original,blocks:Array.from({length:8},(_,i)=>({id:'b'+i,x:i%2*2,y:Math.floor(i/2),color:i%2?'green':'yellow',shape:horizontal(2)}))};
 const changedBodies=[seed.blocks[0],seed.blocks[2]],ids=new Set(changedBodies.map(x=>x.id));
 const level={...seed,blocks:seed.blocks.map(b=>!ids.has(b.id)?structuredClone(b):{...b,x:b.id==='b0'?0:1,y:0,color:'red',shape:[[0,0],[0,1]]})};
 const b={reference:descriptor,geometricRepairSeed:descriptor,originalReference:descriptor,level:seed,referenceLevelSha256:levelSha256(seed),
  originalReferenceLevel:original,originalReferenceLevelSha256:levelSha256(original),sourceLevelId:seed.id,targetDifficulty:1,maximumStocks:1,
  maximumStaticPartitionAttempts:100,seed:1,bodyCountDelta:0,branchId:'low20-source-'+seed.id,repairFamilyId:'low20-source-'+seed.id,
  changedBodies,fixedBlocks:seed.blocks.filter(b=>!ids.has(b.id)),region:{cells:changedBodies.flatMap(absoluteCells),bodyIds:[...ids],area:4,originalBodyCount:2},
  originalLargeRegion:{cells:original.blocks.flatMap(absoluteCells),bodyIds:original.blocks.map(b=>b.id),fraction:1},
  prefixDrags:[],prefixSha256:routeSha256([]),prefixFacts:{drags:0,parking:0,clears:0},allReferenceGates:[]};
 return{b,level};
}
test('two baselines: a 25% local repair preserves a real connected >=35% original redesign',()=>{
 const{b,level}=regionFixture();assertLocalRepairRecipe(b);const delta=auditLocalRepairDelta(level,b);
 assert.equal(delta.repairArea,4);assert.equal(delta.originalChangedArea,16);assert.equal(delta.originalChangedFraction,1);
 const falseLarge=structuredClone(b);falseLarge.originalReferenceLevel=structuredClone(b.level);
 falseLarge.originalReferenceLevelSha256=levelSha256(falseLarge.originalReferenceLevel);
 assert.throws(()=>auditLocalRepairDelta(level,falseLarge),/>=35%/,'Claiming a large region cannot replace the actual original-reference delta');
 assert.throws(()=>auditLocalRepairDelta(b.level,b),'Unchanged local partition is not a new input');
 const outside=structuredClone(b);outside.originalLargeRegion.cells=outside.originalLargeRegion.cells.filter(p=>p.join(',')!=='0,0');
 assert.throws(()=>assertLocalRepairRecipe(outside));
});
function skipFixture(sameFamily=true){
 const{level}=regionFixture(),input={level,levelSha256:levelSha256(level),sourceLevelId:999501,targetDifficulty:1,branchId:'branch-a'};
 const successes=[{branchId:sameFamily?'branch-a':'branch-other',level:structuredClone(level),input:descriptor}];
 const expected=unclaimedFamilyDisposition(input,successes);
 const q={...expected,attempt:null,L:null,U:null,formalReady:false,selectionIndexUnchanged:true,levelSha256:input.levelSha256,
  sourceLevelId:input.sourceLevelId,targetDifficulty:1,branchId:input.branchId};
 const row={...expected,attemptId:null,L:null,U:null,sourceLevelId:input.sourceLevelId,targetDifficulty:1,branchId:input.branchId};
 return{input,successes,q,row};
}
test('same-family and cross-family near skips need the exact earlier accepted receipt and zero claims',()=>{
 for(const sameFamily of[true,false]){const x=skipFixture(sameFamily);
  assert.equal(assertLocalRepairDisposition(x.q,x.row,x.input,x.successes,[]).status,sameFamily?'SKIPPED_FAMILY_ALREADY_SUCCEEDED':'SKIPPED_NEAR_NEW_FAMILY_SUCCESS');
  assert.throws(()=>assertLocalRepairDisposition(x.q,x.row,x.input,[],[]));
  const changed=structuredClone(x.q);changed.successfulInput.sha256='2'.repeat(64);
  assert.throws(()=>assertLocalRepairDisposition(changed,x.row,x.input,x.successes,[]));
  const fp=designFingerprints(x.input.level);assert.throws(()=>assertLocalRepairDisposition(x.q,x.row,x.input,x.successes,[{id:fp.designSha256,...fp}]));
 }
});
test('successful family blocks a claimed sibling; a skip cannot hide a search or claim',()=>{
 const x=skipFixture();assert.throws(()=>assertLocalRepairDisposition({...x.q,status:'UNKNOWN_CONSTRUCTED_UPPER_TERMINAL',attempt:{id:'a'}},x.row,x.input,x.successes,[]));
 for(const patch of[{attempt:{id:'a'}},{lowerBound:{}},{upperConstruction:{}},{failure:true},{publicClaimsStarted:1},{newGameplaySearches:1}])
  assert.throws(()=>assertLocalRepairDisposition({...x.q,...patch},x.row,x.input,x.successes,[]));
 const noSkip={status:'UNKNOWN_CONSTRUCTED_UPPER_TERMINAL',attempt:{id:'a'}};
 assert.equal(assertLocalRepairDisposition(noSkip,{},x.input,[],[]),null);
});
test('the reused original upper-accounting assertion rejects construction/raw tampering',()=>{
 const prior={completeWorldReservations:3,transitions:0,microStates:0,elapsedMilliseconds:0};
 const q={plan:{constructionAccounting:prior,fullUpperBudget:{maxStates:10000,maxMilliseconds:30000},lowerBudget:{maxStates:9999,maxMilliseconds:30000}},
  upperConstruction:{prefixCommittedWorldUpperBound:1,prefixAudits:[],tailSearches:0,conservativeFullBoardStateUpperBound:1},
  upperAccounting:{prior,knownPrefix:1,tailRegistered:0,terminalAllowance:0,conservativeFullBoardStateUpperBound:4,maximum:10000}};
 assert.equal(assertLowBandRecordedUpperAccounting(q,[]),4);
 const bad=structuredClone(q);bad.upperAccounting.conservativeFullBoardStateUpperBound=3;assert.throws(()=>assertLowBandRecordedUpperAccounting(bad,[]));
 const over=structuredClone(q);over.plan.constructionAccounting.completeWorldReservations=10000;over.upperAccounting.prior=over.plan.constructionAccounting;over.upperAccounting.conservativeFullBoardStateUpperBound=10001;
 assert.throws(()=>assertLowBandRecordedUpperAccounting(over,[]));
});
