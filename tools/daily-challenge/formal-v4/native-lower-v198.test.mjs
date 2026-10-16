import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

// Only these NEW tiny qualification fixtures are searched. No selection,
// candidate, historical failure, public ledger or saved game is read.
// The original core loader runs in its immutable workspace, not today's UI tree.
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const frozen=path.join(repo,'deliverables/daily-formal-v4-20261008/frozen-workspace-4588');
process.chdir(frozen);
const {guardedNativeLowerTaskV198,boundedNativeLowerTaskV198,nativeLowerBudgetV198,NATIVE_LOWER_ENGINE_SHA}=await import('./native-lower-v198.mjs');
const {loadV4Runtime}=await import(pathToFileURL(path.join(frozen,'tools/daily-challenge/formal-v4/runtime.mjs')).href);
const runtime=await loadV4Runtime();
const policy={version:'1.198.0',bands:{1:{lower:13,upper:23},2:{lower:18,upper:33},3:{lower:28,upper:null}}};
const hash=x=>createHash('sha256').update(x).digest('hex');
const tiny=()=>({id:998610,name:'NEW NATIVE V198 TINY QUALIFICATION',difficulty:'hard',reward:0,timeSeconds:90,
 mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
 blocks:[{id:'shell',x:0,y:0,color:'red',layers:['red','green'],shape:[[0,0]]},{id:'blue',x:1,y:0,color:'blue',shape:[[0,0]]}],
 gates:[{id:'red-exit',side:'top',offset:0,size:1,color:'red'},{id:'green-exit',side:'right',offset:0,size:1,color:'green'},
  {id:'blue-exit',side:'left',offset:0,size:1,color:'blue'}]});
const physical=s=>{const {moves,...rest}=s;return rest;};

// Independent held-step oracle: selected ID and dirty hold are explicit states.
// Selection/unit motion/exit cost0, release costs1. Does not use native keys,
// gesture enumeration, its classifier, projections, clear closure or quotient.
// Its augmented state count is NOT the adapter's complete-board budget proof.
function oracle(level){
 const initial=new runtime.PuzzleModel(level);initial.start();
 const key=(s,held,dirty)=>JSON.stringify([physical(s),held,dirty]);
 const start={s:initial.snapshot(),held:null,dirty:false,cost:0};
 const open=[start],best=new Map([[key(start.s,null,false),0]]),settled=new Set();let actions=0;
 const add=(s,held,dirty,cost)=>{
  const k=key(s,held,dirty);if((best.get(k)??Infinity)<=cost)return;
  assert(best.has(k)||best.size<3000,'tiny oracle state cap');best.set(k,cost);open.push({s,held,dirty,cost});
 };
 while(open.length){
  open.sort((a,b)=>b.cost-a.cost);const n=open.pop(),k=key(n.s,n.held,n.dirty);
  if(best.get(k)!==n.cost||settled.has(k))continue;settled.add(k);
  assert(++actions<50000,'tiny oracle action cap');if(n.s.complete)return n.cost;
  const m=new runtime.PuzzleModel(level);m.restore(n.s);
  if(n.held===null){for(const b of n.s.blocks)if(m.isBlockActive(b))add(n.s,b.id,false,n.cost);continue;}
  if(n.dirty)add(n.s,null,false,n.cost+1);
  const b=m.getBlock(n.held);
  for(const[dx,dy]of [[-1,0],[0,1],[1,0],[0,-1]]){
   const next=new runtime.PuzzleModel(level);next.restore(n.s);next.beginAction();
   if(next.moveBlockStep(b.id,b.x+dx,b.y+dy))add(next.snapshot(),b.id,true,n.cost);
  }
  for(const side of ['left','bottom','right','top']){
   const next=new runtime.PuzzleModel(level);next.restore(n.s);next.beginAction();
   if(next.tryExit(b.id,side).ok){assert(next.commitAction());add(next.snapshot(),null,false,n.cost);}
  }
 }
 return null;
}
const run=(level,floor=2,budget={})=>guardedNativeLowerTaskV198(runtime,level,{floor,maxMilliseconds:5000,...budget});
const nonProduction=r=>{
 for(const k of ['productionQualified','productionExecutionAllowed','catalogAcceptanceEnabled','retryLedgerValidated','formalReady','upperBoundCertified','solvabilityValidated'])assert.equal(r[k],false,k);
 assert.equal(r.newPublicLedgerClaims,0);assert.equal(r.primitiveCalls,1);
};

test('complete shell has one real parking cost; erased inner layer has zero',()=>{
 const level=tiny(),before=JSON.stringify(level),erased=tiny();delete erased.blocks[0].layers;
 assert.equal(oracle(erased),0);assert.equal(oracle(level),1);
 const floor1=run(level,1),floor2=run(level,2),plain=run(erased,1);
 assert.equal(floor1.result.status,'threshold-proven');assert.equal(floor1.result.L,1);
 assert.equal(floor2.result.status,'relaxed-shortcut');assert.equal(floor2.result.minimumOptionalCost,1);
 assert.equal(plain.result.minimumOptionalCost,0);
 assert.equal(floor1.result.domain.retainsAllLayers,true);assert.equal(floor1.result.domain.retainsAllBodies,true);
 assert.equal(JSON.stringify(level),before);nonProduction(floor1);
});

test('peel retains body and inner colour; parking commit preserves physical state in admitted domain',()=>{
 const model=new runtime.PuzzleModel(tiny());model.start();model.beginAction();
 assert(model.tryExit('shell','top').ok);assert(model.commitAction());
 const peeled=model.snapshot();assert.equal(peeled.blocks.length,2);assert.equal(peeled.cleared,1);
 const shell=peeled.blocks.find(b=>b.id==='shell');assert.equal(shell.color,'green');assert.deepEqual(shell.layers,['green']);
 model.beginAction();assert(model.moveBlockStep('shell',0,1));const before=physical(model.snapshot());
 assert(model.commitAction());assert.deepEqual(physical(model.snapshot()),before);
 const clone=model.clone();assert.deepEqual(physical(clone.snapshot()),before);
});

test('all twelve labelled two-body placements agree with independently enumerated held-step oracle',()=>{
 let checked=0;
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(a!==b){
  const l=tiny();Object.assign(l.blocks[0],{x:a%2,y:Math.floor(a/2)});Object.assign(l.blocks[1],{x:b%2,y:Math.floor(b/2)});
  const expected=oracle(l),r=run(l,3);assert.equal(r.error,null);
  if(expected===null||expected>=3)assert.equal(r.result.thresholdProven,true);
  else{assert.equal(r.result.status,'relaxed-shortcut');assert.equal(r.result.minimumOptionalCost,expected);}
  assert(r.result.guardAllowance.conservativeFullBoardStateUpperBound<=10000);checked++;
 }
 assert.equal(checked,12);
});

test('v198 interface fixes all three floors and remains qualification-only',()=>{
 for(const d of [1,2,3]){
  const r=boundedNativeLowerTaskV198(runtime,tiny(),d,policy);
  assert.equal(r.requiredFloor,policy.bands[d].lower);assert.equal(r.result.requiredFloor,r.requiredFloor);
  assert.equal(r.result.minimumOptionalCost,1);assert.equal(r.result.budget.maxStates,9999);
  assert.equal(r.projection,null);nonProduction(r);
 }
 for(const b of [{maxStates:10000},{maxStates:10001},{maxStates:0},{floor:1},{searchUpper:23}])
  assert.throws(()=>boundedNativeLowerTaskV198(runtime,tiny(),1,policy,b));
 assert.throws(()=>boundedNativeLowerTaskV198(runtime,tiny(),1,{...policy,version:'old'}));
 assert.throws(()=>boundedNativeLowerTaskV198(runtime,tiny(),1,{...policy,bands:{...policy.bands,1:{lower:1,upper:23}}}));
 assert.equal(nativeLowerBudgetV198().maxStates,9999);
});

test('native terminal guard counts the constructed over-cap exit world and stops immediately',()=>{
 // floor1 never enumerates parking: initial + committed exit worlds are an
 // independent exact observation of complete boards for THIS boundary fixture.
 const l=tiny();delete l.blocks[0].layers;l.gates.find(g=>g.id==='blue-exit').side='top';l.gates.find(g=>g.id==='blue-exit').offset=1;
 for(const cap of [1,2]){
  const seen=new Set();let commits=0;
  class Observed extends runtime.PuzzleModel{
   start(){super.start();if(seen.size===0)seen.add(JSON.stringify(physical(this.snapshot())));}
   clone(){const m=new Observed(this.level);m.restore(this.snapshot());return m;}
   commitAction(...a){const ok=super.commitAction(...a);if(ok){commits++;seen.add(JSON.stringify(physical(this.snapshot())));}return ok;}
  }
  const r=guardedNativeLowerTaskV198({...runtime,PuzzleModel:Observed},l,{floor:1,maxStates:cap});
  assert.equal(r.result.status,'unknown');assert.equal(r.result.termination,'max-states');assert.equal(r.result.thresholdProven,false);
  assert.equal(r.result.rawFullBoardStates,cap);assert.equal(seen.size,cap+1);assert.equal(commits,cap);
  assert.equal(r.result.guardAllowance.conservativeFullBoardStateUpperBound,seen.size);assert.equal(r.result.L,null);
 }
});

test('all budget interruptions remain UNKNOWN without a forged lower certificate',()=>{
 for(const budget of [{maxStates:1},{maxMicroStates:1},{maxDragStates:1},{maxTransitions:1}]){
  const r=run(tiny(),3,budget);assert.equal(r.result.status,'unknown');assert.equal(r.result.thresholdProven,false);assert.equal(r.result.L,null);
  assert(r.result.rawFullBoardStates<=r.result.budget.maxStates);assert(r.result.guardAllowance.conservativeFullBoardStateUpperBound<=10000);
 }
});

test('unknown fields and unsupported time/facilities fail before constructing a model',()=>{
 for(const edit of [l=>{l.blocks[0].futureMechanism=true;},l=>{l.blocks[0].timedBombSeconds=5;},
  l=>{l.futureField=true;},l=>{l.gates[0].futureGate=true;},l=>{l.flipDoors=[{...l.gates[0],initiallyOpen:true}];}]){
  const l=tiny();edit(l);let models=0;
  class Counted extends runtime.PuzzleModel{constructor(...a){super(...a);models++;}}
  const r=guardedNativeLowerTaskV198({...runtime,PuzzleModel:Counted},l,{floor:2});
  assert.equal(r.result.status,'unsupported');assert.equal(r.result.thresholdProven,false);assert.equal(r.result.L,null);assert.equal(models,0);
 }
});

test('unexpected held-world mutations and local model exceptions never pass',()=>{
 for(const mode of ['mutate','throw']){
  class Changed extends runtime.PuzzleModel{
   clone(){const m=new Changed(this.level);m.restore(this.snapshot());return m;}
   moveBlockStep(...a){if(mode==='throw')throw Error('qualification-only injected exception');const ok=super.moveBlockStep(...a);if(ok){const s=this.snapshot();s.cleared++;this.restore(s);}return ok;}
  }
  const r=guardedNativeLowerTaskV198({...runtime,PuzzleModel:Changed},tiny(),{floor:2});
  assert.equal(r.result.thresholdProven,false);assert.equal(r.result.L,null);
  assert.equal(r.result.status,mode==='mutate'?'unsupported':'invalid');nonProduction(r);
 }
});

test('a proof crossing the deadline only at final result construction is rejected',()=>{
 const clock=Date.now;
 try{
  // Earlier engine guards see t=0. Its out() result observes the deadline;
  // this targets the unchanged engine's final-guard gap without altering it.
  Date.now=()=>new Error().stack.includes('at out (')?1000:0;
  const r=run(tiny(),1,{maxMilliseconds:1000});
  assert.equal(r.originalResult.status,'threshold-proven');
  assert.equal(r.originalResult.elapsedMilliseconds,1000);
  assert.equal(r.result.status,'invalid');assert.equal(r.result.thresholdProven,false);assert.equal(r.result.L,null);
  assert.match(r.error,/final deadline/);
 }finally{Date.now=clock;}
});

test('old engine bytes and production boundaries remain unchanged',()=>{
 const engine=path.join(repo,'tools/daily-challenge/formal-v3/bounded-native-lower.mjs');
 assert.equal(hash(fs.readFileSync(engine)),NATIVE_LOWER_ENGINE_SHA);
 const source=fs.readFileSync(path.join(repo,'tools/daily-challenge/formal-v4/native-lower-v198.mjs'),'utf8');
 assert(!source.includes('createAttemptLedger('));assert(!source.includes('qualifyBoundedCandidateV198('));
});
