import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {checkSource64} from '../../../tools/campaign-v145/lv061-070/check-source64.mjs';
const {api}=await loadApi(),level=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/bound-candidate64-1790257052546.json')).level;
test('64 all 26 source carriers, same-color split, known ice/shells and exact area adaptations bind final level',()=>assert.equal(checkSource64(level,api).status,'PASS'));
test('64 rejects obsolete green split, mirrored red S4, altered shell/ice/batch and lowered gate counter',()=>{
 const pick=(l,id)=>l.blocks.find(b=>b.id==='v146-64-'+id);
 for(const mutate of [l=>{pick(l,'added-cover5-1').color='green';},l=>{pick(l,'cover-8-5').shape=[[1,0],[2,0],[0,1],[1,1]];},l=>{pick(l,'cover-13-3').layers=['blue','green'];},l=>{pick(l,'cover-13-1').frozen=2;},l=>{pick(l,'cover-5-5').shutterId='v146-64-cover-8';},l=>{l.gates.find(g=>g.color==='cyan').frozen=21;}]){const bad=structuredClone(level);mutate(bad);assert.throws(()=>checkSource64(bad,api));}
});
