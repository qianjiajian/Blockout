import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadApi} from './remake21to30-v120.mjs';
import {uniqueCurtainSuffix,uniqueCurtainPhases,checkUniqueCurtainSuffixFloor,checkUniqueCurtainSumFloor} from './remake21to30-unique-suffix-v139.mjs';
import {compileLevel,forEachGesture,stateKey,clearCount,checkFastFloor} from './remake21to30-mask-floor.mjs';
const source=JSON.parse(fs.readFileSync('deliverables/remake21-30-v139-20260924/agent21-24/source22-route-1790219656292.json'));
const {api}=await loadApi();
const view=s=>JSON.parse(JSON.stringify({blocks:s.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:b.shape,layers:b.layers,frozen:b.frozen})),gates:s.gates}));
test('qualified cut equals the actual model after ALL opening bodies clear, including fresh hidden ice',()=>{
  const cut=uniqueCurtainSuffix(source.level);assert.equal(cut.clearsBeforeReveal,17);
  const at=api.replayRevisedRoute(source.level,source.drags.slice(0,17));assert(at.valid&&!at.complete);
  const original=JSON.parse(at.finalStateKey),suffix=new api.PuzzleModel(cut.level).snapshot();
  assert.deepEqual(view(suffix),view(original));assert.equal(original.cleared,17);
  assert.deepEqual(suffix.blocks.filter(b=>b.frozen>0).map(b=>b.frozen),[5,5,5,5]);
  assert.deepEqual(suffix.gates.filter(g=>g.frozen>0).map(g=>g.frozen),[2,2]);
  assert(api.replayRevisedRoute(cut.level,source.drags.slice(17)).complete);
});
test('no cut is claimed if active opening obstacles can remain at reveal, or other mechanics may intervene',()=>{
  for(const change of [l=>l.shutters[0].count=16,l=>l.shutters[0].count=18,
    l=>l.blocks[0].layers=['purple','red'],l=>l.blocks[0].movementAxis='horizontal',l=>l.generators=[{}]]){
    const level=structuredClone(source.level);change(level);assert.throws(()=>uniqueCurtainSuffix(level));
    assert.equal(checkUniqueCurtainSuffixFloor(level).thresholdProven,false);
  }
});
test('suffix below-threshold result is not mislabeled as a whole-level shortcut or certificate',()=>{
  const p=checkUniqueCurtainSuffixFloor(source.level,{floor:11,maxStates:50000,maxMilliseconds:10000});
  assert.equal(p.status,'suffix-below-threshold');assert.equal(p.thresholdProven,false);
  assert(p.suffixRelaxedRoute.length);assert.equal(p.relaxedRoute,undefined);assert.equal(p.relaxedNonClearingDrags,undefined);
  assert.equal(p.solvabilityValidated,false);assert.equal(p.prefixCostIgnored,true);
});
test('cut generation does not mutate the original source map',()=>{
  const before=JSON.stringify(source.level);uniqueCurtainSuffix(source.level);assert.equal(JSON.stringify(source.level),before);
});
test('fixed-curtain prefix graph contains exactly the original pre-reveal edges, with the same costs',()=>{
  const phases=uniqueCurtainPhases(source.level),a=compileLevel(source.level),b=compileLevel(phases.prefix),count=b.blocks.length;
  const states=[a.initial],seen=new Set([stateKey(a.initial)]);let checked=0;
  // Bounded breadth coverage of actual states; the transformation proof in the
  // implementation covers the whole qualified graph, not just this sample.
  for(let at=0;at<states.length&&at<1000;at++){
    const state=states[at],prefix=state.slice(0,count),edges=(c,s)=>{const out=[];
      forEachGesture(c,s,(i,v,cost,get)=>out.push(JSON.stringify({i,v,cost,drag:get()})));return out.sort();};
    assert.deepEqual(edges(a,state),edges(b,prefix));checked++;
    forEachGesture(a,state,(i,v)=>{const next=state.slice();next[i]=v;
      if(next.slice(0,count).every(x=>x===255))return;
      const key=stateKey(next);if(!seen.has(key)){seen.add(key);states.push(next);}});
  }
  assert.equal(checked,1000);
});
test('sum certificate uses an exact searched prefix minimum and a proven suffix bound',()=>{
  const proof=checkUniqueCurtainSumFloor(source.level,{floor:4,maxStates:50000,maxMilliseconds:10000});
  assert.equal(proof.thresholdProven,true);assert.equal(proof.prefixMinimum,0);
  assert.equal(proof.suffixProof.floor,4);assert.equal(proof.suffixProof.thresholdProven,true);
  assert.equal(proof.solvabilityValidated,false);
  const rejected=structuredClone(source.level);Object.assign(rejected.gates[0],{side:'left',offset:6,size:3});
  assert.throws(()=>uniqueCurtainPhases(rejected),/outer rails/);
});

// A six-cell example with a genuinely necessary parking gesture. The hidden
// corner prevents the two red singles from bypassing the horizontal blue bar.
// The bar must park to the right before red can leave through the bottom mouth.
function nonzeroPrefixFixture({shell=false,interleaved=false}={}){
  const level={id:22,name:'nonzero-prefix-cut',difficulty:'normal',reward:0,timeSeconds:100,
    mechanismRules:'revised-2026-09-23-v1.4',width:3,height:2,
    gates:[{id:'red-gate',color:'red',side:'bottom',offset:0,size:3},
      {id:'blue-gate',color:'blue',side:'top',offset:0,size:2},
      {id:'purple-gate',color:'purple',side:'right',offset:0,size:2,frozen:shell?4:3}],
    shutters:[{id:'cut-cover',x:2,y:0,width:1,height:1,count:shell?4:3}],
    blocks:[{id:'red-a',color:'red',x:0,y:0,shape:[[0,0]]},
      {id:'red-b',color:'red',x:1,y:0,shape:[[0,0]]},
      {id:'blue-bar',color:'blue',x:0,y:1,shape:[[0,0],[1,0]]},
      {id:'cargo',color:'purple',x:2,y:0,shape:[[0,0]],shutterId:'cut-cover'}]};
  if(shell){
    level.blocks[2].layers=['blue','green'];
    level.gates.push({id:'green-gate',color:'green',side:'left',offset:0,size:2});
  }
  if(interleaved)level.blocks=[level.blocks[3],level.blocks[0],level.blocks[2],level.blocks[1]];
  return level;
}
const smallBudget={floor:10,maxStates:20000,maxMilliseconds:10000};
function exactSmallOptimum(level){
  const result=checkFastFloor(level,smallBudget);
  assert.equal(result.status,'relaxed-shortcut','A bounded positive example must finish the original unnormalized shortest-path graph');
  return result;
}

test('nonzero prefix and opening-shell cuts have a sum equal to the original exact whole-graph optimum',()=>{
  for(const shell of [false,true])for(const interleaved of [false,true]){
    const level=nonzeroPrefixFixture({shell,interleaved}),before=JSON.stringify(level),phases=uniqueCurtainPhases(level);
    const original=exactSmallOptimum(level),prefix=exactSmallOptimum(phases.prefix),suffix=exactSmallOptimum(phases.level);
    assert.equal(prefix.relaxedNonClearingDrags,1,'Do not silently regress this to the old zero-prefix-only coverage');
    assert.equal(original.relaxedNonClearingDrags,prefix.relaxedNonClearingDrags+suffix.relaxedNonClearingDrags);
    assert.equal(phases.clearsBeforeReveal,shell?4:3);
    const concatenated=[...prefix.relaxedRoute,...suffix.relaxedRoute],replay=api.replayRevisedRoute(level,concatenated);
    assert(replay.valid&&replay.complete,'The exact cut must allow the two labeled witnesses to concatenate in the real model');
    assert.equal(replay.nonClearingDrags,original.relaxedNonClearingDrags);
    const atCut=api.replayRevisedRoute(level,prefix.relaxedRoute);
    assert(atCut.valid&&!atCut.complete);
    assert.deepEqual(view(JSON.parse(atCut.finalStateKey)),view(new api.PuzzleModel(phases.level).snapshot()));
    const sum=checkUniqueCurtainSumFloor(level,{...smallBudget,floor:2});
    assert.equal(sum.status,'phases-below-threshold');assert.equal(sum.thresholdProven,false);
    assert.equal(sum.prefixMinimum,1);assert.equal(sum.suffixProof.floor,1);
    assert.equal(sum.prefixMinimum+sum.suffixProof.relaxedNonClearingDrags,original.relaxedNonClearingDrags);
    const lower=checkUniqueCurtainSumFloor(level,{...smallBudget,floor:1});
    assert.equal(lower.status,'threshold-proven');assert.equal(lower.thresholdProven,true);
    assert.equal(JSON.stringify(level),before,'Phase construction and checking may not mutate source data');
  }
});

test('opening shell peel is counted but does not trigger an all-opening-cleared cut while its inner body remains',()=>{
  const level=nonzeroPrefixFixture({shell:true,interleaved:true}),phases=uniqueCurtainPhases(level),prefix=exactSmallOptimum(phases.prefix);
  let observedPeel=false;
  for(let i=1;i<=prefix.relaxedRoute.length;i++){
    const previous=api.replayRevisedRoute(level,prefix.relaxedRoute.slice(0,i-1));
    const after=api.replayRevisedRoute(level,prefix.relaxedRoute.slice(0,i));
    assert(previous.valid&&after.valid);
    const a=JSON.parse(previous.finalStateKey),b=JSON.parse(after.finalStateKey),beforeShell=a.blocks.find(x=>x.id==='blue-bar'),afterShell=b.blocks.find(x=>x.id==='blue-bar');
    if(beforeShell?.layers.length===2&&afterShell?.layers.length===1){
      observedPeel=true;assert.equal(b.cleared,a.cleared+1);
      assert(b.cleared<phases.clearsBeforeReveal);assert.equal(b.shutters[0].revealed,false);
      assert.equal(afterShell.id,'blue-bar','Peeling may not be mistaken for deleting the opening body');
    }
  }
  assert(observedPeel,'The fixture route must actually exercise the opening shell');
  const missingShellEvent=structuredClone(level);missingShellEvent.shutters[0].count=3;
  assert.throws(()=>uniqueCurtainPhases(missingShellEvent),/all-opening-cleared cut/);
});

test('interleaved hidden/opening indices preserve EVERY reachable pre-cut edge under explicit ID projection',t=>{
  let checked=0;
  for(const shell of [false,true]){
    const level=nonzeroPrefixFixture({shell,interleaved:true}),phases=uniqueCurtainPhases(level),original=compileLevel(level),prefix=compileLevel(phases.prefix);
    const projection=prefix.blocks.map(b=>original.blocks.findIndex(o=>o.id===b.id));
    assert.deepEqual(projection,[1,2,3],'Hidden-first fixture must not permit accidental slice(0, openingCount) projection');
    const states=[original.initial],seen=new Set([stateKey(original.initial)]);
    const edges=(compiled,state)=>{const out=[];forEachGesture(compiled,state,(i,v,cost,get)=>out.push(JSON.stringify({blockId:compiled.blocks[i].id,v,cost,drag:get()})));return out.sort();};
    for(let at=0;at<states.length;at++){
      assert(states.length<2000,'Exhaustive small pre-cut graph must never silently truncate');
      const state=states[at],projected=Uint8Array.from(projection.map(i=>state[i]));
      assert(clearCount(original,state)<phases.clearsBeforeReveal);
      assert.deepEqual(edges(original,state),edges(prefix,projected),'Costs and real labeled drags must survive non-contiguous block indexing');checked++;
      forEachGesture(original,state,(i,v)=>{
        const next=state.slice();next[i]=v;
        if(clearCount(original,next)>=phases.clearsBeforeReveal)return;
        const key=stateKey(next);if(!seen.has(key)){seen.add(key);states.push(next);}
      });
    }
  }
  assert(checked>10);t.diagnostic(`Exhausted both interleaved prefix graphs: ${checked} labeled pre-cut states`);
});
