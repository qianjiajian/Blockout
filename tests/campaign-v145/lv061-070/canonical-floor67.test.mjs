import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadApi} from '../../../tools/native-block-repair-v143.mjs';
import {search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {checkCanonicalLiftFloor67} from '../../../tools/campaign-v145/lv061-070/canonical-lift-floor67.mjs';
const{api}=await loadApi(),base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[66].level,b=(id,x,y,color,more={})=>({id,x,y,color,shape:[[0,0]],...more});
const fixture=variant=>({...structuredClone(base),width:3,height:2,playable:Array.from({length:6},(_,i)=>[i%3,Math.floor(i/3)]),blocked:[],seams:[],generators:[],shutters:[{id:'lift1',skin:'lift',x:0,y:1,width:2,height:1,count:0},...(variant===2?[{id:'lift2',skin:'lift',x:0,y:1,width:2,height:1,count:0}]:[])],gates:[{id:'red',side:'top',offset:0,size:3,color:'red',...(variant===3?{frozen:9}:{})},{id:'blue',side:'bottom',offset:0,size:3,color:'blue'}],blocks:[b('a',0,0,'red'),b('b',1,0,'red'),b('c',0,1,'red'),b('d',1,1,'red'),b('e',0,1,'blue',{shutterId:'lift1',...(variant===1?{frozen:1}:{})}),b('f',1,1,'blue',{shutterId:'lift1'}),...(variant===2?[b('g',0,1,'red',{shutterId:'lift2',layers:['red','blue']}),b('h',1,1,'red',{shutterId:'lift2',layers:['red','blue']})]:[])]});
test('67 exact canonical quotient matches complete unquotiented graph on repeated bodies, hidden ice, multilayer lifts, unreachable gates',()=>{
 for(let v=0;v<4;v++){const level=fixture(v),options={floor:v===3?5:2,maxStates:300000,maxMilliseconds:20000},plain=search(level,{...options,prove:true}),canon=checkCanonicalLiftFloor67(level,api,options);assert.notEqual(plain.status,'unknown');assert.equal(canon.status,plain.status);assert.equal(canon.cost,plain.cost);if(canon.drags){const r=api.replayRevisedRoute(level,canon.drags);assert(r.valid&&r.complete);}}
});
test('67 wrapper rejects invalid budget, unsupported axis, packed key overflow and wrong level',()=>{assert.equal(checkCanonicalLiftFloor67(fixture(0),api,{floor:0}).status,'invalid');for(const mutate of [l=>l.id=66,l=>l.blocks[0].movementAxis='horizontal',l=>l.blocks[0].frozen=64]){const l=fixture(0);mutate(l);assert.equal(checkCanonicalLiftFloor67(l,api,{floor:2}).status,'unsupported');}});
