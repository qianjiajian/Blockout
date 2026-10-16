import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {makeLateRegionBlueprint,constructLateRegionStock} from './late-region-factory.mjs';
import {auditV4StaticCandidate,loadV4StageContract} from './static-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {boardBaselineSha256} from '../formal-v2/geometry.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts} from '../formal-v3/diversity.mjs';
import {bodyFootprint} from '../formal-v3/diversity-layout-factory.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {claimLatePrefixPlan,finishLatePrefixPlan,LATE_PREFIX_CONSTRUCTION_LEDGER} from './late-prefix-plan-ledger.mjs';

const ROOT='deliverables/daily-formal-v3-20261008',V4='deliverables/daily-formal-v4-20261008';
const own='tools/daily-challenge/formal-v4/design-late-prefix-pool.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const references=[`${ROOT}/design/hard-region-02/candidate-0015.json`,`${ROOT}/design/nearband14-pilot/candidate-0017.json`];
const selectedDescriptor={path:`${V4}/selection/capacity13-02/index.json`,sha256:'0b961626791253574cff19aa08ce99de2e9acc6f176327b7702e04b45aeee583'};
const oldIndex='deliverables/daily-formal-v2-20261007/final-qualified/index.json';
const write=async(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const exists=async file=>fs.stat(file).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const stock=l=>levelSha256(l.blocks.map(bodyFootprint).sort());
const retry=f=>levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256});
const changed=(a,b)=>{
 const shared=b.colorAssignments.filter(x=>a.colorAssignments.some(y=>x.id===y.id));
 const colours=shared.length?shared.some(x=>a.colorAssignments.some(y=>x.id===y.id&&JSON.stringify(x.colors)!==JSON.stringify(y.colors))):
  levelSha256(a.colorAssignments.map(x=>x.colors).sort())!==levelSha256(b.colorAssignments.map(x=>x.colors).sort());
 return a.shapeSha256!==b.shapeSha256&&a.colorSha256!==b.colorSha256&&colours;
};

async function filesWithin(directory){
 const files=[];if(!await exists(directory))return files;
 for(const e of await fs.readdir(directory,{withFileTypes:true})){
  const file=path.join(directory,e.name).replaceAll('\\','/');
  if(e.isDirectory()&&!e.isSymbolicLink())files.push(...await filesWithin(file));
  else if(e.isFile()&&/^(candidate|input)-.*\.json$/.test(e.name))files.push(file);
 }return files;
}
async function readBound(descriptor,bindings){
 const file=typeof descriptor==='string'?descriptor:descriptor.path,bytes=await fs.readFile(file),digest=sha(bytes);
 if(typeof descriptor!=='string')assert.equal(digest,descriptor.sha256,`Bound bytes changed: ${file}`);
 if(bindings)bindings[file]=digest;return JSON.parse(bytes);
}
async function assertBindings(bindings){for(const [file,digest]of Object.entries(bindings))assert.equal(sha(await fs.readFile(file)),digest,`Fixed plan changed: ${file}`);}

/** Read-only old references and indices; this writes only a fixed future plan.
 * It does not construct new geometry, claim identities, or invoke a solver. */
export async function prepareLatePrefixPlan(outputDirectory){
 assert(outputDirectory&&!(await exists(outputDirectory)),'Fresh independent plan directory required');
 const runtime=await loadV4Runtime(),environment=prefixExecutionEnvironment(runtime),bindings={...environment.bindings,...runtime.toolchainBindings};
 const selectedIndex=await readBound(selectedDescriptor,bindings);assert.equal(selectedIndex.scope,300);assert.equal(selectedIndex.files.length,138);
 const selected=[];for(const file of selectedIndex.files){const q=await readBound(file,bindings);assert(q.accepted);assert.equal(q.levelSha256,levelSha256(q.level));selected.push({path:file,sha256:bindings[file],levelSha256:q.levelSha256});}
 const previous450=await readBound(oldIndex,bindings),old450=[];assert.equal(previous450.entries.length,450);
 for(const e of previous450.entries){const q=await readBound(e.path,bindings);assert.equal(q.levelSha256,levelSha256(q.level));old450.push({path:e.path,sha256:bindings[e.path]});}
 const previousMacro=[];for(const base of [`${ROOT}/design`,`${V4}/design`])for(const e of await fs.readdir(base,{withFileTypes:true})){
  if(!e.isDirectory()||!e.name.startsWith('macro-'))continue;
  for(const file of await filesWithin(`${base}/${e.name}`)){const q=await readBound(file,bindings);if(q.level?.blocks&&q.level?.gates)previousMacro.push({path:file,sha256:bindings[file],sourceLevelId:q.sourceLevelId??q.level.id});}
 }
 const previousLateStocks=[];
 if(await exists(LATE_PREFIX_CONSTRUCTION_LEDGER))for(const name of await fs.readdir(LATE_PREFIX_CONSTRUCTION_LEDGER))if(name.endsWith('.claim.json')){
  const claim=await readBound(`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${name}`,bindings);assert.equal(claim.qualificationOnly,false);
  const resultFile=`${LATE_PREFIX_CONSTRUCTION_LEDGER}/${name.replace('.claim.json','.result.json')}`;
  assert(await exists(resultFile),'An earlier construction plan is still pending; no new plan can bypass it');await readBound(resultFile,bindings);
  if(await exists(claim.outputDirectory))for(const fileName of await fs.readdir(claim.outputDirectory))if(/^construction-.*\.json$/.test(fileName)){
   const file=path.join(claim.outputDirectory,fileName),q=await readBound(file,bindings);
   if(q.placeholderWorld){assert.equal(designFingerprints(q.placeholderWorld).shapeSha256,q.stockFingerprints.shapeSha256);
    previousLateStocks.push({path:file,sha256:bindings[file],shapeSha256:q.stockFingerprints.shapeSha256,level:q.level??q.placeholderWorld});}
  }
 }
 const sealedFailures=[];
 for(const directory of ['macro-prefix-half300-joint-01','macro-prefix-half300-joint-02']){
  const completion=await readBound(`${V4}/design/${directory}/completion.json`,bindings);
  for(const row of completion.results){const q=await readBound(row.file,bindings);assert.equal(q.accepted,false);assert(q.attempt?.id);assert.equal(q.L,null);assert.equal(q.U,null);
   const requestFile=`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.request.json`,resultFile=`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.result.json`;
   const request=await readBound(requestFile,bindings),result=await readBound(resultFile,bindings);assert.deepEqual(request,q.attempt);assert.equal(result.accepted,false);
   assert(await exists(`${PUBLIC_ATTEMPT_LEDGER}/identities/${request.retryIdentitySha256}.blocked.json`));
   sealedFailures.push({id:q.attempt.id,path:row.file,sha256:bindings[row.file],sourceLevelId:q.sourceLevelId,fingerprints:designFingerprints(q.level)});
  }
 }assert.equal(sealedFailures.length,12);
 const previousScope=await readBound(`${ROOT}/design/macro-prefix64-04/scope156/completion-audit.json`,bindings);assert.equal(previousScope.actualInputs,1);
 const sourceBranchHistory=await readBound(`${ROOT}/design/macro-prefix64-04/scope156/preview-1/report.json`,bindings),failedParents=[];
 for(const row of sourceBranchHistory.latestFailedBySource.filter(x=>[100,18].includes(x.source))){
  const q=await readBound({path:row.file,sha256:row.sha256},bindings);
  const request=await readBound({path:row.requestFile,sha256:row.requestSha256},bindings),result=await readBound({path:row.resultFile,sha256:row.resultSha256},bindings);
  assert.deepEqual(request,q.attempt);assert.equal(request.id,row.id);assert.equal(result.accepted,false);
  assert(await exists(`${PUBLIC_ATTEMPT_LEDGER}/identities/${request.retryIdentitySha256}.blocked.json`));
  failedParents.push({...row,fingerprints:designFingerprints(q.level)});
 }assert.equal(failedParents.length,2);
 const blueprints=[];
 for(const file of references){const q=await readBound(file,bindings),descriptor={path:file,sha256:bindings[file]};
  assert(q.attempt?.id,'Accepted reference public identity required');
  const request=await readBound(`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.request.json`,bindings),result=await readBound(`${PUBLIC_ATTEMPT_LEDGER}/${q.attempt.id}.result.json`,bindings);
  assert.deepEqual(request,q.attempt);assert.equal(request.levelSha256,q.levelSha256);assert.equal(result.accepted,true);
  const blueprint=makeLateRegionBlueprint(runtime,q,descriptor),source=runtime.LEVELS.find(l=>l.id===blueprint.sourceLevelId);
  assert.equal(boardBaselineSha256(source),boardBaselineSha256(q.level));
  const current=await currentMainlineSourceBinding(runtime,environment,source.id);Object.assign(bindings,current.bindings);
  blueprints.push({...blueprint,currentSourceBinding:current});
 }
 const stage=await loadV4StageContract();Object.assign(bindings,stage.bindings);
 const externalSlot=stage.DAILY_CHALLENGE_V3_SLOTS.find(s=>s.stageKey==='basic-combined'&&s.difficulty===3);
 assert(externalSlot);const staticSlot={formalId:externalSlot.id,stageKey:externalSlot.stageKey,difficulty:3,slot:externalSlot.slot,newestMechanism:null};
 const compiled=await build({entryPoints:[own,'tools/daily-challenge/formal-v4/prefix-tail-explore.mjs'],bundle:true,write:false,outdir:'unused-esbuild-output',metafile:true,packages:'external',platform:'node',format:'esm',logLevel:'silent'});
 for(const file of Object.keys(compiled.metafile.inputs))bindings[file.replaceAll('\\','/')]=sha(await fs.readFile(file));
 const plan={schemaVersion:4,scope:300,status:'FIXED_STATIC_PLAN_AWAITING_ROOT_RUN',version:'late-prefix-new-stock-eight-v1',
  mathematicalToolchainSha256:runtime.toolchainSha256,policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  executionEnvironment:environment,currentRuntimeValidationClaimed:false,selectedIndex:selectedDescriptor,selected,old450,previousMacro,previousLateStocks,sealedFailures,failedParents,
  blueprints,maximumFinalColourInputsIncludingRejected:8,maximumStocksEnteringColourCspIncludingFailed:8,maximumPerSource:4,maximumStaticPartitionAttempts:2000,
  previousMacro64ActualInputs:13,combinedMaximumInputs:64,maximumAfterThisBatch:21,
  geometry:{minimumConnectedChangedFraction:.35,oldRegionBodiesMinimum:5,exactExternalBodyFieldsRetained:true,oldRegionFootprintsForbidden:true,originalOrientationOnly:true},
  similarity:{reference:.65,selectedPreFilter:.65,priorMacro:.65,source:.55,old450:.75},
  staticPartitionBudget:{maxNodes:4000,maxTransitions:8000},
  colourBudget:{maxNodes:3000,maxTransitions:6000,maxMicroStates:100000,maxMicroTransitions:400000,maxMilliseconds:2000},
  sequence:{baseSeed:809311703,step:7919,sourceFactor:101,bodyCountDeltas:[0,1,2,-1,3,-2]},
  futureUpperBudget:{maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},
  futureLowerBudget:{maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxDragStates:10000,maxMilliseconds:30000},
  futureStrategy:{upper:'same-full-input-claim-before-one-fixed-prefix-plus-one-tail',tailSearchUpper:128,originalLowerFloor:31,
   fullUpperSearchAfterTailFailure:false,lowerOnlyAfterActualCompleteOriginalU:true,maximumTailCalls:1,maximumOriginalLowerCalls:1},
  staticSlot,staticSlotIsOnlyAValidationEnvelope:true,slotAssigned:false,candidatePoolOnly:true,mathematicalSuccessIsNotFormalSlotAcceptance:true,
  basicFirstThreeThenAdvancedDesignMayUseRemainingIndependentSuccesses:true,actualNewCandidateConstructionCalls:0,actualNewSearches:0,
  sourceReferenceReuse:'New connected macro reconstruction; not a small local family. Final visual/admission review still required.',
  bindings,formalReady:false};
 await fs.mkdir(outputDirectory,{recursive:true});
 await write(`${outputDirectory}/plan.json`,plan);
 await fs.mkdir(`${outputDirectory}/tool-snapshot`);
 for(const [file,digest]of Object.entries(bindings))if(file.startsWith('tools/')){
  await fs.copyFile(file,`${outputDirectory}/tool-snapshot/${file.replaceAll('/','__')}.snapshot`);assert.equal(sha(await fs.readFile(file)),digest);}
 return{path:`${outputDirectory}/plan.json`,sha256:sha(await fs.readFile(`${outputDirectory}/plan.json`)),references:blueprints.map(b=>({source:b.sourceLevelId,region:b.region,prefix:b.prefixFacts})),newSearches:0,newConstructions:0};
}

/** Produce up to eight new complete colour inputs. A static rejection never
 * gets a second colour pass; every instantiated placeholder and colour branch
 * is retained. No gameplay/model/claim calls occur in this constructor driver. */
export async function constructLatePrefixPlan(planDescriptor,outputDirectory){
 assert(planDescriptor?.path&&/^[a-f0-9]{64}$/.test(planDescriptor.sha256??''),'Fixed plan descriptor with SHA required');
 assert(!(await exists(outputDirectory)),'Never restart a partial or complete static construction batch');
 const plan=await readBound(planDescriptor);assert.equal(plan.version,'late-prefix-new-stock-eight-v1');assert.equal(plan.maximumFinalColourInputsIncludingRejected,8);
 assert.equal(plan.maximumStaticPartitionAttempts,2000);assert.equal(plan.maximumPerSource,4);assert.equal(plan.previousMacro64ActualInputs,13);
 await assertBindings(plan.bindings);const runtime=await loadV4Runtime();assert.deepEqual(prefixExecutionEnvironment(runtime,plan.executionEnvironment.descriptor),plan.executionEnvironment);
 const selected=await Promise.all(plan.selected.map(d=>readBound(d))),old450=await Promise.all(plan.old450.map(d=>readBound(d)));
 const previousMacro=[...await Promise.all(plan.previousMacro.map(async d=>({path:d.path,...await readBound(d)}))),...plan.previousLateStocks];
 const forbiddenShapes=new Set([...plan.sealedFailures.map(x=>x.fingerprints.shapeSha256),...plan.failedParents.map(x=>x.fingerprints.shapeSha256),...previousMacro.map(q=>designFingerprints(q.level).shapeSha256)]);
 const seenPartitions=new Set(previousMacro.map(q=>stock(q.level))),perSource=new Map(),previousFullBySource=new Map(),inputs=[],eligible=[],attempts=[],rejections={};
 const reject=(a,reason)=>{a.rejection=reason;rejections[reason]=(rejections[reason]??0)+1;};
 const executionClaim=await claimLatePrefixPlan(planDescriptor,outputDirectory);let completionStatus='CONSTRUCTION_INTERRUPTED_OR_FAILED',failureReason=null;
 try{
 await fs.mkdir(outputDirectory,{recursive:true});await write(`${outputDirectory}/execution-start.json`,{plan:planDescriptor,executionClaim,executionEnvironment:plan.executionEnvironment,startedAt:new Date().toISOString(),formalReady:false});
 for(let index=0;index<plan.maximumStaticPartitionAttempts&&inputs.length<8;index++){
  if(plan.blueprints.every(b=>(perSource.get(b.sourceLevelId)??0)>=4))break;
  const blueprint=plan.blueprints[index%plan.blueprints.length];if((perSource.get(blueprint.sourceLevelId)??0)>=4)continue;
  const seed=plan.sequence.baseSeed+index*plan.sequence.step+blueprint.sourceLevelId*plan.sequence.sourceFactor;
  const geometryFilter=level=>{
   const nearest=rows=>rows.reduce((best,q)=>Math.max(best,compareLayouts(level,q.level).footprintSimilarity),0);
   const source=runtime.LEVELS.find(l=>l.id===blueprint.sourceLevelId);
   const similarity={reference:compareLayouts(level,blueprint.level).footprintSimilarity,source:compareLayouts(level,source).footprintSimilarity,
    selected:nearest(selected),priorMacro:nearest(previousMacro),old450:nearest(old450),newBatch:nearest(eligible)};
   return{similarity,passed:!Object.entries(similarity).some(([key,value])=>value>(key==='source'?.55:key==='old450'?.75:.65)+1e-12),gameplaySearches:0};
  };
  const options={seed,colourSeed:seed,bodyCountDelta:plan.sequence.bodyCountDeltas[Math.floor(index/plan.blueprints.length)%plan.sequence.bodyCountDeltas.length],forbiddenShapeHashes:[...forbiddenShapes],geometryFilter};
  const built=constructLateRegionStock(runtime,blueprint,options),a={index,sourceLevelId:blueprint.sourceLevelId,seed,bodyCountDelta:options.bodyCountDelta,status:built.status};
  if(built.stockFingerprints)forbiddenShapes.add(built.stockFingerprints.shapeSha256);
  const constructionFile=`${outputDirectory}/construction-${String(index).padStart(4,'0')}.json`;
  await write(constructionFile,{...built,plan:planDescriptor,options:{...options,forbiddenShapeHashes:undefined,geometryFilter:undefined},executionEnvironment:plan.executionEnvironment,currentRuntimeValidationClaimed:false,qualificationOnly:false});
  a.constructionEvidence={path:constructionFile,sha256:sha(await fs.readFile(constructionFile))};attempts.push(a);
  if(built.paint){perSource.set(blueprint.sourceLevelId,(perSource.get(blueprint.sourceLevelId)??0)+1);inputs.push(a);}
  if(!built.ok){reject(a,built.status+':'+(built.paint?.reason??built.partition?.reason??''));continue;}
  assert(built.paint,'Every successful colour stock consumes its single CSP quota');
  const level=built.level,f=designFingerprints(level),previous=previousFullBySource.get(blueprint.sourceLevelId)??[],failedParent=plan.failedParents.find(p=>p.source===blueprint.sourceLevelId);
  previousFullBySource.set(blueprint.sourceLevelId,[...previous,f]);
  if(previous.some(p=>!changed(p,f))||!changed(failedParent.fingerprints,f)){reject(a,'shape-and-actual-colour-not-both-changed-from-prior-source-input');continue;}
  if(plan.sealedFailures.some(row=>row.fingerprints.shapeSha256===f.shapeSha256||row.fingerprints.colorSha256===f.colorSha256)){reject(a,'old-sealed-shape-or-colour-stock');continue;}
  const partition=stock(level);if(seenPartitions.has(partition)){reject(a,'existing-physical-partition');continue;}seenPartitions.add(partition);
  if(await exists(`${PUBLIC_ATTEMPT_LEDGER}/identities/${retry(f)}.json`)||await exists(`${PUBLIC_ATTEMPT_LEDGER}/${f.designSha256}.request.json`)){reject(a,'public-identity-already-attempted');continue;}
  const source=runtime.LEVELS.find(l=>l.id===built.sourceLevelId);assert.equal(boardBaselineSha256(source),boardBaselineSha256(level));
  const nearest=(rows)=>rows.reduce((best,q)=>Math.max(best,compareLayouts(level,q.level).footprintSimilarity),0);
  const similarity={reference:compareLayouts(level,blueprint.level).footprintSimilarity,source:compareLayouts(level,source).footprintSimilarity,
   selected:nearest(selected),priorMacro:nearest(previousMacro),old450:nearest(old450),newBatch:nearest(eligible)};
  a.similarity=similarity;
  if(Object.entries(similarity).some(([key,value])=>value>((key==='source')?.55:key==='old450'?.75:.65)+1e-12)){reject(a,'pairwise-layout-diversity');continue;}
  const staticAudit=await auditV4StaticCandidate(runtime,{...plan.staticSlot,sourceLevelId:built.sourceLevelId,level});a.staticAudit=staticAudit;
  if(!staticAudit.passed){reject(a,'full-static-native-structure');continue;}
  const count=built.constructionAccounting;
  if(count.completeWorldReservations+built.prefixDrags.length+2>=10000||count.microStates>=3000000||count.transitions>=10000000||count.elapsedMilliseconds>=30000){reject(a,'construction-budget-no-tail-reserve');continue;}
  const packet={...built,constructionEvidence:a.constructionEvidence,executionEnvironment:plan.executionEnvironment.descriptor,
   fixedBatchPlan:planDescriptor,sourceLevelSha256:levelSha256(source),inputStaticAudit:staticAudit,similarity,redesignOf:failedParent.id,
   branchProvenance:{kind:'new-whole-region-static-branch',reference:blueprint.reference,previousNewFixedInputs:previous,
    failedParent,changesFromAllPreviousSameSourceFixedInputs:true,firstSearchDriverUpdatesToMostRecentFailedInputWithinThisBranch:true,scope300:true},
   status:'STATIC_NEW_PREFIX_TAIL_INPUT_AWAITING_FIRST_PUBLIC_CLAIM',accepted:false,catalogEligible:false,formalReady:false,
   mathematicalEvidenceValidated:false,currentRuntimeValidationClaimed:false,gameplaySearches:0,fullOriginalUValidated:false};
  const file=`${outputDirectory}/candidate-${String(eligible.length).padStart(3,'0')}.json`;await write(file,packet);eligible.push(packet);
  a.candidate={path:file,sha256:sha(await fs.readFile(file)),sourceLevelId:built.sourceLevelId,levelSha256:built.levelSha256,prefixSha256:routeSha256(built.prefixDrags)};
 }
 await assertBindings(plan.bindings);
 const result={schemaVersion:4,scope:300,status:'FIXED_STATIC_BATCH_COMPLETE_NO_GAMEPLAY_SEARCH',plan:planDescriptor,executionEnvironment:plan.executionEnvironment,
  currentRuntimeValidationClaimed:false,attempts,rejections,fixedColourInputs:inputs.length,stocksEnteringColourCspIncludingFailed:inputs.length,eligibleInputs:eligible.length,
  candidates:attempts.flatMap(a=>a.candidate?[a.candidate]:[]),macro64ActualInputsIncludingThis:13+inputs.length,
  gameplaySearches:0,publicLedgerClaims:0,accepted:0,formalReady:false};
 await write(`${outputDirectory}/index.json`,result);completionStatus=result.status;return result;
 }catch(error){failureReason=error.message;throw error;}
 finally{await finishLatePrefixPlan(executionClaim,{status:completionStatus,failureReason,staticAttempts:attempts.length,stocksEnteringColourCspIncludingFailed:inputs.length,
  eligibleInputs:eligible.length,constructionFiles:attempts.map(a=>a.constructionEvidence),gameplaySearches:0,publicLedgerClaims:0});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [mode,out,planPath,planSha]=process.argv.slice(2);
 if(mode==='prepare')console.log(JSON.stringify(await prepareLatePrefixPlan(out)));
 else if(mode==='construct'){assert(planPath&&/^[a-f0-9]{64}$/.test(planSha??''));const q=await constructLatePrefixPlan({path:planPath,sha256:planSha},out);console.log(JSON.stringify({status:q.status,inputs:q.fixedColourInputs,eligible:q.eligibleInputs,newSearches:0}));}
 else throw Error('Use prepare <fresh-plan-directory> or construct <fresh-output-directory> <plan-path> <plan-sha>. Neither mode invokes gameplay search.');
}
