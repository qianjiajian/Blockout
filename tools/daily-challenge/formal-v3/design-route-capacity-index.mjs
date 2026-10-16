import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
import {routeCapacity} from './mechanism-base-designer.mjs';

const label=process.argv[2];
if(!label||!/^[a-z0-9-]+$/.test(label))throw Error('Supply an existing immutable pool label');
const root='deliverables/daily-formal-v3-20261008/design';
const input=`${root}/pool-${label}.json`,output=`${root}/pool-capacity-${label}.json`;
if(fs.existsSync(output))throw Error('Capacity snapshot exists; preserve it');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=fs.readFileSync(input),pool=JSON.parse(bytes),runtime=await loadBoundedRuntime(),records=[];
for(const row of pool.records){
  const sourceBytes=fs.readFileSync(row.path);
  if(sha(sourceBytes)!==row.fileSha256)throw Error('Candidate changed: '+row.path);
  const candidate=JSON.parse(sourceBytes),capacity=routeCapacity(runtime,candidate.level,candidate.drags);
  records.push({path:row.path,fileSha256:row.fileSha256,sourceLevelId:row.sourceLevelId,difficulty:row.difficulty,L:row.L,U:row.U,
    ...capacity,thresholdCapacity:[3,5,7].map(clears=>({clears,firstActionBodies:capacity.firstAction.filter(x=>x.clears>=clears).length,
      firstExitColours:capacity.firstColorExit.filter(x=>x.clears>=clears).length}))});
}
const report={status:'KNOWN_ROUTE_CAPACITY_ONLY_NOT_NEW_DIFFICULTY_PROOF',fullBoardSearchInvocations:0,
  inputPool:{path:input,sha256:sha(bytes)},toolchainSha256:runtime.toolchainSha256,
  moduleBindings:['design-route-capacity-index.mjs','mechanism-base-designer.mjs'].map(name=>({path:`tools/daily-challenge/formal-v3/${name}`,sha256:sha(fs.readFileSync(`tools/daily-challenge/formal-v3/${name}`))})),records};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:output,count:records.length,numericD3Four:records.filter(r=>r.numericIceD3Compatible>=4).length,
  frozenD3Four:records.filter(r=>r.frozenExitD3Compatible>=4).length}));
