import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {build} from 'esbuild';
import * as old from './prepare-low-twenty.mjs';
import * as future from './prepare-low-twenty-158.mjs';
import {readBound,checkBindings,sha} from './low-twenty-io.mjs';
const out=process.env.LOW_TWENTY_158_PREPARE_TEST_OUT;assert(out);assert(!await fs.access(out).then(()=>true,()=>false));await fs.mkdir(out,{recursive:true});
const results=[],fileBindings={};
function check(name,fn){test(name,async()=>{try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});throw e;}});}
check('Future qualification is separate from exact legacy core; neither can stand in for the other',async()=>{
 const legacy=await readBound(future.LOW_TWENTY_LEGACY_QUALIFICATION,fileBindings),qualified={status:'INDEPENDENT_LOW_TWENTY_158_PRIVATE_PASS',errors:[],legacyConstructorQualification:future.LOW_TWENTY_LEGACY_QUALIFICATION,newRealConstructions:0,newSearches:0,publicClaimsStarted:0,fileBindings:{}};
 for(const p of future.LOW_TWENTY_158_FUTURE_FILES){const h=sha(await fs.readFile(p));qualified.fileBindings[p]=h;fileBindings[p]=h;}
 assert(future.assertLowTwenty158ConstructorQualification(qualified,legacy));
 for(const mutate of [q=>q.status=legacy.status,q=>delete q.fileBindings[future.LOW_TWENTY_158_FUTURE_FILES[0]],q=>q.legacyConstructorQualification.sha256='0'.repeat(64),q=>q.newSearches=1]){const q=structuredClone(qualified);mutate(q);assert.throws(()=>future.assertLowTwenty158ConstructorQualification(q,legacy));}
 assert.throws(()=>future.assertLowTwenty158ConstructorQualification(qualified,{...legacy,status:'ANY_PASS'}));
});
check('Same proposal, sealed-parent ancestry and failed-descendant safeguards are preserved byte for byte',()=>{
 for(const name of ['assertLowTwentyProposal','assertNoFailedDescendant','assertLowTwentyParentAncestry','assertLowTwentyFailedParent'])assert.equal(future[name].toString(),old[name].toString(),name);
 assert.equal(future.LOW_TWENTY_PROPOSAL_SHA,old.LOW_TWENTY_PROPOSAL_SHA);
});
check('Same recipe/geometry/stock/history logic and finite physical budgets; no call into old prepare',async()=>{
 const source=await fs.readFile('tools/daily-challenge/formal-v4/prepare-low-twenty.mjs','utf8'),next=await fs.readFile('tools/daily-challenge/formal-v4/prepare-low-twenty-158.mjs','utf8');
 const segment=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));
 assert.equal(segment(next,' const failedParents=[];',' const lowQualification='),segment(source,' const failedParents=[];',' const lowQualification='));
 assert.equal(segment(next,'  campaign:{','  historicalBindingResolutions'),segment(source,'  campaign:{','  executionEnvironment:'));
 assert(!/\bprepareLowTwenty\(/.test(next));assert(next.includes('readLowTwenty153Admission(context.selection,context.selectionReview)'));
 assert(next.includes('assertReviewedLowBandQualification158(lowQualification,bindings)'));assert(next.includes('bindHistorical(legacyQual.fileBindings);bindHistorical(qual.fileBindings)'));
});
check('Real future import closure resolves while old original prepare remains exact',async()=>{
 const compiled=await build({entryPoints:['tools/daily-challenge/formal-v4/prepare-low-twenty-158.mjs'],bundle:true,packages:'external',write:false,outdir:'unused',metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))fileBindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));
 assert.equal(sha(await fs.readFile('tools/daily-challenge/formal-v4/prepare-low-twenty.mjs')),'fe6c8da0bb26074ee9447d19f5c7ebda7290d56823558ac3a6eed7412b7a6854');
});
after(async()=>{
 const testPath='tools/daily-challenge/formal-v4/prepare-low-twenty-158.test.mjs';fileBindings[testPath]=sha(await fs.readFile(testPath));await checkBindings(fileBindings);
 const report={status:results.length===4&&results.every(r=>r.passed)?'LOW_TWENTY_158_PREPARE_METADATA_PRIVATE_PASS':'FAIL',results,passed:results.filter(r=>r.passed).length,errors:results.filter(r=>!r.passed),fileBindings,
  legacyConstructorQualification:future.LOW_TWENTY_LEGACY_QUALIFICATION,newPreparations:0,newConstructions:0,newSearches:0,newLedgerClaims:0,newWitnessReplays:0,qualificationOnly:true,formalReady:false};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
