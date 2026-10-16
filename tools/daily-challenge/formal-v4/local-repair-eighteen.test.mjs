import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import './exact-low20-failed-near-reader.test.mjs';
import {readExactLow20FailedNearAllowance,isExactFailedNearAlias} from './exact-low20-failed-near-reader.mjs';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {absoluteCells} from '../formal-v3/diversity-layout-factory.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {makeLocalRepairBlueprint} from './prepare-local-repair-eighteen.mjs';
import {constructLocalRepairStock} from './local-repair-region-factory.mjs';
import {recordFormedLowTwentyInput} from './construct-local-repair-eighteen.mjs';
import {LOCAL_REPAIR_PROPOSAL,LOCAL_REPAIR_EXPERIMENT_ID,LOCAL_REPAIR_FILES,assertLocalRepairRecipe,auditLocalRepairDelta,
 recordLowBandColourAttempt,assertLowBandInputDiversity,unclaimedFamilyDisposition,claimLocalRepairCampaign} from './local-repair-eighteen-contract.mjs';
import {sha,readBound,write,HISTORY_LEDGER_ROOTS,PUBLIC_LEDGER} from './low-twenty-io.mjs';
import {finishLatePrefixPlan} from './late-prefix-plan-ledger.mjs';
const out=process.env.LOCAL_REPAIR_EIGHTEEN_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const rt=await loadV4Runtime(),evidence=[],before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
const proposal=await readBound(LOCAL_REPAIR_PROPOSAL),clone=structuredClone;
function toy(){
 const v=[[0,0],[0,1]],h=[[0,0],[1,0],[2,0]];
 const level={id:999810,name:'Private local repair',width:4,height:2,timeSeconds:90,parMoves:10,reward:0,mechanismRules:'revised-2026-09-27-v1.5',
  blocks:['red','blue','green','purple'].map((color,x)=>({id:['opening','a','b','c'][x],x,y:0,shape:v,color})),
  gates:[{id:'gate-r',color:'red',side:'left',offset:0,size:2},{id:'gate-b',color:'blue',side:'bottom',offset:0,size:2},
   {id:'gate-g',color:'green',side:'right',offset:0,size:2},{id:'gate-p',color:'purple',side:'top',offset:1,size:2}]};
 const original={...clone(level),blocks:[clone(level.blocks[0]),{id:'old-h0',x:1,y:0,shape:h,color:'blue'},{id:'old-h1',x:1,y:1,shape:h,color:'green'}]};
 const changedBodies=level.blocks.slice(1,3),cells=changedBodies.flatMap(absoluteCells),prefix=[{blockId:'opening',path:[],exitSide:'left'}],d={path:'private-only/toy.json',sha256:'1'.repeat(64)};
 return{recipeId:'private-local-1',level,sourceLevelId:level.id,targetDifficulty:1,branchId:'low20-source-'+level.id,repairFamilyId:'low20-source-'+level.id,
  reference:d,geometricRepairSeed:d,referenceLevelSha256:levelSha256(level),originalReference:d,originalReferenceLevel:original,originalReferenceLevelSha256:levelSha256(original),
  originalLargeRegion:{cells:original.blocks.slice(1).flatMap(absoluteCells),fraction:.75},changedBodies,fixedBlocks:[level.blocks[0],level.blocks[3]],
  region:{cells,bodyIds:changedBodies.map(b=>b.id),area:4},prefixDrags:prefix,prefixSha256:routeSha256(prefix),prefixFacts:{drags:1,parking:0,clears:1},
  allReferenceGates:level.gates,maximumStocks:1,maximumStaticPartitionAttempts:100,seed:1,bodyCountDelta:0};
}
let made;
test('all eighteen declared repairs retain exact two-baseline metadata and fixed original prefix',async()=>{
 const rows=[];for(const f of proposal.families){const seed=await readBound(f.geometricRepairSeed),original=await readBound(f.preservedOriginalReference),input=await readBound(f.inputEvidence);
  for(const r of f.repairs)rows.push(makeLocalRepairBlueprint(f,r,seed,original,input));}
 assert.equal(rows.length,18);assert.equal(new Set(rows.map(b=>b.branchId)).size,6);
 for(const mutate of [b=>b.prefixDrags[0].blockId=b.changedBodies[0].id,b=>b.originalReferenceLevel.blocks.pop(),b=>b.region.cells.pop(),b=>b.maximumStocks=2,b=>b.maximumStaticPartitionAttempts=101]){
  const b=clone(rows[0]);mutate(b);assert.throws(()=>assertLocalRepairRecipe(b));}
 await write(out+'/read-only-blueprints.json',{rows,newRealStocks:0,noPrepareCall:true});
 evidence.push({name:'eighteen-real-bound-metadata-two-baselines',passed:true,recipes:18,newStocks:0});
});
test('private local retile changes real stock while preserving the original large-region gate and double prefix',async()=>{
 const bp=toy();assertLocalRepairRecipe(bp);made=constructLocalRepairStock(rt,bp,{seed:1,colourSeed:8,bodyCountDelta:0,qualificationOnly:true});
 await write(out+'/private-stock.json',made);assert(made.ok,JSON.stringify({status:made.status,reason:made.reason,paint:made.paint?.reason}));
 assert.equal(made.constructionAccounting.completeWorldReservations,1+made.paint.accounting.completeWorldReservations);
 assert.equal(made.prefixAudit.valid,true);assert.equal(made.prefixAudit.clearEvents,1);assert.equal(made.prefixAudit.isLowerBound,false);
 assert.equal(made.provenance.redesignDelta.repairArea,4);assert(made.provenance.redesignDelta.originalChangedFraction>=.35);
 assert.deepEqual(made.level.gates,bp.level.gates);assert.deepEqual(made.level.blocks.find(b=>b.id==='c'),bp.level.blocks[3]);
 assert.throws(()=>auditLocalRepairDelta(bp.level,bp));assert.throws(()=>auditLocalRepairDelta(made.level,{...bp,originalReferenceLevel:made.level}));
 const a=designFingerprints(bp.level),b=designFingerprints(made.level);assert.notEqual(a.shapeSha256,b.shapeSha256);assert.notEqual(a.colorSha256,b.colorSha256);
 assert.notEqual(made.level.blocks.find(b=>b.id==='a').color,bp.changedBodies[0].color);
 evidence.push({name:'private-q0-local-retiling-original-large-region-prefix',passed:true,worlds:made.constructionAccounting.completeWorldReservations});
});
test('all finished colour attempts debit one recipe and failed formed worlds remain blocked; cap reserves before colour',()=>{
 const counts=new Map(),recipe={recipeId:'one',maximumStocks:1};assert(recordLowBandColourAttempt(counts,recipe,{paint:{ok:false},ok:false}));
 assert.throws(()=>recordLowBandColourAttempt(counts,recipe,{paint:{ok:false},ok:false}));
 const h=new Map(),formed={paint:{ok:true},level:toy().level};assert.deepEqual(recordFormedLowTwentyInput(h,'f',formed),[]);assert.equal(h.get('f').length,1);
 const f=designFingerprints(formed.level);assert.throws(()=>assertLowBandInputDiversity([{...f,key:'f'},{...f,key:'f',designSha256:'different'}]));
 const limited=constructLocalRepairStock(rt,toy(),{seed:1,bodyCountDelta:0,qualificationOnly:true,meterLimits:{maxWorlds:1}});
 assert.equal(limited.ok,false);assert.equal(limited.paint,null);assert.equal(limited.constructionAccounting.completeWorldReservations,1);assert.equal(limited.level,null);
 evidence.push({name:'failed-csp-debit-formed-world-history-and-precharge-cap',passed:true});
});
test('first success alone skips unclaimed siblings and immediately protects cross-family near layouts',()=>{
 const level=toy().level,d={path:'private-only/success.json',sha256:'2'.repeat(64)},success={branchId:'one',level,input:d};
 const same={branchId:'one',level},other={branchId:'two',level};assert.equal(unclaimedFamilyDisposition(same,[]),null);
 const s=unclaimedFamilyDisposition(same,[success]);assert.equal(s.status,'SKIPPED_FAMILY_ALREADY_SUCCEEDED');assert.equal(s.failure,false);assert.equal(s.publicClaimsStarted,0);
 assert.equal(unclaimedFamilyDisposition(other,[success]).status,'SKIPPED_NEAR_NEW_FAMILY_SUCCESS');
 const far={...clone(level),width:8,height:1,blocks:Array.from({length:8},(_,x)=>({id:'s'+x,x,y:0,shape:[[0,0]],color:x%2?'red':'blue'}))};
 assert.equal(unclaimedFamilyDisposition({branchId:'two',level:far},[success]),null);
 evidence.push({name:'family-success-stop-no-claim-and-immediate-cross-family-near',passed:true});
});
test('fixed twelve real terminal aliases are read only and never exempt a protected success',async()=>{
 const allowance=await readExactLow20FailedNearAllowance();assert.equal(allowance.rows.length,12);assert.equal(allowance.newLedgerClaims,0);
 for(const row of allowance.rows){const receipt=await readBound(row.receipt),history={...row.receipt,level:receipt.level};assert(isExactFailedNearAlias(history,allowance));assert(!isExactFailedNearAlias({...history,accepted:true},allowance));}
 await write(out+'/exact-allowance-readonly.json',allowance);evidence.push({name:'real-twelve-failure-chain-readonly-schema',passed:true,terminalFailures:12});
});
test('one experiment lock cannot reopen with another label and records private failure',async()=>{
 const f=out+'/private-plan.json';await write(f,{experimentId:LOCAL_REPAIR_EXPERIMENT_ID,proposal:LOCAL_REPAIR_PROPOSAL,label:'one'});const d={path:f,sha256:sha(await fs.readFile(f))},ledgerDirectory=out+'/private-ledger';
 const claim=await claimLocalRepairCampaign(d,out+'/output-a',{qualificationOnly:true,ledgerDirectory});await finishLatePrefixPlan(claim,{status:'PRIVATE_FAILURE_TERMINAL',constructionFiles:[]});
 const second=out+'/private-plan-two.json';await write(second,{experimentId:LOCAL_REPAIR_EXPERIMENT_ID,proposal:LOCAL_REPAIR_PROPOSAL,label:'two'});
 const renamed={path:second,sha256:sha(await fs.readFile(second))};await assert.rejects(()=>claimLocalRepairCampaign(renamed,out+'/output-b',{qualificationOnly:true,ledgerDirectory}),/EEXIST/);
 assert.equal((await fs.readdir(ledgerDirectory)).filter(s=>s.endsWith('.claim.json')).length,1);evidence.push({name:'finite-experiment-wx-lock-despite-label-change',passed:true});
});
test('private construction lock refuses every seven shared roots and current-root junction descendants',async()=>{
 const f=out+'/private-plan.json',d={path:f,sha256:sha(await fs.readFile(f))},env=JSON.parse(await fs.readFile('snapshot-environment.json'));
 for(const root of HISTORY_LEDGER_ROOTS)for(const dir of [root,path.join(env.sourceWorkspace,root,'must-not-create-local-private')])await assert.rejects(()=>claimLocalRepairCampaign(d,out+'/bad',{qualificationOnly:true,ledgerDirectory:dir}),/Private repair ledger/);
 evidence.push({name:'all-seven-ledger-realpaths-private-guard',passed:true});
});
test.after(async()=>{
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
 const entries=[...LOCAL_REPAIR_FILES,'tools/daily-challenge/formal-v4/local-repair-eighteen.test.mjs'],compiled=await build({entryPoints:entries,bundle:true,packages:'external',write:false,outdir:'unused',metafile:true,platform:'node',format:'esm',logLevel:'silent'}),fileBindings={...rt.toolchainBindings};
 for(const f of [LOCAL_REPAIR_PROPOSAL.path,...Object.keys(compiled.metafile.inputs)])fileBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 await write(out+'/report.json',{status:evidence.length===7?'LOCAL_REPAIR_EIGHTEEN_PRIVATE_PASS':'LOCAL_REPAIR_EIGHTEEN_PRIVATE_INCOMPLETE',proposal:LOCAL_REPAIR_PROPOSAL,evidence,importedExactReaderPrivateTests:4,fileBindings,
  publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,concurrentPublicAdditions:after.filter(s=>!before.includes(s)),newRealConstructions:0,newSearches:0,publicClaimsStarted:0,privateStockConstructions:2,actualPrepareCalls:0,qualificationOnly:true,formalReady:false});
});
