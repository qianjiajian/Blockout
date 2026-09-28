import fs from 'node:fs';
import assert from 'node:assert/strict';
import {serialize,deserialize} from 'node:v8';
import {build} from 'esbuild';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {continuePlainQueueFloor} from './continuable-plain-floor58-v146.mjs';
import {verifyPlainQueueRouteProjection} from './generator-plain-clear-floor58-v146.mjs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent58-59',candidate=process.argv[2]??dir+'/enriched58-1790250804977.json',resumeFile=process.argv[3],d=JSON.parse(fs.readFileSync(candidate));
assert.equal(d.level.id,58);const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api,inputs}=await loadApi(),entry='tools/campaign-v145/lv051-060/continue-proof58-v146.mjs';
const meta=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',packages:'external',metafile:true,logLevel:'silent'});
const graphPaths=[...new Set(Object.keys(meta.metafile.inputs))].sort(),runtimePaths=[...new Set(inputs)].sort(),hashes=paths=>Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))]));
const binding={levelSha256:digest(d.level),routeSha256:digest(d.drags),candidateSha256:digest(fs.readFileSync(candidate)),floor:11,graphHashes:hashes(graphPaths),runtimeHashes:hashes(runtimePaths),ruleVersion:lock.activeVersion,manifestSha256:digest(fs.readFileSync('docs/rules/manifest.json'))};
const projection=verifyPlainQueueRouteProjection(d.level,d.drags,api);assert(projection.valid,projection.error);
let state,totalSearchMs=0,iteration=0;if(resumeFile){const r=deserialize(fs.readFileSync(resumeFile));assert.deepEqual(r.binding,binding);state=r.state;totalSearchMs=r.totalSearchMs;iteration=r.iteration;}
const runId=Date.now(),budget=Number(process.env.SECONDS??600)*1000,chunkMs=Number(process.env.CHUNK_SECONDS??180)*1000,maxStates=Number(process.env.PROOF_STATES??4000000);for(const n of [budget,chunkMs,maxStates])assert(Number.isSafeInteger(n)&&n>0);let spent=0;
const write=(name,value)=>{const p=`${dir}/${name}-${runId}-${iteration}.json`;fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return p;};
const initialBindingFile=write('plain-proof58-run-inputs',{capturedBeforeSearchAt:new Date().toISOString(),binding,projection,candidate,resumeFile:resumeFile??null,budgetMs:budget,chunkMs,maxStates,qualification:'Exact hashes captured before search; cached runtime API remains fixed throughout run. Local tool dependency closure is guarded at every continuation boundary.'});
console.log(JSON.stringify({kind:'inputs',initialBindingFile,graphInputs:graphPaths.length,runtimeInputs:runtimePaths.length,projection:projection.valid}));
while(spent<budget){
 iteration++;for(const[p,h]of Object.entries(binding.graphHashes))assert.equal(digest(fs.readFileSync(p)),h,'graph source drift '+p);assert.equal(digest(fs.readFileSync(candidate)),binding.candidateSha256,'candidate drift');
 const start=Date.now(),{result,checkpoint}=continuePlainQueueFloor(d.level,api,{floor:11,maxStates,maxMilliseconds:Math.min(chunkMs,budget-spent),onProgress:p=>console.log(JSON.stringify({kind:'progress',iteration,totalSearchSeconds:(totalSearchMs+Date.now()-start)/1000,...p}))},state);
 const elapsed=Date.now()-start;totalSearchMs+=elapsed;spent+=elapsed;state=checkpoint;let checkpointFile=null,checkpointSha256=null;
 if(checkpoint){checkpointFile=`${dir}/plain-floor-frontier58-${runId}-${iteration}.bin`;const bytes=serialize({binding,state,totalSearchMs,iteration});fs.writeFileSync(checkpointFile,bytes,{flag:'wx'});checkpointSha256=digest(bytes);}
 const reportFile=write('continued-plain-proof58',{checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,candidate,initialBindingFile,binding,totalSearchMs,result,checkpointFile,checkpointSha256,projection,formalAdopted:false,pointerValidated:false});
 console.log(JSON.stringify({kind:'checkpoint',reportFile,checkpointFile,searchSeconds:totalSearchMs/1000,status:result.status,termination:result.termination,states:result.discoveredStates,expanded:result.exploredStates,lowestQueuedCost:result.lowestQueuedCost,pending:result.pendingQueueRecords,shortcut:result.relaxedNonClearingDrags}));
 if(!checkpoint||result.termination==='max-states')break;
}
