import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {descriptor} from './native-batch-contract.mjs';
import {claimLatePrefixPlan,finishLatePrefixPlan,LATE_PREFIX_CONSTRUCTION_LEDGER} from './late-prefix-plan-ledger.mjs';
export const PUBLIC_LEDGER='deliverables/daily-formal-v3-20261008/proof/attempts';
export const HISTORY_LEDGER_ROOTS=Object.freeze([PUBLIC_LEDGER,LATE_PREFIX_CONSTRUCTION_LEDGER,
 'deliverables/daily-formal-v3-20261008/design/reverse-construction-attempts',
 'deliverables/daily-formal-v3-20261008/design/vacancy-joint-construction-attempts',
 'deliverables/daily-formal-v4-20261008/proof/capacity-construction-attempts']);
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const write=(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
export const exists=p=>fs.stat(p).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
export function mergeBindings(target,...sources){for(const source of sources){assert(source&&typeof source==='object');
 for(const [file,digest]of Object.entries(source)){assert(/^[a-f0-9]{64}$/.test(digest),'Invalid binding digest');
  if(Object.hasOwn(target,file))assert.equal(target[file],digest,`Conflicting binding: ${file}`);target[file]=digest;}}return target;}
/** Accept the exact independently reviewed v2 schema, not an author-only PASS. */
export async function assertReviewedNativeQualification(q,bindings={}){
 assert.equal(q.status,'INDEPENDENT_NATIVE120_PREFIX_TAIL_PRIVATE_PASS');
 const expected={wrapper:{path:'tools/daily-challenge/formal-v4/prefix-tail-native-120-v4-v2.mjs',sha256:'7303abec3b7ecf788b1dec3e1d35c382ab4b8a10bf0e50a7e2515a67a496a940'},
  primitive:{path:'tools/daily-challenge/formal-v4/native-120-upper.mjs',sha256:'5de29e5c8ff73af4952e6e929dbc350dd2b64fb948ec9f0191f4cfddffd521a1'}};
 assert.deepEqual(q.reviewed,expected);assert.equal(q.independentRerun.testsPassed,15);assert.equal(q.independentNewNegatives.testsPassed,3);
 assert.equal(q.publicRequestCountBefore,q.publicRequestCountAfter);assert(Number.isSafeInteger(q.publicRequestCountBefore));
 for(const key of ['newRealCandidateConstructions','newRealCandidateSearches','publicClaimsStarted'])assert.equal(q[key],0);
 assert.equal(q.privateTestsOnly,true);assert.equal(q.formalReady,false);assert.equal(q.currentUIValidationClaimed,false);
 assert.equal(q.review.originalLowerClosure,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
 assert.equal(q.review.originalLowerMaxMilliseconds,30000);assert.equal(q.review.priorPrefixTailAndTerminalWorldCap,10000);
 assert.equal(q.review.primitiveAndWrapperImportBytesAnchoredBeforeClaim,true);
 for(const d of Object.values(expected))assert.equal(q.fileBindings[d.path],d.sha256);
 mergeBindings(bindings,q.fileBindings);await checkBindings(q.fileBindings);
 for(const [d,status,count]of [[q.independentRerun,'NATIVE120_PREFIX_TAIL_V4_V2_PRIVATE_QUALIFICATION_PASS',15],[q.independentNewNegatives,'NATIVE120_COUNTER_NEGATIVES_PASS',3]]){
  assert.equal(q.fileBindings[d.path],d.sha256);const r=await readBound(d,bindings);assert.equal(r.status,status);assert.equal(r.qualificationOnly,true);
  assert.equal(r.evidence.length,count);assert(r.evidence.every(e=>e.passed===true));}
 return bindings;
}
export async function readBound(d,bindings){descriptor(d);const bytes=await fs.readFile(d.path);assert.equal(sha(bytes),d.sha256,d.path);
 if(bindings){if(bindings[d.path])assert.equal(bindings[d.path],d.sha256);bindings[d.path]=d.sha256;}return JSON.parse(bytes);}
export async function readFile(file,bindings){const bytes=await fs.readFile(file),digest=sha(bytes);
 if(bindings){if(bindings[file])assert.equal(bindings[file],digest);bindings[file]=digest;}return JSON.parse(bytes);}
export async function checkBindings(bindings){assert(bindings&&Object.keys(bindings).length);for(const [file,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(file)),h,file);}
export async function walkJson(directory){const out=[];for(const e of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,e.name);
 if(e.isDirectory()&&!e.isSymbolicLink())out.push(...await walkJson(file));else if(e.isFile()&&e.name.endsWith('.json'))out.push(file);}return out.sort();}
export async function captureLedgerSnapshot(bindings){const roots=[];for(const directory of HISTORY_LEDGER_ROOTS){
 const files=[];for(const file of await walkJson(directory)){const bytes=await fs.readFile(file),digest=sha(bytes);if(bindings[file])assert.equal(bindings[file],digest);bindings[file]=digest;files.push({path:file,sha256:digest});}roots.push({directory,files});}return{roots};}
export async function checkLedgerSnapshot(snapshot,{allowedNewFiles=[],qualificationOnly=false,expectedPrivateRoots}={}){
 assert.equal(typeof qualificationOnly,'boolean');let expectedRoots=HISTORY_LEDGER_ROOTS;
 if(qualificationOnly){assert(expectedPrivateRoots?.length);expectedRoots=expectedPrivateRoots;
  for(const dir of expectedRoots){const actual=await realPathWithSuffix(dir);for(const publicRoot of HISTORY_LEDGER_ROOTS){const root=await realPathWithSuffix(publicRoot);assert(actual!==root&&!actual.startsWith(root+path.sep),'Private snapshot aliases production');}}}
 else assert.equal(expectedPrivateRoots,undefined);
 const normalize=p=>path.resolve(p).toLowerCase();assert.deepEqual(snapshot?.roots?.map(r=>normalize(r.directory)).sort(),expectedRoots.map(normalize).sort(),'Exact complete ledger root set required');
 const allowed=new Set(allowedNewFiles.map(normalize));
 for(const root of snapshot.roots){const expected=new Map(root.files.map(d=>[path.resolve(d.path).toLowerCase(),d]));
  assert.equal(expected.size,root.files.length,'Duplicate history binding');for(const d of root.files)assert(normalize(d.path).startsWith(normalize(root.directory)+path.sep),'Ledger file outside root');
  for(const d of root.files)await readBound(d);for(const file of await walkJson(root.directory))assert(expected.has(path.resolve(file).toLowerCase())||allowed.has(path.resolve(file).toLowerCase()),`Unreviewed shared history added: ${file}`);}}
/** Resolve existing ancestors so a snapshot junction or an uncreated suffix
 * cannot turn the real shared ledger into a purported private directory. */
export async function realPathWithSuffix(file){let current=path.resolve(file),suffix=[];while(true){try{return path.join(await fs.realpath(current),...suffix).toLowerCase();}
 catch(e){if(e.code!=='ENOENT')throw e;const parent=path.dirname(current);assert(parent!==current);suffix.unshift(path.basename(current));current=parent;}}}
export async function claimNativeBatchPlan(planDescriptor,outputDirectory,options={}){
 assert(options.qualificationOnly===undefined||typeof options.qualificationOnly==='boolean');const qualificationOnly=options.qualificationOnly??false;
 const ledgerDirectory=options.ledgerDirectory??LATE_PREFIX_CONSTRUCTION_LEDGER;
 if(qualificationOnly){assert(options.ledgerDirectory,'Explicit private ledger required');const actual=await realPathWithSuffix(ledgerDirectory);
  for(const root of HISTORY_LEDGER_ROOTS){const real=await realPathWithSuffix(root);assert(actual!==real&&!actual.startsWith(real+path.sep),'Private ledger aliases a production ledger');}}
 else assert.equal(await realPathWithSuffix(ledgerDirectory),await realPathWithSuffix(LATE_PREFIX_CONSTRUCTION_LEDGER));
 return claimLatePrefixPlan(planDescriptor,outputDirectory,{qualificationOnly,ledgerDirectory});
}
export async function claimNativeBatchMath(planDescriptor,outputDirectory){
 descriptor(planDescriptor);await readBound(planDescriptor);
 const file=path.join(LATE_PREFIX_CONSTRUCTION_LEDGER,`${planDescriptor.sha256}.math-execution.json`);
 await write(file,{plan:planDescriptor,outputDirectory:path.resolve(outputDirectory),startedAt:new Date().toISOString(),
  publicIdentityLedger:PUBLIC_LEDGER,orchestrationLockOnly:true,retryAllowed:false,formalReady:false});return{file,sha256:sha(await fs.readFile(file))};
}
export {finishLatePrefixPlan,LATE_PREFIX_CONSTRUCTION_LEDGER};
