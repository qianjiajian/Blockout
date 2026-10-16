import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {SELF,FIXED_PROPOSAL,FIXED_SUPPLEMENTAL_FAILED_PARENTS,assertSupplementalContextPins,assertSupplementalHistoryView,assertEarlyClearProposal,declaredHistoryMembership} from './early-clear-supplemental-irregular-batch-task.mjs';
import {declaredHistoryMembership as originalMembership} from './early-clear-replaced-irregular-batch-task.mjs';
import {sha,write} from './low-twenty-io.mjs';

const out=process.env.SUPPLEMENTAL_IRREGULAR_BATCH_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const OLD='tools/daily-challenge/formal-v4/early-clear-replaced-irregular-batch-task.mjs';
const CHANGES='deliverables/daily-formal-v4-20261008/proof/supplemental-irregular-batch-handoff-01/declared-source-changes.json';
const PATCH='deliverables/daily-formal-v4-20261008/proof/supplemental-irregular-batch-handoff-01/narrow-diff.patch';
const TEST='tools/daily-challenge/formal-v4/early-clear-supplemental-irregular-batch-task.test.mjs';
const clone=structuredClone,evidence=[],bindings={};
async function bound(file,expected){const b=await fs.readFile(file),h=sha(b);if(expected)assert.equal(h,expected);bindings[file]=h;return b;}
const context=()=>({proposal:clone(FIXED_PROPOSAL),supplementalFailedParents:clone(FIXED_SUPPLEMENTAL_FAILED_PARENTS)});

test('only the exact six-recipe proposal and independently reviewed three-source supplement set can enter',async()=>{
 const p=context();assertSupplementalContextPins(p);
 const proposal=JSON.parse(await bound(FIXED_PROPOSAL.path,FIXED_PROPOSAL.sha256));assertEarlyClearProposal(proposal);
 assert.deepEqual(proposal.recipes.map(x=>x.sourceLevelId),[11,11,7,7,50,50]);
 assert.deepEqual(proposal.recipes.map(x=>x.finalTargetDifficulty),[3,2,3,2,3,2]);
 for(const edit of [x=>delete x.supplementalFailedParents,x=>x.proposal.sha256='0'.repeat(64),x=>x.supplementalFailedParents.review.sha256='1'.repeat(64),x=>x.supplementalFailedParents.supplements.pop(),x=>x.supplementalFailedParents.supplements.reverse(),x=>x.supplementalFailedParents.supplements[0].path+='-alias',x=>x.supplementalFailedParents.supplements.push(clone(x.supplementalFailedParents.supplements[0]))]){const bad=clone(p);edit(bad);assert.throws(()=>assertSupplementalContextPins(bad));}
 for(const edit of [x=>x.recipes[0].seed++,x=>x.recipes[0].maximumStocks=2,x=>x.references[0].reference.sha256='2'.repeat(64),x=>x.failedParents[0].receipt.sha256='3'.repeat(64),x=>x.finiteExperiment.maximumStaticPartitionAttempts++,x=>x.recipes[0].finalTargetDifficulty=2]){const bad=clone(proposal);edit(bad);assert.throws(()=>assertEarlyClearProposal(bad));}
 evidence.push({name:'fixed-proposal-and-all-three-exact-supplements',passed:true});
});

test('saved overlay must match this current history head, production role, and exact three full worlds',()=>{
 const p=context(),head='a'.repeat(64),v={baseHeadSha256:head,qualificationOnly:false,allowedRoles:['failed-parent'],supplements:clone(p.supplementalFailedParents.supplements),review:clone(p.supplementalFailedParents.review),addedHistoricalFullWorlds:3};
 p.supplementalHistoryEvidence=clone(v);const h={headSha256:head,supplementalFailedParentEvidence:clone(v)};assertSupplementalHistoryView(p,h);
 const before=JSON.stringify({p,h});
 for(const edit of [x=>x.baseHeadSha256='b'.repeat(64),x=>x.qualificationOnly=true,x=>x.allowedRoles=['reference'],x=>x.addedHistoricalFullWorlds=2,x=>x.supplements.pop(),x=>x.review.sha256='c'.repeat(64)]){
  const bad=clone(p),badH=clone(h);edit(bad.supplementalHistoryEvidence);assert.throws(()=>assertSupplementalHistoryView(bad,h));
  badH.supplementalFailedParentEvidence=clone(bad.supplementalHistoryEvidence);assert.throws(()=>assertSupplementalHistoryView(bad,badH));
 }
 assert.throws(()=>assertSupplementalHistoryView(p,{...h,headSha256:'d'.repeat(64)}));
 assert.equal(JSON.stringify({p,h}),before);evidence.push({name:'current-head-failed-parent-only-no-private-or-partial-view',passed:true});
});

test('compiled local member loop is equivalent including aliases, rootId null, ordering and duplicate rejection',()=>{
 const scope={baseDirectory:'C:/private-synthetic/work',roots:Array.from({length:7},(_,i)=>({id:'r'+i,physicalPath:`C:/private-synthetic/ledger${i}`,aliases:[`C:/private-synthetic/root/link${i}`,`C:/private-synthetic/snapshot/link${i}`]}))};
 const rows=scope.roots.flatMap((r,i)=>[{path:`${r.aliases[0]}/owner/../base${i}.json`,rootId:r.id},{path:`${r.physicalPath}/pending.revalidation.lock`,rootId:r.id}]);
 const h={bundle:{scope,files:[...rows,{path:'C:/private-synthetic/evidence/old-failed.json',rootId:null}]}};
 const delta={files:scope.roots.map((r,i)=>({path:`${r.aliases[1].toUpperCase()}\\NEXT${i}.result.json`,rootId:r.id}))};
 const before=JSON.stringify({h,delta}),actual=declaredHistoryMembership(h,delta);assert.deepEqual(actual,originalMembership(h,delta));
 for(const r of scope.roots)assert.deepEqual(actual[r.id],[...rows.filter(f=>f.rootId===r.id).map(f=>f.path),...delta.files.filter(f=>f.rootId===r.id).map(f=>f.path)]);
 for(const extra of [{path:'C:/private-synthetic/snapshot/link0/base0.json',rootId:'r0'},{path:delta.files[0].path,rootId:'r0'},{path:'C:/private-synthetic/unknown/new.json',rootId:'r8'}]){const bad={files:[...delta.files,extra]};assert.throws(()=>declaredHistoryMembership(h,bad));assert.throws(()=>originalMembership(h,bad));}
 // A fresh invocation builds a fresh compiler; no scope or memo survives.
 const changed=clone(h);changed.bundle.scope.roots[0].aliases[0]='C:/private-synthetic/root/new-link0';
 assert.deepEqual(declaredHistoryMembership(changed,delta),originalMembership(changed,delta));
 assert.equal(JSON.stringify({h,delta}),before);evidence.push({name:'seven-root-membership-loop-identical-null-evidence-not-members',passed:true});
});

test('the entire fork equals the frozen source after only the published substitutions',async()=>{
 const old=(await bound(OLD,'59875b2af0c53e43e0e4b17727572166d3d5e599dce3ef85d00a1394c3cab634')).toString();
 const changes=JSON.parse(await bound(CHANGES,'44b75bc654d370a300fdf3ac4846be68dc0f240f332b2b24e45c5be9c5725be4'));
 let transformed=old;for(const c of changes){assert(c.from.length);assert.equal(transformed.split(c.from).length-1,c.occurrences,c.label);transformed=transformed.replaceAll(c.from,c.to);}
 assert.equal((await bound(SELF)).toString(),transformed);await bound(PATCH);
 for(const[file,digest]of Object.entries({
  'tools/daily-challenge/formal-v4/supplemental-failed-parent-evidence.mjs':'06b3174eb74b78f010f1c74f2af5883ec3fb2180645cf1a941da6686d38c311c',
  'tools/daily-challenge/formal-v4/replaced-irregular-reference.mjs':'e1f4700982b05c25d0fe8aa7757b8fb80fde08d46e75887e5d112638408319c8',
  'tools/daily-challenge/formal-v4/replaced-irregular-region-stock.mjs':'9a38e2db82c878488c63d4afb2386ed86ecfbfff57b50fd15d0996bbc6d90e2e'
 }))await bound(file,digest);
 evidence.push({name:'whole-file-declared-diff-math-factory-adapter-preserved',passed:true,substitutions:changes.map(x=>({label:x.label,occurrences:x.occurrences}))});
});

test.after(async()=>{
 const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};
 for(const f of Object.keys(compiled.metafile.inputs))toolBindings[f.replaceAll('\\','/')]=sha(await fs.readFile(f));
 await bound(TEST);const report={status:evidence.length===4?'EARLY_CLEAR_SUPPLEMENTAL_IRREGULAR_BATCH_PRIVATE_PASS':'INCOMPLETE',errors:evidence.length===4?[]:['Incomplete focused metadata checks'],evidence,toolBindings,fileBindings:{...toolBindings,...bindings},qualificationOnly:true,syntheticMetadataOnly:true,
  fixedProposal:FIXED_PROPOSAL,supplementalFailedParents:FIXED_SUPPLEMENTAL_FAILED_PARENTS,newActualHistoryConsumptions:0,newRealReferencesReplayed:0,newReplayCalls:0,newModelCalls:0,newRealConstructions:0,newConstructions:0,newCspCalls:0,newSearches:0,newLedgerClaims:0,publicClaimsStarted:0,searchAlgorithmChanged:false,failedOriginalRetryAllowed:false,formalReady:false};
 await write(out+'/report.json',report);
});
