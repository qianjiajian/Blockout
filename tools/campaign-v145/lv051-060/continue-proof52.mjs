import fs from 'node:fs';
import assert from 'node:assert/strict';
import {serialize,deserialize} from 'node:v8';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {continueAxisFloor} from './continuable-axis-floor52.mjs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54';
const candidate=process.argv[2]??dir+'/mutant52-52471-234-1790250008648.json',resumeFile=process.argv[3],d=JSON.parse(fs.readFileSync(candidate));
assert.equal(d.level.id,52);const lock=verifyRulesLock();assert(lock.ok);
const sourcePaths=['tools/campaign-v145/lv051-060/continuable-axis-floor52.mjs','tools/campaign-v145/lv051-060/campaign-axis-key-floor-v146.mjs','tools/campaign-v145/lv051-060/campaign-axis-key-graph-v146.mjs','tools/remake21to30-mask-floor.mjs'];
const binding={levelSha256:digest(d.level),floor:21,sourceHashes:Object.fromEntries(sourcePaths.map(p=>[p,digest(fs.readFileSync(p))]))};
let state,totalSearchMs=0,iteration=0;
if(resumeFile){const r=deserialize(fs.readFileSync(resumeFile));assert.deepEqual(r.binding,binding);state=r.state;totalSearchMs=r.totalSearchMs;iteration=r.iteration;}
const runId=Date.now(),budget=Number(process.env.SECONDS??1800)*1000,chunkMs=Number(process.env.CHUNK_SECONDS??300)*1000,maxStates=Number(process.env.PROOF_STATES??6000000);let spent=0;
const write=(name,data)=>{const p=dir+'/'+name+'-'+runId+'-'+iteration+'.json';fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
while(spent<budget){
 iteration++;for(const [p,h]of Object.entries(binding.sourceHashes))assert.equal(digest(fs.readFileSync(p)),h,'source drift '+p);
 const started=Date.now(),{result,checkpoint}=continueAxisFloor(d.level,{floor:21,maxStates,maxMilliseconds:Math.min(chunkMs,budget-spent),onProgress:p=>console.log(JSON.stringify({kind:'progress',iteration,totalSearchSeconds:(totalSearchMs+Date.now()-started)/1000,...p}))},state);
 const elapsed=Date.now()-started;totalSearchMs+=elapsed;spent+=elapsed;state=checkpoint;
 let checkpointFile=null;
 if(checkpoint){checkpointFile=dir+'/floor-frontier52-'+runId+'-'+iteration+'.bin';fs.writeFileSync(checkpointFile,serialize({binding,state,totalSearchMs,iteration}));}
 const report={checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,candidate,candidateSha256:digest(fs.readFileSync(candidate)),resumeFile:resumeFile??null,binding,totalSearchMs,result,checkpointFile,formalAdopted:false,pointerValidated:false};
 const reportFile=write('continued-proof52',report);console.log(JSON.stringify({kind:'checkpoint',reportFile,checkpointFile,searchSeconds:totalSearchMs/1000,status:result.status,termination:result.termination,states:result.discoveredStates,expanded:result.exploredStates,lowestQueuedCost:result.lowestQueuedCost,pending:result.pendingQueueRecords,shortcut:result.relaxedNonClearingDrags}));
 if(!checkpoint||result.termination==='max-states')break;
}
