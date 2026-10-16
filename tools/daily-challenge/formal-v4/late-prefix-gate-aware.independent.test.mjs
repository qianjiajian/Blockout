import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';
import {colourLatePrefixGateAware,gateAwareExitPose} from './late-prefix-gate-aware-colouring.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {independentReplay} from '../formal-v2/contract.mjs';
import {auditPlainForwardDrag} from '../formal-v3/reverse-route-audit.mjs';
const base=await loadV4Runtime(),evidence=[];
const out=process.env.GATE_AWARE_INDEPENDENT_OUT;
assert(out,'Explicit new independent qualification output required');await fs.mkdir(out,{recursive:false});
const colours=['red','blue','green','yellow'];
const runtime={...base,assertPlainProofDomain,GAME_ART:{...base.GAME_ART,gameplay:{...base.GAME_ART.gameplay,
 formalBlocks:Object.fromEntries(colours.map(c=>[c,base.GAME_ART.gameplay.formalBlocks[c]]))}}};
function fixture(){
 const level={id:999895,name:'Independent four-body gate CSP fixture',difficulty:'hard',reward:0,timeSeconds:100,
  mechanismRules:'revised-2026-09-27-v1.5',width:2,height:2,
  blocks:colours.map((color,i)=>({id:`b${i}`,color,x:i%2,y:Math.floor(i/2),shape:[[0,0]]})),
  gates:colours.map((color,i)=>({id:`g${i}`,color,side:i<2?'top':'bottom',offset:i%2,size:1}))};
 return{level,options:{seed:1,paletteSize:4,fixedBodyColours:Object.fromEntries(level.blocks.map(b=>[b.id,b.color])),
  mappedPrefix:{ok:true,openingColours:{b0:'red'},parkingPoses:{},preservedGates:structuredClone(level.gates)}}};
}
test('one full private four-body stock has fixed-gate actual canonical and independent completion',()=>{
 const {level,options}=fixture(),before=JSON.stringify(level),r=colourLatePrefixGateAware(level,runtime,options);
 assert(r.ok,r.reason);assert.equal(r.completeColourAssignments,1);assert.equal(JSON.stringify(level),before);
 const actual={...level,blocks:r.blocks,gates:r.gates},drags=actual.blocks.map(b=>({blockId:b.id,path:[],exitSide:actual.gates.find(g=>g.color===b.color).side}));
 const canonical=base.replayRevisedRoute(actual,drags),independent=independentReplay(base,actual,drags);
 assert(canonical.valid&&canonical.complete&&independent.valid&&independent.complete);assert.equal(canonical.clearEvents,4);
 assert.equal(independent.remainingBodies,0);assert.equal(independent.nonClearingDrags,0);
 evidence.push({test:'whole-private-stock-completes',passed:true,result:r,canonical,independent});
});
test('all forced colours reserve the final gate world before a recursive node guard can reject it',()=>{
 const {level,options}=fixture();options.mappedPrefix.preservedGates.pop();options.maxNodes=1;
 const r=colourLatePrefixGateAware(level,runtime,options);assert.equal(r.ok,false);assert.match(r.reason,/nodes/);
 assert.equal(r.accounting.nodes,1);assert.equal(r.completeColourAssignments,1,'Final complete gate+forced-colour world cannot disappear at the child node guard');
 evidence.push({test:'final-forced-world-node-boundary',passed:true,result:r});
});
test('a complete forced assignment rejected by adjacency is still charged before its early return',()=>{
 const {level,options}=fixture();options.fixedBodyColours.b1='red';
 const r=colourLatePrefixGateAware(level,runtime,options);assert(!r.ok);assert.match(r.reason,/adjacent/);
 assert.equal(r.completeColourAssignments,1);assert.equal(r.accounting.completeWorldReservations,1);
 evidence.push({test:'full-forced-adjacency-rejection-precharged',passed:true,result:r});
});
test('4x2 solid stock preserves two actual held parking gestures after its one opening clear',()=>{
 const level={id:999897,name:'Two genuine parking gestures',difficulty:'hard',reward:0,timeSeconds:100,
  mechanismRules:'revised-2026-09-27-v1.5',width:4,height:2,blocks:[
   {id:'r',color:'red',x:0,y:0,shape:[[0,0],[0,1]]},{id:'b',color:'blue',x:1,y:0,shape:[[0,0],[1,0]]},
   {id:'g',color:'green',x:1,y:1,shape:[[0,0],[1,0]]},{id:'y',color:'yellow',x:3,y:0,shape:[[0,0],[0,1]]}],
  gates:[{id:'gr',color:'red',side:'left',offset:0,size:2}]};
 const options={seed:1,paletteSize:4,fixedBodyColours:{r:'red',b:'blue',g:'green',y:'yellow'},
  mappedPrefix:{ok:true,openingColours:{r:'red'},parkingPoses:{b:[[1,0],[0,0]],g:[[1,1],[0,1]]},preservedGates:level.gates}};
 const result=colourLatePrefixGateAware(level,runtime,options);assert(result.ok,result.reason);assert.equal(result.initialExitCount,1);
 let current={...level,blocks:result.blocks,gates:result.gates};const audits=[];
 for(const drag of [{blockId:'r',path:[],exitSide:'left'},{blockId:'b',path:[[0,0]]},{blockId:'g',path:[[0,1]]}]){
  const next=structuredClone(current),b=next.blocks.find(b=>b.id===drag.blockId);
  if(drag.path.length)Object.assign(b,{x:drag.path.at(-1)[0],y:drag.path.at(-1)[1]});
  if(drag.exitSide)next.blocks=next.blocks.filter(b=>b.id!==drag.blockId);
  const audit=auditPlainForwardDrag(base,current,drag,{expectedBodies:next.blocks});assert(audit.valid,audit.error);audits.push(audit);current=next;
 }
 assert.deepEqual(audits.map(a=>a.clearEvents),[1,0,0]);assert.equal(current.blocks.length,3);
 evidence.push({test:'two-real-parking-gestures-not-premature-clear',passed:true,result,audits,completeUClaimed:false,L:null,U:null});
});
test('fixed same-colour bodies share a real aperture intersection; parking contact and overlaps reject',()=>{
 const {level,options}=fixture();level.width=4;level.height=3;
 level.blocks=[{id:'a',color:'red',x:0,y:0,shape:[[0,0]]},{id:'b',color:'red',x:1,y:2,shape:[[0,0],[1,0],[2,0]]},
  {id:'c',color:'blue',x:0,y:2,shape:[[0,0]]},{id:'d',color:'green',x:3,y:0,shape:[[0,0]]}];
 options.fixedBodyColours=Object.fromEntries(level.blocks.map(b=>[b.id,b.color]));
 options.mappedPrefix={ok:true,openingColours:{a:'red'},parkingPoses:{},preservedGates:[{id:'red',color:'red',side:'top',offset:0,size:1}]};
 const intersection=colourLatePrefixGateAware(level,runtime,options);assert(!intersection.ok);assert.match(intersection.reason,/all-fixed-bodies/);
 const f=fixture();f.options.mappedPrefix.parkingPoses.b1=[[1,0]];
 const parking=colourLatePrefixGateAware(f.level,runtime,f.options);assert(!parking.ok);assert.match(parking.reason,/all-fixed-bodies/);
 const o=fixture();o.options.mappedPrefix.preservedGates[1]={...o.options.mappedPrefix.preservedGates[1],offset:0};
 const overlap=colourLatePrefixGateAware(o.level,runtime,o.options);assert(!overlap.ok);assert.match(overlap.reason,/overlap/);
 evidence.push({test:'fixed-intersection-parking-contact-overlap',passed:true,intersection,parking,overlap});
});
test('micro work and shared CSP retain finite counters on rejection',()=>{
 const {level,options}=fixture(),r=colourLatePrefixGateAware(level,runtime,{...options,maxMicroTransitions:1});
 assert(!r.ok);assert.match(r.reason,/micro-transitions/);assert.equal(r.accounting.microTransitions,1);
 assert.equal(r.accounting.transitions,r.accounting.microTransitions+r.accounting.cspTransitions);
 for(const value of [0,NaN,Infinity,3001])assert.throws(()=>colourLatePrefixGateAware(level,runtime,{...options,maxNodes:value}));
 const invalid=structuredClone(level);invalid.blocks[0].movementAxis='horizontal';assert(!colourLatePrefixGateAware(invalid,runtime,options).ok);
 evidence.push({test:'finite-micro-and-domain',passed:true,result:r});
});
test('static rectangular exit pose agrees with real model on exposed single-aperture toy worlds',()=>{
 const shapes=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]]];let comparisons=0;
 for(const shape of shapes){const w=1+Math.max(...shape.map(p=>p[0])),h=1+Math.max(...shape.map(p=>p[1]));
  for(let y=0;y+h<=3;y++)for(let x=0;x+w<=3;x++)for(const side of ['top','right','bottom','left'])for(let size=1;size<=3;size++)for(let offset=0;offset+size<=3;offset++){
   const block={id:'r',color:'red',x,y,shape},gate={id:'g',color:'red',side,size,offset};
   const level={id:999896,name:'Single-aperture oracle',difficulty:'hard',reward:0,timeSeconds:100,mechanismRules:'revised-2026-09-27-v1.5',width:3,height:3,blocks:[block],gates:[gate]};
   const model=new base.PuzzleModel(level);model.startCountdown();model.beginAction();const actual=model.tryExit('r',side);
   assert.equal(gateAwareExitPose(block,gate,level),actual.ok,JSON.stringify({block,gate}));comparisons++;
  }
 }
 evidence.push({test:'actual-pose-oracle',passed:true,comparisons,newGameplaySearches:0});
});
test.after(async()=>{
 const toolBindings={};for(const p of ['tools/daily-challenge/formal-v4/late-prefix-gate-aware.independent.test.mjs','tools/daily-challenge/formal-v4/late-prefix-gate-aware-colouring.mjs'])
  toolBindings[p]=createHash('sha256').update(await fs.readFile(p)).digest('hex');
 const report={status:evidence.length===7?'INDEPENDENT_GATE_AWARE_QUALIFICATION_PASS':'INDEPENDENT_GATE_AWARE_QUALIFICATION_INCOMPLETE',evidence,toolBindings,
  snapshotToolchainSha256:base.toolchainSha256,realCandidateConstructions:0,newMathematicalSearches:0,publicLedgerWrites:0,formalReady:false};
 await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
