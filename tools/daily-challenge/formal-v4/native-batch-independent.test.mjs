import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {mergeBindings,checkLedgerSnapshot,claimNativeBatchPlan,HISTORY_LEDGER_ROOTS,PUBLIC_LEDGER,realPathWithSuffix,sha,assertReviewedNativeQualification} from './native-batch-io.mjs';
import {recordNativeColourAttempt,deriveNativeMacroAccounting} from './native-batch-contract.mjs';

const output=process.env.NATIVE_BATCH_INDEPENDENT_OUT;
assert(output,'Explicit fresh private evidence directory required');
const countPublic=async()=>(await fs.readdir(PUBLIC_LEDGER)).filter(x=>x.endsWith('.request.json')).length;
const before=await countPublic(),evidence=[];
const files=['native-batch-contract.mjs','native-batch-io.mjs','prepare-native-batch.mjs','construct-native-batch.mjs','run-native-batch.mjs','native-batch-independent.test.mjs'];
const initialBindings=Object.fromEntries(await Promise.all(files.map(async n=>{const p=`tools/daily-challenge/formal-v4/${n}`;return[p,sha(await fs.readFile(p))];})));
const check=(name,fn)=>test(name,async()=>{try{const facts=await fn();evidence.push({name,passed:true,facts});}catch(e){evidence.push({name,passed:false,error:e.message});throw e;}});

check('conflicting previously bound bytes fail without replacing the original SHA',()=>{
 const first='1'.repeat(64),second='2'.repeat(64),b={'same-input.json':first};
 assert.equal(mergeBindings(b,{'same-input.json':first}),b);
 assert.throws(()=>mergeBindings(b,{'same-input.json':second}),/Conflicting binding/);
 assert.equal(b['same-input.json'],first);assert.throws(()=>mergeBindings(b,{'bad.json':'PASS'}),/digest/);
 return{sameDigestAccepted:true,conflictingDigestRejected:true};
});

check('all five real history roots and their junction aliases reject qualification before plan read or write',async()=>{
 const nonexistent={path:'native-batch-independent-does-not-exist.json',sha256:'0'.repeat(64)};
 let rejected=0;
 for(const root of HISTORY_LEDGER_ROOTS){for(const dir of [root,await realPathWithSuffix(root)])for(const suffix of ['',path.join('never-created-native-batch-test','nested')]){
  await assert.rejects(claimNativeBatchPlan(nonexistent,'not-created',{qualificationOnly:true,ledgerDirectory:path.join(dir,suffix)}),/Private ledger aliases/);rejected++;
 }}
 await assert.rejects(claimNativeBatchPlan(nonexistent,'not-created',{qualificationOnly:'true'}));
 return{protectedRoots:HISTORY_LEDGER_ROOTS.length,rejectedPaths:rejected,actualClaims:0};
});

check('private history snapshot rejects omissions, duplicate entries, escaped paths, new files and changed bytes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'native-batch-independent-'));
 const a=path.join(root,'a'),b=path.join(root,'b');await fs.mkdir(a);await fs.mkdir(b);
 const file=path.join(a,'one.json');await fs.writeFile(file,'{}\n');
 const snapshot={roots:[{directory:a,files:[{path:file,sha256:sha(await fs.readFile(file))}]},{directory:b,files:[]}]};
 const options={qualificationOnly:true,expectedPrivateRoots:[a,b]};await checkLedgerSnapshot(snapshot,options);
 await assert.rejects(checkLedgerSnapshot({roots:[snapshot.roots[0]]},options),/root set/);
 const duplicate=structuredClone(snapshot);duplicate.roots[0].files.push(duplicate.roots[0].files[0]);
 await assert.rejects(checkLedgerSnapshot(duplicate,options),/Duplicate/);
 const escaped=structuredClone(snapshot);escaped.roots[1].files.push(escaped.roots[0].files[0]);
 await assert.rejects(checkLedgerSnapshot(escaped,options),/outside root/);
 const extra=path.join(b,'extra.json');await fs.writeFile(extra,'{}\n');await assert.rejects(checkLedgerSnapshot(snapshot,options),/Unreviewed/);
 await checkLedgerSnapshot(snapshot,{...options,allowedNewFiles:[extra]});
 await fs.writeFile(file,'{"drift":true}\n');await assert.rejects(checkLedgerSnapshot(snapshot,{...options,allowedNewFiles:[extra]}));
 await assert.rejects(checkLedgerSnapshot({roots:[]}),/root set/);
 return{privateRoot:root,productionWrites:0};
});

check('native qualification binds reviewed v2 bytes and retains old lower clock and full-board cap',async()=>{
 const file='deliverables/daily-formal-v4-20261008/proof/native120-counter-independent-v2-01/report.json';
 const bytes=await fs.readFile(file),q=JSON.parse(bytes);await assertReviewedNativeQualification(q,{});
 for(const change of [r=>r.reviewed.wrapper.path=r.reviewed.wrapper.path.replace('-v2.mjs','.mjs'),r=>r.review.originalLowerMaxMilliseconds=120000,
  r=>r.review.priorPrefixTailAndTerminalWorldCap=10001,r=>r.independentNewNegatives.testsPassed=0,r=>r.publicClaimsStarted=1]){
  const bad=structuredClone(q);change(bad);await assert.rejects(assertReviewedNativeQualification(bad,{}));
 }
 return{review:{path:file,sha256:sha(bytes)},mismatchesRejected:5};
});

check('rejected colour attempts consume each recipe allowance and cannot borrow another recipe quota',()=>{
 const counts=new Map(),a={recipeId:'a',maximumStocks:1},b={recipeId:'b',maximumStocks:2};
 assert.equal(recordNativeColourAttempt(counts,a,{ok:false}),false);
 recordNativeColourAttempt(counts,a,{ok:false,paint:{reason:'unsatisfiable'}});
 recordNativeColourAttempt(counts,b,{ok:false,paint:{reason:'domain-empty'}});
 assert.throws(()=>recordNativeColourAttempt(counts,a,{ok:false,paint:{}}),/quota/);
 recordNativeColourAttempt(counts,b,{ok:true,paint:{}});
 assert.deepEqual(Object.fromEntries(counts),{a:1,b:2});
 return{recipeCounts:Object.fromEntries(counts),rejectedColourCharged:true};
});

check('a completed zero-CSP batch remains in history regardless of claim filename enumeration order',()=>{
 const row=(id,previous,actual)=>({plan:{path:`private-history-${id}.json`,sha256:String(id).repeat(64)},previous,actual,after:previous+actual,quota:3,qualificationOnly:false,terminal:true});
 const earlier=row(1,51,3),empty=row(2,54,0),later=row(3,54,3);
 for(const rows of [[earlier,empty,later],[later,earlier,empty],[empty,later,earlier]]){
  const result=deriveNativeMacroAccounting(rows);assert.equal(result.total,57);assert.equal(result.rows.length,3);
 }
 assert.throws(()=>deriveNativeMacroAccounting([earlier,empty,later,row(4,54,1)]));
 return{permutations:3,zeroCountClaimPreserved:true,overlappingNonzeroBatchRejected:true};
});

after(async()=>{
 const afterCount=await countPublic();assert.equal(afterCount,before,'Public request count changed during private qualification');
 for(const [file,h] of Object.entries(initialBindings))assert.equal(sha(await fs.readFile(file)),h,`Implementation changed during audit: ${file}`);
 await fs.mkdir(output,{recursive:false});
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:evidence.every(e=>e.passed)?'NATIVE_BATCH_INDEPENDENT_NEGATIVES_PASS':'NATIVE_BATCH_INDEPENDENT_NEGATIVES_FAIL',
  qualificationOnly:true,evidence,toolBindings:initialBindings,publicRequestCountBefore:before,publicRequestCountAfter:afterCount,
  newRealCandidateConstructions:0,newRealCandidateSearches:0,publicClaimsStarted:0,formalReady:false},null,2)+'\n',{flag:'wx'});
});
