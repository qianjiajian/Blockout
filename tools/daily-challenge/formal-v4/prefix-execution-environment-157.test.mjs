import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {prefixExecutionEnvironment as oldEnvironment} from './prefix-execution-environment.mjs';
import {prefixExecutionEnvironment,PREFIX_157_PINS,assertPolicy157AppendOnly,mapHistoricalBindings157,currentMainlineSourceBinding} from './prefix-execution-environment-157.mjs';
import {sha,checkBindings} from './native-batch-io.mjs';
const out=process.env.PREFIX_ENV_157_TEST_OUT;assert(out);assert(!await fs.access(out).then(()=>true,()=>false));await fs.mkdir(out,{recursive:true});
const rt=await loadV4CatalogRuntime(),results=[],bindings={};let environment;
function check(name,fn){test(name,async()=>{try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});throw e;}});}
check('Actual historical 156/4588 and current 157 locks pass independently; no current UI assertion',()=>{
 environment=prefixExecutionEnvironment(rt);Object.assign(bindings,environment.bindings);
 assert.deepEqual(environment.ruleLocks,{historical:{status:'PASS',activeVersion:'1.156.0',verified:159},current:{status:'PASS',activeVersion:'1.157.0',verified:160}});
 assert.equal(environment.historicalDesignPolicy.version,'1.156.0');assert.equal(environment.currentActivePolicy.version,'1.157.0');assert.equal(environment.mathematicalContract.version,'1.154.0');
 assert.equal(environment.currentUIValidated,false);assert.equal(environment.currentRuntimeValidationClaimed,false);assert.equal(environment.futureInputsOnly,true);
});
check('Original environment still refuses manifest divergence',()=>assert.throws(()=>oldEnvironment(rt),/manifests diverged/));
check('Changed old rule entry or another appended policy is rejected',async()=>{
 const old=JSON.parse(await fs.readFile(environment.historicalDesignPolicy.manifest.path)),now=JSON.parse(await fs.readFile(environment.currentActivePolicy.manifest.path));
 for(const mutate of [q=>q.versions[0].sha256='0'.repeat(64),q=>q.versions[10].confirmation+=' changed',q=>q.activeVersion='1.158.0',q=>q.versions.pop()]){const copy=structuredClone(now);mutate(copy);assert.throws(()=>assertPolicy157AppendOnly(old,copy));}
});
check('Only exact obsolete root manifest digest resolves to unchanged historical bytes',()=>{
 const a=environment.historicalManifestArchive,input={[a.oldPath]:a.expectedSha256},copy=structuredClone(input),mapped=mapHistoricalBindings157(input,environment);
 assert.deepEqual(input,copy);assert.equal(mapped.resolutions.length,1);assert.equal(mapped.bindings[a.oldPath],undefined);assert.equal(mapped.bindings[a.archivePath],PREFIX_157_PINS.historicalManifest);
 assert.equal(environment.bindings[a.oldPath],PREFIX_157_PINS.currentManifest);
});
check('Wrong digest, sibling or normalized alias cannot invoke the archival exception',()=>{
 const a=environment.historicalManifestArchive;
 assert.throws(()=>mapHistoricalBindings157({[a.oldPath]:'0'.repeat(64)},environment));
 assert.throws(()=>mapHistoricalBindings157({[path.join(environment.sourceWorkspace,'docs/rules/mechanism-rules-v1.157.0.md')]:a.expectedSha256},environment));
 assert.throws(()=>mapHistoricalBindings157({[a.oldPath.replaceAll('\\','/')]:a.expectedSha256},environment));
});
check('Other drifting files reject instead of using historical bytes',async()=>{
 const p=path.join(out,'private-evidence.txt');await fs.writeFile(p,'one',{flag:'wx'});const h=sha(await fs.readFile(p));assert.deepEqual(mapHistoricalBindings157({[p]:h},environment).resolutions,[]);
 await fs.writeFile(p,'two');assert.throws(()=>mapHistoricalBindings157({[p]:h},environment));
});
check('Fake runtime, workspace descriptor digest and archive destination reject',()=>{
 assert.throws(()=>prefixExecutionEnvironment({...rt,toolchainSha256:'0'.repeat(64)}));
 assert.throws(()=>prefixExecutionEnvironment(rt,{...environment.descriptor,sha256:'0'.repeat(64)}));
 const bad=structuredClone(environment);bad.historicalManifestArchive.archivePath=bad.historicalManifestArchive.oldPath;
 assert.throws(()=>mapHistoricalBindings157({[bad.historicalManifestArchive.oldPath]:PREFIX_157_PINS.historicalManifest},bad));
});
check('Current mainline source still compiles and compares the complete original object',async()=>{
 const s=await currentMainlineSourceBinding(rt,environment,18);assert.equal(s.completeSourceObjectsEqual,true);assert.equal(s.currentRuntimeValidationClaimed,false);Object.assign(bindings,s.bindings);
 const bad={...rt,LEVELS:rt.LEVELS.map(l=>l.id===18?{...l,name:'private changed source'}:l)};
 await assert.rejects(currentMainlineSourceBinding(bad,environment,18),/complete objects differ/);
});
after(async()=>{
 for(const p of ['tools/daily-challenge/formal-v4/prefix-execution-environment-157.mjs','tools/daily-challenge/formal-v4/prefix-execution-environment-157.test.mjs','tools/daily-challenge/formal-v4/prefix-execution-environment.mjs','tools/verify-rules-lock.mjs'])bindings[p]=sha(await fs.readFile(p));await checkBindings(bindings);
 const report={status:results.length===8&&results.every(r=>r.passed)?'PREFIX_ENVIRONMENT_157_PRIVATE_PASS':'FAIL',results,passed:results.filter(r=>r.passed).length,errors:results.filter(r=>!r.passed),environment,fileBindings:bindings,
  newPreparations:0,newConstructions:0,newSearches:0,newWitnessReplays:0,newLedgerClaims:0,currentUIExecuted:false,formalReady:false};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
