import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4Runtime} from './runtime.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {SELF as LOWER,PREPAID_WORLDS,quoteStarSuffixLower,assertStarOnlyProjection,assertStarSuffixLowerReceipt,runStarSuffixLower} from './reverse-star-suffix-lower-v1.mjs';
const V='deliverables/daily-formal-v4-20261008/',T='tools/daily-challenge/formal-v4/',SELF=T+'reverse-star-suffix-lower-private.test.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
// Objects are created only by this explicit tiny qualification entry.
function tenGate(){
 const positions=[['red',0,0],['blue',1,0],['orange',1,1],['purple',0,1],['green',2,0],['yellow',3,0],['pink',2,1],['cyan',3,1]];
 const gates=[['red','top',1],['blue','left',0],['orange','bottom',1],['purple','bottom',0],['green','top',2],['yellow','top',3],['pink','bottom',2],['cyan','bottom',3],['green','right',0],['yellow','right',1]].map(([color,side,offset],i)=>({id:'gate-'+i,color,side,offset,size:1,...(i===0||i===4||i===5?{star:true}:{})}));
 return{id:998733,name:'Eight-cell ten-aperture star lower fixture',width:4,height:2,difficulty:'super',timeSeconds:180,reward:0,mechanismRules:'revised-2026-09-27-v1.5',blocks:positions.map(([color,x,y])=>({id:'body-'+color,color,x,y,shape:[[0,0]],...(color==='red'||color==='green'||color==='yellow'?{star:true}:{})})),gates};
}
function capFixture(){return{id:998734,name:'Four-cell one-body lower cap fixture',width:2,height:2,difficulty:'super',timeSeconds:180,reward:0,mechanismRules:'revised-2026-09-27-v1.5',blocks:[{id:'a',color:'red',x:0,y:0,shape:[[0,0]],star:true}],gates:[{id:'normal',side:'left',offset:0,size:1,color:'red'},{id:'star',side:'right',offset:1,size:1,color:'red',star:true}]};}
export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V,'proof')+path.sep));await fs.mkdir(out,{recursive:false});const fileBindings={},toolBindings={},evidence=[];
 const bytes=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha(b);return b;};
 const save=async(name,value)=>{const p=path.join(out,name+'.json');await fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return{path:p,sha256:sha(await bytes(p))};};
 const check=async(name,fn)=>{const value=await fn();evidence.push({name,passed:true,evidence:await save(name,value)});};
 const counters={newRealConstructions:0,newProductionStocksExecuted:0,newSource200Models:0,newSearches:0,publicClaimsStarted:0,historyLoads:0,newReplayCalls:0,privateLowerCalls:0,privateProjectionCalls:0};
 let positive,unknown,rt;
 const archive=name=>async value=>save(name+'-'+value.kind,value);
 try{
  rt=await loadV4Runtime();
  await check('nine-world-prepay-and-ten-gate-quote',()=>{const level=tenGate(),q=quoteStarSuffixLower(level,{qualificationOnly:true});assert.equal(PREPAID_WORLDS,9);assert.equal(Object.values(q.worldComponents).reduce((a,b)=>a+b,0),9);assert.equal(q.parameters.G,10);assert.equal(9990+q.worlds+1,10000);assert.equal(q.exactCountClaimed,false);return q;});
  await check('single-original-and-ten-gate-projection-threshold',async()=>{
   const original=tenGate();positive=await runStarSuffixLower(rt,original,{qualificationOnly:true,archiveFullWorld:archive('positive')});counters.privateLowerCalls+=positive.accounting.searchCalls;counters.privateProjectionCalls+=positive.accounting.projectionCalls;
   assert.equal(positive.terminal,null);assert.equal(positive.mathematicalLowerValidated,true);assert.equal(positive.result.floor,1);assert.equal(positive.result.thresholdProven,true);assert.equal(positive.result.certifiedFloor,1);assert.equal(positive.result.budget.maxStates,9990);assert.equal(positive.accounting.searchCalls,1);assert.equal(positive.accounting.projectionCalls,1);assert.equal(positive.projection.projectedLevel.gates.length,10);assert.notEqual(positive.inputLevelSha256,positive.projectedLevelSha256);assert.equal(positive.result.sourceLevelSha256,positive.projectedLevelSha256);assertStarSuffixLowerReceipt(positive,original,{qualificationOnly:true});return positive;
  });
  await check('one-raw-state-unknown-preserves-projection-and-proof',async()=>{
   const original=capFixture();unknown=await runStarSuffixLower(rt,original,{qualificationOnly:true,qualificationMaxStates:1,archiveFullWorld:archive('unknown')});counters.privateLowerCalls+=unknown.accounting.searchCalls;counters.privateProjectionCalls+=unknown.accounting.projectionCalls;
   assert.equal(unknown.terminal,null);assert.equal(unknown.result.status,'unknown');assert.equal(unknown.result.termination,'max-raw-board-states');assert.equal(unknown.mathematicalLowerValidated,false);assert.equal(unknown.result.rawFullBoardStates,1);assert.equal(unknown.accounting.worldsUpperBound,11);assertStarSuffixLowerReceipt(unknown,original,{qualificationOnly:true});return unknown;
  });
  await check('projection-archive-refusal-stops-before-kernel',async()=>{
   let archiveCalls=0;const original=capFixture();const q=await runStarSuffixLower(rt,original,{qualificationOnly:true,archiveFullWorld:async value=>{archiveCalls++;if(value.kind==='projection')throw Error('injected-projection-archive-refusal');return archive('archive-refusal')(value);}});counters.privateProjectionCalls+=q.accounting.projectionCalls;
   assert.equal(archiveCalls,2);assert.equal(q.terminal,'injected-projection-archive-refusal');assert(q.projection?.projectedLevel);assert.equal(q.archives.projection,null);assert.equal(q.accounting.searchCalls,0);assert.equal(q.result,null);assert.equal(q.accounting.worldsUpperBound,9);assertStarSuffixLowerReceipt(q,original,{qualificationOnly:true});return q;
  });
  await check('deadline-after-projection-durable-archive-no-search',async()=>{
   let clock=0;const original=capFixture();const q=await runStarSuffixLower(rt,original,{qualificationOnly:true,now:()=>clock,archiveFullWorld:async value=>{const d=await archive('deadline')(value);if(value.kind==='projection')clock=30000;return d;}});counters.privateProjectionCalls+=q.accounting.projectionCalls;
   assert.equal(q.terminal,'star-lower-overall-deadline');assert(q.archives.projection);assert.equal(q.accounting.searchCalls,0);assert.equal(q.accounting.elapsedMilliseconds,30000);assertStarSuffixLowerReceipt(q,original,{qualificationOnly:true});return q;
  });
  await check('saved-proof-metadata-budgets-bindings-and-late-terminal',()=>{
   const original=tenGate();let rejected=0;for(const change of [q=>q.U=1,q=>q.route={},q=>q.searchBudget.maxStates=9999,q=>q.searchBudget.maxTransitions++,q=>q.searchBudget.maxMicroStates++,q=>q.searchBudget.maxMilliseconds=30001,q=>q.result.sourceLevelSha256=q.inputLevelSha256,q=>q.accounting.worldsUpperBound--,q=>q.projectedLevelSha256=q.inputLevelSha256]){const q=copy(positive);change(q);assert.throws(()=>assertStarSuffixLowerReceipt(q,original,{qualificationOnly:true}));rejected++;}
   const q=copy(positive);q.terminal='star-lower-overall-deadline';q.status='STAR_LOWER_TERMINAL';q.mathematicalLowerValidated=false;q.accounting.elapsedMilliseconds=30000;assertStarSuffixLowerReceipt(q,original,{qualificationOnly:true});assert.deepEqual(q.result,positive.result);
   return{rejected,lateTerminalReceipt:q,metadataOnly:true,newKernelCalls:0,newModels:0};
  });
  await check('projection-retains-all-gates-and-only-star-erasure',()=>{
   const original=tenGate();let rejected=0;for(const change of [p=>p.projectedLevel.gates.pop(),p=>p.projectedLevel.gates.reverse(),p=>p.projectedLevel.gates[0].size=2,p=>p.projectedLevel.gates[0].color='blue',p=>p.projectedLevel.blocks[0].star=true,p=>p.projectedLevel.blocks[0].x=1]){const p=copy(positive.projection);change(p);p.projectedLevelSha256=levelSha256(p.projectedLevel);assert.throws(()=>assertStarOnlyProjection(original,p));rejected++;}return{rejected,metadataOnly:true,allTenGateIds:positive.projection.projectedLevel.gates.map(g=>g.id),newKernelCalls:0,newModels:0};
  });
  await check('unknown-mechanics-and-real-input-qualification-refused',()=>{
   let rejected=0;for(const change of [l=>l.blocks[0].frozen=0,l=>l.blocks[0].layers=['red'],l=>l.blocks[0].movementAxis='horizontal',l=>l.flipDoors=[],l=>l.blocks[0].timedBombSeconds=10,l=>l.id=200]){const l=capFixture();change(l);assert.throws(()=>quoteStarSuffixLower(l,{qualificationOnly:true}));rejected++;}return{rejected,metadataOnly:true,newKernelCalls:0,newModels:0};
  });
  const sourceAnchors=[];
  for(const [file,needles]of [
   ['tools/daily-challenge/formal-v2/constraint-projection.mjs',['projected = structuredClone(level)','projected.blocks = level.blocks.map','projected.gates = [...level.gates']],
   ['tools/continuation211-colored-witness.mjs',['api.validateLevel(level);','c.initial=Uint16Array.from','const source=new api.PuzzleModel(level).snapshot()']],
   ['src/core/PuzzleModel.ts',['constructor(level: LevelSpec','validateLevel(level);','snapshot(): PuzzleSnapshot']],
   ['tools/daily-challenge/formal-v3/bounded-proof.mjs',['const initial=closure(c.initial);','if(rawBoards.size>=budget.maxStates)']],
   ['tools/daily-challenge/formal-v3/reserved-guard-budget.mjs',['unregisteredTerminalWorldAllowance:1','export function guardedPlainTask']]
  ]){const lines=(await bytes(file)).toString().split(/\r?\n/);for(const needle of needles){const at=lines.findIndex(l=>l.includes(needle));assert(at>=0);sourceAnchors.push({path:file,line:at+1,text:lines[at],sha256:fileBindings[file]});}}
  const closure=await build({entryPoints:[LOWER],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});for(const p of Object.keys(closure.metafile.inputs))toolBindings[p.replaceAll('\\','/')]=sha(await bytes(p));for(const[p,h]of Object.entries(rt.toolchainBindings)){assert.equal(sha(await bytes(p)),h);toolBindings[p]=h;}await bytes(SELF);
  const immutable={
   [T+'reverse-star-suffix-blueprint-v1.mjs']:'889db51d1033a8f3013b86d1a90c74923ff7997ddbbeb3f1ed414494837bcba3',
   [T+'reverse-star-suffix-factory-v1.mjs']:'c8c3fc233ab93d5cb341b4020e44be9512d49cc2defe0bcac94dc313ea4013ae',
   [T+'reverse-star-suffix-private.test.mjs']:'152cc733e5dbc23fabb301ac91b6c3c2c804e7c89197be38f9427546bf95f8b4',
   [V+'proof/reverse-star-suffix-private-02/report.json']:'5d9e97254bc33222c6d1b4e7d3b061436c5718c955e37919eabc944ec0a76103'
  };for(const[p,h]of Object.entries(immutable))assert.equal(sha(await bytes(p)),h);for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h);
  return await save('report',{status:'REVERSE_STAR_SUFFIX_LOWER_PRIVATE_PASS',tests:evidence.length,evidence,errors:[],fileBindings,toolBindings,...counters,productionQualified:false,productionAuthorityIntegrated:false,budgetSourceAudit:{sourceAnchors,prepaidWorlds:9,rawSetMaximum:9990,terminalWorldAllowance:1,totalMaximum:10000,validationCallsCovered:3,maximumParameters:{A:48,B:17,S:6,G:10,J:3},maximumTransitions:939904,maximumMicro:850,archiveHookContract:'Serialize supplied object only; no world clone, model or search.',countingMeaning:'Conservative object/state-copy reservation, not an exact distinct-physical-world count; hash canonicalization is read-only metadata encoding.'},limitations:['Only two tiny lower invocations. No source200 level or production stock was formed.','Projection is lower-bound-only: none of its drags can provide original U.','Two synthetic failure hooks exercise local archive/deadline boundaries, not end-to-end public owner recovery.','Production authority and the future original-object dual-U/final claim remain unintegrated.']});
 }catch(e){await save('failed-report',{status:'REVERSE_STAR_SUFFIX_LOWER_PRIVATE_FAIL',error:e.stack,evidence,fileBindings,...counters});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));
