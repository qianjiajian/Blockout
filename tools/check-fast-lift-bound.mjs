import fs from 'node:fs';import assert from 'node:assert/strict';import {loadSpatialApi} from './continuation211-colored-witness.mjs';import {proveSymmetric} from './continuation211-fast-lift-proof.mjs';import {sha256} from './continuation211-runtime.mjs';
assert.equal(JSON.parse(fs.readFileSync('deliverables/continue211-220-20260930/fast-lift-qualification.json')).status,'PASS');
const path=process.argv[2],floor=Number(process.argv[3]),data=JSON.parse(fs.readFileSync(path)),api=await loadSpatialApi();
const lower=proveSymmetric(data.level,api,{floor,maxMilliseconds:10000,maxStates:150000,normalizeMonotone:true});
fs.writeFileSync(path.replace('.json','-fast-lift-bound.json'),JSON.stringify({sourceLevelSha256:sha256(data.level),lower,qualificationFile:'deliverables/continue211-220-20260930/fast-lift-qualification.json'},null,2),{flag:'wx'});console.log({id:data.level.id,floor,status:lower.status,cost:lower.cost,states:lower.exploredStates,elapsed:lower.elapsedMilliseconds});

