import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModelApi} from '../remake131to140-model-api.mjs';
import {compile,each,stateOf,clearCount,normalizeExhausted} from './validation-generator-domain.mjs';
import {openingIdentityGroups,quotientKey,checkSymmetryGeneratorFloor} from './validation-symmetry-floor.mjs';
const api=await loadModelApi(),key=s=>String.fromCharCode(...s);
function fixture(positive=true){return {id:70,name:'Dual FIFO identity qualification',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-27-v1.5',width:3,height:3,
 gates:[{id:'r',color:'red',side:'left',offset:positive?2:0,size:positive?1:3},{id:'b',color:'blue',side:'right',offset:0,size:1},{id:'g',color:'green',side:'right',offset:1,size:positive?1:2}],
 generators:[{id:'g0',side:'top',offset:1,rimSpan:3,rimMount:'rim',spawn:[0,0],queueBlockIds:['q0']},{id:'g1',side:'bottom',offset:1,rimSpan:3,rimMount:'rim',spawn:[1,2],queueBlockIds:['q1']}],
 blocks:[['o0',0,1,'red'],['o1',1,2,'red'],['q0',0,0,'blue'],['q1',1,2,'green']].map(([id,x,y,color])=>({id,x,y,color,shape:[[0,0],[1,0]]}))};}
for(const positive of [false,true])test(`entire dual FIFO graph (positive floor=${positive}): opening identity orbits have identical weighted edges and every-state optimum`,t=>{
 const l=fixture(positive),c=compile(l,api),groups=openingIdentityGroups(c);assert.deepEqual(groups.map(g=>g.map(i=>c.blocks[i].id)),[['o0','o1']]);
 const m=new api.PuzzleModel(l);m.startCountdown();
 const nodes=[{s:c.initial,m}],indices=new Map([[key(c.initial),0]]),edges=[[]],orbits=new Map();let transitions=0,arrivals=0;
 for(let at=0;at<nodes.length;at++){
  assert(nodes.length<50000,'Fixture must exhaust within finite qualification budget');const n=nodes[at],out=new Set();
  assert.deepEqual(stateOf(c,n.m.snapshot()),n.s);
  each(c,n.s,(next,cost,get)=>{
   const d=get(),model=n.m.clone(),before=model.snapshot();model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());
   assert.deepEqual(stateOf(c,model.snapshot()),next);assert.equal(cost,Number(model.snapshot().cleared===before.cleared));arrivals+=before.queuedBlocks.length-model.snapshot().queuedBlocks.length;
   const k=key(next);if(!indices.has(k)){indices.set(k,nodes.length);nodes.push({s:next,m:model});edges.push([]);}edges[at].push([indices.get(k),cost]);out.add(cost+':'+quotientKey(next,groups));transitions++;
  });
  const orbit=quotientKey(n.s,groups),previous=orbits.get(orbit),sorted=[...out].sort();
  if(previous)assert.deepEqual(sorted,previous.edges,'Every pair of reachable representatives has identical weighted quotient successors');else orbits.set(orbit,{edges:sorted,members:[]});orbits.get(orbit).members.push(at);
  // Explicitly test the identity permutation even if the swapped state is not
  // reachable from this particular initial labelled position assignment.
  const swap=n.s.slice();[swap[0],swap[1]]=[swap[1],swap[0]];const swapped=new Set();each(c,swap,(next,cost)=>swapped.add(cost+':'+quotientKey(next,groups)));
  assert.deepEqual([...swapped].sort(),sorted,'Swapping equivalent opening IDs preserves all weighted edges with FIFO order intact');
 }
 const reverse=nodes.map(()=>[]);edges.forEach((es,i)=>es.forEach(([j,cost])=>reverse[j].push([i,cost])));
 const distances=nodes.map(()=>Infinity),pending=[];nodes.forEach((n,i)=>{if(clearCount(c,n.s)===c.total){distances[i]=0;pending.push(i);}});
 for(let at=0;at<pending.length;at++){const i=pending[at];for(const [j,cost]of reverse[i])if(distances[j]>distances[i]+cost){distances[j]=distances[i]+cost;pending.push(j);}}
 const orbitKeys=[...orbits.keys()],oi=new Map(orbitKeys.map((k,i)=>[k,i])),qreverse=orbitKeys.map(()=>[]),qdist=orbitKeys.map(()=>Infinity),qpending=[];
 for(const [orbit,entry]of orbits){const i=oi.get(orbit);for(const value of entry.edges){const cost=Number(value[0]),destination=value.slice(2);qreverse[oi.get(destination)].push([i,cost]);}if(entry.members.some(j=>clearCount(c,nodes[j].s)===c.total)){qdist[i]=0;qpending.push(i);}}
 for(let at=0;at<qpending.length;at++){const i=qpending[at];for(const [j,cost]of qreverse[i])if(qdist[j]>qdist[i]+cost){qdist[j]=qdist[i]+cost;qpending.push(j);}}
 nodes.forEach((n,i)=>{assert.equal(qdist[oi.get(quotientKey(n.s,groups))],distances[i],'Every-state optimum identical in raw and quotient graphs');assert.equal(distances[indices.get(key(normalizeExhausted(c,n.s).s))],distances[i],'Original exhausted-queue normalization remains cost preserving');});
 const optimum=distances[0];assert.equal(optimum,positive?1:0);
 if(positive)assert(checkSymmetryGeneratorFloor(l,api,{floor:optimum,maxMilliseconds:10000}).thresholdProven);
 const shortcut=checkSymmetryGeneratorFloor(l,api,{floor:optimum+1,maxMilliseconds:10000});assert.equal(shortcut.relaxedNonClearingDrags,optimum);assert(api.replayRevisedRoute(l,shortcut.drags).complete);
 if(!positive)assert(orbits.size<nodes.length);assert(arrivals>0);t.diagnostic(`${nodes.length} raw states / ${orbits.size} identity orbits / ${transitions} weighted gestures / ${arrivals} arrivals / optimum ${optimum}`);
});
test('queue identities are never merged; unequal ice, layers or shape never merge',()=>{
 const l=fixture(),c=compile(l,api);for(const b of c.blocks)if(b.queued){b.color='red';b.layers=['red'];}assert.deepEqual(openingIdentityGroups(c),[[0,1]]);
 for(const mutate of [x=>x.blocks[1].frozen=1,x=>x.blocks[1].layers=['red','green'],x=>x.blocks[1].shape=[[0,0]]]){const variant=fixture();mutate(variant);assert.deepEqual(openingIdentityGroups(compile(variant,api)),[]);}
 const limit=checkSymmetryGeneratorFloor(fixture(),api,{floor:11,maxStates:1,maxMilliseconds:1000});assert.equal(limit.status,'unknown');assert(!limit.thresholdProven);
 assert.equal(checkSymmetryGeneratorFloor({...fixture(),id:71},api).status,'unsupported');
});
