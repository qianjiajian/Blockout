import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {absoluteCells,boardCells} from '../formal-v3/diversity-layout-factory.mjs';
import {auditPlainForwardDrag} from '../formal-v3/reverse-route-audit.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {EARLY_CONSTRUCTION_VERSION,EARLY_EXPERIMENT_ID,RECIPES,STATIC_SLOT,UPPER_BUDGET,LOWER_BUDGET,MATH_ENTRY,MATH_REVIEW,
 assertEarlyConstructionPlan,captureEarlyPrefixHistory,physicalRetry} from './early-prefix-four-contract.mjs';
import {readBound,readFile,write,sha,exists,checkBindings,mergeBindings,PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER} from './native-batch-io.mjs';
import {EARLY_CONSTRUCTION_LEDGER as OLD_EARLY_LEDGER} from './early-frozen-construction-contract.mjs';
const own='tools/daily-challenge/formal-v4/prepare-early-prefix-four.mjs';
const levelLike=x=>x&&Number.isSafeInteger(x.width)&&Number.isSafeInteger(x.height)&&Array.isArray(x.blocks)&&Array.isArray(x.gates);

/** Collect each formed stock image, including failed placeholders and plain
 * objects rejected after icing. This never converts a snapshot into a bound. */
export function formedStockImages(q){
 const possible=[q.level,q.placeholderWorld,q.plain?.level,q.built?.level,q.built?.placeholderWorld,q.built?.plain?.level,
  q.constructionTemplateLevel,q.templateLevel,q.constructionTemplatePacket?.level,q.input?.level];
 const seen=new Set();return possible.filter(levelLike).filter(l=>{const h=levelSha256(l);if(seen.has(h))return false;seen.add(h);return true;});
}
export function makeEarlyPrefixBlueprint(runtime,q,r,fixed){
 assert.equal(levelSha256(q.level),r.referenceLevelSha256);assert.equal(routeSha256(q.drags),r.referenceRouteSha256);
 assert(q.accepted&&q.L>=31&&Number.isFinite(q.U));runtime.assertPlainProofDomain(q.level);
 const source=runtime.LEVELS.find(l=>l.id===fixed.sourceLevelId);assert(source);assert.equal(boardBaselineSha256(source),boardBaselineSha256(q.level));
 const canonical=runtime.replayRevisedRoute(q.level,q.drags),independent=independentReplay(runtime,q.level,q.drags);
 for(const a of [canonical,independent]){assert(a.valid&&a.complete&&!a.failed);assert.equal(a.nonClearingDrags,q.U);}
 assert.deepEqual(q.drags.slice(0,fixed.cut),r.prefixDrags);assert.deepEqual(q.level.gates,r.gatePolicy.preservedGates);
 const ids=new Set(r.region.bodyIds),changed=q.level.blocks.filter(b=>ids.has(b.id)),outside=q.level.blocks.filter(b=>!ids.has(b.id));
 assert.equal(ids.size,r.region.bodyIds.length);assert.deepEqual(changed,r.originalRegionBodies);assert.deepEqual(outside,r.fixedOutsideBodies);
 assert(r.prefixDrags.every(d=>outside.some(b=>b.id===d.blockId)),'Region touched before prefix ends');
 const cells=changed.flatMap(absoluteCells),points=new Set(cells.map(p=>p.join(','))),pending=[cells[0]],seen=new Set();
 assert.equal(points.size,cells.length);while(pending.length){const p=pending.pop(),key=p.join(',');if(seen.has(key))continue;seen.add(key);
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const next=[p[0]+dx,p[1]+dy];if(points.has(next.join(','))&&!seen.has(next.join(',')))pending.push(next);}}
 assert.equal(seen.size,cells.length);assert(cells.length/boardCells(q.level).length>=.35);assert.deepEqual([...points].sort(),r.region.cells.map(p=>p.join(',')).sort());
 let partial=structuredClone(q.level);const prefixAudits=[];
 for(const drag of r.prefixDrags){const a=auditPlainForwardDrag(runtime,partial,drag);assert(a.valid,a.error);prefixAudits.push(a);
  if(drag.exitSide)partial.blocks=partial.blocks.filter(b=>b.id!==drag.blockId);else if(drag.path.length){const b=partial.blocks.find(b=>b.id===drag.blockId);[b.x,b.y]=drag.path.at(-1);}}
 assert.equal(r.prefixDrags.filter(d=>d.exitSide).length,fixed.iceCount);
 return{...fixed,reference:r.reference,referenceLevelSha256:r.referenceLevelSha256,referenceRouteSha256:r.referenceRouteSha256,
  level:q.level,fixedBlocks:outside,changedBodies:changed,region:r.region,prefixDrags:r.prefixDrags,prefixFacts:r.prefixFacts,
  allReferenceGates:q.level.gates,failedParent:r.failedParent,referenceQualification:{canonical,independent,prefixAudits,searches:0}};
}

/** Metadata-only. Run only once current low32 mathematics has a terminal
 * independent review; no caller may freeze a plan against an ongoing ledger. */
export async function prepareEarlyPrefixFour({proposal:proposalDescriptor,constructorQualification,lowBandActualReview},outputDirectory){
 assert(!(await exists(outputDirectory)));const bindings={},bound=d=>readBound(d,bindings);
 const p=await bound(proposalDescriptor);assert.equal(p.experimentId,EARLY_EXPERIMENT_ID);assert.equal(p.executable,false);
 assert.equal(p.newConstructions,0);assert.equal(p.newSearches,0);assert.deepEqual(p.recipes.map(r=>r.fixed),RECIPES);
 const qual=await bound(constructorQualification);assert.equal(qual.status,'INDEPENDENT_EARLY_PREFIX_FOUR_PRIVATE_PASS');assert.deepEqual(qual.errors,[]);
 for(const k of ['newRealConstructions','newSearches','newPublicClaims'])assert.equal(qual[k],0);mergeBindings(bindings,qual.fileBindings);await checkBindings(qual.fileBindings);
 const math=await bound(MATH_REVIEW);assert.equal(math.status,'INDEPENDENT_EARLY_FROZEN_PREFIX_TAIL_PASS');assert.deepEqual(math.errors,[]);
 assert.equal(math.toolBindings[MATH_ENTRY.path],MATH_ENTRY.sha256);mergeBindings(bindings,math.fileBindings);await checkBindings(math.fileBindings);
 const previousReview=await bound(p.previousEarlyActualReview);assert.equal(previousReview.status,'INDEPENDENT_EARLY_FROZEN_ACTUAL_PASS');assert.equal(previousReview.verified,4);assert.equal(previousReview.accepted,0);assert.deepEqual(previousReview.errors,[]);
 mergeBindings(bindings,previousReview.fileBindings);await checkBindings(previousReview.fileBindings);
 const lowReview=await bound(lowBandActualReview);assert.equal(lowReview.status,'INDEPENDENT_PREFIX_TAIL_ACTUAL_BATCH_PASS');assert.deepEqual(lowReview.errors,[]);assert.equal(lowReview.newSearches,0);assert.equal(lowReview.newLedgerClaims,0);
 mergeBindings(bindings,lowReview.fileBindings);await checkBindings(lowReview.fileBindings);
 const lowCompletion=await bound(lowReview.completion),lowIndex=await bound(p.lowBandConstructionIndex);
 assert.deepEqual(lowCompletion.descriptors.index,p.lowBandConstructionIndex);assert.equal(lowCompletion.results.length,lowIndex.candidates.length);
 const inherited=await bound(p.inheritedPlan),selectedIndex=await bound(p.selectedIndex);assert.equal(selectedIndex.files.length,150);assert.deepEqual(selectedIndex.files,inherited.selected.map(d=>d.path));
 for(const d of [...inherited.selected,...inherited.old450,...inherited.previousMacro,...inherited.comparisonOnly])await bound(d);
 const runtime=await loadV4Runtime(),environment=prefixExecutionEnvironment(runtime);mergeBindings(bindings,environment.bindings,runtime.toolchainBindings);
 const publicStocks=[],requests=[];for(const name of (await fs.readdir(PUBLIC_LEDGER)).filter(n=>n.endsWith('.request.json')).sort()){
  const file=path.join(PUBLIC_LEDGER,name),q=await readFile(file,bindings);requests.push(q);publicStocks.push({path:file,sha256:bindings[file],id:q.id,
   shapeSha256:q.shapeSha256,colorSha256:q.colorSha256,designSha256:q.designSha256??q.id,retryIdentitySha256:q.retryIdentitySha256??physicalRetry(q)});}
 const blueprints=[];for(const r of p.recipes){
  const failed=await bound(r.failedParent.candidate),req=await bound(r.failedParent.request),res=await bound(r.failedParent.result);
  assert.equal(failed.accepted,false);assert.deepEqual(req,failed.attempt);assert.equal(req.id,r.failedParent.attemptId);assert.equal(res.accepted,false);assert.equal(res.status,failed.status);
  assert.equal(res.levelSha256,failed.levelSha256);assert.equal(failed.levelSha256,levelSha256(failed.level));assert.deepEqual(res.lower,failed.lowerBound.result);assert.deepEqual(res.upper,failed.route?.search);
  for(const d of [r.failedParent.blocked,r.failedParent.identityBlocked])assert.equal((await bound(d)).attemptId,req.id);
  assert.deepEqual(designFingerprints(failed.level),r.failedParent.fingerprints);
  for(const child of requests.filter(q=>q.redesignOf===req.id)){const childResult=await readFile(`${PUBLIC_LEDGER}/${child.id}.result.json`,bindings);assert.notEqual(childResult.accepted,false,'Declared parent has a newer failed child');}
  const bp=makeEarlyPrefixBlueprint(runtime,await bound(r.reference),r,r.fixed);
  bp.currentSourceBinding=await currentMainlineSourceBinding(runtime,environment,bp.sourceLevelId,{qualificationOnly:false});mergeBindings(bindings,bp.currentSourceBinding.bindings);blueprints.push(bp);
 }
 const ledgerSnapshot=await captureEarlyPrefixHistory(bindings),previousLateStocks=[],seenStocks=new Set();
 const add=(level,d,q={})=>{const h=levelSha256(level);if(seenStocks.has(h))return;seenStocks.add(h);previousLateStocks.push({...d,level,sourceLevelId:q.sourceLevelId??level.id,
  reference:q.plain?.provenance?.reference??q.provenance?.reference??q.branchProvenance?.reference??q.reference??null});};
 for(const q of inherited.previousLateStocks)add(q.level,{path:q.path,sha256:q.sha256},q);
 // All currently stored public/constructor images are read, not only eligible
 // candidates. Partial/corrupt JSON rejects preparation rather than passing.
 for(const root of ledgerSnapshot.roots)for(const d of root.files){const q=await bound(d);for(const level of formedStockImages(q))add(level,d,q);
  if(d.path.endsWith('.claim.json')&&q.outputDirectory){const resultPath=d.path.replace(/\.claim\.json$/,'.result.json');
   if([LATE_PREFIX_CONSTRUCTION_LEDGER,OLD_EARLY_LEDGER].includes(root.directory))assert(await exists(resultPath),'Unfinished current shared constructor');
   if(await exists(resultPath)){const result=await readFile(resultPath,bindings);for(const f of result.constructionFiles??[]){const stock=await bound(f);for(const level of formedStockImages(stock))add(level,f,stock);}}}
 }
 // The low32 index and all construction files are explicit inputs even when
 // a constructor's result schema predates the common constructionFiles list.
 for(const a of lowIndex.attempts){const q=await bound(a.constructionEvidence);for(const level of formedStockImages(q))add(level,a.constructionEvidence,q);}
 const tools=[own,'tools/daily-challenge/formal-v4/construct-early-prefix-four.mjs','tools/daily-challenge/formal-v4/run-early-prefix-four.mjs'];
 const compiled=await build({entryPoints:tools,bundle:true,packages:'external',write:false,outdir:'unused',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const f of Object.keys(compiled.metafile.inputs))mergeBindings(bindings,{[f.replaceAll('\\','/')]:sha(await fs.readFile(f))});
 const plan={schemaVersion:4,version:EARLY_CONSTRUCTION_VERSION,status:'FIXED_EARLY_PREFIX_PLAN_NOT_EXECUTED',experimentId:EARLY_EXPERIMENT_ID,proposal:proposalDescriptor,qualificationOnly:false,
  constructorQualification,mathEntry:MATH_ENTRY,mathEntryQualification:MATH_REVIEW,lowBandActualReview,previousEarlyActualReview:p.previousEarlyActualReview,
  selectedIndex:p.selectedIndex,selectedCount:150,selected:inherited.selected,old450:inherited.old450,previousMacro:inherited.previousMacro,comparisonOnly:inherited.comparisonOnly,
  previousLateStocks,publicStocks,ledgerSnapshot,blueprints,sequence:{step:3571,bodyCountDeltas:[-2,-1,1,2,3,0]},
  maximumStocksEnteringColourCspIncludingFailed:4,maximumStaticPartitionAttempts:2000,closedMacroHistory:{actualInputs:58,extended:false},previousEarlyExperiment:{actualInputs:4,continued:false},
  accountingScope:'per-physical-stock',futureStrategy:'one-thawed-prefix-plain-tail-original-ice-lower',futureUpperBudget:UPPER_BUDGET,futureLowerBudget:LOWER_BUDGET,
  staticSlot:STATIC_SLOT,similarity:p.similarity,executionEnvironment:environment,bindings,publicRequestCount:publicStocks.length,slotAssigned:false,gameplaySearches:0,publicClaimsStarted:0,formalReady:false};
 assertEarlyConstructionPlan(plan);await checkBindings(bindings);await fs.mkdir(outputDirectory,{recursive:false});await write(`${outputDirectory}/plan.json`,plan);
 return{path:`${outputDirectory}/plan.json`,sha256:sha(await fs.readFile(`${outputDirectory}/plan.json`))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const[c,h,out]=process.argv.slice(2);assert(c&&h&&out);console.log(JSON.stringify(await prepareEarlyPrefixFour(await readBound({path:c,sha256:h}),out)));}
