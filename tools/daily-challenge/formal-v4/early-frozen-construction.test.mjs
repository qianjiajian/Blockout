import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {constructEarlyFrozenRegionStock,colourWithAllReferenceGates,createEarlyStockMeter} from './early-frozen-region-factory.mjs';
import {reserveEarlyFrozenAssignment,makeEarlyFrozenIcePlan} from './early-frozen-ice-joint.mjs';
import {recordEarlyColourAttempt,historyAllowsStock,physicalPartition,physicalRetry,realShapeColourChange,claimEarlyConstruction,finishEarlyConstruction,
 EARLY_EXPERIMENT_ID,EARLY_CONSTRUCTION_LEDGER} from './early-frozen-construction-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {PUBLIC_LEDGER,HISTORY_LEDGER_ROOTS,sha,write} from './native-batch-io.mjs';
import {recordFormedEarlySourceInput} from './construct-early-frozen-four.mjs';
const runtime=await loadV4Runtime(),out=process.env.EARLY_CONSTRUCTION_TEST_OUT;assert(out,'Fresh private output required');await fs.mkdir(out,{recursive:false});
const fixturePath='deliverables/daily-formal-v4-20261008/proof/early-frozen-constructor-toy-probe-01/result.json';
const fixtureBytes=await fs.readFile(fixturePath),bp=JSON.parse(fixtureBytes).blueprint,evidence=[];
const before=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();
let successful;
test('whole toy retile+sole CSP+ice preserves all eight gates and actual two-model prefix',async()=>{
 const b=constructEarlyFrozenRegionStock(runtime,bp,{seed:1,bodyCountDelta:3,qualificationOnly:true});assert(b.ok,JSON.stringify({status:b.status,reason:b.reason,paint:b.paint?.reason}));successful=b;
 assert.deepEqual(b.level.gates,bp.level.gates);assert.deepEqual(b.plain.level.gates,bp.level.gates);assert.equal(b.level.blocks.length,7);
 assert.equal(b.prefixAudit.valid,true);assert.equal(b.prefixAudit.clearEvents,1);assert.equal(b.prefixAudit.nonClearingDrags,0);assert.equal(b.prefixAudit.fullUValidated,false);
 assert.equal(b.constructionAccounting.completeWorldReservations,3);assert.equal(b.plain.constructionAccounting.completeWorldReservations,2);
 assert.equal(b.paint.accounting.completeWorldReservations,1);assert.equal(b.iceDeclaration.regionBlockIds.length,6);
 assert(b.level.blocks.filter(x=>x.id!=='opening').every(x=>x.frozen===1));assert.equal(b.level.blocks[0].frozen,undefined);
 const stripped=structuredClone(b.level);for(const x of stripped.blocks)delete x.frozen;assert.deepEqual(stripped,b.plain.level);
 assert.notEqual(designFingerprints(b.level).shapeSha256,designFingerprints(bp.level).shapeSha256);assert.notEqual(designFingerprints(b.level).colorSha256,designFingerprints(bp.level).colorSha256);
 await write(`${out}/toy-construction.json`,b);evidence.push({name:'actual-complete-private-constructor-prefix',passed:true,worlds:3,gameplaySearches:0});
});
test('all fixed gates remain constraints: unsupported reference gate rejects, never reassigns',()=>{
 const altered=structuredClone(bp);altered.level.gates[0].size=1;
 const b=colourWithAllReferenceGates(successful.placeholderWorld,runtime,altered,{seed:1});assert.equal(b.ok,false);
 assert.match(b.reason,/preserved-gate|fixed-colour-gate/);evidence.push({name:'all-reference-gates-no-fallback',passed:true,reason:b.reason});
});
test('world cap reserves final ice before CSP and never forms an uncharged iced object',()=>{
 const b=constructEarlyFrozenRegionStock(runtime,bp,{seed:1,bodyCountDelta:3,qualificationOnly:true,meterLimits:{maxWorlds:2}});
 assert.equal(b.ok,false);assert.equal(b.enteredColourCsp,false);assert.equal(b.constructionAccounting.completeWorldReservations,1);assert.equal(b.level,null);
 const m=createEarlyStockMeter({maxWorlds:5});m.reserveWorld('placeholderWorldReservations');
 m.importPaint({accounting:{completeWorldReservations:3,transitions:20,microStates:5}});assert.equal(m.snapshot().completeWorldReservations,4);
 let clones=0;const plain={...successful.plain.level,get name(){clones++;return'test';}};
 reserveEarlyFrozenAssignment(plain,successful.iceDeclaration,m);assert.equal(clones,1);assert.equal(m.snapshot().completeWorldReservations,5);
 assert.throws(()=>reserveEarlyFrozenAssignment(plain,successful.iceDeclaration,m),/complete-world-limit/);assert.equal(clones,1);
 evidence.push({name:'failed-complete-paints-and-final-precharge',passed:true});
});
test('only an entered CSP spends source quota, including every failed CSP',()=>{
 const m=new Map(),b={recipeId:'private',maximumStocks:2};assert.equal(recordEarlyColourAttempt(m,b,{paint:null,enteredColourCsp:false}),false);
 for(let i=0;i<2;i++)assert(recordEarlyColourAttempt(m,b,{paint:{ok:false},enteredColourCsp:true}));assert.equal(m.get('private'),2);
 assert.throws(()=>recordEarlyColourAttempt(m,b,{paint:{ok:false},enteredColourCsp:true}));evidence.push({name:'two-csp-quota-including-failures',passed:true});
});
test('history excludes physical pair/partition and explicit branch shape, not unrelated inventory',()=>{
 const level=successful.level,f=designFingerprints(level);assert(historyAllowsStock(level,f,{unrelatedHistoricalShapeHashes:new Set([f.shapeSha256])}));
 assert(!historyAllowsStock(level,f,{partitions:new Set([physicalPartition(level)])}));assert(!historyAllowsStock(level,f,{retryIdentities:new Set([physicalRetry(f)])}));
 assert(!historyAllowsStock(level,f,{sameSourceShapes:new Set([f.shapeSha256])}));
 const a={shapeSha256:'old',colorSha256:'old',colorAssignments:[{id:'a',colors:['red']}]},b={shapeSha256:'new',colorSha256:'new',colorAssignments:[{id:'a',colors:['red']}]};
 assert(!realShapeColourChange(a,b));b.colorAssignments[0].colors=['blue'];assert(realShapeColourChange(a,b));
 b.colorAssignments=[{id:'other',colors:['red']}];assert(!realShapeColourChange(a,b));b.colorAssignments[0].colors=['blue'];assert(realShapeColourChange(a,b));
 evidence.push({name:'scoped-stock-and-actual-colour-guard',passed:true});
});
test('per-stock prior is not a batch sum and entry accepts exact bound plain/iced evidence',async()=>{
 const b=successful,p=`${out}/bound-plain.json`;await write(p,b.plain);const plainConstructionEvidence={path:p,sha256:sha(await fs.readFile(p))};
 const candidate={sourceLevelId:b.sourceLevelId,level:b.level,iceDeclaration:b.iceDeclaration,constructionAccounting:b.constructionAccounting,plainConstructionEvidence};
 const file=`${out}/bound-iced.json`;await write(file,{...candidate,levelSha256:b.levelSha256});candidate.constructionEvidence={path:file,sha256:sha(await fs.readFile(file))};
 const plan=makeEarlyFrozenIcePlan(runtime,candidate,{qualificationOnly:true,floor:1,searchUpper:8});assert.equal(plan.jointBudget.maxStates,9996);
 assert.equal(plan.jointBudget.maxTransitions,10000000-b.constructionAccounting.transitions);
 assert.equal(createEarlyStockMeter().snapshot().completeWorldReservations,0);evidence.push({name:'exact-entry-schema-per-physical-input',passed:true,newGameplaySearches:0});
});
test('same experiment cannot restart under a second label or changed metadata; private aliases refused',async()=>{
 const p=`${out}/private-plan.json`;await write(p,{experimentId:EARLY_EXPERIMENT_ID,label:'one'});const d={path:p,sha256:sha(await fs.readFile(p))},ledgerDirectory=`${out}/private-plan-ledger`;
 const c=await claimEarlyConstruction(d,`${out}/output-a`,{qualificationOnly:true,ledgerDirectory});await finishEarlyConstruction(c,{status:'PRIVATE_COMPLETE',constructionFiles:[]});
 const p2=`${out}/private-plan-renamed.json`;await write(p2,{experimentId:EARLY_EXPERIMENT_ID,label:'two'});
 const renamed={path:p2,sha256:sha(await fs.readFile(p2))};await assert.rejects(()=>claimEarlyConstruction(renamed,`${out}/output-b`,{qualificationOnly:true,ledgerDirectory}),/EEXIST/);
 const env=JSON.parse(await fs.readFile('snapshot-environment.json'));
 for(const dir of [...HISTORY_LEDGER_ROOTS,EARLY_CONSTRUCTION_LEDGER])for(const target of [dir,path.join(env.sourceWorkspace,dir,'must-not-create-private')])
  await assert.rejects(()=>claimEarlyConstruction(d,`${out}/bad`,{qualificationOnly:true,ledgerDirectory:target}),/Private ledger aliases/);
 evidence.push({name:'stable-once-lock-and-junction-guards',passed:true});
});
test('finite caps reject nonintegers and out of limits before any world',()=>{
 for(const x of [{maxWorlds:10000},{maxWorlds:NaN},{maxTransitions:Infinity},{maxMicroStates:-1},{maxMilliseconds:30001}])assert.throws(()=>createEarlyStockMeter(x));
 evidence.push({name:'finite-input-budget-validation',passed:true});
});
test('fully coloured input whose frozen prefix fails still blocks same-source colour reuse',()=>{
 const altered={...bp,iceCount:2},b=constructEarlyFrozenRegionStock(runtime,altered,{seed:1,bodyCountDelta:3,qualificationOnly:true});
 assert.equal(b.ok,false);assert.equal(b.status,'STATIC_EARLY_FROZEN_REJECTED');assert(b.plain?.level&&b.paint?.ok);
 const history=new Map(),previous=recordFormedEarlySourceInput(history,bp.sourceLevelId,b);assert.deepEqual(previous,[]);
 const failed=designFingerprints(b.plain.level);assert.deepEqual(history.get(bp.sourceLevelId),[failed]);
 const shapeOnly={...failed,shapeSha256:'different-shape'};assert(!realShapeColourChange(history.get(bp.sourceLevelId)[0],shapeOnly));
 const nextPrevious=recordFormedEarlySourceInput(history,bp.sourceLevelId,{ok:true,plain:successful.plain});assert.deepEqual(nextPrevious,[failed]);
 assert.equal(history.get(bp.sourceLevelId).length,2);evidence.push({name:'failed-complete-plain-remains-in-source-history',passed:true});
});
test.after(async()=>{
 const after=(await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort();assert.deepEqual(after,before);
 const compiled=await build({entryPoints:['tools/daily-challenge/formal-v4/early-frozen-construction.test.mjs','tools/daily-challenge/formal-v4/prepare-early-frozen-four-plan.mjs',
  'tools/daily-challenge/formal-v4/construct-early-frozen-four.mjs','tools/daily-challenge/formal-v4/run-early-frozen-four.mjs'],bundle:true,packages:'external',write:false,metafile:true,outdir:'unused-test-bundle',platform:'node',format:'esm',logLevel:'silent'});
 const fileBindings={...runtime.toolchainBindings,[fixturePath]:sha(fixtureBytes)};for(const file of Object.keys(compiled.metafile.inputs))fileBindings[file.replaceAll('\\','/')]=sha(await fs.readFile(file));
 await write(`${out}/report.json`,{status:evidence.length===9?'EARLY_FROZEN_CONSTRUCTOR_PRIVATE_PASS':'PRIVATE_QUALIFICATION_INCOMPLETE',qualificationOnly:true,evidence,
  fileBindings,publicRequestCountBefore:before.length,publicRequestCountAfter:after.length,newRealConstructions:0,newSearches:0,publicClaimsStarted:0,
  privateStockConstructions:3,privateGateColourCalls:1,actualPrefixReplays:4,formalReady:false});
});
