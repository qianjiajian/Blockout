import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as adapter from './revised-design-policy-bombs-v111.mjs';
import * as families from './revised-design-policy-families-v111.mjs';
import {digest,loadPreviewCore} from './revised-preview-validation-v160.mjs';
import {TIMED_ROUTE_CLOCK_ORIGIN,TIMED_ROUTE_POINTER_POLICY} from './revised-timed-route-v110.mjs';

const {api}=await loadPreviewCore();
const scratch=fs.mkdtempSync(path.resolve('.codex-temp/remaining98-v111/early/bomb-policy-test-fixtures-'));
let serial=0;
const json=file=>JSON.parse(fs.readFileSync(file));
const archive=json('.codex-temp/remaining161-v110/adoption-cumulative63/adoption-typed.json');
const old120=archive.rows.find(r=>r.levelId===120);
const raw120=json(old120.path),review120=json(old120.sourceReview.path);
const loaded120=await adapter.loadReviewedDesignSource(old120.sourceReview.path,old120.sourceReview.sha256);

function timed(raw) {
  let at=0;
  const events=[],push=(type,data={})=>events.push({type,dtSeconds:.1,atSeconds:at+=.1,...data});
  for(const drag of raw.drags) {
    push('down',{blockId:drag.blockId});
    for(const anchor of drag.path)push('move',{anchor});
    push('up');
  }
  raw.timedRoute={schemaVersion:1,levelSha256:digest(raw.level),clockOrigin:TIMED_ROUTE_CLOCK_ORIGIN,
    pointerPolicy:TIMED_ROUTE_POINTER_POLICY,durationSeconds:at,events};
}
function declare(raw,source) {
  raw.ruleVersion='1.11.0';
  raw.designPolicy={ruleVersion:'1.11.0',differences:adapter.deriveDesignPolicy(source.facts,adapter.measurePolicyFacts(raw.level,api),raw.level.id).differences};
  return raw;
}
function itemFor(raw,sourceReview=old120.sourceReview) {
  const file=path.join(scratch,`candidate-test-${serial++}.json`),bytes=JSON.stringify(raw);
  fs.writeFileSync(file,bytes,{flag:'wx'});
  return {path:file,sha256:digest(bytes),levelId:raw.level.id,sourceReview};
}
function historical120() {return {raw:declare(structuredClone(raw120),loaded120.source),source:structuredClone(loaded120.source)};}

// These mutations are explicitly synthetic adapter fixtures, NOT competitor
// observations, generated campaign designs, Pointer runs or adoption candidates.
function synthetic(id=36,select) {
  const dir=id===36?'.codex-temp/remaining98-v111/early':'.codex-temp/remaining98-v111/middle/lv39';
  const raw=json(`${dir}/candidate-${id}.json`),review=json(`${dir}/source-review-${id}.json`);
  const frame=review.evidence[0];
  review.testFixtureOnly=true;review.status='synthetic-test-only-not-source-evidence';
  review.bindings={[frame.path]:frame.sha256};review.evidence=[frame];review.stableOpeningEvidence=frame.path;
  for(const observation of Object.values(review.sourceInventory))observation.evidencePaths=[frame.path];
  if(review.carrierRelationsEvidence)review.carrierRelationsEvidence.paths=[frame.path];
  const carrier=select?select(raw.level):raw.level.blocks.find(b=>b.id===raw.drags[0].blockId);
  carrier.timedBombSeconds=100;
  review.sourceNormalizedFacts.mechanisms.bombs={count:1,values:[100]};
  const observation=review.sourceInventory.M07??review.sourceInventory.bombs;
  observation.count=1;observation.values=[100];observation.reason='Synthetic test only';
  review.sourceFacts.bombs={items:[{sourceId:'synthetic-only',seconds:100,shell:(carrier.layers?.length??0)>1,
    frozen:carrier.frozen??0,axis:carrier.movementAxis??null,keyGroup:null,lockGroup:null,star:false,
    reason:'Synthetic adapter fixture, not source evidence',evidencePaths:[frame.path]}]};
  timed(raw);
  return {raw,review,carrierId:carrier.id};
}
async function loadSynthetic(fixture=synthetic()) {
  const file=path.join(scratch,`synthetic-source-test-${serial++}.json`),bytes=JSON.stringify(fixture.review);
  fs.writeFileSync(file,bytes,{flag:'wx'});
  const loaded=await adapter.loadReviewedDesignSource(file,digest(bytes));
  return {...fixture,...loaded,sourceReview:{path:file,sha256:digest(bytes)}};
}
const synthetic36=await loadSynthetic(),synthetic39=await loadSynthetic(synthetic(39));
const fixture36=()=>({raw:declare(structuredClone(synthetic36.raw),synthetic36.source),source:structuredClone(synthetic36.source)});

test('positive bomb plus minimal dual-stage M11 conversion has fresh complete positive-time witness',()=>{
  const {raw,source}=fixture36(),before=structuredClone({raw,source});
  const checked=adapter.verifyReviewedDesign(raw,source,api);
  assert(checked.rulesPassed&&checked.replay.valid&&checked.replay.complete&&checked.timedModelValidated);
  assert.equal(checked.policy.differences.length,2);
  assert.deepEqual(checked.sourceNormalizedFacts.mechanisms.irregularBlocks,{openingCount:5,fullCount:6});
  assert.deepEqual(checked.proposedFacts.mechanisms.irregularBlocks,{openingCount:3,fullCount:4});
  assert.deepEqual(checked.sourceContract.mechanisms.bombSeconds,[100]);
  assert.equal(checked.replay.timedRouteSha256,digest(raw.timedRoute));
  assert.equal(checked.replay.levelSha256,digest(raw.level));
  assert(checked.replay.activeElapsedSeconds>0);
  for(const key of ['pointerReplayValidated','formalTimeValidated','timeValidated','timeAndStarsCalibrated','lowerBoundCertified','releaseApproved'])assert.equal(checked[key],false);
  assert.deepEqual({raw,source},before,'All caller inputs remain unchanged');
});
test('positive bomb plus maximal retained ice mouths preserves source and every retained initial value',()=>{
  const source=structuredClone(synthetic39.source),raw=declare(structuredClone(synthetic39.raw),source);
  const checked=adapter.verifyReviewedDesign(raw,source,api);
  assert(checked.replay.complete);
  assert.equal(source.facts.mechanisms.exits.frozenCount,10);
  assert.equal(checked.sourceContract.mechanisms.exits.length,11);
  assert.equal(checked.effectiveDesignContract.mechanisms.exits.length,8);
  assert.equal(checked.policy.effectiveFacts.mechanisms.exits.frozenCount,7);
  assert.deepEqual(checked.policy.retainedFrozenSourceIndices.map(i=>source.facts.mechanisms.exits.frozenValues[i]),checked.proposedFacts.mechanisms.exits.frozenValues);
});
test('historical three-bomb geometry remains exact and shell bomb disarms on peel with live core',()=>{
  const {raw,source}=historical120(),checked=adapter.verifyReviewedDesign(raw,source,api);
  assert(checked.exactMatch&&checked.replay.complete);
  assert.equal(checked.replay.bombLifecycle.length,3);
  assert(checked.replay.bombLifecycle.some(b=>b.disarmKind==='shell-peel'));
  assert.deepEqual(checked.sourceNormalizedFacts.mechanisms.bombs.values,source.facts.mechanisms.bombs.values);
  assert.equal(raw120.ruleVersion,'1.10.0','Historical file was not relabelled');
});
test('synthetic ice and bomb remain on the same shell carrier through thaw and peel',()=>{
  const {raw,source}=historical120();
  const block=raw.level.blocks.find(b=>b.timedBombSeconds&&b.layers?.length>1);
  block.frozen=1;
  source.sourceFacts.bombs.items.find(b=>b.shell).frozen=1;
  source.sourceFacts.numericIce.items=[{value:1,post_melt_shell:true}];
  source.facts.mechanisms.numericIce={count:1,values:[1],postMeltShellCount:1};
  source.sourceContract.mechanisms.numericIceValues=[1];
  declare(raw,source);timed(raw);
  const checked=adapter.verifyReviewedDesign(raw,source,api);
  const life=checked.replay.bombLifecycle.find(b=>b.blockId===block.id);
  assert(life.firstActiveAtSeconds>0&&life.disarmKind==='shell-peel');
  assert(checked.bombCarriers.items.some(b=>b.frozen===1&&b.shell));
});
test('hidden frozen bomb activates after reveal and last ice decrement, not opening or first click',async()=>{
  const f=await loadSynthetic(synthetic(39,level=>level.blocks.find(b=>b.shutterId&&b.frozen>0)));
  declare(f.raw,f.source);
  const checked=adapter.verifyReviewedDesign(f.raw,f.source,api),life=checked.replay.bombLifecycle[0];
  assert(life.firstActiveAtSeconds>0&&life.disarmedAtSeconds>life.firstActiveAtSeconds);
  const before=checked.replay.trace.filter(t=>t.atSeconds<life.firstActiveAtSeconds).flatMap(t=>t.bombsAfter);
  assert(before.length&&before.every(b=>!b.active&&b.remainingSeconds===100));
});
test('queued bomb remains inactive until the real generator releases its full footprint',async()=>{
  const f=await loadSynthetic(synthetic(36,level=>level.blocks.find(b=>b.id===level.generators[0].queueBlockIds[0])));
  declare(f.raw,f.source);
  const checked=adapter.verifyReviewedDesign(f.raw,f.source,api),life=checked.replay.bombLifecycle[0];
  assert(life.firstActiveAtSeconds>0);
  assert(checked.replay.trace.some(t=>t.bombsAfter.some(b=>b.queued&&b.remainingSeconds===100)));
});

for(const [name,mutate] of [
  ['unknown count',r=>{r.sourceNormalizedFacts.mechanisms.bombs.count=null;}],
  ['missing initial seconds',r=>{delete r.sourceNormalizedFacts.mechanisms.bombs.values;}],
  ['zero initial seconds',r=>{r.sourceNormalizedFacts.mechanisms.bombs.values=[0];}],
  ['negative initial seconds',r=>{r.sourceNormalizedFacts.mechanisms.bombs.values=[-1];}],
  ['unknown initial seconds',r=>{r.sourceNormalizedFacts.mechanisms.bombs.values=[null];}],
  ['missing metadata',r=>{delete r.sourceFacts.bombs;}],
  ['unknown shell',r=>{delete r.sourceFacts.bombs.items[0].shell;}],
  ['unknown ice',r=>{delete r.sourceFacts.bombs.items[0].frozen;}],
  ['unknown axis',r=>{delete r.sourceFacts.bombs.items[0].axis;}],
  ['unknown star',r=>{delete r.sourceFacts.bombs.items[0].star;}],
  ['unreviewed bomb key',r=>{r.sourceFacts.bombs.items[0].keyGroup='red';}],
  ['unreviewed bomb lock',r=>{r.sourceFacts.bombs.items[0].lockGroup='red';}],
  ['unbound carrier evidence',r=>{r.sourceFacts.bombs.items[0].evidencePaths=['not-bound'];}],
  ['bomb observation mismatch',r=>{(r.sourceInventory.M07??r.sourceInventory.bombs).values=[99];}],
  ['missing observation family',r=>{delete r.sourceInventory[Object.keys(r.sourceInventory)[0]];}],
  ['unknown other mechanism',r=>{r.sourceNormalizedFacts.mechanisms.axisBlocks.count=null;}],
  ['unresolved source',r=>{r.unresolved=['not known'];}],
  ['duplicate source identity',r=>{r.sourceFacts.bombs.items.push(structuredClone(r.sourceFacts.bombs.items[0]));r.sourceNormalizedFacts.mechanisms.bombs={count:2,values:[100,100]};const o=r.sourceInventory.M07??r.sourceInventory.bombs;o.count=2;o.values=[100,100];}],
])test(`source loader rejects ${name}`,async()=>{
  const f=synthetic();mutate(f.review);await assert.rejects(loadSynthetic(f));
});

for(const [name,mutate] of [
  ['positive lift',m=>{m.elevators={count:1,hiddenBatchCounts:[[1]]};}],
  ['positive star',m=>{m.starBlocks.count=1;}],
  ['positive colored grid',m=>{m.coloredGrid={cellCount:1,regionCount:1};}],
  ['overlapping flip ice',m=>{m.exits.overlappingAttributes=true;}],
  ['mixed keyed ice',m=>{m.keysLocks.groups=[{keyCount:1,lockValues:[],frozenKeyValues:[1]}];}],
])test(`unsupported joint ${name} cannot be stripped or passed to a weaker branch`,async()=>{
  const f=synthetic();mutate(f.review.sourceNormalizedFacts.mechanisms);
  await assert.rejects(loadSynthetic(f),/adapter/);
  const {raw,source}=fixture36();mutate(source.facts.mechanisms);
  assert.throws(()=>adapter.verifyReviewedDesign(raw,source,api),/adapter/);
});
test('unknown or contradictory zero bomb source cannot select nonbomb delegate',()=>{
  for(const b of [{count:0,values:[100]},{count:undefined,values:[]},{count:1,values:[NaN]}]) {
    const {raw,source}=fixture36();source.facts.mechanisms.bombs=b;
    assert.throws(()=>adapter.verifyReviewedDesign(raw,source,api),/source bomb/);
  }
});
test('no extra M11 reduction, body dilution, ice deletion or altered timers is authorized',()=>{
  for(const mutate of [f=>{f.mechanisms.irregularBlocks.fullCount--;},f=>{f.full++;},
    f=>{f.mechanisms.bombs.values[0]=99;},f=>{f.mechanisms.generators.count=0;f.mechanisms.generators.queueLengths=[];}]) {
    const {raw,source}=fixture36(),facts=adapter.measurePolicyFacts(raw.level,api);mutate(facts);
    assert.throws(()=>adapter.deriveDesignPolicy(source.facts,facts,36));
  }
  const s=synthetic39.source.facts,d=adapter.measurePolicyFacts(synthetic39.raw.level,api);
  d.mechanisms.exits.frozenValues.pop();d.mechanisms.exits.frozenCount--;
  assert.throws(()=>adapter.deriveDesignPolicy(s,d,39),/maximum number/);
});
test('bomb omission and changed seconds cannot be rescued by a new timing hash or policy label',()=>{
  for(const mutate of [b=>delete b.timedBombSeconds,b=>{b.timedBombSeconds=120;}]) {
    const {raw,source}=fixture36();mutate(raw.level.blocks.find(b=>b.timedBombSeconds));timed(raw);
    assert.throws(()=>adapter.verifyReviewedDesign(raw,source,api));
  }
});
test('identical timer/shell totals cannot move a shell bomb onto a plain carrier',()=>{
  const {raw,source}=historical120();
  const shell=raw.level.blocks.find(b=>b.timedBombSeconds&&b.layers?.length>1);
  const plain=raw.level.blocks.find(b=>b.timedBombSeconds&&!b.layers?.length);
  [plain.timedBombSeconds,shell.timedBombSeconds]=[shell.timedBombSeconds,plain.timedBombSeconds];timed(raw);
  assert.throws(()=>adapter.verifyReviewedDesign(raw,source,api),/carrier association/);
});
test('bomb and non-bomb ice-shell colocation remain independently enforced',()=>{
  const f=historical120();
  const bomb=f.source.sourceFacts.bombs.items[0];bomb.frozen=4;
  assert.throws(()=>adapter.verifyReviewedDesign(f.raw,f.source,api),/carrier association/);
  const source=structuredClone(synthetic39.source),raw=declare(structuredClone(synthetic39.raw),source);
  source.sourceFacts.numericIce.items[0].post_melt_shell=true;
  assert.throws(()=>adapter.verifyReviewedDesign(raw,source,api),/Ice\/shell colocation/);
});
test('loaded metadata cannot silently omit key/lock/star status during direct verification',()=>{
  for(const key of ['keyGroup','lockGroup','star']) {
    const {raw,source}=fixture36();delete source.sourceFacts.bombs.items[0][key];
    assert.throws(()=>adapter.verifyReviewedDesign(raw,source,api),/joint adapter/);
  }
});
test('undeclared policy differences, free-text waivers and old rule labels are rejected',()=>{
  for(const mutate of [r=>{delete r.designPolicy;},r=>{r.designPolicy.differences=[];},
    r=>{r.designPolicy.differences.push({rule:'free-text-waiver'});},r=>{r.ruleVersion='1.10.0';}]) {
    const {raw,source}=fixture36();mutate(raw);assert.throws(()=>adapter.verifyReviewedDesign(raw,source,api));
  }
});
for(const [name,mutate] of [
  ['missing timed route',r=>{delete r.timedRoute;}],
  ['zero elapsed',r=>{r.timedRoute.events.forEach(e=>{e.dtSeconds=0;e.atSeconds=0;});r.timedRoute.durationSeconds=0;}],
  ['NaN elapsed',r=>{r.timedRoute.events[0].dtSeconds=NaN;}],
  ['negative elapsed',r=>{r.timedRoute.events[0].dtSeconds=-1;}],
  ['missing elapsed',r=>{delete r.timedRoute.events[0].dtSeconds;}],
  ['skipped clock interval',r=>{r.timedRoute.events[1].atSeconds+=1;}],
  ['truncated canonical route',r=>{r.drags.pop();}],
  ['first-contact movement after automatic exit',r=>{r.timedRoute.events[1].type='move';r.timedRoute.events[1].anchor=[0,0];}],
  ['expired level deadline',r=>{r.level.timeSeconds=.05;r.timedRoute.levelSha256=digest(r.level);}]
])test(`timed whole-model verification rejects ${name}`,()=>{
  const {raw,source}=fixture36();mutate(raw);assert.throws(()=>adapter.verifyReviewedDesign(raw,source,api));
});
test('timeout is charged before the first action, including an unselected operable bomb',()=>{
  const {raw,source}=fixture36();
  const wait=101;raw.timedRoute.events.forEach(e=>{e.atSeconds+=wait;});
  raw.timedRoute.events.unshift({type:'wait',dtSeconds:wait,atSeconds:wait});raw.timedRoute.durationSeconds+=wait;
  assert.throws(()=>adapter.verifyReviewedDesign(raw,source,api),/Fresh complete replay/);
});
test('pause excludes countdown but never permits time-free gameplay',()=>{
  const {raw,source}=fixture36(),prefix=[{type:'pause',dtSeconds:.1,atSeconds:.1},
    {type:'wait',dtSeconds:101,atSeconds:101.1},{type:'resume',dtSeconds:.1,atSeconds:101.2}];
  for(const event of raw.timedRoute.events)event.atSeconds+=101.2;
  raw.timedRoute.events.unshift(...prefix);raw.timedRoute.durationSeconds+=101.2;
  const checked=adapter.verifyReviewedDesign(raw,source,api);assert(checked.replay.pausedElapsedSeconds>101);
  const bad=structuredClone(raw);bad.timedRoute.events[2]={...bad.timedRoute.events[2],type:'down',blockId:bad.drags[0].blockId};
  assert.throws(()=>adapter.verifyReviewedDesign(bad,source,api),/Fresh complete replay/);
});

test('nonbomb verification delegates unchanged family semantics including M11 policy and lifts',async()=>{
  for(const id of [36,65]) {
    const row=id===36?{path:'.codex-temp/remaining98-v111/early/candidate-36.json',sourceReview:{path:'.codex-temp/remaining98-v111/early/source-review-36.json'}}:archive.rows.find(r=>r.levelId===id);
    row.sourceReview.sha256??=digest(fs.readFileSync(row.sourceReview.path));
    const loaded=await adapter.loadReviewedDesignSource(row.sourceReview.path,row.sourceReview.sha256),raw=declare(json(row.path),loaded.source);
    assert.deepEqual(adapter.verifyReviewedDesign(raw,loaded.source,api),families.verifyReviewedDesign(raw,loaded.source,api));
  }
});
test('checkCandidate binds original positive source, route and current inputs with full strict validation',async()=>{
  const {raw}=historical120();raw.bindings={'tools/revised-design-policy-bombs-v111.mjs':digest(fs.readFileSync('tools/revised-design-policy-bombs-v111.mjs'))};
  const item=itemFor(raw),result=await adapter.checkCandidate(item,api);
  assert(result.checked.replay.complete&&result.checked.timedModelValidated);
  assert.equal(result.inputBindings[item.path],item.sha256);
  assert.equal(result.inputBindings[old120.sourceReview.path],old120.sourceReview.sha256);
  assert.equal(result.adapter.verifyReviewedDesign,adapter.verifyReviewedDesign);
  assert.deepEqual(result.historicalNonSourceDrift,[]);
});
test('historical non-source art drift remains explicit and revalidation-required, never silently rebound',async()=>{
  const {raw}=historical120();raw.bindings={'src/game/artManifest.ts':'0'.repeat(64)};
  const result=await adapter.checkCandidate(itemFor(raw),api);
  assert.equal(result.historicalNonSourceDrift.length,1);
  assert.equal(result.historicalNonSourceDrift[0].revalidationRequired,true);
  assert.equal(result.inputBindings['src/game/artManifest.ts'],digest(fs.readFileSync('src/game/artManifest.ts')));
  assert.equal(result.checked.pointerReplayValidated,false);
});
test('core historical drift, candidate/source SHA drift and fixture sources remain rejected',async()=>{
  const {raw}=historical120();raw.bindings={'src/core/PuzzleModel.ts':'0'.repeat(64)};
  await assert.rejects(adapter.checkCandidate(itemFor(raw),api),/Candidate input changed/);
  const good=historical120().raw;good.bindings={};const item=itemFor(good);
  await assert.rejects(adapter.checkCandidate({...item,sha256:'0'.repeat(64)},api),/Evidence drift/);
  await assert.rejects(adapter.checkCandidate({...item,sourceReview:{...item.sourceReview,sha256:'0'.repeat(64)}},api),/Evidence drift/);
  await assert.rejects(adapter.checkCandidate(itemFor(declare(structuredClone(synthetic36.raw),synthetic36.source),synthetic36.sourceReview),api),/Synthetic fixture/);
});
test('checkCandidate preserves independent carrier relation evidence gate',async()=>{
  const {raw}=historical120();raw.bindings={};
  const review=structuredClone(review120);review.carrierRelations={axisFrozenCount:0};delete review.carrierRelationsEvidence;
  const file=path.join(scratch,`real-source-carrier-negative-${serial++}.json`),bytes=JSON.stringify(review);
  // Negative test only: an unqualified copy cannot become an accepted source.
  fs.writeFileSync(file,bytes,{flag:'wx'});
  await assert.rejects(adapter.checkCandidate(itemFor(raw,{path:file,sha256:digest(bytes)}),api),/Carrier observations need explicit evidence/);
});
test('checkCandidate nonbomb branch has identical bindings and evidence semantics to families',async()=>{
  const file='.codex-temp/remaining98-v111/early/candidate-36.json',sourcePath='.codex-temp/remaining98-v111/early/source-review-36.json';
  const item={path:file,sha256:digest(fs.readFileSync(file)),levelId:36,sourceReview:{path:sourcePath,sha256:digest(fs.readFileSync(sourcePath))}};
  const a=await adapter.checkCandidate(item,api),b=await families.checkCandidate(item,api);
  assert.deepEqual(a,b);
});
