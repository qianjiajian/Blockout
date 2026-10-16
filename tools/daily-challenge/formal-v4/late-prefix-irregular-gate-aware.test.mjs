import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {colourIrregularLatePrefix,irregularExitGeometry,irregularAssetBinding,auditIrregularFixedPrefix} from './late-prefix-irregular-gate-aware.mjs';

const runtime=await loadV4Runtime(),out=process.env.IRREGULAR_GATE_PRIVATE_OUT;
assert(out,'An explicit fresh private report directory is required');await fs.mkdir(out,{recursive:false});
const evidence=[],hash=b=>createHash('sha256').update(b).digest('hex');
const base=(width,height,blocks,gates)=>({id:999871,name:'Private irregular gate fixture',difficulty:'hard',reward:0,timeSeconds:120,
 mechanismRules:'revised-2026-09-27-v1.5',width,height,blocks,gates});
const L=[[0,0],[0,1],[1,1]],T=[[1,0],[0,1],[1,1],[2,1]],S=[[0,0]];
function twoBody(){
 const level=base(2,2,[{id:'l',color:'red',x:0,y:0,shape:L},{id:'s',color:'blue',x:1,y:0,shape:S}],
  [{id:'red',color:'red',side:'right',offset:0,size:2},{id:'blue',color:'blue',side:'top',offset:1,size:1}]);
 const drags=[{blockId:'s',path:[],exitSide:'top'},{blockId:'l',path:[],exitSide:'right'}];
 const options={scope:'private-fixture',paletteSize:2,seed:1,fixedBodyColours:{l:'red',s:'blue'},
  mappedPrefix:{ok:true,drags,openingColours:{s:'blue',l:'red'},parkingPoses:{},preservedGates:structuredClone(level.gates)}};
 return{level,options,drags};
}
test('q0 L concavity: geometry can match while actual sweep is blocked; clearing blocker completes both models',()=>{
 const {level,options}=twoBody(),before=JSON.stringify(level);
 assert(irregularExitGeometry(runtime,level,level.blocks[0],level.gates[0]));
 const original=new runtime.PuzzleModel(level);original.startCountdown();original.beginAction();
 assert.equal(original.exitAttemptStatus('l','right'),'blocked-path');assert.equal(original.tryExit('l','right').ok,false);
 assert(original.tryExit('s','top').ok);original.commitAction();original.beginAction();assert(original.tryExit('l','right').ok);
 const r=colourIrregularLatePrefix(level,runtime,options);assert(r.ok,r.reason);assert(r.prefix.canonical.complete&&r.prefix.independent.complete);
 assert.equal(r.prefix.independent.remainingBodies,0);assert.equal(r.prefix.facts.parking,0);assert.equal(r.prefix.facts.clears,2);
 assert.equal(r.accounting.completeAssignments,1);assert.equal(r.accounting.prefixWorldReservations,14);assert.equal(r.accounting.completeWorldReservations,15);
 assert.equal(r.L,null);assert.equal(r.U,null);assert.equal(JSON.stringify(level),before);
 evidence.push({name:'full-L-and-S-stock-actual-completion',passed:true,result:r});
});
test('ghost exit cannot be accepted merely because its portal domain is nonempty',()=>{
 const {level,options}=twoBody();options.mappedPrefix.drags=[{blockId:'l',path:[],exitSide:'right'}];
 const r=colourIrregularLatePrefix(level,runtime,options);assert(!r.ok);assert.equal(r.diagnostic.prefixAttempts,1);
 assert(!r.diagnostic.lastPrefixFailure.canonical.valid);assert(!r.diagnostic.lastPrefixFailure.independent.valid);
 assert.match(r.diagnostic.lastPrefixFailure.independent.error,/Rejected exit/);
 evidence.push({name:'occupied-sweep-ghost-rejected',passed:true,result:r});
});
test('a free body colour and its gate are jointly assigned while external irregular stock and prefix stay exact',()=>{
 const level=base(3,2,[{id:'l',color:'red',x:0,y:0,shape:L},{id:'s',color:'blue',x:1,y:0,shape:S},
  {id:'v',color:'yellow',x:2,y:0,shape:[[0,0],[0,1]]}],
  [{id:'red',color:'red',side:'left',offset:0,size:2},{id:'blue',color:'blue',side:'top',offset:1,size:1}]);
 const options={scope:'private-fixture',paletteSize:3,seed:1,fixedBodyColours:{l:'red',s:'blue'},
  mappedPrefix:{ok:true,drags:[{blockId:'s',path:[],exitSide:'top'}],preservedGates:level.gates}};
 const r=colourIrregularLatePrefix(level,runtime,options);assert(r.ok,r.reason);assert.equal(new Set(r.blocks.map(b=>b.color)).size,3);
 assert.deepEqual(r.blocks.find(b=>b.id==='l'),level.blocks[0]);assert.deepEqual(r.blocks.find(b=>b.id==='s'),level.blocks[1]);
 assert(r.accounting.cspTransitions>=2);assert(r.accounting.completeAssignments>=1);assert(r.prefix.valid&&!r.prefix.canonical.complete);
 assert.equal(r.prefix.independent.remainingBodies,2);assert.equal(r.U,null);
 evidence.push({name:'joint-free-body-gate-CSP-and-partial-prefix',passed:true,result:r});
});
test('narrow portal cannot admit trailing arms of an unrotated T; concave mask uses true frontier',()=>{
 const b={id:'t',color:'red',x:0,y:0,shape:T},g={id:'g',color:'red',side:'top',offset:1,size:1},level=base(3,2,[b],[g]);
 assert.equal(irregularExitGeometry(runtime,level,b,g),false);
 const m=new runtime.PuzzleModel(level);m.startCountdown();m.beginAction();assert.equal(m.tryExit('t','top').ok,false);
 const wide={...g,offset:0,size:3};assert(irregularExitGeometry(runtime,level,b,wide));
 const concave=base(2,2,[{id:'l',color:'red',x:0,y:0,shape:L}],[{id:'g',color:'red',side:'left',offset:0,size:2}]);concave.playable=structuredClone(L);
 assert(irregularExitGeometry(runtime,concave,concave.blocks[0],concave.gates[0]));
 const good=auditIrregularFixedPrefix(runtime,concave,[{blockId:'l',path:[],exitSide:'left'}]);assert(good.valid&&good.canonical.complete);
 evidence.push({name:'T-complete-span-and-concave-mask',passed:true,concave:good});
});
test('all fixed same-colour silhouettes intersect one gate, and independent gates cannot overlap',()=>{
 const level=base(4,2,[{id:'l',color:'red',x:0,y:0,shape:L},{id:'a',color:'blue',x:1,y:0,shape:S},
  {id:'h',color:'red',x:2,y:0,shape:[[0,0],[1,0]]},{id:'b',color:'green',x:2,y:1,shape:[[0,0],[1,0]]}],
  [{id:'red',color:'red',side:'right',offset:0,size:1},{id:'blue',color:'blue',side:'top',offset:1,size:1},{id:'green',color:'green',side:'bottom',offset:2,size:2}]);
 const options={scope:'private-fixture',paletteSize:3,fixedBodyColours:{l:'red',a:'blue',h:'red',b:'green'},
  mappedPrefix:{ok:true,drags:[{blockId:'h',path:[],exitSide:'right'}],preservedGates:level.gates}};
 const intersection=colourIrregularLatePrefix(level,runtime,options);assert(!intersection.ok);assert.match(intersection.reason,/all-body-support/);
 const f=twoBody();f.options.mappedPrefix.preservedGates[1]={...f.options.mappedPrefix.preservedGates[1],side:'right',offset:0};
 const overlap=colourIrregularLatePrefix(f.level,runtime,f.options);assert(!overlap.ok);assert.match(overlap.reason,/overlap/);
 evidence.push({name:'same-colour-domain-intersection-and-overlap',passed:true,intersection,overlap});
});
test('held intermediate first contact cannot pass through a legal exit and park; a turning held clear is one gesture',()=>{
 const b={id:'l',color:'red',x:1,y:1,shape:L},g={id:'g',color:'red',side:'left',offset:0,size:2},level=base(4,3,[b],[g]);
 const early=auditIrregularFixedPrefix(runtime,level,[{blockId:'l',path:[[1,0],[0,0],[0,1]]}],{requireFilled:false});
 assert(!early.valid);assert.match(early.canonical.error,/First-contact/);
 const good=auditIrregularFixedPrefix(runtime,level,[{blockId:'l',path:[[1,0],[0,0]],exitSide:'left'}],{requireFilled:false});
 assert(good.valid&&good.canonical.complete&&good.independent.complete);assert.equal(good.facts.parking,0);assert.equal(good.canonical.effectiveDrags,1);
 const f=twoBody();f.options.mappedPrefix.parkingPoses={l:[[0,0]]};
 const parking=colourIrregularLatePrefix(f.level,runtime,f.options);assert(!parking.ok);assert.match(parking.reason,/all-body-support/);
 evidence.push({name:'actual-first-contact-held-bend',passed:true,early,good,conservativeParking:parking});
});
test('shape/colour catalogue is the actual 11 irregular silhouettes and 54 original PNG files',async()=>{
 const built=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:'export {FORMAL_BLOCK_SHAPES} from "./src/game/formalBlockShapes.ts";'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 const {FORMAL_BLOCK_SHAPES}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
 const irregular=FORMAL_BLOCK_SHAPES.filter(s=>s.cells.length!==s.canonicalWidth*s.canonicalHeight),bindings=[];
 for(const shape of irregular)for(const color of Object.keys(runtime.GAME_ART.gameplay.formalBlocks)){const b=irregularAssetBinding(runtime,shape.cells,color);if(b)bindings.push(b);}
 assert.equal(irregular.length,11);assert.equal(bindings.length,54);
 const rare=FORMAL_BLOCK_SHAPES.find(s=>s.shapeId===16);assert(irregularAssetBinding(runtime,rare.cells,'pink'));assert.equal(irregularAssetBinding(runtime,rare.cells,'red'),null);
 const f=twoBody(),bad={...runtime,GAME_ART:structuredClone(runtime.GAME_ART)};bad.GAME_ART.gameplay.formalBlocks.red.solid[4]='/assets/private-no-such-art.png';
 const missing=colourIrregularLatePrefix(f.level,bad,f.options);assert(!missing.ok);assert(missing.diagnostic.missingAssetPairs.some(x=>x.blockId==='l'&&x.color==='red'));
 evidence.push({name:'q0-real-art-catalog-and-missing-file',passed:true,bindings,missing});
});
test('world cap 1 blocks before prefix models and final-gate node cap still charges a complete forced world',()=>{
 const f=twoBody();let models=0;const rt={...runtime,PuzzleModel:class extends runtime.PuzzleModel{constructor(...xs){models++;super(...xs);}},
  replayRevisedRoute(...xs){models++;return runtime.replayRevisedRoute(...xs);}};
 const one=colourIrregularLatePrefix(f.level,rt,{...f.options,maxCompleteWorldReservations:1});
 assert(!one.ok);assert.match(one.reason,/maxCompleteWorldReservations/);assert.equal(one.accounting.completeAssignments,1);assert.equal(models,0);
 assert.equal(one.accounting.prefixWorldReservations,0);
 const prior=colourIrregularLatePrefix(f.level,rt,{...f.options,priorCompleteWorldReservations:9999});
 assert(!prior.ok);assert.equal(prior.accounting.completeWorldReservations,10000);assert.equal(prior.accounting.completeAssignments,1);assert.equal(models,0);
 const exhausted=colourIrregularLatePrefix(f.level,rt,{...f.options,priorCompleteWorldReservations:10000});
 assert(!exhausted.ok);assert.equal(exhausted.accounting.completeWorldReservations,10000);assert.equal(exhausted.accounting.completeAssignments,0);assert.equal(models,0);
 f.options.mappedPrefix.preservedGates.pop();const node=colourIrregularLatePrefix(f.level,runtime,{...f.options,maxNodes:1});
 assert(!node.ok);assert.match(node.reason,/maxNodes/);assert.equal(node.accounting.completeAssignments,1);
 const adj=twoBody();adj.options.fixedBodyColours.s='red';adj.options.mappedPrefix.openingColours.s='red';
 const adjacent=colourIrregularLatePrefix(adj.level,runtime,adj.options);assert(!adjacent.ok);assert.match(adjacent.reason,/adjacent/);assert.equal(adjacent.accounting.completeAssignments,1);
 evidence.push({name:'precharge-world-one-final-gate-and-early-failure',passed:true,one,prior,exhausted,node,adjacent,models});
});
test('finite micro and strict plain/private domains reject instead of broadening mechanics',()=>{
 const f=twoBody();const limited=colourIrregularLatePrefix(f.level,runtime,{...f.options,maxMicroStates:1});
 assert(!limited.ok);assert.equal(limited.accounting.microStates,1);assert.match(limited.reason,/maxMicroStates/);
 for(const v of [0,NaN,Infinity,10001])assert.throws(()=>colourIrregularLatePrefix(f.level,runtime,{...f.options,maxCompleteWorldReservations:v}));
 const special=structuredClone(f.level);special.blocks[0].movementAxis='horizontal';assert(!colourIrregularLatePrefix(special,runtime,f.options).ok);
 assert(!colourIrregularLatePrefix(f.level,runtime,{...f.options,scope:'production'}).ok);
 const shifted=structuredClone(f.level);shifted.blocks[0].shape=L.map(([x,y])=>[x+1,y]);assert(!colourIrregularLatePrefix(shifted,runtime,f.options).ok);
 evidence.push({name:'finite-resource-and-domain-rejection',passed:true,limited});
});
test.after(async()=>{
 const tools=['tools/daily-challenge/formal-v4/late-prefix-irregular-gate-aware.mjs','tools/daily-challenge/formal-v4/late-prefix-irregular-gate-aware.test.mjs'];
 const fileBindings={};const meta=await build({entryPoints:tools,absWorkingDir:process.cwd(),bundle:true,packages:'external',metafile:true,write:false,outdir:'private-binding-only',platform:'node',format:'esm',logLevel:'silent'});
 for(const p of Object.keys(meta.metafile.inputs))fileBindings[p.replaceAll('\\','/')]=hash(await fs.readFile(p));
 for(const p of tools){await fs.writeFile(path.join(out,path.basename(p)),await fs.readFile(p),{flag:'wx'});}
 const environment=JSON.parse(await fs.readFile('snapshot-environment.json','utf8'));
 const report={status:evidence.length===9?'PRIVATE_IRREGULAR_GATE_AWARE_QUALIFICATION_PASS':'PRIVATE_IRREGULAR_GATE_AWARE_QUALIFICATION_INCOMPLETE',
  evidence,testsPassed:evidence.length,fileBindings,frozenMathSha256:runtime.toolchainSha256,environment,
  environmentDescriptor:{path:'snapshot-environment.json',sha256:hash(await fs.readFile('snapshot-environment.json'))},
  runtimeBindings:runtime.toolchainBindings,productionExecutable:false,newRealCandidateConstructions:0,newGameplaySearches:0,publicClaimsStarted:0,
  privateColourCspOnly:true,formalReady:false,L:null,U:null,
  limitations:['No irregular native wrapper/factory is enabled.','Gate domains are necessary empty-board geometry; actual sweeps and first contact are separately replayed.',
   'Conservative parking geometry may reject legal blocked sweeps.','Early prefix never certifies L31 or full U.','No GUI/Pointer/natural clock qualification.']};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
