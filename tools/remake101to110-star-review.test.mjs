import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {starOrdinaryCompatibility,verifyMechanisms} from './verify-remake101to110-v147.mjs';
import {loadApi} from './remake101to110-v146.mjs';
const eligible=l=>starOrdinaryCompatibility(l).some(b=>b.ordinaryGates.some(g=>g.portals.some(p=>p.possiblyFits)));
test('star contrast applicability uses the complete cross-section and authoritative portals',()=>{
 const l={blocks:[{id:'star',color:'red',star:true,shape:[[0,0],[1,0],[2,0],[1,1]]}],gates:[{id:'ordinary',color:'red',side:'bottom',size:1}]};
 assert(!eligible(l),'A narrow handle cannot make a width-three body fit');
 l.gates[0].size=3;assert(eligible(l));l.gates[0].side='left';l.gates[0].size=2;assert(eligible(l));
 l.blocks[0].movementAxis='vertical';assert(!eligible(l));
 l.gates[0].portals=[{side:'top',origin:[0,0],size:3}];assert(eligible(l),'Portal geometry overrides compatibility side/size');
 l.gates[0].star=true;assert(!eligible(l));
});
test('108 records geometry overlap as not applicable and verifies every actual star exit',async()=>{
 const {api}=await loadApi(),d=JSON.parse(fs.readFileSync('deliverables/remake101-110-v146-20260924/enriched108-1790270760651.json'));
 const r=verifyMechanisms(d,api);assert.equal(r.starCounterfactualStatus,'NOT_APPLICABLE_GEOMETRY');assert.equal(r.starCases.length,0);assert.equal(r.starExits.length,3);assert.equal(r.starIndependentDifficultyContributionProven,false);
 const changed=structuredClone(d);changed.level.gates.find(g=>g.color==='yellow'&&!g.star).size=3;assert.throws(()=>verifyMechanisms(changed,api));
});
