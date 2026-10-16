import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {EARLY_CONSTRUCTION_VERSION,EARLY_EXPERIMENT_ID,EARLY_PROPOSAL,assertEarlyConstructionPlan,physicalRetry} from './early-frozen-construction-contract.mjs';
import {readBound,readFile,sha,write,exists,mergeBindings,checkBindings,captureLedgerSnapshot,PUBLIC_LEDGER} from './native-batch-io.mjs';
const own='tools/daily-challenge/formal-v4/prepare-early-frozen-four-plan.mjs';

/** Read-only preparation: bind the two fixed recipes and all current history.
 * This does not reserve a constructor label, form new stock or call a solver. */
export async function prepareEarlyFrozenFourPlan(outputDirectory,constructorQualification){
 assert(!(await exists(outputDirectory)),'Fresh preparation output required');const bindings={};
 const proposal=await readBound(EARLY_PROPOSAL,bindings),inherited=await readBound(proposal.inheritedPlan,bindings);
 assert.equal(proposal.executable,false);assert.equal(proposal.experiment.actualInputs,0);assert.equal(proposal.experiment.oldMacroHistory.actualInputs,58);
 const qualification=await readBound(constructorQualification,bindings);
 assert.equal(qualification.status,'INDEPENDENT_EARLY_FROZEN_CONSTRUCTOR_PRIVATE_PASS');assert.deepEqual(qualification.errors,[]);
 for(const key of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(qualification[key],0);
 mergeBindings(bindings,inherited.bindings,proposal.fileBindings,qualification.fileBindings);await checkBindings(bindings);
 const entry=await readBound(proposal.mathEntryQualification,bindings);assert.equal(entry.status,'ROOT_EARLY_FROZEN_ICE_ENTRY_REVIEW_PASS');
 const runtime=await loadV4Runtime(),environment=prefixExecutionEnvironment(runtime);
 const selectedIndex=await readBound(proposal.selectedIndex,bindings);assert.equal(selectedIndex.files.length,150);
 assert.deepEqual(selectedIndex.files,inherited.selected.map(x=>x.path));
 const blueprints=[];
 for(const r of proposal.recipes){
  const q=await readBound(r.reference,bindings);assert.equal(levelSha256(q.level),r.referenceLevelSha256);assert.equal(routeSha256(q.drags),r.referenceRouteSha256);
  assert.deepEqual(q.drags.slice(0,r.cut),r.prefixDrags);assert.deepEqual(q.level.gates,r.gatePolicy.preservedGates);
  const ids=new Set(r.region.bodyIds);assert.deepEqual(q.level.blocks.filter(b=>ids.has(b.id)),r.originalRegionBodies);
  assert.deepEqual(q.level.blocks.filter(b=>!ids.has(b.id)),r.fixedOutsideBodies);
  const failed=await readBound(r.failedParent.candidate,bindings),request=await readBound(r.failedParent.request,bindings),result=await readBound(r.failedParent.result,bindings);
  assert.equal(failed.accepted,false);assert.equal(failed.attempt.id,r.failedParent.attemptId);assert.deepEqual(request,failed.attempt);assert.equal(result.accepted,false);
  assert.equal(result.levelSha256,failed.levelSha256);assert.equal(result.status,failed.status);
  for(const d of [r.failedParent.blocked,r.failedParent.identityBlocked])assert.equal((await readBound(d,bindings)).attemptId,r.failedParent.attemptId);
  assert.deepEqual(designFingerprints(failed.level),r.failedParent.fingerprints);
  blueprints.push({recipeId:r.recipeId,maximumStocks:2,sourceLevelId:r.sourceLevelId,cut:r.cut,iceCount:r.iceDeclaration.initialCount,
   reference:r.reference,referenceLevelSha256:r.referenceLevelSha256,referenceRouteSha256:r.referenceRouteSha256,level:q.level,
   fixedBlocks:r.fixedOutsideBodies,changedBodies:r.originalRegionBodies,region:r.region,prefixDrags:r.prefixDrags,prefixFacts:r.prefixFacts,
   allReferenceGates:r.gatePolicy.preservedGates,failedParent:r.failedParent});
 }
 const previousLateStocks=[...inherited.previousLateStocks],previousIndex=await readBound(proposal.previousConstructionIndex,bindings);
 for(const a of previousIndex.attempts){const q=await readBound(a.constructionEvidence,bindings);if(q.placeholderWorld)previousLateStocks.push({path:a.constructionEvidence.path,sha256:a.constructionEvidence.sha256,level:q.placeholderWorld});}
 const publicStocks=[];for(const name of (await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort()){
  const file=path.join(PUBLIC_LEDGER,name),q=await readFile(file,bindings);publicStocks.push({path:file,sha256:bindings[file],id:q.id,
   shapeSha256:q.shapeSha256,colorSha256:q.colorSha256,designSha256:q.designSha256??q.id,retryIdentitySha256:q.retryIdentitySha256??physicalRetry(q)});
 }
 const ledgerSnapshot=await captureLedgerSnapshot(bindings);
 const tools=[own,'tools/daily-challenge/formal-v4/construct-early-frozen-four.mjs','tools/daily-challenge/formal-v4/run-early-frozen-four.mjs'];
 for(const file of tools){const compiled=await build({entryPoints:[file],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  for(const f of Object.keys(compiled.metafile.inputs))mergeBindings(bindings,{[f.replaceAll('\\','/')]:sha(await fs.readFile(f))});}
 mergeBindings(bindings,runtime.toolchainBindings,environment.bindings,{[runtime.policyRuntimeBinding.path]:runtime.policyRuntimeBinding.sha256});
 const plan={schemaVersion:4,version:EARLY_CONSTRUCTION_VERSION,status:'FIXED_EARLY_FROZEN_PLAN_NOT_EXECUTED',experimentId:EARLY_EXPERIMENT_ID,
  proposal:EARLY_PROPOSAL,qualificationOnly:false,constructorQualification,mathEntryQualification:proposal.mathEntryQualification,
  selectedIndex:proposal.selectedIndex,selectedCount:150,selected:inherited.selected,old450:inherited.old450,
  previousMacro:inherited.previousMacro,comparisonOnly:inherited.comparisonOnly,previousLateStocks,publicStocks,ledgerSnapshot,
  blueprints,sequence:proposal.constructionPolicy.sequence,maximumStocksEnteringColourCspIncludingFailed:4,maximumStaticPartitionAttempts:2000,
  closedMacroHistory:{actualInputs:58,extended:false,completion:proposal.previousMathCompletion},accountingScope:'per-physical-stock',
  futureStrategy:'one-original-full-ice-joint',futureBudget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},
  staticSlot:{formalId:880000,stageKey:'basic-combined',difficulty:3},similarity:proposal.constructionPolicy.similarity,
  executionEnvironment:environment,bindings,publicRequestCount:publicStocks.length,gameplaySearches:0,publicClaimsStarted:0,formalReady:false};
 assertEarlyConstructionPlan(plan);await checkBindings(bindings);await fs.mkdir(outputDirectory,{recursive:false});await write(`${outputDirectory}/plan.json`,plan);
 return{path:`${outputDirectory}/plan.json`,sha256:sha(await fs.readFile(`${outputDirectory}/plan.json`))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[out,q,hash]=process.argv.slice(2);assert(out&&q&&hash);console.log(JSON.stringify(await prepareEarlyFrozenFourPlan(out,{path:q,sha256:hash})));}
