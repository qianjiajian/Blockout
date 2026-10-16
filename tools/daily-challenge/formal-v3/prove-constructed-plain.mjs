import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,createAttemptLedger} from './bounded-proof.mjs';
import {guardedPlainTask,reservedGuardBudget} from './reserved-guard-budget.mjs';
import {levelSha256,independentReplay} from '../formal-v2/contract.mjs';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {compareLayouts} from './diversity.mjs';

const[input,label]=process.argv.slice(2);assert(input&&/^[a-z0-9-]+$/.test(label??''));
const root='deliverables/daily-formal-v3-20261008',out=`${root}/design/${label}`;
assert(!fs.existsSync(out),'Never overwrite or continue prior attempt');
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const construction=read(input);assert.equal(construction.proofSearches,0);assert(construction.ok&&!construction.accepted);
const level=construction.level;assert.equal(levelSha256(level),construction.levelSha256);
const runtime=await loadBoundedRuntime();assertPlainProofDomain(level,runtime);runtime.validateLevel(level);
const source=runtime.LEVELS.find(l=>l.id===construction.sourceLevelId);assert.equal(levelSha256(source),construction.sourceLevelSha256);
const selected=read(`${root}/selection/nearband21-selected/index.json`).files.map(read);
const old=read('deliverables/daily-formal-v2-20261007/final-qualified/index.json').entries.map(e=>read(e.path).level);
assert(compareLayouts(source,level).footprintSimilarity<=.55);
assert(selected.every(p=>compareLayouts(p.level,level).footprintSimilarity<=.65));assert(old.every(p=>compareLayouts(p,level).footprintSimilarity<=.75));
const budget=reservedGuardBudget({maxStates:9999,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000});
fs.mkdirSync(out);const plan={input:{path:input,sha256:hash(input)},levelSha256:levelSha256(level),strategy:'single-first-plain-joint',floor:31,searchUpper:128,budget};
fs.writeFileSync(`${out}/plan.json`,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
const ledger=await createAttemptLedger(`${root}/proof/attempts`),attempt=await ledger.claim(level);
const packet={accepted:false,formalReady:false,level,levelSha256:levelSha256(level),sourceLevelId:source.id,sourceLevelSha256:levelSha256(source),attempt,
 proofToolchainSha256:runtime.toolchainSha256,proofToolchainBindings:runtime.toolchainBindings,
 provenance:{strategy:'whole-board-delayed-vacancy-colouring',constructionFile:input,constructionSha256:hash(input),
  sourceBoardExactlyRetained:true,sourceBodyCount:source.blocks.length,candidateBodyCount:level.blocks.length,sourceInventoryAdapted:true,
  independentWholeBoardConstruction:true,geometryConstraintNotAcceptedAsProof:true},plan};
let proof;
try{
 proof=guardedPlainTask(level,runtime,{floor:31,searchUpper:128,...budget});packet.proof=proof;
 if(proof.drags){packet.drags=proof.drags;packet.replay=runtime.replayRevisedRoute(level,proof.drags);packet.independentReplay=independentReplay(runtime,level,proof.drags,{});
  const L=proof.certifiedFloor,U=packet.replay.nonClearingDrags;
  if(proof.thresholdProven&&L>=31&&packet.replay.valid&&packet.replay.complete&&!packet.replay.failed&&packet.independentReplay.valid&&packet.independentReplay.complete&&!packet.independentReplay.failed&&packet.independentReplay.nonClearingDrags===U)
   Object.assign(packet,{accepted:true,L,U,difficulty:3,status:'NEW_WHOLE_BOARD_D3_PENDING_V3_CONTRACT'});
 }
 if(!packet.accepted)packet.status='FIRST_INPUT_NOT_QUALIFIED';
}catch(e){packet.error=e.message;packet.status='FIRST_INPUT_ERROR';}
finally{await ledger.finish(attempt,{...packet,lowerBound:{result:proof??null},route:{search:proof??null}});}
const file=`${out}/candidate-0000.json`;fs.writeFileSync(file,JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(`${out}/index.json`,JSON.stringify({formalReady:false,records:packet.accepted?[{path:file,accepted:true,sourceLevelId:source.id,difficulty:3,L:packet.L,U:packet.U}]:[]},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({file,accepted:packet.accepted,L:packet.L,U:packet.U,reason:packet.error??proof?.routeTermination??proof?.termination,raw:proof?.rawFullBoardStates,
 fullBoardUpperBound:proof?.guardAllowance?.conservativeFullBoardStateUpperBound,cost:proof?.cost,actualRouteValid:packet.replay?.valid}));
