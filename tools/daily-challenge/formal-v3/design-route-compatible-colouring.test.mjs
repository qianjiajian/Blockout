import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {digest} from './diversity-layout-factory.mjs';
import {recolourKnownPlainWitness as rawRecolour} from './design-route-compatible-colouring.mjs';
import {buildReverseConstructedCandidate} from './design-reverse-construction-factory.mjs';
import {createReverseConstructionLedger,reverseTemplateFingerprints} from './design-reverse-construction-ledger.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {auditPlainForwardDrag} from './reverse-route-audit.mjs';
const recolourKnownPlainWitness=(...args)=>{try{return rawRecolour(...args);}catch(error){throw Error(error.message);}};
const rt=await loadBoundedRuntime();
function budget(cap=10000,prior=0){const raw=new Set();let micros=0,transitions=0;return{raw,get micros(){return micros;},get transitions(){return transitions;},
 charge:l=>{const k=digest(l.blocks.map(b=>({id:b.id,color:b.color,shape:b.shape,x:b.x,y:b.y})).sort((a,b)=>a.id.localeCompare(b.id)));if(!raw.has(k)){if(raw.size+prior>=cap)throw Error('test-shared-raw-cap');raw.add(k);}},
 micro:()=>{if(++micros>3000000)throw Error('test-micro-cap');},transition:()=>{if(++transitions>10000000)throw Error('test-transition-cap');}};}
function squares(){const level={id:998008,name:'future stock colouring fixture',mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,timeSeconds:180,difficulty:'super',reward:0,
 blocks:[{id:'r0',color:'red',shape:[[0,0]],x:0,y:0},{id:'r1',color:'red',shape:[[0,0]],x:1,y:0},{id:'b0',color:'blue',shape:[[0,0]],x:0,y:1},{id:'b1',color:'blue',shape:[[0,0]],x:1,y:1}],
 gates:[{id:'red',color:'red',side:'left',offset:0,size:2},{id:'blue',color:'blue',side:'right',offset:0,size:2}]};
 return{level,drags:[{blockId:'r0',path:[],exitSide:'left'},{blockId:'r1',path:[[0,0]],exitSide:'left'},{blockId:'b1',path:[],exitSide:'right'},{blockId:'b0',path:[[1,1]],exitSide:'right'}]};}
function parking(kind){const level={id:998009,name:'parking colour first-contact fixture',width:3,height:2,timeSeconds:180,difficulty:'super',reward:0,mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'r',color:'red',x:0,y:0,shape:[[0,0],[1,0]]},{id:'b',color:'blue',x:2,y:0,shape:[[0,0],[0,1]]},{id:'g',color:'green',x:0,y:1,shape:[[0,0],[1,0]]}],
 gates:[{id:'gr',color:'red',side:'left',offset:0,size:kind==='pointer-down'?2:1},{id:'gb',color:'blue',side:'top',offset:2,size:1},{id:'gg',color:'green',side:'right',offset:kind==='intermediate'?1:0,size:1}]};
 return{level,drags:kind==='intermediate'?[{blockId:'r',path:[],exitSide:'left'},{blockId:'b',path:[],exitSide:'top'},{blockId:'g',path:[[0,0],[1,0]]},{blockId:'g',path:[[1,1]],exitSide:'right'}]:
 [{blockId:'r',path:[],exitSide:'left'},{blockId:'g',path:[[0,0]]},{blockId:'b',path:[],exitSide:'top'},{blockId:'g',path:[[1,0]],exitSide:'right'}]};}
test('joint route CSP repairs adjacent colours with exact inventory, existing exits and q0 assets',()=>{
 const p=squares(),before=digest(p),b=budget(),result=recolourKnownPlainWitness(rt,p.level,p.drags,b);
 assert(result.ok,result.reason);assert.equal(result.U,0);assert(result.changedColourIds.length>=2);assert.equal(result.statistics.finalDoubleReplays,1);
 assert.equal(result.level.blocks.filter(x=>x.color==='red').length,2);assert.equal(result.level.blocks.filter(x=>x.color==='blue').length,2);
 assert(result.domains.find(x=>x.id==='r1').choices.some(x=>x.color==='blue')); // idle compatible gate is not an automatic removal
 assert.equal(result.replay.clearEvents,4);assert.equal(result.independentReplay.clearEvents,4);assert.equal(digest(p),before);
 assert(Object.values(result.assetBindings).every(x=>/^[a-f0-9]{64}$/.test(x)));assert(b.raw.size>1);
});
for(const kind of ['pointer-down','intermediate','endpoint'])test(`parking ${kind} matching contact forbids the new colour`,()=>{
 const p=parking(kind),result=recolourKnownPlainWitness(rt,p.level,p.drags,budget());
 const red=result.domains.find(x=>x.id==='g').excluded.find(x=>x.color==='red');assert(red);assert.equal(red.reason,`parking-${kind}-exit`);
});
test('plain-only, fixed full inventory, gate coverage, and actual asset files are mandatory',()=>{
 const p=squares();for(const mutate of [l=>l.blocks[0].frozen=1,l=>l.blocks[0].movementAxis='vertical',l=>l.blocks[0].layers=['red','blue'],l=>l.gates[0].frozen=1]){
  const l=structuredClone(p.level);mutate(l);assert.throws(()=>recolourKnownPlainWitness(rt,l,p.drags,budget()));}
 assert.throws(()=>recolourKnownPlainWitness(rt,p.level,p.drags.slice(0,-1),budget()),/not complete/);
 const bad=structuredClone(p.level);bad.gates.push({id:'unused',color:'green',side:'top',offset:0,size:1});assert.throws(()=>recolourKnownPlainWitness(rt,bad,p.drags,budget()),/cover/);
 const art=structuredClone(rt.GAME_ART),shapeId=rt.matchFormalBlockShape([[0,0]],'native-only').shapeId;art.gameplay.formalBlocks.blue.solid[shapeId]='assets/absent-colour-art-fixture.png';
 const result=recolourKnownPlainWitness({...rt,GAME_ART:art},p.level,p.drags,budget());assert.equal(result.ok,false);
 assert(result.domains.some(d=>d.excluded.some(x=>x.reason==='missing-native-colour-art-file')));
});
test('shared raw cap charges colour worlds and never resets from prior constructor count',()=>{
 const p=squares(),prior=9999,b=budget(10000,prior);assert.throws(()=>recolourKnownPlainWitness(rt,p.level,p.drags,b),/shared-raw/);
 assert.equal(prior+b.raw.size,10000);assert.equal(b.micros,0);
 const full=budget(),success=recolourKnownPlainWitness(rt,p.level,p.drags,full);assert(success.ok);
 const exact=budget(full.raw.size);assert(recolourKnownPlainWitness(rt,p.level,p.drags,exact).ok);
 const short=budget(full.raw.size-1);assert.throws(()=>recolourKnownPlainWitness(rt,p.level,p.drags,short),/shared-raw/);assert.equal(short.raw.size,full.raw.size-1);
});
test('CSP node budget is finite and shared rather than recreated per closure',()=>{
 const p=squares();for(const n of [0,10001,Infinity,NaN])assert.throws(()=>recolourKnownPlainWitness(rt,p.level,p.drags,{...budget(),maxCspNodes:n}));
 assert.throws(()=>recolourKnownPlainWitness(rt,p.level,p.drags,{...budget(),cspStats:{nodes:10000}}),/csp-nodes/);
});
test('factory passes the same raw budget through fill, closure colour domains and final replay',()=>{
 const p=squares(),options={seed:112,constructionTemplatePacket:{ok:true,level:p.level},routeCompatibleColouring:true,minimumScrambleDrags:0,maxScrambleDrags:0,maximumFinalBodyArea:1,
  maxStates:10000,maxMicroStates:3000000,maxTransitions:10000000,maxMilliseconds:30000};
 const full=buildReverseConstructedCandidate(p.level,rt,options);assert(full.ok,full.reason??full.status);assert(full.construction.colourCspAttempts>0);
 assert(full.routeColouring.ok);assert.equal(full.routeColouring.statistics.finalDoubleReplays,1);
 const cap=full.construction.rawDiscoveredStates-1,stopped=buildReverseConstructedCandidate(p.level,rt,{...options,maxStates:cap});
 assert.equal(stopped.ok,false);assert.equal(stopped.reason,'construction-max-raw-board-states');assert.equal(stopped.construction.rawDiscoveredStates,cap);
 assert(stopped.construction.colourCspAttempts>0);assert(stopped.lastColourCspInput);
});
test('a failed final selected assignment stops instead of trying another complete colouring',()=>{
 const p=squares();let finalCalls=0;
 const runtime={...rt,replayRevisedRoute:()=>{finalCalls++;return{valid:false,complete:false,error:'qualification-forced-final-rejection'};}};
 assert.throws(()=>recolourKnownPlainWitness(runtime,p.level,p.drags,budget()),/Selected colouring final double replay failed/);
 assert.equal(finalCalls,1);
});
test('the final recoloured inventory is an immutable blocked alias of its one constructor claim',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'reverse-colour-alias-')),ledger=await createReverseConstructionLedger(dir),p=squares();
 // Different shapes are needed to distinguish shape-colour pair inventories.
 p.level.blocks[0].shape=[[0,0],[1,0]];p.level.blocks[1].shape=[[0,0],[0,1]];
 const claim=await ledger.claim(p.level,{sourceLevelId:2,seed:1,budget:{maxStates:10000}}),before=await fs.readFile(`${claim.path}/claim.json`,'utf8');
 const final=structuredClone(p.level);[final.blocks[0].color,final.blocks[2].color]=[final.blocks[2].color,final.blocks[0].color];
 const alias=await ledger.registerFinalStock(claim,final);assert(alias);assert.notEqual(reverseTemplateFingerprints(final).inputSha256,claim.inputSha256);
 const reloaded=await createReverseConstructionLedger(dir);await assert.rejects(()=>reloaded.claim(final,{sourceLevelId:2,seed:2,budget:{maxStates:10000}}),/already claimed/);
 assert.equal(await fs.readFile(`${claim.path}/claim.json`,'utf8'),before);
});
test('all sixteen complete tiny-board colour assignments agree with an exhaustive actual gesture oracle',()=>{
 const p=squares(),result=recolourKnownPlainWitness(rt,p.level,p.drags,budget());let feasible=0;
 for(let bits=0;bits<16;bits++){
  const level=structuredClone(p.level);level.blocks.forEach((b,i)=>b.color=bits&(1<<i)?'blue':'red');
  const counts=level.blocks.filter(b=>b.color==='red').length===2;
  const adjacency=level.blocks.every((a,i)=>level.blocks.every((b,j)=>i===j||Math.abs(a.x-b.x)+Math.abs(a.y-b.y)!==1||a.color!==b.color));
  const predicted=counts&&adjacency&&level.blocks.every(b=>result.domains.find(d=>d.id===b.id).choices.some(c=>c.color===b.color));
  let current=level,actual=true;
  for(const id of ['r0','r1','b1','b0']){
   const body=current.blocks.find(b=>b.id===id),paths=[];
   function allSimple(pose,trail,points){paths.push(points);for(const[dx,dy]of [[0,1],[1,0],[0,-1],[-1,0]]){
    const next=[pose[0]+dx,pose[1]+dy],k=next.join(',');if(next.some(x=>x<0||x>1)||trail.has(k))continue;
    allSimple(next,new Set([...trail,k]),[...points,next]);}}
   allSimple([body.x,body.y],new Set([[body.x,body.y].join(',')]),[]);
   const found=paths.some(path=>['left','right'].some(exitSide=>auditPlainForwardDrag(rt,current,{blockId:id,path,exitSide}).valid));
   if(!found){actual=false;break;}current={...current,blocks:current.blocks.filter(b=>b.id!==id)};
  }
  assert.equal(predicted,Boolean(counts&&adjacency&&actual),`complete assignment ${bits}`);if(predicted)feasible++;
 }
 assert.equal(feasible,1);
});
