import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {checkSource69} from '../../../tools/campaign-v145/lv061-070/check-source69.mjs';
const {api}=await loadApi(),input=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv061-070/author68-69/tail69-complete-1790255046871.json'));
test('69 all 34 known bodies, five actual footprint adaptations and ordinary one-cell padding are bound',()=>{const r=checkSource69(input,api);assert.equal(r.status,'PASS');assert.equal(r.sourceBodies,34);assert.equal(r.sourceFootprintChanges,5);});
test('69 rejects source changes to hidden ice, shell layers, batch, gate counters or missing bodies',()=>{
 for(const mutate of [
  l=>l.blocks.find(b=>b.id.endsWith('lift2-0')).frozen=2,
  l=>l.blocks.find(b=>b.id.endsWith('opening-2')).layers=['blue','green'],
  l=>l.blocks.find(b=>b.id.endsWith('cover18-1')).shutterId='v147-69-cover11',
  l=>l.gates.find(g=>g.color==='cyan').frozen=23,
  l=>l.blocks.splice(l.blocks.findIndex(b=>b.id.endsWith('cover18-2')),1)
 ]){const d=structuredClone(input);mutate(d.level);assert.throws(()=>checkSource69(d,api));}
});
test('69 rejects the obsolete two-body family adaptation and unrecorded native directional changes',()=>{
 for(const mutate of [
  l=>l.blocks.find(b=>b.id.endsWith('opening-2')).shape=[[0,0],[1,0]],
  l=>l.blocks.find(b=>b.id.endsWith('opening-1')).shape=[[0,0],[0,1]],
  l=>l.blocks.find(b=>b.id.endsWith('cover6-3')).shape=[[0,0],[1,0]],
  l=>l.blocks.find(b=>b.id.endsWith('cover11-3')).shape=[[0,0],[1,0],[0,1]]
 ]){const d=structuredClone(input);mutate(d.level);assert.throws(()=>checkSource69(d,api));}
});
