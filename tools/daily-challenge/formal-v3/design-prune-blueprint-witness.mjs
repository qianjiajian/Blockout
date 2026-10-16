import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {routeSha256} from '../formal-v2/contract.mjs';
import {pruneKnownPlainWitness} from './design-known-route-prune.mjs';

const originalPath='deliverables/daily-formal-v3-20261008/design/reverse-blueprint-02/candidate-000.json';
const directory='deliverables/daily-formal-v3-20261008/design/reverse-blueprint-pruned-01';
if(fs.existsSync(directory))throw Error('Preserve previous evidence');fs.mkdirSync(directory);
const runtime=await loadBoundedRuntime(),bytes=fs.readFileSync(originalPath),packet=JSON.parse(bytes);
const shortened=pruneKnownPlainWitness(runtime,packet.level,packet.drags);
const next={...packet,drags:shortened.drags,U:shortened.U,replay:shortened.replay,independentReplay:shortened.independentReplay,
 routeSha256:routeSha256(shortened.drags),originalWitnessPath:originalPath,originalWitnessFileSha256:createHash('sha256').update(bytes).digest('hex'),
 deterministicWitnessPruning:shortened,formalReady:false,pointerValidated:false,timeValidated:false};
fs.writeFileSync(`${directory}/candidate-000.json`,JSON.stringify(next,null,2)+'\n');
fs.writeFileSync(`${directory}/index.json`,JSON.stringify({status:'SAME_ACCEPTED_LEVEL_SHORTER_KNOWN_WITNESS_NO_NEW_SEARCH',formalReady:false,
 lowerUnchanged:true,levelUnchanged:true,records:[{path:`${directory}/candidate-000.json`,originalPath,U:next.U,L:next.L,sourceLevelId:next.sourceLevelId,difficulty:next.difficulty}],
 pruning:{...shortened,drags:undefined,replay:undefined,independentReplay:undefined}},null,2)+'\n');
console.log(JSON.stringify({L:next.L,U:next.U,totalDrags:next.drags.length,removedCycleDrags:shortened.removedCycleDrags,mergedHolds:shortened.mergedHolds,removedReturnHolds:shortened.removedReturnHolds}));
