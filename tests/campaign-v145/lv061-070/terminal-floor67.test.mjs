import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {compile,search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {stateOf} from '../../../tools/campaign-v145/lv061-070/lift-floor.mjs';
import {checkTerminalClearFloor67,normalizeTerminalClears} from '../../../tools/campaign-v145/lv061-070/terminal-clear-floor67.mjs';
import {checkFastFloor67} from '../../../tools/campaign-v145/lv061-070/fast-floor67.mjs';
const{api}=await loadApi(),base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[66].level,b=(id,x,y,color,more={})=>({id,x,y,color,shape:[[0,0]],...more});
const fixture=v=>({...structuredClone(base),width:3,height:2,playable:Array.from({length:6},(_,i)=>[i%3,Math.floor(i/3)]),blocked:[],seams:[],generators:[],shutters:[{id:'lift1',skin:'lift',x:0,y:1,width:2,height:1,count:0},...(v===2?[{id:'lift2',skin:'lift',x:0,y:1,width:2,height:1,count:0}]:[])],gates:[{id:'red',side:'top',offset:0,size:3,color:'red',...(v===3?{frozen:9}:{})},{id:'blue',side:'bottom',offset:0,size:3,color:'blue'}],blocks:[b('a',0,0,'red'),b('b',1,0,'red'),b('c',0,1,'red'),b('d',1,1,'red'),b('e',0,1,'blue',{shutterId:'lift1',...(v===1?{frozen:1}:{})}),b('f',1,1,'blue',{shutterId:'lift1'}),...(v===2?[b('g',0,1,'red',{shutterId:'lift2',layers:['red','blue']}),b('h',1,1,'red',{shutterId:'lift2',layers:['red','blue']})]:[])]});
test('terminal normalization and fast FIFO Dijkstra equal full graph on finite complete searches with hidden ice, multilayer and frozen gate',()=>{for(let v=0;v<4;v++)for(const floor of [1,2,3]){const l=fixture(v),options={floor,maxStates:300000,maxMilliseconds:20000},a=search(l,{...options,prove:true}),b=checkTerminalClearFloor67(l,api,options),fast=checkFastFloor67(l,api,options);assert.notEqual(a.status,'unknown');assert.equal(a.status,b.status);assert.equal(a.cost,b.cost);assert.equal(a.status,fast.status);assert.equal(a.cost,fast.cost);if(b.drags){const replay=api.replayRevisedRoute(l,b.drags);assert(replay.valid&&replay.complete);}}});
test('terminal guard retains every unrevealed lift, every remaining shell, and agrees with authoritative unit actions',()=>{
 for(const v of [0,1,2]){const l=fixture(v),c=compile(l);assert.equal(normalizeTerminalClears(c,c.initial).drags.length,0);const solved=search(l,{floor:5,maxStates:300000,maxMilliseconds:20000});assert(solved.drags);const m=new api.PuzzleModel(l);m.startCountdown();let normalized=0;
  for(const d of solved.drags){const before=stateOf(c,m.snapshot()),n=normalizeTerminalClears(c,before);if(n.drags.length){normalized++;const clone=m.clone();for(const step of n.drags){clone.beginAction();for(const p of step.path)assert(clone.moveBlockStep(step.blockId,...p));assert(clone.tryExit(step.blockId,step.exitSide).ok);assert(clone.commitAction());}assert.deepEqual(stateOf(c,clone.snapshot()),n.state);}else if(c.covers.some(co=>!before[2*c.N+co.j]))assert.strictEqual(n.state,before);
   m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());
  }assert(normalized>0);
 }
});
