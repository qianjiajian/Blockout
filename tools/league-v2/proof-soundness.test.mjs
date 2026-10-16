import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLeagueProofRuntime,boundedPlainTask,levelSha256} from './proof-contract.mjs';
import {projectStaticConstraints} from '../daily-challenge/formal-v2/constraint-projection.mjs';
import {projectOpeningOuterBodies} from '../daily-challenge/formal-v2/inventory-projection.mjs';
import {projectFullPhysicalShutters} from '../daily-challenge/formal-v2/shutter-materialization-projection.mjs';

const runtime=await loadLeagueProofRuntime();
const fixture=()=>({id:900006,name:'proof qualification fixture only',difficulty:'hard',reward:0,timeSeconds:180,
  mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
  blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],
  gates:[{id:'r',side:'right',offset:0,size:1,color:'red'},{id:'b-out',side:'left',offset:0,size:1,color:'blue'}]});
const stateKey=model=>{const snapshot=model.snapshot();delete snapshot.moves;return levelSha256(snapshot);};

/** Independent test-only Dijkstra on full PuzzleModel, without greedy clears,
 * identical-body quotient or projections. Held BFS can turn and chooses exits
 * optionally. Only small synthetic qualification fixtures use this enumerator.
 */
function fullGraphCost(level,maxStates=10000){
  runtime.validateLevel(level);const initial=new runtime.PuzzleModel(level),initialKey=stateKey(initial);
  const costs=new Map([[initialKey,0]]),queue=[{model:initial,cost:0}];let states=1,turningGesture=false;
  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost);const n=queue.shift(),key=stateKey(n.model);if(costs.get(key)!==n.cost)continue;
    if(n.model.snapshot().complete)return {cost:n.cost,states,turningGesture};
    for(const selected of n.model.snapshot().blocks){
      if(!n.model.isBlockActive(selected))continue;
      const holds=[{model:n.model,path:[]}],heldSeen=new Set([stateKey(n.model)]);
      const enqueue=(heldPath,exitSide)=>{
        const model=n.model.clone();model.beginAction();const before=model.snapshot().cleared;
        for(const point of heldPath)assert(model.moveBlockStep(selected.id,...point));
        if(exitSide&&!model.tryExit(selected.id,exitSide).ok)return;
        const clearDelta=model.snapshot().cleared-before;
        if(!model.commitAction())return;
        const k=stateKey(model),cost=n.cost+Number(!clearDelta);if((costs.get(k)??Infinity)<=cost)return;
        if(!costs.has(k)&&++states>maxStates)throw Error('qualification graph budget exceeded');
        costs.set(k,cost);queue.push({model,cost});
      };
      for(let h=0;h<holds.length;h++){
        const held=holds[h],body=held.model.getBlock(selected.id);
        if(held.path.length>1){const all=[[selected.x,selected.y],...held.path],axes=new Set(all.slice(1).map((p,i)=>p[0]!==all[i][0]?'x':'y'));if(axes.size>1)turningGesture=true;}
        if(held.path.length)enqueue(held.path);
        for(const side of ['top','right','bottom','left']){
          enqueue(held.path,side);
        }
        for(const [dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
          const next=held.model.clone();next.beginAction();const point=[body.x+dx,body.y+dy];
          if(!next.moveBlockStep(selected.id,...point))continue;const k=stateKey(next);if(heldSeen.has(k))continue;
          heldSeen.add(k);holds.push({model:next,path:[...held.path,point]});
        }
      }
    }
  }return {cost:Infinity,states,turningGesture};
}

test('plain early-clear closure and body quotient match complete independent held-gesture graph',()=>{
  let checked=0,turns=0;
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(a!==b){
    const level=fixture();Object.assign(level.blocks[0],{x:a%2,y:Math.floor(a/2)});Object.assign(level.blocks[1],{x:b%2,y:Math.floor(b/2)});
    const exact=fullGraphCost(level),plain=boundedPlainTask(level,runtime,{floor:1,searchUpper:4});
    assert.equal(plain.cost,exact.cost);checked++;turns+=Number(exact.turningGesture);
    const same=structuredClone(level);same.blocks[1].color='red';same.gates=same.gates.filter(g=>g.color==='red');
    const quotientExact=fullGraphCost(same),quotient=boundedPlainTask(same,runtime,{floor:1,searchUpper:4});assert.equal(quotient.cost,quotientExact.cost);checked++;
  }
  assert.equal(checked,24);assert(turns>0);
});

test('ice/axes/locks/star/flip erasure is lower-only and cost nonincreasing in complete fixture graphs',()=>{
  const variants=[];
  const gateIce=fixture();gateIce.gates[1].frozen=1;variants.push(gateIce);
  const bodyIce=fixture();bodyIce.blocks[1].frozen=1;variants.push(bodyIce);
  const axis=fixture();axis.blocks[0].movementAxis='horizontal';variants.push(axis);
  const key=fixture();key.blocks[0].keyId='k';key.blocks[1].lockedBy='k';key.blocks[1].lockCount=1;variants.push(key);
  const star=fixture();star.blocks[1].star=true;star.gates[1].star=true;variants.push(star);
  const flip=fixture();flip.flipDoors=[{...flip.gates[1],initiallyOpen:false}];flip.gates=flip.gates.slice(0,1);variants.push(flip);
  for(const original of variants){
    const before=levelSha256(original),projection=projectStaticConstraints(original),a=fullGraphCost(original),b=fullGraphCost(projection.projectedLevel);
    assert(b.cost<=a.cost);assert.equal(levelSha256(original),before);assert.equal(projection.sourceLevelSha256,before);assert.equal(projection.upperBoundTransfer,false);
    assert.equal(boundedPlainTask(original,runtime,{floor:1}).status,'unsupported','never apply plain closure directly to mechanisms');
  }
});

test('shell first peel projection removes only mapped outer body; original upper replay stays mandatory',()=>{
  const level=fixture();level.blocks[0].layers=['red','blue'];
  const p=projectOpeningOuterBodies(level,runtime);assert.equal(p.retainedOuterBodies.length,2);assert.equal(p.upperBoundTransfer,false);
  const actual=fullGraphCost(level),projected=fullGraphCost(p.projectedLevel);assert(projected.cost<=actual.cost);
  const optional=boundedPlainTask(p.projectedLevel,runtime,{floor:1,searchUpper:4});
  const falseUpper=runtime.replayRevisedRoute(level,optional.drags);assert.equal(falseUpper.valid&&falseUpper.complete,false);
});

test('physical shutter materialization requires full single nonoverlapping cohort; lift does not qualify',()=>{
  const level=fixture();level.shutters=[{id:'cover',x:1,y:0,width:1,height:1,count:1}];level.blocks[1].shutterId='cover';
  const p=projectFullPhysicalShutters(level,runtime);assert.equal(p.preservesAllBodies,true);assert.equal(p.upperBoundTransfer,false);
  assert(fullGraphCost(p.projectedLevel).cost<=fullGraphCost(level).cost);
  const lift=structuredClone(level);lift.shutters[0].skin='lift';assert.throws(()=>projectFullPhysicalShutters(lift,runtime),/positive-count physical cover/);
  const hole=structuredClone(level);hole.shutters[0].height=2;assert.throws(()=>projectFullPhysicalShutters(hole,runtime),/not independently full/);
});
