import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi} from './native-block-repair-v143.mjs';
import {checkSource118,checkSource119,checkSource120} from './remake111to120-source-v147.mjs';
import {replayBombRoute} from './remake111to120-bomb-replay-v147.mjs';
const {api}=await loadApi(),data=JSON.parse(fs.readFileSync('deliverables/remake111-120-v146-20260924/agent119-120/final120-1790268159779.json'));
test('118 and119 source properties, hidden ice, queue order and unique ice values reject corruptions',()=>{
 const root='deliverables/remake111-120-v146-20260924/';
 const fixtures=[
  [checkSource118,root+'agent115-118/candidate118-enriched-1790268814645.json',[
   l=>delete l.blocks.find(b=>b.star).star,l=>delete l.blocks.find(b=>b.movementAxis).movementAxis,
   l=>l.gates.find(g=>g.color==='blue').frozen=12,l=>l.blocks.pop()]],
  [checkSource119,root+'agent119-120/refined119-1-1790269525706.json',[
   l=>delete l.blocks.find(b=>b.frozen).frozen,l=>l.blocks.find(b=>b.frozen).color='cyan',
   l=>l.generators[0].queueBlockIds.reverse(),l=>l.gates.find(g=>g.color==='cyan').frozen=12,
   l=>l.blocks.find(b=>b.shutterId&&b.frozen).shutterId=l.shutters.find(s=>s.count===6).id]],
 ];
 for(const [check,path,mutations]of fixtures){const d=JSON.parse(fs.readFileSync(path));assert(check(d.level,api).passed);for(const mutate of mutations){const l=structuredClone(d.level);mutate(l);assert.throws(()=>check(l,api));}}
});
test('source contract rejects wrong timer associations, ice values, extra properties and missing inventory',()=>{
 assert(checkSource120(data.level,api).passed);
 for(const mutate of [
  l=>l.blocks.find(b=>b.timedBombSeconds===15).timedBombSeconds=25,
  l=>l.blocks.find(b=>b.timedBombSeconds===50).layers=['red','blue'],
  l=>l.blocks.find(b=>b.color==='yellow'&&b.layers).layers=['yellow','green'],
  l=>l.gates.find(g=>g.color==='green').frozen=3,
  l=>l.blocks[0].movementAxis='horizontal',
  l=>l.blocks.pop(),
 ]){const l=structuredClone(data.level);mutate(l);assert.throws(()=>checkSource120(l,api));}
});
test('original bombs complete with positive ticks; short deadlines and nonadjacent inputs are rejected',()=>{
 const saved=structuredClone(data),r=replayBombRoute(data.level,data.drags,api,{timed:true});
 assert(r.valid&&r.complete&&r.simulatedTimeValidated);assert(!r.timeValidated&&!r.pointerValidated);
 assert(r.simulatedSeconds>30);assert.equal(r.nonClearingDrags,7);assert.equal(r.bombLifecycle.length,3);
 assert(r.bombLifecycle.every(b=>b.disarmedAtSeconds<b.initialSeconds));
 const expiry=structuredClone(data.level);expiry.blocks.find(b=>b.timedBombSeconds===15).timedBombSeconds=.5;
 assert(!replayBombRoute(expiry,data.drags,api,{timed:true}).valid);
 const jump=structuredClone(data.drags);jump[1].path=[[0,0]];assert(!replayBombRoute(data.level,jump,api).valid);
 assert.deepEqual(data,saved,'No mutation of source, candidate or routes');
});
