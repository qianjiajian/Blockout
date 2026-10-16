import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints,createAttemptLedger} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {recoverVacancyPrefix,prefixTailPlan,explorePrefixTailCandidate,PREFIX_TAIL_BINDINGS} from './design-prefix-tail-upper.mjs';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const indexPath='deliverables/daily-formal-v3-20261008/design/delayed-vacancy-retile-01/index.json';
const label=process.argv[2];assert(/^[a-z0-9-]+$/.test(label??''));
const out=`deliverables/daily-formal-v3-20261008/design/${label}`;fs.mkdirSync(out);
const write=(name,value)=>fs.writeFileSync(`${out}/${name}`,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const runtime=await loadBoundedRuntime(),index=read(indexPath),ledgerDirectory='deliverables/daily-formal-v3-20261008/proof/attempts';
assert.equal(index.records.length,2);assert(index.records[0].path.endsWith('candidate-0001.json'));assert(index.records[1].path.endsWith('candidate-0008.json'));
const upperBudget={maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000,maxDragStates:10000};
const lowerBudget={...upperBudget,maxStates:9999},rows=[];
let parent=index.records[0].redesignOf,accepted=0;
write('strategy-before-first-claim.json',{scope:'Exactly two authorized fresh inputs in listed order; stop after one accepted family representative',
 indexPath,indexSha256:hash(indexPath),records:index.records,upperBudget,lowerBudget,floor:31,routeStrategy:'fixed-parent-prefix-one-native-tail',
 lowerStrategy:'independent-full-original-plain',toolBindings:PREFIX_TAIL_BINDINGS,proofToolchainSha256:runtime.toolchainSha256,
 oldFailureNeverSearched:parent,perInputUnknownMeansPermanentFailure:true});
for(const [ordinal,row]of index.records.entries()){
 if(accepted)break;
 assert.equal(hash(row.path),row.fileSha256);const packet=read(row.path);assert.equal(levelSha256(packet.level),row.levelSha256);
 assert.equal(hash(packet.sourceGeometry.path),packet.sourceGeometry.sha256);
 const geometry=read(packet.sourceGeometry.path),fingerprints=designFingerprints(packet.level),prior=read(`${ledgerDirectory}/${parent}.request.json`);
 const priorResult=read(`${ledgerDirectory}/${parent}.result.json`);assert.equal(priorResult.accepted,false);
 const colors=new Map(prior.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)]));
 const differs=fingerprints.shapeSha256!==prior.shapeSha256&&fingerprints.colorSha256!==prior.colorSha256
  &&fingerprints.colorAssignments.some(b=>colors.has(b.id)&&colors.get(b.id)!==JSON.stringify(b.colors));
 if(!differs){rows.push({path:row.path,status:'UNSEARCHED_PARENT_SHAPE_OR_COLOUR_NOT_CHANGED',redesignOf:parent});break;}
 const stamp=String(ordinal).padStart(4,'0'),declaration={input:{path:row.path,sha256:row.fileSha256},levelSha256:row.levelSha256,
  geometry:packet.sourceGeometry,selectedFixedChain:packet.geometryChain,redesignOf:parent,upperBudget,lowerBudget,floor:31,
  toolBindings:PREFIX_TAIL_BINDINGS,completeBoardCoordinateRecoveryBranches:0,unknownPolicy:'stop; no alternate path/prefix/tail/lower method'};
 write(`declaration-${stamp}-before-claim.json`,declaration);
 let result;
 try{
  const prefix=recoverVacancyPrefix(runtime,packet.level,geometry,{targetNodeIndex:packet.geometryChain.queueIndex,
   exitBlockId:packet.geometryChain.targetBodyId,exitSide:packet.geometryChain.aperture.side,openingExitSide:packet.level.gates[0].side,
   maxMicroStates:upperBudget.maxMicroStates,maxTransitions:upperBudget.maxTransitions,maxMilliseconds:upperBudget.maxMilliseconds});
  const plan=prefixTailPlan(packet.level,prefix.drags,{prefixRecovery:prefix.accounting,upperBudget,lowerBudget,floor:31});
  write(`plan-${stamp}-before-claim.json`,{...declaration,plan,prefix});
  result=await explorePrefixTailCandidate(runtime,{level:packet.level,sourceLevelId:packet.sourceLevelId},{prefixDrags:prefix.drags,
   prefixRecovery:prefix.accounting,upperBudget,lowerBudget,floor:31,redesignOf:parent,ledgerDirectory});
 }catch(error){
  // Recovery is only one fixed chain. Do not repair it or try another chain.
  // If an original claim already exists, preserve it and stop rather than
  // accidentally creating a second strategy under a fallback claim.
  if(fs.existsSync(`${ledgerDirectory}/${fingerprints.designSha256}.request.json`))throw error;
  const ledger=await createAttemptLedger(ledgerDirectory),attempt=await ledger.claim(packet.level,{redesignOf:parent});
  result={accepted:false,formalReady:false,status:'FIXED_PREFIX_RECOVERY_FAILED',reason:error.message,attempt,level:packet.level,
   levelSha256:row.levelSha256,sourceLevelId:packet.sourceLevelId,upperConstruction:null,lowerBound:null};
  await ledger.finish(attempt,result);
 }
 result.input={path:row.path,sha256:row.fileSha256};result.geometryOnlySource=packet.sourceGeometry;
 result.wholeBoardRoot=packet.wholeBoardRoot;result.familyMaximumAccepted=1;result.provenance=packet.provenance;
 write(`candidate-${stamp}.json`,result);
 const summary={path:`${out}/candidate-${stamp}.json`,input:row.path,status:result.status,accepted:result.accepted,
  U:result.U??null,L:result.L??null,upperRaw:result.upperConstruction?.tailSearch?.rawFullBoardStates??0,
  upperFullBoardBound:result.upperConstruction?.conservativeFullBoardStateUpperBound??null,
  lowerRaw:result.lowerBound?.result?.rawFullBoardStates??0,reason:result.upperConstruction?.reason??result.reason??result.error,
  attemptId:result.attempt.id,redesignOf:parent};rows.push(summary);console.log(JSON.stringify(summary));
 if(result.accepted)accepted++;else parent=result.attempt.id;
}
write('report.json',{status:'FINISHED',accepted,rows,maximumAcceptedFamilyRepresentatives:1,formalReady:false,
 proofToolchainSha256:runtime.toolchainSha256,oldCandidateSolverCalls:0,productionChanged:false});
