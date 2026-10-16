import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints,createAttemptLedger} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {compareLayouts} from './diversity.mjs';
import {recoverVacancyPrefix,prefixTailPlan,explorePrefixTailCandidate,PREFIX_TAIL_BINDINGS} from './design-prefix-tail-upper-v2.mjs';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const indexPath='deliverables/daily-formal-v3-20261008/design/single-vacancy-independent-03/index.json';
const selectedPath='deliverables/daily-formal-v3-20261008/selection/macro-opening02-selected/index.json';
const label=process.argv[2];assert(/^[a-z0-9-]+$/.test(label??''));
const out=`deliverables/daily-formal-v3-20261008/design/${label}`;fs.mkdirSync(out);
const write=(name,value)=>fs.writeFileSync(`${out}/${name}`,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const runtime=await loadBoundedRuntime(),index=read(indexPath),selection=read(selectedPath),selected=selection.files.map(path=>({path,sha256:hash(path),level:read(path).level}));
assert.equal(selected.length,149);assert.equal(index.records.length,2);
const rowsOrdered=['0074','0059'].map(n=>{const row=index.records.find(r=>r.path.endsWith(`candidate-${n}.json`));assert(row);return row;});
const ledgerDirectory='deliverables/daily-formal-v3-20261008/proof/attempts';
const upperBudget={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000,maxDragStates:10000};
const lowerBudget={...upperBudget,maxStates:9999},rows=[],accepted=[];
write('strategy-before-first-claim.json',{scope:'Exactly two new independent whole-board stocks, each with at most one accepted representative',
 indexPath,indexSha256:hash(indexPath),selectedPath,selectedIndexSha256:hash(selectedPath),selectedBindings:selected.map(({path,sha256})=>({path,sha256})),
 records:rowsOrdered,upperBudget,lowerBudget,floor:31,tailStrategy:'plain-joint',tailFloor:1,tailSearchUpper:128,
 lowerStrategy:'independent-full-original-plain',toolBindings:PREFIX_TAIL_BINDINGS,proofToolchainSha256:runtime.toolchainSha256,
 perInputUnknownMeansPermanentFailure:true,noNativeOrOtherFallback:true});
for(const [ordinal,row]of rowsOrdered.entries()){
 assert.equal(hash(row.path),row.fileSha256);const packet=read(row.path);assert.equal(levelSha256(packet.level),row.levelSha256);
 assert.equal(hash(packet.sourceGeometry.path),packet.sourceGeometry.sha256);assert.equal(row.independentWholeBoardFamily,true);
 const geometry=read(packet.sourceGeometry.path),fingerprints=designFingerprints(packet.level);
 const near=[...selected,...accepted.map(x=>({path:x.path,level:x.level}))].map(x=>({path:x.path,similarity:compareLayouts(packet.level,x.level).footprintSimilarity})).sort((a,b)=>b.similarity-a.similarity)[0];
 const staticComparison={selectedPath,indexSha256:hash(selectedPath),checked:selected.length+accepted.length,nearest:near,threshold:0.65,passed:near.similarity<=0.65};
 if(!staticComparison.passed){rows.push({input:row.path,status:'UNSEARCHED_CURRENT149_NEARNESS_REJECTION',staticComparison});continue;}
 const stamp=String(ordinal).padStart(4,'0'),declaration={input:{path:row.path,sha256:row.fileSha256},levelSha256:row.levelSha256,
  geometry:packet.sourceGeometry,selectedFixedChain:packet.geometryChain,independentWholeBoardFamily:true,staticComparison,
  upperBudget,lowerBudget,floor:31,tailStrategy:'plain-joint',tailFloor:1,tailSearchUpper:128,
  toolBindings:PREFIX_TAIL_BINDINGS,unknownPolicy:'permanent failure; no alternate path/prefix/tail/lower method'};
 write(`declaration-${stamp}-before-claim.json`,declaration);
 let result;
 try{
  const prefix=recoverVacancyPrefix(runtime,packet.level,geometry,{targetNodeIndex:packet.geometryChain.queueIndex,
   exitBlockId:packet.geometryChain.targetBodyId,exitSide:packet.geometryChain.aperture.side,openingExitSide:packet.level.gates[0].side,
   maxMicroStates:upperBudget.maxMicroStates,maxTransitions:upperBudget.maxTransitions,maxMilliseconds:upperBudget.maxMilliseconds});
  const plan=prefixTailPlan(packet.level,prefix.drags,{prefixRecovery:prefix.accounting,upperBudget,lowerBudget,floor:31,tailStrategy:'plain-joint',searchUpper:128});
  write(`plan-${stamp}-before-claim.json`,{...declaration,plan,prefix});
  result=await explorePrefixTailCandidate(runtime,{level:packet.level,sourceLevelId:packet.sourceLevelId},{prefixDrags:prefix.drags,
   prefixRecovery:prefix.accounting,upperBudget,lowerBudget,floor:31,ledgerDirectory,tailStrategy:'plain-joint',searchUpper:128});
 }catch(error){
  if(fs.existsSync(`${ledgerDirectory}/${fingerprints.designSha256}.request.json`))throw error;
  const ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(packet.level);
  result={accepted:false,formalReady:false,status:'FIXED_PREFIX_RECOVERY_FAILED',reason:error.message,attempt,level:packet.level,
   levelSha256:row.levelSha256,sourceLevelId:packet.sourceLevelId,upperConstruction:null,lowerBound:null};
  await ledger.finish(attempt,result);
 }
 result.input={path:row.path,sha256:row.fileSha256};result.geometryOnlySource=packet.sourceGeometry;
 result.wholeBoardRoot={path:row.path,sha256:row.fileSha256};result.familyMaximumAccepted=1;result.provenance=packet.provenance;
 result.current149Comparison=staticComparison;result.sourceLevelSha256=packet.sourceLevelSha256;result.difficulty=3;
 write(`candidate-${stamp}.json`,result);
 const summary={path:`${out}/candidate-${stamp}.json`,input:row.path,status:result.status,accepted:result.accepted,
  sourceLevelId:packet.sourceLevelId,U:result.U??null,L:result.L??null,difficulty:3,
  upperRaw:result.upperConstruction?.tailSearch?.rawFullBoardStates??0,upperFullBoardBound:result.upperConstruction?.conservativeFullBoardStateUpperBound??null,
  lowerRaw:result.lowerBound?.result?.rawFullBoardStates??0,reason:result.upperConstruction?.reason??result.reason??result.error,attemptId:result.attempt.id};
 rows.push(summary);console.log(JSON.stringify(summary));
 if(result.accepted)accepted.push({...summary,level:packet.level});
}
write('report.json',{status:'FINISHED',accepted:accepted.length,rows,formalReady:false,proofToolchainSha256:runtime.toolchainSha256,
 oldCandidateSolverCalls:0,productionChanged:false});
write('index.json',{accepted:accepted.length,formalReady:false,files:accepted.map(a=>a.path),records:accepted.map(({level,...a})=>({...a,fileSha256:hash(a.path)})),
 report:{path:`${out}/report.json`,sha256:hash(`${out}/report.json`)}});
