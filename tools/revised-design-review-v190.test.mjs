import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadPreviewCore} from './revised-preview-validation-v160.mjs';
import {loadReviewedDesignSource,verifyReviewedDesign} from './revised-design-review-v190.mjs';
const {api}=await loadPreviewCore();
const specs=[
 [60,'.codex-temp/strict-alignment-v190/lv060/candidate-60.json','.codex-temp/strict-alignment-v190/source-capacity-audit/source-review-lv060.json','5fa488bf2f7b5fb23eb9351e0081c7c49cdad5b7308d33b0abb4d59d940dfab3',35],
 [135,'.codex-temp/strict-alignment-v190/new-candidates/candidate-135.json','.codex-temp/strict-alignment-v190/new-candidates/source-review-135.json','e50a69309602593cdf24ef7da4c4bd03b3f529286d72ec6b8e1c606b8f4d18a0',24],
 [152,'.codex-temp/strict-alignment-v190/new-candidates/solved-candidate-152.json','.codex-temp/strict-alignment-v190/new-candidates/source-review-152.json','dbe5ce55b79fc221af152a755c58383432eff251f06ae4b94ae798fcb56275f7',30],
];
const cases=new Map();
for(const[id,p,s,h,drags]of specs){const raw=JSON.parse(await readFile(p)),{source}=await loadReviewedDesignSource(s,h);cases.set(id,{raw,source});
 test(`Lv${id} reviewed inventory, board, coverage and fresh complete ${drags}-drag replay`,()=>{const r=verifyReviewedDesign(raw,source,api);assert(r.qualifiedPreview);assert(r.replay.complete);assert.equal(r.drags.length,drags);assert(!r.pointerReplayValidated);assert(!r.timeValidated);assert(!r.lowerBoundCertified);assert(!r.releaseApproved);});}
const get=id=>structuredClone(cases.get(id));
test('24-port source is never overwritten by the five-port effective design contract',()=>{const {raw,source}=get(60),before=JSON.stringify(source);const r=verifyReviewedDesign(raw,source,api);assert.equal(source.sourceContract.mechanisms.exits.length,24);assert.equal(r.effectiveDesignContract.mechanisms.exits.length,5);assert.equal(JSON.stringify(source),before);assert(!r.mechanismAlignment.exactMatch);});
test('source SHA drift is rejected before observations are accepted',async()=>{await assert.rejects(loadReviewedDesignSource(specs[0][2],'0'.repeat(64)),/drift/);});
test('old135 full21 cannot replace reviewed full22',()=>{const{raw,source}=get(135);source.facts.full=21;assert.throws(()=>verifyReviewedDesign(raw,source,api),/full/);});
test('missing source mechanism remains unresolved',()=>{const{raw,source}=get(135);source.facts.mechanisms.numericIce.count=null;assert.throws(()=>verifyReviewedDesign(raw,source,api),/Source alignment/);});
test('ice value cannot change as part of ordinary reconfiguration',()=>{const{raw,source}=get(135);raw.level.gates.find(g=>g.frozen).frozen--;assert.throws(()=>verifyReviewedDesign(raw,source,api));});
test('ordinary deletion without capacity conflict fails',()=>{const{raw,source}=get(135);raw.level.gates.splice(raw.level.gates.findIndex(g=>!g.frozen),1);assert.throws(()=>verifyReviewedDesign(raw,source,api),/Source alignment/);});
test('inventing a shell on a source with none fails',()=>{const{raw,source}=get(60);raw.level.blocks[0].layers=[raw.level.blocks[0].color,'blue'];assert.throws(()=>verifyReviewedDesign(raw,source,api),/Source alignment/);});
test('normal rectangle cannot be re-cut into an original mask',()=>{const{raw,source}=get(60);raw.level.playable.pop();assert.throws(()=>verifyReviewedDesign(raw,source,api));});
test('missing stable source evidence rejects review',()=>{const{raw,source}=get(60);source.sourceFrames=[];assert.throws(()=>verifyReviewedDesign(raw,source,api),/evidence/);});
test('a spatial witness does not certify bombs by suppressing clock',()=>{const{raw,source}=get(60);raw.level.blocks[0].timedBombSeconds=10;assert.throws(()=>verifyReviewedDesign(raw,source,api),/Wall-clock/);});
test('same-color physical ports cannot bypass ordinary count authorization',()=>{const{raw,source}=get(60);raw.level.gates[1].color=raw.level.gates[0].color;assert.throws(()=>verifyReviewedDesign(raw,source,api));});
test('illegal wide gate rejected even with complete old route',()=>{const{raw,source}=get(60);raw.level.gates[0].size=4;assert.throws(()=>verifyReviewedDesign(raw,source,api));});
test('route prefix not a complete witness',()=>{const{raw,source}=get(60);raw.drags=raw.drags.slice(0,-1);assert.throws(()=>verifyReviewedDesign(raw,source,api),/replay/);});
test('Lv152 new irregular mask explicitly differs in area and is not its own preserved baseline',()=>{const{raw,source}=get(152);assert.equal(source.preservedIrregular,undefined);const r=verifyReviewedDesign(raw,source,api);assert.equal(r.boardAlignment.mode,'new-original-irregular');assert.equal(r.boardAlignment.sourcePlayable,40);assert.equal(r.boardAlignment.designPlayable,24);assert(r.boardAlignment.preservedBaselineAbsent);});
test('new irregular internal barriers are forbidden',()=>{const{raw,source}=get(152);raw.level.seams=[{orientation:'horizontal',offset:3,start:0,size:1}];assert.throws(()=>verifyReviewedDesign(raw,source,api),/barriers/);});
test('existing original outline cannot be ignored to open the new-mask exception',()=>{const{raw,source}=get(152);raw.level.id=33;source.levelId=33;assert.throws(()=>verifyReviewedDesign(raw,source,api),/Existing irregular/);});
