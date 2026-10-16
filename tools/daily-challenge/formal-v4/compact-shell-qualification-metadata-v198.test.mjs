import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {assertCompactShellProvidedQualificationConfigV198} from './qualify-compact-shell-provided-v198.mjs';
import {assertSameCompactDescriptorV198,assertCompactProvidedCompletionMetadataV198,assertCompactProvidedConstructionMetadataV198} from './compact-shell-provided-execution-evidence-v198.mjs';
import {assertExactSourceReplacementBridgeV198,assertCompactCurrentCompatibilityMetadataV198,assertCompactCurrentCatalogCopyV198} from './compact-shell-current-compatibility-v198.mjs';

// Read immutable evidence; mutate only in-memory metadata for negative cases.
// No model construction, search, replay, qualification output or ledger writes.
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),copy=x=>structuredClone(x);
const base='deliverables/daily-formal-v4-20261008/';
const config=read(base+'proof/shell-d201-source5-n08-qualification-config-02.json');
const q=read(config.candidate.path),done=read(config.completion.path),preflight=read(done.preflight.path),compatibility=read(config.compatibilityReview.path);
const claimBase=base+'design/late-prefix-construction-ledger/'+done.preflight.sha256;
const claim=read(claimBase+'.claim.json'),closure=read(claimBase+'.result.json');
test('fixture descriptors bind exact existing accepted proof bytes',()=>{
 for(const key of ['candidate','completion','compatibilityReview'])assert.equal(createHash('sha256').update(fs.readFileSync(config[key].path)).digest('hex'),config[key].sha256);
 assert.equal(q.L,18);assert.equal(q.U,31);assert.equal(q.drags.length,47);
});
test('compact qualification config accepts exact evidence fields',()=>assert.equal(assertCompactShellProvidedQualificationConfigV198(config),config));
for(const [name,change]of [
 ['unbound successor',x=>delete x.successorIndex],['missing current domain review',x=>delete x.compatibilityReview],
 ['unbound independent successor review',x=>delete x.successorIndexReview],['extra bypass flag',x=>x.skipFreshness=true],
 ['overwrite evidence',x=>x.output=x.rootDesign.path],['non-proof output',x=>x.output='src/core/formalDailyChallenge300Data.ts'],
])test('qualification config rejects '+name,()=>{const x=copy(config);change(x);assert.throws(()=>assertCompactShellProvidedQualificationConfigV198(x));});
test('descriptor accepts Windows slash normalization but rejects another physical pathname',()=>{
 const d=config.candidate;assertSameCompactDescriptorV198(d,{...d,path:path.resolve(d.path).replaceAll('\\','/')});
 assert.throws(()=>assertSameCompactDescriptorV198(d,{...d,path:d.path+'.different'}));
 assert.throws(()=>assertSameCompactDescriptorV198(d,{...d,sha256:'0'.repeat(64)}));
});
test('original completion accounts one real lower, zero upper and both original replays',()=>{
 const a=assertCompactProvidedCompletionMetadataV198(q,done,config.candidate);
 assert.equal(a.lower.registeredRawSetStates,1761);assert.equal(a.conservativeFullWorlds,1762);assert.equal(a.upper.calls,0);
});
for(const [name,change]of [
 ['error despite accepted candidate',x=>x.error='unexpected-execution-error'],['unreturned qualifier',x=>x.returned=false],
 ['substituted route',x=>x.providedRouteSha256='0'.repeat(64)],['fake parent',x=>x.failedParentId='0'.repeat(64)],
 ['extra upper search',x=>x.accounting.upper.calls=1],['missing independent replay',x=>x.accounting.replayCalls.independent=0],
 ['fabricated lower states',x=>x.accounting.lower.registeredRawSetStates=1],['restart permission',x=>x.restartAllowed=true],
])test('completion rejects '+name,()=>{const x=copy(done);change(x);assert.throws(()=>assertCompactProvidedCompletionMetadataV198(q,x,config.candidate));});
test('failed or altered original mathematics cannot use accepted completion',()=>{
 for(const change of [x=>x.accepted=false,x=>x.L=19,x=>x.lowerBound.result.termination='max-states',x=>x.route.search={}]){
  const x=copy(q);change(x);assert.throws(()=>assertCompactProvidedCompletionMetadataV198(x,done,config.candidate));
 }
});
const checkConstruction=(a,b)=>assertCompactProvidedConstructionMetadataV198(a,b,done.preflight,preflight.input,config.candidate,preflight.experimentId);
test('construction closes the one input without falsely awarding mathematics',()=>{checkConstruction(claim,closure);assert.equal(closure.mathematicalAcceptance,false);});
for(const [name,change]of [
 ['missing consumed input',x=>x.consumedInputs=0],['unclosed claim',x=>x.closed=false],['new mathematical award',x=>x.mathematicalAcceptance=true],
 ['lost original world',x=>x.formedWorldFiles=[]],['unbound result',x=>x.receipts=[]],['extra input budget',x=>x.maximumInputs=2],
])test('construction rejects '+name,()=>{const x=copy(closure);change(x);assert.throws(()=>checkConstruction(claim,x));});
test('current compatibility metadata binds exact source pair and candidate',()=>assert.equal(assertCompactCurrentCompatibilityMetadataV198(compatibility,config.candidate,q).length,5));
for(const [name,change]of [
 ['different candidate',x=>x.candidate.sha256='0'.repeat(64)],['missing reviewed drift',x=>x.changes.pop()],
 ['unreviewed executable source',x=>x.changes[0].path='src/core/anotherModel.ts'],['old source mutation',x=>x.changes[0].oldSource.sha256='0'.repeat(64)],
 ['different route',x=>x.routeSha256='0'.repeat(64)],['unverified review',x=>x.errors=['not reviewed']],
])test('compatibility rejects '+name,()=>{const x=copy(compatibility);change(x);assert.throws(()=>assertCompactCurrentCompatibilityMetadataV198(x,config.candidate,q));});
test('exact source bridge retains duplicate new hunks through their unique forward locations',()=>{
 assertExactSourceReplacementBridgeV198('left OLD right NEW','left NEW right NEW',[{oldText:'OLD',newText:'NEW'}]);
 assertExactSourceReplacementBridgeV198('left OLD right NEW','left X right Y',[{oldText:'OLD',newText:'X'},{oldText:'right NEW',newText:'right Y'}]);
});
test('exact source bridge rejects ambiguous old hunk, undeclared edits and wrong endpoints',()=>{
 for(const args of [
  ['OLD OLD','NEW OLD',[{oldText:'OLD',newText:'NEW'}]],
  ['OLD','NEW extra',[{oldText:'OLD',newText:'NEW'}]],
  ['OLD','NEW',[{oldText:'missing',newText:'NEW'}]],
 ])assert.throws(()=>assertExactSourceReplacementBridgeV198(...args));
});
test('all four actual source bridges reconstruct complete frozen/current bytes in both directions',()=>{
 for(const c of compatibility.changes.filter(c=>c.method==='exact-replacements')){
  const before=fs.readFileSync(c.oldSource.path),current=fs.readFileSync(c.currentSource.path);
  assert.equal(createHash('sha256').update(before).digest('hex'),c.oldSource.sha256);assert.equal(createHash('sha256').update(current).digest('hex'),c.currentSource.sha256);
  assertExactSourceReplacementBridgeV198(before.toString('utf8'),current.toString('utf8'),c.exactReplacements);
 }
});
test('current catalog copy rechecks exact literals and unlock declarations without claiming obsolete daily full bytes',async()=>{
 const bindings={};const bind=async(p,h)=>{const actual=createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(h)assert.equal(actual,h);if(bindings[p])assert.equal(actual,bindings[p]);bindings[p]=actual;return{path:p,sha256:actual};};
 const result=await assertCompactCurrentCatalogCopyV198({bind,read:async d=>{await bind(d.path,d.sha256);return read(d.path);}});
 assert.equal(result.changedEffectLiterals,15);assert.equal(result.negativeChecksPassed,7);assert.equal(result.currentFourUnlockDeclarationsUnchanged,true);
 assert.equal(result.dailyFullFileEquivalenceClaimed,false);assert.equal(result.historicalCurrentDailyFullBytesRevalidated,false);
 assert.notEqual(result.currentDaily.sha256,result.historicalDaily.sha256);assert.equal(bindings['src/core/dailyChallenge.ts'],result.currentDaily.sha256);
});
