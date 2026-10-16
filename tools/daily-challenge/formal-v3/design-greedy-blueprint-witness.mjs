import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {routeSha256} from '../formal-v2/contract.mjs';
import {digest} from './diversity-layout-factory.mjs';
import {greedyClearKnownPlainWitness} from './design-known-route-greedy-clear.mjs';
const inputPath='deliverables/daily-formal-v3-20261008/design/reverse-blueprint-pruned-02/candidate-000.json';
const directory='deliverables/daily-formal-v3-20261008/design/reverse-blueprint-greedy-01';
if(fs.existsSync(directory))throw Error('One immutable greedy processing attempt; preserve previous evidence');
const runtime=await loadBoundedRuntime(),bytes=fs.readFileSync(inputPath),packet=JSON.parse(bytes);
if(!packet.accepted||packet.proof.status!=='threshold-proven'||packet.construction.rawDiscoveredStates!==679)throw Error('Expected the already successful source18 reference and exact constructor account');
const budget={priorConstructionRaw:packet.construction.rawDiscoveredStates,maxStates:10000,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000};
const bindings=['design-known-route-greedy-clear.mjs','design-known-route-prune.mjs','reverse-route-audit.mjs','design-greedy-blueprint-witness.mjs'].map(name=>{
 const path=`tools/daily-challenge/formal-v3/${name}`;return{path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')};});
fs.mkdirSync(directory);fs.writeFileSync(`${directory}/claim.json`,JSON.stringify({inputPath,inputFileSha256:createHash('sha256').update(bytes).digest('hex'),
 levelSha256:digest(packet.level),routeSha256:routeSha256(packet.drags),budget,bindings,toolchainSha256:runtime.toolchainSha256,
 declaredStrategy:'one deterministic lexical-body-priority immediate-clear trace, then skip removed-body existing suffix; no full-world branch search'},null,2)+'\n',{flag:'wx'});
const processed=greedyClearKnownPlainWitness(runtime,packet.level,packet.drags,budget);
fs.writeFileSync(`${directory}/processing.json`,JSON.stringify(processed,null,2)+'\n',{flag:'wx'});
if(processed.ok){
 if(digest(packet.level)!==processed.levelSha256||processed.U<packet.L)throw Error('Immutable world or proven lower was contradicted');
 const next={...packet,drags:processed.drags,U:processed.U,replay:processed.replay,independentReplay:processed.independentReplay,routeSha256:routeSha256(processed.drags),
  knownRouteGreedyProcessing:processed,greedyBindings:bindings,previousGreedyInput:inputPath,formalReady:false,pointerValidated:false,timeValidated:false};
 fs.writeFileSync(`${directory}/candidate-000.json`,JSON.stringify(next,null,2)+'\n',{flag:'wx'});
}
fs.writeFileSync(`${directory}/index.json`,JSON.stringify({status:processed.status,acceptedMathematicalInputAlreadyExisted:true,
 levelUnchanged:true,lowerUnchanged:true,newLowerSearches:0,newUpperFullBoardSearches:0,formalReady:false,
 records:processed.ok?[{path:`${directory}/candidate-000.json`,sourceLevelId:packet.sourceLevelId,difficulty:packet.difficulty,L:packet.L,U:processed.U}]:[],
 reason:processed.reason??null,statistics:processed.statistics},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:processed.status,U:processed.U??null,L:packet.L,reason:processed.reason??null,statistics:processed.statistics}));
