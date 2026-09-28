import test from 'node:test';
import assert from 'node:assert/strict';
import {compileLevel,forEachGesture,clearCount,stateKey,checkFastFloor} from './remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,canonicalStateKey,normalizeMonotoneSuffix,normalizeMonotoneClears,checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
const fixture=()=>({id:21,name:'quotient',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:2,
  gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:3},{id:'gate-b',color:'blue',side:'top',offset:0,size:3}],
  blocks:[{id:'a',color:'red',x:0,y:0,shape:[[0,0]]},{id:'b',color:'red',x:1,y:0,shape:[[0,0]]},
    {id:'c',color:'blue',x:0,y:1,shape:[[0,0],[1,0]]}]});
function variants(){
  const plain=fixture(),shell=fixture(),ice=fixture(),hidden=fixture();
  for(const b of shell.blocks.slice(0,2))b.layers=['red','blue'];
  for(const b of ice.blocks.slice(0,2))b.frozen=1;
  hidden.shutters=[{id:'cover',x:0,y:0,width:2,height:1,count:1}];
  for(const b of hidden.blocks.slice(0,2))b.shutterId='cover';
  return [plain,shell,ice,hidden];
}
test('only identical shapes/layers/ice/reveal owners form equivalence groups',()=>{
  for(const level of variants())assert.deepEqual(equivalentBlockGroups(compileLevel(level)),[[0,1]]);
  for(const mutate of [b=>b.color='blue',b=>b.layers=['red','blue'],b=>b.frozen=1]){
    const level=fixture();mutate(level.blocks[1]);assert.deepEqual(equivalentBlockGroups(compileLevel(level)),[]);
  }
  const level=fixture();level.blocks[1].shape=[[0,0],[1,0]];
  assert.deepEqual(equivalentBlockGroups(compileLevel(level)),[]);
});
test('every reachable orbit has equal goals, clears and cost-labeled quotient edges after swapping identities',t=>{
  let tested=0;
  for(const level of variants()){
    const c=compileLevel(level),groups=equivalentBlockGroups(c),key=s=>canonicalStateKey(s,groups);
    const pending=[c.initial],seen=new Set([stateKey(c.initial)]);
    const edges=state=>{const out=new Set();forEachGesture(c,state,(i,v,cost)=>{const next=state.slice();next[i]=v;out.add(`${cost}:${key(next)}`);});return [...out].sort();};
    for(let at=0;at<pending.length;at++){
      assert(pending.length<20000);const state=pending[at],swapped=state.slice();
      [swapped[0],swapped[1]]=[swapped[1],swapped[0]];
      assert.equal(key(swapped),key(state));assert.equal(clearCount(c,swapped),clearCount(c,state));
      assert.deepEqual(edges(swapped),edges(state));tested++;
      forEachGesture(c,state,(i,v)=>{const next=state.slice();next[i]=v;const k=stateKey(next);if(!seen.has(k)){seen.add(k);pending.push(next);}});
    }
  }
  assert(tested>100);t.diagnostic(`Checked every reachable state in four finite fixtures: ${tested} labeled states`);
});
test('bounds and optimal shortcut costs agree with unquotiented exhaustive searches',()=>{
  for(const level of variants())for(const floor of [1,2,3]){
    const options={floor,maxStates:20000,maxMilliseconds:20000},old=checkFastFloor(level,options),current=checkSymmetryFloor(level,options);
    assert(['threshold-proven','relaxed-shortcut'].includes(old.status));assert.equal(current.status,old.status);
    assert.equal(current.thresholdProven,old.thresholdProven);assert.equal(current.relaxedNonClearingDrags,old.relaxedNonClearingDrags);
    if(current.relaxedRoute){
      const c=compileLevel(level);let state=c.initial,cost=0;
      for(const drag of current.relaxedRoute){let selected;
        forEachGesture(c,state,(i,v,edge,get)=>{if(JSON.stringify(get())===JSON.stringify(drag))selected={i,v,edge};});
        assert(selected,'Returned labeled path must be an actual edge, not a renamed-block teleport');
        state=state.slice();state[selected.i]=selected.v;cost+=selected.edge;
      }
      assert.equal(clearCount(c,state),c.totalClears);assert.equal(cost,current.relaxedNonClearingDrags);
    }
  }
});
test('qualifier and budget failure remain fail-closed; canonicalization never mutates states',()=>{
  const level=fixture(),c=compileLevel(level),before=c.initial.slice();canonicalStateKey(c.initial,[[0,1]]);assert.deepEqual(c.initial,before);
  assert.equal(checkSymmetryFloor(level,{floor:3,maxStates:1,maxMilliseconds:1000}).thresholdProven,false);
  assert.equal(checkSymmetryFloor(level,{floor:0}).status,'invalid');
  level.blocks[0].movementAxis='horizontal';assert.equal(checkSymmetryFloor(level).status,'unsupported');
});
test('all-countdown monotone clears preserve the exact optimum at EVERY state of the four original finite graphs',t=>{
  let checked=0;
  for(const level of variants()){
    const c=compileLevel(level),states=[c.initial],indices=new Map([[stateKey(c.initial),0]]),reverse=[[]];
    for(let at=0;at<states.length;at++)forEachGesture(c,states[at],(i,v,cost)=>{
      const next=states[at].slice();next[i]=v;const key=stateKey(next);
      if(!indices.has(key)){indices.set(key,states.length);states.push(next);reverse.push([]);}
      reverse[indices.get(key)].push([at,cost]);
    });
    const distances=states.map(()=>Infinity),pending=[];
    for(const [i,state]of states.entries())if(clearCount(c,state)===c.totalClears){distances[i]=0;pending.push([i,0]);}
    while(pending.length){pending.sort((a,b)=>b[1]-a[1]);const [i,d]=pending.pop();if(d!==distances[i])continue;
      for(const [before,cost]of reverse[i])if(d+cost<distances[before]){distances[before]=d+cost;pending.push([before,d+cost]);}
    }
    for(const [i,state]of states.entries()){
      const normalized=normalizeMonotoneClears(c,state),at=indices.get(stateKey(normalized.state));
      assert.notEqual(at,undefined);assert.equal(distances[i],distances[at],'Zero-cost normalization must preserve the exact optimum, even for dead ends');
      let reached=state;
      for(const drag of normalized.drags){let next;
        forEachGesture(c,reached,(index,v,cost,get)=>{if(cost===0&&v===255&&JSON.stringify(get())===JSON.stringify(drag)){next=reached.slice();next[index]=v;}});
        assert(next);reached=next;
      }
      assert.deepEqual(reached,normalized.state);checked++;
    }
  }
  assert.equal(checked,416);t.diagnostic(`Compared exact distance-to-goal before/after every normalization: ${checked} states`);
});
test('suffix-only normalization waits for the last reveal; all-countdown normalization may clear earlier but neither forces peels',()=>{
  const shell=fixture();shell.blocks=shell.blocks.slice(0,2).map(b=>({...b,layers:['red','blue']}));
  let c=compileLevel(shell);assert.equal(normalizeMonotoneSuffix(c,c.initial).drags.length,0);
  const hidden=fixture();hidden.blocks[2]={id:'free-blue',color:'blue',x:2,y:0,shape:[[0,0]]};
  hidden.shutters=[{id:'cover',x:0,y:0,width:2,height:1,count:1}];hidden.blocks[0].shutterId='cover';hidden.blocks[1].shutterId='cover';
  c=compileLevel(hidden);let removable=false;forEachGesture(c,c.initial,(_i,v,cost)=>{if(v===255&&cost===0)removable=true;});
  assert(removable);assert.equal(normalizeMonotoneSuffix(c,c.initial).drags.length,0);
  // The separately proven stronger countdown normalizer may reveal a cover:
  // newly appearing footprints are a subset of the old cover, not new obstacles.
  assert(normalizeMonotoneClears(c,c.initial).drags.length>0);
});

function combinedCountdownFixtures(){
  const base={id:24,name:'combined-countdowns',difficulty:'hard',reward:0,timeSeconds:100,
    mechanismRules:'revised-2026-09-23-v1.4',width:3,height:2};
  const hiddenIceShell={...base,gates:[
    {id:'r',color:'red',side:'top',offset:0,size:3},
    {id:'b',color:'blue',side:'bottom',offset:0,size:3,frozen:2},
    {id:'g',color:'green',side:'right',offset:0,size:2,frozen:1}],
    shutters:[{id:'ice-cover',x:0,y:1,width:1,height:1,count:1}],blocks:[
      {id:'ice-shell',color:'blue',layers:['blue','green'],frozen:1,shutterId:'ice-cover',x:0,y:1,shape:[[0,0]]},
      {id:'opener-red',color:'red',x:0,y:0,shape:[[0,0]]},
      {id:'opener-green',color:'green',x:2,y:0,shape:[[0,0]]}]};
  const dual={...base,gates:[
    {id:'r',color:'red',side:'left',offset:0,size:2},
    {id:'b',color:'blue',side:'top',offset:1,size:2},
    {id:'g',color:'green',side:'right',offset:0,size:1,frozen:2},
    {id:'y',color:'yellow',side:'bottom',offset:0,size:3,frozen:3}],
    shutters:[{id:'early',x:0,y:1,width:1,height:1,count:1},{id:'late',x:2,y:1,width:1,height:1,count:2}],blocks:[
      {id:'early-ice',color:'green',frozen:1,shutterId:'early',x:0,y:1,shape:[[0,0]]},
      {id:'opener-shell',color:'blue',layers:['blue','red'],x:2,y:0,shape:[[0,0]]},
      {id:'late-ice',color:'yellow',frozen:1,shutterId:'late',x:2,y:1,shape:[[0,0]]},
      {id:'opener-red',color:'red',x:1,y:0,shape:[[0,0]]}]};
  const simultaneous=structuredClone(dual);simultaneous.name='simultaneous-covers';simultaneous.shutters[1].count=1;
  const deadEnd=structuredClone(hiddenIceShell);deadEnd.name='hidden-ice-no-enough-later-clears';deadEnd.blocks[0].frozen=2;
  const parking={...base,name:'positive-cost-with-hidden-iced-shell',gates:[
    {id:'r',color:'red',side:'bottom',offset:0,size:3},
    {id:'b',color:'blue',side:'top',offset:0,size:2},
    {id:'p',color:'purple',side:'right',offset:0,size:2,frozen:2},
    {id:'g',color:'green',side:'left',offset:0,size:2}],
    shutters:[{id:'park-cover',x:2,y:0,width:1,height:1,count:1}],blocks:[
      {id:'parking-red-a',color:'red',x:0,y:0,shape:[[0,0]]},
      {id:'parking-red-b',color:'red',x:1,y:0,shape:[[0,0]]},
      {id:'parking-bar',color:'blue',x:0,y:1,shape:[[0,0],[1,0]]},
      {id:'hidden-shell',color:'purple',layers:['purple','green'],frozen:1,shutterId:'park-cover',x:2,y:0,shape:[[0,0]]}]};
  return [hiddenIceShell,dual,simultaneous,deadEnd,parking];
}

function completeDistances(level){
  const c=compileLevel(level),states=[c.initial],indices=new Map([[stateKey(c.initial),0]]),reverse=[[]];
  let peelEdges=0,revealEdges=0,iceThawEdges=0,gateThawEdges=0;
  for(let at=0;at<states.length;at++)forEachGesture(c,states[at],(i,v,cost)=>{
    const next=states[at].slice();next[i]=v;const key=stateKey(next),before=clearCount(c,states[at]),after=clearCount(c,next);
    if(cost===0&&v!==255)peelEdges++;
    if(c.covers.some(s=>before<s.count&&after>=s.count))revealEdges++;
    if(c.blocks.some(b=>b.ice&&before>=b.revealAt&&before-b.revealAt<b.ice&&after-b.revealAt>=b.ice))iceThawEdges++;
    if(c.gates.some(g=>before<g.frozen&&after>=g.frozen))gateThawEdges++;
    if(!indices.has(key)){
      assert(states.length<20000,'A finite exhaustive fixture must stay bounded; never silently truncate');
      indices.set(key,states.length);states.push(next);reverse.push([]);
    }
    reverse[indices.get(key)].push([at,cost]);
  });
  const distances=states.map(()=>Infinity),pending=[];
  for(const [i,state]of states.entries())if(clearCount(c,state)===c.totalClears){distances[i]=0;pending.push([i,0]);}
  while(pending.length){
    pending.sort((a,b)=>b[1]-a[1]);const [i,d]=pending.pop();if(d!==distances[i])continue;
    for(const [before,cost]of reverse[i])if(d+cost<distances[before]){distances[before]=d+cost;pending.push([before,d+cost]);}
  }
  return {c,states,indices,distances,peelEdges,revealEdges,iceThawEdges,gateThawEdges};
}

test('all-countdown normalization preserves every exact distance with hidden ice, frozen mouths, shells and staggered/simultaneous covers',t=>{
  let tested=0,deadStates=0;
  for(const level of combinedCountdownFixtures()){
    const graph=completeDistances(level),{c,states,indices,distances}=graph;
    assert(graph.revealEdges>0);assert(graph.gateThawEdges>0);
    if(level.name!=='hidden-ice-no-enough-later-clears'){
      assert(Number.isFinite(distances[0]),'The positive composite examples must actually have solutions');
      assert(graph.peelEdges>0);assert(graph.iceThawEdges>0);
    }else assert.equal(distances[0],Infinity,'The negative example must actually be a dead end');
    if(level.name==='positive-cost-with-hidden-iced-shell')assert.equal(distances[0],1,'Composite regression must exercise a genuinely nonzero optimum');
    for(const [i,state]of states.entries()){
      const before=state.slice(),normalized=normalizeMonotoneClears(c,state),at=indices.get(stateKey(normalized.state));
      assert.deepEqual(state,before,'Normalizer must not mutate its caller state');
      assert.notEqual(at,undefined,'Normalized state must be in the original exhaustive graph');
      assert.equal(distances[i],distances[at],`${level.name}: exact distance may not change at ${[...state]}`);
      let reached=state;
      for(const drag of normalized.drags){let next;
        forEachGesture(c,reached,(index,v,cost,get)=>{
          if(JSON.stringify(get())===JSON.stringify(drag)){
            assert.equal(cost,0);assert.equal(v,255,'A recorded forced step must remove a body, never peel a shell');
            next=reached.slice();next[index]=v;
          }
        });
        assert(next,'Every forced labeled drag must be an original-graph edge');reached=next;
      }
      assert.deepEqual(reached,normalized.state);tested++;if(!Number.isFinite(distances[i]))deadStates++;
    }
    const old=checkFastFloor(level,{floor:8,maxStates:20000,maxMilliseconds:20000});
    const current=checkSymmetryFloor(level,{floor:8,maxStates:20000,maxMilliseconds:20000});
    assert(['threshold-proven','relaxed-shortcut'].includes(old.status));assert.equal(current.status,old.status);
    assert.equal(current.relaxedNonClearingDrags,old.relaxedNonClearingDrags);
    t.diagnostic(`${level.name}: ${states.length} complete states, initial optimum ${distances[0]}`);
  }
  assert(tested>400);assert(deadStates>0);
});

test('equal reveal counters do not merge otherwise identical bodies belonging to different covers',()=>{
  const level=combinedCountdownFixtures()[2];
  level.blocks[2].color='green';
  const c=compileLevel(level),groups=equivalentBlockGroups(c);
  assert(!groups.some(group=>group.includes(0)&&group.includes(2)),'Cover identity remains part of exact mechanical equivalence');
});
