import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {compileSpatial} from '../../continuation211-colored-witness.mjs';
import {reservedGuardBudget,guardAllowanceFor} from '../formal-v3/reserved-guard-budget.mjs';
import {SELF,AXIS_ICE_PROOF_VERSION,loadAxisIceProofRuntime,assertAxisIceProofDomain,
  boundedAxisIceTask,replayAxisIceWitness,axisIceBodyClassKey} from './bounded-axis-ice-proof.mjs';

const out=process.env.AXIS_ICE_PROOF_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const rt=await loadAxisIceProofRuntime(),checks=[],records=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
const old='tools/daily-challenge/formal-v3/bounded-ice-proof.mjs';
const oldSha='3d6bd7894b185ee69715b4c677986a564864d2c8b590fcc96b4526ff153a80ab';
assert.equal(sha(await fs.readFile(old)),oldSha);
const requests=async()=>(await fs.readdir('deliverables/daily-formal-v3-20261008/proof/attempts')).filter(n=>n.endsWith('.request.json')).sort();
const before=await requests();
const fixture=()=>({id:199,name:'Private axis ice tiny graph',difficulty:'super',reward:0,timeSeconds:180,
  mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
  blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],
  gates:[{id:'red',side:'right',offset:0,size:1,color:'red'},{id:'blue',side:'left',offset:0,size:1,color:'blue'}]});
const key=model=>{const {moves,...physical}=model.snapshot();return JSON.stringify(physical);};

/** Independent complete 0/1 actual-model graph for tiny private fixtures.
 * No compileSpatial, free-clear closure, body quotient or tested proof helper.
 * It enumerates all held unit walks, parking endpoints and optional exits.
 */
function oracle(level){
  rt.validateLevel(level);const model=new rt.PuzzleModel(structuredClone(level));model.startCountdown();
  const queue=[{model,cost:0}],best=new Map([[key(model),0]]);let expanded=0;
  while(queue.length){
    queue.sort((a,b)=>b.cost-a.cost);const node=queue.pop();if(best.get(key(node.model))!==node.cost)continue;
    if(node.model.snapshot().complete)return{cost:node.cost,states:best.size,expanded};
    assert(++expanded<10000,'Private exhaustive graph bound');
    for(const body of node.model.snapshot().blocks){
      if(!node.model.isBlockActive(body))continue;
      const held=[{model:node.model,points:[]}],seen=new Set([key(node.model)]);
      const commit=(points,side)=>{
        const next=node.model.clone();next.beginAction();const cleared=next.snapshot().cleared;
        for(const point of points)assert(next.moveBlockStep(body.id,...point));
        if(side&&!next.tryExit(body.id,side).ok)return;
        const delta=next.snapshot().cleared-cleared;if(!next.commitAction())return;
        const k=key(next),cost=node.cost+Number(delta===0);if((best.get(k)??Infinity)<=cost)return;
        assert(best.has(k)||best.size<10000,'Private complete-state bound');best.set(k,cost);queue.push({model:next,cost});
      };
      for(let at=0;at<held.length;at++){
        const h=held[at],b=h.model.getBlock(body.id);
        if(h.points.length)commit(h.points);
        for(const side of ['top','right','bottom','left'])commit(h.points,side);
        for(const [dx,dy]of [[0,1],[-1,0],[0,-1],[1,0]]){
          const next=h.model.clone();next.beginAction();const pos=[b.x+dx,b.y+dy];
          if(!next.moveBlockStep(body.id,...pos))continue;
          const k=key(next);if(seen.has(k))continue;seen.add(k);held.push({model:next,points:[...h.points,pos]});
        }
      }
    }
  }
  return{cost:null,states:best.size,expanded,exhausted:true};
}
function compare(level,label){
  const before=levelSha256(level),actual=oracle(level),proof=boundedAxisIceTask(level,rt,{floor:4,searchUpper:8});
  assert(['threshold-proven','relaxed-shortcut'].includes(proof.status),JSON.stringify({label,proof}));
  assert.equal(proof.cost??null,actual.cost,JSON.stringify({label,actual,proof}));
  assert.equal(levelSha256(level),before);assert(proof.rawFullBoardStates<=10000);
  records.push({label,level,oracle:actual,proof:{status:proof.status,termination:proof.termination,cost:proof.cost??null,
    raw:proof.rawFullBoardStates,quotient:proof.quotientDiscoveredStates,certifiedFloor:proof.certifiedFloor}});
  return{actual,proof};
}

test('432 complete tiny graphs keep axes, body ice and gate ice with no lost legal paths',()=>{
  let count=0,solvable=0,dead=0;const modes=[undefined,'horizontal','vertical'];
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(a!==b)
    for(const axisA of modes)for(const axisB of modes)for(let variant=0;variant<4;variant++){
      const l=fixture();Object.assign(l.blocks[0],{x:a%2,y:Math.floor(a/2)});Object.assign(l.blocks[1],{x:b%2,y:Math.floor(b/2)});
      if(axisA)l.blocks[0].movementAxis=axisA;if(axisB)l.blocks[1].movementAxis=axisB;
      if(variant===1)l.blocks[0].frozen=1;
      if(variant===2)l.gates[0].frozen=1;
      if(variant===3){l.blocks[1].frozen=1;l.gates[0].frozen=1;}
      const {actual}=compare(l,`grid-${a}-${b}-${axisA}-${axisB}-${variant}`);count++;
      if(actual.cost===null)dead++;else solvable++;
    }
  assert.equal(count,432);assert(solvable>0&&dead>0);checks.push({name:'complete-axis-ice-private-graphs',count,solvable,dead,passed:true});
});

test('same-colour same-shape bodies of different axes are distinct quotient classes',()=>{
  const base={color:'red',shape:[[0,0]],ice:0};
  assert.equal(new Set([undefined,'horizontal','vertical'].map(movementAxis=>axisIceBodyClassKey({...base,movementAxis}))).size,3);
  assert.notEqual(axisIceBodyClassKey({...base,movementAxis:'horizontal'}),axisIceBodyClassKey({...base,ice:1,movementAxis:'horizontal'}));
  let count=0;for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(a!==b)for(const modes of [['horizontal','vertical'],['horizontal',undefined],['vertical',undefined]]){
    const l=fixture();l.blocks[1].color='red';l.gates=[{id:'red-top',side:'top',offset:0,size:2,color:'red'},
      {id:'red-right',side:'right',offset:0,size:2,color:'red',frozen:1}];
    Object.assign(l.blocks[0],{x:a%2,y:Math.floor(a/2),movementAxis:modes[0]});
    Object.assign(l.blocks[1],{x:b%2,y:Math.floor(b/2)});if(modes[1])l.blocks[1].movementAxis=modes[1];
    const c=compileSpatial(l,rt);assert.notEqual(axisIceBodyClassKey(c.blocks[0]),axisIceBodyClassKey(c.blocks[1]));
    compare(l,`same-colour-${a}-${b}-${modes}`);count++;
  }
  checks.push({name:'mixed-axis-quotient-and-actual-oracle',count,passed:true});
});

test('compiled neighbours and side exits exactly preserve axis, including frozen multi-cell bodies',()=>{
  const l=fixture();l.width=3;l.height=3;l.blocks=[{id:'a',color:'red',x:0,y:0,shape:[[0,0],[1,0]],movementAxis:'horizontal'},
    {id:'b',color:'blue',x:2,y:0,shape:[[0,0],[0,1]],movementAxis:'vertical',frozen:1}];
  l.gates=[{id:'r',color:'red',side:'left',offset:0,size:1},{id:'blue-exit',color:'blue',side:'bottom',offset:2,size:1,frozen:1}];
  const {proof}=compare(l,'multi-cell-thaw');assert.equal(proof.cost,0);
  assert.equal(replayAxisIceWitness(rt,l,proof).actualUpperValidated,true);
  for(const axis of ['horizontal','vertical']){
    const q=fixture();q.blocks=q.blocks.slice(0,1);q.blocks[0].movementAxis=axis;
    q.gates=[{id:'side',color:'red',side:axis==='horizontal'?'top':'left',offset:0,size:2}];
    const {actual}=compare(q,`wrong-side-${axis}`);assert.equal(actual.cost,null);
    const c=compileSpatial(q,rt);for(const b of c.blocks)for(const [p,pose]of b.poses.entries())if(pose){
      assert.equal(pose.exits.flat().length,0);
      for(const n of pose.neighbors)assert(axis==='horizontal'?Math.floor(n/c.W)===Math.floor(p/c.W):n%c.W===p%c.W);
    }
  }
  checks.push({name:'axis-direction-and-thaw',passed:true});
});

test('raw closure intermediates, reserved terminal world, all caps and deadlines fail closed',t=>{
  const l=fixture();l.blocks.forEach(b=>b.movementAxis='horizontal');l.gates[0].side='left';l.gates[1].side='right';l.gates[1].frozen=1;
  const complete=boundedAxisIceTask(l,rt,{floor:1,searchUpper:8});assert.equal(complete.cost,0);assert.equal(complete.rawFullBoardStates,3);
  const capped=boundedAxisIceTask(l,rt,{floor:1,searchUpper:8,maxStates:2});
  assert.equal(capped.termination,'max-raw-board-states');assert.equal(capped.thresholdProven,false);assert.equal(capped.rawFullBoardStates,2);
  const guard=guardAllowanceFor(capped);assert.equal(guard.conservativeFullBoardStateUpperBound,3);
  for(const budget of [{maxTransitions:1},{maxMicroStates:1},{maxDragStates:1}]){
    const p=boundedAxisIceTask(fixture(),rt,{floor:1,searchUpper:8,...budget});assert.equal(p.status,'unknown');assert.equal(p.thresholdProven,false);
  }
  assert.throws(()=>reservedGuardBudget({maxStates:10000}));assert.throws(()=>boundedAxisIceTask(l,rt,{floor:1,maxStates:10001}));
  let now=0;t.mock.method(Date,'now',()=>now+=10);const timed=boundedAxisIceTask(l,rt,{floor:1,searchUpper:8,maxMilliseconds:1});
  assert.equal(timed.termination,'deadline');assert.equal(timed.thresholdProven,false);t.mock.restoreAll();
  checks.push({name:'caps-and-terminal-world',passed:true});
});

test('unknown fields, non-axis mechanisms and forged source/version or witnesses cannot pass',()=>{
  const mutators=[l=>l.blocks[0].movementAxis='diagonal',l=>l.blocks[0].movementAxis=null,l=>l.blocks[0].star=true,
    l=>l.blocks[0].keyId='x',l=>l.blocks[0].timedBombSeconds=9,l=>l.blocks[0].layers=['red','blue'],
    l=>l.gates[0].star=true,l=>l.gates[0].extra=true,l=>l.generators=[{}],l=>l.flipDoors=[{}],l=>l.coloredGrids=[{}],l=>l.unknown=true];
  for(const mutate of mutators){const l=fixture();mutate(l);assert.throws(()=>assertAxisIceProofDomain(l));assert.equal(boundedAxisIceTask(l,rt,{floor:1}).status,'unsupported');}
  assert.throws(()=>boundedAxisIceTask(fixture(),{...rt,axisIceProofVersion:rt.iceProofVersion},{floor:1}),/loadAxisIceProofRuntime/);
  const l=fixture();l.gates[0].side='left';l.gates[1].side='right';l.blocks.forEach(b=>b.movementAxis='horizontal');
  const p=boundedAxisIceTask(l,rt,{floor:1,searchUpper:8});assert.equal(replayAxisIceWitness(rt,l,p).actualUpperValidated,true);
  const other=structuredClone(l);other.blocks[0].movementAxis='vertical';assert.equal(replayAxisIceWitness(rt,other,p).actualUpperValidated,false);
  assert.equal(replayAxisIceWitness(rt,l,{...p,contractVersion:rt.iceProofVersion}).actualUpperValidated,false);
  assert.equal(replayAxisIceWitness(rt,l,{...p,drags:p.drags.slice(1)}).actualUpperValidated,false);
  assert.equal(rt.axisIceProofVersion,AXIS_ICE_PROOF_VERSION);assert.notEqual(rt.axisIceProofVersion,rt.iceProofVersion);
  assert.equal(rt.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
  assert.equal(levelSha256(rt.axisIceBindings),rt.axisIceProofSha256);assert(rt.axisIceBindings[SELF]);
  checks.push({name:'domain-version-and-same-object',passed:true});
});

test('search body is the original ice implementation except the declared axis class key',async()=>{
  const base=await fs.readFile(old,'utf8'),source=await fs.readFile(SELF,'utf8');
  const body=s=>s.slice(s.indexOf('  const stop=message=>'),s.indexOf('/** No search, no acceptance receipt.'));
  const expected=body(base).replace('k=JSON.stringify([b.color,normalizedShape(b),b.ice]);','k=axisIceBodyClassKey(b);');
  assert.equal(body(source).replaceAll('\r\n','\n'),expected.replaceAll('\r\n','\n'));
  assert.equal(sha(await fs.readFile(old)),oldSha);checks.push({name:'unchanged-core-search-body',passed:true});
});

test.after(async()=>{
  const bindings={...rt.axisIceBindings};const compiled=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  for(const p of [...Object.keys(compiled.metafile.inputs),'tools/daily-challenge/formal-v4/bounded-axis-ice-proof.test.mjs'])bindings[p.replaceAll('\\','/')]=sha(await fs.readFile(p));
  const after=await requests();const report={status:checks.length===6?'BOUNDED_AXIS_ICE_PRIVATE_PASS':'BOUNDED_AXIS_ICE_PRIVATE_INCOMPLETE',checks,
    exhaustiveGraphs:records.length,privateModelsOnly:true,qualificationOnly:true,axisIceProofVersion:rt.axisIceProofVersion,
    axisIceProofSha256:rt.axisIceProofSha256,frozenBaseToolchainSha256:rt.toolchainSha256,oldPrimitive:{path:old,sha256:oldSha},
    newRealConstructions:0,newRealCandidateSearches:0,newPublicClaims:0,publicBefore:before.length,publicAfter:after.length,
    externalPublicChanges:after.filter(n=>!before.includes(n)),fileBindings:bindings,errors:checks.length===6?[]:['Incomplete checks']};
  for(const [name,value]of [['report.json',report],['tiny-graph-results.json',records]])await fs.writeFile(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
});
