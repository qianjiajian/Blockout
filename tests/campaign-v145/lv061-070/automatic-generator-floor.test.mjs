import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {compile,each,stateOf,checkAutomaticGeneratorFloor} from '../../../tools/campaign-v145/lv061-070/automatic-generator-floor.mjs';
const {api}=await loadApi(),root='deliverables/remake31-200-v145-20260924/batches/lv061-070';
const candidates=['author61-64/draft62-146662-2523-1790250027409.json','author70/final70-1790250316731.json'].map(f=>JSON.parse(fs.readFileSync(root+'/'+f)));
const key=s=>s.join(',');
function apply(m,d){const before=m.snapshot();m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());return m.snapshot().cleared===before.cleared?1:0;}
test('automatic graph optional actions equal authoritative model along all actual 62/70 prefixes',()=>{
 let checked=0,unitChecks=0;
 for(const {level,drags}of candidates){const c=compile(level,api),m=new api.PuzzleModel(level);m.startCountdown();
  for(const d of drags){const s=stateOf(c,m.snapshot()),edges=[];each(c,s,(v,cost,get)=>{const action=get(),t=m.clone();assert.equal(apply(t,action),cost);assert.equal(key(v),key(stateOf(c,t.snapshot())));edges.push({state:key(v),cost});checked++;});
   for(const b of m.snapshot().blocks)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const t=m.clone();t.beginAction();if(t.moveBlockStep(b.id,b.x+dx,b.y+dy)&&t.commitAction()){assert(edges.some(e=>e.state===key(stateOf(c,t.snapshot()))&&e.cost===1));unitChecks++;}}
   apply(m,d);
  }assert(m.snapshot().complete);
 }assert(checked>1000);assert(unitChecks>100);
});
test('qualification refuses unrelated domains and budget exhaustion is never proof',()=>{
 for(const mutate of[l=>l.blocks[0].movementAxis='horizontal',l=>l.generators[0].trigger='time',l=>l.blocks[0].keyId='k',l=>l.shutters[0].skin='lift']){const l=structuredClone(candidates[0].level);mutate(l);assert.equal(checkAutomaticGeneratorFloor(l,api,{floor:11,maxStates:100,maxMilliseconds:100}).status,'unsupported');}
 assert.equal(checkAutomaticGeneratorFloor(candidates[0].level,api,{floor:11,maxStates:1,maxMilliseconds:10000}).status,'unknown');
 assert.equal(checkAutomaticGeneratorFloor(candidates[0].level,api,{floor:0,maxStates:1,maxMilliseconds:100}).status,'invalid');
});
