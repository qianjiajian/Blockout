import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest,loadPreviewCore} from './revised-preview-validation-v160.mjs';
import {auditPlainGridSource,singleLayerIceThresholdProof} from './revised-colored-grid-conflicts-v111.mjs';
import {loadReviewedDesignSource,deriveDesignPolicy,verifyReviewedDesign} from './revised-design-policy-colored-grids-v111.mjs';
const sourcePath='.codex-temp/remaining98-v111/late/new200/source-review-200-v2.json';
const sourceSha='13595223cee2adb7c26c25f43aad2aeaf6c27435cf9a939d427ccdaa222d1025';
assert.equal(digest(fs.readFileSync(sourcePath)),sourceSha);
const original=JSON.parse(fs.readFileSync(sourcePath)),clone=()=>structuredClone(original);
const guards=[sourcePath,'tools/revised-design-policy-joint-stars-v111.mjs','tools/revised-design-policy-families-v111.mjs'];
const hashes=()=>Object.fromEntries(guards.map(p=>[p,digest(fs.readFileSync(p))]));const before=hashes();after(()=>assert.deepEqual(hashes(),before));
test('observed200 keeps11 bodies,12 red cells,2 ice3 shell carriers and7 physical mouths',()=>{
 const saved=clone(),a=auditPlainGridSource(original);
 assert.equal(a.bodies.length,11);assert.equal(a.grids.length,1);assert.equal(a.grids[0].cells.length,12);assert.equal(a.gates.length,7);
 assert.deepEqual(a.bodies.filter(b=>b.frozen).map(b=>[b.frozen,b.innerColor]),[[3,'red'],[3,'red']]);assert.deepEqual(original,saved);
});
test('rank proof changes only impossible tail thresholds by minimal total3',()=>{
 const p=singleLayerIceThresholdProof(original.sourceNormalizedFacts);
 assert.deepEqual(p.sourceValues,[3,5,6,9,10,11]);assert.deepEqual(p.designValues,[3,5,6,8,9,10]);
 assert.deepEqual(p.rows.map(r=>r.maximumPriorClearEvents),[5,6,7,8,9,10]);assert.equal(p.minimumTotalDecrement,3);
 assert.equal(p.originalClearEventCapacity,13);assert.equal(p.designClearEventCapacity,11);
 assert(!p.solvabilityProven&&!p.necessityRepositioningCertified);
});
test('all small sorted threshold vectors: clipping is greatest feasible vector, not arbitrary simplification',()=>{
 for(let N=3;N<=7;N++)for(let K=1;K<Math.min(N,5);K++){
  const enumerate=(prefix,fn)=>{if(prefix.length===K)return fn(prefix);for(let x=prefix.at(-1)??1;x<=N+1;x++)enumerate([...prefix,x],fn);};
  enumerate([],values=>{
   const f=structuredClone(original.sourceNormalizedFacts);f.full=f.opening=N;f.mechanisms.exits={...f.mechanisms.exits,ordinaryCount:1,frozenCount:K,frozenValues:values};
   const p=singleLayerIceThresholdProof(f),cap=p.designValues;
   assert(cap.every((v,i)=>v<=values[i]&&v<=N-K+i&&(i===0||v>=cap[i-1])));
   // Enumerate every downward adjustment. No feasible vector retains more.
   const visit=(prefix)=>{const i=prefix.length;if(i===K){assert(prefix.reduce((a,b)=>a+b,0)<=cap.reduce((a,b)=>a+b,0));return;}
    for(let v=prefix.at(-1)??1;v<=Math.min(values[i],N-K+i);v++)visit([...prefix,v]);};visit([]);
  });
 }
});
test('unsorted source threshold identities retain their own original indices',()=>{
 const f=structuredClone(original.sourceNormalizedFacts);f.mechanisms.exits.frozenValues=[11,3,10,5,9,6];
 const p=singleLayerIceThresholdProof(f);assert.deepEqual(p.rows.map(r=>[r.sourceIndex,r.designValue]),[[1,3],[3,5],[5,6],[4,8],[2,9],[0,10]]);
});
test('loader binds physical colored groups without overwriting original source facts',async()=>{
 const loaded=await loadReviewedDesignSource(sourcePath,sourceSha);assert.deepEqual(loaded.source.facts,original.sourceNormalizedFacts);
 assert.deepEqual(loaded.source.sourceContract.mechanisms.coloredGridCellCounts,[12]);assert.equal(loaded.source.sourceContract.mechanisms.shellBlocks,2);
 assert.deepEqual(loaded.source.sourceFacts.numericIce.items.map(i=>i.post_melt_shell),[true,true]);
});
const rejects=(name,mutate)=>test(name,()=>{const r=clone();mutate(r);assert.throws(()=>auditPlainGridSource(r));});
rejects('missing source body rejects',r=>r.sourceCohorts.opening.pop());
rejects('missing source ice carrier rejects',r=>delete r.sourceCohorts.opening.find(b=>b.frozen).frozen);
rejects('missing source shell carrier rejects',r=>delete r.sourceCohorts.opening.find(b=>b.innerColor).innerColor);
rejects('wrong ice-shell association rejects',r=>r.sourceFacts.numericIce.items[0].post_melt_shell=false);
rejects('unknown source axis cannot project away',r=>r.sourceCohorts.opening[0].movementAxis='horizontal');
rejects('source duplicate footprint rejects',r=>r.sourceCohorts.opening[1]={...r.sourceCohorts.opening[0]});
rejects('duplicate source shape cell rejects',r=>r.sourceCohorts.opening[0].shape[1]=r.sourceCohorts.opening[0].shape[0]);
rejects('missing colored region rejects',r=>r.sourceGrids=[]);
rejects('missing colored cell rejects',r=>r.sourceGrids[0].cells.pop());
rejects('duplicate colored cell rejects',r=>r.sourceGrids[0].cells[1]=r.sourceGrids[0].cells[0]);
rejects('outside colored cell rejects',r=>r.sourceGrids[0].cells[0]=[99,0]);
rejects('unbound colored evidence rejects',r=>r.sourceGrids[0].evidencePaths=['missing.jpg']);
rejects('missing source physical mouth rejects',r=>r.sourceExits.pop());
rejects('duplicated mouth identity rejects',r=>r.sourceExits[1].id=r.sourceExits[0].id);
rejects('star mouth invalidates rank proof',r=>r.sourceExits[0].star=true);
rejects('unknown flip mouth cannot pass as plain',r=>r.sourceExits[0].initiallyOpen=false);
rejects('source ice threshold cannot be silently changed',r=>r.sourceExits.find(g=>g.frozen).frozen++);
rejects('source rectangle holes cannot pass',r=>r.sourceBoard.cells.pop());
rejects('source internal wall cannot pass',r=>r.sourceBoard.internalWallCells=[[2,2]]);
rejects('source unresolved evidence blocks',r=>r.evidenceGaps=['not observed']);
for(const key of ['generators','covers','elevators','bombs','starBlocks','axisBlocks'])rejects(`positive ${key} requires another proof`,r=>r.sourceNormalizedFacts.mechanisms[key].count++);
rejects('source keys require a separate proof',r=>r.sourceNormalizedFacts.mechanisms.keysLocks.keyCount=1);
rejects('hidden source bodies require a separate proof',r=>r.sourceNormalizedFacts.opening--);
rejects('no grid is not the removal conflict',r=>r.sourceNormalizedFacts.mechanisms.coloredGrid.cellCount=0);
rejects('no source shells does not authorize ice simplification',r=>r.sourceNormalizedFacts.mechanisms.shells.count=0);
const design=()=>{const d=structuredClone(original.sourceNormalizedFacts);d.mechanisms.shells.count=0;d.mechanisms.numericIce.postMeltShellCount=0;d.mechanisms.exits.frozenValues=[3,5,6,8,9,10];return d;};
test('exact mandatory source delta remains separate from unmodified evidence',()=>{
 const d=design(),p=deriveDesignPolicy(original.sourceNormalizedFacts,d,200);assert.deepEqual(p.effectiveFacts,d);assert.equal(p.approvedDifferenceCount,3);
 assert.equal(p.sourceFactsSha256,digest(original.sourceNormalizedFacts));assert.equal(p.exactMatch,false);
});
for(const[name,mutate]of[
 ['ice reduced more than bound',d=>d.mechanisms.exits.frozenValues[0]--],['retained impossible ice',d=>d.mechanisms.exits.frozenValues[5]++],
 ['ice carrier count',d=>d.mechanisms.numericIce.count--],['ice value',d=>d.mechanisms.numericIce.values[0]--],
 ['colored quantity',d=>d.mechanisms.coloredGrid.cellCount--],['colored groups',d=>d.mechanisms.coloredGrid.regionCount++],
 ['body total',d=>d.full++],['opening total',d=>d.opening--],['ordinary mouth',d=>d.mechanisms.exits.ordinaryCount++],
 ['frozen mouth quantity',d=>d.mechanisms.exits.frozenCount--],['shell left behind',d=>d.mechanisms.shells.count=1],
 ['unrelated M11 redesign',d=>d.mechanisms.irregularBlocks.fullCount=1]])test(`narrow adapter rejects ${name}`,()=>{const d=design();mutate(d);assert.throws(()=>deriveDesignPolicy(original.sourceNormalizedFacts,d,200));});
const rawPath='.codex-temp/remaining98-v111/late/new200/candidate-200e-raw.json';
assert.equal(digest(fs.readFileSync(rawPath)),'5f51edceacdfc25c0150395be513fd37c9f8329dde8298f8099dabd41e3209a5');
const raw=JSON.parse(fs.readFileSync(rawPath));
raw.designPolicy={ruleVersion:'1.11.0',differences:deriveDesignPolicy(original.sourceNormalizedFacts,design(),200).differences};
const {api}=await loadPreviewCore(),{source}=await loadReviewedDesignSource(sourcePath,sourceSha);
test('real200 independently passes full inventory, colored collisions, formal art and17-drag completion',()=>{
 const saved=structuredClone(source),r=verifyReviewedDesign(raw,source,api);
 assert(r.coverage.passed&&r.art.passed&&r.replay.valid&&r.replay.complete);assert.equal(r.replay.effectiveDrags,17);assert.equal(r.replay.clearEvents,11);
 assert.equal(r.policy.minimumTotalDecrement,undefined);assert.equal(r.coloredGridAudit.thresholdProof.minimumTotalDecrement,3);
 assert(!r.pointerReplayValidated&&!r.timeValidated&&!r.lowerBoundCertified&&!r.releaseApproved);assert.deepEqual(source,saved);
});
test('full verification maps unsorted source ice values by identity, not sorted array position',()=>{
 const s=structuredClone(source),r=structuredClone(raw),values=[11,5,9,3,10,6];
 s.facts.mechanisms.exits.frozenValues=values;s.plainGridSource.sourceNormalizedFacts.mechanisms.exits.frozenValues=values;
 s.sourceContract.mechanisms.exits=[{kind:'ordinary',frozen:0,star:false},...values.map(frozen=>({kind:'ordinary',frozen,star:false}))];
 r.designPolicy={ruleVersion:'1.11.0',differences:deriveDesignPolicy(s.facts,design(),200).differences};
 const checked=verifyReviewedDesign(r,s,api);assert(checked.replay.complete);
 assert.deepEqual(checked.effectiveDesignContract.mechanisms.exits.filter(g=>g.frozen).map(g=>g.frozen),[10,5,8,3,9,6]);
});
for(const[name,mutate]of[
 ['partial path',r=>r.drags.pop()],['wrong-color grid',r=>r.level.coloredGrids[0].color='blue'],
 ['missing grid cell',r=>r.level.coloredGrids[0].cells.pop()],['duplicate grid cell',r=>r.level.coloredGrids[0].cells[1]=r.level.coloredGrids[0].cells[0]],
 ['grid on mismatched initial footprint',r=>r.level.coloredGrids[0].cells[0]=[5,0]],
 ['ice number cleared',r=>r.level.blocks.find(b=>b.frozen).frozen=0],
 ['extra shell',r=>r.level.blocks[0].layers=['red','green']],
 ['too-wide actual exit',r=>r.level.gates[0].size=4],
 ['source shell delta concealed',r=>r.designPolicy.differences.shift()],
 ['source ice delta mislabeled',r=>r.designPolicy.differences.at(-1).sourceValue=[3,5,6,8,9,10]],
 ['unused or duplicate exit color',r=>r.level.gates[1].color='red']])test(`real replay cannot admit ${name}`,()=>{const r=structuredClone(raw);mutate(r);assert.throws(()=>verifyReviewedDesign(r,source,api));});
