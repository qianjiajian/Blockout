import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {compile,each,key} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {eachFast67} from '../../../tools/campaign-v145/lv061-070/fast-lift-edges67.mjs';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {stateOf} from '../../../tools/campaign-v145/lv061-070/lift-floor.mjs';
const{api}=await loadApi(),root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/';
test('fast anchors equal complete full-state edges on all route prefixes and 150 off-route states, including hidden ice and both exit modes',()=>{
 for(const file of ['candidate66-1790250038524.json','draft67-54-1790251128707.json']){
  const{level,drags}=JSON.parse(fs.readFileSync(root+file)),c=compile(level),m=new api.PuzzleModel(level);m.startCountdown();const states=[c.initial],seen=new Set([key(c.initial)]);
  for(const d of drags){m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());states.push(stateOf(c,m.snapshot()));}
  for(let i=0;i<states.length&&i<150;i++){
   for(const optionalExit of [false,true]){const full=new Set(),fast=new Set();each(c,states[i],(s,cost)=>full.add(cost+':'+key(s)),{optionalExit});eachFast67(c,states[i],(s,cost)=>{fast.add(cost+':'+key(s));if(states.length<150&&!seen.has(key(s))){seen.add(key(s));states.push(s);}},{optionalExit});assert.deepEqual(fast,full,`${file} state${i} optional${optionalExit}`);}
  }
 }
});
