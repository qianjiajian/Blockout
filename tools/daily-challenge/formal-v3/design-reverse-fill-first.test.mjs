import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runReverseInterleavedGraph,auditKnownInterleavedBlueprint} from './design-reverse-interleaved.mjs';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {digest} from './diversity-layout-factory.mjs';
const runtime=await loadBoundedRuntime();
function graph(queuePolicy='fill-first-diverse',cap=10000,layoutScore=()=>0){
 const stock=[{id:'a',color:'red',x:0,y:0,shape:[[0,0]]},{id:'b',color:'blue',x:1,y:0,shape:[[0,0]]},{id:'c',color:'green',x:2,y:0,shape:[[0,0]]}];
 const initial={width:3,height:2,blocks:[],gates:[]},raw=new Set(),expanded=new Set(),visited=[],stats={};
 const key=l=>digest(l.blocks),charge=(l,e=false)=>{const k=key(l);if(!raw.has(k)){if(raw.size>=cap)throw Error('shared-raw-limit');raw.add(k);}if(e)expanded.add(k);return k;};
 const insert=(l,b)=>({level:{...l,blocks:[...l.blocks,b]},operation:{kind:'insertion',body:b,forwardDrag:{blockId:b.id,path:[],exitSide:'top'}}});
 const result=runReverseInterleavedGraph({initialLevel:initial,initialOperations:[],inventory:stock,charge,worldKey:key,stats,queuePolicy,layoutScore,
  insertionOptions:(l,b)=>{
   visited.push(l.blocks.map(x=>x.id+x.y).join(','));
   if(!l.blocks.length)return b.id==='a'?[insert(l,b)]:[];
   if(l.blocks.length===1)return b.id==='b'?[insert(l,b)]:[];
   return b.id==='c'&&l.blocks.find(x=>x.id==='a')?.y===1?[insert(l,b)]:[];
  },
  parkingOptions:l=>l.blocks.find(x=>x.id==='a')?.y===0?[{level:{...l,blocks:l.blocks.map(x=>x.id==='a'?{...x,y:1}:x)},operation:{kind:'parking',blockId:'a',forwardDrag:{blockId:'a',path:[[0,0]]}}}]:[],
  goal:(level,ops)=>({level,ops})});
 return{result,raw,expanded,visited,stats};
}
test('fill-first selects the more-filled parking child before a less-filled equal-cost sibling',()=>{
 const r=graph();assert.equal(r.result.level.blocks.length,3);
 assert(r.visited.includes('a1,b0'));assert(!r.visited.includes('a1'));
 assert.equal(r.stats.constructionQueuePolicy,'fill-first-diverse');
 assert.equal(r.stats.maximumVacancyDepth,1);assert(r.raw.size>r.expanded.size);
});
test('all considered insertion and parking siblings still use one finite raw budget',()=>{
 const r=graph();assert.equal(r.raw.size,6);assert.throws(()=>graph('fill-first-diverse',5),/shared-raw-limit/);
 for(const k of r.expanded)assert(r.raw.has(k));
});
test('invalid constructor ranking cannot disable bounded queue accounting',()=>{
 assert.throws(()=>graph('random-other'),/queue policy/);
 assert.throws(()=>graph('fill-first-diverse',10000,()=>NaN),/Finite/);
 assert.throws(()=>graph('fill-first-diverse',10000,()=>Infinity),/Finite/);
});
test('fill-first preserves every real source52 inverse edge and complete actual witness',()=>{
 const screen=JSON.parse(fs.readFileSync('deliverables/daily-formal-v3-20261008/design/reverse-large-prefix-screen-01.json'));
 const row=screen.records[0],packet=JSON.parse(fs.readFileSync(row.path)),before=digest(packet);
 const r=auditKnownInterleavedBlueprint(runtime,packet,{prefixClearCount:7,maximumPrefixArea:19,allowLargePrefix:true,queuePolicy:'fill-first-diverse'});
 assert(r.valid);assert(r.completeActualDoubleReplay);assert.equal(r.U,packet.U);
 assert.deepEqual(r.originalInventoryIds,r.restoredInventoryIds);assert.equal(digest(packet),before);
 assert.equal(r.stats.constructionQueuePolicy,'fill-first-diverse');
});
