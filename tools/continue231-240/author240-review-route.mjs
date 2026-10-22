import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,ruleGate,loadApi,audit,replay,digest,writeNew} from './common.mjs';
import {qualify240} from './author240-native.mjs';
ruleGate();const input=process.argv[2];assert(input);const packet=JSON.parse(fs.readFileSync(input)),{api}=await loadApi();
const structure=audit(packet.level,api),strict=replay(packet.level,packet.drags,api,{complete:true,requirePointerCompatible:true}),qualification=qualify240(packet.level,packet.drags,api);
assert.equal(strict.nonClearingDrags,packet.U);assert.equal(strict.effectiveDrags,packet.level.preservedMoveTarget);
const output=ROOT+'/author240/route-review-'+Date.now()+'.json';writeNew(output,{passed:true,input,levelSha256:digest(packet.level),routeSha256:digest(packet.drags),structure,strict,qualification,mathematicalDifficultyAccepted:false,pointerValidated:false});console.log(JSON.stringify({output,states:qualification.states,transitions:qualification.transitions,U:strict.nonClearingDrags,totalDrags:strict.effectiveDrags}));
