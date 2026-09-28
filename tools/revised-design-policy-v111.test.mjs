import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deriveDesignPolicy,measurePolicyFacts,verifyReviewedDesign} from './revised-design-policy-families-v111.mjs';
import {loadReviewedDesignSource} from './revised-design-review-expanded-v190.mjs';
import * as starsAndLifts from './revised-design-review-stars-v110.mjs';
import {loadPreviewCore} from './revised-preview-validation-v160.mjs';

// Pure synthetic policy inputs, never source reviews or production certificates.
function facts(){return{width:7,height:8,opening:21,full:21,mechanisms:{
 exits:{ordinaryCount:1,frozenCount:5,frozenValues:[1,1,5,5,5],starCount:0,starFrozenCount:0,starFrozenValues:[],flipCount:0},
 generators:{count:0,queueLengths:[]},covers:{count:0,values:[],hiddenBatchCounts:[]},numericIce:{count:0,values:[],postMeltShellCount:0},
 shells:{count:0},axisBlocks:{count:0,axes:[]},keysLocks:{keyCount:0,lockCount:0,lockValues:[]},starBlocks:{count:0},
 flipDoors:{count:0,initialStates:[]},coloredGrid:{cellCount:0,regionCount:0},bombs:{count:0,values:[]},elevators:{count:0,hiddenBatchCounts:[]},
 irregularBlocks:{openingCount:7,fullCount:7}}};}
function legal(){const s=facts(),d=structuredClone(s);d.mechanisms.irregularBlocks={openingCount:6,fullCount:6};return{s,d};}
test('minimal dual-stage M11 conversion preserves independent source',()=>{const{s,d}=legal(),before=structuredClone(s);const p=deriveDesignPolicy(s,d,187);assert.equal(p.differences.length,2);assert.deepEqual(s,before);assert.equal(p.effectiveFacts.mechanisms.irregularBlocks.fullCount,6);assert(!p.exactMatch);});
test('rejects excessive conversions and unchanged over-30% candidate',()=>{const{s,d}=legal();d.mechanisms.irregularBlocks.fullCount=5;assert.throws(()=>deriveDesignPolicy(s,d,187));assert.throws(()=>deriveDesignPolicy(s,s,187));});
test('cannot dilute the ratio by adding bodies or changing dimensions',()=>{for(const key of ['opening','full','width','height']){const{s,d}=legal();d[key]++;assert.throws(()=>deriveDesignPolicy(s,d,187),/Unchanged source/);}});
test('missing source and sparse parameter slots are never authorized',()=>{for(const value of [null,undefined]){const{s,d}=legal();s.mechanisms.axisBlocks.count=value;assert.throws(()=>deriveDesignPolicy(s,d,187));}const{s,d}=legal();delete s.mechanisms.exits.frozenValues[1];assert.throws(()=>deriveDesignPolicy(s,d,187));});
test('non-conflicting mechanism removals remain errors',()=>{const{s,d}=legal();s.mechanisms.shells.count=2;assert.throws(()=>deriveDesignPolicy(s,d,187));});
test('new ice-capacity exception preserves retained values and maximum port count',()=>{const{s,d}=legal();s.mechanisms.exits.frozenValues=[1,2,3,4,5,6,7,8,9,10];s.mechanisms.exits.frozenCount=10;d.mechanisms.exits.frozenValues=[1,2,3,5,7,9,10];d.mechanisms.exits.frozenCount=7;const p=deriveDesignPolicy(s,d,39);assert.deepEqual(p.retainedFrozenSourceIndices,[0,1,2,4,6,8,9]);assert.equal(p.effectiveFacts.mechanisms.exits.frozenCount,7);});
test('capacity exception cannot erase a mechanism, remove extra gates or lower ice',()=>{const{s,d}=legal();s.mechanisms.exits.frozenValues=[1,2,3,4,5,6,7,8,9,10];s.mechanisms.exits.frozenCount=10;d.mechanisms.exits.frozenValues=[1,2,3,4,5,6,7];d.mechanisms.exits.frozenCount=7;
 const extra=structuredClone(d);extra.mechanisms.exits.frozenCount=6;extra.mechanisms.exits.frozenValues.pop();assert.throws(()=>deriveDesignPolicy(s,extra,39));
 const noPlain=structuredClone(d);noPlain.mechanisms.exits.ordinaryCount=0;assert.throws(()=>deriveDesignPolicy(s,noPlain,39));
 const ice=structuredClone(d);ice.mechanisms.exits.frozenValues[6]=1;assert.throws(()=>deriveDesignPolicy(s,ice,39),/multiplicity/);
});
test('ordinary-only capacity allowance does not enable arbitrary ice removal',()=>{const{s,d}=legal();s.mechanisms.exits.ordinaryCount=5;d.mechanisms.exits.ordinaryCount=3;const p=deriveDesignPolicy(s,d,60);assert.equal(p.effectiveFacts.mechanisms.exits.ordinaryCount,3);d.mechanisms.exits.frozenCount=4;d.mechanisms.exits.frozenValues.pop();assert.throws(()=>deriveDesignPolicy(s,d,60));});
test('normal-capacity source cannot lose an exit just for easier solve',()=>{const{s,d}=legal();d.mechanisms.exits.frozenCount=4;d.mechanisms.exits.frozenValues.pop();assert.throws(()=>deriveDesignPolicy(s,d,187));});
test('grid and overlapping physical inventories explicitly require supported adapters',()=>{const{s,d}=legal();s.mechanisms.coloredGrid={cellCount:1,regionCount:1};s.mechanisms.shells.count=2;assert.throws(()=>deriveDesignPolicy(s,d,200),/adapter/);const q=legal();q.s.mechanisms.exits.overlappingAttributes=true;assert.throws(()=>deriveDesignPolicy(q.s,q.d,176));});
test('opening and full stages are capped independently, allowing legal staging rearrangement',()=>{const{s,d}=legal();s.opening=d.opening=14;s.full=d.full=24;s.mechanisms.irregularBlocks={openingCount:6,fullCount:7};d.mechanisms.irregularBlocks={openingCount:4,fullCount:7};assert.equal(deriveDesignPolicy(s,d,32).differences.length,1);});
test('scope outside Lv21–200 is rejected',()=>{const{s,d}=legal();for(const n of [1,20,201,300])assert.throws(()=>deriveDesignPolicy(s,d,n));});
test('impossible source body inventory and zero frozen values are not normalized away',()=>{const{s,d}=legal();s.mechanisms.irregularBlocks.fullCount=22;assert.throws(()=>deriveDesignPolicy(s,d,187),/body count/);const q=legal();q.s.mechanisms.exits.frozenValues[0]=0;assert.throws(()=>deriveDesignPolicy(q.s,q.d,187),/positive/);});

const {api}=await loadPreviewCore();
const archive=JSON.parse(fs.readFileSync('.codex-temp/remaining161-v110/adoption-cumulative63/adoption-typed.json'));
const row=archive.rows.find(r=>r.levelId===37),historicalRaw=JSON.parse(fs.readFileSync(row.path));
const {source}=await loadReviewedDesignSource(row.sourceReview.path,row.sourceReview.sha256);
function replayFixture(){const raw=structuredClone(historicalRaw);raw.ruleVersion='1.11.0';const f=measurePolicyFacts(raw.level,api);
 if(source.facts.mechanisms.keysLocks.groups)f.mechanisms.keysLocks.groups=api.measureRevisedMechanismInventory(raw.level).keyGroups.map(g=>({keyCount:g.keyCount,lockValues:g.lockCounts}));
 raw.designPolicy={ruleVersion:'1.11.0',differences:deriveDesignPolicy(source.facts,f,37).differences};return raw;}
test('isolated legacy geometry fixture still requires complete fresh model replay',()=>{const checked=verifyReviewedDesign(replayFixture(),source,api);assert(checked.rulesPassed&&checked.replay.complete&&checked.art.passed);assert.equal(historicalRaw.ruleVersion,'1.10.0');});
test('undeclared differences and truncated routes cannot pass full verification',()=>{const raw=replayFixture();raw.designPolicy.differences.push({rule:'free-text-waiver'});assert.throws(()=>verifyReviewedDesign(raw,source,api),/exact delta/);const short=replayFixture();short.drags=short.drags.slice(0,-1);assert.throws(()=>verifyReviewedDesign(short,source,api),/complete replay/);});

// Reuse immutable historical geometry as in-memory test fixtures only. No old
// candidate, source review or production certificate is rewritten/relabelled.
for(const id of [65,197]){
 const r=archive.rows.find(r=>r.levelId===id),original=JSON.parse(fs.readFileSync(r.path));
 const loaded=await starsAndLifts.loadReviewedDesignSource(r.sourceReview.path,r.sourceReview.sha256);
 function fixture(){const raw=structuredClone(original);raw.ruleVersion='1.11.0';raw.designPolicy={ruleVersion:'1.11.0',differences:deriveDesignPolicy(loaded.source.facts,measurePolicyFacts(raw.level,api),id).differences};return raw;}
 test(`positive ${id===65?'lift':'star and frozen-star'} inventory passes complete strict adapter fixture`,()=>{
  assert(id===65?loaded.source.facts.mechanisms.elevators.count>0:loaded.source.facts.mechanisms.starBlocks.count>0);
  const checked=verifyReviewedDesign(fixture(),loaded.source,api);assert(checked.rulesPassed&&checked.replay.valid&&checked.replay.complete&&checked.art.passed);
  assert.equal(original.ruleVersion,'1.10.0');
 });
 test(`positive source family cannot disappear from Lv${id} candidate or be skipped by truncating replay`,()=>{
  const raw=fixture();if(id===65)raw.level.shutters=raw.level.shutters.filter(s=>s.skin!=='lift');else raw.level.blocks.forEach(b=>delete b.star);
  assert.throws(()=>verifyReviewedDesign(raw,loaded.source,api));
  const short=fixture();short.drags=short.drags.slice(0,-1);assert.throws(()=>verifyReviewedDesign(short,loaded.source,api),/complete replay/);
 });
}
