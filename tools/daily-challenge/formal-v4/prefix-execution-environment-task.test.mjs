import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {prefixExecutionEnvironment,observeExecutionPolicy,mapHistoricalBindingsTask,currentMainlineSourceBinding,
 DEFAULT_EXECUTION_POLICY_REVIEW,TASK_ENVIRONMENT_PINS,assertExecutionPolicyReviewMetadata} from './prefix-execution-environment-task.mjs';

const OUT=process.env.PREFIX_ENV_TASK_TEST_OUT;assert(OUT&&!fs.existsSync(OUT));fs.mkdirSync(OUT,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p)),clone=structuredClone;
const runtime=await loadV4Runtime(),results=[],bindings={...runtime.toolchainBindings};let environment,actualObservation;
const ledger='deliverables/daily-formal-v3-20261008/proof/attempts',beforeRequests=fs.readdirSync(ledger).filter(x=>x.endsWith('.request.json')).sort();
function check(name,fn){test(name,async()=>{try{await fn();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.message});throw error;}});}
function write(p,value){const data=Buffer.isBuffer(value)?value:Buffer.from(typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');fs.writeFileSync(p,data,{flag:'wx'});return{path:p,sha256:hash(data)};}

check('Actual snapshot156/4588 and separately reviewed159 pass, with stable archive-only policy bindings',()=>{
 environment=prefixExecutionEnvironment(runtime);actualObservation=observeExecutionPolicy();assert.deepEqual(actualObservation,observeExecutionPolicy(environment));
 assert.equal(environment.historicalDesignPolicy.version,'1.156.0');assert.equal(environment.mathematicalContract.version,'1.154.0');assert.equal(environment.policyReviewedAtPreparation.version,'1.159.0');
 assert.equal(actualObservation.observedCurrentPolicy.activeVersion,'1.159.0');assert.equal(actualObservation.observedCurrentPolicy.ruleLock.verified,162);
 assert.equal(environment.currentActivePolicy,undefined);assert.equal(environment.bindings[environment.historicalManifestArchive.oldPath],undefined);
 assert.equal(environment.bindings[environment.policyReviewedAtPreparation.manifest.path],TASK_ENVIRONMENT_PINS.preparationManifest);assert.equal(environment.currentUIValidated,false);
 Object.assign(bindings,environment.bindings);assert.deepEqual(prefixExecutionEnvironment(runtime,environment.descriptor),environment);
});

check('Unreviewed append rejects; an explicitly archived synthetic UI append passes without changing stable environment or original162',()=>{
 const root=environment.sourceWorkspace,manifestPath=path.join(root,'docs/rules/manifest.json'),agentsPath=path.join(root,'AGENTS.md');
 const anchor=read(environment.policyReviewedAtPreparation.manifest.path),future=clone(anchor),docPath='docs/rules/mechanism-rules-v1.160.0.md';
 const doc=Buffer.from('# qualificationOnly synthetic UI policy\nblockout-rules-v1.160.0\nrevised-2026-09-27-v1.5\nNo actual production policy or authorization is created.\n');
 future.activeVersion='1.160.0';future.versions.push({version:'1.160.0',ruleId:'blockout-rules-v1.160.0',runtimeProfile:'revised-2026-09-27-v1.5',document:docPath,sha256:hash(doc),status:'frozen'});
 const manifest=write(path.join(OUT,'qualificationOnly-future-manifest.json'),future),archivedDoc=write(path.join(OUT,'qualificationOnly-future-doc.md'),doc);
 const review=read(DEFAULT_EXECUTION_POLICY_REVIEW.path);review.qualificationOnly=true;review.reviewedActiveVersion=future.activeVersion;review.reviewedManifest=manifest;review.rootRuleLockAtReview={status:'PASS',activeVersion:future.activeVersion,verified:163};
 review.reviewAttestation.reviewedChanges='qualificationOnly controlled synthetic UI append; not a real root policy review';review.reviewedDocuments.push({version:future.activeVersion,originalRelativePath:docPath,ruleSha256:hash(doc),archive:archivedDoc});
 const reviewDescriptor=write(path.join(OUT,'qualificationOnly-future-review.json'),review),originalRead=fs.readFileSync,previous=process.env.DAILY_EXECUTION_POLICY_REVIEW;
 const futureBytes=Buffer.from(JSON.stringify(future,null,2)+'\n'),agentsBytes=Buffer.concat([originalRead(agentsPath),Buffer.from('\n'+docPath)]);
 fs.readFileSync=function(p,options){let b;const resolved=path.resolve(String(p));if(resolved===manifestPath)b=futureBytes;else if(resolved===path.join(root,docPath))b=doc;else if(resolved===agentsPath)b=agentsBytes;else return originalRead.call(this,p,options);const encoding=typeof options==='string'?options:options?.encoding;return encoding?b.toString(encoding):Buffer.from(b);};
 try{
  delete process.env.DAILY_EXECUTION_POLICY_REVIEW;assert.throws(()=>observeExecutionPolicy(environment),/exact execution policy review/);assert.throws(()=>prefixExecutionEnvironment(runtime),/exact execution policy review/);
  process.env.DAILY_EXECUTION_POLICY_REVIEW=JSON.stringify(reviewDescriptor);const observation=observeExecutionPolicy(environment);assert.equal(observation.observedCurrentPolicy.activeVersion,'1.160.0');assert.equal(observation.observedCurrentPolicy.ruleLock.verified,163);
  assert.deepEqual(prefixExecutionEnvironment(runtime),environment,'Policy append must not change stable math bindings/plan environment');
  assert.deepEqual(observeExecutionPolicy(environment,{scopeReview:reviewDescriptor}),observation);
  const changed=clone(future);changed.versions[0].confirmation+=' unreviewed';assert.throws(()=>assertExecutionPolicyReviewMetadata(review,changed,changed,anchor),/162 rule entries/);
  const badContract=clone(review);badContract.unchangedContracts.dailyDesign.sha256='0'.repeat(64);assert.throws(()=>assertExecutionPolicyReviewMetadata(badContract,future,future,anchor));
 }finally{fs.readFileSync=originalRead;if(previous===undefined)delete process.env.DAILY_EXECUTION_POLICY_REVIEW;else process.env.DAILY_EXECUTION_POLICY_REVIEW=previous;}
});

check('Only exact oldroot363 maps to actual snapshot363; wrong digest, aliases and all other drift reject',()=>{
 const a=environment.historicalManifestArchive,mapped=mapHistoricalBindingsTask({[a.oldPath]:a.expectedSha256},environment);assert.equal(mapped.bindings[a.oldPath],undefined);assert.equal(mapped.bindings[a.archivePath],a.expectedSha256);assert.equal(mapped.resolutions.length,1);
 for(const p of [a.oldPath,a.oldPath.replaceAll('\\','/')])assert.throws(()=>mapHistoricalBindingsTask({[p]:'0'.repeat(64)},environment));
 assert.throws(()=>mapHistoricalBindingsTask({[a.oldPath]:TASK_ENVIRONMENT_PINS.preparationManifest},environment));
 assert.throws(()=>mapHistoricalBindingsTask({[a.oldPath.replaceAll('\\','/')]:a.expectedSha256},environment));
 const d=write(path.join(OUT,'qualificationOnly-changing-evidence.txt'),'before');assert.equal(mapHistoricalBindingsTask({[d.path]:d.sha256},environment).resolutions.length,0);fs.writeFileSync(d.path,'after');assert.throws(()=>mapHistoricalBindingsTask({[d.path]:d.sha256},environment));
 const forged=clone(environment);forged.historicalManifestArchive.archivePath=a.oldPath;assert.throws(()=>mapHistoricalBindingsTask({[a.oldPath]:a.expectedSha256},forged));
});

check('Review digest, missing review, false attestation and mismatched current document are rejected',()=>{
 assert.throws(()=>observeExecutionPolicy(environment,{scopeReview:{...DEFAULT_EXECUTION_POLICY_REVIEW,sha256:'0'.repeat(64)}}));
 assert.throws(()=>observeExecutionPolicy(environment,{scopeReview:{path:path.join(OUT,'absent-review.json'),sha256:'0'.repeat(64)}}));
 const review=read(DEFAULT_EXECUTION_POLICY_REVIEW.path),anchor=read(review.reviewedManifest.path);review.reviewAttestation.rootFullActiveDocumentRead=false;
 assert.throws(()=>assertExecutionPolicyReviewMetadata(review,anchor,anchor,anchor));
 const originalRead=fs.readFileSync,activePath=path.join(environment.sourceWorkspace,'docs/rules/mechanism-rules-v1.159.0.md');
 fs.readFileSync=function(p,options){const b=originalRead.call(this,p,options);if(path.resolve(String(p))!==activePath)return b;return typeof b==='string'?b+'\nprivate drift':Buffer.concat([b,Buffer.from('\nprivate drift')]);};
 try{assert.throws(()=>observeExecutionPolicy(environment));}finally{fs.readFileSync=originalRead;}
 assert.throws(()=>prefixExecutionEnvironment({...runtime,toolchainSha256:'0'.repeat(64)}));assert.throws(()=>prefixExecutionEnvironment(runtime,{...environment.descriptor,sha256:'0'.repeat(64)}));
});

check('Current mainline source remains actual full-object compiled comparison, not historical shorthand',async()=>{
 const source=await currentMainlineSourceBinding(runtime,environment,18);assert.equal(source.completeSourceObjectsEqual,true);Object.assign(bindings,source.bindings);
 const changed={...runtime,LEVELS:runtime.LEVELS.map(l=>l.id===18?{...l,name:'qualificationOnly drift'}:l)};await assert.rejects(currentMainlineSourceBinding(changed,environment,18),/complete objects differ/);
});

after(()=>{
 for(const p of ['tools/daily-challenge/formal-v4/prefix-execution-environment-task.mjs','tools/daily-challenge/formal-v4/prefix-execution-environment-task.test.mjs','tools/daily-challenge/formal-v4/prefix-execution-environment.mjs','tools/daily-challenge/formal-v4/runtime.mjs','tools/verify-rules-lock.mjs'])bindings[p]=hash(fs.readFileSync(p));
 for(const[p,h]of Object.entries(bindings))assert.equal(hash(fs.readFileSync(p)),h);const now=fs.readdirSync(ledger).filter(x=>x.endsWith('.request.json')).sort();assert.deepEqual(now,beforeRequests);
 const report={status:results.length===5&&results.every(r=>r.passed)?'PREFIX_ENVIRONMENT_TASK_PRIVATE_PASS':'FAIL',qualificationOnly:true,results,passed:results.filter(r=>r.passed).length,errors:results.filter(r=>!r.passed),
  environment,actualExecutionPolicyObservation:actualObservation,defaultReview:DEFAULT_EXECUTION_POLICY_REVIEW,syntheticFutureAppend:'In-process fs read injection only; no real root rule/source/evidence modified',fileBindings:bindings,
  publicRequestsBefore:beforeRequests.length,publicRequestsAfter:now.length,newPreparations:0,newConstructions:0,newSearches:0,newWitnessReplays:0,newLedgerClaims:0,currentUIExecuted:false};
 write(path.join(OUT,'report.json'),report);
});
