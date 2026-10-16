import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {makeEarlyClearPlainBlueprint} from './early-clear-blueprint.mjs';
import {SELF,VERSION,TARGETS,LEGACY198,assertLegacyAllowlist,assertEarlyClearProposal,assertEarlyClearPlan,assertEarlyClearIndex,assertEarlyClearReceipt} from './early-clear-plain-batch-task.mjs';
import {UPPER_BUDGET,LOWER_BUDGET,mixedShortPrefixBatchDisposition} from './fixed-gate-region-batch-task.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_LEDGER,sha,write} from './low-twenty-io.mjs';
const out=process.env.EARLY_CLEAR_BATCH_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const evidence=[],h='a'.repeat(64),d={path:'synthetic-private-reference.json',sha256:h};
const publicNames=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort(),before=await publicNames();

// Synthetic metadata only. Paths, certificates and art names are deliberately
// not physical proof: calling a model is forbidden in these focused fixtures.
function fixture(clearCount=2,referenceBand=2){
 const level={id:7,width:4,height:4,mechanismRules:'revised-2026-09-27-v1.5',blocks:Array.from({length:16},(_,i)=>({id:'b'+i,x:i%4,y:Math.floor(i/4),shape:[[0,0]],color:i%2?'blue':'red'})),gates:[{id:'red',color:'red',side:'top',offset:0,size:2},{id:'blue',color:'blue',side:'bottom',offset:2,size:2}]};
 const U=referenceBand===2?23:38,drags=[];
 for(let i=0;i<6;i++){drags.push(...Array.from({length:i===0?9:1},()=>({blockId:'b'+i,path:[[i%4,Math.floor(i/4)]]})));drags.push({blockId:'b'+i,path:[],exitSide:'top'});}
 drags.push(...Array.from({length:U-14},()=>({blockId:'b6',path:[[2,1]]})),...level.blocks.slice(6).map(b=>({blockId:b.id,path:[],exitSide:'top'})));
 const exits=drags.flatMap((x,i)=>x.exitSide?[i+1]:[]),cut=exits[clearCount-1],q={accepted:true,sourceLevelId:7,L:referenceBand===2?21:31,U,level,levelSha256:levelSha256(level),drags};
 const ref={referenceId:'private-reference',sourceLevelId:7,reference:d,referenceBand,referenceLevelSha256:q.levelSha256,referenceRouteSha256:routeSha256(drags),regionBodyIds:level.blocks.slice(8).map(b=>b.id)};
 const recipes=[3,2].map((target,i)=>({recipeId:'private-'+target,branchId:'private-family',referenceId:ref.referenceId,sourceLevelId:7,referenceBand,finalTargetDifficulty:target,cut,clearCount,seed:101+i,colourSeed:201+i,bodyCountDelta:i?-1:-2,shapeProfile:i?'bar-mix':'balanced',maximumStocks:1,maximumStaticPartitionAttempts:160}));
 const rt={LEVELS:[structuredClone(level)],GAME_ART:{gameplay:{formalBlocks:{red:{solid:{S:'synthetic-red.png'}},blue:{solid:{S:'synthetic-blue.png'}}}}},matchFormalBlockShape:()=>({shapeId:'S',quarterTurns:0}),replayRevisedRoute(){throw Error('No model replay allowed');},validateLevel(){throw Error('No model validation allowed');}};
 const proposal={version:'finite-early-clear-plain-proposal-v1',status:'READONLY_EARLY_CLEAR_PLAIN_PROPOSAL_NOT_EXECUTABLE',executable:false,experimentId:'private-early-clear',selection:d,selectionReview:d,references:[ref],recipes,failedParents:[{sourceLevelId:7,branchId:'private-family',receipt:d}],oneRepresentativePerBranch:true,failedInputRebandAllowed:false,fallbackAllowed:false,finiteExperiment:{maximumColourCspInputsIncludingFailed:2,maximumStaticPartitionAttempts:320,extendsClosedCampaigns:false}};
 const blueprints=clearCount<=5?recipes.map(r=>({...makeEarlyClearPlainBlueprint(rt,q,{...r,...ref}),canonicalReference:d,shapeProfile:r.shapeProfile})):[];
 const plan={version:VERSION,experimentId:proposal.experimentId,contextDescriptor:d,legacyReferenceAllowlist:[],proposalData:proposal,proposal:d,proposalReview:d,history:d,historyReview:d,historyDeltas:[],qualification:d,selection:d,selectionReview:d,blueprints,futureUpperBudget:UPPER_BUDGET,futureLowerBudget:LOWER_BUDGET,strategy:{targets:TARGETS,tailCalls:1,originalLowerCalls:1,reband:false,fallback:false},bindings:{[SELF]:h}};
 return{rt,q,ref,recipes,proposal,plan,exits};
}
test('declared first through fifth clear cuts retain actual parking and do not transfer reference difficulty',()=>{
 for(const band of [2,3])for(const count of [1,2,3,4,5]){const {q,plan,proposal}=fixture(count,band),before=JSON.stringify(q);assertEarlyClearProposal(proposal);assertEarlyClearPlan(plan);
  for(const b of plan.blueprints){assert.equal(b.clearCount,count);assert.equal(b.prefixFacts.clears,count);assert.equal(b.cut,b.prefixDrags.length);assert.equal(b.prefixFacts.parking,8+count);assert(b.prefixFacts.parking>8);assert(b.prefixDrags.at(-1).exitSide);assert.equal(b.referenceBand,band);assert.equal(b.referenceL,q.L);assert.equal(b.referenceMathematicsTransferred,false);assert(b.prefixIsNotLowerBound&&b.oldSuffixIsNotNewU);assert.equal(b.region.fraction,.5);assert.deepEqual(b.allReferenceGates,q.level.gates);}
  assert.equal(JSON.stringify(q),before);
 }
 evidence.push({name:'all-five-clear-counts-no-parking-eight-cap-truthful-reference',passed:true});
});
test('cut must terminate at exactly its declared clear; full region/source/q0 checks remain active',()=>{
 const {rt,q,ref,recipes,exits}=fixture(),recipe={...recipes[0],...ref};
 for(const mutate of [r=>r.cut=0,r=>r.cut=q.drags.length+1,r=>r.cut--,r=>r.cut++,r=>r.clearCount=1,r=>r.clearCount=0,r=>{r.clearCount=6;r.cut=exits[5];},r=>delete r.clearCount,r=>r.referenceRouteSha256='b'.repeat(64),r=>r.regionBodyIds=['b0',...ref.regionBodyIds.slice(1)],r=>r.regionBodyIds=['b8'],r=>r.regionBodyIds=['b0','b2','b4','b6','b8','b10','b12','b14'],r=>r.regionCells=[[0,2]]]){const bad=structuredClone(recipe);mutate(bad);assert.throws(()=>makeEarlyClearPlainBlueprint(rt,q,bad));}
 assert.throws(()=>makeEarlyClearPlainBlueprint({...rt,LEVELS:[{...q.level,width:5}]},q,recipe));
 assert.throws(()=>makeEarlyClearPlainBlueprint({...rt,matchFormalBlockShape:()=>({shapeId:'S',quarterTurns:1})},q,recipe));
 assert.throws(()=>makeEarlyClearPlainBlueprint({...rt,GAME_ART:{gameplay:{formalBlocks:{}}}},q,recipe));
 evidence.push({name:'cut-boundaries-clear-six-touched-region-normal-mask-native-art',passed:true});
});
test('saved plans cannot change cut/count, target order, quota or inherit the old legacy198 exception',()=>{
 const {proposal,plan}=fixture(5);
 for(const mutate of [p=>p.recipes[0].clearCount=6,p=>p.recipes[0].cut=0,p=>p.recipes[1].finalTargetDifficulty=3,p=>p.recipes[1].seed=p.recipes[0].seed,p=>p.finiteExperiment.extendsClosedCampaigns=true,p=>p.recipes[0].maximumStocks=2,p=>p.finiteExperiment.maximumStaticPartitionAttempts++]){const bad=structuredClone(proposal);mutate(bad);assert.throws(()=>assertEarlyClearProposal(bad));}
 for(const mutate of [p=>p.blueprints[0].cut--,p=>p.blueprints[0].clearCount--,p=>p.blueprints[0].prefixFacts.parking--,p=>delete p.blueprints[0].prefixDrags.at(-1).exitSide,p=>p.blueprints[0].prefixSha256='c'.repeat(64),p=>p.blueprints[0].allowedClearCountRange=[1,6],p=>p.strategy.reband=true,p=>p.futureUpperBudget.maxStates=10001,p=>p.futureLowerBudget.maxStates=10000]){const bad=structuredClone(plan);mutate(bad);assert.throws(()=>assertEarlyClearPlan(bad));}
 assertLegacyAllowlist([]);assert.throws(()=>assertLegacyAllowlist([LEGACY198]));
 const index={status:'EARLY_CLEAR_PLAIN_STATIC_COMPLETE',experimentId:plan.experimentId,attempts:plan.blueprints.map(b=>({recipeId:b.recipeId,sourceLevelId:7,branchId:'private-family',finalTargetDifficulty:b.finalTargetDifficulty,localAttempt:0,enteredColourCsp:true,constructionEvidence:d})),perRecipeColourCspInputs:{'private-3':1,'private-2':1},perRecipeStaticAttempts:{'private-3':1,'private-2':1},fixedColourInputs:2,candidates:[],eligibleInputs:0,gameplaySearches:0,publicLedgerClaims:0};assertEarlyClearIndex(index,plan);
 const extra=structuredClone(index);extra.attempts.push({...extra.attempts[0],localAttempt:1});assert.throws(()=>assertEarlyClearIndex(extra,plan));
 assert.equal(mixedShortPrefixBatchDisposition({sourceLevelId:7,branchId:'private-family'},[{sourceLevelId:7,branchId:'private-family',input:d}]).status,'SKIPPED_FAMILY_ALREADY_SUCCEEDED');
 evidence.push({name:'saved-cut-count-budgets-single-CSP-failure-charge-family-skip-no-new-legacy',passed:true});
});
test('accepted final objects still require original L and U evidence and exact two independent budgets',()=>{
 const level={id:7,blocks:[]},prior={version:'late-region-static-construction-v1',completeWorldReservations:1,transitions:0,microStates:0,elapsedMilliseconds:0};
 for(const band of [3,2]){const input={level,finalTargetDifficulty:band,constructionAccounting:prior,constructionEvidence:d},plan={floor:TARGETS[band].floor,constructionAccounting:prior,constructionEvidence:d,fullUpperBudget:UPPER_BUDGET,lowerBudget:LOWER_BUDGET,band:{floor:21,upper:30},bandChangeAfterClaimAllowed:false,failedInputContinuationAllowed:false};
 const q={level,levelSha256:levelSha256(level),plan,finalTargetDifficulty:band,targetDifficulty:band,accepted:false,L:null,version:band===3?'new-plain-stock-fixed-late-prefix-one-tail-then-original-lower-task-v1':'low-band-fixed-prefix-one-capped-tail-original-lower-task-v1'};assertEarlyClearReceipt(q,input);
 for(const mutate of [x=>x.accepted=true,x=>x.plan.fullUpperBudget.maxStates=10001,x=>x.plan.lowerBudget.maxStates=10000,x=>x.plan.floor=16,x=>x.levelSha256='f'.repeat(64)]){const bad=structuredClone(q);mutate(bad);assert.throws(()=>assertEarlyClearReceipt(bad,input));}}
 evidence.push({name:'original-math-mandatory-unchanged-floor-and-world-budget',passed:true});
});
test('constructor/math/history/audit bodies are the frozen implementation after declared API/status substitutions',async()=>{
 const old=await fs.readFile('tools/daily-challenge/formal-v4/first-clear-plain-batch-task.mjs','utf8'),current=await fs.readFile(SELF,'utf8');assert.equal(sha(old),'6e7254d4b98c4abf14f48a2af1c915d089fd9c308d72a81cd6abcd7ce57ee724');
 const rename=s=>s.replaceAll('FirstClear','EarlyClear').replaceAll('firstClear','earlyClear').replaceAll('FIRST_CLEAR','EARLY_CLEAR');
 const between=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i);return s.slice(i,j);};
 for(const[a,b]of [['export function assertFirstClearIndex','// Only current execution'],['async function validateReference','export function assertLegacyAllowlist'],['export function firstClearConstructionFiles','\nif(process.argv[1]']])assert.equal(between(current,rename(a),rename(b)),rename(between(old,a,b)));
 const factory='tools/daily-challenge/formal-v4/first-clear-plain-stock.mjs';assert.equal(sha(await fs.readFile(factory)),'47d7b92d7916a781dfc3baa732692d3f9aa307f3e92880ae5060ab3fd3df01ec');assert(current.includes("from './plan-history-adapter-v4.mjs'"));assert(!current.includes('plan-history-adapter-v3.mjs'));
 evidence.push({name:'byte-identical-construction-math-accounting-terminal-history-and-audit-bodies',passed:true});
});
test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};
 for(const f of Object.keys(compiled.metafile.inputs))toolBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 const fileBindings={...toolBindings};for(const f of ['tools/daily-challenge/formal-v4/early-clear-plain-batch-task.test.mjs','tools/daily-challenge/formal-v4/first-clear-plain-batch-task.mjs','tools/daily-challenge/formal-v4/first-clear-plain-blueprint.mjs'])fileBindings[f]=sha(await fs.readFile(f));
 const after=await publicNames();await write(out+'/report.json',{status:evidence.length===5?'EARLY_CLEAR_PLAIN_BATCH_TASK_PRIVATE_PASS':'INCOMPLETE',errors:evidence.length===5?[]:['Incomplete focused checks'],evidence,toolBindings,fileBindings,qualificationOnly:true,syntheticMetadataOnly:true,newRealReferencesReplayed:0,newRealConstructions:0,newConstructions:0,newCspCalls:0,newSearches:0,publicClaimsStarted:0,newLedgerClaims:0,publicRequestCountBeforeAfter:[before.length,after.length],externalPublicAdditions:after.filter(x=>!before.includes(x)),searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,formalReady:false});
});
