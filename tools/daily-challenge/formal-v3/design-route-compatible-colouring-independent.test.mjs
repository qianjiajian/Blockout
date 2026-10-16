import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {recolourKnownPlainWitness} from './design-route-compatible-colouring.mjs';
import {auditPlainForwardDrag,auditCompleteReverseWitness} from './reverse-route-audit.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

const runtime=await loadBoundedRuntime();
const colours=['red','blue','green','yellow','purple','orange'];
function fixture(){
 const level={id:998019,name:'Independent route-colouring oracle',width:3,height:2,timeSeconds:180,difficulty:'super',reward:0,mechanismRules:'revised-2026-09-27-v1.5',
  blocks:colours.map((color,i)=>({id:`b${i}`,color,x:i%3,y:Math.floor(i/3),shape:[[0,0]]})),
  gates:[{id:'red',color:'red',side:'left',offset:1,size:1},...['blue','green'].map((color,i)=>({id:color,color,side:'top',offset:i+1,size:1})),
   ...['yellow','purple','orange'].map((color,i)=>({id:color,color,side:'bottom',offset:i,size:1}))]};
 const drags=[...[1,2,3,4,5].map(i=>({blockId:`b${i}`,path:[],exitSide:i<3?'top':'bottom'})),
  {blockId:'b0',path:[[1,0],[2,0],[2,1]]},{blockId:'b0',path:[[1,1],[0,1]],exitSide:'left'}];
 return{level,drags};
}
function accounting({maxWorlds=10000,maxMicro=3000000}={}){
 const worlds=new Set(),stats={raw:0,expandedCalls:0,micro:0,transitions:0};
 return{stats,charge(level,expanded=false){const key=levelSha256(level);if(!worlds.has(key)){
   if(worlds.size>=maxWorlds)throw Error('independent-raw-limit');worlds.add(key);stats.raw=worlds.size;
  }if(expanded)stats.expandedCalls++;return key;},micro(){if(stats.micro>=maxMicro)throw Error('independent-micro-limit');stats.micro++;},transition(){if(stats.transitions>=10000000)throw Error('independent-transition-limit');stats.transitions++;}};
}
test('all six recolours agree with independent actual first-contact parking oracle, including a held turn',()=>{
 const {level,drags}=fixture(),before=JSON.stringify({level,drags}),budget=accounting();
 assert(auditCompleteReverseWitness(runtime,level,drags).valid);
 const result=recolourKnownPlainWitness(runtime,level,drags,budget);
 assert(result.ok);assert(result.replay.valid&&result.replay.complete&&result.independentReplay.valid&&result.independentReplay.complete);
 assert.equal(result.U,1);assert.equal(result.statistics.finalDoubleReplays,1);assert.equal(result.fullBoardDifficultySearches,0);
 const domain=result.domains.find(d=>d.id==='b0'),oracle=[];
 for(const color of colours){
  const opening={...structuredClone(level),blocks:[{...structuredClone(level.blocks[0]),color}]};
  const audit=auditPlainForwardDrag(runtime,opening,drags[5],{expectedBodies:[{...opening.blocks[0],x:2,y:1}]});
  if(audit.valid)oracle.push(color);
 }
 assert.deepEqual(domain.choices.map(c=>c.color).sort(),oracle.sort());
 assert.deepEqual(oracle,['purple','red','yellow']);
 for(const color of ['blue','green'])assert.equal(domain.excluded.find(c=>c.color===color).reason,'parking-intermediate-exit');
 assert.equal(domain.excluded.find(c=>c.color==='orange').reason,'parking-endpoint-exit');
 assert.equal(JSON.stringify({level,drags}),before);assert(budget.stats.raw>1&&budget.stats.raw<=10000);
});
test('shared raw ceiling stops before a second complete world can be admitted',()=>{
 const {level,drags}=fixture(),budget=accounting({maxWorlds:1});
 assert.throws(()=>recolourKnownPlainWitness(runtime,level,drags,budget),/independent-raw-limit/);
 assert.equal(budget.stats.raw,1);
});
test('finite shared micro and CSP ceilings abort rather than retrying another assignment',()=>{
 const {level,drags}=fixture(),microBudget=accounting({maxMicro:1});
 assert.throws(()=>recolourKnownPlainWitness(runtime,level,drags,microBudget),/independent-micro-limit/);
 assert.equal(microBudget.stats.micro,1);
 const cspStats={nodes:0};
 assert.throws(()=>recolourKnownPlainWitness(runtime,level,drags,{...accounting(),maxCspNodes:1,cspStats}),/construction-max-colour-csp-nodes/);
 assert.equal(cspStats.nodes,1);
});
test('unsupported mechanisms, incomplete traces and unbounded CSP parameters fail closed',()=>{
 const {level,drags}=fixture(),ice=structuredClone(level);ice.blocks[0].frozen=1;
 assert.throws(()=>recolourKnownPlainWitness(runtime,ice,drags,accounting()));
 assert.throws(()=>recolourKnownPlainWitness(runtime,level,drags.slice(0,-1),accounting()),/not complete/);
 for(const maxCspNodes of [0,10001,Infinity,NaN])assert.throws(()=>recolourKnownPlainWitness(runtime,level,drags,{...accounting(),maxCspNodes}),/finite CSP/);
});
