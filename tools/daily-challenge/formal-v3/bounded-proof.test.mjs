import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {boundedBudget,boundedPlainTask,boundedUpperSearch,createAttemptLedger,loadBoundedRuntime,designFingerprints} from './bounded-proof.mjs';

const runtime=await loadBoundedRuntime();
const tiny=()=>({id:990001,name:'bounded qualification',difficulty:'hard',reward:0,timeSeconds:120,
  mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
  blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],
  gates:[{id:'r',side:'right',offset:0,size:1,color:'red'},{id:'b-out',side:'left',offset:0,size:1,color:'blue'}]});

test('10000 is a hard full-board limit, transitions use a separate explicit finite limit',()=>{
  assert.throws(()=>boundedBudget({maxStates:10001}));assert.throws(()=>boundedBudget({maxStates:Infinity}));
  assert.throws(()=>boundedBudget({maxMilliseconds:Infinity}));assert.throws(()=>boundedBudget({unknown:1}));
  assert.equal(boundedBudget({maxTransitions:10001}).maxTransitions,10001);
  assert.equal(boundedBudget({maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000}).maxStates,10000);
  assert.throws(()=>boundedBudget({maxTransitions:10000001}));assert.throws(()=>boundedBudget({maxMicroStates:3000001}));
});
test('complete held-turn closure agrees with qualified v2 threshold and minimum witness',()=>{
  const x=boundedPlainTask(tiny(),runtime,{floor:1,searchUpper:3});
  assert.equal(x.thresholdProven,true);assert.equal(x.cost,1);
  const actual=runtime.replayRevisedRoute(tiny(),x.drags);assert.equal(actual.valid,true);assert.equal(actual.complete,true);assert.equal(actual.nonClearingDrags,1);
  assert(x.microExploredStates>0&&x.exitChecks>0&&x.microNeighborChecks>0);
  for(let first=0;first<4;first++)for(let second=0;second<4;second++)if(first!==second){
    const level=tiny();Object.assign(level.blocks[0],{x:first%2,y:Math.floor(first/2)});Object.assign(level.blocks[1],{x:second%2,y:Math.floor(second/2)});
    const previous=runtime.checkPlainFloor(level,runtime,{floor:2}),bounded=boundedPlainTask(level,runtime,{floor:2});
    assert.equal(bounded.status,previous.status);
    if(bounded.status==='relaxed-shortcut')assert.equal(bounded.cost,previous.cost);
  }
});
test('state, micro, transition and expansion interruption never claim a completed lower task',()=>{
  for(const budget of [{maxStates:1},{maxMicroStates:1},{maxTransitions:1}]){
    const r=boundedPlainTask(tiny(),runtime,{floor:2,...budget});
    assert.equal(r.status,'unknown');assert.equal(r.thresholdProven,false);
    assert(r.discoveredStates<=r.budget.maxStates&&r.exploredStates<=r.budget.maxStates);
    assert(r.attemptedTransitions<=r.budget.maxTransitions&&r.microDiscoveredStates<=r.budget.maxMicroStates);
  }
  const partial=boundedPlainTask(tiny(),runtime,{floor:1,searchUpper:3,maxStates:1});
  assert.equal(partial.status,'unknown');assert.equal(partial.thresholdProven,false);assert.equal(partial.certifiedFloor,1);
});

test('raw budget includes every free-clear intermediate before quotient pruning',()=>{
  const level=tiny();level.gates[0].side='left';level.gates[1].side='right';
  const pass=boundedPlainTask(level,runtime,{floor:1,searchUpper:3});
  assert.equal(pass.cost,0);assert.equal(pass.rawFullBoardStates,3);
  assert.equal(pass.discoveredStates,3);assert.equal(pass.visitedStates,3);
  assert.equal(pass.rawExploredStates,2);assert.equal(pass.exploredStates,2);
  assert.equal(pass.quotientDiscoveredStates,1);assert.equal(pass.quotientExploredStates,0);
  const fail=boundedPlainTask(level,runtime,{floor:1,searchUpper:3,maxStates:2});
  assert.equal(fail.status,'unknown');assert.equal(fail.thresholdProven,false);
  assert.equal(fail.termination,'max-raw-board-states');assert.equal(fail.rawFullBoardStates,2);
  assert.equal(fail.quotientDiscoveredStates,0);
});

test('parking candidates and differently labelled worlds count before clear/identity reduction',()=>{
  const level=tiny(),proof=boundedPlainTask(level,runtime,{floor:1,searchUpper:3});
  assert.equal(proof.cost,1);
  assert(proof.rawFullBoardStates>proof.quotientDiscoveredStates,'raw worlds must not collapse to two closure representatives');
  assert.equal(proof.rawFullBoardStates,proof.discoveredStates);assert.equal(proof.rawExploredStates,proof.exploredStates);
  assert(proof.rawExploredStates>proof.quotientExploredStates,'closure scans also expand raw worlds');
  assert(proof.exploredStates<=proof.discoveredStates);
});
test('native-model upper search exposes actual board and micro counters and stops before exceeding caps',()=>{
  const done=boundedUpperSearch(runtime,tiny());assert.equal(done.witnessFound,true);assert.equal(done.replay.complete,true);
  assert(done.microExploredStates>0);assert(done.exploredStates<=done.discoveredStates);
  for(const budget of [{maxStates:1},{maxMicroStates:1},{maxTransitions:1}]){
    const r=boundedUpperSearch(runtime,tiny(),budget);assert.equal(r.witnessFound,false);assert.equal(r.status,'unknown');
    assert(r.discoveredStates<=r.budget.maxStates&&r.exploredStates<=r.budget.maxStates&&r.attemptedTransitions<=r.budget.maxTransitions);
  }
});

test('native upper rejects held-world inventory changes before any exempt micro search',()=>{
  const level={...tiny(),width:3,height:3,
    blocks:[{id:'owner',x:1,y:0,shape:[[0,0]],color:'red'},
      {id:'cargo',x:1,y:0,shape:[[0,0]],color:'blue'}],
    gates:[{id:'r-out',side:'right',offset:0,size:3,color:'red'},
      {id:'b-out',side:'left',offset:0,size:3,color:'blue'}],
    generators:[{id:'feeder',side:'top',offset:1,spawn:[1,0],queueBlockIds:['cargo'],trigger:'move'}]};
  const model=new runtime.PuzzleModel(level);model.start();model.beginAction();
  assert.equal(model.snapshot().queuedBlocks.length,1);
  assert.equal(model.moveBlockStep('owner',2,0),true);
  assert.equal(model.snapshot().queuedBlocks.length,0,'FIFO materializes during a held unit move before commit');
  assert.equal(model.snapshot().generators[0].head,1);
  const lift=structuredClone(level);delete lift.generators;
  lift.shutters=[{id:'lift',skin:'lift',x:1,y:0,width:1,height:1,count:1}];lift.blocks[1].shutterId='lift';
  const liftModel=new runtime.PuzzleModel(lift);liftModel.start();liftModel.beginAction();
  assert.equal(liftModel.snapshot().shutters[0].revealed,false);
  assert.equal(liftModel.moveBlockStep('owner',2,0),true);
  assert.equal(liftModel.snapshot().shutters[0].revealed,true,'lift reveals before commit');
  for(const input of [level,lift,{...level,generators:[{...level.generators[0],trigger:'time',intervalSeconds:1}]}]){
    const result=boundedUpperSearch(runtime,input);
    assert.equal(result.status,'unsupported');assert.equal(result.witnessFound,false);
    assert.equal(result.termination,'held-world-mutation-requires-provided-route');
    assert.equal(result.discoveredStates,0);assert.equal(result.microDiscoveredStates,0);
  }
});
test('persistent ledger rejects budget reset, renamed input and colour-only/shape-only redesign',async()=>{
  const dir=await fs.mkdtemp('deliverables/daily-formal-v3-20261008/proof/ledger-test-'),level=tiny(),ledger=await createAttemptLedger(dir);
  const attempt=await ledger.claim(level);await ledger.finish(attempt,{accepted:false,status:'UNKNOWN_LOWER',levelSha256:attempt.levelSha256});
  const reopened=await createAttemptLedger(dir);
  await assert.rejects(()=>reopened.claim({...level,id:123,name:'new metadata',parMoves:999}),/INPUT_ALREADY_ATTEMPTED/);
  const recolored=structuredClone(level);recolored.blocks[0].color='green';
  await assert.rejects(()=>reopened.claim(recolored,{redesignOf:attempt.id}),/BOTH/);
  const reshaped=structuredClone(level);reshaped.blocks[0].shape=[[0,0],[0,1]];
  await assert.rejects(()=>reopened.claim(reshaped,{redesignOf:attempt.id}),/BOTH/);
  reshaped.blocks[0].color='green';const next=await reopened.claim(reshaped,{redesignOf:attempt.id});
  assert.notEqual(next.id,attempt.id);assert.notEqual(next.shapeSha256,attempt.shapeSha256);assert.notEqual(next.colorSha256,attempt.colorSha256);
  assert.equal(designFingerprints(level).designSha256,attempt.id);
});
test('only successful designs allow explicit fresh revalidation, without clearing a later failure',async()=>{
  const dir=await fs.mkdtemp('deliverables/daily-formal-v3-20261008/proof/revalidation-test-'),level=tiny(),ledger=await createAttemptLedger(dir);
  const first=await ledger.claim(level);await ledger.finish(first,{accepted:true,status:'qualification-pass',levelSha256:first.levelSha256});
  await assert.rejects(()=>ledger.claim(level),/INPUT_ALREADY_ATTEMPTED/);
  const fresh=await ledger.claim(level,{allowRevalidation:true});assert.equal(fresh.revalidates,first.id);
  await ledger.finish(fresh,{accepted:false,status:'UNKNOWN_LOWER',levelSha256:fresh.levelSha256});
  await assert.rejects(()=>ledger.claim(level,{allowRevalidation:true}),/INPUT_ALREADY_ATTEMPTED/);
});

test('equivalent playable encodings and legacy fingerprints cannot reset a failed input',async()=>{
  const level=tiny(),explicit=structuredClone(level);explicit.playable=[[1,1],[0,1],[1,0],[0,0]];explicit.blocked=[];
  assert.equal(designFingerprints(level).designSha256,designFingerprints(explicit).designSha256);
  const cut=structuredClone(explicit);cut.blocked=[[1,1]];
  const cutExplicit=structuredClone(level);cutExplicit.playable=[[0,0],[1,0],[0,1]];
  assert.equal(designFingerprints(cut).designSha256,designFingerprints(cutExplicit).designSha256);
  const dir=await fs.mkdtemp('deliverables/daily-formal-v3-20261008/proof/legacy-ledger-test-');
  const old={...designFingerprints(level),id:'a'.repeat(64),designSha256:'a'.repeat(64),levelSha256:'b'.repeat(64)};
  const request=JSON.stringify(old),result=JSON.stringify({accepted:false,status:'UNKNOWN_LOWER'});
  await fs.writeFile(`${dir}/${old.id}.request.json`,request);await fs.writeFile(`${dir}/${old.id}.result.json`,result);
  const ledger=await createAttemptLedger(dir);
  await assert.rejects(()=>ledger.claim(explicit,{allowRevalidation:true}),/INPUT_ALREADY_ATTEMPTED/);
  assert.equal(await fs.readFile(`${dir}/${old.id}.request.json`,'utf8'),request);
  assert.equal(await fs.readFile(`${dir}/${old.id}.result.json`,'utf8'),result);
});

/** Independent labelled 0/1 graph: no compiled poses, monotone-clear closure,
 * symmetry quotient or v2 proof call. Optional exits use only the authoritative
 * portal geometry; every legal held-turn parking position is enumerated. */
function optionalOracle(level){
  const none=-1,W=level.width,H=level.height,start=level.blocks.map(b=>b.y*W+b.x);
  const encode=s=>s.join(','),best=new Map([[encode(start),0]]),open=[{s:start,cost:0}];let expanded=0;
  const cells=(i,p)=>level.blocks[i].shape.map(([dx,dy])=>[p%W+dx,Math.floor(p/W)+dy]);
  const legal=new Set((level.playable??Array.from({length:W*H},(_,p)=>[p%W,Math.floor(p/W)])).map(p=>p.join(',')));
  for(const p of level.blocked??[])legal.delete(p.join(','));
  while(open.length){
    open.sort((a,b)=>b.cost-a.cost);const {s,cost}=open.pop();if(best.get(encode(s))!==cost)continue;
    if(s.every(p=>p===none))return{cost,expanded};assert(++expanded<=10000,'tiny independent oracle budget');
    const add=(next,value)=>{const k=encode(next);if((best.get(k)??Infinity)<=value)return;best.set(k,value);open.push({s:next,cost:value});};
    for(let i=0;i<s.length;i++)if(s[i]!==none){
      const occupied=new Set(s.flatMap((p,j)=>j!==i&&p!==none?cells(j,p).map(p=>p.join(',')):[]));
      const reached=new Set([s[i]]),queue=[s[i]];
      for(let at=0;at<queue.length;at++){
        const p=queue[at],footprint=cells(i,p),body=level.blocks[i];
        for(const side of ['top','right','bottom','left']){
          if(!runtime.exitFrontierFacesBoundary(level,footprint,side))continue;
          const portal=runtime.resolveMatchingGatePortal(level,footprint,side,level.gates,[]);
          if(portal?.gate.color===body.color){const next=s.slice();next[i]=none;add(next,cost);}
        }
        if(p!==s[i]){const next=s.slice();next[i]=p;add(next,cost+1);}
        for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
          const x=p%W+dx,y=Math.floor(p/W)+dy,next=y*W+x;if(x<0||x>=W||y<0||y>=H||reached.has(next))continue;
          if(cells(i,next).every(p=>legal.has(p.join(','))&&!occupied.has(p.join(',')))){reached.add(next);queue.push(next);}
        }
      }
    }
  }return{cost:Infinity,expanded};
}
test('plain closure and identical-body quotient agree with an independent labelled optional-gesture graph',()=>{
  let cases=0;const observed=new Set();
  for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++)if(a!==b&&a!==c&&b!==c){
    const level=tiny();level.width=3;level.blocks=[
      {id:'a',x:a%3,y:Math.floor(a/3),shape:[[0,0]],color:'red'},
      {id:'b',x:b%3,y:Math.floor(b/3),shape:[[0,0]],color:'blue'},
      {id:'c',x:c%3,y:Math.floor(c/3),shape:[[0,0]],color:'red'}];
    const oracle=optionalOracle(level),proof=boundedPlainTask(level,runtime,{floor:1,searchUpper:8});observed.add(oracle.cost);cases++;
    assert.equal(proof.cost??Infinity,oracle.cost,JSON.stringify({a,b,c,proof}));
    assert(proof.discoveredStates<=10000&&proof.exploredStates<=10000);
  }
  assert.equal(cases,120);assert(observed.has(0)&&observed.has(1));
});
