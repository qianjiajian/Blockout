import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditRetile,buildRetilePlan,layerCoverage,targetGeometryChain} from './design-vacancy-retile-candidates.mjs';
const root=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/design/delayed-vacancy-01/construction.json')).level;
test('Retile plan is finite, keeps real V2 opening, changes shape inventory',()=>{
 const plan=buildRetilePlan(root);assert(plan.rows.length<=20&&plan.rows.length>0);assert.equal(plan.firstOrderEligible,7);
 for(const row of plan.rows){assert(auditRetile(root,row.level).pass);assert(!row.chain.some(s=>s.changedIds.includes('opening')));}
 assert.equal(auditRetile(root,root).pass,false);
});
test('Opening displacement, S1 and duplicate cells fail static admission',()=>{
 const good=buildRetilePlan(root,{limit:1}).rows[0].level;
 let bad=structuredClone(good);bad.blocks[0].y++;assert.equal(auditRetile(root,bad).pass,false);
 bad=structuredClone(good);bad.blocks[1].shape=[[0,0]];assert.equal(auditRetile(root,bad).pass,false);
 bad=structuredClone(good);bad.blocks[1].x=bad.blocks[2].x;bad.blocks[1].y=bad.blocks[2].y;assert.equal(auditRetile(root,bad).pass,false);
});
test('Interrupted popped node does not certify completion of depth 31',()=>{
 const r={termination:'construction-state-budget',expanded:3,maxReached:31,queue:[{depth:0},{depth:30},{depth:31},{depth:32}]};
 assert.equal(layerCoverage(r).complete,false);
 assert.equal(layerCoverage({...r,expanded:4,maxReached:32}).complete,true);
 assert.equal(layerCoverage({...r,termination:'construction-depth-limit',expanded:4,maxReached:31}).complete,false);
});
test('Geometry chain follows retained parents and labels endpoint moves as non-route',()=>{
 const geometry={sourceBoard:{width:3,height:2},built:{blocks:[{id:'opening'},{id:'b',shape:[[0,0],[1,0]]}]},result:{
  apertures:[{side:'right',size:1,offset:0}],queue:[{depth:0,parent:-1,move:null,positions:[[0,0]]},{depth:1,parent:0,move:{blockId:'b',from:[0,0],to:[1,0]},positions:[[1,0]]}]}};
 const chain=targetGeometryChain(geometry,{i:0,g:0,depth:1});assert.equal(chain.moves.length,1);assert.equal(chain.minimumNonClearingBeforeSecondClear,0);assert.equal(chain.actualPuzzleRoute,false);
});
