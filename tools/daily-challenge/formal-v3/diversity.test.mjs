import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compareLayouts,auditDiversity} from './diversity.mjs';

const old=id=>JSON.parse(fs.readFileSync(`deliverables/daily-formal-v2-20261007/final-qualified/${id}.json`,'utf8'));
const a=old('daily-mechanisms-irregular-block-5-d3-01'),b=old('daily-mechanisms-irregular-block-5-d3-02');
test('known 27-of-30 same-color sibling is rejected despite distinct exact partitions',()=>{
 const comparison=compareLayouts(a.level,b.level);assert(comparison.footprintSimilarity>=62/70);
 const audit=auditDiversity([a,b]);assert.equal(audit.status,'DIVERSITY_REJECTED');assert(audit.nearPairs.length===1);
});
test('recoloring and IDs cannot disguise identical geometry',()=>{
 const recolored=structuredClone(a.level);for(const block of recolored.blocks){block.id='new-'+block.id;block.color='cyan';}
 assert.equal(compareLayouts(a.level,recolored).footprintSimilarity,1);
});
test('mirrors and whole-board turns are detected without transforming actual assets',()=>{
 const mirrored=structuredClone(a.level);for(const b of mirrored.blocks){const points=b.shape.map(([x,y])=>[a.level.width-1-b.x-x,b.y+y]);const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));b.x=x;b.y=y;b.shape=points.map(p=>[p[0]-x,p[1]-y]);}
 mirrored.gates=[];assert.equal(compareLayouts(a.level,mirrored).footprintSimilarity,1);
});
test('moving a cover or adding a counter cannot hide underlying same block placements',()=>{
 const changed=structuredClone(a.level);changed.shutters=[{id:'cover',x:0,y:0,width:1,height:1,count:8}];changed.blocks[0].shutterId='cover';changed.blocks[1].frozen=12;
 assert.equal(compareLayouts(a.level,changed).full.ratio,1);
});
test('partial checks can never claim full 450 or formal readiness',()=>{
 const result=auditDiversity([a]);assert.equal(result.status,'PARTIAL_DIVERSITY_VERIFIED');assert.equal(result.formalReady,false);
 const full=auditDiversity([a],{expectFull:true});assert.equal(full.status,'DIVERSITY_REJECTED');assert(full.reasons.some(r=>r.kind==='incomplete-450'));
});
test('different-height reflection comparison and admission are independent of argument order',()=>{
 const a=JSON.parse(fs.readFileSync('deliverables/league-v2-20261008/design/raw-compact-01/candidate-01557.json')).level;
 const b=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/design/generator-berths-05/candidate-0196.json')).level;
 const ab=compareLayouts(a,b),ba=compareLayouts(b,a);
 assert.equal(ab.footprintSimilarity,24/35);
 assert.equal(ba.footprintSimilarity,ab.footprintSimilarity);
 assert.equal(ba.gateGeometrySimilarity,ab.gateGeometrySimilarity);
 const one={formalId:'one',stageKey:'fixture',difficulty:1,sourceLevelId:a.id,level:a};
 const two={formalId:'two',stageKey:'fixture',difficulty:1,sourceLevelId:b.id,level:b};
 for(const pair of [[one,two],[two,one]]){const result=auditDiversity(pair);assert.equal(result.status,'DIVERSITY_REJECTED');assert.equal(result.nearPairs.length,1);}
});
