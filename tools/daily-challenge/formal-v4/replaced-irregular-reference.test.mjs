import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {makeReplacedIrregularBlueprint,qualifyReplacedIrregularReference} from './replaced-irregular-reference.mjs';
import {assertFixedGateRegionBlueprint,constructPlainFixedGateRegionStock} from './replaced-irregular-region-stock.mjs';
import {makeEarlyClearPlainBlueprint} from './early-clear-blueprint.mjs';
import {assertFixedGateRegionBlueprint as oldStockDomain} from './first-clear-plain-stock.mjs';
import {makePrefixTailV4Plan} from './prefix-tail-explore-task.mjs';
import {makeLowBandPrefixTailPlan} from './prefix-tail-low-band-task.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';
import {PUBLIC_LEDGER,sha,write} from './low-twenty-io.mjs';
import {SELF,assertEarlyClearProposal,assertEarlyClearPlan,VERSION,TARGETS} from './early-clear-replaced-irregular-batch-task.mjs';
import {UPPER_BUDGET,LOWER_BUDGET} from './fixed-gate-region-batch-task.mjs';

const out=process.env.REPLACED_IRREGULAR_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),names=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(x=>x.endsWith('.request.json')).sort(),before=await names(),evidence=[];
const d={path:'PRIVATE_SYNTHETIC_NOT_A_REAL_REFERENCE.json',sha256:'a'.repeat(64)};
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const L=[[0,0],[0,1],[1,1]];
function fixture(){
 const level={id:7,name:'Private replaced irregular reference',width:4,height:4,timeSeconds:120,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
  blocks:[['f0',0,0,rect(2,1),'red'],['f1',2,0,rect(2,1),'yellow'],['l0',0,1,L,'green'],['l1',2,1,L,'blue'],['s0',1,1,[[0,0]],'purple'],['s1',3,1,[[0,0]],'cyan'],['h0',0,3,rect(2,1),'orange'],['h1',2,3,rect(2,1),'pink']].map(([id,x,y,shape,color])=>({id,x,y,shape:structuredClone(shape),color})),
  gates:[['red','left',0,1],['yellow','right',0,1],['green','left',1,2],['blue','right',1,2],['orange','left',3,1],['pink','right',3,1],['cyan','top',3,1],['purple','bottom',0,2]].map(([color,side,offset,size])=>({id:'g-'+color,color,side,offset,size}))};
 const drags=[{blockId:'f0',path:[],exitSide:'left'},{blockId:'f1',path:[],exitSide:'right'},{blockId:'l0',path:[],exitSide:'left'},
  {blockId:'s0',path:[[0,1]]},{blockId:'s0',path:[[0,0]]},...Array.from({length:19},(_,i)=>({blockId:'s0',path:[[i%2?0:1,0]]})),
  {blockId:'h0',path:[],exitSide:'left'},{blockId:'h1',path:[],exitSide:'right'},{blockId:'s1',path:[[3,0]],exitSide:'top'},{blockId:'l1',path:[],exitSide:'right'},
  {blockId:'s0',path:[[1,1],[1,2],[1,3]],exitSide:'bottom'}];
 // Synthetic L metadata exercises the existing band contract; it is NOT a
 // lower certificate. Only this hand-authored complete U is replayed.
 const q={accepted:true,L:21,U:21,sourceLevelId:7,level,levelSha256:levelSha256(level),drags};
 const recipe={recipeId:'private-replaced-d3',branchId:'private-replaced-family',sourceLevelId:7,reference:d,referenceBand:2,finalTargetDifficulty:3,
  referenceLevelSha256:q.levelSha256,referenceRouteSha256:routeSha256(drags),regionBodyIds:level.blocks.slice(2).map(b=>b.id),cut:2,clearCount:2,seed:1,colourSeed:1,bodyCountDelta:0,maximumStocks:1,maximumStaticPartitionAttempts:1};
 return{q,recipe,runtime:{...rt,LEVELS:[structuredClone(level)]}};
}
let qualified,stock;
test('original q0 irregular reference has real dual complete U and unit-prefix audits; all irregulars are replaced',async()=>{
 const {runtime,q,recipe}=fixture(),original=structuredClone(q);qualified=qualifyReplacedIrregularReference(runtime,q,recipe);
 assert.deepEqual(q,original);assert.deepEqual(qualified.referenceGeometryDomain.irregularBodyIds,['l0','l1']);
 for(const r of [qualified.referenceQualification.canonical,qualified.referenceQualification.independent])assert(r.valid&&r.complete&&r.nonClearingDrags===21);
 assert.equal(qualified.referenceQualification.prefixAudits.length,2);assert(qualified.referenceQualification.prefixAudits.every(a=>a.valid));
 assert.equal(qualified.region.fraction,.75);assertFixedGateRegionBlueprint(rt,qualified);
 assert.throws(()=>makeEarlyClearPlainBlueprint(runtime,q,recipe),/rectangle/);assert.throws(()=>oldStockDomain(rt,qualified),/rectangle/);
 await write(out+'/private-reference-and-qualified-blueprint.json',{q,qualified,syntheticLowerMetadataOnly:true});
 evidence.push({name:'provided-original-irregular-dual-U-and-prefix',passed:true,privateReferenceReplaysOnly:true});
});
test('retained irregular, missing region cell, invalid q0, duplicate shape and false full route are refused',()=>{
 const f=fixture();for(const mutate of [x=>x.recipe.regionBodyIds.shift(),x=>x.recipe.regionCells=x.q.level.blocks.slice(2).flatMap(absoluteCells).slice(1),
  x=>{x.q.level.blocks[2].shape=[[0,0],[1,0],[0,1]];x.q.levelSha256=levelSha256(x.q.level);x.recipe.referenceLevelSha256=x.q.levelSha256;},
  x=>{x.q.level.blocks[2].shape[2]=[0,1];x.q.levelSha256=levelSha256(x.q.level);x.recipe.referenceLevelSha256=x.q.levelSha256;}]){
  const x=fixture();mutate(x);assert.throws(()=>makeReplacedIrregularBlueprint(x.runtime,x.q,x.recipe));}
 const bad=fixture();bad.q.drags.at(-1).exitSide='top';bad.recipe.referenceRouteSha256=routeSha256(bad.q.drags);
 assert.throws(()=>qualifyReplacedIrregularReference(bad.runtime,bad.q,bad.recipe));
 const missing={...rt,GAME_ART:structuredClone(rt.GAME_ART)};delete missing.GAME_ART.gameplay.formalBlocks.green.solid[4];
 assert.throws(()=>assertFixedGateRegionBlueprint(missing,qualified),/art/);
 evidence.push({name:'fixed-irregular-and-metadata-native-route-negatives',passed:true});
});
test('one synthetic stock keeps original mask/gates/fixed bodies, final rectangles and shared construction charges',async()=>{
 stock=constructPlainFixedGateRegionStock(rt,qualified,{seed:1,colourSeed:1,bodyCountDelta:0,shapeProfile:'balanced',qualificationOnly:true});
 await write(out+'/private-stock.json',stock);assert(stock.ok,JSON.stringify({status:stock.status,reason:stock.reason,paint:stock.paint?.reason}));
 assert.deepEqual(stock.level.gates,qualified.allReferenceGates);assert.deepEqual(boardCells(stock.level),boardCells(qualified.level));
 for(const b of qualified.fixedBlocks)assert.deepEqual(stock.level.blocks.find(x=>x.id===b.id),b);
 assert(stock.level.blocks.every(b=>b.shape.length===(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])))));
 assert.equal(stock.constructionAccounting.completeWorldReservations,1+stock.paint.accounting.completeWorldReservations);
 assert.equal(stock.constructionAccounting.transitions,stock.partition.transitions+stock.paint.accounting.transitions);assert(stock.prefixAudit.valid);
 assert.equal(stock.L,null);assert.equal(stock.U,null);assert.equal(stock.accepted,false);
 const capped=constructPlainFixedGateRegionStock(rt,qualified,{seed:1,colourSeed:1,bodyCountDelta:0,shapeProfile:'balanced',qualificationOnly:true,meterLimits:{maxWorlds:2}});
 assert(!capped.ok);assert.equal(capped.constructionAccounting.completeWorldReservations,1);assert.equal(capped.enteredColourCsp,false);
 await write(out+'/private-capped.json',capped);evidence.push({name:'single-toy-stock-final-rectangles-and-reserved-budget',passed:true,privateConstructionCalls:2});
});
test('unchanged D2/D3 planners bind the new rectangle evidence; no solver or claim',async()=>{
 assert(stock?.ok);const file=out+'/private-stock.json',candidate={...stock,constructionEvidence:{path:file,sha256:sha(await fs.readFile(file))}};
 for(const target of [2,3]){const p=target===2?makeLowBandPrefixTailPlan(rt,candidate,{qualificationOnly:true,targetDifficulty:2}):makePrefixTailV4Plan(rt,candidate,{qualificationOnly:true,floor:31});
  assert.equal(p.fullUpperBudget.maxStates,10000);assert.equal(p.lowerBudget.maxStates,9999);assert.deepEqual(p.constructionAccounting,stock.constructionAccounting);
  await write(out+'/private-math-plan-'+target+'.json',p);}
 evidence.push({name:'same-mathematics-rectangle-input-and-shared-debit',passed:true,newSearches:0});
});
test('new outer validates explicit paired targets and closed finite metadata, with no inherited legacy fallback',()=>{
 const {q,recipe,runtime}=fixture(),ref={referenceId:'private-ref',reference:d,referenceBand:2,sourceLevelId:7,referenceLevelSha256:q.levelSha256,referenceRouteSha256:routeSha256(q.drags),regionBodyIds:recipe.regionBodyIds};
 const recipes=[3,2].map((t,i)=>({...recipe,recipeId:'private-'+t,referenceId:ref.referenceId,finalTargetDifficulty:t,seed:1+i,colourSeed:1+i,bodyCountDelta:i,shapeProfile:'balanced'}));
 const proposal={version:'finite-early-clear-replaced-irregular-proposal-v1',status:'READONLY_EARLY_CLEAR_REPLACED_IRREGULAR_PROPOSAL_NOT_EXECUTABLE',executable:false,experimentId:'private-replaced-pair',selection:d,selectionReview:d,references:[ref],recipes,failedParents:[{sourceLevelId:7,branchId:recipe.branchId,receipt:d}],oneRepresentativePerBranch:true,failedInputRebandAllowed:false,fallbackAllowed:false,finiteExperiment:{maximumColourCspInputsIncludingFailed:2,maximumStaticPartitionAttempts:2,extendsClosedCampaigns:false}};
 assertEarlyClearProposal(proposal);const p={version:VERSION,experimentId:proposal.experimentId,contextDescriptor:d,legacyReferenceAllowlist:[],historyDeltas:[],proposalData:proposal,proposal:d,proposalReview:d,history:d,historyReview:d,qualification:d,selection:d,selectionReview:d,
  blueprints:recipes.map(r=>({...makeReplacedIrregularBlueprint(runtime,q,{...r,...ref}),canonicalReference:d,shapeProfile:r.shapeProfile})),futureUpperBudget:UPPER_BUDGET,futureLowerBudget:LOWER_BUDGET,strategy:{targets:TARGETS,tailCalls:1,originalLowerCalls:1,reband:false,fallback:false},bindings:{[SELF]:d.sha256}};
 assertEarlyClearPlan(p);for(const mutate of [p=>p.legacyReferenceAllowlist.push({}),p=>p.blueprints[0].maximumStocks=2,p=>p.futureUpperBudget={...p.futureUpperBudget,maxStates:10001},p=>p.proposalData.finiteExperiment.extendsClosedCampaigns=true]){const x=structuredClone(p);mutate(x);assert.throws(()=>assertEarlyClearPlan(x));}
 evidence.push({name:'new-outer-finite-paired-target-contract',passed:true});
});
test('outer and stock differ only by declared names, reference qualification and rectangle domain boundary',async()=>{
 const read=async f=>(await fs.readFile('tools/daily-challenge/formal-v4/'+f,'utf8')).replaceAll('\r\n','\n');
 let s=await read('early-clear-plain-batch-task.mjs');
 s=s.replace("import {makeEarlyClearPlainBlueprint} from './early-clear-blueprint.mjs';\nimport {makeExplicitLowBandBatchRecipe} from './prepare-low-band-batch.mjs';\nimport {makeExplicitNativeBatchRecipe} from './prepare-native-batch.mjs';","import {qualifyReplacedIrregularReference} from './replaced-irregular-reference.mjs';");
 s=s.replaceAll('first-clear-plain-stock.mjs','replaced-irregular-region-stock.mjs').replaceAll('early-clear-plain-batch-task.mjs','early-clear-replaced-irregular-batch-task.mjs').replaceAll('finite-early-clear-plain','finite-early-clear-replaced-irregular').replaceAll('EARLY_CLEAR_PLAIN','EARLY_CLEAR_REPLACED_IRREGULAR').replaceAll('EarlyClearPlainBatch','EarlyClearReplacedIrregularBatch');
 s=s.replace("async function validateReference(rt,r,ref,recipe){const q=await r.bound(ref.reference),b=makeEarlyClearPlainBlueprint(rt,q,{...recipe,...ref});const old=(ref.referenceBand===2?makeExplicitLowBandBatchRecipe:makeExplicitNativeBatchRecipe)(rt,q,{...recipe,reference:ref.reference,sourceLevelId:ref.sourceLevelId,targetDifficulty:ref.referenceBand,regionBodyIds:ref.regionBodyIds});\n for(const k of ['level','changedBodies','fixedBlocks','prefixDrags','prefixSha256','referenceLevelSha256','referenceRouteSha256'])assert.deepEqual(b[k],old[k]);assertSameUniqueCells(b.region.cells,old.region.cells);b.referenceQualification=old.referenceQualification;b.prefixReplay=replayLongPrefix(rt,q.level,b.prefixDrags);","async function validateReference(rt,r,ref,recipe){const q=await r.bound(ref.reference),b=qualifyReplacedIrregularReference(rt,q,{...recipe,...ref});b.prefixReplay=replayLongPrefix(rt,q.level,b.prefixDrags);");
 s=s.replace("'tools/daily-challenge/formal-v4/replaced-irregular-region-stock.mjs','tools/daily-challenge/formal-v4/plan-history-adapter-v4.mjs'","'tools/daily-challenge/formal-v4/replaced-irregular-region-stock.mjs','tools/daily-challenge/formal-v4/replaced-irregular-reference.mjs','tools/daily-challenge/formal-v4/plan-history-adapter-v4.mjs'");
 assert.equal(s,await read('early-clear-replaced-irregular-batch-task.mjs'));
 s=(await read('first-clear-plain-stock.mjs')).replace('first-clear-explicit-shape-profile-region-stock-v1','fully-replaced-q0-irregular-source-rectangular-stock-v1');
 s=s.replace("  assert.equal(new Set(b.shape.map(key)).size,w*h,'Normalized solid rectangle required');","  assert.equal(new Set(b.shape.map(key)).size,b.shape.length,'Original shape cells must be unique');\n  if(bp.fixedBlocks.some(x=>x.id===b.id))assert.equal(b.shape.length,w*h,'Retained bodies must remain solid rectangles');");
 s=s.replace('  const finalF=designFingerprints(level);',"  for(const b of level.blocks)assert.equal(b.shape.length,(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1]))),'Final mathematical input remains all rectangles');\n  const finalF=designFingerprints(level);");
 assert.equal(s,await read('replaced-irregular-region-stock.mjs'));
 evidence.push({name:'declared-only-diff-full-outer-and-stock-equivalence',passed:true});
});
test.after(async()=>{
 const c=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),bindings={...rt.toolchainBindings};
 for(const f of [...Object.keys(c.metafile.inputs),'tools/daily-challenge/formal-v4/replaced-irregular-reference.test.mjs'])bindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 const after=await names();await write(out+'/report.json',{status:evidence.length===6?'REPLACED_IRREGULAR_REFERENCE_PRIVATE_PASS':'INCOMPLETE',evidence,toolBindings:bindings,errors:[],
  newRealConstructions:0,newSearches:0,publicClaimsStarted:0,searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,syntheticLowerMetadataNotProof:true,
  publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,concurrentPublicAdditions:after.filter(x=>!before.includes(x)),
  realReferencesReplayed:0,finalMathematicalDomainExpanded:false,formalReady:false});
});
