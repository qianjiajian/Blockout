import fs from 'node:fs';
import {loadSpatialApi} from '../continuation211-optional-lift-domain.mjs';
import {liftPayload,runNativeLift} from '../continuation211-native-lift.mjs';
import {sha256,modelBinding} from '../continuation211-runtime.mjs';
const index=Number(process.argv[2]??0),dir='deliverables/continue211-220-20260930/design212-new/source212-grid',input=`${dir}/scored-candidate212-${index}.json`,output=`${dir}/native-bound212-${index}.json`;
if(fs.existsSync(output))throw Error('Do not repeat a failed hash/model budget');
const packet=JSON.parse(fs.readFileSync(input)),level=structuredClone(packet.level),removed=[];
for(const b of level.blocks)if(b.timedBombSeconds!==undefined){removed.push({id:b.id,timedBombSeconds:b.timedBombSeconds});delete b.timedBombSeconds;}
const api=await loadSpatialApi(),{p}=liftPayload(level,api,{floor:11,maxMilliseconds:6000,maxStates:500000}),result=runNativeLift(p);
const report={input,sourceLevelSha256:sha256(packet.level),projectedLevelSha256:sha256(level),modelBinding:modelBinding(),relaxation:{removed,retained:'All original bodies, cells, colored grids, shutters, counters, geometry and exits. Only bomb deadline removed; every successful real solution projects to equal drag cost.'},qualification:'deliverables/continue211-220-20260930/native-lift-qualification.json',budget:{floor:11,maxMilliseconds:6000,maxStates:500000},native:result,certified:result.status==='threshold-proven',formalAdopted:false};
fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({output,sourceLevelSha256:report.sourceLevelSha256,...result},null,2));
