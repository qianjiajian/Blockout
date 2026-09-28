import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {loadApi} from './remake91to100-v146.mjs';
import {verifySource100,verifyStarCases} from './verify-remake91to100-v147.mjs';
import {verifySource99,verifyMechanisms99} from './verify-remake99-source-v147.mjs';
import {verifySource95,verifyMechanisms95} from './verify-remake95-source-v147.mjs';
import {verifySource92,verifyMechanisms92} from './verify-remake92-source-v147.mjs';
import {verifySource93,verifyMechanisms93} from './verify-remake93-source-v147.mjs';
import {verifySource91,verifyMechanisms91} from './verify-remake91-source-v147.mjs';
import {verifySource96,verifyMechanisms96} from './verify-remake96-source-v147.mjs';
import {verifySource94,verifyMechanisms94} from './verify-remake94-source-v147.mjs';
import {verifySource98,verifyMechanisms98} from './verify-remake98-source-v147.mjs';
import {verifySource97,verifyMechanisms97} from './verify-remake97-source-v147.mjs';
import {inspectDisjointWiring} from './remake91to100-wiring-drift.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {inspectDisjointData} from './remake91to100-data-drift.mjs';
import {verifyEarlyIceChoices} from './review-remake91to100-decisions-v147.mjs';
const dir='deliverables/remake91-100-v146-20260924/';
const read=p=>JSON.parse(fs.readFileSync(dir+p)),c95=read('candidate95-root-reviewed-1790265172054.json'),c99=read('candidate99-root-reviewed-1790264811705.json'),c100=read('agent99-100/candidate100-enriched-1790263577321.json'),{api}=await loadApi();
const c92=read('agent91-94/enriched92-1790266477232.json'),c93=read('root93/candidate93-enriched-1790266672402.json');
const c91=read('agent91-94/enriched91-1790266339016.json'),c96=read('agent95-98/candidate96-final-1790268383037.json');
const c94=read('agent91-94/enriched94-current-1790268250127.json'),c98=read('agent95-98/candidate98-enriched-1790267501074.json');
const c97=read('agent97-review/candidate97-enriched-1790270307364.json');

test('98 revised gate candidate has three actual single-ice constraints and rejects false remaining counters',()=>{
 const d=read('agent95-98/candidate98-local-enriched-1790271828034.json');verifySource98(d);
 assert.equal(d.localIceCases.length,3);
 for(const c of d.localIceCases){
  const evidence=verifyEarlyIceChoices({...d,earlyIceChoice:c},api);assert.equal(evidence.length,1);assert(evidence[0].samePrefixVerified);assert.equal(evidence[0].provesGlobalOrder,false);
  assert.throws(()=>verifyEarlyIceChoices({...d,earlyIceChoice:{...c,remainingIce:c.remainingIce+1}},api));
  const changed=structuredClone(d);delete changed.level.blocks.find(b=>b.id===c.blockId).frozen;
  assert.throws(()=>verifyEarlyIceChoices({...changed,earlyIceChoice:c},api));
 }
});
test('97 source and complete mechanism replay remain separate from its independent difficulty proof',()=>{
 assert.equal(verifySource97(c97).keys,3);assert.equal(verifyMechanisms97(c97,api).keys.length,3);
 for(const mutate of [d=>delete d.level.blocks.find(b=>b.keyId).keyId,d=>d.level.blocks.find(b=>b.lockedBy).lockCount=2,d=>d.level.blocks.find(b=>b.shutterId).color='green',d=>d.level.gates.find(g=>g.color==='pink').frozen=6]){const d=structuredClone(c97);mutate(d);assert.throws(()=>verifySource97(d));}
});
test('exact appended disjoint stage is accepted while overlaps and runtime edits are rejected',()=>{
 const p=read('pointer-1790268575487/report.json');
 for(const f of ['src/core/levels.ts','src/game/formalBlockShapes.ts']){const old=fs.readFileSync(p.sourceSnapshot+'/'+f,'utf8'),current=fs.readFileSync(f,'utf8');assert(inspectDisjointWiring(f,[96],old).allOtherBytesUnchanged);assert.throws(()=>inspectDisjointWiring(f,[120],old));assert.throws(()=>inspectDisjointWiring(f,[96],old,current+'\nconsole.log(1);'));const bad=f.endsWith('levels.ts')?current.replace('Math.floor(Number(id))','Math.ceil(Number(id))'):current.replace('levelId !== 5','levelId !== 6');assert.notEqual(bad,current);assert.throws(()=>inspectDisjointWiring(f,[96],old,bad));}
});
test('94 and98 source and unit-move mechanism checks do not imply a difficulty certificate',()=>{
 verifySource94(c94);verifySource98(c98);assert.equal(verifyMechanisms94(c94,api).reveals.length,5);verifyMechanisms98(c98,api);
});
test('94 rejects changed key counts, hidden ice, known cohorts and swapped ice gate colors',()=>{
 for(const mutate of [d=>d.level.blocks.find(b=>b.lockedBy).lockCount=3,d=>d.level.blocks.find(b=>b.frozen).frozen=2,d=>delete d.level.blocks.find(b=>b.shutterId).shutterId,d=>d.level.shutters.find(s=>s.count===20).count=19,d=>d.level.gates.find(g=>g.color==='cyan').frozen=18]){const d=structuredClone(c94);mutate(d);assert.throws(()=>verifySource94(d));}
});
test('98 rejects changed true shell color pairs, carrier ice and omitted known hidden bodies',()=>{
 for(const mutate of [d=>d.level.blocks.find(b=>b.layers&&b.frozen===7).layers=['orange','yellow'],d=>d.level.blocks.find(b=>b.frozen===10).frozen=9,d=>d.level.shutters.find(s=>s.count===14).count=13,d=>d.level.blocks.splice(d.level.blocks.findIndex(b=>b.shutterId),1)]){const d=structuredClone(c98);mutate(d);assert.throws(()=>verifySource98(d));}
});
test('91 hidden ice age and96 exact source carrier pairs replay independently;96 source review is not a floor certificate',()=>{
 verifySource91(c91);assert.equal(verifyMechanisms91(c91,api).thaws.length,3);verifySource96(c96);assert.equal(verifyMechanisms96(c96,api).thaws.length,2);
});
test('91 and96 reject wrong ice colors, carrier direction, keys and excess footprint adaptation',()=>{
 for(const mutate of [d=>d.level.blocks.find(b=>b.frozen===8).color='blue',d=>d.level.blocks.find(b=>b.frozen===12).color='cyan',d=>delete d.level.blocks.find(b=>b.keyId).keyId,d=>d.level.shutters[0].count=9]){const d=structuredClone(c91);mutate(d);assert.throws(()=>verifySource91(d));}
 for(const mutate of [d=>d.level.blocks.find(b=>b.frozen===5).frozen=4,d=>d.level.blocks.find(b=>b.movementAxis==='vertical').movementAxis='horizontal',d=>d.level.blocks.find(b=>b.id==='r147-96-96-24').shape=[[0,0]],d=>d.level.gates.find(g=>g.color==='purple').frozen=15]){const d=structuredClone(c96);mutate(d);assert.throws(()=>verifySource96(d));}
});
test('92 and93 source inventories and actual single-field mechanism cases independently replay',()=>{
 verifySource92(c92);verifySource93(c93);assert.equal(verifyMechanisms92(c92,api).axisSingleFieldCases,1);assert.equal(verifyMechanisms93(c93,api).axisSingleFieldCases,3);
});
test('92 rejects excess recoloring, changed shell/axis/cohort and falsely ordinary added mechanics',()=>{
 for(const mutate of [d=>d.level.gates.find(g=>g.color==='purple').color='blue',d=>d.level.gates.find(g=>g.color==='blue').frozen=4,d=>d.level.blocks.find(b=>b.movementAxis).movementAxis='vertical',d=>d.level.blocks.find(b=>b.layers).layers=['red','blue'],d=>delete d.level.blocks.find(b=>b.shutterId).shutterId,d=>d.level.blocks.find(b=>b.id==='r147-92-o2').frozen=1]){const d=structuredClone(c92);mutate(d);assert.throws(()=>verifySource92(d));}
});
test('93 rejects hidden carrier changes, early reveal, duplicate mapping and aliased pre-peel record',()=>{
 for(const mutate of [d=>d.level.blocks.find(b=>b.id==='r147-93-h18-cyan-axis').movementAxis='horizontal',d=>d.level.shutters[0].count=13,d=>d.sourceReview.blockMapping[1]=d.sourceReview.blockMapping[0],d=>d.level.gates.find(g=>g.color==='red').frozen=14,d=>d.level.blocks.find(b=>b.layers).layers=['green','cyan']]){const d=structuredClone(c93);mutate(d);assert.throws(()=>verifySource93(d));}
 const bad=structuredClone(c93);bad.mechanismEvidence.shellEvents[0].beforeLayers=['purple'];assert.throws(()=>verifyMechanisms93(bad,api));
});
test('current three sources and concrete mechanism counterfactuals independently replay',()=>{
 verifySource95(c95);verifySource99(c99,api);verifySource100(c100);
 assert.equal(verifyMechanisms95(c95,api).keyRemovals.length,4);assert.equal(verifyMechanisms99(c99,api).keyEvents.length,7);assert(verifyStarCases(c100,api).length);
});
test('star source rejects matching forged source/candidate inventories and portal counters',()=>{
 for(const mutate of [d=>{d.level.blocks[0].star=false;d.sourceReview.sourceBlocks[2].star=false;},d=>{d.level.gates[1].frozen=5;d.sourceReview.sourceGates[1].frozen=5;},d=>d.level.blocks.push({...d.level.blocks[0],id:'extra'}),d=>d.sourceReview.stableOpening.sha256='0'.repeat(64)]){const d=structuredClone(c100);mutate(d);assert.throws(()=>verifySource100(d));}
});
test('hidden keys, cohorts, axis, fill and known source bodies cannot be silently changed',()=>{
 for(const mutate of [d=>delete d.level.blocks.find(b=>b.keyId==='blue').keyId,d=>d.level.blocks.find(b=>b.lockCount===4).lockCount=3,d=>delete d.level.blocks.find(b=>b.movementAxis).movementAxis,d=>delete d.level.blocks.find(b=>b.shutterId).shutterId,d=>d.level.shutters[0].count=2,d=>d.level.blocks.find(b=>b.id.includes('fill')).frozen=2]){const d=structuredClone(c99);mutate(d);assert.throws(()=>verifySource99(d,api));}
});
test('95 distinguishes source yellow from its explicit pink adaptation and retains both extra keys',()=>{
 for(const mutate of [d=>d.sourceAdaptation.mapping.find(m=>m.sourceId==='hidden-yellow-key').sourceColor='pink',d=>delete d.level.blocks.find(b=>b.id==='r147-95-hidden-cyan-key').keyId,d=>d.level.blocks.find(b=>b.id==='r147-95-hidden-lock').lockCount=2,d=>d.level.gates.find(g=>g.color==='orange').frozen=13,d=>d.level.blocks.find(b=>b.id.includes('fill')).layers=['red','blue']]){const d=structuredClone(c95);mutate(d);assert.throws(()=>verifySource95(d));}
});
test('same data module permits untouched tested entries and rejects any tested entry change or extra executable statement',()=>{
 const file='src/core/remake91to100.ts',original=fs.readFileSync(file,'utf8');assert.deepEqual(inspectDisjointData(file,[99],original).exactTestedEntriesPreserved,[99]);
 const from=original.indexOf('"99": {'),end=original.indexOf('\n  "100":',from),part=original.slice(from,end);assert(part.includes('"timeSeconds": 150'));
 const changed=original.slice(0,from)+part.replace('"timeSeconds": 150','"timeSeconds": 149')+original.slice(end);assert.throws(()=>inspectDisjointData(file,[99],changed));assert.throws(()=>inspectDisjointData(file,[99],original+'\nconsole.log(1);'));
});
