import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {compileTerminal,normalizeTerminal,checkTerminalNormalizedFloor} from '../../../tools/campaign-v145/lv051-060/terminal-normalized-floor58-v147.mjs';
import {stateFromSnapshot,eachImmediateOptional,checkImmediateGeneratorFloor} from '../../../tools/campaign-v145/lv051-060/immediate-generator-floor56-v146.mjs';
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const key=s=>String.fromCharCode(...s),piece=(id,x,y,color,extra={})=>({id,x,y,color,shape:[[0,0],[1,0]],...extra});
const fixture=()=>({id:58,name:'terminal-only normalization',difficulty:'normal',reward:0,timeSeconds:125,mechanismRules:'revised-2026-09-23-v1.4',width:5,height:5,
 gates:[{id:'r',color:'red',side:'left',offset:1,size:2},{id:'b',color:'blue',side:'right',offset:1,size:2},{id:'g',color:'green',side:'bottom',offset:1,size:2},{id:'y',color:'yellow',side:'bottom',offset:3,size:2,frozen:2}],
 generators:[{id:'machine',side:'top',offset:2,rimSpan:3,rimMount:'rim',spawn:[1,0],queueBlockIds:['cargo']}],
 blocks:[piece('carrier',0,1,'red',{layers:['red','blue']}),piece('ice',1,3,'green',{frozen:2,movementAxis:'vertical'}),piece('cargo',1,0,'yellow')]});
function apply(model,d){model.beginAction();for(const p of d.path)assert(model.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(model.tryExit(d.blockId,d.exitSide).ok);assert(model.commitAction());}
function normalizedModel(c,model){const n=normalizeTerminal(c,stateFromSnapshot(c,model.snapshot())),m=model.clone();for(const d of n.actions)apply(m,d);assert.equal(key(stateFromSnapshot(c,m.snapshot())),key(n.state));return m;}
test('pending cargo forbids normalization even when an opening body can clear',()=>{const l=fixture();l.blocks[0].x=1;l.blocks[0].y=0;delete l.blocks[0].layers;const c=compileTerminal(l,api);assert(c.initial.includes(510));assert.deepEqual(normalizeTerminal(c,c.initial),{state:c.initial,actions:[]});});
test('peeling is never normalized; after a real peel final bodies clear and thaw ice monotonically',()=>{const l=fixture(),c=compileTerminal(l,api),m=new api.PuzzleModel(l);assert(!c.initial.includes(510));assert.equal(normalizeTerminal(c,c.initial).actions.length,0);apply(m,{blockId:'carrier',path:[],exitSide:'left'});const n=normalizeTerminal(c,stateFromSnapshot(c,m.snapshot()));assert(n.actions.length>=2);const done=normalizedModel(c,m);assert(done.snapshot().complete);assert(n.actions.every(d=>d.blockId!=='carrier'||d.exitSide==='right'));});
test('every sampled real transition is simulated after closure without extra parking',()=>{const l=fixture(),c=compileTerminal(l,api),models=[new api.PuzzleModel(l)],seen=new Set();let states=0,edges=0;
 for(let i=0;i<models.length&&states<55;i++){const m=models[i],s=stateFromSnapshot(c,m.snapshot());if(seen.has(key(s)))continue;seen.add(key(s));states++;
  const nm=normalizedModel(c,m);
  eachImmediateOptional(c,s,(next,cost,get)=>{const drag=get(),real=m.clone();apply(real,drag);assert.equal(key(stateFromSnapshot(c,real.snapshot())),key(next));
   const mapped=nm.clone(),body=mapped.snapshot().blocks.find(b=>b.id===drag.blockId),before=mapped.snapshot().cleared;
   if(body)apply(mapped,drag);
   const actualCost=body&&mapped.snapshot().cleared===before?1:0;assert(actualCost<=cost);
   const closed=normalizedModel(c,mapped),target=normalizeTerminal(c,next),actual=stateFromSnapshot(c,closed.snapshot());
   // Early deletion can avoid an original parking action that would block a
   // later exit. The simulation relation is fewer bodies at identical retained
   // anchors/layers, not equality with the original's optional bad parking.
   assert(actual.every((v,j)=>v===511||v===target.state[j]));
   assert(closed.snapshot().cleared>=real.snapshot().cleared);edges++;if(i<2)models.push(real);
  });
 }assert(states>=10&&edges>=100,{states,edges});
});
test('small bounded floor results agree with the original full graph',()=>{for(const frozen of [0,2,8]){const l=fixture();l.gates[3].frozen=frozen;for(const floor of [1,2]){const opts={floor,maxStates:100000,maxMilliseconds:10000},a=checkImmediateGeneratorFloor(l,api,opts),b=checkTerminalNormalizedFloor(l,api,opts);assert.notEqual(a.status,'unknown');assert.notEqual(b.status,'unknown');assert.equal(b.thresholdProven,a.thresholdProven);}}});
test('future hidden occupancy and unsupported mechanisms cannot certify',()=>{for(const mutate of [l=>l.shutters=[{id:'hidden',x:3,y:3,width:2,height:1,count:2}],l=>l.blocks[1].shutterId='hidden',l=>l.blocks[0].keyId='key',l=>l.blocks[0].timedBombSeconds=10]){const l=fixture();mutate(l);const r=checkTerminalNormalizedFloor(l,api);assert.equal(r.status,'unsupported');assert.equal(r.thresholdProven,false);}});
