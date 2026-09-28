import fs from 'node:fs';
import {serialize,deserialize} from 'node:v8';
import {continueBoundaryResidualFloor} from './continue-residual-boundary31to40-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const [input,checkpointFile,...args]=process.argv.slice(2);
if(!input||!checkpointFile)throw Error('Usage: INPUT CHECKPOINT [MAX_STATES] [SLICES]');
const data=JSON.parse(fs.readFileSync(input)),maxStates=Number(args[0]??20000000),slices=Number(args[1]??12);
const resumeFile=fs.existsSync(checkpointFile)?checkpointFile:process.env.RESIDUAL_INITIAL_CHECKPOINT;
let saved=resumeFile?deserialize(fs.readFileSync(resumeFile)):null;
for(let slice=0;slice<slices;slice++){
 const {result,checkpoint}=continueBoundaryResidualFloor(data.level,{floor:16,maxStates,maxMilliseconds:180000,onProgress:p=>console.log(JSON.stringify(p))},saved);
 const output=`deliverables/remake31-40-v146-20260924/root-proof/boundary-resumable${data.level.id}-${Date.now()}.json`;
 fs.mkdirSync('deliverables/remake31-40-v146-20260924/root-proof',{recursive:true});
 fs.writeFileSync(output,JSON.stringify({input,inputSha256:digest(fs.readFileSync(input)),result,checkpointFile:checkpoint?checkpointFile:null},null,2));
 console.log(JSON.stringify({output,result}));
 if(!checkpoint)break;
 fs.writeFileSync(checkpointFile+'.next',serialize(checkpoint));fs.renameSync(checkpointFile+'.next',checkpointFile);
 saved=checkpoint;if(result.termination==='max-states'||fs.existsSync(checkpointFile+'.stop'))break;
}
