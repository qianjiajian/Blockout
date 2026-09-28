import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {compileLevel,forEachGesture,clearCount,stateKey,stateFromSnapshot,checkFastFloor} from '../../remake21to30-mask-floor.mjs';
import {checkSymmetryFloor} from '../../remake21to30-symmetry-floor-v139.mjs';
import {canonicalStateKey,normalizeMonotoneClears,checkDynamicSymmetryFloor} from '../../../deliverables/remake181-190-v146-20260924/source182-proof/dynamic-floor.mjs';

export const ROOT='deliverables/remake31-200-v145-20260924/batches/lv051-060';
export const OUT=ROOT+'/agent55-57/new59review';
export const CANDIDATE=ROOT+'/agent58-59/enriched59-1790250539623.json';
export const DYNAMIC='deliverables/remake181-190-v146-20260924/source182-proof/dynamic-floor.mjs';
const SELF='tools/campaign-v145/lv051-060/dynamic59-qualification-v147.mjs';
const dynamicText=fs.readFileSync(DYNAMIC,'utf8');
// Exercise the ACTUAL private phase selector read from the immutable dependency,
// not a second implementation which might differ from the code being certified.
const selectorSource=dynamicText.match(/const groupsAt=cleared=>\{[\s\S]*?return values;\};/)?.[0];
assert(selectorSource,'Expected private selector declaration, fail closed on source drift');
export const phaseSelector=c=>new Function('c',`const phaseGroups=new Map();${selectorSource};return groupsAt;`)(c);
const keyFunction=c=>{const groups=phaseSelector(c);return state=>canonicalStateKey(state,groups(clearCount(c,state)));};
const binding=file=>({file,sha256:digest(fs.readFileSync(file))});
const SOURCE_FILES=[SELF,DYNAMIC,'tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs',
  'tools/remake21to30-symmetry-floor-v139.test.mjs','tools/remake21to30-mask-floor.test.mjs',
  'tools/native-block-repair-v143.mjs','tools/remake21to30-v120.mjs','tools/revised-preview-validation-v160.mjs'];
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
const finite=n=>Number.isFinite(n)?n:'infinity';
const options={maxStates:20000,maxMilliseconds:20000};

// These four fixtures are the immutable v1.39 suite's original four variants.
function tiny(){return{id:21,name:'quotient',difficulty:'normal',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:2,
  gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:3},{id:'gate-b',color:'blue',side:'top',offset:0,size:3}],
  blocks:[{id:'a',color:'red',x:0,y:0,shape:[[0,0]]},{id:'b',color:'red',x:1,y:0,shape:[[0,0]]},{id:'c',color:'blue',x:0,y:1,shape:[[0,0],[1,0]]}]};}
function fixtures(){
  const plain=tiny(),shell=tiny(),ice=tiny(),hidden=tiny();plain.name='plain';shell.name='shell';ice.name='ice';hidden.name='hidden';
  shell.blocks.slice(0,2).forEach(b=>b.layers=['red','blue']);ice.blocks.slice(0,2).forEach(b=>b.frozen=1);
  hidden.shutters=[{id:'cover',x:0,y:0,width:2,height:1,count:1}];hidden.blocks.slice(0,2).forEach(b=>b.shutterId='cover');
  // Two more exact old fixtures: positive-cost hidden ice/shell, and optimum 2.
  const parking={...tiny(),name:'old-hidden-iced-shell-positive-cost',gates:[
    {id:'r',color:'red',side:'bottom',offset:0,size:3},{id:'b',color:'blue',side:'top',offset:0,size:2},
    {id:'p',color:'purple',side:'right',offset:0,size:2,frozen:2},{id:'g',color:'green',side:'left',offset:0,size:2}],
    shutters:[{id:'park-cover',x:2,y:0,width:1,height:1,count:1}],blocks:[
    {id:'parking-red-a',color:'red',x:0,y:0,shape:[[0,0]]},{id:'parking-red-b',color:'red',x:1,y:0,shape:[[0,0]]},
    {id:'parking-bar',color:'blue',x:0,y:1,shape:[[0,0],[1,0]]},
    {id:'hidden-shell',color:'purple',layers:['purple','green'],frozen:1,shutterId:'park-cover',x:2,y:0,shape:[[0,0]]}]};
  const two={...tiny(),name:'old-optimum-two',height:3,gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:2},
    {id:'gate-b',color:'blue',side:'left',offset:1,size:1,frozen:1},{id:'gate-g',color:'green',side:'right',offset:1,size:1,frozen:1}],
    blocks:[{id:'carrier',color:'red',x:0,y:0,shape:[[0,0],[1,0]]},{id:'a',color:'blue',x:0,y:2,shape:[[0,0]]},{id:'b',color:'green',x:1,y:2,shape:[[0,0]]}]};
  // New threshold cases: owners/ice differ before readiness and become irrelevant
  // afterwards. Shell-stage bytes and removed bytes must also remain exchangeable.
  const crossOwner={...tiny(),name:'new-distinct-owner-threshold',gates:[{id:'gate-r',color:'red',side:'top',offset:0,size:3},{id:'gate-b',color:'blue',side:'bottom',offset:0,size:3}],
    shutters:[{id:'cover-a',x:0,y:0,width:1,height:1,count:1},{id:'cover-b',x:1,y:0,width:1,height:1,count:2}],blocks:[
    {id:'a',color:'red',shutterId:'cover-a',x:0,y:0,shape:[[0,0]]},{id:'b',color:'red',shutterId:'cover-b',x:1,y:0,shape:[[0,0]]},
    {id:'open',color:'blue',layers:['blue','red'],x:2,y:1,shape:[[0,0]]}]};
  const differentIce={...tiny(),name:'new-distinct-ice-threshold'};differentIce.blocks[1].frozen=1;
  const mixedShell=structuredClone(crossOwner);mixedShell.name='new-cross-owner-shell-stages';mixedShell.shutters[1].count=1;
  mixedShell.blocks[0].layers=['red','blue'];mixedShell.blocks[1].layers=['red','blue'];mixedShell.blocks[1].frozen=1;
  const dead=structuredClone(crossOwner);dead.name='new-dead-end';dead.shutters[1].count=9;
  return[plain,shell,ice,hidden,parking,two,crossOwner,differentIce,mixedShell,dead];
}
function enumerate(level){
  const c=compileLevel(level),states=[c.initial],indices=new Map([[stateKey(c.initial),0]]),reverse=[[]];let edges=0;
  for(let at=0;at<states.length;at++)forEachGesture(c,states[at],(i,v,cost)=>{
    const next=states[at].slice();next[i]=v;const k=stateKey(next);let index=indices.get(k);
    if(index===undefined){assert(states.length<20000,'Small fixture full graph must not truncate');index=states.length;indices.set(k,index);states.push(next);reverse.push([]);}
    reverse[index].push([at,cost]);edges++;
  });
  const distances=states.map(()=>Infinity),pending=[];
  states.forEach((s,i)=>{if(clearCount(c,s)===c.totalClears){distances[i]=0;pending.push([i,0]);}});
  while(pending.length){pending.sort((a,b)=>b[1]-a[1]);const[i,d]=pending.pop();if(d!==distances[i])continue;
    for(const[p,cost]of reverse[i])if(d+cost<distances[p]){distances[p]=d+cost;pending.push([p,d+cost]);}}
  return{c,states,indices,distances,edges};
}
function quotientEdges(c,state,key){const out=new Set();forEachGesture(c,state,(i,v,cost)=>{const next=state.slice();next[i]=v;out.add(`${cost}:${key(next)}`);});return[...out].sort();}
function verifySwaps(c,state){
  const key=keyFunction(c),groups=phaseSelector(c)(clearCount(c,state)),expected=quotientEdges(c,state,key),original=state.slice();let swaps=0,nontrivial=0,crossHistory=0;
  for(const group of groups)for(let a=0;a<group.length;a++)for(let b=0;b<a;b++){
    const i=group[a],j=group[b],next=state.slice();[next[i],next[j]]=[next[j],next[i]];
    assert.equal(key(next),key(state));assert.equal(clearCount(c,next),clearCount(c,state));
    assert.equal(clearCount(c,next)===c.totalClears,clearCount(c,state)===c.totalClears);
    assert.deepEqual(quotientEdges(c,next,key),expected,'Swapped state must have exactly the same cost-labeled successor orbit set');
    swaps++;if(state[i]!==state[j])nontrivial++;
    const history=x=>JSON.stringify([x.revealAt,x.ice,x.cover?.id??null]);if(history(c.blocks[i])!==history(c.blocks[j]))crossHistory++;
  }
  assert.deepEqual(state,original,'Key/group/edge enumeration may not mutate a state');return{swaps,nontrivial,crossHistory};
}
function labeledRoute(c,drags){
  let state=c.initial,cost=0;
  for(const drag of drags){let found;forEachGesture(c,state,(i,v,edge,get)=>{if(JSON.stringify(get())===JSON.stringify(drag))found={i,v,edge};});
    assert(found,'Returned shortcut must be a real labeled edge, with no identity teleport');state=state.slice();state[found.i]=found.v;cost+=found.edge;}
  assert.equal(clearCount(c,state),c.totalClears);return cost;
}
async function qualify(){
  const lock=verifyRulesLock();assert(lock.ok);const data=JSON.parse(fs.readFileSync(CANDIDATE)),{api,inputs}=await loadApi();
  const c=compileLevel(data.level);assert.equal(data.level.id,59);
  const forbiddenBlocks=data.level.blocks.filter(b=>['movementAxis','keyId','lockedBy','lockCount','timedBombSeconds'].some(k=>b[k]!==undefined)||b.star||b.rotationBadge);
  assert.equal(forbiddenBlocks.length,0);
  const small=[];let smallSwaps=0,smallCrossHistory=0;
  for(const level of fixtures()){
    const e=enumerate(level),{c,states,indices,distances}=e;let swaps=0,crossHistory=0;
    for(const[i,state]of states.entries()){
      const normal=normalizeMonotoneClears(c,state),at=indices.get(stateKey(normal.state));assert.notEqual(at,undefined);assert.equal(distances[i],distances[at]);
      const checked=verifySwaps(c,state);swaps+=checked.swaps;crossHistory+=checked.crossHistory;
    }
    const comparisons=[];
    for(const floor of [1,2,3]){
      const old=checkFastFloor(level,{...options,floor}),staticQ=checkSymmetryFloor(level,{...options,floor});
      for(const monotoneSuffix of [false,true]){
        const dynamic=checkDynamicSymmetryFloor(level,{...options,floor,monotoneSuffix});
        assert(['threshold-proven','relaxed-shortcut'].includes(old.status));assert.equal(dynamic.status,old.status);assert.equal(staticQ.status,old.status);
        assert.equal(dynamic.relaxedNonClearingDrags,old.relaxedNonClearingDrags);assert.equal(staticQ.relaxedNonClearingDrags,old.relaxedNonClearingDrags);
        assert.equal(dynamic.thresholdProven,distances[0]>=floor);if(dynamic.relaxedRoute)assert.equal(labeledRoute(c,dynamic.relaxedRoute),distances[0]);
        comparisons.push({floor,monotoneSuffix,status:dynamic.status,cost:dynamic.relaxedNonClearingDrags??null});
      }
    }
    small.push({name:level.name,states:states.length,edges:e.edges,optimum:finite(distances[0]),swaps,crossHistory,comparisons});smallSwaps+=swaps;smallCrossHistory+=crossHistory;
  }
  assert.equal(small.slice(0,4).reduce((n,r)=>n+r.states,0),416);assert.equal(small.find(r=>r.name==='old-hidden-iced-shell-positive-cost').optimum,1);assert.equal(small.find(r=>r.name==='old-optimum-two').optimum,2);assert(smallCrossHistory>0);
  const failureCases=[];
  for(const[field,mutate]of[
    ['axis',l=>l.blocks[0].movementAxis='horizontal'],['key',l=>l.blocks[0].keyId='key'],['lock',l=>l.blocks[0].lockedBy='key'],
    ['generator',l=>l.generators=[{}]],['lift',l=>l.shutters=[{skin:'lift'}]],['timer',l=>l.blocks[0].timedBombSeconds=10],
    ['flip',l=>l.flipDoors=[{}]],['grid',l=>l.coloredGrids=[{}]]]){
    const level=tiny();mutate(level);const r=checkDynamicSymmetryFloor(level);assert.equal(r.status,'unsupported');assert(!r.thresholdProven);failureCases.push({field,status:r.status,reason:r.reason});
  }
  const invalid=checkDynamicSymmetryFloor(tiny(),{floor:0});assert.equal(invalid.status,'invalid');
  const budget=checkDynamicSymmetryFloor(fixtures()[5],{floor:3,maxStates:1,maxMilliseconds:1000});assert.equal(budget.status,'unknown');assert(!budget.thresholdProven);
  const replay=api.replayRevisedRoute(data.level,data.drags);assert(replay.valid&&replay.complete,JSON.stringify(replay));
  const m=new api.PuzzleModel(data.level);m.startCountdown();const prefixes=[];let included=0;
  for(let at=0;at<=data.drags.length;at++){
    const before=m.snapshot(),state=stateFromSnapshot(c,before),swaps=verifySwaps(c,state);
    prefixes.push({atStep:at,clearCount:clearCount(c,state),...swaps,groups:phaseSelector(c)(clearCount(c,state)).map(g=>g.map(i=>c.blocks[i].id))});
    if(at===data.drags.length)break;
    const drag=data.drags[at],index=c.blocks.findIndex(b=>b.id===drag.blockId);m.beginAction();
    for(const p of drag.path)assert(m.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());
    const after=m.snapshot(),next=stateFromSnapshot(c,after),cost=after.cleared===before.cleared?1:0;let present=false;
    forEachGesture(c,state,(i,v,edge)=>{if(i===index&&v===next[index]&&cost===edge)present=true;});assert(present);
    const expected=state.slice();expected[index]=next[index];assert.deepEqual(next,expected);included++;
  }
  assert(m.snapshot().complete);assert(prefixes.some(p=>p.crossHistory>0));
  const report={status:'qualification-pass',reviewer:'author55-57',activeRuleVersion:lock.activeVersion,candidate:CANDIDATE,
    candidateSha256:digest(fs.readFileSync(CANDIDATE)),levelSha256:digest(data.level),routeSha256:digest(data.drags),
    qualificationScope:'Only the unchanged mask96 compiler domain. Optional gate contact and unlimited time remain lower-bound relaxations. No solvability, GUI or source approval follows from this test.',
    reasoning:[
      'At C >= revealAt+ice an identity is permanently ready because C never decreases; its initial reveal owner and ice cannot constrain its future again.',
      'Ready identities group only when normalized footprint and complete layer vector agree. Legal poses/neighbors, occupancy masks, stage-specific gate condition, gesture cost, and clear contribution are then identical.',
      'Permuting position/stage/removed bytes in a current group preserves C, occupied cells, readiness, goal and same-cost successor equivalence. Canonical successor keys use the next C; groups only merge as readiness increases.',
      'Canonical equality cannot confuse different clear counts because sorting occurs only among equal complete layer vectors. Search nodes and route parents retain labeled original states.',
      'Final-body zero-cost normalization keeps the inherited restricted-domain exchange argument. A countdown reveal substitutes hidden footprints contained inside its previously blocked region; it never adds obstruction outside that region. Frozen gates and ice only relax. Shell peels are never forced.',
      'The only dynamic-floor transitive import is the unchanged mask compiler; it rejects generator, lift, axis, key, timer, flip and colored-grid semantics. Candidate compilation and explicit absent-attribute checks both passed.'
    ],domain:{blocks:c.blocks.length,totalClears:c.totalClears,covers:c.covers.map(s=>({id:s.id,count:s.count})),axis:0,key:0,lock:0,generator:0,timer:0,lift:0,flip:0,coloredGrid:0},
    finiteFixtures:small,smallSwaps,smallCrossHistory,failureCases,invalidStatus:invalid.status,budgetStatus:budget.status,
    prefixDifferential:{prefixes:prefixes.length,includedActualActions:included,swaps:prefixes.reduce((n,p)=>n+p.swaps,0),nontrivial:prefixes.reduce((n,p)=>n+p.nontrivial,0),crossHistory:prefixes.reduce((n,p)=>n+p.crossHistory,0),rows:prefixes},
    replay,selectorSourceSha256:digest(selectorSource),bindings:[...new Set([...SOURCE_FILES,...inputs])].map(binding),proofRun:false};
  const out=OUT+'/qualification59-'+Date.now()+'.json';write(out,report);console.log(JSON.stringify({out,status:report.status,finiteStates:small.reduce((n,r)=>n+r.states,0),smallSwaps,smallCrossHistory,prefixes:prefixes.length,prefixSwaps:report.prefixDifferential.swaps}));return report;
}
async function prove(qualificationFile){
  const q=JSON.parse(fs.readFileSync(qualificationFile));assert.equal(q.status,'qualification-pass');for(const b of q.bindings)assert.equal(binding(b.file).sha256,b.sha256,'Qualification dependency drift: '+b.file);
  assert.equal(binding(CANDIDATE).sha256,q.candidateSha256);const data=JSON.parse(fs.readFileSync(CANDIDATE));assert.equal(digest(data.level),q.levelSha256);
  const budget={floor:16,maxStates:1000000,maxMilliseconds:180000};
  const marker=OUT+'/attempt59-once.json',startedAt=new Date().toISOString();write(marker,{startedAt,qualificationFile,budget,candidate:CANDIDATE,levelSha256:q.levelSha256});
  const began=Date.now(),result=checkDynamicSymmetryFloor(data.level,budget),elapsedMs=Date.now()-began;
  let shortcutReplay=null;if(result.relaxedRoute){assert.equal(labeledRoute(compileLevel(data.level),result.relaxedRoute),result.relaxedNonClearingDrags);const{api}=await loadApi();shortcutReplay=api.replayRevisedRoute(data.level,result.relaxedRoute);}
  for(const b of q.bindings)assert.equal(binding(b.file).sha256,b.sha256,'Proof dependency drift: '+b.file);
  const report={status:result.status,candidate:CANDIDATE,candidateSha256:q.candidateSha256,levelSha256:q.levelSha256,routeSha256:q.routeSha256,qualificationFile,
    qualificationSha256:digest(fs.readFileSync(qualificationFile)),activeRuleVersion:q.activeRuleVersion,startedAt,elapsedMs,budget,result,shortcutReplay,
    actualShortcutValidated:Boolean(shortcutReplay?.valid&&shortcutReplay?.complete),bindings:q.bindings,
    qualification:'Independent reviewer root must review the attached domain argument and tests before integrating this lower-bound evidence.',
    solvabilityValidated:q.replay.valid&&q.replay.complete,upperBound:q.replay.nonClearingDrags,pointerReplayValidated:false,productionChanged:false};
  const out=OUT+'/proof59-'+Date.now()+'.json';write(out,report);console.log(JSON.stringify({out,status:result.status,elapsedMs,exploredStates:result.exploredStates,discoveredStates:result.discoveredStates,termination:result.termination,cost:result.relaxedNonClearingDrags??null}));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  if(process.argv[2]==='qualify')await qualify();else if(process.argv[2]==='prove')await prove(process.argv[3]);else throw Error('Usage: qualify | prove QUALIFICATION_JSON');
}
