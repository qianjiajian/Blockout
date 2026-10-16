import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {levelSha256} from '../formal-v2/contract.mjs';
import {boundedPlainTask,boundedLowerTask,selectBoundedStrategy,exploreBoundedIceCandidate,createAttemptLedger} from './bounded-proof.mjs';
import {boundedIceTask,assertIceProofDomain,replayIceWitness,loadIceProofRuntime} from './bounded-ice-proof.mjs';

const runtime=await loadIceProofRuntime();
const qualification={graphs:0,solvable:0,dead:0,strengthened:0,turnedMicro:0};
const fixture=()=>({id:996410,name:'daily independent static-ice qualification only',difficulty:'super',reward:0,timeSeconds:180,mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
  blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],
  gates:[{id:'r-out',side:'right',offset:0,size:1,color:'red'},{id:'b-out',side:'left',offset:0,size:1,color:'blue'}]});
const stateKey=model=>{const s=model.snapshot();delete s.moves;return JSON.stringify(s);};

/** Independent actual PuzzleModel 0-1 Dijkstra for TINY synthetic fixtures.
 * Enumerates optional exits, all parking endpoints, complete held turns, and
 * all removal orders. No compiled spatial helper/closure/body quotient used.
 */
function fullModelMinimum(level,maxStates=10000){
  runtime.validateLevel(level);const initial=new runtime.PuzzleModel(structuredClone(level));initial.startCountdown();
  const costs=new Map([[stateKey(initial),0]]),queue=[{model:initial,cost:0}];let turns=0;
  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost);const node=queue.shift();if(costs.get(stateKey(node.model))!==node.cost)continue;
    if(node.model.snapshot().complete)return{cost:node.cost,states:costs.size,turns};
    for(const body of node.model.snapshot().blocks){
      if(!node.model.isBlockActive(body))continue;
      const held=[{model:node.model,path:[]}],micro=new Set([stateKey(node.model)]);
      const enqueue=(points,exitSide)=>{
        const model=node.model.clone();model.beginAction();const before=model.snapshot().cleared;
        for(const p of points)assert(model.moveBlockStep(body.id,...p));
        if(exitSide&&!model.tryExit(body.id,exitSide).ok)return;
        const delta=model.snapshot().cleared-before;if(!model.commitAction())return;
        const k=stateKey(model),cost=node.cost+Number(delta===0);if((costs.get(k)??Infinity)<=cost)return;
        if(!costs.has(k)&&costs.size>=maxStates)throw Error('Independent tiny fixture exceeded raw budget');
        costs.set(k,cost);queue.push({model,cost});
      };
      for(let h=0;h<held.length;h++){
        const n=held[h],b=n.model.getBlock(body.id);
        if(n.path.length>1){const p=[[body.x,body.y],...n.path],axes=new Set(p.slice(1).map((v,i)=>v[0]!==p[i][0]?'x':'y'));if(axes.size>1)turns++;}
        if(n.path.length)enqueue(n.path);
        for(const side of ['top','right','bottom','left'])enqueue(n.path,side);
        for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
          const next=n.model.clone();next.beginAction();const p=[b.x+dx,b.y+dy];if(!next.moveBlockStep(body.id,...p))continue;
          const k=stateKey(next);if(micro.has(k))continue;micro.add(k);held.push({model:next,path:[...n.path,p]});
        }
      }
    }
  }
  return{cost:Infinity,states:costs.size,turns};
}

test('ice-aware closure matches 972 complete tiny PuzzleModel graphs including frozen-body asymmetry',()=>{
  let checked=0,turned=0,solvable=0,dead=0;
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(a!==b)
    for(let iceA=0;iceA<3;iceA++)for(let iceB=0;iceB<3;iceB++)for(let gateA=0;gateA<3;gateA++)for(let gateB=0;gateB<3;gateB++){
      const level=fixture();Object.assign(level.blocks[0],{x:a%2,y:Math.floor(a/2)});Object.assign(level.blocks[1],{x:b%2,y:Math.floor(b/2)});
      if(iceA)level.blocks[0].frozen=iceA;if(iceB)level.blocks[1].frozen=iceB;if(gateA)level.gates[0].frozen=gateA;if(gateB)level.gates[1].frozen=gateB;
      const hash=levelSha256(level),actual=fullModelMinimum(level),search=boundedIceTask(level,runtime,{floor:1,searchUpper:8,maxMilliseconds:30000});
      assert(['threshold-proven','relaxed-shortcut'].includes(search.status),JSON.stringify(search));
      assert.equal(search.cost??Infinity,actual.cost,JSON.stringify({a,b,iceA,iceB,gateA,gateB,search,actual}));
      assert.equal(levelSha256(level),hash);assert(search.rawFullBoardStates<=10000);checked++;turned+=actual.turns;
      if(Number.isFinite(actual.cost)){solvable++;const replay=replayIceWitness(runtime,level,search);assert.equal(replay.actualUpperValidated,true);assert.equal(replay.U,actual.cost);}else dead++;
    }
  assert.equal(checked,972);assert(turned>0&&solvable>0&&dead>0);Object.assign(qualification,{graphs:checked,solvable,dead,turnedMicro:turned});
});

test('same-colour bodies with different initial ice are not quotiented interchangeably',()=>{
  let count=0;
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(a!==b)for(let ice=1;ice<=2;ice++){
    const level=fixture();level.blocks[1].color='red';level.blocks[1].frozen=ice;level.gates=level.gates.slice(0,1);
    Object.assign(level.blocks[0],{x:a%2,y:Math.floor(a/2)});Object.assign(level.blocks[1],{x:b%2,y:Math.floor(b/2)});
    const actual=fullModelMinimum(level),search=boundedIceTask(level,runtime,{floor:1,searchUpper:8});
    assert.equal(search.cost??Infinity,actual.cost);count++;
  }
  assert.equal(count,24);qualification.graphs+=count;
});

test('real ice order can strictly strengthen a finite lower bound over deleting ice',()=>{
  let compared=0,strengthened=0;
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++)if(new Set([a,b,c]).size===3){
    const base=fixture();base.blocks=[{id:'a',color:'red',shape:[[0,0]],x:a%2,y:Math.floor(a/2)},{id:'b',color:'blue',shape:[[0,0]],x:b%2,y:Math.floor(b/2)},{id:'c',color:'green',shape:[[0,0]],x:c%2,y:Math.floor(c/2)}];base.gates.push({id:'g-out',side:'bottom',offset:0,size:1,color:'green'});
    const plain=boundedPlainTask(base,runtime,{floor:1,searchUpper:8});
    for(let g=0;g<3;g++)for(let value=1;value<=2;value++){
      const level=structuredClone(base);level.gates[g].frozen=value;
      const actual=fullModelMinimum(level),ice=boundedIceTask(level,runtime,{floor:1,searchUpper:8});
      assert.equal(ice.cost??Infinity,actual.cost);compared++;
      if(Number.isFinite(ice.cost)&&ice.cost>plain.cost)strengthened++;
    }
  }
  qualification.graphs+=compared;qualification.strengthened=strengthened;assert.equal(compared,144);assert(strengthened>0,'At least one solvable graph must need more parking because of real ice order');
});

test('multi-cell static ice and playable masks agree with complete actual graph',()=>{
  const levels=[];
  const a=fixture();a.width=3;a.height=3;a.blocks=[{id:'a',x:0,y:0,color:'red',shape:[[0,0],[1,0]]},{id:'b',x:1,y:1,color:'blue',shape:[[0,0],[0,1]],frozen:1}];a.gates=[{id:'r-out',side:'top',offset:0,size:2,color:'red'},{id:'b-out',side:'right',offset:1,size:2,color:'blue',frozen:1}];levels.push(a);
  const b=structuredClone(a);b.playable=[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[1,2]];b.gates=[{id:'r-out',side:'top',offset:0,size:2,color:'red'},{id:'b-out',side:'bottom',offset:1,size:1,color:'blue',frozen:1}];levels.push(b);
  for(const level of levels){const exact=fullModelMinimum(level),search=boundedIceTask(level,runtime,{floor:1,searchUpper:8});assert.equal(search.cost??Infinity,exact.cost);assert.equal(replayIceWitness(runtime,level,search).actualUpperValidated,true);}
});

test('all caps interrupt with UNKNOWN and raw cap includes every closure intermediate',()=>{
  const clear=fixture();clear.gates[0].side='left';clear.gates[1].side='right';clear.gates[1].frozen=1;
  const pass=boundedIceTask(clear,runtime,{floor:1,searchUpper:8});assert.equal(pass.cost,0);assert.equal(pass.rawFullBoardStates,3);assert.equal(pass.quotientDiscoveredStates,1);assert.equal(pass.rawExploredStates,2);assert.equal(pass.exploredStates,2);assert.equal(pass.quotientExploredStates,0);
  const raw=boundedIceTask(clear,runtime,{floor:1,searchUpper:8,maxStates:2});assert.equal(raw.status,'unknown');assert.equal(raw.thresholdProven,false);assert.equal(raw.rawFullBoardStates,2);assert.equal(raw.termination,'max-raw-board-states');
  for(const options of [{maxTransitions:1},{maxMicroStates:1},{maxDragStates:1}]){
    const stopped=boundedIceTask(fixture(),runtime,{floor:1,searchUpper:8,...options});assert.equal(stopped.status,'unknown');assert.equal(stopped.thresholdProven,false);
  }
  const partial=boundedIceTask(fixture(),runtime,{floor:1,searchUpper:8,maxStates:2});assert(partial.certifiedFloor>=1);assert.equal(partial.status,'unknown');assert.equal(partial.thresholdProven,false);
  assert.throws(()=>boundedIceTask(fixture(),runtime,{floor:1,maxStates:10001}),/Invalid bounded budget/);
});

test('deadline cannot turn unfinished route search into a certified success',t=>{
  let now=0;t.mock.method(Date,'now',()=>now+=10);
  const stopped=boundedIceTask(fixture(),runtime,{floor:1,searchUpper:8,maxMilliseconds:1});
  assert.equal(stopped.status,'unknown');assert.equal(stopped.termination,'deadline');assert.equal(stopped.thresholdProven,false);
});

test('unsupported mechanisms and unknown fields never enter ice closure',()=>{
  const mutators=[l=>l.blocks[0].layers=['red','blue'],l=>l.blocks[0].movementAxis='horizontal',l=>l.blocks[0].star=true,l=>l.blocks[0].keyId='key',l=>l.blocks[0].timedBombSeconds=10,l=>l.shutters=[{id:'cover'}],l=>l.generators=[{id:'queue'}],l=>l.flipDoors=[{id:'flip'}],l=>l.coloredGrids=[{id:'grid'}],l=>l.elevators=[{}],l=>l.conveyors=[{}],l=>l.seams=[{}],l=>l.rocketRescue={},l=>l.gates[0].star=true,l=>l.blocks[0].frozen=0,l=>l.gates[0].frozen=0];
  for(const mutate of mutators){const level=fixture();mutate(level);assert.throws(()=>assertIceProofDomain(level));assert.equal(boundedIceTask(level,runtime,{floor:1}).status,'unsupported');}
});

test('witness qualification rejects a different object and changed route; binds solver source',async()=>{
  const level=fixture(),search=boundedIceTask(level,runtime,{floor:1,searchUpper:8});assert.equal(replayIceWitness(runtime,level,search).actualUpperValidated,true);
  const other=structuredClone(level);other.gates[0].frozen=1;assert.equal(replayIceWitness(runtime,other,search).actualUpperValidated,false);assert.equal(replayIceWitness(runtime,other,search).lowerBoundCertified,false);
  const corrupt=structuredClone(search);corrupt.drags.pop();assert.equal(replayIceWitness(runtime,level,corrupt).actualUpperValidated,false);
  const oversized=structuredClone(search);oversized.rawFullBoardStates=10001;assert.equal(replayIceWitness(runtime,level,oversized).actualUpperValidated,false);assert.equal(replayIceWitness(runtime,level,oversized).lowerBoundCertified,false);
  assert(runtime.iceBindings['tools/daily-challenge/formal-v3/bounded-ice-proof.mjs']);assert.equal(levelSha256(runtime.iceBindings),runtime.iceProofSha256);
});

test('unified strategy preserves ice before claim and never treats mixed mechanisms as the ice domain',()=>{
  const level=fixture();level.gates[0].frozen=1;
  assert.deepEqual(selectBoundedStrategy(level),{route:'ice-joint',lower:'ice-native'});
  assert.deepEqual(selectBoundedStrategy(level,{providedRoute:true}),{route:'provided',lower:'ice-native'});
  const lower=boundedLowerTask(runtime,level,1,{maxStates:40});
  assert.equal(lower.method,'v3-native-static-ice');assert.equal(lower.projection,null);
  assert.equal(lower.result.iceProofSha256,runtime.toolchainSha256);
  const mixed=structuredClone(level);mixed.blocks[0].movementAxis='horizontal';
  assert.equal(selectBoundedStrategy(mixed).lower,'ice-preserving');
  assert.throws(()=>selectBoundedStrategy(mixed,{routeStrategy:'ice-minimum'}),/qualified static/);
});

test('unified ice exploration uses one ledger claim and a complete two-model witness; failures cannot switch strategy',async()=>{
  const level=fixture();level.gates[0].side='top';level.gates[0].frozen=1;
  const dir=await fs.mkdtemp('deliverables/daily-formal-v3-20261008/proof/ice-integration-ledger-');
  const report=await exploreBoundedIceCandidate(runtime,{sourceLevelId:level.id,level},{floor:1,searchUpper:4,ledgerDirectory:dir});
  assert.equal(report.accepted,true);assert.equal(report.L,1);assert.equal(report.U,1);
  assert(report.replay.valid&&report.independentReplay.valid);assert.equal(report.formalReady,false);
  assert.equal(report.toolchainSha256,runtime.toolchainSha256);assert.equal(report.proof.rawFullBoardStates,report.proof.discoveredStates);
  assert.equal(JSON.parse(await fs.readFile(`${dir}/${report.attempt.id}.result.json`,'utf8')).accepted,true);
  await assert.rejects(()=>exploreBoundedIceCandidate(runtime,{level},{floor:1,searchUpper:4,ledgerDirectory:dir}),/INPUT_ALREADY_ATTEMPTED/);
  const blockedDir=await fs.mkdtemp('deliverables/daily-formal-v3-20261008/proof/ice-blocked-ledger-');
  const failed=await exploreBoundedIceCandidate(runtime,{level},{floor:1,searchUpper:4,budget:{maxStates:1},ledgerDirectory:blockedDir});
  assert.equal(failed.accepted,false);assert.equal(failed.proof.status,'unknown');assert.equal(failed.redesignRequired,true);
  const ledger=await createAttemptLedger(blockedDir),relabelled=structuredClone(level);relabelled.name='different tool name';delete relabelled.gates[0].frozen;
  await assert.rejects(()=>ledger.claim(relabelled,{allowRevalidation:true}),/INPUT_ALREADY_ATTEMPTED/);
  await assert.rejects(()=>exploreBoundedIceCandidate(runtime,{level},{floor:1,searchUpper:4,budget:{maxStates:10000},ledgerDirectory:blockedDir}),/INPUT_ALREADY_ATTEMPTED/);
});

test.after(async()=>{if(!process.env.ICE_QUALIFICATION_OUT)return;const dir=process.env.ICE_QUALIFICATION_OUT;await fs.mkdir(dir,{recursive:false});await fs.writeFile(`${dir}/report.json`,JSON.stringify({schemaVersion:1,status:"STATIC_ICE_UNIFIED_LEDGER_INTEGRATION_QUALIFIED",...qualification,multicellMaskGraphs:2,tests:10,iceProofSha256:runtime.iceProofSha256,iceBindings:runtime.iceBindings,boundedToolchainSha256:runtime.toolchainSha256,productionChanged:false,historicalCandidateSearches:0,catalogAcceptanceEnabled:true,formalReady:false},null,2)+"\n",{flag:"wx"});});
