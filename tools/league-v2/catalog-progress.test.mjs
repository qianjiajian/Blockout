import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {loadLeagueProofRuntime,levelSha256} from './proof-contract.mjs';
import {inspectLeagueReceipt,inspectMechanismReceipt,leagueCatalogProgress} from './catalog-progress.mjs';
import {loadLeagueIceProofRuntime,ICE_CONTRACT_VERSION,ICE_LOWER_METHOD} from './proof-ice-contract.mjs';
import {ICE_PROOF_VERSION} from './proof-ice-bounded.mjs';

const runtime=await loadLeagueProofRuntime();
const early=JSON.parse(await fs.readFile('deliverables/league-v2-20261008/early/qualified.json','utf8'));
const row=early.rows.find(r=>r.index===3),report=JSON.parse(await fs.readFile(row.proofFile,'utf8'));
const source=runtime.LEVELS.find(l=>l.id===report.sourceLevelId),mechanism=JSON.parse(await fs.readFile(row.mechanismFile,'utf8'));
test('a real strict-budget early-super receipt is internally bound',()=>{
 assert.deepEqual(inspectLeagueReceipt(report,source,3),[]);
 assert.deepEqual(inspectMechanismReceipt(mechanism,report),[]);
});
test('rejects changed layout, source, route, score and exhausted lower evidence',()=>{
 const mutations=[
  r=>{r.level.blocks[0].color='not-a-color';},
  r=>{r.sourceLevelSha256='old-proof';},
  r=>{r.drags[0].blockId='other';},
  r=>{r.scoring.successPoints=999;},
  r=>{r.lowerBound.result.rawFullBoardStates=10001;},
  r=>{delete r.lowerBound.result.rawFullBoardStates;},
  r=>{r.lowerBound.result.status='unknown';r.lowerBound.result.termination='max-states';},
  r=>{r.L=22;},
  r=>{r.route.independentReplay.clearEvents+=1;},
 ];
 for(const mutate of mutations){const r=structuredClone(report);mutate(r);assert(inspectLeagueReceipt(r,source,3).length>0);}
});
test('empty or omitted runtime bindings cannot be repaired by rehashing the claimed map',()=>{
 for(const mutate of [
  r=>r.toolchainBindings={},
  r=>delete r.toolchainBindings['src/core/PuzzleModel.ts'],
  r=>delete r.toolchainBindings['tools/league-v2/proof-bounded.mjs'],
  r=>r.toolchainBindings['tools/league-v2/proof-contract.mjs']='not-a-sha',
 ]){
  const r=structuredClone(report);mutate(r);r.toolchainSha256=levelSha256(r.toolchainBindings);
  assert(inspectLeagueReceipt(r,source,3).some(e=>e.startsWith('missing-required-tool-binding:')));
 }
});
test('unknown methods, relabeled projections and zero/understated raw budgets are refused',()=>{
 const cases=[
  ['unsupported-lower-method',r=>r.lowerBound.method='unsupported-proof'],
  ['lower-method-projection-mismatch',r=>r.lowerBound.method='v3-static-bodies-constraint-erasure-v1'],
  ['raw-full-board-budget-not-certified',r=>{r.lowerBound.result.rawFullBoardStates=0;r.lowerBound.result.discoveredStates=0;r.lowerBound.result.exploredStates=0;}],
  ['lower-board-budget',r=>r.lowerBound.result.budget.maxStates=0],
  ['raw-full-board-budget-not-certified',r=>r.lowerBound.result.budget.maxStates=r.lowerBound.result.rawFullBoardStates-1],
  ['lower-board-budget',r=>r.lowerBound.result.budget.maxStates=10001],
  ['lower-board-budget',r=>r.lowerBound.result.exploredStates=r.lowerBound.result.discoveredStates+1],
 ];
 for(const[expected,mutate]of cases){const r=structuredClone(report);mutate(r);assert(inspectLeagueReceipt(r,source,3).includes(expected),expected);}
});
test('native ice is a distinct bound extension and rejects unsupported body mechanics',async()=>{
 // Schema qualification only: metadata copies stay in memory, never saved or
 // counted as a fresh native proof. Actual ice solver qualification is separate.
 const native=structuredClone(report),ice=await loadLeagueIceProofRuntime();
 native.lowerBound.method=ICE_LOWER_METHOD;native.lowerBound.result.contractVersion=ICE_PROOF_VERSION;
 native.proofExtension={version:ICE_CONTRACT_VERSION,primitiveVersion:ICE_PROOF_VERSION,domain:'ordinary-static-single-layer-bodies-and-gates-with-only-ice-counters',searchInvocations:1,projectionUsed:false};
 native.toolchainBindings=ice.toolchainBindings;native.toolchainSha256=ice.toolchainSha256;
 assert.deepEqual(inspectLeagueReceipt(native,source,3),[]);
 const missing=structuredClone(native);delete missing.proofExtension;assert(inspectLeagueReceipt(missing,source,3).includes('native-ice-extension-not-bound'));
 const noTools=structuredClone(native);delete noTools.toolchainBindings['tools/league-v2/proof-ice-bounded.mjs'];noTools.toolchainSha256=levelSha256(noTools.toolchainBindings);
 assert(inspectLeagueReceipt(noTools,source,3).some(e=>e.startsWith('missing-native-ice-tool-binding:')));
 const shell=structuredClone(native);shell.level.blocks[0].layers=[shell.level.blocks[0].color,'blue'];
 assert(inspectLeagueReceipt(shell,source,3).some(e=>e.startsWith('native-ice-unsupported-domain:')));
 const wrongPrimitive=structuredClone(native);wrongPrimitive.lowerBound.result.contractVersion='plain';assert(inspectLeagueReceipt(wrongPrimitive,source,3).includes('native-ice-lower-not-certified'));
});
const adaptationFile='deliverables/league-v2-20261008/mechanisms/proof-attempts/49e67afe317c8fa9fff8116af28de5189116042828f1047207b77dc107a26ef9.static-source-repair-v1.result.json';
const adapted=JSON.parse(await fs.readFile(adaptationFile,'utf8')),adaptedSource=runtime.LEVELS.find(l=>l.id===adapted.sourceLevelId);
test('exterior-cut receipt binds exact source/cut cells and its sole zero-search static correction',()=>{
 assert.deepEqual(inspectLeagueReceipt(adapted,adaptedSource,8),[]);
 for(const mutate of [
  r=>r.sourceAdaptation.cutCells=[[0,0]],
  r=>delete r.sourceAdaptation,
  r=>delete r.staticAudit.sourceAdaptation,
  r=>r.staticAudit.removedInheritedIssues.push('missing-art'),
  r=>r.staticSourceRepair.lowerSearchStates=1,
  r=>r.attempt.redesignOf='0'.repeat(64),
 ]){const r=structuredClone(adapted);mutate(r);assert(inspectLeagueReceipt(r,adaptedSource,8).some(e=>e.startsWith('source-')));}
 const without=structuredClone(adapted);delete without.toolchainBindings['tools/league-v2/proof-source-adaptation.mjs'];without.toolchainSha256=levelSha256(without.toolchainBindings);
 assert(inspectLeagueReceipt(without,adaptedSource,8).includes('missing-source-adaptation-tool-binding'));
});
test('source adaptation prior FAIL remains externally SHA-bound during catalog inspection',async t=>{
 const parent=path.resolve('deliverables/league-v2-20261008/proof/tests');await fs.mkdir(parent,{recursive:true});
 const directory=await fs.mkdtemp(path.join(parent,'catalog-source-repair-'));
 t.after(async()=>{const rel=path.relative(parent,directory);assert(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel));await fs.rm(directory,{recursive:true,force:true});});
 const corrupt=structuredClone(adapted);corrupt.staticSourceRepair.previousReceiptSha256='0'.repeat(64);corrupt.attempt.staticSourceRepair=structuredClone(corrupt.staticSourceRepair);
 const proofFile=path.join(directory,'corrupt-proof.json');await fs.writeFile(proofFile,JSON.stringify(corrupt));
 const result=await leagueCatalogProgress(runtime,[{index:8,proofFile}]);
 assert.equal(result.rows[7].status,'REJECTED_RECEIPT');assert(result.rows[7].errors.includes('source-static-repair-prior-file-sha'));assert.equal(result.formalReady,false);
});
test('mechanism evidence cannot transfer to another puzzle or call missing participation passed',()=>{
 const m=structuredClone(mechanism);m.level.blocks[0].x+=1;
 assert(inspectMechanismReceipt(m,report).includes('mechanism-input-not-bound'));
 m.level=structuredClone(mechanism.level);m.participation.passed=false;
 assert(inspectMechanismReceipt(m,report).includes('mechanism-structure-or-participation'));
});
test('partial or empty catalog never claims formal completion',async()=>{
 const empty=await leagueCatalogProgress(runtime,[]);assert.equal(empty.counts.PENDING_CANDIDATE,100);assert.equal(empty.formalReady,false);
 const result=await leagueCatalogProgress(runtime,[{index:3,proofFile:row.proofFile,mechanismFile:row.mechanismFile}]);
 assert.equal(result.rows.length,100);assert.equal(result.counts.PENDING_CANDIDATE,99);assert.equal(result.formalReady,false);
 assert.equal(result.diversity.status,'PARTIAL_NOT_FORMAL');
 await assert.rejects(()=>leagueCatalogProgress(runtime,[{index:3},{index:3}]),/duplicate/);
});
