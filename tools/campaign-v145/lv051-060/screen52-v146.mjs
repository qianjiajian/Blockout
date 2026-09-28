import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {search} from './campaign-axis-key-search-v146.mjs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54',rows=[];
const {api}=await loadApi();
const inputs=(process.argv[2]?[process.argv[2]]:fs.readdirSync(dir).filter(f=>f.startsWith(process.env.PREFIX??'mutant52-')).map(f=>dir+'/'+f)).map(file=>({file,d:JSON.parse(fs.readFileSync(file))})).sort((a,b)=>b.d.replay.nonClearingDrags-a.d.replay.nonClearingDrags);
for(const {file,d}of inputs){
 const audit=api.auditRevisedCandidate(d.level,undefined),adjacency=audit.issues.filter(i=>i.code==='opening-same-colour-adjacency');
 if(adjacency.length){rows.push({file,candidateSha256:digest(fs.readFileSync(file)),knownUpper:d.replay.nonClearingDrags,staticFailed:true,adjacency,thresholdProven:false,formalAdopted:false});console.log(JSON.stringify({file,staticFailed:true,issues:adjacency.length}));continue;}
 const result=search(d.level,{floor:21,maxStates:300000,maxMilliseconds:Number(process.env.SEARCH_MS??4000),weight:Number(process.env.WEIGHT??5)});
 let replay=null;if(result.status==='witness'){replay=api.replayRevisedRoute(d.level,result.drags);assert(replay.valid&&replay.complete&&replay.nonClearingDrags<21);}
 const row={file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(d.level),knownUpper:d.replay.nonClearingDrags,result,replay,thresholdProven:false,formalAdopted:false};rows.push(row);
 console.log(JSON.stringify({file,U:d.replay.nonClearingDrags,status:result.status,shortcut:replay?.nonClearingDrags,maxClears:result.maxClears,partialCost:result.partialCost}));
}
const output=dir+'/screen52-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify({checkedAt:new Date().toISOString(),rows},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,total:rows.length,staticFailed:rows.filter(r=>r.staticFailed).length,actualRefuted:rows.filter(r=>r.replay).length,unresolved:rows.filter(r=>!r.replay&&!r.staticFailed).map(r=>({file:r.file,U:r.knownUpper,clears:r.result.maxClears,cost:r.result.partialCost}))}));
